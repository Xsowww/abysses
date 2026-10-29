"""Assemble assets/credits.json (écran Crédits du jeu) à partir des crédits de chaque dossier.

Usage : python3 -I tools/build_credits.py <racine du dépôt>
Sources lues si présentes :
  assets/sprites/CREDITS_sprites.csv  (élément, notes, auteurs, licences, sources)
  assets/tiles/credits.json, assets/sfx/credits.json, assets/music/credits.json
    (liste de {what, authors, license, url})
"""
import csv, json, os, sys

root = sys.argv[1]
A = os.path.join(root, 'assets')
out = []

items, seen = [], set()
for p in (os.path.join(A, 'sprites', 'CREDITS_sprites.csv'), os.path.join(A, 'equip', 'CREDITS_equip.csv')):
    if not os.path.exists(p):
        continue
    with open(p, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['element'] in seen:
                continue
            seen.add(r['element'])
            items.append({'what': r['element'], 'authors': r['auteurs'], 'license': r['licences'],
                          'url': r['sources'].split(',')[0].strip()})
items.sort(key=lambda i: i['what'])
if items:
    out.append({'title': 'Personnages', 'note': 'Liberated Pixel Cup (LPC) — Universal LPC Spritesheet Character Generator. Licences CC-BY-SA 3.0 / OGA-BY 3.0 / GPL 3.0.', 'items': items})

for folder, title in (('tiles', 'Décors (LPC, OpenGameArt)'), ('icons', 'Icônes d’objets'), ('sfx', 'Bruitages'), ('music', 'Musiques')):
    p = os.path.join(A, folder, 'credits.json')
    if os.path.exists(p):
        with open(p, encoding='utf-8') as f:
            items = json.load(f)
        out.append({'title': title, 'items': items})

with open(os.path.join(A, 'credits.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('sections:', [(s['title'], len(s['items'])) for s in out])
