import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { obterCampanha } from "@/lib/db";
import { EXTENSOES_AUDIO, HUMORES, type Faixa, type RespostaMusica } from "@/lib/cliente/musica/locais";
import { acessoPermitido, ehLocal } from "@/lib/rede/acesso";
import type { HumorMusical } from "@/lib/sistemas/tipos";

// Pasta musica/ na raiz do repo: as músicas da própria pessoa (fora do git).
// musica/<sistema>/<humor>/*, com fallbacks musica/<sistema>/*, musica/geral/<humor>/* e musica/geral/*.
// Nada aqui lê fora dessa pasta: caminhos são normalizados e conferidos (inclusive atalhos/links) antes de abrir.

export const RAIZ_MUSICA = path.join(process.cwd(), "musica");

const SISTEMA_VALIDO = /^[a-z0-9]{1,24}$/;
const TTL_MS = 10_000;

/** quem pode ouvir: esta máquina sempre; pela rede, quem pode ver a mesa (?campanha=<id>, com o PIN se houver) */
export function podeOuvir(request: Request, campanhaParam: string | null): boolean {
  if (ehLocal(request)) return true;
  const id = Number(campanhaParam);
  if (!Number.isInteger(id) || id <= 0) return false;
  const campanha = obterCampanha(id);
  return !!campanha && acessoPermitido(request, campanha);
}

/** nome de pasta comparável: minúsculo e sem acento ("Tensão" → "tensao") */
const comparavel = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

type Entrada = { nome: string; pasta: boolean };

async function listar(dir: string): Promise<Entrada[]> {
  try {
    const itens = await fs.readdir(dir, { withFileTypes: true });
    return itens.filter((i) => !i.name.startsWith(".")).map((i) => ({ nome: i.name, pasta: i.isDirectory() }));
  } catch {
    return [];
  }
}

const ehAudio = (nome: string) => Object.hasOwn(EXTENSOES_AUDIO, path.extname(nome).toLowerCase());

/** arquivos de áudio soltos numa pasta (sem descer), em ordem de nome */
function faixasDe(entradas: Entrada[], relativo: string): Faixa[] {
  return entradas
    .filter((e) => !e.pasta && ehAudio(e.nome))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((e) => ({ c: [relativo, e.nome].filter(Boolean).join("/"), nome: path.parse(e.nome).name }));
}

/** subpastas de humor de uma pasta: humor → faixas */
async function porHumor(dir: string, relativo: string, entradas: Entrada[]): Promise<Partial<Record<HumorMusical, Faixa[]>>> {
  const saida: Partial<Record<HumorMusical, Faixa[]>> = {};
  for (const e of entradas) {
    if (!e.pasta) continue;
    const humor = HUMORES.find((h) => h === comparavel(e.nome));
    if (!humor) continue;
    const lista = faixasDe(await listar(path.join(dir, e.nome)), `${relativo}/${e.nome}`);
    if (lista.length) saida[humor] = [...(saida[humor] ?? []), ...lista];
  }
  return saida;
}

const cache = new Map<string, { quando: number; dados: RespostaMusica }>();

/** faixas de um sistema por humor, com os fallbacks resolvidos (cache de 10 s: a pasta pode mudar a qualquer hora) */
export async function faixasDoSistema(sistema: string): Promise<RespostaMusica | null> {
  if (!SISTEMA_VALIDO.test(sistema)) return null;
  const guardada = cache.get(sistema);
  if (guardada && Date.now() - guardada.quando < TTL_MS) return guardada.dados;

  // pastas no nível de cima: acha "vtm5" e "geral" sem ligar para maiúsculas
  const topo = await listar(RAIZ_MUSICA);
  const pastaDe = (nome: string) => topo.find((e) => e.pasta && comparavel(e.nome) === nome)?.nome;
  const blocos = await Promise.all(
    [pastaDe(sistema), sistema === "geral" ? undefined : pastaDe("geral")].map(async (nome) => {
      if (!nome) return { humores: {}, soltas: [] as Faixa[] };
      const dir = path.join(RAIZ_MUSICA, nome);
      const entradas = await listar(dir);
      return { humores: await porHumor(dir, nome, entradas), soltas: faixasDe(entradas, nome) };
    }),
  );
  const [doSistema, geral] = blocos;

  const humores: RespostaMusica["humores"] = {};
  for (const h of HUMORES) {
    const lista = doSistema.humores[h] ?? (doSistema.soltas.length ? doSistema.soltas : null) ?? geral.humores[h] ?? (geral.soltas.length ? geral.soltas : null);
    if (lista?.length) humores[h] = lista;
  }
  const todas = new Set<string>();
  for (const b of blocos) {
    for (const f of b.soltas) todas.add(f.c);
    for (const lista of Object.values(b.humores)) for (const f of lista ?? []) todas.add(f.c);
  }
  const dados: RespostaMusica = { sistema, total: todas.size, humores };
  cache.set(sistema, { quando: Date.now(), dados });
  if (cache.size > 50) cache.delete(cache.keys().next().value!);
  return dados;
}

/**
 * Caminho relativo vindo da URL → caminho absoluto seguro dentro de musica/, ou null.
 * Recusa: vazio, byte nulo, absoluto (/x, C:\x, \\servidor), qualquer segmento "..", extensão fora da lista,
 * e qualquer coisa que, resolvida (inclusive por links simbólicos), saia da pasta.
 */
export async function caminhoSeguro(relativo: string | null): Promise<{ arquivo: string; tipo: string } | { erro: 400 | 404 }> {
  if (!relativo || relativo.length > 512 || relativo.includes("\0")) return { erro: 400 };
  if (path.isAbsolute(relativo) || path.win32.isAbsolute(relativo) || /^[a-zA-Z]:/.test(relativo)) return { erro: 400 };
  const partes = relativo.split(/[\\/]+/);
  if (partes.some((p) => p === ".." || p === ".")) return { erro: 400 };
  const tipo = EXTENSOES_AUDIO[path.extname(relativo).toLowerCase()];
  if (!tipo) return { erro: 400 };

  const raiz = path.resolve(RAIZ_MUSICA);
  const alvo = path.resolve(raiz, ...partes);
  if (!alvo.startsWith(raiz + path.sep)) return { erro: 400 };
  try {
    const [raizReal, alvoReal] = await Promise.all([fs.realpath(raiz), fs.realpath(alvo)]);
    if (!alvoReal.startsWith(raizReal + path.sep)) return { erro: 404 };
    const info = await fs.stat(alvoReal);
    if (!info.isFile()) return { erro: 404 };
    return { arquivo: alvoReal, tipo };
  } catch {
    return { erro: 404 };
  }
}
