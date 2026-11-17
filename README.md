# Deploy Bomber — Documentação do projeto

Jogo de arena estilo bomba-e-labirinto para 1 a 4 jogadores no mesmo computador e teclado, ambientado no dia a dia de um time de software. Os jogadores escolhem um papel (DEV, QA, PO ou Comercial), explodem blocos de TODO/FIXME e enfrentam bugs, reuniões, chefões e, no Modo Zumbi, cinco noites de monstros.

Este arquivo é a documentação completa do projeto: como rodar, a especificação do jogo (todos os modos, inclusive o Modo Zumbi), dados, arquitetura, tarefas e decisões.

**Stack:** TypeScript · Phaser 3 · Vite · Vitest · Playwright

**Sumário**

1. [Como rodar](#1-como-rodar)
2. [Controles](#2-controles)
3. [Visão geral](#3-visão-geral)
4. [Personagens](#4-personagens)
5. [Sistema de itens](#5-sistema-de-itens)
6. [Modo História: as 5 fases](#6-modo-história-as-5-fases)
7. [Modo Desafio do Cliente](#7-modo-desafio-do-cliente)
8. [Modo Zumbi](#8-modo-zumbi)
9. [Histórias de usuário e requisitos](#9-histórias-de-usuário-e-requisitos)
10. [Modelo de dados](#10-modelo-de-dados)
11. [Arquitetura e estrutura de pastas](#11-arquitetura-e-estrutura-de-pastas)
12. [Arte conceitual e protótipos](#12-arte-conceitual-e-protótipos)
13. [Tarefas e status](#13-tarefas-e-status)
14. [Decisões tomadas e questões em aberto](#14-decisões-tomadas-e-questões-em-aberto)

---

## 1. Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

| Comando | O que faz |
|---|---|
| `npm test` | testes unitários (explosões, drops, itens, Modo Zumbi, simulação de todas as arenas e noites, sprites dos personagens) |
| `npm run test:e2e` | fluxos de menu no Chrome instalado (História, Modo Zumbi, seleção de variantes, Personagens) |
| `npm run build` | checagem de tipos + build de produção em `dist/` |
| `npm run gen:stages` | regenera os mapas em `src/data/stages/*.json` e `src/data/modo-zumbi.json` |
| `npm run gen:brand` | regenera logo e ícones (`public/brand/`) a partir de `brand/logo-e-icone.png` |

Requisitos: Node 20+ e, para os testes e2e, o Google Chrome instalado (o Playwright usa o Chrome do sistema).

## 2. Controles

| Jogador | Mover | Bomba | Especial |
|---|---|---|---|
| P1 | W A S D | Q | E |
| P2 | T F G H | R | Y |
| P3 | I J K L | U | O |
| P4 | Setas | Num 0 | Num . |

- Menus: setas + ENTER; ESC volta ou pausa.
- Teclados comuns têm *ghosting* (limite de teclas simultâneas). As teclas podem ser remapeadas em **Opções** (salvas no navegador).
- Gamepad N controla o jogador N (A/X = bomba, B/Y = especial, START = pausa).
- **Detonação manual (itens C e Selenium):** as bombas só explodem quando você quer (ou após 12 s). Aperte a tecla de bomba quando não puder soltar outra (limite atingido ou já há bomba no tile) para detonar a mais antiga.
- **Caixas TODO (quadro kanban):** uma caixa TODO não quebra de primeira. Cada explosão (ou o Refatorar do DEV) a avança TODO → PROGRESS → DONE, e só a explosão seguinte ao DONE a destrói e solta o item. Cada golpe vale +100. FIXME e HACK quebram na primeira explosão; caixas em chamas (fase 5) queimam inteiras em qualquer estágio. No Modo Zumbi as abóboras quebram sempre de primeira.

## 3. Visão geral

A mecânica que diferencia o jogo: **o mesmo bloco gera um item diferente dependendo de quem o explodiu**. O DEV encontra linguagens de programação, o QA encontra ferramentas de automação e bugs, o PO encontra artefatos ágeis e o Comercial encontra leads, propostas e comissões.

**Pilares de design**

- Humor reconhecível: toda piada vem da rotina real de quem trabalha com software.
- Assimetria de papéis: cada personagem joga diferente por causa dos itens e do especial, não só pela cor.
- Sofá local: 4 pessoas, 1 teclado, partidas de 3 minutos.
- Leitura instantânea: pixel art 16-bit, tiles de 56 px, cada papel com uma cor própria.

**Modos de jogo (menu principal)**

| Modo | Jogadores | Resumo |
|---|---|---|
| Modo História | 1–4, cooperativo | 5 fases × 3 arenas + chefão, do Open Space ao Deploy de Sexta |
| Batalha Local | 2–4, todos contra todos | mapas das 5 fases; vence o último de pé |
| Desafio do Cliente | 1–4, cooperativo | as 4 versões do Cliente como chefões em sequência |
| Modo Zumbi | 1–4, cooperativo | 5 noites de zumbis; cada chefão só aparece depois que todos os ajudantes caem |

O menu também tem **Seleção de fases**, **Personagens** (ficha de cada papel: atributos, bomba, especial, itens com chance de drop e todas as variantes) e **Opções**.

**Escopo do MVP:** os 4 modos acima, 4 personagens, 24 itens exclusivos (6 por papel), 4 itens neutros e 4 itens da noite. Fora do MVP: jogo online, editor de fases, ranking global.

## 4. Personagens

Os 4 papéis têm atributos base diferentes (escala 1–5), uma bomba temática e uma habilidade especial com recarga. Atributos sobem com itens até o máximo de 8.

| Papel | Cor | Velocidade | Alcance | Bombas | Bomba | Especial (recarga) | Encontra |
|---|---|---|---|---|---|---|---|
| DEV | Roxo `#8B5CF6` | 3 | 3 | 2 | Bomba de Commit | **Refatorar**: destrói o bloco à frente sem bomba (8 s) | Linguagens de programação |
| QA | Verde-água `#14B8A6` | 4 | 2 | 2 | Bomba de Teste | **Reportar Bug**: congela inimigo ou rival em linha reta por 2 s (10 s) | Ferramentas de automação e bugs |
| PO | Âmbar `#F59E0B` | 2 | 3 | 3 | Bomba de Prioridade | **Repriorizar**: desarma uma bomba adjacente, inclusive de rivais (12 s) | Artefatos ágeis |
| Comercial | Vermelho `#EF4444` | 4 | 3 | 1 | Bomba de Proposta | **Pitch de vendas**: puxa os itens num raio de 3 tiles até você (12 s) | Leads, propostas e comissões |

**Variantes de visual**

Cada papel tem 5 variantes. A primeira é a padrão: **Personalizado** para DEV, QA e PO e **Executivo de contas** para o Comercial. A variante é só estética: atributos, bomba e especial não mudam.

| Papel | Padrão | Variante 2 | Variante 3 | Variante 4 | Variante 5 |
|---|---|---|---|---|---|
| DEV | Personalizado: topete escuro, sobrancelhas grossas, barba curta, sorriso aberto e camisa polo azul-marinho | Personalizado 2: óculos escuros redondos, bigode, cavanhaque e camiseta branca | Ninja: capuz, máscara e faixa roxa | Back-end: careca, barba e fone | Mobile: cabelo longo e óculos |
| QA | Personalizado: cabelo preto curto com topete, óculos de grau de armação preta, sem barba, sorriso aberto e camisa vinho | Personalizado 2: cabelo raspado em degradê, barba e camisa social azul-marinho | Automação: fone | Robô: cabeça de metal com antena e tela no rosto | Performance: coque |
| PO | Personalizado: cabelo curto preto, óculos, barba curta e terno escuro | Clássica: coque e vestido âmbar | Roqueiro: cabelo comprido, óculos escuros, jaqueta de couro e guitarra | Visionário: cabelo penteado | Estratégica: cabelo longo |
| Comercial | Executivo de contas: cabelo penteado | SDR: headset | Cowboy: chapéu, bandana vermelha, colete e laço | Gerente de vendas: coque | Astronauta: traje branco com detalhes vermelhos |

As variantes ficam em `variants` de `src/data/roles.json` e são montadas em camadas por `src/gfx/characters.ts`:

| Campo | Valores |
|---|---|
| `style` (cabeça) | `quiff`, `pompadour`, `side`, `short`, `crop`, `plain`, `fringe`, `shaved`, `bald`, `long`, `bun`, `cowboy`, `ninja`, `robot`, `helmet` |
| `outfit` (roupa) | `shirt` (padrão), `polo`, `tee`, `suit`, `dress`, `jacket`, `vest`, `spacesuit`, `robot` |
| `eyewear` | `clear`, `dark`, `thick`, `shades`, `round-shades` |
| `beard` | `full`, `short`, `goatee` (+ `beardColor`) |
| extras | `brows` (`thick`, `raised`), `smile`, `blush`, `mouth`, `headset`, `tie`, `bandana`, `logo`, `hat`, `outer` |
| cores opcionais | `shade`, `sole`, `pantsShade`, `hairLight`: só quando a sombra calculada não é o tom desejado |
| `prop` (objeto na mão) | `magnifier`, `card`, `phone`, `guitar`, `briefcase`, `lasso`. Sem `prop`, vale o do papel; `null` deixa as mãos vazias |

Os sprites têm 18×20 pixels e reproduzem a arte de `docs/concept-art/7-todas-as-variantes.png` pixel a pixel. Essa arte está convertida em grade em `tests/fixtures/reference-sprites.json`, e `npm test` compara os 20 personagens e os 4 chefões do Cliente com ela: mudar o desenho de um personagem existente exige atualizar a referência. Para criar uma variante nova, basta adicionar uma entrada em `roles.json`; seleção, HUD e resultados se ajustam ao número de variantes.

## 5. Sistema de itens

Cada bloco destrutível tem 30% de chance de soltar um item. O tipo do item é sorteado na hora da explosão, a partir da tabela do papel do dono da bomba. Itens neutros (10% dos drops) aparecem para todos. Pesos de drop: itens de atributo (velocidade, alcance, bombas) 60%, itens especiais 30%, neutros 10%.

**DEV — linguagens de programação**

| Ícone | Item | Efeito |
|---|---|---|
| JS | JavaScript | Velocidade +1 |
| PY | Python | Alcance da explosão +1 |
| JV | Java | +1 bomba simultânea |
| GO | Go | Goroutines: solta 2 bombas de uma vez (enfileiradas na direção do movimento) |
| RS | Rust | Memory safe: escudo contra 1 explosão |
| C | C | Ponteiros: detonação manual das bombas |

**QA — automação e bugs**

| Ícone | Item | Efeito |
|---|---|---|
| SE | Selenium | Detonação remota das bombas |
| CY | Cypress | Velocidade +1 |
| PW | Playwright | Cross-browser: alcance +2 |
| JT | Jest / JUnit | +1 bomba simultânea |
| PM | Postman | Chuta bombas como requisições |
| BUG | Bug capturado | A cada 3 bugs, gera um Relatório que congela todos os inimigos por 3 s |

**PO — artefatos ágeis**

| Ícone | Item | Efeito |
|---|---|---|
| US | User Story | +1 bomba simultânea |
| BL | Backlog priorizado | Alcance +1 |
| SP | Sprint | Velocidade +1 |
| RM | Roadmap | Revela itens escondidos no mapa por 5 s |
| PI | Post-it | Cria um bloco temporário (barreira de 6 s) |
| AL | Alinhamento | Atordoa rivais adjacentes por 1,5 s |

**Comercial — vendas**

| Ícone | Item | Efeito |
|---|---|---|
| $$ | Comissão | +1 bomba simultânea |
| LD | Lead quente | Alcance +1 |
| MT | Meta batida | Velocidade +1 |
| CT | Contrato fechado | Escudo contra 1 explosão |
| FU | Follow-up | A bomba explode de novo 1 s depois |
| DS | Desconto | Rivais atingidos pela próxima explosão perdem 1 item |

**Itens neutros (todos os papéis, todos os modos)**

| Ícone | Item | Efeito |
|---|---|---|
| CF | Café | Invencível por 5 s |
| CR | Code Review | Mostra onde há itens nos blocos próximos |
| XX | Bug Crítico | Item ruim: inverte os controles por 8 s |
| IA | Copiloto IA | Por 10 s destaca a rota segura e o alcance das bombas; com 20% de chance ele "alucina" e indica uma rota errada |

**Itens da noite (todos os papéis, só no Modo Zumbi)**

| Ícone | Item | Efeito |
|---|---|---|
| DC | Doce | Velocidade +2 por 8 s (pode passar do limite de 8) |
| LT | Lanterna | Ilumina o mapa escuro (e a tempestade de areia) por 10 s |
| AB | Água benta | Protege de 1 mordida |
| BP | Bala de prata | A próxima bomba dá dano dobrado no chefão |

No Modo Zumbi os 4 itens da noite entram na tabela de todos os papéis com peso 5 cada (cerca de 17% dos drops).

## 6. Modo História: as 5 fases

O jogo tem 5 fases em sequência, do primeiro dia de sprint ao deploy de sexta-feira. Cada fase tem 3 arenas (15×11 tiles) e termina com um chefão; cada uma acrescenta uma mecânica nova.

| # | Fase | Inimigos | Mecânica nova | Chefão |
|---|---|---|---|---|
| 1 | Open Space | Bug | Tutorial: bombas, itens por papel | Impressora Travada |
| 2 | Sala de Reunião | Reunião, Bug | Reuniões param o jogador que encostam nelas por 2 s | A Reunião que Era um E-mail |
| 3 | Data Center | Memory Leak | Memory Leaks se dividem em dois se não forem destruídos em 10 s | Servidor 500 |
| 4 | Código Legado | Merge Conflict, Bug | Merge Conflicts trocam os jogadores de lado no mapa | O Monolito |
| 5 | Deploy de Sexta | Bug, Merge Conflict, Memory Leak | Relógio acelera nos últimos 60 s; blocos pegam fogo | Bug em Produção |

**Elementos do mapa**

- Bloco fixo: rack de servidor (indestrutível), em grade a cada 2 tiles.
- Bloco destrutível: caixas de TODO, FIXME e HACK.
- Tempo por arena: 3 minutos. Ao zerar, a arena começa a fechar pelas bordas ("deadline").

Os ataques dos 5 chefões das fases estão em `src/data/bosses.json`.

## 7. Modo Desafio do Cliente

O Cliente não é jogável: suas 4 versões são os chefões de um modo próprio. De 1 a 4 jogadores cooperam e enfrentam os chefões em sequência, cada um na sua arena.

| # | Chefão | Arena | Resistência (acertos) | Ataque 1 | Ataque 2 |
|---|---|---|---|---|---|
| 1 | Executivo | Sala de Reunião | 6 | **Mudança de escopo**: a cada 20 s embaralha os blocos destrutíveis | **Reunião surpresa**: invoca 2 Reuniões |
| 2 | Startup | Coworking | 7 | **Pivot!**: inverte os controles de todos por 5 s | **MVP pra ontem**: o relógio corre 2× mais rápido por 10 s |
| 3 | Investidora | Sala do Conselho | 8 | **Corte de orçamento**: cada jogador perde 1 bomba por 8 s | **Chuva de moedas**: moedas-bomba caem em 6 tiles marcados |
| 4 | Dono da empresa (final) | Cobertura | 10 | **Reestruturação**: os racks fixos mudam de lugar | **Bônus cancelado**: some com todos os itens do chão |

Cada chefão é uma entrada em `src/data/bosses.json` (variante visual, arena, resistência, ataques e intervalos).

## 8. Modo Zumbi

Modo cooperativo de 1 a 4 jogadores com 5 noites focadas em zumbis. Cada noite é uma arena com um tema, uma mecânica própria e um monstro clássico como chefão. Cada noite tem uma **cota de ajudantes** (monstros menores): os ajudantes chegam aos poucos, e **o chefão só aparece quando todos os ajudantes da cota caem**. A noite termina quando o chefão é derrotado.

| Noite | Arena | Ajudantes | Inimigos | Mecânica | Chefão (resistência) | Ataques do chefão |
|---|---|---|---|---|---|---|
| 1 | Floresta da Lua Cheia | 5 | Zumbi corredor, comum | A cada 30 s a lua cheia deixa os zumbis 50% mais rápidos por 10 s | Lobisomem (8) | **Investida**: corre em linha reta derrubando blocos · **Uivo**: atordoa todos por 1,5 s |
| 2 | Laboratório do Doutor | 6 | Zumbi comum, corredor, de escritório | A cada 6 s um raio energiza uma abóbora, que explode sozinha 2,5 s depois | A Criatura (9) | **Pisão**: faz o mapa tremer e empurra as bombas · **Descarga**: raios em linha reta |
| 3 | Museu à Meia-noite | 7 | Zumbi comum, de escritório | Sarcófagos soltam zumbis; pisos de areia deixam quem passa 40% mais lento | Múmia (10) | **Faixas**: prende o jogador mais próximo por 2 s · **Tempestade de areia**: esconde o mapa por 5 s |
| 4 | Cemitério da Firma | 8 | Zumbi comum, morcego | Túmulos geram zumbis; morcegos voam por cima dos blocos | Bruxa (11) | **Caldeirão**: poções viram 3 blocos em abóboras · **Feitiço**: transforma bombas próximas em morcegos |
| 5 (final) | Castelo Sombrio | 10 | Zumbi comum, fantasma, Poltergeist, morcego | As velas apagam: o mapa fica escuro e só se vê perto de luz (jogadores, explosões, bombas ou Lanterna) | Vampiro (14) | **Revoada**: vira morcego e reaparece no canto mais longe do time · **Mordida**: persegue rápido por 3 s e rouba 1 vida (o Vampiro recupera 1 de resistência) |

**Regras do modo**

- **Ajudantes:** 3 começam no mapa (longe dos jogadores); a cada 5 s surge outro, num tile a 4+ tiles de qualquer jogador, até completar a cota da noite, com no máximo 5 vivos ao mesmo tempo. O log avisa "TÚMULO ABERTO", "SARCÓFAGO ABERTO" etc. Quando o último cai, o chefão surge perto do centro (a 3+ tiles dos jogadores) com o aviso "<CHEFÃO> APARECEU". Morcegos invocados pelo Feitiço da Bruxa não contam na cota.
- **Mordida:** quem é mordido por um zumbi vira zumbi por 6 s: fica lento (55% da velocidade), não solta bombas e aparece esverdeado com a etiqueta "ZUMBI". Um colega cura passando por cima (+100 pontos para quem cura). Água benta bloqueia uma mordida; o Café também protege.
- **Cenário:** lápides são os blocos fixos (inclusive a borda) e abóboras são os blocos destrutíveis; as abóboras quebram na primeira explosão.
- **Zumbis:** comum (lento), corredor (rápido) e de escritório (precisa de 2 explosões para cair). Todos perseguem os jogadores e aceleram na lua cheia.
- **Morcegos** (noites 4 e 5): voam por cima de abóboras e bombas e, quando um jogador fica na mesma linha ou coluna (até 6 tiles), dão um rasante em linha reta. O contato tira 1 vida.
- **Fantasma** (noite 5): atravessa blocos, só aparece perto de luz e, em vez de morder, dá um susto que congela o jogador por 2 s.
- **Poltergeist** (noite 5): fantasma roxo com correntes; também atravessa blocos e dá susto, chuta de volta as bombas que encosta e arrasta abóboras de lugar.
- **Visual da Criatura:** design original (gigante remendado, pele cinza-azulada, pontos de costura), sem a cabeça achatada e os parafusos do filme clássico, que têm dono.
- **Tempo:** cada noite tem 4 minutos; ao zerar, vale o mesmo deadline das outras arenas.
- **Progresso:** vencer uma noite libera a seguinte (salvo no navegador). Vida, pontos e itens passam de uma noite para a outra; quem caiu volta com 1 vida. Vencer a noite 5 encerra o modo com "AMANHECEU!".

**HUD do modo:** relógio com a moldura laranja e o status da noite (lua cheia, tempestade de areia, lanterna, velas apagadas); quadro lateral com o rosto do chefão e a barra **AJUDANTES x / N** até ele aparecer, depois a barra de resistência; "LOG DA NOITE" no lugar do "LOG DO SPRINT".

**Onde está no código**

| O quê | Arquivo |
|---|---|
| Noites (arena, cota, inimigos, mecânica, chefão, tema e mapa) | `src/data/modo-zumbi.json` (gerado por `scripts/generate-stages.mjs`) |
| Inimigos do modo | `src/data/enemies.json` (`zombie`, `runner`, `office`, `ghost`, `poltergeist`, `bat`) |
| Chefões e ataques | `src/data/bosses.json` (`lobisomem`, `criatura`, `mumia`, `bruxa`, `vampiro`) |
| Itens da noite | `src/data/items.json` (`"mode": "zombie"` e `nightDrops`) |
| Pixel art dos chefões e inimigos | `src/data/zumbi-sprites.json` |
| Regras (cota, mordida, cura, lua, raios, escuro) | `src/systems/world.ts` |
| IA (voo, rasante, poltergeist, ataques dos chefões) | `src/systems/ai.ts` |
| Testes | `tests/unit/zumbi.test.ts` e as noites em `tests/unit/simulation.test.ts` |

Os sprites de `zumbi-sprites.json` têm 16 colunas; cada caractere de `rows` é uma chave de `palette` e `.` é transparente. O jogo desenha cada sprite com contorno de 1 px (`drawRowSprite` em `src/gfx/art.ts`).

## 9. Histórias de usuário e requisitos

**Histórias prioritárias**

1. Como grupo de amigos, quero jogar em até 4 pessoas no mesmo teclado, para jogar junto sem configurar rede.
   - Dado 4 jogadores na seleção, quando todos confirmam, a partida começa com cada um no seu canto do mapa.
2. Como jogador DEV, quero encontrar linguagens ao explodir blocos, para sentir que meu papel importa.
   - Dado que a bomba do DEV destrói um bloco com drop, o item que aparece é da tabela DEV ou neutra.
3. Como jogador QA, quero capturar bugs e transformá-los em relatórios, para ter uma estratégia própria.
   - Dado 3 bugs coletados, o 3º gera um Relatório e zera o contador.
4. Como jogador, quero escolher a fase no menu, para revisitar a fase de que mais gosto.
5. Como jogador, quero remapear minhas teclas, para contornar limites do meu teclado.
6. Como time, quero enfrentar noites de zumbis em que o chefão só chega depois dos ajudantes, para ter um modo cooperativo com ritmo diferente.
   - Dado uma noite com cota N, o chefão não está no mapa enquanto houver ajudantes vivos ou a chegar; quando o N-ésimo cai, ele aparece.
7. Como jogador mordido, quero que um colega possa me curar, para que o cooperativo tenha resgate.
   - Dado um jogador mordido, quando um colega não mordido passa por cima dele, a mordida acaba na hora.

**Requisitos funcionais**

| ID | Requisito |
|---|---|
| FR-001 | O jogo suporta 1 a 4 jogadores locais, cada um com seu conjunto de teclas. |
| FR-002 | Cada jogador escolhe um papel único (DEV, QA, PO, Comercial) e uma das variantes de visual antes da partida. |
| FR-003 | Uma bomba explode 3 s após ser colocada, em cruz, com o alcance do dono. |
| FR-004 | Explosões encadeiam outras bombas no alcance. |
| FR-005 | O drop de item usa a tabela do papel do dono da bomba que destruiu o bloco. |
| FR-006 | Qualquer jogador pode pegar qualquer item; o efeito vale para quem pegou. |
| FR-007 | Cada papel tem uma habilidade especial com recarga exibida no HUD. |
| FR-008 | O HUD mostra, por jogador: vidas, pontuação e itens ativos; ao centro, tempo e fase. |
| FR-009 | Modo História: jogadores cooperam; a arena termina quando todos os inimigos caem. |
| FR-010 | Modo Batalha: vence o último jogador vivo; empate se todos caem no mesmo frame. |
| FR-011 | Cada fase termina com um chefão com padrão de ataque próprio. |
| FR-012 | As teclas de cada jogador podem ser remapeadas e salvas localmente. |
| FR-013 | O progresso do Modo História (fases liberadas, recorde) é salvo localmente. |
| FR-014 | Modo Zumbi: cada noite tem uma cota de ajudantes; o chefão só entra quando todos caem, e a noite termina quando ele cai. |
| FR-015 | Modo Zumbi: a mordida deixa o jogador lento e sem bombas por 6 s; um colega cura passando por cima. |
| FR-016 | Modo Zumbi: os itens da noite só caem nesse modo, para todos os papéis. |
| FR-017 | Modo Zumbi: as noites liberadas ficam salvas localmente. |

**Requisitos não funcionais**

- Roda a 60 fps em notebook comum, em navegador desktop recente.
- Resolução lógica fixa 1280×800, escalonada sem borrão (pixel art nítida).
- Entrada com latência máxima de 1 frame.

## 10. Modelo de dados

Papéis, itens, fases, noites e chefões ficam em arquivos JSON de configuração; balancear o jogo não exige mudar código.

| Entidade | Campos principais | Origem |
|---|---|---|
| Role | id, nome, cor, velocidade, alcance, bombas, bombaTipo, especialId, tabelaDropId, variants | `src/data/roles.json` |
| Item | id, ícone, nome, papel (ou neutro), tipo, modo, efeito, duração, peso | `src/data/items.json` |
| DropTable | papel, lista de (itemId, peso); `nightDrops` para o Modo Zumbi | `src/data/items.json` |
| Special | id, efeito, recarga, alcance | `src/data/roles.json` |
| Enemy | tipo, vida, velocidade, toque (dano, congela, troca, mordida, susto), IA, voo | `src/data/enemies.json` |
| Boss | id, nome, sprite, resistência, velocidade, ataques e intervalos | `src/data/bosses.json` |
| Stage | id, nome, tema, arenas (mapas 15×11), inimigos, chefão, mecânica | `src/data/stages/*.json` |
| Night | id, arena, cota de ajudantes, inimigos, mecânica, chefão, tema, mapa | `src/data/modo-zumbi.json` |
| Player | slot (P1–P4), roleId, teclas, posição, vidas, atributos, itensAtivos, recargaEspecial, mordida | em memória |
| Bomb | dono, posição, alcance, timer, flags (remota, chutada, follow-up, prata) | em memória |
| SaveData | fases liberadas, noites liberadas, recordes, teclas, som | `localStorage` |

Legenda dos mapas: `#` bloco fixo · `x` bloco destrutível · `.` piso · `s` areia (Modo Zumbi) · `1`–`4` spawn dos jogadores.

Exemplo de entrada em `items.json`:

```json
{ "id": "py", "icon": "PY", "name": "Python", "role": "DEV", "kind": "attr", "effect": { "stat": "range", "add": 1 }, "weight": 20 }
```

## 11. Arquitetura e estrutura de pastas

Jogo web em TypeScript com Phaser 3, empacotado com Vite. Roda no navegador e pode virar app desktop depois (Electron ou Tauri) sem reescrever.

| Camada | Escolha | Motivo |
|---|---|---|
| Linguagem | TypeScript | Tipos para entidades e tabelas de drop |
| Engine | Phaser 3 | Sprites, input de teclado e gamepad prontos |
| Build | Vite | Recarga rápida no desenvolvimento |
| Mapas | JSON gerado por script | Arenas 15×11 versionadas (`npm run gen:stages`) |
| Arte | Pixel art gerada por código | Sprites em memória, sem arquivos de imagem |
| Testes | Vitest + Playwright | Regras puras (drops, explosões, Modo Zumbi) e fluxo de menus |

Os sistemas (`src/systems/`) leem as regras dos JSON e não dependem do Phaser; as cenas só orquestram e desenham. Assim, a lógica de drop por papel e as regras do Modo Zumbi são testáveis sem abrir o jogo.

```
deploy-bomber/
├── README.md              # esta documentação (única)
├── docs/
│   ├── concept-art/       # telas e personagens de referência (PNG)
│   └── prototypes/
│       └── personagens-3d.html   # prévia 3D em voxel (abra no navegador)
├── brand/                 # arte original da logo
├── public/brand/          # logo e ícones usados pelo jogo
├── scripts/
│   ├── generate-stages.mjs   # mapas das fases, do Desafio e das noites
│   └── generate-brand.mjs
├── src/
│   ├── main.ts
│   ├── core/      # tipos, carregamento dos JSON, RNG, save, sessão, sons
│   ├── data/      # roles, items, enemies, bosses, modo-zumbi, zumbi-sprites, stages/
│   ├── systems/   # grid, explosões, drops, itens, especiais, IA, World
│   ├── entities/  # Player, Bomb, Enemy/Boss, Item
│   ├── input/     # teclado, mapas de teclas, gamepad
│   ├── gfx/       # pixel art: characters.ts (personagens), art.ts (inimigos, chefões, tiles, ícones)
│   ├── ui/        # HUD e helpers de UI
│   └── scenes/    # Boot, Title, StageSelect, CharacterSelect, Characters, Options, Arena, Results
└── tests/
    ├── unit/      # explosions, drops, movement, simulation, characters, describe, zumbi
    ├── e2e/       # menu-to-arena (História, Modo Zumbi, variantes, Personagens)
    └── fixtures/  # reference-sprites.json
```

## 12. Arte conceitual e protótipos

| Arquivo | Conteúdo |
|---|---|
| [1-gameplay.png](docs/concept-art/1-gameplay.png) | Partida com 4 jogadores |
| [2-tela-inicial.png](docs/concept-art/2-tela-inicial.png) | Tela inicial |
| [3-selecao-personagens.png](docs/concept-art/3-selecao-personagens.png) | Seleção de personagens |
| [4-itens-por-papel.png](docs/concept-art/4-itens-por-papel.png) | Itens de cada papel |
| [5-fases.png](docs/concept-art/5-fases.png) | As 5 fases |
| [6-desafio-do-cliente.png](docs/concept-art/6-desafio-do-cliente.png) | Desafio do Cliente |
| [7-todas-as-variantes.png](docs/concept-art/7-todas-as-variantes.png) | Todas as variantes (referência pixel a pixel dos testes) |
| [8-modo-zumbi-visao-geral.png](docs/concept-art/8-modo-zumbi-visao-geral.png) | Modo Zumbi: as 5 noites, inimigos e itens da noite |
| [9-modo-zumbi-gameplay.png](docs/concept-art/9-modo-zumbi-gameplay.png) | Modo Zumbi: partida na noite 4 |
| [10-chefoes.png](docs/concept-art/10-chefoes.png) | Chefões do Modo Zumbi e do Desafio do Cliente |
| [11-personagens-3d-time.png](docs/concept-art/11-personagens-3d-time.png) | Protótipo 3D: o time |
| [12-personagens-3d-chefoes.png](docs/concept-art/12-personagens-3d-chefoes.png) | Protótipo 3D: chefões do Cliente |
| [personagens-3d.html](docs/prototypes/personagens-3d.html) | Protótipo 3D em voxel (abra no navegador) |

## 13. Tarefas e status

Status em 17/11/2026. `[x]` feito · `[~]` feito com ressalva · `[ ]` pendente.

**M1 — Arena jogável (1 jogador)**
- [x] Projeto Vite + Phaser + TypeScript com cena de arena 15×11
- [x] Movimento em grade (com assistência de quina), bomba com timer de 3 s e explosão em cruz
- [x] Blocos fixos e destrutíveis; explosões em cadeia
- [x] Testes unitários de explosão

**M2 — 4 jogadores e papéis**
- [x] 4 mapas de teclas padrão e tela de remapeamento (Opções, salvo em localStorage)
- [x] Tela de seleção com os 4 papéis, 5 variantes de visual cada e atributos base
- [x] Habilidades especiais com recarga no HUD
- [x] Modo Batalha Local (3 vidas, vence o último de pé, empate no mesmo frame)
- [x] Gamepads como alternativa

**M3 — Itens por papel**
- [x] items.json com as 4 tabelas + neutros (pesos 60/30/10)
- [x] Drop pela tabela do papel do dono da bomba, com testes
- [x] Efeitos dos 28 itens

**M4 — 5 fases e chefões**
- [~] 15 arenas (3 por fase) + arena de chefão, com tema visual por fase — geradas por script em JSON, não no Tiled
- [x] Inimigos: Bug, Reunião, Memory Leak, Merge Conflict
- [x] 5 chefões e Modo História cooperativo com save local; Desafio do Cliente com 4 chefões
- [x] Mecânicas por fase: reuniões travam 2 s, leaks se dividem em 10 s, merge conflict troca de lado, relógio acelerado e fogo na fase 5
- [x] Deadline: arena fecha pelas bordas quando o tempo zera

**M5 — Modo Zumbi**
- [x] Menu "Modo Zumbi · 5 noites" e seleção das noites com bloqueio por progresso
- [x] 5 noites com lápides, abóboras e tema próprio; areia no Museu
- [x] Cota de ajudantes por noite e chefão que só aparece quando todos caem
- [x] Mordida (lento, sem bombas) e cura por colega
- [x] Inimigos: zumbi comum, corredor, de escritório, fantasma, Poltergeist e morcego
- [x] Mecânicas: lua cheia, raios, areia, escuridão com luz
- [x] 5 chefões com 2 ataques cada; itens da noite (Doce, Lanterna, Água benta, Bala de prata)
- [x] Testes unitários, simulação das 5 noites e fluxo e2e

**M6 — Polimento**
- [~] Sprites e animações: pixel art gerada por código (placeholder de qualidade, não arte final de Aseprite)
- [~] Áudio: efeitos sintetizados via WebAudio; sem música
- [ ] Playtest com 4 pessoas e ajuste dos pesos de drop e da dificuldade das noites

**Critérios de sucesso**

- 4 pessoas jogam uma partida completa no mesmo teclado sem travar teclas no mapeamento padrão.
- Em playtest, jogadores sabem dizer que item cada papel encontra depois de 1 partida.
- Nenhum papel vence mais de 35% das partidas de Batalha em 40 partidas de teste.
- 60 fps estáveis com 4 jogadores, 8 bombas e 6 inimigos na tela.

## 14. Decisões tomadas e questões em aberto

**Decisões tomadas onde a spec estava em aberto**

- Item de outro papel: o efeito vale para quem pegou.
- Detonação manual (C / Selenium): tecla de bomba sem espaço para nova bomba detona a mais antiga; bombas remotas explodem sozinhas após 12 s.
- Post-it e Alinhamento agem ao serem coletados (bloco atrás do jogador / atordoa quem estiver adjacente).
- No cooperativo, quem caiu volta na arena seguinte com 1 vida.
- Atributos, itens e escudos são mantidos entre arenas no Modo História, no Desafio e entre as noites do Modo Zumbi.
- Ataques dos 5 chefões das fases (a spec só define os do Cliente): ver `src/data/bosses.json`.
- Modo Zumbi: cada noite é uma única arena (ajudantes e depois o chefão no mesmo mapa), com 4 minutos.
- Modo Zumbi: "resiste a 2 explosões" do zumbi de escritório foi lido como "cai na 2ª explosão".
- Modo Zumbi: a areia do Museu é um piso fixo do mapa (40% mais lento), não um efeito temporário.
- Modo Zumbi: morcegos tiram 1 vida no contato; só os zumbis mordem.
- Modo Zumbi: na Investida, o Lobisomem marca a linha por 0,9 s antes de atravessá-la, para dar tempo de fugir.

**Questões em aberto**

- Vencer o Desafio do Cliente ou o Modo Zumbi libera alguma recompensa, como o Cliente jogável na Batalha Local?
- Nome final do jogo: Deploy Bomber é provisório.
- Plataforma alvo além do navegador: desktop (Steam/itch.io)?
- Arte: produção própria ou contratar um pixel artist?
