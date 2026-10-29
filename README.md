# Les Abysses

Action-RPG roguelite en 2D, vue du dessus, jouable directement dans le navigateur.
Vous partez du village, descendez dans les Abysses, ramassez du butin… et devez **revenir vivant** pour le garder.

## Jouer

Le jeu est un site statique (HTML + JavaScript, sans installation ni dépendance).

- **En ligne** : activez GitHub Pages (voir plus bas), puis ouvrez `https://<votre-pseudo>.github.io/abysses/`.
- **En local** : il faut un petit serveur web (les navigateurs bloquent les modules JavaScript ouverts en double-cliquant sur le fichier). Par exemple :
  ```bash
  python3 -m http.server 8000
  ```
  puis ouvrez <http://localhost:8000>.

### Activer GitHub Pages
Dans le dépôt sur GitHub : **Settings → Pages → Source : Deploy from a branch → Branch : `main` / `(root)` → Save**.
Le lien apparaît au bout d’une minute environ.

## Commandes par défaut

Toutes les touches se modifient dans **Échap → Touches et options**.

| Action | Touche |
|---|---|
| Se déplacer | Z Q S D (W A S D en QWERTY) |
| Attaque de base | Clic gauche (maintenir) |
| Attaque spéciale (Frappe lourde / Tir perçant) | Clic droit |
| Roulade (invulnérable) | Espace |
| Compétences | 1 2 3 4 |
| Fiole de sang (soin) | A (Q en QWERTY) |
| Interagir / parler / ouvrir | E |
| Pierre de retour | R |
| Inventaire / Talents / Journal | I / N / J |
| Agrandir la carte | Tab |
| Menu | Échap |

Dans l’inventaire : **clic** pour sélectionner, **clic droit** pour l’action rapide (équiper, vendre…), **Maj + clic** pour ranger dans la poche sécurisée.

## Règles d’expédition

- L’**équipement porté** n’est **jamais perdu**.
- La **poche sécurisée** (1 à 4 emplacements selon la poche équipée) est **conservée** à la mort.
- Le **butin trouvé** dans le sac (marqué d’un **!** orange) et l’**or ramassé** pendant l’expédition sont **perdus** si vous mourez.
- Pour rentrer avec votre butin : **point d’extraction** (pilier vert, 4 s d’incantation), **portail** qui apparaît après le boss, ou **pierre de retour** (5 s). Une incantation est interrompue si vous êtes touché ou si vous bougez.

## Contenu (v0.3)

- **Histoire** (Acte I, « La Cloche Noire ») : prologue, trame principale en 9 quêtes, dialogues, 5 Gardiens nommés, 12 fragments de lore à collectionner, inscriptions au sol.
- **Son** : bruitages synthétisés (métal, os, cordes d’arc, pas), réverbération de crypte, sons spatialisés, musique et ambiances générées en direct (village, crypte, boss). De vrais fichiers audio peuvent être ajoutés dans `assets/sfx/` (voir `LISEZMOI.md`).
- **Mise en scène** : ralentis, caméra sur les boss, morts animées, colonnes de lumière, images rémanentes, braises, flash de dégâts.
- **Progression lente** : plusieurs heures pour atteindre le niveau 10, butin et or plus rares.

- Direction artistique sombre façon Souls : menus gothiques, HUD épuré, brouillard, grain, traces de combat persistantes.
- Village : forgeron, marchande, capitaine (quêtes), gardienne du portail, coffre de stockage.
- **Guerrier** (corps à corps) : spécialisations **Berserker** ou **Gardien** au niveau 10.
- **Rôdeur** (arcs, arbalète, pièges) : spécialisations **Tireur d’élite** ou **Ombrelame** (poison, invisibilité) au niveau 10.
- Donjon généré aléatoirement à chaque descente, profondeurs débloquées en battant le boss.
- 4 types de monstres + élites + boss en 2 phases (« Le Gardien d’Os »).
- Butin aléatoire à 5 raretés, 10 emplacements d’équipement, armes à une ou deux mains.
- 10 quêtes, sauvegarde automatique dans le navigateur.

## Structure du code

```
index.html         page unique
css/style.css      interface
js/main.js         démarrage + boucle de jeu
js/core/           entrées (touches), audio synthétisé, sauvegarde
js/data/           données : objets, classes/talents, monstres, quêtes
js/game/           moteur : carte, donjon, village, joueur, monstres, rendu
js/ui/             HUD, panneaux, écrans, icônes
```
