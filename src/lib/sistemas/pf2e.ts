import "server-only";
import { somar } from "../dados";
import { acharPorNome, clonar, fichaBase, limitar, normalizar, sinal, testeD20 } from "./comum";
import { ANCESTRALIDADES, HERANCAS, type AncestralidadePf2 } from "./pf2e/ancestralidades";
import { CLASSES, type ArmaPf2, type ArmaduraPf2, type ClassePf2, type Tradicao } from "./pf2e/classes";
import { ANTECEDENTES, OPCOES_CRIACAO, TRADICAO_POR_SUBCLASSE, type AntecedentePf2 } from "./pf2e/opcoes";
import { ATRIBUTOS, PERICIAS, nomePericia } from "./pf2e/pericias";
import { REGRAS_PF2E } from "./pf2e/regras";
import type { BlocoFicha, Ficha, PedidoTeste, Recurso, ResultadoTeste, Sistema } from "./tipos";

// Pathfinder 2ª edição Remaster (ORC License). Atributos são modificadores (+0 de partida),
// proficiência = 2×grau + nível, quatro graus de sucesso e economia de três ações.
// Os dados ficam em src/lib/sistemas/pf2e/; aqui só a lógica.

const GRAUS = ["Destreinado", "Treinado", "Especialista", "Mestre", "Lendário"];
const LETRA_GRAU = ["D", "T", "E", "M", "L"];
const LETRAS: Record<string, number> = { T: 1, E: 2, M: 3, L: 4 };

/** Grau de proficiência numa progressão "1T 7E 15M" ao chegar no nível. */
function grauEm(prog: string, nivel: number): number {
  let grau = 0;
  for (const m of prog.matchAll(/(\d+)([TEML])/g)) if (Number(m[1]) <= nivel) grau = Math.max(grau, LETRAS[m[2]]);
  return grau;
}

function proficiencia(grau: number, nivel: number): number {
  return grau > 0 ? 2 * grau + nivel : 0;
}

function mod(ficha: Ficha, atributo: string): number {
  return ficha.atributos[atributo] ?? 0;
}

function classeDe(ficha: Ficha): ClassePf2 {
  return CLASSES.find((c) => c.id === ficha.classe) ?? CLASSES[0];
}

function ancestralidadeDe(ficha: Ficha): AncestralidadePf2 {
  return ANCESTRALIDADES.find((a) => a.id === ficha.ancestralidade) ?? ANCESTRALIDADES[0];
}

function antecedenteDe(id: string | undefined): AntecedentePf2 | undefined {
  return id ? ANTECEDENTES.find((b) => b.id === id) : undefined;
}

function texto(v: unknown): string {
  return typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : "";
}

function listaTexto(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : typeof v === "string" && v ? [v] : [];
}

// A malandragem do ladino troca o atributo-chave quando o jogador não escolheu um explicitamente.
const CHAVE_POR_MALANDRAGEM: Record<string, string> = { rufiao: "for", trapaceiro: "car", "mente-brilhante": "int" };

function chaveDe(classe: ClassePf2, extras: Record<string, unknown>): string {
  const escolhida = texto(extras.chave);
  if (classe.chaves.includes(escolhida)) return escolhida;
  if (classe.id === "ladino") return CHAVE_POR_MALANDRAGEM[texto(extras.malandragem)] ?? "des";
  return classe.chaves[0];
}

function ordemDe(classe: ClassePf2, chave: string): string[] {
  return [chave, ...classe.ordem.filter((a) => a !== chave)];
}

function tradicaoDe(ficha: Ficha): Tradicao | null {
  const classe = classeDe(ficha);
  if (!classe.magia) return null;
  if (classe.magia.tradicao) return classe.magia.tradicao;
  const sub = texto(ficha.extras.linhagem) || texto(ficha.extras.patrono) || texto(ficha.extras.eidolon);
  return TRADICAO_POR_SUBCLASSE[sub] ?? "arcana";
}

/** Atributo de conjuração: magus usa INT, campeão CAR, monge SAB; o resto usa o atributo-chave. */
function atributoMagia(ficha: Ficha): string {
  const classe = classeDe(ficha);
  if (classe.id === "magus") return "int";
  if (classe.id === "campeao") return "car";
  if (classe.id === "monge") return "sab";
  return chaveDaFicha(ficha);
}

function chaveDaFicha(ficha: Ficha): string {
  return chaveDe(classeDe(ficha), ficha.extras);
}

/** Arma da classe ajustada ao atributo-chave (guerreiro de DES troca a espada longa por rapieira, etc.). */
function armaDe(ficha: Ficha): ArmaPf2 {
  const classe = classeDe(ficha);
  const chave = chaveDaFicha(ficha);
  if (chave === "des" && classe.arma.atributo === "for" && classe.id !== "monge") return { nome: "rapieira", dano: "1d6", atributo: "des" };
  if (chave === "des" && classe.id === "monge") return { ...classe.arma, atributo: "des" };
  if (chave === "for" && classe.arma.atributo === "des" && classe.id === "patrulheiro") return { nome: "machado de batalha", dano: "1d8", atributo: "for" };
  return classe.arma;
}

function armaduraDe(ficha: Ficha): ArmaduraPf2 {
  const classe = classeDe(ficha);
  // sacerdote de guerra treina armadura média
  if (classe.id === "clerigo" && texto(ficha.extras.doutrina) === "guerra") return { nome: "brunea", item: 3, limite: 2, categoria: "media" };
  return classe.armadura;
}

function calcularCA(ficha: Ficha): number {
  const armadura = armaduraDe(ficha);
  const grau = grauEm(classeDe(ficha).prog.defesa, ficha.nivel);
  return 10 + Math.min(mod(ficha, "des"), armadura.limite) + armadura.item + proficiencia(grau, ficha.nivel);
}

function pvDeHeranca(ficha: Ficha): number {
  return HERANCAS.find((h) => h.id === texto(ficha.extras.heranca))?.pv ?? 0;
}

function calcularPvMax(ficha: Ficha): number {
  const classe = classeDe(ficha);
  const porNivel = Math.max(1, classe.pvBase + mod(ficha, "con"));
  return ancestralidadeDe(ficha).pv + pvDeHeranca(ficha) + porNivel * ficha.nivel;
}

/** Espaços de magia por círculo no nível. */
function espacosDeMagia(classe: ClassePf2, nivel: number): Record<number, number> {
  const magia = classe.magia;
  if (!magia || magia.tipo === "foco") return {};
  const espacos: Record<number, number> = {};
  if (magia.tipo === "onda") {
    // magus e invocador: só os dois círculos mais altos
    if (nivel === 1) return { 1: 1 };
    if (nivel === 2) return { 1: 2 };
    const topo = Math.min(9, Math.ceil(nivel / 2));
    espacos[topo] = 2;
    espacos[topo - 1] = 2;
    return espacos;
  }
  const [novo, cheio] = magia.espacos ?? [2, 3];
  const maior = Math.min(9, Math.ceil(nivel / 2));
  for (let c = 1; c <= maior; c++) espacos[c] = c === maior && nivel % 2 === 1 && nivel < 18 ? novo : cheio;
  if (nivel >= 19) espacos[10] = 1;
  return espacos;
}

function focoMax(classe: ClassePf2, nivel: number): number {
  if (!classe.foco) return 0;
  // assume os talentos que dão magias de foco extras no caminho (o padrão de quase toda mesa)
  return Math.min(3, classe.foco + (nivel >= 6 ? 1 : 0) + (nivel >= 12 ? 1 : 0));
}

/** Recursos com máximos recalculados; preserva o que foi gasto. */
function recalcularRecursos(ficha: Ficha): Record<string, Recurso> {
  const classe = classeDe(ficha);
  const antigos = ficha.recursos ?? {};
  const novos: Record<string, Recurso> = {};
  const por = (id: string, rotulo: string, max: number, inicial = max) => {
    if (max <= 0) return;
    const velho = antigos[id];
    const atual = velho ? limitar(velho.atual + Math.max(0, max - velho.max), 0, max) : inicial;
    novos[id] = { rotulo, atual, max };
  };
  por("heroi", "Pontos de Herói", 3, 1);
  por("foco", "Pontos de foco", focoMax(classe, ficha.nivel));
  for (const [circulo, qtd] of Object.entries(espacosDeMagia(classe, ficha.nivel))) por(`m${circulo}`, `Magias de ${circulo}º círculo`, qtd);
  if (classe.id === "clerigo") por("fonte", "Fonte divina", ficha.nivel >= 15 ? 6 : ficha.nivel >= 5 ? 5 : 4);
  if (classe.id === "alquimista") por("reagentes", "Reagentes infundidos", Math.max(1, ficha.nivel + mod(ficha, "int")));
  return novos;
}

// ---------- Condições ----------

type Penalidade = { valor: number; detalhe: string };

const CONDICOES_STATUS: { re: RegExp; nome: string; afeta: (alvo: string) => boolean }[] = [
  { re: /^(amedrontad|assustad|frightened)/, nome: "amedrontado", afeta: () => true },
  { re: /^(enjoad|nausead|sickened)/, nome: "enjoado", afeta: () => true },
  { re: /^(desajeitad|clumsy)/, nome: "desajeitado", afeta: (a) => a === "des" },
  { re: /^(enfraquecid|debilitad|enfeebled)/, nome: "enfraquecido", afeta: (a) => a === "for" },
  { re: /^(drenad|drained)/, nome: "drenado", afeta: (a) => a === "con" },
  { re: /^(estupefat|stupefied)/, nome: "estupefato", afeta: (a) => a === "int" || a === "sab" || a === "car" },
];

/** Penalidades de condição: as de status não se somam (vale a pior); "caído" dá −2 circunstancial em ataques. */
function penalidadeCondicoes(ficha: Ficha, atributo: string | null, tipo: Calculo["tipo"]): Penalidade {
  if (tipo === "simples") return { valor: 0, detalhe: "" };
  let status = 0;
  let origem = "";
  let circunstancia = 0;
  for (const bruto of ficha.condicoes) {
    const c = normalizar(bruto);
    const valor = Number(c.match(/(\d+)/)?.[1] ?? 1);
    for (const cond of CONDICOES_STATUS) {
      if (cond.re.test(c) && cond.afeta(atributo ?? "") && valor > status) {
        status = valor;
        origem = `${cond.nome} ${valor}`;
      }
    }
    if (/^fatigad/.test(c) && tipo === "salvamento" && 1 > status) {
      status = 1;
      origem = "fatigado";
    }
    if (/^(caid|prone)/.test(c) && tipo === "ataque") circunstancia = 2;
  }
  const partes = [status ? `${origem}: −${status}` : "", circunstancia ? `caído: −${circunstancia}` : ""].filter(Boolean);
  return { valor: -(status + circunstancia), detalhe: partes.join(", ") };
}

// ---------- Interpretação dos testes ----------

type Calculo = {
  rotulo: string;
  bonus: number;
  atributo: string | null;
  tipo: "pericia" | "salvamento" | "ataque" | "percepcao" | "atributo" | "simples";
  detalhes: string[];
  alvoPadrao?: number;
};

function bonusPericia(ficha: Ficha, id: string): { bonus: number; atributo: string; grau: number } {
  const pericia = PERICIAS.find((p) => p.id === id)!;
  const grau = ficha.pericias[id] ?? 0;
  // cirurgião usa INT em Medicina
  const atributo = id === "medicina" && texto(ficha.extras.campo) === "cirurgiao" ? "int" : pericia.atributo;
  return { bonus: mod(ficha, atributo) + proficiencia(grau, ficha.nivel), atributo, grau };
}

function calcPericia(ficha: Ficha, id: string, prefixo = ""): Calculo {
  const { bonus, atributo, grau } = bonusPericia(ficha, id);
  return { rotulo: `${prefixo}${nomePericia(id)}`, bonus, atributo, tipo: "pericia", detalhes: grau ? [] : ["destreinado"] };
}

function bonusPercepcao(ficha: Ficha): number {
  return mod(ficha, "sab") + proficiencia(grauEm(classeDe(ficha).prog.percepcao, ficha.nivel), ficha.nivel);
}

const SALVAMENTOS = [
  { id: "fort", nome: "Fortitude", atributo: "con", re: /fortitud|^fort\b|resist\w* (de )?fort/ },
  { id: "ref", nome: "Reflexos", atributo: "des", re: /reflex/ },
  { id: "von", nome: "Vontade", atributo: "sab", re: /vontade|^will\b/ },
] as const;

function bonusSalvamento(ficha: Ficha, id: "fort" | "ref" | "von"): number {
  const s = SALVAMENTOS.find((x) => x.id === id)!;
  return mod(ficha, s.atributo) + proficiencia(grauEm(classeDe(ficha).prog[id], ficha.nivel), ficha.nivel);
}

function bonusAtaque(ficha: Ficha): number {
  const arma = armaDe(ficha);
  return mod(ficha, arma.atributo) + proficiencia(grauEm(classeDe(ficha).prog.ataque, ficha.nivel), ficha.nivel);
}

function bonusMagia(ficha: Ficha): number | null {
  const classe = classeDe(ficha);
  if (!classe.magia) return null;
  return mod(ficha, atributoMagia(ficha)) + proficiencia(grauEm(classe.magia.prog, ficha.nivel), ficha.nivel);
}

function cdClasse(ficha: Ficha): number {
  const classe = classeDe(ficha);
  return 10 + mod(ficha, chaveDaFicha(ficha)) + proficiencia(grauEm(classe.prog.cd, ficha.nivel), ficha.nivel);
}

function saberesDe(ficha: Ficha): string[] {
  return listaTexto(ficha.extras.saberes);
}

/** 2º/3º ataque do turno, pelo texto do pedido. */
function numeroAtaque(n: string): number {
  if (/terceir|ultimo|(^|\D)3(o|a|º)?(\D|$)/.test(n)) return 3;
  if (/segund|(^|\D)2(o|a|º)?(\D|$)/.test(n)) return 2;
  return 1;
}

function penalidadeMultipla(numero: number, agil: boolean): number {
  if (numero <= 1) return 0;
  return numero === 2 ? (agil ? -4 : -5) : agil ? -8 : -10;
}

function contem(n: string, termo: string): boolean {
  return n === termo || new RegExp(`(^|[^a-z])${termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(n);
}

function acharPericia(n: string, exato: boolean) {
  return PERICIAS.find((p) => {
    const nomes = [p.id, normalizar(p.nome), ...p.aliases];
    return exato ? nomes.includes(n) : nomes.some((x) => contem(n, x));
  });
}

const MANOBRAS = /agarr|empurr|derrub|reposicion|desarm(?!.*armadilh)|grapple|shove|trip/;
const CONHECIMENTO = ["arcanismo", "natureza", "ocultismo", "religiao", "sociedade"];

const NAO_RECONHECIDO = "teste não reconhecido: d20 sem bônus";

function calcular(ficha: Ficha, teste: string, profundidade = 0): Calculo {
  const n = normalizar(teste).replace(/explorar vulnerabilidade/, "saber esoterico");
  const classe = classeDe(ficha);

  if (/recupera/.test(n)) {
    const moribundo = Number(ficha.condicoes.map(normalizar).find((c) => c.startsWith("moribund"))?.match(/(\d+)/)?.[1] ?? 1);
    return { rotulo: "Recuperação", bonus: 0, atributo: null, tipo: "simples", detalhes: [`moribundo ${moribundo}`], alvoPadrao: 10 + moribundo };
  }
  if (/^(teste )?simples|^flat/.test(n)) return { rotulo: "Teste simples", bonus: 0, atributo: null, tipo: "simples", detalhes: [] };

  const exata = acharPericia(n, true);
  if (exata) return calcPericia(ficha, exata.id);

  if (/^saber|lore/.test(n)) {
    const assunto = n.replace(/^saber|lore/, "").replace(/[()]/g, "").replace(/^\s*(de|do|da|dos|das)\s+/, "").trim();
    const saber = saberesDe(ficha).find((s) => {
      const ns = normalizar(s);
      return assunto && (ns.includes(assunto) || assunto.includes(ns.replace(/^saber\s*(de|do|da|dos|das)?\s*/, "")));
    });
    const esoterico = Boolean(saber && classe.id === "taumaturgo" && /esoter/.test(normalizar(saber)));
    const grau = saber ? (esoterico ? grauEm("1T 3E 7M 15L", ficha.nivel) : 1) : 0;
    const atributo = esoterico ? "car" : "int";
    return {
      rotulo: saber ?? `Saber ${assunto ? `(${assunto})` : ""}`.trim(),
      bonus: mod(ficha, atributo) + proficiencia(grau, ficha.nivel),
      atributo,
      tipo: "pericia",
      detalhes: grau ? [] : ["destreinado"],
    };
  }

  if (/iniciativa|initiative/.test(n)) {
    const pericia = acharPericia(n.replace(/iniciativa|initiative/, "").trim(), false);
    if (pericia) return calcPericia(ficha, pericia.id, "Iniciativa · ");
    return { rotulo: "Iniciativa (Percepção)", bonus: bonusPercepcao(ficha), atributo: "sab", tipo: "percepcao", detalhes: [] };
  }

  const salvamento = SALVAMENTOS.find((s) => s.re.test(n));
  if (salvamento) {
    const grau = grauEm(classe.prog[salvamento.id], ficha.nivel);
    return { rotulo: salvamento.nome, bonus: bonusSalvamento(ficha, salvamento.id), atributo: salvamento.atributo, tipo: "salvamento", detalhes: [GRAUS[grau].toLowerCase()] };
  }

  if (/magi|feiti|conjur|truque|spell/.test(n)) {
    const numero = numeroAtaque(n);
    const bonus = bonusMagia(ficha);
    const multipla = penalidadeMultipla(numero, false);
    const detalhes = multipla ? [`${numero}º ataque: ${multipla}`] : [];
    if (bonus === null) return { rotulo: "Ataque mágico (sem conjuração)", bonus: mod(ficha, chaveDaFicha(ficha)) + multipla, atributo: chaveDaFicha(ficha), tipo: "ataque", detalhes: [...detalhes, "classe não conjura"] };
    return { rotulo: `Ataque de magia (${tradicaoDe(ficha) ?? "foco"})`, bonus: bonus + multipla, atributo: atributoMagia(ficha), tipo: "ataque", detalhes };
  }

  if (/impulso|impulse|explosao elemental/.test(n)) {
    const numero = numeroAtaque(n);
    const multipla = penalidadeMultipla(numero, false);
    const prog = classe.id === "cinetico" ? classe.prog.cd : "";
    return {
      rotulo: "Ataque de impulso",
      bonus: mod(ficha, "con") + proficiencia(grauEm(prog, ficha.nivel), ficha.nivel) + multipla,
      atributo: "con",
      tipo: "ataque",
      detalhes: multipla ? [`${numero}º ataque: ${multipla}`] : [],
    };
  }

  if (MANOBRAS.test(n)) {
    const numero = numeroAtaque(n);
    const multipla = penalidadeMultipla(numero, false);
    const base = calcPericia(ficha, "atletismo", "Manobra · ");
    return { ...base, bonus: base.bonus + multipla, tipo: "ataque", detalhes: [...base.detalhes, ...(multipla ? [`${numero}º ataque: ${multipla}`] : [])] };
  }

  if (/ataq|atac|golpe|strike/.test(n)) {
    const arma = armaDe(ficha);
    const numero = numeroAtaque(n);
    const multipla = penalidadeMultipla(numero, Boolean(arma.agil));
    const detalhes = multipla ? [`${numero}º ataque: ${multipla}${arma.agil ? " (ágil)" : ""}`] : [];
    if (/estratag/.test(n) && classe.id === "investigador") {
      const bonus = mod(ficha, "int") + proficiencia(grauEm(classe.prog.ataque, ficha.nivel), ficha.nivel);
      return { rotulo: `Ataque com estratagema (${arma.nome})`, bonus: bonus + multipla, atributo: "int", tipo: "ataque", detalhes };
    }
    return { rotulo: `Ataque (${arma.nome})`, bonus: bonusAtaque(ficha) + multipla, atributo: arma.atributo, tipo: "ataque", detalhes };
  }

  if (/escapar|escape/.test(n)) {
    const atl = calcPericia(ficha, "atletismo");
    const acr = calcPericia(ficha, "acrobatismo");
    const melhor = atl.bonus >= acr.bonus ? atl : acr;
    return { ...melhor, rotulo: `Escapar (${melhor.rotulo})` };
  }

  if (/percep|buscar|procurar|senso de motivo|notar|perceb|vigiar|observar|perception/.test(n)) {
    return { rotulo: "Percepção", bonus: bonusPercepcao(ficha), atributo: "sab", tipo: "percepcao", detalhes: [] };
  }

  if (/recordar|lembrar|conhecimento/.test(n)) {
    const melhor = CONHECIMENTO.map((id) => calcPericia(ficha, id)).sort((x, y) => y.bonus - x.bonus)[0];
    return { ...melhor, rotulo: `Recordar Conhecimento (${melhor.rotulo})` };
  }

  const pericia = acharPericia(n, false);
  if (pericia) return calcPericia(ficha, pericia.id);

  // atributo por nome ou abreviação exata ("FOR", "teste de CAR"); prefixo solto pegaria "desarmar" como DES
  const atributo = acharPorNome(ATRIBUTOS, teste) ?? ATRIBUTOS.find((a) => new RegExp(`(^|[^a-z])${a.id}([^a-z]|$)`).test(n));
  if (atributo) return { rotulo: atributo.nome, bonus: mod(ficha, atributo.id), atributo: atributo.id, tipo: "atributo", detalhes: ["teste de atributo puro"] };

  // "Ação (Perícia)": tenta o que está entre parênteses
  const dentro = teste.match(/\(([^)]+)\)/)?.[1];
  if (dentro && profundidade < 1) {
    const interno = calcular(ficha, dentro, profundidade + 1);
    if (!interno.detalhes.includes(NAO_RECONHECIDO)) return { ...interno, rotulo: `${teste.replace(/\s*\(.*$/, "")} (${interno.rotulo})` };
  }

  return { rotulo: teste, bonus: 0, atributo: null, tipo: "simples", detalhes: [NAO_RECONHECIDO] };
}

// ---------- Aumentos de atributo ----------

/** Aplica um aumento: +1 até +4; a partir de +4 vale meio ponto (dois aumentos parciais = +1). */
function aumentar(atributos: Record<string, number>, parciais: Record<string, boolean>, id: string): void {
  if ((atributos[id] ?? 0) < 4) {
    atributos[id] = (atributos[id] ?? 0) + 1;
    return;
  }
  if (parciais[id]) {
    atributos[id] += 1;
    delete parciais[id];
  } else parciais[id] = true;
}

function aplicarAncestralidadeEAntecedente(
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

function periciasDeSubclasse(classe: ClassePf2, extras: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const opcao of OPCOES_CRIACAO) {
    if (!opcao.classes?.includes(classe.id)) continue;
    for (const valor of listaTexto(extras[opcao.id])) out.push(...(PERICIAS_SUBCLASSE[`${opcao.id}:${valor}`] ?? []));
  }
  const eidolon = texto(extras.eidolon);
  if (classe.id === "invocador" && TRADICAO_POR_SUBCLASSE[eidolon]) out.push(PERICIA_TRADICAO[TRADICAO_POR_SUBCLASSE[eidolon]]);
  // guerreiro de DES prefere Acrobatismo
  if (classe.id === "guerreiro" && chaveDe(classe, extras) === "des") out.push("acrobatismo");
  return out;
}

function capPericia(nivel: number): number {
  return nivel >= 15 ? 4 : nivel >= 7 ? 3 : 2;
}

/** Escolhe a perícia que recebe um aumento: a primeira já treinada (na ordem de prioridade da classe) abaixo do teto. */
function escolherAumentoPericia(ficha: Ficha): string | null {
  const classe = classeDe(ficha);
  const prioridade = [...new Set([...classe.pericias!, ...periciasDeSubclasse(classe, ficha.extras), ...classe.sugeridas, ...PERICIAS.map((p) => p.id)])].filter((id) =>
    PERICIAS.some((p) => p.id === id),
  );
  const teto = capPericia(ficha.nivel);
  const treinada = prioridade.find((id) => (ficha.pericias[id] ?? 0) >= 1 && (ficha.pericias[id] ?? 0) < teto);
  if (treinada) return treinada;
  return prioridade.find((id) => !(ficha.pericias[id] ?? 0)) ?? null;
}

// ---------- Resumos ----------

function linhaPericias(ficha: Ficha): string[] {
  return PERICIAS.filter((p) => ficha.pericias[p.id]).map((p) => `${p.nome} ${sinal(bonusPericia(ficha, p.id).bonus)} (${LETRA_GRAU[ficha.pericias[p.id]] ?? "T"})`);
}

function danoArma(ficha: Ficha): string {
  const arma = armaDe(ficha);
  const classe = classeDe(ficha);
  const grau = grauEm(classe.prog.ataque, ficha.nivel);
  const marcial = grauEm(classe.prog.ataque, 7) >= 2;
  const nivelEspecializacao = marcial ? 7 : 13;
  let bonus = arma.distancia ? 0 : mod(ficha, "for");
  if (ficha.nivel >= nivelEspecializacao && grau >= 2) bonus += (grau === 2 ? 2 : grau === 3 ? 3 : 4) * (marcial && ficha.nivel >= 15 ? 2 : 1);
  return `${arma.dano}${bonus ? sinal(bonus) : ""}`;
}

function ataqueFurtivo(nivel: number): string {
  return `${nivel >= 17 ? 4 : nivel >= 11 ? 3 : nivel >= 5 ? 2 : 1}d6`;
}

const ESCOLHAS_ROTULO: [string, string][] = [
  ["heranca", "Herança"], ["heranca_versatil", "Herança versátil"], ["chave", "Atributo-chave"], ["divindade", "Divindade"],
  ["causa", "Causa"], ["doutrina", "Doutrina"], ["instinto", "Instinto"], ["musa", "Musa"], ["ordem", "Ordem"],
  ["metodologia", "Metodologia"], ["misterio", "Mistério"], ["vantagem", "Vantagem do caçador"], ["malandragem", "Malandragem"],
  ["linhagem", "Linhagem"], ["estilo", "Estilo"], ["patrono", "Patrono"], ["escola", "Escola"], ["tese", "Tese"], ["sintese", "Síntese"],
  ["eidolon", "Eidolon"], ["caminho", "Caminho"], ["inovacao", "Inovação"], ["mente", "Mente consciente"], ["implemento", "Implemento"],
  ["portal", "Portal"], ["campo", "Campo de pesquisa"], ["pratica", "Prática"], ["aparicoes", "Aparições"], ["icones", "Ícones"],
];

/** Escolhas de criação com nomes legíveis ("Linhagem: Dracônica (arcana)"). */
function escolhas(ficha: Ficha): string[] {
  const out: string[] = [];
  for (const [id, rotulo] of ESCOLHAS_ROTULO) {
    const valores = listaTexto(ficha.extras[id]);
    if (!valores.length) continue;
    const opcao = OPCOES_CRIACAO.find((o) => o.id === id);
    const nomes = valores.map((v) => opcao?.opcoes?.find((x) => x.id === v)?.nome ?? (id === "chave" ? v.toUpperCase() : v));
    out.push(`${rotulo}: ${nomes.join(", ")}`);
  }
  return out;
}

const BASICOS = ["mochila", "saco de dormir", "corda de 15 m", "pederneira", "rações para 2 semanas", "tochas (5)", "odre"];

export const pf2e: Sistema = {
  id: "pf2e",
  nome: "Pathfinder 2e (Remaster)",
  nomeCurto: "PF2e",
  descricao: "Graus de sucesso, três ações por turno e uma montanha de ancestralidades e classes.",
  licenca: "ORC License (Paizo) — Player Core, Player Core 2 e livros Remaster; alguns livros antigos sob OGL 1.0a",
  dadoPrincipal: "d20",
  pronto: true,
  rotulos: { ancestralidade: "Ancestralidade", classe: "Classe", antecedente: "Antecedente", nivel: "Nível", defesa: "CA", dinheiro: "po", pv: "PV" },
  atributos: ATRIBUTOS,
  pericias: PERICIAS.map((p) => ({ id: p.id, nome: p.nome, atributo: p.atributo, descricao: p.descricao })),
  classes: CLASSES.map((c) => ({
    id: c.id, nome: c.nome, descricao: c.descricao, atributoChave: c.atributoChave, pvBase: c.pvBase,
    pericias: c.pericias, equipamento: c.equipamento, papel: c.papel, fonte: c.fonte,
  })),
  ancestralidades: ANCESTRALIDADES.map((a) => ({ id: a.id, nome: a.nome, descricao: a.descricao, ajustes: a.ajustes, pv: a.pv, deslocamento: a.deslocamento, tracos: a.tracos })),
  antecedentes: ANTECEDENTES.map((b) => ({ id: b.id, nome: b.nome, descricao: b.descricao })),
  opcoesCriacao: OPCOES_CRIACAO,
  metodosAtributos: [
    {
      id: "aumentos",
      nome: "Aumentos (padrão)",
      descricao: "Os valores são modificadores começando em +0: aumento da classe no atributo-chave + 4 aumentos livres pela prioridade da classe. A ancestralidade e o antecedente são somados ao criar a ficha (máximo +4).",
    },
    {
      id: "defensivo",
      nome: "Aumentos defensivos",
      descricao: "Atributo-chave reforçado e os aumentos livres em CON, DES e SAB, para quem prefere não morrer. Ancestralidade e antecedente entram ao criar.",
    },
  ],
  limitesAtributos: { min: -1, max: 4 },
  periciasEscolhiveis: 4,
  nivelMaximo: 20,
  testesSugeridos: ["Percepção", "Atletismo", "Acrobatismo", "Furtividade", "Diplomacia", "Dissimulação", "Intimidação", "Medicina", "Fortitude", "Reflexos", "Vontade", "Ataque", "Ataque 2", "Magia", "Iniciativa", "Recordar Conhecimento", "Teste simples", "Recuperação"],
  regrasParaMestre: REGRAS_PF2E,

  atributosIniciais(classeId, metodo) {
    const classe = CLASSES.find((c) => c.id === classeId) ?? CLASSES[0];
    const chave = classe.chaves[0];
    const atributos: Record<string, number> = Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 0]));
    atributos[chave] += 1; // aumento da classe
    const livres = metodo === "defensivo" ? [chave, ...["con", "des", "sab"].filter((a) => a !== chave)].slice(0, 4) : ordemDe(classe, chave).slice(0, 4);
    for (const id of livres) atributos[id] += 1;
    return atributos;
  },

  criarFicha(entrada) {
    const classe = CLASSES.find((c) => c.id === entrada.classe) ?? CLASSES[0];
    const anc = ANCESTRALIDADES.find((a) => a.id === entrada.ancestralidade) ?? ANCESTRALIDADES.find((a) => a.id === "humano")!;
    const extras: Record<string, unknown> = { ...(entrada.extras ?? {}) };
    const chave = chaveDe(classe, extras);
    const ordem = ordemDe(classe, chave);
    const antecedente = antecedenteDe(entrada.antecedente) ?? ANTECEDENTES.find((b) => b.atributos.includes(chave)) ?? ANTECEDENTES[0];

    // herança de outra ancestralidade é descartada
    const heranca = HERANCAS.find((h) => h.id === texto(extras.heranca));
    if (heranca && heranca.ancestralidade !== anc.id) delete extras.heranca;

    const base: Record<string, number> = Object.fromEntries(
      ATRIBUTOS.map((a) => [a.id, Number.isFinite(entrada.atributos?.[a.id]) ? Number(entrada.atributos![a.id]) : 0]),
    );
    if (!entrada.atributos) Object.assign(base, pf2e.atributosIniciais(classe.id, "aumentos"));
    // se o jogador escolheu outro atributo-chave, ele herda o aumento de classe sugerido para o padrão
    const padrao = classe.chaves[0];
    if (chave !== padrao && base[chave] < base[padrao]) [base[chave], base[padrao]] = [base[padrao], base[chave]];

    const ficha = fichaBase("pf2e", entrada.nome);
    ficha.classe = classe.id;
    ficha.ancestralidade = anc.id;
    ficha.antecedente = antecedente.id;
    ficha.atributos = aplicarAncestralidadeEAntecedente(base, anc, antecedente, ordem, extras);

    // perícias: fixas da classe, do antecedente e da subclasse; repetidas viram escolhas extras
    let extrasPericia = Math.max(0, classe.maisPericias + ficha.atributos.int);
    for (const id of [...(classe.pericias ?? []), antecedente.pericia, ...periciasDeSubclasse(classe, extras)]) {
      if (!PERICIAS.some((p) => p.id === id)) continue;
      if (ficha.pericias[id]) extrasPericia++;
      else ficha.pericias[id] = 1;
    }
    const candidatas = [...(entrada.pericias ?? []), ...classe.sugeridas, ...PERICIAS.map((p) => p.id)];
    for (const id of candidatas) {
      if (extrasPericia <= 0) break;
      if (!PERICIAS.some((p) => p.id === id) || ficha.pericias[id]) continue;
      ficha.pericias[id] = 1;
      extrasPericia--;
    }

    const saberes = [antecedente.saber, classe.saber, ...listaTexto(extras.saberes).map((s) => (/^saber/i.test(s.trim()) ? s.trim() : `Saber de ${s.trim()}`))]
      .filter((s): s is string => Boolean(s))
      .slice(0, 6);

    ficha.extras = { ...extras, chave, saberes: [...new Set(saberes)], parciais: {} };
    const tradicao = tradicaoDe(ficha);
    if (tradicao) ficha.extras.tradicao = tradicao;

    ficha.pvMax = calcularPvMax(ficha);
    ficha.pv = ficha.pvMax;
    ficha.defesa = calcularCA(ficha);
    ficha.recursos = recalcularRecursos(ficha);
    ficha.inventario = [...(classe.equipamento ?? []), ...BASICOS];
    ficha.dinheiro = 15;
    ficha.historia = entrada.historia ?? "";
    return ficha;
  },

  resolverTeste(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
    const calc = calcular(ficha, pedido.teste);
    const pen = penalidadeCondicoes(ficha, calc.atributo, calc.tipo);
    const detalhes = [...calc.detalhes, pen.detalhe].filter(Boolean).join(" · ");
    const resultado = testeD20({
      sistema: "pf2e",
      ficha,
      pedido: { ...pedido, alvo: pedido.alvo ?? calc.alvoPadrao ?? null },
      rotulo: calc.rotulo,
      bonus: calc.bonus + pen.valor,
      criticos: "pf2",
      detalhes: detalhes || undefined,
    });
    // no PF2e não há vantagem/desvantagem: são efeitos de sorte e infortúnio
    if (resultado.detalhes) resultado.detalhes = resultado.detalhes.replace(/^vantagem:/, "sorte (maior de 2d20):").replace(/^desvantagem:/, "infortúnio (menor de 2d20):");
    return resultado;
  },

  descreverParaMestre(ficha) {
    const classe = classeDe(ficha);
    const anc = ancestralidadeDe(ficha);
    const antecedente = antecedenteDe(ficha.antecedente);
    const atributos = ATRIBUTOS.map((a) => `${a.abrev} ${sinal(mod(ficha, a.id))}`).join(", ");
    const salv = SALVAMENTOS.map((s) => `${s.nome} ${sinal(bonusSalvamento(ficha, s.id))}`).join(", ");
    const magia = bonusMagia(ficha);
    const tradicao = tradicaoDe(ficha);
    const recursos = Object.values(ficha.recursos).map((r) => `${r.rotulo} ${r.atual}/${r.max}`).join(", ");
    const arma = armaDe(ficha);
    const extrasClasse = classe.id === "ladino" ? ` · Ataque Furtivo +${ataqueFurtivo(ficha.nivel)}` : "";
    const linhas = [
      `${ficha.nome} — ${anc.nome} ${classe.nome} nível ${ficha.nivel} (XP ${ficha.xp})${antecedente ? `, antecedente ${antecedente.nome}` : ""}`,
      `PV ${ficha.pv}/${ficha.pvMax} · CA ${ficha.defesa} · Percepção ${sinal(bonusPercepcao(ficha))} · ${salv} · deslocamento ${anc.deslocamento} · ${ficha.dinheiro} po`,
      `Atributos: ${atributos} (chave ${chaveDaFicha(ficha).toUpperCase()})`,
      `Ataque (${arma.nome}) ${sinal(bonusAtaque(ficha))}${arma.agil ? " ágil" : ""}, dano ${danoArma(ficha)}${extrasClasse} · CD de classe ${cdClasse(ficha)}`,
      magia !== null ? `Magia ${tradicao ?? ""} (${classe.magia?.tipo}): ataque ${sinal(magia)}, CD ${10 + magia}` : "",
      `Perícias: ${linhaPericias(ficha).join(", ") || "nenhuma"}`,
      `Saberes: ${saberesDe(ficha).join(", ") || "nenhum"}`,
      escolhas(ficha).length ? `Escolhas: ${escolhas(ficha).join("; ")}` : "",
      `Recursos: ${recursos || "nenhum"}`,
      `Classe: ${classe.notas}`,
      `Inventário: ${ficha.inventario.join(", ") || "nada"}`,
      `Condições: ${ficha.condicoes.join(", ") || "nenhuma"}`,
      ficha.historia ? `História: ${ficha.historia}` : "",
    ];
    return linhas.filter(Boolean).join("\n");
  },

  blocosFicha(ficha): BlocoFicha[] {
    const classe = classeDe(ficha);
    const anc = ancestralidadeDe(ficha);
    const magia = bonusMagia(ficha);
    const desprevenido = ficha.condicoes.some((c) => /desprevenid|off-guard|flanquead/.test(normalizar(c)));
    const corDe = (id: string) => (id === "heroi" ? ("outro" as const) : ("magia" as const));
    const blocos: BlocoFicha[] = [
      {
        tipo: "barras",
        itens: [
          { rotulo: "PV", atual: ficha.pv, max: ficha.pvMax, cor: "vida" },
          ...Object.entries(ficha.recursos).map(([id, r]) => ({ rotulo: r.rotulo, atual: r.atual, max: r.max, cor: corDe(id) })),
        ],
      },
      {
        tipo: "grade",
        titulo: "Defesas",
        itens: [
          { rotulo: "CA", valor: String(ficha.defesa), detalhe: desprevenido ? `${ficha.defesa - 2} desprevenido` : armaduraDe(ficha).nome },
          ...SALVAMENTOS.map((s) => ({ rotulo: s.nome, valor: sinal(bonusSalvamento(ficha, s.id)), detalhe: GRAUS[grauEm(classe.prog[s.id], ficha.nivel)] })),
          { rotulo: "Percepção", valor: sinal(bonusPercepcao(ficha)), detalhe: GRAUS[grauEm(classe.prog.percepcao, ficha.nivel)] },
          { rotulo: "Deslocamento", valor: anc.deslocamento ?? "7,5 m" },
        ],
      },
      {
        tipo: "grade",
        titulo: "Ofensiva",
        itens: [
          { rotulo: "Ataque", valor: sinal(bonusAtaque(ficha)), detalhe: `${armaDe(ficha).nome} ${danoArma(ficha)}` },
          { rotulo: "CD de classe", valor: String(cdClasse(ficha)) },
          ...(magia !== null ? [{ rotulo: "Magia", valor: sinal(magia), detalhe: `CD ${10 + magia} · ${tradicaoDe(ficha) ?? ""}` }] : []),
          ...(classe.id === "ladino" ? [{ rotulo: "Ataque furtivo", valor: ataqueFurtivo(ficha.nivel) }] : []),
          { rotulo: "po", valor: String(ficha.dinheiro) },
        ],
      },
      {
        tipo: "grade",
        titulo: "Atributos",
        itens: ATRIBUTOS.map((a) => ({
          rotulo: a.abrev,
          valor: sinal(mod(ficha, a.id)),
          detalhe: a.id === chaveDaFicha(ficha) ? "chave" : (ficha.extras.parciais as Record<string, boolean> | undefined)?.[a.id] ? "parcial" : undefined,
        })),
      },
      { tipo: "etiquetas", titulo: "Perícias", itens: linhaPericias(ficha) },
    ];
    const saberes = saberesDe(ficha);
    if (saberes.length) blocos.push({ tipo: "etiquetas", titulo: "Saberes", itens: saberes.map((s) => `${s} ${sinal(calcular(ficha, s).bonus)}`) });
    if (ficha.condicoes.length) blocos.splice(1, 0, { tipo: "etiquetas", titulo: "Condições", itens: ficha.condicoes });
    const escolhidas = escolhas(ficha);
    if (escolhidas.length) blocos.push({ tipo: "lista", titulo: "Escolhas", itens: escolhidas });
    blocos.push({ tipo: "texto", titulo: classe.nome, texto: classe.notas });
    if (anc.tracos?.length) blocos.push({ tipo: "etiquetas", titulo: `Traços de ${anc.nome}`, itens: anc.tracos });
    blocos.push({ tipo: "lista", titulo: "Inventário", itens: ficha.inventario });
    return blocos;
  },

  xpParaNivel(nivel) {
    if (nivel < 1 || nivel > 20) return null;
    return (nivel - 1) * 1000;
  },

  subirNivel(original) {
    const ficha = clonar(original);
    if (ficha.nivel >= 20) return { ficha, resumo: `${ficha.nome} já está no nível 20. Daqui pra frente, só lenda e boatos.` };
    const classe = classeDe(ficha);
    const antes = ficha.nivel;
    ficha.nivel = antes + 1;
    const n = ficha.nivel;
    const mudancas: string[] = [];

    // aumentos de atributo nos níveis 5, 10, 15 e 20
    if (n % 5 === 0) {
      const parciais = { ...((ficha.extras.parciais as Record<string, boolean> | undefined) ?? {}) };
      const alvos = ordemDe(classe, chaveDaFicha(ficha)).slice(0, 4);
      for (const id of alvos) aumentar(ficha.atributos, parciais, id);
      ficha.extras.parciais = parciais;
      mudancas.push(`aumentos de atributo em ${alvos.map((a) => a.toUpperCase()).join(", ")}`);
    }

    // aumentos de perícia: ímpares a partir do 3º (ladino e investigador: todo nível a partir do 2º)
    if ((classe.periciaTodoNivel && n >= 2) || (n >= 3 && n % 2 === 1)) {
      const id = escolherAumentoPericia(ficha);
      if (id) {
        ficha.pericias[id] = (ficha.pericias[id] ?? 0) + 1;
        mudancas.push(`${nomePericia(id)} → ${GRAUS[ficha.pericias[id]]}`);
      }
    }

    // proficiências de classe que melhoraram neste nível
    const nomesProg: Record<string, string> = { percepcao: "Percepção", fort: "Fortitude", ref: "Reflexos", von: "Vontade", ataque: "armas", defesa: "defesa", cd: "CD de classe" };
    for (const [id, prog] of Object.entries(classe.prog)) {
      const g = grauEm(prog, n);
      if (g > grauEm(prog, antes)) mudancas.push(`${nomesProg[id]} → ${GRAUS[g]}`);
    }
    if (classe.magia && grauEm(classe.magia.prog, n) > grauEm(classe.magia.prog, antes)) mudancas.push(`magia → ${GRAUS[grauEm(classe.magia.prog, n)]}`);
    const marcial = grauEm(classe.prog.ataque, 7) >= 2;
    if (n === (marcial ? 7 : 13)) mudancas.push("especialização em armas (+dano)");
    if (marcial && n === 15) mudancas.push("especialização maior em armas");

    const pvAntes = ficha.pvMax;
    ficha.pvMax = calcularPvMax(ficha);
    const ganho = ficha.pvMax - pvAntes;
    ficha.pv = Math.min(ficha.pvMax, ficha.pv + ganho);
    ficha.defesa = calcularCA(ficha);
    const espacosAntes = Object.keys(ficha.recursos).filter((k) => /^m\d+$/.test(k)).length;
    ficha.recursos = recalcularRecursos(ficha);
    const espacosDepois = Object.keys(ficha.recursos).filter((k) => /^m\d+$/.test(k)).length;
    if (espacosDepois > espacosAntes) mudancas.push(`magias de ${Math.max(...Object.keys(espacosDeMagia(classe, n)).map(Number))}º círculo`);

    const talentos = [
      n % 2 === 0 ? "talento de classe" : "",
      n % 2 === 0 || classe.periciaTodoNivel ? "talento de perícia" : "",
      [3, 7, 11, 15, 19].includes(n) ? "talento geral" : "",
      [5, 9, 13, 17].includes(n) ? "talento ancestral" : "",
    ].filter(Boolean);
    if (classe.id === "ladino" && [5, 11, 17].includes(n)) mudancas.push(`ataque furtivo ${ataqueFurtivo(n)}`);

    const resumo = [
      `${ficha.nome} chegou ao nível ${n}: +${ganho} PV máximos (agora ${ficha.pvMax}), CA ${ficha.defesa}.`,
      mudancas.length ? `Melhorias: ${mudancas.join("; ")}.` : "",
      talentos.length ? `Escolha: ${talentos.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return { ficha, resumo };
  },

  descansar(original, tipo) {
    const ficha = clonar(original);
    if (tipo === "longo") {
      // 8 horas: CON × nível (mínimo 1 × nível), preparação diária renova magia, foco e reagentes
      const cura = Math.max(1, mod(ficha, "con")) * ficha.nivel;
      ficha.pv = Math.min(ficha.pvMax, ficha.pv + cura);
      for (const [id, r] of Object.entries(ficha.recursos)) if (id !== "heroi") r.atual = r.max;
      ficha.condicoes = ficha.condicoes
        .filter((c) => !/^fatigad/.test(normalizar(c)))
        .map((c) => {
          const m = normalizar(c).match(/^(drenad\w*|condenad\w*)\s*(\d+)?/);
          if (!m) return c;
          const valor = Number(m[2] ?? 1) - 1;
          return valor > 0 ? `${m[1]} ${valor}` : "";
        })
        .filter(Boolean);
      if (ficha.pv > 0) ficha.condicoes = ficha.condicoes.filter((c) => normalizar(c) !== "inconsciente");
      if (ficha.pv === ficha.pvMax) ficha.condicoes = ficha.condicoes.filter((c) => !/^ferid/.test(normalizar(c)));
      return { ficha, resumo: `${ficha.nome} dormiu 8 horas: +${cura} PV (${ficha.pv}/${ficha.pvMax}), magias, foco e recursos diários renovados. Pontos de Herói não voltam com descanso.` };
    }

    // 10 minutos: Reconcentrar (1 ponto de foco) e, se treinado, Tratar Ferimentos em si mesmo
    const partes: string[] = [];
    const foco = ficha.recursos.foco;
    if (foco && foco.atual < foco.max) {
      foco.atual += 1;
      partes.push("recuperou 1 ponto de foco");
    }
    const grauMedicina = ficha.pericias.medicina ?? 0;
    if (grauMedicina >= 1 && ficha.pv < ficha.pvMax) {
      const { bonus } = bonusPericia(ficha, "medicina");
      // escolhe a CD mais alta que ainda tem boa chance (mais cura extra)
      const opcoes = [
        { cd: 40, extra: 50, grau: 4 },
        { cd: 30, extra: 30, grau: 3 },
        { cd: 20, extra: 10, grau: 2 },
        { cd: 15, extra: 0, grau: 1 },
      ];
      const escolha = opcoes.find((o) => grauMedicina >= o.grau && bonus + 10 >= o.cd) ?? opcoes[3];
      const r = pf2e.resolverTeste(ficha, { teste: "Medicina", alvo: escolha.cd, motivo: "Tratar Ferimentos" });
      if (r.grau === "sucesso_critico" || r.grau === "sucesso") {
        const cura = somar(r.grau === "sucesso_critico" ? 4 : 2, 8).total + escolha.extra;
        ficha.pv = Math.min(ficha.pvMax, ficha.pv + cura);
        partes.push(`Tratar Ferimentos (Medicina ${r.total} vs CD ${escolha.cd}, ${r.rotuloGrau.toLowerCase()}) curou ${cura} PV`);
      } else if (r.grau === "falha_critica") {
        const dano = somar(1, 8).total;
        ficha.pv = Math.max(0, ficha.pv - dano);
        partes.push(`Tratar Ferimentos deu muito errado (Medicina ${r.total} vs CD ${escolha.cd}): ${dano} de dano`);
      } else partes.push(`Tratar Ferimentos falhou (Medicina ${r.total} vs CD ${escolha.cd})`);
    }
    if (ficha.pv === ficha.pvMax) ficha.condicoes = ficha.condicoes.filter((c) => !/^ferid/.test(normalizar(c)));
    return {
      ficha,
      resumo: `${ficha.nome} descansou 10 minutos${partes.length ? `: ${partes.join("; ")}` : ", mas não tinha o que recuperar sozinho (peça a um aliado treinado em Medicina para Tratar Ferimentos)"}. PV ${ficha.pv}/${ficha.pvMax}.`,
    };
  },
};
