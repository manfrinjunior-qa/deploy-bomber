import { roleById, specialById } from '../core/data';
import type { Dir, RoleId } from '../core/types';

export interface Player {
  slot: number; // 0..3 (P1..P4)
  role: RoleId;
  variant: number;
  x: number; // posição em tiles (centro do tile = inteiro)
  y: number;
  spawn: { x: number; y: number };
  facing: Dir;
  moving: boolean;
  alive: boolean;
  lives: number;
  score: number;
  stats: { speed: number; range: number; bombs: number };
  items: string[]; // itens coletados (HUD)
  // efeitos permanentes
  shield: number;
  kick: boolean;
  remote: boolean;
  go: boolean;
  followUp: boolean;
  discount: boolean;
  bugs: number;
  // timers (s)
  invuln: number;
  coffee: number;
  invert: number;
  frozen: number;
  stunned: number;
  codeReview: number;
  copilot: number;
  hallucinate: boolean;
  budgetCut: number;
  touchCd: number; // imunidade curta a reuniões / merge conflicts
  specialCd: number;
  specialMax: number;
  anim: number;
}

/** Dados que atravessam arenas no Modo História / Desafio. */
export type PlayerCarry = Pick<
  Player,
  'slot' | 'lives' | 'score' | 'stats' | 'items' | 'shield' | 'kick' | 'remote' | 'go' | 'followUp' | 'bugs' | 'alive'
>;

export function createPlayer(slot: number, role: RoleId, variant: number, spawn: { x: number; y: number }, lives: number): Player {
  const def = roleById(role);
  return {
    slot,
    role,
    variant,
    x: spawn.x,
    y: spawn.y,
    spawn: { ...spawn },
    facing: { x: 0, y: 1 },
    moving: false,
    alive: true,
    lives,
    score: 0,
    stats: { speed: def.speed, range: def.range, bombs: def.bombs },
    items: [],
    shield: 0,
    kick: false,
    remote: false,
    go: false,
    followUp: false,
    discount: false,
    bugs: 0,
    invuln: 1.5,
    coffee: 0,
    invert: 0,
    frozen: 0,
    stunned: 0,
    codeReview: 0,
    copilot: 0,
    hallucinate: false,
    budgetCut: 0,
    touchCd: 0,
    specialCd: 0,
    specialMax: specialById(def.especialId).recarga,
    anim: 0,
  };
}

export function carryOf(p: Player): PlayerCarry {
  return {
    slot: p.slot,
    lives: p.lives,
    score: p.score,
    stats: { ...p.stats },
    items: [...p.items],
    shield: p.shield,
    kick: p.kick,
    remote: p.remote,
    go: p.go,
    followUp: p.followUp,
    bugs: p.bugs,
    alive: p.alive,
  };
}

/** Velocidade em tiles/s a partir do atributo (1–8). */
export const speedOf = (p: Player) => 2.2 + 0.45 * p.stats.speed;
