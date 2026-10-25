# BATCH 2: Kiln / Filee Comprehensive Fidelity Contract

> **Status**: APPROVED FIDELITY CONTRACT  
> **Scope**: All document, presentation, spreadsheet, raster, and media conversion pipelines  
> **Constraint**: Zero conversion code changes in Batch 2.

---

## 1. Classification Vocabulary

Every feature cell in this contract is rigorously classified under one of five normative tiers:

| Classification | Definition | Requirement & Enforcement |
|:---|:---|:---|
| **`EXACT`** | 100% loss-free representation in native target structures without degradation. | Byte or semantic equivalence. No loss warnings permitted. |
| **`APPROXIMATE`** | Re-represented using closest metric/semantic counterpart in target format. | Must disclose specific deviation, trigger fallback, and log warning. |
| **`EMBEDDED`** | Preserved as static raster or vector container; non-editable in target format. | Vector/raster fidelity intact; editability surrendered. Logged. |
| **`SIDECAR`** | Preserved in external companion artifact (`.meta.json`, `.vtt`, MathML). | Carried alongside target container without data loss. |
| **`IMPOSSIBLE`** | Target format syntax fundamentally cannot express the construct. | Disclosed upfront in preflight; logged as dropped capability. |

---

## 2. Lossy vs. Lossless Channel Rules

1. **Lossless Raster Conservation Rule**:
   - Any image extracted from an input container as a lossless stream (PNG, TIFF, lossless WebP, PDF FlateDecode) MUST remain lossless throughout the conversion pipeline. Re-encoding to lossy codecs (JPEG, lossy WebP, subsampled DCT) is strictly forbidden in `visual` and `archival` modes.
2. **Audio/Video Stream Copy (Remux) Rule**:
   - When converting between media containers without changing codec requirements (e.g. MP4 to MKV, or WAV PCM container repackaging), the engine MUST execute direct stream copy (bitstream remuxing) with zero re-encoding or transcoding.
3. **Lossless Transcoding Rule**:
   - When transcoding is unavoidable due to container codec constraints, re-encoding MUST target a lossless codec (FLAC, PCM WAV, ALAC, PNG).
4. **Partitioned "Access" Pipeline**:
   - Any downsampled or lossy compression pipeline (e.g. WebP lossy thumbnail generation, MP3 128kbps voice preview) is strictly partitioned as an explicit "Access Pipeline", never silently invoked in the core fidelity conversion paths.

---

## 3. Element Class Inventory & Fidelity Matrix

The matrix below evaluates the primary conversion routes:
- **Routes**: PDF $\to$ DOCX, PDF $\to$ PPTX, PDF $\to$ HTML, PDF $\to$ XLSX, PDF $\to$ Markdown (MD), and Media Interconversions.
- **Modes**: `[E]` = Editable, `[V]` = Visual, `[A]` = Archival.

### Category A: Page & Canvas Geometry

| Feature / Element | PDF $\to$ DOCX | PDF $\to$ PPTX | PDF $\to$ HTML | PDF $\to$ XLSX | PDF $\to$ MD | Fallback & Warning on Non-Exact |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Canvas Size (pt/EMU)** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V]` / APPROX `[E]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *DOCX/PPTX derive exact EMU dimensions. MD/XLSX: Omit canvas, log `[WARN_CANVAS_DROPPED]`.* |
| **Orientation** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V]` / APPROX `[E]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *XLSX/MD: Log `[WARN_ORIENTATION_OMITTED]`.* |
| **Margins** | APPROX `[E]` | EXACT `[V]` | EXACT `[V]` / APPROX `[E]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *In `editable` mode, margins clamp to content bounds. Log `[APPROX_MARGIN_ADAPTED]`.* |
| **Mixed Page Sizes** | EXACT `[E,V,A]` | APPROX `[V]` | EXACT `[V,E]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *PPTX presentation enforces global slide size. Mixed slides scaled to canvas. Log `[WARN_PPTX_MULTI_SIZE_NORMALIZED]`.* |
| **Page Rotation ($90^\circ/180^\circ/270^\circ$)** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *Canvas dimensions transposed. Content matrix rotated.* |
| **Page Background / Fills** | APPROX `[E]` / EXACT `[V]` | EXACT `[V,A]` | EXACT `[V,E]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *DOCX emulates full-bleed via header shape. MD drops background.* |
| **Headers / Footers** | APPROX `[E]` | EXACT `[V]` | APPROX `[E]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *In `editable` flow, repeated headers de-duplicated into section headers. Log `[APPROX_HEADER_DEDUPLICATED]`.* |
| **Multi-Column Layout** | APPROX `[E]` / EXACT `[V]` | EXACT `[V]` | EXACT `[V,E]` | IMPOSSIBLE `[E]` | APPROX `[E]` | *In `editable` mode, 2D columns linearize into reading order. Log `[APPROX_COLUMNS_LINEARIZED]`.* |

---

### Category B: Text Characters & Reading Flow

| Feature / Element | PDF $\to$ DOCX | PDF $\to$ PPTX | PDF $\to$ HTML | PDF $\to$ XLSX | PDF $\to$ MD | Fallback & Warning on Non-Exact |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Unicode Characters** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | EXACT `[E]` | EXACT `[E]` | *Strict NFC normalization. Zero character loss tolerated.* |
| **Ligatures (fi, fl, ffi)** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | EXACT `[E]` | EXACT `[E]` | *Decomposed to canonical Unicode or preserved as OpenType.* |
| **RTL (Arabic, Hebrew)** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | EXACT `[E]` | EXACT `[E]` | *Direction tagged (`w:rtl`, `dir="rtl"`). BiDi reordering applied.* |
| **CJK & Complex Scripts** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | EXACT `[E]` | EXACT `[E]` | *Preserves full CJK ideographs with font fallback.* |
| **Math Alphanumerics** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | EXACT `[E]` | EXACT `[E]` | *Preserves Unicode mathematical alphanumeric symbols.* |
| **Reading Order** | EXACT `[E]` / APPROX `[V]`| APPROX `[V]` | EXACT `[E]` | APPROX `[E]` | EXACT `[E]` | *Multi-column spatial topological sort re-sequences linear stream.* |
| **Hard Breaks vs Wrap** | APPROX `[E]` / EXACT `[V]`| EXACT `[V]` | APPROX `[E]` | IMPOSSIBLE `[E]` | APPROX `[E]` | *In `editable` flow, mid-sentence line breaks stripped to enable reflow.* |
| **Whitespace & Kerning** | APPROX `[E]` / EXACT `[V]`| EXACT `[V]` | APPROX `[E]` | IMPOSSIBLE `[E]` | APPROX `[E]` | *Kerning-aware threshold prevents false spaces inside words.* |

---

### Category C: Character & Font Formatting

| Feature / Element | PDF $\to$ DOCX | PDF $\to$ PPTX | PDF $\to$ HTML | PDF $\to$ XLSX | PDF $\to$ MD | Fallback & Warning on Non-Exact |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Font Family Name** | APPROX `[E,V]` | APPROX `[V]` | APPROX `[E,V]` | APPROX `[E]` | IMPOSSIBLE `[E]` | *Substituted with metric-compatible font (e.g. Helvetica $\to$ Arial). Logged in `report.fontSubstitutions`.* |
| **Font Size (pt)** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | EXACT `[E]` | IMPOSSIBLE `[E]` | *MD has no font size syntax; mapped to `#`, `##` headings or plain text.* |
| **Bold & Italic** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | EXACT `[E]` | EXACT `[E]` | *Standard markdown `**bold**`, `*italic*` emitted.* |
| **Underline & Strike** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | EXACT `[E]` | APPROX `[E]` | *MD uses GFM `~~strike~~` and `<u>` tag fallback. Log `[APPROX_MARKDOWN_HTML_FALLBACK]`.* |
| **Colors (RGB / CMYK / Gray)** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | EXACT `[E]` | IMPOSSIBLE `[E]` | *Colors converted to Hex `#RRGGBB`. MD drops colors; log `[WARN_COLOR_DROPPED]`.* |
| **Text Highlights / Shading** | EXACT `[E,V,A]` | APPROX `[V]` | EXACT `[V,E]` | APPROX `[E]` | APPROX `[E]` | *PPTX emulates highlight via text box shading. MD uses `<mark>` tag.* |
| **Subscript / Superscript** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | IMPOSSIBLE `[E]` | APPROX `[E]` | *DOCX/PPTX use `w:vertAlign` / `a:vertAlign`. MD uses `<sub>` / `<sup>` HTML fallback.* |

---

### Category D: Paragraph & Flow Formatting

| Feature / Element | PDF $\to$ DOCX | PDF $\to$ PPTX | PDF $\to$ HTML | PDF $\to$ XLSX | PDF $\to$ MD | Fallback & Warning on Non-Exact |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Alignment (Left/Center/Right/Justified)** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | EXACT `[E]` | IMPOSSIBLE `[E]` | *MD does not support alignment; defaulted to left flow.* |
| **First-Line / Left Indent** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *Derived in integer twips/EMUs. XLSX/MD drop paragraph indents.* |
| **Paragraph Spacing (Before/After)** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | IMPOSSIBLE `[E]` | APPROX `[E]` | *Docx sets `w:before` and zeroes `w:after` to prevent double gaps.* |
| **Line Spacing** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[V,E]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *Preserved via twips line spacing rules. MD relies on renderer.* |

---

### Category E: Lists, Tables & Complex Structures

| Feature / Element | PDF $\to$ DOCX | PDF $\to$ PPTX | PDF $\to$ HTML | PDF $\to$ XLSX | PDF $\to$ MD | Fallback & Warning on Non-Exact |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Bullet / Numbered Lists** | EXACT `[E]` / APPROX `[V]`| EXACT `[V]` | EXACT `[E,V]` | IMPOSSIBLE `[E]` | EXACT `[E]` | *DOCX generates `w:numPr` with hanging indents. MD generates `-` list.* |
| **Tables (Cells, Rows, Borders)** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[E,V]` | EXACT `[E,A]` | EXACT `[E]` | *Reconstructed from vector grid intersections into native `w:tbl` / `a:tbl` / `\| GFM \|`.* |
| **Merged Cells (Colspan/Rowspan)** | EXACT `[E,A]` | APPROX `[V]` | EXACT `[E,V]` | EXACT `[E,A]` | IMPOSSIBLE `[E]` | *GFM Markdown does not support cell spans; cell values repeated or concatenated.* |
| **Raster Images** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[E,V]` | EMBEDDED `[E]` | EMBEDDED `[E]` / SIDECAR | *Embedded with native dimensions. In MD, extracted to companion folder.* |
| **Vector Drawings / Rulings** | APPROX `[E]` / EXACT `[V]`| EXACT `[V,A]` | EXACT `[V,E]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *Converted to native OpenXML drawing shapes. Dropped in text/MD.* |
| **Equations / Formulas** | APPROX `[E]` / EMBEDDED | EMBEDDED `[V]` | APPROX `[E]` / SIDECAR| IMPOSSIBLE `[E]` | APPROX `[E]` / SIDECAR | *Preserved as Unicode text + MathML/LaTeX sidecar. Log `[APPROX_FORMULA_UNICODE]`.* |
| **Form Fields** | APPROX `[E]` / EXACT `[V]`| EXACT `[V]` | EXACT `[E,V]` | IMPOSSIBLE `[E]` | IMPOSSIBLE `[E]` | *Converted to form controls or flattened into field values.* |
| **Annotations & Comments** | APPROX `[E]` / SIDECAR `[A]`| APPROX `[V]` / SIDECAR| APPROX `[E]` | IMPOSSIBLE `[E]` | SIDECAR `[A]` | *Omitted from body in `editable` mode; preserved in sidecar in `archival`.* |

---

### Category F: Links, Accessibility & Metadata

| Feature / Element | PDF $\to$ DOCX | PDF $\to$ PPTX | PDF $\to$ HTML | PDF $\to$ XLSX | PDF $\to$ MD | Fallback & Warning on Non-Exact |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Hyperlinks & URIs** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[E,V]` | EXACT `[E]` | EXACT `[E]` | *Active URL targets preserved across all formats.* |
| **Bookmarks / Outlines** | EXACT `[E,A]` | APPROX `[V]` | EXACT `[E,V]` | IMPOSSIBLE `[E]` | APPROX `[E]` | *DOCX writes bookmarks; MD relies on heading anchors.* |
| **Alt Text (Images)** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[E,V]` | IMPOSSIBLE `[E]` | EXACT `[E]` | *Written to `c:docPr` description, `alt` attribute, and `![alt]()`.* |
| **Tagged Document Structure** | EXACT `[E,A]` | APPROX `[V]` | EXACT `[E,V]` | IMPOSSIBLE `[E]` | EXACT `[E]` | *Semantic tags emitted in DOCX styles and HTML `<article>`, `<section>`.* |
| **Descriptive Metadata (Title/Author)**| EXACT `[E,V,A]`| EXACT `[V,A]` | EXACT `[E,V]` | EXACT `[E]` | SIDECAR `[E]` / FRONTMATTER| *Written to `docProps/core.xml` or Markdown YAML frontmatter.* |
| **Technical & Provenance Metadata** | EXACT `[E,V,A]` | EXACT `[V,A]` | EXACT `[E,V]` | EXACT `[E]` | SIDECAR `[A]` | *Build stamp, input SHA-256, tool versions recorded in metadata.* |

---

### Category G: Audio & Video Channels

| Channel / Feature | WAV $\leftrightarrow$ MP3 | MP4 $\leftrightarrow$ MKV | WAV $\to$ OGG | Subtitles / Cues | Fallback & Warning on Non-Exact |
|:---|:---:|:---:|:---:|:---:|:---|
| **PCM Audio Bitstream** | APPROX `[Access]` | EXACT `[Remux]` | APPROX `[Lossy]` | N/A | *WAV $\to$ MP3 passes to Access pipeline; logs `[LOSSY_ENCODING_ACCESS_PIPELINE]`.* |
| **Remux Streams** | N/A | EXACT `[Remux]` | N/A | N/A | *Container repackaging performed via bitstream stream-copy (lossless).* |
| **Subtitles / Cues** | N/A | EXACT `[VTT/SRT]` | N/A | EXACT `[VTT]` | *Cue timing and text parity maintained without alteration.* |
| **Chapter Markers** | N/A | EXACT `[Remux]` | N/A | SIDECAR | *Preserved in container metadata.* |

---

## 4. Ranked List of Gaps in the Current Implementation

Based on this comprehensive inventory, the current Kiln codebase exhibits the following prioritized gaps against the complete fidelity contract:

### Rank 1: Full-Featured MathML / LaTeX Formula Representation
- **Current State**: Mathematical expressions are extracted as Unicode character sequences and sub/superscripts (`w:vertAlign`).
- **Gap**: Complex multi-level fractions, matrices, integrals, and radical square roots are not yet translated into native OpenXML equation fields (`m:oMath`) or MathML XML blocks.
- **Remediation**: Add a MathML sidecar emitter and an OpenXML `m:oMath` synthesizer for detected equation bounding blocks.

### Rank 2: Form Field Interactivity Preservation
- **Current State**: PDF interactive form fields (AcroForm / XFA) have their textual values extracted, but the interactive widget state (checkboxes, text inputs, radio buttons) is flattened into static text.
- **Gap**: Missing generation of native Word content controls (`w:sdt`) and HTML form elements (`<input type="text">`, `<input type="checkbox">`).
- **Remediation**: Extract AcroForm field definitions and instantiate corresponding OpenXML structured document tags (`w:sdt`) in `pdfToWord`.

### Rank 3: Archival Metadata Sidecar (`.meta.json`) & Frontmatter
- **Current State**: Conversion report contains metadata and input SHA-256 in memory, and OpenXML files contain `docProps/core.xml`.
- **Gap**: Plaintext and Markdown conversions omit metadata because CommonMark lacks native metadata containers, and no companion `.meta.json` or YAML frontmatter (`---`) is automatically emitted.
- **Remediation**: For non-OpenXML targets in `archival` mode, automatically emit an accompanying `<filename>.meta.json` sidecar.

### Rank 4: OpenType Ligature Normalization
- **Current State**: Standard ligatures (`fi`, `fl`, `ffi`) are decoded accurately by PDF.js to standard unicode code points (`\uFB01`, `\uFB02`).
- **Gap**: In `editable` mode for DOCX, some legacy word processors struggle with pre-composed ligature glyphs when spellchecking; they should optionally be normalized to decomposed character pairs (`f` + `i`) for authoring convenience.
- **Remediation**: Provide an automated NFC/NFKC decomposition step during `editable_flow` run generation.

### Rank 5: Native Vector Path Export in Word (VML/DrawingML Shapes)
- **Current State**: Vector ruling lines and rectangular filled backgrounds are accurately detected for table grid synthesis and text highlights. Freeform bezier curves and complex vector icons are currently captured as raster page overlays.
- **Gap**: Freeform vector artwork is not yet transformed into native DrawingML vector paths (`w:drawing` $\to$ `wp:inline` $\to$ `a:graphic` $\to$ `a:custGeom`).
- **Remediation**: Add DrawingML `a:custGeom` path builder for non-orthogonal vector paths.
