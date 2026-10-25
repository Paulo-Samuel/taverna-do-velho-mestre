import { obterCampanha, removerDaFila, listarFila, listarMensagens } from "@/lib/db";
import { cancelarTurno, forcarRodada, iniciarCampanha, INICIO, mesaOcupada } from "@/lib/mestre";
import { lembrarEndereco } from "@/lib/mestre/ponte";
import { acessoPermitido } from "@/lib/rede/acesso";
import { publicar } from "@/lib/tempo-real";

// Comandos da mesa: começar a aventura, cancelar o turno do mestre, forçar a rodada, retirar uma ação da fila.
export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/controle">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });
  lembrarEndereco(request.url);

  const corpo = (await request.json().catch(() => ({}))) as { comando?: string; acaoId?: number };
  switch (corpo.comando) {
    case "iniciar":
      if (mesaOcupada(campanha.id)) return Response.json({ erro: "O mestre já está falando." }, { status: 409 });
      // clique duplo, dois aparelhos ou o início automático: a cena de abertura sai uma vez só
      if (listarFila(campanha.id).some((a) => a.acao === INICIO) || listarMensagens(campanha.id).some((m) => m.tipo === "mestre")) {
        return Response.json({ erro: "A aventura já começou." }, { status: 409 });
      }
      iniciarCampanha(campanha.id);
      break;
    case "cancelar":
      cancelarTurno(campanha.id);
      break;
    case "forcar":
      forcarRodada(campanha.id);
      break;
    case "retirar":
      if (typeof corpo.acaoId === "number") removerDaFila(corpo.acaoId);
      publicar(campanha.id, { e: "estado", ocupado: mesaOcupada(campanha.id), fila: listarFila(campanha.id) });
      break;
    default:
      return Response.json({ erro: "Comando desconhecido." }, { status: 400 });
  }
  return Response.json({ ok: true });
}
