/** Gamepads como alternativa ao teclado: o gamepad N controla o jogador N. */
export interface PadState {
  dx: number;
  dy: number;
  bomb: boolean;
  special: boolean;
  start: boolean;
  bombPressed: boolean;
  specialPressed: boolean;
  startPressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
}

const prev: Record<number, { bomb: boolean; special: boolean; start: boolean; dx: number; dy: number }> = {};

export function readPads(): (PadState | null)[] {
  const out: (PadState | null)[] = [null, null, null, null];
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < 4; i++) {
    const g = pads[i];
    if (!g || !g.connected) continue;
    const b = (n: number) => !!g.buttons[n]?.pressed;
    let dx = (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
    let dy = (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
    const ax = g.axes[0] ?? 0;
    const ay = g.axes[1] ?? 0;
    if (!dx && Math.abs(ax) > 0.45) dx = Math.sign(ax);
    if (!dy && Math.abs(ay) > 0.45) dy = Math.sign(ay);
    const bomb = b(0) || b(2);
    const special = b(1) || b(3);
    const start = b(9);
    const p = prev[i] ?? { bomb: false, special: false, start: false, dx: 0, dy: 0 };
    out[i] = {
      dx,
      dy,
      bomb,
      special,
      start,
      bombPressed: bomb && !p.bomb,
      specialPressed: special && !p.special,
      startPressed: start && !p.start,
      upPressed: dy < 0 && p.dy >= 0,
      downPressed: dy > 0 && p.dy <= 0,
      leftPressed: dx < 0 && p.dx >= 0,
      rightPressed: dx > 0 && p.dx <= 0,
    };
    prev[i] = { bomb, special, start, dx, dy };
  }
  return out;
}
