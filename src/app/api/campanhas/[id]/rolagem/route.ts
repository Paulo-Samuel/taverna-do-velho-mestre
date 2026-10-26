import { z } from "zod";
import { adicionarMensagem, listarPersonagens, obterCampanha, salvarFicha } from "@/lib/db";
import { publicarPersonagem } from "@/lib/mesa";
import { descreverRolagem, expressaoValida, rolar } from "@/lib/dados";
import { acessoPermitido } from "@/lib/rede/acesso";
import { obterSistema } from "@/lib/sistemas";
import { publicar } from "@/lib/tempo-real";

// Rolador dos jogadores. O servidor rola (crypto) para ninguém duvidar do número:
// pública vira mensagem "dado" para a mesa inteira; "só para mim" volta só para quem rolou e não deixa rastro.
// "Dados físicos" grava o que o jogador informou, marcado como manual (a taverna confia, mas anota).

const base = {
  personagemId: z.number().int().positive().nullish(),
  autor: z.string().trim().max(40).optional(),
  motivo: z.string().trim().max(120).optional(),
  privada: z.boolean().optional(),
};

const CORPO = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("livre"), expressao: z.string().trim().min(1).max(80), ...base }),
  z.object({
    tipo: z.literal("teste"),
    teste: z.string().trim().min(1).max(80),
    alvo: z.number().int().min(-100).max(1000).nullish(),
    modo: z.enum(["normal", "vantagem", "desvantagem"]).optional(),
    modificador: z.number().int().min(-50).max(50).optional(),
    ...base,
  }),
  z.object({
    tipo: z.literal("manual"),
    expressao: z.string().trim().max(80).optional(),
    /** faces que caíram na mesa de verdade, se o jogador quiser contar */
    valores: z.array(z.number().int().min(-1).max(1000)).max(100).optional(),
    total: z.number().int().min(-10000).max(100000),
    ...base,
  }),
]);

const erro = (mensagem: string, status = 400) => Response.json({ erro: mensagem }, { status });

export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/rolagem">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return erro("Mesa não encontrada.", 404);
  if (!acessoPermitido(request, campanha)) return erro("Esta mesa pede PIN.", 403);

  const lido = CORPO.safeParse(await request.json().catch(() => null));
  if (!lido.success) return erro("Pedido de rolagem estranho. O dado nem saiu do copo.");
  const corpo = lido.data;

  const personagemId = corpo.personagemId ?? null;
  const personagem = personagemId === null ? null : (listarPersonagens(campanha.id).find((p) => p.id === personagemId) ?? null);
  if (personagemId !== null && !personagem) return erro("Esse personagem não está nesta mesa.");
  const autor = corpo.autor || null;
  // "só para mim" não faz sentido com dado físico: o resultado já está na mão de quem rolou
  const privada = corpo.tipo !== "manual" && Boolean(corpo.privada);
  const quem = personagem?.ficha.nome ?? autor ?? "Alguém";

  let texto: string;
  let dados: Record<string, unknown>;

  if (corpo.tipo === "teste") {
    if (!personagem) return erro("Escolha um personagem para testar com a ficha.");
    const sistema = obterSistema(campanha.sistema);
    try {
      const r = sistema.resolverTeste(personagem.ficha, {
        teste: corpo.teste,
        alvo: corpo.alvo ?? null,
        modo: corpo.modo ?? "normal",
        modificador: corpo.modificador ?? 0,
        motivo: corpo.motivo || "por conta própria",
      });
      texto = `${personagem.ficha.nome} · ${r.teste} — ${r.motivo}: ${r.expressao} → ${r.total}${r.alvo !== null ? ` vs ${r.alvo}` : ""} · ${r.rotuloGrau}`;
      dados = { ...r, origem: "jogador" };
      // efeitos do teste na ficha (ex.: Despertar falho sobe a Fome no VtM), como nos testes pedidos pelo mestre;
      // rolagem "só para mim" é segredo e não mexe em nada
      const nova = privada ? null : sistema.aposTeste?.(personagem.ficha, r);
      if (nova) {
        salvarFicha(personagem.id, nova);
        publicarPersonagem(campanha.id, { ...personagem, ficha: nova });
      }
    } catch (e) {
      return erro(e instanceof Error ? e.message : "O sistema não soube resolver esse teste.");
    }
  } else if (corpo.tipo === "livre") {
    if (!expressaoValida(corpo.expressao)) return erro(`"${corpo.expressao}" não é notação de dados. Tente 1d20+5, 2d6, 4d6kh3, 4dF ou d%.`);
    try {
      const r = rolar(corpo.expressao);
      const descricao = descreverRolagem(r);
      const motivo = corpo.motivo || "Rolagem livre";
      texto = `${quem} · ${motivo}: ${descricao}`;
      dados = { tipo: "rolagem", origem: "jogador", personagem: personagem?.ficha.nome ?? null, motivo, ...r, descricao };
    } catch (e) {
      return erro(e instanceof Error ? e.message : "Rolagem inválida.");
    }
  } else {
    const expressao = corpo.expressao?.replace(/\s+/g, "").toLowerCase() || null;
    if (expressao && !expressaoValida(expressao)) return erro(`"${corpo.expressao}" não é notação de dados.`);
    const motivo = corpo.motivo || "Rolagem na mesa";
    const faces = corpo.valores?.length ? ` [${corpo.valores.join(", ")}]` : "";
    const descricao = `${expressao ?? "dados"}${faces} = ${corpo.total} (dados físicos)`;
    texto = `${quem} · ${motivo}: ${descricao}`;
    dados = { tipo: "rolagem", origem: "jogador", manual: true, personagem: personagem?.ficha.nome ?? null, motivo, expressao, valores: corpo.valores ?? [], total: corpo.total, descricao };
  }

  if (privada) {
    // nada no banco, nada no fluxo: só quem rolou fica sabendo
    return Response.json({ privada: true, texto, dados: { ...dados, privada: true }, personagemId, autor });
  }

  const mensagem = adicionarMensagem(campanha.id, "dado", texto, { dados, personagemId, autor });
  publicar(campanha.id, { e: "mensagem", mensagem });
  return Response.json({ privada: false, mensagem }, { status: 201 });
}
