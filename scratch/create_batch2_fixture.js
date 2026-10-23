const fs = require('fs');
const path = require('path');
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));

async function createBatch2Fixture() {
  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const doc = await PDFDocument.create();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Page: Letter Portrait (612 x 792 pt). Left margin = 72 pt, Right margin = 72 pt (text width = 468 pt)
  const page = doc.addPage([612, 792]);
  const pageWidth = 612;
  const pageHeight = 792;
  const leftMargin = 72;
  const rightMargin = 72;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 468 pt

  let curY = 740;

  // 1. Centered Title
  const titleText = 'Batch 2 DOCX Format Replication & Typography Audit';
  const titleSize = 16;
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
  const titleX = (pageWidth - titleWidth) / 2; // ~306 pt center
  page.drawText(titleText, { x: titleX, y: curY, size: titleSize, font: fontBold, color: rgb(0.1, 0.15, 0.3) });

  // Paragraph gap: 24 pt
  curY -= 36;

  // 2. Heading 1 (Left aligned, x0 = 72 pt)
  const h1Text = '1. Overview of Structured Document Layout';
  page.drawText(h1Text, { x: 72, y: curY, size: 13, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  // Paragraph gap: 16 pt
  curY -= 24;

  // 3. Multi-line Justified Paragraph (x0 = 72 pt, right edge = 540 pt)
  // Two full lines reaching 540 pt, and one shorter last line
  const justLine1 = 'This specification establishes precision standards for converting complex PDF documents into Word Processing';
  const justLine2 = 'ML representations while faithfully preserving indentation hierarchies, inter-block gaps, and alignment types.';
  const justLine3 = 'All layout coordinates are calibrated to fractional typographic units.';
  page.drawText(justLine1, { x: 72, y: curY, size: 10, font: fontReg, color: rgb(0.15, 0.15, 0.15) });
  curY -= 14; // intra-paragraph gap = 4 pt
  page.drawText(justLine2, { x: 72, y: curY, size: 10, font: fontReg, color: rgb(0.15, 0.15, 0.15) });
  curY -= 14;
  page.drawText(justLine3, { x: 72, y: curY, size: 10, font: fontReg, color: rgb(0.15, 0.15, 0.15) });

  // Paragraph gap: 20 pt
  curY -= 26;

  // 4. Numbered List Item "1." with Hanging Indent:
  // Marker "1." at x0 = 72 pt, text starts at x = 90 pt, continuation line starts at x0 = 90 pt
  // Hanging indent = 18 pt (360 twips)
  page.drawText('1.', { x: 72, y: curY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('First level numbered requirement establishing strict structural integrity criteria across all endpoints', { x: 90, y: curY, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
  curY -= 14; // intra-paragraph gap = 4 pt
  page.drawText('ensuring that continuation lines automatically inherit the parent hanging indentation rule.', { x: 90, y: curY, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });

  // Paragraph gap: 14 pt
  curY -= 20;

  // 5. Lettered Sub-list Item "a." with Hanging Indent:
  // Marker "a." at x0 = 90 pt, text starts at x = 108 pt, continuation line starts at x0 = 108 pt
  // Hanging indent = 18 pt (360 twips), base left = 108 pt (720 twips relative to margin 72 pt)
  page.drawText('a.', { x: 90, y: curY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Secondary nested sub-requirement defining cryptographic token validation protocols for distributed microservices', { x: 108, y: curY, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });
  curY -= 14;
  page.drawText('operating within air-gapped regional infrastructure nodes.', { x: 108, y: curY, size: 10, font: fontReg, color: rgb(0.1, 0.1, 0.1) });

  // Paragraph gap: 18 pt
  curY -= 24;

  // 6. Deep Indent Levels (Level 2: x0 = 108 pt, Level 3: x0 = 126 pt, Level 4: x0 = 144 pt)
  page.drawText('Level 2 nested block indented at 108 pt demonstrating multi-tier indentation inheritance.', { x: 108, y: curY, size: 9.5, font: fontItalic, color: rgb(0.2, 0.2, 0.2) });
  curY -= 18;
  page.drawText('Level 3 nested block indented at 126 pt proving discrete indent level tracking.', { x: 126, y: curY, size: 9.5, font: fontItalic, color: rgb(0.25, 0.25, 0.25) });
  curY -= 18;
  page.drawText('Level 4 nested block indented at 144 pt verifying maximum specified nesting depth.', { x: 144, y: curY, size: 9.5, font: fontItalic, color: rgb(0.3, 0.3, 0.3) });

  // Paragraph gap: 22 pt
  curY -= 28;

  // 7. "Explanation:" Paragraph with First-Line Indent:
  // First line starts at x0 = 90 pt (18 pt first-line indent)
  // Continuation lines start at base margin x0 = 72 pt
  page.drawText('Explanation: This detailed commentary provides comprehensive insights into the underlying algorithmic', { x: 90, y: curY, size: 10, font: fontReg, color: rgb(0.15, 0.15, 0.15) });
  curY -= 14;
  page.drawText('framework that guarantees parity between visual layout geometry and document semantics, ensuring', { x: 72, y: curY, size: 10, font: fontReg, color: rgb(0.15, 0.15, 0.15) });
  curY -= 14;
  page.drawText('that exported Word documents maintain natural paragraph reflow across disparate viewing devices.', { x: 72, y: curY, size: 10, font: fontReg, color: rgb(0.15, 0.15, 0.15) });

  // Paragraph gap: 24 pt
  curY -= 30;

  // 8. Right-Aligned Paragraph Block (aligned to right margin 540 pt)
  const rLine1 = 'Authorized by Chief Information Security Officer';
  const rLine2 = 'Division of Enterprise Architecture & Governance';
  const rLine3 = 'Issued: October 2026';
  const rWidth1 = fontReg.widthOfTextAtSize(rLine1, 9.5);
  const rWidth2 = fontReg.widthOfTextAtSize(rLine2, 9.5);
  const rWidth3 = fontReg.widthOfTextAtSize(rLine3, 9.5);
  page.drawText(rLine1, { x: 540 - rWidth1, y: curY, size: 9.5, font: fontReg, color: rgb(0.3, 0.3, 0.3) });
  curY -= 13;
  page.drawText(rLine2, { x: 540 - rWidth2, y: curY, size: 9.5, font: fontReg, color: rgb(0.3, 0.3, 0.3) });
  curY -= 13;
  page.drawText(rLine3, { x: 540 - rWidth3, y: curY, size: 9.5, font: fontReg, color: rgb(0.3, 0.3, 0.3) });

  // Paragraph gap: 22 pt
  curY -= 26;

  // 9. Fixed Address Block with Preserved Hard Line Breaks
  // Lines are short (< 200 pt), standard line spacing (13 pt), must preserve line breaks
  page.drawText('Office of Document Verification', { x: 72, y: curY, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  curY -= 13;
  page.drawText('100 Technology Plaza, Suite 400', { x: 72, y: curY, size: 9, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
  curY -= 13;
  page.drawText('San Jose, California 95110', { x: 72, y: curY, size: 9, font: fontReg, color: rgb(0.2, 0.2, 0.2) });

  const bytes = await doc.save();
  const outPath = 'scratch/batch2_format_test_input.pdf';
  fs.writeFileSync(outPath, bytes);
  console.log(`Created ${outPath} (${bytes.length} bytes) with complete BATCH 2 layout features.`);
}

createBatch2Fixture();
