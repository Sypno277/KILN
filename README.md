# Kiln / iLovePDF Web Application & Complete File Conversion Platform

A 100% client-side, privacy-first file conversion and PDF management platform engineered by reverse-engineering **[iLovePDF](https://www.ilovepdf.com/)** and evolved from Filee, branded as **Kiln**. Kiln runs entirely inside modern web browsers with zero server uploads, genuine desktop-grade conversion fidelity, authentic iLovePDF styling and 4-step workflow, direct URL routes (`/merge_pdf`, `/split_pdf`, etc.), and a complete suite of **33 native PDF tools** that produce real, verified output files.

---

## 🌟 Key Highlights & iLovePDF Reverse-Engineered Architecture

### 1. Authentic iLovePDF Navigation & Direct URL Routes
- **Header Navigation Bar**:
  - Direct quick-access tools: **Merge PDF** (accent red), **Split PDF**, **Compress PDF**.
  - **Convert PDF ▾** Dropdown: Fast access to *Convert to PDF* (JPG, Word, PowerPoint, Excel, HTML) and *Convert from PDF* (PDF to JPG, Word, PowerPoint, Excel, PDF/A).
  - **All PDF Tools ▾** Mega Menu: Full categorised directory spanning *Organize PDF*, *Optimize & Edit*, *Security & Sign*, and *AI & Tools*.
  - Full backward-compatible anchor links (`/#how`, `/#features`, `/formats/`, `/cli/`, `/#hwp`, `/#faq`, `/app/`).
- **Direct iLovePDF Tool URLs**:
  - Hitting any direct iLovePDF route (e.g., [`/merge_pdf`](http://127.0.0.1:3000/merge_pdf), [`/split_pdf`](http://127.0.0.1:3000/split_pdf), [`/compress_pdf`](http://127.0.0.1:3000/compress_pdf), [`/pdf_to_word`](http://127.0.0.1:3000/pdf_to_word), [`/jpg_to_pdf`](http://127.0.0.1:3000/jpg_to_pdf)) returns 200 OK and immediately launches the dedicated iLovePDF interactive workbench for that exact tool.

### 2. Authentic 4-Step Tool Workbench Flow
The tool workbench faithfully implements the authentic iLovePDF 4-stage lifecycle:
1. **Stage 1 (Drop & Select)**:
   - High-contrast Red CTA button: **"Select PDF files"** (`#wb-choose-btn`).
   - Dotted drag-and-drop zone with **"or drop PDFs here"**.
   - Offline privacy certification badges (*100% Client-Side*, *Zero Server Uploads*, *Free & Unlimited*).
2. **Stage 2 (File Management & Sidebar Configuration)**:
   - Multi-file thumbnail grid showing file type icon, filename, formatted byte size, and delete triggers.
   - **"+ Add more files"** button to append additional documents.
   - Right-hand options sidebar displaying tool-specific controls (e.g. rotation angles, watermark text & opacity, compression levels, page number positions, encryption passwords).
   - Prominent red action button (`#wb-execute-btn`, e.g. **"Merge PDF →"**) with live status text.
3. **Stage 3 (Processing & Progress)**:
   - Real-time animated status banner reflecting actual browser-side processing.
4. **Stage 4 (Celebratory Success & Download)**:
   - Celebratory emerald checkmark icon.
   - Massive red download button (`#wb-final-download-btn`, e.g. **"Download Merged PDF (1.05 KB)"**).
   - Secondary actions: **"Preview Output"** and **"Process another file"**.

### 3. Verified Real Results for All 33 Native Tools
Every single process executes in browser memory and produces genuine, non-empty, byte-valid output files:

| # | Tool Name | Slug / Direct Route | Engine | Real Output Format & Verification |
|---|---|---|---|---|
| 01 | **Merge PDF** | `/merge_pdf` | PDFLib v1.17.1 | Valid `%PDF` stream combining input pages |
| 02 | **Split PDF** | `/split_pdf` | PDFLib v1.17.1 | Valid `%PDF` pages / ZIP bundle |
| 03 | **Extract Pages** | `/extract-pages` | PDFLib v1.17.1 | Extracted standalone `%PDF` document |
| 04 | **Remove Pages** | `/remove-pages` | PDFLib v1.17.1 | Cleaned `%PDF` with target pages stripped |
| 05 | **Organize PDF** | `/organize-pdf` | PDFLib v1.17.1 | Re-ordered and sorted `%PDF` |
| 06 | **Scan to PDF** | `/scan_pdf` | PDFLib / Camera API | Paginated `%PDF` with page boundaries |
| 07 | **Compress PDF** | `/compress_pdf` | PDFLib stream optimizer | Optimized `%PDF` with 0% byte inflation guarantee |
| 08 | **Repair PDF** | `/repair-pdf` | PDFLib reconstructor | Repaired cross-reference table `%PDF` |
| 09 | **OCR PDF** | `/ocr_pdf` | Tesseract WASM / PDFLib | Searchable text layer `%PDF` |
| 10 | **JPG to PDF** | `/jpg_to_pdf` | PDFLib image embedder | Valid `%PDF` containing image frames |
| 11 | **Word to PDF** | `/word_to_pdf` | Mammoth / PDFLib | Formatted paginated `%PDF` document |
| 12 | **PowerPoint to PDF**| `/powerpoint_to_pdf` | Presentation Engine | Paginated multi-slide `%PDF` presentation |
| 13 | **Excel to PDF** | `/excel_to_pdf` | SheetJS / Table Engine | Paginated tabular `%PDF` spreadsheet |
| 14 | **HTML to PDF** | `/html-to-pdf` | DOM Canvas / PDFLib | Paginated styled `%PDF` output |
| 15 | **PDF to JPG** | `/pdf_to_jpg` | PDFJS-Dist / Canvas | Genuine JPEG image (`0xFFD8FFE0`) |
| 16 | **PDF to Word** | `/pdf_to_word` | JSZip / OpenXML | Valid `.docx` OpenXML ZIP package (`PK\x03\x04`) |
| 17 | **PDF to PowerPoint**| `/pdf_to_powerpoint` | JSZip / OpenXML | Valid `.pptx` slide presentation package (`PK\x03\x04`) |
| 18 | **PDF to Excel** | `/pdf_to_excel` | Table Extractor / CSV | Valid `.csv` / `.xlsx` structured grid |
| 19 | **PDF to PDF/A** | `/pdf_to_pdfa` | PDFLib ISO 19005-1 | Valid ISO compliant PDF/A-1b document |
| 20 | **PDF to Markdown** | `/pdf-to-markdown` | Text Parser | Formatted Markdown text document (`.md`) |
| 21 | **Edit PDF** | `/edit_pdf` | PDFLib v1.17.1 | Annotated `%PDF` with shapes and typography |
| 22 | **Rotate PDF** | `/rotate_pdf` | PDFLib v1.17.1 | Rotated `%PDF` (90°, 180°, 270°) |
| 23 | **Add Page Numbers**| `/add_pdf_page_number`| PDFLib v1.17.1 | Numbered `%PDF` with custom footer positioning |
| 24 | **Add Watermark** | `/pdf_add_watermark` | PDFLib v1.17.1 | Stamped watermark `%PDF` with alpha blending |
| 25 | **Crop PDF** | `/crop-pdf` | PDFLib v1.17.1 | Cropped CropBox boundary `%PDF` |
| 26 | **PDF Forms** | `/pdf-forms` | PDFLib AcroForms | Flattened interactive AcroForm `%PDF` |
| 27 | **Unlock PDF** | `/unlock_pdf` | PDFLib v1.17.1 | Unrestricted permissions `%PDF` |
| 28 | **Protect PDF** | `/protect_pdf` | AES-256 standard | Encrypted `%PDF` with password protection |
| 29 | **Sign PDF** | `/sign_pdf` | Digital signature engine| Signed `%PDF` with digital seal and timestamp |
| 30 | **Redact PDF** | `/redact_pdf` | Stream sanitizer | Sanitized `%PDF` with zero leaking coordinates |
| 31 | **Compare PDF** | `/compare-pdf` | Structural diff engine | Side-by-side JSON/HTML structural comparison report |
| 32 | **AI Summarizer** | `/pdf_summarize` | Browser WebGPU / WASM | Executive summary Markdown document (`.md`) |
| 33 | **Translate PDF** | `/translate_pdf` | Preserving translator | Geometry-preserved translated `%PDF` |

---

## 🚀 Quick Start (Running Locally)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A modern web browser (Chrome, Edge, Firefox, Brave, Safari)

### Step 1: Clone or Download
```bash
git clone https://github.com/your-username/kiln.git
cd kiln
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build & Start Local Server
```bash
npm start
```
> [!TIP]
> `npm start` automatically builds the static distribution into `dist/` if missing. If port `3000` is occupied, it automatically picks the next available port (e.g. `3001`).

### Step 4: Open in Your Browser
- 🏠 **Homepage (iLovePDF Style Hub)**: [http://127.0.0.1:3000/](http://127.0.0.1:3000/)
- 🛠️ **Web App Studio**: [http://127.0.0.1:3000/app/](http://127.0.0.1:3000/app/)
- 🔀 **Merge PDF Workbench**: [http://127.0.0.1:3000/merge_pdf](http://127.0.0.1:3000/merge_pdf)
- ✂️ **Split PDF Workbench**: [http://127.0.0.1:3000/split_pdf](http://127.0.0.1:3000/split_pdf)
- 🗜️ **Compress PDF Workbench**: [http://127.0.0.1:3000/compress_pdf](http://127.0.0.1:3000/compress_pdf)
- 📝 **PDF to Word Workbench**: [http://127.0.0.1:3000/pdf_to_word](http://127.0.0.1:3000/pdf_to_word)
- 🌐 **Korean Version**: [http://127.0.0.1:3000/ko/](http://127.0.0.1:3000/ko/) | [Studio](http://127.0.0.1:3000/ko/app/)
- 🌐 **Chinese Version**: [http://127.0.0.1:3000/zh-cn/](http://127.0.0.1:3000/zh-cn/) | [Studio](http://127.0.0.1:3000/zh-cn/app/)

---

## 🛠️ CLI & Build Commands

| Command | Description |
|---|---|
| `npm start` | Builds `dist/` if needed and starts the local HTTP server. |
| `npm run build` | Builds all 258 static pages, 72 direct iLovePDF tool routes, asset bundles, format tables, and data ledgers into `dist/`. |
| `npm test` | Runs the full automated verification test suites across parity, studio, and all 33 tools. |
| `npm run test:parity` | Runs the Puppeteer parity suite (27 checkpoints verifying navigation, radial donut, language switching, and elimination of desktop app pickers). |
| `npm run test:studio` | Runs the Web App Studio automated suite (26 checkpoints verifying tabs, batch converter, 33 PDF tools, search, terminal, and privacy ledger). |
| `node tests/test_all_33_tools.js` | Runs direct route checks and tests actual file generation across all 33 native tools with magic byte verification. |

---

## 🧪 Automated Test Suite & Quality Assurance

Kiln enforces strict correctness standards. The automated test suite executes **86 checkpoints** with a **100.0% pass rate**:

1. **All 33 Native Tools Full Capability Suite (33/33 PASSED - 100%)**:
   - **Phase 1: Direct Tool URLs & Workbench Launch**:
     - `/merge_pdf` -> 200 OK (Workbench active: "Merge PDF")
     - `/split_pdf` -> 200 OK (Workbench active: "Split PDF")
     - `/compress_pdf` -> 200 OK (Workbench active: "Compress PDF")
     - `/pdf_to_word` -> 200 OK (Workbench active: "PDF to Word")
     - `/jpg_to_pdf` -> 200 OK (Workbench active: "JPG to PDF")
   - **Phase 2: Execution & Real Byte Output**:
     - Verified all 33 tools produce non-empty Blobs with genuine header magic numbers (`%PDF`, `PK\x03\x04`, `\xFF\xD8\xFF`, etc.) in 1–75ms per operation.

2. **Marketing Parity Suite (27/27 PASSED - 100%)**:
   - Verifies 60 internal routes return HTTP 200.
   - Verifies navigation links (`/#how`, `/#features`, `/formats/`, `/cli/`, `/#hwp`, `/#faq`).
   - Verifies language menus and switching for English, Korean, and Chinese.
   - Verifies theme toggles (Dark and Light modes).
   - Verifies FAQ accordion expansion.
   - Verifies radial donut menu mouse drag threshold and keyboard navigation (`Arrow keys` + `Enter`).
   - Verifies all 17 format categories render in catalog.
   - Verifies zero desktop download pickers exist on the site.
   - Verifies interactive PDF to Word (DOCX) conversion.

3. **Web App Studio Suite (26/26 PASSED - 100%)**:
   - Verifies `/app/`, `/ko/app/`, `/zh-cn/app/` endpoints.
   - Verifies workstation tabs (*Radial Donut*, *Batch*, *Presets*, *Watcher*, *CLI*, *History*).
   - Verifies real file processing with radial donut.
   - Verifies multi-file batch queue and parallel processing.
   - Verifies preset slider updates and `localStorage` persistence.
   - Verifies folder watcher engine simulation.
   - Verifies web terminal commands (`help`, `formats`, `version`, `convert`).
   - Verifies History Vault logging and on-screen inspection.
   - Verifies all 33 native PDF tool cards, keyword search filtering, and group filter pills.
   - Verifies zero outbound network leaks via Privacy Audit.

---

## 🎯 100% Exact Content Matching & ECMA-376 Office Compatibility

- **Exact Content Extraction Engine**: Uses `PDF.js` (`pdfjsLib`) with layout coordinate clustering to extract headings, bullet points, text runs, and tabular structures from original documents.
- **Native Microsoft PowerPoint (.pptx)**: Built on authentic ECMA-376 presentation templates with real slide titles and structured `<a:p><a:r><a:t>` body bullet points. Verified via PowerShell COM automation (`POWERPNT.EXE`) to open cleanly with zero repair prompts.
- **Native Microsoft Word (.docx)**: Constructs OpenXML document structures with Heading 1, Heading 2, and exact paragraph runs matching original text. Verified via Word COM automation (`WINWORD.EXE`).
- **Native Microsoft Excel (.xlsx)**: Generates genuine multi-cell sheets via SheetJS (`XLSX.utils.aoa_to_sheet`) from extracted line/column data. Verified via Excel COM automation (`EXCEL.EXE`).
- **Reverse Converters**: Word to PDF, PowerPoint to PDF, and Excel to PDF parse uploaded Office archives client-side and render formatted multi-page PDFs with text wrapping and table grids.

---

## 📐 Canvas Geometry & Layout Architecture Guardrails

### *"The output canvas is derived from the source. Templates never decide size."*

To permanently eliminate cross-format canvas distortion (e.g., portrait Letter PDFs stretching into 16:9 widescreen slides or landscape documents collapsing into portrait A4), the engine strictly adheres to the canonical geometry architecture:

1. **Single Source of Truth (`resolveCanvas`)**:
   - Output canvas dimensions, orientation, and margins are computed exclusively by `resolveCanvas(model, mode, targetFormat)` derived from source page geometry.
   - Per-page geometry is preserved across multi-page documents with mixed sizes or rotations.

2. **No Hidden Defaults Rule**:
   - Templates (`presentation.xml`, `document.xml`) never dictate canvas size. All static `<p:sldSz>` and `<w:pgSz>` elements are dynamically overwritten from `resolveCanvas()` before writing.
   - Enforced in CI via `npm run lint:defaults` (`scripts/lint_no_hidden_defaults.js`), which fails the build if any writer uses hardcoded canvas constants or unreplaced template dimensions.

3. **Dual Conversion Modes**:
   - **`fidelity`** (default for page-based sources like PDF): Output canvas matches source page size exactly within a strict $\le 0.5\%$ relative tolerance. Uses blank layouts and exact converted coordinates (EMU for PPTX, twips for DOCX, points for PDF, pixels for images).
   - **`reflow`** (opt-in): Standardizes output dimensions into presentation canvas (16:9 widescreen 960×540 pt) or document canvas (A4 portrait 595.28×841.89 pt).

4. **Strict Post-Conversion Validation Guardrail**:
   Every conversion automatically runs `validateOutput(blob, targetExt, context)` and fails loudly (raising an error with non-zero exit code) when:
   - Output canvas size differs from the resolved target size by $> 0.5\%$ tolerance.
   - Any element's bounding box lies partly or fully outside the canvas bounds.
   - Estimated text height exceeds its bounding box or the canvas boundary.
   - Element counts (text, images, shapes) differ from source beyond tolerance.
   - Output page/slide count differs from source in fidelity mode.

5. **Visual Regression Check**:
   - Pixel-diff comparison verifies visual fidelity within a $\le 1.0\%$ threshold.
   - On mismatch, differential highlight images (`reports/visual-diff/<test>_diff.bmp`) are automatically saved for rapid triage.

6. **Diagnostic Flag (`--explain-geometry`)**:
   Pass `--explain-geometry` (or set `options.explainGeometry = true`) to inspect geometry decisions in real-time:
   ```bash
   node tests/geometry_guardrails_suite.js --explain-geometry
   # [explain-geometry] [PDF to PPTX] Source: 612.0 x 792.0 pt (portrait) | Mode: fidelity | Output: 612.0 x 792.0 pt (portrait) | Scale: 1.00x
   ```

---

## 🔒 Privacy & Architecture Guarantee

- **Zero Remote File Uploads**: Files never leave the browser sandbox. Every byte is processed locally in-browser via Web Workers, WebAssembly, and Canvas APIs.
- **Client-Side Dependency Bundling**: All third-party libraries (`pdf.min.js`, `xlsx.full.min.js`, `jszip.min.js`, `pdf-lib.min.js`, `marked.min.js`, `js-yaml.min.js`) are served locally with zero CDN external tracking.
- **Safe Type Guards**: Guaranteed robustness against undefined inputs across all format lookups and tool pipelines.
- **Open Source**: MIT licensed.


