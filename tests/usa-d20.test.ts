import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { usaD20 } from "../src/components/historia/usa-d20";

// O cartão de teste do modo história: d20 3D para testes de d20, parada em SVG para o resto (ver usa-d20.ts).

describe("usaD20", () => {
  it("reconhece as expressões de d20 que os sistemas gravam no pedido", () => {
    for (const expressao of ["1d20+2", "2d20kh1+3", "d20", "2d20kl1", "1d20", "1D20-1", "2d20kh1"]) {
      assert.equal(usaD20({ expressao }), true, expressao);
    }
  });

  it("manda as outras paradas para o SVG", () => {
    for (const expressao of ["1d100", "8d10 (1 de Fome)", "4dF+1", "2d6+1", "3d6", "1d6", "1d200", "d%"]) {
      assert.equal(usaD20({ expressao }), false, expressao);
    }
  });

  it("a expressão vale mais que o dado principal (OSR pede 1d6 em alguns testes, mesmo sendo sistema de d20)", () => {
    assert.equal(usaD20({ expressao: "1d6", dadoPrincipal: "d20" }), false);
    assert.equal(usaD20({ expressao: "2d6+1", dadoPrincipal: "d20" }), false);
    assert.equal(usaD20({ expressao: "1d20+4", dadoPrincipal: "d20" }), true);
  });

  it("sem expressão decide pelo dado principal do pedido", () => {
    assert.equal(usaD20({ dadoPrincipal: "d20" }), true);
    assert.equal(usaD20({ dadoPrincipal: "D20" }), true);
    assert.equal(usaD20({ dadoPrincipal: "d100" }), false);
    assert.equal(usaD20({ dadoPrincipal: "4dF" }), false);
    assert.equal(usaD20({ dadoPrincipal: "2d6" }), false);
  });

  it("pedido antigo sem expressão nem dado principal mantém o d20 3D", () => {
    assert.equal(usaD20({}), true);
    assert.equal(usaD20({ expressao: "", dadoPrincipal: "" }), true);
    assert.equal(usaD20({ expressao: "   " }), true);
  });
});
