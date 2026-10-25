import os
import sys
import json
from PIL import Image, ImageChops
import fitz

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def run_visual_color_audit():
    print("=" * 70)
    print(" BATCH 5: VISUAL COLOR AUDIT & REGIONAL RED PIXEL ANALYSIS")
    print("=" * 70)

    os.makedirs("reports/visual-diff", exist_ok=True)
    os.makedirs("scratch", exist_ok=True)

    # 1. Render Source PDF Page 1 at 150 DPI (1275x1650)
    src_pdf_path = "scratch/week1_solutions.pdf"
    src_doc = fitz.open(src_pdf_path)
    src_pix = src_doc[0].get_pixmap(dpi=150)
    src_png_path = "reports/visual-diff/source_page1_render.png"
    src_pix.save(src_png_path)
    print(f"1. Rendered Source PDF Page 1: {src_pix.width}x{src_pix.height} @ 150 DPI")

    # 2. Render DOCX Page 1 (Exported via Word COM to PDF, then rendered at 150 DPI)
    docx_pdf_path = "scratch/output_week1_docx_rendered.pdf"
    if not os.path.exists(docx_pdf_path):
        raise FileNotFoundError(f"DOCX rendered PDF missing: {docx_pdf_path}")
    docx_doc = fitz.open(docx_pdf_path)
    docx_pix = docx_doc[0].get_pixmap(dpi=150)
    docx_png_path = "reports/visual-diff/docx_page1_render.png"
    docx_pix.save(docx_png_path)
    print(f"2. Rendered DOCX Page 1:       {docx_pix.width}x{docx_pix.height} @ 150 DPI")

    # 3. PPTX Slide 1 (Exported via PowerPoint COM at 1275x1650)
    pptx_png_src = "scratch/output_week1_pptx_slide1.png"
    if not os.path.exists(pptx_png_src):
        raise FileNotFoundError(f"PPTX slide 1 render missing: {pptx_png_src}")
    pptx_png_path = "reports/visual-diff/pptx_slide1_render.png"
    pptx_img = Image.open(pptx_png_src).convert("RGB")
    if pptx_img.size != (src_pix.width, src_pix.height):
        pptx_img = pptx_img.resize((src_pix.width, src_pix.height), Image.Resampling.LANCZOS)
    pptx_img.save(pptx_png_path)
    print(f"3. Loaded PPTX Slide 1:       {pptx_img.width}x{pptx_img.height}")

    # 4. HTML Page 1 (Rendered via Playwright Chrome at 1275x1650)
    html_png_src = "scratch/output_week1_html_render.png"
    if not os.path.exists(html_png_src):
        raise FileNotFoundError(f"HTML render missing: {html_png_src}")
    html_png_path = "reports/visual-diff/html_page1_render.png"
    html_img = Image.open(html_png_src).convert("RGB")
    if html_img.size != (src_pix.width, src_pix.height):
        html_img = html_img.resize((src_pix.width, src_pix.height), Image.Resampling.LANCZOS)
    html_img.save(html_png_path)
    print(f"4. Loaded HTML Page 1:       {html_img.width}x{html_img.height}")

    # Helper function to analyze regions and pure-red pixels
    # Regions:
    # Top region (Header / Instructions): 0% - 30%
    # Middle region (Options & Red Answer Choice c): 30% - 70%
    # Bottom region (Footer / Blank margin): 70% - 100%
    width, height = src_pix.width, src_pix.height
    reg_top_end = int(height * 0.30)
    reg_mid_end = int(height * 0.70)

    def analyze_image_red(img, label):
        pixels = img.load()
        total_pure_red = 0
        total_antialiased_red = 0
        regions = {
            "top_header_0_30": {"pure_red": 0, "antialiased_red": 0},
            "middle_options_30_70": {"pure_red": 0, "antialiased_red": 0},
            "bottom_margin_70_100": {"pure_red": 0, "antialiased_red": 0}
        }

        mask = Image.new("RGB", (width, height), (245, 245, 245))
        mask_pixels = mask.load()

        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y]
                is_pure_red = (r == 255 and g == 0 and b == 0)
                is_anti_red = (r > 180 and g < 80 and b < 80 and not is_pure_red)

                target_reg = "top_header_0_30" if y < reg_top_end else ("middle_options_30_70" if y < reg_mid_end else "bottom_margin_70_100")

                if is_pure_red:
                    total_pure_red += 1
                    regions[target_reg]["pure_red"] += 1
                    mask_pixels[x, y] = (255, 0, 0)
                elif is_anti_red:
                    total_antialiased_red += 1
                    regions[target_reg]["antialiased_red"] += 1
                    mask_pixels[x, y] = (220, 80, 80)
                elif r < 60 and g < 60 and b < 60:
                    mask_pixels[x, y] = (70, 70, 70)

        mask_out_path = f"reports/visual-diff/{label}_red_mask.png"
        mask.save(mask_out_path)

        return {
            "label": label,
            "total_pure_red": total_pure_red,
            "total_antialiased_red": total_antialiased_red,
            "total_red_spectrum": total_pure_red + total_antialiased_red,
            "regions": regions,
            "mask_path": mask_out_path
        }

    src_img = Image.open(src_png_path).convert("RGB")
    docx_img = Image.open(docx_png_path).convert("RGB")

    src_analysis = analyze_image_red(src_img, "source_page1")
    docx_analysis = analyze_image_red(docx_img, "docx_page1")
    pptx_analysis = analyze_image_red(pptx_img, "pptx_slide1")
    html_analysis = analyze_image_red(html_img, "html_page1")

    # Generate Visual Diff Images
    for target_name, target_im in [("docx", docx_img), ("pptx", pptx_img), ("html", html_img)]:
        diff = ImageChops.difference(src_img, target_im)
        diff_path = f"reports/visual-diff/diff_source_vs_{target_name}_page1.png"
        diff.save(diff_path)
        print(f"Saved visual diff: {diff_path}")

    # Regional Red Analysis & Tolerance Checks
    print("\n" + "=" * 70)
    print(" REGIONAL RED PIXEL ANALYSIS (PAGE 1 / SLIDE 1):")
    print("=" * 70)
    print(f"{'Target':<15} | {'Total Pure Red':<16} | {'Options Reg (30-70%)':<22} | {'Header Reg':<12} | {'Status'}")
    print("-" * 75)

    all_analyses = [src_analysis, docx_analysis, pptx_analysis, html_analysis]
    tolerance_failures = []

    for a in all_analyses:
        lbl = a["label"]
        tot = a["total_pure_red"]
        mid = a["regions"]["middle_options_30_70"]["pure_red"]
        top = a["regions"]["top_header_0_30"]["pure_red"]

        # Stated tolerance:
        # Stated tolerance:
        # In the options region (where Question 1 Option c is), pure-red pixels MUST be > 2000
        # If middle region has 0 red pixels (the Batch 2 bug where color became 000000), FAIL.
        status = "PASS"
        if mid == 0:
            status = "FAIL (Zero Red in Options)"
            tolerance_failures.append(f"{lbl}: Zero red pixels in options region!")
        elif mid < 2000:
            status = f"FAIL (Too Low: {mid})"
            tolerance_failures.append(f"{lbl}: Red pixel count ({mid}) below minimum threshold 2000")

        print(f"{lbl:<15} | {tot:<16} | {mid:<22} | {top:<12} | {status}")

    # DOCX vs Source delta in options region:
    src_mid_red = src_analysis["regions"]["middle_options_30_70"]["pure_red"]
    docx_mid_red = docx_analysis["regions"]["middle_options_30_70"]["pure_red"]
    docx_delta_pct = abs(docx_mid_red - src_mid_red) / src_mid_red * 100
    print(f"\nDOCX vs Source Middle Region Red Pixel Delta: {docx_delta_pct:.2f}% (Tolerated < 15%)")

    if docx_delta_pct > 15.0:
        tolerance_failures.append(f"DOCX red delta ({docx_delta_pct:.2f}%) exceeds 15% tolerance")

    audit_summary = {
        "status": "PASSED" if len(tolerance_failures) == 0 else "FAILED",
        "tolerance_failures": tolerance_failures,
        "analyses": {
            "source": src_analysis,
            "docx": docx_analysis,
            "pptx": pptx_analysis,
            "html": html_analysis
        },
        "regional_comparison": {
            "options_region_red_pixels": {
                "source": src_mid_red,
                "docx": docx_mid_red,
                "pptx": pptx_analysis["regions"]["middle_options_30_70"]["pure_red"],
                "html": html_analysis["regions"]["middle_options_30_70"]["pure_red"]
            },
            "docx_vs_source_delta_pct": round(docx_delta_pct, 2),
            "tolerance_limit_pct": 15.0
        }
    }

    report_path = "reports/visual-diff/visual_color_audit_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(audit_summary, f, indent=2)
    print(f"\nSaved full visual audit report to: {report_path}")

    if len(tolerance_failures) > 0:
        print("\n❌ VISUAL AUDIT FAILED TOLERANCE CHECKS:")
        for tf in tolerance_failures:
            print(f"  - {tf}")
        sys.exit(1)
    else:
        print("\n✓ VISUAL COLOR AUDIT PASSED ALL TOLERANCE CHECKS!")
        sys.exit(0)

if __name__ == "__main__":
    run_visual_color_audit()
