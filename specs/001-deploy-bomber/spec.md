# Deploy Bomber — Spec do Projeto

Nov 6, 2026 · @Roberto Manfrin Jr

## Visão geral

Deploy Bomber é um jogo de arena estilo Bomberman, para 1 a 4 jogadores
no mesmo computador e teclado, ambientado no dia a dia de um time de
software. Os jogadores escolhem um papel (DEV, QA, PO ou Comercial),
explodem blocos de TODO/FIXME e enfrentam bugs, reuniões e memory leaks
ao longo de 5 fases.

A mecânica que diferencia o jogo: **o mesmo bloco gera um item diferente
dependendo de quem o explodiu**. O DEV encontra linguagens de
programação, o QA encontra ferramentas de automação e bugs, o PO
encontra artefatos ágeis e o Comercial encontra leads, propostas e
comissões.

**Pilares de design**

- Humor reconhecível: toda piada vem da rotina real de quem trabalha com
  software.

- Assimetria de papéis: cada personagem joga diferente por causa dos
  itens e do especial, não só pela cor.

- Sofá local: 4 pessoas, 1 teclado, partidas de 3 minutos.

- Leitura instantânea: pixel art 16-bit, tiles de 56 px, cada papel com
  uma cor própria.

**Escopo do MVP**

- Modo História (cooperativo, 1–4 jogadores) com as 5 fases e 5 chefões.

- Modo Batalha Local (todos contra todos, 2–4 jogadores) em mapas das 5
  fases.

- Modo Desafio do Cliente (cooperativo, 1–4 jogadores): o time enfrenta
  as 4 versões do Cliente como chefões.

- 4 personagens, 24 itens exclusivos (6 por papel) e 4 itens neutros
  (Café, Code Review, Bug Crítico e Copiloto IA).

- Fora do MVP: jogo online, editor de fases, ranking global.

## Personagens

Os 4 papéis têm atributos base diferentes (escala 1–5), uma bomba
temática e uma habilidade especial com recarga. Atributos sobem com
itens até o máximo de 8.

| Papel     | Cor                 | Velocidade | Alcance | Bombas | Bomba               | Especial (recarga)                                                       | Encontra                        |
|-----------|---------------------|------------|---------|--------|---------------------|--------------------------------------------------------------------------|---------------------------------|
| DEV       | Roxo \#8B5CF6       | 3          | 3       | 2      | Bomba de Commit     | **Refatorar**: destrói o bloco à frente sem bomba (8 s)                  | Linguagens de programação       |
| QA        | Verde-água \#14B8A6 | 4          | 2       | 2      | Bomba de Teste      | **Reportar Bug**: congela inimigo ou rival em linha reta por 2 s (10 s)  | Ferramentas de automação e bugs |
| PO        | Âmbar \#F59E0B      | 2          | 3       | 3      | Bomba de Prioridade | **Repriorizar**: desarma uma bomba adjacente, inclusive de rivais (12 s) | Artefatos ágeis                 |
| Comercial | Vermelho \#EF4444   | 4          | 3       | 1      | Bomba de Proposta   | **Pitch de vendas**: puxa os itens num raio de 3 tiles até você (12 s)   | Leads, propostas e comissões    |

**Variantes de visual**

Cada papel tem 4 variantes de visual (cabelo, tom de pele, acessório e
cores da roupa). A variante é só estética: atributos, bomba e especial
não mudam.

| Papel     | Variante 1                            | Variante 2                       | Variante 3                           | Variante 4                        |
|-----------|---------------------------------------|----------------------------------|--------------------------------------|-----------------------------------|
| DEV       | Hoodie (capuz e óculos)               | Front-end (gorro e cabelo black) | Back-end (careca, barba e fone)      | Mobile (cabelo longo e óculos)    |
| QA        | Clássico (boné)                       | Automação (fone)                 | Exploratória (cabelo black e óculos) | Performance (coque)               |
| PO        | Clássica (coque)                      | Ágil (óculos)                    | Visionário (cabelo penteado)         | Estratégica (cabelo longo)        |
| Comercial | Executivo de contas (cabelo penteado) | SDR (headset)                    | Key Account (cabelo longo e óculos)  | Gerente de vendas (mulher, coque) |

**Controles no mesmo teclado**

| Jogador | Mover   | Bomba | Especial |
|---------|---------|-------|----------|
| P1      | W A S D | Q     | E        |
| P2      | T F G H | R     | Y        |
| P3      | I J K L | U     | O        |
| P4      | Setas   | Num 0 | Num .    |

Teclados comuns têm *ghosting* (limite de teclas simultâneas). O jogo
deve aceitar remapeamento de teclas e gamepads como alternativa; o
mapeamento acima é o padrão.

## Sistema de itens

Cada bloco destrutível tem 30% de chance de soltar um item. O tipo do
item é sorteado na hora da explosão, a partir da tabela do papel do dono
da bomba. Itens neutros (10% dos drops) aparecem para todos.

**DEV — linguagens de programação**

| Ícone | Item       | Efeito                                                                       |
|-------|------------|------------------------------------------------------------------------------|
| JS    | JavaScript | Velocidade +1                                                                |
| PY    | Python     | Alcance da explosão +1                                                       |
| JV    | Java       | +1 bomba simultânea                                                          |
| GO    | Go         | Goroutines: solta 2 bombas de uma vez (enfileiradas na direção do movimento) |
| RS    | Rust       | Memory safe: escudo contra 1 explosão                                        |
| C     | C          | Ponteiros: detonação manual das bombas                                       |

**QA — automação e bugs**

| Ícone | Item          | Efeito                                                                 |
|-------|---------------|------------------------------------------------------------------------|
| SE    | Selenium      | Detonação remota das bombas                                            |
| CY    | Cypress       | Velocidade +1                                                          |
| PW    | Playwright    | Cross-browser: alcance +2                                              |
| JT    | Jest / JUnit  | +1 bomba simultânea                                                    |
| PM    | Postman       | Chuta bombas como requisições                                          |
| BUG   | Bug capturado | A cada 3 bugs, gera um Relatório que congela todos os inimigos por 3 s |

**PO — artefatos ágeis**

| Ícone | Item               | Efeito                                     |
|-------|--------------------|--------------------------------------------|
| US    | User Story         | +1 bomba simultânea                        |
| BL    | Backlog priorizado | Alcance +1                                 |
| SP    | Sprint             | Velocidade +1                              |
| RM    | Roadmap            | Revela itens escondidos no mapa por 5 s    |
| PI    | Post-it            | Cria um bloco temporário (barreira de 6 s) |
| AL    | Alinhamento        | Atordoa rivais adjacentes por 1,5 s        |

**Comercial — vendas**

| Ícone | Item             | Efeito                                               |
|-------|------------------|------------------------------------------------------|
| \$\$  | Comissão         | +1 bomba simultânea                                  |
| LD    | Lead quente      | Alcance +1                                           |
| MT    | Meta batida      | Velocidade +1                                        |
| CT    | Contrato fechado | Escudo contra 1 explosão                             |
| FU    | Follow-up        | A bomba explode de novo 1 s depois                   |
| DS    | Desconto         | Rivais atingidos pela próxima explosão perdem 1 item |

**Itens neutros (todos os papéis)**

| Ícone | Item        | Efeito                                                                                                          |
|-------|-------------|-----------------------------------------------------------------------------------------------------------------|
| CF    | Café        | Invencível por 5 s                                                                                              |
| CR    | Code Review | Mostra onde há itens nos blocos próximos                                                                        |
| XX    | Bug Crítico | Item ruim: inverte os controles por 8 s                                                                         |
| IA    | Copiloto IA | Por 10 s destaca a rota segura e o alcance das bombas; com 20% de chance ele "alucina" e indica uma rota errada |

Pesos de drop iniciais: itens de atributo (velocidade, alcance, bombas)
60%, itens especiais 30%, neutros 10%. Valores a ajustar em playtest.

## Fases

O jogo tem 5 fases em sequência, do primeiro dia de sprint ao deploy de
sexta-feira. Cada fase tem 3 arenas (15×11 tiles) e termina com um
chefão; cada uma acrescenta uma mecânica nova.

| \#  | Fase            | Inimigos                         | Mecânica nova                                                   | Chefão                      |
|-----|-----------------|----------------------------------|-----------------------------------------------------------------|-----------------------------|
| 1   | Open Space      | Bug                              | Tutorial: bombas, itens por papel                               | Impressora Travada          |
| 2   | Sala de Reunião | Reunião, Bug                     | Reuniões param o jogador que encostam nelas por 2 s             | A Reunião que Era um E-mail |
| 3   | Data Center     | Memory Leak                      | Memory Leaks se dividem em dois se não forem destruídos em 10 s | Servidor 500                |
| 4   | Código Legado   | Merge Conflict, Bug              | Merge Conflicts trocam os jogadores de lado no mapa             | O Monolito                  |
| 5   | Deploy de Sexta | Bug, Merge Conflict, Memory Leak | Relógio acelera nos últimos 60 s; blocos pegam fogo             | Bug em Produção             |

**Elementos do mapa**

- Bloco fixo: rack de servidor (indestrutível), em grade a cada 2 tiles.

- Bloco destrutível: caixas de TODO, FIXME e HACK.

- Tempo por arena: 3 minutos. Ao zerar, a arena começa a fechar pelas
  bordas ("deadline").

## Modo Desafio do Cliente

O Cliente não é jogável: suas 4 versões são os chefões de um modo
próprio. De 1 a 4 jogadores (DEV, QA, PO e Comercial) cooperam e
enfrentam os chefões em sequência, cada um na sua arena.

| \#  | Chefão                  | Arena            | Resistência (acertos) | Ataque 1                                                            | Ataque 2                                                   |
|-----|-------------------------|------------------|-----------------------|---------------------------------------------------------------------|------------------------------------------------------------|
| 1   | Executivo               | Sala de Reunião  | 6                     | **Mudança de escopo**: a cada 20 s embaralha os blocos destrutíveis | **Reunião surpresa**: invoca 2 Reuniões                    |
| 2   | Startup                 | Coworking        | 7                     | **Pivot!**: inverte os controles de todos por 5 s                   | **MVP pra ontem**: o relógio corre 2× mais rápido por 10 s |
| 3   | Investidora             | Sala do Conselho | 8                     | **Corte de orçamento**: cada jogador perde 1 bomba por 8 s          | **Chuva de moedas**: moedas-bomba caem em 6 tiles marcados |
| 4   | Dono da empresa (final) | Cobertura        | 10                    | **Reestruturação**: os racks fixos mudam de lugar                   | **Bônus cancelado**: some com todos os itens do chão       |

- Cada chefão é uma entidade Boss em data/bosses.json (variante visual,
  arena, resistência, ataques e intervalos).

- Em aberto: vencer o desafio libera alguma recompensa, como o Cliente
  jogável na Batalha Local?

## Histórias de usuário e requisitos

**Histórias prioritárias**

1.  Como grupo de amigos, quero jogar em até 4 pessoas no mesmo teclado,
    para jogar junto sem configurar rede.

    - Dado 4 jogadores na seleção, quando todos confirmam, a partida
      começa com cada um no seu canto do mapa.

2.  Como jogador DEV, quero encontrar linguagens ao explodir blocos,
    para sentir que meu papel importa.

    - Dado que a bomba do DEV destrói um bloco com drop, o item que
      aparece é da tabela DEV ou neutra.

3.  Como jogador QA, quero capturar bugs e transformá-los em relatórios,
    para ter uma estratégia própria.

    - Dado 3 bugs coletados, o 3º gera um Relatório e zera o contador.

4.  Como jogador, quero escolher a fase no menu, para revisitar a fase
    de que mais gosto.

5.  Como jogador, quero remapear minhas teclas, para contornar limites
    do meu teclado.

**Requisitos funcionais**

| ID     | Requisito                                                                                                      |
|--------|----------------------------------------------------------------------------------------------------------------|
| FR-001 | O jogo suporta 1 a 4 jogadores locais, cada um com seu conjunto de teclas.                                     |
| FR-002 | Cada jogador escolhe um papel único (DEV, QA, PO, Comercial) e uma das 4 variantes de visual antes da partida. |
| FR-003 | Uma bomba explode 3 s após ser colocada, em cruz, com o alcance do dono.                                       |
| FR-004 | Explosões encadeiam outras bombas no alcance.                                                                  |
| FR-005 | O drop de item usa a tabela do papel do dono da bomba que destruiu o bloco.                                    |
| FR-006 | Qualquer jogador pode pegar qualquer item; o efeito vale para quem pegou.                                      |
| FR-007 | Cada papel tem uma habilidade especial com recarga exibida no HUD.                                             |
| FR-008 | O HUD mostra, por jogador: vidas, pontuação e itens ativos; ao centro, tempo e fase.                           |
| FR-009 | Modo História: jogadores cooperam; a arena termina quando todos os inimigos caem.                              |
| FR-010 | Modo Batalha: vence o último jogador vivo; empate se todos caem no mesmo frame.                                |
| FR-011 | Cada fase termina com um chefão com padrão de ataque próprio.                                                  |
| FR-012 | As teclas de cada jogador podem ser remapeadas e salvas localmente.                                            |
| FR-013 | O progresso do Modo História (fases liberadas, recorde) é salvo localmente.                                    |

**Requisitos não funcionais**

- Roda a 60 fps em notebook comum, em navegador desktop recente.

- Resolução lógica fixa 1280×800, escalonada sem borrão (pixel art
  nítida).

- Entrada com latência máxima de 1 frame.

## Modelo de dados

Papéis, itens e fases ficam em arquivos JSON de configuração; assim,
balancear o jogo não exige mudar código.

| Entidade  | Campos principais                                                                     | Origem              |
|-----------|---------------------------------------------------------------------------------------|---------------------|
| Role      | id, nome, cor, velocidade, alcance, bombas, bombaTipo, especialId, tabelaDropId       | data/roles.json     |
| Item      | id, ícone, nome, papel (ou neutro), efeito, duração, peso                             | data/items.json     |
| DropTable | papel, lista de (itemId, peso)                                                        | data/items.json     |
| Special   | id, efeito, recarga, alcance                                                          | data/roles.json     |
| Player    | slot (P1–P4), roleId, teclas, posição, vidas, atributos, itensAtivos, recargaEspecial | em memória          |
| Bomb      | dono, posição, alcance, timer, flags (remota, atravessa)                              | em memória          |
| Enemy     | tipo, posição, vida, IA                                                               | data/enemies.json   |
| Stage     | id, nome, tema, arenas (mapas 15×11), inimigos, chefão, mecânica                      | data/stages/\*.json |
| SaveData  | fases liberadas, recordes, teclas                                                     | localStorage        |

Exemplo de entrada em items.json:

{ "id": "py", "icon": "PY", "name": "Python", "role": "DEV", "effect": {
"stat": "range", "add": 1 }, "weight": 20 }

## Plano técnico

Proposta: jogo web em TypeScript com Phaser 3, empacotado com Vite. Roda
no navegador e pode virar app desktop depois (Electron ou Tauri) sem
reescrever.

| Camada    | Escolha             | Motivo                                                |
|-----------|---------------------|-------------------------------------------------------|
| Linguagem | TypeScript          | Tipos para entidades e tabelas de drop                |
| Engine    | Phaser 3            | Tilemaps, sprites, input de teclado e gamepad prontos |
| Build     | Vite                | Recarga rápida no desenvolvimento                     |
| Mapas     | Tiled (.json)       | Editor visual de arenas 15×11                         |
| Arte      | Aseprite            | Sprites 16×16 e animações                             |
| Testes    | Vitest + Playwright | Regras puras (drops, explosões) e fluxo de menus      |

<img src="media/image1.png" style="width:6in;height:2.53571in"
alt="arquitetura · 6 módulos" />

arquitetura · 6 módulos

Os sistemas leem as regras dos arquivos JSON; as cenas só orquestram.
Assim, a lógica de drop por papel fica testável sem abrir o jogo.

**Estrutura de pastas**

deploy-bomber/  
├── specs/  
│ └── 001-deploy-bomber/  
│ ├── spec.md \# este documento  
│ ├── plan.md \# plano técnico  
│ └── tasks.md \# tarefas por marco  
├── public/  
│ ├── sprites/ \# dev.png, qa.png, po.png, cliente.png, inimigos  
│ ├── tiles/ \# rack, caixas TODO/FIXME/HACK, pisos por fase  
│ └── audio/  
├── src/  
│ ├── main.ts  
│ ├── scenes/ \# Title, CharacterSelect, Arena, Boss, Results  
│ ├── systems/ \# movement, bombs, explosions, drops, specials, ai  
│ ├── entities/ \# Player, Bomb, Enemy, Item  
│ ├── input/ \# keymaps.ts, gamepad.ts  
│ ├── ui/ \# hud.ts, menus.ts  
│ └── data/  
│ ├── roles.json  
│ ├── items.json  
│ ├── enemies.json  
│ └── stages/ \# 01-open-space.json … 05-deploy-sexta.json  
└── tests/  
├── unit/ \# drops.test.ts, explosions.test.ts  
└── e2e/ \# menu-to-arena.spec.ts

## Tarefas, critérios de sucesso e questões em aberto

**M1 — Arena jogável (1 jogador)**

- [ ] Projeto Vite + Phaser + TypeScript com cena de arena 15×11

- [ ] Movimento em grade, bomba com timer de 3 s e explosão em cruz

- [ ] Blocos fixos e destrutíveis; explosões em cadeia

- [ ] Testes unitários de explosão

**M2 — 4 jogadores e papéis**

- [ ] 4 mapas de teclas padrão e tela de remapeamento

- [ ] Tela de seleção com os 4 papéis e atributos base

- [ ] Habilidades especiais com recarga no HUD

- [ ] Modo Batalha Local

**M3 — Itens por papel**

- [ ] items.json com as 4 tabelas + neutros

- [ ] Sistema de drop pelo papel do dono da bomba, com testes

- [ ] Efeitos dos 28 itens

**M4 — 5 fases e chefões**

- [ ] 15 arenas no Tiled (3 por fase) com tema visual próprio

- [ ] Inimigos: Bug, Reunião, Memory Leak, Merge Conflict

- [ ] 5 chefões e Modo História cooperativo com save local; Desafio do
  Cliente com 4 chefões

**M5 — Polimento**

- [ ] Sprites finais, animações e áudio

- [ ] Playtest com 4 pessoas e ajuste dos pesos de drop

**Critérios de sucesso**

- 4 pessoas jogam uma partida completa no mesmo teclado sem travar
  teclas no mapeamento padrão.

- Em playtest, jogadores sabem dizer que item cada papel encontra depois
  de 1 partida.

- Nenhum papel vence mais de 35% das partidas de Batalha em 40 partidas
  de teste.

- 60 fps estáveis com 4 jogadores, 8 bombas e 6 inimigos na tela.

**Questões em aberto**

- Item de outro papel: o efeito vale para quem pegou (proposta atual) ou
  só o dono do papel pode pegar?

- Nome final do jogo: Deploy Bomber é provisório.

- Plataforma alvo além do navegador: desktop (Steam/itch.io)?

- Arte: produção própria ou contratar um pixel artist?
