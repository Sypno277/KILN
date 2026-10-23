// scratch/run_batch4_conversion.js
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  console.log('=== BATCH 4: Running DOCX Schema & Word-Safe Conversion ===\n');

  const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
  const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');

  const enginePath = path.resolve(__dirname, '../public/assets/converter-engine.js');
  const mod = await import(pathToFileURL(enginePath).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;

  // 1. Choose input PDF with known source dimensions, text bounds, and equation image
  const inputPdfPath = path.resolve(__dirname, 'batch3_equation_test_input.pdf');
  if (!fs.existsSync(inputPdfPath)) {
    throw new Error(`Test PDF fixture not found at ${inputPdfPath}`);
  }
  const pdfBytes = fs.readFileSync(inputPdfPath);
  const pdfFile = {
    name: 'batch4_test_document.pdf',
    size: pdfBytes.length,
    arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
  };

  // Extract source page content to verify source dimensions & margins
  const extractedPages = await engine.extractPdfPagesContent(pdfFile);
  const p1 = extractedPages[0];
  console.log('Source Page Details:');
  console.log(`  Dimensions: ${p1.width.toFixed(2)} x ${p1.height.toFixed(2)} pt`);
  console.log(`  Left-most text x0: ${p1.margins.left.toFixed(2)} pt`);
  console.log(`  Right margin derived: ${p1.margins.right.toFixed(2)} pt`);
  console.log(`  Top margin derived: ${p1.margins.top.toFixed(2)} pt`);
  console.log(`  Bottom margin derived: ${p1.margins.bottom.toFixed(2)} pt`);

  // 2. Perform PDF to Word conversion (using fidelity mode)
  console.log('\nRunning engine.pdfToWord()...');
  const result = await engine.pdfToWord(pdfFile, { mode: 'fidelity' });
  const docxBuf = Buffer.from(await result.blob.arrayBuffer());
  const outDocxPath = path.resolve(__dirname, 'batch4_output.docx');
  fs.writeFileSync(outDocxPath, docxBuf);
  console.log(`Saved DOCX output to ${outDocxPath} (${docxBuf.length} bytes)`);

  // 3. Negative Testing: Assert package validation FAILS loudly on schema violations
  console.log('\n--- Negative Test: Assert Fail Loudly on Schema Errors ---');
  
  // Test A: Package with illegal Default Extension="xml"
  try {
    const badZipA = await JSZip.loadAsync(docxBuf);
    let ct = await badZipA.file('[Content_Types].xml').async('text');
    ct = ct.replace('</Types>', '<Default Extension="xml" ContentType="application/xml"/></Types>');
    badZipA.file('[Content_Types].xml', ct);
    await engine.validateOpenXmlPackage(badZipA, 'docx');
    throw new Error('FAIL: Expected schema error for Default Extension="xml" was not thrown!');
  } catch (err) {
    if (err.message.includes('must not declare Default Extension="xml"')) {
      console.log('  ✓ [PASS] Caught illegal Default Extension="xml":', err.message);
    } else {
      throw err;
    }
  }

  // Test B: Package missing required Override for /word/document.xml
  try {
    const badZipB = await JSZip.loadAsync(docxBuf);
    let ct = await badZipB.file('[Content_Types].xml').async('text');
    ct = ct.replace(/<Override[^>]*PartName="\/word\/document\.xml"[^>]*\/>/, '');
    badZipB.file('[Content_Types].xml', ct);
    await engine.validateOpenXmlPackage(badZipB, 'docx');
    throw new Error('FAIL: Expected schema error for missing /word/document.xml Override was not thrown!');
  } catch (err) {
    if (err.message.includes('missing required Override for /word/document.xml') || err.message.includes('no matching Override for \'/word/document.xml\'')) {
      console.log('  ✓ [PASS] Caught missing /word/document.xml Override:', err.message);
    } else {
      throw err;
    }
  }

  // Test C: Package with missing header/footer/gutter in <w:pgMar>
  try {
    const badZipC = await JSZip.loadAsync(docxBuf);
    let docXml = await badZipC.file('word/document.xml').async('text');
    // Remove w:header attribute
    docXml = docXml.replace(/w:header="[^"]*"/, '');
    badZipC.file('word/document.xml', docXml);
    await engine.validateOpenXmlPackage(badZipC, 'docx');
    throw new Error('FAIL: Expected schema error for missing <w:pgMar> attributes was not thrown!');
  } catch (err) {
    if (err.message.includes('<w:pgMar> is missing required attributes')) {
      console.log('  ✓ [PASS] Caught missing <w:pgMar> required attributes:', err.message);
    } else {
      throw err;
    }
  }

  console.log('\nAll conversion and negative validation tests passed in Node.js.');
}

main().catch(err => {
  console.error('Fatal error in BATCH 4 conversion runner:', err);
  process.exit(1);
});
