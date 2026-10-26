// Aritmética de cor para o pincel dos retratos. Sombra puxa para um roxo-escuro quente e luz para um creme de vela,
// que é o que separa um retrato pintado de um boneco de cor chapada.

type Rgb = [number, number, number];

function paraRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function paraHex([r, g, b]: Rgb): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

/** Mistura duas cores (t = 0 fica em `a`, t = 1 vira `b`). */
export function misturar(a: string, b: string, t: number): string {
  const x = paraRgb(a);
  const y = paraRgb(b);
  return paraHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

const SOMBRA = "#1b0e16";
const LUZ = "#fff3dc";

export function escurecer(cor: string, t: number): string {
  return misturar(cor, SOMBRA, t);
}

export function clarear(cor: string, t: number): string {
  return misturar(cor, LUZ, t);
}

/** Luminância aproximada (0 = breu, 1 = papel novo). */
export function luminancia(cor: string): number {
  const [r, g, b] = paraRgb(cor);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export const COR_VALIDA = /^#[0-9a-f]{6}$/i;
