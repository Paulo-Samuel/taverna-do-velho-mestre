import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcular, pf2e } from "../src/lib/sistemas/pf2e";
import { comFaces } from "./_suporte/dados-fixos";

// Interpretação dos nomes de teste do Pathfinder 2e (calcular em pf2e.ts): os casos do harness da auditoria "pf2e-ponta-a-ponta".
// O guerreiro não conjura; o mago tem tradição arcana. Os bônus são comparados com a própria perícia, não com números fixos.

const guerreiro = pf2e.criarFicha({ nome: "Brasco", ancestralidade: "humano", classe: "guerreiro" });
const mago = pf2e.criarFicha({ nome: "Ilsa", ancestralidade: "humano", classe: "mago" });

const NAO_RECONHECIDO = "teste não reconhecido";
const reconhecido = (teste: string, ficha = guerreiro) => {
  const c = calcular(ficha, teste);
  assert.ok(!c.detalhes.some((d) => d.includes(NAO_RECONHECIDO)), `"${teste}" caiu em d20 puro`);
  return c;
};

describe("parêntese primeiro", () => {
  it("Recordar Conhecimento (Religião) usa Religião, não a melhor perícia de conhecimento", () => {
    for (const ficha of [guerreiro, mago]) {
      const c = reconhecido("Recordar Conhecimento (Religião)", ficha);
      assert.equal(c.rotulo, "Recordar Conhecimento (Religião)");
      assert.equal(c.tipo, "pericia");
      assert.equal(c.bonus, calcular(ficha, "Religião").bonus);
      assert.equal(c.atributo, "sab");
    }
    // o mago treinado em Arcanismo não ganha o +7 de graça ao identificar um morto-vivo
    assert.ok(calcular(mago, "Arcanismo").bonus > calcular(mago, "Religião").bonus, "a ficha de teste precisa ter Arcanismo acima de Religião");
  });

  it("sem parêntese, Recordar Conhecimento segue na melhor das cinco", () => {
    const c = reconhecido("Recordar Conhecimento", mago);
    assert.equal(c.rotulo, "Recordar Conhecimento (Arcanismo)");
    assert.equal(c.bonus, calcular(mago, "Arcanismo").bonus);
  });

  it("a perícia citada no texto também manda", () => {
    const c = reconhecido("Recordar Conhecimento sobre religião", mago);
    assert.equal(c.rotulo, "Recordar Conhecimento (Religião)");
  });

  it("parêntese com salvamento ou com outra coisa", () => {
    assert.equal(calcular(guerreiro, "Resistir ao veneno (Fortitude)").tipo, "salvamento");
    assert.equal(calcular(guerreiro, "Resistir ao veneno (Fortitude)").rotulo, "Resistir ao veneno (Fortitude)");
    // "Ataque (espada longa)": o parêntese não é perícia, vale o atalho de ataque
    const c = reconhecido("Ataque (espada longa)");
    assert.equal(c.tipo, "ataque");
  });

  it("salvamento fora do parêntese manda: a explicação dentro não vira perícia por apelido solto", () => {
    const casos: [string, string][] = [
      ["Reflexos (esquivar da armadilha)", "Reflexos"],
      ["Fortitude (escalar o penhasco)", "Fortitude"],
      ["Vontade (não tocar o ídolo)", "Vontade"],
    ];
    for (const [teste, nome] of casos) {
      const c = calcular(guerreiro, teste);
      assert.equal(c.tipo, "salvamento", teste);
      assert.equal(c.rotulo, nome, teste);
      assert.equal(c.bonus, calcular(guerreiro, nome).bonus, teste);
    }
  });

  it("perícia fora do parêntese com a ação dentro: rótulo sem repetir o nome", () => {
    const casos: [string, string][] = [
      ["Medicina (Tratar Ferimentos)", "Medicina"],
      ["Atletismo (escalar o muro)", "Atletismo"],
      ["Diplomacia (Pedir)", "Diplomacia"],
      ["Furtividade (esgueirar)", "Furtividade"],
      ["Sobrevivência (Rastrear)", "Sobrevivência"],
      ["Ladroagem (desarmar armadilha)", "Ladroagem"],
      ["Furtividade (passar pelos guardas)", "Furtividade"],
      ["Natação (Atletismo)", "Atletismo"],
    ];
    for (const [teste, nome] of casos) {
      const c = reconhecido(teste);
      assert.equal(c.rotulo, nome, teste);
      assert.equal(c.tipo, "pericia", teste);
      assert.equal(c.bonus, calcular(guerreiro, nome).bonus, teste);
    }
    // o parêntese só troca a perícia quando traz o NOME de outra
    const troca = reconhecido("Escalar (Acrobatismo)");
    assert.equal(troca.rotulo, "Escalar (Acrobatismo)");
    assert.equal(troca.bonus, calcular(guerreiro, "Acrobatismo").bonus);
    // apelido solto dentro do parêntese não troca a perícia de fora
    assert.equal(reconhecido("Furtividade (rolar pela sombra)").rotulo, "Furtividade");
  });

  it("ação fora e explicação dentro: só vale quando a explicação começa pelo nome da perícia", () => {
    const c = reconhecido("Subir a torre (escalar a parede)");
    assert.equal(c.rotulo, "Subir a torre (Atletismo)");
    assert.equal(c.bonus, calcular(guerreiro, "Atletismo").bonus);
    // "sobre a armadilha" não é Ladroagem: Recordar Conhecimento segue na melhor das cinco
    assert.match(calcular(mago, "Recordar Conhecimento (sobre a armadilha)").rotulo, /^Recordar Conhecimento \(Arcanismo\)$/);
  });
});

describe("bordas de palavra nos atalhos", () => {
  it("Natação é Atletismo, não Ataque", () => {
    for (const teste of ["Natação", "Natação contra a correnteza", "natacao"]) {
      const c = reconhecido(teste);
      assert.equal(c.rotulo, "Atletismo", teste);
      assert.equal(c.tipo, "pericia");
      assert.equal(c.bonus, calcular(guerreiro, "Atletismo").bonus);
    }
  });

  it("Ataque, Golpe e o 2º ataque continuam ataques", () => {
    const a = reconhecido("Ataque");
    assert.equal(a.tipo, "ataque");
    assert.match(a.rotulo, /^Ataque \(/);
    assert.equal(reconhecido("Golpe com a espada").tipo, "ataque");
    const segundo = reconhecido("Ataque 2");
    assert.ok(segundo.bonus < a.bonus, "o 2º ataque leva a penalidade de ataque múltiplo");
    assert.ok(segundo.detalhes.some((d) => /2º ataque/.test(d)));
  });

  it("Pular não vira Impulso e Agarrar continua manobra", () => {
    assert.equal(reconhecido("Agarrar o guarda").tipo, "ataque");
    assert.match(calcular(guerreiro, "Agarrar o guarda").rotulo, /^Manobra · Atletismo/);
    assert.equal(reconhecido("Pular o abismo").rotulo, "Atletismo");
  });

  it("Magia: ataque de magia para quem conjura, aviso para quem não conjura", () => {
    const m = reconhecido("Magia", mago);
    assert.equal(m.tipo, "ataque");
    assert.equal(m.rotulo, "Ataque de magia (arcana)");
    const g = calcular(guerreiro, "Magia");
    assert.equal(g.rotulo, "Ataque mágico (sem conjuração)");
    assert.ok(g.detalhes.includes("classe não conjura"));
  });
});

describe("Identificar magia", () => {
  it("é perícia de conhecimento, nunca ataque mágico", () => {
    for (const ficha of [guerreiro, mago]) {
      const c = reconhecido("Identificar magia", ficha);
      assert.equal(c.tipo, "pericia");
      assert.match(c.rotulo, /^Identificar magia \((Arcanismo|Natureza|Ocultismo|Religião|Sociedade)\)$/);
    }
    // sem tradição, a melhor da ficha (o mago: Arcanismo)
    assert.equal(calcular(mago, "Identificar magia").rotulo, "Identificar magia (Arcanismo)");
  });

  it("segue a tradição citada", () => {
    assert.equal(calcular(guerreiro, "Identificar magia divina").rotulo, "Identificar magia (Religião)");
    assert.equal(calcular(guerreiro, "Identificar a magia oculta do altar").rotulo, "Identificar magia (Ocultismo)");
    assert.equal(calcular(guerreiro, "Identificar magia primal").rotulo, "Identificar magia (Natureza)");
    assert.equal(calcular(mago, "Identificar magia arcana").rotulo, "Identificar magia (Arcanismo)");
  });

  it("identificar item é Manufatura", () => {
    const c = reconhecido("Identificar item alquímico");
    assert.equal(c.rotulo, "Identificar · Manufatura");
  });

  it("identificar sem magia nenhuma não ganha rótulo de magia", () => {
    // "Identificar armadilha" é Ladroagem (apelido), como antes
    const armadilha = reconhecido("Identificar armadilha");
    assert.equal(armadilha.rotulo, "Identificar (Ladroagem)");
    assert.equal(armadilha.bonus, calcular(guerreiro, "Ladroagem").bonus);
    // sem perícia citada, a melhor de conhecimento, com rótulo "Identificar (…)"
    for (const teste of ["Identificar a criatura", "Identificar o brasão da casa nobre"]) {
      const c = reconhecido(teste);
      assert.equal(c.tipo, "pericia", teste);
      assert.match(c.rotulo, /^Identificar \((Arcanismo|Natureza|Ocultismo|Religião|Sociedade)\)$/, teste);
    }
    assert.equal(calcular(mago, "Identificar a criatura").rotulo, "Identificar (Arcanismo)");
    // o parêntese com o nome da perícia manda também aqui
    assert.equal(calcular(guerreiro, "Identificar o veneno (Medicina)").rotulo, "Identificar o veneno (Medicina)");
    assert.equal(calcular(guerreiro, "Identificar a runa (Arcanismo)").rotulo, "Identificar a runa (Arcanismo)");
  });

  it("'identificar' solto na frase não rouba a perícia, o salvamento ou a Percepção pedidos", () => {
    // a perícia citada manda mesmo com palavra de item/veneno ("Medicina para identificar o veneno" é Medicina, não Manufatura)
    const medicina = reconhecido("Medicina para identificar o veneno");
    assert.equal(medicina.rotulo, "Identificar (Medicina)");
    assert.equal(medicina.bonus, calcular(guerreiro, "Medicina").bonus);
    // salvamentos citados seguem salvamentos
    const fort = reconhecido("Fortitude contra o veneno não identificado");
    assert.equal(fort.tipo, "salvamento");
    assert.equal(fort.rotulo, "Fortitude");
    assert.equal(fort.bonus, calcular(guerreiro, "Fortitude").bonus);
    const von = reconhecido("Vontade para não ser identificado");
    assert.equal(von.tipo, "salvamento");
    assert.equal(von.rotulo, "Vontade");
    // Percepção citada segue Percepção, não a Ladroagem do apelido "armadilha"
    const percep = reconhecido("Percepção para identificar a armadilha");
    assert.equal(percep.tipo, "percepcao");
    assert.equal(percep.bonus, calcular(guerreiro, "Percepção").bonus);
    // sem perícia nem salvamento citados, os ramos de item e de magia continuam como antes
    assert.equal(calcular(guerreiro, "Tentar identificar o veneno").rotulo, "Identificar · Manufatura");
    assert.equal(calcular(guerreiro, "Tentar identificar a magia divina").rotulo, "Identificar magia (Religião)");
  });
});

describe("aliases novos", () => {
  it("pular, pulo, natação, correr e levantar peso são Atletismo; decifrar é Sociedade", () => {
    for (const teste of ["Pular o abismo", "Pular", "Pulo", "Pulo longo", "Correr atrás do ladrão", "Levantar peso", "Erguer o portão", "Natação"]) {
      assert.equal(reconhecido(teste).rotulo, "Atletismo", teste);
    }
    assert.equal(reconhecido("Decifrar a inscrição").rotulo, "Sociedade");
  });

  it("'levantar' solto não é Atletismo: 'Levantar suspeitas' segue não reconhecido", () => {
    const c = calcular(guerreiro, "Levantar suspeitas");
    assert.ok(c.detalhes.some((d) => d.includes(NAO_RECONHECIDO)));
    assert.equal(c.bonus, 0);
  });
});

describe("o resto do harness", () => {
  it("salvamentos, Percepção, Iniciativa, Escapar, simples e Recuperação", () => {
    assert.equal(calcular(guerreiro, "Fortitude").tipo, "salvamento");
    assert.equal(calcular(guerreiro, "Reflexos").rotulo, "Reflexos");
    assert.equal(calcular(guerreiro, "Vontade").rotulo, "Vontade");
    assert.equal(calcular(guerreiro, "Percepção").tipo, "percepcao");
    assert.equal(calcular(guerreiro, "Iniciativa").rotulo, "Iniciativa (Percepção)");
    assert.equal(calcular(guerreiro, "Iniciativa (Furtividade)").rotulo, "Iniciativa · Furtividade");
    assert.match(calcular(guerreiro, "Escapar").rotulo, /^Escapar \((Atletismo|Acrobatismo)\)$/);
    assert.deepEqual(calcular(guerreiro, "Teste simples"), { rotulo: "Teste simples", bonus: 0, atributo: null, tipo: "simples", detalhes: [] });
    assert.equal(calcular(guerreiro, "Recuperação").alvoPadrao, 11);
  });

  it("atributo puro e teste não reconhecido", () => {
    const c = calcular(guerreiro, "FOR");
    assert.equal(c.tipo, "atributo");
    assert.equal(c.rotulo, "Força");
    const x = calcular(guerreiro, "Xingar o vento");
    assert.ok(x.detalhes.some((d) => d.includes(NAO_RECONHECIDO)));
    assert.equal(x.bonus, 0);
  });
});

describe("resolverTeste", () => {
  it("20 natural sobe um grau e a expressão sai como 1d20+bônus", () => {
    const bonus = calcular(guerreiro, "Atletismo").bonus;
    const alvo = bonus + 25; // 19 + bônus fica 6 abaixo: falha simples
    const comum = comFaces([19], () => pf2e.resolverTeste(guerreiro, { teste: "Atletismo", alvo, motivo: "escalar" }));
    assert.equal(comum.grau, "falha");
    const r = comFaces([20], () => pf2e.resolverTeste(guerreiro, { teste: "Atletismo", alvo, motivo: "escalar" }));
    assert.equal(r.natural, 20);
    assert.equal(r.grau, "sucesso", "o 20 natural sobe de falha para sucesso");
    assert.equal(r.expressao, `1d20${r.bonus >= 0 ? "+" : ""}${r.bonus}`);
    assert.equal(r.teste, "Atletismo");
  });

  it("sorte (vantagem) vira 2d20kh1 e o detalhe fala em sorte, não em vantagem", () => {
    const r = comFaces([4, 17], () => pf2e.resolverTeste(guerreiro, { teste: "Reflexos", alvo: 15, modo: "vantagem", motivo: "desviar" }));
    assert.equal(r.natural, 17);
    assert.match(r.expressao, /^2d20kh1/);
    assert.match(r.detalhes ?? "", /^sorte \(maior de 2d20\): 4 e 17/);
  });

  it("graus de sucesso do PF2e: ±10 da CD", () => {
    const bonus = calcular(guerreiro, "Atletismo").bonus;
    // 18 + bônus = CD + 10 → sucesso crítico (sem precisar do 20 natural)
    const critico = comFaces([18], () => pf2e.resolverTeste(guerreiro, { teste: "Atletismo", alvo: bonus + 8, motivo: "" }));
    assert.equal(critico.grau, "sucesso_critico");
    // 2 + bônus = CD − 11 → falha crítica (sem o 1 natural)
    const falhaCritica = comFaces([2], () => pf2e.resolverTeste(guerreiro, { teste: "Atletismo", alvo: bonus + 13, motivo: "" }));
    assert.equal(falhaCritica.grau, "falha_critica");
    // 1 natural desce um grau: 1 + bônus = CD − 1 seria falha, vira falha crítica
    const umNatural = comFaces([1], () => pf2e.resolverTeste(guerreiro, { teste: "Atletismo", alvo: bonus + 2, motivo: "" }));
    assert.equal(umNatural.grau, "falha_critica");
  });
});
