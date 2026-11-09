import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APARENCIAS,
  APARENCIA_PADRAO,
  CHAVE_APARENCIA,
  aparenciaPorId,
  contraste,
  gravarAparencia,
  lerAparencia,
} from "../src/components/historia/dado-3d/aparencias";

function armazemFalso(inicial: Record<string, string> = {}) {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k: string) => (k in dados ? dados[k] : null),
    setItem: (k: string, v: string) => {
      dados[k] = v;
    },
  };
}

describe("aparências do d20", () => {
  it("tem de 5 a 6 acabamentos, ids únicos, e o padrão é o âmbar atual", () => {
    assert.ok(APARENCIAS.length >= 5 && APARENCIAS.length <= 6);
    assert.equal(new Set(APARENCIAS.map((a) => a.id)).size, APARENCIAS.length);
    assert.equal(APARENCIAS[0].id, APARENCIA_PADRAO);
    assert.equal(APARENCIAS[0].corpo.media, "#5a3517");
    assert.equal(APARENCIAS[0].borda, "#e3b25a");
  });

  it("numeral, 20 e 1 contrastam com o meio do corpo (onde fica o número) em todos os acabamentos", () => {
    for (const a of APARENCIAS) {
      for (const [nome, cor] of [["numero", a.numero], ["critico", a.critico], ["falha", a.falha]] as const) {
        for (const fundo of [a.corpo.media]) {
          assert.ok(contraste(cor, fundo) >= 2.5, `${a.id}: ${nome} ${cor} sobre ${fundo} = ${contraste(cor, fundo).toFixed(2)}`);
        }
      }
    }
  });

  it("lê o padrão sem armazenamento, com valor inválido ou com armazenamento que lança", () => {
    assert.equal(lerAparencia(null), APARENCIA_PADRAO);
    assert.equal(lerAparencia(armazemFalso()), APARENCIA_PADRAO);
    assert.equal(lerAparencia(armazemFalso({ [CHAVE_APARENCIA]: "inexistente" })), APARENCIA_PADRAO);
    const quebrado = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    };
    assert.equal(lerAparencia(quebrado), APARENCIA_PADRAO);
    assert.equal(gravarAparencia("cobalto", quebrado), false);
  });

  it("grava e lê de volta; rejeita id desconhecido", () => {
    const z = armazemFalso();
    assert.equal(gravarAparencia("cobalto", z), true);
    assert.equal(lerAparencia(z), "cobalto");
    assert.equal(gravarAparencia("nada", z), false);
    assert.equal(lerAparencia(z), "cobalto");
    assert.equal(aparenciaPorId("nada").id, APARENCIA_PADRAO);
  });
});
