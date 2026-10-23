const fs = require('fs');
const path = require('path');
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

// Helper to convert rgb components [0..1] or [0..255] to hex #RRGGBB
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
  const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  return '#' + hex;
}

async function extractSourceProperties(pdfBytes) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent({ includeMarkedContent: true });
  const opList = await page.getOperatorList();

  // Find filled rectangle highlights in operator list
  // OPS.constructPath / OPS.rectangle / OPS.fill
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

  // Extract source text runs
  const runs = [];
  for (const item of textContent.items) {
    if (!item.str || item.str.trim() === '') continue;

    const tx = item.transform[4];
    const ty = item.transform[5];
    const fontName = item.fontName || '';
    const fontSize = Math.round(Math.hypot(item.transform[0], item.transform[1]) * 10) / 10;

    // Check overlap with filled rectangles
    let highlight = null;
    for (const r of filledRects) {
      // PDF coordinates
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
      underline: false, // PDF text operators do not store underline natively (emitted as vector lines)
      strikethrough: false,
      color: item.color || '#000000',
      baselineOffset: 0,
      highlight: highlight
    });
  }

  return { runs, filledRects };
}

async function extractPptxProperties(pptxBuf) {
  const zip = await JSZip.loadAsync(pptxBuf);
  const slide1Xml = await zip.file('ppt/slides/slide1.xml').async('text');

  // Parse raw XML with regex to extract <a:r> runs and their <a:rPr>
  const runRegex = /<a:r>([\s\S]*?)<\/a:r>/g;
  let match;
  const pptxRuns = [];

  while ((match = runRegex.exec(slide1Xml)) !== null) {
    const runContent = match[1];
    const textMatch = /<a:t>([\s\S]*?)<\/a:t>/.exec(runContent);
    const text = textMatch ? textMatch[1] : '';
    if (!text.trim()) continue;

    const rPrMatch = /<a:rPr([\s\S]*?)(?:\/>|>[\s\S]*?<\/a:rPr>)/.exec(runContent);
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
      italic,
      underline,
      strikethrough: strike,
      color,
      baselineOffset: baseline,
      highlight
    });
  }

  // Check shape-level highlights (vector background shapes)
  const shapeMatches = slide1Xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
  const backgroundShapes = [];
  for (const sp of shapeMatches) {
    const clr = /<a:solidFill><a:srgbClr val="([A-Fa-f0-9]{6})"\/>/.exec(sp);
    if (clr && !sp.includes('<a:t>')) {
      backgroundShapes.push('#' + clr[1].toUpperCase());
    }
  }

  return { pptxRuns, backgroundShapes, xmlParts: Object.keys(zip.files) };
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
    const highlight = highlightMatch ? highlightMatch[1] : null;

    docxRuns.push({
      text,
      fontFamily,
      fontSize,
      bold,
      italic,
      underline,
      strikethrough: strike,
      color,
      baselineOffset: baseline,
      highlight
    });
  }

  return { docxRuns, xmlParts: Object.keys(zip.files) };
}

async function runAudit() {
  const engine = await setupEngine();

  // Test on scratch/test_style_input.pdf
  const pdfPath = path.resolve('scratch/test_style_input.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);

  const sourceData = await extractSourceProperties(pdfBytes);

  const fileObj = {
    name: 'test_style_input.pdf',
    size: pdfBytes.length,
    arrayBuffer: async () => pdfBytes.buffer
  };

  const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity' });
  const pptxBuf = await pptxRes.blob.arrayBuffer();
  const pptxData = await extractPptxProperties(pptxBuf);

  const docxRes = await engine.pdfToWord(fileObj, { mode: 'fidelity' });
  const docxBuf = await docxRes.blob.arrayBuffer();
  const docxData = await extractDocxProperties(docxBuf);

  return {
    source: sourceData,
    pptx: pptxData,
    docx: docxData,
    pptxBuf,
    docxBuf
  };
}

runAudit().then(res => {
  fs.writeFileSync('scratch/audit_results.json', JSON.stringify(res, null, 2));
  console.log('AUDIT COMPLETED. Results saved to scratch/audit_results.json');
}).catch(err => {
  console.error('Audit failed:', err);
});
