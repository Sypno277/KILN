const { chromium } = require('playwright');
const path = require('path');

async function renderHtml() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1275, height: 1650 } });
  const htmlPath = path.resolve('scratch/output_week1.html');
  await page.goto(`file://${htmlPath}`);
  await page.screenshot({ path: 'scratch/output_week1_html_render.png', fullPage: true });
  await browser.close();
  console.log('SUCCESS: Rendered HTML with Playwright');
}

renderHtml().catch(err => {
  console.error('Playwright render error:', err);
  process.exit(1);
});
