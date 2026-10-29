// Point d'entrée : initialisation et boucle de jeu.
import { input } from './core/input.js';
import { unlockAudio } from './core/audio.js';
import { UI } from './ui/ui.js';
import { Game } from './game/game.js';
import { loadSprites } from './game/sprites.js';
import { loadTiles } from './game/tiles.js';

const canvas = document.getElementById('game');
input.attach(canvas);

const ui = new UI();
const game = new Game(canvas, ui);
ui.setGame(game);
window.__game = game; // pratique pour déboguer depuis la console

input.onRawKey((code) => {
  unlockAudio();
  if (code === 'Escape') ui.escape();
  else ui.onKey(code);
});

function handleHotkeys() {
  if (ui.storyState) return;
  if (!game.running || !game.pd || ui.screenOpen || ui.summaryOpen || input.rebinding) return;
  if (input.wasPressed('inventory')) ui.toggle('inventory');
  else if (input.wasPressed('talents')) ui.toggle('talents');
  else if (input.wasPressed('journal')) ui.toggle('journal');
  if (input.wasPressed('map')) ui.mapBig = !ui.mapBig;
}

let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  handleHotkeys();
  if (game.running && !ui.isPaused()) game.update(dt);
  if (game.scene) {
    game.render();
    ui.updateHud(dt);
  }
  input.endFrame();
  requestAnimationFrame(frame);
}

Promise.all([loadSprites(), loadTiles()]).finally(() => { ui.showTitle(); requestAnimationFrame(frame); });
