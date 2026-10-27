import { z } from "zod";
import { adicionarMensagem, obterPersonagem, salvarFicha } from "@/lib/db";
import { publicarPersonagem } from "@/lib/mesa";
import { mesaOcupada } from "@/lib/mestre";
import { comprar, desfazer, ofertaXp } from "@/lib/sistemas/vtm5/xp";
import { publicar } from "@/lib/tempo-real";
import { alvoDaRota } from "../ficha/ajustar";

// Gastar XP (só Vampiro V5, onde não há nível: o XP compra pontos).
// GET: vitrine do que dá para comprar. POST {compra: {tipo, alvo, ...}} compra um ponto; POST {desfazer: true} volta a última compra.
// Confere tudo no servidor (XP, nível, máximos), grava, avisa todos os aparelhos e deixa uma linha no chat.

const ESQUEMA = z.union([
  z.object({
    autor: z.string().trim().max(40).optional(),
    compra: z.object({
      tipo: z.enum(["atributo", "pericia", "especialidade", "disciplina", "ritual", "formula", "vantagem", "potencia"]),
      alvo: z.string().trim().max(120).optional(),
      nome: z.string().trim().max(80).optional(),
      foco: z.string().trim().max(60).optional(),
      nivel: z.number().int().min(1).max(5).optional(),
      de: z.number().int().min(0).max(10).optional(),
    }),
  }),
  z.object({ autor: z.string().trim().max(40).optional(), desfazer: z.literal(true) }),
]);

function alvoVampiro(request: Request, id: string, pid: string) {
  const r = alvoDaRota(request, id, pid);
  if (r.erro) return r;
  if (r.campanha.sistema !== "vtm5" || r.personagem.ficha.sistema !== "vtm5") {
    return { erro: Response.json({ erro: "Gastar XP na ficha, por enquanto, só no Vampiro. Nos outros sistemas o XP sobe de nível." }, { status: 400 }) } as const;
  }
  return r;
}

export async function GET(request: Request, ctx: RouteContext<"/api/campanhas/[id]/personagens/[pid]/xp">) {
  const { id, pid } = await ctx.params;
  const r = alvoVampiro(request, id, pid);
  if (r.erro) return r.erro;
  return Response.json({ ok: true, oferta: ofertaXp(r.personagem.ficha), ocupado: mesaOcupada(r.campanha.id) });
}

export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/personagens/[pid]/xp">) {
  const { id, pid } = await ctx.params;
  const r = alvoVampiro(request, id, pid);
  if (r.erro) return r.erro;
  const { campanha, personagem } = r;
  // o turno do mestre lê a ficha no começo e grava por cima no fim: comprar agora seria apagado
  if (mesaOcupada(campanha.id)) return Response.json({ erro: "O mestre está narrando. Gaste o XP quando ele terminar (o sangue espera)." }, { status: 409 });

  const lido = ESQUEMA.safeParse(await request.json().catch(() => null));
  if (!lido.success) return Response.json({ erro: "Pedido de compra em formato estranho." }, { status: 400 });
  const pedido = lido.data;
  const xpAntes = personagem.ficha.xp;
  const res = "desfazer" in pedido ? desfazer(personagem.ficha) : comprar(personagem.ficha, pedido.compra);
  if (!res.ok) return Response.json({ erro: res.erro, oferta: ofertaXp(personagem.ficha) }, { status: res.status });

  salvarFicha(personagem.id, res.ficha);
  const atualizado = obterPersonagem(personagem.id)!;
  publicarPersonagem(campanha.id, atualizado);

  // linha no chat no formato do cartão "ficha" (o mesmo do ajuste manual)
  const ficha = res.ficha;
  const quem = pedido.autor || personagem.jogador || "";
  const desfez = "desfazer" in pedido;
  const motivo = desfez ? `desfez a compra (${res.gasto.item}) e recuperou ${res.gasto.custo} XP` : `gastou ${res.gasto.custo} XP: ${res.gasto.item}`;
  const mudancas = [`XP ${xpAntes} → ${ficha.xp}`];
  const dados = {
    tipo: "ficha",
    personagem: ficha.nome,
    motivo,
    pvAntes: ficha.pv,
    pv: ficha.pv,
    pvMax: ficha.pvMax,
    dinheiro: ficha.dinheiro,
    recursos: mudancas,
    ganhou: [],
    perdeu: [],
    condicoes: [],
    manual: true,
    xp: true,
    autor: quem || null,
    mudancas,
  };
  const aviso = res.aviso ? ` ${res.aviso}` : "";
  const mensagem = adicionarMensagem(campanha.id, "dado", `${ficha.nome} ${motivo}.${aviso}`, { dados, personagemId: personagem.id, autor: pedido.autor || null });
  publicar(campanha.id, { e: "mensagem", mensagem });
  return Response.json({ ok: true, resumo: res.resumo, oferta: ofertaXp(ficha) });
}
