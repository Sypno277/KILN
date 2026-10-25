const path = require('path');
const { pathToFileURL } = require('url');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const fs = require('fs');

async function test() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  
  const bytes = fs.readFileSync('scratch/week1_solutions.pdf');
  const file = {
    name: 'week1_solutions.pdf',
    size: bytes.length,
    slice: (s, e) => ({ arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset + s, bytes.byteOffset + e) }),
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  };
  
  const pages = await engine.extractPdfPagesContent(file);
  console.log('Extracted pages:', pages.length);
  for (let p = 0; p < pages.length; p++) {
    const page = pages[p];
    const lines = page.lines || [];
    console.log('Page ' + (p+1) + ': ' + lines.length + ' lines');
    let redCount = 0;
    let blackCount = 0;
    let unsetCount = 0;
    let otherCount = 0;
    for (const l of lines) {
      for (const r of (l.runs || [])) {
        const c = r.colorHex || r.color_hex;
        if (c === 'FF0000' || c === '#FF0000') redCount += (r.text || '').length;
        else if (c === '000000' || c === '#000000') blackCount += (r.text || '').length;
        else if (c === 'unset') unsetCount += (r.text || '').length;
        else otherCount += (r.text || '').length;
      }
    }
    console.log('  Page ' + (p+1) + ' runs: red=' + redCount + ', black=' + blackCount + ', unset=' + unsetCount + ', other=' + otherCount);
    
    // Sample lines with red text or first 10 lines
    for (let li = 0; li < Math.min(15, lines.length); li++) {
      const l = lines[li];
      console.log('    Line ' + (li+1) + ': "' + l.text.slice(0, 50) + '" runs=' + l.runs.map(r => r.colorHex + ':"' + r.text.slice(0, 20) + '"').join(', '));
    }
  }
}
test();
