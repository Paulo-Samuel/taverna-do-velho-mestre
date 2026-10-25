// Notação de dados do lado do cliente, só para validar e montar expressões enquanto o jogador digita.
// Espelha o TERMO de src/lib/dados.ts (que é server-only); quem rola de verdade é sempre o servidor.

const TERMO = /([+-]?)(?:(\d*)d(\d+|%|f)((?:k[hl]?|d[hl])\d+)?(!)?|(\d+))/gi;

export type Lados = 4 | 6 | 8 | 10 | 12 | 20 | 100 | "F";

export const DADOS_RAPIDOS: Lados[] = [4, 6, 8, 10, 12, 20, 100, "F"];

export const EXEMPLOS: { expressao: string; ajuda: string }[] = [
  { expressao: "1d20+5", ajuda: "um d20 com +5" },
  { expressao: "2d20kh1", ajuda: "vantagem: fica o maior" },
  { expressao: "2d20kl1", ajuda: "desvantagem: fica o menor" },
  { expressao: "4d6kh3", ajuda: "atributo à moda antiga" },
  { expressao: "2d6+1", ajuda: "PbtA: 10+, 7–9, 6−" },
  { expressao: "4dF+2", ajuda: "Fate: quatro dados de destino" },
  { expressao: "d%", ajuda: "percentual (d100)" },
  { expressao: "1d6!", ajuda: "explode no 6" },
  { expressao: "1d8+1d6+3", ajuda: "vários termos" },
];

/** Devolve null se a expressão é válida; senão, o motivo em português. */
export function validarExpressao(expressao: string): string | null {
  const limpa = expressao.replace(/\s+/g, "");
  if (!limpa) return "Escreva alguma coisa, ex.: 1d20+5.";
  const casados = [...limpa.matchAll(TERMO)];
  const reconstruida = casados.map((m) => m[0]).join("");
  if (reconstruida.length !== limpa.length || !/^[+-]?[\dd]/i.test(limpa)) return "Notação estranha. Exemplos: 1d20+5, 2d6, 4d6kh3, 4dF, d%.";
  let totalDados = 0;
  for (const m of casados) {
    if (m[6] !== undefined) continue;
    const qtd = m[2] ? Number(m[2]) : 1;
    totalDados += qtd;
    const lados = m[3].toLowerCase();
    if (qtd < 1) return "Zero dados não rola nada.";
    if (lados !== "f" && lados !== "%" && (Number(lados) < 2 || Number(lados) > 1000)) return `d${lados} não existe nesta taverna.`;
  }
  if (totalDados > 100) return "Mais de 100 dados de uma vez? Até a taverna tem limites.";
  return null;
}

function sinal(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `${n}` : "";
}

/** Monta a expressão dos controles rápidos (quantidade, dado, modificador, vantagem). */
export function montarExpressao(qtd: number, lados: Lados, mod: number, modo: "normal" | "vantagem" | "desvantagem"): string {
  const face = lados === "F" ? "dF" : lados === 100 ? "d%" : `d${lados}`;
  // vantagem/desvantagem só fazem sentido num d20 sozinho
  if (lados === 20 && qtd === 1 && modo !== "normal") return `2d20${modo === "vantagem" ? "kh1" : "kl1"}${sinal(mod)}`;
  return `${qtd}${face}${sinal(mod)}`;
}

/** Soma só as constantes da expressão ("1d20+5-1" → 4), para fechar o total de dados físicos. */
export function somaConstantes(expressao: string): number {
  let soma = 0;
  for (const m of expressao.replace(/\s+/g, "").matchAll(TERMO)) if (m[6] !== undefined) soma += (m[1] === "-" ? -1 : 1) * Number(m[6]);
  return soma;
}

/** Lê "3, 5 6" ou "+ - 0" (Fate) como lista de faces. */
export function lerFaces(texto: string): number[] | null {
  const pedacos = texto
    .replace(/[−–]/g, "-")
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (!pedacos.length) return [];
  const valores: number[] = [];
  for (const p of pedacos) {
    if (p === "+") valores.push(1);
    else if (p === "-") valores.push(-1);
    else if (p === "0" || p === "_") valores.push(0);
    else if (/^\d+$/.test(p)) valores.push(Number(p));
    else return null;
  }
  return valores.length > 100 ? null : valores;
}
