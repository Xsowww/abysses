// Sauvegarde locale (dans le navigateur).

const SAVE_KEY = 'abysses_save_v1';
const SETTINGS_KEY = 'abysses_settings_v1';

export function saveGame(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
}

export function loadGame() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

export function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

export const settings = {
  volume: 0.5,
  pauseInMenus: true,
  screenShake: true,
  showDamage: true,
};

try {
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
  if (s) Object.assign(settings, s);
} catch (e) { /* ignore */ }

export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
