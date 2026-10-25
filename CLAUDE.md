# Taverna do Velho Mestre — instruções para o Claude Code

RPG de mesa com mestre de IA que roda na máquina da pessoa (Next.js 16 + SQLite do Node). Detalhes de uso no README.md;
licenças das regras em LICENCAS.md.

## Instalar e rodar (quando a pessoa pedir para "instalar", "configurar" ou "rodar a taverna")

1. **Node 24 ou mais novo** (o banco usa `node:sqlite`). Confira com `node -v`. Se faltar ou for antigo, no Windows:
   `winget install OpenJS.NodeJS` (depois abra um terminal novo).
2. `npm install`
3. Crie o `.env.local` copiando o `.env.example` (`cp .env.example .env.local`, ou `Copy-Item .env.example .env.local` no
   PowerShell). O padrão `TAVERNA_PROVEDOR=cli` usa o Claude Code logado desta máquina como mestre, sem custo extra de API.
4. O modo `cli` precisa do executável `claude` com login feito pela própria pessoa:
   - Teste com `claude --version`. Se não existir no PATH (comum quando só o app desktop está instalado), instale o CLI com
     `winget install Anthropic.ClaudeCode`, ou ache o `claude.exe` que vem com o app desktop e coloque o caminho completo em
     `CLAUDE_BIN=` no `.env.local`.
   - O login é da pessoa: ela roda `claude` uma vez no terminal e entra com a própria conta. Nunca copie, leia ou mova tokens.
   - `CLAUDE_CLI_MODELO=sonnet` (rápido) ou `opus` (melhor narrativa, gasta mais do plano).
5. `npm run dev` e abrir http://localhost:3300. A página **Configurações** (`/config`) mostra se o Claude Code foi encontrado e
   logado e tem o botão **Testar conexão**.
6. Para jogar com outros aparelhos no mesmo Wi-Fi: `npm run rede` (build + servidor em 0.0.0.0:3300) e liberar o Node.js
   no firewall do Windows para redes privadas. Na mesa, o botão **Convidar** mostra o link e o QR code.

Para testar a interface sem gastar nada, use `TAVERNA_PROVEDOR=falso` (mestre de teste sem IA).

## Regras importantes

- O modo `cli` é para uso pessoal: o login da própria pessoa, na própria máquina. Não exponha a taverna na internet nem
  configure o app para usar a conta de outra pessoa.
- `.env.local` e `data/` (banco com campanhas e fichas) ficam fora do git.

## Mapa do código

- `src/lib/sistemas/` — sistemas de regras (contrato em `tipos.ts`; um arquivo por sistema + pasta de dados).
- `src/lib/mestre/` — turnos, prompts, ferramentas do mestre e provedores (`cli`, `api`, `falso`); `mcp/taverna-mcp.mjs` é a
  ponte MCP que o Claude Code usa para chamar as ferramentas.
- `src/lib/dados.ts` — motor de dados (o código decide o número; o modelo só decide quando rolar).
- `src/lib/tempo-real.ts`, `src/app/api/campanhas/[id]/eventos` — eventos em tempo real (SSE) para todos os aparelhos.
- `src/lib/rede/` — PIN, porteiro (quem vem pela rede só acessa as mesas) e endereços da rede local.
- `src/app/` — páginas (início, nova campanha, mesa, ajustes, entrar, sistemas, configurações).

Next.js 16 tem mudanças grandes (params são Promises, `proxy.ts` no lugar de middleware): consulte
`node_modules/next/dist/docs/` antes de mexer em rotas ou páginas.
