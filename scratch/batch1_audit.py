import fitz # PyMuPDF
import zipfile
import xml.etree.ElementTree as ET
import os
import hashlib
from PIL import Image
import io

pdf_path = "scratch/batch6_test_input.pdf"
pptx_path = "scratch/batch6_output.pptx"

print("=====================================================================")
print("  STEP 1: SOURCE PDF EXTRACTION (PER CHARACTER & PER IMAGE)")
print("=====================================================================")

doc = fitz.open(pdf_path)
page = doc[0]

# Extract characters with detailed text attributes
chars_src = []
import json
raw_data = json.loads(page.get_text("rawjson"))
blocks = raw_data["blocks"]

for b_idx, b in enumerate(blocks):
    if b.get("type") == 0: # text block
        for l_idx, line in enumerate(b.get("lines", [])):
            base_y = line.get("bbox", [0, 0, 0, 0])[3] # line bottom / baseline approx
            for s_idx, span in enumerate(line.get("spans", [])):
                font_name = span.get("font", "")
                size = span.get("size", 0)
                color_int = span.get("color", 0)
                # Convert color int to #RRGGBB
                r = (color_int >> 16) & 255
                g = (color_int >> 8) & 255
                b_col = color_int & 255
                fill_hex = f"#{r:02X}{g:02X}{b_col:02X}"
                flags = span.get("flags", 0)
                
                # In PyMuPDF, each char in span
                chars = span.get("chars", [])
                if not chars:
                    # fallback if raw chars not separated
                    for ch in span.get("text", ""):
                        chars.append({"c": ch, "bbox": span.get("bbox")})
                
                for ch_info in chars:
                    ch = ch_info.get("c", "")
                    bbox = ch_info.get("bbox", [0, 0, 0, 0])
                    # baseline offset relative to normal line
                    chars_src.append({
                        "char": ch,
                        "font": font_name,
                        "size": size,
                        "fill": fill_hex,
                        "stroke": None, # default no stroke unless render mode 1/2
                        "render_mode": 0, # fill
                        "bbox": bbox,
                        "line_idx": l_idx,
                        "block_idx": b_idx
                    })

print(f"Total source characters extracted: {len(chars_src)}")

# Extract images from PDF
src_images = []
for img_info in page.get_images(full=True):
    xref = img_info[0]
    base_image = doc.extract_image(xref)
    img_bytes = base_image["image"]
    img_ext = base_image["ext"]
    w = base_image["width"]
    h = base_image["height"]
    colorspace = base_image["colorspace"]
    bpc = base_image["bpc"]
    hsh = hashlib.sha256(img_bytes).hexdigest()
    
    # get image rect on page
    rects = page.get_image_rects(xref)
    bbox = [rects[0].x0, rects[0].y0, rects[0].x1, rects[0].y1] if rects else None
    
    src_images.append({
        "xref": xref,
        "width": w,
        "height": h,
        "ext": img_ext,
        "bytes_len": len(img_bytes),
        "colorspace": colorspace,
        "bpc": bpc,
        "bbox": bbox,
        "hash": hsh
    })

print(f"Total source images extracted: {len(src_images)}")
for idx, im in enumerate(src_images):
    print(f"  Image {idx+1}: {im['width']}x{im['height']} {im['colorspace']} ({im['bytes_len']} bytes), bbox: {im['bbox']}, SHA256: {im['hash'][:16]}...")

print("\n=====================================================================")
print("  STEP 2: PPTX OUTPUT RAW XML EXTRACTION")
print("=====================================================================")

with zipfile.ZipFile(pptx_path) as z:
    slide_xml_str = z.read("ppt/slides/slide1.xml").decode("utf-8")
    media_files = [f for f in z.namelist() if f.startswith("ppt/media/")]
    
    pptx_media = []
    for mf in media_files:
        mbytes = z.read(mf)
        try:
            pil_img = Image.open(io.BytesIO(mbytes))
            pw, ph = pil_img.size
            pmode = pil_img.mode
            num_colors = len(pil_img.getcolors(maxcolors=1000000) or [])
        except Exception as e:
            pw, ph, pmode, num_colors = None, None, str(e), None
        
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

print(f"Total PPTX media files extracted: {len(pptx_media)}")
for m in pptx_media:
    print(f"  Media: {m['filename']} | {m['width']}x{m['height']} mode={m['mode']} colors={m['colors']} size={m['bytes_len']} bytes | SHA256={m['hash'][:16]}...")

# Parse slide XML for all runs, characters, and rPr child order
root = ET.fromstring(slide_xml_str)
ns = {
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

output_runs = []
rpr_violations = []

# Expected schema order in ECMA-376 for CT_TextCharacterProperties:
# 1. ln
# 2. fill (noFill, solidFill, gradFill, blipFill, pattFill, grpFill)
# 3. effectLst, effectDag
# 4. highlight
# 5. uLnTx, uLn, uFillTx, uFill
# 6. latin, ea, cs, sym
# 7. hlinkClick, hlinkMouseOver
# 8. extLst

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
    sp_name = cnvpr.attrib.get('name', '') if cnvpr is not None else ''
    
    # get position from spPr/xfrm
    off = sp.find('.//p:spPr/a:xfrm/a:off', ns)
    ext = sp.find('.//p:spPr/a:xfrm/a:ext', ns)
    pos = (
        int(off.attrib.get('x', 0))/12700 if off is not None else 0,
        int(off.attrib.get('y', 0))/12700 if off is not None else 0,
        int(ext.attrib.get('cx', 0))/12700 if ext is not None else 0,
        int(ext.attrib.get('cy', 0))/12700 if ext is not None else 0
    )
    
    for p in sp.findall('.//a:p', ns):
        for r in p.findall('.//a:r', ns):
            t = r.find('a:t', ns)
            text = t.text if t is not None else ''
            rPr = r.find('a:rPr', ns)
            
            # Check rPr attributes
            sz = int(rPr.attrib.get('sz', 1200)) / 100 if rPr is not None else 12.0
            baseline = rPr.attrib.get('baseline', None) if rPr is not None else None
            bold = rPr.attrib.get('b', '0') == '1' if rPr is not None else False
            italic = rPr.attrib.get('i', '0') == '1' if rPr is not None else False
            
            # Children
            solidFill = rPr.find('a:solidFill/a:srgbClr', ns) if rPr is not None else None
            fill_color = ('#' + solidFill.attrib.get('val', '000000')).upper() if solidFill is not None else None
            
            latin = rPr.find('a:latin', ns) if rPr is not None else None
            typeface = latin.attrib.get('typeface', None) if latin is not None else None
            
            highlight = rPr.find('a:highlight/a:srgbClr', ns) if rPr is not None else None
            highlight_color = ('#' + highlight.attrib.get('val', '')).upper() if highlight is not None else None
            
            # Check child element ordering inside rPr
            if rPr is not None:
                child_tags = [child.tag.split('}')[-1] for child in rPr]
                tag_ranks = [TAG_CATEGORIES.get(tag, 99) for tag in child_tags]
                is_ordered = all(tag_ranks[i] <= tag_ranks[i+1] for i in range(len(tag_ranks)-1))
                if not is_ordered:
                    rpr_violations.append({
                        "shape": sp_name,
                        "text": text[:30],
                        "children": child_tags,
                        "ranks": tag_ranks
                    })
            
            output_runs.append({
                "shape": sp_name,
                "text": text,
                "pos": pos,
                "sz": sz,
                "baseline": baseline,
                "bold": bold,
                "italic": italic,
                "fill": fill_color,
                "font": typeface,
                "highlight": highlight_color
            })

print(f"Total PPTX text runs extracted: {len(output_runs)}")
total_output_chars = sum(len(r['text']) for r in output_runs)
print(f"Total PPTX output characters: {total_output_chars}")
print(f"Total a:rPr schema ordering violations: {len(rpr_violations)}")
if rpr_violations:
    for v in rpr_violations[:5]:
        print(f"  Violation in '{v['shape']}' ({v['text']}...): actual sequence {v['children']}")

print("\nScript completed successfully.")
