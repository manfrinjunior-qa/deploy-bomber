import Phaser from 'phaser';
import { ROLE_ORDER, STAGES, roleById, specialById } from '../core/data';
import type { GameMode, PlayerSetup, RoleId } from '../core/types';
import { sfx } from '../core/sfx';
import type { Session } from '../core/session';
import { input } from '../input/input';
import { keyName, moveLabel } from '../input/keymaps';
import { COLORS, hex, keycap, panel, text } from '../ui/common';

type SlotState = 'off' | 'choosing' | 'ready';
interface Slot {
  state: SlotState;
  role: RoleId;
  variant: number;
  box?: Phaser.GameObjects.Container;
}

const CARD_W = 295;
const GAP = 12;
const X0 = (1280 - (CARD_W * 4 + GAP * 3)) / 2;
const Y0 = 118;
const CARD_H = 640;
const THUMB_GAP = 6;

const MODE_LABEL: Record<GameMode, string> = {
  story: 'MODO HISTÓRIA',
  battle: 'BATALHA LOCAL',
  client: 'DESAFIO DO CLIENTE',
};

export class CharacterSelectScene extends Phaser.Scene {
  private mode: GameMode = 'story';
  private stage = 0;
  private slots: Slot[] = [];
  private status!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private countdown = -1;

  constructor() {
    super('CharacterSelect');
  }

  init(data: { mode: GameMode; stage?: number }) {
    this.mode = data.mode;
    this.stage = data.stage ?? 0;
    this.countdown = -1;
    this.slots = ROLE_ORDER.map((role, i) => ({ state: i === 0 ? 'choosing' : 'off', role, variant: 0 }));
  }

  private get minPlayers() {
    return this.mode === 'battle' ? 2 : 1;
  }

  create() {
    text(this, 40, 28, 'ESCOLHA SEU PAPEL', { size: 30 });
    const where = this.mode === 'client' ? 'as 4 versões do Cliente' : `Fase ${this.stage + 1} · ${STAGES[this.stage].name}`;
    text(this, 42, 76, `${MODE_LABEL[this.mode]} · ${where} · 1 teclado, até 4 jogadores`, { font: 'body', size: 20, color: COLORS.dim });
    this.status = text(this, 1240, 40, '', { size: 14, color: COLORS.yellow, align: 'right' });
    this.hint = text(this, 640, 772, '', { size: 9, color: COLORS.dim, align: 'center' });
    this.slots.forEach((_, i) => this.drawCard(i));
    this.refreshStatus();
  }

  private taken(role: RoleId, except: number) {
    return this.slots.some((s, i) => i !== except && s.state !== 'off' && s.role === role);
  }

  /** FR-002: papéis únicos — pula papéis já escolhidos por outros jogadores. */
  private cycleRole(i: number, dir: number) {
    const s = this.slots[i];
    let idx = ROLE_ORDER.indexOf(s.role);
    const n = ROLE_ORDER.length;
    for (let k = 0; k < n; k++) {
      idx = (idx + dir + n) % n;
      if (!this.taken(ROLE_ORDER[idx], i)) {
        s.role = ROLE_ORDER[idx];
        s.variant = 0;
        return;
      }
    }
  }

  private cycleVariant(i: number, dir: number) {
    const s = this.slots[i];
    const n = roleById(s.role).variants.length;
    s.variant = (s.variant + dir + n) % n;
  }

  private join(i: number) {
    const s = this.slots[i];
    if (this.taken(s.role, i)) this.cycleRole(i, 1);
    s.state = 'choosing';
  }

  private drawCard(i: number) {
    const s = this.slots[i];
    s.box?.destroy();
    const c = this.add.container(X0 + i * (CARD_W + GAP), Y0);
    s.box = c;
    const r = roleById(s.role);
    const g = this.add.graphics();
    c.add(g);
    const on = s.state !== 'off';
    panel(g, 0, 0, CARD_W, CARD_H, COLORS.panel, s.state === 'ready' ? r.color : on ? '#3a4058' : '#232737', s.state === 'ready' ? 5 : 3);

    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (c.add(o), o);
    // retrato
    g.fillStyle(hex('#232737'), 1);
    g.fillRect(20, 20, CARD_W - 40, 168);
    add(this.add.image(CARD_W / 2, 106, `char_${s.role}_${s.variant}_0`).setScale(8).setAlpha(on ? 1 : 0.35));
    if (s.state === 'ready') {
      const tag = add(text(this, CARD_W - 28, 28, `P${i + 1} PRONTO`, { size: 9, color: '#0b0d14', align: 'right' }));
      g.fillStyle(hex(r.color), 1);
      g.fillRect(tag.x - tag.width - 8, 22, tag.width + 16, 22);
    }

    add(text(this, 20, 202, r.name, { size: 22, color: on ? r.color : COLORS.dim }));
    add(text(this, 20, 234, `${r.fullName} · P${i + 1}`, { font: 'body', size: 17, color: COLORS.dim }));
    add(text(this, 20, 266, 'Variante', { font: 'body', size: 16, color: COLORS.dim }));
    add(text(this, CARD_W - 20, 266, r.variants[s.variant].name, { font: 'body', size: 16, bold: true, align: 'right' }));
    // miniaturas: o tamanho se ajusta ao número de variantes para caber na largura do card
    const n = r.variants.length;
    const thumb = Math.min(58, Math.floor((CARD_W - 40 - THUMB_GAP * (n - 1)) / n));
    r.variants.forEach((_, k) => {
      const x = 20 + k * (thumb + THUMB_GAP);
      g.fillStyle(hex('#232737'), 1);
      g.fillRect(x, 294, thumb, thumb);
      if (k === s.variant) {
        g.lineStyle(3, hex(on ? r.color : COLORS.dim), 1);
        g.strokeRect(x + 1.5, 295.5, thumb - 3, thumb - 3);
      }
      add(this.add.image(x + thumb / 2, 294 + thumb / 2, `face_${s.role}_${k}`).setScale((thumb - 6) / 18).setAlpha(on ? 1 : 0.4));
    });

    const stats: [string, number][] = [['Velocidade', r.speed], ['Alcance', r.range], ['Bombas', r.bombs]];
    const statsY = 294 + thumb + 18;
    stats.forEach(([label, v], k) => {
      const y = statsY + k * 28;
      add(text(this, 20, y, label, { font: 'body', size: 16, color: COLORS.dim }));
      for (let b = 0; b < 5; b++) {
        g.fillStyle(hex(b < v ? (on ? r.color : '#4b5163') : '#2a2f42'), 1);
        g.fillRect(CARD_W - 20 - (5 - b) * 30, y + 4, 26, 12);
      }
    });

    const sp = specialById(r.especialId);
    add(
      text(this, 20, statsY + 92, `Bomba: ${r.bombType}\nEspecial: ${sp.name} — ${sp.efeito} (recarga ${sp.recarga} s)\nEncontra: ${r.finds}`, {
        font: 'body', size: 15, color: on ? COLORS.text : COLORS.dim, wrap: CARD_W - 40,
      }),
    );

    // teclas
    const km = input.keymap(i);
    const kg = this.add.graphics();
    c.add(kg);
    let x = 20;
    for (const k of moveLabel(km)) {
      const cap = keycap(this, kg, x, CARD_H - 50, k);
      c.add(cap.t);
      x += cap.w + 6;
    }
    for (const [code, color] of [[km.bomb[0], COLORS.yellow], [km.special[0], '#7dd3fc']] as const) {
      const cap = keycap(this, kg, x, CARD_H - 50, keyName(code), color);
      c.add(cap.t);
      x += cap.w + 6;
    }

    if (!on) {
      const ov = this.add.graphics();
      ov.fillStyle(0x0b0d14, 0.55);
      ov.fillRect(3, 3, CARD_W - 6, CARD_H - 66);
      c.add(ov);
      add(text(this, CARD_W / 2, 130, `PRESSIONE ${keyName(km.bomb[0])}\nPARA ENTRAR`, { size: 12, color: COLORS.yellow, align: 'center' }));
    }
  }

  private refreshStatus() {
    const joined = this.slots.filter((s) => s.state !== 'off');
    const ready = joined.filter((s) => s.state === 'ready');
    this.status.setText(`${ready.length} / ${joined.length} PRONTOS`);
    const can = joined.length >= this.minPlayers && ready.length === joined.length;
    if (!can) this.countdown = -1;
    else if (this.countdown < 0) this.countdown = 2.5;
    this.hint.setText(
      joined.length < this.minPlayers
        ? `a batalha precisa de pelo menos 2 jogadores · ESC volta`
        : can
          ? `ENTER inicia agora · ESC volta`
          : `cima/baixo: papel · esq./dir.: visual · bomba: pronto · especial: cancelar · ESC volta`,
    );
  }

  private start() {
    const players: PlayerSetup[] = this.slots
      .map((s, slot) => ({ s, slot }))
      .filter(({ s }) => s.state === 'ready')
      .map(({ s, slot }) => ({ slot, role: s.role, variant: s.variant }));
    const session: Session = { mode: this.mode, players, stage: this.stage, arena: 0, client: 0 };
    sfx('confirm');
    this.scene.start('Arena', { session });
  }

  update(_t: number, delta: number) {
    input.beginFrame();
    if (input.pressed('Escape')) {
      this.scene.start('Title');
      return;
    }
    let changed = false;
    this.slots.forEach((s, i) => {
      const before = `${s.state}${s.role}${s.variant}`;
      if (s.state === 'off') {
        if (input.actionPressed(i, 'bomb')) this.join(i);
      } else if (s.state === 'choosing') {
        if (input.actionPressed(i, 'up')) this.cycleRole(i, -1);
        if (input.actionPressed(i, 'down')) this.cycleRole(i, 1);
        if (input.actionPressed(i, 'left')) this.cycleVariant(i, -1);
        if (input.actionPressed(i, 'right')) this.cycleVariant(i, 1);
        if (input.actionPressed(i, 'bomb')) s.state = 'ready';
        else if (input.actionPressed(i, 'special')) s.state = 'off';
      } else if (input.actionPressed(i, 'special')) s.state = 'choosing';
      if (before !== `${s.state}${s.role}${s.variant}`) {
        changed = true;
        sfx(s.state === 'ready' ? 'confirm' : 'move');
      }
    });
    if (changed) {
      this.slots.forEach((_, i) => this.drawCard(i));
      this.refreshStatus();
    }
    const joined = this.slots.filter((s) => s.state !== 'off');
    if (input.pressed('Enter', 'NumpadEnter') && joined.length >= this.minPlayers && joined.every((s) => s.state === 'ready')) {
      this.start();
      return;
    }
    if (this.countdown >= 0) {
      this.countdown -= delta / 1000;
      this.hint.setText(`todos prontos · começando em ${Math.max(0, Math.ceil(this.countdown))}… (ENTER inicia agora)`);
      if (this.countdown <= 0) this.start();
    }
  }
}
