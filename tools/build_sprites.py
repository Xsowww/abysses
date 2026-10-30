"""Construit les atlas de personnages du jeu à partir des exports du générateur LPC.

Entrée : un dossier par personnage contenant l'export « ZIP: Split by animation » décompressé
(sous-dossiers standard/ et custom/) et credits.csv.
Sortie : assets/sprites/<nom>.png + assets/sprites/sprites.json (+ CREDITS des sprites).

Usage : python3 -I tools/build_sprites.py <dossier_exports> <dossier_sortie>
"""
import csv
import json
import os
import sys

from PIL import Image

# Animations à garder par personnage : nom_jeu -> (fichier, taille de case)
COMMON = {
    'walk': ('standard/walk.png', 64),
    'run': ('standard/run.png', 64),
    'hurt': ('standard/hurt.png', 64),
}
ATTACKS = {
    'guerrier': {'attack': ('custom/slash_oversize.png', 192), 'heavy': ('custom/slash_reverse_oversize.png', 192)},
    'gardien': {'attack': ('custom/slash_oversize.png', 192)},
    'squelette': {'attack': ('custom/slash_128.png', 128)},
    'rodeur': {'attack': ('standard/shoot.png', 64)},
    'archer': {'attack': ('standard/shoot.png', 64)},
    'acolyte': {'attack': ('standard/spellcast.png', 64), 'thrust': ('standard/thrust.png', 64)},
    'goule': {'attack': ('standard/slash.png', 64)},
    'maelis': {'cast': ('standard/spellcast.png', 64)},
    # mage : sex=male&body=Body_Color_light&head=Human_Male_light&hair=Bangsshort_dark brown&clothes=Longsleeve_charcoal
    #        &legs=Pants_black&shoes=Basic_Boots_black&jacket=Frock_coat_purple&hat=Wizard_Hat_Base_purple&weapon=Simple_staff_simple
    'mage': {'attack': ('standard/spellcast.png', 64)},
}


def frame_counts(im, fs):
    w, h = im.size
    rows, cols = h // fs, w // fs
    out = []
    for r in range(rows):
        n = 0
        for c in range(cols):
            if im.crop((c * fs, r * fs, (c + 1) * fs, (r + 1) * fs)).getbbox():
                n = c + 1
        out.append(n)
    return out


def build(name, src, dst):
    anims = dict(COMMON)
    anims.update(ATTACKS.get(name, {}))
    pieces = []
    for key, (rel, fs) in anims.items():
        path = os.path.join(src, rel)
        if not os.path.exists(path):
            # repli : attaque standard si l'arme n'a pas de version grand format
            if fs > 64:
                rel2 = 'standard/' + os.path.basename(rel).replace('_oversize', '').replace('slash_reverse', 'slash')
                path = os.path.join(src, rel2)
                fs = 64
            if not os.path.exists(path):
                print('  (absent)', name, key, rel)
                continue
        im = Image.open(path).convert('RGBA')
        counts = frame_counts(im, fs)
        frames = max(counts) if counts else 0
        dirs = len([c for c in counts if c > 0])
        if frames == 0:
            continue
        crop = im.crop((0, 0, frames * fs, dirs * fs))
        pieces.append((key, crop, fs, frames, dirs))
    width = max(p[1].size[0] for p in pieces)
    height = sum(p[1].size[1] for p in pieces)
    atlas = Image.new('RGBA', (width, height))
    meta = {}
    y = 0
    for key, crop, fs, frames, dirs in pieces:
        atlas.paste(crop, (0, y))
        # Ancre = point aux pieds du personnage (le corps 64x64 est centré dans les cases 192)
        off = (fs - 64) // 2
        meta[key] = {'y': y, 'fs': fs, 'frames': frames, 'dirs': dirs, 'ax': off + 32, 'ay': off + 60}
        y += crop.size[1]
    atlas.save(os.path.join(dst, name + '.png'), optimize=True)
    return meta


def main():
    src_root, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    all_meta = {}
    credits = {}
    for name in sorted(os.listdir(src_root)):
        d = os.path.join(src_root, name)
        anim_dir = os.path.join(d, 'anims')
        if not os.path.isdir(anim_dir):
            continue
        all_meta[name] = build(name, anim_dir, dst)
        print(name, {k: (v['frames'], v['dirs'], v['fs']) for k, v in all_meta[name].items()})
        cpath = os.path.join(d, 'credits.csv')
        if os.path.exists(cpath):
            with open(cpath, newline='', encoding='utf-8') as f:
                for row in csv.DictReader(f):
                    base = row['filename'].rsplit('/', 1)[0]
                    credits[base] = row
    with open(os.path.join(dst, 'sprites.json'), 'w', encoding='utf-8') as f:
        json.dump(all_meta, f, separators=(',', ':'))
    with open(os.path.join(dst, 'CREDITS_sprites.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['element', 'notes', 'auteurs', 'licences', 'sources'])
        for base, row in sorted(credits.items()):
            w.writerow([base, row.get('notes', ''), row.get('authors', ''), row.get('licenses', ''), row.get('urls', '')])
    print('crédits :', len(credits), 'éléments')


if __name__ == '__main__':
    main()
