// Quando a fila de uma mesa está pronta para virar um turno do mestre.
// Sem "server-only" e sem banco: index.ts lê a mesa e chama `filaPronta`; os testes chamam direto.
import { FIM_DE_SESSAO, INICIO, RESULTADO_TESTE } from "../constantes";

export type EstadoDaFila = {
  /** ações esperando o mestre, na ordem de chegada (inclusive as internas: resultado de teste, início, fim da noite) */
  fila: { personagemId: number | null; acao: string }[];
  /** ids dos personagens da mesa */
  personagens: number[];
  /** "rodada" espera todos os personagens agirem; qualquer outro valor responde assim que puder */
  modo?: "livre" | "rodada";
  /** há teste pedido pelo mestre ainda não rolado (ou esperando a decisão de rerrolar) */
  testePendente: boolean;
  /** alguém mandou narrar com o que já chegou ("Narrar agora") */
  forcar?: boolean;
};

/**
 * No modo "livre" o mestre responde assim que estiver livre; no modo "rodada" espera todos os personagens agirem.
 * O resultado de um teste rolado pelo jogador é a exceção da rodada: o mestre pediu o teste e narra a consequência na hora,
 * sem esperar os outros agirem de novo (senão a mesa travava em silêncio: a ação interna nem aparece na fila da tela).
 * Enquanto outro teste da mesma rodada está pendente, continua esperando.
 */
export function filaPronta(e: EstadoDaFila): boolean {
  if (!e.fila.length) return false;
  // modo história: o mestre espera os jogadores rolarem os testes que ele pediu
  if (e.testePendente) return false;
  if (e.forcar || e.fila.some((a) => a.acao === INICIO || a.acao === FIM_DE_SESSAO)) return true;
  if (e.fila.some((a) => a.acao.startsWith(RESULTADO_TESTE))) return true;
  if (e.modo !== "rodada") return true;
  const agiram = new Set(e.fila.map((a) => a.personagemId));
  return e.personagens.every((id) => agiram.has(id));
}
