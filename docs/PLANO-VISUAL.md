# Plano visual (onda E): auditoria de tela, da campanha à publicação

## Origem

Pedido do dono: continuar as melhorias visuais por meio de auditorias, num projeto grande, com agentes cobrindo desde as campanhas até a publicação do site.

Oito auditores olharam a taverna no ar (build da onda D, porta 3300) por captura de tela e leitura de código, uma área cada: home e aventuras, criação, mesa história (leitura), mesa história (ação), mesa avançada, ajustes/livro/backup/entrar, casca e temas, publicação. Saíram cerca de 110 achados. Este plano cobre todos os de gravidade alta e média e os baixos que saem de graça, em 11 pacotes que não dividem arquivo entre si (rodam em paralelo na mesma pasta).

Limite conhecido da auditoria: o Chrome headless no Windows não abre janela com menos de ~500px. Nenhuma captura prova o comportamento em 375px; a conferência de celular fica para o integrador, com emulação de dispositivo.

## Pacotes

| Id | Pacote | Objetivo | Arquivos principais |
|---|---|---|---|
| V01 | Base visual | Contraste do `--sangue` e do placeholder, anel de foco no `campo`, segunda camada de estrelas, 10 ícones novos, `btn-perigo`, `btn-perigo-cheio`, `FaixaAviso`, `LinkVoltar` | `globals.css`, `temas.css`, `icones.tsx`, `tests/matizes.test.ts`, `components/faixa-aviso.tsx`, `components/link-voltar.tsx` |
| V02 | Casca, /sistemas e /config | Matizes e ícones no catálogo, select quebrado das Preferências, hierarquia do /config, Diagnóstico, navegação, aviso Dark Pack | `config/navegacao.tsx`, `cabecalho-pagina.tsx`, `aviso-dark-pack.tsx`, `sistemas/catalogo.tsx`, `sistemas/page.tsx`, `config/page.tsx`, `config/formulario.tsx`, `painel-preferencias.tsx` |
| V03 | Home | Excluir no cartão de destaque, diálogo no lugar do `confirm()`, grade sem nove botões primários, faixa de aventuras | `app/page.tsx`, `app/botao-excluir.tsx`, `components/inicio/faixa-herois.tsx`, `botao-jogar-agora.tsx` |
| V04 | Vitrine /aventuras e capas | Filtro que agrupa nativas e "também roda em", cabeçalho padrão, capa própria por aventura | `aventuras/page.tsx`, `lib/aventuras/capa-arte.ts`, `capa-aventura.tsx`, `lib/aventuras/ordem-vitrine.ts`, testes |
| V05 | Criação | Ícones no lugar de glifos, tokens, cartões de escolha, avisos, legenda "Mesa", plural, travessão das licenças | `criacao-historia.tsx`, `estilos.ts`, `formulario-personagem.tsx`, `passos.tsx`, páginas de `nova/` e `personagens/`, `lib/plural-rotulo.ts`, linha `licenca` de 8 sistemas |
| V06 | Mesa história: leitura e casca | Véu do "Anteriormente", "continuar" visível, faixa "Por aqui", céu e humores em token, glifos, travessões, toque | `mesa-historia.tsx`, `leitor-cenas.tsx`, `prosa.tsx`, `pecas.tsx`, `anteriormente.tsx`, `pessoas-aqui.tsx`, `pessoas-presentes.ts`, `ceu-estrelado.tsx` |
| V07 | Mesa história: ação, dados, códex | Ícones nas linhas de dado e no pedido de teste, matizes nos selos, parada sem texto de 8px, sugestões discretas legíveis, códex | `linha-dado.tsx`, `pedido-teste.tsx`, `parada-dados.tsx`, `dado-3d.tsx`, `codex.tsx`, `cores.ts`, `tipo-teste.ts`, `musica.tsx`, `painel-acao.tsx`, `chat/sugestoes-compactas.tsx`, `chat/acoes-turno.tsx`, `chat/atalhos.tsx` |
| V08 | Mesa avançada: casca e dados | `COR_GRAU` nos tokens `--grau-*`, glifos do cartão de dados, rodapé do compositor, abas do diário | `mesa.tsx`, `chat/cartao-dado.tsx`, `rolador/rolador-dados.tsx`, `diario/diario.tsx` |
| V09 | Mesa avançada: ficha e grupo | Recursos nos matizes, coluna de números, rótulo que quebra, toque de 40px no painel | `painel-ficha.tsx`, `ajuste-ficha.tsx`, `gastar-xp.tsx`, `painel-grupo.tsx`, `avatar.tsx`, `ficha/cores-recurso.ts` |
| V10 | Ajustes, livro, cópias, entrar | Cabeçalho padrão, seção única, avisos e voltar unificados, botões de perigo, lixeira leve, livro sem glifos | `ajustes/page.tsx`, `ajustes/formularios.tsx`, `backup/page.tsx`, `backup/formularios.tsx`, `livro/page.tsx`, `livro/livro.css`, `entrar/entrada.tsx`, `entrar/page.tsx`, `components/secao-cartao.tsx` |
| V11 | Publicação | README com galeria e novidades, receita das capturas, Open Graph e título por página, aba da mesa, ícone maskable, erro e 404, rodapé | `README.md`, `docs/prints/LEIA-ME.md`, `layout.tsx`, `manifest.ts`, `mesa/[id]/page.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `rodape-casa.tsx`, `lib/descricao-casa.ts` |

## Contratos entre pacotes

Só o V01 cria coisa que outros usam; os nomes são fixos.

- Ícones novos em `icones.tsx`: `arrowLeft`, `swords`, `warning`, `undo`, `redo`, `stop`, `heart`, `fastForward`, `download`, `external`.
- Classes novas em `globals.css`: `btn-perigo` (V10), `btn-perigo-cheio` (V03, V10).
- `FaixaAviso` (`tom`, `icone`, `acoes`, `className`, `children`) e `LinkVoltar` (`href`, `children`, `className`): V05 e V10.
- V02 cria `id="creditos"` em /sistemas; o rodapé do V11 aponta para lá.
- V11 põe `title.template` no layout; V02, V04, V05 e V10 tiram o sufixo " · Taverna do Velho Mestre" dos títulos das suas páginas.
- V06 acrescenta a prop opcional `aoMudarFase` em `Anteriormente`; a mesa avançada (V08) não precisa passar.
- Magia e sanidade usam `--matiz-1` e `--matiz-5` tanto no códex (V07) quanto na ficha (V09).

## Depois dos pacotes (integrador)

1. `tsc`, `eslint`, testes inteiros. Conferir com grep que " · Taverna do Velho Mestre" só resta no template do layout e no `not-found.tsx`.
2. Recompilar e conferir as telas de cada pacote; conferir 375px com emulação de dispositivo de verdade (home, /aventuras, mesa 246, mesa 145 com o painel da ficha, /config).
3. Capturar os 8 `docs/prints/readme-NN-*.png` pela receita do `LEIA-ME.md` e remover com git as 15 capturas antigas (uma tem acento no nome e é duplicata). Nenhuma captura pode mostrar campanha pessoal nem nome de pessoa real.
4. Registrar a onda E no `AGENTS.md`.

## Fora da onda, e por quê

- Linhas do `AGENTS.md` com caminho pessoal da máquina, outros projetos e ids de campanha: o repositório é público, mas é arquivo de instruções do dono. Fica como pergunta, com a proposta do auditor (mover para um arquivo local ignorado).
- Licença do código (`LICENSE`, campo `license`): decisão do dono. Sugestão do auditor: MIT.
- `package.json` (descrição sem Vampiro e sem modo história, nome `taverna-local`): a onda não edita esse arquivo. A frase única está em `lib/descricao-casa.ts`.
- Paginação do leitor em tela alta e primeira página curta: mexe em regra de paginação, que tem testes próprios; gravidade baixa.
- Ação do topo expansível e selos em linha própria: muda a altura de um leitor que pagina por altura; gravidade baixa.
- Travessão em descrições de classes e ancestralidades (`src/lib/sistemas`): esses textos podem ir para o prompt do mestre. Só a linha `licenca`, que é apenas exibida, entrou.
- Travessão no Markdown exportado do livro (`montar.ts`): é arquivo do jogador, não tela.
- Campo `motivo` na aventura: trocado por uma tabela por id dentro de `capa-arte.ts`, sem mexer nos dados.
- Fundo sem `background-attachment: fixed` em telas pequenas: risco de deslocar a textura do tema; baixa.
- Versão e commit no rodapé: pede lógica nova.
- Texto corrompido na campanha 31 ("Tr?s-Dedos"): é dado gravado no banco.
- Matiz por papel da classe nos ofícios e caixinhas de recurso na aba Grupo: opcionais sem dado pronto.

# Onda F: acabamento (visual e usabilidade)

## Origem

Pedido do dono: "mais melhorias". Depois da onda E (auditoria por área de tela), seis lentes transversais olharam a taverna inteira, cada uma com um assunto: pendências deixadas pela onda E, estados (vazio, carregando, erro, envio), acessibilidade (teclado, leitor de tela, zoom de 200%), movimento, sensação de jogo e textos. Saíram 85 achados, muitos no mesmo arquivo. Esta onda cobre todos os de gravidade alta e média e os baixos baratos, em 12 pacotes organizados por arquivo (não por lente): cada pacote recebe tudo o que cai nos seus arquivos, e nenhum arquivo aparece em dois pacotes, então rodam em paralelo na mesma pasta.

Limites: nada de regra de jogo, prompt do mestre ou banco. Só apresentação, foco, movimento e texto de tela.

## Pacotes

| Id | Pacote | Objetivo | Arquivos |
|---|---|---|---|
| F01 | Base: movimento, classes, ícones e casca | Tokens de duração, `surgir` em 220 ms, `surgir-menu`, pontinhos num lugar só, esqueleto, halo, lampejo de vida, marca de "sua vez", link de pular, diálogo com saída, estados pressionados, redução de movimento global, 3 ícones | `app/globals.css`, `app/temas.css`, `components/icones.tsx`, `app/layout.tsx`, `tests/matizes.test.ts` |
| F02 | Utilitários compartilhados (só arquivos novos) | `EstadoVazio`, foco preso, ajudas de movimento, `haQuanto` único, anunciador da narração, título da aba na vez, sinal de navegação, esqueleto de /aventuras | `components/estado-vazio.tsx`, `lib/foco-preso.ts`, `lib/cliente/use-foco-preso.ts`, `lib/cliente/movimento.ts`, `lib/ha-quanto.ts`, `lib/anuncio-narracao.ts`, `components/mesa/anunciador-narracao.tsx`, `lib/cliente/titulo-da-vez.ts`, `lib/cliente/use-titulo-da-vez.ts`, `components/sinal-de-ida.tsx`, `app/aventuras/loading.tsx`, 5 testes |
| F03 | Mesa avançada | "Anteriormente" com fundo inerte, aviso com tom de erro, envio em "Começar a aventura", painel do celular com foco, anúncio da narração, "sua vez" no campo e na aba, histórico sem reanimar, tela baixa | `app/mesa/[id]/mesa.tsx` |
| F04 | Mesa história: casca, vida e "Anteriormente" | Landmark `main`, foco devolvido, aviso com tom, barra de vida que reage, pílula fora do texto, "Por aqui" com nome acessível | `mesa-historia.tsx`, `historia/anteriormente.tsx`, `historia/pessoas-aqui.tsx`, `historia/retrato/desenho.tsx`, novo `historia/tom-vida.ts` + teste |
| F05 | Cabeçalho da mesa, popovers e códex | Pular para a história, menu "Mais opções" sem papel falso, popovers que devolvem o foco, foco preso, abas com setas, vazios com dica, trilha que não cobre o menu | `mesa/cabecalho-mesa.tsx`, `historia/musica.tsx`, `voz/voz.tsx`, `presenca/convite.tsx`, `presenca/presenca.tsx`, `historia/codex.tsx` |
| F06 | Leitor | Chips com ícone, escada e tons, virada de página com um ritmo, cabeçalho de cena legível, largura da coluna e entrelinha, detalhes sem travessão | `leitor/leitor-cenas.tsx`, `prosa.tsx`, `mudancas.tsx`, `menu-leitura.tsx`, `preferencias.ts`, `cena.ts`, novo `leitor/conforto.ts` + teste |
| F07 | Dados e testes | Crítico e falha crítica persistentes no modo história, grau em destaque, d20 com cara de dado, espera viva para quem assiste, subir de nível como evento, dados do Vampiro legíveis | `historia/pedido-teste.tsx`, `parada-dados.tsx`, `chat/cartao-dado.tsx`, `historia/linha-dado.tsx`, `selos-da-acao.tsx` |
| F08 | Espera, campo de ação, chat e fim de noite | Espera que avisa a demora, "sua vez" persistente, sugestões rápidas, foco preso em atalhos e encerrar, cartão "Noite N encerrada" | `historia/painel-acao.tsx`, `ceu-estrelado.tsx`, `espera-mestre.tsx`, `frases-espera.ts`, `leitor/pecas.tsx`, `chat/acoes-turno.tsx`, `sugestoes-compactas.tsx`, `atalhos.tsx`, `sessao/encerrar-noite.tsx`, `sessao/noite.ts`, 2 testes |
| F09 | Painéis da mesa avançada | Vazios com ação, fatos com carregando, toque de 40px, ícones, seletor de personagem, barras | `diario/diario.tsx`, `cena/painel-cena.tsx`, `grupo/painel-grupo.tsx`, `grupo/seletor-ativo.tsx`, `fatos/painel-fatos.tsx`, `fatos/fixar-selecao.tsx`, `rolador/rolador-dados.tsx` |
| F10 | Ficha e criação | Barras com rastro de perda, foco, toque e contraste no ajuste e no XP, lupa e "Limpar a busca" nos passos, textos | `ficha/painel-ficha.tsx`, `ajuste-ficha.tsx`, `gastar-xp.tsx`, `passos.tsx`, `formulario-personagem.tsx`, `previa.tsx`, `historia/criacao/criacao-historia.tsx` |
| F11 | Home e páginas da casa | Vocabulário único, títulos de aba, um formulário na faixa de heróis, sinal de navegação, escada na home, vazios, navegação do celular, diálogo de excluir | `app/page.tsx`, `inicio/faixa-herois.tsx`, `inicio/botao-jogar-agora.tsx`, `aventuras/page.tsx`, `not-found.tsx`, `nova/page.tsx`, `nova/avancada/page.tsx`, `sistemas/page.tsx`, `sistemas/catalogo.tsx`, `config/page.tsx`, `config/formulario.tsx`, `config/navegacao.tsx`, `botao-excluir.tsx`, `backup/page.tsx`, `api/diagnostico/route.ts`, novo `lib/aventuras/rotulo-duracao.ts` + teste |
| F12 | Páginas da campanha e mensagens da API | Tela de entrar com estados honestos, livro em branco com ação, nota de rolagem sem travessão, landmarks, lixeira nos ajustes, erros que dizem o que fazer | `mesa/[id]/page.tsx`, `ajustes/page.tsx`, `ajustes/formularios.tsx`, `ajustes/acoes.ts`, `entrar/entrada.tsx`, `livro/page.tsx`, `livro/montar.ts`, `tests/noites.test.ts`, 8 rotas em `api/campanhas/[id]/` |

## Contratos entre pacotes

Só F01 e F02 criam coisa que os outros usam. Os nomes são fixos.

F01, em `globals.css`:
- Tokens em `:root`: `--mov-rapido` (140ms), `--mov-padrao` (220ms), `--mov-barra` (250ms), `--mov-curva`. Barras usam `duration-[var(--mov-barra)]` (F04, F05, F07, F09, F10).
- `.surgir` passa a 220 ms. `.surgir-menu` (140 ms, opacity + scale) para menus e popovers: F05, F06, F09, F11.
- `.pensando` (com `@keyframes pensar`): F08 apaga as duas cópias; F02 e F07 usam.
- `.esqueleto`: F02 (/aventuras) e F09 (fatos).
- `.halo-pulso`: F07 (crítico, subir de nível) e F10 (caixinhas).
- `.lampejo-perda` e `.lampejo-ganho`: F04 (vida no rodapé).
- `.campo-convite` (sai do `painel-acao.tsx`) e `.campo-da-vez`: F03 e F08.
- `.pular-conteudo`: F01 no layout (`#conteudo`) e F05 no cabeçalho da mesa (`#palco-da-mesa`).
- `dialog.dialogo-suave`: F11 (`botao-excluir.tsx`).
- `:active` em `btn-perigo`, `btn-perigo-cheio` e `cartao-clicavel`; redução de movimento global para `.animate-pulse` e `.animate-bounce`.

F01, em `icones.tsx`: `search` (F09, F10, F11), `cloud` (F09), `clock` (F06).

F02:
- `EstadoVazio` em `@/components/estado-vazio` (`icone`, `children`, `dica`, `acao`, `compacto`, `className`): F03, F05, F09, F10, F11, F12. O `Vazio` do códex deixa de existir (F05).
- `useFocoPreso(ref, ativo, { devolver, reserva })` em `@/lib/cliente/use-foco-preso`: F05 (códex, convite, presença), F08 (atalhos, encerrar a noite), F10 (gastar XP).
- `comportamentoDeRolagem`, `prefereMenosMovimento`, `ehMensagemNova`, `atrasoEscada` em `@/lib/cliente/movimento`: F03, F04, F08, F10, F11.
- `haQuanto(quando, agora?)` em `@/lib/ha-quanto`: F10 e F11 apagam as três cópias.
- `AnunciadorNarracao` em `@/components/mesa/anunciador-narracao` e `useTituloDaVez` em `@/lib/cliente/use-titulo-da-vez`: F03 e F04.
- `SinalDeIda` em `@/components/sinal-de-ida`: F11.

Outros combinados:
- F03 e F04 põem `id="palco-da-mesa"` e `tabIndex={-1}` no palco; F05 aponta o link de pular para lá.
- O botão do códex na mesa história mantém `data-ordem="codex"`; o códex (F05) devolve o foco a ele.
- F08 não muda as props de `EsperaMestre` (`semente`); F03 passa a usá-lo na mesa avançada.
- F07 exporta `ANEL_CRITICO`, `ANEL_FALHA` e `IconeD20` do `cartao-dado.tsx` para o `pedido-teste.tsx` (mesmo pacote).
- O texto "Aventura solo por enquanto. Dá para sentar mais gente neste computador ou chamar pela rede com o convite, no menu do cabeçalho." é o mesmo em F05 (códex) e F09 (aba Grupo).
- `useEscalaLeitor()` (F06) passa a devolver também `--leitor-coluna` e `--leitor-entrelinha`; as mesas já espalham esse estilo na raiz e não mudam.

## Depois dos pacotes (integrador)

1. `tsc`, `eslint`, testes inteiros. Atenção no `tsc` aos imports dos arquivos novos do F02 e aos ícones `search`, `cloud`, `clock`.
2. Conferir com grep: `@keyframes pensar` e `campo-convite` só no `globals.css`; nenhuma função `haQuanto` local; nenhum `function Vazio` no códex; nenhum `loading.tsx` fora de `/aventuras`; nenhum `role="menuitem"` no cabeçalho da mesa.
3. Recompilar e conferir as telas de cada pacote. Com teclado: Tab do começo da mesa (link de pular), códex (setas nas abas, Tab preso, Esc devolve o foco), menu "Mais opções", painel do celular da mesa avançada, "Anteriormente". Com zoom de 200% (1280x720): mesa 145 e mesa 32.
4. Conferir em 375px com emulação de dispositivo: aba Grupo, popover da trilha aberto pelo menu, pílula do "Anteriormente", faixa de heróis.
5. Conferir a paginação do leitor depois de trocar coluna e entrelinha, e que a virada de página não refaz a conta.
6. Uma jogada real (campanha de teste): ver o resultado do d20 no modo história, a barra de vida reagir, o aviso de demora depois de 45 s e o título da aba mudar com a aba em segundo plano.
7. Rodar `tests/w09-historia-personagem.test.mjs` com a taverna ligada: a mesa apagada tem de continuar respondendo 404.
8. Registrar a onda F no `AGENTS.md`.

## Fora da onda, e por quê

- `loading.tsx` na raiz, em `/mesa/[id]` e nas filhas: com ele a página passa a ser transmitida e o `notFound()` e o `redirect()` da mesa respondem 200 em vez de 404 e 307 (documentação do Next, "Status codes"; o teste w09 confere o 404, e o redirecionamento do PIN mudaria de natureza). No lugar: `SinalDeIda` nos links da home e esqueleto só em `/aventuras`.
- View Transition da home para a mesa: a mesa pagina por altura e recebe eventos ao vivo; ganho baixo para o risco. Fica como ideia aberta.
- Restringir o seletor da transição de tema (`body, [data-tema]`): precisa de validação com a troca de sistema na criação. Só a duração caiu para 250 ms.
- Formato da linha de rolagem gravada (`api/campanhas/[id]/rolagem/route.ts`, com travessão e seta): é texto que vai para o banco e para o contexto do mestre. O livro limpa na exibição (`limparNota`).
- Travessões do molde do Markdown exportado (`montar.ts`): mantida a decisão da onda E (arquivo do jogador).
- "Mesa não encontrada." em 21 rotas e em `lib/mestre`: troca espalhada demais para o ganho; pede uma constante compartilhada e revisão dos testes de rede.
- "O que mudou" recolhido por padrão em tela baixa: muda a altura de um leitor que pagina por altura.
- Saída animada dos popovers (menu, voz, leitura, presença): pediria máquina de estados só para a saída. Só o diálogo nativo ganhou.
- `aria-modal` no painel do celular da mesa avançada: o botão de fechar fica no cabeçalho, fora do painel; com `aria-modal` o leitor de tela o perderia. Ficou com `inert` no conteúdo e foco gerenciado.
- `.animate-spin` na redução global de movimento: girador parado parece travado.
- Nome "Modo História" em `lib/sistemas/historia.ts` e duração "one-shot" nos dados das aventuras: vão ao prompt ou têm teste; a tela troca só o rótulo.
- Cartão de teste apagado quando a conexão cai (`semSinal`): a faixa "Sem sinal da taverna" já explica; o apagado continua.
- Respiração do dado parado para quem assiste: o CSS do brilho mora em outro pacote; ficaram os pontinhos e o cartão em cor cheia.
