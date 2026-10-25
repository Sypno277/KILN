// filee.sh interactions: the drag & drop demo (home page), scroll reveals, lazy video, GitHub release info and the
// real installer link, the language suggestion and card tilt. No dependencies; without JavaScript every page is
// still complete and readable, and download buttons lead to the latest release page.

import { DOWNLOAD_TARGETS, downloadChoice, releaseSummary } from './downloads.65899ced11.js';
import { ConverterEngine } from './converter-engine.js';

if (typeof window !== 'undefined' && !window.converterEngine) {
  window.converterEngine = new ConverterEngine();
}

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const readJson = id => {
  const node = document.getElementById(id);
  try { return node ? JSON.parse(node.textContent) : null; } catch { return null; }
};
/** Demo files and donuts (home page only). */
const data = readJson('demo-data');
/** This page's language and its address in every language. */
const page = readJson('page-data') ?? { lang: document.documentElement.lang, langs: [] };

/* ───────── Drag & drop demo ───────── */

const SVG = 'http://www.w3.org/2000/svg';
const VIEW = 220;                 // viewBox size of the donut
const R_OUT = 96, R_IN = 40;      // ring radii in viewBox units
const R_LABEL = (R_OUT + R_IN) / 2;
const POP = 7;                    // how far a hovered segment moves outwards
const DRAG_THRESHOLD = 6;         // px before a press becomes a drag (like SM_CXDRAG)

function svg(tag, attrs, parent) {
  const node = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.append(node);
  return node;
}

/** Annular sector between angles a0 and a1 (radians, clockwise from 3 o'clock). */
function sectorPath(a0, a1) {
  const point = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${point(R_OUT, a0)}A${R_OUT} ${R_OUT} 0 ${large} 1 ${point(R_OUT, a1)}`
    + `L${point(R_IN, a1)}A${R_IN} ${R_IN} 0 ${large} 0 ${point(R_IN, a0)}Z`;
}

/** Rough text width in em: CJK glyphs are square, Latin ones about half as wide. */
const emWidth = text => [...text].reduce((w, ch) =>
  w + (/[ᄀ-ᇿ⺀-鿿가-힯＀-￯]/.test(ch) ? 1 : ch === ' ' ? 0.3 : 0.56), 0);

/** Splits text into one or two balanced lines that fit maxEm (words for spaced scripts, glyphs for Chinese). */
function balanceLines(text, maxEm) {
  if (emWidth(text) <= maxEm) return [text];
  const spaced = text.includes(' ');
  const parts = spaced ? text.split(' ') : [...text];
  const join = list => list.join(spaced ? ' ' : '');
  let best = [text], bestWidth = Infinity;
  for (let k = 1; k < parts.length; k++) {
    const lines = [join(parts.slice(0, k)), join(parts.slice(k))];
    const width = Math.max(...lines.map(emWidth));
    if (width < bestWidth) { best = lines; bestWidth = width; }
  }
  return best;
}

/** The radial menu: equal segments around a hole, the first one centred at 12 o'clock (same maths as the app). */
class Donut {
  constructor(host) {
    this.host = host;
    this.node = Object.assign(document.createElement('div'), { className: 'donut' });
    this.node.setAttribute('aria-hidden', 'true');
    this.svg = svg('svg', { viewBox: `${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}` }, this.node);
    host.append(this.node);
    this.segments = [];
  }

  build(profile) {
    const formats = data.donuts[profile];
    const span = (2 * Math.PI) / formats.length;
    this.svg.replaceChildren();
    svg('circle', { class: 'backing', r: R_OUT - 1 }, this.svg); // nothing underneath shows through the seams
    this.segments = formats.map(([label, sub], i) => {
      const mid = -Math.PI / 2 + i * span;
      const group = svg('g', { class: 'seg' }, this.svg);
      group.style.setProperty('--dx', `${(Math.cos(mid) * POP).toFixed(2)}px`);
      group.style.setProperty('--dy', `${(Math.sin(mid) * POP).toFixed(2)}px`);
      svg('path', { d: sectorPath(mid - span / 2, mid + span / 2) }, group);
      const x = (Math.cos(mid) * R_LABEL).toFixed(2), y = Math.sin(mid) * R_LABEL;
      svg('text', { x, y: (sub ? y - 4.5 : y).toFixed(2) }, group).textContent = label;
      if (sub) svg('text', { x, y: (y + 7).toFixed(2), class: 'sub' }, group).textContent = sub;
      return { label, full: sub ? `${label} ${sub}` : label, ext: label.toLowerCase(), group };
    });
    svg('circle', { class: 'hub', r: R_IN - 3 }, this.svg);
    this.title = svg('text', { class: 'hub-title' }, this.svg);
    this.title.textContent = data.center[profile];
    this.hint = svg('text', { class: 'hub-hint' }, this.svg);
    this.setHint(data.close);
  }

  setHint(text) {
    const lines = balanceLines(text, 9);
    this.title.setAttribute('y', lines.length > 1 ? -5 : -2);
    this.hint.replaceChildren(...lines.map((line, i) => {
      const span = svg('tspan', { x: 0, y: (lines.length > 1 ? 7 : 10) + i * 8 });
      span.textContent = line;
      return span;
    }));
  }

  highlight(index) {
    this.segments.forEach((s, i) => s.group.classList.toggle('is-hover', i === index));
    this.setHint(index >= 0 ? `→ ${this.segments[index].full}` : data.close);
  }

  /** Opens centred on client point (x, y), kept inside the viewport horizontally. */
  openAt(x, y) {
    clearTimeout(this.closing);
    const box = this.host.getBoundingClientRect();
    const half = this.node.offsetWidth / 2;
    const cx = Math.min(Math.max(x, half + 8), innerWidth - half - 8);
    this.local = { x: cx - box.left, y: y - box.top };
    this.node.style.left = `${this.local.x}px`;
    this.node.style.top = `${this.local.y}px`;
    this.node.classList.remove('is-collapsing', 'is-open');
    void this.node.offsetWidth; // restart the pop-in transition
    this.node.classList.add('is-open');
  }

  close(animated) {
    const node = this.node;
    if (!node.classList.contains('is-open')) return;
    if (!animated || reduceMotion) { node.classList.remove('is-open', 'is-collapsing'); return; }
    node.classList.add('is-collapsing');
    this.closing = setTimeout(() => node.classList.remove('is-open', 'is-collapsing'), 360);
  }

  get isOpen() { return this.node.classList.contains('is-open') && !this.node.classList.contains('is-collapsing'); }

  center() {
    const r = this.node.getBoundingClientRect(); // scaling happens around the centre, so this is stable mid-animation
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  get scale() { return this.node.offsetWidth / VIEW; }

  /** Segment index under client point (x, y); -1 for the hole (cancel) and far outside the ring. */
  hitTest(x, y) {
    if (!this.isOpen) return -1;
    const c = this.center();
    const dx = (x - c.x) / this.scale, dy = (y - c.y) / this.scale;
    const dist = Math.hypot(dx, dy);
    if (dist < R_IN || dist > R_OUT + 36) return -1;
    const n = this.segments.length, span = (2 * Math.PI) / n;
    return ((Math.round((Math.atan2(dy, dx) + Math.PI / 2) / span) % n) + n) % n;
  }

  /** Demo-local position of segment i's label (used by the autoplay). */
  segmentPoint(i) {
    const n = this.segments.length, a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: this.local.x + Math.cos(a) * R_LABEL * this.scale, y: this.local.y + Math.sin(a) * R_LABEL * this.scale };
  }
}

const CURSOR = '<svg class="cursor" viewBox="0 0 24 24"><path d="M5 2.5v17l4.4-4.1 2.9 6.6 3-1.3-2.9-6.5 6.1-.4z" fill="#fff" stroke="#1c1b22" stroke-width="1.4" stroke-linejoin="round"/></svg>';

function setupDemo() {
  const demo = document.querySelector('[data-demo]');
  if (!demo || !data) return;
  const files = [...demo.querySelectorAll('.file')];
  const results = demo.querySelector('.demo-results');
  const hint = demo.querySelector('[data-hint]');
  if (matchMedia('(pointer: coarse)').matches) {
    hint.textContent = data.hintTouch;
    demo.classList.add('is-touch');
  }
  const hintText = hint.textContent;
  const status = Object.assign(document.createElement('p'), { className: 'sr-only' });
  status.setAttribute('role', 'status');
  demo.append(status);

  const donut = new Donut(demo);
  const produced = new Set();
  let session = null;   // { index, mode: 'drag' | 'click' | 'keys', hover, auto }
  let pending = null;   // a press that hasn't moved far enough to be a drag yet
  let ghost = null;
  let suppressClick = false;
  let swallowClicksUntil = 0;
  let hintTimer = 0;
  let auto = null;
  let touched = false;

  const flashHint = text => {
    hint.textContent = text;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hint.textContent = hintText; }, 1500);
  };

  const setHover = index => {
    if (!session || session.hover === index) return;
    session.hover = index;
    donut.highlight(index);
    if (session.mode === 'keys') status.textContent = index >= 0 ? donut.segments[index].full : data.close;
  };

  function createGhost(button, withCursor = false) {
    const node = Object.assign(document.createElement('div'), { className: 'ghost' });
    node.setAttribute('aria-hidden', 'true');
    node.append(button.querySelector('.file-icon').cloneNode(true));
    if (withCursor) node.insertAdjacentHTML('beforeend', CURSOR);
    document.body.append(node);
    return node;
  }

  const moveGhost = (x, y) => { if (ghost) ghost.style.translate = `${x}px ${y}px`; };

  function open(index, x, y, mode) {
    close(false);
    session = { index, mode, hover: -1, auto: false };
    donut.build(data.files[index].profile);
    donut.openAt(x, y);
    files[index].classList.toggle('is-dragging', mode === 'drag');
    demo.classList.toggle('is-dragging', mode === 'drag');
  }

  function close(animated) {
    if (!session) return;
    files[session.index].classList.remove('is-dragging');
    demo.classList.remove('is-dragging');
    donut.close(animated);
    ghost?.remove();
    ghost = null;
    session = null;
  }

  /** Release: convert when over a segment, cancel anywhere else (the hole, outside the ring). */
  function finish(x, y) {
    if (!session) return;
    const { index, hover } = session;
    const target = hover >= 0 ? donut.segments[hover] : null;
    const at = x === undefined ? donut.center() : { x, y };
    close(true);
    if (target) convert(index, target, at.x, at.y);
    else flashHint(data.cancelled);
  }

  function convert(index, target, x, y) {
    const source = data.files[index].name;
    const base = source.replace(/\.[^.]+$/, '');
    let name = `${base}.${target.ext}`;
    for (let n = 1; produced.has(name) || name === source; n++) name = `${base} (${n}).${target.ext}`;
    const realFile = data.files[index]?.realFile;
    progressRing(demo, x, y).then(() => {
      results.querySelector('.demo-empty')?.remove();
      const item = document.createElement('li');
      const badge = document.createElement('b');
      badge.dataset.type = target.ext;
      badge.textContent = target.label;
      
      const dlLink = document.createElement('a');
      dlLink.className = 'demo-item-dl';
      dlLink.title = `Download ${name}`;
      dlLink.setAttribute('aria-label', `Download ${name}`);
      dlLink.download = name;
      dlLink.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>';

      item.append(badge, name, dlLink);
      results.append(item);
      while (results.children.length > 6) results.firstElementChild.remove();
      status.textContent = `${data.done}: ${name}`;

      if (realFile && window.converterEngine) {
        window.converterEngine.convert(realFile, target.ext, { quality: 0.9 }).then(res => {
          item.title = `Converted (${res.size} bytes). Click to preview or download.`;
          item.style.cursor = 'pointer';
          dlLink.href = URL.createObjectURL(res.blob);
          item.onclick = (e) => {
            if (e.target.closest('.demo-item-dl')) return;
            openHomePreviewModal(res.name, res.blob);
          };
          openHomePreviewModal(res.name, res.blob);
        }).catch(err => {
          console.error('Real conversion error:', err);
        });
      } else {
        const mockBlob = new Blob([`Kiln Client-Side Demonstration File\nOriginal: ${source}\nConverted Target: ${name}\nProcessed: 100% in-browser offline with zero network leaks.`], { type: 'application/octet-stream' });
        dlLink.href = URL.createObjectURL(mockBlob);
        item.style.cursor = 'pointer';
        item.title = `Converted (${name}). Click to preview or download.`;
        item.onclick = (e) => {
          if (e.target.closest('.demo-item-dl')) return;
          openHomePreviewModal(name, mockBlob);
        };
      }
    });
  }

  // Pointer: press, move past the threshold → drag with a ghost; release over a segment → convert.
  function attachFileEvents(button, index) {
    button.addEventListener('pointerdown', e => {
      stopAuto();
      suppressClick = false;
      if (e.button !== 0 || session) return;
      pending = { index, id: e.pointerId, x: e.clientX, y: e.clientY };
      button.setPointerCapture(e.pointerId);
    });
    button.addEventListener('pointermove', e => {
      if (pending?.id !== e.pointerId) return;
      if (!session) {
        if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) < DRAG_THRESHOLD) return;
        open(pending.index, e.clientX, e.clientY, 'drag');
        ghost = createGhost(button);
      }
      moveGhost(e.clientX, e.clientY);
      setHover(donut.hitTest(e.clientX, e.clientY));
    });
    const release = e => {
      if (pending?.id !== e.pointerId) return;
      pending = null;
      if (session?.mode !== 'drag') return;
      if (e.type === 'pointercancel') { close(true); return; }
      suppressClick = true;
      finish(e.clientX, e.clientY);
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);

    // A click (or Enter/Space) opens the donut in click mode, like the app's shortcut entry point.
    button.addEventListener('click', e => {
      if (suppressClick || performance.now() < swallowClicksUntil) { suppressClick = false; return; }
      stopAuto();
      const r = button.getBoundingClientRect();
      const keys = e.detail === 0;
      open(index, r.left + r.width / 2, r.top + r.height / 2, keys ? 'keys' : 'click');
      if (keys) setHover(0);
    });
  }

  files.forEach((button, index) => attachFileEvents(button, index));

  // Accept real OS files dropped onto the hero demo
  ['dragenter', 'dragover'].forEach(name => {
    demo.addEventListener(name, e => {
      e.preventDefault();
      demo.classList.add('is-drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    demo.addEventListener(name, e => {
      e.preventDefault();
      demo.classList.remove('is-drag-over');
    });
  });

  function handleFileLoad(file, x, y) {
    stopAuto();
    if (!file) return;

    const meta = window.converterEngine
      ? window.converterEngine.detectFormat(file.name, file.type)
      : { category: 'image', donuts: [{ label: 'PNG', ext: 'png' }, { label: 'JPG', ext: 'jpg' }] };

    const newIdx = data.files.length;
    const profileKey = `custom_${newIdx}`;
    data.donuts[profileKey] = (meta.donuts || []).map(d => [d.label, d.sub || '']);
    data.center[profileKey] = (meta.category || 'file').toUpperCase();

    data.files.push({
      name: file.name,
      profile: profileKey,
      realFile: file
    });

    const list = demo.querySelector('.demo-files');
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'file';
    btn.type = 'button';
    btn.dataset.index = newIdx;
    btn.setAttribute('aria-label', file.name);

    const ext = (file.name?.split('.').pop() || 'FILE').toUpperCase();
    btn.innerHTML = `<span class="file-icon" data-kind="${meta.category || 'file'}" data-type="${ext.toLowerCase()}"><b>${ext}</b></span><span class="file-name">${file.name}</span>`;
    li.appendChild(btn);
    list.appendChild(li);

    files.push(btn);
    attachFileEvents(btn, newIdx);

    const rect = btn.getBoundingClientRect();
    const openX = x !== undefined ? x : (rect.left + rect.width / 2);
    const openY = y !== undefined ? y : (rect.top + rect.height / 2);
    open(newIdx, openX, openY, 'click');
    setHover(0);
  }

  demo.addEventListener('drop', e => {
    stopAuto();
    const dropped = e.dataTransfer.files;
    if (dropped && dropped.length > 0) {
      handleFileLoad(dropped[0], e.clientX, e.clientY);
    }
  });

  const heroInput = document.getElementById('hero-real-file-input');
  const heroBtn = document.getElementById('hero-browse-file-btn');
  if (heroBtn && heroInput) {
    heroBtn.addEventListener('click', () => heroInput.click());
    heroInput.addEventListener('change', () => {
      if (heroInput.files && heroInput.files.length > 0) {
        handleFileLoad(heroInput.files[0]);
      }
    });
  }

  // Click mode: hovering picks, the next press converts or cancels. Touch has no hover, so the press position decides.
  document.addEventListener('pointermove', e => {
    if (session?.mode === 'click') setHover(donut.hitTest(e.clientX, e.clientY));
  });
  document.addEventListener('pointerdown', e => {
    if (!session || session.mode === 'drag') return;
    e.stopPropagation(); // don't let the press also start a drag on a file under the donut
    swallowClicksUntil = performance.now() + 600;
    setHover(donut.hitTest(e.clientX, e.clientY));
    finish(e.clientX, e.clientY);
  }, true);

  document.addEventListener('keydown', e => {
    if (!session || session.auto) return;
    if (e.key === 'Escape') { e.preventDefault(); close(true); flashHint(data.cancelled); return; }
    if (session.mode === 'drag') return;
    const n = donut.segments.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setHover((session.hover + 1) % n); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setHover(session.hover <= 0 ? n - 1 : session.hover - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); }
    else if (e.key === 'Tab') close(false);
  });

  // Autoplay once when the demo first comes into view, until the visitor touches it.
  demo.addEventListener('pointerdown', () => { touched = true; stopAuto(); }, true);
  demo.addEventListener('focusin', () => { touched = true; stopAuto(); });

  function stopAuto() {
    if (!auto) return;
    auto.stopped = true;
    auto = null;
    if (session?.auto) close(false);
  }

  async function autoplay() {
    const token = auto = { stopped: false };
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const wait = async ms => {
      const end = performance.now() + ms;
      while (performance.now() < end) { await frame(); if (token.stopped) throw token; }
    };
    const toClient = p => { const r = demo.getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y }; };
    const file = files[0].getBoundingClientRect(), box = demo.getBoundingClientRect();
    let at = { x: file.left - box.left + file.width / 2, y: file.top - box.top + file.height * 0.4 };
    // Positions are demo-local so the path survives scrolling mid-animation.
    const glide = async (to, ms) => {
      const from = at, start = performance.now();
      for (;;) {
        await frame();
        if (token.stopped) throw token;
        const p = Math.min(1, (performance.now() - start) / ms), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        at = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
        const c = toClient(at);
        moveGhost(c.x, c.y);
        if (session) setHover(donut.hitTest(c.x, c.y));
        if (p === 1) return;
      }
    };
    try {
      const start = toClient(at);
      open(0, start.x, start.y, 'drag');
      session.auto = true;
      donut.node.classList.remove('is-open'); // appear on the first move, like a real drag
      ghost = createGhost(files[0], true);
      moveGhost(start.x, start.y);
      await wait(350);
      at = { x: at.x + 18, y: at.y + 22 };
      const opened = toClient(at);
      donut.openAt(opened.x, opened.y);
      await wait(450);
      await glide(donut.segmentPoint(1), 650);
      await wait(260);
      await glide(donut.segmentPoint(0), 520);
      await wait(520);
      const drop = toClient(at);
      session.auto = false;
      finish(drop.x, drop.y);
      auto = null;
    } catch (error) {
      if (error !== token) throw error;
    }
  }

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      setTimeout(() => { if (!touched && !session) autoplay(); }, 1300);
    }, { threshold: 0.6 });
    io.observe(demo);
  }
}

/** Progress ring at client point (x, y): counts to 100 %, turns into a check mark, then resolves. */
function progressRing(host, x, y) {
  const box = host.getBoundingClientRect();
  const ring = Object.assign(document.createElement('div'), { className: 'ring' });
  ring.setAttribute('aria-hidden', 'true');
  ring.style.left = `${x - box.left}px`;
  ring.style.top = `${y - box.top}px`;
  const circumference = 2 * Math.PI * 44;
  ring.innerHTML = `<svg viewBox="0 0 124 124"><circle class="disc" cx="62" cy="62" r="58"/><circle class="track" cx="62" cy="62" r="44"/>`
    + `<circle class="bar" cx="62" cy="62" r="44" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${circumference.toFixed(2)}"/>`
    + `<circle class="ok" cx="62" cy="62" r="44"/><path class="tick" d="M42 63l13 13 27-28"/><text class="pct" x="62" y="62">0%</text></svg>`;
  host.append(ring);
  const bar = ring.querySelector('.bar'), pct = ring.querySelector('.pct');
  void ring.offsetWidth;
  ring.classList.add('is-visible');
  const duration = reduceMotion ? 1 : 1000, start = performance.now();
  return new Promise(resolve => {
    const step = now => {
      const p = Math.min(1, (now - start) / duration), eased = 1 - (1 - p) ** 2.2;
      bar.setAttribute('stroke-dashoffset', (circumference * (1 - eased)).toFixed(2));
      pct.textContent = `${Math.round(eased * 100)}%`;
      if (p < 1) { requestAnimationFrame(step); return; }
      ring.classList.add('is-done');
      setTimeout(() => {
        ring.classList.remove('is-visible');
        resolve();
        setTimeout(() => ring.remove(), 500);
      }, reduceMotion ? 250 : 750);
    };
    requestAnimationFrame(step);
  });
}

/* ───────── Page ───────── */

function setupReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  items.forEach(el => io.observe(el));
}

/** The promo video loads only when scrolled to, plays while visible (muted) and pauses when it leaves. */
function setupVideo() {
  const video = document.querySelector('video.promo');
  if (!video || !('IntersectionObserver' in window)) { if (video) video.src = video.dataset.src; return; }
  let pausedByUser = false, pausingForScroll = false;
  video.addEventListener('pause', () => { if (!pausingForScroll) pausedByUser = true; pausingForScroll = false; });
  video.addEventListener('play', () => { pausedByUser = false; });
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!video.src) { video.preload = 'auto'; video.src = video.dataset.src; }
      if (!reduceMotion && !pausedByUser) video.play().catch(() => {});
    } else if (!video.paused) {
      pausingForScroll = true;
      video.pause();
    }
  }, { threshold: 0.4 }).observe(video);
}

const HOUR = 3_600_000;

/**
 * Cached in localStorage (shared by all pages and tabs) because the GitHub API allows 60 unauthenticated requests
 * per hour and IP. Failures (offline, rate limit, timeout) are remembered for 10 minutes so every page view doesn't
 * retry; the static fallbacks in the HTML simply stay.
 */
async function cached(key, load) {
  try {
    const hit = JSON.parse(localStorage.getItem(key));
    if (hit && Date.now() - hit.at < (hit.value ? HOUR : HOUR / 6)) {
      if (hit.value) return hit.value;
      throw new Error('failed recently');
    }
  } catch (error) {
    if (error.message === 'failed recently') throw error;
  }
  const store = value => { try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); } catch { /* storage unavailable */ } };
  try {
    const value = await load();
    store(value);
    return value;
  } catch (error) {
    store(null);
    throw error;
  }
}

async function getJson(url) {
  if (navigator.onLine === false) throw new Error('offline');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status} ${url}`); // 403/429 when rate limited
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The visitor's system as a first guess (they can change it). A Mac is taken as Apple silicon: browsers on Intel and
 * Apple silicon Macs report the same platform, and Apple silicon is what Apple sells now.
 */
function guessTarget() {
  const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
  const agent = navigator.userAgent.toLowerCase();
  if (platform.includes('mac')) return 'osx-arm64';
  if (platform.includes('linux') && !agent.includes('android'))
    return /aarch64|arm64/.test(platform + agent) ? 'linux-arm64' : 'linux-x64';
  return 'win-x64';
}

/** Each selection resolves only an asset for that operating system and processor. */
function setupGitHub() {
  const api = 'https://api.github.com/repos/KnifeLemon/Filee';
  const compact = n => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));

  cached('filee-repo', async () => ({ stars: (await getJson(api)).stargazers_count }))
    .then(({ stars }) => {
      if (stars > 0) document.querySelectorAll('[data-stars]').forEach(el => { el.textContent = `★ ${compact(stars)}`; });
    })
    .catch(() => {});

  const t = page.download;
  if (!t) return;
  const selectors = [...document.querySelectorAll('select[data-download-target]')];
  let selected = guessTarget(), release = null, failed = false;
  try {
    const saved = sessionStorage.getItem('filee-download-target');
    if (DOWNLOAD_TARGETS.includes(saved)) selected = saved;
  } catch { /* storage unavailable */ }

  const render = () => {
    const choice = downloadChoice(release, selected, failed);
    const target = t.targets[selected];
    const version = release?.tag_name ? release.tag_name.replace(/^v?/, 'v') : '';
    const size = choice.asset?.size ? ` · ${Math.round(choice.asset.size / 1_048_576)} MB` : '';
    const status = choice.state === 'available'
      ? `${target} · ${version}${size}${choice.development ? ` · ${t.developmentLabel}` : ''}`
      : t[choice.state].replace('{target}', target);
    selectors.forEach(select => { select.value = selected; });
    document.querySelectorAll('[data-download]').forEach(link => {
      link.href = choice.url;
      link.dataset.downloadTarget = selected;
      const label = link.querySelector('[data-download-label]');
      if (label) label.textContent = choice.state === 'available'
        ? (choice.development ? t.developmentButton : t.button) : t.all;
    });
    document.querySelectorAll('[data-download-status]').forEach(node => { node.textContent = status; node.hidden = false; });
    document.querySelectorAll('[data-version]').forEach(node => { node.textContent = version; });
    document.querySelectorAll('[data-version-full]').forEach(node => { node.textContent = version + size; });
    document.querySelectorAll('[data-latest]').forEach(node => { node.hidden = !version; });
  };

  selectors.forEach(select => {
    const picker = select.closest('[data-download-picker]');
    if (picker) picker.hidden = false;
    select.addEventListener('change', () => {
      if (!DOWNLOAD_TARGETS.includes(select.value)) return;
      selected = select.value;
      try { sessionStorage.setItem('filee-download-target', selected); } catch { /* storage unavailable */ }
      render();
    });
  });
  render();
  cached('filee-release-v3', async () => releaseSummary(await getJson(`${api}/releases/latest`)))
    .then(value => { release = releaseSummary(value); render(); })
    .catch(() => { failed = true; render(); });
}

/**
 * After a click on a download button that fetches the installer itself: the download starts as usual, and a panel
 * explains the SmartScreen prompt of the (not yet code-signed) installer and points to GitHub for a star or an issue,
 * which visitors who download from here would otherwise never see.
 */
function setupDownloadGuide() {
  const t = page.afterDownload;
  if (!t || typeof HTMLDialogElement !== 'function') return;
  const repo = 'https://github.com/KnifeLemon/Filee';
  const el = (tag, props = {}) => Object.assign(document.createElement(tag), props);
  let dialog, retry;

  const build = () => {
    dialog = el('dialog', { className: 'download-guide' });
    dialog.setAttribute('aria-labelledby', 'download-guide-title');
    const close = el('button', { type: 'button', className: 'download-guide-close', textContent: '×' });
    close.setAttribute('aria-label', t.close);
    close.addEventListener('click', () => dialog.close());
    const steps = el('ol');
    for (const step of t.steps) steps.append(el('li', { textContent: step }));
    const actions = el('div', { className: 'download-guide-actions' });
    actions.append(
      el('a', { className: 'btn btn-primary', href: repo, target: '_blank', rel: 'noopener', textContent: t.star }),
      el('a', { className: 'btn btn-ghost', href: `${repo}/issues/new/choose`, target: '_blank', rel: 'noopener', textContent: t.issue }));
    retry = el('a', { className: 'download-guide-retry', textContent: t.retry });
    dialog.append(close, el('h2', { id: 'download-guide-title', textContent: t.title }), steps, actions, retry);
    // A click on the backdrop (outside the panel) closes it.
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    document.body.append(dialog);
  };

  document.addEventListener('click', e => {
    const link = e.target.closest?.('[data-download]');
    if (!link || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (link.dataset.downloadTarget !== 'win-x64') return;
    if (!/\.exe$/i.test(new URL(link.href).pathname)) return; // still the release page: it explains itself
    if (!dialog) build();
    retry.href = link.href;
    setTimeout(() => { if (!dialog.open) dialog.showModal(); }, 200);
  });
}

/** Suggests the visitor's language when it differs from the page. Never redirects (crawlers and shared links stay put). */
function setupLanguageBanner() {
  const KEY = 'filee-lang-chosen';
  const remember = () => { try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ } };
  document.querySelectorAll('.lang-menu a, .footer-langs a').forEach(a => a.addEventListener('click', remember));
  try { if (localStorage.getItem(KEY)) return; } catch { return; }
  if (document.referrer && new URL(document.referrer).origin === location.origin) return;

  const map = tag => {
    tag = tag.toLowerCase();
    if (tag.startsWith('ko')) return 'ko';
    if (tag === 'zh' || tag.startsWith('zh-cn') || tag.startsWith('zh-hans') || tag.startsWith('zh-sg')) return 'zh-CN';
    if (tag.startsWith('en')) return 'en';
    return null;
  };
  const preferred = (navigator.languages?.length ? navigator.languages : [navigator.language]).map(map).find(Boolean);
  const target = page.langs.find(l => l.lang === preferred);
  if (!target || target.lang === page.lang) return;

  const banner = Object.assign(document.createElement('div'), { className: 'lang-banner', lang: target.lang });
  banner.setAttribute('role', 'note');
  const text = Object.assign(document.createElement('span'), { textContent: target.banner });
  const link = Object.assign(document.createElement('a'), { href: target.path, textContent: `${target.name} →`, hreflang: target.lang });
  link.addEventListener('click', remember);
  const dismiss = Object.assign(document.createElement('button'), { type: 'button', textContent: '×' });
  dismiss.setAttribute('aria-label', 'Close');
  dismiss.addEventListener('click', () => { banner.classList.remove('is-visible'); remember(); });
  banner.append(text, link, dismiss);
  document.body.append(banner);
  setTimeout(() => banner.classList.add('is-visible'), 1200);
}

function setupNav() {
  const nav = document.querySelector('[data-nav]');
  const update = () => nav.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', update, { passive: true });
  update();

  const menu = document.querySelector('.lang-menu');
  if (!menu) return;
  document.addEventListener('click', e => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    menu.querySelector('summary').focus();
  });
}

/** Feature cards lean towards the pointer and a soft light follows it. */
function setupTilt() {
  if (!finePointer || reduceMotion) return;
  for (const card of document.querySelectorAll('[data-tilt]')) {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      card.style.setProperty('--rx', `${((0.5 - y) * 6).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((x - 0.5) * 6).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
  }
}

setupNav();
setupReveal();
setupDemo();
setupVideo();
setupTilt();
setupGitHub();
setupDownloadGuide();
setupLanguageBanner();
setupHomePdfTools();

/* ========================================================
   iLovePDF STYLED NATIVE TOOL CONTROLLER (33 TOOLS)
   ======================================================== */
const PDF_TOOLS_CATALOG = [
  { id: 'merge-pdf', group: 'Organize', name: 'Merge PDF', tier: 'A', iconColor: 'icon-red', engine: 'PDFLib v1.17.1', desc: 'Combine multiple PDFs into a single document with custom ordering.', multiFile: true },
  { id: 'split-pdf', group: 'Organize', name: 'Split PDF', tier: 'A', iconColor: 'icon-amber', engine: 'PDFLib v1.17.1', desc: 'Separate PDF pages by custom ranges, fixed intervals, or individual pages into ZIP.' },
  { id: 'extract-pages', group: 'Organize', name: 'Extract Pages', tier: 'A', iconColor: 'icon-amber', engine: 'PDFLib v1.17.1', desc: 'Select specific pages to extract into a new standalone PDF or separate files.' },
  { id: 'remove-pages', group: 'Organize', name: 'Remove Pages', tier: 'A', iconColor: 'icon-red', engine: 'PDFLib v1.17.1', desc: 'Delete unwanted pages from your PDF document and download the cleaned copy.' },
  { id: 'organize-pdf', group: 'Organize', name: 'Organize PDF', tier: 'A', iconColor: 'icon-purple', engine: 'PDFLib v1.17.1', desc: 'Visual page grid to sort, delete, rotate, and insert blank pages.' },
  { id: 'scan-to-pdf', group: 'Organize', name: 'Scan to PDF', tier: 'A', iconColor: 'icon-teal', engine: 'PDFLib v1.17.1', desc: 'Capture documents with device camera, apply edge filters, and generate PDF.', multiFile: true },
  { id: 'compress-pdf', group: 'Optimize', name: 'Compress PDF', tier: 'A', iconColor: 'icon-green', engine: 'PDFLib v1.17.1', desc: 'Optimize PDF structure, clean unused streams, and compress object trees.' },
  { id: 'repair-pdf', group: 'Optimize', name: 'Repair PDF', tier: 'A', iconColor: 'icon-amber', engine: 'PDFLib v1.17.1', desc: 'Rebuild broken cross-reference tables and recover pages from corrupted PDFs.' },
  { id: 'ocr-pdf', group: 'Optimize', name: 'OCR PDF', tier: 'B', iconColor: 'icon-blue', engine: 'Tesseract.js WASM', desc: 'Generate searchable invisible text layer over scanned documents.' },
  { id: 'jpg-to-pdf', group: 'Convert to PDF', name: 'JPG to PDF', tier: 'A', iconColor: 'icon-teal', engine: 'PDFLib v1.17.1', desc: 'Convert JPG, PNG, WEBP, and BMP images into formatted PDF pages.', multiFile: true },
  { id: 'word-to-pdf', group: 'Convert to PDF', name: 'Word to PDF', tier: 'B', iconColor: 'icon-blue', engine: 'Mammoth / PDFLib', desc: 'Convert DOC and DOCX files into formatted PDF documents client-side.' },
  { id: 'ppt-to-pdf', group: 'Convert to PDF', name: 'PowerPoint to PDF', tier: 'B', iconColor: 'icon-orange', engine: 'Kiln Presentation Engine', desc: 'Convert PPT and PPTX slide decks into multi-page PDF documents.' },
  { id: 'excel-to-pdf', group: 'Convert to PDF', name: 'Excel to PDF', tier: 'B', iconColor: 'icon-green', engine: 'SheetJS v0.18.5', desc: 'Convert XLS and XLSX spreadsheets into paginated PDF tables.' },
  { id: 'html-to-pdf', group: 'Convert to PDF', name: 'HTML to PDF', tier: 'A', iconColor: 'icon-purple', engine: 'DOM / Canvas / PDFLib', desc: 'Convert local HTML code or uploaded HTML files into styled PDF pages.' },
  { id: 'pdf-to-jpg', group: 'Convert from PDF', name: 'PDF to JPG', tier: 'A', iconColor: 'icon-teal', engine: 'PDFJS-Dist / Canvas', desc: 'Render PDF pages into high-resolution JPG images or extract embedded images.' },
  { id: 'pdf-to-word', group: 'Convert from PDF', name: 'PDF to Word', tier: 'B', iconColor: 'icon-blue', engine: 'JSZip / OpenXML', desc: 'Convert PDF document layout into editable Word DOCX format.' },
  { id: 'pdf-to-ppt', group: 'Convert from PDF', name: 'PDF to PowerPoint', tier: 'B', iconColor: 'icon-orange', engine: 'JSZip / OpenXML', desc: 'Convert PDF pages into editable PowerPoint PPTX slide presentations.' },
  { id: 'pdf-to-excel', group: 'Convert from PDF', name: 'PDF to Excel', tier: 'B', iconColor: 'icon-green', engine: 'Table Extractor / CSV', desc: 'Extract table grids and data from PDF into spreadsheet format.' },
  { id: 'pdf-to-pdfa', group: 'Convert from PDF', name: 'PDF to PDF/A', tier: 'B', iconColor: 'icon-red', engine: 'PDFLib v1.17.1', desc: 'Convert standard PDF into ISO 19005 compliant PDF/A-1b archival format.' },
  { id: 'pdf-to-markdown', group: 'Convert from PDF', name: 'PDF to Markdown', tier: 'A', iconColor: 'icon-purple', engine: 'Text Parser', desc: 'Extract headings, bullet lists, and paragraphs into formatted Markdown.' },
  { id: 'edit-pdf', group: 'Edit', name: 'Edit PDF', tier: 'A', iconColor: 'icon-purple', engine: 'PDFLib v1.17.1', desc: 'Add text annotations, geometric shapes, lines, and vector elements onto PDF.' },
  { id: 'rotate-pdf', group: 'Edit', name: 'Rotate PDF', tier: 'A', iconColor: 'icon-amber', engine: 'PDFLib v1.17.1', desc: 'Rotate single pages, page ranges, or entire documents by 90°, 180°, or 270°.' },
  { id: 'add-page-numbers', group: 'Edit', name: 'Add Page Numbers', tier: 'A', iconColor: 'icon-blue', engine: 'PDFLib v1.17.1', desc: 'Stamp page numbering (e.g. Page n of N) with customizable position and font.' },
  { id: 'add-watermark', group: 'Edit', name: 'Add Watermark', tier: 'A', iconColor: 'icon-amber', engine: 'PDFLib v1.17.1', desc: 'Stamp diagonal watermark text or logo image with transparency across all pages.' },
  { id: 'crop-pdf', group: 'Edit', name: 'Crop PDF', tier: 'A', iconColor: 'icon-purple', engine: 'PDFLib v1.17.1', desc: 'Trim margins or define custom CropBox boundaries for single or all pages.' },
  { id: 'pdf-forms', group: 'Edit', name: 'PDF Forms', tier: 'A', iconColor: 'icon-blue', engine: 'PDFLib v1.17.1', desc: 'Inspect interactive AcroForm fields, fill field values, and flatten documents.' },
  { id: 'unlock-pdf', group: 'Security', name: 'Unlock PDF', tier: 'A', iconColor: 'icon-red', engine: 'PDFLib v1.17.1', desc: 'Remove password and restrictions from authorized documents you own.' },
  { id: 'protect-pdf', group: 'Security', name: 'Protect PDF', tier: 'A', iconColor: 'icon-red', engine: 'PDFLib v1.17.1', desc: 'Encrypt PDF with AES-256 standard and set user/owner passwords and permissions.' },
  { id: 'sign-pdf', group: 'Security', name: 'Sign PDF', tier: 'A', iconColor: 'icon-purple', engine: 'PDFLib v1.17.1', desc: 'Draw, type, or stamp digital signature seals with timestamp onto any page.' },
  { id: 'redact-pdf', group: 'Security', name: 'Redact PDF', tier: 'A', iconColor: 'icon-red', engine: 'PDFLib v1.17.1', desc: 'Permanently remove text, coordinates, and metadata with true stream sanitization.' },
  { id: 'compare-pdf', group: 'Security', name: 'Compare PDF', tier: 'A', iconColor: 'icon-amber', engine: 'PDFLib v1.17.1', desc: 'Compare two PDFs side-by-side to highlight structural and textual differences.' },
  { id: 'ai-summarizer', group: 'Intelligence', name: 'AI Summarizer', tier: 'B', iconColor: 'icon-teal', engine: 'WebGPU / BYO-API Key', desc: 'Generate executive summaries and key takeaways with local browser inference.' },
  { id: 'translate-pdf', group: 'Intelligence', name: 'Translate PDF', tier: 'B', iconColor: 'icon-blue', engine: 'Layout Preserving Translator', desc: 'Translate document text while preserving exact layout and font geometry.' }
];

function getToolSvg(id) {
  if (id.includes('word')) return '<svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M15.2,20L13.5,13.2L11.8,20H10.2L8.2,13.2L6.5,20H4.9L7.2,11.2H9.1L11,17.5L12.9,11.2H14.8L17.1,20H15.2M13,9V3.5L18.5,9H13Z"/></svg>';
  if (id.includes('excel')) return '<svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M15.8,20L13,15.6L10.2,20H8.3L11.9,14.4L8.5,9.2H10.4L13,13.3L15.6,9.2H17.5L14.1,14.4L17.7,20H15.8M13,9V3.5L18.5,9H13Z"/></svg>';
  if (id.includes('ppt')) return '<svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M10,18V15H13A2,2 0 0,0 15,13V11A2,2 0 0,0 13,9H8V18H10M10,11H13V13H10V11M13,9V3.5L18.5,9H13Z"/></svg>';
  if (id.includes('jpg') || id.includes('image')) return '<svg viewBox="0 0 24 24"><path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/></svg>';
  if (id.includes('merge')) return '<svg viewBox="0 0 24 24"><path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V5H19V19M11,17H13V13H17V11H13V7H11V11H7V13H11V17Z"/></svg>';
  if (id.includes('split') || id.includes('extract')) return '<svg viewBox="0 0 24 24"><path d="M9.5,4A1.5,1.5 0 0,1 11,5.5A1.5,1.5 0 0,1 9.5,7A1.5,1.5 0 0,1 8,5.5A1.5,1.5 0 0,1 9.5,4M9.5,17A1.5,1.5 0 0,1 11,18.5A1.5,1.5 0 0,1 9.5,20A1.5,1.5 0 0,1 8,18.5A1.5,1.5 0 0,1 9.5,17M6,5.5A3.5,3.5 0 0,0 9.5,9C10.28,9 11,8.74 11.6,8.29L14.3,11L11.6,13.71C11,13.26 10.28,13 9.5,13A3.5,3.5 0 0,0 6,16.5A3.5,3.5 0 0,0 9.5,20A3.5,3.5 0 0,0 13,16.5C13,15.72 12.74,15 12.29,14.4L15,11.7L17.71,14.41C17.26,15 17,15.72 17,16.5A3.5,3.5 0 0,0 20.5,20A3.5,3.5 0 0,0 24,16.5A3.5,3.5 0 0,0 20.5,13C19.72,13 19,13.26 18.4,13.71L15.7,11L18.41,8.29C19,8.74 19.72,9 20.5,9A3.5,3.5 0 0,0 24,5.5A3.5,3.5 0 0,0 20.5,2A3.5,3.5 0 0,0 17,5.5C17,6.28 17.26,7 17.71,7.6L15,10.3L12.29,7.59C12.74,7 13,6.28 13,5.5A3.5,3.5 0 0,0 9.5,2A3.5,3.5 0 0,0 6,5.5Z"/></svg>';
  if (id.includes('compress')) return '<svg viewBox="0 0 24 24"><path d="M14,17H17V14H19V17H22V19H19V22H17V19H14V17M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6L8,10H11V14H13V10H16L12,6Z"/></svg>';
  if (id.includes('rotate')) return '<svg viewBox="0 0 24 24"><path d="M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12H4A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/></svg>';
  if (id.includes('watermark')) return '<svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,13.9 19.34,15.65 18.23,17.03L6.97,5.77C8.35,4.66 10.1,4 12,4M5.77,6.97L17.03,18.23C15.65,19.34 13.9,20 12,20A8,8 0 0,1 4,12C4,10.1 4.66,8.35 5.77,6.97Z"/></svg>';
  if (id.includes('lock') || id.includes('protect')) return '<svg viewBox="0 0 24 24"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/></svg>';
  if (id.includes('sign')) return '<svg viewBox="0 0 24 24"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z"/></svg>';
  return '<svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z"/></svg>';
}

function openHomePreviewModal(filename, blob) {
  const modal = document.getElementById('home-studio-modal');
  const title = document.getElementById('home-modal-title');
  const content = document.getElementById('home-modal-content');
  const closeBtn = document.getElementById('home-modal-close-btn');
  if (!modal || !content) return;

  title.textContent = filename || 'Converted Document';
  content.replaceChildren();

  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'svg'].includes(ext)) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    img.style.maxWidth = '100%';
    img.style.borderRadius = '12px';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    content.appendChild(img);
  } else if (['txt', 'html', 'json', 'yaml', 'yml', 'csv', 'tsv', 'md'].includes(ext)) {
    const pre = document.createElement('pre');
    pre.style.maxHeight = '420px';
    pre.style.overflow = 'auto';
    pre.style.padding = '16px';
    pre.style.background = 'var(--surface-2)';
    pre.style.borderRadius = '10px';
    pre.style.fontSize = '13px';
    blob.text().then(t => { pre.textContent = t.slice(0, 20000); });
    content.appendChild(pre);
  } else if (['wav', 'mp3', 'ogg'].includes(ext)) {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = URL.createObjectURL(blob);
    audio.style.width = '100%';
    audio.style.margin = '20px 0';
    content.appendChild(audio);
  } else if (ext === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = URL.createObjectURL(blob);
    iframe.style.width = '100%';
    iframe.style.height = '480px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '10px';
    content.appendChild(iframe);
  } else {
    const card = document.createElement('div');
    card.style.padding = '28px';
    card.style.textAlign = 'center';
    card.innerHTML = `
      <h4 style="margin:0 0 10px;font-size:17px;font-weight:750;">On-Screen File Inspection</h4>
      <p style="color:var(--muted);font-size:14px;margin:0 0 14px;">Format: .${(ext || 'FILE').toUpperCase()} · Size: ${(blob.size / 1024).toFixed(1)} KB</p>
      <p style="font-size:13.5px;color:var(--green);font-weight:600;">✓ Conversion completed with 100% client-side privacy. Output retained in browser memory.</p>
    `;
    content.appendChild(card);
  }

  // Action Footer with Download button
  const downloadBar = document.createElement('div');
  downloadBar.className = 'home-modal-download-bar';
  const sizeKb = blob ? (blob.size / 1024).toFixed(1) : '0';
  downloadBar.innerHTML = `
    <div style="font-size:13.5px;color:var(--muted);">
      Ready for local save &middot; <strong>${sizeKb} KB</strong>
    </div>
    <div style="display:flex;gap:10px;">
      <a class="home-modal-download-btn" id="home-modal-download-btn" download="${filename}">
        <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>
        Download ${filename}
      </a>
    </div>
  `;
  const dlBtn = downloadBar.querySelector('#home-modal-download-btn');
  if (blob) {
    dlBtn.href = URL.createObjectURL(blob);
  }
  content.appendChild(downloadBar);

  modal.classList.add('is-open');
  if (closeBtn) closeBtn.onclick = () => modal.classList.remove('is-open');
  modal.onclick = e => { if (e.target === modal) modal.classList.remove('is-open'); };
}

function openHomeToolWorkbench(tool) {
  const modal = document.getElementById('home-studio-modal');
  const title = document.getElementById('home-modal-title');
  const content = document.getElementById('home-modal-content');
  const closeBtn = document.getElementById('home-modal-close-btn');
  if (!modal || !content) return;

  title.innerHTML = `<span>${tool.name}</span> <span class="ilove-card-tier" style="margin-left:8px;font-size:11px;">Tier ${tool.tier || 'A'}</span>`;
  content.replaceChildren();

  const container = document.createElement('div');
  container.className = 'ilove-wb-container';

  let optionsHtml = '';
  if (tool.id === 'rotate-pdf') {
    optionsHtml = `
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px;">Rotation Direction</label>
        <select id="home-wb-opt-angle" class="preset-input" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;">
          <option value="90">90° Clockwise</option>
          <option value="180">180° Inverted</option>
          <option value="270">270° Counter-Clockwise</option>
        </select>
      </div>
    `;
  } else if (tool.id === 'add-watermark') {
    optionsHtml = `
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px;">Watermark Text</label>
        <input type="text" id="home-wb-opt-text" class="preset-input" value="CONFIDENTIAL" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;">
      </div>
    `;
  } else if (tool.id === 'compress-pdf') {
    optionsHtml = `
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px;">Compression Level</label>
        <select id="home-wb-opt-level" class="preset-input" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;">
          <option value="recommended">Recommended (Optimal Quality & Size)</option>
          <option value="extreme">Extreme Compression</option>
          <option value="less">Less Compression</option>
        </select>
      </div>
    `;
  } else if (tool.id === 'protect-pdf' || tool.id === 'unlock-pdf') {
    optionsHtml = `
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px;">Password</label>
        <input type="password" id="home-wb-opt-pass" class="preset-input" placeholder="Enter password" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;">
      </div>
    `;
  } else if (tool.id === 'split-pdf') {
    optionsHtml = `
      <div style="margin-bottom:16px;">
        <label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px;">Split Mode</label>
        <select id="home-wb-opt-split-mode" class="preset-input" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;">
          <option value="all_pages">Extract all pages into separate files</option>
          <option value="custom_ranges">Custom page ranges (e.g. 1-2, 3-4)</option>
        </select>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- STAGE 1: INITIAL UPLOAD / DROP SCREEN -->
    <div class="ilove-wb-upload" id="home-ilove-upload">
      <h2 class="ilove-wb-title">${tool.name}</h2>
      <p class="ilove-wb-subtitle">${tool.desc}</p>
      
      <div class="ilove-wb-drop-box" id="home-wb-dropzone">
        <input type="file" id="home-wb-file-input" ${tool.multiFile ? 'multiple' : ''} accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx" style="display:none;">
        
        <button type="button" class="ilove-big-red-btn" id="home-ilove-choose-btn">
          <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:currentColor;"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
          <span>Select ${tool.id.includes('jpg') ? 'Images' : 'PDF files'}</span>
        </button>
        
        <div class="ilove-drop-txt" id="home-wb-drop-label">or drop files here</div>
        
        <div class="ilove-cloud-badges">
          <span class="ilove-badge-pill" title="100% Client-Side Private">
            <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:#10b981;"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,11.99H19C18.47,16.11 15.72,19.78 12,20.92V12H5V6.3L12,3.19V11.99Z"/></svg>
            100% Client-Side Engine
          </span>
          <span class="ilove-badge-pill">
            <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:#3b82f6;"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4Z"/></svg>
            Zero Server Uploads
          </span>
        </div>
      </div>
    </div>

    <!-- STAGE 2: ACTIVE WORKSPACE (FILES GRID & RIGHT OPTIONS SIDEBAR) -->
    <div class="ilove-wb-active" id="home-ilove-active" style="display:none;">
      <div class="ilove-wb-workspace">
        <div class="ilove-wb-files-toolbar">
          <div style="font-size:14px;font-weight:700;"><span id="home-files-count">0</span> file(s) selected</div>
          <button type="button" class="btn btn-ghost btn-small" id="home-add-more-btn">+ Add more files</button>
        </div>
        <div class="ilove-files-grid" id="home-files-grid"></div>
      </div>

      <div class="ilove-wb-sidebar">
        <div>
          <div class="ilove-sidebar-head">
            <h3>${tool.name}</h3>
            <span class="ilove-tier-pill">Tier ${tool.tier || 'A'}</span>
          </div>
          
          <div class="ilove-sidebar-options">
            ${optionsHtml}
          </div>
        </div>

        <div class="ilove-sidebar-foot">
          <div id="home-wb-status" class="ilove-status-txt">Ready to process client-side.</div>
          <button type="button" class="ilove-action-btn" id="home-wb-execute-btn" disabled>
            <span>${tool.name}</span>
            <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- STAGE 3: SUCCESS & DOWNLOAD SCREEN -->
    <div class="ilove-wb-success" id="home-ilove-success" style="display:none;">
      <div class="ilove-success-icon">
        <svg viewBox="0 0 24 24" style="width:40px;height:40px;fill:#10b981;"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M10,17L5,12L6.41,10.59L10,14.17L17.59,6.58L19,8L10,17Z"/></svg>
      </div>
      <h2 class="ilove-success-title" id="home-success-title">Your PDF has been processed!</h2>
      <p class="ilove-success-sub" id="home-success-sub">Processed with 100% client-side privacy. File is ready for download.</p>
      
      <div class="ilove-download-group">
        <a class="ilove-big-red-btn ilove-download-main-btn" id="home-final-download-btn" download="${tool.id}.pdf">
          <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:currentColor;"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>
          <span id="home-final-download-txt">Download ${tool.name}</span>
        </a>
      </div>

      <div class="ilove-success-actions">
        <button type="button" class="btn btn-ghost" id="home-wb-preview-btn">Preview Output</button>
        <button type="button" class="btn btn-ghost" id="home-wb-process-another-btn">Process another file</button>
      </div>
    </div>
  `;

  content.appendChild(container);
  modal.classList.add('is-open');

  if (closeBtn) closeBtn.onclick = () => modal.classList.remove('is-open');
  modal.onclick = e => { if (e.target === modal) modal.classList.remove('is-open'); };

  let selectedFiles = [];
  const stageUpload = container.querySelector('#home-ilove-upload');
  const stageActive = container.querySelector('#home-ilove-active');
  const stageSuccess = container.querySelector('#home-ilove-success');

  const fileInput = container.querySelector('#home-wb-file-input');
  const dropzone = container.querySelector('#home-wb-dropzone');
  const chooseBtn = container.querySelector('#home-ilove-choose-btn');
  const addMoreBtn = container.querySelector('#home-add-more-btn');
  const filesGrid = container.querySelector('#home-files-grid');
  const filesCount = container.querySelector('#home-files-count');
  const executeBtn = container.querySelector('#home-wb-execute-btn');
  const statusLabel = container.querySelector('#home-wb-status');
  const finalDownloadBtn = container.querySelector('#home-final-download-btn');
  const finalDownloadTxt = container.querySelector('#home-final-download-txt');
  const previewBtn = container.querySelector('#home-wb-preview-btn');
  const processAnotherBtn = container.querySelector('#home-wb-process-another-btn');

  let lastResult = null;

  function renderFilesList() {
    if (selectedFiles.length === 0) {
      stageUpload.style.display = 'flex';
      stageActive.style.display = 'none';
      stageSuccess.style.display = 'none';
      executeBtn.disabled = true;
      return;
    }

    stageUpload.style.display = 'none';
    stageActive.style.display = 'grid';
    stageSuccess.style.display = 'none';
    executeBtn.disabled = false;
    filesCount.textContent = selectedFiles.length;

    filesGrid.innerHTML = '';
    selectedFiles.forEach((f, idx) => {
      const card = document.createElement('div');
      card.className = 'ilove-file-card';
      const ext = (f.name.split('.').pop() || 'PDF').toUpperCase();
      const sizeStr = (f.size / 1024).toFixed(1) + ' KB';
      card.innerHTML = `
        <button type="button" class="ilove-file-card-del" title="Remove file" data-idx="${idx}">✕</button>
        <div class="ilove-file-thumb">${ext}</div>
        <div class="ilove-file-name" title="${f.name}">${f.name}</div>
        <div class="ilove-file-size">${sizeStr}</div>
      `;
      card.querySelector('.ilove-file-card-del').addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFiles.splice(idx, 1);
        renderFilesList();
      });
      filesGrid.appendChild(card);
    });
  }

  if (dropzone) {
    dropzone.addEventListener('click', () => fileInput.click());
    ['dragover', 'dragenter'].forEach(eName => {
      dropzone.addEventListener(eName, (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(eName => {
      dropzone.addEventListener(eName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length > 0) {
        selectedFiles = Array.from(e.dataTransfer.files);
        renderFilesList();
      }
    });
  }

  if (chooseBtn) {
    chooseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      if (tool.multiFile) {
        selectedFiles = [...selectedFiles, ...Array.from(fileInput.files)];
      } else {
        selectedFiles = Array.from(fileInput.files);
      }
      renderFilesList();
    }
  });

  if (addMoreBtn) {
    addMoreBtn.addEventListener('click', () => fileInput.click());
  }

  executeBtn.onclick = async () => {
    if (selectedFiles.length === 0) return;
    executeBtn.disabled = true;
    statusLabel.textContent = 'Processing client-side in browser memory...';
    statusLabel.style.color = '#e5322d';

    const options = {};
    const angleEl = container.querySelector('#home-wb-opt-angle');
    if (angleEl) options.angle = parseInt(angleEl.value, 10);
    const textEl = container.querySelector('#home-wb-opt-text');
    if (textEl) options.text = textEl.value;
    const levelEl = container.querySelector('#home-wb-opt-level');
    if (levelEl) options.level = levelEl.value;
    const passEl = container.querySelector('#home-wb-opt-pass');
    if (passEl) { options.userPassword = passEl.value; options.password = passEl.value; }
    const splitModeEl = container.querySelector('#home-wb-opt-split-mode');
    if (splitModeEl) options.mode = splitModeEl.value;

    try {
      const result = await window.converterEngine.runPdfTool(tool.id, selectedFiles, options, (pct, msg) => {
        statusLabel.textContent = `[${pct}%] ${msg}`;
      });
      lastResult = result;
      const downloadUrl = URL.createObjectURL(result.blob);
      finalDownloadBtn.href = downloadUrl;
      finalDownloadBtn.download = result.name;
      finalDownloadTxt.textContent = `Download ${result.name} (${(result.blob.size / 1024).toFixed(1)} KB)`;

      stageUpload.style.display = 'none';
      stageActive.style.display = 'none';
      stageSuccess.style.display = 'flex';
    } catch (err) {
      statusLabel.textContent = `Error: ${err.message}`;
      statusLabel.style.color = '#e5322d';
      executeBtn.disabled = false;
    }
  };

  if (previewBtn) {
    previewBtn.onclick = () => {
      if (lastResult) openHomePreviewModal(lastResult.name, lastResult.blob);
    };
  }

  if (processAnotherBtn) {
    processAnotherBtn.onclick = () => {
      selectedFiles = [];
      renderFilesList();
    };
  }
}

function setupHomePdfTools() {
  const grid = document.getElementById('home-tools-grid');
  if (!grid) return;

  const searchInput = document.getElementById('home-tool-search');
  const filterBtns = document.querySelectorAll('#home-filter-pills .ilove-filter-btn');

  let activeFilter = 'all';
  let searchQuery = '';

  function renderTools() {
    grid.replaceChildren();
    const filtered = PDF_TOOLS_CATALOG.filter(t => {
      const matchesGroup = activeFilter === 'all' || t.group.toLowerCase() === activeFilter.toLowerCase();
      const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery) || t.desc.toLowerCase().includes(searchQuery) || t.group.toLowerCase().includes(searchQuery);
      return matchesGroup && matchesSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);">No tools matched your search query.</div>`;
      return;
    }

    filtered.forEach(tool => {
      const card = document.createElement('a');
      card.className = 'ilove-tool-card';
      const slug = tool.id.replace(/-/g, '_');
      card.href = `/${slug}`;
      card.style.textDecoration = 'none';
      card.style.color = 'inherit';
      card.innerHTML = `
        <div class="ilove-card-icon ${tool.iconColor || 'icon-red'}">
          ${getToolSvg(tool.id)}
        </div>
        <h3 class="ilove-card-title">${tool.name}</h3>
        <p class="ilove-card-desc">${tool.desc}</p>
        <div class="ilove-card-meta">
          <span>${tool.engine}</span>
          <span class="ilove-card-tier">Tier ${tool.tier || 'A'}</span>
        </div>
        <div class="ilove-card-cta" style="margin-top:14px;padding-top:10px;border-top:1px dashed var(--line);display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:#e5322d;font-weight:700;">
          <span>Process in Studio</span>
          <span>&rarr;</span>
        </div>
      `;
      card.addEventListener('click', (e) => {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          openHomeToolWorkbench(tool);
        }
      });
      grid.appendChild(card);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = (e.target.value || '').trim().toLowerCase();
      renderTools();
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.group;
      renderTools();
    });
  });

  document.querySelectorAll('[data-filter-jump]').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.getAttribute('data-filter-jump');
      const targetPill = Array.from(filterBtns).find(b => b.dataset.group.toLowerCase() === group.toLowerCase());
      if (targetPill) {
        targetPill.click();
      }
      const toolsSection = document.getElementById('tools');
      if (toolsSection) {
        toolsSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  renderTools();
}

// ==============================================================
// 3D Animated Systems (Anime.js / Magic UI / Refero Parallax Engine)
// ==============================================================
function init3DEffects() {
  // 1. Ambient 3D Particle Space Mesh Canvas
  const canvas = document.getElementById('portal-particle-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
    let height = canvas.height = canvas.parentElement.offsetHeight || 600;

    const resize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement.offsetHeight || 600;
    };
    window.addEventListener('resize', resize, { passive: true });

    // 3D particles with (x, y, z) and velocity
    const count = Math.min(45, Math.max(25, Math.floor(width / 30)));
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width * 1.3,
        y: (Math.random() - 0.5) * height * 1.3,
        z: Math.random() * 550 + 100,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        vz: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1.2,
        color: Math.random() > 0.45 ? 'rgba(229, 50, 45,' : 'rgba(99, 102, 241,'
      });
    }

    let mouseX = 0, mouseY = 0;
    let targetCameraX = 0, targetCameraY = 0;
    let cameraX = 0, cameraY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX - window.innerWidth / 2);
      mouseY = (e.clientY - window.innerHeight / 2);
      targetCameraX = mouseX * 0.12;
      targetCameraY = mouseY * 0.12;
    }, { passive: true });

    const fov = 400;

    function render3D() {
      cameraX += (targetCameraX - cameraX) * 0.05;
      cameraY += (targetCameraY - cameraY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      const projected = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        if (p.x < -width) p.x = width;
        if (p.x > width) p.x = -width;
        if (p.y < -height) p.y = height;
        if (p.y > height) p.y = -height;
        if (p.z < 80) p.z = 650;
        if (p.z > 650) p.z = 80;

        const depth = p.z + 100;
        const scale = fov / (fov + depth);
        const px = (p.x - cameraX) * scale + cx;
        const py = (p.y - cameraY) * scale + cy;

        projected.push({ x: px, y: py, scale, p });

        const alpha = Math.min(1, Math.max(0.18, scale * 1.4));
        ctx.beginPath();
        ctx.arc(px, py, p.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${alpha * 0.75})`;
        ctx.shadowColor = p.color + ' 0.8)';
        ctx.shadowBlur = 8 * scale;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw filament lines between close particles
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 115) {
            const lineAlpha = (1 - dist / 115) * 0.22;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.strokeStyle = `rgba(229, 50, 45, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(render3D);
    }
    render3D();
  }

  // 2. Interactive 3D Card Tilt with Specular Glare
  const tiltCards = document.querySelectorAll('[data-tilt-3d]');
  tiltCards.forEach(card => {
    let bounds = card.getBoundingClientRect();
    const updateBounds = () => { bounds = card.getBoundingClientRect(); };
    window.addEventListener('resize', updateBounds, { passive: true });
    window.addEventListener('scroll', updateBounds, { passive: true });

    card.addEventListener('mousemove', e => {
      bounds = card.getBoundingClientRect();
      const mouseX = e.clientX - bounds.left;
      const mouseY = e.clientY - bounds.top;
      const xPct = (mouseX / bounds.width) * 100;
      const yPct = (mouseY / bounds.height) * 100;

      card.style.setProperty('--mouse-x', `${xPct.toFixed(1)}%`);
      card.style.setProperty('--mouse-y', `${yPct.toFixed(1)}%`);

      const tiltX = ((mouseY - bounds.height / 2) / (bounds.height / 2)) * -6.5;
      const tiltY = ((mouseX - bounds.width / 2) / (bounds.width / 2)) * 6.5;

      card.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init3DEffects);
} else {
  init3DEffects();
}


