const fs = require('fs');
const JSZip = require('../public/assets/libs/jszip.min.js');

async function testBuilder() {
  const templateBuf = fs.readFileSync('scratch/official_minimal.pptx');
  const zip = await JSZip.loadAsync(templateBuf);

  // Read slide 1 XML and rels
  const slide1Xml = await zip.file('ppt/slides/slide1.xml').async('text');
  const slide1Rels = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  const contentTypesXml = await zip.file('[Content_Types].xml').async('text');
  const presXml = await zip.file('ppt/presentation.xml').async('text');
  const presRelsXml = await zip.file('ppt/_rels/presentation.xml.rels').async('text');

  console.log('Template loaded successfully.');
  console.log('slide1.xml length:', slide1Xml.length);
  console.log('contentTypesXml length:', contentTypesXml.length);

  // Export template as a clean JSON or bundle so ConverterEngine can build PPTX anytime in browser
  const allFiles = {};
  for (const [filename, fileObj] of Object.entries(zip.files)) {
    if (!fileObj.dir) {
      allFiles[filename] = await fileObj.async('uint8array');
    }
  }

  fs.writeFileSync('scratch/template_files_count.json', JSON.stringify({ count: Object.keys(allFiles).length }));
  console.log('Extracted', Object.keys(allFiles).length, 'template files.');
}

testBuilder();
