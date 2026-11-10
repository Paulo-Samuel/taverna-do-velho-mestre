# Taverna do Velho Mestre — estado do projeto (para agentes)

Instruções de instalação e mapa do código: ver CLAUDE.md. Aqui fica o histórico da auditoria e das melhorias.

## Auditoria e plano (nov/2026)
- Auditoria por agentes Fable (workflow `arquitetar-taverna`): 182 propostas -> 82 no plano (24 pacotes W01..W24 em 6 ondas); 100 ficaram fora (ex.: narrar ao vivo, dano superficial/agravado V5, grimório PF2e, combate leve).
- Plano legível: `docs/PLANO-MELHORIAS.md` (objetivos, critérios, arquivos por pacote).
- Execução (workflow `executar-melhorias-taverna`): por pacote, implementador -> verificador adversarial -> corretor -> reverificação; por onda, integrador (tsc, eslint, testes, 1 commit) + testador com mestre real (turnos limitados).
- Ondas 1-2 (Fable): commits d52f710, 5dddc16, 9c516c3. Ondas 3-6 (Opus 5.5): 21203ff, 15379e5, b4c26c1, de43aa5, f2e1806, 34aa3d9, bdb5319. Tudo no main e no GitHub; build de produção feito em 08/11/2026.

## Pendências conhecidas
- Testes `tests/w09-historia-personagem.test.mjs` falharam (3) rodando sem servidor no ar; reconferir com a taverna ligada.
- Baixa gravidade: W07 "esconder cabeçalho"; "Anteriormente…" após fim de sessão sem teste com mestre real; teto da Potência de Sangue por Geração sem conferir no livro. (O agrupamento "⋯" de voz/música/convite no cabeçalho da mesa foi feito em nov/2026.)
- Itens visuais (nov/2026): feitos favicon/manifest (`src/app/icon.png`, `apple-icon.png`, `manifest.ts`), contraste do vermelho (só o tema `padrao` reprovava), piso de 11px com prosa em 12px, emojis -> ícones (`src/components/icones.tsx`: `<Icone>` para JSX e `<TextoComIcones>` para strings/dados) e destaque persistente de crítico (anel + halo no cartão, além do brilho de chegada). Falta a revisão visual com a taverna ligada. Restos de emoji conhecidos: `✋ manual`, `🗡 dano`, texto de tooltip do leitor e campos `icone` de `comecos.ts`/`historia.ts` (saem como ícone onde são renderizados; nas classes de sistema não são exibidos).

## Plano Greg (nov/2026): ideias do Old Greg's Tavern, feitas do jeito da taverna
- Plano: `docs/PLANO-GREG.md` (G01..G13). Tudo feito ou descartado; commits 8b2aa33 (onda B), 1ffb123 (onda A + visual), af7e7eb, cb08b52 (G06), 00fd8c8 (G09, G11, G13), c10f156 (ajustes do tutorial).
- Onda A: G03 selo do tipo de teste nas sugestões (`historia/tipo-teste.ts`), G04 seis acabamentos do d20 (`dado-3d/aparencias.ts`, chave `taverna:d20-aparencia`), G05 "Noite N · M missões em aberto" na home (`lib/progresso-missoes.ts`).
- Onda B: G01 campo `atitude` do NPC no diário (8 valores, `lib/atitude-npc.ts`; valor fora da lista dá erro ao mestre; "Humor" no códex); G02 faixa "Pessoas por aqui" (`historia/pessoas-aqui.tsx` + lógica em `pessoas-presentes.ts`: NPC vivo citado na narração do último turno). Atenção: nunca dois arquivos .ts/.tsx com o mesmo nome base (o .ts ganha no import).
- G06 vitrine `/aventuras` com capas SVG (`lib/aventuras/capa-arte.ts`, `components/aventuras/capa-aventura.tsx`, `lib/aventuras/link.ts`). Já existiam 25 aventuras prontas; G07 (desfazer/refazer) e G08 (livro, PDF, Markdown, JSON) também já existiam e foram descartados.
- G09 oito retratos prontos no passo "Rosto" (`historia/retrato/arquetipos-retrato.ts`); G11 aventura-tutorial `lanterna-da-ponte-velha` (campo `tutorial` em `aventuras/tipos.ts`, sempre a primeira da lista; cartão "Primeira vez?" na home sem campanhas); G13 seção "Preferências" em `/config` (`components/config/painel-preferencias.tsx`).
- Jogadas reais com o mestre: humor "medo" registrado e faixa vista (campanha 31); tutorial jogado até o fim (campanhas 245 e 246, "(teste)"): segue as 4 etapas e conclui a missão. Não visto na tela: cartão "Primeira vez?", layout em 375px de retratos e preferências.
- Onda D (09/11/2026, G14..G18, commit 114e038): base visual com 8 matizes, estrelas e `btn-palco` (`globals.css`, `temas.css`, `components/cabecalho-pagina.tsx`, `rodape-casa.tsx`); home com "Jogar agora com herói pronto" (`app/nova/jogar-agora-acoes.ts`, `lib/inicio/`, `components/inicio/`); jogada de exemplo, portas de entrada e "Perguntas de balcão"; selos de perícia e de 1/20 natural na ação (`historia/selo-desfecho.ts`, `selos-da-acao.tsx`); campo de ação com convite e contador. Visto na tela: home, mesa e 375px. Não visto: clicar em "Jogar agora" (cria campanha real e gasta turno do mestre) e o selo numa rolagem de verdade.
- Onda E (09/11/2026, auditoria visual, plano em `docs/PLANO-VISUAL.md`): 8 auditores com capturas de tela (108 achados), 11 pacotes V01..V11 e uma rodada de verificação visual (37 defeitos corrigidos). Novos: `btn-perigo`, `btn-perigo-cheio`, `components/faixa-aviso.tsx`, `link-voltar.tsx`, `secao-cartao.tsx`, 10 ícones, capa própria por aventura, diálogo de excluir no lugar do `confirm()`, título por página (`title.template` no layout), README com galeria (`docs/prints/readme-NN-*.png`, receita em `docs/prints/LEIA-ME.md`). Captura sem janela: Chrome `--headless=new --screenshot` com `--timeout=9000` (com `--virtual-time-budget` a mesa trava por causa do SSE; largura mínima ~500px). Pendências listadas no fim do PLANO-VISUAL: 375px real não conferido em todas as telas, estados que exigem POST não vistos, captura de PF2e fora do README (mostra nome real em "jogado por"), decidir licença do código e o que do AGENTS.md fica público.
- Fora de escopo por serem de plataforma pública: créditos, indicação, push, consentimento de IA/denúncia, pixels, música em streaming. Ideias abertas: capas mais variadas por aventura, fork de campanha, telas do Greg não vistas (Enigmas, abas do painel, criação).

## Regras de custo (sessões de agente)
- Antes de abrir qualquer arquivo, mapear com `glob`/`grep`; ler só o trecho necessário (`offset`/`limit`), nunca despejar o arquivo inteiro.
- Responder com o diff (o que mudou, onde e por quê), não com o conteúdo inteiro dos arquivos.
- Uma sessão por tarefa: não misturar frentes no mesmo histórico; ao trocar de tarefa, abrir sessão nova.

## Regras de trabalho
- Servidor só pelo atalho (nunca `npm run dev/start` na sessão do agente); porta 3300; testes em 3301/3302.
- RAM: `NODE_OPTIONS=--max-old-space-size=4096`, uma tarefa pesada por vez.
- Campanhas de teste levam "(teste)" no nome e são apagadas ao fim; nunca tocar nas campanhas 30, 33 e 43.
- Workflows: scripts em `C:\Users\paulo\.claude\projects\C--Users-paulo-projetos-cloneprojetosOS\59de5f57-6b61-4b65-88d8-aadea2a7b6e0\workflows\scripts\`; retomar com `resumeFromRunId` mantém cache (não mude prompt/modelo de ondas já feitas).
- Mesmo processo de auditoria foi pedido para Gradus Cordis e oficina-cta (só planejar; Fable após o reset semanal).
