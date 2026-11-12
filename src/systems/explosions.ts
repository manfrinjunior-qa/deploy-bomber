import { Grid, TILE } from './grid';

export type FlameDir = 'c' | 'h' | 'v';
export interface BlastTile {
  x: number;
  y: number;
  dir: FlameDir;
}
export interface BlastResult {
  tiles: BlastTile[];
  /** blocos destrutíveis atingidos (caixas e post-its) */
  boxes: { x: number; y: number }[];
  /** bombas atingidas (para explosão em cadeia) */
  bombs: { x: number; y: number }[];
}

const DIRS: [number, number, FlameDir][] = [
  [1, 0, 'h'],
  [-1, 0, 'h'],
  [0, 1, 'v'],
  [0, -1, 'v'],
];

/**
 * Explosão em cruz (FR-003). Cada braço:
 *  - para em rack fixo / borda (sem incluir o tile);
 *  - inclui e para no primeiro bloco destrutível;
 *  - inclui e para numa bomba (que entra em cadeia — FR-004).
 */
export function computeBlast(
  grid: Grid,
  x: number,
  y: number,
  range: number,
  isBombAt: (x: number, y: number) => boolean = () => false,
): BlastResult {
  const res: BlastResult = { tiles: [{ x, y, dir: 'c' }], boxes: [], bombs: [] };
  for (const [dx, dy, dir] of DIRS) {
    for (let i = 1; i <= range; i++) {
      const tx = x + dx * i;
      const ty = y + dy * i;
      const t = grid.get(tx, ty);
      if (t === TILE.Wall || t === TILE.Deadline) break;
      res.tiles.push({ x: tx, y: ty, dir });
      if (t === TILE.Box || t === TILE.Postit) {
        res.boxes.push({ x: tx, y: ty });
        break;
      }
      if (isBombAt(tx, ty)) {
        res.bombs.push({ x: tx, y: ty });
        break;
      }
    }
  }
  return res;
}
