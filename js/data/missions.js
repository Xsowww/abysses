// Missions d'expédition et augures.
// Chaque descente peut porter UNE mission (choisie au portail parmi 3 propositions qui changent à chaque retour)
// et des augures : des malus choisis volontairement, qui augmentent le butin, l'or, l'XP et la récompense.
// La récompense de mission n'est versée que si l'on REMONTE vivant (extraction).
import { pick, uid } from '../core/util.js';

export const MISSIONS = {
  chasse: {
    name: 'Chasse', icon: 'special', minDepth: 1, sceaux: 2,
    desc: 'Un champion nommé rôde à cette profondeur. Traquez-le, abattez-le, puis remontez.',
    steps: ['Trouver et abattre le champion', 'Remonter vivant'],
  },
  sauvetage: {
    name: 'Sauvetage', icon: 'shout', minDepth: 1, sceaux: 3,
    desc: 'Un villageois est retenu au fond de la crypte. Trouvez-le et ramenez-le vivant jusqu’à un cercle d’extraction ou au portail du Gardien.',
    steps: ['Trouver le survivant', 'L’escorter jusqu’à la sortie (il ne doit pas mourir)'],
  },
  cloches: {
    name: 'Les cloches des Sonneurs', icon: 'rage', minDepth: 2, sceaux: 2,
    desc: 'Les Sonneurs ont dressé trois cloches rituelles. Tant qu’elles sonnent, des acolytes affluent. Détruisez-les toutes.',
    steps: ['Détruire les 3 cloches', 'Remonter vivant'],
  },
  reliquaire: {
    name: 'Le reliquaire', icon: 'wall', minDepth: 1, sceaux: 3,
    desc: 'Un reliquaire scellé repose au plus profond. Récupérez-le et remontez. Il est lourd : pas de roulade, vitesse réduite.',
    steps: ['Récupérer le reliquaire', 'Le rapporter à la surface'],
  },
  balises: {
    name: 'Les feux des veilleurs', icon: 'eye', minDepth: 1, sceaux: 2,
    desc: 'Les anciens veilleurs entretenaient quatre braseros. Rallumez-les tous : chacun éclaire la carte et vous soigne.',
    steps: ['Rallumer les 4 braseros', 'Remonter vivant'],
  },
  siege: {
    name: 'Le sceau brisé', icon: 'veil', minDepth: 1, sceaux: 3,
    desc: 'Un sceau de protection se fissure. Tenez le cercle pendant 60 secondes contre les vagues de monstres.',
    steps: ['Activer le sceau et tenir 60 s', 'Remonter vivant'],
  },
};

export const AUGURES = {
  nuit: { name: 'Nuit sans lune', desc: 'Votre lumière est réduite de moitié.', bonus: 20 },
  horde: { name: 'Horde', desc: '+50 % de monstres.', bonus: 25 },
  chair: { name: 'Chairs de fer', desc: 'Les monstres ont +40 % de PV.', bonus: 20 },
  jeune: { name: 'Jeûne', desc: 'Les fioles de sang sont interdites.', bonus: 30 },
  hate: { name: 'Cloche hâtive', desc: 'Deux fois plus de champions (élites).', bonus: 25 },
};

const CHAMPION_NAMES = ['Morvagne l’Éventrée', 'Ser Ancel le Rouillé', 'La Veuve de Cire', 'Thibault Sans-Mâchoire', 'Odran le Sonneur', 'Mère Cendre', 'Le Chantre aveugle', 'Isarn aux Mille Os', 'Grisaille', 'Le Frère Pendu'];
const SURVIVORS = ['Jehan, le fils du meunier', 'Aude, la lavandière', 'Pérrin, l’apprenti de Brann', 'Sœur Maëlle', 'Le vieux Bastien', 'Colin, le guetteur'];

export function championName() { return pick(CHAMPION_NAMES); }
export function survivorName() { return pick(SURVIVORS); }

// Trois propositions de mission, adaptées à la profondeur la plus basse débloquée.
export function makeMissionBoard(pd) {
  const maxD = Math.max(1, pd.maxDepth || 1);
  const types = Object.keys(MISSIONS);
  const board = [];
  const used = new Set();
  for (let i = 0; i < 3; i++) {
    let t;
    for (let k = 0; k < 20; k++) { t = pick(types); if (!used.has(t)) break; }
    used.add(t);
    const minD = MISSIONS[t].minDepth;
    const depth = Math.max(minD, Math.min(maxD, maxD - Math.floor(Math.random() * Math.min(2, maxD))));
    if (depth > maxD) continue;
    board.push({ id: uid(), type: t, depth });
  }
  return board;
}

export function augureBonus(list) {
  return (list || []).reduce((a, k) => a + (AUGURES[k] ? AUGURES[k].bonus : 0), 0);
}
