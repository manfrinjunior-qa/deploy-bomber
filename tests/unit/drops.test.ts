import { describe, expect, it } from 'vitest';
import { DROP_TABLES, ITEMS, itemById } from '../../src/core/data';
import { makeRng } from '../../src/core/rng';
import { rollDrop } from '../../src/systems/drops';
import { World } from '../../src/systems/world';
import { applyItem } from '../../src/systems/items';
import type { RoleId } from '../../src/core/types';

const ROLES: RoleId[] = ['DEV', 'QA', 'PO', 'COM'];

describe('tabelas de drop', () => {
  it('há 24 itens exclusivos (6 por papel) e 4 neutros', () => {
    for (const r of ROLES) expect(ITEMS.filter((i) => i.role === r).length).toBe(6);
    expect(ITEMS.filter((i) => i.role === 'NEUTRAL').map((i) => i.name)).toEqual(['Café', 'Code Review', 'Bug Crítico', 'Copiloto IA']);
  });

  it('pesos: atributo 60%, especiais 30%, neutros 10%', () => {
    for (const r of ROLES) {
      const sum = (kind: string) => DROP_TABLES[r].filter(([id]) => itemById(id).kind === kind).reduce((s, [, w]) => s + w, 0);
      expect(sum('attr')).toBe(60);
      expect(sum('special')).toBe(30);
      expect(sum('neutral')).toBe(10);
    }
  });

  it.each(ROLES)('FR-005: bomba do %s só gera itens do papel ou neutros', (role) => {
    const rng = makeRng(7);
    for (let i = 0; i < 2000; i++) {
      const item = itemById(rollDrop(role, rng));
      expect([role, 'NEUTRAL']).toContain(item.role);
    }
  });

  it('a distribuição segue os pesos (aprox.)', () => {
    const rng = makeRng(99);
    let neutral = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (itemById(rollDrop('DEV', rng)).role === 'NEUTRAL') neutral++;
    expect(neutral / N).toBeGreaterThan(0.08);
    expect(neutral / N).toBeLessThan(0.12);
  });
});

describe('efeitos de itens', () => {
  const mk = () =>
    new World({
      mode: 'story',
      map: ['#####', '#1..#', '#...#', '#####'],
      theme: { floorA: '#000', floorB: '#000', border: '#000', rack: '#000', rackLight: '#000' },
      stageId: 1,
      stageName: 't',
      arenaLabel: 't',
      enemyTypes: [],
      enemyCount: 0,
      players: [{ slot: 0, role: 'QA', variant: 0 }],
      lives: 3,
      seed: 1,
    });

  it('história 3: o 3º bug gera um Relatório e zera o contador', () => {
    const w = mk();
    const p = w.players[0];
    applyItem(w, p, 'bug');
    applyItem(w, p, 'bug');
    expect(p.bugs).toBe(2);
    expect(w.enemyFreeze).toBe(0);
    applyItem(w, p, 'bug');
    expect(p.bugs).toBe(0);
    expect(w.enemyFreeze).toBe(3);
  });

  it('FR-006: item de outro papel vale para quem pegou', () => {
    const w = mk();
    const p = w.players[0]; // QA alcance 2
    applyItem(w, p, 'py'); // item do DEV
    expect(p.stats.range).toBe(3);
  });

  it('atributos param no máximo de 8', () => {
    const w = mk();
    const p = w.players[0];
    for (let i = 0; i < 10; i++) applyItem(w, p, 'cy');
    expect(p.stats.speed).toBe(8);
  });

  it('escudo absorve 1 explosão', () => {
    const w = mk();
    const p = w.players[0];
    p.invuln = 0;
    applyItem(w, p, 'rs');
    w.hurt(p, -1);
    expect(p.lives).toBe(3);
    expect(p.shield).toBe(0);
  });
});
