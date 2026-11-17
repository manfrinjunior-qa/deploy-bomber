import Phaser from 'phaser';
import { ROLE_ORDER, bossById, roleById, specialById } from '../core/data';
import type { Player } from '../entities/Player';
import { input } from '../input/input';
import { keyName, moveLabel } from '../input/keymaps';
import type { World } from '../systems/world';
import { COLORS, fmt, hex, keycap, panel, text } from './common';

export const BOARD_X = 32;
export const BOARD_Y = 140;
const PANEL_W = 232;
const TIMER_W = 240;
const GAP = 12;
const PANEL_Y = 14;
const PANEL_H = 112;
const SIDE_X = 900;
const SIDE_W = 348;

const panelX = (slot: number) => {
  const x0 = 32;
  const idx = slot < 2 ? slot : slot + 1; // timer fica no meio
  let x = x0;
  for (let i = 0; i < idx; i++) x += (i === 2 ? TIMER_W : PANEL_W) + GAP;
  return x;
};
const TIMER_X = panelX(1) + PANEL_W + GAP;

const TIMED: [keyof Player, string][] = [
  ['coffee', 'cf'],
  ['codeReview', 'cr'],
  ['invert', 'xx'],
  ['copilot', 'ia'],
  ['candy', 'dc'],
];

interface PanelUI {
  face?: Phaser.GameObjects.Image;
  hearts: Phaser.GameObjects.Image[];
  score?: Phaser.GameObjects.Text;
  icons: Phaser.GameObjects.Image[];
  more?: Phaser.GameObjects.Text;
  cd: Phaser.GameObjects.Graphics;
  cdText?: Phaser.GameObjects.Text;
  sig: string;
}

/** FR-008: HUD com vidas, pontuação e itens ativos por jogador; tempo e fase ao centro. */
export class Hud {
  private panels: PanelUI[] = [];
  private timer: Phaser.GameObjects.Text;
  private stageText: Phaser.GameObjects.Text;
  private arenaText: Phaser.GameObjects.Text;
  private logTexts: { who: Phaser.GameObjects.Text; text: Phaser.GameObjects.Text; sub: Phaser.GameObjects.Text }[] = [];
  private logSig = '';
  private logTop: number;
  private logLines: Phaser.GameObjects.Graphics;
  private bossG?: Phaser.GameObjects.Graphics;
  private bossFace?: Phaser.GameObjects.Image;
  private bossAttack?: Phaser.GameObjects.Text;
  private bossLabel?: Phaser.GameObjects.Text;
  private zombie: boolean;

  constructor(private scene: Phaser.Scene, private w: World) {
    this.zombie = w.cfg.mode === 'zombie';
    const g = scene.add.graphics().setDepth(20);
    // painéis dos jogadores
    for (let slot = 0; slot < 4; slot++) {
      const x = panelX(slot);
      const p = w.playerBySlot(slot);
      const role = p ? roleById(p.role) : roleById(ROLE_ORDER[slot]);
      panel(g, x, PANEL_Y, PANEL_W, PANEL_H, p ? COLORS.panel : COLORS.panelDark);
      g.fillStyle(hex(p ? role.color : '#2a2f42'), 1);
      g.fillRect(x, PANEL_Y, PANEL_W, 4);
      const ui: PanelUI = { hearts: [], icons: [], cd: scene.add.graphics().setDepth(21), sig: '' };
      if (p) {
        g.fillStyle(hex('#232737'), 1);
        g.fillRect(x + 10, PANEL_Y + 16, 58, 58);
        ui.face = scene.add.image(x + 39, PANEL_Y + 46, `face_${p.role}_${p.variant}`).setScale(3).setDepth(21);
        text(scene, x + 78, PANEL_Y + 16, `P${slot + 1} ${role.name}`, { size: 10, color: role.color }).setDepth(21);
        for (let i = 0; i < 5; i++) ui.hearts.push(scene.add.image(x + 78 + i * 20, PANEL_Y + 40, 'heart').setOrigin(0, 0).setDepth(21));
        ui.score = text(scene, x + PANEL_W - 10, PANEL_Y + 40, '0', { size: 10, align: 'right' }).setDepth(21);
        for (let i = 0; i < 6; i++) ui.icons.push(scene.add.image(x + 78 + i * 25, PANEL_Y + 64, 'itemS_js').setOrigin(0, 0).setDepth(21).setVisible(false));
        ui.more = text(scene, x + PANEL_W - 8, PANEL_Y + 70, '', { size: 8, color: COLORS.dim, align: 'right' }).setDepth(21);
        ui.cdText = text(scene, x + 10, PANEL_Y + 92, specialById(role.especialId).name.toUpperCase(), { size: 7, color: COLORS.dim }).setDepth(21);
      } else {
        text(scene, x + PANEL_W / 2, PANEL_Y + 40, `P${slot + 1}`, { size: 14, color: '#3a4058', align: 'center' }).setDepth(21);
        text(scene, x + PANEL_W / 2, PANEL_Y + 66, 'vaga livre', { font: 'body', size: 15, color: '#4b5163', align: 'center' }).setDepth(21);
      }
      this.panels.push(ui);
    }
    // relógio
    g.fillStyle(0x0b0d14, 1);
    g.fillRect(TIMER_X, PANEL_Y, TIMER_W, PANEL_H);
    g.lineStyle(3, hex(this.zombie ? '#f97316' : '#3a4058'), 1);
    g.strokeRect(TIMER_X + 1.5, PANEL_Y + 1.5, TIMER_W - 3, PANEL_H - 3);
    this.timer = text(scene, TIMER_X + TIMER_W / 2, PANEL_Y + 18, '03:00', { size: 32, color: this.zombie ? '#f97316' : COLORS.yellow, align: 'center' }).setDepth(21);
    const st =
      w.cfg.mode === 'client'
        ? 'DESAFIO DO CLIENTE'
        : this.zombie
          ? `NOITE ${w.cfg.night} · ${w.cfg.stageName.toUpperCase()}`
          : `FASE ${w.cfg.stageId} · ${w.cfg.stageName.toUpperCase()}`;
    this.stageText = text(scene, TIMER_X + TIMER_W / 2, PANEL_Y + 66, st, { size: 8, color: COLORS.text, align: 'center' }).setDepth(21);
    this.arenaText = text(scene, TIMER_X + TIMER_W / 2, PANEL_Y + 86, '', { size: 7, color: COLORS.dim, align: 'center' }).setDepth(21);
    const al = w.cfg.arenaLabel.split('·').pop()!.trim().toUpperCase();
    this.arenaText.setText(al);

    // painel lateral (no Modo Zumbi o chefão ainda não está no mapa: o quadro mostra os ajudantes)
    panel(g, SIDE_X, BOARD_Y, SIDE_W, 616, COLORS.panel);
    let y = BOARD_Y + 18;
    const bossDef = w.boss?.def ?? (this.zombie && w.cfg.bossId ? bossById(w.cfg.bossId) : undefined);
    if (bossDef) {
      this.bossG = scene.add.graphics().setDepth(21);
      g.fillStyle(hex('#2a1418'), 1);
      g.fillRect(SIDE_X + 14, y - 4, SIDE_W - 28, 92);
      const key = scene.textures.exists(`bossface_${bossDef.id}`) ? `bossface_${bossDef.id}` : `boss_${bossDef.id}_0`;
      this.bossFace = scene.add.image(SIDE_X + 48, y + 40, key).setScale(key.startsWith('bossface') ? 3 : 2).setDepth(21);
      this.bossLabel = text(scene, SIDE_X + 86, y + 6, 'CHEFÃO', { size: 8, color: '#f43f5e' }).setDepth(21);
      text(scene, SIDE_X + 86, y + 22, bossDef.name, { font: 'body', size: 16, bold: true, wrap: SIDE_W - 110 }).setDepth(21);
      this.bossAttack = text(scene, SIDE_X + 86, y + 66, '', { font: 'body', size: 13, color: '#fda4af', wrap: SIDE_W - 110 }).setDepth(21);
      y += 104;
    }
    text(scene, SIDE_X + 20, y, this.zombie ? '> LOG DA NOITE' : '> LOG DO SPRINT', { size: 13, color: this.zombie ? '#f97316' : COLORS.green }).setDepth(21);
    this.logTop = y + 30;
    this.logLines = scene.add.graphics().setDepth(20);
    const rows = bossDef ? 5 : 7;
    for (let i = 0; i < rows; i++) {
      const ly = this.logTop + i * 50;
      this.logTexts.push({
        who: text(scene, SIDE_X + 20, ly, '', { font: 'body', size: 16, bold: true }).setDepth(21),
        text: text(scene, SIDE_X + 20, ly, '', { font: 'body', size: 16 }).setDepth(21),
        sub: text(scene, SIDE_X + 20, ly + 21, '', { font: 'body', size: 14, color: COLORS.dim }).setDepth(21),
      });
    }

    // controles
    const cy = BOARD_Y + 616 - 52 - Math.max(1, w.players.length) * 34;
    text(scene, SIDE_X + 20, cy - 4, 'CONTROLES', { size: 11 }).setDepth(21);
    const kg = scene.add.graphics().setDepth(21);
    w.players.forEach((p, i) => {
      const ky = cy + 22 + i * 34;
      text(scene, SIDE_X + 20, ky + 8, `P${p.slot + 1}`, { size: 9, color: roleById(p.role).color }).setDepth(21);
      const km = input.keymap(p.slot);
      let x = SIDE_X + 60;
      for (const k of moveLabel(km)) {
        const c = keycap(scene, kg, x, ky, k);
        c.t.setDepth(22);
        x += c.w + 4;
      }
      x += 8;
      for (const [code, color] of [[km.bomb[0], COLORS.yellow], [km.special[0], '#7dd3fc']] as const) {
        const c = keycap(scene, kg, x, ky, keyName(code), color);
        c.t.setDepth(22);
        x += c.w + 4;
      }
    });
    text(scene, SIDE_X + 20, BOARD_Y + 616 - 26, 'ESC pausa', { size: 7, color: COLORS.dim }).setDepth(21);
  }

  update() {
    const w = this.w;
    const t = Math.ceil(w.time);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    this.timer.setText(`${mm}:${ss}`);
    const fast = w.rushT > 0 || (w.cfg.stageId === 5 && w.time <= 60);
    this.timer.setColor(w.deadline ? COLORS.red : fast ? '#fb923c' : this.zombie ? '#f97316' : COLORS.yellow);
    if (fast && !w.deadline) this.arenaText.setText(w.rushT > 0 ? 'MVP PRA ONTEM · 2×' : 'RELÓGIO ACELERADO');
    else if (w.deadline) this.arenaText.setText('DEADLINE!');
    else if (this.zombie) {
      const status =
        w.sandT > 0 ? 'TEMPESTADE DE AREIA'
        : w.lanternT > 0 ? `LANTERNA · ${Math.ceil(w.lanternT)} s`
        : w.moonT > 0 ? 'LUA CHEIA · ZUMBIS 1,5×'
        : w.cfg.night === 5 ? 'AS VELAS APAGARAM'
        : `NOITE ${w.cfg.night}/5`;
      this.arenaText.setText(status);
    }

    for (const p of w.players) this.updatePanel(p);
    this.updateLog();
    this.updateBoss();
  }

  private updatePanel(p: Player) {
    const ui = this.panels[p.slot];
    const timed = TIMED.filter(([k]) => (p[k] as number) > 0).map(([, id]) => id);
    const icons = [...timed, ...p.items];
    const sig = `${p.lives}|${p.score}|${icons.join(',')}|${p.alive}|${p.shield}|${p.zombie > 0}`;
    if (sig !== ui.sig) {
      ui.sig = sig;
      const maxLives = Math.max(3, p.lives);
      ui.hearts.forEach((h, i) => h.setVisible(i < maxLives).setTexture(i < p.lives ? 'heart' : 'heart_empty'));
      ui.score?.setText(fmt(p.score));
      const show = icons.slice(-6);
      ui.icons.forEach((im, i) => {
        if (i < show.length) im.setTexture(`itemS_${show[i]}`).setVisible(true);
        else im.setVisible(false);
      });
      ui.more?.setText(icons.length > 6 ? `+${icons.length - 6}` : '');
      ui.face?.setAlpha(p.alive ? 1 : 0.3);
      if (p.zombie > 0) ui.face?.setTint(0x86efac);
      else ui.face?.clearTint();
    }
    // recarga do especial (FR-007)
    const g = ui.cd;
    g.clear();
    if (!p.alive) return;
    const x = panelX(p.slot) + 10 + 96;
    const y = PANEL_Y + 93;
    const wBar = PANEL_W - 116;
    g.fillStyle(hex('#2a2f42'), 1);
    g.fillRect(x, y, wBar, 7);
    const ready = p.specialCd <= 0;
    const frac = ready ? 1 : 1 - p.specialCd / p.specialMax;
    g.fillStyle(hex(ready ? roleById(p.role).color : '#4b5163'), 1);
    g.fillRect(x, y, Math.round(wBar * frac), 7);
    ui.cdText?.setColor(ready ? COLORS.text : COLORS.dim);
  }

  private updateLog() {
    const w = this.w;
    const sig = w.log.map((l) => l.who + l.text + l.sub).join('|');
    if (sig === this.logSig) return;
    this.logSig = sig;
    this.logLines.clear();
    this.logTexts.forEach((row, i) => {
      const e = w.log[i];
      if (!e) {
        row.who.setText('');
        row.text.setText('');
        row.sub.setText('');
        return;
      }
      row.who.setText(e.who).setColor(e.color);
      row.text.setText(e.text).setX(row.who.x + row.who.width + 7);
      const maxW = SIDE_W - 40 - row.who.width - 7;
      if (row.text.width > maxW) row.text.setText(e.text.slice(0, Math.floor((e.text.length * maxW) / row.text.width) - 1) + '…');
      row.sub.setText(e.sub);
      row.who.setAlpha(1 - i * 0.08);
      row.text.setAlpha(1 - i * 0.08);
      row.sub.setAlpha(1 - i * 0.08);
      this.logLines.fillStyle(hex('#2a2f42'), 1);
      this.logLines.fillRect(SIDE_X + 20, this.logTop + i * 50 + 45, SIDE_W - 40, 1);
    });
  }

  private updateBoss() {
    const b = this.w.boss;
    if (!this.bossG) return;
    const g = this.bossG;
    const x = SIDE_X + 86;
    const y = BOARD_Y + 18 + 50;
    if (!b) {
      // Modo Zumbi: barra de ajudantes derrotados; o chefão aparece quando ela enche
      const h = this.w.horde;
      if (!h) return;
      g.clear();
      const down = this.w.helpersDown();
      const seg = Math.min(16, Math.floor((SIDE_W - 120) / h.quota) - 3);
      for (let i = 0; i < h.quota; i++) {
        g.fillStyle(hex(i < down ? '#84cc16' : '#2a3a1e'), 1);
        g.fillRect(x + i * (seg + 3), y, seg, 10);
      }
      this.bossLabel?.setText(`AJUDANTES ${down} / ${h.quota}`).setColor('#84cc16');
      this.bossAttack?.setText('vem depois dos ajudantes');
      this.bossFace?.setAlpha(0.45);
      return;
    }
    g.clear();
    this.bossLabel?.setText('CHEFÃO').setColor('#f43f5e');
    const seg = Math.min(16, Math.floor((SIDE_W - 120) / b.maxHp) - 3);
    for (let i = 0; i < b.maxHp; i++) {
      g.fillStyle(hex(i < b.hp ? '#ef4444' : '#3a2a30'), 1);
      g.fillRect(x + i * (seg + 3), y, seg, 10);
    }
    this.bossAttack?.setText(b.dead ? 'derrotado!' : b.lastAttackT > 0 ? `> ${b.lastAttack}` : b.frozen > 0 ? 'congelado' : '');
    this.bossFace?.setAlpha(b.dead ? 0.3 : 1);
  }
}
