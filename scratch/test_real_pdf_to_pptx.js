const fs = require('fs');
const JSZip = require('../public/assets/libs/jszip.min.js');
const pdfLib = require('../public/assets/libs/pdf-lib.min.js');

const TEMPLATE_BASE64 = fs.readFileSync('scratch/official_minimal.pptx').toString('base64');

async function convertPdfToPptx(pdfPath, outPath) {
  const bytes = fs.readFileSync(pdfPath);
  const { PDFDocument } = pdfLib;
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount() || 1;
  const title = 'nptel trick for ling playlists';

  const zip = await JSZip.loadAsync(Buffer.from(TEMPLATE_BASE64, 'base64'));

  const baseSlideXml = await zip.file('ppt/slides/slide1.xml').async('text');
  const baseSlideRels = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  let presXml = await zip.file('ppt/presentation.xml').async('text');
  let presRels = await zip.file('ppt/_rels/presentation.xml.rels').async('text');
  let contentTypes = await zip.file('[Content_Types].xml').async('text');

  const escapeXml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let s1Xml = baseSlideXml.replace(/<a:t>.*?<\/a:t>/, `<a:t>${escapeXml(title)}</a:t>`);
  zip.file('ppt/slides/slide1.xml', s1Xml);

  for (let i = 2; i <= pageCount; i++) {
    const slideName = `slide${i}.xml`;
    const sXml = baseSlideXml.replace(/<a:t>.*?<\/a:t>/, `<a:t>${escapeXml(title)} - Slide ${i}</a:t>`);
    zip.file(`ppt/slides/${slideName}`, sXml);
    zip.file(`ppt/slides/_rels/${slideName}.rels`, baseSlideRels);

    contentTypes = contentTypes.replace('</Types>', `  <Override PartName="/ppt/slides/${slideName}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n</Types>`);
    const rId = `rId${100 + i}`;
    presRels = presRels.replace('</Relationships>', `  <Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/${slideName}"/>\n</Relationships>`);
    const sldId = 255 + i;
    presXml = presXml.replace('</p:sldIdLst>', `    <p:sldId id="${sldId}" r:id="${rId}"/>\n  </p:sldIdLst>`);
  }

  zip.file('[Content_Types].xml', contentTypes);
  zip.file('ppt/presentation.xml', presXml);
  zip.file('ppt/_rels/presentation.xml.rels', presRels);

  const outBuf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outPath, outBuf);
  console.log(`Successfully converted ${pdfPath} (${pageCount} pages) to ${outPath} (${outBuf.length} bytes)`);
}

async function run() {
  const { PDFDocument } = pdfLib;
  const doc = await PDFDocument.create();
  doc.addPage([720, 540]);
  doc.addPage([720, 540]);
  doc.addPage([720, 540]);
  const samplePdf = await doc.save();
  fs.writeFileSync('scratch/multi_sample.pdf', samplePdf);

  await convertPdfToPptx('scratch/multi_sample.pdf', 'test-out.pptx');
}

run();
