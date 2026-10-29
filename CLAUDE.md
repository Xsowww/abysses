# Les Abysses — notes pour Claude

Jeu web 2D vue du dessus (action-RPG / roguelite à extraction). JavaScript pur en modules ES, Canvas 2D, **aucune dépendance ni étape de build**. Toute l’interface et le texte du jeu sont **en français**.

## Lancer / tester
- `python3 -m http.server 8765` à la racine, puis ouvrir http://localhost:8765.
- `window.__game` expose l’instance `Game` dans la console (pratique pour tester : `__game.enterDungeon(1)`, `__game.addXp(5000)`).
- Tester avec Playwright (préinstallé) : capturer `pageerror`, prendre des captures d’écran, simuler clavier/souris.

## Architecture
- `js/main.js` : boucle `requestAnimationFrame`, raccourcis de panneaux, pause.
- `js/core/input.js` : touches reconfigurables. Stockées par `event.code` (physique) → ZQSD en AZERTY = WASD en QWERTY. Les boutons de souris sont `Mouse0/1/2`.
- `js/game/game.js` : classe `Game` (scènes village/donjon, combat, butin, quêtes, mort/extraction, commerce, talents).
- `js/game/player.js`, `enemy.js` : entités. Les attaques ennemies passent par des « télégraphes » (`game.addTelegraph`) : zones rouges qui infligent les dégâts à la fin. La roulade donne des frames d’invulnérabilité.
- `js/game/render.js` : la carte est pré-rendue dans un canvas (`map.cache`), éclairage = calque d’obscurité percé par des sprites de lumière.
- `js/game/inventory.js` : sac (30), poche sécurisée (max 4), coffre (60), équipement.
- `js/ui/ui.js` : HUD + panneaux en DOM (innerHTML + délégation d’événements via `data-action` / `data-ref`).
- `js/data/*` : tout l’équilibrage (objets, talents, monstres, quêtes) est ici.

## Règles de jeu importantes (décidées avec l’utilisateur)
- L’équipement **porté** n’est jamais perdu, même s’il a été trouvé pendant l’expédition.
- Les objets trouvés en expédition ont `found: true`. À la mort, les objets `found` du **sac** sont supprimés ; ceux de la **poche sécurisée** sont gardés. L’or ramassé (`pd.runGold`) est perdu.
- Fermer le jeu pendant une expédition (`pd.inRun`) = mort au prochain chargement.
- Les piles de consommables `found` ne fusionnent pas avec les piles du village.

## Pistes prévues
Classes Rôdeur et Mage, îles / nouveaux biomes et boss, plus de quêtes, amélioration d’objets chez le forgeron, support manette (Gamepad API), sprites (packs libres type Kenney).
