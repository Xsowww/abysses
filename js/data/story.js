// Histoire : prologue, répliques des PNJ, Gardiens, fragments de lore et inscriptions.
// Acte I — « La Cloche Noire ».

export const PROLOGUE = [
  'Avant Cendrebourg, il y avait Valdrenne.\nLa cité aux mille cloches.',
  'Une nuit, une cloche que personne n’avait forgée se mit à sonner.\nUne cloche noire.',
  'Au treizième coup, la terre s’ouvrit.\nValdrenne descendit dans le gouffre — ses rois, ses prêtres, ses morts.\nEt tout ce qui sonnait se tut.',
  'Trois siècles ont passé.\nAu bord du gouffre, des survivants ont bâti un village de cendre et de bois.\nIls appellent le gouffre l’Abîme. Les étrangers disent : les Abysses.',
  'Depuis peu, la nuit, on entend de nouveau sonner. Tout au fond.\nEt ce qui dormait là-dessous remonte.',
  'Vous êtes arrivé ce soir.\nVous ne vous souvenez pas de la route.\nSeulement du son d’une cloche… et de votre nom.',
];

export const EPILOGUE_ACT1 = [
  'Le Roi Sans Cloche s’effondre sur son trône vide.\nDans ses mains d’os, rien. Pas de fragment. Pas de cloche.',
  '« Elle n’est pas ici », a-t-il soufflé.\nEt pour la première fois depuis votre arrivée, le silence des Abysses vous fait peur.',
  'Car là-haut, à Cendrebourg, quelqu’un vient de faire sonner une cloche.',
  'Fin de l’Acte I.\nLa suite de l’histoire arrive dans une prochaine version.',
];

// Gardiens (boss) selon la profondeur.
export const GUARDIANS = {
  1: { name: 'Corvin, le Gardien d’Os', intro: 'Encore un… qui croit pouvoir remonter.', death: 'La cloche… se souvient… de moi…' },
  2: { name: 'Haldis, la Sentinelle creuse', intro: 'Je gardais les portes de Valdrenne. Je garde maintenant les tiennes.', death: 'Enfin… le silence.' },
  3: { name: 'Le Prieur ossuaire', intro: 'Prie, enfant. Ici-bas, on prie avec ses os.', death: 'Le treizième coup… viendra quand même…' },
  4: { name: 'Varn, le Bourreau muet', intro: '…', death: '…' },
  5: { name: 'Le Roi sans cloche', intro: 'Mon peuple dort. Pourquoi l’éveilles-tu ?', death: 'Elle… n’est pas… ici…' },
};
export function guardianFor(depth) {
  return GUARDIANS[depth] || { name: 'Un Gardien sans nom', intro: 'Les noms se perdent, ici. Le tien aussi se perdra.', death: '…' };
}

// Fragments de lore trouvés dans les Abysses (lus depuis le journal).
export const LORE = [
  { id: 'l_valdrenne', title: 'Chronique de Valdrenne, page arrachée', minDepth: 1,
    text: 'En l’an 412, le roi Aldaric fit fondre les cloches des temples vaincus pour en couler une seule, plus grande que toutes. Les fondeurs refusèrent d’y graver un nom. On dit que le métal, en refroidissant, était devenu noir.' },
  { id: 'l_corvin', title: 'Serment de Ser Corvin', minDepth: 1,
    text: 'Moi, Corvin de la Garde des Cloches, je jure de tenir la Porte Basse tant qu’il me restera un os pour la tenir. Que nul ne descende. Que rien ne remonte.\n\n(L’encre est mêlée de sang séché.)' },
  { id: 'l_enfant', title: 'Dessin d’enfant', minDepth: 1,
    text: 'Un parchemin froissé. Une cloche, dessinée au charbon, entourée de treize petits traits. Sous le dessin, d’une écriture maladroite : « papa dit qu’il faut pas compter ».' },
  { id: 'l_sonneurs', title: 'Prière des Sonneurs', minDepth: 2,
    text: 'Treize coups pour l’ouvrir, treize coups pour descendre.\nQue sonne la Noire et que se taisent les autres.\nCe qui est en haut tombera. Ce qui est en bas régnera.' },
  { id: 'l_haldis', title: 'Lettre d’Haldis à sa sœur', minDepth: 2,
    text: 'Ma chère Ysolde, ils nous ont postées aux portes, avec ordre de ne laisser passer personne, pas même le roi. J’ai entendu le premier coup ce matin. Si tu reçois cette lettre, quitte la ville. Ne te retourne pas en entendant les cloches.' },
  { id: 'l_tomas', title: 'Médaillon de Tomas', minDepth: 2, quest: true,
    text: 'Un petit médaillon de fer, grossièrement martelé. Au dos, gravé à la pointe : « Pour Tomas, qu’il revienne. — B. » La chaîne a été arrachée.' },
  { id: 'l_fonderie', title: 'Note de fonderie', minDepth: 2,
    text: 'Le bronze ne prend pas. Trois coulées, trois échecs. Le métal se met à chanter dans le moule, et les apprentis refusent d’approcher. Maître Aubrin dit qu’il faut « lui donner ce qu’elle demande ». Je ne veux pas savoir ce que cela signifie.' },
  { id: 'l_prieur', title: 'Sermon du Prieur', minDepth: 3,
    text: 'Vous craignez la Cloche ? Insensés. La Cloche ne détruit pas : elle rassemble. Elle a rassemblé Valdrenne dans son sein, et elle rassemblera le monde. Il suffit d’un dernier coup.' },
  { id: 'l_treize', title: 'Les Treize Coups', minDepth: 3,
    text: 'Un registre de bronze, gravé de treize lignes. Douze noms y figurent, chacun suivi d’une date. La treizième ligne est vide, mais le métal y est poli, comme si quelqu’un l’avait longtemps caressé du doigt.' },
  { id: 'l_maelis', title: 'Registre des Sonneuses', minDepth: 4,
    text: 'Lignée des Sonneuses de Valdrenne : … Ysolde, fille d’Ysolde. Maëlis, fille d’Ysolde.\n\nEn marge, d’une main plus récente : « Le treizième coup revient à notre sang. Il le faut. »' },
  { id: 'l_roi', title: 'Dernier édit du Roi', minDepth: 4,
    text: 'Nous, Aldaric III, ordonnons que la Noire soit descendue au plus profond, et que l’on en brise le battant. Qu’on emporte le battant loin d’ici, au-delà des eaux. Que nul ne sache où.' },
  { id: 'l_aventurier', title: 'Carnet d’un voyageur', minDepth: 3,
    text: 'Je ne me souviens pas de la route. La femme du portail m’a dit de descendre. Je l’ai fait. Je remonte toujours.\n\nC’est la quatrième fois que j’écris cette page. L’écriture est la mienne. Je ne me souviens d’aucune des trois autres.' },
];
export const LORE_BY_ID = Object.fromEntries(LORE.map((l) => [l.id, l]));

// Messages gravés au sol par d'anciens aventuriers.
export const INSCRIPTIONS = [
  'Danger en avant.',
  'Essaie de rouler.',
  'Le Gardien frappe, puis souffle. Frappe quand il souffle.',
  'Remonte tant que tu le peux.',
  'Je suis passé ici. Je ne suis pas remonté.',
  'Poche pleine, cœur léger.',
  'La cloche ment.',
  'Elle t’a appelé, toi aussi ?',
  'Ne compte pas les coups.',
  'Les archers visent où tu seras, pas où tu es.',
  'Ici, quelqu’un a prié. Ça n’a pas suffi.',
  'Trésor à proximité… peut-être.',
  'Garde une pierre. Toujours.',
  'Les cercles verts mentent rarement.',
];

// Répliques libres des PNJ (« Parler »), selon l'avancement.
// Chaque entrée : { when(pd) -> bool, lines: [..] }. La dernière qui correspond est utilisée.
const done = (pd, id) => pd.quests[id] && pd.quests[id].status === 'done';
export const NPC_TALK = {
  maelis: [
    { when: () => true, lines: ['Le portail ne s’ouvre que pour ceux que la cloche a appelés. Il s’est ouvert pour toi.', 'Ne t’attache à rien de ce que tu trouves en bas. Seulement à ce que tu ramènes.'] },
    { when: (pd) => done(pd, 'q_boss1'), lines: ['Corvin… Ma grand-mère racontait qu’il avait juré de tenir la Porte Basse. Il l’a tenue trois siècles.', 'Chaque Gardien garde un fragment. La cloche se reforme, morceau par morceau.'] },
    { when: (pd) => done(pd, 'q_acolytes'), lines: ['Les Sonneurs… Ils viennent d’ici, tu sais. Des voisins. Des amis.', 'Ils croient que le dernier coup les rendra à Valdrenne. Ils ont peut-être raison. C’est bien ce qui m’effraie.'] },
    { when: (pd) => (pd.story && pd.story.lore || []).includes('l_maelis'), lines: ['Tu as trouvé le registre.', '… Oui. Ma lignée a sonné les douze premiers coups. Le treizième nous revient. Je ne l’ai jamais caché. Je ne l’ai jamais dit non plus.', 'Je ne sonnerai pas. Tu as ma parole. C’est tout ce qu’il me reste à donner.'] },
  ],
  aldric: [
    { when: () => true, lines: ['Trois hommes. J’ai envoyé trois hommes là-dessous la semaine dernière. Aucun n’est revenu.', 'Toi, au moins, tu reviens. Ça fait de toi la meilleure recrue que j’aie eue depuis des années.'] },
    { when: (pd) => done(pd, 'q_boss1'), lines: ['Tu as vu ses couleurs ? La Garde des Cloches. Mon père m’en parlait comme d’une histoire pour enfants.', 'Si les histoires pour enfants sont vraies, il faut que je relise toutes les autres.'] },
  ],
  brann: [
    { when: () => true, lines: ['Mon garçon, Tomas, est descendu au printemps. Il voulait rapporter de quoi payer la forge.', 'Je martèle. Ça couvre le bruit de la cloche. Et le reste.'] },
    { when: (pd) => done(pd, 'b_tomas'), lines: ['Je l’ai accroché au-dessus de l’enclume. Il voit tout ce que je forge, maintenant.', 'Merci. Je ne le dirai pas deux fois.'] },
  ],
  odile: [
    { when: () => true, lines: ['Ici, tout se vend. Les vivants achètent, les morts fournissent. Le commerce n’a jamais été aussi florissant.', 'Un conseil gratuit, et c’est rare : ce que tu ne mets pas dans ta poche sécurisée, considère-le comme déjà perdu.'] },
    { when: (pd) => pd.maxDepth >= 3, lines: ['Tu descends drôlement bas, pour quelqu’un qui ne se souvient même pas de son chemin.', 'Rapporte-moi des choses brillantes. Et rapporte-toi, surtout. Les clients morts paient mal.'] },
  ],
};

export function npcTalk(npc, pd) {
  const list = NPC_TALK[npc] || [];
  let best = null;
  for (const e of list) if (e.when(pd)) best = e;
  return best ? best.lines : [];
}
