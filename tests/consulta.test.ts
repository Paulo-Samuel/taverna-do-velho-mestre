import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// Bestiário e tabelas sob demanda (W18: P98 e P99): consultar_bestiario e sortear_tabela, em src/lib/mestre/ferramentas/consulta.ts.
// Como no golden, o processo troca para uma pasta temporária antes de importar: o SQLite aberto pelas mensagens de dado é um banco
// vazio descartável, nunca o data/ do jogador.
//   node --test tests/consulta.test.ts   (sozinho, liga o carregador; pelo npm test ele já vem do --import)

if (!process.execArgv.some((a) => a.includes("registrar.mjs"))) await import("./_suporte/registrar.mjs");

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(mkdtempSync(path.join(tmpdir(), "taverna-consulta-")));
const importar = (rel: string) => import(pathToFileURL(path.join(RAIZ, rel)).href);

const consulta = await importar("src/lib/mestre/ferramentas/consulta.ts");
const { definirFerramentas, executarFerramenta } = await importar("src/lib/mestre/ferramentas/index.ts");
const { SISTEMAS } = await importar("src/lib/sistemas/index.ts");
const { definirGerador } = await importar("src/lib/dados.ts");
const { normalizar } = await importar("src/lib/sistemas/comum.ts");
const db = await importar("src/lib/db.ts");
const { faces, semente } = await importar("tests/_suporte/dados-fixos.ts");

type Criatura = { nome: string; apelidos?: string[]; nivel: number; tipo: string; defesa: number; pv: number; ataques: string };
type Tabela = { id: string; nome: string; filtro?: string; grupos: { chave: string; entradas: string[] }[] };
type Def = { name: string; description: string; input_schema: { properties: Record<string, { enum?: string[] }> } };

const LIMITE = consulta.LIMITE_RETORNO as number;
const FANTASIA = ["pf2e", "dnd5e", "osr"];

afterEach(() => definirGerador(null));

describe("bestiário", () => {
  it("20 a 30 criaturas por sistema de fantasia e os adversários do Vampiro", () => {
    for (const id of FANTASIA) {
      const n = (consulta.bestiarioDe(id) as Criatura[]).length;
      assert.ok(n >= 20 && n <= 30, `${id}: ${n} criaturas`);
    }
    const v5 = (consulta.bestiarioDe("vtm5") as Criatura[]).map((c) => normalizar(c.nome));
    for (const esperado of ["carnical", "mortal armado", "segunda inquisicao", "recem-abracado", "neofito", "ancila", "anciao", "lupino"]) {
      assert.ok(v5.some((n) => n.includes(esperado)), `vtm5 sem ${esperado}`);
    }
    assert.equal(consulta.bestiarioDe("fate"), null);
  });

  it("todo bloco cabe inteiro no limite (nada é cortado)", () => {
    for (const id of [...FANTASIA, "vtm5"]) {
      for (const c of consulta.bestiarioDe(id) as Criatura[]) {
        const bloco = consulta.blocoCriatura(id, c) as string;
        assert.ok(bloco.length <= LIMITE, `${id}/${c.nome}: ${bloco.length} caracteres`);
      }
    }
  });

  it("nomes sem repetição dentro do sistema", () => {
    for (const id of [...FANTASIA, "vtm5"]) {
      const nomes = (consulta.bestiarioDe(id) as Criatura[]).map((c) => normalizar(c.nome));
      assert.equal(new Set(nomes).size, nomes.length, id);
    }
  });

  it("PF2e: CA e PV na escala do nível (construção moderada, com folga para ponto forte e fraco)", () => {
    const PV: Record<number, number> = { [-1]: 8, 0: 15, 1: 20, 2: 30, 3: 45, 4: 60, 5: 75, 6: 95, 7: 115, 8: 135, 9: 155, 10: 175, 11: 195, 12: 215 };
    for (const c of consulta.bestiarioDe("pf2e") as Criatura[]) {
      const ca = 14.5 + 1.5 * c.nivel;
      assert.ok(Math.abs(c.defesa - ca) <= 4, `${c.nome}: CA ${c.defesa} longe de ${ca} (nível ${c.nivel})`);
      const razao = c.pv / PV[c.nivel];
      assert.ok(razao >= 0.5 && razao <= 2.1, `${c.nome}: PV ${c.pv} fora da escala do nível ${c.nivel}`);
      assert.match(c.ataques, /◆/, `${c.nome}: ataque sem custo em ações`);
    }
    // faixas do regrasParaMestre: capanga (grupo −2) CA ~14 e 15-20 PV; chefe (+2) CA 19-21 e 60-100 PV
    const goblin = (consulta.bestiarioDe("pf2e") as Criatura[]).find((c) => c.nome === "Goblin guerreiro")!;
    assert.ok(goblin.defesa >= 14 && goblin.defesa <= 16 && goblin.pv >= 12 && goblin.pv <= 20);
  });

  it("D&D: comuns em CA 12-15 e chefes até 19; OSR: PV ≈ média dos DV e CA do goblin 13", () => {
    for (const c of consulta.bestiarioDe("dnd5e") as Criatura[]) {
      assert.ok(c.defesa >= 6 && c.defesa <= 19, `${c.nome}: CA ${c.defesa}`);
      if (c.nivel <= 1) assert.ok(c.pv <= 40, `${c.nome}: PV ${c.pv} alto demais para ND ${c.nivel}`);
    }
    for (const c of consulta.bestiarioDe("osr") as Criatura[]) {
      const media = Math.max(1, c.nivel * 4.5);
      assert.ok(c.pv >= media * 0.4 && c.pv <= media * 1.6, `${c.nome}: PV ${c.pv} para ${c.nivel} DV`);
    }
    assert.equal((consulta.bestiarioDe("osr") as Criatura[]).find((c) => c.nome === "Goblin")!.defesa, 13);
  });

  it("por nome (ou apelido) devolve o bloco; por nível ou tipo até 3; nunca passa do limite", () => {
    const ogro = consulta.consultarBestiario("pf2e", { nome: "ogro" });
    assert.match(ogro.texto, /^Ogro brutamontes — criatura 3/);
    assert.match(ogro.texto, /Recordar Conhecimento \(Sociedade CD 18\)/);
    assert.match(ogro.texto, /Tática: /);
    assert.deepEqual(ogro.criaturas, ["Ogro brutamontes"]);

    const ghoul = consulta.consultarBestiario("dnd5e", { nome: "ghoul" });
    assert.match(ghoul.texto, /^Carniçal — ND 1/);

    const si = consulta.consultarBestiario("vtm5", { nome: "segunda inquisição" });
    assert.match(si.texto, /Segunda Inquisição/);
    assert.match(si.texto, /Defesa \d+ dados · Saúde \d+/);
    assert.match(si.texto, /Fuga ou acordo: /);

    const nivel = consulta.consultarBestiario("pf2e", { nivel: 5 });
    assert.equal(nivel.criaturas.length, 3);
    assert.match(nivel.texto, /Peça pelo nome/);

    const mortos = consulta.consultarBestiario("osr", { tipo: "morto-vivo" });
    assert.ok(mortos.criaturas.length > 0 && mortos.criaturas.length <= 3);

    const nada = consulta.consultarBestiario("pf2e", { nome: "tarrasque cósmico" });
    assert.match(nada.texto, /Não há "tarrasque cósmico"/);

    const indice = consulta.consultarBestiario("dnd5e", {});
    assert.match(indice.texto, /^Bestiário \(\d+\)/);

    for (const id of [...FANTASIA, "vtm5"]) {
      for (const pedido of [{}, { nivel: 1 }, { nivel: 20 }, { tipo: "humanoide" }, { nome: "vampiro" }, { nome: "x" }]) {
        assert.ok(consulta.consultarBestiario(id, pedido).texto.length <= LIMITE, `${id} ${JSON.stringify(pedido)}`);
      }
    }
    assert.throws(() => consulta.consultarBestiario("fate", { nome: "x" }), /não tem bestiário/);
  });
});

describe("tabelas", () => {
  it("cada sistema tem as próprias, sem misturar Vampiro com fantasia", () => {
    const ids = (s: string) => (consulta.tabelasDe(s) as Tabela[]).map((t) => t.id);
    for (const t of ["nome_mortal", "nome_membro", "lugar", "complicacao_caca", "boato_elysium", "quebra_mascara", "ressonancia"]) assert.ok(ids("vtm5").includes(t), t);
    assert.ok(!ids("vtm5").includes("rumor"));
    for (const t of ["rumor", "encontro", "armadilha", "tesouro", "vila"]) assert.ok(ids("dnd5e").includes(t) && ids("pf2e").includes(t), t);
    for (const t of ["tomo", "cultista", "insanidade", "objeto"]) assert.ok(ids("d100").includes(t), t);
    assert.ok(ids("fate").includes("complicacao") && ids("pbta").includes("nome"));
    // o encontro do PF2e é o próprio (cita o bestiário dele), não o genérico
    assert.match((consulta.tabelasDe("pf2e") as Tabela[]).find((t) => t.id === "encontro")!.nome, /orçamento/);
    assert.equal(consulta.tabelasDe("historia"), null);
    for (const s of ["vtm5", "pf2e", "dnd5e", "osr", "d100", "fate", "pbta", "pf1e"]) {
      for (const t of consulta.tabelasDe(s) as Tabela[]) {
        const total = t.grupos.reduce((n, g) => n + g.entradas.length, 0);
        assert.ok(total >= 10, `${s}/${t.id}: ${total} entradas`);
        for (const g of t.grupos) assert.ok(g.entradas.length >= 4, `${s}/${t.id}/${g.chave}`);
      }
    }
  });

  it("os encontros do PF2e citam criaturas que o bestiário dele tem", () => {
    const nomes = (consulta.bestiarioDe("pf2e") as Criatura[]).flatMap((c) => [c.nome, ...(c.apelidos ?? [])].map((s) => normalizar(s) as string));
    const encontro = (consulta.tabelasDe("pf2e") as Tabela[]).find((t) => t.id === "encontro")!;
    for (const g of encontro.grupos) {
      for (const e of g.entradas) {
        const n = normalizar(e);
        assert.ok(nomes.some((x) => n.includes(x) || n.includes(x.replace(/o$/, "os")) || n.includes(x.replace(/l$/, "is"))), `encontro sem criatura do bestiário: ${e}`);
      }
    }
  });

  it("o servidor sorteia com o gerador injetado (faces fixas)", () => {
    definirGerador(faces([3, 1]));
    const r = consulta.sortearTabela("vtm5", { tabela: "complicacao_caca" });
    assert.deepEqual(r.faces, [3]);
    assert.equal(r.resultados[0], (consulta.tabelasDe("vtm5") as Tabela[]).find((t) => t.id === "complicacao_caca")!.grupos[0].entradas[2]);
    assert.match(r.texto, /^Complicação de caça — d16: 3 → /);

    // gerador passado direto, sem mexer no global
    const a = consulta.sortearTabela("pf2e", { tabela: "rumor", quantos: 3 }, semente(7));
    const b = consulta.sortearTabela("pf2e", { tabela: "rumor", quantos: 3 }, semente(7));
    assert.deepEqual(a.resultados, b.resultados);
    assert.equal(new Set(a.faces).size, 3, "quantos > 1 não repete");
  });

  it("filtros: década (\"80\"), clã, cidade, nível; obrigatório e inválido explicam as opções", () => {
    definirGerador(semente(42));
    const mortal = consulta.sortearTabela("vtm5", { tabela: "nome_mortal", filtro: "anos 80" });
    assert.equal(mortal.grupo.chave, "1980-1990");
    assert.equal(mortal.resultados[0].split(" ").length >= 2, true, "nome com sobrenome");
    assert.equal(consulta.sortearTabela("vtm5", { tabela: "nome_mortal", filtro: "1955" }).grupo.chave, "1940-1950");
    assert.equal(consulta.sortearTabela("vtm5", { tabela: "nome_membro", filtro: "Ventrue" }).grupo.chave, "ventrue");
    assert.equal(consulta.sortearTabela("vtm5", { tabela: "lugar", filtro: "São Paulo" }).grupo.chave, "sao_paulo");
    assert.equal(consulta.sortearTabela("vtm5", { tabela: "lugar", filtro: "sao_paulo" }).grupo.chave, "sao_paulo");
    assert.equal(consulta.sortearTabela("vtm5", { tabela: "ressonancia", filtro: "melancólica" }).grupo.chave, "melancolica");
    assert.equal(consulta.sortearTabela("pf2e", { tabela: "encontro", filtro: "3" }).grupo.chave, "3-4");
    assert.equal(consulta.sortearTabela("dnd5e", { tabela: "encontro", filtro: "nível 12" }).grupo.chave, "9+");
    assert.throws(() => consulta.sortearTabela("pf2e", { tabela: "encontro" }), /precisa do filtro.*nível 1/);
    assert.throws(() => consulta.sortearTabela("vtm5", { tabela: "lugar", filtro: "Atlântida" }), /Opções: São Paulo/);
    assert.throws(() => consulta.sortearTabela("vtm5", { tabela: "rumor" }), /Opções: nome_mortal/);
    // sem filtro em tabela com grupos: sorteia em todos
    assert.equal(consulta.sortearTabela("vtm5", { tabela: "nome_membro" }).grupo, null);
    for (let i = 0; i < 20; i++) assert.ok(consulta.sortearTabela("vtm5", { tabela: "boato_elysium", quantos: 5 }).texto.length <= LIMITE);
  });
});

/** Campanha-fixture (sem banco) para definirFerramentas. */
function campanhaFixture(sistema: string, id = 1) {
  return {
    id,
    nome: "Campanha (teste) da consulta",
    sistema,
    cenario: "",
    tom: "",
    resumo: "",
    resumoAte: 0,
    cena: { local: "", momento: "", clima: "", situacao: "", combate: null },
    config: { modoJogo: "avancado", dados: "jogador", modo: "livre", dificuldade: "justa", narracao: "media", sugestoes: true },
    criadaEm: "2026-01-01 20:00:00",
    atualizadaEm: "2026-01-01 20:00:00",
  };
}

describe("ferramentas do mestre", () => {
  it("aparecem só nos sistemas com dados, com o enum só do sistema da mesa", () => {
    type S = { id: string; pronto: boolean };
    for (const s of (SISTEMAS as S[]).filter((x) => x.pronto)) {
      const defs = definirFerramentas({ campanha: campanhaFixture(s.id), sistema: s, personagens: [], antes: () => {} }) as Def[];
      const nomes = defs.map((d) => d.name);
      assert.equal(nomes.includes("consultar_bestiario"), consulta.bestiarioDe(s.id) !== null, `${s.id}: consultar_bestiario`);
      assert.equal(nomes.includes("sortear_tabela"), consulta.tabelasDe(s.id) !== null, `${s.id}: sortear_tabela`);
      const tabela = defs.find((d) => d.name === "sortear_tabela");
      if (tabela) assert.deepEqual(tabela.input_schema.properties.tabela.enum, (consulta.tabelasDe(s.id) as Tabela[]).map((t) => t.id));
      const bestiario = defs.find((d) => d.name === "consultar_bestiario");
      if (bestiario) {
        assert.match(bestiario.description, /ANTES de iniciar um combate, consulte/);
        assert.ok(bestiario.input_schema.properties.tipo.enum!.length > 0);
      }
      if (tabela) assert.match(tabela.description, /em vez de inventar nome, lugar, complicação ou rumor, sorteie/);
      // subir_nivel continua por último quando existe (contrato da ordem)
      if (nomes.includes("subir_nivel")) assert.equal(nomes.at(-1), "subir_nivel");
    }
  });

  it("o resultado vira mensagem de dado: secreta por padrão, pública a pedido; retorno ≤ limite", async () => {
    const sistema = (SISTEMAS as { id: string }[]).find((s) => s.id === "vtm5");
    const id = db.criarCampanha({ nome: "Consulta (teste)", sistema: "vtm5", cenario: "", tom: "" });
    const ctx = { campanha: db.obterCampanha(id), sistema, personagens: [], antes: () => {} };

    definirGerador(faces([2]));
    const secreta = await executarFerramenta(ctx, "sortear_tabela", { tabela: "boato_elysium" });
    assert.equal(typeof secreta, "string");
    assert.ok((secreta as string).length <= LIMITE);
    definirGerador(faces([5, 1]));
    await executarFerramenta(ctx, "sortear_tabela", { tabela: "nome_mortal", filtro: "1990", publica: true });
    const bicho = await executarFerramenta(ctx, "consultar_bestiario", { nome: "carniçal" });
    assert.match(bicho as string, /^Carniçal — ameaça 2/);
    await executarFerramenta(ctx, "consultar_bestiario", { nome: "lupino", publica: true });

    const msgs = db.listarMensagens(id) as { tipo: string; texto: string; dados: Record<string, unknown> }[];
    const dados = msgs.filter((m) => m.tipo === "dado");
    assert.equal(dados.length, 4);
    const [m1, m2, m3, m4] = dados;
    assert.equal(m1.dados.secreta, true);
    assert.equal(m1.dados.descricao, undefined, "secreta não guarda o resultado");
    assert.match(m1.texto, /rolagem secreta do mestre/);
    assert.equal(m2.dados.secreta, false);
    assert.equal(m2.dados.total, 5);
    assert.match(m2.texto, /^Tabela Nome de mortal \(anos 80 e 90\): \S+ \S+/);
    assert.equal(m3.texto, "O mestre consultou o bestiário");
    assert.equal(m3.dados.secreta, true);
    assert.equal(m3.dados.criaturas, undefined, "secreta não entrega o nome");
    assert.match(m4.texto, /^Bestiário: Lupino/);

    await assert.rejects(() => executarFerramenta(ctx, "sortear_tabela", { tabela: "nome_membro", filtro: "Klingon" }), /Opções: Brujah/);
    db.excluirCampanha(id);
  });
});
