/**
 * Filee Web App Studio Comprehensive Test Suite
 * Validates that all features of the Filee application operate with absolute precision in the browser.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3000';
const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : (fs.existsSync('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe')
      ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      : undefined);

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

async function runStudioSuite() {
  console.log('==============================================');
  console.log('     FILEE WEB APP STUDIO AUTOMATED SUITE     ');
  console.log('==============================================');

  const serverProc = await ensureServer();

  const launchOpts = { headless: true };
  if (CHROME_PATH) launchOpts.executablePath = CHROME_PATH;
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function record(desc, cond, extra = '') {
    if (cond) {
      console.log(`[PASS] ${desc} ${extra ? '(' + extra + ')' : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc} ${extra ? '(' + extra + ')' : ''}`);
      failed++;
    }
  }

  try {
    // Test 1: Studio Routes & Status
    console.log('\n--- Test 1: Studio Routes Verification ---');
    for (const route of ['/app/', '/ko/app/', '/zh-cn/app/']) {
      const resp = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      record(`Studio route ${route} returns 200 OK`, resp.status() === 200, `Status: ${resp.status()}`);
    }

    // Go to English studio
    await page.goto(`${BASE_URL}/app/`, { waitUntil: 'networkidle' });

    // Test 2: Tab Navigation between all 6 workstations
    console.log('\n--- Test 2: Studio Workstation Tab Switching ---');
    const tabs = ['donut', 'batch', 'presets', 'watcher', 'cli', 'history'];
    for (const tab of tabs) {
      await page.click(`button[data-tab="${tab}"]`);
      await page.waitForTimeout(100);
      const isActive = await page.locator(`.studio-panel[data-panel="${tab}"].is-active`).count() > 0;
      record(`Tab [${tab}] activates corresponding panel`, isActive);
    }

    // Test 3: Radial Donut Converter with Real File
    console.log('\n--- Test 3: Radial Donut Real Conversion ---');
    await page.click('button[data-tab="donut"]');

    // Create a temporary 100x100 real PNG file
    const tmpPng = path.join(__dirname, 'test-sample.png');
    // Minimal valid 1x1 PNG buffer
    const minimalPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
    fs.writeFileSync(tmpPng, minimalPng);

    // Set file input
    const fileInput = page.locator('#donut-file-input');
    await fileInput.setInputFiles(tmpPng);
    await page.waitForTimeout(300);

    // Verify Donut menu opened with slices
    const donutOpen = await page.locator('#studio-donut-wrapper.is-active').count() > 0;
    record('Donut radial menu opens upon file selection', donutOpen);

    const segCount = await page.locator('#studio-donut-svg .seg').count();
    record('Donut renders format slices', segCount >= 4, `Found ${segCount} slices`);

    // Click the first slice (e.g. PNG/JPG/WEBP)
    await page.locator('#studio-donut-svg .seg').first().click();

    // Wait for conversion completion banner
    await page.waitForSelector('#donut-result-banner.is-active', { timeout: 8000 });
    const resTitle = await page.locator('#donut-res-title').textContent();
    record('Real conversion completes with result banner', resTitle.includes('→'), `Result: ${resTitle}`);

    // Clean up temp file
    if (fs.existsSync(tmpPng)) fs.unlinkSync(tmpPng);

    // Test 4: Batch Studio Multi-File Processing
    console.log('\n--- Test 4: Batch Studio Multi-File Queue ---');
    await page.click('button[data-tab="batch"]');

    const tmpBatch1 = path.join(__dirname, 'batch1.txt');
    const tmpBatch2 = path.join(__dirname, 'batch2.json');
    fs.writeFileSync(tmpBatch1, 'Sample document text for conversion');
    fs.writeFileSync(tmpBatch2, '{"name":"Filee","type":"Web Studio"}');

    const batchInput = page.locator('#batch-file-input');
    await batchInput.setInputFiles([tmpBatch1, tmpBatch2]);
    await page.waitForTimeout(300);

    const batchRows = await page.locator('#batch-table-body tr').count();
    record('Batch queue populates with multiple files', batchRows === 2, `Rows: ${batchRows}`);

    // Trigger Convert All
    await page.click('#batch-convert-all-btn');
    await page.waitForSelector('#batch-progress-text', { timeout: 8000 });
    await page.waitForTimeout(1000);

    const progressTxt = await page.locator('#batch-progress-text').textContent();
    record('Batch parallel conversion completes all items', progressTxt.includes('Completed') || progressTxt.includes('converted'), `Text: ${progressTxt}`);

    if (fs.existsSync(tmpBatch1)) fs.unlinkSync(tmpBatch1);
    if (fs.existsSync(tmpBatch2)) fs.unlinkSync(tmpBatch2);

    // Test 5: Presets & Customization
    console.log('\n--- Test 5: Presets & LocalStorage Persistence ---');
    await page.click('button[data-tab="presets"]');

    // Change quality to 80
    await page.evaluate(() => {
      const slider = document.getElementById('preset-quality');
      slider.value = '80';
      slider.dispatchEvent(new Event('input'));
    });
    const qVal = await page.locator('#preset-quality-val').textContent();
    record('Quality slider updates live label', qVal === '80%', `Label: ${qVal}`);

    // Save presets
    await page.click('#preset-save-btn');
    await page.waitForTimeout(200);

    const savedStorage = await page.evaluate(() => localStorage.getItem('filee_studio_presets'));
    record('Presets persist to localStorage', savedStorage && savedStorage.includes('"quality":80'));

    // Test 6: Folder Watcher Simulation
    console.log('\n--- Test 6: Folder Watcher Engine & Simulation ---');
    await page.click('button[data-tab="watcher"]');

    await page.click('#watcher-simulate-btn');
    await page.waitForTimeout(500);

    const logText = await page.locator('#watcher-log-box').textContent();
    record('Watcher simulates file drop and auto-converts', logText.includes('Converted') && logText.includes('simulated-input.png'));

    // Test 7: Web Terminal / CLI Simulator
    console.log('\n--- Test 7: Interactive Terminal CLI Simulator ---');
    await page.click('button[data-tab="cli"]');

    const terminalInput = page.locator('#terminal-input');

    // 7a. kiln --help
    await terminalInput.fill('kiln --help');
    await terminalInput.press('Enter');
    await page.waitForTimeout(200);
    let termText = await page.locator('#terminal-output').textContent();
    record('Terminal executes "kiln --help"', termText.includes('Usage: kiln [command]'));

    // 7b. kiln formats
    await terminalInput.fill('kiln formats');
    await terminalInput.press('Enter');
    await page.waitForTimeout(200);
    termText = await page.locator('#terminal-output').textContent();
    record('Terminal executes "kiln formats"', termText.includes('244 total'));

    // 7c. kiln version
    await terminalInput.fill('kiln version');
    await terminalInput.press('Enter');
    await page.waitForTimeout(200);
    termText = await page.locator('#terminal-output').textContent();
    record('Terminal executes "kiln version"', termText.includes('1.11.0'));

    // 7d. kiln convert cli-demo.png --to webp
    await terminalInput.fill('kiln convert demo.png --to webp');
    await terminalInput.press('Enter');
    await page.waitForFunction(() => {
      const el = document.getElementById('terminal-output');
      return el && el.textContent.includes('Successfully converted');
    }, { timeout: 8000 });
    termText = await page.locator('#terminal-output').textContent();
    record('Terminal executes "kiln convert" with real engine', termText.includes('Successfully converted'));

    // Test 8: History Vault
    console.log('\n--- Test 8: History Vault Inspection ---');
    await page.click('button[data-tab="history"]');
    const histRows = await page.locator('#history-table-body tr').count();
    record('History Vault logs all session conversions', histRows >= 3, `Logged: ${histRows} conversions`);

    // Test 9: Native PDF Tools Hub (33 Tools)
    console.log('\n--- Test 9: Native PDF Tools Hub & Privacy Ledger ---');
    await page.click('button[data-tab="pdf-tools"]');
    await page.waitForTimeout(300);
    const pdfCardsCount = await page.locator('#pdf-tools-grid .pdf-tool-card').count();
    record('PDF Tools Hub displays all 33 native tools', pdfCardsCount === 33, `Count: ${pdfCardsCount}`);

    // Search filter
    await page.fill('#pdf-tool-search', 'watermark');
    await page.waitForTimeout(200);
    const filteredCount = await page.locator('#pdf-tools-grid .pdf-tool-card').count();
    const filteredText = await page.locator('#pdf-tools-grid .pdf-tool-card').first().textContent();
    record('PDF Hub search filters tools correctly', filteredCount === 1 && filteredText.includes('Watermark'));

    // Reset search
    await page.fill('#pdf-tool-search', '');
    await page.waitForTimeout(200);

    // Group filter pill
    await page.click('#pdf-filter-pills button[data-group="Optimize"]');
    await page.waitForTimeout(200);
    const optimizeCount = await page.locator('#pdf-tools-grid .pdf-tool-card').count();
    record('Group filter pill isolates category tools', optimizeCount === 3, `Optimize tools: ${optimizeCount}`);

    // Reset filter
    await page.click('#pdf-filter-pills button[data-group="all"]');

    // Test 10: Privacy Audit & Data Ledger Panel
    console.log('\n--- Test 10: Privacy Audit & Data Ledger Panel ---');
    await page.click('button[data-tab="privacy"]');
    await page.waitForTimeout(200);
    const zeroLeakBadge = await page.locator('.studio-card-head').last().textContent();
    record('Privacy Audit panel confirms zero network leaks', zeroLeakBadge.includes('Zero Network Leaks'));
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
    if (serverProc) serverProc.kill();
  }

  console.log('\n==============================================');
  console.log(`TOTAL STUDIO TESTS: ${passed + failed}`);
  console.log(`PASSED:             ${passed}`);
  console.log(`FAILED:             ${failed}`);
  console.log(`PARITY:             ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('==============================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runStudioSuite();
