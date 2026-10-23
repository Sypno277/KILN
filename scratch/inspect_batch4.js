const fs = require('fs');
const path = require('path');
const pdfjs = require(path.resolve('public/assets/libs/pdf.min.js'));
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');

async function inspectPdf() {
  const data = new Uint8Array(fs.readFileSync('scratch/quarterly_sample.pdf'));
  const doc = await pdfjs.getDocument({ data }).promise;
  console.log('PDF Page count:', doc.numPages);
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1.0 });
    console.log(`Page ${i}: width=${vp.width}, height=${vp.height}`);
    const content = await page.getTextContent();
    for (const item of content.items) {
      console.log(`  [x=${item.transform[4].toFixed(1)}, y=${item.transform[5].toFixed(1)}] sz=${item.height || item.transform[0]} str="${item.str}"`);
    }
  }
}

inspectPdf().catch(console.error);
