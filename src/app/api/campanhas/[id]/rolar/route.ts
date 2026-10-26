import { obterCampanha } from "@/lib/db";
import { rolarTestePendente } from "@/lib/mestre";
import { lembrarEndereco } from "@/lib/mestre/ponte";
import { acessoPermitido } from "@/lib/rede/acesso";

// O jogador rola um teste que o mestre pediu (modo história). O número sai daqui, nunca do navegador.
export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/rolar">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });
  lembrarEndereco(request.url);

  const corpo = (await request.json().catch(() => ({}))) as { mensagemId?: unknown; autor?: unknown };
  const mensagemId = Number(corpo.mensagemId);
  if (!Number.isInteger(mensagemId)) return Response.json({ erro: "Qual teste?" }, { status: 400 });
  const autor = typeof corpo.autor === "string" ? corpo.autor.trim().slice(0, 40) : "";
  try {
    const resultado = rolarTestePendente(campanha.id, mensagemId, autor);
    return Response.json({ resultado });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
