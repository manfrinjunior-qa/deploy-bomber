// Gera os arquivos src/data/stages/*.json (5 fases × 3 arenas + arena do chefão)
// e src/data/modo-zumbi.json (5 noites do Modo Zumbi).
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

// Modo Zumbi: 5 noites, uma arena cada. Legenda extra: 's' areia (piso que deixa todos lentos).
// Lápides ('#') são os blocos fixos e abóboras ('x') os destrutíveis.
const nights = [
  {
    id: 1, name: 'Floresta da Lua Cheia', color: '#A47551', chefao: 'lobisomem', ajudantes: 5,
    theme: { floorA: '#1c2a1c', floorB: '#192619', border: '#4a5548', rack: '#8b93a3', rackLight: '#b6bdcb' },
    desc: 'Uma clareira no meio da mata. Quando a lua cheia aparece, os zumbis aceleram.',
    inimigos: ['runner', 'zombie'], mecanica: 'A cada 30 s a lua cheia deixa os zumbis 50% mais rápidos',
  },
  {
    id: 2, name: 'Laboratório do Doutor', color: '#8FA3A8', chefao: 'criatura', ajudantes: 6,
    theme: { floorA: '#1a2328', floorB: '#172025', border: '#3d4f58', rack: '#7d8a96', rackLight: '#a7b4bf' },
    desc: 'Bobinas, tubos e uma tempestade lá fora. Os raios energizam as abóboras.',
    inimigos: ['zombie', 'runner', 'office'], mecanica: 'Raios energizam blocos, que explodem sozinhos',
  },
  {
    id: 3, name: 'Museu à Meia-noite', color: '#E8DCC0', chefao: 'mumia', ajudantes: 7,
    theme: { floorA: '#2b2418', floorB: '#272015', border: '#5a4c36', rack: '#9a8f7c', rackLight: '#c4b9a3' },
    desc: 'A ala egípcia ficou aberta. Sarcófagos soltam zumbis e a areia atrapalha o passo.',
    inimigos: ['zombie', 'office'], mecanica: 'Sarcófagos soltam zumbis; areia deixa todos lentos', sand: 0.22,
  },
  {
    id: 4, name: 'Cemitério da Firma', color: '#A855F7', chefao: 'bruxa', ajudantes: 8,
    theme: { floorA: '#1d2a1a', floorB: '#1a2617', border: '#465243', rack: '#9aa3b2', rackLight: '#c3cad6' },
    desc: 'Onde descansam os projetos cancelados. Túmulos se abrem e morcegos cortam o céu.',
    inimigos: ['zombie', 'bat'], mecanica: 'Túmulos geram zumbis; morcegos voam por cima dos blocos',
  },
  {
    id: 5, name: 'Castelo Sombrio', color: '#DC2626', chefao: 'vampiro', ajudantes: 10,
    theme: { floorA: '#221a2b', floorB: '#1e1726', border: '#4a3a60', rack: '#7b7590', rackLight: '#a59fba' },
    desc: 'As velas apagaram. Fantasmas atravessam paredes e só aparecem perto da luz.',
    inimigos: ['zombie', 'ghost', 'poltergeist', 'bat'], mecanica: 'As velas apagam; fantasmas atravessam blocos e só aparecem perto de luz',
  },
];
const zumbi = nights.map(({ sand, ...n }) => {
  let mapa = makeMap(7000 + n.id * 53, 0.4 + n.id * 0.02, { clearCenter: true });
  if (sand) {
    const r = rng(9000 + n.id);
    mapa = mapa.map((row, y) => [...row].map((c, x) => (c === '.' && !isSafe(x, y) && r() < sand ? 's' : c)).join(''));
  }
  return { ...n, mapa };
});
writeFileSync(join(out, '..', 'modo-zumbi.json'), JSON.stringify({ nights: zumbi }, null, 2) + '\n');
console.log('stages gerados em', out);
