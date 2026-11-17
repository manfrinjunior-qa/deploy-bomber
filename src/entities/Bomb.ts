import type { Dir } from '../core/types';
import type { FlameDir } from '../systems/explosions';

export interface Bomb {
  id: number;
  owner: number; // slot do dono; -1 = sem dono (moeda, fogo, chefão)
  x: number;
  y: number;
  range: number;
  timer: number;
  remote: boolean; // detonação manual (C / Selenium)
  slide: Dir | null; // chutada (Postman)
  slideProg: number;
  followUp: boolean;
  discount: boolean;
  coin: boolean;
  /** Bala de prata: a explosão tira 2 de resistência do chefão */
  silver: boolean;
}

export interface Flame {
  x: number;
  y: number;
  dir: FlameDir;
  t: number;
  owner: number;
  discount: boolean;
  silver: boolean;
}

/** Aviso no chão: depois de `t` segundos vira explosão (ataques de chefão, follow-up, fogo). */
export interface Marker {
  x: number;
  y: number;
  t: number;
  total: number;
  range: number;
  owner: number;
  kind: 'blast' | 'coin' | 'followUp';
}
