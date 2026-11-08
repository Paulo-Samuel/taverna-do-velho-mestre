import { ErroDaMesa, pedirRemorso } from "@/lib/mestre";
import { lembrarEndereco } from "@/lib/mestre/ponte";
import { alvoDaRota } from "../ficha/ajustar";

// POST: o jogador pede o teste de Remorso do personagem (Vampiro, antes de encerrar a noite). Cria o cartão "pedido_teste"
// de Remorso, que ele rola como qualquer teste (rota /rolar); o resultado ajusta Humanidade e Manchas e o mestre narra.
// Responde { ok: true, mensagemId } (o cartão; se já havia um Remorso esperando, o mesmo), 400 fora do Vampiro, 404 se o
// personagem não é desta mesa e 409 se o mestre está narrando, se não há Manchas ou se há outro teste dele esperando.
export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/personagens/[pid]/remorso">) {
  const { id, pid } = await ctx.params;
  const r = alvoDaRota(request, id, pid);
  if (r.erro) return r.erro;
  lembrarEndereco(request.url);
  try {
    return Response.json({ ok: true, ...pedirRemorso(r.campanha.id, r.personagem.id) });
  } catch (e) {
    if (e instanceof ErroDaMesa) return Response.json({ erro: e.message, ...e.dados }, { status: e.status });
    return Response.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
