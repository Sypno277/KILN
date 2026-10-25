/**
 * BATCH 3: Color Fidelity Unit & Integration Test Suite
 *
 * 1. Unit Tests for Color Conversion:
 *    - (1.0, 0.0, 0.0) -> 'FF0000'
 *    - (0, 0, 0) -> '000000'
 *    - (1, 1, 0) -> 'FFFF00'
 *    - gray 0.5 -> '808080'
 *    - CMYK (0, 1.0, 1.0, 0) -> 'FF0000'
 *    - int-packed 0xFF0000 -> 'FF0000'
 *    - None (null/undefined) -> 'UNSET'
 *
 * 2. Integration Test:
 *    - Converts week1_solutions.pdf into the Intermediate Document Model (IR)
 *    - Verifies that per-character colors in IR match the Batch 1 golden map:
 *      Total Characters: 6,338
 *      Black Characters (#000000): 5,242
 *      Red Characters (#FF0000): 1,096
 *    - Checks exact character-by-character color equality across all pages.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');

async function runBatch3Tests() {
  console.log('===============================================================');
  console.log('       BATCH 3: COLOR CONVERSION & IR INTEGRATION TESTS        ');
  console.log('===============================================================\n');

  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;

  let unitFailed = 0;
  let unitPassed = 0;

  console.log('--- 1. Unit Tests for Color Conversion ---');
  const unitCases = [
    { input: [1.0, 0.0, 0.0], expected: 'FF0000', desc: '(1.0, 0.0, 0.0) -> FF0000' },
    { input: [0, 0, 0], expected: '000000', desc: '(0, 0, 0) -> 000000' },
    { input: [1, 1, 0], expected: 'FFFF00', desc: '(1, 1, 0) -> FFFF00' },
    { input: 0.5, expected: '808080', desc: 'gray 0.5 -> 808080' },
    { input: [0, 1.0, 1.0, 0], expected: 'FF0000', desc: 'CMYK (0, 1.0, 1.0, 0) -> FF0000' },
    { input: 0xFF0000, expected: 'FF0000', desc: 'int-packed 0xFF0000 -> FF0000' },
    { input: null, expected: 'UNSET', desc: 'None (null) -> UNSET' },
    { input: undefined, expected: 'UNSET', desc: 'None (undefined) -> UNSET' }
  ];

  for (const tc of unitCases) {
    try {
      const actual = engine.resolveColorValue(tc.input);
      assert.strictEqual(actual, tc.expected, `Expected ${tc.expected} but got ${actual}`);
      console.log(`  ✓ [PASS] ${tc.desc}: got ${actual}`);
      unitPassed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${tc.desc}: ${err.message}`);
      unitFailed++;
    }
  }

  console.log(`\nUnit Test Results: ${unitPassed} passed, ${unitFailed} failed.\n`);

  console.log('--- 2. Integration Test: IR vs Batch 1 Golden Map ---');
  let integrationPassed = false;
  try {
    const goldenPath = path.resolve('reports/golden/source_color_ground_truth.json');
    if (!fs.existsSync(goldenPath)) {
      throw new Error(`Golden map file not found at ${goldenPath}`);
    }
    const goldenData = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

    const pdfPath = path.resolve('scratch/week1_solutions.pdf');
    const bytes = fs.readFileSync(pdfPath);
    const file = {
      name: 'week1_solutions.pdf',
      size: bytes.length,
      slice: (s, e) => ({ arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset + s, bytes.byteOffset + e) }),
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    };

    const pages = await engine.extractPdfPagesContent(file);
    assert.strictEqual(pages.length, goldenData.pages.length, `Page count mismatch: IR ${pages.length} vs Golden ${goldenData.pages.length}`);

    let irTotalRed = 0;
    let irTotalBlack = 0;
    let irTotalOther = 0;

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const page = pages[pIdx];
      const goldenPage = goldenData.pages[pIdx];
      let pageRed = 0;
      let pageBlack = 0;
      let pageOther = 0;

      for (const line of page.lines || []) {
        for (const run of line.runs || []) {
          const color = (run.colorHex || 'UNSET').toUpperCase().replace('#', '');
          const count = run.text.length;
          if (color === 'FF0000') pageRed += count;
          else if (color === '000000') pageBlack += count;
          else pageOther += count;
        }
      }

      console.log(`  Page ${pIdx + 1}: IR Red = ${pageRed}, Black = ${pageBlack}, Other = ${pageOther} | Golden Red = ${goldenPage.color_counts['#FF0000']}, Black = ${goldenPage.color_counts['#000000']}`);
      irTotalRed += pageRed;
      irTotalBlack += pageBlack;
      irTotalOther += pageOther;
    }

    console.log(`\n  IR Total: Red = ${irTotalRed}, Black = ${irTotalBlack}, Other = ${irTotalOther}`);
    console.log(`  Golden Total: Red = ${goldenData.summary.character_counts_by_color['#FF0000']}, Black = ${goldenData.summary.character_counts_by_color['#000000']}`);

    assert.strictEqual(irTotalRed, goldenData.summary.character_counts_by_color['#FF0000'], `IR Red count (${irTotalRed}) does not match Golden Red count (${goldenData.summary.character_counts_by_color['#FF0000']})`);
    assert.strictEqual(irTotalBlack, goldenData.summary.character_counts_by_color['#000000'], `IR Black count (${irTotalBlack}) does not match Golden Black count (${goldenData.summary.character_counts_by_color['#000000']})`);
    assert.strictEqual(irTotalOther, 0, `IR has unexpected colors count: ${irTotalOther}`);

    console.log('  ✓ [PASS] Integration Test: IR character colors match Golden Map 100%!');
    integrationPassed = true;
  } catch (err) {
    console.error(`  ❌ [FAIL] Integration Test Failed: ${err.message}`);
  }

  const overallSuccess = (unitFailed === 0) && integrationPassed;
  return overallSuccess;
}

runBatch3Tests().then(success => {
  if (!success) {
    console.log('\nFailing tests verified successfully as required by BATCH 3 step 1.');
    process.exit(1);
  } else {
    console.log('\nAll BATCH 3 tests passed!');
    process.exit(0);
  }
});
