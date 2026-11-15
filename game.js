/* Prometeo_UBE · Mini juego «Astro Extintor»
   Un astronauta en microgravedad apaga llamas de metano, etano, propano, alcohol, fuego eléctrico
   (dentro de la nave) y fugas en el casco (fuera de la nave). Juego educativo y simplificado. */
(function () {
  'use strict';
  const cv = document.getElementById('gameCv'); if (!cv) return;
  const $ = id => document.getElementById(id);
  const W = 900, H = 560, TAU = Math.PI * 2;
  const SC = (window.devicePixelRatio || 1) > 1 ? 2 : 1;
  cv.width = W * SC; cv.height = H * SC;
  const ctx = cv.getContext('2d'); ctx.scale(SC, SC);
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const pick = a => a[(Math.random() * a.length) | 0];
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const FONT = "'Space Grotesk', system-ui, sans-serif", MONO = "'JetBrains Mono', ui-monospace, monospace", DISP = "'Unbounded', 'Space Grotesk', sans-serif";

  /* ---------- datos del juego ---------- */
  const AGENTS = {
    co2: { key: '1', name: 'CO₂', desc: 'Desplaza el oxígeno. Ideal para gases y fuego eléctrico.', col: [190, 245, 255], use: 26, spd: 430, recoil: 150, spread: 0.2 },
    agua: { key: '2', name: 'Niebla de agua', desc: 'Enfría la llama. Ideal para alcohol; peligrosa en electrónica.', col: [90, 170, 255], use: 22, spd: 370, recoil: 115, spread: 0.24 },
    sello: { key: '3', name: 'Sellador', desc: 'Espuma que cierra fugas en el exterior de la nave.', col: [255, 210, 90], use: 20, spd: 340, recoil: 100, spread: 0.13 }
  };
  const TYPES = {
    metano: { name: 'Metano (CH₄)', short: 'CH₄', col: [90, 170, 255], grow: 0.035, pts: 100, where: 'in', eff: { co2: 1, agua: 0.35, sello: 0.1 }, note: 'Llama azulada, casi sin hollín.' },
    etano: { name: 'Etano (C₂H₆)', short: 'C₂H₆', col: [170, 140, 255], grow: 0.04, pts: 120, where: 'in', eff: { co2: 0.95, agua: 0.35, sello: 0.1 }, note: 'Gas más denso: se propaga algo más rápido.' },
    propano: { name: 'Propano (C₃H₈)', short: 'C₃H₈', col: [255, 150, 40], grow: 0.05, pts: 150, where: 'in', eff: { co2: 0.8, agua: 0.4, sello: 0.1 }, note: 'Llama anaranjada con hollín: la más tenaz.' },
    alcohol: { name: 'Alcohol', short: 'OH', col: [190, 225, 255], grow: 0.03, pts: 200, where: 'in', eff: { co2: 0.4, agua: 1, sello: 0.1 }, note: 'Casi invisible a simple vista: activa el visor térmico (V).' },
    electrico: { name: 'Fuego eléctrico', short: '⚡', col: [255, 235, 110], grow: 0.06, pts: 220, where: 'in', eff: { co2: 1, agua: -0.6, sello: 0.1 }, note: 'Tableros y cables: el agua provoca un cortocircuito.' },
    fuga: { name: 'Fuga en el casco', short: 'EXT', col: [255, 90, 120], grow: 0.05, pts: 180, where: 'out', eff: { co2: 0.08, agua: 0.12, sello: 1 }, note: 'Exterior: arde el propelente que se escapa; hay que sellar la fuga.' }
  };
  const LEAK_COLS = [[255, 90, 120], [255, 160, 60], [120, 255, 200]];
  const VENTS = [{ x: 340, y: 190, a: -Math.PI / 2 }, { x: 600, y: 190, a: -Math.PI / 2 }, { x: 420, y: 390, a: Math.PI / 2 }, { x: 700, y: 390, a: Math.PI / 2 }, { x: 780, y: 290, a: 0 }];
  const HULL = { x: 260, y: 190, w: 520, h: 200 };
  const STN = { in: { x: 92, y: 468 }, out: { x: 205, y: 300 } }, STN_R = 58;
  const FACTS = [
    'En microgravedad no hay flotabilidad: las llamas son esféricas y el oxígeno llega solo por difusión.',
    'Las llamas en microgravedad pueden tener de 5 a 8 veces más hollín que en la Tierra (ACME · CLD Flame).',
    'Algunas llamas, como las frías, pueden persistir sin ser visibles: un reto para la detección.',
    'El CO₂ diluye el oxígeno alrededor de la llama. El experimento FLEX estudia cuánto agente hace falta para apagarla.',
    'Los extintores de niebla fina nacieron para la ISS y hoy protegen edificios y museos.',
    'Apolo 1 (1967): una cabina con oxígeno puro convirtió un incendio en tragedia.',
    'Mir (1997): una falla del generador de oxígeno provocó un incendio a bordo.',
    'Distinguir polvo de humo evita falsas alarmas, incluso en hábitats lunares.',
    'Al rociar un extintor en microgravedad el retroceso te empuja hacia atrás: tercera ley de Newton.'
  ];

  /* ---------- estado ---------- */
  const G = { state: 'menu', paused: false, mute: false, t: 0, wave: 0, scene: 'in', score: 0, best: 0, integrity: 100, combo: 0, comboT: 0, kills: 0,
    flames: [], parts: [], fx: [], floats: [], agent: 'co2', tank: { co2: 100, agua: 100, sello: 100 }, visor: false, bat: 100,
    toSpawn: 0, spawnT: 0, banner: null, clearing: false, shake: 0, emit: 0, hissT: 0, alarmT: 0, ast: { x: W / 2, y: H / 2, vx: 0, vy: 0, aim: 0 } };
  try { G.best = +localStorage.getItem('prometeoGameBest') || 0; } catch (e) { }

  /* ---------- fondos (precalculados) ---------- */
  const stars = Array.from({ length: 150 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(0.4, 1.5), a: rnd(0.3, 1) }));
  function makeBg(fn) { const c = document.createElement('canvas'); c.width = W * SC; c.height = H * SC; const g = c.getContext('2d'); g.scale(SC, SC); fn(g); return c; }
  const bgIn = makeBg(g => {
    const gr = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 620); gr.addColorStop(0, '#16254a'); gr.addColorStop(1, '#070a16'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,150,220,.10)'; g.lineWidth = 1;
    for (let x = 0; x <= W; x += 75) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += 70) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    [[150, 120], [450, 104], [760, 126]].forEach(([x, y], i) => {
      g.save(); g.beginPath(); g.arc(x, y, 40, 0, TAU); g.clip(); g.fillStyle = '#02030a'; g.fillRect(x - 40, y - 40, 80, 80);
      stars.slice(i * 12, i * 12 + 14).forEach(s => { g.fillStyle = `rgba(255,255,255,${s.a})`; g.fillRect(x - 38 + (s.x % 76), y - 38 + (s.y % 76), s.r, s.r); });
      if (i === 1) { g.fillStyle = '#1c5fa8'; g.beginPath(); g.arc(x - 10, y + 70, 60, 0, TAU); g.fill(); }
      g.restore(); g.strokeStyle = '#8c97bd'; g.lineWidth = 6; g.beginPath(); g.arc(x, y, 41, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 46, 0, TAU); g.stroke();
    });
    [[48, 190], [816, 220]].forEach(([x, y]) => { g.fillStyle = 'rgba(30,40,80,.85)'; rr(g, x, y, 40, 150, 8); g.fill(); g.strokeStyle = 'rgba(140,160,220,.4)'; g.lineWidth = 2; g.stroke(); for (let k = 0; k < 6; k++) { g.fillStyle = ['#3ddc84', '#ffcc33', '#3fb6ff'][k % 3]; g.globalAlpha = 0.7; g.fillRect(x + 8, y + 12 + k * 22, 10, 6); g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x + 22, y + 12 + k * 22, 12, 6); } });
    g.strokeStyle = 'rgba(180,200,255,.3)'; g.lineWidth = 6; rr(g, 6, 6, W - 12, H - 12, 28); g.stroke();
    g.strokeStyle = 'rgba(255,200,60,.32)'; g.lineWidth = 2; g.setLineDash([14, 10]); rr(g, 26, 26, W - 52, H - 52, 18); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(150,170,220,.35)'; g.font = `600 11px ${MONO}`; g.textAlign = 'center'; g.fillText('ESTACIÓN · MÓDULO LABORATORIO', W / 2, H - 12);
  });
  const bgOut = makeBg(g => {
    g.fillStyle = '#02030a'; g.fillRect(0, 0, W, H);
    stars.forEach(s => { g.fillStyle = `rgba(255,255,255,${s.a})`; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); });
    const eg = g.createRadialGradient(130, 880, 380, 130, 880, 560); eg.addColorStop(0, '#2b7bd0'); eg.addColorStop(1, '#0a2a5c');
    g.save(); g.shadowColor = 'rgba(120,200,255,.8)'; g.shadowBlur = 40; g.fillStyle = eg; g.beginPath(); g.arc(130, 880, 540, 0, TAU); g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 12; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(130 + i * 40, 880, 500 - i * 30, -1.9 + i * 0.1, -1.2 + i * 0.1); g.stroke(); }
    const hg = g.createLinearGradient(0, HULL.y, 0, HULL.y + HULL.h); hg.addColorStop(0, '#dfe5f5'); hg.addColorStop(1, '#8590b3');
    g.fillStyle = hg; rr(g, HULL.x, HULL.y, HULL.w, HULL.h, 34); g.fill(); g.strokeStyle = '#4c5578'; g.lineWidth = 4; g.stroke();
    g.strokeStyle = 'rgba(60,70,110,.35)'; g.lineWidth = 2; for (let x = HULL.x + 65; x < HULL.x + HULL.w - 30; x += 65) { g.beginPath(); g.moveTo(x, HULL.y + 6); g.lineTo(x, HULL.y + HULL.h - 6); g.stroke(); }
    g.beginPath(); g.moveTo(HULL.x + 10, HULL.y + 100); g.lineTo(HULL.x + HULL.w - 10, HULL.y + 100); g.stroke();
    g.fillStyle = 'rgba(255,190,60,.55)'; [[330, 230], [470, 300], [610, 235]].forEach(([x, y]) => rr(g, x, y, 62, 42, 6) || g.fill());
    g.fillStyle = 'rgba(20,30,60,.85)'; [[380, 270], [530, 240], [680, 320]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); });
    g.fillStyle = '#3a4260'; g.beginPath(); g.arc(HULL.x + 4, 300, 30, 0, TAU); g.fill(); g.strokeStyle = '#ffcc33'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#9aa4c6'; g.fillRect(700, 150, 4, 40); g.beginPath(); g.arc(702, 148, 18, Math.PI, TAU); g.fill();
    VENTS.forEach(v => { g.save(); g.translate(v.x, v.y); g.rotate(v.a); g.fillStyle = '#2a2f48'; g.fillRect(-8, -9, 12, 18); g.fillStyle = '#ff7a1a'; g.fillRect(3, -6, 2, 12); g.restore(); });
    g.fillStyle = 'rgba(150,170,220,.35)'; g.font = `600 11px ${MONO}`; g.textAlign = 'center'; g.fillText('CASCO EXTERIOR · EVA', W / 2, H - 12);
  });

  /* ---------- sonido ---------- */
  let AC = null, noise = null;
  function initAudio() { try { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); const b = AC.createBuffer(1, AC.sampleRate * 0.15, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noise = b; } if (AC.state === 'suspended') AC.resume(); } catch (e) { } }
  function tone(f, d = 0.12, type = 'sine', v = 0.05, to = f, delay = 0) { if (G.mute || !AC) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d); }
  function hiss() { if (G.mute || !AC || !noise) return; const s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter(); s.buffer = noise; f.type = 'highpass'; f.frequency.value = 1800; g.gain.value = 0.035; s.connect(f); f.connect(g); g.connect(AC.destination); s.start(); }

  /* ---------- entrada ---------- */
  const keys = {}, mouse = { x: W / 2, y: H / 2, down: false, active: false }, sticks = { move: null, aim: null };
  let visible = true;
  const canvasPos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  cv.addEventListener('pointerdown', e => {
    initAudio(); if (G.state !== 'play') return; const p = canvasPos(e);
    if (e.pointerType === 'mouse') { mouse.down = true; mouse.x = p.x; mouse.y = p.y; mouse.active = true; }
    else { const role = p.x < W / 2 ? 'move' : 'aim'; if (!sticks[role]) sticks[role] = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y }; }
    try { cv.setPointerCapture(e.pointerId); } catch (er) { } e.preventDefault();
  });
  cv.addEventListener('pointermove', e => {
    const p = canvasPos(e);
    if (e.pointerType === 'mouse') { mouse.x = p.x; mouse.y = p.y; mouse.active = true; }
    else ['move', 'aim'].forEach(k => { const s = sticks[k]; if (s && s.id === e.pointerId) { s.x = p.x; s.y = p.y; } });
  });
  const release = e => { if (e.pointerType === 'mouse') mouse.down = false; else ['move', 'aim'].forEach(k => { if (sticks[k] && sticks[k].id === e.pointerId) sticks[k] = null; }); };
  cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test((e.target.tagName || ''))) return;
    const k = e.key.toLowerCase();
    if (G.state === 'play' && visible && [' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (G.state !== 'play' || !visible) return;
    initAudio(); keys[k] = true;
    if (k === '1') selAgent('co2'); else if (k === '2') selAgent('agua'); else if (k === '3') selAgent('sello');
    else if (k === 'v') toggleVisor(); else if (k === 'p' || k === 'escape') togglePause(); else if (k === 'm') toggleSound();
    if (k === 'q' || k === 'e') mouse.active = false;
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { Object.keys(keys).forEach(k => keys[k] = false); mouse.down = false; if (G.state === 'play') setPause(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') setPause(true); });

  /* ---------- controles de UI ---------- */
  function selAgent(a) { G.agent = a; tone(520, 0.06, 'square', 0.025); uiSync(true); }
  function toggleVisor() { if (!G.visor && G.bat < 15) { addFloat(G.ast.x, G.ast.y - 30, 'Batería baja', [255, 120, 120]); return; } G.visor = !G.visor; tone(G.visor ? 700 : 450, 0.1, 'triangle', 0.04); uiSync(true); }
  function toggleSound() { G.mute = !G.mute; uiSync(true); }
  function setPause(p) { if (G.state !== 'play') return; G.paused = p; uiSync(true); }
  function togglePause() { setPause(!G.paused); }

  const agentsEl = $('gameAgents');
  agentsEl.innerHTML = Object.keys(AGENTS).map(k => { const a = AGENTS[k]; return `<button class="agent-btn" data-a="${k}" type="button"><span class="ak">${a.key}</span><span class="an"><b>${a.name}</b><small>${a.desc}</small><i class="tk"><u></u></i></span></button>`; }).join('');
  agentsEl.addEventListener('click', e => { const b = e.target.closest('.agent-btn'); if (b) { initAudio(); selAgent(b.dataset.a); } });
  $('gVisor').addEventListener('click', () => { initAudio(); toggleVisor(); });
  $('gPause').addEventListener('click', () => { initAudio(); togglePause(); });
  $('gSound').addEventListener('click', () => { initAudio(); toggleSound(); });
  $('gPlay').addEventListener('click', () => { initAudio(); start(); });
  $('gAgain').addEventListener('click', () => { initAudio(); start(); });
  $('flameGuide').innerHTML = Object.keys(TYPES).map(k => {
    const t = TYPES[k], best = Object.keys(t.eff).reduce((a, b) => t.eff[b] > t.eff[a] ? b : a);
    return `<article class="fg"><i class="dot" style="background:rgb(${t.col});box-shadow:0 0 14px rgb(${t.col})"></i><div><h4>${t.name}</h4><p>${t.note}</p><span class="pill ${t.where === 'out' ? '' : 'hot'}">${t.where === 'out' ? 'Exterior' : 'Interior'}</span> <span class="pill">Mejor: ${AGENTS[best].name}</span></div></article>`;
  }).join('');
  let uiT = 0;
  function uiSync(force) {
    uiT = 0;
    agentsEl.querySelectorAll('.agent-btn').forEach(b => { const k = b.dataset.a; b.classList.toggle('sel', G.agent === k); const u = b.querySelector('u'); u.style.width = G.tank[k] + '%'; b.classList.toggle('low', G.tank[k] < 15); });
    $('gVisor').textContent = 'Visor térmico: ' + (G.visor ? 'ON' : 'OFF') + ' (V)'; $('gVisor').classList.toggle('on', G.visor);
    $('gPause').textContent = G.paused ? '▶ Reanudar (P)' : '⏸ Pausa (P)'; $('gSound').textContent = G.mute ? '🔇 Sonido: OFF (M)' : '🔊 Sonido: ON (M)';
  }

  /* ---------- flujo del juego ---------- */
  const poolFor = w => { if (w % 2 === 0) return ['fuga']; const n = Math.ceil(w / 2), p = ['metano', 'propano', 'etano']; if (n >= 2) p.push('alcohol'); if (n >= 3) p.push('electrico'); return p; };
  function start() {
    Object.assign(G, { state: 'play', paused: false, t: 0, wave: 0, score: 0, integrity: 100, combo: 0, comboT: 0, kills: 0, flames: [], parts: [], fx: [], floats: [], visor: false, bat: 100, banner: null, clearing: false, shake: 0 });
    G.tank = { co2: 100, agua: 100, sello: 100 }; G.agent = 'co2';
    $('gameStart').classList.add('hidden'); $('gameOver').classList.add('hidden'); startWave(); uiSync(true);
  }
  function startWave() {
    G.wave++; G.scene = G.wave % 2 ? 'in' : 'out'; G.clearing = false; G.flames.length = 0; G.parts.length = 0;
    const a = G.ast; a.vx = a.vy = 0; if (G.scene === 'in') { a.x = W / 2; a.y = H / 2; } else { a.x = 150; a.y = 400; }
    G.toSpawn = 2 + Math.ceil(G.wave * 1.4); G.spawnT = 0.4;
    const inside = G.scene === 'in', pool = poolFor(G.wave).map(k => TYPES[k].short).join(' · ');
    G.banner = { title: `Oleada ${G.wave} · ${inside ? 'Interior' : 'Exterior (EVA)'}`, sub: `Llamas: ${pool}`, fact: FACTS[(G.wave - 1) % FACTS.length], t: 3.4, then: null };
    tone(330, 0.15, 'triangle', 0.05, 440); tone(440, 0.2, 'triangle', 0.05, 660, 0.15);
  }
  function waveClear() {
    G.clearing = true; const bonus = 200 + Math.round(G.integrity * 3); G.score += bonus; G.integrity = Math.min(100, G.integrity + 6);
    Object.keys(G.tank).forEach(k => G.tank[k] = Math.min(100, G.tank[k] + 35));
    G.banner = { title: '¡Oleada superada!', sub: `Bonificación +${bonus} · integridad ${Math.round(G.integrity)} %`, fact: '', t: 2.2, then: startWave };
    tone(523, 0.12, 'square', 0.04); tone(659, 0.12, 'square', 0.04, 659, 0.12); tone(784, 0.25, 'square', 0.04, 784, 0.24);
  }
  function gameOver() {
    G.state = 'over'; if (G.score > G.best) { G.best = G.score; try { localStorage.setItem('prometeoGameBest', G.best); } catch (e) { } }
    $('goScore').textContent = G.score; $('goBest').textContent = G.best; $('goWave').textContent = G.wave; $('goKills').textContent = G.kills; $('gameOver').classList.remove('hidden');
    tone(300, 0.5, 'sawtooth', 0.06, 70); mouse.down = false; sticks.move = sticks.aim = null; uiSync(true);
  }

  /* ---------- llamas ---------- */
  function hitbox(f) {
    if (TYPES[f.type].where === 'in') return { x: f.x, y: f.y, r: 12 + f.s * 26 };
    const len = 30 + f.s * 70; return { x: f.x + f.dx * len * 0.55, y: f.y + f.dy * len * 0.55, r: 14 + f.s * 20 };
  }
  function mkFlame(type, o) { return Object.assign({ type, x: 0, y: 0, vx: rnd(-10, 10), vy: rnd(-10, 10), s: rnd(0.45, 0.7), ph: Math.random() * 10, fb: 0, col: TYPES[type].col }, o); }
  function spawnFlame() {
    const type = pick(poolFor(G.wave)), TY = TYPES[type];
    if (TY.where === 'out') {
      const free = VENTS.map((v, i) => i).filter(i => !G.flames.some(f => f.vent === i)); if (!free.length) return false;
      const i = pick(free), v = VENTS[i]; G.flames.push(mkFlame(type, { vent: i, x: v.x, y: v.y, dx: Math.cos(v.a), dy: Math.sin(v.a), s: rnd(0.4, 0.6), col: pick(LEAK_COLS) })); return true;
    }
    for (let n = 0; n < 40; n++) {
      const x = rnd(90, W - 90), y = rnd(110, H - 90);
      if (Math.hypot(x - G.ast.x, y - G.ast.y) < 130 || G.flames.some(f => Math.hypot(f.x - x, f.y - y) < 100) || Math.hypot(x - STN.in.x, y - STN.in.y) < 110) continue;
      G.flames.push(mkFlame(type, { x, y })); return true;
    }
    return false;
  }
  function addFloat(x, y, txt, col) { G.floats.push({ x, y, txt, col, t: 1.1 }); }
  function puff(x, y, col, n, sp, life, size) { for (let i = 0; i < n && G.fx.length < 500; i++) { const a = rnd(0, TAU), v = rnd(0.3, 1) * sp; G.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: rnd(0.5, 1) * life, size: rnd(0.6, 1) * size, col }); } }
  function killFlame(f) {
    const TY = TYPES[f.type]; G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 5; const pts = Math.round(TY.pts * (1 + 0.25 * Math.min(G.combo - 1, 8)));
    G.score += pts; G.kills++; const h = hitbox(f); addFloat(h.x, h.y - 10, `+${pts}` + (G.combo > 1 ? `  ×${G.combo}` : ''), [255, 230, 140]);
    puff(h.x, h.y, [210, 215, 235], 18, 90, 1.2, 7); tone(660, 0.08, 'triangle', 0.05, 990); tone(880, 0.14, 'triangle', 0.05, 1320, 0.07);
  }

  /* ---------- actualización ---------- */
  function update(dt) {
    G.t += dt; const a = G.ast;
    if (G.state === 'menu') { a.aim += dt * 0.6; a.x = W / 2 + Math.sin(G.t * 0.6) * 40; a.y = H / 2 + Math.cos(G.t * 0.8) * 22; return; }
    if (G.state !== 'play' || G.paused) return;
    // banner
    if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) { const cb = G.banner.then; G.banner = null; if (cb) cb(); } }
    // puntería
    const aimS = sticks.aim, moveS = sticks.move;
    if (keys.q) a.aim -= 3.2 * dt; if (keys.e) a.aim += 3.2 * dt;
    let spray = !!(mouse.down || keys[' ']);
    if (aimS) { const dx = aimS.x - aimS.ox, dy = aimS.y - aimS.oy; if (Math.hypot(dx, dy) > 12) { a.aim = Math.atan2(dy, dx); spray = true; } }
    else if (mouse.active) a.aim = Math.atan2(mouse.y - a.y, mouse.x - a.x);
    // propulsión
    let tx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), ty = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    if (moveS) { tx += clamp((moveS.x - moveS.ox) / 55, -1, 1); ty += clamp((moveS.y - moveS.oy) / 55, -1, 1); }
    const tl = Math.hypot(tx, ty); if (tl > 1) { tx /= tl; ty /= tl; }
    a.vx += tx * 290 * dt; a.vy += ty * 290 * dt;
    if (tl > 0.1 && Math.random() < dt * 40) G.fx.push({ x: a.x - tx * 18, y: a.y - ty * 18, vx: -tx * 90 + rnd(-25, 25), vy: -ty * 90 + rnd(-25, 25), t: 0, max: 0.45, size: 5, col: [160, 200, 255] });
    // rociado
    const AG = AGENTS[G.agent];
    if (spray && G.tank[G.agent] > 0) {
      G.tank[G.agent] = Math.max(0, G.tank[G.agent] - AG.use * dt); G.emit += dt * 95;
      while (G.emit >= 1) { G.emit--; if (G.parts.length > 420) break; const an = a.aim + rnd(-AG.spread, AG.spread), sp = AG.spd * rnd(0.85, 1.15); G.parts.push({ x: a.x + Math.cos(a.aim) * 44, y: a.y + Math.sin(a.aim) * 44, vx: Math.cos(an) * sp + a.vx * 0.5, vy: Math.sin(an) * sp + a.vy * 0.5, t: 0, max: rnd(0.8, 1.25), agent: G.agent }); }
      a.vx -= Math.cos(a.aim) * AG.recoil * dt; a.vy -= Math.sin(a.aim) * AG.recoil * dt;
      G.hissT -= dt; if (G.hissT <= 0) { hiss(); G.hissT = 0.11; }
    } else if (spray && G.tank[G.agent] <= 0) { G.hissT -= dt; if (G.hissT <= 0) { tone(140, 0.08, 'square', 0.03); addFloat(a.x, a.y - 34, '¡Tanque vacío!', [255, 120, 120]); G.hissT = 0.7; } }
    // movimiento y límites
    a.vx *= Math.exp(-0.6 * dt); a.vy *= Math.exp(-0.6 * dt); const sp = Math.hypot(a.vx, a.vy); if (sp > 300) { a.vx *= 300 / sp; a.vy *= 300 / sp; }
    a.x += a.vx * dt; a.y += a.vy * dt;
    const L = 40, R = W - 40, T = 64, B = H - 38;
    if (a.x < L) { a.x = L; a.vx = Math.abs(a.vx) * 0.55; } if (a.x > R) { a.x = R; a.vx = -Math.abs(a.vx) * 0.55; }
    if (a.y < T) { a.y = T; a.vy = Math.abs(a.vy) * 0.55; } if (a.y > B) { a.y = B; a.vy = -Math.abs(a.vy) * 0.55; }
    if (G.scene === 'out') {
      const x0 = HULL.x - 20, x1 = HULL.x + HULL.w + 20, y0 = HULL.y - 20, y1 = HULL.y + HULL.h + 20;
      if (a.x > x0 && a.x < x1 && a.y > y0 && a.y < y1) {
        const dl = a.x - x0, dr = x1 - a.x, du = a.y - y0, dd = y1 - a.y, m = Math.min(dl, dr, du, dd);
        if (m === dl) { a.x = x0; a.vx = -Math.abs(a.vx) * 0.4; } else if (m === dr) { a.x = x1; a.vx = Math.abs(a.vx) * 0.4; } else if (m === du) { a.y = y0; a.vy = -Math.abs(a.vy) * 0.4; } else { a.y = y1; a.vy = Math.abs(a.vy) * 0.4; }
      }
    }
    // recarga
    const st = STN[G.scene];
    if (Math.hypot(a.x - st.x, a.y - st.y) < STN_R) { let rf = false; Object.keys(G.tank).forEach(k => { if (G.tank[k] < 100) { G.tank[k] = Math.min(100, G.tank[k] + 45 * dt); rf = true; } }); G.bat = Math.min(100, G.bat + 30 * dt); if (rf && Math.random() < dt * 3) addFloat(st.x, st.y - 40, 'RECARGANDO', [120, 255, 190]); }
    // visor
    if (G.visor) { G.bat -= 9 * dt; if (G.bat <= 0) { G.bat = 0; G.visor = false; addFloat(a.x, a.y - 30, 'Visor sin batería', [255, 120, 120]); uiSync(true); } } else G.bat = Math.min(100, G.bat + 10 * dt);
    // spawn y fin de oleada
    if (!G.banner) {
      if (G.toSpawn > 0) { G.spawnT -= dt; if (G.spawnT <= 0) { if (spawnFlame()) { G.toSpawn--; G.spawnT = rnd(1.6, 3.2) / (1 + 0.06 * G.wave); } else G.spawnT = 0.6; } }
      else if (G.flames.length === 0 && !G.clearing) waveClear();
    }
    // llamas
    const born = [];
    for (const f of G.flames) {
      const TY = TYPES[f.type]; f.ph += dt; f.fb -= dt; f.s = Math.min(1.45, f.s + TY.grow * (1 + 0.08 * G.wave) * dt);
      if (TY.where === 'in') {
        f.x += f.vx * dt; f.y += f.vy * dt; if (f.x < 60 || f.x > W - 60) f.vx *= -1; if (f.y < 85 || f.y > H - 65) f.vy *= -1; f.x = clamp(f.x, 60, W - 60); f.y = clamp(f.y, 85, H - 65);
        if (f.s >= 1) { if (G.flames.length + born.length < 16) { born.push(mkFlame(f.type, { x: clamp(f.x + rnd(-1, 1) * 60, 60, W - 60), y: clamp(f.y + rnd(-1, 1) * 60, 85, H - 65), s: 0.45 })); f.s = 0.6; addFloat(f.x, f.y - 30, '¡Se propaga!', [255, 170, 90]); tone(200, 0.12, 'sawtooth', 0.04, 150); } }
        if (f.type === 'propano' && Math.random() < dt * 7) G.fx.push({ x: f.x + rnd(-8, 8), y: f.y, vx: rnd(-14, 14), vy: rnd(-14, 14), t: 0, max: 2.2, size: 8, col: [120, 120, 135], soft: true });
        const h = hitbox(f), d = Math.hypot(a.x - h.x, a.y - h.y);
        if (d < h.r + 16) { G.integrity -= 6 * dt; const nx = (a.x - h.x) / (d || 1), ny = (a.y - h.y) / (d || 1); a.vx += nx * 380 * dt; a.vy += ny * 380 * dt; G.shake = Math.max(G.shake, 4); if (f.fb <= 0) { addFloat(a.x, a.y - 34, '¡Calor!', [255, 110, 90]); f.fb = 0.9; tone(180, 0.1, 'sawtooth', 0.04); } }
      } else if (f.s >= 1.25) { G.integrity -= 8; f.s = 0.55; G.shake = 12; addFloat(f.x + f.dx * 40, f.y + f.dy * 40, '¡Explosión de fuga!', [255, 120, 90]); puff(f.x + f.dx * 40, f.y + f.dy * 40, [255, 170, 80], 24, 160, 0.8, 7); tone(120, 0.3, 'sawtooth', 0.07, 50); }
    }
    G.flames.push(...born);
    // partículas de agente + colisión
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; const dr = Math.exp(-0.9 * dt); p.vx *= dr; p.vy *= dr;
      if (p.t > p.max || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) { G.parts.splice(i, 1); continue; }
      for (const f of G.flames) {
        const h = hitbox(f); if (Math.hypot(p.x - h.x, p.y - h.y) > h.r + 3 + p.t * 5) continue;
        const e = TYPES[f.type].eff[p.agent];
        if (e > 0) f.s -= 0.0068 * e; else if (e < 0) { f.s += 0.004 * -e; G.integrity -= 0.05; }
        if (f.fb <= 0) {
          f.fb = 0.8;
          if (e < 0) { addFloat(h.x, h.y - h.r - 8, '¡Cortocircuito!', [255, 90, 90]); tone(110, 0.15, 'sawtooth', 0.05); puff(h.x, h.y, [255, 240, 150], 8, 140, 0.4, 3); }
          else if (e < 0.25) addFloat(h.x, h.y - h.r - 8, '¡Agente equivocado!', [255, 130, 110]);
          else if (e < 0.8) addFloat(h.x, h.y - h.r - 8, 'Poco efectivo', [255, 210, 110]);
          else addFloat(h.x, h.y - h.r - 8, '¡Eficaz!', [120, 255, 190]);
        }
        G.parts.splice(i, 1); break;
      }
    }
    for (let i = G.flames.length - 1; i >= 0; i--) if (G.flames[i].s <= 0) { killFlame(G.flames[i]); G.flames.splice(i, 1); }
    // integridad
    let sum = 0; G.flames.forEach(f => sum += Math.pow(f.s, 1.3)); G.integrity -= 0.5 * sum * dt; G.integrity = Math.min(100, G.integrity);
    if (G.integrity < 30) { G.alarmT -= dt; if (G.alarmT <= 0) { tone(880, 0.12, 'square', 0.03); G.alarmT = 1; } }
    if (G.integrity <= 0) { G.integrity = 0; gameOver(); }
    // combo, fx, textos
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    for (let i = G.fx.length - 1; i >= 0; i--) { const p = G.fx[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-1.2 * dt); p.vy *= Math.exp(-1.2 * dt); if (p.t > p.max) G.fx.splice(i, 1); }
    for (let i = G.floats.length - 1; i >= 0; i--) { const f = G.floats[i]; f.t -= dt; f.y -= 28 * dt; if (f.t <= 0) G.floats.splice(i, 1); }
    G.shake = Math.max(0, G.shake - 30 * dt);
    uiT += dt; if (uiT > 0.12) uiSync();
  }

  /* ---------- dibujo ---------- */
  function drawFlame(f) {
    const TY = TYPES[f.type], t = G.t, col = f.col, hb = hitbox(f), vis = f.type === 'alcohol' ? (G.visor ? 0.9 : 0.16) : 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (TY.where === 'in') {
      const R = 12 + f.s * 26, fl = 1 + 0.07 * Math.sin(t * 13 + f.ph) + 0.04 * Math.sin(t * 29 + f.ph * 2);
      const gl = ctx.createRadialGradient(f.x, f.y, R * 0.3, f.x, f.y, R * 2.7); gl.addColorStop(0, rgba(col, 0.42 * vis)); gl.addColorStop(1, rgba(col, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(f.x, f.y, R * 2.7, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(col, 0.55 * vis); ctx.beginPath(); for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU, r = R * fl * (1 + 0.13 * Math.sin(a * 7 + t * 9 + f.ph)); i ? ctx.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r) : ctx.moveTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); } ctx.fill();
      const mid = [Math.min(255, col[0] + 70), Math.min(255, col[1] + 70), Math.min(255, col[2] + 70)]; ctx.fillStyle = rgba(mid, 0.7 * vis); ctx.beginPath(); ctx.arc(f.x, f.y, R * 0.62 * fl, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.85 * vis})`; ctx.beginPath(); ctx.arc(f.x, f.y, R * 0.3 * fl, 0, TAU); ctx.fill();
      if (f.type === 'electrico') { ctx.strokeStyle = 'rgba(255,255,200,.9)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const a = rnd(0, TAU), r1 = R * 0.9, r2 = R * rnd(1.3, 2); ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1); ctx.lineTo(f.x + Math.cos(a + 0.2) * (r1 + r2) / 2, f.y + Math.sin(a + 0.2) * (r1 + r2) / 2); ctx.lineTo(f.x + Math.cos(a) * r2, f.y + Math.sin(a) * r2); ctx.stroke(); } }
    } else {
      const len = 30 + f.s * 70, px = -f.dy, py = f.dx;
      for (let k = 0; k <= 9; k++) { const u = k / 9, w = Math.sin(t * 18 + k * 1.3 + f.ph) * 4 * u, x = f.x + f.dx * len * u + px * w, y = f.y + f.dy * len * u + py * w, r = (11 + 9 * f.s) * (1 - u * 0.72);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8); g.addColorStop(0, `rgba(255,255,255,${0.7 * (1 - u)})`); g.addColorStop(0.35, rgba(col, 0.75 * (1 - u * 0.5))); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
    if (G.visor) { ctx.save(); ctx.strokeStyle = f.type === 'alcohol' ? 'rgba(255,160,60,.95)' : 'rgba(80,255,170,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(hb.x, hb.y, hb.r + 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(200,255,230,.9)'; ctx.font = `600 10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText(TY.short, hb.x, hb.y - hb.r - 12); ctx.restore(); }
  }
  function drawAst() {
    const a = G.ast, AG = AGENTS[G.agent]; ctx.save(); ctx.translate(a.x, a.y);
    ctx.fillStyle = 'rgba(120,170,255,.10)'; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
    ctx.rotate(a.aim);
    ctx.fillStyle = '#d83a3a'; rr(ctx, 12, -6, 26, 12, 4); ctx.fill(); ctx.fillStyle = rgba(AG.col, 1); ctx.fillRect(20, -6, 4, 12); ctx.fillStyle = '#b9c2dc'; ctx.fillRect(37, -3, 9, 6);
    ctx.fillStyle = '#9aa5cb'; rr(ctx, -27, -12, 14, 24, 5); ctx.fill(); ctx.fillStyle = '#ff7a1a'; ctx.fillRect(-27, -3, 4, 6);
    ctx.fillStyle = '#f2f4fb'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill(); ctx.strokeStyle = '#98a2c4'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e4e8f4'; ctx.beginPath(); ctx.arc(6, 0, 11, 0, TAU); ctx.fill(); ctx.stroke();
    const vg = ctx.createLinearGradient(2, -8, 14, 8); vg.addColorStop(0, '#ffd37a'); vg.addColorStop(0.5, '#3a63b8'); vg.addColorStop(1, '#162a5c'); ctx.fillStyle = vg; ctx.beginPath(); ctx.ellipse(9, 0, 6.5, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.beginPath(); ctx.ellipse(11, -3, 2, 3, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBar(x, y, w, h, v, col, label) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.fillStyle = col; if (v > 0) { rr(ctx, x, y, Math.max(h, w * v), h, h / 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; rr(ctx, x, y, w, h, h / 2); ctx.stroke();
    if (label) { ctx.fillStyle = '#e9ecf8'; ctx.font = `600 10px ${MONO}`; ctx.textAlign = 'left'; ctx.fillText(label, x + 2, y - 4); }
  }
  function wrap(txt, x, y, maxW, lh) { const words = txt.split(' '); let line = ''; for (const w of words) { const t = line + w + ' '; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w + ' '; y += lh; } else line = t; } ctx.fillText(line, x, y); }
  function drawHUD() {
    const ic = G.integrity > 60 ? '#3ddc84' : G.integrity > 30 ? '#ffcc33' : '#ff4d4d';
    drawBar(18, 28, 210, 12, G.integrity / 100, ic, `INTEGRIDAD ${Math.round(G.integrity)} %`); drawBar(18, 58, 120, 8, G.bat / 100, '#37f0d2', `VISOR ${Math.round(G.bat)} %`);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = `800 20px ${DISP}`; ctx.fillText(String(G.score).padStart(5, '0'), W - 18, 36); ctx.font = `600 11px ${MONO}`; ctx.fillStyle = '#8e95b5'; ctx.fillText(`OLEADA ${G.wave} · RÉCORD ${Math.max(G.best, G.score)}`, W - 18, 54);
    if (G.combo > 1) { ctx.textAlign = 'center'; ctx.fillStyle = '#ffb347'; ctx.font = `800 22px ${DISP}`; ctx.fillText(`COMBO ×${G.combo}`, W / 2, 44); drawBar(W / 2 - 60, 52, 120, 5, G.comboT / 5, '#ff7a1a'); }
    const AG = AGENTS[G.agent]; drawBar(W / 2 - 110, H - 40, 220, 10, G.tank[G.agent] / 100, rgba(AG.col, 0.95), `${AG.name.toUpperCase()}  ${Math.round(G.tank[G.agent])} %`);
    const st = STN[G.scene]; if (Math.hypot(G.ast.x - st.x, G.ast.y - st.y) >= STN_R && Math.min(...Object.values(G.tank)) < 25) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.font = `600 11px ${MONO}`; ctx.fillText('⟵ ¡Recarga tus tanques en la estación!', W / 2, H - 56); }
  }
  function drawStation() {
    const st = STN[G.scene], p = 0.5 + 0.5 * Math.sin(G.t * 3);
    ctx.save(); ctx.strokeStyle = `rgba(61,220,132,${0.35 + 0.35 * p})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(st.x, st.y, STN_R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(61,220,132,.10)'; ctx.fill();
    if (G.scene === 'in') { ctx.fillStyle = '#2a3354'; rr(ctx, st.x - 22, st.y - 26, 44, 52, 6); ctx.fill(); ctx.strokeStyle = '#3ddc84'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#d83a3a'; ctx.fillRect(st.x - 12, st.y - 16, 8, 30); ctx.fillStyle = '#4aa0ff'; ctx.fillRect(st.x, st.y - 16, 8, 30); }
    ctx.fillStyle = 'rgba(61,220,132,.9)'; ctx.font = `600 10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText(G.scene === 'in' ? 'RECARGA' : 'ESCLUSA · RECARGA', st.x, st.y + STN_R + 14); ctx.restore();
  }
  function draw() {
    ctx.save();
    if (G.shake > 0) ctx.translate(rnd(-G.shake, G.shake) * 0.5, rnd(-G.shake, G.shake) * 0.5);
    const inside = G.state === 'menu' || G.scene === 'in'; ctx.drawImage(inside ? bgIn : bgOut, 0, 0, W, H);
    if (G.state !== 'menu') drawStation();
    if (G.state === 'menu') { drawMenuFlames(); }
    else {
      if (G.scene === 'out') { ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(STN.out.x - 25, 300); ctx.quadraticCurveTo((STN.out.x + G.ast.x) / 2, 300 + 60 + Math.sin(G.t) * 8, G.ast.x, G.ast.y); ctx.stroke(); }
      G.fx.forEach(p => { const k = 1 - p.t / p.max; ctx.fillStyle = rgba(p.col, (p.soft ? 0.3 : 0.55) * k); ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.soft ? 1 + p.t : 0.6 + 0.6 * k), 0, TAU); ctx.fill(); });
      G.flames.forEach(drawFlame);
      G.parts.forEach(p => { const A = AGENTS[p.agent], k = 1 - p.t / p.max; ctx.fillStyle = rgba(A.col, 0.6 * k + 0.1); ctx.beginPath(); ctx.arc(p.x, p.y, (p.agent === 'sello' ? 3 : 2.5) + p.t * 9, 0, TAU); ctx.fill(); });
    }
    drawAst();
    G.floats.forEach(f => { ctx.fillStyle = rgba(f.col, Math.min(1, f.t * 2)); ctx.font = `700 14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(f.txt, f.x, f.y); });
    ctx.restore();
    if (G.state === 'menu') return;
    if (G.visor) { const g = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 560); g.addColorStop(0, 'rgba(40,255,160,.04)'); g.addColorStop(1, 'rgba(0,40,30,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (G.integrity < 30 && G.state === 'play') { const a = 0.12 + 0.12 * Math.sin(G.t * 8); const g = ctx.createRadialGradient(W / 2, H / 2, 250, W / 2, H / 2, 560); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,30,30,${a * 3})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    drawHUD();
    [sticks.move, sticks.aim].forEach((s, i) => { if (!s) return; const kx = s.ox + clamp(s.x - s.ox, -55, 55), ky = s.oy + clamp(s.y - s.oy, -55, 55); ctx.strokeStyle = i ? 'rgba(255,160,60,.6)' : 'rgba(80,200,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.ox, s.oy, 55, 0, TAU); ctx.stroke(); ctx.fillStyle = i ? 'rgba(255,160,60,.5)' : 'rgba(80,200,255,.5)'; ctx.beginPath(); ctx.arc(kx, ky, 24, 0, TAU); ctx.fill(); });
    if (G.banner) {
      const b = G.banner, al = clamp(Math.min(b.t, 3.4 - (3.4 - b.t)) * 3, 0, 1); ctx.save(); ctx.globalAlpha = Math.min(1, b.t * 3);
      ctx.fillStyle = 'rgba(5,6,18,.82)'; rr(ctx, W / 2 - 300, 150, 600, b.fact ? 170 : 110, 22); ctx.fill(); ctx.strokeStyle = 'rgba(255,122,26,.7)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffb347'; ctx.font = `800 26px ${DISP}`; ctx.fillText(b.title, W / 2, 200); ctx.fillStyle = '#c9cfe8'; ctx.font = `500 14px ${FONT}`; ctx.fillText(b.sub, W / 2, 230);
      if (b.fact) { ctx.fillStyle = '#37f0d2'; ctx.font = `600 13px ${FONT}`; wrap('💡 ' + b.fact, W / 2, 268, 520, 19); }
      ctx.restore();
    }
    if (G.paused) { ctx.fillStyle = 'rgba(3,4,10,.7)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `800 40px ${DISP}`; ctx.fillText('PAUSA', W / 2, H / 2); ctx.font = `500 15px ${FONT}`; ctx.fillStyle = '#c9cfe8'; ctx.fillText('Pulsa P o «Reanudar» para continuar', W / 2, H / 2 + 34); }
  }
  const menuFl = [mkFlame('metano', { x: 180, y: 380, s: .7 }), mkFlame('propano', { x: 700, y: 400, s: .8 }), mkFlame('alcohol', { x: 330, y: 160, s: .7 }), mkFlame('electrico', { x: 760, y: 190, s: .6 }), mkFlame('etano', { x: 130, y: 220, s: .55 })];
  function drawMenuFlames() { menuFl.forEach(f => { f.ph += 0.016; drawFlame(f); }); }

  /* ---------- bucle ---------- */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible) return;
    update(dt); draw();
  }
  new IntersectionObserver(e => { visible = e[0].isIntersecting; if (!visible && G.state === 'play') setPause(true); }, { threshold: 0.15 }).observe(cv);
  uiSync(true); requestAnimationFrame(frame);
  window.PrometeoGame = { G, start };
})();
