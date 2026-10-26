import "server-only";
import { d, somar } from "../dados";
import { clonar, distribuir, fichaBase, limitar, normalizar, sinal } from "./comum";
import { ERAS, type EraD100 } from "./d100/eras";
import { OCUPACOES, type OcupacaoD100 } from "./d100/ocupacoes";
import { FAIXAS_ETARIAS, FOBIAS, TALENTOS_PULP, TONS, type FaixaEtaria } from "./d100/opcoes";
import { PERICIAS_D100, type PericiaD100 } from "./d100/pericias";
import type { BlocoFicha, Ficha, GrauSucesso, PedidoTeste, ResultadoTeste, Sistema } from "./tipos";

// Horror investigativo d100 sobre o Basic Roleplaying (ORC License). Horror cósmico genérico, sem marcas de terceiros.
// Rola-se 1d100 e quer-se tirar MENOS que o valor da perícia; metade e um quinto do valor dão sucessos melhores.

const ID = "d100";
const NIVEL_MAX = 20;
const PERICIAS_ESCOLHIVEIS = 4;

type Caracteristica = { id: string; nome: string; abrev: string; descricao: string; dados: "3d6" | "2d6+6"; apelidos: string[] };

const CARACTERISTICAS: Caracteristica[] = [
  { id: "for", nome: "Força", abrev: "FOR", descricao: "Músculo para arrombar portas e segurar o que tenta fugir.", dados: "3d6", apelidos: ["forca", "esforco", "musculo"] },
  { id: "con", nome: "Constituição", abrev: "CON", descricao: "Saúde, fôlego e estômago para o que vem pela frente.", dados: "3d6", apelidos: ["constituicao", "vigor", "fortitude", "saude", "resistencia fisica"] },
  { id: "tam", nome: "Tamanho", abrev: "TAM", descricao: "Altura e massa. Ajuda a empurrar, atrapalha a se esconder.", dados: "2d6+6", apelidos: ["tamanho", "porte"] },
  { id: "des", nome: "Destreza", abrev: "DES", descricao: "Agilidade e reflexo para desviar, correr e mirar.", dados: "3d6", apelidos: ["destreza", "agilidade", "reflexos", "reflexo"] },
  { id: "apa", nome: "Aparência", abrev: "APA", descricao: "Beleza e presença. Abre portas sociais, nunca as do porão.", dados: "3d6", apelidos: ["aparencia", "beleza", "presenca"] },
  { id: "int", nome: "Inteligência", abrev: "INT", descricao: "Raciocínio e intuição: ligar as pistas antes que seja tarde.", dados: "2d6+6", apelidos: ["inteligencia", "ideia", "raciocinio", "deducao", "intuir"] },
  { id: "pod", nome: "Poder", abrev: "POD", descricao: "Força de vontade e afinidade com o sobrenatural. Define a Sanidade inicial.", dados: "3d6", apelidos: ["poder", "vontade", "forca de vontade", "determinacao"] },
  { id: "edu", nome: "Educação", abrev: "EDU", descricao: "Estudo formal e cultura geral. Paga os pontos da ocupação.", dados: "2d6+6", apelidos: ["educacao", "conhecimento", "saber", "cultura geral", "memoria"] },
];

// valores padrão distribuídos pela prioridade da ocupação; o resto segue esta ordem genérica
const VALORES_PADRAO = [80, 70, 60, 60, 50, 50, 50, 40];
const ORDEM_GENERICA = ["int", "edu", "pod", "des", "con", "apa", "tam", "for"];

const PERICIA_POR_ID = new Map(PERICIAS_D100.map((p) => [p.id, p]));
// perícias que nunca recebem pontos de criação
const SEM_PONTOS = new Set(["mitos", "credito"]);
const RESERVAS = ["encontrar", "biblioteca", "escutar", "persuasao", "psicologia", "esquivar"];
const INTERESSES_PADRAO = ["esquivar", "encontrar", "escutar", "furtividade"];

const NOMES_NIVEL = ["Falha", "Normal", "Difícil", "Extremo", "Crítico"];

// ---------- consultas básicas ----------

function ocupacaoDe(id: string): OcupacaoD100 {
  return OCUPACOES.find((o) => o.id === id) ?? OCUPACOES[0];
}

function eraDe(id: string): EraD100 {
  return ERAS.find((e) => e.id === id) ?? ERAS[0];
}

function faixaDe(ficha: Ficha): FaixaEtaria {
  return FAIXAS_ETARIAS.find((f) => f.id === extraTexto(ficha, "idade")) ?? FAIXAS_ETARIAS[1];
}

function extraTexto(ficha: Ficha, chave: string): string {
  const v = ficha.extras[chave];
  return typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : "";
}

function extraLista(ficha: Ficha, chave: string): string[] {
  const v = ficha.extras[chave];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  return typeof v === "string" && v.trim() ? [v] : [];
}

function ehPulp(ficha: Ficha): boolean {
  return extraTexto(ficha, "tom") === "pulp";
}

/** talentos só valem no tom pulp */
function temTalento(ficha: Ficha, id: string): boolean {
  return ehPulp(ficha) && extraLista(ficha, "talentos").includes(id);
}

function attr(ficha: Ficha, id: string): number {
  return ficha.atributos[id] ?? 50;
}

function baseDaPericia(ficha: Ficha, p: PericiaD100): number {
  const era = eraDe(ficha.ancestralidade);
  if (era.anacronicas.includes(p.id)) return 0;
  if (p.id in era.bases) return era.bases[p.id];
  if (p.baseDe) return Math.floor(attr(ficha, p.baseDe.atributo) / p.baseDe.divisor);
  return p.base;
}

function valorPericia(ficha: Ficha, id: string): number {
  // Mitos mora num recurso para o mestre conseguir aumentá-lo com alterar_ficha
  if (id === "mitos") return ficha.recursos.mitos?.atual ?? ficha.pericias.mitos ?? 0;
  const p = PERICIA_POR_ID.get(id);
  if (!p) return ficha.pericias[id] ?? 0;
  return ficha.pericias[id] ?? baseDaPericia(ficha, p);
}

function anacronica(ficha: Ficha, id: string): boolean {
  return eraDe(ficha.ancestralidade).anacronicas.includes(id);
}

// ---------- derivados ----------

function bonusDano(ficha: Ficha): { bd: string; corpo: number } {
  const soma = attr(ficha, "for") + attr(ficha, "tam");
  if (soma <= 64) return { bd: "-2", corpo: -2 };
  if (soma <= 84) return { bd: "-1", corpo: -1 };
  if (soma <= 124) return { bd: "0", corpo: 0 };
  if (soma <= 164) return { bd: "+1d4", corpo: 1 };
  if (soma <= 204) return { bd: "+1d6", corpo: 2 };
  const extra = Math.ceil((soma - 204) / 80);
  return { bd: `+${extra + 1}d6`, corpo: 2 + extra };
}

function movimento(ficha: Ficha): number {
  const f = attr(ficha, "for");
  const de = attr(ficha, "des");
  const t = attr(ficha, "tam");
  const base = f < t && de < t ? 7 : f > t && de > t ? 9 : 8;
  return Math.max(1, base - faixaDe(ficha).perdaMov + (temTalento(ficha, "rapido") ? 1 : 0));
}

function pvMaximo(ficha: Ficha): number {
  const soma = attr(ficha, "con") + attr(ficha, "tam");
  return Math.max(1, Math.floor(soma / (ehPulp(ficha) ? 5 : 10)) + (temTalento(ficha, "durao") ? 3 : 0));
}

function pmMaximo(ficha: Ficha): number {
  return Math.max(0, Math.floor(attr(ficha, "pod") / 5));
}

function sanMaxima(ficha: Ficha): number {
  return Math.max(0, 99 - valorPericia(ficha, "mitos"));
}

/** Mantém os máximos derivados coerentes (o mestre pode ter aumentado Mitos ou mudado características). */
function sincronizar(ficha: Ficha): void {
  const mitos = ficha.recursos.mitos ?? { rotulo: "Mitos", atual: ficha.pericias.mitos ?? 0, max: 99 };
  mitos.atual = limitar(mitos.atual, 0, 99);
  ficha.recursos.mitos = mitos;
  delete ficha.pericias.mitos;

  const sanMax = sanMaxima(ficha);
  const san = ficha.recursos.san ?? { rotulo: "Sanidade", atual: Math.min(attr(ficha, "pod"), sanMax), max: sanMax };
  san.max = sanMax;
  san.atual = limitar(san.atual, 0, sanMax);
  ficha.recursos.san = san;

  const sorte = ficha.recursos.sorte ?? { rotulo: "Sorte", atual: 50, max: 99 };
  sorte.max = 99;
  sorte.atual = limitar(sorte.atual, 0, 99);
  ficha.recursos.sorte = sorte;

  const pmMax = pmMaximo(ficha);
  const pm = ficha.recursos.pm ?? { rotulo: "Pontos de Magia", atual: pmMax, max: pmMax };
  pm.max = pmMax;
  pm.atual = limitar(pm.atual, 0, pmMax);
  ficha.recursos.pm = pm;
}

function limiteFerimentoGrave(ficha: Ficha): number {
  return Math.ceil(ficha.pvMax / 2);
}

function limiteInsanidadeIndefinida(ficha: Ficha): number {
  const inicio = Number(ficha.extras.sanInicioDia ?? ficha.recursos.san?.atual ?? 0);
  return Math.max(1, Math.floor(inicio / 5));
}

function temCondicao(ficha: Ficha, trecho: string): boolean {
  return ficha.condicoes.some((c) => normalizar(c).includes(trecho));
}

// ---------- rolagens de criação ----------

function rolarCaracteristica(dados: "3d6" | "2d6+6"): number {
  return dados === "3d6" ? somar(3, 6).total * 5 : (somar(2, 6).total + 6) * 5;
}

function ordemDe(oc: OcupacaoD100): string[] {
  return [...oc.prioridade, ...ORDEM_GENERICA.filter((id) => !oc.prioridade.includes(id))];
}

/** Embaralha com o motor de dados (nada de Math.random). */
function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = d(i + 1) - 1;
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Idade: EDU sobe com testes de melhoria, o corpo cobra o resto. */
function aplicarIdade(atributos: Record<string, number>, faixa: FaixaEtaria, notas: string[]): void {
  if (faixa.perdaEdu) atributos.edu -= faixa.perdaEdu;
  for (let i = 0; i < faixa.melhoriasEdu; i++) {
    const r = d(100);
    if (r > atributos.edu) {
      const ganho = d(10);
      atributos.edu = Math.min(99, atributos.edu + ganho);
      notas.push(`EDU +${ganho} (idade)`);
    }
  }
  // a perda física vai sempre para a maior entre FOR, CON e DES, de 5 em 5
  for (let resta = faixa.perdaFisica; resta > 0; resta -= 5) {
    const alvo = ["for", "con", "des"].reduce((a, b) => (atributos[b] > atributos[a] ? b : a));
    atributos[alvo] -= Math.min(5, resta);
  }
  if (faixa.perdaApa) atributos.apa -= faixa.perdaApa;
  for (const id of Object.keys(atributos)) atributos[id] = limitar(atributos[id], 5, 99);
}

/** Investe pontos de 5 em 5; as primeiras perícias da lista recebem mais passadas por rodada. */
function investir(ficha: Ficha, ids: string[], pontos: number, teto: number, pesado: boolean): number {
  let resta = pontos;
  let progresso = true;
  while (resta > 0 && progresso) {
    progresso = false;
    ids.forEach((id, i) => {
      const passes = pesado ? (i < 2 ? 3 : i < 5 ? 2 : 1) : 1;
      for (let k = 0; k < passes && resta > 0; k++) {
        const atual = valorPericia(ficha, id);
        if (atual >= teto) break;
        const soma = Math.min(5, resta, teto - atual);
        ficha.pericias[id] = atual + soma;
        resta -= soma;
        progresso = true;
      }
    });
  }
  return resta;
}

function periciasDaOcupacao(ficha: Ficha, oc: OcupacaoD100): string[] {
  const validas = oc.pericias.filter((id) => PERICIA_POR_ID.has(id) && !SEM_PONTOS.has(id) && !anacronica(ficha, id));
  // perícia que a era não conhece vira uma perícia de investigação genérica
  const faltam = oc.pericias.length - validas.length;
  const reservas = RESERVAS.filter((id) => !validas.includes(id)).slice(0, faltam);
  return [...new Set([...validas, ...reservas])];
}

// ---------- interpretação do teste ----------

type AlvoTeste = {
  rotulo: string;
  valor: number;
  tipo: "pericia" | "caracteristica" | "sanidade" | "sorte" | "livre";
  /** id da perícia, quando for uma */
  pericia?: string;
  nota?: string;
};

function limparTexto(texto: string): string {
  return normalizar(texto)
    .replace(/[()[\]{},.:;!?"'/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NOMES_LIMPOS = PERICIAS_D100.map((p) => ({
  p,
  frases: [...new Set([limparTexto(p.nome), limparTexto(p.id), ...(p.apelidos ?? []).map(limparTexto)])],
}));

function contemFrase(texto: string, frase: string): boolean {
  return new RegExp(`(^| )${frase.replace(/[-]/g, "\\-")}( |$)`).test(texto);
}

function caracteristicaExata(s: string): { c: Caracteristica; apelido: string } | undefined {
  for (const c of CARACTERISTICAS) {
    if (s === c.id || s === normalizar(c.abrev) || s === normalizar(c.nome)) return { c, apelido: "" };
    if (c.apelidos.includes(s)) return { c, apelido: s };
  }
  return undefined;
}

function alvoCaracteristica(ficha: Ficha, c: Caracteristica, apelido = ""): AlvoTeste {
  const especiais: Record<string, string> = { ideia: "Ideia", conhecimento: "Conhecimento", esforco: "Esforço", agilidade: "Agilidade", vontade: "Vontade" };
  const rotulo = especiais[apelido] ? `${especiais[apelido]} (${c.abrev})` : `${c.nome} (${c.abrev})`;
  return { rotulo, valor: attr(ficha, c.id), tipo: "caracteristica" };
}

function alvoPericia(ficha: Ficha, p: PericiaD100): AlvoTeste {
  return { rotulo: p.nome, valor: valorPericia(ficha, p.id), tipo: "pericia", pericia: p.id };
}

function melhorPericia(ficha: Ficha, ids: string[]): PericiaD100 {
  const lista = ids.map((id) => PERICIA_POR_ID.get(id)!).filter(Boolean);
  return lista.reduce((a, b) => (valorPericia(ficha, b.id) > valorPericia(ficha, a.id) ? b : a));
}

function periciaExata(s: string): PericiaD100 | undefined {
  return NOMES_LIMPOS.find((x) => x.frases.includes(s))?.p;
}

/** Perícia citada dentro de uma frase maior ("Encontrar a carta escondida"); vence a frase mais longa. */
function periciaContida(s: string, filtro?: (p: PericiaD100) => boolean): PericiaD100 | undefined {
  let melhor: { p: PericiaD100; tam: number } | undefined;
  for (const { p, frases } of NOMES_LIMPOS) {
    if (filtro && !filtro(p)) continue;
    for (const f of frases) {
      if (f.length > 2 && contemFrase(s, f) && (!melhor || f.length > melhor.tam)) melhor = { p, tam: f.length };
    }
  }
  return melhor?.p;
}

const ARMAS_DE_FOGO = ["pistolas", "rifles", "armasPesadas"];

function interpretar(ficha: Ficha, s: string): AlvoTeste | undefined {
  if (!s) return undefined;

  if (/^(sanidade|san)( |$)/.test(s)) {
    return { rotulo: "Sanidade", valor: ficha.recursos.san?.atual ?? attr(ficha, "pod"), tipo: "sanidade" };
  }
  if (/^sorte( |$)/.test(s)) return { rotulo: "Sorte", valor: ficha.recursos.sorte?.atual ?? 50, tipo: "sorte" };

  const exata = periciaExata(s);
  if (exata && !/^(tiro|atirar)$/.test(s)) return alvoPericia(ficha, exata);

  const carac = caracteristicaExata(s);
  if (carac) return alvoCaracteristica(ficha, carac.c, carac.apelido);

  // resistências: o d100 resolve com características (CON para venenos, POD para a mente, DES para reflexos)
  const resist = s.match(/^(?:resistencia|resistir|salvamento|salvaguarda|fortitude|reflexos?|vontade)(?: (?:de|a|ao|contra|da|do))? ?(.*)$/);
  if (resist) {
    const resto = resist[1] ?? "";
    const c =
      caracteristicaExata(resto)?.c ??
      CARACTERISTICAS.find((x) => x.id === (/^reflex/.test(s) || /queda|explos|armadilha/.test(resto) ? "des" : /^vontade/.test(s) || /mente|medo|mental|controle|hipno|possess|vontade/.test(resto) ? "pod" : "con"))!;
    const a = alvoCaracteristica(ficha, c);
    return { ...a, rotulo: `Resistência (${c.abrev})` };
  }

  if (/^(ataque|atacar|golpe|golpear|disparo|disparar|tiro|atirar|combate)( |$)/.test(s)) {
    const resto = s.replace(/^\S+ ?/, "");
    const citada = periciaContida(resto, (p) => Boolean(p.combate));
    if (citada) return { ...alvoPericia(ficha, citada), rotulo: `Ataque — ${citada.nome}` };
    const oc = ocupacaoDe(ficha.classe);
    const distancia = /distancia|arma de fogo|tiro|atira|disparo|dispara/.test(s);
    const p = distancia
      ? melhorPericia(ficha, oc.arma && PERICIA_POR_ID.get(oc.arma.pericia)?.combate === "distancia" ? [oc.arma.pericia] : ARMAS_DE_FOGO)
      : oc.arma && PERICIA_POR_ID.get(oc.arma.pericia)?.combate === "corpo"
        ? PERICIA_POR_ID.get(oc.arma.pericia)!
        : melhorPericia(ficha, ["lutar", "lutarArmas"]);
    return { ...alvoPericia(ficha, p), rotulo: `Ataque — ${p.nome}` };
  }

  if (/^(magia|conjur|feiti|ritual|encantamento|lancar magia)/.test(s)) {
    return { ...alvoCaracteristica(ficha, CARACTERISTICAS.find((c) => c.id === "pod")!), rotulo: "Conjuração (POD)" };
  }
  if (/^iniciativa/.test(s)) {
    return { ...alvoCaracteristica(ficha, CARACTERISTICAS.find((c) => c.id === "des")!), rotulo: "Iniciativa (DES)", nota: "no combate age-se em ordem de DES; arma de fogo já sacada age como DES+50" };
  }

  if (/^armas? de fogo/.test(s)) return alvoPericia(ficha, melhorPericia(ficha, ARMAS_DE_FOGO));

  // começo do nome ("lutar" → a melhor entre as lutas), depois perícia citada no meio da frase
  const prefixo = PERICIAS_D100.filter((p) => limparTexto(p.nome).startsWith(s) && s.length >= 3);
  if (prefixo.length) return alvoPericia(ficha, melhorPericia(ficha, prefixo.map((p) => p.id)));
  const contida = periciaContida(s);
  if (contida) return alvoPericia(ficha, contida);

  const primeira = s.split(" ")[0];
  const caracContida = caracteristicaExata(primeira) ?? CARACTERISTICAS.flatMap((c) => c.apelidos.filter((a) => contemFrase(s, a)).map((apelido) => ({ c, apelido })))[0];
  if (caracContida) return alvoCaracteristica(ficha, caracContida.c, caracContida.apelido);
  return undefined;
}

/** Junta o texto do teste com o pedido: dificuldade exigida, dados bônus/penalidade e o alvo final. */
function prepararTeste(ficha: Ficha, pedido: PedidoTeste) {
  let s = limparTexto(pedido.teste)
    .replace(/^(?:teste|rolagem|rolar|jogada|role)(?: de| da| do| em)? /, "")
    .trim();
  let exigido = 1;
  if (/(^| )extrem[oa]s?( |$)/.test(s)) exigido = 3;
  else if (/(^| )dificil( |$)/.test(s)) exigido = 2;
  s = s.replace(/(^| )(extrem[oa]s?|dificil|normal|regular)( |$)/g, " ").trim();

  let liquido = pedido.modo === "vantagem" ? 1 : pedido.modo === "desvantagem" ? -1 : 0;
  const bonusTxt = s.match(/(?:(\d) )?dados? (?:de )?bonus/);
  const penalTxt = s.match(/(?:(\d) )?dados? (?:de )?penalidade/);
  if (bonusTxt) liquido += Number(bonusTxt[1] ?? 1);
  if (penalTxt) liquido -= Number(penalTxt[1] ?? 1);
  liquido = limitar(liquido, -2, 2);
  s = s.replace(/(?:\d )?dados? (?:de )?(bonus|penalidade)/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/ (com|em|para|contra)$/, "").trim();

  const notas: string[] = [];
  const alvoPedido = pedido.alvo ?? null;
  if (alvoPedido !== null && alvoPedido >= 1 && alvoPedido < 5) exigido = Math.max(exigido, Math.min(3, alvoPedido));

  let alvo = interpretar(ficha, s);
  if (!alvo && alvoPedido !== null && alvoPedido >= 5 && alvoPedido <= 100) {
    alvo = { rotulo: pedido.teste || "Teste", valor: alvoPedido, tipo: "livre" };
  } else if (alvo && alvoPedido !== null && alvoPedido >= 5) {
    notas.push(`alvo ${alvoPedido} ignorado: no d100 o valor vem da ficha (use alvo 2 = Difícil, 3 = Extremo)`);
  }
  if (!alvo) {
    alvo = { rotulo: pedido.teste || "Teste", valor: 25, tipo: "livre" };
    notas.push("sem perícia correspondente na ficha: usado 25%");
  }
  return { alvo, exigido, liquido, notas };
}

function rolarD100(liquido: number) {
  const unidade = d(10) - 1;
  const dezenas = Array.from({ length: 1 + Math.abs(liquido) }, () => (d(10) - 1) * 10);
  // dezena 00 com unidade 0 é 100, o pior resultado possível
  const opcoes = dezenas.map((t) => (t + unidade === 0 ? 100 : t + unidade));
  const escolhido = liquido > 0 ? Math.min(...opcoes) : liquido < 0 ? Math.max(...opcoes) : opcoes[0];
  return { unidade, dezenas, opcoes, escolhido };
}

/** 4 crítico, 3 extremo, 2 difícil, 1 normal, 0 falha, -1 desastre */
function nivelAlcancado(r: number, valor: number): number {
  if (r === 1) return 4;
  if (r === 100 || (valor < 50 && r >= 96)) return -1;
  if (r <= Math.floor(valor / 5)) return 3;
  if (r <= Math.floor(valor / 2)) return 2;
  if (r <= valor) return 1;
  return 0;
}

function limiarDe(valor: number, exigido: number): number {
  return exigido >= 3 ? Math.floor(valor / 5) : exigido === 2 ? Math.floor(valor / 2) : valor;
}

// ---------- o sistema ----------

export const d100: Sistema = {
  id: ID,
  nome: "Horror Investigativo (d100)",
  nomeCurto: "Horror d100",
  descricao: "Perícias em porcentagem, sanidade que escorre e investigadores comuns diante do horror cósmico.",
  licenca: "Basic Roleplaying — ORC License (Chaosium); textos próprios da taverna",
  dadoPrincipal: "d100",
  pronto: true,
  rotulos: { ancestralidade: "Era", classe: "Ocupação", nivel: "Fase", defesa: "Armadura", dinheiro: "dinheiro", pv: "PV" },
  atributos: CARACTERISTICAS.map(({ id, nome, abrev, descricao }) => ({ id, nome, abrev, descricao })),
  pericias: PERICIAS_D100.map((p) => ({
    id: p.id,
    nome: p.nome,
    atributo: p.baseDe?.atributo,
    descricao: `${p.baseDe ? `Base: ${p.baseDe.divisor === 1 ? "" : "metade da "}${p.baseDe.atributo.toUpperCase()}` : `Base ${p.base}%`}. ${p.descricao}`,
  })),
  classes: OCUPACOES.map((o) => ({
    id: o.id,
    nome: o.nome,
    descricao: o.descricao,
    atributoChave: o.prioridade[0],
    // PV esperados com os valores padrão desta ocupação
    pvBase: Math.floor(((distribuir(VALORES_PADRAO, ordemDe(o)).con ?? 50) + (distribuir(VALORES_PADRAO, ordemDe(o)).tam ?? 50)) / 10),
    pericias: o.pericias,
    equipamento: o.equipamento,
    papel: o.papel,
    fonte: o.fonte,
  })),
  ancestralidades: ERAS.map((e) => ({ id: e.id, nome: e.nome, descricao: e.descricao, tracos: e.tracos })),
  opcoesCriacao: [
    { id: "idade", rotulo: "Faixa etária", ajuda: "Mais velho = mais EDU, menos físico.", tipo: "escolha", opcoes: FAIXAS_ETARIAS.map(({ id, nome, descricao }) => ({ id, nome, descricao })) },
    { id: "tom", rotulo: "Tom da campanha", ajuda: "Clássico é frágil; Pulp é aventura de revista barata.", tipo: "escolha", opcoes: TONS },
    { id: "talentos", rotulo: "Talentos (só no tom Pulp)", ajuda: "Até 2. Ignorados no tom Clássico.", tipo: "multipla", max: 2, opcoes: TALENTOS_PULP },
    { id: "fobia", rotulo: "Fobia", ajuda: "O mestre vai lembrar disso na pior hora.", tipo: "escolha", opcoes: FOBIAS },
    { id: "especialidades", rotulo: "Especialidades", ajuda: "Para Arte/Ofício, Ciência e Outra Língua. Ex.: Fotografia, Química, Latim.", tipo: "lista-texto", max: 3 },
    { id: "ideologia", rotulo: "Ideologia ou crença", ajuda: "No que você acredita (até ver o que vai ver).", tipo: "texto" },
    { id: "pessoaImportante", rotulo: "Pessoa importante", ajuda: "Alguém por quem você entraria no porão.", tipo: "texto" },
    { id: "localSignificativo", rotulo: "Lugar significativo", ajuda: "Onde você se sente seguro. Por enquanto.", tipo: "texto" },
    { id: "objetoPrecioso", rotulo: "Objeto precioso", ajuda: "Aquilo que você salvaria de um incêndio.", tipo: "texto" },
  ],
  metodosAtributos: [
    { id: "padrao", nome: "Valores padrão", descricao: "80, 70, 60, 60, 50, 50, 50, 40, distribuídos pela ocupação." },
    { id: "rolar", nome: "Rolar", descricao: "3d6×5 (FOR, CON, DES, APA, POD) e (2d6+6)×5 (TAM, INT, EDU), em ordem." },
    { id: "heroico", nome: "Heroico", descricao: "(2d6+6)×5 em tudo. Para o tom Pulp ou mestres bonzinhos." },
  ],
  limitesAtributos: { min: 15, max: 99 },
  periciasEscolhiveis: PERICIAS_ESCOLHIVEIS,
  nivelMaximo: NIVEL_MAX,
  testesSugeridos: ["Encontrar", "Escutar", "Biblioteca", "Psicologia", "Furtividade", "Lábia", "Persuasão", "Esquivar", "Lutar", "Armas de Fogo", "Ideia", "Sorte", "Sanidade"],
  regrasParaMestre: `Sistema: horror investigativo d100 (Basic Roleplaying, ORC). Investigadores comuns contra o horror cósmico: correr e pesquisar valem mais que lutar.
TESTE: rola-se 1d100 e o resultado precisa ser MENOR OU IGUAL ao valor da perícia/característica. Graus: 01 = Crítico; ≤ 1/5 do valor = Extremo; ≤ 1/2 = Difícil; ≤ valor = Normal; acima = Falha; 100 (ou 96-100 se o valor for menor que 50) = Desastre.
COMO PEDIR O TESTE (teste ou pedir_teste): em "teste" passe a perícia ("Encontrar", "Biblioteca", "Lábia", "Armas de Fogo", "Lutar"), a característica ("FOR", "DES", "INT", "Ideia" = INT, "Conhecimento" = EDU, "Esforço" = FOR), "Sorte", "Sanidade", "Resistência" (CON contra veneno/doença; "Resistência de POD" contra controle mental; "Reflexos" = DES), "Ataque" (usa a arma da ocupação ou a melhor luta; "Ataque à distância" usa armas de fogo), "Magia" (POD) ou "Iniciativa" (DES).
- NÃO passe CD. "alvo" é a dificuldade exigida: omita (Normal), 2 = Difícil (precisa de ≤ metade), 3 = Extremo (≤ um quinto). Use Difícil para tarefas sob pressão ou contra alguém competente (perícia do oponente 50+), Extremo para o quase impossível (oponente 90+).
- "modo": vantagem = 1 dado bônus (rola duas dezenas e fica com a menor), desvantagem = 1 dado de penalidade (fica com a maior). Escreva "2 dados de bônus" no nome do teste para dois. "modificador" soma pontos percentuais ao valor (raramente necessário; prefira dados bônus/penalidade).
- Oposição: cada lado testa; vence o grau maior; empate fica com quem tem o valor mais alto.
PISTAS: nenhuma pista essencial fica presa atrás de um único teste. Falhou em Biblioteca? A informação chega mais tarde, mais cara ou com um perigo junto. O teste decide o custo e o tempo, não se a história anda.
FORÇAR (pushing): depois de uma falha (nunca em Sanidade, Sorte ou combate), o jogador pode justificar uma nova tentativa. Antes de rolar, anuncie a consequência; se o teste forçado falhar, ela acontece com peso total (ferimento, perda de SAN, alarme, captura).
SORTE (recurso "sorte"): o jogador pode gastar pontos de Sorte, 1 por 1, para baixar o resultado do d100 e transformar falha em sucesso — não vale em Sanidade, Sorte, dano nem teste forçado. Aplique com alterar_ficha recursos {"sorte": -N}. Teste de "Sorte" (d100 ≤ Sorte atual) decide acasos do grupo: tem táxi? a lanterna funciona?
SANIDADE (recurso "san", máximo 99 − Mitos): diante do horror, peça o teste "Sanidade" e anuncie a perda como "sucesso/falha", ex.: cadáver mutilado 0/1d3, criatura menor 1/1d6, horror maior 1d6/1d20, deus antigo 1d10/1d100. Role a perda com rolar_dados e aplique com alterar_ficha recursos {"san": -N}.
- Perdeu 5+ SAN numa só rolagem: teste de "Ideia" (INT). Se PASSAR, o investigador entende o que viu e enlouquece temporariamente (1d10 horas): surto de 1d10 rodadas (fuga desesperada, ataque de pânico, desmaio, gritaria, comportamento estranho) e depois uma fobia ou mania. Se falhar, a mente reprime e ele segue em choque.
- Perdeu 1/5 da SAN que tinha no começo do dia: insanidade indefinida (meses), com delírios e episódios. SAN 0: loucura permanente — o personagem vira PdM.
- Registre insanidade em condições ("Insanidade Temporária", "Insanidade Indefinida"). Psicanálise e repouso ajudam a recuperar. Ler tomos proibidos aumenta Mitos (alterar_ficha recursos {"mitos": +N}) e reduz o máximo de SAN.
COMBATE: rodadas em ordem de DES (arma de fogo pronta age como DES+50). Corpo a corpo é teste oposto: atacante "Ataque"/"Lutar" contra Esquivar ou contra-ataque (Lutar) do defensor; quem tiver o grau maior acerta. Armas de fogo: "Armas de Fogo" com Normal no alcance básico, Difícil em longo alcance, Extremo em muito longo; à queima-roupa ganha dado bônus; alvo que se joga no chão é penalidade. Esquivar contra tiro só com cobertura à vista.
- Dano: soco 1d3+BD, faca 1d4+BD, porrete 1d6+BD, machado 1d8+2+BD, revólver/pistola 1d10, rifle 2d6+4, escopeta 4d6/2d6/1d6 (perto/médio/longe). Sucesso Extremo com arma perfurante = dano máximo + mais uma rolagem; com arma de impacto, dano máximo. BD = bônus de dano da ficha.
- Armadura reduz o dano. Ferimento grave: perder metade ou mais dos PV máximos num golpe só → condição "Ferimento Grave", teste de CON ou desmaia. PV 0 com ferimento grave = "Morrendo" (CON a cada rodada até receber Primeiros Socorros). PV 0 sem ferimento grave = inconsciente.
- Inimigos humanos: cultista 10-12 PV, Lutar 40-50%; capanga 12-14 PV; criaturas têm armadura e pedem Sanidade só de olhar.
- Primeiros Socorros cura 1 PV (e estabiliza); Medicina cura 1d3 após o socorro.
MAGIA: feitiços custam Pontos de Magia (recurso "pm") e quase sempre SAN; teste "Magia" (POD) quando houver resistência ou risco. PM voltam com descanso.
EVOLUÇÃO: não há níveis nem XP. Ao fim de uma aventura o mestre concede uma "fase de desenvolvimento" (subir de nível na ferramenta): perícias usadas com sucesso podem melhorar 1d10, recupera um pouco de SAN e talvez Sorte.
Descanso: curto = PM voltam aos poucos (1 por hora); longo (noite/dia de repouso) = PM cheios e +1 PV (ferimento grave pede teste de CON para sarar).
COMO MESTRAR O HORROR
- Investigadores são frágeis e comuns: uma faca mata, um tiro derruba. Correr, esconder, queimar o livro e chamar a polícia são vitórias; luta é a pior opção e deve parecer assim.
- Pistas essenciais nunca dependem de teste (veja PISTAS): procurou no lugar certo, achou; o teste decide o extra, o tempo e o preço. Pistas concretas (um recibo, uma marca no batente, um nome riscado) e os jogadores ligam os pontos.
- Horror pelo não-dito: o efeito antes da causa (cheiro, cachorros calados, alguém a mais na foto). Revele a coisa em pedaços e nunca a explique por inteiro: uma frase certa assusta mais que um parágrafo de tentáculos.
- Escalada: normalidade com uma rachadura → padrões estranhos → presença → revelação. Cada cena aperta um grau.
- Sanidade é a moeda: peça o teste diante do horror de verdade, não de qualquer cadáver; narre a perda pelo corpo (mãos que não param, riso fora de hora). Surto é cena: descreva o impulso e deixe o jogador interpretar.
- Forçar é oferta séria: diga o preço antes (o vigia acorda, o livro cobra SAN, o chão cede) e cumpra.
- NPCs mentem por medo, vergonha ou porque o culto paga. Documentos e diários aparecem em trechos curtos, com a voz de quem escreveu. Respeite a época (em 1920 há telegrama e telefonista, não celular).
- No pedir_teste, dado de bônus/penalidade vai em modo ("vantagem"/"desvantagem"); "difícil" ou "extremo" vão no nome do teste (alvo 1 = Normal).`,

  atributosIniciais(classeId, metodo) {
    const oc = ocupacaoDe(classeId);
    if (metodo === "rolar") return Object.fromEntries(CARACTERISTICAS.map((c) => [c.id, rolarCaracteristica(c.dados)]));
    if (metodo === "heroico") return Object.fromEntries(CARACTERISTICAS.map((c) => [c.id, rolarCaracteristica("2d6+6")]));
    return distribuir(VALORES_PADRAO, ordemDe(oc));
  },

  criarFicha(entrada) {
    const oc = ocupacaoDe(entrada.classe);
    const era = eraDe(entrada.ancestralidade);
    const ficha = fichaBase(ID, entrada.nome);
    ficha.classe = oc.id;
    ficha.ancestralidade = era.id;
    if (entrada.antecedente) ficha.antecedente = entrada.antecedente;
    ficha.historia = entrada.historia ?? "";

    // extras com valores válidos (o formulário pode mandar lixo ou nada)
    const extras: Record<string, unknown> = { ...(entrada.extras ?? {}) };
    const idade = typeof extras.idade === "string" && FAIXAS_ETARIAS.some((f) => f.id === extras.idade) ? extras.idade : "adulto";
    const tom = extras.tom === "pulp" ? "pulp" : "classico";
    const talentosBrutos = Array.isArray(extras.talentos) ? extras.talentos : typeof extras.talentos === "string" ? [extras.talentos] : [];
    const talentos = talentosBrutos.filter((t): t is string => typeof t === "string" && TALENTOS_PULP.some((x) => x.id === t)).slice(0, 2);
    const fobia = typeof extras.fobia === "string" && FOBIAS.some((f) => f.id === extras.fobia) ? extras.fobia : "nenhuma";
    ficha.extras = { ...extras, idade, tom, talentos, fobia };

    const base = entrada.atributos ?? d100.atributosIniciais(oc.id, "padrao");
    const atributos = Object.fromEntries(CARACTERISTICAS.map((c) => [c.id, limitar(Math.round(Number(base[c.id] ?? 50)) || 50, 5, 99)]));
    const notas: string[] = [];
    const faixa = FAIXAS_ETARIAS.find((f) => f.id === idade)!;
    aplicarIdade(atributos, faixa, notas);
    ficha.atributos = atributos;

    // Sorte: 3d6×5 (pulp: (2d6+6)×5); jovens rolam duas vezes e ficam com a melhor
    const dadoSorte = tom === "pulp" ? "2d6+6" : "3d6";
    let sorte = rolarCaracteristica(dadoSorte);
    if (faixa.sorteDupla) sorte = Math.max(sorte, rolarCaracteristica(dadoSorte));
    if (temTalento(ficha, "sortudo")) sorte += 10;
    sorte = limitar(sorte, 5, 99);

    // pontos de ocupação: crédito primeiro (40% da faixa), o resto nas perícias da ocupação
    let pontos = Object.entries(oc.pontos).reduce((s, [id, mult]) => s + attr(ficha, id) * mult, 0);
    const [credMin, credMax] = oc.credito;
    const credito = Math.min(pontos, Math.round(credMin + (credMax - credMin) * 0.4));
    ficha.pericias.credito = credito;
    pontos -= credito;
    const sobra = investir(ficha, periciasDaOcupacao(ficha, oc), pontos, 75, true);
    if (sobra > 0) ficha.pericias.credito = Math.min(credMax, credito + sobra);

    // interesse pessoal: INT×2 nas perícias escolhidas pelo jogador
    const validas = (entrada.pericias ?? []).filter((id) => PERICIA_POR_ID.has(id) && !SEM_PONTOS.has(id) && !anacronica(ficha, id));
    const interesses = [...new Set(validas)].slice(0, PERICIAS_ESCOLHIVEIS);
    investir(ficha, interesses.length ? interesses : INTERESSES_PADRAO, attr(ficha, "int") * 2, 75, false);
    ficha.extras.interesses = interesses.length ? interesses : INTERESSES_PADRAO;

    // recursos
    const mitos = oc.mitosInicial ?? 0;
    ficha.recursos.mitos = { rotulo: "Mitos", atual: mitos, max: 99 };
    const sanMax = 99 - mitos;
    const san = Math.min(sanMax, attr(ficha, "pod") - mitos + (temTalento(ficha, "menteDeAco") ? 10 : 0));
    ficha.recursos.san = { rotulo: "Sanidade", atual: Math.max(0, san), max: sanMax };
    ficha.recursos.sorte = { rotulo: "Sorte", atual: sorte, max: 99 };
    const pm = pmMaximo(ficha);
    ficha.recursos.pm = { rotulo: "Pontos de Magia", atual: pm, max: pm };
    sincronizar(ficha);

    ficha.pvMax = pvMaximo(ficha);
    ficha.pv = ficha.pvMax;
    ficha.defesa = (oc.armadura ?? 0) + (temTalento(ficha, "peleGrossa") ? 1 : 0);
    ficha.inventario = [...oc.equipamento, ...era.kit];
    ficha.dinheiro = Math.round((ficha.pericias.credito ?? 0) * era.multDinheiro);
    ficha.extras.sanInicial = ficha.recursos.san.atual;
    ficha.extras.sanInicioDia = ficha.recursos.san.atual;
    ficha.extras.marcas = [];
    if (notas.length) ficha.extras.notasCriacao = notas;
    return ficha;
  },

  resolverTeste(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
    const { alvo, exigido, liquido, notas } = prepararTeste(ficha, pedido);
    const modificador = pedido.modificador ?? 0;
    const valor = Math.max(0, alvo.valor + modificador);
    const rolagem = rolarD100(liquido);
    const r = rolagem.escolhido;
    const nivel = nivelAlcancado(r, valor);
    const limiar = limiarDe(valor, exigido);

    let grau: GrauSucesso;
    let rotuloGrau: string;
    if (nivel === 4) {
      grau = "sucesso_critico";
      rotuloGrau = "Sucesso Crítico!";
    } else if (nivel === -1) {
      grau = "falha_critica";
      rotuloGrau = "Desastre!";
    } else if (nivel >= exigido) {
      grau = nivel === 3 ? "sucesso_critico" : "sucesso";
      rotuloGrau = nivel === 3 ? "Sucesso Extremo" : nivel === 2 ? "Sucesso Difícil" : "Sucesso";
    } else {
      grau = "falha";
      rotuloGrau = nivel > 0 ? `Falha (tirou ${NOMES_NIVEL[nivel]}, exigia ${NOMES_NIVEL[exigido]})` : "Falha";
    }
    const sucesso = grau === "sucesso" || grau === "sucesso_critico";

    const dezena = (t: number) => (t === 0 ? "00" : String(t));
    const detalhes = [`${alvo.rotulo} ${valor}% (Difícil ${Math.floor(valor / 2)} · Extremo ${Math.floor(valor / 5)})`];
    if (modificador) detalhes.push(`modificador ${sinal(modificador)}% sobre ${alvo.valor}`);
    if (exigido > 1) detalhes.push(`exige ${NOMES_NIVEL[exigido]}`);
    if (liquido !== 0) {
      const tipo = liquido > 0 ? `${Math.abs(liquido)} dado(s) bônus` : `${Math.abs(liquido)} dado(s) de penalidade`;
      detalhes.push(`${tipo}: dezenas ${rolagem.dezenas.map(dezena).join(" e ")}, unidade ${rolagem.unidade} → ${r}`);
    }
    if (alvo.nota) detalhes.push(alvo.nota);
    if (alvo.tipo === "sanidade") detalhes.push(sucesso ? "aplique a perda menor" : "aplique a perda maior");
    if (grau === "falha" && alvo.tipo !== "sanidade" && alvo.tipo !== "sorte") {
      const falta = r - limiar;
      const sorte = ficha.recursos.sorte?.atual ?? 0;
      // perícia em 0% (anacrônica, Mitos zerado) não se salva com Sorte
      if (valor > 0 && falta > 0 && falta <= sorte) detalhes.push(`gastar ${falta} de Sorte vira sucesso (Sorte ${sorte})`);
      detalhes.push("pode ser forçado com justificativa (falhar de novo traz consequência pesada)");
    }
    detalhes.push(...notas);

    return {
      tipo: "teste",
      sistema: ID,
      personagem: ficha.nome,
      motivo: pedido.motivo,
      teste: alvo.rotulo,
      expressao: "1d100",
      dados: rolagem.opcoes,
      natural: r,
      // o modificador mexe no valor-alvo, não no dado: total continua sendo o d100
      bonus: 0,
      total: r,
      alvo: limiar,
      grau,
      sucesso,
      rotuloGrau,
      detalhes: detalhes.join(" · "),
      margem: limiar - r,
    };
  },

  descreverParaMestre(original) {
    const ficha = clonar(original);
    sincronizar(ficha);
    const oc = ocupacaoDe(ficha.classe);
    const era = eraDe(ficha.ancestralidade);
    const faixa = faixaDe(ficha);
    const { bd, corpo } = bonusDano(ficha);
    const r = ficha.recursos;
    const caracs = CARACTERISTICAS.map((c) => `${c.abrev} ${attr(ficha, c.id)}`).join(", ");
    const treinadas = Object.keys(ficha.pericias)
      .filter((id) => PERICIA_POR_ID.has(id))
      .sort((a, b) => valorPericia(ficha, b) - valorPericia(ficha, a))
      .map((id) => `${PERICIA_POR_ID.get(id)!.nome} ${valorPericia(ficha, id)}%`);
    if (valorPericia(ficha, "mitos") > 0) treinadas.push(`Mitos ${valorPericia(ficha, "mitos")}%`);
    const basicas = ["encontrar", "escutar", "esquivar", "furtividade", "lutar", "primeirosSocorros", "biblioteca", "psicologia"]
      .filter((id) => ficha.pericias[id] === undefined)
      .map((id) => `${PERICIA_POR_ID.get(id)!.nome} ${valorPericia(ficha, id)}%`);
    const armas = [
      oc.arma ? `${oc.arma.nome} — ${PERICIA_POR_ID.get(oc.arma.pericia)?.nome} ${valorPericia(ficha, oc.arma.pericia)}%, dano ${oc.arma.dano}` : "",
      `soco — Lutar (Briga) ${valorPericia(ficha, "lutar")}%, dano 1d3+BD`,
    ].filter(Boolean);
    const lacos = [
      ["Ideologia", extraTexto(ficha, "ideologia")],
      ["Pessoa importante", extraTexto(ficha, "pessoaImportante")],
      ["Lugar", extraTexto(ficha, "localSignificativo")],
      ["Objeto precioso", extraTexto(ficha, "objetoPrecioso")],
    ]
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    const fobia = FOBIAS.find((f) => f.id === extraTexto(ficha, "fobia") && f.id !== "nenhuma");
    const talentos = ehPulp(ficha) ? extraLista(ficha, "talentos").map((id) => TALENTOS_PULP.find((t) => t.id === id)?.nome ?? id) : [];
    const especialidades = extraLista(ficha, "especialidades");
    return `${ficha.nome} — ${oc.nome}, ${era.nome} · ${faixa.nome} · tom ${ehPulp(ficha) ? "Pulp" : "Clássico"} · fase ${ficha.nivel}
PV ${ficha.pv}/${ficha.pvMax} (ferimento grave se perder ${limiteFerimentoGrave(ficha)}+ de uma vez) · Armadura ${ficha.defesa} · MOV ${movimento(ficha)} · BD ${bd} · Corpo ${corpo}
SAN ${r.san?.atual}/${r.san?.max} (insanidade temporária com 5+ numa rolagem; indefinida se perder ${limiteInsanidadeIndefinida(ficha)}+ hoje) · Sorte ${r.sorte?.atual} · PM ${r.pm?.atual}/${r.pm?.max} · Mitos ${valorPericia(ficha, "mitos")}
Características: ${caracs}
Perícias: ${treinadas.join(", ") || "nenhuma"}
Básicas: ${basicas.join(", ") || "—"}
Ataques: ${armas.join("; ")}${especialidades.length ? `\nEspecialidades: ${especialidades.join(", ")}` : ""}${talentos.length ? `\nTalentos pulp: ${talentos.join(", ")}` : ""}${fobia ? `\nFobia: ${fobia.nome}` : ""}${lacos ? `\nLaços: ${lacos}` : ""}
Inventário: ${ficha.inventario.join(", ") || "nada"} · ${ficha.dinheiro} em dinheiro
Condições: ${ficha.condicoes.join(", ") || "nenhuma"}${ficha.historia ? `\nHistória: ${ficha.historia}` : ""}`;
  },

  blocosFicha(original): BlocoFicha[] {
    const ficha = clonar(original);
    sincronizar(ficha);
    const era = eraDe(ficha.ancestralidade);
    const faixa = faixaDe(ficha);
    const { bd, corpo } = bonusDano(ficha);
    const r = ficha.recursos;
    const barras: Extract<BlocoFicha, { tipo: "barras" }>["itens"] = [
      { rotulo: "PV", atual: ficha.pv, max: ficha.pvMax, cor: "vida" },
      { rotulo: "Sanidade", atual: r.san.atual, max: r.san.max, cor: "sanidade" },
      { rotulo: "Sorte", atual: r.sorte.atual, max: r.sorte.max, cor: "outro" },
      { rotulo: "Pontos de Magia", atual: r.pm.atual, max: r.pm.max, cor: "magia" },
    ];
    if (r.mitos.atual > 0) barras.push({ rotulo: "Mitos", atual: r.mitos.atual, max: 99, cor: "outro" });
    // recursos extras que o mestre tenha criado aparecem também
    for (const [id, rec] of Object.entries(r)) {
      if (!["san", "sorte", "pm", "mitos"].includes(id)) barras.push({ rotulo: rec.rotulo, atual: rec.atual, max: rec.max, cor: "outro" });
    }

    const treinadas = Object.keys(ficha.pericias)
      .filter((id) => PERICIA_POR_ID.has(id))
      .sort((a, b) => valorPericia(ficha, b) - valorPericia(ficha, a))
      .map((id) => `${PERICIA_POR_ID.get(id)!.nome} ${valorPericia(ficha, id)}%`);
    if (r.mitos.atual > 0) treinadas.push(`Mitos ${r.mitos.atual}%`);
    const basicas = ["encontrar", "escutar", "esquivar", "furtividade", "lutar", "biblioteca", "psicologia", "primeirosSocorros", "labia", "persuasao"]
      .filter((id) => ficha.pericias[id] === undefined)
      .map((id) => `${PERICIA_POR_ID.get(id)!.nome} ${valorPericia(ficha, id)}%`);

    const blocos: BlocoFicha[] = [
      { tipo: "barras", itens: barras },
      {
        tipo: "grade",
        itens: [
          { rotulo: "Armadura", valor: String(ficha.defesa) },
          { rotulo: "MOV", valor: String(movimento(ficha)) },
          { rotulo: "Bônus de dano", valor: bd, detalhe: `Corpo ${sinal(corpo)}` },
          { rotulo: "Esquivar", valor: `${valorPericia(ficha, "esquivar")}%` },
          { rotulo: "Crédito", valor: `${valorPericia(ficha, "credito")}%` },
          { rotulo: "Dinheiro", valor: String(ficha.dinheiro) },
        ],
      },
      {
        tipo: "grade",
        titulo: "Características",
        itens: CARACTERISTICAS.map((c) => {
          const v = attr(ficha, c.id);
          return { rotulo: c.abrev, valor: String(v), detalhe: `${Math.floor(v / 2)} / ${Math.floor(v / 5)}` };
        }),
      },
      { tipo: "etiquetas", titulo: "Perícias", itens: treinadas },
      { tipo: "etiquetas", titulo: "Outras perícias (base)", itens: basicas },
      { tipo: "lista", titulo: "Inventário", itens: ficha.inventario },
    ];
    if (ficha.condicoes.length) blocos.splice(1, 0, { tipo: "etiquetas", titulo: "Condições", itens: ficha.condicoes });

    const perfil = [`${faixa.nome}`, `tom ${ehPulp(ficha) ? "Pulp" : "Clássico"}`];
    const fobia = FOBIAS.find((f) => f.id === extraTexto(ficha, "fobia") && f.id !== "nenhuma");
    if (fobia) perfil.push(`Fobia: ${fobia.nome}`);
    for (const e of extraLista(ficha, "especialidades")) perfil.push(e);
    if (ehPulp(ficha)) for (const t of extraLista(ficha, "talentos")) perfil.push(TALENTOS_PULP.find((x) => x.id === t)?.nome ?? t);
    blocos.push({ tipo: "etiquetas", titulo: "Perfil", itens: perfil });

    const lacos = [
      ["Ideologia", extraTexto(ficha, "ideologia")],
      ["Pessoa importante", extraTexto(ficha, "pessoaImportante")],
      ["Lugar significativo", extraTexto(ficha, "localSignificativo")],
      ["Objeto precioso", extraTexto(ficha, "objetoPrecioso")],
    ]
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`);
    if (lacos.length) blocos.push({ tipo: "lista", titulo: "Laços", itens: lacos });
    blocos.push({ tipo: "etiquetas", titulo: era.nome, itens: era.tracos });
    return blocos;
  },

  xpParaNivel() {
    // sem XP: a evolução vem das fases de desenvolvimento que o mestre concede
    return null;
  },

  subirNivel(original) {
    const ficha = clonar(original);
    sincronizar(ficha);
    ficha.nivel = limitar(ficha.nivel + 1, 1, NIVEL_MAX);

    // perícias marcadas pelo uso; sem marcas, até 5 perícias treinadas sorteadas
    const marcas = extraLista(ficha, "marcas").filter((id) => PERICIA_POR_ID.has(id) && !SEM_PONTOS.has(id));
    let candidatos = marcas.length ? [...new Set(marcas)] : embaralhar(Object.keys(ficha.pericias).filter((id) => PERICIA_POR_ID.has(id) && !SEM_PONTOS.has(id))).slice(0, 5);
    if (!candidatos.length) candidatos = periciasDaOcupacao(ficha, ocupacaoDe(ficha.classe)).slice(0, 5);

    const melhorias: string[] = [];
    let sanGanha = 0;
    for (const id of candidatos) {
      const antes = valorPericia(ficha, id);
      const r = d(100);
      if (r > antes || r > 95) {
        const depois = Math.min(99, antes + d(10));
        ficha.pericias[id] = depois;
        melhorias.push(`${PERICIA_POR_ID.get(id)!.nome} ${antes}→${depois}`);
        // dominar uma perícia (90+) devolve confiança
        if (antes < 90 && depois >= 90) sanGanha += somar(2, 6).total;
      }
    }

    sanGanha += d(6);
    const san = ficha.recursos.san;
    const sanAntes = san.atual;
    san.atual = Math.min(san.max, san.atual + sanGanha);

    const sorte = ficha.recursos.sorte;
    let textoSorte = "";
    if (d(100) > sorte.atual) {
      const ganho = d(10);
      sorte.atual = Math.min(99, sorte.atual + ganho);
      textoSorte = ` Sorte +${ganho} (agora ${sorte.atual}).`;
    }

    ficha.extras.marcas = [];
    ficha.extras.sanInicioDia = san.atual;
    return {
      ficha,
      resumo: `${ficha.nome} passou pela fase de desenvolvimento ${ficha.nivel}: ${melhorias.length ? melhorias.join(", ") : "nenhuma perícia melhorou"}. SAN +${san.atual - sanAntes} (agora ${san.atual}/${san.max}).${textoSorte}`,
    };
  },

  descansar(original, tipo) {
    const ficha = clonar(original);
    sincronizar(ficha);
    ficha.pvMax = pvMaximo(ficha);
    ficha.pv = Math.min(ficha.pv, ficha.pvMax);
    const pm = ficha.recursos.pm;

    if (tipo === "curto") {
      // PM voltam 1 por hora; uma pausa vale umas duas horas
      const antes = pm.atual;
      pm.atual = Math.min(pm.max, pm.atual + 2);
      return {
        ficha,
        resumo: `${ficha.nome} recuperou o fôlego: PM +${pm.atual - antes} (${pm.atual}/${pm.max}). PV só voltam com Primeiros Socorros (+1), Medicina (+1d3) ou um dia de repouso.`,
      };
    }

    pm.atual = pm.max;
    const partes: string[] = ["PM cheios"];
    if (temCondicao(ficha, "morrendo")) {
      partes.push("ninguém descansa morrendo: precisa de socorro antes");
    } else if (temCondicao(ficha, "ferimento grave")) {
      const r = d(100);
      const con = attr(ficha, "con");
      if (r <= con) {
        const cura = somar(1, 3).total;
        ficha.pv = Math.min(ficha.pvMax, ficha.pv + cura);
        partes.push(`teste de CON ${r}/${con}: +${cura} PV`);
        if (r <= Math.floor(con / 5) || ficha.pv >= limiteFerimentoGrave(ficha)) {
          ficha.condicoes = ficha.condicoes.filter((c) => !normalizar(c).includes("ferimento grave"));
          partes.push("o ferimento grave fechou");
        }
      } else {
        partes.push(`teste de CON ${r}/${con} falhou: o ferimento grave não melhorou`);
      }
    } else {
      const cura = ehPulp(ficha) ? 2 : 1;
      const antes = ficha.pv;
      ficha.pv = Math.min(ficha.pvMax, ficha.pv + cura);
      partes.push(`+${ficha.pv - antes} PV`);
    }
    ficha.condicoes = ficha.condicoes.filter((c) => !/inconsciente|insanidade temporaria|surto|exaust/.test(normalizar(c)));
    ficha.extras.sanInicioDia = ficha.recursos.san.atual;
    return { ficha, resumo: `${ficha.nome} dormiu (mal, mas dormiu): ${partes.join(", ")}. PV ${ficha.pv}/${ficha.pvMax}. A Sanidade não volta com sono.` };
  },

  // a ferramenta teste chama depois de cada rolagem: perícia que deu certo fica marcada para a fase de desenvolvimento
  aposTeste: (ficha, resultado) => marcarPericiaUsada(ficha, resultado),
};

/**
 * Marca a perícia de um teste bem-sucedido para a próxima fase de desenvolvimento.
 * Ligada em d100.aposTeste: a ferramenta teste do mestre chama e salva a ficha devolvida.
 */
export function marcarPericiaUsada(original: Ficha, resultado: ResultadoTeste): Ficha | null {
  if (!resultado.sucesso || original.sistema !== ID) return null;
  const nome = resultado.teste.replace(/^Ataque — /, "");
  const p = PERICIAS_D100.find((x) => x.nome === nome);
  if (!p || SEM_PONTOS.has(p.id)) return null;
  const marcas = extraLista(original, "marcas");
  if (marcas.includes(p.id)) return null;
  const ficha = clonar(original);
  ficha.extras.marcas = [...marcas, p.id];
  return ficha;
}
