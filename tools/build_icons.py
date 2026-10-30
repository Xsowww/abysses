"""Build the icon atlas.  build.py RAW_DIR OUT_DIR
Sources (all CC0): Idylwild packs, Dungeon Crawl Stone Soup tiles, ETTiNGRiNDER dark fantasy items.
Some variants are recoloured ("tints") to give 7 material tiers a distinct look."""
import sys, os, json, colorsys
from PIL import Image, ImageDraw

RAW, OUT = sys.argv[1], sys.argv[2]
S = 32
IDY = {
    'armory': os.path.join(RAW, 'idy_armory/x'),
    'arsenal': os.path.join(RAW, 'idy_arsenal/x'),
    'inventory': os.path.join(RAW, 'idy_inventory/x'),
    'arcanum': os.path.join(RAW, 'idy_arcanum/x'),
    'aerial': os.path.join(RAW, 'idy_aerial_arsenal/x/Item Icons'),
}
DCSS = os.path.join(RAW, 'dcss/x/Dungeon Crawl Stone Soup Full')
DF = Image.open(os.path.join(RAW, 'darkfant/00_items.png')).convert('RGBA')
DF_BOX = {'bag': (136, 7, 14, 16), 'key_blue': (181, 6, 9, 22), 'key_green': (194, 6, 9, 22),
          'key_red': (207, 6, 9, 22), 'quiver_a': (237, 82, 13, 22), 'quiver_b': (254, 82, 13, 22),
          'shield_skull': (75, 74, 16, 22), 'shield_ornate': (107, 73, 17, 25),
          'shield_kite': (44, 76, 12, 18), 'buckler_spiked': (11, 75, 16, 16)}


def centered(im):
    """Center the opaque content in a 32x32 cell (no scaling)."""
    bb = im.getbbox()
    c = im.crop(bb)
    assert c.width <= S and c.height <= S, c.size
    cell = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    cell.paste(c, ((S - c.width) // 2, (S - c.height) // 2))
    return cell


def load_idy(pack, name):
    im = Image.open(os.path.join(IDY[pack], name + '.png')).convert('RGBA')
    assert im.size == (S, S)
    return im


def load_dcss(rel):
    im = Image.open(os.path.join(DCSS, rel + '.png')).convert('RGBA')
    assert im.size == (S, S)
    # crisp alpha (DCSS newer tiles are anti-aliased)
    px = im.load()
    for y in range(S):
        for x in range(S):
            r, g, b, a = px[x, y]
            shadow = a < 255 and max(r, g, b) < 40  # semi-transparent drop shadow
            px[x, y] = (r, g, b, 255) if (a >= 128 and not shadow) else (0, 0, 0, 0)
    return im


def load_df(key):
    x, y, w, h = DF_BOX[key]
    return centered(DF.crop((x - 1, y - 1, x + w + 1, y + h + 1)))


# ---------- recolouring ----------
def _map(im, fn):
    im = im.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            out = fn(h, s, v)
            if out is not None:
                rr, gg, bb = colorsys.hsv_to_rgb(*out)
                px[x, y] = (round(rr * 255), round(gg * 255), round(bb * 255), a)
    return im


def glow(im, rgb, alpha=110):
    """1px soft halo around the silhouette."""
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    src = im.load(); o = out.load()
    W, H = im.size
    for y in range(H):
        for x in range(W):
            if src[x, y][3]:
                continue
            n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                    if 0 <= x + dx < W and 0 <= y + dy < H and src[x + dx, y + dy][3])
            if n:
                o[x, y] = rgb + (alpha if n > 1 else alpha // 2,)
    out.alpha_composite(im)
    return out


METAL = {  # (hue, sat, value factor) applied to grey (metal) pixels only
    'noir': lambda h, s, v: (0.62, 0.10, v * 0.55),
    'mithril': lambda h, s, v: (0.53, 0.28, min(1, v * 1.04 + 0.04)),
    'orichalque': lambda h, s, v: (0.075, 0.62, min(1, v * 1.02)),
    'abysses': lambda h, s, v: (0.76, 0.50, v * 0.72),
}
CLOTH = {  # applied to every non-outline pixel (leather / cloth / liquids)
    'sombre': lambda h, s, v: (h, s * 0.55, v * 0.62),
    'cramoisi': lambda h, s, v: (0.985, max(s, 0.45), v * 0.85),
    'nuit': lambda h, s, v: (0.64, max(s * 0.8, 0.25), v * 0.7),
    'abysses': lambda h, s, v: (0.76, max(s, 0.35), v * 0.7),
}
GLOW = {'abysses': (150, 70, 220)}


def tint(im, name, kind):
    if kind == 'metal':
        f = METAL[name]
        out = _map(im, lambda h, s, v: f(h, s, v) if (s < 0.2 and v > 0.16) else None)
    else:
        f = CLOTH[name]
        out = _map(im, lambda h, s, v: f(h, s, v) if v > 0.14 else None)
    if name in GLOW:
        out = glow(out, GLOW[name])
    return out


def red_liquid(im):
    """Turn a coloured potion red (saturated pixels only; glass stays)."""
    return _map(im, lambda h, s, v: (0.0, max(s, 0.6), v * 0.9) if s > 0.35 else None)


# ---------- icon registry ----------
icons = {}  # key -> Image


def add(key, im):
    assert key not in icons, key
    assert im.size == (S, S)
    icons[key] = im
    return key


def I(pack, name, key=None):
    key = key or name
    if key not in icons:
        add(key, load_idy(pack, name))
    return key


def D(rel, key):
    if key not in icons:
        add(key, load_dcss(rel))
    return key


def F(k):
    key = 'df_' + k
    if key not in icons:
        add(key, load_df(k))
    return key


def T(base, name, kind='metal'):
    key = base + '_' + name
    if key not in icons:
        add(key, tint(icons[base], name, kind))
    return key


def FLIP(base):
    key = base + '_flip'
    if key not in icons:
        add(key, icons[base].transpose(Image.FLIP_LEFT_RIGHT))
    return key


def metal_tiers(base, names=('noir', 'mithril', 'orichalque', 'abysses')):
    return [T(base, n, 'metal') for n in names]


def cloth_tiers(base, names=('sombre', 'nuit', 'cramoisi', 'abysses')):
    return [T(base, n, 'cloth') for n in names]


A, W, V, C, R = 'armory', 'arsenal', 'inventory', 'arcanum', 'aerial'
M = {}

# --- weapons ---
M['weapon:epee'] = [I(W, n) for n in ('sword1', 'sword4', 'sword3', 'sword2', 'sword5')] + metal_tiers('sword5', ('noir', 'mithril', 'abysses'))
M['weapon:hache'] = [I(W, n) for n in ('axe2', 'axe1', 'axe3', 'axe4')] + metal_tiers('axe3')
M['weapon:masse'] = [I(W, n) for n in ('club1', 'mace1', 'flail', 'morningstar', 'mace2')] + metal_tiers('morningstar', ('noir', 'mithril', 'abysses'))
M['weapon:espadon'] = [D('item/weapon/' + n, 'dc_' + n) for n in (
    'two_handed_sword', 'greatsword_1_new', 'claymore', 'greatsword_3_old', 'greatsword_2',
    'claymore_2', 'greatsword_4', 'claymore_3')]
M['weapon:marteau'] = [I(W, 'hammer1'), I(W, 'hammer2'), D('item/weapon/hammer_1_new', 'dc_hammer_1'),
                       D('item/weapon/war_hammer', 'dc_war_hammer'), D('item/weapon/hammer_2_new', 'dc_hammer_2'),
                       D('item/weapon/hammer_3', 'dc_hammer_3')] + metal_tiers('hammer2', ('mithril', 'abysses'))
bows = [I(W, n) for n in ('bow1', 'bow3', 'bow2', 'bow4')]
M['weapon:arc'] = bows + [T('bow4', 'sombre', 'cloth'), T('bow4', 'nuit', 'cloth'), T('bow4', 'abysses', 'cloth')]
M['weapon:arccourt'] = [FLIP(b) for b in ('bow1', 'bow3', 'bow2', 'bow4')] + [FLIP(k) for k in (
    'bow4_sombre', 'bow4_nuit', 'bow4_abysses')]
M['weapon:arbalete'] = [I(W, 'crossbow1'), I(R, 'crossbow4'), I(W, 'crossbow2'), I(W, 'crossbow3')] + metal_tiers('crossbow2', ('noir', 'mithril', 'abysses'))

# --- offhand ---
M['offhand:shield'] = [I(A, n) for n in ('wooden_buckler', 'wood_kite_shield', 'wood_kite_shield_alt', 'iron_buckler', 'kite_shield', 'tower_shield')] + [F('shield_skull'), F('shield_ornate')]
M['offhand:quiver'] = [F('quiver_a'), F('quiver_b')] + cloth_tiers('df_quiver_a', ('sombre', 'nuit', 'abysses'))

# --- armour ---
M['head:Casque'] = [I(A, n) for n in ('leather_cap', 'studded_helmet', 'platemail_helmet', 'horned_helmet')] + metal_tiers('platemail_helmet', ('noir', 'mithril', 'abysses'))
M['head:Heaume'] = [I(A, 'close_helmet')] + metal_tiers('close_helmet') + [T('close_helmet', 'nuit', 'cloth')]
M['head:Camail'] = [I(A, 'chainmail_coif')] + metal_tiers('chainmail_coif')
M['head:Capuche'] = [I(A, 'cloth_hood')] + cloth_tiers('cloth_hood')
M['chest:Plastron'] = [I(A, 'breastplate'), I(A, 'platemail')] + metal_tiers('breastplate', ('noir', 'mithril')) + metal_tiers('platemail', ('orichalque', 'abysses'))
M['chest:Haubert'] = [I(A, 'chainmail_jacket'), I(A, 'chainmail_alt')] + metal_tiers('chainmail_jacket', ('noir', 'mithril')) + metal_tiers('chainmail_alt', ('orichalque', 'abysses'))
M['chest:Brigandine'] = [I(A, 'studded_jacket'), I(A, 'studded_jacket_alt')] + cloth_tiers('studded_jacket', ('sombre', 'cramoisi')) + cloth_tiers('studded_jacket_alt', ('nuit', 'abysses'))
M['chest:Pourpoint'] = [I(A, n) for n in ('tattered_shirt', 'leather_jacket', 'leather_jacket_alt', 'quilted_armor')] + cloth_tiers('quilted_armor', ('sombre', 'nuit', 'abysses'))
M['legs'] = [I(A, n) for n in ('cloth_pants', 'leather_pants', 'studded_pants', 'chainmail_pants', 'platemail_pants')] + metal_tiers('platemail_pants', ('mithril', 'abysses'))
M['feet'] = [I(A, n) for n in ('cloth_shoes', 'leather_boots', 'studded_boots', 'chainmail_boots', 'greaves')] + metal_tiers('greaves', ('mithril', 'abysses'))
M['hands'] = [I(A, n) for n in ('cloth_gloves', 'leather_gloves', 'studded_gloves', 'chainmail_gloves', 'gauntlets')] + metal_tiers('gauntlets', ('mithril', 'abysses'))
M['amulet'] = [I(A, 'tile046', 'amulet_copper'), I(A, 'tile047', 'amulet_iron'), I(A, 'tile048', 'amulet_silver'), I(A, 'tile049', 'amulet_gold')] + metal_tiers('amulet_silver', ('noir', 'mithril', 'abysses'))
M['ring'] = [I(A, 'copper_ring'), I(A, 'iron_ring'), I(A, 'silver_ring'), I(A, 'gold_ring')] + metal_tiers('silver_ring', ('noir', 'mithril', 'abysses'))

# --- misc ---
M['pocket'] = [F('bag'), I(V, 'sack')] + cloth_tiers('sack', ('sombre', 'nuit', 'abysses'))
add('potion_red_2', red_liquid(load_idy(C, 'potion_full_2')))
add('potion_red_3', red_liquid(load_idy(C, 'potion_full_3')))
M['potion'] = [I(C, 'potion_full_1'), I(C, 'potion_half_1'), 'potion_red_2', 'potion_red_3']
add('runestone_water_glow', glow(load_idy(C, 'runestone_water'), (121, 184, 196), 150))
M['pierre'] = ['runestone_water_glow', I(C, 'runestone_water'), I(C, 'runestone_air'), I(C, 'runestone_earth'), I(C, 'runestone_fire'), I(C, 'crystal_blue')]
M['lore'] = [I(C, 'rotulus_unfurled'), I(C, 'scroll_blank'), I(V, 'parchment'), I(C, 'scroll_spell'), I(C, 'rotulus_rolled'), I(C, 'scroll_bound_1'), I(V, 'scroll')]
def deshadow(im):
    """Drop black pixels not touching a coloured pixel (opaque shadow blobs)."""
    src = im.copy(); s = src.load(); px = im.load()
    def black(x, y):
        return 0 <= x < S and 0 <= y < S and s[x, y][3] and max(s[x, y][:3]) < 20
    def colour(x, y):
        return 0 <= x < S and 0 <= y < S and s[x, y][3] and max(s[x, y][:3]) >= 20
    for y in range(S):
        for x in range(S):
            if black(x, y) and not any(colour(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                px[x, y] = (0, 0, 0, 0)
    return im


M['gold'] = [D('item/gold/gold_pile_' + n, 'dc_gold_' + n) for n in ('2', '3', '4', '6', '7', '9')]
for k in M['gold']:
    deshadow(icons[k])
M['key'] = [I(V, 'gold_key'), F('key_blue'), F('key_green'), F('key_red'), D('item/misc/key', 'dc_key')]
M['gem'] = [I(C, n) for n in ('raw_green_gem', 'cut_green_gem', 'raw_purple_gem', 'crystal_purple', 'crystal_orange', 'diamond')]
M['bone'] = [I(V, 'bone'), I(C, 'bone', 'bone_2'), I(C, 'bonemeal')]
D('gui/spells/components/skull', 'dc_skull_raw')
add('dc_skull', _map(icons.pop('dc_skull_raw'), lambda h, s, v: (0.11, 0.18, min(1, v * 1.1)) if v > 0.14 else None))
M['skull'] = [I(C, 'skull_candle'), 'dc_skull']

# --- mage (ajoutés en fin d'atlas : les positions existantes ne bougent pas) ---
M['weapon:baton'] = [I(W, 'staff1'), I(W, 'staff2'), D('item/staff/staff_2', 'dc_staff_2'), I(W, 'staff3'),
                     D('item/staff/staff_4', 'dc_staff_4'), D('item/staff/staff_7', 'dc_staff_7'),
                     D('item/staff/staff_8', 'dc_staff_8'), D('item/staff/staff_3', 'dc_staff_3')]
M['weapon:sceptre'] = [D('item/rod/rod_%d_new' % i, 'dc_rod_%d' % i) for i in (1, 0, 4, 5, 6, 7)] + [
    D('item/weapon/artefact/spwpn_sceptre_of_asmodeus', 'dc_sceptre_asmodeus'),
    D('item/weapon/artefact/spwpn_scepter_of_asmodeus_2', 'dc_sceptre_asmodeus_2')]
for k in M['weapon:sceptre']:
    deshadow(icons[k])
M['weapon:baguette'] = [D('item/wand/gem_wood_new', 'dc_wand_wood'), I(W, 'wand1'), D('item/wand/gem_iron_new', 'dc_wand_iron'),
                        D('item/wand/gem_bone_new', 'dc_wand_bone'), I(W, 'wand2'), D('item/wand/gem_silver_new', 'dc_wand_silver'),
                        D('item/wand/gem_gold_new', 'dc_wand_gold'), D('item/wand/wand_brass', 'dc_wand_star')]
M['offhand:tome'] = [I(C, 'grimoire_closed'), D('item/book/leather_old', 'dc_book_leather'), D('item/book/dark_brown_new', 'dc_book_brown'),
                     I(C, 'grimoire_open'), D('item/book/dark_gray_new', 'dc_book_gray'), D('item/book/purple_new', 'dc_book_purple'),
                     D('item/book/book_of_the_dead_new', 'dc_book_dead'), D('item/book/gold', 'dc_book_gold')]
M['chest:Robe'] = [I(A, 'cloth_robe'), T('cloth_robe', 'sombre', 'cloth')] + [D('item/armor/torso/' + n, 'dc_' + n) for n in (
    'robe_1_new', 'robe_2_new', 'robe_3', 'robe_ego_2', 'robe_ego_1', 'robe_art_2')]
M['head:Chapeau'] = [D('item/armor/headgear/' + n, 'dc_' + n) for n in (
    'cap_1', 'wizard_hat_1', 'hat_1', 'wizard_hat_2', 'hat_2', 'cornuthaum', 'hat_3')]

# ---------- pack atlas ----------
keys = list(icons)
cols = 16
rows = (len(keys) + cols - 1) // cols
atlas = Image.new('RGBA', (cols * S, rows * S), (0, 0, 0, 0))
pos = {}
for i, k in enumerate(keys):
    x, y = (i % cols) * S, (i // cols) * S
    atlas.paste(icons[k], (x, y))
    pos[k] = [x, y]
os.makedirs(OUT, exist_ok=True)
atlas.save(os.path.join(OUT, 'icons.png'), optimize=True)
json.dump({'size': S, 'icons': pos, 'map': M}, open(os.path.join(OUT, 'icons.json'), 'w', encoding='utf8'),
          ensure_ascii=False, indent=1)

# ---------- preview ----------
Z = 2
cell = S * Z + 6
maxn = max(len(v) for v in M.values())
lab = 130
pv = Image.new('RGBA', (lab + maxn * cell + 6, len(M) * (cell + 12) + 6), (28, 25, 23, 255))
d = ImageDraw.Draw(pv)
for r, (cat, lst) in enumerate(M.items()):
    y = 4 + r * (cell + 12)
    d.text((6, y + cell // 2 - 6), cat, fill=(226, 214, 190, 255))
    for i, k in enumerate(lst):
        x = lab + i * cell
        d.rectangle((x, y, x + S * Z + 3, y + S * Z + 3), fill=(44, 40, 37, 255))
        pv.alpha_composite(icons[k].resize((S * Z, S * Z), Image.NEAREST), (x + 2, y + 2))
        d.text((x, y + S * Z + 4), k[:12], fill=(150, 140, 125, 255))
pv.save(os.path.join(OUT, 'preview.png'), optimize=True)
print(len(keys), 'icons; atlas', atlas.size, {k: len(v) for k, v in M.items()})
