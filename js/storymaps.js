// Bare Leaflet + horizontal strip — CSV backed, autoplay L→R
// CSV: data/stories.csv with headers slide_order,type,lat,lon,zoom,headline,text,media_url,media_caption,media_credit
(() => {
  const CSV_URL = 'data/stories.csv';
  const AUTOPLAY_MS = 5200;
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  // Whole-text CSV parser (handles quoted newlines/commas) — same robustness as Webmap/js/map.js
  function parseCsv(text) {
    const rows = [];
    let row = [], cur = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i+1];
      if (c === '"') {
        if (inQuotes && n === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) { row.push(cur); cur = ''; }
      else if ((c === '\n' || c === '\r') && !inQuotes) {
        if (c === '\r' && n === '\n') i++;
        row.push(cur); cur = '';
        if (row.some(v=>v.trim()!=='')) rows.push(row);
        row = [];
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); if (row.some(v=>v.trim()!=='')) rows.push(row); }
    return rows;
  }

  function csvToSlides(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map(h=>h.trim());
    const idx = k => headers.indexOf(k);
    const out = [];
    for (let r=1; r<rows.length; r++) {
      const row = rows[r];
      if (!row || row.every(v=> (v||'').trim()==='')) continue;
      const get = k => {
        const i = idx(k);
        return i>=0 && i<row.length ? row[i] : '';
      };
      const type = (get('type')||'').trim();
      const lat = parseFloat(get('lat'));
      const lon = parseFloat(get('lon'));
      const zoom = parseInt(get('zoom'),10);
      out.push({
        slide_order: parseInt(get('slide_order'),10) || out.length+1,
        type,
        lat: isNaN(lat)? null : lat,
        lon: isNaN(lon)? null : lon,
        zoom: isNaN(zoom)? null : zoom,
        headline: get('headline')||'',
        text: get('text')||'',
        media_url: (get('media_url')||'').trim(),
        media_caption: get('media_caption')||'',
        media_credit: get('media_credit')||'',
      });
    }
    return out;
  }

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html!=null) n.innerHTML = html;
    return n;
  }

  let map, markers = [], slidesData = [], activeIdx = 0, timer = null, userPaused = false;
  // autoplay default on; respects prefers-reduced-motion in startAutoplay()

  function initMap() {
    map = L.map('storyMap', { zoomControl: true, scrollWheelZoom: false }).setView([27.7,84.3], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    // overview bounds fallback
    setTimeout(()=> map.invalidateSize(), 200);
  }

  function clearMarkers() {
    markers.forEach(m=> map.removeLayer(m));
    markers = [];
  }

  function showSlide(i, opts={}) {
    const n = slidesData.length;
    if (!n) return;
    activeIdx = (i + n) % n;
    const s = slidesData[activeIdx];
    // Map fly
    if (s.type !== 'overview' && s.lat!=null && s.lon!=null) {
      const z = s.zoom || 12;
      if (opts.animate === false) map.setView([s.lat, s.lon], z);
      else map.flyTo([s.lat, s.lon], z, { duration: 1.2 });
      clearMarkers();
      const m = L.marker([s.lat, s.lon]).addTo(map).bindPopup(`<strong>${escapeHtml(s.headline)}</strong>`);
      markers.push(m);
      // subtle auto-open on desktop
      if (window.innerWidth > 900) m.openPopup();
    } else {
      // overview: fit all points
      const pts = slidesData.filter(x=> x.lat!=null && x.lon!=null).map(x=>[x.lat,x.lon]);
      if (pts.length) map.fitBounds(pts, { padding: [40,40] });
    }
    // Strip active
    $$('.story-card').forEach((card, k)=>{
      card.classList.toggle('active', k===activeIdx);
      if (k===activeIdx && !opts.noScroll) card.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
    });
    // Dots + progress
    $$('.storymaps-dots button').forEach((b,k)=> b.classList.toggle('active', k===activeIdx));
    const pct = ((activeIdx+1)/n*100).toFixed(1);
    const prog = $('#storyProgress');
    if (prog) prog.style.width = pct + '%';
    // Title in head
    const ttl = $('#storyActiveTitle');
    if (ttl) ttl.textContent = s.headline || 'Overview';
    const prevBtn = $('#stripPrev'), nextBtn = $('#stripNext');
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;
  }

  function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  function syncAutoplayButtons(){
    const paused = userPaused;
    const label = paused ? 'Play' : 'Pause';
    const ico = paused ? '▶' : '❚❚';
    const b = document.getElementById('mapAutoplayBtn');
    if (!b) return;
    b.classList.toggle('paused', paused);
    b.setAttribute('aria-pressed', String(paused));
    b.setAttribute('aria-label', `${label} autoplay`);
    const icoEl = b.querySelector('.ico');
    const labEl = b.querySelector('.label');
    if (icoEl) icoEl.textContent = ico;
    if (labEl) labEl.textContent = label;
  }
  function startAutoplay(){
    stopAutoplay();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { syncAutoplayButtons(); return; }
    if (userPaused) { syncAutoplayButtons(); return; }
    timer = setInterval(()=> {
      if (userPaused || document.hidden) return;
      if (document.querySelector('.storymaps-strip:hover')) return;
      showSlide(activeIdx+1);
    }, AUTOPLAY_MS);
    syncAutoplayButtons();
  }
  function stopAutoplay(){ if(timer){ clearInterval(timer); timer=null; } syncAutoplayButtons(); }
  function resetAutoplay(){ stopAutoplay(); startAutoplay(); }
  function toggleAutoplay(){
    userPaused = !userPaused;
    if (userPaused) stopAutoplay(); else startAutoplay();
    syncAutoplayButtons();
  }

  function buildUI(slides) {
    slidesData = slides;
    const strip = $('#storyStrip');
    const dotsBox = $('#storyDots');
    strip.innerHTML = '';
    dotsBox.innerHTML = '';
    slides.forEach((s, i)=>{
      const card = el('article','story-card');
      card.dataset.index = i;
      const mediaWrap = el('div','story-card-media');
      if (s.media_url) {
        const img = el('img');
        img.src = s.media_url;
        img.alt = s.headline || 'Story image';
        img.loading = 'lazy';
        mediaWrap.appendChild(img);
      } else {
        const ph = el('div');
        ph.style.cssText='width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,#1B2D1B 0%,#1F4A1F 100%);color:var(--gold);font-family:Fraunces,serif;font-size:1.1rem;';
        ph.textContent = s.type==='overview' ? 'FFF Success Stories' : 'Story';
        mediaWrap.appendChild(ph);
      }
      const badge = el('span','badge', s.type==='overview' ? 'Overview' : `Story ${i}`);
      mediaWrap.appendChild(badge);
      card.appendChild(mediaWrap);
      const body = el('div','story-card-body');
      body.appendChild(el('h3',null, escapeHtml(s.headline) || (s.type==='overview' ? 'FFF Success Stories — Nepal' : '')));
      const meta = el('div','kicker');
      if (s.lat!=null && s.lon!=null) meta.textContent = `${s.lat.toFixed(3)}, ${s.lon.toFixed(3)}${s.zoom ? ' · z'+s.zoom:''}`;
      else meta.textContent = s.type==='overview' ? '4 stories · Nawalpur & Makwanpur' : '';
      if (meta.textContent) body.appendChild(meta);
      const textDiv = el('div','story-text', s.text || '<p class="muted">No narrative yet.</p>');
      body.appendChild(textDiv);
      if (s.text && s.text.length>420) {
        const more = el('button','story-more','Show more');
        more.addEventListener('click',(e)=>{
          e.stopPropagation();
          const expanded = textDiv.classList.toggle('expanded');
          more.textContent = expanded ? 'Show less' : 'Show more';
        });
        body.appendChild(more);
      }
      if (s.media_credit) {
        const cred = el('small','muted');
        cred.textContent = 'Credit: ' + s.media_credit;
        body.appendChild(cred);
      }
      card.appendChild(body);
      card.addEventListener('click', ()=>{ showSlide(i); if(!userPaused) resetAutoplay(); });
      strip.appendChild(card);

      const dot = el('button');
      dot.setAttribute('aria-label', `Go to story ${i+1}: ${s.headline}`);
      dot.addEventListener('click', ()=>{ showSlide(i); if(!userPaused) resetAutoplay(); });
      dotsBox.appendChild(dot);
    });
  }

  function wireControls(){
    $('#stripPrev')?.addEventListener('click', ()=>{ showSlide(activeIdx-1); if(!userPaused) resetAutoplay(); });
    $('#stripNext')?.addEventListener('click', ()=>{ showSlide(activeIdx+1); if(!userPaused) resetAutoplay(); });
    $('#mapAutoplayBtn')?.addEventListener('click', toggleAutoplay);
    // keyboard left/right when map/panel focused
    document.addEventListener('keydown', (e)=>{
      if (e.key==='ArrowLeft'){ showSlide(activeIdx-1); if(!userPaused) resetAutoplay(); }
      if (e.key==='ArrowRight'){ showSlide(activeIdx+1); if(!userPaused) resetAutoplay(); }
      if (e.key===' ' || e.code==='Space'){
        const ae=document.activeElement;
        if (ae && (ae.tagName==='BUTTON' || ae.tagName==='A' || ae.isContentEditable)) return;
        e.preventDefault(); toggleAutoplay();
      }
    });
    // hovering the strip temporarily pauses the interval check (no button toggle); mousedown/wheel do not permanently stop
    const strip = $('#storyStrip');
    // no permanent stop on touch/wheel — hover check in interval handles temporary pause
    strip?.addEventListener('scrollend', ()=>{
      // sync to nearest card on manual scroll
      const cards = $$('.story-card', strip);
      let best=0, bestDist=Infinity;
      const mid = strip.getBoundingClientRect().left + strip.clientWidth/2;
      cards.forEach((c,i)=>{
        const r=c.getBoundingClientRect();
        const cen = r.left + r.width/2;
        const d=Math.abs(cen-mid);
        if(d<bestDist){ bestDist=d; best=i; }
      });
      if(best!==activeIdx) showSlide(best, {noScroll:true});
    });
    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden) stopAutoplay(); else if(!userPaused) startAutoplay();
    });
  }

  async function loadCsv(){
    const res = await fetch(CSV_URL, { cache: 'no-cache' });
    if(!res.ok) throw new Error(`CSV fetch ${res.status} ${CSV_URL}`);
    const text = await res.text();
    const rows = parseCsv(text);
    return csvToSlides(rows);
  }

  async function boot(){
    initMap();
    wireControls();
    try {
      const slides = await loadCsv();
      if(!slides.length) throw new Error('No slides in CSV');
      buildUI(slides);
      showSlide(0, {noScroll:true, animate:false});
      startAutoplay();
      window.addEventListener('resize', ()=> map.invalidateSize());
    } catch(err){
      const strip=$('#storyStrip');
      if(strip) strip.innerHTML = `<div class="card" style="min-width:100%;padding:20px;color:#7a2b2b">Failed to load <code>${CSV_URL}</code>: ${escapeHtml(err.message)}<br><small>Run via HTTP (python3 -m http.server) — fetch fails on file://</small></div>`;
      console.error(err);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
