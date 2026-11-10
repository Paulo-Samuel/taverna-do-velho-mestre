const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

const PASSOS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 30],
  ["month", 12],
];

/** "agora há pouco", "há 54 minutos", "há 22 horas", "ontem", "há 5 dias"... */
export function haQuanto(quando: Date | number, agora: number = Date.now()): string {
  const instante = typeof quando === "number" ? quando : quando.getTime();
  let valor = Math.round((instante - agora) / 1000);
  for (const [unidade, tamanho] of PASSOS) {
    if (Math.abs(valor) < tamanho) return unidade === "second" ? "agora há pouco" : relativo.format(valor, unidade);
    valor = Math.round(valor / tamanho);
  }
  return relativo.format(valor, "year");
}
