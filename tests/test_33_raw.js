const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function ensureServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/`, (res) => resolve(null));
    req.on('error', () => {
      const { spawn } = require('child_process');
      const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { stdio: 'ignore' });
      setTimeout(() => resolve(child), 1000);
    });
  });
}

async function main() {
  await ensureServer();
  const launchOpts = { headless: true };
  if (fs.existsSync(CHROME_PATH)) launchOpts.executablePath = CHROME_PATH;
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/app/`, { waitUntil: 'networkidle' });

  // Read sample fixtures
  const samplePdfBase64 = fs.readFileSync(path.join(__dirname, 'fixtures/pdf/minimal.pdf')).toString('base64');
  const samplePngBase64 = fs.readFileSync(path.join(__dirname, 'fixtures/png/minimal.png')).toString('base64');

  const results = await page.evaluate(async ({ pdfB64, pngB64 }) => {
    const b64ToUint8 = (b64) => {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    };

    const pdfBytes = b64ToUint8(pdfB64);
    const pngBytes = b64ToUint8(pngB64);

    const testPdf1 = new File([pdfBytes], 'sample1.pdf', { type: 'application/pdf' });
    const testPdf2 = new File([pdfBytes], 'sample2.pdf', { type: 'application/pdf' });
    const testPng = new File([pngBytes], 'sample.png', { type: 'image/png' });

    const tools = [
      { id: 'merge-pdf', files: [testPdf1, testPdf2], opts: {} },
      { id: 'split-pdf', files: [testPdf1], opts: { mode: 'all_pages' } },
      { id: 'extract-pages', files: [testPdf1], opts: { pages: [1] } },
      { id: 'remove-pages', files: [testPdf1], opts: { pagesToRemove: [1] } },
      { id: 'organize-pdf', files: [testPdf1], opts: { pageOrder: [0] } },
      { id: 'scan-to-pdf', files: [testPng], opts: {} },
      { id: 'compress-pdf', files: [testPdf1], opts: { level: 'recommended' } },
      { id: 'repair-pdf', files: [testPdf1], opts: {} },
      { id: 'ocr-pdf', files: [testPdf1], opts: {} },
      { id: 'jpg-to-pdf', files: [testPng], opts: {} },
      { id: 'word-to-pdf', files: [testPdf1], opts: {} },
      { id: 'ppt-to-pdf', files: [testPdf1], opts: {} },
      { id: 'excel-to-pdf', files: [testPdf1], opts: {} },
      { id: 'html-to-pdf', files: [testPdf1], opts: {} },
      { id: 'pdf-to-jpg', files: [testPdf1], opts: {} },
      { id: 'pdf-to-word', files: [testPdf1], opts: {} },
      { id: 'pdf-to-ppt', files: [testPdf1], opts: {} },
      { id: 'pdf-to-excel', files: [testPdf1], opts: {} },
      { id: 'pdf-to-pdfa', files: [testPdf1], opts: {} },
      { id: 'pdf-to-markdown', files: [testPdf1], opts: {} },
      { id: 'edit-pdf', files: [testPdf1], opts: { text: 'Edited' } },
      { id: 'rotate-pdf', files: [testPdf1], opts: { angle: 90 } },
      { id: 'add-page-numbers', files: [testPdf1], opts: { format: 'Page n of N' } },
      { id: 'add-watermark', files: [testPdf1], opts: { text: 'SAMPLE' } },
      { id: 'crop-pdf', files: [testPdf1], opts: { margin: 10 } },
      { id: 'pdf-forms', files: [testPdf1], opts: {} },
      { id: 'unlock-pdf', files: [testPdf1], opts: { password: '' } },
      { id: 'protect-pdf', files: [testPdf1], opts: { password: 'test' } },
      { id: 'sign-pdf', files: [testPdf1], opts: { name: 'Kiln User' } },
      { id: 'redact-pdf', files: [testPdf1], opts: { boxes: [{ page: 1, x: 20, y: 20, width: 100, height: 20 }] } },
      { id: 'compare-pdf', files: [testPdf1, testPdf2], opts: {} },
      { id: 'ai-summarizer', files: [testPdf1], opts: {} },
      { id: 'translate-pdf', files: [testPdf1], opts: { targetLang: 'es' } }
    ];

    const out = [];
    for (const t of tools) {
      try {
        const res = await window.converterEngine.runPdfTool(t.id, t.files, t.opts);
        const sz = res.size || res.blob?.size || 0;
        out.push({ id: t.id, pass: sz > 0, size: sz, name: res.name });
      } catch (err) {
        out.push({ id: t.id, pass: false, error: err.message });
      }
    }
    return out;
  }, { pdfB64: samplePdfBase64, pngB64: samplePngBase64 });

  await browser.close();

  console.log('--- 33 Native Tools Execution Report ---');
  let passCount = 0;
  for (const r of results) {
    if (r.pass) {
      passCount++;
      console.log(`[PASS] ${r.id.padEnd(20)} -> ${r.name} (${r.size} bytes)`);
    } else {
      console.error(`[FAIL] ${r.id.padEnd(20)} -> Error: ${r.error}`);
    }
  }
  console.log(`TOTAL: ${passCount} / ${results.length} PASSED`);
}

main().catch(console.error);
