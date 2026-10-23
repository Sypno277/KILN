import json
from PIL import Image, ImageChops, ImageStat
from collections import Counter
import hashlib

with open("scratch/batch1_audit_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

src_chars = data["src_chars"]
out_chars = data["output_chars"]
src_images = data["src_images"]
pptx_media = data["pptx_media"]
rpr_violations = data["rpr_violations"]
output_runs = data["output_runs"]

print("--- 1. Per-Attribute Counts ---")
# Count by font
src_fonts = Counter(c["font"] for c in src_chars)
out_fonts = Counter(c["font"] for c in out_chars)
print("Source fonts:", src_fonts)
print("Output fonts:", out_fonts)

# Count by fill color
src_colors = Counter(c["fill"] for c in src_chars)
out_colors = Counter(c["fill"] for c in out_chars)
print("Source colors:", src_colors)
print("Output colors:", out_colors)

# Count by stroke
src_strokes = Counter(str(c["stroke"]) for c in src_chars)
out_strokes = Counter("None" for _ in out_chars) # PPTX runs have no stroke defined

# Count by render mode
src_rmodes = Counter(c["render_mode"] for c in src_chars)

# Count by baseline / sub/superscript
# In source: chars where size is 8pt while standard is 12pt (subscripts '2' in H2O and CO2)
src_subscripts = sum(1 for c in src_chars if c["size"] == 8 and c["char"] == '2')
src_normal_baseline = len(src_chars) - src_subscripts

out_subscripts = sum(1 for c in out_chars if c["baseline"] is not None and int(c["baseline"]) < 0)
out_superscripts = sum(1 for c in out_chars if c["baseline"] is not None and int(c["baseline"]) > 0)
out_normal_baseline = sum(1 for c in out_chars if c["baseline"] is None)

print(f"Subscripts: Source={src_subscripts}, Output={out_subscripts}")
print(f"Normal baseline: Source={src_normal_baseline}, Output={out_normal_baseline}")

# Image analysis
print("\n--- 2. Image Placeholder Analysis ---")
for idx, im in enumerate(src_images):
    print(f"Source Image {idx+1}: {im['width']}x{im['height']}, {im['bytes_len']} bytes, hash={im['hash']}")

for idx, m in enumerate(pptx_media):
    print(f"Output Media {idx+1} ({m['filename']}): {m['width']}x{m['height']}, {m['bytes_len']} bytes, mode={m['mode']}, colors={m['colors']}, hash={m['hash']}")

# Visual diff between PDF render and PPTX render
im_pdf = Image.open("scratch/pdf_page1_render.png").convert("RGB")
im_ppt = Image.open("scratch/pptx_slide1_render.png").convert("RGB")

# Ensure identical dimensions
print(f"\nPDF render size: {im_pdf.size}, PPT render size: {im_ppt.size}")
if im_pdf.size != im_ppt.size:
    im_ppt = im_ppt.resize(im_pdf.size, Image.Resampling.LANCZOS)

diff = ImageChops.difference(im_pdf, im_ppt)
stat = ImageStat.Stat(diff)
diff_pixels = sum(1 for p in diff.getdata() if any(c > 10 for c in p))
total_pixels = im_pdf.size[0] * im_pdf.size[1]
diff_ratio = (diff_pixels / total_pixels) * 100
print(f"Visual pixel difference (>10 intensity): {diff_pixels}/{total_pixels} ({diff_ratio:.2f}%)")

diff.save("scratch/batch1_visual_diff.png")
print("Saved diff image to scratch/batch1_visual_diff.png")
