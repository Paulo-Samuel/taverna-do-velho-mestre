import type { Rosto } from "./dados";

// Geometria do retrato num quadro de 200×200, eixo de simetria em x = 100.
// Quase tudo é desenhado só do lado direito e espelhado: rosto torto fica para as cicatrizes.

export const CX = 100;
export const OLHO_Y = 88;

/** Segmento cúbico: controle 1, controle 2 e ponto final. */
export type Seg = [number, number, number, number, number, number];

const f = (n: number) => Math.round(n * 10) / 10;

/**
 * Caminho simétrico: começa num ponto do eixo, desce pelo lado direito com os segmentos dados
 * e volta pelo lado esquerdo espelhado (segmentos invertidos).
 */
export function simetrico(inicio: [number, number], segs: Seg[]): string {
  const pontos: [number, number][] = [inicio, ...segs.map((s) => [s[4], s[5]] as [number, number])];
  let d = `M${f(inicio[0])} ${f(inicio[1])}`;
  for (const s of segs) d += `C${f(s[0])} ${f(s[1])} ${f(s[2])} ${f(s[3])} ${f(s[4])} ${f(s[5])}`;
  const m = (x: number) => f(2 * CX - x);
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    const ant = pontos[i];
    d += `C${m(s[2])} ${f(s[3])} ${m(s[0])} ${f(s[1])} ${m(ant[0])} ${f(ant[1])}`;
  }
  return d + "Z";
}

export type GeoRosto = {
  /** contorno do rosto */
  caminho: string;
  /** meia-largura na altura dos olhos */
  l: number;
  /** topo da cabeça e ponta do queixo */
  topo: number;
  queixo: number;
  /** meia-distância entre os olhos */
  olhos: number;
  bocaY: number;
};

const ROSTOS: Record<Rosto, { inicio: [number, number]; segs: Seg[]; l: number; queixo: number; olhos: number; bocaY: number }> = {
  oval: {
    inicio: [100, 50],
    segs: [
      [116, 50, 128, 62, 129, 82],
      [130, 100, 124, 114, 113, 122],
      [107, 127, 103, 128, 100, 128],
    ],
    l: 29,
    queixo: 128,
    olhos: 11,
    bocaY: 114,
  },
  quadrado: {
    inicio: [100, 50],
    segs: [
      [118, 50, 130, 60, 130, 80],
      [131, 100, 130, 112, 122, 120],
      [113, 127, 106, 128, 100, 128],
    ],
    l: 30,
    queixo: 128,
    olhos: 11.5,
    bocaY: 114,
  },
  fino: {
    inicio: [100, 49],
    segs: [
      [114, 49, 125, 61, 126, 82],
      [127, 102, 119, 119, 109, 127],
      [104, 131, 102, 131, 100, 131],
    ],
    l: 26,
    queixo: 131,
    olhos: 10.5,
    bocaY: 115.5,
  },
  redondo: {
    inicio: [100, 52],
    segs: [
      [119, 52, 131, 64, 131, 84],
      [131, 104, 125, 116, 114, 122],
      [108, 126, 104, 126, 100, 126],
    ],
    l: 31,
    queixo: 126,
    olhos: 11.5,
    bocaY: 113,
  },
  anguloso: {
    inicio: [100, 50],
    segs: [
      [116, 50, 127, 58, 129, 78],
      [131, 90, 126, 106, 115, 119],
      [108, 127, 103, 130, 100, 131],
    ],
    l: 29,
    queixo: 131,
    olhos: 11,
    bocaY: 115,
  },
};

export function geoRosto(rosto: Rosto): GeoRosto {
  const r = ROSTOS[rosto] ?? ROSTOS.oval;
  return { caminho: simetrico(r.inicio, r.segs), l: r.l, topo: r.inicio[1], queixo: r.queixo, olhos: r.olhos, bocaY: r.bocaY };
}

/** Transforma um desenho feito para o lado direito no lado esquerdo. */
export const ESPELHO = `matrix(-1 0 0 1 ${2 * CX} 0)`;
