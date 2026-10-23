# iLovePDF Architecture & Feature Reconnaissance Analysis

## 1. Executive Summary
This document records the empirical analysis of the 33 PDF manipulation and transformation tools provided by iLovePDF, observed to guide the native client-side implementation of Kiln Phase 2. In accordance with project requirements, Kiln adopts an independent zero-server, offline-first browser architecture, borrowing zero code, text, or proprietary assets.

## 2. Tool Inventory & Functional Topology (33 Tools across 7 Groups)

| # | Tool ID | Group | Public Route | Input Types | Output Types | Primary Options & Parameters |
|---|---|---|---|---|---|---|
| 1 | `merge-pdf` | Organize | `/merge_pdf` | Multiple PDFs | Single PDF | Reorder/drag-sort files, retain bookmarks |
| 2 | `split-pdf` | Organize | `/split_pdf` | Single PDF | Multiple PDFs / ZIP | Custom ranges, fixed ranges (every N pages), file size chunks, smart split |
| 3 | `extract-pages` | Organize | `/split_pdf#split,extract` | Single PDF | PDF / ZIP | Extract all selected into one PDF, or extract each selected page into separate PDFs |
| 4 | `remove-pages` | Organize | `/remove-pages` | Single PDF | Single PDF | Selected page removal, comma/hyphen page range deletion (e.g., `1,3-5`) |
| 5 | `organize-pdf` | Organize | `/organize-pdf` | Single or Multiple PDFs | Single PDF | Interactive visual page grid, drag reorder, rotate page 90°/180°/270°, delete page, insert blank page, append pages |
| 6 | `scan-to-pdf` | Organize | `/scan-pdf` | Camera feed (getUserMedia) | Single PDF | Edge detection, perspective rectification, color/grayscale/B&W filters, multi-page capture |
| 7 | `compress-pdf` | Optimize | `/compress_pdf` | Single or Multiple PDFs | Compressed PDF(s) | Compression level: Extreme (high compression, lower quality), Recommended (balanced), Low (high quality, moderate compression); metadata/object stream cleanup |
| 8 | `repair-pdf` | Optimize | `/repair-pdf` | Damaged PDF | Recovered PDF | Rebuild cross-reference table (xref), recover orphaned object streams, salvage uncorrupted page trees |
| 9 | `ocr-pdf` | Optimize | `/ocr-pdf` | Scanned PDF | Searchable PDF | Language selector (English, Korean, Chinese, Japanese, German, Spanish, French, etc.), invisible text layer overlay |
| 10 | `image-to-pdf` | Convert to PDF | `/jpg_to_pdf` | JPG, PNG, WEBP, GIF, BMP, TIFF, HEIC | Single PDF | Page orientation (Portrait/Landscape), page size (Fit, A4, US Letter), margin (None, Small, Big), merge all into single PDF |
| 11 | `word-to-pdf` | Convert to PDF | `/word_to_pdf` | DOCX, DOC | Single PDF | Preserves headings, font styles, tables, embedded images, line spacing |
| 12 | `powerpoint-to-pdf` | Convert to PDF | `/powerpoint_to_pdf` | PPTX, PPT | Single PDF | Master slide rendering, slide aspect ratio (16:9 / 4:3), shapes, text boxes |
| 13 | `excel-to-pdf` | Convert to PDF | `/excel_to_pdf` | XLSX, XLS, CSV | Single PDF | Sheet selection, print area scaling, gridlines, fit-to-page |
| 14 | `html-to-pdf` | Convert to PDF | `/html-to-pdf` | HTML file, pasted markup, URL | Single PDF | Page format (A4, Letter), orientation, margins, screen/print media CSS |
| 15 | `pdf-to-jpg` | Convert from PDF | `/pdf_to_jpg` | Single PDF | JPG(s) / ZIP | Mode: Render pages to JPG (DPI selection: 72, 150, 300) or Extract embedded image streams (lossless original bytes) |
| 16 | `pdf-to-word` | Convert from PDF | `/pdf_to_word` | Single PDF | DOCX | Text reflow, paragraphs, table detection, OCR variant for scanned pages |
| 17 | `pdf-to-powerpoint` | Convert from PDF | `/pdf_to_powerpoint` | Single PDF | PPTX | 1 slide per PDF page, text frame reconstruction, OCR variant |
| 18 | `pdf-to-excel` | Convert from PDF | `/pdf_to_excel` | Single PDF | XLSX | Table grid detection, cell formula/number typing, multi-page tabular stitching |
| 19 | `pdf-to-pdfa` | Convert from PDF | `/convert-pdf-to-pdfa` | Single PDF | PDF/A | Conformance level: PDF/A-1b, PDF/A-2b, PDF/A-3b; embedded color profile (sRGB ICC), XMP metadata extension schema |
| 20 | `pdf-to-markdown` | Convert from PDF | `/pdf-to-markdown` | Single PDF | Markdown (.md) | Structured heading extraction (`#`, `##`), bullet/numbered lists, Markdown table formatting, link parsing |
| 21 | `edit-pdf` | Edit | `/edit-pdf` | Single PDF | Modified PDF | Add text (font, size, color, bold, italic), draw freehand, insert shapes (rect, circle, arrow, line), place images, move/resize elements |
| 22 | `rotate-pdf` | Edit | `/rotate_pdf` | Single or Multiple PDFs | Rotated PDF(s) | Clockwise 90°, 180°, 270°; apply to all pages or specific page range |
| 23 | `add-page-numbers` | Edit | `/add_pdf_page_number` | Single PDF | Numbered PDF | Position (9-point grid: top/bottom x left/center/right), format ("Page 1", "1 of N", "Page 1 of N"), font, size, color, range |
| 24 | `add-watermark` | Edit | `/pdf_add_watermark` | Single PDF | Watermarked PDF | Type: Text or Image; text string, font, opacity (10-100%), rotation (45°, custom), position grid, layer (over text / behind content) |
| 25 | `crop-pdf` | Edit | `/crop-pdf` | Single PDF | Cropped PDF | Interactive bounding box crop, numerical margin inputs (top, bottom, left, right in pt/mm), apply to all pages or selection |
| 26 | `pdf-forms` | Edit | `/pdf-forms` | Single PDF | Interactive / Flattened PDF | Detect form fields, fill text fields, toggle checkboxes/radio buttons, select dropdowns, flatten AcroForms, export JSON form data |
| 27 | `unlock-pdf` | Security | `/unlock_pdf` | Password-protected PDF | Unencrypted PDF | Decrypt using user-provided password, strip owner permission flags (print, copy, edit restrictions). No brute-forcing |
| 28 | `protect-pdf` | Security | `/protect-pdf` | Unencrypted PDF | Encrypted PDF | Set user password (open password) and owner password (permissions password); AES-256 encryption; permission restrictions |
| 29 | `sign-pdf` | Security | `/sign-pdf` | Single PDF | Signed PDF | Signature modes: Draw on canvas, type cursive font, upload image signature; drag & drop signature, date, and initials fields |
| 30 | `redact-pdf` | Security | `/redact-pdf` | Single PDF | Sanitized PDF | True destructive redaction (strips underlying text tokens, vector paths, and raster bitmap pixels); Smart redaction patterns |
| 31 | `compare-pdf` | Security | `/compare-pdf` | 2 PDF revisions | Comparison PDF / View | Side-by-side split comparison, overlay blend, visual pixel difference heatmap, text addition/deletion diff summary |
| 32 | `pdf-summarize` | Intelligence | `/pdf-summarize` | Single PDF | Summary (Markdown/Text) | Executive summary, key takeaways, chapter breakdown, FAQ extraction; Local WebGPU / BYO-API key with full privacy confirmation |
| 33 | `translate-pdf` | Intelligence | `/translate-pdf` | Single PDF | Translated PDF | Target language selection, layout-preserving in-place text replacement, CJK/RTL font handling, BYO-API key with data audit |

## 3. Sandboxed Architectural Differences
Unlike iLovePDF's cloud-dependent processing (where files are uploaded to remote clusters), Kiln enforces 100% client-side WebAssembly and JavaScript operations:
1. **Privacy**: Files never leave the browser heap or communicate with an external server.
2. **Deterministic Validation**: Every transformed PDF is subjected to an independent secondary parser check before being made available for display.
3. **Graceful Tier Labeling**: Operations with browser sandbox limitations (such as P2P phone hand-off requiring WebRTC STUN/TURN signaling or direct CORS-restricted URL fetching) are honestly identified as Tier D.
