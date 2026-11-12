import Phaser from 'phaser';
import { ROLES } from '../core/data';
import { save } from '../core/save';
import { sfx } from '../core/sfx';
import { input } from '../input/input';
import { COLORS, fmt, hex, text } from '../ui/common';

const MENU = [
  { label: 'MODO HISTÓRIA · 1–4 JOGADORES', go: (s: Phaser.Scene) => s.scene.start('CharacterSelect', { mode: 'story', stage: 0 }) },
  { label: 'BATALHA LOCAL', go: (s: Phaser.Scene) => s.scene.start('StageSelect', { purpose: 'battle' }) },
  { label: 'DESAFIO DO CLIENTE', go: (s: Phaser.Scene) => s.scene.start('CharacterSelect', { mode: 'client', stage: 0 }) },
  { label: 'SELEÇÃO DE FASES', go: (s: Phaser.Scene) => s.scene.start('StageSelect', { purpose: 'story' }) },
  { label: 'OPÇÕES', go: (s: Phaser.Scene) => s.scene.start('Options') },
];

export class TitleScene extends Phaser.Scene {
  private sel = 0;
  private items: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Graphics;
  private press!: Phaser.GameObjects.Text;
  private chars: Phaser.GameObjects.Image[] = [];
  private strip: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Title');
  }

  create() {
    this.items = [];
    this.chars = [];
    this.strip = [];
    text(this, 48, 32, `HI ${fmt(save.data.hiScore)}`, { size: 12, color: COLORS.dim });
    text(this, 1232, 32, 'v0.1 · MVP', { size: 12, color: COLORS.dim, align: 'right' });

    const deploy = text(this, 64, 130, 'DEPLOY', { size: 72, color: '#fde047' });
    deploy.setShadow(6, 6, '#c2410c', 0, false, true);
    const bomber = text(this, 64, 220, 'BOMBER', { size: 72, color: '#f1f5f9' });
    bomber.setShadow(6, 6, '#6d28d9', 0, false, true);
    text(this, 66, 318, 'Exploda o backlog. Sobreviva à sexta-feira.', { font: 'body', size: 26, color: COLORS.dim });

    this.cursor = this.add.graphics();
    MENU.forEach((m, i) => this.items.push(text(this, 116, 398 + i * 56, m.label, { size: 18 })));

    ROLES.forEach((r, i) => {
      const x = 950 + (i % 2) * 180;
      const y = 250 + Math.floor(i / 2) * 210;
      const img = this.add.image(x, y, `char_${r.id}_0_0`).setScale(7);
      this.chars.push(img);
      text(this, x, y + 74, r.name, { size: 12, color: r.color, align: 'center' });
    });

    this.press = text(this, 640, 696, 'PRESSIONE ENTER', { size: 16, align: 'center' });
    for (let i = 0; i < 25; i++) {
      const key = i % 2 === 0 ? 'rack_title' : `box_${['FIXME', 'TODO', 'HACK'][Math.floor(i / 2) % 3]}`;
      this.strip.push(this.add.image(i * 56, 772, key).setOrigin(0, 0.5));
    }
    this.drawCursor();
  }

  private drawCursor() {
    const g = this.cursor;
    g.clear();
    const y = 398 + this.sel * 56 - 18;
    g.fillStyle(hex('#1e2232'), 1);
    g.fillRect(64, y, 780, 52);
    g.lineStyle(4, hex(COLORS.yellow), 1);
    g.strokeRect(64, y, 780, 52);
    g.fillStyle(hex(COLORS.yellow), 1);
    g.fillTriangle(84, y + 16, 84, y + 36, 100, y + 26);
    this.items.forEach((t, i) => t.setColor(i === this.sel ? COLORS.yellow : COLORS.text));
  }

  update(time: number, delta: number) {
    input.beginFrame();
    if (input.menuUp()) {
      this.sel = (this.sel + MENU.length - 1) % MENU.length;
      sfx('move');
      this.drawCursor();
    }
    if (input.menuDown()) {
      this.sel = (this.sel + 1) % MENU.length;
      sfx('move');
      this.drawCursor();
    }
    if (input.confirm()) {
      sfx('confirm');
      MENU[this.sel].go(this);
      return;
    }
    this.press.setVisible(Math.floor(time / 600) % 2 === 0);
    this.chars.forEach((c, i) => {
      c.y = 250 + Math.floor(i / 2) * 210 + Math.round(Math.sin(time / 300 + i) * 3);
    });
    for (const s of this.strip) {
      s.x -= delta * 0.03;
      if (s.x < -56) s.x += 25 * 56;
    }
  }
}
