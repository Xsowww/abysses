// Ensembles d'équipement : chaque pièce est faible seule, mais l'ensemble donne des bonus croissants.
// Paliers : 2 pièces (+10 à 20 %), 3 pièces (~ +50 %), ensemble complet (bonus énorme + effet unique).
// Les pièces trouvées en expédition valent la peine d'être rapportées (poche sécurisée !) pour compléter un ensemble plus tard.
//
// pieces : emplacement -> mot de base du nom (le premier mot sert aussi à l'apparence du personnage)
// bonus  : { nbPièces: { stat: valeur } } — stats additionnées dans player.recalc()
// Stats spéciales : killHeal (% PV max rendus par ennemi tué), rollHeal (% PV max par roulade),
// eliteDmg (% dégâts contre élites et Gardiens), goldFind (% d'or ramassé).

export const SETS = {
  garde: {
    name: 'Garde des Cloches', minDepth: 1, color: '#5fb39b',
    lore: 'Les derniers soldats de Valdrenne juraient de tenir la Porte Basse « tant qu’il resterait un os pour la tenir ».',
    pieces: { head: 'Heaume', chest: 'Plastron', hands: 'Gantelets', legs: 'Jambières', feet: 'Solerets' },
    bonus: {
      2: { armorPct: 15, hpPct: 10 },
      3: { armorPct: 50, hpPct: 25, block: 10 },
      5: { armorPct: 100, hpPct: 50, block: 15, thorns: 40 },
    },
    special: 'Serment de la Porte : renvoie 40 % des dégâts subis.',
  },
  sonneurs: {
    name: 'Robe des Sonneurs', minDepth: 2, color: '#5fb39b',
    lore: 'Ceux qui chantent pour que la Noire sonne une dernière fois. Leurs robes sentent l’encens et le bronze chaud.',
    pieces: { head: 'Capuche', chest: 'Pourpoint', amulet: 'Pendentif', ring: 'Anneau' },
    bonus: {
      2: { critDmg: 20, cdr: 10 },
      3: { critDmg: 50, crit: 8, cdr: 15 },
      4: { critDmg: 100, crit: 15, cdr: 25, killHeal: 3 },
    },
    special: 'Treizième coup : chaque ennemi abattu rend 3 % des PV max.',
  },
  haldis: {
    name: 'Sentinelle creuse', minDepth: 2, color: '#5fb39b',
    lore: 'Haldis gardait les portes, avec ordre de ne laisser passer personne. Pas même le roi.',
    pieces: { legs: 'Grèves', feet: 'Bottes', hands: 'Gants', amulet: 'Talisman' },
    bonus: {
      2: { stamina: 15, staRegen: 15 },
      3: { stamina: 40, staRegen: 50, moveSpd: 8, rollCost: 25 },
      4: { stamina: 60, staRegen: 80, moveSpd: 15, rollCost: 40, rollHeal: 4 },
    },
    special: 'Veille sans fin : chaque roulade rend 4 % des PV max.',
  },
  prieur: {
    name: 'Ornements du Prieur', minDepth: 3, color: '#5fb39b',
    lore: 'Il prêchait que la Cloche rassemble. Ses ornements, eux, rassemblent le sang des autres.',
    pieces: { head: 'Camail', hands: 'Mitaines', ring: 'Chevalière', amulet: 'Médaillon' },
    bonus: {
      2: { lifesteal: 2, hpRegen: 1 },
      3: { lifesteal: 5, hpRegen: 3, dmgPct: 15 },
      4: { lifesteal: 9, hpRegen: 6, dmgPct: 30, execute: 40 },
    },
    special: 'Dernier sacrement : +40 % de dégâts contre les ennemis à moins de 30 % de vie.',
  },
  varn: {
    name: 'Bourreau muet', minDepth: 4, color: '#5fb39b',
    lore: 'Varn n’a jamais parlé. On dit que sa hache le faisait à sa place.',
    pieces: { chest: 'Brigandine', legs: 'Cuissards', hands: 'Gants', ring: 'Bague', amulet: 'Médaillon' },
    bonus: {
      2: { dmgPct: 15, atkSpd: 8 },
      3: { dmgPct: 50, atkSpd: 15, critDmg: 25 },
      5: { dmgPct: 100, atkSpd: 30, critDmg: 50, eliteDmg: 50 },
    },
    special: 'Sentence : +50 % de dégâts contre les élites et les Gardiens.',
  },
  roi: {
    name: 'Regalia du Roi sans cloche', minDepth: 5, color: '#5fb39b',
    lore: 'Aldaric III fit couler la Noire, puis la fit briser. Sa couronne pèse encore plus lourd que sa faute.',
    pieces: { head: 'Casque', chest: 'Haubert', legs: 'Jambières', feet: 'Bottines', ring: 'Chevalière' },
    bonus: {
      2: { hpPct: 15, dmgPct: 15, goldFind: 15 },
      3: { hpPct: 40, dmgPct: 40, armorPct: 40, goldFind: 30 },
      5: { hpPct: 80, dmgPct: 80, armorPct: 80, crit: 10, goldFind: 60, killHeal: 2 },
    },
    special: 'Trésor royal : +60 % d’or ramassé et 2 % de PV par ennemi abattu.',
  },
};

export const SET_STAT_LABEL = {
  armorPct: '% d’armure', hpPct: '% de PV max', block: '% de blocage', thorns: '% de dégâts renvoyés',
  critDmg: '% de dégâts critiques', cdr: '% de réduction de recharge', crit: '% de chance de critique', killHeal: '% de PV par ennemi abattu',
  stamina: 'endurance max', staRegen: '% de régén. d’endurance', moveSpd: '% de vitesse', rollCost: '% de coût de roulade en moins', rollHeal: '% de PV par roulade',
  lifesteal: '% de vol de vie', hpRegen: 'PV régénérés / s', dmgPct: '% de dégâts', execute: '% de dégâts aux ennemis affaiblis',
  atkSpd: '% de vitesse d’attaque', eliteDmg: '% de dégâts aux élites et Gardiens', goldFind: '% d’or ramassé',
};

export function setBonusText(stats) {
  return Object.entries(stats).map(([k, v]) => `+${v} ${SET_STAT_LABEL[k] || k}`).join(', ');
}

// Nombre de pièces portées par ensemble.
export function equippedSetCounts(equipment) {
  const n = {};
  for (const slot in equipment) {
    const it = equipment[slot];
    if (it && it.set) n[it.set] = (n[it.set] || 0) + 1;
  }
  return n;
}

// Bonus actifs : palier le plus haut atteint pour chaque ensemble.
export function activeSetStats(equipment) {
  const out = {};
  const counts = equippedSetCounts(equipment);
  for (const id in counts) {
    const S = SETS[id];
    if (!S) continue;
    // seul le palier le plus haut atteint compte (chaque palier contient déjà le total)
    const tier = Object.keys(S.bonus).map(Number).filter((t) => counts[id] >= t).sort((a, b) => b - a)[0];
    if (tier) for (const [k, v] of Object.entries(S.bonus[tier])) out[k] = (out[k] || 0) + v;
  }
  return out;
}

// Ensembles disponibles à une profondeur donnée.
export function setsForDepth(depth) {
  return Object.keys(SETS).filter((id) => SETS[id].minDepth <= depth);
}

// Prix d'une pièce commandée chez Mira (en Sceaux de Valdrenne).
export const SET_PIECE_COST = 3;
