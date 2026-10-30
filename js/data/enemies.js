// Définition des monstres.
// ai : lunge (bond), melee (coup en cône), ranged (tir), caster (zone au sol), boss

export const ENEMIES = {
  rat: {
    name: 'Goule', r: 12, hp: 18, dmg: 7, speed: 146, xp: 4, gold: [0, 2],
    color: '#7a5a3a', ai: 'lunge', atkRange: 70, windup: 0.35, cd: 1.1, aggro: 322, weight: 1,
  },
  squelette: {
    name: 'Squelette', r: 14, hp: 44, dmg: 14, speed: 89, xp: 10, gold: [1, 4],
    color: '#d8d2c0', ai: 'melee', atkRange: 48, arc: 100, windup: 0.5, cd: 1.4, aggro: 368, weight: 3,
  },
  archer: {
    name: 'Archer squelette', r: 13, hp: 29, dmg: 13, speed: 78, xp: 12, gold: [1, 5],
    color: '#bdb7a0', ai: 'ranged', prefer: 220, atkRange: 380, windup: 0.8, cd: 1.9, projSpeed: 330, aggro: 437, weight: 3,
  },
  acolyte: {
    name: 'Acolyte des Abysses', r: 13, hp: 39, dmg: 22, speed: 71, xp: 16, gold: [2, 7],
    color: '#6b3fa0', ai: 'caster', atkRange: 320, windup: 0.9, cd: 2.7, aoeR: 58, aggro: 414, weight: 4,
  },
  cloche: {
    name: 'Cloche des Sonneurs', r: 18, hp: 91, dmg: 0, speed: 0, xp: 25, gold: [4, 9],
    color: '#6b5a3a', ai: 'static', aggro: 0, weight: 0,
  },
  gardien: {
    name: "Le Gardien d'Os", r: 34, hp: 546, dmg: 28, speed: 84, xp: 160, gold: [60, 90],
    color: '#e6dcc3', ai: 'boss', aggro: 483, boss: true, weight: 50,
  },
};

// Composition des groupes selon la profondeur.
export function enemyPool(depth) {
  const pool = [
    { w: 4, v: 'rat' },
    { w: 5, v: 'squelette' },
    { w: depth >= 1 ? 3 : 0, v: 'archer' },
  ];
  if (depth >= 2) pool.push({ w: 2 + depth * 0.5, v: 'acolyte' });
  return pool;
}

export function enemyLevel(depth) {
  return 1 + (depth - 1) * 3;
}

export function scaleFor(level) {
  return {
    hp: 1 + 0.42 * (level - 1),
    dmg: 1 + 0.24 * (level - 1),
    xp: 1 + 0.22 * (level - 1),
  };
}
