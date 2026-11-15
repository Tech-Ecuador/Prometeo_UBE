/* Explorador de datos PSI: filtros, tabla ordenable, gráfica de dispersión y exportación CSV */
(function () {
  const PSI = window.PSI || { flame: [], same: [], saffire: [], stdce: [] };
  const $ = id => document.getElementById(id);
  const DS = {
    flame: {
      title: 'Flame Design · llamas de difusión normales (PSI-10)', rows: () => PSI.flame,
      cols: [['test', 'Test'], ['day', 'Día'], ['fuel', 'Combustible'], ['xfuel', 'Xfuel'], ['mfuel', 'mfuel mg/s'], ['mn2', 'mN₂ mg/s'], ['xo2i', 'XO₂ ini'], ['xo2f', 'XO₂ fin'], ['pm', 'p media atm'], ['zst', 'Zst'], ['tad', 'Tad K'], ['mode', 'Modo']],
      derive: r => { r.mode = r.ramp ? 'Rampa' : 'Estable'; r.mtot = (r.mfuel != null && r.mn2 != null) ? +(r.mfuel + r.mn2).toFixed(3) : null; return r; },
      filters: [
        { k: 'fuel', t: 'Combustible', type: 'check' },
        { k: 'mode', t: 'Modo', type: 'check' },
        { k: 'xo2i', t: 'Oxígeno inicial (fracción)', type: 'range' },
        { k: 'pm', t: 'Presión media (atm)', type: 'range' },
        { k: 'tad', t: 'Tad (K)', type: 'range' },
        { k: 'day', t: 'Día del experimento', type: 'range' }
      ],
      axes: ['xo2i', 'tad', 'zst', 'xfuel', 'mfuel', 'pm', 'mtot'], group: 'fuel', defX: 'xo2i', defY: 'tad', sim: true
    },
    same: {
      title: 'SAME-R · humo por material (PSI-101)', rows: () => PSI.same,
      cols: [['test', 'Test'], ['mat', 'Material'], ['desc', 'Descripción'], ['date', 'Fecha'], ['vel', 'Vel. cm/s'], ['rt', 'Rt/R0'], ['dur', 'Duración s'], ['aging', 'Aging s'], ['mix', 'Mezcla s'], ['net', 'Aging neto s']],
      filters: [{ k: 'mat', t: 'Material', type: 'check' }, { k: 'vel', t: 'Velocidad de entrada (cm/s)', type: 'range' }, { k: 'rt', t: 'Rt/R0', type: 'range' }, { k: 'net', t: 'Aging neto (s)', type: 'range' }, { k: 'desc', t: 'Buscar en descripción', type: 'text' }],
      axes: ['rt', 'net', 'vel', 'dur', 'aging'], group: 'mat', defX: 'rt', defY: 'net'
    },
    saffire: {
      title: 'SAFFIRE-1 · incendio de tela SIBAL (PSI-98)', rows: () => PSI.saffire,
      cols: [['id', 'Muestra'], ['mat', 'Material'], ['th', 'Espesor cm'], ['len', 'Largo cm'], ['wid', 'Ancho cm'], ['air', 'Aire cm/s'], ['o2', '% O₂'], ['pow', 'Ignición W'], ['ign', 'Ignición s'], ['burn', 'Quema s'], ['dir', 'Flujo']],
      filters: [{ k: 'dir', t: 'Dirección del flujo', type: 'check' }],
      axes: ['burn', 'air', 'pow', 'len'], group: 'dir', defX: 'air', defY: 'burn'
    },
    stdce: {
      title: 'STDCE-1 · convección termocapilar (PSI-108)', rows: () => PSI.stdce,
      cols: [['run', 'Run'], ['test', 'Test'], ['cfg', 'Config.'], ['heat', 'Calentamiento'], ['shape', 'Superficie'], ['power', 'Potencia W'], ['diam', 'Láser cm'], ['result', 'Resultado'], ['obs', 'Observaciones']],
      filters: [{ k: 'cfg', t: 'Configuración', type: 'check' }, { k: 'heat', t: 'Calentamiento', type: 'check' }, { k: 'shape', t: 'Forma de superficie', type: 'check' }, { k: 'power', t: 'Potencia (W)', type: 'range' }, { k: 'obs', t: 'Buscar en observaciones', type: 'text' }],
      axes: ['power', 'diam', 'run'], group: 'cfg', defX: 'run', defY: 'power'
    }
  };
  const PAL = ['#ff7a1a', '#37f0d2', '#8b6bff', '#ffcc33', '#3fb6ff', '#ff5a8a'];
  let cur = 'flame', filt = {}, sortK = null, sortD = 1, lastRows = [];
  const label = (d, k) => (d.cols.find(c => c[0] === k) || [k, k])[1];

  function rowsAll() { const d = DS[cur]; return d.rows().map(r => d.derive ? d.derive(r) : r); }
  function buildFilters() {
    const d = DS[cur], all = rowsAll(); filt = {};
    $('filters').innerHTML = '<h4 style="font-size:.95rem;color:#fff">Filtros</h4>' + d.filters.map(f => {
      if (f.type === 'check') {
        const vals = [...new Set(all.map(r => r[f.k]).filter(v => v != null && v !== ''))];
        filt[f.k] = new Set(vals);
        return `<div><h4>${f.t}</h4><div class="checks">${vals.map(v => `<label><input type="checkbox" data-k="${f.k}" value="${v}" checked>${v}</label>`).join('')}</div></div>`;
      }
      if (f.type === 'range') {
        const nums = all.map(r => r[f.k]).filter(v => typeof v === 'number'); const lo = Math.min(...nums), hi = Math.max(...nums);
        filt[f.k] = [lo, hi, lo, hi];
        return `<div><h4>${f.t}</h4><div class="row"><input type="text" data-r="${f.k}" data-i="0" value="${+lo.toFixed(3)}"><span>–</span><input type="text" data-r="${f.k}" data-i="1" value="${+hi.toFixed(3)}"></div></div>`;
      }
      filt[f.k] = '';
      return `<div><h4>${f.t}</h4><input type="text" data-t="${f.k}" placeholder="texto…"></div>`;
    }).join('') + '<button class="btn small" id="btnClear">Restablecer filtros</button>';
    $('filters').querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', () => { el.checked ? filt[el.dataset.k].add(el.value) : filt[el.dataset.k].delete(el.value); render(); }));
    $('filters').querySelectorAll('[data-r]').forEach(el => el.addEventListener('input', () => { const v = parseFloat(el.value.replace(',', '.')); filt[el.dataset.r][+el.dataset.i] = isNaN(v) ? (el.dataset.i === '0' ? -Infinity : Infinity) : v; render(); }));
    $('filters').querySelectorAll('[data-t]').forEach(el => el.addEventListener('input', () => { filt[el.dataset.t] = el.value.toLowerCase(); render(); }));
    $('btnClear').addEventListener('click', buildFilters2);
    // normalizar sets a strings
    Object.keys(filt).forEach(k => { if (filt[k] instanceof Set) filt[k] = new Set([...filt[k]].map(String)); });
  }
  function buildFilters2() { buildFilters(); render(); }

  function apply() {
    const d = DS[cur];
    let rows = rowsAll().filter(r => d.filters.every(f => {
      const v = r[f.k];
      if (f.type === 'check') return filt[f.k].has(String(v));
      if (f.type === 'range') { if (typeof v !== 'number') return isUnset(f.k); return v >= filt[f.k][0] - 1e-9 && v <= filt[f.k][1] + 1e-9; }
      return !filt[f.k] || String(v || '').toLowerCase().includes(filt[f.k]);
    }));
    if (sortK) rows = rows.slice().sort((a, b) => { const x = a[sortK], y = b[sortK]; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * sortD; });
    return rows;
  }
  function isUnset(k) { const f = filt[k]; return f[0] === f[2] && f[1] === f[3]; }

  function fmt(v) { if (v == null) return '–'; if (typeof v === 'number') return Math.abs(v) >= 100 ? v.toFixed(0) : +v.toFixed(4); return v; }
  function renderTable(rows) {
    const d = DS[cur];
    const head = '<tr>' + d.cols.map(c => `<th data-s="${c[0]}">${c[1]}${sortK === c[0] ? (sortD > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('') + (d.sim ? '<th>Simular</th>' : '') + '</tr>';
    const body = rows.slice(0, 400).map((r, i) => '<tr>' + d.cols.map(c => {
      const v = r[c[0]]; let cell = fmt(v);
      if (c[0] === 'mode') cell = `<span class="pill ${r.ramp ? 'hot' : ''}">${v}</span>`;
      if (c[0] === 'mat') cell = `<span class="pill">${v}</span>`;
      return `<td class="${typeof v === 'string' && v.length > 40 ? 'wrap' : ''}">${cell}</td>`;
    }).join('') + (d.sim ? `<td>${r.ramp || !r.tad ? '' : `<button class="btn small" data-sim="${i}">▶</button>`}</td>` : '') + '</tr>').join('');
    $('table').innerHTML = head + body;
    $('table').querySelectorAll('th[data-s]').forEach(th => th.addEventListener('click', () => { const k = th.dataset.s; sortD = sortK === k ? -sortD : 1; sortK = k; render(); }));
    $('table').querySelectorAll('[data-sim]').forEach(b => b.addEventListener('click', () => Sim.loadFlameRow(rows[+b.dataset.sim])));
    $('rowCount').textContent = `${rows.length} de ${rowsAll().length} registros` + (rows.length > 400 ? ' (mostrando 400)' : '');
  }
  function stats(rows) {
    const d = DS[cur], ys = rows.map(r => r[d.axes[1]]).filter(v => typeof v === 'number');
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
    const items = [[rows.length, 'registros']];
    if (cur === 'flame') { const t = rows.map(r => r.tad).filter(Number.isFinite), o = rows.map(r => r.xo2i).filter(Number.isFinite); items.push([t.length ? Math.max(...t).toFixed(0) + ' K' : '–', 'Tad máxima'], [o.length ? (Math.max(...o) * 100).toFixed(1) + ' %' : '–', 'O₂ máximo'], [rows.filter(r => r.ramp).length, 'rampas']); }
    else if (cur === 'same') { items.push([new Set(rows.map(r => r.mat)).size, 'materiales'], [fmt(avg(rows.map(r => r.net).filter(Number.isFinite))), 'aging neto medio (s)']); }
    else if (cur === 'saffire') { items.push([rows.map(r => r.burn).join(' / ') + ' s', 'tiempo de quema']); }
    else { items.push([new Set(rows.map(r => r.shape)).size, 'formas de superficie'], [fmt(avg(rows.map(r => r.power).filter(Number.isFinite))) + ' W', 'potencia media']); }
    $('expSummary').innerHTML = items.map(i => `<div><b>${i[0]}</b><span>${i[1]}</span></div>`).join('');
  }
  /* gráfica */
  let hit = [], tip;
  function renderChart(rows) {
    const d = DS[cur], cv = $('chart'), c = cv.getContext('2d'), Wd = cv.width, Ht = cv.height, m = { l: 62, r: 20, t: 16, b: 44 };
    const kx = $('chartSel').dataset.x || d.defX, ky = $('chartSel').dataset.y || d.defY;
    c.clearRect(0, 0, Wd, Ht); hit = [];
    const pts = rows.filter(r => typeof r[kx] === 'number' && typeof r[ky] === 'number');
    $('chartTitle').textContent = `${label(d, ky)} vs ${label(d, kx)}`;
    if (!pts.length) { c.fillStyle = '#8e95b5'; c.font = '14px Space Grotesk'; c.fillText('Sin datos numéricos con los filtros actuales', 80, 120); $('legend').innerHTML = ''; return; }
    const ext = k => { let lo = Math.min(...pts.map(p => p[k])), hi = Math.max(...pts.map(p => p[k])); if (lo === hi) { lo -= 1; hi += 1; } const pad = (hi - lo) * 0.06; return [lo - pad, hi + pad]; };
    const [x0, x1] = ext(kx), [y0, y1] = ext(ky);
    const X = v => m.l + (v - x0) / (x1 - x0) * (Wd - m.l - m.r), Y = v => Ht - m.b - (v - y0) / (y1 - y0) * (Ht - m.t - m.b);
    c.strokeStyle = 'rgba(255,255,255,.07)'; c.fillStyle = '#8e95b5'; c.font = '11px JetBrains Mono'; c.lineWidth = 1;
    for (let i = 0; i <= 5; i++) { const xv = x0 + (x1 - x0) * i / 5, yv = y0 + (y1 - y0) * i / 5; c.beginPath(); c.moveTo(X(xv), m.t); c.lineTo(X(xv), Ht - m.b); c.moveTo(m.l, Y(yv)); c.lineTo(Wd - m.r, Y(yv)); c.stroke(); c.textAlign = 'center'; c.fillText(fmt(xv), X(xv), Ht - m.b + 16); c.textAlign = 'right'; c.fillText(fmt(yv), m.l - 8, Y(yv) + 4); }
    c.textAlign = 'center'; c.fillStyle = '#c9cfe8'; c.fillText(label(d, kx), Wd / 2, Ht - 6); c.save(); c.translate(14, Ht / 2); c.rotate(-Math.PI / 2); c.fillText(label(d, ky), 0, 0); c.restore();
    const groups = [...new Set(rows.map(r => r[d.group]))], col = g => PAL[groups.indexOf(g) % PAL.length];
    pts.forEach(p => { const x = X(p[kx]), y = Y(p[ky]); c.fillStyle = col(p[d.group]) + 'cc'; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); hit.push({ x, y, p }); });
    $('legend').innerHTML = groups.map(g => `<span><i style="background:${col(g)}"></i>${g}</span>`).join('') + `<span style="margin-left:auto">${pts.length} puntos</span>`;
  }
  function chartHover(e) {
    const cv = $('chart'), r = cv.getBoundingClientRect(), s = cv.width / r.width, x = (e.clientX - r.left) * s, y = (e.clientY - r.top) * s;
    let b = null, bd = 100; hit.forEach(h => { const dd = (h.x - x) ** 2 + (h.y - y) ** 2; if (dd < bd) { bd = dd; b = h; } });
    if (!tip) { tip = document.createElement('div'); tip.style.cssText = 'position:fixed;z-index:99;pointer-events:none;background:#12162b;border:1px solid rgba(255,255,255,.2);padding:6px 10px;border-radius:8px;font:12px JetBrains Mono;color:#fff;display:none'; document.body.appendChild(tip); }
    if (b) { const d = DS[cur]; tip.style.display = 'block'; tip.style.left = e.clientX + 12 + 'px'; tip.style.top = e.clientY + 12 + 'px'; tip.textContent = (b.p.test || b.p.id || '') + ' · ' + label(d, $('chartSel').dataset.x || d.defX) + ' ' + fmt(b.p[$('chartSel').dataset.x || d.defX]) + ' · ' + label(d, $('chartSel').dataset.y || d.defY) + ' ' + fmt(b.p[$('chartSel').dataset.y || d.defY]); } else tip.style.display = 'none';
  }
  function render() { const rows = apply(); lastRows = rows; stats(rows); renderChart(rows); renderTable(rows); }
  function setDS(k) {
    cur = k; sortK = null; const d = DS[k];
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.ds === k));
    const sel = $('chartSel'); sel.dataset.x = d.defX; sel.dataset.y = d.defY;
    sel.innerHTML = d.axes.map(a => `<option value="${a}">${label(d, a)}</option>`).join(''); sel.value = d.defY;
    buildFilters(); render();
  }
  function csv() {
    const d = DS[cur], q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const out = [d.cols.map(c => q(c[1])).join(',')].concat(lastRows.map(r => d.cols.map(c => q(r[c[0]])).join(',')));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + out.join('\n')], { type: 'text/csv' })); a.download = 'prometeo_ube_' + cur + '.csv'; a.click();
  }
  window.Explorer = { init() {
    document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => setDS(b.dataset.ds)));
    $('chartSel').addEventListener('change', e => { e.target.dataset.y = e.target.value; renderChart(lastRows); });
    $('chart').addEventListener('mousemove', chartHover); $('chart').addEventListener('mouseleave', () => tip && (tip.style.display = 'none'));
    $('btnCsv').addEventListener('click', csv); setDS('flame');
  } };
})();
