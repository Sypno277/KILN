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

// Create a realistic document PDF with:
// 1. Heading
// 2. A real multi-line paragraph where lines have normal leading (14 pt gap)
// 3. Jittered line fragments (different spans on the same line with y=620.2 vs y=619.5)
// 4. Bullet points
async function createParagraphTestPdf() {
  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  const page = doc.addPage([612, 792]); // Letter portrait

  // 1. Heading
  page.drawText('Document Transfer & Layout Fidelity Test', {
    x: 40,
    y: 740,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.5)
  });

  // 2. Multi-line paragraph with normal realistic line pitch (15 pt spacing)
  const paragraphLines = [
    'Offline client-side file transformation requires precise coordinate mapping to ensure that content',
    'does not overlap or drift across different document formats. In traditional converters, line heights',
    'and shape margins often cause sequential lines of text to collide with adjacent shapes.',
    'By calculating exact line pitch and applying zero internal shape margins, text flows naturally.'
  ];

  let curY = 700;
  for (const l of paragraphLines) {
    page.drawText(l, {
      x: 40,
      y: curY,
      size: 11,
      font: fontReg,
      color: rgb(0.2, 0.2, 0.2)
    });
    curY -= 15; // 15 pt line pitch for 11 pt text
  }

  // 3. Same-line span jitter test (two spans on the exact same line with 1 pt vertical difference)
  // Span A: "Notice: " at x=40, y=620.5
  page.drawText('Important Notice:', {
    x: 40,
    y: 620.5,
    size: 11,
    font: fontBold,
    color: rgb(0.8, 0.1, 0.1)
  });
  // Span B: "This item must be on the same horizontal line" at x=145, y=619.8
  page.drawText('All parameters have been verified for zero overlap.', {
    x: 145,
    y: 619.8,
    size: 11,
    font: fontReg,
    color: rgb(0.2, 0.2, 0.2)
  });

  const pdfBytes = await doc.save();
  const pdfPath = path.resolve('scratch/test_overlap_input.pdf');
  fs.writeFileSync(pdfPath, pdfBytes);
  return { pdfPath, pdfBytes };
}

async function runTest() {
  console.log('--- Creating realistic multi-line paragraph test PDF ---');
  const { pdfBytes } = await createParagraphTestPdf();
  const engine = await setupEngine();

  const fileObj = {
    name: 'test_overlap_input.pdf',
    size: pdfBytes.length,
    arrayBuffer: async () => pdfBytes.buffer
  };

  console.log('--- Testing PDF text extraction ---');
  const pages = await engine.extractPdfPagesContent(fileObj);
  console.log('Extracted lines count:', pages[0].lines.length);
  for (let i = 0; i < pages[0].lines.length; i++) {
    const l = pages[0].lines[i];
    console.log(`  Line ${i}: topY=${l.topY.toFixed(1)}, leftX=${l.leftX.toFixed(1)}, h=${l.fontSize}, text="${l.text.slice(0, 45)}..."`);
  }

  // Check if Span A and Span B were merged into ONE line or split into two overlapping lines:
  const spanALine = pages[0].lines.find(l => l.text.includes('Important Notice'));
  console.log('\nJitter check: "Important Notice" line text:', JSON.stringify(spanALine?.text));
  const spansMergedOnSameLine = spanALine && spanALine.text.includes('Important Notice') && spanALine.text.includes('All parameters');
  console.log('Are same-line spans properly unified (not split)?', spansMergedOnSameLine ? 'YES' : 'NO');

  console.log('\n--- Converting to PPTX ---');
  const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity' });
  const pptxBuf = await pptxRes.blob.arrayBuffer();
  const pptxZip = await JSZip.loadAsync(pptxBuf);
  const slide1Xml = await pptxZip.file('ppt/slides/slide1.xml').async('text');

  // Inspect shape bounding boxes in PPTX
  const shapeMatches = [...slide1Xml.matchAll(/<p:sp>[\s\S]*?<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>[\s\S]*?<a:t>([\s\S]*?)<\/a:t>[\s\S]*?<\/p:sp>/g)];
  console.log('PPTX total shapes:', shapeMatches.length);

  let overlapCount = 0;
  for (let i = 0; i < shapeMatches.length - 1; i++) {
    const s1 = {
      y: parseInt(shapeMatches[i][2], 10) / 12700,
      h: parseInt(shapeMatches[i][4], 10) / 12700,
      t: shapeMatches[i][5]
    };
    const s2 = {
      y: parseInt(shapeMatches[i + 1][2], 10) / 12700,
      h: parseInt(shapeMatches[i + 1][4], 10) / 12700,
      t: shapeMatches[i + 1][5]
    };
    if (s1.y + s1.h > s2.y) {
      console.log(`  ⚠️ OVERLAP DETECTED between Shape ${i} and Shape ${i+1}:`);
      console.log(`     Shape ${i}: y=${s1.y.toFixed(1)}, h=${s1.h.toFixed(1)}, bottom=${(s1.y + s1.h).toFixed(1)} ("${s1.t.slice(0, 30)}")`);
      console.log(`     Shape ${i+1}: y=${s2.y.toFixed(1)}, h=${s2.h.toFixed(1)} ("${s2.t.slice(0, 30)}")`);
      overlapCount++;
    }
  }
  console.log('Total bounding box overlaps in PPTX:', overlapCount);

  // Check bodyPr attributes
  const hasZeroMargins = slide1Xml.includes('lIns="0"') && slide1Xml.includes('tIns="0"');
  console.log('Has zero shape margins (lIns="0" tIns="0"):', hasZeroMargins ? 'YES' : 'NO');
}

runTest().catch(console.error);
