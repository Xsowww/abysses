// Monstres et boss : IA basée sur des attaques "annoncées" (zones rouges) qu'il faut esquiver.
import { ENEMIES, scaleFor } from '../data/enemies.js';
import { rand, TAU, dist, angleDiff, chance, weightedPick } from '../core/util.js';
import { sfx } from '../core/audio.js';

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
    map.move(this, dx * speed * dt, dy * speed * dt);
    this.angle = Math.atan2(dy, dx);
    this.walkT += dt * 8;
  }

  update(dt, g) {
    if (this.dead) return;
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

    if (this.stun > 0) {
      this.stun -= dt;
      if (!this.boss) this.cancelAttack();
      if (this.lunge) this.lunge = null;
      return;
    }

    const d = dist(this.x, this.y, p.x, p.y);

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
          sfx('arrow');
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
      sfx('cast');
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
  draw(ctx, time) {
    if (this.dead) return;
    const x = this.x, y = this.y;
    const r = this.r;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, r * 0.6, r * 1.05, r * 0.45, 0, 0, TAU); ctx.fill();

    if (this.elite || this.boss) {
      ctx.strokeStyle = this.boss ? 'rgba(255,80,60,0.5)' : `rgba(255,200,60,${0.5 + 0.3 * Math.sin(time * 5)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, TAU); ctx.stroke();
    }
    ctx.rotate(this.angle);
    const white = this.flash > 0;
    const D = this.def;
    const body = white ? '#ffffff' : D.color;

    if (this.type === 'rat') {
      ctx.strokeStyle = '#a07a6a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(-r - 8, Math.sin(this.walkT) * 6, -r - 14, 0); ctx.stroke();
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = white ? '#fff' : '#d48a8a';
      ctx.beginPath(); ctx.arc(r * 1.2, 0, 2.5, 0, TAU); ctx.fill();
      ctx.fillStyle = white ? '#fff' : '#5a4030';
      ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.7, 3, 0, TAU); ctx.arc(r * 0.4, r * 0.7, 3, 0, TAU); ctx.fill();
    } else if (this.type === 'squelette' || this.type === 'archer') {
      // arme
      if (this.type === 'squelette') {
        ctx.strokeStyle = '#7a6a55'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(4, r * 0.7); ctx.lineTo(r + 16, r * 0.7); ctx.stroke();
      } else {
        ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(4, 0, r + 4, -1.1, 1.1); ctx.stroke();
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
        const pull = this.state === 'windup' ? -6 : 0;
        ctx.beginPath(); ctx.moveTo(4 + Math.cos(-1.1) * (r + 4), Math.sin(-1.1) * (r + 4)); ctx.lineTo(4 + pull, 0); ctx.lineTo(4 + Math.cos(1.1) * (r + 4), Math.sin(1.1) * (r + 4)); ctx.stroke();
      }
      ctx.fillStyle = body;
      ctx.strokeStyle = '#3a342a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
      // côtes
      ctx.strokeStyle = white ? '#fff' : '#8a8270'; ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.5, i * 4); ctx.lineTo(r * 0.2, i * 4); ctx.stroke(); }
      ctx.fillStyle = white ? '#fff' : '#efe9d8';
      ctx.beginPath(); ctx.arc(r * 0.45, 0, r * 0.5, 0, TAU); ctx.fill();
    } else if (this.type === 'acolyte') {
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(r * 1.2, 0); ctx.lineTo(-r, -r); ctx.lineTo(-r * 0.7, 0); ctx.lineTo(-r, r); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.fill();
      ctx.fillStyle = white ? '#fff' : '#2a1640';
      ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.5, 0, TAU); ctx.fill();
      if (this.state === 'cast') {
        ctx.fillStyle = `rgba(160,90,255,${0.5 + 0.4 * Math.sin(time * 20)})`;
        ctx.beginPath(); ctx.arc(r * 0.9, -r * 0.6, 4, 0, TAU); ctx.arc(r * 0.9, r * 0.6, 4, 0, TAU); ctx.fill();
      }
    } else if (this.boss) {
      // couperet
      ctx.fillStyle = '#5a5048';
      ctx.fillRect(r * 0.2, r * 0.75, r * 1.6, 8);
      ctx.fillStyle = '#9a9088';
      ctx.fillRect(r * 1.2, r * 0.45, r * 0.9, 18);
      ctx.fillStyle = body;
      ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = white ? '#fff' : '#8a7a62'; ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.6, i * 7); ctx.lineTo(r * 0.1, i * 7); ctx.stroke(); }
      // cornes
      ctx.fillStyle = white ? '#fff' : '#3a2a20';
      ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.5); ctx.lineTo(r * 0.1, -r * 1.35); ctx.lineTo(r * 0.75, -r * 0.6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.5); ctx.lineTo(r * 0.1, r * 1.35); ctx.lineTo(r * 0.75, r * 0.6); ctx.fill();
      ctx.fillStyle = white ? '#fff' : '#f2ead6';
      ctx.beginPath(); ctx.arc(r * 0.5, 0, r * 0.45, 0, TAU); ctx.fill();
    }
    if (this.stun > 0) {
      ctx.rotate(-this.angle);
      ctx.fillStyle = '#e8c547';
      for (let i = 0; i < 3; i++) {
        const a = time * 6 + (i * TAU) / 3;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.7, -r - 6 + Math.sin(a) * 3, 2.5, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  // Yeux lumineux, dessinés par-dessus l'obscurité.
  drawEyes(ctx) {
    if (this.dead || this.type === 'rat') return;
    const r = this.r;
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    const ex = this.x + c * r * (this.boss ? 0.7 : 0.6);
    const ey = this.y + s * r * (this.boss ? 0.7 : 0.6);
    const off = this.boss ? 7 : 3.2;
    const col = this.type === 'acolyte' ? '#c08aff' : this.boss ? '#ff4030' : '#ff5a3a';
    ctx.fillStyle = col;
    const sz = this.boss ? 3.5 : 1.8;
    ctx.beginPath();
    ctx.arc(ex - s * off, ey + c * off, sz, 0, TAU);
    ctx.arc(ex + s * off, ey - c * off, sz, 0, TAU);
    ctx.fill();
  }
}
