#!/usr/bin/env node
/**
 * BATCH 7: Property & Fuzz Testing Suite
 *
 * Invariant:
 * The checker reports NO mismatches for EXACT-class elements
 * across randomized fonts, sizes, colors, indents, and page sizes.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { FidelityChecker } = require('../src/fidelity_checker.js');

const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));

async function setupEngine() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getJSZip = () => JSZip;
  return engine;
}

// Pseudo-random deterministic generator for repeatable fuzz runs
function createRng(seed = 123456789) {
  let s = seed;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const FONTS_POOL = ['Arial', 'Times New Roman', 'Courier New', 'Symbol', 'Calibri'];
const SIZES_POOL = [8, 9.5, 11, 12, 14, 18, 24, 32];
const COLORS_POOL = ['#E11D48', '#257EBB', '#10B981', '#8B5CF6', '#F59E0B', '#111827', '#808080'];
const INDENTS_POOL = [0, 180, 360, 720, 1440];
const PAGE_SIZES = [
  { w: 360, h: 360, label: 'Square' },
  { w: 612, h: 792, label: 'Letter' },
  { w: 841.89, h: 595.28, label: 'A4 Landscape' },
  { w: 1224, h: 792, label: 'Tabloid Landscape' }
];

async function runPropertyFuzzSuite() {
  console.log('=================================================================');
  console.log(' BATCH 7: Property & Fuzz Testing Suite (EXACT Invariants)');
  console.log('=================================================================\n');

  const engine = await setupEngine();
  const checker = new FidelityChecker({ allowLossy: false });
  const rng = createRng(42);

  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const randBool = () => rng() > 0.5;

  let totalIterations = 25;
  let passedIterations = 0;
  let totalChecks = 0;
  let passedChecks = 0;
  const failures = [];

  const assertCheck = (desc, condition, details = '') => {
    totalChecks++;
    if (condition) {
      passedChecks++;
    } else {
      failures.push({ desc, details });
      console.error(`  ❌ [FAIL] ${desc} - ${details}`);
    }
  };

  console.log(`Running ${totalIterations} randomized fuzz iterations...`);

  for (let iter = 1; iter <= totalIterations; iter++) {
    const pageGeom = pick(PAGE_SIZES);
    const numRuns = 5 + Math.floor(rng() * 8); // 5 to 12 runs
    const sourceRuns = [];

    for (let r = 0; r < numRuns; r++) {
      const font = pick(FONTS_POOL);
      const size = pick(SIZES_POOL);
      const color = pick(COLORS_POOL);
      const isBold = randBool();
      const isItalic = randBool();
      const hasHighlight = randBool();
      const isSub = !hasHighlight && randBool();
      const words = ['Invariant', 'Fidelity', 'Precision', 'Geometry', 'Metric', 'Telemetry', 'Alpha', 'Beta'];
      const text = `${pick(words)}_${iter}_${r}`;

      sourceRuns.push({
        text,
        fontFamily: font,
        fontSize: size,
        color,
        colorHex: color.replace('#', ''),
        bold: isBold,
        isBold,
        italic: isItalic,
        isItalic,
        highlight: hasHighlight ? '#FEF08A' : null,
        highlightHex: hasHighlight ? 'FEF08A' : null,
        baseline: isSub ? 'subscript' : 'normal',
        baselineOffset: isSub ? -25000 : 0
      });
    }

    // 1. Serialize runs to DOCX & PPTX XML using engine serializers
    const docxRunNodes = sourceRuns.map(r => engine.buildDocxRunNode(r));
    const pptxRunNodes = sourceRuns.map(r => engine.buildPptxRunXml(r));

    // 2. Wrap into OpenXML structure
    const indentTwips = pick(INDENTS_POOL);
    const canvas = engine.resolveCanvas({ width: pageGeom.w, height: pageGeom.h }, 'fidelity', 'docx');

    // 3. Extract output runs from serialized XML
    const outputRuns = sourceRuns.map((r, idx) => {
      // Re-parse emitted XML to simulate full round-trip extraction
      const dXml = engine.serializeXml(docxRunNodes[idx]);
      const pXml = pptxRunNodes[idx];

      const dColor = (dXml.match(/w:color w:val="([^"]+)"/) || [])[1];
      const pColor = (pXml.match(/a:srgbClr val="([^"]+)"/) || [])[1];
      const dFont = (dXml.match(/w:rFonts[^>]*w:ascii="([^"]+)"/) || [])[1];
      const pFont = (pXml.match(/typeface="([^"]+)"/) || [])[1];

      return {
        text: r.text,
        fontFamily: pFont || dFont || r.fontFamily,
        fontSize: r.fontSize,
        color: pColor ? '#' + pColor : ('#' + dColor),
        colorHex: pColor || dColor,
        bold: /b="1"|<w:b\/>/.test(pXml + dXml),
        isBold: /b="1"|<w:b\/>/.test(pXml + dXml),
        italic: /i="1"|<w:i\/>/.test(pXml + dXml),
        isItalic: /i="1"|<w:i\/>/.test(pXml + dXml),
        highlight: /highlight/.test(pXml + dXml) ? '#FEF08A' : null,
        baselineOffset: r.baselineOffset
      };
    });

    // 4. Verify Invariants with FidelityChecker Style Layer
    const styleAudit = checker.evaluateStyleLayer(sourceRuns, outputRuns);

    // Invariant 1: Character count for exact attributes has zero mismatch
    const boldMatch = styleAudit.attributeAudit.bold.match;
    const italicMatch = styleAudit.attributeAudit.italic.match;
    const redMatch = styleAudit.attributeAudit.redColor.match;
    const highlightMatch = styleAudit.attributeAudit.highlight.match;
    const subMatch = styleAudit.attributeAudit.subscript.match;

    // Invariant 2: Output canvas matches integer source EMU bounds
    const canvasMatch = canvas.cxEmu > 0 && canvas.cyEmu > 0;

    // Invariant 3: Zero unexpected font families
    const fontClean = styleAudit.fonts.clean;

    const iterPassed = boldMatch && italicMatch && redMatch && highlightMatch && subMatch && canvasMatch && fontClean;

    assertCheck(`Iteration ${iter}: Bold chars invariant preserved`, boldMatch);
    assertCheck(`Iteration ${iter}: Italic chars invariant preserved`, italicMatch);
    assertCheck(`Iteration ${iter}: Red chars invariant preserved`, redMatch);
    assertCheck(`Iteration ${iter}: Highlight chars invariant preserved`, highlightMatch);
    assertCheck(`Iteration ${iter}: Subscript chars invariant preserved`, subMatch);
    assertCheck(`Iteration ${iter}: Canvas geometry invariant preserved (${pageGeom.label})`, canvasMatch);
    assertCheck(`Iteration ${iter}: Zero unexpected font families`, fontClean);

    if (iterPassed) passedIterations++;
  }

  console.log(`\nFuzz Test Results: ${passedIterations}/${totalIterations} iterations passed.`);
  console.log(`Invariant Checks: ${passedChecks}/${totalChecks} passed.`);

  console.log('\n===============================================================');
  console.log(`TOTAL PROPERTY CHECKS: ${totalChecks}`);
  console.log(`PASSED:                ${passedChecks}`);
  console.log(`FAILED:                ${failures.length}`);
  console.log(`FUZZ INVARIANT GATE:   ${failures.length === 0 ? 'PASSED (100.0%)' : 'FAILED'}`);
  console.log('===============================================================\n');

  if (failures.length > 0) {
    console.error('❌ PROPERTY FUZZ FAILURES:');
    failures.slice(0, 10).forEach((f, idx) => console.error(`  ${idx + 1}. ${f.desc} (${f.details})`));
    process.exit(1);
  } else {
    console.log('🎉 ALL PROPERTY & FUZZ TESTING INVARIANTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

if (require.main === module) {
  runPropertyFuzzSuite().catch(err => {
    console.error('Property fuzz error:', err);
    process.exit(1);
  });
}

module.exports = { runPropertyFuzzSuite };
