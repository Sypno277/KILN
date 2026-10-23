import fitz
import glob
import json

for p in glob.glob("**/*.pdf", recursive=True):
    try:
        doc = fitz.open(p)
        pages = len(doc)
        total_red = 0
        total_chars = 0
        for page in doc:
            data = json.loads(page.get_text("rawjson"))
            for b in data.get("blocks", []):
                for l in b.get("lines", []):
                    for s in l.get("spans", []):
                        txt = s.get("text", "")
                        total_chars += len(txt)
                        c = s.get("color", 0)
                        r = (c >> 16) & 255
                        g = (c >> 8) & 255
                        b_col = c & 255
                        if r > 180 and g < 80 and b_col < 80:
                            total_red += len(txt)
        if total_red > 0 or pages > 1:
            print(f"{p}: {pages} pages, {total_red} red chars, {total_chars} total chars")
    except Exception as e:
        pass
