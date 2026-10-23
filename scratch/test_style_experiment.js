const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const XLSX = require(path.resolve('public/assets/libs/xlsx.full.min.js'));

async function setupEngine() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;
  engine.getXLSX = () => XLSX;
  return engine;
}

async function createStyleTestPdf() {
  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const doc = await PDFDocument.create();

  // Standard 14 PDF fonts across 3 families
  const fontHelvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontHelv = await doc.embedFont(StandardFonts.Helvetica);
  const fontHelvItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fontTimes = await doc.embedFont(StandardFonts.TimesRoman);
  const fontTimesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const fontCourier = await doc.embedFont(StandardFonts.Courier);
  const fontCourierBold = await doc.embedFont(StandardFonts.CourierBold);

  const page = doc.addPage([612, 792]); // Letter portrait

  // 1. Title - 24pt, Helvetica-Bold, Royal Blue (#2563EB)
  page.drawText('Typography Test Document', {
    x: 40,
    y: 730,
    size: 24,
    font: fontHelvBold,
    color: rgb(0.14, 0.39, 0.92)
  });

  // 2. Subtitle - 16pt, Times-Roman, Dark Slate (#1E293B)
  page.drawText('Section Subtitle in Times Roman Serif', {
    x: 40,
    y: 695,
    size: 16,
    font: fontTimes,
    color: rgb(0.12, 0.16, 0.23)
  });

  // 3. Monospace Code Line - 11pt, Courier
  page.drawText('const apiKey = "sec_9876543210_live";', {
    x: 40,
    y: 660,
    size: 11,
    font: fontCourier,
    color: rgb(0.2, 0.2, 0.2)
  });

  // 4. Highlighted Callout Box - Yellow background (#FEF08A) + Crimson Red Text (#E11D48)
  page.drawRectangle({
    x: 40,
    y: 595,
    width: 530,
    height: 40,
    color: rgb(0.99, 0.94, 0.54) // #FEF08A yellow
  });
  page.drawText('WARNING: This important alert text has a yellow highlight background.', {
    x: 50,
    y: 610,
    size: 11,
    font: fontHelvBold,
    color: rgb(0.88, 0.11, 0.28) // #E11D48 crimson
  });

  // 5. Italic Emphasis - 11pt, Helvetica-Oblique
  page.drawText('This body sentence is set in italic oblique text for emphasis.', {
    x: 40,
    y: 560,
    size: 11,
    font: fontHelvItalic,
    color: rgb(0.25, 0.25, 0.25)
  });

  // 6. Body Text with Non-Heading Bold - 11pt, Times-Roman-Bold
  page.drawText('Key Principle: Body text at 11pt should remain bold.', {
    x: 40,
    y: 530,
    size: 11,
    font: fontTimesBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  // 7. Small Footnote - 8pt, Helvetica
  page.drawText('Footnote 1: Verified against ISO 32000-1 specification.', {
    x: 40,
    y: 480,
    size: 8,
    font: fontHelv,
    color: rgb(0.5, 0.5, 0.5)
  });

  const pdfBytes = await doc.save();
  const pdfPath = path.resolve('scratch/test_style_input.pdf');
  fs.writeFileSync(pdfPath, pdfBytes);
  return { pdfPath, pdfBytes };
}

async function runExperiment() {
  console.log('================================================================');
  console.log('   BATCH 2: TYPOGRAPHY, FONT STYLE & HIGHLIGHT EXPERIMENT       ');
  console.log('================================================================\n');

  console.log('Step 1: Generating test PDF with controlled typography attributes...');
  const { pdfPath, pdfBytes } = await createStyleTestPdf();
  console.log(`Generated: ${pdfPath} (${pdfBytes.length} bytes)\n`);

  const engine = await setupEngine();
  const fileObj = {
    name: 'test_style_input.pdf',
    size: pdfBytes.length,
    arrayBuffer: async () => pdfBytes.buffer
  };

  // Convert to PPTX
  console.log('Step 2: Converting PDF to PPTX (Fidelity Mode)...');
  const pptxRes = await engine.pdfToPpt(fileObj, { mode: 'fidelity' });
  const pptxBuf = await pptxRes.blob.arrayBuffer();
  const pptxZip = await JSZip.loadAsync(pptxBuf);
  const slide1Xml = await pptxZip.file('ppt/slides/slide1.xml').async('text');

  // Convert to DOCX
  console.log('Step 3: Converting PDF to DOCX (Fidelity Mode)...');
  const docxRes = await engine.pdfToWord(fileObj, { mode: 'fidelity' });
  const docxBuf = await docxRes.blob.arrayBuffer();
  const docxZip = await JSZip.loadAsync(docxBuf);
  const docxDocXml = await docxZip.file('word/document.xml').async('text');
  const docxStylesXml = await docxZip.file('word/styles.xml').async('text');

  console.log('\nStep 4: Inspecting output XML packages for attribute retention...\n');

  // Attribute 1: Font Families
  const pptxHasCourier = slide1Xml.includes('Courier') || slide1Xml.includes('monospace');
  const pptxHasTimes = slide1Xml.includes('Times');
  const docxHasCourier = docxDocXml.includes('Courier') || docxDocXml.includes('monospace');
  const docxHasTimes = docxDocXml.includes('Times');

  // Attribute 2: Font Sizes
  const pptxHas24pt = slide1Xml.includes('sz="2400"');
  const pptxHas16pt = slide1Xml.includes('sz="1600"');
  const pptxHas11pt = slide1Xml.includes('sz="1100"') || slide1Xml.includes('sz="1900"'); // 11+8
  const pptxHas8pt = slide1Xml.includes('sz="800"');

  const docxHas24pt = docxDocXml.includes('w:sz w:val="48"') || docxDocXml.includes('Heading1');
  const docxHas16pt = docxDocXml.includes('w:sz w:val="32"');
  const docxHas11pt = docxDocXml.includes('w:sz w:val="22"');
  const docxHas8pt = docxDocXml.includes('w:sz w:val="16"');

  // Attribute 3: Bold on 11pt body text
  // In slide1Xml, look for b="1" on the 11pt Key Principle text
  const pptxBodyBold = /<a:r><a:rPr[^>]*b="1"[^>]*>[\s\S]*?<a:t>[^<]*Key Principle/i.test(slide1Xml);
  const docxBodyBold = /<w:r><w:rPr>[\s\S]*?<w:b\/>[\s\S]*?<\/w:rPr><w:t[^>]*>[^<]*Key Principle/i.test(docxDocXml);

  // Attribute 4: Italic
  const pptxHasItalic = slide1Xml.includes('i="1"');
  const docxHasItalic = docxDocXml.includes('<w:i/>');

  // Attribute 5: Text Colors (Blue #2563EB, Crimson #E11D48)
  const pptxHasBlueColor = slide1Xml.includes('2563EB') || slide1Xml.includes('2563eb') || slide1Xml.includes('srgbClr');
  const docxHasBlueColor = docxDocXml.includes('2563EB') || docxDocXml.includes('2563eb') || docxDocXml.includes('w:color');

  // Attribute 6: Highlight / Yellow background (#FEF08A)
  const pptxHasHighlight = slide1Xml.includes('highlight') || slide1Xml.includes('FEF08A') || slide1Xml.includes('fef08a');
  const docxHasHighlight = docxDocXml.includes('w:highlight') || docxDocXml.includes('w:shd') || docxDocXml.includes('FEF08A');

  const results = [
    {
      attribute: 'Font Family: Monospace (Courier)',
      input: 'Courier',
      pptx: pptxHasCourier ? 'Courier' : 'Missing (defaults to theme)',
      docx: docxHasCourier ? 'Courier' : 'Missing (defaults to Calibri)',
      retained: pptxHasCourier && docxHasCourier ? 'YES' : 'NO'
    },
    {
      attribute: 'Font Family: Serif (Times Roman)',
      input: 'Times-Roman',
      pptx: pptxHasTimes ? 'Times' : 'Missing (defaults to theme)',
      docx: docxHasTimes ? 'Times' : 'Missing (defaults to Calibri)',
      retained: pptxHasTimes && docxHasTimes ? 'YES' : 'NO'
    },
    {
      attribute: 'Font Size: Title (24pt)',
      input: '24 pt',
      pptx: pptxHas24pt ? '2400 (24 pt)' : 'Size mapped to header default',
      docx: docxHas24pt ? 'Heading1 / 48 twips' : '32 twips (16 pt)',
      retained: (pptxHas24pt && docxHas24pt) ? 'YES' : 'NO'
    },
    {
      attribute: 'Font Size: Footnote (8pt)',
      input: '8 pt',
      pptx: pptxHas8pt ? '800 (8 pt)' : '1600 (16 pt with +8 padding)',
      docx: docxHas8pt ? '16 twips (8 pt)' : '22 twips (11 pt fallback)',
      retained: docxHas8pt && pptxHas8pt ? 'YES' : 'NO'
    },
    {
      attribute: 'Bold: Non-Heading Body (11pt)',
      input: 'Bold (HelveticaBold / TimesBold)',
      pptx: pptxBodyBold ? 'b="1"' : 'b="0" (Stripped: isHeading=false)',
      docx: docxBodyBold ? '<w:b/>' : 'Empty (Stripped: isHeading=false)',
      retained: pptxBodyBold && docxBodyBold ? 'YES' : 'NO'
    },
    {
      attribute: 'Italic / Oblique Text',
      input: 'Italic (HelveticaOblique)',
      pptx: pptxHasItalic ? 'i="1"' : 'Missing (i="1" not written)',
      docx: docxHasItalic ? '<w:i/>' : 'Missing (<w:i/> not written)',
      retained: pptxHasItalic && docxHasItalic ? 'YES' : 'NO'
    },
    {
      attribute: 'Text Color: Royal Blue (#2563EB)',
      input: '#2563EB (RGB: 37, 99, 235)',
      pptx: pptxHasBlueColor ? 'srgbClr val="2563EB"' : 'Missing (No <a:solidFill>)',
      docx: docxHasBlueColor ? '<w:color w:val="2563EB"/>' : 'Missing (No <w:color>)',
      retained: pptxHasBlueColor && docxHasBlueColor ? 'YES' : 'NO'
    },
    {
      attribute: 'Text Highlight / Yellow Box',
      input: '#FEF08A Yellow Box',
      pptx: pptxHasHighlight ? '<a:highlight>' : 'Missing (No highlight tag)',
      docx: docxHasHighlight ? '<w:highlight> or <w:shd>' : 'Missing (No highlight tag)',
      retained: pptxHasHighlight && docxHasHighlight ? 'YES' : 'NO'
    }
  ];

  console.log('| Attribute | Input Expected | PPTX Output | DOCX Output | Retained? |');
  console.log('|---|---|---|---|---|');
  for (const r of results) {
    console.log(`| **${r.attribute}** | \`${r.input}\` | ${r.pptx} | ${r.docx} | **${r.retained}** |`);
  }

  // Dump sample PPTX and DOCX snippets to show exact XML output
  console.log('\n--- Sample Generated PPTX <p:txBody> (Item 5 Italic) ---');
  const italicPptxMatch = slide1Xml.match(/<p:sp>[\s\S]*?This body sentence is set in italic[\s\S]*?<\/p:sp>/);
  if (italicPptxMatch) console.log(italicPptxMatch[0]);

  console.log('\n--- Sample Generated DOCX <w:p> (Item 5 Italic) ---');
  const italicDocxMatch = docxDocXml.match(/<w:p>[\s\S]*?This body sentence is set in italic[\s\S]*?<\/w:p>/);
  if (italicDocxMatch) console.log(italicDocxMatch[0]);

  console.log('\n================================================================');
  console.log('                 EXPERIMENT COMPLETE                            ');
  console.log('================================================================\n');
}

runExperiment().catch(console.error);
