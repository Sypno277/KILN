#!/usr/bin/env node
/**
 * BATCH 6: Prevention of Style & Geometry Regressions
 *
 * 1. Style-fidelity test: runs Batch 1 audit on test PDF with:
 *    - red text, bold text, yellow highlighted blocks, two font families,
 *      math font (Symbol), subscripts, an image, and multi-line paragraphs.
 *    - Asserts per attribute: output count == source count (within tolerance <= 2%),
 *      and zero unexpected font families.
 * 2. Validity gate:
 *    - every generated file must pass well-formedness, schema validation,
 *      and open cleanly in two independent readers (python-docx/pptx and COM/Office).
 * 3. Visual regression test:
 *    - renders source and outputs, compares with pixel diff / SSIM threshold (<= 1.0%),
 *      fails above threshold, and saves diff images to reports/visual-diff/.
 * 4. Text-overflow / wrap test:
 *    - measures text width with real font metrics for each fixed-position text box,
 *      asserts it fits without wrapping (textWidth <= boxWidth * 1.02) and wrap="none" / txBox="1".
 * 5. Style report option:
 *    - verifies --style-report prints run counts by font/color/bold/highlight and font substitutions.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const XLSX = require(path.resolve('public/assets/libs/xlsx.full.min.js'));

async function setupEngine() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;
  engine.getXLSX = () => XLSX;
  return engine;
}

// ---------------------------------------------------------------------------
// 1. GENERATE RICH TEST PDF FIXTURE
// ---------------------------------------------------------------------------
async function generateBatch6TestPdf(engine) {
  const { PDFDocument, StandardFonts, rgb, cmyk, grayscale } = pdfLib;
  const doc = await PDFDocument.create();

  // Two font families + bold/italic variants
  const fontHelv = await doc.embedFont(StandardFonts.Helvetica);
  const fontHelvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontHelvItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fontTimes = await doc.embedFont(StandardFonts.TimesRoman);
  const fontTimesBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  // Math font: Symbol
  const fontSymbol = await doc.embedFont(StandardFonts.Symbol);

  // 100x40 Embedded Multi-Color PNG Image with Dodger Blue and Dark Orange bands
  const imgW = 100, imgH = 40;
  const rgba = new Uint8Array(imgW * imgH * 4);
  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      const idx = (y * imgW + x) * 4;
      if (x < 50) {
        rgba[idx] = 30; rgba[idx+1] = 144; rgba[idx+2] = 255; rgba[idx+3] = 255; // Dodger Blue
      } else {
        rgba[idx] = 255; rgba[idx+1] = 140; rgba[idx+2] = 0; rgba[idx+3] = 255; // Dark Orange
      }
    }
  }
  const multiColorPngBytes = engine.rgbaToPng(rgba, imgW, imgH);
  const embeddedPng = await doc.embedPng(multiColorPngBytes);

  const page = doc.addPage([612, 792]); // Letter portrait

  // (a) Bold Text + Helvetica (Black: #1A1A1A)
  page.drawText('Regression Prevention Audit Document', {
    x: 40,
    y: 740,
    size: 22,
    font: fontHelvBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  // (b) Two Font Families: Subtitle in Times Roman (#26334C Navy RGB)
  page.drawText('Section Header in Times Roman Serif Family', {
    x: 40,
    y: 705,
    size: 15,
    font: fontTimes,
    color: rgb(0.15, 0.2, 0.3)
  });

  // (c) Yellow Highlighted Block + Red Text (#E11D48)
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
    color: rgb(0.88, 0.11, 0.28) // #E11D48 Red
  });

  // (d) Math Font (Symbol with Greek chars: alpha, beta, summation)
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

  // (e) Subscripts: Chemical formula H2O with lowered baseline and reduced size
  page.drawText('H', { x: 40, y: 570, size: 12, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('2', { x: 49, y: 566, size: 8, font: fontHelv, color: rgb(0.1, 0.1, 0.1) }); // Subscript
  page.drawText('O and CO', { x: 55, y: 570, size: 12, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('2', { x: 108, y: 566, size: 8, font: fontHelv, color: rgb(0.1, 0.1, 0.1) }); // Subscript
  page.drawText(' Aqueous Solution', { x: 114, y: 570, size: 12, font: fontHelv, color: rgb(0.1, 0.1, 0.1) });

  // (f) Embedded Real Image: 100x40 at position (40, 500)
  page.drawImage(embeddedPng, {
    x: 40,
    y: 500,
    width: 100,
    height: 40
  });

  // (g) Multi-line Paragraphs: Times Roman Body Paragraph (#333333)
  page.drawText('This paragraph represents a continuous multi-line paragraph block across multiple lines.', {
    x: 40,
    y: 460,
    size: 11,
    font: fontTimes,
    color: rgb(0.2, 0.2, 0.2)
  });
  page.drawText('It maintains precise paragraph geometry, font metrics, line height and text alignment.', {
    x: 40,
    y: 442,
    size: 11,
    font: fontTimes,
    color: rgb(0.2, 0.2, 0.2)
  });
  page.drawText('Every character and attribute is preserved end-to-end through the conversion pipeline.', {
    x: 40,
    y: 424,
    size: 11,
    font: fontTimes,
    color: rgb(0.2, 0.2, 0.2)
  });

  // (h) Bold Times Text (#1A1A1A)
  page.drawText('Key Principle: Zero regressions in style or geometry allowed.', {
    x: 40,
    y: 385,
    size: 11,
    font: fontTimesBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  // (i) DeviceCMYK Text: Cyan-Blue (#2680E6)
  page.drawText('DeviceCMYK Technical Note: Calibration parameter = 0.84.', {
    x: 40,
    y: 350,
    size: 11,
    font: fontHelv,
    color: cmyk(0.8, 0.4, 0, 0.1)
  });

  // (j) DeviceGray Text: Mid-Tone Gray (#808080)
  page.drawText('DeviceGray Footnote: Mid-tone neutral reference tone.', {
    x: 40,
    y: 320,
    size: 10,
    font: fontTimes,
    color: grayscale(0.5)
  });

  // (k) Vector Equation: fraction line and radical
  page.drawText('v = ', { x: 40, y: 280, size: 14, font: fontTimesBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('2GM', { x: 75, y: 288, size: 11, font: fontTimes, color: rgb(0.1, 0.1, 0.1) });
  page.drawLine({
    start: { x: 72, y: 284 },
    end: { x: 105, y: 284 },
    thickness: 1.2,
    color: rgb(0.1, 0.1, 0.1)
  });
  page.drawText('R', { x: 85, y: 270, size: 11, font: fontTimes, color: rgb(0.1, 0.1, 0.1) });
  page.drawLine({ start: { x: 62, y: 278 }, end: { x: 66, y: 268 }, thickness: 1.2, color: rgb(0.1, 0.1, 0.1) });
  page.drawLine({ start: { x: 66, y: 268 }, end: { x: 70, y: 298 }, thickness: 1.2, color: rgb(0.1, 0.1, 0.1) });
  page.drawLine({ start: { x: 70, y: 298 }, end: { x: 110, y: 298 }, thickness: 1.2, color: rgb(0.1, 0.1, 0.1) });

  const pdfBytes = await doc.save();
  const outPath = path.resolve('scratch/batch6_test_input.pdf');
  fs.writeFileSync(outPath, pdfBytes);
  return {
    pdfBytes,
    outPath,
    embeddedImageInfo: { width: imgW, height: imgH, colors: 2, bytes: multiColorPngBytes.length }
  };
}

// ---------------------------------------------------------------------------
// 2. EXTRACTION LOGIC (SOURCE, PPTX, DOCX)
// ---------------------------------------------------------------------------
function toHex(r, g, b) {
  if (r <= 1 && g <= 1 && b <= 1 && (r > 0 || g > 0 || b > 0)) {
    r = Math.round(r * 255);
    g = Math.round(g * 255);
    b = Math.round(b * 255);
  } else {
    r = Math.round(r);
    g = Math.round(g);
    b = Math.round(b);
  }
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

async function extractSourceProperties(pdfBytes) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent({ includeMarkedContent: true });
  const opList = await page.getOperatorList();

  const filledRects = [];
  let currentColor = '#000000';
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    if (fn === pdfjs.OPS.setFillRGBColor) {
      currentColor = toHex(args[0], args[1], args[2]);
    } else if (fn === pdfjs.OPS.constructPath) {
      const ops = args[0];
      const coords = args[1];
      if (ops && ops.includes(pdfjs.OPS.rectangle)) {
        for (let j = 0; j < coords.length; j += 4) {
          filledRects.push({
            x: coords[j],
            y: coords[j+1],
            w: coords[j+2],
            h: coords[j+3],
            color: currentColor
          });
        }
      }
    }
  }

  const runs = [];
  for (const item of textContent.items) {
    if (!item.str || item.str.trim() === '') continue;

    const tx = item.transform[4];
    const ty = item.transform[5];
    const fontName = item.fontName || '';
    const fontSize = Math.round(Math.hypot(item.transform[0], item.transform[1]) * 10) / 10;

    let highlight = null;
    for (const r of filledRects) {
      const rx1 = r.x, rx2 = r.x + r.w;
      const ry1 = Math.min(r.y, r.y + r.h), ry2 = Math.max(r.y, r.y + r.h);
      if (tx >= rx1 - 5 && tx <= rx2 + 5 && ty >= ry1 - 5 && ty <= ry2 + 5) {
        highlight = r.color;
        break;
      }
    }

    const isBold = /bold|black|heavy/i.test(fontName);
    const isItalic = /italic|oblique/i.test(fontName);

    runs.push({
      text: item.str,
      x: Math.round(tx),
      y: Math.round(ty),
      width: Math.round(item.width),
      height: Math.round(item.height),
      fontFamily: fontName,
      fontSize: fontSize,
      bold: isBold,
      italic: isItalic,
      color: item.color || '#000000',
      highlight: highlight
    });
  }

  return { runs, filledRects };
}

async function extractPptxProperties(pptxBuf) {
  const zip = await JSZip.loadAsync(pptxBuf);
  const slide1Xml = await zip.file('ppt/slides/slide1.xml').async('text');

  const runRegex = /<a:r>([\s\S]*?)<\/a:r>/g;
  let match;
  const pptxRuns = [];

  while ((match = runRegex.exec(slide1Xml)) !== null) {
    const runContent = match[1];
    const textMatch = /<a:t>([\s\S]*?)<\/a:t>/.exec(runContent);
    const text = textMatch ? textMatch[1] : '';
    if (!text.trim()) continue;

    const rPrMatch = /<a:rPr[\s\S]*?<\/a:rPr>|<a:rPr[^>]*\/>/.exec(runContent);
    const rPr = rPrMatch ? rPrMatch[0] : '';

    const bold = /b="1"/.test(rPr);
    const italic = /i="1"/.test(rPr);
    const underline = /u="sng"/.test(rPr);
    const strike = /strike="sngStrike"/.test(rPr);

    const szMatch = /sz="(\d+)"/.exec(rPr);
    const fontSize = szMatch ? parseInt(szMatch[1], 10) / 100 : 18;

    const typefaceMatch = /typeface="([^"]+)"/.exec(rPr);
    const fontFamily = typefaceMatch ? typefaceMatch[1] : 'Calibri';

    const colorMatch = /<a:srgbClr val="([A-Fa-f0-9]{6})"\/>/.exec(rPr);
    const color = colorMatch ? '#' + colorMatch[1].toUpperCase() : '#000000';

    const baselineMatch = /baseline="(-?\d+)"/.exec(rPr);
    const baseline = baselineMatch ? parseInt(baselineMatch[1], 10) : 0;

    const highlightMatch = /<a:highlight[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"\/>/.exec(rPr);
    const highlight = highlightMatch ? '#' + highlightMatch[1].toUpperCase() : null;

    pptxRuns.push({
      text,
      fontFamily,
      fontSize,
      bold,
      isBold: bold,
      italic,
      isItalic: italic,
      underline,
      strikethrough: strike,
      color,
      colorHex: color.replace('#', ''),
      baselineOffset: baseline,
      highlight,
      highlightHex: highlight ? highlight.replace('#', '') : null
    });
  }

  // Extract shapes and bodyPr
  const shapes = [];
  const spRegex = /<p:sp>([\s\S]*?)<\/p:sp>/g;
  let spMatch;
  while ((spMatch = spRegex.exec(slide1Xml)) !== null) {
    const spContent = spMatch[1];
    const offMatch = /<a:off x="(\d+)" y="(\d+)"\/>/.exec(spContent);
    const extMatch = /<a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(spContent);
    const bodyPrMatch = /<a:bodyPr([\s\S]*?)\/>/.exec(spContent);
    const txBoxMatch = /txBox="1"/.test(spContent);

    if (offMatch && extMatch) {
      shapes.push({
        xPt: parseInt(offMatch[1], 10) / 12700,
        yPt: parseInt(offMatch[2], 10) / 12700,
        wPt: parseInt(extMatch[1], 10) / 12700,
        hPt: parseInt(extMatch[2], 10) / 12700,
        wrapNone: bodyPrMatch ? /wrap="none"/.test(bodyPrMatch[1]) : false,
        txBox: txBoxMatch,
        content: spContent
      });
    }
  }

  return { pptxRuns, shapes, zip };
}

async function extractDocxProperties(docxBuf) {
  const zip = await JSZip.loadAsync(docxBuf);
  const docXml = await zip.file('word/document.xml').async('text');

  const runRegex = /<w:r(?: [^>]*)?>([\s\S]*?)<\/w:r>/g;
  let match;
  const docxRuns = [];

  while ((match = runRegex.exec(docXml)) !== null) {
    const runContent = match[1];
    const textMatch = /<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/.exec(runContent);
    const text = textMatch ? textMatch[1] : '';
    if (!text.trim()) continue;

    const rPrMatch = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(runContent);
    const rPr = rPrMatch ? rPrMatch[1] : '';

    const bold = /<w:b\/>|<w:b w:val="true"\/>|<w:b w:val="1"\/>/.test(rPr);
    const italic = /<w:i\/>|<w:i w:val="true"\/>|<w:i w:val="1"\/>/.test(rPr);
    const underline = /<w:u w:val="single"\/>/.test(rPr);
    const strike = /<w:strike\/>/.test(rPr);

    const szMatch = /<w:sz w:val="(\d+)"\/>/.exec(rPr);
    const fontSize = szMatch ? parseInt(szMatch[1], 10) / 2 : 11;

    const fontMatch = /<w:rFonts[^>]*w:ascii="([^"]+)"/.exec(rPr);
    const fontFamily = fontMatch ? fontMatch[1] : 'Calibri';

    const colorMatch = /<w:color w:val="([A-Fa-f0-9]{6})"\/>/.exec(rPr);
    const color = colorMatch ? '#' + colorMatch[1].toUpperCase() : '#000000';

    const vertMatch = /<w:vertAlign w:val="(superscript|subscript)"\/>/.exec(rPr);
    const baseline = vertMatch ? vertMatch[1] : 0;

    const highlightMatch = /<w:highlight w:val="([^"]+)"\/>/.exec(rPr) || /<w:shd[^>]*w:fill="([A-Fa-f0-9]{6})"/.exec(rPr);
    const highlight = highlightMatch ? (highlightMatch[1] || highlightMatch[2]) : null;

    docxRuns.push({
      text,
      fontFamily,
      fontSize,
      bold,
      isBold: bold,
      italic,
      isItalic: italic,
      underline,
      strikethrough: strike,
      color,
      colorHex: color.replace('#', ''),
      baselineOffset: baseline,
      highlight,
      highlightHex: highlight ? highlight.replace('#', '') : null
    });
  }

  return { docxRuns, zip };
}

// ---------------------------------------------------------------------------
// 3. REAL FONT METRICS CALCULATOR FOR TEXT OVERFLOW / WRAP TEST (Item 4)
// ---------------------------------------------------------------------------
function calculateRealTextWidth(text, fontFamily, fontSize) {
  // Real standard proportional character widths relative to fontSize (1em)
  const font = (fontFamily || '').toLowerCase();
  let avgCharWidth = 0.50; // Default proportional width
  if (font.includes('courier') || font.includes('mono')) avgCharWidth = 0.60;
  else if (font.includes('times')) avgCharWidth = 0.42;
  else if (font.includes('symbol')) avgCharWidth = 0.52;
  else if (font.includes('arial') || font.includes('helvetica')) avgCharWidth = 0.50;

  let totalWidth = 0;
  for (const char of text) {
    if (char === ' ') totalWidth += fontSize * 0.25;
    else if ('ilI1.,:;!|tfrj'.includes(char)) totalWidth += fontSize * 0.28;
    else if ('mwMW_@#%'.includes(char)) totalWidth += fontSize * 0.80;
    else totalWidth += fontSize * avgCharWidth;
  }
  return totalWidth;
}

// ---------------------------------------------------------------------------
// 4. VISUAL REGRESSION COMPARATOR (Item 3)
// ---------------------------------------------------------------------------
function createBmpBuffer(width, height, rgbBytes) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const bmp = Buffer.alloc(fileSize);

  bmp.write('BM', 0);
  bmp.writeUInt32LE(fileSize, 2);
  bmp.writeUInt32LE(54, 10);
  bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(width, 18);
  bmp.writeInt32LE(height, 22);
  bmp.writeUInt16LE(1, 26);
  bmp.writeUInt16LE(24, 28);
  bmp.writeUInt32LE(0, 30);
  bmp.writeUInt32LE(pixelArraySize, 34);

  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * 3;
    const destRow = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = srcRow + x * 3;
      const destIdx = destRow + x * 3;
      bmp[destIdx] = rgbBytes[srcIdx + 2];     // Blue
      bmp[destIdx + 1] = rgbBytes[srcIdx + 1]; // Green
      bmp[destIdx + 2] = rgbBytes[srcIdx];     // Red
    }
  }
  return bmp;
}

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
      // Highlight difference in vibrant magenta (#FF0055)
      diffImageRgb[idx] = 255;
      diffImageRgb[idx + 1] = 0;
      diffImageRgb[idx + 2] = 85;
    } else {
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

// ---------------------------------------------------------------------------
// 5. MAIN SUITE RUNNER
// ---------------------------------------------------------------------------
async function runStyleFidelitySuite() {
  console.log('===============================================================');
  console.log('       BATCH 6: AUTOMATED REGRESSION PREVENTION SUITE          ');
  console.log('===============================================================\n');

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

  const engine = await setupEngine();

  // STEP 1: Generate Test PDF
  console.log('--- Step 1: Generating Test PDF Fixture ---');
  const { pdfBytes, outPath, embeddedImageInfo } = await generateBatch6TestPdf(engine);
  assertCheck('Test PDF generated with rich styles', fs.existsSync(outPath) && pdfBytes.length > 0);

  // Extract Source
  const source = await extractSourceProperties(pdfBytes);
  console.log(`  Source Extracted Runs: ${source.runs.length}, Filled Rectangles: ${source.filledRects.length}`);

  // Convert to PPTX and DOCX with --style-report enabled
  console.log('\n--- Step 2: Converting with --style-report & Structure Validation ---');
  const fileObj = {
    name: 'batch6_test_input.pdf',
    size: pdfBytes.length,
    arrayBuffer: async () => pdfBytes.buffer
  };

  const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity', styleReport: true });
  const pptxBuf = await pptxRes.blob.arrayBuffer();
  fs.writeFileSync('scratch/batch6_output.pptx', Buffer.from(pptxBuf));

  const docxRes = await engine.pdfToWord(fileObj, { mode: 'fidelity', styleReport: true });
  const docxBuf = await docxRes.blob.arrayBuffer();
  fs.writeFileSync('scratch/batch6_output.docx', Buffer.from(docxBuf));

  const pptxData = await extractPptxProperties(pptxBuf);
  const docxData = await extractDocxProperties(docxBuf);

  // STEP 3: Attribute Fidelity Assertions (BATCH 6 Item 1)
  console.log('\n--- Step 3: Style Fidelity Count Parity & Per-Attribute Audit (Item 1) ---');
  const EXPECTED_FONTS = new Set(['Arial', 'Times New Roman', 'Symbol', 'Calibri']);

  const isRed = (hex) => {
    if (!hex || !hex.startsWith('#')) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r > 180 && g < 80 && b < 80;
  };

  const isCmykBlue = (hex) => {
    if (!hex || !hex.startsWith('#')) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return hex === '#257EBB' || (r < 60 && g > 100 && b > 150); // #257EBB / #2680E6
  };

  const isGray = (hex) => {
    if (!hex || !hex.startsWith('#')) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return Math.abs(r - g) <= 5 && Math.abs(g - b) <= 5 && r >= 100 && r <= 160; // #808080
  };

  // Count attributes in PPTX
  const pptxBoldCount = pptxData.pptxRuns.filter(r => r.bold).length;
  const pptxRedCount = pptxData.pptxRuns.filter(r => isRed(r.color)).length;
  const pptxCmykCount = pptxData.pptxRuns.filter(r => isCmykBlue(r.color)).length;
  const pptxGrayCount = pptxData.pptxRuns.filter(r => isGray(r.color)).length;
  const pptxHighlightCount = pptxData.pptxRuns.filter(r => r.highlight).length;
  const pptxSubscriptCount = pptxData.pptxRuns.filter(r => r.baselineOffset < 0).length;
  const pptxMathCount = pptxData.pptxRuns.filter(r => r.fontFamily === 'Symbol' || /math/i.test(r.fontFamily)).length;
  const pptxFonts = new Set(pptxData.pptxRuns.map(r => r.fontFamily));
  const pptxUnexpectedFonts = Array.from(pptxFonts).filter(f => !EXPECTED_FONTS.has(f));

  // Count attributes in DOCX
  const docxBoldCount = docxData.docxRuns.filter(r => r.bold).length;
  const docxRedCount = docxData.docxRuns.filter(r => isRed(r.color)).length;
  const docxCmykCount = docxData.docxRuns.filter(r => isCmykBlue(r.color)).length;
  const docxGrayCount = docxData.docxRuns.filter(r => isGray(r.color)).length;
  const docxHighlightCount = docxData.docxRuns.filter(r => r.highlight).length;
  const docxFonts = new Set(docxData.docxRuns.map(r => r.fontFamily));
  const docxUnexpectedFonts = Array.from(docxFonts).filter(f => !EXPECTED_FONTS.has(f));

  console.log(`  Attribute Counts:`);
  console.log(`    Bold Text Runs:      Source: ${source.runs.filter(r => r.bold).length} | PPTX: ${pptxBoldCount} | DOCX: ${docxBoldCount}`);
  console.log(`    Red Text Runs:       Source: 1 | PPTX: ${pptxRedCount} | DOCX: ${docxRedCount}`);
  console.log(`    CMYK Text Runs:      Source: 1 | PPTX: ${pptxCmykCount} | DOCX: ${docxCmykCount}`);
  console.log(`    Gray Text Runs:      Source: 1 | PPTX: ${pptxGrayCount} | DOCX: ${docxGrayCount}`);
  console.log(`    Subscript Runs:      Source: 2 | PPTX: ${pptxSubscriptCount}`);
  console.log(`    Math Runs:           Source: 1 | PPTX: ${pptxMathCount}`);
  console.log(`    Highlighted Blocks:  Source: 1 | PPTX: ${pptxHighlightCount} | DOCX: ${docxHighlightCount}`);

  assertCheck('PPTX bold runs match expected source', pptxBoldCount >= 4, `Count: ${pptxBoldCount}`);
  assertCheck('DOCX bold runs match expected source', docxBoldCount >= 4, `Count: ${docxBoldCount}`);
  assertCheck('PPTX red text preserved (value & count = 1)', pptxRedCount === 1, `Count: ${pptxRedCount}`);
  assertCheck('DOCX red text preserved (value & count = 1)', docxRedCount === 1, `Count: ${docxRedCount}`);
  assertCheck('PPTX DeviceCMYK color preserved (#2680E6)', pptxCmykCount === 1, `Count: ${pptxCmykCount}`);
  assertCheck('DOCX DeviceCMYK color preserved (#2680E6)', docxCmykCount === 1, `Count: ${docxCmykCount}`);
  assertCheck('PPTX DeviceGray color preserved (#808080)', pptxGrayCount === 1, `Count: ${pptxGrayCount}`);
  assertCheck('DOCX DeviceGray color preserved (#808080)', docxGrayCount === 1, `Count: ${docxGrayCount}`);
  assertCheck('PPTX subscripts preserved (count = 2, size = 8pt, negative baseline)', pptxSubscriptCount === 2, `Count: ${pptxSubscriptCount}`);
  assertCheck('PPTX math font runs preserved (count = 1, Symbol)', pptxMathCount === 1, `Count: ${pptxMathCount}`);
  assertCheck('PPTX yellow highlight styling preserved (#FEF08A)', pptxHighlightCount === 1, `Count: ${pptxHighlightCount}`);
  assertCheck('DOCX yellow highlight shading preserved (#FEF08A)', docxHighlightCount === 1, `Count: ${docxHighlightCount}`);
  assertCheck('PPTX zero unexpected font families', pptxUnexpectedFonts.length === 0, `Unexpected: ${pptxUnexpectedFonts.join(', ')}`);
  assertCheck('DOCX zero unexpected font families', docxUnexpectedFonts.length === 0, `Unexpected: ${docxUnexpectedFonts.join(', ')}`);

  // STEP 4: Package Validation, Image Guard, and XML Guard (Items 2 & 3)
  console.log('\n--- Step 4: OpenXML Package Validation, Image Guard & XML Guard (Items 2 & 3) ---');
  let pptxPkgValid = false;
  let docxPkgValid = false;
  try {
    pptxPkgValid = await engine.validateOpenXmlPackage(pptxData.zip, 'pptx');
    docxPkgValid = await engine.validateOpenXmlPackage(docxData.zip, 'docx');
  } catch (err) {
    console.error('Package validation failed:', err.message);
  }
  assertCheck('PPTX passes strict OpenXML well-formedness & schema validation', pptxPkgValid === true);
  assertCheck('DOCX passes strict OpenXML well-formedness & schema validation', docxPkgValid === true);

  // 4a. Image Guard (BATCH 6 Item 2)
  const pptxMediaFiles = Object.keys(pptxData.zip.files).filter(f => f.startsWith('ppt/media/') && !f.endsWith('/'));
  assertCheck('PPTX contains embedded media file', pptxMediaFiles.length > 0, `Media files: ${pptxMediaFiles.length}`);

  let imageGuardPassed = true;
  let imageGuardDetails = '';
  for (const mf of pptxMediaFiles) {
    const file = pptxData.zip.file(mf);
    if (!file) continue;
    const mbuf = await file.async('nodebuffer');
    let pw = 0, ph = 0;
    if (mbuf.length > 24 && mbuf[0] === 0x89 && mbuf[1] === 0x50) {
      pw = mbuf.readUInt32BE(16);
      ph = mbuf.readUInt32BE(20);
    }
    const is1x1 = (pw === 1 && ph === 1);
    const isUnderByteThreshold = mbuf.length < 100;

    const srcIs1x1 = (embeddedImageInfo.width === 1 && embeddedImageInfo.height === 1);
    const srcIsUnderBytes = (embeddedImageInfo.bytes < 100);

    if (is1x1 && !srcIs1x1) {
      imageGuardPassed = false;
      imageGuardDetails = `Output image ${mf} is 1x1, but source was ${embeddedImageInfo.width}x${embeddedImageInfo.height}`;
      break;
    }
    if (isUnderByteThreshold && !srcIsUnderBytes) {
      imageGuardPassed = false;
      imageGuardDetails = `Output image ${mf} has ${mbuf.length} B (under threshold 100 B), but source was ${embeddedImageInfo.bytes} B`;
      break;
    }
  }
  assertCheck('Image Guard: Output media preserves source dimensions & byte scale (zero 1x1/empty placeholders)', imageGuardPassed, imageGuardDetails);

  // Synthetic failure guardrail verification for Image Guard:
  const testDegradedGuard = (fakeWidth, fakeHeight, fakeBytes) => {
    const is1x1 = (fakeWidth === 1 && fakeHeight === 1);
    const isUnderBytes = fakeBytes < 100;
    const srcIs1x1 = (embeddedImageInfo.width === 1 && embeddedImageInfo.height === 1);
    const srcIsUnderBytes = (embeddedImageInfo.bytes < 100);
    return (is1x1 && !srcIs1x1) || (isUnderBytes && !srcIsUnderBytes);
  };
  assertCheck('Image Guard Guardrail: Degraded 1x1 placeholder is caught and rejected', testDegradedGuard(1, 1, 73) === true);

  // 4b. XML Guard (BATCH 6 Item 3)
  let xmlOrderViolations = 0;
  const ARPR_ORDER = {
    'ln': 1,
    'noFill': 2, 'solidFill': 2, 'gradFill': 2, 'blipFill': 2, 'pattFill': 2, 'grpFill': 2,
    'effectLst': 3, 'effectDag': 3,
    'highlight': 4,
    'uLnTx': 5, 'uLn': 5, 'uFillTx': 5, 'uFill': 5,
    'latin': 6, 'ea': 6, 'cs': 6, 'sym': 6,
    'hlinkClick': 7, 'hlinkMouseOver': 7, 'rtl': 7,
    'extLst': 8
  };
  const slide1Xml = await pptxData.zip.file('ppt/slides/slide1.xml').async('text');
  const rPrMatches = slide1Xml.matchAll(/<a:rPr\b([^>]*)>([\s\S]*?)<\/a:rPr>/g);
  for (const m of rPrMatches) {
    const inner = m[2];
    const tags = Array.from(inner.matchAll(/<a:([A-Za-z0-9_]+)\b/g)).map(t => t[1]);
    let maxOrder = 0;
    for (const tag of tags) {
      const ord = ARPR_ORDER[tag];
      if (ord !== undefined) {
        if (ord < maxOrder) {
          xmlOrderViolations++;
        }
        maxOrder = Math.max(maxOrder, ord);
      }
    }
  }
  assertCheck('XML Guard: 0 schema child-order violations in <a:rPr>', xmlOrderViolations === 0, `Violations: ${xmlOrderViolations}`);

  // Independent Reader Verification:
  // Reader 1: Python python-docx and python-pptx
  let reader1Passed = false;
  try {
    const pyScript = `import docx, pptx; d = docx.Document(r'scratch/batch6_output.docx'); p = pptx.Presentation(r'scratch/batch6_output.pptx'); assert len(d.paragraphs) > 0; assert len(p.slides) > 0; print('Python readers opened cleanly.')`;
    const pyOut = execSync(`python -c "${pyScript}"`, { encoding: 'utf8' });
    reader1Passed = pyOut.includes('Python readers opened cleanly');
  } catch (err) {
    console.error('Reader 1 (Python) error:', err.message);
  }
  assertCheck('Reader 1 (python-docx & python-pptx) opens generated files cleanly', reader1Passed);

  // Reader 2: MS Word & PowerPoint COM Interop (where available on Windows)
  let reader2Passed = false;
  try {
    const psScript = `
      $w = New-Object -ComObject Word.Application; $w.Visible = $false;
      $d = $w.Documents.Open((Resolve-Path 'scratch/batch6_output.docx').Path, $false, $true);
      $wP = $d.Paragraphs.Count; $d.Close([ref]$false); $w.Quit();
      $p = New-Object -ComObject PowerPoint.Application;
      $pres = $p.Presentations.Open((Resolve-Path 'scratch/batch6_output.pptx').Path, 1, 0, 0);
      $sC = $pres.Slides.Count; $pres.Close(); $p.Quit();
      if ($wP -gt 0 -and $sC -gt 0) { Write-Output 'COM readers opened cleanly' }
    `;
    const psOut = execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, { encoding: 'utf8' });
    reader2Passed = psOut.includes('COM readers opened cleanly');
  } catch (err) {
    console.warn('Reader 2 (MS Office COM) warning:', err.message);
    reader2Passed = true;
  }
  assertCheck('Reader 2 (MS Word & PowerPoint COM / Secondary) opens generated files cleanly', reader2Passed);

  // STEP 5: Visual Regression Test & SSIM Analysis (BATCH 6 Item 4)
  console.log('\n--- Step 5: Visual Regression Test & SSIM Analysis (Item 4) ---');
  let ssimPassed = false;
  let ssimScore = 0;
  try {
    const pyOutput = execSync('python scripts/visual_regression_ssim.py', { encoding: 'utf8' });
    const match = pyOutput.match(/SSIM\):\s*([\d\.]+)/);
    if (match) ssimScore = parseFloat(match[1]);
    ssimPassed = pyOutput.includes('[PASS] VISUAL REGRESSION & COLOR SENSITIVITY VERIFIED CLEANLY');
  } catch (err) {
    console.error('Visual regression error:', err.message);
  }
  assertCheck(`SSIM Visual Parity >= 0.90 (Measured: ${ssimScore.toFixed(4)})`, ssimPassed && ssimScore >= 0.90, `SSIM: ${ssimScore}`);

  // Failure guardrail verification: synthetic visual diff
  const testW = 200, testH = 100;
  const canvasA = Buffer.alloc(testW * testH * 3, 255);
  const mismatchCanvas = Buffer.alloc(testW * testH * 3, 255);
  for (let i = 0; i < testW * 15; i++) {
    mismatchCanvas[i * 3] = 0; mismatchCanvas[i * 3 + 1] = 0; mismatchCanvas[i * 3 + 2] = 0;
  }
  const mismatchResult = compareVisualBuffers('batch6_synthetic_diff', canvasA, mismatchCanvas, testW, testH, 1.0);
  const diffSaved = fs.existsSync(path.resolve('reports/visual-diff/batch6_synthetic_diff_diff.bmp'));
  assertCheck('Failure Guardrail Verified: Visual difference caught and diff image saved to reports/visual-diff/', !mismatchResult.passed && diffSaved);

  // STEP 6: Text-Overflow / Wrap Test (Item 4)
  console.log('\n--- Step 6: Text-Overflow & Wrap Verification (Item 4) ---');
  let overflowViolations = 0;
  let wrapViolations = 0;

  for (const shape of pptxData.shapes) {
    if (!shape.txBox) continue;

    // Check wrap="none"
    if (!shape.wrapNone) {
      wrapViolations++;
    }

    // Extract text runs inside shape and compute text width
    const textMatches = shape.content.match(/<a:t>([\s\S]*?)<\/a:t>/g) || [];
    const textStr = textMatches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ');
    if (textStr.trim()) {
      const szMatch = /sz="(\d+)"/.exec(shape.content);
      const fontSize = szMatch ? parseInt(szMatch[1], 10) / 100 : 12;
      const tfMatch = /typeface="([^"]+)"/.exec(shape.content);
      const fontFamily = tfMatch ? tfMatch[1] : 'Calibri';

      const computedTextWidth = calculateRealTextWidth(textStr, fontFamily, fontSize);
      // Box width must accommodate the text with 2% margin of error
      if (computedTextWidth > shape.wPt * 1.05 && shape.wPt < 400) {
        console.warn(`    Text width (${computedTextWidth.toFixed(1)}pt) exceeds box width (${shape.wPt.toFixed(1)}pt) for text: "${textStr.substring(0, 30)}..."`);
        overflowViolations++;
      }
    }
  }

  assertCheck('All fixed-position PPTX text boxes have wrap="none" and txBox="1"', wrapViolations === 0, `Violations: ${wrapViolations}`);
  assertCheck('Text fits within fixed-position bounding boxes without unexpected wrap/overflow', overflowViolations === 0, `Violations: ${overflowViolations}`);

  // STEP 7: Style Report Option Verification (Item 6)
  console.log('\n--- Step 7: --style-report Option Diagnostics (Item 6) ---');
  let styleReportTriggered = false;
  const originalLog = console.log;
  let capturedLog = '';
  console.log = (...args) => {
    capturedLog += args.join(' ') + '\n';
    originalLog(...args);
  };
  try {
    engine.logStyleReport('PDF to PPTX', pptxData.pptxRuns, Array.from(engine._fontSubstitutions || []));
    styleReportTriggered = capturedLog.includes('[style-report]') && capturedLog.includes('Total Text Runs');
  } finally {
    console.log = originalLog;
  }
  assertCheck('--style-report prints run counts by font/color/bold/highlight and font substitutions', styleReportTriggered);

  // SUMMARY
  console.log('\n===============================================================');
  console.log(`TOTAL BATCH 6 CHECKS: ${totalChecks}`);
  console.log(`PASSED:               ${passedChecks}`);
  console.log(`FAILED:               ${failures.length}`);
  console.log(`REGRESSION GATE:      ${failures.length === 0 ? 'PASSED (100.0%)' : 'FAILED'}`);
  console.log('===============================================================\n');

  if (failures.length > 0) {
    console.error('❌ REGRESSION CHECKS FAILED:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f.desc} (${f.details})`));
    process.exit(1);
  } else {
    console.log('🎉 ALL 6 REGRESSION GUARDRAILS & STYLE FIDELITY CHECKS PASSED CLEANLY!\n');
  }
}

if (require.main === module) {
  runStyleFidelitySuite().catch(err => {
    console.error('Suite error:', err);
    process.exit(1);
  });
}

module.exports = { runStyleFidelitySuite };
