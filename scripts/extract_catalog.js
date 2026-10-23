const fs = require('fs');

function parseFormatsHtml(html) {
  // Find all category sections
  // Format: <section class="cat-section" id="<cat-id>" style="--cat:<color>" ...>
  // <header class="cat-head">... <h2><name></h2><p class="cat-count"><count> formats</p>
  // <p class="cat-intro"><intro></p>
  // <table> ... <tbody> <tr> <td class="route-from">... <td class="route-to">... <td class="route-engine">...
  const sections = [];
  const secRegex = /<section\s+class="cat-section"\s+id="([^"]+)"\s+style="--cat:([^"]+)"[^>]*>([\s\S]*?)<\/section>/g;
  let match;
  while ((match = secRegex.exec(html)) !== null) {
    const id = match[1];
    const color = match[2];
    const body = match[3];

    const nameMatch = body.match(/<h2>([^<]+)<\/h2>/);
    const name = nameMatch ? nameMatch[1].trim() : id;

    const countMatch = body.match(/<p class="cat-count">([^<]+)<\/p>/);
    const count = countMatch ? countMatch[1].trim() : '';

    const introMatch = body.match(/<p class="cat-intro">([\s\S]*?)<\/p>/);
    const intro = introMatch ? introMatch[1].trim() : '';

    const iconMatch = body.match(/<svg class="cat-icon"[^>]*>([\s\S]*?)<\/svg>/);
    const iconSvg = iconMatch ? iconMatch[1].trim() : '';

    // Parse table rows
    const rows = [];
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
    let rMatch;
    // skip thead row
    const tbodyMatch = body.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (tbodyMatch) {
      const tBody = tbodyMatch[1];
      while ((rMatch = rowRegex.exec(tBody)) !== null) {
        const rowContent = rMatch[1];
        // td class="route-from"
        const fromMatch = rowContent.match(/<td[^>]*class="route-from"[^>]*>([\s\S]*?)<\/td>/);
        const toMatch = rowContent.match(/<td[^>]*class="route-to"[^>]*>([\s\S]*?)<\/td>/);
        const engineMatch = rowContent.match(/<td[^>]*class="route-engine"[^>]*>([\s\S]*?)<\/td>/);

        // Parse from formats
        const fromFmts = [];
        if (fromMatch) {
          const fmtRegex = /<span\s+class="fmt"(?:\s+title="([^"]*)")?>([^<]+)<\/span>/g;
          let f;
          while ((f = fmtRegex.exec(fromMatch[1])) !== null) {
            fromFmts.push({ title: f[1] || '', name: f[2].trim() });
          }
        }

        // Parse to formats
        const toFmts = [];
        if (toMatch) {
          // Can be <a class="fmt fmt-link" href="...">NAME</a> or <span class="fmt" ...>NAME</span> or <span class="route-note">NOTE</span>
          const toItemRegex = /<(a|span)\s+class="fmt([^"]*)"(?:\s+href="([^"]*)")?(?:\s+title="([^"]*)")?>([^<]+)<\/\1>/g;
          let t;
          while ((t = toItemRegex.exec(toMatch[1])) !== null) {
            toFmts.push({
              tag: t[1],
              isLink: t[2].includes('fmt-link'),
              href: t[3] || null,
              title: t[4] || '',
              name: t[5].trim()
            });
          }
          const noteMatch = toMatch[1].match(/<span class="route-note">([^<]+)<\/span>/);
          const note = noteMatch ? noteMatch[1].trim() : null;
          if (note) toFmts.push({ isNote: true, text: note });
        }

        // Parse engine
        const engineTags = [];
        if (engineMatch) {
          const tagRegex = /<span\s+class="tag\s+([^"]+)"(?:\s+title="([^"]*)")?>([^<]+)<\/span>/g;
          let eg;
          while ((eg = tagRegex.exec(engineMatch[1])) !== null) {
            engineTags.push({ class: eg[1].trim(), title: eg[2] || '', text: eg[3].trim() });
          }
        }

        rows.push({ from: fromFmts, to: toFmts, engines: engineTags });
      }
    }

    sections.push({ id, color, name, count, intro, iconSvg, rows });
  }
  return sections;
}

const enHtml = fs.readFileSync('recon/formats-en.html', 'utf8');
const koHtml = fs.readFileSync('recon/formats-ko.html', 'utf8');
const zhHtml = fs.readFileSync('recon/formats-zh.html', 'utf8');

const enCatalog = parseFormatsHtml(enHtml);
const koCatalog = parseFormatsHtml(koHtml);
const zhCatalog = parseFormatsHtml(zhHtml);

console.log('Categories count:', enCatalog.length);
enCatalog.forEach(c => {
  const allFmts = new Set();
  c.rows.forEach(r => r.from.forEach(f => allFmts.add(f.name)));
  console.log(`- ${c.id}: ${c.name} (${c.count}), rows: ${c.rows.length}, distinct from: ${allFmts.size}`);
});

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/catalog-en.json', JSON.stringify(enCatalog, null, 2));
fs.writeFileSync('src/data/catalog-ko.json', JSON.stringify(koCatalog, null, 2));
fs.writeFileSync('src/data/catalog-zh.json', JSON.stringify(zhCatalog, null, 2));
console.log('Catalog data saved to src/data/catalog-{en,ko,zh}.json');
