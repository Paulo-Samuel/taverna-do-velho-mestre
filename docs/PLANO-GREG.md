# Plano: ideias do Old Greg's Tavern para a taverna (08/11/2026)

Origem: olhada manual (Chrome + REA) em oldgregstavern.com, sem jogar, sem gastar crédito. Só ideias de interface e de
mecânica, implementadas do jeito da taverna: nada de texto, arte, código ou marca deles. Créditos, assinatura e limite de
rodadas ficam de fora (a taverna é local).

**Não vimos:** a página Enigmas (ficou carregando), as abas do painel lateral da campanha e a criação de campanha (custa
crédito). Se o Paulo mostrar essas telas, entram como pacotes G07+.

## O que a taverna já tem (não fazer de novo)

- Nome colorido na prosa: `components/historia/cores.ts` (`corDoNome`, cor estável por nome).
- Atalhos numéricos nas sugestões (1 a 9), R rola, F rerrola: `components/chat/atalhos.tsx`.
- Cartão da ação do jogador com o resultado do dado: `cartao-acao.tsx`, `cartao-dado.tsx`, `linha-dado.tsx`.
- Cabeçalho de cena com lugar e momento: `cabecalho-cena.tsx`.
- Retrato de NPC em SVG no códex, aba Pessoas, campo "Relação" em texto livre: `codex.tsx`, `retrato/`.
- Começos prontos no último passo da criação (`criacao/comecos.ts`) e aventuras prontas de PF2e (`lib/aventuras/`).

## Pacotes

### G01. Humor do NPC (dados)
- **Ideia do Greg:** cada NPC da lista mostra uma disposição curta ("CURIOUS") ao lado do retrato.
- **Aqui:** campo `atitude` enumerado no diário do NPC (ex.: amistoso, curioso, desconfiado, hostil, devoto, com medo,
  apaixonado, neutro), ao lado do texto `relacao` que já existe.
- **Arquivos prováveis:** `lib/mestre/ferramentas/diario.ts`, `esquemas.ts`, tipos do diário, `prompt.ts` (o mestre atualiza
  quando muda), migração se o diário for tipado no banco.
- **Aceite:** o mestre registra e atualiza `atitude`; valor fora da lista é recusado com erro claro; fichas e diários antigos
  continuam abrindo; teste unitário do esquema; 2 jogadas com o mestre real em que o NPC muda de humor.
- **Tamanho:** M. **Modelo:** Opus (ferramenta do mestre e prompt). **Jogadas reais:** 2.

### G02. "Pessoas por aqui" (interface, depende de G01)
- **Ideia:** lista de relacionamentos sempre à mão, com retrato pequeno, nome e humor.
- **Aqui:** faixa compacta com os NPCs da cena atual (retrato SVG + etiqueta de humor colorida), clique abre o códex na
  pessoa. Desktop: no painel lateral, aba Cena. Celular: dentro do códex, sem ocupar a tela de leitura.
- **Arquivos:** `mesa-historia.tsx`, `codex.tsx`, novo componente em `components/historia/`.
- **Aceite:** só mostra NPC presente na cena; some quando não há; 375px sem rolagem horizontal; tema claro e escuro.
- **Tamanho:** M. **Modelo:** Sonnet. **Jogadas reais:** 0.

### G03. Tipo de teste colorido nas ações sugeridas
- **Ideia:** cada sugestão mostra o tipo de teste com cor própria ("Sem rolagem", "Persuasão"…).
- **Aqui:** rótulo + cor por tipo (sem rolagem, social, físico, mental, sorte) em `painel-acao.tsx` e
  `sugestoes-compactas.tsx`; mapeamento puro e testado. Conferir antes se `SugestaoAcao` já carrega o tipo do teste; se não,
  inferir só quando houver pedido de teste e não inventar quando faltar.
- **Aceite:** contraste mínimo 4,5:1; leitor de tela lê o tipo; sem alterar o atalho numérico; sem cor como única pista.
- **Tamanho:** P. **Modelo:** Sonnet. **Jogadas reais:** 0.

### G04. Aparências do d20 3D
- **Ideia:** dados e bandeja com variações (Obsidian, Cobalt, Crimson…). No Greg são vendidas; aqui são grátis.
- **Aqui:** 5 a 6 acabamentos do d20 (cor do corpo, cor do número, brilho) em `dado-3d/textura.ts` e `cena.ts`, escolha
  guardada no navegador (localStorage, com try/catch) e seletor em Configurações ou no rolador.
- **Aceite:** o d20 muda sem recarregar; crítico e falha crítica continuam legíveis em todos os acabamentos; sem aumentar o
  custo de memória do three.js além do necessário (uma textura por acabamento, criada sob demanda).
- **Tamanho:** M. **Modelo:** Sonnet. **Jogadas reais:** 0.

### G05. Progresso na home
- **Ideia:** "Round 7 of 10" no cartão da campanha em destaque.
- **Aqui:** no cartão "Onde vocês pararam": "Noite N · M missões em aberto" com barra fina quando houver missões (concluídas
  / total). Usa `resumoDasNoites` e o diário; não inventa teto de rodadas.
- **Arquivos:** `app/page.tsx`, consulta ao diário no servidor.
- **Aceite:** campanha sem missões não mostra barra; contagem confere com o diário; mobile sem quebra.
- **Tamanho:** P. **Modelo:** Sonnet. **Jogadas reais:** 0.

### G06. Galeria de aventuras prontas
- **Ideia:** página Worlds com capa, sinopse e "Start Your Story".
- **Aqui:** em `/nova`, uma vitrine de cenários (capa em SVG gerado, sinopse, sistema recomendado, duração) que pré-preenche a
  criação com o começo, o tom e o gancho; reaproveita `comecos.ts`, `ganchos.ts` e `lib/aventuras/`. Começar com 4 a 6
  cenários originais (nada copiado dos mundos do Greg).
- **Aceite:** cada cartão leva à criação com tudo preenchido e editável; funciona nos 8 sistemas ou avisa quando um cenário
  não serve ao sistema; nenhuma campanha é criada antes de o jogador confirmar.
- **Tamanho:** G. **Modelo:** Opus (texto dos cenários e integração com a criação). **Jogadas reais:** 1.

### Ideias novas (REA, 08/11) — só nomes e rotas vistos no bundle, nada de como funcionam por dentro

- **G07. Desfazer / refazer rodada:** JÁ EXISTE (rota `desfazer`, botões Desfazer / Outra resposta / Reabrir a noite em `acoes-turno.tsx`). Descartado.
- **G08. Exportar a campanha:** JÁ EXISTE (livro em `/mesa/[id]/livro` com Imprimir/salvar PDF, Markdown em `/api/campanhas/[id]/livro`, JSON em `/exportar`). Descartado.
- **G09. Galeria de retratos prontos** (arquétipos em SVG) na criação do herói. Depois do G06. Sonnet.
- **G10. Cenários iniciais por mundo**: entra dentro do G06, sem pacote próprio.
- **G11. Campanha demo/tutorial** de ~10 min para primeiro uso. Opus (texto) + 1 jogada real.
- **G12. Feedback da resposta do mestre** (polegar, guardado local). Só se for ler os dados. Sonnet.
- **G13. Painel de preferências** (dado, volume, idioma). Sonnet.
- **Fork de campanha:** grande, mexe no banco; avaliar depois do G07.
- **Fora:** créditos, indicação, push, consentimento de IA/denúncia, pixels, música em streaming, selo de app.

Ordem sugerida: onda B (G01→G02), onda C (G06 + G10), depois G09, G11, G13.

## Ordem e paralelismo

- **Onda A (em paralelo, arquivos separados):** G03, G04, G05.
- **Onda B (em sequência):** G01, depois G02 (os dois mexem em diário e códex).
- **Onda C:** G06 (maior, sozinho).

Fluxo por pacote igual ao das ondas anteriores: implementador, verificador adversarial, corretor se reprovar; por onda,
integrador (`tsc`, `eslint`, `npm test`, um commit) e teste com o mestre real onde marcado. Regras de sempre: servidor só
pelo atalho (porta 3300), `NODE_OPTIONS=--max-old-space-size=4096`, campanhas de teste com "(teste)", nunca tocar nas
campanhas 30, 33 e 43.

## Custo e riscos

- Onda A é barata (Sonnet, sem mestre real). G01 e G06 pedem Opus e jogadas reais (usam o plano do Claude, não a API).
- G01 muda o formato do diário: precisa ler diários antigos sem `atitude`.
- G04 pode pesar no celular se as texturas forem grandes: medir antes de aceitar.
- Pendente de confirmar com telas que não vimos: Enigmas, abas do painel do personagem e criação de campanha do Greg.

## Onda D (09/11/2026): cara de Greg na home e na mesa

Origem: nova olhada só nas páginas públicas do Greg (topo, faixa de retratos, mural, "como funciona", FAQ, preços). Nada de dentro do jogo logado. Não foi preciso usar o REA nesta onda. As telas que pedem login (Enigmas, abas do painel da campanha, criação de campanha) continuam não vistas: para avançar nelas, o Paulo precisa abrir o site do Greg logado e avisar.

Cinco pacotes em paralelo, sem arquivo repetido entre eles. O G14 define classes, tokens e ícones; os outros usam pelo nome. O G15 e o G16 trocam componentes por caminho e props fixos.

### G14. Base visual
- **Ideia do Greg:** fundo quase preto com estrelas, título com brilho, botão grande e luminoso, cartões com borda fina e preenchimento de matizes diferentes, rodapé da casa.
- **Aqui:** 8 matizes (`--matiz-1..8`, classes `.matiz-N`), `cartao-matiz`, `etiqueta-matiz`, `fita-destaque`, `texto-matiz`, `cartao-clicavel`, `titulo-brilho`, `btn-palco`, `.ceu-topo`, estrelas no fundo do site (`--estrelas`; fora em pf2e, osr e d100), tokens `--grau-*`, botões com hover e clique. Na casca: link Aventuras e marcador do item ativo, rodapé novo, cabeçalho único em Sistemas, Configurações e Cópias, ícones `menu`, `send`, `chevronDown`, `arrowUp`. Teste de contraste WCAG por tema.
- **Arquivos:** `app/globals.css`, `app/temas.css`, `components/icones.tsx`, `app/layout.tsx`, `app/config/navegacao.tsx`, `app/sistemas/page.tsx`, `app/config/page.tsx`, `app/backup/page.tsx`, `app/not-found.tsx`, novos `components/cabecalho-pagina.tsx`, `components/rodape-casa.tsx`, `tests/matizes.test.ts`.

### G15. Home e "Jogar agora"
- **Ideia do Greg:** um único botão que começa em segundos, sem formulário; faixa de 8 retratos com borda de cores diferentes.
- **Aqui:** `jogarAgoraAcao` cria campanha solo do modo história com herói de arquétipo (nome e gancho sorteados) e aventura curta (a tutorial na primeira vez) e já abre a mesa. Home com céu no topo, um botão principal, faixa de heróis clicáveis, campanhas com matiz e encaixe das seções do G16. Falha volta para a home com aviso.
- **Arquivos:** `app/page.tsx`, novos `lib/inicio/heroi-pronto.ts`, `lib/inicio/matiz-campanha.ts`, `app/nova/jogar-agora-acoes.ts`, `components/inicio/botao-jogar-agora.tsx`, `components/inicio/faixa-herois.tsx`, `tests/heroi-pronto.test.ts`, `tests/matiz-campanha.test.ts`.

### G16. Vitrine
- **Ideia do Greg:** "como funciona" em formato de conversa com chip da perícia e selo do resultado; três cartões coloridos com um em destaque; FAQ em sanfona.
- **Aqui:** jogada de exemplo original (o ladino, o telhado e o barril de picles) com os mesmos selos da mesa; três portas de entrada (Jogar agora, Montar meu herói, Ficha completa), todas grátis; sete perguntas de balcão em `<details>`; em `/aventuras`, matizes, fita "Comece por aqui" e o atalho "Jogar já com herói pronto" nas aventuras do modo história.
- **Arquivos:** `app/aventuras/page.tsx`, novos `components/inicio/jogada-exemplo.tsx`, `lib/inicio/jogada-exemplo-dados.ts`, `components/inicio/portas-de-entrada.tsx`, `components/inicio/perguntas-frequentes.tsx`, `lib/inicio/perguntas.ts`, `tests/inicio-vitrine.test.ts`.

### G17. Mesa: a jogada como conversa
- **Ideia do Greg:** chip da perícia + selo do resultado logo abaixo da ação; blocos do mestre e do personagem bem distintos.
- **Aqui:** a ação vira bloco na cor do personagem com chip da perícia (cor do tipo de teste, G03), selo do grau e selo "1 natural" / "20 natural" (só em teste de d20); rótulo "Mestre" na primeira narração de cada turno do modo rolagem; frases de espera da taverna; cores de grau por token do tema.
- **Arquivos:** `app/mesa/[id]/mesa-historia.tsx`, `components/historia/cartao-acao.tsx`, `components/historia/cores.ts`, `components/historia/linha-dado.tsx`, novos `components/historia/selo-desfecho.ts`, `selos-da-acao.tsx`, `frases-espera.ts`, `espera-mestre.tsx`, `tests/selo-desfecho.test.ts`, `tests/frases-espera.test.ts`.

### G18. Mesa: campo "o que você faz?"
- **Ideia do Greg:** a conversa termina num campo com botão de enviar.
- **Aqui:** botões do rodapé nas cores do tema (sem hex fixo), ícones no lugar dos glifos, realce de convite quando chega a vez da pessoa, contador perto do limite de 2000 caracteres. A altura do painel não muda.
- **Arquivos:** `components/historia/painel-acao.tsx`, `components/chat/sugestoes-compactas.tsx`, novos `components/historia/campo-convite.ts`, `tests/campo-convite.test.ts`.

### Integração
- Os cinco rodam em paralelo; depois o integrador roda `tsc`, `eslint`, `npm test` e o build, e faz um commit.
- Conferir no `tsc`: nomes dos ícones novos (G14) usados por G16 e G18; imports cruzados entre G15 e G16.
- Olhar com a taverna ligada: home vazia e com campanhas em 375px, estrelas em cada tema, rodapé em `/mesa/[id]/livro` e na impressão, selos da ação nos dois modos de leitura.
- "Jogar agora" cria campanha de verdade (sem "(teste)" no nome): quem testar apaga a que criar. Nunca tocar nas campanhas 30, 33 e 43.
- Jogada real sugerida: uma, para ver o selo carimbar e o "1 natural" / "20 natural" na mesa.

### Fora desta onda
- Polegar na resposta do mestre (G12): só vale com uso real no prompt; fica para depois.
- Mural de depoimentos (seriam inventados) e preços/créditos (a taverna é local e grátis).
- Telas do Greg que pedem login: Enigmas, abas do painel, criação de campanha.
