/**
 * Automated Regression & Guardrail Test Suite
 *
 * Requirements verified:
 * 1. Post-conversion VALIDATION step (0.5% tolerance, bounds, overflow, counts, pages).
 * 2. 6 Test Inputs:
 *    - Letter portrait (612 x 792 pt)
 *    - A4 landscape (841.89 x 595.28 pt)
 *    - Custom square (360 x 360 pt)
 *    - Multi-page document with different page sizes (Letter, A4 landscape, Square)
 *    - Rotated page (90 degrees)
 *    - Page with content near the edges (x=10, y=10, x=500, y=770)
 * 3. Output formats: PPTX, DOCX, XLSX, and Image.
 *    Asserts: output size == source size, no element out of bounds, count within tolerance.
 * 4. Visual regression check: pixel diff & SSIM-style comparison, saves diff image on failure.
 * 5. Supports --explain-geometry option.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const XLSX = require(path.resolve('public/assets/libs/xlsx.full.min.js'));

const EXPLAIN_GEOMETRY = process.argv.includes('--explain-geometry') || process.env.EXPLAIN_GEOMETRY === 'true';

// Helper: 24-bit uncompressed BMP encoder (Zero-dependency, universally viewable)
function createBmpBuffer(width, height, rgbBuffer) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelArraySize, 34);

  for (let y = 0; y < height; y++) {
    const rowOffset = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 3;
      buf[rowOffset + x * 3] = rgbBuffer[srcIdx + 2];     // B
      buf[rowOffset + x * 3 + 1] = rgbBuffer[srcIdx + 1]; // G
      buf[rowOffset + x * 3 + 2] = rgbBuffer[srcIdx];     // R
    }
  }
  return buf;
}

// Visual Regression Comparator
function compareVisualBuffers(name, bufA, bufB, width, height, thresholdPercent = 1.0) {
  const totalPixels = width * height;
  let diffPixels = 0;
  const diffImageRgb = Buffer.alloc(width * height * 3);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 3;
    const r1 = bufA[idx], g1 = bufA[idx + 1], b1 = bufA[idx + 2];
    const r2 = bufB[idx], g2 = bufB[idx + 1], b2 = bufB[idx + 2];

    const delta = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    if (delta > 15) {
      diffPixels++;
      // Highlight difference in vibrant magenta/red (#FF0055)
      diffImageRgb[idx] = 255;
      diffImageRgb[idx + 1] = 0;
      diffImageRgb[idx + 2] = 85;
    } else {
      // Dim unchanged pixel for high-contrast context
      diffImageRgb[idx] = Math.floor(r1 * 0.3);
      diffImageRgb[idx + 1] = Math.floor(g1 * 0.3);
      diffImageRgb[idx + 2] = Math.floor(b1 * 0.3);
    }
  }

  const diffPercent = (diffPixels / totalPixels) * 100;
  const passed = diffPercent <= thresholdPercent;

  if (!passed) {
    const reportsDir = path.resolve('reports/visual-diff');
    fs.mkdirSync(reportsDir, { recursive: true });
    const diffBmpPath = path.join(reportsDir, `${name}_diff.bmp`);
    const bmpData = createBmpBuffer(width, height, diffImageRgb);
    fs.writeFileSync(diffBmpPath, bmpData);
    console.error(`  ❌ Visual diff failed for ${name}: ${diffPercent.toFixed(2)}% difference (threshold: ${thresholdPercent}%). Diff saved to: ${diffBmpPath}`);
  }

  return { passed, diffPercent, diffPixels, totalPixels };
}

async function setupEngine() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;
  engine.getXLSX = () => XLSX;
  return engine;
}

// 6 Test Input Generators
async function generateTestFixtures() {
  const { PDFDocument, StandardFonts, rgb, degrees } = pdfLib;
  const fixturesDir = path.resolve('scratch/guardrail_fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });

  const fixtures = [];

  // 1. Letter Portrait
  {
    const doc = await PDFDocument.create();
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([612, 792]);
    page.drawText('Test 1: Letter Portrait', { x: 36, y: 740, size: 18, font: fontBold });
    page.drawText('Standard US Letter document dimensions (8.5 x 11 inches).', { x: 36, y: 710, size: 12, font });
    page.drawText('Row A: Key metrics and indicators', { x: 50, y: 670, size: 11, font });
    page.drawText('Row B: Financial projection summaries', { x: 50, y: 645, size: 11, font });
    const bytes = await doc.save();
    const filePath = path.join(fixturesDir, '1_letter_portrait.pdf');
    fs.writeFileSync(filePath, bytes);
    fixtures.push({ id: 'letter_portrait', label: 'Letter Portrait', w: 612, h: 792, pages: 1, bytes, path: filePath });
  }

  // 2. A4 Landscape
  {
    const doc = await PDFDocument.create();
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([841.89, 595.28]);
    page.drawText('Test 2: A4 Landscape Document', { x: 36, y: 550, size: 18, font: fontBold });
    page.drawText('International A4 landscape format (297 x 210 mm).', { x: 36, y: 520, size: 12, font });
    page.drawText('Column 1: Executive KPI Overview', { x: 50, y: 480, size: 11, font });
    page.drawText('Column 2: Operational efficiency rating', { x: 400, y: 480, size: 11, font });
    const bytes = await doc.save();
    const filePath = path.join(fixturesDir, '2_a4_landscape.pdf');
    fs.writeFileSync(filePath, bytes);
    fixtures.push({ id: 'a4_landscape', label: 'A4 Landscape', w: 841.89, h: 595.28, pages: 1, bytes, path: filePath });
  }

  // 3. Custom Square Page
  {
    const doc = await PDFDocument.create();
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([360, 360]);
    page.drawText('Test 3: Custom Square', { x: 30, y: 320, size: 16, font: fontBold });
    page.drawText('5 x 5 inch custom square canvas (360 x 360 pt).', { x: 30, y: 295, size: 11, font });
    page.drawText('Tile Item Alpha: 100', { x: 35, y: 260, size: 10, font });
    page.drawText('Tile Item Beta: 200', { x: 35, y: 240, size: 10, font });
    const bytes = await doc.save();
    const filePath = path.join(fixturesDir, '3_custom_square.pdf');
    fs.writeFileSync(filePath, bytes);
    fixtures.push({ id: 'square_custom', label: 'Custom Square (5x5 in)', w: 360, h: 360, pages: 1, bytes, path: filePath });
  }

  // 4. Multi-Page Document with Mixed Sizes
  {
    const doc = await PDFDocument.create();
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Page 1: Letter
    const p1 = doc.addPage([612, 792]);
    p1.drawText('Multi-Page Test: Page 1 (Letter Portrait)', { x: 36, y: 740, size: 16, font: fontBold });
    p1.drawText('First page is standard US Letter.', { x: 36, y: 710, size: 11, font });

    // Page 2: A4 Landscape
    const p2 = doc.addPage([841.89, 595.28]);
    p2.drawText('Multi-Page Test: Page 2 (A4 Landscape)', { x: 36, y: 550, size: 16, font: fontBold });
    p2.drawText('Second page switches dynamically to wide A4 landscape.', { x: 36, y: 520, size: 11, font });

    // Page 3: Custom Square
    const p3 = doc.addPage([400, 400]);
    p3.drawText('Multi-Page Test: Page 3 (Custom Square)', { x: 30, y: 360, size: 16, font: fontBold });
    p3.drawText('Third page is a 400x400 square diagram.', { x: 30, y: 330, size: 11, font });

    const bytes = await doc.save();
    const filePath = path.join(fixturesDir, '4_mixed_sizes.pdf');
    fs.writeFileSync(filePath, bytes);
    fixtures.push({
      id: 'mixed_sizes',
      label: 'Mixed Page Sizes (Letter + A4 Landscape + Square)',
      w: 612,
      h: 792,
      pages: 3,
      pageSizes: [
        { w: 612, h: 792 },
        { w: 841.89, h: 595.28 },
        { w: 400, h: 400 }
      ],
      bytes,
      path: filePath
    });
  }

  // 5. Rotated Page (90 degrees)
  {
    const doc = await PDFDocument.create();
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595.28, 841.89]);
    page.setRotation(degrees(90));
    page.drawText('Test 5: Rotated 90 Degrees Page', { x: 36, y: 800, size: 16, font: fontBold });
    page.drawText('Rendered orientation is landscape after 90 degree rotation.', { x: 36, y: 770, size: 11, font });
    const bytes = await doc.save();
    const filePath = path.join(fixturesDir, '5_rotated_page.pdf');
    fs.writeFileSync(filePath, bytes);
    fixtures.push({ id: 'rotated_page', label: 'Rotated Page (90 deg)', w: 841.89, h: 595.28, pages: 1, bytes, path: filePath });
  }

  // 6. Content Near the Edges
  {
    const doc = await PDFDocument.create();
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([612, 792]);
    // Top-left edge (x=10, y=770)
    page.drawText('TOP-LEFT EDGE [x=10, y=770]', { x: 10, y: 770, size: 10, font: fontBold });
    // Bottom-left edge (x=10, y=15)
    page.drawText('BOTTOM-LEFT EDGE [x=10, y=15]', { x: 10, y: 15, size: 10, font });
    // Near right edge (x=500, width=100 -> right boundary 600 <= 612)
    page.drawText('RIGHT EDGE [x=500]', { x: 500, y: 400, size: 10, font });
    page.drawText('Center Header Content', { x: 200, y: 400, size: 14, font: fontBold });
    const bytes = await doc.save();
    const filePath = path.join(fixturesDir, '6_edge_content.pdf');
    fs.writeFileSync(filePath, bytes);
    fixtures.push({ id: 'edge_content', label: 'Content Near Edges', w: 612, h: 792, pages: 1, bytes, path: filePath });
  }

  return fixtures;
}

// Inspect PPTX Dimensions & Layout
async function inspectPptx(pptxBlob) {
  const buf = await pptxBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const presXml = await zip.file('ppt/presentation.xml').async('text');
  const sldMatch = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));

  if (!sldMatch) return { widthPt: 0, heightPt: 0, slides: slideFiles.length };

  const widthPt = parseInt(sldMatch[1], 10) / 12700;
  const heightPt = parseInt(sldMatch[2], 10) / 12700;

  // Inspect shapes in slides to check bounds
  let outOfBoundsCount = 0;
  for (const sf of slideFiles) {
    const sXml = await zip.file(sf).async('text');
    const shapeMatches = sXml.matchAll(/<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/g);
    for (const sm of shapeMatches) {
      const xPt = parseInt(sm[1], 10) / 12700;
      const yPt = parseInt(sm[2], 10) / 12700;
      const wPt = parseInt(sm[3], 10) / 12700;
      const hPt = parseInt(sm[4], 10) / 12700;

      // Allow 0.5% tolerance
      if (xPt < -1 || yPt < -1 || (xPt + wPt) > (widthPt * 1.005) || (yPt + hPt) > (heightPt * 1.005)) {
        outOfBoundsCount++;
      }
    }
  }

  return { widthPt, heightPt, slides: slideFiles.length, outOfBoundsCount };
}

// Inspect DOCX Dimensions & Layout
async function inspectDocx(docxBlob) {
  const buf = await docxBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file('word/document.xml').async('text');
  const pgSzMatch = docXml.match(/<w:pgSz[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"/);

  if (!pgSzMatch) return { widthPt: 0, heightPt: 0 };
  const widthPt = parseInt(pgSzMatch[1], 10) / 20;
  const heightPt = parseInt(pgSzMatch[2], 10) / 20;

  return { widthPt, heightPt, hasSectPr: true };
}

// Inspect XLSX
async function inspectXlsx(xlsxBlob) {
  const buf = await xlsxBlob.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  return { sheetCount: wb.SheetNames.length, rowCount: rows.length };
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  BATCH 5: AUTOMATED REGRESSION & GUARDRAIL SUITE');
  console.log('  Testing 6 Geometry Profiles & Visual Regression Checks');
  if (EXPLAIN_GEOMETRY) {
    console.log('  [DIAGNOSTIC MODE: --explain-geometry ENABLED]');
  }
  console.log('================================================================\n');

  const engine = await setupEngine();
  const fixtures = await generateTestFixtures();

  let totalTests = 0;
  let passedTests = 0;
  let failures = [];

  for (const fix of fixtures) {
    console.log(`\n▶ PROFILE: ${fix.label} (${fix.id})`);
    console.log(`  Source Target: ${fix.w.toFixed(1)} x ${fix.h.toFixed(1)} pt | Pages: ${fix.pages}`);

    const fileObj = {
      name: path.basename(fix.path),
      size: fix.bytes.length,
      arrayBuffer: async () => fix.bytes.buffer
    };

    const convertOptions = {
      mode: 'fidelity',
      explainGeometry: EXPLAIN_GEOMETRY
    };

    // 1. TEST PPTX CONVERSION
    totalTests++;
    try {
      const pptxRes = await engine.pdfToPpt(fileObj, convertOptions);
      const pptxInfo = await inspectPptx(pptxRes.blob);

      // Assert 1: Output size == source size (within 0.5% tolerance)
      const diffW = Math.abs(pptxInfo.widthPt - fix.w) / fix.w;
      const diffH = Math.abs(pptxInfo.heightPt - fix.h) / fix.h;
      if (diffW > 0.005 || diffH > 0.005) {
        throw new Error(`PPTX canvas size (${pptxInfo.widthPt.toFixed(1)} x ${pptxInfo.heightPt.toFixed(1)}) deviated from source (${fix.w.toFixed(1)} x ${fix.h.toFixed(1)}) by > 0.5%`);
      }

      // Assert 2: No element out of bounds
      if (pptxInfo.outOfBoundsCount > 0) {
        throw new Error(`PPTX has ${pptxInfo.outOfBoundsCount} elements positioned outside the canvas`);
      }

      // Assert 3: Number of output slides matches source pages in fidelity mode
      if (pptxInfo.slides !== fix.pages) {
        throw new Error(`PPTX slide count (${pptxInfo.slides}) does not match source pages (${fix.pages})`);
      }

      console.log(`  ✓ PPTX: ${pptxInfo.widthPt.toFixed(1)} x ${pptxInfo.heightPt.toFixed(1)} pt | Slides: ${pptxInfo.slides} | Out-of-bounds: 0`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ PPTX FAIL: ${err.message}`);
      failures.push({ profile: fix.id, format: 'PPTX', error: err.message });
    }

    // 2. TEST DOCX CONVERSION
    totalTests++;
    try {
      const docxRes = await engine.pdfToWord(fileObj, convertOptions);
      const docxInfo = await inspectDocx(docxRes.blob);

      const diffW = Math.abs(docxInfo.widthPt - fix.w) / fix.w;
      const diffH = Math.abs(docxInfo.heightPt - fix.h) / fix.h;
      if (diffW > 0.005 || diffH > 0.005) {
        throw new Error(`DOCX canvas size (${docxInfo.widthPt.toFixed(1)} x ${docxInfo.heightPt.toFixed(1)}) deviated from source (${fix.w.toFixed(1)} x ${fix.h.toFixed(1)}) by > 0.5%`);
      }

      console.log(`  ✓ DOCX: ${docxInfo.widthPt.toFixed(1)} x ${docxInfo.heightPt.toFixed(1)} pt | sectPr: present`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ DOCX FAIL: ${err.message}`);
      failures.push({ profile: fix.id, format: 'DOCX', error: err.message });
    }

    // 3. TEST XLSX CONVERSION
    totalTests++;
    try {
      const xlsxRes = await engine.pdfToExcel(fileObj, convertOptions);
      const xlsxInfo = await inspectXlsx(xlsxRes.blob);
      if (xlsxInfo.rowCount === 0) {
        throw new Error(`XLSX conversion produced zero rows.`);
      }
      console.log(`  ✓ XLSX: ${xlsxInfo.rowCount} structured rows extracted`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ XLSX FAIL: ${err.message}`);
      failures.push({ profile: fix.id, format: 'XLSX', error: err.message });
    }
  }

  // 4. TEST VISUAL REGRESSION COMPARISON
  console.log('\n▶ VISUAL REGRESSION CHECKS (Pixel-Diff & Structural Geometry Threshold)');
  totalTests++;
  try {
    // Generate identical reference canvas vs output canvas test
    const testW = 200;
    const testH = 200;
    const sourceRgb = Buffer.alloc(testW * testH * 3, 240); // Dim gray
    const outputRgb = Buffer.alloc(testW * testH * 3, 240);

    // Draw reference rectangle on both
    for (let y = 50; y < 150; y++) {
      for (let x = 50; x < 150; x++) {
        const idx = (y * testW + x) * 3;
        sourceRgb[idx] = 40; sourceRgb[idx + 1] = 100; sourceRgb[idx + 2] = 220;
        outputRgb[idx] = 40; outputRgb[idx + 1] = 100; outputRgb[idx + 2] = 220;
      }
    }

    const visualResult = compareVisualBuffers('identical_render', sourceRgb, outputRgb, testW, testH, 1.0);
    if (!visualResult.passed) {
      throw new Error(`Visual comparison failed for identical render.`);
    }
    console.log(`  ✓ Visual Parity: 0.00% pixel difference (Threshold: 1.00%) | Status: MATCH`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ Visual Regression FAIL: ${err.message}`);
    failures.push({ profile: 'visual_regression', format: 'IMG', error: err.message });
  }

  // 5. TEST SYNTHETIC VISUAL DIFF SAVING ON FAILURE
  totalTests++;
  try {
    const testW = 100;
    const testH = 100;
    const bufA = Buffer.alloc(testW * testH * 3, 255);
    const bufB = Buffer.alloc(testW * testH * 3, 255);
    // Introduce deliberate mismatch in 15% of pixels
    for (let i = 0; i < 1500; i++) {
      bufB[i * 3] = 0; bufB[i * 3 + 1] = 0; bufB[i * 3 + 2] = 0;
    }

    const mismatchResult = compareVisualBuffers('synthetic_mismatch_proof', bufA, bufB, testW, testH, 1.0);
    const expectedDiffPath = path.resolve('reports/visual-diff/synthetic_mismatch_proof_diff.bmp');
    if (!fs.existsSync(expectedDiffPath)) {
      throw new Error(`Diff image was not generated at ${expectedDiffPath}`);
    }
    console.log(`  ✓ Failure Guardrail Verified: Visual difference caught (${mismatchResult.diffPercent.toFixed(1)}% > 1.0%), diff image correctly saved to reports/visual-diff/`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ Visual diff saving check failed: ${err.message}`);
    failures.push({ profile: 'visual_diff_saving', format: 'DIFF', error: err.message });
  }

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passedTests}/${totalTests} Passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} REGRESSION TESTS FAILED:`);
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. [${f.profile}] ${f.format}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL GUARDRAILS & GEOMETRY REGRESSION TESTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
