// Objets uniques : nom fixe, statistiques fixes (qui suivent le palier de l'objet) et parfois un pouvoir.
// Rareté 6. Ils tombent des Gardiens, rarement des champions et des coffres ornés.
import { generateItem } from './items.js';
import { pick, uid } from '../core/util.js';

// st(il) : statistiques ; power : texte du pouvoir (géré en jeu via item.uniq)
export const UNIQUES = {
  serment: { name: 'Serment brisé', slot: 'weapon', base: 'epee', cls: 'guerrier', st: (il) => ({ dmgPct: 18 + il, lifesteal: 3, killHeal: 2 }), lore: 'Il a juré de protéger. Il a menti.' },
  fendeuse: { name: 'Fendeuse de cloches', slot: 'weapon', base: 'espadon', cls: 'guerrier', st: (il) => ({ critDmg: 40 + il * 2, execute: 30 }), lore: 'Le bronze chante encore quand elle frappe.' },
  glas: { name: 'Le Glas', slot: 'weapon', base: 'masse', cls: 'guerrier', st: (il) => ({ dmgPct: 12 + il, crit: 6 }), power: 'Les coups critiques étourdissent 1 s.', lore: 'Un battant de cloche, monté sur un manche.' },
  veuve: { name: 'Murmure de la Veuve', slot: 'weapon', base: 'arc', cls: 'rodeur', st: (il) => ({ crit: 10 + il * 0.3, pierce: 2 }), lore: 'Elle n’a jamais manqué. Pas même son mari.' },
  dard: { name: 'Dard de Morvagne', slot: 'weapon', base: 'arbalete', cls: 'rodeur', st: (il) => ({ poison: 40 + il, atkSpd: 10 }), lore: 'Les carreaux suintent.' },
  sonneur: { name: 'Bâton du Premier Sonneur', slot: 'weapon', base: 'baton', cls: 'mage', st: (il) => ({ dmgPct: 15 + il, cdr: 12 }), lore: 'Il a sonné le premier coup. Il attend le treizième.' },
  oeilv: { name: 'Œil de Valdrenne', slot: 'weapon', base: 'sceptre', cls: 'mage', st: (il) => ({ dmgPct: 10 + il, critDmg: 30 }), power: 'Explosions 50 % plus grandes.', lore: 'La pierre regarde. Toujours.' },
  noyes: { name: 'Codex des Noyés', slot: 'offhand', offType: 'tome', cls: 'mage', st: (il) => ({ cdr: 18, stamina: 25, hp: 20 + il * 3 }), lore: 'Les pages sont gonflées d’eau. L’encre, non.' },
  egide: { name: 'Égide du Gardien d’Os', slot: 'offhand', offType: 'shield', cls: 'guerrier', st: (il) => ({ thorns: 35, dr: 8, hp: 20 + il * 3 }), lore: 'Corvin la portait. Elle ne l’a pas quitté.' },
  carquois: { name: 'Carquois sans fond', slot: 'offhand', offType: 'quiver', cls: 'rodeur', st: (il) => ({ atkSpd: 15, staRegen: 30 }), lore: 'On y plonge la main. Quelque chose la serre.' },
  couronne: { name: 'Couronne du Roi sans cloche', slot: 'head', st: (il) => ({ dmgPct: 22, eliteDmg: 25, hpPct: -10 }), lore: 'Lourde. Plus lourde que le crâne qui la portait.' },
  fuyard: { name: 'Bottes du Fuyard', slot: 'feet', st: (il) => ({ rollCost: 40, moveSpd: 12, rollHeal: 2 }), lore: 'Leur ancien propriétaire est remonté. Seul.' },
  linceul: { name: 'Linceul de Maëlis', slot: 'chest', st: (il) => ({ hpPct: 15, dr: 8, hpRegen: 1 + il * 0.1 }), lore: 'Brodé à la main. Une lignée entière y est cousue.' },
  braise: { name: 'Cœur de braise', slot: 'amulet', st: (il) => ({ dmgPct: 10, crit: 5 }), power: 'Tous vos coups brûlent.', lore: 'Il bat. Lentement. Chaudement.' },
  treize: { name: 'Anneau du treizième coup', slot: 'ring', st: (il) => ({ critDmg: 25, crit: 6 }), power: 'Un coup sur treize inflige ×5.', lore: 'Douze encoches. La treizième est fraîche.' },
};

export const UNIQUE_RARITY = 6;

export function generateUnique(id, ilvl) {
  const U = UNIQUES[id];
  const it = generateItem({ ilvl, rarity: 4, slot: U.slot, weaponType: U.base || null, cls: U.cls || null, offType: U.offType || null });
  it.rarity = UNIQUE_RARITY;
  it.uniq = id;
  it.name = U.name;
  if (U.slot === 'chest') it.name = U.name; // nom fixe, apparence de la robe/armure tirée au hasard
  const st = U.st(ilvl);
  it.affixes = Object.entries(st).map(([k, v]) => ({ k, v: Number.isInteger(v) ? v : +v.toFixed(1) }));
  it.value = Math.round(it.value * 1.4);
  it.uid = uid();
  return it;
}

// Un unique au hasard (de préférence pour la classe du joueur).
export function randomUnique(cls, ilvl) {
  const ok = Object.keys(UNIQUES).filter((k) => !UNIQUES[k].cls || UNIQUES[k].cls === cls);
  return generateUnique(pick(ok), ilvl);
}
