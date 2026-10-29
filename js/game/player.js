// Le joueur : statistiques, déplacements, attaques et compétences.
import { input } from '../core/input.js';
import { CLASSES, SKILLS } from '../data/classes.js';
import { WEAPONS, FISTS } from '../data/items.js';
import { rand, clamp, angleDiff, TAU, dist } from '../core/util.js';
import { sfx } from '../core/audio.js';

const BASE_SPEED = 210;
const ROLL_COST = 22;
const ATTACK_COST = 6;

export class Player {
  constructor(game) {
    this.game = game;
    this.r = 13;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.stats = {};
    this.maxHp = 100;
    this.hp = 100;
    this.maxStamina = 100;
    this.stamina = 100;
    this.armor = 0;
    this.resetCombat();
  }

  get pd() { return this.game.pd; }
  get cls() { return CLASSES[this.pd.cls]; }

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
    this.flash = 0;
    this.kbx = 0;
    this.kby = 0;
    this.moving = false;
    this.walkT = 0;
    this.dead = false;
    this.lowStaWarn = 0;
  }

  weapon() {
    const w = this.pd.equipment.weapon;
    if (!w) return { ...FISTS, dmg: 3 };
    return { ...WEAPONS[w.base], dmg: w.dmg };
  }

  recalc() {
    const pd = this.pd;
    const s = { hp: 0, hpPct: 0, armor: 0, armorPct: 0, dmgPct: 0, crit: 5, critDmg: 50, atkSpd: 0, moveSpd: 0, stamina: 0, staRegen: 0, lifesteal: 0, cdr: 0, hpRegen: 0, block: 0, thorns: 0, execute: 0 };
    for (const slot in pd.equipment) {
      const it = pd.equipment[slot];
      if (!it) continue;
      if (it.armor) s.armor += it.armor;
      if (it.block) s.block += it.block;
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
    this.maxHp = Math.round((100 + 14 * (lvl - 1) + s.hp) * (1 + s.hpPct / 100));
    this.armor = Math.round((s.armor + (lvl - 1) * 0.5) * (1 + s.armorPct / 100));
    this.maxStamina = 100 + s.stamina;
    s.crit = Math.min(s.crit, 75);
    s.cdr = Math.min(s.cdr, 40);
    s.block = Math.min(s.block, 60);
    s.moveSpd = Math.min(s.moveSpd, 50);
    this.stats = s;
    if (this.maxHp > oldMax && oldMax > 0) this.hp += this.maxHp - oldMax;
    this.hp = Math.min(this.hp, this.maxHp);
    this.stamina = Math.min(this.stamina, this.maxStamina);
  }

  // Bonus temporaires des compétences.
  mods() {
    const m = { dmgPct: 0, atkSpd: 0, lifesteal: 0, dmgTaken: 0, dr: 0, thorns: 0, staMult: 1 };
    for (const b of this.buffs) {
      if (b.id === 'cri') { m.dmgPct += 30; m.atkSpd += 20; }
      if (b.id === 'dechainement') { m.atkSpd += 40; m.lifesteal += 8; m.dmgTaken += 15; }
      if (b.id === 'murdefer') { m.dr += 60; m.thorns += 30; m.staMult *= 2; }
    }
    return m;
  }

  hasBuff(id) { return this.buffs.some((b) => b.id === id); }

  rollDamage(mult, target) {
    const w = this.weapon();
    const m = this.mods();
    let d = w.dmg * mult * (1 + (this.stats.dmgPct + m.dmgPct) / 100) * rand(0.9, 1.1);
    if (target && target.hp / target.maxHp < 0.3 && this.stats.execute) d *= 1 + this.stats.execute / 100;
    const crit = Math.random() * 100 < this.stats.crit;
    if (crit) d *= 1 + this.stats.critDmg / 100;
    return { amount: Math.max(1, Math.round(d)), crit };
  }

  attackSpeedMult() { return 1 + (this.stats.atkSpd + this.mods().atkSpd) / 100; }
  cdMult() { return 1 - this.stats.cdr / 100; }

  useStamina(n) {
    if (this.stamina < n) {
      if (this.lowStaWarn <= 0) { this.game.fx.text(this.x, this.y - 30, 'Endurance !', '#e8c547', 13); this.lowStaWarn = 0.8; }
      return false;
    }
    this.stamina -= n;
    this.staDelay = 0.55;
    return true;
  }

  busy() { return this.roll || this.dash || this.whirl; }

  update(dt) {
    const g = this.game;
    if (this.dead) return;
    this.invuln = Math.max(0, this.invuln - dt);
    this.attackCd -= dt;
    this.specialCd -= dt;
    this.potionCd -= dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    this.lowStaWarn -= dt;
    for (const k in this.skillCd) this.skillCd[k] -= dt;
    for (let i = this.buffs.length - 1; i >= 0; i--) { this.buffs[i].t -= dt; if (this.buffs[i].t <= 0) this.buffs.splice(i, 1); }

    const m = this.mods();
    this.staDelay -= dt;
    if (this.staDelay <= 0) this.stamina = Math.min(this.maxStamina, this.stamina + 34 * (1 + this.stats.staRegen / 100) * m.staMult * dt);
    const regen = this.stats.hpRegen + (g.scene.type === 'village' ? this.maxHp * 0.08 : 0);
    if (regen > 0) this.hp = Math.min(this.maxHp, this.hp + regen * dt);

    // Orientation vers la souris
    const mw = g.mouseWorld();
    this.angle = Math.atan2(mw.y - this.y, mw.x - this.x);

    // Recul
    if (this.kbx || this.kby) {
      g.scene.map.move(this, this.kbx * dt, this.kby * dt);
      this.kbx *= 1 - Math.min(1, 10 * dt);
      this.kby *= 1 - Math.min(1, 10 * dt);
      if (Math.abs(this.kbx) + Math.abs(this.kby) < 5) this.kbx = this.kby = 0;
    }

    if (this.swing) { this.swing.t += dt; if (this.swing.t >= this.swing.dur) this.swing = null; }

    // Direction de déplacement
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

    let speed = BASE_SPEED * (1 + this.stats.moveSpd / 100);
    if (this.whirl) { speed *= 0.7; this.updateWhirl(dt); }
    if (this.attackCd > 0 && !this.whirl) speed *= 0.82;
    if (this.channel) speed = 0;
    if (inMenu) { mx = my = 0; }

    this.moving = ml > 0 && speed > 0 && !inMenu;
    if (this.moving) {
      g.scene.map.move(this, mx * speed * dt, my * speed * dt);
      this.walkT += dt * 10;
      if (this.channel) g.cancelChannel('Déplacement');
    }

    if (inMenu) return;

    // Roulade
    if (input.wasPressed('roll') && this.useStamina(ROLL_COST)) {
      const a = ml ? Math.atan2(my, mx) : this.angle;
      this.roll = { t: 0, dur: 0.32, dx: Math.cos(a), dy: Math.sin(a) };
      this.invuln = Math.max(this.invuln, 0.28);
      this.swing = null;
      if (this.channel) g.cancelChannel('Roulade');
      sfx('roll');
      g.fx.burst(this.x, this.y + 6, '#6b5d4f', 6, 60, 0.4, 4);
      return;
    }

    if (this.whirl) return;

    // Attaque de base
    if (input.isDown('attack') && this.attackCd <= 0 && g.scene.type === 'dungeon') {
      if (this.useStamina(ATTACK_COST)) {
        const w = this.weapon();
        this.attackCd = w.cd / this.attackSpeedMult();
        this.doSwing(this.angle, w.range, w.arc, 1, w.kb, false);
        if (this.channel) g.cancelChannel('Attaque');
      } else this.attackCd = 0.15;
    }

    // Attaque spéciale de classe
    if (input.wasPressed('special') && this.specialCd <= 0 && g.scene.type === 'dungeon') {
      const sp = this.cls.special;
      if (this.useStamina(sp.stamina)) {
        const w = this.weapon();
        this.specialCd = sp.cd * this.cdMult();
        this.attackCd = Math.max(this.attackCd, 0.45);
        this.doSwing(this.angle, w.range * 1.25, Math.min(200, w.arc + 50), 2.2, w.kb * 2.2, true);
        if (this.channel) g.cancelChannel('Attaque');
      }
    }

    // Compétences 1 à 4
    for (let i = 0; i < 4; i++) {
      if (input.wasPressed('skill' + (i + 1))) this.castSkill(this.pd.skillBar[i]);
    }
  }

  doSwing(ang, range, arc, mult, kb, heavy) {
    const g = this.game;
    this.swing = { t: 0, dur: heavy ? 0.22 : 0.15, ang, arc, range, heavy };
    sfx(heavy ? 'heavy' : 'swing');
    const hits = g.meleeFromPlayer(this.x, this.y, ang, range, arc, mult, kb, heavy ? 0.25 : 0);
    if (heavy) g.fx.shake(hits ? 6 : 2);
    else if (hits) g.fx.shake(2);
  }

  updateRoll(dt) {
    const r = this.roll;
    r.t += dt;
    const k = 1 - r.t / r.dur;
    const sp = 600 * (0.35 + 0.65 * k);
    this.game.scene.map.move(this, r.dx * sp * dt, r.dy * sp * dt);
    if (r.t >= r.dur) this.roll = null;
  }

  updateDash(dt) {
    const d = this.dash;
    const g = this.game;
    d.t += dt;
    const blocked = g.scene.map.move(this, d.dx * 950 * dt, d.dy * 950 * dt);
    g.fx.burst(this.x, this.y, '#c9473b', 2, 30, 0.3, 4);
    for (const e of g.scene.enemies) {
      if (e.dead || d.hit.has(e)) continue;
      if (dist(this.x, this.y, e.x, e.y) < this.r + e.r + 10) {
        d.hit.add(e);
        g.damageEnemy(e, this.rollDamage(1.5, e), Math.atan2(d.dy, d.dx), 260);
        e.stun = Math.max(e.stun, 1.0);
      }
    }
    if (d.t >= d.dur || blocked) { this.dash = null; g.fx.shake(4); }
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
    switch (id) {
      case 'charge':
        this.dash = { t: 0, dur: 0.26, dx: Math.cos(this.angle), dy: Math.sin(this.angle), hit: new Set() };
        this.invuln = Math.max(this.invuln, 0.3);
        sfx('heavy');
        break;
      case 'tourbillon':
        this.whirl = { t: 0, dur: 1.2, tick: 0 };
        break;
      case 'cri':
        this.buffs.push({ id: 'cri', t: 8, max: 8 });
        for (const e of g.scene.enemies) {
          if (!e.dead && dist(this.x, this.y, e.x, e.y) < 230) e.slow = { t: 3, amt: 0.4 };
        }
        g.fx.burst(this.x, this.y, '#e8c547', 30, 260, 0.5, 4);
        g.fx.shake(5);
        sfx('bossRoar');
        break;
      case 'dechainement':
        this.buffs.push({ id: 'dechainement', t: 8, max: 8 });
        g.fx.burst(this.x, this.y, '#ff3a2a', 30, 200, 0.6, 4);
        sfx('bossRoar');
        break;
      case 'murdefer':
        this.buffs.push({ id: 'murdefer', t: 5, max: 5 });
        g.fx.burst(this.x, this.y, '#7fb0ff', 30, 200, 0.6, 4);
        sfx('block');
        break;
    }
  }

  draw(ctx, time) {
    const x = this.x, y = this.y;
    const C = this.cls;
    const roll = this.roll;
    ctx.save();
    ctx.translate(x, y);

    // Ombre
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 14, 6, 0, 0, TAU);
    ctx.fill();

    // Auras de buffs
    for (const b of this.buffs) {
      const col = b.id === 'cri' ? '232,197,71' : b.id === 'dechainement' ? '255,58,42' : '127,176,255';
      ctx.strokeStyle = `rgba(${col},${0.35 + 0.2 * Math.sin(time * 8)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 6, 0, TAU);
      ctx.stroke();
    }

    if (this.whirl) ctx.rotate(this.whirl.t * 18);
    else ctx.rotate(this.angle);

    if (roll) {
      const k = Math.sin((roll.t / roll.dur) * Math.PI);
      ctx.scale(1 - 0.25 * k, 1 + 0.15 * k);
    }

    const bob = this.moving ? Math.sin(this.walkT) * 1.5 : 0;
    const invulnBlink = this.invuln > 0 && !roll && !this.dash && Math.floor(time * 20) % 2 === 0;
    ctx.globalAlpha = invulnBlink ? 0.55 : 1;

    // Bouclier (côté gauche)
    const eq = this.pd.equipment;
    if (eq.offhand) {
      ctx.fillStyle = '#6b4a2b';
      ctx.strokeStyle = '#c8a46a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(4, -this.r - 1, 9, 4.5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    // Corps
    ctx.fillStyle = this.flash > 0 ? '#fff' : C.color;
    ctx.strokeStyle = '#2a1414';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, bob * 0.3, this.r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // Épaulières
    ctx.fillStyle = this.flash > 0 ? '#fff' : '#8d8a86';
    ctx.beginPath(); ctx.arc(1, -9, 5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(1, 9, 5, 0, TAU); ctx.fill();
    // Tête / casque
    ctx.fillStyle = this.flash > 0 ? '#fff' : (eq.head ? '#9a9792' : '#d9b48f');
    ctx.beginPath(); ctx.arc(3, 0, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(7, -3, 2, 6);

    // Arme (si pas en train de frapper)
    if (!this.swing && !this.whirl) this.drawWeapon(ctx, 0.9);
    else if (this.whirl) this.drawWeapon(ctx, 0);
    ctx.restore();

    // Arc de frappe
    if (this.swing) {
      const s = this.swing;
      const k = s.t / s.dur;
      const half = (s.arc * Math.PI) / 360;
      const cur = s.ang - half + half * 2 * k;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 0.55 * (1 - k * 0.6);
      ctx.fillStyle = s.heavy ? 'rgba(255,170,90,0.6)' : 'rgba(230,230,240,0.45)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, s.range, s.ang - half, cur);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.rotate(cur);
      this.drawWeapon(ctx, 0, s.range / 62);
      ctx.restore();
    }

    // Barre d'incantation (extraction / pierre)
    if (this.channel) {
      const c = this.channel;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, this.r + 10, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#7ad0ff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, this.r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * (c.t / c.dur)); ctx.stroke();
    }
  }

  drawWeapon(ctx, offsetAng, scale = 1) {
    const w = this.pd.equipment.weapon;
    ctx.save();
    ctx.rotate(offsetAng);
    const type = w ? w.base : null;
    const len = (type === 'espadon' ? 40 : type === 'marteau' ? 34 : 28) * Math.min(1.4, scale);
    ctx.strokeStyle = '#4a3020';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(14, 0); ctx.stroke();
    if (!type) { ctx.restore(); return; }
    if (type === 'masse' || type === 'marteau') {
      ctx.strokeStyle = '#6b4a2b';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10 + len, 0); ctx.stroke();
      ctx.fillStyle = '#9ea3a8';
      if (type === 'marteau') ctx.fillRect(4 + len, -8, 10, 16);
      else { ctx.beginPath(); ctx.arc(10 + len, 0, 6, 0, TAU); ctx.fill(); }
    } else if (type === 'hache') {
      ctx.strokeStyle = '#6b4a2b';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10 + len, 0); ctx.stroke();
      ctx.fillStyle = '#b3b8bd';
      ctx.beginPath();
      ctx.moveTo(len + 2, -1); ctx.quadraticCurveTo(len + 10, -12, len + 16, -9); ctx.lineTo(len + 10, 0); ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#d4d8dc';
      ctx.lineWidth = type === 'espadon' ? 5 : 4;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(12 + len, 0); ctx.stroke();
      ctx.strokeStyle = '#c8a46a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(14, 6); ctx.stroke();
    }
    ctx.restore();
  }
}
