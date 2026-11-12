import { roleById, specialById } from '../core/data';
import type { Player } from '../entities/Player';
import { TILE } from './grid';
import type { World } from './world';

/** FR-007: habilidade especial de cada papel, com recarga. */
export function useSpecial(w: World, p: Player) {
  if (p.specialCd > 0) return;
  const role = roleById(p.role);
  const sp = specialById(role.especialId);
  const ok = HANDLERS[sp.id]?.(w, p, sp.alcance, sp.duracao ?? 2) ?? false;
  if (ok) {
    p.specialCd = sp.recarga;
    w.events.push('special');
  } else {
    w.events.push('deny');
    w.sayP(p, `${sp.name.toUpperCase()} sem efeito`, DENY[sp.id] ?? '');
  }
}

const DENY: Record<string, string> = {
  refatorar: 'nenhum bloco à frente',
  repriorizar: 'nenhuma bomba no seu tile ou ao lado',
  pitch: 'nenhum item num raio de 3 tiles',
};

type Handler = (w: World, p: Player, range: number, duration: number) => boolean;

const HANDLERS: Record<string, Handler> = {
  /** DEV — destrói o bloco à frente sem bomba. */
  refatorar(w, p) {
    const x = Math.round(p.x) + p.facing.x;
    const y = Math.round(p.y) + p.facing.y;
    const t = w.grid.get(x, y);
    if (t !== TILE.Box && t !== TILE.Postit) return false;
    w.destroyBlock(x, y, p.slot);
    if (t === TILE.Box) p.score += 100;
    w.sayP(p, 'usou REFATORAR', 'bloco removido sem bomba');
    w.fx({ kind: 'ring', x, y, total: 0.4, color: roleById(p.role).color });
    return true;
  },

  /** QA — congela o primeiro inimigo/rival/chefão em linha reta. */
  reportarBug(w, p, range, duration) {
    let x = Math.round(p.x);
    let y = Math.round(p.y);
    const tiles: { x: number; y: number }[] = [];
    for (let i = 0; i < range; i++) {
      x += p.facing.x;
      y += p.facing.y;
      const t = w.grid.get(x, y);
      if (t !== TILE.Floor) break;
      tiles.push({ x, y });
      const at = (o: { x: number; y: number }) => Math.abs(o.x - x) < 0.6 && Math.abs(o.y - y) < 0.6;
      const enemy = w.enemies.find(at);
      if (enemy) {
        enemy.frozen = duration;
        w.sayP(p, 'usou REPORTAR BUG', 'inimigo congelado');
        break;
      }
      if (w.boss && !w.boss.dead && at(w.boss)) {
        w.boss.frozen = duration;
        w.sayP(p, 'usou REPORTAR BUG', `${w.boss.def.name} congelado`);
        break;
      }
      const rival = w.players.find((o) => o !== p && o.alive && at(o));
      if (rival && w.cfg.mode === 'battle') {
        rival.frozen = duration;
        w.sayP(p, 'usou REPORTAR BUG', `${roleById(rival.role).name} congelado`);
        break;
      }
    }
    w.fx({ kind: 'beam', x: p.x, y: p.y, tiles, total: 0.35, color: '#5eead4' });
    return true;
  },

  /** PO — desarma uma bomba adjacente (inclusive de rivais). */
  repriorizar(w, p) {
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    const near = w.bombs.filter((b) => Math.abs(b.x - px) + Math.abs(b.y - py) <= 1);
    if (!near.length) return false;
    near.sort((a, b) => a.timer - b.timer);
    const b = near[0];
    w.bombs.splice(w.bombs.indexOf(b), 1);
    w.sayP(p, 'usou REPRIORIZAR', 'bomba desarmada');
    w.fx({ kind: 'ring', x: b.x, y: b.y, total: 0.5, color: roleById(p.role).color });
    return true;
  },

  /** Comercial — puxa os itens num raio de 3 tiles. */
  pitch(w, p, range) {
    const got = w.items.filter((it) => Math.hypot(it.x - p.x, it.y - p.y) <= range + 0.01);
    w.fx({ kind: 'ring', x: p.x, y: p.y, total: 0.6, color: roleById(p.role).color });
    if (!got.length) return false;
    w.sayP(p, 'fez um PITCH DE VENDAS', `${got.length} ite${got.length > 1 ? 'ns' : 'm'} puxado${got.length > 1 ? 's' : ''}`);
    for (const it of got) w.collect(p, it);
    return true;
  },
};
