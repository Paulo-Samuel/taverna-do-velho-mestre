import { obterCampanha } from "@/lib/db";
import { decidirTeste } from "@/lib/mestre";
import { lembrarEndereco } from "@/lib/mestre/ponte";
import { acessoPermitido, ehLocal } from "@/lib/rede/acesso";

// Depois de rolar um teste, o jogador decide. { mensagemId, opcao?, dados? } escolhe a opção que o sistema ofereceu (Vampiro:
// rerrolar com Força de Vontade, até 3 dados normais por índice; PF2e: Ponto de Herói; 5e: Inspiração); { mensagemId, aceitar: true }
// fica com o resultado. `clienteId`: o aparelho que pede (só o dono da decisão decide). O prazo é só do servidor: o navegador não
// aceita sozinho. Os dados saem daqui, nunca do navegador; a regra é validada de novo em decidirTeste (src/lib/mestre).
export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/rerrolar">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });
  lembrarEndereco(request.url);

  const corpo = (await request.json().catch(() => ({}))) as { mensagemId?: unknown; aceitar?: unknown; dados?: unknown; opcao?: unknown; clienteId?: unknown };
  const mensagemId = Number(corpo.mensagemId);
  if (!Number.isInteger(mensagemId)) return Response.json({ erro: "Qual teste?" }, { status: 400 });
  const dados = Array.isArray(corpo.dados) ? corpo.dados.map(Number) : undefined;
  if (dados && (dados.length > 3 || dados.some((i) => !Number.isInteger(i)))) return Response.json({ erro: "Escolha até 3 dados." }, { status: 400 });
  const opcao = typeof corpo.opcao === "string" && corpo.opcao.length <= 40 ? corpo.opcao : undefined;
  const clienteId = typeof corpo.clienteId === "string" ? corpo.clienteId.slice(0, 80) : "";
  try {
    const resultado = decidirTeste(campanha.id, mensagemId, { rerrolar: corpo.aceitar !== true, opcao, dados }, { clienteId, local: ehLocal(request) });
    return Response.json({ resultado });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
