const fs = require('fs');
const path = require('path');
const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));

async function inspectXmlSnippets() {
  console.log('===============================================================');
  console.log('              XML SNIPPETS FOR ONE RED RUN                     ');
  console.log('===============================================================\n');

  // 1. DOCX
  const docxZip = await JSZip.loadAsync(fs.readFileSync('scratch/output_week1.docx'));
  const docXml = await docxZip.file('word/document.xml').async('text');
  const docxIdx = docXml.indexOf('w:val="FF0000"');
  if (docxIdx !== -1) {
    const start = docXml.lastIndexOf('<w:r>', docxIdx);
    const end = docXml.indexOf('</w:r>', docxIdx) + 6;
    console.log('--- 1. DOCX: One Red Run XML (`word/document.xml`) ---');
    console.log(docXml.substring(start, end));
    console.log('\n');
  } else {
    console.log('DOCX: No FF0000 found!');
  }

  // 2. PPTX
  const pptxZip = await JSZip.loadAsync(fs.readFileSync('scratch/output_week1.pptx'));
  const slide1Xml = await pptxZip.file('ppt/slides/slide1.xml').async('text');
  const pptxIdx = slide1Xml.indexOf('val="FF0000"');
  if (pptxIdx !== -1) {
    const start = slide1Xml.lastIndexOf('<a:r>', pptxIdx);
    const end = slide1Xml.indexOf('</a:r>', pptxIdx) + 6;
    console.log('--- 2. PPTX: One Red Run XML (`ppt/slides/slide1.xml`) ---');
    console.log(slide1Xml.substring(start, end));
    console.log('\n');
  } else {
    console.log('PPTX: No FF0000 found!');
  }

  // 3. HTML
  const htmlContent = fs.readFileSync('scratch/output_week1.html', 'utf8');
  const htmlIdx = htmlContent.indexOf('color: #FF0000;');
  if (htmlIdx !== -1) {
    const start = htmlContent.lastIndexOf('<span', htmlIdx);
    const end = htmlContent.indexOf('</span>', htmlIdx) + 7;
    console.log('--- 3. HTML: One Red Run Snippet (`scratch/output_week1.html`) ---');
    console.log(htmlContent.substring(start, end));
    console.log('\n');
  } else {
    console.log('HTML: No color: #FF0000; found!');
  }
}

inspectXmlSnippets().catch(err => console.error(err));
