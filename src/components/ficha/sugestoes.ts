// Sugestões e sorteios do assistente de criação, no navegador e sem IA: as sementes de cada sistema
// (src/lib/sistemas/sementes) mais as regras públicas do sistema, para tudo que sai sorteado continuar válido.

import { nomeSorteado, sementesDe, type ContextoSemente, type SementesSistema } from "@/lib/sistemas/sementes";
import type { OpcaoCriacao, SistemaPublico } from "@/lib/sistemas/tipos";
import type { Escolhas } from "./passos";

/** Um item ao acaso (crypto, que não repete padrão entre abas). */
export function sortear<T>(lista: readonly T[]): T {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return lista[n % lista.length];
}

/** Sorteia evitando o atual, quando há outra opção. */
export function sortearOutro<T>(lista: readonly T[], atual?: T): T {
  const outras = lista.filter((x) => x !== atual);
  return sortear(outras.length ? outras : lista);
}

/** Até `n` itens diferentes, em ordem aleatória. */
export function sortearVarios<T>(lista: readonly T[], n: number): T[] {
  const copia = [...lista];
  const sorteio = crypto.getRandomValues(new Uint32Array(copia.length));
  for (let i = copia.length - 1; i > 0; i--) {
    const j = sorteio[i] % (i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, Math.max(0, n));
}

const fechada = (o: OpcaoCriacao) => (o.tipo === "escolha" || o.tipo === "multipla") && Boolean(o.opcoes?.length);

/** Máximo que vale agora (o do Vampiro muda com o estilo de perícias). */
export function maxEfetivo(o: OpcaoCriacao, extras: Record<string, string[]>): number | undefined {
  if (!o.maxPor) return o.max;
  const resposta = extras[o.maxPor.opcao]?.find((v) => v.trim()) || o.maxPor.padrao || "";
  return o.maxPor.valores[resposta] ?? o.max;
}

/** Opções de criação que valem para a classe, a ancestralidade e as respostas atuais (itens de outra ancestralidade somem). */
export function opcoesValidas(sistema: SistemaPublico | undefined, classe: string, ancestralidade: string, extras: Record<string, string[]> = {}): OpcaoCriacao[] {
  const vale = (lista: string[] | undefined, id: string) => !lista?.length || lista.includes(id);
  return (sistema?.opcoesCriacao ?? [])
    .filter((o) => vale(o.classes, classe) && vale(o.ancestralidades, ancestralidade))
    .map((o) => (o.opcoes?.some((x) => x.ancestralidades?.length) ? { ...o, opcoes: o.opcoes.filter((x) => vale(x.ancestralidades, ancestralidade)) } : o))
    .map((o) => (o.maxPor ? { ...o, max: maxEfetivo(o, extras) } : o))
    // lista fechada que ficou vazia (nenhuma herança desta ancestralidade) não tem o que escolher; cota 0 esconde a opção
    .filter((o) => !((o.tipo === "escolha" || o.tipo === "multipla") && o.opcoes && !o.opcoes.length))
    .filter((o) => !(o.maxPor && o.max === 0));
}

/** Respostas válidas de uma opção (fechadas: só ids da lista). */
export function valoresDe(o: OpcaoCriacao, extras: Record<string, string[]>): string[] {
  return (extras[o.id] ?? []).map((v) => v.trim()).filter((v) => v && (!fechada(o) || o.opcoes?.some((x) => x.id === v)));
}

/** Valores já usados pelas opções exclusivas com esta (valor → rótulo de onde está). */
export function bloqueadosPara(o: OpcaoCriacao, opcoes: OpcaoCriacao[], extras: Record<string, string[]>): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const id of o.exclusivaCom ?? []) {
    const outra = opcoes.find((x) => x.id === id);
    if (outra) for (const v of valoresDe(outra, extras)) mapa.set(v, outra.rotulo);
  }
  return mapa;
}

/** Primeira pendência das opções: obrigatória vazia, acima do máximo ou valor repetido entre opções exclusivas. */
export function problemaOpcoes(opcoes: OpcaoCriacao[], extras: Record<string, string[]>): string | null {
  for (const o of opcoes) {
    const valores = valoresDe(o, extras);
    if (o.obrigatoria && !valores.length) return `Preencha: ${o.rotulo}.`;
    if ((o.tipo === "multipla" || o.tipo === "lista-texto") && o.max !== undefined && valores.length > o.max) {
      return `${o.rotulo}: no máximo ${o.max}${o.maxPor ? " neste estilo" : ""}. Tire ${valores.length - o.max}.`;
    }
    const bloqueados = bloqueadosPara(o, opcoes, extras);
    const repetido = valores.find((v) => bloqueados.has(v));
    if (repetido) {
      const nome = o.opcoes?.find((x) => x.id === repetido)?.nome ?? repetido;
      return `${nome} está em “${o.rotulo}” e em “${bloqueados.get(repetido)}”. Escolha outra para uma delas.`;
    }
  }
  return null;
}

export function contexto(e: Escolhas, extras: Record<string, string[]> = e.extras): ContextoSemente {
  return { classe: e.classe, ancestralidade: e.ancestralidade, antecedente: e.antecedente, extras, sortear };
}

/** Sugestão para um campo de texto livre (evita repetir o que a lista já tem). Null quando o sistema não tem sementes para ele. */
export function sugerirTexto(sistemaId: string, campo: string, e: Escolhas, extras: Record<string, string[]> = e.extras): string | null {
  const gerar = sementesDe(sistemaId).campos?.[campo]?.gerar;
  if (!gerar) return null;
  const usados = new Set((extras[campo] ?? []).map((v) => v.trim().toLowerCase()));
  let valor = gerar(contexto(e, extras));
  for (let i = 0; i < 12 && usados.has(valor.toLowerCase()); i++) valor = gerar(contexto(e, extras));
  return valor;
}

/** Um par novo (Convicção, Pedra de Toque) que ainda não está na lista. */
export function sugerirPar(sistemaId: string, campo: string, e: Escolhas): [string, string] | null {
  const par = sementesDe(sistemaId).pares?.find((p) => p.campo === campo);
  if (!par) return null;
  const usados = new Set((e.extras[campo] ?? []).map((v) => v.trim().toLowerCase()));
  let valor = par.gerar(contexto(e));
  for (let i = 0; i < 12 && usados.has(valor[0].toLowerCase()); i++) valor = par.gerar(contexto(e));
  return valor;
}

/**
 * Sorteia as opções de criação. "faltam": só as vazias; "tudo": refaz todas que têm sugestão; "pronto": do zero, para o personagem pronto.
 * Respeita cotas (maxPor), exclusividade entre opções e o que o sistema completa melhor sozinho (deixarParaOSistema).
 */
export function sortearOpcoes(sistema: SistemaPublico, e: Escolhas, modo: "faltam" | "tudo" | "pronto"): Record<string, string[]> {
  const s = sementesDe(sistema.id);
  const extras: Record<string, string[]> = modo === "faltam" ? { ...e.extras } : modo === "tudo" ? { ...e.extras } : {};
  const pares = (s.pares ?? []).filter((p) => opcoesValidas(sistema, e.classe, e.ancestralidade, extras).some((o) => o.id === p.campo));
  const dePar = new Set(pares.flatMap((p) => [p.campo, p.par]));
  const ids = opcoesValidas(sistema, e.classe, e.ancestralidade, extras).map((o) => o.id);
  for (const id of ids) {
    if (dePar.has(id)) continue;
    // recalcula a cada passo: o estilo sorteado muda as cotas das perícias, a principal bloqueia a secundária
    const opcoes = opcoesValidas(sistema, e.classe, e.ancestralidade, extras);
    const o = opcoes.find((x) => x.id === id);
    if (!o) continue;
    if (modo === "faltam" && valoresDe(o, extras).length) continue;
    const valor = sortearUma(o, s, sistema.id, e, extras, bloqueadosPara(o, opcoes, extras));
    if (valor) extras[o.id] = valor;
  }
  for (const p of pares) {
    if (modo === "faltam" && (extras[p.campo] ?? []).some((v) => v.trim())) continue;
    const lista = Array.from({ length: 12 }, () => p.gerar(contexto(e, extras)));
    const unicos = [...new Map(lista.map((x) => [x[0], x])).values()].slice(0, p.pronto ?? 1);
    extras[p.campo] = unicos.map((x) => x[0]);
    extras[p.par] = unicos.map((x) => x[1]);
  }
  return extras;
}

/** Valor sorteado de uma opção; null mantém o que estava (sem sugestão para ela ou o sistema decide melhor). */
function sortearUma(o: OpcaoCriacao, s: SementesSistema, sistemaId: string, e: Escolhas, extras: Record<string, string[]>, bloqueados: Map<string, string>): string[] | null {
  if (s.deixarParaOSistema?.includes(o.id)) return null;
  if (fechada(o)) {
    // "outra (texto livre)" pede texto que o sorteio não tem; valor de opção exclusiva já usada fica de fora
    const candidatas = (o.opcoes ?? []).filter((x) => x.id !== "outra" && !bloqueados.has(x.id)).map((x) => x.id);
    if (!candidatas.length) return null;
    return o.tipo === "escolha" ? [sortear(candidatas)] : sortearVarios(candidatas, Math.min(o.max ?? 1, candidatas.length));
  }
  if (o.tipo === "texto" || o.tipo === "escolha") {
    const v = sugerirTexto(sistemaId, o.id, e, { ...extras, [o.id]: [] });
    return v ? [v] : null;
  }
  if (o.tipo === "lista-texto") {
    const campo = s.campos?.[o.id];
    if (!campo?.gerar) return null;
    const quantos = Math.min(campo.pronto ?? 1, o.max ?? 1);
    const linhas: string[] = [];
    for (let i = 0; i < quantos; i++) {
      const v = sugerirTexto(sistemaId, o.id, e, { ...extras, [o.id]: linhas });
      if (v && !linhas.includes(v)) linhas.push(v);
    }
    return linhas;
  }
  return null;
}

/** Perícias livres ao acaso, além das da classe, até o limite do sistema. */
export function sortearPericias(sistema: SistemaPublico, classe: string): string[] {
  const limite = sistema.periciasEscolhiveis ?? 0;
  const daClasse = new Set(sistema.classes.find((c) => c.id === classe)?.pericias ?? []);
  return sortearVarios(
    sistema.pericias.map((p) => p.id).filter((p) => !daClasse.has(p)),
    limite,
  );
}

/** ⚡ Personagem pronto: todas as escolhas de regra sorteadas (válidas), nome e história das sementes. Atributos ficam para o servidor sugerir. */
export function personagemPronto(sistema: SistemaPublico, e: Escolhas): Partial<Escolhas> {
  const s = sementesDe(sistema.id);
  const preferidas = sistema.ancestralidades.filter((a) => s.prontoAncestralidades?.includes(a.id)).map((a) => a.id);
  const ancestralidade = sistema.ancestralidades.length ? sortear(preferidas.length ? preferidas : sistema.ancestralidades.map((a) => a.id)) : "";
  const classe = sistema.classes.length ? sortear(sistema.classes.map((c) => c.id)) : "";
  const antecedente = sistema.antecedentes?.length ? sortear(sistema.antecedentes.map((a) => a.id)) : "";
  const base: Escolhas = { ...e, ancestralidade, classe, antecedente, extras: {}, pericias: [], atributos: {} };
  return {
    ancestralidade,
    classe,
    antecedente,
    atributos: {},
    pericias: sortearPericias(sistema, classe),
    extras: sortearOpcoes(sistema, base, "pronto"),
    nome: e.nome.trim() || nomeSorteado(s, sortear),
    historia: e.historia.trim() || sortear(s.ganchos),
  };
}

/** Nome ao acaso com a cara do sistema. */
export const nomeAoAcaso = (sistemaId: string) => nomeSorteado(sementesDe(sistemaId), sortear);
