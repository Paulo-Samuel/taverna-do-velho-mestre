import type { ArmaPf2 } from "./classes";

// Catálogo de armas simples e marciais comuns do Pathfinder 2e Remaster (mecânicas sob ORC License), em palavras nossas.
// Serve para: "Ataque com arco curto" usar o arco (atributo, ágil, dano), a grade Ofensiva listar uma linha por arma do
// inventário e o dano do acerto ser rolado pelo servidor. Sem dependência do servidor: dá para importar no navegador.

export type TipoDano = "cortante" | "perfurante" | "concussão";

export type ArmaCatalogo = ArmaPf2 & {
  id: string;
  /** outros nomes e grafias ("adagas", "lança curta"); o plural com "s" já casa sozinho */
  aliases?: string[];
  tipo: TipoDano;
  categoria: "simples" | "marcial";
  /** corpo a corpo que aceita DES no ataque (o melhor entre FOR e DES) */
  acuidade?: boolean;
  /** corpo a corpo que também pode ser arremessada (o dano soma FOR) */
  arremesso?: boolean;
  /** à distância que soma metade da FOR (se positiva) no dano */
  propulsivo?: boolean;
  /** dado extra no crítico */
  mortal?: string;
  /** traços em poucas palavras, para a ficha */
  tracos?: string[];
};

export const ARMAS: ArmaCatalogo[] = [
  // ---------- simples, corpo a corpo ----------
  { id: "adaga", nome: "adaga", aliases: ["punhal"], dano: "1d4", tipo: "perfurante", categoria: "simples", atributo: "des", agil: true, acuidade: true, arremesso: true, tracos: ["ágil", "acuidade", "arremesso 3 m"] },
  { id: "cajado", nome: "cajado", aliases: ["bordao", "bastao"], dano: "1d4", tipo: "concussão", categoria: "simples", atributo: "for", tracos: ["duas mãos d8"] },
  { id: "clava", nome: "clava", aliases: ["porrete"], dano: "1d6", tipo: "concussão", categoria: "simples", atributo: "for", arremesso: true, tracos: ["arremesso 3 m"] },
  { id: "foice", nome: "foice", aliases: ["foicinha"], dano: "1d4", tipo: "cortante", categoria: "simples", atributo: "des", agil: true, acuidade: true, tracos: ["ágil", "acuidade", "derrubar"] },
  { id: "lanca", nome: "lança", aliases: ["lanca curta"], dano: "1d6", tipo: "perfurante", categoria: "simples", atributo: "for", arremesso: true, tracos: ["arremesso 6 m"] },
  { id: "lanca-longa", nome: "lança longa", dano: "1d8", tipo: "perfurante", categoria: "simples", atributo: "for", tracos: ["alcance"] },
  { id: "maca", nome: "maça", dano: "1d6", tipo: "concussão", categoria: "simples", atributo: "for", tracos: ["empurrar"] },
  { id: "maca-estrela", nome: "maça-estrela", aliases: ["maca estrela", "estrela da manha"], dano: "1d6", tipo: "concussão", categoria: "simples", atributo: "for", tracos: ["versátil perfurante"] },
  { id: "manopla", nome: "manopla", aliases: ["manopla de espinhos"], dano: "1d4", tipo: "concussão", categoria: "simples", atributo: "for", agil: true, tracos: ["ágil", "livre"] },
  { id: "punhos", nome: "punhos", aliases: ["punho", "soco", "desarmado", "desarmada"], dano: "1d4", tipo: "concussão", categoria: "simples", atributo: "des", agil: true, acuidade: true, tracos: ["ágil", "acuidade", "não letal"] },
  // ---------- simples, à distância ----------
  { id: "azagaia", nome: "azagaia", aliases: ["dardo de arremesso"], dano: "1d6", tipo: "perfurante", categoria: "simples", atributo: "des", distancia: true, arremesso: true, tracos: ["arremesso 9 m"] },
  { id: "dardo", nome: "dardo", dano: "1d4", tipo: "perfurante", categoria: "simples", atributo: "des", agil: true, distancia: true, arremesso: true, tracos: ["ágil", "arremesso 6 m"] },
  { id: "besta", nome: "besta", aliases: ["besta leve"], dano: "1d8", tipo: "perfurante", categoria: "simples", atributo: "des", distancia: true, tracos: ["30 m", "recarga 1"] },
  { id: "besta-pesada", nome: "besta pesada", dano: "1d10", tipo: "perfurante", categoria: "simples", atributo: "des", distancia: true, tracos: ["36 m", "recarga 2"] },
  { id: "besta-de-mao", nome: "besta de mão", aliases: ["besta de mao", "bestinha"], dano: "1d6", tipo: "perfurante", categoria: "simples", atributo: "des", distancia: true, tracos: ["18 m", "recarga 1"] },
  { id: "funda", nome: "funda", aliases: ["estilingue"], dano: "1d6", tipo: "concussão", categoria: "simples", atributo: "des", distancia: true, propulsivo: true, tracos: ["15 m", "propulsiva", "recarga 1"] },
  // ---------- marciais, corpo a corpo ----------
  { id: "espada-longa", nome: "espada longa", dano: "1d8", tipo: "cortante", categoria: "marcial", atributo: "for", tracos: ["versátil perfurante"] },
  { id: "espada-curta", nome: "espada curta", dano: "1d6", tipo: "perfurante", categoria: "marcial", atributo: "des", agil: true, acuidade: true, tracos: ["ágil", "acuidade", "versátil cortante"] },
  { id: "rapieira", nome: "rapieira", aliases: ["florete"], dano: "1d6", tipo: "perfurante", categoria: "marcial", atributo: "des", acuidade: true, mortal: "1d8", tracos: ["acuidade", "mortal d8", "desarmar"] },
  { id: "cimitarra", nome: "cimitarra", dano: "1d6", tipo: "cortante", categoria: "marcial", atributo: "for", tracos: ["impetuosa", "versátil perfurante"] },
  { id: "kukri", nome: "kukri", dano: "1d6", tipo: "cortante", categoria: "marcial", atributo: "des", agil: true, acuidade: true, tracos: ["ágil", "acuidade", "derrubar"] },
  { id: "machado-de-batalha", nome: "machado de batalha", aliases: ["machado de guerra"], dano: "1d8", tipo: "cortante", categoria: "marcial", atributo: "for", tracos: ["varredura"] },
  { id: "machadinha", nome: "machadinha", dano: "1d6", tipo: "cortante", categoria: "marcial", atributo: "for", agil: true, arremesso: true, tracos: ["ágil", "arremesso 3 m", "varredura"] },
  { id: "machado-grande", nome: "machado grande", aliases: ["machado de duas maos"], dano: "1d12", tipo: "cortante", categoria: "marcial", atributo: "for", tracos: ["duas mãos", "varredura"] },
  { id: "montante", nome: "montante", aliases: ["espada grande", "espadao", "espada de duas maos"], dano: "1d12", tipo: "cortante", categoria: "marcial", atributo: "for", tracos: ["duas mãos", "versátil perfurante"] },
  { id: "espada-bastarda", nome: "espada bastarda", dano: "1d8", tipo: "cortante", categoria: "marcial", atributo: "for", tracos: ["duas mãos d12"] },
  { id: "falcione", nome: "falcione", aliases: ["falchion", "cutelo de guerra"], dano: "1d10", tipo: "cortante", categoria: "marcial", atributo: "for", tracos: ["duas mãos", "impetuosa"] },
  { id: "martelo-de-guerra", nome: "martelo de guerra", dano: "1d8", tipo: "concussão", categoria: "marcial", atributo: "for", tracos: ["empurrar"] },
  { id: "martelo-leve", nome: "martelo leve", dano: "1d6", tipo: "concussão", categoria: "marcial", atributo: "for", agil: true, arremesso: true, tracos: ["ágil", "arremesso 6 m"] },
  { id: "malho", nome: "malho", aliases: ["marreta", "martelo grande"], dano: "1d12", tipo: "concussão", categoria: "marcial", atributo: "for", tracos: ["duas mãos", "empurrar"] },
  { id: "mangual", nome: "mangual", dano: "1d6", tipo: "concussão", categoria: "marcial", atributo: "for", tracos: ["desarmar", "derrubar", "varredura"] },
  { id: "alabarda", nome: "alabarda", dano: "1d10", tipo: "perfurante", categoria: "marcial", atributo: "for", tracos: ["duas mãos", "alcance", "versátil cortante"] },
  { id: "glaive", nome: "glaive", aliases: ["gládio de haste"], dano: "1d8", tipo: "cortante", categoria: "marcial", atributo: "for", mortal: "1d8", tracos: ["duas mãos", "alcance", "mortal d8"] },
  { id: "tridente", nome: "tridente", dano: "1d8", tipo: "perfurante", categoria: "marcial", atributo: "for", arremesso: true, tracos: ["arremesso 6 m"] },
  { id: "picareta", nome: "picareta", aliases: ["picareta leve"], dano: "1d6", tipo: "perfurante", categoria: "marcial", atributo: "for", tracos: ["fatal d10"] },
  { id: "chicote", nome: "chicote", dano: "1d4", tipo: "cortante", categoria: "marcial", atributo: "des", acuidade: true, tracos: ["acuidade", "alcance", "desarmar", "não letal"] },
  // ---------- marciais, à distância ----------
  { id: "arco-curto", nome: "arco curto", dano: "1d6", tipo: "perfurante", categoria: "marcial", atributo: "des", distancia: true, mortal: "1d10", tracos: ["18 m", "mortal d10"] },
  { id: "arco-longo", nome: "arco longo", dano: "1d8", tipo: "perfurante", categoria: "marcial", atributo: "des", distancia: true, mortal: "1d10", tracos: ["30 m", "mortal d10", "rajada 9 m"] },
  { id: "arco-curto-composto", nome: "arco curto composto", dano: "1d6", tipo: "perfurante", categoria: "marcial", atributo: "des", distancia: true, propulsivo: true, mortal: "1d10", tracos: ["18 m", "propulsiva", "mortal d10"] },
  { id: "arco-longo-composto", nome: "arco longo composto", dano: "1d8", tipo: "perfurante", categoria: "marcial", atributo: "des", distancia: true, propulsivo: true, mortal: "1d10", tracos: ["30 m", "propulsiva", "mortal d10"] },
  { id: "pistola", nome: "pistola de pederneira", aliases: ["pistola", "pistolas de pederneira"], dano: "1d4", tipo: "perfurante", categoria: "marcial", atributo: "des", distancia: true, tracos: ["12 m", "fatal d8", "recarga 1"] },
  { id: "mosquete", nome: "mosquete", aliases: ["arcabuz"], dano: "1d8", tipo: "perfurante", categoria: "marcial", atributo: "des", distancia: true, tracos: ["45 m", "fatal d12", "recarga 1"] },
];

function normal(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Nomes de busca de cada arma, já normalizados, do mais longo ao mais curto ("arco curto composto" antes de "arco curto"). */
const NOMES: { arma: ArmaCatalogo; nome: string; re: RegExp }[] = ARMAS.flatMap((arma) =>
  [arma.nome, ...(arma.aliases ?? [])].map((n) => {
    const nome = normal(n);
    return { arma, nome, re: new RegExp(`(^|[^a-z])${escapar(nome)}s?(?=[^a-z]|$)`) };
  }),
).sort((a, b) => b.nome.length - a.nome.length);

/** Todas as armas citadas num texto, sem as que estão dentro de um nome maior ("arco curto" dentro de "arco curto composto"). */
export function armasNoTexto(texto: string): ArmaCatalogo[] {
  let resto = normal(texto);
  const achadas: ArmaCatalogo[] = [];
  for (const { arma, re } of NOMES) {
    const m = resto.match(re);
    if (!m || m.index === undefined) continue;
    if (!achadas.includes(arma)) achadas.push(arma);
    // apaga o trecho achado: um nome menor não casa de novo dentro dele
    const inicio = m.index + m[1].length;
    resto = `${resto.slice(0, inicio)}${" ".repeat(m[0].length - m[1].length)}${resto.slice(m.index + m[0].length)}`;
  }
  return achadas;
}

/** A arma citada num texto (a de nome mais longo, que é a mais específica), ou null. */
export function acharArma(texto: string): ArmaCatalogo | null {
  return armasNoTexto(texto)[0] ?? null;
}

/** Armas do inventário, na ordem em que aparecem, sem repetir. */
export function armasDoInventario(inventario: string[]): ArmaCatalogo[] {
  const out: ArmaCatalogo[] = [];
  for (const item of inventario) for (const a of armasNoTexto(item)) if (!out.includes(a)) out.push(a);
  return out;
}
