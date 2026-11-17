import Phaser from 'phaser';
import { roleById } from '../core/data';
import type { RoleId } from '../core/types';
import { save } from '../core/save';
import { sfx } from '../core/sfx';
import type { ResultsData } from '../core/session';
import { input } from '../input/input';
import { COLORS, fmt, hex, panel, text } from '../ui/common';

export class ResultsScene extends Phaser.Scene {
  private data_!: ResultsData;
  private t = 0;

  constructor() {
    super('Results');
  }

  init(d: ResultsData) {
    this.data_ = d;
    this.t = 0;
  }

  create() {
    const d = this.data_;
    const good = d.good;
    const title = text(this, 640, 90, d.title, { size: 48, color: good ? COLORS.yellow : COLORS.red, align: 'center' });
    title.setShadow(5, 5, good ? '#c2410c' : '#450a0a', 0, false, true);
    text(this, 640, 170, d.subtitle, { font: 'body', size: 24, color: COLORS.dim, align: 'center' });

    const g = this.add.graphics();
    const sorted = [...d.players].sort((a, b) => b.score - a.score);
    const w = 260;
    const x0 = 640 - (sorted.length * (w + 16) - 16) / 2;
    sorted.forEach((p, i) => {
      const r = roleById(p.role as RoleId);
      const x = x0 + i * (w + 16);
      const win = d.winner === p.slot;
      panel(g, x, 250, w, 330, COLORS.panel, win ? r.color : '#2a2f42', win ? 5 : 3);
      g.fillStyle(hex(r.color), 1);
      g.fillRect(x, 250, w, 5);
      this.add.image(x + w / 2, 350, `char_${p.role}_${p.variant}_0`).setScale(6).setAlpha(p.alive || d.mode !== 'battle' ? 1 : 0.4);
      text(this, x + w / 2, 440, `P${p.slot + 1} ${r.name}`, { size: 14, color: r.color, align: 'center' });
      text(this, x + w / 2, 474, fmt(p.score), { size: 22, align: 'center' });
      text(this, x + w / 2, 512, i === 0 ? (d.mode === 'zombie' ? 'MVP DA NOITE' : 'MVP DA SPRINT') : `${i + 1}º lugar`, { size: 9, color: i === 0 ? COLORS.yellow : COLORS.dim, align: 'center' });
      if (win) text(this, x + w / 2, 540, 'VENCEDOR', { size: 10, color: COLORS.green, align: 'center' });
    });

    text(this, 640, 620, `RECORDE: ${fmt(save.data.hiScore)}`, { size: 14, color: COLORS.dim, align: 'center' });
    if (d.mode === 'story') text(this, 640, 652, `fases liberadas: ${save.data.unlocked}/5`, { font: 'body', size: 18, color: COLORS.dim, align: 'center' });
    if (d.mode === 'zombie') text(this, 640, 652, `noites liberadas: ${save.data.zombieUnlocked}/5`, { font: 'body', size: 18, color: COLORS.dim, align: 'center' });
    text(this, 640, 720, 'ENTER volta ao menu', { size: 12, align: 'center' });
    sfx('end');
  }

  update(_t: number, delta: number) {
    input.beginFrame();
    this.t += delta;
    if (this.t > 600 && (input.confirm() || input.pressed('Escape'))) this.scene.start('Title');
  }
}
