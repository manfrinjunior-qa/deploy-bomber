// Gera os arquivos src/data/stages/*.json (5 fases × 3 arenas + arena do chefão).
// Os mapas ficam versionados em JSON; rode `npm run gen:stages` só para recriá-los.
// Legenda: '#' rack fixo · 'x' caixa (TODO/FIXME/HACK) · '.' piso · '1'-'4' spawn dos jogadores
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 15, H = 11;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'stages');
mkdirSync(out, { recursive: true });

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const spawns = [[1, 1], [13, 1], [1, 9], [13, 9]];
function isSafe(x, y) {
  return spawns.some(([sx, sy]) => Math.abs(sx - x) + Math.abs(sy - y) <= 2 && (sx === x || sy === y || Math.abs(sx - x) + Math.abs(sy - y) <= 1));
}

function makeMap(seed, density, opts = {}) {
  const r = rng(seed);
  const g = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) row.push('#');
      else if (x % 2 === 0 && y % 2 === 0) row.push('#');
      else if (isSafe(x, y)) row.push('.');
      else if (opts.clearCenter && Math.abs(x - 7) <= 2 && Math.abs(y - 5) <= 1) row.push('.');
      else row.push(r() < density ? 'x' : '.');
    }
    g.push(row);
  }
  spawns.forEach(([x, y], i) => (g[y][x] = String(i + 1)));
  return g.map((row) => row.join(''));
}

const stages = [
  {
    id: 1, slug: '01-open-space', name: 'Open Space', theme: { floorA: '#2a2f45', floorB: '#262b3f', border: '#4a5070', rack: '#4a5375', rackLight: '#6c789e' },
    desc: 'O escritório no primeiro dia de sprint. Mesas, caixas de TODO e o barulho do ar-condicionado.',
    inimigos: ['bug'], enemyCounts: [3, 4, 5], mecanica: 'Tutorial: bombas, itens por papel', chefao: 'printer', color: '#8B5CF6',
  },
  {
    id: 2, slug: '02-sala-de-reuniao', name: 'Sala de Reunião', theme: { floorA: '#4a3626', floorB: '#43301f', border: '#6b4f38', rack: '#5b6478', rackLight: '#7c869c' },
    desc: 'Uma daily que nunca termina. Reuniões surgem e bloqueiam o caminho.',
    inimigos: ['meeting', 'bug'], enemyCounts: [4, 5, 6], mecanica: 'Reuniões param o jogador que encostam nelas por 2 s', chefao: 'emailMeeting', color: '#F59E0B',
  },
  {
    id: 3, slug: '03-data-center', name: 'Data Center', theme: { floorA: '#13202b', floorB: '#101b25', border: '#2a4658', rack: '#3a4f63', rackLight: '#5d7d96' },
    desc: 'Corredores frios de racks. Memory leaks se multiplicam se não forem contidos.',
    inimigos: ['leak'], enemyCounts: [3, 4, 4], mecanica: 'Memory Leaks se dividem em dois se não forem destruídos em 10 s', chefao: 'server500', color: '#14B8A6',
  },
  {
    id: 4, slug: '04-codigo-legado', name: 'Código Legado', theme: { floorA: '#1f2a12', floorB: '#1b2510', border: '#3f4a1e', rack: '#2f5a33', rackLight: '#4f8a52' },
    desc: 'Labirinto de código espaguete. Merge conflicts dividem o mapa ao meio.',
    inimigos: ['merge', 'bug'], enemyCounts: [4, 5, 6], mecanica: 'Merge Conflicts trocam os jogadores de lado no mapa', chefao: 'monolith', color: '#22C55E',
  },
  {
    id: 5, slug: '05-deploy-sexta', name: 'Deploy de Sexta', theme: { floorA: '#2a1214', floorB: '#251012', border: '#5a1d22', rack: '#5b2a30', rackLight: '#c2410c' },
    desc: '17h58 de sexta. Tudo pega fogo e o chefão final está em produção.',
    inimigos: ['bug', 'merge', 'leak'], enemyCounts: [5, 6, 6], mecanica: 'Relógio acelera nos últimos 60 s; blocos pegam fogo', chefao: 'prodBug', color: '#EF4444',
  },
];

for (const s of stages) {
  const arenas = [0, 1, 2].map((i) => ({
    nome: `${s.name} ${i + 1}`,
    inimigos: s.enemyCounts[i],
    mapa: makeMap(s.id * 101 + i * 7, 0.42 + i * 0.08 + (s.id - 1) * 0.02),
  }));
  const bossArena = { nome: `${s.name} · Chefão`, mapa: makeMap(s.id * 977, 0.22, { clearCenter: true }) };
  const { slug, enemyCounts, ...rest } = s;
  writeFileSync(join(out, `${slug}.json`), JSON.stringify({ ...rest, arenas, bossArena }, null, 2) + '\n');
}

// Arenas do Desafio do Cliente
const clientArenas = ['executivo', 'startup', 'investidora', 'dono'].map((id, i) => ({ boss: id, mapa: makeMap(5000 + i * 31, 0.3, { clearCenter: true }) }));
writeFileSync(join(out, 'client-arenas.json'), JSON.stringify({ arenas: clientArenas }, null, 2) + '\n');
console.log('stages gerados em', out);
