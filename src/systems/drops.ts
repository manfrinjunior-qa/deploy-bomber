import { DROP_TABLES, NIGHT_DROPS, ROLE_ORDER } from '../core/data';
import type { DropTable, GameMode, RoleId } from '../core/types';
import { pick, type Rng } from '../core/rng';

/** Sorteio ponderado numa tabela de drop. */
export function rollFromTable(table: DropTable, rng: Rng): string {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [id, w] of table) {
    r -= w;
    if (r < 0) return id;
  }
  return table[table.length - 1][0];
}

/** Tabela usada num modo: no Modo Zumbi, os itens da noite entram para todos os papéis. */
export function dropTableFor(role: RoleId, mode?: GameMode): DropTable {
  return mode === 'zombie' ? [...DROP_TABLES[role], ...NIGHT_DROPS] : DROP_TABLES[role];
}

/**
 * FR-005: o tipo do item é sorteado na hora da explosão, a partir da tabela
 * do papel do dono da bomba. Sem dono (fogo, ataques de chefão) → papel aleatório.
 */
export function rollDrop(ownerRole: RoleId | null, rng: Rng, mode?: GameMode): string {
  const role = ownerRole ?? pick(rng, ROLE_ORDER);
  return rollFromTable(dropTableFor(role, mode), rng);
}
