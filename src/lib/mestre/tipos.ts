/** Definição de ferramenta no formato JSON Schema (o mesmo da API da Anthropic e do MCP). */
export type DefFerramenta = {
  name: string;
  description: string;
  input_schema: Record<string, unknown> & { type: "object" };
};

/** O que o provedor emite durante um turno, na ordem em que acontece. */
export type EventoMestre =
  | { tipo: "texto"; texto: string }
  | { tipo: "limite"; janela: string; uso: number | null; renovaEm: number | null }
  /**
   * Fim anormal do turno (limite de rodadas, resposta cortada, recusa): index.ts grava como mensagem `sistema` marcada,
   * fora da transcrição do mestre e do resumo (nunca como narração).
   */
  | { tipo: "aviso"; texto: string }
  /** a API pediu para esperar (429) e o provedor vai repetir sozinho depois de `segundos` */
  | { tipo: "aguardando"; segundos: number }
  /** uso de tokens de uma rodada da API (para o log por turno e para calibrar o cache) */
  | { tipo: "uso"; rodada: number; maxRodadas: number; entrada: number; saida: number; cacheLido: number; cacheEscrito: number };

/** Título com que o bloco do turno chega ao modelo (Claude Code: no começo do stdin; API: no segundo bloco de sistema). */
export const TITULO_ESTADO = "## Estado da mesa agora";

/** Esforço da API (output_config.effort): low rápido e barato, medium padrão dos turnos, high caprichado. */
export type EsforcoApi = "low" | "medium" | "high";

export type OpcoesTurno = {
  /**
   * Bloco ESTÁVEL do prompt de sistema (regras gerais, regras do sistema, cabeçalho da campanha, roteiro da aventura):
   * idêntico entre turnos, vai em cache na API e no --system-prompt-file do Claude Code.
   */
  sistema: string;
  /**
   * Bloco DO TURNO (grupo, fichas, fatos fixados, resumo, diário, cena): muda a toda jogada. A API manda como segundo bloco de
   * sistema, sem cache; o Claude Code recebe no começo do stdin, sob "## Estado da mesa agora".
   */
  contexto: string;
  prompt: string;
  ferramentas: DefFerramenta[];
  /** executa uma ferramenta e devolve o resultado para o modelo (lança erro em entrada inválida) */
  executar: (nome: string, entrada: unknown) => Promise<unknown>;
  /** endereço da ponte MCP para provedores que rodam fora do processo (Claude Code) */
  ponte: { url: string; token: string };
  emitir: (e: EventoMestre) => void;
  sinal?: AbortSignal;
  /** abertura e fim de sessão: pedidos longos, com várias ferramentas (a API sobe um degrau de esforço) */
  especial?: boolean;
};

export interface Provedor {
  readonly id: string;
  readonly nome: string;
  /** Um turno de jogo com ferramentas, transmitindo eventos. */
  turno(opcoes: OpcoesTurno): Promise<void>;
  /** Uma chamada simples de texto, sem ferramentas (resumo da campanha, recapitulação). */
  texto(opcoes: { sistema: string; prompt: string; sinal?: AbortSignal }): Promise<string>;
}
