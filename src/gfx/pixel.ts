/** Pequeno "editor" de pixel art em memória: desenha numa grade e exporta para canvas. */
export class Pix {
  readonly data: (string | null)[];
  constructor(readonly w: number, readonly h: number, readonly ox = 0, readonly oy = 0) {
    this.data = new Array(w * h).fill(null);
  }
  px(x: number, y: number, c: string | null) {
    x += this.ox;
    y += this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string | null) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  circle(cx: number, cy: number, r: number, c: string) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.px(x, y, c);
  }
  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.data[y * this.w + x];
  }
  /** Contorno escuro de 1 px em volta de tudo que foi desenhado (estilo 16-bit). */
  outline(c = '#0b0d14') {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push(y * this.w + x);
      }
    for (const i of add) this.data[i] = c;
    return this;
  }
  recolor(map: Record<string, string>) {
    for (let i = 0; i < this.data.length; i++) {
      const c = this.data[i];
      if (c && map[c]) this.data[i] = map[c];
    }
    return this;
  }
  toCanvas(scale = 1, rows?: [number, number]): HTMLCanvasElement {
    const [r0, r1] = rows ?? [0, this.h];
    const cv = document.createElement('canvas');
    cv.width = this.w * scale;
    cv.height = (r1 - r0) * scale;
    const ctx = cv.getContext('2d')!;
    for (let y = r0; y < r1; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.data[y * this.w + x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x * scale, (y - r0) * scale, scale, scale);
      }
    return cv;
  }
}

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [cv, ctx];
}
