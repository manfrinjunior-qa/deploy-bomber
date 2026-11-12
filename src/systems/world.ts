import { ARENA_TIME, BOMB_TIMER, FLAME_TIME, bossById, enemyById, roleById } from '../core/data';
import { makeRng, shuffle, pick, type Rng } from '../core/rng';
import type { Dir, EnemyType, GameMode, PlayerInput, PlayerSetup, Theme } from '../core/types';
import { EMPTY_INPUT } from '../core/types';
import type { Bomb, Flame, Marker } from '../entities/Bomb';
import type { Boss, Enemy } from '../entities/Enemy';
import type { FloorItem } from '../entities/Item';
import { createPlayer, speedOf, type Player, type PlayerCarry } from '../entities/Player';
import { computeBlast, type FlameDir } from './explosions';
import { rollDrop } from './drops';
import { Grid, TILE } from './grid';
import { applyItem, revertItem } from './items';
import { useSpecial } from './specials';
import { spawnEnemy, updateBoss, updateEnemies } from './ai';

export interface WorldConfig {
  mode: GameMode;
  map: string[];
  theme: Theme;
  stageId: number; // 1..5 (0 = Desafio do Cliente)
  stageName: string;
  arenaLabel: string;
  enemyTypes: EnemyType[];
  enemyCount: number;
  bossId?: string;
  players: PlayerSetup[];
  carry?: PlayerCarry[];
  lives: number;
  seed?: number;
}

export interface LogEntry {
  who: string;
  color: string;
  text: string;
  sub: string;
}

export interface Effect {
  kind: 'beam' | 'text' | 'puff' | 'ring';
  x: number;
  y: number;
  t: number;
  total: number;
  color: string;
  text?: string;
  tiles?: { x: number; y: number }[];
}

export type Outcome = null | 'cleared' | 'gameover' | 'win' | 'draw';

export const DIRS4: Dir[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const SYS_COLOR = '#22c55e';
const BOSS_COLOR = '#f43f5e';

export class World {
  readonly cfg: WorldConfig;
  readonly rng: Rng;
  readonly grid: Grid;
  players: Player[] = [];
  bombs: Bomb[] = [];
  flames: Flame[] = [];
  items: FloorItem[] = [];
  enemies: Enemy[] = [];
  boss: Boss | null = null;
  markers: Marker[] = [];
  effects: Effect[] = [];
  log: LogEntry[] = [];
  events: string[] = [];

  time = ARENA_TIME;
  elapsed = 0;
  rushT = 0; // relógio 2× (MVP pra ontem)
  revealT = 0; // Roadmap
  enemyFreeze = 0; // Relatório de bugs
  deadline: { order: { x: number; y: number }[]; idx: number; acc: number } | null = null;
  fireAcc = 0;
  outcome: Outcome = null;
  outcomeT = 0;
  winner = -1;
  private nextId = 1;

  constructor(cfg: WorldConfig) {
    this.cfg = cfg;
    this.rng = makeRng(cfg.seed ?? Math.floor(Math.random() * 1e9));
    this.grid = Grid.fromMap(cfg.map, this.rng);

    for (const s of cfg.players) {
      const p = createPlayer(s.slot, s.role, s.variant, this.grid.spawns[s.slot], cfg.lives);
      const c = cfg.carry?.find((k) => k.slot === s.slot);
      if (c) {
        p.lives = c.alive ? c.lives : 1; // no cooperativo, quem caiu volta com 1 vida
        p.score = c.score;
        p.stats = { ...c.stats };
        p.items = [...c.items];
        p.shield = c.shield;
        p.kick = c.kick;
        p.remote = c.remote;
        p.go = c.go;
        p.followUp = c.followUp;
        p.bugs = c.bugs;
      }
      this.players.push(p);
    }

    if (cfg.mode !== 'battle') this.spawnInitialEnemies(cfg.enemyCount, cfg.enemyTypes);
    if (cfg.bossId) this.spawnBoss(cfg.bossId);
    this.say('SISTEMA', SYS_COLOR, cfg.arenaLabel.toUpperCase(), cfg.mode === 'battle' ? 'último de pé vence' : 'sprint iniciada');
  }

  // ───────────────────────────── helpers
  id() {
    return this.nextId++;
  }
  playerBySlot(slot: number) {
    return this.players.find((p) => p.slot === slot);
  }
  bombAt(x: number, y: number) {
    return this.bombs.find((b) => b.x === x && b.y === y);
  }
  say(who: string, color: string, text: string, sub = '') {
    this.log.unshift({ who, color, text, sub });
    if (this.log.length > 7) this.log.length = 7;
  }
  sayP(p: Player, text: string, sub = '') {
    const r = roleById(p.role);
    this.say(r.name, r.color, text, sub);
  }
  fx(e: Omit<Effect, 't'> & { t?: number }) {
    this.effects.push({ ...e, t: e.t ?? e.total });
  }
  bombCap(p: Player) {
    return Math.max(1, p.stats.bombs - (p.budgetCut > 0 ? 1 : 0));
  }
  /** Tile livre para entidades andarem (sem bloco e sem bomba). */
  walkable(x: number, y: number) {
    return this.grid.isFloor(x, y) && !this.bombAt(x, y);
  }

  /** BFS até o tile de piso livre mais próximo. */
  nearestFree(x: number, y: number, ok: (x: number, y: number) => boolean = (a, b) => this.walkable(a, b)) {
    const seen = new Set<number>();
    const q: [number, number][] = [[x, y]];
    seen.add(y * this.grid.w + x);
    while (q.length) {
      const [cx, cy] = q.shift()!;
      if (this.grid.inside(cx, cy) && ok(cx, cy)) return { x: cx, y: cy };
      for (const d of DIRS4) {
        const nx = cx + d.x;
        const ny = cy + d.y;
        if (!this.grid.inside(nx, ny)) continue;
        const k = ny * this.grid.w + nx;
        if (seen.has(k)) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    return { x, y };
  }

  floorTiles(filter: (x: number, y: number) => boolean = () => true) {
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < this.grid.h; y++)
      for (let x = 0; x < this.grid.w; x++) if (this.grid.isFloor(x, y) && filter(x, y)) out.push({ x, y });
    return out;
  }

  private spawnInitialEnemies(count: number, types: EnemyType[]) {
    if (!types.length || count <= 0) return;
    const far = this.floorTiles((x, y) => this.grid.spawns.every((s) => Math.abs(s.x - x) + Math.abs(s.y - y) >= 6));
    shuffle(this.rng, far);
    for (let i = 0; i < count && i < far.length; i++) spawnEnemy(this, pick(this.rng, types), far[i].x, far[i].y);
  }

  private spawnBoss(id: string) {
    const def = bossById(id);
    const c = this.nearestFree(7, 5);
    this.boss = {
      def,
      x: c.x,
      y: c.y,
      tx: c.x,
      ty: c.y,
      dir: { x: 0, y: 1 },
      speed: def.speed,
      hp: def.resistencia,
      maxHp: def.resistencia,
      hitCd: 0,
      frozen: 0,
      timers: def.attacks.map((a, i) => a.interval * (0.55 + 0.25 * i)),
      dead: false,
      anim: 0,
      lastAttack: '',
      lastAttackT: 0,
    };
    this.say('CHEFÃO', BOSS_COLOR, def.name.toUpperCase(), `resistência ${def.resistencia}`);
  }

  // ───────────────────────────── loop
  update(dt: number, inputs: PlayerInput[]) {
    dt = Math.min(dt, 0.05);
    this.elapsed += dt;
    for (const e of this.effects) e.t -= dt;
    this.effects = this.effects.filter((e) => e.t > 0);
    if (this.outcome) {
      this.outcomeT += dt;
      this.updateFlames(dt, false);
      return;
    }
    this.updateClock(dt);
    for (const p of this.players) this.updatePlayer(p, inputs[p.slot] ?? EMPTY_INPUT, dt);
    this.updateBombs(dt);
    this.updateMarkers(dt);
    this.updateFlames(dt, true);
    updateEnemies(this, dt);
    updateBoss(this, dt);
    this.updatePickups(dt);
    this.updateTiles(dt);
    this.updateDeadline(dt);
    this.checkOutcome();
  }

  private updateClock(dt: number) {
    let mul = 1;
    if (this.rushT > 0) {
      mul *= 2;
      this.rushT -= dt;
    }
    if (this.cfg.stageId === 5 && this.time <= 60) mul *= 2; // Deploy de Sexta
    this.time = Math.max(0, this.time - dt * mul);
    this.revealT = Math.max(0, this.revealT - dt);
    this.enemyFreeze = Math.max(0, this.enemyFreeze - dt);
    if (this.time <= 0 && !this.deadline) this.startDeadline();
  }

  // ───────────────────────────── jogadores
  private updatePlayer(p: Player, input: PlayerInput, dt: number) {
    if (!p.alive) return;
    const dec = (k: 'invuln' | 'coffee' | 'invert' | 'frozen' | 'stunned' | 'codeReview' | 'copilot' | 'budgetCut' | 'touchCd' | 'specialCd') =>
      (p[k] = Math.max(0, p[k] - dt));
    dec('invuln'); dec('coffee'); dec('invert'); dec('frozen'); dec('stunned'); dec('codeReview');
    dec('copilot'); dec('budgetCut'); dec('touchCd'); dec('specialCd');
    p.moving = false;
    if (p.frozen > 0 || p.stunned > 0) return;

    let dx = Math.sign(input.dx);
    let dy = Math.sign(input.dy);
    if (p.invert > 0) {
      dx = -dx;
      dy = -dy;
    }
    if (dx || dy) {
      const dist = speedOf(p) * dt;
      const h = () => dx !== 0 && this.tryMove(p, dx, 0, dist, dy);
      const v = () => dy !== 0 && this.tryMove(p, 0, dy, dist, dx);
      let moved: boolean;
      // duas direções: a mais recente manda; se estiver bloqueada, usa a outra (faz a curva)
      if (dx && dy) moved = input.prefer === 'v' ? v() || h() : h() || v();
      else moved = h() || v();
      if (!moved) p.facing = dx ? { x: dx, y: 0 } : { x: 0, y: dy };
      p.moving = moved;
      if (moved) p.anim += dt;
    }
    if (input.bomb) this.pressBomb(p);
    if (input.special) useSpecial(this, p);
  }

  /** Movimento em grade com "assistência de quina" (alinha ao corredor automaticamente). */
  private tryMove(p: Player, dx: number, dy: number, dist: number, side = 0): boolean {
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    const horizontal = dx !== 0;
    const along = horizontal ? p.x : p.y;
    const cross = horizontal ? p.y : p.x;
    const cAlong = horizontal ? cx : cy;
    const cCross = horizontal ? cy : cx;
    const d = horizontal ? dx : dy;
    const at = (a: number, c: number) => (horizontal ? { x: a, y: c } : { x: c, y: a });
    const open = (a: number, c: number) => {
      const t = at(a, c);
      return this.walkable(t.x, t.y);
    };
    const setCross = (v: number) => (horizontal ? (p.y = v) : (p.x = v));
    const setAlong = (v: number) => (horizontal ? (p.x = v) : (p.y = v));

    const off = cCross - cross;
    if (Math.abs(off) > 0.02) {
      const s = Math.min(dist, Math.abs(off));
      if (open(cAlong + d, cCross)) {
        setCross(cross + Math.sign(off) * s);
        p.facing = { x: dx, y: dy };
        return true;
      }
      const other = cCross - Math.sign(off);
      // só desliza para o outro corredor se não for contra a direção perpendicular segurada
      if ((side === 0 || Math.sign(other - cross) === side) && open(cAlong + d, other) && open(cAlong, other)) {
        setCross(cross - Math.sign(off) * Math.min(dist, 1 - Math.abs(off)));
        p.facing = { x: dx, y: dy };
        return true;
      }
      return false;
    }
    setCross(cCross);
    const next = along + d * dist;
    if (open(cAlong + d, cCross)) {
      setAlong(next);
      p.facing = { x: dx, y: dy };
      return true;
    }
    // bloqueado: ainda pode andar até o centro do tile atual
    if ((cAlong - along) * d > 0.001) {
      setAlong(d > 0 ? Math.min(next, cAlong) : Math.max(next, cAlong));
      p.facing = { x: dx, y: dy };
      return true;
    }
    // Postman: chuta a bomba
    const t = at(cAlong + d, cCross);
    const b = this.bombAt(t.x, t.y);
    if (b && p.kick && !b.slide) {
      b.slide = { x: dx, y: dy };
      b.slideProg = 0;
      this.events.push('kick');
    }
    p.facing = { x: dx, y: dy };
    return false;
  }

  pressBomb(p: Player) {
    const tx = Math.round(p.x);
    const ty = Math.round(p.y);
    const own = this.bombs.filter((b) => b.owner === p.slot);
    const cap = this.bombCap(p);
    if (this.grid.isFloor(tx, ty) && !this.bombAt(tx, ty) && own.length < cap) {
      this.placeBomb(p, tx, ty);
      if (p.go && own.length + 1 < cap) {
        const gx = tx + p.facing.x;
        const gy = ty + p.facing.y;
        if (this.walkable(gx, gy) && !this.enemies.some((e) => Math.round(e.x) === gx && Math.round(e.y) === gy)) this.placeBomb(p, gx, gy);
      }
      return;
    }
    // C / Selenium: sem espaço para bomba nova → detona a mais antiga
    if (p.remote && own.length) {
      own.sort((a, b) => a.id - b.id);
      this.explode(own[0]);
    }
  }

  placeBomb(p: Player, x: number, y: number) {
    this.bombs.push({
      id: this.id(),
      owner: p.slot,
      x,
      y,
      range: p.stats.range,
      timer: p.remote ? 12 : BOMB_TIMER,
      remote: p.remote,
      slide: null,
      slideProg: 0,
      followUp: p.followUp,
      discount: p.discount,
      coin: false,
    });
    p.discount = false;
    this.events.push('bomb');
  }

  hurt(p: Player, source: number, discount = false, force = false) {
    if (!p.alive) return;
    if (!force && (p.invuln > 0 || p.coffee > 0)) return;
    if (discount && source >= 0 && source !== p.slot && p.items.length) {
      const lost = revertItem(this, p);
      if (lost) this.sayP(p, 'recebeu DESCONTO', `perdeu ${lost}`);
    }
    if (p.shield > 0 && !force) {
      p.shield--;
      const i = p.items.findLastIndex((id) => id === 'rs' || id === 'ct');
      if (i >= 0) p.items.splice(i, 1);
      p.invuln = 1.5;
      this.sayP(p, 'escudo absorveu a explosão', 'memory safe');
      this.fx({ kind: 'ring', x: p.x, y: p.y, total: 0.6, color: '#e2e8f0' });
      return;
    }
    p.lives--;
    p.invuln = 2.5;
    this.events.push('hurt');
    if (this.cfg.mode === 'battle' && source >= 0 && source !== p.slot) {
      const k = this.playerBySlot(source);
      if (k) k.score += 300;
    }
    if (p.lives <= 0) {
      p.alive = false;
      this.sayP(p, 'saiu da sprint', 'sem vidas');
      this.fx({ kind: 'puff', x: p.x, y: p.y, total: 0.8, color: roleById(p.role).color });
    } else this.sayP(p, 'perdeu uma vida', `${p.lives} restante${p.lives > 1 ? 's' : ''}`);
  }

  // ───────────────────────────── bombas e explosões
  private updateBombs(dt: number) {
    for (const b of [...this.bombs]) {
      if (!this.bombs.includes(b)) continue;
      if (b.slide) {
        const nx = b.x + b.slide.x;
        const ny = b.y + b.slide.y;
        if (!this.bombCanEnter(nx, ny)) {
          b.slide = null;
          b.slideProg = 0;
        } else {
          b.slideProg += 9 * dt;
          if (b.slideProg >= 1) {
            b.x = nx;
            b.y = ny;
            b.slideProg -= 1;
          }
        }
      }
      b.timer -= dt;
      if (b.timer <= 0) this.explode(b);
    }
  }

  private bombCanEnter(x: number, y: number) {
    if (!this.walkable(x, y)) return false;
    const near = (o: { x: number; y: number }) => Math.abs(o.x - x) < 0.7 && Math.abs(o.y - y) < 0.7;
    if (this.players.some((p) => p.alive && near(p))) return false;
    if (this.enemies.some(near)) return false;
    if (this.boss && !this.boss.dead && near(this.boss)) return false;
    return true;
  }

  explode(b: Bomb) {
    const i = this.bombs.indexOf(b);
    if (i < 0) return;
    this.bombs.splice(i, 1);
    this.blast(b.x, b.y, b.range, b.owner, b.discount);
    if (b.followUp) this.markers.push({ x: b.x, y: b.y, t: 1, total: 1, range: b.range, owner: b.owner, kind: 'followUp' });
  }

  blast(x: number, y: number, range: number, owner: number, discount = false) {
    const res = computeBlast(this.grid, x, y, range, (tx, ty) => !!this.bombAt(tx, ty));
    const hit = new Set(res.tiles.map((t) => t.y * this.grid.w + t.x));
    for (const t of res.tiles) this.addFlame(t.x, t.y, t.dir, owner, discount);
    this.items = this.items.filter((it) => !(hit.has(it.y * this.grid.w + it.x) && it.age > 0.3));
    for (const bb of res.bombs) {
      const other = this.bombAt(bb.x, bb.y);
      if (other) other.timer = Math.min(other.timer, 0.08); // FR-004: cadeia
    }
    let boxes = 0;
    for (const bx of res.boxes) if (this.destroyBlock(bx.x, bx.y, owner)) boxes++;
    const p = owner >= 0 ? this.playerBySlot(owner) : undefined;
    if (p && boxes) {
      p.score += 100 * boxes;
      if (boxes >= 3) this.sayP(p, `explodiu ${boxes} tickets`, `+${100 * boxes}`);
    }
    this.events.push('boom');
  }

  /** Destrói caixa/post-it. Retorna true se era caixa. O drop usa a tabela do dono (FR-005). */
  destroyBlock(x: number, y: number, owner: number): boolean {
    const t = this.grid.get(x, y);
    const i = this.grid.idx(x, y);
    if (t === TILE.Postit) {
      this.grid.set(x, y, TILE.Floor);
      this.grid.timer[i] = 0;
      return false;
    }
    if (t !== TILE.Box) return false;
    this.grid.set(x, y, TILE.Floor);
    this.grid.timer[i] = 0;
    this.fx({ kind: 'puff', x, y, total: 0.35, color: '#c8925a' });
    if (this.grid.hasDrop[i]) {
      this.grid.hasDrop[i] = 0;
      const role = owner >= 0 ? (this.playerBySlot(owner)?.role ?? null) : null;
      this.items.push({ id: this.id(), itemId: rollDrop(role, this.rng), x, y, age: 0 });
    }
    return true;
  }

  private addFlame(x: number, y: number, dir: FlameDir, owner: number, discount: boolean) {
    const f = this.flames.find((q) => q.x === x && q.y === y);
    if (f) {
      f.t = FLAME_TIME;
      if (f.dir !== dir) f.dir = 'c';
      f.owner = owner;
      f.discount = f.discount || discount;
    } else this.flames.push({ x, y, dir, t: FLAME_TIME, owner, discount });
  }

  private updateFlames(dt: number, damage: boolean) {
    for (const f of this.flames) f.t -= dt;
    this.flames = this.flames.filter((f) => f.t > 0);
    if (!damage) return;
    for (const f of this.flames) {
      for (const p of this.players) if (p.alive && Math.abs(p.x - f.x) < 0.55 && Math.abs(p.y - f.y) < 0.55) this.hurt(p, f.owner, f.discount);
      for (const e of this.enemies) if (!e.dead && Math.abs(e.x - f.x) < 0.6 && Math.abs(e.y - f.y) < 0.6) this.killEnemy(e, f.owner);
      const b = this.boss;
      if (b && !b.dead && Math.abs(b.x - f.x) < 0.8 && Math.abs(b.y - f.y) < 0.8) this.hitBoss(f.owner);
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  private updateMarkers(dt: number) {
    for (const m of this.markers) m.t -= dt;
    const done = this.markers.filter((m) => m.t <= 0);
    this.markers = this.markers.filter((m) => m.t > 0);
    for (const m of done) {
      if (this.grid.get(m.x, m.y) === TILE.Wall || this.grid.get(m.x, m.y) === TILE.Deadline) continue;
      if (this.grid.get(m.x, m.y) !== TILE.Floor) this.destroyBlock(m.x, m.y, m.owner);
      this.blast(m.x, m.y, m.range, m.owner);
    }
  }

  killEnemy(e: Enemy, owner: number) {
    if (e.dead) return;
    e.dead = true;
    const def = enemyById(e.type);
    const p = owner >= 0 ? this.playerBySlot(owner) : undefined;
    if (p) p.score += def.score;
    this.fx({ kind: 'text', x: e.x, y: e.y, total: 0.9, color: '#fde047', text: `+${def.score}` });
    this.fx({ kind: 'puff', x: e.x, y: e.y, total: 0.4, color: '#f43f5e' });
    this.events.push('kill');
  }

  hitBoss(owner: number) {
    const b = this.boss;
    if (!b || b.dead || b.hitCd > 0) return;
    b.hp--;
    b.hitCd = 1.0;
    const p = owner >= 0 ? this.playerBySlot(owner) : undefined;
    if (p) p.score += 250;
    this.events.push('bossHit');
    this.fx({ kind: 'text', x: b.x, y: b.y - 0.8, total: 0.9, color: '#f43f5e', text: `-1` });
    if (b.hp <= 0) {
      b.dead = true;
      if (p) p.score += 2000;
      for (const e of this.enemies) e.dead = true;
      this.enemies = [];
      this.say('CHEFÃO', BOSS_COLOR, `${b.def.name.toUpperCase()} derrotado`, p ? `golpe final: ${roleById(p.role).name} +2000` : 'entregue!');
      this.fx({ kind: 'puff', x: b.x, y: b.y, total: 1.2, color: '#fde047' });
    } else if (p) this.sayP(p, `acertou ${b.def.name}`, `resistência ${b.hp}/${b.maxHp}`);
  }

  // ───────────────────────────── itens
  private updatePickups(dt: number) {
    for (const it of this.items) it.age += dt;
    for (const p of this.players) {
      if (!p.alive) continue;
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      const got = this.items.filter((it) => it.x === px && it.y === py);
      for (const it of got) this.collect(p, it);
    }
  }

  collect(p: Player, it: FloorItem) {
    const i = this.items.indexOf(it);
    if (i < 0) return;
    this.items.splice(i, 1);
    applyItem(this, p, it.itemId); // FR-006: vale para quem pegou
    this.events.push('pickup');
  }

  // ───────────────────────────── tiles: post-it, fogo (fase 5)
  private updateTiles(dt: number) {
    const g = this.grid;
    const burning: { x: number; y: number }[] = [];
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const i = g.idx(x, y);
        const t = g.tiles[i];
        if (t === TILE.Postit) {
          g.timer[i] -= dt;
          if (g.timer[i] <= 0) g.set(x, y, TILE.Floor);
        } else if (t === TILE.Box && g.timer[i] > 0) {
          g.timer[i] -= dt;
          if (g.timer[i] <= 0) burning.push({ x, y });
        }
      }
    for (const b of burning) {
      this.destroyBlock(b.x, b.y, -1);
      this.blast(b.x, b.y, 1, -1);
    }
    if (this.cfg.stageId === 5 && this.cfg.mode !== 'client') {
      this.fireAcc += dt;
      const every = this.time <= 60 ? 2.5 : 5.5;
      if (this.fireAcc >= every) {
        this.fireAcc = 0;
        const boxes: { x: number; y: number }[] = [];
        for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y) === TILE.Box && g.timer[g.idx(x, y)] <= 0) boxes.push({ x, y });
        if (boxes.length) {
          const b = pick(this.rng, boxes);
          g.timer[g.idx(b.x, b.y)] = 2.5;
          g.version++;
        }
      }
    }
  }

  // ───────────────────────────── deadline
  private startDeadline() {
    const order: { x: number; y: number }[] = [];
    let x0 = 1, y0 = 1, x1 = this.grid.w - 2, y1 = this.grid.h - 2;
    while (x0 <= x1 && y0 <= y1) {
      for (let x = x0; x <= x1; x++) order.push({ x, y: y0 });
      for (let y = y0 + 1; y <= y1; y++) order.push({ x: x1, y });
      if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) order.push({ x, y: y1 });
      if (x1 > x0) for (let y = y1 - 1; y > y0; y--) order.push({ x: x0, y });
      x0++; y0++; x1--; y1--;
    }
    this.deadline = { order: order.filter((t) => this.grid.get(t.x, t.y) !== TILE.Wall), idx: 0, acc: 0 };
    this.say('SISTEMA', SYS_COLOR, 'DEADLINE!', 'a arena está fechando');
    this.events.push('deadline');
  }

  private updateDeadline(dt: number) {
    const d = this.deadline;
    if (!d) return;
    d.acc += dt;
    while (d.acc >= 0.22 && d.idx < d.order.length) {
      d.acc -= 0.22;
      const { x, y } = d.order[d.idx++];
      this.grid.set(x, y, TILE.Deadline);
      this.bombs = this.bombs.filter((b) => !(b.x === x && b.y === y));
      this.items = this.items.filter((it) => !(it.x === x && it.y === y));
      for (const e of this.enemies) if (Math.round(e.x) === x && Math.round(e.y) === y) e.dead = true;
      this.enemies = this.enemies.filter((e) => !e.dead);
      for (const p of this.players) {
        if (p.alive && Math.round(p.x) === x && Math.round(p.y) === y) {
          this.hurt(p, -1, false, true);
          const s = this.nearestFree(x, y);
          p.x = s.x;
          p.y = s.y;
        }
      }
      const b = this.boss;
      if (b && !b.dead && Math.round(b.x) === x && Math.round(b.y) === y) {
        const s = this.nearestFree(x, y);
        b.x = b.tx = s.x;
        b.y = b.ty = s.y;
      }
    }
  }

  private checkOutcome() {
    const alive = this.players.filter((p) => p.alive);
    if (this.cfg.mode === 'battle') {
      if (this.players.length >= 2 && alive.length <= 1) {
        // FR-010: empate se todos caem no mesmo frame
        this.outcome = alive.length === 1 ? 'win' : 'draw';
        this.winner = alive[0]?.slot ?? -1;
        if (alive[0]) {
          alive[0].score += 1000;
          this.sayP(alive[0], 'venceu a batalha', '+1000');
        } else this.say('SISTEMA', SYS_COLOR, 'EMPATE', 'todos caíram juntos');
        this.events.push('end');
      }
      return;
    }
    if (!alive.length) {
      this.outcome = 'gameover';
      this.say('SISTEMA', SYS_COLOR, 'SPRINT FALHOU', 'todos caíram');
      this.events.push('end');
      return;
    }
    if (this.enemies.length === 0 && (!this.boss || this.boss.dead)) {
      this.outcome = 'cleared';
      const bonus = Math.floor(this.time) * 5;
      for (const p of alive) p.score += bonus;
      this.say('SISTEMA', SYS_COLOR, 'ARENA LIMPA', `bônus de tempo +${bonus}`);
      this.events.push('end');
    }
  }

  // ───────────────────────────── Copiloto IA
  /** Tiles que serão atingidos por bombas, chamas ou avisos. */
  dangerTiles(): Set<number> {
    const set = new Set<number>();
    const w = this.grid.w;
    for (const b of this.bombs)
      for (const t of computeBlast(this.grid, b.x, b.y, b.range, (x, y) => !!this.bombAt(x, y)).tiles) set.add(t.y * w + t.x);
    for (const f of this.flames) set.add(f.y * w + f.x);
    for (const m of this.markers)
      for (const t of computeBlast(this.grid, m.x, m.y, m.range).tiles) set.add(t.y * w + t.x);
    return set;
  }

  /** Rota até o tile seguro mais próximo. Com `hallucinate`, aponta para um tile perigoso. */
  copilotRoute(p: Player, danger: Set<number>): { x: number; y: number }[] {
    const w = this.grid.w;
    const sx = Math.round(p.x);
    const sy = Math.round(p.y);
    const prev = new Map<number, number>();
    const start = sy * w + sx;
    prev.set(start, -1);
    const q = [start];
    let goal = -1;
    const wantDanger = p.hallucinate;
    if (!danger.has(start) && !wantDanger) return [];
    while (q.length) {
      const k = q.shift()!;
      const isDanger = danger.has(k);
      if (k !== start && (wantDanger ? isDanger : !isDanger)) {
        goal = k;
        break;
      }
      const x = k % w;
      const y = Math.floor(k / w);
      for (const d of DIRS4) {
        const nx = x + d.x;
        const ny = y + d.y;
        const nk = ny * w + nx;
        if (prev.has(nk) || !this.walkable(nx, ny)) continue;
        prev.set(nk, k);
        q.push(nk);
      }
    }
    if (goal < 0) return [];
    const path: { x: number; y: number }[] = [];
    for (let k = goal; k !== -1 && k !== start; k = prev.get(k)!) path.unshift({ x: k % w, y: Math.floor(k / w) });
    return path;
  }
}
