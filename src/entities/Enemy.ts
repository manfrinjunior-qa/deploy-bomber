import type { BossDef, Dir, EnemyType } from '../core/types';

/** Movimento de tile em tile, comum a inimigos e chefões. */
export interface Mover {
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: Dir;
  speed: number;
}

export interface Enemy extends Mover {
  id: number;
  type: EnemyType;
  hp: number;
  frozen: number;
  stunned: number;
  age: number;
  dead: boolean;
  anim: number;
}

export interface Boss extends Mover {
  def: BossDef;
  hp: number;
  maxHp: number;
  hitCd: number;
  frozen: number;
  timers: number[];
  dead: boolean;
  anim: number;
  lastAttack: string;
  lastAttackT: number;
}
