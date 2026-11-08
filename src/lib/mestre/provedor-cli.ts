import "server-only";
import { spawn, execFile, execFileSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import {
  CLAUDE_VERSAO_MINIMA,
  CLAUDE_VERSAO_TESTADA,
  descobrirClaudeDesktop,
  erroDeCompatibilidade,
  extrairVersao,
  ordenarAchadosWhere,
  pastaClaudeCodeDe,
  raizClaudeDesktop,
  resolverShimNpm,
} from "./claude-bin";
import { TURNO_CANCELADO, traduzirErroCli } from "./erros-api";
import { TITULO_ESTADO, type EventoMestre, type OpcoesTurno, type Provedor } from "./tipos";

export { CLAUDE_VERSAO_MINIMA, CLAUDE_VERSAO_TESTADA };

// Mestre rodando no Claude Code instalado e logado nesta máquina (plano Pro/Max de quem fez login).
// O app nunca lê nem copia o token: só chama o executável oficial em modo -p e lê o stream-json.
// As ferramentas chegam ao Claude Code por um servidor MCP local (mcp/taverna-mcp.mjs) que repassa as chamadas ao app.

const SERVIDOR_MCP = path.join(process.cwd(), "mcp", "taverna-mcp.mjs");
const PREFIXO_MCP = "mcp__taverna__";
const TEMPO_MAXIMO_MS = 5 * 60 * 1000;

// ---------- onde está o Claude Code ----------

/** De onde saiu o executável escolhido. */
export type OrigemExecutavel =
  | "configurado" // CLAUDE_BIN / ajuste apontando para um arquivo que existe
  | "desktop" // CLAUDE_BIN=desktop (ou pasta): o claude.exe mais novo embutido no app Claude
  | "where" // `where claude` no PATH
  | "local-bin" // %USERPROFILE%\.local\bin\claude.exe (instalador oficial)
  | "claude-data" // achado dentro de %LOCALAPPDATA%\Claude-Data (app desktop), sem ninguém configurar
  | "npm" // %APPDATA%\npm\claude.cmd (npm i -g), resolvido para o executável real
  | "path"; // "claude" solto no PATH (fora do Windows)

export type ExecutavelClaude = {
  /** o que é executado de fato (claude.exe, node.exe quando o shim aponta para cli.js, ou o .cmd como último recurso) */
  comando: string;
  /** argumentos fixos antes dos do turno (ex.: o cli.js) */
  args: string[];
  /** só quando restou um .cmd que não deu para resolver: roda pelo cmd.exe */
  shell: boolean;
  /** caminho que identifica esta instalação (para mostrar e gravar em CLAUDE_BIN/ajuste) */
  caminho: string;
  origem: OrigemExecutavel;
  /** o atalho (shim .cmd do npm) que foi traduzido para `comando`, quando houve */
  atalho: string | null;
  /** o caminho configurado que não existe mais (o app Claude atualizou e trocou de pasta); null quando o configurado serviu */
  caminhoConfiguradoSumiu: string | null;
};

const ROTULO_ORIGEM: Record<OrigemExecutavel, string> = {
  configurado: "caminho configurado",
  desktop: "embutido no app Claude",
  where: "no PATH",
  "local-bin": "instalador oficial (~/.local/bin)",
  "claude-data": "embutido no app Claude",
  npm: "instalado pelo npm",
  path: "no PATH",
};

export function rotuloDaOrigem(origem: OrigemExecutavel) {
  return ROTULO_ORIGEM[origem];
}

const ehArquivo = (p: string) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};
const ehPasta = (p: string) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

/** Monta a entrada a partir de um caminho que existe; um claude.cmd do npm vira o claude.exe/cli.js real, sem shell. */
function montar(caminho: string, origem: OrigemExecutavel): ExecutavelClaude | null {
  if (!ehArquivo(caminho)) return null;
  if (/\.(cmd|bat)$/i.test(caminho)) {
    const alvo = resolverShimNpm(caminho);
    if (alvo) return { comando: alvo.comando, args: alvo.args, shell: false, caminho: alvo.caminho, origem, atalho: caminho, caminhoConfiguradoSumiu: null };
    // último recurso: o .cmd pelo cmd.exe (aí o encerramento usa taskkill /T para alcançar o claude de verdade)
    return { comando: caminho, args: [], shell: true, caminho, origem, atalho: null, caminhoConfiguradoSumiu: null };
  }
  return { comando: caminho, args: [], shell: false, caminho, origem, atalho: null, caminhoConfiguradoSumiu: null };
}

function ondeDeixaOWindows(): string[] {
  try {
    return execFileSync("where", ["claude"], { encoding: "utf8", windowsHide: true, timeout: 5000 }).split(/\r?\n/);
  } catch {
    return [];
  }
}

/**
 * Procura o Claude Code nesta máquina, nesta ordem (Windows): `where claude` (preferindo .exe, depois .cmd, nunca o shim sem
 * extensão), %USERPROFILE%\.local\bin\claude.exe, %LOCALAPPDATA%\Claude-Data\claude_*\claude-code\<maior versão>\*\claude.exe
 * e %APPDATA%\npm\claude.cmd. Devolve todos os que existem, sem repetir, do mais ao menos preferido.
 */
export function listarCandidatosClaude(): ExecutavelClaude[] {
  const lista: ExecutavelClaude[] = [];
  const vistos = new Set<string>();
  const juntar = (e: ExecutavelClaude | null) => {
    if (!e) return;
    const chave = e.caminho.toLowerCase();
    if (vistos.has(chave)) return;
    vistos.add(chave);
    lista.push(e);
  };

  if (process.platform === "win32") {
    for (const achado of ordenarAchadosWhere(ondeDeixaOWindows())) juntar(montar(achado, "where"));
    const perfil = process.env.USERPROFILE?.trim();
    if (perfil) juntar(montar(path.join(perfil, ".local", "bin", "claude.exe"), "local-bin"));
    const raiz = raizClaudeDesktop();
    const desktop = raiz ? descobrirClaudeDesktop(raiz) : null;
    if (desktop) juntar(montar(desktop, "claude-data"));
    const appdata = process.env.APPDATA?.trim();
    if (appdata) juntar(montar(path.join(appdata, "npm", "claude.cmd"), "npm"));
  } else {
    const casa = process.env.HOME?.trim();
    if (casa) juntar(montar(path.join(casa, ".local", "bin", "claude"), "local-bin"));
    // fora do Windows deixamos o PATH resolver "claude" na hora do spawn
    juntar({ comando: "claude", args: [], shell: false, caminho: "claude", origem: "path", atalho: null, caminhoConfiguradoSumiu: null });
  }
  return lista;
}

/** Resolve o que a pessoa escreveu em CLAUDE_BIN/ajuste: "desktop", uma pasta ou um arquivo. null quando não leva a nada que exista. */
function resolverConfigurado(configurado: string): ExecutavelClaude | null {
  if (/^desktop$/i.test(configurado)) {
    const raiz = raizClaudeDesktop();
    const achado = raiz ? descobrirClaudeDesktop(raiz) : null;
    return achado ? montar(achado, "desktop") : null;
  }
  if (ehPasta(configurado)) {
    const achado = descobrirClaudeDesktop(configurado);
    return achado ? montar(achado, "desktop") : null;
  }
  return montar(configurado, "configurado");
}

let executavelCache: { chave: string; exe: ExecutavelClaude } | null = null;

export class ClaudeNaoEncontrado extends Error {
  caminhoConfiguradoSumiu: string | null;
  constructor(mensagem: string, caminhoConfiguradoSumiu: string | null) {
    super(mensagem);
    this.name = "ClaudeNaoEncontrado";
    this.caminhoConfiguradoSumiu = caminhoConfiguradoSumiu;
  }
}

/**
 * Acha o executável do Claude Code: ajuste → CLAUDE_BIN → descoberta na máquina. Também usado pela página de configurações.
 * Caminho configurado que não existe mais não é devolvido nem guardado em cache: o motivo vai em `caminhoConfiguradoSumiu`
 * e a busca continua (primeiro na mesma pasta `claude-code` do app, depois nos lugares de sempre).
 */
export function resolverExecutavelClaude(binConfigurado?: string): ExecutavelClaude {
  const configurado = (binConfigurado || process.env.CLAUDE_BIN || "").trim();
  if (executavelCache?.chave === configurado) {
    // o app desktop troca de pasta a cada atualização: o que estava em cache pode ter sumido
    if (executavelCache.exe.shell || executavelCache.exe.origem === "path" || ehArquivo(executavelCache.exe.comando)) return executavelCache.exe;
    executavelCache = null;
  }

  let sumiu: string | null = null;
  if (configurado) {
    const exe = resolverConfigurado(configurado);
    if (exe) return (executavelCache = { chave: configurado, exe }).exe;
    sumiu = configurado;
    // morava em ...\claude-code\<versão>\<hash>\claude.exe: a versão nova costuma estar na mesma pasta claude-code
    const pastaApp = pastaClaudeCodeDe(configurado);
    const vizinho = pastaApp ? descobrirClaudeDesktop(pastaApp) : null;
    const exeVizinho = vizinho ? montar(vizinho, "desktop") : null;
    if (exeVizinho) return { ...exeVizinho, caminhoConfiguradoSumiu: sumiu };
  }

  const [primeiro] = listarCandidatosClaude();
  if (primeiro) {
    if (!sumiu) executavelCache = { chave: configurado, exe: primeiro };
    return sumiu ? { ...primeiro, caminhoConfiguradoSumiu: sumiu } : primeiro;
  }

  throw new ClaudeNaoEncontrado(
    sumiu
      ? `O executável configurado não existe mais (${sumiu}) e não achei outro Claude Code nesta máquina. Instale com \`winget install Anthropic.ClaudeCode\`, faça login com \`claude\` e reinicie o app, ou informe o caminho do executável em Configurações (ou \`desktop\` para usar o do app Claude).`
      : 'Não achei o Claude Code ("claude") no PATH. Instale com `winget install Anthropic.ClaudeCode`, faça login com `claude` e reinicie o app, ou informe o caminho do executável em Configurações.',
    sumiu,
  );
}

// ---------- versão e encerramento ----------

const versoesCache = new Map<string, string | null>();

/** Versão do executável (`claude --version`), guardada por caminho. null quando não respondeu. */
export function versaoDoExecutavel(exe: ExecutavelClaude): Promise<string | null> {
  const chave = exe.caminho.toLowerCase();
  if (versoesCache.has(chave)) return Promise.resolve(versoesCache.get(chave) ?? null);
  return new Promise((ok) => {
    const args = [...exe.args, "--version"];
    execFile(
      exe.shell ? [exe.comando, ...args].map(escaparShell).join(" ") : exe.comando,
      exe.shell ? [] : args,
      { timeout: 15_000, windowsHide: true, shell: exe.shell, encoding: "utf8" },
      (falha, saida) => {
        const v = falha ? null : extrairVersao(String(saida ?? ""));
        versoesCache.set(chave, v);
        ok(v);
      },
    );
  });
}

/**
 * Encerra o Claude Code e tudo o que ele abriu (servidor MCP, node do shim). No Windows, `kill()` só derruba o processo
 * de cima: pelo cmd.exe o claude de verdade seguia narrando para um token já encerrado e gastando o plano.
 */
export function encerrarArvore(filho: ChildProcess) {
  if (filho.exitCode !== null || filho.signalCode !== null) return;
  if (process.platform === "win32" && filho.pid) {
    try {
      const matador = spawn("taskkill", ["/pid", String(filho.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      matador.on("error", () => filho.kill());
      return;
    } catch {
      // cai no kill simples
    }
  }
  filho.kill();
}

function escaparShell(arg: string) {
  return `"${arg.replace(/"/g, '\\"')}"`;
}

type Execucao = {
  sistema: string;
  prompt: string;
  ferramentas?: string[];
  ponte?: { url: string; token: string };
  aoEvento?: (e: EventoMestre) => void;
  sinal?: AbortSignal;
};

export type OpcoesCli = { bin?: string; modelo?: string };

/** Roda `claude -p` uma vez e devolve o texto final. */
async function executar({ sistema, prompt, ferramentas, ponte, aoEvento, sinal }: Execucao, opcoes: OpcoesCli): Promise<string> {
  const exe = resolverExecutavelClaude(opcoes.bin);
  const { comando, shell } = exe;
  // Pasta temporária isolada: nenhum CLAUDE.md de projeto entra no contexto do mestre.
  const pasta = mkdtempSync(path.join(tmpdir(), "taverna-"));
  const arquivoSistema = path.join(pasta, "sistema.md");
  writeFileSync(arquivoSistema, sistema, "utf8");

  const args = [
    ...exe.args,
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--system-prompt-file", arquivoSistema,
    "--tools", "",
    "--strict-mcp-config",
    "--setting-sources", "",
    "--permission-mode", "dontAsk",
    "--no-session-persistence",
    "--max-turns", "16",
  ];
  const modelo = (opcoes.modelo ?? process.env.CLAUDE_CLI_MODELO)?.trim();
  if (modelo) args.push("--model", modelo);

  if (ponte && ferramentas?.length) {
    const arquivoMcp = path.join(pasta, "mcp.json");
    writeFileSync(
      arquivoMcp,
      JSON.stringify({
        mcpServers: {
          taverna: {
            command: process.execPath,
            args: [SERVIDOR_MCP],
            env: { TAVERNA_PONTE_URL: ponte.url, TAVERNA_PONTE_TOKEN: ponte.token },
          },
        },
      }),
      "utf8",
    );
    args.push("--mcp-config", arquivoMcp, "--allowedTools", ...ferramentas.map((n) => PREFIXO_MCP + n));
  }

  // Sem ANTHROPIC_API_KEY no ambiente: com -p a chave teria prioridade e cobraria créditos da API.
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;

  const filho = spawn(shell ? escaparShell(comando) : comando, shell ? args.map(escaparShell) : args, {
    cwd: pasta,
    env,
    shell,
    windowsHide: true,
  });

  const encerrar = () => encerrarArvore(filho);
  sinal?.addEventListener("abort", encerrar, { once: true });
  let estourouTempo = false;
  const relogio = setTimeout(() => {
    estourouTempo = true;
    encerrar();
  }, TEMPO_MAXIMO_MS);
  // último aviso de limite do plano: o erro "bateu no limite" diz a hora em que renova
  let renovaEm: number | null = null;

  let stderr = "";
  filho.stderr.on("data", (c) => (stderr += c.toString()));
  filho.on("error", (e) => (stderr += `\n${e.message}`));
  filho.stdin.end(prompt, "utf8");

  let resultado: { texto: string; erro: string | null } | null = null;
  // cada bloco de texto novo (depois de uma ferramenta) vira parágrafo novo, sem grudar no anterior
  let jaEscreveu = false;
  let blocoNovo = false;

  try {
    for await (const linhaBruta of createInterface({ input: filho.stdout })) {
      if (!linhaBruta.trim()) continue;
      // eventos do stream-json do Claude Code, sem tipos publicados
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ev: any;
      try {
        ev = JSON.parse(linhaBruta);
      } catch {
        continue;
      }

      if (ev.type === "stream_event" && ev.event?.type === "content_block_start" && ev.event.content_block?.type === "text") {
        blocoNovo = jaEscreveu;
      } else if (ev.type === "stream_event" && ev.event?.type === "content_block_delta" && ev.event.delta?.type === "text_delta") {
        aoEvento?.({ tipo: "texto", texto: (blocoNovo ? "\n\n" : "") + ev.event.delta.text });
        blocoNovo = false;
        jaEscreveu = true;
      } else if (ev.type === "rate_limit_event") {
        const info = ev.rate_limit_info ?? {};
        if (typeof info.resetsAt === "number") renovaEm = info.resetsAt;
        aoEvento?.({
          tipo: "limite",
          janela: String(info.rateLimitType ?? ""),
          uso: typeof info.utilization === "number" ? info.utilization : null,
          renovaEm: typeof info.resetsAt === "number" ? info.resetsAt : null,
        });
      } else if (ev.type === "result") {
        const falhou = ev.is_error || ev.subtype !== "success";
        // o resultado traz o uso somado do turno inteiro (o mesmo log por turno da API: cache lido e escrito)
        const u = ev.usage;
        if (u && typeof u === "object") {
          const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
          aoEvento?.({
            tipo: "uso",
            rodada: Math.max(1, n(ev.num_turns)),
            maxRodadas: Math.max(1, n(ev.num_turns)),
            entrada: n(u.input_tokens),
            saida: n(u.output_tokens),
            cacheLido: n(u.cache_read_input_tokens),
            cacheEscrito: n(u.cache_creation_input_tokens),
          });
        }
        resultado = {
          texto: typeof ev.result === "string" ? ev.result : "",
          erro: falhou ? (typeof ev.result === "string" && ev.result) || (ev.errors ?? []).join("; ") || ev.subtype : null,
        };
      }
    }
    const codigo: number | null = await new Promise((ok) => (filho.exitCode !== null ? ok(filho.exitCode) : filho.once("close", ok)));
    if (sinal?.aborted) throw new Error(TURNO_CANCELADO);
    if (estourouTempo) throw new Error(traduzirErroCli("", { estourouTempo, tempoMaximoMs: TEMPO_MAXIMO_MS })!.mensagem);
    if (!resultado) {
      // flag ou comando que esta versão do Claude Code não conhece: a frase que resolve, em vez de "código 1"
      const compat = codigo !== 0 ? erroDeCompatibilidade(stderr, await versaoDoExecutavel(exe)) : null;
      if (compat) throw new Error(compat);
      // limite do plano ou login caído também podem vir só no stderr
      const conhecido = traduzirErroCli(stderr, { renovaEm });
      if (conhecido) throw new Error(conhecido.mensagem);
      throw new Error(`O Claude Code terminou sem resposta (código ${codigo}). ${stderr.trim().slice(0, 500)}`);
    }
    if (resultado.erro) {
      const conhecido = traduzirErroCli(resultado.erro, { renovaEm });
      throw new Error(conhecido ? conhecido.mensagem : `O Claude Code respondeu com erro: ${resultado.erro}`);
    }
    return resultado.texto;
  } finally {
    clearTimeout(relogio);
    sinal?.removeEventListener("abort", encerrar);
    encerrarArvore(filho);
    try {
      rmSync(pasta, { recursive: true, force: true });
    } catch {
      // o processo recém-morto ainda pode segurar a pasta por um instante; o SO limpa o temp depois
    }
  }
}

export function criarProvedorCli(opcoes: OpcoesCli = {}): Provedor {
  return {
    id: "cli",
    nome: `Claude Code (plano da conta logada${opcoes.modelo || process.env.CLAUDE_CLI_MODELO ? `, ${opcoes.modelo || process.env.CLAUDE_CLI_MODELO}` : ""})`,
    async turno({ sistema, contexto, prompt, ferramentas, ponte, emitir, sinal }: OpcoesTurno) {
      // sistema.md leva só o bloco estável (igual entre jogadas); o estado da mesa entra no começo do stdin
      const entrada = contexto?.trim() ? `${TITULO_ESTADO}\n\n${contexto}\n\n---\n\n${prompt}` : prompt;
      await executar({ sistema, prompt: entrada, ferramentas: ferramentas.map((f) => f.name), ponte, aoEvento: emitir, sinal }, opcoes);
    },
    texto({ sistema, prompt, sinal }) {
      return executar({ sistema, prompt, sinal }, opcoes);
    },
  };
}
