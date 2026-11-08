// W24: log em arquivo (src/lib/log.ts), registro das chamadas ao Claude Code (provedor-cli.ts) sem o prompt, leitura do
// estado do firewall (src/lib/rede/enderecos.ts) e o doutor (scripts/doutor.mjs) com variáveis quebradas.
//   node --test --import ./tests/_suporte/registrar.mjs tests/w24-log-e-doutor.test.ts
// Nada aqui encosta em data/: os logs vão para uma pasta temporária (TAVERNA_LOGS) e o doutor grava em TAVERNA_DOUTOR_SAIDA.
// O "Claude Code" é um script falso (claude.cmd → falso.js) que responde em stream-json; nenhum plano é gasto.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

const PASTA = mkdtempSync(path.join(tmpdir(), "taverna-w24-"));
const LOGS = path.join(PASTA, "logs");
process.env.TAVERNA_LOGS = LOGS;

const log = await import("../src/lib/log");
const rede = await import("../src/lib/rede/enderecos");

after(() => rmSync(PASTA, { recursive: true, force: true }));

function linhasDeHoje(): Record<string, unknown>[] {
  const arquivo = log.arquivoDoDia();
  if (!existsSync(arquivo)) return [];
  return readFileSync(arquivo, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// ---------- log.ts ----------

test("registrar grava uma linha JSON no arquivo do dia, sem prompt, sem chave e sem e-mail", () => {
  const antes = linhasDeHoje().length;
  const linha = log.registrar("erro", "teste", {
    campanhaId: 7,
    prompt: "SEGREDO DO PROMPT",
    sistema: "SEGREDO DO SISTEMA",
    detalhe: "falhou com sk-ant-api03-abcdefghijklmnop e fulano@exemplo.com.br",
    erro: new Error("quebrou para beltrano@x.io"),
  });
  assert.equal(linha.nivel, "erro");
  const todas = linhasDeHoje();
  assert.equal(todas.length, antes + 1);
  const gravada = todas.at(-1)!;
  assert.equal(gravada.origem, "teste");
  assert.equal(gravada.campanhaId, 7);
  assert.equal("prompt" in gravada, false);
  assert.equal("sistema" in gravada, false);
  const bruto = readFileSync(log.arquivoDoDia(), "utf8");
  assert.doesNotMatch(bruto, /SEGREDO/);
  assert.doesNotMatch(bruto, /abcdefghijklmnop/);
  assert.doesNotMatch(bruto, /fulano@|beltrano@/);
  assert.match(String(gravada.detalhe), /chave oculta/);
  assert.match(String((gravada.erro as { mensagem: string }).mensagem), /e-mail oculto/);
  assert.ok((gravada.erro as { pilha?: string }).pilha, "erro leva a pilha");
});

test("limparSegredos tira a ANTHROPIC_API_KEY do ambiente mesmo sem o prefixo conhecido", () => {
  const antes = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "chave-esquisita-1234567890";
  try {
    assert.equal(log.limparSegredos("a chave-esquisita-1234567890 vazou"), "a (chave oculta) vazou");
  } finally {
    if (antes === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = antes;
  }
});

test("podarLogs apaga só taverna-*.log e doutor-*.txt com mais de 14 dias", () => {
  const pasta = path.join(PASTA, "poda");
  mkdirSync(pasta, { recursive: true });
  const velho = Date.now() / 1000 - 20 * 24 * 3600;
  for (const nome of ["taverna-2020-01-01.log", "doutor-2020-01-01.txt", "atalho-2020-01-01.log", "taverna-2099-01-01.log"]) {
    writeFileSync(path.join(pasta, nome), "x");
    if (!nome.includes("2099")) utimesSync(path.join(pasta, nome), velho, velho);
  }
  assert.equal(log.podarLogs(Date.now(), pasta), 2);
  // o do atalho é podado pelo próprio atalho (iniciar-taverna.ps1); o recente fica
  assert.deepEqual(readdirSync(pasta).sort(), ["atalho-2020-01-01.log", "taverna-2099-01-01.log"]);
});

test("ultimasLinhas junta os arquivos do mais novo para trás e devolve na ordem", () => {
  const pasta = path.join(PASTA, "ultimas");
  mkdirSync(pasta, { recursive: true });
  writeFileSync(path.join(pasta, "taverna-2026-01-01.log"), "a1\na2\na3\n");
  writeFileSync(path.join(pasta, "taverna-2026-01-02.log"), "b1\nb2\n");
  assert.deepEqual(log.ultimasLinhas(3, pasta), ["a3", "b1", "b2"]);
  assert.deepEqual(log.ultimasLinhas(10, pasta), ["a1", "a2", "a3", "b1", "b2"]);
  assert.deepEqual(log.ultimasLinhas(0, pasta), []);
});

// ---------- provedor-cli.ts com um Claude Code falso ----------

const FALSO = path.join(PASTA, "claude-falso");

before(() => {
  mkdirSync(FALSO, { recursive: true });
  // responde --version, e no -p lê o stdin inteiro e devolve um stream-json mínimo (ou falha, conforme FALSO_MODO)
  writeFileSync(
    path.join(FALSO, "falso.js"),
    `const a = process.argv.slice(2);
if (a.includes("--version")) { console.log("2.1.316 (Claude Code)"); process.exit(0); }
let entrada = "";
process.stdin.on("data", (c) => (entrada += c));
process.stdin.on("end", () => {
  process.stderr.write("aviso do falso: sk-ant-api03-zzzzzzzzzzzzzzzz e dono@exemplo.com\\n");
  if (process.env.FALSO_MODO === "quebra") {
    process.stderr.write("x".repeat(2000) + " FIM-DO-STDERR\\n");
    process.exit(3);
  }
  const ev = (o) => process.stdout.write(JSON.stringify(o) + "\\n");
  ev({ type: "system", subtype: "init" });
  ev({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "Olá" } } });
  ev({ type: "result", subtype: "success", is_error: false, result: "Olá, viajante (" + entrada.length + ")", num_turns: 1, usage: { input_tokens: 1, output_tokens: 1 } });
  process.exit(0);
});
`,
  );
  // claude.cmd no formato do npm: a taverna traduz para node + falso.js (sem shell)
  writeFileSync(path.join(FALSO, "claude.cmd"), `@ECHO off\r\nnode "%~dp0\\falso.js" %*\r\n`);
});

const ehWindows = process.platform === "win32";

test("cada chamada ao Claude Code registra início e fim com versão, flags, duração, código e stderr, e nunca o prompt", { skip: !ehWindows && "o falso usa claude.cmd" }, async () => {
  const { criarProvedorCli } = await import("../src/lib/mestre/provedor-cli");
  const antes = linhasDeHoje().length;
  const provedor = criarProvedorCli({ bin: path.join(FALSO, "claude.cmd"), modelo: "sonnet" });
  const texto = await provedor.texto({ sistema: "SISTEMA-SECRETO-DO-MESTRE", prompt: "PROMPT-SECRETO-DO-JOGADOR" });
  assert.match(texto, /Olá, viajante/);

  const novas = linhasDeHoje().slice(antes).filter((l) => l.origem === "mestre-cli");
  const inicio = novas.find((l) => l.evento === "início");
  const fim = novas.find((l) => l.evento === "fim");
  assert.ok(inicio && fim, "tem início e fim");
  assert.equal(inicio.chamada, fim.chamada);
  assert.equal(fim.versao, "2.1.316");
  assert.equal(fim.codigo, 0);
  assert.equal(fim.subtype, "success");
  assert.equal(fim.eventos, 3);
  assert.equal(typeof fim.duracaoMs, "number");
  assert.equal(inicio.modelo, "sonnet");
  const flags = inicio.flags as string[];
  assert.ok(flags.includes("-p") && flags.includes("stream-json") && flags.includes("--model"));
  assert.ok(flags.includes("(arquivo temporário)"), "o caminho do system prompt vira um rótulo");
  assert.match(String(fim.stderr), /aviso do falso/);
  const bruto = readFileSync(log.arquivoDoDia(), "utf8");
  assert.doesNotMatch(bruto, /SECRETO/);
  assert.doesNotMatch(bruto, /zzzzzzzzzzzz|dono@exemplo/);
});

test("quando o Claude Code quebra, o fim vai como erro com o stderr inteiro (não só 500 caracteres)", { skip: !ehWindows && "o falso usa claude.cmd" }, async () => {
  const { criarProvedorCli } = await import("../src/lib/mestre/provedor-cli");
  const antes = linhasDeHoje().length;
  process.env.FALSO_MODO = "quebra";
  try {
    const provedor = criarProvedorCli({ bin: path.join(FALSO, "claude.cmd") });
    await assert.rejects(provedor.texto({ sistema: "s", prompt: "p" }), /terminou sem resposta \(código 3\)/);
  } finally {
    delete process.env.FALSO_MODO;
  }
  const fim = linhasDeHoje()
    .slice(antes)
    .find((l) => l.origem === "mestre-cli" && l.evento === "fim");
  assert.ok(fim);
  assert.equal(fim.nivel, "erro");
  assert.equal(fim.codigo, 3);
  assert.match(String(fim.stderr), /FIM-DO-STDERR/);
  assert.ok(String(fim.stderr).length > 2000);
  assert.match(String(fim.erro), /código 3/);
});

test("executável que não existe também deixa rastro no log", async () => {
  const { criarProvedorCli } = await import("../src/lib/mestre/provedor-cli");
  const antes = linhasDeHoje().length;
  const salvo = { ...process.env };
  // sem nenhum lugar para achar outro Claude Code
  Object.assign(process.env, { USERPROFILE: PASTA, LOCALAPPDATA: PASTA, APPDATA: PASTA, PATH: path.dirname(process.execPath), HOME: PASTA });
  try {
    await assert.rejects(criarProvedorCli({ bin: path.join(PASTA, "nao-existe", "claude.exe") }).texto({ sistema: "s", prompt: "p" }));
  } finally {
    for (const k of ["USERPROFILE", "LOCALAPPDATA", "APPDATA", "PATH", "HOME"]) {
      if (salvo[k] === undefined) delete process.env[k];
      else process.env[k] = salvo[k];
    }
  }
  const linha = linhasDeHoje()
    .slice(antes)
    .find((l) => l.origem === "mestre-cli");
  assert.ok(linha);
  assert.equal(linha.etapa, "achar o executável");
});

// ---------- firewall (só a leitura da resposta; a conferência de verdade é só leitura e roda no doutor) ----------

test("lerSaidaFirewall entende a linha do PowerShell e desconfia do resto", () => {
  assert.deepEqual(rede.lerSaidaFirewall("ok|node.exe liberado|Public\r\n"), { estado: "ok", motivo: "node.exe liberado", categorias: ["Public"] });
  assert.deepEqual(rede.lerSaidaFirewall("lixo\nbloqueado|nenhuma regra libera a porta nesta rede|Private,Public"), {
    estado: "bloqueado",
    motivo: "nenhuma regra libera a porta nesta rede",
    categorias: ["Private", "Public"],
  });
  assert.equal(rede.lerSaidaFirewall("").estado, "desconhecido");
  assert.equal(rede.lerSaidaFirewall("Get-NetConnectionProfile: acesso negado").estado, "desconhecido");
});

test("o script do firewall é só leitura e procura a regra da taverna e a do node.exe", () => {
  const s = rede.scriptFirewall(3300);
  assert.match(s, /Get-NetFirewallRule -DisplayName 'Taverna do Velho Mestre \(3300\)'/);
  assert.match(s, /-like '\*\\node\.exe'/);
  assert.doesNotMatch(s, /New-NetFirewallRule|Set-NetFirewall|Remove-NetFirewall|netsh/i);
  assert.equal(rede.comandoLiberarFirewall(3300).startsWith('New-NetFirewallRule -DisplayName "Taverna do Velho Mestre (3300)"'), true);
});

// ---------- doutor ----------

const DOUTOR = path.resolve(import.meta.dirname, "..", "scripts", "doutor.mjs");

function rodarDoutor(env: Record<string, string>) {
  const saida = path.join(PASTA, `doutor-${Math.random().toString(36).slice(2)}`);
  const r = spawnSync(process.execPath, [DOUTOR], {
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, NO_COLOR: "1", TAVERNA_DOUTOR_SEM_REDE: "1", TAVERNA_DOUTOR_SAIDA: saida, ...env },
  });
  const arquivos = existsSync(saida) ? readdirSync(saida) : [];
  return { codigo: r.status, texto: r.stdout, arquivos, saida };
}

function portaLivre(): Promise<number> {
  return new Promise((ok) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => ok(p));
    });
  });
}

test("doutor sem Claude Code e com a porta ocupada por outro programa: FALHOU em português e arquivo gravado", async () => {
  const ocupante = createServer((s) => s.end());
  await new Promise<void>((ok) => ocupante.listen(0, "127.0.0.1", () => ok()));
  const porta = (ocupante.address() as { port: number }).port;
  try {
    const r = rodarDoutor({
      TAVERNA_PORTA: String(porta),
      TAVERNA_PROVEDOR: "cli",
      CLAUDE_BIN: path.join(PASTA, "nao-existe", "claude.exe"),
      // nenhum outro lugar onde achar o Claude Code
      USERPROFILE: PASTA,
      LOCALAPPDATA: PASTA,
      APPDATA: PASTA,
      HOME: PASTA,
      PATH: [path.dirname(process.execPath), process.env.SystemRoot ? path.join(process.env.SystemRoot, "System32") : ""].filter(Boolean).join(path.delimiter),
    });
    assert.equal(r.codigo, 0, "sem --codigo o doutor sai com 0 (o npm não mostra erro feio)");
    assert.match(r.texto, /^Doutor da Taverna do Velho Mestre/m);
    assert.match(r.texto, /^OK {7}Node\.js: v\d+/m);
    assert.match(r.texto, /^ATENÇÃO {2}Claude Code: o executável configurado \(CLAUDE_BIN\) não existe/m);
    assert.match(r.texto, /^FALHOU {3}Claude Code: não encontrado nesta máquina/m);
    assert.match(r.texto, new RegExp(`^FALHOU {3}Porta ${porta}: ocupada por outro programa`, "m"));
    assert.match(r.texto, /^Resumo: \d+ OK, \d+ ATENÇÃO, [1-9]\d* FALHOU\./m);
    assert.match(r.texto, /Mande esta saída para quem instalou/);
    assert.equal(r.arquivos.length, 1);
    assert.match(r.arquivos[0], /^doutor-\d{4}-\d{2}-\d{2}\.txt$/);
    const gravado = readFileSync(path.join(r.saida, r.arquivos[0]), "utf8");
    assert.match(gravado, /FALHOU {3}Porta/);
  } finally {
    ocupante.close();
  }
});

test("doutor com mestre da API sem chave reclama e nunca imprime a chave", async () => {
  const porta = await portaLivre();
  const r = rodarDoutor({ TAVERNA_PORTA: String(porta), TAVERNA_PROVEDOR: "api", ANTHROPIC_API_KEY: "" });
  assert.match(r.texto, /^FALHOU {3}Mestre: api .*sem ANTHROPIC_API_KEY/m);
  assert.match(r.texto, new RegExp(`^OK {7}Porta ${porta}: livre`, "m"));

  const comChave = rodarDoutor({ TAVERNA_PORTA: String(porta), TAVERNA_PROVEDOR: "api", ANTHROPIC_API_KEY: "sk-ant-api03-NAOPODEAPARECER123" });
  assert.match(comChave.texto, /^OK {7}Mestre: api .*chave presente/m);
  assert.doesNotMatch(comChave.texto, /NAOPODEAPARECER/);
  assert.doesNotMatch(readFileSync(path.join(comChave.saida, comChave.arquivos[0]), "utf8"), /NAOPODEAPARECER/);
});
