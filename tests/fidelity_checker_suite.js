#!/usr/bin/env node
/**
 * BATCH 6: Comprehensive Automatic Fidelity Checker Test Suite
 *
 * Requirements Tested:
 * 1. Content layer: text normalization, diff (missing, extra, altered, reordered chars),
 *    and counts of images, tables, links, lists, pages.
 * 2. Style layer: per-run/paragraph comparisons (font, size, color, bold/italic/underline/strike,
 *    highlight, sub/superscript, alignment, indents, spacing), reporting exact counts (e.g. red chars).
 * 3. Visual layer: SSIM / perceptual diff, RGB color histograms, 3x3 per-region diffs, diff image saving.
 * 4. Validity layer: schema validation of package parts, child order in <a:rPr>, and dual-reader verification.
 * 5. Scoring & Thresholds: per-element-class scoring, weighted overall score, failure on breach vs lossy mode.
 * 6. Report outputs: JSON report and human-readable Markdown summary with approximations, substitutions, losses.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { FidelityChecker } = require('../src/fidelity_checker.js');

const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');

async function setupEngine() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;
  return engine;
}

async function runFidelityCheckerSuite() {
  console.log('=================================================================');
  console.log(' BATCH 6: Automatic Conversion Fidelity Checker Test Suite');
  console.log('=================================================================\n');

  let passedChecks = 0;
  let totalChecks = 0;
  const failures = [];

  const assertCheck = (desc, condition, details = '') => {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✓ [PASS] ${desc}`);
    } else {
      failures.push({ desc, details });
      console.error(`  ❌ [FAIL] ${desc} - ${details}`);
    }
  };

  const checker = new FidelityChecker({
    allowLossy: false,
    thresholds: {
      overall: 95.0,
      content: 98.0,
      style: 92.0,
      visualSsim: 0.90,
      maxRegionDiff: 5.0,
      validity: 100.0
    }
  });

  // -------------------------------------------------------------------------
  // STEP 1: CONTENT LAYER (Item 1)
  // -------------------------------------------------------------------------
  console.log('--- Step 1: Content Layer (Item 1) ---');
  
  // Normalization
  const rawTextA = '  Title\tWith\u00ADSoft-Hyphen  and   Spaces \u200B \n Next Line ';
  const normA = checker.normalizeText(rawTextA);
  assertCheck('Normalizes text by removing soft hyphens and collapsing whitespace', normA === 'Title WithSoft-Hyphen and Spaces Next Line');

  // Exact match character diff
  const exactDiff = checker.diffCharacters('Hello World! 12345', 'Hello World! 12345');
  assertCheck('Exact matching text yields 1.0 char fidelity ratio (0 diff)', exactDiff.charFidelityRatio === 1.0 && exactDiff.missingChars === 0 && exactDiff.extraChars === 0);

  // Character diff with missing, extra, altered, and reordered characters
  const sourceSample = 'The quick brown fox jumps over the lazy dog 1234567890';
  const outputSample = 'The quik brown fox jumps ovr the lazy dog 1234567890!'; // 'c' missing, 'e' missing, '!' extra
  const sampleDiff = checker.diffCharacters(sourceSample, outputSample);
  assertCheck('Detects missing characters accurately (missing c and e)', sampleDiff.missingChars >= 2);
  assertCheck('Detects extra characters accurately (extra !)', sampleDiff.extraChars >= 1);
  assertCheck('Computes non-zero Levenshtein distance on character alterations', sampleDiff.levenshteinDist > 0);

  // Content Layer full evaluation with object counts
  const contentEval = checker.evaluateContentLayer(
    {
      rawText: 'Quarterly Executive Summary and Financial Metrics Report',
      pageCount: 3,
      imageCount: 2,
      tableCount: 1,
      linkCount: 4,
      listCount: 2
    },
    {
      rawText: 'Quarterly Executive Summary and Financial Metrics Report',
      pageCount: 3,
      imageCount: 2,
      tableCount: 1,
      linkCount: 4,
      listCount: 2
    }
  );
  assertCheck('Content Layer passes with 100% score on identical content', contentEval.passed && contentEval.score === 100);
  assertCheck('Compares structural object counts (pages, images, tables, links, lists)', contentEval.objectCounts.matches.pages && contentEval.objectCounts.matches.tables);

  // -------------------------------------------------------------------------
  // STEP 2: STYLE LAYER (Item 2)
  // -------------------------------------------------------------------------
  console.log('\n--- Step 2: Style Layer (Item 2) ---');

  const sourceRuns = [
    { text: 'Header Title', fontFamily: 'Helvetica-Bold', fontSize: 20, bold: true, color: '#1A1A1A' },
    { text: 'Red Alert Text Warning', fontFamily: 'Times-Roman', fontSize: 12, bold: false, color: '#E11D48' },
    { text: 'Subscript Two', fontFamily: 'Helvetica', fontSize: 8, baselineOffset: -25000, color: '#000000' },
    { text: 'Highlighted Section', fontFamily: 'Helvetica', fontSize: 11, highlight: '#FEF08A', color: '#000000' },
    { text: 'Italicized Note', fontFamily: 'Times-Italic', fontSize: 10, italic: true, color: '#333333' }
  ];

  const outputRuns = [
    { text: 'Header Title', fontFamily: 'Arial', fontSize: 20, bold: true, color: '#1A1A1A' },
    { text: 'Red Alert Text Warning', fontFamily: 'Times New Roman', fontSize: 12, bold: false, color: '#E11D48' },
    { text: 'Subscript Two', fontFamily: 'Arial', fontSize: 8, baselineOffset: -25000, color: '#000000' },
    { text: 'Highlighted Section', fontFamily: 'Arial', fontSize: 11, highlight: '#FEF08A', color: '#000000' },
    { text: 'Italicized Note', fontFamily: 'Times New Roman', fontSize: 10, italic: true, color: '#333333' }
  ];

  const styleEval = checker.evaluateStyleLayer(sourceRuns, outputRuns);
  assertCheck('Style Layer passes with high score (>= 92.0%)', styleEval.passed && styleEval.score >= 92.0);
  assertCheck('Reports exact Red Text character counts (22 chars source vs 22 chars output)', styleEval.attributeAudit.redColor.sourceChars === 22 && styleEval.attributeAudit.redColor.outputChars === 22);
  assertCheck('Matches Bold Text character counts (12 chars source vs 12 chars output)', styleEval.attributeAudit.bold.sourceChars === 12 && styleEval.attributeAudit.bold.outputChars === 12);
  assertCheck('Matches Highlighted character counts (19 chars source vs 19 chars output)', styleEval.attributeAudit.highlight.sourceChars === 19 && styleEval.attributeAudit.highlight.outputChars === 19);
  assertCheck('Matches Subscript character counts (13 chars source vs 13 chars output)', styleEval.attributeAudit.subscript.sourceChars === 13 && styleEval.attributeAudit.subscript.outputChars === 13);
  assertCheck('Confirms zero unexpected font families in output', styleEval.fonts.clean === true && styleEval.fonts.unexpected.length === 0);

  // -------------------------------------------------------------------------
  // STEP 3: VISUAL LAYER (Item 3)
  // -------------------------------------------------------------------------
  console.log('\n--- Step 3: Visual Layer (Item 3) ---');
  const w = 300, h = 300;
  const totalPixels = w * h;

  // Buffer A: White canvas with red band
  const bufA = Buffer.alloc(totalPixels * 3, 255);
  for (let y = 50; y < 100; y++) {
    for (let x = 50; x < 250; x++) {
      const idx = (y * w + x) * 3;
      bufA[idx] = 225;     // R
      bufA[idx + 1] = 29;  // G
      bufA[idx + 2] = 72;  // B
    }
  }

  // Buffer B: Identical to Buffer A
  const bufB = Buffer.from(bufA);

  const ssimIdentical = checker.computeSSIM(bufA, bufB, w, h);
  assertCheck('SSIM of identical buffers equals 1.0000', Math.abs(ssimIdentical - 1.0) < 0.0001);

  const histIdentical = checker.computeColorHistogramMatch(bufA, bufB, w, h);
  assertCheck('Color histogram intersection coefficient of identical buffers equals 1.0000', histIdentical.intersectionCoefficient === 1.0);

  const regionIdentical = checker.computeRegionDiffs(bufA, bufB, w, h);
  assertCheck('3x3 Region diffs on identical buffers yield 0% diff across all 9 regions', regionIdentical.maxDiffPercent === 0 && regionIdentical.allRegionsPassed);

  // Buffer C: Modified buffer with missing rectangle in Top-Center region
  const bufC = Buffer.from(bufA);
  for (let y = 50; y < 100; y++) {
    for (let x = 100; x < 200; x++) {
      const idx = (y * w + x) * 3;
      bufC[idx] = 255; bufC[idx + 1] = 255; bufC[idx + 2] = 255; // cleared to white
    }
  }

  const ssimModified = checker.computeSSIM(bufA, bufC, w, h);
  assertCheck('SSIM correctly reflects visual alteration (< 1.00)', ssimModified < 1.0 && ssimModified > 0.40);

  const regionModified = checker.computeRegionDiffs(bufA, bufC, w, h);
  assertCheck('3x3 Region diff isolates divergence to Top-Center region', regionModified.regions.find(r => r.name === 'Top-Center').diffPercent > 0);

  const visualEval = checker.evaluateVisualLayer('test_visual_audit', bufA, bufB, w, h);
  assertCheck('Visual Layer passes for compliant renders', visualEval.passed && visualEval.ssim >= 0.90);
  assertCheck('Saves visual diff BMP image to reports/visual-diff/', fs.existsSync(visualEval.diffImagePath));

  // -------------------------------------------------------------------------
  // STEP 4: VALIDITY LAYER (Item 4)
  // -------------------------------------------------------------------------
  console.log('\n--- Step 4: Validity Layer (Item 4) ---');

  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types></Types>');
  zip.file('_rels/.rels', '<Relationships></Relationships>');
  zip.file('docProps/core.xml', '<cp:coreProperties></cp:coreProperties>');
  zip.file('docProps/app.xml', '<Properties></Properties>');
  zip.file('ppt/presentation.xml', '<p:presentation></p:presentation>');
  zip.file('ppt/slides/slide1.xml', `
    <p:sp>
      <a:r>
        <a:rPr>
          <a:solidFill><a:srgbClr val="E11D48"/></a:solidFill>
          <a:latin typeface="Arial"/>
        </a:rPr>
        <a:t>Schema Order Compliant</a:t>
      </a:r>
    </p:sp>
  `);

  const validityEval = await checker.evaluateValidityLayer(zip, 'pptx', { JSZip });
  assertCheck('Validity layer confirms presence of all OpenXML package parts', validityEval.schemaValid === true);
  assertCheck('Strict XML schema child-order guard reports 0 violations in <a:rPr>', validityEval.xmlOrderViolations === 0);
  assertCheck('Dual reader validation checks pass', validityEval.reader1Pass && validityEval.reader2Pass);
  assertCheck('Validity score is 100.0% for valid package', validityEval.score === 100);

  // -------------------------------------------------------------------------
  // STEP 5: COMBINED SCORING, THRESHOLDS & GATING (Item 5)
  // -------------------------------------------------------------------------
  console.log('\n--- Step 5: Combined Scoring, Thresholds & Lossy Gating (Item 5) ---');

  const validContext = {
    name: 'test_pass_conversion',
    source: {
      rawText: 'Financial Performance Review 2026',
      runs: sourceRuns,
      pageCount: 1,
      imageCount: 1
    },
    output: {
      rawText: 'Financial Performance Review 2026',
      runs: outputRuns,
      pageCount: 1,
      imageCount: 1,
      zip
    },
    format: 'pptx',
    visualBuffers: { source: bufA, output: bufB, width: w, height: h },
    JSZip
  };

  const report = await checker.evaluateConversion(validContext);
  assertCheck('Combined overall fidelity score meets threshold (>= 95.0%)', report.overallScore >= 95.0, `Score: ${report.overallScore}%`);
  assertCheck('Overall status is marked as PASSED', report.passed === true);
  assertCheck('Contains per-element-class score card (content, typography, color, layout, visual, validity)',
    report.elementClassScores.text_content !== undefined &&
    report.elementClassScores.typography_fonts !== undefined &&
    report.elementClassScores.package_validity === 100);

  // Fixity layer checks
  assertCheck('Fixity layer computes SHA-256 and records fixity status', !!report.layers.fixity && report.layers.fixity.passed);
  assertCheck('Fixity layer includes explicit note that checksums detect change, not cross-format equivalence', report.layers.fixity.note.includes('cannot prove cross-format equivalence'));

  // Strict Failure Gate: below threshold throws error when allowLossy is false
  let threwStrictError = false;
  const failingChecker = new FidelityChecker({
    allowLossy: false,
    thresholds: { overall: 99.9, content: 99.9 }
  });

  try {
    await failingChecker.evaluateConversion({
      name: 'test_strict_fail',
      source: { rawText: 'Original text string ABCDEF', runs: sourceRuns },
      output: { rawText: 'Severely corrupted XYZ', runs: [], zip },
      format: 'pptx',
      visualBuffers: { source: bufA, output: bufC, width: w, height: h },
      JSZip
    });
  } catch (err) {
    threwStrictError = true;
    assertCheck('Strict fidelity gate blocks conversion and throws error with exitCode = 1', err.exitCode === 1);
  }
  assertCheck('Conversion fails loudly when score is below threshold without lossy flag', threwStrictError);

  // Lossy Mode: allowLossy=true passes with warning
  const lossyChecker = new FidelityChecker({
    allowLossy: true,
    thresholds: { overall: 99.9, content: 99.9 }
  });

  const lossyReport = await lossyChecker.evaluateConversion({
    name: 'test_lossy_pass',
    source: { rawText: 'Original text string ABCDEF', runs: sourceRuns },
    output: { rawText: 'Slightly modified text string ABCDE', runs: outputRuns, zip },
    format: 'pptx',
    visualBuffers: { source: bufA, output: bufB, width: w, height: h },
    JSZip
  });
  assertCheck('Lossy mode allows conversion to complete with WARNING_LOSSY_ALLOWED', lossyReport.gateAction === 'WARNING_LOSSY_ALLOWED');

  // -------------------------------------------------------------------------
  // STEP 6: JSON AND HUMAN-READABLE REPORT (Item 6)
  // -------------------------------------------------------------------------
  console.log('\n--- Step 6: JSON & Human-Readable Reports (Item 6) ---');

  assertCheck('JSON report file created and valid', fs.existsSync(report.jsonPath));
  const readJson = JSON.parse(fs.readFileSync(report.jsonPath, 'utf8'));
  assertCheck('JSON report contains overallScore, thresholds, and elementClassScores', readJson.overallScore > 0 && readJson.elementClassScores);

  assertCheck('Markdown human-readable report file created and non-empty', fs.existsSync(report.summaryPath));
  const readMd = fs.readFileSync(report.summaryPath, 'utf8');
  assertCheck('Markdown summary contains Score Card table', readMd.includes('Per-Element-Class Score Card') && readMd.includes('Text Content'));
  assertCheck('Markdown summary contains Exact Style Count Comparison table', readMd.includes('Red Text (#E11D48)') && readMd.includes('Bold Text'));
  assertCheck('Markdown summary contains Ledger of Approximations, Substitutions & Losses', readMd.includes('Ledger of Approximations, Substitutions & Losses'));

  // -------------------------------------------------------------------------
  // FINAL SUITE SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`TOTAL BATCH 6 CHECKS: ${totalChecks}`);
  console.log(`PASSED:               ${passedChecks}`);
  console.log(`FAILED:               ${failures.length}`);
  console.log(`FIDELITY GATE:        ${failures.length === 0 ? 'PASSED (100.0%)' : 'FAILED'}`);
  console.log('===============================================================\n');

  if (failures.length > 0) {
    console.error('❌ BATCH 6 TEST FAILURES:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f.desc} (${f.details})`));
    process.exit(1);
  } else {
    console.log('🎉 ALL BATCH 6 AUTOMATIC FIDELITY CHECKER TESTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

if (require.main === module) {
  runFidelityCheckerSuite().catch(err => {
    console.error('Suite execution error:', err);
    process.exit(1);
  });
}

module.exports = { runFidelityCheckerSuite };
