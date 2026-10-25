// Pequenos ajudantes de texto do formulário e da ficha (o normalizar de sistemas/comum.ts é só do servidor).

/** Minúsculas e sem acento, para a busca não exigir "Clérigo" com acento. */
export function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Todas as palavras da busca aparecem em algum dos textos? Busca vazia casa com tudo. */
export function casaBusca(busca: string, ...textos: (string | undefined | null)[]): boolean {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean);
  if (!termos.length) return true;
  const alvo = semAcento(textos.filter(Boolean).join(" "));
  return termos.every((t) => alvo.includes(t));
}

export function capitalizar(texto: string): string {
  return texto ? texto[0].toUpperCase() + texto.slice(1) : texto;
}

/** +2 / −1 com o sinal tipográfico de menos. */
export function sinal(n: number): string {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/** Agrupa mantendo a ordem em que cada grupo aparece pela primeira vez. */
export function agrupar<T>(itens: T[], chave: (item: T) => string): [string, T[]][] {
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    const k = chave(item);
    grupos.set(k, [...(grupos.get(k) ?? []), item]);
  }
  return [...grupos.entries()];
}
