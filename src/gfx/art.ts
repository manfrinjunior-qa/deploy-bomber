import { Pix, canvas, shade } from './pixel';

export const PIXEL_FONT = '"Press Start 2P", monospace';
export const BODY_FONT = '"Space Grotesk", sans-serif';
export const TILE_PX = 56;

const INK = '#0b0d14';

// ───────────────────────────── inimigos
export function drawEnemy(type: string, frame = 0): Pix {
  const p = new Pix(18, 18, 1, 1);
  const bob = frame ? 1 : 0;
  switch (type) {
    case 'bug': {
      const c = '#e11d48';
      const d = '#9f1239';
      p.px(4, 1 + bob, c); p.px(5, 2 + bob, c); p.px(11, 1 + bob, c); p.px(10, 2 + bob, c);
      p.rect(5, 3 + bob, 6, 2, c);
      p.rect(4, 5, 8, 7, c);
      p.rect(4, 10, 8, 1, d);
      p.rect(8, 5, 1, 7, d);
      p.rect(5, 6, 2, 2, '#fff'); p.rect(9, 6, 2, 2, '#fff');
      p.px(6, 7, INK); p.px(10, 7, INK);
      const l = frame ? 1 : 0;
      p.rect(2, 6 + l, 2, 1, c); p.rect(12, 6 + l, 2, 1, c);
      p.rect(2, 9 - l, 2, 1, c); p.rect(12, 9 - l, 2, 1, c);
      p.rect(3, 12 + l, 2, 1, c); p.rect(11, 12 + l, 2, 1, c);
      break;
    }
    case 'meeting': {
      p.rect(3, 3 + bob, 10, 10, '#e2e8f0');
      p.rect(3, 3 + bob, 10, 3, '#2563eb');
      p.rect(5, 2 + bob, 1, 2, INK); p.rect(10, 2 + bob, 1, 2, INK);
      p.rect(5, 8 + bob, 2, 1, INK); p.rect(9, 8 + bob, 2, 1, INK);
      p.rect(6, 10 + bob, 4, 1, INK);
      p.rect(4, 12 + bob, 8, 1, '#94a3b8');
      for (let i = 0; i < 4; i++) p.px(4 + i * 2, 12 + bob, '#64748b');
      break;
    }
    case 'leak': {
      const c = '#22c55e';
      const d = '#15803d';
      p.rect(5, 2 + bob, 6, 2, c);
      p.rect(4, 4 + bob, 8, 2, c);
      p.rect(3, 6 + bob, 10, 6, c);
      p.rect(3, 12, 2, 2 + bob, c); p.rect(6, 12, 2, 3 - bob, c); p.rect(9, 12, 2, 2 + bob, c); p.rect(11, 12, 2, 3 - bob, d);
      p.rect(12, 6 + bob, 1, 6, d);
      p.px(5, 3 + bob, '#bbf7d0');
      p.rect(5, 7 + bob, 2, 2, '#052e16'); p.rect(9, 7 + bob, 2, 2, '#052e16');
      p.rect(7, 10 + bob, 2, 1, '#052e16');
      break;
    }
    case 'merge': {
      const o = '#f97316';
      const b = '#3b82f6';
      p.rect(4, 2 + bob, 8, 2, o);
      p.rect(3, 4 + bob, 10, 9, o);
      p.rect(8, 2 + bob, 4, 2, b);
      p.rect(8, 4 + bob, 5, 9, b);
      p.rect(8, 4 + bob, 1, 9, '#fff');
      p.px(7, 6 + bob, '#fff'); p.px(7, 9 + bob, '#fff');
      p.rect(5, 6 + bob, 2, 2, INK); p.rect(10, 6 + bob, 2, 2, INK);
      p.rect(4, 13, 1, 2, o); p.rect(6, 13, 1, 2 - bob, o); p.rect(9, 13, 1, 2 - bob, b); p.rect(11, 13, 1, 2, b);
      p.rect(6, 10 + bob, 4, 1, INK);
      break;
    }
  }
  return p.outline(INK);
}

// ───────────────────────────── chefões
export function drawBoss(sprite: string, frame = 0): Pix {
  const p = new Pix(26, 26, 1, 1);
  const bob = frame ? 1 : 0;
  const angryEyes = (y: number, c = INK) => {
    p.rect(6, y, 4, 3, '#fff'); p.rect(14, y, 4, 3, '#fff');
    p.rect(8, y + 1, 2, 2, c); p.rect(14, y + 1, 2, 2, c);
    p.rect(5, y - 1, 5, 1, INK); p.rect(14, y - 1, 5, 1, INK);
  };
  switch (sprite) {
    case 'printer':
      p.rect(6, 0 + bob, 12, 7, '#ffffff');
      p.rect(8, 2 + bob, 8, 1, '#cbd5e1'); p.rect(8, 4 + bob, 6, 1, '#cbd5e1');
      p.rect(2, 6, 20, 14, '#cbd5e1');
      p.rect(2, 6, 20, 3, '#94a3b8');
      p.rect(21, 6, 1, 14, '#64748b');
      angryEyes(11);
      p.rect(5, 16, 14, 2, INK);
      p.rect(7, 16, 3, 3, '#ffffff');
      p.rect(17, 10, 3, 2, frame ? '#ef4444' : '#fbbf24');
      p.rect(3, 20, 4, 3, '#475569'); p.rect(17, 20, 4, 3, '#475569');
      break;
    case 'envelope':
      p.rect(1, 4 + bob, 22, 16, '#f8fafc');
      for (let i = 0; i < 11; i++) { p.px(1 + i, 4 + bob + i / 1.4, '#cbd5e1'); p.px(22 - i, 4 + bob + i / 1.4, '#cbd5e1'); }
      p.rect(1, 19 + bob, 22, 1, '#cbd5e1');
      angryEyes(10 + bob);
      p.rect(8, 16 + bob, 8, 1, INK);
      p.rect(16, 1 + bob, 7, 5, '#ef4444');
      p.rect(18, 2 + bob, 3, 3, '#fff');
      p.px(19, 3 + bob, '#ef4444');
      break;
    case 'server':
      p.rect(3, 0, 18, 24, '#334155');
      p.rect(20, 0, 1, 24, '#1e293b');
      p.rect(5, 2, 14, 8, '#0b0d14');
      // "500"
      const digit = (x: number, d: number[]) => d.forEach((row, j) => [0, 1, 2].forEach((i) => row & (4 >> i) && p.px(x + i, 3 + j, '#ef4444')));
      digit(6, [7, 4, 7, 1, 7]); digit(10, [7, 5, 5, 5, 7]); digit(14, [7, 5, 5, 5, 7]);
      for (let r = 0; r < 4; r++) {
        p.rect(5, 12 + r * 3, 14, 2, '#1e293b');
        p.px(6, 12 + r * 3, (r + frame) % 2 ? '#22c55e' : '#ef4444');
        p.px(8, 12 + r * 3, '#fbbf24');
      }
      break;
    case 'monolith':
      p.rect(3, 1, 18, 23, '#6b7280');
      p.rect(19, 1, 2, 23, '#4b5563');
      p.rect(3, 1, 18, 2, '#9ca3af');
      p.rect(6, 15, 1, 6, '#4b5563'); p.rect(7, 18, 2, 1, '#4b5563'); p.rect(15, 4, 1, 4, '#4b5563');
      p.rect(6, 8, 4, 2, frame ? '#ef4444' : '#f87171'); p.rect(14, 8, 4, 2, frame ? '#ef4444' : '#f87171');
      p.rect(5, 7, 5, 1, INK); p.rect(14, 7, 5, 1, INK);
      p.rect(8, 13, 8, 1, INK);
      break;
    case 'bigbug': {
      const c = '#b91c1c';
      const d = '#7f1d1d';
      p.px(6, 1 + bob, c); p.px(7, 2 + bob, c); p.px(17, 1 + bob, c); p.px(16, 2 + bob, c);
      p.rect(7, 3 + bob, 10, 3, c);
      p.rect(5, 6, 14, 12, c);
      p.rect(11, 6, 2, 12, d);
      p.rect(5, 14, 14, 1, d);
      angryEyes(8);
      const l = frame ? 1 : 0;
      for (const y of [8, 12, 16]) { p.rect(2, y + l, 3, 1, c); p.rect(19, y - l, 3, 1, c); }
      // fogo
      p.rect(9, 0, 2, 2, frame ? '#f97316' : '#fde047');
      p.rect(13, 0, 2, 2, frame ? '#fde047' : '#f97316');
      p.rect(7, 19, 10, 2, '#f97316');
      p.rect(9, 21, 6, 1, '#fde047');
      break;
    }
  }
  return p.outline(INK);
}

// ───────────────────────────── sprites em texto (Modo Zumbi)
/**
 * Desenha um sprite de `zumbi-sprites.json` (16 colunas; '.' transparente) com contorno de 1 px.
 * O quadro 1 sobe 1 px (balanço da animação); o morcego bate as asas trocando a linha das pontas.
 */
export function drawRowSprite(rows: string[], palette: Record<string, string>, frame = 0): Pix {
  const p = new Pix(18, rows.length + 3, 1, 1);
  const bob = frame ? 0 : 1;
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && palette[ch] && p.px(x, y + bob, palette[ch])));
  return p.outline(INK);
}

// ───────────────────────────── bomba
export function drawBomb(color: string, frame: number, coin = false): Pix {
  const p = new Pix(18, 18, 1, 1);
  const body = coin ? '#facc15' : '#1f2433';
  p.circle(7.5, 9.5, 5.6, body);
  p.rect(4, 6, 2, 2, coin ? '#fef9c3' : color);
  p.px(4, 8, coin ? '#fef9c3' : color);
  if (coin) {
    p.rect(7, 6, 1, 7, '#a16207');
    p.rect(6, 7, 3, 1, '#a16207'); p.rect(6, 9, 3, 1, '#a16207'); p.rect(6, 11, 3, 1, '#a16207');
  }
  p.rect(10, 3, 1, 2, '#a16207');
  p.px(11, 2, '#a16207');
  p.px(12, 1, frame ? '#fde047' : '#f97316');
  if (frame) p.px(13, 0, '#fef08a');
  return p.outline(INK);
}

// ───────────────────────────── tiles 56×56
export function tileFloor(a: string, b: string, odd: boolean): HTMLCanvasElement {
  const [cv, ctx] = canvas(TILE_PX, TILE_PX);
  ctx.fillStyle = odd ? b : a;
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
  ctx.fillStyle = shade(odd ? b : a, -0.12);
  ctx.fillRect(0, TILE_PX - 4, TILE_PX, 4);
  ctx.fillRect(TILE_PX - 4, 0, 4, TILE_PX);
  ctx.fillStyle = shade(odd ? b : a, 0.05);
  ctx.fillRect(8, 8, 4, 4);
  return cv;
}

export function tileRack(rack: string, light: string): HTMLCanvasElement {
  const [cv, ctx] = canvas(TILE_PX, TILE_PX);
  ctx.fillStyle = shade(rack, -0.35);
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
  ctx.fillStyle = rack;
  ctx.fillRect(2, 2, 52, 50);
  ctx.fillStyle = shade(rack, 0.18);
  ctx.fillRect(2, 2, 52, 4);
  const leds = ['#22c55e', '#fbbf24', '#3b82f6'];
  for (let r = 0; r < 3; r++) {
    const y = 10 + r * 14;
    ctx.fillStyle = shade(rack, -0.45);
    ctx.fillRect(6, y, 44, 8);
    ctx.fillStyle = light;
    ctx.fillRect(6, y + 8, 44, 2);
    ctx.fillStyle = leds[r];
    ctx.fillRect(10 + r * 4, y + 2, 4, 4);
    ctx.fillStyle = leds[(r + 2) % 3];
    ctx.fillRect(40, y + 2, 4, 4);
  }
  return cv;
}

export function tileBox(label: string, burning = false, textColor = '#ffffff'): HTMLCanvasElement {
  const [cv, ctx] = canvas(TILE_PX, TILE_PX);
  ctx.fillStyle = '#7a4a22';
  ctx.fillRect(2, 2, 52, 52);
  ctx.fillStyle = burning ? '#d97745' : '#c8925a';
  ctx.fillRect(4, 4, 48, 46);
  ctx.fillStyle = '#a8733f';
  ctx.fillRect(4, 42, 48, 8);
  ctx.fillRect(4, 4, 48, 4);
  ctx.fillStyle = '#e8bd85';
  ctx.fillRect(24, 4, 8, 46);
  // rótulos longos (PROGRESS) quebram em duas linhas para não encolher a fonte
  const lines = label.length > 5 ? [label.slice(0, Math.ceil(label.length / 2)), label.slice(Math.ceil(label.length / 2))] : [label];
  ctx.font = `${label.length > 4 ? 8 : 10}px ${PIXEL_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#5b2a12';
  lines.forEach((l, k) => {
    const y = 29 + (k - (lines.length - 1) / 2) * 12;
    ctx.strokeText(l, 28, y);
    ctx.fillStyle = textColor;
    ctx.fillText(l, 28, y);
  });
  if (burning) {
    ctx.fillStyle = '#f97316';
    ctx.fillRect(6, 0, 8, 8); ctx.fillRect(22, 0, 10, 6); ctx.fillRect(42, 2, 8, 8);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(8, 2, 4, 4); ctx.fillRect(25, 0, 4, 4); ctx.fillRect(44, 4, 4, 4);
  }
  return cv;
}

// ───────────────────────────── Modo Zumbi: lápide (bloco fixo), abóbora (destrutível), areia
export function tileTomb(stone: string, light: string): HTMLCanvasElement {
  const [cv, ctx] = canvas(TILE_PX, TILE_PX);
  const dark = shade(stone, -0.35);
  // base
  ctx.fillStyle = shade(stone, -0.5);
  ctx.fillRect(6, 46, 44, 6);
  ctx.fillStyle = dark;
  ctx.fillRect(8, 44, 40, 4);
  // pedra com topo arredondado
  ctx.fillStyle = dark;
  ctx.fillRect(10, 12, 36, 34);
  ctx.fillRect(14, 8, 28, 4);
  ctx.fillRect(18, 6, 20, 2);
  ctx.fillStyle = stone;
  ctx.fillRect(12, 12, 32, 32);
  ctx.fillRect(16, 9, 24, 3);
  ctx.fillStyle = light;
  ctx.fillRect(12, 12, 4, 30);
  ctx.fillRect(16, 9, 22, 3);
  // cruz gravada
  ctx.fillStyle = shade(stone, -0.45);
  ctx.fillRect(25, 16, 6, 22);
  ctx.fillRect(18, 22, 20, 6);
  return cv;
}

export function tilePumpkin(mode: '' | 'burn' | 'zap' = ''): HTMLCanvasElement {
  const [cv, ctx] = canvas(TILE_PX, TILE_PX);
  const body = mode === 'zap' ? '#fb923c' : '#ea580c';
  const lit = mode === 'zap' ? '#fef9c3' : '#fbbf24';
  // talo
  ctx.fillStyle = '#3f6212';
  ctx.fillRect(25, 6, 6, 8);
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(25, 6, 3, 6);
  // corpo
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(8, 14, 40, 34);
  ctx.fillRect(12, 12, 32, 38);
  ctx.fillStyle = body;
  ctx.fillRect(10, 16, 36, 30);
  ctx.fillRect(14, 14, 28, 34);
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(18, 14, 3, 34);
  ctx.fillRect(35, 14, 3, 34);
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(12, 18, 4, 10);
  // rosto aceso
  ctx.fillStyle = lit;
  ctx.fillRect(17, 24, 7, 6);
  ctx.fillRect(32, 24, 7, 6);
  ctx.fillRect(17, 36, 22, 4);
  ctx.fillStyle = body;
  ctx.fillRect(22, 36, 3, 2);
  ctx.fillRect(31, 36, 3, 2);
  if (mode === 'burn') {
    ctx.fillStyle = '#f97316';
    ctx.fillRect(6, 0, 8, 8); ctx.fillRect(40, 2, 8, 8);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(8, 2, 4, 4); ctx.fillRect(42, 4, 4, 4);
  } else if (mode === 'zap') {
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(4, 8, 4, 10); ctx.fillRect(8, 16, 4, 4); ctx.fillRect(46, 30, 4, 12); ctx.fillRect(42, 40, 4, 4);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(5, 9, 2, 6); ctx.fillRect(47, 31, 2, 8);
  }
  return cv;
}

export function tileSand(): HTMLCanvasElement {
  const [cv, ctx] = canvas(TILE_PX, TILE_PX);
  ctx.fillStyle = 'rgba(214, 178, 110, 0.55)';
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
  ctx.fillStyle = 'rgba(160, 120, 60, 0.6)';
  for (const [x, y] of [[8, 10], [30, 6], [44, 20], [14, 34], [36, 40], [22, 22], [6, 48], [46, 46]]) ctx.fillRect(x, y, 4, 2);
  ctx.fillStyle = 'rgba(250, 230, 180, 0.5)';
  for (const [x, y] of [[18, 12], [40, 30], [10, 26], [28, 48]]) ctx.fillRect(x, y, 2, 2);
  return cv;
}

export function tilePostit(): HTMLCanvasElement {
  const [cv, ctx] = canvas(TILE_PX, TILE_PX);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(6, 6, 46, 46);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(4, 4, 46, 46);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(4, 4, 46, 8);
  ctx.fillStyle = '#a16207';
  for (let i = 0; i < 3; i++) ctx.fillRect(10, 20 + i * 8, 30 - i * 6, 3);
  return cv;
}

export function tileDeadline(): HTMLCanvasElement {
  const [cv, ctx] = canvas(TILE_PX, TILE_PX);
  ctx.fillStyle = '#2a0a0e';
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
  ctx.fillStyle = '#7f1d1d';
  for (let i = -TILE_PX; i < TILE_PX; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, TILE_PX);
    ctx.lineTo(i + 8, TILE_PX);
    ctx.lineTo(i + 8 + TILE_PX, 0);
    ctx.lineTo(i + TILE_PX, 0);
    ctx.fill();
  }
  ctx.fillStyle = '#0b0d14';
  ctx.fillRect(0, 0, TILE_PX, 2);
  ctx.fillRect(0, TILE_PX - 2, TILE_PX, 2);
  return cv;
}

// ───────────────────────────── ícones de item
export function itemIcon(icon: string, bg: string, fg: string, border: string | undefined, size: number): HTMLCanvasElement {
  const [cv, ctx] = canvas(size, size);
  const u = Math.max(2, Math.round(size / 16));
  ctx.fillStyle = shade(bg, -0.35);
  ctx.fillRect(u, u, size - u, size - u);
  ctx.fillStyle = border ?? bg;
  ctx.fillRect(0, 0, size - u, size - u);
  if (border) {
    ctx.fillStyle = bg;
    ctx.fillRect(u, u, size - 3 * u, size - 3 * u);
  }
  const fs = size >= 40 ? (icon.length > 2 ? 10 : 16) : icon.length > 2 ? 6 : 8;
  ctx.font = `${fs}px ${PIXEL_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  ctx.fillText(icon, (size - u) / 2 + 1, (size - u) / 2 + 1);
  return cv;
}
