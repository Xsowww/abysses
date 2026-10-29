// Classes, compétences et arbres de talents.

export const SPEC_LEVEL = 10;

export const SKILLS = {
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
};

// stats(r) : bonus accordés pour r rangs. Les clés correspondent à Player.stats.
export const CLASSES = {
  guerrier: {
    name: 'Guerrier',
    color: '#c9473b',
    desc: 'Combattant au corps à corps, robuste et brutal. Épée et bouclier, ou arme à deux mains.',
    special: {
      name: 'Frappe lourde', cd: 1.4, stamina: 25,
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
        color: '#e0442e',
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
        color: '#4f8fd6',
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
  rodeur: { name: 'Rôdeur', color: '#4caf50', locked: true, desc: 'Archer agile et mortel à distance. Bientôt disponible.' },
  mage: { name: 'Mage', color: '#6d6dff', locked: true, desc: 'Maître des arcanes et des sorts de zone. Bientôt disponible.' },
};

export function xpForLevel(level) {
  return Math.round(60 * Math.pow(level, 1.6));
}
