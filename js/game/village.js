// Le village (hub) : carte fixe dessinée à la main.
import { TileMap, T, TILE } from './world.js';
import { hash2 } from '../core/util.js';

export const VILLAGE_W = 46;
export const VILLAGE_H = 36;

export function buildVillage() {
  const W = VILLAGE_W, H = VILLAGE_H;
  const map = new TileMap(W, H, T.GRASS);

  // Palissade
  for (let x = 0; x < W; x++) { map.set(x, 0, T.FENCE); map.set(x, H - 1, T.FENCE); }
  for (let y = 0; y < H; y++) { map.set(0, y, T.FENCE); map.set(W - 1, y, T.FENCE); }

  // Arbres en bordure
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const edge = x < 3 || y < 3 || x > W - 4 || y > H - 4;
    if (edge && hash2(x, y, 7) < 0.55) map.set(x, y, T.TREE);
  }

  // Chemins
  const cx = 23, cy = 19;
  map.fillRect(cx - 1, 3, 3, H - 6, T.PATH); // axe nord-sud
  map.fillRect(4, cy - 1, W - 8, 3, T.PATH); // axe est-ouest
  // Place centrale
  map.fillRect(cx - 6, cy - 5, 13, 11, T.PLAZA);
  // Fontaine
  map.fillRect(cx - 1, cy - 1, 3, 3, T.WATER);

  // Zone du portail (nord)
  map.fillRect(cx - 4, 3, 9, 6, T.PLAZA);
  map.fillRect(cx - 1, 4, 3, 2, T.PORTAL_FLOOR);

  // Maisons : rectangle solide (toit) ; la porte est implicite devant le PNJ.
  const houses = [
    { x: 6, y: 8, w: 8, h: 6, roof: '#5a2f2a', name: 'Forge' },
    { x: 31, y: 8, w: 9, h: 6, roof: '#3a3f5a', name: 'Comptoir' },
    { x: 6, y: 24, w: 8, h: 6, roof: '#3d4a2c', name: 'Caserne' },
    { x: 32, y: 24, w: 8, h: 6, roof: '#4a3a2a', name: 'Maison' },
  ];
  for (const h of houses) map.fillRect(h.x, h.y, h.w, h.h, T.HOUSE);
  // Petits chemins vers les maisons
  map.fillRect(9, 14, 2, cy - 15, T.PATH);
  map.fillRect(35, 14, 2, cy - 15, T.PATH);
  map.fillRect(9, cy + 2, 2, 22 - cy, T.PATH);
  map.fillRect(35, cy + 2, 2, 22 - cy, T.PATH);

  const px = (tx) => (tx + 0.5) * TILE;
  const npcs = [
    { id: 'brann', x: px(10), y: px(15) },
    { id: 'odile', x: px(35.5), y: px(15) },
    { id: 'aldric', x: px(10), y: px(23) },
    { id: 'maelis', x: px(cx + 2.5), y: px(6) },
  ];

  const interactables = [
    { type: 'stash', x: px(cx - 4), y: px(cy + 3.5), r: 16, label: 'Coffre de stockage' },
    { type: 'portal', x: px(cx), y: px(4.5), r: 26, label: 'Portail des Abysses' },
  ];

  const braziers = [
    { x: px(cx - 5), y: px(cy - 4) }, { x: px(cx + 5), y: px(cy - 4) },
    { x: px(cx - 5), y: px(cy + 4) }, { x: px(cx + 5), y: px(cy + 4) },
    { x: px(cx - 3), y: px(4) }, { x: px(cx + 3), y: px(4) },
    { x: px(12.5), y: px(15) }, { x: px(33), y: px(15) }, { x: px(12.5), y: px(23) },
  ];
  for (const b of braziers) map.set(Math.floor(b.x / TILE), Math.floor(b.y / TILE), T.FENCE);

  return {
    map,
    houses,
    npcs,
    interactables,
    braziers,
    spawn: { x: px(cx), y: px(cy + 6) },
  };
}
