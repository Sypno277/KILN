const { chromium } = require('playwright');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const viewports = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 }
];

async function capture() {
  fs.mkdirSync('recon/screenshots', { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true
  });

  for (const vp of viewports) {
    for (const scheme of ['light', 'dark']) {
      const filename = `recon/screenshots/clone-${vp.name}-${scheme}.png`;
      console.log(`Capturing ${filename}...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: scheme
      });
      const page = await context.newPage();
      try {
        await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: filename, fullPage: false });
        console.log(`Saved ${filename}`);
      } catch (err) {
        console.error(`Failed ${filename}:`, err.message);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
}

capture().catch(console.error);
