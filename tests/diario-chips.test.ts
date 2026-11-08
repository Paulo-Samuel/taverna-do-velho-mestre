import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// Diário vivo (W19): anotar_diario avisa pessoa, lugar, item e cada pista nova (chips em "o que mudou", com ícone próprio)
// e dá rosto aos NPCs (retrato determinístico em dados.retrato; NPC antigo sem retrato ganha o mesmo na leitura).
// O executor grava no banco: como no golden, o processo troca para uma pasta temporária antes de importar, nunca o data/ real.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(mkdtempSync(path.join(tmpdir(), "taverna-diario-chips-")));
const importar = (rel: string) => import(pathToFileURL(path.join(RAIZ, rel)).href);

const db = await importar("src/lib/db.ts");
const { executoresDiario, novidadesDoDiario } = await importar("src/lib/mestre/ferramentas/diario.ts");
const { montarCena, rastrearMudancas, ICONE_DIARIO } = await importar("src/components/leitor/cena.ts");
const { agruparTurnos } = await importar("src/components/leitor/turnos.ts");
const { inferirSexo, retratoDoNpc, retratoDaEntrada, gerarRetrato } = await importar("src/components/historia/retrato/dados.ts");
const { SISTEMAS } = await importar("src/lib/sistemas/index.ts");

type Msg = { id: number; tipo: string; texto: string; dados: Record<string, unknown> | null };
type Chip = { icone: string; rotulo: string; detalhe: string; tom: string; retrato?: { sexo: string } };

function novaMesa() {
  const id: number = db.criarCampanha({ nome: "Diário vivo (teste)", sistema: "historia", cenario: "", tom: "" });
  const campanha = db.obterCampanha(id);
  const sistema = (SISTEMAS as { id: string }[]).find((s) => s.id === "historia");
  const ctx = { campanha, sistema, personagens: [], antes: () => {} };
  type Entrada = { id: number; dados?: Record<string, unknown> };
  // devolve o que ficou gravado no banco (com o retrato); o retorno ao modelo vem sem retrato
  const anotar = (entrada: Record<string, unknown>) => {
    const r = executoresDiario.anotar_diario(ctx, entrada) as { entrada: Entrada; novo: boolean };
    const salvo = (db.listarDiario(id) as Entrada[]).find((x) => x.id === r.entrada.id)!;
    return { entrada: salvo, novo: r.novo, paraModelo: r.entrada };
  };
  const avisos = () => (db.listarMensagens(id) as Msg[]).filter((m) => m.tipo === "dado" && m.dados?.tipo === "diario");
  return { id, anotar, avisos };
}

/** Os chips de "o que mudou" de um turno com estas mensagens. */
function chipsDe(mensagens: Msg[]): Chip[] {
  const ms = mensagens.map((m) => ({ ...m, personagemId: null, autor: null, criadaEm: "2026-11-08 20:00:00" }));
  const turnos = agruparTurnos(ms);
  const rastro = rastrearMudancas(ms);
  return turnos.flatMap((t: unknown) => montarCena(t, rastro).mudancas.flatMap((g: { chips: Chip[] }) => g.chips));
}

describe("anotar_diario: novidades viram aviso", () => {
  it("pessoa, lugar, item e nota novos geram um aviso cada; repetir sem novidade fica mudo", () => {
    const { anotar, avisos } = novaMesa();
    anotar({ tipo: "npc", titulo: "Bruno Três-Dedos", texto: "Taverneiro.", sexo: "homem", oficio: "taverneiro" });
    anotar({ tipo: "local", titulo: "Javali Torto" });
    anotar({ tipo: "item", titulo: "Envelope lacrado" });
    anotar({ tipo: "nota", titulo: "Marca de bota com três pregos" });
    assert.deepEqual(
      avisos().map((m) => [m.dados?.subtipo, m.texto]),
      [
        ["pessoa", "Nova pessoa: Bruno Três-Dedos"],
        ["lugar", "Novo lugar: Javali Torto"],
        ["item", "Novo item: Envelope lacrado"],
        ["pista", "Pista: Marca de bota com três pregos"],
      ],
    );
    anotar({ tipo: "npc", titulo: "bruno três-dedos", voz: "rouca" });
    anotar({ tipo: "local", titulo: "Javali Torto", texto: "Fumaça de sebo." });
    assert.equal(avisos().length, 4);
  });

  it("cada pista nova da missão vira aviso próprio, comparando com as que já existiam", () => {
    const { anotar, avisos } = novaMesa();
    anotar({ tipo: "missao", titulo: "A carta do cartel", pistas: ["O lacre tem uma serpente"] });
    anotar({ tipo: "missao", titulo: "A carta do cartel", pistas: ["o lacre tem uma serpente", "O mensageiro tinha lábio cortado"] });
    anotar({ tipo: "missao", titulo: "A carta do cartel", pistas: ["O mensageiro tinha lábio cortado"] });
    assert.deepEqual(
      avisos().map((m) => m.texto),
      ["Nova missão: A carta do cartel", "Pista: O lacre tem uma serpente", "Pista: O mensageiro tinha lábio cortado"],
    );
  });

  it("NPC que muda de lado avisa; status igual não", () => {
    const { anotar, avisos } = novaMesa();
    anotar({ tipo: "npc", titulo: "Vera", status: "neutro" });
    anotar({ tipo: "npc", titulo: "Vera", status: "hostil" });
    anotar({ tipo: "npc", titulo: "Vera", status: "inimiga" });
    assert.deepEqual(
      avisos().map((m) => m.texto),
      ["Nova pessoa: Vera", "Vera: hostil"],
    );
  });

  it("novidadesDoDiario é pura e ignora pistas repetidas na mesma chamada", () => {
    const antes = { id: 1, tipo: "missao", titulo: "M", texto: "", status: "aberta", dados: { pistas: ["a"] }, atualizadoEm: "" };
    const nova = { ...antes, dados: { pistas: ["a", "b", "B "] } };
    assert.deepEqual(novidadesDoDiario(antes, nova), [{ rotulo: "Pista", subtipo: "pista", pista: "b" }]);
  });
});

describe("retrato dos NPCs", () => {
  it("NPC novo ganha retrato com o sexo informado; sem sexo, inferido pelo nome", () => {
    const { anotar } = novaMesa();
    const ela = anotar({ tipo: "npc", titulo: "Hesper Vanko", sexo: "mulher", oficio: "guarda" }).entrada.dados ?? {};
    assert.equal((ela.retrato as { sexo: string }).sexo, "mulher");
    assert.equal(ela.sexo, "mulher");
    assert.equal(ela.oficio, "guarda");
    const ele = anotar({ tipo: "npc", titulo: "Dom Ramiro", texto: "Fidalgo falido." }).entrada.dados ?? {};
    assert.equal((ele.retrato as { sexo: string }).sexo, "homem");
    const berta = anotar({ tipo: "npc", titulo: "Berta, a taverneira" }).entrada.dados ?? {};
    assert.equal((berta.retrato as { sexo: string }).sexo, "mulher");
  });

  it("o retrato fica no banco mas não volta ao modelo", () => {
    const { anotar } = novaMesa();
    const r = anotar({ tipo: "npc", titulo: "Bruno Três-Dedos", texto: "Careca.", sexo: "homem", oficio: "taverneiro" });
    assert.ok(r.entrada.dados?.retrato);
    assert.equal(r.paraModelo.dados?.retrato, undefined);
    assert.equal(r.paraModelo.dados?.sexo, "homem");
    assert.equal(r.paraModelo.dados?.oficio, "taverneiro");
  });

  it("o retrato não muda ao atualizar o NPC, só quando sexo ou ofício mudam", () => {
    const { anotar } = novaMesa();
    const r1 = anotar({ tipo: "npc", titulo: "Ilsa", oficio: "ladra" }).entrada.dados?.retrato;
    const r2 = anotar({ tipo: "npc", titulo: "Ilsa", voz: "baixa", status: "aliada" }).entrada.dados?.retrato;
    assert.deepEqual(r2, r1);
    const r3 = anotar({ tipo: "npc", titulo: "Ilsa", oficio: "sacerdotisa" }).entrada.dados?.retrato as { classe: string };
    assert.equal(r3.classe, "sacerdotisa");
  });

  it("é determinístico e NPC antigo sem retrato ganha o mesmo na leitura", () => {
    assert.deepEqual(retratoDoNpc("Bruno Três-Dedos", { sexo: "homem" }), retratoDoNpc("bruno tres-dedos", { sexo: "homem" }));
    const antigo = { titulo: "Salteadores da estrada velha", texto: "Facas ruins.", dados: { relacao: "hostil" } };
    const lido = retratoDaEntrada(antigo);
    assert.deepEqual(lido, retratoDoNpc(antigo.titulo, { texto: antigo.texto }));
    assert.ok(lido.pele && lido.rosto);
    // retrato salvo vence; lixo no lugar do retrato não quebra
    const salvo = gerarRetrato("x", { sexo: "mulher" });
    assert.deepEqual(retratoDaEntrada({ titulo: "Qualquer", dados: { retrato: salvo } }), salvo);
    assert.ok(retratoDaEntrada({ titulo: "Qualquer", dados: { retrato: "quebrado" } }).rosto);
  });

  it("raça só quando o texto diz; ofício solto no texto escolhe o figurino", () => {
    assert.equal(retratoDoNpc("Ana Lima", { texto: "Vende peixe no mercado e tem bom coração." }).origem, "humano");
    assert.equal(retratoDoNpc("Thorin", { texto: "Um anão ferreiro." }).origem, "anao");
    assert.equal(retratoDoNpc("Bruno", { texto: "Taverneiro, ex-soldado." }).classe, "mercenario");
    assert.equal(retratoDoNpc("Ana Lima", { texto: "Vende peixe no mercado e tem bom coração." }).classe, "aldeao");
  });

  it("inferirSexo: títulos, aposto e terminação", () => {
    assert.equal(inferirSexo("Irmã Celeste"), "mulher");
    assert.equal(inferirSexo("Dona Flor"), "mulher");
    assert.equal(inferirSexo("Padre Inácio"), "homem");
    assert.equal(inferirSexo("Marta"), "mulher");
    assert.equal(inferirSexo("Rodrigo Alves"), "homem");
    assert.equal(inferirSexo("a velha do moinho"), "mulher");
    assert.equal(inferirSexo("Hesper Vanko"), null);
  });
});

describe("chips do diário em 'o que mudou'", () => {
  it("cada novidade tem ícone próprio e tom neutro; pessoa vem com rosto", () => {
    const { id, anotar } = novaMesa();
    db.adicionarMensagem(id, "jogador", "Entro na taverna.");
    anotar({ tipo: "npc", titulo: "Irmã Celeste", sexo: "mulher", oficio: "sacerdotisa" });
    anotar({ tipo: "npc", titulo: "Rodrigo", sexo: "homem" });
    anotar({ tipo: "npc", titulo: "Hesper Vanko" });
    anotar({ tipo: "local", titulo: "Capela do sino" });
    anotar({ tipo: "item", titulo: "Chave de ferro" });
    anotar({ tipo: "missao", titulo: "A carta", pistas: ["Cheiro de cravo"] });
    const chips = chipsDe(db.listarMensagens(id) as Msg[]);
    assert.deepEqual(
      chips.map((c) => [c.icone, c.rotulo, c.tom]),
      [
        [ICONE_DIARIO.pessoa, "Nova pessoa: Irmã Celeste", "neutro"],
        [ICONE_DIARIO.pessoa, "Nova pessoa: Rodrigo", "neutro"],
        [ICONE_DIARIO.pessoa, "Nova pessoa: Hesper Vanko", "neutro"],
        [ICONE_DIARIO.lugar, "Novo lugar: Capela do sino", "neutro"],
        [ICONE_DIARIO.item, "Novo item: Chave de ferro", "neutro"],
        [ICONE_DIARIO.missao, "Nova missão: A carta", "neutro"],
        [ICONE_DIARIO.pista, "Pista: Cheiro de cravo", "neutro"],
      ],
    );
    assert.equal(chips[0].retrato?.sexo, "mulher");
    assert.equal(chips[1].retrato?.sexo, "homem");
    assert.ok(chips[2].retrato);
    assert.equal(chips[3].retrato, undefined);
    assert.match(chips[6].detalhe, /A carta/);
  });

  it("mensagem antiga de missão (sem subtipo) continua igual, com tom pelo status", () => {
    const base = { tipo: "diario", rotulo: "Missão concluída", resumo: "Missão concluída: X", entrada: { tipo: "missao", titulo: "X", status: "concluida" } };
    const chips = chipsDe([
      { id: 1, tipo: "jogador", texto: "Ação", dados: null },
      { id: 2, tipo: "dado", texto: "Missão concluída: X", dados: base },
    ]);
    assert.deepEqual(
      chips.map((c) => [c.icone, c.rotulo, c.tom]),
      [["❡", "Missão concluída: X", "bom"]],
    );
  });
});
