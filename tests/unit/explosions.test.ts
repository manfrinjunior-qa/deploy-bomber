import { describe, expect, it } from 'vitest';
import { computeBlast } from '../../src/systems/explosions';
import { BOX_LABELS, Grid, TILE, boxLabelId } from '../../src/systems/grid';
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

describe('caixas TODO: quadro kanban', () => {
  const BX = 7;
  const BY = 5;
  const setup = (label: (typeof BOX_LABELS)[number], drop = 0) => {
    const w = world();
    const i = w.grid.idx(BX, BY);
    w.grid.label[i] = boxLabelId(label);
    w.grid.hasDrop[i] = drop;
    return { w, i, label: () => BOX_LABELS[w.grid.label[i]], tile: () => w.grid.get(BX, BY) };
  };

  it('TODO → PROGRESS → DONE → quebra, uma explosão por estágio', () => {
    const { w, label, tile } = setup('TODO');
    w.blast(5, 5, 3, 0);
    expect([tile(), label()]).toEqual([TILE.Box, 'PROGRESS']);
    w.blast(5, 5, 3, 0);
    expect([tile(), label()]).toEqual([TILE.Box, 'DONE']);
    w.blast(5, 5, 3, 0);
    expect(tile()).toBe(TILE.Floor);
  });

  it('a caixa segura a explosão em todos os estágios (o fogo não atravessa)', () => {
    const { w } = setup('TODO');
    for (let k = 0; k < 2; k++) {
      w.blast(5, 5, 8, 0);
      expect(w.flames.some((f) => f.x === BX + 1 && f.y === BY)).toBe(false);
    }
  });

  it('o item só cai quando a caixa quebra de verdade', () => {
    const { w } = setup('TODO', 1);
    w.blast(5, 5, 3, 0);
    w.blast(5, 5, 3, 0);
    expect(w.items.length).toBe(0);
    w.blast(5, 5, 3, 0);
    expect(w.items.length).toBe(1);
  });

  it('cada golpe vale +100 (TODO rende 300 no total)', () => {
    const { w } = setup('TODO');
    const p = w.players[0];
    const before = p.score;
    for (let k = 0; k < 3; k++) w.blast(5, 5, 3, 0);
    expect(p.score - before).toBe(300);
  });

  it.each(['FIXME', 'HACK'] as const)('%s quebra na primeira explosão', (l) => {
    const { w, tile } = setup(l);
    w.blast(5, 5, 3, 0);
    expect(tile()).toBe(TILE.Floor);
  });

  it('caixa em chamas (fase 5) queima inteira, mesmo sendo TODO', () => {
    const { w, tile } = setup('TODO');
    w.destroyBlock(BX, BY, -1, true);
    expect(tile()).toBe(TILE.Floor);
  });

  it('caixas novas nunca nascem já em PROGRESS ou DONE', () => {
    const g = Grid.fromMap(Array(11).fill('x'.repeat(15)), makeRng(7));
    const labels = new Set(Array.from(g.label));
    expect(labels.has(boxLabelId('PROGRESS'))).toBe(false);
    expect(labels.has(boxLabelId('DONE'))).toBe(false);
  });
});
