import type { DatabaseSync } from "node:sqlite";

// Migrações do banco, em ordem. A mesma lista versiona o arquivo "taverna-campanha" (exportar/importar e lixeira):
// a versão de um arquivo exportado é o PRAGMA user_version do banco que o gerou.
//
// Cada passo tem o SQL que leva o banco da versão anterior para `versao` e, quando o passo muda o que vai no arquivo
// exportado, `exportacao`, que faz a mesma mudança num arquivo antigo em memória (o importador aplica as que faltam).
// `jaAplicada` existe porque as versões 3 a 5 nasceram "no primeiro uso", antes desta lista: há bancos com user_version 2
// que já têm a coluna ou a tabela. Nessas, o passo é pulado e só o número sobe.
//
// Para mudar o esquema: acrescente um passo no fim (nunca edite um que já foi publicado) e, se o formato exportado
// mudar, a `exportacao` correspondente.

/** Um arquivo de campanha como ele chega do JSON, antes de saber a versão (campos soltos). */
export type DadosExportados = Record<string, unknown> & {
  personagens?: Record<string, unknown>[];
  mensagens?: Record<string, unknown>[];
  diario?: Record<string, unknown>[];
  fatos?: Record<string, unknown>[];
};

export type Migracao = {
  versao: number;
  /** o que muda, em uma linha (aparece no log quando o passo roda) */
  descricao: string;
  sql: string;
  /** true quando o banco já tem o que este passo cria (bancos de antes da lista de migrações) */
  jaAplicada?: (conexao: DatabaseSync) => boolean;
  /** a mesma mudança num arquivo exportado por uma versão anterior */
  exportacao?: (dados: DadosExportados) => DadosExportados;
};

const colunas = (conexao: DatabaseSync, tabela: string) =>
  (conexao.prepare(`SELECT name FROM pragma_table_info('${tabela}')`).all() as { name: string }[]).map((c) => c.name);

const temTabela = (conexao: DatabaseSync, tabela: string) => Boolean(conexao.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tabela));

export const MIGRACOES: Migracao[] = [
  {
    versao: 2,
    descricao: "esquema base: campanhas com vários personagens, mensagens, fila, diário, ajustes e instantâneos",
    // CREATE ... IF NOT EXISTS: rodar de novo num banco v2 não muda nada
    sql: `
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
    `,
  },
  {
    versao: 3,
    descricao: "diário guarda dados estruturados (pistas das missões, atitude dos NPCs)",
    sql: "ALTER TABLE diario ADD COLUMN dados TEXT",
    jaAplicada: (c) => colunas(c, "diario").includes("dados"),
    exportacao: (d) => ({ ...d, diario: (d.diario ?? []).map((e) => ({ ...e, dados: e.dados ?? null })) }),
  },
  {
    versao: 4,
    descricao: "anotações do jogador por personagem, fora da ficha",
    sql: "ALTER TABLE personagens ADD COLUMN notas TEXT NOT NULL DEFAULT ''",
    jaAplicada: (c) => colunas(c, "personagens").includes("notas"),
    exportacao: (d) => ({ ...d, personagens: (d.personagens ?? []).map((p) => ({ ...p, notas: typeof p.notas === "string" ? p.notas : "" })) }),
  },
  {
    versao: 5,
    descricao: "fatos fixados pelo jogador para o mestre não esquecer",
    sql: `
      CREATE TABLE IF NOT EXISTS fatos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campanha_id INTEGER NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
        texto TEXT NOT NULL,
        autor TEXT NOT NULL DEFAULT '',
        ordem INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS fatos_campanha ON fatos(campanha_id, ordem, id);
    `,
    jaAplicada: (c) => temTabela(c, "fatos"),
    exportacao: (d) => ({ ...d, fatos: Array.isArray(d.fatos) ? d.fatos : [] }),
  },
];

/** Versão do esquema que este código entende (e a do arquivo que ele exporta). */
export const VERSAO_ATUAL = MIGRACOES[MIGRACOES.length - 1].versao;

export function versaoDoBanco(conexao: DatabaseSync): number {
  return (conexao.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
}

/** Passos que faltam para um banco (ou arquivo) na versão `de`. */
export function migracoesPendentes(de: number): Migracao[] {
  return MIGRACOES.filter((m) => m.versao > de);
}

/**
 * Leva o banco até VERSAO_ATUAL numa transação só: ou tudo, ou nada (o user_version só muda no fim, junto).
 * Banco mais novo que o código (alguém voltou a taverna para uma versão antiga) fica como está: nunca rebaixa.
 * Devolve as versões aplicadas (vazio quando não havia nada a fazer).
 */
export function aplicarMigracoes(conexao: DatabaseSync): number[] {
  const antes = versaoDoBanco(conexao);
  const pendentes = migracoesPendentes(antes);
  if (!pendentes.length) return [];
  conexao.exec("BEGIN IMMEDIATE");
  try {
    // outro processo pode ter migrado enquanto este esperava o lock
    const agora = versaoDoBanco(conexao);
    const passos = migracoesPendentes(agora);
    for (const m of passos) {
      if (m.jaAplicada?.(conexao)) continue;
      conexao.exec(m.sql);
    }
    if (passos.length) conexao.exec(`PRAGMA user_version = ${VERSAO_ATUAL}`);
    conexao.exec("COMMIT");
    return passos.map((m) => m.versao);
  } catch (erro) {
    conexao.exec("ROLLBACK");
    throw erro;
  }
}

/**
 * Atualiza em memória um arquivo exportado na versão `de` até VERSAO_ATUAL, aplicando as `exportacao` que faltam.
 * Quem chama já recusou arquivo de versão maior.
 */
export function atualizarExportacao(dados: DadosExportados, de: number): DadosExportados {
  let d = dados;
  for (const m of migracoesPendentes(de)) if (m.exportacao) d = m.exportacao(d);
  return { ...d, versao: VERSAO_ATUAL };
}
