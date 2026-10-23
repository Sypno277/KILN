const fs = require('fs');
const path = require('path');
const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const { pathToFileURL } = require('url');

async function testBatch3() {
  console.log('=== BATCH 3: Equation Image Preservation Test ===');
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;

  const pdfBytes = fs.readFileSync('scratch/batch3_equation_test_input.pdf');
  const fileObj = {
    name: 'batch3_equation_test_input.pdf',
    size: pdfBytes.length,
    arrayBuffer: async () => pdfBytes.buffer
  };

  // Convert to PPTX
  const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity' });
  const pptxBuf = await pptxRes.blob.arrayBuffer();
  fs.writeFileSync('scratch/batch3_output.pptx', Buffer.from(pptxBuf));

  // Convert to DOCX
  const docxRes = await engine.pdfToWord(fileObj, { mode: 'fidelity' });
  const docxBuf = await docxRes.blob.arrayBuffer();
  fs.writeFileSync('scratch/batch3_output.docx', Buffer.from(docxBuf));

  console.log('Outputs written to scratch/batch3_output.pptx and scratch/batch3_output.docx');
}

testBatch3().catch(console.error);
