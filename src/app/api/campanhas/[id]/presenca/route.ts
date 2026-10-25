import { obterCampanha } from "@/lib/db";
import { acessoPermitido } from "@/lib/rede/acesso";
import { atualizarPresenca } from "@/lib/tempo-real";

// O aparelho avisa que mudou de apelido ou de personagem ativo (mostrado para todos na mesa).
export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/presenca">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });

  const corpo = (await request.json().catch(() => ({}))) as { clienteId?: string; apelido?: string; personagemId?: number | null };
  if (!corpo.clienteId) return Response.json({ erro: "clienteId obrigatório." }, { status: 400 });
  atualizarPresenca(campanha.id, corpo.clienteId, {
    ...(typeof corpo.apelido === "string" ? { apelido: corpo.apelido.trim().slice(0, 40) || "Viajante" } : {}),
    ...(corpo.personagemId !== undefined ? { personagemId: corpo.personagemId } : {}),
  });
  return Response.json({ ok: true });
}
