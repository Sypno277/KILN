import fitz # PyMuPDF
import zipfile
import xml.etree.ElementTree as ET
import os
import sys
import hashlib
import json
from PIL import Image
import io

pdf_path = "scratch/batch6_test_input.pdf"
pptx_path = "scratch/batch6_output.pptx"

# 1. Source PDF Extraction
doc = fitz.open(pdf_path)
page = doc[0]

# Render source PDF to image at 150 DPI for step 6
pix = page.get_pixmap(dpi=150)
pdf_png_path = "scratch/pdf_page1_render.png"
pix.save(pdf_png_path)
print(f"Rendered PDF page to {pdf_png_path} ({pix.width}x{pix.height})")

raw_data = json.loads(page.get_text("rawjson"))
blocks = raw_data["blocks"]

src_chars = []
for b_idx, b in enumerate(blocks):
    if b.get("type") == 0:
        for l_idx, line in enumerate(b.get("lines", [])):
            line_bbox = line.get("bbox", [0, 0, 0, 0])
            for s_idx, span in enumerate(line.get("spans", [])):
                font_name = span.get("font", "")
                size = span.get("size", 0)
                color_int = span.get("color", 0)
                r = (color_int >> 16) & 255
                g = (color_int >> 8) & 255
                b_col = color_int & 255
                fill_hex = f"#{r:02X}{g:02X}{b_col:02X}"
                flags = span.get("flags", 0)
                
                # Baseline offset calculation:
                # Normal text baseline in span vs line
                span_origin = span.get("origin", [0, 0])
                origin_y = span_origin[1] if len(span_origin) > 1 else span.get("bbox", [0, 0, 0, 0])[3]
                
                chars = span.get("chars", [])
                if not chars:
                    for ch in span.get("text", ""):
                        chars.append({"c": ch, "bbox": span.get("bbox"), "origin": span_origin})
                
                for ch_info in chars:
                    ch = ch_info.get("c", "")
                    ch_bbox = ch_info.get("bbox", [0, 0, 0, 0])
                    ch_origin = ch_info.get("origin", span_origin)
                    
                    # Detect if subscript or superscript
                    # In our test fixture: H2O where '2' has size 8 (vs 12), and y shifted
                    # We can store raw size, origin_y, font, fill
                    src_chars.append({
                        "char": ch,
                        "font": font_name,
                        "size": size,
                        "fill": fill_hex,
                        "stroke": None,
                        "render_mode": 0,
                        "origin_y": ch_origin[1] if len(ch_origin) > 1 else ch_bbox[3],
                        "bbox": [round(x, 2) for x in ch_bbox],
                        "block": b_idx,
                        "line": l_idx,
                        "span": s_idx
                    })

# Extract source images
src_images = []
for img_info in page.get_images(full=True):
    xref = img_info[0]
    base_image = doc.extract_image(xref)
    img_bytes = base_image["image"]
    img_ext = base_image["ext"]
    w = base_image["width"]
    h = base_image["height"]
    cs = base_image["colorspace"]
    bpc = base_image["bpc"]
    hsh = hashlib.sha256(img_bytes).hexdigest()
    rects = page.get_image_rects(xref)
    bbox = [round(rects[0].x0, 2), round(rects[0].y0, 2), round(rects[0].x1, 2), round(rects[0].y1, 2)] if rects else None
    
    src_images.append({
        "xref": xref,
        "width": w,
        "height": h,
        "ext": img_ext,
        "bytes_len": len(img_bytes),
        "colorspace": cs,
        "bpc": bpc,
        "bbox": bbox,
        "hash": hsh
    })

# 2. Output PPTX Extraction
with zipfile.ZipFile(pptx_path) as z:
    slide_xml_str = z.read("ppt/slides/slide1.xml").decode("utf-8")
    media_entries = [f for f in z.namelist() if f.startswith("ppt/media/") and not f.endswith("/")]
    
    pptx_media = []
    for mf in media_entries:
        mbytes = z.read(mf)
        try:
            pil_img = Image.open(io.BytesIO(mbytes))
            pw, ph = pil_img.size
            pmode = pil_img.mode
            colors = pil_img.getcolors(maxcolors=1000000)
            num_colors = len(colors) if colors else ">1000000"
        except Exception as e:
            pw, ph, pmode, num_colors = 0, 0, str(e), 0
        
        mhash = hashlib.sha256(mbytes).hexdigest()
        pptx_media.append({
            "filename": mf,
            "width": pw,
            "height": ph,
            "mode": pmode,
            "colors": num_colors,
            "bytes_len": len(mbytes),
            "hash": mhash
        })

root = ET.fromstring(slide_xml_str)
ns = {
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

output_chars = []
output_runs = []
rpr_violations = []

TAG_CATEGORIES = {
    'ln': 1,
    'noFill': 2, 'solidFill': 2, 'gradFill': 2, 'blipFill': 2, 'pattFill': 2, 'grpFill': 2,
    'effectLst': 3, 'effectDag': 3,
    'highlight': 4,
    'uLnTx': 5, 'uLn': 5, 'uFillTx': 5, 'uFill': 5,
    'latin': 6, 'ea': 6, 'cs': 6, 'sym': 6,
    'hlinkClick': 7, 'hlinkMouseOver': 7,
    'extLst': 8
}

for sp in root.findall('.//p:sp', ns):
    cnvpr = sp.find('.//p:nvSpPr/p:cNvPr', ns)
    sp_id = cnvpr.attrib.get('id', '') if cnvpr is not None else ''
    sp_name = cnvpr.attrib.get('name', '') if cnvpr is not None else ''
    
    off = sp.find('.//p:spPr/a:xfrm/a:off', ns)
    ext = sp.find('.//p:spPr/a:xfrm/a:ext', ns)
    x_pt = int(off.attrib.get('x', 0))/12700 if off is not None else 0
    y_pt = int(off.attrib.get('y', 0))/12700 if off is not None else 0
    cx_pt = int(ext.attrib.get('cx', 0))/12700 if ext is not None else 0
    cy_pt = int(ext.attrib.get('cy', 0))/12700 if ext is not None else 0
    
    for p_idx, p in enumerate(sp.findall('.//a:p', ns)):
        for r_idx, r in enumerate(p.findall('.//a:r', ns)):
            t = r.find('a:t', ns)
            text = t.text if t is not None else ''
            rPr = r.find('a:rPr', ns)
            
            sz = int(rPr.attrib.get('sz', 1200)) / 100 if rPr is not None else 12.0
            baseline = rPr.attrib.get('baseline', None) if rPr is not None else None
            bold = rPr.attrib.get('b', '0') == '1' if rPr is not None else False
            italic = rPr.attrib.get('i', '0') == '1' if rPr is not None else False
            
            solidFill = rPr.find('a:solidFill/a:srgbClr', ns) if rPr is not None else None
            fill_color = ('#' + solidFill.attrib.get('val', '000000')).upper() if solidFill is not None else None
            
            latin = rPr.find('a:latin', ns) if rPr is not None else None
            typeface = latin.attrib.get('typeface', None) if latin is not None else None
            
            highlight = rPr.find('a:highlight/a:srgbClr', ns) if rPr is not None else None
            highlight_color = ('#' + highlight.attrib.get('val', '')).upper() if highlight is not None else None
            
            # Check schema order
            if rPr is not None:
                child_tags = [child.tag.split('}')[-1] for child in rPr]
                tag_ranks = [TAG_CATEGORIES.get(tag, 99) for tag in child_tags]
                is_ordered = all(tag_ranks[i] <= tag_ranks[i+1] for i in range(len(tag_ranks)-1))
                if not is_ordered:
                    rpr_violations.append({
                        "shape_id": sp_id,
                        "shape_name": sp_name,
                        "run_text": text[:30],
                        "actual_sequence": child_tags,
                        "expected_sequence": sorted(child_tags, key=lambda t: TAG_CATEGORIES.get(t, 99))
                    })
            
            run_obj = {
                "shape_id": sp_id,
                "shape_name": sp_name,
                "text": text,
                "x": round(x_pt, 2),
                "y": round(y_pt, 2),
                "sz": sz,
                "baseline": baseline,
                "bold": bold,
                "italic": italic,
                "fill": fill_color,
                "font": typeface,
                "highlight": highlight_color
            }
            output_runs.append(run_obj)
            
            for ch in text:
                output_chars.append({
                    "char": ch,
                    "shape_id": sp_id,
                    "shape_name": sp_name,
                    "font": typeface,
                    "size": sz,
                    "baseline": baseline,
                    "fill": fill_color,
                    "highlight": highlight_color
                })

# Save extracted data
audit_data = {
    "src_char_count": len(src_chars),
    "output_char_count": len(output_chars),
    "src_images": src_images,
    "pptx_media": pptx_media,
    "rpr_violations": rpr_violations,
    "src_chars": src_chars,
    "output_chars": output_chars,
    "output_runs": output_runs
}

with open("scratch/batch1_audit_data.json", "w", encoding="utf-8") as f:
    json.dump(audit_data, f, indent=2, ensure_ascii=False)

print(f"Extraction complete! Saved to scratch/batch1_audit_data.json")
