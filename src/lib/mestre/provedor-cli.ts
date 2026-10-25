import "server-only";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type { EventoMestre, OpcoesTurno, Provedor } from "./tipos";

// Mestre rodando no Claude Code instalado e logado nesta máquina (plano Pro/Max de quem fez login).
// O app nunca lê nem copia o token: só chama o executável oficial em modo -p e lê o stream-json.
// As ferramentas chegam ao Claude Code por um servidor MCP local (mcp/taverna-mcp.mjs) que repassa as chamadas ao app.

const SERVIDOR_MCP = path.join(process.cwd(), "mcp", "taverna-mcp.mjs");
const PREFIXO_MCP = "mcp__taverna__";
const TEMPO_MAXIMO_MS = 5 * 60 * 1000;

let executavelCache: { chave: string; comando: string; shell: boolean } | null = null;

/** Acha o executável do Claude Code: ajuste → CLAUDE_BIN → PATH. Também usado pela página de configurações. */
export function resolverExecutavelClaude(binConfigurado?: string) {
  const configurado = (binConfigurado || process.env.CLAUDE_BIN || "").trim();
  if (executavelCache?.chave === configurado) return executavelCache;
  if (configurado) return (executavelCache = { chave: configurado, comando: configurado, shell: /\.(cmd|bat)$/i.test(configurado) });
  if (process.platform === "win32") {
    try {
      const achados = execFileSync("where", ["claude"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
      const exe = achados.find((p) => p.toLowerCase().endsWith(".exe")) ?? achados[0];
      if (exe) return (executavelCache = { chave: configurado, comando: exe, shell: /\.(cmd|bat)$/i.test(exe) });
    } catch {
      // cai no erro amigável abaixo
    }
    throw new Error(
      'Não achei o Claude Code ("claude") no PATH. Instale com `winget install Anthropic.ClaudeCode`, faça login com `claude` e reinicie o app, ou informe o caminho do executável em Configurações.',
    );
  }
  return (executavelCache = { chave: configurado, comando: "claude", shell: false });
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
  const { comando, shell } = resolverExecutavelClaude(opcoes.bin);
  // Pasta temporária isolada: nenhum CLAUDE.md de projeto entra no contexto do mestre.
  const pasta = mkdtempSync(path.join(tmpdir(), "taverna-"));
  const arquivoSistema = path.join(pasta, "sistema.md");
  writeFileSync(arquivoSistema, sistema, "utf8");

  const args = [
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

  const encerrar = () => filho.kill();
  sinal?.addEventListener("abort", encerrar, { once: true });
  const relogio = setTimeout(encerrar, TEMPO_MAXIMO_MS);

  let stderr = "";
  filho.stderr.on("data", (c) => (stderr += c.toString()));
  filho.on("error", (e) => (stderr += `\n${e.message}`));
  filho.stdin.end(prompt, "utf8");

  let resultado: { texto: string; erro: string | null } | null = null;

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

      if (ev.type === "stream_event" && ev.event?.type === "content_block_delta" && ev.event.delta?.type === "text_delta") {
        aoEvento?.({ tipo: "texto", texto: ev.event.delta.text });
      } else if (ev.type === "rate_limit_event") {
        const info = ev.rate_limit_info ?? {};
        aoEvento?.({
          tipo: "limite",
          janela: String(info.rateLimitType ?? ""),
          uso: typeof info.utilization === "number" ? info.utilization : null,
          renovaEm: typeof info.resetsAt === "number" ? info.resetsAt : null,
        });
      } else if (ev.type === "result") {
        const falhou = ev.is_error || ev.subtype !== "success";
        resultado = {
          texto: typeof ev.result === "string" ? ev.result : "",
          erro: falhou ? (typeof ev.result === "string" && ev.result) || (ev.errors ?? []).join("; ") || ev.subtype : null,
        };
      }
    }
    const codigo: number | null = await new Promise((ok) => (filho.exitCode !== null ? ok(filho.exitCode) : filho.once("close", ok)));
    if (sinal?.aborted) throw new Error("Turno cancelado.");
    if (!resultado) throw new Error(`O Claude Code terminou sem resposta (código ${codigo}). ${stderr.trim().slice(0, 500)}`);
    if (resultado.erro) throw new Error(`O Claude Code respondeu com erro: ${resultado.erro}`);
    return resultado.texto;
  } finally {
    clearTimeout(relogio);
    sinal?.removeEventListener("abort", encerrar);
    if (filho.exitCode === null) filho.kill();
    rmSync(pasta, { recursive: true, force: true });
  }
}

export function criarProvedorCli(opcoes: OpcoesCli = {}): Provedor {
  return {
    id: "cli",
    nome: `Claude Code (plano da conta logada${opcoes.modelo || process.env.CLAUDE_CLI_MODELO ? `, ${opcoes.modelo || process.env.CLAUDE_CLI_MODELO}` : ""})`,
    async turno({ sistema, prompt, ferramentas, ponte, emitir, sinal }: OpcoesTurno) {
      await executar({ sistema, prompt, ferramentas: ferramentas.map((f) => f.name), ponte, aoEvento: emitir, sinal }, opcoes);
    },
    texto({ sistema, prompt, sinal }) {
      return executar({ sistema, prompt, sinal }, opcoes);
    },
  };
}
