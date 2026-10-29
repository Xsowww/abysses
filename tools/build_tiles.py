"""Construit l'atlas des décors (assets/tiles/tiles.png + tiles.json) à partir des packs LPC d'OpenGameArt.

Usage : python3 -I tools/build_tiles.py <dossier des packs téléchargés> <dossier de sortie>
  ex. : python3 -I tools/build_tiles.py /tmp/tiles/raw assets/tiles

Packs attendus (voir assets/tiles/CREDITS_tiles.md) :
  lpc-cavern-and-ruin-tiles, lpc-dungeon-elements, lpc-castle-mega-pack, lpc-tile-atlas,
  lpc-medieval-village-decorations, lpc-thatched-roof-cottage
Chaque entrée de tiles.json : [x, y, w, h] dans l'atlas ; les maisons ont en plus « ax, ay » (ancre au pied du mur).
"""
import json, os, sys
from PIL import Image

RAW, OUT = sys.argv[1], sys.argv[2]
P = {
    'CAV': 'lpc-cavern-and-ruin-tiles/unz_LPC_cavern_ruins/LPC_cavern_ruins/cavern_ruins.png',
    'DEX': 'lpc-dungeon-elements/dungeonex.png',
    'FIRE': 'lpc-dungeon-elements/unz_dungeon_0/fire.png',
    'C8D': 'lpc-castle-mega-pack/castle8dark.png',
    'TER': 'lpc-tile-atlas/terrain_atlas.png',
    'BOA': 'lpc-tile-atlas/base_out_atlas.png',
    'DEC': 'lpc-medieval-village-decorations/unz_decoration_medieval/decoration_medieval/decorations-medieval.png',
    'FEN': 'lpc-medieval-village-decorations/unz_decoration_medieval/decoration_medieval/fence_medieval.png',
    'COT': 'lpc-thatched-roof-cottage/cottage.png',
    'ROOF': 'lpc-thatched-roof-cottage/thatched-roof.png',
}
IM = {k: Image.open(os.path.join(RAW, v)).convert('RGBA') for k, v in P.items()}


def crop(key, x, y, w, h):
    return IM[key].crop((x, y, x + w, y + h))


def grey(im):
    """Bordure violette des murs -> pierre grise froide."""
    px = im.load()
    for j in range(im.size[1]):
        for i in range(im.size[0]):
            r, g, b, a = px[i, j]
            if a and b > g + 12 and r > g:  # pixels violets
                l = int(0.3 * r + 0.5 * g + 0.2 * b)
                px[i, j] = (l, l, min(255, l + 8), a)
    return im


def unmagenta(im):
    px = im.load()
    for j in range(im.size[1]):
        for i in range(im.size[0]):
            r, g, b, a = px[i, j]
            if r > 200 and b > 200 and g < 60:
                px[i, j] = (0, 0, 0, 0)
    return im


def blood(im):
    """Taches brunes -> sang séché."""
    px = im.load()
    for j in range(im.size[1]):
        for i in range(im.size[0]):
            r, g, b, a = px[i, j]
            if a:
                l = (r + g + b) / 3
                px[i, j] = (int(min(255, l * 1.15 + 20)), int(l * 0.25), int(l * 0.22), int(a * 0.85))
    return im


E = {}  # nom -> Image


def add(name, key, x, y, w, h, op=None):
    im = crop(key, x, y, w, h)
    if op:
        im = op(im)
    E[name] = im


# ---------------- DONJON ----------------
add('f_cobble', 'CAV', 32, 288, 32, 32)
add('f_cobble2', 'CAV', 96, 416, 32, 32)
add('f_cave', 'CAV', 0, 0, 32, 32)
add('f_slab', 'CAV', 160, 448, 32, 32)
add('f_slab2', 'CAV', 192, 448, 32, 32)
add('f_flag', 'TER', 512, 832, 96, 96)
add('f_dirt', 'DEX', 96, 288, 32, 32)
add('face3', 'CAV', 608, 224, 96, 96, grey)
add('face2', 'CAV', 64, 256, 96, 64)
add('face2d', 'C8D', 0, 416, 96, 64)
add('top', 'CAV', 608, 320, 96, 96, grey)
add('topin', 'CAV', 704, 320, 64, 64, grey)
add('topcap', 'CAV', 576, 384, 32, 32, grey)
add('alcoves', 'C8D', 64, 32, 128, 64)
add('cellwin', 'CAV', 544, 320, 32, 32)
add('door_arch', 'C8D', 352, 448, 64, 64)
add('archway', 'C8D', 416, 384, 64, 64)
add('stairs_down', 'C8D', 352, 352, 128, 32)
add('coffin', 'CAV', 704, 64, 32, 64)
add('sarco', 'DEC', 32, 160, 64, 64)
add('tomb', 'DEC', 64, 64, 32, 32)
add('plaque', 'CAV', 640, 416, 96, 64)
add('statue', 'CAV', 544, 224, 32, 64)
add('obelisk', 'CAV', 576, 224, 32, 64)
add('gargoyle', 'CAV', 480, 288, 64, 64)
add('armor', 'CAV', 704, 128, 32, 64)
add('armorpile', 'CAV', 736, 96, 32, 32)
add('chest', 'BOA', 608, 576, 32, 32)
add('chest2', 'BOA', 640, 576, 32, 32)
add('crate_gold', 'CAV', 384, 352, 32, 32)
add('barrels', 'BOA', 608, 512, 64, 64)
add('barrel', 'BOA', 576, 448, 32, 64)
add('cauldron', 'DEX', 32, 0, 32, 32)
add('chained', 'DEX', 0, 256, 32, 64)
add('chains', 'DEX', 32, 256, 32, 32)
add('skull', 'DEX', 64, 256, 32, 32)
add('bones', 'DEX', 96, 256, 32, 32)
add('skulls', 'DEX', 32, 288, 32, 32)
add('bonepile', 'DEX', 64, 288, 32, 32)
add('skeleton', 'CAV', 736, 64, 32, 32)
add('web1', 'DEX', 288, 128, 32, 32)
add('web2', 'DEX', 288, 160, 32, 32)
add('rubble', 'CAV', 480, 352, 32, 32)
add('rock', 'CAV', 736, 128, 32, 32)
add('roots', 'CAV', 448, 352, 32, 32)
add('blood1', 'DEX', 224, 128, 32, 32, blood)
add('blood2', 'CAV', 288, 224, 32, 32, None)
add('slime', 'DEX', 224, 96, 32, 32)
add('crack', 'DEX', 256, 128, 32, 32)
add('moss', 'DEX', 0, 0, 32, 64)
add('ashes', 'DEX', 32, 32, 32, 32)
add('colA', 'TER', 608, 512, 32, 64)
add('colB', 'TER', 640, 512, 32, 64)
add('colbroken', 'CAV', 576, 320, 32, 64)
add('stump', 'CAV', 512, 352, 32, 32)
add('pillar', 'TER', 448, 384, 32, 96)
for i, x in enumerate((416, 448, 480)):
    add(f'torch{i}', 'DEC', x, 160, 32, 32)
add('torch_off', 'DEC', 384, 160, 32, 32)
for i in range(4):
    add(f'fire{i}', 'FIRE', 0, 32 * i, 32, 32, unmagenta)
for i in range(5):
    add(f'camp{i}', 'DEC', 256 + 32 * i, 1536, 32, 32)

# ---------------- VILLAGE ----------------
for i, x in enumerate((672, 704, 736)):
    add(f'g{i}', 'TER', x, 160, 32, 32)
add('g_plain', 'TER', 704, 96, 32, 32)
add('g_flowers', 'TER', 672, 352, 96, 32)
add('g_patch', 'TER', 672, 64, 96, 96)
add('d0', 'TER', 512, 160, 32, 32)
add('d1', 'TER', 544, 160, 32, 32)
add('d_patch', 'TER', 576, 64, 96, 96)     # terre sombre (bords sur transparence)
add('d_inner', 'TER', 608, 0, 64, 64)
add('cobble', 'TER', 960, 512, 64, 64)
add('pine', 'TER', 960, 0, 64, 160)
add('oak', 'TER', 928, 896, 96, 128)
add('tree_s', 'TER', 864, 928, 64, 96)
add('bushA', 'TER', 768, 384, 96, 96)
add('bushB', 'TER', 864, 384, 96, 96)
add('hedge', 'TER', 0, 640, 32, 64)
add('well', 'DEC', 448, 416, 64, 96)
add('buckets', 'DEC', 64, 448, 32, 64)
for i in range(3):
    add(f'fountain{i}', 'DEC', 64 * i, 512, 64, 64)
add('stall_grey', 'DEC', 0, 800, 96, 160)
add('stall_brown', 'DEC', 160, 800, 96, 160)
add('crate', 'DEC', 352, 768, 64, 32)
add('crate_goods', 'CAV', 384, 352, 32, 32)
add('firewood', 'DEC', 384, 640, 64, 64)
add('lamp', 'BOA', 976, 712, 32, 88)
add('lamp_tw', 'DEC', 416, 256, 32, 128)
add('lantern', 'DEC', 416, 64, 32, 32)
add('sign_sword', 'DEC', 224, 0, 32, 32)
add('sign_potion', 'DEC', 320, 0, 32, 32)
add('sign_book', 'DEC', 192, 32, 32, 32)
add('sign_tools', 'DEC', 320, 32, 32, 32)
add('sign_beer', 'DEC', 224, 32, 32, 32)
add('signpost', 'DEC', 192, 128, 64, 64)
add('shed', 'DEC', 352, 352, 64, 96)
add('banner', 'DEC', 160, 1216, 32, 64)
add('grave', 'DEC', 0, 64, 32, 32)
add('tombstone', 'DEC', 64, 64, 32, 32)
add('fence_rail', 'FEN', 0, 0, 96, 32)
add('fence_picket', 'FEN', 0, 192, 96, 32)
add('wall_low', 'FEN', 192, 192, 96, 32)
add('fence_rail_box', 'FEN', 0, 64, 96, 96)
add('wall_low_box', 'FEN', 192, 256, 96, 96)


# ---------------- MAISONS (assemblées) ----------------
def make_roof(src, width):
    src = src.crop(src.getbbox())
    w, h = src.size
    c = w // 2
    out = Image.new('RGBA', (width, h))
    out.paste(src.crop((0, 0, c, h)), (0, 0))
    col = src.crop((c - 7, 0, c - 6, h))  # colonne sans le faîtage
    for x in range(c, width - (w - c)):
        out.paste(col, (x, 0))
    out.paste(src.crop((c, 0, w, h)), (width - (w - c), 0))
    return out


def make_wall(bx, by, wt, ht):
    blk = crop('COT', bx, by, 96, 96)
    out = Image.new('RGBA', (wt * 32, ht * 32))
    for j in range(ht):
        sj = 0 if j == 0 else (2 if j == ht - 1 else 1)
        for i in range(wt):
            si = 0 if i == 0 else (2 if i == wt - 1 else 1)
            out.paste(blk.crop((si * 32, sj * 32, si * 32 + 32, sj * 32 + 32)), (i * 32, j * 32))
    return out


WALLS = {'cream': (0, 128), 'ochre': (0, 0), 'stone': (0, 256), 'cream_x': (192, 128), 'ochre_d': (96, 0)}
ROOFS = {'brown': (80, 224, 128, 112), 'yellow': (80, 0, 128, 112)}


def house(name, wt, wall='cream', roof='brown', sign=None, door_dx=0, windows=True, ht=3):
    W = wt * 32
    wl = make_wall(*WALLS[wall], wt, ht)
    rf = make_roof(crop('ROOF', *ROOFS[roof]), W + 12)
    H = rf.size[1] + (ht - 1) * 32
    img = Image.new('RGBA', (W + 12, H + 8))
    # ombre portée à droite
    sh = Image.new('RGBA', (8, H - 20), (0, 0, 0, 90))
    img.alpha_composite(sh, (W + 4, 20))
    img.alpha_composite(wl, (6, H - ht * 32))
    found = Image.new('RGBA', (W, 8))
    found.alpha_composite(crop('COT', 0, 480, 96, 32).resize((96, 8)), (0, 0))
    for x in range(0, W, 96):
        img.alpha_composite(crop('COT', 0, 488, min(96, W - x), 8), (6 + x, H))
    dx = 6 + W // 2 - 16 + door_dx * 32
    img.alpha_composite(crop('BOA', 96, 288, 32, 64), (dx, H - 64))
    if windows:
        wn = crop('BOA', 224, 288, 32, 32)
        for k in range(1, wt - 1):
            x = 6 + k * 32
            if abs(x - dx) >= 48:
                img.alpha_composite(wn, (x, H - 80))
    img.alpha_composite(rf, (0, 0))
    if sign:
        s = crop('DEC', *sign, 32, 32)
        img.alpha_composite(s, (dx + 30, H - 92))
    E[name] = img
    return {'ax': (W + 12) // 2, 'ay': H}


META = {}
META['h_forge'] = house('h_forge', 7, 'stone', 'brown', sign=(224, 0), door_dx=-1)
META['h_shop'] = house('h_shop', 7, 'cream', 'brown', sign=(320, 0), door_dx=1)
META['h_barracks'] = house('h_barracks', 7, 'ochre_d', 'brown', sign=None)
META['h_home'] = house('h_home', 5, 'cream_x', 'yellow')
META['h_small'] = house('h_small', 4, 'ochre', 'brown')
META['h_inn'] = house('h_inn', 7, 'cream', 'yellow', sign=(256, 32), door_dx=1)

# ---------------- PACKING ----------------
items = sorted(E.items(), key=lambda kv: -kv[1].size[1])
AW = 1024
x = y = rowh = 0
pos = {}
for name, im in items:
    w, h = im.size
    if x + w > AW:
        x, y, rowh = 0, y + rowh + 2, 0
    pos[name] = (x, y, w, h)
    x += w + 2
    rowh = max(rowh, h)
AH = y + rowh
atlas = Image.new('RGBA', (AW, AH))
for name, (x, y, w, h) in pos.items():
    atlas.paste(E[name], (x, y))
os.makedirs(OUT, exist_ok=True)
atlas.save(os.path.join(OUT, 'tiles.png'), optimize=True)
meta = {}
for name, r in pos.items():
    meta[name] = list(r)
    if name in META:
        meta[name] += [META[name]['ax'], META[name]['ay']]
with open(os.path.join(OUT, 'tiles.json'), 'w') as f:
    json.dump(meta, f, separators=(',', ':'))
print('atlas', AW, 'x', AH, len(pos), 'éléments')
