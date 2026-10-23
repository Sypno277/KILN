const fs = require('fs');
const path = require('path');
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));

async function createBatch4TestPdf() {
  const { PDFDocument, StandardFonts, rgb, cmyk, grayscale } = pdfLib;
  const doc = await PDFDocument.create();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);
  const fontTimes = await doc.embedFont(StandardFonts.TimesRoman);
  const fontTimesBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  // -------------------------------------------------------------
  // PAGE 1: 612 x 792 pt (Letter Portrait)
  // Target: exactly 395 red characters on Page 1
  // -------------------------------------------------------------
  const page1 = doc.addPage([612, 792]);

  // Title in Dark Navy
  page1.drawText('Batch 4 Color Fidelity and Schema Audit Document', {
    x: 40,
    y: 740,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.3)
  });

  page1.drawText('1. Security Verification Notice (DeviceRGB Red Color Space)', {
    x: 40,
    y: 705,
    size: 13,
    font: fontTimesBold,
    color: grayscale(0.1)
  });

  // Exactly 5 lines of red text on Page 1: 80 + 80 + 80 + 80 + 75 = 395 chars
  const p1_lines = [
    'CRITICAL WARNING: The security parameters for production authorization must be ', // 80 chars
    'verified immediately by compliance engineers before session tokens expire today.', // 80 chars
    'Immediate revocation of all unencrypted API credentials is mandated across all  ', // 80 chars
    'active development nodes to prevent unauthorized secondary access to databases. ', // 80 chars
    'Ensure TLS configurations are enforced on every outbound network interface. '   // 75 chars
  ];

  let curY = 675;
  for (const line of p1_lines) {
    page1.drawText(line, {
      x: 40,
      y: curY,
      size: 10,
      font: fontBold,
      color: rgb(0.88, 0.11, 0.28) // #E01C47 Red
    });
    curY -= 18;
  }

  // CMYK Blue text
  page1.drawText('This standard paragraph is rendered using an authentic DeviceCMYK color space definition.', {
    x: 40,
    y: curY - 15,
    size: 10.5,
    font: fontReg,
    color: cmyk(0.8, 0.4, 0, 0.2) // CMYK Blue
  });

  // DeviceGray text
  page1.drawText('This paragraph is rendered using an authentic DeviceGray neutral tone specification.', {
    x: 40,
    y: curY - 35,
    size: 10.5,
    font: fontTimes,
    color: grayscale(0.25)
  });

  // -------------------------------------------------------------
  // PAGE 2: 612 x 792 pt (Letter Portrait)
  // Target: exactly 400 red characters on Page 2
  // Total across Page 1 + Page 2 = 395 + 400 = exactly 795 red characters!
  // -------------------------------------------------------------
  const page2 = doc.addPage([612, 792]);

  page2.drawText('2. Compliance Protocols & Audit Findings (Page 2)', {
    x: 40,
    y: 740,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.3)
  });

  // Exactly 5 lines of red text on Page 2: 80 + 80 + 80 + 80 + 80 = 400 chars
  const p2_lines = [
    'PROTOCOL BREACH ALERT: The secondary audit team discovered unauthorized access  ', // 80 chars
    'attempts directed toward the cryptographic key cluster during routine diagnostic', // 80 chars
    'maintenance windows yesterday evening. Remediation protocols have been initiated', // 80 chars
    'across all operational regions to isolate affected endpoints and review logs.   ', // 80 chars
    'Zero deviations from the security framework are permitted under federal statute.'  // 80 chars
  ];

  curY = 705;
  for (const line of p2_lines) {
    page2.drawText(line, {
      x: 40,
      y: curY,
      size: 10,
      font: fontBold,
      color: rgb(0.88, 0.11, 0.28) // #E01C47 Red
    });
    curY -= 18;
  }

  page2.drawText('All secondary systems have completed automated diagnostic routines without encountering unhandled exceptions.', {
    x: 40,
    y: curY - 20,
    size: 10.5,
    font: fontTimes,
    color: grayscale(0.2)
  });

  const pdfBytes = await doc.save();
  const outPath = path.resolve('scratch/batch4_color_test_input.pdf');
  fs.writeFileSync(outPath, pdfBytes);

  const p1_red = p1_lines.reduce((sum, l) => sum + l.length, 0);
  const p2_red = p2_lines.reduce((sum, l) => sum + l.length, 0);
  console.log(`Created 2-page test PDF: ${outPath}`);
  console.log(`Page 1 red chars: ${p1_red}`);
  console.log(`Page 2 red chars: ${p2_red}`);
  console.log(`TOTAL RED CHARACTERS: ${p1_red + p2_red}`);

  return { outPath, totalRed: p1_red + p2_red };
}

createBatch4TestPdf().catch(err => {
  console.error('Error creating fixture:', err);
  process.exit(1);
});
