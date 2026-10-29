// Moteur sonore : synthèse « organique » (métal, os, cordes, souffle) + réverbération de lieu + son spatialisé.
// Si un fichier existe dans assets/sfx/<nom>.ogg (ou .mp3/.wav) et qu'il est listé dans assets/sfx/manifest.json,
// il remplace automatiquement le son synthétisé.
import { settings } from './save.js';

let ctx = null;
let noiseBuf = null;
const B = {}; // bus audio
const lastPlay = {};
const samples = {}; // nom -> [AudioBuffer]
const ksCache = new Map();
const listener = { x: 0, y: 0 };
let surface = 'stone';
let pendingStart = [];

const R = (a, b) => a + Math.random() * (b - a);

export function getAudio() { return ctx ? { ctx, B, noiseBuf, pluckBuffer } : null; }

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { ctx = null; return null; }
  const sr = ctx.sampleRate;
  noiseBuf = ctx.createBuffer(2, sr * 2, sr);
  for (let c = 0; c < 2; c++) { const d = noiseBuf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

  B.comp = ctx.createDynamicsCompressor();
  B.comp.threshold.value = -16;
  B.comp.ratio.value = 4;
  B.master = ctx.createGain();
  B.trim = ctx.createGain();
  B.trim.gain.value = MASTER_TRIM; // après le compresseur : baisse réelle du niveau de sortie
  B.master.connect(B.comp).connect(B.trim).connect(ctx.destination);
  B.sfx = ctx.createGain();
  B.music = ctx.createGain();
  B.amb = ctx.createGain();
  B.sfx.connect(B.master);
  B.music.connect(B.master);
  B.amb.connect(B.master);
  // Réverbération (crypte / village)
  B.verb = ctx.createConvolver();
  B.verbOut = ctx.createGain();
  B.verbSend = ctx.createGain();
  B.verbSend.connect(B.verb).connect(B.verbOut).connect(B.master);
  setReverb('village');
  applyVolumes();
  loadSamples();
  return ctx;
}

function impulse(sec, decay, bright) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * sec);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const n = Math.random() * 2 - 1;
      lp += (n - lp) * bright; // filtre passe-bas simple (réverbération sombre)
      d[i] = lp * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

export function setReverb(kind) {
  if (!ctx) { pendingStart.push(() => setReverb(kind)); return; }
  if (kind === 'dungeon') { B.verb.buffer = impulse(3.2, 2.6, 0.35); B.verbSend.gain.value = 0.55; B.verbOut.gain.value = 0.9; }
  else if (kind === 'boss') { B.verb.buffer = impulse(4.0, 2.2, 0.3); B.verbSend.gain.value = 0.6; B.verbOut.gain.value = 0.9; }
  else { B.verb.buffer = impulse(1.4, 3.5, 0.5); B.verbSend.gain.value = 0.25; B.verbOut.gain.value = 0.8; }
}

// Les échantillons enregistrés sont plus forts que l'ancienne synthèse : -28 % sur tout le son.
const MASTER_TRIM = 0.72;

export function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  B.master.gain.setTargetAtTime(settings.volume, t, 0.05);
  B.sfx.gain.setTargetAtTime(settings.sfxVolume ?? 0.85, t, 0.05);
  B.music.gain.setTargetAtTime(settings.musicVolume ?? 0.55, t, 0.05);
  B.amb.gain.setTargetAtTime((settings.musicVolume ?? 0.55) * 0.9 + 0.1, t, 0.05);
}

export function unlockAudio() {
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const p = pendingStart;
  pendingStart = [];
  for (const f of p) f();
}

export function onAudioReady(f) { if (ctx && ctx.state === 'running') f(); else pendingStart.push(f); }

export function setListener(x, y) { listener.x = x; listener.y = y; }
export function setSurface(s) { surface = s; }

// ---------- Échantillons optionnels ----------
const sampleVol = {}; // nom -> volume (clé "vol" du manifeste)
async function loadSamples() {
  try {
    const res = await fetch('assets/sfx/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    // { "hit": ["hit1.ogg", "hit2.ogg"], ..., "vol": { "hit": 0.8 } }
    const man = await res.json();
    Object.assign(sampleVol, man.vol || {});
    delete man.vol;
    const decode = (f) => fetch('assets/sfx/' + f).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(f)))
      .then((ab) => ctx.decodeAudioData(ab)).catch(() => null);
    await Promise.all(Object.entries(man).map(async ([name, files]) => {
      const bufs = await Promise.all(files.map(decode));
      samples[name] = bufs.filter(Boolean);
    }));
  } catch (e) { /* pas de manifeste : synthèse uniquement */ }
}

// ---------- Briques de synthèse ----------
function out(pan = 0, wet = 1) {
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(B.sfx);
  if (wet > 0) {
    const s = ctx.createGain();
    s.gain.value = wet;
    p.connect(s).connect(B.verbSend);
  }
  return p;
}

function env(g, t, a, d, vol, curve = 'exp') {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  else g.gain.linearRampToValueAtTime(0.0001, t + a + d);
}

function nz(dst, { t = 0, dur = 0.1, type = 'bandpass', f = 1000, f2 = null, q = 1, a = 0.003, vol = 0.3 }) {
  const t0 = ctx.currentTime + t;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.playbackRate.value = R(0.9, 1.1);
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.frequency.setValueAtTime(f, t0);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  fl.Q.value = q;
  const g = ctx.createGain();
  env(g, t0, a, dur, vol);
  s.connect(fl).connect(g).connect(dst);
  s.start(t0, Math.random() * 1.5);
  s.stop(t0 + a + dur + 0.05);
}

function osc(dst, { t = 0, dur = 0.2, type = 'sine', f = 200, f2 = null, a = 0.005, vol = 0.2, lp = null }) {
  const t0 = ctx.currentTime + t;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + a + dur);
  const g = ctx.createGain();
  env(g, t0, a, dur, vol);
  let node = o;
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; node = o.connect(fl); }
  node.connect(g).connect(dst);
  o.start(t0);
  o.stop(t0 + a + dur + 0.05);
}

// Métal : partiels inharmoniques qui décroissent vite (lame, cloche, enclume).
const METAL = [1, 2.32, 4.25, 6.63, 9.38, 13.2];
function metal(dst, { t = 0, f = 800, dur = 0.8, vol = 0.2, bright = 1 }) {
  const t0 = ctx.currentTime + t;
  METAL.forEach((r, i) => {
    if (f * r > 16000) return; // au-delà de l'audible
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f * r * R(0.995, 1.005);
    const g = ctx.createGain();
    const v = vol * Math.pow(0.62, i) * (i ? bright : 1);
    env(g, t0, 0.001, dur / (1 + i * 0.7), v);
    o.connect(g).connect(dst);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  });
  nz(dst, { t, dur: 0.02, type: 'highpass', f: 3000, vol: vol * 0.6 });
}

// Corde pincée (Karplus-Strong) : corde d'arc, luth.
export function pluckBuffer(f, dur = 1.2, damp = 0.996, bright = 0.5) {
  const key = `${Math.round(f)}_${dur}_${damp}_${bright}`;
  if (ksCache.has(key)) return ksCache.get(key);
  const sr = ctx.sampleRate;
  const N = Math.max(2, Math.round(sr / f));
  const len = Math.floor(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const line = new Float32Array(N);
  for (let i = 0; i < N; i++) line[i] = Math.random() * 2 - 1;
  let idx = 0, prev = 0;
  for (let i = 0; i < len; i++) {
    const cur = line[idx];
    const nv = damp * (bright * cur + (1 - bright) * prev);
    prev = cur;
    line[idx] = nv;
    d[i] = cur;
    idx = (idx + 1) % N;
  }
  ksCache.set(key, buf);
  return buf;
}

function pluck(dst, { t = 0, f = 200, dur = 1, vol = 0.3, damp = 0.994, bright = 0.5, lp = 4000 }) {
  const t0 = ctx.currentTime + t;
  const s = ctx.createBufferSource();
  s.buffer = pluckBuffer(f, dur, damp, bright);
  const fl = ctx.createBiquadFilter();
  fl.type = 'lowpass';
  fl.frequency.value = lp;
  const g = ctx.createGain();
  g.gain.value = vol;
  s.connect(fl).connect(g).connect(dst);
  s.start(t0);
}

// Grognement / voix grave : dent de scie + formants.
function growl(dst, { t = 0, f = 80, dur = 1, vol = 0.3, f2 = null, formants = [450, 900, 2400] }) {
  const t0 = ctx.currentTime + t;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = R(5, 9);
  const lg = ctx.createGain();
  lg.gain.value = f * 0.06;
  lfo.connect(lg).connect(o.frequency);
  const g = ctx.createGain();
  env(g, t0, dur * 0.15, dur * 0.85, vol);
  const mix = ctx.createGain();
  for (const ff of formants) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = ff;
    bp.Q.value = 5;
    o.connect(bp).connect(mix);
  }
  mix.connect(g).connect(dst);
  o.start(t0); lfo.start(t0);
  o.stop(t0 + dur + 0.1); lfo.stop(t0 + dur + 0.1);
  nz(dst, { t, dur, type: 'bandpass', f: 500, q: 0.8, a: dur * 0.2, vol: vol * 0.25 });
}

function thud(dst, { t = 0, f = 110, f2 = 45, dur = 0.15, vol = 0.4 }) {
  osc(dst, { t, f, f2, dur, vol, a: 0.002 });
  nz(dst, { t, dur: dur * 0.6, type: 'lowpass', f: 700, vol: vol * 0.5 });
}

function bones(dst, { t = 0, n = 6, spread = 0.2, vol = 0.15 }) {
  for (let i = 0; i < n; i++) nz(dst, { t: t + Math.random() * spread, dur: 0.02 + Math.random() * 0.03, type: 'bandpass', f: R(1500, 4200), q: R(3, 8), vol: vol * R(0.5, 1) });
}

// ---------- Bibliothèque de sons ----------
const SOUNDS = {
  step(d) {
    if (surface === 'stone') { nz(d, { dur: 0.045, f: R(700, 1100), q: 1.5, vol: 0.05 }); osc(d, { f: R(80, 100), f2: 50, dur: 0.05, vol: 0.05 }); }
    else { nz(d, { dur: 0.08, type: 'lowpass', f: R(500, 800), vol: 0.06 }); nz(d, { t: 0.01, dur: 0.04, f: 2500, q: 2, vol: 0.012 }); }
  },
  swing(d) { nz(d, { dur: 0.18, f: 500, f2: 2600, q: 1.4, a: 0.03, vol: 0.2 }); },
  heavy(d) { nz(d, { dur: 0.32, f: 280, f2: 1400, q: 1.1, a: 0.06, vol: 0.3 }); growl(d, { f: 110, f2: 80, dur: 0.35, vol: 0.08 }); },
  windup(d) { nz(d, { dur: 0.35, f: 300, f2: 900, q: 2, a: 0.25, vol: 0.06 }); },
  hit(d) { thud(d, { f: R(140, 170), f2: 55, dur: 0.1, vol: 0.35 }); nz(d, { dur: 0.05, f: R(1200, 1800), q: 1.5, vol: 0.18 }); bones(d, { n: 2, spread: 0.04, vol: 0.08 }); },
  crit(d) { thud(d, { f: 200, f2: 50, dur: 0.16, vol: 0.45 }); metal(d, { f: R(1100, 1400), dur: 0.35, vol: 0.08 }); nz(d, { dur: 0.08, f: 2400, q: 1, vol: 0.2 }); },
  hurt(d) { thud(d, { f: 120, f2: 40, dur: 0.2, vol: 0.5 }); nz(d, { dur: 0.12, type: 'lowpass', f: 600, vol: 0.25 }); growl(d, { f: R(150, 180), f2: 110, dur: 0.22, vol: 0.06, formants: [700, 1200] }); },
  block(d) { metal(d, { f: R(480, 560), dur: 0.7, vol: 0.22 }); thud(d, { f: 200, dur: 0.06, vol: 0.2 }); },
  roll(d) { nz(d, { dur: 0.28, type: 'lowpass', f: 900, f2: 300, a: 0.04, vol: 0.18 }); metal(d, { t: 0.05, f: 2600, dur: 0.12, vol: 0.02 }); metal(d, { t: 0.14, f: 3100, dur: 0.1, vol: 0.015 }); },
  pickup(d) { nz(d, { dur: 0.08, f: 1800, q: 1, vol: 0.08 }); metal(d, { t: 0.03, f: R(1300, 1600), dur: 0.25, vol: 0.05 }); },
  coin(d) { for (let i = 0; i < 3; i++) metal(d, { t: i * R(0.04, 0.07), f: R(2600, 3600), dur: 0.3, vol: 0.05 }); },
  levelup(d) {
    [146.8, 220, 293.7, 349.2].forEach((f, i) => growl(d, { t: i * 0.05, f, dur: 2.2, vol: 0.06, formants: [700, 1150, 2600] }));
    metal(d, { t: 0.1, f: 587, dur: 3, vol: 0.12 });
    metal(d, { t: 0.5, f: 880, dur: 3, vol: 0.08 });
  },
  death(d) {
    thud(d, { f: 70, f2: 25, dur: 1.2, vol: 0.6 });
    for (let i = 0; i < 4; i++) osc(d, { t: 0.6 + i * (0.5 + i * 0.25), f: 55, f2: 40, dur: 0.18, vol: 0.35 * (1 - i * 0.2) });
    growl(d, { t: 0.2, f: 73, f2: 55, dur: 3, vol: 0.08, formants: [500, 800] });
  },
  enemyDie(d) { bones(d, { n: 9, spread: 0.3, vol: 0.14 }); thud(d, { t: 0.05, f: 90, dur: 0.2, vol: 0.2 }); },
  ratDie(d) { nz(d, { dur: 0.12, f: 3000, f2: 1800, q: 6, vol: 0.12 }); thud(d, { f: 160, dur: 0.08, vol: 0.15 }); },
  alert(d) { growl(d, { f: R(90, 120), f2: 140, dur: 0.5, vol: 0.06 }); },
  cast(d) { osc(d, { f: 220, f2: 880, dur: 0.6, a: 0.2, vol: 0.06, type: 'triangle' }); nz(d, { dur: 0.6, f: 800, f2: 4000, q: 4, a: 0.3, vol: 0.06 }); },
  boom(d) { thud(d, { f: 80, f2: 28, dur: 0.6, vol: 0.55 }); nz(d, { dur: 0.6, type: 'lowpass', f: 500, f2: 120, vol: 0.4 }); bones(d, { t: 0.05, n: 6, spread: 0.3, vol: 0.06 }); },
  arrow(d) { pluck(d, { f: R(95, 115), dur: 0.35, vol: 0.35, damp: 0.985, bright: 0.6, lp: 2500 }); nz(d, { t: 0.01, dur: 0.12, f: 2500, f2: 5000, q: 2, vol: 0.06 }); },
  enemyArrow(d) { pluck(d, { f: R(140, 160), dur: 0.25, vol: 0.2, damp: 0.98, bright: 0.55, lp: 2000 }); },
  arrowHit(d) { thud(d, { f: 220, f2: 90, dur: 0.05, vol: 0.15 }); nz(d, { dur: 0.03, f: 2500, q: 3, vol: 0.08 }); },
  ui(d) { nz(d, { dur: 0.035, f: 2200, q: 3, vol: 0.06 }); osc(d, { f: 340, f2: 260, dur: 0.05, vol: 0.03 }); },
  page(d) { nz(d, { dur: 0.22, f: 3500, f2: 1400, q: 0.8, a: 0.04, vol: 0.06 }); },
  error(d) { thud(d, { f: 90, dur: 0.12, vol: 0.2 }); metal(d, { f: 180, dur: 0.2, vol: 0.04 }); },
  portal(d) { growl(d, { f: 55, f2: 82, dur: 2.2, vol: 0.1, formants: [300, 600] }); osc(d, { f: 110, f2: 440, dur: 1.8, a: 0.6, vol: 0.06, type: 'triangle' }); nz(d, { dur: 1.8, f: 400, f2: 3000, q: 3, a: 1, vol: 0.06 }); },
  quest(d) { metal(d, { f: 392, dur: 2.5, vol: 0.12 }); metal(d, { t: 0.18, f: 587, dur: 2.5, vol: 0.09 }); },
  potion(d) { for (let i = 0; i < 4; i++) osc(d, { t: i * 0.07, f: R(280, 480), f2: R(500, 700), dur: 0.05, vol: 0.06 }); nz(d, { dur: 0.3, type: 'lowpass', f: 900, vol: 0.06 }); osc(d, { t: 0.3, f: 220, f2: 660, dur: 0.5, a: 0.1, vol: 0.04, type: 'triangle' }); },
  bossRoar(d) { growl(d, { f: 62, f2: 48, dur: 1.6, vol: 0.32 }); thud(d, { f: 60, dur: 0.8, vol: 0.3 }); nz(d, { dur: 1.3, type: 'lowpass', f: 400, a: 0.3, vol: 0.2 }); },
  bossWindup(d) { growl(d, { f: 70, f2: 95, dur: 0.7, vol: 0.12 }); },
  trap(d) { metal(d, { f: 900, dur: 0.25, vol: 0.18 }); thud(d, { f: 180, dur: 0.08, vol: 0.25 }); nz(d, { dur: 0.04, type: 'highpass', f: 3000, vol: 0.15 }); },
  chest(d) { growl(d, { f: 140, f2: 190, dur: 0.5, vol: 0.05, formants: [500, 1500] }); metal(d, { t: 0.35, f: 700, dur: 0.3, vol: 0.06 }); },
  bell(d) { metal(d, { f: 98, dur: 7, vol: 0.25, bright: 0.7 }); metal(d, { t: 0.02, f: 196.5, dur: 5, vol: 0.08 }); },
  heart(d) { osc(d, { f: 55, f2: 40, dur: 0.12, vol: 0.3 }); osc(d, { t: 0.18, f: 50, f2: 38, dur: 0.12, vol: 0.22 }); },
  bones(d) { bones(d, { n: 9, spread: 0.3, vol: 0.14 }); },
  ghoul(d) { growl(d, { f: 120, f2: 90, dur: 0.5, vol: 0.1 }); },
  slash(d) { nz(d, { dur: 0.08, f: 3000, f2: 1200, q: 2, vol: 0.15 }); },
};

// Volume / pan selon la distance au joueur.
function spatial(opts) {
  if (!opts || opts.x === undefined) return { v: 1, pan: 0 };
  const dx = opts.x - listener.x, dy = opts.y - listener.y;
  const d = Math.hypot(dx, dy);
  const v = Math.max(0, 1 - d / 950);
  return { v: v * v, pan: Math.max(-0.8, Math.min(0.8, dx / 700)) };
}

export function sfx(name, opts = null) {
  if (!ensure() || ctx.state !== 'running' || settings.volume <= 0) return;
  const now = performance.now();
  if (lastPlay[name] && now - lastPlay[name] < 35) return; // évite la saturation
  lastPlay[name] = now;
  const sp = spatial(opts);
  if (sp.v <= 0.01) return;
  const vol = sp.v * (opts && opts.vol !== undefined ? opts.vol : 1);
  const g = ctx.createGain();
  g.gain.value = vol;
  const wet = opts && opts.dry ? 0 : 1;
  g.connect(out(sp.pan, wet));
  // Échantillon réel si disponible
  // les pas existent par surface (step_stone, step_dirt…)
  const key = name === 'step' && samples['step_' + surface] && samples['step_' + surface].length ? 'step_' + surface : name;
  const smp = samples[key];
  if (smp && smp.length) {
    const s = ctx.createBufferSource();
    s.buffer = smp[Math.floor(Math.random() * smp.length)];
    s.playbackRate.value = R(0.94, 1.06) * (opts && opts.rate ? opts.rate : 1);
    if (sampleVol[key] !== undefined) g.gain.value = vol * sampleVol[key];
    s.connect(g);
    s.start();
    return;
  }
  try { SOUNDS[name] && SOUNDS[name](g); } catch (e) { /* ignore */ }
}
