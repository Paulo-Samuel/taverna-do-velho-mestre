import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G06: a capa da aventura é determinística (mesmo id e sistema, mesma arte) e varia de uma aventura para outra.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { gerarCapa, semente } = await import(pathToFileURL(path.join(RAIZ, "src/lib/aventuras/capa-arte.ts")).href);

describe("capa da aventura", () => {
  it("mesmo id e sistema dão o mesmo resultado", () => {
    assert.deepEqual(gerarCapa("noite-longa", "vtm5"), gerarCapa("noite-longa", "vtm5"));
    assert.equal(semente("abc"), semente("abc"));
  });
  it("ids diferentes dão resultados diferentes", () => {
    const a = gerarCapa("noite-longa", "vtm5");
    const b = gerarCapa("outra-noite", "vtm5");
    assert.notEqual(a.semente, b.semente);
    assert.notDeepEqual(a, b);
  });
  it("o sistema escolhe a silhueta e o mesmo id em outro sistema muda a arte", () => {
    assert.equal(gerarCapa("x", "vtm5").motivo, "lua");
    assert.equal(gerarCapa("x", "dnd5e").motivo, "espada");
    assert.equal(gerarCapa("x", "sistema-novo").motivo, "estrela");
    assert.notEqual(gerarCapa("x", "vtm5").semente, gerarCapa("x", "dnd5e").semente);
  });
  it("gera números finitos para todos os motivos", () => {
    for (const sis of ["historia", "dnd5e", "pf2e", "pf1e", "osr", "d100", "fate", "pbta", "vtm5"]) {
      const c = gerarCapa("qualquer", sis);
      assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(c)), sis);
      assert.ok(c.brilho >= 0 && c.brilho <= 100);
    }
  });
});
