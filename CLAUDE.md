# Taverna do Velho Mestre — instruções para o Claude Code

RPG de mesa com mestre de IA que roda na máquina da pessoa (Next.js 16 + SQLite do Node). Detalhes de uso no README.md;
licenças das regras em LICENCAS.md.

Este arquivo é, antes de tudo, o roteiro de quem instala a taverna na máquina de outra pessoa usando o Claude Code: siga os
passos na ordem, confira cada um, e não improvise "consertos" (o item 4 diz o que nunca fazer). O que quebra de verdade na
instalação está aqui, não em erros de código.

## Instalar e rodar (quando a pessoa pedir para "instalar", "configurar", "rodar" ou "atualizar" a taverna)

0. **De onde veio a pasta, e onde ela está.**
   - Sem `.git` na pasta, ela veio de um ZIP: avise que as atualizações vão exigir o Git (o `atualizar-taverna.cmd` explica
     a migração quando for a hora) e siga.
   - O lugar certo é `C:\taverna` (ou outra pasta **fora do OneDrive e da Área de Trabalho sincronizada**): dentro do
     OneDrive o banco trava e a `node_modules` inteira sobe para a nuvem. Se estiver no lugar errado, peça para mover a pasta
     antes de qualquer outra coisa (e refaça o atalho depois).
1. **Pré-requisitos** (confira antes; só instale o que faltar):
   - Node 24 LTS: `node -v`. Faltando ou abaixo de 24: `winget install OpenJS.NodeJS.LTS`. É a linha **LTS**, não a Current:
     `winget install OpenJS.NodeJS` instala a 26, que não foi testada.
   - Claude Code **2.1.45 ou mais novo**: `claude --version`. Faltando: `winget install Anthropic.ClaudeCode`; antigo:
     `claude update`.
   - Git (para atualizar): `git --version`. Faltando: `winget install Git.Git`.
   - **Depois de instalar qualquer coisa pelo winget, peça à pessoa para fechar e reabrir o Claude Code antes de continuar.**
     O PATH só muda em processo novo: a sua sessão atual vai continuar sem achar `node`, `claude` ou `git`, por mais que você
     repita o comando. Na sessão nova, confira de novo com `node -v`, `claude --version` e `git --version`.
2. **Login do mestre.** O padrão (`TAVERNA_PROVEDOR=cli`) usa o Claude Code logado nesta máquina como mestre, sem custo
   extra de API. O login é da própria pessoa: ela roda `claude` uma vez no terminal e entra com a conta dela. Nunca copie,
   leia ou mova tokens. O `.env.local` nasce sozinho a partir do `.env.example` na primeira vez que o atalho roda; só mexa
   nele se precisar: `CLAUDE_BIN=desktop` usa sempre o Claude Code mais novo embutido no app Claude (quando o `claude` não
   está no PATH; um caminho fixo para dentro do app morre a cada atualização dele), `CLAUDE_CLI_MODELO=sonnet` (rápido) ou
   `opus` (melhor narrativa, gasta mais do plano).
   **Para o amigo sem plano:** `TAVERNA_PROVEDOR=api` e `ANTHROPIC_API_KEY=<chave dele>` no `.env.local` (a pessoa cola a
   própria chave; você não lê, não copia e não mostra a chave). Reinicie a taverna e confira em `/config`: ela mostra a origem
   da chave e os 4 últimos caracteres. Sem chave, `/config` recusa a API e a mesa recusa a ação, sem perder o turno. Custo, do
   mais barato ao mais caro: Haiku, Sonnet (padrão), Opus, Fable; o esforço `medium` é o padrão dos turnos (README, "Modo
   `api`").
3. **Ligar a taverna: pelo atalho, nunca pela sua sessão.** Não rode `npm run dev`, `npm start`, `npm run rede` nem
   `next start` dentro da sua ferramenta de terminal: é um processo que nunca termina e trava a sua sessão. Faça assim:
   - crie o atalho na Área de Trabalho (`[Environment]::GetFolderPath("Desktop")`): um `.lnk` via
     `New-Object -ComObject WScript.Shell` com destino
     `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "<pasta da taverna>\iniciar-taverna.ps1"`, "Iniciar em" na
     pasta da taverna e ícone `assets\taverna.ico`. `iniciar-taverna.cmd` faz o mesmo com duplo clique;
   - peça para a pessoa clicar no atalho (na primeira vez ele instala as dependências e compila: alguns minutos);
   - confira com `curl -s -m 5 -i http://localhost:3300/api/rede`: resposta com `x-taverna: 1` é a taverna no ar; sem esse
     cabeçalho, quem respondeu foi outro programa;
   - abra http://localhost:3300/config: a página mostra se o Claude Code foi encontrado e logado, com **Verificar de novo**
     e **Testar conexão**.
   - **Antes de cada passo acima e sempre que algo falhar, rode `npm run doutor`** (termina sozinho, funciona com a taverna
     desligada) e resolva o que estiver em FALHOU antes de seguir; a seta → de cada linha diz como. ATENÇÃO não impede de
     jogar. A saída fica em `data\logs\doutor-<data>.txt`.
4. **Nunca**, nem para "consertar": editar `package.json` ou `package-lock.json`; `npm update`; `npm audit fix` (com ou sem
   `--force`); `npm install <pacote>`; trocar a porta 3300; apagar ou mexer em `data/` (são as campanhas da pessoa); apagar
   `.env.local`; `git commit`, `git push`, `git reset --hard`, `git checkout -- .`. Se parecer que só isso resolve, pare e
   peça ajuda (item 6).
5. **Atualizar:** com a taverna desligada, `atualizar-taverna.cmd` (duplo clique, ou
   `powershell -NoProfile -ExecutionPolicy Bypass -File atualizar-taverna.ps1`). Ele puxa do GitHub com `git pull --ff-only`,
   reinstala o que mudou e recompila; recusa-se com a taverna no ar; com arquivo alterado à mão, diz qual é e sugere
   `git stash`; sem `.git`, mostra como migrar para o Git. Depois é só abrir o atalho de sempre.
6. **Deu errado:** a janela do atalho fica aberta com a explicação e o código de saída (e a saída do doutor), e tudo o que
   apareceu está em `data\logs\atalho-<data>.log` (atualização: `data\logs\atualizar-<data>.log`; guardados por 14 dias).
   Rode `npm run doutor`. Em `/config`, use **Verificar de novo** e **Testar conexão**.
   **Pedindo ajuda:** mande o relatório de **/config → Diagnóstico** (botão **Copiar relatório**, ou o `.txt` de
   `http://localhost:3300/api/diagnostico?baixar=1`), ou, se a taverna nem sobe, o `data\logs\doutor-<data>.txt` e o
   `data\logs\taverna-<data>.log` do dia. Nenhum deles leva a chave de API nem e-mail. Para testar a interface sem gastar
   nada do plano: `TAVERNA_PROVEDOR=falso` no `.env.local` (mestre de teste sem IA).
7. **macOS e Linux:** não há atalho; siga "Pelo terminal (qualquer sistema)" no README.md, com os mesmos cuidados: nada de
   servidor dentro da sua sessão. A pessoa roda `npm run build && npm start` num terminal dela.
8. **Rede local** (cada um no próprio celular): o atalho já atende a rede (o `next start` escuta em todas as interfaces; não
   precisa de `-H`). Ele mostra "No Wi-Fi de casa: http://<ip>:3300", confere o firewall do Windows e, se nada libera a
   porta, pergunta se deve criar a regra (UAC uma vez, só redes privadas). Não crie regra de firewall pela sua sessão sem a
   pessoa pedir; `GET /api/rede` diz `firewall: "ok" | "bloqueado" | "desconhecido"`. Na mesa, o botão **Convidar** mostra o
   link e o QR code.

## Regras importantes

- O modo `cli` é para uso pessoal: o login da própria pessoa, na própria máquina. Não exponha a taverna na internet nem
  configure o app para usar a conta de outra pessoa.
- `.env.local`, `data/` (banco com campanhas e fichas, e os logs em `data/logs/`) e `musica/` ficam fora do git. Uma
  atualização nunca mexe neles.
- A taverna é da porta 3300; os scripts aceitam `TAVERNA_PORTA` só para testar os próprios scripts sem encostar nela.

## Para quem for mexer no código

### Modo história (padrão) x modo avançado

`campanha.config.modoJogo` decide a mesa: "historia" usa `src/app/mesa/[id]/mesa-historia.tsx` e `src/components/historia/*`
(dado 3D com three.js, música gerada com Web Audio, retratos em SVG, códex); "avancado" usa `mesa.tsx`. No modo história o
mestre chama `pedir_teste` e o jogador rola pela rota `/api/campanhas/[id]/rolar`; `sugerir_acoes` mostra as opções.

### Mapa do código

- `src/lib/sistemas/` — sistemas de regras (contrato em `tipos.ts`; um arquivo por sistema + pasta de dados).
- `src/lib/mestre/` — turnos, prompts, ferramentas do mestre e provedores (`cli`, `api`, `falso`); `mcp/taverna-mcp.mjs` é a
  ponte MCP que o Claude Code usa para chamar as ferramentas.
- `src/lib/dados.ts` — motor de dados (o código decide o número; o modelo só decide quando rolar).
- `src/lib/tempo-real.ts`, `src/app/api/campanhas/[id]/eventos` — eventos em tempo real (SSE) para todos os aparelhos.
- `src/lib/log.ts` — log em disco: `registrar(nivel, origem, dados)` grava uma linha JSON em `data/logs/taverna-<data>.log`
  (14 dias), espelha no console e tira chave de API e e-mail. Nunca passe prompt, sistema, contexto ou narração. Os
  `console.*` antigos de outros arquivos migram aos poucos, quando alguém mexer neles; código novo do servidor usa
  `registrar`. Hoje registram: `provedor-cli.ts` (início/fim de cada `claude -p`: versão, flags, duração, código, stderr,
  nº de eventos, subtype) e `tempo-real.ts` (todo evento de erro da mesa). `src/lib/diagnostico.ts` monta o relatório de
  `/config → Diagnóstico` e de `/api/diagnostico?baixar=1`; `scripts/doutor.mjs` (JS puro, `npm run doutor`) examina a
  instalação sem o servidor no ar e reaproveita `claude-bin.ts` e `rede/enderecos.ts` pelo type stripping do Node 24.
- `src/lib/rede/` — PIN, porteiro (quem vem pela rede só acessa as mesas), endereços da rede local e estado do firewall
  (`estadoFirewall`, só leitura); `src/proxy.ts` chama o
  porteiro e marca toda resposta com `x-taverna: 1` (é assim que os scripts sabem que quem respondeu na porta foi a taverna).
- `src/lib/cliente/musica/` — trilha: estilo por sistema (`estilos.ts`), motor Web Audio e tocador das músicas próprias da
  pasta `musica/` (fora do git, ver `musica/LEIA-ME.md`; rotas `src/app/api/musica/`).
- `src/app/` — páginas (início, nova campanha, mesa, ajustes, entrar, sistemas, configurações).
- `iniciar-taverna.ps1` / `atualizar-taverna.ps1` (e os `.cmd`) — atalho e atualização do Windows: hash do `package-lock.json`
  em `node_modules\.taverna-lock` decide o `npm ci`; `.next\BUILD_ID` mais velho que `src/`, `mcp/`, `package.json`,
  `package-lock.json` ou `next.config.ts` decide o build (o `.env.local` fica de fora); transcript em `data\logs\`.

Para desenvolver: `npm run dev` (porta 3300) num terminal seu, não na sessão de um agente que instala para outra pessoa.
Next.js 16 tem mudanças grandes (params são Promises, `proxy.ts` no lugar de middleware): consulte
`node_modules/next/dist/docs/` antes de mexer em rotas ou páginas.
