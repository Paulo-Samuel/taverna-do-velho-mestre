# Taverna do Velho Mestre — estado do projeto (para agentes)

Instruções de instalação e mapa do código: ver CLAUDE.md. Aqui fica o histórico da auditoria e das melhorias.

## Auditoria e plano (nov/2026)
- Auditoria por agentes Fable (workflow `arquitetar-taverna`): 182 propostas -> 82 no plano (24 pacotes W01..W24 em 6 ondas); 100 ficaram fora (ex.: narrar ao vivo, dano superficial/agravado V5, grimório PF2e, combate leve).
- Plano legível: `docs/PLANO-MELHORIAS.md` (objetivos, critérios, arquivos por pacote).
- Execução (workflow `executar-melhorias-taverna`): por pacote, implementador -> verificador adversarial -> corretor -> reverificação; por onda, integrador (tsc, eslint, testes, 1 commit) + testador com mestre real (turnos limitados).
- Ondas 1-2 (Fable): commits d52f710, 5dddc16, 9c516c3. Ondas 3-6 (Opus 5.5): 21203ff, 15379e5, b4c26c1, de43aa5, f2e1806, 34aa3d9, bdb5319. Tudo no main e no GitHub; build de produção feito em 08/11/2026.

## Pendências conhecidas
- Testes `tests/w09-historia-personagem.test.mjs` falharam (3) rodando sem servidor no ar; reconferir com a taverna ligada.
- Baixa gravidade: W07 agrupamento "⋯" (voz/música/convite) e "esconder cabeçalho"; "Anteriormente…" após fim de sessão sem teste com mestre real; teto da Potência de Sangue por Geração sem conferir no livro.
- Itens visuais fora do plano: emojis -> ícones, textos de 9-11px, contraste do vermelho, favicon/manifest, destaque de crítico.

## Regras de trabalho
- Servidor só pelo atalho (nunca `npm run dev/start` na sessão do agente); porta 3300; testes em 3301/3302.
- RAM: `NODE_OPTIONS=--max-old-space-size=4096`, uma tarefa pesada por vez.
- Campanhas de teste levam "(teste)" no nome e são apagadas ao fim; nunca tocar nas campanhas 30, 33 e 43.
- Workflows: scripts em `C:\Users\paulo\.claude\projects\C--Users-paulo-projetos-cloneprojetosOS\59de5f57-6b61-4b65-88d8-aadea2a7b6e0\workflows\scripts\`; retomar com `resumeFromRunId` mantém cache (não mude prompt/modelo de ondas já feitas).
- Mesmo processo de auditoria foi pedido para Gradus Cordis e oficina-cta (só planejar; Fable após o reset semanal).
