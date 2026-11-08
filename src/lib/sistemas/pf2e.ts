import "server-only";
import { descreverRolagem, rolar, somar } from "../dados";
import { acharPorNome, clonar, fichaBase, limitar, normalizar, sinal, testeD20 } from "./comum";
import { ANCESTRALIDADES, HERANCAS, type AncestralidadePf2 } from "./pf2e/ancestralidades";
import { acharArma, armasDoInventario, type ArmaCatalogo } from "./pf2e/armas";
import { CLASSES, type ArmaPf2, type ArmaduraPf2, type ClassePf2, type Tradicao } from "./pf2e/classes";
import { CONDICOES_PF2E, condicoesNoFimDoTurno, lerCondicao, semCondicoes, temCondicao, valorDaCondicao } from "./pf2e/condicoes";
import {
  aplicarAncestralidadeEAntecedente,
  atributosIniciaisPf2,
  chaveDe,
  listaTexto,
  ordemDe,
  ordemDeCompletar,
  periciasCriacaoPf2,
  periciasDeSubclasse,
  texto,
} from "./pf2e/criacao";
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

/**
 * Caiu a 0 PV → inconsciente e moribundo 1 (+ ferido); voltou a ter PV → sai do moribundo e ganha (ou sobe) ferido. Continua
 * inconsciente até acordar (o mestre tira, ou o descanso). Muta a ficha.
 */
function condicoesMoribundo(ficha: Ficha, pvAntes: number) {
  const ferido = valorDaCondicao(ficha.condicoes, "ferido");
  const moribundo = valorDaCondicao(ficha.condicoes, "moribundo");
  if (ficha.pv === 0 && pvAntes > 0 && !moribundo) {
    const inconsciente = temCondicao(ficha.condicoes, "inconsciente") ? [] : ["inconsciente"];
    ficha.condicoes = [...ficha.condicoes, ...inconsciente, `moribundo ${Math.min(4, 1 + ferido)}`];
  } else if (ficha.pv > 0 && moribundo) {
    ficha.condicoes = [...semCondicoes(ficha.condicoes, ["moribundo", "ferido"]), `ferido ${ferido + 1}`];
  }
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

/** Condições de status com valor e quem elas afetam (pelo atributo do teste). */
const CONDICOES_STATUS: Record<string, (alvo: string) => boolean> = {
  amedrontado: () => true,
  enjoado: () => true,
  desajeitado: (a) => a === "des",
  enfraquecido: (a) => a === "for",
  drenado: (a) => a === "con",
  estupefato: (a) => a === "int" || a === "sab" || a === "car",
};

/**
 * Penalidades de condição: as de status não se somam (vale a pior); "caído" dá −2 circunstancial em ataques. Lê qualquer
 * grafia da lista fechada ("medo 2", "Amedrontado II", "assustada").
 */
function penalidadeCondicoes(ficha: Ficha, atributo: string | null, tipo: Calculo["tipo"]): Penalidade {
  if (tipo === "simples") return { valor: 0, detalhe: "" };
  let status = 0;
  let origem = "";
  let circunstancia = 0;
  for (const bruto of ficha.condicoes) {
    const lida = lerCondicao(bruto, CONDICOES_PF2E);
    if (!lida) continue;
    const id = lida.def.id;
    const valor = lida.valor ?? 1;
    const afeta = CONDICOES_STATUS[id];
    if (afeta && afeta(atributo ?? "") && valor > status) {
      status = valor;
      origem = `${lida.def.nome} ${valor}`;
    }
    if (id === "fatigado" && tipo === "salvamento" && 1 > status) {
      status = 1;
      origem = "fatigado";
    }
    if (id === "inconsciente" && (tipo === "percepcao" || (tipo === "salvamento" && atributo === "des")) && 4 > status) {
      status = 4;
      origem = "inconsciente";
    }
    if (id === "caido" && tipo === "ataque") circunstancia = 2;
  }
  const partes = [status ? `${origem}: −${status}` : "", circunstancia ? `caído: −${circunstancia}` : ""].filter(Boolean);
  return { valor: -(status + circunstancia), detalhe: partes.join(", ") };
}

/** Condições que deixam desprevenido (−2 circunstancial na CA). */
const DESPREVENIDO_POR = ["desprevenido", "caido", "agarrado", "contido", "paralisado", "inconsciente", "confuso"];

/**
 * CA (ou CD) com as condições: a pior penalidade de status que vale para defesas (amedrontado, enjoado, desajeitado; na CA,
 * fatigado −1 e inconsciente −4) mais −2 circunstancial de desprevenido (ou do que o causa). `atributoCd` limita as de atributo (CD de classe de INT não sofre
 * desajeitado).
 */
function defesaComCondicoes(defesa: number, condicoes: string[], atributoCd: string | null = "des", ehCA = true): { valor: number; detalhe: string } {
  let status = 0;
  let origem = "";
  let desprevenido = "";
  for (const bruto of condicoes) {
    const lida = lerCondicao(bruto, CONDICOES_PF2E);
    if (!lida) continue;
    const id = lida.def.id;
    const valor = id === "inconsciente" ? 4 : (lida.valor ?? 1);
    const vale =
      id === "amedrontado" ||
      id === "enjoado" ||
      (ehCA && (id === "inconsciente" || id === "fatigado")) ||
      (CONDICOES_STATUS[id]?.(atributoCd ?? "") ?? false);
    if (vale && valor > status) {
      status = valor;
      origem = id === "inconsciente" || id === "fatigado" ? lida.def.nome : `${lida.def.nome} ${valor}`;
    }
    if (ehCA && !desprevenido && DESPREVENIDO_POR.includes(id)) desprevenido = lida.def.nome;
  }
  const circ = desprevenido ? 2 : 0;
  const partes = [status ? `${origem} −${status}` : "", circ ? (desprevenido === "desprevenido" ? "desprevenido −2" : `desprevenido (${desprevenido}) −2`) : ""].filter(Boolean);
  return { valor: defesa - status - circ, detalhe: partes.join(", ") };
}

// ---------- Interpretação dos testes ----------

type Calculo = {
  rotulo: string;
  bonus: number;
  atributo: string | null;
  tipo: "pericia" | "salvamento" | "ataque" | "percepcao" | "atributo" | "simples";
  detalhes: string[];
  alvoPadrao?: number;
  /** ataque contado no turno: qual (1º, 2º, 3º...) e se a arma é ágil */
  ataque?: { numero: number; agil?: boolean };
  /** ataque com arma: o dano a rolar no acerto ("1d6+2"), o tipo e o dado mortal */
  dano?: { expressao: string; tipo?: string; mortal?: string };
};

/** O que vem de fora do texto: quantos ataques já houve no turno (rastreador) ou o número fixado no pedido do teste. */
export type OpcoesCalculo = { numeroAtaque?: number; ataquesNoTurno?: number };

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

/** Arma em uso: a do catálogo quando o nome casa (traços completos), senão a da classe como está. */
type ArmaEmUso = ArmaPf2 & Partial<Omit<ArmaCatalogo, keyof ArmaPf2>>;

function armaCompleta(arma: ArmaPf2): ArmaEmUso {
  const doCatalogo = acharArma(arma.nome);
  return doCatalogo ? { ...doCatalogo, ...arma, atributo: arma.atributo } : arma;
}

/** Ataque à distância pedido sem dizer a arma ("atirar no orc", "ataque à distância"). */
const DISTANCIA_NO_TEXTO = /distancia|atir|dispar|arremess|flecha|virote/;

/**
 * A arma de um ataque: a citada no pedido ("Ataque com arco curto"), ou a de distância do inventário quando o pedido fala em
 * atirar/arremessar, ou a da classe. `arremessada` = arma corpo a corpo de arremesso usada à distância.
 */
function armaDoAtaque(ficha: Ficha, n: string): { arma: ArmaEmUso; arremessada: boolean } {
  const citada = acharArma(n);
  const daClasse = armaCompleta(armaDe(ficha));
  const querDistancia = DISTANCIA_NO_TEXTO.test(n);
  let arma: ArmaEmUso = citada ?? daClasse;
  if (!citada && querDistancia && !daClasse.distancia) {
    const doInventario = armasDoInventario(ficha.inventario);
    arma = doInventario.find((a) => a.distancia) ?? doInventario.find((a) => a.arremesso) ?? daClasse;
  }
  const arremessada = Boolean(arma.arremesso && (arma.distancia || /arremess|atir/.test(n)));
  return { arma, arremessada };
}

/** Atributo do ataque: distância e arremesso usam DES; acuidade usa o melhor entre FOR e DES. */
function atributoDoAtaque(ficha: Ficha, arma: ArmaEmUso, arremessada = false): string {
  if (arma.distancia || arremessada) return "des";
  if (arma.acuidade) return mod(ficha, "des") > mod(ficha, "for") ? "des" : "for";
  return arma.atributo;
}

function bonusAtaque(ficha: Ficha, arma: ArmaEmUso = armaCompleta(armaDe(ficha)), arremessada = false): number {
  return mod(ficha, atributoDoAtaque(ficha, arma, arremessada)) + proficiencia(grauEm(classeDe(ficha).prog.ataque, ficha.nivel), ficha.nivel);
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

/** 1º/2º/3º ataque citado no texto do pedido ("Ataque 2", "segundo golpe"); null quando o texto não diz. */
function numeroNoTexto(n: string): number | null {
  // o número solto ("Ataque 2", "2º ataque"), sem pegar "+2", "2d6" ou "1,5 m"
  const solto = (d: number) => new RegExp(`(^|[^\\d+\\-,.])${d}(o|a|º|ª)?(?=\\s|\\)|$)`).test(n);
  if (/terceir|ultimo/.test(n) || solto(3)) return 3;
  if (/segund/.test(n) || solto(2)) return 2;
  if (/primeir/.test(n) || solto(1)) return 1;
  return null;
}

/**
 * Qual ataque do turno é este: o número fixado no pedido (pedir_teste guarda), senão o citado no texto ("Ataque 1" zera a
 * conta), senão o rastreador do combate (ataques já feitos + 1), senão o 1º.
 */
function numeroAtaque(n: string, opcoes: OpcoesCalculo = {}): number {
  if (opcoes.numeroAtaque && opcoes.numeroAtaque > 0) return Math.min(3, Math.floor(opcoes.numeroAtaque));
  const doTexto = numeroNoTexto(n);
  if (doTexto) return doTexto;
  if (opcoes.ataquesNoTurno && opcoes.ataquesNoTurno > 0) return Math.min(3, opcoes.ataquesNoTurno + 1);
  return 1;
}

function textoMultipla(numero: number, multipla: number, agil?: boolean): string[] {
  return multipla ? [`${numero}º ataque: ${multipla}${agil ? " (ágil)" : ""}`] : [];
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

// Atalhos por palavra: todos exigem começo de palavra ("natação" tem "atac" dentro e não é ataque; "pulo" não é "impulso").
const INICIO = "(^|[^a-z])";
const MANOBRAS = new RegExp(`${INICIO}(agarr|empurr|derrub|reposicion|desarm(?!.*armadilh)|grapple|shove|trip)`);
const ATAQUE = new RegExp(`${INICIO}(ataq|atac|golpe|strike|atir|dispar)`);
const MAGIA = new RegExp(`${INICIO}(magi|feiti|conjur|truque|spell)`);
const IMPULSO = new RegExp(`${INICIO}(impulso|impulse|explosao elemental)`);
const PERCEPCAO = /percep|buscar|procurar|senso de motivo|notar|perceb|vigiar|observar|perception/;
const CONHECIMENTO =["arcanismo", "natureza", "ocultismo", "religiao", "sociedade"];
/** Tradição de magia citada no pedido → perícia de conhecimento que a identifica. */
const TRADICAO_NO_TEXTO: [RegExp, string][] = [
  [/arcan/, "arcanismo"],
  [/divin|sagrad|religi/, "religiao"],
  [/ocult/, "ocultismo"],
  [/primal|natur/, "natureza"],
];

const NAO_RECONHECIDO = "teste não reconhecido: d20 sem bônus";

/** A melhor perícia de conhecimento da ficha (quando o pedido não diz qual). */
function melhorConhecimento(ficha: Ficha): Calculo {
  return CONHECIMENTO.map((id) => calcPericia(ficha, id)).sort((x, y) => y.bonus - x.bonus)[0];
}

/** Perícia de conhecimento citada no pedido ("Recordar Conhecimento sobre religião"), se alguma. */
function conhecimentoCitado(n: string): string | null {
  const pericia = acharPericia(n, false);
  return pericia && CONHECIMENTO.includes(pericia.id) ? pericia.id : null;
}

/** Perícia cujo nome ou apelido ABRE o texto ("escalar o muro" → Atletismo; "esquivar da armadilha" não é Ladroagem). */
function periciaNoInicio(n: string) {
  return PERICIAS.find((p) => [p.id, normalizar(p.nome), ...p.aliases].some((x) => n === x || n.startsWith(`${x} `)));
}

/**
 * "Ação (Perícia)": o que está entre parênteses manda quando é o NOME de uma perícia ou salvamento ("Recordar Conhecimento (Religião)"
 * usa Religião, não a melhor das cinco; "Resistir ao veneno (Fortitude)" é o salvamento), ou uma ação que começa pelo nome dela
 * ("Subir a torre (escalar a parede)" → Atletismo). O que está FORA do parêntese vem primeiro quando já é salvamento ou perícia:
 * "Reflexos (esquivar da armadilha)" é Reflexos, não a Ladroagem do apelido "armadilha" solto, e "Medicina (Tratar Ferimentos)" é só
 * "Medicina", sem repetir o nome. Parênteses com outra coisa ("Ataque (espada)") ficam para os atalhos.
 */
function periciaEntreParenteses(ficha: Ficha, teste: string, profundidade: number): Calculo | null {
  const dentro = teste.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (!dentro || profundidade >= 1) return null;
  const fora = normalizar(teste.replace(/\s*\([^)]*\)/, ""));
  if (SALVAMENTOS.some((s) => s.re.test(fora))) return null;
  const nd = normalizar(dentro);
  const periciaFora = acharPericia(fora, true) ?? acharPericia(fora, false);
  const nomeDentro = acharPericia(nd, true) ?? SALVAMENTOS.find((s) => s.re.test(nd));
  if (periciaFora) {
    // "Escalar (Acrobatismo)": o parêntese só troca a perícia quando é o nome dela; explicação solta fica com a perícia de fora
    if (!nomeDentro || nomeDentro.id === periciaFora.id) return calcPericia(ficha, periciaFora.id);
  } else if (!nomeDentro && !periciaNoInicio(nd)) return null;
  const interno = calcular(ficha, dentro, profundidade + 1);
  if (interno.detalhes.includes(NAO_RECONHECIDO)) return null;
  return { ...interno, rotulo: `${teste.replace(/\s*\(.*$/, "").trim()} (${interno.rotulo})` };
}

/** Interpreta o nome do teste pedido pelo mestre e devolve rótulo, bônus e tipo. Exportado para os testes unitários. */
export function calcular(ficha: Ficha, teste: string, profundidade = 0, opcoes: OpcoesCalculo = {}): Calculo {
  const n = normalizar(teste).replace(/explorar vulnerabilidade/, "saber esoterico");
  const classe = classeDe(ficha);

  if (/recupera/.test(n)) {
    const moribundo = valorDaCondicao(ficha.condicoes, "moribundo") || 1;
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

  // o parêntese vem ANTES dos atalhos: "Recordar Conhecimento (Religião)" é Religião, e não a melhor perícia de conhecimento
  const entreParenteses = periciaEntreParenteses(ficha, teste, profundidade);
  if (entreParenteses) return entreParenteses;

  // "Identificar magia/feitiço/aura/runa" é Recordar Conhecimento pela tradição citada (arcana → Arcanismo, divina → Religião,
  // oculta → Ocultismo, primal → Natureza; sem tradição, a melhor), nunca um ataque de magia; "Identificar item/poção" é Manufatura;
  // o resto ("Identificar armadilha", "Identificar a criatura") segue a perícia citada ou a melhor de conhecimento, sem rótulo de magia.
  // Salvamento ou Percepção citados mandam ("Fortitude contra o veneno não identificado", "Percepção para identificar a armadilha"),
  // e a perícia citada vale em todos os ramos ("Medicina para identificar o veneno" é Medicina, não Manufatura)
  if (/identific/.test(n) && !SALVAMENTOS.some((s) => s.re.test(n)) && !PERCEPCAO.test(n)) {
    const citada = acharPericia(n.replace(/identific\w*/, "").trim(), false);
    if (!citada && /alquim|item|pocao|artefato|veneno|elixir/.test(n)) return calcPericia(ficha, "manufatura", "Identificar · ");
    if (/magi|feiti|encant|aura|runa|conjur/.test(n)) {
      const tradicao = TRADICAO_NO_TEXTO.find(([re]) => re.test(n))?.[1];
      const base = tradicao ? calcPericia(ficha, tradicao) : citada ? calcPericia(ficha, citada.id) : melhorConhecimento(ficha);
      return { ...base, rotulo: `Identificar magia (${base.rotulo})` };
    }
    const base = citada ? calcPericia(ficha, citada.id) : melhorConhecimento(ficha);
    return { ...base, rotulo: `Identificar (${base.rotulo})` };
  }

  const salvamento = SALVAMENTOS.find((s) => s.re.test(n));
  if (salvamento) {
    const grau = grauEm(classe.prog[salvamento.id], ficha.nivel);
    return { rotulo: salvamento.nome, bonus: bonusSalvamento(ficha, salvamento.id), atributo: salvamento.atributo, tipo: "salvamento", detalhes: [GRAUS[grau].toLowerCase()] };
  }

  if (MAGIA.test(n)) {
    const numero = numeroAtaque(n, opcoes);
    const bonus = bonusMagia(ficha);
    const multipla = penalidadeMultipla(numero, false);
    const detalhes = textoMultipla(numero, multipla);
    const ataque = { numero };
    if (bonus === null) return { rotulo: "Ataque mágico (sem conjuração)", bonus: mod(ficha, chaveDaFicha(ficha)) + multipla, atributo: chaveDaFicha(ficha), tipo: "ataque", detalhes: [...detalhes, "classe não conjura"], ataque };
    return { rotulo: `Ataque de magia (${tradicaoDe(ficha) ?? "foco"})`, bonus: bonus + multipla, atributo: atributoMagia(ficha), tipo: "ataque", detalhes, ataque };
  }

  if (IMPULSO.test(n)) {
    const numero = numeroAtaque(n, opcoes);
    const multipla = penalidadeMultipla(numero, false);
    const prog = classe.id === "cinetico" ? classe.prog.cd : "";
    return {
      rotulo: "Ataque de impulso",
      bonus: mod(ficha, "con") + proficiencia(grauEm(prog, ficha.nivel), ficha.nivel) + multipla,
      atributo: "con",
      tipo: "ataque",
      detalhes: textoMultipla(numero, multipla),
      ataque: { numero },
    };
  }

  if (MANOBRAS.test(n)) {
    const numero = numeroAtaque(n, opcoes);
    const multipla = penalidadeMultipla(numero, false);
    const base = calcPericia(ficha, "atletismo", "Manobra · ");
    return { ...base, bonus: base.bonus + multipla, tipo: "ataque", detalhes: [...base.detalhes, ...textoMultipla(numero, multipla)], ataque: { numero } };
  }

  if (ATAQUE.test(n)) {
    const { arma, arremessada } = armaDoAtaque(ficha, n);
    const numero = numeroAtaque(n, opcoes);
    const agil = Boolean(arma.agil);
    const multipla = penalidadeMultipla(numero, agil);
    const detalhes = textoMultipla(numero, multipla, agil);
    const dano = { expressao: danoArma(ficha, arma, arremessada), tipo: arma.tipo, mortal: arma.mortal };
    const ataque = { numero, agil };
    if (/estratag/.test(n) && classe.id === "investigador") {
      const bonus = mod(ficha, "int") + proficiencia(grauEm(classe.prog.ataque, ficha.nivel), ficha.nivel);
      return { rotulo: `Ataque com estratagema (${arma.nome})`, bonus: bonus + multipla, atributo: "int", tipo: "ataque", detalhes, ataque, dano };
    }
    const nomeArma = arremessada && !arma.distancia ? `${arma.nome} arremessada` : arma.nome;
    return { rotulo: `Ataque (${nomeArma})`, bonus: bonusAtaque(ficha, arma, arremessada) + multipla, atributo: atributoDoAtaque(ficha, arma, arremessada), tipo: "ataque", detalhes, ataque, dano };
  }

  if (/escapar|escape/.test(n)) {
    const atl = calcPericia(ficha, "atletismo");
    const acr = calcPericia(ficha, "acrobatismo");
    const melhor = atl.bonus >= acr.bonus ? atl : acr;
    return { ...melhor, rotulo: `Escapar (${melhor.rotulo})` };
  }

  if (PERCEPCAO.test(n)) {
    return { rotulo: "Percepção", bonus: bonusPercepcao(ficha), atributo: "sab", tipo: "percepcao", detalhes: [] };
  }

  if (/recordar|lembrar|conhecimento/.test(n)) {
    // a perícia citada no texto ("Recordar Conhecimento sobre religião") manda; só sem ela vale a melhor das cinco
    const citada = conhecimentoCitado(n);
    const base = citada ? calcPericia(ficha, citada) : melhorConhecimento(ficha);
    return { ...base, rotulo: `Recordar Conhecimento (${base.rotulo})` };
  }

  const pericia = acharPericia(n, false);
  if (pericia) return calcPericia(ficha, pericia.id);

  // atributo por nome ou abreviação exata ("FOR", "teste de CAR"); prefixo solto pegaria "desarmar" como DES
  const atributo = acharPorNome(ATRIBUTOS, teste) ?? ATRIBUTOS.find((a) => new RegExp(`(^|[^a-z])${a.id}([^a-z]|$)`).test(n));
  if (atributo) return { rotulo: atributo.nome, bonus: mod(ficha, atributo.id), atributo: atributo.id, tipo: "atributo", detalhes: ["teste de atributo puro"] };

  // "Ação (Perícia)": tenta o que está entre parênteses
  const dentro = teste.match(/\(([^)]+)\)/)?.[1];
  if (dentro && profundidade < 1) {
    const interno = calcular(ficha, dentro, profundidade + 1, opcoes);
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

/** Dano da arma: corpo a corpo e arremesso somam FOR; propulsiva soma metade da FOR (se positiva); mais especialização. */
function danoArma(ficha: Ficha, arma: ArmaEmUso = armaCompleta(armaDe(ficha)), arremessada = false): string {
  const classe = classeDe(ficha);
  const grau = grauEm(classe.prog.ataque, ficha.nivel);
  const marcial = grauEm(classe.prog.ataque, 7) >= 2;
  const nivelEspecializacao = marcial ? 7 : 13;
  const forca = mod(ficha, "for");
  let bonus = arremessada || !arma.distancia ? forca : arma.propulsivo ? (forca > 0 ? Math.floor(forca / 2) : forca) : 0;
  if (ficha.nivel >= nivelEspecializacao && grau >= 2) bonus += (grau === 2 ? 2 : grau === 3 ? 3 : 4) * (marcial && ficha.nivel >= 15 ? 2 : 1);
  return `${arma.dano}${bonus ? sinal(bonus) : ""}`;
}

/** Armas da ficha: a da classe (já ajustada ao atributo-chave) e as do inventário que estão no catálogo, sem repetir. */
function armasDaFicha(ficha: Ficha): ArmaEmUso[] {
  const daClasse = armaCompleta(armaDe(ficha));
  const out: ArmaEmUso[] = [daClasse];
  for (const a of armasDoInventario(ficha.inventario)) if (!out.some((x) => normalizar(x.nome) === normalizar(a.nome))) out.push(a);
  return out;
}

/** "Rapieira +7 (1d6+3 perfurante, ágil)". */
function linhaArma(ficha: Ficha, arma: ArmaEmUso): { nome: string; bonus: number; dano: string; tracos: string } {
  const tracos = [arma.distancia ? "distância" : "", arma.agil ? "ágil" : "", arma.acuidade ? "acuidade" : "", arma.mortal ? `mortal ${arma.mortal.replace(/^1/, "")}` : ""].filter(Boolean).join(", ");
  return { nome: arma.nome, bonus: bonusAtaque(ficha, arma), dano: `${danoArma(ficha, arma)}${arma.tipo ? ` ${arma.tipo}` : ""}`, tracos };
}

/** CA com as condições da ficha (igual à CA quando nada pesa). */
function caEfetiva(ficha: Ficha) {
  return defesaComCondicoes(ficha.defesa, ficha.condicoes, "des", true);
}

/** CD de classe com as condições (amedrontado, enjoado e as de atributo do atributo-chave). */
function cdClasseEfetiva(ficha: Ficha) {
  return defesaComCondicoes(cdClasse(ficha), ficha.condicoes, chaveDaFicha(ficha), false);
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
  // limite real: perícias da classe + INT (o passo de criação ainda soma +1 por perícia fixa repetida, via pf2e/criacao.ts)
  limitePericias: { base: 3, porClasse: Object.fromEntries(CLASSES.map((c) => [c.id, c.maisPericias])), somaAtributo: "int" },
  condicoes: CONDICOES_PF2E.map(({ id, nome, sinonimos, temValor, max, efeito }) => ({ id, nome, sinonimos, temValor, max, efeito })),
  nivelMaximo: 20,
  combate: { modelo: "rodadas", iniciativaNpc: "1d20", acoes: 3 },
  progressao: "xp",
  testesSugeridos: ["Percepção", "Atletismo", "Acrobatismo", "Furtividade", "Diplomacia", "Dissimulação", "Intimidação", "Medicina", "Fortitude", "Reflexos", "Vontade", "Ataque", "Ataque 2", "Magia", "Iniciativa", "Recordar Conhecimento", "Teste simples", "Recuperação"],
  regrasParaMestre: REGRAS_PF2E,

  atributosIniciais(classeId, metodo) {
    return atributosIniciaisPf2(classeId, metodo);
  },

  avisosCriacao(entrada) {
    const { fixas, limite } = periciasCriacaoPf2(entrada);
    const escolhidas = [...new Set(entrada.pericias ?? [])].filter((id) => PERICIAS.some((p) => p.id === id) && !fixas.some((f) => f.id === id));
    const avisos: string[] = [];
    if (escolhidas.length > limite) avisos.push(`Perícias: ${escolhidas.length} escolhidas, mas o limite é ${limite}; as que passarem ficam de fora.`);
    if (escolhidas.length < limite) {
      const faltam = limite - escolhidas.length;
      const completar = ordemDeCompletar(entrada.classe, entrada.extras)
        .filter((id) => !fixas.some((f) => f.id === id) && !escolhidas.includes(id))
        .slice(0, faltam)
        .map(nomePericia);
      avisos.push(`Faltam ${faltam} perícia${faltam > 1 ? "s" : ""} (${escolhidas.length}/${limite}); a ficha completa com ${completar.join(", ")}.`);
    }
    return avisos;
  },

  fimDoTurno(condicoes) {
    return condicoesNoFimDoTurno(condicoes);
  },

  defesaComCondicoes(defesa, condicoes) {
    return defesaComCondicoes(defesa, condicoes);
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

    // perícias: fixas da classe, do antecedente e da subclasse; repetidas viram escolhas extras. As escolhas que faltam são
    // completadas pelas sugeridas da classe e pelas do atributo-chave (avisosCriacao avisa quais), nunca em ordem alfabética
    let extrasPericia = Math.max(0, classe.maisPericias + ficha.atributos.int);
    for (const id of [...(classe.pericias ?? []), antecedente.pericia, ...periciasDeSubclasse(classe, extras)]) {
      if (!PERICIAS.some((p) => p.id === id)) continue;
      if (ficha.pericias[id]) extrasPericia++;
      else ficha.pericias[id] = 1;
    }
    const candidatas = [...(entrada.pericias ?? []), ...ordemDeCompletar(classe.id, extras), ...PERICIAS.map((p) => p.id)];
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
    const op = pedido.opcoes ?? {};
    const numeroOp = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
    const calc = calcular(ficha, pedido.teste, 0, { numeroAtaque: numeroOp(op.numeroAtaque), ataquesNoTurno: numeroOp(op.ataquesNoTurno) });
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
    if (calc.ataque) resultado.ataque = calc.ataque;
    // acerto com arma: o servidor rola o dano (crítico dobra e soma o dado mortal); a prévia não rola nada
    // (sem CA não há como saber se acertou: o cartão só lembra o dano da arma)
    if (calc.dano && !pedido.previa && resultado.alvo === null) resultado.detalhes = [resultado.detalhes, `dano se acertar: ${calc.dano.expressao}`].filter(Boolean).join(" · ");
    if (calc.dano && !pedido.previa && resultado.alvo !== null && (resultado.grau === "sucesso" || resultado.grau === "sucesso_critico")) {
      const critico = resultado.grau === "sucesso_critico";
      const rolagem = rolar(calc.dano.expressao);
      const mortal = critico && calc.dano.mortal ? rolar(calc.dano.mortal) : null;
      const valor = Math.max(1, rolagem.total) * (critico ? 2 : 1) + (mortal?.total ?? 0);
      const conta = `${descreverRolagem(rolagem)}${critico ? " ×2" : ""}${mortal ? ` + mortal ${descreverRolagem(mortal)}` : ""}`;
      const textoDano = `${critico ? "crítico, " : ""}acertou: ${valor} de dano${calc.dano.tipo ? ` ${calc.dano.tipo}` : ""} (${conta})`;
      resultado.dano = { valor, ...(calc.dano.tipo ? { tipo: calc.dano.tipo } : {}), texto: textoDano };
      resultado.detalhes = [resultado.detalhes, textoDano].filter(Boolean).join(" · ");
    }
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
    const extrasClasse = classe.id === "ladino" ? ` · Ataque Furtivo +${ataqueFurtivo(ficha.nivel)}` : "";
    const ataques = armasDaFicha(ficha)
      .map((a) => {
        const l = linhaArma(ficha, a);
        return `${l.nome} ${sinal(l.bonus)} (${l.dano}${l.tracos ? `; ${l.tracos}` : ""})`;
      })
      .join(" · ");
    const ca = caEfetiva(ficha);
    const cd = cdClasseEfetiva(ficha);
    const cdTexto = cd.detalhe ? `CD de classe ${cd.valor} (base ${cdClasse(ficha)}; ${cd.detalhe})` : `CD de classe ${cd.valor}`;
    const linhas = [
      `${ficha.nome} — ${anc.nome} ${classe.nome} nível ${ficha.nivel} (XP ${ficha.xp})${antecedente ? `, antecedente ${antecedente.nome}` : ""}`,
      `PV ${ficha.pv}/${ficha.pvMax} · CA ${ca.valor}${ca.detalhe ? ` (base ${ficha.defesa}; ${ca.detalhe})` : ""} · Percepção ${sinal(bonusPercepcao(ficha))} · ${salv} · deslocamento ${anc.deslocamento} · ${ficha.dinheiro} po`,
      `Atributos: ${atributos} (chave ${chaveDaFicha(ficha).toUpperCase()})`,
      `Ataques: ${ataques}${extrasClasse} · ${cdTexto} · 2º ataque −5 (ágil −4), 3º −10 (ágil −8): o servidor conta sozinho no combate`,
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
    const ca = caEfetiva(ficha);
    const cd = cdClasseEfetiva(ficha);
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
          ca.detalhe
            ? { rotulo: "CA", valor: String(ca.valor), detalhe: `base ${ficha.defesa} · ${ca.detalhe}` }
            : { rotulo: "CA", valor: String(ficha.defesa), detalhe: armaduraDe(ficha).nome },
          ...SALVAMENTOS.map((s) => ({ rotulo: s.nome, valor: sinal(bonusSalvamento(ficha, s.id)), detalhe: GRAUS[grauEm(classe.prog[s.id], ficha.nivel)] })),
          { rotulo: "Percepção", valor: sinal(bonusPercepcao(ficha)), detalhe: GRAUS[grauEm(classe.prog.percepcao, ficha.nivel)] },
          { rotulo: "Deslocamento", valor: anc.deslocamento ?? "7,5 m" },
        ],
      },
      {
        tipo: "grade",
        titulo: "Ofensiva",
        itens: [
          ...armasDaFicha(ficha).map((a) => {
            const l = linhaArma(ficha, a);
            return { rotulo: l.nome.charAt(0).toUpperCase() + l.nome.slice(1), valor: sinal(l.bonus), detalhe: [l.dano, l.tracos].filter(Boolean).join(" · ") };
          }),
          { rotulo: "CD de classe", valor: String(cd.valor), ...(cd.detalhe ? { detalhe: `base ${cdClasse(ficha)} · ${cd.detalhe}` } : {}) },
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

  aposMudancaDePv(ficha, pvAntes, origem) {
    condicoesMoribundo(ficha, pvAntes);
    // descanso que encheu o PV: o ferido sai junto (a regra do descanso vale também para quem saiu do moribundo agora)
    if (origem.startsWith("descanso") && ficha.pv >= ficha.pvMax) ficha.condicoes = semCondicoes(ficha.condicoes, ["ferido"]);
  },

  descansar(original, tipo) {
    const ficha = clonar(original);
    if (tipo === "longo") {
      // 8 horas: CON × nível (mínimo 1 × nível), preparação diária renova magia, foco e reagentes
      const cura = Math.max(1, mod(ficha, "con")) * ficha.nivel;
      const pvAntes = ficha.pv;
      ficha.pv = Math.min(ficha.pvMax, ficha.pv + cura);
      for (const [id, r] of Object.entries(ficha.recursos)) if (id !== "heroi") r.atual = r.max;
      const antes = [...ficha.condicoes];
      // quem estava moribundo e voltou a ter PV sai do moribundo (e o ferido sobe), como em qualquer cura
      condicoesMoribundo(ficha, pvAntes);
      ficha.condicoes = semCondicoes(ficha.condicoes, ["fatigado", ...(ficha.pv > 0 ? ["inconsciente", "moribundo"] : []), "amedrontado", "enjoado"])
        .map((c) => {
          // drenado e condenado caem 1 por noite
          const lida = lerCondicao(c, CONDICOES_PF2E);
          if (!lida || (lida.def.id !== "drenado" && lida.def.id !== "condenado")) return c;
          const valor = (lida.valor ?? 1) - 1;
          return valor > 0 ? `${lida.def.nome} ${valor}` : "";
        })
        .filter(Boolean);
      // o ferido só fica enquanto o PV não está cheio
      if (ficha.pv >= ficha.pvMax) ficha.condicoes = semCondicoes(ficha.condicoes, ["ferido"]);
      const saiu = antes.filter((c) => !ficha.condicoes.includes(c));
      return {
        ficha,
        resumo: `${ficha.nome} dormiu 8 horas: +${cura} PV (${ficha.pv}/${ficha.pvMax}), magias, foco e recursos diários renovados${saiu.length ? `; condições que passaram ou baixaram: ${saiu.join(", ")}` : ""}. Pontos de Herói não voltam com descanso.`,
      };
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
        const pvAntes = ficha.pv;
        ficha.pv = Math.min(ficha.pvMax, ficha.pv + cura);
        condicoesMoribundo(ficha, pvAntes);
        // Tratar Ferimentos bem-sucedido também tira a condição ferido
        const tinhaFerido = temCondicao(ficha.condicoes, "ferido");
        ficha.condicoes = semCondicoes(ficha.condicoes, ["ferido"]);
        partes.push(`Tratar Ferimentos (Medicina ${r.total} vs CD ${escolha.cd}, ${r.rotuloGrau.toLowerCase()}) curou ${cura} PV${tinhaFerido ? " e tirou o ferido" : ""}`);
      } else if (r.grau === "falha_critica") {
        const dano = somar(1, 8).total;
        ficha.pv = Math.max(0, ficha.pv - dano);
        partes.push(`Tratar Ferimentos deu muito errado (Medicina ${r.total} vs CD ${escolha.cd}): ${dano} de dano`);
      } else partes.push(`Tratar Ferimentos falhou (Medicina ${r.total} vs CD ${escolha.cd})`);
    }
    if (ficha.pv === ficha.pvMax) ficha.condicoes = semCondicoes(ficha.condicoes, ["ferido"]);
    return {
      ficha,
      resumo: `${ficha.nome} descansou 10 minutos${partes.length ? `: ${partes.join("; ")}` : ", mas não tinha o que recuperar sozinho (peça a um aliado treinado em Medicina para Tratar Ferimentos)"}. PV ${ficha.pv}/${ficha.pvMax}.`,
    };
  },
};
