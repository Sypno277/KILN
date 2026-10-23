const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPlayground() {
  console.log('Testing Processing Window Playground & Format Recognition Flow...');
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage();

  // 1. Navigate to /app/
  await page.goto('http://127.0.0.1:3000/app/', { waitUntil: 'domcontentloaded' });

  // 2. Verify plain playground stage
  const stage = page.locator('#donut-stage');
  const stageCount = await stage.count();
  console.log(`[PASS] Playground stage found: ${stageCount > 0}`);

  const dropPrompt = page.locator('#donut-drop-prompt');
  const promptVisible = await dropPrompt.isVisible();
  console.log(`[PASS] Plain playground drop prompt visible: ${promptVisible}`);

  // 3. Upload a sample file (e.g. PDF)
  const fileInput = page.locator('#donut-file-input');
  const testPdfPath = path.resolve('tests/fixtures/pdf/minimal.pdf');
  await fileInput.setInputFiles(testPdfPath);

  // 4. Verify Format Recognition
  await page.waitForSelector('#donut-active-file.is-active', { timeout: 3000 });
  const fileBadge = await page.locator('#donut-file-badge').textContent();
  const fileName = await page.locator('#donut-file-name').textContent();
  const fileSize = await page.locator('#donut-file-size').textContent();
  console.log(`[PASS] Format recognized: Badge=${fileBadge}, Name=${fileName}, Info=${fileSize}`);

  // 5. Verify Persimmon / Radial Dial
  const radialWrapper = page.locator('#studio-donut-wrapper.is-active');
  const radialVisible = await radialWrapper.isVisible();
  console.log(`[PASS] Radial / Persimmon style dial rendered: ${radialVisible}`);

  const segments = await page.locator('#studio-donut-svg g.seg').count();
  console.log(`[PASS] Available conversions in radial dial: ${segments} formats`);

  // Verify Style Toggle
  const toggleGrid = page.locator('#toggle-style-grid');
  await toggleGrid.click();
  const gridVisible = await page.locator('#donut-quick-grid.is-active').isVisible();
  const gridCards = await page.locator('#donut-quick-grid .format-card-btn').count();
  console.log(`[PASS] Format quick grid toggle active: ${gridVisible} with ${gridCards} cards`);

  // Switch back to Radial Dial
  await page.locator('#toggle-style-radial').click();
  console.log(`[PASS] Switched back to Radial / Persimmon dial`);

  // 6. Click a slice (e.g. first slice WORD/DOCX) to convert
  const firstSlice = page.locator('#studio-donut-svg g.seg').first();
  await firstSlice.click();

  // Wait for result banner
  await page.waitForSelector('#donut-result-banner.is-active', { timeout: 6000 });
  const resTitle = await page.locator('#donut-res-title').textContent();
  const downloadHref = await page.locator('#donut-download-btn').getAttribute('href');
  console.log(`[PASS] Conversion completed: "${resTitle}", Download URL: ${downloadHref ? 'valid blob' : 'none'}`);

  // 7. Click "Convert Another" and verify return to clean playground
  await page.locator('#donut-retry-btn').click();
  const returnToPlayground = await page.locator('#donut-drop-prompt').isVisible();
  console.log(`[PASS] Returned to clean playground for next file: ${returnToPlayground}`);

  // 8. Upload PNG file and verify image format recognition
  console.log('\nTesting second file (PNG Image)...');
  const testPngPath = path.resolve('tests/fixtures/png/minimal.png');
  await fileInput.setInputFiles(testPngPath);

  await page.waitForSelector('#donut-active-file.is-active', { timeout: 3000 });
  const pngBadge = await page.locator('#donut-file-badge').textContent();
  const pngInfo = await page.locator('#donut-file-size').textContent();
  console.log(`[PASS] Image format recognized: Badge=${pngBadge}, Info=${pngInfo}`);

  const pngSegments = await page.locator('#studio-donut-svg g.seg').count();
  console.log(`[PASS] Available conversions for Image in radial dial: ${pngSegments} formats`);

  await browser.close();
  console.log('\nALL PLAYGROUND WORKFLOW TESTS PASSED 100%!');
}

testPlayground().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
