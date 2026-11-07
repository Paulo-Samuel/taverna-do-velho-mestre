import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

// W10 (P58): trazer um personagem de outra mesa e duplicar campanha (src/lib/db.ts).
// O banco é aberto numa pasta temporária: db.ts resolve `data/` a partir do cwd no momento do import, então o chdir vem antes.

type Db = typeof import("../src/lib/db");
type Sistemas = typeof import("../src/lib/sistemas");

let db: Db;
let sistemas: Sistemas;
let pasta: string;
const cwdOriginal = process.cwd();

before(async () => {
  pasta = mkdtempSync(path.join(tmpdir(), "taverna-w10-"));
  process.chdir(pasta);
  db = await import("../src/lib/db");
  sistemas = await import("../src/lib/sistemas");
});

after(() => {
  process.chdir(cwdOriginal);
  try {
    rmSync(pasta, { recursive: true, force: true });
  } catch {
    // o Windows às vezes segura o arquivo do banco por um instante; a pasta temporária não faz falta
  }
});

function vampiro(nome: string) {
  const vtm5 = sistemas.obterSistema("vtm5");
  return vtm5.criarFicha({ nome, ancestralidade: "gato_beco", classe: "lasombra", antecedente: "neofito", extras: { estilo: "equilibrado" } });
}

function heroi(nome: string) {
  const pf2e = sistemas.obterSistema("pf2e");
  return pf2e.criarFicha({ nome, ancestralidade: pf2e.ancestralidades[0].id, classe: pf2e.classes[0].id, antecedente: pf2e.antecedentes?.[0]?.id });
}

describe("resetarFichaCopiada", () => {
  it("Vampiro chega com Saúde cheia, Fome 1, Manchas 0, sem condições e sem efeitos de sangue; XP e inventário ficam", () => {
    const f = vampiro("Samuel (teste)");
    f.pv = 1;
    f.xp = 12;
    f.condicoes = ["Frenesi (fúria)", "agravado 2"];
    f.recursos.fome.atual = 4;
    f.recursos.vontade.atual = 0;
    f.recursos.mancha.atual = 2;
    f.extras.mancha = 2;
    f.recursos.humanidade.atual = 6;
    f.recursos.mancha.max = 4;
    f.extras.surtoPendente = 2;
    f.extras.ressonancia = { tipo: "colerica", intensidade: "intensa", disciplinas: ["potencia"] };
    f.inventario.push("estaca de carvalho");

    const c = db.resetarFichaCopiada(f);
    assert.equal(c.pv, c.pvMax);
    assert.equal(c.recursos.fome.atual, 1);
    assert.equal(c.recursos.mancha.atual, 0);
    assert.equal(c.extras.mancha, 0);
    // Humanidade é quem o personagem é, não um recurso que descansa; as caixas de Manchas seguem ela
    assert.equal(c.recursos.humanidade.atual, 6);
    assert.equal(c.recursos.mancha.max, 4);
    assert.equal(c.recursos.vontade.atual, c.recursos.vontade.max);
    assert.deepEqual(c.condicoes, []);
    assert.equal("surtoPendente" in c.extras, false);
    assert.equal("ressonancia" in c.extras, false);
    assert.equal(c.xp, 12);
    assert.ok(c.inventario.includes("estaca de carvalho"));
    assert.equal(c.nome, "Samuel (teste)");
    // a original não muda
    assert.equal(f.pv, 1);
    assert.equal(f.recursos.fome.atual, 4);
  });

  it("zerarXp zera só o XP (nível fica)", () => {
    const f = vampiro("Vera (teste)");
    f.xp = 7;
    f.nivel = 2;
    const c = db.resetarFichaCopiada(f, { zerarXp: true });
    assert.equal(c.xp, 0);
    assert.equal(c.nivel, 2);
  });

  it("d100 mantém a Sanidade onde estava; Fate volta os Pontos de Destino à recarga", () => {
    const d100 = sistemas.obterSistema("d100");
    const inv = d100.criarFicha({ nome: "Ada (teste)", ancestralidade: d100.ancestralidades[0].id, classe: d100.classes[0].id, antecedente: d100.antecedentes?.[0]?.id });
    inv.recursos.san.atual = 31;
    inv.extras.sanInicioDia = 40;
    const ci = db.resetarFichaCopiada(inv);
    assert.equal(ci.recursos.san.atual, 31);
    assert.equal(ci.extras.sanInicioDia, 31);
    assert.equal(ci.pv, ci.pvMax);

    const fate = sistemas.obterSistema("fate");
    const her = fate.criarFicha({ nome: "Kai (teste)", ancestralidade: fate.ancestralidades[0].id, classe: fate.classes[0].id, antecedente: fate.antecedentes?.[0]?.id });
    her.recursos.destino.atual = 0;
    const cf = db.resetarFichaCopiada(her);
    assert.equal(cf.recursos.destino.atual, Number(her.extras.recarga));
    assert.ok(cf.recursos.destino.atual < cf.recursos.destino.max);
  });

  it("outros sistemas: PV cheio e todo recurso no máximo", () => {
    const f = heroi("Brisa (teste)");
    f.pv = 0;
    f.condicoes = ["caído"];
    for (const r of Object.values(f.recursos)) r.atual = 0;
    const c = db.resetarFichaCopiada(f);
    assert.equal(c.pv, c.pvMax);
    assert.deepEqual(c.condicoes, []);
    for (const r of Object.values(c.recursos)) assert.equal(r.atual, r.max);
  });
});

describe("copiarPersonagem e listarPersonagensCopiaveis", () => {
  it("copia para outra mesa do mesmo sistema, descansado, e recusa sistema diferente", () => {
    const origemId = db.criarCampanha({ nome: "Origem (teste)", sistema: "vtm5", cenario: "", tom: "horror pessoal" });
    const destinoId = db.criarCampanha({ nome: "Destino (teste)", sistema: "vtm5", cenario: "", tom: "horror pessoal" });
    const outroSistema = db.criarCampanha({ nome: "Fantasia (teste)", sistema: "pf2e", cenario: "", tom: "heroico" });
    const f = vampiro("Samuel (teste)");
    f.recursos.fome.atual = 3;
    f.pv = 2;
    const original = db.criarPersonagem(origemId, f, "Paulo");

    const copia = db.copiarPersonagem(original.id, destinoId, {});
    assert.ok(copia);
    assert.equal(copia.campanhaId, destinoId);
    assert.notEqual(copia.id, original.id);
    assert.equal(copia.ficha.nome, "Samuel (teste)");
    assert.equal(copia.ficha.recursos.fome.atual, 1);
    assert.equal(copia.ficha.pv, copia.ficha.pvMax);
    assert.equal(copia.jogador, "Paulo");
    // a ficha copiada é válida para o sistema: descreverParaMestre e blocosFicha não estouram
    const vtm5 = sistemas.obterSistema("vtm5");
    assert.ok(vtm5.descreverParaMestre(copia.ficha).includes("Fome [fome] 1/5"));
    assert.ok(vtm5.blocosFicha(copia.ficha).length > 0);
    // a origem continua como estava
    assert.equal(db.obterPersonagem(original.id)?.ficha.recursos.fome.atual, 3);
    assert.equal(db.listarPersonagens(origemId).length, 1);

    assert.equal(db.copiarPersonagem(original.id, outroSistema), null);
    assert.equal(db.copiarPersonagem(999999, destinoId), null);

    const copiaveis = db.listarPersonagensCopiaveis({ sistema: "vtm5" });
    assert.ok(copiaveis.some((p) => p.id === original.id && p.campanha === "Origem (teste)" && p.classe === "lasombra"));
    assert.ok(copiaveis.every((p) => p.sistema === "vtm5"));
    assert.ok(!db.listarPersonagensCopiaveis({ sistema: "vtm5", excetoCampanha: origemId }).some((p) => p.id === original.id));

    db.excluirCampanha(origemId);
    db.excluirCampanha(destinoId);
    db.excluirCampanha(outroSistema);
  });
});

describe("duplicarCampanha", () => {
  it("cria '<nome> (cópia)' com config sem PIN nem sessão, personagens descansados e sem mensagens, diário, fatos ou cena", () => {
    const id = db.criarCampanha({
      nome: "Noites longas (teste)",
      sistema: "vtm5",
      cenario: "São Paulo, 3h da manhã",
      tom: "horror pessoal",
      config: { modoJogo: "avancado", modo: "rodada", pin: "4321", sessao: 3, dificuldade: "implacavel", foco: ["intriga"], aventura: "qualquer" },
    });
    const f = vampiro("Samuel (teste)");
    f.pv = 1;
    f.xp = 5;
    db.criarPersonagem(id, f, "Paulo");
    db.criarPersonagem(id, vampiro("Vera (teste)"), "");
    db.adicionarMensagem(id, "mestre", "A noite cai.");
    db.adicionarMensagem(id, "jogador", "Eu saio do refúgio.");
    db.salvarEntradaDiario(id, { tipo: "npc", titulo: "Xerife" });
    db.criarFato(id, "O Príncipe deve um favor");
    db.salvarCena(id, { local: "Motel" });
    db.salvarResumo(id, "Muita coisa aconteceu", 2);

    const novoId = db.duplicarCampanha(id);
    assert.ok(novoId && novoId !== id);
    const nova = db.obterCampanha(novoId)!;
    assert.equal(nova.nome, "Noites longas (teste) (cópia)");
    assert.equal(nova.sistema, "vtm5");
    assert.equal(nova.cenario, "São Paulo, 3h da manhã");
    assert.equal(nova.tom, "horror pessoal");
    assert.equal(nova.config.pin, undefined);
    assert.equal(nova.config.sessao, undefined);
    assert.equal(nova.config.modo, "rodada");
    assert.equal(nova.config.dificuldade, "implacavel");
    assert.equal(nova.config.aventura, "qualquer");
    assert.deepEqual(nova.cena, {});
    assert.equal(nova.resumo, "");
    assert.equal(db.listarMensagens(novoId).length, 0);
    assert.equal(db.listarDiario(novoId).length, 0);
    assert.equal(db.listarFatos(novoId).length, 0);

    const grupo = db.listarPersonagens(novoId);
    assert.equal(grupo.length, 2);
    assert.deepEqual(
      grupo.map((p) => p.ficha.nome),
      ["Samuel (teste)", "Vera (teste)"],
    );
    assert.equal(grupo[0].ficha.pv, grupo[0].ficha.pvMax);
    assert.equal(grupo[0].ficha.xp, 5);
    assert.equal(grupo[0].jogador, "Paulo");

    // a original fica intacta
    const original = db.obterCampanha(id)!;
    assert.equal(original.config.pin, "4321");
    assert.equal(db.listarMensagens(id).length, 2);
    assert.equal(db.listarPersonagens(id)[0].ficha.pv, 1);

    // com zerarXp
    const zeradaId = db.duplicarCampanha(id, { zerarXp: true })!;
    assert.equal(db.listarPersonagens(zeradaId)[0].ficha.xp, 0);

    assert.equal(db.duplicarCampanha(999999), null);

    db.excluirCampanha(id);
    db.excluirCampanha(novoId);
    db.excluirCampanha(zeradaId);
    assert.equal(db.listarCampanhas().length, 0);
  });
});
