import Phaser from 'phaser';
import { DROP_CHANCE, DROP_TABLES, MAX_STAT, ROLE_ORDER, itemById, roleById, specialById } from '../core/data';
import { describeLook } from '../core/describe';
import { sfx } from '../core/sfx';
import { input } from '../input/input';
import { resolveLook } from '../gfx/characters';
import { COLORS, hex, panel, text } from '../ui/common';

const Y0 = 112;
const PANEL_H = 642;
const TAB = { x: 40, w: 230, h: 150, gap: 14 };
const MID = { x: 286, w: 444 };
const RIGHT = { x: 746, w: 494 };
const THUMB = 72;
const THUMB_GAP = 10;
/** quadros da caminhada no retrato: parado, pé esquerdo, parado, pé direito */
const WALK = [0, 1, 0, 2];

const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',')}%`;

/** Ficha de todos os personagens: papel, atributos, especial, itens e as variantes com a aparência de cada uma. */
export class CharactersScene extends Phaser.Scene {
  private role = 0;
  private variant = 0;
  private view?: Phaser.GameObjects.Container;
  private portrait!: Phaser.GameObjects.Image;
  private walk = 0;

  constructor() {
    super('Characters');
  }

  init(data?: { role?: number }) {
    this.role = data?.role ?? 0;
    this.variant = 0;
  }

  create() {
    text(this, 40, 28, 'PERSONAGENS', { size: 30 });
    text(this, 42, 72, 'Atributos, especial, itens e variantes de cada papel.', { font: 'body', size: 20, color: COLORS.dim });
    text(this, 640, 772, 'cima/baixo: papel · esq./dir.: variante · ESC volta', { size: 9, color: COLORS.dim, align: 'center' });
    this.draw();
  }

  private get roleId() {
    return ROLE_ORDER[this.role];
  }

  private draw() {
    this.view?.destroy();
    const c = this.add.container(0, 0);
    this.view = c;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (c.add(o), o);
    const g = add(this.add.graphics());
    const r = roleById(this.roleId);
    const v = r.variants[this.variant];

    // ── abas dos papéis
    ROLE_ORDER.forEach((id, i) => {
      const rr = roleById(id);
      const on = i === this.role;
      const y = Y0 + i * (TAB.h + TAB.gap);
      panel(g, TAB.x, y, TAB.w, TAB.h, on ? '#232737' : COLORS.panel, on ? rr.color : '#2a2f42', on ? 4 : 3);
      add(this.add.image(TAB.x + 54, y + TAB.h / 2, `face_${id}_0`).setScale(4).setAlpha(on ? 1 : 0.6));
      add(text(this, TAB.x + 104, y + 46, rr.id, { size: 18, color: on ? rr.color : COLORS.dim }));
      add(text(this, TAB.x + 104, y + 76, rr.fullName, { font: 'body', size: 15, color: on ? COLORS.text : COLORS.dim, wrap: TAB.w - 114 }));
    });

    // ── variantes
    panel(g, MID.x, Y0, MID.w, PANEL_H, COLORS.panel, '#3a4058');
    g.fillStyle(hex('#232737'), 1);
    g.fillRect(MID.x + 20, Y0 + 20, MID.w - 40, 226);
    this.walk = 0;
    this.portrait = add(this.add.image(MID.x + MID.w / 2, Y0 + 134, `char_${r.id}_${this.variant}_0`).setScale(10));
    add(text(this, MID.x + 20, Y0 + 262, v.name, { size: 16, color: r.color }));
    add(text(this, MID.x + MID.w - 20, Y0 + 264, `${this.variant + 1} / ${r.variants.length}`, { size: 10, color: COLORS.dim, align: 'right' }));

    const n = r.variants.length;
    const rowW = n * THUMB + (n - 1) * THUMB_GAP;
    const tx0 = MID.x + (MID.w - rowW) / 2;
    r.variants.forEach((_, k) => {
      const x = tx0 + k * (THUMB + THUMB_GAP);
      const y = Y0 + 298;
      g.fillStyle(hex('#232737'), 1);
      g.fillRect(x, y, THUMB, THUMB);
      if (k === this.variant) {
        g.lineStyle(3, hex(r.color), 1);
        g.strokeRect(x + 1.5, y + 1.5, THUMB - 3, THUMB - 3);
      }
      add(this.add.image(x + THUMB / 2, y + THUMB / 2, `face_${r.id}_${k}`).setScale((THUMB - 8) / 18).setAlpha(k === this.variant ? 1 : 0.55));
    });

    const look = resolveLook(r, v);
    let ly = Y0 + 386;
    for (const line of describeLook(look)) {
      add(text(this, MID.x + 20, ly, line.label, { font: 'body', size: 16, color: COLORS.dim }));
      ly += add(text(this, MID.x + 130, ly, line.value, { font: 'body', size: 16, wrap: MID.w - 150 })).height + 4;
    }
    // paleta da variante
    const sw: [string, string][] = [
      ['pele', look.skin],
      ['cabelo', look.hair],
      ['roupa', look.shirt],
      ['detalhe', look.accent ?? look.logo ?? look.shirt],
      ['calça', look.pants],
      ['sapato', look.shoes],
    ];
    const swY = Y0 + 552;
    add(text(this, MID.x + 20, swY + 10, 'Cores', { font: 'body', size: 16, color: COLORS.dim }));
    sw.forEach(([label, color], k) => {
      const x = MID.x + 130 + k * 48;
      g.fillStyle(hex(color), 1);
      g.fillRect(x, swY + 6, 36, 36);
      g.lineStyle(2, hex('#3a4058'), 1);
      g.strokeRect(x, swY + 6, 36, 36);
      add(text(this, x + 18, swY + 48, label, { font: 'body', size: 11, color: COLORS.dim, align: 'center' }));
    });

    // ── dados do papel
    const X = RIGHT.x + 24;
    const RW = RIGHT.w - 48;
    panel(g, RIGHT.x, Y0, RIGHT.w, PANEL_H, COLORS.panel, r.color);
    const title = add(text(this, X, Y0 + 22, r.name, { size: 24, color: r.color }));
    if (r.fullName.toUpperCase() !== r.name) add(text(this, X + title.width + 16, Y0 + 22, r.fullName, { font: 'body', size: 18, color: COLORS.dim }));

    const stats: [string, number][] = [['Velocidade', r.speed], ['Alcance', r.range], ['Bombas', r.bombs]];
    stats.forEach(([label, val], k) => {
      const y = Y0 + 66 + k * 28;
      add(text(this, X, y, label, { font: 'body', size: 16, color: COLORS.dim }));
      for (let b = 0; b < MAX_STAT; b++) {
        g.fillStyle(hex(b < val ? r.color : '#2a2f42'), 1);
        g.fillRect(X + 120 + b * 30, y + 4, 26, 12);
      }
      add(text(this, X + RW, y, `${val}`, { font: 'body', size: 16, bold: true, align: 'right' }));
    });
    add(text(this, X + 120, Y0 + 150, `valor inicial · máximo ${MAX_STAT} com itens`, { font: 'body', size: 12, color: COLORS.dim }));

    let y = Y0 + 176;
    add(this.add.image(X + 14, y + 12, `bomb_${r.id}_0`).setScale(1.6));
    add(text(this, X + 36, y + 1, r.bombType, { font: 'body', size: 17, bold: true }));
    y += 36;
    const sp = specialById(r.especialId);
    const spInfo = [`recarga ${sp.recarga} s`, `alcance ${sp.alcance} ${sp.alcance === 1 ? 'bloco' : 'blocos'}`];
    if (sp.duracao) spInfo.push(`duração ${sp.duracao} s`);
    add(text(this, X, y, 'Especial', { font: 'body', size: 16, color: COLORS.dim }));
    add(text(this, X + 90, y, sp.name, { font: 'body', size: 16, bold: true, color: '#7dd3fc' }));
    const ef = add(text(this, X + 90, y + 24, `${sp.efeito}\n${spInfo.join(' · ')}`, { font: 'body', size: 15, wrap: RW - 90 }));
    y += 24 + ef.height + 10;
    add(text(this, X, y, 'Encontra', { font: 'body', size: 16, color: COLORS.dim }));
    add(text(this, X + 90, y, r.finds, { font: 'body', size: 16, wrap: RW - 90 }));
    y += 34;

    // itens da tabela de drop (papel primeiro, neutros depois)
    g.lineStyle(2, hex('#2a2f42'), 1);
    g.lineBetween(X, y, X + RW, y);
    add(text(this, X, y + 10, `ITENS · ${Math.round(DROP_CHANCE * 100)}% DE CHANCE POR CAIXA`, { size: 9, color: COLORS.dim }));
    y += 32;
    const table = DROP_TABLES[r.tabelaDropId];
    const total = table.reduce((s, [, w]) => s + w, 0);
    const colW = RW / 2;
    const rows = Math.ceil(table.length / 2);
    const rowH = Math.min(58, Math.floor((Y0 + PANEL_H - 14 - y) / rows));
    table.forEach(([id, w], k) => {
      const it = itemById(id);
      const col = Math.floor(k / rows);
      const x = X + col * colW;
      const yy = y + (k % rows) * rowH;
      add(this.add.image(x + 12, yy + 12, `itemS_${id}`));
      add(text(this, x + 32, yy, `${it.name} · ${pct((w / total) * 100)}`, { font: 'body', size: 13, bold: true, color: it.role === 'NEUTRAL' ? '#cbd5e1' : COLORS.text }));
      add(text(this, x + 32, yy + 17, it.desc, { font: 'body', size: 12, color: COLORS.dim, wrap: colW - 40 }));
    });
  }

  update(time: number) {
    input.beginFrame();
    if (input.back()) {
      sfx('move');
      this.scene.start('Title');
      return;
    }
    const n = roleById(this.roleId).variants.length;
    const dRole = (input.menuDown() ? 1 : 0) - (input.menuUp() ? 1 : 0);
    const dVar = (input.menuRight() ? 1 : 0) - (input.menuLeft() ? 1 : 0);
    if (dRole) {
      this.role = (this.role + dRole + ROLE_ORDER.length) % ROLE_ORDER.length;
      this.variant = 0;
    } else if (dVar) {
      this.variant = (this.variant + dVar + n) % n;
    }
    if (dRole || dVar) {
      sfx('move');
      this.draw();
    }
    const f = Math.floor(time / 180) % WALK.length;
    if (f !== this.walk) {
      this.walk = f;
      this.portrait.setTexture(`char_${this.roleId}_${this.variant}_${WALK[f]}`);
    }
  }
}
