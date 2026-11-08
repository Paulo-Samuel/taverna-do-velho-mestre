import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { definirGerador } from "../src/lib/dados";
import { fichaBase } from "../src/lib/sistemas/comum";
import type { Ficha } from "../src/lib/sistemas/tipos";
import { CLAS, COMPULSOES_GENERICAS } from "../src/lib/sistemas/vtm5/dados";
import { FIM_DE_SESSAO_VTM, motivosDeXp } from "../src/lib/sistemas/vtm5/fim";
import { rerrolarComVontade } from "../src/lib/sistemas/vtm5/forca-de-vontade";
import { aplicarManchas, compulsaoAtiva, CONDICAO_PERDIDO, defeitosDeAlimentacao, type ResultadoVtm } from "../src/lib/sistemas/vtm5/testes";
import { comFaces } from "./_suporte/dados-fixos";

// W12: regras do Vampiro V5 que o servidor passa a cobrar sozinho.
//   P19  Manchas sem caixa livre viram degeneração (no teste, no alterar_ficha e no ajuste manual), atormentado −2 em tudo
//   P28  Falha Bestial sorteia a compulsão, grava "Compulsão: X", −2 no que não a serve; cena nova e rerrolagem a tiram
//   P29  defeitos de alimentação (Exclusão de Presa, Fazendeiro) pela presa da caça
//   P31  XP do V5 é moeda (sem "marcos", sem subir_nivel); Potência só por potencia_de_sangue com motivo
//   P103 Convicção/Pedra genérica ("Livre para o mestre") recebe um par das sementes
//   P55  avisos (sem bloquear) de ficha fora do livro: atributos 5 em tudo
// O banco abre numa pasta temporária (db.ts resolve `data/` pelo cwd no import): nada toca o data/ do jogador.

type Db = typeof import("../src/lib/db");
type Sistemas = typeof import("../src/lib/sistemas");
type Ferramentas = typeof import("../src/lib/mestre/ferramentas");
// (o ajuste manual da ficha, rota /ficha, importa next/headers: fica para a validação no servidor 3302)

let db: Db;
let sistemas: Sistemas;
let ferramentas: Ferramentas;
let pasta: string;
const cwdOriginal = process.cwd();

before(async () => {
  pasta = mkdtempSync(path.join(tmpdir(), "taverna-w12-"));
  process.chdir(pasta);
  db = await import("../src/lib/db");
  sistemas = await import("../src/lib/sistemas");
  ferramentas = await import("../src/lib/mestre/ferramentas");
});

after(() => {
  process.chdir(cwdOriginal);
  try {
    rmSync(pasta, { recursive: true, force: true });
  } catch {
    // o Windows às vezes segura o arquivo do banco por um instante
  }
});

afterEach(() => definirGerador(null));

const vtm5 = () => sistemas.obterSistema("vtm5");
const muitos = (face: number, n = 60) => Array.from({ length: n }, () => face);

/** Vera: Destreza 3 + Furtividade 2 = parada 5; Fome 2; Força de Vontade 5 (Autocontrole 3 + Determinação 2); Humanidade/Manchas à escolha. */
function vera(o: { fome?: number; hum?: number; mancha?: number; vontade?: number; classe?: string } = {}): Ficha {
  const hum = o.hum ?? 7;
  const f = fichaBase("vtm5", "Vera");
  f.classe = o.classe ?? "";
  f.atributos = { forca: 2, destreza: 3, vigor: 2, carisma: 2, manipulacao: 2, autocontrole: 3, inteligencia: 2, raciocinio: 3, determinacao: 2 };
  f.pericias = { furtividade: 2, percepcao: 1 };
  f.recursos = {
    fome: { rotulo: "Fome", atual: o.fome ?? 2, max: 5 },
    vontade: { rotulo: "Força de Vontade", atual: o.vontade ?? 5, max: 5 },
    humanidade: { rotulo: "Humanidade", atual: hum, max: 10 },
    mancha: { rotulo: "Manchas", atual: o.mancha ?? 0, max: 10 - hum },
  };
  f.extras = { disciplinas: {}, mancha: o.mancha ?? 0 };
  return f;
}

const pedido = { teste: "Destreza + Furtividade", alvo: 2, motivo: "passar pelos guardas" };

// ---------- P19: Manchas e degeneração ----------

describe("Manchas e degeneração (P19)", () => {
  it("Mancha sem caixa livre baixa a Humanidade em 1 e o texto diz degeneração", () => {
    const f = vera({ hum: 6, mancha: 4 }); // 4/4: atormentado
    const x = aplicarManchas(f, 1);
    assert.equal(x.humanidadePerdida, 1);
    assert.match(x.texto, /degeneração: Humanidade 6 → 5/);
    assert.equal(f.recursos.humanidade.atual, 5);
    assert.equal(f.recursos.mancha.atual, 5);
    assert.equal(f.recursos.mancha.max, 5);
    assert.ok(f.recursos.mancha.atual <= f.recursos.mancha.max);
  });

  it("com caixa livre só marca a Mancha; enchendo, avisa atormentado", () => {
    const f = vera({ hum: 7, mancha: 1 });
    const x = aplicarManchas(f, 2);
    assert.equal(x.humanidadePerdida, 0);
    assert.equal(x.atormentado, true);
    assert.match(x.texto, /Manchas 3\/3 \(atormentado\)/);
    assert.equal(f.extras.mancha, 3);
  });

  it("Humanidade 0 marca Perdido para a Besta", () => {
    const f = vera({ hum: 1, mancha: 9 });
    aplicarManchas(f, 1);
    assert.equal(f.recursos.humanidade.atual, 0);
    assert.ok(f.condicoes.includes(CONDICAO_PERDIDO));
  });

  it("mudarRecurso do sistema: +1 Mancha com as caixas cheias degenera e devolve alerta", () => {
    const f = vera({ hum: 6, mancha: 4 });
    const r = vtm5().mudarRecurso?.(f, "mancha", 1);
    assert.ok(r);
    assert.match(r.alerta ?? "", /degeneração/);
    assert.equal(f.recursos.humanidade.atual, 5);
    // tirar Mancha continua com o caminho comum
    assert.equal(vtm5().mudarRecurso?.(f, "mancha", -1), null);
    assert.equal(vtm5().mudarRecurso?.(f, "fome", 1), null);
  });

  it("atormentado tira 2 dados de Frenesi, Remorso e Força de Vontade, com nota no cartão", () => {
    const sis = vtm5();
    const f = vera({ hum: 7, mancha: 3, vontade: 5 });
    const frenesi = comFaces(muitos(7), () => sis.resolverTeste(f, { teste: "Frenesi", motivo: "provocado" })) as ResultadoVtm;
    assert.equal(frenesi.parada, 5); // 5 + 7/3 = 7, −2
    assert.match(frenesi.detalhes ?? "", /−2 atormentado/);
    const vontade = comFaces(muitos(7), () => sis.resolverTeste(f, { teste: "Força de Vontade", alvo: 2, motivo: "resistir" })) as ResultadoVtm;
    assert.equal(vontade.parada, 3);
    assert.match(vontade.detalhes ?? "", /−2 atormentado/);
    const remorso = comFaces(muitos(7), () => sis.resolverTeste(f, { teste: "Remorso", motivo: "fim da noite" })) as ResultadoVtm;
    assert.equal(remorso.parada, 1); // mínimo 1
    assert.match(remorso.detalhes ?? "", /−2 atormentado/);
    // sem Manchas cheias, nada de −2
    const calmo = comFaces(muitos(7), () => sis.resolverTeste(vera({ hum: 7, mancha: 1 }), { teste: "Frenesi", motivo: "provocado" })) as ResultadoVtm;
    assert.equal(calmo.parada, 7);
    assert.doesNotMatch(calmo.detalhes ?? "", /atormentado/);
  });
});

// ---------- P28: compulsões ----------

describe("compulsão da Falha Bestial (P28)", () => {
  const falhaBestial = (f: Ficha, d10: number) => comFaces([2, 3, 4, 1, 5, d10], () => vtm5().resolverTeste(f, pedido)) as ResultadoVtm;

  it("Falha Bestial sorteia a compulsão (d10) e aposTeste grava 'Compulsão: X'", () => {
    const r = falhaBestial(vera(), 9);
    assert.equal(r.rotuloGrau, "Falha Bestial");
    const paranoia = COMPULSOES_GENERICAS.find((c) => c.faces.includes(9))!;
    assert.equal(r.compulsao?.nome, paranoia.nome);
    assert.match(r.detalhes ?? "", /Compulsão sorteada \(d10 9\)/);
    assert.ok(r.efeitos?.some((e) => e.texto === `Compulsão: ${paranoia.nome}`));
    const depois = vtm5().aposTeste?.(vera(), r);
    assert.ok(depois);
    assert.deepEqual(
      depois.condicoes.filter((c) => c.startsWith("Compulsão")),
      [`Compulsão: ${paranoia.nome}`],
    );
    assert.equal(compulsaoAtiva(depois), paranoia.nome);
  });

  it("10 no d10 dá a compulsão do clã", () => {
    const cla = CLAS.find((c) => c.compulsao)!;
    const r = falhaBestial(vera({ classe: cla.id }), 10);
    assert.equal(r.compulsao?.nome, cla.compulsao!.nome);
    assert.equal(r.compulsao?.doCla, true);
  });

  it("com a compulsão ativa a parada seguinte leva −2, a não ser que a ação a sirva", () => {
    const f = vera();
    f.condicoes.push(`Compulsão: ${COMPULSOES_GENERICAS[1].nome}`);
    const contra = comFaces(muitos(8), () => vtm5().resolverTeste(f, pedido)) as ResultadoVtm;
    assert.equal(contra.parada, 3);
    assert.match(contra.detalhes ?? "", /−2 compulsão/);
    assert.match(contra.avisoMestre ?? "", /−2 já descontado/);
    const serve = comFaces(muitos(8), () => vtm5().resolverTeste(f, { ...pedido, opcoes: { compulsao: "serve" } })) as ResultadoVtm;
    assert.equal(serve.parada, 5);
  });

  it("rerrolar com Força de Vontade para fora da Falha Bestial tira a compulsão sorteada", () => {
    const r = falhaBestial(vera(), 6);
    const ficha = vtm5().aposTeste!(vera(), r)!;
    assert.ok(compulsaoAtiva(ficha));
    const { resultado, ficha: nova } = comFaces([7, 8, 9], () => rerrolarComVontade(ficha, r));
    assert.notEqual(resultado.rotuloGrau, "Falha Bestial");
    assert.equal(resultado.compulsao, undefined);
    assert.equal(compulsaoAtiva(nova), null);
    assert.doesNotMatch(resultado.detalhes ?? "", /Compulsão sorteada/);
  });

  it("a compulsão que já estava volta quando a rerrolagem desfaz a Falha Bestial", () => {
    const antes = vera();
    antes.condicoes.push("Compulsão: Obsessão");
    // −2 da compulsão ativa: parada 3 = 1 dado normal + 2 de Fome; o d10 seguinte é o sorteio; dificuldade 1
    const r = comFaces([3, 1, 4, 6], () => vtm5().resolverTeste(antes, { ...pedido, alvo: 1 })) as ResultadoVtm;
    assert.equal(r.rotuloGrau, "Falha Bestial");
    const ficha = vtm5().aposTeste!(antes, r)!;
    assert.notEqual(compulsaoAtiva(ficha), "Obsessão");
    const { resultado, ficha: nova } = comFaces([8], () => rerrolarComVontade(ficha, r));
    assert.notEqual(resultado.rotuloGrau, "Falha Bestial");
    assert.equal(compulsaoAtiva(nova), "Obsessão");
    assert.equal(nova.extras.compulsaoAnterior, undefined);
  });

  it("Crítico Sujo só sorteia quando o mestre pede (compulsao 'sortear')", () => {
    const f = vera();
    const sujo = comFaces([10, 4, 3, 10, 2], () => vtm5().resolverTeste(f, pedido)) as ResultadoVtm;
    assert.equal(sujo.rotuloGrau, "Crítico Sujo");
    assert.equal(sujo.compulsao, undefined);
    const pedido2 = { ...pedido, opcoes: { compulsao: "sortear" } };
    const sorteado = comFaces([10, 4, 3, 10, 2, 4], () => vtm5().resolverTeste(f, pedido2)) as ResultadoVtm;
    assert.ok(sorteado.compulsao);
  });
});

// ---------- P29: defeitos de alimentação ----------

describe("defeitos de alimentação (P29)", () => {
  it("lê Exclusão de Presa, ignora a alternativa '(ou Exclusão…)' e reconhece Fazendeiro e Sanguessuga", () => {
    const f = vera();
    f.extras.defeitos = ["Exclusão de Presa: quem não consente ●", "Segredo Sombrio ● (ou Exclusão de Presa: policiais ●)", "Fazendeiro ●●"];
    assert.deepEqual(defeitosDeAlimentacao(f), { exclusoes: ["quem não consente"], fazendeiro: true });
    const s = vera();
    s.ancestralidade = "sanguessuga";
    assert.deepEqual(defeitosDeAlimentacao(s).exclusoes, ["mortais"]);
  });
});

// ---------- P103 e P55: criação ----------

describe("criação (P103, P55)", () => {
  it("Convicção 'Livre para o mestre' recebe um par sugerido e a nota", () => {
    const f = vtm5().criarFicha({
      nome: "Lívia (teste)",
      ancestralidade: "gato_beco",
      classe: "lasombra",
      antecedente: "neofito",
      extras: { estilo: "equilibrado", conviccoes: ["Livre para o mestre"], pedrasToque: ["a escolher"] },
    });
    const conv = f.extras.conviccoes as string[];
    const pedras = f.extras.pedrasToque as string[];
    assert.equal(conv.length, 1);
    assert.doesNotMatch(conv[0], /livre/i);
    assert.equal(pedras.length, 1);
    assert.ok(pedras[0].includes(`(${conv[0]})`), pedras[0]);
    assert.ok((f.extras.notasCriacao as string[]).some((n) => /sugeriu uma Convicção/.test(n)));
    // mesma ficha, mesmo par (prévia e criação concordam)
    const de_novo = vtm5().criarFicha({ nome: "Lívia (teste)", ancestralidade: "gato_beco", classe: "lasombra", antecedente: "neofito", extras: { conviccoes: ["Livre"] } });
    assert.deepEqual(de_novo.extras.conviccoes, conv);
  });

  it("Convicção escrita pelo jogador fica como está", () => {
    const f = vtm5().criarFicha({ nome: "Rui (teste)", ancestralidade: "gato_beco", classe: "lasombra", antecedente: "neofito", extras: { conviccoes: ["Nunca trair quem me abrigou"], pedrasToque: ["Seu Jorge, o dono da pensão"] } });
    assert.deepEqual(f.extras.conviccoes, ["Nunca trair quem me abrigou"]);
    assert.ok(!(f.extras.notasCriacao as string[]).some((n) => /sugeriu/.test(n)));
  });

  it("frases reais com 'nenhum', 'mestre', 'livre', 'qualquer' ou 'depois' não são genéricas", () => {
    const reais = ["Nenhum inocente morre pela minha mão", "Nunca obedecer a um mestre", "Ser livre acima de tudo", "Proteger qualquer criança", "Pagar depois o que devo"];
    for (const c of reais) {
      const f = vtm5().criarFicha({ nome: "Rui (teste)", ancestralidade: "gato_beco", classe: "lasombra", antecedente: "neofito", extras: { conviccoes: [c], pedrasToque: ["Seu Jorge, o dono da pensão"] } });
      assert.deepEqual(f.extras.conviccoes, [c], c);
    }
    // duas Convicções, uma vazia: a real fica e a nota diz o que saiu
    const f = vtm5().criarFicha({ nome: "Rui (teste)", ancestralidade: "gato_beco", classe: "lasombra", antecedente: "neofito", extras: { conviccoes: ["Nunca obedecer a um mestre", "a definir"], pedrasToque: ["Seu Jorge"] } });
    assert.deepEqual(f.extras.conviccoes, ["Nunca obedecer a um mestre"]);
    assert.ok((f.extras.notasCriacao as string[]).some((n) => n.includes('"a definir"')), JSON.stringify(f.extras.notasCriacao));
    // os vazios de verdade continuam caindo
    for (const v of ["Livre", "livre para o mestre", "A escolher.", "nenhuma", "qualquer uma", "sei lá", "o mestre decide", "-"]) {
      const g = vtm5().criarFicha({ nome: "Rui (teste)", ancestralidade: "gato_beco", classe: "lasombra", antecedente: "neofito", extras: { conviccoes: [v], pedrasToque: ["Seu Jorge, o dono da pensão"] } });
      assert.notDeepEqual(g.extras.conviccoes, [v], v);
    }
  });

  it("atributos 5 em tudo: aviso 'fora do livro' sem bloquear a criação", () => {
    const sis = vtm5();
    const atributos = Object.fromEntries(sis.atributos.map((a) => [a.id, 5]));
    const entrada = { nome: "Ícaro (teste)", ancestralidade: "gato_beco", classe: "lasombra", antecedente: "neofito", atributos, extras: { estilo: "equilibrado" } };
    const avisos = sis.avisosCriacao?.(entrada) ?? [];
    assert.equal(avisos.length, 1);
    assert.match(avisos[0], /Atributos fora do livro: soma 45, o padrão é 22/);
    const f = sis.criarFicha(entrada);
    assert.equal(f.atributos.forca, 5);
    // a distribuição do livro não gera aviso
    const livro = [4, 3, 3, 3, 2, 2, 2, 2, 1];
    const certo = Object.fromEntries(sis.atributos.map((a, i) => [a.id, livro[i]]));
    assert.deepEqual(sis.avisosCriacao?.({ ...entrada, atributos: certo }), []);
  });

  it("ficha marcada 'fora do livro de propósito' vira nota para o mestre", () => {
    const f = vtm5().criarFicha({ nome: "Ícaro (teste)", ancestralidade: "gato_beco", classe: "lasombra", antecedente: "neofito" });
    f.extras.foraDoLivro = true;
    assert.match(vtm5().descreverParaMestre(f), /fora do padrão de criação, por escolha do jogador/);
  });
});

// ---------- P31: XP e fim da noite ----------

describe("fim da noite (P31)", () => {
  it("o XP é moeda e os motivos citam Ambição e Convicções de quem tem", () => {
    assert.match(FIM_DE_SESSAO_VTM.xp, /moeda/);
    assert.match(FIM_DE_SESSAO_VTM.xp, /nunca suba Potência/);
    const a = vera();
    a.extras.ambicao = "tomar o Elysium";
    a.extras.conviccoes = ["não matar inocentes"];
    const b = vera();
    b.nome = "Bruno";
    assert.deepEqual(motivosDeXp([a, b]), ["Vera — Ambição: tomar o Elysium; Convicções: não matar inocentes"]);
    assert.equal(FIM_DE_SESSAO_VTM.passosExtras?.([a]).length, 1);
  });
});

// ---------- ferramentas do mestre, num banco temporário ----------

describe("ferramentas do mestre no V5", () => {
  function mesa(predador = "fazendeiro") {
    const sis = vtm5();
    const id = db.criarCampanha({ nome: "Regras V5 (teste)", sistema: "vtm5", cenario: "", tom: "" });
    const ficha = sis.criarFicha({ nome: `Teo ${id}`, ancestralidade: predador, classe: "lasombra", antecedente: "neofito" });
    // parada de caça folgada para os dados fixos passarem
    ficha.atributos.autocontrole = 4;
    ficha.atributos.manipulacao = 4;
    ficha.pericias.empatia_animais = 3;
    ficha.pericias.persuasao = 3;
    ficha.recursos.fome.atual = 3;
    const p = db.criarPersonagem(id, ficha, "Paulo");
    const ctx = { campanha: db.obterCampanha(id)!, sistema: sis, personagens: [p], antes: () => {} };
    return { ctx, p: () => ctx.personagens[0] };
  }
  const rodar = (ctx: Parameters<Ferramentas["executarFerramenta"]>[0], nome: string, entrada: unknown) => comFaces(muitos(7), () => ferramentas.executarFerramenta(ctx, nome, entrada));

  it("lista: sem subir_nivel, com potencia_de_sangue (motivo obrigatório); conceder_xp sem marcos", () => {
    const { ctx } = mesa();
    const defs = ferramentas.definirFerramentas(ctx);
    const nomes = defs.map((d) => d.name);
    assert.ok(!nomes.includes("subir_nivel"));
    const pot = defs.find((d) => d.name === "potencia_de_sangue");
    assert.ok(pot);
    assert.deepEqual((pot.input_schema as unknown as { required: string[] }).required, ["motivo"]);
    const xp = defs.find((d) => d.name === "conceder_xp")!;
    assert.doesNotMatch(xp.description, /marco/i);
    assert.match(xp.description, /JOGADOR gasta/);
    for (const nome of ["teste", "pedir_teste", "cacar"]) {
      const d = defs.find((x) => x.name === nome);
      if (!d) continue;
      const props = (d.input_schema as unknown as { properties: Record<string, unknown> }).properties;
      assert.ok(nome === "cacar" ? props.presa : props.compulsao, `${nome} sem o campo novo`);
    }
  });

  it("conceder_xp e subir_nivel não falam em marcos", async () => {
    const { ctx } = mesa();
    const r = JSON.stringify(await rodar(ctx, "conceder_xp", { personagens: "todos", quantidade: 2, motivo: "noite jogada" }));
    assert.doesNotMatch(r, /marco/i);
    assert.match(r, /o jogador gasta na ficha/);
    await assert.rejects(Promise.resolve().then(() => ferramentas.executarFerramenta(ctx, "subir_nivel", { motivo: "x" })), /potencia_de_sangue|desconhecida/);
  });

  it("potencia_de_sangue: diablerie de vítima mais fraca é recusada; décadas sobe 1 e mantém o XP", async () => {
    const { ctx, p } = mesa();
    const antes = p().ficha.nivel;
    const xp = p().ficha.xp;
    await assert.rejects(Promise.resolve().then(() => ferramentas.executarFerramenta(ctx, "potencia_de_sangue", { motivo: "diablerie", potencia_vitima: antes })), /não engrossa/);
    await assert.rejects(Promise.resolve().then(() => ferramentas.executarFerramenta(ctx, "potencia_de_sangue", {})));
    await ferramentas.executarFerramenta(ctx, "potencia_de_sangue", { motivo: "decadas", detalhe: "trinta anos em torpor" });
    assert.equal(p().ficha.nivel, antes + 1);
    assert.equal(p().ficha.xp, xp);
  });

  it("alterar_ficha: +1 Mancha com as caixas cheias devolve a degeneração", async () => {
    const { ctx, p } = mesa();
    const hum = p().ficha.recursos.humanidade.atual;
    p().ficha.recursos.mancha.atual = 10 - hum;
    p().ficha.extras.mancha = 10 - hum;
    const r = JSON.stringify(await rodar(ctx, "alterar_ficha", { recursos: { mancha: 1 }, motivo: "matou um inocente" }));
    assert.match(r, /degeneração/);
    assert.equal(p().ficha.recursos.humanidade.atual, hum - 1);
    assert.ok(p().ficha.recursos.mancha.atual <= p().ficha.recursos.mancha.max);
  });

  it("cacar: Fazendeiro precisa dizer a presa; gente custa 2 de Força de Vontade, ou é recusado", async () => {
    const { ctx, p } = mesa("fazendeiro");
    await assert.rejects(Promise.resolve().then(() => rodar(ctx, "cacar", {})), /diga a presa/);
    p().ficha.recursos.vontade.atual = 1;
    await assert.rejects(Promise.resolve().then(() => rodar(ctx, "cacar", { presa: "mortal no beco" })), /Fazendeiro/);
    p().ficha.recursos.vontade.atual = 4;
    await rodar(ctx, "cacar", { presa: "mortal no beco" });
    assert.equal(p().ficha.recursos.vontade.atual, 2);
    // bicho não custa nada
    await rodar(ctx, "cacar", { presa: "rato" });
    assert.equal(p().ficha.recursos.vontade.atual, 2);
  });

  it("cacar: presa excluída marca uma Mancha", async () => {
    const { ctx, p } = mesa("consensualista");
    assert.equal(p().ficha.recursos.mancha.atual, 0);
    await rodar(ctx, "cacar", { presa: "mortal sem consentimento" });
    assert.equal(p().ficha.recursos.mancha.atual, 1);
    await rodar(ctx, "cacar", { presa: "doadora que consente" });
    assert.equal(p().ficha.recursos.mancha.atual, 1);
  });

  it("cena nova (título) tira a compulsão; só trocar o local não tira", async () => {
    const { ctx, p } = mesa();
    p().ficha.condicoes.push("Compulsão: Paranoia");
    await ferramentas.executarFerramenta(ctx, "atualizar_cena", { local: "Beco atrás do cais" });
    assert.ok(p().ficha.condicoes.includes("Compulsão: Paranoia"));
    const r = (await ferramentas.executarFerramenta(ctx, "atualizar_cena", { titulo: "O Cais ao Amanhecer" })) as { avisos?: string[] };
    assert.ok(!p().ficha.condicoes.some((c) => c.startsWith("Compulsão")));
    assert.ok(r.avisos?.some((a) => /saiu da Compulsão: Paranoia/.test(a)));
  });
});
