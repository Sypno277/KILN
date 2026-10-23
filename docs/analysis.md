# Filee Website Reverse Engineering Analysis

## 1. Overview and Target Identity
- **Target URL**: `https://filee.sh/`
- **Variants**: English (`/`), Korean (`/ko/`), Simplified Chinese (`/zh-cn/`), Formats catalog (`/formats/`), CLI guide (`/cli/`), and 82 conversion guides (`/convert/<from>-to-<to>/`).
- **Application Context**: Markets Filee, an MIT-licensed offline file converter for Windows (with macOS and Linux previews) by KnifeLemon (`https://github.com/KnifeLemon/Filee`).
- **Architectural Scope**: Purely static frontend served via Cloudflare CDN. All interactive conversion behaviors on the website are client-side simulated demonstrations; no server-side conversion or user data uploads occur.

---

## 2. Network and Asset Inventory

### 2.1 Core Assets
| Asset URL | File Type | Size (Bytes) | Role & Cache Strategy |
|---|---|---|---|
| `https://filee.sh/` | HTML Document | ~69 KB | Entry document, preloads poster, loads CSS & JS modules |
| `https://filee.sh/assets/styles.3a73bf9e74.css` | CSS Stylesheet | 49,659 B | Unified design system, tokens, responsive layout, animations |
| `https://filee.sh/assets/main.dc161caed7.js` | ES Module JS | 30,477 B | Core interaction logic: nav, reveal, demo, tilt, download guide |
| `https://filee.sh/assets/downloads.65899ced11.js` | ES Module JS | 2,054 B | Dynamic release resolution and OS download targeting logic |
| `https://filee.sh/site.webmanifest` | Manifest | 422 B | PWA configuration, theme colors `#7F77DD` / `#16151F` |
| `https://filee.sh/favicon.svg` | SVG Icon | 1,056 B | Vector favicon (donut icon geometry) |
| `https://filee.sh/favicon-32.png` | PNG Icon | 2,354 B | Raster 32x32 favicon |
| `https://filee.sh/apple-touch-icon.png` | PNG Icon | 9,667 B | iOS home screen icon |

### 2.2 Media Assets
| Media URL | Resolution / Type | Size | Usage Location |
|---|---|---|---|
| `/media/og-en.jpg` | 1200x630 JPEG | 65,486 B | Open Graph & Twitter Card social preview |
| `/media/poster-en.jpg` | 1280x720 JPEG | 46,584 B | Video poster for English demo video |
| `/media/poster-ko.jpg` | 1280x720 JPEG | 47,706 B | Video poster for Korean demo video |
| `/media/poster-zh-CN.jpg` | 1280x720 JPEG | 47,961 B | Video poster for Simplified Chinese demo video |
| `/media/promo-en.mp4` | 1280x720 H.264 | 7,171,067 B | 27-second promo video (English UI) |
| `/media/promo-ko.mp4` | 1280x720 H.264 | 7,137,092 B | 27-second promo video (Korean UI) |
| `/media/promo-zh-CN.mp4` | 1280x720 H.264 | 7,174,093 B | 27-second promo video (Chinese UI) |
| `/media/screens/page-toolbar-en.webp` | 1080x820 WebP | 60,164 B | Gallery: Donut toolbar editor screenshot |
| `/media/screens/page-home-en.webp` | 1080x820 WebP | 17,784 B | Gallery: Home screen drop zone screenshot |
| `/media/screens/page-presets-en.webp` | 1080x820 WebP | 37,770 B | Gallery: Preset editor screenshot |
| `/media/screens/page-toolbar-dark.webp` | 1080x820 WebP | 60,396 B | Gallery: Dark mode toolbar screenshot |
| `/media/badges/alternativeto-dark.svg` | SVG | 7,325 B | Footer badge (dark mode) |
| `/media/badges/alternativeto-light.svg` | SVG | 7,345 B | Footer badge (light mode) |

### 2.3 Typography
- Google Fonts: `Inter` (`wght@400;500;600;700;800`) loaded from `fonts.googleapis.com` / `fonts.gstatic.com`.
- Font stack fallback: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- Korean font fallback: `Inter, system-ui, -apple-system, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`.
- Chinese font fallback: `Inter, system-ui, -apple-system, "Microsoft YaHei", "PingFang SC", sans-serif`.

### 2.4 External Network Requests on Page Load
1. `GET https://fonts.googleapis.com/...` (Inter font stylesheet)
2. `GET https://fonts.gstatic.com/...` (Inter woff2 font files)
3. `GET https://www.googletagmanager.com/gtag/js?id=G-0Q2YHDJHEL` (Google Analytics tag)
4. `POST https://www.google-analytics.com/g/collect?...` (Analytics hit)
5. `GET https://static.cloudflareinsights.com/beacon.min.js/...` (Cloudflare analytics)
6. `GET https://api.github.com/repos/KnifeLemon/Filee` (GitHub stars, cached in `localStorage['filee-repo']` for 1h)
7. `GET https://api.github.com/repos/KnifeLemon/Filee/releases/latest` (Latest release metadata, cached in `localStorage['filee-release-v3']` for 1h)

---

## 3. Site Map & Route Hierarchy

From `sitemap.xml` and crawl verification, the site has exactly **255 pages** total (85 routes × 3 languages):

1. **Home Pages** (3):
   - `/` (English)
   - `/ko/` (Korean)
   - `/zh-cn/` (Simplified Chinese)
2. **Catalog Pages** (3):
   - `/formats/`
   - `/ko/formats/`
   - `/zh-cn/formats/`
3. **Command Line Pages** (3):
   - `/cli/`
   - `/ko/cli/`
   - `/zh-cn/cli/`
4. **Conversion Guides** (246 pages: 82 unique routes × 3 languages):
   - `/convert/<from>-to-<to>/` (82 pages)
   - `/ko/convert/<from>-to-<to>/` (82 pages)
   - `/zh-cn/convert/<from>-to-<to>/` (82 pages)
5. **Special Files**:
   - `/robots.txt` (Allows all, declares sitemap)
   - `/sitemap.xml` (Full sitemap with alternate hreflang and video metadata)

---

## 4. Visual Evidence & Responsive Breakpoints

Visual captures of the original site were recorded using Playwright Chromium across three standard breakpoints in both color schemes:
- **375px × 812px (Mobile)**:
  - Light mode: `recon/screenshots/orig-375-light.png` (173 KB)
  - Dark mode: `recon/screenshots/orig-375-dark.png` (113 KB)
- **768px × 1024px (Tablet)**:
  - Light mode: `recon/screenshots/orig-768-light.png` (256 KB)
  - Dark mode: `recon/screenshots/orig-768-dark.png` (201 KB)
- **1440px × 900px (Desktop)**:
  - Light mode: `recon/screenshots/orig-1440-light.png` (436 KB)
  - Dark mode: `recon/screenshots/orig-1440-dark.png` (368 KB)

---

## 5. JavaScript Architecture & Deep Behavioral Analysis

### 5.1 Interactive "Try It Here" Donut Demo
- **Source**: `recon/assets/main.js` (lines 18–425), embedded data in `<script id="demo-data" type="application/json">`.
- **Files Available on Stage**:
  1. `trip.heic` (`image` profile, center text `1 HEIC`)
  2. `clip.mov` (`video` profile, center text `1 MOV`)
  3. `report.docx` (`document` profile, center text `1 DOCX`)
- **Donut Geometry**:
  - SVG viewBox: `-110 -110 220 220`.
  - Outer radius `R_OUT = 96`, Inner radius `R_IN = 40`.
  - Pop offset for hovered segment: `POP = 7px`.
  - Each annular sector is rendered as `<path d="M... A... L... A... Z">` with mathematical coordinates clockwise starting from 12 o'clock (`-Math.PI / 2`).
  - Slices have `--dx` and `--dy` custom properties calculated via `cos(mid) * 7px` and `sin(mid) * 7px`.
- **Interaction Modes**:
  1. **Pointer Drag Mode**:
     - `pointerdown` initiates pending session.
     - Moving past `DRAG_THRESHOLD = 6px` launches drag mode.
     - Donut opens at cursor `(x, y)` clamped to viewport: `Math.min(Math.max(x, half + 8), innerWidth - half - 8)`.
     - Ghost clone of `.file-icon` follows cursor.
     - `hitTest(x, y)` evaluates distance from donut center. If `dist < 40` (hub) or `dist > 132`, returns `-1` (cancel). If within ring, computes slice index: `Math.round((atan2(dy, dx) + PI/2) / span)`.
     - Releasing over slice initiates simulated conversion. Releasing in center or outside cancels and flashes `Cancelled` status.
  2. **Click & Keyboard Mode**:
     - Clicking or pressing `Enter` / `Space` on a file opens the donut centered on the button.
     - `ArrowRight` / `ArrowDown` increments hover index; `ArrowLeft` / `ArrowUp` decrements.
     - `Enter` / `Space` selects currently focused slice.
     - `Escape` closes with cancel message; `Tab` dismisses immediately.
  3. **Simulated Conversion & Progress Ring**:
     - The conversion is **100% simulated client-side**: no WebAssembly or server conversion.
     - Triggers `progressRing(host, x, y)`: an SVG circle with radius 44 (`circumference = 276.46`).
     - Counts `0%` to `100%` over `1000ms` with cubic easing `1 - (1 - p) ** 2.2`.
     - Replaces percentage with SVG checkmark path `M42 63l13 13 27-28` (`.is-done`).
     - Adds converted result chip to `.demo-results` (maximum 6 items preserved).
  4. **Autoplay Simulation**:
     - If user has not interacted, when `.demo` enters viewport (`threshold: 0.6`), after 1300ms an automated mouse glide triggers: opens `trip.heic`, glides cursor to segment 1 (`JPG`), hovers, glides to segment 0 (`PNG`), drops, and completes conversion.

### 5.2 Animated Format Ticker (Marquee)
- Two horizontal rows of format pills: Row 1 flows left, Row 2 flows right (`.reverse`).
- CSS keyframe animation `@keyframes marquee` scrolling `translateX(-50%)` infinitely over 60s (pause on hover).

### 5.3 Card Tilt Effect
- On fine pointer devices, elements with `[data-tilt]` calculate relative pointer offsets `x` and `y` from card rect.
- Applies CSS variables `--mx`, `--my`, and 3D tilts `--rx: ((0.5 - y) * 6)deg`, `--ry: ((x - 0.5) * 6)deg`.

### 5.4 Download Section & OS Resolution
- Supported download targets: `win-x64`, `linux-x64`, `linux-arm64`, `osx-arm64`, `osx-x64`.
- Auto-detected using `navigator.userAgentData.platform` and `navigator.userAgent`.
- Pulls live release metadata from GitHub API; falls back gracefully to static bundled defaults if rate limited or offline.
- Windows download clicks trigger native `<dialog class="download-guide">` explaining the SmartScreen prompt.

### 5.5 Language Switcher & Auto-Detection
- Header language menu using native `<details class="lang-menu">`.
- Auto-detection banner appears after 1200ms if browser language differs from current page, unless `localStorage['filee-lang-chosen']` is set.
- English home root `/` has immediate inline `<script>` redirecting if no referrer and language matches `ko` or `zh`.

### 5.6 Theme Handling
- Supports both Light and Dark themes via `prefers-color-scheme: dark`.
- CSS variable system switches background (`#f8f8fb` -> `#121118`), surfaces (`#ffffff` -> `#1c1b26`), borders, and text tokens automatically without external classes.
- `<meta name="theme-color">` dynamically set for light (`#7F77DD`) and dark (`#16151F`).

---

## 6. Feature Inventory Table

| Feature | Where | How It Works | Evidence | Confidence |
|---|---|---|---|---|
| **Radial Donut Menu** | Home Hero Demo | SVG dynamic sector generation, hit testing, CSS pop transforms | `main.js:62-157`, `demo-data` JSON | High (100%) |
| **Pointer Drag & Ghost** | Home Hero Demo | `setPointerCapture`, `DRAG_THRESHOLD = 6px`, clone node positioning | `main.js:200-289` | High (100%) |
| **Keyboard Accessibility** | Home Hero Demo | Arrow keys navigate segments, Enter/Space converts, Esc cancels | `main.js:313-323` | High (100%) |
| **Conversion Simulation** | Home Hero Demo | Client-side progress ring (1000ms eased count-up), list update | `main.js:241-258`, `main.js:395-425` | High (100%) |
| **Demo Autoplay** | Home Hero Demo | IntersectionObserver triggers auto pointer glide and simulated drop | `main.js:335-392` | High (100%) |
| **Format Marquee** | Home `#formats` | Dual CSS marquee tracks with mirrored items, pause on hover | `styles.css:1020-1070`, `home.html` | High (100%) |
| **3D Bento Card Tilt** | Home `#features` | Pointermove computes relative angle, sets CSS transform vars | `main.js:661-678` | High (100%) |
| **Scroll Reveal** | All Pages | IntersectionObserver adds `.is-visible` to `[data-reveal]` | `main.js:429-440` | High (100%) |
| **Lazy Video Player** | Home `#video` | Video loads `data-src` on scroll intersection, autoplays muted | `main.js:443-458` | High (100%) |
| **FAQ Accordion** | Home `#faq` | Native HTML `<details>` and `<summary>` with animated chevron | `home.html:faq`, `styles.css` | High (100%) |
| **OS Target Picker** | Home `#download` | Select dropdown switches download target, updates link and status | `main.js:525-565`, `downloads.js` | High (100%) |
| **SmartScreen Guide** | Home / Convert | Native `<dialog>` modal opens on `.exe` download click | `main.js:576-611` | High (100%) |
| **Lang Suggestion Banner** | Bottom fixed | Detects `navigator.languages`, suggests localized URL | `main.js:614-644` | High (100%) |
| **Sticky Navbar** | Header | Toggles `.is-scrolled` when `scrollY > 8` | `main.js:645-650` | High (100%) |
| **Format Catalog Table** | `/formats/` | 17 categories, 244 formats, routing tables with badges | `formats-en.html`, `catalog-en.json` | High (100%) |
| **CLI Documentation** | `/cli/` | Terminal mockups, command options, watch folder diagrams | `cli-en.html` | High (100%) |
| **82 Conversion Guides** | `/convert/*` | Step-by-step guides, tags, pair visual, about articles | `guides.json`, 82 crawl records | High (100%) |
| **Structured Data** | All Pages | Schema.org `SoftwareApplication`, `VideoObject`, `FAQPage`, `HowTo` | HTML `<script type="application/ld+json">` | High (100%) |
| **Robots & Sitemap** | Root `/` | `robots.txt` + `sitemap.xml` listing 255 URLs with hreflang | `robots.txt`, `sitemap.xml` | High (100%) |

---

## 7. Residual Unknowns & Assumptions Flagged
- **None**: Every feature has been traced directly to its exact lines of code, network calls, DOM elements, and visual screenshots. All assets have been downloaded and verified locally.
