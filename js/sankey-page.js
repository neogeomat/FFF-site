// Sankey page — 6 selects for main category like Webmap + multi-select values below each select (Select2), OR across columns, empty = All, only values available in records
(() => {
  const CSV_URL = 'Webmap/data/Grantees.combined.csv';
  const OPTIONS = ['', 'Grant type','Commodity','Restoration area','Women-led','Year','Province','District','Palika','Organization'];
  const DEFAULT_COLS = ['Grant type','Year','Commodity','Restoration area','Women-led','Province'];
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

  let orgList = [];

  function parseCsv(text){
    const rows=[]; let row=[], cur='', inQ=false;
    for(let i=0;i<text.length;i++){ const c=text[i], n=text[i+1];
      if(c==='"'){ if(inQ&&n==='"'){cur+='"'; i++;} else inQ=!inQ; }
      else if(c===','&&!inQ){ row.push(cur); cur=''; }
      else if((c==='\n'||c==='\r')&&!inQ){ if(c==='\r'&&n==='\n') i++; row.push(cur); cur=''; if(row.some(v=>v.trim()!=='')) rows.push(row); row=[]; }
      else cur+=c;
    }
    if(cur!==''||row.length){ row.push(cur); if(row.some(v=>v.trim()!=='')) rows.push(row); }
    return rows;
  }
  function jsonList(txt){ if(!txt) return []; try{ return JSON.parse(txt)||[];}catch{ return []; } }
  function parseFiscalYear(s){
    if(!s) return 'Undated';
    const iso=s.match(/^(\d{4})-(\d{2})-\d{2}/);
    if(iso){ const y=parseInt(iso[1],10), mo=parseInt(iso[2],10); const fy= mo>=7? y : y-1; return fy+'-'+String(fy+1).slice(-2); }
    const m=s.match(/(\d{4})/); return m? m[1]:'Undated';
  }

  async function load(){
    const res=await fetch(CSV_URL,{cache:'no-cache'});
    if(!res.ok) throw new Error('CSV '+res.status);
    const text=await res.text();
    const rows=parseCsv(text.replace(/^\uFEFF/,''));
    const head=rows.shift().map(h=>h.trim());
    const ix={}; head.forEach((h,i)=> ix[h.trim()]=i);
    const cell=(r,c)=>{ const i=ix[c]; return i===undefined||!r[i]? '' : r[i].trim(); };
    const byOrg={};
    rows.forEach(r=>{
      const sn=cell(r,'S_N'); if(!sn) return;
      let o=byOrg[sn];
      if(!o){
        o=byOrg[sn]={ props:{ S_N: sn, Type_of_Grant: cell(r,'Type_of_Grant_geojson'), province: cell(r,'province'), district: cell(r,'district'), municipality: cell(r,'municipality'), subcats:{}, money:{loa: parseFloat(cell(r,'loa_total_USD_org'))||0, dbg: parseFloat(cell(r,'dbg_total_USD_org'))||0 } }, grants:[], subcats:{}, women:[], restoration:[] };
        o.props.Name_of_Organization=cell(r,'org_name_geojson');
      }
      if(cell(r,'grant_sn')){
        const sub=cell(r,'subcategory')||'Unclassified';
        o.subcats[sub]=true;
        o.grants.push({ subcategory:sub, implementation_period:cell(r,'implementation_period') });
      }
      if(cell(r,'women_json')) o.women=jsonList(cell(r,'women_json'));
      if(cell(r,'restoration_json')) o.restoration=jsonList(cell(r,'restoration_json'));
    });
    orgList=Object.keys(byOrg).map(sn=>{
      const o=byOrg[sn]; const p=o.props;
      const firstFiscal = (()=>{ const ys=o.grants.map(g=> parseFiscalYear(g.implementation_period)).filter(y=>y!=='Undated'); return ys.sort()[0]||'Undated'; })();
      const totRest=(o.restoration.reduce((a,r)=>a+(r.area_direct_ha||0)+(r.area_contributed_ha||0),0));
      let restBucket='No restoration'; if(totRest>0 && totRest<10) restBucket='<10 ha'; else if(totRest<100) restBucket='10–100 ha'; else if(totRest<500) restBucket='100–500 ha'; else if(totRest>=500) restBucket='500+ ha';
      return {
        S_N: sn, props:p, subcat: Object.keys(o.subcats)[0]||'Unclassified',
        province: p.province||'Unassigned', district: p.district||'Unassigned',
        grantType: p.Type_of_Grant||'Unassigned', year: firstFiscal, restoration: restBucket,
        womenLed: (o.women&&o.women.length)? 'Women-led':'Other', orgName: p.Name_of_Organization||'Unnamed',
        money: (o.props.money.loa||0)+(o.props.money.dbg||0)
      };
    });
    buildCols();
    render();
  }

  function dimsForKey(key){
    switch(key){
      case 'Grant type': return [...new Set(orgList.map(o=>o.grantType))].sort();
      case 'Year': return [...new Set(orgList.map(o=>o.year))].sort();
      case 'Commodity': return [...new Set(orgList.map(o=>o.subcat))].sort();
      case 'Restoration area': return [...new Set(orgList.map(o=>o.restoration))].sort();
      case 'Women-led': return [...new Set(orgList.map(o=>o.womenLed))].sort();
      case 'Province': return [...new Set(orgList.map(o=>o.province))].sort();
      case 'District': return [...new Set(orgList.map(o=>o.district))].sort();
      case 'Palika': return [...new Set(orgList.map(o=>o.props.municipality||'Unassigned'))].sort();
      case 'Organization': return [...new Set(orgList.map(o=>o.orgName))].sort();
      default: return [];
    }
  }

  function buildCols(){
    const wrap=document.getElementById('sankeyCols');
    if(!wrap) return;
    wrap.innerHTML='';
    for(let i=0;i<6;i++){
      const colWrap=document.createElement('div');
      colWrap.className='sankey-col-wrap';
      colWrap.dataset.col=i;
      const sel=document.createElement('select');
      sel.className='sankey-col';
      sel.dataset.col=i;
      sel.setAttribute('aria-label', `Sankey column ${i+1} main category`);
      sel.setAttribute('aria-describedby', 'sankeyColumnHelp');
      OPTIONS.forEach(opt=>{
        const o=document.createElement('option');
        o.value=opt; o.textContent=opt||'—';
        if(opt=== (DEFAULT_COLS[i]||'')) o.selected=true;
        sel.appendChild(o);
      });
      const valSelect=document.createElement('select');
      valSelect.className='sankey-values';
      valSelect.dataset.col=i;
      valSelect.multiple=true;
      valSelect.setAttribute('aria-label', `Filter values for column ${i+1}`);
      valSelect.setAttribute('aria-multiselectable', 'true');
      valSelect.style.cssText='width:100%; display:none; margin-top:6px;';
      colWrap.appendChild(sel);
      colWrap.appendChild(valSelect);
      wrap.appendChild(colWrap);

      // jQuery Select2 init if available, otherwise native
      const populateValues=()=>{
        const key=sel.value;
        valSelect.innerHTML='';
        if(!key){
          valSelect.style.display='none';
          if(window.jQuery && $(valSelect).hasClass('select2-hidden-accessible')) $(valSelect).select2('destroy');
          return;
        }
        const values=dimsForKey(key).filter(v=> !['Undated','Unassigned','Unclassified','Other'].includes(v));
        // Only values available in records (already filtered, but ensure no empty)
        values.forEach(v=>{
          const o=document.createElement('option');
          o.value=v; o.textContent=v;
          valSelect.appendChild(o);
        });
        valSelect.style.display='block';
        // Init Select2 if jQuery available
        if(window.jQuery && window.jQuery.fn.select2){
          $(valSelect).select2({ placeholder: key, width:'100%', closeOnSelect:false, dropdownAutoWidth:true });
          $(valSelect).on('change', render);
        } else {
          valSelect.addEventListener('change', render);
        }
      };
      sel.addEventListener('change',()=>{
        populateValues();
        render();
      });
      populateValues();
    }
    // Wire clear
    document.getElementById('sankeyClearFilters')?.addEventListener('click',()=>{
      document.querySelectorAll('#sankeyCols .sankey-col').forEach((sel,idx)=>{
        sel.value=DEFAULT_COLS[idx]||'';
        const vs=document.querySelector(`.sankey-col-wrap[data-col="${idx}"] .sankey-values`);
        if(vs){
          if(window.jQuery && $(vs).hasClass('select2-hidden-accessible')) $(vs).select2('destroy');
          vs.innerHTML=''; vs.style.display='none';
          // repopulate
          const key=sel.value;
          if(key){
            const values=dimsForKey(key).filter(v=> !['Undated','Unassigned','Unclassified','Other'].includes(v));
            values.forEach(v=>{
              const o=document.createElement('option');
              o.value=v; o.textContent=v;
              vs.appendChild(o);
            });
            vs.style.display='block';
            if(window.jQuery && window.jQuery.fn.select2) $(vs).select2({ placeholder: key, width:'100%', closeOnSelect:false, dropdownAutoWidth:true });
          }
        }
      });
      render();
    });
  }

  function getFilters(){
    const filters={};
    document.querySelectorAll('#sankeyCols .sankey-col-wrap').forEach(wrap=>{
      const idx=wrap.dataset.col;
      const sel=wrap.querySelector('.sankey-col');
      const key=sel.value;
      if(!key) return;
      const vs=wrap.querySelector('.sankey-values');
      let vals=[];
      if(window.jQuery && $(vs).hasClass('select2-hidden-accessible')){
        vals=$(vs).val()||[];
      } else {
        vals=[...vs.selectedOptions].map(o=>o.value);
      }
      if(vals.length) filters[key]=new Set(vals);
    });
    return filters;
  }

  function isVisible(org, filters){
    const keys=Object.keys(filters);
    if(!keys.length) return true;
    for(const k of keys){
      const set=filters[k];
      if(!set || !set.size) continue;
      let val;
      if(k==='Grant type') val=org.grantType;
      else if(k==='Year') val=org.year;
      else if(k==='Commodity') val=org.subcat;
      else if(k==='Restoration area') val=org.restoration;
      else if(k==='Women-led') val=org.womenLed;
      else if(k==='Province') val=org.province;
      else if(k==='District') val=org.district;
      else if(k==='Palika') val=org.props.municipality||'Unassigned';
      else if(k==='Organization') val=org.orgName;
      else val=null;
      if(set.has(val)) return true; // OR
    }
    return false;
  }

  function sankeyCols(){
    return [...document.querySelectorAll('#sankeyCols select.sankey-col')].map(s=>s.value).filter(v=>v);
  }

  function render(){
    const filters=getFilters();
    const visible=orgList.filter(o=> isVisible(o,filters));
    const scopeLabel=Object.keys(filters).length? Object.entries(filters).map(([k,v])=> `${k}: ${[...v].join('+')}`).join(' · ') : 'All Nepal';
    document.getElementById('sankeyScopeLabel').textContent=scopeLabel;
    document.getElementById('sankeyCountLabel').textContent=`${visible.length} orgs / ${orgList.length}`;
    renderSankey(visible);
  }

  function renderSankey(visible){
    const cols=sankeyCols();
    const dims={
      'Grant type': o=> o.grantType,
      'Year': o=> o.year,
      'Commodity': o=> o.subcat,
      'Restoration area': o=> o.restoration,
      'Women-led': o=> o.womenLed,
      'Province': o=> o.province,
      'District': o=> o.district,
      'Palika': o=> o.props.municipality||'Unassigned',
      'Organization': o=> o.orgName
    };
    const byAmount=renderSankeyInto('chartSankeyAmount','amount', visible, cols, dims);
    const byOrgs=renderSankeyInto('chartSankey','orgs', visible, cols, dims);
    renderSankeyTable(byAmount, byOrgs, cols);
  }

  function renderSankeyInto(svgId, metric, visible, cols, dims){
    const svgEl=document.getElementById(svgId);
    if(!svgEl || typeof d3==='undefined' || typeof d3.sankey!=='function') return [];
    const w=Math.max(420, Math.round(((svgEl.parentElement||{}).clientWidth||700)-2));
    const h=520;
    const svg=d3.select(svgEl).attr('width',w).attr('height',h).attr('role','img').attr('aria-label', svgId==='chartSankeyAmount' ? 'Sankey diagram by amount (USD)' : 'Sankey diagram by organizations');
    svg.selectAll('*').remove();
    // Add accessible title/desc for screen readers
    const titleText = metric==='amount' ? `Sankey flow by amount — ${visible.length} orgs` : `Sankey flow by organizations — ${visible.length} orgs`;
    svg.append('title').text(titleText);
    svg.append('desc').text(`Flow from FFF Nepal Nepal through ${cols.join(' → ')}. Use table below for tabular alternative.`);
    // Ensure SVG is focusable for keyboard users
    svgEl.setAttribute('tabindex','0');
    svgEl.setAttribute('focusable','true');
    if(!visible.length || !cols.length){
      svg.append('text').attr('x',w/2).attr('y',h/2).attr('text-anchor','middle').attr('fill','#999').style('font','13px Arial').text(!visible.length?'Nothing matches':'Pick a column');
      return [];
    }
    const SEP='\u0000';
    const paths=visible.map(o=>{
      const cells=['FFF Nepal'].concat(cols.map(c=> String(dims[c](o)||'Unassigned')));
      const wgt = metric==='amount'? (o.money||0) : 1;
      return {cells, w: wgt};
    });
    const order=[['FFF Nepal']];
    for(let lvl=1; lvl<=cols.length; lvl++){
      const kids={};
      paths.forEach(p=>{ const par=p.cells[lvl-1], ch=p.cells[lvl]; (kids[par]=kids[par]||{})[ch]=(kids[par][ch]||0)+p.w; });
      const seen={}; const list=[];
      order[lvl-1].forEach(par=>{ Object.keys(kids[par]||{}).sort((a,b)=>kids[par][b]-kids[par][a]).forEach(c=>{ if(!seen[c]){ seen[c]=1; list.push(c);}});});
      Object.keys(kids).forEach(par=> Object.keys(kids[par]).forEach(c=>{ if(!seen[c]){ seen[c]=1; list.push(c);}}));
      order.push(list);
    }
    const names=[], index={};
    function nodeOf(lvl,name){ const k=lvl+SEP+name; if(index[k]===undefined){ index[k]=names.length; names.push({name});} return index[k];}
    order.forEach((list,lvl)=> list.forEach(n=> nodeOf(lvl,n)));
    const counts={};
    paths.forEach(p=>{ for(let i=0;i<p.cells.length-1;i++){ const a=nodeOf(i,p.cells[i]), b=nodeOf(i+1,p.cells[i+1]); const k=a+SEP+b; counts[k]=(counts[k]||0)+p.w; }});
    const nodes=names.map(n=>({name:n.name}));
    const links=Object.keys(counts).map(k=>{ const p=k.split(SEP); return {source:parseInt(p[0],10), target:parseInt(p[1],10), value:counts[k]};});
    const color=d3.scaleOrdinal(d3.schemeTableau10);
    const sankey=d3.sankey().nodeWidth(12).nodePadding(8).extent([[28,10],[w-110,h-10]]);
    const graph=sankey({nodes:nodes.map(d=>({name:d.name})), links:links.map(d=>({source:d.source,target:d.target,value:d.value}))});
    svg.append('g').selectAll('path').data(graph.links).join('path').attr('d',d3.sankeyLinkHorizontal()).attr('stroke',d=>color(d.source.name)).attr('stroke-width',d=>Math.max(1,d.width)).attr('fill','none').attr('opacity',0.55);
    const g=svg.append('g').selectAll('g').data(graph.nodes).join('g');
    g.append('rect').attr('x',d=>d.x0).attr('y',d=>d.y0).attr('width',d=>d.x1-d.x0).attr('height',d=>Math.max(1,d.y1-d.y0)).attr('fill',d=> d.name==='FFF Nepal'?'#0070b6':color(d.name));
    g.append('text').attr('x',d=>d.x1+6).attr('y',d=>(d.y0+d.y1)/2).attr('dy','0.35em').attr('text-anchor','start').style('font','11px Arial').text(d=>d.name).attr('fill','#1a3c5e');
    return paths;
  }

  function renderSankeyTable(byAmount, byOrgs, cols){
    const tbl=document.getElementById('sankeyTable');
    if(!tbl) return;
    const head=tbl.querySelector('thead'), body=tbl.querySelector('tbody');
    if(!byAmount.length && !byOrgs.length){ head.innerHTML='<tr><th scope="col">Flow data</th></tr>'; body.innerHTML='<tr class="empty"><td>Nothing matches</td></tr>'; return; }
    const rows={}; const order=[];
    function add(paths,key){ (paths||[]).forEach(p=>{ const k=p.cells.join('\u0000'); if(!rows[k]){ rows[k]={cells:p.cells, orgs:0, usd:0}; order.push(k);} rows[k][key]+=p.w; }); }
    add(byOrgs,'orgs'); add(byAmount,'usd');
    const list=order.map(k=>rows[k]).sort((a,b)=> b.usd - a.usd || b.orgs - a.orgs);
    let totOrgs=0, totUsd=0, exact=0; list.forEach(r=>{ totOrgs+=r.orgs; totUsd+=Math.round(r.usd); exact+=r.usd; });
    head.innerHTML='<tr>'+ cols.map(c=>`<th scope="col">${c}</th>`).join('') + '<th scope="col" class="num">Organizations</th><th scope="col" class="num">Amount (USD)</th><th scope="col" class="num">Share</th></tr>';
    body.innerHTML=list.map(r=>{
      const tds=r.cells.slice(1).map(c=> `<td>${c}</td>`).join('');
      const share=exact? (r.usd/exact*100).toFixed(1)+'%':'—';
      return `<tr>${tds}<td class="num">${r.orgs}</td><td class="num">${r.usd? '$'+Math.round(r.usd).toLocaleString(): '—'}</td><td class="num">${share}</td></tr>`;
    }).join('') + `<tr class="total"><td colspan="${cols.length}">Total</td><td class="num">${totOrgs}</td><td class="num">$${Math.round(totUsd).toLocaleString()}</td><td class="num">100.0%</td></tr>`;
    // Ensure table is keyboard navigable and has proper caption (already in HTML)
    tbl.setAttribute('tabindex','0');
    tbl.setAttribute('aria-label','Sankey flow data — tabular alternative to diagrams');
  }

  document.addEventListener('DOMContentLoaded', load);
  // expose for Webmap shared refresh
  window._sankeyRender = render;
})();
