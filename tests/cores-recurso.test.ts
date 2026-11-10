import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// V09: a cor dos recursos (ficha e grupo) sai de um lugar só e usa tokens do tema, nunca hex nem paleta crua do Tailwind.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { COR_RECURSO, corDoRecurso } = (await import(pathToFileURL(path.join(RAIZ, "src/components/ficha/cores-recurso.ts")).href)) as {
  COR_RECURSO: Record<string, string>;
  corDoRecurso: (tipo: string) => string;
};

describe("cores dos recursos", () => {
  it("tem as quatro classes combinadas", () => {
    assert.deepEqual(COR_RECURSO, {
      vida: "bg-musgo",
      magia: "bg-[var(--matiz-1)]",
      sanidade: "bg-[var(--matiz-5)]",
      outro: "bg-ambar",
    });
  });

  it("não usa hex nem a paleta crua (sky, violet)", () => {
    for (const [tipo, classe] of Object.entries(COR_RECURSO)) {
      assert.doesNotMatch(classe, /#[0-9a-f]{3,8}/i, `${tipo} com hex`);
      assert.doesNotMatch(classe, /sky|violet/, `${tipo} com paleta crua`);
      assert.match(classe, /^bg-/, `${tipo} não é classe de fundo`);
    }
  });

  it("devolve a classe de cada tipo conhecido", () => {
    for (const tipo of ["vida", "magia", "sanidade", "outro"]) assert.equal(corDoRecurso(tipo), COR_RECURSO[tipo]);
  });

  it("tipo desconhecido cai em 'outro'", () => {
    assert.equal(corDoRecurso("fome"), COR_RECURSO.outro);
    assert.equal(corDoRecurso(""), COR_RECURSO.outro);
    assert.equal(corDoRecurso("toString"), COR_RECURSO.outro);
  });
});
