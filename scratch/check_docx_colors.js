const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function checkDocx() {
  const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
  const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');

  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;

  const pdfBytes = fs.readFileSync('scratch/batch4_color_test_input.pdf');
  const fileObj = { name: 'batch4_color_test_input.pdf', size: pdfBytes.length, arrayBuffer: async () => pdfBytes.buffer };

  const docxRes = await engine.pdfToWord(fileObj, { mode: 'fidelity' });
  const docxBuf = await docxRes.blob.arrayBuffer();
  fs.writeFileSync('scratch/batch4_output.docx', Buffer.from(docxBuf));

  const zip = await JSZip.loadAsync(docxBuf);
  const docXml = await zip.file('word/document.xml').async('text');

  // Count chars by color
  const runRegex = /<w:r(?: [^>]*)?>([\s\S]*?)<\/w:r>/g;
  let m;
  const counts = {};
  let total = 0;
  while ((m = runRegex.exec(docXml)) !== null) {
    const rContent = m[1];
    const tMatch = /<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/.exec(rContent);
    const text = tMatch ? tMatch[1] : '';
    const colorMatch = /<w:color w:val="([A-Fa-f0-9]{6})"\/>/.exec(rContent);
    const color = colorMatch ? '#' + colorMatch[1].toUpperCase() : '#000000';
    counts[color] = (counts[color] || 0) + text.length;
    total += text.length;
  }
  console.log('DOCX Counts by Color:', counts);
  console.log('DOCX Total:', total);
}
checkDocx();
