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

/** Frase da vez: a semente escolhe por onde começa (ex.: quantas mensagens a mesa tem) e o passo avança a cada troca. */
export function fraseDaEspera(semente: number, passo: number): string {
  const i = (Math.abs(inteiro(semente)) + Math.max(0, inteiro(passo))) % FRASES_ESPERA.length;
  return FRASES_ESPERA[i];
}
