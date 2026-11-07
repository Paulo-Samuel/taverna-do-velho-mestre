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
 * Com `soIds` (um subpasso das Escolhas), só essas opções entram no sorteio; as outras ficam como estão.
 */
export function sortearOpcoes(sistema: SistemaPublico, e: Escolhas, modo: "faltam" | "tudo" | "pronto", soIds?: Set<string>): Record<string, string[]> {
  const s = sementesDe(sistema.id);
  const extras: Record<string, string[]> = modo === "faltam" ? { ...e.extras } : modo === "tudo" ? { ...e.extras } : {};
  const paresValidos = (s.pares ?? []).filter((p) => opcoesValidas(sistema, e.classe, e.ancestralidade, extras).some((o) => o.id === p.campo));
  const pares = paresValidos.filter((p) => !soIds || soIds.has(p.campo));
  const dePar = new Set(paresValidos.flatMap((p) => [p.campo, p.par]));
  const ids = opcoesValidas(sistema, e.classe, e.ancestralidade, extras).map((o) => o.id);
  for (const id of ids) {
    if (dePar.has(id) || (soIds && !soIds.has(id))) continue;
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

/* ---------- subpassos das Escolhas (Vampiro: Perícias, Disciplinas, Quem você é) ---------- */

export type GrupoOpcao = "pericias" | "disciplinas" | "alma";

export const NOMES_GRUPOS: Record<GrupoOpcao, string> = { pericias: "Perícias", disciplinas: "Disciplinas", alma: "Quem você é" };

const ORDEM_GRUPOS: GrupoOpcao[] = ["pericias", "disciplinas", "alma"];

/**
 * Grupo de uma opção de criação quando o sistema divide as Escolhas em subpassos; null = o sistema tem um passo só.
 * Um `grupo` declarado na própria opção vence (o contrato em lib/sistemas/tipos.ts ainda não o tem; até lá o Vampiro é
 * reconhecido pelos ids: estilo/pericias_N/especialidades, disciplina*, e o resto é quem o personagem é).
 */
export function grupoDaOpcao(sistemaId: string, o: OpcaoCriacao): GrupoOpcao | null {
  const declarado = (o as OpcaoCriacao & { grupo?: GrupoOpcao }).grupo;
  if (declarado && ORDEM_GRUPOS.includes(declarado)) return declarado;
  if (sistemaId !== "vtm5") return null;
  if (/^(estilo|pericias_\d|especialidades)$/.test(o.id)) return "pericias";
  if (/^disciplina/.test(o.id)) return "disciplinas";
  return "alma";
}

/** Grupos presentes nas opções válidas, na ordem dos subpassos; vazio quando o sistema não divide (ou só um grupo aparece). */
export function gruposDasOpcoes(sistemaId: string, opcoes: OpcaoCriacao[]): GrupoOpcao[] {
  const presentes = new Set(opcoes.map((o) => grupoDaOpcao(sistemaId, o)).filter((g): g is GrupoOpcao => g !== null));
  const lista = ORDEM_GRUPOS.filter((g) => presentes.has(g));
  return lista.length > 1 ? lista : [];
}

/** As opções de um grupo (ou todas, sem grupo). */
export function opcoesDoGrupo(sistemaId: string, opcoes: OpcaoCriacao[], grupo: GrupoOpcao | null): OpcaoCriacao[] {
  return grupo ? opcoes.filter((o) => grupoDaOpcao(sistemaId, o) === grupo) : opcoes;
}

/* ---------- grade de perícias por nível (Vampiro: pericias_4..1) ---------- */

/** As opções "pericias_N" (N = pontos) que valem agora, da mais alta para a mais baixa: [nível, opção]. */
export function niveisDePericias(opcoes: OpcaoCriacao[]): [number, OpcaoCriacao][] {
  return opcoes
    .map((o): [number, OpcaoCriacao] | null => {
      const m = /^pericias_(\d)$/.exec(o.id);
      return m && o.maxPor && o.tipo === "multipla" ? [Number(m[1]), o] : null;
    })
    .filter((x): x is [number, OpcaoCriacao] => x !== null)
    .sort((a, b) => b[0] - a[0]);
}

/** Em que nível cada perícia está (0 = em branco). A mesma perícia em dois níveis fica no mais alto. */
export function nivelDasPericias(niveis: [number, OpcaoCriacao][], extras: Record<string, string[]>): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const [n, o] of [...niveis].sort((a, b) => a[0] - b[0])) for (const id of valoresDe(o, extras)) mapa.set(id, n);
  return mapa;
}

/** Quantas perícias há em cada nível e qual a cota (o máximo em vigor para o estilo). */
export function contagemNiveis(niveis: [number, OpcaoCriacao][], extras: Record<string, string[]>): { nivel: number; usadas: number; cota: number }[] {
  return niveis.map(([nivel, o]) => ({ nivel, usadas: valoresDe(o, extras).length, cota: o.max ?? 0 }));
}

/**
 * Próximo nível ao clicar numa perícia: sobe para o nível seguinte que ainda tem vaga (○→●→●●→●●●→●●●●);
 * sem vaga acima, volta para ○. Passar da cota é impossível por aqui (só trocando de estilo com perícias já marcadas).
 */
export function proximoNivel(atual: number, niveis: [number, OpcaoCriacao][], extras: Record<string, string[]>): number {
  const acima = contagemNiveis(niveis, extras)
    .filter((c) => c.nivel > atual && c.usadas < c.cota)
    .sort((a, b) => a.nivel - b.nivel);
  return acima[0]?.nivel ?? 0;
}

/** Move a perícia para `nivel` (0 tira de todos), mantendo as outras onde estão. */
export function moverPericia(id: string, nivel: number, niveis: [number, OpcaoCriacao][], extras: Record<string, string[]>): Record<string, string[]> {
  const novo = { ...extras };
  for (const [n, o] of niveis) {
    const sem = (extras[o.id] ?? []).filter((v) => v !== id);
    novo[o.id] = n === nivel ? [...sem, id] : sem;
  }
  return novo;
}

/* ---------- cenário em branco ---------- */

export const PREFIXO_SUGESTAO_CENARIO = "Sugestão da taverna:";

/** Um começo de campanha das sementes do sistema, marcado como sugestão (o jogador vê e edita nos ajustes). */
export function sugestaoDeCenario(sistemaId: string, sorteio: <T>(lista: readonly T[]) => T = sortear): string {
  const cenarios = sementesDe(sistemaId).cenarios;
  return cenarios.length ? `${PREFIXO_SUGESTAO_CENARIO} ${sorteio(cenarios)}` : "";
}
