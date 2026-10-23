const fs = require('fs');
const path = require('path');
const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));

async function validateXmlParts(zipBuf) {
  const zip = await JSZip.loadAsync(zipBuf);
  const xmlFiles = Object.keys(zip.files).filter(f => f.endsWith('.xml') || f.endsWith('.rels'));
  const results = [];
  for (const f of xmlFiles) {
    const content = await zip.file(f).async('text');
    // Basic well-formedness check: check tag balancing
    try {
      // Use regex stack or basic xml parser
      let wellFormed = true;
      let error = null;
      if (!content.trim().startsWith('<') || !content.trim().endsWith('>')) {
        wellFormed = false;
        error = 'Malformed root';
      }
      results.push({ file: f, valid: wellFormed, error });
    } catch (e) {
      results.push({ file: f, valid: false, error: e.message });
    }
  }
  return results;
}

async function run() {
  const data = JSON.parse(fs.readFileSync('scratch/audit_results.json', 'utf8'));
  const sourceRuns = data.source.runs;
  const pptxRuns = data.pptx.pptxRuns;
  const docxRuns = data.docx.docxRuns;

  console.log('Source runs count:', sourceRuns.length);
  console.log('PPTX runs count:', pptxRuns.length);
  console.log('DOCX runs count:', docxRuns.length);
}

run();
