const fs = require('fs');
const JSZip = require('../public/assets/libs/jszip.min.js');
const { PPTX_TEMPLATE_B64 } = require('../public/assets/pptx-template.js');

async function testShapeFix() {
  const zip = await JSZip.loadAsync(Buffer.from(PPTX_TEMPLATE_B64, 'base64'));
  let sXml = await zip.file('ppt/slides/slide1.xml').async('text');

  const escapeXml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  const baseSlideXml = await zip.file('ppt/slides/slide1.xml').async('text');
  const baseSlideRels = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  let presXml = await zip.file('ppt/presentation.xml').async('text');
  let presRels = await zip.file('ppt/_rels/presentation.xml.rels').async('text');
  let contentTypes = await zip.file('[Content_Types].xml').async('text');

  const pages = [
    {
      title: 'Quarterly Business Performance 2026',
      points: ['Total Revenue: $4,250,000 (+18% YoY)', 'Active Enterprise Users: 142,500 clients', 'Client-Side Privacy Compliance: 100% Zero-Leak']
    },
    {
      title: 'Engineering Roadmap & Architecture',
      points: ['Offline WebAssembly transcoding pipeline', 'Native ECMA-376 Office document export', '100% Client-Side exact content preservation']
    }
  ];

  for (let i = 1; i <= pages.length; i++) {
    const ep = pages[i - 1];
    const slideName = `slide${i}.xml`;
    const titleShape = `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title 1"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="3200" b="1"/><a:t>${escapeXml(ep.title)}</a:t></a:r></a:p></p:txBody></p:sp>`;

    const bodyParaXml = ep.points.map(pt => `<a:p><a:pPr lvl="0"/><a:r><a:rPr lang="en-US" sz="1600"/><a:t>${escapeXml(pt)}</a:t></a:r></a:p>`).join('');
    const subShape = `<p:sp><p:nvSpPr><p:cNvPr id="3" name="Subtitle 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="subTitle" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${bodyParaXml}</p:txBody></p:sp>`;

    const sXml = baseSlideXml.replace(/<p:sp>[\s\S]*?<\/p:sp><p:sp>[\s\S]*?<\/p:sp>/, titleShape + subShape);

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

  const out = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('scratch/quarterly_exact.pptx', out);
  console.log('Success! Saved updated scratch/quarterly_exact.pptx with 2 slides');
}

testShapeFix();
