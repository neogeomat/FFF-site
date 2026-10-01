// Story-map content contract. Tests the REPO csv (data/stories.csv): the Google Sheet request is
// stubbed with the repo csv, i.e. exactly the post-paste state of the Google Sheet, so the same
// assertions hold before and after you paste into the sheet. Run over HTTP:
//   node tests/storymaps_check.cjs
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.STORY_URL || 'http://127.0.0.1:8123/storymaps.html';  // 127.0.0.1, not localhost: python's http.server binds IPv4 only

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? '   ' + detail : ''}`);
  cond ? pass++ : fail++;
};

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  // Serve the repo csv AS the Google Sheet: that is exactly the post-paste state, and it keeps the
  // page's own network clean (aborting the real request would surface as a console error).
  // NO_STUB=1 skips this, i.e. checks whatever the LIVE sheet currently holds.
  const sheetCsv = fs.readFileSync(path.join(__dirname, '..', 'data', 'stories.csv'), 'utf8');
  let stubbed = 0;
  if (!process.env.NO_STUB) {
    await p.route('**docs.google.com**', r => { stubbed++; return r.fulfill({ status: 200, contentType: 'text/csv', body: sheetCsv }); });
  }

  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForSelector('.story-card', { timeout: 15000 });
  await p.waitForTimeout(1200);

  const data = await p.evaluate(async () => {
    const cards = [...document.querySelectorAll('.story-card')];
    // force-load every photo (they are loading="lazy" and the strip is wider than the viewport)
    await Promise.all(cards.map(async c => {
      const img = c.querySelector('.story-card-media img');
      if (!img) return;
      img.loading = 'eager';
      try { await img.decode(); } catch (e) { /* counted as width 0 below */ }
    }));
    return cards.map(c => {
      const t = c.querySelector('.story-text');
      const img = c.querySelector('.story-card-media img');
      return {
        badge: (c.querySelector('.badge') || {}).textContent || '',
        firstTag: t && t.firstElementChild ? t.firstElementChild.tagName : null,
        hasQuote: !!(t && t.querySelector('blockquote')),
        md: !!(t && /\*\*/.test(t.textContent)),
        img: img ? { url: img.currentSrc || img.src, w: img.naturalWidth } : null,
        chars: t ? t.textContent.trim().length : 0,
      };
    });
  });

  ok('the sheet was stubbed with the repo csv (post-paste state)', !!process.env.NO_STUB || stubbed > 0, process.env.NO_STUB ? 'NO_STUB=1 — reading the live sheet' : stubbed + ' request(s)');
  ok('6 story cards render', data.length === 6, `${data.length} cards`);
  ok('badges are 1-based',
     data.every((d, i) => d.badge.trim() === `Story ${i + 1}`),
     data.map(d => d.badge.trim()).join(', '));
  ok('no card is numbered "Story 0"', !data.some(d => /^Story 0$/.test(d.badge.trim())));
  ok('every card opens with a blockquote (the rule)',
     data.every(d => d.firstTag === 'BLOCKQUOTE'),
     data.map(d => d.firstTag).join(', '));
  ok('every card has a non-empty narrative', data.every(d => d.chars > 300),
     data.map(d => d.chars).join(', '));
  ok('no markdown leaked into the rendered text', !data.some(d => d.md));
  // >=900px, not >0: the whole "images look low resolution" bug was FAO's medium_ variant (205px) passing
  // a >0 check while being upscaled into a ~460px-wide card.
  ok('every card has a photo that loads, at >=900px wide',
     data.every(d => d.img && d.img.w >= 900),
     data.map(d => d.img ? d.img.w + 'px' : 'none').join(', '));
  const quoteStyle = await p.evaluate(() => {
    const q = document.querySelector('.story-card .story-text blockquote');
    if (!q) return null;
    const cs = getComputedStyle(q);
    return { border: cs.borderLeftWidth, bg: cs.backgroundColor, font: cs.fontFamily.split(',')[0] };
  });
  ok('the blockquote is styled as a pull-quote (css/storymaps.css rule applies)',
     quoteStyle && parseFloat(quoteStyle.border) >= 3 && quoteStyle.bg !== 'rgba(0, 0, 0, 0)',
     JSON.stringify(quoteStyle));
  ok('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  console.log(`\n${fail ? 'FAILURES: ' + fail : 'all green'}  (${pass} passed)`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
