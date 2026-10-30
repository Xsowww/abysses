// Quêtes et PNJ du village — Acte I : « La Cloche Noire ».
// obj.type : kill (target = id monstre), boss (depth min), elite, extract, depth, lore (id d'un fragment),
//   bring (rapporter des reliques/matériaux au village : id, count, minDepth), lorecount (fragments trouvés),
//   setpieces (porter N pièces d'un même ensemble), upgrade (renforcer un objet jusqu'à +N chez Brann)
// Les objectifs « profondeur », « Gardien », « fragment » déjà accomplis sont validés dès l'acceptation.
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
      'Fioles, poches bien cousues… tout ce qu’il faut pour revenir vivant.',
      'Je rachète ce que tu trouves en bas. Sans poser de questions. Surtout sans poser de questions.',
    ],
  },
  anselme: {
    name: 'Frère Anselme', title: 'Chapelain', color: '#4a3a2a', hood: '#3a2a1c',
    greet: [
      'Les morts d’en bas n’ont pas eu de prière. Je leur en dois une chacun. Ça fait beaucoup de prières.',
      'Assieds-toi un instant. Même ceux qui descendent ont le droit de se reposer.',
    ],
  },
  gaspard: {
    name: 'Gaspard', title: 'Fossoyeur', color: '#2a2a2c', hood: '#1d1d20',
    greet: [
      'Je creuse. C’est tout ce que je sais faire. Et en ce moment, le travail ne manque pas.',
      'Les os qui remontent, je les enterre. Ceux qui remontent tout seuls… je les enterre plus profond.',
    ],
  },
  mira: {
    name: 'Mira', title: 'Antiquaire', color: '#4a1d1d', hood: '#1a1414', shop: 'atelier', shopLabel: 'Voir l’atelier (ensembles)',
    greet: [
      'Les armures de Valdrenne étaient faites pour être portées ensemble. Une pièce seule ne vaut rien. Toutes ensemble… ah.',
      'Rapporte-moi ce que tu trouves en bas. Même ce qui te semble inutile. Surtout ce qui te semble inutile.',
    ],
  },
  lisette: {
    name: 'Lisette', title: 'Aubergiste', color: '#2a3a5a', hood: '#d8d0c0', contracts: true,
    greet: [
      'Une chope ? Non ? Alors un contrat. Les gens du village paient bien ceux qui reviennent.',
      'Le tableau des primes est là. Prends ce que tu veux, mais reviens le chercher en personne.',
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
    id: 'm_varn', giver: 'aldric', main: true, name: 'Le Bourreau muet', req: 'q_boss3',
    desc: 'À la profondeur 4, Varn, le bourreau de Valdrenne, garde le chemin du trône. L’abattre.',
    intro: [
      'Maëlis t’envoie vers le roi ? Pas encore. Il y a quelqu’un entre lui et nous.',
      'Varn. Le bourreau. Il n’a jamais dit un mot, de son vivant. Il ne parlera pas davantage maintenant.',
      'Ne reste pas devant lui quand il lève la hache. Personne n’est resté devant lui deux fois.',
    ],
    outro: ['Varn est tombé… Alors le chemin du trône est ouvert.', 'Va voir Maëlis. Et promets-moi de remonter, cette fois encore.'],
    obj: { type: 'boss', depth: 4, count: 1 },
    reward: { xp: 3200, gold: 700, item: { minRarity: 3 } },
  },
  {
    id: 'q_boss5', giver: 'maelis', main: true, name: 'Le Roi sans cloche', req: 'm_varn',
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
      'Peu importe comment, mais remonte. Deux fois, et je te fais un cadeau.',
    ],
    outro: ['Deux fois ! Tu pourrais presque devenir un client régulier.', 'Tiens. Deux pierres. Ne les perds pas, elles sont hors de prix.'],
    obj: { type: 'extract', count: 2 },
    reward: { xp: 150, gold: 40, consumable: { id: 'pierre', qty: 2 } },
  },
  {
    id: 'q_poche', giver: 'odile', name: 'Doublure de contrebande', req: 'q_extract',
    desc: 'Atteindre la profondeur 2.',
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
    desc: 'Abattre 4 champions de Valdrenne.',
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
  // ---------------- Frère Anselme (chapelle) ----------------
  {
    id: 'a_cierges', giver: 'anselme', name: 'Lumière pour les morts', req: 'm_arrivee',
    desc: 'Rapporter 3 Cierges des morts trouvés dans la Crypte.',
    intro: [
      'Là-dessous, chaque tombe avait son cierge. Ils sont éteints depuis trois siècles.',
      'Rapporte-m’en trois. Je les rallumerai ici, pour ceux qui n’ont personne.',
      'Garde-les dans ta poche cousue. Ce qui reste dans ton sac, les Abysses le reprennent.',
    ],
    outro: ['Trois flammes de plus. Elles brûleront longtemps.', 'Tiens. Ce n’est pas grand-chose, mais ça soigne.'],
    obj: { type: 'bring', id: 'cierge', count: 3, minDepth: 1 },
    reward: { xp: 220, gold: 60, consumable: { id: 'potion', qty: 3 } },
  },
  {
    id: 'a_sonneurs', giver: 'anselme', name: 'Les cierges des Sonneurs', req: 'q_acolytes',
    desc: 'Les Sonneurs allument des cierges pour la Noire. En rapporter 5, trouvés à la profondeur 2 ou plus.',
    intro: ['Les Sonneurs prient avec nos cierges. Ils les volent aux morts.', 'Reprends-les. Cinq. Je connais quelqu’un qui en a gardé la robe… elle te reviendra.'],
    outro: ['Cinq. Bien. La robe est à toi. Porte-la avec les autres pièces, si tu les trouves : seules, elles ne valent rien.'],
    obj: { type: 'bring', id: 'cierge', count: 5, minDepth: 2 },
    reward: { xp: 900, gold: 150, set: 'sonneurs' },
  },
  {
    id: 'a_lore', giver: 'anselme', name: 'Ce que disent les pierres', req: 'q_boss1',
    desc: 'Retrouver 6 fragments de l’histoire de Valdrenne (pages, lettres, gravures) dans les Abysses.',
    intro: ['On n’enterre pas une ville. On s’en souvient, ou on l’oublie.', 'Rapporte-moi ce qu’ils ont écrit. Six fragments. Je les recopierai.'],
    outro: ['Six voix de plus qui ne seront pas oubliées.', 'Tu as remarqué ? Ils parlent tous de la même cloche.'],
    obj: { type: 'lorecount', count: 6 },
    reward: { xp: 1400, gold: 250, item: { minRarity: 3 } },
  },
  // ---------------- Gaspard (fossoyeur) ----------------
  {
    id: 'g_os', giver: 'gaspard', name: 'Une tombe pour chacun', req: 'm_arrivee',
    desc: 'Rapporter 4 Ossements nommés, pour que Gaspard les enterre.',
    intro: ['Certains os portent encore un nom, gravé sur une plaque. Ceux-là, je veux les enterrer dignement.', 'Quatre. Rapporte-m’en quatre. Et ne les laisse pas traîner dans ton sac si tu tiens à les ramener.'],
    outro: ['Quatre noms. Quatre tombes. Je les creuserai cette nuit.', 'Prends ça. Du fer de la vieille ville, trouvé en creusant. Brann en fera quelque chose.'],
    obj: { type: 'bring', id: 'ossement', count: 4, minDepth: 1 },
    reward: { xp: 260, gold: 90, consumable: { id: 'fer', qty: 12 } },
  },
  {
    id: 'g_squelettes', giver: 'gaspard', name: 'Ceux qui ne restent pas couchés', req: 'q_os',
    desc: 'Abattre 40 squelettes (guerriers ou archers). Gaspard a gardé quelque chose de la Garde des Cloches.',
    intro: ['Les squelettes, eux, ne veulent pas de tombe. Ils veulent remonter.', 'Quarante. Et je te donnerai ce que j’ai déterré l’hiver dernier : une pièce d’armure de la Garde des Cloches.'],
    outro: ['Quarante… Tu sens le vieil os à des lieues. Tiens, voilà la pièce promise.', 'Seule, elle ne vaut pas grand-chose. Mais la Garde ne se battait jamais seule.'],
    obj: { type: 'kill', target: 'squelette', also: 'archer', count: 40 },
    reward: { xp: 800, gold: 160, set: 'garde' },
  },
  {
    id: 'g_haldis', giver: 'gaspard', name: 'Les sœurs de la Porte', req: 'm_haldis',
    desc: 'Rapporter 6 Ossements nommés trouvés à la profondeur 3 ou plus : les gardes d’Haldis.',
    intro: ['Haldis avait des gardes. Des femmes, toutes. Leurs noms sont gravés sur les plaques.', 'Six. Plus bas que la deuxième profondeur. Je leur dois bien ça.'],
    outro: ['Elles reposeront côte à côte. Comme à la Porte.', 'Haldis portait ceci. Elle voudrait que quelqu’un continue de veiller.'],
    obj: { type: 'bring', id: 'ossement', count: 6, minDepth: 3 },
    reward: { xp: 1800, gold: 300, set: 'haldis' },
  },
  // ---------------- Mira (antiquaire) ----------------
  {
    id: 'mi_paire', giver: 'mira', name: 'Les pièces vont par paires', req: 'q_boss1',
    desc: 'Porter 2 pièces d’un même ensemble.',
    intro: [
      'Tu vois ce vert sur certaines pièces ? Ce sont des tenues entières de Valdrenne, éparpillées.',
      'Une pièce seule est médiocre. Deux pièces du même ensemble… elles se reconnaissent. Trois, elles chantent. Toutes, elles font de toi autre chose.',
      'Porte-en deux en même temps, et reviens me voir.',
    ],
    outro: ['Tu sens la différence ? Moi, je la vois.', 'Continue. Et quand tu trouves une pièce qui ne te sert à rien aujourd’hui, mets-la dans ta poche. Demain, elle complétera tout.'],
    obj: { type: 'setpieces', count: 2 },
    reward: { xp: 700, gold: 200, consumable: { id: 'bronze', qty: 3 } },
  },
  {
    id: 'mi_trois', giver: 'mira', name: 'Trois voix', req: 'mi_paire',
    desc: 'Porter 3 pièces d’un même ensemble.',
    intro: ['Trois pièces. C’est là que les ensembles commencent vraiment à parler.', 'Rapporte-les de là-dessous, sécurise-les, assemble-les. Puis viens.'],
    outro: ['Ah… Elle chante, n’est-ce pas ? Tiens. Une larme de cloche. Brann saura quoi en faire.'],
    obj: { type: 'setpieces', count: 3 },
    reward: { xp: 2000, gold: 400, consumable: { id: 'larme', qty: 1 } },
  },
  {
    id: 'mi_complet', giver: 'mira', name: 'La tenue complète', req: 'mi_trois',
    desc: 'Porter un ensemble complet.',
    intro: ['Une tenue complète. Je n’en ai vu qu’une, une fois, sur un mort qui souriait encore.', 'Fais-le. Pour moi. Pour qu’au moins une fois, Valdrenne soit entière.'],
    outro: ['…', 'Tu ressembles à un portrait que j’ai vu, enfant. Garde-la. Ne la perds jamais.'],
    obj: { type: 'setpieces', count: 99, full: true },
    reward: { xp: 5000, gold: 1000, consumable: { id: 'larme', qty: 2 } },
  },
  // ---------------- Brann (forge) ----------------
  {
    id: 'b_fer', giver: 'brann', name: 'Le fer de Valdrenne', req: 'm_arrivee',
    desc: 'Rapporter 10 Fers de Valdrenne.',
    intro: ['Le fer de là-dessous ne rouille pas. Je veux comprendre pourquoi.', 'Rapporte-m’en dix. En échange, je t’apprends ce que la forge peut faire pour toi : renforcer ce que tu portes, +1, +2, et plus si tu as de quoi.'],
    outro: ['Bon métal. Très bon métal.', 'À partir de maintenant, apporte-moi ce que tu veux renforcer. Il me faudra du fer, de l’or… et plus tard, des choses plus rares.'],
    obj: { type: 'bring', id: 'fer', count: 10, minDepth: 1 },
    reward: { xp: 300, gold: 50 },
  },
  {
    id: 'b_renfort', giver: 'brann', name: 'Trempé deux fois', req: 'b_fer',
    desc: 'Faire renforcer un objet jusqu’à +2 à la forge.',
    intro: ['Une lame qui a été trempée deux fois ne casse pas. Fais renforcer quelque chose jusqu’à +2.'],
    outro: ['Tu sens le poids ? C’est celui du travail bien fait.', 'Tiens. Du bronze noir. Pour la suite.'],
    obj: { type: 'upgrade', level: 2 },
    reward: { xp: 500, gold: 80, consumable: { id: 'bronze', qty: 4 } },
  },
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

// Quêtes connues (fixes + contrats de l'auberge, générés et stockés dans la sauvegarde).
export function questDef(pd, id) {
  return QUEST_BY_ID[id] || (pd && pd.contracts || []).find((c) => c.id === id) || (pd && pd.mquest && pd.mquest.id === id ? pd.mquest : null);
}
export function allQuests(pd) {
  return [...QUESTS, ...((pd && pd.contracts) || []), ...(pd && pd.mquest ? [pd.mquest] : [])];
}
