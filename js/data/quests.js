// Quêtes et PNJ du village — Acte I : « La Cloche Noire ».
// obj.type : kill (target = id monstre), boss (depth min), elite, extract, depth, lore (id d'un fragment)
// intro / outro : répliques jouées à l'acceptation et au rendu de la quête.

export const NPCS = {
  aldric: {
    name: 'Capitaine Aldric', title: 'Garde du village', color: '#3a3f48', hood: '#5c6068',
    greet: [
      'Les Abysses s’éveillent, recrue. Chaque nuit, de nouvelles choses remontent de la Crypte.',
      'Tu tiens encore debout ? Bien. Le village a besoin de lames qui reviennent.',
    ],
  },
  brann: {
    name: 'Brann', title: 'Forgeron', color: '#4a2c1c', hood: '#2a1d15', shop: 'forge',
    greet: [
      'De l’acier honnête, forgé ici. Paye et il est à toi.',
      'Le marteau couvre le bruit de la cloche. Approche, mais parle fort.',
    ],
  },
  odile: {
    name: 'Odile', title: 'Marchande', color: '#4a3f26', hood: '#3a2a1c', shop: 'general',
    greet: [
      'Fioles, pierres de retour, poches bien cousues… tout ce qu’il faut pour revenir vivant.',
      'Je rachète ce que tu trouves en bas. Sans poser de questions. Surtout sans poser de questions.',
    ],
  },
  maelis: {
    name: 'Maëlis', title: 'Gardienne du portail', color: '#1d3436', hood: '#142426', portal: true,
    greet: [
      'Le portail t’attend. Il attend tout le monde, à la fin.',
      'Tu entends ? Non… Ce n’était que le vent. Cette fois.',
    ],
  },
};

export const QUESTS = [
  // ---------------- Trame principale ----------------
  {
    id: 'm_arrivee', giver: 'maelis', main: true, name: 'L’appel de la cloche',
    desc: 'Descendre une première fois dans la Crypte Oubliée… et en revenir vivant.',
    intro: [
      'Encore un que la cloche a appelé. Tu l’as entendue, toi aussi, n’est-ce pas ?',
      'Ne me regarde pas comme ça. Tous ceux qui arrivent ici l’ont entendue. Aucun ne se souvient de la route.',
      'Sous nos pieds dort Valdrenne. Ce portail y mène. Descends, regarde, et surtout… remonte.',
      'Les Abysses ne rendent rien à ceux qui y meurent. Ce que tu portes sur toi, tu le gardes. Le reste, mets-le dans ta poche cousue, ou fais-en ton deuil.',
    ],
    outro: [
      'Tu es revenu. C’est déjà plus que la plupart.',
      'Va voir le capitaine Aldric, près de la caserne. Il a besoin de bras qui reviennent.',
    ],
    obj: { type: 'extract', count: 1 },
    reward: { xp: 60, gold: 30 },
  },
  {
    id: 'q_rats', giver: 'aldric', main: true, name: 'Vermine', req: 'm_arrivee',
    desc: 'Des goules remontent de la Crypte et rôdent près des réserves. En abattre 10.',
    intro: [
      'Maëlis t’envoie ? Alors tu as le droit de mourir pour Cendrebourg. Félicitations.',
      'Les goules d’abord. Des morts affamés qui remontent par les fissures et rôdent autour des réserves.',
      'Tues-en dix. Et regarde bien comment elles bondissent : elles se ramassent avant de sauter.',
    ],
    outro: ['Dix. Bien. Les réserves tiendront une semaine de plus.', 'Ne prends pas la grosse tête. Les goules, c’était l’entraînement.'],
    obj: { type: 'kill', target: 'rat', count: 10 },
    reward: { xp: 120, gold: 40 },
  },
  {
    id: 'q_os', giver: 'aldric', main: true, name: 'Os brisés', req: 'q_rats',
    desc: 'Des squelettes armés errent dans les couloirs. En détruire 15.',
    intro: [
      'Les morts de Valdrenne ne restent pas couchés. Ils portent encore leurs vieilles lames, et ils savent s’en servir.',
      'Quand ils lèvent le bras, la zone rouge devant eux, c’est là que la lame va tomber. Sors-en. Ou roule.',
      'Quinze. Brise-m’en quinze.',
    ],
    outro: ['Quinze… Tu as vu leurs insignes ? Des cloches. Toutes des cloches.', 'Il y a quelque chose de plus gros, plus bas. Reviens me voir quand tu te sentiras prêt.'],
    obj: { type: 'kill', target: 'squelette', count: 15 },
    reward: { xp: 260, gold: 70 },
  },
  {
    id: 'q_boss1', giver: 'aldric', main: true, name: 'La Porte Basse', req: 'q_os',
    desc: 'Au fond de la Crypte veille une armure pleine d’os qui garde un passage. L’abattre.',
    intro: [
      'Mes éclaireurs parlent d’une chose au fond de la crypte. Une armure pleine d’os, qui garde un passage.',
      'Trois de mes hommes y sont restés. Je ne te demande pas de les venger. Je te demande d’ouvrir la route.',
      'Quand elle frappe, elle s’épuise. C’est là qu’il faut cogner.',
    ],
    outro: [
      'Corvin… Tu dis qu’il portait les couleurs de la Garde des Cloches ?',
      'Alors les légendes sont vraies. Valdrenne est là, sous nos pieds, avec ses gardes et ses serments.',
      'Va montrer ce bout de bronze à Maëlis. Moi, je n’y comprends rien. Et je préfère ça.',
    ],
    obj: { type: 'boss', depth: 1, count: 1 },
    reward: { xp: 500, gold: 160, item: { minRarity: 2 } },
  },
  {
    id: 'm_fragment', giver: 'maelis', main: true, name: 'Bronze noir', req: 'q_boss1',
    desc: 'Le Gardien gardait un fragment de la Cloche Noire. D’autres se trouvent plus bas. Atteindre la profondeur 2.',
    intro: [
      'Montre-moi. … Ce bronze. Il est froid, et il vibre, comme s’il se souvenait d’avoir sonné.',
      'C’est un morceau de la Noire. La cloche qui a englouti Valdrenne.',
      'Chaque Gardien en garde un. Ils ne gardent pas des portes : ils gardent la cloche brisée, pour qu’elle ne se reforme jamais.',
      'Si quelqu’un rassemble les morceaux, elle sonnera son treizième coup une seconde fois. Et Cendrebourg descendra à son tour.',
      'Descends plus bas. Il faut savoir ce qui se passe là-dessous.',
    ],
    outro: ['La deuxième profondeur… Tu as entendu les chants ?', 'Ce ne sont pas des morts qui chantent. Va voir Aldric. Il doit savoir.'],
    obj: { type: 'depth', depth: 2, count: 1 },
    reward: { xp: 400, gold: 80 },
  },
  {
    id: 'q_acolytes', giver: 'aldric', main: true, name: 'Les Sonneurs', req: 'm_fragment',
    desc: 'Des hommes en robe descendent en chantant. Ils veulent que la cloche sonne. En abattre 12.',
    intro: [
      'Des hommes en robe. Ils descendent la nuit, en chantant. On les appelle les Sonneurs.',
      'Ce sont des nôtres, recrue. Des gens du village. Le boulanger. La fille du meunier. Ils veulent que la cloche sonne.',
      'Ils font naître des cercles violets sous tes pieds. Ne reste pas dedans.',
      'Je n’aime pas ce que je te demande. Fais-le quand même.',
    ],
    outro: ['Douze… J’en connaissais au moins trois.', 'Ne me dis pas lesquels. Va voir Maëlis.'],
    obj: { type: 'kill', target: 'acolyte', count: 12 },
    reward: { xp: 700, gold: 150 },
  },
  {
    id: 'm_haldis', giver: 'maelis', main: true, name: 'La Sentinelle creuse', req: 'q_acolytes',
    desc: 'Un second Gardien veille à la profondeur 2. Le vaincre avant que les Sonneurs ne prennent son fragment.',
    intro: [
      'Les Sonneurs cherchent les fragments. S’ils tuent les Gardiens avant toi, ils emporteront le bronze.',
      'La seconde Gardienne s’appelait Haldis. Elle gardait les portes de la ville.',
      'Libère-la. C’est la seule chose qu’on puisse encore faire pour elle.',
    ],
    outro: ['« Enfin le silence »… C’est ce qu’elle a dit ?', 'Garde le fragment. Ne le donne à personne. Pas même à moi.'],
    obj: { type: 'boss', depth: 2, count: 1 },
    reward: { xp: 1100, gold: 260, item: { minRarity: 2 } },
  },
  {
    id: 'q_boss3', giver: 'maelis', main: true, name: 'Le Prieur ossuaire', req: 'm_haldis',
    desc: 'Le prieur de Valdrenne prêche encore, à la profondeur 3. Le faire taire.',
    intro: [
      'Plus bas se trouve l’ancien prieuré. Le prieur y prêche encore à ses fidèles morts.',
      'Les Sonneurs l’écoutent. C’est lui qui leur a appris la prière.',
      'Fais-le taire.',
    ],
    outro: ['« Le treizième coup viendra quand même »… Il l’a dit avec joie, n’est-ce pas ?', 'Il ne reste qu’un seul Gardien qui compte. Le roi.'],
    obj: { type: 'boss', depth: 3, count: 1 },
    reward: { xp: 2200, gold: 450, item: { minRarity: 3 } },
  },
  {
    id: 'q_boss5', giver: 'maelis', main: true, name: 'Le Roi sans cloche', req: 'q_boss3',
    desc: 'Tout au fond, à la profondeur 5, le dernier roi de Valdrenne attend sur son trône. L’affronter.',
    intro: [
      'Le roi Aldaric III. C’est lui qui a fait couler la Noire. C’est lui qui l’a fait briser.',
      'S’il reste un fragment, c’est lui qui l’a. Le plus gros. Le battant.',
      'Descends jusqu’à lui. Et reviens. Promets-le-moi.',
    ],
    outro: [
      'Il n’avait rien ? Rien du tout ?',
      '… Alors quelqu’un l’a déjà pris. Le battant n’est plus en bas.',
      'Tu entends ? … Non. Ne réponds pas. Écoute.',
    ],
    obj: { type: 'boss', depth: 5, count: 1 },
    reward: { xp: 5000, gold: 1200, item: { minRarity: 4 } },
    epilogue: true,
  },
  // ---------------- Quêtes secondaires ----------------
  {
    id: 'q_extract', giver: 'odile', name: 'Revenir entier', req: 'm_arrivee',
    desc: 'Un aventurier mort n’achète rien. Réussir 2 extractions.',
    intro: [
      'Toi, tu as la tête de quelqu’un qui va mourir avec les poches pleines. C’est du gâchis.',
      'Cercle vert, portail du Gardien ou pierre de retour : peu importe comment, mais remonte. Deux fois, et je te fais un cadeau.',
    ],
    outro: ['Deux fois ! Tu pourrais presque devenir un client régulier.', 'Tiens. Deux pierres. Ne les perds pas, elles sont hors de prix.'],
    obj: { type: 'extract', count: 2 },
    reward: { xp: 150, gold: 40, consumable: { id: 'pierre', qty: 2 } },
  },
  {
    id: 'q_poche', giver: 'odile', name: 'Doublure de contrebande', req: 'q_extract',
    desc: 'Atteindre la profondeur 2 et revenir voir Odile, qui coudra une meilleure poche.',
    intro: ['Une petite bourse, c’est pour les enfants. Descends à la deuxième profondeur et reviens.', 'Si tu en reviens, je te coudrai une doublure digne d’un vrai contrebandier.'],
    outro: ['Te voilà. Tiens, essaie ça. Deux emplacements, cousus au fil d’argent. Rien n’en sortira, même si toi tu restes en bas.'],
    obj: { type: 'depth', depth: 2, count: 1 },
    reward: { xp: 250, gold: 30, item: { slot: 'pocket', rarity: 1 } },
  },
  {
    id: 'q_archers', giver: 'brann', name: 'Arcs et flèches', req: 'q_rats',
    desc: 'Ces archers squelettes ont percé un tablier de cuir de Brann. En abattre 12.',
    intro: ['Tu vois ce trou dans mon tablier ? Une flèche. Remontée de la crypte, par la cheminée. La cheminée !', 'Ils visent bien, ces sacs d’os. Leur ligne de visée se fige juste avant le tir : c’est à ce moment-là qu’il faut bouger.', 'Douze. Et rapporte-moi leurs pointes, que je les fonde.'],
    outro: ['Douze. Bon débarras. Tiens, j’ai forgé ça pendant que tu étais en bas.'],
    obj: { type: 'kill', target: 'archer', count: 12 },
    reward: { xp: 300, gold: 90, item: { minRarity: 1, slot: 'weapon' } },
  },
  {
    id: 'q_elites', giver: 'brann', name: 'Champions déchus', req: 'q_archers',
    desc: 'Certains monstres portent une aura dorée : ce sont des champions de Valdrenne. En abattre 4.',
    intro: ['Certains de ces morts brillent d’une lueur dorée. Des champions de Valdrenne, avec du bon métal sur le dos.', 'Abats-en quatre. Ce qu’ils portent vaut plus que tout ce que je forge.'],
    outro: ['Quatre champions… Je retire ce que j’ai dit sur toi. Enfin, une partie.'],
    obj: { type: 'elite', count: 4 },
    reward: { xp: 500, gold: 180, item: { minRarity: 2 } },
  },
  {
    id: 'b_tomas', giver: 'brann', name: 'Le fils du forgeron', req: 'q_boss1',
    desc: 'Tomas, le fils de Brann, est descendu au printemps. Retrouver une trace de lui, à partir de la profondeur 2.',
    intro: [
      'J’ai un fils. Tomas. Il est descendu au printemps, pour rapporter de quoi payer la forge.',
      'Je ne te demande pas de le ramener. Je sais ce qu’il y a en bas.',
      'Il portait un médaillon que je lui avais forgé. Si tu le trouves… rapporte-le-moi. C’est tout.',
    ],
    outro: [
      '…',
      'C’est bien le sien. J’ai gravé ces mots la veille de son départ.',
      'Laisse-moi, maintenant. Reviens plus tard pour la forge.',
    ],
    obj: { type: 'lore', id: 'l_tomas', count: 1 },
    reward: { xp: 600, gold: 100, item: { minRarity: 3, slot: 'weapon' } },
  },
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
