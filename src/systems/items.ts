import { MAX_STAT, itemById, roleById } from '../core/data';
import type { Player } from '../entities/Player';
import { TILE } from './grid';
import type { World } from './world';

/** Itens com efeito permanente ficam listados no HUD; os temporários aparecem pelos timers. */
const PERMANENT_FLAGS = new Set(['shield', 'kick', 'remote', 'go', 'followUp', 'discount', 'bug', 'holy', 'silver']);

export function applyItem(w: World, p: Player, id: string) {
  const def = itemById(id);
  const e = def.effect;
  p.score += 50;
  if (e.stat) {
    p.stats[e.stat] = Math.min(MAX_STAT, p.stats[e.stat] + (e.add ?? 1));
    p.items.push(id);
    w.sayP(p, `coletou ${def.name.toUpperCase()}`, def.desc.toLowerCase());
    return;
  }
  if (e.flag && PERMANENT_FLAGS.has(e.flag)) p.items.push(id);
  switch (e.flag) {
    case 'shield':
      p.shield++;
      break;
    case 'kick':
      p.kick = true;
      break;
    case 'remote':
      p.remote = true;
      for (const b of w.bombs) if (b.owner === p.slot) b.remote = true;
      break;
    case 'go':
      p.go = true;
      break;
    case 'followUp':
      p.followUp = true;
      break;
    case 'discount':
      p.discount = true;
      break;
    case 'bug':
      captureBug(w, p);
      return;
    case 'roadmap':
      w.revealT = e.duration ?? 5;
      break;
    case 'postit':
      placePostit(w, p, e.duration ?? 6);
      break;
    case 'align':
      align(w, p, e.duration ?? 1.5);
      break;
    case 'coffee':
      p.coffee = e.duration ?? 5;
      break;
    case 'codeReview':
      p.codeReview = e.duration ?? 8;
      break;
    case 'invert':
      p.invert = e.duration ?? 8;
      w.sayP(p, 'pegou BUG CRÍTICO', 'controles invertidos por 8 s');
      return;
    case 'copilot':
      p.copilot = e.duration ?? 10;
      p.hallucinate = w.rng() < 0.2;
      break;
    // itens da noite (Modo Zumbi)
    case 'candy':
      p.candy = e.duration ?? 8;
      break;
    case 'lantern':
      w.lanternT = Math.max(w.lanternT, e.duration ?? 10);
      break;
    case 'holy':
      p.holy++;
      break;
    case 'silver':
      p.silver = true;
      break;
  }
  w.sayP(p, `coletou ${def.name.toUpperCase()}`, def.desc.toLowerCase());
}

/** QA: a cada 3 bugs capturados, gera um Relatório que congela todos os inimigos por 3 s. */
export function captureBug(w: World, p: Player) {
  p.bugs++;
  if (p.bugs >= 3) {
    p.bugs = 0;
    for (let k = 0; k < 3; k++) {
      const i = p.items.lastIndexOf('bug');
      if (i >= 0) p.items.splice(i, 1);
    }
    w.enemyFreeze = 3;
    if (w.boss) w.boss.frozen = 3;
    if (w.cfg.mode === 'battle') for (const o of w.players) if (o !== p && o.alive) o.frozen = 3;
    w.sayP(p, 'gerou um RELATÓRIO', 'inimigos congelados por 3 s');
    w.events.push('freeze');
    return;
  }
  const n = String(Math.floor(w.rng() * 900) + 100).padStart(3, '0');
  w.sayP(p, `capturou BUG #${n}`, `${p.bugs}/3 p/ relatório`);
}

function placePostit(w: World, p: Player, duration: number) {
  const px = Math.round(p.x);
  const py = Math.round(p.y);
  const order = [
    { x: -p.facing.x, y: -p.facing.y },
    { x: p.facing.y, y: p.facing.x },
    { x: -p.facing.y, y: -p.facing.x },
    { x: p.facing.x, y: p.facing.y },
  ];
  for (const d of order) {
    const x = px + d.x;
    const y = py + d.y;
    const occupied =
      w.players.some((o) => o.alive && Math.round(o.x) === x && Math.round(o.y) === y) ||
      w.enemies.some((e) => Math.round(e.x) === x && Math.round(e.y) === y) ||
      w.items.some((it) => it.x === x && it.y === y);
    if (w.walkable(x, y) && !occupied) {
      w.grid.set(x, y, TILE.Postit);
      w.grid.timer[w.grid.idx(x, y)] = duration;
      return;
    }
  }
}

function align(w: World, p: Player, duration: number) {
  const near = (o: { x: number; y: number }) => Math.hypot(o.x - p.x, o.y - p.y) <= 1.6;
  for (const e of w.enemies) if (near(e)) e.stunned = duration;
  for (const o of w.players) if (o !== p && o.alive && w.cfg.mode === 'battle' && near(o)) o.stunned = duration;
  w.fx({ kind: 'ring', x: p.x, y: p.y, total: 0.5, color: roleById(p.role).color });
}

/** Desconto: o jogador perde 1 item aleatório. Retorna o nome do item perdido. */
export function revertItem(w: World, p: Player): string | null {
  if (!p.items.length) return null;
  const idx = Math.floor(w.rng() * p.items.length);
  const id = p.items.splice(idx, 1)[0];
  const def = itemById(id);
  const e = def.effect;
  const base = roleById(p.role);
  if (e.stat) p.stats[e.stat] = Math.max(base[e.stat], p.stats[e.stat] - (e.add ?? 1));
  const has = (...ids: string[]) => p.items.some((i) => ids.includes(i));
  switch (e.flag) {
    case 'shield':
      p.shield = Math.max(0, p.shield - 1);
      break;
    case 'kick':
      p.kick = has('pm');
      break;
    case 'remote':
      p.remote = has('c', 'se');
      break;
    case 'go':
      p.go = has('go');
      break;
    case 'followUp':
      p.followUp = has('fu');
      break;
    case 'discount':
      p.discount = false;
      break;
    case 'bug':
      p.bugs = Math.max(0, p.bugs - 1);
      break;
    case 'holy':
      p.holy = Math.max(0, p.holy - 1);
      break;
    case 'silver':
      p.silver = has('bp');
      break;
  }
  return def.name;
}

/** Remove do HUD um item consumido (Água benta usada, Bala de prata disparada). */
export function consumeItem(p: Player, id: string) {
  const i = p.items.lastIndexOf(id);
  if (i >= 0) p.items.splice(i, 1);
}
