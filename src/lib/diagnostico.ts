import "server-only";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { freemem, release, totalmem, type as tipoDoSistema } from "node:os";
import path from "node:path";
import { arquivoBanco } from "./backup";
import { arquivoDoDia, limparSegredos, pastaLogs, ultimasLinhas } from "./log";
import { chaveDaApi, idDoProvedor, lerAjustesMestre, mestreIndisponivel, provedorAtual } from "./mestre";
import { avisoDeVersao } from "./mestre/claude-bin";
import { resolverExecutavelClaude, rotuloDaOrigem, versaoDoExecutavel } from "./mestre/provedor-cli";
import { MOTIVO_CONFERINDO, enderecosLocais, estadoFirewall } from "./rede/enderecos";

// Relatório de diagnóstico de /config → Diagnóstico e de GET /api/diagnostico?baixar=1: o que o amigo manda para quem
// instalou quando "o mestre não responde". Só metadados: versões, mestre, porta, pasta, banco, firewall e as últimas
// linhas do log. Nunca a chave de API (só "tem" ou "não tem"), nunca e-mail (o `claude auth status` nem é chamado aqui).

export type ItemDiagnostico = { rotulo: string; valor: string; alerta?: boolean };

export type Diagnostico = {
  geradoEm: string;
  itens: ItemDiagnostico[];
  /** últimas linhas de data/logs/taverna-*.log (JSON por linha) */
  linhas: string[];
  /** fim do registro mais recente do atalho (data/logs/atalho-*.log) */
  atalho: { arquivo: string; linhas: string[] } | null;
  /** o relatório inteiro em texto, pronto para copiar ou baixar */
  texto: string;
  /** a conferência do firewall ainda não terminou (vale pedir o relatório de novo em alguns segundos) */
  firewallPendente: boolean;
};

export const LINHAS_DO_LOG = 100;
const LINHAS_DO_ATALHO = 40;

function lerJson(caminho: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    return null;
  }
}

/** Commit atual lendo .git direto (sem chamar o git, que pode nem estar instalado). */
function commitAtual(raiz: string): string | null {
  try {
    const git = path.join(raiz, ".git");
    const head = readFileSync(path.join(git, "HEAD"), "utf8").trim();
    if (!head.startsWith("ref:")) return head.slice(0, 7);
    const ref = head.slice(4).trim();
    const solto = path.join(git, ref);
    if (existsSync(solto)) return `${readFileSync(solto, "utf8").trim().slice(0, 7)} (${ref.replace(/^refs\/heads\//, "")})`;
    const empacotado = readFileSync(path.join(git, "packed-refs"), "utf8")
      .split(/\r?\n/)
      .find((l) => l.endsWith(` ${ref}`));
    return empacotado ? `${empacotado.slice(0, 7)} (${ref.replace(/^refs\/heads\//, "")})` : null;
  } catch {
    return null;
  }
}

function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function tamanhoDoArquivo(caminho: string): number | null {
  try {
    return statSync(caminho).size;
  } catch {
    return null;
  }
}

function fimDoAtalho(): Diagnostico["atalho"] {
  try {
    const pasta = pastaLogs();
    const [ultimo] = readdirSync(pasta)
      .filter((a) => /^atalho-\d{4}-\d{2}-\d{2}\.log$/.test(a))
      .sort()
      .reverse();
    if (!ultimo) return null;
    const linhas = readFileSync(path.join(pasta, ultimo), "utf8").replace(/^﻿/, "").split(/\r?\n/);
    while (linhas.length && !linhas[linhas.length - 1].trim()) linhas.pop();
    return { arquivo: ultimo, linhas: linhas.slice(-LINHAS_DO_ATALHO).map(limparSegredos) };
  } catch {
    return null;
  }
}

const NA_NUVEM = /onedrive|dropbox|google drive|icloud/i;

/**
 * Monta o relatório. `esperarFirewallMs`: quanto esperar a conferência do firewall (PowerShell, ~3 s na primeira vez);
 * a página passa 0 para abrir na hora, e a seção pede o relatório de novo quando a conferência termina.
 */
export async function montarDiagnostico(porta: number, { esperarFirewallMs = 5000 }: { esperarFirewallMs?: number } = {}): Promise<Diagnostico> {
  const raiz = process.cwd();
  const pacote = lerJson(path.join(raiz, "package.json"));
  const next = lerJson(path.join(raiz, "node_modules", "next", "package.json"));
  const ajustes = lerAjustesMestre();
  const id = idDoProvedor(ajustes);
  const problema = mestreIndisponivel();
  const itens: ItemDiagnostico[] = [];
  const item = (rotulo: string, valor: string, alerta?: boolean) => itens.push({ rotulo, valor, ...(alerta ? { alerta } : {}) });

  const commit = commitAtual(raiz);
  item("Taverna", `${String(pacote?.version ?? "?")}${commit ? ` · commit ${commit}` : " · sem .git (veio de um ZIP?)"}`, !commit);
  item("Node.js", process.version, Number(process.versions.node.split(".")[0]) < 24);
  item("Next.js", String(next?.version ?? "?"));
  item("Sistema", `${tipoDoSistema()} ${release()} (${process.arch}) · memória livre ${tamanho(freemem())} de ${tamanho(totalmem())}`);
  item("Servidor", process.env.NODE_ENV === "development" ? "desenvolvimento (npm run dev)" : "produção (atalho / npm start)");
  item("Porta", String(porta), porta !== 3300);
  item("Pasta da taverna", raiz, NA_NUVEM.test(raiz));

  const banco = arquivoBanco();
  const bytesBanco = tamanhoDoArquivo(banco);
  const bytesWal = tamanhoDoArquivo(`${banco}-wal`);
  item(
    "Banco",
    bytesBanco == null ? `não encontrado (${banco})` : `${tamanho(bytesBanco)}${bytesWal ? ` + ${tamanho(bytesWal)} no -wal` : ""} · ${path.relative(raiz, banco) || banco}`,
    bytesBanco == null,
  );

  // mestre efetivo: o que vale agora (ajuste → TAVERNA_PROVEDOR → cli), sem segredo nenhum
  item("Mestre", `${id} · ${problema ? "indisponível" : provedorAtual().nome}`, Boolean(problema));
  if (problema) item("Por que não mestra", problema, true);
  item("TAVERNA_PROVEDOR (.env)", process.env.TAVERNA_PROVEDOR?.trim() || "(vazio: cli)");
  const ajustados = Object.entries(ajustes)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`);
  item("Ajustes de /config", ajustados.length ? ajustados.join(" · ") : "nenhum (vale o .env)");
  if (process.env.CLAUDE_CLI_MODELO?.trim()) item("CLAUDE_CLI_MODELO", process.env.CLAUDE_CLI_MODELO.trim());
  if (process.env.CLAUDE_BIN?.trim()) item("CLAUDE_BIN", process.env.CLAUDE_BIN.trim());
  if (id === "api" || process.env.TAVERNA_MODELO_API) item("Modelo da API", ajustes.modeloApi || process.env.TAVERNA_MODELO_API?.trim() || "claude-sonnet-5-5");
  item("Chave de API", chaveDaApi() ? "presente (não vai no relatório)" : "ausente", id === "api" && !chaveDaApi());

  try {
    const exe = resolverExecutavelClaude(ajustes.binCli || undefined);
    const versao = await versaoDoExecutavel(exe);
    const aviso = avisoDeVersao(versao);
    item(
      "Claude Code",
      `${versao ?? "não respondeu ao --version"} · ${rotuloDaOrigem(exe.origem)} · ${exe.caminho}${aviso ? ` · ${aviso.texto}` : ""}`,
      !versao || aviso?.tipo === "desatualizado",
    );
    if (exe.caminhoConfiguradoSumiu) item("Executável configurado sumiu", exe.caminhoConfiguradoSumiu, true);
  } catch (e) {
    item("Claude Code", `não encontrado: ${e instanceof Error ? e.message : String(e)}`, id === "cli");
  }

  const fw = await estadoFirewall(porta, esperarFirewallMs);
  const firewallPendente = fw.motivo === MOTIVO_CONFERINDO;
  item(
    "Firewall do Windows",
    `${fw.estado} · ${fw.motivo}${fw.categorias.length ? ` · rede ${fw.categorias.join(", ")}` : ""}`,
    fw.estado === "bloqueado",
  );
  const ips = enderecosLocais();
  item("Endereços na rede", ips.length ? ips.map((e) => `${e.ip} (${e.interfaceNome})`).join(" · ") : "nenhum (sem Wi-Fi nem cabo?)", !ips.length);
  item("Log de hoje", path.relative(raiz, arquivoDoDia()) || arquivoDoDia());

  const linhas = ultimasLinhas(LINHAS_DO_LOG);
  const atalho = fimDoAtalho();
  const geradoEm = new Date().toLocaleString("pt-BR");

  const largura = Math.max(...itens.map((i) => i.rotulo.length));
  const texto = limparSegredos(
    [
      "Relatório de diagnóstico da Taverna do Velho Mestre",
      `Gerado em ${geradoEm}. Mande este texto (ou o arquivo) para quem instalou a taverna.`,
      "",
      ...itens.map((i) => `${i.alerta ? "!" : " "} ${i.rotulo.padEnd(largura)}  ${i.valor}`),
      "",
      `---- últimas ${linhas.length} linhas do log (${path.relative(raiz, pastaLogs()) || pastaLogs()}) ----`,
      ...(linhas.length ? linhas : ["(nenhuma ainda)"]),
      ...(atalho ? ["", `---- fim de ${atalho.arquivo} ----`, ...atalho.linhas] : []),
      "",
    ].join("\n"),
  );

  return { geradoEm, itens, linhas, atalho, texto, firewallPendente };
}
