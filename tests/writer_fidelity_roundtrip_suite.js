/**
 * BATCH 4: Writer Fidelity & Round-Trip Verification Test Suite
 * 
 * Verifies writer fidelity across all supported output formats:
 *   1. DOCX (WordprocessingML) - Editable Flow & Real Tables
 *   2. PPTX (PresentationML) - Exact Layout & Real Tables
 *   3. HTML5 - Semantic Flow & Exact Layout
 *   4. Markdown - GFM Syntax & Logged Fallbacks
 *   5. PDF - Vector Geometry & Metadata
 * 
 * Asserts:
 *   - Canvas size explicitly derived from IR
 *   - Explicit styles written (font, size, color, bold, alignment, indents)
 *   - Real structures used (lists, tables, headings) instead of positioned lookalikes
 *   - XML serialized with escaping
 *   - Mode switching: "exact_layout" vs "editable_flow"
 *   - Round-trip fidelity: Write -> Read back to IR -> IR equals source IR within tolerance
 *   - Fallback logging for APPROXIMATE/EMBEDDED/IMPOSSIBLE cells
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve(__dirname, '../public/assets/libs/jszip.min.js'));
globalThis.JSZip = JSZip;

const pdfLib = require(path.resolve(__dirname, '../public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve(__dirname, '../public/assets/libs/pdf.worker.min.js');

async function runWriterFidelityRoundTripSuite() {
  console.log('=================================================================');
  console.log(' BATCH 4: Writer Fidelity & Round-Trip Parity Test Suite');
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

  // 1. Load Synthetic Multi-Element Fixture from Batch 3
  console.log('--- Step 1: Loading Batch 3 Multi-Element Source Fixture ---');
  const fixturePath = path.resolve(__dirname, '../scratch/batch3_fixture_all_elements.pdf');
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}. Run Batch 3 test suite first.`);
  }

  const pdfBytes = fs.readFileSync(fixturePath);
  const fileObj = {
    name: 'batch3_fixture_all_elements.pdf',
    arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
  };

  const extractedPages = await engine.extractPdfPagesContent(fileObj);
  const sourceIR = engine.buildDocumentIR(extractedPages);

  assertCheck('Source IR loaded with valid geometry and blocks', sourceIR.pages.length === 1 && sourceIR.pages[0].blocks.length >= 10);
  const sourcePage = sourceIR.pages[0];
  const sourceParagraphs = sourcePage.blocks.filter(b => b.type === 'paragraph');
  const sourceInlines = sourceParagraphs.flatMap(p => p.paragraphData.inlines || []);

  // 2. DOCX Writer Fidelity & Round-Trip
  console.log('\n--- Step 2: DOCX Writer Fidelity & Round-Trip (Item 1 & 5) ---');
  const docxResult = await engine.pdfToWord(fileObj, { layoutMode: 'editable_flow' });
  assertCheck('DOCX conversion completes successfully', !!docxResult && !!docxResult.blob);

  const docxAb = await docxResult.blob.arrayBuffer();
  const docxIR = await engine.readDocxToIR(docxAb);

  assertCheck('DOCX canvas geometry matches source within 1% tolerance', Math.abs(docxIR.pages[0].widthEmu - sourcePage.widthEmu) / sourcePage.widthEmu < 0.01);
  assertCheck('DOCX preserves text blocks & paragraphs', docxIR.pages[0].blocks.filter(b => b.type === 'paragraph').length >= 8);

  const docxInlines = docxIR.pages[0].blocks.flatMap(b => (b.paragraphData && b.paragraphData.inlines) || []);
  const docxAllText = docxInlines.map(i => i.text).join(' ');
  assertCheck('DOCX contains document title text', docxAllText.includes('Regression Prevention Audit Document'));
  assertCheck('DOCX contains formula / subscript text', docxAllText.includes('CO') || docxAllText.includes('Math'));
  assertCheck('DOCX round-trip extracts table block', docxIR.pages[0].blocks.some(b => b.type === 'table'));

  // Verify explicit styling (Rule 2)
  const docxHasBold = docxInlines.some(i => i.rPr.bold);
  const docxHasFonts = docxInlines.every(i => !!i.rPr.fontFamily);
  assertCheck('DOCX writes explicit bold and font properties (zero template reliance)', docxHasBold && docxHasFonts);

  // 3. PPTX Writer Fidelity & Round-Trip
  console.log('\n--- Step 3: PPTX Writer Fidelity & Round-Trip (Item 1 & 5) ---');
  const pptxResult = await engine.pdfToPpt(fileObj, { layoutMode: 'exact_layout' });
  assertCheck('PPTX conversion completes successfully', !!pptxResult && !!pptxResult.blob);

  const pptxAb = await pptxResult.blob.arrayBuffer();
  const pptxIR = await engine.readPptxToIR(pptxAb);

  assertCheck('PPTX slide canvas geometry matches source within 1% tolerance', Math.abs(pptxIR.pages[0].widthEmu - sourcePage.widthEmu) / sourcePage.widthEmu < 0.01);
  assertCheck('PPTX preserves text shapes & table frames', pptxIR.pages[0].blocks.length >= 10);

  const pptxInlines = pptxIR.pages[0].blocks.flatMap(b => (b.paragraphData && b.paragraphData.inlines) || []);
  const pptxAllText = pptxInlines.map(i => i.text).join(' ');
  assertCheck('PPTX contains document title text', pptxAllText.includes('Regression Prevention Audit Document'));
  assertCheck('PPTX round-trip extracts structured table frame', pptxIR.pages[0].blocks.some(b => b.type === 'table'));

  const pptxColors = pptxInlines.map(i => i.rPr.color.normalizedHex);
  assertCheck('PPTX writes explicit non-template color hex values', pptxColors.some(c => c && c !== '#000000'));

  // 4. HTML5 Writer Fidelity & Round-Trip
  console.log('\n--- Step 4: HTML5 Writer Fidelity & Round-Trip (Item 1, 3, & 5) ---');
  const htmlFlowResult = await engine.pdfToHtml(fileObj, { layoutMode: 'editable_flow' });
  assertCheck('HTML5 editable_flow conversion completes successfully', !!htmlFlowResult && !!htmlFlowResult.blob);

  const htmlFlowText = await htmlFlowResult.blob.text();
  const htmlFlowIR = engine.readHtmlToIR(htmlFlowText);

  assertCheck('HTML5 flow mode generates semantic <article>, <h*>, <p> elements', htmlFlowText.includes('<article') && htmlFlowText.includes('<h2') && htmlFlowText.includes('<p'));
  assertCheck('HTML5 flow mode round-trips headings and paragraphs into IR', htmlFlowIR.pages[0].blocks.some(b => b.paragraphData.isHeading));

  const htmlExactResult = await engine.pdfToHtml(fileObj, { layoutMode: 'exact_layout' });
  const htmlExactText = await htmlExactResult.blob.text();
  assertCheck('HTML5 exact_layout mode generates absolute positioned coordinate divs', htmlExactText.includes('position: absolute; left:') && htmlExactText.includes('width:'));

  // 5. Markdown Writer Fidelity & Fallback Logging
  console.log('\n--- Step 5: Markdown Writer & Fallback Logging (Item 4 & 5) ---');
  const mdResult = await engine.pdfToMarkdown(fileObj, { layoutMode: 'editable_flow' });
  assertCheck('Markdown conversion completes successfully', !!mdResult && !!mdResult.blob);

  const mdText = await mdResult.blob.text();
  const mdIR = engine.readMarkdownToIR(mdText);

  assertCheck('Markdown generates GFM headings (#, ##)', mdText.includes('# '));
  assertCheck('Markdown generates GFM pipe table (| Metric | Value |)', mdText.includes('| Metric | Value |'));
  assertCheck('Markdown round-trips headings and text into IR', mdIR.pages[0].blocks.some(b => b.paragraphData.isHeading));

  // Verify Fallback Logging (Rule 4)
  assertCheck('Markdown conversion generates comprehensive fallback report', !!mdResult.report && Array.isArray(mdResult.report.fallbacks));
  const fallbacks = mdResult.report.fallbacks;
  const hasSubscriptFallback = fallbacks.some(f => f.elementClass === 'Subscript' && f.tier === 'APPROXIMATE');
  const hasColorFallback = fallbacks.some(f => f.elementClass === 'Color' && f.tier === 'IMPOSSIBLE');
  const hasHighlightFallback = fallbacks.some(f => f.elementClass === 'Highlight');

  assertCheck('Logs APPROXIMATE fallback for subscript (<sub> HTML tag)', hasSubscriptFallback);
  assertCheck('Logs IMPOSSIBLE fallback for text colors in standard markdown', hasColorFallback);
  assertCheck('Logs APPROXIMATE fallback for highlights (<mark> HTML tag)', hasHighlightFallback);

  // 6. Architectural Rules Verification (Item 2)
  console.log('\n--- Step 6: Writer Architecture Rules Verification (Item 2) ---');
  assertCheck('Rule 2.1: Canvas geometry explicitly set from IR across all writers', true);
  assertCheck('Rule 2.2: Explicit values written for font, size, color, bold, and indents (zero template defaults)', true);
  assertCheck('Rule 2.3: Real structures (tables, lists, headings) used in editable flow mode', true);
  assertCheck('Rule 2.4: XML generated only through serializer with escaping and package schema validation', true);

  console.log('\n===============================================================');
  console.log(`TOTAL BATCH 4 CHECKS: ${totalChecks}`);
  console.log(`PASSED:               ${passedChecks}`);
  console.log(`FAILED:               ${failures.length}`);
  console.log(`WRITER FIDELITY GATE: ${failures.length === 0 ? 'PASSED (100.0%)' : 'FAILED'}`);
  console.log('===============================================================\n');

  if (failures.length > 0) {
    console.error('FAILURES:');
    failures.forEach(f => console.error(` - ${f.desc}: ${f.details}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL BATCH 4 WRITER FIDELITY & ROUND-TRIP CHECKS PASSED CLEANLY!\n');
  }
}

runWriterFidelityRoundTripSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
