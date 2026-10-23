import fitz
import json
import zipfile
import xml.etree.ElementTree as ET

pdf_path = "scratch/batch4_color_test_input.pdf"
pptx_path = "scratch/batch4_after_output.pptx"
docx_path = "scratch/batch4_output.docx"

# 1. Source PDF char counts by color
doc = fitz.open(pdf_path)
src_colors = {}
src_total = 0
for page_idx, page in enumerate(doc):
    data = json.loads(page.get_text("rawjson"))
    for b in data.get("blocks", []):
        for l in b.get("lines", []):
            for s in l.get("spans", []):
                chars = s.get("chars", [])
                c = s.get("color", 0)
                r = (c >> 16) & 255
                g = (c >> 8) & 255
                b_col = c & 255
                hex_col = f"#{r:02X}{g:02X}{b_col:02X}"
                txt = "".join([ch.get("c", "") for ch in chars])
                src_colors[hex_col] = src_colors.get(hex_col, 0) + len(txt)
                src_total += len(txt)

print("Source PDF Color Counts:")
for col, cnt in sorted(src_colors.items(), key=lambda x: -x[1]):
    print(f"  {col}: {cnt} chars")
print(f"  TOTAL: {src_total} chars\n")

# 2. PPTX char counts by color
pptx_zip = zipfile.ZipFile(pptx_path)
pptx_colors = {}
pptx_total = 0
for name in sorted(pptx_zip.namelist()):
    if name.startswith("ppt/slides/slide") and name.endswith(".xml"):
        xml_str = pptx_zip.read(name).decode("utf-8")
        root = ET.fromstring(xml_str)
        ns = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main",
              "p": "http://schemas.openxmlformats.org/presentationml/2006/main"}
        for r in root.iter(f"{{{ns['a']}}}r"):
            t_el = r.find(f"{{{ns['a']}}}t")
            if t_el is not None and t_el.text:
                text = t_el.text
                rPr = r.find(f"{{{ns['a']}}}rPr")
                color = "unset"
                if rPr is not None:
                    srgb = rPr.find(f".//{{{ns['a']}}}srgbClr")
                    if srgb is not None and "val" in srgb.attrib:
                        color = "#" + srgb.attrib["val"].upper()
                pptx_colors[color] = pptx_colors.get(color, 0) + len(text)
                pptx_total += len(text)

print("PPTX Output Color Counts:")
for col, cnt in sorted(pptx_colors.items(), key=lambda x: -x[1]):
    print(f"  {col}: {cnt} chars")
print(f"  TOTAL: {pptx_total} chars\n")

# 3. DOCX char counts by color
docx_zip = zipfile.ZipFile(docx_path)
docx_colors = {}
docx_total = 0
doc_xml = docx_zip.read("word/document.xml").decode("utf-8")
root_docx = ET.fromstring(doc_xml)
ns_w = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
for r in root_docx.iter(f"{{{ns_w['w']}}}r"):
    t_el = r.find(f"{{{ns_w['w']}}}t")
    if t_el is not None and t_el.text:
        text = t_el.text
        rPr = r.find(f"{{{ns_w['w']}}}rPr")
        color = "unset"
        if rPr is not None:
            c_el = rPr.find(f"{{{ns_w['w']}}}color")
            if c_el is not None and f"{{{ns_w['w']}}}val" in c_el.attrib:
                color = "#" + c_el.attrib[f"{{{ns_w['w']}}}val"].upper()
        docx_colors[color] = docx_colors.get(color, 0) + len(text)
        docx_total += len(text)

print("DOCX Output Color Counts:")
for col, cnt in sorted(docx_colors.items(), key=lambda x: -x[1]):
    print(f"  {col}: {cnt} chars")
print(f"  TOTAL: {docx_total} chars\n")

# Comparison check
print("=== VERIFICATION SUMMARY ===")
print(f"Red Characters (#E01C47):")
print(f"  Source PDF: {src_colors.get('#E01C47', 0)}")
print(f"  PPTX:       {pptx_colors.get('#E01C47', 0)}")
print(f"  DOCX:       {docx_colors.get('#E01C47', 0)}")
match = (src_colors.get('#E01C47', 0) == pptx_colors.get('#E01C47', 0) == docx_colors.get('#E01C47', 0) == 795)
print(f"Exact match on Red Characters: {'YES (795 == 795 == 795)' if match else 'NO'}")
