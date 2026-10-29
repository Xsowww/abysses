// Quêtes et PNJ du village.
// obj.type : kill (target = id monstre), boss (depth min), elite, extract, depth (atteindre une profondeur)

export const NPCS = {
  aldric: {
    name: 'Capitaine Aldric', title: 'Garde du village', color: '#3a3f48', hood: '#5c6068',
    greet: [
      'Les Abysses s’éveillent, recrue. Chaque nuit, de nouvelles créatures remontent de la Crypte.',
      'Tu tiens encore debout ? Bien. Le village a besoin de lames.',
    ],
  },
  brann: {
    name: 'Brann', title: 'Forgeron', color: '#4a2c1c', hood: '#2a1d15', shop: 'forge',
    greet: [
      'De l’acier honnête, forgé ici. Paye et il est à toi.',
      'Ramène-moi de quoi battre le fer… ou de l’or, ça marche aussi.',
    ],
  },
  odile: {
    name: 'Odile', title: 'Marchande', color: '#4a3f26', hood: '#3a2a1c', shop: 'general',
    greet: [
      'Potions, pierres de retour, poches bien cousues… tout ce qu’il faut pour revenir vivant.',
      'Je rachète aussi ce que tu trouves en bas. Sans poser de questions.',
    ],
  },
  maelis: {
    name: 'Maëlis', title: 'Gardienne du portail', color: '#1d3436', hood: '#142426', portal: true,
    greet: [
      'Le portail mène aux Abysses. Plus tu descends, plus c’est riche… et mortel.',
      'Garde une pierre de retour sur toi. Et sécurise ce qui compte.',
    ],
  },
};

export const QUESTS = [
  {
    id: 'q_rats', giver: 'aldric', name: 'Vermine',
    desc: 'Les rats de la Crypte rongent nos réserves. Élimine-en 10.',
    obj: { type: 'kill', target: 'rat', count: 10 },
    reward: { xp: 60, gold: 40 },
  },
  {
    id: 'q_os', giver: 'aldric', name: 'Os brisés', req: 'q_rats',
    desc: 'Des squelettes errent dans les couloirs. Détruis-en 15.',
    obj: { type: 'kill', target: 'squelette', count: 15 },
    reward: { xp: 140, gold: 90 },
  },
  {
    id: 'q_boss1', giver: 'aldric', name: 'Le Gardien d’Os', req: 'q_os',
    desc: 'Au fond de la Crypte veille le Gardien d’Os. Abats-le.',
    obj: { type: 'boss', depth: 1, count: 1 },
    reward: { xp: 250, gold: 200, item: { minRarity: 2 } },
  },
  {
    id: 'q_extract', giver: 'odile', name: 'Revenir entier',
    desc: 'Un aventurier mort ne m’achète rien. Réussis 2 extractions (point d’extraction, portail du boss ou pierre de retour).',
    obj: { type: 'extract', count: 2 },
    reward: { xp: 80, gold: 60, consumable: { id: 'pierre', qty: 2 } },
  },
  {
    id: 'q_archers', giver: 'brann', name: 'Arcs et flèches',
    desc: 'Ces archers squelettes m’ont percé un tablier. Abats-en 12.',
    obj: { type: 'kill', target: 'archer', count: 12 },
    reward: { xp: 150, gold: 110, item: { minRarity: 1, slot: 'weapon' } },
  },
  {
    id: 'q_elites', giver: 'brann', name: 'Champions déchus', req: 'q_archers',
    desc: 'Certains monstres brillent d’une aura dorée. Ce sont des élites. Tues-en 4.',
    obj: { type: 'elite', count: 4 },
    reward: { xp: 260, gold: 220, item: { minRarity: 2 } },
  },
  {
    id: 'q_acolytes', giver: 'aldric', name: 'Le culte des profondeurs', req: 'q_boss1',
    desc: 'Des acolytes invoquent les ténèbres à partir de la profondeur 2. Élimine-en 12.',
    obj: { type: 'kill', target: 'acolyte', count: 12 },
    reward: { xp: 380, gold: 260 },
  },
  {
    id: 'q_boss3', giver: 'aldric', name: 'Plus profond encore', req: 'q_acolytes',
    desc: 'Descends jusqu’à la profondeur 3 et abats son Gardien.',
    obj: { type: 'boss', depth: 3, count: 1 },
    reward: { xp: 700, gold: 500, item: { minRarity: 3 } },
  },
  {
    id: 'q_poche', giver: 'odile', name: 'Doublure de contrebande', req: 'q_extract',
    desc: 'Atteins la profondeur 2 et reviens-moi. Je te coudrai une meilleure poche.',
    obj: { type: 'depth', depth: 2, count: 1 },
    reward: { xp: 150, gold: 50, item: { slot: 'pocket', rarity: 1 } },
  },
  {
    id: 'q_boss5', giver: 'maelis', name: 'Le cœur des Abysses', req: 'q_boss3',
    desc: 'Le portail vibre. Atteins la profondeur 5 et abats ce qui y règne.',
    obj: { type: 'boss', depth: 5, count: 1 },
    reward: { xp: 1500, gold: 1200, item: { minRarity: 4 } },
  },
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
