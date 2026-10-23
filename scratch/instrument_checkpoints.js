const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function instrument() {
  const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
  const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');

  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;

  const pdfPath = 'scratch/batch4_color_test_input.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const fileObj = { name: 'batch4_color_test_input.pdf', size: pdfBytes.length, arrayBuffer: async () => pdfBytes.buffer };

  // Run conversion to PPTX and DOCX
  const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity' });
  const pptxBuf = Buffer.from(await pptxRes.blob.arrayBuffer());
  fs.writeFileSync('scratch/batch4_after_output.pptx', pptxBuf);

  const docxRes = await engine.pdfToWord(fileObj, { mode: 'fidelity' });
  const docxBuf = Buffer.from(await docxRes.blob.arrayBuffer());
  fs.writeFileSync('scratch/batch4_output.docx', docxBuf);

  console.log('Successfully wrote batch4_after_output.pptx (' + pptxBuf.length + ' bytes) and batch4_output.docx (' + docxBuf.length + ' bytes)');
}

instrument();
