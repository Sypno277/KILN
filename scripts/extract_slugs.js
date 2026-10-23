const fs = require('fs');

const sitemap = fs.readFileSync('C:\\Users\\priti\\.gemini\\antigravity-ide\\brain\\076833e0-f581-4815-9d83-dc2e0d166e34\\.system_generated\\steps\\63\\content.md', 'utf8');
const convertUrls = [...sitemap.matchAll(/<loc>https:\/\/filee\.sh\/convert\/([^<]+)\/<\/loc>/g)].map(m => m[1]);
console.log('Total unique convert slugs:', convertUrls.length);
console.log('Slugs:', convertUrls);
fs.writeFileSync('recon/convert-slugs.json', JSON.stringify(convertUrls, null, 2));
