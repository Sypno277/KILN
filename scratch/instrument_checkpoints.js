const path = require('path');
const { pathToFileURL } = require('url');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const fs = require('fs');

async function traceCheckpoints() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
  engine.getJSZip = () => JSZip;
  
  const bytes = fs.readFileSync('scratch/week1_solutions.pdf');
  const file = {
    name: 'week1_solutions.pdf',
    size: bytes.length,
    slice: (s, e) => ({ arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset + s, bytes.byteOffset + e) }),
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  };
  
  // 1. Raw PDF.js extraction from opList
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page1 = await doc.getPage(1);
  const opList = await page1.getOperatorList();
  
  let curFill = 'unset';
  const rawGlyphs = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    if (fn === pdfjs.OPS.setFillRGBColor) {
      curFill = engine.resolveColorValue(args);
    }
    if (fn === pdfjs.OPS.showText) {
      const g = args[0] && args[0][0];
      const u = g ? g.unicode : '';
      rawGlyphs.push({ char: u, color: curFill, opIdx: i });
    }
  }
  
  // Locate 5 black characters from "Week-"
  const blackTargets = ['W', 'e', 'e', 'k', '-'];
  console.log('=== CHECKPOINT 1: RAW VALUE FROM PDF LIBRARY (PDF.js opList) ===');
  console.log('Black Targets (from "Week-"):');
  for (let i = 0; i < 5; i++) {
    console.log(`  [Black ${i+1}] '${rawGlyphs[i].char}': raw fill = ${rawGlyphs[i].color} (opIdx=${rawGlyphs[i].opIdx})`);
  }
  
  // Locate 5 red characters from "Reduc"
  let reduceIdx = -1;
  for (let i = 0; i < rawGlyphs.length - 6; i++) {
    const word = rawGlyphs.slice(i, i + 5).map(x => x.char).join('');
    if (word === 'Reduc') {
      reduceIdx = i;
      break;
    }
  }
  console.log('\nRed Targets (from "Reduc"):');
  for (let i = 0; i < 5; i++) {
    const g = rawGlyphs[reduceIdx + i];
    console.log(`  [Red ${i+1}] '${g.char}': raw fill = ${g.color} (opIdx=${g.opIdx})`);
  }
  
  // 2. Intermediate Model
  const pages = await engine.extractPdfPagesContent(file);
  const p1Lines = pages[0].lines || [];
  
  console.log('\n=== CHECKPOINT 2: VALUE IN INTERMEDIATE MODEL (parsedItems / lines / runs) ===');
  const lineWeek = p1Lines.find(l => l.text.includes('Week'));
  console.log('Black Run (in line "' + (lineWeek ? lineWeek.text.slice(0, 30) : '') + '"):');
  if (lineWeek) {
    for (const r of lineWeek.runs) {
      console.log(`  run text="${r.text.slice(0, 20)}" colorHex=${r.colorHex} color_hex=${r.color_hex}`);
    }
  }
  
  const lineReduce = p1Lines.find(l => l.text.includes('Reduce'));
  console.log('Red Run (in line "' + (lineReduce ? lineReduce.text.slice(0, 30) : '') + '"):');
  if (lineReduce) {
    for (const r of lineReduce.runs) {
      console.log(`  run text="${r.text.slice(0, 20)}" colorHex=${r.colorHex} color_hex=${r.color_hex}`);
    }
  }
  
  // 3. XML Output
  const docxRes = await engine.pdfToWord(file);
  const zip = await JSZip.loadAsync(docxRes.blob ? await docxRes.blob.arrayBuffer() : docxRes);
  const docXml = await zip.file('word/document.xml').async('text');
  
  console.log('\n=== CHECKPOINT 3: VALUE WRITTEN TO XML (word/document.xml) ===');
  const pMatches = docXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
  for (const pXml of pMatches) {
    if (pXml.includes('Week-1')) {
      console.log('Black Paragraph XML snippet:');
      const rMatch = pXml.match(/<w:r[\s\S]*?<\/w:r>/g) || [];
      for (const r of rMatch) {
        console.log('  ' + r.replace(/\n\s*/g, ' '));
      }
    }
    if (pXml.includes('Reduce')) {
      console.log('\nRed Paragraph XML snippet:');
      const rMatch = pXml.match(/<w:r[\s\S]*?<\/w:r>/g) || [];
      for (const r of rMatch) {
        console.log('  ' + r.replace(/\n\s*/g, ' '));
      }
    }
  }

  // Also check PPTX
  const pptxRes = await engine.pdfToPpt(file);
  const pptZip = await JSZip.loadAsync(pptxRes.blob ? await pptxRes.blob.arrayBuffer() : pptxRes);
  const slide1Xml = await pptZip.file('ppt/slides/slide1.xml').async('text');
  console.log('\nPPTX Slide 1 XML snippet for Reduce:');
  const pptMatches = slide1Xml.match(/<a:p[\s\S]*?<\/a:p>/g) || [];
  for (const pXml of pptMatches) {
    if (pXml.includes('Reduce')) {
      console.log('  ' + pXml.replace(/\n\s*/g, ' '));
    }
  }
}
traceCheckpoints();
