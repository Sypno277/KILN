const fs = require('fs');
const path = require('path');

const slugs = JSON.parse(fs.readFileSync('recon/convert-slugs.json', 'utf8'));

// Helper for delays
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
      console.warn(`Fetch ${url} got status ${res.status}, retry ${i + 1}`);
    } catch (e) {
      console.warn(`Fetch ${url} error: ${e.message}, retry ${i + 1}`);
    }
    await sleep(500 * (i + 1));
  }
  return null;
}

function parseGuideHtml(html, slug, lang) {
  if (!html) return null;

  // Title, description
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1] : '';

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  const description = descMatch ? descMatch[1] : '';

  // Breadcrumbs
  // H1
  const h1Match = html.match(/<h1>([^<]+)<\/h1>/);
  const h1 = h1Match ? h1Match[1].trim() : '';

  const leadMatch = html.match(/<p class="lead">([\s\S]*?)<\/p>/);
  const lead = leadMatch ? leadMatch[1].trim() : '';

  // Tags
  const tagsMatch = html.match(/<p class="tags">([\s\S]*?)<\/p>/);
  const tags = [];
  if (tagsMatch) {
    const tRegex = /<span class="tag([^"]*)">([^<]+)<\/span>/g;
    let tm;
    while ((tm = tRegex.exec(tagsMatch[1])) !== null) {
      tags.push({ class: tm[1].trim(), text: tm[2].trim() });
    }
  }

  // Visual pair
  // <span class="file-icon file-icon-lg" data-kind="image" style="--type:#378add" aria-hidden="true"><b>HEIC</b></span>
  const pairMatches = [...html.matchAll(/<span class="file-icon file-icon-lg"\s+data-kind="([^"]*)"(?:\s+style="([^"]*)")?[^>]*><b>([^<]+)<\/b><\/span>/g)];
  const pair = pairMatches.map(m => ({ kind: m[1], style: m[2] || '', ext: m[3] }));

  // Steps
  const stepsMatch = html.match(/<ol class="steps">([\s\S]*?)<\/ol>/);
  const steps = [];
  if (stepsMatch) {
    const sRegex = /<li class="step"[^>]*><span class="step-number">(\d+)<\/span><h3>([^<]+)<\/h3><p>([\s\S]*?)<\/p><\/li>/g;
    let sm;
    while ((sm = sRegex.exec(stepsMatch[1])) !== null) {
      steps.push({ num: sm[1], title: sm[2].trim(), desc: sm[3].trim() });
    }
  }

  // Details
  const detailsCopyMatch = html.match(/<div class="details-copy"[^>]*>([\s\S]*?)<\/div>/);
  let details = { title: '', tip: '', checks: [] };
  if (detailsCopyMatch) {
    const h2M = detailsCopyMatch[1].match(/<h2>([^<]+)<\/h2>/);
    const tipM = detailsCopyMatch[1].match(/<p class="tip">([\s\S]*?)<\/p>/);
    const checks = [...detailsCopyMatch[1].matchAll(/<li><svg[^>]*>[\s\S]*?<\/svg><span>([\s\S]*?)<\/span><\/li>/g)].map(m => m[1].trim());
    details = {
      title: h2M ? h2M[1].trim() : '',
      tip: tipM ? tipM[1].trim() : '',
      checks
    };
  }

  // Details side: "HEIC can also become" -> fmt list
  const detailsSideMatch = html.match(/<div class="details-side"[^>]*>([\s\S]*?)<\/div>/);
  let sideFormats = { title: '', list: [] };
  if (detailsSideMatch) {
    const h3M = detailsSideMatch[1].match(/<h3>([^<]+)<\/h3>/);
    const list = [...detailsSideMatch[1].matchAll(/<(a|span)\s+class="fmt([^"]*)"(?:\s+href="([^"]*)")?>([^<]+)<\/\1>/g)].map(m => ({
      name: m[4].trim(),
      href: m[3] || null,
      isLink: m[2].includes('fmt-link')
    }));
    sideFormats = { title: h3M ? h3M[1].trim() : '', list };
  }

  // About articles
  const aboutMatches = [...html.matchAll(/<article class="about-card"[^>]*>([\s\S]*?)<\/article>/g)];
  const about = aboutMatches.map(m => {
    const cardHtml = m[1];
    const nameM = cardHtml.match(/<h3>([^<]+)<\/h3>/);
    const mutedM = cardHtml.match(/<p class="muted">([^<]+)<\/p>/);
    const pM = cardHtml.match(/<\/header>\s*<p>([\s\S]*?)<\/p>/);
    const extM = cardHtml.match(/<p class="about-ext"><span>([^<]+)<\/span>([\s\S]*?)<\/p>/);
    const exts = extM ? [...extM[2].matchAll(/<code>([^<]+)<\/code>/g)].map(e => e[1]) : [];
    const linkM = cardHtml.match(/<p class="more-link"><a\s+href="([^"]+)">([^<]+)/);
    return {
      name: nameM ? nameM[1].trim() : '',
      kind: mutedM ? mutedM[1].trim() : '',
      desc: pM ? pM[1].trim() : '',
      extLabel: extM ? extM[1].trim() : '',
      exts,
      moreHref: linkM ? linkM[1] : '',
      moreText: linkM ? linkM[2].trim() : ''
    };
  });

  // Related conversions
  const relatedMatch = html.match(/<div class="related"[^>]*>([\s\S]*?)<\/div>/);
  const related = [];
  if (relatedMatch) {
    const secRegex = /<div><h3>([^<]+)<\/h3><ul class="pills">([\s\S]*?)<\/ul><\/div>/g;
    let rSec;
    while ((rSec = secRegex.exec(relatedMatch[1])) !== null) {
      const secTitle = rSec[1].trim();
      const pills = [...rSec[2].matchAll(/<a class="pill"\s+href="([^"]+)">([^<]+)<\/a>/g)].map(p => ({
        href: p[1],
        text: p[2].trim()
      }));
      related.push({ title: secTitle, pills });
    }
  }

  // Schema LD JSON
  const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let ldJson = null;
  if (ldJsonMatch) {
    try { ldJson = JSON.parse(ldJsonMatch[1]); } catch {}
  }

  return {
    slug,
    lang,
    title,
    description,
    h1,
    lead,
    tags,
    pair,
    steps,
    details,
    sideFormats,
    about,
    related,
    ldJson
  };
}

async function main() {
  fs.mkdirSync('recon/guides', { recursive: true });
  fs.mkdirSync('src/data/guides', { recursive: true });

  const allGuides = {};

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    console.log(`[${i + 1}/${slugs.length}] Processing ${slug}...`);

    for (const lang of ['en', 'ko', 'zh-CN']) {
      const urlPath = lang === 'en' ? `/convert/${slug}/` : lang === 'ko' ? `/ko/convert/${slug}/` : `/zh-cn/convert/${slug}/`;
      const url = `https://filee.sh${urlPath}`;
      const cacheFile = `recon/guides/${slug}.${lang}.html`;

      let html = null;
      if (fs.existsSync(cacheFile)) {
        html = fs.readFileSync(cacheFile, 'utf8');
      } else {
        html = await fetchWithRetry(url);
        if (html) fs.writeFileSync(cacheFile, html);
        await sleep(100); // polite 100ms delay
      }

      if (html) {
        const parsed = parseGuideHtml(html, slug, lang);
        if (!allGuides[slug]) allGuides[slug] = {};
        allGuides[slug][lang] = parsed;
      }
    }
  }

  fs.writeFileSync('src/data/guides.json', JSON.stringify(allGuides, null, 2));
  console.log(`Extracted all guides to src/data/guides.json (${Object.keys(allGuides).length} guides)`);
}

main().catch(console.error);
