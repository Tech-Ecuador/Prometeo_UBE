/* Prometeo_UBE · fx.js
   Efectos de presentación: barra de progreso, aparición al hacer scroll, brillo que sigue al cursor,
   contadores animados en el hero y botón «volver arriba». No modifica la lógica del panel. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  /* barra de progreso + botón volver arriba */
  const bar = $('progress'), top = $('toTop');
  function onScroll() {
    const h = document.documentElement, max = h.scrollHeight - innerHeight;
    if (bar) bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
    if (top) top.classList.toggle('show', scrollY > 700);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (top) top.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  /* aparición al hacer scroll (solo elementos estáticos; el contenido dinámico no se oculta) */
  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('fx');
    const sel = '.sec-head, .stage-wrap, .controls, .sensors, .insight, .tabs, .explorer, .cat-controls, .compare, .assistant, .game, .guide-title, .history, .earth article, .links li, .hero-badges, .kpis';
    const els = [...document.querySelectorAll(sel)];
    els.forEach((el, i) => { el.classList.add('reveal'); el.style.setProperty('--d', ((i % 4) * 0.08) + 's'); });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    els.forEach(el => io.observe(el));
    /* seguro: si algo no se revela en 2.5 s (p. ej. impresión), se muestra todo */
    setTimeout(() => els.forEach(el => { if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); }), 2500);
  }

  /* brillo que sigue al cursor en paneles y tarjetas */
  const GLOW = '.kpi,.card,.sensor,.controls,.filters,.chart-card,.fg,.earth article,.links li,.game-side,.assistant,.exp-summary div,.history';
  document.addEventListener('pointermove', e => {
    const t = e.target.closest && e.target.closest(GLOW); if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* contadores animados en los KPIs del hero (se generan en main.js) */
  function countUp(el) {
    const raw = el.textContent, m = raw.match(/^([\d.,]+)(.*)$/); if (!m) return;
    const target = parseFloat(m[1].replace(/\./g, '').replace(',', '.')); if (!isFinite(target) || target === 0) return;
    const suffix = m[2], dec = /[,.]\d+$/.test(m[1]) && !/^\d{1,3}([.,]\d{3})+$/.test(m[1]) ? 1 : 0, t0 = performance.now(), D = 1400;
    (function step(now) {
      const k = Math.min(1, (now - t0) / D), v = target * (1 - Math.pow(1 - k, 3));
      el.textContent = v.toLocaleString('es', { maximumFractionDigits: dec }) + suffix;
      if (k < 1) requestAnimationFrame(step); else el.textContent = raw;
    })(t0);
  }
  if (!reduce) setTimeout(() => document.querySelectorAll('#kpis .kpi b').forEach(countUp), 350);
})();
