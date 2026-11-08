import { backup, DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ArquivoCampanha } from "./db";

// Cópias do banco e lixeira de campanhas. Tudo mora em data/ (fora do git; uma atualização nunca mexe):
//   data/copias/taverna-<data>-<motivo>.db  cópia inteira do banco (uma por dia, antes de cada migração, ou "agora");
//   data/lixeira/<id>-<nome>-<data>.json    campanha excluída no formato "taverna-campanha" (dá para restaurar).
// Este módulo não importa db.ts em tempo de execução (só o tipo): o src/instrumentation.ts o usa na subida, sem abrir o app.

/** Caminho do banco: TAVERNA_DB (testes, outra pasta) ou data/taverna.db a partir da pasta onde o servidor roda. */
export function arquivoBanco(): string {
  return process.env.TAVERNA_DB ? path.resolve(process.env.TAVERNA_DB) : path.join(process.cwd(), "data", "taverna.db");
}

export const pastaDados = () => path.dirname(arquivoBanco());
export const pastaCopias = () => path.join(pastaDados(), "copias");
export const pastaLixeira = () => path.join(pastaDados(), "lixeira");

/** Cópias do dia a dia (diária e "fazer cópia agora") que ficam guardadas; as mais velhas saem. */
export const COPIAS_GUARDADAS = 7;
/** Cópias de antes de migração: raras e preciosas (o banco do jeito que a versão anterior deixou). */
export const COPIAS_MIGRACAO_GUARDADAS = 3;
/** Campanhas na lixeira; acima disso as mais antigas saem. */
export const LIXEIRA_GUARDADAS = 30;
const UM_DIA = 24 * 60 * 60 * 1000;

export type MotivoCopia = "diaria" | "manual" | "migracao";

export type CopiaBanco = { arquivo: string; motivo: MotivoCopia; tamanho: number; criadaEm: Date };

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** "2026-11-08-142530" na hora local (o nome do arquivo é para gente ler). */
export function carimbo(d = new Date()): string {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}-${doisDigitos(d.getHours())}${doisDigitos(d.getMinutes())}${doisDigitos(d.getSeconds())}`;
}

/** Pedaço de nome de arquivo sem acento nem símbolo ("Noite em Tremere!" → "noite-em-tremere"). */
export function nomeSeguro(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "campanha"
  );
}

const NOME_COPIA = /^taverna-(\d{4}-\d{2}-\d{2}-\d{6})(?:-\d+)?-(diaria|manual|migracao)(?:-v\d+-v\d+)?\.db$/;

function destinoLivre(pasta: string, base: string, extensao: string): string {
  mkdirSync(pasta, { recursive: true });
  let alvo = path.join(pasta, base + extensao);
  for (let i = 2; existsSync(alvo); i++) alvo = path.join(pasta, `${base}-${i}${extensao}`);
  return alvo;
}

function nomeDaCopia(motivo: MotivoCopia, sufixo = "") {
  // o "-2" de destinoLivre entra antes do motivo para o nome continuar casando com NOME_COPIA
  // no mesmo segundo, o número segue o maior que já existe (uma cópia podada não libera o nome para "voltar no tempo")
  const base = `taverna-${carimbo()}`;
  const mesmos = existsSync(pastaCopias()) ? readdirSync(pastaCopias()).filter((n) => n.startsWith(`${base}-`)) : [];
  if (!mesmos.length) return path.join(pastaCopias(), `${base}-${motivo}${sufixo}.db`);
  const maior = Math.max(...mesmos.map((n) => ordemDoNome(n)[1]));
  return path.join(pastaCopias(), `${base}-${maior + 1}-${motivo}${sufixo}.db`);
}

/**
 * Cópia síncrona pela conexão já aberta (VACUUM INTO: consistente mesmo com WAL, e já sai compactada).
 * É a de antes de migrar: abrir() é síncrono e a migração não pode começar antes de a cópia existir.
 */
export function copiaAntesDeMigrar(conexao: DatabaseSync, de: number, para: number): string {
  mkdirSync(pastaCopias(), { recursive: true });
  const alvo = nomeDaCopia("migracao", `-v${de}-v${para}`);
  conexao.prepare("VACUUM INTO ?").run(alvo);
  podarCopias();
  return path.basename(alvo);
}

/** Cópia inteira do banco com o backup() do node:sqlite, numa conexão própria (o app segue usando a dele). */
export async function copiarBanco(motivo: MotivoCopia = "manual", destino?: string): Promise<CopiaBanco> {
  const origem = arquivoBanco();
  if (!existsSync(origem)) throw new Error("Ainda não existe banco para copiar.");
  if (!destino) mkdirSync(pastaCopias(), { recursive: true });
  const alvo = destino ?? nomeDaCopia(motivo);
  // escreve num temporário e só renomeia quando terminou: uma cópia pela metade nunca aparece na lista
  const temporario = `${alvo}.parcial`;
  const fonte = new DatabaseSync(origem, { timeout: 10000 });
  try {
    await backup(fonte, temporario, { rate: 10000 });
  } catch (erro) {
    rmSync(temporario, { force: true });
    throw erro;
  } finally {
    fonte.close();
  }
  renameSync(temporario, alvo);
  const info = statSync(alvo);
  if (!destino) podarCopias();
  return { arquivo: path.basename(alvo), motivo, tamanho: info.size, criadaEm: dataDoNome(path.basename(alvo)) ?? info.mtime };
}

/** A hora gravada no nome ("taverna-2026-11-08-142530-…"): não muda quando a pasta é copiada para outro disco. */
function dataDoNome(arquivo: string): Date | null {
  const m = NOME_COPIA.exec(arquivo);
  if (!m) return null;
  const [a, me, d, hms] = m[1].split("-");
  return new Date(Number(a), Number(me) - 1, Number(d), Number(hms.slice(0, 2)), Number(hms.slice(2, 4)), Number(hms.slice(4, 6)));
}

/** Ordem das cópias: hora do nome e, no mesmo segundo, o número "-2", "-3"... */
function ordemDoNome(arquivo: string): [number, number] {
  const seq = /^taverna-\d{4}-\d{2}-\d{2}-\d{6}-(\d+)-/.exec(arquivo);
  return [dataDoNome(arquivo)?.getTime() ?? 0, seq ? Number(seq[1]) : 1];
}

/** Cópias guardadas, da mais nova para a mais antiga. */
export function listarCopias(): CopiaBanco[] {
  const pasta = pastaCopias();
  if (!existsSync(pasta)) return [];
  const copias: CopiaBanco[] = [];
  for (const arquivo of readdirSync(pasta)) {
    const m = NOME_COPIA.exec(arquivo);
    if (!m) continue;
    const info = statSync(path.join(pasta, arquivo));
    copias.push({ arquivo, motivo: m[2] as MotivoCopia, tamanho: info.size, criadaEm: dataDoNome(arquivo) ?? info.mtime });
  }
  return copias.sort((a, b) => {
    const [ta, sa] = ordemDoNome(a.arquivo);
    const [tb, sb] = ordemDoNome(b.arquivo);
    return tb - ta || sb - sa;
  });
}

/** Caminho de uma cópia pelo nome, só se ela está na lista (nada de "../" vindo de fora). */
export function caminhoDaCopia(arquivo: string): string | null {
  return listarCopias().some((c) => c.arquivo === arquivo) ? path.join(pastaCopias(), arquivo) : null;
}

/** Deixa as COPIAS_GUARDADAS mais novas do dia a dia e as COPIAS_MIGRACAO_GUARDADAS de migração. */
export function podarCopias() {
  const copias = listarCopias();
  const sobra = [
    ...copias.filter((c) => c.motivo !== "migracao").slice(COPIAS_GUARDADAS),
    ...copias.filter((c) => c.motivo === "migracao").slice(COPIAS_MIGRACAO_GUARDADAS),
  ];
  for (const c of sobra) rmSync(path.join(pastaCopias(), c.arquivo), { force: true });
}

/** A última cópia do dia a dia (diária ou manual), se houver. */
export function ultimaCopia(): CopiaBanco | null {
  return listarCopias().find((c) => c.motivo !== "migracao") ?? null;
}

/** Faz a cópia diária se a última do dia a dia tem mais de 24 h (ou não existe). Devolve a cópia feita, ou null. */
export async function copiaDiariaSeVencida(agora = Date.now()): Promise<CopiaBanco | null> {
  if (!existsSync(arquivoBanco())) return null;
  const ultima = ultimaCopia();
  if (ultima && agora - ultima.criadaEm.getTime() < UM_DIA) return null;
  return copiarBanco("diaria");
}

/**
 * VACUUM quando mais de 25% das páginas estão livres (instantâneos apagados deixam buracos). Só depois de uma cópia
 * bem-sucedida, e sem insistir: com outro servidor segurando o banco o VACUUM dá "database is locked" e fica para amanhã.
 */
export function compactarSePreciso(): boolean {
  const origem = arquivoBanco();
  if (!existsSync(origem)) return false;
  const conexao = new DatabaseSync(origem, { timeout: 2000 });
  try {
    const paginas = (conexao.prepare("PRAGMA page_count").get() as { page_count: number }).page_count;
    const livres = (conexao.prepare("PRAGMA freelist_count").get() as { freelist_count: number }).freelist_count;
    if (!paginas || livres / paginas <= 0.25) return false;
    conexao.exec("VACUUM");
    return true;
  } catch (erro) {
    console.warn("[taverna] VACUUM adiado:", (erro as Error).message);
    return false;
  } finally {
    conexao.close();
  }
}

/** Rotina da subida e de hora em hora: cópia diária e, se ela deu certo, compactação. Nunca lança. */
export async function manutencaoDiaria(): Promise<void> {
  try {
    const copia = await copiaDiariaSeVencida();
    if (copia) compactarSePreciso();
  } catch (erro) {
    console.error("[taverna] cópia diária do banco falhou:", (erro as Error).message);
  }
}

/** Cópia nova num arquivo temporário (fora de data/copias), para "Baixar o banco". Quem chama apaga depois. */
export async function copiaParaBaixar(): Promise<string> {
  const alvo = path.join(tmpdir(), `taverna-baixar-${process.pid}-${Date.now()}.db`);
  await copiarBanco("manual", alvo);
  return alvo;
}

// ---------- lixeira ----------

export type ItemLixeira = {
  arquivo: string;
  nome: string;
  sistema: string;
  personagens: string[];
  mensagens: number;
  excluidaEm: Date;
  tamanho: number;
};

const NOME_LIXEIRA = /^[a-z0-9-]+\.json$/;

/** Grava a campanha (formato taverna-campanha) na lixeira e devolve o nome do arquivo. */
export function gravarNaLixeira(dados: ArquivoCampanha, idOriginal: number): string {
  const alvo = destinoLivre(pastaLixeira(), `${idOriginal}-${nomeSeguro(dados.campanha.nome)}-${carimbo()}`, ".json");
  writeFileSync(alvo, JSON.stringify(dados), "utf8");
  podarLixeira();
  return path.basename(alvo);
}

function caminhoNaLixeira(arquivo: string): string | null {
  if (!NOME_LIXEIRA.test(arquivo)) return null;
  const alvo = path.join(pastaLixeira(), arquivo);
  return existsSync(alvo) ? alvo : null;
}

export function lerDaLixeira(arquivo: string): unknown | null {
  const alvo = caminhoNaLixeira(arquivo);
  if (!alvo) return null;
  try {
    return JSON.parse(readFileSync(alvo, "utf8"));
  } catch {
    return null;
  }
}

export function removerDaLixeira(arquivo: string): boolean {
  const alvo = caminhoNaLixeira(arquivo);
  if (!alvo) return false;
  rmSync(alvo, { force: true });
  return true;
}

/** Campanhas na lixeira, da excluída mais recentemente para a mais antiga. Arquivo ilegível aparece com o nome do arquivo. */
export function listarLixeira(): ItemLixeira[] {
  const pasta = pastaLixeira();
  if (!existsSync(pasta)) return [];
  const itens: ItemLixeira[] = [];
  for (const arquivo of readdirSync(pasta)) {
    if (!NOME_LIXEIRA.test(arquivo)) continue;
    const info = statSync(path.join(pasta, arquivo));
    const dados = lerDaLixeira(arquivo) as Partial<ArquivoCampanha> | null;
    itens.push({
      arquivo,
      nome: typeof dados?.campanha?.nome === "string" ? dados.campanha.nome : arquivo,
      sistema: typeof dados?.campanha?.sistema === "string" ? dados.campanha.sistema : "",
      personagens: Array.isArray(dados?.personagens) ? dados.personagens.map((p) => String(p?.ficha?.nome ?? "")).filter(Boolean) : [],
      mensagens: Array.isArray(dados?.mensagens) ? dados.mensagens.length : 0,
      excluidaEm: typeof dados?.exportadoEm === "string" && !Number.isNaN(Date.parse(dados.exportadoEm)) ? new Date(dados.exportadoEm) : info.mtime,
      tamanho: info.size,
    });
  }
  return itens.sort((a, b) => b.excluidaEm.getTime() - a.excluidaEm.getTime());
}

export function podarLixeira() {
  for (const item of listarLixeira().slice(LIXEIRA_GUARDADAS)) removerDaLixeira(item.arquivo);
}
