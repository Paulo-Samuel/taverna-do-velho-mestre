import { obterCampanha } from "@/lib/db";
import { estadoMesa } from "@/lib/mesa";
import { lembrarEndereco } from "@/lib/mestre/ponte";
import { acessoPermitido, ehLocal } from "@/lib/rede/acesso";
import { assinar, entrarNaMesa, type EventoMesa } from "@/lib/tempo-real";

// Fluxo de eventos da mesa (Server-Sent Events). Cada aparelho conectado recebe tudo o que acontece, na hora.
// Parâmetros: ?cliente=<id do aparelho>&apelido=<nome>&personagem=<id>
// "local" usa o mesmo critério do PIN: Host + IP de origem (a máquina da taverna pelo IP da rede também conta).

export async function GET(request: Request, ctx: RouteContext<"/api/campanhas/[id]/eventos">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });
  lembrarEndereco(request.url);

  const params = new URL(request.url).searchParams;
  const clienteId = (params.get("cliente") ?? crypto.randomUUID()).slice(0, 64);
  const apelido = (params.get("apelido") ?? "").trim().slice(0, 40) || "Viajante";
  const personagemId = Number(params.get("personagem")) || null;

  const codificador = new TextEncoder();
  let encerrar = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controle) {
      const enviar = (ev: EventoMesa | { e: "estado_inicial"; estado: unknown } | { e: "ping" }) => {
        try {
          controle.enqueue(codificador.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          encerrar();
        }
      };
      const sair = assinar(campanha.id, enviar);
      const sairPresenca = entrarNaMesa(campanha.id, {
        clienteId,
        apelido,
        personagemId,
        local: ehLocal(request),
        desde: new Date().toISOString(),
      });
      // estado completo logo ao conectar (e a cada reconexão do EventSource)
      enviar({ e: "estado_inicial", estado: estadoMesa(campanha.id) });
      const batida = setInterval(() => enviar({ e: "ping" }), 20000);

      let encerrado = false;
      encerrar = () => {
        if (encerrado) return;
        encerrado = true;
        clearInterval(batida);
        sair();
        sairPresenca();
        try {
          controle.close();
        } catch {
          // já fechado
        }
      };
      request.signal.addEventListener("abort", encerrar);
    },
    cancel() {
      encerrar();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
