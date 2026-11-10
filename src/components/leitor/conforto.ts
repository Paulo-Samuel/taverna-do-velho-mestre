// Conforto de leitura (puro, sem React): largura da coluna e entrelinha da narração, escolhidas no menu de leitura.
// Cada preferência guarda só o passo (índice da lista); o padrão é o do meio, igual ao que a taverna sempre usou.

/** Larguras da coluna de leitura: multiplicam a medida de ~65 caracteres (--leitor-coluna). */
export const COLUNAS = [
  { rotulo: "Estreita", fator: 0.86 },
  { rotulo: "Média", fator: 1 },
  { rotulo: "Larga", fator: 1.16 },
] as const;

/** Entrelinhas da narração (--leitor-entrelinha); null = o valor de sempre da folha de estilo. */
export const ENTRELINHAS = [
  { rotulo: "Justa", valor: 1.6 },
  { rotulo: "Confortável", valor: null },
  { rotulo: "Folgada", valor: 1.92 },
] as const;

export const PASSO_PADRAO = 1;

/** Passo guardado no navegador: inteiro entre 0 e total-1; qualquer outra coisa volta ao padrão. */
export function passoValido(v: unknown, total: number): number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < total ? v : PASSO_PADRAO;
}
