// Décors en pixel art (tuiles LPC) : atlas assets/tiles/tiles.png + tiles.json.
// Chaque entrée : [x, y, w, h] (+ ax, ay pour les maisons : ancre au pied du mur).
const TL = { img: null, meta: null, ready: false };

export async function loadTiles() {
  try {
    TL.meta = await (await fetch('assets/tiles/tiles.json')).json();
    TL.img = await new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = 'assets/tiles/tiles.png'; });
    TL.ready = true;
  } catch (e) { TL.ready = false; }
  return TL.ready;
}

export const hasTiles = () => TL.ready;
export const tileMeta = (name) => TL.meta && TL.meta[name];

// Dessine l'élément entier (ou une sous-partie sx, sy, sw, sh relative à l'élément) en (x, y) coin haut-gauche.
export function drawT(g, name, x, y, sub = null, flip = false) {
  const m = TL.meta && TL.meta[name];
  if (!m) return false;
  const [ex, ey, ew, eh] = m;
  const sx = sub ? ex + sub[0] : ex, sy = sub ? ey + sub[1] : ey;
  const sw = sub ? sub[2] : ew, sh = sub ? sub[3] : eh;
  if (flip) {
    g.save(); g.translate(x + sw, y); g.scale(-1, 1);
    g.drawImage(TL.img, sx, sy, sw, sh, 0, 0, sw, sh);
    g.restore();
  } else g.drawImage(TL.img, sx, sy, sw, sh, x, y, sw, sh);
  return true;
}

// Dessine un objet posé au sol : (x, y) = milieu de sa base.
export function drawProp(g, name, x, y, flip = false) {
  const m = TL.meta && TL.meta[name];
  if (!m) return false;
  const ax = m[4] !== undefined ? m[4] : m[2] / 2;
  const ay = m[5] !== undefined ? m[5] : m[3];
  return drawT(g, name, Math.round(x - ax), Math.round(y - ay), null, flip);
}
