const fs = require('fs');
const path = require('path');

const RECON_DIR = path.resolve(__dirname, '..', 'recon');
const GUIDES_DIR = path.resolve(RECON_DIR, 'guides');

const enCard = `  <section class="section download" id="download">
    <div class="download-card" data-reveal="">
      <svg class="logo" viewBox="0 0 512 512" aria-hidden="true"><path fill="#7F77DD" d="M154.61 65.27A216 216 0 0 1 357.39 65.27L304.82 164.17A104 104 0 0 0 207.18 164.17Z"></path><path transform="translate(13.86,-8)" fill="#1D9E75" d="M373.66 67.74A222 222 0 0 1 477.86 248.23L359.94 252.36A104 104 0 0 0 311.12 167.81Z"></path><path fill="#7F77DD" d="M471.87 263.56A216 216 0 0 1 370.48 439.17L311.12 344.19A104 104 0 0 0 359.94 259.64Z"></path><path fill="#6A62C9" d="M357.39 446.73A216 216 0 0 1 154.61 446.73L207.18 347.83A104 104 0 0 0 304.82 347.83Z"></path><path fill="#7F77DD" d="M141.52 439.17A216 216 0 0 1 40.13 263.56L152.06 259.64A104 104 0 0 0 200.88 344.19Z"></path><path fill="#6A62C9" d="M40.13 248.44A216 216 0 0 1 141.52 72.83L200.88 167.81A104 104 0 0 0 152.06 252.36Z"></path><path fill="#3C3489" d="M222 212h44l24 24v64h-68z"></path><path fill="#AFA9EC" d="M266 212v24h24z"></path></svg>
      <h2>Convert Files Instantly in Kiln Web Studio</h2>
      <p>100% Client-Side Engine · Pure Offline Execution · No Downloads or Installation Needed.<br>Convert PDFs to Word, PowerPoint, Excel, Text, images and 240+ formats directly in your browser.</p>
      <a class="btn btn-primary btn-large" href="/app/"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4,4H10V10H4V4M14,4H20V10H14V4M4,14H10V20H4V14M14,14H20V20H14V14Z"></path></svg><span>Launch Web Studio</span></a>
      <p class="download-status">Pure in-browser engine · Zero server uploads · Free &amp; Open Source</p>
      <p class="download-meta"><a href="/formats/">View 244 Formats</a> · <a href="/app/#pdf-tools">33 PDF Tools</a></p>
    </div>
  </section>`;

const koCard = `  <section class="section download" id="download">
    <div class="download-card" data-reveal>
      <svg class="logo" viewBox="0 0 512 512" aria-hidden="true"><path fill="#7F77DD" d="M154.61 65.27A216 216 0 0 1 357.39 65.27L304.82 164.17A104 104 0 0 0 207.18 164.17Z"/><path transform="translate(13.86,-8)" fill="#1D9E75" d="M373.66 67.74A222 222 0 0 1 477.86 248.23L359.94 252.36A104 104 0 0 0 311.12 167.81Z"/><path fill="#7F77DD" d="M471.87 263.56A216 216 0 0 1 370.48 439.17L311.12 344.19A104 104 0 0 0 359.94 259.64Z"/><path fill="#6A62C9" d="M357.39 446.73A216 216 0 0 1 154.61 446.73L207.18 347.83A104 104 0 0 0 304.82 347.83Z"/><path fill="#7F77DD" d="M141.52 439.17A216 216 0 0 1 40.13 263.56L152.06 259.64A104 104 0 0 0 200.88 344.19Z"/><path fill="#6A62C9" d="M40.13 248.44A216 216 0 0 1 141.52 72.83L200.88 167.81A104 104 0 0 0 152.06 252.36Z"/><path fill="#3C3489" d="M222 212h44l24 24v64h-68z"/><path fill="#AFA9EC" d="M266 212v24h24z"/></svg>
      <h2>Kiln 웹 스튜디오에서 즉시 변환</h2>
      <p>100% 브라우저 기반 엔진 · 순수 오프라인 실행 · 다운로드나 설치 필요 없음.<br>PDF를 Word, PowerPoint, Excel, Text, 이미지 및 240여 개 형식으로 브라우저에서 직접 변환하세요.</p>
      <a class="btn btn-primary btn-large" href="/ko/app/"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4,4H10V10H4V4M14,4H20V10H14V4M4,14H10V20H4V14M14,14H20V20H14V14Z"/></svg><span>웹 스튜디오 열기</span></a>
      <p class="download-status">순수 브라우저 엔진 · 서버 업로드 없음 · 무료 오픈소스</p>
      <p class="download-meta"><a href="/ko/formats/">244개 형식 보기</a> · <a href="/ko/app/#pdf-tools">33개 PDF 도구</a></p>
    </div>
  </section>`;

const zhCard = `  <section class="section download" id="download">
    <div class="download-card" data-reveal>
      <svg class="logo" viewBox="0 0 512 512" aria-hidden="true"><path fill="#7F77DD" d="M154.61 65.27A216 216 0 0 1 357.39 65.27L304.82 164.17A104 104 0 0 0 207.18 164.17Z"/><path transform="translate(13.86,-8)" fill="#1D9E75" d="M373.66 67.74A222 222 0 0 1 477.86 248.23L359.94 252.36A104 104 0 0 0 311.12 167.81Z"/><path fill="#7F77DD" d="M471.87 263.56A216 216 0 0 1 370.48 439.17L311.12 344.19A104 104 0 0 0 359.94 259.64Z"/><path fill="#6A62C9" d="M357.39 446.73A216 216 0 0 1 154.61 446.73L207.18 347.83A104 104 0 0 0 304.82 347.83Z"/><path fill="#7F77DD" d="M141.52 439.17A216 216 0 0 1 40.13 263.56L152.06 259.64A104 104 0 0 0 200.88 344.19Z"/><path fill="#6A62C9" d="M40.13 248.44A216 216 0 0 1 141.52 72.83L200.88 167.81A104 104 0 0 0 152.06 252.36Z"/><path fill="#3C3489" d="M222 212h44l24 24v64h-68z"/><path fill="#AFA9EC" d="M266 212v24h24z"/></svg>
      <h2>在 Kiln 网页版工作站即刻转换</h2>
      <p>100% 浏览器本地运算 · 纯离线执行 · 无需下载或安装客户端。<br>直接在浏览器中将 PDF 转换为 Word、PowerPoint、Excel、纯文本、图片及 240+ 种格式。</p>
      <a class="btn btn-primary btn-large" href="/zh-cn/app/"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4,4H10V10H4V4M14,4H20V10H14V4M4,14H10V20H4V14M14,14H20V20H14V14Z"/></svg><span>打开网页版工作站</span></a>
      <p class="download-status">纯浏览器本地处理 · 零服务器上传 · 免费开源</p>
      <p class="download-meta"><a href="/zh-cn/formats/">浏览 244 种格式</a> · <a href="/zh-cn/app/#pdf-tools">33 种 PDF 工具</a></p>
    </div>
  </section>`;

function processHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const isKo = filePath.includes('.ko.') || filePath.includes('-ko.');
  const isZh = filePath.includes('.zh-CN.') || filePath.includes('-zh.');

  const lang = isKo ? 'ko' : (isZh ? 'zh' : 'en');
  const appPath = isKo ? '/ko/app/' : (isZh ? '/zh-cn/app/' : '/app/');
  const navLabel = isKo ? '스튜디오 열기' : (isZh ? '打开工作站' : 'Launch Studio');
  const heroLabel = isKo ? '웹 스튜디오에서 변환' : (isZh ? '在网页版工作站转换' : 'Convert in Web Studio');
  const card = isKo ? koCard : (isZh ? zhCard : enCard);

  // 1. Replace nav button href="#download"
  content = content.replace(
    /<a class="btn btn-primary btn-small" href="#download">[\s\S]*?<\/a>/g,
    `<a class="btn btn-primary btn-small" href="${appPath}"><span>${navLabel}</span></a>`
  );

  // 2. Replace hero CTA href="#download"
  content = content.replace(
    /<a class="btn btn-primary btn-large" href="#download">[\s\S]*?<\/a>/g,
    `<a class="btn btn-primary btn-large" href="${appPath}"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4,4H10V10H4V4M14,4H20V10H14V4M4,14H10V20H4V14M14,14H20V20H14V14Z"/></svg><span>${heroLabel}</span></a>`
  );

  // 3. Replace <section class="section download" id="download">...</section>
  const downloadSectionRegex = /<section class="section download" id="download">[\s\S]*?<\/section>/g;
  if (downloadSectionRegex.test(content)) {
    content = content.replace(downloadSectionRegex, card);
  }

  // 4. Update footer links if needed
  if (!content.includes(appPath)) {
    content = content.replace(
      /<nav class="footer-links" aria-label="[^"]*">/,
      `$& \n      <a href="${appPath}">${isKo ? '웹 스튜디오' : (isZh ? '网页版工作站' : 'Web Studio')}</a>`
    );
  }

  // 5. Clean up page-data JSON if it contains afterDownload or download
  content = content.replace(/<script id="page-data" type="application\/json">([\s\S]*?)<\/script>/, (match, jsonStr) => {
    try {
      const obj = JSON.parse(jsonStr);
      delete obj.afterDownload;
      delete obj.download;
      return `<script id="page-data" type="application/json">${JSON.stringify(obj)}</script>`;
    } catch {
      return match;
    }
  });

  fs.writeFileSync(filePath, content, 'utf8');
}

// Process formats and cli files
const standaloneFiles = [
  'formats-en.html',
  'formats-ko.html',
  'formats-zh.html',
  'cli-en.html',
  'cli-ko.html',
  'cli-zh.html',
  'convert-heic-to-jpg-en.html'
];

for (const file of standaloneFiles) {
  const fp = path.join(RECON_DIR, file);
  if (fs.existsSync(fp)) {
    processHtmlFile(fp);
    console.log(`Processed ${file}`);
  }
}

// Process all guides
const guideFiles = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.html'));
for (const file of guideFiles) {
  processHtmlFile(path.join(GUIDES_DIR, file));
}
console.log(`Processed ${guideFiles.length} guides.`);
