# Deploy Bomber

Jogo de arena estilo bomba-e-labirinto para 1 a 4 jogadores no mesmo teclado, ambientado no dia a dia de um time de software.
Implementação do MVP descrito em [specs/001-deploy-bomber/spec.md](specs/001-deploy-bomber/spec.md).

**Stack:** TypeScript · Phaser 3 · Vite · Vitest · Playwright

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm test` | testes unitários (explosões, drops, itens, simulação de todas as arenas) |
| `npm run test:e2e` | fluxo menu → seleção → arena no Chrome instalado |
| `npm run build` | checagem de tipos + build de produção em `dist/` |
| `npm run gen:stages` | regenera os mapas em `src/data/stages/*.json` |

## Controles padrão

| Jogador | Mover | Bomba | Especial |
|---|---|---|---|
| P1 | W A S D | Q | E |
| P2 | T F G H | R | Y |
| P3 | I J K L | U | O |
| P4 | Setas | Num 0 | Num . |

Menus: setas + ENTER, ESC volta/pausa. Teclas remapeáveis em **Opções** (salvas no navegador).
Gamepad N controla o jogador N (A/X = bomba, B/Y = especial, START = pausa).

**Detonação manual (itens C e Selenium):** com eles, as bombas só explodem quando você quer (ou após 12 s).
Aperte a tecla de bomba quando não puder soltar outra (limite atingido ou já há bomba no tile) para detonar a mais antiga.

## Estrutura

```
src/
  core/      tipos, carregamento dos JSON, RNG, save (localStorage), sessão, sons
  data/      roles.json, items.json, enemies.json, bosses.json, stages/*.json
  systems/   regras puras e testáveis: grid, explosões, drops, itens, especiais, IA, World
  entities/  Player, Bomb, Enemy/Boss, Item
  input/     teclado (event.code), mapas de teclas, gamepad
  gfx/       pixel art gerada por código (personagens, inimigos, chefões, tiles, ícones)
  ui/        HUD e helpers de UI
  scenes/    Boot, Title, StageSelect, CharacterSelect, Options, Arena, Results
tests/
  unit/      explosions, drops, simulation
  e2e/       menu-to-arena
```

Os sistemas leem as regras dos JSON e não dependem do Phaser; as cenas só orquestram e desenham.
Balancear o jogo (atributos, pesos de drop, chefões) é só editar `src/data/`.
