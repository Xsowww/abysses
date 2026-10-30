// Objets : emplacements, raretés, armes (par classe), affixes, textes d'ambiance et génération.
import { rand, randInt, pick, uid, weightedPick, clamp, hash2 } from '../core/util.js';
import { SETS } from './sets.js';

export const SLOTS = {
  head: { label: 'Casque' },
  amulet: { label: 'Médaillon' },
  chest: { label: 'Plastron' },
  hands: { label: 'Gants' },
  legs: { label: 'Jambières' },
  ring: { label: 'Bague' },
  feet: { label: 'Bottes' },
  weapon: { label: 'Arme' },
  offhand: { label: 'Main gauche' },
  pocket: { label: 'Poche sécurisée' },
};
export const EQUIP_ORDER = ['head', 'amulet', 'chest', 'hands', 'legs', 'ring', 'feet', 'weapon', 'offhand', 'pocket'];

// Couleurs volontairement désaturées (ambiance sombre).
export const RARITIES = [
  { id: 0, name: 'Commun', color: '#a8a196', affixes: 0, mult: 1.0, value: 1 },
  { id: 1, name: 'Peu commun', color: '#86a85e', affixes: 1, mult: 1.12, value: 2.5 },
  { id: 2, name: 'Rare', color: '#6a92c9', affixes: 2, mult: 1.25, value: 6 },
  { id: 3, name: 'Épique', color: '#a57bc7', affixes: 3, mult: 1.4, value: 15 },
  { id: 4, name: 'Légendaire', color: '#d4893a', affixes: 4, mult: 1.6, value: 40 },
  { id: 5, name: 'Ensemble', color: '#5fb39b', affixes: 2, mult: 1.25, value: 10 },
];

// ranged : l'arme tire des projectiles (portée = distance max du projectile).
export const WEAPONS = {
  epee: { name: 'Épée', cls: 'guerrier', hands: 1, dmg: 1.0, cd: 0.42, range: 62, arc: 110, kb: 140 },
  hache: { name: 'Hache', cls: 'guerrier', hands: 1, dmg: 1.15, cd: 0.52, range: 58, arc: 100, kb: 160 },
  masse: { name: 'Masse', cls: 'guerrier', hands: 1, dmg: 1.25, cd: 0.58, range: 56, arc: 90, kb: 230 },
  espadon: { name: 'Espadon', cls: 'guerrier', hands: 2, dmg: 1.75, cd: 0.78, range: 84, arc: 150, kb: 200 },
  marteau: { name: 'Marteau de guerre', cls: 'guerrier', hands: 2, dmg: 2.05, cd: 0.95, range: 72, arc: 120, kb: 320 },
  arccourt: { name: 'Arc court', cls: 'rodeur', hands: 1, dmg: 0.8, cd: 0.36, range: 480, ranged: true, projSpeed: 700, kb: 60 },
  arc: { name: 'Arc long', cls: 'rodeur', hands: 1, dmg: 1.05, cd: 0.52, range: 620, ranged: true, projSpeed: 820, kb: 80 },
  arbalete: { name: 'Arbalète', cls: 'rodeur', hands: 1, dmg: 1.6, cd: 0.88, range: 560, ranged: true, projSpeed: 950, kb: 160, pierce: 1 },
};
export const FISTS = { name: 'Poings', hands: 1, dmg: 1, cd: 0.4, range: 42, arc: 90, kb: 60 };

// Main gauche selon la classe.
export const OFFHANDS = {
  shield: { cls: 'guerrier', names: ['Bouclier', 'Écu', 'Pavois', 'Rondache'], label: 'Bouclier' },
  quiver: { cls: 'rodeur', names: ['Carquois', 'Étui à flèches', 'Carquois de chasse'], label: 'Carquois' },
};

const ARMOR_BASES = {
  head: { names: ['Casque', 'Heaume', 'Camail', 'Capuche'], armor: [2, 1.0] },
  chest: { names: ['Plastron', 'Haubert', 'Brigandine', 'Pourpoint'], armor: [4, 1.8] },
  legs: { names: ['Jambières', 'Grèves', 'Cuissards'], armor: [3, 1.4] },
  feet: { names: ['Bottes', 'Solerets', 'Bottines'], armor: [1.5, 0.8] },
  hands: { names: ['Gants', 'Gantelets', 'Mitaines'], armor: [1.5, 0.8] },
  amulet: { names: ['Médaillon', 'Talisman', 'Pendentif'] },
  ring: { names: ['Bague', 'Anneau', 'Chevalière'] },
};

// Matériaux invariables (pas d'accord au féminin / pluriel).
const MATERIALS = ['en fer', 'en acier', 'en acier trempé', 'en acier noir', 'en mithril', 'en orichalque', 'des Abysses'];
const WOOD_MATERIALS = ['en frêne', 'en if', 'en bois de fer', 'en ébène', 'en os de wyrm', 'en bois spectral', 'des Abysses'];
const JEWEL_MATERIALS = ['en cuivre', 'en argent', 'en or', 'en onyx', 'en saphir', 'en rubis', 'des Abysses'];

export const POCKETS = [
  { name: 'Petite bourse', slots: 1 },
  { name: 'Sacoche renforcée', slots: 2 },
  { name: 'Besace doublée', slots: 2 },
  { name: 'Besace de contrebandier', slots: 3 },
  { name: 'Coffret des ombres', slots: 4 },
];

export const AFFIXES = {
  hp: { label: 'PV max', suffix: "de l'Ours", roll: (il) => Math.round(rand(8, 14) + il * rand(2.5, 4)) },
  armor: { label: 'Armure', suffix: 'de la Forteresse', roll: (il) => Math.round(rand(2, 5) + il * rand(0.8, 1.3)) },
  dmgPct: { label: '% de dégâts', pct: true, suffix: 'du Carnage', roll: (il) => Math.round(rand(3, 6) + il * 0.15) },
  crit: { label: '% de chance de critique', pct: true, suffix: 'du Faucon', roll: (il) => +(rand(1.5, 3.5) + il * 0.05).toFixed(1) },
  critDmg: { label: '% de dégâts critiques', pct: true, suffix: 'du Bourreau', roll: (il) => Math.round(rand(8, 15) + il * 0.4) },
  atkSpd: { label: "% de vitesse d'attaque", pct: true, suffix: 'de la Fureur', roll: (il) => Math.round(clamp(rand(3, 7) + il * 0.1, 3, 15)) },
  moveSpd: { label: '% de vitesse de déplacement', pct: true, suffix: 'du Vent', roll: () => Math.round(rand(3, 7)) },
  stamina: { label: 'Endurance max', suffix: "de l'Endurance", roll: (il) => Math.round(rand(5, 10) + il * 0.3) },
  staRegen: { label: "% de régén. d'endurance", pct: true, suffix: 'du Souffle', roll: () => Math.round(rand(6, 14)) },
  lifesteal: { label: '% de vol de vie', pct: true, suffix: 'du Vampire', roll: (il) => +(rand(0.5, 1.5) + il * 0.03).toFixed(1) },
  cdr: { label: '% de réduction de recharge', pct: true, suffix: 'du Sage', roll: () => Math.round(rand(3, 7)) },
  hpRegen: { label: 'PV régénérés / s', suffix: 'du Troll', roll: (il) => +(rand(0.3, 0.8) + il * 0.05).toFixed(1) },
};

const SLOT_AFFIXES = {
  weapon: ['dmgPct', 'crit', 'critDmg', 'atkSpd', 'lifesteal', 'hp'],
  offhand: ['hp', 'armor', 'stamina', 'staRegen', 'hpRegen', 'cdr'],
  quiver: ['dmgPct', 'crit', 'critDmg', 'atkSpd', 'staRegen', 'cdr'],
  head: ['hp', 'armor', 'crit', 'cdr', 'hpRegen'],
  chest: ['hp', 'armor', 'stamina', 'hpRegen', 'dmgPct'],
  legs: ['hp', 'armor', 'stamina', 'staRegen', 'moveSpd'],
  feet: ['hp', 'armor', 'moveSpd', 'staRegen', 'stamina'],
  hands: ['armor', 'atkSpd', 'crit', 'critDmg', 'dmgPct'],
  amulet: ['hp', 'dmgPct', 'crit', 'critDmg', 'lifesteal', 'cdr', 'hpRegen', 'stamina'],
  ring: ['dmgPct', 'crit', 'critDmg', 'atkSpd', 'lifesteal', 'moveSpd', 'cdr', 'hp'],
};

export const CONSUMABLES = {
  potion: {
    name: 'Fiole de sang', desc: 'Rend 40 % des PV max.', stack: 20, price: 25, rarity: 0, color: '#b0362c',
    lore: 'Un liquide épais et tiède. Mieux vaut ne pas demander d’où il vient.',
  },
  pierre: {
    name: 'Pierre de retour', desc: "Incantation de 5 s, puis retour au village avec votre butin. Interrompue si vous êtes touché.", stack: 5, price: 60, rarity: 2, color: '#79b8c4',
    lore: 'Un galet froid qui se souvient du village. Il murmure le chemin à qui sait écouter.',
  },
  // ---- Matériaux de forge (Brann renforce l'équipement avec) : perdus à la mort, sauf dans la poche ----
  fer: {
    name: 'Fer de Valdrenne', desc: 'Matériau de forge. Brann s’en sert pour renforcer armes et armures (+1, +2).', stack: 50, price: 12, rarity: 0, color: '#a9b0b6', material: true,
    lore: 'Du fer de la vieille ville, noirci mais sain. Il ne rouille pas. Personne ne sait pourquoi.', icon: 'runestone_earth',
  },
  bronze: {
    name: 'Éclat de bronze noir', desc: 'Matériau de forge rare (profondeur 2 et plus). Nécessaire à partir de +2.', stack: 30, price: 40, rarity: 2, color: '#6fae9a', material: true, minDepth: 2,
    lore: 'Un éclat de la Noire elle-même ? Il vibre doucement quand on le serre.', icon: 'raw_green_gem',
  },
  braise: {
    name: 'Braise figée', desc: 'Matériau de forge très rare (profondeur 3 et plus). Nécessaire à partir de +3.', stack: 20, price: 90, rarity: 3, color: '#e0894a', material: true, minDepth: 3,
    lore: 'Une braise qui ne s’éteint pas, prise dans une gangue de verre. Elle a été un feu de fonderie.', icon: 'crystal_orange',
  },
  larme: {
    name: 'Larme de cloche', desc: 'Matériau légendaire (profondeur 4 et plus, Gardiens). Nécessaire pour +4 et +5.', stack: 10, price: 220, rarity: 4, color: '#b9c8e8', material: true, minDepth: 4,
    lore: 'Une goutte de bronze pur, tombée de la Noire le jour du treizième coup.', icon: 'diamond',
  },
  // ---- Reliques de quête : à rapporter au village (une relique perdue en bas est perdue) ----
  cierge: {
    name: 'Cierge des morts', desc: 'Relique de quête. Frère Anselme les recueille pour sa chapelle.', stack: 10, price: 0, rarity: 2, color: '#d8c79a', relic: true,
    lore: 'Un cierge de suif noir, éteint depuis trois siècles. Il se rallume parfois tout seul.', icon: 'skull_candle',
  },
  ossement: {
    name: 'Ossements nommés', desc: 'Relique de quête. Gaspard le fossoyeur veut leur offrir une tombe.', stack: 10, price: 0, rarity: 1, color: '#d6cebd', relic: true,
    lore: 'Des os liés d’un ruban, avec une plaque de cuivre : un nom, une date. Quelqu’un les a pleurés.', icon: 'bone',
  },
};
export const MATERIAL_IDS = ['fer', 'bronze', 'braise', 'larme'];
export const RELICS = ['cierge', 'ossement'];

// Textes d'ambiance (choisis selon l'objet, toujours le même pour un objet donné).
const LORE = {
  weapon: [
    'L’acier a bu plus de sang que de pluie.',
    'Arrachée aux doigts d’un chevalier qui n’avait plus besoin de rien.',
    'On dit que chaque entaille sur la lame est un nom oublié.',
    'Forgée en surface, perdue en profondeur.',
  ],
  ranged: [
    'La corde chante juste avant que quelqu’un ne cesse de le faire.',
    'Le bois a poussé là où la lumière ne va plus.',
    'Les chasseurs des Abysses ne ratent qu’une fois.',
  ],
  shield: ['Cabossé, fendu, mais toujours debout. Comme son ancien porteur, un temps.', 'Les marques de griffes ne mentent pas.'],
  quiver: ['Quelques plumes noires collent encore au cuir.', 'Il sent la résine et la peur.'],
  armor: [
    'Une armure trouvée sur un mort. Elle ne l’a pas sauvé.',
    'Le métal est froid, même près du feu.',
    'Des runes effacées courent sur les bords.',
    'Les Abysses rendent tout ce qu’on y perd. Rarement à son propriétaire.',
  ],
  jewel: [
    'La pierre semble regarder celui qui la porte.',
    'Un bijou de noble. Le noble, lui, n’est jamais remonté.',
    'Tiède au toucher, comme si un cœur battait dedans.',
  ],
  pocket: ['Cousue de fil d’argent. Ce qui est dedans ne peut pas être perdu, dit-on.', 'Les contrebandiers ne meurent jamais les poches vides.'],
};

export function itemLore(item) {
  if (item.kind === 'consumable') return CONSUMABLES[item.id].lore;
  let list = LORE.armor;
  if (item.slot === 'weapon') list = WEAPONS[item.base] && WEAPONS[item.base].ranged ? LORE.ranged : LORE.weapon;
  else if (item.slot === 'offhand') list = offhandType(item) === 'quiver' ? LORE.quiver : LORE.shield;
  else if (item.slot === 'amulet' || item.slot === 'ring') list = LORE.jewel;
  else if (item.slot === 'pocket') list = LORE.pocket;
  let h = 0;
  for (const c of item.uid || item.name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return list[Math.abs(h) % list.length];
}

export function makeConsumable(id, qty = 1) {
  return { uid: uid(), kind: 'consumable', id, qty };
}

export function offhandType(item) { return item.offType || 'shield'; }

// Classe à laquelle l'objet est réservé (null = toutes).
export function itemClass(item) {
  if (!item || item.kind !== 'equip') return null;
  if (item.slot === 'weapon') return WEAPONS[item.base] ? WEAPONS[item.base].cls : null;
  if (item.slot === 'offhand') return OFFHANDS[offhandType(item)].cls;
  return null;
}

export function rollRarity(ilvl, bonus = 0) {
  // bonus : 0 normal, 1 élite / coffre, 2 boss
  const m = 1 + bonus * 0.8 + ilvl * 0.02;
  return weightedPick([
    { w: 100 / (1 + bonus * 0.5), v: 0 },
    { w: 30 * m, v: 1 },
    { w: 6 * m ** 1.5, v: 2 },
    { w: 1.2 * m ** 2, v: 3 },
    { w: 0.15 * m ** 2.5 * (ilvl >= 5 ? 1 : 0.25), v: 4 },
  ]);
}

const RANDOM_SLOTS = [
  { w: 16, v: 'weapon' }, { w: 8, v: 'offhand' }, { w: 10, v: 'head' }, { w: 10, v: 'chest' },
  { w: 10, v: 'legs' }, { w: 10, v: 'feet' }, { w: 10, v: 'hands' }, { w: 6, v: 'amulet' }, { w: 6, v: 'ring' },
  { w: 2, v: 'pocket' },
];

const CLASS_IDS = ['guerrier', 'rodeur'];

// cls : classe visée pour les armes / mains gauches (sinon, une classe au hasard).
export function generateItem({ ilvl = 1, rarity = null, slot = null, rarityBonus = 0, minRarity = 0, weaponType = null, cls = null, offType = null } = {}) {
  ilvl = Math.max(1, Math.round(ilvl));
  if (!slot) slot = weightedPick(RANDOM_SLOTS);
  if (rarity === null) rarity = rollRarity(ilvl, rarityBonus);
  rarity = Math.max(rarity, minRarity);
  const R = RARITIES[rarity];
  const item = { uid: uid(), kind: 'equip', slot, rarity, ilvl, affixes: [] };
  const forCls = cls || pick(CLASS_IDS);

  if (slot === 'pocket') {
    const p = POCKETS[rarity];
    item.name = p.name;
    item.secureSlots = p.slots;
    item.value = Math.round(20 * R.value);
    return item;
  }

  const tier = clamp(Math.floor((ilvl - 1) / 4), 0, MATERIALS.length - 1);
  let baseName;
  let mats = MATERIALS;
  let affixPool = SLOT_AFFIXES[slot];
  if (slot === 'weapon') {
    const types = Object.keys(WEAPONS).filter((k) => WEAPONS[k].cls === forCls);
    const wt = weaponType || pick(types);
    const W = WEAPONS[wt];
    item.base = wt;
    item.dmg = Math.max(3, Math.round((5 + ilvl * 1.7) * W.dmg * R.mult * rand(0.9, 1.1)));
    baseName = W.name;
    if (W.ranged) mats = WOOD_MATERIALS;
  } else if (slot === 'offhand') {
    const ot = offType || (forCls === 'rodeur' ? 'quiver' : 'shield');
    item.offType = ot;
    baseName = pick(OFFHANDS[ot].names);
    if (ot === 'shield') {
      item.armor = Math.max(1, Math.round((3 + ilvl * 1.5) * R.mult * rand(0.9, 1.1)));
      item.block = Math.round(rand(8, 14) + rarity * 2);
    } else {
      item.dmgBonus = Math.round((4 + ilvl * 0.35) * R.mult);
      affixPool = SLOT_AFFIXES.quiver;
      mats = ['en cuir', 'en cuir bouilli', 'clouté', 'en peau de wyrm', 'en soie d’ombre', 'en écailles', 'des Abysses'];
    }
  } else {
    const B = ARMOR_BASES[slot];
    baseName = pick(B.names);
    if (B.armor) item.armor = Math.max(1, Math.round((B.armor[0] + ilvl * B.armor[1] * 0.8) * R.mult * rand(0.9, 1.1)));
    if (slot === 'amulet' || slot === 'ring') mats = JEWEL_MATERIALS;
  }
  item.name = `${baseName} ${mats[tier]}`;

  const nAff = R.affixes + (slot === 'amulet' || slot === 'ring' ? 1 : 0);
  const pool = [...affixPool];
  for (let i = 0; i < nAff && pool.length; i++) {
    const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    let v = AFFIXES[k].roll(ilvl);
    v = typeof v === 'number' && !Number.isInteger(v) ? +(v * R.mult).toFixed(1) : Math.round(v * R.mult);
    item.affixes.push({ k, v });
  }
  if (rarity >= 2 && item.affixes.length) item.name += ' ' + AFFIXES[item.affixes[0].k].suffix;
  item.value = Math.round((6 + ilvl * 2.5) * R.value);
  return item;
}

export function itemName(item) {
  if (item.kind === 'consumable') return CONSUMABLES[item.id].name;
  return item.name;
}

export function itemColor(item) {
  if (item.kind === 'consumable') return CONSUMABLES[item.id].color;
  return RARITIES[item.rarity].color;
}

export function itemRarity(item) {
  return item.kind === 'consumable' ? CONSUMABLES[item.id].rarity : item.rarity;
}

export function sellValue(item) {
  if (item.kind === 'consumable') return Math.max(1, Math.floor(CONSUMABLES[item.id].price / 3)) * item.qty;
  return item.value;
}

export function buyPrice(item) {
  if (item.kind === 'consumable') return CONSUMABLES[item.id].price;
  return item.value * 6;
}

export function affixText(a) {
  const A = AFFIXES[a.k];
  if (A.pct) return `+${a.v}${A.label}`;
  return `+${a.v} ${A.label}`;
}

export function isTwoHanded(item) {
  return item && item.slot === 'weapon' && WEAPONS[item.base] && WEAPONS[item.base].hands === 2;
}

export function slotLabel(item) {
  if (item.slot === 'weapon') return WEAPONS[item.base].name;
  if (item.slot === 'offhand') return OFFHANDS[offhandType(item)].label;
  return SLOTS[item.slot].label;
}

// Équipement de départ selon la classe.
export function starterKit(cls) {
  const pocket = generateItem({ rarity: 0, slot: 'pocket' });
  if (cls === 'rodeur') {
    const bow = generateItem({ ilvl: 1, rarity: 0, slot: 'weapon', weaponType: 'arccourt', cls });
    bow.name = 'Arc de chasse fendu';
    bow.dmg = 8;
    const quiver = generateItem({ ilvl: 1, rarity: 0, slot: 'offhand', cls });
    quiver.name = 'Carquois rapiécé';
    quiver.dmgBonus = 3;
    const chest = generateItem({ ilvl: 1, rarity: 0, slot: 'chest' });
    chest.name = 'Pourpoint de cuir usé';
    chest.armor = 3;
    return { weapon: bow, offhand: quiver, chest, pocket };
  }
  const sword = generateItem({ ilvl: 1, rarity: 0, slot: 'weapon', weaponType: 'epee', cls: 'guerrier' });
  sword.name = 'Épée rouillée';
  sword.dmg = 8;
  const shield = generateItem({ ilvl: 1, rarity: 0, slot: 'offhand', cls: 'guerrier' });
  shield.name = 'Bouclier en bois';
  shield.armor = 3;
  shield.block = 8;
  const chest = generateItem({ ilvl: 1, rarity: 0, slot: 'chest' });
  chest.name = 'Gambison usé';
  chest.armor = 4;
  return { weapon: sword, offhand: shield, chest, pocket };
}

// Pièce d'ensemble : statistiques d'un objet rare (2 affixes) et — surtout — elle grandit avec votre
// niveau (rescaleSetItem) : une pièce trouvée tôt reste utile, et l'ensemble complet vaut toujours la peine.
export function generateSetItem(setId, slot = null, ilvl = 1) {
  const S = SETS[setId];
  const slots = Object.keys(S.pieces);
  if (!slot || !S.pieces[slot]) slot = pick(slots);
  const R = RARITIES[5];
  const item = { uid: uid(), kind: 'equip', slot, rarity: 5, ilvl: Math.max(1, Math.round(ilvl)), affixes: [], set: setId };
  item.roll = { a: rand(0.92, 1.06), il0: item.ilvl };
  const pool = [...SLOT_AFFIXES[slot]];
  for (let i = 0; i < R.affixes && pool.length; i++) {
    const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    item.affixes.push({ k, v: 0, q: rand(0.85, 1.15) });
  }
  item.name = `${S.pieces[slot]} · ${S.name}`;
  rescaleSetItem(item, item.ilvl);
  return item;
}

// Valeur moyenne d'un affixe à un niveau donné (moyenne de tirages, mise en cache).
const affixMean = {};
function meanAffix(k, il) {
  const key = k + ':' + il;
  if (affixMean[key] === undefined) { let t = 0; for (let i = 0; i < 40; i++) t += AFFIXES[k].roll(il); affixMean[key] = t / 40; }
  return affixMean[key];
}

// Remet une pièce d'ensemble au niveau donné (jamais en dessous de son niveau actuel).
export function rescaleSetItem(item, level) {
  if (!item || !item.set) return false;
  const il = Math.max(item.ilvl || 1, Math.round(level));
  if (item.roll && item.roll.done === il) return false;
  if (!item.roll) item.roll = { a: 1, il0: item.ilvl };
  const R = RARITIES[5];
  item.ilvl = il;
  const B = ARMOR_BASES[item.slot];
  if (B && B.armor) item.armor = Math.max(1, Math.round((B.armor[0] + il * B.armor[1] * 0.8) * R.mult * item.roll.a * (1 + 0.12 * (item.up || 0))));
  for (const a of item.affixes) {
    if (a.q === undefined) a.q = 1;
    let v = meanAffix(a.k, il) * R.mult * a.q;
    a.v = !Number.isInteger(AFFIXES[a.k].roll(il)) ? +v.toFixed(1) : Math.max(1, Math.round(v));
  }
  item.value = Math.round((6 + il * 2.5) * R.value);
  item.roll.done = il;
  return true;
}
