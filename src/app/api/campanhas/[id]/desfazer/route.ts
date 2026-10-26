import { obterCampanha } from "@/lib/db";
import { desfazerTurno } from "@/lib/mestre";
import { lembrarEndereco } from "@/lib/mestre/ponte";
import { acessoPermitido } from "@/lib/rede/acesso";

// Volta a mesa para antes do último turno do mestre. Com { refazer: true } o mestre responde de novo às mesmas ações.
export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/desfazer">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });
  lembrarEndereco(request.url);

  const corpo = (await request.json().catch(() => ({}))) as { refazer?: unknown };
  try {
    return Response.json(desfazerTurno(campanha.id, { refazer: corpo.refazer === true }));
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
