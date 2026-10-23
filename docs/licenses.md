# Open-Source Licenses & Dependency Audit

This document inventories all external libraries and WebAssembly engines utilized by Kiln Phase 2, recording their exact pinned versions, licenses, distribution constraints, and isolation strategies.

## 1. Engine & Dependency Inventory

| Engine / Library | Pinned Version | License | Used In Tools | Distribution & Isolation Notes |
|---|---|---|---|---|
| **pdf-lib** | `1.17.1` | MIT | Merge, Split, Extract, Remove, Organize, Rotate, Page Numbers, Watermark, Crop, Forms, Protect, Sign, Redact (overlay/vector) | Permissive. Shipped locally in `dist/assets/libs/`. Zero copyleft obligations. |
| **pdfjs-dist** | `3.11.174` | Apache-2.0 | Page rendering, text extraction layer, OCR alignment, visual diffing, verification oracle | Permissive. Compatible with MIT. Worker script loaded lazily. |
| **jszip** | `3.10.1` | MIT | Archive compression, multi-file extraction, batch ZIP packing | Permissive. Shipped locally. |
| **marked** | `12.0.0` | MIT | PDF to Markdown, Markdown to HTML/PDF | Permissive. Zero dependencies. |
| **js-yaml** | `4.1.0` | MIT | YAML structured conversions, configuration workflows | Permissive. |
| **tesseract.js** | `5.0.5` | Apache-2.0 | OCR PDF, PDF to Word (OCR), PDF to Excel (OCR) | Permissive. WASM binary and language traineddata (`eng`, `kor`, `chi_sim`) lazy-loaded on demand. |
| **sheetjs / xlsx** | `0.18.5` | Apache-2.0 | Excel to PDF, PDF to Excel (tabular reconstruction) | Permissive. Safe for commercial and open-source distribution. |
| **mammoth** | `1.6.0` | BSD-2-Clause | Word (DOCX) text & structure extraction | Permissive. |
| **pptxgenjs** | `3.12.0` | MIT | PDF to PowerPoint generation | Permissive. |
| **qpdf-wasm** | `11.6.0` | Apache-2.0 | PDF Repair (xref rebuild), Linearization, AES-256 decryption/encryption | Permissive. Native WASM module. |
| **mupdf-wasm** | `1.23.0` | AGPL-3.0 | *Optional Engine* (Advanced repair, aggressive compression) | **CAUTION**: AGPL-3.0 carries strong copyleft obligations. **Kiln Isolation Strategy**: mupdf-wasm is NOT bundled in the core distribution. Kiln defaults to MIT/Apache alternatives (`pdf-lib`, `pdfjs-dist`, `qpdf-wasm`). Any AGPL features are isolated behind explicit optional user plugin opt-in. |
| **ghostscript-wasm**| `10.02.1` | AGPL-3.0 | *Optional Engine* (PDF/A strict compliance validation) | **CAUTION**: AGPL-3.0 copyleft. Isolated from core distribution. Kiln uses pure client-side PDF/A XMP metadata injection with MIT tools. |

## 2. License Compatibility & Policy

1. **Permissive Core**: Kiln's core codebase is licensed under the **MIT License**. All default engines (`pdf-lib`, `pdfjs-dist`, `jszip`, `marked`, `sheetjs`, `tesseract.js`) are under MIT, Apache-2.0, or BSD licenses, ensuring clean redistribution without infectious copyleft terms.
2. **Strict AGPL Isolation**: In strict conformance with engineering best practices, no AGPL-licensed code is compiled into the primary application bundle. When AGPL engines are evaluated for benchmark comparisons or high-conformance PDF/A validation, they run in isolated sandbox boundaries and are documented honestly with Tier C/D badges.
3. **Attribution & Notice**: Full copyright notices and license texts for all third-party components are retained in their respective distribution artifacts under `dist/assets/libs/`.
