import rolesJson from '../data/roles.json';
import itemsJson from '../data/items.json';
import enemiesJson from '../data/enemies.json';
import bossesJson from '../data/bosses.json';
import s1 from '../data/stages/01-open-space.json';
import s2 from '../data/stages/02-sala-de-reuniao.json';
import s3 from '../data/stages/03-data-center.json';
import s4 from '../data/stages/04-codigo-legado.json';
import s5 from '../data/stages/05-deploy-sexta.json';
import clientArenasJson from '../data/stages/client-arenas.json';
import type { BossDef, DropTable, EnemyDef, EnemyType, ItemDef, RoleDef, RoleId, SpecialDef, StageDef, Theme } from './types';

export const ROLES = rolesJson.roles as RoleDef[];
export const SPECIALS = rolesJson.specials as SpecialDef[];
export const ITEMS = itemsJson.items as ItemDef[];
export const DROP_TABLES = itemsJson.dropTables as Record<RoleId, DropTable>;
export const DROP_CHANCE = itemsJson.dropChance;
export const ENEMIES = enemiesJson.enemies as EnemyDef[];
export const BOSSES = bossesJson.bosses as BossDef[];
export const CLIENT_ORDER = bossesJson.clientOrder as string[];
export const CLIENT_THEMES = bossesJson.themes as Record<string, Theme>;
export const STAGES = [s1, s2, s3, s4, s5] as StageDef[];
export const CLIENT_ARENAS = clientArenasJson.arenas as { boss: string; mapa: string[] }[];

export const ROLE_ORDER: RoleId[] = ['DEV', 'QA', 'PO', 'COM'];

export const roleById = (id: RoleId): RoleDef => ROLES.find((r) => r.id === id)!;
export const specialById = (id: string): SpecialDef => SPECIALS.find((s) => s.id === id)!;
export const itemById = (id: string): ItemDef => ITEMS.find((i) => i.id === id)!;
export const enemyById = (id: EnemyType): EnemyDef => ENEMIES.find((e) => e.id === id)!;
export const bossById = (id: string): BossDef => BOSSES.find((b) => b.id === id)!;

export const MAX_STAT = 8;
export const BOMB_TIMER = 3;
export const FLAME_TIME = 0.5;
export const ARENA_TIME = 180;
export const W = 15;
export const H = 11;
