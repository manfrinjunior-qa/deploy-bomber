import { describe, expect, it } from 'vitest';
import { NIGHTS, STAGES } from '../../src/core/data';
import { makeRng } from '../../src/core/rng';
import { worldConfig, type Session } from '../../src/core/session';
import type { PlayerInput, PlayerSetup } from '../../src/core/types';
import { TILE } from '../../src/systems/grid';
import { World } from '../../src/systems/world';

const PLAYERS: PlayerSetup[] = [
  { slot: 0, role: 'DEV', variant: 0 },
  { slot: 1, role: 'QA', variant: 1 },
  { slot: 2, role: 'PO', variant: 2 },
  { slot: 3, role: 'COM', variant: 3 },
];

/** Joga uma arena com entradas aleatórias e verifica invariantes. */
function fuzz(session: Session, seed: number, seconds = 75) {
  const w = new World({ ...worldConfig(session), seed });
  w.time = 50; // força o deadline durante o teste
  const rng = makeRng(seed);
  const held = PLAYERS.map(() => ({ dx: 0, dy: 0 }));
  for (let f = 0; f < seconds * 60 && !w.outcome; f++) {
    const inputs: PlayerInput[] = held.map((h) => {
      if (rng() < 0.08) {
        const d = Math.floor(rng() * 5);
        h.dx = d === 0 ? 1 : d === 1 ? -1 : 0;
        h.dy = d === 2 ? 1 : d === 3 ? -1 : 0;
      }
      return { dx: h.dx, dy: h.dy, bomb: rng() < 0.02, special: rng() < 0.01 };
    });
    w.update(1 / 60, inputs);
    for (const p of w.players) {
      if (!p.alive) continue;
      expect(p.x).toBeGreaterThanOrEqual(0.5);
      expect(p.y).toBeGreaterThanOrEqual(0.5);
      expect(p.x).toBeLessThanOrEqual(w.grid.w - 1.5);
      expect(p.y).toBeLessThanOrEqual(w.grid.h - 1.5);
      expect(w.grid.get(Math.round(p.x), Math.round(p.y))).not.toBe(TILE.Wall);
      for (const k of ['speed', 'range', 'bombs'] as const) expect(p.stats[k]).toBeLessThanOrEqual(8);
    }
    expect(w.enemies.length).toBeLessThanOrEqual(16);
  }
  return w;
}

describe('simulação com entradas aleatórias', () => {
  STAGES.forEach((st, s) => {
    for (let a = 0; a <= 3; a++) {
      it(`história: fase ${st.id} ${a === 3 ? 'chefão' : `arena ${a + 1}`}`, () => {
        fuzz({ mode: 'story', players: PLAYERS, stage: s, arena: a, client: 0 }, 100 + s * 10 + a);
      });
    }
    it(`batalha: ${st.name}`, () => {
      const w = fuzz({ mode: 'battle', players: PLAYERS, stage: s, arena: 0, client: 0 }, 500 + s, 120);
      expect(w.outcome === null || w.outcome === 'win' || w.outcome === 'draw').toBe(true);
    });
  });
  for (let c = 0; c < 4; c++) {
    it(`desafio do cliente ${c + 1}/4`, () => {
      fuzz({ mode: 'client', players: PLAYERS, stage: 0, arena: 0, client: c }, 900 + c);
    });
  }
  NIGHTS.forEach((n, i) => {
    it(`modo zumbi: noite ${n.id} (${n.name})`, () => {
      const w = fuzz({ mode: 'zombie', players: PLAYERS, stage: i, arena: 0, client: 0 }, 1300 + i);
      expect(w.horde!.spawned).toBeLessThanOrEqual(n.ajudantes);
    });
    it(`modo zumbi: noite ${n.id} com o chefão em campo`, () => {
      // derruba os ajudantes até o chefão aparecer e deixa os ataques dele rodarem com entradas aleatórias
      const w = new World({ ...worldConfig({ mode: 'zombie', players: PLAYERS, stage: i, arena: 0, client: 0 }), seed: 1400 + i });
      for (let f = 0; f < 60 * 90 && !w.boss; f++) {
        for (const e of w.enemies) if (e.helper) w.killEnemy(e, 0);
        for (const p of w.players) p.invuln = 5;
        w.update(1 / 60, []);
      }
      expect(w.boss?.def.id).toBe(n.chefao);
      const rng = makeRng(77 + i);
      for (let f = 0; f < 60 * 60 && !w.outcome; f++) {
        const inputs = PLAYERS.map(() => ({ dx: Math.round(rng() * 2 - 1), dy: 0, bomb: rng() < 0.03, special: rng() < 0.01 }));
        w.update(1 / 60, inputs);
        for (const p of w.players) if (p.alive) expect(w.grid.get(Math.round(p.x), Math.round(p.y))).not.toBe(TILE.Wall);
        const b = w.boss!;
        if (!b.dead) {
          expect(w.grid.inside(Math.round(b.x), Math.round(b.y))).toBe(true);
          expect(b.hp).toBeLessThanOrEqual(b.maxHp);
        }
        expect(w.enemies.length).toBeLessThanOrEqual(16);
      }
    });
  });
});
