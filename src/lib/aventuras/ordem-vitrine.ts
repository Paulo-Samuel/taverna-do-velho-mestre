// Ordem da vitrine de aventuras (/aventuras): lógica pura, sem React e sem imports.
// "Nativa" de um sistema é a aventura que nasceu nele (sistemas[0]); as outras só aceitam rodar nele.

type ComSistemas = { id: string; sistemas: string[] };

/** Quantas aventuras nasceram em cada sistema (conta por sistemas[0]). */
export function contarNativas<T extends ComSistemas>(aventuras: readonly T[]): Record<string, number> {
  const conta: Record<string, number> = {};
  for (const a of aventuras) {
    const nativo = a.sistemas[0];
    if (nativo === undefined) continue;
    conta[nativo] = (conta[nativo] ?? 0) + 1;
  }
  return conta;
}

/** Com um filtro ativo: primeiro as feitas para o sistema, depois as de outro sistema que também servem. */
export function separarPorFiltro<T extends ComSistemas>(aventuras: readonly T[], filtro: string): { nativas: T[]; outras: T[] } {
  const nativas: T[] = [];
  const outras: T[] = [];
  for (const a of aventuras) {
    if (a.sistemas[0] === filtro) nativas.push(a);
    else if (a.sistemas.includes(filtro)) outras.push(a);
  }
  return { nativas, outras };
}

/** Sem filtro: um grupo por sistema nativo, na ordem dos ids recebidos; grupos vazios ficam de fora. */
export function agruparPorSistema<T extends ComSistemas>(aventuras: readonly T[], ordem: readonly string[]): { sistema: string; aventuras: T[] }[] {
  const grupos: { sistema: string; aventuras: T[] }[] = [];
  const vistos = new Set<string>();
  for (const sistema of ordem) {
    if (vistos.has(sistema)) continue;
    vistos.add(sistema);
    const doGrupo = aventuras.filter((a) => a.sistemas[0] === sistema);
    if (doGrupo.length > 0) grupos.push({ sistema, aventuras: doGrupo });
  }
  return grupos;
}
