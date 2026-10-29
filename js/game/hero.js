// Dessin du personnage joueur (vue du dessus), réutilisé pour les portraits de sélection de classe.
import { TAU } from '../core/util.js';

const OUT = '#0b0a09';

function metal(flash, base = '#5d5e62') { return flash ? '#ffffff' : base; }

// o : { cls, angle, time, moving, walkT, flash, eq, roll, whirlT, swing, alpha, scale, bowDraw }
export function drawHero(ctx, x, y, o) {
  const s = o.scale || 1;
  const t = o.time || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = o.alpha ?? 1;

  // Ombre portée
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(2, 8, 15, 8, 0, 0, TAU);
  ctx.fill();

  const ang = o.whirlT !== undefined && o.whirlT !== null ? o.whirlT * 18 : o.angle;
  ctx.rotate(ang);
  if (o.roll) {
    const k = Math.sin(o.roll * Math.PI);
    ctx.scale(1 - 0.3 * k, 1 + 0.12 * k);
  }
  const step = o.moving ? Math.sin(o.walkT || 0) : 0;
  const fl = o.flash > 0;

  if (o.cls === 'rodeur') drawRanger(ctx, o, fl, step, t);
  else drawWarrior(ctx, o, fl, step, t);

  ctx.restore();
}

function cape(ctx, color, step, t, len = 22, width = 12) {
  const sway = Math.sin(t * 3) * 1.5 + step * 2;
  ctx.fillStyle = color;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2, -width);
  ctx.quadraticCurveTo(-len * 0.6, -width - 2 + sway, -len, -width * 0.7 + sway * 1.5);
  ctx.lineTo(-len - 2, 0 + sway);
  ctx.lineTo(-len, width * 0.7 + sway * 1.5);
  ctx.quadraticCurveTo(-len * 0.6, width + 2 + sway, -2, width);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // plis
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(-6, -5); ctx.lineTo(-len + 2, -4 + sway);
  ctx.moveTo(-6, 5); ctx.lineTo(-len + 2, 4 + sway);
  ctx.stroke();
}

function drawWarrior(ctx, o, fl, step, t) {
  const eq = o.eq || {};
  cape(ctx, fl ? '#fff' : '#4a1712', step, t);
  // Bouclier (bras gauche)
  if (eq.offhand) {
    ctx.save();
    ctx.translate(5, -13);
    ctx.fillStyle = fl ? '#fff' : '#3b2a1c';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = fl ? '#fff' : '#7a6448';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 3, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#8a8580';
    ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // Torse (armure)
  ctx.fillStyle = metal(fl, '#4b4c50');
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 12.5, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#6a6b70';
  ctx.beginPath(); ctx.ellipse(1.5, -2, 5, 7, 0, 0, TAU); ctx.fill();
  // Tabard
  ctx.fillStyle = fl ? '#fff' : '#6e1f17';
  ctx.fillRect(-3, -3, 9, 6);
  // Épaulières
  for (const sy of [-1, 1]) {
    ctx.fillStyle = metal(fl, '#55565b');
    ctx.strokeStyle = OUT;
    ctx.beginPath(); ctx.ellipse(-0.5, sy * 10.5, 5.5, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = fl ? '#fff' : '#8d8e92';
    ctx.beginPath(); ctx.arc(0.5, sy * 10, 1.4, 0, TAU); ctx.fill();
  }
  // Casque
  ctx.fillStyle = metal(fl, '#5a5b60');
  ctx.strokeStyle = OUT;
  ctx.beginPath(); ctx.arc(2, 0, 6.2, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#7d7e83';
  ctx.beginPath(); ctx.arc(1, -1.8, 2.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#060505';
  ctx.fillRect(6.2, -3.6, 1.6, 7.2); // fente de la visière
  ctx.fillStyle = fl ? '#fff' : '#3a3b3f';
  ctx.fillRect(-4, -0.8, 6, 1.6); // crête
  // Arme
  if (!o.swing && (o.whirlT === undefined || o.whirlT === null)) drawWarriorWeapon(ctx, eq.weapon, 0.85 - step * 0.05, 1);
  else if (o.whirlT !== undefined && o.whirlT !== null) drawWarriorWeapon(ctx, eq.weapon, 0, 1);
}

export function drawWarriorWeapon(ctx, w, offsetAng, scale = 1) {
  ctx.save();
  ctx.rotate(offsetAng);
  const type = w ? w.base : null;
  const len = (type === 'espadon' ? 40 : type === 'marteau' ? 34 : 28) * Math.min(1.4, scale);
  // main
  ctx.fillStyle = '#2a2420';
  ctx.beginPath(); ctx.arc(10, 0, 3, 0, TAU); ctx.fill();
  if (!type) { ctx.restore(); return; }
  ctx.strokeStyle = OUT;
  if (type === 'masse' || type === 'marteau') {
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(10 + len, 0); ctx.stroke();
    ctx.strokeStyle = '#4a3422'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(10 + len, 0); ctx.stroke();
    ctx.fillStyle = '#6f7075'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    if (type === 'marteau') { ctx.fillRect(4 + len, -8, 11, 16); ctx.strokeRect(4 + len, -8, 11, 16); }
    else {
      ctx.beginPath(); ctx.arc(10 + len, 0, 6, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9a9b9f';
      for (let i = 0; i < 4; i++) { const a = (i * TAU) / 4 + 0.6; ctx.beginPath(); ctx.arc(10 + len + Math.cos(a) * 6, Math.sin(a) * 6, 1.6, 0, TAU); ctx.fill(); }
    }
  } else if (type === 'hache') {
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(10 + len, 0); ctx.stroke();
    ctx.strokeStyle = '#4a3422'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(10 + len, 0); ctx.stroke();
    ctx.fillStyle = '#85878c'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(len + 2, -1); ctx.quadraticCurveTo(len + 10, -13, len + 17, -10); ctx.lineTo(len + 11, 1); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else {
    // lame
    const wdt = type === 'espadon' ? 5 : 3.6;
    ctx.fillStyle = '#9ea1a6';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(14, -wdt / 2); ctx.lineTo(10 + len, -wdt / 2); ctx.lineTo(14 + len, 0); ctx.lineTo(10 + len, wdt / 2); ctx.lineTo(14, wdt / 2); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(8 + len, 0); ctx.stroke();
    // garde
    ctx.fillStyle = '#5a4a32';
    ctx.fillRect(12, -6, 3, 12);
  }
  ctx.restore();
}

function drawRanger(ctx, o, fl, step, t) {
  const eq = o.eq || {};
  cape(ctx, fl ? '#fff' : '#26301d', step, t, 20, 12);
  // Carquois dans le dos
  if (eq.offhand) {
    ctx.save();
    ctx.translate(-6, -5);
    ctx.rotate(-0.5);
    ctx.fillStyle = fl ? '#fff' : '#4a3320';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.fillRect(-9, -3, 13, 6);
    ctx.strokeRect(-9, -3, 13, 6);
    ctx.fillStyle = '#c9c0ad';
    for (let i = 0; i < 3; i++) ctx.fillRect(-12, -2.5 + i * 2.2, 3, 1.4);
    ctx.restore();
  }
  // Corps (cuir)
  ctx.fillStyle = fl ? '#fff' : '#3d3a2c';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 11.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fl ? '#fff' : '#544f3b';
  ctx.beginPath(); ctx.ellipse(1, -2, 4.5, 6, 0, 0, TAU); ctx.fill();
  // Sangle
  ctx.strokeStyle = fl ? '#fff' : '#2a1d12';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(5, 8); ctx.stroke();
  // Épaules
  for (const sy of [-1, 1]) {
    ctx.fillStyle = fl ? '#fff' : '#3f4a2e';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(0, sy * 9.5, 4.5, 3.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }
  // Capuche (goutte pointant vers l'arrière)
  ctx.fillStyle = fl ? '#fff' : '#33402a';
  ctx.strokeStyle = OUT;
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.quadraticCurveTo(-3, -8, 4, -6.5);
  ctx.arc(3, 0, 6.5, -1.2, 1.2);
  ctx.quadraticCurveTo(-3, 8, -9, 0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Visage dans l'ombre
  ctx.fillStyle = '#0d0c0a';
  ctx.beginPath(); ctx.ellipse(6, 0, 2.6, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c9b48f';
  ctx.fillRect(6.6, -1.8, 1, 1); ctx.fillRect(6.6, 0.8, 1, 1);
  // Arc
  if (eq.weapon) drawBow(ctx, eq.weapon, o.bowDraw || 0, fl);
}

export function drawBow(ctx, w, draw = 0, fl = false) {
  const type = w.base;
  const cross = type === 'arbalete';
  ctx.save();
  if (cross) {
    ctx.fillStyle = fl ? '#fff' : '#4a3422';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.fillRect(4, -2, 22, 4); ctx.strokeRect(4, -2, 22, 4);
    ctx.strokeStyle = '#6f7075'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(22, -12); ctx.quadraticCurveTo(27, 0, 22, 12); ctx.stroke();
    ctx.strokeStyle = '#c9c0ad'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(22, -12); ctx.lineTo(16 - draw * 3, 0); ctx.lineTo(22, 12); ctx.stroke();
  } else {
    const big = type === 'arc';
    const h = big ? 17 : 13;
    ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(10, -h); ctx.quadraticCurveTo(22, 0, 10, h); ctx.stroke();
    ctx.strokeStyle = fl ? '#fff' : '#6a4a2a'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(10, -h); ctx.quadraticCurveTo(22, 0, 10, h); ctx.stroke();
    const sx = 10 - draw * 8;
    ctx.strokeStyle = '#d6cdb8'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(10, -h); ctx.lineTo(sx, 0); ctx.lineTo(10, h); ctx.stroke();
    if (draw > 0.05) {
      ctx.strokeStyle = '#cfc6b0'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 22, 0); ctx.stroke();
    }
  }
  ctx.fillStyle = '#1c1612';
  ctx.beginPath(); ctx.arc(12, 0, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}
