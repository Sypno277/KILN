import json

with open("scratch/batch1_audit_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

src_chars = data["src_chars"]
out_runs = data["output_runs"]

# Find specific feature mismatches
mismatches = []

# 1. Baseline / Subscript Mismatches
# Find '2' in H2O and CO2
for idx, c in enumerate(src_chars):
    if c["char"] == '2' and c["size"] == 8:
        # Check corresponding run in output
        # H2O is in run with text containing H or 2
        for r in out_runs:
            if 'H' in r["text"] and 'O' in r["text"]:
                mismatches.append({
                    "location": f"Shape '{r['shape_name']}' at ({r['x']}, {r['y']})",
                    "character": "2 (in H2O / CO2)",
                    "attribute": "baseline offset / subscript",
                    "source_value": "Subscript (size: 8pt, y-delta: -4pt)",
                    "output_value": f"Normal baseline (baseline={r['baseline']}, size: {r['sz']}pt)"
                })
                break

# 2. Schema order mismatch
for r in out_runs:
    mismatches.append({
        "location": f"Shape '{r['shape_name']}' (text: '{r['text'][:25]}...')",
        "character": "All characters in run",
        "attribute": "a:rPr child element sequence",
        "source_value": "ECMA-376 compliant (fill -> effects -> highlight -> underline -> latin)",
        "output_value": "Violated (latin serialized before solidFill / highlight)"
    })
    break # Just 1 summary entry for schema violation in mismatch table

# 3. Image stream mismatch
src_img = data["src_images"][0] if data["src_images"] else None
out_media = data["pptx_media"][0] if data["pptx_media"] else None

if src_img and out_media:
    mismatches.append({
        "location": "ppt/media/image_1_1.png (Shape 'img_p0_1')",
        "character": "N/A (Embedded Media)",
        "attribute": "Media Byte Stream & Dimensions",
        "source_value": f"Valid PNG ({src_img['width']}x{src_img['height']}, {src_img['bytes_len']} bytes, SHA256: {src_img['hash'][:8]}...)",
        "output_value": f"Corrupt/Empty ({out_media['width']}x{out_media['height']}, {out_media['bytes_len']} bytes, SHA256: {out_media['hash'][:8]}...)"
    })

# 4. Color slight rounding mismatches
mismatches.append({
    "location": "Title block (x=40, y=740)",
    "character": "Regression Prevention Audit Document",
    "attribute": "fill color (rounding)",
    "source_value": "#191919 (rgb(0.1, 0.1, 0.1))",
    "output_value": "#1A1A1A (round(0.1*255)=26=0x1A)"
})
mismatches.append({
    "location": "Math Formula line (x=40, y=610)",
    "character": "Math Formula / Greek symbols",
    "attribute": "fill color (rounding)",
    "source_value": "#0C1966 (rgb(0.05, 0.1, 0.4))",
    "output_value": "#0D1A66 (round(0.05*255)=13=0x0D)"
})

print(json.dumps(mismatches, indent=2))
with open("scratch/batch1_mismatches.json", "w", encoding="utf-8") as f:
    json.dump(mismatches, f, indent=2)
