import { obterCampanha } from "@/lib/db";
import { encerrarSessao, ErroDaMesa } from "@/lib/mestre";
import { lembrarEndereco } from "@/lib/mestre/ponte";
import { acessoPermitido } from "@/lib/rede/acesso";

// "Encerrar a noite": o mestre fecha a sessão (fechamento curto, XP, Remorso no Vampiro, diário) e grava o marcador
// "fim_sessao" no chat. Corpo opcional { semRemorso?: boolean, retroativa?: boolean }:
// - semRemorso: "o mestre decide" (encerrar com Manchas sem o Remorso rolado na ficha; o mestre rola no fechamento);
// - retroativa: fechar em retrospectiva a noite que acabou sem o botão (padrão: automático depois de 5 h sem mensagem).
// Responde { ok: true, sessao, retroativa } (a sessão que está sendo encerrada) ou 409 com { erro } se o mestre está
// narrando, se há teste esperando, ações na fila, a aventura ainda não começou ou a noite já foi encerrada; no Vampiro com
// Manchas sem Remorso, 409 com { erro, remorso: [{ id, nome, manchas }] }.
export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/encerrar">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });
  lembrarEndereco(request.url);

  const corpo = (await request.json().catch(() => ({}))) as { semRemorso?: unknown; retroativa?: unknown } | null;
  const opcoes = {
    ...(corpo?.semRemorso === true ? { semRemorso: true } : {}),
    ...(typeof corpo?.retroativa === "boolean" ? { retroativa: corpo.retroativa } : {}),
  };
  try {
    return Response.json({ ok: true, ...encerrarSessao(campanha.id, opcoes) });
  } catch (e) {
    if (e instanceof ErroDaMesa) return Response.json({ erro: e.message, ...e.dados }, { status: e.status });
    return Response.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
