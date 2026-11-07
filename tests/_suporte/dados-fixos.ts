import { definirGerador, type GeradorInteiro } from "../../src/lib/dados";

// Rolagens previsíveis para os testes: uma lista de faces (consumida na ordem) ou um gerador com semente.

/**
 * Gerador que devolve as faces da lista, na ordem; quando a lista acaba, lança erro (o teste pediu dados demais).
 * Cada face é limitada ao intervalo pedido, então `[20, 1]` serve para d20 e `[10, 10, 1]` para d10.
 */
export function faces(lista: number[]): GeradorInteiro {
  let i = 0;
  return (min, maxExclusivo) => {
    if (i >= lista.length) throw new Error(`a lista de faces fixas acabou depois de ${lista.length} dados`);
    const v = lista[i++];
    if (v < min || v >= maxExclusivo) throw new Error(`face fixa ${v} fora do intervalo [${min}, ${maxExclusivo})`);
    return v;
  };
}

/** Gerador determinístico (LCG simples) para rolagens "aleatórias" que precisam repetir entre execuções. */
export function semente(valor: number): GeradorInteiro {
  let estado = (valor >>> 0) || 1;
  return (min, maxExclusivo) => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return min + (estado % (maxExclusivo - min));
  };
}

/** Roda `fn` com as faces fixas e devolve o gerador padrão ao fim (mesmo em erro). */
export function comFaces<T>(lista: number[], fn: () => T): T {
  definirGerador(faces(lista));
  try {
    return fn();
  } finally {
    definirGerador(null);
  }
}

/** Roda `fn` com o gerador semeado e devolve o gerador padrão ao fim. */
export function comSemente<T>(valor: number, fn: () => T): T {
  definirGerador(semente(valor));
  try {
    return fn();
  } finally {
    definirGerador(null);
  }
}
