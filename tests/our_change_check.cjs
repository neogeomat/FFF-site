// our-change.html media card: the infographic must be a local asset that actually renders, at 16:10
// (the .card-media box uses aspect-ratio 16/10 + object-fit:cover — a different ratio gets cropped).
// Run manually: node tests/our_change_check.cjs      (needs a server on :8123)
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('requestfailed', r => errs.push('REQFAIL ' + r.url()));
  await p.goto(`${BASE}/our-change.html`, { waitUntil: 'load' });
  await p.waitForTimeout(300);

  const m = await p.evaluate(() => {
    const img = document.querySelector('.card-media img');
    if (!img) return null;
    const box = img.getBoundingClientRect();
    return {
      src: img.getAttribute('src'), nat: [img.naturalWidth, img.naturalHeight],
      box: [Math.round(box.width), Math.round(box.height)],
      loaded: img.complete && img.naturalWidth > 0,
      alt: (img.alt || '').trim(),
      svgText: null,
    };
  });

  const a = await p.evaluate(() => {
    const s = [...document.querySelectorAll('section.section')]
      .find(el => el.textContent.includes('Advocacy and policy reforms'));
    return s ? {
      idx: [...document.querySelectorAll('section.section')].indexOf(s),
      h3: [...s.querySelectorAll('h3')].map(h => h.textContent.trim()),
      lis: [...s.querySelectorAll('li')].map(l => l.textContent.trim()),
    } : null;
  });

  let pass = 0, fail = 0;
  const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${d ? '   ' + d : ''}`); };
  ok('the country highlight is the first section on the page', !!a && a.idx === 0);
  ok('it names both advocacy blocks and the three outcomes',
     !!a && a.h3.join('|') === 'FECOFUN advocacy|FFPOs impacting national strategies|Outcomes include' && a.lis.length === 3,
     a ? a.h3.join(' / ') : '');
  ok('our-change.html has a card-media image', !!m);
  ok('the infographic is a local asset, not a hotlinked stock photo', !!m && !/^https?:/.test(m.src), m ? m.src : '');
  ok('the infographic loads', !!m && m.loaded, m ? `${m.nat[0]}x${m.nat[1]}` : '');
  ok('the infographic is 16:10 to match the card box (cover would crop another ratio)',
     !!m && Math.abs(m.nat[0] / m.nat[1] - 1.6) < 0.01, m ? (m.nat[0] / m.nat[1]).toFixed(3) : '');
  ok('the alt text carries the numbers for screen readers', !!m && /\d/.test(m.alt) && m.alt.length > 80, m ? m.alt.length + ' chars' : '');
  ok('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(`\n${fail ? 'FAILURES: ' + fail : 'all green'}  (${pass} passed)`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
