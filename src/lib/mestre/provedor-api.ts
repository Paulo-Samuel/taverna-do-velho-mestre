import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { OpcoesTurno, Provedor } from "./tipos";

// Mestre pela API da Anthropic (cobra créditos da ANTHROPIC_API_KEY).
// Loop manual de ferramentas com streaming: o modelo pede o teste, o app executa, o modelo narra.

const MAX_RODADAS = 10;

export type OpcoesApi = { modelo?: string; chave?: string };

export function criarProvedorApi(opcoes: OpcoesApi = {}): Provedor {
  const modelo = opcoes.modelo?.trim() || process.env.TAVERNA_MODELO_API?.trim() || "claude-sonnet-5-5";
  let cliente: Anthropic | null = null;
  const api = () => (cliente ??= new Anthropic(opcoes.chave ? { apiKey: opcoes.chave } : {}));

  /** Parâmetros comuns: sistema em cache (estável entre turnos) e fallback automático em caso de recusa. */
  const base = (sistema: string) => ({
    model: modelo,
    max_tokens: 16000,
    system: [{ type: "text" as const, text: sistema, cache_control: { type: "ephemeral" as const } }],
    // Narração de chat: esforço baixo responde rápido e basta para a maioria das cenas.
    output_config: { effort: "low" as const },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  return {
    id: "api",
    nome: `API da Anthropic (${modelo})`,

    async turno({ sistema, prompt, ferramentas, executar, emitir, sinal }: OpcoesTurno) {
      const tools: Anthropic.Beta.BetaTool[] = ferramentas.map((f) => ({
        name: f.name,
        description: f.description,
        input_schema: f.input_schema as Anthropic.Beta.BetaTool.InputSchema,
        eager_input_streaming: true,
      }));
      const mensagens: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
      let falhasJson = 0;

      for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
        const stream = api().beta.messages.stream(
          { ...base(sistema), tools, messages: mensagens } as Anthropic.Beta.MessageCreateParamsStreaming,
          { signal: sinal },
        );
        stream.on("text", (texto) => emitir({ tipo: "texto", texto }));

        let mensagem: Anthropic.Beta.BetaMessage;
        try {
          mensagem = await stream.finalMessage();
          falhasJson = 0;
        } catch (e) {
          // Com eager_input_streaming, uma entrada de ferramenta ilegível rejeita aqui; só esse caso é repetido.
          if (e instanceof Anthropic.APIError || sinal?.aborted || falhasJson++ >= 2) throw e;
          continue;
        }

        if (mensagem.stop_reason === "refusal") {
          emitir({ tipo: "texto", texto: "\n\n*(O mestre se recusou a narrar essa cena. Tente outra abordagem.)*" });
          return;
        }
        const pedidos = mensagem.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
        if (pedidos.length === 0) return;
        if (mensagem.stop_reason === "max_tokens") throw new Error("Resposta cortada no meio de uma ferramenta (max_tokens).");

        mensagens.push({ role: "assistant", content: mensagem.content as Anthropic.Beta.BetaContentBlockParam[] });

        // A validação de cada entrada acontece em executar (zod); erro vira tool_result com is_error.
        const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const pedido of pedidos) {
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
      emitir({ tipo: "texto", texto: "\n\n*(O mestre rolou dados demais neste turno e parou por aqui.)*" });
    },

    async texto({ sistema, prompt, sinal }) {
      const stream = api().beta.messages.stream(
        { ...base(sistema), messages: [{ role: "user", content: prompt }] } as Anthropic.Beta.MessageCreateParamsStreaming,
        { signal: sinal },
      );
      const mensagem = await stream.finalMessage();
      return mensagem.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
    },
  };
}
