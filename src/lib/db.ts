import "server-only";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import type { Cena, EntradaDiario, Ficha, TipoDiario } from "./sistemas/tipos";

// SQLite embutido no Node 24: nada de dependência nativa para compilar no Windows.
const pasta = path.join(process.cwd(), "data");
mkdirSync(pasta, { recursive: true });
const ARQUIVO = path.join(pasta, "taverna.db");
const VERSAO = 2;

const globalDb = globalThis as unknown as { __tavernaDb?: DatabaseSync };
const db = (globalDb.__tavernaDb ??= abrir());

function abrir() {
  let conexao = new DatabaseSync(ARQUIVO);
  const versao = (conexao.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  const temV1 = (conexao.prepare("SELECT name FROM pragma_table_info('campanhas') WHERE name = 'ficha'").all() as unknown[]).length > 0;
  if (versao < VERSAO && temV1) {
    // banco da primeira versão (uma ficha por campanha): guarda uma cópia e começa do zero
    conexao.close();
    const copia = path.join(pasta, `taverna-v1-${Date.now()}.db`);
    renameSync(ARQUIVO, copia);
    for (const sufixo of ["-wal", "-shm"]) if (existsSync(ARQUIVO + sufixo)) renameSync(ARQUIVO + sufixo, copia + sufixo);
    conexao = new DatabaseSync(ARQUIVO);
  }
  conexao.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS campanhas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      sistema TEXT NOT NULL DEFAULT 'dnd5e',
      cenario TEXT NOT NULL DEFAULT '',
      tom TEXT NOT NULL DEFAULT 'sombrio e debochado',
      resumo TEXT NOT NULL DEFAULT '',
      resumo_ate INTEGER NOT NULL DEFAULT 0,
      cena TEXT NOT NULL DEFAULT '{}',
      config TEXT NOT NULL DEFAULT '{}',
      criada_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizada_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS personagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      ficha TEXT NOT NULL,
      jogador TEXT NOT NULL DEFAULT '',
      ordem INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS personagens_campanha ON personagens(campanha_id, ordem, id);
    CREATE TABLE IF NOT EXISTS mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('mestre', 'jogador', 'dado', 'sistema')),
      texto TEXT NOT NULL DEFAULT '',
      dados TEXT,
      personagem_id INTEGER,
      autor TEXT,
      criada_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS mensagens_campanha ON mensagens(campanha_id, id);
    CREATE TABLE IF NOT EXISTS fila (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      personagem_id INTEGER,
      autor TEXT NOT NULL DEFAULT '',
      acao TEXT NOT NULL,
      criada_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS diario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      texto TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS diario_campanha ON diario(campanha_id, tipo);
    CREATE TABLE IF NOT EXISTS ajustes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
    PRAGMA user_version = ${VERSAO};
  `);
  return conexao;
}

// ---------- tipos ----------

export type TipoMensagem = "mestre" | "jogador" | "dado" | "sistema";

export type Mensagem = {
  id: number;
  tipo: TipoMensagem;
  texto: string;
  dados: Record<string, unknown> | null;
  personagemId: number | null;
  /** apelido de quem enviou (jogador humano), quando houver */
  autor: string | null;
  criadaEm: string;
};

export type ConfigCampanha = {
  /** PIN opcional para entrar pela rede local */
  pin?: string;
  /**
   * "livre": cada ação enviada vai para o mestre assim que ele estiver livre (ações que chegam juntas são agrupadas).
   * "rodada": o mestre espera todos os personagens agirem (ou alguém forçar) antes de narrar.
   */
  modo?: "livre" | "rodada";
};

export type Campanha = {
  id: number;
  nome: string;
  sistema: string;
  cenario: string;
  tom: string;
  resumo: string;
  resumoAte: number;
  cena: Cena;
  config: ConfigCampanha;
  criadaEm: string;
  atualizadaEm: string;
};

export type Personagem = {
  id: number;
  campanhaId: number;
  ficha: Ficha;
  /** apelido do humano que controla; vazio = livre (qualquer um na mesa local pode usar) */
  jogador: string;
  ordem: number;
};

export type AcaoPendente = {
  id: number;
  personagemId: number | null;
  autor: string;
  acao: string;
  criadaEm: string;
};

type LinhaCampanha = {
  id: number;
  nome: string;
  sistema: string;
  cenario: string;
  tom: string;
  resumo: string;
  resumo_ate: number;
  cena: string;
  config: string;
  criada_em: string;
  atualizada_em: string;
};
type LinhaPersonagem = { id: number; campanha_id: number; ficha: string; jogador: string; ordem: number };
type LinhaMensagem = {
  id: number;
  tipo: TipoMensagem;
  texto: string;
  dados: string | null;
  personagem_id: number | null;
  autor: string | null;
  criada_em: string;
};
type LinhaFila = { id: number; personagem_id: number | null; autor: string; acao: string; criada_em: string };
type LinhaDiario = { id: number; tipo: TipoDiario; titulo: string; texto: string; status: string; atualizado_em: string };

const paraCampanha = (l: LinhaCampanha): Campanha => ({
  id: l.id,
  nome: l.nome,
  sistema: l.sistema,
  cenario: l.cenario,
  tom: l.tom,
  resumo: l.resumo,
  resumoAte: l.resumo_ate,
  cena: JSON.parse(l.cena || "{}"),
  config: JSON.parse(l.config || "{}"),
  criadaEm: l.criada_em,
  atualizadaEm: l.atualizada_em,
});
const paraPersonagem = (l: LinhaPersonagem): Personagem => ({
  id: l.id,
  campanhaId: l.campanha_id,
  ficha: JSON.parse(l.ficha),
  jogador: l.jogador,
  ordem: l.ordem,
});
const paraMensagem = (l: LinhaMensagem): Mensagem => ({
  id: l.id,
  tipo: l.tipo,
  texto: l.texto,
  dados: l.dados ? JSON.parse(l.dados) : null,
  personagemId: l.personagem_id,
  autor: l.autor,
  criadaEm: l.criada_em,
});
const paraAcao = (l: LinhaFila): AcaoPendente => ({ id: l.id, personagemId: l.personagem_id, autor: l.autor, acao: l.acao, criadaEm: l.criada_em });
const paraDiario = (l: LinhaDiario): EntradaDiario => ({
  id: l.id,
  tipo: l.tipo,
  titulo: l.titulo,
  texto: l.texto,
  status: l.status,
  atualizadoEm: l.atualizado_em,
});

const tocar = (campanhaId: number) => db.prepare("UPDATE campanhas SET atualizada_em = datetime('now') WHERE id = ?").run(campanhaId);

// ---------- campanhas ----------

export function listarCampanhas(): Campanha[] {
  return (db.prepare("SELECT * FROM campanhas ORDER BY atualizada_em DESC").all() as LinhaCampanha[]).map(paraCampanha);
}

export function obterCampanha(id: number): Campanha | null {
  const l = db.prepare("SELECT * FROM campanhas WHERE id = ?").get(id) as LinhaCampanha | undefined;
  return l ? paraCampanha(l) : null;
}

export function criarCampanha(dados: { nome: string; sistema: string; cenario: string; tom: string; config?: ConfigCampanha }): number {
  const r = db
    .prepare("INSERT INTO campanhas (nome, sistema, cenario, tom, config) VALUES (?, ?, ?, ?, ?)")
    .run(dados.nome, dados.sistema, dados.cenario, dados.tom, JSON.stringify(dados.config ?? {}));
  return Number(r.lastInsertRowid);
}

export function atualizarCampanha(id: number, dados: Partial<Pick<Campanha, "nome" | "cenario" | "tom" | "config">>) {
  const atual = obterCampanha(id);
  if (!atual) return;
  db.prepare("UPDATE campanhas SET nome = ?, cenario = ?, tom = ?, config = ?, atualizada_em = datetime('now') WHERE id = ?").run(
    dados.nome ?? atual.nome,
    dados.cenario ?? atual.cenario,
    dados.tom ?? atual.tom,
    JSON.stringify(dados.config ?? atual.config),
    id,
  );
}

export function excluirCampanha(id: number) {
  db.prepare("DELETE FROM campanhas WHERE id = ?").run(id);
}

export function salvarCena(id: number, cena: Cena) {
  db.prepare("UPDATE campanhas SET cena = ? WHERE id = ?").run(JSON.stringify(cena), id);
}

export function salvarResumo(id: number, resumo: string, ateMensagem: number) {
  db.prepare("UPDATE campanhas SET resumo = ?, resumo_ate = ? WHERE id = ?").run(resumo, ateMensagem, id);
}

// ---------- personagens ----------

export function listarPersonagens(campanhaId: number): Personagem[] {
  return (db.prepare("SELECT * FROM personagens WHERE campanha_id = ? ORDER BY ordem, id").all(campanhaId) as LinhaPersonagem[]).map(paraPersonagem);
}

export function obterPersonagem(id: number): Personagem | null {
  const l = db.prepare("SELECT * FROM personagens WHERE id = ?").get(id) as LinhaPersonagem | undefined;
  return l ? paraPersonagem(l) : null;
}

export function criarPersonagem(campanhaId: number, ficha: Ficha, jogador = ""): Personagem {
  const ordem = (db.prepare("SELECT COALESCE(MAX(ordem), -1) + 1 AS o FROM personagens WHERE campanha_id = ?").get(campanhaId) as { o: number }).o;
  const r = db
    .prepare("INSERT INTO personagens (campanha_id, ficha, jogador, ordem) VALUES (?, ?, ?, ?)")
    .run(campanhaId, JSON.stringify(ficha), jogador, ordem);
  tocar(campanhaId);
  return obterPersonagem(Number(r.lastInsertRowid))!;
}

export function salvarFicha(personagemId: number, ficha: Ficha) {
  db.prepare("UPDATE personagens SET ficha = ?, atualizado_em = datetime('now') WHERE id = ?").run(JSON.stringify(ficha), personagemId);
}

export function definirJogador(personagemId: number, jogador: string) {
  db.prepare("UPDATE personagens SET jogador = ? WHERE id = ?").run(jogador, personagemId);
}

export function removerPersonagem(personagemId: number) {
  db.prepare("DELETE FROM personagens WHERE id = ?").run(personagemId);
}

// ---------- mensagens ----------

export function adicionarMensagem(
  campanhaId: number,
  tipo: TipoMensagem,
  texto: string,
  extra: { dados?: unknown; personagemId?: number | null; autor?: string | null } = {},
): Mensagem {
  const r = db
    .prepare("INSERT INTO mensagens (campanha_id, tipo, texto, dados, personagem_id, autor) VALUES (?, ?, ?, ?, ?, ?)")
    .run(campanhaId, tipo, texto, extra.dados === undefined ? null : JSON.stringify(extra.dados), extra.personagemId ?? null, extra.autor ?? null);
  tocar(campanhaId);
  return paraMensagem(db.prepare("SELECT * FROM mensagens WHERE id = ?").get(Number(r.lastInsertRowid)) as LinhaMensagem);
}

/** Todas as mensagens, ou só as `limite` mais recentes. */
export function listarMensagens(campanhaId: number, limite?: number): Mensagem[] {
  const linhas = limite
    ? (db.prepare("SELECT * FROM (SELECT * FROM mensagens WHERE campanha_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id").all(campanhaId, limite) as LinhaMensagem[])
    : (db.prepare("SELECT * FROM mensagens WHERE campanha_id = ? ORDER BY id").all(campanhaId) as LinhaMensagem[]);
  return linhas.map(paraMensagem);
}

/** Mensagens depois de um id (para o resumo incremental). */
export function mensagensDepois(campanhaId: number, depoisDe: number): Mensagem[] {
  return (db.prepare("SELECT * FROM mensagens WHERE campanha_id = ? AND id > ? ORDER BY id").all(campanhaId, depoisDe) as LinhaMensagem[]).map(paraMensagem);
}

// ---------- fila de ações ----------

export function enfileirarAcao(campanhaId: number, acao: { personagemId: number | null; autor: string; acao: string }): AcaoPendente {
  const r = db.prepare("INSERT INTO fila (campanha_id, personagem_id, autor, acao) VALUES (?, ?, ?, ?)").run(campanhaId, acao.personagemId, acao.autor, acao.acao);
  return paraAcao(db.prepare("SELECT * FROM fila WHERE id = ?").get(Number(r.lastInsertRowid)) as LinhaFila);
}

export function listarFila(campanhaId: number): AcaoPendente[] {
  return (db.prepare("SELECT * FROM fila WHERE campanha_id = ? ORDER BY id").all(campanhaId) as LinhaFila[]).map(paraAcao);
}

/** Retira e devolve todas as ações pendentes, na ordem de chegada. */
export function retirarFila(campanhaId: number): AcaoPendente[] {
  const acoes = listarFila(campanhaId);
  if (acoes.length) db.prepare("DELETE FROM fila WHERE campanha_id = ? AND id <= ?").run(campanhaId, acoes[acoes.length - 1].id);
  return acoes;
}

export function removerDaFila(acaoId: number) {
  db.prepare("DELETE FROM fila WHERE id = ?").run(acaoId);
}

// ---------- diário ----------

export function listarDiario(campanhaId: number): EntradaDiario[] {
  return (db.prepare("SELECT * FROM diario WHERE campanha_id = ? ORDER BY tipo, atualizado_em DESC").all(campanhaId) as LinhaDiario[]).map(paraDiario);
}

/** Cria ou atualiza (mesmo tipo + mesmo título, sem diferenciar maiúsculas) uma entrada do diário. */
export function salvarEntradaDiario(campanhaId: number, e: { tipo: TipoDiario; titulo: string; texto?: string; status?: string }): EntradaDiario {
  const existente = db
    .prepare("SELECT * FROM diario WHERE campanha_id = ? AND tipo = ? AND lower(titulo) = lower(?)")
    .get(campanhaId, e.tipo, e.titulo) as LinhaDiario | undefined;
  if (existente) {
    db.prepare("UPDATE diario SET texto = ?, status = ?, atualizado_em = datetime('now') WHERE id = ?").run(
      e.texto ?? existente.texto,
      e.status ?? existente.status,
      existente.id,
    );
    return paraDiario(db.prepare("SELECT * FROM diario WHERE id = ?").get(existente.id) as LinhaDiario);
  }
  const r = db
    .prepare("INSERT INTO diario (campanha_id, tipo, titulo, texto, status) VALUES (?, ?, ?, ?, ?)")
    .run(campanhaId, e.tipo, e.titulo, e.texto ?? "", e.status ?? "");
  return paraDiario(db.prepare("SELECT * FROM diario WHERE id = ?").get(Number(r.lastInsertRowid)) as LinhaDiario);
}

export function removerEntradaDiario(id: number) {
  db.prepare("DELETE FROM diario WHERE id = ?").run(id);
}

// ---------- ajustes globais (provedor, modelo...) ----------

export function lerAjuste<T>(chave: string, padrao: T): T {
  const l = db.prepare("SELECT valor FROM ajustes WHERE chave = ?").get(chave) as { valor: string } | undefined;
  return l ? (JSON.parse(l.valor) as T) : padrao;
}

export function salvarAjuste(chave: string, valor: unknown) {
  db.prepare("INSERT INTO ajustes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor").run(chave, JSON.stringify(valor));
}
