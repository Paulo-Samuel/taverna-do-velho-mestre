// Testes do módulo puro que acha e confere o Claude Code (sem Next, sem "server-only").
// Rodar: node --test tests/claude-bin.test.ts
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

// import dinâmico com URL: o Node resolve o .ts direto e o tsc não reclama da extensão
type ClaudeBin = typeof import("../src/lib/mestre/claude-bin");
const bin: ClaudeBin = await import(new URL("../src/lib/mestre/claude-bin.ts", import.meta.url).href);

const {
  CLAUDE_VERSAO_MINIMA,
  CLAUDE_VERSAO_TESTADA,
  avisoDeVersao,
  compararVersoes,
  descobrirClaudeDesktop,
  erroDeCompatibilidade,
  escolherMaiorVersao,
  extrairVersao,
  ordenarAchadosWhere,
  pastaClaudeCodeDe,
  resolverShimNpm,
  situacaoDaVersao,
} = bin;

const temporarios: string[] = [];
function pastaTemporaria() {
  const p = mkdtempSync(path.join(tmpdir(), "taverna-claude-bin-"));
  temporarios.push(p);
  return p;
}
function arquivo(caminho: string, conteudo = "") {
  mkdirSync(path.dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
  return caminho;
}
after(() => {
  for (const p of temporarios) rmSync(p, { recursive: true, force: true });
});

describe("compararVersoes", () => {
  it("compara numericamente, não como texto", () => {
    assert.equal(compararVersoes("2.1.45", "2.1.316"), -1);
    assert.equal(compararVersoes("2.1.316", "2.1.45"), 1);
    assert.equal(compararVersoes("2.1.9", "2.1.10"), -1);
    assert.equal(compararVersoes("10.0.0", "9.9.9"), 1);
  });
  it("trata segmentos faltando como zero e ignora prefixo v e sufixos", () => {
    assert.equal(compararVersoes("2.1", "2.1.0"), 0);
    assert.equal(compararVersoes("v2.1.317", "2.1.317"), 0);
    assert.equal(compararVersoes("2.1.317-beta", "2.1.317"), 0);
    assert.equal(compararVersoes("2.2", "2.1.999"), 1);
  });
  it("as constantes fazem sentido entre si", () => {
    assert.equal(compararVersoes(CLAUDE_VERSAO_MINIMA, CLAUDE_VERSAO_TESTADA), -1);
  });
});

describe("extrairVersao e situação", () => {
  it("tira o número do texto do --version", () => {
    assert.equal(extrairVersao("2.1.317 (Claude Code)"), "2.1.317");
    assert.equal(extrairVersao("v2.0.40"), "2.0.40");
    assert.equal(extrairVersao("sem número"), null);
    assert.equal(extrairVersao(null), null);
  });
  it("classifica desatualizado / mais novo que o testado", () => {
    assert.deepEqual(situacaoDaVersao("2.0.40"), { desatualizado: true, maisNovoQueTestado: false });
    assert.deepEqual(situacaoDaVersao(CLAUDE_VERSAO_TESTADA), { desatualizado: false, maisNovoQueTestado: false });
    assert.deepEqual(situacaoDaVersao("2.1.317 (Claude Code)"), { desatualizado: false, maisNovoQueTestado: true });
    assert.deepEqual(situacaoDaVersao(null), { desatualizado: false, maisNovoQueTestado: false });
  });
  it("monta o aviso em português", () => {
    const velho = avisoDeVersao("2.0.40");
    assert.equal(velho?.tipo, "desatualizado");
    assert.match(velho!.texto, /2\.0\.40 é mais antigo que o mínimo 2\.1\.45/);
    assert.match(velho!.texto, /claude update/);
    const novo = avisoDeVersao("2.1.400");
    assert.equal(novo?.tipo, "mais-novo");
    assert.match(novo!.texto, new RegExp(CLAUDE_VERSAO_TESTADA.replace(/\./g, "\\.")));
    assert.equal(avisoDeVersao(CLAUDE_VERSAO_MINIMA), null);
  });
});

describe("erroDeCompatibilidade", () => {
  it("traduz unknown option citando flag, versão e versão testada", () => {
    const msg = erroDeCompatibilidade("error: unknown option '--flag-inexistente'\n", "2.0.40 (Claude Code)");
    assert.ok(msg);
    assert.match(msg!, /Erro de compatibilidade/);
    assert.match(msg!, /seu Claude Code 2\.0\.40 não aceita a opção --flag-inexistente/);
    assert.match(msg!, /claude update/);
    assert.match(msg!, new RegExp(`testada com ${CLAUDE_VERSAO_TESTADA.replace(/\./g, "\\.")}`));
  });
  it("também cobre unknown command e versão desconhecida", () => {
    const msg = erroDeCompatibilidade("error: unknown command 'auth'", null);
    assert.match(msg!, /seu Claude Code não aceita o comando auth/);
  });
  it("devolve null para outros erros", () => {
    assert.equal(erroDeCompatibilidade("Not logged in", "2.1.316"), null);
    assert.equal(erroDeCompatibilidade("", "2.1.316"), null);
  });
});

describe("escolherMaiorVersao", () => {
  it("escolhe a maior versão pelo nome da pasta", () => {
    assert.equal(escolherMaiorVersao(["2.1.309", "2.1.317", "2.1.45"]), "2.1.317");
    assert.equal(escolherMaiorVersao(["2.1.9", "2.1.10"]), "2.1.10");
  });
  it("ignora pastas que não parecem versão", () => {
    assert.equal(escolherMaiorVersao(["cache", "2.1.309", "logs"]), "2.1.309");
    assert.equal(escolherMaiorVersao(["cache", "logs"]), null);
    assert.equal(escolherMaiorVersao([]), null);
  });
});

describe("ordenarAchadosWhere", () => {
  it("prefere .exe, depois .cmd, e ignora o shim sem extensão", () => {
    const achados = ["C:\\Users\\x\\AppData\\Roaming\\npm\\claude", "C:\\Users\\x\\AppData\\Roaming\\npm\\claude.cmd", "C:\\Users\\x\\.local\\bin\\claude.exe"];
    assert.deepEqual(ordenarAchadosWhere(achados), ["C:\\Users\\x\\.local\\bin\\claude.exe", "C:\\Users\\x\\AppData\\Roaming\\npm\\claude.cmd"]);
  });
  it("mantém a ordem original dentro de cada grupo e limpa linhas vazias", () => {
    assert.deepEqual(ordenarAchadosWhere(["a\\claude.cmd", "", "b\\claude.exe\r", "c\\claude.exe", "d\\claude"]), ["b\\claude.exe", "c\\claude.exe", "a\\claude.cmd"]);
    assert.deepEqual(ordenarAchadosWhere(["x\\claude"]), []);
  });
});

describe("descobrirClaudeDesktop (pastas simuladas)", () => {
  it("acha o claude.exe da maior versão a partir da raiz Claude-Data", () => {
    const raiz = pastaTemporaria();
    const app = path.join(raiz, "claude_pzs8sxrjxfjjc", "claude-code");
    arquivo(path.join(app, "2.1.309", "9078b9c1d466", "claude.exe"));
    const esperado = arquivo(path.join(app, "2.1.317", "a33aa5518497", "claude.exe"));
    arquivo(path.join(app, "2.1.50", "aaaa", "claude.exe"));
    mkdirSync(path.join(app, "2.1.400"), { recursive: true }); // versão em download, sem executável ainda
    assert.equal(descobrirClaudeDesktop(raiz, "claude.exe"), esperado);
  });
  it("também parte da pasta claude-code, da pasta da versão ou da própria pasta do exe", () => {
    const raiz = pastaTemporaria();
    const app = path.join(raiz, "claude_abc", "claude-code");
    arquivo(path.join(app, "2.1.9", "h1", "claude.exe"));
    const esperado = arquivo(path.join(app, "2.1.10", "h2", "claude.exe"));
    assert.equal(descobrirClaudeDesktop(app, "claude.exe"), esperado);
    assert.equal(descobrirClaudeDesktop(path.join(app, "2.1.10"), "claude.exe"), esperado);
    assert.equal(descobrirClaudeDesktop(path.join(app, "2.1.10", "h2"), "claude.exe"), esperado);
  });
  it("devolve null quando não há executável, a raiz não existe ou é um arquivo", () => {
    const raiz = pastaTemporaria();
    mkdirSync(path.join(raiz, "claude_x", "claude-code", "2.1.1"), { recursive: true });
    assert.equal(descobrirClaudeDesktop(raiz, "claude.exe"), null);
    assert.equal(descobrirClaudeDesktop(path.join(raiz, "nao-existe"), "claude.exe"), null);
    assert.equal(descobrirClaudeDesktop(arquivo(path.join(raiz, "um-arquivo.txt")), "claude.exe"), null);
    assert.equal(descobrirClaudeDesktop("", "claude.exe"), null);
  });
});

describe("pastaClaudeCodeDe", () => {
  it("devolve a pasta claude-code de um caminho versionado do app", () => {
    const r = pastaClaudeCodeDe("C:\\Users\\p\\AppData\\Local\\Claude-Data\\claude_abc\\claude-code\\2.1.308\\c17a\\claude.exe");
    assert.equal(r, ["C:", "Users", "p", "AppData", "Local", "Claude-Data", "claude_abc", "claude-code"].join(path.sep));
  });
  it("null para caminhos de outra natureza", () => {
    assert.equal(pastaClaudeCodeDe("C:\\Users\\p\\.local\\bin\\claude.exe"), null);
  });
});

describe("resolverShimNpm", () => {
  it("resolve o claude.cmd do npm para o claude.exe real, sem shell", () => {
    const npm = pastaTemporaria();
    const exe = arquivo(path.join(npm, "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe"));
    const cmd = arquivo(
      path.join(npm, "claude.cmd"),
      '@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\n"%dp0%\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe"   %*\r\n',
    );
    assert.deepEqual(resolverShimNpm(cmd, "C:\\node.exe"), { comando: exe, args: [], caminho: exe });
  });
  it("shim que aponta para cli.js vira node + cli.js, identificado pelo próprio .cmd", () => {
    const npm = pastaTemporaria();
    const cli = arquivo(path.join(npm, "node_modules", "@anthropic-ai", "claude-code", "cli.js"));
    const cmd = arquivo(
      path.join(npm, "claude.cmd"),
      '@IF EXIST "%~dp0\\node.exe" (\r\n  "%~dp0\\node.exe"  "%~dp0\\node_modules\\@anthropic-ai\\claude-code\\cli.js" %*\r\n) ELSE (\r\n  node  "%~dp0\\node_modules\\@anthropic-ai\\claude-code\\cli.js" %*\r\n)\r\n',
    );
    assert.deepEqual(resolverShimNpm(cmd, "C:\\node.exe"), { comando: "C:\\node.exe", args: [cli], caminho: cmd });
  });
  it("null quando o alvo não existe, o arquivo não é .cmd ou não tem a cara de shim", () => {
    const npm = pastaTemporaria();
    const cmd = arquivo(path.join(npm, "claude.cmd"), '"%dp0%\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe" %*\r\n');
    assert.equal(resolverShimNpm(cmd, "C:\\node.exe"), null);
    assert.equal(resolverShimNpm(arquivo(path.join(npm, "claude.exe")), "C:\\node.exe"), null);
    assert.equal(resolverShimNpm(arquivo(path.join(npm, "outro.cmd"), "@echo oi\r\n"), "C:\\node.exe"), null);
    assert.equal(resolverShimNpm(path.join(npm, "nao-existe.cmd"), "C:\\node.exe"), null);
  });
});
