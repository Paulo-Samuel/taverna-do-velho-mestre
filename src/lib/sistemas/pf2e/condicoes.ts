import type { CondicaoDef } from "../tipos";

// Condições do Pathfinder 2e Remaster (ORC License), com os nomes que a mesa usa e os sinônimos que o mestre e o jogador
// escrevem ("medo 2", "Amedrontado II", "assustada"). Sem dependência do servidor: o seletor do ajuste da ficha usa a mesma
// lista e a mesma leitura. Efeitos em palavras nossas.

export type CondicaoPf2 = CondicaoDef & {
  /** perde 1 no fim do turno de quem tem, e some em 0 */
  decaiNoFimDoTurno?: boolean;
};

export const CONDICOES_PF2E: CondicaoPf2[] = [
  { id: "amedrontado", nome: "amedrontado", sinonimos: ["assustado", "medo", "apavorado", "frightened"], temValor: true, max: 4, decaiNoFimDoTurno: true, efeito: "−N em testes e CDs; cai 1 no fim do seu turno" },
  { id: "enjoado", nome: "enjoado", sinonimos: ["nauseado", "sickened"], temValor: true, max: 4, efeito: "−N em testes e CDs; gaste 1 ação para tentar vomitar e baixar" },
  { id: "desajeitado", nome: "desajeitado", sinonimos: ["clumsy"], temValor: true, max: 4, efeito: "−N em testes e CDs de DES (CA e Reflexos)" },
  { id: "enfraquecido", nome: "enfraquecido", sinonimos: ["debilitado", "enfeebled"], temValor: true, max: 4, efeito: "−N em testes e CDs de FOR (ataques corpo a corpo)" },
  { id: "drenado", nome: "drenado", sinonimos: ["drained"], temValor: true, max: 4, efeito: "−N em testes de CON; perde N × nível de PV máximos" },
  { id: "estupefato", nome: "estupefato", sinonimos: ["atordoado mentalmente", "stupefied"], temValor: true, max: 4, efeito: "−N em testes e CDs de INT, SAB e CAR; magias podem falhar" },
  { id: "lento", nome: "lento", sinonimos: ["lentidao", "slowed"], temValor: true, max: 3, efeito: "N ações a menos por turno" },
  { id: "atordoado", nome: "atordoado", sinonimos: ["stunned"], temValor: true, max: 4, efeito: "perde N ações (no total) e não reage" },
  { id: "desprevenido", nome: "desprevenido", sinonimos: ["flanqueado", "pego desprevenido", "off-guard", "flat-footed"], efeito: "−2 na CA" },
  { id: "caido", nome: "caído", sinonimos: ["derrubado", "no chao", "prone"], efeito: "desprevenido; −2 nos ataques; levantar custa 1 ação" },
  { id: "agarrado", nome: "agarrado", sinonimos: ["grabbed"], efeito: "imobilizado e desprevenido" },
  { id: "contido", nome: "contido", sinonimos: ["preso", "restrained"], efeito: "desprevenido; só ataca quem o prende" },
  { id: "imobilizado", nome: "imobilizado", sinonimos: ["immobilized"], efeito: "não sai do lugar" },
  { id: "fatigado", nome: "fatigado", sinonimos: ["cansado", "exausto", "fatigued"], efeito: "−1 na CA e salvamentos; some no descanso longo" },
  { id: "cego", nome: "cego", sinonimos: ["blinded"], efeito: "tudo está escondido para você; −4 em Percepção" },
  { id: "ofuscado", nome: "ofuscado", sinonimos: ["dazzled"], efeito: "tudo está oculto (teste simples 5 para acertar)" },
  { id: "surdo", nome: "surdo", sinonimos: ["deafened"], efeito: "−2 em iniciativa e no que depende da audição" },
  { id: "fascinado", nome: "fascinado", sinonimos: ["fascinated"], efeito: "−2 em Percepção e perícias; só presta atenção na fonte" },
  { id: "confuso", nome: "confuso", sinonimos: ["confused"], efeito: "age ao acaso; desprevenido" },
  { id: "em-fuga", nome: "em fuga", sinonimos: ["fugindo", "fleeing"], efeito: "gasta as ações para se afastar" },
  { id: "paralisado", nome: "paralisado", sinonimos: ["paralyzed"], efeito: "desprevenido; não age" },
  { id: "invisivel", nome: "invisível", sinonimos: ["invisible"], efeito: "não é visto; os outros estão desprevenidos contra você" },
  { id: "oculto", nome: "oculto", sinonimos: ["concealed"], efeito: "quem ataca faz teste simples 5" },
  { id: "inconsciente", nome: "inconsciente", sinonimos: ["desacordado", "unconscious"], efeito: "−4 na CA, Percepção e Reflexos; desprevenido" },
  { id: "moribundo", nome: "moribundo", sinonimos: ["morrendo", "dying"], temValor: true, max: 4, efeito: "teste de Recuperação no início do turno; 4 é a morte" },
  { id: "ferido", nome: "ferido", sinonimos: ["wounded"], temValor: true, efeito: "soma ao moribundo quando cair de novo" },
  { id: "condenado", nome: "condenado", sinonimos: ["doomed"], temValor: true, max: 3, efeito: "morre com moribundo 4 − N; cai 1 no descanso longo" },
];

export function normalizarCondicao(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-–_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ROMANOS: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };

/**
 * Separa nome e valor, deixando de fora a anotação (parênteses, vírgula, o que vem depois do número):
 * "Amedrontado II" → ["amedrontado", 2]; "medo 2" → ["medo", 2]; "amedrontado 2 (até o fim da cena)" → ["amedrontado", 2];
 * "desprevenido (flanqueado)" → ["desprevenido", null]; "caído" → ["caido", null].
 */
function separar(texto: string): [string, number | null] {
  const n = normalizarCondicao(texto);
  const numero = n.match(/^([a-z][a-z ]*?)\s*[:(]?\s*(\d+)(?!\d)/);
  if (numero) return [numero[1].trim(), Number(numero[2])];
  const romano = n.match(/^([a-z][a-z ]*?)\s*[:(]?\s*\b(iv|v|i{1,3})\b(?![a-z])/);
  if (romano) return [romano[1].trim(), ROMANOS[romano[2]]];
  return [n.split(/[(,;:.]/)[0].trim(), null];
}

/** Palavras que parecem uma condição pela raiz mas querem dizer outra coisa ("presa" não é "preso"). */
const NAO_E_CONDICAO = new Set(["presa", "presas"]);

/**
 * "assustada" casa com "assustado": a palavra sem a vogal final mais a terminação de gênero e plural (o, a, os, as), ou o nome
 * com plural. Nada além disso: "ocultar" não é "oculto".
 */
function casa(base: string, nome: string): boolean {
  if (base === nome) return true;
  if (NAO_E_CONDICAO.has(base)) return false;
  if (base === `${nome}s` || base === `${nome}es`) return true;
  if (nome.length < 4 || !/[oa]s?$/.test(nome)) return false;
  const raiz = nome.replace(/[oa]s?$/, "");
  return ["o", "a", "os", "as"].some((fim) => base === raiz + fim);
}

function acharDef<T extends CondicaoDef>(base: string, lista: T[]): T | null {
  for (const def of lista) {
    const nomes = [def.nome, ...(def.sinonimos ?? [])].map(normalizarCondicao);
    if (nomes.some((nome) => casa(base, nome))) return def;
  }
  return null;
}

/**
 * Lê uma condição escrita de qualquer jeito contra uma lista fechada; null quando não é dela. Texto com palavras a mais depois
 * do nome ("flanqueado pelos lobos", "enjoado até a rodada 3") vale pelo começo: as palavras iniciais que casarem; nesse caso
 * o número que vier no fim não é o valor da condição.
 */
export function lerCondicao<T extends CondicaoDef>(texto: string, lista: T[]): { def: T; valor: number | null } | null {
  const [base, valor] = separar(texto);
  if (!base) return null;
  const inteira = acharDef(base, lista);
  if (inteira) return { def: inteira, valor: inteira.temValor ? (valor ?? 1) : null };
  const palavras = base.split(" ");
  for (let i = palavras.length - 1; i >= 1; i--) {
    const def = acharDef(palavras.slice(0, i).join(" "), lista);
    if (def) return { def, valor: def.temValor ? 1 : null };
  }
  return null;
}

/** Anotação entre parênteses que acompanha a condição ("amedrontado 2 (até o fim da cena)" → "(até o fim da cena)"). */
function anotacao(texto: string): string {
  const i = texto.indexOf("(");
  if (i < 0) return "";
  const resto = texto.slice(i).trim();
  // "(2)" é o valor, não anotação
  return /^\(\s*[\divxIVX]+\s*\)$/.test(resto) ? "" : resto;
}

/** Texto canônico de uma condição com valor: "amedrontado 2". */
export function textoCondicao(def: CondicaoDef, valor: number | null): string {
  return def.temValor && valor !== null ? `${def.nome} ${valor}` : def.nome;
}

/** Valor da condição `id` numa lista de condições escritas à mão (0 quando ausente; 1 quando sem número). */
export function valorDaCondicao(condicoes: string[], id: string, lista: CondicaoDef[] = CONDICOES_PF2E): number {
  let maior = 0;
  for (const c of condicoes) {
    const lida = lerCondicao(c, lista);
    if (lida?.def.id === id) maior = Math.max(maior, lida.valor ?? 1);
  }
  return maior;
}

/** Tem a condição `id` (com qualquer grafia)? */
export function temCondicao(condicoes: string[], id: string, lista: CondicaoDef[] = CONDICOES_PF2E): boolean {
  return condicoes.some((c) => lerCondicao(c, lista)?.def.id === id);
}

/** Tira as condições `ids` (com qualquer grafia). */
export function semCondicoes(condicoes: string[], ids: string[], lista: CondicaoDef[] = CONDICOES_PF2E): string[] {
  return condicoes.filter((c) => {
    const id = lerCondicao(c, lista)?.def.id;
    return !id || !ids.includes(id);
  });
}

/** Fim do turno de quem tem as condições: as que decaem perdem 1 e somem em 0. */
export function condicoesNoFimDoTurno(condicoes: string[]): { condicoes: string[]; mudancas: string[] } {
  const mudancas: string[] = [];
  const novas: string[] = [];
  for (const c of condicoes) {
    const lida = lerCondicao(c, CONDICOES_PF2E);
    if (!lida || !lida.def.decaiNoFimDoTurno) {
      novas.push(c);
      continue;
    }
    const valor = (lida.valor ?? 1) - 1;
    const antes = textoCondicao(lida.def, lida.valor ?? 1);
    if (valor > 0) {
      const nota = anotacao(c);
      novas.push(nota ? `${textoCondicao(lida.def, valor)} ${nota}` : textoCondicao(lida.def, valor));
      mudancas.push(`${antes} → ${valor}`);
    } else mudancas.push(`${antes} → passou`);
  }
  return { condicoes: novas, mudancas };
}
