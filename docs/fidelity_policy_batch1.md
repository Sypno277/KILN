# BATCH 1: Kiln / Filee Fidelity Policy Specification

> **Status**: APPROVED POLICY SPECIFICATION  
> **Scope**: All document, presentation, spreadsheet, and data conversion routes across Kiln / Filee  
> **Rule**: No conversion code changes in Batch 1.

---

## 1. The Three Dimensions of Fidelity

"As-is" conversion cannot mean bit-identical preservation across heterogeneous file formats. Fidelity is therefore decomposed into three orthogonal, measurable dimensions:

```
                      ┌─────────────────────────────────────────┐
                      │            FIDELITY SPACE               │
                      └─────────────────────────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌───────────────────┐             ┌───────────────────┐
│     VISUAL       │             │    STRUCTURAL     │             │     SEMANTIC      │
├──────────────────┤             ├───────────────────┤             ├───────────────────┤
│ • 2D Coordinates │             │ • Heading Levels  │             │ • Unicode Text    │
│ • Canvas Size    │             │ • True Paragraphs │             │ • Numeric Types   │
│ • Font Style/Pt  │             │ • OpenXML Tables  │             │ • URIs & Links    │
│ • Colors (RGB)   │             │ • Hanging Lists   │             │ • Core Metadata   │
│ • Line Wrapping  │             │ • Math / Sub/Sup  │             │ • Reading Order   │
└──────────────────┘             └───────────────────┘             └───────────────────┘
```

1. **VISUAL Dimension (Appearance & Print Fidelity)**:
   - Reproduction of optical layout: canvas geometry (pt/EMU), margins, orientations (portrait/landscape).
   - Absolute 2D positioning of text boxes, vector rulings, and images.
   - Font family metrics, exact point sizes, font weights, italicization, and underline styling.
   - Exact color representations (RGB hex, CMYK conversions, and grayscale levels).
   - Pagination boundaries and slide-frame containers.

2. **STRUCTURAL Dimension (Syntactic Hierarchy & Container Integrity)**:
   - Representation of content as authentic native format structures (not visual mockups).
   - Document outlines: Semantic headings (`<h1-h6>`, `w:pStyle="Heading1"`).
   - Real flowable paragraphs (`w:p`, `<p>`) with natural word-wrapping rather than fragmented coordinate strings.
   - Authentic tables (`w:tbl`, `a:tbl`, `<table>`) with header rows, cell borders, and merged cells (no simulated text-column spaces).
   - Bulleted and numbered lists (`w:numPr`, `<ol>`, `<ul>`) with hanging indentation.
   - Mathematical expressions and sub/superscript baseline alignments (`w:vertAlign`).

3. **SEMANTIC Dimension (Data, Meaning, and Accessibility)**:
   - 100% preservation of character streams in Unicode normalization (NFC).
   - Typed data preservation in tabular structures (numbers remain numeric floats/integers, dates remain dates, not strings).
   - Functional hyperlinks with valid URI targets.
   - Document provenance metadata: Title, Author, Subject, Keywords, Creation Date, Modification Date.
   - Logical reading order for screen readers and accessibility tools.

---

## 2. The Three Conversion Modes

Kiln exposes three explicit conversion modes:

```bash
kiln convert input.pdf --to=docx --mode=editable
kiln convert input.pdf --to=pptx --mode=visual
kiln convert input.pdf --to=pdfa --mode=archival
```

### Mode 1: `editable` (Authoring & Content Reuse)
- **Primary Goal**: Output must feel like a cleanly authored document in native software (Word, LibreOffice, Google Docs, Markdown editors).
- **Target Formats**: DOCX, ODT, HTML (semantic flow), Markdown, XLSX (extracted data).
- **Strategy**: Re-assemble coordinate fragments into unified paragraphs, headings, lists, and tables. Allow natural text flow; approximate exact 2D bounding boxes to avoid rigid un-editable text boxes.

### Mode 2: `visual` (Visual Match & Print Faithful)
- **Primary Goal**: Output must look as close to a photocopied printout as the target format permits.
- **Target Formats**: PPTX, PDF, HTML (fixed coordinate layout), SVG.
- **Strategy**: Absolute 2D positioning (EMU / pt), explicit canvas boundaries, hardcoded line bounds, high-resolution raster containment. Semantic hierarchy is secondary to sub-millimeter coordinate placement.

### Mode 3: `archival` (Durable Preservation & Complete Audit)
- **Primary Goal**: Complete, uncompromised long-term preservation without loss of digital evidence.
- **Target Formats**: PDF/A-2b, TIFF, PNG (lossless), CSV, XML, paired with sidecar JSON.
- **Strategy**: Zero lossy re-encoding. Lossless raster storage. Full metadata retention. Embedded subset fonts. Unhandled objects preserved in sidecar ledgers.

---

## 3. Preservation Contract: MUST vs Nice-to-Have vs Permitted Loss

| Element Class | `editable` Mode | `visual` Mode | `archival` Mode |
|---|---|---|---|
| **Text Content** | **MUST**: 100% Unicode characters | **MUST**: 100% Unicode characters | **MUST**: 100% Unicode characters |
| **Reading Order** | **MUST**: Natural linear reading order | **NICE**: Top-to-bottom spatial order | **MUST**: Dual (Spatial + Linear stream) |
| **Headings & Hierarchy** | **MUST**: Semantic styles (`Heading 1-6`) | **NICE**: Positioned title text boxes | **MUST**: Structural tree in metadata/PDF-A |
| **Paragraphs & Flow** | **MUST**: Flowing paragraphs with line wrap | **PERMITTED LOSS**: Broken into positioned text shapes | **MUST**: Preserved with exact line coordinates |
| **Tables** | **MUST**: Real table grid elements (`w:tbl`, `<table>`) | **NICE**: Table or vector ruling overlays | **MUST**: Structured table grid + cell boundaries |
| **Lists** | **MUST**: Native bullet/number with hanging indents | **PERMITTED LOSS**: Plain text bullet character + space | **MUST**: List item tags + indentation EMUs |
| **2D Absolute Coordinates**| **PERMITTED LOSS**: Reflowed into margins | **MUST**: Exact bounds within 1% tolerance | **MUST**: Exact bounding boxes recorded |
| **Canvas Dimensions** | **NICE**: Standard page size (Letter/A4/Tabloid)| **MUST**: Exact canvas W/H (within 0.5%) | **MUST**: Exact page geometry (within 0.0%) |
| **Fonts & Typestyles** | **MUST**: Bold, Italic, Underline; font mapping | **MUST**: Exact pt size, metrics, and font fallback | **MUST**: Full embedded font subset or vector |
| **Colors & Highlights** | **MUST**: RGB hex values; standard shading | **MUST**: Exact RGB/CMYK hex fill & stroke | **MUST**: Unmodified color space representation |
| **Raster Images** | **MUST**: Embedded image without downsampling | **MUST**: Exact 2D placement and dimensions | **MUST**: Lossless bitstream (PNG/TIFF/Deflate) |
| **Formulas / Subscripts**| **MUST**: Real sub/superscript (`w:vertAlign`) | **MUST**: Positioned offset text runs | **MUST**: Exact baseline delta & MathML sidecar |
| **Document Metadata** | **NICE**: Core title, author, dates | **NICE**: Core title, author, dates | **MUST**: 100% metadata preserved or in sidecar |
| **Annotations / Comments**| **PERMITTED LOSS**: Omitted unless requested | **PERMITTED LOSS**: Rendered or omitted | **MUST**: Retained as annotation stream |

---

## 4. The Cardinal Anti-Loss Rule

> **RULE**: No lossy step (re-encoding to a lossy codec, rasterizing vector text, dropping metadata, silent font substitution) may be introduced in a path whose mode forbids it.

### Explicit Enforcement Conditions:
1. **No Silent Font Substitution**: If a source font cannot be embedded or rendered identically, the substitution MUST be registered in the conversion report (`report.fontSubstitutions`), specifying source font, target font, and metric-compatibility justification.
2. **No Lossy Raster Re-encoding**: In `archival` and `visual` modes, images extracted as PNG, TIFF, or lossless Flate streams MUST NEVER be re-compressed to JPEG or WebP lossy codecs.
3. **No Unannounced Text Rasterization**: Extracting text by taking a full-page screenshot rather than reading font/glyph operators is strictly forbidden in all three modes unless the source is an explicit scanned raster PDF (and must be flagged as `SCANNED_PAGE_OCR_FALLBACK`).
4. **No Silent Metadata Eviction**: In `archival` mode, all source metadata (XMP, Info dict, EXIF) MUST be written into the target container (`docProps/core.xml`) or output as a companion `.meta.json` sidecar.

---

## 5. Per-Mode Test Baselines & Acceptance Tolerances

| Metric / Dimension | `editable` Mode Tolerance | `visual` Mode Tolerance | `archival` Mode Tolerance |
|---|---|---|---|
| **Content Score (Text)** | **100.0%** (zero character loss) | **100.0%** (zero character loss) | **100.0%** (zero character loss) |
| **Visual Parity (SSIM)** | $\ge 0.70$ (flow reflow allowed) | $\ge 0.95$ (near-pixel match) | $\ge 0.98$ (flawless rendering) |
| **Canvas Dimensions** | Within $2.0\%$ of standard page | Within $0.5\%$ of source page | Within $0.0\%$ (exact EMU match) |
| **Element Coordinates** | N/A (linear reflow permitted) | $\Delta \le 2.0\text{ pt}$ | $\Delta = 0\text{ pt}$ (exact vector) |
| **Structure Score** | $\ge 95.0\%$ (real tables/headings) | $\ge 70.0\%$ | $\ge 98.0\%$ |
| **Validity Layer** | **100.0%** (zero schema errors) | **100.0%** (zero schema errors) | **100.0%** (zero schema errors) |
| **Package Schema Integrity**| ECMA-376 / GFM compliant | ECMA-376 / SVG compliant | ISO 19005 (PDF/A) / ODF |

---

## 6. Current Implementation Audit & Gap Analysis

### What the Code Does Today:
- **`exact_layout` Implementation**:
  - Implemented for PPTX (`pdfToPpt`), HTML (fixed layout), and vector SVG.
  - Places elements in absolute coordinates using EMUs and points.
  - Achieves $99.9\%$ canvas dimension accuracy and zero schema errors.
- **`editable_flow` Implementation**:
  - Implemented for DOCX (`pdfToWord`), HTML (semantic article), and Markdown.
  - Reconstructs headings, paragraphs, lists with hanging indents, and table grids from vector rulings.
  - Calibrated space threshold eliminates kerning-induced gaps.
- **Failure Policy Engine**:
  - `strict` (fails loudly on loss), `standard` (converts and reports), `best_effort` (maximum tolerance).
- **Input Integrity & Provenance**:
  - SHA-256 computed on every input before conversion; mismatches refused immediately.
  - Build stamp (git hash, timestamp, tool versions) embedded in conversion logs and OpenXML metadata.

### The Gaps (What is Missing Against the Full Policy):
1. **Mode Configuration Naming**:
   - The engine currently accepts `mode: 'exact_layout'` and `mode: 'editable_flow'`.
   - **Gap**: Needs formal alias mappings for `--mode=editable`, `--mode=visual`, and `--mode=archival` across CLI, API, and UI configuration.
2. **Archival Mode Target & Sidecar Generator**:
   - **Gap**: `archival` mode currently lacks a dedicated `.meta.json` sidecar output generator for routes where the container format (e.g. Markdown or CSV) cannot store full XMP/EXIF metadata.
3. **PDF/A Strict Serialization**:
   - **Gap**: PDF export currently produces standard PDF 1.7 via `pdf-lib` rather than verified ISO 19005-2 (PDF/A-2b) with required embedded color profiles (`OutputIntent`) and XMP metadata packages.
4. **Lossless Codec Guarantee**:
   - Canvas raster conversions in `convertImage` use PNG for lossless, but fallback routes should assertively verify that JPEG compression is prohibited in `archival` mode.
