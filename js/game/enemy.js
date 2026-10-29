// Monstres et boss : IA basée sur des attaques "annoncées" (zones rouges) qu'il faut esquiver.
import { ENEMIES, scaleFor } from '../data/enemies.js';
import { rand, TAU, dist, angleDiff, chance, weightedPick } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { hasSprite, drawSprite, dirFromAngle, walkFrame } from './sprites.js';

const SPRITE_OF = { rat: 'goule', squelette: 'squelette', archer: 'archer', acolyte: 'acolyte', gardien: 'gardien' };

export class Enemy {
  constructor(type, x, y, level, elite = false) {
    const D = ENEMIES[type];
    this.type = type;
    this.def = D;
    this.x = x;
    this.y = y;
    this.level = level;
    this.elite = elite;
    this.boss = !!D.boss;
    const sc = scaleFor(level);
    this.r = D.r * (elite ? 1.25 : 1);
    this.maxHp = Math.round(D.hp * sc.hp * (elite ? 2.6 : 1));
    this.hp = this.maxHp;
    this.dmg = D.dmg * sc.dmg * (elite ? 1.35 : 1);
    this.speed = D.speed * (elite ? 1.08 : 1);
    this.xp = Math.round(D.xp * sc.xp * (elite ? 3 : 1));
    this.state = 'idle';
    this.t = 0;
    this.cd = rand(0.4, 1.4);
    this.stun = 0;
    this.slow = null;
    this.flash = 0;
    this.kbx = 0;
    this.kby = 0;
    this.dead = false;
    this.angle = rand(0, TAU);
    this.tele = null;
    this.lunge = null;
    this.walkT = rand(0, 10);
    this.hitCooldown = 0;
    // Boss
    this.phase = 1;
    this.summons = [0.66, 0.33];
    this.engaged = false;
  }

  get name() { return (this.elite ? 'Élite · ' : '') + this.def.name; }

  alert(g) {
    if (this.state !== 'idle') return;
    this.state = 'chase';
    if (this.type !== 'rat') sfx('alert', { x: this.x, y: this.y, vol: 0.7 });
    for (const o of g.scene.enemies) {
      if (o !== this && !o.dead && o.state === 'idle' && !o.boss && dist(this.x, this.y, o.x, o.y) < 220) o.state = 'chase';
    }
  }

  cancelAttack() {
    if (this.tele) { this.tele.cancelled = true; this.tele = null; }
    if (this.state === 'windup' || this.state === 'cast') { this.state = 'chase'; this.cd = Math.max(this.cd, 0.6); }
  }

  speedMult() {
    let m = 1;
    if (this.slow && this.slow.t > 0) m *= 1 - this.slow.amt;
    return m;
  }

  moveToward(g, tx, ty, speed, dt) {
    const map = g.scene.map;
    const p = g.player;
    let dx, dy;
    const d = dist(this.x, this.y, tx, ty);
    if (d < 240 && map.lineOfSight(this.x, this.y, tx, ty)) {
      dx = (tx - this.x) / (d || 1); dy = (ty - this.y) / (d || 1);
    } else {
      const f = tx === p.x && ty === p.y ? map.flowDir(this.x, this.y) : null;
      if (f) { dx = f.x; dy = f.y; }
      else { dx = (tx - this.x) / (d || 1); dy = (ty - this.y) / (d || 1); }
    }
    // Pilotage avec inertie : les monstres accélèrent, tournent et freinent naturellement.
    this.mvx = this.mvx || 0; this.mvy = this.mvy || 0;
    const acc = 650 * dt;
    const tvx = dx * speed, tvy = dy * speed;
    const ex = tvx - this.mvx, ey = tvy - this.mvy;
    const el = Math.hypot(ex, ey);
    if (el > acc) { this.mvx += (ex / el) * acc; this.mvy += (ey / el) * acc; } else { this.mvx = tvx; this.mvy = tvy; }
    const ox = this.x, oy = this.y;
    map.move(this, this.mvx * dt, this.mvy * dt);
    if (dt > 0) { this.mvx = (this.x - ox) / dt; this.mvy = (this.y - oy) / dt; }
    this.turnTo(Math.atan2(this.mvy || dy, this.mvx || dx), dt, 7);
    this.walkT += dt * 8 * Math.min(1.2, Math.hypot(this.mvx, this.mvy) / (this.def.speed || 80));
  }

  turnTo(a, dt, rate = 8) {
    const d = angleDiff(this.angle, a);
    this.angle += Math.sign(d) * Math.min(Math.abs(d), dt * rate);
  }

  update(dt, g) {
    if (this.dead) return;
    this.squash = Math.max(0, (this.squash || 0) - dt * 6);
    if (this.spawnT > 0) { this.spawnT -= dt; return; }
    const p = g.player;
    const map = g.scene.map;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.cd -= dt;
    this.hitCooldown -= dt;
    if (this.slow) { this.slow.t -= dt; if (this.slow.t <= 0) this.slow = null; }

    if (this.kbx || this.kby) {
      map.move(this, this.kbx * dt, this.kby * dt);
      const k = 1 - Math.min(1, 9 * dt);
      this.kbx *= k; this.kby *= k;
      if (Math.abs(this.kbx) + Math.abs(this.kby) < 4) this.kbx = this.kby = 0;
    }

    if (this.poison) {
      this.poison.t -= dt;
      this.poison.tick -= dt;
      if (this.poison.tick <= 0) {
        this.poison.tick = 0.5;
        g.damageEnemy(this, { amount: Math.max(1, Math.round(this.poison.dps * 0.5)), crit: false, dot: true }, 0, 0);
        if (this.dead) return;
      }
      if (this.poison.t <= 0) this.poison = null;
    }

    if (this.stun > 0) {
      this.stun -= dt;
      if (!this.boss) this.cancelAttack();
      if (this.lunge) this.lunge = null;
      return;
    }

    const d = dist(this.x, this.y, p.x, p.y);

    // Joueur invisible : les monstres perdent sa trace.
    if (p.stealth && !this.dashing && !this.lunge) {
      if (this.state === 'windup' || this.state === 'cast') this.cancelAttack();
      this.walkT += dt * 2;
      return;
    }

    if (this.boss) { this.updateBoss(dt, g, d); return; }

    if (this.state === 'idle') {
      if (!p.dead && d < this.def.aggro && map.lineOfSight(this.x, this.y, p.x, p.y)) this.alert(g);
      return;
    }
    if (p.dead) return;

    const D = this.def;
    const sp = this.speed * this.speedMult();
    const los = d < 600 && map.lineOfSight(this.x, this.y, p.x, p.y);

    switch (D.ai) {
      case 'lunge': this.aiLunge(dt, g, d, los, sp); break;
      case 'melee': this.aiMelee(dt, g, d, los, sp); break;
      case 'ranged': this.aiRanged(dt, g, d, los, sp); break;
      case 'caster': this.aiCaster(dt, g, d, los, sp); break;
    }
  }

  aiLunge(dt, g, d, los, sp) {
    const p = g.player;
    if (this.lunge) {
      const l = this.lunge;
      l.t += dt;
      const blocked = g.scene.map.move(this, Math.cos(l.ang) * 430 * dt, Math.sin(l.ang) * 430 * dt);
      if (!l.hit && dist(this.x, this.y, p.x, p.y) < this.r + p.r + 4) {
        l.hit = true;
        g.hurtPlayer(this.dmg, this);
      }
      if (l.t > 0.24 || blocked) { this.lunge = null; this.state = 'recover'; this.t = 0.45; this.cd = this.def.cd; }
      return;
    }
    if (this.state === 'recover') { this.t -= dt; if (this.t <= 0) this.state = 'chase'; return; }
    if (this.state === 'windup') {
      if (this.tele && this.tele.done) { this.tele = null; this.lunge = { t: 0, ang: this.angle, hit: false }; sfx('roll'); }
      return;
    }
    if (los && d < this.def.atkRange + 40 && this.cd <= 0) {
      this.angle = Math.atan2(p.y - this.y, p.x - this.x);
      this.state = 'windup';
      this.tele = g.addTelegraph({ shape: 'rect', x: this.x, y: this.y, ang: this.angle, len: 110, w: this.r * 2 + 6, dur: this.def.windup, owner: this, follow: true });
      return;
    }
    this.moveToward(g, p.x, p.y, sp, dt);
  }

  aiMelee(dt, g, d, los, sp) {
    const p = g.player;
    if (this.state === 'recover') { this.t -= dt; if (this.t <= 0) this.state = 'chase'; return; }
    if (this.state === 'windup') {
      if (this.tele && this.tele.done) { this.tele = null; this.state = 'recover'; this.t = 0.4; this.cd = this.def.cd * rand(0.8, 1.2); sfx('swing'); }
      return;
    }
    if (los && d < this.def.atkRange + p.r && this.cd <= 0) {
      this.angle = Math.atan2(p.y - this.y, p.x - this.x);
      this.state = 'windup';
      sfx('windup', { x: this.x, y: this.y });
      this.tele = g.addTelegraph({ shape: 'cone', x: this.x, y: this.y, r: this.def.atkRange + 14, ang: this.angle, arc: this.def.arc, dur: this.def.windup * (this.elite ? 0.85 : 1), dmg: this.dmg, owner: this, follow: true });
      return;
    }
    if (d > this.def.atkRange * 0.7) this.moveToward(g, p.x, p.y, sp, dt);
    else this.angle = Math.atan2(p.y - this.y, p.x - this.x);
  }

  aiRanged(dt, g, d, los, sp) {
    const p = g.player;
    const D = this.def;
    if (this.state === 'recover') { this.t -= dt; if (this.t <= 0) this.state = 'chase'; return; }
    if (this.state === 'windup') {
      if (this.tele) {
        // Visée qui suit le joueur, puis se fige juste avant le tir.
        if (this.tele.t < this.tele.dur - 0.3) { this.angle = Math.atan2(p.y - this.y, p.x - this.x); this.tele.ang = this.angle; }
        if (this.tele.done) {
          this.tele = null;
          const n = this.elite ? 3 : 1;
          for (let i = 0; i < n; i++) {
            const a = this.angle + (i - (n - 1) / 2) * 0.18;
            g.spawnProjectile({ x: this.x + Math.cos(a) * 14, y: this.y + Math.sin(a) * 14, vx: Math.cos(a) * D.projSpeed, vy: Math.sin(a) * D.projSpeed, r: 5, dmg: this.dmg, team: 'enemy', color: '#e8d9a8', life: 2.5, owner: this, kind: 'arrow' });
          }
          sfx('enemyArrow', { x: this.x, y: this.y });
          this.state = 'recover'; this.t = 0.4; this.cd = D.cd * rand(0.8, 1.2);
        }
      }
      return;
    }
    if (los && d < D.atkRange && this.cd <= 0) {
      this.angle = Math.atan2(p.y - this.y, p.x - this.x);
      this.state = 'windup';
      this.tele = g.addTelegraph({ shape: 'line', x: this.x, y: this.y, ang: this.angle, len: D.atkRange, w: 4, dur: D.windup, owner: this, follow: true });
      return;
    }
    if (los && d < D.prefer * 0.6) {
      // Recule
      const a = Math.atan2(this.y - p.y, this.x - p.x);
      g.scene.map.move(this, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
      this.angle = a + Math.PI;
      this.walkT += dt * 8;
    } else if (!los || d > D.prefer * 1.2) {
      this.moveToward(g, p.x, p.y, sp, dt);
    } else {
      this.angle = Math.atan2(p.y - this.y, p.x - this.x);
    }
  }

  aiCaster(dt, g, d, los, sp) {
    const p = g.player;
    const D = this.def;
    if (this.state === 'cast') { this.t -= dt; if (this.t <= 0) { this.state = 'chase'; } return; }
    if (los && d < D.atkRange && this.cd <= 0) {
      this.state = 'cast';
      this.t = 0.7;
      this.cd = D.cd * rand(0.8, 1.2);
      const n = this.elite ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const ox = i ? rand(-70, 70) : 0, oy = i ? rand(-70, 70) : 0;
        g.addTelegraph({ shape: 'circle', x: p.x + p.kbx * 0.1 + ox, y: p.y + oy, r: D.aoeR, dur: D.windup, dmg: this.dmg, owner: null, color: 'purple', onFire: (gg, t) => { gg.fx.burst(t.x, t.y, '#9b5cff', 18, 160, 0.5, 4, { glow: true }); sfx('boom'); } });
      }
      sfx('cast', { x: this.x, y: this.y });
      return;
    }
    if (!los || d > 230) this.moveToward(g, p.x, p.y, sp, dt);
    else if (d < 150) {
      const a = Math.atan2(this.y - p.y, this.x - p.x);
      g.scene.map.move(this, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
      this.angle = a + Math.PI;
    } else this.angle = Math.atan2(p.y - this.y, p.x - this.x);
  }

  // ---------------- BOSS ----------------
  updateBoss(dt, g, d) {
    const p = g.player;
    const map = g.scene.map;
    if (!this.engaged) {
      if (!p.dead && d < this.def.aggro && map.lineOfSight(this.x, this.y, p.x, p.y)) {
        this.engaged = true;
        this.state = 'chase';
        this.cd = 1.2;
        g.onBossEngaged(this);
      }
      return;
    }
    if (p.dead) return;
    const hpPct = this.hp / this.maxHp;
    if (this.phase === 1 && hpPct < 0.5) {
      this.phase = 2;
      g.fx.text(this.x, this.y - 50, 'FUREUR !', '#ff5040', 22, { bold: true, life: 1.5 });
      g.fx.shake(10);
      sfx('bossRoar');
    }
    if (this.summons.length && hpPct < this.summons[0] && this.state === 'chase') {
      this.summons.shift();
      for (let i = 0; i < 3; i++) {
        const a = rand(0, TAU);
        g.spawnEnemy('squelette', this.x + Math.cos(a) * 70, this.y + Math.sin(a) * 70, Math.max(1, this.level - 1), false, true);
      }
      g.fx.burst(this.x, this.y, '#d8d2c0', 30, 250, 0.6, 5);
      sfx('bossRoar');
      this.state = 'recover'; this.t = 0.8;
      return;
    }

    const k = this.phase === 2 ? 0.78 : 1;
    const sp = this.speed * (this.phase === 2 ? 1.2 : 1) * this.speedMult();

    if (this.dashing) {
      const b = this.dashing;
      b.t += dt;
      const blocked = map.move(this, Math.cos(b.ang) * 820 * dt, Math.sin(b.ang) * 820 * dt);
      g.fx.burst(this.x, this.y, '#cfc4a8', 2, 40, 0.4, 5);
      if (!b.hit && dist(this.x, this.y, p.x, p.y) < this.r + p.r) { b.hit = true; g.hurtPlayer(this.dmg * 1.3, this); }
      if (b.t > b.dur || blocked) {
        this.dashing = null;
        this.state = 'recover'; this.t = blocked ? 1.0 : 0.6;
        if (blocked) { this.stun = 0.8; g.fx.shake(8); g.fx.text(this.x, this.y - 40, 'Sonné !', '#e8c547', 16); sfx('boom'); }
      }
      return;
    }

    switch (this.state) {
      case 'recover':
        this.t -= dt;
        if (this.t <= 0) this.state = 'chase';
        return;
      case 'windup':
        if (this.tele && this.tele.done) { this.tele = null; this.state = 'recover'; this.t = 0.5 * k; }
        return;
      case 'cast':
        this.t -= dt;
        if (this.t <= 0) { this.state = 'recover'; this.t = 0.3; }
        return;
    }

    // chase
    if (d > 70) this.moveToward(g, p.x, p.y, sp, dt);
    else this.angle = Math.atan2(p.y - this.y, p.x - this.x);
    if (this.cd > 0) return;

    const opts = [
      { w: d < 170 ? 4 : 0.5, v: 'slam' },
      { w: 2, v: 'circles' },
      { w: d > 140 ? 2.5 : 0.8, v: 'charge' },
    ];
    if (this.phase === 2) opts.push({ w: d < 220 ? 3 : 0.5, v: 'nova' });
    const atk = weightedPick(opts);
    sfx('bossWindup', { x: this.x, y: this.y });
    this.angle = Math.atan2(p.y - this.y, p.x - this.x);
    this.cd = (this.phase === 2 ? 0.9 : 1.4) * rand(0.85, 1.15);

    if (atk === 'slam') {
      this.state = 'windup';
      this.tele = g.addTelegraph({ shape: 'cone', x: this.x, y: this.y, r: 150, ang: this.angle, arc: 140, dur: 0.85 * k, dmg: this.dmg * 1.2, owner: this, follow: true, onFire: (gg) => { gg.fx.shake(7); sfx('boom'); } });
    } else if (atk === 'circles') {
      this.state = 'cast'; this.t = 0.6;
      const n = this.phase === 2 ? 8 : 5;
      for (let i = 0; i < n; i++) {
        const ox = i ? rand(-130, 130) : 0, oy = i ? rand(-130, 130) : 0;
        g.addTelegraph({ shape: 'circle', x: p.x + ox, y: p.y + oy, r: 58, dur: (1.0 + i * 0.06) * k, dmg: this.dmg * 0.9, owner: null, onFire: (gg, t) => { gg.fx.burst(t.x, t.y, '#d8d2c0', 14, 160, 0.45, 4); sfx('boom'); } });
      }
      sfx('cast');
    } else if (atk === 'charge') {
      this.state = 'windup';
      const ang = this.angle;
      this.tele = g.addTelegraph({ shape: 'rect', x: this.x, y: this.y, ang, len: 430, w: this.r * 2 + 10, dur: 0.85 * k, owner: this, follow: true, onFire: () => { this.dashing = { t: 0, dur: 0.5, ang, hit: false }; sfx('heavy'); } });
    } else if (atk === 'nova') {
      this.state = 'windup';
      this.tele = g.addTelegraph({ shape: 'circle', x: this.x, y: this.y, r: 175, dur: 1.05, dmg: this.dmg * 1.1, owner: this, follow: true, onFire: (gg) => { gg.fx.burst(this.x, this.y, '#ff6040', 50, 380, 0.6, 5, { glow: true }); gg.fx.shake(10); sfx('boom'); } });
    }
  }

  // ---------------- RENDU ----------------
  // Animation du sprite selon l'état de l'IA
  spriteState(time) {
    const name = SPRITE_OF[this.type];
    const dir = dirFromAngle(this.angle);
    const D = this.def;
    if (this.dead) {
      const k = 1 - Math.max(0, this.deadT) / (this.deathMax || 0.7);
      return { anim: 'hurt', frame: Math.min(5.99, k * 9), dir: 0, alpha: k > 0.75 ? 1 - (k - 0.75) * 4 : 1 };
    }
    if (this.spawnT > 0) return { anim: 'hurt', frame: 5.99 * (this.spawnT / 0.7), dir: 0 }; // se relève du sol
    if (this.stun > 0) return { anim: 'walk', frame: 0, dir, rot: Math.sin(time * 9) * 0.05 };
    const tp = this.tele ? Math.min(1, this.tele.t / this.tele.dur) : 0;
    const ranged = D.ai === 'ranged';
    if (this.boss && this.dashing) return { anim: 'run', frame: walkFrame(name, 'run', time * 16), dir };
    if (this.lunge) return { anim: 'attack', frame: 3 + Math.min(2.99, this.lunge.t * 14), dir };
    if (this.state === 'windup') return { anim: 'attack', frame: ranged ? tp * 8.99 : tp * 2.6, dir };
    if (this.state === 'cast') return { anim: 'attack', frame: Math.min(6.99, (1 - this.t / 0.7) * 7), dir };
    if (this.state === 'recover') {
      const k = Math.max(0, Math.min(1, 1 - this.t / 0.45));
      return { anim: 'attack', frame: ranged ? 9 + k * 3.99 : 3 + k * 2.99, dir };
    }
    if (this.state === 'chase' || (this.mvx && Math.abs(this.mvx) + Math.abs(this.mvy) > 20)) {
      const fast = this.speed * this.speedMult() > 120;
      return { anim: fast ? 'run' : 'walk', frame: walkFrame(name, fast ? 'run' : 'walk', this.walkT * (fast ? 0.9 : 1.2)), dir };
    }
    return { anim: 'walk', frame: 0, dir, squashY: 1 + 0.012 * Math.sin(time * 2 + this.x) };
  }

  draw(ctx, time) {
    const sprName = SPRITE_OF[this.type];
    if (hasSprite(sprName)) {
      const sc = this.boss ? 1.7 : this.elite ? 1.14 : 1;
      if (!this.dead && this.elite) {
        ctx.strokeStyle = `rgba(200,150,70,${0.3 + 0.2 * Math.sin(time * 4)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(this.x, this.y, 18 * sc, 7 * sc, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (!this.dead && this.poison) {
        ctx.fillStyle = 'rgba(110,150,60,0.25)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y, 16 * sc, 6 * sc, 0, 0, Math.PI * 2); ctx.fill();
      }
      const st = this.spriteState(time);
      drawSprite(ctx, sprName, this.x, this.y + this.r * 0.55, {
        ...st, scale: sc, flash: this.flash > 0 && !this.dead ? this.flash : 0,
        squashX: (st.squashX || 1) * (1 + (this.squash || 0) * 0.12), squashY: (st.squashY || 1) * (1 - (this.squash || 0) * 0.1),
        shadow: !this.dead || this.deadT > 0.2,
      });
      if (this.stun > 0 && !this.dead) {
        ctx.fillStyle = '#c9b06a';
        for (let i = 0; i < 3; i++) {
          const a = time * 6 + (i * TAU) / 3;
          ctx.beginPath(); ctx.arc(this.x + Math.cos(a) * 10 * sc, this.y - 50 * sc + Math.sin(a) * 3, 2, 0, TAU); ctx.fill();
        }
      }
      return;
    }
    const x = this.x, y = this.y;
    const r = this.r;
    const OUT = '#0a0908';
    ctx.save();
    ctx.translate(x, y);
    // Animation de mort : l'ennemi s'affaisse et se dissout
    let dying = 0;
    if (this.dead) {
      dying = 1 - Math.max(0, this.deadT) / (this.deathMax || 0.7);
      ctx.globalAlpha = Math.max(0, 1 - dying * 1.1);
      ctx.scale(1 + dying * 0.25, 1 - dying * 0.55);
      ctx.rotate(dying * 0.6 * (this.x % 2 ? 1 : -1));
    } else if (this.spawnT > 0) {
      // Invocation : surgit du sol
      const k = 1 - this.spawnT / 0.7;
      ctx.globalAlpha = k;
      ctx.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k);
    }
    if (this.squash > 0) ctx.scale(1 + this.squash * 0.18, 1 - this.squash * 0.14);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(2, r * 0.55, r * 1.1, r * 0.55, 0, 0, TAU); ctx.fill();

    if (this.elite) {
      ctx.strokeStyle = `rgba(200,150,70,${0.35 + 0.2 * Math.sin(time * 4)})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(0, 0, r + 6, time, time + TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.poison) {
      ctx.fillStyle = 'rgba(110,150,60,0.25)';
      ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, TAU); ctx.fill();
    }
    ctx.rotate(this.angle + (this.state === 'chase' && !this.dead ? Math.sin(this.walkT) * 0.08 : 0));
    const white = this.flash > 0 && !this.dead;
    const W = (c) => (white ? '#ffffff' : c);
    const step = Math.sin(this.walkT) * 2;
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = OUT;

    if (this.type === 'rat') {
      ctx.strokeStyle = W('#5a3e34'); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(-r - 8, step * 3, -r - 16, step); ctx.stroke();
      ctx.fillStyle = W('#3e2f26'); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * 0.75, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = W('#4e3b30');
      ctx.beginPath(); ctx.ellipse(-2, 0, r * 0.8, r * 0.45, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = W('#3e2f26');
      ctx.beginPath(); ctx.ellipse(r * 1.1, 0, r * 0.55, r * 0.42, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = W('#7a4a44');
      ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.55, 2.4, 0, TAU); ctx.arc(r * 0.8, r * 0.55, 2.4, 0, TAU); ctx.fill();
    } else if (this.type === 'squelette' || this.type === 'archer') {
      const bone = W('#b9b19c'), dark = W('#6e6656');
      // bras / arme
      if (this.type === 'squelette') {
        const lift = this.state === 'windup' ? -0.6 : 0;
        ctx.save(); ctx.rotate(lift);
        ctx.strokeStyle = bone; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, r * 0.7); ctx.lineTo(8, r * 0.75); ctx.stroke();
        ctx.strokeStyle = OUT; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(6, r * 0.75); ctx.lineTo(r + 18, r * 0.6); ctx.stroke();
        ctx.strokeStyle = W('#5e584e'); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(6, r * 0.75); ctx.lineTo(r + 18, r * 0.6); ctx.stroke();
        ctx.restore();
      } else {
        ctx.strokeStyle = OUT; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(2, 0, r + 4, -1.1, 1.1); ctx.stroke();
        ctx.strokeStyle = W('#4a3626'); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(2, 0, r + 4, -1.1, 1.1); ctx.stroke();
        ctx.strokeStyle = '#9a9384'; ctx.lineWidth = 0.8;
        const pull = this.state === 'windup' ? -7 : 0;
        ctx.beginPath(); ctx.moveTo(2 + Math.cos(-1.1) * (r + 4), Math.sin(-1.1) * (r + 4)); ctx.lineTo(2 + pull, 0); ctx.lineTo(2 + Math.cos(1.1) * (r + 4), Math.sin(1.1) * (r + 4)); ctx.stroke();
      }
      // cage thoracique
      ctx.fillStyle = W('#1c1a17');
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(-1, 0, r * 0.75, r, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = bone; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.3, 0); ctx.stroke();
      for (let i = -2; i <= 2; i++) {
        if (!i) continue;
        ctx.beginPath(); ctx.moveTo(-r * 0.3 + Math.abs(i) * -1.5, 0); ctx.quadraticCurveTo(-r * 0.1, i * 3.2, -r * 0.55, i * 3.6); ctx.stroke();
      }
      // épaules
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(0, -r * 0.75, 2.6, 0, TAU); ctx.arc(0, r * 0.75, 2.6, 0, TAU); ctx.fill();
      // crâne
      ctx.fillStyle = bone; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(r * 0.45, 0, r * 0.5, r * 0.45, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0a0908';
      ctx.fillRect(r * 0.62, -2.6, 2.2, 2); ctx.fillRect(r * 0.62, 0.8, 2.2, 2);
      if (this.type === 'archer') {
        ctx.fillStyle = W('#2c2620');
        ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.5, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
      }
    } else if (this.type === 'acolyte') {
      // robe
      ctx.fillStyle = W('#1d1426'); ctx.strokeStyle = OUT; ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(r * 1.0, 0);
      ctx.quadraticCurveTo(r * 0.4, -r * 1.15, -r * 1.1, -r * 0.95 + step);
      ctx.lineTo(-r * 0.75, 0);
      ctx.lineTo(-r * 1.1, r * 0.95 - step);
      ctx.quadraticCurveTo(r * 0.4, r * 1.15, r * 1.0, 0);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = W('#4a2f5e'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.6); ctx.lineTo(r * 0.5, -r * 0.4); ctx.moveTo(-r * 0.9, r * 0.6); ctx.lineTo(r * 0.5, r * 0.4); ctx.stroke();
      // capuche
      ctx.fillStyle = W('#2a1d36');
      ctx.beginPath(); ctx.arc(r * 0.25, 0, r * 0.58, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#050406';
      ctx.beginPath(); ctx.ellipse(r * 0.5, 0, r * 0.28, r * 0.36, 0, 0, TAU); ctx.fill();
      // mains + grimoire
      ctx.fillStyle = W('#3a2a1e');
      ctx.fillRect(r * 0.75, -4, 6, 8);
      if (this.state === 'cast') {
        ctx.fillStyle = `rgba(150,110,210,${0.5 + 0.4 * Math.sin(time * 20)})`;
        ctx.beginPath(); ctx.arc(r * 1.05, 0, 4, 0, TAU); ctx.fill();
      }
    } else if (this.boss) {
      const bone = W('#c4bba4');
      // couperet
      const lift = this.state === 'windup' ? -0.7 : 0;
      ctx.save(); ctx.rotate(lift);
      ctx.fillStyle = W('#2f2a26'); ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.fillRect(r * 0.2, r * 0.72, r * 1.5, 7); ctx.strokeRect(r * 0.2, r * 0.72, r * 1.5, 7);
      ctx.fillStyle = W('#5c5852');
      ctx.beginPath(); ctx.moveTo(r * 1.1, r * 0.45); ctx.lineTo(r * 2.2, r * 0.3); ctx.lineTo(r * 2.25, r * 1.25); ctx.lineTo(r * 1.1, r * 1.15); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,40,30,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(r * 2.2, r * 0.4); ctx.lineTo(r * 2.2, r * 1.1); ctx.stroke();
      ctx.restore();
      // manteau en lambeaux
      ctx.fillStyle = W('#1c1714'); ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * 0.5 + (i / 12) * Math.PI;
        const rr = r * (1.05 + (i % 2) * 0.22) + Math.sin(time * 3 + i) * 1.5;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // torse osseux
      ctx.fillStyle = W('#26211c');
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.95, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = bone; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.3, 0); ctx.stroke();
      for (let i = -3; i <= 3; i++) { if (!i) continue; ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.quadraticCurveTo(-r * 0.05, i * 7, -r * 0.55, i * 7.5); ctx.stroke(); }
      // épaulières à pointes
      for (const sy of [-1, 1]) {
        ctx.fillStyle = W('#3a342e'); ctx.strokeStyle = OUT; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, sy * r * 0.85, r * 0.32, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = bone;
        ctx.beginPath(); ctx.moveTo(-3, sy * r * 0.85); ctx.lineTo(-r * 0.2, sy * r * 1.35); ctx.lineTo(4, sy * r * 0.95); ctx.fill();
      }
      // crâne cornu
      ctx.fillStyle = W('#1a1512');
      ctx.beginPath(); ctx.moveTo(r * 0.35, -r * 0.35); ctx.quadraticCurveTo(-r * 0.2, -r * 1.0, -r * 0.35, -r * 1.45); ctx.quadraticCurveTo(r * 0.1, -r * 0.9, r * 0.7, -r * 0.45); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.35, r * 0.35); ctx.quadraticCurveTo(-r * 0.2, r * 1.0, -r * 0.35, r * 1.45); ctx.quadraticCurveTo(r * 0.1, r * 0.9, r * 0.7, r * 0.45); ctx.fill(); ctx.stroke();
      ctx.fillStyle = bone; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(r * 0.55, 0, r * 0.45, r * 0.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0a0706';
      ctx.fillRect(r * 0.75, -r * 0.12, r * 0.35, 3);
    }
    if (this.stun > 0) {
      ctx.rotate(-this.angle);
      ctx.fillStyle = '#c9b06a';
      for (let i = 0; i < 3; i++) {
        const a = time * 6 + (i * TAU) / 3;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.7, -r - 6 + Math.sin(a) * 3, 2, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  // Yeux lumineux, dessinés par-dessus l'obscurité.
  drawEyes(ctx) {
    if (this.dead || this.type === 'rat' || this.spawnT > 0) return;
    if (hasSprite(SPRITE_OF[this.type])) {
      const dir = dirFromAngle(this.angle);
      if (dir === 0) return; // de dos
      const sc = this.boss ? 1.7 : this.elite ? 1.14 : 1;
      const hy = this.y + this.r * 0.55 - (this.type === 'acolyte' ? 41 : 40) * sc;
      const col = this.type === 'acolyte' ? 'rgba(190,140,240,0.9)' : this.boss ? 'rgba(255,70,40,0.95)' : 'rgba(240,90,50,0.85)';
      ctx.fillStyle = col;
      const s2 = this.boss ? 1.6 : 1.1;
      if (dir === 2) { ctx.fillRect(this.x - 3 * sc - s2 / 2, hy, s2, s2); ctx.fillRect(this.x + 3 * sc - s2 / 2, hy, s2, s2); }
      else ctx.fillRect(this.x + (dir === 3 ? 4 : -4) * sc - s2 / 2, hy, s2, s2);
      return;
    }
    const r = this.r;
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    const ex = this.x + c * r * (this.boss ? 0.7 : 0.6);
    const ey = this.y + s * r * (this.boss ? 0.7 : 0.6);
    const off = this.boss ? 7 : 3.2;
    const col = this.type === 'acolyte' ? '#b48ae0' : this.boss ? '#ff3a22' : '#e0502e';
    ctx.fillStyle = col;
    const sz = this.boss ? 3.5 : 1.8;
    ctx.beginPath();
    ctx.arc(ex - s * off, ey + c * off, sz, 0, TAU);
    ctx.arc(ex + s * off, ey - c * off, sz, 0, TAU);
    ctx.fill();
  }
}
