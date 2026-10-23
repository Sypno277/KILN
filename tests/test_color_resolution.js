/**
 * Unit Tests for Color Resolution and Extraction Pipeline (BATCH 1)
 *
 * Tests all required cases:
 * 1. (1.0, 0.0, 0.0) -> FF0000
 * 2. (0, 0, 0) -> 000000
 * 3. gray 0.5 -> 808080
 * 4. CMYK red (0, 1.0, 1.0, 0) -> FF0000
 * 5. int-packed 0xFF0000 -> FF0000
 * 6. None / null -> unset (explicit 'unset' state)
 */

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

async function runColorUnitTests() {
  console.log('===============================================================');
  console.log('       BATCH 1: COLOR RESOLUTION & PARSING UNIT TESTS          ');
  console.log('===============================================================\n');

  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();

  const testCases = [
    { input: [1.0, 0.0, 0.0], expected: 'FF0000', desc: '(1.0, 0.0, 0.0) -> FF0000' },
    { input: [0, 0, 0], expected: '000000', desc: '(0, 0, 0) -> 000000' },
    { input: 0.5, expected: '808080', desc: 'gray 0.5 -> 808080' },
    { input: [0, 1.0, 1.0, 0], expected: 'FF0000', desc: 'CMYK red [0, 1.0, 1.0, 0] -> FF0000' },
    { input: 0xFF0000, expected: 'FF0000', desc: 'int-packed 0xFF0000 -> FF0000' },
    { input: null, expected: 'unset', desc: 'None / null -> unset' },
    { input: undefined, expected: 'unset', desc: 'undefined -> unset' }
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      if (typeof engine.resolveColorValue !== 'function') {
        throw new Error('engine.resolveColorValue is not implemented yet.');
      }
      const actual = engine.resolveColorValue(tc.input);
      assert.strictEqual(actual, tc.expected, `Expected ${tc.expected} but got ${actual}`);
      console.log(`  ✓ [PASS] ${tc.desc}: got ${actual}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${tc.desc}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.log('\nFailing unit tests successfully verified prior to implementation.');
    return false;
  }
  return true;
}

runColorUnitTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
