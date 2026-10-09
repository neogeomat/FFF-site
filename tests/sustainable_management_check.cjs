// sustainable-management.html: the Madhesh profile cards (five organizations, members/ha/cluster/focus).
// Run manually: node tests/sustainable_management_check.cjs      (needs a server on :8123)
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const EXPECT = [
  ['1', 'Piple Pokhara Community Forest Users Group', '8,430 members', '210 hectares'],
  ['2', 'Our Rajakot Multipurpose Cooperative', '106 members', '100 hectares'],
  ['3', 'Binai Community Forest Users Group', '11,065 members', '3,000 hectares'],
  ['4', 'Korak Cooperative', '140 members', '200 hectares'],
  ['5', 'Gobardiha Kastha Tatha Furniture Udhyog', '7,000 members', '4,000 hectares'],
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('requestfailed', r => errs.push('REQFAIL ' + r.url()));
  await p.goto(`${BASE}/sustainable-management.html`, { waitUntil: 'load' });
  await p.waitForTimeout(300);

  const cards = await p.evaluate(() => [...document.querySelectorAll('.card')]
    .filter(c => c.querySelector('.kicker'))
    .map(c => ({ kicker: c.querySelector('.kicker').textContent.trim(), text: c.textContent.replace(/\s+/g, ' '), tab: (c.querySelector('.tab') || {}).textContent })));

  const profile = cards.filter(c => /^[1-5]$/.test(c.kicker));
  let pass = 0, fail = 0;
  const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${d ? '   ' + d : ''}`); };
  ok('the page shows exactly the five Madhesh profile cards', profile.length === 5, profile.map(c => c.kicker).join(','));
  for (const [n, name, members, ha] of EXPECT) {
    const c = profile.find(x => x.kicker === n);
    ok(`card ${n} — ${name}`, !!c && c.text.includes(name) && c.text.includes(members) && c.text.includes(ha));
  }
  ok('clusters are named for cards 3 and 5',
     profile.filter(c => /Cluster of \d+ Community Forest User Groups/.test(c.text)).length === 2);
  ok('cards 1–4 carry a focus tag, card 5 has none',
     profile.slice(0, 4).every(c => (c.tab || '').trim().length > 2) && !profile.find(c => c.kicker === '5').tab);
  ok('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(`\n${fail ? 'FAILURES: ' + fail : 'all green'}  (${pass} passed)`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
