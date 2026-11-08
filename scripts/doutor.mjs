#!/usr/bin/env node
// Doutor da taverna: exame de saúde da instalação que funciona mesmo com a taverna desligada (ou quando ela não sobe).
//   npm run doutor        (ou: node scripts/doutor.mjs)
// Imprime uma linha OK / ATENÇÃO / FALHOU por item, em português, e grava a mesma saída em data/logs/doutor-<data>.txt.
// Só lê: não instala, não compila, não mexe em data/ (além do arquivo do relatório) nem no firewall.
// Nunca mostra a chave de API nem o e-mail da conta do Claude Code.
//
// JS puro, sem dependências: roda até com node_modules faltando. A descoberta do Claude Code e a conferência do firewall
// vêm dos mesmos módulos do app (src/lib/mestre/claude-bin.ts e src/lib/rede/enderecos.ts, lidos pelo type stripping do
// Node 24); num Node antigo, que não lê .ts, o doutor cai num caminho mais simples e avisa.
//
// Variáveis só para testar o próprio doutor: TAVERNA_PORTA (porta conferida, padrão 3300), CLAUDE_BIN (como no app),
// TAVERNA_DOUTOR_SEM_REDE=1 (pula o git ls-remote), TAVERNA_DOUTOR_SAIDA (pasta do relatório; padrão data/logs).

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// os avisos do Node (".ts sem type", "sqlite experimental") só confundem quem está lendo o exame
process.removeAllListeners("warning");

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORTA = /^\d+$/.test(process.env.TAVERNA_PORTA ?? "") ? Number(process.env.TAVERNA_PORTA) : 3300;
const NODE_TESTADO = 24;
const ehWindows = process.platform === "win32";
const cor = process.stdout.isTTY && !process.env.NO_COLOR;
const CORES = { OK: "\x1b[32m", "ATENÇÃO": "\x1b[33m", FALHOU: "\x1b[31m" };

/** @type {{ nivel: "OK" | "ATENÇÃO" | "FALHOU"; item: string; detalhe: string; dica?: string }[]} */
const resultados = [];
const saida = [];

function escrever(linha = "", colorida = linha) {
  saida.push(linha);
  console.log(cor ? colorida : linha);
}

function anotar(nivel, item, detalhe, dica) {
  resultados.push({ nivel, item, detalhe, dica });
  const rotulo = nivel.padEnd(7);
  escrever(`${rotulo}  ${item}: ${detalhe}`, `${CORES[nivel]}${rotulo}\x1b[0m  ${item}: ${detalhe}`);
  if (dica) escrever(`         → ${dica}`);
}

const ok = (item, detalhe, dica) => anotar("OK", item, detalhe, dica);
const atencao = (item, detalhe, dica) => anotar("ATENÇÃO", item, detalhe, dica);
const falhou = (item, detalhe, dica) => anotar("FALHOU", item, detalhe, dica);

function limparSegredos(texto) {
  let t = String(texto ?? "");
  const chave = process.env.ANTHROPIC_API_KEY?.trim();
  if (chave && chave.length >= 8) t = t.split(chave).join("(chave oculta)");
  return t
    .replace(/sk-ant-[A-Za-z0-9_-]{6,}/g, "sk-ant-(chave oculta)")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, "(e-mail oculto)");
}

const ehArquivo = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};
const ehPasta = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

function diaLocal(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Roda um comando sem shell (ou com, para .cmd), com prazo, e devolve { codigo, saida, erro }. Nunca lança. */
function rodar(comando, args, { shell = false, tempo = 15_000, env = process.env } = {}) {
  const aspas = (a) => `"${String(a).replace(/"/g, '\\"')}"`;
  const r = shell
    ? spawnSync([comando, ...args].map(aspas).join(" "), [], { shell: true, encoding: "utf8", timeout: tempo, windowsHide: true, env })
    : spawnSync(comando, args, { encoding: "utf8", timeout: tempo, windowsHide: true, env });
  return { codigo: r.status, saida: String(r.stdout ?? ""), erro: String(r.stderr ?? "") || (r.error ? r.error.message : "") };
}

async function importarDoApp(relativo) {
  try {
    return await import(pathToFileURL(path.join(RAIZ, relativo)).href);
  } catch {
    return null;
  }
}

// ---------- .env.local (lido como o Next lê: o ambiente de verdade vale mais) ----------

const CHAVES_CONHECIDAS = new Set([
  "TAVERNA_PROVEDOR",
  "CLAUDE_BIN",
  "CLAUDE_CLI_MODELO",
  "ANTHROPIC_API_KEY",
  "TAVERNA_MODELO_API",
  "TAVERNA_DB",
  "TAVERNA_LOGS",
  "TAVERNA_DIST",
  "PORT",
  "NODE_OPTIONS",
]);

function lerEnvLocal() {
  const arquivo = path.join(RAIZ, ".env.local");
  if (!existsSync(arquivo)) return null;
  const valores = {};
  for (const linha of readFileSync(arquivo, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = linha.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, "");
    valores[m[1]] = v;
  }
  return valores;
}

// ---------- exames ----------

function exameNode() {
  const maior = Number(process.versions.node.split(".")[0]);
  if (maior < NODE_TESTADO) {
    falhou("Node.js", `${process.version} é antigo demais (a taverna precisa do 24)`, "winget install OpenJS.NodeJS.LTS e abra o terminal de novo");
  } else if (maior > NODE_TESTADO) {
    atencao("Node.js", `${process.version}: mais novo que o testado (24 LTS)`, "se algo falhar, instale a linha LTS: winget install OpenJS.NodeJS.LTS");
  } else {
    ok("Node.js", process.version);
  }
}

async function exameSqlite() {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE t (x INTEGER); INSERT INTO t VALUES (1);");
    db.close();
    ok("node:sqlite", "banco embutido do Node funcionando");
    return DatabaseSync;
  } catch (e) {
    falhou("node:sqlite", `não carregou (${e?.message ?? e})`, "a taverna precisa do Node 24 LTS: winget install OpenJS.NodeJS.LTS");
    return null;
  }
}

function examePasta() {
  const nuvens = [process.env.OneDrive, process.env.OneDriveConsumer, process.env.OneDriveCommercial].filter(Boolean).map((p) => path.resolve(p).toLowerCase());
  const aqui = RAIZ.toLowerCase();
  if (nuvens.some((n) => aqui === n || aqui.startsWith(n + path.sep)) || /[\\/]onedrive[\\/ -]/i.test(RAIZ + path.sep)) {
    falhou("Pasta", `${RAIZ} está dentro do OneDrive`, "mova a pasta para C:\\taverna (fora do OneDrive): lá o banco trava e a node_modules sobe para a nuvem");
  } else if (/dropbox|google drive|icloud/i.test(RAIZ)) {
    atencao("Pasta", `${RAIZ} parece sincronizada com a nuvem`, "o lugar certo é uma pasta local, como C:\\taverna");
  } else {
    ok("Pasta", RAIZ);
  }
}

function exameEnv(env) {
  if (!env) {
    atencao(".env.local", "não existe ainda", "o atalho cria a partir do .env.example na primeira vez (ou copie .env.example para .env.local)");
    return;
  }
  const estranhas = Object.keys(env).filter((k) => !CHAVES_CONHECIDAS.has(k));
  // o que vale de fato: o ambiente do sistema ganha do arquivo (como no Next)
  const preenchidas = Object.keys(env)
    .filter((k) => CHAVES_CONHECIDAS.has(k) && (process.env[k] || env[k]))
    .map((k) => {
      const valor = process.env[k] ?? env[k];
      if (k === "ANTHROPIC_API_KEY") return valor ? "ANTHROPIC_API_KEY=(preenchida)" : "ANTHROPIC_API_KEY=(vazia)";
      return `${k}=${valor}${valor !== env[k] ? " (do ambiente, não do arquivo)" : ""}`;
    });
  if (estranhas.length) {
    atencao(".env.local", `chaves que a taverna não conhece: ${estranhas.join(", ")}`, "confira se não é erro de digitação (compare com o .env.example)");
  } else {
    ok(".env.local", preenchidas.length ? preenchidas.join(" · ") : "presente (tudo no padrão)");
  }
}

/** Ajustes de /config gravados no banco (só leitura). */
function ajustesDoBanco(DatabaseSync) {
  const banco = process.env.TAVERNA_DB ? path.resolve(process.env.TAVERNA_DB) : path.join(RAIZ, "data", "taverna.db");
  if (!DatabaseSync || !existsSync(banco)) return {};
  try {
    const db = new DatabaseSync(banco, { readOnly: true });
    try {
      const l = db.prepare("SELECT valor FROM ajustes WHERE chave = 'mestre'").get();
      return l ? JSON.parse(l.valor) : {};
    } finally {
      db.close();
    }
  } catch {
    return {};
  }
}

function exameProvedor(ajustes) {
  const env = process.env.TAVERNA_PROVEDOR?.trim();
  if (env && !["cli", "api", "falso"].includes(env)) {
    falhou("Mestre", `TAVERNA_PROVEDOR=${env} não existe`, "use cli (Claude Code), api (chave da Anthropic) ou falso (mestre de teste)");
    return "cli";
  }
  const id = ajustes.provedor ?? env ?? "cli";
  const de = ajustes.provedor ? "escolhido em /config" : env ? "TAVERNA_PROVEDOR" : "padrão";
  if (id === "api" && !process.env.ANTHROPIC_API_KEY?.trim()) {
    falhou("Mestre", `api (${de}), mas sem ANTHROPIC_API_KEY`, "cole a sua chave em ANTHROPIC_API_KEY no .env.local e reinicie a taverna");
  } else if (id === "falso") {
    atencao("Mestre", `falso (${de}): mestre de teste, sem IA`, "para jogar de verdade, troque para cli ou api em /config ou no .env.local");
  } else {
    ok("Mestre", `${id} (${de})${id === "api" ? " · chave presente" : ""}`);
  }
  return id;
}

/** Acha o Claude Code na mesma ordem do app: ajuste → CLAUDE_BIN → PATH → ~/.local/bin → app Claude → npm. */
function acharClaude(bin, cb) {
  const montar = (caminho, origem) => {
    if (!ehArquivo(caminho)) return null;
    if (/\.(cmd|bat)$/i.test(caminho)) {
      const alvo = cb?.resolverShimNpm?.(caminho);
      if (alvo) return { comando: alvo.comando, args: alvo.args, shell: false, caminho: alvo.caminho, origem };
      return { comando: caminho, args: [], shell: true, caminho, origem };
    }
    return { comando: caminho, args: [], shell: false, caminho, origem };
  };
  const raiz = cb?.raizClaudeDesktop?.() ?? null;
  let sumiu = null;
  const configurado = (bin || "").trim();
  if (configurado) {
    let exe = null;
    if (/^desktop$/i.test(configurado)) exe = raiz && cb ? montar(cb.descobrirClaudeDesktop(raiz) ?? "", "embutido no app Claude (desktop)") : null;
    else if (ehPasta(configurado) && cb) exe = montar(cb.descobrirClaudeDesktop(configurado) ?? "", "embutido no app Claude (pasta configurada)");
    else exe = montar(configurado, "caminho configurado");
    if (exe) return { exe, sumiu };
    sumiu = configurado;
    const pastaApp = cb?.pastaClaudeCodeDe?.(configurado);
    const vizinho = pastaApp ? cb.descobrirClaudeDesktop(pastaApp) : null;
    if (vizinho) return { exe: montar(vizinho, "embutido no app Claude"), sumiu };
  }
  if (ehWindows) {
    let achados = [];
    try {
      achados = execFileSync("where", ["claude"], { encoding: "utf8", windowsHide: true, timeout: 5000, stdio: ["ignore", "pipe", "ignore"] }).split(/\r?\n/);
    } catch {
      achados = [];
    }
    const ordenados = cb?.ordenarAchadosWhere ? cb.ordenarAchadosWhere(achados) : achados.map((a) => a.trim()).filter((a) => /\.(exe|cmd)$/i.test(a));
    for (const a of ordenados) {
      const exe = montar(a, "no PATH");
      if (exe) return { exe, sumiu };
    }
    const perfil = process.env.USERPROFILE?.trim();
    const local = perfil ? montar(path.join(perfil, ".local", "bin", "claude.exe"), "instalador oficial (~/.local/bin)") : null;
    if (local) return { exe: local, sumiu };
    const desktop = raiz && cb ? cb.descobrirClaudeDesktop(raiz) : null;
    if (desktop) return { exe: montar(desktop, "embutido no app Claude"), sumiu };
    const appdata = process.env.APPDATA?.trim();
    const npm = appdata ? montar(path.join(appdata, "npm", "claude.cmd"), "instalado pelo npm") : null;
    if (npm) return { exe: npm, sumiu };
    return { exe: null, sumiu };
  }
  const casa = process.env.HOME?.trim();
  const local = casa ? montar(path.join(casa, ".local", "bin", "claude"), "instalador oficial (~/.local/bin)") : null;
  return { exe: local ?? { comando: "claude", args: [], shell: false, caminho: "claude", origem: "no PATH" }, sumiu };
}

async function exameClaude(ajustes, provedor) {
  const cb = await importarDoApp("src/lib/mestre/claude-bin.ts");
  const precisa = provedor === "cli";
  const grave = precisa ? falhou : atencao;
  if (!cb) atencao("Claude Code", "não consegui ler a descoberta do app (src/lib/mestre/claude-bin.ts); usando a busca simples", "confira o Node 24 acima");
  const minima = cb?.CLAUDE_VERSAO_MINIMA ?? "2.1.45";
  const testada = cb?.CLAUDE_VERSAO_TESTADA ?? "?";
  const bin = ajustes.binCli || process.env.CLAUDE_BIN;
  const { exe, sumiu } = acharClaude(bin, cb);
  if (sumiu) {
    atencao(
      "Claude Code",
      `o executável configurado (${ajustes.binCli ? "em /config" : "CLAUDE_BIN"}) não existe: ${sumiu}`,
      "se o app Claude atualizou e trocou de pasta, use CLAUDE_BIN=desktop; ou deixe vazio para a taverna procurar sozinha",
    );
  }
  if (!exe) {
    grave("Claude Code", "não encontrado nesta máquina", "winget install Anthropic.ClaudeCode, feche e abra o terminal, rode claude uma vez para o login");
    return;
  }
  // sem chave de API no ambiente: com ela o Claude Code cobraria créditos da API, e o login mostrado seria o errado
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  const v = rodar(exe.comando, [...exe.args, "--version"], { shell: exe.shell, env });
  const versao = cb?.extrairVersao ? cb.extrairVersao(v.saida) : (v.saida.match(/\d+\.\d+(?:\.\d+)?/) ?? [null])[0];
  if (v.codigo !== 0 || !versao) {
    grave("Claude Code", `achei ${exe.caminho} (${exe.origem}), mas ele não respondeu ao --version: ${limparSegredos((v.erro || v.saida).trim().slice(0, 200)) || `código ${v.codigo}`}`, "reinstale com winget install Anthropic.ClaudeCode ou informe outro executável em CLAUDE_BIN");
    return;
  }
  const situacao = cb?.situacaoDaVersao?.(versao) ?? { desatualizado: false, maisNovoQueTestado: false };
  if (situacao.desatualizado) {
    grave("Claude Code", `${versao} é mais antigo que o mínimo ${minima} (${exe.caminho})`, "rode claude update (ou reinstale pelo winget)");
  } else if (situacao.maisNovoQueTestado) {
    atencao("Claude Code", `${versao}, mais novo que o testado ${testada} · ${exe.origem} · ${exe.caminho}`, "normalmente funciona; se o mestre falhar, mande este exame");
  } else {
    ok("Claude Code", `${versao} · ${exe.origem} · ${exe.caminho}`);
  }

  const a = rodar(exe.comando, [...exe.args, "auth", "status", "--json"], { shell: exe.shell, env, tempo: 20_000 });
  let j = null;
  try {
    j = JSON.parse(a.saida);
  } catch {
    j = null;
  }
  if (!j) {
    const compat = cb?.erroDeCompatibilidade?.(a.erro || a.saida, versao);
    grave("Login do Claude Code", compat ?? `não entendi a resposta do auth status: ${limparSegredos((a.erro || a.saida).trim().slice(0, 200))}`, "abra um terminal, rode claude e faça o login");
  } else if (!j.loggedIn) {
    grave("Login do Claude Code", "instalado, mas sem login", "abra um terminal, rode claude e entre com a sua conta");
  } else {
    // e-mail nunca: só o método e o plano
    const metodo = j.authMethod ? ` (${j.authMethod})` : "";
    const plano = j.subscriptionType ? `, plano ${j.subscriptionType}` : "";
    if (j.authMethod && j.authMethod !== "claude.ai") {
      atencao("Login do Claude Code", `logado${metodo}${plano}`, "esse login não é o do plano Pro/Max: a cobrança segue esse método");
    } else {
      ok("Login do Claude Code", `logado${metodo}${plano}`);
    }
  }
}

/** Quem escuta na porta: true/false, e se é a taverna (cabeçalho x-taverna). */
function portaOcupada(porta) {
  const tentar = (host) =>
    new Promise((ok) => {
      const s = net.connect({ host, port: porta });
      s.setTimeout(1500);
      s.once("connect", () => (s.destroy(), ok(true)));
      s.once("timeout", () => (s.destroy(), ok(false)));
      s.once("error", () => ok(false));
    });
  return tentar("127.0.0.1").then((v4) => v4 || tentar("::1"));
}

function quemUsaAPorta(porta) {
  if (!ehWindows) return null;
  const r = rodar("netstat", ["-ano", "-p", "TCP"], { tempo: 10_000 });
  const linha = r.saida.split(/\r?\n/).find((l) => new RegExp(`[:.]${porta}\\s+\\S+\\s+(LISTENING|ESCUTANDO|ABH)`, "i").test(l) || new RegExp(`[:.]${porta}\\s+0\\.0\\.0\\.0:0\\s`).test(l));
  const pid = linha?.trim().split(/\s+/).pop();
  if (!pid || !/^\d+$/.test(pid)) return null;
  const t = rodar("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], { tempo: 10_000 });
  const nome = t.saida.match(/^"([^"]+)"/m)?.[1];
  return `${nome ?? "programa desconhecido"} (PID ${pid})`;
}

async function examePorta() {
  if (!(await portaOcupada(PORTA))) {
    ok(`Porta ${PORTA}`, "livre (a taverna está desligada; o atalho liga)");
    return;
  }
  let taverna = false;
  try {
    // o servidor de desenvolvimento chega a levar vários segundos: prazo largo para não chamar a taverna de "outro programa"
    const r = await fetch(`http://127.0.0.1:${PORTA}/api/rede`, { signal: AbortSignal.timeout(12_000) });
    taverna = r.headers.get("x-taverna") === "1";
  } catch {
    taverna = false;
  }
  if (taverna) {
    ok(`Porta ${PORTA}`, "ocupada pela própria taverna (ela está no ar)");
  } else {
    const quem = quemUsaAPorta(PORTA);
    falhou(`Porta ${PORTA}`, `ocupada por outro programa${quem ? `: ${quem}` : ""}`, "feche esse programa (ou a janela antiga da taverna que travou) antes de abrir o atalho");
  }
}

function exameDependencias() {
  const nm = path.join(RAIZ, "node_modules");
  if (!ehPasta(nm)) {
    falhou("Dependências", "node_modules não existe", "abra o atalho (ele instala) ou rode npm ci");
    return;
  }
  const lock = path.join(RAIZ, "package-lock.json");
  if (!ehArquivo(lock)) {
    atencao("Dependências", "sem package-lock.json", "a pasta parece incompleta: baixe a taverna de novo");
    return;
  }
  const hash = createHash("sha256").update(readFileSync(lock)).digest("hex").toUpperCase();
  const marca = path.join(nm, ".taverna-lock");
  if (!ehArquivo(marca)) {
    atencao("Dependências", "instaladas sem a marca do atalho (node_modules/.taverna-lock)", "normal se foi instalado à mão; o atalho reinstala uma vez e grava a marca");
    return;
  }
  if (readFileSync(marca, "utf8").trim().toUpperCase() !== hash) {
    atencao("Dependências", "o package-lock mudou depois da última instalação", "o atalho reinstala sozinho (npm ci) na próxima vez");
  } else {
    ok("Dependências", "instaladas e iguais ao package-lock");
  }
}

/** O arquivo mais novo dentro das pastas (para quando passa da data do build). */
function maisNovoQue(limiteMs, pastas, arquivos) {
  for (const a of arquivos) {
    try {
      if (statSync(path.join(RAIZ, a)).mtimeMs > limiteMs) return a;
    } catch {
      // não existe: tudo bem
    }
  }
  const pilha = pastas.map((p) => path.join(RAIZ, p));
  while (pilha.length) {
    const atual = pilha.pop();
    let itens;
    try {
      itens = readdirSync(atual, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const it of itens) {
      const c = path.join(atual, it.name);
      if (it.isDirectory()) pilha.push(c);
      else {
        try {
          if (statSync(c).mtimeMs > limiteMs) return path.relative(RAIZ, c);
        } catch {
          // sumiu no meio da busca
        }
      }
    }
  }
  return null;
}

function exameBuild() {
  const id = path.join(RAIZ, ".next", "BUILD_ID");
  if (!ehArquivo(id)) {
    atencao("Compilação", "ainda não compilada (.next/BUILD_ID não existe)", "o atalho compila na primeira vez (alguns minutos)");
    return;
  }
  const data = statSync(id).mtime;
  const novo = maisNovoQue(data.getTime(), ["src", "mcp"], ["package.json", "package-lock.json", "next.config.ts"]);
  if (novo) {
    atencao("Compilação", `mais antiga que o código (${novo} mudou depois de ${data.toLocaleString("pt-BR")})`, "o atalho recompila sozinho na próxima vez");
  } else {
    ok("Compilação", `em dia (${data.toLocaleString("pt-BR")})`);
  }
}

function exameBanco() {
  const banco = process.env.TAVERNA_DB ? path.resolve(process.env.TAVERNA_DB) : path.join(RAIZ, "data", "taverna.db");
  if (!ehArquivo(banco)) {
    atencao("Banco", `ainda não existe (${path.relative(RAIZ, banco)})`, "ele nasce na primeira vez que a taverna abre");
    return;
  }
  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  const wal = ehArquivo(`${banco}-wal`) ? statSync(`${banco}-wal`).size : 0;
  ok("Banco", `${path.relative(RAIZ, banco)} · ${mb(statSync(banco).size)}${wal ? ` + ${mb(wal)} no -wal` : ""}`);
}

function exameGit() {
  if (!existsSync(path.join(RAIZ, ".git"))) {
    atencao("Git", "a pasta não tem .git (veio de um ZIP)", "as atualizações vão pedir o Git: o atualizar-taverna.cmd explica a migração");
    return;
  }
  const versao = rodar("git", ["--version"], { tempo: 5000 });
  if (versao.codigo !== 0) {
    atencao("Git", "não está instalado (ou não está no PATH)", "winget install Git.Git e abra o terminal de novo");
    return;
  }
  const git = (...args) => rodar("git", ["-C", RAIZ, ...args], { tempo: 15_000 });
  const commit = git("log", "-1", "--format=%h %cd", "--date=short").saida.trim();
  const alterados = git("status", "--porcelain", "--untracked-files=no")
    .saida.split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.slice(3));
  if (alterados.length) {
    atencao("Git", `${alterados.length} arquivo(s) alterado(s) à mão: ${alterados.slice(0, 5).join(", ")}${alterados.length > 5 ? "…" : ""}`, "a atualização recusa com arquivo alterado; o atualizar-taverna.cmd sugere o git stash");
  } else {
    ok("Git", `sem alterações locais · commit ${commit || "?"}`);
  }
  const upstream = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}");
  if (upstream.codigo !== 0) {
    atencao("Atualizações", "este ramo não acompanha nenhum remoto", "rode o atualizar-taverna.cmd para ver o que fazer");
    return;
  }
  const [remoto, ...resto] = upstream.saida.trim().split("/");
  const ramo = resto.join("/");
  let novidade = "";
  if (process.env.TAVERNA_DOUTOR_SEM_REDE !== "1") {
    const lr = rodar("git", ["-C", RAIZ, "ls-remote", remoto, `refs/heads/${ramo}`], { tempo: 15_000 });
    if (lr.codigo !== 0) {
      atencao("Atualizações", `não consegui falar com o remoto ${remoto} (sem internet?)`, "não impede de jogar; só de atualizar");
      return;
    }
    const hashRemoto = lr.saida.trim().split(/\s+/)[0];
    const hashConhecido = git("rev-parse", "@{u}").saida.trim();
    if (hashRemoto && hashConhecido && hashRemoto !== hashConhecido) novidade = "há novidades no GitHub";
  }
  const atras = Number(git("rev-list", "--count", "HEAD..@{u}").saida.trim() || 0);
  if (novidade || atras > 0) {
    atencao("Atualizações", [novidade, atras > 0 ? `${atras} commit(s) baixados e não aplicados` : ""].filter(Boolean).join("; "), "feche a taverna e rode o atualizar-taverna.cmd");
  } else {
    ok("Atualizações", `em dia com ${remoto}/${ramo}`);
  }
}

async function exameRede() {
  const rede = await importarDoApp("src/lib/rede/enderecos.ts");
  if (!rede) {
    atencao("Rede", "não consegui ler src/lib/rede/enderecos.ts", "confira o Node 24 acima");
    return;
  }
  const ips = rede.enderecosLocais();
  if (!ips.length) atencao("Rede", "nenhum endereço de Wi-Fi ou cabo", "os celulares só entram com o computador na mesma rede");
  else ok("Rede", `no Wi-Fi de casa: ${ips.map((e) => `http://${e.ip}:${PORTA} (${e.interfaceNome})`).join(" · ")}`);
  if (!ehWindows) return;
  const fw = await rede.conferirFirewall(PORTA);
  const redes = fw.categorias.length ? ` · rede ${fw.categorias.join(", ")}` : "";
  if (fw.estado === "ok") ok("Firewall", `${fw.motivo}${redes}`);
  else if (fw.estado === "bloqueado") {
    atencao(
      "Firewall",
      `os celulares não entram: ${fw.motivo}${redes}`,
      `o atalho pergunta e cria a regra; ou, num PowerShell como administrador: ${rede.comandoLiberarFirewall(PORTA)}${fw.categorias.includes("Public") ? ' (e marque a rede de casa como "Privada" nas configurações de rede do Windows)' : ""}`,
    );
  } else atencao("Firewall", `não deu para conferir (${fw.motivo})`);
}

// ---------- o exame ----------

const env = lerEnvLocal();
for (const [k, v] of Object.entries(env ?? {})) if (process.env[k] === undefined) process.env[k] = v;

escrever("Doutor da Taverna do Velho Mestre");
escrever(`Exame de ${new Date().toLocaleString("pt-BR")} · ${process.platform} ${process.arch} · porta ${PORTA}`);
escrever("");

const exames = [
  ["Node.js", exameNode],
  ["node:sqlite", null],
  ["Pasta", examePasta],
  [".env.local", () => exameEnv(env)],
];
let DatabaseSync = null;
for (const [nome, exame] of exames) {
  try {
    if (nome === "node:sqlite") DatabaseSync = await exameSqlite();
    else await exame();
  } catch (e) {
    atencao(nome, `o exame quebrou: ${e?.message ?? e}`);
  }
}
const ajustes = ajustesDoBanco(DatabaseSync);
let provedor = "cli";
try {
  provedor = exameProvedor(ajustes);
} catch (e) {
  atencao("Mestre", `o exame quebrou: ${e?.message ?? e}`);
}
for (const [nome, exame] of [
  ["Claude Code", () => exameClaude(ajustes, provedor)],
  [`Porta ${PORTA}`, examePorta],
  ["Dependências", exameDependencias],
  ["Compilação", exameBuild],
  ["Banco", exameBanco],
  ["Git", exameGit],
  ["Rede", exameRede],
]) {
  try {
    await exame();
  } catch (e) {
    atencao(nome, `o exame quebrou: ${e?.message ?? e}`);
  }
}

const conta = (n) => resultados.filter((r) => r.nivel === n).length;
escrever("");
escrever(`Resumo: ${conta("OK")} OK, ${conta("ATENÇÃO")} ATENÇÃO, ${conta("FALHOU")} FALHOU.`);
if (conta("FALHOU")) escrever("Resolva primeiro o que FALHOU (a seta → diz como); ATENÇÃO não impede de jogar.");

// grava o relatório em data/logs/doutor-<data>.txt (e apaga os de mais de 14 dias)
const pastaSaida = process.env.TAVERNA_DOUTOR_SAIDA ? path.resolve(process.env.TAVERNA_DOUTOR_SAIDA) : path.join(RAIZ, "data", "logs");
const arquivo = path.join(pastaSaida, `doutor-${diaLocal()}.txt`);
try {
  mkdirSync(pastaSaida, { recursive: true });
  const limite = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (const nome of readdirSync(pastaSaida)) {
    if (!/^doutor-\d{4}-\d{2}-\d{2}\.txt$/.test(nome)) continue;
    try {
      if (statSync(path.join(pastaSaida, nome)).mtimeMs < limite) unlinkSync(path.join(pastaSaida, nome));
    } catch {
      // aberto em outro programa: fica
    }
  }
  const mostrado = arquivo.toLowerCase().startsWith(RAIZ.toLowerCase() + path.sep) ? path.relative(RAIZ, arquivo) : arquivo;
  escrever(`Mande esta saída para quem instalou a taverna (ela também ficou em ${mostrado}).`);
  writeFileSync(arquivo, limparSegredos(saida.join("\r\n")) + "\r\n", "utf8");
} catch (e) {
  escrever(`Mande esta saída para quem instalou a taverna (não consegui gravar ${arquivo}: ${e?.message ?? e}).`);
}
// npm mostra um erro feio quando o script sai com código diferente de 0: o código só muda com --codigo (para outros scripts)
if (process.argv.includes("--codigo") && conta("FALHOU")) process.exitCode = 1;
