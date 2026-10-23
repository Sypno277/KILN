const fs = require('fs');
const path = require('path');
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));

async function createBatch3Fixture() {
  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const doc = await PDFDocument.create();

  // Create an equation bitmap with real multi-color equation pixels
  // Target display bbox in PDF: 223 pt width x 31 pt height
  // Real pixel resolution: 3.5x scale -> ~780 x 108 pixels
  const pxW = 780;
  const pxH = 108;
  const rgba = new Uint8Array(pxW * pxH * 4);

  // Background: white with subtle mathematical grid / transparency
  for (let i = 0; i < pxW * pxH; i++) {
    const off = i * 4;
    rgba[off] = 255;
    rgba[off + 1] = 255;
    rgba[off + 2] = 255;
    rgba[off + 3] = 255;
  }

  // Draw equation glyphs into pixels:
  // e.g. "f(x) = \int_0^\infty e^{-t} t^{x-1} dt"
  // Draw integral sign, fraction bars, variables in distinct colors:
  // Mathematical ink (#1E293B slate dark, integral symbol #2563EB blue, exponents #DC2626 red)
  const drawLine = (x0, y0, x1, y1, r, g, b, thickness = 3) => {
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0, y = y0;
    while (true) {
      for (let tx = -thickness; tx <= thickness; tx++) {
        for (let ty = -thickness; ty <= thickness; ty++) {
          const px = x + tx, py = y + ty;
          if (px >= 0 && px < pxW && py >= 0 && py < pxH) {
            const idx = (py * pxW + px) * 4;
            rgba[idx] = r;
            rgba[idx + 1] = g;
            rgba[idx + 2] = b;
            rgba[idx + 3] = 255;
          }
        }
      }
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  };

  // 1. Draw "f(x) = "
  drawLine(40, 20, 40, 90, 30, 41, 59, 2);
  drawLine(40, 20, 65, 20, 30, 41, 59, 2);
  drawLine(35, 50, 60, 50, 30, 41, 59, 2); // f

  drawLine(80, 25, 95, 90, 30, 41, 59, 2); // (
  drawLine(105, 45, 125, 75, 30, 41, 59, 2);
  drawLine(125, 45, 105, 75, 30, 41, 59, 2); // x
  drawLine(135, 25, 120, 90, 30, 41, 59, 2); // )

  drawLine(155, 48, 185, 48, 30, 41, 59, 2);
  drawLine(155, 62, 185, 62, 30, 41, 59, 2); // =

  // 2. Big Integral symbol in Royal Blue (#2563EB)
  drawLine(220, 15, 240, 15, 37, 99, 235, 3);
  drawLine(220, 15, 215, 35, 37, 99, 235, 3);
  drawLine(215, 35, 215, 75, 37, 99, 235, 3);
  drawLine(215, 75, 210, 95, 37, 99, 235, 3);
  drawLine(195, 95, 210, 95, 37, 99, 235, 3); // Integral curve

  // Limits: 0 and \infty
  drawLine(230, 95, 245, 95, 220, 38, 38, 2); // 0
  drawLine(230, 85, 230, 95, 220, 38, 38, 2);
  drawLine(245, 85, 245, 95, 220, 38, 38, 2);
  drawLine(230, 85, 245, 85, 220, 38, 38, 2);

  drawLine(230, 20, 240, 20, 220, 38, 38, 2); // infty
  drawLine(245, 20, 255, 20, 220, 38, 38, 2);

  // 3. Fraction and radical bar: e^{-t} t^{x-1} dt / \sqrt{2\pi}
  // Fraction horizontal bar:
  drawLine(270, 55, 520, 55, 15, 23, 42, 3);

  // Numerator: e^{-t} t^{x-1}
  drawLine(300, 35, 320, 35, 30, 41, 59, 2);
  drawLine(300, 35, 300, 48, 30, 41, 59, 2);
  drawLine(300, 48, 320, 48, 30, 41, 59, 2);
  drawLine(320, 35, 320, 48, 30, 41, 59, 2); // e

  drawLine(335, 22, 350, 22, 220, 38, 38, 2); // -
  drawLine(355, 18, 355, 30, 220, 38, 38, 2);
  drawLine(350, 24, 360, 24, 220, 38, 38, 2); // t

  // Denominator: \sqrt{2\pi}
  drawLine(320, 78, 325, 88, 37, 99, 235, 2);
  drawLine(325, 88, 332, 65, 37, 99, 235, 2);
  drawLine(332, 65, 410, 65, 37, 99, 235, 2); // sqrt symbol and top bar
  drawLine(345, 72, 360, 72, 30, 41, 59, 2);
  drawLine(360, 72, 345, 90, 30, 41, 59, 2);
  drawLine(345, 90, 365, 90, 30, 41, 59, 2); // 2

  // dt at end
  drawLine(540, 35, 540, 75, 30, 41, 59, 2);
  drawLine(535, 48, 550, 48, 30, 41, 59, 2);
  drawLine(560, 48, 575, 48, 30, 41, 59, 2);
  drawLine(568, 35, 568, 75, 30, 41, 59, 2);

  // Encode to PNG using pure JS PNG encoder
  const scanlines = new Uint8Array(pxH * (1 + pxW * 4));
  let srcIdx = 0, dstIdx = 0;
  for (let y = 0; y < pxH; y++) {
    scanlines[dstIdx++] = 0;
    for (let x = 0; x < pxW * 4; x++) {
      scanlines[dstIdx++] = rgba[srcIdx++];
    }
  }

  let adlerA = 1, adlerB = 0;
  for (let i = 0; i < scanlines.length; i++) {
    adlerA = (adlerA + scanlines[i]) % 65521;
    adlerB = (adlerB + adlerA) % 65521;
  }
  const adler = ((adlerB << 16) | adlerA) >>> 0;

  const blocks = [];
  const maxBlock = 65535;
  for (let offset = 0; offset < scanlines.length; offset += maxBlock) {
    const chunk = scanlines.slice(offset, Math.min(scanlines.length, offset + maxBlock));
    const isLast = (offset + maxBlock >= scanlines.length) ? 1 : 0;
    const bLen = chunk.length;
    const bNlen = (~bLen) & 0xFFFF;
    const hdr = new Uint8Array(5);
    hdr[0] = isLast;
    hdr[1] = bLen & 0xFF;
    hdr[2] = (bLen >>> 8) & 0xFF;
    hdr[3] = bNlen & 0xFF;
    hdr[4] = (bNlen >>> 8) & 0xFF;
    blocks.push(hdr, chunk);
  }

  const adlerBuf = new Uint8Array([
    (adler >>> 24) & 0xFF,
    (adler >>> 16) & 0xFF,
    (adler >>> 8) & 0xFF,
    adler & 0xFF
  ]);

  const totalBlockLen = blocks.reduce((acc, b) => acc + b.length, 0);
  const zlibStream = new Uint8Array(2 + totalBlockLen + 4);
  zlibStream[0] = 0x78; zlibStream[1] = 0x01;
  let zOffset = 2;
  for (const b of blocks) {
    zStreamCopy = zlibStream.set(b, zOffset);
    zOffset += b.length;
  }
  zlibStream.set(adlerBuf, zOffset);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    crcTable[i] = c;
  }
  const calcCrc = (buf) => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  const makeChunk = (type, data) => {
    const len = data.length;
    const typeBytes = new Uint8Array([type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)]);
    const crcData = new Uint8Array(4 + len);
    crcData.set(typeBytes, 0);
    crcData.set(data, 4);
    const crc = calcCrc(crcData);

    const chunk = new Uint8Array(12 + len);
    chunk[0] = (len >>> 24) & 0xFF;
    chunk[1] = (len >>> 16) & 0xFF;
    chunk[2] = (len >>> 8) & 0xFF;
    chunk[3] = len & 0xFF;
    chunk.set(typeBytes, 4);
    chunk.set(data, 8);
    chunk[8 + len] = (crc >>> 24) & 0xFF;
    chunk[9 + len] = (crc >>> 16) & 0xFF;
    chunk[10 + len] = (crc >>> 8) & 0xFF;
    chunk[11 + len] = crc & 0xFF;
    return chunk;
  };

  const ihdr = new Uint8Array(13);
  ihdr[0] = (pxW >>> 24) & 0xFF; ihdr[1] = (pxW >>> 16) & 0xFF; ihdr[2] = (pxW >>> 8) & 0xFF; ihdr[3] = pxW & 0xFF;
  ihdr[4] = (pxH >>> 24) & 0xFF; ihdr[5] = (pxH >>> 16) & 0xFF; ihdr[6] = (pxH >>> 8) & 0xFF; ihdr[7] = pxH & 0xFF;
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', zlibStream);
  const iendChunk = makeChunk('IEND', new Uint8Array(0));

  const pngBytes = new Uint8Array(pngHeader.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
  let pOff = 0;
  pngBytes.set(pngHeader, pOff); pOff += pngHeader.length;
  pngBytes.set(ihdrChunk, pOff); pOff += ihdrChunk.length;
  pngBytes.set(idatChunk, pOff); pOff += idatChunk.length;
  pngBytes.set(iendChunk, pOff); pOff += iendChunk.length;

  // Embed PNG image into PDF
  const embeddedPng = await doc.embedPng(pngBytes);

  // Add Page: Letter 612 x 792 pt
  const page = doc.addPage([612, 792]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // Title
  page.drawText('Scientific Calculation & Formula Fidelity Audit', {
    x: 54,
    y: 730,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25)
  });

  // Paragraph 1: Explanatory text above equation
  page.drawText('The governing integral formulation for non-equilibrium transport is given by equation (1) below:', {
    x: 54,
    y: 695,
    size: 11,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2)
  });

  // EXACT EQUATION PICTURE:
  // Source BBox: 223 pt width x 31 pt height
  // Placed at x = 72, y = 640 (PDF y-up from bottom -> topY = 792 - 640 - 31 = 121 pt from top)
  const eqW = 223;
  const eqH = 31;
  const eqX = 72;
  const eqY = 640;

  page.drawImage(embeddedPng, {
    x: eqX,
    y: eqY,
    width: eqW,
    height: eqH
  });

  // Paragraph 2: Following text after equation
  page.drawText('Where f(x) converges asymptotically as t approaches infinity for all positive parameter values.', {
    x: 54,
    y: 605,
    size: 11,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2)
  });

  // Concluding block
  page.drawText('Equation image preservation requires exact relationship registration and correct EMU extent.', {
    x: 54,
    y: 575,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3)
  });

  const pdfBytes = await doc.save();
  const outPath = path.resolve('scratch/batch3_equation_test_input.pdf');
  fs.writeFileSync(outPath, pdfBytes);
  console.log(`Generated fixture: ${outPath} (${pdfBytes.length} bytes) with equation image (${eqW}x${eqH} pt, ${pxW}x${pxH} px).`);
}

createBatch3Fixture().catch(console.error);
