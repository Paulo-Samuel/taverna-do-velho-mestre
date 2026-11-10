// Vida no rodapé do modo história: a barra fina sob o retrato e o lampejo quando o número muda. Só contas, sem React.

export type TomVida = "perdeu" | "ganhou";
export type FaixaVida = "boa" | "media" | "ruim";

/** O que aconteceu com a vida desde o último valor visto; null na primeira vez (antes = null) ou quando nada mudou. */
export function tomDaVida(antes: number | null, agora: number): TomVida | null {
  if (antes === null || antes === agora) return null;
  return agora < antes ? "perdeu" : "ganhou";
}

/** Fração da vida, de 0 a 1; máximo zerado (ou inválido) dá 0. */
function fracao(pv: number, max: number): number {
  if (!(max > 0) || !Number.isFinite(pv)) return 0;
  return Math.min(1, Math.max(0, pv / max));
}

/** Cor da barra: boa acima de 50%, média acima de 20%, senão ruim. Sem máximo (sistema sem vida), fica "boa". */
export function faixaDaVida(pv: number, max: number): FaixaVida {
  if (!(max > 0)) return "boa";
  const f = fracao(pv, max);
  return f > 0.5 ? "boa" : f > 0.2 ? "media" : "ruim";
}

/** Largura da barra em porcento, inteiro de 0 a 100; máximo zerado dá 0. */
export function porcentoDaVida(pv: number, max: number): number {
  return Math.round(fracao(pv, max) * 100);
}
