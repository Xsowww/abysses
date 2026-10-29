// Classes, compétences et arbres de talents.

export const SPEC_LEVEL = 10;

export const SKILLS = {
  // ----- Guerrier -----
  charge: {
    name: 'Charge', icon: 'charge', cd: 7, stamina: 20,
    desc: 'Foncez vers le curseur, infligeant 150 % des dégâts de l’arme et étourdissant 1 s les ennemis touchés. Invulnérable pendant la charge.',
  },
  tourbillon: {
    name: 'Tourbillon', icon: 'whirl', cd: 9, stamina: 30,
    desc: 'Tournoyez pendant 1,2 s, infligeant 60 % des dégâts de l’arme à tous les ennemis proches toutes les 0,25 s.',
  },
  cri: {
    name: 'Cri de guerre', icon: 'shout', cd: 18, stamina: 0,
    desc: '+30 % de dégâts et +20 % de vitesse d’attaque pendant 8 s. Les ennemis proches sont ralentis de 40 % pendant 3 s.',
  },
  dechainement: {
    name: 'Déchaînement', icon: 'rage', cd: 25, stamina: 0,
    desc: '8 s : +40 % de vitesse d’attaque, +8 % de vol de vie, mais vous subissez 15 % de dégâts en plus.',
  },
  murdefer: {
    name: 'Mur de fer', icon: 'wall', cd: 22, stamina: 0,
    desc: '5 s : -60 % de dégâts subis, renvoie 30 % des dégâts subis, régénération d’endurance doublée.',
  },
  // ----- Rôdeur -----
  salve: {
    name: 'Salve', icon: 'salve', cd: 6, stamina: 20,
    desc: 'Tire 5 flèches en éventail, chacune infligeant 75 % des dégâts de l’arme.',
  },
  piege: {
    name: 'Piège à mâchoires', icon: 'trap', cd: 8, stamina: 15,
    desc: 'Pose un piège à vos pieds (2 au maximum). Le premier ennemi qui marche dessus subit 250 % des dégâts de l’arme et reste immobilisé 2,5 s.',
  },
  pluie: {
    name: 'Pluie de flèches', icon: 'rain', cd: 11, stamina: 30,
    desc: 'Une pluie de flèches s’abat sur la zone visée pendant 1,5 s : 6 vagues de 45 % des dégâts de l’arme.',
  },
  oeil: {
    name: 'Œil du faucon', icon: 'eye', cd: 24, stamina: 0,
    desc: '6 s : tous vos tirs sont critiques et votre vitesse d’attaque augmente de 30 %.',
  },
  voile: {
    name: 'Voile d’ombre', icon: 'veil', cd: 20, stamina: 0,
    desc: '4 s : vous devenez invisible. Les ennemis perdent votre trace et vos attaques infligent 50 % de dégâts en plus.',
  },
};

// stats(r) : bonus accordés pour r rangs. Les clés correspondent à Player.stats.
export const CLASSES = {
  guerrier: {
    name: 'Guerrier',
    color: '#8e3a2e',
    title: 'Lame du serment brisé',
    desc: 'Combattant au corps à corps, robuste et brutal. Épée et bouclier, ou arme à deux mains.',
    hpBase: 100, hpPerLvl: 14, speed: 210,
    special: {
      name: 'Frappe lourde', icon: 'special', cd: 1.4, stamina: 25,
      desc: 'Un coup puissant infligeant 220 % des dégâts de l’arme sur un large arc, avec un fort recul.',
    },
    tierReq: [0, 3, 6, 9],
    talents: [
      { id: 'vigueur', name: 'Vigueur', tier: 0, max: 5, desc: (r) => `+${6 * r} % de PV max`, stats: (r) => ({ hpPct: 6 * r }) },
      { id: 'force', name: 'Force brute', tier: 0, max: 5, desc: (r) => `+${4 * r} % de dégâts`, stats: (r) => ({ dmgPct: 4 * r }) },
      { id: 'endurance', name: 'Endurance', tier: 0, max: 3, desc: (r) => `+${10 * r} d’endurance max`, stats: (r) => ({ stamina: 10 * r }) },
      { id: 'charge', name: 'Charge', tier: 1, max: 1, skill: 'charge', desc: () => 'Débloque la compétence Charge.' },
      { id: 'peaudefer', name: 'Peau de fer', tier: 1, max: 3, desc: (r) => `+${5 * r} d’armure`, stats: (r) => ({ armor: 5 * r }) },
      { id: 'souffle', name: 'Second souffle', tier: 1, max: 3, desc: (r) => `+${15 * r} % de régén. d’endurance`, stats: (r) => ({ staRegen: 15 * r }) },
      { id: 'tourbillon', name: 'Tourbillon', tier: 2, max: 1, skill: 'tourbillon', desc: () => 'Débloque la compétence Tourbillon.' },
      { id: 'precision', name: 'Précision', tier: 2, max: 3, desc: (r) => `+${3 * r} % de chance de critique`, stats: (r) => ({ crit: 3 * r }) },
      { id: 'sang', name: 'Goût du sang', tier: 2, max: 3, desc: (r) => `+${r} % de vol de vie`, stats: (r) => ({ lifesteal: r }) },
      { id: 'cri', name: 'Cri de guerre', tier: 3, max: 1, skill: 'cri', desc: () => 'Débloque la compétence Cri de guerre.' },
      { id: 'maitre', name: 'Maître d’armes', tier: 3, max: 2, desc: (r) => `+${8 * r} % de vitesse d’attaque`, stats: (r) => ({ atkSpd: 8 * r }) },
      { id: 'brutal', name: 'Coups brutaux', tier: 3, max: 2, desc: (r) => `+${20 * r} % de dégâts critiques`, stats: (r) => ({ critDmg: 20 * r }) },
    ],
    specs: {
      berserker: {
        name: 'Berserker',
        color: '#a8402c',
        desc: 'Offensive pure : vitesse, vol de vie et exécutions. Vous vivez en frappant.',
        tierReq: [0, 2, 4],
        talents: [
          { id: 'b_frenesie', name: 'Frénésie', tier: 0, max: 3, desc: (r) => `+${5 * r} % de vitesse d’attaque`, stats: (r) => ({ atkSpd: 5 * r }) },
          { id: 'b_soif', name: 'Soif de sang', tier: 0, max: 3, desc: (r) => `+${1.5 * r} % de vol de vie`, stats: (r) => ({ lifesteal: 1.5 * r }) },
          { id: 'b_execution', name: 'Exécution', tier: 1, max: 2, desc: (r) => `+${30 * r} % de dégâts contre les ennemis sous 30 % de PV`, stats: (r) => ({ execute: 30 * r }) },
          { id: 'b_rage', name: 'Rage aveugle', tier: 1, max: 3, desc: (r) => `+${6 * r} % de dégâts, +${4 * r} % de chance de critique`, stats: (r) => ({ dmgPct: 6 * r, crit: 4 * r }) },
          { id: 'b_dechainement', name: 'Déchaînement', tier: 2, max: 1, skill: 'dechainement', desc: () => 'Débloque la compétence Déchaînement.' },
        ],
      },
      gardien: {
        name: 'Gardien',
        color: '#4f7aa8',
        desc: 'Défense inébranlable : armure, blocage et représailles. Vous tenez la ligne.',
        tierReq: [0, 2, 4],
        talents: [
          { id: 'g_rempart', name: 'Rempart', tier: 0, max: 3, desc: (r) => `+${8 * r} % d’armure`, stats: (r) => ({ armorPct: 8 * r }) },
          { id: 'g_parade', name: 'Parade', tier: 0, max: 3, desc: (r) => `+${4 * r} % de chance de bloquer`, stats: (r) => ({ block: 4 * r }) },
          { id: 'g_represailles', name: 'Représailles', tier: 1, max: 2, desc: (r) => `Renvoie ${15 * r} % des dégâts subis`, stats: (r) => ({ thorns: 15 * r }) },
          { id: 'g_robuste', name: 'Robustesse', tier: 1, max: 3, desc: (r) => `+${8 * r} % de PV max, +${0.5 * r} PV/s`, stats: (r) => ({ hpPct: 8 * r, hpRegen: 0.5 * r }) },
          { id: 'g_murdefer', name: 'Mur de fer', tier: 2, max: 1, skill: 'murdefer', desc: () => 'Débloque la compétence Mur de fer.' },
        ],
      },
    },
  },
  rodeur: {
    name: 'Rôdeur',
    color: '#4f6a3a',
    title: 'Chasseur des profondeurs',
    desc: 'Archer agile qui frappe de loin. Fragile au contact, mortel à distance. Arcs, arbalètes et pièges.',
    hpBase: 88, hpPerLvl: 12, speed: 225,
    special: {
      name: 'Tir perçant', icon: 'pierce', cd: 1.6, stamina: 22,
      desc: 'Une flèche lourde qui traverse tous les ennemis sur sa trajectoire, infligeant 220 % des dégâts de l’arme.',
    },
    tierReq: [0, 3, 6, 9],
    talents: [
      { id: 'r_oeil', name: 'Œil aiguisé', tier: 0, max: 5, desc: (r) => `+${2 * r} % de chance de critique`, stats: (r) => ({ crit: 2 * r }) },
      { id: 'r_tension', name: 'Corde tendue', tier: 0, max: 5, desc: (r) => `+${4 * r} % de dégâts`, stats: (r) => ({ dmgPct: 4 * r }) },
      { id: 'r_pied', name: 'Pied léger', tier: 0, max: 3, desc: (r) => `+${4 * r} % de vitesse de déplacement`, stats: (r) => ({ moveSpd: 4 * r }) },
      { id: 'r_salve', name: 'Salve', tier: 1, max: 1, skill: 'salve', desc: () => 'Débloque la compétence Salve.' },
      { id: 'r_survie', name: 'Survivant', tier: 1, max: 3, desc: (r) => `+${7 * r} % de PV max`, stats: (r) => ({ hpPct: 7 * r }) },
      { id: 'r_souffle', name: 'Souffle court', tier: 1, max: 3, desc: (r) => `+${15 * r} % de régén. d’endurance`, stats: (r) => ({ staRegen: 15 * r }) },
      { id: 'r_piege', name: 'Piège à mâchoires', tier: 2, max: 1, skill: 'piege', desc: () => 'Débloque la compétence Piège à mâchoires.' },
      { id: 'r_letal', name: 'Pointes barbelées', tier: 2, max: 3, desc: (r) => `+${15 * r} % de dégâts critiques`, stats: (r) => ({ critDmg: 15 * r }) },
      { id: 'r_esquive', name: 'Roulade fluide', tier: 2, max: 2, desc: (r) => `Roulade : -${20 * r} % d’endurance`, stats: (r) => ({ rollCost: 20 * r }) },
      { id: 'r_pluie', name: 'Pluie de flèches', tier: 3, max: 1, skill: 'pluie', desc: () => 'Débloque la compétence Pluie de flèches.' },
      { id: 'r_cadence', name: 'Cadence', tier: 3, max: 2, desc: (r) => `+${8 * r} % de vitesse d’attaque`, stats: (r) => ({ atkSpd: 8 * r }) },
      { id: 'r_instinct', name: 'Instinct', tier: 3, max: 2, desc: (r) => `+${r} PV régénéré(s) / s`, stats: (r) => ({ hpRegen: r }) },
    ],
    specs: {
      tireur: {
        name: 'Tireur d’élite',
        color: '#b8964a',
        desc: 'Précision absolue : critiques dévastateurs et flèches qui traversent les rangs ennemis.',
        tierReq: [0, 2, 4],
        talents: [
          { id: 't_visee', name: 'Visée parfaite', tier: 0, max: 3, desc: (r) => `+${4 * r} % de chance de critique`, stats: (r) => ({ crit: 4 * r }) },
          { id: 't_impact', name: 'Impact', tier: 0, max: 3, desc: (r) => `+${20 * r} % de dégâts critiques`, stats: (r) => ({ critDmg: 20 * r }) },
          { id: 't_traverse', name: 'Flèches perforantes', tier: 1, max: 2, desc: (r) => `Vos tirs traversent ${r} ennemi(s) de plus`, stats: (r) => ({ pierce: r }) },
          { id: 't_distance', name: 'Longue portée', tier: 1, max: 3, desc: (r) => `+${8 * r} % de dégâts`, stats: (r) => ({ dmgPct: 8 * r }) },
          { id: 't_oeil', name: 'Œil du faucon', tier: 2, max: 1, skill: 'oeil', desc: () => 'Débloque la compétence Œil du faucon.' },
        ],
      },
      ombrelame: {
        name: 'Ombrelame',
        color: '#5a6a7a',
        desc: 'Venin et ombres : vos tirs empoisonnent, vous esquivez sans cesse et disparaissez à volonté.',
        tierReq: [0, 2, 4],
        talents: [
          { id: 'o_venin', name: 'Venin', tier: 0, max: 3, desc: (r) => `Vos tirs empoisonnent : ${25 * r} % des dégâts en plus sur 3 s`, stats: (r) => ({ poison: 25 * r }) },
          { id: 'o_ombre', name: 'Pas de l’ombre', tier: 0, max: 3, desc: (r) => `+${5 * r} % de vitesse, roulade -${10 * r} % d’endurance`, stats: (r) => ({ moveSpd: 5 * r, rollCost: 10 * r }) },
          { id: 'o_saignee', name: 'Saignée', tier: 1, max: 2, desc: (r) => `+${2 * r} % de vol de vie`, stats: (r) => ({ lifesteal: 2 * r }) },
          { id: 'o_nuee', name: 'Nuée', tier: 1, max: 3, desc: (r) => `+${6 * r} % de vitesse d’attaque`, stats: (r) => ({ atkSpd: 6 * r }) },
          { id: 'o_voile', name: 'Voile d’ombre', tier: 2, max: 1, skill: 'voile', desc: () => 'Débloque la compétence Voile d’ombre.' },
        ],
      },
    },
  },
  mage: { name: 'Mage', color: '#4a5a8a', title: 'Lettré de l’Abîme', locked: true, desc: 'Maître des arcanes et des sorts de zone. Bientôt disponible.' },
};

export function xpForLevel(level) {
  return Math.round(60 * Math.pow(level, 1.6));
}
