// Musique et ambiances générées en direct (aucun fichier) : luth, chœurs, drones, percussions, vent, gouttes.
import { getAudio, onAudioReady } from './audio.js';

const R = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Ré mineur naturel
const D_MINOR = [62, 64, 65, 67, 69, 70, 72];
const CHORDS = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]]; // Dm Bb Gm A

let current = null; // { name, gain, timer, nodes, stop }
let currentAmb = null;
let wanted = { music: null, amb: null, depth: 1 };

// ---------- Instruments ----------
function choir(A, dst, t, f, dur, vol) {
  const { ctx } = A;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  const mix = ctx.createGain();
  for (const ff of [650, 1080, 2650]) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 6;
    mix.connect(bp).connect(g);
  }
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 3000;
  for (const det of [-9, 0, 8]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = det + R(-3, 3);
    const vib = ctx.createOscillator(); vib.frequency.value = R(4.5, 5.5);
    const vg = ctx.createGain(); vg.gain.value = 4;
    vib.connect(vg).connect(o.detune);
    o.connect(lp);
    o.start(t); vib.start(t); o.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
  }
  lp.connect(mix);
  g.connect(dst);
}

function pad(A, dst, t, f, dur, vol, cutoff = 900) {
  const { ctx } = A;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.5;
  for (const det of [-6, 6]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
    o.connect(lp); o.start(t); o.stop(t + dur + 0.1);
  }
  lp.connect(g).connect(dst);
}

function lute(A, dst, t, f, vol) {
  const { ctx, pluckBuffer } = A;
  const s = ctx.createBufferSource();
  s.buffer = pluckBuffer(f, 2.2, 0.997, 0.45);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(lp).connect(g).connect(dst);
  s.start(t);
}

function bell(A, dst, t, f, vol, dur = 5) {
  const { ctx } = A;
  [1, 2.32, 4.25, 6.63].forEach((r, i) => {
    const o = ctx.createOscillator();
    o.frequency.value = f * r;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol * Math.pow(0.5, i), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (1 + i * 0.6));
    o.connect(g).connect(dst);
    o.start(t); o.stop(t + dur);
  });
}

function drum(A, dst, t, f, vol, dur = 0.5) {
  const { ctx, noiseBuf } = A;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(f * 2, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dst);
  o.start(t); o.stop(t + dur);
  const n = ctx.createBufferSource(); n.buffer = noiseBuf;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vol * 0.5, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  n.connect(lp).connect(ng).connect(dst);
  n.start(t, Math.random()); n.stop(t + 0.2);
}

function bass(A, dst, t, f, dur, vol) {
  const { ctx } = A;
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(200, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp).connect(g).connect(dst);
  o.start(t); o.stop(t + dur + 0.05);
}

// Nœud continu (drone, vent) : renvoie une fonction d'arrêt.
function drone(A, dst, f, vol, cutoff) {
  const { ctx } = A;
  const g = ctx.createGain(); g.gain.value = vol;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 2;
  const lfo = ctx.createOscillator(); lfo.frequency.value = R(0.05, 0.12);
  const lg = ctx.createGain(); lg.gain.value = cutoff * 0.5;
  lfo.connect(lg).connect(lp.frequency);
  const os = [];
  for (const [ff, type, det] of [[f, 'sawtooth', -5], [f, 'sawtooth', 5], [f / 2, 'sine', 0], [f * 1.5, 'sine', 3]]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = ff; o.detune.value = det;
    o.connect(lp); o.start(); os.push(o);
  }
  lfo.start();
  lp.connect(g).connect(dst);
  return () => { for (const o of os) o.stop(); lfo.stop(); };
}

function wind(A, dst, vol, f = 400) {
  const { ctx, noiseBuf } = A;
  const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.8;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lg = ctx.createGain(); lg.gain.value = f * 0.6;
  lfo.connect(lg).connect(bp.frequency);
  const g = ctx.createGain(); g.gain.value = vol;
  const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.11;
  const lg2 = ctx.createGain(); lg2.gain.value = vol * 0.6;
  lfo2.connect(lg2).connect(g.gain);
  n.connect(bp).connect(g).connect(dst);
  n.start(); lfo.start(); lfo2.start();
  return () => { n.stop(); lfo.stop(); lfo2.stop(); };
}

// ---------- Morceaux ----------
// Chaque morceau : start(A, dst) -> { tick(t0, horizon), stop() }
const TRACKS = {
  title(A, dst) {
    const stopDrone = drone(A, dst, midi(38), 0.05, 300);
    let next = 0, chord = 0;
    return {
      tick(now) {
        if (next < now) next = now + 0.1;
        while (next < now + 1) {
          const c = CHORDS[chord % CHORDS.length];
          for (const n of c.slice(1)) choir(A, dst, next, midi(n), 9, 0.018);
          if (Math.random() < 0.6) bell(A, dst, next + R(1, 4), midi(pick(D_MINOR) + 12), 0.03);
          next += 8; chord++;
        }
      },
      stop() { stopDrone(); },
    };
  },
  village(A, dst) {
    const stopDrone = drone(A, dst, midi(38), 0.025, 250);
    let next = 0, step = 0, chord = 0;
    const beat = 0.62;
    return {
      tick(now) {
        if (next < now) next = now + 0.1;
        while (next < now + 1) {
          const c = CHORDS[chord % CHORDS.length];
          if (step % 16 === 0) for (const n of c) pad(A, dst, next, midi(n), beat * 16, 0.012, 700);
          // Arpège de luth irrégulier (des silences, comme une improvisation au coin du feu)
          if (Math.random() < 0.72) {
            const n = step % 4 === 0 ? c[0] + 12 : pick(c.slice(1)) + (Math.random() < 0.3 ? 12 : 0);
            lute(A, dst, next + R(0, 0.03), midi(n), 0.16);
          }
          if (step % 8 === 6 && Math.random() < 0.4) lute(A, dst, next + beat / 2, midi(pick(D_MINOR)), 0.1);
          next += beat; step++;
          if (step % 16 === 0) chord++;
        }
      },
      stop() { stopDrone(); },
    };
  },
  dungeon(A, dst, depth = 1) {
    const stops = [drone(A, dst, midi(26), 0.05, 220), drone(A, dst, midi(33), 0.025, 180)];
    let next = 0, pulse = 0;
    return {
      tick(now) {
        if (next < now) next = now + 0.1;
        while (next < now + 1) {
          const r = Math.random();
          if (r < 0.06) choir(A, dst, next, midi(pick([50, 53, 57, 58])), R(7, 11), 0.022);
          else if (r < 0.1) bell(A, dst, next, midi(pick([38, 39, 44])), 0.05, 7); // cloche lointaine, dissonante
          else if (r < 0.14) drum(A, dst, next, 40, 0.12, 1.2);
          if (depth >= 3 && pulse % 4 === 0) drum(A, dst, next, 45, 0.05, 0.4); // cœur des profondeurs
          next += 0.75; pulse++;
        }
      },
      stop() { for (const s of stops) s(); },
    };
  },
  boss(A, dst) {
    const stopDrone = drone(A, dst, midi(26), 0.04, 400);
    let next = 0, step = 0;
    const s16 = 60 / 96 / 2; // croches à 96 bpm
    const riff = [38, 38, 41, 38, 43, 38, 44, 43];
    return {
      tick(now) {
        if (next < now) next = now + 0.1;
        while (next < now + 0.6) {
          const b = step % 16;
          if (b === 0 || b === 6 || b === 10) drum(A, dst, next, 48, 0.32, 0.6);
          if (b === 4 || b === 12) drum(A, dst, next, 85, 0.18, 0.3);
          bass(A, dst, next, midi(riff[step % 8]), s16 * 0.9, 0.07);
          if (step % 32 === 0) {
            for (const n of [62, 65, 69]) choir(A, dst, next, midi(n), s16 * 30, 0.025);
            bell(A, dst, next, midi(50), 0.06, 3);
          }
          if (step % 32 === 16) for (const n of [61, 64, 69]) choir(A, dst, next, midi(n), s16 * 30, 0.025);
          next += s16; step++;
        }
      },
      stop() { stopDrone(); },
    };
  },
};

const AMBIENCES = {
  dungeon(A, dst) {
    const stops = [wind(A, dst, 0.05, 300), wind(A, dst, 0.025, 900)];
    let next = 0;
    return {
      tick(now) {
        if (next < now) next = now + 0.5;
        while (next < now + 1) {
          if (Math.random() < 0.35) lute(A, dst, next, R(1800, 3200), 0.05); // goutte d'eau
          if (Math.random() < 0.04) drum(A, dst, next, 30, 0.05, 1.5); // grondement
          next += R(0.6, 1.8);
        }
      },
      stop() { for (const s of stops) s(); },
    };
  },
  village(A, dst) {
    const stops = [wind(A, dst, 0.03, 500)];
    let next = 0;
    const { ctx } = A;
    return {
      tick(now) {
        if (next < now) next = now + 0.5;
        while (next < now + 1) {
          // grillons
          if (Math.random() < 0.5) {
            const f = R(4200, 4800);
            for (let i = 0; i < 3; i++) {
              const o = ctx.createOscillator(); o.frequency.value = f;
              const g = ctx.createGain();
              const t = next + i * 0.06;
              g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.006, t + 0.01); g.gain.linearRampToValueAtTime(0.0001, t + 0.04);
              o.connect(g).connect(dst); o.start(t); o.stop(t + 0.05);
            }
          }
          // crépitement du feu
          if (Math.random() < 0.6) drum(A, dst, next + R(0, 0.3), R(800, 1500), 0.008, 0.03);
          next += R(0.4, 1.2);
        }
      },
      stop() { for (const s of stops) s(); },
    };
  },
};

// ---------- Gestion / fondus ----------
function startLayer(kind, name, arg) {
  const A = getAudio();
  if (!A) return null;
  const { ctx, B } = A;
  const lib = kind === 'music' ? TRACKS : AMBIENCES;
  if (!lib[name]) return null;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
  gain.connect(kind === 'music' ? B.music : B.amb);
  // un peu de réverbération pour la musique
  const send = ctx.createGain(); send.gain.value = kind === 'music' ? 0.35 : 0.2;
  gain.connect(send).connect(B.verbSend);
  const inst = lib[name](A, gain, arg);
  const timer = setInterval(() => inst.tick(ctx.currentTime), 200);
  inst.tick(ctx.currentTime);
  return {
    name, arg, gain,
    stop(fade = 2) {
      clearInterval(timer);
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0.0001, t + fade);
      setTimeout(() => { try { inst.stop(); } catch (e) { /* déjà arrêté */ } gain.disconnect(); }, fade * 1000 + 200);
    },
  };
}

export function playMusic(name, arg) {
  wanted.music = name;
  wanted.depth = arg;
  onAudioReady(() => {
    if (wanted.music !== name) return;
    if (current && current.name === name && current.arg === arg) return;
    if (current) current.stop(name === null ? 3 : 2);
    current = name ? startLayer('music', name, arg) : null;
  });
}

export function playAmbience(name) {
  wanted.amb = name;
  onAudioReady(() => {
    if (wanted.amb !== name) return;
    if (currentAmb && currentAmb.name === name) return;
    if (currentAmb) currentAmb.stop(2);
    currentAmb = name ? startLayer('amb', name) : null;
  });
}

export function stopAll(fade = 2) {
  wanted = { music: null, amb: null };
  if (current) current.stop(fade);
  if (currentAmb) currentAmb.stop(fade);
  current = currentAmb = null;
}
