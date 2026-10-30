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
      e.champion = offer.who || championName();
      s.enemies.push(e);
      m.target = e;
      m.label = e.champion;
      break;
    }
    case 'sauvetage': {
      const r = pick(far.length ? far : rooms);
      const p = floorIn(map, r, 2);
      const lvl = s.level;
      m.survivor = { x: p.x, y: p.y, hp: 70 + lvl * 10, maxHp: 70 + lvl * 10, following: false, name: offer.who || survivorName(), walkT: 0, dir: 2, moving: false };
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
    case 'ossements': {
      const pool = [...rooms.slice(1)];
      m.total = Math.min(5, pool.length);
      for (let i = 0; i < m.total; i++) {
        const r = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        const p = floorIn(map, r, 1);
        s.interactables.push({ type: 'relicbone', x: p.x, y: p.y, r: 16, label: 'Ossement sacré', mission: true });
      }
      break;
    }
    case 'nids': {
      const pool = [...mid];
      m.nests = [];
      for (let i = 0; i < 3 && pool.length; i++) {
        const r = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        const p = floorIn(map, r, 2);
        const n = new Enemy('nid', p.x, p.y, s.level, false);
        n.spawnCd = rand(2, 5);
        s.enemies.push(n); m.nests.push(n);
        for (let k = 0; k < 3; k++) { const q = floorIn(map, r, 1); s.enemies.push(new Enemy('rat', q.x, q.y, s.level, false)); }
      }
      m.total = m.nests.length;
      break;
    }
    case 'gardien': {
      m.timer = 480 + s.depth * 60; // il faut d'abord la clé (tous les ennemis)
      m.total = 1;
      break;
    }
    case 'pillage': {
      const pool = [...far.length >= 3 ? far : rooms];
      m.total = Math.min(3, pool.length);
      for (let i = 0; i < m.total; i++) {
        const r = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        const p = floorIn(map, r, 2);
        s.interactables.push({ type: 'coffer', x: p.x, y: p.y, r: 18, label: 'Coffre scellé', mission: true });
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
  else if (m.done) line = 'Accomplie';
  else switch (m.type) {
    case 'chasse': line = `Abattre ${m.label}`; break;
    case 'sauvetage': line = m.survivor.following ? `Escorter ${m.survivor.name} (${Math.ceil(m.survivor.hp)} PV)` : `Trouver ${m.survivor.name}`; break;
    case 'cloches': line = `Cloches détruites : ${m.progress} / ${m.total}`; break;
    case 'reliquaire': line = g.player.carrying ? 'Rapporter le reliquaire' : 'Trouver le reliquaire'; break;
    case 'balises': line = `Braseros rallumés : ${m.progress} / ${m.total}`; break;
    case 'ossements': line = `Ossements : ${m.progress} / ${m.total}`; break;
    case 'nids': line = `Nids détruits : ${m.progress} / ${m.total}`; break;
    case 'gardien': line = `Le Gardien · ${Math.floor(m.timer / 60)}:${String(Math.floor(m.timer % 60)).padStart(2, '0')}`; break;
    case 'pillage': line = `Coffres : ${m.progress} / ${m.total}`; break;
    case 'siege': line = m.seal.active ? `Tenir le cercle : ${Math.ceil(m.seal.dur - m.seal.t)} s` : 'Trouver et activer le sceau'; break;
  }
  return { name: M.name, line, done: m.done, failed: m.failed };
}

function complete(g, msg) {
  const m = g.scene.mission;
  if (m.done || m.failed) return;
  m.done = true;
  sfx('quest');
  g.ui.banner('Secondaire accomplie', 'gold');
  if (msg) g.ui.toast(msg, 'good', 4);
  payMission(g);
  g.ui.refreshTracker();
}

// Récompense versée tout de suite : Sceaux (perdus si l'on meurt avant de remonter), or ramassé, XP, butin au sol.
function payMission(g) {
  const s = g.scene, m = s.mission, p = g.player, pd = g.pd;
  if (!m || m.paid) return;
  m.paid = true;
  const R = missionReward(g);
  if (!R || R.failed) return;
  if (g.run) g.run.sceaux = (g.run.sceaux || 0) + R.sceaux;
  pd.runGold = (pd.runGold || 0) + R.gold;
  pd.stats.missions = (pd.stats.missions || 0) + 1;
  g.questEvent('mission', { mtype: R.type });
  g.addXp(R.xp, p.x, p.y);
  for (const mt of R.mats) g.dropItem(p.x, p.y, makeConsumable(mt.id, mt.qty));
  if (R.item) g.dropItem(p.x, p.y, R.item);
  g.fx.text(p.x, p.y - 44, `+${R.sceaux} Sceaux`, '#e0ae6a', 15, { bold: true });
}

// En quittant l'étage (portail ou téléporteur) : le reliquaire et le survivant comptent s'ils sont avec vous.
export function finishFloorMission(g) {
  const s = g.scene, m = s && s.mission, p = g.player;
  if (!m || m.done || m.failed) return;
  if (m.type === 'reliquaire' && p.carrying === 'reliquaire') complete(g, 'Le reliquaire est sauf.');
  else if (m.type === 'sauvetage' && m.survivor.following && dist(m.survivor.x, m.survivor.y, p.x, p.y) < 260) complete(g, `${m.survivor.name} est sauf.`);
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
  if (m.type === 'chasse' && e === m.target) complete(g, `${m.label} est tombé.`);
  if (m.type === 'gardien' && e.boss) complete(g, 'Le Gardien est tombé à temps.');
  if (m.type === 'nids' && e.type === 'nid') {
    m.progress = m.nests.filter((b) => b.dead).length;
    if (m.progress >= m.total) complete(g, 'Les nids brûlent.');
    else g.ui.toast(`Nid détruit (${m.progress} / ${m.total}).`, 'good', 2);
  }
  if (m.type === 'cloches' && e.type === 'cloche') {
    m.progress = m.bells.filter((b) => b.dead).length;
    sfx('bell', { x: e.x, y: e.y, vol: 0.8 });
    if (m.progress >= m.total) complete(g, 'Les cloches se taisent.');
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
        g.ui.toast('Reliquaire en main. Remontez.', 'good', 5);
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
        if (m.progress >= m.total) complete(g, 'Les quatre feux brûlent de nouveau.');
        else g.ui.toast(`Brasero rallumé (${m.progress} / ${m.total}).`, 'good', 2);
      });
      return true;
    case 'relicbone': {
      s.interactables.splice(s.interactables.indexOf(o), 1);
      m.progress++;
      sfx('page');
      g.fx.pillar(o.x, o.y, '#e0d8b0');
      // les morts n'aiment pas qu'on touche à leurs saints
      for (let i = 0; i < 1 + Math.floor(s.depth / 2); i++) { const a = rand(0, 6.28); g.spawnEnemy(chance(0.5) ? 'squelette' : 'rat', o.x + Math.cos(a) * 90, o.y + Math.sin(a) * 90, s.level, false, true); }
      if (m.progress >= m.total) complete(g, 'Les cinq ossements sont réunis.');
      else g.ui.toast(`Ossement (${m.progress} / ${m.total}).`, 'good', 2);
      return true;
    }
    case 'coffer':
      g.startChannel(2, 'Vous forcez le sceau…', () => {
        s.interactables.splice(s.interactables.indexOf(o), 1);
        m.progress++;
        sfx('chest');
        g.dropItem(o.x, o.y, g.loot({ ilvl: s.level + 1, rarityBonus: 2, minRarity: 1 }));
        g.dropGold(o.x, o.y, Math.round(40 * s.depth * (1 + (s.bonus || 0) / 100)));
        // embuscade
        const n = 3 + s.depth;
        for (let i = 0; i < n; i++) { const a = (i / n) * 6.28; g.spawnEnemy(weightedPick(enemyPool(s.depth)), o.x + Math.cos(a) * 120, o.y + Math.sin(a) * 120, s.level, i === 0, true); }
        g.ui.banner('Embuscade', 'blood');
        if (m.progress >= m.total) complete(g, 'Les trois coffres sont ouverts.');
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
  // Nids : ils pondent des goules quand on approche
  if (m.type === 'nids' && !m.done) {
    for (const n of m.nests) {
      if (n.dead) continue;
      n.spawnCd -= dt;
      if (n.spawnCd <= 0) {
        n.spawnCd = rand(5, 7);
        n.ringT = 1;
        if (dist(n.x, n.y, p.x, p.y) < 520 && s.enemies.length < 140) {
          for (let k = 0; k < 2; k++) { const a = rand(0, 6.28); g.spawnEnemy('rat', n.x + Math.cos(a) * 34, n.y + Math.sin(a) * 34, s.level, false, true); }
          sfx('ghoul', { x: n.x, y: n.y, vol: 0.5 });
        }
      }
    }
  }
  // Cierge : le temps presse
  if (m.type === 'gardien' && !m.done) {
    m.timer -= dt;
    if (m.timer <= 0) { m.timer = 0; fail(g, 'Le cierge s’est éteint.'); }
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
      complete(g, 'Le sceau tient.');
      g.dropItem(z.x, z.y, g.loot({ ilvl: s.level + 2, rarityBonus: 2, minRarity: 2 }));
      g.dropItem(z.x, z.y, makeConsumable('bronze', randInt(1, 3)));
    }
  }
  // Reliquaire : la mission est « accomplie » quand on remonte avec (vérifié à l'extraction)
}

// Vérifications à l'extraction : renvoie la récompense (ou null).
export function missionReward(g) {
  const s = g.scene, m = s.mission, p = g.player, pd = g.pd;
  if (!m) return null;
  if (!m.done || m.failed) return { failed: true, name: m.def.name };
  const bonus = 1 + (s.bonus || 0) / 100;
  const D = s.depth;
  const R = {
    type: m.type,
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

// Grille du boss : la clé, puis la grille ; s'il reste peu d'ennemis, le plus proche.
export function gateTarget(g) {
  const s = g.scene, G = s.gate, p = g.player;
  if (!G || G.open) return null;
  if (G.key) return { x: G.key.x, y: G.key.y - 12, label: 'Clé' };
  if (G.hasKey) {
    let best = null, bd = Infinity;
    for (const c of G.cells) { const x = (c.x + 0.5) * TILE, y = (c.y + 0.5) * TILE, d = dist(x, y, p.x, p.y); if (d < bd) { bd = d; best = { x, y: y - 10, label: 'Grille' }; } }
    return best;
  }
  const left = g.gateRemaining();
  if (left > 0 && left <= 6) {
    let best = null, bd = Infinity;
    for (const e of s.enemies) { if (e.dead || e.boss || e.gated) continue; const d = dist(e.x, e.y, p.x, p.y); if (d < bd) { bd = d; best = e; } }
    if (best) return { x: best.x, y: best.y - 20, label: `Ennemi (${left})` };
  }
  return null;
}

// Où aller pour faire avancer la mission (indicateur à l'écran). null = rien à montrer.
export function missionTarget(g) {
  const s = g.scene, p = g.player, pd = g.pd;
  if (!s || !p) return null;
  const nearest = (list) => {
    let best = null, bd = Infinity;
    for (const o of list) { const d = dist(o.x, o.y, p.x, p.y); if (d < bd) { bd = d; best = o; } }
    return best;
  };
  if (s.type === 'village') {
    const mq = pd.mquest;
    if (!mq) return null;
    const st = pd.quests[mq.id];
    const npcs = s.interactables.filter((o) => o.type === 'npc');
    const o = st && st.status === 'active' ? npcs.find((n) => n.npc.portal) : npcs.find((n) => n.id === mq.giver);
    return o ? { npc: true, x: o.x, y: o.y - 52, label: st && st.status === 'active' ? 'Portail' : o.label } : null;
  }
  const m = s.mission;
  if (!m || m.failed) return gateTarget(g);
  if (m.type === 'gardien' && !m.done) { const gt = gateTarget(g); if (gt) return gt; }
  const exitT = () => {
    const ex = nearest(s.interactables.filter((o) => o.type === 'teleporter' || o.type === 'descendPortal'));
    return ex ? { x: ex.x, y: ex.y, label: ex.type === 'teleporter' ? 'Téléporteur' : 'Descente' } : gateTarget(g);
  };
  if (m.done) return gateTarget(g) || exitT();
  if (p.carrying || (m.type === 'sauvetage' && m.survivor.following)) return exitT();
  switch (m.type) {
    case 'chasse': return m.target && !m.target.dead ? { x: m.target.x, y: m.target.y - 20, label: m.label } : null;
    case 'sauvetage': return { x: m.survivor.x, y: m.survivor.y - 20, label: m.survivor.name };
    case 'cloches': { const b = nearest(m.bells.filter((e) => !e.dead)); return b ? { x: b.x, y: b.y - 24, label: 'Cloche' } : null; }
    case 'reliquaire': { const o = s.interactables.find((i) => i.type === 'reliquary'); return o ? { x: o.x, y: o.y - 16, label: 'Reliquaire' } : null; }
    case 'balises': { const o = nearest(s.interactables.filter((i) => i.type === 'beacon' && !i.lit)); return o ? { x: o.x, y: o.y - 16, label: 'Brasero' } : null; }
    case 'ossements': { const o = nearest(s.interactables.filter((i) => i.type === 'relicbone')); return o ? { x: o.x, y: o.y - 14, label: 'Ossement' } : null; }
    case 'nids': { const b = nearest(m.nests.filter((e) => !e.dead)); return b ? { x: b.x, y: b.y - 20, label: 'Nid' } : null; }
    case 'gardien': return s.boss && !s.boss.dead ? { x: s.boss.x, y: s.boss.y - 30, label: 'Gardien' } : null;
    case 'pillage': { const o = nearest(s.interactables.filter((i) => i.type === 'coffer')); return o ? { x: o.x, y: o.y - 16, label: 'Coffre' } : null; }
    case 'siege': return m.seal.active ? null : { x: m.seal.x, y: m.seal.y, label: 'Sceau' };
  }
  return null;
}
