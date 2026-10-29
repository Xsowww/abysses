// Objets : emplacements, raretés, armes, affixes et génération aléatoire.
import { rand, randInt, pick, uid, weightedPick, clamp } from '../core/util.js';

export const SLOTS = {
  head: { label: 'Casque' },
  amulet: { label: 'Médaillon' },
  chest: { label: 'Plastron' },
  hands: { label: 'Gants' },
  legs: { label: 'Jambières' },
  ring: { label: 'Bague' },
  feet: { label: 'Bottes' },
  weapon: { label: 'Arme' },
  offhand: { label: 'Bouclier' },
  pocket: { label: 'Poche sécurisée' },
};
export const EQUIP_ORDER = ['head', 'amulet', 'chest', 'hands', 'legs', 'ring', 'feet', 'weapon', 'offhand', 'pocket'];

export const RARITIES = [
  { id: 0, name: 'Commun', color: '#b9b4a8', affixes: 0, mult: 1.0, value: 1 },
  { id: 1, name: 'Peu commun', color: '#5fd16f', affixes: 1, mult: 1.12, value: 2.5 },
  { id: 2, name: 'Rare', color: '#4f9dff', affixes: 2, mult: 1.25, value: 6 },
  { id: 3, name: 'Épique', color: '#b764ff', affixes: 3, mult: 1.4, value: 15 },
  { id: 4, name: 'Légendaire', color: '#ff9a2e', affixes: 4, mult: 1.6, value: 40 },
];

export const WEAPONS = {
  epee: { name: 'Épée', hands: 1, dmg: 1.0, cd: 0.42, range: 62, arc: 110, kb: 140 },
  hache: { name: 'Hache', hands: 1, dmg: 1.15, cd: 0.52, range: 58, arc: 100, kb: 160 },
  masse: { name: 'Masse', hands: 1, dmg: 1.25, cd: 0.58, range: 56, arc: 90, kb: 230 },
  espadon: { name: 'Espadon', hands: 2, dmg: 1.75, cd: 0.78, range: 84, arc: 150, kb: 200 },
  marteau: { name: 'Marteau de guerre', hands: 2, dmg: 2.05, cd: 0.95, range: 72, arc: 120, kb: 320 },
};
export const FISTS = { name: 'Poings', hands: 1, dmg: 1, cd: 0.4, range: 42, arc: 90, kb: 60 };

const ARMOR_BASES = {
  head: { names: ['Casque', 'Heaume', 'Camail'], armor: [2, 1.0] },
  chest: { names: ['Plastron', 'Haubert', 'Brigandine'], armor: [4, 1.8] },
  legs: { names: ['Jambières', 'Grèves', 'Cuissards'], armor: [3, 1.4] },
  feet: { names: ['Bottes', 'Solerets', 'Bottines'], armor: [1.5, 0.8] },
  hands: { names: ['Gants', 'Gantelets', 'Mitaines'], armor: [1.5, 0.8] },
  offhand: { names: ['Bouclier', 'Écu', 'Pavois', 'Rondache'], armor: [3, 1.5] },
  amulet: { names: ['Médaillon', 'Talisman', 'Pendentif'] },
  ring: { names: ['Bague', 'Anneau', 'Chevalière'] },
};

// Matériaux invariables (pas d'accord au féminin / pluriel).
const MATERIALS = ['en fer', 'en acier', 'en acier trempé', 'en acier noir', 'en mithril', 'en orichalque', 'des Abysses'];
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
  dmgPct: { label: '% de dégâts', pct: true, suffix: 'du Guerrier', roll: (il) => Math.round(rand(3, 6) + il * 0.15) },
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
  head: ['hp', 'armor', 'crit', 'cdr', 'hpRegen'],
  chest: ['hp', 'armor', 'stamina', 'hpRegen', 'dmgPct'],
  legs: ['hp', 'armor', 'stamina', 'staRegen', 'moveSpd'],
  feet: ['hp', 'armor', 'moveSpd', 'staRegen', 'stamina'],
  hands: ['armor', 'atkSpd', 'crit', 'critDmg', 'dmgPct'],
  amulet: ['hp', 'dmgPct', 'crit', 'critDmg', 'lifesteal', 'cdr', 'hpRegen', 'stamina'],
  ring: ['dmgPct', 'crit', 'critDmg', 'atkSpd', 'lifesteal', 'moveSpd', 'cdr', 'hp'],
};

export const CONSUMABLES = {
  potion: { name: 'Potion de soin', desc: 'Rend 40 % des PV max.', stack: 20, price: 15, rarity: 0, color: '#e0404a' },
  pierre: { name: 'Pierre de retour', desc: "Incantation de 5 s, puis retour au village avec votre butin. Interrompue si vous êtes touché.", stack: 5, price: 40, rarity: 2, color: '#7ad0ff' },
};

export function makeConsumable(id, qty = 1) {
  return { uid: uid(), kind: 'consumable', id, qty };
}

export function rollRarity(ilvl, bonus = 0) {
  // bonus : 0 normal, 1 élite / coffre, 2 boss
  const m = 1 + bonus * 0.8 + ilvl * 0.02;
  return weightedPick([
    { w: 100 / (1 + bonus * 0.5), v: 0 },
    { w: 35 * m, v: 1 },
    { w: 10 * m ** 1.5, v: 2 },
    { w: 2.5 * m ** 2, v: 3 },
    { w: 0.4 * m ** 2.5 * (ilvl >= 5 ? 1 : 0.25), v: 4 },
  ]);
}

const RANDOM_SLOTS = [
  { w: 16, v: 'weapon' }, { w: 8, v: 'offhand' }, { w: 10, v: 'head' }, { w: 10, v: 'chest' },
  { w: 10, v: 'legs' }, { w: 10, v: 'feet' }, { w: 10, v: 'hands' }, { w: 6, v: 'amulet' }, { w: 6, v: 'ring' },
  { w: 2, v: 'pocket' },
];

export function generateItem({ ilvl = 1, rarity = null, slot = null, rarityBonus = 0, minRarity = 0, weaponType = null } = {}) {
  ilvl = Math.max(1, Math.round(ilvl));
  if (!slot) slot = weightedPick(RANDOM_SLOTS);
  if (rarity === null) rarity = rollRarity(ilvl, rarityBonus);
  rarity = Math.max(rarity, minRarity);
  const R = RARITIES[rarity];
  const item = { uid: uid(), kind: 'equip', slot, rarity, ilvl, affixes: [] };

  if (slot === 'pocket') {
    const p = POCKETS[rarity];
    item.name = p.name;
    item.secureSlots = p.slots;
    item.value = Math.round(20 * R.value);
    return item;
  }

  const tier = clamp(Math.floor((ilvl - 1) / 4), 0, MATERIALS.length - 1);
  let baseName;
  if (slot === 'weapon') {
    const wt = weaponType || pick(Object.keys(WEAPONS));
    const W = WEAPONS[wt];
    item.base = wt;
    item.dmg = Math.max(3, Math.round((5 + ilvl * 2.2) * W.dmg * R.mult * rand(0.9, 1.1)));
    baseName = W.name;
  } else {
    const B = ARMOR_BASES[slot];
    baseName = pick(B.names);
    if (B.armor) item.armor = Math.max(1, Math.round((B.armor[0] + ilvl * B.armor[1]) * R.mult * rand(0.9, 1.1)));
    if (slot === 'offhand') item.block = Math.round(rand(8, 14) + rarity * 2);
  }
  const mats = slot === 'amulet' || slot === 'ring' ? JEWEL_MATERIALS : MATERIALS;
  item.name = `${baseName} ${mats[tier]}`;

  let nAff = R.affixes + (slot === 'amulet' || slot === 'ring' ? 1 : 0);
  const pool = [...SLOT_AFFIXES[slot]];
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

export function sellValue(item) {
  if (item.kind === 'consumable') return Math.max(1, Math.floor(CONSUMABLES[item.id].price / 3)) * item.qty;
  return item.value;
}

export function buyPrice(item) {
  if (item.kind === 'consumable') return CONSUMABLES[item.id].price;
  return item.value * 4;
}

export function affixText(a) {
  const A = AFFIXES[a.k];
  if (A.pct) return `+${a.v}${A.label}`;
  return `+${a.v} ${A.label}`;
}

export function isTwoHanded(item) {
  return item && item.slot === 'weapon' && WEAPONS[item.base] && WEAPONS[item.base].hands === 2;
}

// Starter du Guerrier
export function starterKit() {
  const sword = generateItem({ ilvl: 1, rarity: 0, slot: 'weapon', weaponType: 'epee' });
  sword.name = 'Épée rouillée';
  sword.dmg = 8;
  const shield = generateItem({ ilvl: 1, rarity: 0, slot: 'offhand' });
  shield.name = 'Bouclier en bois';
  shield.armor = 3;
  shield.block = 8;
  const chest = generateItem({ ilvl: 1, rarity: 0, slot: 'chest' });
  chest.name = 'Gambison usé';
  chest.armor = 4;
  const pocket = generateItem({ rarity: 0, slot: 'pocket' });
  return { weapon: sword, offhand: shield, chest, pocket };
}
