// Contrats de l'auberge (Lisette) : tâches secondaires renouvelables, adaptées à la profondeur atteinte.
import { pick, randInt, uid, chance } from '../core/util.js';
import { MISSIONS } from './missions.js';

const CLIENTS = ['le meunier', 'la veuve Corbin', 'les gardes', 'le marchand de sel', 'un voyageur pressé', 'le chapelain', 'les enfants du lavoir', 'un inconnu encapuchonné'];
const PLURAL = { rat: 'goules', squelette: 'squelettes', archer: 'archers squelettes', acolyte: 'acolytes' };

export function makeContract(pd) {
  const D = Math.max(1, (pd.maxDepth || 1) - 1 || 1);
  const scale = 1 + (D - 1) * 0.6;
  const who = pick(CLIENTS);
  const kinds = ['kill', 'kill', 'elite', 'bring', 'extract'];
  if (D >= 2) kinds.push('boss');
  // missions déjà découvertes : Lisette peut en commander une précise (elle sera imposée à la prochaine descente)
  const known = (pd.missionsSeen || []).filter((t) => MISSIONS[t] && MISSIONS[t].minDepth <= (pd.maxDepth || 1));
  if (known.length >= 2) kinds.push('mission', 'mission');
  const k = pick(kinds);
  let c;
  if (k === 'kill') {
    const pool = ['rat', 'squelette', 'archer'];
    if (D >= 2) pool.push('acolyte');
    const t = pick(pool);
    const n = randInt(12, 20) + D * 3;
    c = { name: `Prime : ${PLURAL[t]}`, desc: `De la part de ${who} : abattre ${n} ${PLURAL[t]}.`, obj: { type: 'kill', target: t, count: n } };
  } else if (k === 'elite') {
    const n = randInt(2, 3) + Math.floor(D / 2);
    c = { name: 'Prime : champions', desc: `De la part de ${who} : abattre ${n} champions à l’aura dorée.`, obj: { type: 'elite', count: n } };
  } else if (k === 'bring') {
    const mat = D >= 3 && chance(0.4) ? 'bronze' : 'fer';
    const n = mat === 'fer' ? randInt(8, 14) : randInt(3, 6);
    c = { name: mat === 'fer' ? 'Commande de fer' : 'Commande de bronze noir', desc: `${who[0].toUpperCase() + who.slice(1)} a besoin de ${n} ${mat === 'fer' ? 'Fers de Valdrenne' : 'Éclats de bronze noir'}. À rapporter au village.`, obj: { type: 'bring', id: mat, count: n, minDepth: mat === 'fer' ? 1 : 2 } };
  } else if (k === 'mission') {
    const t = pick(known);
    const NAMES = { chasse: 'Tête mise à prix', sauvetage: 'Ramener les disparus', cloches: 'Faire taire les cloches', reliquaire: 'Le reliquaire volé', balises: 'Les feux des veilleurs', siege: 'Le sceau qui cède' };
    c = { name: `Contrat : ${NAMES[t] || MISSIONS[t].name}`, desc: `De la part de ${who} : accomplir la mission « ${MISSIONS[t].name} » et en revenir vivant. Tant que ce contrat est en cours, les Abysses vous imposeront cette mission.`, obj: { type: 'mission', mtype: t, count: 1 } };
  } else if (k === 'boss') {
    const d = randInt(Math.max(1, D - 1), D);
    c = { name: `Prime : Gardien de la profondeur ${d}`, desc: `De la part de ${who} : vaincre un Gardien à la profondeur ${d} ou plus.`, obj: { type: 'boss', depth: d, count: 1, fresh: true } };
  } else {
    const n = randInt(2, 3);
    c = { name: 'Escorte de butin', desc: `De la part de ${who} : remonter vivant ${n} fois (extraction).`, obj: { type: 'extract', count: n } };
  }
  const gold = Math.round((60 + randInt(0, 40)) * scale);
  const reward = { xp: Math.round(150 * scale * scale), gold };
  if (chance(0.5)) reward.consumable = D >= 3 && chance(0.4) ? { id: 'braise', qty: randInt(1, 2) } : D >= 2 && chance(0.5) ? { id: 'bronze', qty: randInt(1, 3) } : { id: 'fer', qty: randInt(4, 8) };
  else if (chance(0.35)) reward.setAny = true;
  return { id: 'c_' + uid(), giver: 'lisette', contract: true, ...c, reward,
    intro: [pick(['Celle-là paie bien.', 'Pas de questions, pas de retard.', 'On compte sur toi. Enfin, on compte surtout sur l’or.'])],
    outro: [pick(['Le client est content. Voilà ta part.', 'Propre. Je savais que tu reviendrais.', 'Encore un contrat honoré. Les gens commencent à parler de toi.'])] };
}

// Tableau des contrats : 3 places au maximum. Un nouveau contrat n'arrive qu'après chaque retour
// d'expédition (pd.boardNew), et on ne peut en mener que MAX_ACTIVE à la fois.
export const MAX_ACTIVE = 2;
export function refillContracts(pd) {
  pd.contracts = (pd.contracts || []).filter((c) => !pd.quests[c.id] || pd.quests[c.id].status !== 'done');
  if (pd.boardInit === undefined) { pd.boardInit = true; pd.boardNew = Math.max(pd.boardNew || 0, 2); }
  const free = pd.contracts.filter((c) => !pd.quests[c.id]);
  let n = free.length;
  while (n < 3 && (pd.boardNew || 0) > 0) { pd.contracts.push(makeContract(pd)); pd.boardNew--; n++; }
}
export function activeContracts(pd) {
  return (pd.contracts || []).filter((c) => pd.quests[c.id] && pd.quests[c.id].status !== 'done').length;
}
