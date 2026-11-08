import Anthropic from "@anthropic-ai/sdk";

// Tradutor único dos erros do mestre (API da Anthropic e Claude Code) para frases em português que dizem o que fazer.
// Serve ao banner da mesa (index.ts), ao "Testar conexão" de /config e à rede de segurança do turno.
// Sem "server-only" e sem banco: os testes (tests/erros-api.test.ts) chamam direto com as classes reais do SDK.

/** O que a tela pode oferecer junto da frase: abrir Configurações ou tentar de novo (reenfileirar as ações do instantâneo). */
export type AcaoErro = "config" | "tentar";

export type ErroTraduzido = {
  mensagem: string;
  acao?: AcaoErro;
  /** quanto a API pediu para esperar (429), quando disse */
  esperarMs?: number;
  /** cancelamento pelo jogador ("interromper"): não é erro, a tela não mostra banner */
  cancelado?: boolean;
};

/** Erro que já sai em português, com a ação certa (ex.: provedor da API sem chave). */
export class ErroDoMestre extends Error {
  acao?: AcaoErro;
  constructor(mensagem: string, acao?: AcaoErro) {
    super(mensagem);
    this.name = "ErroDoMestre";
    this.acao = acao;
  }
}

/** Frase do Claude Code quando o jogador interrompe (provedor-cli e provedor-falso lançam esta). */
export const TURNO_CANCELADO = "Turno cancelado.";

const mensagemDe = (e: unknown) => (e instanceof Error ? e.message : String(e ?? ""));

/** Corpo de erro da API (`{"type":"error","error":{"type":..., "message":...}}`) em texto, para procurar pistas. */
function textoDoCorpo(e: InstanceType<typeof Anthropic.APIError>): string {
  const corpo = e.error as { error?: { message?: unknown; type?: unknown }; message?: unknown } | undefined;
  return [corpo?.error?.message, corpo?.error?.type, corpo?.message, e.message].filter((x) => typeof x === "string").join(" ");
}

/** Segundos do cabeçalho retry-after (número ou data HTTP), em ms. */
export function esperaPedida(headers: Headers | undefined | null): number | undefined {
  const bruto = headers?.get?.("retry-after-ms") ?? null;
  if (bruto && Number.isFinite(Number(bruto))) return Math.max(0, Math.round(Number(bruto)));
  const ra = headers?.get?.("retry-after") ?? null;
  if (!ra) return undefined;
  const s = Number(ra);
  if (Number.isFinite(s)) return Math.max(0, Math.round(s * 1000));
  const data = Date.parse(ra);
  return Number.isFinite(data) ? Math.max(0, data - Date.now()) : undefined;
}

/** O modelo citado num 404 ("model: claude-sonet-5-5"), quando der para achar. */
function modeloDo404(texto: string): string | null {
  return texto.match(/model:\s*([\w.\-[\]]+)/i)?.[1] ?? null;
}

/** Interromper (APIUserAbortError, AbortError, "Turno cancelado." do CLI e do mestre de teste) não é erro. */
export function ehCancelamento(e: unknown, sinal?: AbortSignal | null): boolean {
  if (sinal?.aborted) return true;
  if (e instanceof Anthropic.APIUserAbortError) return true;
  if (e instanceof Error && (e.name === "AbortError" || e.message === TURNO_CANCELADO)) return true;
  return false;
}

/** "HH:MM" de um instante em segundos (Claude Code manda resetsAt em segundos) ou ms. */
function horaDe(renovaEm: number): string {
  const ms = renovaEm < 1e12 ? renovaEm * 1000 : renovaEm;
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Erros conhecidos do Claude Code (texto que ele devolve no resultado ou no stderr). Devolve null quando não reconhece:
 * aí vale a mensagem como veio (já em português nos casos montados por provedor-cli/claude-bin).
 */
export function traduzirErroCli(texto: string, ctx: { renovaEm?: number | null; tempoMaximoMs?: number; estourouTempo?: boolean } = {}): ErroTraduzido | null {
  if (ctx.estourouTempo) {
    const min = Math.round((ctx.tempoMaximoMs ?? 5 * 60_000) / 60_000);
    return { mensagem: `O mestre demorou demais (limite de ${min} min) e o turno foi encerrado. Tente de novo.`, acao: "tentar" };
  }
  if (texto === TURNO_CANCELADO) return { mensagem: TURNO_CANCELADO, cancelado: true };
  if (/hit your (usage )?limit|usage limit|rate.?limit|limit reached|limit will reset|out of (extra )?usage/i.test(texto)) {
    const quando = ctx.renovaEm ? `; renova às ${horaDe(ctx.renovaEm)}` : "";
    return { mensagem: `O plano do Claude Code bateu no limite${quando}. Dá para tentar de novo depois disso.`, acao: "tentar" };
  }
  if (/not logged in|please (run )?\/?login|log ?in again|invalid api key|authentication|unauthori[sz]ed|oauth token (has )?expired|credentials/i.test(texto)) {
    return { mensagem: "O Claude Code não está logado nesta máquina: rode `claude` num terminal, faça login e confira em Configurações.", acao: "config" };
  }
  if (/overloaded|529|internal server error|api error: 5\d\d/i.test(texto)) {
    return { mensagem: "O serviço do Claude está sobrecarregado agora; tente de novo em instantes.", acao: "tentar" };
  }
  return null;
}

/**
 * Traduz qualquer erro do mestre: das classes do SDK (do mais específico ao genérico) ao texto do Claude Code.
 * `cancelado: true` quando foi o jogador que interrompeu (a tela não mostra nada).
 */
export function traduzirErro(e: unknown, ctx: { sinal?: AbortSignal | null; modelo?: string; renovaEm?: number | null } = {}): ErroTraduzido {
  if (ehCancelamento(e, ctx.sinal)) return { mensagem: TURNO_CANCELADO, cancelado: true };
  if (e instanceof ErroDoMestre) return { mensagem: e.message, acao: e.acao };

  if (e instanceof Anthropic.AuthenticationError) {
    return { mensagem: "A chave de API não foi aceita. Confira ANTHROPIC_API_KEY no .env.local e reinicie a taverna.", acao: "config" };
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return { mensagem: "A chave de API não tem permissão para isso (modelo ou recurso fora da conta). Confira em Configurações.", acao: "config" };
  }
  if (e instanceof Anthropic.NotFoundError) {
    const modelo = modeloDo404(textoDoCorpo(e)) ?? ctx.modelo;
    return { mensagem: `O modelo ${modelo ? `'${modelo}' ` : ""}não existe na API: corrija em Configurações.`, acao: "config" };
  }
  if (e instanceof Anthropic.RateLimitError) {
    const esperarMs = esperaPedida(e.headers);
    const s = esperarMs !== undefined ? Math.max(1, Math.ceil(esperarMs / 1000)) : null;
    return { mensagem: `A API pediu para esperar${s ? ` ${s} s` : " um pouco"} antes do próximo pedido (limite de uso da conta).`, acao: "tentar", esperarMs };
  }
  if (e instanceof Anthropic.BadRequestError) {
    const texto = textoDoCorpo(e);
    if (/credit balance/i.test(texto)) return { mensagem: "A conta da API está sem créditos. Recarregue no console da Anthropic (Plans & Billing) e tente de novo.", acao: "config" };
    if (/anthropic-beta/i.test(texto)) return { mensagem: "A API recusou um recurso beta que a taverna pede. Atualize a taverna; se continuar, avise quem instalou.", acao: "config" };
    if (/prompt is too long|too many tokens|context/i.test(texto)) return { mensagem: "O pedido ficou grande demais para o modelo (memória da campanha). Tente de novo depois do próximo resumo.", acao: "tentar" };
    return { mensagem: `A API recusou o pedido: ${texto.slice(0, 200)}`, acao: "tentar" };
  }
  if (e instanceof Anthropic.InternalServerError) {
    return { mensagem: "A API está sobrecarregada; tente de novo em instantes.", acao: "tentar" };
  }
  // APIConnectionTimeoutError estende APIConnectionError
  if (e instanceof Anthropic.APIConnectionTimeoutError) return { mensagem: "A API demorou demais para responder; tente de novo.", acao: "tentar" };
  if (e instanceof Anthropic.APIConnectionError) return { mensagem: "Sem conexão com a API. Confira a internet desta máquina e tente de novo.", acao: "tentar" };
  if (e instanceof Anthropic.APIError) return { mensagem: `A API respondeu com erro${e.status ? ` ${e.status}` : ""}. Tente de novo em instantes.`, acao: "tentar" };

  const texto = mensagemDe(e);
  // o SDK sem credencial nenhuma (não deveria acontecer: a taverna passa a chave explícita)
  if (/Could not resolve authentication method/i.test(texto)) {
    return { mensagem: "O mestre da API está sem chave: ponha ANTHROPIC_API_KEY no .env.local e reinicie a taverna.", acao: "config" };
  }
  const cli = traduzirErroCli(texto.replace(/^O Claude Code respondeu com erro:\s*/, ""), { renovaEm: ctx.renovaEm });
  if (cli) return cli;
  return { mensagem: texto || "O mestre falhou sem dizer por quê." };
}
