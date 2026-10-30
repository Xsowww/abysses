// Missions d'expédition et augures.
// Chaque descente peut porter UNE mission (choisie au portail parmi 3 propositions qui changent à chaque retour)
// et des augures : des malus choisis volontairement, qui augmentent le butin, l'or, l'XP et la récompense.
// La récompense de mission n'est versée que si l'on REMONTE vivant (extraction).
import { pick, uid } from '../core/util.js';

export const MISSIONS = {
  chasse: {
    name: 'Chasse', icon: 'special', minDepth: 1, sceaux: 2,
    desc: 'Abattez le champion nommé.',
    steps: ['Trouver et abattre le champion', 'Remonter vivant'],
  },
  sauvetage: {
    name: 'Sauvetage', icon: 'shout', minDepth: 1, sceaux: 3,
    desc: 'Ramenez le captif vivant.',
    steps: ['Trouver le survivant', 'L’escorter jusqu’à la sortie (il ne doit pas mourir)'],
  },
  cloches: {
    name: 'Les cloches des Sonneurs', icon: 'rage', minDepth: 2, sceaux: 2,
    desc: 'Détruisez les 3 cloches.',
    steps: ['Détruire les 3 cloches', 'Remonter vivant'],
  },
  reliquaire: {
    name: 'Le reliquaire', icon: 'wall', minDepth: 1, sceaux: 3,
    desc: 'Rapportez le reliquaire.',
    steps: ['Récupérer le reliquaire', 'Le rapporter à la surface'],
  },
  balises: {
    name: 'Les feux des veilleurs', icon: 'eye', minDepth: 1, sceaux: 2,
    desc: 'Rallumez les 4 braseros.',
    steps: ['Rallumer les 4 braseros', 'Remonter vivant'],
  },
  ossements: {
    name: 'Les ossements sacrés', icon: 'skull', minDepth: 1, sceaux: 2,
    desc: 'Rassemblez les 5 ossements sacrés.',
    steps: ['Rassembler 5 ossements', 'Remonter vivant'],
  },
  nids: {
    name: 'Les nids', icon: 'rage', minDepth: 2, sceaux: 3,
    desc: 'Détruisez les 3 nids de goules.',
    steps: ['Détruire 3 nids', 'Remonter vivant'],
  },
  gardien: {
    name: 'Le cierge', icon: 'special', minDepth: 1, sceaux: 3,
    desc: 'Abattez le Gardien avant que le cierge ne s’éteigne.',
    steps: ['Tuer le Gardien à temps', 'Remonter vivant'],
  },
  pillage: {
    name: 'Les coffres scellés', icon: 'wall', minDepth: 1, sceaux: 2,
    desc: 'Forcez les 3 coffres scellés. Ils sont gardés.',
    steps: ['Ouvrir 3 coffres', 'Remonter vivant'],
  },
  siege: {
    name: 'Le sceau brisé', icon: 'veil', minDepth: 1, sceaux: 3,
    desc: 'Tenez le sceau 60 s.',
    steps: ['Activer le sceau et tenir 60 s', 'Remonter vivant'],
  },
};

export const AUGURES = {
  nuit: { name: 'Nuit sans lune', desc: 'Lumière −50 %.', bonus: 20 },
  horde: { name: 'Horde', desc: '+50 % de monstres.', bonus: 25 },
  chair: { name: 'Chairs de fer', desc: 'Monstres +40 % PV.', bonus: 20 },
  jeune: { name: 'Jeûne', desc: 'Pas de fioles.', bonus: 30 },
  hate: { name: 'Cloche hâtive', desc: 'Champions ×2.', bonus: 25 },
};

const CHAMPION_NAMES = ['Morvagne l’Éventrée', 'Ser Ancel le Rouillé', 'La Veuve de Cire', 'Thibault Sans-Mâchoire', 'Odran le Sonneur', 'Mère Cendre', 'Le Chantre aveugle', 'Isarn aux Mille Os', 'Grisaille', 'Le Frère Pendu'];
const SURVIVORS = ['Jehan, le fils du meunier', 'Aude, la lavandière', 'Pérrin, l’apprenti de Brann', 'Sœur Maëlle', 'Le vieux Bastien', 'Colin, le guetteur'];

export function championName() { return pick(CHAMPION_NAMES); }
export function survivorName() { return pick(SURVIVORS); }

// La mission n'est PAS choisie par le joueur : les Abysses l'imposent.
// Ordre de découverte : chaque mode apparaît à tour de rôle (la première descente est libre),
// puis les missions sont tirées au hasard (jamais deux fois de suite la même).
export const MISSION_ORDER = ['chasse', 'balises', 'sauvetage', 'ossements', 'reliquaire', 'pillage', 'siege', 'gardien', 'cloches', 'nids'];

// Mode suivant : chaque mode à tour de rôle (selon la profondeur débloquée), puis au hasard sans répétition.
export function planMission(pd) {
  const seen = pd.missionsSeen || [];
  const fresh = MISSION_ORDER.find((t) => !seen.includes(t) && MISSIONS[t].minDepth <= (pd.maxDepth || 1));
  if (fresh) return fresh;
  return pick(MISSION_ORDER.filter((t) => t !== pd.lastMission && MISSIONS[t].minDepth <= (pd.maxDepth || 1)));
}

// Chaque mission est confiée par un habitant : c'est la raison de la prochaine descente.
export const MISSION_GIVER = { chasse: 'aldric', balises: 'aldric', sauvetage: 'odile', reliquaire: 'gaspard', siege: 'anselme', cloches: 'maelis', ossements: 'gaspard', nids: 'brann', gardien: 'maelis', pillage: 'odile' };

export function makeMissionQuest(pd) {
  const t = planMission(pd);
  if (!t) return null;
  const M = MISSIONS[t];
  let who = null, name, desc, intro;
  switch (t) {
    case 'chasse': who = championName(); name = `Tête mise à prix : ${who}`; desc = `${who} rôde dans les Abysses. Abattez-le.`; intro = [`${who}. Trois de mes gardes ne sont pas remontés. Ramène-moi sa tête.`]; break;
    case 'sauvetage': who = survivorName(); name = `Retrouver ${who}`; desc = `${who} n’est pas remonté. Ramenez-le vivant.`; intro = [`${who} est descendu hier. Personne ne l’a revu. Ramène-le… vivant.`]; break;
    case 'cloches': name = 'Faire taire les cloches'; desc = 'Détruisez les 3 cloches des Sonneurs.'; intro = ['Elles sonnent encore, en bas. Brise-les avant qu’elles n’appellent autre chose.']; break;
    case 'reliquaire': name = 'Le reliquaire de Saint-Oren'; desc = 'Rapportez le reliquaire scellé à la surface.'; intro = ['Un reliquaire repose tout au fond. Lourd. Ne le lâche pas.']; break;
    case 'balises': name = 'Les feux des veilleurs'; desc = 'Rallumez les 4 braseros.'; intro = ['Les veilleurs gardaient quatre feux. Rallume-les, qu’on voie enfin ce qui rampe là-dessous.']; break;
    case 'ossements': name = 'Les ossements de Saint-Oren'; desc = 'Rassemblez les 5 ossements sacrés.'; intro = ['Ses os ont été dispersés. Cinq. Ramène-les tous, qu’il repose enfin.']; break;
    case 'nids': name = 'Les nids'; desc = 'Détruisez les 3 nids de goules.'; intro = ['Les goules nichent sous la mine. Brûle les nids, ou on n’aura plus de fer.']; break;
    case 'gardien': name = 'Avant que le cierge meure'; desc = 'Abattez le Gardien avant que le cierge ne s’éteigne.'; intro = ['Allume ce cierge en bas. Quand il s’éteint, le Gardien se réveille pour de bon. Tue-le avant.']; break;
    case 'pillage': name = 'Les coffres scellés'; desc = 'Forcez les 3 coffres scellés.'; intro = ['Trois coffres de marchands, scellés là-dessous. Ce qu’il y a dedans m’intéresse. Ce qui les garde, moins.']; break;
    case 'siege': name = 'Le sceau qui cède'; desc = 'Tenez le sceau 60 s.'; intro = ['Le sceau se fissure. Tiens-le une minute. Une seule.']; break;
  }
  return { id: 'mq_' + uid(), giver: MISSION_GIVER[t], mission: true, mtype: t, who, name, desc,
    obj: { type: 'mission', mtype: t, count: 1 }, reward: {},
    intro, outro: [pick(['C’est fait, donc. Bien.', 'Tu es revenu. Peu en reviennent.', 'Les Abysses te laissent passer… pour l’instant.'])] };
}

// Mission secondaire d'un étage : 3 étages sur 4, un défi au hasard (jamais deux fois de suite le même).
export function sideMissionFor(depth, last) {
  if (Math.random() < 0.25) return null;
  const ok = MISSION_ORDER.filter((t) => MISSIONS[t].minDepth <= depth && t !== last);
  return ok.length ? { type: pick(ok), depth } : null;
}

export function augureBonus(list) {
  return (list || []).reduce((a, k) => a + (AUGURES[k] ? AUGURES[k].bonus : 0), 0);
}
