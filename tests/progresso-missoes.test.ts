import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { contarMissoes, missaoEmAberto } = await import(pathToFileURL(path.join(RAIZ, "src/lib/progresso-missoes.ts")).href);

describe("progresso das missões", () => {
  it("diário sem missões: tudo zero (a home não mostra barra)", () => {
    assert.deepEqual(contarMissoes([]), { total: 0, abertas: 0, concluidas: 0 });
    assert.deepEqual(contarMissoes([{ tipo: "npc", status: "" }]), { total: 0, abertas: 0, concluidas: 0 });
  });

  it("conta abertas, concluídas e ignora outros tipos", () => {
    const r = contarMissoes([
      { tipo: "missao", status: "ativa" },
      { tipo: "missao", status: "" },
      { tipo: "missao", status: "Concluída" },
      { tipo: "missao", status: "falhou" },
      { tipo: "missao", status: "cancelada" },
      { tipo: "pista", status: "ativa" },
    ]);
    assert.deepEqual(r, { total: 5, abertas: 2, concluidas: 1 });
  });

  it("mesma regra do Anteriormente para missão em aberto", () => {
    assert.equal(missaoEmAberto({ tipo: "missao", status: "em andamento" }), true);
    assert.equal(missaoEmAberto({ tipo: "missao", status: "concluida" }), false);
    assert.equal(missaoEmAberto({ tipo: "pista", status: "" }), false);
  });
});
