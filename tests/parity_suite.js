const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function record(name, pass, details = '') {
  results.tests.push({ name, pass, details });
  if (pass) {
    results.passed++;
    console.log(`[PASS] ${name} ${details ? '(' + details + ')' : ''}`);
  } else {
    results.failed++;
    console.error(`[FAIL] ${name} - ${details}`);
  }
}

function ensureServer() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/`, (res) => {
      resolve(null);
    });
    req.on('error', () => {
      const { spawn } = require('child_process');
      const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
        stdio: 'ignore'
      });
      setTimeout(() => resolve(child), 1000);
    });
  });
}

async function runTests() {
  console.log('==============================================');
  console.log('   FILEE WEB REVERSE-ENGINEERING TEST SUITE   ');
  console.log('==============================================\n');

  const serverProc = await ensureServer();

  const launchOpts = { headless: true };
  if (CHROME_PATH) launchOpts.executablePath = CHROME_PATH;
  const browser = await chromium.launch(launchOpts);

  const page = await browser.newPage();

  // Test 1: HTTP 200 on Internal Routes Check
  console.log('--- Test 1: Check Internal Routes Return 200 ---');
  const slugs = JSON.parse(fs.readFileSync('recon/convert-slugs.json', 'utf8'));
  const testRoutes = [
    '/', '/ko/', '/zh-cn/',
    '/app/', '/ko/app/', '/zh-cn/app/',
    '/formats/', '/ko/formats/', '/zh-cn/formats/',
    '/cli/', '/ko/cli/', '/zh-cn/cli/',
    '/robots.txt', '/sitemap.xml',
    '/assets/styles.css', '/assets/main.js', '/assets/downloads.js'
  ];
  // Add sample convert routes across 3 languages
  for (const s of slugs.slice(0, 15)) {
    testRoutes.push(`/convert/${s}/`);
    testRoutes.push(`/ko/convert/${s}/`);
    testRoutes.push(`/zh-cn/convert/${s}/`);
  }

  let routesOk = true;
  let checkedCount = 0;
  for (const r of testRoutes) {
    const res = await page.goto(`${BASE_URL}${r}`, { waitUntil: 'domcontentloaded' });
    if (res.status() !== 200) {
      routesOk = false;
      record(`Route ${r}`, false, `Status ${res.status()}`);
    } else {
      checkedCount++;
    }
  }
  record('Internal Route Verification (All 200 OK)', routesOk, `${checkedCount} routes checked`);

  // Test 2: Landing Page Portal Brief & Processing Window Navigation
  console.log('\n--- Test 2: Landing Page Portal Brief & Single CTA ---');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  
  const hasBrief = await page.locator('.portal-brief').count() > 0;
  record('Landing page contains website brief', hasBrief);

  const ctaBtn = page.locator('#go-to-processing-window');
  const hasCta = await ctaBtn.count() > 0;
  const ctaHref = hasCta ? await ctaBtn.getAttribute('href') : '';
  record('Landing page has Go to Processing Window button', hasCta && ctaHref === '/app/', `href: ${ctaHref}`);

  // Click CTA and verify navigation to Processing Window
  await ctaBtn.click();
  await page.waitForURL('**/app/');
  const onApp = page.url().includes('/app/');
  record('Go to Processing Window button navigates to /app/', onApp, `Current URL: ${page.url()}`);

  // Test 3: Language Switching on Landing Page
  console.log('\n--- Test 3: Language Switching ---');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  const langMenu = page.locator('.lang-menu');
  await langMenu.locator('summary').click();
  const menuOpen = await page.locator('.lang-menu[open]').count() > 0;
  record('Language menu toggles open', menuOpen);

  // Click Korean link
  await page.locator('.lang-menu a[href="/ko/"]').click();
  await page.waitForURL('**/ko/');
  const koLang = await page.locator('html').getAttribute('lang');
  const koCta = await page.locator('#go-to-processing-window').count() > 0;
  record('Language switch to Korean (/ko/) with processing button', koLang === 'ko' && koCta, `HTML lang: ${koLang}`);

  // Switch to Chinese
  await page.locator('.lang-menu summary').click();
  await page.locator('.lang-menu a[href="/zh-cn/"]').click();
  await page.waitForURL('**/zh-cn/');
  const zhLang = await page.locator('html').getAttribute('lang');
  const zhCta = await page.locator('#go-to-processing-window').count() > 0;
  record('Language switch to Chinese (/zh-cn/) with processing button', zhLang === 'zh-CN' && zhCta, `HTML lang: ${zhLang}`);

  // Test 4: Theme Switching (prefers-color-scheme)
  console.log('\n--- Test 4: Theme Switching ---');
  const lightContext = await browser.newContext({ colorScheme: 'light' });
  const lightPage = await lightContext.newPage();
  await lightPage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  const lightBg = await lightPage.evaluate(() => getComputedStyle(document.body).backgroundColor);

  const darkContext = await browser.newContext({ colorScheme: 'dark' });
  const darkPage = await darkContext.newPage();
  await darkPage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  const darkBg = await darkPage.evaluate(() => getComputedStyle(document.body).backgroundColor);

  record('Light theme background is light', lightBg.includes('247') || lightBg.includes('246') || lightBg.includes('242') || lightBg.includes('255'), `Color: ${lightBg}`);
  record('Dark theme background is dark', darkBg.includes('15') || darkBg.includes('14') || darkBg.includes('22') || darkBg.includes('18'), `Color: ${darkBg}`);
  await lightContext.close();
  await darkContext.close();

  // Test 5: Processing Window (/app/) Verification
  console.log('\n--- Test 5: Processing Window Features & Tool Grid ---');
  await page.goto(`${BASE_URL}/app/`, { waitUntil: 'domcontentloaded' });
  const dropPrompt = await page.locator('#donut-drop-prompt').count();
  record('Processing window contains drop prompt for files', dropPrompt > 0);

  // Switch to PDF tools tab
  await page.locator('#tab-pdf-tools').click();
  await page.waitForSelector('.pdf-tool-card', { timeout: 3000 });
  const toolCards = await page.locator('.pdf-tool-card').count();
  record('Processing window renders native 33 PDF tools', toolCards >= 33, `Found ${toolCards} tool cards`);

  // Test 6: Format Catalog Inspection
  console.log('\n--- Test 6: Format Catalog Inspection ---');
  await page.goto(`${BASE_URL}/formats/`, { waitUntil: 'domcontentloaded' });
  const catCount = await page.locator('.cat-section').count();
  record('Formats catalog renders all 17 categories', catCount === 17, `Found ${catCount} categories`);

  const fmtCards = await page.locator('.route-table tr').count();
  record('Formats routing tables rendered with format chips', fmtCards > 50, `Found ${fmtCards} routing rows`);

  await browser.close();
  if (serverProc) serverProc.kill();

  // Print Summary
  console.log('\n==============================================');
  console.log(`TOTAL TESTS: ${results.passed + results.failed}`);
  console.log(`PASSED:      ${results.passed}`);
  console.log(`FAILED:      ${results.failed}`);
  console.log(`PARITY:      ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('==============================================\n');

  fs.writeFileSync('tests/results.json', JSON.stringify(results, null, 2));
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
