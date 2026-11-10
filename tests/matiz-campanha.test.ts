import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G15: matiz dos cartões da home (lógica pura).

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { MATIZES, matizDaCampanha, matizDaPosicao } = await import(pathToFileURL(path.join(RAIZ, "src/lib/inicio/matiz-campanha.ts")).href);

describe("matiz da campanha", () => {
  it("são oito classes, de matiz-1 a matiz-8", () => {
    assert.deepEqual([...MATIZES], [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `matiz-${n}`));
  });

  it("é estável para o mesmo id", () => {
    assert.equal(matizDaCampanha(42, "historia"), matizDaCampanha(42, "historia"));
    assert.equal(matizDaCampanha(3, "historia"), "matiz-4");
  });

  it("ids seguidos cobrem os oito valores", () => {
    const vistos = new Set(Array.from({ length: 8 }, (_, i) => matizDaCampanha(100 + i, "historia")));
    assert.equal(vistos.size, 8);
    for (const m of vistos) assert.ok(MATIZES.includes(m), String(m));
  });

  it("fora do modo história não há matiz (o tema do sistema colore)", () => {
    assert.equal(matizDaCampanha(7, "dnd5e"), "");
    assert.equal(matizDaCampanha(7, ""), "");
  });

  it("id negativo ou quebrado não quebra", () => {
    assert.ok(MATIZES.includes(matizDaCampanha(-5, "historia")));
    assert.equal(matizDaCampanha(-5, "historia"), matizDaCampanha(5, "historia"));
    assert.ok(MATIZES.includes(matizDaCampanha(Number.NaN, "historia")));
  });

  it("a posição dá a volta depois da oitava", () => {
    assert.equal(matizDaPosicao(0), "matiz-1");
    assert.equal(matizDaPosicao(7), "matiz-8");
    assert.equal(matizDaPosicao(8), "matiz-1");
  });
});
