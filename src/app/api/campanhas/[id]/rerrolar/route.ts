import { obterCampanha } from "@/lib/db";
import { decidirTeste } from "@/lib/mestre";
import { lembrarEndereco } from "@/lib/mestre/ponte";
import { acessoPermitido } from "@/lib/rede/acesso";

// Vampiro: depois de rolar um teste pedido, o jogador decide. { mensagemId } rerrola com Força de Vontade (até 3 dados normais,
// −1 FV; `dados` opcional com os índices); { mensagemId, aceitar: true } fica com o resultado (sozinho: true = o prazo acabou).
// Os dados saem daqui, nunca do navegador; a regra é validada de novo em decidirTeste (src/lib/mestre).
export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/rerrolar">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });
  lembrarEndereco(request.url);

  const corpo = (await request.json().catch(() => ({}))) as { mensagemId?: unknown; aceitar?: unknown; sozinho?: unknown; dados?: unknown };
  const mensagemId = Number(corpo.mensagemId);
  if (!Number.isInteger(mensagemId)) return Response.json({ erro: "Qual teste?" }, { status: 400 });
  const dados = Array.isArray(corpo.dados) ? corpo.dados.map(Number) : undefined;
  if (dados && (dados.length > 3 || dados.some((i) => !Number.isInteger(i)))) return Response.json({ erro: "Escolha até 3 dados." }, { status: 400 });
  try {
    const resultado = decidirTeste(campanha.id, mensagemId, { rerrolar: corpo.aceitar !== true, dados, sozinho: corpo.sozinho === true });
    return Response.json({ resultado });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
