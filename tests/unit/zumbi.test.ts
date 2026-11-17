import { describe, expect, it } from 'vitest';
import { NIGHTS, ZOMBIE_SPRITES, bossById, enemyById } from '../../src/core/data';
import { advance, worldConfig, type Session } from '../../src/core/session';
import type { PlayerSetup } from '../../src/core/types';
import { spawnEnemy } from '../../src/systems/ai';
import { applyItem } from '../../src/systems/items';
import { TILE } from '../../src/systems/grid';
import { BITE_TIME, MOON_BOOST, World, type WorldConfig } from '../../src/systems/world';

const THEME = { floorA: '#000', floorB: '#000', border: '#000', rack: '#000', rackLight: '#000' };
const TWO: PlayerSetup[] = [
  { slot: 0, role: 'DEV', variant: 0 },
  { slot: 1, role: 'QA', variant: 0 },
];

/** Arena pequena do Modo Zumbi, sem ajudantes iniciais (nenhum tile fica a 6+ dos spawns). */
function small(map: string[], extra: Partial<WorldConfig> = {}) {
  return new World({
    mode: 'zombie', map, theme: THEME, stageId: 0, stageName: 't', arenaLabel: 't',
    enemyTypes: ['zombie'], enemyCount: 0, bossId: 'lobisomem', players: TWO, lives: 3, seed: 1, night: 1, helpers: 2, ...extra,
  });
}

const night = (n: number, players: PlayerSetup[] = TWO, seed = 1) =>
  new World({ ...worldConfig({ mode: 'zombie', players, stage: n - 1, arena: 0, client: 0 }), seed });

const idle = () => [0, 1, 2, 3].map(() => ({ dx: 0, dy: 0, bomb: false, special: false }));

describe('Modo Zumbi · dados', () => {
  it('5 noites com as cotas e chefões do spec', () => {
    expect(NIGHTS.map((n) => [n.name, n.ajudantes, bossById(n.chefao).name, bossById(n.chefao).resistencia])).toEqual([
      ['Floresta da Lua Cheia', 5, 'Lobisomem', 8],
      ['Laboratório do Doutor', 6, 'A Criatura', 9],
      ['Museu à Meia-noite', 7, 'Múmia', 10],
      ['Cemitério da Firma', 8, 'Bruxa', 11],
      ['Castelo Sombrio', 10, 'Vampiro', 14],
    ]);
  });

  it('inimigos de cada noite', () => {
    expect(NIGHTS.map((n) => n.inimigos.map((e) => enemyById(e).name))).toEqual([
      ['Zumbi corredor', 'Zumbi comum'],
      ['Zumbi comum', 'Zumbi corredor', 'Zumbi de escritório'],
      ['Zumbi comum', 'Zumbi de escritório'],
      ['Zumbi comum', 'Morcego'],
      ['Zumbi comum', 'Fantasma', 'Poltergeist', 'Morcego'],
    ]);
  });

  it('mapas 15×11 com os 4 spawns, e todo chefão/inimigo do modo tem sprite', () => {
    for (const n of NIGHTS) {
      expect(n.mapa).toHaveLength(11);
      for (const row of n.mapa) expect(row).toHaveLength(15);
      for (const c of '1234') expect(n.mapa.join('')).toContain(c);
      expect(ZOMBIE_SPRITES.bosses[n.chefao]).toBeDefined();
      for (const e of n.inimigos) expect(ZOMBIE_SPRITES.enemies[e]).toBeDefined();
    }
    expect(NIGHTS[2].mapa.join('')).toContain('s'); // areia só no museu
    expect(NIGHTS.filter((n) => n.mapa.join('').includes('s'))).toHaveLength(1);
  });

  it('abóboras quebram na primeira explosão (sem quadro kanban)', () => {
    const w = night(1);
    const g = w.grid;
    const i = g.tiles.findIndex((t) => t === TILE.Box);
    const x = i % g.w;
    const y = Math.floor(i / g.w);
    expect(w.destroyBlock(x, y, 0)).toBe(true);
    expect(g.get(x, y)).toBe(TILE.Floor);
  });
});

describe('Modo Zumbi · ajudantes e chefão', () => {
  it('o chefão só aparece quando a cota inteira de ajudantes cai, e a noite termina com ele', () => {
    const w = night(1);
    const h = w.horde!;
    expect(h.quota).toBe(5);
    expect(w.boss).toBeNull();
    expect(w.helpersAlive()).toBe(3);
    let t = 0;
    while (!w.boss && t < 120) {
      expect(h.spawned).toBeLessThanOrEqual(h.quota);
      for (const e of w.enemies) if (e.helper) w.killEnemy(e, 0);
      for (const p of w.players) p.invuln = 5;
      w.update(1 / 60, idle());
      t += 1 / 60;
    }
    expect(w.boss?.def.id).toBe('lobisomem');
    expect(h.spawned).toBe(5);
    expect(w.helpersDown()).toBe(5);
    expect(w.outcome).toBeNull(); // sem inimigos, mas o chefão está vivo

    const b = w.boss!;
    while (!b.dead) {
      b.hitCd = 0;
      w.hitBoss(0);
    }
    w.update(1 / 60, idle());
    expect(w.outcome).toBe('cleared');
  });

  it('noite vencida leva à próxima; a 5ª termina o modo', () => {
    const s: Session = { mode: 'zombie', players: TWO, stage: 0, arena: 0, client: 0 };
    const w = night(1);
    w.outcome = 'cleared';
    const r = advance(s, w);
    expect('next' in r && r.next.stage).toBe(1);
    const r5 = advance({ ...s, stage: 4 }, w);
    expect('results' in r5 && r5.results.title).toBe('AMANHECEU!');
    w.outcome = 'gameover';
    const lost = advance(s, w);
    expect('results' in lost && [lost.results.title, lost.results.good]).toEqual(['NOITE PERDIDA', false]);
  });
});

describe('Modo Zumbi · mordida', () => {
  const map = ['#######', '#1...2#', '#######'];

  it('quem é mordido vira zumbi por 6 s: fica lento e não solta bombas', () => {
    const w = small(map);
    const p = w.players[0];
    p.invuln = 0;
    spawnEnemy(w, 'zombie', 1, 1);
    w.update(1 / 60, idle());
    expect(p.zombie).toBeGreaterThan(BITE_TIME - 0.1);
    w.pressBomb(p);
    expect(w.bombs).toHaveLength(0);
  });

  it('um colega cura passando por cima', () => {
    const w = small(map);
    const [p, q] = w.players;
    p.zombie = BITE_TIME;
    q.x = p.x;
    q.y = p.y;
    w.update(1 / 60, idle());
    expect(p.zombie).toBe(0);
    expect(q.score).toBeGreaterThanOrEqual(100);
  });

  it('Água benta bloqueia 1 mordida e some do HUD', () => {
    const w = small(map);
    const p = w.players[0];
    p.invuln = 0;
    applyItem(w, p, 'ab');
    expect(p.items).toContain('ab');
    expect(w.bite(p)).toBe(false);
    expect(p.zombie).toBe(0);
    expect(p.items).not.toContain('ab');
    p.touchCd = 0;
    expect(w.bite(p)).toBe(true);
  });

  it('fantasma não morde: o susto congela', () => {
    const w = small(map);
    const p = w.players[0];
    p.invuln = 0;
    spawnEnemy(w, 'ghost', 1, 1);
    w.update(1 / 60, idle());
    expect(p.zombie).toBe(0);
    expect(p.frozen).toBeGreaterThan(1.9);
  });
});

describe('Modo Zumbi · inimigos, itens e mecânicas', () => {
  it('zumbi de escritório precisa de 2 explosões', () => {
    const w = small(['#######', '#1...2#', '#######']);
    const e = spawnEnemy(w, 'office', 3, 1);
    w.damageEnemy(e, 0);
    expect(e.dead).toBe(false);
    w.damageEnemy(e, 0); // a mesma explosão não conta duas vezes
    expect(e.hp).toBe(1);
    e.hitCd = 0;
    w.damageEnemy(e, 0);
    expect(e.dead).toBe(true);
  });

  it('Bala de prata: a próxima bomba tira 2 do chefão', () => {
    const w = new World({ ...worldConfig({ mode: 'zombie', players: TWO, stage: 0, arena: 0, client: 0 }), mode: 'story', bossId: 'lobisomem', seed: 4 });
    const p = w.players[0];
    applyItem(w, p, 'bp');
    w.pressBomb(p);
    expect(w.bombs[0].silver).toBe(true);
    expect(p.silver).toBe(false);
    expect(p.items).not.toContain('bp');
    const b = w.boss!;
    w.blast(b.x, b.y, 1, p.slot, false, true);
    w.update(1 / 60, idle());
    expect(b.hp).toBe(b.maxHp - 2);
  });

  it('Doce: velocidade +2 por 8 s', () => {
    const w = small(['#######', '#1...2#', '#######']);
    const p = w.players[0];
    const base = p.stats.speed;
    applyItem(w, p, 'dc');
    expect(p.candy).toBe(8);
    expect(p.stats.speed).toBe(base); // não mexe no atributo salvo
  });

  it('areia deixa o jogador lento', () => {
    const run = (map: string[]) => {
      const w = small(map, { players: [{ slot: 0, role: 'DEV', variant: 0 }] });
      w.players[0].x = 2; // começa num tile de areia (o spawn nunca tem)
      for (let i = 0; i < 20; i++) w.update(1 / 60, [{ dx: 1, dy: 0, bomb: false, special: false }]);
      return w.players[0].x - 2;
    };
    const plain = run(['##########', '#1.......#', '##########']);
    const sand = run(['##########', '#1sssssss#', '##########']);
    expect(sand / plain).toBeCloseTo(0.6, 2);
  });

  it('noite 1: a lua cheia deixa os zumbis 50% mais rápidos', () => {
    const w = night(1);
    w.moonAcc = 29.99;
    for (const p of w.players) p.invuln = 5;
    w.update(1 / 60, idle());
    expect(w.moonT).toBeGreaterThan(9.9);
    w.update(1 / 60, idle());
    for (const e of w.enemies) if (!e.frozen && !e.stunned) expect(e.speed).toBeCloseTo(enemyById(e.type).speed * MOON_BOOST);
  });

  it('noite 5: escuro, fantasmas só perto de luz; a Lanterna ilumina tudo', () => {
    const w = night(5, [{ slot: 0, role: 'DEV', variant: 0 }]);
    expect(w.darkness()).toBeGreaterThan(0);
    expect(w.visibility(1, 1)).toBe(1);
    expect(w.visibility(13, 9)).toBe(0);
    applyItem(w, w.players[0], 'lt');
    expect(w.darkness()).toBe(0);
    expect(w.visibility(13, 9)).toBe(1);
  });

  it('noites sem escuro deixam tudo visível', () => {
    expect(night(1).visibility(13, 9)).toBe(1);
  });
});
