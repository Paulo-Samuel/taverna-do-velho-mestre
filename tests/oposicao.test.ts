import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { contarSucessosD10, definirGerador, rolar } from "../src/lib/dados";
import { fichaBase } from "../src/lib/sistemas/comum";
import type { Ficha } from "../src/lib/sistemas/tipos";
import { poderesDe, resolver } from "../src/lib/sistemas/vtm5/testes";
import { comprar, desfazer } from "../src/lib/sistemas/vtm5/xp";
import { comFaces } from "./_suporte/dados-fixos";

// W23: testes opostos (o servidor rola o lado do NPC; empate fica com quem resiste; a margem vira dano sugerido) e poderes
// de disciplina na ficha do Vampiro (custo, nível e parada vêm do poder; disciplina sem ponto recusa o teste).
// O registro de sistemas é importado numa pasta temporária (como em vtm5-regras): nada toca o data/ do jogador.

type Sistemas = typeof import("../src/lib/sistemas");
let sistemas: Sistemas;
let db: typeof import("../src/lib/db");
let ferramentas: typeof import("../src/lib/mestre/ferramentas");
let pasta: string;
const cwdOriginal = process.cwd();

before(async () => {
  pasta = mkdtempSync(path.join(tmpdir(), "taverna-w23-"));
  process.chdir(pasta);
  sistemas = await import("../src/lib/sistemas");
  // banco na pasta temporária (db.ts resolve data/ pelo cwd no import): nada toca as campanhas do jogador
  db = await import("../src/lib/db");
  ferramentas = await import("../src/lib/mestre/ferramentas");
});

after(() => {
  process.chdir(cwdOriginal);
  try {
    rmSync(pasta, { recursive: true, force: true });
  } catch {
    // o Windows às vezes segura a pasta por um instante
  }
});

afterEach(() => definirGerador(null));

/** Bruno: Força 3 + Briga 2 = 5 dados; Fome 0 (nenhum dado de Fome, sem Falha Bestial nem compulsão no meio). */
function bruno(disciplinas: Record<string, number> = {}, poderes: unknown[] = []): Ficha {
  const f = fichaBase("vtm5", "Bruno");
  f.atributos = { forca: 3, destreza: 2, vigor: 2, carisma: 2, manipulacao: 3, autocontrole: 2, inteligencia: 2, raciocinio: 2, determinacao: 2 };
  f.pericias = { briga: 2, intimidacao: 1 };
  f.recursos = {
    fome: { rotulo: "Fome", atual: 0, max: 5 },
    vontade: { rotulo: "Força de Vontade", atual: 4, max: 4 },
    humanidade: { rotulo: "Humanidade", atual: 7, max: 10 },
    mancha: { rotulo: "Manchas", atual: 0, max: 3 },
  };
  f.extras = { disciplinas, ...(poderes.length ? { poderes } : {}) };
  return f;
}

describe("notação Nd10s (parada de sucessos)", () => {
  it("conta 6+ e soma 2 por par de 10", () => {
    assert.equal(contarSucessosD10([1, 5, 6, 9]), 2);
    assert.equal(contarSucessosD10([10, 10, 3]), 4);
    assert.equal(contarSucessosD10([10, 10, 10]), 5);
    assert.equal(contarSucessosD10([10, 10, 10, 10]), 8);
  });

  it("5d10s com gerador fixo devolve os sucessos, não a soma", () => {
    const r = comFaces([10, 10, 6, 2, 1], () => rolar("5d10s"));
    assert.equal(r.total, 5);
    const parte = r.partes[0];
    assert.ok("valores" in parte, "a primeira parte é de dados");
    assert.deepEqual(parte.valores, [10, 10, 6, 2, 1]);
    assert.equal(parte.sucessos, true);
  });

  it("s só vale em d10 puro", () => {
    assert.throws(() => rolar("2d6s"), /d10/);
  });
});

describe("Vampiro: ataque oposto", () => {
  const ataque = (opcoes: Record<string, unknown>) => ({ teste: "Ataque", alvo: null, motivo: "soco no capanga", opcoes });

  it("mostra a parada do NPC e o empate fica com quem defende", () => {
    // Bruno: 6, 7 = 2 sucessos; Vera: 6, 8 = 2 sucessos → empate → falha
    const r = comFaces([6, 7, 2, 3, 1, 6, 8, 1, 1, 1], () => resolver(bruno(), ataque({ oposicao: { nome: "Vera", parada: 5 } })));
    assert.ok(r.oposicao, "o resultado traz o lado do NPC");
    assert.equal(r.oposicao!.nome, "Vera");
    assert.equal(r.oposicao!.expressao, "5d10");
    assert.deepEqual(r.oposicao!.dados, [6, 8, 1, 1, 1]);
    assert.equal(r.oposicao!.total, 2);
    assert.equal(r.total, 2);
    assert.equal(r.alvo, 3, "alvo = sucessos do NPC + 1");
    assert.equal(r.sucesso, false);
    assert.equal(r.dano, undefined);
    assert.match(r.avisoMestre ?? "", /Empate \(2 a 2\): fica com quem defende/);
    assert.doesNotMatch(r.avisoMestre ?? "", /arma/, "empate não vira dano, nem com a arma de ninguém");
  });

  it("defesa maior: a margem do NPC só vale se ele atacava, com a arma DELE", () => {
    // Bruno: um 6 = 1 sucesso; Vera: 6, 7, 8 = 3
    const r = comFaces([6, 1, 1, 1, 1, 6, 7, 8, 1, 1], () => resolver(bruno(), ataque({ oposicao: { nome: "Vera", parada: 5 }, arma: 2 })));
    assert.equal(r.dano, undefined);
    assert.match(r.avisoMestre ?? "", /Vera se defendeu \(3 contra 1\).*margem dele \(2\) \+ a arma DELE/);
  });

  it("a margem + arma vira dano sugerido", () => {
    // Bruno: 10, 10, 6 = 5 sucessos; Vera: um 6 = 1 → margem 4; arma 2 → 6 de dano
    const r = comFaces([10, 10, 6, 1, 1, 6, 1, 1, 1, 1], () => resolver(bruno(), ataque({ oposicao: { nome: "Vera", parada: 5 }, arma: 2 })));
    assert.equal(r.sucesso, true);
    assert.equal(r.dano?.valor, 6);
    assert.equal(r.dano?.tipo, "superficial");
    assert.match(r.dano?.texto ?? "", /margem 4 \+ arma 2/);
    assert.match(r.avisoMestre ?? "", /atualizar_cena/);
    assert.match(r.expressao, /vs Vera \(5d10 → 1\)/);
  });

  it("oposição direta no pedido (pedido.oposicao) também vale", () => {
    const r = comFaces([6, 6, 6, 1, 1, 1, 1, 1], () => resolver(bruno(), { teste: "Força + Intimidação", alvo: null, motivo: "encarar o guarda", oposicao: { nome: "o guarda", parada: 4 } }));
    assert.equal(r.oposicao?.total, 0);
    assert.equal(r.sucesso, true);
    assert.match(r.avisoMestre ?? "", /venceu o guarda/);
  });

  it("na prévia não rola o NPC: só anota contra quem é", () => {
    const r = comFaces([1, 1, 1, 1, 1], () => resolver(bruno(), { ...ataque({ oposicao: { nome: "Vera", parada: 5 } }), previa: true }));
    assert.equal(r.oposicao, undefined);
    assert.equal(r.alvo, null);
    assert.match(r.detalhes ?? "", /contra Vera \(5 dados\)/);
  });
});

describe("Vampiro: poderes de disciplina", () => {
  it("disciplina sem ponto recusa o teste com erro claro", () => {
    assert.throws(() => comFaces([1, 1, 1, 1, 1], () => resolver(bruno(), { teste: "Manipulação + Oblívio", alvo: 2, motivo: "" })), /não tem Oblívio/);
  });

  it("poder acima do nível da disciplina é recusado", () => {
    assert.throws(
      () => comFaces(Array(10).fill(1), () => resolver(bruno({ oblivio: 1 }), { teste: "Manipulação + Oblívio", alvo: 2, motivo: "", opcoes: { nivelPoder: 2, custoDespertar: 1 } })),
      /Oblívio/,
    );
  });

  it("poder da ficha com custo 0 não cobra Despertar", () => {
    const ficha = bruno({ dominacao: 1 }, [{ disciplina: "dominacao", nivel: 1, nome: "Olhar que Esquece", custo: 0, parada: "Manipulação + Dominação" }]);
    const r = comFaces([6, 6, 1, 1], () => resolver(ficha, { teste: "Olhar que Esquece", alvo: 1, motivo: "apagar a lembrança do porteiro" }));
    assert.equal(r.despertares, undefined, "sem Despertar");
    assert.equal(r.poder?.nome, "Olhar que Esquece");
    assert.match(r.teste, /Olhar que Esquece/);
    assert.equal(r.dados.length + (r.dadosFome?.length ?? 0), 4, "Manipulação 3 + Dominação 1");
  });

  it("poder com custo 1 rola um Despertar", () => {
    const ficha = bruno({ dominacao: 1 }, [{ disciplina: "dominacao", nivel: 1, nome: "Ordem Seca", custo: 1 }]);
    const r = comFaces([7, 6, 6, 1, 1], () => resolver(ficha, { teste: "Ordem Seca", alvo: 1, motivo: "" }));
    assert.equal(r.despertares?.length, 1);
  });

  it("disciplina citada só no motivo, acima do nível, recusa (Oblívio ●● com parada Força + Intimidação)", () => {
    assert.throws(
      () => comFaces(Array(10).fill(1), () => resolver(bruno({ oblivio: 1 }), { teste: "Força + Intimidação", alvo: 2, motivo: "garra de sombra de Oblívio ●● estrangula Vera" })),
      /Oblívio ●● pede Oblívio 2, e Bruno tem 1/,
    );
  });

  it("disciplina com 0 ponto citada no motivo recusa", () => {
    assert.throws(
      () => comFaces(Array(10).fill(1), () => resolver(bruno(), { teste: "Força + Intimidação", alvo: 2, motivo: "usa Dominação para mandar Vera parar" })),
      /Bruno não tem Dominação/,
    );
  });

  it("disciplina negada, resistida ou de outro dono no motivo não recusa", () => {
    for (const motivo of ["intimida sem Dominação nenhuma", "resiste à Dominação de Vera", "a Dominação de Vera tenta dobrá-lo", "contra a Presença do Príncipe", "com presença de espírito"]) {
      const r = comFaces(Array(10).fill(1), () => resolver(bruno(), { teste: "Força + Intimidação", alvo: 2, motivo }));
      assert.equal(r.despertares, undefined, motivo);
    }
  });

  it("ação mundana com nome parecido no motivo não recusa (começo de frase, apelido verbal)", () => {
    const casos: [string, string][] = [
      ["Destreza + Atletismo", "Rapidez para alcançar o carro"],
      ["Força + Briga", "Dominar o bêbado e prendê-lo no chão"],
      ["Autocontrole + Etiqueta", "Presença de espírito diante do Príncipe"],
      ["Destreza + Condução", "Ofuscar o perseguidor com o farol alto"],
      ["Vigor", "Fortitude contra o frio da madrugada"],
    ];
    for (const [teste, motivo] of casos) {
      const r = comFaces(Array(10).fill(1), () => resolver(bruno(), { teste, alvo: 2, motivo }));
      assert.equal(r.despertares, undefined, motivo);
    }
    assert.throws(() => comFaces(Array(10).fill(1), () => resolver(bruno(), { teste: "Vigor", alvo: 2, motivo: "Fortitude ●● contra o tiro" })), /não tem Fortitude/);
  });

  it("poder no motivo: palavra inteira, sem negação, sem Despertar à toa", () => {
    const ficha = bruno({ dominacao: 2 }, [
      { disciplina: "dominacao", nivel: 1, nome: "Voz", custo: 1 },
      { disciplina: "dominacao", nivel: 2, nome: "Hipnose", custo: 1 },
    ]);
    for (const motivo of ["convence sem Hipnose", "fala em voz baixa", "fala com Vozes ao fundo", "resiste à Hipnose de Vera"]) {
      const r = comFaces(Array(10).fill(6), () => resolver(ficha, { teste: "Manipulação + Persuasão", alvo: 1, motivo }));
      assert.equal(r.despertares, undefined, motivo);
      assert.equal(r.poder, undefined, motivo);
    }
    const usado = comFaces(Array(10).fill(6), () => resolver(ficha, { teste: "Manipulação + Persuasão", alvo: 1, motivo: "usa Hipnose em Vera" }));
    assert.equal(usado.poder?.nome, "Hipnose");
    assert.equal(usado.despertares?.length, 1);
  });

  it("XP em disciplina guarda o poder e o desfazer tira", () => {
    const f = bruno({ dominacao: 1 }, [{ disciplina: "dominacao", nivel: 1, nome: "Ordem Seca", custo: 1 }]);
    f.xp = 100;
    const res = comprar(f, { tipo: "disciplina", alvo: "dominacao", de: 1, poder: { nome: "Voz que Prende", nivel: 2, custo: 1 } });
    assert.ok(res.ok, res.ok ? "" : res.erro);
    if (!res.ok) return;
    assert.deepEqual(
      poderesDe(res.ficha).map((p) => p.nome),
      ["Ordem Seca", "Voz que Prende"],
    );
    const volta = desfazer(res.ficha);
    assert.ok(volta.ok);
    if (volta.ok) assert.deepEqual(poderesDe(volta.ficha).map((p) => p.nome), ["Ordem Seca"]);
  });

  it("XP recusa poder acima do nível novo", () => {
    const f = bruno({ dominacao: 1 });
    f.xp = 100;
    const res = comprar(f, { tipo: "disciplina", alvo: "dominacao", de: 1, poder: { nome: "Grande Demais", nivel: 4 } });
    assert.equal(res.ok, false);
  });

  it("criação: um poder por ponto, no nível que a ficha tem", () => {
    const f = sistemas.obterSistema("vtm5").criarFicha({
      nome: "Lia (teste)",
      ancestralidade: "gato_beco",
      classe: "lasombra",
      antecedente: "neofito",
      extras: {
        disciplinaPrincipal_lasombra: "oblivio",
        disciplinaSecundaria_lasombra: "dominacao",
        disciplinaPoderes: ["oblivio|1|1|Sombra Fria", "oblivio|2|1|Mão da Treva", "dominacao|1|0|Olhar que Esquece", "dominacao|1|1|Sobra"],
      },
    });
    const nomes = poderesDe(f).map((p) => p.nome);
    assert.deepEqual(nomes, ["Sombra Fria", "Mão da Treva", "Olhar que Esquece"]);
    assert.equal(f.extras.disciplinaPoderes, undefined);
    const texto = sistemas.obterSistema("vtm5").descreverParaMestre(f);
    assert.match(texto, /Olhar que Esquece \(●, sem custo\)/);
  });
});

describe("d20: oposicao_bonus", () => {
  it("D&D 5e: o servidor rola 1d20 + bônus do NPC e o empate fica com ele", () => {
    const sis = sistemas.obterSistema("dnd5e");
    const f = fichaBase("dnd5e", "Ana");
    // NPC: 12 + 3 = 15 (rolado antes); Ana: d20 = 15 com bônus 0 → empate → falha
    const r = comFaces([12, 15], () => sis.resolverTeste(f, { teste: "Força", alvo: null, motivo: "empurrar o capanga", oposicao: { nome: "o capanga", bonus: 3 } }));
    assert.equal(r.oposicao?.total, 15);
    assert.equal(r.oposicao?.expressao, "1d20+3");
    assert.equal(r.alvo, 16);
    assert.equal(r.sucesso, r.total >= 16);
  });

  it("PF2e: alcançar o total do NPC já é sucesso", () => {
    const sis = sistemas.obterSistema("pf2e");
    const f = fichaBase("pf2e", "Ana");
    const r = comFaces([10, 10], () => sis.resolverTeste(f, { teste: "Atletismo", alvo: null, motivo: "derrubar o guarda", oposicao: { nome: "o guarda", bonus: 2 } }));
    assert.equal(r.oposicao?.total, 12);
    assert.equal(r.alvo, 12);
  });
});

describe("ferramentas: oposição só onde o sistema rola", () => {
  function mesa(sistema: string) {
    const sis = sistemas.obterSistema(sistema);
    const id = db.criarCampanha({ nome: "Oposição (teste)", sistema, cenario: "", tom: "" });
    const p = db.criarPersonagem(id, fichaBase(sistema, `Ana ${id}`), "Paulo");
    return { campanha: db.obterCampanha(id)!, sistema: sis, personagens: [p], antes: () => {} };
  }
  const chamar = (ctx: ReturnType<typeof mesa>, nome: string, entrada: unknown) =>
    Promise.resolve().then(() => comFaces(Array(20).fill(6), () => ferramentas.executarFerramenta(ctx, nome, entrada)));

  it("sistema sem teste oposto recusa oposicao_* em vez de sumir com o alvo", async () => {
    const ctx = mesa("pf1e");
    await assert.rejects(chamar(ctx, "teste", { personagem: ctx.personagens[0].ficha.nome, teste: "Atletismo", alvo: 15, motivo: "agarrar", oposicao_bonus: 3 }), /não tem teste oposto/);
    await assert.rejects(chamar(ctx, "pedir_teste", { personagem: ctx.personagens[0].ficha.nome, teste: "Atletismo", motivo: "agarrar", oposicao_parada: 4 }), /não tem teste oposto/);
  });

  it("Vampiro com oposicao_bonus aponta oposicao_parada", async () => {
    const ctx = mesa("vtm5");
    await assert.rejects(chamar(ctx, "teste", { personagem: ctx.personagens[0].ficha.nome, teste: "Força + Briga", motivo: "empurrão", oposicao_bonus: 3 }), /oposicao_parada/);
  });

  it("D&D 5e com oposicao_parada aponta oposicao_bonus", async () => {
    const ctx = mesa("dnd5e");
    await assert.rejects(chamar(ctx, "teste", { personagem: ctx.personagens[0].ficha.nome, teste: "Atletismo", motivo: "agarrar", oposicao_parada: 3 }), /oposicao_bonus/);
  });
});
