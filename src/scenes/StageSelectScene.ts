import Phaser from 'phaser';
import { NIGHTS, STAGES, bossById } from '../core/data';
import type { EnemyType, Theme } from '../core/types';
import { save } from '../core/save';
import { sfx } from '../core/sfx';
import { input } from '../input/input';
import { COLORS, hex, panel, text } from '../ui/common';

const CARD_W = 232;
const GAP = 12;
const X0 = (1280 - (CARD_W * 5 + GAP * 4)) / 2;

type Purpose = 'story' | 'battle' | 'zombie';

/** O que um card mostra: uma fase (História/Batalha) ou uma noite (Modo Zumbi). */
interface Card {
  label: string;
  name: string;
  color: string;
  theme: Theme;
  mapa: string[];
  desc: string;
  inimigos: EnemyType[];
  mecanica: string;
  boss: string;
  bossSub?: string;
}

function cardsFor(purpose: Purpose): Card[] {
  if (purpose === 'zombie')
    return NIGHTS.map((n) => ({
      label: n.id === 5 ? `NOITE ${n.id} · FINAL` : `NOITE ${n.id}`,
      name: n.name,
      color: n.color,
      theme: n.theme,
      mapa: n.mapa,
      desc: n.desc,
      inimigos: n.inimigos,
      mecanica: n.mecanica,
      boss: bossById(n.chefao).name,
      bossSub: `ajudantes na fase: até ${n.ajudantes}`,
    }));
  return STAGES.map((s) => ({
    label: `FASE ${s.id}`,
    name: s.name,
    color: s.color,
    theme: s.theme,
    mapa: s.arenas[0].mapa,
    desc: s.desc,
    inimigos: s.inimigos,
    mecanica: s.mecanica,
    boss: bossById(s.chefao).name,
  }));
}

export class StageSelectScene extends Phaser.Scene {
  private purpose: Purpose = 'story';
  private sel = 0;
  private cursor!: Phaser.GameObjects.Graphics;

  constructor() {
    super('StageSelect');
  }

  init(data: { purpose?: Purpose }) {
    this.purpose = data.purpose ?? 'story';
    this.sel = 0;
  }

  private locked(i: number) {
    if (this.purpose === 'zombie') return i + 1 > save.data.zombieUnlocked;
    return this.purpose === 'story' && i + 1 > save.data.unlocked;
  }

  create() {
    const zombie = this.purpose === 'zombie';
    const cards = cardsFor(this.purpose);
    text(this, 40, 36, zombie ? 'MODO ZUMBI · AS 5 NOITES' : 'AS 5 FASES', { size: 36, color: zombie ? '#f97316' : COLORS.text });
    const sub = zombie
      ? 'Cooperativo, 1–4 jogadores · cada chefão só aparece quando todos os ajudantes caem'
      : this.purpose === 'battle'
        ? 'Batalha Local · escolha o mapa'
        : 'Do primeiro commit ao deploy de sexta-feira · cada fase tem um chefão';
    text(this, 42, 90, sub, { font: 'body', size: 22, color: COLORS.dim });
    const g = this.add.graphics();
    cards.forEach((s, i) => {
      const x = X0 + i * (CARD_W + GAP);
      const y = 140;
      panel(g, x, y, CARD_W, 600, COLORS.panel);
      g.fillStyle(hex(zombie ? '#f97316' : s.color), 1);
      g.fillRect(x, y, CARD_W, 5);
      text(this, x + 16, y + 22, s.label, { size: 10, color: zombie ? '#f97316' : s.color });
      text(this, x + 16, y + 46, s.name.toUpperCase(), { size: 11, wrap: CARD_W - 24 });
      // miniatura do mapa
      const cell = 13;
      const mx = x + (CARD_W - 15 * cell) / 2;
      const my = y + 84;
      g.fillStyle(0x0b0d14, 1);
      g.fillRect(mx - 3, my - 3, 15 * cell + 6, 11 * cell + 6);
      const boxColor = zombie ? '#ea580c' : '#b8864f';
      s.mapa.forEach((row, ry) =>
        [...row].forEach((c, rx) => {
          const color =
            c === '#' ? (rx === 0 || ry === 0 || rx === 14 || ry === 10 ? s.theme.border : s.theme.rack)
            : c === 'x' ? boxColor
            : c === 's' ? '#a8875a'
            : (rx + ry) % 2 ? s.theme.floorA : s.theme.floorB;
          g.fillStyle(hex(color), 1);
          g.fillRect(mx + rx * cell, my + ry * cell, cell, cell);
        }),
      );
      text(this, x + 16, y + 250, s.desc, { font: 'body', size: 15, color: COLORS.dim, wrap: CARD_W - 30 });
      text(this, x + 16, y + 352, 'Inimigos', { font: 'body', size: 14, color: COLORS.dim });
      const step = s.inimigos.length > 4 ? 40 : 50;
      s.inimigos.forEach((e, k) => {
        g.fillStyle(hex('#232737'), 1);
        g.fillRect(x + 16 + k * step, y + 376, 44, 44);
        this.add.image(x + 38 + k * step, y + 398, `enemy_${e}_0`).setScale(2);
      });
      text(this, x + 16, y + 432, s.mecanica, { font: 'body', size: 13, color: COLORS.text, wrap: CARD_W - 30 });
      g.fillStyle(0x0b0d14, 1);
      g.fillRect(x + 12, y + 520, CARD_W - 24, 66);
      text(this, x + 24, y + 530, 'CHEFÃO', { size: 8, color: COLORS.yellow });
      text(this, x + 24, y + 546, s.boss, { font: 'body', size: 15, bold: true, wrap: CARD_W - 44 });
      if (s.bossSub) text(this, x + 24, y + 566, s.bossSub, { font: 'body', size: 12, color: '#84cc16' });
    });
    // véu dos cards bloqueados por cima de todo o conteúdo
    const veil = this.add.graphics();
    cards.forEach((_, i) => {
      if (!this.locked(i)) return;
      const x = X0 + i * (CARD_W + GAP);
      veil.fillStyle(0x0b0d14, 0.82);
      veil.fillRect(x, 140, CARD_W, 600);
      veil.fillStyle(hex('#1b1e2b'), 1);
      veil.fillRect(x + 16, 290, CARD_W - 32, 76);
      text(this, x + CARD_W / 2, 308, 'BLOQUEADA', { size: 12, color: COLORS.text, align: 'center' });
      text(this, x + CARD_W / 2, 332, zombie ? `sobreviva à noite ${i}` : `vença a fase ${i}`, { font: 'body', size: 15, color: COLORS.dim, align: 'center' });
    });
    this.cursor = this.add.graphics();
    text(this, 640, 760, 'ESQ./DIR. escolher · ENTER confirmar · ESC voltar', { size: 10, color: COLORS.dim, align: 'center' });
    this.drawCursor();
  }

  private drawCursor() {
    const g = this.cursor;
    g.clear();
    const x = X0 + this.sel * (CARD_W + GAP);
    g.lineStyle(4, hex(this.locked(this.sel) ? COLORS.dim : COLORS.yellow), 1);
    g.strokeRect(x - 2, 138, CARD_W + 4, 604);
  }

  update() {
    input.beginFrame();
    if (input.menuLeft() || input.menuUp()) {
      this.sel = (this.sel + 4) % 5;
      sfx('move');
      this.drawCursor();
    }
    if (input.menuRight() || input.menuDown()) {
      this.sel = (this.sel + 1) % 5;
      sfx('move');
      this.drawCursor();
    }
    if (input.back()) {
      this.scene.start('Title');
      return;
    }
    if (input.confirm()) {
      if (this.locked(this.sel)) {
        sfx('deny');
        return;
      }
      sfx('confirm');
      this.scene.start('CharacterSelect', { mode: this.purpose, stage: this.sel });
    }
  }
}
