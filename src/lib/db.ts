import "server-only";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { arquivoBanco, copiaAntesDeMigrar, gravarNaLixeira } from "./backup";
import { aplicarMigracoes, atualizarExportacao, migracoesPendentes, VERSAO_ATUAL, versaoDoBanco, type DadosExportados } from "./db/migracoes";
import { dividirNoites, PAUSA_NOITE_MS, type MensagemDaNoite, type Noite } from "./constantes";
import type { Cena, EntradaDiario, Ficha, TipoDiario } from "./sistemas/tipos";

// SQLite embutido no Node 24: nada de dependência nativa para compilar no Windows.
// O caminho vem de backup.ts (data/taverna.db, ou TAVERNA_DB nos testes); o esquema, de db/migracoes.ts.
const ARQUIVO = arquivoBanco();
const pasta = path.dirname(ARQUIVO);
mkdirSync(pasta, { recursive: true });

const globalDb = globalThis as unknown as { __tavernaDb?: DatabaseSync; __tavernaVersao?: number };
// Abre só no primeiro uso: o next build importa as rotas em vários processos ao mesmo tempo e não deve tocar no banco.
const db = new Proxy({} as DatabaseSync, {
  get(_alvo, chave) {
    const real = conexao();
    const valor = Reflect.get(real, chave, real);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});

function conexao(): DatabaseSync {
  const real = (globalDb.__tavernaDb ??= abrir());
  // no modo dev a conexão sobrevive às recargas do módulo: uma migração nova também precisa rodar nela
  if (globalDb.__tavernaVersao !== VERSAO_ATUAL) {
    migrar(real);
    globalDb.__tavernaVersao = VERSAO_ATUAL;
  }
  return real;
}

/** Cópia do banco (data/copias) e depois as migrações que faltam, numa transação só. */
function migrar(conexao: DatabaseSync) {
  const versao = versaoDoBanco(conexao);
  if (!migracoesPendentes(versao).length) return;
  // banco novo (versão 0, sem tabelas) não tem o que guardar
  const temDados = Boolean(conexao.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'campanhas'").get());
  if (versao > 0 || temDados) {
    try {
      const copia = copiaAntesDeMigrar(conexao, versao, VERSAO_ATUAL);
      console.log(`[taverna] banco v${versao} → v${VERSAO_ATUAL}: cópia em data/copias/${copia}`);
    } catch (erro) {
      // a migração é uma transação (tudo ou nada); sem cópia ela segue, mas fica o aviso
      console.error("[taverna] não deu para copiar o banco antes de migrar:", (erro as Error).message);
    }
  }
  aplicarMigracoes(conexao);
}

function abrir() {
  let conexao = new DatabaseSync(ARQUIVO, { timeout: 10000 });
  const versao = versaoDoBanco(conexao);
  const temV1 = (conexao.prepare("SELECT name FROM pragma_table_info('campanhas') WHERE name = 'ficha'").all() as unknown[]).length > 0;
  if (versao < 2 && temV1) {
    // banco da primeira versão (uma ficha por campanha): guarda uma cópia e começa do zero
    conexao.close();
    const copia = path.join(pasta, `taverna-v1-${Date.now()}.db`);
    renameSync(ARQUIVO, copia);
    for (const sufixo of ["-wal", "-shm"]) if (existsSync(ARQUIVO + sufixo)) renameSync(ARQUIVO + sufixo, copia + sufixo);
    conexao = new DatabaseSync(ARQUIVO, { timeout: 10000 });
  }
  // fora de transação: o journal_mode não muda dentro de uma; o esquema vem das migrações (conexao())
  conexao.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  return conexao;
}

/** Versão do esquema no banco aberto (depois das migrações: VERSAO_ATUAL, ou maior se o banco veio de uma taverna mais nova). */
export function versaoDoEsquema(): number {
  return versaoDoBanco(conexao());
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
  /** próxima sessão (espelho: o número real vem de noitesDaCampanha, marcadores e intervalos) */
  sessao?: number;
  /**
   * A próxima jogada de verdade abre com "Anteriormente…": ligado ao gravar o marcador de fim (ou ao voltar depois de
   * PAUSA_NOITE_MS sem marcador), desligado quando um turno com recapitulação termina. Não depende da ordem das mensagens:
   * um aparte (( )) ou um turno com erro no meio não engolem a recapitulação.
   */
  recapPendente?: RecapPendente;
  /**
   * Encerramento em andamento (gravado pelo Encerrar, apagado com o marcador): de que noite, se o XP do fechamento já saiu
   * (um segundo Encerrar depois de interromper não concede de novo) e as escolhas do jogador no Encerrar.
   */
  fimPendente?: FimPendente;
};

export type RecapPendente = {
  /** a noite que começa */
  sessao: number;
  /** "marcador": a noite anterior foi encerrada pelo botão; "intervalo": ninguém encerrou, a pausa passou de 5 h */
  motivo: "marcador" | "intervalo";
  /** horas desde a última mensagem da noite anterior (só no intervalo) */
  horas?: number;
  /** id do cartão "Noite N" já gravado (um turno que falhou no meio não grava outro) */
  cartao?: number;
  /** o "Anteriormente…" pronto do marcador já entrou no chat: o mestre não recapitula de novo */
  mostrada?: boolean;
};

export type FimPendente = {
  sessao: number;
  /** algum XP do fechamento já saiu (registro antigo sem `xpPara`: vale para a mesa inteira) */
  xpConcedido: boolean;
  /** ids dos personagens que já receberam XP neste fechamento: um Encerrar repetido só concede a quem falta */
  xpPara?: number[];
  /** "o mestre decide": encerrar com Manchas sem Remorso rolado na tela (o pedido mantém teste_de_remorso) */
  semRemorso?: boolean;
  /** fechamento depois do intervalo, sem jogada nova: em retrospectiva, com a data da última mensagem da noite */
  retroativa?: boolean;
  /** horas desde a última mensagem da noite (no retroativo) */
  horas?: number;
  /** última mensagem quando o Encerrar foi pedido: outro Encerrar sem jogada nova depois dela reaproveita este (e o XP dado) */
  desde?: number;
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

/**
 * Apaga a campanha (CASCADE: personagens, chat, diário, fatos...). Antes, por padrão, ela vai inteira para a lixeira
 * (data/lixeira, formato taverna-campanha): se não der para gravar o arquivo, nada é apagado.
 * Devolve o nome do arquivo na lixeira (null sem lixeira ou quando a campanha não existe).
 */
export function excluirCampanha(id: number, opcoes: { lixeira?: boolean } = {}): string | null {
  let arquivo: string | null = null;
  if (opcoes.lixeira !== false) {
    const dados = exportarCampanha(id, { comPin: true });
    if (!dados) return null;
    arquivo = gravarNaLixeira(dados, id);
  }
  db.prepare("DELETE FROM campanhas WHERE id = ?").run(id);
  return arquivo;
}

/**
 * Molde para outra noite: campanha nova com o mesmo sistema, cenário, tom e config (sem PIN e sem contador de sessão),
 * os personagens copiados descansados (ver resetarFichaCopiada) e nenhuma mensagem, diário, fato ou cena.
 * Devolve o id da cópia, ou null quando a original não existe.
 */
export function duplicarCampanha(id: number, opcoes: { zerarXp?: boolean } = {}): number | null {
  const original = obterCampanha(id);
  if (!original) return null;
  const config: ConfigCampanha = { ...original.config };
  delete config.pin;
  delete config.sessao;
  delete config.recapPendente;
  delete config.fimPendente;
  db.exec("BEGIN");
  try {
    const novoId = criarCampanha({ nome: `${original.nome} (cópia)`.slice(0, 80), sistema: original.sistema, cenario: original.cenario, tom: original.tom, config });
    for (const p of listarPersonagens(id)) criarPersonagem(novoId, resetarFichaCopiada(p.ficha, opcoes), p.jogador);
    db.exec("COMMIT");
    return novoId;
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
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

/**
 * A ficha como quem chega descansado a outra mesa: Saúde/PV cheios, todo recurso no máximo (no Vampiro a Fome volta a 1 e
 * as Manchas a 0), sem condições nem efeitos de sangue pendentes. Inventário, XP e nível ficam; `zerarXp` zera só o XP.
 */
export function resetarFichaCopiada(original: Ficha, opcoes: { zerarXp?: boolean } = {}): Ficha {
  const ficha: Ficha = JSON.parse(JSON.stringify(original));
  ficha.pv = ficha.pvMax;
  ficha.condicoes = [];
  for (const r of Object.values(ficha.recursos)) r.atual = r.max;
  if (ficha.sistema === "vtm5") {
    // Humanidade não "descansa": é o traço moral do personagem, e as caixas de Manchas dependem dela
    const humanidade = original.recursos.humanidade?.atual;
    if (ficha.recursos.humanidade && typeof humanidade === "number") {
      ficha.recursos.humanidade.atual = humanidade;
      if (ficha.recursos.mancha) ficha.recursos.mancha.max = Math.max(0, 10 - humanidade);
    }
    if (ficha.recursos.fome) ficha.recursos.fome.atual = 1;
    if (ficha.recursos.mancha) ficha.recursos.mancha.atual = 0;
    if ("mancha" in ficha.extras) ficha.extras.mancha = 0;
    delete ficha.extras.surtoPendente;
    delete ficha.extras.ressonancia;
  }
  if (ficha.sistema === "d100") {
    // a Sanidade perdida fica com o investigador; só o "começo do dia" reinicia
    const san = original.recursos.san?.atual;
    if (ficha.recursos.san && typeof san === "number") {
      ficha.recursos.san.atual = san;
      ficha.extras.sanInicioDia = san;
    }
  }
  if (ficha.sistema === "fate") {
    // Pontos de Destino voltam à recarga (o teto do recurso tem folga para forçar aspectos)
    const recarga = Number(ficha.extras.recarga);
    if (ficha.recursos.destino) ficha.recursos.destino.atual = Number.isFinite(recarga) && recarga > 0 ? recarga : 3;
  }
  if (opcoes.zerarXp) ficha.xp = 0;
  return ficha;
}

/** Um personagem de outra mesa, para o cartão "Trazer um personagem" (os nomes de clã/classe quem resolve é a página, com o sistema público). */
export type PersonagemCopiavel = {
  id: number;
  nome: string;
  sistema: string;
  ancestralidade: string;
  classe: string;
  nivel: number;
  campanhaId: number;
  campanha: string;
};

/** Personagens de todas as campanhas, da mesa jogada mais recentemente para a mais antiga (opcionalmente só de um sistema, ou sem os de uma campanha). */
export function listarPersonagensCopiaveis(filtro: { sistema?: string; excetoCampanha?: number } = {}): PersonagemCopiavel[] {
  const linhas = db
    .prepare(
      "SELECT p.id, p.ficha, p.campanha_id, c.nome AS campanha, c.sistema FROM personagens p JOIN campanhas c ON c.id = p.campanha_id ORDER BY c.atualizada_em DESC, p.ordem, p.id",
    )
    .all() as { id: number; ficha: string; campanha_id: number; campanha: string; sistema: string }[];
  return linhas
    .filter((l) => (!filtro.sistema || l.sistema === filtro.sistema) && l.campanha_id !== filtro.excetoCampanha)
    .map((l) => {
      const f = JSON.parse(l.ficha) as Ficha;
      return { id: l.id, nome: f.nome, sistema: l.sistema, ancestralidade: f.ancestralidade, classe: f.classe, nivel: f.nivel, campanhaId: l.campanha_id, campanha: l.campanha };
    });
}

/** Copia um personagem para outra campanha (mesmo sistema), descansado. Devolve null se a origem não existe ou o sistema não bate. */
export function copiarPersonagem(origemId: number, campanhaId: number, opcoes: { zerarXp?: boolean } = {}): Personagem | null {
  const origem = obterPersonagem(origemId);
  const destino = obterCampanha(campanhaId);
  if (!origem || !destino || origem.ficha.sistema !== destino.sistema) return null;
  return criarPersonagem(campanhaId, resetarFichaCopiada(origem.ficha, opcoes), origem.jogador);
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
// A coluna vem da migração 4 (db/migracoes.ts).

export function lerNotas(personagemId: number): string {
  return (db.prepare("SELECT notas FROM personagens WHERE id = ?").get(personagemId) as { notas: string } | undefined)?.notas ?? "";
}

export function salvarNotas(personagemId: number, notas: string) {
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

/** Testes que o mestre pediu e que ainda não fecharam: o jogador não rolou ("pendente") ou rolou e decide se rerrola ("decidir"). */
export function testesPendentes(campanhaId: number): Mensagem[] {
  return (
    db
      .prepare(
        "SELECT * FROM mensagens WHERE campanha_id = ? AND tipo = 'dado' AND json_extract(dados, '$.tipo') = 'pedido_teste' AND json_extract(dados, '$.status') IN ('pendente', 'decidir') ORDER BY id",
      )
      .all(campanhaId) as LinhaMensagem[]
  ).map(paraMensagem);
}

/**
 * As noites de jogo da campanha (constantes.ts, dividirNoites): fecham num marcador fim_sessao e em cada intervalo de
 * PAUSA_NOITE_MS ou mais entre mensagens seguidas. Recados de sistema (aviso, divergência) não contam como jogo.
 */
export function noitesDaCampanha(campanhaId: number, pausaMs = PAUSA_NOITE_MS): Noite[] {
  const linhas = db
    .prepare(
      "SELECT id, criada_em, tipo, json_extract(dados, '$.tipo') AS dados_tipo, json_extract(dados, '$.retroativo') AS retroativo FROM mensagens WHERE campanha_id = ? ORDER BY id",
    )
    .all(campanhaId) as { id: number; criada_em: string; tipo: string; dados_tipo: string | null; retroativo: number | null }[];
  const jogo: MensagemDaNoite[] = linhas
    .filter((l) => !(l.tipo === "sistema" && (l.dados_tipo === "aviso" || l.dados_tipo === "divergencia")))
    .map((l) => ({ id: l.id, criadaEm: l.criada_em, tipo: l.tipo, dadosTipo: l.dados_tipo, retroativo: Boolean(l.retroativo) }));
  return dividirNoites(jogo, pausaMs);
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

// A tabela vem da migração 5 (db/migracoes.ts).

export function listarFatos(campanhaId: number): Fato[] {
  return (db.prepare("SELECT * FROM fatos WHERE campanha_id = ? ORDER BY ordem, id").all(campanhaId) as LinhaFato[]).map(paraFato);
}

export function obterFato(id: number): (Fato & { campanhaId: number }) | null {
  const l = db.prepare("SELECT * FROM fatos WHERE id = ?").get(id) as (LinhaFato & { campanha_id: number }) | undefined;
  return l ? { ...paraFato(l), campanhaId: l.campanha_id } : null;
}

/** Fato novo vai para o fim da lista. */
export function criarFato(campanhaId: number, texto: string, autor = ""): Fato {
  const ordem = (db.prepare("SELECT COALESCE(MAX(ordem), -1) + 1 AS o FROM fatos WHERE campanha_id = ?").get(campanhaId) as { o: number }).o;
  const r = db.prepare("INSERT INTO fatos (campanha_id, texto, autor, ordem) VALUES (?, ?, ?, ?)").run(campanhaId, texto, autor, ordem);
  return paraFato(db.prepare("SELECT * FROM fatos WHERE id = ?").get(Number(r.lastInsertRowid)) as LinhaFato);
}

export function editarFato(id: number, texto: string) {
  db.prepare("UPDATE fatos SET texto = ? WHERE id = ?").run(texto, id);
}

export function removerFato(id: number) {
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
  /**
   * Só as chaves da noite em config (recapPendente, fimPendente): desfazer o fechamento ou a recapitulação volta com elas.
   * O resto do config (PIN, estilo...) não volta: pode ter mudado de propósito no meio. Ausente nos instantâneos antigos.
   */
  noite?: { recapPendente: RecapPendente | null; fimPendente: FimPendente | null };
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
  const c = db.prepare("SELECT cena, resumo, resumo_ate, config FROM campanhas WHERE id = ?").get(campanhaId) as Pick<LinhaCampanha, "cena" | "resumo" | "resumo_ate" | "config">;
  const ultima = db.prepare("SELECT COALESCE(MAX(id), 0) AS id FROM mensagens WHERE campanha_id = ?").get(campanhaId) as { id: number };
  const config = JSON.parse(c.config || "{}") as ConfigCampanha;
  return {
    noite: { recapPendente: config.recapPendente ?? null, fimPendente: config.fimPendente ?? null },
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
    if (e.noite) {
      const linha = db.prepare("SELECT config FROM campanhas WHERE id = ?").get(campanhaId) as { config: string } | undefined;
      const config = JSON.parse(linha?.config || "{}") as ConfigCampanha;
      if (e.noite.recapPendente) config.recapPendente = e.noite.recapPendente;
      else delete config.recapPendente;
      if (e.noite.fimPendente) config.fimPendente = e.noite.fimPendente;
      else delete config.fimPendente;
      db.prepare("UPDATE campanhas SET config = ? WHERE id = ?").run(JSON.stringify(config), campanhaId);
    }
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

// ---------- exportar / importar campanha (formato "taverna-campanha") ----------

// Um JSON só para três coisas: "Exportar campanha" (levar para outro PC), a lixeira (excluir) e a importação.
// `versao` é o user_version do banco que gerou o arquivo (db/migracoes.ts): um arquivo antigo é atualizado em memória pelas
// `exportacao` das migrações que faltam; um mais novo que este código é recusado. Instantâneos e fila ficam de fora.

export const FORMATO_CAMPANHA = "taverna-campanha";

export type ArquivoCampanha = {
  formato: typeof FORMATO_CAMPANHA;
  versao: number;
  app: string;
  exportadoEm: string;
  campanha: {
    nome: string;
    sistema: string;
    cenario: string;
    tom: string;
    resumo: string;
    /** id (do arquivo) da última mensagem coberta pelo resumo */
    resumoAte: number;
    cena: Cena;
    /** sem o PIN na exportação; a lixeira guarda tudo (o arquivo não sai da máquina) */
    config: ConfigCampanha;
    criadaEm: string;
    atualizadaEm: string;
  };
  personagens: { id: number; ficha: Ficha; jogador: string; ordem: number; notas: string }[];
  mensagens: { id: number; tipo: TipoMensagem; texto: string; dados: Record<string, unknown> | null; personagemId: number | null; autor: string | null; criadaEm: string }[];
  diario: { tipo: TipoDiario; titulo: string; texto: string; status: string; dados: Record<string, unknown> | null; atualizadoEm: string }[];
  fatos: { texto: string; autor: string; ordem: number; criadoEm: string }[];
};

/** Erro com mensagem para mostrar a quem importou (arquivo errado, versão mais nova...). */
export class ErroImportacao extends Error {}

export function exportarCampanha(id: number, opcoes: { comPin?: boolean } = {}): ArquivoCampanha | null {
  const c = db.prepare("SELECT * FROM campanhas WHERE id = ?").get(id) as LinhaCampanha | undefined;
  if (!c) return null;
  const config = JSON.parse(c.config || "{}") as ConfigCampanha;
  if (!opcoes.comPin) delete config.pin;
  const personagens = db.prepare("SELECT id, ficha, jogador, ordem, notas FROM personagens WHERE campanha_id = ? ORDER BY ordem, id").all(id) as (LinhaPersonagem & { notas: string })[];
  const mensagens = db.prepare("SELECT * FROM mensagens WHERE campanha_id = ? ORDER BY id").all(id) as LinhaMensagem[];
  const diario = db.prepare("SELECT * FROM diario WHERE campanha_id = ? ORDER BY id").all(id) as LinhaDiario[];
  const fatos = db.prepare("SELECT * FROM fatos WHERE campanha_id = ? ORDER BY ordem, id").all(id) as LinhaFato[];
  return {
    formato: FORMATO_CAMPANHA,
    versao: VERSAO_ATUAL,
    app: "Taverna do Velho Mestre",
    exportadoEm: new Date().toISOString(),
    campanha: {
      nome: c.nome,
      sistema: c.sistema,
      cenario: c.cenario,
      tom: c.tom,
      resumo: c.resumo,
      resumoAte: c.resumo_ate,
      cena: JSON.parse(c.cena || "{}"),
      config,
      criadaEm: c.criada_em,
      atualizadaEm: c.atualizada_em,
    },
    personagens: personagens.map((p) => ({ id: p.id, ficha: JSON.parse(p.ficha), jogador: p.jogador, ordem: p.ordem, notas: p.notas ?? "" })),
    mensagens: mensagens.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      texto: m.texto,
      dados: m.dados ? JSON.parse(m.dados) : null,
      personagemId: m.personagem_id,
      autor: m.autor,
      criadaEm: m.criada_em,
    })),
    diario: diario.map((d) => ({ tipo: d.tipo, titulo: d.titulo, texto: d.texto, status: d.status, dados: d.dados ? JSON.parse(d.dados) : null, atualizadoEm: d.atualizado_em })),
    fatos: fatos.map((f) => ({ texto: f.texto, autor: f.autor, ordem: f.ordem, criadoEm: f.criado_em })),
  };
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown, padrao = "") => (typeof v === "string" ? v : padrao);
const inteiro = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);
const dataSql = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(v) ? v.slice(0, 19).replace("T", " ") : null);
const TIPOS_MENSAGEM = new Set(["mestre", "jogador", "dado", "sistema"]);

/** Confere o arquivo e o atualiza até VERSAO_ATUAL. Lança ErroImportacao com o motivo, em português. */
export function lerArquivoCampanha(bruto: unknown): ArquivoCampanha {
  if (!ehObjeto(bruto) || bruto.formato !== FORMATO_CAMPANHA) throw new ErroImportacao("Esse arquivo não é uma campanha exportada pela taverna.");
  const versao = inteiro(bruto.versao);
  if (versao === null || versao < 2) throw new ErroImportacao("O arquivo não diz de que versão da taverna ele veio.");
  if (versao > VERSAO_ATUAL) {
    throw new ErroImportacao(`Este arquivo veio de uma taverna mais nova (formato ${versao}; esta lê até o ${VERSAO_ATUAL}). Atualize a taverna e tente de novo.`);
  }
  const d = atualizarExportacao(bruto as DadosExportados, versao);
  const c = d.campanha;
  if (!ehObjeto(c) || !texto(c.nome).trim() || !texto(c.sistema)) throw new ErroImportacao("O arquivo está sem os dados da campanha (nome e sistema).");
  for (const lista of ["personagens", "mensagens", "diario", "fatos"] as const) {
    if (!Array.isArray(d[lista]) || !d[lista]!.every(ehObjeto)) throw new ErroImportacao(`O arquivo está corrompido (lista "${lista}").`);
  }
  for (const p of d.personagens!) if (!ehObjeto(p.ficha)) throw new ErroImportacao("Há um personagem sem ficha no arquivo.");
  for (const m of d.mensagens!) if (!TIPOS_MENSAGEM.has(texto(m.tipo))) throw new ErroImportacao("Há uma mensagem de tipo desconhecido no arquivo.");
  return d as unknown as ArquivoCampanha;
}

/**
 * Recria a campanha de um arquivo "taverna-campanha" com ids novos e devolve o id dela.
 * Remapeia o personagem de cada mensagem e dos pedidos de teste (dados.personagemId), a campanha da decisão de rerrolar,
 * o "resumo até" e o começo da música da cena (ids de mensagem). Tudo numa transação: ou entra inteira, ou nada.
 */
export function importarCampanha(bruto: unknown, opcoes: { nome?: string } = {}): number {
  const a = lerArquivoCampanha(bruto);
  const c = a.campanha;
  const nome = (opcoes.nome ?? c.nome).trim().slice(0, 80) || "Campanha importada";
  const config = ehObjeto(c.config) ? c.config : {};
  const cena = ehObjeto(c.cena) ? (c.cena as Cena) : {};

  db.exec("BEGIN");
  try {
    const r = db
      .prepare("INSERT INTO campanhas (nome, sistema, cenario, tom, resumo, cena, config, criada_em) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))")
      .run(nome, c.sistema, texto(c.cenario), texto(c.tom, "sombrio e debochado"), texto(c.resumo), "{}", JSON.stringify(config), dataSql(c.criadaEm));
    const novaId = Number(r.lastInsertRowid);

    const personagens = new Map<number, number>();
    const inserirPersonagem = db.prepare("INSERT INTO personagens (campanha_id, ficha, jogador, ordem, notas) VALUES (?, ?, ?, ?, ?)");
    a.personagens.forEach((p, i) => {
      const rp = inserirPersonagem.run(novaId, JSON.stringify(p.ficha), texto(p.jogador), inteiro(p.ordem) ?? i, texto(p.notas));
      const antigo = inteiro(p.id);
      if (antigo !== null) personagens.set(antigo, Number(rp.lastInsertRowid));
    });
    const novoPersonagem = (v: unknown) => {
      const antigo = inteiro(v);
      return antigo === null ? null : (personagens.get(antigo) ?? null);
    };

    const mensagens: [number, number][] = [];
    const inserirMensagem = db.prepare("INSERT INTO mensagens (campanha_id, tipo, texto, dados, personagem_id, autor, criada_em) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))");
    const emOrdem = [...a.mensagens].sort((x, y) => (inteiro(x.id) ?? 0) - (inteiro(y.id) ?? 0));
    for (const m of emOrdem) {
      let dados = ehObjeto(m.dados) ? { ...m.dados } : null;
      if (dados) {
        if ("personagemId" in dados) dados.personagemId = novoPersonagem(dados.personagemId);
        if (ehObjeto(dados.decisao) && "campanhaId" in dados.decisao) dados = { ...dados, decisao: { ...dados.decisao, campanhaId: novaId } };
      }
      const autor = typeof m.autor === "string" ? m.autor : null;
      const rm = inserirMensagem.run(novaId, m.tipo, texto(m.texto), dados ? JSON.stringify(dados) : null, novoPersonagem(m.personagemId), autor, dataSql(m.criadaEm));
      const antigo = inteiro(m.id);
      if (antigo !== null) mensagens.push([antigo, Number(rm.lastInsertRowid)]);
    }
    // "até a mensagem X" do arquivo vira a última mensagem nova cujo id antigo era <= X
    const novaMensagem = (ate: unknown) => {
      const limite = inteiro(ate);
      if (limite === null || limite <= 0) return 0;
      let achada = 0;
      for (const [antigo, novo] of mensagens) if (antigo <= limite) achada = novo;
      return achada;
    };
    if (typeof cena.musicaDesde === "number") cena.musicaDesde = novaMensagem(cena.musicaDesde);
    db.prepare("UPDATE campanhas SET cena = ?, resumo_ate = ?, atualizada_em = datetime('now') WHERE id = ?").run(JSON.stringify(cena), novaMensagem(c.resumoAte), novaId);

    const inserirDiario = db.prepare("INSERT INTO diario (campanha_id, tipo, titulo, texto, status, dados, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))");
    for (const e of a.diario) {
      if (!texto(e.tipo) || !texto(e.titulo)) continue;
      inserirDiario.run(novaId, e.tipo, e.titulo, texto(e.texto), texto(e.status), ehObjeto(e.dados) ? JSON.stringify(e.dados) : null, dataSql(e.atualizadoEm));
    }
    const inserirFato = db.prepare("INSERT INTO fatos (campanha_id, texto, autor, ordem, criado_em) VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))");
    a.fatos.forEach((f, i) => {
      if (texto(f.texto).trim()) inserirFato.run(novaId, f.texto, texto(f.autor), inteiro(f.ordem) ?? i, dataSql(f.criadoEm));
    });
    db.exec("COMMIT");
    return novaId;
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

// ---------- ajustes globais (provedor, modelo...) ----------

export function lerAjuste<T>(chave: string, padrao: T): T {
  const l = db.prepare("SELECT valor FROM ajustes WHERE chave = ?").get(chave) as { valor: string } | undefined;
  return l ? (JSON.parse(l.valor) as T) : padrao;
}

export function salvarAjuste(chave: string, valor: unknown) {
  db.prepare("INSERT INTO ajustes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor").run(chave, JSON.stringify(valor));
}
