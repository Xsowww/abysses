// Effets sonores synthétisés (aucun fichier audio à charger).
import { settings } from './save.js';

let ctx = null;
let noiseBuf = null;
const lastPlay = {};

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ctx = null; }
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

function tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, delay = 0) {
  const c = ctx;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol * settings.volume, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.3, freq = 1000, q = 1, delay = 0) {
  const c = ctx;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol * settings.volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
  s.stop(t + dur + 0.02);
}

const SOUNDS = {
  swing: () => noise(0.12, 0.25, 1800, 0.8),
  heavy: () => { noise(0.25, 0.35, 700, 0.7); tone(120, 0.2, 'sawtooth', 0.12, 60); },
  hit: () => { noise(0.08, 0.35, 600, 1.5); tone(180, 0.08, 'square', 0.08, 90); },
  crit: () => { noise(0.1, 0.4, 900, 1.5); tone(500, 0.12, 'square', 0.1, 200); },
  hurt: () => { tone(220, 0.18, 'sawtooth', 0.18, 90); noise(0.1, 0.2, 400); },
  block: () => { tone(900, 0.1, 'square', 0.12, 600); noise(0.06, 0.2, 3000, 2); },
  roll: () => noise(0.18, 0.18, 500, 0.6),
  pickup: () => { tone(660, 0.07, 'triangle', 0.18); tone(990, 0.09, 'triangle', 0.15, null, 0.05); },
  coin: () => { tone(1320, 0.06, 'square', 0.07); tone(1760, 0.08, 'square', 0.06, null, 0.04); },
  levelup: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, null, i * 0.09)); },
  death: () => { tone(300, 0.8, 'sawtooth', 0.2, 50); noise(0.6, 0.2, 300); },
  enemyDie: () => { noise(0.15, 0.25, 350, 1); tone(160, 0.15, 'triangle', 0.1, 70); },
  cast: () => tone(300, 0.35, 'sine', 0.12, 700),
  boom: () => { noise(0.4, 0.45, 200, 0.6); tone(80, 0.4, 'sine', 0.3, 40); },
  arrow: () => noise(0.08, 0.15, 2500, 2),
  ui: () => tone(720, 0.05, 'triangle', 0.1),
  error: () => tone(160, 0.15, 'square', 0.1),
  portal: () => { tone(200, 1.0, 'sine', 0.15, 800); tone(300, 1.0, 'sine', 0.1, 1200, 0.1); },
  quest: () => { [392, 523, 659].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, null, i * 0.12)); },
  potion: () => { tone(400, 0.2, 'sine', 0.15, 900); },
  bossRoar: () => { tone(90, 0.9, 'sawtooth', 0.22, 45); noise(0.8, 0.25, 250, 0.5); },
};

export function sfx(name) {
  if (!ensure() || settings.volume <= 0) return;
  const now = performance.now();
  if (lastPlay[name] && now - lastPlay[name] < 40) return; // évite la saturation
  lastPlay[name] = now;
  try { SOUNDS[name] && SOUNDS[name](); } catch (e) { /* ignore */ }
}
