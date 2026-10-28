import { obterCampanha } from "@/lib/db";
import { encerrarSessao } from "@/lib/mestre";
import { lembrarEndereco } from "@/lib/mestre/ponte";
import { acessoPermitido } from "@/lib/rede/acesso";

// "Encerrar a noite": o mestre fecha a sessão (fechamento curto, XP, Remorso no Vampiro, diário) e grava o marcador
// "fim_sessao" no chat. Responde { ok: true, sessao } (o número da sessão que está sendo encerrada) ou 409 com { erro }
// se o mestre está narrando, se há teste esperando, ações na fila ou a aventura ainda não começou.
export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/encerrar">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });
  lembrarEndereco(request.url);

  try {
    return Response.json({ ok: true, ...encerrarSessao(campanha.id) });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
