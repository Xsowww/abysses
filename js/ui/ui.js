// Interface : HUD, panneaux (inventaire, talents, journal, marchands…), écrans et menus.
import { input, ACTIONS, codeLabel } from '../core/input.js';
import { settings, saveSettings, hasSave, loadGame, deleteSave } from '../core/save.js';
import { sfx, unlockAudio, applyVolumes } from '../core/audio.js';
import { playMusic, playAmbience } from '../core/music.js';
import { PROLOGUE, LORE, LORE_BY_ID, npcTalk } from '../data/story.js';
import { icon, itemIconName, itemIcon } from './icons.js';
import { startTitleBg, stopTitleBg } from './titlebg.js';
import { drawHero } from '../game/hero.js';
import { hasSprite, drawSprite, walkFrame } from '../game/sprites.js';
import {
  RARITIES, SLOTS, EQUIP_ORDER, WEAPONS, CONSUMABLES, affixText, itemName, itemColor, itemRarity, itemLore, itemClass,
  buyPrice, sellValue, isTwoHanded, makeConsumable, slotLabel, starterKit,
} from '../data/items.js';
import { CLASSES, SKILLS, SPEC_LEVEL, xpForLevel } from '../data/classes.js';
import { QUESTS, QUEST_BY_ID, NPCS } from '../data/quests.js';
import { enemyLevel } from '../data/enemies.js';
import * as Inv from '../game/inventory.js';
import { escapeHtml, fmt, pick } from '../core/util.js';

const $ = (sel, root = document) => root.querySelector(sel);
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const MENU_TABS = ['inventory', 'talents', 'journal'];

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
      area: $('#area'),
      banner: $('#banner'),
      subtitle: $('#subtitle'),
      message: $('#message'),
      flash: $('#flash'),
      hurt: $('#hurt'),
      canvas: $('#game'),
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
      if (a && !a.disabled) { e.preventDefault(); this.action(a.dataset.action, a.dataset.arg, e, a); return; }
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
      if (t.dataset.setting && t.type === 'range') { settings[t.dataset.setting] = +t.value / 100; saveSettings(); applyVolumes(); }
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.setting && t.type === 'checkbox') { settings[t.dataset.setting] = t.checked; saveSettings(); }
    });
  }

  placeTip(e) {
    const t = this.el.tip;
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + 20, y = e.clientY + 16;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 20;
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
    if (el.dataset.skill !== undefined) {
      const id = el.dataset.skill;
      if (id === 'special') { const sp = CLASSES[this.pd.cls].special; return `<div class="tt-name">${sp.name}</div><div class="tt-sub">Attaque spéciale · ${sp.stamina} endurance · ${sp.cd} s</div><div class="tt-desc">${sp.desc}</div>`; }
      if (id === 'potion' || id === 'pierre') { const C = CONSUMABLES[id]; return `<div class="tt-name">${C.name}</div><div class="tt-sub">Consommable</div><div class="tt-desc">${C.desc}</div><div class="tt-lore">${C.lore}</div>`; }
      const S = SKILLS[id];
      if (!S) return '<div class="tt-desc dim">Emplacement vide. Les compétences se débloquent dans l’arbre de talents.</div>';
      return `<div class="tt-name">${S.name}</div><div class="tt-sub">${S.stamina ? S.stamina + ' endurance · ' : ''}recharge ${S.cd} s</div><div class="tt-desc">${S.desc}</div>`;
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
    this.renderPanel(true);
    sfx(MENU_TABS.includes(name) || name === 'dialog' ? 'page' : 'ui');
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
    else if (MENU_TABS.includes(this.panel) && MENU_TABS.includes(name)) { this.panel = name; this.selected = null; this.renderPanel(); sfx('ui'); }
    else if (!this.panel || !BLOCKING.has(this.panel) || name === 'inventory') this.open(name);
  }

  // Touches pendant les dialogues / récits.
  onKey(code) {
    if (this.storyState && (code === 'Space' || code === 'Enter' || code === 'KeyE')) { this.storyNext(); return true; }
    if (this.panel === 'dialog' && this.opts.seq && (code === 'Space' || code === 'Enter' || code === input.bindings.interact)) { this.seqNext(); return true; }
    return false;
  }

  escape() {
    if (this.storyState) { this.storyEnd(); return; }
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

  renderPanel(fresh = false) {
    const root = this.el.panel;
    const body = root.querySelector('.panel-body');
    const scroll = body && !fresh ? body.scrollTop : 0;
    const fn = this['panel_' + this.panel];
    if (!fn) { root.innerHTML = ''; return; }
    const { title, sub, html, cls, footer } = fn.call(this);
    let head;
    if (MENU_TABS.includes(this.panel)) {
      const labels = { inventory: 'Équipement', talents: 'Talents', journal: 'Journal' };
      head = `<div class="tabs">${MENU_TABS.map((t) => `<button class="tab ${t === this.panel ? 'on' : ''}" data-action="tab-menu" data-arg="${t}"><kbd>${input.label(t)}</kbd>${labels[t]}</button>`).join('')}</div>${sub ? `<div class="ph-sub">${sub}</div>` : ''}`;
    } else head = `<div class="ph-title">${title}</div>${sub ? `<div class="ph-sub">${sub}</div>` : ''}`;
    const foot = footer || '<span><kbd>Échap</kbd>Fermer</span>';
    root.innerHTML = `<div class="panel frame ${cls || ''}" ${fresh ? '' : 'style="animation:none"'}><header class="ph">${head}<button class="x" data-action="close" title="Fermer">✕</button></header><div class="rule"></div><div class="panel-body">${html}</div><footer class="pf">${foot}</footer></div>`;
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
    if (!item) return `<div class="slot empty">${extra}</div>`;
    const col = itemColor(item);
    const sel = this.selected === ref ? ' selected' : '';
    const unsafe = item.found && this.pd.inRun && ref && ref.startsWith('inv') ? '<span class="unsafe" title="Non sécurisé">!</span>' : '';
    const qty = item.kind === 'consumable' && item.qty > 1 ? `<span class="qty">${item.qty}</span>` : '';
    const ic = itemClass(item);
    const other = ic && ic !== this.pd.cls ? ' style="opacity:.45"' : '';
    return `<div class="slot r${itemRarity(item)}${sel}" data-ref="${ref}" style="--c:${col}"><span${other}>${itemIcon(item)}</span>${qty}${unsafe}${extra}</div>`;
  }

  itemTip(item, opts = {}) {
    const pd = this.pd;
    const col = itemColor(item);
    let h = `<div class="tt-name" style="color:${col}">${escapeHtml(itemName(item))}</div>`;
    if (item.kind === 'consumable') {
      const C = CONSUMABLES[item.id];
      h += `<div class="tt-sub">Consommable${item.qty > 1 ? ' · ' + item.qty + ' exemplaires' : ''}</div><div class="tt-desc">${C.desc}</div>`;
      h += `<div class="tt-val">Prix ${C.price} · revente ${Math.max(1, Math.floor(C.price / 3))} ${icon('gold', 'gold')}</div><div class="tt-lore">${C.lore}</div>`;
      return h;
    }
    const R = RARITIES[item.rarity];
    let sub = `${R.name} · ${slotLabel(item)}`;
    if (item.slot === 'weapon') sub += isTwoHanded(item) ? ' · deux mains' : WEAPONS[item.base].ranged ? ' · à distance' : ' · une main';
    if (item.slot !== 'pocket') sub += ` · niveau ${item.ilvl}`;
    h += `<div class="tt-sub">${sub}</div><div class="tt-main">`;
    const eq = pd.equipment[item.slot];
    const cmp = opts.compare && eq && eq !== item ? eq : null;
    const delta = (a, b) => { if (b === undefined) return ''; const d = a - b; return d === 0 ? '' : ` <span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</span>`; };
    if (item.slot === 'weapon') {
      const W = WEAPONS[item.base];
      h += `<div><span>Dégâts</span><b>${item.dmg}${cmp ? delta(item.dmg, cmp.dmg) : ''}</b></div>`;
      h += `<div><span class="dim">Cadence</span><span class="dim">${(1 / W.cd).toFixed(1)} / s</span></div>`;
      if (W.pierce) h += '<div><span class="dim">Traverse</span><span class="dim">1 ennemi</span></div>';
    }
    if (item.armor) h += `<div><span>Armure</span><b>${item.armor}${cmp ? delta(item.armor, cmp.armor || 0) : ''}</b></div>`;
    if (item.block) h += `<div><span>Blocage</span><b>${item.block} %</b></div>`;
    if (item.dmgBonus) h += `<div><span>Dégâts</span><b>+${item.dmgBonus} %</b></div>`;
    if (item.slot === 'pocket') h += `<div><span>Emplacements sécurisés</span><b>${item.secureSlots}${cmp ? delta(item.secureSlots, cmp.secureSlots) : ''}</b></div>`;
    h += '</div>';
    if (item.affixes && item.affixes.length) h += `<div class="tt-aff">${item.affixes.map((a) => `<div>${affixText(a)}</div>`).join('')}</div>`;
    const ic = itemClass(item);
    if (ic && ic !== pd.cls) h += `<div class="tt-warn">Réservé à la classe ${CLASSES[ic].name}. Peut être vendu.</div>`;
    if (isTwoHanded(item)) h += '<div class="dim">Empêche l’usage de la main gauche.</div>';
    if (opts.ref && opts.ref.startsWith('inv') && item.found && pd.inRun) h += '<div class="tt-warn">Non sécurisé : perdu si vous mourez. Rangez-le dans la poche ou équipez-le.</div>';
    if (opts.ref && opts.ref.startsWith('pocket')) h += '<div class="tt-ok">Sécurisé dans votre poche.</div>';
    if (opts.ref && opts.ref.startsWith('equip')) h += '<div class="tt-ok">Porté : jamais perdu.</div>';
    if (opts.ref && opts.ref.startsWith('shop')) h += `<div class="tt-val">Prix : <b style="color:var(--bone)">${fmt(buyPrice(item))}</b> ${icon('gold', 'gold')}</div>`;
    else h += `<div class="tt-val">Revente : ${fmt(sellValue(item))} ${icon('gold', 'gold')}</div>`;
    if (cmp) h += `<div class="tt-cmp">Porté : <span style="color:${itemColor(cmp)}">${escapeHtml(cmp.name)}</span></div>`;
    h += `<div class="tt-lore">${itemLore(item)}</div>`;
    return h;
  }

  itemActions(ref) {
    const it = this.refItem(ref);
    if (!it) return [];
    const [c] = ref.split(':');
    const mode = this.panel;
    const A = [];
    if (c === 'cons') return A;
    if (c === 'shop') { A.push({ l: `Acheter · ${fmt(buyPrice(it))} or`, a: 'buy', main: true }); return A; }
    if (c === 'equip') { A.push({ l: 'Retirer', a: 'unequip' }); return A; }
    if (it.kind === 'equip') A.push({ l: 'Équiper', a: 'equip', main: true });
    if (it.kind === 'consumable' && it.id === 'potion' && c !== 'stash') A.push({ l: 'Boire', a: 'drink' });
    if (c === 'inv') {
      if (Inv.pocketSize(this.pd)) A.push({ l: 'Sécuriser', a: 'toPocket' });
      if (mode === 'stash') A.push({ l: 'Déposer', a: 'toStash', main: true });
    }
    if (c === 'pocket') A.push({ l: 'Sortir de la poche', a: 'fromPocket' });
    if (c === 'stash') A.push({ l: 'Prendre', a: 'fromStash', main: true });
    if (mode === 'shop' && c !== 'stash') A.push({ l: `Vendre · ${fmt(sellValue(it))} or`, a: 'sell', main: true });
    A.push({ l: this.confirmDestroy === ref ? 'Confirmer' : 'Détruire', a: 'destroy', danger: true });
    return A;
  }

  detailHTML() {
    if (!this.selected) return '<div class="detail empty-detail">Sélectionnez un objet.<br>Clic droit : action rapide · Maj + clic : poche sécurisée</div>';
    const it = this.refItem(this.selected);
    if (!it) { this.selected = null; return this.detailHTML(); }
    const acts = this.itemActions(this.selected).map((x) => `<button class="btn small ${x.main ? 'main' : ''} ${x.danger ? 'danger' : ''}" data-action="item" data-arg="${x.a}">${x.l}</button>`).join('');
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
  action(name, arg, e, el) {
    const g = this.game;
    switch (name) {
      case 'close': sfx('ui'); if (this.panel === 'options' && this.opts.from === 'pause') this.open('pause'); else this.close(); break;
      case 'tab-menu': this.toggle(arg); break;
      case 'item': this.doItemAction(arg); break;
      case 'sort': Inv.sortInventory(this.pd); sfx('ui'); this.refresh(); break;
      case 'learn': g.learnTalent(arg); break;
      case 'spec': g.chooseSpec(arg); break;
      case 'respec': g.respec(); break;
      case 'quest-view': {
        const q = QUEST_BY_ID[arg];
        if (!this.pd.quests[arg] && q.intro) this.startSeq(q.intro, () => { this.opts.view = arg; });
        else { this.opts.view = arg; sfx('ui'); this.refresh(); }
        break;
      }
      case 'quest-turnin-talk': {
        const q = QUEST_BY_ID[arg];
        if (!g.canTurnIn(arg)) { this.toast('Libérez de la place dans votre inventaire.', 'bad', 2); sfx('error'); break; }
        if (q.outro) this.startSeq(q.outro, () => g.turnInQuest(arg));
        else g.turnInQuest(arg);
        break;
      }
      case 'talk': this.startSeq(npcTalk(this.opts.npc, this.pd)); break;
      case 'seq-next': this.seqNext(); break;
      case 'lore-read': this.opts.lore = arg; sfx('page'); this.refresh(); break;
      case 'lore-back': this.opts.lore = null; sfx('page'); this.refresh(); break;
      case 'story-next': this.storyNext(); break;
      case 'quest-accept': g.acceptQuest(arg); this.opts.view = null; this.refresh(); break;
      case 'quest-turnin': g.turnInQuest(arg); this.refresh(); break;
      case 'dialog-back': this.opts.view = null; this.refresh(); break;
      case 'open-shop': this.open('shop', { shop: arg, npc: this.opts.npc }); break;
      case 'open-portal': this.open('portal'); break;
      case 'buy-cons': { const n = +(el && el.dataset.n) || 1; for (let i = 0; i < n; i++) g.buy('consumable', arg); break; }
      case 'descend': this.close(); g.enterDungeon(+arg); break;
      case 'resume': this.close(); break;
      case 'options': this.open('options', { from: this.panel === 'pause' ? 'pause' : null }); break;
      case 'quit': g.save(); g.running = false; this.close(); this.showTitle(); break;
      case 'rebind': this.startRebind(arg); break;
      case 'reset-keys': input.resetBindings(); sfx('ui'); this.refresh(); break;
      case 'new-game': sfx('ui'); this.showClassSelect(); break;
      case 'continue': {
        const data = loadGame();
        if (data) { this.hideScreen(); g.load(data); }
        break;
      }
      case 'title-options': sfx('ui'); this.showOptionsScreen(); break;
      case 'back-title': sfx('ui'); this.showTitle(); break;
      case 'credits': sfx('ui'); this.showCredits(); break;
      case 'pick-class': if (!CLASSES[arg].locked) { this.screenCls = arg; this.confirmNew = false; sfx('ui'); this.renderClassSelect(); } break;
      case 'start-game': {
        const name = ($('#char-name') && $('#char-name').value.trim()) || 'Sans-nom';
        const cls = this.screenCls || 'guerrier';
        if (hasSave() && !this.confirmNew) { this.confirmNew = true; this.renderClassSelect(); return; }
        deleteSave();
        this.hideScreen();
        this.showStory(PROLOGUE, () => {
          g.newGame(name.slice(0, 18), cls);
          setTimeout(() => this.toast(`Maëlis vous attend près du portail, au nord. Parlez avec ${input.label('interact')}.`, 'good', 7), 4000);
        });
        break;
      }
      case 'summary-ok': {
        this.summaryOpen = false;
        this.el.screen.innerHTML = '';
        this.el.screen.classList.remove('show', 'overlay');
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

  // ================= ÉQUIPEMENT =================
  paperdollHTML() {
    const pd = this.pd;
    return `<div class="paperdoll">${EQUIP_ORDER.map((s) => {
      const it = pd.equipment[s];
      const blocked = s === 'offhand' && isTwoHanded(pd.equipment.weapon);
      const phIcon = s === 'weapon' ? (pd.cls === 'rodeur' ? 'arc' : 'epee') : s === 'offhand' ? (pd.cls === 'rodeur' ? 'quiver' : 'offhand') : s;
      const label = s === 'offhand' ? (pd.cls === 'rodeur' ? 'Carquois' : 'Bouclier') : SLOTS[s].label;
      return `<div class="eq-cell" style="grid-area:${s}">${this.cell(it, 'equip:' + s, it ? '' : `<span class="ph-icon">${icon(phIcon)}</span>`)}<div class="eq-label">${blocked ? 'deux mains' : label}</div></div>`;
    }).join('')}</div>`;
  }

  statsHTML() {
    const p = this.game.player;
    const s = p.stats;
    const w = p.weapon();
    const red = Math.round(Math.min(0.75, p.armor / (p.armor + 40 + 12 * this.pd.level)) * 100);
    const rows = [
      ['Vitalité', fmt(p.maxHp)],
      ['Armure', `${p.armor} <span class="dim">· -${red} %</span>`],
      ['Dégâts de l’arme', `${w.dmg} <span class="dim">· +${Math.round(s.dmgPct)} %</span>`],
      ['Cadence', `${(p.attackSpeedMult() / w.cd).toFixed(2)} / s`],
      ['Critique', `${s.crit.toFixed(1)} % · ×${(1 + s.critDmg / 100).toFixed(2)}`],
      ['Endurance', p.maxStamina],
      ['Vol de vie', `${s.lifesteal.toFixed(1)} %`],
      ['Blocage', `${this.pd.equipment.offhand && this.pd.equipment.offhand.block ? Math.round(s.block) : 0} %`],
      ['Vitesse', `+${s.moveSpd} %`],
      ['Recharge', `-${s.cdr} %`],
      ['Régénération', `${s.hpRegen.toFixed(1)} /s`],
      ...(s.poison ? [['Venin', `${s.poison} %`]] : []),
      ...(s.pierce ? [['Traversée', `+${s.pierce}`]] : []),
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
      <div class="bag-head"><h3>Sac <span class="dim">${used} / ${Inv.INV_SIZE}</span></h3><button class="btn small" data-action="sort">Trier</button></div>
      <div class="grid bag">${pd.inventory.map((it, i) => this.cell(it, 'inv:' + i)).join('')}</div>
      <div class="bag-head"><h3>Poche sécurisée <span class="dim">${ps} empl.</span></h3></div>
      <div class="grid pocket">${pocket}</div>
      <div class="gold-line">${icon('gold', 'gold')} ${fmt(pd.gold)} or${pd.inRun ? ` <span class="dim">· ${fmt(pd.runGold)} or ramassé, non sécurisé</span>` : ''}</div>`;
  }

  panel_inventory() {
    const pd = this.pd;
    const C = CLASSES[pd.cls];
    const html = `<div class="inv-layout">
      <div class="col">${this.paperdollHTML()}${this.statsHTML()}</div>
      <div class="col">${this.bagHTML()}${this.detailHTML()}
        <p class="hint">En expédition, le butin du sac marqué <span class="unsafe inline">!</span> est perdu à la mort. L’équipement porté et la poche sécurisée sont toujours conservés.</p>
      </div></div>`;
    return { sub: `${escapeHtml(pd.name)} · ${C.name}${pd.spec ? ' ' + C.specs[pd.spec].name : ''} · niveau ${pd.level}`, html, cls: 'wide', footer: '<span><kbd>Clic</kbd>Sélectionner</span><span><kbd>Clic D</kbd>Action rapide</span><span><kbd>Maj</kbd>+ clic : poche</span><span><kbd>Échap</kbd>Fermer</span>' };
  }

  // ================= COFFRE =================
  panel_stash() {
    const pd = this.pd;
    const used = pd.stash.filter((x) => x).length;
    const html = `<div class="inv-layout">
      <div class="col"><div class="bag-head"><h3>Coffre <span class="dim">${used} / ${Inv.STASH_SIZE}</span></h3></div>
        <div class="grid stash">${pd.stash.map((it, i) => this.cell(it, 'stash:' + i)).join('')}</div>
        <p class="hint">Ce qui dort ici ne craint rien des Abysses.</p></div>
      <div class="col">${this.bagHTML()}${this.detailHTML()}</div></div>`;
    return { title: 'Coffre', sub: 'Un vieux coffre cerclé de fer', html, cls: 'wide', footer: '<span><kbd>Clic D</kbd>Déposer / prendre</span><span><kbd>Échap</kbd>Fermer</span>' };
  }

  // ================= MARCHANDS =================
  panel_shop() {
    const pd = this.pd;
    const shop = this.opts.shop;
    let left = '';
    if (shop === 'forge') {
      left = `<h3>Étal de la forge</h3><p class="hint" style="margin-top:-4px">Le stock change à chaque retour d’expédition.</p>
        <div class="shop-list">${pd.shop.forge.map((it, i) => `<div class="shop-item">${this.cell(it, `shop:forge:${i}`)}<div class="si-info"><div style="color:${itemColor(it)}">${escapeHtml(it.name)}</div><div class="dim">${slotLabel(it)} · niveau ${it.ilvl}</div></div><div class="price ${pd.gold < buyPrice(it) ? 'poor' : ''}">${fmt(buyPrice(it))} ${icon('gold', 'gold')}</div></div>`).join('') || '<p class="dim">Plus rien en stock.</p>'}</div>`;
    } else {
      const cons = ['potion', 'pierre'].map((id) => {
        const C = CONSUMABLES[id];
        return `<div class="shop-item">${this.cell(makeConsumable(id, 1), 'cons:' + id)}<div class="si-info"><div>${C.name}</div><div class="dim">${C.desc}</div></div><div class="buy-btns"><button class="btn small" data-action="buy-cons" data-arg="${id}" data-n="1">×1 · ${C.price}</button><button class="btn small" data-action="buy-cons" data-arg="${id}" data-n="5">×5 · ${C.price * 5}</button></div></div>`;
      }).join('');
      left = `<h3>Fournitures</h3><div class="shop-list">${cons}
        ${pd.shop.general.map((it, i) => `<div class="shop-item">${this.cell(it, `shop:general:${i}`)}<div class="si-info"><div style="color:${itemColor(it)}">${escapeHtml(it.name)}</div><div class="dim">Poche sécurisée · ${it.secureSlots} emplacements</div></div><div class="price ${pd.gold < buyPrice(it) ? 'poor' : ''}">${fmt(buyPrice(it))} ${icon('gold', 'gold')}</div></div>`).join('')}</div>`;
    }
    const html = `<div class="inv-layout"><div class="col">${left}</div><div class="col">${this.bagHTML()}${this.detailHTML()}</div></div>`;
    return {
      title: shop === 'forge' ? 'La forge de Brann' : 'Le comptoir d’Odile',
      sub: shop === 'forge' ? '« De l’acier honnête. Paye et il est à toi. »' : '« Je rachète tout. Sans poser de questions. »',
      html, cls: 'wide', footer: '<span><kbd>Clic D</kbd>Acheter / vendre</span><span><kbd>Échap</kbd>Fermer</span>',
    };
  }

  // ================= DIALOGUE / QUÊTES =================
  questObjText(q, st) {
    const o = q.obj;
    const n = st ? st.progress : 0;
    const names = { rat: 'Goules', squelette: 'Squelettes', archer: 'Archers squelettes', acolyte: 'Acolytes des Abysses' };
    switch (o.type) {
      case 'kill': return `${names[o.target]} abattus : ${n} / ${o.count}`;
      case 'elite': return `Élites abattues : ${n} / ${o.count}`;
      case 'boss': return `Gardien d’Os vaincu (profondeur ${o.depth}+) : ${n} / ${o.count}`;
      case 'extract': return `Extractions réussies : ${n} / ${o.count}`;
      case 'depth': return `Atteindre la profondeur ${o.depth} : ${n} / ${o.count}`;
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

  startSeq(lines, done = null) {
    if (!lines || !lines.length) { if (done) done(); this.refresh(); return; }
    this.opts.seq = { lines, i: 0, done };
    this.opts.view = null;
    sfx('page');
    this.refresh();
  }

  seqNext() {
    const sq = this.opts.seq;
    if (!sq) return;
    sq.i++;
    sfx('ui');
    if (sq.i >= sq.lines.length) {
      this.opts.seq = null;
      if (sq.done) sq.done();
    }
    if (this.panel === 'dialog') this.refresh();
  }

  panel_dialog() {
    const g = this.game;
    const id = this.opts.npc;
    const N = NPCS[id];
    const view = this.opts.view;
    if (this.opts.seq) {
      const sq = this.opts.seq;
      const last = sq.i >= sq.lines.length - 1;
      const html = `<div class="dialog seq"><div class="npc-line">« ${sq.lines[sq.i]} »</div>
        <div class="seq-foot"><span class="dim">${sq.i + 1} / ${sq.lines.length}</span><button class="btn main" data-action="seq-next">${last ? 'Terminer' : 'Continuer'}</button></div></div>`;
      return { title: N.name, sub: N.title, html, cls: 'narrow', footer: `<span><kbd>Espace</kbd>Continuer</span><span><kbd>Échap</kbd>Fermer</span>` };
    }
    if (view) {
      const q = QUEST_BY_ID[view];
      const st = this.pd.quests[view];
      const html = `<div class="dialog"><div class="npc-line">« ${q.desc} »</div>
        <div class="quest-box"><div><span class="dim">Objectif —</span> ${this.questObjText(q, st)}</div><div><span class="dim">Récompense —</span> ${this.rewardText(q)}</div></div>
        <div class="actions" style="justify-content:center;margin-top:18px">${!st ? `<button class="btn main" data-action="quest-accept" data-arg="${q.id}">Accepter</button>` : ''}
        ${st && st.status === 'ready' ? `<button class="btn main" data-action="quest-turnin-talk" data-arg="${q.id}">Rendre la quête</button>` : ''}
        <button class="btn" data-action="dialog-back">Retour</button></div></div>`;
      return { title: q.name, sub: N.name, html };
    }
    const ready = g.questsOf(id, 'ready');
    const avail = g.questsAvailable(id);
    const active = g.questsOf(id, 'active');
    let opts = '';
    for (const q of ready) opts += `<button class="opt ready" data-action="quest-turnin-talk" data-arg="${q.id}">Rendre — ${q.name}</button>`;
    for (const q of avail) opts += `<button class="opt new" data-action="quest-view" data-arg="${q.id}">${q.main ? 'Histoire' : 'Nouvelle quête'} — ${q.name}</button>`;
    for (const q of active) opts += `<button class="opt" data-action="quest-view" data-arg="${q.id}">${q.name} <span class="dim">(${this.pd.quests[q.id].progress} / ${q.obj.count})</span></button>`;
    if (npcTalk(id, this.pd).length) opts += '<button class="opt" data-action="talk">Parler</button>';
    if (N.shop) opts += `<button class="opt shop" data-action="open-shop" data-arg="${N.shop}">Commercer</button>`;
    if (N.portal) opts += '<button class="opt portal" data-action="open-portal">Ouvrir le portail des Abysses</button>';
    opts += '<button class="opt" data-action="close">Prendre congé</button>';
    const html = `<div class="dialog"><div class="npc-line">« ${this.opts.greet} »</div><div class="opts">${opts}</div></div>`;
    return { title: N.name, sub: N.title, html, cls: 'narrow' };
  }

  panel_journal() {
    const pd = this.pd;
    const known = (pd.story && pd.story.lore) || [];
    if (this.opts.lore) {
      const L = LORE_BY_ID[this.opts.lore];
      const html = `<div class="lore-read"><h3>${L.title}</h3><div class="lore-text">${escapeHtml(L.text).replace(/\n/g, '<br>')}</div><div class="actions" style="justify-content:center"><button class="btn" data-action="lore-back">Retour</button></div></div>`;
      return { sub: 'Fragment', html, cls: 'wide' };
    }
    const rows = (status) => QUESTS.filter((q) => pd.quests[q.id] && pd.quests[q.id].status === status);
    const qHTML = (q) => {
      const st = pd.quests[q.id];
      const pct = Math.round((st.progress / q.obj.count) * 100);
      return `<div class="jq ${st.status}"><div class="jq-head"><b>${q.name}</b><span class="dim">${NPCS[q.giver].name}</span></div>
        <div class="dim" style="font-style:italic">${q.desc}</div><div>${this.questObjText(q, st)}</div>
        <div class="pbar"><div style="width:${pct}%"></div></div>
        ${st.status === 'ready' ? `<div class="warn">Terminée — retournez voir ${NPCS[q.giver].name}.</div>` : ''}
        <div class="dim">Récompense : ${this.rewardText(q)}</div></div>`;
    };
    const ready = rows('ready'), active = rows('active'), done = rows('done');
    const S = pd.stats;
    const html = `
      ${ready.length ? `<h3>À rendre</h3>${ready.map(qHTML).join('')}` : ''}
      <h3>En cours</h3>${active.map(qHTML).join('') || '<p class="hint">Aucune quête en cours. Les habitants qui ont besoin de vous portent un signe au-dessus de la tête.</p>'}
      <h3>Accomplies <span class="dim">${done.length} / ${QUESTS.length}</span></h3>
      <div class="done-list">${done.map((q) => `<span>${q.name}</span>`).join('') || '<span>—</span>'}</div>
      <h3>Fragments <span class="dim">${known.length} / ${LORE.length}</span></h3>
      <div class="lore-list">${LORE.map((l) => known.includes(l.id) ? `<button class="opt" data-action="lore-read" data-arg="${l.id}">${l.title}</button>` : '<div class="opt locked-lore">— fragment non découvert —</div>').join('')}</div>
      <h3>Chroniques</h3>
      <div class="stats" style="margin-top:0"><div><span>Créatures abattues</span><b>${fmt(S.kills)}</b></div><div><span>Descentes</span><b>${S.runs}</b></div><div><span>Retours réussis</span><b>${S.extractions}</b></div><div><span>Morts</span><b>${S.deaths}</b></div><div><span>Profondeur atteinte</span><b>${pd.maxDepth}</b></div><div><span>Temps passé</span><b>${Math.floor(pd.playTime / 60)} min</b></div></div>`;
    return { sub: 'Ce que l’on attend de vous, et ce que vous avez accompli', html, cls: 'wide' };
  }

  // ================= TALENTS =================
  talentTip(id) {
    const pd = this.pd;
    const C = CLASSES[pd.cls];
    let t = C.talents.find((x) => x.id === id), tree = C;
    if (!t) for (const k in C.specs) { const f = C.specs[k].talents.find((x) => x.id === id); if (f) { t = f; tree = C.specs[k]; } }
    if (!t) return null;
    const r = pd.talents[id] || 0;
    let h = `<div class="tt-name">${t.name}</div><div class="tt-sub">Rang ${r} / ${t.max}${t.skill ? ' · compétence' : ''}</div>`;
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
        h += `<div class="talent ${cls} ${t.skill ? 'skill' : ''} ${r ? 'has' : ''}" data-action="learn" data-arg="${t.id}" data-talent="${t.id}"><div class="t-ico">${ico}</div><div class="t-name">${t.name}</div><div class="t-rank">${r} / ${t.max}</div></div>`;
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
      spec = `<h3>Voie du ${S.name}</h3><p class="hint" style="margin-top:-4px">${S.desc}</p>${this.treeHTML(S)}`;
    } else {
      const can = pd.level >= SPEC_LEVEL;
      spec = `<h3>Spécialisation</h3><p class="hint" style="margin-top:-4px">${can ? 'Choisissez votre voie. Ce choix pourra être défait contre de l’or, au village.' : `Une voie s’ouvrira au niveau ${SPEC_LEVEL}.`}</p>
        <div class="spec-cards">${Object.entries(C.specs).map(([id, S]) => `<div class="spec-card ${can ? '' : 'locked'}" style="--c:${S.color}"><div class="spec-name">${S.name}</div><div class="dim" style="font-style:italic">${S.desc}</div>
          <ul>${S.talents.map((t) => `<li>${t.name}${t.skill ? ' <span class="warn">(compétence)</span>' : ''}</li>`).join('')}</ul>
          ${can ? `<button class="btn main small" data-action="spec" data-arg="${id}">Embrasser cette voie</button>` : `<div class="dim">${icon('lock')} Niveau ${SPEC_LEVEL}</div>`}</div>`).join('')}</div>`;
    }
    const bar = pd.skillBar.map((s, i) => `<div class="sb-slot" data-skill="${s || ''}"><span class="key">${input.label('skill' + (i + 1))}</span>${s ? icon(SKILLS[s].icon) : ''}<div class="sb-name">${s ? SKILLS[s].name : '—'}</div></div>`).join('');
    const inVillage = g.scene.type === 'village';
    const html = `<div class="tal-head"><div class="pts ${pts > 0 ? 'has' : ''}">Points disponibles · <b>${pts}</b></div><div class="dim" style="font-style:italic">Un point par niveau. Cliquez sur un talent pour l’apprendre.</div></div>
      <div class="tal-layout"><div class="col"><h3>${C.name}</h3>${this.treeHTML(C)}</div><div class="col">${spec}
      <h3>Compétences</h3><div class="sb-row">${bar}</div>
      <div class="respec">${inVillage ? `<button class="btn danger small" data-action="respec">Oublier tous les talents · ${fmt(g.respecCost())} or</button>` : '<span class="hint">Les talents ne peuvent être oubliés qu’au village.</span>'}</div></div></div>`;
    return { sub: `${C.name}${pd.spec ? ' · ' + C.specs[pd.spec].name : ''}`, html, cls: 'wide' };
  }

  // ================= PORTAIL =================
  panel_portal() {
    const pd = this.pd;
    let rows = '';
    for (let d = 1; d <= pd.maxDepth; d++) {
      const L = enemyLevel(d);
      const kills = pd.bossKills[d] || 0;
      const diff = L - pd.level;
      const warn = diff >= 3 ? '<span class="bad">mortel</span>' : diff >= 1 ? '<span class="warn">périlleux</span>' : '<span class="ok">à votre mesure</span>';
      rows += `<div class="depth-row"><div><div class="depth-name">Profondeur ${ROMAN[d - 1] || d}</div><div class="dim">Créatures niv. ${L} · Gardien niv. ${L + 1} · ${warn}${kills ? ` · Gardien vaincu ×${kills}` : ''}</div></div><button class="btn main" data-action="descend" data-arg="${d}">Descendre</button></div>`;
    }
    const ps = Inv.pocketSize(pd);
    const pots = Inv.countConsumable(pd, 'potion'), stones = Inv.countConsumable(pd, 'pierre');
    const html = `<p class="npc-line" style="font-size:17px;margin-bottom:10px">« Chaque descente ouvre un chemin différent. Ce que tu y trouves, tu ne le gardes que si tu remontes. »</p>
      <div class="rules"><div>Équipement porté — <b>toujours conservé</b></div><div>Poche sécurisée (${ps} empl.) — <b>conservée</b></div><div>Butin du sac et or ramassé — <span class="bad">perdus à la mort</span></div>
      <div class="dim" style="font-style:italic">Pour remonter : cercle d’extraction, portail du Gardien, ou pierre de retour (${input.label('stone')}).</div></div>
      <div class="dim">Vous emportez ${pots} fiole(s) de sang et ${stones} pierre(s) de retour.</div>
      <div class="depths">${rows}</div>`;
    return { title: 'Portail des Abysses', sub: 'La Crypte Oubliée', html };
  }

  // ================= MENUS =================
  panel_pause() {
    const html = `<div class="menu"><button class="mi main" data-action="resume">Reprendre</button><button class="mi" data-action="options">Touches et options</button><button class="mi" data-action="quit">Sauvegarder et quitter</button>
      ${this.pd && this.pd.inRun ? '<p class="hint" style="text-align:center">Quitter pendant une descente compte comme une mort : le butin non sécurisé sera perdu.</p>' : ''}</div>`;
    return { title: 'Pause', html, cls: 'narrow', footer: '<span><kbd>Échap</kbd>Reprendre</span>' };
  }

  optionsHTML() {
    const rows = ACTIONS.map((a) => `<div class="kb-row"><span>${a.label}</span><button class="btn key ${this.rebindingId === a.id ? 'waiting' : ''}" data-action="rebind" data-arg="${a.id}">${this.rebindingId === a.id ? 'Appuyez…' : codeLabel(input.bindings[a.id])}</button></div>`).join('');
    return `<div class="opt-layout"><div class="col"><h3>Touches</h3><p class="hint" style="margin-top:-4px">Cliquez puis appuyez sur une touche ou un bouton de souris. Échap annule. Une touche déjà prise est échangée.</p>
      <div class="kb">${rows}<div class="kb-row"><span>Menu / fermer</span><button class="btn key" disabled>Échap</button></div></div>
      <button class="btn small" data-action="reset-keys">Rétablir les touches par défaut</button></div>
      <div class="col"><h3>Réglages</h3>
      <label class="opt-row">Volume général <input type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}" data-setting="volume"></label>
      <label class="opt-row">Musique et ambiance <input type="range" min="0" max="100" value="${Math.round((settings.musicVolume ?? 0.55) * 100)}" data-setting="musicVolume"></label>
      <label class="opt-row">Effets sonores <input type="range" min="0" max="100" value="${Math.round((settings.sfxVolume ?? 0.85) * 100)}" data-setting="sfxVolume"></label>
      <label class="opt-row"><input type="checkbox" data-setting="pauseInMenus" ${settings.pauseInMenus ? 'checked' : ''}> Pause quand un menu est ouvert</label>
      <label class="opt-row"><input type="checkbox" data-setting="screenShake" ${settings.screenShake ? 'checked' : ''}> Tremblements de l’écran</label>
      <label class="opt-row"><input type="checkbox" data-setting="showDamage" ${settings.showDamage ? 'checked' : ''}> Afficher les dégâts</label>
      </div></div>`;
  }

  panel_options() { return { title: 'Touches et options', html: this.optionsHTML(), cls: 'wide' }; }

  // ================= ÉCRANS =================
  showScreen(html, { titleBg = false } = {}) {
    this.screenRefresh = null;
    this.screenOpen = true;
    this.el.screen.classList.remove('overlay');
    this.el.screen.innerHTML = (titleBg ? '<canvas id="title-bg"></canvas>' : '') + html;
    this.el.screen.classList.add('show');
    this.el.hud.classList.add('hidden');
    this.close();
    if (titleBg) startTitleBg($('#title-bg'));
    else stopTitleBg();
  }

  hideScreen() {
    stopTitleBg();
    this.screenOpen = false;
    this.el.screen.innerHTML = '';
    this.el.screen.classList.remove('show');
  }

  showTitle() {
    this.confirmNew = false;
    playMusic('title');
    playAmbience(null);
    this.dying(false);
    const save = loadGame();
    const cont = save ? `<button class="mi main" data-action="continue">Continuer<span class="sub">${escapeHtml(save.name)} · ${CLASSES[save.cls] ? CLASSES[save.cls].name : ''} · niveau ${save.level}</span></button>` : '';
    this.showScreen(`<div class="screen title-screen"><div class="logo">Les Abysses</div><div class="logo-rule"></div><div class="tagline">Descendez. Survivez. Remontez.</div>
      <div class="menu">${cont}<button class="mi ${save ? '' : 'main'}" data-action="new-game">Nouvelle partie</button><button class="mi" data-action="title-options">Options</button><button class="mi" data-action="credits">Crédits</button></div>
      <div class="version">PROTOTYPE · v0.4</div></div>`, { titleBg: true });
  }

  async showCredits() {
    let data = null;
    try { data = await (await fetch('assets/credits.json')).json(); } catch (e) { data = null; }
    const sections = (data || []).map((sec) => `<h3 class="cr-h">${escapeHtml(sec.title)}</h3>${sec.note ? `<p class="cr-note">${escapeHtml(sec.note)}</p>` : ''}
      <ul class="cr-list">${sec.items.map((it) => `<li><b>${escapeHtml(it.what)}</b> — ${escapeHtml(it.authors)}<span class="cr-lic">${escapeHtml(it.license || '')}</span>${it.url ? `<span class="cr-url">${escapeHtml(it.url)}</span>` : ''}</li>`).join('')}</ul>`).join('');
    this.showScreen(`<div class="screen"><div class="panel frame wide credits" style="margin:auto"><header class="ph"><div class="ph-title">Crédits</div></header><div class="rule"></div>
      <div class="panel-body"><p class="cr-note">Les Abysses — conception et code : le joueur et Claude. Graphismes, sons et musiques : artistes de la communauté libre, listés ci-dessous. Merci à eux.</p>${sections || '<p class="cr-note">Liste indisponible.</p>'}</div>
      <footer class="pf"><button class="btn" data-action="back-title">Retour</button></footer></div></div>`, { titleBg: true });
  }

  showOptionsScreen() {
    this.showScreen(`<div class="screen"><div class="panel frame wide" style="margin:auto"><header class="ph"><div class="ph-title">Touches et options</div></header><div class="rule"></div><div class="panel-body">${this.optionsHTML()}</div><footer class="pf"><button class="btn" data-action="back-title">Retour</button></footer></div></div>`, { titleBg: true });
    this.screenRefresh = () => this.showOptionsScreen();
  }

  showClassSelect() {
    this.screenCls = 'guerrier';
    this.confirmNew = false;
    this.renderClassSelect();
  }

  renderClassSelect() {
    const nameVal = $('#char-name') ? $('#char-name').value : '';
    const cards = Object.entries(CLASSES).map(([id, C]) => `<div class="class-card ${C.locked ? 'locked' : ''} ${this.screenCls === id ? 'sel' : ''}" data-action="pick-class" data-arg="${id}">
      <canvas data-portrait="${id}" width="360" height="360"></canvas>
      <div class="cc-name">${C.name}</div><div class="cc-title">${C.title}</div><div class="cc-desc">${C.desc}</div>
      ${C.locked ? '<div class="soon">— Bientôt —</div>' : `<div class="cc-specs">Voies : ${Object.values(C.specs).map((s) => `<b>${s.name}</b>`).join(' ou ')}</div>`}</div>`).join('');
    this.showScreen(`<div class="screen class-screen"><h1>Qui descend ?</h1><div class="ph-sub">Choisissez votre classe</div><div class="class-cards">${cards}</div>
      <div class="name-row">Nom <input id="char-name" maxlength="18" placeholder="Sans-nom" value="${escapeHtml(nameVal)}" autocomplete="off" spellcheck="false"></div>
      ${this.confirmNew ? '<p class="warn">Une sauvegarde existe déjà : elle sera effacée. Validez à nouveau pour confirmer.</p>' : ''}
      <div class="menu row"><button class="mi" data-action="back-title">Retour</button><button class="mi main" data-action="start-game">${this.confirmNew ? 'Confirmer' : 'Descendre'}</button></div></div>`, { titleBg: true });
    this.drawPortraits();
  }

  drawPortraits() {
    const canvases = document.querySelectorAll('canvas[data-portrait]');
    const t0 = performance.now();
    const draw = () => {
      if (!this.screenOpen || !canvases.length || !canvases[0].isConnected) return;
      const t = (performance.now() - t0) / 1000;
      for (const c of canvases) {
        const id = c.dataset.portrait;
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        // socle
        const grd = g.createRadialGradient(180, 200, 10, 180, 200, 150);
        grd.addColorStop(0, id === this.screenCls ? 'rgba(201,138,74,0.18)' : 'rgba(214,206,189,0.06)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 360, 360);
        g.strokeStyle = 'rgba(214,206,189,0.12)';
        g.beginPath(); g.ellipse(180, 205, 110, 40, 0, 0, Math.PI * 2); g.stroke();
        if (CLASSES[id].locked) {
          g.fillStyle = 'rgba(214,206,189,0.15)';
          g.font = "120px 'IM Fell English SC', Georgia";
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('?', 180, 180);
          continue;
        }
        if (hasSprite(id)) {
          g.imageSmoothingEnabled = false;
          const sel = id === this.screenCls;
          drawSprite(g, id, 180, 275, sel ? { anim: 'walk', frame: walkFrame(id, 'walk', t * 9), dir: 2, scale: 4 } : { anim: 'walk', frame: 0, dir: 2, scale: 4, squashY: 1 + 0.01 * Math.sin(t * 2) });
          continue;
        }
        const kit = this._kits || (this._kits = { guerrier: starterKit('guerrier'), rodeur: starterKit('rodeur') });
        drawHero(g, 180, 185, { cls: id, angle: Math.PI / 2 + Math.sin(t * 0.6) * 0.25, time: t, eq: kit[id], scale: 4.2, bowDraw: id === 'rodeur' ? (Math.sin(t * 1.4) + 1) / 2 : 0 });
      }
      requestAnimationFrame(draw);
    };
    draw();
  }

  showSummary(d, cb) {
    this.close();
    this.el.hud.classList.add('hidden');
    this.summaryOpen = true;
    this.summaryCb = cb;
    const list = (arr) => arr.map((x) => `<li style="color:${x.color}">${escapeHtml(x.name)}${x.qty > 1 ? ' ×' + x.qty : ''}</li>`).join('');
    let body = `<div class="sum-stats"><div><b>${d.kills}</b><span>créatures abattues</span></div><div><b>${d.xp}</b><span>expérience (conservée)</span></div>`;
    body += d.success ? `<div><b>${fmt(d.gold)}</b><span>or rapporté</span></div>` : `<div><b class="bad">${fmt(d.lostGold || 0)}</b><span>or perdu</span></div>`;
    body += '</div>';
    if (d.success) body += `<h3>Butin rapporté</h3>${d.kept.length ? `<ul class="loot">${list(d.kept)}</ul>` : '<p class="dim">Rien.</p>'}`;
    else {
      body += `<h3>Sauvé par la poche</h3>${d.kept.length ? `<ul class="loot">${list(d.kept)}</ul>` : '<p class="dim">Rien.</p>'}`;
      body += `<h3>Abandonné aux Abysses</h3>${d.lost.length ? `<ul class="loot lost">${list(d.lost)}</ul>` : '<p class="dim">Rien.</p>'}`;
      body += '<p class="hint" style="text-align:center">Votre équipement porté vous a suivi.</p>';
    }
    this.el.screen.classList.add('overlay');
    this.el.screen.innerHTML = `<div class="screen summary ${d.success ? 'win' : 'lose'}"><div class="sum-band"><h1>${d.title}</h1><div class="sum-sub">${d.subtitle}</div></div>
      <div class="sum-details">${body}<div class="menu"><button class="mi main" data-action="summary-ok">Retourner au village</button></div></div></div>`;
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

  areaTitle(name, sub) {
    const a = this.el.area;
    a.innerHTML = `<div class="a-name">${name}</div><div class="a-rule"></div><div class="a-sub">${sub || ''}</div>`;
    a.classList.remove('show');
    void a.offsetWidth;
    a.classList.add('show');
  }

  banner(text, kind = 'gold') {
    const b = this.el.banner;
    b.className = kind === 'blood' ? 'blood' : '';
    b.innerHTML = `<span>${text}</span>`;
    void b.offsetWidth;
    b.classList.add('show');
  }

  // ================= RÉCITS (prologue / épilogue) =================
  showStory(slides, done, title = null) {
    this.screenOpen = true;
    this.screenRefresh = null;
    stopTitleBg();
    this.close();
    this.el.hud.classList.add('hidden');
    this.storyState = { slides, i: 0, done, title };
    this.el.screen.classList.remove('overlay');
    this.el.screen.classList.add('show');
    this.el.screen.innerHTML = '<canvas id="title-bg"></canvas><div class="story-host"></div>';
    startTitleBg($('#title-bg'));
    this.renderStory();
  }

  renderStory() {
    const st = this.storyState;
    const txt = escapeHtml(st.slides[st.i]).replace(/\n/g, '<br>');
    $('.story-host', this.el.screen).innerHTML = `<div class="screen story">${st.title && st.i === 0 ? `<div class="story-title">${st.title}</div>` : ''}<div class="story-text" key="${st.i}">${txt}</div>
      <div class="story-foot"><span class="dim">${st.i + 1} / ${st.slides.length}</span><button class="btn" data-action="story-next">Continuer</button></div>
      <div class="story-skip"><kbd>Espace</kbd> Continuer <kbd>Échap</kbd> Passer</div></div>`;
    sfx('page');
  }

  storyNext() {
    const st = this.storyState;
    if (!st) return;
    st.i++;
    if (st.i >= st.slides.length) this.storyEnd();
    else this.renderStory();
  }

  storyEnd() {
    const st = this.storyState;
    if (!st) return;
    this.storyState = null;
    this.hideScreen();
    if (st.done) st.done();
    else if (this.game && this.game.scene) { this.el.hud.classList.remove('hidden'); this.game.ui.onSceneChange(); }
  }

  // ================= MISE EN SCÈNE =================
  subtitle(text, who) {
    const el = this.el.subtitle;
    el.innerHTML = `${who ? `<span class="who">${who}</span>` : ''}<span class="line">« ${escapeHtml(text)} »</span>`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  inscription(text) {
    const el = this.el.message;
    el.innerHTML = `<div class="msg-label">Une inscription est gravée dans la pierre</div><div class="msg-text">${escapeHtml(text)}</div>`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  flash() {
    const el = this.el.flash;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  hurtFlash(k = 0.1) {
    const el = this.el.hurt;
    el.style.setProperty('--hk', Math.min(1, 0.35 + k * 3).toFixed(2));
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  dying(on) { this.el.canvas.classList.toggle('dying', !!on); }

  // ================= TOASTS =================
  toast(msg, type = 'info', dur = 2.5) {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    this.el.toasts.appendChild(el);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 500); }, dur * 1000);
  }

  // ================= HUD =================
  buildHud() {
    const h = this.el.hud;
    h.innerHTML = `
      <div id="vitals">
        <div class="lvl"><div class="ring"></div><div class="gem"></div><div class="num"></div></div>
        <div class="bars">
          <div class="vbar hp"><div class="trail"></div><div class="fill"></div><span class="val"></span></div>
          <div class="vbar sta"><div class="trail"></div><div class="fill"></div></div>
          <div id="buffs"></div>
        </div>
      </div>
      <div id="hud-map"><div class="mm-frame frame"><canvas id="minimap" width="200" height="200"></canvas></div><div class="map-hint"></div></div>
      <div id="tracker"></div>
      <div id="boss-bar" class="hidden"><div class="bb-name"></div><div class="bb-bar"><div class="bb-trail"></div><div class="bb-fill"></div></div></div>
      <div id="channel" class="hidden"><div class="ch-label"></div><div class="ch-bar"><div class="ch-fill"></div></div></div>
      <div id="prompt" class="hidden"></div>
      <div id="skills"><div class="cross"></div><div class="items"></div></div>
      <div id="purse"><div class="purse-box">${icon('gold')}<span class="n"></span></div><div class="purse-run"></div></div>
      <div id="keys-hint"></div>`;
    this.hud = {
      lvlNum: $('.lvl .num', h), lvlRing: $('.lvl .ring', h),
      hpBar: $('.vbar.hp', h), hpFill: $('.vbar.hp .fill', h), hpTrail: $('.vbar.hp .trail', h), hpText: $('.vbar.hp .val', h),
      staBar: $('.vbar.sta', h), staFill: $('.vbar.sta .fill', h), staTrail: $('.vbar.sta .trail', h),
      buffs: $('#buffs'), tracker: $('#tracker'),
      boss: $('#boss-bar'), bossName: $('.bb-name', h), bossFill: $('.bb-fill', h), bossTrail: $('.bb-trail', h),
      channel: $('#channel'), chLabel: $('.ch-label', h), chFill: $('.ch-fill', h), prompt: $('#prompt'),
      cross: $('#skills .cross', h), items: $('#skills .items', h), gold: $('#purse .n', h), run: $('#purse .purse-run', h),
      mapHint: $('.map-hint', h), keys: $('#keys-hint'), mapBox: $('#hud-map'), minimap: $('#minimap'),
    };
    this.refreshHudStatic();
  }

  refreshHudStatic() {
    if (!this.hud || !this.pd) return;
    const pd = this.pd;
    const g = this.game;
    const C = CLASSES[pd.cls];
    const sk = (id, key, ico, cls, count) => `<div class="sk ${cls} ${ico ? '' : 'empty'} sk-${id || 'none'}" data-skill="${id || ''}">${ico ? icon(ico) : ''}<div class="cd"></div><span class="key">${input.label(key)}</span>${count !== undefined ? `<span class="count">${count}</span>` : ''}</div>`;
    const b = pd.skillBar;
    const ic = (i) => (b[i] ? SKILLS[b[i]].icon : null);
    this.hud.cross.innerHTML =
      sk(b[0], 'skill1', ic(0), 's-up') + sk(b[1], 'skill2', ic(1), 's-left') + sk(b[2], 'skill3', ic(2), 's-right') + sk(b[3], 'skill4', ic(3), 's-down') +
      sk('special', 'special', C.special.icon || 'special', 's-mid');
    this.hud.items.innerHTML = sk('potion', 'potion', 'potion', '', Inv.countConsumable(pd, 'potion')) + sk('pierre', 'stone', 'pierre', '', Inv.countConsumable(pd, 'pierre'));
    // icônes pixel art pour les consommables
    for (const id of ['potion', 'pierre']) {
      const el = this.hud.items.querySelector('.sk-' + id);
      const pix = itemIcon({ kind: 'consumable', id });
      if (el && pix.startsWith('<i')) el.querySelector('svg').outerHTML = pix;
    }
    this.hud.skEls = [...this.hud.cross.querySelectorAll('.sk'), ...this.hud.items.querySelectorAll('.sk')];
    this.hud.mapHint.textContent = `${input.label('map')} · carte`;
    const pts = g.talentPoints();
    this.hud.keys.innerHTML = `<kbd>${input.label('inventory')}</kbd>Équipement <kbd>${input.label('talents')}</kbd>Talents${pts > 0 ? ` <span class="glow">(${pts})</span>` : ''} <kbd>${input.label('journal')}</kbd>Journal <kbd>Échap</kbd>Menu`;
    // Longueur des barres proportionnelle aux maximums (façon Souls)
    const p = g.player;
    this.hud.hpBar.style.width = Math.max(180, Math.min(480, 90 + p.maxHp * 1.2)) + 'px';
    this.hud.staBar.style.width = Math.max(140, Math.min(380, p.maxStamina * 2)) + 'px';
    this.refreshTracker();
  }

  refreshTracker() {
    if (!this.hud || !this.pd) return;
    const pd = this.pd;
    const qs = QUESTS.filter((q) => pd.quests[q.id] && pd.quests[q.id].status !== 'done').slice(0, 4);
    this.hud.tracker.innerHTML = qs.length ? '<div class="tr-title">Quêtes</div>' + qs.map((q) => {
      const st = pd.quests[q.id];
      return `<div class="tr-q ${st.status}"><b>${q.name}</b><div>${st.status === 'ready' ? `Retournez voir ${NPCS[q.giver].name}` : this.questObjText(q, st)}</div></div>`;
    }).join('') : '';
  }

  updateHud(dt) {
    const g = this.game;
    if (!this.hud || !g || !g.scene || !this.pd) return;
    const p = g.player;
    const pd = this.pd;
    const h = this.hud;
    // n'écrire dans la page que ce qui a changé (évite les recalculs de mise en page à chaque image)
    const W = (el, v) => { if (el._w !== v) { el._w = v; el.style.width = v; } };
    const T = (el, v) => { if (el._t !== v) { el._t = v; el.textContent = v; } };
    const hpPct = (100 * Math.max(0, p.hp) / p.maxHp).toFixed(1) + '%';
    W(h.hpFill, hpPct);
    W(h.hpTrail, hpPct);
    T(h.hpText, `${Math.ceil(Math.max(0, p.hp))} / ${p.maxHp}`);
    const staPct = (100 * p.stamina / p.maxStamina).toFixed(1) + '%';
    W(h.staFill, staPct);
    W(h.staTrail, staPct);
    const need = xpForLevel(pd.level);
    T(h.lvlNum, String(pd.level));
    { const xv = (100 * pd.xp / need).toFixed(1) + '%'; if (h.lvlRing._x !== xv) { h.lvlRing._x = xv; h.lvlRing.style.setProperty('--xp', xv); } }
    const goldTxt = fmt(pd.gold);
    if (h.gold.textContent !== goldTxt) h.gold.textContent = goldTxt;
    const runTxt = pd.inRun && pd.runGold ? `+ ${fmt(pd.runGold)} ramassé (non sécurisé)` : '';
    if (h.run.textContent !== runTxt) h.run.textContent = runTxt;

    if (h.skEls) {
      for (const el of h.skEls) {
        const id = el.dataset.skill;
        let k = 0;
        if (id === 'special') k = Math.max(0, p.specialCd) / (CLASSES[pd.cls].special.cd * p.cdMult());
        else if (id === 'potion') k = Math.max(0, p.potionCd) / 2.5;
        else if (SKILLS[id]) k = Math.max(0, p.skillCd[id] || 0) / (SKILLS[id].cd * p.cdMult());
        const cd = el._cd || (el._cd = el.querySelector('.cd'));
        const hv = (Math.min(1, k) * 100).toFixed(1) + '%';
        if (cd._h !== hv) { cd._h = hv; cd.style.height = hv; }
      }
    }

    const iconFor = { cri: 'shout', dechainement: 'rage', murdefer: 'wall', oeil: 'eye', voile: 'veil' };
    const bHtml = p.buffs.map((b) => `<div class="buff b-${b.id}">${icon(iconFor[b.id] || 'special')}<span>${Math.ceil(b.t)}</span></div>`).join('');
    if (h.buffs._last !== bHtml) { h.buffs.innerHTML = bHtml; h.buffs._last = bHtml; }

    const boss = g.scene.boss;
    if (boss && g.scene.bossEngaged && !boss.dead) {
      h.boss.classList.remove('hidden');
      const nm = (boss.guardian ? boss.guardian.name : boss.def.name) + (boss.phase === 2 ? ' — fureur' : '');
      if (h.bossName.textContent !== nm) h.bossName.textContent = nm;
      const w = (100 * Math.max(0, boss.hp) / boss.maxHp).toFixed(1) + '%';
      W(h.bossFill, w);
      W(h.bossTrail, w);
    } else h.boss.classList.add('hidden');

    if (p.channel) {
      h.channel.classList.remove('hidden');
      T(h.chLabel, `${p.channel.label}`);
      W(h.chFill, (100 * p.channel.t / p.channel.dur).toFixed(1) + '%');
    } else h.channel.classList.add('hidden');

    const o = g.hover;
    if (o && !p.dead && !this.panel) {
      const verb = o.type === 'npc' ? 'Parler à' : o.type === 'chest' || o.type === 'stash' ? 'Ouvrir' : o.type === 'extract' ? 'Remonter par le' : o.type === 'inscription' ? 'Lire' : 'Franchir le';
      const lbl = o.type === 'extract' ? 'cercle d’extraction' : o.type === 'portal' || o.type === 'exitPortal' ? 'portail' : o.type === 'npc' ? o.label : o.type === 'inscription' ? 'l’inscription' : o.label.toLowerCase();
      const txt = `<kbd>${input.label('interact')}</kbd> ${verb} ${lbl}`;
      if (h.prompt._last !== txt) { h.prompt.innerHTML = txt; h.prompt._last = txt; }
      h.prompt.classList.remove('hidden');
    } else h.prompt.classList.add('hidden');

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 1 / 15;
      const big = this.mapBig;
      h.mapBox.classList.toggle('big', big);
      const cv = h.minimap;
      const size = big ? Math.min(560, window.innerHeight - 160) : 190;
      if (cv.width !== size) { cv.width = size; cv.height = size; }
      g.renderer.drawMinimap(g, cv, big);
    }
  }
}
