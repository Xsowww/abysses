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
  lock: '<path d="M7 10V7a5 5 0 0 1 10 0v3h2v12H5V10zm2 0h6V7a3 3 0 0 0-6 0z"/>',
  gold: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6" fill="#000" opacity=".25"/>',
};

export function icon(name, cls = '') {
  const p = P[name] || P.pierre;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${p}</svg>`;
}

export function itemIconName(item) {
  if (item.kind === 'consumable') return item.id;
  if (item.slot === 'weapon') return item.base;
  return item.slot;
}
