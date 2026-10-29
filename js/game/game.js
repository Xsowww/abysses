// Cœur du jeu : scènes (village / donjon), combat, loot, quêtes, mort et extraction.
import { input } from '../core/input.js';
import { sfx, setListener, setReverb, setSurface } from '../core/audio.js';
import { playMusic, playAmbience } from '../core/music.js';
import { saveGame } from '../core/save.js';
import { rand, randInt, dist, angleDiff, TAU, chance, clamp, pick } from '../core/util.js';
import { TILE } from './world.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Effects } from './effects.js';
import { buildVillage } from './village.js';
import { generateDungeon } from './dungeon.js';
import { Renderer } from './render.js';
import * as Inv from './inventory.js';
import { CLASSES, SKILLS, SPEC_LEVEL, xpForLevel } from '../data/classes.js';
import { ENEMIES, enemyLevel } from '../data/enemies.js';
import { generateItem, generateSetItem, makeConsumable, starterKit, itemClass, itemName, itemColor, RARITIES, CONSUMABLES, POCKETS, buyPrice, sellValue } from '../data/items.js';
import { QUESTS, NPCS, questDef, allQuests } from '../data/quests.js';
import { dirFromAngle } from './sprites.js';
import { SETS, setsForDepth, equippedSetCounts } from '../data/sets.js';
import { refillContracts } from '../data/contracts.js';
import { LORE, LORE_BY_ID, guardianFor, EPILOGUE_ACT1 } from '../data/story.js';

export const DUNGEON_NAME = 'La Crypte Oubliée';

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.fx = new Effects();
    this.player = new Player(this);
    this.renderer = new Renderer(canvas);
    this.pd = null;
    this.scene = null;
    this.cam = { x: 0, y: 0 };
    this.time = 0;
    this.running = false;
    this.hover = null;
    this.invFullWarn = 0;
    this.saveTimer = 0;
    this.slowT = 0;
    this.slowScale = 1;
    this.zoomMul = 1;
    this.zoomTarget = 1;
    this.camFocus = null;
  }

  // ---------------- PARTIE ----------------
  newGame(name, cls) {
    const kit = starterKit(cls);
    this.pd = {
      version: 1,
      name: name || 'Aventurier',
      cls,
      level: 1,
      xp: 0,
      gold: 50,
      runGold: 0,
      equipment: { head: null, amulet: null, chest: kit.chest, hands: null, legs: null, ring: null, feet: null, weapon: kit.weapon, offhand: kit.offhand, pocket: kit.pocket },
      inventory: new Array(Inv.INV_SIZE).fill(null),
      pocket: new Array(Inv.POCKET_MAX).fill(null),
      stash: new Array(Inv.STASH_SIZE).fill(null),
      talents: {},
      spec: null,
      skillBar: [null, null, null, null],
      quests: {},
      maxDepth: 1,
      bossKills: {},
      shop: null,
      shopDirty: true,
      inRun: false,
      stats: { kills: 0, deaths: 0, extractions: 0, runs: 0 },
      playTime: 0,
      story: { lore: [], epilogue: false },
    };
    Inv.addItem(this.pd, makeConsumable('potion', 3));
    Inv.addItem(this.pd, makeConsumable('pierre', 1));
    this.start();
  }

  load(data) {
    this.pd = data;
    // Compatibilité / sécurité
    const pd = this.pd;
    pd.pocket = pd.pocket || new Array(Inv.POCKET_MAX).fill(null);
    pd.stash = pd.stash || new Array(Inv.STASH_SIZE).fill(null);
    pd.bossKills = pd.bossKills || {};
    pd.stats = pd.stats || { kills: 0, deaths: 0, extractions: 0, runs: 0 };
    pd.story = pd.story || { lore: [], epilogue: false };
    let penalty = null;
    if (pd.inRun) penalty = this.applyDeathPenalty();
    this.start();
    if (penalty) this.ui.toast('Vous avez quitté le jeu pendant une expédition : le butin non sécurisé est perdu.', 'bad', 6);
  }

  start() {
    this.player.recalc();
    this.player.hp = this.player.maxHp;
    this.player.stamina = this.player.maxStamina;
    this.running = true;
    this.enterVillage();
  }

  save() {
    if (!this.pd) return;
    saveGame(this.pd);
  }

  // ---------------- SCÈNES ----------------
  baseScene(type) {
    return { type, enemies: [], projectiles: [], telegraphs: [], drops: [], traps: [], zones: [], interactables: [], torches: [], braziers: [], decor: [], houses: [], flowTimer: 0, boss: null, bossEngaged: false, depth: 0 };
  }

  enterVillage() {
    const v = buildVillage();
    const s = this.baseScene('village');
    s.map = v.map;
    s.houses = v.houses;
    s.braziers = v.braziers;
    s.ground = v.ground;
    s.wanderers = (v.wanderers || []).map((w, i) => ({ ...w, x: w.path[0][0], y: w.path[0][1], i: 1, wait: i * 0.7, walkT: 0, dir: 2, moving: false, barkCd: 2 + i, bark: null, barkT: 0 }));
    s.props = v.props;
    s.fences = v.fences;
    s.flowers = v.flowers;
    s.interactables = [
      ...v.interactables,
      ...v.npcs.map((n) => ({ type: 'npc', id: n.id, x: n.x, y: n.y, r: 14, label: NPCS[n.id].name, npc: NPCS[n.id], face: Math.PI / 2 })),
    ];
    s.map.explored.fill(1);
    this.scene = s;
    this.fx.clear();
    const p = this.player;
    p.resetCombat();
    p.x = v.spawn.x;
    p.y = v.spawn.y;
    p.recalc();
    p.hp = p.maxHp;
    p.stamina = p.maxStamina;
    this.renderer.buildCache(s);
    this.snapCamera();
    if (this.pd.shopDirty || !this.pd.shop) this.refreshShop();
    refillContracts(this.pd);
    this.syncQuests();
    this.ui.onSceneChange();
    this.ui.areaTitle('Cendrebourg', 'Dernier refuge avant l’Abîme');
    playMusic('village');
    playAmbience('village');
    setReverb('village');
    setSurface('dirt');
    this.save();
  }

  enterDungeon(depth) {
    const d = generateDungeon(depth);
    const s = this.baseScene('dungeon');
    s.depth = depth;
    this.pd.deepest = Math.max(this.pd.deepest || 1, depth);
    s.map = d.map;
    s.torches = d.torches;
    s.decor = d.decor;
    s.props = d.props;
    s.wallDecor = d.wallDecor;
    s.bossRoom = d.bossRoom;
    s.runStats = { kills: 0, xp: 0, items: 0, startTime: this.time };
    const lvl = enemyLevel(depth);
    s.level = lvl;
    for (const sp of d.spawns) s.enemies.push(new Enemy(sp.type, sp.x, sp.y, lvl, sp.elite));
    const boss = new Enemy('gardien', d.bossPos.x, d.bossPos.y, lvl + 1, false);
    boss.guardian = guardianFor(depth);
    s.enemies.push(boss);
    s.boss = boss;
    for (const e of d.extractions) s.interactables.push({ type: 'extract', x: e.x, y: e.y, r: 22, label: 'Cercle d’extraction' });
    for (const ins of d.inscriptions || []) s.interactables.push({ type: 'inscription', x: ins.x, y: ins.y, r: 14, label: 'Inscription', text: ins.text });
    for (const c of d.chests) s.interactables.push({ type: 'chest', x: c.x, y: c.y, r: 14, label: c.rich ? 'Coffre orné' : 'Coffre', rich: c.rich, opened: false });
    this.scene = s;
    this.fx.clear();
    const p = this.player;
    p.resetCombat();
    p.x = d.start.x;
    p.y = d.start.y;
    p.recalc();
    p.hp = p.maxHp;
    p.stamina = p.maxStamina;
    this.renderer.buildCache(s);
    this.snapCamera();
    this.pd.inRun = true;
    this.pd.runGold = 0;
    this.pd.stats.runs++;
    this.questEvent('depth', { depth });
    this.save();
    this.ui.onSceneChange();
    this.ui.areaTitle(DUNGEON_NAME, `Profondeur ${depth}`);
    sfx('portal');
    playMusic('dungeon', depth);
    playAmbience('dungeon');
    setReverb('dungeon');
    setSurface('stone');
    setTimeout(() => sfx('bell', { vol: 0.6 }), 1800);
  }

  // ---------------- BOUCLE ----------------
  mouseWorld() {
    const z = this.renderer.zoom;
    return { x: this.cam.x + input.mouse.x / z, y: this.cam.y + input.mouse.y / z };
  }

  snapCamera() {
    this.camV = { x: 0, y: 0 };
    const z = this.renderer.zoom;
    this.cam.x = this.player.x - this.renderer.w / z / 2;
    this.cam.y = this.player.y - this.renderer.h / z / 2;
  }

  // Ralenti (moments forts) : scale < 1 pendant `real` secondes réelles.
  slowmo(real, scale) { this.slowT = Math.max(this.slowT, real); this.slowScale = scale; }

  update(dt) {
    if (!this.running || !this.scene) return;
    if (this.hitstopT > 0) { this.hitstopT -= dt; return; }
    if (this.slowT > 0) { this.slowT -= dt; dt *= this.slowScale; }
    // Zoom de mise en scène
    this.zoomMul += (this.zoomTarget - this.zoomMul) * Math.min(1, dt * 3);
    this.renderer.zoom = this.renderer.baseZoom * this.zoomMul;
    this.time += dt;
    this.pd.playTime += dt;
    const s = this.scene;
    const p = this.player;

    p.update(dt);

    if (!p.dead && input.wasPressed('potion') && !this.ui.blocksInput()) this.usePotion();
    if (!p.dead && input.wasPressed('stone') && !this.ui.blocksInput()) this.useStone();

    // Canalisation (extraction, pierre de retour)
    if (p.channel) {
      p.channel.t += dt;
      if (p.channel.t >= p.channel.dur) {
        const c = p.channel;
        p.channel = null;
        c.onDone();
        return;
      }
    }

    if (s.type === 'dungeon') {
      s.flowTimer -= dt;
      if (s.flowTimer <= 0) { s.flowTimer = 0.25; s.map.computeFlow(p.x, p.y, 45); }
      s.map.reveal(p.x, p.y, 8);

      for (const e of s.enemies) {
        // Les monstres très loin et endormis ne sont pas mis à jour.
        if (e.state === 'idle' && !e.boss && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) > 900) continue;
        e.update(dt, this);
      }
      this.separateEnemies();
      this.updateTelegraphs(dt);
      this.updateProjectiles(dt);
      this.updateTraps(dt);
      this.updateZones(dt);
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (e.dead && (e.deadT -= dt) < 0) s.enemies.splice(i, 1);
      }
    }

    this.updateDrops(dt);
    this.fx.update(dt);
    this.updateHover();

    if (!p.dead && input.wasPressed('interact') && this.hover && !this.ui.blocksInput()) this.interact(this.hover);

    setListener(p.x, p.y);
    // Caméra (peut être attirée vers un point d'intérêt : boss, etc.)
    const z = this.renderer.zoom;
    let fx0 = p.x, fy0 = p.y;
    if (this.camFocus) {
      this.camFocus.t -= dt;
      const k2 = this.camFocus.w;
      fx0 = p.x + (this.camFocus.x - p.x) * k2;
      fy0 = p.y + (this.camFocus.y - p.y) * k2;
      if (this.camFocus.t <= 0) { this.camFocus = null; this.zoomTarget = 1; }
    }
    // Anticipation : la caméra regarde un peu vers la visée et dans le sens de la marche.
    if (!this.camFocus && !p.dead) {
      fx0 += Math.cos(p.aim || 0) * 55 + (p.vx || 0) * 0.18;
      fy0 += Math.sin(p.aim || 0) * 40 + (p.vy || 0) * 0.18;
    }
    let tx = fx0 - this.renderer.w / z / 2;
    let ty = fy0 - this.renderer.h / z / 2;
    if (s.type === 'village') {
      // Le village ne montre jamais le vide au-delà de la lisière
      const mw = s.map.w * TILE - this.renderer.w / z, mh = s.map.h * TILE - this.renderer.h / z;
      if (mw > 0) tx = clamp(tx, 0, mw);
      if (mh > 0) ty = clamp(ty, 0, mh);
    }
    // Ressort amorti (pas d'à-coups)
    this.camV = this.camV || { x: 0, y: 0 };
    const kS = 28, kD = 2 * Math.sqrt(kS);
    this.camV.x += ((tx - this.cam.x) * kS - this.camV.x * kD) * dt;
    this.camV.y += ((ty - this.cam.y) * kS - this.camV.y * kD) * dt;
    this.cam.x += this.camV.x * dt;
    this.cam.y += this.camV.y * dt;

    this.invFullWarn -= dt;
    if (s.type === 'village') {
      this.saveTimer -= dt;
      if (this.saveTimer <= 0) { this.saveTimer = 15; this.save(); }
      this.updateWanderers(dt);
    }
  }

  // Villageois qui marchent d'un point à l'autre et murmurent quand on passe près d'eux.
  updateWanderers(dt) {
    const p = this.player;
    for (const w of this.scene.wanderers || []) {
      w.barkCd -= dt;
      if (w.barkT > 0) w.barkT -= dt;
      const near = dist(w.x, w.y, p.x, p.y) < 70;
      if (near) {
        w.dir = dirFromAngle(Math.atan2(p.y - w.y, p.x - w.x));
        w.moving = false;
        if (w.barkCd <= 0) { w.bark = pick(w.barks); w.barkT = 4; w.barkCd = 9 + Math.random() * 6; }
        continue;
      }
      if (w.wait > 0) { w.wait -= dt; w.moving = false; continue; }
      const [tx, ty] = w.path[w.i];
      const dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy);
      if (d < 3) { w.i = (w.i + 1) % w.path.length; w.wait = 0.8 + Math.random() * 2.5; w.moving = false; continue; }
      const st = Math.min(d, w.speed * dt);
      w.x += (dx / d) * st; w.y += (dy / d) * st;
      w.dir = dirFromAngle(Math.atan2(dy, dx));
      w.moving = true;
      w.walkT += dt * w.speed * 0.2;
    }
  }

  hitstop(t) { this.hitstopT = Math.max(this.hitstopT || 0, t); }

  // Objet aléatoire, adapté le plus souvent à la classe du joueur.
  loot(opts) {
    return generateItem({ ...opts, cls: opts.cls || (chance(0.85) ? this.pd.cls : null) });
  }

  render() {
    if (!this.scene) return;
    this.renderer.render(this);
  }

  separateEnemies() {
    const list = this.scene.enemies;
    const p = this.player;
    const map = this.scene.map;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead || a.state === 'idle') continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const nx = dx / d, ny = dy / d;
        const wa = a.boss ? 0.1 : 1, wb = b.boss ? 0.1 : 1;
        map.move(a, -nx * push * wa, -ny * push * wa);
        map.move(b, nx * push * wb, ny * push * wb);
      }
      // Ne pas traverser le joueur
      if (!p.dead && !p.roll && !p.dash) {
        const dx = a.x - p.x, dy = a.y - p.y;
        const min = a.r + p.r - 2;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0) {
          const d = Math.sqrt(d2);
          map.move(a, (dx / d) * (min - d), (dy / d) * (min - d));
        }
      }
    }
  }

  // ---------------- COMBAT ----------------
  addTelegraph(t) {
    t.t = 0;
    t.done = false;
    t.cancelled = false;
    this.scene.telegraphs.push(t);
    return t;
  }

  pointInTelegraph(t, x, y, r) {
    const dx = x - t.x, dy = y - t.y;
    if (t.shape === 'circle') return dx * dx + dy * dy < (t.r + r) ** 2;
    if (t.shape === 'cone') {
      const d = Math.hypot(dx, dy);
      if (d > t.r + r) return false;
      if (d < r + 8) return true;
      return Math.abs(angleDiff(t.ang, Math.atan2(dy, dx))) <= (t.arc * Math.PI) / 360 + Math.asin(Math.min(1, r / d));
    }
    if (t.shape === 'rect' || t.shape === 'line') {
      const c = Math.cos(t.ang), s = Math.sin(t.ang);
      const along = dx * c + dy * s;
      const perp = -dx * s + dy * c;
      return along > -r && along < t.len + r && Math.abs(perp) < t.w / 2 + r;
    }
    return false;
  }

  updateTelegraphs(dt) {
    const list = this.scene.telegraphs;
    const p = this.player;
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i];
      if (t.cancelled || (t.owner && t.owner.dead)) { list.splice(i, 1); continue; }
      if (t.follow && t.owner) { t.x = t.owner.x; t.y = t.owner.y; }
      t.t += dt;
      if (t.t >= t.dur) {
        t.done = true;
        if (t.dmg && !p.dead && this.pointInTelegraph(t, p.x, p.y, p.r * 0.8)) this.hurtPlayer(t.dmg, t.owner);
        if (t.onFire) t.onFire(this, t);
        list.splice(i, 1);
      }
    }
  }

  spawnProjectile(pr) { this.scene.projectiles.push(pr); }

  spawnEnemy(type, x, y, level, elite = false, alerted = false) {
    const map = this.scene.map;
    if (map.collides(x, y, ENEMIES[type].r)) { x = this.player.x + rand(-40, 40); y = this.player.y + rand(-40, 40); if (map.collides(x, y, ENEMIES[type].r)) return null; }
    const e = new Enemy(type, x, y, level, elite);
    if (alerted) e.state = 'chase';
    e.summoned = true;
    e.spawnT = 0.7;
    this.fx.burst(x, y + 6, '#3a3430', 12, 80, 0.8, 5, { drag: 3 });
    this.scene.enemies.push(e);
    return e;
  }

  updateProjectiles(dt) {
    const list = this.scene.projectiles;
    const p = this.player;
    const map = this.scene.map;
    for (let i = list.length - 1; i >= 0; i--) {
      const pr = list[i];
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      let dead = pr.life <= 0;
      if (!dead && map.solidAt(pr.x, pr.y)) {
        dead = true;
        this.fx.burst(pr.x, pr.y, '#8a8070', 4, 60, 0.3, 2);
        if (pr.team === 'player') this.renderer.stickArrow(this.scene, pr);
      }
      if (!dead && pr.team === 'enemy' && !p.dead && dist(pr.x, pr.y, p.x, p.y) < pr.r + p.r) {
        if (p.invuln <= 0) { this.hurtPlayer(pr.dmg, pr.owner); dead = true; }
      }
      if (!dead && pr.team === 'player') {
        for (const e of this.scene.enemies) {
          if (e.dead || pr.hit.has(e)) continue;
          if (Math.abs(e.x - pr.x) > e.r + pr.r || Math.abs(e.y - pr.y) > e.r + pr.r) continue;
          if (dist(e.x, e.y, pr.x, pr.y) > e.r + pr.r) continue;
          pr.hit.add(e);
          const a = Math.atan2(pr.vy, pr.vx);
          this.damageEnemy(e, p.rollDamage(pr.mult, e), a, e.boss ? pr.kb * 0.15 : pr.kb);
          if (pr.heavy) this.hitstop(0.03);
          if (pr.pierce-- <= 0) { dead = true; break; }
        }
      }
      if (dead) list.splice(i, 1);
    }
  }

  updateTraps(dt) {
    const s = this.scene;
    for (let i = s.traps.length - 1; i >= 0; i--) {
      const t = s.traps[i];
      t.t += dt;
      if (t.sprung) { if (t.t > 2.5) s.traps.splice(i, 1); continue; }
      if (t.t < t.armT) continue;
      for (const e of s.enemies) {
        if (e.dead || dist(e.x, e.y, t.x, t.y) > t.r + e.r) continue;
        t.sprung = true;
        t.t = 0;
        this.damageEnemy(e, this.player.rollDamage(2.5, e), 0, 0);
        e.stun = Math.max(e.stun, e.boss ? 0.6 : 2.5);
        this.fx.burst(t.x, t.y, '#7a1a12', 14, 140, 0.5, 3);
        this.fx.shake(3);
        sfx('block');
        break;
      }
    }
  }

  updateZones(dt) {
    const s = this.scene;
    for (let i = s.zones.length - 1; i >= 0; i--) {
      const z = s.zones[i];
      z.t += dt;
      if (z.t < 0) continue;
      z.tick -= dt;
      if (z.tick <= 0 && z.t <= z.dur) {
        z.tick = z.interval;
        for (const e of s.enemies) {
          if (e.dead || dist(e.x, e.y, z.x, z.y) > z.r + e.r) continue;
          this.damageEnemy(e, this.player.rollDamage(z.mult, e), -Math.PI / 2, 0);
        }
        sfx('arrow');
        for (let k = 0; k < 6; k++) this.fx.burst(z.x + rand(-z.r, z.r) * 0.8, z.y + rand(-z.r, z.r) * 0.8, '#6a6050', 2, 40, 0.25, 2);
      }
      if (z.t > z.dur + 0.3) s.zones.splice(i, 1);
    }
  }

  meleeFromPlayer(x, y, ang, range, arcDeg, mult, kb, stun) {
    let hits = 0;
    const half = (arcDeg * Math.PI) / 360;
    for (const e of this.scene.enemies) {
      if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y;
      const d = Math.hypot(dx, dy);
      if (d > range + e.r) continue;
      const a = Math.atan2(dy, dx);
      if (d > e.r + 10 && Math.abs(angleDiff(ang, a)) > half + Math.asin(Math.min(1, e.r / d))) continue;
      if (!this.scene.map.lineOfSight(x, y, e.x, e.y)) continue;
      const dm = this.player.rollDamage(mult, e);
      this.damageEnemy(e, dm, a, e.boss ? kb * 0.15 : kb);
      if (stun) e.stun = Math.max(e.stun, e.boss ? 0 : stun);
      hits++;
    }
    return hits;
  }

  damageEnemy(e, dm, kbAng, kbForce) {
    if (e.dead) return;
    const p = this.player;
    e.hp -= dm.amount;
    if (dm.dot) {
      this.fx.text(e.x, e.y - e.r - 6, String(dm.amount), '#8fae5a', 12, { damage: true });
      if (e.hp <= 0) this.killEnemy(e);
      return;
    }
    if (p.stats.poison > 0) e.poison = { dps: (dm.amount * p.stats.poison / 100) / 3, t: 3, tick: 0.5 };
    e.flash = 1;
    e.squash = 1;
    if (kbForce) { e.kbx += Math.cos(kbAng) * kbForce; e.kby += Math.sin(kbAng) * kbForce; }
    if (e.state === 'idle') e.alert(this);
    if (e.boss && !e.engaged) { e.engaged = true; e.state = 'chase'; this.onBossEngaged(e); }
    this.fx.text(e.x, e.y - e.r - 6, dm.amount + (dm.crit ? '!' : ''), dm.crit ? '#ffd24a' : '#ffffff', dm.crit ? 20 : 15, { damage: true, bold: dm.crit });
    this.fx.burst(e.x, e.y, e.type === 'acolyte' ? '#4a2a6a' : e.type === 'rat' ? '#5a1410' : '#b8b09a', dm.crit ? 9 : 5, 140, 0.4, 3, { ang: kbAng, spread: 0.9 });
    if (e.type === 'rat' || dm.crit) this.fx.burst(e.x, e.y, '#5a0f0b', 4, 100, 0.5, 3, { ang: kbAng, spread: 0.6 });
    sfx(dm.crit ? 'crit' : 'hit', { x: e.x, y: e.y });
    if (dm.crit) this.hitstop(0.035);
    const ls = p.stats.lifesteal + p.mods().lifesteal;
    if (ls > 0) p.hp = Math.min(p.maxHp, p.hp + dm.amount * ls / 100);
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    const s = this.scene;
    e.dead = true;
    e.deadT = e.boss ? 1.6 : 0.7;
    e.deathMax = e.deadT;
    this.renderer.addDecal(s, e);
    const debris = e.type === 'acolyte' ? '#3a2850' : e.type === 'rat' ? '#3e2f26' : '#b9b19c';
    this.fx.burst(e.x, e.y, debris, e.boss ? 60 : 14, e.boss ? 300 : 170, e.boss ? 1.2 : 0.8, e.boss ? 5 : 4, { drag: 4 });
    this.fx.burst(e.x, e.y, '#4a4440', 8, 60, 0.9, 6, { drag: 2, grav: -20 });
    sfx(e.boss ? 'bossRoar' : e.type === 'rat' ? 'ratDie' : e.type === 'acolyte' ? 'enemyDie' : 'bones', { x: e.x, y: e.y });
    this.addXp(e.xp, e.x, e.y);
    const pl = this.player;
    if (pl.stats.killHeal && !pl.dead) pl.heal(pl.maxHp * pl.stats.killHeal / 100);
    this.pd.stats.kills++;
    if (s.runStats) s.runStats.kills++;
    this.questEvent('kill', { type: e.type, elite: e.elite });
    if (e.elite) this.questEvent('elite', {});

    const D = e.def;
    const il = s.level + randInt(0, 2);
    // Or
    const goldN = chance(0.55) ? Math.round(randInt(D.gold[0], D.gold[1]) * 0.7 * (1 + (s.depth - 1) * 0.45) * (e.elite ? 3 : 1) * (1 + (pl.stats.goldFind || 0) / 100)) : 0;
    if (goldN > 0) this.dropGold(e.x, e.y, goldN);
    if (e.summoned) return;
    if (e.boss) { this.onBossKilled(e); return; }
    // Objets
    const itemChance = e.elite ? 0.5 : 0.055;
    if (chance(itemChance)) this.dropItem(e.x, e.y, this.loot({ ilvl: il, rarityBonus: e.elite ? 1 : 0 }));
    if (e.elite && chance(0.12)) this.dropItem(e.x, e.y, this.loot({ ilvl: il, rarityBonus: 1 }));
    if (e.elite && chance(0.12)) this.dropLore(e.x, e.y);
    if (chance(e.elite ? 0.2 : 0.025)) this.dropItem(e.x, e.y, makeConsumable('potion', 1));
    this.dropExtras(e.x, e.y, e.elite ? 'elite' : 'normal');
  }

  // Butin « à rapporter » : pièces d'ensemble, matériaux de forge, reliques de quête.
  dropExtras(x, y, kind) {
    const s = this.scene, depth = s.depth;
    const k = kind === 'boss' ? 1 : kind === 'elite' ? 0.35 : kind === 'chest' ? 0.3 : 0.035;
    // Pièce d'ensemble
    const setP = kind === 'boss' ? 0.45 : kind === 'elite' ? 0.08 : kind === 'chest' ? 0.12 : 0.006 + depth * 0.001;
    if (chance(setP)) {
      const ids = setsForDepth(depth);
      // les Gardiens lâchent de préférence l'ensemble de leur profondeur
      const own = { 1: 'garde', 2: chance(0.5) ? 'haldis' : 'sonneurs', 3: 'prieur', 4: 'varn', 5: 'roi' }[depth];
      const id = kind === 'boss' && own && ids.includes(own) ? own : pick(ids);
      this.dropItem(x, y, generateSetItem(id, null, s.level + randInt(0, 2)));
    }
    // Matériaux de forge
    if (chance(0.5 * k + 0.11)) this.dropItem(x, y, makeConsumable('fer', kind === 'boss' ? randInt(5, 8) : randInt(1, 3)));
    if (depth >= 2 && chance(0.3 * k + 0.035)) this.dropItem(x, y, makeConsumable('bronze', kind === 'boss' ? randInt(2, 4) : 1));
    if (depth >= 3 && chance(0.18 * k + 0.006)) this.dropItem(x, y, makeConsumable('braise', kind === 'boss' ? randInt(1, 3) : 1));
    if (depth >= 4 && chance(kind === 'boss' ? 0.8 : 0.06 * k)) this.dropItem(x, y, makeConsumable('larme', 1));
    // Reliques de quête (seulement si une quête active les demande)
    for (const q of this.activeBringQuests()) {
      if (depth < (q.obj.minDepth || 1)) continue;
      const p = kind === 'boss' ? 0.6 : kind === 'elite' ? 0.35 : kind === 'chest' ? 0.4 : 0.03;
      if (chance(p)) this.dropItem(x, y, makeConsumable(q.obj.id, 1));
    }
  }

  onBossEngaged(b) {
    this.scene.bossEngaged = true;
    sfx('bossRoar');
    this.fx.shake(8);
    // Mise en scène : la caméra glisse vers le Gardien, léger ralenti.
    this.camFocus = { x: b.x, y: b.y, t: 1.8, w: 0.55 };
    this.zoomTarget = 1.18;
    this.slowmo(1.2, 0.35);
    const G = b.guardian || { name: b.def.name };
    if (G.intro) this.ui.subtitle(G.intro, G.name);
    playMusic('boss');
    setReverb('boss');
  }

  onBossKilled(b) {
    const s = this.scene;
    const pd = this.pd;
    s.bossEngaged = false;
    this.fx.shake(14);
    this.slowmo(1.8, 0.22);
    this.camFocus = { x: b.x, y: b.y, t: 2.2, w: 0.5 };
    this.zoomTarget = 1.25;
    this.ui.flash();
    this.fx.pillar(b.x, b.y, '#d8c79a');
    const G = b.guardian;
    if (G && G.death) setTimeout(() => this.ui.subtitle(G.death, G.name), 400);
    setTimeout(() => { playMusic('dungeon', s.depth); setReverb('dungeon'); sfx('bell'); }, 2500);
    this.dropLore(b.x, b.y, chance(0.6));
    const il = s.level + 2;
    this.dropItem(b.x, b.y, this.loot({ ilvl: il, rarityBonus: 2, minRarity: 2 }));
    if (chance(0.5)) this.dropItem(b.x, b.y, this.loot({ ilvl: il, rarityBonus: 2 }));
    if (chance(0.15)) this.dropItem(b.x, b.y, this.loot({ ilvl: il, slot: 'pocket', rarity: Math.min(4, randInt(1, 3)) }));
    this.dropItem(b.x, b.y, makeConsumable('potion', 1));
    this.dropExtras(b.x, b.y, 'boss');
    pd.bossKills[s.depth] = (pd.bossKills[s.depth] || 0) + 1;
    const unlocked = s.depth + 1 > pd.maxDepth;
    pd.maxDepth = Math.max(pd.maxDepth, s.depth + 1);
    this.questEvent('boss', { depth: s.depth });
    s.interactables.push({ type: 'exitPortal', x: b.x, y: b.y, r: 26, label: 'Portail de retour (village)' });
    setTimeout(() => {
      this.ui.banner('Gardien abattu', 'gold');
      this.ui.toast('Un portail de retour s’est ouvert.', 'good', 5);
      if (unlocked) this.ui.toast(`Profondeur ${s.depth + 1} débloquée au portail du village.`, 'good', 5);
      sfx('portal');
    }, 1200);
  }

  hurtPlayer(amount, source) {
    const p = this.player;
    if (p.dead || p.invuln > 0) return;
    const m = p.mods();
    // Blocage (bouclier)
    if (p.pd.equipment.offhand && chance(p.stats.block / 100)) {
      this.fx.text(p.x, p.y - 26, 'Bloqué', '#9ec5ff', 14);
      this.fx.burst(p.x, p.y, '#9ec5ff', 6, 120, 0.3, 3);
      sfx('block');
      p.invuln = 0.15;
      p.stamina = Math.max(0, p.stamina - 8);
      return;
    }
    const lvl = source ? source.level : this.scene.level || 1;
    const red = Math.min(0.75, p.armor / (p.armor + 40 + 12 * lvl));
    let dmg = amount * (1 - red) * (1 - m.dr / 100) * (1 + m.dmgTaken / 100);
    dmg = Math.max(1, Math.round(dmg));
    p.hp -= dmg;
    p.flash = 1;
    p.invuln = 0.35;
    if (source) {
      const a = Math.atan2(p.y - source.y, p.x - source.x);
      p.kbx += Math.cos(a) * 180;
      p.kby += Math.sin(a) * 180;
      const th = p.stats.thorns + m.thorns;
      if (th > 0 && !source.dead) this.damageEnemy(source, { amount: Math.max(1, Math.round(dmg * th / 100)), crit: false }, a + Math.PI, 0);
    }
    this.fx.text(p.x, p.y - 26, '-' + dmg, '#ff5050', 17, { damage: true, bold: true });
    this.fx.burst(p.x, p.y, '#a01818', 8, 140, 0.4, 3);
    this.fx.shake(5);
    this.ui.hurtFlash(dmg / p.maxHp);
    sfx('hurt');
    if (p.channel) this.cancelChannel('Touché');
    if (p.hp <= 0) this.playerDeath();
  }

  // ---------------- LOOT ----------------
  dropItem(x, y, item) {
    const a = rand(0, TAU);
    const sp = rand(60, 160);
    this.scene.drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, item, t: 0, z: 0, vz: 160 });
    if (item.kind === 'equip' && item.rarity >= 3) sfx('quest');
  }

  dropGold(x, y, amount) {
    const a = rand(0, TAU);
    this.scene.drops.push({ x, y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, gold: amount, t: 0, z: 0, vz: 120 });
  }

  updateDrops(dt) {
    const s = this.scene;
    const p = this.player;
    const map = s.map;
    for (let i = s.drops.length - 1; i >= 0; i--) {
      const d = s.drops[i];
      d.t += dt;
      if (d.vx || d.vy) {
        const nx = d.x + d.vx * dt, ny = d.y + d.vy * dt;
        if (!map.solidAt(nx, ny)) { d.x = nx; d.y = ny; } else { d.vx = d.vy = 0; }
        d.vx *= 1 - Math.min(1, 4 * dt);
        d.vy *= 1 - Math.min(1, 4 * dt);
      }
      if (d.z > 0 || d.vz) { d.vz -= 600 * dt; d.z += d.vz * dt; if (d.z <= 0) { d.z = 0; d.vz = 0; } }
      if (p.dead || d.t < 0.45) continue;
      const dd = dist(p.x, p.y, d.x, d.y);
      // Aimantation de l'or
      if (d.gold && dd < 90) { d.x += (p.x - d.x) * Math.min(1, dt * 8); d.y += (p.y - d.y) * Math.min(1, dt * 8); }
      if (dd > p.r + 16) continue;
      if (d.gold) {
        if (s.type === 'dungeon') this.pd.runGold += d.gold; else this.pd.gold += d.gold;
        this.fx.text(d.x, d.y - 10, `+${d.gold} or`, '#ffd24a', 13);
        sfx('coin');
        s.drops.splice(i, 1);
        continue;
      }
      const item = d.item;
      if (item.kind === 'lore') { this.pickLore(item.id, d.x, d.y); s.drops.splice(i, 1); continue; }
      if (s.type === 'dungeon') item.found = true;
      const name = itemName(item);
      const qty = item.qty;
      if (Inv.addItem(this.pd, item)) {
        this.fx.text(d.x, d.y - 12, name + (item.kind === 'consumable' && qty > 1 ? ` x${qty}` : ''), itemColor(item), 13);
        sfx('pickup');
        if (s.runStats) s.runStats.items++;
        s.drops.splice(i, 1);
        this.ui.refresh();
      } else if (this.invFullWarn <= 0) {
        this.invFullWarn = 2;
        this.ui.toast('Inventaire plein !', 'bad', 1.5);
      }
    }
  }

  // ---------------- INTERACTIONS ----------------
  updateHover() {
    const p = this.player;
    let best = null, bd = Infinity;
    for (const o of this.scene.interactables) {
      if (o.type === 'chest' && o.opened) continue;
      const d = dist(p.x, p.y, o.x, o.y);
      if (d < o.r + 46 && d < bd) { best = o; bd = d; }
    }
    this.hover = best;
  }

  interact(o) {
    const p = this.player;
    if (p.channel) return;
    switch (o.type) {
      case 'npc':
        this.ui.open('dialog', { npc: o.id });
        sfx('ui');
        break;
      case 'stash':
        this.ui.open('stash');
        sfx('ui');
        break;
      case 'portal':
        this.ui.open('portal');
        sfx('ui');
        break;
      case 'chest':
        this.openChest(o);
        break;
      case 'extract':
        this.startChannel(4, 'Le cercle vous rappelle à la surface…', () => this.extract('Cercle d’extraction'));
        break;
      case 'exitPortal':
        this.extract('Portail du boss');
        break;
      case 'inscription':
        o.read = true;
        this.ui.inscription(o.text);
        sfx('page');
        break;
    }
  }

  openChest(o) {
    o.opened = true;
    o.openT = 0;
    // Le médaillon de Tomas apparaît dans le premier coffre ouvert à partir de la profondeur 2.
    const tq = this.pd.quests.b_tomas;
    if (tq && tq.status === 'active' && this.scene.depth >= 2 && !this.pd.story.lore.includes('l_tomas')) this.dropLore(o.x, o.y, true, 'l_tomas');
    else if (chance(o.rich ? 0.45 : 0.2)) this.dropLore(o.x, o.y);
    const s = this.scene;
    const il = s.level + randInt(0, 2);
    const n = o.rich ? randInt(1, 2) : chance(0.6) ? 1 : 0;
    for (let i = 0; i < n; i++) this.dropItem(o.x, o.y, this.loot({ ilvl: il, rarityBonus: o.rich ? 2 : 1 }));
    this.dropGold(o.x, o.y, Math.round(randInt(5, 12) * (1 + (s.depth - 1) * 0.5) * (o.rich ? 2.5 : 1)));
    if (chance(0.25)) this.dropItem(o.x, o.y, makeConsumable('potion', 1));
    if (chance(0.04 + (o.rich ? 0.08 : 0))) this.dropItem(o.x, o.y, this.loot({ slot: 'pocket', rarity: randInt(1, 3) }));
    this.dropExtras(o.x, o.y, 'chest');
    this.fx.burst(o.x, o.y - 6, '#c9a45a', 20, 140, 0.7, 2.5, { grav: -40 });
    this.fx.ring(o.x, o.y, 'rgba(201,164,90,0.7)', 50, 0.5);
    sfx('chest', { x: o.x, y: o.y });
    setTimeout(() => sfx('coin'), 300);
  }

  // ---------------- LORE ----------------
  dropLore(x, y, force = true, id = null) {
    const pd = this.pd;
    const s = this.scene;
    if (!force) return;
    let pickId = id;
    if (!pickId) {
      const pool = LORE.filter((l) => !l.quest && l.minDepth <= s.depth && !pd.story.lore.includes(l.id) && !s.drops.some((d) => d.item && d.item.id === l.id));
      if (!pool.length) return;
      pickId = pick(pool).id;
    }
    this.dropItem(x, y, { kind: 'lore', id: pickId });
  }

  pickLore(id, x, y) {
    const pd = this.pd;
    if (!pd.story.lore.includes(id)) pd.story.lore.push(id);
    const L = LORE_BY_ID[id];
    this.fx.text(x, y - 14, L.title, '#d8c79a', 13);
    this.ui.toast(`Fragment découvert : « ${L.title} » — lisible dans le journal (${input.label('journal')})`, 'good', 5);
    sfx('page');
    this.questEvent('lore', { id });
    this.save();
  }

  startChannel(dur, label, onDone) {
    const p = this.player;
    p.channel = { t: 0, dur, label, onDone };
    sfx('cast');
  }

  cancelChannel(reason) {
    const p = this.player;
    if (!p.channel) return;
    p.channel = null;
    this.ui.toast(`Incantation interrompue (${reason.toLowerCase()})`, 'bad', 1.5);
    sfx('error');
  }

  usePotion() {
    const p = this.player;
    if (p.potionCd > 0) return;
    if (p.hp >= p.maxHp) { this.ui.toast('PV déjà au maximum', 'info', 1); return; }
    if (!Inv.consume(this.pd, 'potion')) { this.ui.toast('Aucune potion !', 'bad', 1.2); sfx('error'); return; }
    p.potionCd = 2.5;
    const heal = Math.round(p.maxHp * 0.4);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    this.fx.text(p.x, p.y - 28, '+' + heal, '#5fd16f', 17, { bold: true });
    this.fx.burst(p.x, p.y, '#5fd16f', 14, 90, 0.6, 3, { grav: -60 });
    sfx('potion');
    this.ui.refresh();
  }

  useStone() {
    if (this.scene.type !== 'dungeon') { this.ui.toast('La pierre de retour ne fonctionne que dans les Abysses.', 'info', 2); return; }
    if (this.player.channel) return;
    if (Inv.countConsumable(this.pd, 'pierre') <= 0) { this.ui.toast('Aucune pierre de retour !', 'bad', 1.5); sfx('error'); return; }
    this.startChannel(5, 'La pierre murmure le chemin du retour…', () => {
      Inv.consume(this.pd, 'pierre');
      this.extract('Pierre de retour');
    });
  }

  // ---------------- FIN D'EXPÉDITION ----------------
  clearFoundFlags() {
    const pd = this.pd;
    for (const arr of [pd.inventory, pd.pocket, pd.stash]) for (const it of arr) if (it) delete it.found;
    for (const k in pd.equipment) if (pd.equipment[k]) delete pd.equipment[k].found;
    Inv.mergeStacks(pd.inventory);
    Inv.mergeStacks(pd.pocket);
  }

  extract(reason) {
    const pd = this.pd;
    const s = this.scene;
    const p = this.player;
    if (p.dead) return;
    p.channel = null;
    const gold = pd.runGold;
    pd.gold += gold;
    pd.runGold = 0;
    const found = [...pd.inventory, ...pd.pocket].filter((it) => it && it.found).map((it) => ({ name: itemName(it), color: itemColor(it), qty: it.qty }));
    this.clearFoundFlags();
    pd.inRun = false;
    pd.shopDirty = true;
    pd.stats.extractions++;
    this.questEvent('extract', {});
    this.running = false;
    sfx('portal');
    this.save();
    this.ui.showSummary({
      success: true,
      title: 'Vous avez survécu',
      subtitle: `${reason} · ${DUNGEON_NAME}, profondeur ${s.depth}`,
      kills: s.runStats.kills,
      xp: s.runStats.xp,
      gold,
      kept: found,
      lost: [],
    }, () => { this.running = true; this.enterVillage(); });
  }

  // Retire le butin non sécurisé. Renvoie la liste des objets perdus.
  applyDeathPenalty() {
    const pd = this.pd;
    const lost = [];
    for (let i = 0; i < pd.inventory.length; i++) {
      const it = pd.inventory[i];
      if (it && it.found) { lost.push({ name: itemName(it), color: itemColor(it), qty: it.qty }); pd.inventory[i] = null; }
    }
    const kept = pd.pocket.filter((it) => it && it.found).map((it) => ({ name: itemName(it), color: itemColor(it), qty: it.qty }));
    const lostGold = pd.runGold;
    pd.runGold = 0;
    this.clearFoundFlags();
    pd.inRun = false;
    pd.shopDirty = true;
    pd.stats.deaths++;
    this.save();
    return { lost, kept, lostGold };
  }

  playerDeath() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    p.hp = 0;
    p.channel = null;
    this.fx.burst(p.x, p.y, '#5a0f0b', 40, 200, 1.2, 4);
    this.fx.shake(12);
    this.slowmo(1.5, 0.3);
    this.zoomTarget = 1.2;
    this.ui.dying(true);
    sfx('death');
    playMusic(null);
    const s = this.scene;
    const pen = this.applyDeathPenalty();
    setTimeout(() => {
      this.running = false;
      this.ui.showSummary({
        success: false,
        title: 'Vous avez péri',
        subtitle: `${DUNGEON_NAME}, profondeur ${s.depth}`,
        kills: s.runStats.kills,
        xp: s.runStats.xp,
        gold: 0,
        lostGold: pen.lostGold,
        kept: pen.kept,
        lost: pen.lost,
      }, () => { this.ui.dying(false); this.running = true; this.enterVillage(); });
    }, 2200);
  }

  // ---------------- PROGRESSION ----------------
  addXp(n, x, y) {
    const pd = this.pd;
    const p = this.player;
    n = Math.round(n);
    pd.xp += n;
    if (this.scene && this.scene.runStats) this.scene.runStats.xp += n;
    if (x !== undefined) this.fx.text(x, y - 24, `+${n} XP`, '#b48cff', 12, { vy: -35 });
    let leveled = false;
    while (pd.xp >= xpForLevel(pd.level)) {
      pd.xp -= xpForLevel(pd.level);
      pd.level++;
      leveled = true;
    }
    if (leveled) {
      p.recalc();
      p.hp = p.maxHp;
      p.stamina = p.maxStamina;
      this.fx.burst(p.x, p.y, '#d8c79a', 30, 160, 1.2, 3, { grav: -80 });
      this.fx.pillar(p.x, p.y, '#e7c98a');
      this.ui.banner(`Niveau ${pd.level}`, 'gold');
      sfx('levelup');
      this.ui.toast(`Niveau ${pd.level} ! +1 point de talent (touche ${input.label('talents')})`, 'good', 4);
      if (pd.level === SPEC_LEVEL && !pd.spec) this.ui.toast('Vous pouvez choisir une spécialisation dans l’arbre de talents !', 'good', 6);
    }
    this.ui.refresh();
  }

  talentPoints() {
    const pd = this.pd;
    let spent = 0;
    for (const k in pd.talents) spent += pd.talents[k];
    return pd.level - 1 - spent;
  }

  treeSpent(list) {
    let n = 0;
    for (const t of list) n += this.pd.talents[t.id] || 0;
    return n;
  }

  canLearn(t, tree) {
    const pd = this.pd;
    const r = pd.talents[t.id] || 0;
    if (r >= t.max) return false;
    if (this.talentPoints() <= 0) return false;
    return this.treeSpent(tree.talents) >= tree.tierReq[t.tier];
  }

  learnTalent(id) {
    const pd = this.pd;
    const C = CLASSES[pd.cls];
    let tree = C;
    let t = C.talents.find((x) => x.id === id);
    if (!t && pd.spec) { tree = C.specs[pd.spec]; t = tree.talents.find((x) => x.id === id); }
    if (!t || !this.canLearn(t, tree)) { sfx('error'); return; }
    pd.talents[id] = (pd.talents[id] || 0) + 1;
    if (t.skill && !pd.skillBar.includes(t.skill)) {
      const i = pd.skillBar.indexOf(null);
      if (i >= 0) pd.skillBar[i] = t.skill;
      this.ui.toast(`Nouvelle compétence : ${SKILLS[t.skill].name} (touche ${input.label('skill' + (i + 1))})`, 'good', 4);
    }
    this.player.recalc();
    sfx('levelup');
    this.save();
    this.ui.refresh();
  }

  chooseSpec(id) {
    const pd = this.pd;
    if (pd.level < SPEC_LEVEL || pd.spec) return;
    pd.spec = id;
    sfx('quest');
    this.ui.toast(`Spécialisation choisie : ${CLASSES[pd.cls].specs[id].name}`, 'good', 4);
    this.player.recalc();
    this.save();
    this.ui.refresh();
  }

  respecCost() { return 25 * this.pd.level; }

  respec() {
    const pd = this.pd;
    if (this.scene.type !== 'village') return;
    const cost = this.respecCost();
    if (pd.gold < cost) { this.ui.toast('Pas assez d’or.', 'bad', 2); sfx('error'); return; }
    pd.gold -= cost;
    pd.talents = {};
    pd.spec = null;
    pd.skillBar = [null, null, null, null];
    this.player.recalc();
    this.save();
    this.ui.toast('Talents réinitialisés.', 'info', 2);
    this.ui.refresh();
  }

  // ---------------- QUÊTES ----------------
  qdef(id) { return questDef(this.pd, id); }

  questsAvailable(npcId) {
    const pd = this.pd;
    if (npcId === 'lisette') refillContracts(pd);
    return allQuests(pd).filter((q) => q.giver === npcId && !pd.quests[q.id] && (!q.req || (pd.quests[q.req] && pd.quests[q.req].status === 'done')));
  }

  questsOf(npcId, status) {
    return allQuests(this.pd).filter((q) => q.giver === npcId && this.pd.quests[q.id] && this.pd.quests[q.id].status === status);
  }

  // Quêtes actives qui demandent de rapporter des reliques ou des matériaux.
  activeBringQuests() {
    const pd = this.pd;
    return allQuests(pd).filter((q) => q.obj.type === 'bring' && pd.quests[q.id] && pd.quests[q.id].status === 'active' && !CONSUMABLES[q.obj.id].material);
  }

  acceptQuest(id) {
    const q = this.qdef(id);
    if (!q) return;
    this.pd.quests[id] = { status: 'active', progress: 0 };
    sfx('quest');
    this.ui.toast(`Nouvelle quête : ${q.name}`, 'good', 3);
    this.syncQuests();
    this.save();
    this.ui.refresh();
  }

  // Objectifs vérifiés d'après l'état de la partie : déjà accomplis = validés tout de suite
  // (profondeur déjà atteinte, Gardien déjà vaincu, fragment déjà lu, reliques rapportées, ensembles portés…).
  questStateProgress(q) {
    const pd = this.pd, o = q.obj;
    const reached = Math.max(pd.deepest || 1, (pd.maxDepth || 1) - 1);
    switch (o.type) {
      case 'depth': return reached >= o.depth ? o.count : null;
      case 'boss': {
        if (o.fresh) return null;
        for (const d in pd.bossKills) if (+d >= o.depth && pd.bossKills[d] > 0) return o.count;
        return null;
      }
      case 'lore': return pd.story.lore.includes(o.id) ? o.count : null;
      case 'lorecount': return Math.min(o.count, pd.story.lore.length);
      case 'bring': {
        // seuls les objets à l'abri comptent : au village tout compte, en expédition seulement la poche et le coffre
        const n = this.scene && this.scene.type === 'village' ? Inv.countAll(pd, o.id)
          : (pd.pocket || []).concat(pd.stash || []).reduce((a, it) => a + (it && it.kind === 'consumable' && it.id === o.id ? it.qty : 0), 0);
        return Math.min(o.count, n);
      }
      case 'setpieces': {
        const counts = equippedSetCounts(pd.equipment);
        if (o.full) {
          for (const id in counts) if (counts[id] >= Object.keys(SETS[id].pieces).length) return o.count;
          return 0;
        }
        return Math.min(o.count, Math.max(0, ...Object.values(counts)));
      }
      case 'upgrade': return Math.max(0, ...Inv.allItems(pd).map((it) => it.up || 0)) >= o.level ? 1 : 0;
      default: return null;
    }
  }

  // Recalcule les quêtes dont l'objectif dépend de l'état (appelé après chaque changement notable).
  syncQuests() {
    const pd = this.pd;
    if (!pd) return;
    for (const q of allQuests(pd)) {
      const st = pd.quests[q.id];
      if (!st || (st.status !== 'active' && st.status !== 'ready')) continue;
      const v = this.questStateProgress(q);
      if (v === null) continue;
      const need = q.obj.type === 'upgrade' ? 1 : q.obj.count;
      const was = st.status;
      st.progress = Math.min(v, need);
      if (q.obj.type === 'bring' || q.obj.type === 'setpieces' || q.obj.type === 'upgrade') st.status = st.progress >= need ? 'ready' : 'active';
      else if (st.progress >= need) st.status = 'ready';
      if (was === 'active' && st.status === 'ready') {
        sfx('quest');
        this.ui.toast(`Quête terminée : ${q.name} — retournez voir ${NPCS[q.giver].name}`, 'good', 4);
      }
    }
    if (this.ui.refreshTracker) this.ui.refreshTracker();
  }

  questEvent(type, data) {
    const pd = this.pd;
    for (const q of allQuests(pd)) {
      const st = pd.quests[q.id];
      if (!st || st.status !== 'active') continue;
      const o = q.obj;
      if (o.type !== type) continue;
      if (type === 'kill' && o.target !== data.type && o.also !== data.type) continue;
      if ((type === 'boss' || type === 'depth') && data.depth < o.depth) continue;
      if (type === 'lore' && o.id !== data.id) continue;
      st.progress++;
      if (st.progress >= o.count) {
        st.progress = o.count;
        st.status = 'ready';
        sfx('quest');
        this.ui.toast(`Quête terminée : ${q.name} — retournez voir ${NPCS[q.giver].name}`, 'good', 4);
      }
    }
    this.syncQuests();
  }

  turnInQuest(id) {
    const pd = this.pd;
    const q = this.qdef(id);
    const st = pd.quests[id];
    if (!q) return;
    this.syncQuests();
    if (!st || st.status !== 'ready') return;
    const R = q.reward;
    const needSlots = (R.item || R.set || R.setAny ? 1 : 0) + (R.consumable ? 1 : 0);
    if (Inv.freeCount(pd.inventory) < needSlots) { this.ui.toast('Libérez de la place dans votre inventaire.', 'bad', 2); sfx('error'); return; }
    if (q.obj.type === 'bring' && !Inv.takeAll(pd, q.obj.id, q.obj.count)) { this.ui.toast('Il vous manque des objets.', 'bad', 2); sfx('error'); return; }
    st.status = 'done';
    pd.gold += R.gold || 0;
    if (R.item) {
      const it = generateItem({ ilvl: pd.level + 1, rarityBonus: 1, cls: pd.cls, ...R.item });
      Inv.addItem(pd, it);
      this.ui.toast(`Récompense : ${itemName(it)}`, 'good', 4);
    }
    if (R.set || R.setAny) {
      const sid = R.set || pick(setsForDepth(Math.max(1, (pd.maxDepth || 1) - 1)));
      const it = generateSetItem(sid, null, pd.level + 1);
      Inv.addItem(pd, it);
      this.ui.toast(`Récompense : ${itemName(it)}`, 'good', 4);
    }
    if (R.consumable) Inv.addItem(pd, makeConsumable(R.consumable.id, R.consumable.qty));
    this.ui.toast(`Quête rendue : ${q.name} (+${R.gold || 0} or)`, 'good', 3);
    if (R.xp) this.addXp(R.xp, this.player.x, this.player.y);
    sfx('quest');
    if (q.contract) {
      pd.stats.contracts = (pd.stats.contracts || 0) + 1;
      delete pd.quests[id];
      pd.contracts = (pd.contracts || []).filter((c) => c.id !== id);
      refillContracts(pd);
    }
    this.syncQuests();
    this.save();
    this.ui.refresh();
    if (q.epilogue && !pd.story.epilogue) {
      pd.story.epilogue = true;
      this.save();
      setTimeout(() => { this.ui.close(); sfx('bell'); this.ui.showStory(EPILOGUE_ACT1, null, 'Acte I — La Cloche Noire'); }, 600);
    }
  }

  // Prochaine étape de l'histoire principale (pour guider le joueur).
  nextMainStep() {
    const pd = this.pd;
    for (const q of QUESTS) {
      if (!q.main) continue;
      const st = pd.quests[q.id];
      if (st && st.status === 'done') continue;
      if (!st) {
        const ok = !q.req || (pd.quests[q.req] && pd.quests[q.req].status === 'done');
        return ok ? { q, state: 'available' } : null;
      }
      return { q, state: st.status };
    }
    return null;
  }

  // Une quête peut-elle être rendue (place dans le sac) ?
  canTurnIn(id) {
    const R = this.qdef(id).reward;
    const needSlots = (R.item || R.set || R.setAny ? 1 : 0) + (R.consumable ? 1 : 0);
    return Inv.freeCount(this.pd.inventory) >= needSlots;
  }

  // ---------------- FORGE : RENFORCEMENT ----------------
  upgradeCost(item) {
    const up = item.up || 0;
    if (up >= 5 || item.slot === 'pocket' || item.kind !== 'equip') return null;
    const f = 1 + (item.ilvl || 1) * 0.05;
    const T = [
      { fer: 4, gold: 30 },
      { fer: 8, gold: 60 },
      { fer: 6, bronze: 3, gold: 120 },
      { bronze: 5, braise: 2, gold: 250 },
      { braise: 4, larme: 1, gold: 500 },
    ][up];
    const c = { ...T, gold: Math.round(T.gold * f) };
    return c;
  }

  canUpgrade(item) {
    const c = this.upgradeCost(item);
    if (!c) return false;
    if (this.pd.gold < c.gold) return false;
    for (const k in c) if (k !== 'gold' && Inv.countAll(this.pd, k) < c[k]) return false;
    return true;
  }

  upgradeItem(item) {
    const pd = this.pd;
    if (!this.forgeUnlocked()) { this.ui.toast('Brann doit d’abord étudier le fer de Valdrenne.', 'bad', 3); sfx('error'); return; }
    if (!this.canUpgrade(item)) { this.ui.toast('Il vous manque de l’or ou des matériaux.', 'bad', 2); sfx('error'); return; }
    const c = this.upgradeCost(item);
    pd.gold -= c.gold;
    for (const k in c) if (k !== 'gold') Inv.takeAll(pd, k, c[k]);
    if (!item.base0) item.base0 = { dmg: item.dmg, armor: item.armor, block: item.block, dmgBonus: item.dmgBonus };
    item.up = (item.up || 0) + 1;
    const m = 1 + 0.12 * item.up;
    if (item.base0.dmg) item.dmg = Math.round(item.base0.dmg * m);
    if (item.base0.armor) item.armor = Math.round(item.base0.armor * m);
    if (item.base0.dmgBonus) item.dmgBonus = Math.round(item.base0.dmgBonus * m);
    item.name = item.name.replace(/ \+\d$/, '') + ' +' + item.up;
    item.value = Math.round(item.value * 1.25);
    this.player.recalc();
    sfx('heavy'); setTimeout(() => sfx('block'), 180);
    this.ui.toast(`${item.name} : renforcé.`, 'good', 3);
    this.syncQuests();
    this.save();
    this.ui.refresh();
  }

  forgeUnlocked() { const q = this.pd.quests.b_fer; return !!(q && q.status === 'done'); }

  // ---------------- COMMERCE ----------------
  refreshShop() {
    const pd = this.pd;
    const forge = [];
    const slots = ['weapon', 'weapon', 'offhand', 'head', 'chest', 'legs', 'feet', 'hands', 'amulet', 'ring'];
    for (let i = 0; i < 8; i++) {
      const slot = i < slots.length ? pick(slots) : null;
      forge.push(generateItem({ ilvl: pd.level + randInt(0, 1), slot, cls: pd.cls, rarity: Math.random() < 0.55 ? 0 : Math.random() < 0.8 ? 1 : 2 }));
    }
    const pocket2 = generateItem({ slot: 'pocket', rarity: 1 });
    const pocket3 = generateItem({ slot: 'pocket', rarity: 3 });
    pocket2.value = 100; // prix d'achat = valeur x 6
    pocket3.value = 450;
    pd.shop = { forge, general: [pocket2, pocket3] };
    pd.shopDirty = false;
  }

  buy(shop, idx) {
    const pd = this.pd;
    let item;
    let price;
    if (shop === 'consumable') {
      item = makeConsumable(idx, 1);
      price = buyPrice(item);
    } else {
      item = pd.shop[shop][idx];
      if (!item) return;
      price = buyPrice(item);
    }
    if (pd.gold < price) { this.ui.toast('Pas assez d’or.', 'bad', 1.5); sfx('error'); return; }
    if (!Inv.addItem(pd, item)) { this.ui.toast('Inventaire plein.', 'bad', 1.5); sfx('error'); return; }
    pd.gold -= price;
    if (shop !== 'consumable') pd.shop[shop].splice(idx, 1);
    sfx('coin');
    this.save();
    this.ui.refresh();
  }

  sell(ref) {
    const pd = this.pd;
    const it = Inv.getItem(pd, ref);
    if (!it || ref.c === 'equip') return;
    const v = sellValue(it);
    Inv.removeAt(pd, ref);
    pd.gold += v;
    sfx('coin');
    this.ui.toast(`Vendu : ${itemName(it)} (+${v} or)`, 'info', 1.5);
    this.save();
    this.ui.refresh();
  }
}
