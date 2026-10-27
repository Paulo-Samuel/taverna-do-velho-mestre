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
// Abre só no primeiro uso: o next build importa as rotas em vários processos ao mesmo tempo e não deve tocar no banco.
const db = new Proxy({} as DatabaseSync, {
  get(_alvo, chave) {
    const real = (globalDb.__tavernaDb ??= abrir());
    const valor = Reflect.get(real, chave, real);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});

function abrir() {
  let conexao = new DatabaseSync(ARQUIVO, { timeout: 10000 });
  const versao = (conexao.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  const temV1 = (conexao.prepare("SELECT name FROM pragma_table_info('campanhas') WHERE name = 'ficha'").all() as unknown[]).length > 0;
  if (versao < VERSAO && temV1) {
    // banco da primeira versão (uma ficha por campanha): guarda uma cópia e começa do zero
    conexao.close();
    const copia = path.join(pasta, `taverna-v1-${Date.now()}.db`);
    renameSync(ARQUIVO, copia);
    for (const sufixo of ["-wal", "-shm"]) if (existsSync(ARQUIVO + sufixo)) renameSync(ARQUIVO + sufixo, copia + sufixo);
    conexao = new DatabaseSync(ARQUIVO, { timeout: 10000 });
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
    CREATE TABLE IF NOT EXISTS instantaneos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      turno TEXT NOT NULL,
      entrada TEXT,
      acoes TEXT NOT NULL DEFAULT '[]',
      aberto INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS instantaneos_campanha ON instantaneos(campanha_id, id);
    PRAGMA user_version = ${VERSAO};
  `);
  // colunas acrescentadas depois da v2 (bancos antigos não têm)
  const colunasDiario = (conexao.prepare("SELECT name FROM pragma_table_info('diario')").all() as { name: string }[]).map((c) => c.name);
  if (!colunasDiario.includes("dados")) conexao.exec("ALTER TABLE diario ADD COLUMN dados TEXT");
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
  /**
   * "historia" (padrão das campanhas novas): criação rápida, mesa em estilo de livro, ações sugeridas, jogador rola os dados.
   * "avancado": escolha de sistema, ficha completa, mesa com painéis. Campanhas antigas sem o campo são "avancado".
   */
  modoJogo?: "historia" | "avancado";
  /** quem rola os testes dos personagens: o próprio jogador (padrão, na tela) ou o servidor, na hora */
  dados?: "jogador" | "automatico";
  /** o mestre sugere ações em botões a cada turno (padrão: sim) */
  sugestoes?: boolean;
  /** estilo do mestre (opções em mestre/estilo.ts): quanto as falhas custam; padrão "justa" */
  dificuldade?: "indulgente" | "justa" | "implacavel";
  /** tamanho da narração por turno; padrão "media" (2 a 3 parágrafos) */
  narracao?: "curta" | "media" | "longa";
  /** o que o mestre privilegia: ids de FOCOS e, opcionalmente, um texto livre curto */
  foco?: string[];
  /** regras e preferências da mesa em texto livre (até ~500 caracteres) */
  instrucoes?: string;
  /** id de uma aventura pronta (lib/aventuras): o roteiro secreto entra no prompt do mestre; ausente = campanha livre */
  aventura?: string;
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
type LinhaDiario = { id: number; tipo: TipoDiario; titulo: string; texto: string; status: string; dados: string | null; atualizado_em: string };

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
  ...(l.dados ? { dados: JSON.parse(l.dados) } : {}),
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

// Anotações do jogador: coluna própria, fora da ficha (o mestre não lê, o turno não sobrescreve e o "desfazer" não apaga).
let temColunaNotas = false;
function garantirColunaNotas() {
  if (temColunaNotas) return;
  // conferida no primeiro uso (e não em abrir()): o servidor de desenvolvimento reaproveita a conexão aberta entre recargas
  const colunas = (db.prepare("SELECT name FROM pragma_table_info('personagens')").all() as { name: string }[]).map((c) => c.name);
  if (!colunas.includes("notas")) db.exec("ALTER TABLE personagens ADD COLUMN notas TEXT NOT NULL DEFAULT ''");
  temColunaNotas = true;
}

export function lerNotas(personagemId: number): string {
  garantirColunaNotas();
  return (db.prepare("SELECT notas FROM personagens WHERE id = ?").get(personagemId) as { notas: string } | undefined)?.notas ?? "";
}

export function salvarNotas(personagemId: number, notas: string) {
  garantirColunaNotas();
  db.prepare("UPDATE personagens SET notas = ? WHERE id = ?").run(notas, personagemId);
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

export function obterMensagem(id: number): Mensagem | null {
  const l = db.prepare("SELECT * FROM mensagens WHERE id = ?").get(id) as LinhaMensagem | undefined;
  return l ? paraMensagem(l) : null;
}

/** Troca o texto e os dados de uma mensagem (ex.: teste pendente que o jogador acabou de rolar). */
export function atualizarMensagem(id: number, texto: string, dados: unknown): Mensagem | null {
  db.prepare("UPDATE mensagens SET texto = ?, dados = ? WHERE id = ?").run(texto, JSON.stringify(dados), id);
  return obterMensagem(id);
}

/** Testes que o mestre pediu e que o jogador ainda não rolou (modo história). */
export function testesPendentes(campanhaId: number): Mensagem[] {
  return (
    db
      .prepare(
        "SELECT * FROM mensagens WHERE campanha_id = ? AND tipo = 'dado' AND json_extract(dados, '$.tipo') = 'pedido_teste' AND json_extract(dados, '$.status') = 'pendente' ORDER BY id",
      )
      .all(campanhaId) as LinhaMensagem[]
  ).map(paraMensagem);
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

/**
 * Cria ou atualiza (mesmo tipo + mesmo título, sem diferenciar maiúsculas) uma entrada do diário.
 * `dados` é mesclado com o que já existe; `pistas` (missões) acumula sem repetir.
 */
export function salvarEntradaDiario(
  campanhaId: number,
  e: { tipo: TipoDiario; titulo: string; texto?: string; status?: string; dados?: Record<string, unknown> },
): EntradaDiario {
  const existente = db
    .prepare("SELECT * FROM diario WHERE campanha_id = ? AND tipo = ? AND lower(titulo) = lower(?)")
    .get(campanhaId, e.tipo, e.titulo) as LinhaDiario | undefined;
  if (existente) {
    const antigos = existente.dados ? (JSON.parse(existente.dados) as Record<string, unknown>) : {};
    const novos = { ...antigos, ...(e.dados ?? {}) };
    if (Array.isArray(antigos.pistas) && Array.isArray(e.dados?.pistas)) novos.pistas = [...new Set([...antigos.pistas, ...e.dados.pistas])];
    db.prepare("UPDATE diario SET texto = ?, status = ?, dados = ?, atualizado_em = datetime('now') WHERE id = ?").run(
      e.texto ?? existente.texto,
      e.status ?? existente.status,
      Object.keys(novos).length ? JSON.stringify(novos) : null,
      existente.id,
    );
    return paraDiario(db.prepare("SELECT * FROM diario WHERE id = ?").get(existente.id) as LinhaDiario);
  }
  const r = db
    .prepare("INSERT INTO diario (campanha_id, tipo, titulo, texto, status, dados) VALUES (?, ?, ?, ?, ?, ?)")
    .run(campanhaId, e.tipo, e.titulo, e.texto ?? "", e.status ?? "", e.dados && Object.keys(e.dados).length ? JSON.stringify(e.dados) : null);
  return paraDiario(db.prepare("SELECT * FROM diario WHERE id = ?").get(Number(r.lastInsertRowid)) as LinhaDiario);
}

export function removerEntradaDiario(id: number) {
  db.prepare("DELETE FROM diario WHERE id = ?").run(id);
}

// ---------- fatos fixados ----------

// O que o jogador marcou para o mestre nunca esquecer. São do jogador (como as anotações): o "desfazer" não mexe neles.

export type Fato = { id: number; texto: string; autor: string; ordem: number; criadoEm: string };
type LinhaFato = { id: number; texto: string; autor: string; ordem: number; criado_em: string };
const paraFato = (l: LinhaFato): Fato => ({ id: l.id, texto: l.texto, autor: l.autor, ordem: l.ordem, criadoEm: l.criado_em });

let temTabelaFatos = false;
function garantirTabelaFatos() {
  if (temTabelaFatos) return;
  // criada no primeiro uso (como a coluna de notas): o servidor de desenvolvimento reaproveita a conexão aberta
  db.exec(`
    CREATE TABLE IF NOT EXISTS fatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
      texto TEXT NOT NULL,
      autor TEXT NOT NULL DEFAULT '',
      ordem INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS fatos_campanha ON fatos(campanha_id, ordem, id);
  `);
  temTabelaFatos = true;
}

export function listarFatos(campanhaId: number): Fato[] {
  garantirTabelaFatos();
  return (db.prepare("SELECT * FROM fatos WHERE campanha_id = ? ORDER BY ordem, id").all(campanhaId) as LinhaFato[]).map(paraFato);
}

export function obterFato(id: number): (Fato & { campanhaId: number }) | null {
  garantirTabelaFatos();
  const l = db.prepare("SELECT * FROM fatos WHERE id = ?").get(id) as (LinhaFato & { campanha_id: number }) | undefined;
  return l ? { ...paraFato(l), campanhaId: l.campanha_id } : null;
}

/** Fato novo vai para o fim da lista. */
export function criarFato(campanhaId: number, texto: string, autor = ""): Fato {
  garantirTabelaFatos();
  const ordem = (db.prepare("SELECT COALESCE(MAX(ordem), -1) + 1 AS o FROM fatos WHERE campanha_id = ?").get(campanhaId) as { o: number }).o;
  const r = db.prepare("INSERT INTO fatos (campanha_id, texto, autor, ordem) VALUES (?, ?, ?, ?)").run(campanhaId, texto, autor, ordem);
  return paraFato(db.prepare("SELECT * FROM fatos WHERE id = ?").get(Number(r.lastInsertRowid)) as LinhaFato);
}

export function editarFato(id: number, texto: string) {
  garantirTabelaFatos();
  db.prepare("UPDATE fatos SET texto = ? WHERE id = ?").run(texto, id);
}

export function removerFato(id: number) {
  garantirTabelaFatos();
  db.prepare("DELETE FROM fatos WHERE id = ?").run(id);
}

/** Nova ordem pelos ids; ids de outra mesa são ignorados e os que faltarem vão para o fim, na ordem de antes. */
export function reordenarFatos(campanhaId: number, ids: number[]) {
  const atuais = listarFatos(campanhaId);
  const vistos = new Set<number>();
  const ordem = [...ids.filter((id) => atuais.some((f) => f.id === id) && !vistos.has(id) && vistos.add(id)), ...atuais.map((f) => f.id).filter((id) => !vistos.has(id))];
  db.exec("BEGIN");
  try {
    const mudar = db.prepare("UPDATE fatos SET ordem = ? WHERE id = ? AND campanha_id = ?");
    ordem.forEach((id, i) => mudar.run(i, id, campanhaId));
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

// ---------- instantâneos (desfazer o último turno) ----------

/** Tudo o que um turno do mestre pode mudar: cena, resumo, fichas, diário, mensagens novas e testes pendentes. */
export type EstadoMesa = {
  ultimaMensagem: number;
  cena: string;
  resumo: string;
  resumoAte: number;
  fichas: { id: number; ficha: string }[];
  diario: LinhaDiario[];
  /** mensagens que um turno pode reescrever (pedido de teste pendente vira resolvido) */
  editaveis: { id: number; texto: string; dados: string | null }[];
};

export type Instantaneo = {
  id: number;
  /** estado no começo do turno (refazer volta para cá e manda as mesmas ações) */
  turno: EstadoMesa;
  /** estado antes da entrada do jogador, quando ela veio antes do turno (rolar um teste pedido); desfazer volta para cá */
  entrada: EstadoMesa | null;
  acoes: { personagemId: number | null; autor: string; acao: string }[];
  aberto: boolean;
  criadoEm: string;
};

type LinhaInstantaneo = { id: number; turno: string; entrada: string | null; acoes: string; aberto: number; criado_em: string };
const paraInstantaneo = (l: LinhaInstantaneo): Instantaneo => ({
  id: l.id,
  turno: JSON.parse(l.turno),
  entrada: l.entrada ? JSON.parse(l.entrada) : null,
  acoes: JSON.parse(l.acoes),
  aberto: l.aberto === 1,
  criadoEm: l.criado_em,
});

/** Quantos turnos dá para desfazer em sequência. */
const MAX_INSTANTANEOS = 10;

export function capturarEstado(campanhaId: number): EstadoMesa {
  const c = db.prepare("SELECT cena, resumo, resumo_ate FROM campanhas WHERE id = ?").get(campanhaId) as Pick<LinhaCampanha, "cena" | "resumo" | "resumo_ate">;
  const ultima = db.prepare("SELECT COALESCE(MAX(id), 0) AS id FROM mensagens WHERE campanha_id = ?").get(campanhaId) as { id: number };
  return {
    ultimaMensagem: ultima.id,
    cena: c.cena,
    resumo: c.resumo,
    resumoAte: c.resumo_ate,
    fichas: db.prepare("SELECT id, ficha FROM personagens WHERE campanha_id = ?").all(campanhaId) as { id: number; ficha: string }[],
    diario: db.prepare("SELECT id, tipo, titulo, texto, status, dados, atualizado_em FROM diario WHERE campanha_id = ?").all(campanhaId) as LinhaDiario[],
    editaveis: db
      .prepare("SELECT id, texto, dados FROM mensagens WHERE campanha_id = ? AND tipo = 'dado' AND json_extract(dados, '$.tipo') = 'pedido_teste' AND json_extract(dados, '$.status') = 'pendente'")
      .all(campanhaId) as { id: number; texto: string; dados: string | null }[],
  };
}

/** Volta a mesa para um estado capturado. Personagens criados depois ficam (só as fichas de quem já existia voltam). */
export function restaurarEstado(campanhaId: number, e: EstadoMesa) {
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM mensagens WHERE campanha_id = ? AND id > ?").run(campanhaId, e.ultimaMensagem);
    for (const m of e.editaveis) db.prepare("UPDATE mensagens SET texto = ?, dados = ? WHERE id = ? AND campanha_id = ?").run(m.texto, m.dados, m.id, campanhaId);
    db.prepare("UPDATE campanhas SET cena = ?, resumo = ?, resumo_ate = ?, atualizada_em = datetime('now') WHERE id = ?").run(e.cena, e.resumo, e.resumoAte, campanhaId);
    for (const p of e.fichas) db.prepare("UPDATE personagens SET ficha = ? WHERE id = ? AND campanha_id = ?").run(p.ficha, p.id, campanhaId);
    db.prepare("DELETE FROM diario WHERE campanha_id = ?").run(campanhaId);
    const inserir = db.prepare("INSERT INTO diario (id, campanha_id, tipo, titulo, texto, status, dados, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    for (const d of e.diario) inserir.run(d.id, campanhaId, d.tipo, d.titulo, d.texto, d.status, d.dados, d.atualizado_em);
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

/** Instantâneo "aberto": a entrada do jogador já foi guardada (rolou um teste) e o turno ainda não começou. */
export function abrirInstantaneo(campanhaId: number, entrada: EstadoMesa) {
  if (db.prepare("SELECT 1 FROM instantaneos WHERE campanha_id = ? AND aberto = 1").get(campanhaId)) return;
  db.prepare("INSERT INTO instantaneos (campanha_id, turno, entrada, aberto) VALUES (?, ?, ?, 1)").run(campanhaId, JSON.stringify(entrada), JSON.stringify(entrada));
}

/** Guarda o começo de um turno (fecha o instantâneo aberto, se houver) e poda os antigos. */
export function registrarInstantaneo(campanhaId: number, turno: EstadoMesa, acoes: Instantaneo["acoes"]) {
  const aberto = db.prepare("SELECT id FROM instantaneos WHERE campanha_id = ? AND aberto = 1").get(campanhaId) as { id: number } | undefined;
  if (aberto) db.prepare("UPDATE instantaneos SET turno = ?, acoes = ?, aberto = 0 WHERE id = ?").run(JSON.stringify(turno), JSON.stringify(acoes), aberto.id);
  else db.prepare("INSERT INTO instantaneos (campanha_id, turno, acoes) VALUES (?, ?, ?)").run(campanhaId, JSON.stringify(turno), JSON.stringify(acoes));
  db.prepare("DELETE FROM instantaneos WHERE campanha_id = ? AND id NOT IN (SELECT id FROM instantaneos WHERE campanha_id = ? ORDER BY id DESC LIMIT ?)").run(
    campanhaId,
    campanhaId,
    MAX_INSTANTANEOS,
  );
}

/** O último turno fechado que dá para desfazer. */
export function ultimoInstantaneo(campanhaId: number): Instantaneo | null {
  const l = db.prepare("SELECT * FROM instantaneos WHERE campanha_id = ? AND aberto = 0 ORDER BY id DESC LIMIT 1").get(campanhaId) as LinhaInstantaneo | undefined;
  return l ? paraInstantaneo(l) : null;
}

export function contarInstantaneos(campanhaId: number): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM instantaneos WHERE campanha_id = ? AND aberto = 0").get(campanhaId) as { n: number }).n;
}

export function removerInstantaneo(id: number) {
  db.prepare("DELETE FROM instantaneos WHERE id = ?").run(id);
}

/** Descarta o instantâneo aberto (o turno não chegou a acontecer). */
export function descartarInstantaneoAberto(campanhaId: number) {
  db.prepare("DELETE FROM instantaneos WHERE campanha_id = ? AND aberto = 1").run(campanhaId);
}

// ---------- ajustes globais (provedor, modelo...) ----------

export function lerAjuste<T>(chave: string, padrao: T): T {
  const l = db.prepare("SELECT valor FROM ajustes WHERE chave = ?").get(chave) as { valor: string } | undefined;
  return l ? (JSON.parse(l.valor) as T) : padrao;
}

export function salvarAjuste(chave: string, valor: unknown) {
  db.prepare("INSERT INTO ajustes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor").run(chave, JSON.stringify(valor));
}
