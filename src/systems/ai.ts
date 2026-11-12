import { enemyById, roleById } from '../core/data';
import { pick, shuffle } from '../core/rng';
import type { BossAttack, Dir, EnemyType } from '../core/types';
import type { Boss, Enemy, Mover } from '../entities/Enemy';
import { TILE } from './grid';
import { DIRS4, type World } from './world';

const MAX_ENEMIES = 16;
const BOSS_COLOR = '#f43f5e';
const SYS_COLOR = '#22c55e';

export function spawnEnemy(w: World, type: EnemyType, x: number, y: number): Enemy {
  const def = enemyById(type);
  const e: Enemy = {
    id: w.id(),
    type,
    x,
    y,
    tx: x,
    ty: y,
    dir: pick(w.rng, DIRS4),
    speed: def.speed,
    hp: def.vida,
    frozen: 0,
    stunned: 0,
    age: 0,
    dead: false,
    anim: w.rng() * 2,
  };
  w.enemies.push(e);
  return e;
}

/** Anda de tile em tile; `choose` decide a direção ao chegar no centro de um tile. */
function stepMover(m: Mover, dt: number, canEnter: (x: number, y: number) => boolean, choose: () => Dir | null) {
  // o alvo foi bloqueado no caminho (bomba nova, bloco)? volta.
  if ((m.tx !== Math.round(m.x) || m.ty !== Math.round(m.y)) && !canEnter(m.tx, m.ty)) {
    m.tx -= m.dir.x;
    m.ty -= m.dir.y;
    m.dir = { x: -m.dir.x, y: -m.dir.y };
  }
  let dist = m.speed * dt;
  let guard = 4;
  while (dist > 1e-6 && guard-- > 0) {
    const ddx = m.tx - m.x;
    const ddy = m.ty - m.y;
    const d = Math.abs(ddx) + Math.abs(ddy);
    if (d <= 1e-6) {
      m.x = m.tx;
      m.y = m.ty;
      const nd = choose();
      if (!nd) return;
      m.dir = nd;
      m.tx = m.x + nd.x;
      m.ty = m.y + nd.y;
      continue;
    }
    const s = Math.min(dist, d);
    m.x += Math.sign(ddx) * s;
    m.y += Math.sign(ddy) * s;
    dist -= s;
    if (s >= d) {
      m.x = m.tx;
      m.y = m.ty;
    }
  }
}

function chooseDir(w: World, m: Mover, canEnter: (x: number, y: number) => boolean, chase: number): Dir | null {
  const cx = Math.round(m.x);
  const cy = Math.round(m.y);
  const opts = DIRS4.filter((d) => canEnter(cx + d.x, cy + d.y));
  if (!opts.length) return null;
  if (chase > 0 && w.rng() < chase) {
    const targets = w.players.filter((p) => p.alive);
    if (targets.length) {
      const t = targets.reduce((a, b) => (Math.hypot(a.x - cx, a.y - cy) < Math.hypot(b.x - cx, b.y - cy) ? a : b));
      return opts.reduce((a, b) =>
        Math.hypot(t.x - (cx + a.x), t.y - (cy + a.y)) <= Math.hypot(t.x - (cx + b.x), t.y - (cy + b.y)) ? a : b,
      );
    }
  }
  const fwd = opts.find((d) => d.x === m.dir.x && d.y === m.dir.y);
  if (fwd && w.rng() < 0.7) return fwd;
  const nonBack = opts.filter((d) => !(d.x === -m.dir.x && d.y === -m.dir.y));
  return pick(w.rng, nonBack.length ? nonBack : opts);
}

export function updateEnemies(w: World, dt: number) {
  const canEnter = (x: number, y: number) => w.walkable(x, y);
  const born: Enemy[] = [];
  for (const e of w.enemies) {
    e.frozen = Math.max(0, e.frozen - dt);
    e.stunned = Math.max(0, e.stunned - dt);
    const still = e.frozen > 0 || e.stunned > 0 || w.enemyFreeze > 0;
    if (still) continue;
    e.anim += dt;
    const def = enemyById(e.type);
    stepMover(e, dt, canEnter, () => chooseDir(w, e, canEnter, def.ia === 'chase' ? 0.5 : 0));

    // Memory Leak: divide em dois se não for destruído em 10 s
    if (def.splitAfter) {
      e.age += dt;
      if (e.age >= def.splitAfter && w.enemies.length + born.length < MAX_ENEMIES) {
        e.age = 0;
        const c = spawnEnemyDetached(w, e.type, Math.round(e.x), Math.round(e.y));
        born.push(c);
        w.say('SISTEMA', SYS_COLOR, 'MEMORY LEAK', 'se dividiu em dois');
      }
    }

    // contato com jogadores
    for (const p of w.players) {
      if (!p.alive || Math.abs(p.x - e.x) > 0.7 || Math.abs(p.y - e.y) > 0.7) continue;
      if (def.touch === 'damage') w.hurt(p, -1);
      else if (def.touch === 'freeze') {
        if (p.touchCd <= 0 && p.coffee <= 0) {
          p.frozen = def.freeze ?? 2;
          p.touchCd = (def.freeze ?? 2) + 1.5;
          w.sayP(p, 'foi puxado para uma REUNIÃO', `parado por ${def.freeze ?? 2} s`);
          w.events.push('freeze');
        }
      } else if (def.touch === 'swap') {
        if (p.touchCd <= 0 && p.coffee <= 0) {
          const s = w.nearestFree(w.grid.w - 1 - Math.round(p.x), Math.round(p.y));
          p.x = s.x;
          p.y = s.y;
          p.touchCd = 2.5;
          w.sayP(p, 'caiu num MERGE CONFLICT', 'foi parar do outro lado');
          w.fx({ kind: 'ring', x: p.x, y: p.y, total: 0.5, color: '#3b82f6' });
          w.events.push('swap');
        }
      }
    }
  }
  w.enemies.push(...born);
}

function spawnEnemyDetached(w: World, type: EnemyType, x: number, y: number): Enemy {
  const e = spawnEnemy(w, type, x, y);
  w.enemies.pop();
  return e;
}

// ───────────────────────────── chefões
export function updateBoss(w: World, dt: number) {
  const b = w.boss;
  if (!b || b.dead) return;
  b.hitCd = Math.max(0, b.hitCd - dt);
  b.frozen = Math.max(0, b.frozen - dt);
  b.lastAttackT = Math.max(0, b.lastAttackT - dt);
  if (b.frozen > 0 || w.enemyFreeze > 0) return;
  b.anim += dt;
  const canEnter = (x: number, y: number) => w.walkable(x, y);
  stepMover(b, dt, canEnter, () => chooseDir(w, b, canEnter, 0.45));

  b.def.attacks.forEach((a, i) => {
    b.timers[i] -= dt;
    if (b.timers[i] <= 0) {
      b.timers[i] = a.interval;
      doAttack(w, b, a);
    }
  });

  for (const p of w.players) if (p.alive && Math.abs(p.x - b.x) < 0.8 && Math.abs(p.y - b.y) < 0.8) w.hurt(p, -1);
}

function freeTilesAwayFromPlayers(w: World, minDist: number) {
  return w.floorTiles(
    (x, y) =>
      !w.bombAt(x, y) &&
      w.players.every((p) => !p.alive || Math.hypot(p.x - x, p.y - y) >= minDist) &&
      !w.enemies.some((e) => Math.round(e.x) === x && Math.round(e.y) === y) &&
      !(w.boss && Math.round(w.boss.x) === x && Math.round(w.boss.y) === y) &&
      !w.items.some((it) => it.x === x && it.y === y),
  );
}

/** Todos os jogadores vivos alcançam o chefão andando/explodindo caixas? */
function connected(w: World): boolean {
  const g = w.grid;
  const b = w.boss;
  const alive = w.players.filter((p) => p.alive);
  if (!b || !alive.length) return true;
  const seen = new Set<number>();
  const start = { x: Math.round(b.x), y: Math.round(b.y) };
  const q = [start];
  seen.add(g.idx(start.x, start.y));
  while (q.length) {
    const c = q.shift()!;
    for (const d of DIRS4) {
      const nx = c.x + d.x;
      const ny = c.y + d.y;
      const t = g.get(nx, ny);
      if (t === TILE.Wall || t === TILE.Deadline) continue;
      const k = g.idx(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return alive.every((p) => seen.has(g.idx(Math.round(p.x), Math.round(p.y))));
}

function doAttack(w: World, b: Boss, a: BossAttack) {
  const g = w.grid;
  const bx = Math.round(b.x);
  const by = Math.round(b.y);
  b.lastAttack = a.name;
  b.lastAttackT = 2;
  w.events.push('bossAttack');
  const say = (sub: string) => w.say(b.def.name.toUpperCase(), BOSS_COLOR, a.name, sub);

  switch (a.type) {
    case 'lineBlast': {
      for (const d of DIRS4) {
        for (let i = 1; i < 15; i++) {
          const x = bx + d.x * i;
          const y = by + d.y * i;
          const t = g.get(x, y);
          if (t === TILE.Wall || t === TILE.Deadline) break;
          w.markers.push({ x, y, t: 1.2, total: 1.2, range: 0, owner: -1, kind: 'blast' });
          if (t !== TILE.Floor) break;
        }
      }
      say('linhas em cruz vão explodir');
      break;
    }
    case 'markBlast':
    case 'coinRain': {
      const n = a.tiles ?? 6;
      const tiles = w.floorTiles((x, y) => !w.bombAt(x, y));
      shuffle(w.rng, tiles);
      // metade mira nos jogadores
      const chosen: { x: number; y: number }[] = [];
      for (const p of w.players) if (p.alive && chosen.length < Math.ceil(n / 2)) chosen.push({ x: Math.round(p.x), y: Math.round(p.y) });
      for (const t of tiles) {
        if (chosen.length >= n) break;
        if (!chosen.some((c) => c.x === t.x && c.y === t.y)) chosen.push(t);
      }
      const coin = a.type === 'coinRain';
      for (const c of chosen)
        w.markers.push({ x: c.x, y: c.y, t: a.delay ?? 1.5, total: a.delay ?? 1.5, range: coin ? 1 : 0, owner: -1, kind: coin ? 'coin' : 'blast' });
      say(`${chosen.length} tiles marcados`);
      break;
    }
    case 'spawn': {
      const count = a.count ?? 1;
      const around = w.floorTiles((x, y) => !w.bombAt(x, y) && Math.abs(x - bx) + Math.abs(y - by) <= 3 && (x !== bx || y !== by));
      shuffle(w.rng, around);
      let n = 0;
      for (const t of around) {
        if (n >= count || w.enemies.length >= 10) break;
        if (w.players.some((p) => p.alive && Math.hypot(p.x - t.x, p.y - t.y) < 1.5)) continue;
        spawnEnemy(w, a.enemy ?? 'bug', t.x, t.y);
        n++;
      }
      if (n) say(`invocou ${n} ${enemyById(a.enemy ?? 'bug').name}${n > 1 ? 's' : ''}`);
      break;
    }
    case 'freezeNearest': {
      const alive = w.players.filter((p) => p.alive && p.coffee <= 0);
      if (!alive.length) break;
      const p = alive.reduce((m, q) => (Math.hypot(q.x - b.x, q.y - b.y) < Math.hypot(m.x - b.x, m.y - b.y) ? q : m));
      p.frozen = a.duration ?? 1.5;
      say(`${roleById(p.role).name} ficou preso no e-mail`);
      w.events.push('freeze');
      break;
    }
    case 'swapPlayers': {
      for (const p of w.players) {
        if (!p.alive || p.coffee > 0) continue;
        const s = w.nearestFree(g.w - 1 - Math.round(p.x), Math.round(p.y));
        p.x = s.x;
        p.y = s.y;
        w.fx({ kind: 'ring', x: p.x, y: p.y, total: 0.5, color: '#3b82f6' });
      }
      say('todos trocaram de lado');
      break;
    }
    case 'wallUp': {
      const tiles = freeTilesAwayFromPlayers(w, 2);
      shuffle(w.rng, tiles);
      for (const t of tiles.slice(0, a.tiles ?? 6)) {
        g.set(t.x, t.y, TILE.Box);
        const i = g.idx(t.x, t.y);
        g.label[i] = Math.floor(w.rng() * 3);
        g.hasDrop[i] = w.rng() < 0.3 ? 1 : 0;
      }
      say('novos blocos de dívida técnica');
      break;
    }
    case 'shuffleBoxes': {
      const boxes: { drop: number; label: number }[] = [];
      for (let y = 0; y < g.h; y++)
        for (let x = 0; x < g.w; x++)
          if (g.get(x, y) === TILE.Box) {
            const i = g.idx(x, y);
            boxes.push({ drop: g.hasDrop[i], label: g.label[i] });
            g.set(x, y, TILE.Floor);
            g.hasDrop[i] = 0;
            g.timer[i] = 0;
          }
      const tiles = freeTilesAwayFromPlayers(w, 1.5);
      shuffle(w.rng, tiles);
      boxes.forEach((bx2, k) => {
        const t = tiles[k];
        if (!t) return;
        g.set(t.x, t.y, TILE.Box);
        const i = g.idx(t.x, t.y);
        g.hasDrop[i] = bx2.drop;
        g.label[i] = bx2.label;
      });
      say('os blocos foram embaralhados');
      break;
    }
    case 'invertAll': {
      for (const p of w.players) if (p.alive && p.coffee <= 0) p.invert = a.duration ?? 5;
      say(`controles invertidos por ${a.duration ?? 5} s`);
      break;
    }
    case 'clockRush': {
      w.rushT = a.duration ?? 10;
      say(`relógio 2× por ${a.duration ?? 10} s`);
      break;
    }
    case 'budgetCut': {
      for (const p of w.players) if (p.alive) p.budgetCut = a.duration ?? 8;
      say(`todos perdem 1 bomba por ${a.duration ?? 8} s`);
      break;
    }
    case 'moveRacks': {
      const racks: { x: number; y: number }[] = [];
      for (let y = 1; y < g.h - 1; y++) for (let x = 1; x < g.w - 1; x++) if (g.get(x, y) === TILE.Wall) racks.push({ x, y });
      for (let attempt = 0; attempt < 12; attempt++) {
        for (const r of racks) g.set(r.x, r.y, TILE.Floor);
        const tiles = freeTilesAwayFromPlayers(w, 1.5);
        shuffle(w.rng, tiles);
        const placed = tiles.slice(0, racks.length);
        for (const t of placed) g.set(t.x, t.y, TILE.Wall);
        if (connected(w)) {
          racks.length = 0;
          racks.push(...placed);
          break;
        }
        for (const t of placed) g.set(t.x, t.y, TILE.Floor);
        for (const r of racks) g.set(r.x, r.y, TILE.Wall);
      }
      say('os racks mudaram de lugar');
      break;
    }
    case 'cancelBonus': {
      const n = w.items.length;
      w.items = [];
      say(n ? `${n} ite${n > 1 ? 'ns' : 'm'} sumiram do chão` : 'nada para cancelar');
      break;
    }
  }
}
