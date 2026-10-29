import json, sys
M = ['iron', 'steel', 'ceramic', 'silver', 'gold']
C = ['leather', 'brown', 'charcoal', 'maroon', 'black']
TAB = ['leather', 'navy', 'forest', 'maroon', 'black']
W = ['light', 'medium', 'dark', 'silver', 'gold']
items = {}
def add(key, typ, name, var): items[key] = (typ, name, var)
for m in M:
    add('nasal_' + m, 'hat', 'Nasal_helm', m); add('greathelm_' + m, 'hat', 'Greathelm', m)
    add('mail_' + m, 'bandana', 'Mail', m)
    add('plate_' + m, 'armour', 'Plate', m); add('chain_' + m, 'chainmail', 'Chainmail', m)
    add('legarm_' + m, 'legs', 'Armour', m); add('sabatons_' + m, 'shoes', 'Armour', m)
    add('gauntlets_' + m, 'arms', 'Armour', m); add('arming_' + m, 'weapon', 'Arming_Sword', m)
for c in C:
    add('hood_' + c, 'hat', 'Hood', c); add('leather_' + c, 'armour', 'Leather', c)
    add('pants_' + c, 'legs', 'Pants', c); add('boots_' + c, 'shoes', 'Basic_Boots', c)
    add('rimboots_' + c, 'shoes', 'Rimmed_Boots', c); add('gloves_' + c, 'gloves', 'Gloves', c)
for t in TAB: add('tabard_' + t, 'jacket', 'Tabard', t)
for w in W: add('recurve_' + w, 'weapon', 'Recurve', w); add('great_' + w, 'weapon', 'Great', w)
for k, v in [('waraxe', 'Waraxe_waraxe'), ('mace', 'Mace_mace'), ('flail', 'Flail_flail'), ('longsword', 'Longsword_longsword'), ('crossbow', 'Crossbow_crossbow')]:
    n, var = v.split('_', 1); add(k, 'weapon', n, var)
for k, n, v in [('kite_gray', 'Kite', 'kite gray'), ('kite_graygray', 'Kite', 'kite gray gray'), ('kite_bluegray', 'Kite', 'kite blue gray'), ('kite_orange', 'Kite', 'kite orange'),
                ('spartan', 'Spartan_Shield', 'spartan'), ('crusader', 'Crusader_shield', 'crusader'),
                ('round_brown', 'Round_Shield', 'brown'), ('round_black', 'Round_Shield', 'black'), ('round_silver', 'Round_Shield', 'silver'), ('round_gold', 'Round_Shield', 'gold')]:
    add(k, 'shield', n, v)
add('quiver', 'quiver', 'Quiver', 'quiver')
for k, n, v in [('cape_tattered_maroon', 'Tattered', 'maroon'), ('cape_solid_forest', 'Solid', 'forest'), ('cape_tattered_black', 'Tattered', 'black'), ('cape_solid_black', 'Solid', 'black')]:
    add(k, 'cape', n, v)
add('hair', 'hair', 'Bangsshort', 'dark brown')
add('shirt', 'clothes', 'Longsleeve', 'charcoal')
add('shoes', 'shoes', 'Basic_Shoes', 'brown')
# répartition : une pièce par type et par recette
bytype = {}
for k, (t, n, v) in items.items(): bytype.setdefault(t, []).append(k)
n = max(len(v) for v in bytype.values())
recipes, contents = {}, {}
for i in range(n):
    parts = ['sex=male', 'body=Body_Color_light', 'head=Human_Male_light']
    keys = []
    for t, lst in bytype.items():
        if i < len(lst):
            k = lst[i]; typ, nm, var = items[k]
            parts.append(f'{typ}={nm}_{var}'); keys.append(k)
    recipes[f'r{i:02d}'] = '&'.join(parts); contents[f'r{i:02d}'] = keys
json.dump(recipes, open('recipes.json', 'w'), indent=1)
json.dump({'items': items, 'contents': contents}, open('items.json', 'w'), indent=1)
print(len(items), 'pièces,', n, 'recettes')
