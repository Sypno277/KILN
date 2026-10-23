const fs = require('fs');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

async function test() {
  const bytes = fs.readFileSync('scratch/batch4_color_test_input.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  let totalOpChars = 0;
  let totalTcChars = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const opList = await page.getOperatorList();
    const tc = await page.getTextContent();
    let opChars = 0;
    for (let i = 0; i < opList.fnArray.length; i++) {
      if (opList.fnArray[i] === pdfjs.OPS.showText || opList.fnArray[i] === pdfjs.OPS.showSpacedText) {
        const glyphs = opList.argsArray[i][0];
        let str = '';
        if (Array.isArray(glyphs)) {
          for (const g of glyphs) {
            if (typeof g === 'object' && g && g.unicode) str += g.unicode;
            else if (typeof g === 'string') str += g;
          }
        }
        opChars += str.length;
        console.log(`Page ${p} op len ${str.length}: "${str}"`);
      }
    }
    const tcChars = tc.items.map(it => it.str).join('').length;
    console.log(`Page ${p}: opChars=${opChars}, tcChars=${tcChars}`);
    totalOpChars += opChars;
    totalTcChars += tcChars;
  }
  console.log(`TOTAL: opChars=${totalOpChars}, tcChars=${totalTcChars}`);
}
test();
