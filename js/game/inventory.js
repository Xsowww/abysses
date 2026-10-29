// Opérations d'inventaire : sac, poche sécurisée, coffre, équipement.
import { CONSUMABLES, isTwoHanded, itemName, itemClass } from '../data/items.js';
import { CLASSES } from '../data/classes.js';

export const INV_SIZE = 30;
export const STASH_SIZE = 60;
export const POCKET_MAX = 4;

export function pocketSize(pd) {
  const p = pd.equipment.pocket;
  return p ? p.secureSlots : 0;
}

export function container(pd, c) {
  if (c === 'inv') return pd.inventory;
  if (c === 'pocket') return pd.pocket;
  if (c === 'stash') return pd.stash;
  return null;
}

export function getItem(pd, ref) {
  if (ref.c === 'equip') return pd.equipment[ref.i] || null;
  const arr = container(pd, ref.c);
  return arr ? arr[ref.i] : null;
}

function setItem(pd, ref, item) {
  if (ref.c === 'equip') pd.equipment[ref.i] = item;
  else container(pd, ref.c)[ref.i] = item;
}

export function freeSlot(arr, limit = arr.length) {
  for (let i = 0; i < limit; i++) if (!arr[i]) return i;
  return -1;
}

export function freeCount(arr, limit = arr.length) {
  let n = 0;
  for (let i = 0; i < limit; i++) if (!arr[i]) n++;
  return n;
}

// Ajoute un objet dans un conteneur (empile les consommables). Renvoie true si réussi.
export function addTo(arr, item, limit = arr.length) {
  if (item.kind === 'consumable') {
    const max = CONSUMABLES[item.id].stack;
    for (let i = 0; i < limit && item.qty > 0; i++) {
      const o = arr[i];
      // On n'empile pas le butin trouvé (perdable) avec ce qui vient du village.
      if (o && o.kind === 'consumable' && o.id === item.id && o.qty < max && !!o.found === !!item.found) {
        const n = Math.min(max - o.qty, item.qty);
        o.qty += n;
        item.qty -= n;
      }
    }
    if (item.qty <= 0) return true;
  }
  const i = freeSlot(arr, limit);
  if (i < 0) return false;
  arr[i] = item;
  return true;
}

export function addItem(pd, item) { return addTo(pd.inventory, item); }

// Regroupe les piles de consommables identiques (après une expédition).
export function mergeStacks(arr) {
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    if (!a || a.kind !== 'consumable') continue;
    const max = CONSUMABLES[a.id].stack;
    for (let j = i + 1; j < arr.length && a.qty < max; j++) {
      const b = arr[j];
      if (!b || b.kind !== 'consumable' || b.id !== a.id) continue;
      const n = Math.min(max - a.qty, b.qty);
      a.qty += n;
      b.qty -= n;
      if (b.qty <= 0) arr[j] = null;
    }
  }
}

export function countConsumable(pd, id) {
  let n = 0;
  for (const arr of [pd.inventory, pd.pocket]) for (const it of arr) if (it && it.kind === 'consumable' && it.id === id) n += it.qty;
  return n;
}

// Utilise d'abord le sac, puis la poche.
export function consume(pd, id) {
  for (const arr of [pd.inventory, pd.pocket]) {
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      if (it && it.kind === 'consumable' && it.id === id) {
        it.qty--;
        if (it.qty <= 0) arr[i] = null;
        return true;
      }
    }
  }
  return false;
}

// Équipe l'objet situé en ref. Renvoie un message d'erreur ou null.
export function equip(pd, ref) {
  const item = getItem(pd, ref);
  if (!item || item.kind !== 'equip') return 'Cet objet ne s’équipe pas.';
  if (ref.c === 'equip') return null;
  const ic = itemClass(item);
  if (ic && ic !== pd.cls) return `Réservé à la classe ${CLASSES[ic].name}.`;
  const slot = item.slot;
  const old = pd.equipment[slot] || null;
  const extra = []; // objets supplémentaires à ranger dans le sac

  if (slot === 'pocket') {
    const used = pd.pocket.filter((x) => x).length;
    // Si la poche à équiper est elle-même dans la poche, elle libère une place.
    const selfInPocket = ref.c === 'pocket' ? 1 : 0;
    if (used - selfInPocket > item.secureSlots) return `Cette poche n’a que ${item.secureSlots} emplacement(s) : videz d’abord votre poche actuelle.`;
  }
  if (slot === 'weapon' && isTwoHanded(item) && pd.equipment.offhand) extra.push('offhand');
  if (slot === 'offhand' && isTwoHanded(pd.equipment.weapon)) extra.push('weapon');

  const inv = pd.inventory;
  const free = freeCount(inv) + (ref.c === 'inv' && !old ? 1 : 0);
  if (extra.length > free) return 'Inventaire plein.';

  setItem(pd, ref, old);
  pd.equipment[slot] = item;
  for (const s of extra) {
    const it = pd.equipment[s];
    pd.equipment[s] = null;
    addTo(inv, it);
  }
  if (slot === 'pocket') compactPocket(pd);
  return null;
}

// Range les objets de la poche dans les premiers emplacements disponibles.
export function compactPocket(pd) {
  const items = pd.pocket.filter((x) => x);
  for (let i = 0; i < POCKET_MAX; i++) pd.pocket[i] = items[i] || null;
}

export function unequip(pd, slot) {
  const item = pd.equipment[slot];
  if (!item) return null;
  if (slot === 'pocket' && pd.pocket.some((x) => x)) return 'Videz d’abord votre poche sécurisée.';
  const i = freeSlot(pd.inventory);
  if (i < 0) return 'Inventaire plein.';
  pd.inventory[i] = item;
  pd.equipment[slot] = null;
  return null;
}

export function moveToPocket(pd, invIdx) {
  const item = pd.inventory[invIdx];
  if (!item) return null;
  const size = pocketSize(pd);
  if (!size) return 'Aucune poche sécurisée équipée.';
  if (item.kind === 'consumable') {
    if (addTo(pd.pocket, item, size)) { pd.inventory[invIdx] = null; return null; }
    return 'Poche sécurisée pleine.';
  }
  const i = freeSlot(pd.pocket, size);
  if (i < 0) return 'Poche sécurisée pleine.';
  pd.pocket[i] = item;
  pd.inventory[invIdx] = null;
  return null;
}

export function moveFromPocket(pd, pIdx) {
  const item = pd.pocket[pIdx];
  if (!item) return null;
  if (!addTo(pd.inventory, item)) return 'Inventaire plein.';
  pd.pocket[pIdx] = null;
  return null;
}

export function moveBetween(pd, fromC, idx, toC) {
  const src = container(pd, fromC);
  const item = src[idx];
  if (!item) return null;
  const dst = container(pd, toC);
  const limit = toC === 'pocket' ? pocketSize(pd) : dst.length;
  if (!addTo(dst, item, limit)) return toC === 'stash' ? 'Coffre plein.' : 'Inventaire plein.';
  src[idx] = null;
  return null;
}

export function removeAt(pd, ref) {
  const it = getItem(pd, ref);
  setItem(pd, ref, null);
  return it;
}

export function sortInventory(pd) {
  const items = pd.inventory.filter((x) => x);
  items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'consumable' ? -1 : 1;
    if (a.kind === 'consumable') return a.id.localeCompare(b.id);
    return (b.rarity - a.rarity) || a.slot.localeCompare(b.slot) || (b.ilvl - a.ilvl);
  });
  for (let i = 0; i < pd.inventory.length; i++) pd.inventory[i] = items[i] || null;
}

export function describe(item) { return itemName(item); }
