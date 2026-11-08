import "server-only";
import { z } from "zod";
import { d, type GeradorInteiro } from "../../dados";
import { normalizar } from "../../sistemas/comum";
import { CONSULTAS, type ConsultaSistema, type Criatura, type GrupoTabela, type Tabela } from "../../sistemas/fantasia-tabelas";
import type { DefFerramenta } from "../tipos";
import { registrarDado, type ExtensaoFerramentas } from "./contexto";

// Extensão "consulta": bestiário e tabelas aleatórias sob demanda, no lugar de texto no prompt (que não incha).
// consultar_bestiario devolve o bloco de uma criatura (ou até 3 resumidas) do sistema da mesa; sortear_tabela sorteia no
// servidor um nome, lugar, complicação ou rumor. Cada chamada vira mensagem de dado (secreta por padrão) e o retorno para o
// modelo tem no máximo LIMITE_RETORNO caracteres. Os dados e os rótulos de cada sistema vêm do catálogo CONSULTAS
// (src/lib/sistemas/fantasia-tabelas.ts): só aparece para sistemas que estão lá, e só com os dados dele.

export const LIMITE_RETORNO = 600;

function consultaDe(sistemaId: string): ConsultaSistema | null {
  return Object.hasOwn(CONSULTAS, sistemaId) ? CONSULTAS[sistemaId] : null;
}

export function bestiarioDe(sistemaId: string): Criatura[] | null {
  return consultaDe(sistemaId)?.bestiario ?? null;
}

export function tabelasDe(sistemaId: string): Tabela[] | null {
  return consultaDe(sistemaId)?.tabelas ?? null;
}

/** Corta no limite sem partir palavra no meio, com reticências. */
export function cortar(texto: string, limite = LIMITE_RETORNO): string {
  if (texto.length <= limite) return texto;
  const corte = texto.slice(0, limite - 1);
  const espaco = corte.lastIndexOf(" ");
  return `${espaco > limite * 0.8 ? corte.slice(0, espaco) : corte}…`;
}

// ---------- bestiário ----------

const rotuloNivel = (sistemaId: string, n: number) => consultaDe(sistemaId)?.rotuloNivel(n) ?? `nível ${n}`;

function cabecalho(sistemaId: string, c: Criatura): string {
  const numeros = consultaDe(sistemaId)?.numeros(c) ?? `CA ${c.defesa} · PV ${c.pv}`;
  return `${c.nome} — ${rotuloNivel(sistemaId, c.nivel)} (${c.tipo}) · ${numeros}`;
}

/** O bloco inteiro de uma criatura (sem cortar: os testes garantem que todo bloco cabe no limite). */
export function blocoCriatura(sistemaId: string, c: Criatura): string {
  return [
    `${cabecalho(sistemaId, c)}${c.apoio ? ` · ${c.apoio}` : ""}`,
    `Ataques: ${c.ataques}`,
    `Especial: ${c.habilidade}`,
    `Fraqueza: ${c.fraqueza}`,
    `Tática: ${c.tatica}`,
    `${consultaDe(sistemaId)?.rotuloSaber(c) ?? "O que se sabe"}: ${c.saber}`,
    ...(c.fuga ? [`Fuga ou acordo: ${c.fuga}`] : []),
  ].join("\n");
}

function linhaCurta(sistemaId: string, c: Criatura): string {
  return `${cabecalho(sistemaId, c)}; ${c.ataques.split(";")[0]}`;
}

export type PedidoBestiario = { nome?: string; nivel?: number; tipo?: string };

/** Nota de 0 a 3 de quanto o nome pedido bate com a criatura (nome ou apelido). */
function pontuar(c: Criatura, busca: string): number {
  const nomes = [c.nome, ...(c.apelidos ?? [])].map(normalizar);
  if (nomes.includes(busca)) return 3;
  if (nomes.some((n) => n.startsWith(busca) || busca.startsWith(n))) return 2;
  if (nomes.some((n) => n.includes(busca) || (busca.length >= 4 && busca.split(" ").some((p) => p.length >= 4 && n.includes(p))))) return 1;
  return 0;
}

/** Consulta o bestiário do sistema. Devolve o texto para o modelo (≤ LIMITE_RETORNO) e os nomes das criaturas citadas. */
export function consultarBestiario(sistemaId: string, pedido: PedidoBestiario): { texto: string; criaturas: string[] } {
  const lista = bestiarioDe(sistemaId);
  if (!lista) throw new Error("Este sistema não tem bestiário: use as faixas das regras.");
  const perto = (a: Criatura, b: Criatura) => (pedido.nivel === undefined ? a.nivel - b.nivel : Math.abs(a.nivel - pedido.nivel) - Math.abs(b.nivel - pedido.nivel));
  let aviso = "";

  if (pedido.nome?.trim()) {
    const busca = normalizar(pedido.nome);
    const achados = lista
      .map((c) => ({ c, p: pontuar(c, busca) }))
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p || perto(a.c, b.c))
      .map((x) => x.c);
    if (achados.length) {
      const [primeira, ...outras] = achados;
      let texto = blocoCriatura(sistemaId, primeira);
      const extra = outras.length ? `\nTambém: ${outras.slice(0, 2).map((c) => `${c.nome} (${rotuloNivel(sistemaId, c.nivel)})`).join(", ")}.` : "";
      if (extra && texto.length + extra.length <= LIMITE_RETORNO) texto += extra;
      return { texto: cortar(texto), criaturas: [primeira.nome] };
    }
    aviso = `Não há "${pedido.nome.trim()}" no bestiário; os mais próximos pelo pedido: `;
  }

  let candidatos = lista;
  if (pedido.tipo?.trim()) {
    const t = normalizar(pedido.tipo);
    const doTipo = lista.filter((c) => normalizar(c.tipo).includes(t) || t.includes(normalizar(c.tipo)));
    if (doTipo.length) candidatos = doTipo;
    else aviso += `(sem tipo "${pedido.tipo.trim()}"; tipos: ${[...new Set(lista.map((c) => c.tipo))].join(", ")}) `;
  }
  if (pedido.nivel === undefined && !pedido.tipo?.trim()) {
    // sem filtro nenhum: o índice, para o mestre escolher pelo nome
    const indice = `Bestiário (${lista.length}): ${lista.map((c) => `${c.nome} (${rotuloNivel(sistemaId, c.nivel)})`).join(", ")}. Peça pelo nome para o bloco.`;
    return { texto: cortar(aviso + indice), criaturas: [] };
  }
  const tres = [...candidatos].sort(perto).slice(0, 3);
  const texto = `${aviso}${tres.map((c) => linhaCurta(sistemaId, c)).join("\n")}\nPeça pelo nome para o bloco completo (tática, fraqueza, fuga).`;
  return { texto: cortar(texto), criaturas: tres.map((c) => c.nome) };
}

// ---------- tabelas ----------

export type PedidoTabela = { tabela: string; filtro?: string; quantos?: number };

export type Sorteio = { texto: string; tabela: Tabela; grupo: GrupoTabela | null; resultados: string[]; faces: number[]; lados: number };

const chaveLegivel = (s: string) => normalizar(s.replace(/_/g, " "));

function acharTabela(tabelas: Tabela[], nome: string): Tabela {
  const n = chaveLegivel(nome);
  const t = tabelas.find((x) => chaveLegivel(x.id) === n) ?? tabelas.find((x) => normalizar(x.nome).includes(n) || chaveLegivel(x.id).includes(n));
  if (!t) throw new Error(`Tabela "${nome}" não existe neste sistema. Opções: ${tabelas.map((x) => x.id).join(", ")}.`);
  return t;
}

function opcoesDoFiltro(t: Tabela): string {
  return t.grupos.map((g) => g.rotulo ?? g.chave).join(", ");
}

function acharGrupo(t: Tabela, filtro: string): GrupoTabela {
  const bruto = filtro.trim();
  const numero = /\d+/.exec(bruto);
  if (numero && t.grupos.some((g) => g.de !== undefined)) {
    let n = Number(numero[0]);
    if (t.ano && n < 100) n += n < 30 ? 2000 : 1900;
    const g = t.grupos.find((x) => x.de !== undefined && x.ate !== undefined && n >= x.de && n <= x.ate);
    if (g) return g;
  }
  const f = chaveLegivel(bruto);
  const g =
    t.grupos.find((x) => chaveLegivel(x.chave) === f || normalizar(x.rotulo ?? "") === f) ??
    t.grupos.find((x) => chaveLegivel(x.chave).includes(f) || normalizar(x.rotulo ?? "").includes(f) || (f.length >= 3 && f.includes(chaveLegivel(x.chave))));
  if (!g) throw new Error(`Filtro "${bruto}" não existe em ${t.nome}. Opções: ${opcoesDoFiltro(t)}.`);
  return g;
}

/**
 * Sorteia numa tabela do sistema: sem repetir dentro do mesmo pedido, com o gerador de dados do servidor (`d`, trocado nos
 * testes por definirGerador) ou um gerador passado direto.
 */
export function sortearTabela(sistemaId: string, pedido: PedidoTabela, gerador?: GeradorInteiro): Sorteio {
  const tabelas = tabelasDe(sistemaId);
  if (!tabelas) throw new Error("Este sistema não tem tabelas aleatórias.");
  const t = acharTabela(tabelas, pedido.tabela);
  const rolar = (lados: number) => (gerador ? gerador(1, lados + 1) : d(lados));
  let grupo: GrupoTabela | null = null;
  if (pedido.filtro?.trim()) grupo = acharGrupo(t, pedido.filtro);
  else if (t.grupos.length === 1) grupo = t.grupos[0];
  else if (t.filtroObrigatorio) throw new Error(`${t.nome} precisa do filtro (${t.filtro}). Opções: ${opcoesDoFiltro(t)}.`);
  const pool = grupo ? grupo.entradas : t.grupos.flatMap((g) => g.entradas);
  const lados = pool.length;
  const quantos = Math.max(1, Math.min(5, Math.floor(pedido.quantos ?? 1), lados));
  const restantes = pool.map((e, i) => ({ e, face: i + 1 }));
  const faces: number[] = [];
  const resultados: string[] = [];
  for (let i = 0; i < quantos; i++) {
    const escolha = restantes.splice(rolar(restantes.length) - 1, 1)[0];
    faces.push(escolha.face);
    resultados.push(t.sufixos?.length ? `${escolha.e} ${t.sufixos[rolar(t.sufixos.length) - 1]}` : escolha.e);
  }
  const titulo = `${t.nome}${grupo && t.grupos.length > 1 ? ` (${grupo.rotulo ?? grupo.chave})` : ""}`;
  const texto = cortar(`${titulo} — d${lados}: ${faces.join(", ")} → ${resultados.join(" | ")}`);
  return { texto, tabela: t, grupo, resultados, faces, lados };
}

// ---------- ferramentas ----------

const ENTRADA_BESTIARIO = z.object({
  nome: z.string().optional(),
  nivel: z.coerce.number().optional(),
  tipo: z.string().optional(),
  publica: z.boolean().optional(),
});

const ENTRADA_TABELA = z.object({
  tabela: z.string().min(1, "Diga qual tabela."),
  filtro: z.string().optional(),
  quantos: z.coerce.number().int().min(1).max(5).optional(),
  publica: z.boolean().optional(),
});

function defBestiario(cfg: ConsultaSistema, lista: Criatura[]): DefFerramenta {
  return {
    name: "consultar_bestiario",
    description: `${cfg.titulo}: ANTES de iniciar um combate, consulte e use os números dele no iniciar, em vez de inventar. Pelo nome devolve o bloco (ataques, fraqueza, tática, o que o conhecimento revela, como foge ou negocia); por nível ou tipo, até 3 resumidas. Secreta por padrão.`,
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string", description: cfg.exemploNome },
        nivel: { type: "number", description: cfg.descricaoNivel },
        tipo: { type: "string", enum: [...new Set(lista.map((c) => c.tipo))], description: "Filtra pelo tipo." },
        publica: { type: "boolean", description: "true mostra aos jogadores o nome consultado (padrão: secreta)." },
      },
      additionalProperties: false,
    },
  };
}

function defTabela(tabelas: Tabela[]): DefFerramenta {
  const opcoes = tabelas
    .map((t) => {
      const chaves = t.filtro && !t.filtro.includes("(") && !t.grupos.some((g) => g.de !== undefined) && t.grupos.length <= 9 && t.grupos.length > 2 ? `: ${t.grupos.map((g) => g.chave).join(", ")}` : "";
      return `${t.id}${t.filtro ? ` (${t.filtro}${chaves})` : ""}`;
    })
    .join("; ");
  return {
    name: "sortear_tabela",
    description:
      "Tabelas aleatórias do sistema, sorteadas pelo servidor: em vez de inventar nome, lugar, complicação ou rumor, sorteie aqui e use o resultado. Secreta por padrão; publica: true mostra o resultado na mesa.",
    input_schema: {
      type: "object",
      properties: {
        tabela: { type: "string", enum: tabelas.map((t) => t.id), description: `Tabelas: ${opcoes}.` },
        filtro: { type: "string", description: "O grupo entre parênteses na tabela (ex.: \"1980\", \"ventrue\", \"sao_paulo\", \"3\"). Omita para qualquer." },
        quantos: { type: "integer", minimum: 1, maximum: 5, description: "Quantos resultados diferentes (padrão 1)." },
        publica: { type: "boolean", description: "true mostra o resultado aos jogadores (padrão: secreta)." },
      },
      required: ["tabela"],
      additionalProperties: false,
    },
  };
}

export const extensaoConsulta: ExtensaoFerramentas = {
  id: "consulta",
  vale: (s) => Boolean(bestiarioDe(s.id) || tabelasDe(s.id)),

  definicoes: (ctx) => {
    const cfg = consultaDe(ctx.sistema.id);
    if (!cfg) return [];
    return [...(cfg.bestiario ? [defBestiario(cfg, cfg.bestiario)] : []), ...(cfg.tabelas ? [defTabela(cfg.tabelas)] : [])];
  },

  executores: {
    consultar_bestiario: (ctx, entrada) => {
      const e = ENTRADA_BESTIARIO.parse(entrada);
      const r = consultarBestiario(ctx.sistema.id, e);
      const publica = Boolean(e.publica) && r.criaturas.length > 0;
      registrarDado(ctx, publica ? `Bestiário: ${r.criaturas.join(", ")}` : "O mestre consultou o bestiário", {
        tipo: "consulta",
        fonte: "bestiario",
        secreta: !publica,
        ...(publica ? { criaturas: r.criaturas } : {}),
      });
      return r.texto;
    },
    sortear_tabela: (ctx, entrada) => {
      const e = ENTRADA_TABELA.parse(entrada);
      const r = sortearTabela(ctx.sistema.id, e);
      const publica = Boolean(e.publica);
      const nome = r.texto.split(" — ")[0];
      const resultado = r.resultados.join(" | ");
      registrarDado(ctx, publica ? `Tabela ${nome}: ${resultado}` : `Tabela ${nome}: rolagem secreta do mestre`, {
        tipo: "rolagem",
        origem: "mestre",
        motivo: publica ? cortar(`${nome}: ${resultado}`, 160) : `Tabela: ${nome}`,
        secreta: !publica,
        expressao: `1d${r.lados}`,
        ...(publica ? { total: r.faces[0], descricao: resultado } : {}),
      });
      return r.texto;
    },
  },
};
