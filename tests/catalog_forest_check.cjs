// catalog.html Forest-based section: the chains must read as ONE forest, not isolated icons.
// Run manually: node tests/catalog_forest_check.cjs      (needs a server on :8123)
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`${BASE}/catalog.html`, { waitUntil: 'networkidle' });
  await p.waitForSelector('.forest .tree', { timeout: 20000 });
  await p.waitForTimeout(1500);

  let pass = 0, fail = 0;
  const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${d ? '   ' + d : ''}`); };

  const scene = await p.evaluate(() => {
    const forest = document.querySelector('.forest');
    const trees = [...document.querySelectorAll('.forest .tree')];
    const cs = getComputedStyle(forest);
    const before = getComputedStyle(forest, '::before');
    const after = getComputedStyle(forest, '::after');
    // canopy continuity: adjacent crowns must overlap or near-touch (no isolated tree standing apart)
    const crowns = trees.map(t => { const r = t.querySelector('.canopy').getBoundingClientRect(); return { l: r.left, r: r.right }; });
    const gaps = [];
    for (let i = 1; i < crowns.length; i++) gaps.push(Math.max(0, crowns[i].l - crowns[i - 1].r));
    const overlap = gaps.filter(g => g === 0).length;
    const trunks = trees.map(t => t.querySelector('.trunk')).filter(el => el.offsetParent !== null)
      .map(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
    // per-line text boxes of adjacent name labels must not intersect (single-line names, so one box each)
    const labelLines = trees.map(t => {
      const range = document.createRange(); range.selectNodeContents(t.querySelector('.tree-name'));
      return [...range.getClientRects()].map(b => ({ l: b.left, r: b.right }));
    });
    const labelHits = [];
    for (let i = 1; i < labelLines.length; i++)
      for (const a of labelLines[i - 1]) for (const q of labelLines[i])
        if (Math.min(a.r, q.r) - Math.max(a.l, q.l) > 0) labelHits.push(i);    const trunkBottoms = trunks.map(t => t.bottom);
    const groundTop = after.content !== 'none' ? forest.getBoundingClientRect().bottom - parseFloat(after.bottom) - parseFloat(after.height) : null;
    return {
      n: trees.length,
      filterContract: trees.every(t => t.classList.contains('product-card') && (t.dataset.category || '').length > 1),
      bg: cs.backgroundImage,
      beforeBg: before.backgroundImage, afterBg: after.backgroundImage,
      overlap, pairs: crowns.length - 1, gaps, maxGap: Math.max(...gaps),
      trunkSpread: Math.max(...trunkBottoms) - Math.min(...trunkBottoms),
      groundedEvery: groundTop == null ? false : trunks.every(t => t.top < groundTop && groundTop < t.bottom),
      labelHits,
    };
  });

  ok('forest section grows at least 2 trees', scene.n >= 2, `${scene.n} trees`);
  ok('every tree keeps the filter contract (.product-card + data-category)', scene.filterContract);
  ok('scene is layered (sky gradient + treeline + ground)', /gradient/.test(scene.bg) && /gradient/.test(scene.beforeBg) && /gradient/.test(scene.afterBg),
    `bg=${scene.bg.slice(0, 40)}…`);
  // half a typical crown: wider gaps read as a separate tree, not one stand
  ok('crowns form one continuous mass (no tree stands apart)', scene.pairs > 0 && scene.maxGap <= 56,
    scene.pairs ? `max gap=${scene.maxGap.toFixed(0)}px gaps=[${scene.gaps.map(g => g.toFixed(0)).join(',')}]` : 'no pairs');
  ok('name labels never touch (no text-on-text collision)', scene.labelHits.length === 0,
    scene.labelHits.length ? JSON.stringify(scene.labelHits) : '');
  ok('trunks share one ground line', scene.trunkSpread <= 8, `spread=${scene.trunkSpread.toFixed(1)}px`);
  ok('the ground line crosses every trunk (all bases rooted in the soil)', scene.groundedEvery,
    scene.groundedEvery ? '' : 'some trunk floats above or hides under the ground band');
  ok('every tree has a grants toggle button', (await p.$$('.forest .grant-toggle')).length === scene.n);
  // bamboo is drawn in CSS (no photo in repo): 3 segmented culms, no emoji
  const bamboo = await p.evaluate(() => {
    const c = document.querySelector('.forest .tree[data-category="bamboo"] .canopy');
    if(!c) return null;
    const cs = getComputedStyle(c);
    return { culms: c.querySelectorAll('i').length, emoji: c.querySelectorAll('.canopy-icon').length,
      segmented: cs.backgroundImage.includes('repeating-linear-gradient') || [...c.querySelectorAll('i')].every(i => getComputedStyle(i).backgroundImage.includes('repeating-linear-gradient')) };
  });
  ok('bamboo grows as a CSS grove (3 segmented culms, no emoji)', !!bamboo && bamboo.culms === 3 && bamboo.emoji === 0 && bamboo.segmented === true, JSON.stringify(bamboo));
  ok('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  // the soil floor reaches the section bottom (labels sit ON soil, not beside a floating band)
  const floor = await p.evaluate(() => {
    const a = getComputedStyle(document.querySelector('.forest'), '::after');
    return { bottom: parseFloat(a.bottom), height: parseFloat(a.height) };
  });
  ok('the soil floor reaches the section bottom', floor.bottom === 0 && floor.height >= 70,
    `bottom=${floor.bottom} height=${floor.height}`);

  // clicking a grants caption opens that tree and fills the shared drawer below the soil
  // with an Organization × Grant title table — and no tree moves (drawer only, never flow).
  // (scroll to viewport centre first — the sticky site header can cover a just-revealed button)
  const btns = await p.$$('.forest .grant-toggle');
  const clickBtn = async i => {
    await btns[i].evaluate(b => b.scrollIntoView({ block: 'center' }));
    await btns[i].click();
    await p.waitForTimeout(300);
  };
  const treeXs = () => p.evaluate(() => [...document.querySelectorAll('.forest .tree')].map(t => Math.round(t.getBoundingClientRect().left)));
  const xsBefore = await treeXs();
  await clickBtn(0);
  const open1 = await p.evaluate(() => {
    const o = [...document.querySelectorAll('.forest .tree')].filter(t => t.classList.contains('open'));
    const one = o[0];
    const drawer = document.querySelector('#catalogGrid .roots-drawer');
    const db = drawer && !drawer.hidden ? getComputedStyle(drawer).backgroundImage : '';
    const rows = drawer && !drawer.hidden ? [...drawer.querySelectorAll('.roots-table tbody tr')] : [];
    const fr = document.querySelector('.forest').getBoundingClientRect();
    return { open: o.length,
      expanded: one ? one.querySelector('.grant-toggle').getAttribute('aria-expanded') : null,
      name: one ? one.querySelector('.tree-name').textContent : null,
      grantsN: one ? parseInt(one.querySelector('.grant-toggle').textContent, 10) : null,
      drawerHidden: drawer ? drawer.hidden : null,
      drawerSoil: /gradient/.test(db) && db.includes('122, 92, 62'),
      drawerBelowSoil: drawer ? drawer.getBoundingClientRect().top >= fr.bottom - 2 : null,
      drawerHead: drawer ? drawer.querySelector('.roots-head').textContent : null,
      cols: drawer ? drawer.querySelectorAll('.roots-table thead th').length : 0,
      rows: rows.map(r => [...r.querySelectorAll('td')].map(c => c.textContent.trim())) };
  });
  const titlesAreFull = open1.rows.every(r => r.length === 2 && r[0].length > 0 && r[1].length >= 30);
  ok('clicking grants opens that tree (drawer on soil background)', open1.open === 1 && open1.expanded === 'true'
    && open1.drawerHidden === false && open1.drawerSoil === true && open1.drawerHead.includes(open1.name),
    JSON.stringify({ ...open1, rows: open1.rows.length }));
  ok('one table row per grant: org + full grant_title', open1.rows.length === open1.grantsN && open1.cols === 2 && titlesAreFull,
    `${open1.rows.length} rows for ${open1.grantsN} grants, minlen=${Math.min(...open1.rows.map(r => r[1].length))}`);
  ok('drawer sits below the soil', open1.drawerBelowSoil === true, `belowSoil=${open1.drawerBelowSoil}`);
  ok('no tree moves when one opens', JSON.stringify(await treeXs()) === JSON.stringify(xsBefore));
  await clickBtn(1);
  const open2 = await p.evaluate(() => ({
    open: [...document.querySelectorAll('.forest .tree.open')].map(t => t.dataset.category),
    head: document.querySelector('#catalogGrid .roots-drawer .roots-head').textContent }));
  ok('accordion: opening a second tree closes the first and refills the drawer', open2.open.length === 1, JSON.stringify(open2));
  await clickBtn(1);
  const open3 = await p.evaluate(() => ({
    open: document.querySelectorAll('.forest .tree.open').length,
    drawerHidden: document.querySelector('#catalogGrid .roots-drawer').hidden }));
  ok('clicking again closes the tree and drawer', open3.open === 0 && open3.drawerHidden === true);
  ok('no tree moves across open/close', JSON.stringify(await treeXs()) === JSON.stringify(xsBefore));
  console.log(`\n${fail ? 'FAILURES: ' + fail : 'all green'}  (${pass} passed)`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
