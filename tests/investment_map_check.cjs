// Investment Map contract — the website page (investment-map.html) vs the Webmap's Investment mode.
// Two things the page's own charts used to get wrong: nodes drawn with a bare name (no value, unlike the
// Webmap charts) and no tooltips. Plus the Webmap header must offer the Investment Map like the site's.
// The Google Sheet is stubbed with the repo csv so the run is deterministic. Run over HTTP:
//   node tests/investment_map_check.cjs          (needs a server on 8123: python3 -m http.server 8123 --directory website)
//   NO_STUB=1 node tests/investment_map_check.cjs   checks the LIVE sheet instead
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ORIGIN = process.env.SITE_ORIGIN || 'http://127.0.0.1:8123';   // 127.0.0.1: python's http.server is IPv4-only
const PAGE = ORIGIN + '/investment-map.html';
// The map's own header is checked in the MAP repo (its own server), not in website/Webmap: that copy is
// a submodule checkout and must not be edited by hand - it catches up when the submodule is bumped.
const MAP_ORIGIN = process.env.MAP_ORIGIN || 'http://127.0.0.1:6115';
const MAP_PAGE = MAP_ORIGIN + '/index.html';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? '   ' + detail : ''}`);
  cond ? pass++ : fail++;
};
const USD = /\(\$[\d.]+[Mk]?\)$/;       // '($1.06M)', '($450k)', '($12)'
const COUNT = /\((\d+)\)$/;             // '(36)'

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const csv = fs.readFileSync(path.join(__dirname, '..', 'Webmap', 'data', 'Grantees.combined.csv'), 'utf8');
  let stubbed = 0;
  if (!process.env.NO_STUB) {
    await p.route('**docs.google.com**', r => { stubbed++; return r.fulfill({ status: 200, contentType: 'text/csv', body: csv }); });
  }

  await p.goto(PAGE, { waitUntil: 'load' });
  await p.waitForSelector('#chartSankeyAmount rect', { timeout: 20000 });
  await p.waitForTimeout(600);

  const data = await p.evaluate(() => {
    const readSvg = id => {
      const svg = document.getElementById(id);
      const labels = [...svg.querySelectorAll('g > g > text')].map(t => t.textContent.trim());
      const titles = [...svg.querySelectorAll('g > g > title')].map(t => t.textContent.trim());
      return { nodes: svg.querySelectorAll('g > g > rect').length, labels, titles };
    };
    return { amount: readSvg('chartSankeyAmount'), orgs: readSvg('chartSankey') };
  });

  const totalRow = await p.evaluate(() => {
    const tr = document.querySelector('#sankeyTable tbody tr.total');
    return tr ? [...tr.children].map(td => td.textContent.trim()) : null;
  });

  ok('the sheet was stubbed with the repo csv', !!process.env.NO_STUB || stubbed > 0, process.env.NO_STUB ? 'NO_STUB=1' : stubbed + ' request(s)');
  ok('both flow diagrams draw nodes', data.amount.nodes > 1 && data.orgs.nodes > 1,
     `amount ${data.amount.nodes} nodes, orgs ${data.orgs.nodes} nodes`);
  ok('every node in the amount chart is labelled with a USD value',
     data.amount.labels.length === data.amount.nodes && data.amount.labels.every(t => USD.test(t)),
     data.amount.labels.slice(0, 3).join(' | '));
  ok('every node in the organizations chart is labelled with a count',
     data.orgs.labels.length === data.orgs.nodes && data.orgs.labels.every(t => COUNT.test(t)),
     data.orgs.labels.slice(0, 3).join(' | '));
  ok('every node carries a title tooltip naming its value',
     data.amount.titles.length === data.amount.nodes && data.amount.titles.every(t => /USD \(LoA\+DBG\)$/.test(t))
     && data.orgs.titles.length === data.orgs.nodes && data.orgs.titles.every(t => /organizations$/.test(t)),
     data.amount.titles.slice(0, 2).join(' | '));
  // The picture and the table are built from the same paths, so the root of the amount chart and the
  // table's total must agree - that is what stops a "values look wrong" report from being a silent
  // chart/table drift. The label is lossy by design ($2.29M for 2,288,257), so allow that rounding.
  const rootLabel = (data.amount.labels.find(t => /^FFF Nepal/.test(t)) || '');
  const tableTotal = totalRow ? totalRow[totalRow.length - 2] : null;
  const lblUsd = rootLabel.match(/\(\$([\d.]+)([Mk]?)\)$/);
  const rootUsd = lblUsd ? Math.round(parseFloat(lblUsd[1]) * ({ M: 1e6, k: 1e3, '': 1 }[lblUsd[2]])) : null;
  const tblUsd = tableTotal ? Number(tableTotal.replace(/[$,]/g, '')) : null;
  ok('the amount chart root agrees with the table total (picture == table)',
     rootUsd !== null && tblUsd !== null && Math.abs(rootUsd - tblUsd) / tblUsd < 0.01,
     `root ${rootLabel} vs table ${tableTotal}`);
  // The page is the whole programme (all 68 orgs, no markers), unlike the map's marker-scoped total: say
  // which total is which rather than asserting a number the other page cannot show.
  ok('the page totals the whole programme (all coordinateless orgs included)',
     tblUsd !== null && tblUsd >= 2200000 && tblUsd <= 2400000, `$${tblUsd && tblUsd.toLocaleString('en-US')} (map's national view is marker-only: $1,057,267)`);

  // The label-fitting loop is the non-trivial part: a label wider than the gap to the next column is the
  // overlap bug it exists to prevent, so measure it in the browser rather than trusting the eye.
  const overflow = await p.evaluate(() => {
    const bad = [];
    for (const id of ['chartSankeyAmount', 'chartSankey']) {
      const svg = document.getElementById(id);
      const gs = [...svg.querySelectorAll('g > g')];
      const nodes = gs.map(g => { const r = g.querySelector('rect'), t = g.querySelector('text'); return r && t ? { x0: +r.getAttribute('x'), x1: +r.getAttribute('x') + +r.getAttribute('width'), depth: 0, text: t } : null; }).filter(Boolean);
      const xs = [...new Set(nodes.map(n => Math.round(n.x0)))].sort((a, b) => a - b);
      const w = svg.clientWidth || +svg.getAttribute('width');
      nodes.forEach(n => {
        const i = xs.indexOf(Math.round(n.x0));
        const room = i >= 0 && i < xs.length - 1 ? (xs[i + 1] - n.x1 - 10) : (w - n.x1 - 12);
        const len = n.text.getComputedTextLength();
        if (len > room + 1) bad.push(`${id} "${n.text.textContent.trim()}" ${Math.round(len)}px > ${Math.round(room)}px`);
      });
    }
    return bad;
  });
  ok('no node label overflows into the next column', overflow.length === 0, overflow.slice(0, 3).join(' | '));
  ok('no page errors on the Investment Map page', errs.length === 0, errs.slice(0, 2).join(' | '));
  const siteErrs = errs.length;

  // Second complaint: the Webmap's own header. Its nav must offer the Investment Map link too.
  await p.goto(MAP_PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#siteNav a', { timeout: 20000 });
  const nav = await p.evaluate(() => [...document.querySelectorAll('#siteNav a')].map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim() })));
  const inv = nav.find(a => /investment-map\.html$/.test(a.href));
  ok('the Webmap header nav links to the Investment Map',
     !!inv && /^investment map$/i.test(inv.text), inv ? `${inv.text} -> ${inv.href}` : 'missing: ' + nav.map(a => a.text).join(', '));
  ok('the nav still lists every other page (7 -> 8 items)', nav.length === 8, nav.map(a => a.text).join(' | '));
  // The map served from its OWN repo has no ../css, ../assets (they live in the website repo, one level
  // up in the deployed tree), so those 404s are expected here - anything else is not.
  const mapErrs = errs.slice(siteErrs);
  const tolerated = mapErrs.filter(e => /Failed to load resource|404/.test(e));
  ok('no unexpected errors on the map page beyond the known ../css|../assets 404s',
     mapErrs.length === tolerated.length, `${tolerated.length} tolerated 404(s)` + (mapErrs.length - tolerated.length ? ' | ' + mapErrs.filter(e => !tolerated.includes(e)).slice(0, 2).join(' | ') : ''));

  console.log(`\n${fail ? 'FAILURES: ' + fail : 'all green'}  (${pass} passed)`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
