# BATCH 3: Canonical Document Model (IR) Specification

> **Status**: PROPOSED DESIGN SPECIFICATION & GAP AUDIT  
> **Directive**: Design complete model, define mapping from current code, and identify minimum change set. **Wait for approval before coding.**

---

## 1. Document Architecture & Unified Geometry

The Intermediate Representation (IR) organizes all document content into a strict 4-level hierarchy:

```
[DocumentIR]
  ├── metadata: { descriptive, technical, structural, process }
  ├── sections: [ { sectionIndex, pageIndices, pageGeometry } ]
  └── pages: [
        ├── pageNumber, widthEmu, heightEmu, orientation, rotation
        └── blocks: [
              ├── type: "paragraph" | "heading" | "list" | "table" | "image" | "shape" | "equation" | "annotation" | "unsupported"
              ├── id: string (unique provenance identifier)
              ├── provenance: { sourcePageIndex, sourceBBoxEmu, elementId }
              ├── degradation: { editable, visual, archival }
              └── data: <BlockSpecificPayload>
                    └── inlines: [
                          ├── type: "text" | "break" | "tab" | "link" | "math_symbol" | "footnote_ref"
                          ├── text: string
                          ├── provenance: { sourceBBoxEmu }
                          └── rPr: <RunProperties>
                        ]
      ]
```

### Unified Coordinate Unit: English Metric Unit (EMU)
To eliminate floating-point drift, optical distortion, and rounding errors across Word (twips), PowerPoint (EMUs), PDF (points), and Web (pixels), all spatial measurements inside the IR are stored as **64-bit integer EMUs**:

$$\begin{aligned}
1 \text{ pt} &= 12,700 \text{ EMU} \\
1 \text{ in} &= 914,400 \text{ EMU} \\
1 \text{ mm} &= 36,000 \text{ EMU} \\
1 \text{ px (96 DPI)} &= 9,525 \text{ EMU} \\
1 \text{ twip} &= 635 \text{ EMU}
\end{aligned}$$

---

## 2. Block-Level Specifications

### 2.1 Paragraph Block (`type: "paragraph"`)
```json
{
  "type": "paragraph",
  "id": "p1_b2",
  "provenance": { "sourcePageIndex": 1, "sourceBBoxEmu": { "x": 457200, "y": 914400, "w": 5486400, "h": 254000 } },
  "paragraphData": {
    "alignment": "left", // "left" | "center" | "right" | "both" | "unset"
    "spacingBeforeEmu": 127000,
    "spacingAfterEmu": 0,
    "lineSpacingEmu": 152400,
    "indents": {
      "leftEmu": 0,
      "hangingEmu": 0,
      "firstLineEmu": 254000
    },
    "styleName": "Normal",
    "inlines": [ /* Inline Runs */ ]
  }
}
```

### 2.2 Heading Block (`type: "heading"`)
```json
{
  "type": "heading",
  "id": "p1_h1",
  "provenance": { "sourcePageIndex": 1, "sourceBBoxEmu": { "x": 457200, "y": 635000, "w": 5486400, "h": 381000 } },
  "headingData": {
    "level": 1, // 1 to 6
    "outlineLevel": 1,
    "styleName": "Heading 1",
    "anchor": "executive-summary",
    "inlines": [ /* Inline Runs */ ]
  }
}
```

### 2.3 List Block (`type: "list"`)
```json
{
  "type": "list",
  "id": "p1_list1_item1",
  "provenance": { "sourcePageIndex": 1, "sourceBBoxEmu": { "x": 457200, "y": 1270000, "w": 5486400, "h": 228600 } },
  "listData": {
    "listId": "list_1",
    "level": 0, // 0 to 8 nesting
    "isOrdered": false,
    "markerText": "•",
    "hangingIndentEmu": 228600,
    "inlines": [ /* Inline Runs */ ]
  }
}
```

### 2.4 Table Block (`type: "table"`)
```json
{
  "type": "table",
  "id": "p1_tbl1",
  "provenance": { "sourcePageIndex": 1, "sourceBBoxEmu": { "x": 457200, "y": 2540000, "w": 5486400, "h": 1905000 } },
  "tableData": {
    "rowCount": 3,
    "colCount": 2,
    "colWidthsEmu": [ 2743200, 2743200 ],
    "hasHeaderRow": true,
    "rows": [
      {
        "rowIndex": 0,
        "isHeader": true,
        "cells": [
          {
            "colIndex": 0,
            "colSpan": 1,
            "rowSpan": 1,
            "shadingHex": "#F3F4F6",
            "borders": { "top": "single", "bottom": "single", "left": "none", "right": "none" },
            "blocks": [ /* Paragraph blocks within cell */ ]
          }
        ]
      }
    ]
  }
}
```

### 2.5 Equation Block (`type: "equation"`)
```json
{
  "type": "equation",
  "id": "p1_eq1",
  "provenance": { "sourcePageIndex": 1, "sourceBBoxEmu": { "x": 457200, "y": 4826000, "w": 3810000, "h": 381000 } },
  "equationData": {
    "isDisplayMode": true,
    "rawLatex": "\\alpha + \\beta = \\sum_{i=1}^n x_i",
    "rawMathML": "<math xmlns='http://www.w3.org/1998/Math/MathML'>...</math>",
    "unicodeFallback": "α + β = ∑ x_i",
    "inlines": [ /* Run tokens */ ]
  }
}
```

### 2.6 Unsupported Container Block (`type: "unsupported"`)
```json
{
  "type": "unsupported",
  "id": "p1_unsupported_3d_mesh",
  "provenance": { "sourcePageIndex": 1, "sourceBBoxEmu": { "x": 914400, "y": 6350000, "w": 2540000, "h": 1905000 } },
  "unsupportedData": {
    "constructType": "3D_ANNOTATION_U3D",
    "reason": "Target OpenXML does not support U3D interactive viewport",
    "warning": "[WARN:UNSUPPORTED] 3D mesh preserved as high-DPI raster fallback crop",
    "rasterCropPngBase64": "data:image/png;base64,iVBORw0KGgoAAAANSU...",
    "rawAttributes": { "subtype": "/3D", "streamLength": 45082 }
  }
}
```

---

## 3. Inline Run Properties (`rPr`)

```json
{
  "type": "text",
  "text": "Critical Safety Threshold",
  "provenance": { "sourcePageIndex": 1, "sourceBBoxEmu": { "x": 457200, "y": 914400, "w": 1828800, "h": 152400 } },
  "rPr": {
    "fontFamily": "Arial",
    "fontSizeEmu": 139700, // 11 pt * 12,700
    "bold": true,
    "italic": false,
    "underline": false,
    "strike": false,
    "color": {
      "normalizedHex": "#E01C47",
      "raw": {
        "colorSpace": "DeviceRGB",
        "values": [ 0.88, 0.11, 0.28 ]
      }
    },
    "highlightHex": "#FEF08A",
    "vertAlign": "baseline", // "baseline" | "superscript" | "subscript"
    "baselineOffsetEmu": 0,
    "linkTarget": null
  }
}
```

---

## 4. Metadata Schema (Four First-Class Envelopes)

```json
{
  "metadata": {
    "descriptive": {
      "title": "Quarterly Financial Analysis",
      "creator": "Jane Doe",
      "subject": "Q3 Telemetry",
      "keywords": [ "finance", "audit", "2026" ],
      "language": "en-US",
      "rights": "Confidential"
    },
    "technical": {
      "sourceFormat": "PDF",
      "sourceSizeBytes": 458920,
      "sourceSha256": "4a72d3...e81c",
      "pageCount": 14,
      "colorProfiles": [ "sRGB IEC61966-2.1" ]
    },
    "structural": {
      "outline": [
        { "title": "1. Executive Summary", "pageIndex": 1, "destY": 792, "children": [] }
      ],
      "bookmarks": { "exec_sum": { "pageIndex": 1, "y": 792 } },
      "readingOrder": "spatial_topological_sort"
    },
    "process": {
      "generator": "Kiln ConverterEngine v1.0.0",
      "gitCommit": "3e36065",
      "timestamp": "2026-10-23T19:45:00.000Z",
      "tools": { "pdfjs": "3.11.174", "jszip": "3.10.1", "pdflib": "1.17.1" }
    }
  }
}
```

---

## 5. Mapping from Current Code & Minimum Change Set

### Current State:
`ConverterEngine.prototype.buildDocumentIR` in [`public/assets/converter-engine.js`](file:///d:/My%20Projects/Filee/public/assets/converter-engine.js#L3989) already implements:
- Core 4-level structure: `docIR` $\to$ `sections` $\to$ `pages` $\to$ `blocks` $\to$ `inlines`.
- Coordinate calculations in integer EMUs (`x * 12700`).
- Basic metadata envelope: `title`, `creator`, `buildStamp`, `provenance`.
- `table`, `paragraph`, `image`, `link`, and `unsupported` block types.
- Dual color tracking (`normalizedHex` + `raw.colorSpace`).

### The Minimum Change Set to Achieve 100% Compliance:
1. **Metadata Envelope Formalization**: Expand `metadata` from a flat object into the 4 structured sub-envelopes (`descriptive`, `technical`, `structural`, `process`).
2. **Explicit Block Types for Headings & Equations**:
   - Currently, headings are tagged as `paragraph` with `isHeading: true`. Formalize them as top-level `type: "heading"` blocks with `headingData.level`.
   - Formalize math formulas as top-level `type: "equation"` blocks with `equationData.rawLatex` and `equationData.unicodeFallback`.
3. **Raster Crop Capture for Unsupported Containers**:
   - In `unsupportedData`, attach `rasterCropPngBase64` so visual elements that cannot be represented natively are preserved as high-resolution image crops.
4. **Degradation Directives**:
   - Add a `degradation` descriptor to each block (`degradation: { editable: "...", visual: "...", archival: "..." }`) so writers can execute automated graceful degradation per mode.

---

*This specification is submitted for review and approval. No code changes have been committed.*
