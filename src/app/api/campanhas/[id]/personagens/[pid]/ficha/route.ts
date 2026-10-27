import { z } from "zod";
import { adicionarMensagem, obterPersonagem, salvarCena, salvarFicha } from "@/lib/db";
import { publicarPersonagem } from "@/lib/mesa";
import { mesaOcupada } from "@/lib/mestre";
import { obterSistema } from "@/lib/sistemas";
import { publicar } from "@/lib/tempo-real";
import { alvoDaRota, aplicarAjuste } from "./ajustar";

// PATCH: o jogador ajusta à mão os marcadores da ficha (vida, recursos, dinheiro) e mexe em condições e inventário.
// Variações, não valores: {pv: -2, recursos: {vontade: -1}}. Grava, avisa todos os aparelhos e deixa uma linha no chat.

const delta = z.number().int().min(-1000).max(1000);
const texto = z.string().trim().min(1).max(120);
const ESQUEMA = z.object({
  autor: z.string().trim().max(40).optional(),
  pv: delta.optional(),
  dinheiro: z.number().int().min(-1_000_000).max(1_000_000).optional(),
  recursos: z.record(z.string().max(40), delta).optional(),
  adicionarCondicoes: z.array(texto).max(10).optional(),
  removerCondicoes: z.array(texto).max(10).optional(),
  adicionarItens: z.array(texto).max(10).optional(),
  removerItens: z.array(z.string().min(1).max(500)).max(10).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/campanhas/[id]/personagens/[pid]/ficha">) {
  const { id, pid } = await ctx.params;
  const r = alvoDaRota(request, id, pid);
  if (r.erro) return r.erro;
  const { campanha, personagem } = r;
  // o turno do mestre trabalha com a ficha que leu no começo e grava por cima no fim: ajuste agora seria apagado
  if (mesaOcupada(campanha.id)) return Response.json({ erro: "O mestre está narrando. Ajuste quando ele terminar." }, { status: 409 });

  const lido = ESQUEMA.safeParse(await request.json().catch(() => null));
  if (!lido.success) return Response.json({ erro: "Ajuste em formato estranho." }, { status: 400 });
  const { autor, ...pedido } = lido.data;

  const sistema = obterSistema(campanha.sistema);
  const ficha = personagem.ficha;
  const { mudancas, pvAntes } = aplicarAjuste(ficha, pedido, sistema.rotulos);
  if (!mudancas.length) return Response.json({ ok: true, mudancas });

  salvarFicha(personagem.id, ficha);
  const atualizado = obterPersonagem(personagem.id)!;
  publicarPersonagem(campanha.id, atualizado);

  // rastreador de combate acompanha a ficha (como no alterar_ficha do mestre)
  const combate = campanha.cena?.combate;
  const linha = combate?.ativo ? combate.ordem.find((c) => c.aliado && c.nome === ficha.nome) : undefined;
  if (combate && linha) {
    linha.pv = ficha.pv;
    linha.pvMax = ficha.pvMax;
    linha.condicoes = [...ficha.condicoes];
    salvarCena(campanha.id, campanha.cena);
    publicar(campanha.id, { e: "cena", cena: campanha.cena });
  }

  // linha discreta no chat, no formato do cartão "ficha" do alterar_ficha (pv igual ao anterior: o cartão mostra o motivo)
  const quem = autor || personagem.jogador || "Alguém na mesa";
  const motivo = `${quem} ajustou: ${mudancas.join(", ")}`;
  const dados = {
    tipo: "ficha",
    personagem: ficha.nome,
    motivo,
    pvAntes: ficha.pv,
    pv: ficha.pv,
    pvMax: ficha.pvMax,
    dinheiro: ficha.dinheiro,
    recursos: [],
    ganhou: [],
    perdeu: [],
    condicoes: [],
    manual: true,
    autor: quem,
    mudancas,
    pvDe: pvAntes,
  };
  const mensagem = adicionarMensagem(campanha.id, "dado", `${ficha.nome}: ${motivo}`, { dados, personagemId: personagem.id, autor: autor || null });
  publicar(campanha.id, { e: "mensagem", mensagem });
  return Response.json({ ok: true, mudancas });
}
