import "server-only";
import { execFile } from "node:child_process";
import { resolverExecutavelClaude } from "@/lib/mestre/provedor-cli";

// Conversa com o Claude Code instalado nesta máquina só para perguntar se está lá e logado.
// Usa a mesma função do provedor cli para achar o executável (ajuste → CLAUDE_BIN → PATH).
// Nunca lê arquivo de credencial: quem responde é o próprio "claude auth status".

const TEMPO_MS = 20_000;

type Executavel = { comando: string; shell: boolean };

function rodar(exe: Executavel, args: string[]): Promise<{ saida: string; erro: string; codigo: number | null }> {
  return new Promise((ok) => {
    const aspas = (a: string) => `"${a.replace(/"/g, '\\"')}"`;
    // .cmd/.bat só rodam pelo shell; aí a linha vai inteira (passar args junto com shell está depreciado no Node 24)
    execFile(
      exe.shell ? [exe.comando, ...args].map(aspas).join(" ") : exe.comando,
      exe.shell ? [] : args,
      { timeout: TEMPO_MS, windowsHide: true, shell: exe.shell, encoding: "utf8", env: semChaveApi() },
      (falha, saida, erro) => {
        const codigo = falha ? (typeof falha.code === "number" ? falha.code : null) : 0;
        ok({ saida: String(saida ?? ""), erro: String(erro ?? "") || (falha && !saida ? falha.message : ""), codigo });
      },
    );
  });
}

/** Mesmo cuidado do provedor: sem chave de API no ambiente, para o status refletir o login do plano. */
function semChaveApi() {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  return env;
}

/** Mesma resolução do provedor cli (um lugar só para mudar); null quando não acha. */
async function acharExecutavel(binConfigurado?: string): Promise<Executavel | null> {
  try {
    const { comando, shell } = resolverExecutavelClaude(binConfigurado);
    return { comando, shell };
  } catch {
    return null;
  }
}

export type StatusClaude = {
  instalado: boolean;
  caminho: string | null;
  versao: string | null;
  logado: boolean;
  /** "claude.ai" (plano) ou outro método */
  metodo: string | null;
  /** "pro", "max"... quando o Claude Code informa */
  plano: string | null;
  email: string | null;
  erro: string | null;
};

export async function statusClaude(binConfigurado?: string): Promise<StatusClaude> {
  const vazio: StatusClaude = { instalado: false, caminho: null, versao: null, logado: false, metodo: null, plano: null, email: null, erro: null };
  const exe = await acharExecutavel(binConfigurado);
  if (!exe) return { ...vazio, erro: 'Não achei "claude" no PATH.' };

  const versao = await rodar(exe, ["--version"]);
  if (versao.codigo !== 0) {
    return { ...vazio, caminho: exe.comando, erro: (versao.erro || versao.saida).trim().slice(0, 300) || "O executável não respondeu." };
  }

  const status = await rodar(exe, ["auth", "status", "--json"]);
  const base = { ...vazio, instalado: true, caminho: exe.comando, versao: versao.saida.trim().split(/\s+/)[0] || null };
  try {
    // saída documentada do "auth status --json"; só os campos que a tela mostra
    const j = JSON.parse(status.saida) as { loggedIn?: boolean; authMethod?: string; subscriptionType?: string; email?: string };
    return {
      ...base,
      logado: Boolean(j.loggedIn),
      metodo: j.authMethod ?? null,
      plano: j.subscriptionType ?? null,
      email: j.email ?? null,
    };
  } catch {
    return { ...base, erro: (status.erro || status.saida).trim().slice(0, 300) || "Não entendi a resposta do auth status." };
  }
}
