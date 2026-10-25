#!/usr/bin/env python3
"""
BATCH 3: Visual IR Bounding-Box Overlay Generator

Renders source PDF page and draws colored bounding boxes around every extracted IR block:
  - Blue: Paragraphs & Text Blocks
  - Green: Tables & Gridlines
  - Magenta: Images & Graphics
  - Cyan: Interactive Links & Annotations
  - Red: Unsupported / Fallback Elements
"""

import sys
import json
import os
import io

# Force utf-8 for Windows console
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import fitz # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

def generate_overlay(pdf_path, ir_json_path, output_png_path, page_idx=0, dpi=150):
    print(f"--- Generating Visual Extraction Overlay ---")
    print(f"  Source PDF: {pdf_path}")
    print(f"  IR JSON:    {ir_json_path}")
    print(f"  Output PNG: {output_png_path}")

    with open(ir_json_path, 'r', encoding='utf-8') as f:
        ir_data = json.load(f)

    doc = fitz.open(pdf_path)
    page = doc[page_idx]

    # Render base PDF page at target DPI
    pix = page.get_pixmap(dpi=dpi)
    base_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples).convert("RGBA")

    # Create overlay drawing layer
    overlay = Image.new("RGBA", base_img.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    # Conversion factor from EMU to screen pixels at target DPI
    # 1 pt = 12,700 EMU. Pixels = (EMU / 12,700) * (dpi / 72)
    emu_to_px = (1.0 / 12700.0) * (dpi / 72.0)

    color_map = {
        'paragraph': (37, 99, 235, 220),    # Blue
        'table': (22, 163, 74, 220),        # Green
        'image': (217, 70, 239, 220),       # Magenta
        'link': (6, 182, 212, 220),         # Cyan
        'unsupported': (239, 68, 68, 240)   # Red
    }

    fill_map = {
        'paragraph': (37, 99, 235, 25),
        'table': (22, 163, 74, 30),
        'image': (217, 70, 239, 35),
        'link': (6, 182, 212, 35),
        'unsupported': (239, 68, 68, 50)
    }

    pages = ir_data.get('pages', [])
    if page_idx < len(pages):
        page_ir = pages[page_idx]
        blocks = page_ir.get('blocks', [])

        for b in blocks:
            b_type = b.get('type', 'paragraph')
            b_id = b.get('id', '')
            bbox = b.get('provenance', {}).get('sourceBBoxEmu', {})

            if not bbox or 'w' not in bbox or 'h' not in bbox:
                continue

            x0 = bbox.get('x', 0) * emu_to_px
            y0 = bbox.get('y', 0) * emu_to_px
            w = bbox.get('w', 0) * emu_to_px
            h = bbox.get('h', 0) * emu_to_px
            x1 = x0 + w
            y1 = y0 + h

            color = color_map.get(b_type, (100, 116, 139, 200))
            fill = fill_map.get(b_type, (100, 116, 139, 20))

            # Draw semi-transparent fill and solid border
            draw.rectangle([x0, y0, x1, y1], outline=color, width=2, fill=fill)

            # Draw tag label badge
            tag_text = f"[{b_type.upper()}: {b_id}]"
            draw.rectangle([x0, max(0, y0 - 14), x0 + len(tag_text) * 6 + 6, y0], fill=color)
            draw.text((x0 + 3, max(0, y0 - 13)), tag_text, fill=(255, 255, 255, 255))

    # Composite overlay on base PDF render
    final_img = Image.alpha_composite(base_img, overlay)
    os.makedirs(os.path.dirname(output_png_path), exist_ok=True)
    final_img.save(output_png_path, "PNG")

    print(f"✓ Overlay saved to: {output_png_path}")
    print(f"  Overlay image dimensions: {final_img.width} x {final_img.height} px")
    return output_png_path

if __name__ == "__main__":
    pdf = sys.argv[1] if len(sys.argv) > 1 else "scratch/batch6_test_input.pdf"
    ir_json = sys.argv[2] if len(sys.argv) > 2 else "scratch/batch3_ir_dump.json"
    out_png = sys.argv[3] if len(sys.argv) > 3 else "scratch/batch3_extraction_overlay.png"
    generate_overlay(pdf, ir_json, out_png)
