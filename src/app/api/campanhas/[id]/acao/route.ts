import { listarPersonagens, obterCampanha } from "@/lib/db";
import { enviarAcao } from "@/lib/mestre";
import { lembrarEndereco } from "@/lib/mestre/ponte";
import { acessoPermitido } from "@/lib/rede/acesso";

// Um jogador declara uma ação. Ela entra na fila da mesa; a narração chega a todos pelo fluxo de eventos.
export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/acao">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });
  lembrarEndereco(request.url);

  const corpo = (await request.json().catch(() => ({}))) as { acao?: unknown; personagemId?: unknown; autor?: unknown };
  const acao = typeof corpo.acao === "string" ? corpo.acao.trim().slice(0, 2000) : "";
  if (!acao) return Response.json({ erro: "Diga o que seu personagem faz." }, { status: 400 });

  const personagens = listarPersonagens(campanha.id);
  const personagemId = Number(corpo.personagemId) || null;
  if (personagemId !== null && !personagens.some((p) => p.id === personagemId)) {
    return Response.json({ erro: "Esse personagem não está nesta mesa." }, { status: 400 });
  }
  if (personagemId === null && personagens.length > 0 && !acao.startsWith("((")) {
    return Response.json({ erro: "Escolha com qual personagem você está agindo." }, { status: 400 });
  }
  const autor = typeof corpo.autor === "string" ? corpo.autor.trim().slice(0, 40) : "";

  const pendente = enviarAcao(campanha.id, { personagemId, autor, acao });
  return Response.json({ pendente }, { status: 202 });
}
