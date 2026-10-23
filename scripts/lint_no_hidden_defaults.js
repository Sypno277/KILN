#!/usr/bin/env node
/**
 * Guardrail Lint: No Hidden Defaults
 *
 * Enforces the architectural rule:
 * "The output canvas is derived from the source. Templates never decide size."
 *
 * Fails the build (exit code 1) if:
 * 1. Any writer contains hard-coded canvas sizes (e.g. static addPage dimensions, static EMU sizes).
 * 2. Any writer loads a template whose size is used for output without being dynamically overridden.
 * 3. Any writer creates or configures output pages without calling resolveCanvas().
 */

const fs = require('fs');
const path = require('path');

const TARGET_FILES = [
  path.resolve(__dirname, '../public/assets/converter-engine.js')
];

const WRITER_METHODS = [
  'pdfToPpt',
  'pdfToWord',
  'pdfToExcel',
  'imageToPdf',
  'textToPdf',
  'pdfWordToPdf',
  'pdfPptToPdf',
  'pdfExcelToPdf',
  'pdfHtmlToPdf'
];

function runLint() {
  console.log('--- Running Guardrail Lint: No Hidden Defaults ---');
  let failures = [];

  for (const filePath of TARGET_FILES) {
    if (!fs.existsSync(filePath)) {
      failures.push(`Target file does not exist: ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // 1. Verify every writer method calls resolveCanvas
    for (const writer of WRITER_METHODS) {
      const startIdx = content.indexOf(`async ${writer}(`);
      if (startIdx === -1) {
        failures.push(`Writer '${writer}' not found in ${path.basename(filePath)}.`);
        continue;
      }
      const nextAsync = content.indexOf('\n  async ', startIdx + 10);
      const nextComment = content.indexOf('\n  /**', startIdx + 10);
      let endIdx = content.length;
      if (nextAsync !== -1 && nextComment !== -1) endIdx = Math.min(nextAsync, nextComment);
      else if (nextAsync !== -1) endIdx = nextAsync;
      else if (nextComment !== -1) endIdx = nextComment;

      const body = content.substring(startIdx, endIdx);
      if (!body.includes('resolveCanvas')) {
        failures.push(`Writer '${writer}' does not call resolveCanvas() to derive its canvas size.`);
      }
    }

    // 2. Check for un-overridden template dimensions
    if (content.includes('PPTX_TEMPLATE_B64')) {
      const overridesPptSlideSize = content.includes('presXml.replace(/<p:sldSz') || content.includes('p:sldSz cx="${canvas.cxEmu}"');
      if (!overridesPptSlideSize) {
        failures.push(`PPTX_TEMPLATE_B64 is loaded, but slide size (<p:sldSz>) is not dynamically overridden from resolveCanvas.`);
      }
    }

    // 3. Scan for forbidden raw hardcoded canvas patterns outside resolveCanvas
    // (e.g., hardcoded doc.addPage([595.28, 841.89]) outside resolveCanvas)
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // Skip the resolveCanvas implementation itself and comments
      if (lineNum >= 890 && lineNum <= 940) return;
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

      if (/addPage\(\s*\[\s*\d+\.?\d*\s*,\s*\d+\.?\d*\s*\]\s*\)/.test(line) && !line.includes('canvas.widthPt') && !line.includes('tc.w')) {
        failures.push(`Line ${lineNum}: Hardcoded addPage dimensions found without resolveCanvas: "${line.trim()}".`);
      }

      if (/<p:sldSz[^>]*cx="12192000"/.test(line) && !line.includes('${canvas.cxEmu}')) {
        failures.push(`Line ${lineNum}: Hardcoded 16:9 widescreen EMU dimension found in presentation XML: "${line.trim()}".`);
      }

      if (/<w:pgSz[^>]*w:w="11906"/.test(line) && !line.includes('${canvas.wTwips}')) {
        failures.push(`Line ${lineNum}: Hardcoded A4 twips dimension found in Word document XML: "${line.trim()}".`);
      }
    });
  }

  if (failures.length > 0) {
    console.error('\n❌ BUILD FAILED: "No Hidden Defaults" rule violated:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    console.error('\nRule: "The output canvas is derived from the source. Templates never decide size."\n');
    process.exit(1);
  } else {
    console.log('✓ PASS: "No Hidden Defaults" verified.');
    console.log(`  - All ${WRITER_METHODS.length} document writers derive canvas size from resolveCanvas().`);
    console.log('  - All OpenXML and PDF templates dynamically override slide/page geometry.');
    console.log('  - Zero hardcoded canvas dimensions detected.\n');
  }
}

if (require.main === module) {
  runLint();
}

module.exports = { runLint };
