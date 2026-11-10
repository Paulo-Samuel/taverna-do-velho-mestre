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
