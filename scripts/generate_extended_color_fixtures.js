const fs = require('fs');
const path = require('path');
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));

async function createExtendedColorFixture() {
  const { PDFDocument, StandardFonts, rgb, cmyk, grayscale } = pdfLib;
  const doc = await PDFDocument.create();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);
  const fontCourier = await doc.embedFont(StandardFonts.CourierBold);

  // =========================================================================
  // PAGE 1: Multi-Color Spaces, q/Q Stack, Mid-Line, Mid-Word, Render Modes, Light/Dark
  // =========================================================================
  const page1 = doc.addPage([612, 792]); // Letter Portrait

  // Header
  page1.drawText('Batch 5: Extended Color Spaces & Graphics State Torture Fixture', {
    x: 50,
    y: 740,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  // 1. Text in standard DeviceRGB (Red, Green, Blue)
  page1.drawText('1. DeviceRGB Pure Colors: ', { x: 50, y: 700, size: 12, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText('RED_RGB ', { x: 230, y: 700, size: 12, font: fontBold, color: rgb(1, 0, 0) });
  page1.drawText('GREEN_RGB ', { x: 300, y: 700, size: 12, font: fontBold, color: rgb(0, 0.8, 0.2) });
  page1.drawText('BLUE_RGB', { x: 395, y: 700, size: 12, font: fontBold, color: rgb(0, 0.2, 0.9) });

  // 2. Text in DeviceCMYK
  page1.drawText('2. DeviceCMYK Color Space: ', { x: 50, y: 670, size: 12, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText('CMYK_RED ', { x: 230, y: 670, size: 12, font: fontBold, color: cmyk(0, 1.0, 1.0, 0) });
  page1.drawText('CMYK_CYAN ', { x: 320, y: 670, size: 12, font: fontBold, color: cmyk(1.0, 0, 0, 0) });
  page1.drawText('CMYK_MAGENTA', { x: 415, y: 670, size: 12, font: fontBold, color: cmyk(0, 1.0, 0, 0) });

  // 3. Text in DeviceGray & Light/Dark Extremes
  page1.drawText('3. DeviceGray & Tone Extremes: ', { x: 50, y: 640, size: 12, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText('MID_GRAY_0.5 ', { x: 245, y: 640, size: 12, font: fontBold, color: grayscale(0.5) });
  page1.drawText('VERY_DARK_0.05 ', { x: 350, y: 640, size: 12, font: fontBold, color: grayscale(0.05) });
  page1.drawText('LIGHT_0.85', { x: 475, y: 640, size: 12, font: fontBold, color: grayscale(0.85) });

  // 4. Mid-line color change
  page1.drawText('4. Mid-Line Color Transition: [BlackPrefix] ', { x: 50, y: 610, size: 11, font: fontReg, color: rgb(0, 0, 0) });
  page1.drawText('>> RED_SEGMENT <<', { x: 280, y: 610, size: 11, font: fontBold, color: rgb(1, 0, 0) });
  page1.drawText(' [BlackSuffix]', { x: 410, y: 610, size: 11, font: fontReg, color: rgb(0, 0, 0) });

  // 5. Mid-word color change ("HYPERColor" where HYPER is black and Color is red)
  page1.drawText('5. Mid-Word Color Transition: ', { x: 50, y: 580, size: 12, font: fontBold, color: rgb(0, 0, 0) });
  page1.drawText('HYPER', { x: 240, y: 580, size: 12, font: fontCourier, color: rgb(0, 0, 0) });
  page1.drawText('COLOR', { x: 283, y: 580, size: 12, font: fontCourier, color: rgb(1, 0, 0) });
  page1.drawText('SPLIT', { x: 335, y: 580, size: 12, font: fontCourier, color: rgb(0, 0.5, 1.0) });

  // 6. Color set inside q/Q graphics stack via raw operator stream
  // We push graphics state 'q', set color '1 0 0 rg' (red), draw text, pop 'Q', and draw next text.
  // Next text must be black because Q pops the color back to pre-q state.
  page1.drawText('6. q/Q Stack Isolation: ', { x: 50, y: 550, size: 12, font: fontBold, color: rgb(0, 0, 0) });
  page1.pushOperators(
    pdfLib.pushGraphicsState(),
    pdfLib.setFillingColor(rgb(1, 0, 0))
  );
  page1.drawText('INSIDE_Q_RED_TEXT', { x: 220, y: 550, size: 12, font: fontBold, color: rgb(1, 0, 0) });
  page1.pushOperators(
    pdfLib.popGraphicsState()
  );
  page1.drawText('AFTER_Q_RESTORED_BLACK', { x: 380, y: 550, size: 12, font: fontBold, color: rgb(0, 0, 0) });

  // 7. Render Modes 0, 1, 2
  page1.drawText('7. Text Render Modes: ', { x: 50, y: 520, size: 12, font: fontBold, color: rgb(0, 0, 0) });
  // Mode 0: Fill Text
  page1.drawText('MODE_0_FILL_TEXT ', { x: 210, y: 520, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.8) });
  // Mode 1: Stroke Text (Stroked in red)
  page1.pushOperators(
    pdfLib.setTextRenderingMode(1),
    pdfLib.setStrokingColor(rgb(1, 0, 0)),
    pdfLib.setLineWidth(1)
  );
  page1.drawText('MODE_1_STROKE_RED ', { x: 345, y: 520, size: 11, font: fontBold });
  page1.pushOperators(
    pdfLib.setTextRenderingMode(0)
  );
  // Mode 2: Fill and Stroke Text
  page1.pushOperators(
    pdfLib.setTextRenderingMode(2),
    pdfLib.setFillingColor(rgb(0, 0.8, 0.2)),
    pdfLib.setStrokingColor(rgb(1, 0, 0)),
    pdfLib.setLineWidth(0.5)
  );
  page1.drawText('MODE_2_FILL_AND_STROKE', { x: 470, y: 520, size: 9, font: fontBold });
  page1.pushOperators(
    pdfLib.setTextRenderingMode(0)
  );

  // =========================================================================
  // PAGE 2: Multi-Page Color Continuity (Same Red Across Multiple Pages)
  // =========================================================================
  const page2 = doc.addPage([612, 792]);
  page2.drawText('Batch 5: Extended Color Fixture - Page 2 Continuity', {
    x: 50,
    y: 740,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  page2.drawText('Cross-Page Red Tone Verification (Page 2 of 3):', {
    x: 50,
    y: 700,
    size: 13,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  page2.drawText('This paragraph retains the exact same #FF0000 pure red color from Page 1 across page boundaries.', {
    x: 50,
    y: 670,
    size: 11,
    font: fontBold,
    color: rgb(1, 0, 0)
  });

  page2.drawText('Standard black explanation text below the red notification block.', {
    x: 50,
    y: 645,
    size: 11,
    font: fontReg,
    color: rgb(0, 0, 0)
  });

  // =========================================================================
  // PAGE 3: Page 3 Continuity (Same Red Across Multiple Pages)
  // =========================================================================
  const page3 = doc.addPage([612, 792]);
  page3.drawText('Batch 5: Extended Color Fixture - Page 3 Final Continuity', {
    x: 50,
    y: 740,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  page3.drawText('Cross-Page Red Tone Verification (Page 3 of 3):', {
    x: 50,
    y: 700,
    size: 13,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  page3.drawText('Final multi-page color confirmation: #FF0000 is emitted with identical fidelity on Page 3.', {
    x: 50,
    y: 670,
    size: 11,
    font: fontBold,
    color: rgb(1, 0, 0)
  });

  page3.drawText('All multi-page continuous color states are preserved without resetting or leaking.', {
    x: 50,
    y: 645,
    size: 11,
    font: fontReg,
    color: rgb(0, 0, 0)
  });

  const pdfBytes = await doc.save();

  fs.mkdirSync('tests/fixtures/pdf', { recursive: true });
  fs.mkdirSync('scratch', { recursive: true });

  const fixturePath1 = path.resolve('tests/fixtures/pdf/extended_color_torture.pdf');
  const fixturePath2 = path.resolve('scratch/extended_color_torture.pdf');

  fs.writeFileSync(fixturePath1, pdfBytes);
  fs.writeFileSync(fixturePath2, pdfBytes);

  console.log(`Generated Extended Color Fixture:`);
  console.log(`  -> ${fixturePath1} (${pdfBytes.length} bytes, 3 pages)`);
  console.log(`  -> ${fixturePath2}`);
  return fixturePath1;
}

createExtendedColorFixture().catch(err => {
  console.error('Fixture generation failed:', err);
  process.exit(1);
});
