import type { Rng } from '../core/rng';
import { DROP_CHANCE } from '../core/data';

export const TILE = {
  Floor: 0,
  Wall: 1, // rack de servidor (indestrutível)
  Box: 2, // TODO / FIXME / HACK
  Postit: 3, // bloco temporário
  Deadline: 4, // borda fechando no fim do tempo
} as const;
export type TileKind = (typeof TILE)[keyof typeof TILE];

export const BOX_LABELS = ['TODO', 'FIXME', 'HACK'] as const;

export class Grid {
  readonly tiles: Uint8Array;
  readonly label: Uint8Array;
  readonly hasDrop: Uint8Array;
  readonly timer: Float32Array; // post-it (vida) ou caixa em chamas (contagem)
  readonly spawns: { x: number; y: number }[] = [];
  version = 0; // incrementa a cada mudança — o renderer só redesenha quando muda

  constructor(readonly w: number, readonly h: number) {
    const n = w * h;
    this.tiles = new Uint8Array(n);
    this.label = new Uint8Array(n);
    this.hasDrop = new Uint8Array(n);
    this.timer = new Float32Array(n);
  }

  static fromMap(map: string[], rng: Rng): Grid {
    const h = map.length;
    const w = map[0].length;
    const g = new Grid(w, h);
    const spawns: Record<string, { x: number; y: number }> = {};
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = map[y][x];
        const i = y * w + x;
        if (c === '#') g.tiles[i] = TILE.Wall;
        else if (c === 'x') {
          g.tiles[i] = TILE.Box;
          g.label[i] = Math.floor(rng() * 3);
          g.hasDrop[i] = rng() < DROP_CHANCE ? 1 : 0;
        } else if (c >= '1' && c <= '4') spawns[c] = { x, y };
      }
    }
    for (const k of ['1', '2', '3', '4']) g.spawns.push(spawns[k] ?? { x: 1, y: 1 });
    return g;
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): number {
    return this.inside(x, y) ? this.tiles[y * this.w + x] : TILE.Wall;
  }
  set(x: number, y: number, t: TileKind) {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    if (this.tiles[i] !== t) {
      this.tiles[i] = t;
      this.version++;
    }
  }
  isFloor(x: number, y: number) {
    return this.get(x, y) === TILE.Floor;
  }
  idx(x: number, y: number) {
    return y * this.w + x;
  }
}
