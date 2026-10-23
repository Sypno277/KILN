import fitz
from PIL import Image, ImageChops, ImageStat
import subprocess
import os

pdf_path = "scratch/batch4_color_test_input.pdf"
pptx_path = os.path.abspath("scratch/batch4_after_output.pptx")

# 1. Render Source PDF Page 1 and Page 2 at 150 DPI
doc = fitz.open(pdf_path)
pdf_p1 = "scratch/batch4_pdf_page1.png"
pdf_p2 = "scratch/batch4_pdf_page2.png"

doc[0].get_pixmap(dpi=150).save(pdf_p1)
doc[1].get_pixmap(dpi=150).save(pdf_p2)
print(f"Rendered PDF Page 1 to {pdf_p1}")
print(f"Rendered PDF Page 2 to {pdf_p2}")

# 2. Export PPTX Slide 1 and Slide 2 using PowerPoint COM via PowerShell
export_ps = f"""
$pptxPath = '{pptx_path}'
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open($pptxPath, 1, 0, 0)
$pres.Slides.Item(1).Export((Resolve-Path 'scratch').Path + '\\batch4_pptx_slide1.png', 'PNG', 1275, 1650)
$pres.Slides.Item(2).Export((Resolve-Path 'scratch').Path + '\\batch4_pptx_slide2.png', 'PNG', 1275, 1650)
$pres.Close()
$ppt.Quit()
"""
with open("scratch/export_batch4_slides.ps1", "w") as f:
    f.write(export_ps)

subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", "scratch/export_batch4_slides.ps1"], check=True)
print("Exported PPTX Slide 1 and Slide 2 using Microsoft PowerPoint COM")

# 3. Compare Page 1 and Page 2
for p in [1, 2]:
    pdf_img = Image.open(f"scratch/batch4_pdf_page{p}.png").convert("RGB")
    ppt_img = Image.open(f"scratch/batch4_pptx_slide{p}.png").convert("RGB")
    
    if pdf_img.size != ppt_img.size:
        ppt_img = ppt_img.resize(pdf_img.size, Image.Resampling.LANCZOS)
    
    diff = ImageChops.difference(pdf_img, ppt_img)
    diff.save(f"scratch/batch4_diff_page{p}.png")
    
    diff_pixels = sum(1 for px in diff.getdata() if any(c > 15 for c in px))
    total_pixels = pdf_img.size[0] * pdf_img.size[1]
    pct = (diff_pixels / total_pixels) * 100
    print(f"Page {p} visual pixel difference (>15 delta): {diff_pixels}/{total_pixels} ({pct:.2f}%)")
