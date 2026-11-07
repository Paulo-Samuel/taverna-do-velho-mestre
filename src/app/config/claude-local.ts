import "server-only";
import { execFile } from "node:child_process";
import {
  ClaudeNaoEncontrado,
  listarCandidatosClaude,
  resolverExecutavelClaude,
  rotuloDaOrigem,
  versaoDoExecutavel,
  type ExecutavelClaude,
  type OrigemExecutavel,
} from "@/lib/mestre/provedor-cli";
import { CLAUDE_VERSAO_MINIMA, CLAUDE_VERSAO_TESTADA, erroDeCompatibilidade, situacaoDaVersao } from "@/lib/mestre/claude-bin";

// Conversa com o Claude Code instalado nesta máquina só para perguntar se está lá e logado.
// Usa a mesma função do provedor cli para achar o executável (ajuste → CLAUDE_BIN → descoberta na máquina).
// Nunca lê arquivo de credencial: quem responde é o próprio "claude auth status".

const TEMPO_MS = 20_000;

function rodar(exe: ExecutavelClaude, args: string[]): Promise<{ saida: string; erro: string; codigo: number | null }> {
  return new Promise((ok) => {
    const aspas = (a: string) => `"${a.replace(/"/g, '\\"')}"`;
    const todos = [...exe.args, ...args];
    // .cmd/.bat (quando não deu para resolver o alvo) só rodam pelo shell; aí a linha vai inteira
    // (passar args junto com shell está depreciado no Node 24). Shim resolvido roda o claude.exe/cli.js direto, sem shell.
    execFile(
      exe.shell ? [exe.comando, ...todos].map(aspas).join(" ") : exe.comando,
      exe.shell ? [] : todos,
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

export type AlternativaClaude = {
  /** caminho para mostrar e gravar em "Executável" */
  caminho: string;
  versao: string | null;
  origem: OrigemExecutavel;
  /** texto curto da origem ("instalado pelo npm", "embutido no app Claude"...) */
  rotulo: string;
};

export type StatusClaude = {
  instalado: boolean;
  /** caminho que identifica a instalação escolhida (o que vai em CLAUDE_BIN/ajuste) */
  caminho: string | null;
  /** o que é executado de fato, quando difere de `caminho` (shim do npm traduzido para claude.exe ou node + cli.js) */
  executaDeFato: string | null;
  /** o atalho (.cmd do npm) que foi traduzido, se houver */
  atalho: string | null;
  origem: OrigemExecutavel | null;
  /** caminho configurado (CLAUDE_BIN/ajuste) que não existe mais; a escolha acima veio da descoberta */
  caminhoConfiguradoSumiu: string | null;
  /** outras instalações encontradas na máquina (sem a escolhida) */
  alternativas: AlternativaClaude[];
  versao: string | null;
  versaoMinima: string;
  versaoTestada: string;
  /** mais antigo que a versão mínima: avisar, não bloquear */
  desatualizado: boolean;
  /** mais novo que a versão testada: aviso discreto */
  maisNovoQueTestado: boolean;
  logado: boolean;
  /** "claude.ai" (plano) ou outro método */
  metodo: string | null;
  /** "pro", "max"... quando o Claude Code informa */
  plano: string | null;
  email: string | null;
  erro: string | null;
};

function alternativa(e: ExecutavelClaude, versao: string | null): AlternativaClaude {
  return { caminho: e.caminho, versao, origem: e.origem, rotulo: rotuloDaOrigem(e.origem) };
}

/** As outras instalações da máquina, com versão (cada `--version` leva uns 50 ms). */
async function outrasInstalacoes(escolhido: ExecutavelClaude | null): Promise<AlternativaClaude[]> {
  const outras = listarCandidatosClaude().filter((c) => c.caminho.toLowerCase() !== escolhido?.caminho.toLowerCase());
  return Promise.all(outras.map(async (c) => alternativa(c, await versaoDoExecutavel(c))));
}

export async function statusClaude(binConfigurado?: string): Promise<StatusClaude> {
  const vazio: StatusClaude = {
    instalado: false,
    caminho: null,
    executaDeFato: null,
    atalho: null,
    origem: null,
    caminhoConfiguradoSumiu: null,
    alternativas: [],
    versao: null,
    versaoMinima: CLAUDE_VERSAO_MINIMA,
    versaoTestada: CLAUDE_VERSAO_TESTADA,
    desatualizado: false,
    maisNovoQueTestado: false,
    logado: false,
    metodo: null,
    plano: null,
    email: null,
    erro: null,
  };

  let exe: ExecutavelClaude;
  try {
    exe = resolverExecutavelClaude(binConfigurado);
  } catch (e) {
    const sumiu = e instanceof ClaudeNaoEncontrado ? e.caminhoConfiguradoSumiu : null;
    return { ...vazio, caminhoConfiguradoSumiu: sumiu, erro: e instanceof Error ? e.message : 'Não achei "claude" nesta máquina.' };
  }

  const executaDeFato = exe.atalho || exe.comando !== exe.caminho ? [exe.comando, ...exe.args].join(" ") : null;
  const base: StatusClaude = {
    ...vazio,
    caminho: exe.caminho,
    executaDeFato,
    atalho: exe.atalho,
    origem: exe.origem,
    caminhoConfiguradoSumiu: exe.caminhoConfiguradoSumiu,
  };

  const [versao, alternativas] = await Promise.all([rodar(exe, ["--version"]), outrasInstalacoes(exe)]);
  base.alternativas = alternativas;
  if (versao.codigo !== 0) {
    const detalhe = (versao.erro || versao.saida).trim().slice(0, 300);
    const soAtalho = exe.shell && /ENOENT|não é reconhecido|not recognized|não foi possível encontrar|cannot find/i.test(detalhe);
    return {
      ...base,
      erro: soAtalho
        ? `Achei só o atalho do npm (${exe.caminho}) e ele não rodou. Informe o caminho do claude.exe em "Executável". ${detalhe}`
        : detalhe || "O executável não respondeu.",
    };
  }

  const v = versao.saida.trim().split(/\s+/)[0] || null;
  const situacao = situacaoDaVersao(v);
  const comVersao: StatusClaude = { ...base, instalado: true, versao: v, desatualizado: situacao.desatualizado, maisNovoQueTestado: situacao.maisNovoQueTestado };

  const status = await rodar(exe, ["auth", "status", "--json"]);
  try {
    // saída documentada do "auth status --json"; só os campos que a tela mostra
    const j = JSON.parse(status.saida) as { loggedIn?: boolean; authMethod?: string; subscriptionType?: string; email?: string };
    return {
      ...comVersao,
      logado: Boolean(j.loggedIn),
      metodo: j.authMethod ?? null,
      plano: j.subscriptionType ?? null,
      email: j.email ?? null,
    };
  } catch {
    const bruto = (status.erro || status.saida).trim();
    // antes da 2.1.41 o "auth status" não existe: a mensagem certa é a de versão, não "sem login"
    const compat = erroDeCompatibilidade(bruto, v);
    return { ...comVersao, erro: compat ?? (bruto.slice(0, 300) || "Não entendi a resposta do auth status.") };
  }
}
