import Phaser from 'phaser';
import { BODY_FONT, PIXEL_FONT } from '../gfx/art';

export const COLORS = {
  bg: '#11131c',
  panel: '#1b1e2b',
  panelDark: '#151824',
  line: '#2a2f42',
  text: '#e5e7eb',
  dim: '#8b93a7',
  yellow: '#fde047',
  green: '#22c55e',
  red: '#ef4444',
};

export const hex = (c: string) => parseInt(c.replace('#', ''), 16);

type TextOpts = { size?: number; color?: string; font?: 'pixel' | 'body'; bold?: boolean; align?: 'left' | 'center' | 'right'; wrap?: number; stroke?: string };

/** Texto nítido (resolução 2×) nas duas fontes do jogo. */
export function text(scene: Phaser.Scene, x: number, y: number, str: string, o: TextOpts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: o.font === 'body' ? BODY_FONT : PIXEL_FONT,
    fontSize: `${o.size ?? 16}px`,
    color: o.color ?? COLORS.text,
    fontStyle: o.bold ? 'bold' : 'normal',
    align: o.align ?? 'left',
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    stroke: o.stroke,
    strokeThickness: o.stroke ? 4 : 0,
    lineSpacing: o.font === 'body' ? 4 : 6,
  });
  t.setResolution(2);
  if (o.align === 'center') t.setOrigin(0.5, 0);
  if (o.align === 'right') t.setOrigin(1, 0);
  return t;
}

export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = COLORS.panel, border?: string, bw = 3) {
  g.fillStyle(hex(fill), 1);
  g.fillRect(x, y, w, h);
  if (border) {
    g.lineStyle(bw, hex(border), 1);
    g.strokeRect(x + bw / 2, y + bw / 2, w - bw, h - bw);
  }
}

/** Tecla desenhada como "keycap". */
export function keycap(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, x: number, y: number, label: string, color = COLORS.text, minW = 30) {
  const t = text(scene, 0, 0, label, { size: 8, color });
  const w = Math.max(minW, t.width + 14);
  g.fillStyle(hex('#0f111a'), 1);
  g.fillRect(x, y, w, 26);
  g.lineStyle(2, hex('#3a4058'), 1);
  g.strokeRect(x + 1, y + 1, w - 2, 24);
  t.setPosition(Math.round(x + (w - t.width) / 2), y + 9);
  return { w, t };
}

export const fmt = (n: number) => Math.floor(n).toLocaleString('pt-BR');
