import { definirJogador, obterCampanha, obterPersonagem } from "@/lib/db";
import { publicarPersonagem } from "@/lib/mesa";
import { acessoPermitido } from "@/lib/rede/acesso";
import { atualizarPresenca, listarPresenca } from "@/lib/tempo-real";

// Quem chega pela rede escolhe um personagem da mesa: vira o "jogador" dele (mostrado a todos).
// Personagem de outra pessoa só pode ser assumido se ela não estiver conectada agora.

const mesmoNome = (a: string, b: string) => a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");

export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/reivindicar">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });

  const corpo = (await request.json().catch(() => ({}))) as { personagemId?: unknown; apelido?: unknown; clienteId?: unknown };
  const apelido = typeof corpo.apelido === "string" ? corpo.apelido.trim().slice(0, 40) : "";
  if (!apelido) return Response.json({ erro: "Diga seu apelido antes de pegar um personagem." }, { status: 400 });

  const personagem = obterPersonagem(Number(corpo.personagemId));
  if (!personagem || personagem.campanhaId !== campanha.id) return Response.json({ erro: "Personagem não está nesta mesa." }, { status: 404 });

  const presenca = listarPresenca(campanha.id);
  const clienteId = typeof corpo.clienteId === "string" ? corpo.clienteId : null;
  const dono = personagem.jogador;
  const donoOnline = dono && !mesmoNome(dono, apelido) && presenca.some((j) => j.clienteId !== clienteId && mesmoNome(j.apelido, dono));
  if (donoOnline) {
    return Response.json({ erro: `${personagem.ficha.nome} já está nas mãos de ${dono}. Peça licença ou escolha outro.` }, { status: 409 });
  }

  if (!mesmoNome(dono, apelido)) definirJogador(personagem.id, apelido);
  const atualizado = obterPersonagem(personagem.id);
  if (atualizado) publicarPersonagem(campanha.id, atualizado);
  // se o aparelho já estiver conectado (ex.: trocou pela mesa), a presença mostra o novo personagem na hora
  if (clienteId) atualizarPresenca(campanha.id, clienteId, { personagemId: personagem.id });
  return Response.json({ ok: true, personagemId: personagem.id });
}
