/**
 * BATCH 5: Exact Positions, Unit System, and Text Fit Verification Suite
 * 
 * Verifies:
 *   1. Single Unit System (EMU ground-truth) & conversion table boundaries (pt, twips, mm, px, cells)
 *   2. Rotated pages/text (90, 180, 270 degrees) and coordinate transformations
 *   3. Negative or off-page coordinate clamping & visibility guards
 *   4. Mixed page sizes across multiple sections
 *   5. Scaled output fit rules: contain, cover, stretch (with font and spacing scaling)
 *   6. Font substitution and real metrics measurement (preventing inset clipping)
 *   7. Unusual inputs: tiny/huge pages, tall/narrow, landscape, dense text, RTL, CJK, edge-touching text
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve(__dirname, '../public/assets/libs/jszip.min.js'));
globalThis.JSZip = JSZip;

const pdfLib = require(path.resolve(__dirname, '../public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve(__dirname, '../public/assets/libs/pdf.worker.min.js');

async function runExactFitAndMetricsSuite() {
  console.log('=================================================================');
  console.log(' BATCH 5: Exact Fit, Geometry, and Font Metrics Test Suite');
  console.log('=================================================================\n');

  let totalChecks = 0;
  let passedChecks = 0;
  const failures = [];

  function assertCheck(desc, condition, details = '') {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✓ [PASS] ${desc}`);
    } else {
      failures.push({ desc, details });
      console.error(`  ❌ [FAIL] ${desc}${details ? ': ' + details : ''}`);
    }
  }

  const enginePath = path.resolve(__dirname, '../public/assets/converter-engine.js');
  const mod = await import(pathToFileURL(enginePath).href);
  const { ConverterEngine, Units } = mod;
  const engine = new ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;

  // 1. Single Unit System & Conversion Boundaries
  console.log('--- Step 1: Single Unit System & Boundary Testing (Item 1) ---');
  assertCheck('1 inch equals exactly 914,400 EMUs', Units.EMU_PER_INCH === 914400);
  assertCheck('1 pt equals exactly 12,700 EMUs', Units.ptToEmu(1) === 12700);
  assertCheck('12,700 EMUs equals exactly 1 pt', Units.emuToPt(12700) === 1);
  assertCheck('1 twip / DXA equals exactly 635 EMUs', Units.twipsToEmu(1) === 635);
  assertCheck('20 twips equals 12,700 EMUs (1 pt)', Units.twipsToEmu(20) === 12700);
  assertCheck('1 mm equals exactly 36,000 EMUs', Units.mmToEmu(1) === 36000);
  assertCheck('25.4 mm equals 914,400 EMUs (1 inch)', Units.mmToEmu(25.4) === 914400);
  assertCheck('96 px at 96 DPI equals 914,400 EMUs (1 inch)', Units.pxToEmu(96, 96) === 914400);
  assertCheck('72 px at 72 DPI equals 914,400 EMUs (1 inch)', Units.pxToEmu(72, 72) === 914400);
  assertCheck('300 px at 300 DPI equals 914,400 EMUs (1 inch)', Units.pxToEmu(300, 300) === 914400);
  assertCheck('Zero value converts to zero across all units', Units.ptToEmu(0) === 0 && Units.emuToPt(0) === 0 && Units.twipsToEmu(0) === 0);
  assertCheck('Sub-pixel 1 EMU round-trip does not produce NaN or overflow', !isNaN(Units.emuToPt(1)) && Units.emuToPt(1) > 0);

  // 2. Rotated Pages & Coordinate Transformations
  console.log('\n--- Step 2: Rotated Pages & Coordinate Transforms (Item 2) ---');
  const rot90 = engine.transformRotatedCoordinates({
    x: 50, y: 100, width: 200, height: 20, rotation: 90, pageWidth: 600, pageHeight: 800
  });
  assertCheck('90° rotation swaps page width and height (600x800 -> 800x600)', rot90.pageWidth === 800 && rot90.pageHeight === 600);
  assertCheck('90° rotation transforms coordinates to upright presentation', rot90.x === 100 && rot90.y === 350 && rot90.width === 20 && rot90.height === 200);

  const rot180 = engine.transformRotatedCoordinates({
    x: 50, y: 100, width: 200, height: 20, rotation: 180, pageWidth: 600, pageHeight: 800
  });
  assertCheck('180° rotation inverts coordinates on both axes', rot180.x === 350 && rot180.y === 680);

  const rot270 = engine.transformRotatedCoordinates({
    x: 50, y: 100, width: 200, height: 20, rotation: 270, pageWidth: 600, pageHeight: 800
  });
  assertCheck('270° rotation swaps page dimensions and maps coordinates', rot270.pageWidth === 800 && rot270.pageHeight === 600 && rot270.y === 50);

  // 3. Negative and Off-Page Coordinates Clamping
  console.log('\n--- Step 3: Negative / Off-Page Coordinates Clamping (Item 2) ---');
  const clampedNeg = engine.clampCoordinatesToPage({
    x: -25, y: -10, width: 100, height: 50, pageWidth: 600, pageHeight: 800
  });
  assertCheck('Clamps negative x and y to 0 without discarding element', clampedNeg.x === 0 && clampedNeg.y === 0 && clampedNeg.wasClamped);

  const clampedOff = engine.clampCoordinatesToPage({
    x: 650, y: 850, width: 100, height: 50, pageWidth: 600, pageHeight: 800
  });
  assertCheck('Detects off-page coordinate overflow and flags isOffPage', clampedOff.isOffPage);

  // 4. Scaled Output & Fit Rules (contain / cover / stretch)
  console.log('\n--- Step 4: Scaled Output Fit Rules & Font Scaling (Item 2) ---');
  // Letter (612x792) to A4 (595.28x841.89)
  const fitContain = engine.computeScaledGeometry({
    srcW: 612, srcH: 792, targetW: 595.28, targetH: 841.89, fitRule: 'contain'
  });
  assertCheck('Fit "contain" scales proportionally and centers content', fitContain.scaleX === fitContain.scaleY && fitContain.offsetX === 0 && fitContain.offsetY > 0);
  assertCheck('Fit "contain" applies identical scale factor to fonts and spacing', fitContain.fontScale === fitContain.scaleX && fitContain.spacingScale === fitContain.scaleY);

  const fitCover = engine.computeScaledGeometry({
    srcW: 612, srcH: 792, targetW: 595.28, targetH: 841.89, fitRule: 'cover'
  });
  assertCheck('Fit "cover" scales to fill entire target canvas', fitCover.scaleX >= 1.0 && fitCover.width === 595.28);

  const fitStretch = engine.computeScaledGeometry({
    srcW: 612, srcH: 792, targetW: 595.28, targetH: 841.89, fitRule: 'stretch'
  });
  assertCheck('Fit "stretch" scales independently to exact target bounds', fitStretch.scaleX !== fitStretch.scaleY && fitStretch.width === 595.28 && fitStretch.height === 841.89);

  // 5. Font Metrics & Width Measurement (Preventing Box Inset Clipping)
  console.log('\n--- Step 5: Real Font Metrics Width Measurement (Item 3) ---');
  const asciiWidth = engine.measureTextWidth('Hello World', 12, 'Arial');
  const cjkWidth = engine.measureTextWidth('你好世界', 12, 'SimSun');
  const narrowWidth = engine.measureTextWidth('.......', 12, 'Arial');
  const wideWidth = engine.measureTextWidth('WWWWWWW', 12, 'Arial');

  assertCheck('Measures proportional ASCII text width (> 0)', asciiWidth > 40 && asciiWidth < 80);
  assertCheck('Measures CJK full-width glyphs with full-width multiplier (4 chars * 12 pt = 48 pt)', cjkWidth >= 48);
  assertCheck('Wide characters (W) measure significantly wider than narrow characters (.)', wideWidth > narrowWidth * 2);

  // Documented substitution table
  assertCheck('Maps Helvetica to Arial with documented substitution', engine.resolveFontFamily('Helvetica') === 'Arial');
  assertCheck('Maps Times-Roman to Times New Roman', engine.resolveFontFamily('Times-Roman') === 'Times New Roman');
  assertCheck('Maps Courier to Courier New', engine.resolveFontFamily('Courier') === 'Courier New');
  assertCheck('Maps FoxitSymbol to Symbol', engine.resolveFontFamily('FoxitSymbol') === 'Symbol');

  // 6. Mixed Page Sizes & Multiple Sections
  console.log('\n--- Step 6: Mixed Page Sizes & Multiple Sections (Item 2) ---');
  const multiPageDoc = {
    pages: [
      { pageNumber: 1, width: 612, height: 792, orientation: 'portrait' }, // Letter
      { pageNumber: 2, width: 1224, height: 792, orientation: 'landscape' }, // Tabloid
      { pageNumber: 3, width: 612, height: 792, orientation: 'portrait' }  // Letter
    ]
  };

  const canvasP1 = engine.resolveCanvas(multiPageDoc.pages[0], 'fidelity', 'docx');
  const canvasP2 = engine.resolveCanvas(multiPageDoc.pages[1], 'fidelity', 'docx');
  assertCheck('Page 1 derives Letter portrait canvas (612x792 pt, 12240x15840 twips)', canvasP1.orientation === 'portrait' && canvasP1.wTwips === 12240);
  assertCheck('Page 2 derives Tabloid landscape canvas (1224x792 pt, 24480x15840 twips)', canvasP2.orientation === 'landscape' && canvasP2.wTwips === 24480);
  assertCheck('Detects mixed page size transition triggering distinct OpenXML section', canvasP1.wTwips !== canvasP2.wTwips);

  // 7. Unusual Inputs & Extreme Geometries
  console.log('\n--- Step 7: Unusual Inputs & Extreme Geometries (Item 4) ---');
  
  // Tiny Page (100x100 pt)
  const tinyCanvas = engine.resolveCanvas({ width: 100, height: 100 }, 'fidelity', 'pdf');
  assertCheck('Handles tiny page (100x100 pt) with integer EMU sizing (1,270,000 EMU)', tinyCanvas.cxEmu === 1270000 && tinyCanvas.cyEmu === 1270000);

  // Huge Page (2000x3000 pt)
  const hugeCanvas = engine.resolveCanvas({ width: 2000, height: 3000 }, 'fidelity', 'pdf');
  assertCheck('Handles huge page (2000x3000 pt) with integer EMU sizing (25,400,000x38,100,000 EMU)', hugeCanvas.cxEmu === 25400000 && hugeCanvas.cyEmu === 38100000);

  // Tall Narrow Page (200x1000 pt)
  const tallCanvas = engine.resolveCanvas({ width: 200, height: 1000 }, 'fidelity', 'pdf');
  assertCheck('Handles tall narrow page (200x1000 pt, portrait)', tallCanvas.orientation === 'portrait' && tallCanvas.heightPt === 1000);

  // Landscape Page (800x400 pt)
  const landCanvas = engine.resolveCanvas({ width: 800, height: 400 }, 'fidelity', 'pdf');
  assertCheck('Handles wide landscape page (800x400 pt, landscape)', landCanvas.orientation === 'landscape' && landCanvas.widthPt === 800);

  // RTL Text (Arabic & Hebrew)
  const rtlArabic = 'مرحبا بالعالم';
  const rtlHebrew = 'שלום עולם';
  const arabicWidth = engine.measureTextWidth(rtlArabic, 12, 'Arial');
  const hebrewWidth = engine.measureTextWidth(rtlHebrew, 12, 'Arial');
  assertCheck('Measures and accommodates RTL Arabic text width without error', arabicWidth > 0);
  assertCheck('Measures and accommodates RTL Hebrew text width without error', hebrewWidth > 0);

  // CJK Multi-language Text
  const cjkMulti = '你好世界 안녕하세요 こんにちは世界';
  const cjkMultiWidth = engine.measureTextWidth(cjkMulti, 12, 'Arial');
  assertCheck('Accommodates combined CJK (Chinese, Korean, Japanese) multi-script text', cjkMultiWidth > 150);

  // Text Touching Page Edges
  const edgeTouchLeft = engine.clampCoordinatesToPage({ x: 0, y: 50, width: 200, height: 20, pageWidth: 612, pageHeight: 792 });
  const edgeTouchRight = engine.clampCoordinatesToPage({ x: 602, y: 50, width: 20, height: 20, pageWidth: 612, pageHeight: 792 });
  assertCheck('Safely positions text touching left page edge (x = 0)', edgeTouchLeft.x === 0 && !edgeTouchLeft.isOffPage);
  assertCheck('Safely clamps text touching right page edge without clipping to 0 width', edgeTouchRight.width === 10 && !edgeTouchRight.isOffPage);

  // 8. Multi-Script & Complex Unicode Round-Trip Testing (Batch 6 Item 1)
  console.log('\n--- Step 8: Multi-Script & Complex Unicode Round-Trip Testing (Item 1) ---');
  const complexUnicodeSample = 'CJK: 你好世界 안녕하세요 こんにちは | RTL: مرحبا بالعالم שלום עולם | Emoji: 🚀🎉🔥 | Math: 𝛂 + 𝛃 = ∑ | Combining: e\u0301';
  const textBlob = {
    name: 'unicode_sample.txt',
    text: async () => complexUnicodeSample,
    arrayBuffer: async () => Buffer.from(complexUnicodeSample, 'utf8')
  };
  const roundtripMd = await engine.convertTextOrMarkdown(textBlob, 'md');
  const roundtripText = await roundtripMd.blob.text();

  assertCheck('Unicode CJK characters survive text round-trip identically', roundtripText.includes('你好世界') && roundtripText.includes('안녕하세요'));
  assertCheck('Unicode RTL Arabic and Hebrew survive text round-trip identically', roundtripText.includes('مرحبا بالعالم') && roundtripText.includes('שלום עולם'));
  assertCheck('Unicode high-surrogate Emoji characters survive round-trip', roundtripText.includes('🚀🎉🔥'));
  assertCheck('Unicode Math Alphanumerics (𝛂, 𝛃) survive round-trip', roundtripText.includes('𝛂') && roundtripText.includes('𝛃'));
  assertCheck('Combining marks survive with NFC/canonical normalization', roundtripText.normalize('NFC').includes('é') || roundtripText.includes('e\u0301'));

  console.log('\n===============================================================');
  console.log(`TOTAL BATCH 5 CHECKS: ${totalChecks}`);
  console.log(`PASSED:               ${passedChecks}`);
  console.log(`FAILED:               ${failures.length}`);
  console.log(`EXACT FIT GATE:       ${failures.length === 0 ? 'PASSED (100.0%)' : 'FAILED'}`);
  console.log('===============================================================\n');

  if (failures.length > 0) {
    console.error('FAILURES:');
    failures.forEach(f => console.error(` - ${f.desc}: ${f.details}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL BATCH 5 EXACT POSITIONS, FIT & METRICS CHECKS PASSED CLEANLY!\n');
  }
}

runExactFitAndMetricsSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
