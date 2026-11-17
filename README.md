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
| `npm test` | testes unitários (explosões, drops, itens, simulação de todas as arenas, sprites dos personagens) |
| `npm run test:e2e` | fluxo menu → seleção → arena no Chrome instalado |
| `npm run build` | checagem de tipos + build de produção em `dist/` |
| `npm run gen:stages` | regenera os mapas em `src/data/stages/*.json` |
| `npm run gen:brand` | regenera logo e ícones (`public/brand/`) a partir de `brand/logo-e-icone.png` |

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

**Caixas TODO (quadro kanban):** uma caixa TODO não quebra de primeira. Cada explosão (ou o Refatorar do DEV) a avança
TODO → PROGRESS → DONE, e só a explosão seguinte ao DONE a destrói e solta o item. Cada golpe vale +100.
FIXME e HACK quebram na primeira explosão; caixas em chamas (fase 5) queimam inteiras em qualquer estágio.

## Estrutura

```
src/
  core/      tipos, carregamento dos JSON, RNG, save (localStorage), sessão, sons
  data/      roles.json, items.json, enemies.json, bosses.json, stages/*.json
  systems/   regras puras e testáveis: grid, explosões, drops, itens, especiais, IA, World
  entities/  Player, Bomb, Enemy/Boss, Item
  input/     teclado (event.code), mapas de teclas, gamepad
  gfx/       pixel art gerada por código: characters.ts (personagens em camadas), art.ts (inimigos, chefões, tiles, ícones)
  ui/        HUD e helpers de UI
  scenes/    Boot, Title, StageSelect, CharacterSelect, Options, Arena, Results
tests/
  unit/      explosions, drops, movement, simulation, characters
  e2e/       menu-to-arena (fluxo até a arena e ciclo de variantes)
```

Os sistemas leem as regras dos JSON e não dependem do Phaser; as cenas só orquestram e desenham.
Balancear o jogo (atributos, pesos de drop, chefões) é só editar `src/data/`.

## Personagens e variantes

Cada papel tem 5 variantes de visual (Spec V2). A primeira é a padrão: **Personalizado** para DEV, QA e PO e **Executivo de contas** para o Comercial.
Elas ficam em `variants` de `src/data/roles.json` e são montadas em camadas por `src/gfx/characters.ts`:

| Campo | Valores |
|---|---|
| `style` (cabeça) | `quiff`, `combed`, `shaved`, `bald`, `long`, `bun`, `afro`, `hood`, `beanie`, `cap`, `cowboy`, `ninja`, `robot`, `helmet` |
| `outfit` (roupa) | `shirt` (padrão), `polo`, `tee`, `suit`, `dress`, `jacket`, `vest`, `spacesuit`, `robot` |
| `eyewear` | `clear`, `thick`, `shades`, `round-shades` |
| `beard` | `full`, `short`, `goatee` (+ `beardColor`) |
| extras | `brows`, `smile`, `mouth`, `headset`, `tie`, `bandana`, `logo`, `hat`, `outer` |
| `prop` (objeto na mão) | `magnifier`, `card`, `phone`, `guitar`, `briefcase`, `lasso`. Sem `prop`, vale o do papel; `null` deixa as mãos vazias |

Para criar uma variante nova, basta adicionar uma entrada em `roles.json`. A seleção, o HUD e os resultados se ajustam ao número de variantes.
