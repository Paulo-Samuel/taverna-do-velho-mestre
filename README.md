# Taverna do Velho Mestre

RPG de mesa com um mestre de IA, rodando **na sua máquina** (Next.js 16 + SQLite do Node). Dá para jogar sozinho, com a
turma passando o teclado ou com cada um no próprio celular pela rede de casa.

O modelo narra e decide **quando** rolar; o código (`crypto.randomInt`) decide **o número** e aplica na ficha. O mestre não
inventa resultado de dado, nem que queira.

## Dois jeitos de jogar

- **Modo história (padrão, em "Nova história")**: criação em 4 passos (nome, rosto, ofício, de onde você vem), sem regras à
  vista. A aventura abre numa cena pronta; a mesa parece um livro (capítulos com local e momento, NPCs com nome colorido e voz
  própria, falas em itálico), o mestre sugere 3 ações e, quando um teste importa, **você rola o d20 em 3D** e ele continua a
  partir do resultado. Trilha sonora gerada no navegador conforme o humor da cena e um códex lateral com personagem, missões
  (com pistas), pessoas e lugares. Regras em `src/lib/sistemas/historia.ts`.
- **Modo avançado (`/nova/avancada`)**: escolha do sistema de regras (D&D 5e, Pathfinder 2e/1e, OSR, d100, Fate, Dungeon
  World, Vampiro V5), ficha completa e mesa com painéis.

## Instalação

Requisitos:

- **Node 24 LTS** (usa `node:sqlite`, sem dependência nativa). No Windows: `winget install OpenJS.NodeJS.LTS`. A linha
  Current (26) deve funcionar, mas não foi testada.
- Para o mestre no modo `cli` (padrão): **Claude Code 2.1.45 ou mais novo** (`claude --version`; testado com 2.1.316),
  com login feito pela própria pessoa. Antigo: `claude update`.
- Para receber atualizações: **Git** (`winget install Git.Git`).

### Windows: o atalho

1. Baixe a taverna com o Git numa pasta **fora do OneDrive e da Área de Trabalho sincronizada**, por exemplo `C:\taverna`:
   `git clone https://github.com/Paulo-Samuel/taverna-do-velho-mestre.git C:\taverna`. Dentro do OneDrive o banco trava e a
   `node_modules` inteira vai para a nuvem. Dá para baixar o ZIP, mas aí não há como atualizar depois (veja
   [Atualizar](#atualizar)).
2. Dê duplo clique em `iniciar-taverna.cmd`. Na primeira vez ele instala as dependências e compila (alguns minutos); depois
   abre o navegador em http://localhost:3300. Fechar a janela preta desliga a taverna.
3. Opcional: um atalho na Área de Trabalho com destino
   `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\taverna\iniciar-taverna.ps1"`, "Iniciar em" na pasta da
   taverna e ícone `assets\taverna.ico`.

O que o atalho faz sozinho: confere o Node; instala exatamente o que está no `package-lock.json` (`npm ci`) sempre que esse
arquivo muda (guarda o hash em `node_modules\.taverna-lock`); recompila quando o código muda, e só então (mexer só no
`.env.local` não recompila, o servidor lê esse arquivo ao ligar); se a compilação falhar, reinstala e tenta mais uma vez; e
só considera a taverna "já aberta" quando quem responde na porta 3300 é ela mesma (toda resposta da taverna leva o cabeçalho
`x-taverna: 1`, posto em `src/proxy.ts`), nunca outro programa que esteja na porta. Se algo der errado, a janela fica aberta
com a explicação e o código de saída, e tudo o que apareceu nela está em `data\logs\atalho-<data>.log` (guardado por 14
dias; abre no Bloco de Notas ao apertar Enter). É esse arquivo que você manda para quem instalou. Porta 3300 ocupada por
outro programa, banco travado por outra taverna aberta e módulo faltando têm dicas próprias.

### Pelo terminal (qualquer sistema)

```bash
npm install
cp .env.example .env.local   # opcional: dá para escolher tudo pela página /config
npm run dev                  # http://localhost:3300 (desenvolvimento)
npm run build && npm start   # produção, o mesmo que o atalho faz
```

No macOS e no Linux não há atalho pronto: use os comandos acima (Node pelo instalador oficial ou nvm; Claude Code pelo
instalador oficial, que o deixa em `~/.local/bin/claude`). Para atualizar: `git pull --ff-only`, `npm install` e
`npm run build` de novo.

O banco fica em `data/taverna.db` (campanhas, fichas, histórico, diário e ajustes). Apague o arquivo para começar do zero.

## Atualizar

Com a taverna **desligada**, duplo clique em `atualizar-taverna.cmd` (ou
`powershell -NoProfile -ExecutionPolicy Bypass -File atualizar-taverna.ps1`). Ele puxa a versão nova do GitHub
(`git fetch` + `git pull --ff-only`), reinstala as dependências se o `package-lock.json` mudou, recompila e termina com
"Pronto — abra o atalho". Ele se recusa a rodar com a taverna no ar; sem internet, diz isso; se houver arquivo alterado à
mão, diz qual é e sugere `git stash`. Suas campanhas (`data\`), configurações (`.env.local`) e músicas (`musica\`) ficam fora
do git e não são tocadas. Registro em `data\logs\atualizar-<data>.log`.

Se a pasta veio de um ZIP (sem `.git`), o próprio `atualizar-taverna.cmd` mostra como passar para o Git uma vez só:
`winget install Git.Git` (e reabrir o terminal), `git clone https://github.com/Paulo-Samuel/taverna-do-velho-mestre.git C:\taverna`
e copiar `data\`, `.env.local` e `musica\` da pasta antiga para a nova. Daí em diante, atualizar é um duplo clique.

## Quem é o mestre (provedores)

Escolha em **Configurações** (`/config`) ou pelo `.env.local`. O que for salvo na página vale mais que o `.env`; campo vazio
volta a valer o `.env`. A página também mostra se o Claude Code está instalado e logado e tem um botão **Testar conexão**.

| Provedor | Como funciona | Custo |
|---|---|---|
| `cli` (padrão) | Chama o Claude Code instalado e logado **nesta máquina** (`claude -p`, stream-json). As ferramentas do mestre chegam por um servidor MCP local (`mcp/taverna-mcp.mjs`). | Sai do plano Pro/Max de quem fez login, nos mesmos limites de 5 h e semanal do Claude Code. Sem cobrança extra. |
| `api` | API da Anthropic com loop de ferramentas e streaming (`src/lib/mestre/provedor-api.ts`). Modelo padrão `claude-sonnet-5-5`. | Créditos da `ANTHROPIC_API_KEY`, por uso. |
| `falso` | Mestre de teste, sem IA: rola dados e responde frases prontas. | Grátis. Serve para testar mesa, rolador e rede. |

Variáveis do `.env.local`: `TAVERNA_PROVEDOR`, `CLAUDE_BIN` (caminho do executável se `claude` não estiver no PATH, ou
`desktop` para usar sempre o Claude Code mais novo embutido no app Claude, que troca de pasta a cada atualização),
`CLAUDE_CLI_MODELO` (`sonnet`, `opus`, `haiku` ou nome completo), `ANTHROPIC_API_KEY` e `TAVERNA_MODELO_API`. A chave de API
só é lida do ambiente; a página de configurações nunca pede nem guarda chave.

### Modo `cli`: uso pessoal

1. Instale o Claude Code (`winget install Anthropic.ClaudeCode` no Windows; precisa ser **2.1.45 ou mais novo**, confira com
   `claude --version` e atualize com `claude update`) e rode `claude` uma vez para fazer login com a sua conta.
2. Rode a taverna **na mesma máquina**. O app não lê nem copia o token: só executa o binário oficial e lê a saída.
3. O app remove `ANTHROPIC_API_KEY` do ambiente do processo filho, para não cobrar créditos da API por engano.

É uso pessoal: o seu login, na sua máquina. A Anthropic proíbe extrair o token, oferecer o login do claude.ai dentro de um app
e rotear o plano de alguém para outros usuários. Não publique a taverna na internet nem distribua o app configurado nesse
modo. Se for instalar para outra pessoa, ela faz o próprio login; se for servir para muita gente, use o modo `api`.

### Modo `api`: para quem não tem plano (ou para o amigo)

1. Crie uma chave no console da Anthropic e ponha no `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...` e `TAVERNA_PROVEDOR=api`
   (ou escolha **API da Anthropic** em `/config`). Reinicie a taverna: o `.env.local` só é lido na partida.
2. Sem a chave, `/config` recusa salvar a API e a mesa recusa a ação (ela volta para o campo de texto) com a explicação, em
   vez de perder o turno. A taverna passa a chave ao SDK explicitamente: nunca cai num perfil de outra conta do computador.
   `/config` mostra de onde a chave veio e os 4 últimos caracteres dela, e a lista de modelos que essa chave enxerga.
3. **Esforço do mestre** (`/config`): rápido (`low`), padrão (`medium`, recomendado para um mestre que usa várias ferramentas
   por turno) ou caprichado (`high`). Abertura e fim de noite sobem um degrau; o resumo da campanha usa sempre o rápido. O
   esforço muda a saída e o raciocínio (do rápido para o padrão, ~1,5 a 2× de saída); a entrada, o grosso da conta, não muda.
4. Custo, do mais barato ao mais caro (preço por milhão de tokens, entrada/saída): Haiku (US$ 0,10/0,50), Sonnet (US$ 2/10,
   o padrão), Opus (US$ 4/20), Fable (US$ 10/50). Uma jogada medida numa campanha de Vampiro mandava ~17 mil tokens de entrada;
   as ferramentas e o bloco estável do prompt (regras e roteiro, ~15 a 28 mil caracteres) vão em cache e, entre uma jogada e
   outra (até 5 min), são cobrados a 10%. O resto (fichas, resumo, diário, cena, transcrição) muda e paga inteiro. O log do
   servidor mostra por turno `[taverna] prompt: estável … c (cache) · turno … c · transcrição … c` e, na API,
   `cache_read_input_tokens` de cada rodada.
5. Erros chegam em português na mesa e no **Testar conexão** (chave recusada, sem créditos, modelo inexistente, limite de uso
   com o tempo de espera, API sobrecarregada, sem rede). Interromper o mestre não mostra erro.

## Sistemas incluídos

Veja todos em **Sistemas** (`/sistemas`): descrição, mecânica, classes e ancestralidades pesquisáveis e status. Cada sistema
mora em `src/lib/sistemas/<id>.ts` (com dados em `src/lib/sistemas/<id>/`) e implementa o contrato de
`src/lib/sistemas/tipos.ts`.

| Id | Sistema | Mecânica | Licença do conteúdo |
|---|---|---|---|
| `dnd5e` | D&D 5ª Edição (SRD 5.2) | d20 + modificador, vantagem/desvantagem | SRD 5.2, Creative Commons BY 4.0 |
| `pf2e` | Pathfinder 2e (Remaster) | d20, quatro graus de sucesso, três ações | ORC License |
| `pf1e` | Pathfinder 1e | d20, graduações de perícia | Open Game License 1.0a |
| `osr` | Old-School (B/X) | d20 e tabelas clássicas, raça como classe | Open Game License 1.0a |
| `d100` | Horror investigativo (d100) | rolar abaixo da porcentagem | Basic Roleplaying, ORC License |
| `fate` | Fate Acelerado | 4dF + abordagem na escada | Creative Commons BY 3.0 |
| `pbta` | Dungeon World (PbtA) | 2d6 + atributo: 10+, 7–9, 6− | Creative Commons BY 3.0 |
| `vtm5` | Vampiro: A Máscara 5ª edição | parada de d10, Fome, Humanidade | Fã-conteúdo não oficial (Dark Pack, Paradox) |

Todas as descrições foram escritas pela taverna, em português e com as próprias palavras; nenhum texto de livro foi copiado.
Nomes de cenário, divindades e outras marcas ("Product Identity") ficam de fora.

### Atribuições

- **Vampiro: A Máscara (Dark Pack)** — fã-conteúdo gratuito e não oficial. Portions of the materials are the copyrights and
  trademarks of Paradox Interactive AB, and are used with permission. All rights reserved. For more information please
  visit worldofdarkness.com. Detalhes em [LICENCAS.md](LICENCAS.md).

- **SRD 5.2** — This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC,
  available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
  International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
- **Pathfinder Remaster (ORC)** — regras de Paizo Inc. usadas sob a ORC License (Open RPG Creative License). Não é produto
  oficial nem endossado pela Paizo.
- **Pathfinder 1e e Old-School (OGL 1.0a)** — mecânicas declaradas como Open Game Content no Pathfinder Roleplaying Game
  Reference Document (Paizo) e no System Reference Document (Wizards of the Coast), sob a Open Game License 1.0a. Sem
  Product Identity.
- **Basic Roleplaying (ORC)** — baseado no Basic Roleplaying: Universal Game Engine, de Chaosium Inc., sob a ORC License.
  Sem marcas nem cenários da Chaosium.
- **Fate** — This work is based on Fate Core System and Fate Accelerated Edition (found at http://www.faterpg.com/), products
  of Evil Hat Productions, LLC, developed, authored, and edited by Leonard Balsera, Brian Engard, Jeremy Keller, Ryan
  Macklin, Mike Olson, Clark Valentine, Amanda Valentine, Fred Hicks, and Rob Donoghue, and licensed for our use under the
  Creative Commons Attribution 3.0 Unported license (http://creativecommons.org/licenses/by/3.0/).
- **Dungeon World** — de Sage LaTorra e Adam Koebel, sob Creative Commons Attribution 3.0 Unported.

## Rolador de dados

O botão de dados na mesa abre o rolador (popover no computador, folha inferior no celular). Quem rola é o servidor
(`/api/campanhas/[id]/rolagem`), então o número é honesto. Dá para rolar em público (aparece para a mesa inteira), só para
você, fazer um teste com a ficha do personagem ativo ou registrar dados físicos (fica marcado como manual).

Notação aceita (`src/lib/dados.ts`):

| Notação | Exemplo | Significado |
|---|---|---|
| `NdM` | `2d6`, `d20` | N dados de M faces |
| `d%` | `d%` | d100 |
| `NdF` | `4dF` | dados Fate (−1, 0, +1) |
| `khX` / `klX` | `2d20kh1`, `4d6kh3` | mantém os X maiores / menores (vantagem, atributos) |
| `dhX` / `dlX` | `4d6dl1` | descarta os X maiores / menores |
| `!` | `1d6!` | explode no valor máximo |
| `+K` / `-K` | `1d8+1d6+3` | constantes e somas de termos |

## Trilha sonora

As duas mesas têm botão de som (e volume no ▾). A trilha é gerada no navegador (Web Audio, sem arquivos) conforme o humor
que o mestre dá à cena, com um estilo por sistema: fantasia medieval (D&D 5e, Pathfinder 1e, modo história), fantasia épica
com cordas e trompas (Pathfinder 2e), noite gótica com darkwave, órgão e chuva (Vampiro V5), horror com caixinha desafinada,
teremim e gramofone (d100), dungeon synth de fita cassete (OSR), aventura pulp com metais (Fate) e folk de rabeca (Dungeon
World). Código em `src/lib/cliente/musica/` (`estilos.ts` tem os estilos).

**Suas músicas:** coloque arquivos de áudio em `musica/<sistema>/<humor>/` na pasta da taverna (ou `musica/<sistema>/`,
`musica/geral/<humor>/`, `musica/geral/`) e eles tocam no lugar da trilha gerada, em ordem aleatória e com crossfade ao mudar
de cena. A pasta fica fora do git; o passo a passo está em [`musica/LEIA-ME.md`](musica/LEIA-ME.md). Cada aparelho da mesa
toca no próprio alto-falante pelas rotas `/api/musica` (lista) e `/api/musica/arquivo` (arquivo, com Range).

## Mesa local (vários jogadores, um computador)

Crie um personagem para cada pessoa na mesma campanha. Na mesa, o seletor **Agindo como** (ou `Alt+1..9`) troca quem está
declarando a ação. Nos ajustes da mesa (`/mesa/[id]/ajustes`) escolha o modo:

- **livre**: o mestre responde assim que estiver livre, juntando as ações que chegaram enquanto narrava;
- **por rodada**: o mestre espera todos os personagens agirem (ou alguém forçar a rodada) antes de narrar.

## Rede local (cada um no seu aparelho)

1. Na máquina da taverna: `npm run rede` (faz o build e sobe em `0.0.0.0:3300`). Para jogar em modo de desenvolvimento,
   `npx next dev -p 3300 -H 0.0.0.0` também funciona.
2. Abra a mesa e toque em **Convidar**: aparecem o link (`http://<ip-da-máquina>:3300/mesa/<id>/entrar`) e o QR code para
   quem está no mesmo Wi-Fi.
3. Cada um escolhe um apelido e reivindica o próprio personagem. A presença mostra quem está conectado.
4. Wi-Fi compartilhado? Defina um **PIN** nos ajustes da mesa. Esta máquina nunca precisa de PIN.

Pela rede só as mesas abrem; a lista de campanhas, "nova campanha", sistemas e configurações ficam só para quem está no
computador da taverna (`src/proxy.ts` + `src/lib/rede/porteiro.ts`). "Esta máquina" é decidido pelo IP real da conexão:
`src/instrumentation.ts` troca o `X-Forwarded-For` que vier do cliente pelo endereço do socket, para nenhum celular se passar
por `localhost` forjando cabeçalho (só vale depois de reiniciar o servidor; não rode a taverna atrás de proxy reverso).

### Abrindo o firewall do Windows

Na primeira vez que o Node escuta na rede, o Windows pergunta se deve liberar: marque **Redes privadas**. Se não perguntou
(ou se você negou), abra o PowerShell **como administrador** e rode:

```powershell
New-NetFirewallRule -DisplayName "Taverna do Velho Mestre (3300)" -Direction Inbound -Protocol TCP -LocalPort 3300 -Action Allow -Profile Private
```

Confira também se a rede Wi-Fi está como **Privada** (Configurações → Rede e Internet → Wi-Fi → propriedades). Para fechar
de novo: `Remove-NetFirewallRule -DisplayName "Taverna do Velho Mestre (3300)"`. Não abra a porta no roteador: a taverna é
para a sala de casa, não para a internet.

## Estrutura do código

- `src/lib/sistemas/` — contrato (`tipos.ts`), utilitários (`comum.ts`), registro (`index.ts`) e um arquivo por sistema.
- `src/lib/dados.ts` — motor de dados (notação acima).
- `src/lib/db.ts` — SQLite: campanhas, personagens, mensagens, fila de ações, diário e ajustes.
- `src/lib/tempo-real.ts` — eventos por mesa (publicar/assinar) e presença; `src/lib/mesa.ts` monta o estado enviado ao cliente.
- `src/lib/mestre/` — fila de ações e turnos (`index.ts`), ferramentas do mestre (`ferramentas.ts`), prompts e os provedores
  `cli`, `api` e `falso`.
- `src/lib/rede/` — endereços da rede local, porteiro e PIN das mesas.
- `src/lib/cliente/` — hook `useMesa` (SSE + ações) e identidade do aparelho.
- `src/app/` — páginas: início, `/nova`, `/sistemas`, `/config`, `/mesa/[id]` (mesa, ajustes, entrar, personagens).
- `src/app/api/campanhas/[id]/` — `eventos` (SSE), `acao`, `controle`, `presenca`, `rolagem`, `reivindicar`, `pin`, `personagens`.
- `src/components/` — ficha, grupo, cena, diário, presença/convite, rolador e chat.
- `mcp/taverna-mcp.mjs` — ponte MCP que leva as ferramentas do mestre ao Claude Code no modo `cli`.
