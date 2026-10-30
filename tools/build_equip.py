"""Construit les calques d'équipement du joueur (assets/equip/) depuis les exports LPC
« ZIP: Split by animation and item » du Universal LPC Spritesheet Character Generator.

Usage : python3 -I tools/build_equip.py <dossier des téléchargements> <items.json> <dossier de sortie>
  - téléchargements : <dl>/<recette>/layers.zip (+ credits.csv)
  - items.json : { "items": { clé: [type, Nom, variante] }, "contents": { recette: [clés] } }
Sortie :
  - <clé>.png : un atlas par pièce ; equip.json : métadonnées ; CREDITS_equip.csv
Chaque animation : { fs, frames, dirs, subs: [{ y, z }] } — une pièce peut avoir plusieurs calques
(ex. cape devant / derrière), chacun avec sa profondeur z.
Les pièces non-armes ne gardent que les animations de base (les grandes attaques sont recomposées en jeu).
"""
import csv, io, json, math, os, re, sys, zipfile
from PIL import Image

DL, ITEMS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
spec = json.load(open(ITEMS, encoding='utf-8'))
items, contents = spec['items'], spec['contents']
STANDARD = ['walk', 'hurt', 'slash', 'thrust', 'shoot', '1h_backslash', 'spellcast']
TYPE_Z = {'legs': 20, 'shoes': 15, 'arms': 60}
CUSTOM = ['slash_oversize', 'slash_reverse_oversize', 'thrust_oversize', 'slash_128', 'backslash_128']


def fname(sel_name):
    return re.sub(r'[^a-z0-9]', '_', sel_name.lower())


def frames_used(im, fs):
    """Nombre de colonnes jusqu'à la dernière non vide."""
    n = im.size[0] // fs
    last = 0
    for i in range(n):
        if im.crop((i * fs, 0, (i + 1) * fs, im.size[1])).getbbox():
            last = i + 1
    return last



# --- Incantation des bâtons -------------------------------------------------------------
# Seul le « Simple staff » du générateur a l'animation spellcast. Pour les autres bâtons, on la
# recompose : le bâton de la marche (image 0 de chaque direction) suit le mouvement rigide
# (rotation autour du talon + translation) que fait le bâton simple entre sa marche et son
# incantation ; chaque pixel prend le calque (devant / derrière) du point du bâton simple le
# plus proche le long de l'axe.
SPELL_REF = 'staff_simple'


def _staff_pts(ims, x0, y0, fs):
    out = []
    for li, im in enumerate(ims):
        px = im.load()
        for y in range(fs):
            for x in range(fs):
                if x0 + x < im.size[0] and px[x0 + x, y0 + y][3]:
                    out.append((x, y, li))
    return out


def _staff_axis(p):
    n = len(p)
    mx = sum(q[0] for q in p) / n
    my = sum(q[1] for q in p) / n
    sxx = sum((q[0] - mx) ** 2 for q in p)
    syy = sum((q[1] - my) ** 2 for q in p)
    sxy = sum((q[0] - mx) * (q[1] - my) for q in p)
    a = 0.5 * math.atan2(2 * sxy, sxx - syy)
    dx, dy = math.cos(a), math.sin(a)
    if dy > 0:
        dx, dy = -dx, -dy  # orienté vers le pommeau
    b = min((q[0] - mx) * dx + (q[1] - my) * dy for q in p)
    return (mx + b * dx, my + b * dy), math.atan2(dy, dx), (mx, my, dx, dy)


def synth_spellcast(ref_walk, ref_cast, tgt_walk, fs=64):
    """Listes d'images triées par z (derrière, devant). Renvoie la liste pour l'incantation."""
    W, H = ref_cast[0].size
    out = [Image.new('RGBA', (W, H)) for _ in ref_cast]
    dst = [im.load() for im in out]
    src = [im.load() for im in tgt_walk]
    for d in range(H // fs):
        rw = _staff_pts(ref_walk, 0, d * fs, fs)
        if len(rw) < 4:
            continue
        Bw, aw, _ = _staff_axis(rw)
        for f in range(W // fs):
            rc = _staff_pts(ref_cast, f * fs, d * fs, fs)
            if len(rc) < 4:
                continue
            Bc, ac, (mx, my, dx, dy) = _staff_axis(rc)
            c, s = math.cos(ac - aw), math.sin(ac - aw)
            prof = [((q[0] - mx) * dx + (q[1] - my) * dy, min(q[2], len(out) - 1)) for q in rc]
            for y in range(fs):
                for x in range(fs):
                    vx, vy = x - Bc[0], y - Bc[1]
                    ix = int(round(Bw[0] + c * vx + s * vy))
                    iy = int(round(Bw[1] - s * vx + c * vy))
                    if not (0 <= ix < fs and 0 <= iy < fs):
                        continue
                    col = None
                    for li in range(len(src) - 1, -1, -1):
                        v = src[li][ix, d * fs + iy]
                        if v[3]:
                            col = v
                            break
                    if col is None:
                        continue
                    t = (x - mx) * dx + (y - my) * dy
                    dst[min(prof, key=lambda p: abs(p[0] - t))[1]][f * fs + x, d * fs + y] = col
    return out


os.makedirs(OUT, exist_ok=True)
# clé -> anim -> liste de (z, image)
layers = {}
credits = {}
for rec in sorted(contents):
    zpath = os.path.join(DL, rec, 'layers.zip')
    if not os.path.exists(zpath):
        print('manque', rec); continue
    z = zipfile.ZipFile(zpath)
    char = json.loads(z.read('character.json'))
    sel = char['selections']
    # nom de fichier -> clé de pièce
    want = {}  # nom de fichier -> [clés] (plusieurs pièces « Armour » portent le même nom)
    for k in contents[rec]:
        typ = items[k][0]
        if typ not in sel:
            print('  ABSENT dans', rec, ':', k, items[k]); continue
        want.setdefault(fname(sel[typ]['name']), []).append(k)
    if rec == sorted(contents)[0]:
        want[fname(sel['body']['name'])] = ['body']
        want[fname(sel['head']['name'])] = ['head']
    for info in z.infolist():
        m = re.match(r'(standard|custom)/([^/]+)/(-?[0-9-]+) (.+)\.png$', info.filename)
        if not m:
            continue
        kind, anim, zs, base = m.groups()
        if base not in want:
            continue
        zval = int(zs.replace('0-', '-')) if zs.startswith('0-') else int(zs)
        cands = want[base]
        key = cands[0]
        if len(cands) > 1:
            # départage par la profondeur propre à chaque type (jambières 20, solerets 15, gantelets 60)
            byz = [c for c in cands if TYPE_Z.get(items[c][0]) == zval]
            if not byz:
                continue
            key = byz[0]
        is_weapon = items.get(key, ['', ''])[0] == 'weapon'
        if anim not in STANDARD and not (is_weapon and anim in CUSTOM):
            continue
        im = Image.open(io.BytesIO(z.read(info.filename))).convert('RGBA')
        if not im.getbbox():
            continue
        layers.setdefault(key, {}).setdefault(anim, []).append((zval, im))
    cpath = os.path.join(DL, rec, 'credits.csv')
    if os.path.exists(cpath):
        with open(cpath, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                credits[row['filename'].rsplit('/', 1)[0]] = row

ref = layers.get(SPELL_REF, {})
if 'walk' in ref and 'spellcast' in ref:
    rw = [im for _, im in sorted(ref['walk'], key=lambda t: t[0])]
    rc = sorted(ref['spellcast'], key=lambda t: t[0])
    for key, anims in layers.items():
        if key == SPELL_REF or 'spellcast' in anims or 'walk' not in anims:
            continue
        if items.get(key, [''])[0] != 'weapon' or not items[key][1].lower().endswith('_staff'):
            continue
        tw = [im for _, im in sorted(anims['walk'], key=lambda t: t[0])]
        if len(tw) != len(rc):
            continue
        made = synth_spellcast(rw, [im for _, im in rc], tw)
        anims['spellcast'] = [(rc[i][0], im) for i, im in enumerate(made)]
        print('  incantation recomposée :', key)

meta = {}
for key, anims in sorted(layers.items()):
    blocks = []  # (anim, sub index, z, image recadrée, fs, frames, dirs)
    for anim, lst in anims.items():
        lst.sort(key=lambda t: t[0])
        for si, (zv, im) in enumerate(lst):
            w, h = im.size
            dirs = 4 if h % 4 == 0 and h // 4 in (64, 128, 192) else 1
            fs = h // dirs
            n = frames_used(im, fs)
            if n == 0:
                continue
            blocks.append((anim, si, zv, im.crop((0, 0, n * fs, h)), fs, n, dirs))
    W = max(b[3].size[0] for b in blocks)
    H = sum(b[3].size[1] for b in blocks)
    atlas = Image.new('RGBA', (W, H))
    y = 0
    m = {}
    for anim, si, zv, im, fs, n, dirs in blocks:
        atlas.paste(im, (0, y))
        a = m.setdefault(anim, {'fs': fs, 'frames': n, 'dirs': dirs, 'subs': []})
        a['frames'] = max(a['frames'], n)
        a['subs'].append({'y': y, 'z': zv})
        y += im.size[1]
    atlas.save(os.path.join(OUT, key + '.png'), optimize=True)
    meta[key] = m
with open(os.path.join(OUT, 'equip.json'), 'w', encoding='utf-8') as f:
    json.dump(meta, f, separators=(',', ':'))
with open(os.path.join(OUT, 'CREDITS_equip.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['element', 'notes', 'auteurs', 'licences', 'sources'])
    for base, row in sorted(credits.items()):
        w.writerow([base, row.get('notes', ''), row.get('authors', ''), row.get('licenses', ''), row.get('urls', '')])
missing = sorted(set(items) - set(layers))
print(len(meta), 'pièces ;', len(credits), 'crédits ; manquantes :', missing)
