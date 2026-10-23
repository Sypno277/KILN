const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const { pathToFileURL } = require('url');

async function testAnalyzer() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;

  const bytes = fs.readFileSync('scratch/batch2_format_test_input.pdf');
  const fileObj = { name: 'batch2_format_test_input.pdf', size: bytes.length, arrayBuffer: async () => bytes.buffer };
  const pages = await engine.extractPdfPagesContent(fileObj);
  const page = pages[0];
  const lines = page.lines;

  const pageWidth = page.pageWidth || 612;
  const pageHeight = page.pageHeight || 792;
  const baseMargin = 72; // Left/Right margin in pt
  const colRight = pageWidth - baseMargin; // 540 pt
  const colCenter = pageWidth / 2; // 306 pt

  // Group lines into logical paragraphs
  const paragraphs = [];
  let curPara = null;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const x0 = l.leftX;
    const rightEdge = x0 + l.width;
    const fontSize = l.fontSize || 10;
    const isHeading = l.isHeading || fontSize >= 13;

    // Line gap from previous line
    let lineGap = 0;
    if (i > 0) {
      const prevLine = lines[i - 1];
      const prevBottom = prevLine.topY + (prevLine.fontSize || 10);
      lineGap = Math.max(0, l.topY - prevBottom);
    }

    // List marker check: "1.", "a.", "1)", etc.
    // If line is heading, don't treat as list marker
    const markerMatch = !isHeading ? l.text.match(/^(\d+\.|\d+\)|[a-zA-Z]\.|\([a-zA-Z]\)|•|–|—|-|\*)\s+/) : null;
    const hasMarker = !!markerMatch;

    let startsNewPara = false;
    let isHangingContinuation = false;
    let isFirstLineIndentContinuation = false;

    if (!curPara) {
      startsNewPara = true;
    } else {
      const prevLine = curPara.lines[curPara.lines.length - 1];
      const prevX0 = prevLine.leftX;

      // Check if this line is a continuation line for hanging indent or first-line indent
      if (curPara.isList && Math.abs(x0 - curPara.listTextX) <= 3 && lineGap <= 6) {
        isHangingContinuation = true;
      } else if (curPara.isFirstLineIndent && Math.abs(x0 - baseMargin) <= 3 && lineGap <= 6) {
        isFirstLineIndentContinuation = true;
      }

      if (isHeading || curPara.isHeading) {
        startsNewPara = true;
      } else if (hasMarker) {
        startsNewPara = true;
      } else if (curPara.isRightAligned && Math.abs(rightEdge - colRight) <= 4 && lineGap <= 6) {
        // Multi-line right-aligned block continuation
        startsNewPara = false;
      } else if (curPara.isFixedBlock && Math.abs(x0 - prevX0) <= 2 && lineGap <= 6 && l.width < 250) {
        // Multi-line address/signature fixed block continuation
        startsNewPara = false;
      } else if (lineGap >= 7.0 && !isHangingContinuation && !isFirstLineIndentContinuation) {
        startsNewPara = true;
      } else if (Math.abs(x0 - prevX0) > 3 && !isHangingContinuation && !isFirstLineIndentContinuation) {
        // Indent changed
        if (l.text.startsWith('Explanation:') && Math.abs(x0 - (baseMargin + 18)) <= 3) {
          startsNewPara = true;
        } else if (curPara.lines.length === 1 && curPara.isList && isHangingContinuation) {
          startsNewPara = false;
        } else {
          startsNewPara = true;
        }
      }
    }

    if (startsNewPara) {
      // Finalize previous paragraph properties
      if (curPara) {
        finalizeParagraph(curPara, colCenter, colRight, baseMargin);
        paragraphs.push(curPara);
      }

      // Check if starting a list
      let listTextX = x0;
      if (hasMarker) {
        listTextX = x0 + 18;
      }

      const isFirstLineIndent = l.text.startsWith('Explanation:') && Math.abs(x0 - (baseMargin + 18)) <= 3;
      const isRightAligned = Math.abs(rightEdge - colRight) <= 4 && (colRight - x0) < 300;
      const isFixedBlock = l.width < 200 && Math.abs(x0 - baseMargin) <= 2 && !hasMarker && !isHeading;

      curPara = {
        id: paragraphs.length + 1,
        lines: [l],
        gapBeforePt: lineGap,
        isHeading,
        isList: hasMarker,
        listMarker: markerMatch ? markerMatch[1] : null,
        listTextX,
        isFirstLineIndent,
        isRightAligned,
        isFixedBlock
      };
    } else {
      curPara.lines.push(l);
    }
  }

  if (curPara) {
    finalizeParagraph(curPara, colCenter, colRight, baseMargin);
    paragraphs.push(curPara);
  }

  function finalizeParagraph(p, colCenter, colRight, baseMargin) {
    const firstLine = p.lines[0];
    p.fontSize = firstLine.fontSize || 10;
    p.fontFamily = firstLine.fontFamily || 'Arial';

    // 1. Determine Alignment (Left / Center / Right / Both)
    let alignment = 'left';
    const isSingleLine = p.lines.length === 1;

    // Check Center
    const lineCenter = (firstLine.leftX + firstLine.leftX + firstLine.width) / 2;
    if (isSingleLine && Math.abs(lineCenter - colCenter) <= 4 && firstLine.leftX > baseMargin + 15) {
      alignment = 'center';
    }
    // Check Right
    else if (p.lines.every(l => Math.abs((l.leftX + l.width) - colRight) <= 4) && firstLine.leftX > baseMargin + 20) {
      alignment = 'right';
    }
    // Check Justified (Both)
    else if (p.lines.length >= 2) {
      const nonLastLines = p.lines.slice(0, -1);
      const isJust = nonLastLines.every(l => (l.leftX + l.width) >= colRight - 8 && Math.abs(l.leftX - baseMargin) <= 3);
      if (isJust) alignment = 'both';
    }
    p.alignment = alignment;

    // 2. Determine Indents (in twips, 1 pt = 20 twips)
    let leftIndentTwips = 0;
    let hangingTwips = 0;
    let firstLineTwips = 0;

    if (p.isHeading) {
      leftIndentTwips = 0;
      hangingTwips = 0;
      firstLineTwips = 0;
    } else if (p.isList && p.lines.length >= 2) {
      // Hanging indent: base left is continuation line position
      const contX = p.lines[1].leftX;
      leftIndentTwips = Math.round(Math.max(0, contX - baseMargin) * 20);
      hangingTwips = Math.round(Math.max(0, contX - firstLine.leftX) * 20);
    } else if (p.isList && p.lines.length === 1) {
      // Single line list item
      leftIndentTwips = Math.round(Math.max(0, (firstLine.leftX + 18) - baseMargin) * 20);
      hangingTwips = Math.round(18 * 20);
    } else if (p.isFirstLineIndent) {
      // First line indented, continuation at base margin
      leftIndentTwips = 0;
      firstLineTwips = Math.round(Math.max(0, firstLine.leftX - baseMargin) * 20);
    } else if (alignment === 'left' && firstLine.leftX > baseMargin) {
      // Block indent (Level 2/3/4)
      leftIndentTwips = Math.round((firstLine.leftX - baseMargin) * 20);
    }

    p.leftIndentTwips = leftIndentTwips;
    p.hangingTwips = hangingTwips;
    p.firstLineTwips = firstLineTwips;

    // 3. Spacing (in twips)
    p.spacingBeforeTwips = Math.round(p.gapBeforePt * 20);
    p.spacingAfterTwips = 0;

    // 4. Line break mode: preserve hard break if fixed block or right-aligned
    p.preserveHardLineBreaks = p.isFixedBlock || p.isRightAligned;
  }

  // Calculate spacing after for each paragraph (distance to next paragraph)
  for (let i = 0; i < paragraphs.length - 1; i++) {
    paragraphs[i].spacingAfterTwips = paragraphs[i + 1].spacingBeforeTwips;
  }

  console.log(`=== Grouped into ${paragraphs.length} Logical Paragraphs ===\n`);
  console.log('--------------------------------------------------------------------------------------------------------------------------------');
  console.log('ID | Lines | Alignment | LeftInd (twips/pt) | Hang (twips/pt) | FirstLine (twips/pt) | SpaceBef (pt) | KeepNext | Text Preview');
  console.log('--------------------------------------------------------------------------------------------------------------------------------');
  for (const p of paragraphs) {
    const leftStr = `${p.leftIndentTwips} (${(p.leftIndentTwips / 20).toFixed(1)}pt)`.padEnd(18);
    const hangStr = p.hangingTwips ? `${p.hangingTwips} (${(p.hangingTwips / 20).toFixed(1)}pt)`.padEnd(15) : '0              ';
    const flStr = p.firstLineTwips ? `${p.firstLineTwips} (${(p.firstLineTwips / 20).toFixed(1)}pt)`.padEnd(20) : '0                   ';
    const befStr = `${(p.spacingBeforeTwips / 20).toFixed(1)}pt`.padEnd(13);
    const knStr = p.isHeading ? 'Yes     ' : 'No      ';
    const preview = p.lines.map(l => l.text).join(' ').slice(0, 40);
    console.log(
      `${String(p.id).padStart(2)} | ` +
      `${String(p.lines.length).padStart(5)} | ` +
      `${p.alignment.padEnd(9)} | ` +
      `${leftStr} | ` +
      `${hangStr} | ` +
      `${flStr} | ` +
      `${befStr} | ` +
      `${knStr} | ` +
      `${preview}`
    );
  }
  console.log('--------------------------------------------------------------------------------------------------------------------------------\n');
}

testAnalyzer();
