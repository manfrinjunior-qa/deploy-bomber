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
  /** recarga entre golpes: uma explosão só tira 1 de vida (zumbi de escritório tem 2) */
  hitCd: number;
  /** ajudante da noite (conta para a cota do Modo Zumbi) */
  helper: boolean;
  /** rasante do morcego (s restantes) */
  dash: number;
  /** recarga do poltergeist (chutar bomba / arrastar bloco) */
  kickCd: number;
  dragCd: number;
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
  /** Investida: o chefão chega a (x, y) quando o aviso explode */
  pending: { x: number; y: number; t: number } | null;
  /** Mordida do Vampiro: persegue rápido e rouba 1 vida no contato */
  dash: number;
}
