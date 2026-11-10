// Ajudas de movimento: quem pediu menos animação ao sistema recebe rolagem seca e nada de entrada em escada.

export const CONSULTA_MENOS_MOVIMENTO = "(prefers-reduced-motion: reduce)";

/** A pessoa pediu menos movimento? (false no servidor e em navegador sem matchMedia) */
export function prefereMenosMovimento(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(CONSULTA_MENOS_MOVIMENTO).matches;
}

/** Valor de `behavior` para scrollIntoView/scrollTo. */
export function comportamentoDeRolagem(reduzido: boolean = prefereMenosMovimento()): ScrollBehavior {
  return reduzido ? "auto" : "smooth";
}

/** A mensagem chegou depois de a tela montar? (só essas merecem animação de entrada; o histórico já estava lá) */
export function ehMensagemNova(id: number, ultimoIdNaMontagem: number | null): boolean {
  return ultimoIdNaMontagem === null || id > ultimoIdNaMontagem;
}

/** animation-delay da entrada em escada: cresce com o índice até o teto, para lista comprida não demorar a aparecer. */
export function atrasoEscada(indice: number, passoMs = 30, teto = 5): string {
  return `${Math.min(Math.max(0, indice), teto) * passoMs}ms`;
}
