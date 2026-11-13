// Catalog — data-driven from Webmap/data/Grantees.combined.csv, 26 subcategories, icons per subcategory (reuse Webmap COMMODITY_ICON/COLOR)
(() => {
  const PRIMARY_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_WBjatNB23_S8ilmTMZt7ka3WiDEVxN02zXC-3jRZyxhcKGiOSaYcACNtX3drkactW5QH5E7TALZC/pub?gid=1996981092&single=true&output=csv';
  const FALLBACK_CSV = 'Webmap/data/Grantees.combined.csv';
  const CSV_URL = PRIMARY_CSV;
  const grid = () => document.getElementById('catalogGrid');
  const filterSel = () => document.getElementById('catalogFilter');
  const searchInput = () => document.getElementById('catalogSearch');
  const lead = () => document.getElementById('catalogLead');
  const empty = () => document.getElementById('catalogEmpty');

  // Icons per subcategory — reuse Webmap palette, unified canonicals: Fertiliser (not Biofertilizer), Handicraft (not Handicrafts/Furniture/Wooden)
  // One distinct icon per subcategory (24): no repeats, so badge shape identifies the chain too
  const COMMODITY_ICON = {
    'Non-timber forest products': '🍄', 'Dairy': '🐄', 'Agri products': '🧺', 'Vegetables': '🥦',
    'Fish': '🐟', 'PGS': '📜', 'Sal leaf plates': '🍽️', 'Timber': '🪵', 'Timur': '🍇',
    'Bamboo': '🎋', 'Honey': '🍯', 'Nursery': '🌱', 'Ginger': '🫚', 'Herbal products': '🌿',
    'Turmeric': '🥣', 'Allo': '🧵', 'Amala': '🍏', 'Fertiliser': '🧪', 'Cinnamon': '🍃',
    'Essential Oil': '🧴', 'Handicraft': '🎨', 'Lime': '🍋', 'Silage': '🌾', 'Unclassified': '❓'
  };
  const COMMODITY_COLOR = {
    'Non-timber forest products': '#1abc9c', 'Dairy': '#2980b9', 'Agri products': '#27ae60',
    'Vegetables': '#2ecc71', 'Fish': '#3498db', 'PGS': '#27ae60', 'Sal leaf plates': '#1e8449',
    'Timber': '#6d4c41', 'Timur': '#c0392b', 'Bamboo': '#27ae60', 'Honey': '#f39c12',
    'Nursery': '#16a085', 'Ginger': '#e67e22', 'Herbal products': '#16a085', 'Turmeric': '#f1c40f',
    'Allo': '#8e44ad', 'Amala': '#f1c40f', 'Fertiliser': '#8e44ad', 'Cinnamon': '#16a085',
    'Essential Oil': '#8e44ad', 'Handicraft': '#d35400', 'Lime': '#a3e635', 'Silage': '#f39c12',
    'Unclassified': '#95a5a6'
  };
  // Canonical aliases: treat alternate spellings as same
  const SUB_ALIAS = {
    'biofertilizer': 'Fertiliser', 'bio-fertilizer': 'Fertiliser', 'bio fertiliser': 'Fertiliser',
    'fertiliser': 'Fertiliser', 'fertilizer': 'Fertiliser',
    'handicrafts': 'Handicraft', 'handicraft': 'Handicraft', 'wooden handicraft': 'Handicraft', 'wooden handicrafts': 'Handicraft', 'furniture': 'Handicraft'
  };
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  // Category groups for the catalog grid — kept by hand because the csv's own `main_category`
  // is row-level and disagrees row to row (a chain lands in two categories, 'Other / needs review'
  // swallows 15 of 24, 8 rows are blank), so grouping off it would file one chain under two headings.
  const GROUP_ORDER = ['Forest-based','Agriculture & agroforestry','Livestock & fisheries','Handicraft & fibre','Circular / green enterprises','Unclassified'];
  const SUB_GROUP = {
    'Non-timber forest products':'Forest-based','Timber':'Forest-based','Bamboo':'Forest-based','Sal leaf plates':'Forest-based',
    'Herbal products':'Forest-based','Cinnamon':'Forest-based','Essential Oil':'Forest-based','Honey':'Forest-based',
    'Agri products':'Agriculture & agroforestry','Vegetables':'Agriculture & agroforestry','PGS':'Agriculture & agroforestry',
    'Timur':'Agriculture & agroforestry','Turmeric':'Agriculture & agroforestry','Ginger':'Agriculture & agroforestry',
    'Nursery':'Agriculture & agroforestry','Amala':'Agriculture & agroforestry','Lime':'Agriculture & agroforestry',
    'Dairy':'Livestock & fisheries','Silage':'Livestock & fisheries','Fish':'Livestock & fisheries',
    'Handicraft':'Handicraft & fibre','Allo':'Handicraft & fibre',
    'Fertiliser':'Circular / green enterprises'
  };
  const groupOf = s => SUB_GROUP[s] || 'Unclassified';
  // Heading icon per group; Forest-based reads as a stand of trees
  const GROUP_ICON = {'Forest-based':'🌲🌳','Agriculture & agroforestry':'🌾','Livestock & fisheries':'🐐','Handicraft & fibre':'🧶','Circular / green enterprises':'♻️','Unclassified':'❓'};
  // Forest-based renders as one overlapping stand (flex row, odd/even back/front depth in css):
  // 8 crown silhouettes, sized by grant count via --tree.
  const TREE_GLYPH = {'Non-timber forest products':'🍄','Timber':'🌲','Bamboo':'🎋','Sal leaf plates':'🌴','Herbal products':'🪴','Cinnamon':'🍂','Essential Oil':'🌼','Honey':'🐝'};
  const TREE_CROWN = {'Non-timber forest products':'crown-wide','Timber':'crown-fir','Bamboo':'crown-bamboo','Sal leaf plates':'crown-palm',
                      'Herbal products':'crown-bush','Cinnamon':'crown-broad','Essential Oil':'crown-flower','Honey':'crown-blossom'};
  // one <div class="tree"> per Forest-based chain — canopy (glyph inside) + trunk, sized by grant count.
  const canon = s => {
    if (!s) return 'Unclassified';
    const low=s.trim().toLowerCase();
    return SUB_ALIAS[low] || s;
  };
  const getMeta = s => {
    const c=canon(s);
    const key = c && COMMODITY_ICON[c] ? c : 'Unclassified';
    return { icon: COMMODITY_ICON[key], color: COMMODITY_COLOR[key], label: key };
  };

  function parseCsv(text) {
    const rows=[]; let row=[], cur='', inQ=false;
    for(let i=0;i<text.length;i++){ const c=text[i], n=text[i+1];
      if(c==='"'){ if(inQ&&n==='"'){cur+='"';i++;} else inQ=!inQ; }
      else if(c===','&&!inQ){ row.push(cur); cur=''; }
      else if((c==='\n'||c==='\r')&&!inQ){ if(c==='\r'&&n==='\n') i++; row.push(cur); cur=''; if(row.some(v=>v.trim()!=='')) rows.push(row); row=[]; }
      else cur+=c;
    }
    if(cur!==''||row.length){ row.push(cur); if(row.some(v=>v.trim()!=='')) rows.push(row); }
    return rows;
  }

  function cardFor(p) {
    const meta=getMeta(p.subcategory);
    const card=document.createElement('div');
    card.className='card product-card';
    card.dataset.category=slug(p.subcategory);
    card.dataset.name=(p.name||'').toLowerCase();
    // plain emoji, no colour chip behind it
    card.innerHTML=`<div class="kicker" style="display:flex;align-items:center;gap:8px"><span style="font-size:1.75rem;line-height:1">${meta.icon}</span>${meta.label}</div>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.desc||p.enterprise_commodity||'')}</p>
      <small class="muted">${escapeHtml(p.subcategory)}${p.district? ' · '+escapeHtml(p.district):''}${p.province? ' · '+escapeHtml(p.province):''}</small>
      <small class="muted" style="display:block;margin-top:4px">${p.count>1? p.count+' grants': '1 grant'}${p.org? ' · '+escapeHtml(p.org):''}</small>`;
    // click could link to Webmap filtered view in future
    return card;
  }

  // one <div class="tree"> per Forest-based chain — canopy (glyph inside) + trunk, sized by grant count.
  // Stays a .product-card so the chain filter and search keep working. The grants caption is a button:
  // clicking it opens the tree and fills the shared drawer below the soil with an
  // Organization × Grant title table (one row per grant record).
  const chainBySlug = {};
  function treeFor(p) {
    const t=document.createElement('div');
    t.className='tree product-card';
    t.dataset.category=slug(p.subcategory);
    t.dataset.name=(p.name||'').toLowerCase();
    t.style.setProperty('--tree', Math.min(104, 54 + p.count*5)+'px');   // more grants = bigger crown
    t.innerHTML=`<span class="canopy ${TREE_CROWN[p.subcategory]||'crown-wide'}">${p.subcategory==='Bamboo'
        ? '<i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>'   // CSS bamboo grove, no emoji
        : `<span class="canopy-icon" aria-hidden="true">${TREE_GLYPH[p.subcategory]||'🌳'}</span>`}</span>
      <span class="trunk" aria-hidden="true"></span>
      <span class="tree-name">${escapeHtml(p.subcategory)}</span>
      <button type="button" class="grant-toggle" aria-expanded="false">${p.count>1? p.count+' grants': '1 grant'} ▾</button>`;
    return t;
  }

  // ---------- scene system: group -> scene class + item builder ----------
const SCENE_CLASS = {
  'Forest-based': 'scene-forest',
  'Agriculture & agroforestry': 'scene-farm',
  'Livestock & fisheries': 'scene-pasture',
  'Handicraft & fibre': 'scene-craft',
  'Circular / green enterprises': 'scene-circular',
};
const itemFor = (group, p) =>
  group === 'Forest-based' ? treeFor(p) :
  group === 'Agriculture & agroforestry' ? cropFor(p) :
  group === 'Livestock & fisheries' ? animalFor(p) :
  group === 'Handicraft & fibre' ? craftFor(p) :
  group === 'Circular / green enterprises' ? cycleFor(p) :
  cardFor(p);

// one glyph per grant, so the picture matches the count on the label. A chain with several grants
// cycles species, which reads as a crop row instead of the same stamp repeated.
const CROP_GLYPH = { 'Agri products': ['🌽','🌾'], 'Vegetables': ['🥦','🥕','🍅','🌽','🥬','🧅','🫑','🍆','🥒'],
  'PGS': ['📜'], 'Turmeric': ['🥣'], 'Ginger': ['🫚'], 'Nursery': ['🌱'], 'Lime': ['🍋'] };
// no emoji exists for these two, and the stand-ins (grapes, apple) read as the wrong fruit
const CROP_IMG = { 'Timur': 'assets/img/catalog/timur.webp', 'Amala': 'assets/img/catalog/amala.webp' };
const repeat = (html, n) => html.repeat(Math.max(1, n));
function cropFor(p) {
  const c = document.createElement('div');
  c.className = 'crop product-card';
  c.dataset.category = slug(p.subcategory);
  c.dataset.name = (p.name || '').toLowerCase();
  const list = CROP_GLYPH[p.subcategory] || ['🌱'];
  c.style.setProperty('--crop', Math.min(54, Math.round(340 / Math.max(1, p.count))));
  // turmeric is sold as powder: a drawn heap reads better than any emoji (and stops clashing with ginger)
  const plants = p.subcategory === 'Turmeric'
    ? repeat('<span class="powder" aria-hidden="true"></span>', p.count)
    : CROP_IMG[p.subcategory]
      ? repeat(`<span><img class="crop-img" src="${CROP_IMG[p.subcategory]}" alt="" aria-hidden="true"></span>`, p.count)
      : Array.from({ length: Math.max(1, p.count) }, (_, i) => `<span>${list[i % list.length]}</span>`).join('');
  c.innerHTML = `<div class="crop-plants">${plants}</div>
    <div class="sign"><span class="crop-name">${escapeHtml(p.subcategory)}</span><br>
    <button type="button" class="grant-toggle" aria-expanded="false">${p.count > 1 ? p.count + ' grants' : '1 grant'} ▾</button></div>`;
  return c;
}

// one glyph per grant. Dairy is not one animal: the herds are cattle and buffalo with goats
// alongside, so the chain cycles species instead of stamping the same cow. Fish are the carp
// actually sold in the Terai — rohu, catla (bhakur), mrigal (naini), pangas — as photo cutouts,
// because no emoji reads as a Nepali market fish.
// photos: Wikimedia Commons — Rohu (Labeo rohita) CC BY-SA 4.0 · Catla catla CC BY-SA 4.0 ·
// Cirrhinus cirrhosus CC0 · Pangasius pangasius (India) CC BY-SA 3.0, background removed.
const FISH_IMG = ['fish-rohu', 'fish-catla', 'fish-mrigal', 'fish-pangas']
  .map(n => `assets/img/catalog/${n}.webp`);
const ANIMAL_GLYPH = { 'Dairy': ['🐄', '🐃', '🐐', '🐄', '🐃', '🐐'], 'Silage': ['🌾'] };
function glyphFor(p, i) {
  if (p.subcategory === 'Fish') {
    const src = FISH_IMG[i % FISH_IMG.length];
    return `<img class="fish-img" src="${src}" alt="" decoding="async">`;
  }
  const list = ANIMAL_GLYPH[p.subcategory] || ['🐐'];
  return list[i % list.length];
}
function animalFor(p) {
  const a = document.createElement('div');
  a.className = 'animal product-card';
  a.dataset.category = slug(p.subcategory);
  a.dataset.name = (p.name || '').toLowerCase();
  a.style.setProperty('--size', Math.min(72, Math.round(340 / Math.max(1, p.count))) + 'px');
  const glyphs = Array.from({ length: Math.max(1, p.count) },
    (_, i) => `<span class="animal-emoji" aria-hidden="true">${glyphFor(p, i)}</span>`).join('');
  a.innerHTML = `<span class="animal-emojis">${glyphs}</span>
    <span class="animal-name">${escapeHtml(p.subcategory)}</span>
    <button type="button" class="grant-toggle" aria-expanded="false">${p.count > 1 ? p.count + ' grants' : '1 grant'} ▾</button>`;
  return a;
}

const CRAFT_GLYPH = { 'Allo': '🪢' };   // 🪢 = rope/knot for allo & fibre
// a hand-loadable sal-leaf plate (khali) — no emoji reads as one, and the drawn stand-in looked like a mat
const CRAFT_IMG = { 'Handicraft': 'assets/img/catalog/sal-leaf-plate.webp' };
function craftFor(p) {
  const c = document.createElement('div');
  c.className = 'craft product-card';
  c.dataset.category = slug(p.subcategory);
  c.dataset.name = (p.name || '').toLowerCase();
  c.style.setProperty('--size', Math.min(64, Math.round(300 / Math.max(1, p.count))) + 'px');
  const art = CRAFT_IMG[p.subcategory]
    ? repeat(`<span class="craft-emoji" aria-hidden="true"><img class="craft-img" src="${CRAFT_IMG[p.subcategory]}" alt=""></span>`, p.count)
    : repeat(`<span class="craft-emoji" aria-hidden="true">${CRAFT_GLYPH[p.subcategory] || '🧺'}</span>`, p.count);
  c.innerHTML = `<span class="craft-emojis">${art}</span>
    <span class="craft-name">${escapeHtml(p.subcategory)}</span>
    <button type="button" class="grant-toggle" aria-expanded="false">${p.count > 1 ? p.count + ' grants' : '1 grant'} ▾</button>`;
  return c;
}

function cycleFor(p) {
  const c = document.createElement('div');
  c.className = 'cycle-item product-card';
  c.dataset.category = slug(p.subcategory);
  c.dataset.name = (p.name || '').toLowerCase();
  c.style.setProperty('--size', Math.min(58, Math.round(300 / Math.max(1, p.count))) + 'px');
  c.innerHTML = `<span class="cycle-emojis">${repeat('<span class="cycle-emoji" aria-hidden="true">♻️</span>', p.count)}</span>
    <span class="cycle-name">${escapeHtml(p.subcategory)}</span>
    <button type="button" class="grant-toggle" aria-expanded="false">${p.count > 1 ? p.count + ' grants' : '1 grant'} ▾</button>`;
  return c;
}

  function render(products, subcategories) {
    const g=grid(); if(!g) return;
    g.innerHTML='';
    // one section per category; cards keep the incoming order (grant count desc) inside a section
    let sections=0;
    GROUP_ORDER.forEach(name=>{
  const inGroup=products.filter(p=>groupOf(p.subcategory)===name);
  if(!inGroup.length) return;
  sections++;
  const head=document.createElement('h2');
  head.className='cat-heading';
  head.innerHTML=`<span class="cat-icon" aria-hidden="true">${GROUP_ICON[name]||''}</span><span class="cat-name">${escapeHtml(name)}</span><span class="muted">${inGroup.length} chain${inGroup.length>1?'s':''}</span>`;
  const row=document.createElement('div');
  row.className = 'cat-row scene ' + (SCENE_CLASS[name] || '');
  row.dataset.scene = name;
  inGroup.forEach((p)=>{ chainBySlug[slug(p.subcategory)]=p; row.appendChild(itemFor(name, p)); });
  g.appendChild(head); g.appendChild(row);
  if (SCENE_CLASS[name]) {
    const drawer=document.createElement('div');
    drawer.className='roots-drawer'; drawer.hidden=true; drawer.dataset.scene=name;
    drawer.innerHTML=`<div class="roots-head" aria-live="polite"></div>
      <table class="roots-table"><thead><tr><th scope="col">Organization</th><th scope="col">Grant title</th></tr></thead><tbody></tbody></table>`;
    g.appendChild(drawer);
    if (name === 'Circular / green enterprises') {
      const items = row.querySelectorAll('.cycle-item');
      items.forEach((el, i) => el.style.setProperty('--a', (i * 360 / items.length) + 'deg'));
    }
  }
});
    // update lead
    if(lead()) lead().textContent=`${products.length} chains in ${sections} categories — 68 organizations · 73 grants. Filter by chain or search.`;
    // populate filter options (keep All), grouped the same way as the grid
    const sel=filterSel(); if(sel){
      // preserve All
      const allOpt=sel.querySelector('option[value="all"]');
      sel.innerHTML='';
      sel.appendChild(allOpt||Object.assign(document.createElement('option'),{value:'all',textContent:'All chains'}));
      GROUP_ORDER.forEach(name=>{
        const subs=subcategories.slice().sort().filter(s=>groupOf(s)===name);
        if(!subs.length) return;
        const og=document.createElement('optgroup'); og.label=name;
        subs.forEach(s=>{
          const o=document.createElement('option');
          o.value=slug(s); o.textContent=s;
          og.appendChild(o);
        });
        sel.appendChild(og);
      });
    }
    applyFilter();
  }

  function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }

  // forest trees open/close — delegated (render() rebuilds the rows, the grid itself persists).
  // One open tree at a time (accordion): opening a tree closes the others. Nothing inside a tree
  // changes layout on open (no branches/strand elements in flow) — tree positions never change.
  const gridEl = document.getElementById('catalogGrid');
  const rootsDrawer = () => gridEl.querySelector('.roots-drawer');
  const drawerFor = el => { const s = el.closest('.scene');
    return s ? gridEl.querySelector(`.roots-drawer[data-scene="${s.dataset.scene}"]`) : null; };
function closeTrees(){
  gridEl.querySelectorAll('.product-card.open').forEach(o => {
    o.classList.remove('open');
    const b = o.querySelector('.grant-toggle');
    if(b){ b.setAttribute('aria-expanded','false'); b.textContent = b.textContent.replace('▴','▾'); }
  });
  gridEl.querySelectorAll('.roots-drawer').forEach(d => d.hidden = true);
}
function openTree(item){
  const p = chainBySlug[item.dataset.category];
  closeTrees();
  item.classList.add('open');
  const btn = item.querySelector('.grant-toggle');
  btn.setAttribute('aria-expanded','true');
  btn.textContent = btn.textContent.replace('▾','▴');
  const d = drawerFor(item);
  if(d && p){
    d.querySelector('.roots-head').textContent = `${p.subcategory} — ${p.count>1? p.count+' grants': '1 grant'}`;
    d.querySelector('.roots-table tbody').innerHTML = (p.rows||[]).map(r=>`<tr><td>${escapeHtml(r.org||'—')}</td><td>${escapeHtml(r.title||'—')}</td></tr>`).join('');
    // the table belongs under the plot that was clicked, not at the end of the section.
    // farm stacks its crops in a column, so the drawer drops in right after that crop row;
    // row scenes (pasture/craft/circular) keep it after the row but slide it under the plot.
    const row = item.closest('.scene');
    if (getComputedStyle(row).flexDirection === 'column') {
      d.style.marginLeft = ''; d.style.maxWidth = ''; d.style.marginTop = '0';
      row.insertBefore(d, item.nextElementSibling);
    } else if (!row.classList.contains('scene-forest')) {   // forest keeps the wide centred table
      if (d.parentElement !== row.parentElement) row.parentElement.insertBefore(d, row.nextElementSibling);
      const rr = row.getBoundingClientRect(), ir = item.getBoundingClientRect();
      const w = Math.min(420, rr.width);
      d.style.maxWidth = w + 'px';
      d.style.marginLeft = Math.max(0, Math.min(rr.width - w, ir.left - rr.left + ir.width/2 - w/2)) + 'px';
    }
    d.hidden = false;
  }
}
  if(gridEl && !gridEl.dataset.treeToggle){
    gridEl.dataset.treeToggle = '1';
    gridEl.addEventListener('click', ev => {
      const btn = ev.target.closest('.grant-toggle');
      if(!btn) return;
      const item = btn.closest('.product-card');
if(item.classList.contains('open')) closeTrees();
else openTree(item);
    });
  }

  function applyFilter(){
    const v=(filterSel()?.value||'all');
    const q=(searchInput()?.value||'').toLowerCase().trim();
    const cards=[...document.querySelectorAll('.product-card')];
    let visible=0;
    cards.forEach(c=>{
      const cat=c.dataset.category||'';
      const text=c.textContent.toLowerCase();
      const catOk=v==='all'||cat===v;
      const qOk=!q||text.includes(q);
      const show=catOk&&qOk;
      c.classList.toggle('hidden',!show);
      if(show) visible++;
    });
    if(empty()) empty().classList.toggle('hidden', visible!==0);
    // a section whose chains are all filtered out hides with them (heading included)
    document.querySelectorAll('#catalogGrid .cat-row').forEach(row=>{
      const any=[...row.querySelectorAll('.product-card')].some(c=>!c.classList.contains('hidden'));
      row.classList.toggle('hidden',!any);
      const head=row.previousElementSibling;
      if(head&&head.classList.contains('cat-heading')) head.classList.toggle('hidden',!any);
    });
    // an open plot that just got filtered out takes its drawer with it
    if(gridEl.querySelector('.product-card.open.hidden')) closeTrees();
  }

  async function fetchCsvWithFallback(){
    try{
      const r=await fetch(PRIMARY_CSV,{cache:'no-cache'});
      if(!r.ok) throw new Error('primary '+r.status);
      return await r.text();
    }catch(e){
      console.warn('primary Grantees CSV failed, falling back to local', e);
      const r2=await fetch(FALLBACK_CSV,{cache:'no-cache'});
      if(!r2.ok) throw new Error(`CSV fetch ${r2.status} ${FALLBACK_CSV}`);
      return await r2.text();
    }
  }
  async function load(){
    try{
      const text=await fetchCsvWithFallback();
      const rows=parseCsv(text.replace(/^\uFEFF/,''));
      if(!rows.length) throw new Error('Empty CSV');
      const headers=rows[0].map(h=>h.trim());
      const idx=k=>headers.indexOf(k);
      // dedupe by subcategory -> show one card per subcategory (26) with count & example; alternatively by enterprise_commodity distinct (58)
      // Requirement: show all products (26 subcategory) — icons per subcategory
      const bySub=new Map();
      for(let r=1;r<rows.length;r++){
        const row=rows[r];
        if(!row||row.every(v=>(v||'').trim()==='')) continue;
        const get=k=>{ const i=idx(k); return i>=0&&i<row.length?row[i]:''; };
        const rawSub=(get('subcategory')||'Unclassified').trim() || 'Unclassified';
        const sub=canon(rawSub);
        const ent=(get('enterprise_commodity')||'').trim();
        const grant=(get('grant_title')||'').trim();
        const org=(get('org_name_geojson')||'').trim();
        const dist=(get('district')||'').trim();
        const prov=(get('province')||'').trim();
        const key=sub;
        // one table row per grant record (org + grant_title); titles are unique per chain
        const gt=(grant || ent).trim();
        const rec={ org, title: gt || '—' };
        if(!bySub.has(key)){
          bySub.set(key,{ subcategory:sub, name: ent || grant || sub, desc: grant || ent, enterprise_commodity: ent, org, district: dist, province: prov, count:1, rows: (org||gt)?[rec]:[] });
        } else {
          bySub.get(key).count++;
          if(org||gt) bySub.get(key).rows.push(rec);
        }
      }
      const products=[...bySub.values()].sort((a,b)=> b.count - a.count || a.subcategory.localeCompare(b.subcategory));
      const subcategories=[...bySub.keys()];
      render(products, subcategories);
      // wire filter/search after render
      filterSel()?.addEventListener('change', applyFilter);
      searchInput()?.addEventListener('input', applyFilter);
    }catch(err){
      if(grid()) grid().innerHTML=`<div class="card" style="grid-column:1/-1;color:#7a2b2b">Failed to load <code>${CSV_URL}</code>: ${escapeHtml(err.message)}<br><small>Run via HTTP (python3 -m http.server) — fetch fails on file://. Also check Webmap submodule at <code>Webmap/data/Grantees.combined.csv</code>.</small></div>`;
      console.error(err);
      if(lead()) lead().textContent=`Failed to load products — see console.`;
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();
