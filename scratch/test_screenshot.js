const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  
  await page.goto('http://127.0.0.1:3000/app/', { waitUntil: 'networkidle' });
  
  const testFilePath = path.resolve('public/favicon-32.png');
  const fileInput = await page.locator('#donut-file-input');
  await fileInput.setInputFiles(testFilePath);
  
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'scratch/app_swirlzy_donut_open.png', fullPage: false });

  await browser.close();
  console.log('Donut open screenshot captured successfully!');
})();
