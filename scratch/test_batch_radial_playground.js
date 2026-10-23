const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : (fs.existsSync('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe')
      ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      : undefined);

const http = require('http');

function ensureServer() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3000/', (res) => {
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

async function testBatchRadialPlayground() {
  console.log('=== TESTING BATCH PLAYGROUND PLANE & RADIAL CONVERSIONS ===');
  await ensureServer();

  const launchOpts = { headless: true };
  if (CHROME_PATH) launchOpts.executablePath = CHROME_PATH;

  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let targetUrl = 'http://127.0.0.1:3000/app/?tab=batch';
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  console.log(`Navigated to ${targetUrl}`);

  try {
    // 1. Verify batch stage plane exists and is visible
    const stage = page.locator('#batch-stage');
    console.log('[1] Checking batch stage plane...');
    if (!(await stage.isVisible())) throw new Error('Batch stage plane is not visible');
    console.log('✓ Batch stage plane is visible');

    // 2. Verify empty drop prompt exists
    const dropPrompt = page.locator('#batch-drop-prompt');
    if (!(await dropPrompt.isVisible())) throw new Error('Batch drop prompt not visible on empty plane');
    console.log('✓ Batch drop prompt is visible');

    // 3. Create 3 different dummy files: a PNG, a Markdown doc, and a JSON file
    const file1 = path.join(__dirname, 'test1_image.png');
    const file2 = path.join(__dirname, 'test2_notes.md');
    const file3 = path.join(__dirname, 'test3_data.json');

    // 100x100 real PNG buffer
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAPklEQVR42u3RAQ0AAAgDoK9/6RsYqQc0kHTJ7qcAEREREREREREREREREREREREREREREREREREREREREfEBD69hAWo0dFsAAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(file1, pngBuffer);
    fs.writeFileSync(file2, '# Heading\nMarkdown text');
    fs.writeFileSync(file3, '{"items":[1,2,3]}');

    // 4. Upload all 3 files simultaneously onto the plane
    console.log('[2] Uploading multiple files onto the plane...');
    const input = page.locator('#batch-file-input');
    await input.setInputFiles([file1, file2, file3]);
    await page.waitForTimeout(300);

    // 5. Verify individual cards are arranged on the plane grid
    const cards = page.locator('.batch-file-card');
    const count = await cards.count();
    console.log(`✓ Arranged cards count on plane: ${count}`);
    if (count !== 3) throw new Error(`Expected 3 cards, got ${count}`);

    // 6. Verify each card has its own radial / persimmon style SVG dial
    console.log('[3] Checking radial persimmon dials on each file card...');
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const name = await card.locator('.batch-card-filename').textContent();
      const badge = await card.locator('.batch-file-badge').textContent();
      const petals = await card.locator('.batch-seg').count();
      const hubText = await card.locator('.hub-title').textContent();
      const targetHint = await card.locator('.batch-card-target-hint').textContent();
      console.log(`  Card ${i + 1}: [${badge}] "${name}" | Petals: ${petals} | Hub: ${hubText} | ${targetHint}`);

      if (petals === 0) throw new Error(`Card ${i + 1} has no radial petals!`);
    }
    console.log('✓ All 3 cards have individual SVG radial dials with petals!');

    // 7. Test interactive radial petal click on card 2 (Markdown file)
    console.log('[4] Testing radial petal selection on card 2...');
    const card2 = cards.nth(1);
    const petalsCard2 = card2.locator('.batch-seg');
    const petalCount = await petalsCard2.count();
    if (petalCount > 1) {
      // Click the 2nd petal
      await petalsCard2.nth(1).click();
      await page.waitForTimeout(100);
      const newTarget = await card2.locator('.batch-card-target-hint .target-val').textContent();
      console.log(`✓ Clicked radial petal on Card 2, selected target: ${newTarget}`);
    }

    // 8. Test individual file conversion on card 1
    console.log('[5] Testing individual file conversion on card 1...');
    const card1ConvBtn = cards.nth(0).locator('.batch-card-actions button:has-text("Convert")');
    if (await card1ConvBtn.isVisible()) {
      await card1ConvBtn.click();
      // Wait for card 1 to complete and show individual download button
      const dlBtnCard1 = cards.nth(0).locator('.batch-card-actions button:has-text("Download")');
      await dlBtnCard1.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✓ Card 1 converted individually! Download button is active on card 1');
    }

    // 9. Test "Convert All" (Batch conversion)
    console.log('[6] Testing "Convert All" for the entire batch...');
    const convertAllBtn = page.locator('#batch-convert-all-btn');
    await convertAllBtn.click();

    // Wait for global progress text to show completion
    const progressTxt = page.locator('#batch-progress-text');
    await page.waitForFunction(() => {
      const el = document.getElementById('batch-progress-text');
      return el && el.textContent.includes('Completed all');
    }, { timeout: 10000 });

    const finalTxt = await progressTxt.textContent();
    console.log(`✓ Batch Progress status: "${finalTxt}"`);

    // 10. Verify Batch ZIP download button is active & visible
    console.log('[7] Checking Batch ZIP download button...');
    const zipBtn = page.locator('#batch-zip-download-btn');
    if (!(await zipBtn.isVisible())) throw new Error('Batch ZIP download button is not visible!');
    console.log('✓ Batch ZIP download button is visible and ready!');

    // 11. Verify all 3 cards now have individual download buttons
    const downloadBtns = page.locator('.batch-file-card .batch-card-actions button:has-text("Download")');
    const dlCount = await downloadBtns.count();
    console.log(`✓ Cards with individual download buttons: ${dlCount}/${count}`);
    if (dlCount !== 3) throw new Error(`Expected all 3 cards to have download buttons, found ${dlCount}`);

    // Cleanup temp files
    [file1, file2, file3].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });

    console.log('\n=== ALL BATCH PLAYGROUND & RADIAL TESTS PASSED 100%! ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testBatchRadialPlayground();
