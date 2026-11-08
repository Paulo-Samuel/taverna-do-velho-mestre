# Plano de melhorias da Taverna (auditoria Fable, 07/11/2026)

24 pacotes em 6 ondas, escolhidos entre 182 propostas da auditoria. **Ondas 1 e 2: feitas e no GitHub** (commits d52f710, 5dddc16, 9c516c3). **Ondas 3 a 6: pendentes.** Dentro de cada onda os pacotes mexem em arquivos diferentes e podem rodar em paralelo.

Fluxo usado em cada pacote: implementador, verificador adversarial, corretor se reprovar. Por onda: integrador (tsc, eslint, testes, commit) e teste com o mestre real.

## Fora do plano (ciclo futuro)

- **P20**: Incorporada integralmente ao W11 (P172 é a especificação dela).
- **P24**: Superada por P174 (W11): o resumo encolhe e o diário é dono dos fatos; linha do tempo só de acréscimo reabriria o crescimento do prompt.
- **P22**: Narrar ao vivo é entregue por P180, que decide o relógio do leitor; ambas tocam index.ts, provedores e leitor-cenas.tsx e ficam para o próximo ciclo, depois do orçamento do prompt e do fluxo de fim da noite.
- **P180**: Decodificador incremental de JSON no CLI e na API mais mudança no relógio do leitor é arriscado e disputa index.ts, use-mesa.ts e leitor-cenas.tsx com as ondas 3 a 5; fazer num ciclo próprio com os testes do W01 já no lugar.
- **P112**: Depende do relógio decidido em P180 (voz segue o revelar); fica junto dele.
- **P175**: Combate leve por contrato toca 19 arquivos incluindo as duas mesas, codex e linha-dado; o contrato (campo combate) entra no W06 e a contradição de texto é resolvida por P97, a FaixaEmLuta e o esquema variável de atualizar_cena ficam para um ciclo próprio.
- **P66**: Superada por P175 (mesma FaixaEmLuta sem números); adiada junto.
- **P06**: Diablerie exige conferir dificuldade e Manchas no livro antes de fixar números; fica depois de P26 e P35 (W23) para reaproveitar oposição e poderes.
- **P27**: Trilha de dano superficial/agravado reescreve como o pv do V5 é guardado, migra fichas e mexe em descansar, ajuste e painel; risco 3,3 e esforço 4 para um ciclo próprio depois do contrato e dos testes.
- **P143**: Grimório de PF2e (~85 magias, criação, ficha e parser) é o maior item de conteúdo e esforço 5; fazer em ciclo próprio começando por truques e 1º círculo.
- **P149**: Catálogo de talentos e parser de ações é grande e frágil; começar só pelo registro em texto livre num ciclo futuro depois de P143.
- **P11**: Retomar filas no boot e log de falhas disputam index.ts e instrumentation.ts com W11/W21/W15; o 'tentar de novo' já entra no W16 e o log no W24.
- **P77**: Amarrar rotas à presença tem casos de borda (host no celular, presença em memória) e disputa index.ts e rerrolar/route.ts com W16/W21; reavaliar depois do cartão de decisão do W16 (que já resolve quem decide a rerrolagem).
- **P78**: Ausente na rodada depende de sinal de vida confiável (celular dormindo) e de index.ts; fica depois de W05 e W21.
- **P95**: Estado 'aventura concluída' toca prompt.ts, ferramentas/diario.ts e ajustes, todos ocupados nas ondas 3 a 5; fazer no próximo ciclo.
- **P110**: Efeitos sonoros ligam em pedido-teste, cartao-dado, parada-dados e leitor-cenas, todos dos pacotes W16/W22/W23; adiar para depois que esses arquivos estabilizarem.
- **P154**: Carregar noites anteriores mexe em db.ts, mesa.ts e use-mesa.ts já tocados nas ondas 3 a 5 e a campanha 43 tem folga (208 de 300 mensagens); fazer logo após W21.
- **P152**: Fechamento retroativo é um segundo caminho de fim da noite; o fluxo único do W21/W22 e as noites inferidas cobrem o essencial.
- **P53**: Fases do turno precisam de evento novo em index.ts e UI nas duas mesas; adiar para junto de P180.

## Onda 1 (feita)

### W01. d20 3D de volta, perícias do PF2e e base de testes (node:test)

- **Tamanho:** G. **Jogadas com o mestre real:** 0.
- **Objetivo:** Corrigir usaD20 (extrair para usa-d20.ts puro, decidir por dadoPrincipal do pedido com fallback em regex que casa 1d20, 2d20kh1, d20) para o cartão de teste voltar ao d20 3D com destaque de 20/1 natural, e o aria-live só dizer 'Rolando' quando rola de fato. Corrigir o parser de testes do PF2e: parêntese primeiro (Recordar Conhecimento (Religião)), bordas de palavra nas regex de ataque/magia ('Natação' não é ataque), 'Identificar magia' por tradição, aliases novos (pular, natação, correr, levantar, decifrar). Criar a base de testes sem dependência nova: script npm test com node --test e type stripping do Node 24, stub de server-only por loader, gerador injetável em dados.ts, testes de dados.ts, regras do vtm5 (parada, Fome, crítico bestial) e do leitor puro, e scripts golden:update/golden:check (JSON de definirFerramentas por sistema e promptDoSistema de uma campanha-fixture) que o W06 usará para provar que o refactor não mudou nada.
- **Propostas:**
  - P01: d20 3D sumiu dos testes: usaD20 não casa "1d20+2"
  - P137: Nomes de teste mal lidos: "Recordar Conhecimento (Religião)" usa a melhor perícia e "Natação" vira Ataque
  - P86: Base mínima de testes para dados, heurísticas do mestre, leitor e regras do Vampiro
- **Critérios de aceite:**
  - usaD20 devolve true para '1d20+2', '2d20kh1+3', 'd20', '2d20kl1' e false para '1d100', '8d10 (1 de Fome)', '4dF+1', '2d6+1'; pedido sem expressao mantém d20 3D
  - No modo história um pedido novo de Intimidação mostra o d20 3D girando, botão 'Rolar o dado' no singular e brilho em 20/1 natural
  - 'Recordar Conhecimento (Religião)' usa Religião; 'Natação' usa Atletismo e não vira Ataque; 'Identificar magia' devolve perícia de conhecimento; 'Pular o abismo' é reconhecido
  - npm test roda em menos de 10 s sem instalar dependência e cobre dados.ts, vtm5 testes, usa-d20, pf2e calcular e funções puras do leitor
  - npm run golden:update e golden:check existem e documentam no topo do script como usar
- **Arquivos:** `src/components/historia/pedido-teste.tsx`, `src/components/historia/usa-d20.ts`, `src/components/historia/parada-dados.tsx`, `src/components/historia/dado-3d.tsx`, `src/lib/sistemas/pf2e.ts`, `src/lib/sistemas/pf2e/pericias.ts`, `src/lib/dados.ts`, `package.json`, `tests/`

### W03. Achar o Claude Code de verdade: caminho sumido, shim do npm, versão mínima

- **Tamanho:** M. **Jogadas com o mestre real:** 1.
- **Objetivo:** Reescrever resolverExecutavelClaude: caminho configurado que não existe não é devolvido nem cacheado (motivo guardado) e cai na descoberta; descoberta no Windows por where preferindo .exe e depois .cmd (ignorando shim sem extensão), %USERPROFILE%\.local\bin, Claude-Data\claude_*\claude-code\<maior versão>\*\claude.exe e %APPDATA%\npm; shim .cmd do npm resolvido para o claude.exe/cli.js real (sem shell, sem DEP0190); no caminho shell de último recurso, matar a árvore com taskkill /T /F; CLAUDE_BIN=desktop e CLAUDE_BIN apontando para pasta. /config mostra 'o executável configurado não existe mais, encontrei X [Usar este]' (grava binCli) e o caminho real que será executado. Constantes CLAUDE_VERSAO_MINIMA/TESTADA com comparação semver própria, aviso no /config e erro de compatibilidade 'unknown option' em português. Interface documentada para o W04: CLAUDE_BIN=desktop, mínimo 2.1.45, testado 2.1.316.
- **Propostas:**
  - P115: CLAUDE_BIN congelado na pasta versionada do app desktop morre a cada atualização do Claude
  - P83: Claude Code sem CLAUDE_BIN: resolver o shim do npm e matar a árvore de processos
  - P116: Versão mínima do Claude Code, flags ocultas e "unknown option" sem diagnóstico
- **Critérios de aceite:**
  - Com o .env.local atual (CLAUDE_BIN em pasta 2.1.308 inexistente) o /config acusa que o caminho sumiu, oferece o 2.1.317 mais novo e o botão Usar este grava e o mestre passa a responder
  - where devolvendo shim sem extensão antes de claude.cmd não causa ENOENT
  - Matar o turno ('interromper') não deixa processo claude/node órfão (verificar com tasklist)
  - Erro 'unknown option' vira mensagem em português citando a flag, a versão e a testada
  - Teste unitário da comparação semver e da escolha da maior versão em pastas simuladas
- **Arquivos:** `src/lib/mestre/provedor-cli.ts`, `src/app/config/claude-local.ts`, `src/app/config/formulario.tsx`, `src/app/config/acoes.ts`, `.env.example`

### W04. Atalho que sobrevive a atualizações, atualizar-taverna e CLAUDE.md como roteiro

- **Tamanho:** M. **Jogadas com o mestre real:** 0.
- **Objetivo:** iniciar-taverna.ps1: hash de package-lock contra node_modules\.taverna-lock com npm ci (fallback npm install), .env.local fora do gatilho de build, nova tentativa npm ci+build antes de Parar, Start-Transcript em data\logs\atalho-<data>.log (limpa 14 dias), Parar mostra o log, código de saída do next start com dicas (EADDRINUSE, database is locked), NoAr só aceita resposta que a taverna marca (cabeçalho x-taverna no proxy.ts). Novo atualizar-taverna.ps1/.cmd (git pull --ff-only com mensagens em português, caminho para quem veio de ZIP, recusa se a taverna estiver no ar). Reescrever CLAUDE.md como checklist para o agente do amigo (reabrir o Claude Code após winget, Node LTS, pasta fora de OneDrive, nunca rodar npm run dev na sessão, o que NUNCA fazer, como atualizar, pedir ajuda) e README com seção Atualizar e requisitos (Node 24, CLAUDE_BIN=desktop, Claude Code mínimo 2.1.45).
- **Propostas:**
  - P117: Atalho não reinstala dependências depois do git pull e não existe caminho de atualização
  - P118: Janela do atalho fecha antes de dar para ler; next start sem tratamento; porta ocupada vira "já está aberta"
  - P120: CLAUDE.md como roteiro do Claude Code do amigo: guarda-corpos e os passos que travam de verdade
- **Critérios de aceite:**
  - Depois de alterar package-lock.json o atalho roda npm ci sozinho e sobe sem janela vermelha
  - Mudar só o .env.local não recompila
  - Porta 3300 ocupada por outro programa não vira 'já está aberta' e mostra mensagem clara com o caminho do log
  - Falha do next start mantém a janela aberta e imprime o código e o log
  - atualizar-taverna.cmd funciona com e sem .git e se recusa com a taverna no ar
  - CLAUDE.md tem as regras 0 a 7 da proposta e README documenta Atualizar
- **Arquivos:** `iniciar-taverna.ps1`, `iniciar-taverna.cmd`, `atualizar-taverna.ps1`, `atualizar-taverna.cmd`, `src/proxy.ts`, `README.md`, `CLAUDE.md`

### W05. Rede: espectador por padrão, hot-seat correto, queda de conexão visível e 'o mestre lê o resultado'

- **Tamanho:** G. **Jogadas com o mestre real:** 0.
- **Objetivo:** Aparelho novo pela rede entra como espectador (EstadoMesa.local; personagem ativo só no local ou com 1 personagem), SeletorAtivo com 'só assistindo · escolher personagem', chip com cadeado para personagem com dono online, podeRolarPara exige presença do próprio clienteId pela rede. Passe de vez do modo rodada pula personagens em uso em outro aparelho (helper emUsoPorOutroAparelho, 📱, confirmação ao enviar por personagem alheio). Novo helper http.ts com try/catch em todos os fetch de use-mesa, estado conexao conectando|ok|caiu (sem vermelho antes da primeira conexão), faixa 'Sem sinal da taverna' após 3 s caído, botões Agir/Rolar/Aceitar desabilitados e texto preservado. Quando a fila bruta tem só ação interna e o mestre não está ocupado, mostrar 'O mestre lê o resultado…'.
- **Propostas:**
  - P73: Aparelho novo pela rede vira o primeiro personagem da mesa
  - P76: Hot-seat passa a vez para personagem em uso em outro aparelho
  - P09: fetch sem catch deixa a mesa muda quando a taverna cai
- **Critérios de aceite:**
  - Contexto novo sem localStorage abrindo /mesa/[id] pelo IP da rede não rola nem age pelo personagem[0] e vê o convite para escolher personagem
  - Na máquina da taverna com 1 personagem nada muda
  - Derrubar o servidor com a mesa aberta: texto digitado fica no campo, faixa aparece, botões desabilitam e somem ao reconectar
  - Presença inicial mostra 'Conectando…' e não 'Reconectando…'
  - No modo rodada o passe de vez não cai em personagem presente em outro aparelho
- **Arquivos:** `src/lib/cliente/use-mesa.ts`, `src/lib/cliente/http.ts`, `src/lib/mesa.ts`, `src/app/mesa/[id]/page.tsx`, `src/app/mesa/[id]/mesa.tsx`, `src/app/mesa/[id]/mesa-historia.tsx`, `src/components/grupo/seletor-ativo.tsx`, `src/components/grupo/avatar.tsx`, `src/components/presenca/presenca.tsx`, `src/components/historia/painel-acao.tsx`

## Onda 2 (feita)

### W02. Núcleo do turno do mestre: memória, abertura garantida, rabos e rodada travada

- **Tamanho:** G. **Jogadas com o mestre real:** 3.
- **Objetivo:** Fechar os buracos do turno: janela literal da transcrição nunca menor que o limite do resumo (constantes juntas em memoria.ts, warn quando passar); segunda chamada de continuação só com a ferramenta narrar quando o turno terminou sem narração suficiente (na abertura continua 400 chars), com erro claro se ainda vier vazio; arremate que descarta o rabo curto depois de pedir_teste mesmo com palavras novas e rabos de passagem de vez sem aspas viram descarte (nada de anexar texto a narração já lida, só descartar ou ignorar); prontoParaNarrar considera RESULTADO_TESTE pronto (modo rodada + jogador rola); música atual e há quantos turnos entram em cenaEmTexto, checklist de variedade de humor e mestre falso trocando para combate/vitória.
- **Propostas:**
  - P16: Buraco de memória entre a janela literal (40) e o resumo (50/30)
  - P21: Turno sem narração não tem segunda chamada
  - P17: Rede de segurança do fim de turno deixa passar metade dos rabos reais
  - P74: Modo rodada trava em silêncio depois de um teste rolado pelo jogador
  - P108: O mestre não sabe o que está tocando e gruda na "tensão"
- **Critérios de aceite:**
  - JANELA_RECENTE >= LIMITE_SEM_RESUMO e as três constantes vivem em memoria.ts; existe warn quando recentes passa da janela
  - Turno do mestre falso (ou forçado) sem narração dispara exatamente uma continuação só com narrar e nunca repete cena, diário ou sugestões
  - Os rabos reais da campanha 43 (casos em arremate.test.ts) são descartados depois de pedir_teste; narração com informação nova nunca é descartada
  - Modo rodada com dados='jogador': depois do teste rolado, o mestre narra sem esperar nova ação dos outros (teste unitário de prontoParaNarrar), mantendo a espera quando outro teste da rodada está pendente
  - cenaEmTexto traz 'Trilha: humor (energia), há N turnos' e o mestre falso troca para combate ao iniciar luta e vitória ao encerrar
- **Arquivos:** `src/lib/mestre/index.ts`, `src/lib/mestre/prompt.ts`, `src/lib/mestre/ferramentas.ts`, `src/lib/mestre/arremate.ts`, `src/lib/mestre/memoria.ts`, `src/lib/mestre/provedor-falso.ts`, `src/lib/sistemas/tipos.ts`, `tests/arremate.test.ts`, `tests/mestre-pronto.test.ts`

### W07. Leitor: o dado onde a história parou, chips sem página própria e telas baixas

- **Tamanho:** G. **Jogadas com o mestre real:** 0.
- **Objetivo:** O cartão de teste pendente nunca fica escondido em outra página: o leitor avança sozinho quando a página atual termina de revelar (ou mostra 'continuar para o dado ▸' âmbar), compactarCartoes roda também na chegada do cartão (escala mínima 0,7 no celular) com versão compacta do cartão pendente se ainda não couber, barra 'ir para o dado' do modo avançado vira barra inteira clicável, pílula 'continuar' com min-h-11 e pontinhos maiores. Chips 'o que mudou' deixam de ganhar página própria (faixa recolhível acima da barra ou quebra entre páginas), página própria só para 'Fim da noite'. Modo compacto por altura (@media max-height 600px): cabeçalho de 44 px, sem reserva de altura das sugestões, ação em line-clamp-1, barra de páginas de 28 px e, abaixo de ~180 px de palco, rolagem contínua automática com aviso e volta quando a altura voltar.
- **Propostas:**
  - P07: Cartão do teste pendente cai na página seguinte e a atual fica vazia
  - P48: "O que mudou na cena" ganha uma página inteira só para um chip
  - P163: Tela baixa ou zoom: o palco encolhe antes de tudo (4 páginas já a 125 %, 104 px e 18 páginas a 200 %)
- **Critérios de aceite:**
  - Em 1366x768 a 125% e a 150% e no celular 375x812, depois de um pedir_teste o botão de rolar fica visível sem tocar no palco (sem 'false' no log de visibilidade)
  - Nenhuma página do leitor contém só um chip de mudança; 'Fim da noite' continua com página própria
  - A 200% de zoom ou palco < 180 px o leitor lê em rolagem contínua e volta ao paginado quando há espaço
  - Paginação e revelar continuam corretos nos modos animar/instantâneo e no celular
  - Teclas e atalhos (Enter, setas, F) inalterados
- **Arquivos:** `src/components/leitor/`, `src/components/historia/pedido-teste.tsx`, `src/components/historia/painel-acao.tsx`, `src/components/chat/sugestoes-compactas.tsx`, `src/app/mesa/[id]/mesa.tsx`, `src/app/mesa/[id]/mesa-historia.tsx`, `src/app/globals.css`

### W08. Áudio: trilha sobrevive à navegação, destrava no toque e humor manual

- **Tamanho:** M. **Jogadas com o mestre real:** 0.
- **Objetivo:** No celular o toque destrava o áudio (escutar pointerup/touchend/click em captura, chamar desbloquear enquanto ctx.state !== running, aguardandoGesto vindo do statechange real, reabrir o contexto se resume não virar running em 1 s). Flag 'desbloqueado' no nível do módulo, soltarMotor com prazo ~90 s reaproveitando contexto e camada se o componente voltar, destruir com fade (setTargetAtTime) e crossfade de potência igual; sem criar layout.tsx novo. Popover da trilha ganha chips 'automático' + 9 humores (ROTULO_HUMOR) e seletor de energia, em localStorage por campanha (taverna:musica:<id>), com '(manual)' no rótulo e duas linhas no popover compacto do celular.
- **Propostas:**
  - P106: No celular, o toque não destrava o áudio
  - P105: Música morre ao ir para Ajustes/Livro e só volta com outro clique
  - P109: Humor manual pelo jogador no popover da trilha
- **Critérios de aceite:**
  - Ir da mesa para Ajustes/Livro e voltar mantém a trilha sem novo clique e sem recomeçar do zero em até 90 s
  - Navegação fecha o contexto só depois do prazo e com fade
  - Humor manual vence a cena até voltar para 'automático' e sobrevive ao recarregar; localStorage com try/catch
  - Primeiro toque em Android/iPhone (ou emulação touch com userActivation zerada) inicia a trilha
  - Sem clipping novo no limitador
- **Arquivos:** `src/components/historia/musica.tsx`, `src/lib/cliente/musica/`

### W09. Modo história com 2º jogador e aventuras de fantasia abertas ao PF2e

- **Tamanho:** M. **Jogadas com o mestre real:** 0.
- **Objetivo:** Adicionar personagem a uma mesa do modo história: /mesa/[id]/personagens/novo renderiza a criação do modo história em modo 'personagem' (sem passo 5, botão 'Sentar à mesa', chave de rascunho taverna:rascunho-historia:mesa-<id>) com server action criarPersonagemHistoriaAcao que reaproveita fichaHistoriaDoFormulario extraída de historia-acoes.ts, publica o personagem e grava 'X se junta ao grupo'; fallback mínimo se travar: passar o sistema historia na lista. Abrir as 11 aventuras de fantasia para pf2e/dnd5e/pf1e/osr/pbta com recompensas por sistema (string | Record) e pistas neutras de perícia; manter ouro=XP só no OSR; uma masmorra nova de PF2e nível 3-5 em 3 sessões ('A Forja Afundada') com facções, armadilhas por CD de nível e chefe de duas fases.
- **Propostas:**
  - P54: Adicionar personagem a uma mesa do modo história está quebrado
  - P94: Aventuras de fantasia abertas a todos os sistemas e uma masmorra para PF2e
- **Critérios de aceite:**
  - Link '+ Adicionar personagem' da campanha 32 (modo história, só olhar) abre a criação do modo história, não 'Passo 1 de 0'
  - Criar o 2º personagem em campanha '(auditoria)' o põe na mesa, publica mensagem de sistema e o rascunho não vaza para campanha nova
  - Mesa de PF2e lista pelo menos 12 aventuras e cada roteiro de fantasia imprime recompensa do sistema certo
  - Nenhum texto de pista cita perícia de um só sistema
  - A masmorra nova aparece só para PF2e
- **Arquivos:** `src/app/mesa/[id]/personagens/novo/page.tsx`, `src/app/mesa/[id]/personagens/acoes.ts`, `src/app/nova/historia-acoes.ts`, `src/components/historia/criacao/`, `src/lib/aventuras/tipos.ts`, `src/lib/aventuras/index.ts`, `src/lib/aventuras/fantasia.ts`, `src/lib/aventuras/pathfinder.ts`

### W10. Criação avançada enxuta, trazer personagem e duplicar mesa

- **Tamanho:** G. **Jogadas com o mestre real:** 0.
- **Objetivo:** Passo Escolhas do V5 vira grade única de perícias com bolinhas (cicla ○→●→●●→●●●, ●●●● só no Especialista) com contadores por nível e bloqueio por cota, gravando nos mesmos extras.pericias_N; mensagem 'o clã completa' nas cotas vazias após Personagem pronto. Catálogos (predador 18 opções, ancestralidade 48) com cartões compactos, lg:grid-cols-3, prévia em coluna própria sticky e rodapé de uma linha no celular, rótulos de passos em 12 px. 'Trazer um personagem de outra mesa' na criação avançada (clona ficha com PV/recursos cheios, Fome 1, condições vazias, opção zerar XP) via copiarPersonagemAcao em arquivo novo, e 'Duplicar campanha' nos ajustes (db.duplicarCampanha: nome + ' (cópia)', config sem pin, personagens resetados, sem mensagens). Cenário em branco no V5 grava 'Sugestão da taverna: …' sorteado de sementes.cenarios, editável nos ajustes.
- **Propostas:**
  - P57: Vampiro: passo "Escolhas" de 5.400px com três grades de perícias
  - P40: Criação avançada: catálogo de opções compacto com prévia fixa
  - P58: Trazer um personagem de outra mesa e duplicar campanha
  - P96: Cenário em branco no Vampiro: o prompt manda escolher cidade e corte
- **Critérios de aceite:**
  - O passo Escolhas do V5 cabe em menos de ~2.500 px no desktop e a mesma perícia aparece uma vez
  - Estourar a cota de um nível é impedido e os contadores batem com o servidor
  - Os 18 predadores cabem em ~1.600 px e a prévia fica visível ao rolar (desktop) e em rodapé no celular
  - Copiar personagem gera ficha válida e o V5 com Fome 1; duplicar campanha não copia mensagens nem pin
  - Cenário em branco no V5 grava sugestão com prefixo e o jogador a edita nos ajustes
- **Arquivos:** `src/components/ficha/`, `src/app/nova/avancada/`, `src/app/nova/acoes.ts`, `src/app/nova/copiar-personagem.ts`, `src/lib/db.ts`, `src/app/mesa/[id]/ajustes/page.tsx`, `src/app/mesa/[id]/ajustes/acoes.ts`, `src/app/mesa/[id]/ajustes/formularios.tsx`

## Onda 3 (pendente)

### W06. Contrato Sistema expandido, ferramentas em pasta, uma regra num lugar só e precedência

- **Tamanho:** G. **Jogadas com o mestre real:** 3.
- **Objetivo:** Em ordem: (0) golden:update ANTES de mexer. (1) Dividir ferramentas.ts em src/lib/mestre/ferramentas/ com barrel idêntico (index.ts, contexto.ts, definicoes.ts, esquemas.ts, cena.ts, combate.ts, diario.ts, ficha.ts, testes.ts, vampiro.ts, executar.ts); cada arquivo exporta suas definições e uma nova ferramenta = arquivo novo + 1 linha no index; golden idêntico. (2) Contrato em tipos.ts: combate {modelo rodadas|leve, iniciativaNpc}, progressao xp|marcos|compra (substitui porMarcos; vtm5=compra), fimDeSessao {xp, passosExtras, xpMinimo?} implementado em vtm5/fim.ts, decisoesAposTeste/aplicarDecisao/opcoesAntesDeRolar com vtm5/decisoes.ts delegando ao comportamento atual da Força de Vontade, textosDoMestre.rerrolagem, aposMudancaDePv (chamado por aplicarMudancas, aplicarAjuste e descansar, no-op se ausente), avisosCriacao, limitePericias (exposto em publico()), PedidoTeste.oposicao e ResultadoTeste.dano/oposicao como campos opcionais. publico() filtra funções. Zero 'sistema.id === vtm5' fora do vtm5 (prompt.ts, index.ts, ferramentas). (3) P173: cada regra do V5 escrita uma vez (REGRAS com seções e tetos por teste, descrições de ferramentas só dizem QUANDO chamar), REROLAGEM e ramo vampiro de pedidoDeFim vão para o vtm5. (4) P97: 'Regras do sistema (quando conflitam com as gerais, valem estas)', CONFLITO do V5 e PbtA com rastreador opcional, PV 0 'salvo regra do sistema', OSR indulgência só pelos ajustes. (5) P96: SementesSistema.cenarioVazio por sistema usado no lugar de 'livre, surpreenda' e a linha 'A cidade é personagem' no V5.
- **Propostas:**
  - P179: Expandir o contrato Sistema de uma vez (combate, progressão, fim de sessão, decisões, opções antes de rolar) em vez de quatro PRs reabrindo tipos.ts e os nove sistemas
  - P178: Ordem de implementação: testes e dois recortes cirúrgicos primeiro, depois as regras do Vampiro, para cada regra ser escrita uma vez
  - P173: Uma regra, um lugar: as mecânicas do Vampiro escritas uma vez e com teto por seção
  - P97: Prompt geral e regras dos sistemas se contradizem sobre combate e morte
  - P96: Cenário em branco no Vampiro: o prompt manda escolher cidade e corte
- **Critérios de aceite:**
  - golden:check passa idêntico após a divisão de ferramentas (sem mudança de comportamento) e só diverge nos textos que P173/P97/P96 mudam deliberadamente, regenerados e revisados
  - grep 'sistema.id === "vtm5"' em src/lib/mestre devolve zero
  - Nenhuma regra do V5 aparece em duas seções; teste falha quando uma seção passa do teto (total <= 12.000 chars)
  - Campanha nova de Vampiro com cenário vazio recebe no prompt a instrução de escolher cidade real, Príncipe/Xerife/Elysium
  - Campanha 34 (V5) e uma de PF2e abrem e jogam um turno com o mestre falso sem erro; publico() não vaza funções ao navegador
- **Arquivos:** `src/lib/sistemas/`, `src/lib/mestre/`, `src/app/api/interno/ferramentas/route.ts`, `src/app/api/campanhas/[id]/personagens/[pid]/ficha/ajustar.ts`, `tests/golden/`, `tests/regras-teto.test.ts`

### W14. Aventuras: roteiros completos e Vampiro para quem joga sozinho

- **Tamanho:** G. **Jogadas com o mestre real:** 0.
- **Objetivo:** Estender o tipo Roteiro com sessoes[], encontros[] (nome, onde, inimigos com stats na linguagem do sistema, tática, saída), complicacoes[] (6 itens) e solo?{aliado}, impresso por roteiroParaMestre com teto somado ~1.200 chars (frase condicional 'se a mesa tiver um só personagem, {aliado} acompanha' sem depender de código no prompt.ts). Preencher primeiro as 3 de Vampiro e as 3 de PF2e e depois as demais. Três aventuras novas de Vampiro (A Primeira Noite em BH, Lista de Nomes em Recife, O Carregamento em Manaus) sem pressupor coterie, sabor por trabalho/classe/geografia. Campo pedraEmJogo por aventura de Vampiro ('amarre a Pedra de Toque'), 'recomendado' das atuais sem pressupor grupo, faixa do início mostra recomendado e etiqueta 'solo ok'.
- **Propostas:**
  - P92: Roteiros das 21 aventuras: cenas por sessão, encontros com números e complicações
  - P93: Vampiro: aventuras para quem joga sozinho e para a primeira noite
  - P103: Pedras de Toque e Convicções garantidas na criação e nos roteiros
- **Critérios de aceite:**
  - As 6 aventuras de Vampiro e PF2e têm sessoes, encontros com números coerentes com as faixas do regrasParaMestre, e complicações
  - Roteiro impresso por aventura <= tamanho acordado e o teste de orçamento do W11 continua verde
  - As 3 novas aventuras aparecem para V5, cada uma com aliado solo e pedraEmJogo
  - Início mostra 'solo ok' e o recomendado
  - Textos em palavras próprias, sem material de terceiros
- **Arquivos:** `src/lib/aventuras/`, `src/app/page.tsx`

### W15. Migrações versionadas, exportar/importar campanha, cópia diária e lixeira

- **Tamanho:** G. **Jogadas com o mestre real:** 0.
- **Objetivo:** src/lib/db/migracoes.ts com MIGRACOES {versao, sql, exportacao?} idempotentes para o estado atual (banco do usuário tem user_version 2 mas já tem colunas notas, dados e tabela fatos), aplicadas em abrir() numa transação com PRAGMA user_version, garantir* removidos. Formato 'taverna-campanha' versionado pela mesma lista, rotas GET exportar (só máquina da taverna) e POST importar com remapeamento de ids e recusa de versão maior. backup.ts com node:sqlite backup(): cópia em data/copias antes de cada migração e uma vez por dia (guarda 7), exclusão de campanha exporta antes para data/lixeira, página /backup com cópias, lixeira, 'Fazer cópia agora', 'Baixar o banco' e restaurar; VACUUM só se freelist > 25% e após cópia bem-sucedida. Acessível pelos ajustes da mesa e pelo fluxo de excluir (sem editar page.tsx da home nem /config).
- **Propostas:**
  - P12: Exportar/importar campanha, cópia automática do banco e lixeira ao excluir
  - P182: Um formato versionado para exportar campanha e migrar o banco: a mesma lista de migrações serve aos dois
- **Critérios de aceite:**
  - Abrir o banco real do usuário (cópia) não perde dados nem reaplica ALTER; user_version sobe para a versão final
  - Exportar e importar a campanha 34 numa cópia do banco preserva mensagens, diário, fatos e personagens
  - Excluir campanha de auditoria gera JSON na lixeira e 'restaurar' a recria
  - Uma cópia diária é feita e só 7 ficam
  - Exportação/importação respondem 403 fora da máquina da taverna
- **Arquivos:** `src/lib/db.ts`, `src/lib/db/migracoes.ts`, `src/lib/backup.ts`, `src/instrumentation.ts`, `src/app/api/campanhas/[id]/exportar/route.ts`, `src/app/api/campanhas/importar/route.ts`, `src/app/api/backup/route.ts`, `src/app/backup/`, `src/app/botao-excluir.tsx`, `src/app/acoes-campanha.ts`, `src/app/mesa/[id]/ajustes/page.tsx`, `src/app/mesa/[id]/ajustes/acoes.ts`, `src/app/mesa/[id]/ajustes/formularios.tsx`, `src/lib/rede/porteiro.ts`, `.gitignore`, `tests/migracoes.test.ts`

## Onda 4 (pendente)

### W11. Provedores, erros em português, prompt em dois blocos e resumo só enredo

- **Tamanho:** G. **Jogadas com o mestre real:** 3.
- **Objetivo:** promptDoSistema devolve estável (regras, sistema, cabeçalho, roteiro) e do turno (fichas, fatos, resumo, diário, cena); API manda dois blocos system com cache_control só no estável, CLI grava o estável em sistema.md e injeta o resto como '## Estado da mesa agora' no stdin; medirPrompt() loga tamanhos e testes impõem tetos (estável <= 36.000, turno <= 30.000) e estabilidade entre turnos. P174: SISTEMA_RESUMO pede só Enredo, Pendências, Estado do grupo e Divergências (<= 320 palavras), recebe o diário compacto, frase fixa 'status vale o Diário'. erros-api.ts traduz 401/crédito/beta/404/429/5xx/conexão/abort (abort e 'Turno cancelado.' não viram erro), eventos de erro carregam refazer:true quando há instantâneo, falha do resumo vira aviso; /config usa o mesmo tradutor. P130: 16 rodadas, tool_choice none na penúltima, nunca executar ferramenta sem enviar tool_result, aviso como mensagem sistema fora da transcrição. P129: salvar provedor api exige ANTHROPIC_API_KEY, apiKey explícita, 409 em /acao antes de enfileirar, origem da credencial (últimos 4 caracteres) e lista de modelos. P133: esforço da API (low/medium/high) em /config, padrão medium para turnos e low para resumo. Documentar API no README/CLAUDE.md.
- **Propostas:**
  - P172: Orçamento do prompt em dois blocos: o estável vai cacheado, o que muda vai no turno, com teto e contador
  - P20: Prompt de ~17 mil tokens por jogada sem aproveitar cache
  - P174: Resumo e diário disputam os mesmos fatos: o diário é dono de NPCs e lugares, o resumo guarda só enredo e pendências
  - P128: Erros da API chegam crus e em inglês ao jogador (401, saldo, 429, 529, 404, sem rede e "Request was aborted." ao interromper)
  - P130: Fins anormais do turno na API (limite de rodadas, max_tokens, recusa): aviso como mensagem de sistema em vez de narração, continuação e nenhuma ferramenta executada sem resposta
  - P129: Dá para escolher a API sem chave: /config salva, a mesa aceita a ação e todo turno morre com "Could not resolve authentication method"
  - P133: Esforço fixo em low para um mestre com 15 ferramentas e checklist de 6 itens (pelo CLI ele roda no esforço alto do Claude Code)
  - P10: Erros do Claude Code traduzidos, com tentar de novo (mesa e /config)
- **Critérios de aceite:**
  - blocoEstavel é idêntico entre dois turnos de uma mesma fixture e nada que muda por turno entra nele
  - Log por turno mostra tamanhos estável/turno/transcrição e cache_read_input_tokens na API
  - Cada erro simulado com as classes reais do SDK vira frase em português; interromper não mostra banner
  - Estourar 16 rodadas fecha a narração sem executar ferramenta órfã e grava aviso 'sistema'
  - Salvar provedor api sem chave é recusado e /acao devolve 409 em português
  - Resumo novo não repete NPCs/lugares do diário
- **Arquivos:** `src/lib/mestre/prompt.ts`, `src/lib/mestre/tipos.ts`, `src/lib/mestre/index.ts`, `src/lib/mestre/provedor-api.ts`, `src/lib/mestre/provedor-cli.ts`, `src/lib/mestre/provedor-falso.ts`, `src/lib/mestre/erros-api.ts`, `src/lib/tempo-real.ts`, `src/app/config/page.tsx`, `src/app/config/acoes.ts`, `src/app/config/formulario.tsx`, `src/app/api/campanhas/[id]/acao/route.ts`, `README.md`, `CLAUDE.md`, `tests/prompt-orcamento.test.ts`, `tests/erros-api.test.ts`

### W12. Regras do Vampiro no servidor: XP, Manchas, compulsões, presa e ficha fora do livro

- **Tamanho:** G. **Jogadas com o mestre real:** 2.
- **Objetivo:** progressao 'compra' de verdade: conceder_xp diz que XP é moeda do jogador, subir_nivel sai e entra potencia_de_sangue (motivo diablerie|decadas), fimDeSessao.xp lista Ambição, Convicções e missões. aplicarManchas: Mancha além das caixas vira degeneração de Humanidade (alterar_ficha, ajuste manual e caça) e o −2 de atormentado passa a valer em frenesi, Remorso e Força de Vontade. Compulsões: tabela correta (Fome, Dominância, Dano, Paranoia, clã no 10), sorteio em Falha Bestial, −2 aplicado com nota, campo compulsao serve|contra|sortear, remoção ao mudar cena_titulo. Caça lê presa (Exclusão de Presa → +1 Mancha, Fazendeiro → −2 Vontade, animal/vampiro). Criação do V5: Convicção/Pedra genéricas preenchidas por um par de sementes com nota, 'a cada sessão uma Pedra ou Convicção em risco' no COMO MESTRAR, avisosCriacao do vtm5 (atributos fora de 4/3/3/3/2/2/2/2/1 e cotas de perícia) mostrados num bloco âmbar no Resumo com checkbox 'de propósito' (extras.foraDoLivro, nota em descreverParaMestre). Cartão de dado mostra o campo dano genérico.
- **Propostas:**
  - P19: XP e Potência de Sangue no Vampiro: as ferramentas contradizem as regras
  - P28: Manchas além das caixas somem em silêncio e o −2 de atormentado não vale em tudo
  - P29: Compulsões: só a caça marca, o −2 nunca é aplicado e não há sorteio
  - P31: Caça ignora Exclusão de Presa, Fazendeiro e o tipo de vítima
  - P103: Pedras de Toque e Convicções garantidas na criação e nos roteiros
  - P55: Atributos fora do livro passam sem aviso no Resumo
- **Critérios de aceite:**
  - Campanha de teste: Manchas 4/4 + ato monstruoso baixa Humanidade em 1 e o retorno diz 'degeneração'; ajuste manual não passa de máx sem degenerar
  - Atormentado aplica −2 em Frenesi, Remorso e Vontade com a nota no cartão
  - Falha Bestial sorteia e grava 'Compulsão: X', a parada seguinte leva −2 e mudar cena_titulo remove
  - cacar com presa excluída marca Mancha; Fazendeiro humano cobra Vontade ou recusa
  - conceder_xp/subir_nivel no V5 não falam mais em marcos e potencia_de_sangue exige motivo
  - Ficha da campanha 43 (atributos 5 em tudo) mostra o aviso 'fora do livro' no Resumo sem bloquear; criação nova com Convicção 'Livre' recebe um par sugerido
- **Arquivos:** `src/lib/sistemas/vtm5.ts`, `src/lib/sistemas/vtm5/`, `src/lib/sistemas/sementes/vtm5.ts`, `src/lib/mestre/ferramentas/definicoes.ts`, `src/lib/mestre/ferramentas/esquemas.ts`, `src/lib/mestre/ferramentas/vampiro.ts`, `src/lib/mestre/ferramentas/ficha.ts`, `src/lib/mestre/ferramentas/cena.ts`, `src/app/api/campanhas/[id]/personagens/[pid]/ficha/ajustar.ts`, `src/components/chat/cartao-dado.tsx`, `src/app/acoes-ficha.ts`, `src/components/ficha/previa.tsx`, `tests/vtm5-regras.test.ts`

### W13. Pathfinder 2e: estado de moribundo, armas e dano, ações/MAP, condições e perícias de criação

- **Tamanho:** G. **Jogadas com o mestre real:** 2.
- **Objetivo:** Implementar o gancho aposMudancaDePv do pf2e: 0 PV gera inconsciente+moribundo+ferido, voltar a ter PV tira moribundo e dá ferido, descanso longo remove moribundo/inconsciente/amedrontado/enjoado e só mantém ferido se PV < máx, Tratar Ferimentos com sucesso remove ferido. Catálogo pf2e/armas.ts (~40 armas em palavras próprias) com atributo/ágil/distância, 'Ataque com arco curto' usa a arma citada, ataque com sucesso devolve dano rolado (dobrado no crítico) no cartão e no retorno do teste, grade Ofensiva com uma linha por arma. Rastreador com acoes (0-3) e ataques por combatente, MAP automática por contagem no turno (testeNaHora e teste do jogador), 'lento N', três pontinhos e aviso do próximo ataque. pf2e/condicoes.ts (sinônimos, valor, decaimento de amedrontado/enjoado no fim do turno), seletor com stepper no ajuste da ficha, CA e CD efetivas no painel e em descreverParaMestre. Criação: limitePericias real (maisPericias + INT), perícias do antecedente/subclasse fixas em verde, aviso em vez de preenchimento alfabético.
- **Propostas:**
  - P140: Moribundo e ferido saem de sincronia entre descanso longo, ajuste manual e Tratar Ferimentos
  - P138: Ataque sempre com a arma da classe: o arco do guerreiro não existe e o dano nunca dobra no crítico
  - P139: Penalidade de ataques múltiplos contada pelo servidor e três ações à vista no rastreador
  - P145: Condições com número: seletor por sistema, CA e CDs efetivas e contagem regressiva de amedrontado
  - P141: Perícias na criação: limite fixo de 4 e preenchimento alfabético pelas costas do jogador
- **Critérios de aceite:**
  - Teodora a 0 PV: [inconsciente, moribundo 1]; cura manual +5 PV tira moribundo e põe ferido 1; descanso longo limpa moribundo e amedrontado
  - 'Ataque com arco curto' do guerreiro sai com o bônus/dano do arco e o crítico dobra o dano
  - Em combate o 2º ataque do turno sai com −5 (ágil −4) automaticamente, zera em passarVez, e o painel mostra ações e MAP
  - 'medo 2' e 'Amedrontado II' contam como amedrontado 2; CA efetiva aparece no painel e vai ao mestre; amedrontado cai 1 no fim do turno
  - Maga com INT +4 vê 'N/6' perícias e nenhuma perícia alfabética é preenchida sem aviso
- **Arquivos:** `src/lib/sistemas/pf2e.ts`, `src/lib/sistemas/pf2e/`, `src/lib/mestre/ferramentas/testes.ts`, `src/lib/mestre/ferramentas/combate.ts`, `src/components/cena/painel-cena.tsx`, `src/components/ficha/painel-ficha.tsx`, `src/components/ficha/ajuste-ficha.tsx`, `src/components/ficha/passos.tsx`, `src/components/ficha/formulario-personagem.tsx`, `src/lib/formulario-ficha.ts`, `tests/pf2e-regras.test.ts`

### W19. Diário vivo: chips de novidade e retratos de NPC

- **Tamanho:** M. **Jogadas com o mestre real:** 1.
- **Objetivo:** anotar_diario registra dado tipo 'diario' também para NPC novo, lugar novo, item novo e cada pista nova (comparando antes.dados), ícone por subtipo e tom neutro nos chips (cena.ts/mudancas.tsx). anotar_diario ganha sexo e oficio opcionais para NPC (descrição da ferramenta pede os dois); o servidor gera gerarRetrato(titulo, {sexo, classe: oficio}) em dados.retrato com sexo inferido por nome quando faltar; AbaPessoas mostra o retrato em 56 px (morto em tons de cinza), chip e lista de Pessoas do livro em 22 px. Badge 'novo' do Códex fica para a onda seguinte.
- **Propostas:**
  - P63: Cartões de NPC com retrato SVG
  - P64: Novidades do diário chegam à cena: chips e badge no Códex
- **Critérios de aceite:**
  - Nova pista, NPC, lugar ou item gera chip em 'o que mudou' com ícone próprio
  - NPC novo com sexo/oficio ganha retrato determinístico e aparece na aba Pessoas e no livro
  - NPC antigo sem retrato não quebra (retrato gerado na leitura)
  - Mestre falso exercita anotar_diario com NPC feminino, masculino e sem sexo
- **Arquivos:** `src/lib/mestre/ferramentas/diario.ts`, `src/components/leitor/cena.ts`, `src/components/leitor/mudancas.tsx`, `src/components/historia/codex.tsx`, `src/components/historia/retrato/dados.ts`, `src/app/mesa/[id]/livro/page.tsx`, `tests/diario-chips.test.ts`

## Onda 5 (pendente)

### W16. Cartão de decisão depois do teste: rerrolar, escolher dados, Surto, Pontos de Herói e erro com 'tentar de novo'

- **Tamanho:** G. **Jogadas com o mestre real:** 3.
- **Objetivo:** Implementar o modelo genérico de decisão sobre o contrato do W06: pedido.dados.decisao {ate, clienteId, opcoes[]}, index.ts sem importar o vtm5, quem decide é o aparelho que rolou (ou o local se o dono não está), prazo 45 s só servidor (aceite paralelo do navegador sai; sem prazo em mesa solo), Enter só com foco em [data-decisao], F global, 'aceito sem resposta'. Dados normais clicáveis até 3 (POST /rerrolar com opcao e dados), rerrolagem em sucesso discreta por 8 s e em teste perigoso/ataque, modo automático com cartão de rerrolagem e ação interna §rerrolagem. Composição da parada (detalhes) gravada no pedido e mostrada antes de rolar, alternador de Surto de Sangue (opcoes.surto em /rolar, revalidando Fome). pf2e Ponto de Herói e dnd5e Inspiração rerrolam o d20; Recuperação e testes contra a morte aplicam o grau. Rolador livre mostra faixa âmbar do teste pendente. Banner de erro das duas mesas ganha 'Tentar de novo' (refazer pelo instantâneo) e 'Reescrever' usando refazer:true do W11.
- **Propostas:**
  - P176: Cartão de decisão depois do teste: uma especificação só para prazo, dono, escolha de dados, Surto antes de rolar, modo automático e Pontos de Herói
  - P03: Decisão de rerrolar com Força de Vontade vence sozinha em 20 s
  - P30: Rerrolagem com Força de Vontade só em falha, sem escolher dados e inexistente quando o mestre rola
  - P50: Vampiro: cartão pendente mostra a composição da parada e deixa escolher Surto
  - P34: PF2e e 5e: Pontos de Herói, Inspiração, Recuperação e testes contra a morte
  - P51: Rolador livre ignora o teste pendente
  - P10: Erros do Claude Code traduzidos, com tentar de novo (mesa e /config)
- **Critérios de aceite:**
  - Mesa solo: a decisão espera sem vencer; com 2+ aparelhos vence em 45 s e só o dono tem os botões
  - Enter aceita só com foco no cartão; Enter do leitor não aceita decisão
  - Jogador escolhe quais dados normais rerrolar (nunca Fome) e o resultado confere
  - Cartão pendente mostra 'Carisma 4 + Lábia 4 · 1 de Fome' e o Surto aparece só quando permitido, com Despertar rolado antes
  - Em modo automático falha de teste mostra rerrolagem por 45 s e o mestre narra a correção
  - PF2e: Ponto de Herói rerrola, desconta e mostra no cartão; Recuperação ajusta moribundo
  - Erro do provedor mostra 'Tentar de novo' que reenfileira as ações do instantâneo
- **Arquivos:** `src/lib/mestre/index.ts`, `src/lib/constantes.ts`, `src/lib/sistemas/vtm5/decisoes.ts`, `src/lib/sistemas/vtm5/forca-de-vontade.ts`, `src/lib/sistemas/vtm5/testes.ts`, `src/lib/sistemas/pf2e.ts`, `src/lib/sistemas/dnd5e.ts`, `src/lib/mestre/ferramentas/testes.ts`, `src/app/api/campanhas/[id]/rerrolar/route.ts`, `src/app/api/campanhas/[id]/rolar/route.ts`, `src/components/historia/pedido-teste.tsx`, `src/components/historia/parada-dados.tsx`, `src/components/chat/cartao-dado.tsx`, `src/components/chat/atalhos.tsx`, `src/components/rolador/rolador-dados.tsx`, `src/lib/cliente/use-mesa.ts`, `src/app/mesa/[id]/mesa.tsx`, `src/app/mesa/[id]/mesa-historia.tsx`, `tests/decisoes.test.ts`

### W17. Editar o personagem depois de criado

- **Tamanho:** M. **Jogadas com o mestre real:** 0.
- **Objetivo:** Página /mesa/[id]/personagens/[pid]/editar com formulário reduzido: identidade (nome, jogador, história) e opções de criação sem efeito mecânico (conceito, ambição, desejo, senhor, seita, convicções, Pedras de Toque, vantagens, defeitos, especialidades), sem atributos, perícias nem disciplinas e preservando chaves mecânicas de extras (disciplinas, mancha, surto, ressonância). Server action editarPersonagemAcao com os mesmos limites de fichaDoFormulario, mensagem 'sistema' curta ('Ficha de Samuel atualizada: convicções, história'), 409 com mesa ocupada. Modo história: nome, aparência, história e rosto mantendo sexo/origem. Links 'editar' no painel de ficha e no Grupo dos ajustes.
- **Propostas:**
  - P56: Editar o personagem depois de criado
- **Critérios de aceite:**
  - Editar Convicções e Pedras do personagem da campanha de auditoria muda a ficha vista pelo mestre sem apagar disciplinas, Manchas nem Surto
  - Recusa com mesa ocupada
  - Modo história troca nome/aparência/rosto
  - Mensagem de sistema aparece no chat/livro
  - Sem permissão fora da máquina da taverna e do dono conforme regras de rede atuais
- **Arquivos:** `src/app/mesa/[id]/personagens/[pid]/editar/page.tsx`, `src/app/mesa/[id]/personagens/acoes.ts`, `src/components/ficha/painel-ficha.tsx`, `src/components/ficha/passos.tsx`, `src/app/mesa/[id]/ajustes/page.tsx`, `src/components/historia/criacao/criacao-historia.tsx`

### W18. Bestiário e tabelas sob demanda para o mestre

- **Tamanho:** G. **Jogadas com o mestre real:** 2.
- **Objetivo:** Duas ferramentas novas em arquivo próprio (consultar_bestiario e sortear/rolar_tabela com tipo), registradas com uma linha no ferramentas/index.ts e na ponte MCP: bestiário de 20-30 criaturas por sistema de fantasia (pf2e com 3 ações, dnd5e, osr) e adversários V5 (carniçal, mortal armado, caçador da SI, vampiros por idade, lupino) em palavras próprias com CA/PV/ataques/fraqueza/tática/o que o Recordar Conhecimento revela; tabelas por sistema (V5: nomes por década e clã, lugares por cidade, complicações de caça, boatos de Elysium, quebra da Máscara, Ressonância; fantasia: rumores, encontros por nível, armadilhas, tesouro, vilas; d100, fate, pbta). Resultado vira mensagem de dado (secreta ou pública), retorno <= 600 chars; a descrição da ferramenta diz 'antes de combate consulte; em vez de inventar nome, lugar ou complicação, sorteie'.
- **Propostas:**
  - P98: Bestiário resumido sob demanda (PF2e, D&D, OSR e adversários do Vampiro)
  - P99: Tabelas aleatórias por sistema: NPC, lugar, complicação e rumor
- **Critérios de aceite:**
  - As duas ferramentas aparecem para o mestre cli (MCP) e api e só com dados do sistema da campanha
  - Retorno de uma consulta <= 600 chars; tabelas sorteadas pelo servidor com gerador injetável nos testes
  - Nenhum texto copiado de terceiros; criaturas com nível coerente com as faixas do regrasParaMestre
  - golden:check mostra apenas as duas ferramentas novas e o orçamento do prompt estável não passa do teto
- **Arquivos:** `src/lib/mestre/ferramentas/consulta.ts`, `src/lib/mestre/ferramentas/index.ts`, `mcp/taverna-mcp.mjs`, `src/lib/sistemas/pf2e/bestiario.ts`, `src/lib/sistemas/dnd5e/bestiario.ts`, `src/lib/sistemas/osr/bestiario.ts`, `src/lib/sistemas/vtm5/bestiario.ts`, `src/lib/sistemas/pf2e/tabelas.ts`, `src/lib/sistemas/vtm5/tabelas.ts`, `src/lib/sistemas/fantasia-tabelas.ts`, `tests/consulta.test.ts`

### W20. Anti-muletas: o mestre vê o que repetiu e o fecho deixa de ser ritual

- **Tamanho:** M. **Jogadas com o mestre real:** 5.
- **Objetivo:** Novo muletas.ts que, a partir das últimas 5 narrações do mestre, conta expressões de uma lista fixa (a Besta rosna, a corrente tilinta, Dentro de você, o abajur, o neon, a vez é sua) e substantivos repetidos em 3+ narrações, e o LEMBRETE do turno pede 'Nesta resposta NÃO use: …; varie a imagem de abertura e o fecho'. Fecho com um personagem: detalhe concreto ou fala que exige resposta, sem recapitular, sem listar opções, sem 'a vez é sua'. 'A Besta tem voz' só com Fome 3+, Falha Bestial, Crítico Sujo ou frenesi. TAMANHO com teto em palavras (90/180/280) e aviso quando a última narração passou do teto. Calcular tudo dentro de prompt.ts com leitura de mensagens via db (sem editar index.ts).
- **Propostas:**
  - P18: Muletas e fecho ritual: lista anti-repetição calculada a cada turno
- **Critérios de aceite:**
  - Teste com 5 narrações reais da campanha 43 lista 'a Besta', 'corrente', 'Dentro de você' como muletas e o lembrete cabe em <= 300 chars
  - Com muletas vazias nada é acrescentado ao lembrete
  - Em 5 turnos reais seguidos o texto do mestre não repete mais as expressões listadas e o fecho não termina em 'a vez é sua'; narrações médias ficam em 2-3 parágrafos
  - Orçamento do turno continua dentro do teto do W11
- **Arquivos:** `src/lib/mestre/muletas.ts`, `src/lib/mestre/prompt.ts`, `src/lib/mestre/estilo.ts`, `src/lib/sistemas/vtm5.ts`, `tests/muletas.test.ts`

### W24. Suporte ao amigo: log em arquivo, diagnóstico no /config, npm run doutor e firewall

- **Tamanho:** M. **Jogadas com o mestre real:** 1.
- **Objetivo:** src/lib/log.ts (JSON por linha em data/logs/taverna-<data>.log, rotação 14 dias, espelha no console) usado pelo provedor-cli (início/fim de cada chamada com versão, flags, duração, código, stderr inteiro, subtype; nunca o prompt) e pelo tempo-real; seção Diagnóstico no /config (só máquina da taverna) com versões, provedor efetivo, porta, tamanho do banco, últimas 100 linhas, 'Copiar relatório' e GET /api/diagnostico?baixar=1 sem chave nem e-mail. scripts/doutor.mjs em JS puro (Node, node:sqlite, .env.local, claude achado/versão/login, porta 3300, OneDrive, hash do lock, build antigo, git atrás do remoto) gravando data/logs/doutor-<data>.txt, npm run doutor e chamada opcional pelo atalho. iniciar-taverna.ps1 lista IPv4 reais para o Wi-Fi e confere/cria (com pergunta e RunAs) a regra de firewall; /api/rede devolve firewall ok|bloqueado|desconhecido. CLAUDE.md/README citam doutor e relatório.
- **Propostas:**
  - P119: Log em arquivo e relatório de diagnóstico: o que o amigo manda quando "o mestre não responde"
  - P126: npm run doutor: exame de saúde da instalação que funciona mesmo quando a taverna não sobe
  - P80: Atalho iniciar-taverna.ps1 não confere o firewall nem mostra o endereço da rede
- **Critérios de aceite:**
  - Um turno com o mestre cli gera linhas de log sem o prompt e o relatório do /config as mostra
  - npm run doutor em máquina sem Claude Code ou com porta ocupada imprime OK/ATENÇÃO/FALHOU em português e grava o arquivo
  - Relatório baixado não contém chave de API nem e-mail
  - Atalho mostra o IP do Wi-Fi e a pergunta de firewall só quando falta regra; /api/rede informa o estado do firewall
  - console.* nos arquivos de outros pacotes ficam como estão (migração gradual documentada)
- **Arquivos:** `src/lib/log.ts`, `src/lib/mestre/provedor-cli.ts`, `src/lib/tempo-real.ts`, `src/app/config/page.tsx`, `src/app/config/formulario.tsx`, `src/app/api/diagnostico/route.ts`, `scripts/doutor.mjs`, `package.json`, `iniciar-taverna.ps1`, `src/app/api/rede/route.ts`, `src/lib/rede/enderecos.ts`, `CLAUDE.md`, `README.md`

## Onda 6 (pendente)

### W21. Fim da noite no servidor: noites pelo relógio, Remorso e XP garantidos, recapitulação gravada

- **Tamanho:** G. **Jogadas com o mestre real:** 2.
- **Objetivo:** noitesDaCampanha em db.ts (fecha noite em marcador ou intervalo >= PAUSA_NOITE de 5 h), sessaoAtual por ela, config.recapPendente no lugar de depoisDoFimDeSessao frágil, mesa.ts expõe sessao e noites, montar.ts desenha 'Noite N · data' em fronteiras inferidas, home mostra '3 noites · última ontem'. Fluxo de encerrar: rota POST remorso por personagem cria pedido_teste 'Remorso' rolado pelo jogador (rolarTestePendente/aposTeste), encerrarSessao recusa com Manchas sem Remorso na sessão exceto 'o mestre decide', ajustar.ts recusa Manchas negativas e Humanidade manual sem confirmado, texto de XP vem de fimDeSessao.xp (vtm5/fim.ts), fechamento do narrar gravado em fim_sessao.dados.fechamento e recapitulação (<=120 palavras via provedor.texto) em dados.recapitulacao. Rede de segurança: servidor executa teste_de_remorso por quem tem Manchas e concede XP mínimo quando o mestre pulou, bloqueia atualizar_cena com combate.iniciar/cena_titulo novo no fim, config.fimPendente evita XP duplicado, zera sugestões e põe música calma ao gravar o marcador, provedor falso segue o roteiro do fim. Cartão 'Anteriormente' recebe do /livro?formato=resumo {resumo, resumoAte, ultimaMensagem, fechamento, recapitulacao}, resumo fecha a noite no fim de sessão sem passar do marcador, SISTEMA_RESUMO sem markdown, 'Sessão N' como cartão antes da recapitulação.
- **Propostas:**
  - P177: Fim da noite como um fluxo só: botão próprio, Remorso rolado pelo jogador, XP vindo do sistema e recapitulação gravada no marcador
  - P155: Fechamento garantido pelo servidor: Remorso, XP mínimo e nada de cena nova quando o mestre pula o roteiro do fim
  - P25: Fim de sessão: recapitulação frágil e XP sem a noite inteira à vista
  - P151: Noites inferidas pelo relógio quando ninguém aperta "Encerrar a noite"
  - P153: "Anteriormente…" mostra o resumo atrasado em 30+ mensagens, com asteriscos de markdown, e só na abertura da aba
  - P05: Manchas zeradas à mão: botão de Remorso e trava no ajuste da ficha
- **Critérios de aceite:**
  - Campanha de teste com mensagens espaçadas 23 h aparece como 2 noites no livro e numera a sessão certa
  - Mestre falso que ignora o roteiro do fim ainda termina com Remorso rolado para quem tem Manchas, XP mínimo e sem combate novo aberto
  - Encerrar duas vezes após aborto não concede XP em dobro
  - Encerrar com Manchas sem Remorso devolve 409 claro; rota remorso cria pedido pendente que o jogador rola
  - Ajuste manual de Manchas negativas é recusado
  - Interface publicada para o W22: POST remorso → {ok,mensagemId}; encerrar body {semRemorso?, retroativa?}; livro?formato=resumo com os campos acima; EstadoMesa.noites/sessao
- **Arquivos:** `src/lib/mestre/index.ts`, `src/lib/mestre/prompt.ts`, `src/lib/mestre/provedor-falso.ts`, `src/lib/db.ts`, `src/lib/constantes.ts`, `src/lib/mesa.ts`, `src/app/mesa/[id]/livro/montar.ts`, `src/app/page.tsx`, `src/app/api/campanhas/[id]/encerrar/route.ts`, `src/app/api/campanhas/[id]/personagens/[pid]/remorso/route.ts`, `src/app/api/campanhas/[id]/personagens/[pid]/ficha/ajustar.ts`, `src/app/api/campanhas/[id]/livro/route.ts`, `src/components/leitor/cena.ts`, `src/lib/sistemas/vtm5/fim.ts`, `tests/noites.test.ts`

### W22. Cabeçalho único, Encerrar a noite como ritual e estado de encerramento

- **Tamanho:** G. **Jogadas com o mestre real:** 0.
- **Objetivo:** cabecalho-mesa.tsx para as duas mesas (ordem fixa voltar, título em 2 linhas, presença, Convidar, Som, Ler, Voz, Livro, ⚙, 🌙 Encerrar, painel; transbordo para menu '⋯' por largura, botão único 40x40 com SVG), 🌙 sai do MenuLeitura. Componente EncerrarNoite (diálogo com passos Remorso rolado pelo jogador, XP e fechamento; motivo do 409 com 'ir para o dado'; pontinho quando Manchas cheias) consumindo as rotas do W21. Botão Remorso na ficha/Códex quando Manchas > 0, Manchas só com '+' e Humanidade sem −/+ fora do modo ajustar. Depois do marcador: faixa 'Fechando a noite N…' durante o fechamento, leitor abre na última página, cartão 'Noite N encerrada' com chips e Gastar XP, 'Reabrir a noite', sugestões sem 'Improvise', fade da trilha. 'Anteriormente' mostra fechamento/recapitulação, resumo renderizado sem markdown em ~120 palavras e reavalia em visibilitychange/reconexão. Badge de novidades do Códex com localStorage.
- **Propostas:**
  - P177: Fim da noite como um fluxo só: botão próprio, Remorso rolado pelo jogador, XP vindo do sistema e recapitulação gravada no marcador
  - P49: "Encerrar a noite" escondido dentro do menu "Modo de leitura"
  - P181: Um cabeçalho para as duas mesas, com ordem fixa e menu de transbordo
  - P156: Depois do "Fim da noite" a mesa segue como se nada tivesse acontecido: falta um estado de encerramento
  - P153: "Anteriormente…" mostra o resumo atrasado em 30+ mensagens, com asteriscos de markdown, e só na abertura da aba
  - P05: Manchas zeradas à mão: botão de Remorso e trava no ajuste da ficha
  - P64: Novidades do diário chegam à cena: chips e badge no Códex
- **Critérios de aceite:**
  - As duas mesas mostram os mesmos botões na mesma ordem e no celular o nome da campanha aparece em duas linhas
  - Encerrar a noite está no cabeçalho (desktop) e no pé do painel (celular), não mais em 'Como ler'
  - Fluxo completo com mestre falso: Remorso rolado pelo jogador, XP, fechamento, cartão 'Noite N encerrada' e volta com 'Anteriormente'
  - Manchas não podem ser reduzidas à mão; botão Remorso rola e aplica
  - Reabrir a noite funciona e 'Outra resposta' não aparece no turno de fechamento
  - Foco de teclado e tecla C do Códex mantidos
- **Arquivos:** `src/components/mesa/cabecalho-mesa.tsx`, `src/components/sessao/encerrar-noite.tsx`, `src/app/mesa/[id]/mesa.tsx`, `src/app/mesa/[id]/mesa-historia.tsx`, `src/components/leitor/menu-leitura.tsx`, `src/components/leitor/leitor-cenas.tsx`, `src/components/chat/acoes-turno.tsx`, `src/components/presenca/convite.tsx`, `src/components/historia/musica.tsx`, `src/components/voz/voz.tsx`, `src/components/ficha/painel-ficha.tsx`, `src/components/ficha/ajuste-ficha.tsx`, `src/components/historia/codex.tsx`, `src/components/historia/anteriormente.tsx`, `src/lib/cliente/use-mesa.ts`, `src/app/globals.css`

### W23. Vampiro avançado: testes opostos e poderes de disciplina na ficha

- **Tamanho:** G. **Jogadas com o mestre real:** 3.
- **Objetivo:** Testes opostos: oposicao_nome/oposicao_parada (V5) e oposicao_bonus (d20) em teste e pedir_teste, servidor rola a parada do NPC (sem Fome, pares de 10), alvo = sucessos+1 (empate vence o defensor), margem vira danoSugerido (+arma 0-4 em Ataque) com aviso para aplicar via atualizar_cena/alterar_ficha, notação Nd10s em dados.ts, linha 'Vera: 5d10 → 2 sucessos' nos cartões e 'contra Vera (5 dados)' na prévia; dnd5e/pf2e usam 1d20+bônus rolado. Poderes de disciplina: extras.poderes {disciplina, nivel, nome, custo, parada?} pedidos na criação (lista-texto por disciplina) e ao gastar XP numa disciplina, descreverParaMestre lista poderes e custo, poderNoTexto preenche custo_despertar/nivel_poder/parada, teste recusa disciplina com 0 pontos e o COMO MESTRAR V5 diz 'só poderes listados'. Diablerie fica fora (confirmar números no livro).
- **Propostas:**
  - P26: Testes opostos no V5 (e no contrato): o servidor rola a parada do NPC
  - P35: Poderes de disciplina na ficha (custo de Despertar e nível certos)
- **Critérios de aceite:**
  - Ataque V5 com oposicao_parada 5 mostra a parada do NPC no cartão, empate favorece o defensor e a margem vira danoSugerido
  - Notação 5d10s conta 6+ e pares de 10 em teste unitário com gerador injetável
  - Personagem sem Oblívio ●● não executa poder de Oblívio ●● (teste recusado com erro claro); poder com custo 0 não cobra Despertar
  - Gastar XP numa disciplina pergunta qual poder; criação de V5 pede um poder por ponto
  - golden:check mostra só as mudanças deliberadas de ferramentas
- **Arquivos:** `src/lib/sistemas/vtm5.ts`, `src/lib/sistemas/vtm5/testes.ts`, `src/lib/sistemas/vtm5/dados.ts`, `src/lib/sistemas/vtm5/xp.ts`, `src/lib/mestre/ferramentas/testes.ts`, `src/lib/mestre/ferramentas/vampiro.ts`, `src/lib/mestre/ferramentas/definicoes.ts`, `src/lib/mestre/ferramentas/esquemas.ts`, `src/lib/dados.ts`, `src/lib/sistemas/dnd5e.ts`, `src/lib/sistemas/pf2e.ts`, `src/components/chat/cartao-dado.tsx`, `src/components/historia/parada-dados.tsx`, `src/components/historia/pedido-teste.tsx`, `src/components/historia/linha-dado.tsx`, `src/components/ficha/passos.tsx`, `src/components/ficha/gastar-xp.tsx`, `tests/oposicao.test.ts`

