import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const RAIZ = process.cwd();
const { anuncioDaNarracao } = (await import(pathToFileURL(path.join(RAIZ, "src/lib/anuncio-narracao.ts")).href)) as {
  anuncioDaNarracao: (texto: string, limite?: number) => string;
};

test("texto vazio vira só o aviso", () => {
  assert.equal(anuncioDaNarracao(""), "O mestre respondeu.");
  assert.equal(anuncioDaNarracao("  \n  "), "O mestre respondeu.");
  assert.equal(anuncioDaNarracao("***"), "O mestre respondeu.");
});

test("texto curto vai inteiro depois do aviso", () => {
  assert.equal(anuncioDaNarracao("A porta range."), "O mestre respondeu. A porta range.");
});

test("a marcação some e os espaços se juntam", () => {
  assert.equal(
    anuncioDaNarracao("# A taverna\n\n> *O taverneiro* limpa   um `copo` e __resmunga__."),
    "O mestre respondeu. A taverna O taverneiro limpa um copo e resmunga.",
  );
});

test("texto comprido é cortado no limite sem partir palavra", () => {
  const texto = "palavra ".repeat(60).trim();
  const anuncio = anuncioDaNarracao(texto);
  const trecho = anuncio.slice("O mestre respondeu. ".length);
  assert.ok(trecho.endsWith("…"));
  assert.ok(trecho.length <= 161, `trecho com ${trecho.length}`);
  assert.ok(trecho.slice(0, -1).split(" ").every((p) => p === "palavra"));
});

test("o limite é configurável e o corte não deixa pontuação pendurada", () => {
  assert.equal(anuncioDaNarracao("O dragão acorda, furioso com a visita", 16), "O mestre respondeu. O dragão acorda…");
  assert.equal(anuncioDaNarracao("O dragão acorda, furioso", 24), "O mestre respondeu. O dragão acorda, furioso");
});

test("palavra maior que o limite é cortada no limite mesmo", () => {
  assert.equal(anuncioDaNarracao("a".repeat(50), 10), `O mestre respondeu. ${"a".repeat(10)}…`);
});
