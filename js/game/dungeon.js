// Génération procédurale d'un donjon : salles + couloirs.
import { TileMap, T, TILE } from './world.js';
import { randInt, rand, pick, shuffle, weightedPick, chance } from '../core/util.js';
import { enemyPool } from '../data/enemies.js';
import { INSCRIPTIONS } from '../data/story.js';

function overlaps(a, b, m) {
  return a.x - m < b.x + b.w && a.x + a.w + m > b.x && a.y - m < b.y + b.h && a.y + a.h + m > b.y;
}

const center = (r) => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });

function carveCorridor(map, a, b, width) {
  const half = Math.floor(width / 2);
  const horizFirst = chance(0.5);
  const carveH = (x0, x1, y) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let k = -half; k < width - half; k++) map.set(x, y + k, T.FLOOR); };
  const carveV = (y0, y1, x) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let k = -half; k < width - half; k++) map.set(x + k, y, T.FLOOR); };
  if (horizFirst) { carveH(a.x, b.x, a.y); carveV(a.y, b.y, b.x); }
  else { carveV(a.y, b.y, a.x); carveH(a.x, b.x, b.y); }
}

export function generateDungeon(depth) {
  const W = 64 + Math.min(depth, 6) * 4;
  const H = W;
  const map = new TileMap(W, H, T.WALL);
  const rooms = [];
  const target = 9 + Math.min(depth, 6);
  for (let tries = 0; tries < 400 && rooms.length < target; tries++) {
    const w = randInt(8, 14), h = randInt(7, 12);
    const r = { x: randInt(3, W - w - 4), y: randInt(3, H - h - 4), w, h };
    if (rooms.some((o) => overlaps(r, o, 3))) continue;
    rooms.push(r);
  }

  for (const r of rooms) map.fillRect(r.x, r.y, r.w, r.h, T.FLOOR);

  // Arbre couvrant minimal (Prim) pour relier les salles + quelques boucles.
  const centers = rooms.map(center);
  const inTree = [0];
  const edges = [];
  const remaining = new Set(rooms.map((_, i) => i).slice(1));
  while (remaining.size) {
    let best = null;
    for (const i of inTree) for (const j of remaining) {
      const d = Math.abs(centers[i].x - centers[j].x) + Math.abs(centers[i].y - centers[j].y);
      if (!best || d < best.d) best = { i, j, d };
    }
    edges.push(best);
    inTree.push(best.j);
    remaining.delete(best.j);
  }
  for (let k = 0; k < 2 + Math.floor(depth / 2); k++) {
    const i = randInt(0, rooms.length - 1), j = randInt(0, rooms.length - 1);
    if (i !== j) edges.push({ i, j });
  }
  for (const e of edges) carveCorridor(map, centers[e.i], centers[e.j], chance(0.5) ? 3 : 2);

  // Distance (en tuiles) depuis la salle de départ.
  const startIdx = randInt(0, rooms.length - 1);
  const sc = centers[startIdx];
  map.computeFlow((sc.x + 0.5) * TILE, (sc.y + 0.5) * TILE, 9999);
  const roomDist = centers.map((c) => map.flow[c.y * W + c.x]);

  // Salle du boss : la plus éloignée. On l'agrandit.
  let bossIdx = 0;
  roomDist.forEach((d, i) => { if (d > roomDist[bossIdx]) bossIdx = i; });
  const br = rooms[bossIdx];
  const bc = centers[bossIdx];
  const bw = Math.max(br.w, 16), bh = Math.max(br.h, 14);
  const bx = Math.max(2, Math.min(W - bw - 2, bc.x - Math.floor(bw / 2)));
  const by = Math.max(2, Math.min(H - bh - 2, bc.y - Math.floor(bh / 2)));
  Object.assign(br, { x: bx, y: by, w: bw, h: bh });
  map.fillRect(bx, by, bw, bh, T.FLOOR);
  centers[bossIdx] = center(br);

  // Bordure de sécurité.
  for (let x = 0; x < W; x++) { map.set(x, 0, T.WALL); map.set(x, H - 1, T.WALL); }
  for (let y = 0; y < H; y++) { map.set(0, y, T.WALL); map.set(W - 1, y, T.WALL); }

  // ---------- Mobilier (objets solides dessinés triés en profondeur) ----------
  const props = [];      // { name, x, y (base, px), flip }
  const wallDecor = [];  // { name, tx, ty } : posé sur la face d'un mur (cellule de mur au-dessus d'un sol)
  const isW = (x, y) => map.get(x, y) === T.WALL;
  const isF = (x, y) => map.get(x, y) === T.FLOOR;
  // Peut-on poser un objet de largeur w (cases) en (x, y) sans boucher un passage ?
  const free = (x, y, w = 1) => {
    for (let i = -1; i <= w; i++) for (let j = -1; j <= 1; j++) {
      const t = map.get(x + i, y + j);
      if (t === T.PROP) return false;
    }
    for (let i = 0; i < w; i++) if (!isF(x + i, y)) return false;
    return true;
  };
  const putProp = (name, x, y, w = 1, flip = false) => {
    if (!free(x, y, w)) return false;
    for (let i = 0; i < w; i++) map.set(x + i, y, T.PROP);
    props.push({ name, x: (x + w / 2) * TILE, y: (y + 1) * TILE - 1, flip });
    return true;
  };
  // Le long du mur nord d'une salle : cases dont le mur au-dessus est plein sur w+2 cases (pas d'ouverture).
  const northSpots = (r, w = 1) => {
    const out = [];
    for (let x = r.x + 1; x <= r.x + r.w - 1 - w; x++) {
      let ok = true;
      for (let i = -1; i <= w; i++) if (!isW(x + i, r.y - 1)) ok = false;
      if (ok) out.push(x);
    }
    return out;
  };
  const STYLES = ['hall', 'crypt', 'ossuary', 'shrine', 'store', 'bare'];
  rooms.forEach((r, idx) => {
    const isStart = idx === startIdx, isBoss = idx === bossIdx;
    const style = isBoss ? 'boss' : isStart ? 'start' : pick(STYLES);
    const big = r.w >= 10 && r.h >= 8;
    // Colonnes
    if (isBoss || (style === 'hall' && big)) {
      const name = pick(['colA', 'colB', 'pillar']);
      const ix = isBoss ? 3 : 2, iy = isBoss ? 3 : 2;
      for (const [x, y] of [[r.x + ix, r.y + iy], [r.x + r.w - 1 - ix, r.y + iy], [r.x + ix, r.y + r.h - 1 - iy], [r.x + r.w - 1 - ix, r.y + r.h - 1 - iy]]) {
        putProp(chance(0.2) && !isBoss ? 'colbroken' : name, x, y);
      }
    }
    // Objets contre le mur nord
    const spots = shuffle(northSpots(r));
    const along = (names, n) => { for (let k = 0; k < n && spots.length; k++) { const nm = pick(names); const w = nm === 'sarco' || nm === 'barrels' || nm === 'gargoyle' ? 2 : nm === 'plaque' ? 3 : 1; putProp(nm, spots.pop(), r.y, w); } };
    if (style === 'crypt') along(['coffin', 'coffin', 'sarco', 'tomb'], randInt(2, 4));
    else if (style === 'shrine') along(['statue', 'obelisk', 'statue', 'armor'], randInt(2, 3));
    else if (style === 'store') along(['barrels', 'barrel', 'crate_gold', 'armorpile'], randInt(2, 4));
    else if (style === 'ossuary') along(['skulls', 'bonepile'], randInt(1, 2));
    else if (style === 'boss') along(['gargoyle', 'statue', 'gargoyle'], 2);
    else if (style === 'hall' && chance(0.5)) along(['armor', 'statue'], 2);
    // Décor mural : chaînes, squelettes enchaînés, soupiraux, torches éteintes
    for (let x = r.x; x < r.x + r.w; x++) {
      if (!isW(x, r.y - 1) || !isF(x, r.y) || map.get(x, r.y) === T.PROP) continue;
      const roll = Math.random();
      if (style === 'ossuary' && roll < 0.25) wallDecor.push({ name: 'chained', tx: x, ty: r.y - 1 });
      else if (roll < 0.06) wallDecor.push({ name: 'chains', tx: x, ty: r.y - 1 });
      else if (roll < 0.1) wallDecor.push({ name: 'cellwin', tx: x, ty: r.y - 1 });
    }
  });

  // Toiles d'araignée dans les coins (sol avec murs au nord et à l'ouest/est)
  const flatDecor = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!isF(x, y) || !isW(x, y - 1)) continue;
    if (isW(x - 1, y) && chance(0.55)) flatDecor.push({ kind: 'web1', x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
    else if (isW(x + 1, y) && chance(0.55)) flatDecor.push({ kind: 'web2', x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
  }

  const toPx = (c) => ({ x: (c.x + 0.5) * TILE, y: (c.y + 0.5) * TILE });
  const randomFloorIn = (r, margin = 1) => {
    for (let k = 0; k < 30; k++) {
      const x = randInt(r.x + margin, r.x + r.w - 1 - margin);
      const y = randInt(r.y + margin, r.y + r.h - 1 - margin);
      if (map.get(x, y) === T.FLOOR) return { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
    }
    return toPx(center(r));
  };

  const others = rooms.map((_, i) => i).filter((i) => i !== startIdx && i !== bossIdx);
  const sortedByDist = [...others].sort((a, b) => roomDist[a] - roomDist[b]);

  // Points d'extraction : dans des salles à mi-chemin et loin.
  const extractions = [];
  if (sortedByDist.length >= 2) {
    const a = sortedByDist[Math.floor(sortedByDist.length * 0.45)];
    const b = sortedByDist[sortedByDist.length - 1];
    for (const idx of new Set([a, b])) extractions.push({ ...toPx(centers[idx]), room: idx });
  } else if (sortedByDist.length) {
    extractions.push({ ...toPx(centers[sortedByDist[0]]), room: sortedByDist[0] });
  }

  // Coffres.
  const chests = [];
  const chestRooms = shuffle([...others]).slice(0, randInt(2, 3 + Math.floor(depth / 2)));
  for (const idx of chestRooms) chests.push({ ...randomFloorIn(rooms[idx], 1), rich: chance(0.15 + depth * 0.03) });

  // Inscriptions laissées par d'anciens aventuriers.
  const inscriptions = [];
  const insRooms = shuffle([...others]).slice(0, randInt(2, 3));
  const texts = shuffle([...INSCRIPTIONS]);
  insRooms.forEach((idx, i) => inscriptions.push({ ...randomFloorIn(rooms[idx], 2), text: texts[i] }));

  // Monstres.
  const spawns = [];
  const pool = enemyPool(depth);
  for (const idx of others) {
    const r = rooms[idx];
    const n = randInt(3, 5) + Math.floor(Math.min(depth, 8) / 2) + (r.w * r.h > 110 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const p = randomFloorIn(r, 1);
      spawns.push({ type: weightedPick(pool), x: p.x, y: p.y, elite: chance(Math.min(0.3, 0.1 + depth * 0.02)) });
    }
  }
  // Quelques monstres dans les couloirs.
  for (let k = 0; k < 5 + Math.min(depth, 8) * 2; k++) {
    const x = randInt(2, W - 3), y = randInt(2, H - 3);
    if (map.get(x, y) !== T.FLOOR) continue;
    if (rooms.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) continue;
    spawns.push({ type: chance(0.6) ? 'rat' : 'squelette', x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, elite: false });
  }

  // Torches murales (lumières) : murs avec un sol juste en dessous.
  const torches = [];
  for (const r of rooms) {
    const n = randInt(1, 2);
    for (let k = 0; k < n; k++) {
      const x = randInt(r.x + 1, r.x + r.w - 2);
      const y = r.y - 1;
      if (map.get(x, y) === T.WALL && map.get(x, y + 1) === T.FLOOR) torches.push({ x: (x + 0.5) * TILE, y: (y + 1) * TILE - 4 });
    }
  }

  // Décor : os, gravats (purement visuel).
  const decor = [];
  for (let k = 0; k < 60 + depth * 10; k++) {
    const x = randInt(1, W - 2), y = randInt(1, H - 2);
    if (map.get(x, y) === T.FLOOR) decor.push({ x: (x + rand(0.3, 0.7)) * TILE, y: (y + rand(0.3, 0.7)) * TILE, kind: pick(['bones', 'bones', 'rubble', 'skull', 'crack', 'rock', 'blood1', 'ashes', 'roots', 'skeleton', 'bonepile', 'slime']), rot: rand(0, 6.28), flip: chance(0.5) });
  }
  decor.push(...flatDecor);

  return {
    map,
    start: toPx(sc),
    rooms,
    bossRoom: br,
    bossPos: toPx(centers[bossIdx]),
    extractions,
    chests,
    inscriptions,
    spawns,
    torches,
    decor,
    props,
    wallDecor,
    roomOrder: sortedByDist, // salles (hors départ et boss), de la plus proche à la plus lointaine
  };
}
