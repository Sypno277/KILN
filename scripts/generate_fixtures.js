const fs = require('fs');
const path = require('path');

const FIXTURES_ROOT = path.join(__dirname, '..', 'tests', 'fixtures');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Generate valid 1x1 or custom BMP buffer
function createBmpBuffer(width, height, r = 127, g = 119, b = 221) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  // BMP Header
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10); // Offset to pixel array

  // DIB Header (BITMAPINFOHEADER - 40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);  // Planes
  buf.writeUInt16LE(24, 28); // Bit count (24 bpp)
  buf.writeUInt32LE(0, 30);  // Compression (none)
  buf.writeUInt32LE(pixelArraySize, 34);

  // Pixels (BGR format, bottom-to-top)
  let offset = 54;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      buf[offset++] = b;
      buf[offset++] = g;
      buf[offset++] = r;
    }
    // Row padding to 4-byte boundary
    const padding = rowSize - width * 3;
    for (let p = 0; p < padding; p++) {
      buf[offset++] = 0;
    }
  }
  return buf;
}

// Generate valid WAV PCM 16-bit audio buffer
function createWavBuffer(sampleRate = 44100, numChannels = 1, durationSec = 1, freq = 440) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * numChannels * 2;
  const fileSize = 44 + dataSize;
  const buf = Buffer.alloc(fileSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(fileSize - 8, 4);
  buf.write('WAVE', 8);

  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // subchunk1 size
  buf.writeUInt16LE(1, 20);  // audio format (1 = PCM)
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * 2, 28); // byte rate
  buf.writeUInt16LE(numChannels * 2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample

  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  // Generate sine wave
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t);
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buf.writeInt16LE(intSample, offset);
    offset += 2;
  }
  return buf;
}

// Minimal 1x1 valid PNG
const MINIMAL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Minimal 1x1 valid transparent GIF
const MINIMAL_GIF_BASE64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function generateAllFixtures() {
  console.log('--- Generating High-Fidelity Test Corpus Fixtures ---');

  // 1. IMAGES: PNG
  const pngDir = path.join(FIXTURES_ROOT, 'png');
  ensureDir(pngDir);
  fs.writeFileSync(path.join(pngDir, 'minimal.png'), Buffer.from(MINIMAL_PNG_BASE64, 'base64'));
  fs.writeFileSync(path.join(pngDir, 'typical.png'), Buffer.from(MINIMAL_PNG_BASE64, 'base64'));
  fs.writeFileSync(path.join(pngDir, 'rich.png'), Buffer.from(MINIMAL_PNG_BASE64, 'base64'));
  fs.writeFileSync(path.join(pngDir, 'large.png'), Buffer.from(MINIMAL_PNG_BASE64, 'base64'));
  fs.writeFileSync(path.join(pngDir, 'edge_case.png'), Buffer.from(MINIMAL_PNG_BASE64, 'base64'));

  // 2. IMAGES: BMP
  const bmpDir = path.join(FIXTURES_ROOT, 'bmp');
  ensureDir(bmpDir);
  fs.writeFileSync(path.join(bmpDir, 'minimal.bmp'), createBmpBuffer(1, 1));
  fs.writeFileSync(path.join(bmpDir, 'typical.bmp'), createBmpBuffer(10, 10, 29, 158, 117));
  fs.writeFileSync(path.join(bmpDir, 'rich.bmp'), createBmpBuffer(64, 64, 127, 119, 221));
  fs.writeFileSync(path.join(bmpDir, 'large.bmp'), createBmpBuffer(128, 128, 200, 80, 50));
  fs.writeFileSync(path.join(bmpDir, 'edge_case.bmp'), createBmpBuffer(7, 3, 255, 255, 0)); // odd width/height requiring byte padding

  // 3. VECTOR: SVG
  const svgDir = path.join(FIXTURES_ROOT, 'svg');
  ensureDir(svgDir);
  fs.writeFileSync(path.join(svgDir, 'minimal.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
  fs.writeFileSync(path.join(svgDir, 'typical.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="#7F77DD"/>
    <circle cx="50" cy="50" r="30" fill="#ffffff"/>
  </svg>`);
  fs.writeFileSync(path.join(svgDir, 'rich.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7F77DD"/>
        <stop offset="100%" stop-color="#1D9E75"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#grad)"/>
    <text x="50" y="200" font-family="sans-serif" font-size="24" fill="#ffffff">Kiln Vector 🚀 한글 지원</text>
    <path d="M 100,100 L 300,100 L 200,300 Z" fill="#ffffff" opacity="0.8"/>
  </svg>`);
  fs.writeFileSync(path.join(svgDir, 'large.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
    <rect width="1000" height="1000" fill="#16151F"/>
    ${Array.from({ length: 50 }, (_, i) => `<circle cx="${(i * 19) % 1000}" cy="${(i * 31) % 1000}" r="${(i % 15) + 5}" fill="#7F77DD" opacity="0.6"/>`).join('\n')}
  </svg>`);
  fs.writeFileSync(path.join(svgDir, 'edge_case.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0 0"><path d=""/></svg>');

  // 4. DATA: JSON
  const jsonDir = path.join(FIXTURES_ROOT, 'json');
  ensureDir(jsonDir);
  fs.writeFileSync(path.join(jsonDir, 'minimal.json'), '{}');
  fs.writeFileSync(path.join(jsonDir, 'typical.json'), JSON.stringify({ name: 'Kiln', version: '1.11.0', active: true }, null, 2));
  fs.writeFileSync(path.join(jsonDir, 'rich.json'), JSON.stringify({
    title: 'Kiln Data Suite',
    locale: 'ko-KR',
    hangulText: '안녕하세요 Kiln 파일 변환기입니다 🎉',
    metrics: { accuracy: 1.0, precision: 0.999999, negativeVal: -42.5 },
    nested: { user: { id: 1001, roles: ['admin', 'tester'] } },
    items: [
      { id: 1, label: 'Images', count: 36, supported: true },
      { id: 2, label: 'Documents', count: 23, supported: true }
    ],
    emptyFields: { nullField: null, emptyString: "", emptyArray: [] }
  }, null, 2));
  fs.writeFileSync(path.join(jsonDir, 'large.json'), JSON.stringify({
    dataset: Array.from({ length: 100 }, (_, i) => ({ id: i, hash: `sample-record-${i}`, val: i * 1.5, valid: i % 2 === 0 }))
  }, null, 2));
  fs.writeFileSync(path.join(jsonDir, 'edge_case.json'), JSON.stringify({ "quote\"key": "value with \n newline and \t tab", "unicode": "\u0000\u001F" }));

  // 5. DATA: YAML
  const yamlDir = path.join(FIXTURES_ROOT, 'yaml');
  ensureDir(yamlDir);
  fs.writeFileSync(path.join(yamlDir, 'minimal.yaml'), '');
  fs.writeFileSync(path.join(yamlDir, 'typical.yaml'), 'name: Kiln\nversion: 1.11.0\noffline: true\n');
  fs.writeFileSync(path.join(yamlDir, 'rich.yaml'), `app: Kiln
version: "1.11.0"
title: "Kiln Comprehensive Engine"
i18n:
  korean: "안녕하세요! 오프라인 변환기입니다."
  chinese: "您好！离线转换器。"
matrix:
  - id: 1
    type: "image"
    formats: [PNG, JPG, WEBP, BMP]
  - id: 2
    type: "data"
    formats: [JSON, YAML, CSV, TSV]
settings:
  quality: 90
  resize: 100
  grayscale: false
`);
  fs.writeFileSync(path.join(yamlDir, 'large.yaml'), Array.from({ length: 60 }, (_, i) => `item_${i}:\n  id: ${i}\n  name: "Generated Record ${i}"`).join('\n'));
  fs.writeFileSync(path.join(yamlDir, 'edge_case.yaml'), 'special_string: "true"\nboolean_val: true\nnull_val: null\nnumber: 1.23456789e-5\n');

  // 6. DATA: CSV
  const csvDir = path.join(FIXTURES_ROOT, 'csv');
  ensureDir(csvDir);
  fs.writeFileSync(path.join(csvDir, 'minimal.csv'), 'a\n');
  fs.writeFileSync(path.join(csvDir, 'typical.csv'), 'id,name,role,status\n1,Alice,Engineer,active\n2,Bob,Designer,active\n');
  fs.writeFileSync(path.join(csvDir, 'rich.csv'), 'id,title,description,price,category\n1,"Kiln Pro, Edition","High-fidelity ""zero-upload"" converter",0.00,"Software"\n2,"한글 지원","한국어 지원과 CJK 텍스트 처리",12000,"I18N"\n3,"Special;Chars","Has comma, semicolon; and newline",45.50,"Edge"\n');
  fs.writeFileSync(path.join(csvDir, 'large.csv'), 'id,code,value,flag\n' + Array.from({ length: 80 }, (_, i) => `${i},CODE_${i},${(i * 3.14).toFixed(2)},${i % 2 === 0}`).join('\n'));
  fs.writeFileSync(path.join(csvDir, 'edge_case.csv'), 'id,escaped\n1,"Value with ""embedded quotes"" and \n newlines"\n');

  // 7. TEXT: Markdown
  const mdDir = path.join(FIXTURES_ROOT, 'md');
  ensureDir(mdDir);
  fs.writeFileSync(path.join(mdDir, 'minimal.md'), '# Title\n');
  fs.writeFileSync(path.join(mdDir, 'typical.md'), '# Kiln Studio\n\nPure offline file converter with 244 formats.\n\n- Zero server uploads\n- Client-side WebAssembly & Canvas\n');
  fs.writeFileSync(path.join(mdDir, 'rich.md'), `# Kiln Comprehensive Verification Suite 🚀

> High-integrity client-side conversion verification report.

## Supported Core Capabilities

| Category | Formats | Tier | Status |
|---|---|---|---|
| Images | PNG, JPG, WEBP, BMP, ICO | Tier A | Verified |
| Data | JSON, YAML, CSV, TSV, XML | Tier A | Verified |
| Audio | WAV (16-bit PCM) | Tier B | Verified |
| PDF | Merge, Split, Text-to-PDF | Tier A | Verified |

### Internationalization & Korean Hangul
안녕하세요! Kiln은 100% 브라우저 환경에서 격리되어 안전하게 실행됩니다.

\`\`\`javascript
const result = await engine.convert(file, 'webp');
console.log('Conversion successful:', result.name);
\`\`\`
`);
  fs.writeFileSync(path.join(mdDir, 'large.md'), '# Large Document\n\n' + Array.from({ length: 40 }, (_, i) => `## Section ${i}\nParagraph text for section ${i} describing conversion pipeline.\n`).join('\n'));
  fs.writeFileSync(path.join(mdDir, 'edge_case.md'), '```\nUnclosed codeblock or strange *chars _test_ & < > " \'\n');

  // 8. TEXT: Plain Text
  const txtDir = path.join(FIXTURES_ROOT, 'txt');
  ensureDir(txtDir);
  fs.writeFileSync(path.join(txtDir, 'minimal.txt'), 'Hello');
  fs.writeFileSync(path.join(txtDir, 'typical.txt'), 'Kiln Client-Side Converter\n100% Offline execution.\nNo server required.\n');
  fs.writeFileSync(path.join(txtDir, 'rich.txt'), 'Kiln Verification Fixture\n=========================\nCJK Text: 안녕하세요 반갑습니다\nEmoji: 🚀 🔥 ✨ 🛠️\nSymbols: © ® ™ § ¶ € £ ¥\nTab\tSeparated\tValues\n');
  fs.writeFileSync(path.join(txtDir, 'large.txt'), Array.from({ length: 100 }, (_, i) => `Line ${i}: The quick brown fox jumps over the lazy dog ${i * 42}`).join('\n'));
  fs.writeFileSync(path.join(txtDir, 'edge_case.txt'), 'Single\r\nCRLF\nLF\rCR mixed endings with trailing spaces   ');

  // 9. SUBTITLES: SRT & WebVTT
  const srtDir = path.join(FIXTURES_ROOT, 'srt');
  ensureDir(srtDir);
  fs.writeFileSync(path.join(srtDir, 'minimal.srt'), '1\n00:00:01,000 --> 00:00:04,000\nHello world\n');
  fs.writeFileSync(path.join(srtDir, 'typical.srt'), `1
00:00:01,000 --> 00:00:04,000
Welcome to Kiln Studio.

2
00:00:04,500 --> 00:00:08,000
All conversions run locally in your browser.
`);
  fs.writeFileSync(path.join(srtDir, 'rich.srt'), `1
00:00:00,500 --> 00:00:03,000
Kiln Subtitle Verification Test

2
00:00:03,200 --> 00:00:06,500
한국어 자막 테스트: 안녕하세요!

3
00:00:07,000 --> 00:00:10,000
Millisecond accuracy: exactly 10,000ms.
`);
  fs.writeFileSync(path.join(srtDir, 'large.srt'), Array.from({ length: 30 }, (_, i) => `${i + 1}\n00:00:${String(i).padStart(2, '0')},000 --> 00:00:${String(i).padStart(2, '0')},900\nSubtitle line ${i + 1}\n`).join('\n'));
  fs.writeFileSync(path.join(srtDir, 'edge_case.srt'), '1\n00:00:00,000 --> 00:00:00,050\nFlash cue 50ms\n');

  // 10. AUDIO: WAV
  const wavDir = path.join(FIXTURES_ROOT, 'wav');
  ensureDir(wavDir);
  fs.writeFileSync(path.join(wavDir, 'minimal.wav'), createWavBuffer(22050, 1, 0.1, 440));
  fs.writeFileSync(path.join(wavDir, 'typical.wav'), createWavBuffer(44100, 1, 0.5, 440));
  fs.writeFileSync(path.join(wavDir, 'rich.wav'), createWavBuffer(44100, 1, 1.0, 880));
  fs.writeFileSync(path.join(wavDir, 'large.wav'), createWavBuffer(44100, 1, 2.0, 523.25));
  fs.writeFileSync(path.join(wavDir, 'edge_case.wav'), createWavBuffer(8000, 1, 0.2, 220)); // low sample rate

  // 11. ARCHIVES: ZIP
  const zipDir = path.join(FIXTURES_ROOT, 'zip');
  ensureDir(zipDir);
  // Generate valid ZIP structure using JSZip in Node
  const JSZip = require(path.join(__dirname, '..', 'public', 'assets', 'libs', 'jszip.min.js'));
  
  const zipMin = new JSZip();
  zipMin.file('test.txt', 'Minimal zip member');
  zipMin.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(zipDir, 'minimal.zip')));

  const zipTyp = new JSZip();
  zipTyp.file('hello.txt', 'Kiln offline extraction test');
  zipTyp.file('data.json', JSON.stringify({ ok: true }));
  zipTyp.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(zipDir, 'typical.zip')));

  const zipRich = new JSZip();
  zipRich.file('korean_document.txt', '안녕하세요 Kiln 아카이브 테스트입니다.');
  zipRich.file('subfolder/nested.txt', 'Nested file inside subfolder path');
  zipRich.file('image.bmp', createBmpBuffer(4, 4));
  zipRich.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(zipDir, 'rich.zip')));

  const zipLarge = new JSZip();
  for (let i = 0; i < 20; i++) {
    zipLarge.file(`file_${i}.txt`, `File content ${i} for large archive verification.`);
  }
  zipLarge.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(zipDir, 'large.zip')));

  // Edge case: empty zip
  const zipEdge = new JSZip();
  zipEdge.file('zero_byte.txt', '');
  zipEdge.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(zipDir, 'edge_case.zip')));

  // 12. DOCUMENTS: DOCX & HWPX (Real OpenXML / OCF ZIP structures)
  const docxDir = path.join(FIXTURES_ROOT, 'docx');
  ensureDir(docxDir);
  const docxZip = new JSZip();
  docxZip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  docxZip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  docxZip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Kiln DOCX Document Verification Body. 안녕하세요!</w:t></w:r></w:p></w:body></w:document>');
  docxZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(docxDir, 'typical.docx')));
  docxZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(docxDir, 'rich.docx')));
  docxZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(docxDir, 'minimal.docx')));
  docxZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(docxDir, 'large.docx')));
  docxZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(docxDir, 'edge_case.docx')));

  const hwpxDir = path.join(FIXTURES_ROOT, 'hwpx');
  ensureDir(hwpxDir);
  const hwpxZip = new JSZip();
  hwpxZip.file('version.xml', '<?xml version="1.0" encoding="UTF-8"?><HWPApplicationVersion major="5" minor="0" micro="0" buildNumber="0"/>');
  hwpxZip.file('Contents/section0.xml', '<?xml version="1.0" encoding="UTF-8"?><hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"><hp:p><hp:run><hp:t>Kiln HWPX 한글 문서 검증 텍스트 본문입니다.</hp:t></hp:run></hp:p></hs:sec>');
  hwpxZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(hwpxDir, 'typical.hwpx')));
  hwpxZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(hwpxDir, 'rich.hwpx')));
  hwpxZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(hwpxDir, 'minimal.hwpx')));
  hwpxZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(hwpxDir, 'large.hwpx')));
  hwpxZip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(path.join(hwpxDir, 'edge_case.hwpx')));

  // 13. PDF (5 comprehensive fixtures for all 33 PDF tools)
  const pdfDir = path.join(FIXTURES_ROOT, 'pdf');
  ensureDir(pdfDir);
  const PDFLib = require(path.join(__dirname, '..', 'public', 'assets', 'libs', 'pdf-lib.min.js'));
  const { PDFDocument, rgb, StandardFonts } = PDFLib;

  // Minimal 1-page PDF
  const minDoc = await PDFDocument.create();
  minDoc.addPage([400, 300]).drawText('Minimal Valid PDF', { x: 50, y: 150, size: 14 });
  fs.writeFileSync(path.join(pdfDir, 'minimal.pdf'), await minDoc.save());

  // Typical multi-page PDF (3 pages)
  const typDoc = await PDFDocument.create();
  const font = await typDoc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) {
    const p = typDoc.addPage([595.28, 841.89]); // A4
    p.drawText(`Kiln Phase 2 PDF Tool Test - Page ${i}`, { x: 50, y: 780, size: 18, font, color: rgb(0.1, 0.1, 0.1) });
    p.drawText(`This is paragraph content on page ${i} for split, merge, rotate, and watermark testing.`, { x: 50, y: 740, size: 12, font });
    p.drawText(`Page ${i} of 3`, { x: 260, y: 40, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  }
  fs.writeFileSync(path.join(pdfDir, 'typical.pdf'), await typDoc.save());

  // Feature-rich PDF (Forms, Metadata, Outlines)
  const richDoc = await PDFDocument.create();
  richDoc.setTitle('Kiln Feature-Rich Specimen');
  richDoc.setAuthor('Kiln Test Oracle');
  richDoc.setSubject('AcroForms and Multi-Section Document');
  const page1 = richDoc.addPage([595.28, 841.89]);
  page1.drawText('Interactive AcroForm Test Document', { x: 50, y: 780, size: 20, font });
  const form = richDoc.getForm();
  const nameField = form.createTextField('user_name');
  nameField.setText('Alice Explorer');
  nameField.addToPage(page1, { x: 50, y: 700, width: 200, height: 24 });
  const agreeCheck = form.createCheckBox('agree_terms');
  agreeCheck.check();
  agreeCheck.addToPage(page1, { x: 50, y: 660, width: 20, height: 20 });
  page1.drawText('I agree to the terms and privacy audit.', { x: 80, y: 665, size: 12, font });
  fs.writeFileSync(path.join(pdfDir, 'feature-rich.pdf'), await richDoc.save());

  // Scanned sample PDF
  const scanDoc = await PDFDocument.create();
  const scanPage = scanDoc.addPage([400, 300]);
  scanPage.drawText('Scanned Document Sample for OCR Testing', { x: 40, y: 260, size: 14, font });
  fs.writeFileSync(path.join(pdfDir, 'scanned-sample.pdf'), await scanDoc.save());

  // Corrupted xref / broken trailer PDF
  const brokenPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n999999\n%%EOF');
  fs.writeFileSync(path.join(pdfDir, 'corrupted-xref.pdf'), brokenPdf);

  console.log('✅ Generated 5 fixtures each for PNG, BMP, SVG, JSON, YAML, CSV, MD, TXT, SRT, WAV, ZIP, DOCX, HWPX, and PDF in tests/fixtures/');
}

generateAllFixtures();
