// G17: frases da espera no modo rolagem, enquanto o mestre pensa. Módulo puro e determinístico (sem Math.random):
// a mesma semente e o mesmo passo dão sempre a mesma frase, no servidor, no navegador e nos testes (tests/frases-espera.test.ts).

export const FRASES_ESPERA = [
  "O mestre consulta o grimório de desculpas",
  "O mestre esconde os dados atrás do escudo",
  "O mestre finge que já tinha planejado isso",
  "O mestre conta os goblins nos dedos",
  "O mestre molha a garganta antes de responder",
  "O mestre folheia anotações que não existem",
  "O mestre pensa no que pode dar errado (para você)",
  "O mestre pede silêncio à caneca",
] as const;

function inteiro(n: number): number {
  const t = Math.trunc(n);
  return Number.isFinite(t) ? t : 0;
}

/** Depois de quanto tempo a espera passa a admitir que o mestre está demorando. */
export const ESPERA_DEMORADA_MS = 45_000;

/** Frases de quando a espera passa do costume (as mesmas regras das outras: curtas, começando com "O mestre"). */
export const FRASES_DEMORA = [
  "O mestre está caprichando. Ou cochilou em cima do livro",
  "O mestre reescreve a mesma frase pela terceira vez",
  "O mestre foi buscar mais vinho e já volta",
] as const;

/** A espera já passou do costume? `passo` é quantas trocas de frase houve e `intervaloMs` o tempo entre elas. */
export function esperaDemorada(passo: number, intervaloMs: number): boolean {
  const total = passo * intervaloMs;
  return Number.isFinite(total) && total >= ESPERA_DEMORADA_MS;
}

/**
 * Frase da vez: a semente escolhe por onde começa (ex.: quantas mensagens a mesa tem) e o passo avança a cada troca.
 * Com `demorada`, a frase sai de FRASES_DEMORA (mesma conta de índice).
 */
export function fraseDaEspera(semente: number, passo: number, demorada = false): string {
  const lista: readonly string[] = demorada ? FRASES_DEMORA : FRASES_ESPERA;
  const i = (Math.abs(inteiro(semente)) + Math.max(0, inteiro(passo))) % lista.length;
  return lista[i];
}
