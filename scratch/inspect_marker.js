const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const JSZip = require(path.resolve(__dirname, '../public/assets/libs/jszip.min.js'));

async function inspect() {
  const buf = fs.readFileSync('scratch/batch6_output.pptx');
  const md5 = crypto.createHash('md5').update(buf).digest('hex');
  console.log('AFTER MD5:', md5);
  console.log('File size:', buf.length, 'bytes');

  const zip = await JSZip.loadAsync(buf);
  const slide1 = await zip.file('ppt/slides/slide1.xml').async('text');
  const markerPattern = 'data-pipeline-marker="batch0_proven"';
  const hasMarker = slide1.includes(markerPattern);
  console.log(`Has ${markerPattern} in slide1.xml?:`, hasMarker);

  const match = slide1.match(/<p:cNvPr[^>]*data-pipeline-marker="batch0_proven"[^>]*\/>/);
  if (match) {
    console.log('Found exact XML snippet:');
    console.log('  ' + match[0]);
  }

  // Count total occurrences in slide1.xml
  const occurrences = (slide1.match(/data-pipeline-marker="batch0_proven"/g) || []).length;
  console.log('Total marker occurrences across text boxes:', occurrences);
}

inspect();
