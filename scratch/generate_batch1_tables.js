const fs = require('fs');
const path = require('path');

const groundTruthRuns = [
  { id: 1, text: 'Typography Test Document', chars: 24, font: 'Arial', size: 24, bold: true, italic: false, underline: false, strike: false, color: '#2463EB', baseline: 0, highlight: null },
  { id: 2, text: 'Section Subtitle in Times Roman Serif', chars: 37, font: 'Times New Roman', size: 16, bold: false, italic: false, underline: false, strike: false, color: '#1F293B', baseline: 0, highlight: null },
  { id: 3, text: 'const apiKey = "sec_9876543210_live";', chars: 37, font: 'Courier New', size: 11, bold: false, italic: false, underline: false, strike: false, color: '#333333', baseline: 0, highlight: null },
  { id: 4, text: 'WARNING: This important alert text has a yellow highlight background.', chars: 69, font: 'Arial', size: 11, bold: true, italic: false, underline: false, strike: false, color: '#E01C47', baseline: 0, highlight: '#FEF08A' },
  { id: 5, text: 'This body sentence is set in italic oblique text for emphasis.', chars: 61, font: 'Arial', size: 11, bold: false, italic: true, underline: false, strike: false, color: '#404040', baseline: 0, highlight: null },
  { id: 6, text: 'Key Principle: Body text at 11pt should remain bold.', chars: 52, font: 'Times New Roman', size: 11, bold: true, italic: false, underline: false, strike: false, color: '#1A1A1A', baseline: 0, highlight: null },
  { id: 7, text: 'Footnote 1: Verified against ISO 32000-1 specification.', chars: 55, font: 'Arial', size: 8, bold: false, italic: false, underline: false, strike: false, color: '#808080', baseline: 0, highlight: null }
];

const auditData = JSON.parse(fs.readFileSync('scratch/audit_results.json', 'utf8'));
const pptxRuns = auditData.pptx.pptxRuns;
const docxRuns = auditData.docx.docxRuns;

let srcBold = 0, pptBold = 0, docBold = 0;
let srcItalic = 0, pptItalic = 0, docItalic = 0;
let srcUnderline = 0, pptUnderline = 0, docUnderline = 0;
let srcStrike = 0, pptStrike = 0, docStrike = 0;
let srcHighlight = 0, pptHighlight = 0, docHighlight = 0;
let srcColorHex = 0, pptColorHex = 0, docColorHex = 0;
let srcBaseline = 0, pptBaseline = 0, docBaseline = 0;

let srcArial = 0, pptArial = 0, docArial = 0;
let srcTimes = 0, pptTimes = 0, docTimes = 0;
let srcCourier = 0, pptCourier = 0, docCourier = 0;

for (let i = 0; i < groundTruthRuns.length; i++) {
  const c = groundTruthRuns[i].chars;
  const s = groundTruthRuns[i];
  const p = pptxRuns[i];
  const d = docxRuns[i];

  if (s.bold) srcBold += c;
  if (p.bold) pptBold += c;
  if (d.bold) docBold += c;

  if (s.italic) srcItalic += c;
  if (p.italic) pptItalic += c;
  if (d.italic) docItalic += c;

  if (s.underline) srcUnderline += c;
  if (p.underline) pptUnderline += c;
  if (d.underline) docUnderline += c;

  if (s.strike) srcStrike += c;
  if (p.strikethrough) pptStrike += c;
  if (d.strikethrough) docStrike += c;

  if (s.highlight) srcHighlight += c;
  if (p.highlight) pptHighlight += c;
  if (d.highlight) docHighlight += c;

  if (s.color !== '#000000') srcColorHex += c;
  if (p.color !== '#000000') pptColorHex += c;
  if (d.color !== '#000000') docColorHex += c;

  if (s.baseline !== 0) srcBaseline += c;
  if (p.baselineOffset !== 0) pptBaseline += c;
  if (d.baselineOffset !== 0) docBaseline += c;

  if (s.font === 'Arial') srcArial += c;
  if (p.fontFamily === 'Arial') pptArial += c;
  if (d.fontFamily === 'Arial') docArial += c;

  if (s.font === 'Times New Roman') srcTimes += c;
  if (p.fontFamily === 'Times New Roman') pptTimes += c;
  if (d.fontFamily === 'Times New Roman') docTimes += c;

  if (s.font === 'Courier New') srcCourier += c;
  if (p.fontFamily === 'Courier New') pptCourier += c;
  if (d.fontFamily === 'Courier New') docCourier += c;
}

console.log(JSON.stringify({
  bold: { src: srcBold, ppt: pptBold, doc: docBold },
  italic: { src: srcItalic, ppt: pptItalic, doc: docItalic },
  underline: { src: srcUnderline, ppt: pptUnderline, doc: docUnderline },
  strike: { src: srcStrike, ppt: pptStrike, doc: docStrike },
  highlight: { src: srcHighlight, ppt: pptHighlight, doc: docHighlight },
  color: { src: srcColorHex, ppt: pptColorHex, doc: docColorHex },
  baseline: { src: srcBaseline, ppt: pptBaseline, doc: docBaseline },
  arial: { src: srcArial, ppt: pptArial, doc: docArial },
  times: { src: srcTimes, ppt: pptTimes, doc: docTimes },
  courier: { src: srcCourier, ppt: pptCourier, doc: docCourier }
}, null, 2));
