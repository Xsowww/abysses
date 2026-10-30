// Le joueur : statistiques, déplacements, attaques (corps à corps ou à distance) et compétences.
import { input } from '../core/input.js';
import { CLASSES, SKILLS } from '../data/classes.js';
import { WEAPONS, FISTS } from '../data/items.js';
import { rand, clamp, TAU, dist, angleDiff } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { drawHero } from './hero.js';
import { hasSprite, drawSprite, drawFrame, dirFromAngle, walkFrame, animFrames } from './sprites.js';
import { hasEquip, lookFor, lookReady, composeLook, LOOK_ANCHOR } from './equip.js';
import { activeSetStats } from '../data/sets.js';
import { rescaleSetItem } from '../data/items.js';

const ROLL_COST = 22;
const ATTACK_COST = 6;

export class Player {
  constructor(game) {
    this.game = game;
    this.r = 13;
    this.x = 0;
    this.y = 0;
    this.angle = 0; // orientation affichée (lissée)
    this.aim = 0; // direction exacte vers la souris (attaques)
    this.vx = 0;
    this.vy = 0;
    this.stats = {};
    this.maxHp = 100;
    this.hp = 100;
    this.maxStamina = 100;
    this.stamina = 100;
    this.armor = 0;
    this.resetCombat();
  }

  get pd() { return this.game.pd; }
  get spec() { return this.pd && this.pd.spec; }

  // Jauge affichée sous l'endurance (rage, tension de l'arc…)
  resource() {
    if (this.spec === 'berserker') return { v: this.rage, max: 100, label: 'Rage', cls: 'rage' };
    if (this.spec === 'tireur') return { v: this.charge * 100, max: 100, label: 'Tension', cls: 'charge' };
    if (this.spec === 'pyromancien') return { v: this.heat, max: 100, label: this.overheat ? 'Surchauffe' : 'Chaleur', cls: this.overheat ? 'rage' : 'heat' };
    if (this.spec === 'necromancien') { const n = this.game.allyCount(); return { v: n, max: this.maxThralls(), label: `Serviteurs ${n}`, cls: 'bone' }; }
    return null;
  }
  get cls() { return CLASSES[this.pd.cls]; }
  // Talent ultime / rang acquis ?
  hasUniq(id) { return !!(this.uniqs && this.uniqs.has(id)); }
  has(id) { return (this.pd.talents[id] || 0) > 0; }
  maxThralls() { return this.has('n_legion') ? 5 : 3; }

  resetCombat() {
    this.invuln = 0;
    this.attackCd = 0;
    this.specialCd = 0;
    this.skillCd = {};
    this.potionCd = 0;
    this.staDelay = 0;
    this.roll = null;
    this.dash = null;
    this.whirl = null;
    this.swing = null;
    this.buffs = [];
    this.channel = null;
    // États propres aux spécialisations
    this.rage = 0; this.rageIdle = 0;          // Berserker
    this.guarding = false; this.guardT = 0;     // Gardien
    this.specialHeld = 0;
    this.charge = 0; this.charging = false;     // Tireur d'élite
    this.marked = null;
    this.heat = 0; this.heatIdle = 0; this.overheat = false; // Pyromancien
    this.flash = 0;
    this.kbx = 0;
    this.kby = 0;
    this.moving = false;
    this.walkT = 0;
    this.dead = false;
    this.lowStaWarn = 0;
    this.bowDraw = 0;
    this.vx = 0;
    this.vy = 0;
    this.stepT = 0;
    this.atk = null; // animation d'attaque en cours { anim, from, to, t, dur }
    this.deathT = 0;
    this.ghosts = [];
    this.ghostT = 0;
  }

  weapon() {
    const w = this.pd.equipment.weapon;
    if (!w || !WEAPONS[w.base]) return { ...FISTS, dmg: 3 };
    return { ...WEAPONS[w.base], dmg: w.dmg };
  }

  get stealth() { return this.hasBuff('voile'); }

  heal(n) {
    if (this.dead || n <= 0) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    if (this.hp - before >= 1) this.game.fx.text(this.x, this.y - 34, '+' + Math.round(this.hp - before), '#7fbf6a', 12);
  }

  recalc() {
    const pd = this.pd;
    // Les pièces d'ensemble portées suivent le niveau du personnage
    for (const k in pd.equipment) if (pd.equipment[k] && pd.equipment[k].set) rescaleSetItem(pd.equipment[k], pd.level);
    const s = { hp: 0, hpPct: 0, armor: 0, armorPct: 0, dmgPct: 0, crit: 5, critDmg: 50, atkSpd: 0, moveSpd: 0, stamina: 0, staRegen: 0, lifesteal: 0, cdr: 0, hpRegen: 0, block: 0, thorns: 0, execute: 0, pierce: 0, poison: 0, rollCost: 0, killHeal: 0, rollHeal: 0, eliteDmg: 0, goldFind: 0, dr: 0 };
    // Bonus d'ensembles (palier le plus haut atteint)
    for (const [k, v] of Object.entries(activeSetStats(pd.equipment))) s[k] = (s[k] || 0) + v;
    for (const slot in pd.equipment) {
      const it = pd.equipment[slot];
      if (!it) continue;
      if (it.armor) s.armor += it.armor;
      if (it.block) s.block += it.block;
      if (it.dmgBonus) s.dmgPct += it.dmgBonus;
      for (const a of it.affixes || []) s[a.k] = (s[a.k] || 0) + a.v;
    }
    const addTalents = (list) => {
      for (const t of list) {
        const r = pd.talents[t.id] || 0;
        if (r > 0 && t.stats) {
          const b = t.stats(r);
          for (const k in b) s[k] = (s[k] || 0) + b[k];
        }
      }
    };
    const C = this.cls;
    addTalents(C.talents);
    if (pd.spec) addTalents(C.specs[pd.spec].talents);

    const lvl = pd.level;
    const oldMax = this.maxHp;
    this.maxHp = Math.round((C.hpBase + C.hpPerLvl * (lvl - 1) + s.hp) * (1 + s.hpPct / 100));
    this.armor = Math.round((s.armor + (lvl - 1) * 0.5) * (1 + s.armorPct / 100));
    this.maxStamina = 100 + s.stamina;
    s.crit = Math.min(s.crit, 75);
    s.cdr = Math.min(s.cdr, 40);
    s.block = Math.min(s.block, 60);
    s.moveSpd = Math.min(s.moveSpd, 50);
    s.rollCost = Math.min(s.rollCost, 60);
    s.dr = Math.min(s.dr, 40);
    this.stats = s;
    this.uniqs = new Set(Object.values(pd.equipment).filter((it) => it && it.uniq).map((it) => it.uniq));
    if (this.maxHp > oldMax && oldMax > 0) this.hp += this.maxHp - oldMax;
    this.hp = Math.min(this.hp, this.maxHp);
    this.stamina = Math.min(this.stamina, this.maxStamina);
  }

  // Bonus temporaires des compétences.
  mods() {
    const m = { dmgPct: 0, atkSpd: 0, lifesteal: 0, dmgTaken: 0, dr: 0, thorns: 0, staMult: 1, crit: 0 };
    for (const b of this.buffs) {
      if (b.id === 'cri') { m.dmgPct += 30; m.atkSpd += 20; }
      if (b.id === 'dechainement') { m.atkSpd += 40; m.lifesteal += 8; m.dmgTaken += 15; }
      if (b.id === 'murdefer') { m.dr += 60; m.thorns += 30; m.staMult *= 2; }
      if (b.id === 'oeil') { m.crit = 100; m.atkSpd += 30; }
      if (b.id === 'voile') { m.dmgPct += 50; }
      if (b.id === 'manashield') { m.dr += 45; }
    }
    if (this.spec === 'pyromancien') { m.dmgPct += this.heat * 0.4 + (this.overheat && this.has('p_brasier') ? 30 : 0); }
    if (this.spec === 'berserker' && this.rage > 0) {
      m.dmgPct += this.rage * 0.3; m.atkSpd += this.rage * 0.2; m.lifesteal += this.rage * 0.04;
    }
    return m;
  }

  hasBuff(id) { return this.buffs.some((b) => b.id === id); }

  rollDamage(mult, target) {
    const w = this.weapon();
    const m = this.mods();
    let d = w.dmg * mult * (1 + (this.stats.dmgPct + m.dmgPct) / 100) * rand(0.9, 1.1);
    if (target && target.hp / target.maxHp < 0.3 && this.stats.execute) d *= 1 + this.stats.execute / 100;
    if (target && (target.elite || target.boss) && this.stats.eliteDmg) d *= 1 + this.stats.eliteDmg / 100;
    let forceCrit = false;
    if (this.hasBuff('riposte') && !this.dotHit) { d *= this.has('g_bastion') ? 3.5 : 2.5; forceCrit = true; this.buffs = this.buffs.filter((b) => b.id !== 'riposte'); }
    if (this.spec === 'ombrelame' && target && !this.dotHit) {
      const fromBehind = Math.abs(angleDiff(target.angle, Math.atan2(this.y - target.y, this.x - target.x))) > 1.75;
      if (fromBehind || target.state === 'idle' || this.hasBuff('embuscade')) { d *= this.has('o_assassin') ? 2.4 : 1.8; forceCrit = true; this.lastBackstab = true; }
      else this.lastBackstab = false;
      if (this.hasBuff('embuscade')) this.buffs = this.buffs.filter((b) => b.id !== 'embuscade');
    }
    const crit = forceCrit || Math.random() * 100 < Math.max(this.stats.crit, m.crit);
    if (crit) d *= 1 + this.stats.critDmg / 100;
    return { amount: Math.max(1, Math.round(d)), crit };
  }

  attackSpeedMult() { return 1 + (this.stats.atkSpd + this.mods().atkSpd) / 100; }
  cdMult() { return 1 - this.stats.cdr / 100; }

  useStamina(n) {
    if (this.overheat) return true; // Surchauffe : sorts gratuits
    if (this.stamina < n) {
      if (this.lowStaWarn <= 0) { this.game.fx.text(this.x, this.y - 30, 'Endurance', '#b9a46a', 13); this.lowStaWarn = 0.8; }
      return false;
    }
    this.stamina -= n;
    this.staDelay = 0.55;
    return true;
  }

  busy() { return this.roll || this.dash || this.whirl; }

  update(dt) {
    const g = this.game;
    for (let i = this.ghosts.length - 1; i >= 0; i--) { this.ghosts[i].t -= dt; if (this.ghosts[i].t <= 0) this.ghosts.splice(i, 1); }
    if (this.atk) { this.atk.t += dt; if (this.atk.t >= this.atk.dur) this.atk = null; }
    if (this.dead) { this.deathT += dt; return; }
    this.invuln = Math.max(0, this.invuln - dt);
    this.attackCd -= dt;
    this.specialCd -= dt;
    this.potionCd -= dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    this.lowStaWarn -= dt;
    for (const k in this.skillCd) this.skillCd[k] -= dt;
    if (this.guardBroken > 0) this.guardBroken -= dt;
    for (let i = this.buffs.length - 1; i >= 0; i--) { this.buffs[i].t -= dt; if (this.buffs[i].t <= 0) this.buffs.splice(i, 1); }

    // Rage : retombe si l'on ne se bat plus
    if (this.spec === 'berserker') { this.rageIdle += dt; if (this.rageIdle > 2.5) this.rage = Math.max(0, this.rage - (this.has('b_furie') ? 6 : 12) * dt); }
    if (this.spec === 'pyromancien') this.updateHeat(dt);
    const m = this.mods();
    this.staDelay -= dt;
    if (this.staDelay <= 0) this.stamina = Math.min(this.maxStamina, this.stamina + 34 * (1 + this.stats.staRegen / 100) * m.staMult * dt);
    const regen = this.stats.hpRegen + (g.scene.type === 'village' ? this.maxHp * 0.08 : 0);
    if (regen > 0) this.hp = Math.min(this.maxHp, this.hp + regen * dt);

    const mw = g.mouseWorld();
    this.aim = Math.atan2(mw.y - this.y, mw.x - this.x);
    // Le corps pivote vers la visée de façon fluide (rapide, mais pas instantanée).
    const turn = angleDiff(this.angle, this.aim);
    this.angle += Math.sign(turn) * Math.min(Math.abs(turn), dt * (this.attackCd > 0 ? 30 : 13));

    if (this.kbx || this.kby) {
      g.scene.map.move(this, this.kbx * dt, this.kby * dt);
      this.kbx *= 1 - Math.min(1, 10 * dt);
      this.kby *= 1 - Math.min(1, 10 * dt);
      if (Math.abs(this.kbx) + Math.abs(this.kby) < 5) this.kbx = this.kby = 0;
    }

    if (this.swing) { this.swing.t += dt; if (this.swing.t >= this.swing.dur) this.swing = null; }

    let mx = 0, my = 0;
    if (input.isDown('up')) my -= 1;
    if (input.isDown('down')) my += 1;
    if (input.isDown('left')) mx -= 1;
    if (input.isDown('right')) mx += 1;
    const ml = Math.hypot(mx, my);
    if (ml) { mx /= ml; my /= ml; }

    const inMenu = g.ui.blocksInput();

    if (this.roll) { this.updateRoll(dt); return; }
    if (this.dash) { this.updateDash(dt); return; }

    let speed = this.cls.speed * (1 + this.stats.moveSpd / 100);
    if (this.carrying) speed *= 0.75;
    if (this.guarding) speed *= 0.45;
    if (this.chill > 0) { this.chill -= dt; speed *= 0.6; }
    if (this.charging) speed *= 0.55;
    if (this.whirl) { speed *= 0.7; this.updateWhirl(dt); }
    if (this.attackCd > 0 && !this.whirl) speed *= this.weapon().ranged ? 0.75 : 0.82;
    if (this.channel) speed = 0;
    if (inMenu) { mx = my = 0; }

    // Déplacement avec inertie : accélération progressive, freinage doux.
    const want = ml > 0 && speed > 0 && !inMenu;
    const tvx = want ? mx * speed : 0, tvy = want ? my * speed : 0;
    const acc = (want ? 1500 : 2100) * dt;
    const dvx = tvx - this.vx, dvy = tvy - this.vy;
    const dl = Math.hypot(dvx, dvy);
    if (dl > acc) { this.vx += (dvx / dl) * acc; this.vy += (dvy / dl) * acc; } else { this.vx = tvx; this.vy = tvy; }
    if (this.vx || this.vy) {
      const ox = this.x, oy = this.y;
      g.scene.map.move(this, this.vx * dt, this.vy * dt);
      // on garde la vitesse réellement parcourue (glisse le long des murs sans « coller »)
      if (dt > 0) { this.vx = (this.x - ox) / dt; this.vy = (this.y - oy) / dt; }
    }
    const sp = Math.hypot(this.vx, this.vy);
    this.moving = sp > 25;
    if (this.moving) {
      this.walkT += dt * 10 * Math.min(1.2, sp / 210);
      // Pas : son + petite poussière
      this.stepT += dt * sp / 210;
      if (this.stepT >= 0.34) {
        this.stepT = 0;
        sfx('step');
        g.fx.burst(this.x - this.vx * 0.03, this.y + 8 - this.vy * 0.03, g.scene.type === 'dungeon' ? '#4a4540' : '#3a3428', 2, 25, 0.5, 3, { drag: 4, grav: -6 });
      }
      if (this.channel && want) g.cancelChannel('Déplacement');
    }

    // Tension de l'arc (visuel)
    const attacking = !inMenu && input.isDown('attack') && g.scene.type === 'dungeon';
    this.bowDraw += ((attacking ? 1 : 0) - this.bowDraw) * Math.min(1, dt * 10);

    if (inMenu) return;

    // Roulade
    const rollCost = ROLL_COST * (1 - this.stats.rollCost / 100);
    if (input.wasPressed('roll') && this.carrying) { g.ui.toast('Le reliquaire est trop lourd pour rouler.', 'bad', 1); }
    else if (input.wasPressed('roll') && (this.spec === 'berserker' || this.spec === 'ombrelame') && !this.guarding && this.useStamina(rollCost)) {
      const a = ml ? Math.atan2(my, mx) : this.aim;
      if (this.spec === 'berserker') this.leap(a); else this.shadowStep(a);
      if (this.channel) g.cancelChannel('Mouvement');
      return;
    }
    else if (input.wasPressed('roll') && !this.guarding && this.useStamina(rollCost)) {
      const a = ml ? Math.atan2(my, mx) : this.aim;
      this.roll = { t: 0, dur: 0.34, dx: Math.cos(a), dy: Math.sin(a) };
      this.invuln = Math.max(this.invuln, 0.28);
      this.swing = null;
      if (this.channel) g.cancelChannel('Roulade');
      sfx('roll');
      g.fx.burst(this.x, this.y + 6, '#4a443c', 6, 60, 0.4, 4);
      if (this.stats.rollHeal && g.scene.type === 'dungeon') this.heal(this.maxHp * this.stats.rollHeal / 100);
      return;
    }

    if (this.whirl) return;

    const w = this.weapon();
    const inDungeon = g.scene.type === 'dungeon';
    const spec = this.spec;
    // ---- Gardien : clic droit maintenu = garde au bouclier ; tapé = coup de bouclier ----
    if (spec === 'gardien' && inDungeon) {
      if (input.isDown('special') && this.stamina > 4 && !(this.guardBroken > 0)) {
        if (!this.guarding) { this.guarding = true; this.guardT = 0; this.specialHeld = 0; sfx('block'); }
        this.guardT += dt;
        this.specialHeld += dt;
        this.staDelay = 0.4;
      } else if (this.guarding) {
        this.guarding = false;
        if (this.specialHeld < 0.18 && this.specialCd <= 0 && this.useStamina(14)) {
          this.specialCd = 1.2 * this.cdMult();
          this.doSwing(this.aim, 46, 90, 1.2, 260, true);
          for (const e of g.scene.enemies) if (!e.dead && !e.boss && dist(this.x, this.y, e.x, e.y) < 60 + e.r) e.stun = Math.max(e.stun, 0.8);
        }
        this.specialHeld = 0;
      }
    }
    // ---- Tireur d'élite : maintenir pour bander l'arc, relâcher pour tirer ----
    if (spec === 'tireur' && w.ranged && inDungeon) {
      if (input.isDown('attack') && this.attackCd <= 0) {
        if (!this.charging) { this.charging = true; this.charge = 0; }
        this.charge = Math.min(1, this.charge + dt * this.attackSpeedMult() / (this.has('t_traque') ? 0.58 : 0.9));
        // pose : la corde reste tendue tant que l'on maintient
        this.atk = { anim: 'attack', from: 1 / 13, to: 8 / 13, t: this.charge * 0.399, dur: 0.4, hold: true };
        if (this.charge >= 1 && !this.chargeFull) { this.chargeFull = true; sfx('ui'); g.fx.ring(this.x, this.y, '#e0ae6a', 30, 0.25); }
      } else if (this.charging) {
        this.charging = false;
        const c = this.charge; this.charge = 0; this.chargeFull = false;
        if (this.useStamina(ATTACK_COST * (0.6 + c))) {
          this.attackCd = 0.18;
          const full = c >= 0.98;
          this.shoot(this.aim, 0.5 + 1.8 * c, { pierce: full ? 99 : (w.pierce || 0) + this.stats.pierce, heavy: full, speed: 1 + c * 0.4, full });
          if (full) g.fx.shake(3);
          if (this.channel) g.cancelChannel('Attaque');
        }
      }
    }
    // ---- Attaque de base ----
    else if (input.isDown('attack') && this.attackCd <= 0 && inDungeon && !this.guarding) {
      if (spec === 'ombrelame') {
        // Dagues : coups rapides au corps à corps (le dos des ennemis est leur point faible)
        if (this.useStamina(ATTACK_COST * 0.7)) {
          this.attackCd = 0.3 / this.attackSpeedMult();
          this.doSwing(this.aim, 56, 110, 0.75, 70, false);
          if (this.channel) g.cancelChannel('Attaque');
        } else this.attackCd = 0.15;
      } else if (this.useStamina(w.ranged ? ATTACK_COST * 0.6 : ATTACK_COST)) {
        this.attackCd = w.cd / this.attackSpeedMult();
        if (w.magic) this.castBurst(1);
        else if (w.ranged) this.shoot(this.aim, 1, { pierce: (w.pierce || 0) + this.stats.pierce });
        else this.doSwing(this.aim, w.range, w.arc, 1, w.kb, false);
        if (this.channel) g.cancelChannel('Attaque');
      } else this.attackCd = 0.15;
    }

    // ---- Attaque spéciale de classe (selon la voie) ----
    if (spec !== 'gardien' && input.wasPressed('special') && this.specialCd <= 0 && inDungeon) {
      const sp = this.cls.special;
      if (spec === 'berserker' && this.rage >= 50) {
        // Fureur : toute la rage part dans un tourbillon d'acier
        const k = this.rage / 100;
        this.rage = 0;
        this.specialCd = sp.cd * this.cdMult();
        this.attackCd = Math.max(this.attackCd, 0.5);
        this.doSwing(this.aim, w.range * 1.5, 360, 1.5 + 1.5 * k, w.kb * 2.4, true);
        g.fx.ring(this.x, this.y, '#c0352b', w.range * 1.5, 0.35);
        if (this.has('b_furie')) this.heal(this.maxHp * 0.15);
        g.fx.shake(8); sfx('bossRoar');
      } else if (this.pd.cls === 'mage') {
        if (spec === 'necromancien' && g.allyCount() < this.maxThralls()) {
          // Nécromancien : lever un mort près du curseur
          if (this.useStamina(sp.stamina)) {
            this.specialCd = 2.5 * this.cdMult();
            const mw = g.mouseWorld();
            const d = Math.min(dist(this.x, this.y, mw.x, mw.y), 160);
            g.spawnThrall(this.x + Math.cos(this.aim) * d, this.y + Math.sin(this.aim) * d, 20);
            this.atk = { anim: 'attack', from: 0, to: 0.999, t: 0, dur: 0.45 };
          }
        } else if (this.useStamina(sp.stamina)) {
          this.specialCd = sp.cd * this.cdMult();
          this.attackCd = Math.max(this.attackCd, 0.4);
          this.castVortex();
        }
      } else if (spec === 'ombrelame') {
        if (this.useStamina(16)) {
          this.specialCd = 1.4 * this.cdMult();
          this.attackCd = Math.max(this.attackCd, 0.3);
          this.shoot(this.aim, 1.6, { pierce: 0, dagger: true, speed: 1.2, poison: 80 });
        }
      } else if (this.useStamina(sp.stamina)) {
        this.specialCd = sp.cd * this.cdMult();
        this.attackCd = Math.max(this.attackCd, 0.45);
        if (w.ranged) {
          this.shoot(this.aim, 2.2, { pierce: 99, heavy: true, speed: 1.3 });
          g.fx.shake(3);
        } else this.doSwing(this.aim, w.range * 1.25, Math.min(200, w.arc + 50), 2.2, w.kb * 2.2, true);
        if (this.channel) g.cancelChannel('Attaque');
      }
    }

    for (let i = 0; i < 4; i++) {
      if (input.wasPressed('skill' + (i + 1))) this.castSkill(this.pd.skillBar[i]);
    }
  }

  // Mage : trait magique (selon la voie : explosif et brûlant, ou éclat d'os perçant)
  castBolt(mult, o = {}) {
    const w = this.weapon(), spec = this.spec;
    const opt = { magic: true, orb: !!o.orb, splash: o.splash || w.splash || 0, pierce: 0, speed: o.orb ? 0.85 : 1, heavy: !!o.orb };
    if (spec === 'pyromancien') { opt.fire = true; opt.splash = Math.max(opt.splash, 42); opt.poison = 25; this.addHeat(o.heat || 6); }
    else if (spec === 'necromancien') { opt.bone = true; opt.pierce = (o.orb ? 99 : 1) + this.stats.pierce; }
    this.shoot(this.aim, mult, opt);
    this.atk = { anim: 'attack', from: 0.25, to: 0.999, t: 0, dur: o.orb ? 0.42 : 0.28 };
  }

  // Mage : éclat qui explose à l'endroit visé (portée limitée, arrêté par les murs)
  castBurst(mult) {
    const g = this.game, w = this.weapon(), map = g.scene.map, spec = this.spec;
    const mw = g.mouseWorld();
    const maxD = Math.min(w.range * 0.75, Math.max(40, dist(this.x, this.y, mw.x, mw.y)));
    let d = 30;
    for (let k = 30; k <= maxD; k += 8) { if (map.solidAt(this.x + Math.cos(this.aim) * k, this.y + Math.sin(this.aim) * k)) break; d = k; }
    const x = this.x + Math.cos(this.aim) * d, y = this.y + Math.sin(this.aim) * d;
    const pyro = spec === 'pyromancien', necro = spec === 'necromancien';
    g.scene.zones.push({ kind: 'burst', x, y, r: (w.aoe || 50) + (pyro ? 8 : 0), t: -(w.delay || 0.15), dur: 0.01, tick: 0, interval: 9, mult, fire: pyro, bone: necro, kb: w.kb });
    if (pyro) this.addHeat(6);
    this.atk = { anim: 'attack', from: 0.25, to: 0.999, t: 0, dur: 0.28 };
    g.fx.burst(this.x + Math.cos(this.aim) * 14, this.y + Math.sin(this.aim) * 14 - 10, pyro ? '#ff8a3a' : necro ? '#c8d8b8' : '#9ab8ff', 4, 60, 0.25, 2);
    sfx('cast', { vol: 0.45 });
  }

  // Mage : orbe du vide — lent, attire et broie, puis explose
  castVortex() {
    const g = this.game, pyro = this.spec === 'pyromancien';
    g.scene.zones.push({ kind: 'vortex', x: this.x + Math.cos(this.aim) * 24, y: this.y + Math.sin(this.aim) * 24 - 6, vx: Math.cos(this.aim) * 165, vy: Math.sin(this.aim) * 165,
      r: 70, pull: 150, t: 0, dur: 2.4, tick: 0.15, interval: 0.3, mult: 0.35, fire: pyro, boom: false });
    if (pyro) this.addHeat(15);
    this.atk = { anim: 'attack', from: 0, to: 0.999, t: 0, dur: 0.42 };
    sfx('heavy');
  }

  addHeat(n) {
    this.heatIdle = 0;
    if (this.overheat) return;
    this.heat = Math.min(100, this.heat + n);
    if (this.heat >= 100) {
      this.overheat = true;
      this.game.fx.ring(this.x, this.y, '#ff7a2a', 90, 0.4);
      this.game.fx.text(this.x, this.y - 34, 'Surchauffe', '#ff8a3a', 16, { bold: true });
      sfx('bossRoar');
    }
  }

  updateHeat(dt) {
    this.heatIdle += dt;
    if (this.overheat) {
      // on brûle, mais les sorts sont gratuits ; la chaleur retombe lentement
      const burn = this.maxHp * (this.has('p_brasier') ? 0.012 : 0.025) * dt;
      this.hp = Math.max(1, this.hp - burn);
      this.heat -= 9 * dt;
      if (Math.random() < dt * 10) this.game.fx.burst(this.x, this.y - 8, '#ff7a2a', 1, 40, 0.5, 3, { grav: -80 });
      if (this.heat <= 35) { this.overheat = false; this.heat = 35; }
    } else if (this.heatIdle > 1.2) this.heat = Math.max(0, this.heat - 14 * dt);
  }

  shoot(ang, mult, o = {}) {
    const g = this.game;
    this.atk = { anim: 'attack', from: 8 / 13, to: 0.999, t: 0, dur: o.heavy ? 0.4 : 0.24 }; // fractions de l'animation
    const w = this.weapon();
    const sp = (w.projSpeed || 700) * (o.speed || 1);
    g.spawnProjectile({
      x: this.x + Math.cos(ang) * 16, y: this.y + Math.sin(ang) * 16,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      r: o.heavy ? 6 : 4, team: 'player', mult, kb: w.kb * (o.heavy ? 2 : 1),
      pierce: o.pierce || 0, hit: new Set(), life: (w.range || 500) / sp * (o.heavy ? 1.3 : 1),
      color: o.heavy ? '#e0c890' : o.dagger ? '#9fb0a0' : '#d6cdb8', kind: o.magic ? 'bolt' : o.heavy ? 'heavyArrow' : 'arrow', heavy: !!o.heavy, full: !!o.full, poison: o.poison || 0,
      magic: !!o.magic, orb: !!o.orb, splash: o.splash || 0, fire: !!o.fire, bone: !!o.bone,
    });
    this.bowDraw = 0;
    sfx(o.magic ? (o.orb ? 'heavy' : 'cast') : o.heavy ? 'heavy' : 'arrow', o.magic && !o.orb ? { vol: 0.5 } : undefined);
  }

  doSwing(ang, range, arc, mult, kb, heavy) {
    const g = this.game;
    this.swing = { t: 0, dur: heavy ? 0.22 : 0.15, ang, arc, range, heavy };
    // Animation : on part juste avant l'impact pour que le coup « parte » tout de suite
    this.atk = { anim: heavy ? 'heavy' : 'attack', from: 1 / 6, to: 0.999, t: 0, dur: heavy ? 0.42 : Math.max(0.26, this.weapon().cd * 0.8) };
    sfx(heavy ? 'heavy' : 'swing');
    const hits = g.meleeFromPlayer(this.x, this.y, ang, range, arc, mult, kb, heavy ? 0.25 : 0);
    if (heavy) { g.fx.shake(hits ? 6 : 2); if (hits) g.hitstop(0.06); }
    else if (hits) g.fx.shake(2);
  }

  updateRoll(dt) {
    const r = this.roll;
    r.t += dt;
    this.ghostT -= dt;
    if (this.ghostT <= 0) { this.ghostT = 0.045; this.ghosts.push({ x: this.x, y: this.y, a: this.angle, t: 0.22 }); }
    const k = 1 - r.t / r.dur;
    // Courbe d'élan : départ explosif, fin amortie (pas d'arrêt sec)
    const e = 1 - k;
    const sp = 640 * (1 - e * e * 0.75);
    this.game.scene.map.move(this, r.dx * sp * dt, r.dy * sp * dt);
    if (r.t >= r.dur) { this.roll = null; this.vx = r.dx * 200; this.vy = r.dy * 200; }
  }

  // Berserker : bond vers une direction, atterrissage qui frappe tout autour
  leap(a) {
    const g = this.game;
    this.dash = { t: 0, dur: 0.32, dx: Math.cos(a), dy: Math.sin(a), hit: new Set(), speed: 560, hits: false, color: '#5a1a12', leap: true,
      onEnd: () => {
        const w = this.weapon();
        const n = g.meleeFromPlayer(this.x, this.y, a, 78, 360, 0.7, 220, 0.4);
        g.fx.ring(this.x, this.y, '#8a2a1e', 78, 0.3);
        g.fx.burst(this.x, this.y + 6, '#4a4038', 16, 160, 0.5, 4);
        g.fx.shake(n ? 6 : 3); sfx('heavy');
        if (n) this.gainRage(6 * n);
      } };
    this.invuln = Math.max(this.invuln, 0.34);
    sfx('roll');
  }

  // Ombrelame : pas de l'ombre (téléportation courte), le coup suivant est une embuscade
  shadowStep(a) {
    const g = this.game, map = g.scene.map;
    const ox = this.x, oy = this.y;
    let d = 0;
    for (let k = 8; k <= 150; k += 8) { const x = ox + Math.cos(a) * k, y = oy + Math.sin(a) * k; if (map.collides(x, y, this.r - 2)) break; d = k; }
    g.fx.burst(ox, oy, '#2a2e36', 18, 120, 0.6, 5);
    this.x = ox + Math.cos(a) * d; this.y = oy + Math.sin(a) * d;
    this.ghosts.push({ x: ox, y: oy, a: this.angle, t: 0.3 });
    g.fx.burst(this.x, this.y, '#3a4250', 14, 100, 0.5, 4);
    this.invuln = Math.max(this.invuln, 0.3);
    this.buffs = this.buffs.filter((b) => b.id !== 'embuscade');
    this.buffs.push({ id: 'embuscade', t: 1.6, max: 1.6 });
    for (const e of g.scene.enemies) if (!e.dead && !e.boss && dist(ox, oy, e.x, e.y) < 60) e.cancelAttack();
    sfx('cast');
  }

  gainRage(n) {
    if (this.spec !== 'berserker') return;
    this.rage = Math.min(100, this.rage + n);
    this.rageIdle = 0;
  }

  updateDash(dt) {
    const d = this.dash;
    const g = this.game;
    d.t += dt;
    this.ghostT -= dt;
    if (this.ghostT <= 0) { this.ghostT = 0.03; this.ghosts.push({ x: this.x, y: this.y, a: this.angle, t: 0.2 }); }
    const blocked = g.scene.map.move(this, d.dx * d.speed * dt, d.dy * d.speed * dt);
    g.fx.burst(this.x, this.y, d.color, 2, 30, 0.3, 4);
    if (d.hits) {
      for (const e of g.scene.enemies) {
        if (e.dead || d.hit.has(e)) continue;
        if (dist(this.x, this.y, e.x, e.y) < this.r + e.r + 10) {
          d.hit.add(e);
          g.damageEnemy(e, this.rollDamage(1.5, e), Math.atan2(d.dy, d.dx), 260);
          e.stun = Math.max(e.stun, 1.0);
        }
      }
    }
    if (d.t >= d.dur || blocked) { this.dash = null; if (d.hits) g.fx.shake(4); if (d.onEnd) d.onEnd(); }
  }

  updateWhirl(dt) {
    const w = this.whirl;
    const g = this.game;
    w.t += dt;
    w.tick -= dt;
    if (w.tick <= 0) {
      w.tick = 0.25;
      sfx('swing');
      for (const e of g.scene.enemies) {
        if (e.dead) continue;
        if (dist(this.x, this.y, e.x, e.y) < 95 + e.r) {
          g.damageEnemy(e, this.rollDamage(0.6, e), Math.atan2(e.y - this.y, e.x - this.x), 90);
        }
      }
    }
    if (w.t >= w.dur) this.whirl = null;
  }

  castSkill(id) {
    const g = this.game;
    if (!id || g.scene.type !== 'dungeon') return;
    const S = SKILLS[id];
    if ((this.skillCd[id] || 0) > 0) { sfx('error'); return; }
    if (this.busy()) return;
    if (!this.useStamina(S.stamina)) return;
    this.skillCd[id] = S.cd * this.cdMult();
    if (this.channel) g.cancelChannel('Compétence');
    const w = this.weapon();
    switch (id) {
      case 'charge':
        this.dash = { t: 0, dur: 0.26, dx: Math.cos(this.aim), dy: Math.sin(this.aim), hit: new Set(), speed: 950, hits: true, color: '#7a2a1e' };
        this.invuln = Math.max(this.invuln, 0.3);
        sfx('heavy');
        break;
      case 'tourbillon':
        this.whirl = { t: 0, dur: 1.2, tick: 0 };
        break;
      case 'cri':
        this.buffs.push({ id: 'cri', t: 8, max: 8 });
        for (const e of g.scene.enemies) if (!e.dead && dist(this.x, this.y, e.x, e.y) < 230) e.slow = { t: 3, amt: 0.4 };
        g.fx.ring(this.x, this.y, '#c9a45a', 230);
        g.fx.shake(5);
        sfx('bossRoar');
        break;
      case 'dechainement':
        this.buffs.push({ id: 'dechainement', t: 8, max: 8 });
        g.fx.burst(this.x, this.y, '#a8402c', 30, 200, 0.6, 4);
        sfx('bossRoar');
        break;
      case 'murdefer':
        this.buffs.push({ id: 'murdefer', t: 5, max: 5 });
        g.fx.ring(this.x, this.y, '#7f9ab8', 80);
        sfx('block');
        break;
      case 'salve':
        for (let i = -2; i <= 2; i++) this.shoot(this.aim + i * 0.14, 0.75, { pierce: this.stats.pierce + (w.pierce || 0) });
        this.attackCd = Math.max(this.attackCd, 0.3);
        break;
      case 'piege': {
        const traps = g.scene.traps;
        const mine = traps.filter((t) => !t.sprung);
        if (mine.length >= 2) traps.splice(traps.indexOf(mine[0]), 1);
        traps.push({ x: this.x, y: this.y, r: 20, sprung: false, t: 0, armT: 0.4 });
        sfx('block');
        break;
      }
      case 'pluie': {
        const mw = g.mouseWorld();
        const d = Math.min(dist(this.x, this.y, mw.x, mw.y), 420);
        const tx = this.x + Math.cos(this.aim) * d, ty = this.y + Math.sin(this.aim) * d;
        g.scene.zones.push({ kind: 'rain', x: tx, y: ty, r: 95, t: -0.35, dur: 1.5, tick: 0, interval: 0.25, mult: 0.45 });
        sfx('arrow');
        break;
      }
      case 'oeil':
        this.buffs.push({ id: 'oeil', t: 6, max: 6 });
        g.fx.ring(this.x, this.y, '#b8964a', 70);
        sfx('cast');
        break;
      case 'seisme': {
        const n = g.meleeFromPlayer(this.x, this.y, 0, 125, 360, 1.8, 200, 1.5);
        g.fx.ring(this.x, this.y, '#b89a6a', 125, 0.4);
        g.fx.burst(this.x, this.y + 8, '#6a5a48', 30, 220, 0.7, 5, { drag: 3 });
        g.fx.shake(10); if (n) g.hitstop(0.08);
        this.atk = { anim: 'heavy', from: 0.3, to: 0.999, t: 0, dur: 0.4 };
        sfx('heavy');
        break;
      }
      case 'tirexplosif':
        this.shoot(this.aim, 2.5, { pierce: 0, heavy: true, splash: 90, speed: 1.1, explosive: true });
        this.attackCd = Math.max(this.attackCd, 0.4);
        break;
      case 'clignement': {
        const mw = g.mouseWorld();
        const ox = this.x, oy = this.y, map = g.scene.map;
        const maxD = Math.min(180, dist(ox, oy, mw.x, mw.y));
        let d = 0;
        for (let k = 8; k <= maxD; k += 8) { if (map.collides(ox + Math.cos(this.aim) * k, oy + Math.sin(this.aim) * k, this.r - 2)) break; d = k; }
        g.fx.burst(ox, oy, '#7a9aff', 18, 120, 0.5, 4);
        this.x = ox + Math.cos(this.aim) * d; this.y = oy + Math.sin(this.aim) * d;
        this.ghosts.push({ x: ox, y: oy, a: this.angle, t: 0.3 });
        g.fx.burst(this.x, this.y, '#b0c4ff', 14, 100, 0.5, 4);
        this.invuln = Math.max(this.invuln, 0.3);
        sfx('cast');
        break;
      }
      case 'nova': {
        g.meleeFromPlayer(this.x, this.y, 0, 140, 360, 1.2, 160, 0);
        for (const e of g.scene.enemies) if (!e.dead && dist(this.x, this.y, e.x, e.y) < 140 + e.r) e.slow = { t: 3, amt: 0.5 };
        g.fx.ring(this.x, this.y, '#9ad0ff', 140, 0.45);
        g.fx.burst(this.x, this.y, '#cfe8ff', 40, 260, 0.6, 3, { drag: 4 });
        this.atk = { anim: 'attack', from: 0.3, to: 0.999, t: 0, dur: 0.35 };
        sfx('cast'); g.fx.shake(4);
        break;
      }
      case 'chaine': {
        const mw = g.mouseWorld();
        const hit = new Set();
        const pts = [{ x: this.x, y: this.y - 10 }];
        let from = mw, best = null;
        for (let j = 0; j < 5; j++) {
          best = null; let bd = j === 0 ? 260 : 210;
          for (const e of g.scene.enemies) {
            if (e.dead || hit.has(e)) continue;
            const dd = dist(from.x, from.y, e.x, e.y);
            if (dd < bd && (j > 0 || dist(this.x, this.y, e.x, e.y) < 420)) { bd = dd; best = e; }
          }
          if (!best) break;
          hit.add(best); pts.push({ x: best.x, y: best.y - 8 });
          g.damageEnemy(best, this.rollDamage(1.4, best), Math.atan2(best.y - from.y, best.x - from.x), 40);
          best.stun = Math.max(best.stun || 0, best.boss ? 0 : 0.3);
          from = best;
        }
        if (pts.length > 1) g.scene.beams = (g.scene.beams || []).concat([{ pts, t: 0.28, max: 0.28 }]);
        else { this.skillCd.chaine = 0.5; this.stamina += SKILLS.chaine.stamina; }
        this.atk = { anim: 'attack', from: 0.3, to: 0.999, t: 0, dur: 0.3 };
        sfx('crit');
        break;
      }
      case 'bouclier':
        this.buffs.push({ id: 'manashield', t: 6, max: 6 });
        g.fx.ring(this.x, this.y, '#8ab0ff', 60);
        sfx('block');
        break;
      case 'meteore': {
        const mw = g.mouseWorld();
        const d = Math.min(dist(this.x, this.y, mw.x, mw.y), 420);
        g.scene.zones.push({ kind: 'meteor', x: this.x + Math.cos(this.aim) * d, y: this.y + Math.sin(this.aim) * d, r: 90, t: -0.9, dur: 0.01, tick: 0, interval: 9, mult: 3.8 });
        this.addHeat(20);
        sfx('cast');
        break;
      }
      case 'armee':
        for (let i = 0; i < 3; i++) { const a = this.aim + (i - 1) * 1.2; g.spawnThrall(this.x + Math.cos(a) * 50, this.y + Math.sin(a) * 50, 15, true); }
        sfx('bossRoar');
        break;
      case 'voile':
        this.buffs.push({ id: 'voile', t: 4, max: 4 });
        for (const e of g.scene.enemies) if (!e.dead && !e.boss) e.cancelAttack();
        g.fx.burst(this.x, this.y, '#2a2e36', 30, 140, 0.8, 6);
        sfx('cast');
        break;
    }
  }

  // État d'animation du sprite (direction, animation, frame, déformation)
  // Pièces visibles (recalculées seulement quand l'équipement change)
  look() {
    const eq = this.pd.equipment;
    const sig = this.pd.cls + (this.pd.spec || '') + Object.keys(eq).map((k) => (eq[k] ? eq[k].uid : '-')).join('|');
    if (sig !== this._lookSig) { this._lookSig = sig; this._look = lookFor(this.pd.cls, eq, this.pd.spec); }
    return this._look;
  }

  spriteState(time) {
    const name = this.pd.cls;
    const sp = Math.hypot(this.vx || 0, this.vy || 0);
    let dir = dirFromAngle(this.aim);
    if (this.dead) return { anim: 'hurt', frame: Math.min(5, this.deathT * 9), dir: 0 };
    if (this.whirl) return { anim: 'attack', frac: (2 + ((this.whirl.t * 14) % 3)) / 6, dir: Math.floor(this.whirl.t * 12) % 4 };
    if (this.roll) {
      const k = this.roll.t / this.roll.dur;
      dir = dirFromAngle(Math.atan2(this.roll.dy, this.roll.dx));
      return { anim: 'walk', frame: walkFrame(name, 'walk', k * 8), dir, squashY: 1 - 0.18 * Math.sin(k * Math.PI), squashX: 1 + 0.08 * Math.sin(k * Math.PI) };
    }
    if (this.dash) return { anim: 'walk', frame: walkFrame(name, 'walk', this.dash.t * 40), dir };
    if (this.atk) {
      const a = this.atk;
      return { anim: a.anim, frac: a.from + (a.to - a.from) * Math.min(1, a.t / a.dur), dir };
    }
    if (this.channel) return { anim: 'walk', frame: 0, dir: 2, squashY: 1 + 0.015 * Math.sin(time * 3) };
    if (this.moving) {
      const run = sp > 150;
      return { anim: 'walk', frame: walkFrame(name, 'walk', this.walkT * (run ? 1.3 : 1.1)), dir };
    }
    // Au repos : respiration légère
    return { anim: 'walk', frame: 0, dir, squashY: 1 + 0.012 * Math.sin(time * 2.4) };
  }

  draw(ctx, time) {
    const eq = this.pd.equipment;
    const blink = this.invuln > 0 && !this.roll && !this.dash && Math.floor(time * 20) % 2 === 0;
    // Auras de buffs (sobres)
    for (const b of this.buffs) {
      const col = { cri: '201,164,90', dechainement: '168,64,44', murdefer: '127,154,184', oeil: '184,150,74', voile: '90,106,122', manashield: '130,170,255' }[b.id] || '200,200,200';
      ctx.strokeStyle = `rgba(${col},${0.25 + 0.15 * Math.sin(time * 6)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 7, 0, TAU);
      ctx.stroke();
    }
    const name = this.pd.cls;
    const look = hasEquip() ? this.look() : null;
    if (look && lookReady(look)) {
      // Apparence selon l'équipement porté (calques superposés)
      const st = this.spriteState(time);
      const cnv = composeLook(look, st);
      const o = { squashX: st.squashX, squashY: st.squashY };
      const ax = LOOK_ANCHOR.x, ay = LOOK_ANCHOR.y;
      for (const gh of this.ghosts) drawFrame(ctx, cnv, 0, 0, 192, ax, ay, gh.x, gh.y + this.r * 0.55, { ...o, alpha: (gh.t / 0.22) * 0.3, flash: 0.6, shadow: false });
      drawFrame(ctx, cnv, 0, 0, 192, ax, ay, this.x, this.y + this.r * 0.55, { ...o, alpha: this.stealth ? 0.3 : blink ? 0.6 : 1, flash: this.flash });
    } else if (hasSprite(name)) {
      const st = this.spriteState(time);
      if (st.frac !== undefined) st.frame = st.frac * (animFrames(name, st.anim) || 6);
      for (const gh of this.ghosts) drawSprite(ctx, name, gh.x, gh.y + this.r * 0.55, { ...st, alpha: (gh.t / 0.22) * 0.3, flash: 0.6, shadow: false });
      drawSprite(ctx, name, this.x, this.y + this.r * 0.55, { ...st, alpha: this.stealth ? 0.3 : blink ? 0.6 : 1, flash: this.flash });
    } else {
      for (const gh of this.ghosts) drawHero(ctx, gh.x, gh.y, { cls: name, angle: gh.a, time, eq, alpha: (gh.t / 0.22) * 0.25, flash: 0 });
      drawHero(ctx, this.x, this.y, {
        cls: name, angle: this.angle, time, moving: this.moving, walkT: this.walkT, flash: this.flash, eq,
        roll: this.roll ? this.roll.t / this.roll.dur : 0, whirlT: this.whirl ? this.whirl.t : null, swing: this.swing,
        alpha: this.stealth ? 0.35 : blink ? 0.55 : 1, bowDraw: this.bowDraw,
      });
    }
    if (this.dead) return;

    // Arc de frappe (corps à corps)
    if (this.swing) {
      const s = this.swing;
      const k = s.t / s.dur;
      const half = (s.arc * Math.PI) / 360;
      const cur = s.ang - half + half * 2 * k;
      ctx.save();
      ctx.translate(this.x, this.y);
      // traînée
      ctx.globalAlpha = 0.5 * (1 - k * 0.5);
      ctx.strokeStyle = s.heavy ? 'rgba(230,170,110,0.9)' : 'rgba(220,215,200,0.8)';
      ctx.lineWidth = s.heavy ? 5 : 3;
      ctx.beginPath();
      ctx.arc(0, 0, s.range * 0.92, Math.max(s.ang - half, cur - 1.2), cur);
      ctx.stroke();
      ctx.globalAlpha = 0.18 * (1 - k);
      ctx.fillStyle = s.heavy ? '#e6aa6e' : '#ddd8c8';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, s.range, s.ang - half, cur);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    if (this.channel) {
      const c = this.channel;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 11, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#8fc4c0';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 11, -Math.PI / 2, -Math.PI / 2 + TAU * (c.t / c.dur)); ctx.stroke();
    }
  }
}
