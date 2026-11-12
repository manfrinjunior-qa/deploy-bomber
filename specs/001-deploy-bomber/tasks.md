# Deploy Bomber — Tarefas por marco

Status em 12/11/2026.

## M1 — Arena jogável (1 jogador)
- [x] Projeto Vite + Phaser + TypeScript com cena de arena 15×11
- [x] Movimento em grade (com assistência de quina), bomba com timer de 3 s e explosão em cruz
- [x] Blocos fixos e destrutíveis; explosões em cadeia
- [x] Testes unitários de explosão (`tests/unit/explosions.test.ts`)

## M2 — 4 jogadores e papéis
- [x] 4 mapas de teclas padrão e tela de remapeamento (Opções, salvo em localStorage)
- [x] Tela de seleção com os 4 papéis, 4 variantes de visual e atributos base
- [x] Habilidades especiais com recarga no HUD
- [x] Modo Batalha Local (3 vidas, vence o último de pé, empate no mesmo frame)
- [x] Gamepads como alternativa

## M3 — Itens por papel
- [x] items.json com as 4 tabelas + neutros (pesos 60/30/10)
- [x] Drop pela tabela do papel do dono da bomba, com testes (`tests/unit/drops.test.ts`)
- [x] Efeitos dos 28 itens

## M4 — 5 fases e chefões
- [~] 15 arenas (3 por fase) + arena de chefão, com tema visual por fase — geradas por script em JSON, não no Tiled
- [x] Inimigos: Bug, Reunião, Memory Leak, Merge Conflict
- [x] 5 chefões e Modo História cooperativo com save local; Desafio do Cliente com 4 chefões
- [x] Mecânicas por fase: reuniões travam 2 s, leaks se dividem em 10 s, merge conflict troca de lado, relógio acelerado e fogo na fase 5
- [x] Deadline: arena fecha pelas bordas quando o tempo zera

## M5 — Polimento
- [~] Sprites e animações: pixel art gerada por código (placeholder de qualidade, não arte final de Aseprite)
- [~] Áudio: efeitos sintetizados via WebAudio; sem música
- [ ] Playtest com 4 pessoas e ajuste dos pesos de drop

## Decisões tomadas onde a spec estava em aberto
- Item de outro papel: o efeito vale para quem pegou (proposta atual da spec).
- Detonação manual (C / Selenium): tecla de bomba sem espaço para nova bomba detona a mais antiga; bombas remotas explodem sozinhas após 12 s.
- Post-it e Alinhamento agem ao serem coletados (bloco atrás do jogador / atordoa quem estiver adjacente).
- No cooperativo, quem caiu volta na arena seguinte com 1 vida.
- Atributos, itens e escudos são mantidos entre arenas no Modo História / Desafio.
- Ataques dos 5 chefões das fases (a spec só define os do Cliente): ver `src/data/bosses.json`.
