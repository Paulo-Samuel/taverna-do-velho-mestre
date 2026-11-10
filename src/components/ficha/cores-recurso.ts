// Cor de cada tipo de recurso (barra da ficha e barra do cartão do grupo): a mesma nas duas abas e em todos os temas.
// As classes ficam por extenso porque o Tailwind só gera o que enxerga inteiro no código.

export type TipoRecurso = "vida" | "magia" | "sanidade" | "outro";

export const COR_RECURSO: Record<TipoRecurso, string> = {
  vida: "bg-musgo",
  magia: "bg-[var(--matiz-1)]",
  sanidade: "bg-[var(--matiz-5)]",
  outro: "bg-ambar",
};

/** Classe de fundo do recurso; tipo que ninguém conhece cai em "outro". */
export function corDoRecurso(tipo: string): string {
  return Object.hasOwn(COR_RECURSO, tipo) ? COR_RECURSO[tipo as TipoRecurso] : COR_RECURSO.outro;
}
