// Le village (hub) : Cendrebourg, carte fixe dessinée à la main.
// map : collisions ; ground : nature du sol pour le rendu ('g' herbe, 'd' terre, 'c' pavés, 'f' dalles) ;
// props : objets en relief (maisons, arbres, puits…) triés en profondeur avec les personnages.
import { TileMap, T, TILE } from './world.js';
import { hash2 } from '../core/util.js';

export const VILLAGE_W = 48;
export const VILLAGE_H = 42;

export function buildVillage() {
  const W = VILLAGE_W, H = VILLAGE_H;
  const map = new TileMap(W, H, T.GRASS);
  const ground = new Array(W * H).fill('g');
  const setG = (x, y, k) => { if (x >= 0 && y >= 0 && x < W && y < H) ground[y * W + x] = k; };
  const fillG = (x, y, w, h, k, tile = null) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { setG(i, j, k); if (tile !== null) map.set(i, j, tile); }
  };
  const props = [];
  const px = (t) => t * TILE;
  // Objet solide : base au bas de la case (bx, by) ; largeur w cases (bx = case la plus à gauche) ; profondeur d cases.
  const prop = (name, bx, by, w = 1, d = 1, tile = T.PROP, extra = {}) => {
    for (let j = by - d + 1; j <= by; j++) for (let i = bx; i < bx + w; i++) map.set(i, j, tile);
    props.push({ name, x: px(bx + w / 2), y: px(by + 1) - 1, ...extra });
  };
  const deco = (name, x, y, extra = {}) => props.push({ name, x, y, ...extra }); // sans collision

  const cx = 24, cy = 21;

  // ---- Chemins de terre ----
  fillG(cx - 1, 9, 3, H - 9, 'd', T.PATH);        // grand-rue nord-sud
  fillG(3, cy - 1, W - 6, 3, 'd', T.PATH);        // route est-ouest
  fillG(4, 32, W - 8, 3, 'd', T.PATH);            // ruelle du sud
  fillG(7, 14, 2, cy - 15, 'd', T.PATH);          // vers la forge
  fillG(34, 14, 2, cy - 15, 'd', T.PATH);         // vers le comptoir
  fillG(4, 23, 2, 10, 'd', T.PATH);               // raccord ouest
  fillG(W - 6, 23, 2, 10, 'd', T.PATH);           // raccord est

  // ---- Place pavée ----
  fillG(cx - 6, cy - 5, 13, 11, 'c', T.PLAZA);
  // ---- Parvis du portail (dalles) ----
  fillG(cx - 4, 3, 9, 7, 'f', T.PLAZA);
  fillG(cx - 1, 4, 3, 2, 'f', T.PORTAL_FLOOR);

  // ---- Maisons (base = rangée du bas du mur) ----
  const houses = [
    { name: 'h_forge', x: 5, by: 13, w: 7 },
    { name: 'h_shop', x: 31, by: 13, w: 7 },
    { name: 'h_barracks', x: 5, by: 31, w: 7 },
    { name: 'h_small', x: 13, by: 31, w: 5 },
    { name: 'h_inn', x: 28, by: 31, w: 7 },
    { name: 'h_home', x: 37, by: 31, w: 5 },
  ];
  for (const h of houses) prop(h.name, h.x, h.by, h.w, 4, T.HOUSE);

  // ---- Fontaine (animée) ----
  prop('fountain0', cx - 1, cy, 2, 2, T.WATER, { anim: ['fountain0', 'fountain1', 'fountain2'], fps: 6 });

  // ---- Lampadaires (lumières) ----
  const lamps = [];
  const lamp = (x, y) => { prop('lamp', x, y); lamps.push({ x: px(x + 0.5), y: px(y + 1) - 80, lamp: true }); };
  lamp(cx - 6, cy - 5); lamp(cx + 6, cy - 5); lamp(cx - 6, cy + 5); lamp(cx + 6, cy + 5);
  lamp(cx - 2, 12); lamp(cx + 2, 30); lamp(10, cy - 2); lamp(38, cy + 2);

  // ---- Parvis : obélisques, statues ----
  prop('obelisk', cx - 4, 4); prop('obelisk', cx + 4, 4);
  prop('statue', cx - 3, 3); prop('statue', cx + 3, 3);

  // ---- Cimetière (nord-est) ----
  const graves = [[31, 5], [33, 5], [35, 5], [37, 5], [31, 8], [33, 8], [36, 8], [38, 7]];
  graves.forEach(([x, y], i) => prop(i % 3 === 0 ? 'grave' : 'tombstone', x, y));
  prop('sarco', 39, 4, 2, 1);
  prop('tree_s', 30, 3);

  // ---- Forge : bûches, tonneaux ----
  prop('firewood', 12, 13, 2, 1);
  prop('barrels', 3, 12, 2, 1);
  prop('well', 15, 14, 2, 1);
  deco('buckets', px(17.3), px(15));

  // ---- Comptoir : étals, caisses ----
  prop('stall_brown', 39, 16, 3, 2);
  prop('stall_grey', 42, 12, 3, 2);
  prop('crate', 29, 13, 2, 1);
  prop('crate_goods', 38, 13);
  prop('barrel', 39, 13);

  // ---- Caserne : bannières, râtelier ----
  deco('banner', px(5.6), px(31) - 4);
  deco('banner', px(11.4), px(31) - 4);
  prop('armor', 12, 33 - 3);

  // ---- Feu de camp (sud) ----
  const camp = { x: px(20.5), y: px(28.5) };
  map.set(20, 28, T.PROP);
  props.push({ name: 'camp0', x: camp.x, y: camp.y + 15, anim: ['camp0', 'camp1', 'camp2', 'camp3', 'camp4'], fps: 10 });
  prop('firewood', 19, 30, 2, 1);
  prop('signpost', 26, 35, 2, 1);

  // ---- Clôtures ----
  const fences = [];
  for (let x = 4; x < 18; x++) if (x !== 9) { map.set(x, 36, T.FENCE); fences.push({ x, y: 36, name: 'fence_rail' }); }
  for (let x = 30; x < 44; x++) { map.set(x, 36, T.FENCE); fences.push({ x, y: 36, name: 'fence_picket' }); }

  // ---- Haies et buissons ----
  prop('bushA', 19, 13, 2, 1); prop('bushB', 29, 29, 1, 1);
  prop('bushB', 2, 26, 2, 1); prop('bushA', 43, 27, 2, 1);
  prop('hedge', 18, 31); prop('hedge', 36, 31);

  // ---- Forêt en bordure (arbres solides) ----
  const isFree = (x, y) => map.get(x, y) === T.GRASS && ground[y * W + x] === 'g';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, y, W - 1 - x, H - 1 - y);
    const h = hash2(x, y, 7);
    if (e === 0) { map.set(x, y, T.FENCE); continue; }
    if (e <= 2 && h < 0.45 && isFree(x, y)) {
      const kind = h < 0.2 ? 'pine' : h < 0.33 ? 'oak' : 'tree_s';
      map.set(x, y, T.TREE);
      props.push({ name: kind, x: px(x + 0.5), y: px(y + 1) - 2, flip: hash2(x, y, 9) < 0.5 });
    }
  }
  // Rangée d'arbres du haut (le bord nord est la lisière de la forêt)
  for (let x = 1; x < W - 1; x += 2) {
    if (!isFree(x, 1)) continue;
    map.set(x, 1, T.TREE);
    props.push({ name: hash2(x, 1, 3) < 0.6 ? 'pine' : 'oak', x: px(x + 0.5), y: px(2) - 2, flip: x % 4 === 1 });
  }

  // ---- Herbes fleuries (au sol) ----
  const flowers = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (ground[y * W + x] === 'g' && map.get(x, y) === T.GRASS && hash2(x, y, 11) < 0.05) flowers.push({ x, y });
  }

  // ---- PNJ ----
  const npcs = [
    { id: 'brann', x: px(9.5), y: px(15) },
    { id: 'odile', x: px(36.5), y: px(15) },
    { id: 'aldric', x: px(10.5), y: px(33) },
    { id: 'maelis', x: px(cx + 2.5), y: px(7) },
  ];

  const interactables = [
    { type: 'stash', x: px(cx - 4), y: px(cy + 3.5), r: 16, label: 'Coffre de stockage' },
    { type: 'portal', x: px(cx + 0.5), y: px(5), r: 26, label: 'Portail des Abysses' },
  ];

  // Braseros du parvis (feu) + lampes (lumière seule) + feu de camp
  const braziers = [
    { x: px(cx - 2.5), y: px(8.5) }, { x: px(cx + 3.5), y: px(8.5) },
    { x: camp.x, y: camp.y, camp: true },
    ...lamps,
  ];
  for (const b of braziers) if (!b.lamp && !b.camp) map.set(Math.floor(b.x / TILE), Math.floor(b.y / TILE), T.FENCE);

  return {
    map,
    ground,
    props,
    fences,
    flowers,
    houses: [],
    npcs,
    interactables,
    braziers,
    spawn: { x: px(cx + 0.5), y: px(cy + 4) },
  };
}
