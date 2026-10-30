// Icônes SVG simples (couleur = currentColor).

const P = {
  epee: '<path d="M20 2l2 2-11 11-2-2z"/><path d="M5.5 11.5l7 7-1.5 1.5-1.5-1.5-3.5 3.5-2-2 3.5-3.5-1.5-1.5z"/>',
  espadon: '<path d="M21 1l2 2-12.5 12.5-2.5-2.5z"/><path d="M4.5 10.5l9 9-1.5 1.5-2-2-3 3-2.5-2.5 3-3-2-2z"/>',
  hache: '<path d="M5 22l-2.5-2.5 9.5-9.5 2.5 2.5z"/><path d="M12 3c4-2.5 9 0 10 4.5-3 0-5.5 2-6.5 5.5l-4.5-4.5c1.5-1.5 1.5-3.5 1-5.5z"/>',
  masse: '<path d="M4.5 22l-2-2 8.5-8.5 2 2z"/><circle cx="16" cy="8" r="5"/><rect x="15" y="0.5" width="2" height="3"/><rect x="20.5" y="7" width="3" height="2"/><rect x="15" y="12.5" width="2" height="3"/><rect x="8.5" y="7" width="3" height="2"/>',
  marteau: '<path d="M4 22.5l-2.5-2.5 10-10 2.5 2.5z"/><path d="M11 5.5l5-5 7.5 7.5-5 5z"/>',
  offhand: '<path d="M12 1.5l9 3v6.5c0 6-4 10.5-9 12-5-1.5-9-6-9-12V4.5z"/>',
  head: '<path d="M3.5 15a8.5 8.5 0 0 1 17 0v5h-5.5v-4.5h-6V20H3.5z"/><rect x="11" y="3" width="2" height="5"/>',
  chest: '<path d="M8 2.5l4 2 4-2 5.5 3.5-2.5 5-2-1v11.5H7V10l-2 1-2.5-5z"/>',
  legs: '<path d="M5.5 2h13l-1 20.5h-4.5L12 10.5 11 22.5H6.5z"/>',
  feet: '<path d="M6 2h7v11.5l7.5 3.5v5.5H4.5V2z"/>',
  hands: '<path d="M7 22.5V12L4.5 7.5l2-1 2.5 4V3h2v7V2h2v8V3h2v8l2.5-3.5 2 1.2-3.5 7.3v6.5z"/>',
  amulet: '<path d="M5.5 1.5c0 6 2.5 9.5 6.5 9.5s6.5-3.5 6.5-9.5h-2c0 4.5-1.5 7.5-4.5 7.5S7.5 6 7.5 1.5z"/><path d="M12 11.5l5 5.5-5 6-5-6z"/>',
  ring: '<path fill-rule="evenodd" d="M12 7.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zm0 3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"/><path d="M9 1h6l2.5 3L12 8.5 6.5 4z"/>',
  pocket: '<path d="M8 3h8l-2 3.5c4 2 6.5 5.5 6.5 10 0 3.5-3.5 5.5-8.5 5.5s-8.5-2-8.5-5.5c0-4.5 2.5-8 6.5-10z"/><rect x="10.5" y="12" width="3" height="5" rx="1" fill="#000" opacity=".45"/>',
  potion: '<path d="M9 1.5h6v2.5h-1v4c3 1 5.5 4 5.5 7.5a7.5 7.5 0 0 1-15 0C4.5 12 7 9 10 8V4H9z"/>',
  pierre: '<path d="M12 1.5l7.5 6.5-2 13H6.5l-2-13z"/><path d="M12 6l3 3-3 7-3-7z" fill="#fff" opacity=".5"/>',
  // compétences
  special: '<path d="M3 21L14 10l2 2L5 23z"/><path d="M14 2l8 8-3 1-6-6z"/><path d="M17 1l1.5 4.5L23 7"/>',
  charge: '<path d="M2 9h11V4l9 8-9 8v-5H2z"/>',
  whirl: '<path d="M12 2a10 10 0 1 1-9.5 13H6a6.5 6.5 0 1 0 6-9V9L7 4.5 12 0z"/>',
  shout: '<path d="M3 9h4l6-5v16l-6-5H3z"/><path d="M16 7a6 6 0 0 1 0 10l-1.2-1.6a4 4 0 0 0 0-6.8zM18.5 4a10 10 0 0 1 0 16l-1.2-1.6a8 8 0 0 0 0-12.8z"/>',
  rage: '<path d="M12 1c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
  wall: '<path d="M2 4h20v16H2z" opacity=".35"/><path d="M2 4h9v4H2zM13 4h9v4h-9zM2 10h4v4H2zM8 10h8v4H8zM18 10h4v4h-4zM2 16h9v4H2zM13 16h9v4h-9z"/>',
  arccourt: '<path d="M6 2c9 3 13 10 12 20" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M6 2L18 22" stroke="currentColor" stroke-width=".8" fill="none"/><path d="M3 13l12-2.5-1 2z"/><path d="M15 9.5l3 1.5-3 1.5z"/>',
  arc: '<path d="M4 1c11 3 16 12 14 22" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M4 1L18 23" stroke="currentColor" stroke-width=".8" fill="none"/><path d="M2 14l14-3-1 2z"/><path d="M16 9.5l3.5 1.8-3.5 1.6z"/>',
  arbalete: '<rect x="10.5" y="3" width="3" height="19" rx="1"/><path d="M2 8c5-3 15-3 20 0l-1 2c-5-2.5-13-2.5-18 0z"/><path d="M3 9.5l9 4 9-4" fill="none" stroke="currentColor" stroke-width=".8"/>',
  quiver: '<path d="M7 7h8l2 15H9z"/><path d="M8 2l1 5M11 1.5v5.5M14 2l-1 5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M6.5 1l3 1.5-1 1.2zM10 0.5l2.5 1.8L11 3zM15.5 1l-3 1.5 1 1.2z"/>',
  pierce: '<path d="M1 12h17" stroke="currentColor" stroke-width="2"/><path d="M23 12l-6-4v8z"/><path d="M1 12l3-3v6z"/><circle cx="8" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="14" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  salve: '<path d="M2 12h14M3 6l12 4M3 18l12-4" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M22 12l-6-3v6zM21 8.5l-6.5-.5 2.8 4.6zM21 15.5l-6.5.5 2.8-4.6z"/>',
  trap: '<path d="M2 15h20v3H2z"/><path d="M3 15l2-7 2 7 2-7 2 7 2-7 2 7 2-7 2 7 2-7 1 7z"/><circle cx="12" cy="20" r="1.5"/>',
  rain: '<path d="M5 2l-2 9M10 1l-2 9M15 2l-2 9M20 1l-2 9" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M2 13l2 3 2-3zM7 12l2 3 2-3zM12 13l2 3 2-3zM17 12l2 3 2-3z"/><ellipse cx="12" cy="21" rx="10" ry="2" opacity=".5"/>',
  eye: '<path fill-rule="evenodd" d="M12 5c5 0 9 4 11 7-2 3-6 7-11 7S3 15 1 12c2-3 6-7 11-7zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><circle cx="12" cy="12" r="1.8"/>',
  veil: '<path d="M12 2c5 0 8 4 8 9v11l-2.5-2-2.5 2-3-2-3 2-2.5-2L4 22V11c0-5 3-9 8-9z"/><ellipse cx="9" cy="11" rx="1.6" ry="2.2" fill="#000"/><ellipse cx="15" cy="11" rx="1.6" ry="2.2" fill="#000"/>',
  baton: '<path d="M5 23l-1.6-1.2L17 3.5l1.6 1.2z"/><circle cx="18.5" cy="4" r="3.2"/><path d="M14 2l2 1M21 8l1 2M22 2l-2 1" stroke="currentColor" stroke-width="1.2"/>',
  sceptre: '<path d="M6 23l-1.6-1.2 10-13.3 1.6 1.2z"/><path d="M17 1l5 5-4 4-5-5z"/><circle cx="17.5" cy="5.5" r="1.4" fill="#000" opacity=".4"/>',
  baguette: '<path d="M4 21l-1.5-1.5L16 6l1.5 1.5z"/><path d="M19 1l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
  tome: '<path d="M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3z"/><path d="M7 18h13v3H7a1.5 1.5 0 0 1 0-3z" fill="#000" opacity=".35"/><path d="M12 6l1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" fill="#000" opacity=".45"/>',
  bolt: '<circle cx="15" cy="9" r="6"/><path d="M2 22l8-8M4 17l5-4M7 22l4-6" stroke="currentColor" stroke-width="1.6"/>',
  blink: '<circle cx="18" cy="6" r="4"/><circle cx="6" cy="18" r="4" opacity=".35"/><path d="M8 16l7-7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>',
  nova: '<circle cx="12" cy="12" r="3.5"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5M4 4l3.5 3.5M16.5 16.5L20 20M4 20l3.5-3.5M16.5 7.5L20 4" stroke="currentColor" stroke-width="2"/>',
  chain: '<path d="M14 1L5 13h6l-3 10 11-13h-6l3-9z"/>',
  mshield: '<path d="M12 1.5l9 3v6.5c0 6-4 10.5-9 12-5-1.5-9-6-9-12V4.5z" opacity=".4"/><path d="M12 5l1.8 4 4.2.4-3.2 2.8 1 4.3L12 14.2l-3.8 2.3 1-4.3L6 9.4l4.2-.4z"/>',
  meteor: '<circle cx="15" cy="15" r="6"/><path d="M1 1l10 10M5 1l7 7M1 5l7 7" stroke="currentColor" stroke-width="2"/>',
  skull: '<path d="M12 2a9 9 0 0 0-9 9c0 3 1.5 5 3.5 6v4h11v-4c2-1 3.5-3 3.5-6a9 9 0 0 0-9-9z"/><circle cx="8.5" cy="11" r="2.2" fill="#000"/><circle cx="15.5" cy="11" r="2.2" fill="#000"/><path d="M10 18h1v3h-1zM13 18h1v3h-1z" fill="#000"/>',
  quake: '<path d="M1 20h22v3H1z"/><path d="M12 2l3 8-3 2 2 6-6-8 3-2z"/><path d="M3 18l3-4M21 18l-3-4" stroke="currentColor" stroke-width="1.6"/>',
  bomb: '<circle cx="10" cy="14" r="8"/><path d="M15 7l3-3" stroke="currentColor" stroke-width="2"/><path d="M19 1l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
  lock: '<path d="M7 10V7a5 5 0 0 1 10 0v3h2v12H5V10zm2 0h6V7a3 3 0 0 0-6 0z"/>',
  gold: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6" fill="#000" opacity=".25"/>',
};

export function icon(name, cls = '') {
  const p = P[name] || P.pierre;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${p}</svg>`;
}

// ---------- Icônes d'objets en pixel art (assets/icons) ----------
let PIX = null;
let PIX_W = 512, PIX_H = 512; // lus depuis l'image au chargement
export async function loadIcons() {
  try {
    PIX = await (await fetch('assets/icons/icons.json')).json();
    const im = new Image();
    im.src = 'assets/icons/icons.png';
    await im.decode();
    PIX_W = im.naturalWidth; PIX_H = im.naturalHeight;
    // la taille de fond suit l'atlas (cases de 32 px)
    document.documentElement.style.setProperty('--pix-bg', `${(PIX_W / 32) * 100}% ${(PIX_H / 32) * 100}%`);
  } catch (e) { PIX = null; }
}
const hashStr = (str) => { let h = 7; for (const c of str || '') h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

const CONS_ICON = { fer: 'runestone_earth', bronze: 'raw_green_gem', braise: 'crystal_orange', larme: 'diamond', cierge: 'skull_candle', ossement: 'bone' };
function pixKey(item) {
  const M = PIX.map;
  let cat;
  if (item.kind === 'consumable' && CONS_ICON[item.id]) return CONS_ICON[item.id];
  if (item.kind === 'consumable') cat = item.id;
  else if (item.kind === 'lore') cat = 'lore';
  else if (item.slot === 'weapon') cat = 'weapon:' + item.base;
  else if (item.slot === 'offhand') cat = 'offhand:' + (item.offType || 'shield');
  else if (item.slot === 'pocket') cat = 'pocket';
  else if (['head', 'chest'].includes(item.slot)) cat = item.slot + ':' + (item.name || '').split(' ')[0];
  else cat = item.slot;
  let list = M[cat];
  // nom inhabituel (objets uniques) : une icône de la même pièce
  if ((!list || !list.length) && ['head', 'chest'].includes(item.slot)) list = M[item.slot === 'head' ? 'head:Heaume' : 'chest:Robe'];
  if (!list || !list.length) return null;
  if (item.kind === 'consumable') return list[0];
  if (item.slot === 'pocket') return list[Math.min(list.length - 1, item.rarity || 0)];
  // du plus grossier au plus précieux, selon le palier de matériau ; un peu de variété aux premiers paliers
  const tier = Math.max(0, Math.min(6, Math.floor(((item.ilvl || 1) - 1) / 4)));
  let i = Math.floor((tier * list.length) / 7);
  if (tier < 3 && hashStr(item.uid) % 2 && i + 1 < list.length) i++;
  return list[i];
}

// HTML d'une icône d'objet (pixel art si disponible, sinon silhouette SVG).
export function itemIcon(item) {
  const k = PIX && pixKey(item);
  const pos = k && PIX.icons[k];
  if (!pos) return icon(itemIconName(item));
  const px = (pos[0] / (PIX_W - 32)) * 100, py = (pos[1] / (PIX_H - 32)) * 100;
  return `<i class="pix" style="background-position:${px.toFixed(3)}% ${py.toFixed(3)}%"></i>`;
}
export function pixIcon(key) {
  const pos = PIX && PIX.icons[key];
  if (!pos) return '';
  return `<i class="pix" style="background-position:${((pos[0] / (PIX_W - 32)) * 100).toFixed(3)}% ${((pos[1] / (PIX_H - 32)) * 100).toFixed(3)}%"></i>`;
}

export function itemIconName(item) {
  if (item.kind === 'consumable') return item.id;
  if (item.slot === 'weapon') return item.base;
  if (item.slot === 'offhand') return item.offType === 'quiver' ? 'quiver' : item.offType === 'tome' ? 'tome' : 'offhand';
  return item.slot;
}
