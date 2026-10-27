// Limites dos fatos fixados (servidor e tela usam os mesmos). Sem "server-only": a tela avisa quando passa do limite.

/** Tamanho máximo de um fato. */
export const MAX_TEXTO_FATO = 200;
/** Quantos fatos o mestre lê em todo turno. */
export const MAX_FATOS_NO_PROMPT = 25;
/** Quantos caracteres, somados, o mestre lê em todo turno. */
export const MAX_CARACTERES_NO_PROMPT = 3000;
/** Teto de fatos guardados por mesa (os que passam do limite do prompt ficam guardados, mas o mestre não lê). */
export const MAX_FATOS_GUARDADOS = 60;

/** Quantos fatos (na ordem da lista) cabem no prompt. */
export function quantosEntram(textos: string[]): number {
  let total = 0;
  for (let i = 0; i < textos.length; i++) {
    total += textos[i].length;
    if (i >= MAX_FATOS_NO_PROMPT || total > MAX_CARACTERES_NO_PROMPT) return i;
  }
  return textos.length;
}

/** Limpa o texto de um fato: espaços e quebras viram um espaço só; corta no tamanho máximo (com reticências). */
export function limparFato(texto: string): string {
  const t = texto.replace(/\s+/g, " ").trim();
  return t.length > MAX_TEXTO_FATO ? `${t.slice(0, MAX_TEXTO_FATO - 1).trimEnd()}…` : t;
}
