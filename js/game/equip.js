// Apparence du joueur selon son équipement : superposition de calques LPC (assets/equip/).
// Chaque pièce a son atlas (<clé>.png), chargé à la demande ; equip.json décrit les animations.
// Les grandes attaques (slash_oversize…) n'existent que pour les armes : les autres calques
// réutilisent la pose de base correspondante (slash, thrust…), centrée sur le même point d'ancrage.

const EQ = { meta: null, img: {}, loading: {} };
const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
if (canvas) canvas.width = canvas.height = 192;
const C = canvas && canvas.getContext('2d');
const ANCHOR_X = 96, ANCHOR_Y = 124; // pieds, dans la case de 192 px

export async function loadEquip() {
  try { EQ.meta = await (await fetch('assets/equip/equip.json')).json(); } catch (e) { EQ.meta = null; }
  if (EQ.meta) ['body', 'head', 'hair', 'shirt', 'pants_charcoal', 'shoes'].forEach(load);
  return !!EQ.meta;
}
export const hasEquip = () => !!EQ.meta;

function load(key) {
  if (!EQ.meta || !EQ.meta[key] || EQ.img[key] || EQ.loading[key]) return;
  EQ.loading[key] = true;
  const im = new Image();
  im.onload = () => { EQ.img[key] = im; };
  im.src = `assets/equip/${key}.png`;
}

// ---------- Choix des calques selon les objets ----------
const METAL = ['steel', 'steel', 'silver', 'iron', 'silver', 'gold', 'iron']; // fer, acier, acier trempé, acier noir, mithril, orichalque, des Abysses
const CLOTH = ['leather', 'leather', 'brown', 'charcoal', 'charcoal', 'maroon', 'black'];
const TABARD = ['leather', 'navy', 'forest', 'forest', 'maroon', 'black', 'black'];
const WOOD = ['light', 'medium', 'medium', 'dark', 'silver', 'gold', 'dark'];
// Mage : couleur de robe / chapeau selon le palier de tissu (à ajuster selon les calques disponibles)
const ROBE = ['brown', 'brown', 'black', 'navy', 'purple', 'red', 'black'];
const STAFF = ['staff_simple', 'staff_simple', 'staff_gnarled', 'staff_gnarled', 'staff_loop', 'staff_crystal', 'staff_crystal'];
const tierOf = (it) => Math.max(0, Math.min(6, Math.floor(((it.ilvl || 1) - 1) / 4)));
const baseWord = (it) => (it.name || '').split(' ')[0];

const PIECES = {
  head: { Casque: (t) => 'nasal_' + METAL[t], Heaume: (t) => 'greathelm_' + METAL[t], Camail: (t) => 'mail_' + METAL[t], Capuche: (t) => 'hood_' + CLOTH[t], Chapeau: (t) => 'wizhat_' + ROBE[t] },
  chest: { Plastron: (t) => 'plate_' + METAL[t], Haubert: (t) => 'chain_' + METAL[t], Brigandine: (t) => 'leather_' + CLOTH[t], Pourpoint: (t) => 'tabard_' + TABARD[t], Robe: (t) => 'robe_' + ROBE[t] },
  legs: { Jambières: (t) => 'legarm_' + METAL[t], Grèves: (t) => 'legarm_' + METAL[t], Cuissards: (t) => 'pants_' + CLOTH[t] },
  feet: { Bottes: (t) => 'boots_' + CLOTH[t], Solerets: (t) => 'sabatons_' + METAL[t], Bottines: (t) => 'rimboots_' + CLOTH[t] },
  hands: { Gants: (t) => 'gloves_' + CLOTH[t], Gantelets: (t) => 'gauntlets_' + METAL[t], Mitaines: (t) => 'gloves_' + CLOTH[t] },
};
const SHIELDS = {
  Bouclier: ['kite_gray', 'kite_graygray', 'kite_bluegray', 'kite_bluegray', 'kite_orange', 'kite_orange', 'kite_graygray'],
  Écu: ['round_brown', 'round_brown', 'round_black', 'round_black', 'round_silver', 'round_gold', 'round_black'],
  Pavois: ['crusader', 'crusader', 'crusader', 'crusader', 'crusader', 'crusader', 'crusader'],
  Rondache: ['spartan', 'spartan', 'round_black', 'spartan', 'round_silver', 'round_gold', 'spartan'],
};
const WEAPON = {
  epee: (t) => 'arming_' + METAL[t], hache: () => 'waraxe', masse: () => 'mace', espadon: () => 'longsword',
  marteau: () => 'flail', arccourt: (t) => 'recurve_' + WOOD[t], arc: (t) => 'great_' + WOOD[t], arbalete: () => 'crossbow',
  baton: (t) => STAFF[t], sceptre: (t) => (t < 3 ? 'staff_loop' : 'staff_crystal'), baguette: () => 'wand',
};
// Animations d'attaque selon l'arme portée : [normale, lourde]
const ATTACKS = {
  arming: ['slash_128', 'backslash_128'], longsword: ['slash_oversize', 'slash_reverse_oversize'],
  waraxe: ['slash_oversize', 'slash_oversize'], mace: ['slash_oversize', 'slash_oversize'], flail: ['slash_oversize', 'slash_oversize'],
  recurve: ['shoot', 'shoot'], great: ['shoot', 'shoot'], crossbow: ['thrust', 'thrust'],
  staff: ['spellcast', 'spellcast'], wand: ['slash', 'slash'],
  dagger: ['slash', 'thrust'],
};
// Pose de base pour les calques qui n'ont pas l'animation d'attaque de l'arme
const FALLBACK = { spellcast: 'thrust', slash_oversize: 'slash', slash_reverse_oversize: 'slash', slash_128: 'slash', backslash_128: '1h_backslash', thrust_oversize: 'thrust' };

// Liste ordonnée des pièces visibles pour une classe et un équipement.
export function lookFor(cls, eq, spec) {
  const out = ['body', 'head'];
  const piece = (slot, fallback) => {
    const it = eq[slot];
    const f = it && PIECES[slot][baseWord(it)];
    if (f) out.push(f(tierOf(it)));
    else if (fallback) out.push(fallback);
  };
  if (!(eq.head && ['Heaume', 'Capuche'].includes(baseWord(eq.head)))) out.push('hair');
  out.push('shirt');
  piece('chest'); piece('legs', 'pants_charcoal'); piece('feet', 'shoes'); piece('hands'); piece('head');
  out.push(cls === 'rodeur' ? 'cape_solid_forest' : cls === 'mage' ? 'cape_solid_black' : 'cape_tattered_maroon');
  const off = eq.offhand;
  if (off && off.offType === 'quiver') out.push('quiver');
  else if (off && off.offType === 'shield') out.push((SHIELDS[baseWord(off)] || SHIELDS.Bouclier)[tierOf(off)]);
  const w = eq.weapon;
  // L'Ombrelame range son arc et se bat à la dague
  if (spec === 'ombrelame') { const i = out.indexOf('quiver'); if (i >= 0) out.splice(i, 1); out.push('dagger'); }
  else if (w && WEAPON[w.base]) out.push(WEAPON[w.base](tierOf(w)));
  return out;
}

export function attackAnims(look) {
  const w = look[look.length - 1] || '';
  const fam = w.split('_')[0];
  return ATTACKS[fam] || ['slash', 'slash'];
}

// Toutes les pièces sont-elles chargées ?
export function lookReady(look) {
  let ok = true;
  for (const k of look) { if (!EQ.img[k]) { load(k); if (EQ.meta && EQ.meta[k]) ok = false; } }
  return ok;
}

// Nombre d'images de l'animation (définie par l'arme si elle l'a, sinon par le corps)
function framesOf(look, anim) {
  for (const k of look) { const a = EQ.meta[k] && EQ.meta[k][anim]; if (a) return a.frames; }
  const base = FALLBACK[anim];
  const b = base && EQ.meta.body[base];
  return b ? b.frames : 1;
}

// Compose une image du personnage dans le canvas interne et la renvoie.
// st : { anim: 'walk' | 'hurt' | 'attack' | 'heavy', frame?, frac?, dir }
export function composeLook(look, st) {
  if (!C || !EQ.meta) return null;
  let anim = st.anim;
  if (anim === 'attack' || anim === 'heavy') anim = attackAnims(look)[anim === 'heavy' ? 1 : 0];
  const n = framesOf(look, anim);
  let fr = st.frac !== undefined ? Math.floor(st.frac * n) : Math.floor(st.frame || 0);
  fr = Math.max(0, Math.min(n - 1, fr));
  const draws = [];
  for (const k of look) {
    const M = EQ.meta[k], im = EQ.img[k];
    if (!M || !im) continue;
    let A = M[anim], f = fr;
    if (!A) {
      let base = FALLBACK[anim];
      A = base && M[base];
      if (!A && base === '1h_backslash') { base = 'slash'; A = M.slash; } // revers : à défaut, la pose de taille
      if (!A) continue;
      const bn = A.frames;
      // la frappe à revers rejoue la pose de base à l'envers
      f = anim === 'slash_reverse_oversize' ? (bn - 1 - Math.min(fr, bn - 1)) : Math.min(fr, bn - 1);
    }
    if (f >= A.frames) continue;
    const dir = A.dirs === 1 ? 0 : st.dir;
    for (const s of A.subs) draws.push({ im, A, f, dir, y: s.y, z: s.z });
  }
  draws.sort((a, b) => a.z - b.z);
  C.clearRect(0, 0, 192, 192);
  for (const d of draws) {
    const fs = d.A.fs, off = (fs - 64) / 2;
    C.drawImage(d.im, d.f * fs, d.y + d.dir * fs, fs, fs, ANCHOR_X - (off + 32), ANCHOR_Y - (off + 60), fs, fs);
  }
  return canvas;
}
export const LOOK_ANCHOR = { x: ANCHOR_X, y: ANCHOR_Y };
