import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { d, dadoFate, definirGerador, descreverRolagem, expressaoValida, rolar, somar } from "../src/lib/dados";
import { comFaces, faces } from "./_suporte/dados-fixos";

// Motor de dados (src/lib/dados.ts): notação, manter/descartar, explosão, Fate, d% e a fonte de aleatoriedade injetável.

afterEach(() => definirGerador(null));

describe("expressaoValida", () => {
  it("aceita a notação documentada", () => {
    for (const e of ["1d20+5", "2d6", "d20", "4d6kh3", "4d6dl1", "2d20kl1", "1d6!", "4dF", "d%", "1d8+1d6+3", "1d20-2", "2D6 + 1", "3"]) {
      assert.equal(expressaoValida(e), true, e);
    }
  });

  it("recusa lixo e expressões pela metade", () => {
    for (const e of ["", "   ", "d", "1d", "abc", "1d20+", "+", "1d20++2", "1d20 vs 12", "20d", "dd6"]) {
      assert.equal(expressaoValida(e), false, JSON.stringify(e));
    }
  });
});

describe("rolar", () => {
  it("2d20kh1 mantém o maior (vantagem) e 2d20kl1 o menor (desvantagem)", () => {
    const vantagem = comFaces([7, 15], () => rolar("2d20kh1+3"));
    assert.equal(vantagem.total, 18);
    const termo = vantagem.partes[0];
    assert.ok("valores" in termo);
    assert.deepEqual(termo.valores, [7, 15]);
    assert.deepEqual(termo.mantidos, [1]);

    const desvantagem = comFaces([7, 15], () => rolar("2d20kl1"));
    assert.equal(desvantagem.total, 7);
  });

  it("4d6dl1 descarta o menor e 4d6kh3 dá o mesmo resultado", () => {
    const a = comFaces([6, 5, 3, 1], () => rolar("4d6dl1"));
    const b = comFaces([6, 5, 3, 1], () => rolar("4d6kh3"));
    assert.equal(a.total, 14);
    assert.equal(b.total, 14);
    assert.equal(descreverRolagem(a), "4d6dl1 [6, 5, 3, ~1] = 14");
  });

  it("1d6! explode no máximo e para quando sai outro valor", () => {
    const r = comFaces([6, 6, 2], () => rolar("1d6!"));
    assert.equal(r.total, 14);
    const termo = r.partes[0];
    assert.ok("valores" in termo);
    assert.deepEqual(termo.valores, [6, 6, 2]);
  });

  it("4dF soma −1/0/+1 e descreve com os sinais", () => {
    const r = comFaces([1, -1, 0, 1], () => rolar("4dF+2"));
    assert.equal(r.total, 3);
    assert.equal(descreverRolagem(r), "4df [+, −, 0, +] + 2 = 3");
  });

  it("d% é um d100 e a constante negativa desconta", () => {
    const r = comFaces([42], () => rolar("d%-2"));
    assert.equal(r.total, 40);
    const termo = r.partes[0];
    assert.ok("lados" in termo && termo.lados === 100);
  });

  it("expressão inválida lança erro com exemplos", () => {
    assert.throws(() => rolar("1d20 vs 12"), /inválida/);
    assert.throws(() => rolar(""), /inválida/);
  });

  it("recusa dados demais e dados que não existem", () => {
    assert.throws(() => rolar("101d6"), /limites/);
    assert.throws(() => rolar("1d1"), /não existe/);
    assert.throws(() => rolar("1d1001"), /não existe/);
  });

  it("limpa espaços e maiúsculas na expressão devolvida", () => {
    const r = comFaces([3, 4], () => rolar("2D6 + 1"));
    assert.equal(r.expressao, "2d6+1");
    assert.equal(r.total, 8);
  });
});

describe("gerador injetável", () => {
  it("d e dadoFate usam o gerador definido e voltam ao padrão com null", () => {
    definirGerador(faces([20, -1]));
    assert.equal(d(20), 20);
    assert.equal(dadoFate(), -1);
    definirGerador(null);
    const v = d(6);
    assert.ok(v >= 1 && v <= 6);
  });

  it("somar devolve as faces e o total", () => {
    const r = comFaces([2, 3, 4], () => somar(3, 6));
    assert.deepEqual(r.valores, [2, 3, 4]);
    assert.equal(r.total, 9);
  });
});

describe("distribuição com o gerador de verdade", () => {
  it("d(6) em 3000 rolagens fica no intervalo e mostra as seis faces", () => {
    const contagem = new Map<number, number>();
    for (let i = 0; i < 3000; i++) {
      const v = d(6);
      assert.ok(Number.isInteger(v) && v >= 1 && v <= 6, `face fora do dado: ${v}`);
      contagem.set(v, (contagem.get(v) ?? 0) + 1);
    }
    assert.equal(contagem.size, 6);
    // cada face em ~500; abaixo de 350 seria um dado viciado demais para a taverna
    for (const [face, n] of contagem) assert.ok(n > 350, `face ${face} saiu só ${n} vezes`);
  });

  it("dadoFate só dá −1, 0 ou +1", () => {
    for (let i = 0; i < 300; i++) assert.ok([-1, 0, 1].includes(dadoFate()));
  });
});
