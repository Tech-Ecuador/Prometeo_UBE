/* Prometeo_UBE · Mini juego 3D «Vuelo entre llamas»
   Un astronauta flota en microgravedad por el túnel de una estación. Las llamas (metano, etano, propano,
   alcohol, fuego eléctrico, acetileno) vienen de frente y cada «mes» de misión la velocidad sube.
   Se ganan puntos recogiendo tanques de O₂, CO₂, H₂O, N₂ y CO. Perspectiva 3D real (proyección) sobre canvas 2D,
   sin librerías externas. Juego educativo y simplificado. */
(function () {
  'use strict';
  const cv = document.getElementById('g3Cv'); if (!cv) return;
  const $ = id => document.getElementById(id);
  const W = 900, H = 560, TAU = Math.PI * 2;
  const SC = (window.devicePixelRatio || 1) > 1 ? 2 : 1;
  cv.width = W * SC; cv.height = H * SC;
  const ctx = cv.getContext('2d'); ctx.scale(SC, SC);
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const pick = a => a[(Math.random() * a.length) | 0];
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const FONT = "'Space Grotesk', system-ui, sans-serif", MONO = "'JetBrains Mono', ui-monospace, monospace", DISP = "'Unbounded', 'Space Grotesk', sans-serif";

  /* ---------- geometría 3D ---------- */
  // Cámara en z = 0 mirando hacia +z. x: derecha, y: arriba, z: profundidad.
  const CX = W / 2, CY = 250, F = 540, ZN = 1.0, ZF = 80, ZP = 4.4;   // centro, focal, plano cercano, lejano, plano del jugador
  const TW = 4.4, TH = 2.8, BX = 3.6, BY = 2.2, PR = 0.42, RING = 6;   // semiancho/alto del túnel, límites del jugador, radio, separación de anillos
  const BG = [3, 4, 11];
  const cam = { x: 0, y: 0 };
  function proj(x, y, z) { const s = F / z; return { x: CX + (x - cam.x) * s, y: CY - (y - cam.y) * s, s }; }
  const fogc = (c, z) => { const t = Math.pow(clamp((z - ZN) / (ZF - ZN), 0, 1), 0.8), m = mixc(c, BG, t); return `rgb(${m[0] | 0},${m[1] | 0},${m[2] | 0})`; };

  /* ---------- datos del juego ---------- */
  const TANKS = {
    o2: { f: 'O₂', name: 'Oxígeno', col: [90, 200, 255], pts: 50, w: 30, desc: '+30 % de oxígeno para respirar.' },
    co2: { f: 'CO₂', name: 'Dióxido de carbono', col: [200, 210, 225], pts: 80, w: 22, desc: 'Escudo supresor 5 s: apaga las llamas que toques.' },
    h2o: { f: 'H₂O', name: 'Agua', col: [70, 130, 255], pts: 60, w: 20, desc: '+20 % de integridad (refrigera y repara).' },
    n2: { f: 'N₂', name: 'Nitrógeno', col: [110, 230, 150], pts: 70, w: 14, desc: 'Gas inerte: el tiempo se ralentiza 4 s.' },
    co: { f: 'CO', name: 'Monóxido de carbono', col: [255, 110, 70], pts: 150, w: 14, desc: '¡Tóxico! Da 150 pts, pero quita 15 % de oxígeno.' }
  };
  const FL = {
    metano: { name: 'Metano', f: 'CH₄', col: [90, 170, 255], r: 0.55, mul: 1.15, dmg: 20, from: 1, note: 'Llama azul, pequeña y rápida.' },
    propano: { name: 'Propano', f: 'C₃H₈', col: [255, 150, 40], r: 0.9, mul: 0.95, dmg: 25, from: 1, note: 'Grande, con hollín: la más voluminosa.' },
    etano: { name: 'Etano', f: 'C₂H₆', col: [170, 140, 255], r: 0.62, mul: 1.05, dmg: 20, from: 2, sway: 1.3, note: 'Serpentea de lado a lado.' },
    alcohol: { name: 'Alcohol', f: 'C₂H₅OH', col: [190, 225, 255], r: 0.7, mul: 1.0, dmg: 22, from: 3, ghost: true, note: 'Casi invisible: ¡solo se ve un tenue resplandor!' },
    electrico: { name: 'Fuego eléctrico', f: '⚡', col: [255, 235, 110], r: 0.55, mul: 1.2, dmg: 25, from: 4, zig: true, note: 'Zigzag impredecible con chispas.' },
    acetileno: { name: 'Acetileno', f: 'C₂H₂', col: [210, 245, 255], r: 0.5, mul: 1.45, dmg: 30, from: 6, note: 'Pequeña, muy caliente y veloz.' }
  };
  const FACTS = [
    'En microgravedad las llamas son esféricas: sin flotabilidad, nada las estira hacia arriba.',
    'El CO₂ desplaza el oxígeno alrededor de la llama; por eso es un agente supresor (experimento FLEX).',
    'El alcohol arde casi sin color: en el espacio también hay llamas que no se ven a simple vista.',
    'Nunca se usa agua sobre tableros energizados: provoca cortocircuitos.',
    'El CO es un gas tóxico que nace de la combustión incompleta; los sensores de a bordo lo vigilan.',
    'Más oxígeno hace todo más inflamable: Apolo 1 (1967) ardió en una cabina de oxígeno puro.',
    'El N₂ es inerte: diluye el oxígeno y frena la combustión.',
    'En microgravedad el humo no sube: se queda cerca de la llama y el detector tarda en sonar.',
    'El acetileno alcanza temperaturas altísimas; es el combustible de los sopletes.',
    'Mir (1997): una falla del generador de oxígeno provocó un incendio a bordo.',
    'Hoy no hay datos de gravedad parcial (Luna, Marte): es la mayor brecha de la investigación.',
    'Los extintores de niebla fina nacieron para la ISS y hoy protegen edificios y museos.'
  ];
  const MONTH_LEN = 22, BASE_V = 13;
  const smul = m => Math.min(3, 1 + 0.16 * (m - 1));

  const G = { state: 'menu', paused: false, mute: false, t: 0, tz: 0, v: 8, month: 1, monthT: 0, score: 0, best: 0, o2: 100, hp: 100, inv: 0, shield: 0, slow: 0, dashT: 0, dashCd: 0,
    combo: 0, comboT: 0, tanks: 0, near: 0, objs: [], fx: [], floats: [], banner: null, spawnT: 1, tankT: 1.2, thr: 0, shake: 0, flash: 0, fcol: [255, 60, 60], px: 0, py: 0, vx: 0, vy: 0, tilt: 0, cause: '' };
  try { G.best = +localStorage.getItem('prometeoGame3dBest') || 0; } catch (e) { }

  /* ---------- sonido ---------- */
  let AC = null;
  function initAudio() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { } }
  function tone(f, d = 0.12, type = 'sine', v = 0.05, to = f, delay = 0) {
    if (G.mute || !AC) return; try {
      const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
    } catch (e) { }
  }

  /* ---------- entrada ---------- */
  const keys = {}, ptr = { x: W / 2, y: H / 2, active: false };
  let visible = true;
  const canvasPos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  cv.addEventListener('pointerdown', e => {
    initAudio(); if (G.state !== 'play') return; const p = canvasPos(e); ptr.x = p.x; ptr.y = p.y; ptr.active = true;
    try { cv.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault();
  });
  cv.addEventListener('pointermove', e => { const p = canvasPos(e); ptr.x = p.x; ptr.y = p.y; if (e.pointerType === 'mouse' || ptr.active) ptr.active = true; });
  const release = e => { if (e.pointerType !== 'mouse') ptr.active = false; };
  cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') ptr.active = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test((e.target.tagName || ''))) return;
    const k = e.key.toLowerCase();
    if (G.state === 'play' && visible && [' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (G.state !== 'play' || !visible) return;
    initAudio(); keys[k] = true;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) ptr.active = false;
    if (k === ' ') dash(); else if (k === 'p' || k === 'escape') togglePause(); else if (k === 'm') toggleSound();
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { Object.keys(keys).forEach(k => keys[k] = false); ptr.active = false; if (G.state === 'play') setPause(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') setPause(true); });

  function setPause(p) { if (G.state !== 'play') return; G.paused = p; uiSync(); }
  function togglePause() { setPause(!G.paused); }
  function toggleSound() { G.mute = !G.mute; uiSync(); }
  function uiSync() {
    const bp = $('g3Pause'), bs = $('g3Sound');
    if (bp) bp.textContent = G.paused ? '▶ Reanudar (P)' : '⏸ Pausa (P)';
    if (bs) bs.textContent = G.mute ? '🔇 Sonido: OFF (M)' : '🔊 Sonido: ON (M)';
  }
  $('g3Pause').addEventListener('click', () => { initAudio(); togglePause(); });
  $('g3Sound').addEventListener('click', () => { initAudio(); toggleSound(); });
  $('g3Play').addEventListener('click', () => { initAudio(); start(); });
  $('g3Again').addEventListener('click', () => { initAudio(); start(); });

  /* guías (tanques y llamas) */
  $('g3Tanks').innerHTML = Object.keys(TANKS).map(k => { const t = TANKS[k]; return `<div class="g3-item"><span class="tag" style="background:rgb(${t.col})">${t.f}</span><div><b>${t.name}</b><small>${t.desc}</small></div></div>`; }).join('');
  $('g3FlameGuide').innerHTML = Object.keys(FL).map(k => {
    const t = FL[k];
    return `<article class="fg"><i class="dot" style="background:rgb(${t.col});box-shadow:0 0 14px rgb(${t.col})"></i><div><h4>${t.name} <small style="color:var(--mut)">${t.f}</small></h4><p>${t.note}</p><span class="pill hot">Aparece en el mes ${t.from}</span> <span class="pill">Daño ${t.dmg} %</span></div></article>`;
  }).join('');

  /* ---------- flujo ---------- */
  function start() {
    Object.assign(G, { state: 'play', paused: false, t: 0, tz: 0, month: 1, monthT: 0, score: 0, o2: 100, hp: 100, inv: 0, shield: 0, slow: 0, dashT: 0, dashCd: 0, combo: 0, comboT: 0, tanks: 0, near: 0,
      objs: [], fx: [], floats: [], spawnT: 1.2, tankT: 1, shake: 0, flash: 0, px: 0, py: 0, vx: 0, vy: 0, tilt: 0, cause: '', banner: null });
    $('g3Start').classList.add('hidden'); $('g3Over').classList.add('hidden');
    showBanner('Mes 1 · Despegue', 'Esquiva las llamas y recoge tanques', FACTS[0]); uiSync();
  }
  function showBanner(title, sub, fact) { G.banner = { title, sub, fact, t: 3.6, max: 3.6 }; }
  function onMonth() {
    const m = G.month, nu = Object.keys(FL).filter(k => FL[k].from === m).map(k => FL[k].name);
    const bonus = 100 * m; G.score += bonus;
    showBanner(`Mes ${m} · ¡más rápido!`, (nu.length ? `Nueva llama: ${nu.join(', ')} · ` : '') + `Velocidad ×${smul(m).toFixed(2)} · bonificación +${bonus}`, FACTS[(m - 1) % FACTS.length]);
    tone(330, 0.15, 'triangle', 0.05, 440); tone(440, 0.2, 'triangle', 0.05, 660, 0.15);
  }
  function gameOver(cause) {
    G.state = 'over'; G.cause = cause; const sc = Math.floor(G.score);
    if (sc > G.best) { G.best = sc; try { localStorage.setItem('prometeoGame3dBest', G.best); } catch (e) { } }
    $('g3Score').textContent = sc; $('g3Best').textContent = G.best; $('g3Month').textContent = G.month; $('g3Tanks2').textContent = G.tanks; $('g3Cause').textContent = cause;
    $('g3Over').classList.remove('hidden'); tone(300, 0.5, 'sawtooth', 0.06, 70); ptr.active = false; Object.keys(keys).forEach(k => keys[k] = false); uiSync();
  }

  /* ---------- generación ---------- */
  function unlocked(m) { return Object.keys(FL).filter(k => FL[k].from <= m); }
  function mkFlame(t, x, y, z) { const T = FL[t]; return { k: 'f', t, x, y, bx: x, by: y, z, pz: z, r: T.r * rnd(0.92, 1.08), ph: rnd(0, 10), done: false }; }
  function spawnRow(m) {
    const types = unlocked(m), pool = [];
    types.forEach(t => { const w = FL[t].from === m ? 2 : 1; for (let i = 0; i < w; i++) pool.push(t); });
    const n = 1 + (Math.random() < 0.5 + 0.03 * m ? 1 : 0) + (m >= 5 && Math.random() < 0.4 ? 1 : 0), placed = [];
    for (let i = 0; i < n; i++) {
      const t = pick(pool), r = FL[t].r;
      for (let a = 0; a < 25; a++) {
        const x = rnd(-BX - 0.3, BX + 0.3), y = rnd(-BY, BY);
        if (placed.some(q => Math.hypot(q.x - x, q.y - y) < q.r + r + 1.3)) continue;
        const o = mkFlame(t, x, y, ZF + rnd(0, 2)); placed.push(o); G.objs.push(o); break;
      }
    }
  }
  function pickTank() {
    const w = {}; Object.keys(TANKS).forEach(k => w[k] = TANKS[k].w);
    if (G.o2 < 40) w.o2 *= 2.4; if (G.hp < 45) w.h2o *= 2; if (G.o2 < 25) w.co *= 0.4;
    let s = 0; Object.keys(w).forEach(k => s += w[k]); let r = Math.random() * s;
    for (const k of Object.keys(w)) { r -= w[k]; if (r <= 0) return k; }
    return 'o2';
  }
  function spawnTank() {
    const t = pickTank();
    for (let a = 0; a < 15; a++) {
      const x = rnd(-BX, BX), y = rnd(-BY, BY);
      if (G.objs.some(o => o.k === 'f' && o.z > ZF - 10 && Math.hypot(o.x - x, o.y - y) < o.r + 1.6)) continue;
      G.objs.push({ k: 't', t, x, y, z: ZF, pz: ZF, r: 0.5, sp: rnd(0, 6), done: false }); return;
    }
  }
  function burst(x, y, z, col, n, sp, life, size) {
    for (let i = 0; i < n && G.fx.length < 450; i++) {
      const a = rnd(0, TAU), v = rnd(0.3, 1) * sp;
      G.fx.push({ k: 'x', x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rnd(-1, 1) * sp * 0.5, t: 0, max: rnd(0.5, 1) * life, size, col, add: true, a: 0.7 });
    }
  }
  function floatW(x, y, z, txt, col, size) { const p = proj(x, y, z); G.floats.push({ x: p.x, y: p.y, txt, col, t: 1.2, size: size || 15 }); }

  /* ---------- eventos del jugador ---------- */
  function collect(o) {
    const T = TANKS[o.t]; G.tanks++;
    G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 4;
    const pts = Math.round(T.pts * (1 + 0.2 * Math.min(G.combo - 1, 8))); G.score += pts;
    let msg = `+${pts} ${T.f}` + (G.combo > 1 ? `  ×${G.combo}` : '');
    if (o.t === 'o2') G.o2 = Math.min(100, G.o2 + 30);
    else if (o.t === 'co2') { G.shield = 5; floatW(G.px, G.py + 0.9, ZP, 'ESCUDO CO₂', [190, 245, 255], 14); }
    else if (o.t === 'h2o') G.hp = Math.min(100, G.hp + 20);
    else if (o.t === 'n2') { G.slow = 4; floatW(G.px, G.py + 0.9, ZP, 'TIEMPO LENTO', [130, 255, 170], 14); }
    else if (o.t === 'co') { G.o2 = Math.max(0, G.o2 - 15); G.flash = 0.3; G.fcol = [255, 130, 60]; floatW(G.px, G.py + 0.9, ZP, '¡TÓXICO! −15 % O₂', [255, 130, 90], 14); }
    floatW(G.px, G.py + 0.3, ZP, msg, T.col, 16);
    burst(o.x, o.y, ZP, T.col, 16, 3.2, 0.7, 0.12);
    tone(520, 0.08, 'triangle', 0.05, 780); tone(780, 0.12, 'triangle', 0.05, 1170, 0.07);
    o.dead = true;
  }
  function hurt(o) {
    const T = FL[o.t]; G.hp -= T.dmg; G.inv = 1.5; G.shake = 14; G.flash = 0.35; G.fcol = [255, 60, 60]; G.combo = 0; G.comboT = 0;
    floatW(G.px, G.py + 0.6, ZP, `¡Quemadura! −${T.dmg} %`, [255, 120, 100], 16); burst(G.px, G.py, ZP, T.col, 22, 4, 0.8, 0.14);
    tone(160, 0.3, 'sawtooth', 0.07, 70);
    if (G.hp <= 0) { G.hp = 0; gameOver('Integridad del traje agotada'); }
  }
  function resolve(o) {
    o.done = true;
    const d = Math.hypot(o.x - G.px, o.y - G.py);
    if (o.k === 't') { if (d < o.r + PR + 0.15) collect(o); return; }
    if (d < o.r * 0.85 + PR) {
      if (G.shield > 0) {
        const pts = 40 + 10 * G.month; G.score += pts; floatW(o.x, o.y, ZP, `¡Apagada! +${pts}`, [190, 245, 255], 15);
        burst(o.x, o.y, o.z, [210, 235, 255], 20, 4, 0.9, 0.16); tone(700, 0.1, 'triangle', 0.05, 1200); o.dead = true;
      } else if (G.dashT > 0) {
        G.score += 25; floatW(o.x, o.y, ZP, '¡Esquivada! +25', [255, 230, 140], 14);
      } else if (G.inv <= 0) hurt(o);
    } else if (d < o.r + PR + 0.55) {
      G.near++; G.score += 15; floatW(o.x, o.y, ZP, 'Roce +15', [255, 210, 110], 13);
    }
  }
  function dash() {
    if (G.state !== 'play' || G.paused || G.dashCd > 0) return;
    let dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), dy = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
    if (!dx && !dy) { dx = G.vx; dy = G.vy; }
    const l = Math.hypot(dx, dy); if (l < 0.3) return;
    G.vx = dx / l * 19; G.vy = dy / l * 19; G.dashT = 0.25; G.dashCd = 2.6; tone(300, 0.15, 'square', 0.04, 900);
    burst(G.px, G.py, ZP, [160, 220, 255], 14, 3, 0.5, 0.1);
  }

  /* ---------- actualización ---------- */
  const SL = Array.from({ length: 46 }, () => ({ a: rnd(0, TAU), r: rnd(30, 600), sp: rnd(0.6, 1.4) }));
  function worldStep(dtw, v, collide, month) {
    G.tz += v * dtw;
    G.spawnT -= dtw; if (G.spawnT <= 0) { spawnRow(month); G.spawnT = clamp(1.05 - 0.045 * (month - 1), 0.55, 1.05) * rnd(0.9, 1.15); }
    G.tankT -= dtw; if (G.tankT <= 0) { spawnTank(); G.tankT = rnd(1.1, 2.2); }
    for (let i = G.objs.length - 1; i >= 0; i--) {
      const o = G.objs[i]; o.pz = o.z;
      if (o.k === 'f') {
        const T = FL[o.t]; o.z -= v * T.mul * dtw; o.ph += dtw * (T.zig ? 5 : 2.2);
        if (T.sway) o.x = clamp(o.bx + Math.sin(o.ph) * T.sway, -BX - 0.4, BX + 0.4);
        if (T.zig) { const tri = Math.abs(((o.ph * 0.6) % 2) - 1) * 2 - 1; o.x = clamp(o.bx + tri * 1.1, -BX - 0.4, BX + 0.4); o.y = clamp(o.by + Math.sin(o.ph * 1.7) * 0.5, -BY, BY); }
      } else { o.z -= v * dtw; o.sp += dtw * 2.5; }
      if (collide && !o.done && o.z <= ZP + 0.55 && o.pz >= ZP - 0.55) resolve(o);
      if (o.dead || o.z < ZN + 0.2) G.objs.splice(i, 1);
    }
    for (let i = G.fx.length - 1; i >= 0; i--) {
      const p = G.fx[i]; p.t += dtw; p.x += p.vx * dtw; p.y += p.vy * dtw; p.z += p.vz * dtw - v * dtw * 0.6;
      p.vx *= Math.exp(-1.2 * dtw); p.vy *= Math.exp(-1.2 * dtw);
      if (p.t > p.max || p.z < ZN) G.fx.splice(i, 1);
    }
  }
  function camFollow(dt) { const k = Math.min(1, dt * 6); cam.x += (G.px * 0.4 - cam.x) * k; cam.y += (G.py * 0.4 - cam.y) * k; }
  function update(dt) {
    G.t += dt;
    const vv = G.state === 'play' ? G.v : 8;
    SL.forEach(l => { l.r += dt * (120 + vv * 16) * l.sp; if (l.r > 640) { l.r = rnd(20, 100); l.a = rnd(0, TAU); } });
    if (G.state === 'menu') {
      G.v = 8; worldStep(dt, 8, false, 3); G.px = Math.sin(G.t * 0.7) * 1.6; G.py = Math.cos(G.t * 0.9) * 0.8; G.tilt = Math.sin(G.t * 0.7) * 0.12; camFollow(dt); return;
    }
    if (G.state !== 'play' || G.paused) return;
    const ts = G.slow > 0 ? 0.45 : 1, dtw = dt * ts;
    G.monthT += dt; if (G.monthT >= MONTH_LEN) { G.monthT -= MONTH_LEN; G.month++; onMonth(); }
    const a = smul(G.month), b = smul(G.month + 1); G.v = BASE_V * (a + (b - a) * (G.monthT / MONTH_LEN));
    G.inv = Math.max(0, G.inv - dt); G.shield = Math.max(0, G.shield - dt); G.slow = Math.max(0, G.slow - dt); G.dashT = Math.max(0, G.dashT - dt); G.dashCd = Math.max(0, G.dashCd - dt);
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    // movimiento (microgravedad: con inercia)
    const MAXV = 8.5; let dvx = 0, dvy = 0;
    const kx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), ky = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
    if (kx || ky) { const l = Math.hypot(kx, ky); dvx = kx / l * MAXV; dvy = ky / l * MAXV; }
    else if (ptr.active) {
      const s = F / ZP * 0.6, tx = clamp((ptr.x - CX) / s, -BX, BX), ty = clamp((CY - ptr.y) / s, -BY, BY);
      dvx = (tx - G.px) * 7; dvy = (ty - G.py) * 7; const l = Math.hypot(dvx, dvy); if (l > MAXV) { dvx *= MAXV / l; dvy *= MAXV / l; }
    }
    if (G.dashT <= 0) { const k = Math.min(1, dt * 7); G.vx += (dvx - G.vx) * k; G.vy += (dvy - G.vy) * k; }
    G.px += G.vx * dt; G.py += G.vy * dt;
    if (G.px < -BX) { G.px = -BX; G.vx = Math.max(0, G.vx); } if (G.px > BX) { G.px = BX; G.vx = Math.min(0, G.vx); }
    if (G.py < -BY) { G.py = -BY; G.vy = Math.max(0, G.vy); } if (G.py > BY) { G.py = BY; G.vy = Math.min(0, G.vy); }
    G.tilt += (clamp(G.vx * 0.045, -0.4, 0.4) - G.tilt) * Math.min(1, dt * 8);
    camFollow(dt);
    // oxígeno y puntos por distancia
    G.o2 -= 1.7 * (1 + 0.05 * (G.month - 1)) * dt; G.score += G.v * dtw * 0.4;
    // mundo
    worldStep(dtw, G.v, true, G.month);
    if (G.state !== 'play') return;
    if (G.o2 <= 0) { G.o2 = 0; gameOver('Te quedaste sin oxígeno'); return; }
    // propulsores
    G.thr -= dt;
    if (G.thr <= 0 && G.fx.length < 430) {
      G.thr = 0.03;
      [-0.17, 0.17].forEach(n => G.fx.push({ k: 'x', x: G.px + n * 0.9 + rnd(-0.04, 0.04), y: G.py - 0.5, z: ZP - 0.2, vx: -G.vx * 0.1 + rnd(-0.2, 0.2), vy: -G.vy * 0.1 + rnd(-0.2, 0.2) - 0.2, vz: -rnd(1, 3), t: 0, max: rnd(0.3, 0.55), size: rnd(0.07, 0.14), col: [120, 210, 255], add: true, a: 0.7 }));
      if (G.dashT > 0) burst(G.px, G.py, ZP, [160, 220, 255], 3, 1.5, 0.4, 0.1);
    }
    // textos, banner, efectos
    for (let i = G.floats.length - 1; i >= 0; i--) { const f = G.floats[i]; f.t -= dt; f.y -= 34 * dt; if (f.t <= 0) G.floats.splice(i, 1); }
    if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
    G.shake = Math.max(0, G.shake - 30 * dt); G.flash = Math.max(0, G.flash - dt);
  }

  /* ---------- dibujo ---------- */
  function poly(pts, fill) { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill(); }
  function drawTunnel() {
    ctx.fillStyle = '#03040b'; ctx.fillRect(0, 0, W, H);
    const vp = proj(0, 0, ZF), gl = ctx.createRadialGradient(vp.x, vp.y, 2, vp.x, vp.y, 170);
    gl.addColorStop(0, 'rgba(120,170,255,.55)'); gl.addColorStop(1, 'rgba(120,170,255,0)'); ctx.fillStyle = gl; ctx.fillRect(vp.x - 175, vp.y - 175, 350, 350);
    const off = (RING - (G.tz % RING)) % RING, kmax = Math.ceil((ZF - ZN - off) / RING) + 1, n0 = Math.ceil(G.tz / RING);
    for (let k = kmax; k >= -1; k--) {
      const zn = off + ZN + k * RING, zf = zn + RING, z1 = Math.max(ZN, zn); if (zf <= ZN + 0.01 || zn >= ZF + RING) continue;
      const n = n0 + k, sh = (n & 1) ? 1 : 0.8, zc = (z1 + zf) / 2, z2 = zf;
      const a = proj(-TW, -TH, z1), b = proj(TW, -TH, z1), c = proj(TW, TH, z1), d = proj(-TW, TH, z1), e = proj(-TW, -TH, z2), f = proj(TW, -TH, z2), g = proj(TW, TH, z2), h = proj(-TW, TH, z2);
      poly([a, b, f, e], fogc([26 * sh, 34 * sh, 66 * sh], zc));       // suelo
      poly([d, c, g, h], fogc([40 * sh, 50 * sh, 92 * sh], zc));       // techo
      poly([a, d, h, e], fogc([32 * sh, 42 * sh, 82 * sh], zc));       // pared izquierda
      poly([b, c, g, f], fogc([32 * sh, 42 * sh, 82 * sh], zc));       // pared derecha
      // franjas de advertencia en el suelo
      const wc = (n & 1) ? [255, 200, 40] : [34, 34, 38];
      poly([proj(-TW, -TH, z1), proj(-TW + 0.45, -TH, z1), proj(-TW + 0.45, -TH, z2), proj(-TW, -TH, z2)], fogc(wc, zc));
      poly([proj(TW - 0.45, -TH, z1), proj(TW, -TH, z1), proj(TW, -TH, z2), proj(TW - 0.45, -TH, z2)], fogc(wc, zc));
      // paneles luminosos
      const m = ((n % 3) + 3) % 3, za = z1 + (z2 - z1) * 0.2, zb = z2 - (z2 - z1) * 0.2;
      if (m === 0) poly([proj(-TW, -0.7, za), proj(-TW, 0.7, za), proj(-TW, 0.7, zb), proj(-TW, -0.7, zb)], fogc([255, 190, 90], zc + 6));
      else if (m === 1) poly([proj(TW, -0.7, za), proj(TW, 0.7, za), proj(TW, 0.7, zb), proj(TW, -0.7, zb)], fogc([80, 220, 255], zc + 6));
      else poly([proj(-1.2, TH, za), proj(1.2, TH, za), proj(1.2, TH, zb), proj(-1.2, TH, zb)], fogc([200, 220, 255], zc + 6));
      // anillo estructural
      ctx.strokeStyle = fogc(n % 4 === 0 ? [255, 122, 26] : [110, 150, 255], z2); ctx.lineWidth = clamp(proj(0, 0, z2).s * 0.03, 0.6, 5);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(f.x, f.y); ctx.lineTo(g.x, g.y); ctx.lineTo(h.x, h.y); ctx.closePath(); ctx.stroke();
    }
  }
  function drawSpeedLines() {
    const k = clamp((G.v - 12) / 30, 0, 1); if (k <= 0.02) return;
    const vp = proj(0, 0, ZF); ctx.save(); ctx.lineCap = 'round';
    SL.forEach(l => {
      const c = Math.cos(l.a), s = Math.sin(l.a), len = 10 + l.r * 0.2 * k;
      ctx.strokeStyle = `rgba(200,225,255,${(0.05 + 0.22 * k * (l.r / 640)).toFixed(3)})`; ctx.lineWidth = 1 + l.r / 320;
      ctx.beginPath(); ctx.moveTo(vp.x + c * l.r, vp.y + s * l.r); ctx.lineTo(vp.x + c * (l.r + len), vp.y + s * (l.r + len)); ctx.stroke();
    }); ctx.restore();
  }
  function drawFlame(o) {
    if (o.z < ZN + 0.15) return; const fade = clamp((ZF - o.z) / 16, 0, 1); if (fade <= 0) return;
    const T = FL[o.t], p = proj(o.x, o.y, o.z), R = o.r * p.s, col = T.col, vis = (T.ghost ? 0.22 : 1) * fade, t = G.t, sp = proj(o.x, -TH, o.z);
    ctx.save();
    ctx.globalAlpha = 0.4 * fade; ctx.fillStyle = rgba(col, 0.55); ctx.beginPath(); ctx.ellipse(sp.x, sp.y, R * 1.05, R * 0.2, 0, 0, TAU); ctx.fill();   // sombra en el suelo (da profundidad)
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
    for (let k = 4; k >= 1; k--) { const q = proj(o.x, o.y, o.z + k * 0.8); ctx.fillStyle = rgba(col, 0.16 * vis * (1 - k / 5)); ctx.beginPath(); ctx.arc(q.x, q.y, o.r * q.s * (1 - k * 0.14), 0, TAU); ctx.fill(); }   // estela
    const fl = 1 + 0.07 * Math.sin(t * 13 + o.ph) + 0.04 * Math.sin(t * 29 + o.ph * 2);
    const gl = ctx.createRadialGradient(p.x, p.y, R * 0.3, p.x, p.y, R * 2.6); gl.addColorStop(0, rgba(col, 0.42 * vis)); gl.addColorStop(1, rgba(col, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y, R * 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(col, 0.55 * vis); ctx.beginPath();
    for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU, r = R * fl * (1 + 0.13 * Math.sin(a * 7 + t * 9 + o.ph)); i ? ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r) : ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); }
    ctx.fill();
    ctx.fillStyle = rgba(mixc(col, [255, 255, 255], 0.35), 0.7 * vis); ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.62 * fl, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.85 * vis})`; ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.3 * fl, 0, TAU); ctx.fill();
    if (o.t === 'electrico') {
      ctx.strokeStyle = `rgba(255,255,200,${0.9 * fade})`; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { const a = rnd(0, TAU), r1 = R * 0.9, r2 = R * rnd(1.4, 2.2); ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1); ctx.lineTo(p.x + Math.cos(a + 0.25) * (r1 + r2) / 2, p.y + Math.sin(a + 0.25) * (r1 + r2) / 2); ctx.lineTo(p.x + Math.cos(a) * r2, p.y + Math.sin(a) * r2); ctx.stroke(); }
    }
    if (o.t === 'acetileno') { ctx.strokeStyle = `rgba(230,250,255,${0.8 * fade})`; ctx.lineWidth = 1.2; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 3; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * R * 0.9, p.y + Math.sin(a) * R * 0.9); ctx.lineTo(p.x + Math.cos(a) * R * 1.8, p.y + Math.sin(a) * R * 1.8); ctx.stroke(); } }
    ctx.globalCompositeOperation = 'source-over';
    if (o.t === 'alcohol') { ctx.strokeStyle = rgba(col, 0.35 * fade); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, R * (1.1 + 0.08 * Math.sin(t * 6 + o.ph)), 0, TAU); ctx.stroke(); }
    if (o.t === 'propano') { for (let k = 1; k <= 3; k++) { const q = proj(o.x + Math.sin(t * 3 + k + o.ph) * 0.25, o.y + Math.cos(t * 2 + k) * 0.25, o.z + 1.2 * k); ctx.fillStyle = `rgba(90,90,100,${0.25 * fade / k})`; ctx.beginPath(); ctx.arc(q.x, q.y, o.r * q.s * 0.55, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  function drawTank(o) {
    if (o.z < ZN + 0.15) return; const fade = clamp((ZF - o.z) / 16, 0, 1); if (fade <= 0) return;
    const T = TANKS[o.t], p = proj(o.x, o.y, o.z), s = p.s, w = 0.34 * s, bh = 1.1 * s, sp = proj(o.x, -TH, o.z), col = T.col;
    ctx.save(); ctx.globalAlpha = 0.35 * fade; ctx.fillStyle = rgba(col, 0.5); ctx.beginPath(); ctx.ellipse(sp.x, sp.y, w * 1.6, w * 0.35, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = fade;
    ctx.globalCompositeOperation = 'lighter'; const au = ctx.createRadialGradient(p.x, p.y, w * 0.4, p.x, p.y, w * 3.2); au.addColorStop(0, rgba(col, 0.35 + 0.1 * Math.sin(G.t * 5 + o.sp))); au.addColorStop(1, rgba(col, 0)); ctx.fillStyle = au; ctx.beginPath(); ctx.arc(p.x, p.y, w * 3.2, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.translate(p.x, p.y); ctx.rotate(Math.sin(o.sp) * 0.22);
    const lg = ctx.createLinearGradient(-w, 0, w, 0); lg.addColorStop(0, rgba(mixc(col, [255, 255, 255], 0.35), 1)); lg.addColorStop(0.5, rgba(col, 1)); lg.addColorStop(1, rgba(mixc(col, [0, 0, 0], 0.45), 1));
    rr(ctx, -w * 0.35, -bh / 2 - w * 0.5, w * 0.7, w * 0.55, w * 0.15); ctx.fillStyle = '#9aa4c6'; ctx.fill();           // válvula
    ctx.fillStyle = lg; rr(ctx, -w, -bh / 2, w * 2, bh, w * 0.55); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, w * 0.06); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.38)'; rr(ctx, -w * 0.88, -bh * 0.18, w * 1.76, bh * 0.36, w * 0.2); ctx.fill();            // etiqueta
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(7, w * 0.78)}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(T.f, 0, 0);
    if (o.t === 'co') { ctx.fillStyle = '#ffd23a'; ctx.font = `700 ${Math.max(7, w * 0.6)}px ${FONT}`; ctx.fillText('⚠', 0, -bh * 0.33); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(ctx, -w * 0.72, -bh / 2 + w * 0.3, w * 0.22, bh * 0.7, w * 0.1); ctx.fill();       // brillo
    ctx.restore();
  }
  function drawFx(p) {
    if (p.z < ZN) return; const q = proj(p.x, p.y, p.z), k = 1 - p.t / p.max;
    ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over'; ctx.fillStyle = rgba(p.col, (p.a || 0.6) * k); ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.5, p.size * q.s * (0.5 + 0.6 * k)), 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
  }
  function drawAstro() {
    const p = proj(G.px, G.py, ZP), U = p.s * 0.46;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(G.tilt);
    ctx.globalAlpha = (G.inv > 0 && Math.sin(G.t * 32) > 0) ? 0.35 : 1;
    ctx.scale(U, U); ctx.lineWidth = 0.05; ctx.lineJoin = 'round';
    const th = clamp(Math.hypot(G.vx, G.vy) / 8.5, 0, 1.2) + 0.25;
    ctx.globalCompositeOperation = 'lighter';
    [-0.27, 0.27].forEach(x => { const g = ctx.createRadialGradient(x, 0.9, 0, x, 0.9, 0.9 * th + 0.25); g.addColorStop(0, 'rgba(160,230,255,.9)'); g.addColorStop(1, 'rgba(60,140,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, 0.9, 0.9 * th + 0.25, 0, TAU); ctx.fill(); });
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#98a2c4';
    [-0.42, 0.12].forEach(x => { ctx.fillStyle = '#dfe4f2'; rr(ctx, x, 0.4, 0.3, 0.8, 0.12); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#8a94b8'; rr(ctx, x - 0.02, 1.0, 0.34, 0.28, 0.1); ctx.fill(); });   // piernas y botas
    [-1, 1].forEach(sg => { ctx.save(); ctx.translate(sg * 0.82, 0.05); ctx.rotate(sg * 0.35); ctx.fillStyle = '#e7ebf6'; rr(ctx, -0.14, -0.1, 0.28, 0.7, 0.14); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(0, 0.66, 0.17, 0, TAU); ctx.fill(); ctx.restore(); });   // brazos
    ctx.fillStyle = '#eef1f8'; rr(ctx, -0.58, -0.3, 1.16, 1.0, 0.22); ctx.fill(); ctx.stroke();                         // torso
    ctx.fillStyle = '#8f9abf'; rr(ctx, -0.46, -0.26, 0.92, 0.9, 0.14); ctx.fill(); ctx.stroke();                         // mochila
    ctx.fillStyle = '#ff7a1a'; rr(ctx, -0.46, 0.12, 0.92, 0.16, 0.04); ctx.fill();
    ctx.fillStyle = '#3a4260'; rr(ctx, -0.38, 0.6, 0.26, 0.18, 0.05); ctx.fill(); rr(ctx, 0.12, 0.6, 0.26, 0.18, 0.05); ctx.fill();
    ctx.fillStyle = '#f4f6fc'; ctx.beginPath(); ctx.arc(0, -0.72, 0.52, 0, TAU); ctx.fill(); ctx.stroke();               // casco
    ctx.fillStyle = '#e0e5f3'; ctx.beginPath(); ctx.ellipse(0, -0.62, 0.36, 0.3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-0.2, -0.92, 0.1, 0.06, -0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#98a2c4'; ctx.beginPath(); ctx.moveTo(0.3, -1.05); ctx.lineTo(0.42, -1.5); ctx.stroke(); ctx.fillStyle = '#ff5a3c'; ctx.beginPath(); ctx.arc(0.42, -1.5, 0.07, 0, TAU); ctx.fill();
    ctx.restore();
    if (G.shield > 0) {
      const R = U * 1.9, fl = G.shield < 1.2 && Math.sin(G.t * 25) > 0 ? 0.4 : 1; ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = fl;
      const g = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R); g.addColorStop(0, 'rgba(190,245,255,.04)'); g.addColorStop(1, 'rgba(190,245,255,.3)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(190,245,255,.8)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
  }
  function bar(x, y, w, h, v, col, label) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
    if (v > 0) { ctx.fillStyle = col; rr(ctx, x, y, Math.max(h, w * clamp(v, 0, 1)), h, h / 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; rr(ctx, x, y, w, h, h / 2); ctx.stroke();
    if (label) { ctx.fillStyle = '#e9ecf8'; ctx.font = `600 10px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(label, x + 2, y - 4); }
  }
  function wrapText(txt, x, y, maxW, lh) { const words = txt.split(' '); let line = ''; for (const w of words) { const t = line + w + ' '; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w + ' '; y += lh; } else line = t; } ctx.fillText(line, x, y); }
  function drawHUD() {
    ctx.textBaseline = 'alphabetic';
    const hc = G.hp > 60 ? '#3ddc84' : G.hp > 30 ? '#ffcc33' : '#ff4d4d', oc = G.o2 > 40 ? '#3fb6ff' : G.o2 > 20 ? '#ffcc33' : '#ff4d4d';
    bar(18, 28, 210, 12, G.hp / 100, hc, `INTEGRIDAD ${Math.round(G.hp)} %`); bar(18, 60, 210, 12, G.o2 / 100, oc, `OXÍGENO ${Math.round(G.o2)} %`);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = `800 20px ${DISP}`; ctx.fillText(String(Math.floor(G.score)).padStart(6, '0'), W - 18, 36);
    ctx.font = `600 11px ${MONO}`; ctx.fillStyle = '#ffb347'; ctx.fillText(`MES ${G.month} · ×${(G.v / BASE_V).toFixed(2)}`, W - 18, 54); ctx.fillStyle = '#8e95b5'; ctx.fillText(`RÉCORD ${Math.max(G.best, Math.floor(G.score))}`, W - 18, 70);
    bar(W - 168, 78, 150, 5, G.monthT / MONTH_LEN, '#ff7a1a');
    if (G.combo > 1) { ctx.textAlign = 'center'; ctx.fillStyle = '#ffb347'; ctx.font = `800 22px ${DISP}`; ctx.fillText(`COMBO ×${G.combo}`, W / 2, 44); bar(W / 2 - 60, 52, 120, 5, G.comboT / 4, '#ff7a1a'); }
    let cx = 18; const cy = H - 22; ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'left';
    const chip = (txt, col) => { const w = ctx.measureText(txt).width + 18; ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(ctx, cx, cy - 15, w, 22, 11); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = col; ctx.fillText(txt, cx + 9, cy); cx += w + 8; };
    if (G.shield > 0) chip(`ESCUDO CO₂ ${G.shield.toFixed(1)}s`, '#bff5ff'); if (G.slow > 0) chip(`TIEMPO N₂ ${G.slow.toFixed(1)}s`, '#82ffaa');
    ctx.textAlign = 'right'; ctx.fillStyle = G.dashCd > 0 ? '#8e95b5' : '#37f0d2'; ctx.fillText(G.dashCd > 0 ? `IMPULSO ${G.dashCd.toFixed(1)}s` : 'IMPULSO LISTO [Espacio]', W - 18, H - 18);
  }
  function drawBanner() {
    const b = G.banner; if (!b) return;
    ctx.save(); ctx.globalAlpha = Math.min(1, b.t * 3, (b.max - b.t) * 4 + 0.001);
    ctx.fillStyle = 'rgba(5,6,18,.8)'; rr(ctx, W / 2 - 310, 96, 620, 150, 22); ctx.fill(); ctx.strokeStyle = 'rgba(255,122,26,.7)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#ffb347'; ctx.font = `800 24px ${DISP}`; ctx.fillText(b.title, W / 2, 138);
    ctx.fillStyle = '#c9cfe8'; ctx.font = `500 14px ${FONT}`; ctx.fillText(b.sub, W / 2, 166);
    ctx.fillStyle = '#37f0d2'; ctx.font = `600 13px ${FONT}`; wrapText('💡 ' + b.fact, W / 2, 198, 560, 19); ctx.restore();
  }
  function draw() {
    ctx.save();
    if (G.shake > 0) ctx.translate(rnd(-G.shake, G.shake) * 0.5, rnd(-G.shake, G.shake) * 0.5);
    drawTunnel(); drawSpeedLines();
    const L = []; G.objs.forEach(o => L.push([o.z, o])); G.fx.forEach(p => L.push([p.z, p])); L.push([ZP, 'P']); L.sort((a, b) => b[0] - a[0]);
    L.forEach(([, o]) => { if (o === 'P') drawAstro(); else if (o.k === 'f') drawFlame(o); else if (o.k === 't') drawTank(o); else drawFx(o); });
    G.floats.forEach(f => { ctx.globalAlpha = Math.min(1, f.t * 2); ctx.fillStyle = rgba(f.col, 1); ctx.font = `700 ${f.size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(f.txt, f.x, f.y); ctx.globalAlpha = 1; });
    ctx.restore();
    if (G.state === 'menu') return;
    if (G.flash > 0) { ctx.fillStyle = rgba(G.fcol, clamp(G.flash * 1.2, 0, 0.4)); ctx.fillRect(0, 0, W, H); }
    if ((G.hp < 30 || G.o2 < 25) && G.state === 'play') { const a = 0.12 + 0.12 * Math.sin(G.t * 8), g = ctx.createRadialGradient(W / 2, H / 2, 250, W / 2, H / 2, 560); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,30,30,${a * 3})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    drawHUD(); drawBanner();
    if (G.paused) { ctx.fillStyle = 'rgba(3,4,10,.7)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff'; ctx.font = `800 40px ${DISP}`; ctx.fillText('PAUSA', W / 2, H / 2); ctx.font = `500 15px ${FONT}`; ctx.fillStyle = '#c9cfe8'; ctx.fillText('Pulsa P o «Reanudar» para continuar', W / 2, H / 2 + 34); }
  }

  /* ---------- bucle ---------- */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible) return;
    update(dt); draw();
  }
  new IntersectionObserver(e => { visible = e[0].isIntersecting; if (!visible && G.state === 'play') setPause(true); }, { threshold: 0.15 }).observe(cv);
  uiSync(); requestAnimationFrame(frame);
  window.PrometeoGame3D = { G, start };
})();
