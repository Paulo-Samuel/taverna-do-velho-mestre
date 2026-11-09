import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G03: tipo de teste das ações sugeridas (mapeamento puro perícia -> tipo, sem inventar quando falta).

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { tipoDoTeste, descricaoDoTeste } = await import(pathToFileURL(path.join(RAIZ, "src/components/historia/tipo-teste.ts")).href);

describe("tipoDoTeste", () => {
  it("classifica por tipo, com e sem acento e caixa", () => {
    assert.equal(tipoDoTeste("Persuasão").tipo, "social");
    assert.equal(tipoDoTeste("persuasao").tipo, "social");
    assert.equal(tipoDoTeste("Intimidação").tipo, "social");
    assert.equal(tipoDoTeste("Atletismo").tipo, "fisico");
    assert.equal(tipoDoTeste("Furtividade").tipo, "fisico");
    assert.equal(tipoDoTeste("Investigação").tipo, "mental");
    assert.equal(tipoDoTeste("PERCEPÇÃO").tipo, "mental");
    assert.equal(tipoDoTeste("Sorte").tipo, "sorte");
    assert.equal(tipoDoTeste("Sem rolagem").tipo, "semrolagem");
  });
  it("rótulos em texto", () => {
    assert.equal(tipoDoTeste("Persuasão").rotulo, "Social");
    assert.equal(tipoDoTeste("sem rolagem").rotulo, "Sem rolagem");
  });
  it("não inventa tipo quando falta ou é desconhecido", () => {
    assert.equal(tipoDoTeste(undefined), null);
    assert.equal(tipoDoTeste(null), null);
    assert.equal(tipoDoTeste(""), null);
    assert.equal(tipoDoTeste("   "), null);
    assert.equal(tipoDoTeste("Heráldica"), null);
  });
  it("casa só no início da palavra (sem falso positivo no meio)", () => {
    assert.equal(tipoDoTeste("Alarme"), null); // "arma" está no meio de "alarme"
  });
  it("cada tipo tem classe própria e distinta", () => {
    const classes = ["Persuasão", "Atletismo", "Investigação", "Sorte", "Sem rolagem"].map((p) => tipoDoTeste(p).classe);
    assert.equal(new Set(classes).size, 5);
  });
  it("descrição para leitor de tela", () => {
    assert.equal(descricaoDoTeste("Persuasão", tipoDoTeste("Persuasão")), "Persuasão, teste social");
    assert.equal(descricaoDoTeste("Heráldica", null), "Heráldica");
  });
});
