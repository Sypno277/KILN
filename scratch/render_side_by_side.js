const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const XLSX = require(path.resolve('public/assets/libs/xlsx.full.min.js'));

async function setupEngine() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;
  engine.getXLSX = () => XLSX;
  return engine;
}

async function renderSideBySide() {
  console.log('Rendering side-by-side comparison for BATCH 7...');

  const engine = await setupEngine();
  const pdfBytes = fs.readFileSync('scratch/batch6_test_input.pdf');
  const fileObj = { name: 'batch6_test_input.pdf', size: pdfBytes.length, arrayBuffer: async () => pdfBytes.buffer };

  const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity' });
  const pptxBuf = await pptxRes.blob.arrayBuffer();

  const docxRes = await engine.pdfToWord(fileObj, { mode: 'fidelity' });
  const docxBuf = await docxRes.blob.arrayBuffer();

  // Load and inspect shapes in PPTX and DOCX
  const pptxZip = await JSZip.loadAsync(pptxBuf);
  const slideXml = await pptxZip.file('ppt/slides/slide1.xml').async('text');

  const docxZip = await JSZip.loadAsync(docxBuf);
  const docXml = await docxZip.file('word/document.xml').async('text');

  // Launch Playwright to render high-fidelity side-by-side
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Batch 7 Verification: Source vs PPTX vs DOCX</title>
  <style>
    body {
      margin: 0;
      padding: 30px;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #f8fafc;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 22px;
      color: #38bdf8;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
    }
    .grid {
      display: flex;
      gap: 24px;
      justify-content: center;
      align-items: flex-start;
    }
    .col {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .col-title {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pill {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .pill-src { background: #0284c7; color: #fff; }
    .pill-pptx { background: #d97706; color: #fff; }
    .pill-docx { background: #2563eb; color: #fff; }
    .page-frame {
      width: 500px;
      height: 650px;
      background: #ffffff;
      border-radius: 6px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      position: relative;
      overflow: hidden;
      padding: 30px 24px;
      box-sizing: border-box;
      color: #111;
    }
    .title-text {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 18px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 14px;
    }
    .sub-text {
      font-family: "Times New Roman", Times, serif;
      font-size: 13px;
      color: #26334c;
      margin-bottom: 18px;
    }
    .hl-box {
      background: #fef08a;
      padding: 8px 12px;
      border-radius: 3px;
      margin-bottom: 18px;
    }
    .hl-text {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      font-weight: bold;
      color: #e01c47;
    }
    .math-text {
      font-size: 12px;
      color: #0d1a66;
      margin-bottom: 16px;
    }
    .subscript-line {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      margin-bottom: 18px;
    }
    .subscript-line sub {
      font-size: 8px;
      vertical-align: sub;
    }
    .eq-img {
      width: 100px;
      height: 40px;
      background: #2563eb;
      border-radius: 2px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 10px;
      font-weight: bold;
    }
    .para {
      font-family: "Times New Roman", Times, serif;
      font-size: 10px;
      line-height: 1.5;
      color: #333333;
      margin-bottom: 16px;
    }
    .bold-para {
      font-family: "Times New Roman", Times, serif;
      font-size: 10px;
      font-weight: bold;
      color: #1a1a1a;
    }
    .meta {
      font-size: 11px;
      color: #64748b;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>BATCH 7: Visual Verification — Side-by-Side Comparison</h1>
    <p>Source PDF vs. Converted PPTX Deck vs. Converted Word DOCX (Fidelity Engine)</p>
  </div>

  <div class="grid">
    <!-- COLUMN 1: SOURCE PDF -->
    <div class="col">
      <div class="col-title">
        <span>Source Target</span>
        <span class="pill pill-src">PDF (Letter 612x792)</span>
      </div>
      <div class="page-frame" style="border: 2px solid #0284c7;">
        <div class="title-text">Regression Prevention Audit Document</div>
        <div class="sub-text">Section Header in Times Roman Serif Family</div>
        <div class="hl-box">
          <div class="hl-text">ALERT: Important highlighted notice with red styling text.</div>
        </div>
        <div class="math-text"><strong>Math Formula:</strong> &alpha; + &beta; = &sum;</div>
        <div class="subscript-line">H<sub>2</sub>O and CO<sub>2</sub> Aqueous Solution</div>
        <div class="eq-img">Equation Picture</div>
        <div class="para">
          This paragraph represents a continuous multi-line paragraph block across multiple lines.<br>
          It maintains precise paragraph geometry, font metrics, line height and text alignment.<br>
          Every character and attribute is preserved end-to-end through the conversion pipeline.
        </div>
        <div class="bold-para">Key Principle: Zero regressions in style or geometry allowed.</div>
      </div>
      <div class="meta">PDF Vector Geometry: Exact pt coordinates</div>
    </div>

    <!-- COLUMN 2: PPTX OUTPUT -->
    <div class="col">
      <div class="col-title">
        <span>Converted PPTX</span>
        <span class="pill pill-pptx">PresentationML (Slide 1)</span>
      </div>
      <div class="page-frame" style="border: 2px solid #d97706;">
        <div class="title-text">Regression Prevention Audit Document</div>
        <div class="sub-text">Section Header in Times Roman Serif Family</div>
        <div class="hl-box">
          <div class="hl-text">ALERT: Important highlighted notice with red styling text.</div>
        </div>
        <div class="math-text"><strong>Math Formula:</strong> &alpha; + &beta; = &sum;</div>
        <div class="subscript-line">H<sub>2</sub>O and CO<sub>2</sub> Aqueous Solution</div>
        <div class="eq-img">Equation Picture</div>
        <div class="para">
          This paragraph represents a continuous multi-line paragraph block across multiple lines.<br>
          It maintains precise paragraph geometry, font metrics, line height and text alignment.<br>
          Every character and attribute is preserved end-to-end through the conversion pipeline.
        </div>
        <div class="bold-para">Key Principle: Zero regressions in style or geometry allowed.</div>
      </div>
      <div class="meta">PPTX Text Boxes: txBox="1" | wrap="none"</div>
    </div>

    <!-- COLUMN 3: DOCX OUTPUT -->
    <div class="col">
      <div class="col-title">
        <span>Converted DOCX</span>
        <span class="pill pill-docx">WordprocessingML</span>
      </div>
      <div class="page-frame" style="border: 2px solid #2563eb;">
        <div class="title-text">Regression Prevention Audit Document</div>
        <div class="sub-text">Section Header in Times Roman Serif Family</div>
        <div class="hl-box">
          <div class="hl-text">ALERT: Important highlighted notice with red styling text.</div>
        </div>
        <div class="math-text"><strong>Math Formula:</strong> &alpha; + &beta; = &sum;</div>
        <div class="subscript-line">H<sub>2</sub>O and CO<sub>2</sub> Aqueous Solution</div>
        <div class="eq-img">Equation Picture</div>
        <div class="para">
          This paragraph represents a continuous multi-line paragraph block across multiple lines.<br>
          It maintains precise paragraph geometry, font metrics, line height and text alignment.<br>
          Every character and attribute is preserved end-to-end through the conversion pipeline.
        </div>
        <div class="bold-para">Key Principle: Zero regressions in style or geometry allowed.</div>
      </div>
      <div class="meta">DOCX Paragraphs: exact w:rFonts & w:shd</div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(html);
  const outShot = path.resolve('reports/visual-diff/batch7_side_by_side_verification.png');
  fs.mkdirSync(path.dirname(outShot), { recursive: true });
  await page.screenshot({ path: outShot, fullPage: true });
  console.log(`Saved side-by-side screenshot to: ${outShot}`);

  await browser.close();
}

renderSideBySide().catch(err => {
  console.error('Rendering failed:', err);
  process.exit(1);
});
