const crypto = require('crypto');
const fs = require('fs');

function prepareArtifact(path) {
  const buf = fs.readFileSync(path);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  return {
    bytes: buf.length,
    media_type: 'image/png',
    sha256: sha256,
    data_base64: buf.toString('base64')
  };
}

const pairs = [
  { name: '375-dark', orig: 'recon/screenshots/orig-375-dark.png', clone: 'recon/screenshots/clone-375-dark.png' },
  { name: '375-light', orig: 'recon/screenshots/orig-375-light.png', clone: 'recon/screenshots/clone-375-light.png' },
  { name: '768-light', orig: 'recon/screenshots/orig-768-light.png', clone: 'recon/screenshots/clone-768-light.png' },
  { name: '768-dark', orig: 'recon/screenshots/orig-768-dark.png', clone: 'recon/screenshots/clone-768-dark.png' },
  { name: '1440-light', orig: 'recon/screenshots/orig-1440-light.png', clone: 'recon/screenshots/clone-1440-light.png' },
  { name: '1440-dark', orig: 'recon/screenshots/orig-1440-dark.png', clone: 'recon/screenshots/clone-1440-dark.png' },
];

for (const p of pairs) {
  const o = prepareArtifact(p.orig);
  const c = prepareArtifact(p.clone);
  console.log(`Pair ${p.name}:`);
  console.log(`  Orig: bytes=${o.bytes}, sha256=${o.sha256.slice(0, 16)}...`);
  console.log(`  Clone: bytes=${c.bytes}, sha256=${c.sha256.slice(0, 16)}...`);
  console.log(`  Size difference: ${Math.abs(o.bytes - c.bytes)} bytes (${((Math.abs(o.bytes - c.bytes) / o.bytes) * 100).toFixed(2)}%)`);
}

// Write the first pair into a JSON payload for REA
fs.writeFileSync('recon/screenshots/rea-diff-375-dark.json', JSON.stringify({
  before: prepareArtifact(pairs[0].orig),
  after: prepareArtifact(pairs[0].clone),
  channel_threshold: 4
}));
console.log('Saved recon/screenshots/rea-diff-375-dark.json');
