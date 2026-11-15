/* Prometeo_UBE · main.js
   Fondo de estrellas, KPIs, catálogo con comparador, asistente de análisis local y navegación.
   Todo corre en el navegador: no se envía información a ningún servidor. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const DATA = (typeof PSI !== 'undefined' && PSI) ? PSI : { flame: [], same: [], saffire: [], stdce: [] };
  const CAT = window.CATALOG || [];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nums = (a, k) => (a || []).map(r => r[k]).filter(Number.isFinite);
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
  const f0 = n => Number.isFinite(n) ? Math.round(n).toLocaleString('es') : '–';
  const f1 = n => Number.isFinite(n) ? n.toLocaleString('es', { maximumFractionDigits: 1 }) : '–';
  const FUEL = { C2H4: 'etileno', C3H8: 'propano', CH4: 'metano', SIBAL: 'tela SIBAL' };
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error('[Prometeo_UBE] ' + name, e); } };

  /* ============ Fondo de estrellas ============ */
  function stars() {
    const cv = $('stars'); if (!cv) return;
    const c = cv.getContext('2d'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, st = [], d = 1;
    function size() {
      d = Math.min(window.devicePixelRatio || 1, 2); w = cv.width = Math.floor(innerWidth * d); h = cv.height = Math.floor(innerHeight * d);
      const n = Math.min(260, Math.round(innerWidth * innerHeight / 8000));
      st = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: (Math.random() * 1.2 + 0.3) * d, p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.6, z: 0.03 + Math.random() * 0.22, warm: Math.random() < 0.18 }));
    }
    const rockets = [], shooters = []; let nextR = 1500, nextS = 800, lastT = 0;
    function drawRocket(r) {
      c.save(); c.translate(r.x, r.y); c.rotate(r.a); const k = r.s * d;
      const fl = 1 + 0.25 * Math.sin(r.t * 30);
      const g = c.createLinearGradient(-60 * k * fl, 0, -6 * k, 0); g.addColorStop(0, 'rgba(255,120,30,0)'); g.addColorStop(0.5, 'rgba(255,160,50,.7)'); g.addColorStop(1, 'rgba(255,240,200,.95)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-6 * k, -5 * k); c.quadraticCurveTo(-30 * k, 0, -60 * k * fl, 0); c.quadraticCurveTo(-30 * k, 0, -6 * k, 5 * k); c.fill();
      c.fillStyle = '#c9cfe8'; c.beginPath(); c.moveTo(22 * k, 0); c.quadraticCurveTo(8 * k, -9 * k, -8 * k, -6 * k); c.lineTo(-8 * k, 6 * k); c.quadraticCurveTo(8 * k, 9 * k, 22 * k, 0); c.fill();
      c.fillStyle = '#ff5a3c'; c.beginPath(); c.moveTo(-2 * k, -6 * k); c.lineTo(-12 * k, -14 * k); c.lineTo(-9 * k, -4 * k); c.fill(); c.beginPath(); c.moveTo(-2 * k, 6 * k); c.lineTo(-12 * k, 14 * k); c.lineTo(-9 * k, 4 * k); c.fill();
      c.fillStyle = '#3fb6ff'; c.beginPath(); c.arc(7 * k, 0, 2.6 * k, 0, 6.2832); c.fill();
      c.restore();
    }
    function draw(t) {
      c.clearRect(0, 0, w, h);
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
      const sy = (window.scrollY || 0) * d;
      st.forEach(s => {
        const y = ((s.y - sy * s.z) % h + h) % h, a = reduce ? 0.7 : 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t / 1000 * s.s + s.p));
        c.fillStyle = s.warm ? `rgba(255,190,120,${a})` : `rgba(200,215,255,${a})`;
        c.beginPath(); c.arc(s.x, y, s.r, 0, 6.2832); c.fill();
      });
      if (!reduce) {
        nextR -= dt * 1000; nextS -= dt * 1000;
        if (nextR <= 0 && rockets.length < 3) { nextR = 5000 + Math.random() * 7000; const ltr = Math.random() < 0.5, a = (ltr ? -1 : 1) * 0.25 * Math.random() - (ltr ? 0.2 : 0) + (ltr ? 0 : Math.PI + 0.2); rockets.push({ x: ltr ? -80 * d : w + 80 * d, y: h * (0.15 + Math.random() * 0.7), a: ltr ? -0.15 - Math.random() * 0.35 : Math.PI + 0.15 + Math.random() * 0.35, v: (70 + Math.random() * 60) * d, s: 0.7 + Math.random() * 0.8, t: 0 }); }
        if (nextS <= 0) { nextS = 2500 + Math.random() * 5000; const a = Math.PI * (0.62 + Math.random() * 0.15); shooters.push({ x: Math.random() * w, y: Math.random() * h * 0.5, a, v: (500 + Math.random() * 300) * d, life: 0 }); }
        for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.t += dt; r.x += Math.cos(r.a) * r.v * dt; r.y += Math.sin(r.a) * r.v * dt; drawRocket(r); if (r.x < -150 * d || r.x > w + 150 * d || r.y < -150 * d || r.y > h + 150 * d) rockets.splice(i, 1); }
        for (let i = shooters.length - 1; i >= 0; i--) { const s = shooters[i]; s.life += dt; s.x += Math.cos(s.a) * s.v * dt; s.y += Math.sin(s.a) * s.v * dt; const al = Math.max(0, 1 - s.life / 0.9), L = 90 * d; const g = c.createLinearGradient(s.x, s.y, s.x - Math.cos(s.a) * L, s.y - Math.sin(s.a) * L); g.addColorStop(0, `rgba(255,255,255,${al})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 1.6 * d; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - Math.cos(s.a) * L, s.y - Math.sin(s.a) * L); c.stroke(); if (al <= 0) shooters.splice(i, 1); }
        requestAnimationFrame(draw);
      }
    }
    size(); addEventListener('resize', () => { size(); if (reduce) draw(0); });
    if (reduce) { draw(0); addEventListener('scroll', () => draw(0), { passive: true }); } else requestAnimationFrame(draw);
  }

  /* ============ KPIs ============ */
  function kpis() {
    const el = $('kpis'); if (!el) return;
    const fl = DATA.flame || [], tad = nums(fl, 'tad'), o2 = nums(fl, 'xo2i');
    const items = [
      [f0(fl.length), 'pruebas Flame Design (PSI-10)'],
      [f0((DATA.same || []).length), 'pruebas de humo SAME-R'],
      [o2.length ? (Math.max(...o2) * 100).toFixed(0) + ' %' : '–', 'O₂ máximo en PSI-10'],
      [tad.length ? f0(Math.max(...tad)) + ' K' : '–', 'Tad máxima registrada'],
      [CAT.length, 'investigaciones catalogadas'],
      ['0', 'datos PSI de gravedad parcial']
    ];
    el.innerHTML = items.map(i => `<div class="kpi"><b>${i[0]}</b><span>${i[1]}</span></div>`).join('');
    if (DATA.__demo) {
      const b = document.createElement('div'); b.className = 'demo-banner';
      b.innerHTML = '⚠ <b>Datos de demostración.</b> Estás usando <code>data.demo.js</code> (valores ilustrativos). Sustitúyelo por tu <code>data.js</code> con los CSV reales del PSI.';
      document.querySelector('main').prepend(b);
    }
  }

  /* ============ Catálogo + comparador ============ */
  const CS = { use: 'habitat', cat: 'all', cmp: [] };
  const CATLAB = { prevencion: 'Prevención', deteccion: 'Detección', supresion: 'Supresión' };
  const USELAB = { habitat: 'Entornos habitables', modelos: 'Modelos predictivos', sistemas: 'Sistemas y equipos' };

  function renderCards() {
    const list = CAT.filter(c => CS.cat === 'all' || c.cat.includes(CS.cat)).sort((a, b) => b.score[CS.use] - a.score[CS.use]);
    $('cards').innerHTML = list.map((c, i) => {
      const sc = c.score[CS.use], on = CS.cmp.includes(c.id);
      return `<article class="card">
        <span class="rank">#${i + 1} · ${sc}</span>
        <h4>${esc(c.name)}</h4><div class="full">${esc(c.full)}</div>
        <div class="tags">${c.cat.map(t => `<span class="pill hot">${CATLAB[t]}</span>`).join('')}<span class="pill">${esc(c.scenario)}</span>${c.future ? '<span class="pill hot">Brecha de datos</span>' : ''}</div>
        <p>${esc(c.goal)}</p>
        <p class="muted" style="font-size:.84rem">💡 ${esc(c.insight)}</p>
        <div class="bar" title="Relevancia editorial: ${sc}/100"><i style="width:${sc}%"></i></div>
        <div class="meta">${esc(c.fuel)} · ${esc(c.hw)}</div>
        <div class="acts">
          <button class="btn small ${on ? 'primary' : ''}" data-cmp="${c.id}">${on ? '✓ En comparación' : 'Comparar'}</button>
          ${c.dataset ? `<button class="btn small" data-ds="${c.dataset}">Ver datos →</button>` : ''}
        </div></article>`;
    }).join('') || '<p class="muted">No hay investigaciones en esta categoría.</p>';
  }
  function renderCompare() {
    const t = $('cmpTable'), sel = CS.cmp.map(id => CAT.find(c => c.id === id)).filter(Boolean);
    if (!sel.length) { t.innerHTML = '<tr><td class="wrap" style="color:#8e95b5">Aún no has seleccionado investigaciones.</td></tr>'; return; }
    const rows = [
      ['Nombre completo', c => c.full], ['Categoría', c => c.cat.map(x => CATLAB[x]).join(', ') || '—'], ['Escenario', c => c.scenario],
      ['Combustible', c => c.fuel], ['Hardware', c => c.hw], ['Mediciones', c => c.meas], ['Objetivo', c => c.goal], ['Hallazgo clave', c => c.insight],
      ['Relevancia · ' + USELAB[CS.use], c => c.score[CS.use] + ' / 100'], ['Datos en el explorador', c => c.dataset ? 'Sí (PSI)' : 'No']
    ];
    t.innerHTML = '<tr><th></th>' + sel.map(c => `<th>${esc(c.name)}</th>`).join('') + '</tr>' +
      rows.map(r => `<tr><td style="color:#ffb347">${esc(r[0])}</td>${sel.map(c => `<td class="wrap">${esc(r[1](c))}</td>`).join('')}</tr>`).join('');
  }
  function openDataset(ds) {
    const b = document.querySelector(`#tabs button[data-ds="${ds}"]`); if (b) b.click();
    $('datos').scrollIntoView({ behavior: 'smooth' });
  }
  function catalogInit() {
    renderCards(); renderCompare();
    $('segUse').addEventListener('click', e => { const b = e.target.closest('button[data-use]'); if (!b) return; CS.use = b.dataset.use; $('segUse').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); renderCards(); renderCompare(); });
    $('segCat').addEventListener('click', e => { const b = e.target.closest('button[data-cat]'); if (!b) return; CS.cat = b.dataset.cat; $('segCat').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); renderCards(); });
    $('cards').addEventListener('click', e => {
      const cm = e.target.closest('[data-cmp]'), ds = e.target.closest('[data-ds]');
      if (cm) { const id = cm.dataset.cmp, i = CS.cmp.indexOf(id); if (i >= 0) CS.cmp.splice(i, 1); else { CS.cmp.push(id); if (CS.cmp.length > 3) CS.cmp.shift(); } renderCards(); renderCompare(); }
      if (ds) openDataset(ds.dataset.ds);
    });
  }

  /* ============ Asistente de análisis (motor local) ============ */
  const EXPAND = [
    [/humo|detect|alarma|sensor|particul/, 'detec smoke aerosol humo particulas same dust polvo'],
    [/extint|suprim|apag|extinci/, 'supresion extincion extinguishment co2 flex'],
    [/hollin|soot/, 'hollin soot'],
    [/material|tela|sibal|inflam|flamab|solido/, 'solidos inflamabilidad saffire bass material flammability'],
    [/modelo|simula|predic|cfd|cinetic/, 'modelado modelos'],
    [/luna|lunar|marte|marcian|parcial/, 'luna marte gravedad parcial lunar luci e-field'],
    [/oxigeno|o2/, 'oxigeno o2 enriquecido flame design bre'],
    [/polvo|regolito/, 'polvo daft aerosoles'],
    [/fria|frias/, 'frias cool'],
    [/electric|campo|ion/, 'electrico e-field ion'],
    [/esfer/, 'esferica sflame spherical']
  ];
  const STOP = new Set('de la el los las un una que para por con del al en y o es se su sus lo como mas hay son sobre este esta estos cual cuales cuanto cuantos cuanta cuantas me mi tu puedo puede puedes quiero necesito estudio estudios investigacion investigaciones experimento experimentos sirve sirven recomienda recomiendas'.split(' '));
  const docOf = c => norm([c.name, c.full, c.fuel, c.hw, c.meas, c.goal, c.insight, c.cat.join(' '), c.scenario].join(' '));

  function pickUse(q) {
    if (/modelo|predic|cfd|valid|cinetic|simulaci/.test(q)) return 'modelos';
    if (/detector|equipo|sistema|extintor|hardware|sensor|disen|ingenier/.test(q)) return 'sistemas';
    return 'habitat';
  }
  function searchCatalog(q, use) {
    let terms = new Set(q.split(/[^a-z0-9]+/).filter(t => t.length > 3 && !STOP.has(t)));
    EXPAND.forEach(([re, add]) => { if (re.test(q)) add.split(' ').forEach(t => terms.add(t)); });
    return CAT.map(c => {
      const d = docOf(c); let hit = 0; terms.forEach(t => { if (d.includes(t)) hit++; });
      return { c, hit, rank: hit * 10 + c.score[use] / 10 };
    }).filter(x => x.hit > 0).sort((a, b) => b.rank - a.rank).slice(0, 3);
  }
  function recommend(q) {
    const use = pickUse(q), res = searchCatalog(q, use);
    if (!res.length) return null;
    return `Para <b>${USELAB[use].toLowerCase()}</b>, estas investigaciones encajan mejor:<ul>` +
      res.map(x => `<li><b>${esc(x.c.name)}</b> (${x.c.score[use]}/100): ${esc(x.c.goal)} <i>${esc(x.c.insight)}</i>${x.c.dataset ? ` <a href="#datos" data-open="${x.c.dataset}">Ver sus datos →</a>` : ''}</li>`).join('') +
      '</ul><span style="color:#8e95b5;font-size:.82rem">Las puntuaciones son una valoración editorial del catálogo, no un dato de la NASA.</span>';
  }

  function regress(xs, ys) {
    const n = xs.length; if (n < 3) return null;
    const mx = avg(xs), my = avg(ys); let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2; }
    if (!sxx || !syy) return null;
    return { slope: sxy / sxx, r: sxy / Math.sqrt(sxx * syy), n };
  }
  const stable = () => (DATA.flame || []).filter(r => !r.ramp && Number.isFinite(r.tad));
  const rowDesc = r => `prueba <b>${esc(r.test)}</b> (${FUEL[r.fuel] || esc(r.fuel)}, XO₂ ${f1((r.xo2i || 0) * 100)} %, Xfuel ${esc(r.xfuel)}, ${f1(r.pm)} atm)`;

  const INTENTS = [
    /* simular */
    {
      test: q => /(simula|enciende|prende|ejecuta|corre|prueba con|pon |configura)/.test(q) && (/luna|lunar|marte|marcian|tierra|terrestre|microgravedad|iss|estacion|\d\s*g\b|sibal|propano|etileno|\d+\s*%|cm\/s/.test(q)) && !!window.Sim,
      run: q => {
        const o = {}, say = [];
        if (/luna|lunar/.test(q)) { o.g = 0.166; say.push('gravedad lunar (0,17 g)'); }
        else if (/marte|marcian/.test(q)) { o.g = 0.38; say.push('gravedad marciana (0,38 g)'); }
        else if (/microgravedad|iss|estacion|\b0\s*g\b/.test(q)) { o.g = 0; say.push('microgravedad (0 g)'); }
        else if (/tierra|terrestre|\b1\s*g\b/.test(q)) { o.g = 1; say.push('gravedad terrestre (1 g)'); }
        const m = q.match(/(\d{2}(?:[.,]\d)?)\s*%/); if (m) { const v = parseFloat(m[1].replace(',', '.')); if (v >= 18 && v <= 40) { o.o2 = v; say.push(`${v} % de O₂`); } }
        const a = q.match(/(\d{1,2})\s*cm\/s/); if (a) { o.v = Math.min(25, +a[1]); say.push(`aire a ${o.v} cm/s`); }
        if (/sibal|tela/.test(q)) { o.fuel = 'SIBAL'; say.push('tela SIBAL'); } else if (/propano/.test(q)) { o.fuel = 'C3H8'; say.push('propano'); } else if (/etileno/.test(q)) { o.fuel = 'C2H4'; say.push('etileno'); }
        if (!say.length) return null;
        Sim.set(o); Sim.reset(); Sim.ignite();
        setTimeout(() => $('simulador').scrollIntoView({ behavior: 'smooth' }), 400);
        return `Listo: encendí el simulador con ${say.join(', ')}. Mira cómo responden la llama y los sensores; usa «⏩» para acelerar y comprobar cuánto tarda en sonar la alarma de humo.`;
      }
    },
    /* historia */
    {
      test: q => /apolo|apollo|\bmir\b|historic|accidente/.test(q),
      run: q => /apolo 13|apollo 13/.test(q) ? '<b>Apolo 13 (1970):</b> la explosión de un tanque de oxígeno ocurrió camino a la Luna. Muestra el riesgo de los sistemas de oxígeno a bordo.'
        : /apolo 1\b|apollo 1\b|1967/.test(q) ? '<b>Apolo 1 (1967):</b> un incendio en una cabina con oxígeno puro durante una prueba previa al lanzamiento acabó con la vida de la tripulación. Por eso importa estudiar cómo cambia la inflamabilidad con el % de O₂.'
        : /\bmir\b/.test(q) ? '<b>Mir (1997):</b> un fallo en el generador de oxígeno provocó un incendio; la tripulación sobrevivió. Enlace en la sección «Recursos».'
        : '<b>Lecciones históricas:</b><ul><li>1967 · Apolo 1: incendio en cabina con oxígeno puro.</li><li>1970 · Apolo 13: explosión de un tanque de oxígeno.</li><li>1997 · Mir: incendio por falla del generador de oxígeno.</li></ul>'
    },
    /* aplicaciones terrestres */
    {
      test: q => /aplicacion|spin ?off|bombero|en la tierra|beneficio|industria|mineria/.test(q),
      run: () => 'La investigación espacial ya tiene usos en la Tierra: <ul><li>Extintores de niebla fina que usan menos agua.</li><li>Detectores de humo que distinguen humo de polvo (útiles en minería).</li><li>Tanques de aire y vestimenta para bomberos.</li><li>Modelos de hollín y llamas frías para motores más limpios.</li></ul>Detalles en la sección <a href="#tierra">En la Tierra</a>.'
    },
    /* temperatura */
    {
      test: q => /(temperatura|\btad\b|caliente|calor)/.test(q) && /(max|mayor|mas alta|mas alto|mas caliente|record|promedio|media|rango|minim|menor)/.test(q),
      run: q => {
        const rows = stable(); if (!rows.length) return 'No hay temperaturas adiabáticas cargadas en el conjunto Flame Design.';
        const mx = rows.reduce((a, b) => b.tad > a.tad ? b : a), mn = rows.reduce((a, b) => b.tad < a.tad ? b : a);
        const by = {}; rows.forEach(r => (by[r.fuel] = by[r.fuel] || []).push(r.tad));
        return `En Flame Design (PSI-10, ${rows.length} pruebas estables) la <b>Tad máxima es ${f0(mx.tad)} K</b>, en la ${rowDesc(mx)}. La mínima es <b>${f0(mn.tad)} K</b> (${rowDesc(mn)}).` +
          '<ul>' + Object.keys(by).map(k => `<li>${FUEL[k] || esc(k)}: media ${f0(avg(by[k]))} K en ${by[k].length} pruebas.</li>`).join('') + '</ul>';
      }
    },
    /* oxígeno */
    {
      test: q => /(oxigeno|\bo2\b)/.test(q) && /(max|cuanto|rango|efecto|influ|sube|aumenta|relacion|afecta|alto|enriquec)/.test(q),
      run: () => {
        const rows = stable(), o2 = nums(DATA.flame, 'xo2i');
        if (!o2.length) return 'No hay datos de oxígeno cargados.';
        const rg = regress(rows.filter(r => Number.isFinite(r.xo2i)).map(r => r.xo2i * 100), rows.filter(r => Number.isFinite(r.xo2i)).map(r => r.tad));
        return `Las pruebas de PSI-10 cubren de <b>${f1(Math.min(...o2) * 100)} % a ${f1(Math.max(...o2) * 100)} % de O₂</b>.` +
          (rg ? ` Entre las pruebas estables, la Tad cambia en promedio <b>${rg.slope >= 0 ? '+' : ''}${f1(rg.slope)} K por punto de O₂</b> (r = ${rg.r.toFixed(2)}, n = ${rg.n}); es una tendencia estadística, no un modelo físico.` : '') +
          ' Más O₂ significa llamas más calientes y materiales más inflamables, relevante para atmósferas de base lunar (≈30 %). Para el extremo, la investigación CFI-G estudia llamas frías con hasta 85 % de O₂.';
      }
    },
    /* SAME */
    {
      test: q => /\bsame\b|same-r|aging|envejec|kapton|silicona|teflon|pyrell|tamano de particula/.test(q),
      run: () => {
        const s = DATA.same || []; if (!s.length) return 'No hay datos de SAME-R cargados.';
        const by = {}; s.forEach(r => (by[r.mat] = by[r.mat] || []).push(r));
        return `SAME-R (PSI-101) tiene <b>${s.length} pruebas</b> de humo en <b>${Object.keys(by).length} materiales</b>:<ul>` +
          Object.keys(by).map(m => { const net = avg(nums(by[m], 'net')); return `<li><b>${esc(m)}</b>: ${by[m].length} pruebas${Number.isFinite(net) ? `, aging neto medio ${f0(net)} s` : ''}.</li>`; }).join('') +
          '</ul>Sirven para ajustar la sensibilidad de los detectores de humo de naves. Puedes filtrarlos en el explorador.';
      }
    },
    /* SAFFIRE */
    {
      test: q => /saffire|sibal|concurrente|opuesto/.test(q),
      run: () => {
        const s = DATA.saffire || [];
        if (!s.length) return 'SAFFIRE-1: la misma tela ardió 420 s con flujo concurrente y 70 s con flujo opuesto (dato del catálogo).';
        const li = s.map(r => `<li><b>${esc(r.id)}</b> · flujo ${esc(r.dir)}: quema <b>${f0(r.burn)} s</b> (aire ${esc(r.air)} cm/s, ${esc(r.o2)} % O₂)</li>`).join('');
        const c = s.find(r => /conc/i.test(r.dir)), o = s.find(r => /opu|opp/i.test(r.dir));
        const ratio = c && o && c.burn && o.burn ? ` La quema concurrente duró unas <b>${f1(c.burn / o.burn)}×</b> más que la opuesta.` : '';
        return `SAFFIRE-1 (PSI-98) quemó tela SIBAL en una nave Cygnus:<ul>${li}</ul>${ratio} La dirección del aire cambia radicalmente la propagación del fuego.`;
      }
    },
    /* STDCE */
    {
      test: q => /stdce|termocapilar|tension superficial/.test(q),
      run: () => {
        const s = DATA.stdce || []; if (!s.length) return 'No hay datos de STDCE-1 cargados.';
        const by = {}; s.forEach(r => by[r.cfg] = (by[r.cfg] || 0) + 1);
        return `STDCE-1 (PSI-108) tiene <b>${s.length} corridas</b>: ` + Object.keys(by).map(k => `${by[k]} en configuración ${esc(k)}`).join(', ') + `. Potencia media ${f1(avg(nums(s, 'power')))} W. No trata incendios directamente, pero ilustra cómo sin gravedad el calor mueve fluidos por tensión superficial.`;
      }
    },
    /* conteos */
    {
      test: q => /cuant(os|as)|numero de|total/.test(q) && /prueba|registro|dato|test|corrida|experimento/.test(q),
      run: () => `Datos cargados:<ul><li>Flame Design (PSI-10): <b>${(DATA.flame || []).length}</b> registros (${(DATA.flame || []).filter(r => r.ramp).length} rampas).</li><li>SAME-R (PSI-101): <b>${(DATA.same || []).length}</b>.</li><li>SAFFIRE-1 (PSI-98): <b>${(DATA.saffire || []).length}</b>.</li><li>STDCE-1 (PSI-108): <b>${(DATA.stdce || []).length}</b>.</li></ul>Catálogo: ${CAT.length} investigaciones.`
    },
    /* estado del simulador */
    {
      test: q => !!window.Sim && /(simulador|llama|alarma|sensores).*(ahora|actual|estado|resultado|va|paso|pasa)|que (pasa|paso|esta pasando)|como (va|esta)/.test(q),
      run: () => {
        const S = Sim.S, P = Sim.P;
        if (!S.burning && S.intensity < 0.05) return S.reason ? `La llama se apagó: ${esc(S.reason)}.` : 'El simulador está apagado. Pulsa «Encender» o pídeme, por ejemplo: «simula la Luna con 30 % de oxígeno».';
        return `Llama activa desde hace <b>${S.tb.toFixed(0)} s</b> a ${P.g.toFixed(2)} g y ${P.o2} % de O₂. Temp. lateral <b>${f0(S.Ts)} K</b>, superior <b>${f0(S.Tt)} K</b>, humo ${S.obs.toFixed(1)} %/m (${S.alarm ? '<b>alarma activada a los ' + S.detT.toFixed(1) + ' s</b>' : 'aún sin alarma'}), CO₂ ${f0(S.co2)} ppm, CO ${f1(S.co)} ppm, O₂ local ${S.o2l.toFixed(2)} %.`;
      }
    },
    /* recomendación (palabras explícitas) */
    { test: q => /(estudio|investigaci|experimento|recomiend|sirve|sirven|util para|mejor para|que hay)/.test(q), run: q => recommend(q) },
    /* brecha de gravedad parcial */
    {
      test: q => /gravedad parcial|brecha|laguna|que falta|falta por/.test(q),
      run: () => 'Hoy <b>no hay datos de gravedad parcial</b> (Luna 0,17 g, Marte 0,38 g) en el PSI: es la mayor brecha para la exploración lunar y marciana. Las vías actuales son simulaciones y el efecto de viento iónico de <b>E-FIELD</b>; las plataformas futuras (<b>LUCI / FM2</b>) darán los primeros datos. Mientras tanto, el simulador interpola cualitativamente entre 0 g y 1 g.'
    },
    /* ayuda */
    {
      test: q => /^(hola|buenas|hey|ayuda|help)|que puedes|que sabes|como funciona/.test(q),
      run: () => 'Puedo: <ul><li>recomendar investigaciones del catálogo según tu necesidad,</li><li>calcular estadísticas de los datos PSI (Tad máxima, efecto del O₂, materiales SAME…),</li><li>configurar y encender el simulador («simula Marte con 30 % de oxígeno»),</li><li>explicar el estado actual de la simulación y la historia de incendios espaciales.</li></ul>'
    }
  ];

  function answer(raw) {
    const q = norm(raw).trim();
    for (const it of INTENTS) {
      let ok = false; try { ok = it.test(q); } catch (e) { ok = false; }
      if (!ok) continue;
      const out = it.run(q); if (out) return out;
    }
    const gen = recommend(q);
    return gen || 'No encontré una coincidencia clara en el catálogo ni en los datos. Prueba con palabras como <i>humo, extinción, oxígeno, hollín, materiales, Luna</i> o pulsa una de las sugerencias.';
  }

  function assistantInit() {
    const chat = $('chat'), form = $('chatForm'), inp = $('chatIn');
    const add = (cls, html) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html; chat.appendChild(d); chat.scrollTop = chat.scrollHeight; return d; };
    function ask(text) {
      text = text.trim(); if (!text) return;
      add('me', esc(text));
      const wait = add('bot', '<span style="color:#8e95b5">Analizando…</span>');
      setTimeout(() => { let html; try { html = answer(text); } catch (e) { console.error(e); html = 'Ocurrió un error al analizar tu pregunta. Intenta reformularla.'; } wait.innerHTML = html; chat.scrollTop = chat.scrollHeight; }, 260);
    }
    form.addEventListener('submit', e => { e.preventDefault(); const v = inp.value; inp.value = ''; ask(v); });
    chat.addEventListener('click', e => { const a = e.target.closest('[data-open]'); if (a) { e.preventDefault(); openDataset(a.dataset.open); } });
    const SUG = ['¿Qué estudio sirve para el detector de humo de una base lunar?', '¿Cuál fue la temperatura adiabática máxima?', '¿Cómo influye el oxígeno en la llama?', 'Simula la Luna con 30 % de oxígeno', '¿Qué pasó en SAFFIRE-1?', '¿Qué falta por investigar para Marte?'];
    $('suggest').innerHTML = SUG.map(s => `<button type="button" class="chip-btn">${esc(s)}</button>`).join('');
    $('suggest').addEventListener('click', e => { const b = e.target.closest('button'); if (b) ask(b.textContent); });
    add('bot', 'Hola, soy <b>Prometeo</b>. Analizo el catálogo y los datos PSI cargados, todo en tu navegador. Pregúntame algo o toca una sugerencia.');
  }

  /* ============ Navegación: sección activa ============ */
  function navInit() {
    const links = [...document.querySelectorAll('.nav nav a')], map = {};
    links.forEach(a => map[a.getAttribute('href').slice(1)] = a);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && map[e.target.id]) { links.forEach(l => l.classList.remove('on')); map[e.target.id].classList.add('on'); } }), { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(id => { const s = $(id); if (s) io.observe(s); });
  }

  safe('stars', stars); safe('kpis', kpis); safe('catalog', catalogInit); safe('assistant', assistantInit); safe('nav', navInit);
  safe('explorer', () => window.Explorer && window.Explorer.init());
})();
