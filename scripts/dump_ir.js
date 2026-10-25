#!/usr/bin/env node
/**
 * BATCH 3: IR Dump Command
 * 
 * Usage: node scripts/dump_ir.js <input.pdf> [output.json]
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve(__dirname, '../public/assets/libs/jszip.min.js'));
globalThis.JSZip = JSZip;

const pdfLib = require(path.resolve(__dirname, '../public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve(__dirname, '../public/assets/libs/pdf.worker.min.js');

async function dumpIR() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || path.resolve(__dirname, '../scratch/batch6_test_input.pdf');
  const outputPath = args[1] || path.resolve(__dirname, '../scratch/batch3_ir_dump.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file does not exist: ${inputPath}`);
    process.exit(1);
  }

  const enginePath = path.resolve(__dirname, '../public/assets/converter-engine.js');
  const mod = await import(pathToFileURL(enginePath).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;

  const fileBuf = fs.readFileSync(inputPath);
  const fileObj = {
    name: path.basename(inputPath),
    arrayBuffer: async () => fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength)
  };

  console.log(`--- Extracting IR from ${inputPath} ---`);
  const extractedPages = await engine.extractPdfPagesContent(fileObj);
  const ir = engine.buildDocumentIR(extractedPages);

  const jsonStr = engine.dumpDocumentIR(ir, 2);
  fs.writeFileSync(outputPath, jsonStr, 'utf8');

  console.log(`✓ IR successfully dumped to: ${outputPath} (${Buffer.byteLength(jsonStr)} bytes)`);

  // Print summary statistics
  let totalBlocks = 0;
  let totalParagraphs = 0;
  let totalTables = 0;
  let totalImages = 0;
  let totalLinks = 0;
  let totalUnsupported = 0;
  let totalRuns = 0;

  for (const page of ir.pages) {
    for (const b of page.blocks) {
      totalBlocks++;
      if (b.type === 'paragraph') {
        totalParagraphs++;
        totalRuns += (b.paragraphData?.inlines || []).length;
      } else if (b.type === 'table') totalTables++;
      else if (b.type === 'image') totalImages++;
      else if (b.type === 'link') totalLinks++;
      else if (b.type === 'unsupported') totalUnsupported++;
    }
  }

  console.log('\n================================================================');
  console.log(' IR EXTRACTION SUMMARY');
  console.log('================================================================');
  console.log(`  Document Title:    ${ir.metadata?.title || 'Untitled'}`);
  console.log(`  Pages:             ${ir.pages.length}`);
  console.log(`  Total Blocks:      ${totalBlocks}`);
  console.log(`    - Paragraphs:    ${totalParagraphs} (${totalRuns} inline text runs)`);
  console.log(`    - Tables:        ${totalTables}`);
  console.log(`    - Images:        ${totalImages}`);
  console.log(`    - Links:         ${totalLinks}`);
  console.log(`    - Unsupported:   ${totalUnsupported}`);
  console.log('================================================================\n');

  return { ir, outputPath };
}

if (require.main === module) {
  dumpIR().catch(err => {
    console.error('Fatal dump error:', err);
    process.exit(1);
  });
}

module.exports = { dumpIR };
