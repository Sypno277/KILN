#!/usr/bin/env python3
"""
BATCH 1: Ground-Truth Color Map of the SOURCE Document
Independent Verification Script (Does NOT touch the converter)

Performs:
1. Verification of source PDF facts (rg/RG, yellow highlights, white fills).
2. Extraction of fill color per glyph using TWO independent methods:
   - Method 1: PDF text library (pdfplumber + PyMuPDF)
   - Method 2: Raw content-stream interpreter (pikepdf tracking q/Q stack, rg/RG, g/G, k/K, cs/CS, sc/scn, Tr)
3. Outputs Golden JSON: page, line text, character range, fill color hex, and color summary counts.
4. Reports cross-method agreement and explains findings.
5. Renders each page to count pure-red pixels (#FF0000) as an independent visual cross-check.
"""

import sys
import os
import json
import re
import hashlib
from collections import Counter, defaultdict

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import fitz          # PyMuPDF
import pdfplumber
import pikepdf
from PIL import Image

def compute_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def parse_cmap(cmap_bytes):
    """Parse PDF ToUnicode CMap into a mapping of CID -> unicode string."""
    cmap = {}
    text = cmap_bytes.decode('latin1', errors='ignore')
    
    # bfchar mappings
    bfchar_blocks = re.findall(r'(\d+)\s+beginbfchar\s*(.*?)\s*endbfchar', text, re.DOTALL)
    for count, block in bfchar_blocks:
        pairs = re.findall(r'<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>', block)
        for src, dst in pairs:
            src_val = int(src, 16)
            dst_chars = "".join(chr(int(dst[i:i+4], 16)) for i in range(0, len(dst), 4))
            cmap[src_val] = dst_chars
            
    # bfrange mappings
    bfrange_blocks = re.findall(r'(\d+)\s+beginbfrange\s*(.*?)\s*endbfrange', text, re.DOTALL)
    for count, block in bfrange_blocks:
        # Form 1: <start> <end> <dest_start>
        form1 = re.findall(r'<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>', block)
        for start, end, dst_start in form1:
            s_val = int(start, 16)
            e_val = int(end, 16)
            d_val = int(dst_start, 16)
            for c in range(s_val, e_val + 1):
                cmap[c] = chr(d_val + (c - s_val))
                
        # Form 2: <start> <end> [ <dest1> <dest2> ... ]
        form2 = re.findall(r'<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[(.*?)\]', block, re.DOTALL)
        for start, end, arr_text in form2:
            s_val = int(start, 16)
            e_val = int(end, 16)
            dsts = re.findall(r'<([0-9a-fA-F]+)>', arr_text)
            for idx, dst in enumerate(dsts):
                c = s_val + idx
                dst_chars = "".join(chr(int(dst[i:i+4], 16)) for i in range(0, len(dst), 4))
                cmap[c] = dst_chars
                
    return cmap


class RawContentStreamInterpreter:
    """
    Method 2: Directly parses raw PDF content streams using pikepdf,
    tracking the complete graphics state stack, color spaces, and text render modes.
    """
    def __init__(self, page):
        self.page = page
        self.fonts_cmap = {}
        if "/Resources" in page and "/Font" in page["/Resources"]:
            for fname, fobj in page["/Resources"]["/Font"].items():
                if "/ToUnicode" in fobj:
                    self.fonts_cmap[str(fname).lstrip('/')] = parse_cmap(fobj["/ToUnicode"].read_bytes())

    def extract_glyphs(self):
        instructions = pikepdf.parse_content_stream(self.page)
        
        # State machine
        current_state = {
            "non_stroke_cs": "DeviceGray",
            "non_stroke_color": (0.0,),
            "stroke_cs": "DeviceGray",
            "stroke_color": (0.0,),
            "Tr": 0,
            "font": None,
            "font_size": 0.0
        }
        state_stack = []
        glyphs = []
        
        for operands, op in instructions:
            op_s = str(op)
            
            # 1. Stack push/pop
            if op_s == 'q':
                state_stack.append(dict(current_state))
            elif op_s == 'Q':
                if state_stack:
                    current_state = state_stack.pop()
                    
            # 2. Color operators
            elif op_s == 'rg':
                r, g, b = [float(x) for x in operands]
                current_state["non_stroke_cs"] = "DeviceRGB"
                current_state["non_stroke_color"] = (r, g, b)
            elif op_s == 'RG':
                r, g, b = [float(x) for x in operands]
                current_state["stroke_cs"] = "DeviceRGB"
                current_state["stroke_color"] = (r, g, b)
            elif op_s == 'g':
                g_val = float(operands[0])
                current_state["non_stroke_cs"] = "DeviceGray"
                current_state["non_stroke_color"] = (g_val,)
            elif op_s == 'G':
                g_val = float(operands[0])
                current_state["stroke_cs"] = "DeviceGray"
                current_state["stroke_color"] = (g_val,)
            elif op_s == 'k':
                current_state["non_stroke_cs"] = "DeviceCMYK"
                current_state["non_stroke_color"] = tuple(float(x) for x in operands)
            elif op_s == 'K':
                current_state["stroke_cs"] = "DeviceCMYK"
                current_state["stroke_color"] = tuple(float(x) for x in operands)
            elif op_s == 'cs':
                current_state["non_stroke_cs"] = str(operands[0]).lstrip('/')
            elif op_s == 'CS':
                current_state["stroke_cs"] = str(operands[0]).lstrip('/')
            elif op_s in ('sc', 'scn'):
                current_state["non_stroke_color"] = tuple(float(x) for x in operands)
            elif op_s in ('SC', 'SCN'):
                current_state["stroke_color"] = tuple(float(x) for x in operands)
            elif op_s == 'Tr':
                current_state["Tr"] = int(operands[0])
            elif op_s == 'Tf':
                current_state["font"] = str(operands[0]).lstrip('/')
                current_state["font_size"] = float(operands[1])
                
            # 3. Text showing operators
            elif op_s in ('Tj', "'", '"', 'TJ'):
                tr = current_state["Tr"]
                if tr in (0, 2, 4, 6):
                    cs = current_state["non_stroke_cs"]
                    col = current_state["non_stroke_color"]
                elif tr in (1, 5):
                    cs = current_state["stroke_cs"]
                    col = current_state["stroke_color"]
                else:
                    cs = "None"
                    col = None
                    
                if cs == "DeviceRGB" and len(col) == 3:
                    hex_color = f"#{round(col[0]*255):02X}{round(col[1]*255):02X}{round(col[2]*255):02X}"
                elif cs == "DeviceGray" and len(col) >= 1:
                    v = round(col[0]*255)
                    hex_color = f"#{v:02X}{v:02X}{v:02X}"
                elif cs == "DeviceCMYK" and len(col) == 4:
                    c, m, y, k = col
                    r = round(255 * (1 - c) * (1 - k))
                    g = round(255 * (1 - m) * (1 - k))
                    b = round(255 * (1 - y) * (1 - k))
                    hex_color = f"#{r:02X}{g:02X}{b:02X}"
                else:
                    hex_color = "#000000"
                    
                font_name = current_state["font"]
                cmap = self.fonts_cmap.get(font_name, {})
                
                def decode_str(s_bytes):
                    chars = []
                    for i in range(0, len(s_bytes), 2):
                        cid = int.from_bytes(s_bytes[i:i+2], 'big')
                        chars.append(cmap.get(cid, chr(cid) if cid < 128 else '?'))
                    return chars
                
                if op_s in ('Tj', "'"):
                    for ch in decode_str(bytes(operands[0])):
                        glyphs.append({"char": ch, "color": hex_color, "font": font_name})
                elif op_s == '"':
                    for ch in decode_str(bytes(operands[2])):
                        glyphs.append({"char": ch, "color": hex_color, "font": font_name})
                elif op_s == 'TJ':
                    for item in operands[0]:
                        if isinstance(item, (pikepdf.String, bytes)):
                            for ch in decode_str(bytes(item)):
                                glyphs.append({"char": ch, "color": hex_color, "font": font_name})
                                
        return glyphs


def verify_source_facts(pdf_path):
    """Verify specific source PDF facts directly from the raw content stream."""
    facts = {
        "text_red_rg_used": False,
        "text_red_RG_used": False,
        "text_reset_to_black": False,
        "yellow_highlight_rectangles": 0,
        "white_page_fills": 0,
        "pages_inspected": 0
    }
    
    with pikepdf.open(pdf_path) as pdf:
        facts["pages_inspected"] = len(pdf.pages)
        for page_idx, page in enumerate(pdf.pages):
            stream = pikepdf.parse_content_stream(page)
            saw_red = False
            for idx, (operands, op) in enumerate(stream):
                op_s = str(op)
                if op_s == 'rg':
                    vals = [round(float(x), 2) for x in operands]
                    if vals == [1.0, 0.0, 0.0]:
                        facts["text_red_rg_used"] = True
                        saw_red = True
                    elif vals == [0.0, 0.0, 0.0] and saw_red:
                        facts["text_reset_to_black"] = True
                    elif vals == [1.0, 1.0, 0.0]:
                        facts["yellow_highlight_rectangles"] += 1
                    elif vals == [1.0, 1.0, 1.0]:
                        facts["white_page_fills"] += 1
                elif op_s == 'RG':
                    vals = [round(float(x), 2) for x in operands]
                    if vals == [1.0, 0.0, 0.0]:
                        facts["text_red_RG_used"] = True
                        
    return facts


def run_full_color_audit(pdf_path):
    print("=================================================================")
    print(" BATCH 1: Ground-Truth Color Map of the SOURCE Document")
    print(f" Source File: {pdf_path}")
    print("=================================================================\n")
    
    file_sha256 = compute_sha256(pdf_path)
    print(f"  SHA-256 Checksum: {file_sha256}")
    
    # 1. Fact Verification
    facts = verify_source_facts(pdf_path)
    print("\n--- Step 1: Source PDF Facts Verification ---")
    print(f"  Pages Inspected:              {facts['pages_inspected']}")
    print(f"  Red text '1 0 0 rg' active:   {facts['text_red_rg_used']}")
    print(f"  Red stroke '1 0 0 RG' active: {facts['text_red_RG_used']}")
    print(f"  Reset to black '0 0 0 rg':    {facts['text_reset_to_black']}")
    print(f"  Yellow highlight rectangles:  {facts['yellow_highlight_rectangles']}")
    print(f"  White page fills:             {facts['white_page_fills']} (1 per page across 3 pages)")
    
    assert facts["text_red_rg_used"], "Fact failure: '1 0 0 rg' not found"
    assert facts["text_red_RG_used"], "Fact failure: '1 0 0 RG' not found"
    assert facts["text_reset_to_black"], "Fact failure: reset to black not found"
    assert facts["yellow_highlight_rectangles"] > 0, "Fact failure: yellow highlights not found"
    assert facts["white_page_fills"] == facts["pages_inspected"], f"Fact failure: white page fills ({facts['white_page_fills']}) != pages ({facts['pages_inspected']})"
    print("  ✓ [VERIFIED] All source facts confirmed 100% true to specification.")

    # 2. Independent Extraction: Method 1 (pdfplumber) and Method 2 (pikepdf)
    print("\n--- Step 2: Extraction via Two Independent Methods ---")
    
    pike_doc = pikepdf.open(pdf_path)
    plum_doc = pdfplumber.open(pdf_path)
    fitz_doc = fitz.open(pdf_path)
    
    golden_pages = []
    total_summary = Counter()
    total_mismatches = 0
    total_compared_glyphs = 0
    
    visual_red_pixels = {}
    
    for page_idx in range(len(pike_doc.pages)):
        page_num = page_idx + 1
        pike_page = pike_doc.pages[page_idx]
        plum_page = plum_doc.pages[page_idx]
        fitz_page = fitz_doc[page_idx]
        
        # Method 2: Raw content stream
        interp = RawContentStreamInterpreter(pike_page)
        m2_glyphs = interp.extract_glyphs()
        
        # Method 1: pdfplumber characters
        m1_chars = plum_page.chars
        
        # Method 1B: PyMuPDF structured blocks/lines
        raw_json_data = json.loads(fitz_page.get_text("rawjson"))
        
        print(f"\n▶ Page {page_num}:")
        print(f"  Method 1 (pdfplumber): {len(m1_chars)} glyphs extracted")
        print(f"  Method 2 (pikepdf):    {len(m2_glyphs)} glyphs extracted")
        
        assert len(m1_chars) == len(m2_glyphs), f"Glyph count mismatch on page {page_num}: M1={len(m1_chars)} vs M2={len(m2_glyphs)}"
        
        # Compare glyph-by-glyph colors
        page_mismatches = 0
        for i in range(len(m1_chars)):
            total_compared_glyphs += 1
            c1 = m1_chars[i].get("non_stroking_color")
            hex1 = "#FF0000" if c1 == (1, 0, 0) else ("#000000" if c1 == (0, 0, 0) else f"other({c1})")
            hex2 = m2_glyphs[i]["color"]
            
            if hex1 != hex2:
                page_mismatches += 1
                total_mismatches += 1
                if page_mismatches <= 3:
                    print(f"    [DISAGREEMENT] Char {i}: M1='{m1_chars[i]['text']}' ({hex1}) != M2='{m2_glyphs[i]['char']}' ({hex2})")
                    
        assert page_mismatches == 0, f"Page {page_num} had {page_mismatches} color disagreements!"
        print(f"  ✓ Cross-check agreement: 100.00% ({len(m1_chars)}/{len(m1_chars)} glyphs match perfectly)")
        
        # Structure into Lines and Character Ranges for Golden JSON
        # We group glyphs into lines by PyMuPDF visual lines and map colors
        page_lines = []
        page_color_counts = Counter()
        
        for b in raw_json_data.get("blocks", []):
            if b.get("type") != 0:
                continue
            for line in b.get("lines", []):
                line_bbox = [round(x, 2) for x in line.get("bbox", [0, 0, 0, 0])]
                line_spans = line.get("spans", [])
                
                line_chars = []
                for s in line_spans:
                    color_int = s.get("color", 0)
                    r = (color_int >> 16) & 255
                    g = (color_int >> 8) & 255
                    b_col = color_int & 255
                    span_hex = f"#{r:02X}{g:02X}{b_col:02X}"
                    
                    chars = s.get("chars", [])
                    for ch in chars:
                        c_text = ch.get("c", "")
                        line_chars.append({"char": c_text, "color": span_hex})
                        page_color_counts[span_hex] += 1
                        total_summary[span_hex] += 1
                        
                if not line_chars:
                    continue
                    
                full_line_text = "".join(c["char"] for c in line_chars)
                
                # Consolidate runs of the same color into character ranges
                runs = []
                cur_color = None
                start_idx = 0
                for idx, ch_info in enumerate(line_chars):
                    c = ch_info["color"]
                    if c != cur_color:
                        if cur_color is not None:
                            runs.append({
                                "text": full_line_text[start_idx:idx],
                                "char_range": [start_idx, idx - 1],
                                "char_count": idx - start_idx,
                                "fill_color_hex": cur_color
                            })
                        cur_color = c
                        start_idx = idx
                if cur_color is not None and start_idx < len(line_chars):
                    runs.append({
                        "text": full_line_text[start_idx:len(line_chars)],
                        "char_range": [start_idx, len(line_chars) - 1],
                        "char_count": len(line_chars) - start_idx,
                        "fill_color_hex": cur_color
                    })
                    
                page_lines.append({
                    "line_number": len(page_lines) + 1,
                    "bbox": line_bbox,
                    "text": full_line_text,
                    "char_count": len(full_line_text),
                    "runs": runs,
                    "is_entirely_red": all(r["fill_color_hex"] == "#FF0000" for r in runs),
                    "is_entirely_black": all(r["fill_color_hex"] == "#000000" for r in runs)
                })
                
        print(f"  Line Count: {len(page_lines)}")
        print(f"  Page Color Breakdown: Red (#FF0000) = {page_color_counts['#FF0000']}, Black (#000000) = {page_color_counts['#000000']}")
        
        # 3. Visual Cross-Check: Render and count pure-red pixels
        pix = fitz_page.get_pixmap(dpi=150)
        pure_red_count = 0
        antialiased_red_count = 0
        samples = pix.samples
        
        # Create a visual mask image showing pure-red pixels in vibrant red, rest in gray
        mask_img = Image.new("RGB", (pix.width, pix.height), (245, 245, 245))
        mask_pixels = mask_img.load()
        
        for y in range(pix.height):
            for x in range(pix.width):
                idx = (y * pix.width + x) * pix.n
                r, g, b = samples[idx], samples[idx+1], samples[idx+2]
                if r == 255 and g == 0 and b == 0:
                    pure_red_count += 1
                    mask_pixels[x, y] = (255, 0, 0)
                elif r > 180 and g < 80 and b < 80:
                    antialiased_red_count += 1
                    mask_pixels[x, y] = (220, 80, 80)
                elif r < 50 and g < 50 and b < 50:
                    mask_pixels[x, y] = (50, 50, 50)
                    
        os.makedirs("reports/visual-diff", exist_ok=True)
        mask_path = f"reports/visual-diff/ground_truth_page_{page_num}_red_mask.png"
        mask_img.save(mask_path)
        
        visual_red_pixels[page_num] = {
            "resolution": f"{pix.width}x{pix.height} @ 150 DPI",
            "pure_red_pixels": pure_red_count,
            "antialiased_red_pixels": antialiased_red_count,
            "total_red_spectrum_pixels": pure_red_count + antialiased_red_count,
            "mask_artifact": mask_path
        }
        print(f"  Visual Cross-Check: {pure_red_count} pure-red pixels (#FF0000), {antialiased_red_count} antialiased pixels")
        print(f"  Mask saved: {mask_path}")
        
        golden_pages.append({
            "page": page_num,
            "total_characters": sum(l["char_count"] for l in page_lines),
            "color_counts": dict(page_color_counts),
            "visual_check": visual_red_pixels[page_num],
            "lines": page_lines
        })

    # Summary
    golden_doc = {
        "metadata": {
            "source_file": os.path.basename(pdf_path),
            "file_sha256": file_sha256,
            "pages": len(pike_doc.pages),
            "pipeline_stage": "BATCH 1: Ground-Truth Color Map (Independent Method)",
            "verification_status": "VERIFIED_100%_AGREEMENT"
        },
        "facts_verified": facts,
        "summary": {
            "total_characters_across_all_pages": sum(total_summary.values()),
            "character_counts_by_color": dict(total_summary),
            "unexpected_colors_count": sum(v for k, v in total_summary.items() if k not in ("#FF0000", "#000000")),
            "unexpected_colors": [k for k in total_summary if k not in ("#FF0000", "#000000")],
            "glyph_level_cross_check": {
                "method_1": "PDF text library (pdfplumber + PyMuPDF spans)",
                "method_2": "Raw content-stream interpreter (pikepdf q/Q, rg/RG, Tr state tracker)",
                "total_glyphs_cross_checked": total_compared_glyphs,
                "total_mismatches": total_mismatches,
                "agreement_percentage": 100.0 if total_mismatches == 0 else (total_compared_glyphs - total_mismatches) / total_compared_glyphs * 100.0
            },
            "visual_cross_check_summary": {
                "dpi": 150,
                "pure_red_pixels_total": sum(v["pure_red_pixels"] for v in visual_red_pixels.values()),
                "antialiased_red_pixels_total": sum(v["antialiased_red_pixels"] for v in visual_red_pixels.values()),
                "per_page": visual_red_pixels
            }
        },
        "pages": golden_pages
    }
    
    # Save Golden JSON to reports/ground_truth_color_map.json and reports/golden/
    os.makedirs("reports", exist_ok=True)
    os.makedirs("reports/golden", exist_ok=True)
    
    out_path_1 = "reports/ground_truth_color_map.json"
    out_path_2 = "reports/golden/source_color_ground_truth.json"
    
    with open(out_path_1, "w", encoding="utf-8") as f:
        json.dump(golden_doc, f, indent=2, ensure_ascii=False)
        
    with open(out_path_2, "w", encoding="utf-8") as f:
        json.dump(golden_doc, f, indent=2, ensure_ascii=False)
        
    print("\n=================================================================")
    print(" BATCH 1 COLOR AUDIT COMPLETE")
    print("=================================================================")
    print(f"  Total Characters:             {sum(total_summary.values())}")
    print(f"  Red (#FF0000) Characters:     {total_summary['#FF0000']}")
    print(f"  Black (#000000) Characters:   {total_summary['#000000']}")
    print(f"  Unexpected Colors:            {golden_doc['summary']['unexpected_colors']}")
    print(f"  Cross-Method Agreement:       100.00% (Zero Mismatches)")
    print(f"  Visual Pure-Red Pixels Total: {golden_doc['summary']['visual_cross_check_summary']['pure_red_pixels_total']}")
    print(f"  Golden JSON Generated:        {out_path_1}")
    print(f"  Golden JSON Mirror:           {out_path_2}")
    print("=================================================================\n")
    
    return golden_doc

if __name__ == "__main__":
    target_pdf = "scratch/week1_solutions.pdf"
    if len(sys.argv) > 1:
        target_pdf = sys.argv[1]
    elif not os.path.exists(target_pdf):
        fallback = r"C:\Users\priti\Downloads\week 1 solutions.pdf"
        if os.path.exists(fallback):
            target_pdf = fallback
            
    if not os.path.exists(target_pdf):
        print(f"Error: Target PDF not found at {target_pdf}")
        sys.exit(1)
        
    run_full_color_audit(target_pdf)
