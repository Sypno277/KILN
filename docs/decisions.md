# Engineering Decisions Record

## 1. Stack Selection
- **Decision**: Zero-dependency static architecture (HTML5, Modern CSS, ES Modules) accompanied by a Node.js build generator script (`scripts/build.js`) and static server (`server.js`).
- **Rationale**: Reverse engineering evidence from REA and network traces proved that the target website uses no heavy client frameworks (React, Vue, Next.js). It is delivered as static pre-rendered HTML with two lightweight ES modules (`main.js` and `downloads.js`). Preserving this exact architecture guarantees maximum performance, identical caching behavior, and exact visual/interaction fidelity.

## 2. In-Browser Conversion vs Simulation
- **Decision**: Implement the interactive demo conversion using the original client-side simulation.
- **Rationale**: Analysis of `main.js` (`convert()`, lines 241–258) proved that the original demo does not perform real binary conversion in-browser; it simulates conversion with an animated progress ring counting from 0% to 100% over 1000ms with cubic easing, displays a checkmark, and generates a formatted chip in the results list. Reproducing this exact simulation achieves 100% behavioral parity with zero unnecessary WASM bloat.

## 3. Data-Driven Generation of 82 Conversion Guides
- **Decision**: Rather than hand-copying 82 conversion guide pages across 3 languages (246 pages), a crawler script parsed each guide's DOM structure into a normalized JSON dataset (`src/data/guides.json`).
- **Rationale**: Ensures complete accuracy across breadcrumbs, format pair badges, 3-step instructions, feature lists, about cards, and schema.org JSON-LD structured data.

## 4. Local Media Assets Storage
- **Decision**: Download all original video files (`.mp4`), poster images, screenshots, badges, and icons into `public/` and serve them locally from `dist/media/`.
- **Rationale**: Adheres to the prompt requirement: "Do not hotlink the original at runtime." Local video streaming is fully supported via HTTP 206 partial content range requests in `server.js`.

## 5. Dual Asset Resolution
- **Decision**: Provide both clean asset paths (`/assets/styles.css`, `/assets/main.js`, `/assets/downloads.js`) and hashed copies (`/assets/styles.3a73bf9e74.css`, `/assets/main.dc161caed7.js`, `/assets/downloads.65899ced11.js`) in `dist/assets/`.
- **Rationale**: Guarantees that any internal reference or script tag succeeds whether using clean or version-hashed paths.

## 6. Kiln Phase 2: Complete 33-Tool PDF Suite Architecture
- **Decision**: Implement all 33 tools natively in-browser using pure client-side engines (`pdf-lib`, `pdfjs-dist`, `jszip`, `marked`, `tesseract.js`) without server roundtrips.
- **Rationale**: Fulfills the Kiln core commitment of zero data leakage. All processing occurs strictly within the user's browser memory heap.

## 7. Licensing & AGPL Engine Isolation
- **Decision**: Retain MIT/Apache-2.0 permissively licensed engines (`pdf-lib`, `jszip`, `pdfjs-dist`) for the standard Kiln bundle. AGPL engines (`mupdf-wasm`, `ghostscript-wasm`) are isolated as optional modular add-ons to prevent infectious copyleft constraints on the primary codebase.
- **Rationale**: Detailed in `docs/licenses.md`. Preserves commercial and open-source distribution flexibility.

## 8. Truth-in-Advertising Governance on Sandbox Boundaries (Tier D)
- **Decision**: Honestly classify browser-restricted routes as Tier D rather than using deceptive proxies or silent failures:
  - Direct Remote URL to PDF (blocked by browser CORS policy).
  - Request Signatures from Others (requires centralized stateful coordination servers).
  - Cloud Pickers for Google Drive / Dropbox (requires centralized secret-holding OAuth backends).
  - Phone P2P camera link without external STUN/TURN/Signaling server.
- **Rationale**: A converter that fails loudly or honestly indicates constraints is acceptable. A converter that silently fails or leaks data to third parties is not.

## 9. On-Screen Retention (No Unsolicited File Downloads)
- **Decision**: Processed PDF documents and converted outputs remain displayed on-screen in the visual inspector/workbench and session history without triggering unsolicited browser disk downloads.
- **Rationale**: Conforms strictly to user requirements to eliminate automatic downloading and preserve memory-only local execution.
