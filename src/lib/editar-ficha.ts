import { normalizarRetrato } from "@/components/historia/retrato/dados";
import type { Ficha, OpcaoCriacao } from "./sistemas/tipos";

// Editar a ficha depois de criada (página /mesa/[id]/personagens/[pid]/editar e a server action editarPersonagemAcao).
// Só o que não mexe em número: nome, jogador, história e as opções de criação narrativas (conceito, ambição, senhor, seita,
// convicções, pedras de toque, vantagens, defeitos, especialidades...). Atributos, perícias, disciplinas e tudo o que o
// mestre ou o código grava em extras (mancha, surto, ressonância, notas de criação, XP gasto) ficam como estavam: a edição
// parte da ficha gravada e troca só as chaves desta lista.
// Funções puras (sem banco nem Next): a página monta os valores iniciais e a ação aplica o formulário.
// Campos do FormData (mesmo contrato e limites de lib/formulario-ficha.ts):
//   nome (60, obrigatório), jogador (40), historia (2000), extra_<idOpcao> (240 cada; escolha/texto: 1 valor; lista: vários)
// Modo história (ficha do sistema "historia"): nome (2 a 40), aparencia (200), historia (1500), retrato (JSON do rosto).

/** Escolhas fechadas que só descrevem o personagem (as demais, como "recursos" e "estilo" do Vampiro, mudam número). */
const ESCOLHAS_NARRATIVAS = new Set(["seita", "alinhamento", "fobia"]);
/** Campos de texto que valem como regra: o mestre lê como lista do que o personagem pode fazer. */
const TEXTOS_MECANICOS = new Set(["magias", "invocacoes", "facanhas", "saberes", "disciplinaPoderes"]);

/** Opções de criação do sistema que dá para editar nesta ficha (respeita classe e ancestralidade dela). */
export function opcoesEditaveis(opcoes: OpcaoCriacao[] | undefined, ficha: Pick<Ficha, "classe" | "ancestralidade">): OpcaoCriacao[] {
  return (opcoes ?? []).filter((o) => {
    if (o.classes?.length && !o.classes.includes(ficha.classe)) return false;
    if (o.ancestralidades?.length && !o.ancestralidades.includes(ficha.ancestralidade)) return false;
    if (o.tipo === "texto" || o.tipo === "lista-texto") return !TEXTOS_MECANICOS.has(o.id);
    return o.tipo === "escolha" && ESCOLHAS_NARRATIVAS.has(o.id);
  });
}

/** O valor gravado em extras como lista de textos (string vira [string]; o resto some). */
function comoLista(v: unknown): string[] {
  if (typeof v === "string") return v.trim() ? [v] : [];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  return [];
}

/** Valores atuais das opções editáveis, no formato do formulário (Escolhas.extras). */
export function extrasIniciais(ficha: Ficha, opcoes: OpcaoCriacao[]): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  for (const o of opcoes) {
    const v = comoLista(ficha.extras?.[o.id]);
    if (v.length) r[o.id] = v;
  }
  return r;
}

const texto = (form: FormData, campo: string, max: number) => String(form.get(campo) ?? "").trim().slice(0, max);
const igual = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export type ResultadoEdicao = { ok: true; ficha: Ficha; jogador: string; mudancas: string[] } | { ok: false; erro: string };

/**
 * Aplica o formulário a uma CÓPIA da ficha. Grava só nome, história e as chaves de `opcoes` em extras; `mudancas` diz o que
 * mudou, em minúsculas e na ordem da tela ("convicções", "história"), para a linha do chat.
 */
export function aplicarEdicao(original: Ficha, opcoes: OpcaoCriacao[], form: FormData, jogadorAtual = ""): ResultadoEdicao {
  const ficha: Ficha = structuredClone(original);
  ficha.extras = ficha.extras ?? {};
  const mudancas: string[] = [];

  const nome = texto(form, "nome", 60);
  if (!nome) return { ok: false, erro: "Seu personagem precisa de um nome." };
  if (nome !== original.nome) mudancas.push("nome");
  ficha.nome = nome;

  const jogador = form.has("jogador") ? texto(form, "jogador", 40) : jogadorAtual;
  if (jogador !== jogadorAtual) mudancas.push("jogador");

  for (const o of opcoes) {
    let valores = [...new Set(form.getAll(`extra_${o.id}`).map((v) => String(v).trim().slice(0, 240)).filter(Boolean))];
    if (o.tipo === "escolha" && o.opcoes?.length) {
      const ids = new Set(o.opcoes.filter((x) => !x.ancestralidades?.length || x.ancestralidades.includes(ficha.ancestralidade)).map((x) => x.id));
      valores = valores.filter((v) => ids.has(v));
    }
    if (o.obrigatoria && !valores.length) return { ok: false, erro: `Preencha: ${o.rotulo}.` };
    const lista = o.tipo === "lista-texto";
    if (lista) valores = valores.slice(0, o.max ?? valores.length);
    else valores = valores.slice(0, 1);
    if (igual(valores, comoLista(original.extras?.[o.id]))) continue;
    // "Senhor (quem te Abraçou)" vira "senhor": a linha do chat é curta
    mudancas.push(o.rotulo.replace(/\s*\(.*\)\s*$/, "").toLocaleLowerCase("pt-BR"));
    if (!valores.length) delete ficha.extras[o.id];
    else ficha.extras[o.id] = lista ? valores : valores[0];
  }

  const historia = texto(form, "historia", 2000);
  if (historia !== (original.historia ?? "").trim()) mudancas.push("história");
  ficha.historia = historia;

  return { ok: true, ficha, jogador, mudancas };
}

/**
 * Modo história: nome, aparência, história e rosto. Sexo, origem e ofício continuam os da ficha (o rosto novo veste a
 * mesma origem e o mesmo ofício); sem rosto no formulário, fica o retrato que já estava.
 */
export function aplicarEdicaoHistoria(original: Ficha, form: FormData, jogadorAtual = ""): ResultadoEdicao {
  const ficha: Ficha = structuredClone(original);
  ficha.extras = ficha.extras ?? {};
  const mudancas: string[] = [];
  const limpo = (campo: string, max: number) => String(form.get(campo) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

  const nome = limpo("nome", 40);
  if (nome.length < 2) return { ok: false, erro: "Todo herói tem nome. Até os que morrem na primeira cena." };
  if (nome !== original.nome) mudancas.push("nome");
  ficha.nome = nome;

  const aparencia = limpo("aparencia", 200);
  if (aparencia !== String(original.extras?.aparencia ?? "")) mudancas.push("aparência");
  if (aparencia) ficha.extras.aparencia = aparencia;
  else delete ficha.extras.aparencia;

  let retrato = null;
  try {
    retrato = normalizarRetrato(JSON.parse(String(form.get("retrato") || "null")));
  } catch {
    retrato = null;
  }
  if (retrato) {
    const antigo = original.extras?.retrato as { sexo?: string; origem?: string; classe?: string } | undefined;
    const sexo = String(original.extras?.sexo ?? antigo?.sexo ?? retrato.sexo);
    const novo = { ...retrato, sexo: sexo as typeof retrato.sexo, origem: original.ancestralidade || retrato.origem, classe: antigo?.classe ?? original.classe ?? retrato.classe };
    if (JSON.stringify(novo) !== JSON.stringify(original.extras?.retrato ?? null)) {
      mudancas.push("rosto");
      ficha.extras.retrato = novo;
    }
  }

  const historia = String(form.get("historia") ?? "").trim().slice(0, 1500);
  if (historia !== (original.historia ?? "").trim()) mudancas.push("história");
  ficha.historia = historia;

  return { ok: true, ficha, jogador: jogadorAtual, mudancas };
}

/** Linha do chat (e do histórico do mestre): "Ficha de Samuel atualizada: convicções, história". */
export function linhaDaEdicao(nomeAntigo: string, nomeNovo: string, mudancas: string[]): string {
  const quem = nomeAntigo !== nomeNovo ? `${nomeAntigo} (agora ${nomeNovo})` : nomeNovo;
  return `Ficha de ${quem} atualizada: ${mudancas.join(", ")}`;
}
