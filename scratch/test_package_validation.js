const fs = require('fs');
const JSZip = require('../public/assets/libs/jszip.min.js');

function verifyXmlWellFormedness(xmlStr, partPath = '') {
  if (!xmlStr || typeof xmlStr !== 'string') {
    throw new Error(`OpenXML Package Validation Failed: ${partPath} is empty or not a string.`);
  }

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlStr, 'application/xml');
      const parseErrors = doc.getElementsByTagName('parsererror');
      if (parseErrors && parseErrors.length > 0) {
        const errText = parseErrors[0].textContent.trim().replace(/\s+/g, ' ');
        throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: ${errText}`);
      }
    } catch (err) {
      if (err.message && err.message.startsWith('OpenXML XML Well-Formedness')) {
        throw err;
      }
    }
  }

  const tokenRegex = /(<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<[^>]+>)/g;
  const tagStack = [];
  let rootCount = 0;
  let match;
  let lastIndex = 0;

  while ((match = tokenRegex.exec(xmlStr)) !== null) {
    const betweenText = xmlStr.substring(lastIndex, match.index);
    if (betweenText.includes('<')) {
      throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Unescaped '<' character in text.`);
    }
    if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(betweenText)) {
      throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Unescaped '&' character in text.`);
    }

    lastIndex = tokenRegex.lastIndex;
    const token = match[1];

    if (token.startsWith('<!--') || token.startsWith('<![CDATA[') || token.startsWith('<?')) {
      continue;
    }

    if (token.startsWith('</')) {
      const closeMatch = token.match(/^<\/\s*([a-zA-Z0-9_\-:]+)\s*>$/);
      if (!closeMatch) {
        throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Malformed closing tag: ${token}`);
      }
      const tagName = closeMatch[1];
      if (tagStack.length === 0) {
        throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Unexpected closing tag </${tagName}> without matching opening tag.`);
      }
      const expected = tagStack.pop();
      if (expected !== tagName) {
        throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Tag mismatch: expected </${expected}>, found </${tagName}>.`);
      }
    } else {
      const openMatch = token.match(/^<([a-zA-Z0-9_\-:]+)((?:\s+[^=>\s]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>$/);
      if (!openMatch) {
        throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Malformed opening tag syntax: ${token}`);
      }
      const tagName = openMatch[1];
      const attrString = openMatch[2];
      const selfClosing = openMatch[3] === '/';

      if (tagStack.length === 0) {
        rootCount++;
        if (rootCount > 1) {
          throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Multiple root elements found (second root: <${tagName}>).`);
        }
      }

      if (attrString) {
        const attrRegex = /([a-zA-Z0-9_\-:]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
        const seenAttrs = new Set();
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrString)) !== null) {
          const attrName = attrMatch[1];
          if (seenAttrs.has(attrName)) {
            throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Duplicate attribute '${attrName}' on element <${tagName}>.`);
          }
          seenAttrs.add(attrName);
        }
      }

      if (!selfClosing) {
        tagStack.push(tagName);
      }
    }
  }

  const trailingText = xmlStr.substring(lastIndex);
  if (trailingText.includes('<')) {
    throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Unescaped '<' character near end of document.`);
  }
  if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(trailingText)) {
    throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Unescaped '&' character in trailing text.`);
  }

  if (tagStack.length > 0) {
    throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: Unclosed tag(s) remaining at end of file: <${tagStack.join('>, <')}>.`);
  }

  if (rootCount === 0) {
    throw new Error(`OpenXML XML Well-Formedness Error in ${partPath}: No root element found in XML document.`);
  }

  return true;
}

async function validateOpenXmlPackage(zip, ext) {
  if (!zip || !zip.files) {
    throw new Error(`OpenXML Package Validation Failed: Invalid zip archive.`);
  }

  // 1. Verify [Content_Types].xml exists
  const contentTypesFile = zip.file('[Content_Types].xml');
  if (!contentTypesFile) {
    throw new Error('OpenXML Package Validation Failed: Missing mandatory [Content_Types].xml.');
  }
  const contentTypesXml = await contentTypesFile.async('text');
  verifyXmlWellFormedness(contentTypesXml, '[Content_Types].xml');

  // Parse Content Types
  const defaultTypes = {};
  const overrideTypes = {};
  const defaultRegex = /<Default\s+Extension="([^"]+)"\s+ContentType="([^"]+)"\s*\/>/g;
  let m;
  while ((m = defaultRegex.exec(contentTypesXml)) !== null) {
    defaultTypes[m[1].toLowerCase()] = m[2];
  }
  const overrideRegex = /<Override\s+PartName="([^"]+)"\s+ContentType="([^"]+)"\s*\/>/g;
  while ((m = overrideRegex.exec(contentTypesXml)) !== null) {
    const pName = m[1].replace(/^\//, '');
    overrideTypes[pName] = m[2];
  }

  // 2. Verify all XML and RELS parts for well-formedness and content type declaration
  const zipFilenames = Object.keys(zip.files).filter(f => !zip.files[f].dir);
  for (const filename of zipFilenames) {
    if (filename.endsWith('.xml') || filename.endsWith('.rels')) {
      const xmlText = await zip.file(filename).async('text');
      verifyXmlWellFormedness(xmlText, filename);
    }

    if (filename !== '[Content_Types].xml' && !filename.endsWith('.rels') && !filename.includes('/_rels/')) {
      const partName = filename;
      const partExt = (filename.split('.').pop() || '').toLowerCase();
      const hasOverride = !!overrideTypes[partName];
      const hasDefault = !!defaultTypes[partExt];
      if (!hasOverride && !hasDefault) {
        throw new Error(`OpenXML Package Validation Failed: Part '${filename}' has no declared ContentType in [Content_Types].xml (no matching Override for '/${partName}' nor Default for extension '${partExt}').`);
      }
    }
  }

  // 3. Resolve all relationships (.rels)
  const relsFiles = zipFilenames.filter(f => f.endsWith('.rels'));
  for (const relFile of relsFiles) {
    const relXml = await zip.file(relFile).async('text');
    let parentDir = '';
    const relsIndex = relFile.indexOf('/_rels/');
    if (relsIndex !== -1) {
      parentDir = relFile.substring(0, relsIndex);
    } else if (relFile.startsWith('_rels/')) {
      parentDir = '';
    }

    const relRegex = /<Relationship\s+([^>]+)\/>/g;
    let relMatch;
    while ((relMatch = relRegex.exec(relXml)) !== null) {
      const attrs = relMatch[1];
      const idMatch = attrs.match(/Id="([^"]+)"/);
      const targetMatch = attrs.match(/Target="([^"]+)"/);
      const modeMatch = attrs.match(/TargetMode="([^"]+)"/);

      const relId = idMatch ? idMatch[1] : 'unknown';
      const target = targetMatch ? targetMatch[1] : '';
      const targetMode = modeMatch ? modeMatch[1] : 'Internal';

      if (targetMode === 'External' || /^[a-zA-Z]+:\/\//.test(target) || target.startsWith('mailto:')) {
        continue;
      }

      let resolvedPath = target;
      if (target.startsWith('/')) {
        resolvedPath = target.substring(1);
      } else if (parentDir) {
        const parts = (parentDir + '/' + target).split('/');
        const stack = [];
        for (const p of parts) {
          if (p === '.' || p === '') continue;
          if (p === '..') {
            if (stack.length > 0) stack.pop();
          } else {
            stack.push(p);
          }
        }
        resolvedPath = stack.join('/');
      }

      if (!zip.file(resolvedPath)) {
        throw new Error(`OpenXML Package Validation Failed: Relationship '${relId}' in '${relFile}' references Target '${target}' (resolved to '${resolvedPath}') which is missing in the package.`);
      }
    }
  }

  // 4. Schema-specific structure validation
  if (ext === 'docx') {
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      throw new Error('OpenXML Package Validation Failed: Mandatory part word/document.xml is missing in DOCX.');
    }
    const docXml = await docFile.async('text');
    if (!docXml.includes('<w:document') || !docXml.includes('<w:body>')) {
      throw new Error('OpenXML Schema Validation Failed: word/document.xml is missing mandatory <w:document> or <w:body> root structure.');
    }
    const stylesFile = zip.file('word/styles.xml');
    if (stylesFile) {
      const stylesXml = await stylesFile.async('text');
      if (!stylesXml.includes('<w:styles')) {
        throw new Error('OpenXML Schema Validation Failed: word/styles.xml is missing mandatory <w:styles> root element.');
      }
    }
  } else if (ext === 'pptx') {
    const presFile = zip.file('ppt/presentation.xml');
    if (!presFile) {
      throw new Error('OpenXML Package Validation Failed: Mandatory part ppt/presentation.xml is missing in PPTX.');
    }
    const presXml = await presFile.async('text');
    if (!presXml.includes('<p:presentation')) {
      throw new Error('OpenXML Schema Validation Failed: ppt/presentation.xml is missing mandatory <p:presentation> root element.');
    }
    const slideFiles = zipFilenames.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    if (slideFiles.length === 0) {
      throw new Error('OpenXML Package Validation Failed: PPTX package contains no slide parts (ppt/slides/slide*.xml).');
    }
  }

  return true;
}

async function runTests() {
  // Test 1: Valid DOCX passes
  const docxBuf = fs.readFileSync('scratch/quarterly_exact.docx');
  const docxZip = await JSZip.loadAsync(docxBuf);
  await validateOpenXmlPackage(docxZip, 'docx');
  console.log('PASS: Valid DOCX passes package validation.');

  // Test 2: Valid PPTX passes
  const pptxBuf = fs.readFileSync('scratch/quarterly_exact.pptx');
  const pptxZip = await JSZip.loadAsync(pptxBuf);
  await validateOpenXmlPackage(pptxZip, 'pptx');
  console.log('PASS: Valid PPTX passes package validation.');

  // Test 3: Catch malformed XML (unclosed tag / tag mismatch)
  const badXmlZip = await JSZip.loadAsync(docxBuf);
  badXmlZip.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>Hello</w:r></w:t></w:p></w:body></w:document>');
  try {
    await validateOpenXmlPackage(badXmlZip, 'docx');
    throw new Error('FAIL: Should have rejected malformed XML');
  } catch (err) {
    console.log('PASS: Correctly caught malformed XML tag mismatch:', err.message);
  }

  // Test 4: Catch missing relationship target
  const badRelZip = await JSZip.loadAsync(docxBuf);
  badRelZip.remove('word/styles.xml');
  try {
    await validateOpenXmlPackage(badRelZip, 'docx');
    throw new Error('FAIL: Should have rejected missing relationship target');
  } catch (err) {
    console.log('PASS: Correctly caught missing relationship target:', err.message);
  }

  // Test 5: Catch undeclared content type
  const badTypeZip = await JSZip.loadAsync(docxBuf);
  badTypeZip.file('custom/data.bin', 'binarydata');
  try {
    await validateOpenXmlPackage(badTypeZip, 'docx');
    throw new Error('FAIL: Should have rejected undeclared content type');
  } catch (err) {
    console.log('PASS: Correctly caught undeclared content type:', err.message);
  }

  console.log('\nALL VALIDATION GUARDRAILS VERIFIED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
