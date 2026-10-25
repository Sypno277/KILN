import os
import sys
import json
import zipfile
import re
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import docx
from docx.shared import RGBColor
import pptx

def reextract_colors():
    golden_path = "reports/golden/source_color_ground_truth.json"
    with open(golden_path, "r", encoding="utf-8") as f:
        golden_data = json.load(f)
    
    golden_summary = golden_data["summary"]["character_counts_by_color"]
    golden_total = golden_data["summary"]["total_characters_across_all_pages"]
    golden_red = golden_summary["#FF0000"]
    golden_black = golden_summary["#000000"]
    
    print("=" * 70)
    print("    BATCH 4: WRITER COLOR RE-EXTRACTION & GOLDEN MAP AUDIT")
    print("=" * 70)
    print(f"SOURCE Golden Map Ground Truth:")
    print(f"  Total Characters: {golden_total}")
    print(f"  Red (#FF0000):    {golden_red}")
    print(f"  Black (#000000):  {golden_black}")
    print("-" * 70)
    
    results = {}
    
    # -------------------------------------------------------------
    # 1. DOCX Re-Extraction
    # -------------------------------------------------------------
    docx_path = "scratch/output_week1.docx"
    
    # Reader 1: python-docx
    doc = docx.Document(docx_path)
    docx_r1_red = 0
    docx_r1_black = 0
    docx_r1_unset = 0
    
    for p in doc.paragraphs:
        for r in p.runs:
            text_len = len(r.text)
            color = r.font.color
            if color and color.rgb == RGBColor(0xFF, 0x00, 0x00):
                docx_r1_red += text_len
            elif color and color.rgb == RGBColor(0x00, 0x00, 0x00):
                docx_r1_black += text_len
            else:
                docx_r1_unset += text_len
                
    # Reader 2: Direct OpenXML XML parser
    docx_r2_red = 0
    docx_r2_black = 0
    docx_r2_unset = 0
    docx_child_order_valid = True
    
    with zipfile.ZipFile(docx_path, 'r') as z:
        doc_xml = z.read('word/document.xml')
        root = ET.fromstring(doc_xml)
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        for r in root.iter(f"{{{ns['w']}}}r"):
            rPr = r.find(f"{{{ns['w']}}}rPr")
            t_elems = r.findall(f"{{{ns['w']}}}t")
            text = ''.join(t.text for t in t_elems if t.text)
            tabs = len(r.findall(f"{{{ns['w']}}}tab"))
            char_count = len(text) + tabs
            
            if char_count == 0:
                continue
                
            color_val = None
            if rPr is not None:
                color_elem = rPr.find(f"{{{ns['w']}}}color")
                if color_elem is not None:
                    color_val = color_elem.get(f"{{{ns['w']}}}val")
                    
                # Schema check: verify child order in w:rPr
                tag_order = [child.tag.split('}')[-1] for child in rPr]
                expected_seq = ['rFonts', 'b', 'bCs', 'i', 'iCs', 'caps', 'smallCaps', 'strike', 'dstrike',
                                'outline', 'shadow', 'emboss', 'imprint', 'noProof', 'snapToGrid', 'vanish',
                                'webHidden', 'color', 'spacing', 'w', 'kern', 'position', 'sz', 'szCs',
                                'highlight', 'u', 'effect', 'bdr', 'shd', 'fitText', 'vertAlign', 'rtl',
                                'cs', 'em', 'lang', 'eastAsianLayout', 'specVanish', 'oMath']
                # Check that tags in tag_order appear in relative non-decreasing sequence
                filtered_tags = [t for t in tag_order if t in expected_seq]
                tag_indices = [expected_seq.index(t) for t in filtered_tags]
                if tag_indices != sorted(tag_indices):
                    docx_child_order_valid = False
                    
            if color_val and color_val.upper() == 'FF0000':
                docx_r2_red += char_count
            elif color_val and color_val.upper() == '000000':
                docx_r2_black += char_count
            else:
                docx_r2_unset += char_count
                
    results['DOCX'] = {
        'reader1_python_docx': {'red': docx_r1_red, 'black': docx_r1_black, 'unset': docx_r1_unset, 'total': docx_r1_red + docx_r1_black + docx_r1_unset},
        'reader2_openxml': {'red': docx_r2_red, 'black': docx_r2_black, 'unset': docx_r2_unset, 'total': docx_r2_red + docx_r2_black + docx_r2_unset},
        'child_order_valid': docx_child_order_valid
    }
    
    # -------------------------------------------------------------
    # 2. PPTX Re-Extraction
    # -------------------------------------------------------------
    pptx_path = "scratch/output_week1.pptx"
    
    # Reader 1: python-pptx
    prs = pptx.Presentation(pptx_path)
    pptx_r1_red = 0
    pptx_r1_black = 0
    pptx_r1_unset = 0
    
    for slide in prs.slides:
        for shape in slide.shapes:
            if shape.has_text_frame:
                for p in shape.text_frame.paragraphs:
                    for r in p.runs:
                        text_len = len(r.text)
                        color = r.font.color
                        if color and color.type == pptx.enum.dml.MSO_COLOR_TYPE.RGB and color.rgb == RGBColor(0xFF, 0x00, 0x00):
                            pptx_r1_red += text_len
                        elif color and color.type == pptx.enum.dml.MSO_COLOR_TYPE.RGB and color.rgb == RGBColor(0x00, 0x00, 0x00):
                            pptx_r1_black += text_len
                        else:
                            pptx_r1_unset += text_len
                            
    # Reader 2: Direct OpenXML XML parser
    pptx_r2_red = 0
    pptx_r2_black = 0
    pptx_r2_unset = 0
    pptx_solidfill_first = True
    
    with zipfile.ZipFile(pptx_path, 'r') as z:
        for name in z.namelist():
            if name.startswith('ppt/slides/slide') and name.endswith('.xml'):
                slide_xml = z.read(name)
                root = ET.fromstring(slide_xml)
                ns_a = 'http://schemas.openxmlformats.org/drawingml/2006/main'
                
                for r in root.iter(f"{{{ns_a}}}r"):
                    rPr = r.find(f"{{{ns_a}}}rPr")
                    t_elem = r.find(f"{{{ns_a}}}t")
                    text = t_elem.text if t_elem is not None and t_elem.text else ""
                    char_count = len(text)
                    if char_count == 0:
                        continue
                        
                    color_val = None
                    if rPr is not None:
                        # Check child order: solidFill must be FIRST child of a:rPr when present!
                        children = list(rPr)
                        if len(children) > 0 and children[0].tag == f"{{{ns_a}}}solidFill":
                            srgb = children[0].find(f"{{{ns_a}}}srgbClr")
                            if srgb is not None:
                                color_val = srgb.get('val')
                        else:
                            # Check if solidFill appears later (which would violate schema / requirement)
                            for idx, ch in enumerate(children):
                                if ch.tag == f"{{{ns_a}}}solidFill":
                                    srgb = ch.find(f"{{{ns_a}}}srgbClr")
                                    if srgb is not None:
                                        color_val = srgb.get('val')
                                    if idx != 0:
                                        pptx_solidfill_first = False
                                        
                    if color_val and color_val.upper() == 'FF0000':
                        pptx_r2_red += char_count
                    elif color_val and color_val.upper() == '000000':
                        pptx_r2_black += char_count
                    else:
                        pptx_r2_unset += char_count
                        
    results['PPTX'] = {
        'reader1_python_pptx': {'red': pptx_r1_red, 'black': pptx_r1_black, 'unset': pptx_r1_unset, 'total': pptx_r1_red + pptx_r1_black + pptx_r1_unset},
        'reader2_openxml': {'red': pptx_r2_red, 'black': pptx_r2_black, 'unset': pptx_r2_unset, 'total': pptx_r2_red + pptx_r2_black + pptx_r2_unset},
        'solidfill_first_child': pptx_solidfill_first
    }
    
    # -------------------------------------------------------------
    # 3. HTML Re-Extraction
    # -------------------------------------------------------------
    html_path = "scratch/output_week1.html"
    with open(html_path, 'r', encoding='utf-8') as f:
        html_text = f.read()
        
    soup = BeautifulSoup(html_text, 'html.parser')
    html_r1_red = 0
    html_r1_black = 0
    html_r1_unset = 0
    
    for span in soup.find_all('span'):
        style = span.get('style', '')
        text = span.get_text()
        char_count = len(text)
        if 'color: #FF0000' in style or 'color:#FF0000' in style or 'color: red' in style:
            html_r1_red += char_count
        elif 'color: #000000' in style or 'color:#000000' in style:
            html_r1_black += char_count
        else:
            html_r1_unset += char_count
            
    # Reader 2: Regex scanner on HTML spans
    html_r2_red = 0
    html_r2_black = 0
    html_r2_unset = 0
    
    span_matches = re.findall(r'<span\s+style="([^"]*)">([\s\S]*?)</span>', html_text)
    for style, content in span_matches:
        # Unescape XML entities for character count
        clean_text = content.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
        char_count = len(clean_text)
        if 'color: #FF0000' in style:
            html_r2_red += char_count
        elif 'color: #000000' in style:
            html_r2_black += char_count
        else:
            html_r2_unset += char_count
            
    results['HTML'] = {
        'reader1_beautifulsoup': {'red': html_r1_red, 'black': html_r1_black, 'unset': html_r1_unset, 'total': html_r1_red + html_r1_black + html_r1_unset},
        'reader2_regex': {'red': html_r2_red, 'black': html_r2_black, 'unset': html_r2_unset, 'total': html_r2_red + html_r2_black + html_r2_unset}
    }
    
    # -------------------------------------------------------------
    # 4. Markdown Re-Extraction
    # -------------------------------------------------------------
    md_path = "scratch/output_week1.md"
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()
    md_chars = len(md_text.replace('\n', '').replace('\r', ''))
    results['Markdown'] = {
        'red': 0,
        'lost_reason': 'Standard Markdown has no font color syntax. Color elements are not emitted and color fidelity is lost (documented as IMPOSSIBLE fallback).'
    }
    
    print("\nRE-EXTRACTION RESULTS:")
    print(json.dumps(results, indent=2))
    
    return results

if __name__ == '__main__':
    reextract_colors()
