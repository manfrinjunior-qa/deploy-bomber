import { describe, expect, it } from 'vitest';
import { computeBlast } from '../../src/systems/explosions';
import { Grid, TILE } from '../../src/systems/grid';
import { World } from '../../src/systems/world';
import { makeRng } from '../../src/core/rng';
import { STAGES } from '../../src/core/data';

const map = [
  '###############',
  '#1...........2#',
  '#.#.#.#.#.#.#.#',
  '#.............#',
  '#.#.#.#.#.#.#.#',
  '#......x......#',
  '#.#.#.#.#.#.#.#',
  '#.............#',
  '#.#.#.#.#.#.#.#',
  '#3...........4#',
  '###############',
];

function world(m = map) {
  return new World({
    mode: 'battle',
    map: m,
    theme: STAGES[0].theme,
    stageId: 1,
    stageName: 'Teste',
    arenaLabel: 'Teste',
    enemyTypes: [],
    enemyCount: 0,
    players: [
      { slot: 0, role: 'DEV', variant: 0 },
      { slot: 1, role: 'QA', variant: 0 },
    ],
    lives: 3,
    seed: 42,
  });
}

describe('computeBlast', () => {
  const g = Grid.fromMap(map, makeRng(1));

  it('explode em cruz com o alcance dado', () => {
    const r = computeBlast(g, 3, 3, 2);
    const keys = r.tiles.map((t) => `${t.x},${t.y}`).sort();
    expect(keys).toEqual(['1,3', '2,3', '3,1', '3,2', '3,3', '3,4', '3,5', '4,3', '5,3'].sort());
  });

  it('para no rack fixo sem incluí-lo', () => {
    const r = computeBlast(g, 3, 1, 3);
    expect(r.tiles.some((t) => t.y === 0)).toBe(false);
    expect(r.tiles.filter((t) => t.x === 3).map((t) => t.y).sort()).toEqual([1, 2, 3, 4]);
  });

  it('inclui e para no primeiro bloco destrutível', () => {
    const r = computeBlast(g, 3, 5, 8);
    expect(r.boxes).toEqual([{ x: 7, y: 5 }]);
    expect(r.tiles.some((t) => t.x === 8 && t.y === 5)).toBe(false);
  });

  it('detecta bombas no caminho para encadear', () => {
    const r = computeBlast(g, 1, 3, 4, (x, y) => x === 3 && y === 3);
    expect(r.bombs).toEqual([{ x: 3, y: 3 }]);
    expect(r.tiles.some((t) => t.x === 4 && t.y === 3)).toBe(false);
  });
});

describe('bombas no mundo', () => {
  it('FR-003: explode 3 s após ser colocada', () => {
    const w = world();
    const p = w.players[0];
    w.pressBomb(p);
    expect(w.bombs.length).toBe(1);
    for (let t = 0; t < 2.9; t += 0.05) w.update(0.05, []);
    expect(w.bombs.length).toBe(1);
    for (let t = 0; t < 0.2; t += 0.05) w.update(0.05, []);
    expect(w.bombs.length).toBe(0);
    expect(w.flames.length).toBeGreaterThan(0);
  });

  it('FR-004: explosões encadeiam outras bombas no alcance', () => {
    const w = world();
    const a = w.players[0];
    w.placeBomb(a, 3, 3);
    w.placeBomb(a, 5, 3);
    w.bombs[1].timer = 99;
    w.explode(w.bombs[0]);
    expect(w.bombs[0].timer).toBeLessThan(0.1);
    w.update(0.05, []);
    w.update(0.05, []);
    expect(w.bombs.length).toBe(0);
  });

  it('destrói a caixa atingida', () => {
    const w = world();
    w.blast(5, 5, 3, 0);
    expect(w.grid.get(7, 5)).toBe(TILE.Floor);
  });

  it('respeita o limite de bombas simultâneas', () => {
    const w = world();
    const p = w.players[0]; // DEV: 2 bombas
    w.pressBomb(p);
    p.x = 2;
    w.pressBomb(p);
    p.x = 3;
    w.pressBomb(p);
    expect(w.bombs.filter((b) => b.owner === 0).length).toBe(2);
  });

  it('FR-010: empate quando todos caem no mesmo frame', () => {
    const w = world();
    for (const p of w.players) {
      p.lives = 1;
      p.invuln = 0;
    }
    w.players[0].x = 3; w.players[0].y = 3;
    w.players[1].x = 5; w.players[1].y = 3;
    w.blast(4, 3, 2, -1);
    w.update(0.016, []);
    expect(w.outcome).toBe('draw');
  });
});
