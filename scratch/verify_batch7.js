const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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

// Batch 1 original Ground Truth specification
const originalBatch1Runs = [
  { id: 1, text: 'Typography Test Document', chars: 24, font: 'Arial', size: 24, bold: true, italic: false, underline: false, strike: false, color: '#2463EB', baseline: 0, highlight: null },
  { id: 2, text: 'Section Subtitle in Times Roman Serif', chars: 37, font: 'Times New Roman', size: 16, bold: false, italic: false, underline: false, strike: false, color: '#1F293B', baseline: 0, highlight: null },
  { id: 3, text: 'const apiKey = "sec_9876543210_live";', chars: 37, font: 'Courier New', size: 11, bold: false, italic: false, underline: false, strike: false, color: '#333333', baseline: 0, highlight: null },
  { id: 4, text: 'WARNING: This important alert text has a yellow highlight background.', chars: 69, font: 'Arial', size: 11, bold: true, italic: false, underline: false, strike: false, color: '#E01C47', baseline: 0, highlight: '#FEF08A' },
  { id: 5, text: 'This body sentence is set in italic oblique text for emphasis.', chars: 61, font: 'Arial', size: 11, bold: false, italic: true, underline: false, strike: false, color: '#404040', baseline: 0, highlight: null },
  { id: 6, text: 'Key Principle: Body text at 11pt should remain bold.', chars: 52, font: 'Times New Roman', size: 11, bold: true, italic: false, underline: false, strike: false, color: '#1A1A1A', baseline: 0, highlight: null },
  { id: 7, text: 'Footnote 1: Verified against ISO 32000-1 specification.', chars: 55, font: 'Arial', size: 8, bold: false, italic: false, underline: false, strike: false, color: '#808080', baseline: 0, highlight: null }
];

async function extractPptxRuns(pptxBuf) {
  const zip = await JSZip.loadAsync(pptxBuf);
  const slide1Xml = await zip.file('ppt/slides/slide1.xml').async('text');
  const runRegex = /<a:r>([\s\S]*?)<\/a:r>/g;
  let match;
  const runs = [];
  while ((match = runRegex.exec(slide1Xml)) !== null) {
    const textMatch = /<a:t>([\s\S]*?)<\/a:t>/.exec(match[1]);
    const text = textMatch ? textMatch[1] : '';
    if (!text.trim()) continue;

    const rPrMatch = /<a:rPr[\s\S]*?<\/a:rPr>|<a:rPr[^>]*\/>/.exec(match[1]);
    const rPr = rPrMatch ? rPrMatch[0] : '';
    const bold = /b="1"/.test(rPr);
    const italic = /i="1"/.test(rPr);
    const underline = /u="sng"/.test(rPr);
    const strike = /strike="sngStrike"/.test(rPr);
    const szMatch = /sz="(\d+)"/.exec(rPr);
    const size = szMatch ? parseInt(szMatch[1], 10) / 100 : 12;
    const tfMatch = /typeface="([^"]+)"/.exec(rPr);
    const font = tfMatch ? tfMatch[1] : 'Calibri';
    const clrMatch = /<a:srgbClr val="([A-Fa-f0-9]{6})"\/>/.exec(rPr);
    const color = clrMatch ? '#' + clrMatch[1].toUpperCase() : '#000000';
    const hlMatch = /<a:highlight[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"\/>/.exec(rPr);
    const highlight = hlMatch ? '#' + hlMatch[1].toUpperCase() : null;

    runs.push({ text, chars: text.length, font, size, bold, italic, underline, strike, color, highlight });
  }
  return { runs, slide1Xml };
}

async function extractDocxRuns(docxBuf) {
  const zip = await JSZip.loadAsync(docxBuf);
  const docXml = await zip.file('word/document.xml').async('text');
  const runRegex = /<w:r(?: [^>]*)?>([\s\S]*?)<\/w:r>/g;
  let match;
  const runs = [];
  while ((match = runRegex.exec(docXml)) !== null) {
    const textMatch = /<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/.exec(match[1]);
    const text = textMatch ? textMatch[1] : '';
    if (!text.trim()) continue;

    const rPrMatch = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(match[1]);
    const rPr = rPrMatch ? rPrMatch[1] : '';
    const bold = /<w:b\/>|<w:b w:val="true"\/>|<w:b w:val="1"\/>/.test(rPr);
    const italic = /<w:i\/>|<w:i w:val="true"\/>|<w:i w:val="1"\/>/.test(rPr);
    const underline = /<w:u w:val="single"\/>/.test(rPr);
    const strike = /<w:strike\/>/.test(rPr);
    const szMatch = /<w:sz w:val="(\d+)"\/>/.exec(rPr);
    const size = szMatch ? parseInt(szMatch[1], 10) / 2 : 11;
    const fontMatch = /<w:rFonts[^>]*w:ascii="([^"]+)"/.exec(rPr);
    const font = fontMatch ? fontMatch[1] : 'Calibri';
    const clrMatch = /<w:color w:val="([A-Fa-f0-9]{6})"\/>/.exec(rPr);
    const color = clrMatch ? '#' + clrMatch[1].toUpperCase() : '#000000';
    const hlMatch = /<w:shd[^>]*w:fill="([A-Fa-f0-9]{6})"/.exec(rPr) || /<w:highlight w:val="([^"]+)"\/>/.exec(rPr);
    const highlight = hlMatch ? (hlMatch[1].startsWith('#') ? hlMatch[1] : '#' + hlMatch[1].toUpperCase()) : null;

    runs.push({ text, chars: text.length, font, size, bold, italic, underline, strike, color, highlight });
  }
  return { runs, docXml };
}

async function runStep1Audit() {
  console.log('===============================================================');
  console.log('    BATCH 7: STEP 1 - RE-RUN ORIGINAL BATCH 1 AUDIT            ');
  console.log('===============================================================\n');

  const engine = await setupEngine();
  const pdfPath = path.resolve('scratch/test_style_input.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);
  const fileObj = { name: 'test_style_input.pdf', size: pdfBytes.length, arrayBuffer: async () => pdfBytes.buffer };

  const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity' });
  const pptxBuf = await pptxRes.blob.arrayBuffer();
  fs.writeFileSync('scratch/batch7_original.pptx', Buffer.from(pptxBuf));

  const docxRes = await engine.pdfToWord(fileObj, { mode: 'fidelity' });
  const docxBuf = await docxRes.blob.arrayBuffer();
  fs.writeFileSync('scratch/batch7_original.docx', Buffer.from(docxBuf));

  const pptx = await extractPptxRuns(pptxBuf);
  const docx = await extractDocxRuns(docxBuf);

  // Compute character counts per attribute
  let srcBold = 0, pptBold = 0, docBold = 0;
  let srcItalic = 0, pptItalic = 0, docItalic = 0;
  let srcColor = 0, pptColor = 0, docColor = 0;
  let srcHighlight = 0, pptHighlight = 0, docHighlight = 0;

  let srcArial = 0, pptArial = 0, docArial = 0;
  let srcTimes = 0, pptTimes = 0, docTimes = 0;
  let srcCourier = 0, pptCourier = 0, docCourier = 0;

  for (let i = 0; i < originalBatch1Runs.length; i++) {
    const s = originalBatch1Runs[i];
    const p = pptx.runs[i] || {};
    const d = docx.runs[i] || {};
    const c = s.chars;

    if (s.bold) srcBold += c;
    if (p.bold) pptBold += c;
    if (d.bold) docBold += c;

    if (s.italic) srcItalic += c;
    if (p.italic) pptItalic += c;
    if (d.italic) docItalic += c;

    if (s.color !== '#000000') srcColor += c;
    if (p.color && p.color !== '#000000') pptColor += c;
    if (d.color && d.color !== '#000000') docColor += c;

    if (s.highlight) srcHighlight += c;
    if (p.highlight) pptHighlight += c;
    if (d.highlight) docHighlight += c;

    if (s.font === 'Arial') srcArial += c;
    if (p.font === 'Arial') pptArial += c;
    if (d.font === 'Arial') docArial += c;

    if (s.font === 'Times New Roman') srcTimes += c;
    if (p.font === 'Times New Roman') pptTimes += c;
    if (d.font === 'Times New Roman') docTimes += c;

    if (s.font === 'Courier New') srcCourier += c;
    if (p.font === 'Courier New') pptCourier += c;
    if (d.font === 'Courier New') docCourier += c;
  }

  const auditTable = [
    { Attribute: 'Bold Characters', 'Source PDF': srcBold, 'PPTX Output': pptBold, 'DOCX Output': docBold, Status: (srcBold === pptBold && srcBold === docBold) ? '100% PARITY' : 'MISMATCH' },
    { Attribute: 'Italic Characters', 'Source PDF': srcItalic, 'PPTX Output': pptItalic, 'DOCX Output': docItalic, Status: (srcItalic === pptItalic && srcItalic === docItalic) ? '100% PARITY' : 'MISMATCH' },
    { Attribute: 'Non-Black Color Chars', 'Source PDF': srcColor, 'PPTX Output': pptColor, 'DOCX Output': docColor, Status: (srcColor === pptColor && srcColor === docColor) ? '100% PARITY' : 'MISMATCH' },
    { Attribute: 'Highlighted Characters', 'Source PDF': srcHighlight, 'PPTX Output': pptHighlight, 'DOCX Output': docHighlight, Status: (srcHighlight === pptHighlight && srcHighlight === docHighlight) ? '100% PARITY' : 'MISMATCH' },
    { Attribute: 'Font: Arial Chars', 'Source PDF': srcArial, 'PPTX Output': pptArial, 'DOCX Output': docArial, Status: (srcArial === pptArial && srcArial === docArial) ? '100% PARITY' : 'MISMATCH' },
    { Attribute: 'Font: Times New Roman', 'Source PDF': srcTimes, 'PPTX Output': pptTimes, 'DOCX Output': docTimes, Status: (srcTimes === pptTimes && srcTimes === docTimes) ? '100% PARITY' : 'MISMATCH' },
    { Attribute: 'Font: Courier New', 'Source PDF': srcCourier, 'PPTX Output': pptCourier, 'DOCX Output': docCourier, Status: (srcCourier === pptCourier && srcCourier === docCourier) ? '100% PARITY' : 'MISMATCH' }
  ];

  console.table(auditTable);
  fs.writeFileSync('scratch/batch7_audit_table.json', JSON.stringify(auditTable, null, 2));

  return { pptxBuf, docxBuf, auditTable };
}

runStep1Audit().catch(err => {
  console.error('Batch 7 Step 1 failed:', err);
  process.exit(1);
});
