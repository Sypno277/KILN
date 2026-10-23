const { chromium } = require('playwright');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    colorScheme: 'dark'
  });
  const page = await context.newPage();
  const filename = 'recon/screenshots/clone-768-dark.png';
  try {
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: filename, fullPage: false });
    console.log(`Saved ${filename}`);
  } catch (err) {
    console.error(`Failed ${filename}:`, err.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

capture().catch(console.error);
