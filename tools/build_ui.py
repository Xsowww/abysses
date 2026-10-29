import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from recolor import recolor
SRC,DONITZ,OUT=sys.argv[1],sys.argv[2],sys.argv[3]
os.makedirs(OUT,exist_ok=True)
def L(n): return Image.open(os.path.join(SRC,n)).convert('RGBA')
def frame(im,i,w,h=None):
    h=h or im.height; return im.crop((i*w,0,i*w+w,h))
def trim(im):
    bb=im.split()[3].getbbox(); return im.crop(bb),bb
meta={}
def save(name,im,slice_=None,notes='',**kw):
    im.save(os.path.join(OUT,name+'.png'))
    d={'file':name+'.png','w':im.width,'h':im.height}
    if slice_: d['slice']=list(slice_)
    d.update(kw); d['notes']=notes; meta[name]=d
# ---------------- panels
save('panel',recolor(L('20251029darkDwellers9SlicesE.png')),(32,32,32,32),
     'Fenêtre principale : cadre de pierre à coins gothiques, intérieur noir opaque (#161413). border-image-slice 32 fill ; padding conseillé ≈ 10–12 px × échelle (le cadre fait ~6 px, les ornements d’angle ~18 px).',
     content_inset=[10,10,10,10])
save('panel_inner',recolor(L('20251029darkDwellers9SlicesA.png')),(24,24,24,24),
     'Sous-panneau / section : pierre biseautée, intérieur gris-brun (#2d2a27), petits entrelacs aux coins. slice 24 fill ; bord ~5 px.',
     content_inset=[6,6,6,6])
save('panel_parchment',recolor(L('20251029darkDwellers9SlicesB.png')),(16,22,16,22),
     'Parchemin (rouleaux en haut/bas) pour lore / inscriptions — à utiliser avec parcimonie. Texte foncé (#2a1f19).')
save('panel_blood',recolor(L('20251029darkDwellers9SlicesD.png')),(32,32,32,32),
     'Variante intérieur sang (#561813) – alertes, mort, boss.')
# tooltip: shrink panel (9SlicesE) to 18px corners + 4px edges
E=recolor(L('20251029darkDwellers9SlicesE.png'))
c=18; t=Image.new('RGBA',(2*c+12,2*c+12))
mid=(48-6,48+6)
for (sx0,sx1,dx) in [(0,c,0),(mid[0],mid[1],c),(96-c,96,c+12)]:
    for (sy0,sy1,dy) in [(0,c,0),(mid[0],mid[1],c),(96-c,96,c+12)]:
        t.paste(E.crop((sx0,sy0,sx1,sy1)),(dx,dy))
save('tooltip',t,(18,18,18,18),'Infobulle : version compacte du cadre principal (coins 18 px). slice 18 fill ; padding ≈ 9 px × échelle (le texte doit dégager les ornements d’angle).',content_inset=[9,9,9,9])
# ---------------- header (title plate)
save('header',recolor(L('20251117darkDwellersHeaderC.png')),(12,32,12,32),
     'Plaque de titre gothique (3-slice horizontal). Hauteur fixe 32 px × échelle conseillée ; texte centré dans x 30..66.')
# ---------------- buttons (ButtonA1: 4 states) custom remaps -> iron faces
BA=L('20251029darkDwellersButtonA1-Sheet.png')
st={
 'button':{'c8146f':'2d2a27','f2176b':'5f594f','880f84':'1b1918','f2548b':'857c6d','a81271':'3b3733'},
 'button_hover':{'f27646':'3a2b20','f4a13a':'b9803f','ae3979':'241b16','f9d42f':'e0ae6a','d8526f':'5e4029'},
 'button_pressed':{'880f84':'161413','a81271':'2d2a27','c8146f':'48433d'},
 'button_disabled':{},
}
notes={'button':'Bouton normal (face de fer sombre).','button_hover':'Survol : liseré braise.','button_pressed':'Enfoncé.','button_disabled':'Désactivé.'}
for i,(n,m) in enumerate(st.items()):
    save(n,recolor(frame(BA,i,96),m),(6,12,6,12),notes[n]+' 96×24, slice [6,12,6,12] fill ; contenu y 6..17.',content_inset=[6,6,6,6])
# alternate red button (danger / confirm) = original ButtonA states recoloured to blood
save('button_blood',recolor(frame(BA,0,96)),(6,12,6,12),'Bouton « sang » (action dangereuse / confirmation).')
save('button_blood_hover',recolor(frame(BA,1,96)),(6,12,6,12),'Survol du bouton sang (braise).')
# ---------------- slots (emptyFrameA1: normal, hover, selected, invalid, disabled)
SA=L('20251124emptyFrameA1-Sheet.png')
for i,(n,txt) in enumerate([('slot','Case d’inventaire normale.'),('slot_hover','Survol (liseré braise).'),('slot_selected','Sélectionnée (or vif).'),('slot_invalid','Invalide / objet maudit (rouge sang).'),('slot_disabled','Désactivée.')]):
    save(n,recolor(frame(SA,i,32)),(8,8,8,8),txt+' 32×32 (cadre visible 1..30, intérieur noir). Taille fixe conseillée (icône 32×32 par-dessus ou 24×24 centrée) ; slice [8,8,8,8] fill si on l’agrandit.')
# skill slot: emptyFrameC1 (bevelled stone) state 0 / 2
SC=L('20251124emptyFrameC1-Sheet.png')
save('skill_slot',recolor(frame(SC,4,32)),(8,8,8,8),'Case de compétence (pierre biseautée sombre) 32×32.')
save('skill_slot_active',recolor(frame(SC,2,32),{'7bb6bc':'2d2a27','9cd9c6':'e0ae6a','6f8daa':'b9803f','6b699b':'8a552b','4c4682':'1b1918'}),(8,8,8,8),'Case de compétence active / sélectionnée (biseau braise).')
# equipment placeholders (frame A, normal state)
for k,fn in [('head','helmet'),('neck','neck'),('chest','chest'),('legs','pants'),('feet','boots'),('weapon','weapon'),('offhand','shield'),('ring','ring')]:
    save('equip_'+k,recolor(frame(L('20251124%sFrameA1-Sheet.png'%fn),0,32)),None,'Emplacement d’équipement vide (%s), même cadre que slot.png.'%k)
# ---------------- bars
B=recolor(L('20251118darkDwellersBarE.png')).crop((1,1,95,17))
save('bar_frame',B,(3,20,4,7),'Jauge (vie / endurance / xp) avec crâne à droite, intérieur transparent. 94×16, slice [3,20,4,7] (sans fill). Remplissage à placer dessous/à l’intérieur : fill_box.',fill_box={'x':7,'y':3,'w':67,'h':9})
B2=recolor(L('20251118darkDwellersBarA.png'))
B2,bb=trim(B2)
save('bar_frame_thin',B2,None,'Jauge fine à deux crânes (barre de vie d’ennemi / boss, cible). Pas de 9-slice propre (crânes sur les bords) : étirer seulement la partie centrale.')
def ramp(cols,w=4):
    im=Image.new('RGBA',(w,len(cols)))
    for y,cc in enumerate(cols):
        for x in range(w): im.putpixel((x,y),tuple(int(cc[i:i+2],16) for i in (0,2,4))+(255,))
    return im
save('bar_fill_health',ramp(['d6a898','c4493a','b8352a','9a2c22','7e1f17','7e1f17','662219','561813','40110e']),None,'Remplissage vie (9 px de haut, répéter en x).',repeat='repeat-x')
save('bar_fill_stamina',ramp(['d9d3a0','a9ab5e','8f9a4c','74914a','62803e','62803e','526b34','44582b','333f20']),None,'Remplissage endurance (mousse/olive).',repeat='repeat-x')
save('bar_fill_xp',ramp(['f3ead8','e0ae6a','c98a4a','b9803f','8a552b','8a552b','6b4a2c','5e4029','40291a']),None,'Remplissage expérience (braise/laiton).',repeat='repeat-x')
save('bar_fill_mana',ramp(['c9e0dc','8fbcb7','6fa8a4','5a8f8c','46736f','46736f','385d5a','2c4846','1d302f']),None,'Remplissage alternatif (abysse) – mana / focus.',repeat='repeat-x')
save('bar_empty',ramp(['2d2a27','1b1918','161413','161413','161413','161413','161413','120f0e','0b0a0a']),None,'Fond de jauge vide.',repeat='repeat-x')
# ---------------- divider (BarK recoloured to iron / bone)
K=recolor(L('20251118darkDwellersBarK.png'),{'d791a9':'b3a994','f2b8be':'d6cebd','ac6c8f':'857c6d','8e4e63':'5f594f','7c386b':'2d2a27','4b1764':'1b1918'})
save('divider',K,(0,11,0,11),'Séparateur orné (double filet à croix fleuronnées). 3-slice horizontal : slice [0,11,0,11], hauteur fixe 20 px × échelle.')
# ---------------- close button (4 states)
CB=L('20251125closeButton1-Sheet.png')
for i,n in enumerate(['close','close_hover','close_pressed','close_disabled']):
    save(n,recolor(frame(CB,i,32)),None,'Bouton fermer (X) 32×32 – état %d.'%i)
# ---------------- portrait / minimap
save('portrait_frame',recolor(L('20251125portraitFrameA.png')),None,'Cadre de portrait en ogive avec crânes (66×72). Ouverture transparente : x 14..51, y 11..66 (placer le portrait dessous).',opening={'x':14,'y':11,'w':38,'h':56})
save('minimap_frame',recolor(L('20251125compass.png')),None,'Anneau de boussole à pointes (N/E/S/W) pour la minimap (79×82), ouverture circulaire transparente centrée en (40,40), diamètre ≈ 51 px (x/y 15..65).',opening={'cx':40,'cy':40,'d':51})
# ---------------- cursors
MS=L('20251124mouseSmall1-Sheet.png')
_f=frame(MS,0,17); _a=_f.split()[3]
HS=min(((x,y) for y in range(17) for x in range(17) if _a.getpixel((x,y))),key=lambda p:p[0]+p[1]); HS=list(HS)
for i,n in enumerate(['cursor','cursor_click','cursor_hover','cursor_disabled']):
    cm={'9cd9c6':'f3ead8','7bb6bc':'e0d6c0','6f8daa':'b3a994','6b699b':'8a8276','4c4682':'6c665d','4e298e':'48433d','332370':'0b0a0a'}
    if n=='cursor_hover': cm.update({'7bb6bc':'e0ae6a','6f8daa':'b9803f','6b699b':'8a552b'})
    if n=='cursor_disabled': cm={'332370':'0b0a0a'}
    save(n,recolor(frame(MS,i,17),cm),None,'Pointeur de menu 17×17 (état %d). Pointe en haut à gauche.'%i,hotspot=HS)
# target frame (animated, skull) 5 frames of 63x64
CU=recolor(L('20251118darkDwellersCursourB1-Sheet.png'))
save('target_frame',CU,None,'Cadre de ciblage animé à crâne : 5 images de 63×64 en bande horizontale (sélection de cible / objet interactif).',frames=5,frame_w=63)
# crosshair: derivative of Donitz CC0 crosshair, outlined
D=Image.open(DONITZ).convert('RGBA')
def xhair(cx,cy,core,center,out):
    cell=D.crop((cx*15,cy*15,cx*15+15,cy*15+15)); a=cell.split()[3]
    bb=a.getbbox(); w,h=bb[2]-bb[0]+2,bb[3]-bb[1]+2
    im=Image.new('RGBA',(w,h))
    on=lambda x,y: 0<=x-1+bb[0]<15 and 0<=y-1+bb[1]<15 and a.getpixel((x-1+bb[0],y-1+bb[1]))>0
    for y in range(h):
        for x in range(w):
            if on(x,y): im.putpixel((x,y),core)
            elif any(on(x+dx,y+dy) for dx in (-1,0,1) for dy in (-1,0,1)): im.putpixel((x,y),out)
    m=(w//2,h//2)
    if on(*m): im.putpixel(m,center)
    return im
H=lambda s,a=255: tuple(int(s[i:i+2],16) for i in (0,2,4))+(a,)
X=xhair(5,1,H('f3ead8'),H('e7b277'),H('0b0a0a'))
save('crosshair',X,None,'Réticule de visée %d×%d (cœur os, contour encre, point braise). Centre = (%d,%d).'%(X.width,X.height,X.width//2,X.height//2),hotspot=[X.width//2,X.height//2])
X2=xhair(5,1,H('c4493a'),H('f3ead8'),H('0b0a0a'))
save('crosshair_hit',X2,None,'Réticule rouge (cible touchée / à portée).',hotspot=[X2.width//2,X2.height//2])
X3=xhair(4,2,H('f3ead8'),H('e7b277'),H('0b0a0a'))
save('crosshair_alt',X3,None,'Réticule alternatif (cercle à croix).',hotspot=[X3.width//2,X3.height//2])
meta['palette']={
 'bone':'#f3ead8','bone_dim':'#b3a994','stone_light':'#857c6d','stone':'#5f594f','iron':'#48433d','iron_dark':'#2d2a27','ink':'#161413','outline':'#0b0a0a',
 'gold':'#e0ae6a','ember':'#b9803f','ember_dark':'#8a552b','parchment_ink':'#2a1f19',
 'blood_light':'#c4493a','blood':'#9a2c22','blood_dark':'#561813',
 'text_title':'#e0ae6a','text_body':'#d6cebd','text_muted':'#857c6d','text_disabled':'#5f594f','text_danger':'#c4493a',
 'notes':'Couleurs échantillonnées sur les pièces recolorées. Toutes les pièces sont en pixels natifs : afficher à ×2 ou ×3 avec image-rendering: pixelated et border-image-width = slice × échelle.'}
meta['_source']='Tiny RPG – Dark Dwellers GUI (tiopalada, CC0) recoloré vers la palette du jeu ; réticules dérivés de Pixel Crosshairs (Donitz, CC0). Voir credits.json.'
json.dump(meta,open(os.path.join(OUT,'ui.json'),'w'),ensure_ascii=False,indent=1)
print(len(meta))
