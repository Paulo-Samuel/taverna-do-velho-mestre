import type { EntradaCriacao } from "../tipos";
import { ANCESTRALIDADES, type AncestralidadePf2 } from "./ancestralidades";
import { CLASSES, type ClassePf2, type Tradicao } from "./classes";
import { ANTECEDENTES, OPCOES_CRIACAO, TRADICAO_POR_SUBCLASSE, type AntecedentePf2 } from "./opcoes";
import { ATRIBUTOS, PERICIAS, nomePericia } from "./pericias";

// Regras de criação do PF2e que valem igual no servidor (criarFicha) e no navegador (passo de perícias e resumo do
// formulário): atributo-chave, aumentos da ancestralidade e do antecedente, perícias fixas e o limite real de escolhas.
// Sem "server-only": só dados e contas.

export function texto(v: unknown): string {
  return typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : "";
}

export function listaTexto(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : typeof v === "string" && v ? [v] : [];
}

function limitar(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// A malandragem do ladino troca o atributo-chave quando o jogador não escolheu um explicitamente.
const CHAVE_POR_MALANDRAGEM: Record<string, string> = { rufiao: "for", trapaceiro: "car", "mente-brilhante": "int" };

export function chaveDe(classe: ClassePf2, extras: Record<string, unknown>): string {
  const escolhida = texto(extras.chave);
  if (classe.chaves.includes(escolhida)) return escolhida;
  if (classe.id === "ladino") return CHAVE_POR_MALANDRAGEM[texto(extras.malandragem)] ?? "des";
  return classe.chaves[0];
}

export function ordemDe(classe: ClassePf2, chave: string): string[] {
  return [chave, ...classe.ordem.filter((a) => a !== chave)];
}

/** Atributos de partida (modificadores): aumento da classe no atributo-chave + 4 aumentos livres. */
export function atributosIniciaisPf2(classeId: string, metodo: string): Record<string, number> {
  const classe = CLASSES.find((c) => c.id === classeId) ?? CLASSES[0];
  const chave = classe.chaves[0];
  const atributos: Record<string, number> = Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 0]));
  atributos[chave] += 1; // aumento da classe
  const livres = metodo === "defensivo" ? [chave, ...["con", "des", "sab"].filter((a) => a !== chave)].slice(0, 4) : ordemDe(classe, chave).slice(0, 4);
  for (const id of livres) atributos[id] += 1;
  return atributos;
}

export function aplicarAncestralidadeEAntecedente(
  base: Record<string, number>,
  anc: AncestralidadePf2,
  antecedente: AntecedentePf2 | undefined,
  ordem: string[],
  extras: Record<string, unknown>,
): Record<string, number> {
  const atributos = { ...base };
  const fixos = Object.entries(anc.ajustes ?? {});
  for (const [id, v] of fixos) atributos[id] = (atributos[id] ?? 0) + v;
  const jaAumentados = new Set(fixos.filter(([, v]) => v > 0).map(([id]) => id));

  // aumentos livres da ancestralidade: escolhas do jogador, depois a prioridade da classe
  const validos = ATRIBUTOS.map((a) => a.id);
  const escolhidos = listaTexto(extras.aumento_ancestral).filter((id) => validos.includes(id) && !jaAumentados.has(id));
  const livres: string[] = [];
  for (const id of [...escolhidos, ...ordem]) {
    if (livres.length >= anc.livres) break;
    if (!jaAumentados.has(id) && !livres.includes(id)) livres.push(id);
  }
  for (const id of livres) atributos[id] = (atributos[id] ?? 0) + 1;

  if (antecedente) {
    const pedidos = listaTexto(extras.aumento_antecedente).filter((id) => validos.includes(id));
    const primeiro = pedidos.find((id) => antecedente.atributos.includes(id)) ?? ordem.find((id) => antecedente.atributos.includes(id)) ?? antecedente.atributos[0];
    const segundo = pedidos.find((id) => id !== primeiro) ?? ordem.find((id) => id !== primeiro)!;
    atributos[primeiro] = (atributos[primeiro] ?? 0) + 1;
    atributos[segundo] = (atributos[segundo] ?? 0) + 1;
  }

  for (const id of validos) atributos[id] = limitar(atributos[id] ?? 0, -1, 4);
  return atributos;
}

// ---------- Perícias concedidas por subclasse ----------

const PERICIAS_SUBCLASSE: Record<string, string[]> = {
  "estilo:bravateiro": ["intimidacao"], "estilo:esgrimista": ["dissimulacao"], "estilo:ginasta": ["atletismo"],
  "estilo:galhofeiro": ["performance"], "estilo:patife": ["ladroagem"], "estilo:dancarino": ["performance"],
  "ordem:animal": ["atletismo"], "ordem:folha": ["diplomacia"], "ordem:tempestade": ["acrobatismo"], "ordem:indomada": ["intimidacao"],
  "ordem:chama": ["acrobatismo"], "ordem:pedra": ["atletismo"],
  "metodologia:alquimica": ["manufatura"], "metodologia:forense": ["medicina"], "metodologia:interrogacao": ["diplomacia"],
  "misterio:ancestrais": ["sociedade"], "misterio:batalha": ["atletismo"], "misterio:ossos": ["medicina"], "misterio:cosmos": ["natureza"],
  "misterio:chamas": ["acrobatismo"], "misterio:vida": ["medicina"], "misterio:saber": ["ocultismo"], "misterio:tempestade": ["natureza"],
  "malandragem:ladrao": ["ladroagem"], "malandragem:rufiao": ["intimidacao"], "malandragem:trapaceiro": ["dissimulacao", "diplomacia"],
  "malandragem:mente-brilhante": ["sociedade"], "malandragem:vingador": ["religiao"], "malandragem:trapaceiro-mistico": ["arcanismo"],
  "linhagem:aberrante": ["intimidacao", "ocultismo"], "linhagem:angelica": ["diplomacia", "religiao"], "linhagem:demoniaca": ["intimidacao", "religiao"],
  "linhagem:diabolica": ["dissimulacao", "religiao"], "linhagem:draconica": ["arcanismo", "intimidacao"], "linhagem:elemental": ["intimidacao", "natureza"],
  "linhagem:feerica": ["dissimulacao", "natureza"], "linhagem:bruxesca": ["dissimulacao", "ocultismo"], "linhagem:imperial": ["arcanismo", "sociedade"],
  "linhagem:morta-viva": ["intimidacao", "religiao"], "linhagem:genio": ["arcanismo", "dissimulacao"], "linhagem:ninfa": ["diplomacia", "natureza"],
  "linhagem:fenix": ["natureza", "diplomacia"], "linhagem:psicopompo": ["medicina", "religiao"], "linhagem:sombra": ["furtividade", "ocultismo"],
  "patrono:chama-fe": ["religiao"], "patrono:inscrito": ["arcanismo"], "patrono:ressentimento": ["ocultismo"], "patrono:silencio-neve": ["natureza"],
  "patrono:fiandeira": ["ocultismo"], "patrono:sombra-sem-estrelas": ["ocultismo"], "patrono:zelador-selvagem": ["natureza"],
  "caminho:andarilho": ["acrobatismo"], "caminho:duelista": ["performance"], "caminho:atirador": ["furtividade"],
  "caminho:gatilho": ["ladroagem"], "caminho:vanguarda": ["atletismo"],
  "musa:enigma": [], "doutrina:guerra": [],
};

const PERICIA_TRADICAO: Record<Tradicao, string> = { arcana: "arcanismo", divina: "religiao", oculta: "ocultismo", primal: "natureza" };

/** Perícias que a subclasse escolhida dá, com o nome da opção que deu cada uma ("Linhagem: Dracônica"). */
export function periciasDeSubclasseComOrigem(classe: ClassePf2, extras: Record<string, unknown>): { id: string; origem: string }[] {
  const out: { id: string; origem: string }[] = [];
  for (const opcao of OPCOES_CRIACAO) {
    if (!opcao.classes?.includes(classe.id)) continue;
    for (const valor of listaTexto(extras[opcao.id])) {
      const nome = opcao.opcoes?.find((o) => o.id === valor)?.nome ?? valor;
      for (const id of PERICIAS_SUBCLASSE[`${opcao.id}:${valor}`] ?? []) out.push({ id, origem: `${opcao.rotulo}: ${nome}` });
    }
  }
  const eidolon = texto(extras.eidolon);
  if (classe.id === "invocador" && TRADICAO_POR_SUBCLASSE[eidolon]) out.push({ id: PERICIA_TRADICAO[TRADICAO_POR_SUBCLASSE[eidolon]], origem: "Eidolon" });
  // guerreiro de DES prefere Acrobatismo
  if (classe.id === "guerreiro" && chaveDe(classe, extras) === "des") out.push({ id: "acrobatismo", origem: "guerreiro de DES" });
  return out;
}

export function periciasDeSubclasse(classe: ClassePf2, extras: Record<string, unknown>): string[] {
  return periciasDeSubclasseComOrigem(classe, extras).map((p) => p.id);
}

/** Atributos finais da ficha nova (o que criarFicha grava): base do formulário + ancestralidade + antecedente. */
export function atributosFinaisPf2(entrada: Pick<EntradaCriacao, "classe" | "ancestralidade" | "antecedente" | "atributos" | "extras">): Record<string, number> {
  const classe = CLASSES.find((c) => c.id === entrada.classe) ?? CLASSES[0];
  const anc = ANCESTRALIDADES.find((a) => a.id === entrada.ancestralidade) ?? ANCESTRALIDADES.find((a) => a.id === "humano")!;
  const extras = entrada.extras ?? {};
  const chave = chaveDe(classe, extras);
  const antecedente = antecedenteOuPadrao(entrada.antecedente, chave);
  const base: Record<string, number> = Object.fromEntries(
    ATRIBUTOS.map((a) => [a.id, Number.isFinite(entrada.atributos?.[a.id]) ? Number(entrada.atributos![a.id]) : 0]),
  );
  if (!entrada.atributos) Object.assign(base, atributosIniciaisPf2(classe.id, "aumentos"));
  // se o jogador escolheu outro atributo-chave, ele herda o aumento de classe sugerido para o padrão
  const padrao = classe.chaves[0];
  if (chave !== padrao && base[chave] < base[padrao]) [base[chave], base[padrao]] = [base[padrao], base[chave]];
  return aplicarAncestralidadeEAntecedente(base, anc, antecedente, ordemDe(classe, chave), extras);
}

export function antecedenteOuPadrao(id: string | undefined, chave: string): AntecedentePf2 {
  return (id ? ANTECEDENTES.find((b) => b.id === id) : undefined) ?? ANTECEDENTES.find((b) => b.atributos.includes(chave)) ?? ANTECEDENTES[0];
}

export type PericiasCriacao = {
  /** perícias que já vêm treinadas (classe, antecedente, subclasse), com quem deu */
  fixas: { id: string; origem: string }[];
  /** quantas o jogador escolhe: perícias da classe + INT final + 1 por fixa repetida */
  limite: number;
  /** INT final (já com ancestralidade e antecedente) */
  int: number;
  /** como o limite foi montado, para o texto do passo */
  conta: string;
};

/** Perícias da criação no PF2e: as fixas (com origem) e o limite real de escolhas. */
export function periciasCriacaoPf2(entrada: Pick<EntradaCriacao, "classe" | "ancestralidade" | "antecedente" | "atributos" | "extras">): PericiasCriacao {
  const classe = CLASSES.find((c) => c.id === entrada.classe) ?? CLASSES[0];
  const extras = entrada.extras ?? {};
  const antecedente = antecedenteOuPadrao(entrada.antecedente, chaveDe(classe, extras));
  const int = atributosFinaisPf2(entrada).int ?? 0;
  const fixas: { id: string; origem: string }[] = [];
  let repetidas = 0;
  const candidatas = [
    ...(classe.pericias ?? []).map((id) => ({ id, origem: classe.nome })),
    { id: antecedente.pericia, origem: `antecedente ${antecedente.nome}` },
    ...periciasDeSubclasseComOrigem(classe, extras),
  ];
  for (const p of candidatas) {
    if (!PERICIAS.some((x) => x.id === p.id)) continue;
    const ja = fixas.find((f) => f.id === p.id);
    if (ja) {
      // repetida: vale uma escolha a mais, e o texto conta as duas origens
      repetidas++;
      ja.origem = `${ja.origem} e ${p.origem}`;
    } else fixas.push({ ...p });
  }
  const limite = Math.max(0, classe.maisPericias + int) + repetidas;
  const conta = [`${classe.maisPericias} da classe`, `${int >= 0 ? "+" : "−"}${Math.abs(int)} de INT`, repetidas ? `+${repetidas} por repetida` : ""].filter(Boolean).join(" ");
  return { fixas, limite, int, conta };
}

/**
 * Como criarFicha completa as escolhas que faltam: as sugeridas da classe, depois as perícias do atributo-chave, depois as de
 * conhecimento (INT). Nada de ordem alfabética.
 */
export function ordemDeCompletar(classeId: string, extras: Record<string, unknown> = {}): string[] {
  const classe = CLASSES.find((c) => c.id === classeId) ?? CLASSES[0];
  const chave = chaveDe(classe, extras);
  const doAtributo = (a: string) => PERICIAS.filter((p) => p.atributo === a).map((p) => p.id);
  const ordem = [...classe.sugeridas, ...doAtributo(chave), ...ordemDe(classe, chave).flatMap(doAtributo)];
  return [...new Set(ordem)].filter((id) => PERICIAS.some((p) => p.id === id));
}

export { nomePericia };
