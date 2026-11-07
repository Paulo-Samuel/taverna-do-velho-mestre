// Memória do mestre: quanto da conversa vai literal no prompt e quando o resto vira resumo.
// Sem "server-only" para os testes conferirem a relação entre as constantes fora do Next.
//
// As três constantes precisam viver juntas porque dependem uma da outra:
//   JANELA_RECENTE >= LIMITE_SEM_RESUMO > MANTER_LITERAIS
// O resumo automático só roda quando as mensagens depois de `resumoAte` passam de LIMITE_SEM_RESUMO e, quando roda,
// guarda as MANTER_LITERAIS mais novas fora do resumo. Enquanto isso, a transcrição manda TODAS as mensagens depois de
// `resumoAte`: se a janela literal fosse menor que o limite, as mensagens entre a janela e o limite não estariam nem no
// resumo nem na transcrição (foi o buraco de 40 contra 50: até 10 mensagens, 2 ou 3 jogadas, sumiam antes de cada resumo).

/** Acima disto, as mensagens mais antigas saem da transcrição e vão para o resumo. */
export const LIMITE_SEM_RESUMO = 50;

/** Quantas mensagens ficam literais (fora do resumo) depois de cada ciclo de resumo. */
export const MANTER_LITERAIS = 30;

/**
 * Teto da transcrição literal no prompt do turno. Igual ao limite do resumo: nada fica no buraco entre os dois.
 * Só é ultrapassado quando o resumo atrasa (ex.: o provedor falhou); promptDoTurno avisa no console quando isso acontece.
 */
export const JANELA_RECENTE = LIMITE_SEM_RESUMO;

if (JANELA_RECENTE < LIMITE_SEM_RESUMO || LIMITE_SEM_RESUMO <= MANTER_LITERAIS) {
  throw new Error("memoria.ts: é preciso JANELA_RECENTE >= LIMITE_SEM_RESUMO > MANTER_LITERAIS");
}
