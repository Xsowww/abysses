// Particules, textes flottants et tremblement d'écran.
import { rand, TAU } from '../core/util.js';
import { settings } from '../core/save.js';

export class Effects {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.rings = [];
    this.pillars = [];
    this.shakeAmt = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  clear() { this.particles.length = 0; this.texts.length = 0; this.rings.length = 0; this.pillars.length = 0; this.shakeAmt = 0; }

  // Colonne de lumière (montée de niveau, Gardien abattu).
  pillar(x, y, color, life = 1.6) { this.pillars.push({ x, y, color, life, max: life }); }

  ring(x, y, color, r, life = 0.45) { this.rings.push({ x, y, color, r, life, max: life }); }

  burst(x, y, color, n = 8, speed = 120, life = 0.5, size = 3, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.ang !== undefined ? opts.ang + rand(-(opts.spread || 0.6), opts.spread || 0.6) : rand(0, TAU);
      const s = rand(speed * 0.4, speed);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(life * 0.6, life), max: life, size: rand(size * 0.6, size), color,
        drag: opts.drag ?? 3, glow: !!opts.glow, grav: opts.grav || 0,
      });
    }
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
  }

  text(x, y, str, color = '#fff', size = 16, opts = {}) {
    if (!settings.showDamage && opts.damage) return;
    this.texts.push({ x: x + rand(-8, 8), y, str, color, size, life: opts.life || 0.9, max: opts.life || 0.9, vy: opts.vy ?? -55, bold: opts.bold });
    if (this.texts.length > 80) this.texts.shift();
  }

  shake(amount) {
    if (!settings.screenShake) return;
    this.shakeAmt = Math.max(this.shakeAmt, amount);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.grav * dt;
    }
    for (let i = this.pillars.length - 1; i >= 0; i--) { this.pillars[i].life -= dt; if (this.pillars[i].life <= 0) this.pillars.splice(i, 1); }
    for (let i = this.rings.length - 1; i >= 0; i--) { this.rings[i].life -= dt; if (this.rings[i].life <= 0) this.rings.splice(i, 1); }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) { this.texts.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= 1 - 2 * dt;
    }
    if (this.shakeAmt > 0) {
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 40);
      this.shakeX = rand(-1, 1) * this.shakeAmt;
      this.shakeY = rand(-1, 1) * this.shakeAmt;
    } else { this.shakeX = this.shakeY = 0; }
  }

  drawPillars(ctx) {
    for (const p of this.pillars) {
      const k = p.life / p.max;
      const w = 34 * Math.min(1, (1 - k) * 6) * (0.4 + 0.6 * k);
      const g = ctx.createLinearGradient(0, p.y - 260, 0, p.y);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.7, p.color);
      g.addColorStop(1, p.color);
      ctx.globalAlpha = 0.55 * k;
      ctx.fillStyle = g;
      ctx.fillRect(p.x - w / 2, p.y - 260, w, 262);
      ctx.globalAlpha = 0.35 * k;
      ctx.fillRect(p.x - w * 0.15, p.y - 260, w * 0.3, 262);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, w * 1.2, w * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawParticles(ctx) {
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * (0.3 + 0.7 * k), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = p.size * (0.5 + a * 0.5);
      if (p.glow) { ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.6, 0, 6.283); ctx.fill(); }
      else ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const a = Math.min(1, t.life / t.max * 2);
      ctx.globalAlpha = a;
      ctx.font = `${t.bold ? '600 ' : ''}${t.size}px 'Pixelify Sans', sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
