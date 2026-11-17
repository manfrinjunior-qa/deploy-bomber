import { enemyById, roleById } from '../core/data';
import { pick, shuffle } from '../core/rng';
import type { BossAttack, Dir, EnemyDef, EnemyType } from '../core/types';
import type { Boss, Enemy, Mover } from '../entities/Enemy';
import { TILE } from './grid';
import { DIRS4, MOON_BOOST, SAND_SLOW, type World } from './world';

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
    hitCd: 0,
    helper: false,
    dash: 0,
    kickCd: 2,
    dragCd: 4 + w.rng() * 4,
  };
  w.enemies.push(e);
  return e;
}

/** Voadores (morcego, fantasmas) passam por cima de abóboras e bombas, mas não de lápides. */
function enterFor(w: World, def: EnemyDef) {
  if (!def.fly) return (x: number, y: number) => w.walkable(x, y);
  return (x: number, y: number) => {
    const t = w.grid.get(x, y);
    return t !== TILE.Wall && t !== TILE.Deadline;
  };
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
  const born: Enemy[] = [];
  for (const e of w.enemies) {
    e.frozen = Math.max(0, e.frozen - dt);
    e.stunned = Math.max(0, e.stunned - dt);
    e.hitCd = Math.max(0, e.hitCd - dt);
    const still = e.frozen > 0 || e.stunned > 0 || w.enemyFreeze > 0;
    if (still) continue;
    e.anim += dt;
    const def = enemyById(e.type);
    const canEnter = enterFor(w, def);

    // velocidade: lua cheia (zumbis), areia (quem anda no chão), rasante (morcego)
    let mul = 1;
    if (def.zombie && w.moonT > 0) mul *= MOON_BOOST;
    if (!def.fly && w.grid.isSand(Math.round(e.x), Math.round(e.y))) mul *= SAND_SLOW;
    if (def.swoop) updateSwoop(w, e, dt);
    if (e.dash > 0) mul *= 2.4;
    e.speed = def.speed * mul;

    const chase = def.ia === 'chase' ? (def.chase ?? 0.5) : 0;
    stepMover(e, dt, canEnter, () => {
      if (e.dash > 0) {
        const fwd = DIRS4.find((d) => d.x === e.dir.x && d.y === e.dir.y)!;
        const cx = Math.round(e.x);
        const cy = Math.round(e.y);
        if (canEnter(cx + fwd.x, cy + fwd.y)) return fwd;
        e.dash = 0;
      }
      return chooseDir(w, e, canEnter, chase);
    });
    if (def.poltergeist) updatePoltergeist(w, e, dt);

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
      } else if (def.touch === 'bite') {
        w.bite(p);
      } else if (def.touch === 'scare') {
        // fantasmas não mordem: o susto congela
        if (p.touchCd <= 0 && p.coffee <= 0 && p.invuln <= 0) {
          p.frozen = def.freeze ?? 2;
          p.touchCd = (def.freeze ?? 2) + 1.5;
          w.sayP(p, `levou um SUSTO`, `${def.name.toLowerCase()} · congelado por ${def.freeze ?? 2} s`);
          w.fx({ kind: 'ring', x: p.x, y: p.y, total: 0.5, color: '#e9d5ff' });
          w.events.push('freeze');
        }
      }
    }
  }
  w.enemies.push(...born);
}

/** Morcego: quando um jogador fica na mesma linha ou coluna, dá um rasante em linha reta. */
function updateSwoop(w: World, e: Enemy, dt: number) {
  if (e.dash > 0) {
    e.dash = Math.max(0, e.dash - dt);
    return;
  }
  e.age += dt;
  if (e.age < 3.5) return;
  const cx = Math.round(e.x);
  const cy = Math.round(e.y);
  if (cx !== e.x || cy !== e.y) return; // só decide no centro do tile
  for (const p of w.players) {
    if (!p.alive) continue;
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    const dist = Math.abs(px - cx) + Math.abs(py - cy);
    if ((px !== cx && py !== cy) || dist > 6 || dist === 0) continue;
    e.dir = { x: Math.sign(px - cx), y: Math.sign(py - cy) };
    e.tx = cx;
    e.ty = cy;
    e.dash = 1.2;
    e.age = 0;
    return;
  }
}

/** Poltergeist: chuta de volta as bombas que encosta e, de tempos em tempos, arrasta uma abóbora. */
function updatePoltergeist(w: World, e: Enemy, dt: number) {
  e.kickCd = Math.max(0, e.kickCd - dt);
  e.dragCd = Math.max(0, e.dragCd - dt);
  const cx = Math.round(e.x);
  const cy = Math.round(e.y);
  if (e.kickCd <= 0) {
    for (const d of DIRS4) {
      const b = w.bombAt(cx + d.x, cy + d.y);
      if (!b || b.slide) continue;
      b.slide = { ...d };
      b.slideProg = 0;
      e.kickCd = 2.5;
      w.events.push('kick');
      w.fx({ kind: 'ring', x: b.x, y: b.y, total: 0.4, color: '#c4b5fd' });
      break;
    }
  }
  if (e.dragCd <= 0) {
    const g = w.grid;
    const free = (x: number, y: number) =>
      g.isFloor(x, y) &&
      !w.bombAt(x, y) &&
      !w.items.some((it) => it.x === x && it.y === y) &&
      !w.players.some((p) => p.alive && Math.round(p.x) === x && Math.round(p.y) === y) &&
      !w.enemies.some((o) => !enemyById(o.type).fly && Math.round(o.x) === x && Math.round(o.y) === y) &&
      !(w.boss && !w.boss.dead && Math.round(w.boss.x) === x && Math.round(w.boss.y) === y);
    for (const d of shuffle(w.rng, [...DIRS4])) {
      const bx = cx + d.x;
      const by = cy + d.y;
      if (g.get(bx, by) !== TILE.Box || !free(bx + d.x, by + d.y)) continue;
      const from = g.idx(bx, by);
      const to = g.idx(bx + d.x, by + d.y);
      g.set(bx + d.x, by + d.y, TILE.Box);
      g.label[to] = g.label[from];
      g.hasDrop[to] = g.hasDrop[from];
      g.timer[to] = g.timer[from];
      g.set(bx, by, TILE.Floor);
      g.hasDrop[from] = 0;
      g.timer[from] = 0;
      e.dragCd = 7;
      w.fx({ kind: 'puff', x: bx + d.x, y: by + d.y, total: 0.4, color: '#a78bfa' });
      return;
    }
    e.dragCd = 2;
  }
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

  // Investida: espera o aviso explodir e aparece no fim da linha
  if (b.pending) {
    b.pending.t -= dt;
    if (b.pending.t <= 0) {
      const s = w.walkable(b.pending.x, b.pending.y) ? b.pending : w.nearestFree(b.pending.x, b.pending.y);
      b.x = b.tx = s.x;
      b.y = b.ty = s.y;
      b.pending = null;
    }
  } else {
    b.dash = Math.max(0, b.dash - dt);
    b.speed = b.def.speed * (b.dash > 0 ? 2.2 : 1);
    const canEnter = (x: number, y: number) => w.walkable(x, y);
    stepMover(b, dt, canEnter, () => chooseDir(w, b, canEnter, b.dash > 0 ? 1 : 0.45));
  }

  b.def.attacks.forEach((a, i) => {
    b.timers[i] -= dt;
    if (b.timers[i] <= 0 && !b.pending) {
      b.timers[i] = a.interval;
      doAttack(w, b, a);
    }
  });

  for (const p of w.players) {
    if (!p.alive || Math.abs(p.x - b.x) >= 0.8 || Math.abs(p.y - b.y) >= 0.8) continue;
    const before = p.lives;
    w.hurt(p, -1);
    // Mordida do Vampiro: rouba a vida perdida
    if (b.dash > 0 && p.lives < before) {
      b.dash = 0;
      b.hp = Math.min(b.maxHp, b.hp + 1);
      w.say(b.def.name.toUpperCase(), BOSS_COLOR, 'roubou 1 vida', `de ${roleById(p.role).name} · resistência ${b.hp}/${b.maxHp}`);
    }
  }
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
      say(`${roleById(p.role).name} ${a.msg ?? 'ficou preso no e-mail'}`);
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
        g.label[i] = w.newBoxLabel();
        g.hasDrop[i] = w.rng() < 0.3 ? 1 : 0;
      }
      say(a.msg ?? 'novos blocos de dívida técnica');
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

    // ───────── chefões do Modo Zumbi
    case 'charge': {
      // Investida: corre em linha reta na direção do jogador mais próximo, derrubando blocos
      const alive = w.players.filter((p) => p.alive);
      if (!alive.length) break;
      const t = alive.reduce((m, q) => (Math.hypot(q.x - b.x, q.y - b.y) < Math.hypot(m.x - b.x, m.y - b.y) ? q : m));
      const ddx = t.x - bx;
      const ddy = t.y - by;
      const prefer: Dir[] = Math.abs(ddx) >= Math.abs(ddy)
        ? [{ x: Math.sign(ddx) || 1, y: 0 }, { x: 0, y: Math.sign(ddy) || 1 }]
        : [{ x: 0, y: Math.sign(ddy) || 1 }, { x: Math.sign(ddx) || 1, y: 0 }];
      const line = (d: Dir) => {
        const out: { x: number; y: number }[] = [];
        for (let i = 1; i < 15; i++) {
          const x = bx + d.x * i;
          const y = by + d.y * i;
          const k = g.get(x, y);
          if (k === TILE.Wall || k === TILE.Deadline) break;
          out.push({ x, y });
        }
        return out;
      };
      const d = [...prefer, ...DIRS4].find((dd) => line(dd).length > 0);
      if (!d) break;
      const tiles = line(d);
      const delay = a.delay ?? 0.9;
      for (const c of tiles) w.markers.push({ x: c.x, y: c.y, t: delay, total: delay, range: 0, owner: -1, kind: 'blast' });
      const end = tiles[tiles.length - 1];
      // chega depois que as chamas do próprio aviso apagam (FLAME_TIME = 0,5 s)
      b.pending = { x: end.x, y: end.y, t: delay + 0.55 };
      b.dir = d;
      say('vai atravessar o mapa em linha reta');
      break;
    }
    case 'stunAll': {
      let n = 0;
      for (const p of w.players)
        if (p.alive && p.coffee <= 0) {
          p.stunned = a.duration ?? 1.5;
          n++;
        }
      w.fx({ kind: 'ring', x: b.x, y: b.y, total: 0.8, color: '#fbbf24' });
      w.events.push('howl');
      say(n ? `todos atordoados por ${a.duration ?? 1.5} s` : 'ninguém se abalou');
      break;
    }
    case 'stomp': {
      // Pisão: o mapa treme e as bombas são empurradas para longe do chefão
      let n = 0;
      for (const bomb of w.bombs) {
        if (bomb.slide) continue;
        const ddx = bomb.x - bx;
        const ddy = bomb.y - by;
        if (!ddx && !ddy) continue;
        bomb.slide = Math.abs(ddx) >= Math.abs(ddy) ? { x: Math.sign(ddx), y: 0 } : { x: 0, y: Math.sign(ddy) };
        bomb.slideProg = 0;
        n++;
      }
      w.events.push('stomp');
      say(n ? `${n} bomba${n > 1 ? 's' : ''} empurrada${n > 1 ? 's' : ''}` : 'o chão tremeu');
      break;
    }
    case 'sandstorm': {
      w.sandT = Math.max(w.sandT, a.duration ?? 5);
      say(`o mapa sumiu por ${a.duration ?? 5} s`);
      break;
    }
    case 'hexBombs': {
      // Feitiço: bombas próximas viram morcegos
      const near = w.bombs.filter((bomb) => Math.hypot(bomb.x - b.x, bomb.y - b.y) <= 4);
      for (const bomb of near) {
        w.bombs.splice(w.bombs.indexOf(bomb), 1);
        if (w.enemies.length < MAX_ENEMIES) spawnEnemy(w, 'bat', bomb.x, bomb.y);
        w.fx({ kind: 'puff', x: bomb.x, y: bomb.y, total: 0.5, color: '#a855f7' });
      }
      const n = near.length;
      say(n ? (n > 1 ? `${n} bombas viraram morcegos` : '1 bomba virou morcego') : 'nenhuma bomba por perto');
      break;
    }
    case 'teleport': {
      // Revoada: vira morcego e reaparece no canto mais longe do time
      const tiles = w.floorTiles((x, y) => !w.bombAt(x, y));
      const alive = w.players.filter((p) => p.alive);
      if (!tiles.length || !alive.length) break;
      const far = tiles.reduce((m, t) => {
        const dt = Math.min(...alive.map((p) => Math.hypot(p.x - t.x, p.y - t.y)));
        const dm = Math.min(...alive.map((p) => Math.hypot(p.x - m.x, p.y - m.y)));
        return dt > dm ? t : m;
      });
      w.fx({ kind: 'puff', x: b.x, y: b.y, total: 0.6, color: '#7c3aed' });
      b.x = b.tx = far.x;
      b.y = b.ty = far.y;
      w.fx({ kind: 'puff', x: b.x, y: b.y, total: 0.6, color: '#7c3aed' });
      say('reapareceu em outro canto');
      break;
    }
    case 'drain': {
      b.dash = a.duration ?? 3;
      say('vai atrás de quem estiver mais perto');
      break;
    }
  }
}
