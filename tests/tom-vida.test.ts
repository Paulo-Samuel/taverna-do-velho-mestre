import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// F04: a barra de vida do rodapé do modo história (contas puras).

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { tomDaVida, faixaDaVida, porcentoDaVida } = await import(pathToFileURL(path.join(RAIZ, "src/components/historia/tom-vida.ts")).href);

describe("tomDaVida", () => {
  it("perda, ganho e igual", () => {
    assert.equal(tomDaVida(10, 7), "perdeu");
    assert.equal(tomDaVida(7, 10), "ganhou");
    assert.equal(tomDaVida(7, 7), null);
  });
  it("o primeiro valor visto não lampeja", () => {
    assert.equal(tomDaVida(null, 12), null);
    assert.equal(tomDaVida(null, 0), null);
  });
  it("zero conta como valor (não como ausência)", () => {
    assert.equal(tomDaVida(0, 3), "ganhou");
    assert.equal(tomDaVida(3, 0), "perdeu");
  });
});

describe("faixaDaVida", () => {
  it("limites de 50% e 20%", () => {
    assert.equal(faixaDaVida(51, 100), "boa");
    assert.equal(faixaDaVida(50, 100), "media");
    assert.equal(faixaDaVida(21, 100), "media");
    assert.equal(faixaDaVida(20, 100), "ruim");
    assert.equal(faixaDaVida(0, 100), "ruim");
    assert.equal(faixaDaVida(10, 10), "boa");
  });
  it("máximo zerado ou negativo dá boa", () => {
    assert.equal(faixaDaVida(0, 0), "boa");
    assert.equal(faixaDaVida(5, 0), "boa");
    assert.equal(faixaDaVida(5, -3), "boa");
  });
  it("pv negativo e acima do máximo", () => {
    assert.equal(faixaDaVida(-4, 20), "ruim");
    assert.equal(faixaDaVida(35, 20), "boa");
  });
});

describe("porcentoDaVida", () => {
  it("inteiro de 0 a 100", () => {
    assert.equal(porcentoDaVida(7, 10), 70);
    assert.equal(porcentoDaVida(1, 3), 33);
    assert.equal(porcentoDaVida(2, 3), 67);
    assert.equal(porcentoDaVida(10, 10), 100);
    assert.equal(porcentoDaVida(0, 10), 0);
  });
  it("máximo zerado dá 0", () => {
    assert.equal(porcentoDaVida(5, 0), 0);
    assert.equal(porcentoDaVida(0, 0), 0);
  });
  it("pv negativo e acima do máximo ficam presos na faixa", () => {
    assert.equal(porcentoDaVida(-4, 20), 0);
    assert.equal(porcentoDaVida(35, 20), 100);
  });
});
