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

async function auditBatch4(stageName = 'BEFORE') {
  console.log(`===============================================================`);
  console.log(`   BATCH 4 AUDIT: ${stageName} IMPLEMENTATION                   `);
  console.log(`===============================================================\n`);

  const engine = await setupEngine();
  const pdfBytes = fs.readFileSync('scratch/batch4_color_test_input.pdf');
  const fileObj = { name: 'batch4_color_test_input.pdf', size: pdfBytes.length, arrayBuffer: async () => pdfBytes.buffer };

  const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity' });
  const pptxBuf = await pptxRes.blob.arrayBuffer();
  fs.writeFileSync(`scratch/batch4_${stageName.toLowerCase()}_output.pptx`, Buffer.from(pptxBuf));

  const zip = await JSZip.loadAsync(pptxBuf);
  
  // Extract all slides
  const slideFiles = Object.keys(zip.files).filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/));
  slideFiles.sort();

  let totalRedChars = 0;
  let totalRuns = 0;
  let schemaViolations = 0;
  const violationDetails = [];
  const colorCounts = {};

  const TAG_CATEGORIES = {
    'ln': 1,
    'noFill': 2, 'solidFill': 2, 'gradFill': 2, 'blipFill': 2, 'pattFill': 2, 'grpFill': 2,
    'effectLst': 3, 'effectDag': 3,
    'highlight': 4,
    'uLnTx': 5, 'uLn': 5, 'uFillTx': 5, 'uFill': 5,
    'latin': 6, 'ea': 6, 'cs': 6, 'sym': 6,
    'hlinkClick': 7, 'hlinkMouseOver': 7,
    'extLst': 8
  };

  const isRed = (hex) => {
    if (!hex || !hex.startsWith('#')) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r > 180 && g < 80 && b < 80;
  };

  for (const sFile of slideFiles) {
    const sXml = await zip.file(sFile).async('text');
    const runRegex = /<a:r>([\s\S]*?)<\/a:r>/g;
    let match;

    while ((match = runRegex.exec(sXml)) !== null) {
      totalRuns++;
      const runContent = match[1];
      const textMatch = /<a:t>([\s\S]*?)<\/a:t>/.exec(runContent);
      const text = textMatch ? textMatch[1] : '';

      const rPrMatch = /<a:rPr[\s\S]*?<\/a:rPr>|<a:rPr[^>]*\/>/.exec(runContent);
      const rPr = rPrMatch ? rPrMatch[0] : '';

      const clrMatch = /<a:srgbClr val="([A-Fa-f0-9]{6})"\/>/.exec(rPr);
      const color = clrMatch ? '#' + clrMatch[1].toUpperCase() : '#000000';
      colorCounts[color] = (colorCounts[color] || 0) + text.length;

      if (isRed(color)) {
        totalRedChars += text.length;
      }

      // Check schema order
      const childTags = [];
      const tagRegex = /<a:([a-zA-Z0-9]+)[^>]*>/g;
      let tMatch;
      while ((tMatch = tagRegex.exec(rPr)) !== null) {
        if (tMatch[1] !== 'rPr' && tMatch[1] !== 'srgbClr') {
          childTags.push(tMatch[1]);
        }
      }
      const tagRanks = childTags.map(t => TAG_CATEGORIES[t] || 99);
      const isOrdered = tagRanks.every((val, i, arr) => !i || arr[i - 1] <= val);
      if (!isOrdered) {
        schemaViolations++;
        if (violationDetails.length < 5) {
          violationDetails.push({ slide: sFile, text: text.slice(0, 30), tags: childTags });
        }
      }
    }
  }

  console.log(`[${stageName}] Total Slides: ${slideFiles.length}`);
  console.log(`[${stageName}] Total Text Runs: ${totalRuns}`);
  console.log(`[${stageName}] Source Red Chars: 795 | PPTX Red Chars: ${totalRedChars}`);
  console.log(`[${stageName}] a:rPr Schema Violations: ${schemaViolations} / ${totalRuns}`);
  console.log(`[${stageName}] Color Breakdown (characters):`, colorCounts);
  if (violationDetails.length > 0) {
    console.log(`[${stageName}] Sample Schema Violations:`, violationDetails);
  }

  return { totalRedChars, schemaViolations, totalRuns, colorCounts };
}

auditBatch4('AFTER').catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
