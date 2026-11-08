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
//   Nd10s      parada de sucessos do Vampiro: conta as faces 6+, e cada par de 10 vale 2 a mais (5d10s)

export type TermoDados = {
  termo: string;
  sinal: 1 | -1;
  lados: number | "F";
  valores: number[];
  /** índices de `valores` que contam para o total */
  mantidos: number[];
  subtotal: number;
  /** Nd10s: o subtotal é a contagem de sucessos (6+, pares de 10 valem +2), não a soma das faces */
  sucessos?: true;
};

/** Sucessos de uma parada de d10: cada 6+ conta 1, e cada par de 10 soma mais 2 (10+10 = 4). */
export function contarSucessosD10(faces: number[]): number {
  const base = faces.filter((f) => f >= 6).length;
  const dez = faces.filter((f) => f === 10).length;
  return base + Math.floor(dez / 2) * 2;
}

export type TermoConstante = { termo: string; sinal: 1 | -1; constante: number; subtotal: number };

export type Rolagem = {
  expressao: string;
  partes: (TermoDados | TermoConstante)[];
  total: number;
};

const MAX_DADOS = 100;
const MAX_LADOS = 1000;
const MAX_EXPLOSOES = 20;

/** Sorteia um inteiro em [min, maxExclusivo), como crypto.randomInt. */
export type GeradorInteiro = (min: number, maxExclusivo: number) => number;

let gerador: GeradorInteiro = randomInt;

/**
 * Troca a fonte de aleatoriedade (só para testes e para os scripts golden: uma sequência fixa torna as rolagens previsíveis).
 * `null` volta ao crypto.randomInt. Em produção ninguém chama isto.
 */
export function definirGerador(novo: GeradorInteiro | null): void {
  gerador = novo ?? randomInt;
}

export function d(lados: number): number {
  return gerador(1, lados + 1);
}

export function dadoFate(): number {
  return gerador(-1, 2);
}

const TERMO = /([+-]?)(?:(\d*)d(\d+|%|f)((?:k[hl]?|d[hl])\d+)?(!|s)?|(\d+))/gi;

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

    if (explode === "s") {
      // parada de sucessos (Vampiro): só d10, sem manter/descartar
      if (lados !== 10 || mantemTxt) throw new Error(`"${termo}": a contagem de sucessos (s) só vale para d10 puro, como 5d10s.`);
      const valores = Array.from({ length: qtd }, () => d(10));
      const subtotal = sinal * contarSucessosD10(valores);
      partes.push({ termo, sinal, lados, valores, mantidos: valores.map((_, i) => i), subtotal, sucessos: true });
      total += subtotal;
      continue;
    }

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
    if (p.sucessos) return `${sinal}${p.termo} [${faces.join(", ")}] (${Math.abs(p.subtotal)} sucesso${Math.abs(p.subtotal) === 1 ? "" : "s"})`;
    return `${sinal}${p.termo} [${faces.join(", ")}]`;
  });
  return `${pedacos.join("")} = ${r.total}`;
}

/** Atalho para sistemas: soma de NdM. */
export function somar(qtd: number, lados: number): { valores: number[]; total: number } {
  const valores = Array.from({ length: qtd }, () => d(lados));
  return { valores, total: valores.reduce((a, b) => a + b, 0) };
}
