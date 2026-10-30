// Déroulement des missions d'expédition (mise en place dans le donjon, suivi, récompense).
// Les fonctions reçoivent l'instance Game (g) ; la mission courante est dans g.scene.mission.
import { MISSIONS, championName, survivorName } from '../data/missions.js';
import { Enemy } from './enemy.js';
import { enemyPool } from '../data/enemies.js';
import { TILE, T } from './world.js';
import { dist, rand, randInt, pick, chance, weightedPick } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { makeConsumable, generateSetItem } from '../data/items.js';
import { setsForDepth } from '../data/sets.js';

// Case de sol libre dans une salle (null si aucune).
function floorIn(map, r, margin = 1) {
  for (let k = 0; k < 40; k++) {
    const x = randInt(r.x + margin, r.x + r.w - 1 - margin), y = randInt(r.y + margin, r.y + r.h - 1 - margin);
    if (map.get(x, y) === T.FLOOR) return { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
  }
  return { x: (r.x + r.w / 2) * TILE, y: (r.y + r.h / 2) * TILE };
}

export function setupMission(g, d, offer) {
  const s = g.scene;
  if (!offer) { s.mission = null; return; }
  const M = MISSIONS[offer.type];
  const rooms = d.roomOrder.map((i) => d.rooms[i]);
  const far = rooms.slice(Math.floor(rooms.length * 0.55));
  const mid = rooms.slice(Math.floor(rooms.length * 0.25));
  const m = { type: offer.type, def: M, step: 0, done: false, failed: false, progress: 0, total: 1 };
  s.mission = m;
  const map = s.map;
  switch (offer.type) {
    case 'chasse': {
      const r = pick(far.length ? far : rooms);
      const p = floorIn(map, r, 2);
      const type = pick(s.depth >= 2 ? ['squelette', 'acolyte', 'archer', 'squelette'] : ['squelette', 'archer', 'rat']);
      const e = new Enemy(type, p.x, p.y, s.level + 2, true);
      e.maxHp = e.hp = Math.round(e.maxHp * 3.2);
      e.dmg *= 1.25; e.r *= 1.12; e.xp *= 4;
      e.champion = championName();
      s.enemies.push(e);
      m.target = e;
      m.label = e.champion;
      break;
    }
    case 'sauvetage': {
      const r = pick(far.length ? far : rooms);
      const p = floorIn(map, r, 2);
      const lvl = s.level;
      m.survivor = { x: p.x, y: p.y, hp: 70 + lvl * 10, maxHp: 70 + lvl * 10, following: false, name: survivorName(), walkT: 0, dir: 2, moving: false };
      m.label = m.survivor.name;
      s.interactables.push({ type: 'survivor', x: p.x, y: p.y, r: 16, label: m.survivor.name, mission: true });
      // quelques gardes autour du captif
      for (let i = 0; i < 2 + Math.floor(s.depth / 2); i++) {
        const q = floorIn(map, r, 1);
        s.enemies.push(new Enemy(weightedPick(enemyPool(s.depth)), q.x, q.y, s.level, false));
      }
      break;
    }
    case 'cloches': {
      const pool = [...mid];
      m.bells = [];
      for (let i = 0; i < 3 && pool.length; i++) {
        const r = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        const p = floorIn(map, r, 2);
        const b = new Enemy('cloche', p.x, p.y, s.level, false);
        b.ringCd = rand(6, 14);
        s.enemies.push(b);
        m.bells.push(b);
        for (let k = 0; k < 2; k++) { const q = floorIn(map, r, 1); s.enemies.push(new Enemy('acolyte', q.x, q.y, s.level, false)); }
      }
      m.total = m.bells.length;
      break;
    }
    case 'reliquaire': {
      const r = rooms[rooms.length - 1] || rooms[0];
      const p = floorIn(map, r, 2);
      s.interactables.push({ type: 'reliquary', x: p.x, y: p.y, r: 18, label: 'Reliquaire scellé', mission: true });
      for (let i = 0; i < 3; i++) { const q = floorIn(map, r, 1); s.enemies.push(new Enemy(weightedPick(enemyPool(s.depth)), q.x, q.y, s.level, i === 0)); }
      break;
    }
    case 'balises': {
      const pool = [...rooms];
      m.total = Math.min(4, pool.length);
      for (let i = 0; i < m.total; i++) {
        const r = pool.splice(Math.floor((i / m.total) * pool.length + Math.random() * 1.5) % pool.length, 1)[0];
        const p = floorIn(map, r, 2);
        s.interactables.push({ type: 'beacon', x: p.x, y: p.y, r: 18, label: 'Brasero des veilleurs', lit: false, mission: true });
      }
      break;
    }
    case 'siege': {
      const r = mid[Math.floor(mid.length / 2)] || rooms[0];
      const p = { x: (r.x + r.w / 2) * TILE, y: (r.y + r.h / 2) * TILE };
      s.interactables.push({ type: 'seal', x: p.x, y: p.y, r: 22, label: 'Sceau brisé', mission: true });
      m.seal = { x: p.x, y: p.y, r: 150, t: 0, dur: 60, active: false, waveT: 0 };
      break;
    }
  }
}

// Texte de suivi (HUD).
export function missionStatus(g) {
  const m = g.scene && g.scene.mission;
  if (!m) return null;
  const M = m.def;
  let line;
  if (m.failed) line = 'Échouée';
  else if (m.done) line = 'Accomplie — remontez vivant pour être payé';
  else switch (m.type) {
    case 'chasse': line = `Abattre ${m.label}`; break;
    case 'sauvetage': line = m.survivor.following ? `Escorter ${m.survivor.name} (${Math.ceil(m.survivor.hp)} PV)` : `Trouver ${m.survivor.name}`; break;
    case 'cloches': line = `Cloches détruites : ${m.progress} / ${m.total}`; break;
    case 'reliquaire': line = g.player.carrying ? 'Rapporter le reliquaire à la surface' : 'Trouver le reliquaire (salle la plus lointaine)'; break;
    case 'balises': line = `Braseros rallumés : ${m.progress} / ${m.total}`; break;
    case 'siege': line = m.seal.active ? `Tenir le cercle : ${Math.ceil(m.seal.dur - m.seal.t)} s` : 'Trouver et activer le sceau'; break;
  }
  return { name: M.name, line, done: m.done, failed: m.failed };
}

function complete(g, msg) {
  const m = g.scene.mission;
  if (m.done || m.failed) return;
  m.done = true;
  sfx('quest');
  g.ui.banner('Mission accomplie', 'gold');
  g.ui.toast(msg || 'Mission accomplie. Remontez vivant pour toucher la récompense.', 'good', 5);
  g.ui.refreshTracker();
}

function fail(g, msg) {
  const m = g.scene.mission;
  if (m.done || m.failed) return;
  m.failed = true;
  sfx('error');
  g.ui.toast(msg, 'bad', 5);
  g.ui.refreshTracker();
}

export function missionOnKill(g, e) {
  const m = g.scene.mission;
  if (!m || m.done || m.failed) return;
  if (m.type === 'chasse' && e === m.target) complete(g, `${m.label} est tombé. Remontez vivant.`);
  if (m.type === 'cloches' && e.type === 'cloche') {
    m.progress = m.bells.filter((b) => b.dead).length;
    sfx('bell', { x: e.x, y: e.y, vol: 0.8 });
    if (m.progress >= m.total) complete(g, 'Les cloches se taisent. Remontez vivant.');
    else g.ui.toast(`Cloche détruite (${m.progress} / ${m.total}).`, 'good', 2);
  }
}

// Interactions propres aux missions. Renvoie true si l'objet a été géré.
export function missionInteract(g, o) {
  const s = g.scene, m = s.mission, p = g.player;
  if (!m) return false;
  switch (o.type) {
    case 'survivor':
      m.survivor.following = true;
      s.interactables.splice(s.interactables.indexOf(o), 1);
      g.ui.subtitle('Vous… vous êtes réel ? Sortez-moi d’ici, je vous en prie.', m.survivor.name);
      sfx('ui');
      return true;
    case 'reliquary':
      g.startChannel(3, 'Vous descellez le reliquaire…', () => {
        s.interactables.splice(s.interactables.indexOf(o), 1);
        p.carrying = 'reliquaire';
        g.ui.toast('Vous portez le reliquaire : pas de roulade, vitesse réduite. Remontez !', 'good', 5);
        sfx('chest');
        m.step = 1;
      });
      return true;
    case 'beacon':
      if (o.lit) return true;
      g.startChannel(2.5, 'Vous rallumez le brasero…', () => {
        o.lit = true;
        s.braziers.push({ x: o.x, y: o.y - 6 });
        m.progress++;
        p.heal(p.maxHp * 0.15);
        s.map.reveal(o.x, o.y, 30);
        sfx('portal', { x: o.x, y: o.y });
        g.fx.pillar(o.x, o.y, '#e0a050');
        if (m.progress >= m.total) complete(g, 'Les quatre feux brûlent de nouveau. Remontez vivant.');
        else g.ui.toast(`Brasero rallumé (${m.progress} / ${m.total}).`, 'good', 2);
      });
      return true;
    case 'seal':
      if (m.seal.active || m.done) return true;
      m.seal.active = true;
      s.interactables.splice(s.interactables.indexOf(o), 1);
      g.ui.toast('Tenez le cercle pendant 60 secondes !', 'good', 3);
      sfx('bossRoar');
      return true;
  }
  return false;
}

export function updateMission(g, dt) {
  const s = g.scene, m = s.mission, p = g.player;
  if (!m || m.failed) return;
  // Cloches : elles sonnent et appellent des acolytes tant qu'elles tiennent debout
  if (m.type === 'cloches' && !m.done) {
    for (const b of m.bells) {
      if (b.dead) continue;
      b.ringCd -= dt;
      if (b.ringCd <= 0) {
        b.ringCd = rand(16, 24);
        b.ringT = 1;
        if (dist(b.x, b.y, p.x, p.y) < 700) {
          sfx('bell', { x: b.x, y: b.y, vol: 0.6 });
          const a = rand(0, 6.28);
          const e = new Enemy('acolyte', b.x + Math.cos(a) * 40, b.y + Math.sin(a) * 40, s.level, false);
          e.spawnT = 0.7; e.state = 'chase';
          s.enemies.push(e);
        }
      }
    }
  }
  // Survivant : suit le joueur, souffre au contact des monstres
  if (m.type === 'sauvetage' && m.survivor.following && !m.done) {
    const v = m.survivor;
    const d = dist(v.x, v.y, p.x, p.y);
    v.moving = false;
    if (d > 46) {
      const sp = Math.min(d - 40, 205 * dt);
      const a = Math.atan2(p.y - v.y, p.x - v.x);
      const ox = v.x, oy = v.y;
      v.x += Math.cos(a) * sp; v.y += Math.sin(a) * sp;
      if (s.map.collides(v.x, v.y, 9)) { v.x = ox; v.y = oy; if (d > 260) { v.x = p.x - Math.cos(a) * 30; v.y = p.y - Math.sin(a) * 30; } }
      v.moving = true; v.walkT += dt * 9;
      v.dir = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 3 : 1) : (Math.sin(a) > 0 ? 2 : 0);
    }
    for (const e of s.enemies) {
      if (e.dead || e.def.ai === 'static' || e.spawnT > 0) continue;
      if (dist(e.x, e.y, v.x, v.y) < e.r + 16) { v.hp -= e.dmg * 0.55 * dt; v.hurtT = 0.2; }
    }
    if (v.hurtT > 0) v.hurtT -= dt;
    if (v.hp <= 0) { v.hp = 0; fail(g, `${v.name} est mort. Mission échouée.`); }
  }
  // Sceau : tenir le cercle, des vagues arrivent
  if (m.type === 'siege' && m.seal.active && !m.done) {
    const z = m.seal;
    const inside = dist(p.x, p.y, z.x, z.y) < z.r;
    if (inside) z.t += dt;
    else if (!z.warnT || z.warnT <= 0) { g.ui.toast('Revenez dans le cercle : le temps est suspendu.', 'bad', 1.5); z.warnT = 2; }
    if (z.warnT > 0) z.warnT -= dt;
    z.waveT -= dt;
    if (z.waveT <= 0) {
      z.waveT = 11;
      const n = 3 + s.depth;
      for (let i = 0; i < n; i++) {
        const a = rand(0, 6.28), rr = z.r + rand(90, 170);
        const x = z.x + Math.cos(a) * rr, y = z.y + Math.sin(a) * rr;
        if (s.map.collides(x, y, 14)) continue;
        const e = new Enemy(weightedPick(enemyPool(s.depth)), x, y, s.level, chance(0.08));
        e.spawnT = 0.7; e.state = 'chase';
        s.enemies.push(e);
      }
      sfx('alert');
    }
    if (z.t >= z.dur) {
      complete(g, 'Le sceau tient. Remontez vivant.');
      g.dropItem(z.x, z.y, g.loot({ ilvl: s.level + 2, rarityBonus: 2, minRarity: 2 }));
      g.dropItem(z.x, z.y, makeConsumable('bronze', randInt(1, 3)));
    }
  }
  // Reliquaire : la mission est « accomplie » quand on remonte avec (vérifié à l'extraction)
}

// Vérifications à l'extraction : renvoie la récompense (ou null).
export function missionReward(g, viaBoss) {
  const s = g.scene, m = s.mission, p = g.player, pd = g.pd;
  if (!m) return null;
  if (m.type === 'reliquaire' && p.carrying === 'reliquaire') m.done = true;
  if (m.type === 'sauvetage' && m.survivor.following && !m.failed && dist(m.survivor.x, m.survivor.y, p.x, p.y) < 260) m.done = true;
  if (!m.done || m.failed) return { failed: true, name: m.def.name };
  const bonus = 1 + (s.bonus || 0) / 100;
  const D = s.depth;
  const R = {
    name: m.def.name,
    sceaux: m.def.sceaux + ((s.bonus || 0) >= 50 ? 1 : 0),
    gold: Math.round((80 + D * 60) * bonus),
    xp: Math.round((120 + D * D * 90) * bonus),
    mats: [],
    item: null,
  };
  R.mats.push({ id: 'fer', qty: randInt(3, 6) });
  if (D >= 2) R.mats.push({ id: 'bronze', qty: randInt(1, 3) });
  if (D >= 3 && chance(0.6)) R.mats.push({ id: 'braise', qty: 1 });
  if (D >= 4 && chance(0.35 * bonus)) R.mats.push({ id: 'larme', qty: 1 });
  if (chance(0.35 * bonus)) R.item = generateSetItem(pick(setsForDepth(D)), null, pd.level);
  return R;
}
