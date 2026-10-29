// Carte en tuiles : collisions, ligne de vue, champ de distance pour le déplacement des monstres.

export const TILE = 32;

export const T = {
  VOID: 0, FLOOR: 1, WALL: 2,
  GRASS: 3, PATH: 4, PLAZA: 5, WATER: 6, HOUSE: 7, FENCE: 8, TREE: 9, PORTAL_FLOOR: 10, PROP: 11,
};

export const TILE_PROPS = {
  [T.VOID]: { solid: true, opaque: true },
  [T.FLOOR]: { solid: false, opaque: false },
  [T.WALL]: { solid: true, opaque: true },
  [T.GRASS]: { solid: false, opaque: false },
  [T.PATH]: { solid: false, opaque: false },
  [T.PLAZA]: { solid: false, opaque: false },
  [T.WATER]: { solid: true, opaque: false },
  [T.HOUSE]: { solid: true, opaque: true },
  [T.FENCE]: { solid: true, opaque: false },
  [T.TREE]: { solid: true, opaque: false },
  [T.PORTAL_FLOOR]: { solid: false, opaque: false },
  [T.PROP]: { solid: true, opaque: false },
};

export class TileMap {
  constructor(w, h, fill = T.WALL) {
    this.w = w;
    this.h = h;
    this.tiles = new Uint8Array(w * h).fill(fill);
    this.explored = new Uint8Array(w * h);
    this.cache = null; // rendu pré-calculé
    this.flow = new Int16Array(w * h);
    this.flowQueue = new Int32Array(w * h);
  }

  inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; }
  get(tx, ty) { return this.inBounds(tx, ty) ? this.tiles[ty * this.w + tx] : T.VOID; }
  set(tx, ty, v) { if (this.inBounds(tx, ty)) this.tiles[ty * this.w + tx] = v; }
  isSolid(tx, ty) { return TILE_PROPS[this.get(tx, ty)].solid; }
  isOpaque(tx, ty) { return TILE_PROPS[this.get(tx, ty)].opaque; }
  solidAt(x, y) { return this.isSolid(Math.floor(x / TILE), Math.floor(y / TILE)); }

  fillRect(x, y, w, h, v) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, v);
  }

  // Le cercle (x, y, r) touche-t-il une tuile solide ?
  collides(x, y, r) {
    const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.isSolid(tx, ty)) continue;
        // distance du centre au rectangle de la tuile
        const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
        const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
        if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
      }
    }
    return false;
  }

  // Déplace une entité en glissant le long des murs. Renvoie true si bloqué.
  move(ent, dx, dy) {
    let blocked = false;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (ent.r * 0.8)));
    const sx = dx / steps, sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (sx) {
        if (!this.collides(ent.x + sx, ent.y, ent.r)) ent.x += sx;
        else blocked = true;
      }
      if (sy) {
        if (!this.collides(ent.x, ent.y + sy, ent.r)) ent.y += sy;
        else blocked = true;
      }
    }
    return blocked;
  }

  lineOfSight(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 12);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.isOpaque(Math.floor((x0 + (x1 - x0) * t) / TILE), Math.floor((y0 + (y1 - y0) * t) / TILE))) return false;
    }
    return true;
  }

  // Parcours en largeur depuis la cible : distance en tuiles vers le joueur.
  computeFlow(x, y, maxDist = 40) {
    const { w, h, flow, flowQueue: q } = this;
    flow.fill(-1);
    const sx = Math.floor(x / TILE), sy = Math.floor(y / TILE);
    if (!this.inBounds(sx, sy)) return;
    let head = 0, tail = 0;
    flow[sy * w + sx] = 0;
    q[tail++] = sy * w + sx;
    while (head < tail) {
      const c = q[head++];
      const d = flow[c];
      if (d >= maxDist) continue;
      const cx = c % w, cy = (c / w) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0);
        const ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (flow[ni] !== -1 || TILE_PROPS[this.tiles[ni]].solid) continue;
        flow[ni] = d + 1;
        q[tail++] = ni;
      }
    }
  }

  // Direction à suivre (vers une tuile voisine plus proche du joueur).
  flowDir(x, y) {
    const { w, flow } = this;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const here = this.inBounds(tx, ty) ? flow[ty * w + tx] : -1;
    if (here < 0) return null;
    let best = here, bx = 0, by = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = tx + ox, ny = ty + oy;
        if (!this.inBounds(nx, ny)) continue;
        const v = flow[ny * w + nx];
        if (v < 0 || v >= best) continue;
        // diagonale : éviter de couper les coins
        if (ox && oy && (this.isSolid(tx + ox, ty) || this.isSolid(tx, ty + oy))) continue;
        best = v; bx = ox; by = oy;
      }
    }
    if (!bx && !by) return null;
    const cx = (tx + bx + 0.5) * TILE, cy = (ty + by + 0.5) * TILE;
    const dx = cx - x, dy = cy - y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l, d: here };
  }

  reveal(x, y, radiusTiles) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const r2 = radiusTiles * radiusTiles;
    for (let j = -radiusTiles; j <= radiusTiles; j++) {
      for (let i = -radiusTiles; i <= radiusTiles; i++) {
        if (i * i + j * j > r2) continue;
        const nx = tx + i, ny = ty + j;
        if (this.inBounds(nx, ny)) this.explored[ny * this.w + nx] = 1;
      }
    }
  }
}
