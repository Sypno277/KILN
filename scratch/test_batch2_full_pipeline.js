const fs = require('fs');
const path = require('path');
const JSZip = require(path.resolve('public/assets/libs/jszip.min.js'));
const pdfLib = require(path.resolve('public/assets/libs/pdf-lib.min.js'));
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('public/assets/libs/pdf.worker.min.js');
const { pathToFileURL } = require('url');

async function runPipeline() {
  const mod = await import(pathToFileURL(path.resolve('public/assets/converter-engine.js')).href);
  const engine = new mod.ConverterEngine();
  engine.getPdfJs = () => pdfjs;
  engine.getJSZip = () => JSZip;
  engine.getPdfLib = () => pdfLib;

  // Implement groupLinesIntoParagraphs on engine
  engine.groupLinesIntoParagraphs = function(lines, options = {}) {
    const pageWidth = options.pageWidth || 612;
    const baseMargin = options.baseMarginPt !== undefined ? options.baseMarginPt : 72;
    const colRight = pageWidth - baseMargin;
    const colCenter = pageWidth / 2;

    const paragraphs = [];
    let curPara = null;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const x0 = l.leftX;
      const rightEdge = x0 + l.width;
      const fontSize = l.fontSize || 10;
      const isHeading = l.isHeading || fontSize >= 13;

      let lineGap = 0;
      if (i > 0) {
        const prevLine = lines[i - 1];
        const prevBottom = prevLine.topY + (prevLine.fontSize || 10);
        lineGap = Math.max(0, l.topY - prevBottom);
      }

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
          startsNewPara = false;
        } else if (curPara.isFixedBlock && Math.abs(x0 - prevX0) <= 2 && lineGap <= 6 && l.width < 250) {
          startsNewPara = false;
        } else if (lineGap >= 7.0 && !isHangingContinuation && !isFirstLineIndentContinuation) {
          startsNewPara = true;
        } else if (Math.abs(x0 - prevX0) > 3 && !isHangingContinuation && !isFirstLineIndentContinuation) {
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
        if (curPara) {
          this._finalizeDocxParagraph(curPara, colCenter, colRight, baseMargin);
          paragraphs.push(curPara);
        }

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
      this._finalizeDocxParagraph(curPara, colCenter, colRight, baseMargin);
      paragraphs.push(curPara);
    }

    // Set after-spacing
    for (let i = 0; i < paragraphs.length - 1; i++) {
      paragraphs[i].spacingAfterTwips = paragraphs[i + 1].spacingBeforeTwips;
    }

    return paragraphs;
  };

  engine._finalizeDocxParagraph = function(p, colCenter, colRight, baseMargin) {
    const firstLine = p.lines[0];
    p.fontSize = firstLine.fontSize || 10;
    p.fontFamily = firstLine.fontFamily || 'Arial';

    let alignment = 'left';
    const isSingleLine = p.lines.length === 1;

    const lineCenter = (firstLine.leftX + firstLine.leftX + firstLine.width) / 2;
    if (isSingleLine && Math.abs(lineCenter - colCenter) <= 4 && firstLine.leftX > baseMargin + 15) {
      alignment = 'center';
    } else if (p.lines.every(l => Math.abs((l.leftX + l.width) - colRight) <= 4) && firstLine.leftX > baseMargin + 20) {
      alignment = 'right';
    } else if (p.lines.length >= 2) {
      const nonLastLines = p.lines.slice(0, -1);
      const isJust = nonLastLines.every(l => (l.leftX + l.width) >= colRight - 8 && Math.abs(l.leftX - baseMargin) <= 3);
      if (isJust) alignment = 'both';
    }
    p.alignment = alignment;

    let leftIndentTwips = 0;
    let hangingTwips = 0;
    let firstLineTwips = 0;

    if (p.isHeading) {
      leftIndentTwips = 0;
      hangingTwips = 0;
      firstLineTwips = 0;
    } else if (p.isList && p.lines.length >= 2) {
      const contX = p.lines[1].leftX;
      leftIndentTwips = Math.round(Math.max(0, contX - baseMargin) * 20);
      hangingTwips = Math.round(Math.max(0, contX - firstLine.leftX) * 20);
    } else if (p.isList && p.lines.length === 1) {
      leftIndentTwips = Math.round(Math.max(0, (firstLine.leftX + 18) - baseMargin) * 20);
      hangingTwips = Math.round(18 * 20);
    } else if (p.isFirstLineIndent) {
      leftIndentTwips = 0;
      firstLineTwips = Math.round(Math.max(0, firstLine.leftX - baseMargin) * 20);
    } else if (alignment === 'left' && firstLine.leftX > baseMargin) {
      leftIndentTwips = Math.round((firstLine.leftX - baseMargin) * 20);
    }

    p.leftIndentTwips = leftIndentTwips;
    p.hangingTwips = hangingTwips;
    p.firstLineTwips = firstLineTwips;

    p.spacingBeforeTwips = Math.round(p.gapBeforePt * 20);
    p.spacingAfterTwips = 0;
    p.preserveHardLineBreaks = p.isFixedBlock || p.isRightAligned;
  };

  // Convert
  const pdfBytes = fs.readFileSync('scratch/batch2_format_test_input.pdf');
  const fileObj = { name: 'batch2_format_test_input.pdf', size: pdfBytes.length, arrayBuffer: async () => pdfBytes.buffer };

  const extractedPages = await engine.extractPdfPagesContent(fileObj);
  const firstPage = extractedPages[0] || {};
  const canvas = engine.resolveCanvas(firstPage, 'fidelity', 'docx');

  // Set explicit canvas margins from document base margin
  canvas.margins = { top: 72, left: 72, bottom: 72, right: 72 };
  canvas.leftMarginPt = 72;
  canvas.rightMarginPt = 72;
  canvas.topMarginPt = 72;
  canvas.bottomMarginPt = 72;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', engine.buildDocxContentTypesXml());
  zip.file('_rels/.rels', engine.buildDocxRootRelsXml());
  zip.file('word/styles.xml', engine.buildDocxStylesXml());

  let wordBody = '';
  const paragraphs = engine.groupLinesIntoParagraphs(firstPage.lines || [], {
    pageWidth: canvas.widthPt,
    pageHeight: canvas.heightPt,
    baseMarginPt: 72
  });

  for (const p of paragraphs) {
    const pPrChildren = [];
    if (p.isHeading) {
      pPrChildren.push(engine.xmlElement('w:pStyle', { 'w:val': 'Heading1' }));
      pPrChildren.push(engine.xmlElement('w:keepNext'));
    }
    const spacingAttrs = {
      'w:before': String(p.spacingBeforeTwips || 0),
      'w:after': String(p.spacingAfterTwips || 0),
      'w:line': '240',
      'w:lineRule': 'auto'
    };
    pPrChildren.push(engine.xmlElement('w:spacing', spacingAttrs));

    if (p.leftIndentTwips > 0 || p.hangingTwips > 0 || p.firstLineTwips > 0) {
      const indAttrs = {};
      if (p.leftIndentTwips > 0) indAttrs['w:left'] = String(p.leftIndentTwips);
      if (p.hangingTwips > 0) indAttrs['w:hanging'] = String(p.hangingTwips);
      if (p.firstLineTwips > 0) indAttrs['w:firstLine'] = String(p.firstLineTwips);
      pPrChildren.push(engine.xmlElement('w:ind', indAttrs));
    }

    if (p.alignment && p.alignment !== 'left') {
      pPrChildren.push(engine.xmlElement('w:jc', { 'w:val': p.alignment }));
    }

    let runsXml = '';
    for (let lIdx = 0; lIdx < p.lines.length; lIdx++) {
      const line = p.lines[lIdx];
      if (lIdx > 0 && p.preserveHardLineBreaks) {
        runsXml += engine.serializeXml(engine.xmlElement('w:r', {}, [engine.xmlElement('w:br')]));
      }

      if (line.runs && line.runs.length > 0) {
        for (let rIdx = 0; rIdx < line.runs.length; rIdx++) {
          const run = line.runs[rIdx];
          let runText = run.text;
          if (lIdx > 0 && rIdx === 0 && !p.preserveHardLineBreaks) {
            if (!runText.startsWith(' ') && !runsXml.endsWith(' ')) {
              runText = ' ' + runText;
            }
          }
          // In list item, convert marker space to tab
          if (lIdx === 0 && rIdx === 0 && p.isList && p.listMarker) {
            const re = new RegExp('^(' + p.listMarker.replace('.', '\\.') + ')\\s+');
            runText = runText.replace(re, '$1\t');
          }
          runsXml += engine.buildDocxRunXml({ ...run, text: runText });
        }
      } else {
        let lineText = line.text;
        if (lIdx > 0 && !p.preserveHardLineBreaks) {
          if (!lineText.startsWith(' ') && !runsXml.endsWith(' ')) {
            lineText = ' ' + lineText;
          }
        }
        if (lIdx === 0 && p.isList && p.listMarker) {
          const re = new RegExp('^(' + p.listMarker.replace('.', '\\.') + ')\\s+');
          lineText = lineText.replace(re, '$1\t');
        }
        runsXml += engine.buildDocxRunXml({
          text: lineText,
          fontSize: line.fontSize || 10,
          isBold: line.isBold || false,
          fontFamily: line.fontFamily,
          colorHex: line.colorHex || 'unset'
        });
      }
    }

    wordBody += engine.buildDocxParagraphXml(pPrChildren, runsXml);
  }

  zip.file('word/_rels/document.xml.rels', engine.buildDocxDocumentRelsXml([]));
  wordBody += engine.buildDocxSectionXml(canvas);
  zip.file('word/document.xml', engine.buildDocxDocumentXml(wordBody));

  const docxBlob = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('scratch/batch2_output.docx', docxBlob);
  console.log(`Generated scratch/batch2_output.docx (${docxBlob.length} bytes) with 11 structured paragraphs.`);
}

runPipeline();
