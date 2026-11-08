import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { backup, DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

// W15 (P12 + P182): migrações versionadas, exportar/importar campanha, cópias do banco e lixeira.
// Tudo roda numa pasta temporária (TAVERNA_DB aponta para ela antes de importar db.ts). O banco de verdade do usuário só é
// LIDO, para fazer uma cópia temporária e migrar a cópia.

type Db = typeof import("../src/lib/db");
type Backup = typeof import("../src/lib/backup");
type Migracoes = typeof import("../src/lib/db/migracoes");

let db: Db;
let bk: Backup;
let mig: Migracoes;
let pasta: string;
const tavernaDbOriginal = process.env.TAVERNA_DB;

/** Esquema v2 "de verdade": sem diario.dados, sem personagens.notas e sem a tabela fatos. */
function bancoV2Antigo(arquivo: string) {
  const c = new DatabaseSync(arquivo);
  c.exec(`
    CREATE TABLE campanhas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, sistema TEXT NOT NULL DEFAULT 'dnd5e', cenario TEXT NOT NULL DEFAULT '',
      tom TEXT NOT NULL DEFAULT 'sombrio e debochado', resumo TEXT NOT NULL DEFAULT '', resumo_ate INTEGER NOT NULL DEFAULT 0, cena TEXT NOT NULL DEFAULT '{}',
      config TEXT NOT NULL DEFAULT '{}', criada_em TEXT NOT NULL DEFAULT (datetime('now')), atualizada_em TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE personagens (id INTEGER PRIMARY KEY AUTOINCREMENT, campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE, ficha TEXT NOT NULL,
      jogador TEXT NOT NULL DEFAULT '', ordem INTEGER NOT NULL DEFAULT 0, criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE mensagens (id INTEGER PRIMARY KEY AUTOINCREMENT, campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('mestre', 'jogador', 'dado', 'sistema')), texto TEXT NOT NULL DEFAULT '', dados TEXT, personagem_id INTEGER, autor TEXT,
      criada_em TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE fila (id INTEGER PRIMARY KEY AUTOINCREMENT, campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE, personagem_id INTEGER,
      autor TEXT NOT NULL DEFAULT '', acao TEXT NOT NULL, criada_em TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE diario (id INTEGER PRIMARY KEY AUTOINCREMENT, campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE, tipo TEXT NOT NULL,
      titulo TEXT NOT NULL, texto TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT '', atualizado_em TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE ajustes (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
    CREATE TABLE instantaneos (id INTEGER PRIMARY KEY AUTOINCREMENT, campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE, turno TEXT NOT NULL,
      entrada TEXT, acoes TEXT NOT NULL DEFAULT '[]', aberto INTEGER NOT NULL DEFAULT 0, criado_em TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO campanhas (nome, sistema) VALUES ('Antiga (teste)', 'dnd5e');
    INSERT INTO personagens (campanha_id, ficha) VALUES (1, '{"nome":"Velho","sistema":"dnd5e"}');
    INSERT INTO mensagens (campanha_id, tipo, texto) VALUES (1, 'mestre', 'Era uma vez.');
    INSERT INTO diario (campanha_id, tipo, titulo) VALUES (1, 'npc', 'Taberneiro');
    PRAGMA user_version = 2;
  `);
  c.close();
}

const colunas = (c: DatabaseSync, t: string) => (c.prepare(`SELECT name FROM pragma_table_info('${t}')`).all() as { name: string }[]).map((x) => x.name);
const versao = (c: DatabaseSync) => (c.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;

before(async () => {
  pasta = mkdtempSync(path.join(tmpdir(), "taverna-w15-"));
  mkdirSync(path.join(pasta, "data"));
  const arquivo = path.join(pasta, "data", "taverna.db");
  bancoV2Antigo(arquivo);
  process.env.TAVERNA_DB = arquivo;
  mig = await import("../src/lib/db/migracoes");
  bk = await import("../src/lib/backup");
  db = await import("../src/lib/db");
});

after(() => {
  if (tavernaDbOriginal === undefined) delete process.env.TAVERNA_DB;
  else process.env.TAVERNA_DB = tavernaDbOriginal;
  try {
    rmSync(pasta, { recursive: true, force: true });
  } catch {
    // o Windows às vezes segura o arquivo do banco por um instante; a pasta temporária não faz falta
  }
});

describe("migrações", () => {
  it("a lista é crescente e termina na versão atual", () => {
    const versoes = mig.MIGRACOES.map((m) => m.versao);
    assert.deepEqual(versoes, [...versoes].sort((a, b) => a - b));
    assert.equal(new Set(versoes).size, versoes.length);
    assert.equal(mig.VERSAO_ATUAL, versoes.at(-1));
    assert.ok(mig.VERSAO_ATUAL >= 5);
  });

  it("banco novo (versão 0) ganha todas as tabelas e colunas", () => {
    const c = new DatabaseSync(":memory:");
    assert.deepEqual(mig.aplicarMigracoes(c), mig.MIGRACOES.map((m) => m.versao));
    assert.equal(versao(c), mig.VERSAO_ATUAL);
    assert.ok(colunas(c, "diario").includes("dados"));
    assert.ok(colunas(c, "personagens").includes("notas"));
    assert.ok(colunas(c, "fatos").includes("texto"));
    // segunda vez: nada a fazer
    assert.deepEqual(mig.aplicarMigracoes(c), []);
    c.close();
  });

  it("v2 que já tem notas, dados e fatos (o banco de quem jogou antes da lista) só sobe o número, sem ALTER repetido", () => {
    const c = new DatabaseSync(":memory:");
    mig.aplicarMigracoes(c);
    c.exec("PRAGMA user_version = 2");
    c.exec("INSERT INTO campanhas (nome) VALUES ('x'); INSERT INTO fatos (campanha_id, texto) VALUES (1, 'fato')");
    assert.deepEqual(mig.aplicarMigracoes(c), [3, 4, 5]);
    assert.equal(versao(c), mig.VERSAO_ATUAL);
    assert.equal((c.prepare("SELECT COUNT(*) AS n FROM fatos").get() as { n: number }).n, 1);
    c.close();
  });

  it("banco mais novo que o código não é rebaixado", () => {
    const c = new DatabaseSync(":memory:");
    mig.aplicarMigracoes(c);
    c.exec(`PRAGMA user_version = ${mig.VERSAO_ATUAL + 3}`);
    assert.deepEqual(mig.aplicarMigracoes(c), []);
    assert.equal(versao(c), mig.VERSAO_ATUAL + 3);
    c.close();
  });

  it("migração que falha no meio volta tudo (transação) e não sobe a versão", () => {
    const c = new DatabaseSync(":memory:");
    mig.aplicarMigracoes(c);
    c.exec("PRAGMA user_version = 2; ALTER TABLE personagens RENAME TO personagens_velho");
    // sem a tabela personagens o passo 4 (ALTER personagens) falha
    assert.throws(() => mig.aplicarMigracoes(c));
    assert.equal(versao(c), 2);
    c.close();
  });

  it("abrir o banco v2 antigo pelo db.ts copia antes, migra e não perde nada", () => {
    assert.equal(db.versaoDoEsquema(), mig.VERSAO_ATUAL);
    const copias = bk.listarCopias();
    assert.equal(copias.length, 1);
    assert.equal(copias[0].motivo, "migracao");
    assert.match(copias[0].arquivo, /-migracao-v2-v\d+\.db$/);
    // a cópia é o banco do jeito que estava (v2, sem a coluna notas)
    const copia = new DatabaseSync(path.join(bk.pastaCopias(), copias[0].arquivo), { readOnly: true });
    assert.equal(versao(copia), 2);
    assert.ok(!colunas(copia, "personagens").includes("notas"));
    copia.close();
    const antiga = db.listarCampanhas().find((c) => c.nome === "Antiga (teste)")!;
    assert.ok(antiga);
    assert.equal(db.listarPersonagens(antiga.id).length, 1);
    assert.equal(db.listarMensagens(antiga.id)[0].texto, "Era uma vez.");
    assert.equal(db.lerNotas(db.listarPersonagens(antiga.id)[0].id), "");
    assert.deepEqual(db.listarFatos(antiga.id), []);
  });

  it("cópia do banco real do usuário: migra sem perder linhas (só roda se data/taverna.db existir)", async (t) => {
    const real = path.join(import.meta.dirname, "..", "data", "taverna.db");
    if (!existsSync(real)) return t.skip("sem banco do usuário nesta máquina");
    const destino = path.join(pasta, "copia-do-usuario.db");
    // só leitura no original: backup() para um arquivo temporário e todo o resto na cópia
    const fonte = new DatabaseSync(real, { readOnly: true });
    await backup(fonte, destino);
    fonte.close();
    const c = new DatabaseSync(destino);
    const contar = () =>
      Object.fromEntries(
        ["campanhas", "personagens", "mensagens", "diario", "fatos"].map((t) => [t, (c.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n]),
      );
    const antes = contar();
    const esquemaAntes = c.prepare("SELECT name, sql FROM sqlite_master ORDER BY name").all();
    mig.aplicarMigracoes(c);
    assert.equal(versao(c), mig.VERSAO_ATUAL);
    assert.deepEqual(contar(), antes);
    // o banco do usuário já tinha tudo: nenhum ALTER/CREATE novo
    assert.deepEqual(c.prepare("SELECT name, sql FROM sqlite_master ORDER BY name").all(), esquemaAntes);
    c.close();
  });
});

describe("exportar e importar campanha", () => {
  let id: number;
  let heroiId: number;
  let msgPedido: number;

  before(() => {
    id = db.criarCampanha({ nome: "Exportável (teste)", sistema: "dnd5e", cenario: "Vale", tom: "épico", config: { pin: "1234", modo: "rodada" } });
    const ficha = { nome: "Heroína", sistema: "dnd5e", pv: 10, pvMax: 10, recursos: {}, condicoes: [], extras: {}, inventario: [] } as never;
    const p = db.criarPersonagem(id, ficha, "Ana");
    heroiId = p.id;
    db.salvarNotas(p.id, "desconfiar do taberneiro");
    db.adicionarMensagem(id, "mestre", "Abertura.");
    db.adicionarMensagem(id, "jogador", "Entro na taverna.", { personagemId: p.id, autor: "Ana" });
    msgPedido = db.adicionarMensagem(id, "dado", "Teste de Percepção", {
      personagemId: p.id,
      dados: { tipo: "pedido_teste", status: "decidir", personagemId: p.id, roladoPor: "Ana", decisao: { ate: 1, campanhaId: id } },
    }).id;
    const ultima = db.adicionarMensagem(id, "mestre", "Depois do teste.");
    db.salvarResumo(id, "Resumo até o teste.", msgPedido);
    db.salvarCena(id, { titulo: "Salão", musicaDesde: ultima.id });
    db.salvarEntradaDiario(id, { tipo: "missao", titulo: "Achar o anel", status: "aberta", dados: { pistas: ["poço"] } });
    db.salvarEntradaDiario(id, { tipo: "npc", titulo: "Taberneiro", texto: "suspeito" });
    db.criarFato(id, "A Heroína tem medo de aranhas", "Ana");
    db.criarFato(id, "O anel é amaldiçoado");
  });

  it("exporta no formato versionado, sem PIN, com notas, mensagens, diário e fatos", () => {
    const a = db.exportarCampanha(id)!;
    assert.equal(a.formato, "taverna-campanha");
    assert.equal(a.versao, mig.VERSAO_ATUAL);
    assert.equal(a.campanha.config.pin, undefined);
    assert.equal(a.campanha.config.modo, "rodada");
    assert.equal(a.personagens[0].notas, "desconfiar do taberneiro");
    assert.equal(a.mensagens.length, 4);
    assert.equal(a.diario.length, 2);
    assert.deepEqual(a.fatos.map((f) => f.texto), ["A Heroína tem medo de aranhas", "O anel é amaldiçoado"]);
    assert.equal(db.exportarCampanha(id, { comPin: true })!.campanha.config.pin, "1234");
    assert.equal(db.exportarCampanha(999999), null);
  });

  it("exportar → importar preserva tudo e remapeia ids (passando por JSON, como no arquivo)", () => {
    const arquivo = JSON.parse(JSON.stringify(db.exportarCampanha(id)));
    const novo = db.importarCampanha(arquivo);
    assert.notEqual(novo, id);
    const c = db.obterCampanha(novo)!;
    assert.equal(c.nome, "Exportável (teste)");
    assert.equal(c.cenario, "Vale");
    assert.equal(c.config.pin, undefined);
    const [p] = db.listarPersonagens(novo);
    assert.notEqual(p.id, heroiId);
    assert.equal(p.ficha.nome, "Heroína");
    assert.equal(p.jogador, "Ana");
    assert.equal(db.lerNotas(p.id), "desconfiar do taberneiro");

    const antes = db.listarMensagens(id);
    const depois = db.listarMensagens(novo);
    assert.deepEqual(depois.map((m) => [m.tipo, m.texto, m.autor, m.criadaEm]), antes.map((m) => [m.tipo, m.texto, m.autor, m.criadaEm]));
    assert.equal(depois[1].personagemId, p.id);
    const pedido = depois[2].dados as { personagemId: number; roladoPor: string; decisao: { campanhaId: number } };
    assert.equal(pedido.personagemId, p.id);
    assert.equal(pedido.roladoPor, "Ana");
    assert.equal(pedido.decisao.campanhaId, novo);
    // resumo até a mensagem do teste e música desde a última: ids novos equivalentes
    assert.equal(c.resumoAte, depois[2].id);
    assert.equal(c.cena.musicaDesde, depois[3].id);

    const semId = (l: { id: number; atualizadoEm: string }[]) => l.map(({ id: _id, ...r }) => r).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    assert.deepEqual(semId(db.listarDiario(novo)), semId(db.listarDiario(id)));
    assert.deepEqual(db.listarFatos(novo).map((f) => [f.texto, f.autor, f.ordem]), db.listarFatos(id).map((f) => [f.texto, f.autor, f.ordem]));
    db.excluirCampanha(novo, { lixeira: false });
  });

  it("arquivo de versão antiga (2) é atualizado em memória antes de entrar", () => {
    const a = JSON.parse(JSON.stringify(db.exportarCampanha(id)));
    a.versao = 2;
    for (const p of a.personagens) delete p.notas;
    for (const d of a.diario) delete d.dados;
    delete a.fatos;
    const novo = db.importarCampanha(a);
    assert.equal(db.lerNotas(db.listarPersonagens(novo)[0].id), "");
    assert.deepEqual(db.listarFatos(novo), []);
    assert.equal(db.listarDiario(novo).length, 2);
    db.excluirCampanha(novo, { lixeira: false });
  });

  it("recusa arquivo de versão maior, de outro formato ou quebrado", () => {
    const a = JSON.parse(JSON.stringify(db.exportarCampanha(id)));
    assert.throws(() => db.importarCampanha({ ...a, versao: mig.VERSAO_ATUAL + 1 }), (e: Error) => e instanceof db.ErroImportacao && /mais nova/.test(e.message));
    assert.throws(() => db.importarCampanha({ ...a, formato: "outro" }), db.ErroImportacao);
    assert.throws(() => db.importarCampanha({ ...a, mensagens: "x" }), db.ErroImportacao);
    assert.throws(() => db.importarCampanha(null), db.ErroImportacao);
    const total = db.listarCampanhas().length;
    // mensagem de tipo inválido: nada entra (nem a campanha)
    assert.throws(() => db.importarCampanha({ ...a, mensagens: [{ id: 1, tipo: "hack", texto: "" }] }), db.ErroImportacao);
    assert.equal(db.listarCampanhas().length, total);
  });
});

describe("lixeira", () => {
  it("excluir grava a campanha inteira na lixeira; restaurar recria; excluir de novo volta para lá", () => {
    const id = db.criarCampanha({ nome: "Auditoria (teste)", sistema: "dnd5e", cenario: "", tom: "x", config: { pin: "9999" } });
    db.adicionarMensagem(id, "mestre", "Uma mensagem.");
    db.criarFato(id, "um fato");
    const arquivo = db.excluirCampanha(id)!;
    assert.match(arquivo, /^\d+-auditoria-teste-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
    assert.equal(db.obterCampanha(id), null);
    const item = bk.listarLixeira().find((i) => i.arquivo === arquivo)!;
    assert.equal(item.nome, "Auditoria (teste)");
    assert.equal(item.mensagens, 1);

    const novo = db.importarCampanha(bk.lerDaLixeira(arquivo));
    assert.ok(bk.removerDaLixeira(arquivo));
    const c = db.obterCampanha(novo)!;
    assert.equal(c.config.pin, "9999", "a lixeira guarda o PIN (o arquivo não sai da máquina)");
    assert.equal(db.listarMensagens(novo).length, 1);
    assert.equal(db.listarFatos(novo).length, 1);

    const outra = db.excluirCampanha(novo)!;
    assert.ok(bk.listarLixeira().some((i) => i.arquivo === outra));
    assert.ok(bk.removerDaLixeira(outra));
  });

  it("nomes de arquivo de fora não escapam da pasta da lixeira", () => {
    assert.equal(bk.lerDaLixeira("../taverna.db"), null);
    assert.equal(bk.lerDaLixeira("..\\taverna.json"), null);
    assert.equal(bk.removerDaLixeira("../copias/x.json"), false);
  });

  it("guarda só as LIXEIRA_GUARDADAS mais recentes", () => {
    const pastaL = bk.pastaLixeira();
    mkdirSync(pastaL, { recursive: true });
    for (let i = 0; i < bk.LIXEIRA_GUARDADAS + 3; i++) {
      writeFileSync(path.join(pastaL, `9${i}-velha.json`), JSON.stringify({ formato: "taverna-campanha", campanha: { nome: `v${i}` }, exportadoEm: new Date(2020, 0, 1 + i).toISOString() }));
    }
    bk.podarLixeira();
    const restantes = bk.listarLixeira();
    assert.equal(restantes.length, bk.LIXEIRA_GUARDADAS);
    assert.ok(!restantes.some((i) => i.nome === "v0"));
    for (const i of restantes) bk.removerDaLixeira(i.arquivo);
  });
});

describe("porteiro", () => {
  it("exportar, importar, /backup e /api/backup ficam só para a máquina da taverna", async (t) => {
    // porteiro.ts importa "next/server", que o Node puro não resolve sem extensão: o teste carrega pelo arquivo do Next
    let rotaLiberadaParaRede: (c: string) => boolean;
    try {
      ({ rotaLiberadaParaRede } = await import("../src/lib/rede/porteiro"));
    } catch {
      return t.skip("next/server não carrega fora do Next; a conferência por HTTP fica no teste do servidor");
    }
    assert.equal(rotaLiberadaParaRede("/api/campanhas/34/exportar"), false);
    assert.equal(rotaLiberadaParaRede("/api/campanhas/34/exportar/"), false);
    assert.equal(rotaLiberadaParaRede("/api/campanhas/importar"), false);
    assert.equal(rotaLiberadaParaRede("/api/backup"), false);
    assert.equal(rotaLiberadaParaRede("/backup"), false);
    // as rotas de jogo continuam abertas para a rede
    assert.equal(rotaLiberadaParaRede("/api/campanhas/34/livro"), true);
    assert.equal(rotaLiberadaParaRede("/mesa/34"), true);
  });
});

describe("cópias do banco", () => {
  it("cópia diária: faz uma, não repete no mesmo dia, refaz depois de 24 h e guarda só 7", async () => {
    const feita = await bk.copiaDiariaSeVencida();
    assert.ok(feita);
    assert.equal(feita.motivo, "diaria");
    assert.equal(await bk.copiaDiariaSeVencida(), null);
    assert.ok(await bk.copiaDiariaSeVencida(Date.now() + 25 * 60 * 60 * 1000));

    // a cópia abre e tem as campanhas
    const c = new DatabaseSync(path.join(bk.pastaCopias(), feita.arquivo), { readOnly: true });
    assert.ok((c.prepare("SELECT COUNT(*) AS n FROM campanhas").get() as { n: number }).n >= 1);
    c.close();

    let ultima = "";
    for (let i = 0; i < 9; i++) ultima = (await bk.copiarBanco("manual")).arquivo;
    const copias = bk.listarCopias();
    // a mais nova é a última feita (no mesmo segundo vale o número "-2", "-3"... do nome), e ela nunca é podada
    assert.equal(copias[0].arquivo, ultima);
    assert.equal(copias.filter((x) => x.motivo !== "migracao").length, bk.COPIAS_GUARDADAS);
    assert.equal(copias.filter((x) => x.motivo === "migracao").length, 1, "a cópia de antes da migração não sai com as diárias");
    assert.ok(!readdirSync(bk.pastaCopias()).some((n) => n.endsWith(".parcial")));
  });

  it("caminhoDaCopia só aceita nomes da lista", () => {
    const [primeira] = bk.listarCopias();
    assert.ok(bk.caminhoDaCopia(primeira.arquivo));
    assert.equal(bk.caminhoDaCopia("../taverna.db"), null);
    assert.equal(bk.caminhoDaCopia("taverna.db"), null);
  });

  it("compacta só com mais de 25% de páginas livres", () => {
    assert.equal(bk.compactarSePreciso(), false);
    const id = db.criarCampanha({ nome: "Inchada (teste)", sistema: "dnd5e", cenario: "", tom: "x" });
    const grande = "x".repeat(4000);
    for (let i = 0; i < 300; i++) db.adicionarMensagem(id, "mestre", grande);
    db.excluirCampanha(id, { lixeira: false });
    db.salvarAjuste("teste.checkpoint", 1);
    assert.equal(bk.compactarSePreciso(), true);
    assert.equal(bk.compactarSePreciso(), false);
  });
});
