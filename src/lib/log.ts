import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

// Registro em arquivo: uma linha JSON por acontecimento em data/logs/taverna-<aaaa-mm-dd>.log (guardado por 14 dias),
// espelhada no console. É o que o amigo manda quando "o mestre não responde" (junto do relatório de /config → Diagnóstico).
// Sem "server-only" de propósito: roda em `node --test` e não depende do Next.
//
// Nunca registre prompt, sistema, contexto nem a narração: só metadados (versões, flags, duração, código, stderr).
// O que passa por aqui ainda sai sem chave de API e sem e-mail (limparSegredos), por garantia.
//
// Migração gradual: os console.* que ainda existem em outros arquivos ficam como estão até alguém mexer neles;
// código novo do servidor usa registrar().

export type NivelLog = "info" | "aviso" | "erro";

export type LinhaLog = { em: string; nivel: NivelLog; origem: string } & Record<string, unknown>;

/** Quantos dias de log ficam em data/logs. */
export const DIAS_GUARDADOS = 14;
/** Campos que nunca vão para o arquivo, mesmo que alguém os passe por engano. */
const CAMPOS_PROIBIDOS = /^(prompt|sistema|contexto|entrada|texto|narracao|mensagens|messages|system|chave|apiKey|token|email)$/i;
/** Texto muito comprido (um stderr gigante) é cortado no meio para a linha não passar disso. */
const MAXIMO_TEXTO = 20_000;

/** Pasta dos logs: TAVERNA_LOGS, senão logs/ ao lado do banco (TAVERNA_DB nos testes), senão data/logs. */
export function pastaLogs(): string {
  if (process.env.TAVERNA_LOGS?.trim()) return path.resolve(process.env.TAVERNA_LOGS.trim());
  if (process.env.TAVERNA_DB?.trim()) return path.join(path.dirname(path.resolve(process.env.TAVERNA_DB.trim())), "logs");
  return path.join(process.cwd(), "data", "logs");
}

/** Data local no formato aaaa-mm-dd (o dia do arquivo é o do relógio da máquina, não o UTC). */
export function diaLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function arquivoDoDia(d = new Date()): string {
  return path.join(pastaLogs(), `taverna-${diaLocal(d)}.log`);
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const CHAVE_ANTHROPIC = /sk-ant-[A-Za-z0-9_-]{6,}/g;
const CHAVE_GENERICA = /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{20,}/g;

/** Tira chaves de API e e-mails de um texto (vale para log, relatório e qualquer coisa que saia da máquina). */
export function limparSegredos(texto: string): string {
  let t = String(texto ?? "");
  const chave = process.env.ANTHROPIC_API_KEY?.trim();
  if (chave && chave.length >= 8) t = t.split(chave).join("(chave oculta)");
  return t.replace(CHAVE_ANTHROPIC, "sk-ant-(chave oculta)").replace(CHAVE_GENERICA, "(chave oculta)").replace(EMAIL, "(e-mail oculto)");
}

function cortar(t: string): string {
  if (t.length <= MAXIMO_TEXTO) return t;
  const metade = Math.floor(MAXIMO_TEXTO / 2);
  return `${t.slice(0, metade)}\n…(${t.length - MAXIMO_TEXTO} caracteres cortados)…\n${t.slice(-metade)}`;
}

/** Deixa os dados prontos para JSON: erros viram {nome, mensagem, pilha}, campos proibidos somem, textos saem limpos. */
export function prepararDados(valor: unknown, profundidade = 0): unknown {
  if (valor == null || typeof valor === "number" || typeof valor === "boolean") return valor;
  if (typeof valor === "string") return cortar(limparSegredos(valor));
  if (typeof valor === "bigint") return String(valor);
  if (valor instanceof Error) {
    return {
      nome: valor.name,
      mensagem: cortar(limparSegredos(valor.message)),
      pilha: valor.stack ? cortar(limparSegredos(valor.stack)) : undefined,
    };
  }
  if (profundidade > 4) return "(…)";
  if (Array.isArray(valor)) return valor.slice(0, 100).map((v) => prepararDados(v, profundidade + 1));
  if (typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      if (CAMPOS_PROIBIDOS.test(k) || typeof v === "function") continue;
      saida[k] = prepararDados(v, profundidade + 1);
    }
    return saida;
  }
  return String(valor);
}

const g = globalThis as unknown as { __tavernaLogPodado?: string };

/** Apaga taverna-*.log (e doutor-*.txt) com mais de DIAS_GUARDADOS dias. Uma vez por dia basta. */
export function podarLogs(agora = Date.now(), pasta = pastaLogs()): number {
  let apagados = 0;
  let nomes: string[] = [];
  try {
    nomes = readdirSync(pasta);
  } catch {
    return 0;
  }
  const limite = agora - DIAS_GUARDADOS * 24 * 60 * 60 * 1000;
  for (const nome of nomes) {
    if (!/^(taverna-\d{4}-\d{2}-\d{2}\.log|doutor-\d{4}-\d{2}-\d{2}\.txt)$/.test(nome)) continue;
    const caminho = path.join(pasta, nome);
    try {
      if (statSync(caminho).mtimeMs < limite) {
        unlinkSync(caminho);
        apagados++;
      }
    } catch {
      // arquivo aberto por outro programa: fica para amanhã
    }
  }
  return apagados;
}

/**
 * Registra um acontecimento: uma linha JSON no arquivo do dia e a mesma coisa no console.
 * Nunca lança (log quebrado não pode derrubar um turno).
 */
export function registrar(nivel: NivelLog, origem: string, dados: Record<string, unknown> = {}): LinhaLog {
  const corpo = prepararDados(dados) as Record<string, unknown>;
  // em/nivel/origem primeiro na linha e protegidos: um campo "origem" nos dados não troca a origem do registro
  const fixos = { em: new Date().toISOString(), nivel, origem };
  const linha = { ...fixos, ...corpo, ...fixos } as LinhaLog;
  try {
    const pasta = pastaLogs();
    mkdirSync(pasta, { recursive: true });
    const hoje = diaLocal();
    if (g.__tavernaLogPodado !== hoje) {
      g.__tavernaLogPodado = hoje;
      podarLogs(Date.now(), pasta);
    }
    appendFileSync(arquivoDoDia(), JSON.stringify(linha) + "\n", "utf8");
  } catch {
    // sem disco (pasta só de leitura, OneDrive travando): fica só o console
  }
  const espelho = `[taverna] ${origem}`;
  if (nivel === "erro") console.error(espelho, corpo);
  else if (nivel === "aviso") console.warn(espelho, corpo);
  else console.info(espelho, corpo);
  return linha;
}

/** As últimas `n` linhas de log (do arquivo mais novo para trás, até juntar `n`), na ordem em que aconteceram. */
export function ultimasLinhas(n = 100, pasta = pastaLogs()): string[] {
  if (n <= 0) return [];
  let arquivos: string[] = [];
  try {
    arquivos = readdirSync(pasta)
      .filter((a) => /^taverna-\d{4}-\d{2}-\d{2}\.log$/.test(a))
      .sort()
      .reverse();
  } catch {
    return [];
  }
  const juntas: string[] = [];
  for (const arquivo of arquivos) {
    let linhas: string[];
    try {
      linhas = readFileSync(path.join(pasta, arquivo), "utf8").split(/\r?\n/).filter(Boolean);
    } catch {
      continue;
    }
    juntas.unshift(...linhas.slice(-(n - juntas.length)));
    if (juntas.length >= n) break;
  }
  return juntas.map(limparSegredos);
}
