# BATCH 5: Kiln / Filee Writer Fidelity Specification & Field Mapping

> **Status**: APPROVED WRITER SPECIFICATION  
> **Scope**: All document, presentation, spreadsheet, and markup writers in Kiln / Filee  
> **Architectural Invariant**: Zero template defaults; all styles, geometry, and structures derived explicitly from IR.

---

## 1. Writer Field-Mapping Tables (IR Field $\to$ Native Construct)

### 1.1 DOCX Writer (`WordprocessingML` - ECMA-376)

| IR Field | Native WordprocessingML Construct | Units / Encoding | Child Element Ordering |
|---|---|---|---|
| `page.widthEmu`, `heightEmu` | `w:sectPr/w:pgSz` (`@w:w`, `@w:h`) | Twips ($1\text{ twip} = 635\text{ EMU}$) | `w:pgSz` $\to$ `w:pgMar` $\to$ `w:docGrid` |
| `page.marginsEmu` | `w:sectPr/w:pgMar` (`@w:top`, `@w:left`, etc.) | Twips ($1\text{ twip} = 635\text{ EMU}$) | Precedes `w:docGrid` |
| `block.paragraphData.alignment` | `w:pPr/w:jc` (`@w:val="left|center|right|both"`) | String enum | `w:pStyle` $\to$ `w:jc` $\to$ `w:spacing` $\to$ `w:ind` |
| `block.paragraphData.spacingBeforeEmu` | `w:pPr/w:spacing` (`@w:before`) | Twips | Within `w:spacing` |
| `block.paragraphData.spacingAfterEmu` | `w:pPr/w:spacing` (`@w:after`) | Twips (explicitly $0$ to stop double gaps)| Within `w:spacing` |
| `block.paragraphData.indents.leftEmu` | `w:pPr/w:ind` (`@w:left`) | Twips | Within `w:ind` |
| `block.paragraphData.indents.hangingEmu`| `w:pPr/w:ind` (`@w:hanging`) | Twips | Within `w:ind` |
| `block.headingData.level` | `w:pPr/w:pStyle` (`@w:val="Heading1"`) | String ID | First child of `w:pPr` |
| `inline.rPr.fontFamily` | `w:rPr/w:rFonts` (`@w:ascii`, `@w:hAnsi`, `@w:cs`)| Full Font Family Name | First child of `w:rPr` |
| `inline.rPr.fontSizeEmu` | `w:rPr/w:sz` (`@w:val`), `w:szCs` | Half-points ($1\text{ pt} = 2\text{ half-pts}$) | Follows `w:rFonts` |
| `inline.rPr.bold`, `italic` | `w:rPr/w:b`, `w:rPr/w:i` | Empty tag presence | Follows `w:sz` |
| `inline.rPr.underline`, `strike` | `w:rPr/w:u` (`@w:val="single"`), `w:strike` | Enum | Follows `w:i` |
| `inline.rPr.color.normalizedHex` | `w:rPr/w:color` (`@w:val="RRGGBB"`) | 6-char Hex (no `#`) | Follows `w:strike` |
| `inline.rPr.highlightHex` | `w:rPr/w:highlight` (`@w:val="yellow|red|..."`)| Word color name or `w:shd` | Follows `w:color` |
| `inline.rPr.vertAlign` | `w:rPr/w:vertAlign` (`@w:val="subscript|superscript"`)| String enum | Follows `w:highlight` |
| `inline.text` | `w:r/w:t` (`xml:space="preserve"`) | UTF-8 String (XML escaped) | Child of `w:r`, follows `w:rPr` |
| `block.tableData` | `w:tbl` $\to$ `w:tblPr`, `w:tblGrid`, `w:tr`, `w:tc` | EMUs / Twips | `w:tblPr` $\to$ `w:tblGrid` $\to$ `w:tr` |

---

### 1.2 PPTX Writer (`PresentationML` - ECMA-376)

| IR Field | Native PresentationML Construct | Units / Encoding | Child Element Ordering |
|---|---|---|---|
| `page.widthEmu`, `heightEmu` | `p:presentation/p:sldSz` (`@cx`, `@cy`) | Direct EMUs | `p:sldMasterIdLst` $\to$ `p:sldIdLst` $\to$ `p:sldSz` |
| `block.provenance.sourceBBoxEmu` | `p:sp/p:spPr/a:xfrm` (`a:off`, `a:ext`) | Direct EMUs (`@x`, `@y`, `@cx`, `@cy`) | `a:off` $\to$ `a:ext` |
| `block.paragraphData.alignment` | `a:p/a:pPr` (`@algn="l|ctr|r|just"`) | String enum | First child of `a:p` |
| `inline.rPr.fontFamily` | `a:rPr/a:latin` (`@typeface`), `a:cs` | Full Font Family Name | Precedes color fills |
| `inline.rPr.fontSizeEmu` | `a:rPr` (`@sz="1100"`) | Hundredths of a point ($1\text{ pt} = 100$) | Attribute on `a:rPr` |
| `inline.rPr.bold`, `italic` | `a:rPr` (`@b="1"`, `@i="1"`) | Boolean attributes | Attribute on `a:rPr` |
| `inline.rPr.color.normalizedHex` | `a:rPr/a:solidFill/a:srgbClr` (`@val="RRGGBB"`)| 6-char Hex | Inside `a:solidFill` |
| `inline.rPr.vertAlign` | `a:rPr` (`@baseline="-25000"` or `"+30000"`)| Thousandths of a percent | Attribute on `a:rPr` |
| `inline.text` | `a:r/a:t` | UTF-8 String (XML escaped) | Follows `a:rPr` in `a:r` |
| `block.imageData` | `p:pic` $\to$ `p:nvPicPr`, `p:blipFill`, `p:spPr` | Direct EMUs + DrawingML rId | `p:nvPicPr` $\to$ `p:blipFill` $\to$ `p:spPr` |
| `block.tableData` | `a:tbl` $\to$ `a:tblPr`, `a:tblGrid`, `a:tr`, `a:tc` | Direct EMUs | `a:tblPr` $\to$ `a:tblGrid` $\to$ `a:tr` |

---

### 1.3 HTML5 Writer (Semantic Flow & Exact Layout)

| IR Field | Editable Flow HTML5 | Exact Layout HTML5 | CSS Units |
|---|---|---|---|
| `page.widthEmu`, `heightEmu` | Responsive Container (`max-width: 800px`) | Fixed Container (`width: 8.5in; height: 11in;`) | `in` / `px` ($1\text{ pt} = 12,700\text{ EMU}$) |
| `block.headingData` | Semantic `<h1-h6>` elements | Positioned `<div class="heading">` | Flow vs. `position: absolute; top; left;` |
| `block.paragraphData` | Semantic `<p>` elements | Positioned `<div class="para">` | Flow vs. `position: absolute; top; left;` |
| `block.tableData` | Semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>` | Positioned `<table style="position:absolute;">` | `border-collapse: collapse; width: 100%` |
| `inline.rPr.fontFamily` | `font-family: Arial, sans-serif;` | `font-family: "Times New Roman", serif;` | CSS Font Family List |
| `inline.rPr.fontSizeEmu` | `font-size: 11pt;` | `font-size: 11pt;` | `pt` |
| `inline.rPr.color.normalizedHex`| `color: #E01C47;` | `color: #E01C47;` | Hex Color `#RRGGBB` |
| `inline.rPr.highlightHex` | `<mark style="background: #FEF08A">` | `background-color: #FEF08A;` | CSS Highlight / HTML5 `<mark>` |
| `inline.rPr.vertAlign` | `<sub>` or `<sup>` tags | `vertical-align: sub / super;` | HTML5 semantic tags |

---

### 1.4 Markdown Writer (CommonMark & GFM)

| IR Field | Native CommonMark / GFM Construct | Fallback Tier | Logged Warning |
|---|---|---|---|
| `block.headingData.level` | `# H1`, `## H2`, `### H3` | **EXACT** | None |
| `block.paragraphData` | Standard text lines separated by `\n\n` | **EXACT** | None |
| `block.paragraphData.listPr` | `- Bullet Item` or `1. Numbered Item` | **EXACT** | None |
| `block.tableData` | `\| Header 1 \| Header 2 \| \n \| :--- \| :--- \|` | **EXACT** (Uniform) / **APPROX** (Merged) | `[APPROX_MARKDOWN_TABLE_MERGES_CONCATENATED]` |
| `inline.rPr.bold`, `italic` | `**Bold**`, `*Italic*` | **EXACT** | None |
| `inline.rPr.strike` | `~~Strikethrough~~` (GFM extension) | **EXACT** | None |
| `inline.rPr.underline` | `<u>Underline</u>` (HTML fallback) | **APPROXIMATE** | `[APPROX_MARKDOWN_HTML_FALLBACK]` |
| `inline.rPr.vertAlign` | `<sub>Sub</sub>` / `<sup>Super</sup>` | **APPROXIMATE** | `[APPROX_MARKDOWN_HTML_FALLBACK]` |
| `inline.rPr.color` | Omitted (syntax cannot represent color) | **IMPOSSIBLE** | `[WARN_COLOR_DROPPED]` |
| `inline.rPr.fontSizeEmu` | Mapped to Heading `#` or Body text | **IMPOSSIBLE** | `[WARN_FONT_SIZE_UNSUPPORTED]` |

---

## 2. Universal Architectural Rules for Writers

1. **Geometry from IR Invariant**:
   - The canvas/page size comes strictly from `ir.pages[i].widthEmu` and `heightEmu`.
   - Never use hardcoded templates (e.g. Letter 612x792 pt or A4 595x842 pt). If the input is Tabloid landscape ($1224 \times 792\text{ pt}$), the output writer emits $15,544,800 \times 10,058,400\text{ EMU}$.
2. **Explicit Style Declaration (No Silent Defaults)**:
   - Every text run (`w:r`, `a:r`, `<span style="...">`) writes an explicit font family (`w:rFonts`), explicit font size (`w:sz`), explicit color (`w:color`), bold flag (`w:b`), and alignment (`w:jc`).
   - Writers never assume word processor defaults (e.g. Calibri 11pt Black).
3. **XML Serializer with Robust Escaping**:
   - No ad-hoc string concatenation (`"<w:t>" + text + "</w:t>"`).
   - All XML nodes are generated via `this.xmlElement(name, attrs, children)` and serialized with UTF-8 XML entity escaping (`&` $\to$ `&amp;`, `<` $\to$ `&lt;`, `>` $\to$ `&gt;`, `"` $\to$ `&quot;`, `'` $\to$ `&apos;`).
4. **Validation Before Serialization**:
   - Container schemas are verified before zipping:
     - DOCX: `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels`.
     - PPTX: `[Content_Types].xml`, `_rels/.rels`, `ppt/presentation.xml`, `ppt/slides/slide1.xml`.

---

## 3. Mode Behaviors

- **`editable` Mode**:
  - Focuses on native authoring ease.
  - Reconstructs semantic headings (`Heading 1-6`), flowing paragraphs with auto-wrapping, native lists with hanging indents, and true table grids (`w:tbl`, `<table>`).
  - Rigid coordinate bounding boxes and manual intra-sentence line breaks are reflowed into section margins.
- **`visual` Mode**:
  - Focuses on optical replication.
  - Places elements at exact 2D coordinate boxes (EMU / pt). Preserves hard line wraps and precise margins.
  - Text shapes maintain absolute coordinates to prevent any shift in alignment.
- **`archival` Mode**:
  - Targets long-term durability (PDF/A, TIFF, PNG, CSV, XML).
  - All fonts embedded as vector or subset fonts. Zero external dependencies.
  - Full metadata persisted in `docProps/core.xml` and accompanied by a companion `.meta.json` sidecar.

---

## 4. Metadata Mapping Tables

| IR Metadata Field | DOCX Target | PPTX Target | HTML5 Target | Markdown Target |
|---|---|---|---|---|
| `metadata.descriptive.title` | `docProps/core.xml` (`dc:title`) | `docProps/core.xml` (`dc:title`) | `<title>`, `<meta name="title">` | YAML Frontmatter (`title: ...`) |
| `metadata.descriptive.creator`| `docProps/core.xml` (`dc:creator`) | `docProps/core.xml` (`dc:creator`) | `<meta name="author">` | YAML Frontmatter (`author: ...`) |
| `metadata.descriptive.subject`| `docProps/core.xml` (`dc:description`)| `docProps/core.xml` (`dc:description`)| `<meta name="description">` | YAML Frontmatter (`subject: ...`) |
| `metadata.descriptive.keywords`| `docProps/core.xml` (`cp:keywords`) | `docProps/core.xml` (`cp:keywords`) | `<meta name="keywords">` | YAML Frontmatter (`keywords: [...]`) |
| `metadata.process.timestamp` | `docProps/core.xml` (`dcterms:created`)| `docProps/core.xml` (`dcterms:created`)| `<meta name="date">` | YAML Frontmatter (`date: ...`) |
| `metadata.process.tools` | `docProps/core.xml` (`dc:description`)| `docProps/core.xml` (`dc:description`)| `<meta name="generator">` | Sidecar `.meta.json` |

*Fields that target formats cannot hold natively (e.g. Markdown or CSV) are automatically saved into companion `<filename>.meta.json` sidecars in archival mode.*

---

## 5. Metric-Compatible Font Substitution Table

When source fonts are not system-installed or embeddable, the writer substitutes them using the documented metric-compatible mapping table and logs the replacement:

| Source Font Family | Target Metric-Compatible Font | Fallback Classification | Logged Warning |
|---|---|---|---|
| `Helvetica`, `Helvetica-Bold` | `Arial` | **APPROXIMATE** | `[Font Substitution] Mapped PDF font "Helvetica" to OpenXML font "Arial"` |
| `Times-Roman`, `Times-Bold` | `Times New Roman` | **APPROXIMATE** | `[Font Substitution] Mapped PDF font "Times-Roman" to OpenXML font "Times New Roman"` |
| `Courier`, `Courier-Bold` | `Courier New` | **APPROXIMATE** | `[Font Substitution] Mapped PDF font "Courier" to OpenXML font "Courier New"` |
| `Symbol`, `FoxitSymbol` | `Symbol` | **EXACT** | None |
| `ZapfDingbats` | `Wingdings` | **APPROXIMATE** | `[Font Substitution] Mapped font "ZapfDingbats" to OpenXML font "Wingdings"` |
| Unknown / Unrecognized | `Arial` | **APPROXIMATE** | `[Font Substitution] Mapped unknown font to default "Arial"` |

---

## 6. Round-Trip Verification Results (`tests/writer_fidelity_roundtrip_suite.js`)

Executed full round-trip verification across all writers: Write $\to$ Read back to IR $\to$ Compare against Source IR within tolerance:

```text
=================================================================
 BATCH 4: Writer Fidelity & Round-Trip Parity Test Suite
=================================================================

--- Step 1: Loading Batch 3 Multi-Element Source Fixture ---
  ✓ [PASS] Source IR loaded with valid geometry and blocks

--- Step 2: DOCX Writer Fidelity & Round-Trip (Item 1 & 5) ---
  ✓ [PASS] DOCX conversion completes successfully
  ✓ [PASS] DOCX canvas geometry matches source within 1% tolerance
  ✓ [PASS] DOCX preserves text blocks & paragraphs
  ✓ [PASS] DOCX contains document title text
  ✓ [PASS] DOCX contains formula / subscript text
  ✓ [PASS] DOCX round-trip extracts table block
  ✓ [PASS] DOCX writes explicit bold and font properties (zero template reliance)

--- Step 3: PPTX Writer Fidelity & Round-Trip (Item 1 & 5) ---
  ✓ [PASS] PPTX conversion completes successfully
  ✓ [PASS] PPTX slide canvas geometry matches source within 1% tolerance
  ✓ [PASS] PPTX preserves text shapes & table frames
  ✓ [PASS] PPTX contains document title text
  ✓ [PASS] PPTX round-trip extracts structured table frame
  ✓ [PASS] PPTX writes explicit non-template color hex values

--- Step 4: HTML5 Writer Fidelity & Round-Trip (Item 1, 3, & 5) ---
  ✓ [PASS] HTML5 editable_flow conversion completes successfully
  ✓ [PASS] HTML5 flow mode generates semantic <article>, <h*>, <p> elements
  ✓ [PASS] HTML5 flow mode round-trips headings and paragraphs into IR
  ✓ [PASS] HTML5 exact_layout mode generates absolute positioned coordinate divs

--- Step 5: Markdown Writer & Fallback Logging (Item 4 & 5) ---
  ✓ [PASS] Markdown conversion completes successfully
  ✓ [PASS] Markdown generates GFM headings (#, ##)
  ✓ [PASS] Markdown generates GFM pipe table (| Metric | Value |)
  ✓ [PASS] Markdown round-trips headings and text into IR
  ✓ [PASS] Markdown conversion generates comprehensive fallback report
  ✓ [PASS] Logs APPROXIMATE fallback for subscript (<sub> HTML tag)
  ✓ [PASS] Logs IMPOSSIBLE fallback for text colors in standard markdown
  ✓ [PASS] Logs APPROXIMATE fallback for highlights (<mark> HTML tag)

--- Step 6: Writer Architecture Rules Verification (Item 2) ---
  ✓ [PASS] Rule 2.1: Canvas geometry explicitly set from IR across all writers
  ✓ [PASS] Rule 2.2: Explicit values written for font, size, color, bold, and indents (zero template defaults)
  ✓ [PASS] Rule 2.3: Real structures (tables, lists, headings) used in editable flow mode
  ✓ [PASS] Rule 2.4: XML generated only through serializer with escaping and package schema validation

===============================================================
TOTAL BATCH 5 CHECKS: 30
PASSED:               30
FAILED:               0
WRITER FIDELITY GATE: PASSED (100.0%)
===============================================================
```
