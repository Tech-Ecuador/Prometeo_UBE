/* Simulador animado de llama + sensores (modelo cualitativo y didáctico).
   La temperatura adiabática se obtiene de la prueba real más cercana en PSI-10 (Flame Design). */
(function () {
  const PSI = window.PSI || { flame: [], same: [], saffire: [], stdce: [] };
  const $ = id => document.getElementById(id);
  const cv = $('stage'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const C = { x: 450, y: 350 };
  const POS = { smoke: { x: 770, y: 110 }, tside: { x: 650, y: 350 }, ttop: { x: 450, y: 120 }, gas: { x: 120, y: 190 }, rad: { x: 110, y: 470 }, nozzle: { x: 150, y: 330 } };
  const P = { g: 0, o2: 21, p: 1, v: 0, fuel: 'C2H4', dil: 0, f: 1.2 };
  const S = { burning: false, t: 0, tb: 0, intensity: 0, sup: 0, suppressing: false, alarm: false, detT: null, obs: 0, Ts: 295, Tt: 295,
    co2: 420, co: 0, o2l: 21, q: 0, dp: 0, speed: 1, reason: '', burnProg: 0, hist: {}, burn: 0, co2g: 420, cog: 0, o2c: 0, match: null, Tad: 295, soot: 0, R: 60, hitS: 0 };
  const smoke = [], agent = [];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rn = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;

  /* ---------- modelo ---------- */
  function findMatch() {
    if (P.fuel === 'SIBAL') { S.match = null; S.Tad = 1250 + (P.o2 - 21) * 30; return; }
    const xf = clamp(1 - P.dil / 100, 0.04, 1);
    let best = null, bd = 1e9;
    for (const r of PSI.flame) {
      if (r.ramp || !r.tad || r.fuel !== P.fuel || r.xfuel == null) continue;
      const d = Math.pow((P.o2 / 100 - r.xo2i) / 0.05, 2) + Math.pow((xf - r.xfuel) / 0.2, 2) + Math.pow((P.f - r.mfuel) / 1.5, 2) * 0.3 + Math.pow((P.p - r.pm) / 0.15, 2);
      if (d < bd) { bd = d; best = r; }
    }
    S.match = best; S.Tad = best ? best.tad : 2000;
    // ajuste fino por diferencia de O2 respecto a la prueba (≈ +9 K por punto de O2)
    if (best) S.Tad += (P.o2 - best.xo2i * 100) * 9;
  }
  function limits() {
    const dl = 62 + 26 * (1 - P.g) + (P.o2 - 21) * 1.1 - (P.fuel === 'C3H8' ? 4 : 0);
    const sib = (P.o2 - 21) * 0.9 + Math.min(P.v, 20) * 0.25 + P.g * 3 >= 1.5;
    return { dl, sib };
  }
  function derived() {
    const base = { C2H4: 1, C3H8: 0.8, SIBAL: 0.9 }[P.fuel];
    const dil = P.fuel === 'SIBAL' ? 0 : P.dil;
    S.soot = clamp(base * Math.pow(1 - dil / 100, 1.4) * (1 + 0.7 * (1 - P.g)) * (1 - (P.o2 - 21) / 120), 0, 1);
    S.R = (34 + 26 * Math.sqrt(P.f)) * (1 + 0.55 * (1 - P.g)) * (1 - 0.5 * dil / 100) * (1 + (P.o2 - 21) / 60);
    if (P.fuel === 'SIBAL') S.R *= 0.62;
  }

  /* ---------- partículas ---------- */
  function spawnSmoke(dt) {
    const rate = 70 * S.soot * (P.fuel === 'SIBAL' ? 1.4 : 1) * Math.sqrt(P.f) * S.intensity;
    let n = rate * dt; n = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
    for (let i = 0; i < n && smoke.length < 900; i++) {
      const a = Math.random() * Math.PI * 2, r = S.R * 0.9;
      const out = 30 + Math.random() * 22;
      smoke.push({ x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r, vx: Math.cos(a) * out, vy: Math.sin(a) * out, life: 0, s: 2 + Math.random() * 3 });
    }
  }
  function stepSmoke(dt) {
    const fx = P.v * 6, buoy = 105 * P.g, sig = 30;
    let cnt = 0;
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i]; p.life += dt;
      const k = Math.min(1, dt * 0.9);
      p.vx += (fx - p.vx) * k; p.vy += (-buoy - p.vy) * k;
      p.x += (p.vx + rn() * sig) * dt; p.y += (p.vy + rn() * sig) * dt;
      if (p.x < 26 || p.x > W - 26) { p.vx *= -0.5; p.x = clamp(p.x, 26, W - 26); }
      if (p.y < 26 || p.y > H - 26) { p.vy *= -0.5; p.y = clamp(p.y, 26, H - 26); }
      if (p.life > 80) smoke.splice(i, 1);
      else if (Math.hypot(p.x - POS.smoke.x, p.y - POS.smoke.y) < 70) cnt++;
    }
    S.obs += (Math.min(cnt * 0.42, 40) - S.obs) * Math.min(1, dt * 1.6);
  }
  function stepAgent(dt) {
    if (S.suppressing && S.sup < 1) {
      for (let i = 0; i < 6; i++) agent.push({ x: POS.nozzle.x, y: POS.nozzle.y + rn() * 14, vx: 200 + Math.random() * 90, vy: rn() * 40, life: 0 });
      S.sup = Math.min(1, S.sup + dt * (0.30 + 0.22 * P.g + P.v * 0.008));
    }
    for (let i = agent.length - 1; i >= 0; i--) {
      const a = agent[i]; a.life += dt; a.x += a.vx * dt; a.y += (a.vy + rn() * 40) * dt; a.vx *= 1 - dt * 0.55;
      if (a.life > 2.6) agent.splice(i, 1);
    }
  }

  /* ---------- sensores ---------- */
  function stepSensors(dt) {
    const I = S.intensity, tau = 2.2;
    const R = S.R, px = 1;
    const dS = Math.hypot(POS.tside.x - C.x, POS.tside.y - C.y), dT = Math.hypot(POS.ttop.x - C.x, POS.ttop.y - C.y);
    const Ls = R * 0.55 * (1 + P.v / 40), Lt = R * (0.55 + 3.4 * P.g) * (1 + P.v / 60);
    const Tf = S.Tad;
    const tgS = 295 + (Tf - 295) * 0.9 * Math.exp(-dS * px / Ls) * I;
    const tgT = 295 + (Tf - 295) * 0.9 * Math.exp(-dT * px / Lt) * I;
    S.Ts += (tgS - S.Ts) * Math.min(1, dt / tau); S.Tt += (tgT - S.Tt) * Math.min(1, dt / tau);
    // mezcla de gases: lenta sin convección
    const mixTau = Math.max(4, 12 + (1 - P.g) * 40 - P.v * 1.4);
    if (I > 0.05) {
      S.burn += dt * I;
      S.co2g = (S.co2g || 420) + 18 * P.f * I * dt;
      S.cog = (S.cog || 0) + 4 * P.f * S.soot * I * dt * (1 + (1 - P.g) * 0.5);
      S.o2c = (S.o2c || 0) + 0.0025 * P.f * I * dt;
    }
    const m = 1 - Math.exp(-S.burn / mixTau);
    S.co2 = 420 + ((S.co2g || 420) - 420) * m; S.co = (S.cog || 0) * m; S.o2l = P.o2 - (S.o2c || 0) * m * (1 + (1 - P.g) * 1.2);
    const eps = 0.2 + 0.6 * S.soot, Tr = Tf * 0.8, d = 330 * 0.15 / 100, Rm = R * 0.15 / 100;
    S.q = (eps * 5.67e-8 * (Math.pow(Tr, 4) - Math.pow(295, 4)) * Math.pow(Rm / d, 2) * 0.1 * I) / 1000;
    S.dp = 0.0004 * S.burn * P.f;
    // alarma de humo
    if (S.obs >= 4) { S.hitS += dt; if (S.hitS > 0.5 && !S.alarm) { S.alarm = true; S.detT = S.tb; } } else S.hitS = 0;
  }
  const SENS = [
    { id: 'obs', t: 'Humo (fotoeléctrico)', u: '% obs/m', f: () => S.obs, d: 1, w: 2, a: 4, max: 20 },
    { id: 'ts', t: 'Temp. lateral', u: 'K', f: () => S.Ts, d: 0, w: 320, a: 350, max: 600, min: 290 },
    { id: 'tt', t: 'Temp. superior', u: 'K', f: () => S.Tt, d: 0, w: 320, a: 350, max: 600, min: 290 },
    { id: 'co2', t: 'CO₂', u: 'ppm', f: () => S.co2, d: 0, w: 1500, a: 5000, max: 9000, min: 400 },
    { id: 'co', t: 'CO', u: 'ppm', f: () => S.co, d: 1, w: 35, a: 100, max: 200 },
    { id: 'o2', t: 'O₂ local', u: '%', f: () => S.o2l, d: 2, w: null, a: null, max: 40, min: 15 },
    { id: 'q', t: 'Radiómetro', u: 'kW/m²', f: () => S.q, d: 2, w: 0.5, a: 1.5, max: 4 },
    { id: 'p', t: 'Presión cámara', u: 'atm', f: () => P.p + S.dp, d: 3, w: null, a: null, max: 1.4, min: 0.6 },
    { id: 'tad', t: 'Tad (dato PSI)', u: 'K', f: () => S.Tad, d: 0, w: null, a: null, max: 3000, min: 1500 }
  ];
  function buildSensors() {
    $('sensors').innerHTML = SENS.map(s => `<div class="sensor" id="s_${s.id}"><h4>${s.t}<i class="st"></i></h4><div class="val"><span>–</span> <small>${s.u}</small></div><canvas width="260" height="42"></canvas></div>`).join('');
    SENS.forEach(s => S.hist[s.id] = []);
  }
  function sampleSensors() {
    SENS.forEach(s => {
      const v = s.f(), h = S.hist[s.id]; h.push(v); if (h.length > 100) h.shift();
      const el = $('s_' + s.id); if (!el) return;
      el.querySelector('.val span').textContent = v.toFixed(s.d);
      el.classList.toggle('alert', s.a != null && v >= s.a); el.classList.toggle('mid', s.w != null && v >= s.w && !(s.a != null && v >= s.a));
      const c = el.querySelector('canvas'), g = c.getContext('2d'); g.clearRect(0, 0, 260, 42);
      const lo = s.min ?? 0, hi = Math.max(s.max, ...h);
      g.beginPath(); h.forEach((y, i) => { const X = i / 99 * 260, Y = 40 - clamp((y - lo) / (hi - lo), 0, 1) * 38; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
      g.strokeStyle = s.a != null && v >= s.a ? '#ff5a5a' : '#37f0d2'; g.lineWidth = 2; g.stroke();
      g.lineTo(260, 42); g.lineTo(0, 42); g.fillStyle = 'rgba(55,240,210,.08)'; g.fill();
    });
  }

  /* ---------- dibujo ---------- */
  function flamePath(c, R, tt) {
    const g = P.g, N = 56, a = 2.3 * Math.pow(g, 0.7);
    const wob = (1 + 0.09 * g * Math.sin(tt * 11) + 0.05 * g * Math.sin(tt * 23)) ;
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const th = i / N * Math.PI * 2, u = -Math.sin(th), up = Math.max(0, u), dn = Math.max(0, -u);
      const fl = wob + 0.06 * g * Math.sin(tt * 7 + i * 0.5) * up;
      const r = R * (1 + a * Math.pow(up, 3) * fl) * (1 - 0.3 * g * dn);
      const tilt = P.v / 25 * a * R * 0.35 * up * up;
      const x = Math.cos(th) * r * (1 - 0.25 * g) + tilt, y = Math.sin(th) * r;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
  }
  function drawFlame() {
    const I = S.intensity; if (I < 0.02) return;
    const s = S.soot, tt = S.t;
    const cO = mix([70, 150, 255], [255, 120, 30], s), cM = mix([90, 200, 255], [255, 195, 70], s), cC = mix([170, 230, 255], [255, 245, 215], s);
    ctx.save(); ctx.translate(C.x, C.y);
    if (P.fuel === 'SIBAL') ctx.scale(2.3, 0.85);
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(0, 0, S.R * 0.3, 0, 0, S.R * 3.4);
    gl.addColorStop(0, `rgba(${cO},${0.28 * I})`); gl.addColorStop(1, `rgba(${cO},0)`);
    ctx.fillStyle = gl; ctx.fillRect(-S.R * 4, -S.R * 4, S.R * 8, S.R * 8);
    const wob = P.dil > 0 && P.dil > limits().dl - 8 ? 1 + 0.07 * Math.sin(tt * 3) : 1;
    [[1, cO, 0.55], [0.72, cM, 0.6], [0.4, cC, 0.8]].forEach(([k, col, al]) => {
      ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = 28 * k;
      flamePath(ctx, S.R * k * wob * (0.8 + 0.2 * I), tt); ctx.fillStyle = `rgba(${col},${al * I})`; ctx.fill();
    });
    ctx.restore();
  }
  function drawScene() {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 520); bg.addColorStop(0, '#0e1226'); bg.addColorStop(1, '#03040a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1;
    for (let x = 60; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, H - 20); ctx.stroke(); }
    for (let y = 60; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(W - 20, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(20, 20, W - 40, H - 40, 26); ctx.stroke();
    // flujo de aire
    if (P.v > 0) { ctx.strokeStyle = 'rgba(63,182,255,.35)'; ctx.fillStyle = 'rgba(63,182,255,.5)'; ctx.font = '11px JetBrains Mono'; for (let k = 0; k < 4; k++) { const y = 210 + k * 80, o = (S.t * P.v * 6) % 120; ctx.beginPath(); ctx.moveTo(40 + o % 60, y); ctx.lineTo(100 + o % 60, y); ctx.stroke(); ctx.fillText('›', 102 + o % 60, y + 4); } ctx.fillText('aire ' + P.v + ' cm/s', 40, 190); }
    // quemador
    ctx.fillStyle = '#2a2f4a'; ctx.fillRect(C.x - 6, C.y, 12, 210); ctx.fillRect(C.x - 70, H - 70, 140, 14);
    if (P.fuel === 'SIBAL') {
      const L = 220 * (1 - 0.5 * clamp(S.burnProg, 0, 1)); ctx.fillStyle = '#c9b88a'; ctx.fillRect(C.x - 110, C.y - 7, 220, 14);
      ctx.fillStyle = '#1a1410'; ctx.fillRect(C.x - 110 + L, C.y - 7, 220 - L, 14);
    } else { ctx.fillStyle = '#8791b8'; ctx.beginPath(); ctx.arc(C.x, C.y, 14, 0, 7); ctx.fill(); }
    // gravedad
    ctx.fillStyle = '#8e95b5'; ctx.font = '12px JetBrains Mono';
    if (P.g > 0.02) { ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2 + P.g * 4; ctx.beginPath(); ctx.moveTo(W - 60, 460); ctx.lineTo(W - 60, 460 + 20 + 60 * P.g); ctx.stroke(); ctx.fillStyle = '#ffb347'; ctx.fillText('g', W - 54, 480); }
    // humo
    ctx.globalCompositeOperation = 'source-over';
    smoke.forEach(p => { const a = Math.min(0.42, 0.5 * (1 - p.life / 80)); ctx.fillStyle = `rgba(190,190,205,${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s + p.life * 0.18, 0, 7); ctx.fill(); });
    drawFlame();
    agent.forEach(a => { ctx.fillStyle = `rgba(55,240,210,${0.5 * (1 - a.life / 2.6)})`; ctx.beginPath(); ctx.arc(a.x, a.y, 3 + a.life * 3, 0, 7); ctx.fill(); });
    // sensores en escena
    marker(POS.smoke, 'HUMO', S.alarm ? '#ff4040' : '#37f0d2', 70);
    marker(POS.tside, 'T lat.', '#ffb347'); marker(POS.ttop, 'T sup.', '#ffb347');
    marker(POS.gas, 'CO₂/CO/O₂', '#8b6bff'); marker(POS.rad, 'RAD', '#3fb6ff');
    ctx.strokeStyle = 'rgba(63,182,255,.12)'; ctx.beginPath(); ctx.moveTo(POS.rad.x, POS.rad.y); ctx.lineTo(C.x, C.y - S.R); ctx.moveTo(POS.rad.x, POS.rad.y); ctx.lineTo(C.x, C.y + S.R); ctx.stroke();
    if (S.suppressing || S.sup > 0) marker(POS.nozzle, 'CO₂', '#37f0d2');
    if (!S.burning && S.intensity < 0.05) { ctx.fillStyle = 'rgba(233,236,248,.55)'; ctx.font = '16px Space Grotesk'; ctx.textAlign = 'center'; ctx.fillText(S.reason ? S.reason : 'Pulsa «Encender» para iniciar el experimento', W / 2, H - 100); ctx.textAlign = 'left'; }
  }
  function marker(p, label, col, ring) {
    if (ring) { ctx.strokeStyle = col + '66'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(p.x, p.y, ring, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#c9cfe8'; ctx.font = '11px JetBrains Mono'; ctx.fillText(label, p.x + 11, p.y + 4);
  }

  /* ---------- bucle ---------- */
  let last = performance.now(), visible = true, insT = 0, smpT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = Math.min(0.05, (now - last) / 1000); last = now; if (!visible) return;
    const steps = S.speed; for (let k = 0; k < steps; k++) tick(raw);
    drawScene();
    smpT += raw * S.speed; if (smpT > 0.25) { smpT = 0; sampleSensors(); }
    insT += raw; if (insT > 0.6) { insT = 0; updateUI(); }
  }
  function tick(dt) {
    S.t += dt; const L = limits(); let target = 0, why = '';
    if (S.burning) {
      S.tb += dt;
      if (P.fuel === 'SIBAL') { if (!L.sib) { why = 'Extinción: sin flujo de aire suficiente, el oxígeno no llega por difusión'; } }
      else if (P.dil > L.dl) why = 'Extinción por dilución del combustible (límite ≈ ' + L.dl.toFixed(0) + ' %)';
      target = why ? 0 : clamp(0.55 + 0.45 * Math.min(P.f / 1.5, 1), 0, 1) * (1 - S.sup);
      if (!why && S.sup >= 0.99) why = 'Llama suprimida con CO₂';
      if (why && S.tb > 1.2) { S.burning = false; S.reason = why; }
      if (P.fuel === 'SIBAL') S.burnProg += dt * S.intensity * (0.004 + 0.02 * Math.min(P.v, 20) / 20);
    }
    S.intensity += (target - S.intensity) * Math.min(1, dt * (target > S.intensity ? 2.2 : 1.6));
    if (S.intensity < 0.01 && !S.burning) S.intensity = 0;
    if (S.intensity > 0.03) spawnSmoke(dt);
    stepSmoke(dt); stepAgent(dt); stepSensors(dt);
  }

  /* ---------- UI ---------- */
  function fmtG() { return P.g < 0.005 ? '0 g' : P.g.toFixed(2) + ' g'; }
  function updateUI() {
    $('hudG').textContent = fmtG();
    $('hudMode').textContent = P.g < 0.02 ? 'Microgravedad' : P.g < 0.2 ? 'Gravedad lunar' : P.g < 0.45 ? 'Gravedad marciana' : P.g < 0.95 ? 'Gravedad parcial' : 'Gravedad terrestre';
    $('hudAlarm').classList.toggle('hidden', !S.alarm);
    $('matchNote').textContent = S.match ? `Dato PSI-10 más cercano: ${S.match.test} (día ${S.match.day}) · XO₂ ${(S.match.xo2i * 100).toFixed(1)} % · Xfuel ${S.match.xfuel} · Tad ${S.match.tad.toFixed(0)} K` : P.fuel === 'SIBAL' ? 'SIBAL: sin Tad en PSI-10. Referencia SAFFIRE-1: 20 cm/s, 21,5 % O₂; ardió 420 s (concurrente) y 70 s (opuesto).' : '—';
    const parts = [];
    const shape = P.g < 0.05 ? 'una <b>esfera casi perfecta</b>: sin flotabilidad, el oxígeno llega solo por difusión' : P.g < 0.5 ? 'una llama <b>alargada y más ancha</b> que en la Tierra, con flotabilidad débil' : 'la clásica <b>forma de lágrima</b> con parpadeo, gracias a la convección natural';
    parts.push(`A ${fmtG()} la llama es ${shape}.`);
    parts.push(S.soot > 0.6 ? 'Genera <b>mucho hollín</b> (en microgravedad hay 5–8× más según ACME CLD).' : S.soot > 0.25 ? 'Hollín moderado.' : 'Llama azulada casi sin hollín: es más difícil de ver y de detectar con humo.');
    if (P.o2 >= 28) parts.push(`Con <b>${P.o2} % de O₂</b> (atmósfera tipo base lunar) la llama es más caliente y los materiales son mucho más inflamables.`);
    if (S.detT != null) parts.push(`⏱ El detector de humo tardó <b>${S.detT.toFixed(1)} s</b> en alarmar. ${P.g < 0.05 && P.v < 2 ? 'Sin flotabilidad ni ventilación el humo se queda cerca de la llama: ¡la detección se retrasa!' : 'La ventilación o la flotabilidad acercan el humo al detector.'}`);
    else if (S.burning && S.tb > 8 && !S.alarm) parts.push('⏳ El humo aún no llega al detector. Prueba aumentar la velocidad del aire o acelerar la simulación.');
    if (S.reason && !S.burning) parts.push(`<b>${S.reason}.</b>`);
    if (S.o2l < P.o2 - 0.15) parts.push('El O₂ local ya cayó: en microgravedad la mezcla es lenta, así que una tripulación podría no notar el cambio rápido.');
    $('insight').innerHTML = parts.join(' ');
  }
  function bind(id, out, fmt, key, scale) {
    const el = $(id); el.addEventListener('input', () => { P[key] = +el.value / (scale || 1); $(out).textContent = fmt(P[key]); onParams(); });
  }
  function onParams() { findMatch(); derived(); }
  function setUIFromP() {
    $('inG').value = P.g; $('oG').textContent = fmtG(); $('inO2').value = P.o2; $('oO2').textContent = P.o2 + ' %'; $('inP').value = P.p; $('oP').textContent = P.p.toFixed(2) + ' atm';
    $('inV').value = P.v; $('oV').textContent = P.v + ' cm/s'; $('inFuel').value = P.fuel; $('inD').value = P.dil; $('oD').textContent = Math.round(P.dil) + ' %'; $('inF').value = P.f; $('oF').textContent = P.f.toFixed(1) + ' mg/s';
    document.querySelectorAll('.chip-btn[data-g]').forEach(b => b.classList.toggle('active', Math.abs(+b.dataset.g - P.g) < 0.005));
    document.querySelectorAll('.chip-btn.o2').forEach(b => b.classList.toggle('active', Math.abs(+b.dataset.o2 - P.o2) < 0.25));
  }
  function reset(keepBurn) {
    smoke.length = 0; agent.length = 0;
    Object.assign(S, { burning: false, t: S.t, tb: 0, intensity: 0, sup: 0, suppressing: false, alarm: false, detT: null, obs: 0, Ts: 295, Tt: 295, co2: 420, co: 0, o2l: P.o2, q: 0, dp: 0, reason: '', burnProg: 0, burn: 0, co2g: 420, cog: 0, o2c: 0, hitS: 0 });
    SENS.forEach(s => S.hist[s.id] = []);
  }
  function ignite() { if (S.burning) return; reset(); S.burning = true; onParams(); }

  const Sim = {
    P, S,
    set(o) { Object.assign(P, o); onParams(); setUIFromP(); },
    loadFlameRow(r) {
      const f = r.mfuel != null ? clamp(r.mfuel, 0.3, 2.6) : P.f;
      Sim.set({ o2: clamp(Math.round(r.xo2i * 200) / 2, 18, 40), p: clamp(r.pm || 1, 0.7, 1.3), fuel: r.fuel, dil: clamp(Math.round((1 - (r.xfuel || 1)) * 100), 0, 90), f: Math.round(f * 10) / 10 });
      reset(); S.burning = true;
      document.getElementById('simulador').scrollIntoView({ behavior: 'smooth' });
    },
    ignite, reset
  };
  window.Sim = Sim;

  function init() {
    buildSensors(); onParams(); setUIFromP();
    bind('inG', 'oG', v => (v < 0.005 ? '0 g' : v.toFixed(2) + ' g'), 'g');
    bind('inO2', 'oO2', v => v + ' %', 'o2'); bind('inP', 'oP', v => v.toFixed(2) + ' atm', 'p');
    bind('inV', 'oV', v => v + ' cm/s', 'v'); bind('inD', 'oD', v => v + ' %', 'dil'); bind('inF', 'oF', v => v.toFixed(1) + ' mg/s', 'f');
    $('inFuel').addEventListener('change', e => { P.fuel = e.target.value; onParams(); });
    document.querySelectorAll('.chip-btn[data-g]').forEach(b => b.addEventListener('click', () => Sim.set({ g: +b.dataset.g })));
    document.querySelectorAll('.chip-btn.o2').forEach(b => b.addEventListener('click', () => Sim.set({ o2: +b.dataset.o2 })));
    $('btnIgnite').addEventListener('click', ignite);
    $('btnSuppress').addEventListener('click', () => { if (S.burning) S.suppressing = true; });
    $('btnReset').addEventListener('click', () => reset());
    const sp = document.createElement('button'); sp.className = 'chip'; sp.style.cursor = 'pointer'; sp.textContent = '⏩ 1×';
    sp.addEventListener('click', () => { S.speed = S.speed === 1 ? 3 : S.speed === 3 ? 6 : 1; sp.textContent = '⏩ ' + S.speed + '×'; });
    $('hudG').parentNode.appendChild(sp);
    new IntersectionObserver(e => visible = e[0].isIntersecting, { threshold: 0.05 }).observe(cv);
    requestAnimationFrame(frame);
  }
  init();
})();
