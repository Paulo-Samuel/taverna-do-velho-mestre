import "server-only";
import { randomInt } from "node:crypto";

// Motor de dados compartilhado por todos os sistemas e pelo rolador dos jogadores.
// Toda aleatoriedade vem de crypto.randomInt: o modelo decide QUANDO rolar, o código decide o NÚMERO.
//
// Notação aceita (sem espaços, maiúsculas ou minúsculas):
//   NdM        2d6, d20 (N omitido = 1)
//   d%         d100
//   NdF        dados Fate (-1, 0, +1)
//   khX / klX  mantém os X maiores / menores   (2d20kh1 = vantagem, 4d6kh3)
//   dhX / dlX  descarta os X maiores / menores (4d6dl1)
//   !          explode no valor máximo (1d6!)
//   +K / -K    constantes e outros termos      (1d8+1d6+3)

export type TermoDados = {
  termo: string;
  sinal: 1 | -1;
  lados: number | "F";
  valores: number[];
  /** índices de `valores` que contam para o total */
  mantidos: number[];
  subtotal: number;
};

export type TermoConstante = { termo: string; sinal: 1 | -1; constante: number; subtotal: number };

export type Rolagem = {
  expressao: string;
  partes: (TermoDados | TermoConstante)[];
  total: number;
};

const MAX_DADOS = 100;
const MAX_LADOS = 1000;
const MAX_EXPLOSOES = 20;

export function d(lados: number): number {
  return randomInt(1, lados + 1);
}

export function dadoFate(): number {
  return randomInt(-1, 2);
}

const TERMO = /([+-]?)(?:(\d*)d(\d+|%|f)((?:k[hl]?|d[hl])\d+)?(!)?|(\d+))/gi;

export function expressaoValida(expressao: string): boolean {
  const limpa = expressao.replace(/\s+/g, "");
  if (!limpa) return false;
  const reconstruida = [...limpa.matchAll(TERMO)].map((m) => m[0]).join("");
  return reconstruida.length === limpa.length && /^[+-]?[\dd]/i.test(limpa);
}

export function rolar(expressao: string): Rolagem {
  const limpa = expressao.replace(/\s+/g, "").toLowerCase();
  if (!expressaoValida(limpa)) {
    throw new Error(`Expressão de dados inválida: "${expressao}". Exemplos: 1d20+5, 2d6, 4d6kh3, 4dF, d%.`);
  }

  const partes: (TermoDados | TermoConstante)[] = [];
  let total = 0;
  let totalDados = 0;

  for (const m of limpa.matchAll(TERMO)) {
    const [bruto, sinalTxt, qtdTxt, ladosTxt, mantemTxt, explode, constanteTxt] = m;
    const sinal: 1 | -1 = sinalTxt === "-" ? -1 : 1;
    const termo = bruto.replace(/^[+-]/, "");

    if (constanteTxt !== undefined) {
      const constante = Number(constanteTxt);
      partes.push({ termo, sinal, constante, subtotal: sinal * constante });
      total += sinal * constante;
      continue;
    }

    const qtd = qtdTxt ? Number(qtdTxt) : 1;
    totalDados += qtd;
    if (qtd < 1 || totalDados > MAX_DADOS) throw new Error("Dados demais numa rolagem só. Até a taverna tem limites.");

    const fate = ladosTxt === "f";
    const lados = fate ? ("F" as const) : ladosTxt === "%" ? 100 : Number(ladosTxt);
    if (typeof lados === "number" && (lados < 2 || lados > MAX_LADOS)) throw new Error(`Dado d${lados} não existe nesta taverna.`);

    const valores: number[] = [];
    for (let i = 0; i < qtd; i++) {
      if (lados === "F") {
        valores.push(dadoFate());
        continue;
      }
      let v = d(lados);
      valores.push(v);
      // dado explosivo: cada máximo rola de novo e soma como um dado extra
      let explosoes = 0;
      while (explode && v === lados && explosoes++ < MAX_EXPLOSOES) {
        v = d(lados);
        valores.push(v);
      }
    }

    let mantidos = valores.map((_, i) => i);
    if (mantemTxt) {
      const [, modo, nTxt] = mantemTxt.match(/^(k[hl]?|d[hl])(\d+)$/)!;
      const n = Math.min(Number(nTxt), valores.length);
      const ordenados = valores.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
      const escolhidos =
        modo === "kh" || modo === "k"
          ? ordenados.slice(-n)
          : modo === "kl"
            ? ordenados.slice(0, n)
            : modo === "dh"
              ? ordenados.slice(0, ordenados.length - n)
              : ordenados.slice(n); // dl
      mantidos = escolhidos.map((x) => x.i).sort((a, b) => a - b);
    }

    const subtotal = sinal * mantidos.reduce((s, i) => s + valores[i], 0);
    partes.push({ termo, sinal, lados, valores, mantidos, subtotal });
    total += subtotal;
  }

  return { expressao: limpa, partes, total };
}

/** Texto curto como "4d6kh3 [6, 5, 3, ~1] + 2 = 16". */
export function descreverRolagem(r: Rolagem): string {
  const pedacos = r.partes.map((p, i) => {
    const sinal = i === 0 ? (p.sinal < 0 ? "-" : "") : p.sinal < 0 ? " - " : " + ";
    if ("constante" in p) return `${sinal}${p.constante}`;
    const faces = p.valores.map((v, j) => {
      const face = p.lados === "F" ? (v > 0 ? "+" : v < 0 ? "−" : "0") : String(v);
      return p.mantidos.includes(j) ? face : `~${face}`;
    });
    return `${sinal}${p.termo} [${faces.join(", ")}]`;
  });
  return `${pedacos.join("")} = ${r.total}`;
}

/** Atalho para sistemas: soma de NdM. */
export function somar(qtd: number, lados: number): { valores: number[]; total: number } {
  const valores = Array.from({ length: qtd }, () => d(lados));
  return { valores, total: valores.reduce((a, b) => a + b, 0) };
}
