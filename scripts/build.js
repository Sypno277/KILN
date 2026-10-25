const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function normalizeHtml(html) {
  // Normalize stylesheet and script paths to standard or maintain hashed paths
  // We provide both hashed and non-hashed files in dist/assets/ so both work seamlessly.
  return html;
}

const { runLint: runDefaultsLint } = require('./lint_no_hidden_defaults');
const { runLint: runStyleXmlLint } = require('./lint_style_and_xml');

async function build() {
  console.log('--- Starting Kiln Website Build ---');
  // Enforce architectural guardrails:
  runDefaultsLint();
  await runStyleXmlLint();

  ensureDir(DIST);

  // 1. Copy public static assets (media, icons, manifests)
  console.log('Copying static assets from public/ to dist/ ...');
  copyDir(path.join(__dirname, '..', 'public'), DIST);

  // 2. Prepare assets directory
  const assetsDist = path.join(DIST, 'assets');
  ensureDir(assetsDist);

  // Stylesheet
  const rawCss = fs.readFileSync(path.join(__dirname, '..', 'recon/assets/styles.css'), 'utf8');
  fs.writeFileSync(path.join(assetsDist, 'styles.css'), rawCss);
  fs.writeFileSync(path.join(assetsDist, 'styles.3a73bf9e74.css'), rawCss);
  console.log('Wrote styles.css and styles.3a73bf9e74.css');

  // Downloads script
  const rawDownloads = fs.readFileSync(path.join(__dirname, '..', 'recon/assets/downloads.js'), 'utf8');
  fs.writeFileSync(path.join(assetsDist, 'downloads.js'), rawDownloads);
  fs.writeFileSync(path.join(assetsDist, 'downloads.65899ced11.js'), rawDownloads);
  console.log('Wrote downloads.js and downloads.65899ced11.js');

  // Main script
  let rawMain = fs.readFileSync(path.join(__dirname, '..', 'recon/assets/main.js'), 'utf8');
  // Both ./downloads.js and ./downloads.65899ced11.js will resolve
  fs.writeFileSync(path.join(assetsDist, 'main.js'), rawMain);
  fs.writeFileSync(path.join(assetsDist, 'main.dc161caed7.js'), rawMain);
  // App studio assets
  const appCssSrc = path.join(__dirname, '..', 'public/assets/app.css');
  if (fs.existsSync(appCssSrc)) {
    fs.copyFileSync(appCssSrc, path.join(assetsDist, 'app.css'));
    console.log('Wrote app.css');
  }
  const appJsSrc = path.join(__dirname, '..', 'public/assets/app.js');
  if (fs.existsSync(appJsSrc)) {
    fs.copyFileSync(appJsSrc, path.join(assetsDist, 'app.js'));
    console.log('Wrote app.js');
  }
  const convEngineSrc = path.join(__dirname, '..', 'public/assets/converter-engine.js');
  if (fs.existsSync(convEngineSrc)) {
    fs.copyFileSync(convEngineSrc, path.join(assetsDist, 'converter-engine.js'));
    console.log('Wrote converter-engine.js');
  }
  const pptxTemplateSrc = path.join(__dirname, '..', 'public/assets/pptx-template.js');
  if (fs.existsSync(pptxTemplateSrc)) {
    fs.copyFileSync(pptxTemplateSrc, path.join(assetsDist, 'pptx-template.js'));
    console.log('Wrote pptx-template.js');
  }
  const libsSrc = path.join(__dirname, '..', 'public/assets/libs');
  if (fs.existsSync(libsSrc)) {
    copyDir(libsSrc, path.join(assetsDist, 'libs'));
    console.log('Copied conversion libraries to assets/libs/');
  }

  // 3. Build Root special files
  const sitemapSrc = path.join(__dirname, '..', 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapSrc)) {
    fs.copyFileSync(sitemapSrc, path.join(DIST, 'sitemap.xml'));
  }
  const robotsSrc = path.join(__dirname, '..', 'public', 'robots.txt');
  if (fs.existsSync(robotsSrc)) {
    fs.copyFileSync(robotsSrc, path.join(DIST, 'robots.txt'));
  }
  console.log('Wrote sitemap.xml and robots.txt');

  // Copy data/ and reports/
  const dataSrc = path.join(__dirname, '..', 'data');
  if (fs.existsSync(dataSrc)) {
    copyDir(dataSrc, path.join(DIST, 'data'));
    console.log('Copied data/ to dist/data');
  }
  const reportsSrc = path.join(__dirname, '..', 'reports');
  if (fs.existsSync(reportsSrc)) {
    copyDir(reportsSrc, path.join(DIST, 'reports'));
    console.log('Copied reports/ to dist/reports');
  }

  // 4. Build Core Main Pages (Home, Formats, CLI, Web App Studio) in 3 languages
  const pages = [
    { src: 'recon/home-en.html', dest: 'index.html' },
    { src: 'recon/home-ko.html', dest: 'ko/index.html' },
    { src: 'recon/home-zh.html', dest: 'zh-cn/index.html' },

    { src: 'recon/formats-en.html', dest: 'formats/index.html' },
    { src: 'recon/formats-ko.html', dest: 'ko/formats/index.html' },
    { src: 'recon/formats-zh.html', dest: 'zh-cn/formats/index.html' },

    { src: 'recon/cli-en.html', dest: 'cli/index.html' },
    { src: 'recon/cli-ko.html', dest: 'ko/cli/index.html' },
    { src: 'recon/cli-zh.html', dest: 'zh-cn/cli/index.html' },

    { src: 'recon/app-en.html', dest: 'app/index.html' },
    { src: 'recon/app-ko.html', dest: 'ko/app/index.html' },
    { src: 'recon/app-zh.html', dest: 'zh-cn/app/index.html' },
  ];

  for (const p of pages) {
    const fullSrc = path.join(__dirname, '..', p.src);
    const fullDest = path.join(DIST, p.dest);
    if (fs.existsSync(fullSrc)) {
      const content = normalizeHtml(fs.readFileSync(fullSrc, 'utf8'));
      ensureDir(path.dirname(fullDest));
      fs.writeFileSync(fullDest, content);
    } else {
      console.warn(`Source missing: ${p.src}`);
    }
  }
  console.log(`Built primary pages (Home, Formats, CLI, App Studio across en, ko, zh-cn).`);

  // 4b. Build direct iLovePDF Tool Pages for all 33 tools & common slug variations
  const TOOL_SLUGS = [
    'merge_pdf', 'merge-pdf',
    'split_pdf', 'split-pdf',
    'compress_pdf', 'compress-pdf',
    'pdf_to_word', 'pdf-to-word',
    'pdf_to_powerpoint', 'pdf-to-powerpoint', 'pdf_to_ppt', 'pdf-to-ppt',
    'pdf_to_excel', 'pdf-to-excel',
    'word_to_pdf', 'word-to-pdf',
    'powerpoint_to_pdf', 'powerpoint-to-pdf', 'ppt_to_pdf', 'ppt-to-pdf',
    'excel_to_pdf', 'excel-to-pdf',
    'edit_pdf', 'edit-pdf',
    'pdf_to_jpg', 'pdf-to-jpg',
    'jpg_to_pdf', 'jpg-to-pdf',
    'sign_pdf', 'sign-pdf',
    'watermark_pdf', 'pdf_add_watermark', 'add-watermark',
    'rotate_pdf', 'rotate-pdf',
    'unlock_pdf', 'unlock-pdf',
    'protect_pdf', 'protect-pdf',
    'organize_pdf', 'organize-pdf',
    'pdf_to_pdfa', 'pdf-to-pdfa', 'convert-pdf-to-pdfa',
    'repair_pdf', 'repair-pdf',
    'ocr_pdf', 'ocr-pdf',
    'add_pdf_page_number', 'add-page-numbers',
    'scan_pdf', 'scan-to-pdf',
    'crop_pdf', 'crop-pdf',
    'remove_pages', 'remove-pages',
    'extract_pages', 'extract-pages',
    'pdf_forms', 'pdf-forms',
    'redact_pdf', 'redact-pdf',
    'compare_pdf', 'compare-pdf',
    'pdf_summarize', 'ai-summarizer',
    'translate_pdf', 'translate-pdf',
    'pdf_to_markdown', 'pdf-to-markdown',
    'html_to_pdf', 'html-to-pdf'
  ];

  const appHtml = normalizeHtml(fs.readFileSync(path.join(__dirname, '..', 'recon/app-en.html'), 'utf8'));
  for (const slug of TOOL_SLUGS) {
    const toolDest = path.join(DIST, slug, 'index.html');
    ensureDir(path.dirname(toolDest));
    fs.writeFileSync(toolDest, appHtml);
  }
  console.log(`Built ${TOOL_SLUGS.length} direct iLovePDF tool route pages.`);

  // 5. Build all 82 Conversion Guides across 3 languages
  const slugs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recon/convert-slugs.json'), 'utf8'));
  let guideCount = 0;

  for (const slug of slugs) {
    for (const lang of ['en', 'ko', 'zh-CN']) {
      const srcFile = path.join(__dirname, '..', `recon/guides/${slug}.${lang}.html`);
      const destRel = lang === 'en'
        ? `convert/${slug}/index.html`
        : lang === 'ko'
        ? `ko/convert/${slug}/index.html`
        : `zh-cn/convert/${slug}/index.html`;
      const destFile = path.join(DIST, destRel);

      if (fs.existsSync(srcFile)) {
        const html = normalizeHtml(fs.readFileSync(srcFile, 'utf8'));
        ensureDir(path.dirname(destFile));
        fs.writeFileSync(destFile, html);
        guideCount++;
      } else {
        console.warn(`Guide missing: ${srcFile}`);
      }
    }
  }
  console.log(`Built ${guideCount} conversion guide pages (${slugs.length} guides × 3 languages).`);

  const totalPages = pages.length + guideCount;
  console.log(`=== Build Complete! Total pages generated: ${totalPages} ===`);
}

if (require.main === module) {
  build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}

module.exports = { build };
