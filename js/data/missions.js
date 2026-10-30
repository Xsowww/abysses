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
    desc: 'Rapportez le reliquaire. Lourd : pas de roulade.',
    steps: ['Récupérer le reliquaire', 'Le rapporter à la surface'],
  },
  balises: {
    name: 'Les feux des veilleurs', icon: 'eye', minDepth: 1, sceaux: 2,
    desc: 'Rallumez les 4 braseros.',
    steps: ['Rallumer les 4 braseros', 'Remonter vivant'],
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
export const MISSION_ORDER = ['chasse', 'balises', 'sauvetage', 'reliquaire', 'siege', 'cloches'];

// Mode suivant : chaque mode à tour de rôle (selon la profondeur débloquée), puis au hasard sans répétition.
export function planMission(pd) {
  const seen = pd.missionsSeen || [];
  const fresh = MISSION_ORDER.find((t) => !seen.includes(t) && MISSIONS[t].minDepth <= (pd.maxDepth || 1));
  if (fresh) return fresh;
  return pick(MISSION_ORDER.filter((t) => t !== pd.lastMission && MISSIONS[t].minDepth <= (pd.maxDepth || 1)));
}

// Chaque mission est confiée par un habitant : c'est la raison de la prochaine descente.
export const MISSION_GIVER = { chasse: 'aldric', balises: 'aldric', sauvetage: 'odile', reliquaire: 'gaspard', siege: 'anselme', cloches: 'maelis' };

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
    case 'siege': name = 'Le sceau qui cède'; desc = 'Tenez le sceau 60 s.'; intro = ['Le sceau se fissure. Tiens-le une minute. Une seule.']; break;
  }
  return { id: 'mq_' + uid(), giver: MISSION_GIVER[t], mission: true, mtype: t, who, name, desc,
    obj: { type: 'mission', mtype: t, count: 1 }, reward: {},
    intro, outro: [pick(['C’est fait, donc. Bien.', 'Tu es revenu. Peu en reviennent.', 'Les Abysses te laissent passer… pour l’instant.'])] };
}

export function augureBonus(list) {
  return (list || []).reduce((a, k) => a + (AUGURES[k] ? AUGURES[k].bonus : 0), 0);
}
