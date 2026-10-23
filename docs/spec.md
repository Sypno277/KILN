# Filee Website Reconstruction Specification

## 1. System Architecture & Route Blueprint

The website is a static multi-page application (MPA) with 255 pages across 3 supported languages (`en`, `ko`, `zh-CN`). All pages share a single unified CSS stylesheet (`assets/styles.css`) and modular client-side script (`assets/main.js` + `assets/downloads.js`).

### 1.1 Complete Route Mapping (255 URLs)
```
/                            (Home - English)
/ko/                         (Home - Korean)
/zh-cn/                      (Home - Simplified Chinese)

/formats/                    (Format Catalog - English)
/ko/formats/                 (Format Catalog - Korean)
/zh-cn/formats/              (Format Catalog - Simplified Chinese)

/cli/                        (CLI Guide - English)
/ko/cli/                     (CLI Guide - Korean)
/zh-cn/cli/                  (CLI Guide - Simplified Chinese)

/convert/<slug>/             (82 Conversion Guides - English)
/ko/convert/<slug>/          (82 Conversion Guides - Korean)
/zh-cn/convert/<slug>/       (82 Conversion Guides - Simplified Chinese)

/robots.txt                  (Robots policy)
/sitemap.xml                 (Full XML sitemap with hreflang alternate links)
/site.webmanifest            (PWA Web Manifest)
```

---

## 2. Design Tokens & Visual Specifications

### 2.1 Color Tokens
| Token Name | Light Value | Dark Value (`prefers-color-scheme: dark`) | Role |
|---|---|---|---|
| `--bg` | `#f7f6f2` | `#0f0e16` | Viewport background |
| `--surface` | `#ffffff` | `#1a1924` | Primary card / window background |
| `--surface-2` | `#f1efea` | `#232230` | Secondary surface / titlebar / table header |
| `--ink` | `#1c1b22` | `#f2f1f7` | Primary text and headings |
| `--muted` | `#5f5d69` | `#a3a1b3` | Secondary text, captions, subtitles |
| `--line` | `rgba(28, 27, 34, 0.09)` | `rgba(255, 255, 255, 0.09)` | Card and section borders |
| `--accent` | `#7f77dd` | `#7f77dd` | Brand lavender / interactive primary |
| `--accent-strong` | `#5b53c8` | `#5b53c8` | Gradient endpoint, hover state |
| `--accent-deep` | `#3c3489` | `#c9c4ff` (text variant) | Badge text, logo mark accent |
| `--accent-soft` | `#ecebfb` | `rgba(127, 119, 221, 0.16)` | Selection, pill background, hover state |
| `--green` | `#1d9e75` | `#1d9e75` | Accent leaf, badge dot, success state |
| `--segment` | `#f4f2ee` | `#2a2937` | Donut radial segment background |
| `--shadow` | `0 30px 80px -30px rgba(60, 52, 137, 0.35), 0 8px 24px -12px rgba(28, 27, 34, 0.18)` | `0 30px 80px -30px rgba(0, 0, 0, 0.7), 0 8px 24px -12px rgba(0, 0, 0, 0.5)` | Modal / window elevation |

### 2.2 Category Color Tokens
| Category | ID | Color Hex | Format Count | Builtin vs Optional |
|---|---|---|---|---|
| Images | `images` | `#378add` | 36 formats | Built-in + FFmpeg |
| Vector Graphics | `vector` | `#d4537e` | 12 formats | Built-in + LibreOffice, Ghostscript |
| PDF | `pdf` | `#e5252a` | 1 format | Built-in + Ghostscript, LibreOffice |
| Documents | `documents` | `#2b579a` | 23 formats | Built-in + Pandoc, LibreOffice |
| HWP (Hangul) | `hwp` | `#1b7fc4` | 2 formats | Built-in |
| Spreadsheets | `spreadsheets` | `#1d7a46` | 13 formats | Built-in + LibreOffice |
| Presentations | `presentations` | `#c8502e` | 11 formats | Built-in + LibreOffice |
| Text & Markup | `text` | `#5f5e5a` | 14 formats | Built-in + Pandoc |
| Data | `data` | `#4d7c0f` | 6 formats | Built-in |
| E-books & Comics | `ebooks` | `#8a5cc2` | 24 formats | Built-in + Calibre |
| Video | `video` | `#9c36b5` | 22 formats | FFmpeg |
| Audio | `audio` | `#0f9d8a` | 30 formats | FFmpeg |
| Subtitles | `subtitles` | `#4f46e5` | 9 formats | Built-in + FFmpeg |
| Archives | `archives` | `#b7791f` | 28 formats | Built-in |
| CAD Drawings | `cad` | `#0e7490` | 2 formats | Built-in |
| 3D Models | `models` | `#be185d` | 6 formats | Built-in |
| Fonts | `fonts` | `#4b5563` | 5 formats | Built-in |

### 2.3 Typography & Font Stacks
```css
--font: Inter, "Pretendard Variable", Pretendard, -apple-system, "Segoe UI", system-ui, "Noto Sans KR", "Noto Sans SC", sans-serif;
```
- Base font size: `17px`, line-height: `1.6`.
- Headings: `line-height: 1.12`, `letter-spacing: -0.03em`.
- Hero Title clamp: `clamp(52px, 7.4vw, 100px)`, weight `820`, `letter-spacing: -0.05em`.
- Mobile/CJK Hero Title clamp: `clamp(46px, 6.4vw, 88px)`, weight `820`, `letter-spacing: -0.04em`.

### 2.4 Layout & Spacing Breakpoints
- Container max width: `1180px`.
- Mobile Breakpoint: `< 768px` (single column hero, simplified mobile nav, horizontal touch hints).
- Tablet Breakpoint: `768px - 1024px` (grid adjusts to 2 columns for bento cards, compressed header).
- Desktop Breakpoint: `> 1024px` (full 2-column hero with 460px min-height demo window, 3-column bento grid, 4-column category grid).

### 2.5 Transitions, Easing & Timings
- `--ease-spring`: `cubic-bezier(0.2, 1.4, 0.3, 1)` (buttons, logos, pop-in transforms).
- `--ease-out`: `cubic-bezier(0.16, 1, 0.3, 1)` (text fade-ins, reveals).
- Donut slice pop: `transform: translate(var(--dx), var(--dy))` where offset is `7px` outwards along the slice bisector angle.
- Donut pop-in: `scale(0.85)` -> `scale(1)` over `300ms` with `--ease-spring`.
- Donut collapse: `scale(0.9)` + opacity fade over `360ms`.
- Progress Ring: `duration = 1000ms`, easing `1 - (1 - p) ** 2.2`. Checkmark delay: `750ms`.
- Reveal observer: `rootMargin: '0px 0px -6% 0px'`, `threshold: 0.06`.

---

## 3. Component Specification & Behavioral Contracts

### 3.1 Header Navigation (`[data-nav]`)
- **Elements**: Brand logo SVG + name, 6 anchor links (`#how`, `#features`, `/formats/`, `/cli/`, `#hwp`, `#faq`), Language switcher `<details class="lang-menu">`, GitHub star button, Download CTA button.
- **Scroll State**: When `window.scrollY > 8px`, adds `.is-scrolled` which applies `backdrop-filter: blur(18px) saturate(1.4)` and a bottom border.
- **Language Switcher**: Native `<details>` dropdown with summary and list of localized links (`/`, `/ko/`, `/zh-cn/`). Automatically closes on click outside or `Escape`.

### 3.2 Interactive "Try It Here" Hero Demo (`[data-demo]`)
- **Container**: Window chrome with titlebar ("Try it here"), yellow folder icon, macOS window control dots, 3 draggable file chips, converted files output list, and modifier hint (`Ctrl + Drag a file onto the stage`).
- **Data Attributes & State**:
  - Dragging file adds `.is-dragging` to demo container and button.
  - Hovering a slice updates hub title to `→ <Format>` and expands the slice outwards by `POP = 7px`.
  - Dropping on a slice triggers `.ring` animation, counts percentage `0%` to `100%`, converts to checkmark, and appends converted file chip to `.demo-results` (maximum 6 items maintained).
  - Autoplay triggers if user does not interact after entering viewport.
  - Keyboard: `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown` navigates slices, `Enter`/`Space` converts, `Escape` cancels.

### 3.3 Format Marquee (`.marquee`)
- Two opposite-direction scrolling tracks containing format chips (`JPG`, `PNG`, `HEIC`, `WEBP`, etc.).
- Animated seamlessly with pure CSS `@keyframes marquee` (`transform: translateX(-50%)`).

### 3.4 3D Bento Card Tilt (`[data-tilt]`)
- Cards respond to mouse cursor position on fine pointer devices:
  `--rx: ((0.5 - y) * 6)deg`, `--ry: ((x - 0.5) * 6)deg`.
- Subtle radial highlight follows cursor via `--mx`, `--my`.

### 3.5 OS Download Picker & SmartScreen Modal
- Target selector dropdown options:
  - `Windows 10/11 · x64` (`win-x64`)
  - `Linux · x64` (`linux-x64`)
  - `Linux · ARM64` (`linux-arm64`)
  - `macOS · Apple Silicon (ARM64)` (`osx-arm64`)
  - `macOS · Intel (x64)` (`osx-x64`)
- Dynamic release resolution querying `https://api.github.com/repos/KnifeLemon/Filee/releases/latest`.
- Clicking `.exe` on Windows opens `<dialog class="download-guide">` with 3 steps explaining the SmartScreen prompt.

### 3.6 Conversion Guide Pages (`/convert/<from>-to-<to>/`)
- Hero section with breadcrumbs (`Home > Formats > <From> to <To>`), status tags (`Built in`, `Free`, `Offline`, `Batch`), action buttons, and large format badge pair.
- 3-step walkthrough with step numbers.
- Details grid with bullet points and checks, and side list of alternative conversions.
- Educational "About" cards for both format extensions.
- Related conversions pills and download card.

---

## 4. Internationalization (i18n) Architecture

The site supports three locales:
- `en`: Default English
- `ko`: Korean (localized titles, descriptions, CJK line wrapping rules, promo video, poster)
- `zh-CN`: Simplified Chinese (localized titles, descriptions, CJK typography rules, promo video, poster)

### Embedded JSON Configuration Contracts
Each page embeds a `<script id="page-data" type="application/json">` containing:
- `lang`: current language code (`en`, `ko`, `zh-CN`).
- `langs`: array of language objects `{ lang, path, banner, name }`.
- `afterDownload`: dialog texts `{ title, steps, star, issue, retry, close }`.
- `download`: download card labels, targets map, statuses, and button text.

Hero demo embeds `<script id="demo-data" type="application/json">`:
- `files`: array of demo files `{ name, type, profile }`.
- `center`: hub title per profile (`1 HEIC`, `1 MOV`, `1 DOCX`, `1 HWP`).
- `donuts`: list of slices per profile (`image`, `video`, `document`, `hwp`).
- `done`, `cancelled`, `close`, `hintTouch` localized strings.

---

## 5. Structured Data & SEO Specifications

- Canonical URL on every page pointing to exact self path.
- Hreflang alternates: `en`, `ko`, `zh-CN`, and `x-default`.
- Open Graph tags: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`, `og:video` (home page), `og:locale`.
- JSON-LD schemas:
  - Home: `SoftwareApplication`, `VideoObject`, `FAQPage`, `WebSite`.
  - Convert pages: `HowTo`, `BreadcrumbList`.
  - Formats: `WebPage`, `BreadcrumbList`.
  - CLI: `TechArticle`, `BreadcrumbList`.
