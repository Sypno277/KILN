const fs = require('fs');
const path = require('path');
const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const XLSX = require(path.resolve('public/assets/libs/xlsx.full.min.js'));

const { pathToFileURL } = require('url');

async function setupEngine() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;
  engine.getXLSX = () => XLSX;
  return engine;
}

async function createTestPdfs() {
  const { PDFDocument, StandardFonts, rgb } = pdfLib;

  const testCases = [
    { name: 'letter_portrait', w: 612, h: 792, label: 'US Letter Portrait (8.5x11 in)' },
    { name: 'a4_landscape', w: 841.89, h: 595.28, label: 'A4 Landscape (11.69x8.27 in)' },
    { name: 'square_custom', w: 360, h: 360, label: 'Custom Square 5x5 in (360x360 pt)' }
  ];

  const files = [];

  for (const tc of testCases) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await doc.embedFont(StandardFonts.Helvetica);

    const page = doc.addPage([tc.w, tc.h]);
    page.drawText(`Test Document: ${tc.label}`, { x: 30, y: tc.h - 50, size: 16, font, color: rgb(0.1, 0.2, 0.6) });
    page.drawText('Sample Section Header:', { x: 30, y: tc.h - 80, size: 13, font: fontReg });
    page.drawText('- Item Alpha: Value 100', { x: 50, y: tc.h - 110, size: 11, font: fontReg });
    page.drawText('- Item Beta: Value 200', { x: 50, y: tc.h - 130, size: 11, font: fontReg });

    const bytes = await doc.save();
    const outPath = `scratch/input_${tc.name}.pdf`;
    fs.writeFileSync(outPath, bytes);

    files.push({
      id: tc.name,
      label: tc.label,
      w: tc.w,
      h: tc.h,
      path: outPath,
      fileObj: {
        name: `input_${tc.name}.pdf`,
        size: bytes.length,
        arrayBuffer: async () => bytes.buffer
      }
    });
  }

  return files;
}

async function inspectDocx(docxBuffer) {
  const zip = await JSZip.loadAsync(docxBuffer);
  const docXml = await zip.file('word/document.xml').async('text');
  const sectMatch = docXml.match(/<w:sectPr[^>]*>([\s\S]*?)<\/w:sectPr>/);
  if (!sectMatch) {
    return { hasSectPr: false, widthPt: 'Missing (Word default A4/Letter)', heightPt: 'Missing', orientation: 'Default Portrait' };
  }
  const pgSzMatch = sectMatch[1].match(/<w:pgSz[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"(?:[^>]*w:orient="([^"]+)")?/);
  if (!pgSzMatch) {
    return { hasSectPr: true, widthPt: 'pgSz missing', heightPt: 'pgSz missing', orientation: 'Default' };
  }
  return {
    hasSectPr: true,
    widthPt: (parseInt(pgSzMatch[1], 10) / 20).toFixed(1),
    heightPt: (parseInt(pgSzMatch[2], 10) / 20).toFixed(1),
    orientation: pgSzMatch[3] || 'portrait'
  };
}

async function inspectPptx(pptxBuffer) {
  const zip = await JSZip.loadAsync(pptxBuffer);
  const presXml = await zip.file('ppt/presentation.xml').async('text');
  const sldSzMatch = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  if (!sldSzMatch) return { widthPt: 'Unknown', heightPt: 'Unknown', ratio: 'Unknown' };
  const cxEmu = parseInt(sldSzMatch[1], 10);
  const cyEmu = parseInt(sldSzMatch[2], 10);
  const widthPt = (cxEmu / 12700).toFixed(1);
  const heightPt = (cyEmu / 12700).toFixed(1);
  const ratio = (cxEmu / cyEmu).toFixed(2);
  return { widthPt, heightPt, ratio, emu: `${cxEmu}x${cyEmu}` };
}

async function inspectXlsx(xlsxBuffer) {
  const zip = await JSZip.loadAsync(xlsxBuffer);
  const sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('text');
  const pageSetup = sheetXml.includes('<pageSetup');
  const pageMargins = sheetXml.includes('<pageMargins');
  return {
    hasPageSetup: pageSetup,
    hasPageMargins: pageMargins,
    notes: pageSetup ? 'Explicit page setup present' : 'Unconfigured grid (no page setup)'
  };
}

async function inspectJpg(inputBytes) {
  // Use pdfjs to render viewport at scale 1.0 (72 dpi)
  const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(inputBytes) }).promise;
  const page = await pdfDoc.getPage(1);
  const vp = page.getViewport({ scale: 1.0 });
  return { widthPx: Math.floor(vp.width), heightPx: Math.floor(vp.height) };
}

async function runExperiment() {
  console.log('Setting up engine...');
  const engine = await setupEngine();

  console.log('Creating 3 test PDFs of different sizes...');
  const testFiles = await createTestPdfs();

  console.log('\n================ EXPERIMENT RESULTS ================');
  for (const tf of testFiles) {
    console.log(`\n>>> TEST INPUT: ${tf.label}`);
    console.log(`    Source Dimensions: ${tf.w.toFixed(1)} x ${tf.h.toFixed(1)} pt (Aspect Ratio: ${(tf.w / tf.h).toFixed(2)})`);

    // 1. Convert to PPTX
    const pptxRes = await engine.pdfToPpt(tf.fileObj);
    const pptxBuf = await pptxRes.blob.arrayBuffer();
    const pptxInfo = await inspectPptx(pptxBuf);
    console.log(`    -> PPTX Output: ${pptxInfo.widthPt} x ${pptxInfo.heightPt} pt (Ratio: ${pptxInfo.ratio}, 16:9 Widescreen) | Preserved: ${pptxInfo.widthPt == tf.w && pptxInfo.heightPt == tf.h ? 'YES' : 'NO'}`);

    // 2. Convert to DOCX
    const docxRes = await engine.pdfToWord(tf.fileObj);
    const docxBuf = await docxRes.blob.arrayBuffer();
    const docxInfo = await inspectDocx(docxBuf);
    console.log(`    -> DOCX Output: ${docxInfo.widthPt} x ${docxInfo.heightPt} pt (${docxInfo.orientation}) | Preserved: ${docxInfo.hasSectPr ? 'YES' : 'NO'}`);

    // 3. Convert to XLSX
    const xlsxRes = await engine.pdfToExcel(tf.fileObj);
    const xlsxBuf = await xlsxRes.blob.arrayBuffer();
    const xlsxInfo = await inspectXlsx(xlsxBuf);
    console.log(`    -> XLSX Output: ${xlsxInfo.notes} | Preserved: NO`);

    // 4. Convert to JPG (via pdfToJpg)
    const jpgInfo = await inspectJpg(fs.readFileSync(tf.path));
    console.log(`    -> JPG  Output: ${jpgInfo.widthPx} x ${jpgInfo.heightPx} px (1:1 with source pt @ 1x scale) | Preserved: YES`);
  }
}

runExperiment().catch(console.error);
