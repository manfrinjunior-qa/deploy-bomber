import { describe, expect, it } from 'vitest';
import { STAGES } from '../../src/core/data';
import type { PlayerInput } from '../../src/core/types';
import { World } from '../../src/systems/world';

const map = [
  '###############',
  '#1............#',
  '#.#.#.#.#.#.#.#',
  '#.............#',
  '#.#.#.#.#.#.#.#',
  '#.............#',
  '#.#.#.#.#.#.#.#',
  '#.............#',
  '#.#.#.#.#.#.#.#',
  '#.............#',
  '###############',
];

const mk = () => {
  const w = new World({
    mode: 'battle', map, theme: STAGES[0].theme, stageId: 1, stageName: 't', arenaLabel: 't',
    enemyTypes: [], enemyCount: 0, players: [{ slot: 0, role: 'DEV', variant: 0 }], lives: 3, seed: 1,
  });
  return { w, p: w.players[0] };
};
const run = (w: World, input: PlayerInput, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) w.update(1 / 60, [input]);
};

describe('movimento com duas direções seguradas', () => {
  it('não trava no lugar (a tecla mais recente manda)', () => {
    const { w, p } = mk();
    run(w, { dx: 1, dy: 1, prefer: 'h', bomb: false, special: false }, 0.6);
    expect(p.x).toBeGreaterThan(2);
  });

  it('a direção mais recente bloqueada cai para a outra e faz a curva no cruzamento', () => {
    const { w, p } = mk();
    // segurando direita, aperta baixo: (1,2) está livre, então desce
    run(w, { dx: 1, dy: 1, prefer: 'v', bomb: false, special: false }, 0.4);
    expect(p.y).toBeGreaterThan(1.5);
    // no corredor horizontal y=1 com baixo bloqueado por rack em (2,2): segue para a direita
    const b = mk();
    b.p.x = 2;
    run(b.w, { dx: 1, dy: 1, prefer: 'v', bomb: false, special: false }, 0.15);
    expect(b.p.x).toBeGreaterThan(2.2);
  });

  it('a assistência de quina não puxa contra a direção segurada', () => {
    const { w, p } = mk();
    p.x = 2.4; // entre colunas, rack abaixo de x=2
    p.y = 1;
    run(w, { dx: 1, dy: 1, prefer: 'v', bomb: false, special: false }, 0.05);
    expect(p.x).toBeGreaterThanOrEqual(2.4);
  });
});
