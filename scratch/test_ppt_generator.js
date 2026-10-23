const fs = require('fs');
const JSZip = require('../public/assets/libs/jszip.min.js');

const TEMPLATE_BASE64 = fs.readFileSync('scratch/official_minimal.pptx').toString('base64');

async function buildPptxFromTemplate(title, pageCount = 3) {
  const zip = await JSZip.loadAsync(Buffer.from(TEMPLATE_BASE64, 'base64'));

  // Read base slide and its rels
  const baseSlideXml = await zip.file('ppt/slides/slide1.xml').async('text');
  const baseSlideRels = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  let presXml = await zip.file('ppt/presentation.xml').async('text');
  let presRels = await zip.file('ppt/_rels/presentation.xml.rels').async('text');
  let contentTypes = await zip.file('[Content_Types].xml').async('text');

  // Update slide 1 with title
  const escapeXml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  // Replace title in slide 1
  let s1Xml = baseSlideXml.replace(/<a:t>.*?<\/a:t>/, `<a:t>${escapeXml(title)}</a:t>`);
  zip.file('ppt/slides/slide1.xml', s1Xml);

  // If more than 1 page/slide, add them
  for (let i = 2; i <= pageCount; i++) {
    const slideName = `slide${i}.xml`;
    const sXml = baseSlideXml.replace(/<a:t>.*?<\/a:t>/, `<a:t>${escapeXml(title)} - Slide ${i}</a:t>`);
    zip.file(`ppt/slides/${slideName}`, sXml);
    zip.file(`ppt/slides/_rels/${slideName}.rels`, baseSlideRels);

    // Add to [Content_Types].xml
    contentTypes = contentTypes.replace('</Types>', `  <Override PartName="/ppt/slides/${slideName}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n</Types>`);

    // Add to ppt/_rels/presentation.xml.rels with a new rId
    const rId = `rId${100 + i}`;
    presRels = presRels.replace('</Relationships>', `  <Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/${slideName}"/>\n</Relationships>`);

    // Add to ppt/presentation.xml sldIdLst
    const sldId = 255 + i;
    presXml = presXml.replace('</p:sldIdLst>', `    <p:sldId id="${sldId}" r:id="${rId}"/>\n  </p:sldIdLst>`);
  }

  zip.file('[Content_Types].xml', contentTypes);
  zip.file('ppt/presentation.xml', presXml);
  zip.file('ppt/_rels/presentation.xml.rels', presRels);

  const outBuf = await zip.generateAsync({ type: 'nodebuffer' });
  return outBuf;
}

async function test() {
  const buf = await buildPptxFromTemplate('nptel trick for ling playlists', 3);
  fs.writeFileSync('test-out.pptx', buf);
  console.log('Generated test-out.pptx, bytes:', buf.length);
}

test();
