// Gestion clavier / souris avec touches entièrement reconfigurables.
// On stocke les touches par "code physique" (event.code) : ZQSD sur AZERTY = WASD sur QWERTY.

const BIND_KEY = 'abysses_bindings_v1';

export const ACTIONS = [
  { id: 'up', label: 'Avancer', def: 'KeyW' },
  { id: 'down', label: 'Reculer', def: 'KeyS' },
  { id: 'left', label: 'Aller à gauche', def: 'KeyA' },
  { id: 'right', label: 'Aller à droite', def: 'KeyD' },
  { id: 'attack', label: 'Attaque de base', def: 'Mouse0' },
  { id: 'special', label: 'Attaque spéciale', def: 'Mouse2' },
  { id: 'roll', label: 'Roulade', def: 'Space' },
  { id: 'skill1', label: 'Compétence 1', def: 'Digit1' },
  { id: 'skill2', label: 'Compétence 2', def: 'Digit2' },
  { id: 'skill3', label: 'Compétence 3', def: 'Digit3' },
  { id: 'skill4', label: 'Compétence 4', def: 'Digit4' },
  { id: 'potion', label: 'Boire une potion', def: 'KeyQ' },
  { id: 'interact', label: 'Interagir / Ramasser', def: 'KeyE' },
  { id: 'stone', label: 'Pierre de retour', def: 'KeyR' },
  { id: 'inventory', label: 'Inventaire', def: 'KeyI' },
  { id: 'talents', label: 'Arbre de talents', def: 'KeyN' },
  { id: 'journal', label: 'Journal de quêtes', def: 'KeyJ' },
  { id: 'map', label: 'Agrandir la carte', def: 'Tab' },
];

const SPECIAL_LABELS = {
  Space: 'Espace', Tab: 'Tab', Enter: 'Entrée', Backspace: 'Retour',
  ShiftLeft: 'Maj G', ShiftRight: 'Maj D', ControlLeft: 'Ctrl G', ControlRight: 'Ctrl D',
  AltLeft: 'Alt', AltRight: 'Alt Gr', CapsLock: 'Verr. Maj',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Mouse0: 'Clic G', Mouse1: 'Clic milieu', Mouse2: 'Clic D', Mouse3: 'Souris 4', Mouse4: 'Souris 5',
};

const learned = {};
let layoutMap = null;
try {
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
    navigator.keyboard.getLayoutMap().then((m) => (layoutMap = m)).catch(() => {});
  }
} catch (e) { /* navigateur sans support */ }

export function codeLabel(code) {
  if (!code) return '—';
  if (SPECIAL_LABELS[code]) return SPECIAL_LABELS[code];
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Pavé ' + code.slice(6);
  if (/^F\d+$/.test(code)) return code;
  const l = (layoutMap && layoutMap.get(code)) || learned[code];
  if (l) return l.toUpperCase();
  if (code.startsWith('Key')) return code.slice(3);
  return code;
}

class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0 };
    this.bindings = {};
    this.rebinding = null; // { id, cb }
    this.listeners = []; // callbacks(code) pour les touches "brutes" (Échap, etc.)
    this.canvas = null;
    this.loadBindings();
  }

  loadBindings() {
    for (const a of ACTIONS) this.bindings[a.id] = a.def;
    try {
      const saved = JSON.parse(localStorage.getItem(BIND_KEY) || 'null');
      if (saved) for (const k in saved) if (k in this.bindings) this.bindings[k] = saved[k];
    } catch (e) { /* ignore */ }
  }

  saveBindings() {
    try { localStorage.setItem(BIND_KEY, JSON.stringify(this.bindings)); } catch (e) { /* ignore */ }
  }

  resetBindings() {
    for (const a of ACTIONS) this.bindings[a.id] = a.def;
    this.saveBindings();
  }

  label(actionId) { return codeLabel(this.bindings[actionId]); }

  attach(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    window.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    canvas.addEventListener('mousedown', (e) => {
      if (this.rebinding) return;
      const c = 'Mouse' + e.button;
      this.down.add(c);
      this.pressed.add(c);
      e.preventDefault();
    });
    // Capture des clics pour le menu de touches (n'importe où sur la page)
    window.addEventListener('mousedown', (e) => {
      if (!this.rebinding) return;
      if (e.target && e.target.closest && e.target.closest('[data-cancel-rebind]')) return;
      e.preventDefault();
      e.stopPropagation();
      this.finishRebind('Mouse' + e.button);
    }, true);
    window.addEventListener('mouseup', (e) => this.down.delete('Mouse' + e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('contextmenu', (e) => { if (this.rebinding) e.preventDefault(); });
  }

  onKeyDown(e) {
    if (e.key && e.key.length === 1) learned[e.code] = e.key;
    const tag = e.target && e.target.tagName;
    if (this.rebinding) {
      e.preventDefault();
      if (e.code === 'Escape') { this.cancelRebind(); return; }
      this.finishRebind(e.code);
      return;
    }
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (Object.values(this.bindings).includes(e.code)) e.preventDefault();
    if (!e.repeat) {
      this.down.add(e.code);
      this.pressed.add(e.code);
      for (const l of this.listeners) l(e.code);
    }
  }

  onRawKey(cb) { this.listeners.push(cb); }

  startRebind(id, cb) { this.rebinding = { id, cb }; }
  cancelRebind() { const r = this.rebinding; this.rebinding = null; if (r) r.cb(false); }
  finishRebind(code) {
    const r = this.rebinding;
    if (!r) return;
    // Si la touche est déjà utilisée, on échange les deux actions.
    const old = this.bindings[r.id];
    for (const k in this.bindings) if (k !== r.id && this.bindings[k] === code) this.bindings[k] = old;
    this.bindings[r.id] = code;
    this.saveBindings();
    // On attend la fin de l'événement pour éviter de déclencher l'action tout de suite.
    setTimeout(() => { this.rebinding = null; r.cb(true); }, 0);
  }

  isDown(id) { return this.down.has(this.bindings[id]); }
  wasPressed(id) { return this.pressed.has(this.bindings[id]); }
  endFrame() { this.pressed.clear(); }
  clear() { this.down.clear(); this.pressed.clear(); }
}

export const input = new Input();
