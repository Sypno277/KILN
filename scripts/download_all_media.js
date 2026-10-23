const fs = require('fs');
const path = require('path');

const files = [
  'favicon.svg',
  'favicon-32.png',
  'apple-touch-icon.png',
  'site.webmanifest',
  'media/og-en.jpg',
  'media/poster-en.jpg',
  'media/poster-ko.jpg',
  'media/poster-zh-CN.jpg',
  'media/promo-en.mp4',
  'media/promo-ko.mp4',
  'media/promo-zh-CN.mp4',
  'media/screens/page-toolbar-en.webp',
  'media/screens/page-home-en.webp',
  'media/screens/page-presets-en.webp',
  'media/screens/page-toolbar-dark.webp',
  'media/badges/alternativeto-dark.svg',
  'media/badges/alternativeto-light.svg'
];

async function run() {
  for (const file of files) {
    const dest = path.join('public', file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const url = `https://filee.sh/${file}`;
    console.log(`Downloading ${url} -> ${dest}`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Failed ${url}: status ${res.status}`);
        continue;
      }
      const buf = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(buf));
      console.log(`Saved ${dest} (${buf.byteLength} bytes)`);
    } catch (e) {
      console.error(`Error downloading ${url}:`, e.message);
    }
  }
}

run();
