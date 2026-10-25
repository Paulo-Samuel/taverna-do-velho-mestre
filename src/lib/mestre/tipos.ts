/** Definição de ferramenta no formato JSON Schema (o mesmo da API da Anthropic e do MCP). */
export type DefFerramenta = {
  name: string;
  description: string;
  input_schema: Record<string, unknown> & { type: "object" };
};

/** O que o provedor emite durante um turno, na ordem em que acontece. */
export type EventoMestre =
  | { tipo: "texto"; texto: string }
  | { tipo: "limite"; janela: string; uso: number | null; renovaEm: number | null };

export type OpcoesTurno = {
  sistema: string;
  prompt: string;
  ferramentas: DefFerramenta[];
  /** executa uma ferramenta e devolve o resultado para o modelo (lança erro em entrada inválida) */
  executar: (nome: string, entrada: unknown) => Promise<unknown>;
  /** endereço da ponte MCP para provedores que rodam fora do processo (Claude Code) */
  ponte: { url: string; token: string };
  emitir: (e: EventoMestre) => void;
  sinal?: AbortSignal;
};

export interface Provedor {
  readonly id: string;
  readonly nome: string;
  /** Um turno de jogo com ferramentas, transmitindo eventos. */
  turno(opcoes: OpcoesTurno): Promise<void>;
  /** Uma chamada simples de texto, sem ferramentas (resumo da campanha, recapitulação). */
  texto(opcoes: { sistema: string; prompt: string; sinal?: AbortSignal }): Promise<string>;
}
