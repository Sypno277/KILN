const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const fs = require('fs');

async function test() {
  const bytes = fs.readFileSync('scratch/week1_solutions.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await doc.getPage(1);
  const opList = await page.getOperatorList();
  
  console.log('Total operators on page 1:', opList.fnArray.length);
  const fnCounts = {};
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    fnCounts[fn] = (fnCounts[fn] || 0) + 1;
  }
  
  for (const [name, code] of Object.entries(pdfjs.OPS)) {
    if (fnCounts[code]) {
      console.log('OPS.' + name + ' (' + code + '): count = ' + fnCounts[code]);
    }
  }

  // Print args of setFillRGBColor and showText
  console.log('\n--- First 30 operators with args ---');
  for (let i = 0; i < Math.min(100, opList.fnArray.length); i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    let opName = Object.keys(pdfjs.OPS).find(k => pdfjs.OPS[k] === fn) || fn;
    if (['setFillRGBColor', 'setStrokeRGBColor', 'showText', 'showSpacedText', 'constructPath', 'fill', 'save', 'restore'].includes(opName)) {
      console.log(`[${i}] ${opName}:`, JSON.stringify(args).slice(0, 100));
    }
  }
}
test();
