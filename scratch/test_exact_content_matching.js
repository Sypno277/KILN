const fs = require('fs');
const JSZip = require('../public/assets/libs/jszip.min.js');
const pdfLib = require('../public/assets/libs/pdf-lib.min.js');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

const TEMPLATE_BASE64 = fs.readFileSync('scratch/official_minimal.pptx').toString('base64');

async function testExactContentExtraction() {
  console.log('--- 1. Testing Exact Content Extraction from PDF ---');
  // Create a sample PDF with specific text
  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);

  // Page 1
  const page1 = doc.addPage([720, 540]);
  page1.drawText('NPTEL Advanced Linguistics Playlist Notes', { x: 50, y: 480, size: 22, font, color: rgb(0.1, 0.2, 0.6) });
  page1.drawText('Key Lecture Concepts and Overview of Phonetics', { x: 50, y: 440, size: 14, font: regularFont });
  page1.drawText('- Articulatory and acoustic phonetics definitions', { x: 70, y: 400, size: 12, font: regularFont });
  page1.drawText('- IPA chart classification and vowel spaces', { x: 70, y: 370, size: 12, font: regularFont });

  // Page 2
  const page2 = doc.addPage([720, 540]);
  page2.drawText('Syntax and Tree Structures in Modern Grammar', { x: 50, y: 480, size: 22, font, color: rgb(0.1, 0.2, 0.6) });
  page2.drawText('Phrase structure rules and X-bar theory:', { x: 50, y: 440, size: 14, font: regularFont });
  page2.drawText('- Noun Phrase (NP) and Verb Phrase (VP) complementation', { x: 70, y: 400, size: 12, font: regularFont });
  page2.drawText('- Movement rules and transformational principles', { x: 70, y: 370, size: 12, font: regularFont });

  const pdfBytes = await doc.save();
  fs.writeFileSync('scratch/nptel_sample.pdf', pdfBytes);

  // Extract using PDF.js
  const pdfjsDoc = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const extractedPages = [];
  for (let i = 1; i <= pdfjsDoc.numPages; i++) {
    const page = await pdfjsDoc.getPage(i);
    const tc = await page.getTextContent();
    const items = tc.items.map(it => it.str).filter(s => s.trim().length > 0);
    extractedPages.push({
      pageNumber: i,
      title: items[0] || `Slide ${i}`,
      points: items.slice(1)
    });
  }

  console.log('Extracted Pages:', JSON.stringify(extractedPages, null, 2));

  // --- 2. Build PPTX with Exact Extracted Content ---
  console.log('--- 2. Building PPTX with Exact Content ---');
  const zip = await JSZip.loadAsync(Buffer.from(TEMPLATE_BASE64, 'base64'));

  const baseSlideXml = await zip.file('ppt/slides/slide1.xml').async('text');
  const baseSlideRels = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  let presXml = await zip.file('ppt/presentation.xml').async('text');
  let presRels = await zip.file('ppt/_rels/presentation.xml.rels').async('text');
  let contentTypes = await zip.file('[Content_Types].xml').async('text');

  const escapeXml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  for (let i = 1; i <= extractedPages.length; i++) {
    const ep = extractedPages[i - 1];
    const slideName = `slide${i}.xml`;
    let bodyText = ep.points.map(pt => `
          <a:p>
            <a:pPr lvl="0"/>
            <a:r>
              <a:rPr lang="en-US" sz="1600"/>
              <a:t>${escapeXml(pt)}</a:t>
            </a:r>
          </a:p>`).join('');

    let sXml = baseSlideXml.replace(/<a:t>.*?<\/a:t>/, `<a:t>${escapeXml(ep.title)}</a:t>`);
    // Insert body paragraphs if subtitle shape exists
    sXml = sXml.replace(/(<p:ph type="subTitle" idx="1"\/>[\s\S]*?<a:txBody>[\s\S]*?<a:lstStyle\/>)([\s\S]*?)(<\/a:txBody>)/,
      `$1${bodyText}$3`);

    zip.file(`ppt/slides/${slideName}`, sXml);
    zip.file(`ppt/slides/_rels/${slideName}.rels`, baseSlideRels);

    if (i > 1) {
      contentTypes = contentTypes.replace('</Types>', `  <Override PartName="/ppt/slides/${slideName}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n</Types>`);
      const rId = `rId${100 + i}`;
      presRels = presRels.replace('</Relationships>', `  <Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/${slideName}"/>\n</Relationships>`);
      const sldId = 255 + i;
      presXml = presXml.replace('</p:sldIdLst>', `    <p:sldId id="${sldId}" r:id="${rId}"/>\n  </p:sldIdLst>`);
    }
  }

  zip.file('[Content_Types].xml', contentTypes);
  zip.file('ppt/presentation.xml', presXml);
  zip.file('ppt/_rels/presentation.xml.rels', presRels);

  const pptxBuf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('scratch/exact_nptel.pptx', pptxBuf);
  console.log('Generated scratch/exact_nptel.pptx with exact extracted text (size:', pptxBuf.length, 'bytes)');

  // --- 3. Build DOCX with Exact Extracted Content ---
  console.log('--- 3. Building DOCX with Exact Content ---');
  const docxZip = new JSZip();
  docxZip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  docxZip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');

  let wordBody = '';
  for (const ep of extractedPages) {
    wordBody += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1E293B"/></w:rPr><w:t>${escapeXml(ep.title)}</w:t></w:r></w:p>`;
    for (const pt of ep.points) {
      wordBody += `<w:p><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(pt)}</w:t></w:r></w:p>`;
    }
    wordBody += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  }

  docxZip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${wordBody}</w:body></w:document>`);
  const docxBuf = await docxZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('scratch/exact_nptel.docx', docxBuf);
  console.log('Generated scratch/exact_nptel.docx with exact extracted text (size:', docxBuf.length, 'bytes)');
}

testExactContentExtraction();
