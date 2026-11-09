// Contagem de missões do diário (função pura, sem banco). A regra de "encerrada" é a mesma do "Anteriormente"
// (components/historia/anteriormente.tsx): status com conclu / falh / cancel.

export const MISSAO_ENCERRADA = /conclu|falh|cancel/i;
const MISSAO_CONCLUIDA = /conclu/i;

type EntradaMinima = { tipo: string; status?: string | null };

export type ProgressoMissoes = {
  total: number;
  /** ainda não encerradas (mesma regra do "Anteriormente") */
  abertas: number;
  /** encerradas com sucesso (status "concluída"); falhas e canceladas não contam como progresso */
  concluidas: number;
};

export function missaoEmAberto(e: EntradaMinima): boolean {
  return e.tipo === "missao" && !MISSAO_ENCERRADA.test(e.status ?? "");
}

export function contarMissoes(diario: readonly EntradaMinima[]): ProgressoMissoes {
  const missoes = diario.filter((e) => e.tipo === "missao");
  const abertas = missoes.filter(missaoEmAberto).length;
  const concluidas = missoes.filter((e) => MISSAO_CONCLUIDA.test(e.status ?? "")).length;
  return { total: missoes.length, abertas, concluidas };
}
