import Phaser from 'phaser';
import { STAGES, bossById } from '../core/data';
import { save } from '../core/save';
import { sfx } from '../core/sfx';
import { input } from '../input/input';
import { COLORS, hex, panel, text } from '../ui/common';

const CARD_W = 232;
const GAP = 12;
const X0 = (1280 - (CARD_W * 5 + GAP * 4)) / 2;

export class StageSelectScene extends Phaser.Scene {
  private purpose: 'story' | 'battle' = 'story';
  private sel = 0;
  private cursor!: Phaser.GameObjects.Graphics;

  constructor() {
    super('StageSelect');
  }

  init(data: { purpose?: 'story' | 'battle' }) {
    this.purpose = data.purpose ?? 'story';
    this.sel = 0;
  }

  private locked(i: number) {
    return this.purpose === 'story' && i + 1 > save.data.unlocked;
  }

  create() {
    text(this, 40, 36, 'AS 5 FASES', { size: 36 });
    text(this, 42, 90, this.purpose === 'battle' ? 'Batalha Local · escolha o mapa' : 'Do primeiro commit ao deploy de sexta-feira · cada fase tem um chefão', {
      font: 'body', size: 22, color: COLORS.dim,
    });
    const g = this.add.graphics();
    STAGES.forEach((s, i) => {
      const x = X0 + i * (CARD_W + GAP);
      const y = 140;
      panel(g, x, y, CARD_W, 600, COLORS.panel);
      g.fillStyle(hex(s.color), 1);
      g.fillRect(x, y, CARD_W, 5);
      text(this, x + 16, y + 22, `FASE ${s.id}`, { size: 10, color: s.color });
      text(this, x + 16, y + 46, s.name.toUpperCase(), { size: 11, wrap: CARD_W - 24 });
      // miniatura do mapa
      const cell = 13;
      const mx = x + (CARD_W - 15 * cell) / 2;
      const my = y + 84;
      g.fillStyle(0x0b0d14, 1);
      g.fillRect(mx - 3, my - 3, 15 * cell + 6, 11 * cell + 6);
      s.arenas[0].mapa.forEach((row, ry) =>
        [...row].forEach((c, rx) => {
          const color = c === '#' ? (rx === 0 || ry === 0 || rx === 14 || ry === 10 ? s.theme.border : s.theme.rack) : c === 'x' ? '#b8864f' : (rx + ry) % 2 ? s.theme.floorA : s.theme.floorB;
          g.fillStyle(hex(color), 1);
          g.fillRect(mx + rx * cell, my + ry * cell, cell, cell);
        }),
      );
      text(this, x + 16, y + 250, s.desc, { font: 'body', size: 15, color: COLORS.dim, wrap: CARD_W - 30 });
      text(this, x + 16, y + 352, 'Inimigos', { font: 'body', size: 14, color: COLORS.dim });
      s.inimigos.forEach((e, k) => {
        g.fillStyle(hex('#232737'), 1);
        g.fillRect(x + 16 + k * 50, y + 376, 44, 44);
        this.add.image(x + 38 + k * 50, y + 398, `enemy_${e}_0`).setScale(2);
      });
      text(this, x + 16, y + 432, s.mecanica, { font: 'body', size: 13, color: COLORS.text, wrap: CARD_W - 30 });
      g.fillStyle(0x0b0d14, 1);
      g.fillRect(x + 12, y + 520, CARD_W - 24, 66);
      text(this, x + 24, y + 532, 'CHEFÃO', { size: 8, color: COLORS.yellow });
      text(this, x + 24, y + 550, bossById(s.chefao).name, { font: 'body', size: 15, bold: true, wrap: CARD_W - 44 });
    });
    // véu das fases bloqueadas por cima de todo o conteúdo do card
    const veil = this.add.graphics();
    STAGES.forEach((_, i) => {
      if (!this.locked(i)) return;
      const x = X0 + i * (CARD_W + GAP);
      veil.fillStyle(0x0b0d14, 0.82);
      veil.fillRect(x, 140, CARD_W, 600);
      veil.fillStyle(hex('#1b1e2b'), 1);
      veil.fillRect(x + 16, 290, CARD_W - 32, 76);
      text(this, x + CARD_W / 2, 308, 'BLOQUEADA', { size: 12, color: COLORS.text, align: 'center' });
      text(this, x + CARD_W / 2, 332, `vença a fase ${i}`, { font: 'body', size: 15, color: COLORS.dim, align: 'center' });
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
