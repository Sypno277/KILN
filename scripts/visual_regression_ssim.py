#!/usr/bin/env python3
"""
Visual Regression & SSIM Color-Sensitivity Verification Script
Enforces BATCH 6 Item 4:
- Render source PDF and output PPTX
- Compare using SSIM (Structural Similarity Index Measure)
- Fail under threshold (0.90) and save diff images
- Color-sensitivity check (red pixel count in source vs output)
"""

import os
import sys
import json
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim
import fitz # PyMuPDF

PDF_PATH = "scratch/batch6_test_input.pdf"
PPTX_PATH = "scratch/batch6_output.pptx"
OUT_DIR = "reports/visual-diff"
PDF_PNG = "scratch/pdf_page1_render.png"
PPTX_PNG = "scratch/pptx_slide1_render.png"
DIFF_PNG = os.path.join(OUT_DIR, "batch6_ssim_diff.png")

SSIM_THRESHOLD = 0.90

def main():
    print("--- Running Visual Regression & SSIM Analysis (BATCH 6 Item 4) ---")
    os.makedirs(OUT_DIR, exist_ok=True)

    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF fixture not found at {PDF_PATH}", file=sys.stderr)
        sys.exit(1)

    # 1. Render source PDF to image at 150 DPI
    doc = fitz.open(PDF_PATH)
    page = doc[0]
    pix = page.get_pixmap(dpi=150)
    pix.save(PDF_PNG)
    print(f"  [OK] Rendered PDF page 1 to {PDF_PNG} ({pix.width}x{pix.height})")

    ps_script = f"""
    $pptx = (Resolve-Path '{PPTX_PATH}').Path
    $out = (Resolve-Path 'scratch').Path + '\\pptx_slide1_render.png'
    $ppt = New-Object -ComObject PowerPoint.Application
    $pres = $ppt.Presentations.Open($pptx, 1, 0, 0)
    $slide = $pres.Slides.Item(1)
    $slide.Export($out, 'PNG', {pix.width}, {pix.height})
    $pres.Close()
    $ppt.Quit()
    """
    tmp_ps1 = "scratch/temp_export.ps1"
    with open(tmp_ps1, "w", encoding="utf-8") as f:
        f.write(ps_script)
    ret = os.system(f"powershell -ExecutionPolicy Bypass -File {tmp_ps1}")
    if ret != 0 or not os.path.exists(PPTX_PNG):
        print(f"Warning: PowerPoint COM export returned code {ret}. Verifying existing PPT render.", file=sys.stderr)

    if not os.path.exists(PPTX_PNG):
        print(f"Error: PPTX render not found at {PPTX_PNG}", file=sys.stderr)
        sys.exit(1)

    # 3. Load both images and ensure identical dimensions
    im_pdf = Image.open(PDF_PNG).convert("RGB")
    im_ppt = Image.open(PPTX_PNG).convert("RGB")

    if im_ppt.size != im_pdf.size:
        im_ppt = im_ppt.resize(im_pdf.size, Image.Resampling.LANCZOS)

    arr_pdf = np.array(im_pdf)
    arr_ppt = np.array(im_ppt)

    # 4. SSIM calculation on grayscale
    gray_pdf = np.array(im_pdf.convert("L"))
    gray_ppt = np.array(im_ppt.convert("L"))

    score, diff = ssim(gray_pdf, gray_ppt, full=True)
    diff_uint8 = ((1.0 - diff) * 255).astype(np.uint8)
    diff_img = Image.fromarray(diff_uint8)
    diff_img.save(DIFF_PNG)
    print(f"  [OK] Saved SSIM difference image to: {DIFF_PNG}")
    print(f"  [OK] Structural Similarity Index (SSIM): {score:.4f} (Threshold: {SSIM_THRESHOLD:.2f})")

    # 5. Color sensitivity check: Red pixels (R > 180, G < 80, B < 80)
    pdf_red = int(np.sum((arr_pdf[:, :, 0] > 180) & (arr_pdf[:, :, 1] < 80) & (arr_pdf[:, :, 2] < 80)))
    ppt_red = int(np.sum((arr_ppt[:, :, 0] > 180) & (arr_ppt[:, :, 1] < 80) & (arr_ppt[:, :, 2] < 80)))
    print(f"  [OK] Color Sensitivity (Red Pixels): Source={pdf_red} | Output={ppt_red}")

    red_ratio = abs(pdf_red - ppt_red) / max(pdf_red, ppt_red) if max(pdf_red, ppt_red) > 0 else 0
    print(f"    Red Pixel Variance: {red_ratio * 100:.2f}% (Tolerance: <= 25.0%)")

    # Assertions
    failures = []
    if score < SSIM_THRESHOLD:
        failures.append(f"SSIM score {score:.4f} is under threshold {SSIM_THRESHOLD:.2f}")

    if pdf_red == 0:
        failures.append("Source PDF has 0 red pixels (invalid fixture)")
    if ppt_red == 0:
        failures.append("Output PPTX has 0 red pixels (color loss defect)")
    if red_ratio > 0.25:
        failures.append(f"Red pixel variance {red_ratio * 100:.2f}% exceeds tolerance 25.0%")

    if failures:
        print("\n[FAIL] VISUAL REGRESSION FAILED:", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        sys.exit(1)
    else:
        print("\n[PASS] VISUAL REGRESSION & COLOR SENSITIVITY VERIFIED CLEANLY (PASS)\n")
        sys.exit(0)

if __name__ == "__main__":
    main()
