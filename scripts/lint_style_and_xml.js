#!/usr/bin/env node
/**
 * Guardrail Lint: Explicit Font Families & Structured XML Serialization
 *
 * Enforces BATCH 6 Rule 5:
 * 1. Fail the build if a writer emits a text run without an explicit font family.
 * 2. Fail the build if any OpenXML is built by manual string concatenation.
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const TARGET_FILE = path.resolve(__dirname, '../public/assets/converter-engine.js');

async function runLint() {
  console.log('--- Running Guardrail Lint: Style Fidelity & XML Serialization ---');
  let failures = [];

  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`Target file does not exist: ${TARGET_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(TARGET_FILE, 'utf8');
  const lines = content.split('\n');

  // 1. Static Scan: Ensure run serializers explicitly define fallback fonts and always emit them
  const docxRunMethod = content.substring(content.indexOf('buildDocxRunXml('), content.indexOf('buildDocxParagraphXml('));
  if (!docxRunMethod.includes('w:rFonts') || !docxRunMethod.includes('fontFamily ||')) {
    failures.push(`buildDocxRunXml() does not guarantee an explicit fallback font family for all emitted runs.`);
  }

  const pptxRunMethod = content.substring(content.indexOf('buildPptxRunXml('), content.indexOf('rgbaToPng('));
  if (!pptxRunMethod.includes('a:latin') || !pptxRunMethod.includes('fontFamily ||')) {
    failures.push(`buildPptxRunXml() does not guarantee an explicit fallback font family for all emitted runs.`);
  }

  // 2. Dynamic Verification: Instantiate engine and assert emitted run XML contains explicit fonts
  try {
    const mod = await import(pathToFileURL(TARGET_FILE).href);
    const engine = new mod.ConverterEngine();

    // Test DOCX run without fontFamily specified
    const bareDocxRun = engine.buildDocxRunXml({ text: 'sample without font' });
    if (!bareDocxRun.includes('<w:rFonts') || !bareDocxRun.includes('w:ascii=')) {
      failures.push(`buildDocxRunXml emitted text run without explicit w:rFonts font family: ${bareDocxRun}`);
    }

    // Test PPTX run without fontFamily specified
    const barePptxRun = engine.buildPptxRunXml({ text: 'sample without font' });
    if (!barePptxRun.includes('<a:latin') || !barePptxRun.includes('typeface=')) {
      failures.push(`buildPptxRunXml emitted text run without explicit a:latin typeface: ${barePptxRun}`);
    }
  } catch (err) {
    failures.push(`Failed to dynamically verify run serializers: ${err.message}`);
  }

  // 3. Scan for forbidden raw string concatenation of XML in writer methods
  const FORBIDDEN_XML_CONCAT_PATTERNS = [
    /\+=\s*`\s*<w:p>/,
    /\+=\s*`\s*<w:sectPr>/,
    /\+=\s*`\s*<w:drawing>/,
    /\+=\s*`\s*<p:sp>/,
    /\+=\s*`\s*<p:pic>/,
    /shapeTreeXml\s*\+=\s*`\s*</,
    /wordBody\s*\+=\s*`\s*</
  ];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    for (const pat of FORBIDDEN_XML_CONCAT_PATTERNS) {
      if (pat.test(line)) {
        failures.push(`Line ${lineNum}: Raw XML built by string concatenation detected: "${line.trim()}". Use structured xmlElement() / serializer.`);
      }
    }
  });

  // 4. XML Guard: Child-order check for every a:rPr, a:pPr, and w:rPr
  try {
    const JSZip = require(path.resolve(__dirname, '../public/assets/libs/jszip.min.js'));
    const pptxPath = path.resolve(__dirname, '../scratch/batch6_output.pptx');
    const docxPath = path.resolve(__dirname, '../scratch/batch6_output.docx');

    if (fs.existsSync(pptxPath)) {
      const pptxBuf = fs.readFileSync(pptxPath);
      const zip = await JSZip.loadAsync(pptxBuf);
      const slideXml = await zip.file('ppt/slides/slide1.xml').async('text');

      const ARPR_ORDER = {
        'ln': 1,
        'noFill': 2, 'solidFill': 2, 'gradFill': 2, 'blipFill': 2, 'pattFill': 2, 'grpFill': 2,
        'effectLst': 3, 'effectDag': 3,
        'highlight': 4,
        'uLnTx': 5, 'uLn': 5, 'uFillTx': 5, 'uFill': 5,
        'latin': 6, 'ea': 6, 'cs': 6, 'sym': 6,
        'hlinkClick': 7, 'hlinkMouseOver': 7, 'rtl': 7,
        'extLst': 8
      };

      const rPrRegex = /<a:rPr\b([^>]*)>([\s\S]*?)<\/a:rPr>/g;
      let m;
      while ((m = rPrRegex.exec(slideXml)) !== null) {
        const inner = m[2];
        const tags = Array.from(inner.matchAll(/<a:([A-Za-z0-9_]+)\b/g)).map(t => t[1]);
        let maxOrder = 0;
        for (const tag of tags) {
          const ord = ARPR_ORDER[tag];
          if (ord !== undefined) {
            if (ord < maxOrder) {
              failures.push(`XML Guard Violation: In <a:rPr>, element <a:${tag}> (order ${ord}) appeared after an element of order ${maxOrder}. Violates ECMA-376 schema order.`);
            }
            maxOrder = Math.max(maxOrder, ord);
          }
        }
      }
    }

    if (fs.existsSync(docxPath)) {
      const docxBuf = fs.readFileSync(docxPath);
      const zip = await JSZip.loadAsync(docxBuf);
      const docXml = await zip.file('word/document.xml').async('text');

      const WRPR_ORDER = {
        'rFonts': 1,
        'b': 2, 'bCs': 2,
        'i': 3, 'iCs': 3,
        'strike': 4,
        'color': 5,
        'sz': 6, 'szCs': 6,
        'shd': 7, 'highlight': 7,
        'u': 8,
        'vertAlign': 9
      };

      const wRPrRegex = /<w:rPr\b([^>]*)>([\s\S]*?)<\/w:rPr>/g;
      let wm;
      while ((wm = wRPrRegex.exec(docXml)) !== null) {
        const inner = wm[2];
        const tags = Array.from(inner.matchAll(/<w:([A-Za-z0-9_]+)\b/g)).map(t => t[1]);
        let maxOrder = 0;
        for (const tag of tags) {
          const ord = WRPR_ORDER[tag];
          if (ord !== undefined) {
            if (ord < maxOrder) {
              failures.push(`XML Guard Violation: In <w:rPr>, element <w:${tag}> (order ${ord}) appeared after an element of order ${maxOrder}. Violates ECMA-376 schema order.`);
            }
            maxOrder = Math.max(maxOrder, ord);
          }
        }
      }
    }
  } catch (xmlGuardErr) {
    failures.push(`XML Guard execution failed: ${xmlGuardErr.message}`);
  }

  if (failures.length > 0) {
    console.error('\n❌ BUILD FAILED: Style Fidelity & XML Serialization lint failed:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    console.error('\nRule: "Writers must emit explicit font families on all runs and serialize XML structurally without string concatenation."\n');
    process.exit(1);
  } else {
    console.log('✓ PASS: Style Fidelity & XML Serialization verified.');
    console.log('  - All DOCX and PPTX text runs emit explicit font families.');
    console.log('  - Zero manual XML string concatenations detected in document writers.\n');
  }
}

if (require.main === module) {
  runLint().catch(err => {
    console.error('Lint runner failed:', err);
    process.exit(1);
  });
}

module.exports = { runLint };
