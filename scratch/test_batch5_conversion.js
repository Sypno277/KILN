const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const XLSX = require(path.resolve('public/assets/libs/xlsx.full.min.js'));

async function setupEngine() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;
  engine.getXLSX = () => XLSX;
  return engine;
}

async function main() {
  const engine = await setupEngine();
  const pdfBytes = fs.readFileSync('scratch/test_style_input.pdf');
  const fileObj = {
    name: 'test_style_input.pdf',
    type: 'application/pdf',
    arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength),
    text: async () => pdfBytes.toString('utf-8')
  };

  console.log('--- Converting test_style_input.pdf to DOCX ---');
  const docxRes = await engine.pdfToWord(fileObj, { mode: 'fidelity' });
  const docxBuf = Buffer.from(await docxRes.blob.arrayBuffer());
  fs.writeFileSync('scratch/batch5_output.docx', docxBuf);
  console.log('DOCX written to scratch/batch5_output.docx (Size:', docxBuf.length, 'bytes)');

  console.log('--- Converting test_style_input.pdf to PPTX ---');
  const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity' });
  const pptxBuf = Buffer.from(await pptxRes.blob.arrayBuffer());
  fs.writeFileSync('scratch/batch5_output.pptx', pptxBuf);
  console.log('PPTX written to scratch/batch5_output.pptx (Size:', pptxBuf.length, 'bytes)');
}

main().catch(err => {
  console.error('Conversion failed:', err);
  process.exit(1);
});
