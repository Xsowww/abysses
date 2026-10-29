// Télécharge l'export « ZIP: Split by animation and item » pour chaque recette donnée.
const { chromium } = require('playwright');
const fs = require('fs');
const R = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = process.argv[3];
const only = process.argv.slice(4);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
  const base = 'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/';
  await p.goto(base, { timeout: 90000 }); await p.waitForTimeout(4000);
  for (const [name, hash] of Object.entries(R)) {
    if (only.length && !only.includes(name)) continue;
    const dir = `${OUT}/${name}`; fs.mkdirSync(dir, { recursive: true });
    await p.goto(base + '#' + hash.replace(/ /g, '%20'), { timeout: 90000 });
    await p.reload(); await p.waitForTimeout(6000);
    for (const [label, file] of [['ZIP: Split by animation and item', 'layers.zip'], ['Credits (CSV)', 'credits.csv'], ['Spritesheet (PNG)', 'full.png']]) {
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 240000 }), p.getByText(label, { exact: true }).first().click()]);
      await dl.saveAs(`${dir}/${file}`);
    }
    console.log('ok', name);
  }
  await b.close();
})();
