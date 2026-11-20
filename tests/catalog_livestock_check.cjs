// catalog.html Livestock + Handicraft scenes: dairy is cow+goat+buffalo flowing into a milk jug and
// dairy products, every fish is inside the pond, and the handicraft glyphs are photos (no woven mat).
// Run manually: node tests/catalog_livestock_check.cjs      (needs a server on :8123)
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`${BASE}/catalog.html`, { waitUntil: 'networkidle' });
  await p.waitForSelector('.scene-pasture .animal', { timeout: 20000 });
  await p.waitForTimeout(1000);

  let pass = 0, fail = 0;
  const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${d ? '   ' + d : ''}`); };

  const s = await p.evaluate(() => {
    const rect = e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
    const pondEl = document.querySelector('.scene-pasture .animal[data-category="fish"] .animal-emojis');
    const fish = [...document.querySelectorAll('.scene-pasture .animal[data-category="fish"] .animal-emoji')];
    const fishImgs = [...document.querySelectorAll('.scene-pasture .fish-img')].map(i => ({
      src: i.currentSrc.split('/').pop(), decoded: i.complete && i.naturalWidth > 0,
      h: Math.round(i.getBoundingClientRect().height) }));
    const pdfBtn = [...document.querySelectorAll('a[download], a[href$=".pdf"]')].map(a => a.textContent.trim());
    const pond = rect(pondEl);
    const pondBg = getComputedStyle(pondEl).backgroundImage;
    const dairy = [...document.querySelectorAll('.scene-pasture .animal[data-category="dairy"] .animal-emoji')];
    const jug = document.querySelector('.scene-pasture .animal[data-category="dairy"] .dairy-jug');
    const products = [...document.querySelectorAll('.scene-pasture .animal[data-category="dairy"] .dairy-product')];
    const arrows = [...document.querySelectorAll('.scene-pasture .animal[data-category="dairy"] .dairy-arrow')];
    const craft = document.querySelector('.scene-craft .craft');
    const plates = [...document.querySelectorAll('.scene-craft .craft-img')];
    return {
      // one glyph per grant on both chains
      fishGlyphs: fish.length, fishLabel: parseInt(document.querySelector('.scene-pasture .animal[data-category="fish"] .grant-toggle').textContent, 10),
      dairyGlyphs: dairy.length, dairyLabel: parseInt(document.querySelector('.scene-pasture .animal[data-category="dairy"] .grant-toggle').textContent, 10),
      fishImgs, pdfBtn,
      species: [...new Set(dairy.map(e => e.textContent))],
      // fish: every glyph inside the pond's painted ellipse (the pond carries the water gradient itself)
      pondBg, fishOutside: fish.map(rect).filter(f => f.l < pond.l || f.r > pond.r || f.b > pond.b + 1 || f.t < pond.t - 14).length,
      // dairy: three animals, one jug, three products, two connecting arrows
      jugText: jug ? jug.textContent.trim() : null,
      productLabels: products.map(e => e.textContent.trim()),
      arrows: arrows.length,
      // handicraft: mat gone, plate photo present and decoded
      mat: getComputedStyle(craft, '::before').content,
      plates: plates.map(i => ({ src: i.currentSrc.split('/').pop(), w: Math.round(i.getBoundingClientRect().width), decoded: i.complete && i.naturalWidth > 0 })),
    };
  });

  ok('fish: one glyph per grant', s.fishGlyphs === s.fishLabel, `${s.fishGlyphs} glyphs / ${s.fishLabel} grants`);
  ok('fish: every glyph sits inside the pond', s.fishGlyphs > 0 && s.fishOutside === 0, `${s.fishOutside} outside`);
  ok('fish: the pond is water (painted gradient), not the bare grass band', /gradient/.test(s.pondBg));
  ok('fish: Nepali market species as photos, not one emoji', s.fishImgs.length >= 4 &&
    new Set(s.fishImgs.map(i => i.src)).size >= 4 && s.fishImgs.every(i => i.decoded && i.h >= 20),
    JSON.stringify(s.fishImgs.map(i => i.src)));
  ok('no placeholder PDF button', s.pdfBtn.length === 0, s.pdfBtn.join(','));
  ok('dairy: cow, goat and buffalo', s.dairyGlyphs === 3 && s.species.length === 3, s.species.join(' '));
  ok('dairy: herd feeds one milk jug', !!s.jugText && s.jugText.length > 0, s.jugText || 'missing');
  ok('dairy: milk expands into three products', s.productLabels.length === 3 && /cheese/i.test(s.productLabels.join(' ')) && /ice/i.test(s.productLabels.join(' ')) && /yogurt/i.test(s.productLabels.join(' ')), s.productLabels.join(' | '));
  ok('dairy: arrows connect herd -> jug -> products', s.arrows === 2, `${s.arrows} arrows`);
  ok('handicraft: the woven mat is gone', s.mat === 'none', `::before content=${s.mat}`);
  ok('handicraft: sal-leaf plate photo loads at glyph size', s.plates.length > 0 && s.plates.every(i => i.decoded && i.w >= 40),
    JSON.stringify(s.plates));
  ok('allo: doko basket photo loads', s.plates.some(i => i.src === 'doko.webp' && i.decoded), JSON.stringify(s.plates.map(i => i.src)));
  ok('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  console.log(`\n${fail ? 'FAILURES: ' + fail : 'all green'}  (${pass} passed)`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
