const fs = require('fs');
const JSZip = require('../public/assets/libs/jszip.min.js');
const pdfLib = require('../public/assets/libs/pdf-lib.min.js');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const XLSX = require('../public/assets/libs/xlsx.full.min.js');
const { PPTX_TEMPLATE_B64 } = require('../public/assets/pptx-template.js');

async function testAllExactConverters() {
  console.log('--- Step 1: Create Real PDF with specific content ---');
  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // Page 1
  const p1 = doc.addPage([600, 400]);
  p1.drawText('Quarterly Business Performance 2026', { x: 40, y: 350, size: 20, font: fontBold, color: rgb(0.1, 0.2, 0.6) });
  p1.drawText('Key Metrics and Revenue Growth:', { x: 40, y: 310, size: 14, font: fontRegular });
  p1.drawText('- Total Revenue: $4,250,000 (+18% YoY)', { x: 60, y: 270, size: 12, font: fontRegular });
  p1.drawText('- Active Enterprise Users: 142,500 clients', { x: 60, y: 240, size: 12, font: fontRegular });
  p1.drawText('- Client-Side Privacy Compliance: 100% Zero-Leak', { x: 60, y: 210, size: 12, font: fontRegular });

  // Page 2
  const p2 = doc.addPage([600, 400]);
  p2.drawText('Engineering Roadmap & Architecture', { x: 40, y: 350, size: 20, font: fontBold, color: rgb(0.1, 0.2, 0.6) });
  p2.drawText('Core deliverables for next quarter:', { x: 40, y: 310, size: 14, font: fontRegular });
  p2.drawText('- Offline WebAssembly transcoding pipeline', { x: 60, y: 270, size: 12, font: fontRegular });
  p2.drawText('- Native ECMA-376 Office document export', { x: 60, y: 240, size: 12, font: fontRegular });

  const pdfBytes = await doc.save();
  fs.writeFileSync('scratch/quarterly_sample.pdf', pdfBytes);

  console.log('--- Step 2: Extract text using PDF.js ---');
  const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const pages = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const tc = await page.getTextContent();
    const itemMap = new Map();
    for (const item of tc.items) {
      if (!item.str || item.str.trim() === '') continue;
      const y = Math.round((item.transform ? item.transform[5] : 0) / 4) * 4;
      if (!itemMap.has(y)) itemMap.set(y, []);
      itemMap.get(y).push({
        str: item.str,
        x: item.transform ? item.transform[4] : 0,
        y: item.transform ? item.transform[5] : 0,
        fontSize: Math.round(item.transform ? Math.hypot(item.transform[0], item.transform[1]) : 12)
      });
    }
    const sortedYs = Array.from(itemMap.keys()).sort((a, b) => b - a);
    const lines = [];
    for (const y of sortedYs) {
      const rowItems = itemMap.get(y).sort((a, b) => a.x - b.x);
      const lineText = rowItems.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
      if (lineText) {
        lines.push({
          text: lineText,
          y,
          fontSize: Math.max(...rowItems.map(it => it.fontSize || 12)),
          isHeading: lines.length === 0
        });
      }
    }
    pages.push({
      pageNumber: i,
      title: lines[0]?.text || `Slide ${i}`,
      bodyLines: lines.slice(1).map(l => l.text),
      lines
    });
  }
  console.log('Extracted Pages:', JSON.stringify(pages, null, 2));

  // --- Step 3: Generate PPTX ---
  console.log('--- Step 3: Generate PPTX with Exact Content ---');
  const pptZip = await JSZip.loadAsync(Buffer.from(PPTX_TEMPLATE_B64, 'base64'));
  const baseSlideXml = await pptZip.file('ppt/slides/slide1.xml').async('text');
  const baseSlideRels = await pptZip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  let presXml = await pptZip.file('ppt/presentation.xml').async('text');
  let presRels = await pptZip.file('ppt/_rels/presentation.xml.rels').async('text');
  let contentTypes = await pptZip.file('[Content_Types].xml').async('text');

  const escapeXml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  for (let i = 1; i <= pages.length; i++) {
    const ep = pages[i - 1];
    const slideName = `slide${i}.xml`;
    let bodyTextXml = '';
    for (const pt of ep.bodyLines) {
      bodyTextXml += `
          <a:p>
            <a:pPr lvl="0"/>
            <a:r>
              <a:rPr lang="en-US" sz="1600"/>
              <a:t>${escapeXml(pt)}</a:t>
            </a:r>
          </a:p>`;
    }

    const titleXml = `<a:r><a:rPr lang="en-US" sz="3200" b="1"/><a:t>${escapeXml(ep.title)}</a:t></a:r>`;
    let sXml = baseSlideXml;
    // Replace center title paragraph
    sXml = sXml.replace(/(<p:ph type="ctrTitle"\/>[\s\S]*?<a:txBody>[\s\S]*?<a:lstStyle\/><a:p>)([\s\S]*?)(<\/a:p>)/,
      `$1${titleXml}$3`);
    // Replace subtitle shape body
    sXml = sXml.replace(/(<p:ph type="subTitle" idx="1"\/>[\s\S]*?<a:txBody>[\s\S]*?<a:lstStyle\/>)([\s\S]*?)(<\/a:txBody>)/,
      `$1${bodyTextXml}$3`);

    pptZip.file(`ppt/slides/${slideName}`, sXml);
    pptZip.file(`ppt/slides/_rels/${slideName}.rels`, baseSlideRels);

    if (i > 1) {
      contentTypes = contentTypes.replace('</Types>', `  <Override PartName="/ppt/slides/${slideName}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n</Types>`);
      const rId = `rId${100 + i}`;
      presRels = presRels.replace('</Relationships>', `  <Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/${slideName}"/>\n</Relationships>`);
      const sldId = 255 + i;
      presXml = presXml.replace('</p:sldIdLst>', `    <p:sldId id="${sldId}" r:id="${rId}"/>\n  </p:sldIdLst>`);
    }
  }

  pptZip.file('[Content_Types].xml', contentTypes);
  pptZip.file('ppt/presentation.xml', presXml);
  pptZip.file('ppt/_rels/presentation.xml.rels', presRels);

  const pptBuf = await pptZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('scratch/quarterly_exact.pptx', pptBuf);
  console.log('Saved scratch/quarterly_exact.pptx (' + pptBuf.length + ' bytes)');

  // --- Step 4: Generate DOCX ---
  console.log('--- Step 4: Generate DOCX with Exact Content ---');
  const docxZip = new JSZip();
  docxZip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  docxZip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');

  let wordBody = '';
  for (let p = 0; p < pages.length; p++) {
    const ep = pages[p];
    wordBody += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1E293B"/></w:rPr><w:t>${escapeXml(ep.title)}</w:t></w:r></w:p>`;
    for (const pt of ep.bodyLines) {
      wordBody += `<w:p><w:r><w:rPr><w:sz w:val="24"/><w:color w:val="334155"/></w:rPr><w:t>${escapeXml(pt)}</w:t></w:r></w:p>`;
    }
    if (p < pages.length - 1) wordBody += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  }

  docxZip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${wordBody}</w:body></w:document>`);
  const docxBuf = await docxZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('scratch/quarterly_exact.docx', docxBuf);
  console.log('Saved scratch/quarterly_exact.docx (' + docxBuf.length + ' bytes)');

  // --- Step 5: Generate XLSX with Exact Content ---
  console.log('--- Step 5: Generate XLSX with Exact Content ---');
  const sheetRows = [];
  for (const ep of pages) {
    sheetRows.push([`=== ${ep.title} ===`]);
    for (const pt of ep.bodyLines) {
      if (pt.includes(':')) {
        const parts = pt.split(':');
        sheetRows.push([parts[0].replace(/^[-*]\s*/, '').trim(), parts.slice(1).join(':').trim()]);
      } else {
        sheetRows.push([pt]);
      }
    }
    sheetRows.push([]);
  }
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Quarterly');
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync('scratch/quarterly_exact.xlsx', xlsxBuf);
  console.log('Saved scratch/quarterly_exact.xlsx (' + xlsxBuf.length + ' bytes)');
}

testAllExactConverters();
