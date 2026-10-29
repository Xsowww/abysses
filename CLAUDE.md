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
- `js/game/hero.js` : dessin des personnages joueurs (aussi utilisé pour les portraits de l’écran de classe).
- `js/game/player.js`, `enemy.js` : entités. Le joueur tire des projectiles si l’arme est `ranged` (Rôdeur). Les attaques ennemies passent par des « télégraphes » (`game.addTelegraph`) : zones rouges qui infligent les dégâts à la fin. La roulade donne des frames d’invulnérabilité.
- `js/game/render.js` : la carte est pré-rendue dans un canvas (`map.cache`), éclairage = calque d’obscurité percé par des sprites de lumière. Avec les tuiles chargées : `buildDungeonTiles` (faces de murs sur 2 cases, dessus noirs à bordure automatique, sols selon la profondeur) et `buildVillageTiles` (herbe, chemins de terre à raccords automatiques). Les objets en relief (`scene.props` : maisons, arbres, colonnes…) sont triés en profondeur avec les personnages (`scene.propEnts`).
- `js/game/sprites.js` : personnages animés LPC (atlas `assets/sprites/`, générés par `tools/build_sprites.py` depuis le Universal LPC Spritesheet Generator).
- `js/game/equip.js` : apparence du joueur selon l'équipement porté. Calques LPC par pièce dans `assets/equip/` (chargés à la demande), superposés par profondeur z ; le type de casque/plastron/etc. vient du premier mot du nom de l'objet, la couleur du palier de matériau (`ilvl`). L'arme décide de l'animation d'attaque (`ATTACKS`). Chaîne de construction : `tools/equip_recipes.py` (recettes) → `tools/lpc_download.js` (export « Split by animation and item » du générateur) → `tools/build_equip.py`.
- `js/ui/icons.js` : icônes d'objets en pixel art (`assets/icons/icons.png` + `icons.json`, CC0, `tools/build_icons.py`) choisies par catégorie et palier ; silhouettes SVG en repli.
- `js/game/tiles.js` : décors LPC (atlas `assets/tiles/tiles.png` + `tiles.json`, générés par `tools/build_tiles.py` depuis les packs OpenGameArt ; les maisons y sont assemblées). Type de tuile `T.PROP` = case solide occupée par un objet.
- `js/game/inventory.js` : sac (30), poche sécurisée (max 4), coffre (60), équipement.
- `js/ui/ui.js` : HUD + panneaux en DOM (innerHTML + délégation d’événements via `data-action` / `data-ref`).
- `js/data/sets.js` : ensembles d’équipement (rareté 5 « Ensemble », vert). Pièces faibles seules ; bonus au palier le plus haut atteint (2 / 3 / complet) appliqués dans `player.recalc()`. Stats spéciales : `killHeal`, `rollHeal`, `eliteDmg`, `goldFind`. Butin via `game.dropExtras()` (élites, coffres, Gardiens).
- Matériaux de forge (`fer`, `bronze`, `braise`, `larme`) et reliques de quête (`cierge`, `ossement`) = consommables `material` / `relic` dans `CONSUMABLES`. Perdus à la mort s’ils sont dans le sac → la poche sécurisée sert à les rapporter. Brann renforce l’équipement de +1 à +5 (`game.upgradeItem`, débloqué par la quête `b_fer`).
- Quêtes : objectifs `bring`, `lorecount`, `setpieces`, `upgrade` en plus des anciens. `game.syncQuests()` valide les objectifs déjà accomplis (profondeur atteinte, Gardien tué, fragment lu…) dès l’acceptation : la trame reste cohérente même si le joueur a foncé. Contrats renouvelables de Lisette : `js/data/contracts.js` (stockés dans `pd.contracts`, accès via `questDef` / `allQuests`). Après une quête principale, l’étape suivante s’enchaîne si elle est chez le même PNJ, sinon le suivi affiche « ◆ Histoire : parlez à … ».
- Village : PNJ à quêtes Aldric, Brann, Odile, Maëlis, Anselme (chapelain), Gaspard (fossoyeur), Mira (antiquaire, ensembles), Lisette (aubergiste, contrats) + villageois/gardes qui se promènent (`scene.wanderers`) et murmurent des rumeurs.
- États visuels (même langage partout, section « ÉTATS » de `css/style.css`) : or = maîtrisé/équipé/terminé, argent = partiel/en cours, braise qui pulse = disponible, gris = rien à faire, sombre = verrouillé, rouge = impossible.
- `js/data/*` : tout l’équilibrage (objets, talents, monstres, quêtes) est ici. `story.js` : prologue, Gardiens, fragments de lore, inscriptions, répliques des PNJ. Les quêtes ont des répliques `intro` / `outro`.
- `js/core/audio.js` : son spatial (`sfx(nom, {x, y})`) + réverbération. Vrais échantillons dans `assets/sfx/` (manifeste `manifest.json`, clé `vol` = volume par son ; `step_stone`/`step_dirt` selon la surface) ; la synthèse sert de repli.
- `js/core/music.js` : `playMusic('village' | 'dungeon' | 'boss' | 'title')`, `playAmbience`. Joue les fichiers de `assets/music/manifest.json` (Kevin MacLeod) en boucle avec fondus ; musique générée en repli.
- **Crédits obligatoires** (licences CC-BY / CC-BY-SA) : écran « Crédits » du menu, lu depuis `assets/credits.json`, régénéré par `python3 -I tools/build_credits.py .` (sprites, tuiles, sons, musiques). Tout nouvel asset doit y être ajouté.

## Direction artistique
Sombre, pixel art (Souls-like). Polices : *Jacquard 24* (gothique pixel) réservée aux grands titres (logo, noms de zones, bannières, boss, noms de classes) — illisible en petit ; *Pixelify Sans* pour tout le reste (pas d’italique : `font-synthesis: none`). Interface habillée avec le pack pixel art `assets/ui/` (« Tiny RPG Dark Dwellers GUI », CC0, recoloré ; métadonnées et découpes 9-slice dans `assets/ui/ui.json`) via `border-image`, affiché à ×2 (×3 pour jauges/carte) avec `image-rendering: pixelated` — voir la section « HABILLAGE PIXEL ART » à la fin de `css/style.css`. Palette : or `#e0ae6a`, os `#d6cebd`, braise, sang. Viseur et curseurs : `assets/ui/*_x2|x3.png`. Éviter tout retour à un style « interface générique » (traits fins, dégradés CSS).

## Performances
Le monde est dessiné dans `#game` à sa résolution native (`renderer.k`, ≈ 1 pixel du jeu = 1 pixel du canvas) puis agrandi sans lissage ; les textes nets passent par `#overlay` (`renderOverlay`). Le brouillard est composé en très basse résolution. Le HUD n’écrit dans le DOM que ce qui change. Éviter les `filter` / `mix-blend-mode` CSS plein écran.

## Règles de jeu importantes (décidées avec l’utilisateur)
- L’équipement **porté** n’est jamais perdu, même s’il a été trouvé pendant l’expédition.
- Les objets trouvés en expédition ont `found: true`. À la mort, les objets `found` du **sac** sont supprimés ; ceux de la **poche sécurisée** sont gardés. L’or ramassé (`pd.runGold`) est perdu.
- Fermer le jeu pendant une expédition (`pd.inRun`) = mort au prochain chargement.
- Les piles de consommables `found` ne fusionnent pas avec les piles du village.
- Armes et mains gauches sont réservées à une classe (`itemClass`) ; le butin est à 85 % adapté à la classe du joueur (`game.loot`).

## Ton et histoire
Ambiance Souls : récit fragmentaire et mélancolique, protagoniste sans mémoire, PNJ ambigus (Maëlis cache que sa lignée doit sonner le 13ᵉ coup). Acte I terminé (épilogue après le Roi sans cloche, profondeur 5) ; l’Acte II doit révéler qui a pris le battant de la Cloche Noire (indice : « au-delà des eaux » → les îles).
Progression volontairement lente (`xpForLevel` = 100 × niveau^1,85).

## Pistes prévues
Classe Mage, îles / nouveaux biomes et boss, plus de quêtes, amélioration d’objets chez le forgeron, support manette (Gamepad API), sprites de monstres supplémentaires (générateur LPC).
