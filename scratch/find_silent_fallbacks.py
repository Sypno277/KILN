import re

with open("public/assets/converter-engine.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

fallbacks = []

# Scan for try/catch patterns and default substitutions
for idx, line in enumerate(lines, 1):
    # catch blocks
    if re.search(r'catch\s*\([^)]*\)\s*\{', line):
        # look ahead 5 lines
        snippet = "".join(lines[idx-1:min(len(lines), idx+5)])
        fallbacks.append({
            "line": idx,
            "type": "try/catch fallback",
            "snippet": snippet.strip().replace("\n", " ")
        })
    # silent default assignments like || 'Calibri', || '#000000', || 12, etc.
    if re.search(r'\|\|\s*[\'\"](Calibri|Arial|Times|#?000000|000000)[\'\"]', line):
        fallbacks.append({
            "line": idx,
            "type": "Default string fallback",
            "snippet": line.strip()
        })

print(f"Total fallbacks found: {len(fallbacks)}")
for fb in fallbacks:
    print(f"Line {fb['line']} [{fb['type']}]: {fb['snippet'][:120]}")
