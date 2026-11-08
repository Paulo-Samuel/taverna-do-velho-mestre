import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

// W17 (P56): editar a ficha depois de criada (src/lib/editar-ficha.ts + salvarFicha). Só a parte narrativa muda; as chaves
// mecânicas de extras (disciplinas, Manchas, Surto, ressonância, XP gasto) e os números ficam como estavam.
// O banco é aberto numa pasta temporária: db.ts resolve `data/` a partir do cwd no momento do import, então o chdir vem antes.

type Db = typeof import("../src/lib/db");
type Sistemas = typeof import("../src/lib/sistemas");
type Edicao = typeof import("../src/lib/editar-ficha");

let db: Db;
let sistemas: Sistemas;
let ed: Edicao;
let pasta: string;
const cwdOriginal = process.cwd();

before(async () => {
  pasta = mkdtempSync(path.join(tmpdir(), "taverna-w17-"));
  process.chdir(pasta);
  db = await import("../src/lib/db");
  sistemas = await import("../src/lib/sistemas");
  ed = await import("../src/lib/editar-ficha");
});

after(() => {
  process.chdir(cwdOriginal);
  try {
    rmSync(pasta, { recursive: true, force: true });
  } catch {
    // o Windows às vezes segura o arquivo do banco por um instante
  }
});

function vampiro(nome: string) {
  const vtm5 = sistemas.obterSistema("vtm5");
  const f = vtm5.criarFicha({ nome, ancestralidade: "gato_beco", classe: "lasombra", antecedente: "neofito", extras: { estilo: "equilibrado", senhor: "desconhecido" } });
  // como fica a ficha do Samuel depois de semanas de mesa: Manchas, Surto pendente, ressonância e XP gasto
  f.extras.mancha = 2;
  f.extras.surtoPendente = 1;
  f.extras.ressonancia = { tipo: "colerica", intensidade: "intensa", disciplinas: ["potencia"] };
  f.extras.gastosXp = [{ tipo: "atributo", alvo: "forca", custo: 10 }];
  f.extras.conviccoes = ["Livre para o mestre"];
  return f;
}

function formulario(campos: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
}

/** O formulário como a página manda: tudo o que já estava, com as trocas pedidas por cima. */
function formularioDaFicha(f: ReturnType<typeof vampiro>, opcoes: ReturnType<Edicao["opcoesEditaveis"]>, trocas: Record<string, string | string[]>) {
  const iniciais = ed.extrasIniciais(f, opcoes);
  const campos: Record<string, string | string[]> = { nome: f.nome, jogador: "", historia: f.historia };
  for (const [k, v] of Object.entries(iniciais)) campos[`extra_${k}`] = v;
  return formulario({ ...campos, ...trocas });
}

describe("opcoesEditaveis", () => {
  it("no Vampiro oferece só a parte narrativa (sem estilo, perícias, disciplinas nem recursos)", () => {
    const vtm5 = sistemas.obterSistema("vtm5");
    const f = vampiro("Samuel (teste)");
    const ids = ed.opcoesEditaveis(vtm5.opcoesCriacao, f).map((o) => o.id);
    for (const id of ["conceito", "ambicao", "desejo", "senhor", "seita", "conviccoes", "pedrasToque", "vantagens", "defeitos", "especialidades"]) assert.ok(ids.includes(id), id);
    for (const id of ids) assert.ok(!/^(estilo|recursos|pericias_|disciplina)/.test(id), `não devia editar ${id}`);
  });

  it("respeita a classe da ficha e não oferece listas que valem como regra (magias do 5e)", () => {
    const dnd = sistemas.obterSistema("dnd5e");
    const ids = ed.opcoesEditaveis(dnd.opcoesCriacao, { classe: "mago", ancestralidade: "" }).map((o) => o.id);
    assert.ok(!ids.includes("magias"));
    assert.ok(!ids.includes("divindade"), "divindade é só de clérigo e paladino");
    assert.ok(ed.opcoesEditaveis(dnd.opcoesCriacao, { classe: "clerigo", ancestralidade: "" }).some((o) => o.id === "divindade"));
  });
});

describe("aplicarEdicao", () => {
  it("troca Convicções, Pedras de Toque e Senhor sem apagar disciplinas, Manchas, Surto nem ressonância", () => {
    const vtm5 = sistemas.obterSistema("vtm5");
    const f = vampiro("Samuel (teste)");
    const opcoes = ed.opcoesEditaveis(vtm5.opcoesCriacao, f);
    const antes = structuredClone(f);
    const r = ed.aplicarEdicao(
      f,
      opcoes,
      formularioDaFicha(f, opcoes, {
        extra_conviccoes: ["Nunca abandonar quem me pede socorro", ""],
        extra_pedrasToque: ["Irmã Clara, do abrigo (Nunca abandonar quem me pede socorro)"],
        extra_senhor: "Dona Iracema, a do cartório",
        historia: "Ex-enfermeiro do plantão noturno.",
      }),
    );
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual(r.ficha.extras.conviccoes, ["Nunca abandonar quem me pede socorro"]);
    assert.deepEqual(r.ficha.extras.pedrasToque, ["Irmã Clara, do abrigo (Nunca abandonar quem me pede socorro)"]);
    assert.equal(r.ficha.extras.senhor, "Dona Iracema, a do cartório");
    assert.equal(r.ficha.historia, "Ex-enfermeiro do plantão noturno.");
    assert.deepEqual(r.mudancas, ["senhor", "convicções", "pedras de toque", "história"]);
    // o que é mecânico continua igual, chave por chave
    for (const chave of ["disciplinas", "mancha", "surtoPendente", "ressonancia", "gastosXp", "estilo", "geracao", "notasCriacao", "vantagens", "defeitos", "especialidades"]) {
      assert.deepEqual(r.ficha.extras[chave], antes.extras[chave], chave);
    }
    assert.deepEqual(r.ficha.atributos, antes.atributos);
    assert.deepEqual(r.ficha.pericias, antes.pericias);
    assert.deepEqual(r.ficha.recursos, antes.recursos);
    assert.equal(r.ficha.pv, antes.pv);
    // a original não foi tocada (a ação só grava se tudo der certo)
    assert.deepEqual(f, antes);
  });

  it("mesmos limites da criação: nome obrigatório e cortado em 60, texto em 240, lista no máximo da opção, seita só da lista", () => {
    const vtm5 = sistemas.obterSistema("vtm5");
    const f = vampiro("Samuel (teste)");
    const opcoes = ed.opcoesEditaveis(vtm5.opcoesCriacao, f);
    assert.deepEqual(ed.aplicarEdicao(f, opcoes, formularioDaFicha(f, opcoes, { nome: "  " })), { ok: false, erro: "Seu personagem precisa de um nome." });
    const r = ed.aplicarEdicao(
      f,
      opcoes,
      formularioDaFicha(f, opcoes, { nome: "N".repeat(80), extra_conceito: "x".repeat(300), extra_conviccoes: ["a", "b", "c", "d", "e"], extra_seita: "seita-inventada" }),
    );
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.ficha.nome.length, 60);
    assert.equal(String(r.ficha.extras.conceito).length, 240);
    assert.deepEqual(r.ficha.extras.conviccoes, ["a", "b", "c"]);
    assert.equal(r.ficha.extras.seita, undefined);
  });

  it("sem mudar nada, não há mudanças (nem linha no chat)", () => {
    const vtm5 = sistemas.obterSistema("vtm5");
    const f = vampiro("Samuel (teste)");
    const opcoes = ed.opcoesEditaveis(vtm5.opcoesCriacao, f);
    const r = ed.aplicarEdicao(f, opcoes, formularioDaFicha(f, opcoes, {}));
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.mudancas, []);
  });

  it("gravada pelo banco, a ficha nova chega na descrição que o mestre lê a cada turno", () => {
    const vtm5 = sistemas.obterSistema("vtm5");
    const id = db.criarCampanha({ nome: "W17 (teste)", sistema: "vtm5", cenario: "", tom: "" });
    const p = db.criarPersonagem(id, vampiro("Samuel (teste)"), "Paulo");
    const opcoes = ed.opcoesEditaveis(vtm5.opcoesCriacao, p.ficha);
    const r = ed.aplicarEdicao(p.ficha, opcoes, formularioDaFicha(p.ficha, opcoes, { jogador: p.jogador, extra_conviccoes: ["Jamais beber de criança"] }), p.jogador);
    assert.ok(r.ok);
    if (!r.ok) return;
    db.salvarFicha(p.id, r.ficha);
    const lido = db.obterPersonagem(p.id)!;
    assert.deepEqual(lido.ficha.extras.disciplinas, p.ficha.extras.disciplinas);
    assert.equal(lido.ficha.extras.mancha, 2);
    assert.equal(lido.ficha.extras.surtoPendente, 1);
    assert.deepEqual(lido.ficha.extras.ressonancia, p.ficha.extras.ressonancia);
    assert.match(vtm5.descreverParaMestre(lido.ficha), /Jamais beber de criança/);
    assert.doesNotMatch(vtm5.descreverParaMestre(lido.ficha), /Livre para o mestre/);
    assert.equal(r.jogador, "Paulo");
  });
});

describe("aplicarEdicaoHistoria", () => {
  async function heroi() {
    const { gerarRetrato } = await import("../src/components/historia/retrato/dados");
    const historia = sistemas.obterSistema("historia");
    const origem = historia.ancestralidades[0].id;
    const classe = historia.classes[0].id;
    const retrato = gerarRetrato("rosto-velho", { sexo: "mulher", origem, classe });
    const f = historia.criarFicha({ nome: "Lia (teste)", ancestralidade: origem, classe, historia: "Fugiu do convento.", extras: { sexo: "mulher", aparencia: "olhos cansados", retrato } });
    return { f, gerarRetrato, origem, classe };
  }

  it("troca nome, aparência, história e rosto; sexo, origem e ofício ficam", async () => {
    const { f, gerarRetrato, origem, classe } = await heroi();
    // um rosto feito com outra origem e outro sexo: o servidor veste a origem e o ofício da ficha
    const novo = gerarRetrato("rosto-novo", { sexo: "homem", origem: "anao", classe: "outra" });
    const r = ed.aplicarEdicaoHistoria(f, formulario({ nome: "Lia, a Queimada", aparencia: "cicatriz de fogo no braço", historia: "Fugiu do convento em chamas.", retrato: JSON.stringify(novo) }));
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.ficha.nome, "Lia, a Queimada");
    assert.equal(r.ficha.extras.aparencia, "cicatriz de fogo no braço");
    assert.equal(r.ficha.historia, "Fugiu do convento em chamas.");
    const retrato = r.ficha.extras.retrato as { sexo: string; origem: string; classe: string; pele: string };
    assert.equal(retrato.sexo, "mulher");
    assert.equal(retrato.origem, origem);
    assert.equal(retrato.classe, classe);
    assert.equal(r.ficha.extras.sexo, "mulher");
    assert.equal(r.ficha.ancestralidade, origem);
    assert.equal(r.ficha.classe, classe);
    assert.deepEqual(r.mudancas, ["nome", "aparência", "rosto", "história"]);
  });

  it("sem rosto novo, fica o retrato de antes", async () => {
    const { f } = await heroi();
    const r = ed.aplicarEdicaoHistoria(f, formulario({ nome: f.nome, aparencia: "olhos cansados", historia: f.historia, retrato: "" }));
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual(r.ficha.extras.retrato, f.extras.retrato);
    assert.deepEqual(r.mudancas, []);
  });

  it("nome curto é recusado", async () => {
    const { f } = await heroi();
    assert.equal(ed.aplicarEdicaoHistoria(f, formulario({ nome: "L" })).ok, false);
  });
});

describe("linhaDaEdicao", () => {
  it("frase curta para o chat e para o mestre", () => {
    assert.equal(ed.linhaDaEdicao("Samuel", "Samuel", ["convicções", "história"]), "Ficha de Samuel atualizada: convicções, história");
    assert.equal(ed.linhaDaEdicao("Lia", "Lia, a Queimada", ["nome"]), "Ficha de Lia (agora Lia, a Queimada) atualizada: nome");
  });
});
