import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { definirGerador } from "../src/lib/dados";
import { fichaBase } from "../src/lib/sistemas/comum";
import type { Ficha } from "../src/lib/sistemas/tipos";
import { escolhaPadrao, motivoSemRerrolagem, rerrolarComVontade, valeOferecerRerrolagem } from "../src/lib/sistemas/vtm5/forca-de-vontade";
import { avaliar, contarSucessos, resolver } from "../src/lib/sistemas/vtm5/testes";
import { comFaces } from "./_suporte/dados-fixos";

// Regras do Vampiro V5 (src/lib/sistemas/vtm5/testes.ts e forca-de-vontade.ts): parada com Fome, pares de 10, Crítico Sujo,
// Falha Bestial, Despertar e a rerrolagem com Força de Vontade (uma vez por teste, só dados normais, −1 FV).

afterEach(() => definirGerador(null));

/** Vera: Destreza 3 + Furtividade 2 = parada 5; Fome 2 → 3 dados normais e 2 de Fome. */
function vera(fome = 2): Ficha {
  const f = fichaBase("vtm5", "Vera");
  f.atributos = { forca: 2, destreza: 3, vigor: 2, carisma: 2, manipulacao: 2, autocontrole: 2, inteligencia: 2, raciocinio: 3, determinacao: 2 };
  f.pericias = { furtividade: 2, percepcao: 1 };
  f.recursos = {
    fome: { rotulo: "Fome", atual: fome, max: 5 },
    vontade: { rotulo: "Força de Vontade", atual: 5, max: 5 },
    humanidade: { rotulo: "Humanidade", atual: 7, max: 10 },
    mancha: { rotulo: "Manchas", atual: 0, max: 3 },
  };
  f.extras = { disciplinas: {} };
  return f;
}

const pedido = { teste: "Destreza + Furtividade", alvo: 2, motivo: "passar pelos guardas" };

describe("contar e avaliar", () => {
  it("6+ é sucesso e cada par de 10 soma 2 extras", () => {
    assert.deepEqual(contarSucessos([1, 5, 6, 9]), { total: 2, pares: 0 });
    assert.deepEqual(contarSucessos([10, 10, 3]), { total: 4, pares: 1 });
    assert.deepEqual(contarSucessos([10, 10, 10, 10]), { total: 8, pares: 2 });
    assert.deepEqual(contarSucessos([10, 7]), { total: 2, pares: 0 });
  });

  it("graus: Crítico, Crítico Sujo, Sucesso, Falha, Falha total e Falha Bestial", () => {
    assert.equal(avaliar([10, 10, 3], [4, 6], 2).rotulo, "Crítico");
    assert.equal(avaliar([10, 4, 3], [10, 2], 2).rotulo, "Crítico Sujo");
    assert.equal(avaliar([10, 4, 3], [10, 2], 2).grau, "sucesso_critico");
    assert.equal(avaliar([8, 3, 7], [2, 5], 2).rotulo, "Sucesso");
    assert.equal(avaliar([8, 3, 2], [2, 5], 2).rotulo, "Falha");
    assert.equal(avaliar([2, 3, 4, 5, 1], [], 1).rotulo, "Falha total");
    const bestial = avaliar([2, 3, 4], [1, 5], 2);
    assert.equal(bestial.rotulo, "Falha Bestial");
    assert.equal(bestial.grau, "falha_critica");
    // um 1 de Fome num teste que PASSOU não é bestial
    assert.equal(avaliar([8, 7, 9], [1, 2], 2).rotulo, "Sucesso");
  });

  it("sem dificuldade (iniciativa) o rótulo conta os sucessos", () => {
    assert.equal(avaliar([7, 2], [], null).rotulo, "1 sucesso");
    assert.equal(avaliar([7, 8, 2], [], null).rotulo, "2 sucessos");
  });
});

describe("resolver: parada com Fome", () => {
  it("rola 3 normais e 2 de Fome; a Fome vai no fim de `dados`", () => {
    const r = comFaces([8, 3, 7, 2, 5], () => resolver(vera(), pedido));
    assert.equal(r.vtm, "parada");
    assert.equal(r.parada, 5);
    assert.deepEqual(r.dados, [8, 3, 7, 2, 5]);
    assert.deepEqual(r.dadosFome, [2, 5]);
    assert.equal(r.total, 2);
    assert.equal(r.grau, "sucesso");
    assert.equal(r.rotuloGrau, "Sucesso");
    assert.equal(r.teste, "Destreza + Furtividade");
    assert.match(r.expressao, /5d10/);
    assert.match(r.detalhes ?? "", /Destreza 3 \+ Furtividade 2/);
  });

  it("Crítico Sujo quando o par de 10 inclui um dado de Fome", () => {
    const r = comFaces([10, 4, 3, 10, 2], () => resolver(vera(), pedido));
    assert.equal(r.rotuloGrau, "Crítico Sujo");
    assert.equal(r.total, 4);
    assert.match(r.detalhes ?? "", /Crítico Sujo: a Besta ajudou/);
  });

  it("Falha Bestial quando falha e um dado de Fome mostra 1", () => {
    const r = comFaces([2, 3, 4, 1, 5], () => resolver(vera(), pedido));
    assert.equal(r.rotuloGrau, "Falha Bestial");
    assert.equal(r.grau, "falha_critica");
    assert.equal(r.sucesso, false);
  });

  it("Fome 0: nenhum dado de Fome; Fome 5 toma a parada inteira", () => {
    const semFome = comFaces([2, 3, 4, 5, 1], () => resolver(vera(0), pedido));
    assert.deepEqual(semFome.dadosFome, []);
    assert.equal(semFome.rotuloGrau, "Falha total");
    const faminta = comFaces([6, 6, 6, 6, 6], () => resolver(vera(5), pedido));
    assert.equal(faminta.dadosFome.length, 5);
    assert.match(faminta.detalhes ?? "", /Fome 5: a Besta está perto/);
  });

  it("vantagem soma 2 dados e a parada nunca cai abaixo de 1", () => {
    const mais = comFaces([6, 6, 6, 6, 6, 6, 6], () => resolver(vera(), { ...pedido, modo: "vantagem" }));
    assert.equal(mais.parada, 7);
    const minima = comFaces([6], () => resolver(vera(0), { ...pedido, modificador: -9 }));
    assert.equal(minima.parada, 1);
    assert.match(minima.detalhes ?? "", /parada mínima de 1 dado/);
  });

  it("Despertar: 1–5 sobe a Fome, 6+ não", () => {
    const falhou = comFaces([3], () => resolver(vera(2), { teste: "Despertar", motivo: "corar" }));
    assert.equal(falhou.vtm, "despertar");
    assert.equal(falhou.falhasDespertar, 1);
    assert.equal(falhou.despertares?.[0].fomeDepois, 3);
    assert.equal(falhou.rotuloGrau, "Fome +1");
    const passou = comFaces([8], () => resolver(vera(2), { teste: "Despertar", motivo: "corar" }));
    assert.equal(passou.falhasDespertar, 0);
    assert.equal(passou.rotuloGrau, "Fome contida");
    // Fome 5 e falha: não sobe, a Besta cobra
    const estourou = comFaces([2], () => resolver(vera(5), { teste: "Despertar", motivo: "corar" }));
    assert.equal(estourou.despertares?.[0].estourou, true);
    assert.equal(estourou.rotuloGrau, "A Besta ruge");
  });

  it("iniciativa não tem dificuldade e teste desconhecido lança erro explicativo", () => {
    const ini = comFaces([7, 2, 9, 1, 1], () => resolver(vera(2), { teste: "Iniciativa", motivo: "" }));
    assert.equal(ini.vtm, "iniciativa");
    assert.equal(ini.alvo, null);
    assert.throws(() => resolver(vera(), { teste: "Bater carteira no metrô", motivo: "" }), /Não entendi o teste/);
  });
});

describe("rerrolar com Força de Vontade", () => {
  it("escolhe os menores dados normais abaixo de 6, até 3", () => {
    assert.deepEqual(escolhaPadrao([8, 3, 7, 2, 5, 1]), [1, 3, 5]);
    assert.deepEqual(escolhaPadrao([9, 7]), []);
    assert.deepEqual(escolhaPadrao([5, 5]), [0, 1]);
  });

  it("gasta 1 de Força de Vontade, troca só dados normais e recalcula o grau", () => {
    const ficha = vera();
    const antes = comFaces([2, 3, 4, 1, 5], () => resolver(ficha, pedido));
    assert.equal(antes.rotuloGrau, "Falha Bestial");
    assert.equal(motivoSemRerrolagem(ficha, antes), null);
    assert.equal(valeOferecerRerrolagem(ficha, antes), true);

    const { resultado: depois, ficha: nova } = comFaces([7, 8, 9], () => rerrolarComVontade(ficha, antes));
    assert.deepEqual(depois.dados, [7, 8, 9, 1, 5], "os dados de Fome ficam no lugar");
    assert.deepEqual(depois.dadosFome, [1, 5]);
    assert.equal(depois.total, 3);
    assert.equal(depois.rotuloGrau, "Sucesso");
    assert.equal(depois.rerrolado?.grauAntes, "Falha Bestial");
    assert.deepEqual(depois.rerrolado?.vontade, { antes: 5, depois: 4, max: 5 });
    assert.deepEqual(
      depois.rerrolado?.dados.map((t) => [t.indice, t.antes, t.depois]),
      [
        [0, 2, 7],
        [1, 3, 8],
        [2, 4, 9],
      ],
    );
    assert.equal(nova.recursos.vontade.atual, 4);
    assert.equal(ficha.recursos.vontade.atual, 5, "a ficha original não muda");
    assert.doesNotMatch(depois.detalhes ?? "", /Falha Bestial/);
  });

  it("só uma vez por teste, e nunca sem Força de Vontade, em iniciativa ou com sucesso", () => {
    const ficha = vera();
    const antes = comFaces([2, 3, 4, 1, 5], () => resolver(ficha, pedido));
    const { resultado: depois, ficha: nova } = comFaces([2, 2, 2], () => rerrolarComVontade(ficha, antes));
    assert.match(motivoSemRerrolagem(nova, depois) ?? "", /já foi rerrolado/);
    assert.throws(() => rerrolarComVontade(nova, depois), /já foi rerrolado/);

    const esgotada = vera();
    esgotada.recursos.vontade.atual = 0;
    assert.match(motivoSemRerrolagem(esgotada, antes) ?? "", /esgotada/);

    const ini = comFaces([2, 2, 3, 4, 1], () => resolver(ficha, { teste: "Iniciativa", motivo: "" }));
    assert.match(motivoSemRerrolagem(ficha, ini) ?? "", /não aceita/);

    const sucesso = comFaces([8, 3, 7, 2, 5], () => resolver(ficha, pedido));
    assert.equal(valeOferecerRerrolagem(ficha, sucesso), false);
    assert.throws(() => rerrolarComVontade(ficha, sucesso, [0, 1, 2, 3]), /No máximo 3/);
    assert.throws(() => rerrolarComVontade(ficha, sucesso, [4]), /nunca os de Fome/);
  });
});
