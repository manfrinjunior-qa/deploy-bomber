import Phaser from 'phaser';
import { ROLES } from '../core/data';
import { save } from '../core/save';
import { sfx } from '../core/sfx';
import { input } from '../input/input';
import { BRAND_BG, addLogo } from '../ui/brand';
import { COLORS, fmt, hex, text } from '../ui/common';

const MENU = [
  { label: 'MODO HISTÓRIA · 1–4 JOGADORES', go: (s: Phaser.Scene) => s.scene.start('CharacterSelect', { mode: 'story', stage: 0 }) },
  { label: 'BATALHA LOCAL', go: (s: Phaser.Scene) => s.scene.start('StageSelect', { purpose: 'battle' }) },
  { label: 'DESAFIO DO CLIENTE', go: (s: Phaser.Scene) => s.scene.start('CharacterSelect', { mode: 'client', stage: 0 }) },
  { label: 'SELEÇÃO DE FASES', go: (s: Phaser.Scene) => s.scene.start('StageSelect', { purpose: 'story' }) },
  { label: 'PERSONAGENS', go: (s: Phaser.Scene) => s.scene.start('Characters') },
  { label: 'OPÇÕES', go: (s: Phaser.Scene) => s.scene.start('Options') },
];

const MENU_Y = 384;
const MENU_STEP = 50;

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

    // logo centrada sobre a coluna do menu (x 64..844); o fundo da cena é o da arte
    this.cameras.main.setBackgroundColor(BRAND_BG);
    addLogo(this, 454, 172, 300);
    text(this, 454, 328, 'Exploda o backlog. Sobreviva à sexta-feira.', { font: 'body', size: 22, color: COLORS.dim, align: 'center' });

    this.cursor = this.add.graphics();
    MENU.forEach((m, i) => this.items.push(text(this, 116, MENU_Y + i * MENU_STEP, m.label, { size: 18 })));

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
    const y = MENU_Y + this.sel * MENU_STEP - 14;
    g.fillStyle(hex('#1e2232'), 1);
    g.fillRect(64, y, 780, 46);
    g.lineStyle(4, hex(COLORS.yellow), 1);
    g.strokeRect(64, y, 780, 46);
    g.fillStyle(hex(COLORS.yellow), 1);
    g.fillTriangle(84, y + 13, 84, y + 33, 100, y + 23);
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
