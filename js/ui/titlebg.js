// Fond animé de l'écran titre : un gouffre qui respire, des braises qui montent, de la brume.

let raf = null;

export function startTitleBg(canvas) {
  stopTitleBg();
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const embers = Array.from({ length: 90 }, () => newEmber(true));
  function newEmber(any) {
    return { x: Math.random(), y: any ? Math.random() : 1.05, v: 0.015 + Math.random() * 0.04, s: 0.6 + Math.random() * 1.8, ph: Math.random() * 6.28, hot: Math.random() < 0.35 };
  }
  // Brume pré-rendue
  const fog = document.createElement('canvas');
  fog.width = fog.height = 512;
  const fg = fog.getContext('2d');
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = 60 + Math.random() * 120;
    for (const ox of [-512, 0, 512]) {
      const g = fg.createRadialGradient(x + ox, y, 0, x + ox, y, r);
      g.addColorStop(0, 'rgba(150,160,165,0.07)');
      g.addColorStop(1, 'rgba(150,160,165,0)');
      fg.fillStyle = g;
      fg.fillRect(x + ox - r, y - r, r * 2, r * 2);
    }
  }
  // Fondu vertical de la brume (pas de bord net)
  fg.globalCompositeOperation = 'destination-in';
  const vm = fg.createLinearGradient(0, 0, 0, 512);
  vm.addColorStop(0, 'rgba(0,0,0,0)');
  vm.addColorStop(0.35, 'rgba(0,0,0,1)');
  vm.addColorStop(0.65, 'rgba(0,0,0,1)');
  vm.addColorStop(1, 'rgba(0,0,0,0)');
  fg.fillStyle = vm;
  fg.fillRect(0, 0, 512, 512);
  let last = performance.now();
  let t = 0;
  const frame = (now) => {
    if (!canvas.isConnected) { raf = null; return; }
    if (canvas.clientWidth !== w || canvas.clientHeight !== h) resize();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    ctx.fillStyle = '#060607';
    ctx.fillRect(0, 0, w, h);
    // Gouffre : anneaux concentriques qui s'enfoncent
    const cx = w / 2, cy = h * 0.62;
    for (let i = 0; i < 14; i++) {
      const k = ((i / 14) + t * 0.035) % 1;
      const rx = w * 0.75 * (1 - k) + 20, ry = rx * 0.32;
      ctx.strokeStyle = `rgba(150,170,165,${0.08 * (1 - k) * k * 4})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy + (1 - k) * 40, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.45);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.35, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.45, w * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    // Lueur froide au fond
    const g2 = ctx.createRadialGradient(cx, cy + 10, 0, cx, cy + 10, 160);
    g2.addColorStop(0, `rgba(80,140,135,${0.10 + 0.04 * Math.sin(t * 0.8)})`);
    g2.addColorStop(1, 'rgba(80,140,135,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(cx - 200, cy - 200, 400, 400);
    // Brume
    const off = (t * 12) % 512;
    ctx.globalAlpha = 0.9;
    for (let x = -off - 512; x < w + 512; x += 1024) {
      ctx.drawImage(fog, x, h * 0.25, 1024, h * 0.9);
    }
    ctx.globalAlpha = 1;
    // Braises
    for (const e of embers) {
      e.y -= e.v * dt;
      e.x += Math.sin(t * 0.7 + e.ph) * 0.0004;
      if (e.y < -0.05) Object.assign(e, newEmber(false));
      const a = Math.min(1, e.y * 2) * (0.5 + 0.5 * Math.sin(t * 3 + e.ph));
      ctx.fillStyle = e.hot ? `rgba(220,130,60,${a})` : `rgba(190,180,165,${a * 0.6})`;
      ctx.fillRect(e.x * w, e.y * h, e.s, e.s);
    }
    // Vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

export function stopTitleBg() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
}
