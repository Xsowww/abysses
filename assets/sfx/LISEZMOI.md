# Sons optionnels

Le jeu synthétise tous ses sons. Vous pouvez remplacer n'importe lequel par un vrai enregistrement :

1. Déposez vos fichiers (`.ogg`, `.mp3` ou `.wav`) dans ce dossier.
2. Listez-les dans `manifest.json`, par nom de son. Plusieurs fichiers = variantes jouées au hasard :

```json
{
  "hit": ["hit1.ogg", "hit2.ogg"],
  "step": ["pas1.ogg", "pas2.ogg", "pas3.ogg"]
}
```

Noms disponibles : step, swing, heavy, windup, hit, crit, hurt, block, roll, pickup, coin, levelup, death,
enemyDie, ratDie, alert, cast, boom, arrow, enemyArrow, arrowHit, ui, page, error, portal, quest, potion,
bossRoar, bossWindup, trap, chest, bell, heart, slash.

Packs libres de droits conseillés (licence CC0) : « RPG Audio » et « Impact Sounds » de Kenney (kenney.nl).
