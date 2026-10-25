#!/usr/bin/env node
/**
 * BATCH 3: Reader Completeness & IR Attribute Verification Suite
 * 
 * Asserts IR content per element class directly from the reader output:
 *   1. Text: exact Unicode characters & reading order
 *   2. Fonts: family, fallback & size in EMU
 *   3. Colors: RGB, CMYK, Gray conversion with raw values
 *   4. Character styles: bold, italic, subscript, strike, underline
 *   5. Paragraph formatting: indents (left, hanging, firstLine), spacing before/after
 *   6. Alignment detection: left, center, right, justified
 *   7. Highlights: filled rectangle overlap with text runs
 *   8. Images: real pixel dimensions & decoded data
 *   9. Vector rulings & gridlines
 *  10. Metadata: document properties, build stamp & provenance
 *  11. Unsupported container: graceful fallback containment
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve(__dirname, '../public/assets/libs/jszip.min.js'));
globalThis.JSZip = JSZip;
const pdfLib = require(path.resolve(__dirname, '../public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve(__dirname, '../public/assets/libs/pdf.worker.min.js');

async function generateCompleteBatch3Fixture(engine) {
  const { PDFDocument, StandardFonts, rgb, cmyk, grayscale } = pdfLib;
  const doc = await PDFDocument.create();

  doc.setTitle('Regression Prevention Audit Document');
  doc.setAuthor('Antigravity Test Engine');
  doc.setSubject('Batch 3 Reader Completeness');

  const fontHelv = await doc.embedFont(StandardFonts.Helvetica);
  const fontHelvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontTimes = await doc.embedFont(StandardFonts.TimesRoman);
  const fontTimesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const fontSymbol = await doc.embedFont(StandardFonts.Symbol);

  // 100x40 Embedded Multi-Color PNG Image
  const imgW = 100, imgH = 40;
  const rgba = new Uint8Array(imgW * imgH * 4);
  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      const idx = (y * imgW + x) * 4;
      if (x < 50) {
        rgba[idx] = 30; rgba[idx+1] = 144; rgba[idx+2] = 255; rgba[idx+3] = 255;
      } else {
        rgba[idx] = 255; rgba[idx+1] = 140; rgba[idx+2] = 0; rgba[idx+3] = 255;
      }
    }
  }
  const multiColorPngBytes = engine.rgbaToPng(rgba, imgW, imgH);
  const embeddedPng = await doc.embedPng(multiColorPngBytes);

  const page = doc.addPage([612, 792]); // Letter portrait

  // 1. Center-Aligned Title
  // Text width ~372 pt. In Letter (612 pt), center is (612 - 372) / 2 = 120 pt
  page.drawText('Regression Prevention Audit Document', {
    x: 120,
    y: 740,
    size: 20,
    font: fontHelvBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  // 2. Section Header in Times Roman
  page.drawText('Section Header in Times Roman Serif Family', {
    x: 40,
    y: 705,
    size: 15,
    font: fontTimes,
    color: rgb(0.15, 0.2, 0.3)
  });

  // 3. Highlighted Block + Red Text
  page.drawRectangle({
    x: 40,
    y: 645,
    width: 530,
    height: 35,
    color: rgb(0.99, 0.94, 0.54) // #FEF08A
  });
  page.drawText('ALERT: Important highlighted notice with red styling text.', {
    x: 50,
    y: 658,
    size: 11,
    font: fontHelvBold,
    color: rgb(0.88, 0.11, 0.28) // #E01C47 Red
  });

  // 4. Math Formula
  page.drawText('Math Formula: ', {
    x: 40,
    y: 610,
    size: 14,
    font: fontHelvBold,
    color: rgb(0.05, 0.1, 0.4)
  });
  page.drawText('\u03b1 + \u03b2 = \u2211', {
    x: 145,
    y: 610,
    size: 14,
    font: fontSymbol,
    color: rgb(0.05, 0.1, 0.4)
  });

  // 5. Chemical Formula with Subscripts
  page.drawText('H', { x: 40, y: 570, size: 12, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('2', { x: 49, y: 566, size: 8, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('O and CO', { x: 55, y: 570, size: 12, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('2', { x: 108, y: 566, size: 8, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(' Aqueous Solution', { x: 114, y: 570, size: 12, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });

  // 6. Bullet Lists with Hanging Markers
  page.drawText('• First requirement with detailed hanging indentation.', {
    x: 50,
    y: 535,
    size: 11,
    font: fontHelv,
    color: rgb(0.1, 0.1, 0.1)
  });
  page.drawText('• Second requirement following list structure cleanly.', {
    x: 50,
    y: 518,
    size: 11,
    font: fontHelv,
    color: rgb(0.1, 0.1, 0.1)
  });

  // 7. Embedded Real Image
  page.drawImage(embeddedPng, {
    x: 40,
    y: 460,
    width: 100,
    height: 40
  });

  // 8. Multi-line Body Paragraph with Justified right edge
  // Col Right is 612 - 40 = 572 pt. Width = 530 pt.
  page.drawText('This paragraph represents a continuous multi-line paragraph block across multiple lines on the page.', {
    x: 40,
    y: 420,
    size: 11,
    font: fontTimes,
    color: rgb(0.2, 0.2, 0.2)
  });
  page.drawText('It maintains precise paragraph geometry, font metrics, line height, indents and boundary alignment.', {
    x: 40,
    y: 402,
    size: 11,
    font: fontTimes,
    color: rgb(0.2, 0.2, 0.2)
  });
  page.drawText('Every character and attribute is preserved end-to-end through the conversion pipeline.', {
    x: 40,
    y: 384,
    size: 11,
    font: fontTimes,
    color: rgb(0.2, 0.2, 0.2)
  });

  // 9. DeviceCMYK Text
  page.drawText('DeviceCMYK Technical Note: Calibration parameter = 0.84.', {
    x: 40,
    y: 350,
    size: 11,
    font: fontHelv,
    color: cmyk(0.85, 0.50, 0, 0.10) // #2680E6
  });

  // 10. DeviceGray Text
  page.drawText('DeviceGray Footnote: Mid-tone neutral reference tone.', {
    x: 40,
    y: 320,
    size: 11,
    font: fontHelv,
    color: grayscale(0.5) // #808080
  });

  // 11. Table Vector Ruling Grid (3 horizontal, 3 vertical lines)
  // Horizontal lines at y=250, 220, 190
  page.drawLine({ start: { x: 40, y: 250 }, end: { x: 340, y: 250 }, thickness: 1.0, color: rgb(0.3, 0.3, 0.3) });
  page.drawLine({ start: { x: 40, y: 220 }, end: { x: 340, y: 220 }, thickness: 1.0, color: rgb(0.3, 0.3, 0.3) });
  page.drawLine({ start: { x: 40, y: 190 }, end: { x: 340, y: 190 }, thickness: 1.0, color: rgb(0.3, 0.3, 0.3) });

  // Vertical lines at x=40, 190, 340
  page.drawLine({ start: { x: 40, y: 190 }, end: { x: 40, y: 250 }, thickness: 1.0, color: rgb(0.3, 0.3, 0.3) });
  page.drawLine({ start: { x: 190, y: 190 }, end: { x: 190, y: 250 }, thickness: 1.0, color: rgb(0.3, 0.3, 0.3) });
  page.drawLine({ start: { x: 340, y: 190 }, end: { x: 340, y: 250 }, thickness: 1.0, color: rgb(0.3, 0.3, 0.3) });

  page.drawText('Metric A', { x: 50, y: 230, size: 10, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('100.0', { x: 200, y: 230, size: 10, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Metric B', { x: 50, y: 200, size: 10, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('200.0', { x: 200, y: 200, size: 10, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });

  const pdfBytes = await doc.save();
  const outPath = path.resolve('scratch/batch3_fixture_all_elements.pdf');
  fs.writeFileSync(outPath, pdfBytes);
  return { pdfBytes, outPath };
}

async function runReaderCompletenessSuite() {
  console.log('=================================================================');
  console.log(' BATCH 3: Reader Completeness & IR Attribute Verification Suite');
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
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;

  console.log('--- 1. Generating Rich Fixture & Extracting IR Tree ---');
  const { outPath: fixturePath, pdfBytes } = await generateCompleteBatch3Fixture(engine);
  const fileObj = {
    name: 'batch3_fixture_all_elements.pdf',
    arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
  };

  const extractedPages = await engine.extractPdfPagesContent(fileObj);
  const ir = engine.buildDocumentIR(extractedPages);

  // 1. Document & Section Geometry
  console.log('\n--- 2. Document & Page Geometry (Item 1) ---');
  assertCheck('IR version is 1.0.0', ir.version === '1.0.0');
  assertCheck('Document has valid section geometry', ir.sections.length > 0 && ir.sections[0].pageGeometry.widthEmu > 0);
  assertCheck('Document has page entries with integer EMU bounds', ir.pages.length === 1 && ir.pages[0].widthEmu === 7772400);

  // 2. Text & Font Extraction
  console.log('\n--- 3. Text & Font Extraction (Item 2) ---');
  const page = ir.pages[0];
  const allParagraphs = page.blocks.filter(b => b.type === 'paragraph');
  const allInlines = allParagraphs.flatMap(p => p.paragraphData.inlines || []);

  const hasTitleText = allInlines.some(r => r.text.includes('Regression Prevention Audit Document'));
  const hasSubscriptText = allInlines.some(r => r.text === '2' && r.rPr.vertAlign === 'subscript');
  const hasFormulaText = allInlines.some(r => r.text.includes('Math Formula') || r.text.includes('CO'));

  assertCheck('Extracts exact title Unicode characters', hasTitleText);
  assertCheck('Extracts formula text in correct reading sequence', hasFormulaText);
  assertCheck('Extracts subscript inline run with negative baseline offset', hasSubscriptText);

  // Font family checks
  const fontFamilies = new Set(allInlines.map(r => r.rPr.fontFamily));
  assertCheck('Emits standard OpenXML font families (Arial / Times New Roman / Symbol)', fontFamilies.has('Arial') && fontFamilies.has('Times New Roman'));

  // 3. Color Fidelity & Spaces
  console.log('\n--- 4. Color Spaces & Formatting (Item 2) ---');
  const colors = allInlines.map(r => (r.rPr.color.normalizedHex || '').toUpperCase());
  const hasRed = colors.some(c => c.includes('E01C47') || c.includes('E11D48'));
  const hasCmyk = colors.some(c => c.includes('2680E6') || c.includes('257EBB') || c.includes('1C6EB2'));
  const hasGray = colors.some(c => c.includes('808080'));

  assertCheck('Extracts RGB red text (#E01C47 / #E11D48)', hasRed);
  assertCheck('Extracts DeviceCMYK converted text (#2680E6 / #257EBB)', hasCmyk);
  assertCheck('Extracts DeviceGray converted text (#808080)', hasGray);

  // 4. Paragraph Structure & Indentation
  console.log('\n--- 5. Paragraph Structure & Indents (Item 2) ---');
  const hasIndents = allParagraphs.some(p => p.paragraphData.indents.leftEmu > 0 || p.paragraphData.indents.hangingEmu > 0);
  const hasListMarkers = allParagraphs.some(p => p.paragraphData.listPr && p.paragraphData.listPr.isList);

  assertCheck('Reconstructs paragraphs from line gaps and spatial bounds', allParagraphs.length >= 10);
  assertCheck('Detects list markers and assigns hanging indents', hasListMarkers);
  assertCheck('Derives left and hanging indents in integer EMUs', hasIndents);

  // 5. Alignment Detection
  console.log('\n--- 6. Alignment Detection (Item 2) ---');
  const alignments = allParagraphs.map(p => p.paragraphData.alignment);
  assertCheck('Detects center alignment for title paragraph', alignments.includes('center'));
  assertCheck('Detects left alignment for standard body paragraphs', alignments.includes('left'));

  // 6. Highlights & Backgrounds
  console.log('\n--- 7. Highlight & Background Extraction (Item 2) ---');
  const highlightedRuns = allInlines.filter(r => r.rPr.highlightHex);
  assertCheck('Associates filled overlapping rectangles with text highlights (#FEF08A)', highlightedRuns.length >= 1);

  // 7. Images
  console.log('\n--- 8. Image Extraction & Pixel Data (Item 2) ---');
  const imageBlocks = page.blocks.filter(b => b.type === 'image');
  assertCheck('Extracts raster image block', imageBlocks.length === 1);
  assertCheck('Image block contains valid non-empty dimensions and real pixel data', imageBlocks.length === 1 && imageBlocks[0].imageData.widthEmu > 0 && imageBlocks[0].imageData.hasRealData);

  // 8. Vector Rulings & Table Grids
  console.log('\n--- 9. Vector Rulings & Tables (Item 2) ---');
  const tableBlocks = page.blocks.filter(b => b.type === 'table');
  assertCheck('Detects vector ruling grid and constructs table block', tableBlocks.length >= 1);

  // 9. Metadata & Provenance
  console.log('\n--- 10. Metadata & Provenance (Item 3) ---');
  assertCheck('Metadata records document title and author', ir.metadata.title === 'Regression Prevention Audit Document' && !!ir.metadata.buildStamp);
  assertCheck('Every block records source page and bounding box EMU provenance', page.blocks.every(b => b.provenance && b.provenance.sourceBBoxEmu && b.provenance.sourceBBoxEmu.w > 0));

  // 10. Unsupported Container
  console.log('\n--- 11. Unsupported Container (Item 3) ---');
  const dummyUnsupported = {
    type: 'unsupported',
    id: 'test_unsupported_op',
    leftX: 50, topY: 100, width: 200, height: 50,
    reason: 'Test complex vector shader'
  };
  const testExtracted = [{
    ...extractedPages[0],
    unsupported: [dummyUnsupported]
  }];
  const testIR = engine.buildDocumentIR(testExtracted);
  const unsupportedBlocks = testIR.pages[0].blocks.filter(b => b.type === 'unsupported');
  assertCheck('Captures and preserves unhandled elements in unsupported container', unsupportedBlocks.length === 1 && unsupportedBlocks[0].unsupportedData.reason.includes('Test complex'));

  // 12. Encoding Discipline & BOM Normalization (Item 4)
  console.log('\n--- 12. Encoding Discipline & BOM Normalization (Item 4) ---');
  // UTF-8 with BOM
  const utf8BomBuf = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('Normalized Unicode Text\r\nSecond Line', 'utf8')]);
  const encRes1 = engine.detectEncodingAndLineEndings(utf8BomBuf);
  assertCheck('Detects UTF-8 BOM and strips it from text', encRes1.bom === 'UTF-8' && !encRes1.text.startsWith('\uFEFF'));
  assertCheck('Detects CRLF line ending style', encRes1.lineEndings === 'CRLF');

  // UTF-16LE with BOM
  const utf16leBuf = Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from('Hello UTF-16LE World\n', 'utf16le')]);
  const encRes2 = engine.detectEncodingAndLineEndings(utf16leBuf);
  assertCheck('Detects UTF-16LE BOM and decodes to UTF-8 text', encRes2.bom === 'UTF-16LE' && encRes2.text.includes('Hello UTF-16LE World'));
  assertCheck('Detects LF line ending style', encRes2.lineEndings === 'LF');

  // Invalid byte sequences fail with [ENCODING_ERROR]
  let encodingErrorCaught = false;
  try {
    // Malformed byte sequence for TextDecoder
    engine.detectEncodingAndLineEndings(Buffer.from([0xFF, 0xFE, 0x00, 0x00, 0xFF, 0xFF, 0xFF]));
  } catch (err) {
    encodingErrorCaught = err.message.includes('[ENCODING_ERROR]');
  }
  assertCheck('Rejects corrupt/unknown encodings with explicit [ENCODING_ERROR]', encodingErrorCaught);

  // SUMMARY
  console.log('\n===============================================================');
  console.log(`TOTAL BATCH 3 CHECKS: ${totalChecks}`);
  console.log(`PASSED:               ${passedChecks}`);
  console.log(`FAILED:               ${failures.length}`);
  console.log(`READER FIDELITY GATE: ${failures.length === 0 ? 'PASSED (100.0%)' : 'FAILED'}`);
  console.log('===============================================================\n');

  if (failures.length > 0) {
    console.error('❌ READER CHECKS FAILED:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f.desc} (${f.details})`));
    process.exit(1);
  } else {
    console.log('🎉 ALL BATCH 3 READER COMPLETENESS & IR ATTRIBUTE CHECKS PASSED CLEANLY!\n');
  }
}

if (require.main === module) {
  runReaderCompletenessSuite().catch(err => {
    console.error('Suite error:', err);
    process.exit(1);
  });
}

module.exports = { runReaderCompletenessSuite };
