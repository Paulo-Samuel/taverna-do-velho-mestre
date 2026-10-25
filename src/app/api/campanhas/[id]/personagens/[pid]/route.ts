import { definirJogador, listarFila, obterCampanha, obterPersonagem, removerDaFila, removerPersonagem, salvarCena } from "@/lib/db";
import { publicarPersonagem } from "@/lib/mesa";
import { mesaOcupada, reavaliarFila } from "@/lib/mestre";
import { acessoPermitido } from "@/lib/rede/acesso";
import { publicar } from "@/lib/tempo-real";

// Um personagem do grupo. PATCH {jogador}: muda quem é o responsável · DELETE: tira do grupo (a ficha vai embora junto).

type Contexto = RouteContext<"/api/campanhas/[id]/personagens/[pid]">;

/** Campanha + personagem desta rota, já conferindo acesso; devolve a resposta de erro quando não dá. */
async function alvo(request: Request, ctx: Contexto) {
  const { id, pid } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return { erro: Response.json({ erro: "Mesa não encontrada." }, { status: 404 }) };
  if (!acessoPermitido(request, campanha)) return { erro: Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 }) };
  const personagem = obterPersonagem(Number(pid));
  // personagem de outra mesa conta como inexistente: nada de mexer no grupo alheio pelo id
  if (!personagem || personagem.campanhaId !== campanha.id) {
    return { erro: Response.json({ erro: "Esse personagem não está nesta mesa." }, { status: 404 }) };
  }
  return { erro: null, campanha, personagem };
}

export async function PATCH(request: Request, ctx: Contexto) {
  const r = await alvo(request, ctx);
  if (r.erro) return r.erro;
  const corpo = (await request.json().catch(() => ({}))) as { jogador?: unknown };
  if (typeof corpo.jogador !== "string") return Response.json({ erro: "Mande o apelido do responsável (vazio = livre)." }, { status: 400 });

  definirJogador(r.personagem.id, corpo.jogador.trim().slice(0, 40));
  const atualizado = obterPersonagem(r.personagem.id)!;
  publicarPersonagem(r.campanha.id, atualizado);
  return Response.json({ ok: true, jogador: atualizado.jogador });
}

export async function DELETE(request: Request, ctx: Contexto) {
  const r = await alvo(request, ctx);
  if (r.erro) return r.erro;
  const { campanha, personagem } = r;
  // o mestre pode estar mexendo na ficha agora; tirar o chão dele no meio do turno dá ferramenta quebrada
  if (mesaOcupada(campanha.id)) return Response.json({ erro: "O mestre está narrando. Espere ele terminar para tirar alguém do grupo." }, { status: 409 });

  removerPersonagem(personagem.id);
  publicar(campanha.id, { e: "personagem_removido", id: personagem.id });

  // ações que ele deixou na fila perderam o dono
  const fila = listarFila(campanha.id);
  const orfas = fila.filter((a) => a.personagemId === personagem.id);
  for (const a of orfas) removerDaFila(a.id);
  if (orfas.length) publicar(campanha.id, { e: "estado", ocupado: mesaOcupada(campanha.id), fila: listarFila(campanha.id) });

  // quem saiu do grupo sai também da ordem de iniciativa (senão a vez dele trava o rastreador)
  const combate = campanha.cena?.combate;
  const i = combate?.ordem.findIndex((c) => c.aliado && c.nome === personagem.ficha.nome) ?? -1;
  if (combate && i >= 0) {
    const ordem = combate.ordem.filter((_, j) => j !== i);
    const vez = ordem.length ? (i < combate.vez ? combate.vez - 1 : combate.vez) % ordem.length : 0;
    const cena = { ...campanha.cena, combate: { ...combate, ordem, vez } };
    salvarCena(campanha.id, cena);
    publicar(campanha.id, { e: "cena", cena });
  }

  // no modo rodada, quem saiu podia ser o último que faltava: a fila reavalia com a mesma regra do mestre
  reavaliarFila(campanha.id);
  return Response.json({ ok: true });
}
