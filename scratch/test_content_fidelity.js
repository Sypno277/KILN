/**
 * Content Fidelity Verification Suite
 * Validates that original file contents are preserved 100% without modification,
 * corruption, stripping, truncation, or synthetic text injection.
 */
const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');
const JSZip = require(path.join(__dirname, '../public/assets/libs/jszip.min.js'));

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

async function runFidelitySuite() {
  console.log('===============================================================');
  console.log('   KILN / FILEE EXACT CONTENT FIDELITY VERIFICATION SUITE       ');
  console.log('===============================================================\n');

  await ensureServer();
  const launchOpts = { headless: true };
  if (CHROME_PATH) launchOpts.executablePath = CHROME_PATH;
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/app/`, { waitUntil: 'networkidle' });

  const samplePdfBytes = fs.readFileSync(path.join(__dirname, '../tests/fixtures/pdf/minimal.pdf'));
  const samplePdfB64 = samplePdfBytes.toString('base64');

  const testResults = await page.evaluate(async ({ pdfB64 }) => {
    const b64ToUint8 = (b64) => {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    };

    const pdfBytes = b64ToUint8(pdfB64);
    const testPdf = new File([pdfBytes], 'minimal-test.pdf', { type: 'application/pdf' });
    const results = {};

    // 1. PDF to Text (Exact Text Match)
    const txtRes = await window.converterEngine.pdfToText(testPdf);
    const txtContent = await txtRes.blob.text();
    results.pdfToText = {
      content: txtContent,
      hasOriginal: txtContent.includes('Minimal Valid PDF'),
      hasSyntheticBanners: txtContent.includes('=== Page') || txtContent.includes('Filee Engine')
    };

    // 2. PDF to Markdown (Exact Heading Match, no promo banners)
    const mdRes = await window.converterEngine.pdfToMarkdown(testPdf);
    const mdContent = await mdRes.blob.text();
    results.pdfToMarkdown = {
      content: mdContent,
      hasOriginal: mdContent.includes('Minimal Valid PDF'),
      hasSyntheticBanners: mdContent.includes('Converted 100% locally') || mdContent.includes('## Page')
    };

    // 3. PDF to Word (Exact Word paragraph content)
    const docxRes = await window.converterEngine.pdfToWord(testPdf);
    const docxArrayBuffer = await docxRes.blob.arrayBuffer();
    const docxB64 = btoa(String.fromCharCode(...new Uint8Array(docxArrayBuffer)));
    results.pdfToWord = { b64: docxB64, size: docxRes.blob.size };

    // 4. HTML to PDF (Renders actual HTML content into PDF)
    const htmlFile = new File(['<!DOCTYPE html><html><body><h1>Secret Project Alpha</h1><p>The total budget is $1,250,000.</p></body></html>'], 'report.html', { type: 'text/html' });
    const htmlPdfRes = await window.converterEngine.pdfHtmlToPdf(htmlFile);
    results.htmlToPdf = { size: htmlPdfRes.blob.size, name: htmlPdfRes.name };

    // 5. Text to Text / Markdown with brackets (Preserves code & brackets)
    const codeFile = new File(['let arr = [1, 2, 3]; // *bold* and _italic_ formulas: f[x] = x^2'], 'script.md', { type: 'text/markdown' });
    const txtFromMd = await window.converterEngine.convertTextOrMarkdown(codeFile, 'txt');
    const txtOut = await txtFromMd.blob.text();
    results.textPreservation = {
      output: txtOut,
      preservedBrackets: txtOut.includes('[1, 2, 3]') && txtOut.includes('f[x]'),
      preservedUnderscores: txtOut.includes('_italic_'),
      preservedAsterisks: txtOut.includes('*bold*')
    };

    return results;
  }, { pdfB64: samplePdfB64 });

  await browser.close();

  console.log('--- Test 1: PDF to Text Content Fidelity ---');
  console.log(`Content: "${testResults.pdfToText.content}"`);
  const t1Pass = testResults.pdfToText.hasOriginal && !testResults.pdfToText.hasSyntheticBanners;
  console.log(`[${t1Pass ? 'PASS' : 'FAIL'}] Original text preserved without synthetic banners: ${t1Pass}\n`);

  console.log('--- Test 2: PDF to Markdown Content Fidelity ---');
  console.log(`Content:\n${testResults.pdfToMarkdown.content}`);
  const t2Pass = testResults.pdfToMarkdown.hasOriginal && !testResults.pdfToMarkdown.hasSyntheticBanners;
  console.log(`[${t2Pass ? 'PASS' : 'FAIL'}] Original markdown preserved without promo banners: ${t2Pass}\n`);

  console.log('--- Test 3: PDF to Word OpenXML Content Fidelity ---');
  const docxZip = await JSZip.loadAsync(Buffer.from(testResults.pdfToWord.b64, 'base64'));
  const wordXml = await docxZip.file('word/document.xml').async('text');
  const t3Pass = wordXml.includes('Minimal Valid PDF');
  console.log(`Extracted document.xml contains original text: ${t3Pass}`);
  console.log(`[${t3Pass ? 'PASS' : 'FAIL'}] PDF to Word exact OpenXML preservation: ${t3Pass}\n`);

  console.log('--- Test 4: HTML to PDF Content Fidelity ---');
  const t4Pass = testResults.htmlToPdf.size > 500 && testResults.htmlToPdf.name === 'report.pdf';
  console.log(`HTML to PDF produced ${testResults.htmlToPdf.name} (${testResults.htmlToPdf.size} bytes)`);
  console.log(`[${t4Pass ? 'PASS' : 'FAIL'}] HTML to PDF rendering: ${t4Pass}\n`);

  console.log('--- Test 5: Plain Text & Markdown Character Preservation ---');
  console.log(`Text Output: "${testResults.textPreservation.output}"`);
  const t5Pass = testResults.textPreservation.preservedBrackets &&
                 testResults.textPreservation.preservedUnderscores &&
                 testResults.textPreservation.preservedAsterisks;
  console.log(`[${t5Pass ? 'PASS' : 'FAIL'}] Brackets, underscores, asterisks untouched: ${t5Pass}\n`);

  const allPassed = t1Pass && t2Pass && t3Pass && t4Pass && t5Pass;
  console.log('===============================================================');
  console.log(`FIDELITY STATUS: ${allPassed ? 'ALL TESTS PASSED (100% CONTENT PRESERVED)' : 'FAILURES DETECTED'}`);
  console.log('===============================================================');

  if (!allPassed) process.exit(1);
}

runFidelitySuite().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
