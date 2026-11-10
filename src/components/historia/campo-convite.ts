// Lógica pura do campo "o que você faz?" do rodapé da mesa (painel-acao.tsx): o limite do texto e o contador que só
// aparece quando o pergaminho está acabando. Sem React, para o teste carregar sozinho.

/** tamanho máximo de uma ação (o mesmo do maxLength do campo) */
export const LIMITE_ACAO = 2000;

/** até aqui o contador fica escondido; passou, ele aparece */
export const AVISAR_A_PARTIR = 1800;

/** quantos caracteres ainda cabem; null enquanto o texto está longe do limite (nada a mostrar) */
export function faltam(texto: string): number | null {
  if (texto.length <= AVISAR_A_PARTIR) return null;
  return Math.max(0, LIMITE_ACAO - texto.length);
}

/** o que o contador diz */
export function rotuloFaltam(n: number): string {
  if (n <= 0) return "acabou o pergaminho";
  if (n === 1) return "falta 1";
  return `faltam ${n}`;
}
