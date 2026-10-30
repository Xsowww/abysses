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
  seisme: {
    name: 'Séisme', icon: 'quake', cd: 14, stamina: 30,
    desc: 'Frappe le sol : 180 % des dégâts autour de vous, étourdit 1,5 s.',
  },
  tirexplosif: {
    name: 'Tir explosif', icon: 'bomb', cd: 10, stamina: 25,
    desc: 'Une flèche qui explose à l’impact : 250 % des dégâts dans la zone.',
  },
  // ----- Mage -----
  clignement: {
    name: 'Clignement', icon: 'blink', cd: 6, stamina: 18,
    desc: 'Téléportation vers le curseur (180 px max). Invulnérable un instant.',
  },
  nova: {
    name: 'Nova de givre', icon: 'nova', cd: 10, stamina: 28,
    desc: '120 % des dégâts autour de vous, ralentit de 50 % pendant 3 s.',
  },
  chaine: {
    name: 'Éclair en chaîne', icon: 'chain', cd: 8, stamina: 24,
    desc: 'Frappe l’ennemi le plus proche du curseur puis rebondit 4 fois (140 %).',
  },
  bouclier: {
    name: 'Bouclier de mana', icon: 'mshield', cd: 22, stamina: 0,
    desc: '6 s : -45 % de dégâts subis.',
  },
  meteore: {
    name: 'Météore', icon: 'meteor', cd: 12, stamina: 30,
    desc: 'Après 0,9 s, un météore s’écrase sur la zone visée : 380 % des dégâts, enflamme.',
  },
  armee: {
    name: 'Armée des morts', icon: 'skull', cd: 30, stamina: 20,
    desc: 'Lève 3 serviteurs autour de vous pendant 15 s.',
  },
};

// stats(r) : bonus accordés pour r rangs. Les clés correspondent à Player.stats.
export const CLASSES = {
  guerrier: {
    name: 'Guerrier',
    color: '#8e3a2e',
    title: 'Lame du serment brisé',
    desc: 'Corps à corps. Épée et bouclier, ou arme à deux mains.',
    hpBase: 100, hpPerLvl: 14, speed: 210,
    special: {
      name: 'Frappe lourde', icon: 'special', cd: 1.4, stamina: 25,
      desc: 'Un coup puissant infligeant 220 % des dégâts de l’arme sur un large arc, avec un fort recul.',
    },
    tierReq: [0, 3, 6, 9, 12],
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
      { id: 'seisme', name: 'Séisme', tier: 4, max: 1, skill: 'seisme', desc: () => 'Débloque la compétence Séisme.' },
      { id: 'inebranlable', name: 'Inébranlable', tier: 4, max: 3, desc: (r) => `-${3 * r} % de dégâts subis`, stats: (r) => ({ dr: 3 * r }) },
      { id: 'bourreau', name: 'Bourreau', tier: 4, max: 3, desc: (r) => `+${15 * r} % de dégâts contre les ennemis sous 30 % de PV`, stats: (r) => ({ execute: 15 * r }) },
      { id: 'veteran', name: 'Vétéran', tier: 4, max: 2, desc: (r) => `+${10 * r} % de dégâts contre élites et Gardiens`, stats: (r) => ({ eliteDmg: 10 * r }) },
    ],
    specs: {
      berserker: {
        name: 'Berserker',
        color: '#a8402c',
        desc: 'Offensive pure : vitesse, vol de vie et exécutions. Vous vivez en frappant.',
        play: [
          '<b>Rage</b> : monte en frappant, renforce tout.',
          'Roulade → <b>Bond</b> qui frappe.',
          'Spéciale à 50 rage : <b>Fureur</b>.',
        ],
        tierReq: [0, 2, 4, 6],
        talents: [
          { id: 'b_frenesie', name: 'Frénésie', tier: 0, max: 3, desc: (r) => `+${5 * r} % de vitesse d’attaque`, stats: (r) => ({ atkSpd: 5 * r }) },
          { id: 'b_soif', name: 'Soif de sang', tier: 0, max: 3, desc: (r) => `+${1.5 * r} % de vol de vie`, stats: (r) => ({ lifesteal: 1.5 * r }) },
          { id: 'b_execution', name: 'Exécution', tier: 1, max: 2, desc: (r) => `+${30 * r} % de dégâts contre les ennemis sous 30 % de PV`, stats: (r) => ({ execute: 30 * r }) },
          { id: 'b_rage', name: 'Rage aveugle', tier: 1, max: 3, desc: (r) => `+${6 * r} % de dégâts, +${4 * r} % de chance de critique`, stats: (r) => ({ dmgPct: 6 * r, crit: 4 * r }) },
          { id: 'b_dechainement', name: 'Déchaînement', tier: 2, max: 1, skill: 'dechainement', desc: () => 'Débloque la compétence Déchaînement.' },
          { id: 'b_carnage', name: 'Carnage', tier: 2, max: 3, desc: (r) => `+${10 * r} % de dégâts critiques`, stats: (r) => ({ critDmg: 10 * r }) },
          { id: 'b_peau', name: 'Peau épaisse', tier: 1, max: 3, desc: (r) => `+${6 * r} % de PV max`, stats: (r) => ({ hpPct: 6 * r }) },
          { id: 'b_furie', name: 'Furie sanglante', tier: 3, max: 1, capstone: true, desc: () => 'Fureur soigne 15 % des PV max. La rage retombe deux fois moins vite.' },
          { id: 'b_massacre', name: 'Massacre', tier: 3, max: 2, desc: (r) => `+${1 * r} % des PV max rendus par ennemi tué`, stats: (r) => ({ killHeal: r }) },
        ],
      },
      gardien: {
        name: 'Gardien',
        color: '#4f7aa8',
        desc: 'Défense inébranlable : armure, blocage et représailles. Vous tenez la ligne.',
        play: [
          'Clic droit maintenu : <b>garde</b> (−80 %, coûte l’endurance).',
          'Garde au dernier moment : <b>Parade</b> → <b>Riposte</b> ×2,5.',
          'Clic droit tapé : coup de bouclier.',
        ],
        tierReq: [0, 2, 4, 6],
        talents: [
          { id: 'g_rempart', name: 'Rempart', tier: 0, max: 3, desc: (r) => `+${8 * r} % d’armure`, stats: (r) => ({ armorPct: 8 * r }) },
          { id: 'g_parade', name: 'Parade', tier: 0, max: 3, desc: (r) => `+${4 * r} % de chance de bloquer`, stats: (r) => ({ block: 4 * r }) },
          { id: 'g_represailles', name: 'Représailles', tier: 1, max: 2, desc: (r) => `Renvoie ${15 * r} % des dégâts subis`, stats: (r) => ({ thorns: 15 * r }) },
          { id: 'g_robuste', name: 'Robustesse', tier: 1, max: 3, desc: (r) => `+${8 * r} % de PV max, +${0.5 * r} PV/s`, stats: (r) => ({ hpPct: 8 * r, hpRegen: 0.5 * r }) },
          { id: 'g_murdefer', name: 'Mur de fer', tier: 2, max: 1, skill: 'murdefer', desc: () => 'Débloque la compétence Mur de fer.' },
          { id: 'g_ecaille', name: 'Écailles d’acier', tier: 2, max: 3, desc: (r) => `-${3 * r} % de dégâts subis`, stats: (r) => ({ dr: 3 * r }) },
          { id: 'g_souffle', name: 'Souffle du rempart', tier: 1, max: 3, desc: (r) => `+${15 * r} d’endurance max`, stats: (r) => ({ stamina: 15 * r }) },
          { id: 'g_bastion', name: 'Bastion', tier: 3, max: 1, capstone: true, desc: () => 'Fenêtre de parade plus large, Riposte ×3,5.' },
          { id: 'g_chatiment', name: 'Châtiment', tier: 3, max: 2, desc: (r) => `+${8 * r} % de dégâts`, stats: (r) => ({ dmgPct: 8 * r }) },
        ],
      },
    },
  },
  rodeur: {
    name: 'Rôdeur',
    color: '#4f6a3a',
    title: 'Chasseur des profondeurs',
    desc: 'Distance. Fragile au contact. Arcs, arbalètes, pièges.',
    hpBase: 88, hpPerLvl: 12, speed: 225,
    special: {
      name: 'Tir perçant', icon: 'pierce', cd: 1.6, stamina: 22,
      desc: 'Une flèche lourde qui traverse tous les ennemis sur sa trajectoire, infligeant 220 % des dégâts de l’arme.',
    },
    tierReq: [0, 3, 6, 9, 12],
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
      { id: 'r_tirexplosif', name: 'Tir explosif', tier: 4, max: 1, skill: 'tirexplosif', desc: () => 'Débloque la compétence Tir explosif.' },
      { id: 'r_chasseur', name: 'Chasseur de têtes', tier: 4, max: 3, desc: (r) => `+${8 * r} % contre élites et Gardiens`, stats: (r) => ({ eliteDmg: 8 * r }) },
      { id: 'r_esquive', name: 'Esquive', tier: 4, max: 3, desc: (r) => `-${3 * r} % de dégâts subis`, stats: (r) => ({ dr: 3 * r }) },
      { id: 'r_maraude', name: 'Maraude', tier: 4, max: 2, desc: (r) => `+${10 * r} % d’or trouvé`, stats: (r) => ({ goldFind: 10 * r }) },
    ],
    specs: {
      tireur: {
        name: 'Tireur d’élite',
        color: '#b8964a',
        desc: 'Précision absolue : critiques dévastateurs et flèches qui traversent les rangs ennemis.',
        play: [
          'Maintenir : <b>bander l’arc</b>.',
          'Pleine tension : critique, transperce, <b>marque</b> (+50 %).',
        ],
        tierReq: [0, 2, 4, 6],
        talents: [
          { id: 't_visee', name: 'Visée parfaite', tier: 0, max: 3, desc: (r) => `+${4 * r} % de chance de critique`, stats: (r) => ({ crit: 4 * r }) },
          { id: 't_impact', name: 'Impact', tier: 0, max: 3, desc: (r) => `+${20 * r} % de dégâts critiques`, stats: (r) => ({ critDmg: 20 * r }) },
          { id: 't_traverse', name: 'Flèches perforantes', tier: 1, max: 2, desc: (r) => `Vos tirs traversent ${r} ennemi(s) de plus`, stats: (r) => ({ pierce: r }) },
          { id: 't_distance', name: 'Longue portée', tier: 1, max: 3, desc: (r) => `+${8 * r} % de dégâts`, stats: (r) => ({ dmgPct: 8 * r }) },
          { id: 't_oeil', name: 'Œil du faucon', tier: 2, max: 1, skill: 'oeil', desc: () => 'Débloque la compétence Œil du faucon.' },
          { id: 't_patience', name: 'Patience', tier: 2, max: 3, desc: (r) => `+${8 * r} % contre élites et Gardiens`, stats: (r) => ({ eliteDmg: 8 * r }) },
          { id: 't_souffle', name: 'Souffle retenu', tier: 1, max: 3, desc: (r) => `+${15 * r} % de régén. d’endurance`, stats: (r) => ({ staRegen: 15 * r }) },
          { id: 't_traque', name: 'Traque', tier: 3, max: 1, capstone: true, desc: () => 'L’arc se bande 35 % plus vite.' },
          { id: 't_coupdegrace', name: 'Coup de grâce', tier: 3, max: 2, desc: (r) => `+${20 * r} % contre les ennemis sous 30 % de PV`, stats: (r) => ({ execute: 20 * r }) },
        ],
      },
      ombrelame: {
        name: 'Ombrelame',
        color: '#5a6a7a',
        desc: 'Venin et ombres : vos tirs empoisonnent, vous esquivez sans cesse et disparaissez à volonté.',
        play: [
          '<b>Dagues</b> empoisonnées au corps à corps.',
          '<b>Dans le dos</b> : ×1,8, critique.',
          'Roulade → <b>Pas de l’ombre</b>.',
        ],
        tierReq: [0, 2, 4, 6],
        talents: [
          { id: 'o_venin', name: 'Venin', tier: 0, max: 3, desc: (r) => `Vos tirs empoisonnent : ${25 * r} % des dégâts en plus sur 3 s`, stats: (r) => ({ poison: 25 * r }) },
          { id: 'o_ombre', name: 'Pas de l’ombre', tier: 0, max: 3, desc: (r) => `+${5 * r} % de vitesse, roulade -${10 * r} % d’endurance`, stats: (r) => ({ moveSpd: 5 * r, rollCost: 10 * r }) },
          { id: 'o_saignee', name: 'Saignée', tier: 1, max: 2, desc: (r) => `+${2 * r} % de vol de vie`, stats: (r) => ({ lifesteal: 2 * r }) },
          { id: 'o_nuee', name: 'Nuée', tier: 1, max: 3, desc: (r) => `+${6 * r} % de vitesse d’attaque`, stats: (r) => ({ atkSpd: 6 * r }) },
          { id: 'o_voile', name: 'Voile d’ombre', tier: 2, max: 1, skill: 'voile', desc: () => 'Débloque la compétence Voile d’ombre.' },
          { id: 'o_lames', name: 'Lames fines', tier: 2, max: 3, desc: (r) => `+${4 * r} % de chance de critique`, stats: (r) => ({ crit: 4 * r }) },
          { id: 'o_fuite', name: 'Fuite', tier: 1, max: 3, desc: (r) => `Roulade : +${2 * r} % des PV rendus`, stats: (r) => ({ rollHeal: 2 * r }) },
          { id: 'o_assassin', name: 'Assassin', tier: 3, max: 1, capstone: true, desc: () => 'Coups dans le dos ×2,4 au lieu de ×1,8.' },
          { id: 'o_toxine', name: 'Toxine', tier: 3, max: 2, desc: (r) => `+${20 * r} % de dégâts de poison`, stats: (r) => ({ poison: 20 * r }) },
        ],
      },
    },
  },
  mage: {
    name: 'Mage',
    color: '#4a5a8a',
    title: 'Lettré de l’Abîme',
    desc: 'Sorts à distance. Très fragile. Bâtons, sceptres, grimoires.',
    hpBase: 80, hpPerLvl: 11, speed: 215,
    special: {
      name: 'Explosion arcanique', icon: 'bolt', cd: 1.8, stamina: 26,
      desc: 'Un orbe qui explose à l’impact : 200 % des dégâts dans la zone.',
    },
    tierReq: [0, 3, 6, 9, 12],
    talents: [
      { id: 'm_savoir', name: 'Savoir interdit', tier: 0, max: 5, desc: (r) => `+${4 * r} % de dégâts`, stats: (r) => ({ dmgPct: 4 * r }) },
      { id: 'm_encre', name: 'Sang d’encre', tier: 0, max: 5, desc: (r) => `+${5 * r} % de PV max`, stats: (r) => ({ hpPct: 5 * r }) },
      { id: 'm_volonte', name: 'Volonté', tier: 0, max: 3, desc: (r) => `+${10 * r} d’endurance max`, stats: (r) => ({ stamina: 10 * r }) },
      { id: 'm_clignement', name: 'Clignement', tier: 1, max: 1, skill: 'clignement', desc: () => 'Débloque la compétence Clignement.' },
      { id: 'm_concentration', name: 'Concentration', tier: 1, max: 3, desc: (r) => `-${4 * r} % de temps de recharge`, stats: (r) => ({ cdr: 4 * r }) },
      { id: 'm_flux', name: 'Flux', tier: 1, max: 3, desc: (r) => `+${15 * r} % de régén. d’endurance`, stats: (r) => ({ staRegen: 15 * r }) },
      { id: 'm_nova', name: 'Nova de givre', tier: 2, max: 1, skill: 'nova', desc: () => 'Débloque la compétence Nova de givre.' },
      { id: 'm_oeil', name: 'Œil du mage', tier: 2, max: 3, desc: (r) => `+${3 * r} % de chance de critique`, stats: (r) => ({ crit: 3 * r }) },
      { id: 'm_runes', name: 'Peau runique', tier: 2, max: 3, desc: (r) => `+${5 * r} d’armure`, stats: (r) => ({ armor: 5 * r }) },
      { id: 'm_chaine', name: 'Éclair en chaîne', tier: 3, max: 1, skill: 'chaine', desc: () => 'Débloque la compétence Éclair en chaîne.' },
      { id: 'm_rapide', name: 'Incantation rapide', tier: 3, max: 2, desc: (r) => `+${8 * r} % de vitesse d’attaque`, stats: (r) => ({ atkSpd: 8 * r }) },
      { id: 'm_puissance', name: 'Puissance brute', tier: 3, max: 2, desc: (r) => `+${20 * r} % de dégâts critiques`, stats: (r) => ({ critDmg: 20 * r }) },
      { id: 'm_bouclier', name: 'Bouclier de mana', tier: 4, max: 1, skill: 'bouclier', desc: () => 'Débloque la compétence Bouclier de mana.' },
      { id: 'm_siphon', name: 'Siphon', tier: 4, max: 3, desc: (r) => `+${r} % de vol de vie`, stats: (r) => ({ lifesteal: r }) },
      { id: 'm_eveil', name: 'Éveil', tier: 4, max: 3, desc: (r) => `+${6 * r} % de dégâts, -${3 * r} % de recharge`, stats: (r) => ({ dmgPct: 6 * r, cdr: 3 * r }) },
      { id: 'm_garde', name: 'Garde arcanique', tier: 4, max: 2, desc: (r) => `-${3 * r} % de dégâts subis`, stats: (r) => ({ dr: 3 * r }) },
    ],
    specs: {
      pyromancien: {
        name: 'Pyromancien',
        color: '#c0582a',
        desc: 'Le feu, et le prix du feu.',
        play: [
          '<b>Chaleur</b> : monte à chaque sort, +dégâts.',
          'À 100 : <b>Surchauffe</b> — sorts gratuits, vous brûlez.',
          'Vos traits <b>explosent</b> et enflamment.',
        ],
        tierReq: [0, 2, 4, 6],
        talents: [
          { id: 'p_braise', name: 'Braise', tier: 0, max: 3, desc: (r) => `Brûlure : +${20 * r} % des dégâts sur 3 s`, stats: (r) => ({ poison: 20 * r }) },
          { id: 'p_combustion', name: 'Combustion', tier: 0, max: 3, desc: (r) => `+${6 * r} % de dégâts`, stats: (r) => ({ dmgPct: 6 * r }) },
          { id: 'p_cendres', name: 'Cendres', tier: 1, max: 2, desc: (r) => `+${15 * r} % de dégâts critiques`, stats: (r) => ({ critDmg: 15 * r }) },
          { id: 'p_ardeur', name: 'Ardeur', tier: 1, max: 3, desc: (r) => `+${5 * r} % de vitesse d’attaque`, stats: (r) => ({ atkSpd: 5 * r }) },
          { id: 'p_meteore', name: 'Météore', tier: 2, max: 1, skill: 'meteore', desc: () => 'Débloque la compétence Météore.' },
          { id: 'p_foyer', name: 'Foyer', tier: 2, max: 3, desc: (r) => `+${6 * r} % de PV max`, stats: (r) => ({ hpPct: 6 * r }) },
          { id: 'p_brasier', name: 'Cœur de brasier', tier: 3, max: 1, capstone: true, desc: () => 'Surchauffe : brûlure divisée par 2, +30 % de dégâts.' },
          { id: 'p_phenix', name: 'Phénix', tier: 3, max: 2, desc: (r) => `+${r} % des PV max rendus par ennemi tué`, stats: (r) => ({ killHeal: r }) },
        ],
      },
      necromancien: {
        name: 'Nécromancien',
        color: '#5a8a6a',
        desc: 'Les morts ne partent jamais vraiment.',
        play: [
          'Spéciale : <b>lever un mort</b> qui combat pour vous (3 max).',
          'Vos traits d’os <b>transpercent</b>.',
          'Chaque ennemi tué prolonge vos serviteurs.',
        ],
        tierReq: [0, 2, 4, 6],
        talents: [
          { id: 'n_moelle', name: 'Moelle noire', tier: 0, max: 3, desc: (r) => `+${5 * r} % de dégâts`, stats: (r) => ({ dmgPct: 5 * r }) },
          { id: 'n_pacte', name: 'Pacte de sang', tier: 0, max: 3, desc: (r) => `+${1.5 * r} % de vol de vie`, stats: (r) => ({ lifesteal: 1.5 * r }) },
          { id: 'n_ossuaire', name: 'Ossuaire', tier: 1, max: 3, desc: (r) => `+${7 * r} % de PV max`, stats: (r) => ({ hpPct: 7 * r }) },
          { id: 'n_sombre', name: 'Rites sombres', tier: 1, max: 3, desc: (r) => `-${4 * r} % de recharge`, stats: (r) => ({ cdr: 4 * r }) },
          { id: 'n_armee', name: 'Armée des morts', tier: 2, max: 1, skill: 'armee', desc: () => 'Débloque la compétence Armée des morts.' },
          { id: 'n_liche', name: 'Peau de liche', tier: 2, max: 3, desc: (r) => `+${6 * r} d’armure`, stats: (r) => ({ armor: 6 * r }) },
          { id: 'n_legion', name: 'Légion', tier: 3, max: 1, capstone: true, desc: () => '5 serviteurs au lieu de 3, et ils frappent 30 % plus fort.' },
          { id: 'n_faucheuse', name: 'Faucheuse', tier: 3, max: 2, desc: (r) => `+${20 * r} % contre les ennemis sous 30 % de PV`, stats: (r) => ({ execute: 20 * r }) },
        ],
      },
    },
  },
};

// Progression plus fine et plus lente : deux fois plus de rangs, chaque rang rapporte deux fois moins.
// (les compétences débloquées restent à 1 rang ; les paliers demandent deux fois plus de points)
function slowTree(tree) {
  tree.tierReq = tree.tierReq.map((v) => v * 2);
  for (const t of tree.talents) {
    if (t.skill || !t.stats) continue;
    const st = t.stats, ds = t.desc;
    const round = (v) => Math.round(v * 10) / 10;
    t.max *= 2;
    t.stats = (r) => { const o = st(r / 2); for (const k in o) o[k] = round(o[k]); return o; };
    t.desc = (r) => ds(r / 2).replace(/\d+\.\d+/g, (m) => String(round(+m)).replace('.', ','));
  }
}
for (const C of Object.values(CLASSES)) {
  if (!C.talents) continue;
  slowTree(C);
  for (const S of Object.values(C.specs)) slowTree(S);
}

export function xpForLevel(level) {
  // Progression lente : chaque niveau se mérite.
  return Math.round(100 * Math.pow(level, 1.85));
}
