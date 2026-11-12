import Phaser from 'phaser';
import { roleById, ROLE_ORDER } from '../core/data';
import { save } from '../core/save';
import { sfx } from '../core/sfx';
import { input } from '../input/input';
import { ACTIONS, ACTION_LABEL, DEFAULT_KEYMAPS, cloneKeymaps, keyName, type Action } from '../input/keymaps';
import { COLORS, hex, text } from '../ui/common';

const COL_X = 250;
const COL_W = 160;
const ROW_Y = 200;
const ROW_H = 66;

/** FR-012: remapeamento de teclas salvo localmente. */
export class OptionsScene extends Phaser.Scene {
  private row = 0; // 0..3 jogadores, 4 som, 5 padrão, 6 voltar
  private col = 0;
  private capturing = false;
  private g!: Phaser.GameObjects.Graphics;
  private cells: Phaser.GameObjects.Text[][] = [];
  private extras: Phaser.GameObjects.Text[] = [];
  private msg!: Phaser.GameObjects.Text;

  constructor() {
    super('Options');
  }

  create() {
    this.row = 0;
    this.col = 0;
    this.capturing = false;
    this.cells = [];
    this.extras = [];
    text(this, 40, 36, 'OPÇÕES', { size: 32 });
    text(this, 42, 86, 'Remapeie as teclas para contornar o limite de teclas simultâneas (ghosting) do seu teclado.', {
      font: 'body', size: 19, color: COLORS.dim,
    });
    this.g = this.add.graphics();
    ACTIONS.forEach((a, c) => text(this, COL_X + c * COL_W + COL_W / 2, 160, ACTION_LABEL[a], { size: 10, color: COLORS.dim, align: 'center' }));
    for (let r = 0; r < 4; r++) {
      const role = roleById(ROLE_ORDER[r]);
      text(this, 60, ROW_Y + r * ROW_H + 18, `P${r + 1}`, { size: 16, color: role.color });
      this.cells.push(ACTIONS.map((_, c) => text(this, COL_X + c * COL_W + COL_W / 2, ROW_Y + r * ROW_H + 20, '', { size: 12, align: 'center' })));
    }
    const ey = ROW_Y + 4 * ROW_H + 30;
    this.extras = ['', 'RESTAURAR TECLAS PADRÃO', 'VOLTAR'].map((s, i) => text(this, 90, ey + i * 50, s, { size: 14 }));
    this.msg = text(this, 640, 700, '', { size: 12, color: COLORS.yellow, align: 'center' });
    text(this, 640, 740, 'Gamepads: o controle N joga como PN · A/X = bomba · B/Y = especial · START = pausa', {
      font: 'body', size: 17, color: COLORS.dim, align: 'center',
    });
    text(this, 640, 768, 'setas escolhem · ENTER altera · ESC volta', { size: 9, color: COLORS.dim, align: 'center' });
    this.refresh();
  }

  private refresh() {
    const km = save.data.keymaps;
    const all = new Map<string, number>();
    km.forEach((k) => ACTIONS.forEach((a) => k[a].forEach((code) => all.set(code, (all.get(code) ?? 0) + 1))));
    this.cells.forEach((row, r) =>
      row.forEach((t, c) => {
        const code = km[r][ACTIONS[c]][0];
        t.setText(keyName(code));
        t.setColor((all.get(code) ?? 0) > 1 ? COLORS.red : c === 4 ? COLORS.yellow : c === 5 ? '#7dd3fc' : COLORS.text);
      }),
    );
    this.extras[0].setText(`SOM: ${save.data.sound ? 'LIGADO' : 'DESLIGADO'}`);
    const g = this.g;
    g.clear();
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < ACTIONS.length; c++) {
        const x = COL_X + c * COL_W + 10;
        const y = ROW_Y + r * ROW_H;
        const sel = this.row === r && this.col === c;
        g.fillStyle(hex(sel ? '#262b3d' : COLORS.panel), 1);
        g.fillRect(x, y, COL_W - 20, 52);
        g.lineStyle(sel ? 4 : 2, hex(sel ? (this.capturing ? COLORS.green : COLORS.yellow) : '#2a2f42'), 1);
        g.strokeRect(x, y, COL_W - 20, 52);
      }
    this.extras.forEach((t, i) => t.setColor(this.row === 4 + i ? COLORS.yellow : COLORS.text));
    if (this.row >= 4) {
      const t = this.extras[this.row - 4];
      g.fillStyle(hex(COLORS.yellow), 1);
      g.fillTriangle(60, t.y + 1, 60, t.y + 15, 72, t.y + 8);
    }
  }

  private assign(r: number, a: Action, code: string) {
    const km = save.data.keymaps;
    const old = km[r][a][0];
    // se a tecla já está em uso, troca as duas de lugar
    km.forEach((k, kr) =>
      ACTIONS.forEach((ka) => {
        if ((kr !== r || ka !== a) && k[ka].includes(code)) k[ka] = [old];
      }),
    );
    km[r][a] = [code];
    save.write();
  }

  update() {
    input.beginFrame();
    if (this.capturing) return;
    if (input.pressed('Escape', 'Backspace')) {
      this.scene.start('Title');
      return;
    }
    let moved = false;
    if (input.pressed('ArrowUp')) { this.row = (this.row + 6) % 7; moved = true; }
    if (input.pressed('ArrowDown')) { this.row = (this.row + 1) % 7; moved = true; }
    if (input.pressed('ArrowLeft') && this.row < 4) { this.col = (this.col + 5) % 6; moved = true; }
    if (input.pressed('ArrowRight') && this.row < 4) { this.col = (this.col + 1) % 6; moved = true; }
    if (moved) {
      sfx('move');
      this.refresh();
    }
    if (!input.pressed('Enter', 'NumpadEnter')) return;
    sfx('confirm');
    if (this.row < 4) {
      const r = this.row;
      const a = ACTIONS[this.col];
      this.capturing = true;
      this.msg.setText(`P${r + 1} · ${ACTION_LABEL[a]}: pressione a nova tecla (ESC cancela)`);
      this.refresh();
      input.capture = (code) => {
        this.capturing = false;
        if (code !== 'Escape') {
          this.assign(r, a, code);
          this.msg.setText(`P${r + 1} · ${ACTION_LABEL[a]} = ${keyName(code)} · salvo`);
        } else this.msg.setText('');
        this.refresh();
      };
    } else if (this.row === 4) {
      save.data.sound = !save.data.sound;
      save.write();
      this.refresh();
    } else if (this.row === 5) {
      save.data.keymaps = cloneKeymaps(DEFAULT_KEYMAPS);
      save.write();
      this.msg.setText('teclas padrão restauradas');
      this.refresh();
    } else this.scene.start('Title');
  }
}
