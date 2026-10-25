#!/usr/bin/env node
/**
 * CLI Fidelity Checker Tool
 * Usage: node scripts/check_fidelity.js <source-pdf> <output-file> [options]
 * Options:
 *   --lossy          Allow conversion to complete even if score is below threshold
 *   --json           Print raw JSON report to stdout
 *   --threshold <N>  Override overall threshold (default: 95.0)
 *   --diff-dir <dir> Output directory for diff images
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { FidelityChecker } = require('../src/fidelity_checker.js');

const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');

let engineInstance = null;
async function getEngine() {
  if (!engineInstance) {
    const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
    engineInstance = new mod.ConverterEngine();
    engineInstance.getPdfJs = () => pdfjs;
    engineInstance.getJSZip = () => JSZip;
    engineInstance.getPdfLib = () => pdfLib;
  }
  return engineInstance;
}

async function extractPdfRuns(filePath) {
  const engine = await getEngine();
  const fileBytes = fs.readFileSync(filePath);
  const fileObj = {
    name: path.basename(filePath),
    size: fileBytes.length,
    arrayBuffer: async () => fileBytes.buffer
  };

  const pages = await engine.extractPdfPagesContent(fileObj);
  const runs = [];
  let rawText = '';
  let imageCount = 0;
  let tableCount = 0;

  for (const p of pages) {
    imageCount += (p.images ? p.images.length : 0);
    tableCount += (p.tables ? p.tables.length : 0);
    for (const line of (p.lines || [])) {
      if (line.runs && line.runs.length > 0) {
        for (const r of line.runs) {
          runs.push({
            text: r.text,
            fontFamily: r.fontFamily || line.fontFamily || 'Arial',
            fontSize: r.fontSize || line.fontSize || 12,
            bold: r.isBold ?? line.isBold ?? false,
            italic: r.isItalic ?? false,
            underline: r.underline ?? false,
            strike: r.strike ?? false,
            color: r.colorHex ? (r.colorHex.startsWith('#') ? r.colorHex : '#' + r.colorHex) : '#000000',
            highlight: r.highlightHex ? (r.highlightHex.startsWith('#') ? r.highlightHex : '#' + r.highlightHex) : null,
            baselineOffset: r.baseline === 'subscript' ? -25000 : (r.baseline === 'superscript' ? 30000 : 0)
          });
        }
      } else {
        runs.push({
          text: line.text,
          fontFamily: line.fontFamily || 'Arial',
          fontSize: line.fontSize || 12,
          bold: line.isBold || false,
          color: line.colorHex ? (line.colorHex.startsWith('#') ? line.colorHex : '#' + line.colorHex) : '#000000',
          baselineOffset: 0
        });
      }
      rawText += line.text + ' ';
    }
  }

  return { runs, rawText: rawText.trim(), pageCount: pages.length, imageCount, tableCount };
}

async function extractPptxRuns(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  const runs = [];
  let rawText = '';
  const imageCount = Object.keys(zip.files).filter(f => f.startsWith('ppt/media/') && !f.endsWith('/')).length;
  let tableCount = 0;

  for (const sf of slideFiles) {
    const xml = await zip.file(sf).async('text');
    tableCount += (xml.match(/<a:tbl\b/g) || []).length;
    const rRegex = /<a:r>([\s\S]*?)<\/a:r>/g;
    let match;
    while ((match = rRegex.exec(xml)) !== null) {
      const rContent = match[1];
      const tMatch = /<a:t>([\s\S]*?)<\/a:t>/.exec(rContent);
      if (!tMatch || !tMatch[1].trim()) continue;
      const text = tMatch[1];

      const rPrMatch = /<a:rPr[\s\S]*?<\/a:rPr>|<a:rPr[^>]*\/>/.exec(rContent);
      const rPr = rPrMatch ? rPrMatch[0] : '';

      const bold = /b="1"/.test(rPr);
      const italic = /i="1"/.test(rPr);
      const underline = /u="sng"/.test(rPr);
      const strike = /strike="sngStrike"/.test(rPr);
      const typefaceMatch = /typeface="([^"]+)"/.exec(rPr);
      const fontFamily = typefaceMatch ? typefaceMatch[1] : 'Calibri';
      const colorMatch = /<a:srgbClr val="([A-Fa-f0-9]{6})"\/>/.exec(rPr);
      const color = colorMatch ? '#' + colorMatch[1].toUpperCase() : '#000000';
      const baselineMatch = /baseline="(-?\d+)"/.exec(rPr);
      const baseline = baselineMatch ? parseInt(baselineMatch[1], 10) : 0;
      const highlightMatch = /<a:highlight/.test(rPr);

      runs.push({
        text,
        fontFamily,
        bold,
        italic,
        underline,
        strike,
        color,
        colorHex: color.replace('#', ''),
        baselineOffset: baseline,
        highlight: highlightMatch
      });
      rawText += text + ' ';
    }
  }

  return { runs, rawText: rawText.trim(), pageCount: slideFiles.length, imageCount, tableCount, zip };
}

async function extractDocxRuns(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const docXml = await zip.file('word/document.xml').async('text');
  const imageCount = Object.keys(zip.files).filter(f => f.startsWith('word/media/') && !f.endsWith('/')).length;
  const tableCount = (docXml.match(/<w:tbl\b/g) || []).length;
  const runs = [];
  let rawText = '';

  const rRegex = /<w:r(?: [^>]*)?>([\s\S]*?)<\/w:r>/g;
  let match;
  while ((match = rRegex.exec(docXml)) !== null) {
    const rContent = match[1];
    const tMatch = /<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/.exec(rContent);
    if (!tMatch || !tMatch[1].trim()) continue;
    const text = tMatch[1];

    const rPrMatch = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(rContent);
    const rPr = rPrMatch ? rPrMatch[1] : '';

    const bold = /<w:b\/>|<w:b w:val="true"\/>|<w:b w:val="1"\/>/.test(rPr);
    const italic = /<w:i\/>|<w:i w:val="true"\/>|<w:i w:val="1"\/>/.test(rPr);
    const underline = /<w:u w:val="single"\/>/.test(rPr);
    const strike = /<w:strike\/>/.test(rPr);
    const fontMatch = /<w:rFonts[^>]*w:ascii="([^"]+)"/.exec(rPr);
    const fontFamily = fontMatch ? fontMatch[1] : 'Calibri';
    const colorMatch = /<w:color w:val="([A-Fa-f0-9]{6})"\/>/.exec(rPr);
    const color = colorMatch ? '#' + colorMatch[1].toUpperCase() : '#000000';
    const vertMatch = /<w:vertAlign w:val="(superscript|subscript)"\/>/.exec(rPr);
    const baseline = vertMatch ? vertMatch[1] : 0;
    const highlightMatch = /<w:highlight|<w:shd/.test(rPr);

    runs.push({
      text,
      fontFamily,
      bold,
      italic,
      underline,
      strike,
      color,
      colorHex: color.replace('#', ''),
      baselineOffset: baseline === 'subscript' ? -25000 : (baseline === 'superscript' ? 30000 : 0),
      highlight: highlightMatch
    });
    rawText += text + ' ';
  }

  return { runs, rawText: rawText.trim(), pageCount: 1, zip };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node scripts/check_fidelity.js <source-file> <output-file> [options]');
    console.log('Options:');
    console.log('  --lossy          Allow conversion to complete if score is under threshold');
    console.log('  --json           Output raw JSON report');
    console.log('  --threshold <N>  Set overall threshold (default: 95.0)');
    process.exit(1);
  }

  const srcPath = path.resolve(args[0]);
  const outPath = path.resolve(args[1]);
  const allowLossy = args.includes('--lossy');
  const jsonOutput = args.includes('--json');

  let thresholdVal = 95.0;
  const thIdx = args.indexOf('--threshold');
  if (thIdx !== -1 && args[thIdx + 1]) thresholdVal = parseFloat(args[thIdx + 1]);

  if (!fs.existsSync(srcPath)) {
    console.error(`Error: Source file not found: ${srcPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(outPath)) {
    console.error(`Error: Output file not found: ${outPath}`);
    process.exit(1);
  }

  const checker = new FidelityChecker({
    allowLossy,
    thresholds: { overall: thresholdVal }
  });

  // Extract source
  const source = await extractPdfRuns(srcPath);

  // Extract output
  const outExt = path.extname(outPath).toLowerCase();
  let output;
  let format = 'pptx';
  if (outExt === '.docx') {
    format = 'docx';
    output = await extractDocxRuns(outPath);
  } else {
    format = 'pptx';
    output = await extractPptxRuns(outPath);
  }

  try {
    const report = await checker.evaluateConversion({
      name: path.basename(outPath, outExt),
      source,
      output,
      format,
      filePath: outPath,
      JSZip
    });

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(report.humanSummary);
      console.log(`\nFidelity Report saved to: ${report.jsonPath}`);
    }

    process.exit(0);
  } catch (err) {
    if (jsonOutput && err.report) {
      console.log(JSON.stringify(err.report, null, 2));
    } else {
      if (err.report) console.log(err.report.humanSummary);
      console.error(`\n❌ [FIDELITY GATE BLOCKED]: ${err.message}`);
    }
    process.exit(err.exitCode || 1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Checker execution error:', err);
    process.exit(1);
  });
}

module.exports = { extractPdfRuns, extractPptxRuns, extractDocxRuns };
