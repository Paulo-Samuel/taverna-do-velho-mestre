// Funções puras para achar e conferir o executável do Claude Code. Sem "server-only" nem Next: este módulo
// roda em `node --test` (tests/claude-bin.test.ts) e é usado por provedor-cli.ts e pela página de configurações.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/** Versão mais antiga do Claude Code que a taverna aceita: `claude auth status` (2.1.41) e rate_limit_event (≈2.1.45). */
export const CLAUDE_VERSAO_MINIMA = "2.1.45";
/** Última versão com que a taverna foi testada de ponta a ponta (atualizar a cada entrega). */
export const CLAUDE_VERSAO_TESTADA = "2.1.316";

const PARECE_VERSAO = /^v?\d+(\.\d+){0,3}(?:[-+.].*)?$/;

/** Tira o número de versão de textos como "2.1.317 (Claude Code)" ou "v2.1.317". */
export function extrairVersao(texto: string | null | undefined): string | null {
  const m = String(texto ?? "").match(/\d+\.\d+(?:\.\d+){0,2}/);
  return m ? m[0] : null;
}

/** Compara duas versões "a.b.c" numericamente (segmentos faltando valem 0; sufixo depois de "-" é ignorado). -1, 0 ou 1. */
export function compararVersoes(a: string, b: string): number {
  const partes = (v: string) =>
    String(v)
      .trim()
      .replace(/^v/i, "")
      .split(/[-+\s]/)[0]
      .split(".")
      .map((n) => Number.parseInt(n, 10) || 0);
  const pa = partes(a);
  const pb = partes(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** Entre nomes de pasta, devolve o que parece a maior versão (ou null se nenhum parece versão). */
export function escolherMaiorVersao(nomes: string[]): string | null {
  const versoes = nomes.filter((n) => PARECE_VERSAO.test(n));
  if (!versoes.length) return null;
  return versoes.sort((x, y) => compararVersoes(y, x))[0];
}

export type SituacaoVersao = {
  /** mais antigo que CLAUDE_VERSAO_MINIMA */
  desatualizado: boolean;
  /** mais novo que CLAUDE_VERSAO_TESTADA (aviso discreto, não bloqueio) */
  maisNovoQueTestado: boolean;
};

export function situacaoDaVersao(versao: string | null | undefined): SituacaoVersao {
  const v = extrairVersao(versao);
  if (!v) return { desatualizado: false, maisNovoQueTestado: false };
  return {
    desatualizado: compararVersoes(v, CLAUDE_VERSAO_MINIMA) < 0,
    maisNovoQueTestado: compararVersoes(v, CLAUDE_VERSAO_TESTADA) > 0,
  };
}

/** Texto do aviso de versão para a interface (null quando a versão está na faixa testada). */
export function avisoDeVersao(versao: string | null | undefined): { tipo: "desatualizado" | "mais-novo"; texto: string } | null {
  const s = situacaoDaVersao(versao);
  const v = extrairVersao(versao) ?? "?";
  if (s.desatualizado) {
    return {
      tipo: "desatualizado",
      texto: `Claude Code ${v} é mais antigo que o mínimo ${CLAUDE_VERSAO_MINIMA} — rode \`claude update\` (ou reinstale pelo winget) e verifique de novo.`,
    };
  }
  if (s.maisNovoQueTestado) {
    return { tipo: "mais-novo", texto: `Versão mais nova que a testada (${CLAUDE_VERSAO_TESTADA}): se o mestre falhar, mande o diagnóstico.` };
  }
  return null;
}

/**
 * Quando o Claude Code sai com erro reclamando de flag ou comando desconhecido, devolve a mensagem em português;
 * senão null. `versao` é a versão instalada (quando conhecida).
 */
export function erroDeCompatibilidade(stderr: string, versao?: string | null): string | null {
  const m = String(stderr ?? "").match(/unknown (option|command) '([^']+)'/i);
  if (!m) return null;
  const que = m[1].toLowerCase() === "command" ? "o comando" : "a opção";
  const v = extrairVersao(versao) ? ` ${extrairVersao(versao)}` : "";
  return `Erro de compatibilidade: seu Claude Code${v} não aceita ${que} ${m[2]}. Atualize com \`claude update\`; a taverna foi testada com ${CLAUDE_VERSAO_TESTADA}.`;
}

// ---------- achados do `where` ----------

const extensao = (p: string) => path.extname(p).toLowerCase();

/**
 * Ordena o que `where claude` devolveu: .exe primeiro, depois .cmd/.bat; entradas sem extensão (o shim sh do npm,
 * que o Windows não executa) ficam de fora. A ordem original é mantida dentro de cada grupo.
 */
export function ordenarAchadosWhere(achados: string[]): string[] {
  const limpos = achados.map((a) => a.trim()).filter(Boolean);
  const peso = (p: string) => (extensao(p) === ".exe" ? 0 : extensao(p) === ".cmd" || extensao(p) === ".bat" ? 1 : 9);
  return limpos
    .map((p, i) => ({ p, i, w: peso(p) }))
    .filter((x) => x.w < 9)
    .sort((x, y) => x.w - y.w || x.i - y.i)
    .map((x) => x.p);
}

// ---------- shim .cmd do npm ----------

export type AlvoShim = {
  /** executável de verdade */
  comando: string;
  /** argumentos fixos antes dos do turno (o cli.js quando o alvo é um script) */
  args: string[];
  /** caminho que identifica a instalação (para mostrar e gravar): o .exe real, ou o próprio .cmd quando o alvo é um .js */
  caminho: string;
};

/**
 * Lê um claude.cmd gerado pelo npm e extrai o alvo real: `"%dp0%\node_modules\@anthropic-ai\claude-code\bin\claude.exe"`
 * ou `"%~dp0\node_modules\...\cli.js"`. Sem shell não há DEP0190 e matar o processo alcança o claude certo.
 * Devolve null quando o arquivo não é um shim conhecido ou o alvo não existe.
 */
export function resolverShimNpm(caminhoCmd: string, execPathNode: string = process.execPath, ler: (p: string) => string = (p) => readFileSync(p, "utf8")): AlvoShim | null {
  if (!/\.(cmd|bat)$/i.test(caminhoCmd)) return null;
  let texto: string;
  try {
    texto = ler(caminhoCmd);
  } catch {
    return null;
  }
  const pasta = path.dirname(caminhoCmd);
  // todas as referências "%dp0%\..." / "%~dp0\..." entre aspas; a primeira que for claude.exe ou um .js serve
  const refs = [...texto.matchAll(/"%~?dp0%?\\?([^"]+)"/g)].map((m) => m[1].replace(/^[\\/]+/, ""));
  for (const rel of refs) {
    const alvo = path.join(pasta, rel);
    const base = path.basename(alvo).toLowerCase();
    if (base === "node.exe" || base === "node") continue;
    if (/\.exe$/i.test(alvo)) {
      if (existsSync(alvo)) return { comando: alvo, args: [], caminho: alvo };
      continue;
    }
    if (/\.(js|mjs|cjs)$/i.test(alvo)) {
      if (existsSync(alvo)) return { comando: execPathNode, args: [alvo], caminho: caminhoCmd };
      continue;
    }
  }
  return null;
}

// ---------- app desktop (Claude-Data) ----------

const NOME_EXE = process.platform === "win32" ? "claude.exe" : "claude";

function subpastas(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

/**
 * Procura o claude.exe embutido no app desktop a partir de uma raiz: `%LOCALAPPDATA%\Claude-Data`,
 * `...\claude_<id>`, `...\claude-code`, `...\claude-code\<versão>` ou a própria pasta do executável.
 * Em cada nível, pastas com nome de versão são visitadas da maior para a menor; as demais, em ordem alfabética
 * inversa (perfis `claude_*` mais recentes costumam vir depois). Profundidade máxima: 5 níveis.
 * A estrutura é do app e pode mudar: trate como heurística.
 */
export function descobrirClaudeDesktop(raiz: string, nomeExe: string = NOME_EXE, profundidade = 5): string | null {
  if (!raiz || profundidade < 0) return null;
  try {
    if (!statSync(raiz).isDirectory()) return null;
  } catch {
    return null;
  }
  const direto = path.join(raiz, nomeExe);
  if (existsSync(direto)) return direto;
  if (profundidade === 0) return null;
  const nomes = subpastas(raiz);
  const versoes = nomes.filter((n) => PARECE_VERSAO.test(n)).sort((x, y) => compararVersoes(y, x));
  const outras = nomes.filter((n) => !PARECE_VERSAO.test(n)).sort((x, y) => (x < y ? 1 : x > y ? -1 : 0));
  for (const nome of [...versoes, ...outras]) {
    const achado = descobrirClaudeDesktop(path.join(raiz, nome), nomeExe, profundidade - 1);
    if (achado) return achado;
  }
  return null;
}

/** Raiz padrão do app desktop no Windows (`%LOCALAPPDATA%\Claude-Data`); null fora do Windows ou sem a variável. */
export function raizClaudeDesktop(env: NodeJS.ProcessEnv = process.env): string | null {
  const local = env.LOCALAPPDATA?.trim();
  return local ? path.join(local, "Claude-Data") : null;
}

/**
 * Quando um caminho configurado morava dentro de `...\claude-code\<versão>\<hash>\claude.exe`, devolve a pasta
 * `claude-code` dele (para procurar a versão nova no mesmo lugar); null se o caminho não tem essa cara.
 */
export function pastaClaudeCodeDe(caminho: string): string | null {
  const partes = path.normalize(caminho).split(/[\\/]+/);
  const i = partes.findIndex((p) => p.toLowerCase() === "claude-code");
  if (i < 0) return null;
  return partes.slice(0, i + 1).join(path.sep);
}
