import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ErroDoMestre, esperaPedida } from "./erros-api";
import { TITULO_ESTADO, type EsforcoApi, type EventoMestre, type OpcoesTurno, type Provedor } from "./tipos";

// Mestre pela API da Anthropic (cobra créditos da ANTHROPIC_API_KEY).
// Loop manual de ferramentas com streaming: o modelo pede o teste, o app executa, o modelo narra.

/** Rodadas (pedidos ao modelo) por turno: o mesmo --max-turns do Claude Code. As duas últimas fecham sem ferramentas. */
export const MAX_RODADAS = 16;

/** Esforço padrão dos turnos (uso de ferramentas em vários passos); o resumo e o "Testar conexão" usam sempre low. */
export const ESFORCO_PADRAO: EsforcoApi = "medium";
export const ESFORCOS: EsforcoApi[] = ["low", "medium", "high"];

/** Espera máxima aceita num 429 antes de repetir a rodada (mais que isso, o erro vai para a mesa). */
const ESPERA_MAXIMA_MS = 60_000;

export const AVISO_LIMITE_RODADAS = "O mestre passou do limite de ações deste turno; o que faltou ele retoma na próxima jogada.";
export const AVISO_CORTADA = "A resposta do mestre foi cortada no meio (limite de tamanho); o que faltou ele retoma na próxima jogada.";
export const AVISO_RECUSA = "O mestre se recusou a seguir com essa cena. O que já foi registrado nas ferramentas continua valendo; tente outra abordagem.";

const LIMITE_DE_ACOES = "limite de ações do turno: esta ferramenta NÃO rodou. Feche a narração agora, sem ferramentas.";

export type OpcoesApi = { modelo?: string; chave?: string; esforco?: EsforcoApi };

/** low → medium → high (high fica em high): abertura e fim de sessão sobem um degrau. */
export function subirEsforco(e: EsforcoApi): EsforcoApi {
  return ESFORCOS[Math.min(ESFORCOS.indexOf(e) + 1, ESFORCOS.length - 1)] ?? e;
}

export const ehEsforco = (x: unknown): x is EsforcoApi => typeof x === "string" && (ESFORCOS as string[]).includes(x);

// Uma API que recusa o cabeçalho beta (400 "anthropic-beta") derrubaria todos os turnos: depois da primeira recusa, a
// taverna segue sem `betas`/`fallbacks` até reiniciar.
const gb = globalThis as unknown as { __tavernaBetaRecusada?: boolean };

const pausa = (ms: number, sinal?: AbortSignal) =>
  new Promise<void>((ok, falha) => {
    if (sinal?.aborted) return falha(new Anthropic.APIUserAbortError());
    const t = setTimeout(ok, ms);
    sinal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        falha(new Anthropic.APIUserAbortError());
      },
      { once: true },
    );
  });

export function criarProvedorApi(opcoes: OpcoesApi = {}): Provedor {
  const modelo = opcoes.modelo?.trim() || process.env.TAVERNA_MODELO_API?.trim() || "claude-sonnet-5-5";
  const chave = opcoes.chave?.trim();
  // sem chave explícita o SDK cairia num perfil do `ant auth login` (outra conta, cobrada sem ninguém saber): recusa aqui
  if (!chave) throw new ErroDoMestre("O mestre da API está sem chave: ponha ANTHROPIC_API_KEY no .env.local, reinicie a taverna e confira em Configurações.", "config");
  const esforcoTurno: EsforcoApi = ehEsforco(opcoes.esforco) ? opcoes.esforco : ESFORCO_PADRAO;
  let cliente: Anthropic | null = null;
  const api = () => (cliente ??= new Anthropic({ apiKey: chave }));

  type Sistema = Anthropic.Beta.BetaTextBlockParam[];
  /** Parâmetros comuns: sistema (o estável em cache), esforço e fallback automático em caso de recusa (beta). */
  const base = (system: Sistema, esforco: EsforcoApi) => ({
    model: modelo,
    max_tokens: 16000,
    system,
    output_config: { effort: esforco },
    ...(gb.__tavernaBetaRecusada ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }),
  });

  /**
   * Um pedido com streaming. Repete UMA vez quando a API manda esperar (429, além das 2 tentativas do SDK) e uma vez sem
   * `betas` quando o cabeçalho beta é recusado. Outros erros sobem para quem chamou (index.ts traduz).
   */
  async function pedir(
    params: Record<string, unknown>,
    sinal: AbortSignal | undefined,
    aoTexto?: (t: string) => void,
    emitir?: (e: EventoMestre) => void,
  ): Promise<Anthropic.Beta.BetaMessage> {
    let esperou = false;
    for (;;) {
      const corpo = gb.__tavernaBetaRecusada ? semBeta(params) : params;
      const stream = api().beta.messages.stream(corpo as unknown as Anthropic.Beta.MessageCreateParamsStreaming, { signal: sinal });
      if (aoTexto) stream.on("text", aoTexto);
      try {
        return await stream.finalMessage();
      } catch (e) {
        if (sinal?.aborted) throw e;
        if (!gb.__tavernaBetaRecusada && e instanceof Anthropic.BadRequestError && /anthropic-beta|fallbacks/i.test(e.message)) {
          gb.__tavernaBetaRecusada = true;
          console.warn(`[taverna] a API recusou o beta (${e.message.slice(0, 200)}); repetindo sem betas nem fallbacks.`);
          continue;
        }
        if (!esperou && e instanceof Anthropic.RateLimitError) {
          const ms = esperaPedida(e.headers) ?? 10_000;
          if (ms <= ESPERA_MAXIMA_MS) {
            esperou = true;
            console.warn(`[taverna] a API pediu para esperar ${Math.ceil(ms / 1000)} s (429); repetindo uma vez.`);
            emitir?.({ tipo: "aguardando", segundos: Math.max(1, Math.ceil(ms / 1000)) });
            await pausa(ms, sinal);
            continue;
          }
        }
        throw e;
      }
    }
  }

  return {
    id: "api",
    nome: `API da Anthropic (${modelo}, esforço ${esforcoTurno})`,

    async turno({ sistema, contexto, prompt, ferramentas, executar, emitir, sinal, especial }: OpcoesTurno) {
      const esforco = especial ? subirEsforco(esforcoTurno) : esforcoTurno;
      const tools: Anthropic.Beta.BetaTool[] = ferramentas.map((f) => ({
        name: f.name,
        description: f.description,
        input_schema: f.input_schema as Anthropic.Beta.BetaTool.InputSchema,
        eager_input_streaming: true,
      }));
      // dois blocos: o estável leva o cache_control (o prefixo ferramentas + estável se repete entre jogadas); o do turno, não
      const system: Sistema = [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }];
      if (contexto?.trim()) system.push({ type: "text", text: `${TITULO_ESTADO}\n\n${contexto}` });
      const mensagens: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
      let falhasJson = 0;
      // texto de uma rodada nova (depois das ferramentas) começa parágrafo novo, sem grudar no anterior
      let jaEscreveu = false;
      // continuação depois de max_tokens sem ferramenta: uma vez, já sem ferramentas
      let continuouCorte = false;
      let semFerramentas = false;

      for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
        // penúltima e última rodadas: tool_choice none (aceito nos modelos 5.5) para o modelo fechar a narração
        const fechando = rodada >= MAX_RODADAS - 2;
        const params = {
          ...base(system, esforco),
          tools,
          messages: mensagens,
          ...(fechando || semFerramentas ? { tool_choice: { type: "none" } } : {}),
        };
        let primeiroDaRodada = true;
        const aoTexto = (texto: string) => {
          emitir({ tipo: "texto", texto: (primeiroDaRodada && jaEscreveu ? "\n\n" : "") + texto });
          primeiroDaRodada = false;
          jaEscreveu = true;
        };

        let mensagem: Anthropic.Beta.BetaMessage;
        try {
          mensagem = await pedir(params, sinal, aoTexto, emitir);
          falhasJson = 0;
        } catch (e) {
          // Com eager_input_streaming, uma entrada de ferramenta ilegível rejeita aqui; só esse caso é repetido.
          if (e instanceof Anthropic.APIError || sinal?.aborted || falhasJson++ >= 2) throw e;
          continue;
        }
        const u = mensagem.usage;
        emitir({
          tipo: "uso",
          rodada: rodada + 1,
          maxRodadas: MAX_RODADAS,
          entrada: u?.input_tokens ?? 0,
          saida: u?.output_tokens ?? 0,
          cacheLido: u?.cache_read_input_tokens ?? 0,
          cacheEscrito: u?.cache_creation_input_tokens ?? 0,
        });

        if (mensagem.stop_reason === "refusal") {
          emitir({ tipo: "aviso", texto: AVISO_RECUSA });
          return;
        }
        const pedidos = mensagem.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");

        if (mensagem.stop_reason === "max_tokens") {
          // ferramenta cortada no meio: nada roda (a entrada está incompleta); narração cortada: uma continuação sem ferramentas
          if (!pedidos.length && !continuouCorte && rodada < MAX_RODADAS - 1) {
            continuouCorte = true;
            semFerramentas = true;
            mensagens.push({ role: "assistant", content: mensagem.content as Anthropic.Beta.BetaContentBlockParam[] });
            mensagens.push({ role: "user", content: "(Continue exatamente de onde parou, sem repetir nada e sem ferramentas.)" });
            continue;
          }
          emitir({ tipo: "aviso", texto: AVISO_CORTADA });
          return;
        }
        if (pedidos.length === 0) {
          if (fechando) emitir({ tipo: "aviso", texto: AVISO_LIMITE_RODADAS });
          return;
        }
        // última rodada: nenhuma ferramenta roda sem que o resultado dela possa voltar ao modelo
        if (rodada === MAX_RODADAS - 1) break;

        mensagens.push({ role: "assistant", content: mensagem.content as Anthropic.Beta.BetaContentBlockParam[] });
        // A validação de cada entrada acontece em executar (zod); erro vira tool_result com is_error.
        const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const pedido of pedidos) {
          if (fechando || semFerramentas) {
            // o modelo ignorou o tool_choice none: responde sem executar, para ele fechar na próxima
            resultados.push({ type: "tool_result", tool_use_id: pedido.id, is_error: true, content: LIMITE_DE_ACOES });
            continue;
          }
          try {
            const resultado = await executar(pedido.name, pedido.input);
            resultados.push({ type: "tool_result", tool_use_id: pedido.id, content: JSON.stringify(resultado) });
          } catch (e) {
            const erro = e instanceof Error ? e.message : String(e);
            resultados.push({ type: "tool_result", tool_use_id: pedido.id, is_error: true, content: erro });
          }
        }
        // Todos os resultados numa única mensagem, para o modelo continuar chamando ferramentas em paralelo.
        mensagens.push({ role: "user", content: resultados });
      }
      emitir({ tipo: "aviso", texto: AVISO_LIMITE_RODADAS });
    },

    async texto({ sistema, prompt, sinal }) {
      // resumo e teste de conexão: sempre esforço baixo
      const system: Sistema = [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }];
      const mensagem = await pedir({ ...base(system, "low"), messages: [{ role: "user", content: prompt }] }, sinal);
      return mensagem.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
    },
  };
}

function semBeta(params: Record<string, unknown>): Record<string, unknown> {
  const copia = { ...params };
  delete copia.betas;
  delete copia.fallbacks;
  return copia;
}

/** Os últimos 4 caracteres da chave, para /config mostrar qual está em uso sem expor a chave. */
export function finalDaChave(chave: string | undefined | null): string | null {
  const c = chave?.trim();
  return c && c.length >= 8 ? c.slice(-4) : null;
}

const gm = globalThis as unknown as { __tavernaModelosApi?: { chave: string; em: number; ids: string[] } };
const VALIDADE_MODELOS_MS = 10 * 60_000;

/**
 * Modelos que a chave enxerga (client.models.list), para o datalist de /config. Guardado por 10 min; null quando não deu
 * para perguntar (sem rede, chave recusada) — a página então mostra a lista fixa sem marcar nada.
 */
export async function listarModelosApi(chave: string | undefined | null): Promise<string[] | null> {
  const c = chave?.trim();
  if (!c) return null;
  const cache = gm.__tavernaModelosApi;
  if (cache && cache.chave === c && Date.now() - cache.em < VALIDADE_MODELOS_MS) return cache.ids;
  try {
    const cliente = new Anthropic({ apiKey: c, maxRetries: 0, timeout: 5_000 });
    const ids: string[] = [];
    for await (const m of cliente.models.list({ limit: 100 })) {
      ids.push(m.id);
      if (ids.length >= 200) break;
    }
    gm.__tavernaModelosApi = { chave: c, em: Date.now(), ids };
    return ids;
  } catch (e) {
    console.warn("[taverna] lista de modelos da API indisponível:", e instanceof Error ? e.message : e);
    return null;
  }
}
