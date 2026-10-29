// Interface : HUD, panneaux (inventaire, talents, journal, marchands…), écrans et menus.
import { input, ACTIONS, codeLabel } from '../core/input.js';
import { settings, saveSettings, hasSave, loadGame, deleteSave } from '../core/save.js';
import { sfx, unlockAudio } from '../core/audio.js';
import { icon, itemIconName } from './icons.js';
import { RARITIES, SLOTS, EQUIP_ORDER, WEAPONS, CONSUMABLES, affixText, itemName, itemColor, buyPrice, sellValue, isTwoHanded, makeConsumable } from '../data/items.js';
import { CLASSES, SKILLS, SPEC_LEVEL, xpForLevel } from '../data/classes.js';
import { QUESTS, QUEST_BY_ID, NPCS } from '../data/quests.js';
import { enemyLevel } from '../data/enemies.js';
import * as Inv from '../game/inventory.js';
import { escapeHtml, fmt, pick } from '../core/util.js';

const $ = (sel, root = document) => root.querySelector(sel);
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

// Panneaux qui bloquent les actions du joueur (déplacement compris).
const BLOCKING = new Set(['dialog', 'shop', 'portal', 'pause', 'options', 'stash']);

export class UI {
  constructor() {
    this.game = null;
    this.panel = null;
    this.opts = {};
    this.selected = null;
    this.confirmDestroy = null;
    this.rebindingId = null;
    this.mapBig = false;
    this.summaryOpen = false;
    this.screenOpen = false;
    this.hudTimer = 0;
    this.el = {
      hud: $('#hud'),
      panel: $('#panel-root'),
      screen: $('#screen'),
      toasts: $('#toasts'),
      tip: $('#tooltip'),
      fade: $('#fade'),
      minimap: $('#minimap'),
    };
    this.bindEvents();
  }

  setGame(g) { this.game = g; }
  get pd() { return this.game && this.game.pd; }

  // ================= ÉTAT =================
  blocksInput() { return this.screenOpen || this.summaryOpen || !!input.rebinding || (this.panel && BLOCKING.has(this.panel)); }
  isPaused() {
    if (this.screenOpen || this.summaryOpen) return true;
    if (this.panel === 'pause' || this.panel === 'options') return true;
    return !!this.panel && settings.pauseInMenus;
  }

  // ================= ÉVÉNEMENTS =================
  bindEvents() {
    const root = document;
    root.addEventListener('click', (e) => {
      unlockAudio();
      const a = e.target.closest('[data-action]');
      if (a && !a.disabled) { e.preventDefault(); this.action(a.dataset.action, a.dataset.arg, e); return; }
      const r = e.target.closest('[data-ref]');
      if (r) {
        if (e.shiftKey) { this.quickPocket(r.dataset.ref); return; }
        this.selected = r.dataset.ref;
        this.confirmDestroy = null;
        sfx('ui');
        this.refresh();
      }
    });
    root.addEventListener('contextmenu', (e) => {
      const r = e.target.closest('[data-ref]');
      if (r) { e.preventDefault(); this.quickAction(r.dataset.ref); }
      else if (e.target.closest('.panel, .screen')) e.preventDefault();
    });
    root.addEventListener('mouseover', (e) => {
      const r = e.target.closest('[data-ref],[data-talent],[data-skill],[data-tip]');
      if (!r) return;
      const html = this.tipFor(r);
      if (!html) return;
      this.el.tip.innerHTML = html;
      this.el.tip.classList.add('show');
      this.placeTip(e);
    });
    root.addEventListener('mousemove', (e) => { if (this.el.tip.classList.contains('show')) this.placeTip(e); });
    root.addEventListener('mouseout', (e) => {
      const r = e.target.closest('[data-ref],[data-talent],[data-skill],[data-tip]');
      if (r && !r.contains(e.relatedTarget)) this.hideTip();
    });
    root.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.setting === 'volume') { settings.volume = +t.value / 100; saveSettings(); }
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.setting && t.type === 'checkbox') { settings[t.dataset.setting] = t.checked; saveSettings(); }
    });
  }

  placeTip(e) {
    const t = this.el.tip;
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + 18, y = e.clientY + 14;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 18;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    t.style.left = Math.max(8, x) + 'px';
    t.style.top = Math.max(8, y) + 'px';
  }

  hideTip() { this.el.tip.classList.remove('show'); }

  tipFor(el) {
    if (!this.pd) return null;
    if (el.dataset.ref) {
      const it = this.refItem(el.dataset.ref);
      return it ? this.itemTip(it, { compare: !el.dataset.ref.startsWith('equip'), ref: el.dataset.ref }) : null;
    }
    if (el.dataset.talent) return this.talentTip(el.dataset.talent);
    if (el.dataset.skill) {
      const id = el.dataset.skill;
      if (id === 'special') { const sp = CLASSES[this.pd.cls].special; return `<div class="tt-name">${sp.name}</div><div class="tt-sub">Attaque spéciale · ${sp.stamina} endurance · ${sp.cd} s</div><div class="tt-desc">${sp.desc}</div>`; }
      if (id === 'potion') return `<div class="tt-name">${CONSUMABLES.potion.name}</div><div class="tt-desc">${CONSUMABLES.potion.desc}</div>`;
      if (id === 'pierre') return `<div class="tt-name">${CONSUMABLES.pierre.name}</div><div class="tt-desc">${CONSUMABLES.pierre.desc}</div>`;
      const S = SKILLS[id];
      if (!S) return '<div class="tt-desc">Emplacement vide. Débloquez des compétences dans l’arbre de talents.</div>';
      return `<div class="tt-name">${S.name}</div><div class="tt-sub">${S.stamina ? S.stamina + ' endurance · ' : ''}Recharge ${S.cd} s</div><div class="tt-desc">${S.desc}</div>`;
    }
    if (el.dataset.tip) return `<div class="tt-desc">${escapeHtml(el.dataset.tip)}</div>`;
    return null;
  }

  // ================= PANNEAUX =================
  open(name, opts = {}) {
    this.panel = name;
    this.opts = opts;
    this.selected = null;
    this.confirmDestroy = null;
    if (name === 'dialog') this.opts.greet = pick(NPCS[opts.npc].greet);
    input.clear();
    this.hideTip();
    this.renderPanel();
  }

  close() {
    if (input.rebinding) input.cancelRebind();
    this.panel = null;
    this.opts = {};
    this.selected = null;
    this.el.panel.innerHTML = '';
    this.el.panel.classList.remove('show');
    this.hideTip();
    input.clear();
  }

  toggle(name) {
    if (this.panel === name) this.close();
    else if (!this.panel || !BLOCKING.has(this.panel) || name === 'inventory') this.open(name);
  }

  escape() {
    if (input.rebinding) return;
    if (this.screenOpen || this.summaryOpen) return;
    if (this.panel === 'options' && this.opts.from === 'pause') { this.open('pause'); return; }
    if (this.panel === 'dialog' && this.opts.view) { this.opts.view = null; this.refresh(); return; }
    if (this.panel) { this.close(); return; }
    if (this.game && this.game.running) this.open('pause');
  }

  refresh() {
    if (this.screenOpen && this.screenRefresh) { this.screenRefresh(); return; }
    if (this.panel) this.renderPanel();
    this.refreshHudStatic();
  }

  renderPanel() {
    const root = this.el.panel;
    const body = root.querySelector('.panel-body');
    const scroll = body ? body.scrollTop : 0;
    const fn = this['panel_' + this.panel];
    if (!fn) { root.innerHTML = ''; return; }
    const { title, html, cls } = fn.call(this);
    root.innerHTML = `<div class="panel ${cls || ''}"><div class="panel-head"><h2>${title}</h2><button class="x" data-action="close" title="Fermer (Échap)">✕</button></div><div class="panel-body">${html}</div></div>`;
    root.classList.add('show');
    const nb = root.querySelector('.panel-body');
    if (nb) nb.scrollTop = scroll;
  }

  // ---------- Cellules d'objets ----------
  refItem(ref) {
    const pd = this.pd;
    const p = ref.split(':');
    if (p[0] === 'shop') return pd.shop && pd.shop[p[1]] ? pd.shop[p[1]][+p[2]] : null;
    if (p[0] === 'cons') return makeConsumable(p[1], 1);
    return Inv.getItem(pd, { c: p[0], i: p[0] === 'equip' ? p[1] : +p[1] });
  }

  cell(item, ref, extra = '') {
    if (!item) return `<div class="slot empty" ${ref ? `data-drop="${ref}"` : ''}>${extra}</div>`;
    const col = itemColor(item);
    const sel = this.selected === ref ? ' selected' : '';
    const rar = item.kind === 'equip' ? item.rarity : CONSUMABLES[item.id].rarity;
    const unsafe = item.found && this.pd.inRun && ref && ref.startsWith('inv') ? '<span class="unsafe" title="Non sécurisé">!</span>' : '';
    const qty = item.kind === 'consumable' && item.qty > 1 ? `<span class="qty">${item.qty}</span>` : '';
    return `<div class="slot r${rar}${sel}" data-ref="${ref}" style="--c:${col}">${icon(itemIconName(item))}${qty}${unsafe}${extra}</div>`;
  }

  itemTip(item, opts = {}) {
    const pd = this.pd;
    const col = itemColor(item);
    let h = `<div class="tt-name" style="color:${col}">${escapeHtml(itemName(item))}</div>`;
    if (item.kind === 'consumable') {
      const C = CONSUMABLES[item.id];
      h += `<div class="tt-sub">Consommable${item.qty > 1 ? ' · x' + item.qty : ''}</div><div class="tt-desc">${C.desc}</div>`;
      h += `<div class="tt-val">${icon('gold', 'gold')} Prix d’achat ${C.price} · revente ${Math.max(1, Math.floor(C.price / 3))}</div>`;
      return h;
    }
    const R = RARITIES[item.rarity];
    let sub = `${R.name} · ${SLOTS[item.slot].label}`;
    if (item.slot === 'weapon') { const W = WEAPONS[item.base]; sub = `${R.name} · ${W.name} · ${W.hands === 2 ? 'Deux mains' : 'Une main'}`; }
    if (item.slot !== 'pocket') sub += ` · Niv. ${item.ilvl}`;
    h += `<div class="tt-sub">${sub}</div><div class="tt-main">`;
    const eq = pd.equipment[item.slot];
    const cmp = opts.compare && eq && eq !== item ? eq : null;
    const delta = (a, b) => { if (b === undefined) return ''; const d = a - b; return d === 0 ? '' : `<span class="${d > 0 ? 'up' : 'down'}">(${d > 0 ? '+' : ''}${d})</span>`; };
    if (item.slot === 'weapon') {
      const W = WEAPONS[item.base];
      h += `<div>Dégâts : <b>${item.dmg}</b> ${cmp ? delta(item.dmg, cmp.dmg) : ''}</div>`;
      h += `<div class="dim">${(1 / W.cd).toFixed(1)} attaques/s · portée ${W.range}</div>`;
    }
    if (item.armor) h += `<div>Armure : <b>${item.armor}</b> ${cmp ? delta(item.armor, cmp.armor || 0) : ''}</div>`;
    if (item.block) h += `<div>Blocage : <b>${item.block} %</b></div>`;
    if (item.slot === 'pocket') h += `<div>Emplacements sécurisés : <b>${item.secureSlots}</b> ${cmp ? delta(item.secureSlots, cmp.secureSlots) : ''}</div><div class="dim">Les objets rangés dans la poche sont conservés si vous mourez.</div>`;
    h += '</div>';
    if (item.affixes && item.affixes.length) h += `<div class="tt-aff">${item.affixes.map((a) => `<div>${affixText(a)}</div>`).join('')}</div>`;
    if (isTwoHanded(item)) h += '<div class="dim">Empêche l’utilisation d’un bouclier.</div>';
    if (opts.ref && opts.ref.startsWith('inv') && item.found && pd.inRun) h += '<div class="tt-warn">⚠ Non sécurisé : perdu si vous mourez. Rangez-le dans votre poche ou équipez-le.</div>';
    if (opts.ref && opts.ref.startsWith('pocket')) h += '<div class="tt-ok">✓ Sécurisé dans votre poche</div>';
    if (opts.ref && opts.ref.startsWith('equip')) h += '<div class="tt-ok">✓ Équipé : jamais perdu</div>';
    if (opts.ref && opts.ref.startsWith('shop')) h += `<div class="tt-val">${icon('gold', 'gold')} Prix : <b>${fmt(buyPrice(item))}</b> or</div>`;
    else h += `<div class="tt-val">${icon('gold', 'gold')} Revente : ${fmt(sellValue(item))} or</div>`;
    if (cmp) h += `<div class="tt-cmp">Équipé actuellement : <span style="color:${itemColor(cmp)}">${escapeHtml(cmp.name)}</span></div>`;
    return h;
  }

  // Actions disponibles pour l'objet sélectionné selon le contexte.
  itemActions(ref) {
    const it = this.refItem(ref);
    if (!it) return [];
    const [c] = ref.split(':');
    const mode = this.panel;
    const A = [];
    if (c === 'cons') return A;
    if (c === 'shop') { A.push({ l: `Acheter (${fmt(buyPrice(it))} or)`, a: 'buy', main: true }); return A; }
    if (c === 'equip') { A.push({ l: 'Retirer', a: 'unequip' }); return A; }
    if (it.kind === 'equip') A.push({ l: 'Équiper', a: 'equip', main: true });
    if (it.kind === 'consumable' && it.id === 'potion' && c !== 'stash') A.push({ l: 'Boire', a: 'drink' });
    if (c === 'inv') {
      if (Inv.pocketSize(this.pd)) A.push({ l: 'Sécuriser (poche)', a: 'toPocket' });
      if (mode === 'stash') A.push({ l: 'Déposer au coffre', a: 'toStash', main: true });
    }
    if (c === 'pocket') A.push({ l: 'Sortir de la poche', a: 'fromPocket' });
    if (c === 'stash') A.push({ l: 'Prendre', a: 'fromStash', main: true });
    if (mode === 'shop' && c !== 'stash') A.push({ l: `Vendre (${fmt(sellValue(it))} or)`, a: 'sell', main: mode === 'shop' });
    A.push({ l: this.confirmDestroy === ref ? 'Confirmer la destruction' : 'Détruire', a: 'destroy', danger: true });
    return A;
  }

  detailHTML() {
    if (!this.selected) return '<div class="detail empty-detail">Cliquez sur un objet pour le sélectionner.<br><span class="dim">Clic droit : action rapide · Maj + clic : poche sécurisée</span></div>';
    const it = this.refItem(this.selected);
    if (!it) { this.selected = null; return this.detailHTML(); }
    const acts = this.itemActions(this.selected).map((x) => `<button class="btn ${x.main ? 'main' : ''} ${x.danger ? 'danger' : ''}" data-action="item" data-arg="${x.a}">${x.l}</button>`).join('');
    return `<div class="detail">${this.itemTip(it, { compare: !this.selected.startsWith('equip'), ref: this.selected })}<div class="actions">${acts}</div></div>`;
  }

  doItemAction(a, ref = this.selected) {
    const g = this.game;
    const pd = this.pd;
    if (!ref) return;
    const p = ref.split(':');
    const r = { c: p[0], i: p[0] === 'equip' ? p[1] : +p[1] };
    let err = null;
    switch (a) {
      case 'equip': err = Inv.equip(pd, r); if (!err) { sfx('pickup'); this.selected = null; } break;
      case 'unequip': err = Inv.unequip(pd, r.i); if (!err) { sfx('pickup'); this.selected = null; } break;
      case 'toPocket': err = Inv.moveToPocket(pd, r.i); if (!err) { sfx('pickup'); this.selected = null; } break;
      case 'fromPocket': err = Inv.moveFromPocket(pd, r.i); if (!err) { sfx('pickup'); this.selected = null; } break;
      case 'toStash': err = Inv.moveBetween(pd, 'inv', r.i, 'stash'); if (!err) { sfx('pickup'); this.selected = null; } break;
      case 'fromStash': err = Inv.moveBetween(pd, 'stash', r.i, 'inv'); if (!err) { sfx('pickup'); this.selected = null; } break;
      case 'drink': g.usePotion(); break;
      case 'sell': g.sell(r); this.selected = null; break;
      case 'buy': g.buy(p[1], +p[2]); this.selected = null; break;
      case 'destroy':
        if (this.confirmDestroy !== ref) { this.confirmDestroy = ref; break; }
        Inv.removeAt(pd, r); this.selected = null; this.confirmDestroy = null; sfx('error'); break;
    }
    if (err) { this.toast(err, 'bad', 2); sfx('error'); }
    g.player.recalc();
    g.save();
    this.refresh();
  }

  quickAction(ref) {
    const it = this.refItem(ref);
    if (!it) return;
    const c = ref.split(':')[0];
    const mode = this.panel;
    let a = null;
    if (c === 'cons') { this.game.buy('consumable', ref.split(':')[1]); return; }
    if (c === 'shop') a = 'buy';
    else if (c === 'equip') a = 'unequip';
    else if (c === 'stash') a = 'fromStash';
    else if (mode === 'shop') a = 'sell';
    else if (mode === 'stash' && c === 'inv') a = 'toStash';
    else if (c === 'pocket') a = it.kind === 'equip' ? 'equip' : 'fromPocket';
    else if (it.kind === 'equip') a = 'equip';
    else if (it.id === 'potion') a = 'drink';
    if (a) this.doItemAction(a, ref);
  }

  quickPocket(ref) {
    const c = ref.split(':')[0];
    if (c === 'inv') this.doItemAction('toPocket', ref);
    else if (c === 'pocket') this.doItemAction('fromPocket', ref);
  }

  // ---------- Actions génériques ----------
  action(name, arg, e) {
    const g = this.game;
    switch (name) {
      case 'close': sfx('ui'); if (this.panel === 'options' && this.opts.from === 'pause') this.open('pause'); else this.close(); break;
      case 'item': this.doItemAction(arg); break;
      case 'sort': Inv.sortInventory(this.pd); sfx('ui'); this.refresh(); break;
      case 'learn': g.learnTalent(arg); break;
      case 'spec': g.chooseSpec(arg); break;
      case 'respec': g.respec(); break;
      case 'tab': this.opts.tab = arg; sfx('ui'); this.refresh(); break;
      case 'quest-view': this.opts.view = arg; sfx('ui'); this.refresh(); break;
      case 'quest-accept': g.acceptQuest(arg); this.opts.view = null; this.refresh(); break;
      case 'quest-turnin': g.turnInQuest(arg); this.refresh(); break;
      case 'dialog-back': this.opts.view = null; this.refresh(); break;
      case 'open-shop': this.open('shop', { shop: arg, npc: this.opts.npc }); sfx('ui'); break;
      case 'open-portal': this.open('portal'); sfx('ui'); break;
      case 'buy-cons': { const n = +(e && e.target.dataset.n) || 1; for (let i = 0; i < n; i++) g.buy('consumable', arg); break; }
      case 'descend': this.close(); g.enterDungeon(+arg); break;
      case 'resume': this.close(); break;
      case 'options': this.open('options', { from: this.panel === 'pause' ? 'pause' : null }); break;
      case 'quit': g.save(); g.running = false; this.close(); this.showTitle(); break;
      case 'rebind': this.startRebind(arg); break;
      case 'reset-keys': input.resetBindings(); sfx('ui'); this.refresh(); break;
      case 'new-game': this.showClassSelect(); break;
      case 'continue': {
        const data = loadGame();
        if (data) { this.hideScreen(); g.load(data); }
        break;
      }
      case 'title-options': this.showOptionsScreen(); break;
      case 'back-title': this.showTitle(); break;
      case 'pick-class': this.opts.cls = arg; this.renderClassSelect(); break;
      case 'start-game': {
        const name = ($('#char-name') && $('#char-name').value.trim()) || 'Aventurier';
        const cls = this.screenCls || 'guerrier';
        if (hasSave() && !this.confirmNew) { this.confirmNew = true; this.renderClassSelect(); return; }
        deleteSave();
        this.hideScreen();
        g.newGame(name.slice(0, 18), cls);
        this.toast('Bienvenue au village. Parlez aux habitants (touche ' + input.label('interact') + ') !', 'good', 6);
        break;
      }
      case 'summary-ok': {
        this.summaryOpen = false;
        this.el.screen.innerHTML = '';
        this.el.screen.classList.remove('show');
        const cb = this.summaryCb;
        this.summaryCb = null;
        if (cb) cb();
        break;
      }
    }
  }

  startRebind(id) {
    this.rebindingId = id;
    this.refresh();
    input.startRebind(id, () => { this.rebindingId = null; this.refresh(); sfx('ui'); });
  }

  // ================= INVENTAIRE =================
  equipGridHTML() {
    const pd = this.pd;
    return `<div class="equip-grid">${EQUIP_ORDER.map((s) => {
      const it = pd.equipment[s];
      const blocked = s === 'offhand' && isTwoHanded(pd.equipment.weapon);
      return `<div class="eq-cell" style="grid-area:${s}">${this.cell(it, 'equip:' + s, it ? '' : `<span class="ph">${icon(s === 'weapon' ? 'epee' : s)}</span>`)}<div class="eq-label">${blocked ? 'Deux mains' : SLOTS[s].label}</div></div>`;
    }).join('')}</div>`;
  }

  statsHTML() {
    const p = this.game.player;
    const s = p.stats;
    const w = p.weapon();
    const red = Math.round(Math.min(0.75, p.armor / (p.armor + 40 + 12 * this.pd.level)) * 100);
    const rows = [
      ['PV max', fmt(p.maxHp)],
      ['Armure', `${p.armor} <span class="dim">(-${red} %)</span>`],
      ['Dégâts de l’arme', `${w.dmg} <span class="dim">(+${Math.round(s.dmgPct)} %)</span>`],
      ['Attaques / s', (p.attackSpeedMult() / w.cd).toFixed(2)],
      ['Critique', `${s.crit.toFixed(1)} % · x${(1 + s.critDmg / 100).toFixed(2)}`],
      ['Endurance', p.maxStamina],
      ['Vol de vie', `${s.lifesteal.toFixed(1)} %`],
      ['Blocage', `${pd_block(this.pd, s)} %`],
      ['Vitesse', `+${s.moveSpd} %`],
      ['Réduction recharge', `${s.cdr} %`],
      ['Régén. PV', `${s.hpRegen.toFixed(1)} /s`],
    ];
    return `<div class="stats">${rows.map((r) => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>`;
  }

  bagHTML() {
    const pd = this.pd;
    const used = pd.inventory.filter((x) => x).length;
    const ps = Inv.pocketSize(pd);
    let pocket = '';
    for (let i = 0; i < Inv.POCKET_MAX; i++) {
      if (i < ps) pocket += this.cell(pd.pocket[i], 'pocket:' + i);
      else pocket += `<div class="slot locked" data-tip="Équipez une meilleure poche sécurisée pour débloquer cet emplacement.">${icon('lock')}</div>`;
    }
    return `
      <div class="bag-head"><h3>Sac <span class="dim">${used}/${Inv.INV_SIZE}</span></h3><button class="btn small" data-action="sort">Trier</button></div>
      <div class="grid bag">${pd.inventory.map((it, i) => this.cell(it, 'inv:' + i)).join('')}</div>
      <div class="bag-head"><h3>${icon('pocket')} Poche sécurisée <span class="dim">${ps} emplacement${ps > 1 ? 's' : ''}</span></h3></div>
      <div class="grid pocket">${pocket}</div>
      <div class="gold-line">${icon('gold', 'gold')} <b>${fmt(pd.gold)}</b> or${pd.inRun ? ` <span class="dim">· butin d’or non sécurisé : ${fmt(pd.runGold)}</span>` : ''}</div>`;
  }

  panel_inventory() {
    const pd = this.pd;
    const html = `<div class="inv-layout">
      <div class="col">${this.equipGridHTML()}${this.statsHTML()}</div>
      <div class="col">${this.bagHTML()}${this.detailHTML()}
        <p class="hint">En expédition, le butin trouvé dans le sac (marqué <span class="unsafe inline">!</span>) est perdu si vous mourez. L’équipement porté et la poche sécurisée sont toujours conservés.</p>
      </div></div>`;
    return { title: `Inventaire — ${escapeHtml(pd.name)}, ${CLASSES[pd.cls].name} niv. ${pd.level}`, html, cls: 'wide' };
  }

  // ================= COFFRE =================
  panel_stash() {
    const pd = this.pd;
    const used = pd.stash.filter((x) => x).length;
    const html = `<div class="inv-layout">
      <div class="col"><div class="bag-head"><h3>Coffre <span class="dim">${used}/${Inv.STASH_SIZE}</span></h3></div>
        <div class="grid stash">${pd.stash.map((it, i) => this.cell(it, 'stash:' + i)).join('')}</div>
        <p class="hint">Le coffre reste au village : ce qui est dedans ne risque rien.</p></div>
      <div class="col">${this.bagHTML()}${this.detailHTML()}</div></div>`;
    return { title: 'Coffre de stockage', html, cls: 'wide' };
  }

  // ================= MARCHANDS =================
  panel_shop() {
    const pd = this.pd;
    const shop = this.opts.shop;
    let left = '';
    if (shop === 'forge') {
      left = `<h3>Armes et armures de Brann</h3><p class="dim">Le stock change à chaque retour d’expédition.</p>
        <div class="shop-list">${pd.shop.forge.map((it, i) => `<div class="shop-item">${this.cell(it, `shop:forge:${i}`)}<div class="si-info"><div style="color:${itemColor(it)}">${escapeHtml(it.name)}</div><div class="dim">${SLOTS[it.slot].label} · niv. ${it.ilvl}</div></div><div class="price ${pd.gold < buyPrice(it) ? 'poor' : ''}">${fmt(buyPrice(it))} ${icon('gold', 'gold')}</div></div>`).join('') || '<p class="dim">Plus rien en stock.</p>'}</div>`;
    } else {
      const cons = ['potion', 'pierre'].map((id) => {
        const C = CONSUMABLES[id];
        return `<div class="shop-item">${this.cell(makeConsumable(id, 1), 'cons:' + id)}<div class="si-info"><div>${C.name}</div><div class="dim">${C.desc}</div></div><div class="buy-btns"><button class="btn small" data-action="buy-cons" data-arg="${id}" data-n="1">x1 · ${C.price}</button><button class="btn small" data-action="buy-cons" data-arg="${id}" data-n="5">x5 · ${C.price * 5}</button></div></div>`;
      }).join('');
      left = `<h3>Fournitures d’Odile</h3><div class="shop-list">${cons}
        ${pd.shop.general.map((it, i) => `<div class="shop-item">${this.cell(it, `shop:general:${i}`)}<div class="si-info"><div style="color:${itemColor(it)}">${escapeHtml(it.name)}</div><div class="dim">Poche sécurisée · ${it.secureSlots} emplacements</div></div><div class="price ${pd.gold < buyPrice(it) ? 'poor' : ''}">${fmt(buyPrice(it))} ${icon('gold', 'gold')}</div></div>`).join('')}</div>`;
    }
    const html = `<div class="inv-layout"><div class="col">${left}</div><div class="col">${this.bagHTML()}${this.detailHTML()}<p class="hint">Clic droit sur un objet du sac pour le vendre rapidement.</p></div></div>`;
    return { title: shop === 'forge' ? 'Forge de Brann' : 'Comptoir d’Odile', html, cls: 'wide' };
  }

  // ================= DIALOGUE / QUÊTES =================
  questObjText(q, st) {
    const o = q.obj;
    const n = st ? st.progress : 0;
    switch (o.type) {
      case 'kill': return `Tuer : ${q.obj.target === 'rat' ? 'Rats des cryptes' : q.obj.target === 'squelette' ? 'Squelettes' : q.obj.target === 'archer' ? 'Archers squelettes' : 'Acolytes des Abysses'} (${n}/${o.count})`;
      case 'elite': return `Tuer des élites (${n}/${o.count})`;
      case 'boss': return `Vaincre le Gardien d’Os, profondeur ${o.depth} ou plus (${n}/${o.count})`;
      case 'extract': return `Réussir des extractions (${n}/${o.count})`;
      case 'depth': return `Atteindre la profondeur ${o.depth} (${n}/${o.count})`;
    }
    return '';
  }

  rewardText(q) {
    const R = q.reward;
    const parts = [];
    if (R.xp) parts.push(`${R.xp} XP`);
    if (R.gold) parts.push(`${R.gold} or`);
    if (R.item) parts.push(R.item.slot === 'pocket' ? 'une poche sécurisée' : `un objet ${RARITIES[R.item.minRarity ?? R.item.rarity ?? 1].name.toLowerCase()} ou mieux`);
    if (R.consumable) parts.push(`${R.consumable.qty} × ${CONSUMABLES[R.consumable.id].name}`);
    return parts.join(' · ');
  }

  panel_dialog() {
    const g = this.game;
    const id = this.opts.npc;
    const N = NPCS[id];
    const view = this.opts.view;
    if (view) {
      const q = QUEST_BY_ID[view];
      const st = this.pd.quests[view];
      const html = `<div class="dialog"><div class="npc-line">« ${q.desc} »</div>
        <div class="quest-box"><div><b>Objectif :</b> ${this.questObjText(q, st)}</div><div><b>Récompense :</b> ${this.rewardText(q)}</div></div>
        <div class="actions">${!st ? `<button class="btn main" data-action="quest-accept" data-arg="${q.id}">Accepter</button>` : ''}
        ${st && st.status === 'ready' ? `<button class="btn main" data-action="quest-turnin" data-arg="${q.id}">Rendre la quête</button>` : ''}
        <button class="btn" data-action="dialog-back">Retour</button></div></div>`;
      return { title: `${N.name} — ${q.name}`, html };
    }
    const ready = g.questsOf(id, 'ready');
    const avail = g.questsAvailable(id);
    const active = g.questsOf(id, 'active');
    let opts = '';
    for (const q of ready) opts += `<button class="opt ready" data-action="quest-turnin" data-arg="${q.id}">✔ Rendre : ${q.name}</button>`;
    for (const q of avail) opts += `<button class="opt new" data-action="quest-view" data-arg="${q.id}">! Nouvelle quête : ${q.name}</button>`;
    for (const q of active) opts += `<button class="opt" data-action="quest-view" data-arg="${q.id}">… ${q.name} <span class="dim">(${this.pd.quests[q.id].progress}/${q.obj.count})</span></button>`;
    if (N.shop) opts += `<button class="opt shop" data-action="open-shop" data-arg="${N.shop}">${icon('gold', 'gold')} Commercer</button>`;
    if (N.portal) opts += `<button class="opt portal" data-action="open-portal">✦ Ouvrir le portail des Abysses</button>`;
    opts += '<button class="opt" data-action="close">Au revoir.</button>';
    const html = `<div class="dialog"><div class="npc-head"><div class="npc-ava" style="background:${N.color}"></div><div><div class="npc-name">${N.name}</div><div class="dim">${N.title}</div></div></div>
      <div class="npc-line">« ${this.opts.greet} »</div><div class="opts">${opts}</div></div>`;
    return { title: N.name, html };
  }

  panel_journal() {
    const pd = this.pd;
    const rows = (status) => QUESTS.filter((q) => pd.quests[q.id] && pd.quests[q.id].status === status);
    const qHTML = (q) => {
      const st = pd.quests[q.id];
      const pct = Math.round((st.progress / q.obj.count) * 100);
      return `<div class="jq ${st.status}"><div class="jq-head"><b>${q.name}</b><span class="dim">${NPCS[q.giver].name}</span></div>
        <div class="dim">${q.desc}</div><div>${this.questObjText(q, st)}</div>
        <div class="pbar"><div style="width:${pct}%"></div></div>
        ${st.status === 'ready' ? `<div class="tt-ok">Terminée — retournez voir ${NPCS[q.giver].name}</div>` : ''}
        <div class="dim">Récompense : ${this.rewardText(q)}</div></div>`;
    };
    const ready = rows('ready'), active = rows('active'), done = rows('done');
    const S = pd.stats;
    const html = `
      ${ready.length ? `<h3>À rendre</h3>${ready.map(qHTML).join('')}` : ''}
      <h3>En cours</h3>${active.map(qHTML).join('') || '<p class="dim">Aucune quête en cours. Parlez aux habitants marqués d’un « ! ».</p>'}
      <h3>Terminées <span class="dim">(${done.length}/${QUESTS.length})</span></h3>
      <div class="done-list">${done.map((q) => `<span>✔ ${q.name}</span>`).join('') || '<span class="dim">—</span>'}</div>
      <h3>Statistiques</h3>
      <div class="stats small"><div><span>Monstres tués</span><b>${fmt(S.kills)}</b></div><div><span>Expéditions</span><b>${S.runs}</b></div><div><span>Extractions réussies</span><b>${S.extractions}</b></div><div><span>Morts</span><b>${S.deaths}</b></div><div><span>Profondeur max débloquée</span><b>${pd.maxDepth}</b></div><div><span>Temps de jeu</span><b>${Math.floor(pd.playTime / 60)} min</b></div></div>`;
    return { title: 'Journal de quêtes', html };
  }

  // ================= TALENTS =================
  talentTip(id) {
    const pd = this.pd;
    const C = CLASSES[pd.cls];
    let t = C.talents.find((x) => x.id === id), tree = C;
    if (!t) for (const k in C.specs) { const f = C.specs[k].talents.find((x) => x.id === id); if (f) { t = f; tree = C.specs[k]; } }
    if (!t) return null;
    const r = pd.talents[id] || 0;
    let h = `<div class="tt-name">${t.name}</div><div class="tt-sub">Rang ${r}/${t.max}</div>`;
    if (t.skill) h += `<div class="tt-desc">${SKILLS[t.skill].desc}</div><div class="dim">Recharge ${SKILLS[t.skill].cd} s${SKILLS[t.skill].stamina ? ' · ' + SKILLS[t.skill].stamina + ' endurance' : ''}</div>`;
    else {
      if (r > 0) h += `<div>Actuel : ${t.desc(r)}</div>`;
      if (r < t.max) h += `<div class="up">Rang suivant : ${t.desc(r + 1)}</div>`;
    }
    const req = tree.tierReq[t.tier];
    const spent = this.game.treeSpent(tree.talents);
    if (spent < req) h += `<div class="tt-warn">Nécessite ${req} points dans cet arbre (${spent} actuellement).</div>`;
    return h;
  }

  treeHTML(tree) {
    const pd = this.pd;
    const g = this.game;
    const tiers = Math.max(...tree.talents.map((t) => t.tier)) + 1;
    const spent = g.treeSpent(tree.talents);
    let h = '<div class="tree">';
    for (let k = 0; k < tiers; k++) {
      const open = spent >= tree.tierReq[k];
      h += `<div class="tier ${open ? '' : 'closed'}"><div class="tier-label">${ROMAN[k]}${tree.tierReq[k] ? `<span>${tree.tierReq[k]} pts</span>` : ''}</div><div class="tier-nodes">`;
      for (const t of tree.talents.filter((x) => x.tier === k)) {
        const r = pd.talents[t.id] || 0;
        const can = g.canLearn(t, tree);
        const cls = r >= t.max ? 'maxed' : can ? 'learnable' : open ? 'nopts' : 'locked';
        const ico = t.skill ? icon(SKILLS[t.skill].icon) : `<span class="t-letter">${t.name[0]}</span>`;
        h += `<div class="talent ${cls} ${t.skill ? 'skill' : ''} ${r ? 'has' : ''}" data-action="learn" data-arg="${t.id}" data-talent="${t.id}"><div class="t-ico">${ico}</div><div class="t-name">${t.name}</div><div class="t-rank">${r}/${t.max}</div></div>`;
      }
      h += '</div></div>';
    }
    return h + '</div>';
  }

  panel_talents() {
    const pd = this.pd;
    const g = this.game;
    const C = CLASSES[pd.cls];
    const pts = g.talentPoints();
    let spec = '';
    if (pd.spec) {
      const S = C.specs[pd.spec];
      spec = `<h3 style="color:${S.color}">Spécialisation : ${S.name}</h3><p class="dim">${S.desc}</p>${this.treeHTML(S)}`;
    } else {
      const can = pd.level >= SPEC_LEVEL;
      spec = `<h3>Spécialisation</h3><p class="dim">${can ? 'Choisissez votre voie. Ce choix oriente votre style de jeu (modifiable contre de l’or au village).' : `Disponible au niveau ${SPEC_LEVEL}.`}</p>
        <div class="spec-cards">${Object.entries(C.specs).map(([id, S]) => `<div class="spec-card ${can ? '' : 'locked'}" style="--c:${S.color}"><div class="spec-name">${S.name}</div><div class="dim">${S.desc}</div>
          <ul>${S.talents.map((t) => `<li>${t.skill ? '★ ' : ''}${t.name}</li>`).join('')}</ul>
          ${can ? `<button class="btn main" data-action="spec" data-arg="${id}">Choisir ${S.name}</button>` : `<div class="dim">${icon('lock')} Niveau ${SPEC_LEVEL}</div>`}</div>`).join('')}</div>`;
    }
    const bar = pd.skillBar.map((s, i) => `<div class="sb-slot" data-skill="${s || ''}"><span class="key">${input.label('skill' + (i + 1))}</span>${s ? icon(SKILLS[s].icon) : ''}<div class="sb-name">${s ? SKILLS[s].name : '—'}</div></div>`).join('');
    const inVillage = g.scene.type === 'village';
    const html = `<div class="tal-head"><div class="pts ${pts > 0 ? 'has' : ''}">Points disponibles : <b>${pts}</b></div><div class="dim">1 point par niveau. Cliquez sur un talent pour l’apprendre.</div></div>
      <div class="tal-layout"><div class="col"><h3>${C.name}</h3>${this.treeHTML(C)}</div><div class="col">${spec}
      <h3>Barre de compétences</h3><div class="sb-row">${bar}</div>
      <div class="respec">${inVillage ? `<button class="btn danger small" data-action="respec">Réinitialiser les talents (${fmt(g.respecCost())} or)</button>` : '<span class="dim">Réinitialisation possible au village.</span>'}</div></div></div>`;
    return { title: 'Arbre de talents', html, cls: 'wide' };
  }

  // ================= PORTAIL =================
  panel_portal() {
    const pd = this.pd;
    let rows = '';
    for (let d = 1; d <= pd.maxDepth; d++) {
      const L = enemyLevel(d);
      const kills = pd.bossKills[d] || 0;
      const diff = L - pd.level;
      const warn = diff >= 3 ? '<span class="bad">Très dangereux</span>' : diff >= 1 ? '<span class="warn">Difficile</span>' : '<span class="ok">Adapté</span>';
      rows += `<div class="depth-row"><div><div class="depth-name">Profondeur ${d}</div><div class="dim">Monstres niv. ${L} · Gardien niv. ${L + 1} · ${warn}${kills ? ` · Boss vaincu ×${kills}` : ''}</div></div><button class="btn main" data-action="descend" data-arg="${d}">Descendre</button></div>`;
    }
    const ps = Inv.pocketSize(pd);
    const pots = Inv.countConsumable(pd, 'potion'), stones = Inv.countConsumable(pd, 'pierre');
    const html = `<p>Le portail mène à <b>La Crypte Oubliée</b>. Chaque descente génère un nouveau donjon.</p>
      <div class="rules"><div>✓ Équipement porté : <b>toujours conservé</b></div><div>✓ Poche sécurisée (${ps} empl.) : <b>conservée</b></div><div>✗ Butin trouvé dans le sac et or ramassé : <b>perdus si vous mourez</b></div>
      <div class="dim">Pour rentrer : point d’extraction (vert), portail après le boss, ou pierre de retour (${input.label('stone')}).</div></div>
      <div class="dim">Vous emportez : ${pots} potion(s), ${stones} pierre(s) de retour.</div>
      <div class="depths">${rows}</div>`;
    return { title: 'Portail des Abysses', html };
  }

  // ================= MENUS =================
  panel_pause() {
    const html = `<div class="menu"><button class="btn main" data-action="resume">Reprendre</button><button class="btn" data-action="options">Touches et options</button><button class="btn" data-action="quit">Sauvegarder et quitter</button>
      ${this.pd && this.pd.inRun ? '<p class="warn">Quitter pendant une expédition compte comme une mort : le butin non sécurisé sera perdu.</p>' : ''}</div>`;
    return { title: 'Pause', html, cls: 'narrow' };
  }

  optionsHTML() {
    const rows = ACTIONS.map((a) => `<div class="kb-row"><span>${a.label}</span><button class="btn key ${this.rebindingId === a.id ? 'waiting' : ''}" data-action="rebind" data-arg="${a.id}">${this.rebindingId === a.id ? 'Appuyez sur une touche…' : codeLabel(input.bindings[a.id])}</button></div>`).join('');
    return `<div class="opt-layout"><div class="col"><h3>Touches</h3><p class="dim">Cliquez puis appuyez sur la touche ou le bouton de souris voulu. Échap pour annuler. Une touche déjà utilisée est échangée.</p>
      <div class="kb">${rows}<div class="kb-row"><span>Menu / fermer</span><button class="btn key" disabled>Échap</button></div></div>
      <button class="btn small" data-action="reset-keys">Touches par défaut</button></div>
      <div class="col"><h3>Options</h3>
      <label class="opt-row">Volume <input type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}" data-setting="volume"></label>
      <label class="opt-row"><input type="checkbox" data-setting="pauseInMenus" ${settings.pauseInMenus ? 'checked' : ''}> Mettre en pause quand un menu est ouvert</label>
      <label class="opt-row"><input type="checkbox" data-setting="screenShake" ${settings.screenShake ? 'checked' : ''}> Tremblements de l’écran</label>
      <label class="opt-row"><input type="checkbox" data-setting="showDamage" ${settings.showDamage ? 'checked' : ''}> Afficher les dégâts</label>
      </div></div>`;
  }

  panel_options() { return { title: 'Touches et options', html: this.optionsHTML(), cls: 'wide' }; }

  // ================= ÉCRANS =================
  showScreen(html) {
    this.screenRefresh = null;
    this.screenOpen = true;
    this.el.screen.innerHTML = html;
    this.el.screen.classList.add('show');
    this.el.hud.classList.add('hidden');
    this.close();
  }

  hideScreen() {
    this.screenOpen = false;
    this.el.screen.innerHTML = '';
    this.el.screen.classList.remove('show');
  }

  showTitle() {
    this.confirmNew = false;
    const save = loadGame();
    const cont = save ? `<button class="btn main big" data-action="continue">Continuer<span class="sub">${escapeHtml(save.name)} · ${CLASSES[save.cls] ? CLASSES[save.cls].name : ''} niv. ${save.level}</span></button>` : '';
    this.showScreen(`<div class="screen title-screen"><div class="logo">LES ABYSSES</div><div class="tagline">Descendez. Survivez. Revenez plus fort.</div>
      <div class="menu">${cont}<button class="btn ${save ? '' : 'main'} big" data-action="new-game">Nouvelle partie</button><button class="btn" data-action="title-options">Touches et options</button></div>
      <div class="version">v0.1 · prototype</div></div>`);
  }

  showOptionsScreen() {
    this.showScreen(`<div class="screen"><div class="panel wide"><div class="panel-head"><h2>Touches et options</h2></div><div class="panel-body">${this.optionsHTML()}<div class="actions"><button class="btn main" data-action="back-title">Retour</button></div></div></div></div>`);
    this.screenRefresh = () => this.showOptionsScreen();
  }

  showClassSelect() {
    this.screenCls = 'guerrier';
    this.confirmNew = false;
    this.renderClassSelect();
  }

  renderClassSelect() {
    const nameVal = $('#char-name') ? $('#char-name').value : '';
    if (this.opts.cls && !CLASSES[this.opts.cls].locked) this.screenCls = this.opts.cls;
    const cards = Object.entries(CLASSES).map(([id, C]) => `<div class="class-card ${C.locked ? 'locked' : ''} ${this.screenCls === id ? 'sel' : ''}" ${C.locked ? '' : `data-action="pick-class" data-arg="${id}"`} style="--c:${C.color}">
      <div class="cc-ico" style="background:${C.color}"></div><div class="cc-name">${C.name}</div><div class="dim">${C.desc}</div>
      ${C.locked ? `<div class="soon">${icon('lock')} Bientôt</div>` : `<div class="cc-specs">Spécialisations : ${Object.values(C.specs).map((s) => `<b style="color:${s.color}">${s.name}</b>`).join(' ou ')}</div>`}</div>`).join('');
    this.showScreen(`<div class="screen class-screen"><h1>Choisissez votre classe</h1><div class="class-cards">${cards}</div>
      <div class="name-row"><label>Nom du personnage <input id="char-name" maxlength="18" placeholder="Aventurier" value="${escapeHtml(nameVal)}"></label></div>
      ${this.confirmNew ? '<p class="warn">Une sauvegarde existe déjà : elle sera effacée. Cliquez à nouveau pour confirmer.</p>' : ''}
      <div class="menu row"><button class="btn" data-action="back-title">Retour</button><button class="btn main big" data-action="start-game">${this.confirmNew ? 'Confirmer et commencer' : 'Commencer l’aventure'}</button></div></div>`);
    this.opts = {};
  }

  showSummary(d, cb) {
    this.close();
    this.summaryOpen = true;
    this.summaryCb = cb;
    const list = (arr) => arr.map((x) => `<li style="color:${x.color}">${escapeHtml(x.name)}${x.qty > 1 ? ' ×' + x.qty : ''}</li>`).join('');
    let body = `<div class="sum-stats"><div><b>${d.kills}</b><span>monstres tués</span></div><div><b>${d.xp}</b><span>XP gagnée (conservée)</span></div>`;
    body += d.success ? `<div><b>${fmt(d.gold)}</b><span>or rapporté</span></div>` : `<div><b class="bad">-${fmt(d.lostGold || 0)}</b><span>or perdu</span></div>`;
    body += '</div>';
    if (d.success) body += `<h3>Butin rapporté</h3>${d.kept.length ? `<ul class="loot">${list(d.kept)}</ul>` : '<p class="dim">Aucun objet.</p>'}`;
    else {
      body += `<h3>Sauvé par la poche sécurisée</h3>${d.kept.length ? `<ul class="loot">${list(d.kept)}</ul>` : '<p class="dim">Rien.</p>'}`;
      body += `<h3>Butin perdu</h3>${d.lost.length ? `<ul class="loot lost">${list(d.lost)}</ul>` : '<p class="dim">Rien.</p>'}`;
      body += '<p class="dim">Votre équipement porté est intact.</p>';
    }
    this.el.screen.innerHTML = `<div class="screen summary ${d.success ? 'win' : 'lose'}"><h1>${d.title}</h1><div class="dim">${d.subtitle}</div>${body}<div class="menu"><button class="btn main big" data-action="summary-ok">Retour au village</button></div></div>`;
    this.el.screen.classList.add('show');
  }

  onSceneChange() {
    this.close();
    this.el.hud.classList.remove('hidden');
    this.el.fade.classList.remove('out');
    void this.el.fade.offsetWidth;
    this.el.fade.classList.add('out');
    this.buildHud();
  }

  // ================= TOASTS =================
  toast(msg, type = 'info', dur = 2.5) {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    this.el.toasts.appendChild(el);
    while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 400); }, dur * 1000);
  }

  // ================= HUD =================
  buildHud() {
    const h = this.el.hud;
    h.innerHTML = `
      <div id="hud-zone"><div class="zone-name"></div><div class="zone-sub"></div></div>
      <div id="hud-map"><canvas id="minimap" width="200" height="200"></canvas><div class="map-hint"></div></div>
      <div id="tracker"></div>
      <div id="boss-bar" class="hidden"><div class="bb-name"></div><div class="bb-bar"><div class="bb-fill"></div><div class="bb-phase"></div></div></div>
      <div id="channel" class="hidden"><div class="ch-label"></div><div class="ch-bar"><div class="ch-fill"></div></div></div>
      <div id="prompt" class="hidden"></div>
      <div id="buffs"></div>
      <div id="bottom">
        <div class="orb-row">
          <div class="bar hp"><div class="fill"></div><span></span></div>
          <div class="bar sta"><div class="fill"></div><span></span></div>
        </div>
        <div id="skillbar"></div>
        <div class="bar xp"><div class="fill"></div><span></span></div>
      </div>
      <div id="keys-hint"></div>`;
    this.el.minimap = $('#minimap');
    this.hud = {
      zone: $('.zone-name', h), zoneSub: $('.zone-sub', h), tracker: $('#tracker'), boss: $('#boss-bar'), bossName: $('.bb-name', h), bossFill: $('.bb-fill', h),
      channel: $('#channel'), chLabel: $('.ch-label', h), chFill: $('.ch-fill', h), prompt: $('#prompt'), buffs: $('#buffs'),
      hpFill: $('.bar.hp .fill', h), hpText: $('.bar.hp span', h), staFill: $('.bar.sta .fill', h), staText: $('.bar.sta span', h),
      xpFill: $('.bar.xp .fill', h), xpText: $('.bar.xp span', h), skillbar: $('#skillbar'), mapHint: $('.map-hint', h), keys: $('#keys-hint'), mapBox: $('#hud-map'),
    };
    this.refreshHudStatic();
  }

  refreshHudStatic() {
    if (!this.hud || !this.pd) return;
    const pd = this.pd;
    const g = this.game;
    const s = g.scene;
    this.hud.zone.textContent = s.type === 'village' ? 'Village de Cendrebourg' : `La Crypte Oubliée — Profondeur ${s.depth}`;
    // Barre de compétences
    const slots = [{ id: 'special', key: 'special', ico: 'special' }];
    for (let i = 0; i < 4; i++) slots.push({ id: pd.skillBar[i], key: 'skill' + (i + 1), ico: pd.skillBar[i] ? SKILLS[pd.skillBar[i]].icon : null, idx: i });
    slots.push({ id: 'potion', key: 'potion', ico: 'potion', count: Inv.countConsumable(pd, 'potion') });
    slots.push({ id: 'pierre', key: 'stone', ico: 'pierre', count: Inv.countConsumable(pd, 'pierre') });
    this.hud.skillbar.innerHTML = slots.map((sl) => `<div class="sk ${sl.ico ? '' : 'empty'} sk-${sl.id || 'none'}" data-skill="${sl.id || ''}" data-key="${sl.key}">
      ${sl.ico ? icon(sl.ico) : ''}<div class="cd"></div><span class="key">${input.label(sl.key)}</span>${sl.count !== undefined ? `<span class="count">${sl.count}</span>` : ''}</div>`).join('');
    this.hud.skEls = [...this.hud.skillbar.querySelectorAll('.sk')];
    this.hud.mapHint.textContent = `${input.label('map')} : agrandir`;
    this.hud.keys.innerHTML = `<span>${input.label('inventory')}</span> Inventaire <span>${input.label('talents')}</span> Talents${g.talentPoints() > 0 ? ' <b class="glow">(' + g.talentPoints() + ')</b>' : ''} <span>${input.label('journal')}</span> Journal <span>Échap</span> Menu`;
    this.refreshTracker();
  }

  refreshTracker() {
    if (!this.hud || !this.pd) return;
    const pd = this.pd;
    const qs = QUESTS.filter((q) => pd.quests[q.id] && pd.quests[q.id].status !== 'done').slice(0, 5);
    this.hud.tracker.innerHTML = qs.length ? `<div class="tr-title">Quêtes</div>` + qs.map((q) => {
      const st = pd.quests[q.id];
      return `<div class="tr-q ${st.status}"><b>${q.name}</b><div>${st.status === 'ready' ? `✔ Retournez voir ${NPCS[q.giver].name}` : this.questObjText(q, st)}</div></div>`;
    }).join('') : '';
  }

  updateHud(dt) {
    const g = this.game;
    if (!this.hud || !g || !g.scene || !this.pd) return;
    const p = g.player;
    const pd = this.pd;
    const h = this.hud;
    h.hpFill.style.width = (100 * Math.max(0, p.hp) / p.maxHp) + '%';
    h.hpText.textContent = `${Math.ceil(Math.max(0, p.hp))} / ${p.maxHp}`;
    h.staFill.style.width = (100 * p.stamina / p.maxStamina) + '%';
    h.staText.textContent = `${Math.floor(p.stamina)} / ${p.maxStamina}`;
    const need = xpForLevel(pd.level);
    h.xpFill.style.width = (100 * pd.xp / need) + '%';
    h.xpText.textContent = `Niveau ${pd.level} — ${fmt(pd.xp)} / ${fmt(need)} XP`;
    h.zoneSub.innerHTML = `${icon('gold', 'gold')} ${fmt(pd.gold)}${pd.inRun ? ` <span class="run-gold" title="Or non sécurisé">+${fmt(pd.runGold)}</span>` : ''}`;

    // Recharges
    if (h.skEls) {
      for (const el of h.skEls) {
        const id = el.dataset.skill;
        let k = 0;
        if (id === 'special') k = Math.max(0, p.specialCd) / (CLASSES[pd.cls].special.cd * p.cdMult());
        else if (id === 'potion') k = Math.max(0, p.potionCd) / 2.5;
        else if (SKILLS[id]) k = Math.max(0, p.skillCd[id] || 0) / (SKILLS[id].cd * p.cdMult());
        el.querySelector('.cd').style.height = (Math.min(1, k) * 100) + '%';
      }
    }

    // Buffs
    const bHtml = p.buffs.map((b) => `<div class="buff b-${b.id}">${icon(b.id === 'cri' ? 'shout' : b.id === 'dechainement' ? 'rage' : 'wall')}<span>${Math.ceil(b.t)}</span></div>`).join('');
    if (h.buffs._last !== bHtml) { h.buffs.innerHTML = bHtml; h.buffs._last = bHtml; }

    // Boss
    const boss = g.scene.boss;
    if (boss && g.scene.bossEngaged && !boss.dead) {
      h.boss.classList.remove('hidden');
      h.bossName.textContent = `${boss.def.name} — niv. ${boss.level}${boss.phase === 2 ? ' · FUREUR' : ''}`;
      h.bossFill.style.width = (100 * Math.max(0, boss.hp) / boss.maxHp) + '%';
    } else h.boss.classList.add('hidden');

    // Canalisation
    if (p.channel) {
      h.channel.classList.remove('hidden');
      h.chLabel.textContent = `${p.channel.label} ${(p.channel.dur - p.channel.t).toFixed(1)} s`;
      h.chFill.style.width = (100 * p.channel.t / p.channel.dur) + '%';
    } else h.channel.classList.add('hidden');

    // Invite d'interaction
    const o = g.hover;
    if (o && !p.dead && !this.panel) {
      const verb = o.type === 'npc' ? 'Parler à' : o.type === 'chest' || o.type === 'stash' ? 'Ouvrir :' : o.type === 'extract' ? 'S’extraire :' : 'Entrer :';
      const txt = `<span class="key">${input.label('interact')}</span> ${verb} ${o.label}`;
      if (h.prompt._last !== txt) { h.prompt.innerHTML = txt; h.prompt._last = txt; }
      h.prompt.classList.remove('hidden');
    } else h.prompt.classList.add('hidden');

    // Mini-carte (rafraîchie ~15 fois/s)
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 1 / 15;
      const big = this.mapBig;
      h.mapBox.classList.toggle('big', big);
      const cv = this.el.minimap;
      const size = big ? Math.min(560, window.innerHeight - 160) : 200;
      if (cv.width !== size) { cv.width = size; cv.height = size; }
      g.renderer.drawMinimap(g, cv, big);
    }
  }
}

function pd_block(pd, s) {
  return pd.equipment.offhand ? Math.round(s.block) : 0;
}
