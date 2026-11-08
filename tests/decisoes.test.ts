import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { mesaSolo, pausaDecisao, podeDecidir, RERROLAGEM, RESULTADO_TESTE } from "../src/lib/constantes";
import { definirGerador } from "../src/lib/dados";
import { fichaBase } from "../src/lib/sistemas/comum";
import { contraAMorteDepois, dnd5e, INSPIRACAO_HEROICA } from "../src/lib/sistemas/dnd5e";
import { pf2e, PONTO_DE_HEROI } from "../src/lib/sistemas/pf2e";
import type { Ficha, ResultadoTeste } from "../src/lib/sistemas/tipos";
import { aplicarDecisao, decisoesAposTeste, opcoesAntesDeRolar, REROLAR_VONTADE, SURTO } from "../src/lib/sistemas/vtm5/decisoes";
import { resolver } from "../src/lib/sistemas/vtm5/testes";
import { comFaces } from "./_suporte/dados-fixos";

// Decisões depois do dado (W16): quem decide e quando a mesa espera (constantes.ts), a rerrolagem com Força de Vontade com os
// dados escolhidos (nunca os de Fome), o Surto antes de rolar, o Ponto de Herói do PF2e com a Recuperação e a Inspiração do 5e
// com os testes contra a morte. Os dados vêm de geradores injetados (comFaces).

afterEach(() => definirGerador(null));

// ---------- quem decide ----------

describe("mesa solo, dono e pausa", () => {
  it("mesa solo: um aparelho e um personagem (ou ninguém); dois aparelhos não é solo", () => {
    assert.equal(mesaSolo([]), true);
    assert.equal(mesaSolo([{ clienteId: "a", personagemId: 1 }]), true);
    assert.equal(mesaSolo([{ clienteId: "a", personagemId: 1 }, { clienteId: "b", personagemId: null }]), false);
    // hot-seat na máquina da taverna com dois personagens em uso: já não é solo
    assert.equal(mesaSolo([{ clienteId: "a", personagemId: 1 }, { clienteId: "a", personagemId: 2 }]), false);
  });

  it("só o dono decide; com o dono fora, a máquina da taverna (ou quem sobrou sozinho) assume", () => {
    const presenca = [
      { clienteId: "dono", personagemId: 1, local: false },
      { clienteId: "outro", personagemId: 2, local: false },
      { clienteId: "taverna", personagemId: null, local: true },
    ];
    const dec = { clienteId: "dono" };
    assert.equal(podeDecidir(dec, { clienteId: "dono", local: false }, presenca, 1), true);
    assert.equal(podeDecidir(dec, { clienteId: "outro", local: false }, presenca, 1), false);
    assert.equal(podeDecidir(dec, { clienteId: "taverna", local: true }, presenca, 1), false);
    // o dono saiu: a máquina da taverna decide, o outro jogador não
    const semDono = presenca.filter((j) => j.clienteId !== "dono");
    assert.equal(podeDecidir(dec, { clienteId: "taverna", local: true }, semDono, 1), true);
    assert.equal(podeDecidir(dec, { clienteId: "outro", local: false }, semDono, 1), false);
    // sem clienteId gravado, o dono é quem está com o personagem
    assert.equal(podeDecidir({ clienteId: null }, { clienteId: "dono", local: false }, presenca, 1), true);
    assert.equal(podeDecidir({ clienteId: null }, { clienteId: "", local: true }, presenca, 1), false);
  });

  it("pausa em falha, teste perigoso e ataque; sucesso comum não pausa", () => {
    assert.equal(pausaDecisao({ sucesso: false, teste: "Lábia" }), true);
    assert.equal(pausaDecisao({ sucesso: true, teste: "Lábia" }), false);
    assert.equal(pausaDecisao({ sucesso: true, teste: "Lábia" }, true), true);
    assert.equal(pausaDecisao({ sucesso: true, teste: "Ataque com espada" }), true);
    assert.equal(pausaDecisao({ sucesso: true, teste: "Briga", ataque: { dano: 2 } }), true);
  });

  it("a rerrolagem é uma ação interna (começa com o prefixo do resultado de teste)", () => {
    assert.ok(RERROLAGEM.startsWith(RESULTADO_TESTE));
  });
});

// ---------- Vampiro ----------

/** Carisma 4 + Lábia 4 = parada 8; Fome 1 → 7 normais e 1 de Fome. */
function vera(fome = 1, vontade = 5): Ficha {
  const f = fichaBase("vtm5", "Vera");
  f.atributos = { forca: 2, destreza: 2, vigor: 2, carisma: 4, manipulacao: 2, autocontrole: 2, inteligencia: 2, raciocinio: 2, determinacao: 2 };
  f.pericias = { labia: 4 };
  f.recursos = {
    fome: { rotulo: "Fome", atual: fome, max: 5 },
    vontade: { rotulo: "Força de Vontade", atual: vontade, max: 5 },
    humanidade: { rotulo: "Humanidade", atual: 7, max: 10 },
    mancha: { rotulo: "Manchas", atual: 0, max: 3 },
  };
  f.nivel = 1;
  f.extras = { disciplinas: {} };
  return f;
}

const labia = { teste: "Carisma + Lábia", alvo: 4, motivo: "convencer o segurança" };

describe("Vampiro: escolher os dados da rerrolagem", () => {
  it("a prévia do pedido mostra a composição da parada e a Fome, sem nota de grau", () => {
    const r = comFaces([1, 1, 1, 1, 1, 1, 1, 1], () => resolver(vera(), { ...labia, previa: true }));
    assert.match(r.detalhes ?? "", /Carisma 4 \+ Lábia 4/);
    assert.match(r.detalhes ?? "", /1 de Fome/);
    assert.doesNotMatch(r.detalhes ?? "", /Falha|Sucesso|Bestial/);
  });

  it("falha: oferece rerrolar com os normais que falharam já marcados; nenhum índice é de Fome", () => {
    // 7 normais + 1 Fome: 2 sucessos, falha contra 4
    const r = comFaces([2, 3, 7, 1, 4, 6, 5, 8], () => resolver(vera(), labia));
    assert.equal(r.sucesso, false);
    const [op] = decisoesAposTeste(vera(), r);
    assert.equal(op.id, REROLAR_VONTADE);
    assert.equal(op.dados?.max, 3);
    assert.deepEqual(op.dados?.elegiveis, [0, 1, 2, 3, 4, 5, 6]);
    assert.ok(op.dados?.padrao?.every((i) => i < 7));
    assert.equal(op.dados?.padrao?.length, 3);
  });

  it("rerrola só os dados escolhidos e desconta 1 de Força de Vontade; o de Fome fica", () => {
    const ficha = vera();
    const r = comFaces([2, 3, 7, 1, 4, 6, 5, 8], () => resolver(ficha, labia));
    // escolhe o 7 (índice 2) e o 1 (índice 3): só eles mudam
    const feito = comFaces([9, 10], () => aplicarDecisao(ficha, r, REROLAR_VONTADE, { dados: [2, 3] }));
    const d = feito.resultado.dados;
    assert.deepEqual([d[0], d[1], d[4], d[5], d[6]], [2, 3, 4, 6, 5]);
    assert.deepEqual([d[2], d[3]], [9, 10]);
    assert.equal(d[7], 8, "o dado de Fome não muda");
    assert.equal(feito.ficha.recursos.vontade.atual, 4);
    assert.ok(feito.textoMestre.length > 0);
  });

  it("pedir para rerrolar um dado de Fome é recusado", () => {
    const ficha = vera();
    const r = comFaces([2, 3, 7, 1, 4, 6, 5, 8], () => resolver(ficha, labia));
    assert.throws(() => aplicarDecisao(ficha, r, REROLAR_VONTADE, { dados: [7] }));
  });

  it("sucesso com dado abaixo de 10 também oferece (discreto), marcando os menores", () => {
    const r = comFaces([6, 7, 8, 9, 6, 2, 3, 9], () => resolver(vera(), labia));
    assert.equal(r.sucesso, true);
    const [op] = decisoesAposTeste(vera(), r);
    assert.equal(op?.id, REROLAR_VONTADE);
    assert.deepEqual(op.dados?.padrao, [5, 6]);
  });

  it("sem Força de Vontade não oferece nada", () => {
    const r = comFaces([2, 3, 7, 1, 4, 6, 5, 8], () => resolver(vera(1, 0), labia));
    assert.deepEqual(decisoesAposTeste(vera(1, 0), r), []);
  });

  it("Surto de Sangue antes de rolar: só sem Surto guardado, Fome abaixo de 5 e parada sem disciplina", () => {
    const [op] = opcoesAntesDeRolar(vera(), labia);
    assert.equal(op?.id, SURTO);
    assert.match(op.efeito ?? "", /^\+\d dados?$/);
    assert.deepEqual(opcoesAntesDeRolar(vera(5), labia), []);
    assert.deepEqual(opcoesAntesDeRolar(vera(), { teste: "Despertar", alvo: null, motivo: "" }), []);
  });
});

// ---------- PF2e ----------

function valeria(heroi = 1, condicoes: string[] = []): Ficha {
  const f = fichaBase("pf2e", "Valéria");
  f.recursos = { ...f.recursos, heroi: { rotulo: "Pontos de Herói", atual: heroi, max: 3 } };
  f.condicoes = condicoes;
  return f;
}

describe("PF2e: Ponto de Herói e Recuperação", () => {
  it("falha oferece o Ponto de Herói; rerrolar desconta, troca o d20 e anota no cartão", () => {
    const f = valeria(2);
    const r = comFaces([2], () => pf2e.resolverTeste(f, { teste: "Percepção", alvo: 15, motivo: "olhar" }));
    assert.equal(r.sucesso, false);
    const [op] = pf2e.decisoesAposTeste!(f, r);
    assert.equal(op?.id, PONTO_DE_HEROI);
    const feito = comFaces([19], () => pf2e.aplicarDecisao!(f, r, PONTO_DE_HEROI));
    assert.equal(feito.ficha.recursos.heroi.atual, 1);
    assert.equal(feito.resultado.natural, 19);
    const heroi = (feito.resultado as ResultadoTeste & { heroi?: { antes: number; depois: number; naturalAntes: number } }).heroi;
    assert.deepEqual([heroi?.antes, heroi?.depois, heroi?.naturalAntes], [2, 1, 2]);
    assert.match(feito.resultado.detalhes ?? "", /Ponto de Herói/);
    // uma vez por teste
    assert.deepEqual(pf2e.decisoesAposTeste!(feito.ficha, feito.resultado), []);
  });

  it("sem Ponto de Herói, ou num sucesso, não oferece", () => {
    const f = valeria(0);
    const r = comFaces([2], () => pf2e.resolverTeste(f, { teste: "Percepção", alvo: 15, motivo: "olhar" }));
    assert.deepEqual(pf2e.decisoesAposTeste!(f, r), []);
    const ok = comFaces([20], () => pf2e.resolverTeste(valeria(2), { teste: "Percepção", alvo: 5, motivo: "olhar" }));
    assert.deepEqual(pf2e.decisoesAposTeste!(valeria(2), ok), []);
  });

  it("Recuperação ajusta o moribundo: sucesso desce, falha sobe, zero estabiliza, quatro mata", () => {
    const base: ResultadoTeste = { sistema: "pf2e", teste: "Recuperação", grau: "sucesso" } as ResultadoTeste;
    const desce = pf2e.aposTeste!(valeria(1, ["moribundo 2", "inconsciente"]), base);
    assert.deepEqual(desce?.condicoes.filter((c) => c.startsWith("moribundo")), ["moribundo 1"]);
    const estavel = pf2e.aposTeste!(valeria(1, ["moribundo 1", "inconsciente"]), base);
    assert.ok(estavel?.condicoes.includes("inconsciente (estável)"));
    assert.ok(!estavel?.condicoes.some((c) => c.startsWith("moribundo")));
    const morre = pf2e.aposTeste!(valeria(1, ["moribundo 3"]), { ...base, grau: "falha" });
    assert.ok(morre?.condicoes.includes("morto"));
    assert.equal(pf2e.aposTeste!(valeria(1, []), base), null, "sem moribundo, a Recuperação não mexe na ficha");
  });
});

// ---------- D&D 5e ----------

function tora(inspiracao = 1, pv = 10, condicoes: string[] = []): Ficha {
  const f = fichaBase("dnd5e", "Tora");
  f.recursos = { ...f.recursos, inspiracao: { rotulo: "Inspiração heroica", atual: inspiracao, max: 1 } };
  f.pv = pv;
  f.condicoes = condicoes;
  return f;
}

describe("D&D 5e: Inspiração heroica e testes contra a morte", () => {
  it("falha oferece a Inspiração; rerrolar desconta e fica com o d20 novo", () => {
    const f = tora(1);
    const r = comFaces([3], () => dnd5e.resolverTeste(f, { teste: "Percepção", alvo: 15, motivo: "olhar" }));
    assert.equal(r.sucesso, false);
    const [op] = dnd5e.decisoesAposTeste!(f, r);
    assert.equal(op?.id, INSPIRACAO_HEROICA);
    const feito = comFaces([18], () => dnd5e.aplicarDecisao!(f, r, INSPIRACAO_HEROICA));
    assert.equal(feito.ficha.recursos.inspiracao.atual, 0);
    assert.equal(feito.resultado.natural, 18);
  });

  it("contagem contra a morte: 20 volta, 1 vale duas falhas, sucesso e falha somam um", () => {
    const r = (natural: number, sucesso: boolean) => ({ sistema: "dnd5e", teste: "Teste contra a morte", natural, sucesso }) as ResultadoTeste;
    assert.deepEqual(contraAMorteDepois(tora(1, 0), r(20, true)), { s: 0, f: 0, volta: true });
    assert.deepEqual(contraAMorteDepois(tora(1, 0, ["contra a morte 1S/0F"]), r(1, false)), { s: 1, f: 2, volta: false });
    assert.deepEqual(contraAMorteDepois(tora(1, 0, ["contra a morte 2S/1F"]), r(12, true)), { s: 3, f: 1, volta: false });
    assert.equal(contraAMorteDepois(tora(1, 5), r(12, true)), null, "com PV não há teste contra a morte");
    const morto = dnd5e.aposTeste!(tora(1, 0, ["contra a morte 0S/2F"]), r(4, false));
    assert.ok(morto?.condicoes.includes("morto"));
    const volta = dnd5e.aposTeste!(tora(1, 0, ["inconsciente", "contra a morte 1S/1F"]), r(20, true));
    assert.equal(volta?.pv, 1);
    assert.ok(!volta?.condicoes.includes("inconsciente"));
  });

  it("voltar a ter PV zera a contagem contra a morte; cair de novo começa do zero", () => {
    const r = (natural: number, sucesso: boolean) => ({ sistema: "dnd5e", teste: "Teste contra a morte", natural, sucesso }) as ResultadoTeste;
    // cura (alterar_ficha/ajuste): 0 → 5 PV
    const curado = tora(1, 5, ["inconsciente", "contra a morte 1S/2F"]);
    dnd5e.aposMudancaDePv!(curado, 0, "alterar_ficha");
    assert.ok(!curado.condicoes.some((c) => c.startsWith("contra a morte")), "a contagem sai com PV de volta");
    // estabilizado e curado também perde o "estabilizado"
    const estavel = tora(1, 3, ["estabilizado"]);
    dnd5e.aposMudancaDePv!(estavel, 0, "ajuste");
    assert.deepEqual(estavel.condicoes, []);
    // contagem antiga esquecida na ficha: caiu de novo vindo de PV positivo → começa do zero
    const caiu = tora(1, 0, ["inconsciente", "contra a morte 1S/2F"]);
    dnd5e.aposMudancaDePv!(caiu, 4, "alterar_ficha");
    assert.deepEqual(caiu.condicoes, ["inconsciente"]);
    assert.deepEqual(contraAMorteDepois(caiu, r(5, false)), { s: 0, f: 1, volta: false }, "a primeira falha não mata");
    // dano a quem já estava a 0 PV não zera
    const caido = tora(1, 0, ["contra a morte 1S/1F"]);
    dnd5e.aposMudancaDePv!(caido, 0, "alterar_ficha");
    assert.deepEqual(caido.condicoes, ["contra a morte 1S/1F"]);
    // descansos limpam a contagem
    const longo = dnd5e.descansar!(tora(1, 0, ["inconsciente", "contra a morte 0S/2F"]), "longo").ficha;
    assert.ok(!longo.condicoes.some((c) => c.startsWith("contra a morte")));
    const curto = comFaces([6, 6, 6, 6, 6, 6, 6, 6, 6, 6], () => dnd5e.descansar!(tora(1, 0, ["estabilizado", "contra a morte 3S/0F"]), "curto")).ficha;
    if (curto.pv > 0) assert.ok(!curto.condicoes.some((c) => c.startsWith("contra a morte")));
  });
});
