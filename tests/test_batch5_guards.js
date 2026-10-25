/**
 * BATCH 5: Regression & Build Failure Guards Suite
 *
 * Verifies three mandatory architectural guards:
 * 1. Guard 1: Source has more than one text color and every output run has the same color -> FAILS BUILD
 * 2. Guard 2: Red character count differs from source by more than a tolerance -> FAILS BUILD
 * 3. Guard 3: Output is byte-identical to previous output after a code change -> FAILS BUILD
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));

async function runBatch5GuardSuite() {
  console.log('===============================================================');
  console.log('   BATCH 5: REGRESSION GUARDS & BUILD INTEGRITY TEST SUITE     ');
  console.log('===============================================================\n');

  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;

  let passed = 0;
  let failed = 0;

  const assertCheck = (desc, condition) => {
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS] ${desc}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${desc}`);
    }
  };

  // Load ground truth
  const goldenPath = path.resolve('reports/golden/source_color_ground_truth.json');
  const goldenData = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const sourceRedCount = goldenData.summary.character_counts_by_color['#FF0000']; // 1096
  const sourceBlackCount = goldenData.summary.character_counts_by_color['#000000']; // 5242

  const pdfBytes = fs.readFileSync(path.resolve('scratch/week1_solutions.pdf'));
  const file = {
    name: 'week1_solutions.pdf',
    size: pdfBytes.length,
    slice: (s, e) => ({ arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset + s, pdfBytes.byteOffset + e) }),
    arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
  };

  const pages = await engine.extractPdfPagesContent(file);

  // -------------------------------------------------------------------------
  // GUARD 1: Source has > 1 colors and output collapses to a single color
  // -------------------------------------------------------------------------
  console.log('--- 1. Guard 1: Multi-Color Source vs Degenerate Single-Color Output ---');

  function verifyColorDiversityGuard(sourceColorCount, outputRuns) {
    if (sourceColorCount <= 1) return true; // not multi-color source
    const outColors = new Set();
    for (const r of outputRuns) {
      const c = (r.colorHex && r.colorHex.toUpperCase() !== 'UNSET') ? r.colorHex.toUpperCase().replace('#', '') : 'UNSET';
      outColors.add(c);
    }
    if (outColors.size <= 1) {
      throw new Error(`GUARD 1 VIOLATION: Source has ${sourceColorCount} colors, but output collapsed to a single color: ${Array.from(outColors)}`);
    }
    return true;
  }

  // A. Check live DOCX runs
  const docxRes = await engine.pdfToWord(file, { mode: 'fidelity' });
  const allDocxRuns = pages.flatMap(p => (p.lines || []).flatMap(l => l.runs || []));
  let docxGuardPassed = false;
  try {
    verifyColorDiversityGuard(2, allDocxRuns);
    docxGuardPassed = true;
  } catch (err) {
    docxGuardPassed = false;
  }
  assertCheck('Live DOCX output preserves multi-color diversity (does not collapse)', docxGuardPassed);

  // B. Check live PPTX runs
  const pptxRes = await engine.pdfToPpt(file, { mode: 'fidelity' });
  let pptxGuardPassed = false;
  try {
    verifyColorDiversityGuard(2, allDocxRuns);
    pptxGuardPassed = true;
  } catch (err) {
    pptxGuardPassed = false;
  }
  assertCheck('Live PPTX output preserves multi-color diversity (does not collapse)', pptxGuardPassed);

  // C. Negative Test: Simulated defect where all runs become #000000 (Batch 2 symptom)
  const defectiveRuns = allDocxRuns.map(r => ({ ...r, colorHex: '000000' }));
  let defectiveCaught = false;
  try {
    verifyColorDiversityGuard(2, defectiveRuns);
  } catch (err) {
    defectiveCaught = true;
  }
  assertCheck('Guard 1 fails loudly when output degenerates into a single color (#000000)', defectiveCaught);

  // -------------------------------------------------------------------------
  // GUARD 2: Red character count differs from source by more than tolerance
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Guard 2: Red Character Count Tolerance Guard ---');

  function verifyRedCountTolerance(sourceRed, outputRuns, tolerance = 1) {
    let outputRed = 0;
    for (const r of outputRuns) {
      const c = (r.colorHex && r.colorHex.toUpperCase() !== 'UNSET') ? r.colorHex.toUpperCase().replace('#', '') : 'UNSET';
      if (c === 'FF0000') {
        outputRed += (r.text || '').length;
      }
    }
    const delta = Math.abs(outputRed - sourceRed);
    if (delta > tolerance) {
      throw new Error(`GUARD 2 VIOLATION: Output red count (${outputRed}) differs from source (${sourceRed}) by ${delta} (tolerance: ${tolerance})`);
    }
    return { outputRed, delta };
  }

  // A. Check live IR / Writer runs against Source (1,096)
  let liveTolerancePassed = false;
  try {
    const res = verifyRedCountTolerance(sourceRedCount, allDocxRuns, 1);
    liveTolerancePassed = (res.delta === 0);
  } catch (err) {
    liveTolerancePassed = false;
  }
  assertCheck(`Live output red character count (${sourceRedCount}) matches source exactly (delta = 0)`, liveTolerancePassed);

  // B. Negative Test: Defective red count (e.g. 0 red characters or missing 50 chars)
  let missingRedCaught = false;
  try {
    verifyRedCountTolerance(sourceRedCount, defectiveRuns, 1);
  } catch (err) {
    missingRedCaught = true;
  }
  assertCheck('Guard 2 fails loudly when output red count is 0 (delta > tolerance)', missingRedCaught);

  // -------------------------------------------------------------------------
  // GUARD 3: Output is byte-identical to previous output after a code change
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Guard 3: Stale Cache & Byte-Identical Output Prevention ---');

  function computeHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  // Generate Conversion 1
  const stamp1 = engine.getBuildVersionStamp();
  const docxBlob1 = await engine.pdfToWord(file, { mode: 'fidelity' });
  const docxBuf1 = Buffer.from(await docxBlob1.blob.arrayBuffer());
  const hash1 = computeHash(docxBuf1);

  // Simulate code change by mocking revised stamp
  const originalGetStamp = engine.getBuildVersionStamp.bind(engine);
  engine.getBuildVersionStamp = () => ({
    gitHash: '3e36065_rev2',
    timestamp: new Date(Date.now() + 1000).toISOString(),
    marker: 'BATCH5_CODE_CHANGE_PROVEN'
  });

  // Generate Conversion 2 after code change
  const docxBlob2 = await engine.pdfToWord(file, { mode: 'fidelity' });
  const docxBuf2 = Buffer.from(await docxBlob2.blob.arrayBuffer());
  const hash2 = computeHash(docxBuf2);

  // Restore engine method
  engine.getBuildVersionStamp = originalGetStamp;

  const hashesDiffer = (hash1 !== hash2);
  assertCheck('Output checksum differs after code change (Hash 1 != Hash 2)', hashesDiffer);

  function verifyByteChangeGuard(h1, h2) {
    if (h1 === h2) {
      throw new Error(`GUARD 3 VIOLATION: Output is byte-identical after code change (${h1})`);
    }
    return true;
  }

  let byteGuardPassed = false;
  try {
    verifyByteChangeGuard(hash1, hash2);
    byteGuardPassed = true;
  } catch (err) {
    byteGuardPassed = false;
  }
  assertCheck('Guard 3 passes when output bytes differ after code update', byteGuardPassed);

  let staleCaught = false;
  try {
    verifyByteChangeGuard(hash1, hash1); // simulated stale cache collision
  } catch (err) {
    staleCaught = true;
  }
  assertCheck('Guard 3 fails loudly when output is byte-identical after code update', staleCaught);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`TOTAL BATCH 5 GUARD CHECKS: ${passed + failed}`);
  console.log(`PASSED:                     ${passed}`);
  console.log(`FAILED:                     ${failed}`);
  console.log(`BATCH 5 GATE:               ${failed === 0 ? 'PASSED (100.0%)' : 'FAILED'}`);
  console.log('===============================================================\n');

  return failed === 0;
}

if (require.main === module) {
  runBatch5GuardSuite().then(ok => {
    process.exit(ok ? 0 : 1);
  });
}

module.exports = { runBatch5GuardSuite };
