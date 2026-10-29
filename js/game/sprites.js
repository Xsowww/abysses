// Sprites animés (personnages LPC) : chargement des atlas et dessin d'une frame.
// Atlas : assets/sprites/<nom>.png ; métadonnées : assets/sprites/sprites.json
// Chaque animation : { y, fs (taille de case), frames, dirs (4 ou 1), ax, ay (ancre aux pieds) }
// Ordre des directions LPC : 0 = haut, 1 = gauche, 2 = bas, 3 = droite.

const SPR = { meta: null, img: {}, ready: false };
let tint = null; // petit canvas réutilisé pour les flashs

export async function loadSprites() {
  try {
    const res = await fetch('assets/sprites/sprites.json');
    SPR.meta = await res.json();
    await Promise.all(Object.keys(SPR.meta).map((name) => new Promise((ok) => {
      const im = new Image();
      im.onload = () => { SPR.img[name] = im; ok(); };
      im.onerror = () => ok();
      im.src = `assets/sprites/${name}.png`;
    })));
    SPR.ready = true;
  } catch (e) {
    SPR.ready = false;
  }
  return SPR.ready;
}

export function hasSprite(name) { return SPR.ready && !!SPR.img[name] && !!SPR.meta[name]; }
export function spriteMeta(name) { return SPR.meta && SPR.meta[name]; }

// Angle (radians, 0 = droite) -> ligne de direction LPC
export function dirFromAngle(a) {
  const c = Math.cos(a), s = Math.sin(a);
  if (Math.abs(c) > Math.abs(s) * 0.92) return c > 0 ? 3 : 1;
  return s > 0 ? 2 : 0;
}

// Dessine une frame. o : { anim, frame, dir, scale, alpha, flash (0..1), shadow (bool), squashX, squashY, rot }
export function drawSprite(ctx, name, x, y, o = {}) {
  const im = SPR.img[name];
  const M = SPR.meta[name];
  if (!im || !M) return false;
  const A = M[o.anim] || M.walk;
  const fr = Math.max(0, Math.min(A.frames - 1, Math.floor(o.frame || 0)));
  const dir = A.dirs === 1 ? 0 : (o.dir ?? 2);
  drawFrame(ctx, im, fr * A.fs, A.y + dir * A.fs, A.fs, A.ax, A.ay, x, y, o);
  return true;
}

// Dessine une case carrée (fs) d'une image, ancrée aux pieds (ax, ay), avec ombre / flash / écrasement.
export function drawFrame(ctx, im, sx, sy, fs, ax, ay, x, y, o = {}) {
  const sc = o.scale || 1;
  if (o.shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 13 * sc, 5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(sc * (o.squashX || 1), sc * (o.squashY || 1));
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.drawImage(im, sx, sy, fs, fs, -ax, -ay, fs, fs);
  if (o.flash > 0) {
    // Flash blanc limité à la silhouette
    if (!tint) { tint = document.createElement('canvas'); tint.width = tint.height = 192; }
    const tc = tint.getContext('2d');
    tc.clearRect(0, 0, fs, fs);
    tc.globalCompositeOperation = 'source-over';
    tc.drawImage(im, sx, sy, fs, fs, 0, 0, fs, fs);
    tc.globalCompositeOperation = 'source-atop';
    tc.fillStyle = `rgba(255,245,235,${Math.min(1, o.flash)})`;
    tc.fillRect(0, 0, fs, fs);
    ctx.drawImage(tint, 0, 0, fs, fs, -ax, -ay, fs, fs);
  }
  ctx.restore();
}

// Frame de marche/course selon une phase continue (cycle sans la frame 0 « debout »)
export function walkFrame(name, anim, phase) {
  const M = SPR.meta && SPR.meta[name];
  const A = M && (M[anim] || M.walk);
  if (!A) return 0;
  if (anim === 'walk') return 1 + (Math.floor(phase) % (A.frames - 1));
  return Math.floor(phase) % A.frames;
}

export function animFrames(name, anim) {
  const M = SPR.meta && SPR.meta[name];
  return M && M[anim] ? M[anim].frames : 0;
}
