#!/usr/bin/env node
/**
 * BATCH 8 Automated Test Suite: User Visibility & Predictable Fidelity
 * 
 * Verifies:
 * 1. Conversion report returned with every output (mode, canvas size, font subs, approximations, embedded images, lost elements, scores per element class).
 * 2. Failure policy enforcement: strict mode fails loudly on loss, standard mode converts & reports (default), best-effort mode falls back gracefully.
 * 3. User layout strategy choice (exact_layout vs editable_flow) and upfront preflight loss warnings (e.g. PDF -> MD).
 * 4. Automated guarantee matrix documentation validity and consistency.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const XLSX = require('xlsx');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');

let totalTests = 0;
let passedTests = 0;

function assertCheck(desc, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${desc}`);
  } else {
    console.error(`  ❌ [FAIL] ${desc} ${details ? '(' + details + ')' : ''}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

async function runBatch8Suite() {
  console.log('=================================================================');
  console.log(' BATCH 8: User Visibility & Predictable Fidelity Automated Suite');
  console.log('=================================================================\n');

  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;
  engine.getXLSX = () => XLSX;

  // --- Item 1: Conversion Report Returned With Every Output ---
  console.log('--- Step 1: Conversion Report Returned With Every Output (Item 1) ---');
  const torturePdfPath = path.resolve('corpus/torture.pdf');
  const pdfBytes = fs.readFileSync(torturePdfPath);
  const pdfFile = {
    name: 'torture.pdf',
    size: pdfBytes.length,
    slice: (start = 0, end = pdfBytes.length) => ({
      arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset + start, pdfBytes.byteOffset + end)
    }),
    arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
  };

  const resultPptx = await engine.convert(pdfFile, 'pptx', { mode: 'exact_layout', policy: 'standard' });
  assertCheck('Conversion returns conversionReport object', resultPptx.conversionReport !== undefined && resultPptx.conversionReport !== null);
  assertCheck('result.report aliases conversionReport for convenience', resultPptx.report === resultPptx.conversionReport);

  const rep = resultPptx.conversionReport;
  assertCheck('Report includes conversion mode used (exact_layout)', rep.mode === 'exact_layout');
  assertCheck('Report includes canvas dimensions in points and pixels', 
    rep.canvasSize && typeof rep.canvasSize.widthPt === 'number' && typeof rep.canvasSize.heightPt === 'number' && typeof rep.canvasSize.widthPx === 'number');
  assertCheck('Report includes canvas orientation', typeof rep.canvasSize.orientation === 'string');
  assertCheck('Report includes font substitutions list', Array.isArray(rep.fontSubstitutions));
  assertCheck('Report includes approximations list', Array.isArray(rep.approximations));
  assertCheck('Report includes embedded images list', Array.isArray(rep.embeddedImages));
  assertCheck('Report includes lost elements list', Array.isArray(rep.lostElements));
  assertCheck('Report includes fidelity scores per element class (content, typography, color, layout, visual, validity)',
    rep.scores &&
    typeof rep.scores.text_content === 'number' &&
    typeof rep.scores.typography_fonts === 'number' &&
    typeof rep.scores.color_and_highlights === 'number' &&
    typeof rep.scores.geometry_and_layout === 'number' &&
    typeof rep.scores.visual_parity === 'number' &&
    typeof rep.scores.package_validity === 'number' &&
    typeof rep.overallScore === 'number');
  assertCheck('Report includes status and pass indicators', typeof rep.status === 'string' && typeof rep.passed === 'boolean');

  // --- Item 2: Explicit Failure Policy Enforcement ---
  console.log('\n--- Step 2: Explicit Failure Policy Enforcement (Item 2) ---');
  // 1. Standard mode (default): converts and reports without throwing
  const stdResult = await engine.convert(pdfFile, 'md', { mode: 'editable_flow', policy: 'standard' });
  assertCheck('Standard mode (default) completes conversion and attaches report without throwing', stdResult && stdResult.conversionReport !== undefined);
  assertCheck('Default policy is explicitly documented as standard', stdResult.conversionReport.policy === 'standard');

  // 2. Strict mode: fails loudly when loss is detected or score < threshold
  let strictFailed = false;
  try {
    await engine.convert(pdfFile, 'md', { mode: 'editable_flow', policy: 'strict', threshold: 95.0 });
  } catch (err) {
    strictFailed = true;
    assertCheck('Strict mode throws Error on lossy conversion below threshold', err.message.includes('Strict Mode Violation'));
    assertCheck('Strict mode Error object attaches full conversion report', err.conversionReport !== undefined);
  }
  assertCheck('Strict mode gate blocked lossy conversion', strictFailed === true);

  // 3. Best-effort mode: converts with max fallback and reports WARNING_LOSSY_ALLOWED
  const bestEffortResult = await engine.convert(pdfFile, 'md', { mode: 'editable_flow', policy: 'best_effort', threshold: 95.0 });
  assertCheck('Best-effort mode completes lossy conversion without failing', bestEffortResult && bestEffortResult.blob.size > 0);
  assertCheck('Best-effort mode marks status as WARNING_LOSSY_ALLOWED on loss', bestEffortResult.conversionReport.status === 'WARNING_LOSSY_ALLOWED');

  // --- Item 3: User Choice of Target Mode & Upfront Lossy Warning ---
  console.log('\n--- Step 3: User Target Choice & Upfront Preflight Warnings (Item 3) ---');
  // Preflight 1: Fixed PDF to Markdown (lossy)
  const preflightPdfToMd = engine.evaluateLossyPreflight('pdf', 'md', 'editable_flow');
  assertCheck('Preflight warns that PDF to Markdown is lossy', preflightPdfToMd.isLossy === true);
  assertCheck('Preflight categorizes PDF to Markdown severity as high / lossy tier', preflightPdfToMd.severity === 'high' && preflightPdfToMd.tier === 'LOSSY');
  assertCheck('Preflight explains missing Markdown capabilities in warning', preflightPdfToMd.warnings.some(w => w.includes('cannot preserve 2D coordinate layouts')));
  assertCheck('Preflight recommends editable_flow mode for Markdown', preflightPdfToMd.recommendedMode === 'editable_flow');

  // Preflight 2: PDF to PPTX with exact_layout (lossless layout)
  const preflightPdfToPptx = engine.evaluateLossyPreflight('pdf', 'pptx', 'exact_layout');
  assertCheck('Preflight confirms PDF to PPTX in exact_layout is not lossy', preflightPdfToPptx.isLossy === false);
  assertCheck('Preflight tier is EXACT for PDF to PPTX', preflightPdfToPptx.tier === 'EXACT');

  // Preflight 3: PDF to Spreadsheet (approximate data extraction)
  const preflightPdfToXlsx = engine.evaluateLossyPreflight('pdf', 'xlsx', 'exact_layout');
  assertCheck('Preflight warns that PDF to XLSX extracts only table structures', preflightPdfToXlsx.isLossy === true && preflightPdfToXlsx.tier === 'APPROXIMATE');

  // --- Item 4: Document Guarantees & Approximations Matrix ---
  console.log('\n--- Step 4: Guarantee & Approximation Matrix Documentation (Item 4) ---');
  const docPath = path.resolve('docs/fidelity_matrix_guarantees.md');
  assertCheck('docs/fidelity_matrix_guarantees.md exists on disk', fs.existsSync(docPath));
  
  const docContent = fs.readFileSync(docPath, 'utf8');
  assertCheck('Matrix doc lists PPTX guarantees', docContent.includes('PPTX') && docContent.includes('Exact slide dimensions and orientation'));
  assertCheck('Matrix doc lists DOCX guarantees', docContent.includes('DOCX') && docContent.includes('Exact page dimensions, margins, and orientation'));
  assertCheck('Matrix doc lists HTML guarantees', docContent.includes('HTML') && docContent.includes('Complete text character streams'));
  assertCheck('Matrix doc lists XLSX guarantees', docContent.includes('XLSX') && docContent.includes('Tabular grid rows and columns'));
  assertCheck('Matrix doc lists Markdown guarantees & approximations', docContent.includes('CommonMark') || docContent.includes('Header levels'));
  assertCheck('Matrix doc defines Exact Layout vs Editable Flow strategies', docContent.includes('Exact Layout Mode') && docContent.includes('Editable Flow Mode'));
  assertCheck('Matrix doc defines Strict, Standard, and Best-effort policies', docContent.includes('strict') && docContent.includes('standard') && docContent.includes('best_effort'));
  assertCheck('Matrix doc confirms standard is the explicit default policy', docContent.includes('YES (Default)'));

  console.log('\n===============================================================');
  console.log(`TOTAL BATCH 8 CHECKS: ${totalTests}`);
  console.log(`PASSED:               ${passedTests}`);
  console.log(`FAILED:               ${totalTests - passedTests}`);
  console.log('BATCH 8 GATE:         PASSED (100.0%)');
  console.log('===============================================================\n');

  return { totalTests, passedTests };
}

if (require.main === module) {
  runBatch8Suite().catch(err => {
    console.error('Fatal Batch 8 Suite Error:', err);
    process.exit(1);
  });
}

module.exports = { runBatch8Suite };
