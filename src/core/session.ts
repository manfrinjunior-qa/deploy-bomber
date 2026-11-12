import { CLIENT_ARENAS, CLIENT_ORDER, CLIENT_THEMES, STAGES, bossById } from './data';
import type { GameMode, PlayerSetup } from './types';
import type { PlayerCarry } from '../entities/Player';
import type { World, WorldConfig } from '../systems/world';
import { carryOf } from '../entities/Player';
import { save } from './save';

/** Estado de uma partida que atravessa arenas (Modo História / Desafio do Cliente). */
export interface Session {
  mode: GameMode;
  players: PlayerSetup[];
  stage: number; // índice 0..4
  arena: number; // 0..2 arenas, 3 = chefão
  client: number; // 0..3 (Desafio do Cliente)
  carry?: PlayerCarry[];
}

export interface ResultsData {
  mode: GameMode;
  title: string;
  subtitle: string;
  players: { slot: number; role: string; variant: number; score: number; alive: boolean }[];
  winner: number;
}

export const LIVES = 3;

export function worldConfig(s: Session): WorldConfig {
  if (s.mode === 'client') {
    const a = CLIENT_ARENAS[s.client];
    const boss = bossById(CLIENT_ORDER[s.client]);
    return {
      mode: 'client',
      map: a.mapa,
      theme: CLIENT_THEMES[boss.theme ?? 'meeting'],
      stageId: 0,
      stageName: 'Desafio do Cliente',
      arenaLabel: `${boss.arena} · Chefão ${s.client + 1}/4`,
      enemyTypes: [],
      enemyCount: 0,
      bossId: boss.id,
      players: s.players,
      carry: s.carry,
      lives: LIVES,
    };
  }
  const st = STAGES[s.stage];
  if (s.mode === 'battle') {
    const arena = st.arenas[Math.floor(Math.random() * st.arenas.length)];
    return {
      mode: 'battle',
      map: arena.mapa,
      theme: st.theme,
      stageId: st.id,
      stageName: st.name,
      arenaLabel: `Batalha · ${st.name}`,
      enemyTypes: [],
      enemyCount: 0,
      players: s.players,
      lives: LIVES,
    };
  }
  const boss = s.arena === 3;
  const arena = boss ? st.bossArena : st.arenas[s.arena];
  return {
    mode: 'story',
    map: arena.mapa,
    theme: st.theme,
    stageId: st.id,
    stageName: st.name,
    arenaLabel: boss ? `${st.name} · Chefão` : `${st.name} · Arena ${s.arena + 1}/3`,
    enemyTypes: boss ? [] : st.inimigos,
    enemyCount: boss ? 0 : (arena.inimigos ?? 4),
    bossId: boss ? st.chefao : undefined,
    players: s.players,
    carry: s.carry,
    lives: LIVES,
  };
}

/** Decide o próximo passo após o fim de uma arena. */
export function advance(s: Session, w: World): { next: Session } | { results: ResultsData } {
  const players = w.players.map((p) => ({ slot: p.slot, role: p.role, variant: p.variant, score: p.score, alive: p.alive }));
  const best = Math.max(0, ...players.map((p) => p.score));
  save.submitScore(best);

  if (s.mode === 'battle') {
    const winner = w.outcome === 'win' ? w.winner : -1;
    return {
      results: {
        mode: 'battle',
        title: winner >= 0 ? `P${winner + 1} VENCEU` : 'EMPATE',
        subtitle: winner >= 0 ? 'último de pé no deploy' : 'todos caíram no mesmo frame',
        players,
        winner,
      },
    };
  }

  const carry = w.players.map(carryOf);
  if (w.outcome === 'gameover') {
    return {
      results: {
        mode: s.mode,
        title: 'SPRINT FALHOU',
        subtitle: s.mode === 'client' ? `o cliente ${bossById(CLIENT_ORDER[s.client]).name} venceu` : `${STAGES[s.stage].name} · ${s.arena === 3 ? 'chefão' : `arena ${s.arena + 1}`}`,
        players,
        winner: -1,
      },
    };
  }

  if (s.mode === 'client') {
    if (s.client >= 3) {
      save.data.clientCleared = true;
      save.write();
      return { results: { mode: 'client', title: 'CLIENTE SATISFEITO', subtitle: 'as 4 versões do Cliente foram atendidas', players, winner: -1 } };
    }
    return { next: { ...s, client: s.client + 1, carry } };
  }

  // história
  if (s.arena < 3) return { next: { ...s, arena: s.arena + 1, carry } };
  save.unlock(s.stage + 2);
  save.data.bestStage = Math.max(save.data.bestStage, s.stage + 1);
  save.write();
  if (s.stage >= STAGES.length - 1)
    return { results: { mode: 'story', title: 'DEPLOY ENTREGUE', subtitle: 'sobreviveram à sexta-feira!', players, winner: -1 } };
  return { next: { ...s, stage: s.stage + 1, arena: 0, carry } };
}
