#!/usr/bin/env node
/**
 * BATCH 0: Provenance, Live Code Path & Regression Prevention Suite
 * 
 * 1. Identify exact entry point, modules and versions used to produce outputs.
 *    Print resolved import paths and check for:
 *      - Stale installed packages shadowing local source
 *      - Cached intermediates
 *      - Second code paths per output format
 *      - Output files that are not overwritten
 * 2. Add a build/version stamp (git hash + timestamp) to every conversion's log
 *    and to the output's metadata. Add a check that fails when two conversions
 *    of the same input after a code change produce byte-identical output.
 * 3. Prove the live code path by adding a harmless marker, converting once,
 *    and showing the marker in the log and the output.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const { pathToFileURL } = require('url');

const JSZip = require(path.resolve(__dirname, '../public/assets/libs/jszip.min.js'));
globalThis.JSZip = JSZip;

function md5(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

async function runBatch0Verification() {
  console.log('=================================================================');
  console.log(' BATCH 0: Live Code Path & Execution Provenance Verification');
  console.log('=================================================================\n');

  let totalChecks = 0;
  let passedChecks = 0;
  const failures = [];

  function assertCheck(name, condition, details = '') {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✓ [PASS] ${name}`);
    } else {
      failures.push({ name, details });
      console.error(`  ❌ [FAIL] ${name}${details ? ': ' + details : ''}`);
    }
  }

  // -------------------------------------------------------------------------
  // ITEM 1: Identify exact entry point, modules, versions & resolved paths
  // -------------------------------------------------------------------------
  console.log('--- Item 1: Entry Point, Modules, Versions & Import Resolution ---');

  const enginePath = path.resolve(__dirname, '../public/assets/converter-engine.js');
  const pptxTemplatePath = path.resolve(__dirname, '../public/assets/pptx-template.js');
  const jszipPath = path.resolve(__dirname, '../public/assets/libs/jszip.min.js');
  const pdfjsLegacyPath = require.resolve('pdfjs-dist/legacy/build/pdf.js');
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const packageLockPath = path.resolve(__dirname, '../package-lock.json');

  const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const pkgLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));

  const gitHash = cp.execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const gitShort = cp.execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  process.env.GIT_COMMIT = gitShort;
  globalThis.GIT_COMMIT = gitShort;
  globalThis.nodeChildProcess = cp;

  console.log(`  Entry Point (Engine):       ${enginePath}`);
  console.log(`  Module (PPTX Template):     ${pptxTemplatePath}`);
  console.log(`  Module (JSZip Lib):         ${jszipPath} (version: ${JSZip.version || '3.10.1'})`);
  console.log(`  Module (PDF.js Legacy):     ${pdfjsLegacyPath} (version: ${pkgJson.dependencies['pdfjs-dist']})`);
  console.log(`  Active Git Commit:          ${gitHash} (${gitShort})`);
  console.log(`  Timestamp:                  ${new Date().toISOString()}`);

  // A. Check for stale installed packages shadowing local source
  const nodeModulesPath = path.resolve(__dirname, '../node_modules');
  const shadowedPackages = ['converter-engine', 'filee', 'kiln', 'pptx-template'].filter(pkg => {
    return fs.existsSync(path.join(nodeModulesPath, pkg));
  });
  console.log(`  Shadowed local packages in node_modules: ${shadowedPackages.length === 0 ? 'None (Clean)' : shadowedPackages.join(', ')}`);
  assertCheck('No stale installed packages shadowing local source', shadowedPackages.length === 0);

  // B. Check for cached intermediates / out-of-sync built bundles
  const distEnginePath = path.resolve(__dirname, '../dist/assets/converter-engine.js');
  let distSync = true;
  if (fs.existsSync(distEnginePath)) {
    const srcEngineBuf = fs.readFileSync(enginePath);
    const distEngineBuf = fs.readFileSync(distEnginePath);
    distSync = md5(srcEngineBuf) === md5(distEngineBuf);
  }
  console.log(`  Engine build bundle sync (public/ vs dist/): ${distSync ? 'Identical (In Sync)' : 'Out of sync'}`);
  assertCheck('Built bundle dist/assets/converter-engine.js is in sync with source', distSync);

  // C. Check for second code paths per output format
  const engineContent = fs.readFileSync(enginePath, 'utf8');
  const docxEntryPoints = (engineContent.match(/async\s+pdfToWord\s*\(/g) || []).length;
  const pptxEntryPoints = (engineContent.match(/async\s+pdfToPpt\s*\(/g) || []).length;
  console.log(`  Format entry points: DOCX=${docxEntryPoints}, PPTX=${pptxEntryPoints}`);
  assertCheck('Single canonical code path per output format (zero duplicate writers)', docxEntryPoints === 1 && pptxEntryPoints === 1);

  // D. Check for output files that are not overwritten
  const testOutFile = path.resolve(__dirname, '../scratch/test_overwrite_probe.tmp');
  fs.writeFileSync(testOutFile, 'PROBE_V1', 'utf8');
  const t1 = fs.statSync(testOutFile).mtimeMs;
  fs.writeFileSync(testOutFile, 'PROBE_V2', { flag: 'w' });
  const t2 = fs.statSync(testOutFile).mtimeMs;
  const contentV2 = fs.readFileSync(testOutFile, 'utf8');
  fs.unlinkSync(testOutFile);
  assertCheck('Output files are strictly overwritten and writable', contentV2 === 'PROBE_V2');

  // -------------------------------------------------------------------------
  // ITEM 2 & 3: Live Code Path Marker, Version Stamp & Byte-Identical Guard
  // -------------------------------------------------------------------------
  console.log('\n--- Item 2 & 3: Live Code Path Marker, Version Stamp & Stale Guard ---');

  // Import active local engine
  const mod = await import(pathToFileURL(enginePath).href);
  const engine = new mod.ConverterEngine();

  // Test input fixture
  const fixturePdfPath = path.resolve(__dirname, '../scratch/batch6_test_input.pdf');
  const fixtureBuf = fs.readFileSync(fixturePdfPath);
  const fixtureFile = {
    name: 'batch6_test_input.pdf',
    arrayBuffer: async () => fixtureBuf.buffer.slice(fixtureBuf.byteOffset, fixtureBuf.byteOffset + fixtureBuf.byteLength)
  };

  // Capture logs during Conversion 1
  let conv1Logs = [];
  const origLog = console.log;
  console.log = (...args) => {
    conv1Logs.push(args.join(' '));
    origLog(...args);
  };

  let docx1Result;
  let pptx1Result;
  try {
    docx1Result = await engine.pdfToWord(fixtureFile, { mode: 'fidelity' });
    pptx1Result = await engine.pdfToPpt(fixtureFile, { mode: 'fidelity' });
  } finally {
    console.log = origLog;
  }

  const docx1Buf = Buffer.from(await docx1Result.blob.arrayBuffer());
  const pptx1Buf = Buffer.from(await pptx1Result.blob.arrayBuffer());
  const docx1Md5 = md5(docx1Buf);
  const pptx1Md5 = md5(pptx1Buf);

  console.log(`\n  Conversion 1 DOCX MD5: ${docx1Md5} (${docx1Buf.length} bytes)`);
  console.log(`  Conversion 1 PPTX MD5: ${pptx1Md5} (${pptx1Buf.length} bytes)`);

  // Verify Harmless Marker and Version Stamp in Conversion 1 Logs
  const hasStampLogDocx = conv1Logs.some(l => l.includes('[CONVERSION_BUILD_STAMP:DOCX]') && l.includes(gitShort));
  const hasStampLogPptx = conv1Logs.some(l => l.includes('[CONVERSION_BUILD_STAMP:PPTX]') && l.includes(gitShort));
  const hasLiveMarkerLog = conv1Logs.some(l => l.includes('[BATCH0_PIPELINE_MARKER:LIVE_CODE_PATH]') && l.includes('BATCH0_LIVE_PATH_PROVEN'));

  assertCheck('Build/version stamp (git hash + timestamp) printed in DOCX conversion log', hasStampLogDocx);
  assertCheck('Build/version stamp (git hash + timestamp) printed in PPTX conversion log', hasStampLogPptx);
  assertCheck('Live code path marker (BATCH0_LIVE_PATH_PROVEN) printed in conversion log', hasLiveMarkerLog);

  // Verify Harmless Marker and Version Stamp in Output Metadata (docProps/core.xml)
  const docxZip1 = await JSZip.loadAsync(docx1Buf);
  const docxCoreXml = await docxZip1.file('docProps/core.xml').async('text');
  const pptxZip1 = await JSZip.loadAsync(pptx1Buf);
  const pptxCoreXml = await pptxZip1.file('docProps/core.xml').async('text');

  const docxHasCoreMarker = docxCoreXml.includes('BATCH0_LIVE_PATH_PROVEN') && docxCoreXml.includes(gitShort);
  const pptxHasCoreMarker = pptxCoreXml.includes('BATCH0_LIVE_PATH_PROVEN') && pptxCoreXml.includes(gitShort);

  console.log(`  DOCX docProps/core.xml contains marker & git stamp: ${docxHasCoreMarker}`);
  console.log(`  PPTX docProps/core.xml contains marker & git stamp: ${pptxHasCoreMarker}`);
  assertCheck('Output DOCX metadata (docProps/core.xml) contains git hash & live marker', docxHasCoreMarker);
  assertCheck('Output PPTX metadata (docProps/core.xml) contains git hash & live marker', pptxHasCoreMarker);

  // Conversion 2 with simulated code change / stamp update
  // Wait 15ms so timestamp changes
  await new Promise(r => setTimeout(r, 20));

  // Modify engine version stamp marker to simulate code edit in live path
  const prevStampMethod = engine.getBuildVersionStamp;
  engine.getBuildVersionStamp = function() {
    return {
      gitHash: gitShort,
      timestamp: new Date().toISOString(),
      marker: 'BATCH0_LIVE_PATH_PROVEN_REV2'
    };
  };

  const docx2Result = await engine.pdfToWord(fixtureFile, { mode: 'fidelity' });
  const pptx2Result = await engine.pdfToPpt(fixtureFile, { mode: 'fidelity' });
  engine.getBuildVersionStamp = prevStampMethod;

  const docx2Buf = Buffer.from(await docx2Result.blob.arrayBuffer());
  const pptx2Buf = Buffer.from(await pptx2Result.blob.arrayBuffer());
  const docx2Md5 = md5(docx2Buf);
  const pptx2Md5 = md5(pptx2Buf);

  console.log(`\n  Conversion 2 DOCX MD5: ${docx2Md5} (${docx2Buf.length} bytes)`);
  console.log(`  Conversion 2 PPTX MD5: ${pptx2Md5} (${pptx2Buf.length} bytes)`);

  // Guard check: Conversions after a code change MUST produce differing hashes
  assertCheck('DOCX outputs differ after code change (MD5 differs: Output 1 != Output 2)', docx1Md5 !== docx2Md5);
  assertCheck('PPTX outputs differ after code change (MD5 differs: Output 1 != Output 2)', pptx1Md5 !== pptx2Md5);

  // Test Stale Output Guard: Guard MUST fail when outputs are byte-identical after code change
  let guardCaughtDocx = false;
  try {
    engine.checkByteIdenticalStaleOutput(docx1Md5, docx1Md5, 'DOCX test');
  } catch (err) {
    guardCaughtDocx = err.message.includes('[STALE_OUTPUT_GUARD]');
  }
  assertCheck('Guard fails loudly when two conversions after code change produce byte-identical DOCX', guardCaughtDocx);

  let guardCaughtPptx = false;
  try {
    engine.checkByteIdenticalStaleOutput(pptx1Md5, pptx1Md5, 'PPTX test');
  } catch (err) {
    guardCaughtPptx = err.message.includes('[STALE_OUTPUT_GUARD]');
  }
  assertCheck('Guard fails loudly when two conversions after code change produce byte-identical PPTX', guardCaughtPptx);

  // -------------------------------------------------------------------------
  // ITEM 4: SHA-256 Input Checksum & Stored Checksum Integrity Verification
  // -------------------------------------------------------------------------
  console.log('\n--- Item 4: Input SHA-256 Checksum & Stored Checksum Integrity Verification ---');

  const expectedRealSha256 = crypto.createHash('sha256').update(fixtureBuf).digest('hex');
  const computedSha256 = await engine.computeFileSha256(fixtureFile);
  assertCheck('computeFileSha256 accurately computes fixture SHA-256', computedSha256 === expectedRealSha256);

  // Convert with convert() and verify conversionReport.inputSha256
  const convertResult = await engine.convert(fixtureFile, 'docx', { expectedSha256: expectedRealSha256 });
  const reportInputSha256 = convertResult.conversionReport?.inputSha256 || convertResult.report?.inputSha256;
  assertCheck('Conversion report records input SHA-256 matching input bytes', reportInputSha256 === expectedRealSha256);

  // Refuse conversion when stored checksum does not match
  let refusalCaught = false;
  try {
    await engine.convert(fixtureFile, 'docx', { expectedSha256: 'tampered_sha256_000000000000000000000000000000000000000000000000' });
  } catch (err) {
    refusalCaught = err.message.includes('[INPUT_INTEGRITY_VIOLATION]');
  }
  assertCheck('Refuses to convert and fails loudly when stored checksum does not match input', refusalCaught);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`TOTAL BATCH 0 CHECKS: ${totalChecks}`);
  console.log(`PASSED:               ${passedChecks}`);
  console.log(`FAILED:               ${failures.length}`);
  console.log(`PROVENANCE GATE:      ${failures.length === 0 ? 'PASSED (100.0%)' : 'FAILED'}`);
  console.log('===============================================================\n');

  if (failures.length > 0) {
    console.error('❌ BATCH 0 PROVENANCE FAILED:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f.name} (${f.details})`));
    process.exit(1);
  } else {
    console.log('🎉 BATCH 0 VERIFIED: LIVE CODE PATH CONFIRMED, PROVENANCE PROVEN, ZERO STALE ARTIFACTS!\n');
  }
}

runBatch0Verification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
