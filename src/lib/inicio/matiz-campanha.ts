// G15: matiz dos cartões da home. As classes matiz-1..matiz-8 (globals.css) definem --matiz; sem classe nenhuma, o matiz
// é o --ambar do tema do cartão. Módulo puro.

export const MATIZES = ["matiz-1", "matiz-2", "matiz-3", "matiz-4", "matiz-5", "matiz-6", "matiz-7", "matiz-8"] as const;

/**
 * Matiz estável de uma campanha. Só o modo história ganha um: nos outros sistemas o data-tema do cartão já troca o
 * --ambar, e é ele que colore.
 */
export function matizDaCampanha(id: number, sistemaId: string): string {
  if (sistemaId !== "historia") return "";
  const n = Number.isFinite(id) ? Math.abs(Math.trunc(id)) : 0;
  return MATIZES[n % 8];
}

/** Matiz pela posição numa lista (faixa de heróis, faixa de aventuras). */
export function matizDaPosicao(i: number): string {
  const n = Number.isFinite(i) ? Math.abs(Math.trunc(i)) : 0;
  return MATIZES[n % 8];
}
