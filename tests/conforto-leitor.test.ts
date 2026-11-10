import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// Conforto de leitura (F06): passos de largura da coluna e de entrelinha, validados antes de virar variável de CSS.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { COLUNAS, ENTRELINHAS, PASSO_PADRAO, passoValido } = await import(pathToFileURL(path.join(RAIZ, "src/components/leitor/conforto.ts")).href);

describe("conforto do leitor", () => {
  it("o padrão é o passo do meio e não muda nada do que já existia", () => {
    assert.equal(PASSO_PADRAO, 1);
    assert.equal(COLUNAS[PASSO_PADRAO].fator, 1);
    assert.equal(ENTRELINHAS[PASSO_PADRAO].valor, null);
  });

  it("as listas têm três passos em ordem crescente", () => {
    assert.deepEqual(COLUNAS.map((c: { rotulo: string }) => c.rotulo), ["Estreita", "Média", "Larga"]);
    assert.deepEqual(ENTRELINHAS.map((e: { rotulo: string }) => e.rotulo), ["Justa", "Confortável", "Folgada"]);
    assert.ok(COLUNAS[0].fator < COLUNAS[1].fator && COLUNAS[1].fator < COLUNAS[2].fator);
    assert.ok(ENTRELINHAS[0].valor < 1.74 && ENTRELINHAS[2].valor > 1.76);
  });

  it("aceita os passos válidos", () => {
    for (let i = 0; i < 3; i++) assert.equal(passoValido(i, 3), i);
    assert.equal(passoValido(3, 4), 3);
  });

  it("fora da faixa volta ao padrão", () => {
    assert.equal(passoValido(-1, 3), PASSO_PADRAO);
    assert.equal(passoValido(3, 3), PASSO_PADRAO);
    assert.equal(passoValido(99, 3), PASSO_PADRAO);
  });

  it("não inteiro, undefined, null e string voltam ao padrão", () => {
    assert.equal(passoValido(0.5, 3), PASSO_PADRAO);
    assert.equal(passoValido(Number.NaN, 3), PASSO_PADRAO);
    assert.equal(passoValido(Number.POSITIVE_INFINITY, 3), PASSO_PADRAO);
    assert.equal(passoValido(undefined, 3), PASSO_PADRAO);
    assert.equal(passoValido(null, 3), PASSO_PADRAO);
    assert.equal(passoValido("2", 3), PASSO_PADRAO);
    assert.equal(passoValido("0", 3), PASSO_PADRAO);
  });
});
