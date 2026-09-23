// Catalog — data-driven from Webmap/data/Grantees.combined.csv, 26 subcategories, icons per subcategory (reuse Webmap COMMODITY_ICON/COLOR)
(() => {
  const CSV_URL = 'Webmap/data/Grantees.combined.csv';
  const grid = () => document.getElementById('catalogGrid');
  const filterSel = () => document.getElementById('catalogFilter');
  const searchInput = () => document.getElementById('catalogSearch');
  const lead = () => document.getElementById('catalogLead');
  const empty = () => document.getElementById('catalogEmpty');

  // Icons per subcategory — reuse Webmap palette, unified canonicals: Fertiliser (not Biofertilizer), Handicraft (not Handicrafts/Furniture/Wooden)
  const COMMODITY_ICON = {
    'Non-timber forest products': '🍄', 'Dairy': '🥛', 'Agri products': '🥬', 'Vegetables': '🥬',
    'Fish': '🐟', 'PGS': '🌱', 'Sal leaf plates': '🍃', 'Timber': '🪵', 'Timur': '🌶️',
    'Bamboo': '🎋', 'Honey': '🍯', 'Nursery': '🌱', 'Ginger': '🫚', 'Herbal products': '🌿',
    'Turmeric': '🟡', 'Allo': '🧵', 'Amala': '🍋', 'Fertiliser': '🧪', 'Cinnamon': '🌿',
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

  function render(products, subcategories) {
    const g=grid(); if(!g) return;
    g.innerHTML='';
    const frag=document.createDocumentFragment();
    products.forEach(p=>{
      const meta=getMeta(p.subcategory);
      const card=document.createElement('div');
      card.className='card product-card';
      card.dataset.category=slug(p.subcategory);
      card.dataset.name=(p.name||'').toLowerCase();
      const iconBadge=`<span class="pin" style="display:inline-grid;place-items:center;width:28px;height:28px;border-radius:999px;background:${meta.color};color:#fff;font-size:1rem">${meta.icon}</span>`;
      card.innerHTML=`<div class="kicker" style="display:flex;align-items:center;gap:8px">${iconBadge}${meta.label}</div>
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.desc||p.enterprise_commodity||'')}</p>
        <small class="muted">${escapeHtml(p.subcategory)}${p.district? ' · '+escapeHtml(p.district):''}${p.province? ' · '+escapeHtml(p.province):''}</small>
        <small class="muted" style="display:block;margin-top:4px">${p.count>1? p.count+' grants': '1 grant'}${p.org? ' · '+escapeHtml(p.org):''}</small>`;
      // click could link to Webmap filtered view in future
      frag.appendChild(card);
    });
    g.appendChild(frag);
    // update lead
    if(lead()) lead().textContent=`${products.length} products — 68 organizations · 73 grants. Filter by chain or search.`;
    // populate filter options (keep All)
    const sel=filterSel(); if(sel){
      // preserve All
      const allOpt=sel.querySelector('option[value="all"]');
      sel.innerHTML='';
      sel.appendChild(allOpt||Object.assign(document.createElement('option'),{value:'all',textContent:'All chains'}));
      subcategories.slice().sort().forEach(s=>{
        const o=document.createElement('option');
        o.value=slug(s); o.textContent=s;
        sel.appendChild(o);
      });
    }
    applyFilter();
  }

  function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }

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
  }

  async function load(){
    try{
      const res=await fetch(CSV_URL,{cache:'no-cache'});
      if(!res.ok) throw new Error(`CSV fetch ${res.status} ${CSV_URL}`);
      const text=await res.text();
      const rows=parseCsv(text);
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
        if(!bySub.has(key)){
          bySub.set(key,{ subcategory:sub, name: ent || grant || sub, desc: grant || ent, enterprise_commodity: ent, org, district: dist, province: prov, count:1 });
        } else {
          bySub.get(key).count++;
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
