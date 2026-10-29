// Génération procédurale d'un donjon : salles + couloirs.
import { TileMap, T, TILE } from './world.js';
import { randInt, rand, pick, shuffle, weightedPick, chance } from '../core/util.js';
import { enemyPool } from '../data/enemies.js';

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

  // Monstres.
  const spawns = [];
  const pool = enemyPool(depth);
  for (const idx of others) {
    const r = rooms[idx];
    const n = randInt(2, 4) + Math.floor(depth / 2) + (r.w * r.h > 110 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const p = randomFloorIn(r, 1);
      spawns.push({ type: weightedPick(pool), x: p.x, y: p.y, elite: chance(0.07 + depth * 0.01) });
    }
  }
  // Quelques monstres dans les couloirs.
  for (let k = 0; k < 3 + depth; k++) {
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
    if (map.get(x, y) === T.FLOOR) decor.push({ x: (x + rand(0.2, 0.8)) * TILE, y: (y + rand(0.2, 0.8)) * TILE, kind: pick(['bone', 'bone', 'rubble', 'skull', 'crack']), rot: rand(0, 6.28) });
  }

  return {
    map,
    start: toPx(sc),
    rooms,
    bossRoom: br,
    bossPos: toPx(centers[bossIdx]),
    extractions,
    chests,
    spawns,
    torches,
    decor,
  };
}
