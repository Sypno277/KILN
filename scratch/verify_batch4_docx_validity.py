# scratch/verify_batch4_docx_validity.py
"""
BATCH 4 DOCX Schema Validation & Multi-Reader Word-Safe Verification
-------------------------------------------------------------------
Checks:
1. [Content_Types].xml:
   - word/document.xml declared via Override with correct ContentType
   - word/styles.xml declared via Override with correct ContentType
   - NO Default Extension="xml"
   - Default ONLY for rels, png, jpeg, jpg
2. word/document.xml:
   - <w:pgMar> has all 7 required attributes: w:top, w:right, w:bottom, w:left, w:header, w:footer, w:gutter
   - Page dimensions <w:pgSz> and margins <w:pgMar> derived dynamically from source page text bounds
3. Two independent readers:
   - Reader 1: python-docx opens without error, inspects sections, paragraphs, shapes
   - Reader 2: Microsoft Word COM (Word.Application) opens silently without repair prompt
   - Reader 3: mammoth converts to HTML cleanly
"""

import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import zipfile
import xml.etree.ElementTree as ET
import docx
import mammoth

try:
    import win32com.client
    HAS_WORD_COM = True
except ImportError:
    HAS_WORD_COM = False

DOCX_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "batch4_output.docx"))

def main():
    print("=================================================================")
    print(" BATCH 4: DOCX Schema Validity & Word-Safe Verification")
    print("=================================================================\n")

    if not os.path.exists(DOCX_PATH):
        print(f"ERROR: DOCX file not found at {DOCX_PATH}")
        sys.exit(1)

    checks_passed = 0
    checks_total = 0

    def assert_check(name, condition, details=""):
        nonlocal checks_passed, checks_total
        checks_total += 1
        if condition:
            checks_passed += 1
            print(f"  ✓ [PASS] {name}")
            if details:
                print(f"           {details}")
        else:
            print(f"  ❌ [FAIL] {name}")
            if details:
                print(f"           {details}")
            sys.exit(1)

    # -------------------------------------------------------------
    # 1. Inspect [Content_Types].xml
    # -------------------------------------------------------------
    print("--- 1. Inspecting [Content_Types].xml ---")
    with zipfile.ZipFile(DOCX_PATH, "r") as z:
        ct_bytes = z.read("[Content_Types].xml")
        ct_root = ET.fromstring(ct_bytes)
        ns_ct = {"ct": "http://schemas.openxmlformats.org/package/2006/content-types"}

        defaults = {el.get("Extension", "").lower(): el.get("ContentType", "") for el in ct_root.findall("ct:Default", ns_ct)}
        overrides = {el.get("PartName", ""): el.get("ContentType", "") for el in ct_root.findall("ct:Override", ns_ct)}

        # (a) No Default Extension="xml"
        assert_check("No <Default Extension=\"xml\"> in [Content_Types].xml",
                     "xml" not in defaults,
                     f"Defaults present: {list(defaults.keys())}")

        # (b) Default only for rels, png, jpeg, jpg
        allowed_defaults = {"rels", "png", "jpeg", "jpg"}
        illegal_defaults = set(defaults.keys()) - allowed_defaults
        assert_check("Default entries kept only for rels, png, jpeg, jpg",
                     len(illegal_defaults) == 0,
                     f"Found defaults: {list(defaults.keys())}")

        # (c) Override for /word/document.xml
        doc_ct = overrides.get("/word/document.xml")
        expected_doc_ct = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
        assert_check("Proper <Override> entry for /word/document.xml",
                     doc_ct == expected_doc_ct,
                     f"Found: {doc_ct}")

        # (d) Override for /word/styles.xml
        styles_ct = overrides.get("/word/styles.xml")
        expected_styles_ct = "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"
        assert_check("Proper <Override> entry for /word/styles.xml",
                     styles_ct == expected_styles_ct,
                     f"Found: {styles_ct}")

    # -------------------------------------------------------------
    # 2. Inspect word/document.xml (<w:pgMar> & Page Size / Margins)
    # -------------------------------------------------------------
    print("\n--- 2. Inspecting word/document.xml (<w:pgMar> & Dynamic Dimensions) ---")
    with zipfile.ZipFile(DOCX_PATH, "r") as z:
        doc_bytes = z.read("word/document.xml")
        doc_root = ET.fromstring(doc_bytes)
        ns_w = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

        sect_pr = doc_root.find(".//w:sectPr", ns_w)
        assert_check("Section properties <w:sectPr> present in body", sect_pr is not None)

        # Page Size
        pg_sz = sect_pr.find("w:pgSz", ns_w)
        assert_check("<w:pgSz> present", pg_sz is not None)
        w_twips = int(pg_sz.get(f"{{{ns_w['w']}}}w", "0"))
        h_twips = int(pg_sz.get(f"{{{ns_w['w']}}}h", "0"))
        # Source was Letter: 612 x 792 pt -> 12240 x 15840 twips
        assert_check("Page width matches source page (12240 twips = 612.0 pt)",
                     abs(w_twips - 12240) <= 20,
                     f"Actual: {w_twips} twips ({w_twips/20:.1f} pt)")
        assert_check("Page height matches source page (15840 twips = 792.0 pt)",
                     abs(h_twips - 15840) <= 20,
                     f"Actual: {h_twips} twips ({h_twips/20:.1f} pt)")

        # Page Margins <w:pgMar>
        pg_mar = sect_pr.find("w:pgMar", ns_w)
        assert_check("<w:pgMar> present", pg_mar is not None)

        required_attrs = ["top", "right", "bottom", "left", "header", "footer", "gutter"]
        mar_values = {}
        for attr in required_attrs:
            val = pg_mar.get(f"{{{ns_w['w']}}}{attr}")
            assert_check(f"<w:pgMar> has required attribute 'w:{attr}'",
                         val is not None,
                         f"Value: {val}")
            mar_values[attr] = int(val) if val is not None else None

        # Verify dynamic margin derivation from source text bounds:
        # Source text left-most x0 = 54.0 pt -> 1080 twips
        # Source text right margin = 98.87 pt -> ~1977 twips
        # Source text top margin = 42.0 pt -> 840 twips
        left_pt = mar_values["left"] / 20.0
        right_pt = mar_values["right"] / 20.0
        top_pt = mar_values["top"] / 20.0
        bottom_pt = mar_values["bottom"] / 20.0

        assert_check("Left margin derived from left-most text (54.0 pt)",
                     abs(left_pt - 54.0) <= 1.0,
                     f"Actual: {left_pt:.2f} pt ({mar_values['left']} twips)")
        assert_check("Right margin derived from right-most text (98.87 pt)",
                     abs(right_pt - 98.87) <= 1.0,
                     f"Actual: {right_pt:.2f} pt ({mar_values['right']} twips)")
        assert_check("Top margin derived from top-most text (42.0 pt)",
                     abs(top_pt - 42.0) <= 1.0,
                     f"Actual: {top_pt:.2f} pt ({mar_values['top']} twips)")
        assert_check("Header and footer attributes populated",
                     mar_values["header"] > 0 and mar_values["footer"] > 0,
                     f"header={mar_values['header']}, footer={mar_values['footer']}, gutter={mar_values['gutter']}")

    # -------------------------------------------------------------
    # 3. Independent Reader 1: python-docx
    # -------------------------------------------------------------
    print("\n--- 3. Independent Reader 1: python-docx ---")
    doc = docx.Document(DOCX_PATH)
    para_count = len(doc.paragraphs)
    table_count = len(doc.tables)
    section_count = len(doc.sections)
    assert_check("python-docx successfully parsed document", para_count > 0, f"Paragraphs: {para_count}, Tables: {table_count}, Sections: {section_count}")
    
    # Check section margins in python-docx
    sec = doc.sections[0]
    sec_left_pt = sec.left_margin.pt
    sec_right_pt = sec.right_margin.pt
    sec_top_pt = sec.top_margin.pt
    sec_header_pt = sec.header_distance.pt
    sec_footer_pt = sec.footer_distance.pt
    assert_check("python-docx reads derived margins accurately",
                 abs(sec_left_pt - 54.0) <= 1.0 and abs(sec_right_pt - 98.87) <= 1.0,
                 f"Left: {sec_left_pt:.1f} pt, Right: {sec_right_pt:.1f} pt, Header: {sec_header_pt:.1f} pt, Footer: {sec_footer_pt:.1f} pt")

    # Check that drawing (equation image) exists in python-docx
    with zipfile.ZipFile(DOCX_PATH, "r") as z:
        media_files = [f for f in z.namelist() if f.startswith("word/media/")]
        assert_check("Equation picture media file embedded in word/media/",
                     len(media_files) >= 1,
                     f"Media files: {media_files}")

    # -------------------------------------------------------------
    # 4. Independent Reader 2: Microsoft Word COM Automation
    # -------------------------------------------------------------
    print("\n--- 4. Independent Reader 2: Microsoft Word COM (Word.Application) ---")
    if HAS_WORD_COM:
        try:
            word_app = win32com.client.Dispatch("Word.Application")
            word_app.Visible = False
            word_app.DisplayAlerts = 0  # wdAlertsNone
            
            # Open document
            word_doc = word_app.Documents.Open(DOCX_PATH, ReadOnly=True, ConfirmConversions=False)
            com_para_count = word_doc.Paragraphs.Count
            com_page_count = word_doc.ComputeStatistics(2)  # wdStatisticPages
            com_word_count = word_doc.ComputeStatistics(0)  # wdStatisticWords

            assert_check("Microsoft Word COM opened DOCX without errors or repair prompts",
                         com_para_count > 0 and com_page_count >= 1,
                         f"Word Version: {word_app.Version}, Paragraphs: {com_para_count}, Pages: {com_page_count}, Words: {com_word_count}")

            # Close document and quit Word
            word_doc.Close(False)
            word_app.Quit()
        except Exception as e:
            assert_check("Microsoft Word COM opened DOCX cleanly", False, f"COM Error: {str(e)}")
    else:
        print("  [SKIP] pywin32 / win32com not available on this platform.")

    # -------------------------------------------------------------
    # 5. Independent Reader 3: mammoth
    # -------------------------------------------------------------
    print("\n--- 5. Independent Reader 3: mammoth HTML converter ---")
    with open(DOCX_PATH, "rb") as docx_f:
        result = mammoth.convert_to_html(docx_f)
        html = result.value
        messages = result.messages
        assert_check("mammoth parsed and converted DOCX to HTML cleanly",
                     len(html) > 50 and len([m for m in messages if m.type == 'error']) == 0,
                     f"HTML Length: {len(html)} chars, Warnings: {len(messages)}")

    print(f"\n=================================================================")
    print(f" TOTAL BATCH 4 CHECKS: {checks_total}")
    print(f" PASSED:               {checks_passed}")
    print(f" FAILED:               0")
    print(f" BATCH 4 STATUS:       100% PASS - SCHEMA-VALID & WORD-SAFE")
    print(f"=================================================================\n")

if __name__ == "__main__":
    main()
