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

// Mission exigée par un contrat en cours (prioritaire)
export function contractMission(pd) {
  for (const c of pd.contracts || []) {
    const st = pd.quests && pd.quests[c.id];
    if (st && st.status === 'active' && c.obj.type === 'mission') return c.obj.mtype;
  }
  return null;
}

// Prochaine mission prévue (calculée au retour au village, affichée au portail)
export function planMission(pd) {
  if (!(pd.stats && pd.stats.runs)) return null;
  const seen = pd.missionsSeen || [];
  const fresh = MISSION_ORDER.find((t) => !seen.includes(t) && MISSIONS[t].minDepth <= (pd.maxDepth || 1));
  if (fresh) return fresh;
  return pick(MISSION_ORDER.filter((t) => t !== pd.lastMission));
}

// Mission réellement attribuée en entrant à une profondeur donnée
export function missionForRun(pd, depth) {
  const ok = (t) => t && MISSIONS[t] && MISSIONS[t].minDepth <= depth;
  const c = contractMission(pd);
  if (ok(c)) return c;
  if (ok(pd.nextMission)) return pd.nextMission;
  if (!pd.nextMission) return null;
  // la mission prévue n'existe pas à cette profondeur : une autre déjà connue la remplace
  const alt = (pd.missionsSeen || []).filter((t) => ok(t) && t !== pd.lastMission);
  return alt.length ? pick(alt) : MISSION_ORDER.find(ok);
}

export function augureBonus(list) {
  return (list || []).reduce((a, k) => a + (AUGURES[k] ? AUGURES[k].bonus : 0), 0);
}
