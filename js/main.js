// Forest Farm Facility — vanilla JS (no build)
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Mobile nav
  const toggle = $('.nav-toggle');
  const nav = $('#siteNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
    $$('#siteNav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }
  // Active link by pathname
  const path = location.pathname.split('/').pop() || 'index.html';
  $$('#siteNav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
  });

  // Hero carousel
  const heroImgs = $$('.hero-media img');
  const dotsBox = $('.hero-dots');
  let heroIdx = 0, heroTimer;
  function showHero(i) {
    heroIdx = (i + heroImgs.length) % heroImgs.length;
    heroImgs.forEach((im, k) => im.classList.toggle('active', k === heroIdx));
    if (dotsBox) $$('button', dotsBox).forEach((b, k) => b.classList.toggle('active', k === heroIdx));
  }
  if (heroImgs.length) {
    if (dotsBox) {
      heroImgs.forEach((_, i) => {
        const b = document.createElement('button');
        b.setAttribute('aria-label', `Slide ${i + 1}`);
        b.addEventListener('click', () => { showHero(i); resetHero(); });
        dotsBox.appendChild(b);
      });
    }
    showHero(0);
    function resetHero() { clearInterval(heroTimer); heroTimer = setInterval(() => showHero(heroIdx + 1), 5200); }
    resetHero();
    // parallax
    const media = $('.hero-media');
    if (media && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.addEventListener('scroll', () => {
        const y = window.scrollY * 0.22;
        media.style.transform = `translateY(${y}px)`;
      }, { passive: true });
    }
  }

  // Stats count-up on view
  const stats = $$('.stat strong[data-end]');
  if (stats.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const end = parseInt(el.dataset.end, 10);
        let cur = 0; const step = Math.max(1, Math.ceil(end / 60));
        const tick = () => {
          cur = Math.min(end, cur + step);
          el.textContent = cur;
          if (cur < end) requestAnimationFrame(tick);
        };
        tick();
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    stats.forEach(s => io.observe(s));
  }

  // Reveal on scroll
  const reveals = $$('.reveal');
  if (reveals.length) {
    const io2 = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.12 });
    reveals.forEach(r => io2.observe(r));
  }

  // Action carousel (home)
  const cImgs = $$('.carousel-main img');
  const cTitle = $('#carouselTitle');
  const cBody = $('#carouselBody');
  const cNum = $('#carouselNum');
  const cProgress = $('#carouselProgress');
  const cPrev = $('#carouselPrev');
  const cNext = $('#carouselNext');
  const slides = window.__CAROUSEL__ || null;
  let cIdx = 0, cTimer;
  function renderCarousel(i) {
    if (!cImgs.length || !slides) return;
    cIdx = (i + cImgs.length) % cImgs.length;
    cImgs.forEach((im, k) => im.classList.toggle('active', k === cIdx));
    const s = slides[cIdx];
    if (cTitle) cTitle.textContent = s.title;
    if (cBody) cBody.textContent = s.body;
    if (cNum) cNum.textContent = s.num;
    if (cProgress) cProgress.style.width = ((cIdx + 1) / slides.length * 100) + '%';
  }
  if (slides && cImgs.length) {
    renderCarousel(0);
    cTimer = setInterval(() => renderCarousel(cIdx + 1), 4800);
    if (cPrev) cPrev.addEventListener('click', () => { renderCarousel(cIdx - 1); clearInterval(cTimer); cTimer = setInterval(() => renderCarousel(cIdx + 1), 4800); });
    if (cNext) cNext.addEventListener('click', () => { renderCarousel(cIdx + 1); clearInterval(cTimer); cTimer = setInterval(() => renderCarousel(cIdx + 1), 4800); });
  }

  // Tabs (generic)
  $$('[data-tabs]').forEach(group => {
    const tabs = $$('.tab', group);
    const panes = $$('[data-pane]', group.nextElementSibling || document);
    // if next sibling not pane container, look inside group parent
    const container = group.nextElementSibling && group.nextElementSibling.matches('[data-panes]') ? group.nextElementSibling : document;
    tabs.forEach(t => t.addEventListener('click', () => {
      const id = t.dataset.tab;
      tabs.forEach(x => x.classList.toggle('active', x === t));
      $$('[data-pane]', container).forEach(p => p.classList.toggle('hidden', p.dataset.pane !== id));
      // for global panes fallback
      $$('[data-pane]').forEach(p => { if (p.dataset.pane === id || tabs.includes(t)) {/* handled */} });
    }));
  });

  // Simple tab helper for value-chains / territories where panes are siblings
  function bindTabs(tabSelector, paneSelector) {
    const tabs = $$(tabSelector);
    const panes = $$(paneSelector);
    if (!tabs.length || !panes.length) return;
    tabs.forEach(t => t.addEventListener('click', () => {
      const id = t.dataset.tab;
      tabs.forEach(x => x.classList.toggle('active', x === t));
      panes.forEach(p => p.classList.toggle('hidden', p.dataset.pane !== id));
    }));
  }
  bindTabs('.vc-tab', '.vc-pane');
  bindTabs('.terr-tab', '.terr-pane');

  // Catalog filter
  const catSelect = $('#catalogFilter');
  const productCards = $$('.product-card');
  if (catSelect) {
    catSelect.addEventListener('change', () => {
      const v = catSelect.value;
      productCards.forEach(c => {
        const cat = c.dataset.category || '';
        c.classList.toggle('hidden', v !== 'all' && cat !== v);
      });
    });
  }
  const catSearch = $('#catalogSearch');
  if (catSearch) {
    catSearch.addEventListener('input', () => {
      const q = catSearch.value.toLowerCase().trim();
      productCards.forEach(c => {
        const text = c.textContent.toLowerCase();
        const catOk = !catSelect || catSelect.value === 'all' || c.dataset.category === catSelect.value;
        c.classList.toggle('hidden', !(catOk && (!q || text.includes(q))));
      });
    });
  }
})();
