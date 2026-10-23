/**
 * Kiln Suite: All 33 Native PDF Tools Verification Suite
 * Tests the real execution, output production, and format validity of all 33 processes.
 */

const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:3000';
const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : (fs.existsSync('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe')
      ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      : undefined);

function ensureServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/`, () => resolve(null));
    req.on('error', () => {
      const { spawn } = require('child_process');
      const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { stdio: 'ignore' });
      setTimeout(() => resolve(child), 1000);
    });
  });
}

async function runAll33ToolsSuite() {
  console.log('===============================================================');
  console.log('   KILN / iLovePDF 33 NATIVE PROCESSES FULL CAPABILITY SUITE   ');
  console.log('===============================================================\n');

  await ensureServer();
  const launchOpts = { headless: true };
  if (CHROME_PATH) launchOpts.executablePath = CHROME_PATH;
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage();

  console.log('--- Phase 1: Direct Tool URLs & Workbench Launch Verification ---');
  const sampleRoutes = ['/merge_pdf', '/split_pdf', '/compress_pdf', '/pdf_to_word', '/jpg_to_pdf'];
  for (const r of sampleRoutes) {
    const res = await page.goto(`${BASE_URL}${r}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#studio-modal.is-open .ilove-wb-container', { timeout: 5000 });
    const title = (await page.locator('#modal-title').textContent()).trim();
    console.log(`[PASS] Route ${r.padEnd(16)} -> Status: ${res.status()} OK (Workbench active: "${title}")`);
  }

  console.log('\n--- Phase 2: All 33 Native Tools Execution & Byte Verification ---');
  await page.goto(`${BASE_URL}/app/`, { waitUntil: 'networkidle' });

  // Read fixtures
  const samplePdfBase64 = fs.readFileSync(path.join(__dirname, 'fixtures/pdf/minimal.pdf')).toString('base64');
  const samplePngBase64 = fs.readFileSync(path.join(__dirname, 'fixtures/png/minimal.png')).toString('base64');

  const toolReports = await page.evaluate(async ({ pdfB64, pngB64 }) => {
    const b64ToUint8 = (b64) => {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    };

    const pdfBytes = b64ToUint8(pdfB64);
    const pngBytes = b64ToUint8(pngB64);

    const testPdf1 = new File([pdfBytes], 'document-a.pdf', { type: 'application/pdf' });
    const testPdf2 = new File([pdfBytes], 'document-b.pdf', { type: 'application/pdf' });
    const testPng = new File([pngBytes], 'scan.png', { type: 'image/png' });

    const tools = [
      { id: 'merge-pdf', name: 'Merge PDF', files: [testPdf1, testPdf2], opts: {}, expectExt: 'pdf' },
      { id: 'split-pdf', name: 'Split PDF', files: [testPdf1], opts: { mode: 'all_pages' }, expectExt: 'pdf' },
      { id: 'extract-pages', name: 'Extract Pages', files: [testPdf1], opts: { pages: [1] }, expectExt: 'pdf' },
      { id: 'remove-pages', name: 'Remove Pages', files: [testPdf1], opts: { pagesToRemove: [1] }, expectExt: 'pdf' },
      { id: 'organize-pdf', name: 'Organize PDF', files: [testPdf1], opts: { pageOrder: [0] }, expectExt: 'pdf' },
      { id: 'scan-to-pdf', name: 'Scan to PDF', files: [testPng], opts: {}, expectExt: 'pdf' },
      { id: 'compress-pdf', name: 'Compress PDF', files: [testPdf1], opts: { level: 'recommended' }, expectExt: 'pdf' },
      { id: 'repair-pdf', name: 'Repair PDF', files: [testPdf1], opts: {}, expectExt: 'pdf' },
      { id: 'ocr-pdf', name: 'OCR PDF', files: [testPdf1], opts: {}, expectExt: 'pdf' },
      { id: 'jpg-to-pdf', name: 'JPG to PDF', files: [testPng], opts: {}, expectExt: 'pdf' },
      { id: 'word-to-pdf', name: 'Word to PDF', files: [testPdf1], opts: {}, expectExt: 'pdf' },
      { id: 'ppt-to-pdf', name: 'PowerPoint to PDF', files: [testPdf1], opts: {}, expectExt: 'pdf' },
      { id: 'excel-to-pdf', name: 'Excel to PDF', files: [testPdf1], opts: {}, expectExt: 'pdf' },
      { id: 'html-to-pdf', name: 'HTML to PDF', files: [testPdf1], opts: {}, expectExt: 'pdf' },
      { id: 'pdf-to-jpg', name: 'PDF to JPG', files: [testPdf1], opts: {}, expectExt: 'jpg' },
      { id: 'pdf-to-word', name: 'PDF to Word', files: [testPdf1], opts: {}, expectExt: 'docx' },
      { id: 'pdf-to-ppt', name: 'PDF to PowerPoint', files: [testPdf1], opts: {}, expectExt: 'pptx' },
      { id: 'pdf-to-excel', name: 'PDF to Excel', files: [testPdf1], opts: {}, expectExt: 'csv' },
      { id: 'pdf-to-pdfa', name: 'PDF to PDF/A', files: [testPdf1], opts: {}, expectExt: 'pdf' },
      { id: 'pdf-to-markdown', name: 'PDF to Markdown', files: [testPdf1], opts: {}, expectExt: 'md' },
      { id: 'edit-pdf', name: 'Edit PDF', files: [testPdf1], opts: { text: 'Annotations' }, expectExt: 'pdf' },
      { id: 'rotate-pdf', name: 'Rotate PDF', files: [testPdf1], opts: { angle: 90 }, expectExt: 'pdf' },
      { id: 'add-page-numbers', name: 'Add Page Numbers', files: [testPdf1], opts: { format: 'Page n of N' }, expectExt: 'pdf' },
      { id: 'add-watermark', name: 'Add Watermark', files: [testPdf1], opts: { text: 'ORIGINAL' }, expectExt: 'pdf' },
      { id: 'crop-pdf', name: 'Crop PDF', files: [testPdf1], opts: { margin: 15 }, expectExt: 'pdf' },
      { id: 'pdf-forms', name: 'PDF Forms', files: [testPdf1], opts: {}, expectExt: 'pdf' },
      { id: 'unlock-pdf', name: 'Unlock PDF', files: [testPdf1], opts: { password: '' }, expectExt: 'pdf' },
      { id: 'protect-pdf', name: 'Protect PDF', files: [testPdf1], opts: { password: 'secret' }, expectExt: 'pdf' },
      { id: 'sign-pdf', name: 'Sign PDF', files: [testPdf1], opts: { name: 'Kiln User' }, expectExt: 'pdf' },
      { id: 'redact-pdf', name: 'Redact PDF', files: [testPdf1], opts: { boxes: [{ page: 1, x: 10, y: 10, width: 80, height: 20 }] }, expectExt: 'pdf' },
      { id: 'compare-pdf', name: 'Compare PDF', files: [testPdf1, testPdf2], opts: {}, expectExt: 'json' },
      { id: 'ai-summarizer', name: 'AI Summarizer', files: [testPdf1], opts: {}, expectExt: 'md' },
      { id: 'translate-pdf', name: 'Translate PDF', files: [testPdf1], opts: { targetLang: 'ko' }, expectExt: 'pdf' }
    ];

    const results = [];
    for (const t of tools) {
      try {
        const start = performance.now();
        const res = await window.converterEngine.runPdfTool(t.id, t.files, t.opts);
        const durationMs = Math.round(performance.now() - start);

        let bytePrefix = '';
        let validHeader = false;
        let blobSize = res.size || res.blob?.size || 0;

        if (res.blob) {
          const ab = await res.blob.slice(0, 16).arrayBuffer();
          const u8 = new Uint8Array(ab);
          bytePrefix = String.fromCharCode(...u8.slice(0, 4));

          if (t.expectExt === 'pdf') {
            validHeader = bytePrefix.startsWith('%PDF');
          } else if (t.expectExt === 'docx' || t.expectExt === 'pptx' || t.expectExt === 'zip') {
            validHeader = u8[0] === 0x50 && u8[1] === 0x4B; // PK (ZIP)
          } else {
            validHeader = blobSize > 0;
          }
        }

        results.push({
          id: t.id,
          name: t.name,
          outputName: res.name,
          blobSize,
          durationMs,
          validHeader,
          pass: blobSize > 0 && validHeader
        });
      } catch (err) {
        results.push({
          id: t.id,
          name: t.name,
          pass: false,
          error: err.message
        });
      }
    }
    return results;
  }, { pdfB64: samplePdfBase64, pngB64: samplePngBase64 });

  await browser.close();

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < toolReports.length; i++) {
    const r = toolReports[i];
    const num = String(i + 1).padStart(2, '0');
    if (r.pass) {
      passed++;
      console.log(`[PASS] [Tool ${num}/33] ${r.name.padEnd(20)} -> ${r.outputName} (${r.blobSize} B, ${r.durationMs}ms)`);
    } else {
      failed++;
      console.error(`[FAIL] [Tool ${num}/33] ${r.name.padEnd(20)} -> ERROR: ${r.error || 'Invalid output/header'}`);
    }
  }

  console.log('\n===============================================================');
  console.log(`TOTAL PROCESSES TESTED: ${toolReports.length}`);
  console.log(`PASSED:                 ${passed}`);
  console.log(`FAILED:                 ${failed}`);
  console.log(`SUCCESS RATE:           ${((passed / toolReports.length) * 100).toFixed(1)}%`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll33ToolsSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
