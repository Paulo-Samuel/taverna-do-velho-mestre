import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcular, pf2e } from "../src/lib/sistemas/pf2e";
import { CONDICOES_PF2E, lerCondicao, valorDaCondicao } from "../src/lib/sistemas/pf2e/condicoes";
import { atributosFinaisPf2, ordemDeCompletar, periciasCriacaoPf2 } from "../src/lib/sistemas/pf2e/criacao";
import { CLASSES } from "../src/lib/sistemas/pf2e/classes";
import type { Ficha } from "../src/lib/sistemas/tipos";
import { comFaces } from "./_suporte/dados-fixos";

// Regras do PF2e que o servidor aplica sozinho: moribundo/ferido, armas e dano, penalidade de ataques múltiplos (MAP),
// condições com valor (sinônimos, CA efetiva, fim do turno) e o limite de perícias da criação.

const nova = (classe: string, extra: Record<string, unknown> = {}): Ficha => pf2e.criarFicha({ nome: "Teste", ancestralidade: "humano", classe, ...extra });
const valor = (ficha: Ficha, id: string) => valorDaCondicao(ficha.condicoes, id, CONDICOES_PF2E);
const tem = (ficha: Ficha, id: string) => ficha.condicoes.some((c) => lerCondicao(c, CONDICOES_PF2E)?.def.id === id);

describe("moribundo e ferido", () => {
  it("0 PV: inconsciente + moribundo 1; cura de 5 PV tira o moribundo e deixa ferido 1", () => {
    const f = nova("guerreiro");
    const cheio = f.pv;
    f.pv = 0;
    pf2e.aposMudancaDePv!(f, cheio, "alterar_ficha");
    assert.ok(tem(f, "inconsciente"), f.condicoes.join(", "));
    assert.equal(valor(f, "moribundo"), 1);

    f.pv = 5;
    pf2e.aposMudancaDePv!(f, 0, "ajuste");
    assert.ok(!tem(f, "moribundo"), f.condicoes.join(", "));
    assert.equal(valor(f, "ferido"), 1);
  });

  it("cair de novo com ferido 1 entra em moribundo 2", () => {
    const f = nova("guerreiro");
    f.condicoes = ["ferido 1"];
    const antes = f.pv;
    f.pv = 0;
    pf2e.aposMudancaDePv!(f, antes, "alterar_ficha");
    assert.equal(valor(f, "moribundo"), 2);
  });

  it("descanso longo tira moribundo, inconsciente, amedrontado e enjoado; ferido só fica se o PV não encheu", () => {
    const f = nova("guerreiro");
    f.pv = 0;
    f.condicoes = ["inconsciente", "moribundo 1", "amedrontado 2", "enjoado 1", "ferido 1"];
    const { ficha, resumo } = pf2e.descansar(f, "longo");
    for (const id of ["moribundo", "inconsciente", "amedrontado", "enjoado"]) assert.ok(!tem(ficha, id), `${id} ficou: ${ficha.condicoes.join(", ")}`);
    assert.ok(ficha.pv > 0 && ficha.pv < ficha.pvMax, `PV ${ficha.pv}/${ficha.pvMax}`);
    assert.ok(tem(ficha, "ferido"), "com PV abaixo do máximo o ferido fica");
    assert.match(resumo, /condições que passaram/);

    // com o PV cheio no fim, o ferido sai
    const g = nova("guerreiro");
    g.pv = g.pvMax - 1;
    g.condicoes = ["ferido 2", "amedrontado 1"];
    const r = pf2e.descansar(g, "longo").ficha;
    assert.equal(r.pv, r.pvMax);
    assert.deepEqual(r.condicoes, []);
  });

  it("Tratar Ferimentos bem-sucedido tira o ferido", () => {
    const f = nova("guerreiro", { pericias: ["medicina"] });
    assert.ok((f.pericias.medicina ?? 0) >= 1, "a ficha precisa de Medicina treinada");
    f.pv = Math.max(1, f.pv - 6);
    f.condicoes = ["ferido 1"];
    const { ficha, resumo } = comFaces([20, ...Array(20).fill(1)], () => pf2e.descansar(f, "curto"));
    assert.ok(!tem(ficha, "ferido"), ficha.condicoes.join(", "));
    assert.match(resumo, /tirou o ferido/);
  });
});

describe("armas e dano", () => {
  const arqueiro = () => {
    const f = nova("guerreiro");
    f.inventario = [...f.inventario, "arco curto"];
    return f;
  };

  it("Ataque com arco curto usa DES e o dano do arco (sem FOR, distância)", () => {
    const f = arqueiro();
    const c = calcular(f, "Ataque com arco curto");
    assert.equal(c.tipo, "ataque");
    assert.match(c.rotulo, /arco curto/i);
    assert.equal(c.atributo, "des");
    assert.equal(c.dano?.expressao, "1d6");
    assert.equal(c.dano?.tipo, "perfurante");
    assert.equal(c.dano?.mortal, "1d10");
    // a espada da classe (FOR) e o arco (DES) dão bônus diferentes quando FOR ≠ DES
    if (f.atributos.for !== f.atributos.des) assert.notEqual(calcular(f, "Ataque").bonus, c.bonus);
  });

  it("acerto rola o dano; crítico dobra e soma o dado mortal", () => {
    const f = arqueiro();
    const bonus = calcular(f, "Ataque com arco curto").bonus;
    // total = alvo exato: sucesso simples (crítico só com +10)
    const acerto = comFaces([15, 4], () => pf2e.resolverTeste(f, { teste: "Ataque com arco curto", alvo: 15 + bonus, motivo: "flecha" }));
    assert.equal(acerto.grau, "sucesso");
    assert.equal(acerto.dano?.valor, 4);
    assert.match(acerto.detalhes ?? "", /acertou: 4 de dano/);

    const critico = comFaces([20, 4, 7], () => pf2e.resolverTeste(f, { teste: "Ataque com arco curto", alvo: 10, motivo: "flecha" }));
    assert.equal(critico.grau, "sucesso_critico");
    assert.equal(critico.dano?.valor, 4 * 2 + 7);
    assert.match(critico.detalhes ?? "", /crítico/);

    const erro = comFaces([1], () => pf2e.resolverTeste(f, { teste: "Ataque com arco curto", alvo: 30, motivo: "flecha" }));
    assert.equal(erro.dano, undefined);
  });

  it("sem alvo, o resultado diz o dano a rolar", () => {
    const r = comFaces([12], () => pf2e.resolverTeste(arqueiro(), { teste: "Ataque com arco curto", alvo: null, motivo: "flecha" }));
    assert.match(r.detalhes ?? "", /dano se acertar: 1d6/);
  });

  it("Ofensiva tem uma linha por arma", () => {
    const f = arqueiro();
    const ofensiva = pf2e.blocosFicha(f).find((b) => "titulo" in b && b.titulo === "Ofensiva");
    assert.ok(ofensiva && "itens" in ofensiva, "bloco Ofensiva");
    const nomes = JSON.stringify(ofensiva);
    assert.match(nomes, /Arco curto/);
    const descricao = pf2e.descreverParaMestre(f);
    assert.match(descricao, /arco curto \+\d+ \(1d6 perfurante/i);
  });
});

describe("ações e penalidade de ataques múltiplos", () => {
  const f = nova("guerreiro");
  const base = calcular(f, "Ataque").bonus;

  it("o sistema conta 3 ações por turno", () => {
    assert.equal(pf2e.combate?.acoes, 3);
  });

  it("2º ataque −5, 3º −10 (pelo contador do turno ou pelo número no texto)", () => {
    assert.equal(calcular(f, "Ataque", 0, { ataquesNoTurno: 1 }).bonus, base - 5);
    assert.equal(calcular(f, "Ataque", 0, { ataquesNoTurno: 2 }).bonus, base - 10);
    assert.equal(calcular(f, "Ataque", 0, { numeroAtaque: 2 }).bonus, base - 5);
    assert.equal(calcular(f, "Segundo ataque").bonus, base - 5);
    assert.equal(calcular(f, "Ataque", 0, { ataquesNoTurno: 1 }).ataque?.numero, 2);
  });

  it("arma ágil: −4 e −8", () => {
    const punho = calcular(f, "Ataque com punhos").bonus;
    assert.equal(calcular(f, "Ataque com punhos", 0, { ataquesNoTurno: 1 }).bonus, punho - 4);
    assert.equal(calcular(f, "Ataque com punhos", 0, { ataquesNoTurno: 2 }).bonus, punho - 8);
    assert.equal(calcular(f, "Ataque com punhos", 0, { ataquesNoTurno: 1 }).ataque?.agil, true);
  });

  it("resolverTeste devolve o número do ataque e lê as opções do pedido", () => {
    const r = comFaces([10], () => pf2e.resolverTeste(f, { teste: "Ataque", alvo: null, motivo: "golpe", opcoes: { ataquesNoTurno: 1 } }));
    assert.equal(r.ataque?.numero, 2);
    assert.equal(r.bonus, base - 5);
  });
});

describe("condições com valor", () => {
  const f = nova("guerreiro");
  const percepcao = calcular(f, "Percepção").bonus;

  it('"medo 2" e "Amedrontado II" contam como amedrontado 2', () => {
    for (const texto of ["medo 2", "Amedrontado II", "amedrontado 2"]) {
      assert.equal(lerCondicao(texto, CONDICOES_PF2E)?.def.id, "amedrontado", texto);
      assert.equal(lerCondicao(texto, CONDICOES_PF2E)?.valor, 2, texto);
      const g = { ...f, condicoes: [texto] };
      const r = comFaces([10], () => pf2e.resolverTeste(g, { teste: "Percepção", alvo: null, motivo: "olhar" }));
      assert.equal(r.bonus, percepcao - 2, texto);
    }
  });

  it("CA efetiva: amedrontado e desprevenido somam, status pega o pior", () => {
    assert.equal(pf2e.defesaComCondicoes!(18, ["amedrontado 1", "desprevenido"]).valor, 15);
    assert.equal(pf2e.defesaComCondicoes!(18, ["amedrontado 1", "enjoado 2"]).valor, 16);
    assert.equal(pf2e.defesaComCondicoes!(18, []).valor, 18);
    assert.match(pf2e.defesaComCondicoes!(18, ["medo 2"]).detalhe, /amedrontado 2/);
  });

  it("CA e CD de classe efetivas aparecem para o mestre", () => {
    const g = { ...f, condicoes: ["amedrontado 1"] };
    assert.match(pf2e.descreverParaMestre(g), new RegExp(`CA ${f.defesa - 1} \\(base ${f.defesa}`));
  });

  it("fim do turno: amedrontado baixa 1 e some no zero; enjoado fica", () => {
    const r = pf2e.fimDoTurno!(["amedrontado 2", "enjoado 1"]);
    assert.equal(valorDaCondicao(r.condicoes, "amedrontado", CONDICOES_PF2E), 1);
    assert.equal(valorDaCondicao(r.condicoes, "enjoado", CONDICOES_PF2E), 1);
    assert.equal(r.mudancas.length, 1);
    const s = pf2e.fimDoTurno!(r.condicoes);
    assert.equal(valorDaCondicao(s.condicoes, "amedrontado", CONDICOES_PF2E), 0);
  });

  it("condição com anotação vale como a canônica (parênteses, palavras depois do nome)", () => {
    const anotada = "amedrontado 2 (até o fim da cena)";
    assert.equal(lerCondicao(anotada, CONDICOES_PF2E)?.valor, 2);
    const g = { ...f, condicoes: [anotada] };
    const r = comFaces([10], () => pf2e.resolverTeste(g, { teste: "Percepção", alvo: null, motivo: "olhar" }));
    assert.equal(r.bonus, percepcao - 2);
    // cai no fim do turno e guarda a anotação
    const fim = pf2e.fimDoTurno!([anotada]);
    assert.deepEqual(fim.condicoes, ["amedrontado 1 (até o fim da cena)"]);
    assert.equal(pf2e.fimDoTurno!(fim.condicoes).condicoes.length, 0);
    // CA: desprevenido com anotação, ou escrito por outra palavra no começo
    assert.equal(pf2e.defesaComCondicoes!(18, ["desprevenido (flanqueado)"]).valor, 16);
    assert.equal(pf2e.defesaComCondicoes!(18, ["flanqueado pelos lobos"]).valor, 16);
    assert.equal(valorDaCondicao(["moribundo 2 (crítico)"], "moribundo", CONDICOES_PF2E), 2);
    assert.equal(valorDaCondicao(["amedrontado (3)"], "amedrontado", CONDICOES_PF2E), 3);
    // número no fim de uma frase não é o valor
    assert.equal(lerCondicao("enjoado até a rodada 3", CONDICOES_PF2E)?.valor, 1);
  });

  it("descanso longo tira amedrontado e moribundo anotados", () => {
    const g = nova("guerreiro");
    g.pv = 1;
    g.condicoes = ["amedrontado 2 (até o fim da cena)", "moribundo 2 (crítico)", "inconsciente"];
    const r = pf2e.descansar(g, "longo").ficha;
    for (const id of ["amedrontado", "moribundo", "inconsciente"]) assert.ok(!tem(r, id), `${id} ficou: ${r.condicoes.join(", ")}`);
  });

  it("sem falsos positivos pela raiz: 'presa' e 'ocultar' não são condições; gênero e plural continuam valendo", () => {
    assert.equal(lerCondicao("presa", CONDICOES_PF2E), null);
    assert.equal(lerCondicao("ocultar", CONDICOES_PF2E), null);
    assert.equal(lerCondicao("assustada 1", CONDICOES_PF2E)?.def.id, "amedrontado");
    assert.equal(lerCondicao("presos", CONDICOES_PF2E)?.def.id, "contido");
    assert.equal(lerCondicao("oculta", CONDICOES_PF2E)?.def.id, "oculto");
    assert.equal(lerCondicao("caída", CONDICOES_PF2E)?.def.id, "caido");
  });

  it("fatigado baixa 1 da CA", () => {
    const r = pf2e.defesaComCondicoes!(18, ["fatigado"]);
    assert.equal(r.valor, 17);
    assert.match(r.detalhe, /fatigado/);
  });

  it("a lista de condições vai para o navegador", () => {
    assert.ok(pf2e.condicoes?.some((c) => c.id === "amedrontado" && c.temValor));
  });
});

describe("perícias da criação", () => {
  it("limite = perícias da classe + INT final (+1 por fixa repetida)", () => {
    for (const classe of CLASSES) {
      const entrada = { classe: classe.id, ancestralidade: "humano" };
      const r = periciasCriacaoPf2(entrada);
      const int = atributosFinaisPf2(entrada).int;
      assert.ok(r.limite >= Math.max(0, classe.maisPericias + int), classe.id);
      assert.equal(r.int, int);
    }
  });

  it("mago com INT +4 escolhe 6", () => {
    const mago = CLASSES.find((c) => c.id === "mago")!;
    const atributos = { for: 0, des: 2, con: 1, int: 3, sab: 1, car: 0 };
    const entrada = { classe: "mago", ancestralidade: "humano", antecedente: undefined, atributos };
    const r = periciasCriacaoPf2(entrada);
    assert.equal(r.int, 4, `INT final ${r.int}`);
    assert.equal(mago.maisPericias + 4, 6);
    // 6, mais 1 se o antecedente padrão repetir uma perícia da classe
    const repetidas = r.limite - 6;
    assert.ok(repetidas >= 0 && repetidas <= 2, `limite ${r.limite}`);
    assert.match(r.conta, /\+4 de INT/);
  });

  it("fixas trazem a origem (classe, antecedente)", () => {
    const r = periciasCriacaoPf2({ classe: "mago", ancestralidade: "humano" });
    assert.ok(r.fixas.some((f) => f.origem === "Mago"), JSON.stringify(r.fixas));
    assert.ok(r.fixas.some((f) => f.origem.startsWith("antecedente ")), JSON.stringify(r.fixas));
  });

  it("a ficha completa com as sugeridas da classe, não em ordem alfabética", () => {
    const mago = CLASSES.find((c) => c.id === "mago")!;
    const ordem = ordemDeCompletar("mago");
    assert.deepEqual(ordem.slice(0, mago.sugeridas.length), mago.sugeridas.filter((id) => ordem.includes(id)));
    const ficha = nova("mago", { pericias: [] });
    const r = periciasCriacaoPf2({ classe: "mago", ancestralidade: "humano" });
    const treinadas = Object.entries(ficha.pericias).filter(([, g]) => g >= 1).length;
    assert.equal(treinadas, r.fixas.length + r.limite);
  });

  it("avisa quando faltam ou sobram perícias", () => {
    const faltam = pf2e.avisosCriacao!({ nome: "X", classe: "mago", ancestralidade: "humano", pericias: [] });
    assert.ok(faltam.some((a) => /Faltam/.test(a)), faltam.join(" | "));
    const todas = pf2e.pericias.map((p) => p.id);
    const sobram = pf2e.avisosCriacao!({ nome: "X", classe: "mago", ancestralidade: "humano", pericias: todas });
    assert.ok(sobram.some((a) => /limite/.test(a)), sobram.join(" | "));
  });

  it("o sistema publica a regra do limite", () => {
    assert.equal(pf2e.limitePericias?.somaAtributo, "int");
    assert.equal(pf2e.limitePericias?.porClasse?.mago, CLASSES.find((c) => c.id === "mago")!.maisPericias);
  });
});
