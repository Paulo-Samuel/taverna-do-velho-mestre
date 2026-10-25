import "server-only";
import { modD20, normalizar } from "../comum";
import type { Ficha, Recurso } from "../tipos";
import {
  ANTECEDENTES,
  CLASSES,
  ESPACOS_COMPLETO,
  ESPECIES,
  LINHAGENS,
  PACTO,
  SUBCLASSES,
  TALENTOS,
  type Antecedente5e,
  type Classe5e,
  type Especie5e,
  type Linhagem5e,
  type Subclasse5e,
} from "./dados";

// Contas do 5e derivadas da ficha: proficiência, CA, recursos por nível, progressões de classe.
// Tudo tolerante a fichas antigas (sem antecedente, sem extras, com o recurso "magia" único da versão anterior).

export function proficiencia(nivel: number): number {
  return 2 + Math.floor((Math.max(1, nivel) - 1) / 4);
}

export function mod(ficha: Ficha, atributo: string): number {
  return modD20(ficha.atributos[atributo] ?? 10);
}

export function classeDe(ficha: Ficha): Classe5e {
  return CLASSES.find((c) => c.id === ficha.classe) ?? CLASSES[0];
}

export function especieDe(ficha: Ficha): Especie5e {
  return ESPECIES.find((e) => e.id === ficha.ancestralidade) ?? ESPECIES[0];
}

export function antecedenteDe(ficha: Ficha): Antecedente5e | undefined {
  return ANTECEDENTES.find((a) => a.id === ficha.antecedente);
}

export function texto(ficha: Ficha, chave: string): string {
  const v = ficha.extras[chave];
  return typeof v === "string" ? v : "";
}

export function lista(ficha: Ficha, chave: string): string[] {
  const v = ficha.extras[chave];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : typeof v === "string" && v ? [v] : [];
}

/** Linhagem gravada na ficha, se for da espécie (criarFicha grava a padrão; fichas antigas ficam sem). */
export function linhagemDe(ficha: Ficha): Linhagem5e | undefined {
  const especie = especieDe(ficha).id;
  return LINHAGENS.find((l) => l.id === texto(ficha, "linhagem") && l.especie === especie);
}

/** Subclasse do SRD escolhida para a classe atual; "outra" vira só nome (texto livre), sem mecânica. */
export function subclasseDe(ficha: Ficha): { sub?: Subclasse5e; nome: string } | null {
  const classe = classeDe(ficha);
  const id = texto(ficha, `subclasse_${classe.id}`) || texto(ficha, "subclasse");
  const sub = SUBCLASSES.find((s) => s.classe === classe.id && (s.id === id || normalizar(s.nome) === normalizar(id)));
  if (sub) return { sub, nome: sub.nome };
  const livre = texto(ficha, "subclasseOutra") || (id && id !== "outra" ? id : "");
  return livre ? { nome: livre } : null;
}

/** Subclasse ativa (com mecânica) só a partir do 3º nível. */
export function temSubclasse(ficha: Ficha, id: string): boolean {
  return ficha.nivel >= 3 && subclasseDe(ficha)?.sub?.id === id;
}

/** Ids de talentos: os gravados na criação, ou o do antecedente para fichas antigas. */
export function talentosDe(ficha: Ficha): string[] {
  const gravados = lista(ficha, "talentos").filter((t) => TALENTOS[t]);
  if (gravados.length) return gravados;
  const doAntecedente = antecedenteDe(ficha)?.talento;
  return doAntecedente ? [doAntecedente] : [];
}

export function estiloLuta(ficha: Ficha): string {
  const classe = classeDe(ficha);
  const nivelMinimo = classe.id === "guerreiro" ? 1 : 2;
  if (!["guerreiro", "paladino", "patrulheiro"].includes(classe.id) || ficha.nivel < nivelMinimo) return "";
  return texto(ficha, "estiloLuta") || (classe.id === "patrulheiro" ? "arquearia" : "defesa");
}

/** CA pela armadura inicial da classe e pelos traços (Defesa sem Armadura, Resiliência Dracônica, ordens). */
export function caCalculada(ficha: Ficha): number {
  const classe = classeDe(ficha);
  let armadura = classe.armadura;
  if (classe.id === "clerigo" && texto(ficha, "ordemDivina") === "protetor") armadura = { nome: "cota de malha", base: 16, des: "nenhum" };
  if (classe.id === "druida" && texto(ficha, "ordemPrimal") === "guardiao") armadura = { nome: "gibão de peles", base: 12, des: "max2" };
  if (temSubclasse(ficha, "draconica")) armadura = { nome: "resiliência dracônica", base: 10, des: "total", extra: "car", semArmadura: true };
  const des = mod(ficha, "des");
  let ca = armadura.base + (armadura.des === "total" ? des : armadura.des === "max2" ? Math.min(2, des) : 0);
  if (armadura.extra) ca += mod(ficha, armadura.extra);
  if (classe.escudo) ca += 2;
  if (estiloLuta(ficha) === "defesa" && !armadura.semArmadura) ca += 1;
  return ca;
}

export function deslocamento(ficha: Ficha): number {
  const classe = classeDe(ficha);
  let metros = linhagemDe(ficha)?.metros ?? especieDe(ficha).metros;
  const n = ficha.nivel;
  if (classe.id === "monge" && n >= 2) metros += n >= 18 ? 9 : n >= 14 ? 7.5 : n >= 10 ? 6 : n >= 6 ? 4.5 : 3;
  if (classe.id === "barbaro" && n >= 5) metros += 3;
  if (classe.id === "patrulheiro" && n >= 6) metros += 3;
  return metros;
}

export function metrosTexto(m: number): string {
  return `${String(m).replace(".", ",")} m`;
}

export const bonusFuria = (n: number) => (n >= 16 ? 4 : n >= 9 ? 3 : 2);
export const dadoArtesMarciais = (n: number) => (n >= 17 ? 12 : n >= 11 ? 10 : n >= 5 ? 8 : 6);
export const dadoInspiracao = (n: number) => (n >= 15 ? 12 : n >= 10 ? 10 : n >= 5 ? 8 : 6);
export const dadosFurtivo = (n: number) => Math.ceil(n / 2);
/** Truques de dano ganham um dado nos níveis 5, 11 e 17. */
export const dadosTruque = (n: number) => (n >= 17 ? 4 : n >= 11 ? 3 : n >= 5 ? 2 : 1);

export function ataquesPorAcao(ficha: Ficha): number {
  const classe = classeDe(ficha);
  const n = ficha.nivel;
  if (classe.id === "guerreiro") return n >= 20 ? 4 : n >= 11 ? 3 : n >= 5 ? 2 : 1;
  if (["barbaro", "monge", "paladino", "patrulheiro"].includes(classe.id) && n >= 5) return 2;
  return 1;
}

/** Margem mínima do d20 para crítico em ataques (Campeão: 19, depois 18). */
export function criticoMinimo(ficha: Ficha): number {
  if (temSubclasse(ficha, "campeao")) return ficha.nivel >= 15 ? 18 : 19;
  return 20;
}

/** Características de classe e subclasse já alcançadas. */
export function caracteristicasAte(ficha: Ficha): string[] {
  const classe = classeDe(ficha);
  const sub = subclasseDe(ficha);
  const daClasse = classe.caracteristicas.filter(([n]) => n <= ficha.nivel).map(([, nome]) => nome);
  const daSub = ficha.nivel >= 3 ? (sub?.sub?.caracteristicas ?? []).filter(([n]) => n <= ficha.nivel).map(([, nome]) => nome) : [];
  return [...daClasse, ...daSub];
}

/** Características ganhas exatamente no nível `nivel`. */
export function caracteristicasNoNivel(ficha: Ficha, nivel: number): string[] {
  const classe = classeDe(ficha);
  const sub = subclasseDe(ficha);
  const novas = classe.caracteristicas.filter(([n]) => n === nivel).map(([, nome]) => nome);
  if (nivel === 3) novas.unshift(sub ? `Subclasse: ${sub.nome}` : "Subclasse (escolha uma com o mestre)");
  for (const [n, nome] of sub?.sub?.caracteristicas ?? []) if (n === nivel) novas.push(nome);
  if (aumentoNoNivel(classe, nivel)) novas.push("Aumento de Atributo (ou talento)");
  if (nivel === 19) novas.push("Dádiva Épica");
  return novas;
}

export function aumentoNoNivel(classe: Classe5e, nivel: number): boolean {
  return [4, 8, 12, 16, ...(classe.aumentosExtras ?? [])].includes(nivel);
}

// ---------- recursos ----------

/** Como o recurso volta no descanso curto: tudo, um uso, um número fixo ou nada (só no longo). */
type Volta = "tudo" | "um" | "nada" | number;
type RecursoDesejado = { rotulo: string; max: number; curto: Volta };

/** Todos os ids que este sistema administra (inclui "magia", o recurso único da versão antiga). */
const GERENCIADOS = new Set([
  "magia", "magia1", "magia2", "magia3", "magia4", "magia5", "magia6", "magia7", "magia8", "magia9", "pacto", "arcano6", "arcano7", "arcano8", "arcano9",
  "furia", "inspiracaoBardo", "canalizar", "formaSelvagem", "feiticaria", "feiticariaInata", "foco", "retomarFolego", "surtoAcao", "indomavel",
  "golpeSorte", "recuperacaoArcana", "imposicaoMaos", "marcaCacador", "sopro", "gigante", "adrenalina", "implacavel", "maosCurativas", "revelacao",
  "sentidoPedra", "sorte", "inspiracao", "dadosVida",
]);

export function espacosPorCirculo(ficha: Ficha): number[] {
  const classe = classeDe(ficha);
  const n = Math.max(1, Math.min(20, ficha.nivel));
  if (classe.conjurador === "completo") return ESPACOS_COMPLETO[n];
  if (classe.conjurador === "meio") return ESPACOS_COMPLETO[Math.ceil(n / 2)];
  return [];
}

function recursosDesejados(ficha: Ficha): Record<string, RecursoDesejado> {
  const classe = classeDe(ficha);
  const n = Math.max(1, Math.min(20, ficha.nivel));
  const prof = proficiencia(n);
  const r: Record<string, RecursoDesejado> = {};

  // espaços primeiro: "magia" no alterar_ficha cai no 1º círculo
  espacosPorCirculo(ficha).forEach((qtd, i) => {
    r[`magia${i + 1}`] = { rotulo: `Magia ${i + 1}º círculo`, max: qtd, curto: "nada" };
  });
  if (classe.conjurador === "pacto") {
    const [qtd, circulo] = PACTO[n];
    r.pacto = { rotulo: `Magia de pacto (${circulo}º círculo)`, max: qtd, curto: "tudo" };
    for (const [c, nivelMin] of [[6, 11], [7, 13], [8, 15], [9, 17]] as const) {
      if (n >= nivelMin) r[`arcano${c}`] = { rotulo: `Arcano místico ${c}º`, max: 1, curto: "nada" };
    }
  }

  switch (classe.id) {
    case "barbaro":
      r.furia = { rotulo: `Fúria (+${bonusFuria(n)} dano)`, max: n >= 17 ? 6 : n >= 12 ? 5 : n >= 6 ? 4 : n >= 3 ? 3 : 2, curto: "um" };
      break;
    case "bardo":
      r.inspiracaoBardo = { rotulo: `Inspiração de bardo (d${dadoInspiracao(n)})`, max: Math.max(1, mod(ficha, "car")), curto: n >= 5 ? "tudo" : "nada" };
      break;
    case "clerigo":
      if (n >= 2) r.canalizar = { rotulo: "Canalizar Divindade", max: n >= 18 ? 4 : n >= 6 ? 3 : 2, curto: "um" };
      break;
    case "druida":
      if (n >= 2) r.formaSelvagem = { rotulo: "Forma Selvagem", max: n >= 17 ? 4 : n >= 6 ? 3 : 2, curto: "um" };
      break;
    case "feiticeiro":
      r.feiticariaInata = { rotulo: "Feitiçaria Inata", max: 2, curto: "nada" };
      if (n >= 2) r.feiticaria = { rotulo: "Pontos de feitiçaria", max: n, curto: n >= 5 ? Math.floor(n / 2) : "nada" };
      break;
    case "guerreiro":
      r.retomarFolego = { rotulo: "Retomar Fôlego", max: n >= 10 ? 4 : n >= 4 ? 3 : 2, curto: "um" };
      if (n >= 2) r.surtoAcao = { rotulo: "Surto de Ação", max: n >= 17 ? 2 : 1, curto: "tudo" };
      if (n >= 9) r.indomavel = { rotulo: "Indomável", max: n >= 17 ? 3 : n >= 13 ? 2 : 1, curto: "nada" };
      break;
    case "ladino":
      if (n >= 20) r.golpeSorte = { rotulo: "Golpe de Sorte", max: 1, curto: "tudo" };
      break;
    case "mago":
      r.recuperacaoArcana = { rotulo: "Recuperação Arcana", max: 1, curto: "nada" };
      break;
    case "monge":
      if (n >= 2) r.foco = { rotulo: `Pontos de foco (artes marciais d${dadoArtesMarciais(n)})`, max: n, curto: "tudo" };
      break;
    case "paladino":
      r.imposicaoMaos = { rotulo: "Imposição de Mãos (PV)", max: 5 * n, curto: "nada" };
      if (n >= 3) r.canalizar = { rotulo: "Canalizar Divindade", max: n >= 11 ? 3 : 2, curto: "um" };
      break;
    case "patrulheiro":
      r.marcaCacador = { rotulo: "Marca do Caçador grátis", max: n >= 17 ? 6 : n >= 13 ? 5 : n >= 9 ? 4 : n >= 5 ? 3 : 2, curto: "nada" };
      break;
  }

  switch (especieDe(ficha).id) {
    case "draconato":
      r.sopro = { rotulo: `Arma de sopro (${n >= 17 ? 4 : n >= 11 ? 3 : n >= 5 ? 2 : 1}d10)`, max: prof, curto: "nada" };
      break;
    case "golias":
      r.gigante = { rotulo: "Ancestral gigante", max: prof, curto: "nada" };
      break;
    case "orc":
      r.adrenalina = { rotulo: "Explosão de adrenalina", max: prof, curto: "tudo" };
      r.implacavel = { rotulo: "Resistência implacável", max: 1, curto: "nada" };
      break;
    case "aasimar":
      r.maosCurativas = { rotulo: `Mãos curativas (${prof}d4)`, max: 1, curto: "nada" };
      if (n >= 3) r.revelacao = { rotulo: "Revelação celestial", max: 1, curto: "nada" };
      break;
    case "anao":
      r.sentidoPedra = { rotulo: "Sentido de pedra", max: prof, curto: "nada" };
      break;
  }

  if (talentosDe(ficha).includes("sortudo")) r.sorte = { rotulo: "Pontos de sorte", max: prof, curto: "nada" };
  r.inspiracao = { rotulo: "Inspiração heroica", max: 1, curto: "nada" };
  r.dadosVida = { rotulo: `Dados de vida (d${classe.dadoVida})`, max: n, curto: "nada" };
  return r;
}

/**
 * Ajusta ficha.recursos ao nível atual: cria os novos cheios, aumenta o atual quando o máximo sobe,
 * corta quando desce e remove os que deixaram de valer. Recursos que não são do sistema ficam intocados.
 */
export function sincronizarRecursos(ficha: Ficha, criacao = false): void {
  const desejados = recursosDesejados(ficha);
  const novos: Record<string, Recurso> = {};
  for (const [id, d] of Object.entries(desejados)) {
    if (d.max <= 0) continue;
    const antigo = ficha.recursos[id];
    if (antigo) {
      const ganho = Math.max(0, d.max - antigo.max);
      novos[id] = { rotulo: d.rotulo, max: d.max, atual: Math.max(0, Math.min(d.max, antigo.atual + ganho)) };
    } else {
      // inspiração heroica nasce vazia (Humano ganha uma na criação e a cada descanso longo)
      const atual = id === "inspiracao" ? (criacao && especieDe(ficha).id === "humano" ? 1 : 0) : d.max;
      novos[id] = { rotulo: d.rotulo, max: d.max, atual };
    }
  }
  for (const [id, r] of Object.entries(ficha.recursos)) if (!GERENCIADOS.has(id)) novos[id] = r;
  ficha.recursos = novos;
}

/** Recupera recursos de descanso curto; devolve a lista do que voltou. */
export function recuperarCurto(ficha: Ficha): string[] {
  const desejados = recursosDesejados(ficha);
  const voltou: string[] = [];
  for (const [id, d] of Object.entries(desejados)) {
    const r = ficha.recursos[id];
    if (!r || d.curto === "nada" || r.atual >= r.max) continue;
    const antes = r.atual;
    r.atual = d.curto === "tudo" ? r.max : Math.min(r.max, r.atual + (d.curto === "um" ? 1 : d.curto));
    voltou.push(`${r.rotulo} +${r.atual - antes}`);
  }
  return voltou;
}

/** Recuperação Arcana do Mago: espaços somando até metade do nível (arredondado para cima), nenhum de 6º ou mais. */
export function recuperacaoArcana(ficha: Ficha): string | null {
  const uso = ficha.recursos.recuperacaoArcana;
  if (classeDe(ficha).id !== "mago" || !uso || uso.atual <= 0) return null;
  let orcamento = Math.ceil(ficha.nivel / 2);
  const recuperados: string[] = [];
  for (let c = 5; c >= 1 && orcamento > 0; c--) {
    const r = ficha.recursos[`magia${c}`];
    while (r && r.atual < r.max && c <= orcamento) {
      r.atual += 1;
      orcamento -= c;
      recuperados.push(`${c}º`);
    }
  }
  if (!recuperados.length) return null;
  uso.atual -= 1;
  return `Recuperação Arcana: espaços de ${recuperados.join(", ")} círculo`;
}

export function cdMagia(ficha: Ficha): number | null {
  const atributo = atributoMagia(ficha);
  return atributo ? 8 + proficiencia(ficha.nivel) + mod(ficha, atributo) : null;
}

/** Atributo de conjuração: o da classe, ou o do talento Iniciado em Magia vindo do antecedente. */
export function atributoMagia(ficha: Ficha): string | null {
  const classe = classeDe(ficha);
  if (classe.magia) return classe.magia;
  if (talentosDe(ficha).includes("iniciado")) return antecedenteDe(ficha)?.magia ?? "int";
  return null;
}
