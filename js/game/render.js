// Rendu : carte pré-calculée, entités, éclairage dynamique et mini-carte.
import { TILE, T } from './world.js';
import { hash2, TAU, clamp, dist } from '../core/util.js';
import { itemColor, itemName } from '../data/items.js';

const LIGHT_SCALE = 0.5;

function makeLightSprite(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, `rgba(${color},1)`);
  grd.addColorStop(0.35, `rgba(${color},0.75)`);
  grd.addColorStop(0.7, `rgba(${color},0.25)`);
  grd.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return c;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d');
    this.sprites = {
      mask: makeLightSprite('0,0,0'),
      warm: makeLightSprite('255,150,60'),
      purple: makeLightSprite('150,90,255'),
      green: makeLightSprite('90,230,140'),
      blue: makeLightSprite('110,180,255'),
      red: makeLightSprite('255,60,40'),
      white: makeLightSprite('255,240,220'),
    };
    this.minimapImg = null;
    this.minimapTimer = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.light.width = Math.ceil(this.w * LIGHT_SCALE);
    this.light.height = Math.ceil(this.h * LIGHT_SCALE);
    this.zoom = clamp(Math.min(this.w / 1280, this.h / 760), 0.7, 1.6);
  }

  // ---------- Carte pré-calculée ----------
  buildCache(scene) {
    const map = scene.map;
    const c = document.createElement('canvas');
    c.width = map.w * TILE;
    c.height = map.h * TILE;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    for (let ty = 0; ty < map.h; ty++) {
      for (let tx = 0; tx < map.w; tx++) {
        this.drawTile(g, map, tx, ty, scene.type);
      }
    }
    if (scene.type === 'dungeon') this.drawWallShadows(g, map);
    if (scene.houses) for (const h of scene.houses) this.drawHouse(g, h);
    if (scene.decor) for (const d of scene.decor) this.drawDecor(g, d);
    map.cache = c;
  }

  drawTile(g, map, tx, ty, type) {
    const t = map.get(tx, ty);
    const x = tx * TILE, y = ty * TILE;
    const h = hash2(tx, ty, 1), h2 = hash2(tx, ty, 2), h3 = hash2(tx, ty, 3);
    if (t === T.FLOOR) {
      const l = 17 + h * 4;
      g.fillStyle = `hsl(28, 7%, ${l - 6}%)`;
      g.fillRect(x, y, TILE, TILE);
      // dalles (2 par tuile, décalées)
      const off = ty % 2 ? 8 : 0;
      g.fillStyle = `hsl(28, 7%, ${l}%)`;
      g.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      g.fillStyle = `hsl(28, 7%, ${l - 6}%)`;
      g.fillRect(x + 8 + off, y + 1, 1, TILE - 2);
      g.fillStyle = `hsl(28, 7%, ${l + 3}%)`;
      g.fillRect(x + 1, y + 1, TILE - 2, 1);
      if (h2 < 0.14) {
        g.strokeStyle = `hsl(28, 7%, ${l - 7}%)`;
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(x + h3 * 20 + 4, y + 6); g.lineTo(x + 14, y + 16); g.lineTo(x + 10 + h * 14, y + 28); g.stroke();
      }
      if (h3 < 0.06) { g.fillStyle = 'rgba(70,90,50,0.22)'; g.fillRect(x + 4, y + 4, 24, 24); }
    } else if (t === T.WALL) {
      const isF = (i, j) => map.get(tx + i, ty + j) === T.FLOOR;
      let near = false;
      for (let j = -1; j <= 1 && !near; j++) for (let i = -1; i <= 1; i++) if (isF(i, j)) { near = true; break; }
      if (!near) return;
      // dessus du mur : sombre
      g.fillStyle = `hsl(265, 14%, ${6 + h * 2}%)`;
      g.fillRect(x, y, TILE, TILE);
      g.fillStyle = 'hsl(265, 10%, 30%)';
      if (isF(-1, 0)) g.fillRect(x, y, 2, TILE);
      if (isF(1, 0)) g.fillRect(x + TILE - 2, y, 2, TILE);
      if (isF(0, -1)) g.fillRect(x, y, TILE, 2);
      if (isF(0, 1)) {
        // face avant en briques
        const fh = 18;
        const fy = y + TILE - fh;
        g.fillStyle = `hsl(260, 8%, ${24 + h * 3}%)`;
        g.fillRect(x, fy, TILE, fh);
        g.fillStyle = 'hsl(260, 10%, 14%)';
        g.fillRect(x, fy + 6, TILE, 1);
        g.fillRect(x, fy + 12, TILE, 1);
        const o1 = (tx * 7) % 16;
        g.fillRect(x + o1, fy, 1, 6);
        g.fillRect(x + o1 + 16 > x + TILE ? x + o1 - 16 : x + o1 + 16, fy, 1, 6);
        g.fillRect(x + ((o1 + 8) % 16), fy + 6, 1, 6);
        g.fillRect(x + ((o1 + 8) % 16) + 16, fy + 6, 1, 6);
        g.fillRect(x + o1, fy + 12, 1, 6);
        g.fillStyle = 'hsl(260, 10%, 36%)';
        g.fillRect(x, fy, TILE, 2);
      }
    } else if (t === T.GRASS || t === T.TREE) {
      g.fillStyle = `hsl(${95 + h * 15}, 22%, ${15 + h2 * 4}%)`;
      g.fillRect(x, y, TILE, TILE);
      g.strokeStyle = `hsla(90, 30%, 30%, 0.5)`;
      g.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const bx = x + hash2(tx, ty, 10 + k) * 28 + 2, by = y + hash2(tx, ty, 20 + k) * 28 + 4;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 1, by - 4); g.stroke();
      }
      if (t === T.TREE) {
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.beginPath(); g.ellipse(x + 18, y + 22, 20, 12, 0, 0, TAU); g.fill();
        g.fillStyle = '#3a2a1a';
        g.fillRect(x + 13, y + 14, 6, 12);
        g.fillStyle = `hsl(${110 + h * 30}, 30%, ${12 + h2 * 6}%)`;
        g.beginPath(); g.arc(x + 16, y + 10, 17, 0, TAU); g.fill();
        g.fillStyle = `hsl(${110 + h * 30}, 28%, ${17 + h2 * 6}%)`;
        g.beginPath(); g.arc(x + 12, y + 6, 9, 0, TAU); g.fill();
      }
    } else if (t === T.PATH) {
      g.fillStyle = `hsl(30, 22%, ${24 + h * 4}%)`;
      g.fillRect(x, y, TILE, TILE);
      g.fillStyle = 'hsla(30, 15%, 40%, 0.6)';
      for (let k = 0; k < 3; k++) g.fillRect(x + hash2(tx, ty, 30 + k) * 28, y + hash2(tx, ty, 40 + k) * 28, 2, 2);
    } else if (t === T.PLAZA || t === T.PORTAL_FLOOR || (t === T.FENCE && !(tx === 0 || ty === 0 || tx === map.w - 1 || ty === map.h - 1))) {
      g.fillStyle = 'hsl(30, 5%, 20%)';
      g.fillRect(x, y, TILE, TILE);
      for (let k = 0; k < 4; k++) {
        const sx = x + (k % 2) * 16 + 1, sy = y + Math.floor(k / 2) * 16 + 1;
        g.fillStyle = `hsl(30, 6%, ${27 + hash2(tx * 2 + (k % 2), ty * 2 + (k >> 1), 5) * 8}%)`;
        g.fillRect(sx, sy, 14, 14);
      }
      if (t === T.PORTAL_FLOOR) { g.fillStyle = 'rgba(80,40,140,0.35)'; g.fillRect(x, y, TILE, TILE); }
    } else if (t === T.WATER) {
      g.fillStyle = 'hsl(30, 5%, 30%)';
      g.fillRect(x, y, TILE, TILE);
      g.fillStyle = `hsl(205, 45%, ${20 + h * 4}%)`;
      g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    } else if (t === T.FENCE) {
      g.fillStyle = 'hsl(100, 20%, 14%)';
      g.fillRect(x, y, TILE, TILE);
      g.fillStyle = '#4a321e';
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 6 + k * 10, y + 16, 5, 0, TAU); g.fill(); }
      g.fillStyle = '#6a4a2e';
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 5 + k * 10, y + 14, 2.5, 0, TAU); g.fill(); }
    }
  }

  drawWallShadows(g, map) {
    // Ombre portée des murs sur le sol (sous chaque mur).
    for (let ty = 1; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
      if (map.get(tx, ty) === T.FLOOR && map.get(tx, ty - 1) === T.WALL) {
        const grd = g.createLinearGradient(0, ty * TILE, 0, ty * TILE + 12);
        grd.addColorStop(0, 'rgba(0,0,0,0.5)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(tx * TILE, ty * TILE, TILE, 12);
      }
    }
  }

  drawHouse(g, h) {
    const x = h.x * TILE, y = h.y * TILE, w = h.w * TILE, hh = h.h * TILE;
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(x + 6, y + 8, w, hh);
    // façade
    g.fillStyle = '#4a3a2a';
    g.fillRect(x, y + hh - 26, w, 26);
    g.fillStyle = '#2a1e14';
    for (let k = 0; k < w; k += 24) g.fillRect(x + k, y + hh - 26, 2, 26);
    // porte
    g.fillStyle = '#1e140c';
    g.fillRect(x + w / 2 - 10, y + hh - 22, 20, 22);
    g.fillStyle = '#c8a46a';
    g.fillRect(x + w / 2 + 5, y + hh - 11, 2, 2);
    // fenêtres
    g.fillStyle = '#e8b04a';
    g.fillRect(x + 18, y + hh - 18, 12, 9);
    g.fillRect(x + w - 30, y + hh - 18, 12, 9);
    // toit
    g.fillStyle = h.roof;
    g.fillRect(x - 4, y - 4, w + 8, hh - 22);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 1;
    for (let k = 0; k < hh - 26; k += 8) { g.beginPath(); g.moveTo(x - 4, y - 4 + k); g.lineTo(x + w + 4, y - 4 + k); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(x - 4, y - 4, w + 8, (hh - 22) / 2);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(x - 4, y + (hh - 22) / 2 - 5, w + 8, 3);
    // enseigne
    g.font = 'bold 13px Georgia, serif';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillText(h.name, x + w / 2 + 1, y + (hh - 22) / 2 + 17);
    g.fillStyle = '#e8d9b0';
    g.fillText(h.name, x + w / 2, y + (hh - 22) / 2 + 16);
  }

  drawDecor(g, d) {
    g.save();
    g.translate(d.x, d.y);
    g.rotate(d.rot);
    if (d.kind === 'bone') {
      g.fillStyle = 'rgba(200,190,170,0.55)';
      g.fillRect(-6, -1, 12, 2);
      g.beginPath(); g.arc(-6, 0, 2, 0, TAU); g.arc(6, 0, 2, 0, TAU); g.fill();
    } else if (d.kind === 'skull') {
      g.fillStyle = 'rgba(210,200,180,0.6)';
      g.beginPath(); g.arc(0, 0, 4.5, 0, TAU); g.fill();
      g.fillStyle = 'rgba(20,10,10,0.8)';
      g.fillRect(-2.5, -1, 2, 2); g.fillRect(0.5, -1, 2, 2);
    } else if (d.kind === 'rubble') {
      g.fillStyle = 'rgba(90,80,95,0.8)';
      g.fillRect(-4, -3, 6, 5); g.fillRect(2, 0, 4, 3);
    } else {
      g.strokeStyle = 'rgba(0,0,0,0.4)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(-8, -4); g.lineTo(0, 0); g.lineTo(6, -6); g.moveTo(0, 0); g.lineTo(3, 7); g.stroke();
    }
    g.restore();
  }

  // ---------- Rendu principal ----------
  render(game) {
    const ctx = this.ctx;
    const s = game.scene;
    const z = this.zoom;
    const dpr = this.dpr;
    const fx = game.fx;
    const cx = game.cam.x + fx.shakeX / z, cy = game.cam.y + fx.shakeY / z;
    const time = game.time;
    const vw = this.w / z, vh = this.h / z;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -cx * dpr * z, -cy * dpr * z);
    ctx.imageSmoothingEnabled = false;

    // Carte
    const cache = s.map.cache;
    if (cache) {
      const sx = Math.max(0, Math.floor(cx)), sy = Math.max(0, Math.floor(cy));
      const sw = Math.min(cache.width - sx, Math.ceil(vw) + 2), sh = Math.min(cache.height - sy, Math.ceil(vh) + 2);
      if (sw > 0 && sh > 0) ctx.drawImage(cache, sx, sy, sw, sh, sx, sy, sw, sh);
    }

    const inView = (x, y, m = 80) => x > cx - m && x < cx + vw + m && y > cy - m && y < cy + vh + m;

    // Fontaine animée (village)
    if (s.type === 'village') this.drawVillageDynamic(ctx, s, time);

    // Interactifs
    for (const o of s.interactables) if (inView(o.x, o.y)) this.drawInteractable(ctx, o, time, game);

    // Butin au sol
    for (const d of s.drops) if (inView(d.x, d.y)) this.drawDrop(ctx, d, time);

    // Torches / braseros
    for (const t of s.torches) if (inView(t.x, t.y)) this.drawFlame(ctx, t.x, t.y - 6, time, 0.8);
    for (const b of s.braziers) if (inView(b.x, b.y)) this.drawBrazier(ctx, b, time);

    // Entités triées par y
    const ents = [];
    for (const e of s.enemies) if (!e.dead && inView(e.x, e.y)) ents.push(e);
    if (!game.player.dead) ents.push(game.player);
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.draw(ctx, time);

    // Projectiles
    for (const p of s.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(4, 0); ctx.stroke();
      ctx.fillStyle = '#ddd';
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(1, -3); ctx.lineTo(1, 3); ctx.fill();
      ctx.restore();
    }

    fx.drawParticles(ctx);

    // ----- Éclairage -----
    this.drawLighting(game, cx, cy);

    // ----- Par-dessus l'obscurité -----
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -cx * dpr * z, -cy * dpr * z);
    for (const t of s.telegraphs) this.drawTelegraph(ctx, t, time);
    for (const e of s.enemies) if (!e.dead && inView(e.x, e.y)) e.drawEyes(ctx);
    // Barres de vie des ennemis blessés et proches
    const p = game.player;
    for (const e of s.enemies) {
      if (e.dead || e.boss || e.hp >= e.maxHp) continue;
      if (dist(e.x, e.y, p.x, p.y) > 420) continue;
      const w = e.r * 2.4;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(e.x - w / 2 - 1, e.y - e.r - 12, w + 2, 5);
      ctx.fillStyle = e.elite ? '#e8b030' : '#c0352b';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 11, w * Math.max(0, e.hp / e.maxHp), 3);
    }
    // Noms / étiquettes
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const o of s.interactables) {
      if (o.type !== 'npc' || !inView(o.x, o.y)) continue;
      ctx.font = 'bold 12px Georgia, serif';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(o.label, o.x + 1, o.y - 29);
      ctx.fillStyle = '#f0e0b8';
      ctx.fillText(o.label, o.x, o.y - 30);
      ctx.font = '10px Georgia, serif';
      ctx.fillStyle = '#a89878';
      ctx.fillText(o.npc.title, o.x, o.y - 19);
      const mark = this.questMark(game, o.id);
      if (mark) {
        const bob = Math.sin(time * 4) * 3;
        ctx.font = 'bold 22px Georgia, serif';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(mark.c, o.x + 1, o.y - 49 + bob);
        ctx.fillStyle = mark.color;
        ctx.fillText(mark.c, o.x, o.y - 50 + bob);
      }
    }
    // Étiquettes du butin proche
    ctx.font = '11px Georgia, serif';
    for (const d of s.drops) {
      if (!d.item || d.item.kind !== 'equip' || dist(d.x, d.y, p.x, p.y) > 170) continue;
      const name = itemName(d.item);
      const tw = ctx.measureText(name).width;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(d.x - tw / 2 - 4, d.y - 26, tw + 8, 14);
      ctx.fillStyle = itemColor(d.item);
      ctx.fillText(name, d.x, d.y - 19);
    }
    fx.drawTexts(ctx);

    // Vignette
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.vignette || this.vignette.w !== this.canvas.width) {
      const g = ctx.createRadialGradient(this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.35, this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.85);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      this.vignette = { w: this.canvas.width, g };
    }
    ctx.fillStyle = this.vignette.g;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Flash rouge quand le joueur a peu de vie
    if (!p.dead && p.hp / p.maxHp < 0.3) {
      ctx.fillStyle = `rgba(160,0,0,${0.12 + 0.08 * Math.sin(time * 6)})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  questMark(game, npcId) {
    if (game.questsOf(npcId, 'ready').length) return { c: '?', color: '#ffd24a' };
    if (game.questsAvailable(npcId).length) return { c: '!', color: '#ffd24a' };
    if (game.questsOf(npcId, 'active').length) return { c: '?', color: '#8a8a8a' };
    return null;
  }

  drawLighting(game, cx, cy) {
    const s = game.scene;
    const lc = this.lctx;
    const L = this.light;
    const z = this.zoom * LIGHT_SCALE;
    const time = game.time;
    const darkness = s.type === 'dungeon' ? 0.93 : 0.58;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, L.width, L.height);
    lc.fillStyle = `rgba(3,2,8,${darkness})`;
    lc.fillRect(0, 0, L.width, L.height);
    lc.globalCompositeOperation = 'destination-out';

    const lights = [];
    const p = game.player;
    const flick = (k) => 1 + Math.sin(time * 9 + k) * 0.04 + Math.sin(time * 23 + k * 3) * 0.03;
    if (!p.dead || s.type === 'village') lights.push({ x: p.x, y: p.y, r: (s.type === 'dungeon' ? 340 : 280) * flick(0), a: 1, c: 'warm', g: 0.1 });
    for (const t of s.torches) lights.push({ x: t.x, y: t.y, r: 190 * flick(t.x), a: 0.85, c: 'warm', g: 0.18 });
    for (const b of s.braziers) lights.push({ x: b.x, y: b.y, r: 230 * flick(b.y), a: 0.9, c: 'warm', g: 0.22 });
    for (const o of s.interactables) {
      if (o.type === 'extract') lights.push({ x: o.x, y: o.y, r: 200, a: 0.8, c: 'green', g: 0.3 });
      else if (o.type === 'portal') lights.push({ x: o.x, y: o.y, r: 220, a: 0.8, c: 'purple', g: 0.35 });
      else if (o.type === 'exitPortal') lights.push({ x: o.x, y: o.y, r: 240, a: 0.9, c: 'blue', g: 0.35 });
      else if (o.type === 'npc') lights.push({ x: o.x, y: o.y, r: 110, a: 0.5, c: 'warm', g: 0 });
    }
    for (const pr of s.projectiles) lights.push({ x: pr.x, y: pr.y, r: 60, a: 0.5, c: 'white', g: 0.15 });
    for (const d of s.drops) if (d.item && d.item.kind === 'equip' && d.item.rarity >= 2) lights.push({ x: d.x, y: d.y, r: 70, a: 0.5, c: 'white', g: 0 });
    for (const e of s.enemies) if (!e.dead && e.boss && e.engaged) lights.push({ x: e.x, y: e.y, r: 160, a: 0.6, c: 'red', g: 0.12 });

    const vw = this.w / this.zoom, vh = this.h / this.zoom;
    const vis = (l) => l.x + l.r > cx && l.x - l.r < cx + vw && l.y + l.r > cy && l.y - l.r < cy + vh;
    for (const l of lights) {
      if (!vis(l)) continue;
      const sx = (l.x - cx) * z, sy = (l.y - cy) * z, r = l.r * z;
      lc.globalAlpha = l.a;
      lc.drawImage(this.sprites.mask, sx - r, sy - r, r * 2, r * 2);
    }
    lc.globalAlpha = 1;

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(L, 0, 0, this.canvas.width, this.canvas.height);

    // Halo coloré additif
    ctx.globalCompositeOperation = 'lighter';
    const zz = this.zoom * this.dpr;
    for (const l of lights) {
      if (!l.g || !vis(l)) continue;
      const sx = (l.x - cx) * zz, sy = (l.y - cy) * zz, r = l.r * zz * 0.7;
      ctx.globalAlpha = l.g;
      ctx.drawImage(this.sprites[l.c], sx - r, sy - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
  }

  drawTelegraph(ctx, t, time) {
    const k = clamp(t.t / t.dur, 0, 1);
    const purple = t.color === 'purple';
    const base = purple ? '170,80,255' : '255,50,40';
    ctx.save();
    ctx.translate(t.x, t.y);
    if (t.shape === 'circle') {
      ctx.fillStyle = `rgba(${base},0.13)`;
      ctx.beginPath(); ctx.arc(0, 0, t.r, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(${base},0.28)`;
      ctx.beginPath(); ctx.arc(0, 0, t.r * k, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(${base},0.75)`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, t.r, 0, TAU); ctx.stroke();
    } else if (t.shape === 'cone') {
      const half = (t.arc * Math.PI) / 360;
      ctx.rotate(t.ang);
      ctx.fillStyle = `rgba(${base},0.13)`;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, t.r, -half, half); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(${base},0.3)`;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, t.r * k, -half, half); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(${base},0.7)`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, t.r, -half, half); ctx.closePath(); ctx.stroke();
    } else if (t.shape === 'rect') {
      ctx.rotate(t.ang);
      ctx.fillStyle = `rgba(${base},0.13)`;
      ctx.fillRect(0, -t.w / 2, t.len, t.w);
      ctx.fillStyle = `rgba(${base},0.3)`;
      ctx.fillRect(0, -t.w / 2, t.len * k, t.w);
      ctx.strokeStyle = `rgba(${base},0.7)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(0, -t.w / 2, t.len, t.w);
    } else if (t.shape === 'line') {
      ctx.rotate(t.ang);
      const locked = t.t > t.dur - 0.3;
      ctx.strokeStyle = locked ? `rgba(255,60,40,${0.5 + 0.5 * Math.sin(time * 40)})` : `rgba(255,60,40,${0.15 + 0.35 * k})`;
      ctx.lineWidth = locked ? 2.5 : 1.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(t.len, 0); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  drawFlame(ctx, x, y, time, scale = 1) {
    const f = Math.sin(time * 14 + x) * 1.5;
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath(); ctx.ellipse(x, y - 2, 4 * scale, (8 + f) * scale, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd36a';
    ctx.beginPath(); ctx.ellipse(x, y, 2 * scale, (4 + f * 0.5) * scale, 0, 0, TAU); ctx.fill();
  }

  drawBrazier(ctx, b, time) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 8, 12, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a3438';
    ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a5258';
    ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, TAU); ctx.fill();
    this.drawFlame(ctx, b.x, b.y - 4, time, 1.3);
  }

  drawVillageDynamic(ctx, s, time) {
    // Jet d'eau de la fontaine
    const fx = 23.5 * TILE, fy = 19.5 * TILE;
    ctx.fillStyle = 'rgba(140,190,230,0.25)';
    for (let i = 0; i < 3; i++) {
      const r = ((time * 20 + i * 14) % 42);
      ctx.strokeStyle = `rgba(160,200,240,${0.4 * (1 - r / 42)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = '#6a6a70';
    ctx.beginPath(); ctx.arc(fx, fy, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.7)';
    ctx.beginPath(); ctx.arc(fx, fy - 3 - Math.abs(Math.sin(time * 3)) * 3, 3, 0, TAU); ctx.fill();
  }

  drawInteractable(ctx, o, time, game) {
    const x = o.x, y = o.y;
    if (o.type === 'npc') {
      const N = o.npc;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(x, y + 10, 14, 6, 0, 0, TAU); ctx.fill();
      // regarde le joueur
      const p = game.player;
      const a = dist(x, y, p.x, p.y) < 200 ? Math.atan2(p.y - y, p.x - x) : o.face;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = N.color;
      ctx.strokeStyle = '#1a1410';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(-3, 0, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d9b48f';
      ctx.beginPath(); ctx.arc(3, 0, 6, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (o.type === 'stash') {
      this.drawChestShape(ctx, x, y, false, '#5a3a20', '#c8a46a');
    } else if (o.type === 'chest') {
      this.drawChestShape(ctx, x, y, o.opened, o.rich ? '#4a2a5a' : '#5a3a20', o.rich ? '#ffd24a' : '#a08050');
    } else if (o.type === 'portal' || o.type === 'exitPortal') {
      const col = o.type === 'portal' ? [150, 90, 255] : [110, 180, 255];
      ctx.save();
      ctx.translate(x, y);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(time * (0.6 + i * 0.3));
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.25 + i * 0.15})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 28 - i * 6, 18 - i * 4, 0, 0, TAU * 0.75); ctx.stroke();
      }
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.35)`;
      ctx.beginPath(); ctx.arc(0, 0, 10 + Math.sin(time * 3) * 2, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (o.type === 'extract') {
      const pulse = 0.5 + 0.5 * Math.sin(time * 3);
      ctx.fillStyle = `rgba(90,230,140,${0.12 + pulse * 0.1})`;
      ctx.beginPath(); ctx.arc(x, y, 30, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(90,230,140,${0.5 + pulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 22 + pulse * 6, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#3a4a44';
      ctx.fillRect(x - 7, y - 26, 14, 30);
      ctx.fillStyle = `rgba(140,255,180,${0.6 + pulse * 0.4})`;
      ctx.fillRect(x - 3, y - 22, 6, 20);
    }
  }

  drawChestShape(ctx, x, y, opened, body, trim) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x - 13, y + 4, 28, 8);
    ctx.fillStyle = body;
    ctx.fillRect(x - 13, y - 8, 26, 16);
    ctx.fillStyle = trim;
    ctx.fillRect(x - 13, y - 8, 26, 2);
    ctx.fillRect(x - 2, y - 4, 4, 5);
    if (opened) {
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(x - 11, y - 12, 22, 6);
    } else {
      ctx.fillStyle = trim;
      ctx.fillRect(x - 13, y - 1, 26, 1);
    }
  }

  drawDrop(ctx, d, time) {
    const y = d.y - d.z;
    if (d.gold) {
      ctx.fillStyle = '#b08a20';
      ctx.beginPath(); ctx.arc(d.x, y, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath(); ctx.arc(d.x - 1, y - 1, 3.5, 0, TAU); ctx.fill();
      return;
    }
    const col = itemColor(d.item);
    const rar = d.item.kind === 'equip' ? d.item.rarity : 0;
    if (rar >= 2) {
      // faisceau
      const grd = ctx.createLinearGradient(0, y - 60, 0, y);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, col + '88');
      ctx.fillStyle = grd;
      ctx.fillRect(d.x - 3, y - 60, 6, 60);
    }
    const bob = Math.sin(time * 3 + d.x) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(d.x, d.y + 5, 7, 3, 0, 0, TAU); ctx.fill();
    ctx.save();
    ctx.translate(d.x, y - 2 + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = col;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();
  }

  // ---------- Mini-carte ----------
  drawMinimap(game, canvas, big) {
    const s = game.scene;
    const map = s.map;
    const g = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    // Image des tuiles explorées
    if (!this.minimapImg || this.minimapImg.map !== map || (this.minimapTimer -= 1) <= 0) {
      this.minimapTimer = 10;
      let img = this.minimapImg && this.minimapImg.map === map ? this.minimapImg : null;
      if (!img) {
        const c = document.createElement('canvas');
        c.width = map.w; c.height = map.h;
        img = { map, c, g: c.getContext('2d'), data: null };
        img.data = img.g.createImageData(map.w, map.h);
        this.minimapImg = img;
      }
      const d = img.data.data;
      for (let i = 0; i < map.w * map.h; i++) {
        const t = map.tiles[i];
        let r = 0, gg = 0, b = 0, a = 0;
        if (map.explored[i]) {
          if (t === T.FLOOR || t === T.PLAZA || t === T.PATH || t === T.PORTAL_FLOOR) { r = 120; gg = 110; b = 125; a = 255; }
          else if (t === T.GRASS) { r = 45; gg = 70; b = 40; a = 255; }
          else if (t === T.WATER) { r = 50; gg = 90; b = 140; a = 255; }
          else if (t === T.HOUSE) { r = 110; gg = 60; b = 50; a = 255; }
          else if (t === T.TREE) { r = 25; gg = 50; b = 25; a = 255; }
          else if (t === T.WALL) { r = 40; gg = 34; b = 46; a = 255; }
          else if (t === T.FENCE) { r = 80; gg = 60; b = 40; a = 255; }
        }
        d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = a;
      }
      img.g.putImageData(img.data, 0, 0);
    }
    const p = game.player;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(8,6,12,0.85)';
    g.fillRect(0, 0, W, H);
    // échelle : la carte entière si grande, sinon zone autour du joueur
    let scale, ox, oy;
    if (big || s.type === 'village') {
      scale = Math.min(W / map.w, H / map.h);
      ox = (W - map.w * scale) / 2;
      oy = (H - map.h * scale) / 2;
    } else {
      scale = 3;
      ox = W / 2 - (p.x / TILE) * scale;
      oy = H / 2 - (p.y / TILE) * scale;
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(this.minimapImg.c, ox, oy, map.w * scale, map.h * scale);
    const toM = (x, y) => [ox + (x / TILE) * scale, oy + (y / TILE) * scale];
    const explored = (x, y) => map.explored[Math.floor(y / TILE) * map.w + Math.floor(x / TILE)];
    for (const o of s.interactables) {
      if (!explored(o.x, o.y)) continue;
      const [mx, my] = toM(o.x, o.y);
      let col = null, r = 3;
      if (o.type === 'extract') { col = '#5ae68c'; r = 4; }
      else if (o.type === 'exitPortal') { col = '#6eb4ff'; r = 5; }
      else if (o.type === 'portal') { col = '#a070ff'; r = 4; }
      else if (o.type === 'chest' && !o.opened) col = '#e8c547';
      else if (o.type === 'npc') col = '#f0e0b8';
      else if (o.type === 'stash') col = '#c8a46a';
      if (!col) continue;
      g.fillStyle = col;
      g.beginPath(); g.arc(mx, my, r, 0, TAU); g.fill();
    }
    if (s.boss && !s.boss.dead && explored(s.boss.x, s.boss.y)) {
      const [mx, my] = toM(s.boss.x, s.boss.y);
      g.fillStyle = '#ff4030';
      g.font = `bold ${big ? 16 : 12}px Georgia`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('☠', mx, my);
    }
    const [px, py] = toM(p.x, p.y);
    g.save();
    g.translate(px, py);
    g.rotate(p.angle);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(5, 0); g.lineTo(-4, -3.5); g.lineTo(-4, 3.5); g.closePath(); g.fill();
    g.restore();
  }
}
