import { z } from "zod";
import { MAX_FATOS_GUARDADOS, MAX_TEXTO_FATO, limparFato } from "@/components/fatos/limites";
import { criarFato, listarFatos, reordenarFatos } from "@/lib/db";
import { campanhaDaRota, publicarFatos } from "./comum";

// Fatos fixados: o que o jogador marcou para o mestre nunca esquecer (entram em todo turno no prompt, ver mestre/prompt.ts).
// GET → {fatos} · POST {texto, autor?} cria no fim · PUT {ordem: ids} reordena. Toda mudança vai por SSE ({e: "fatos"}).

type Contexto = RouteContext<"/api/campanhas/[id]/fatos">;

export async function GET(request: Request, ctx: Contexto) {
  const { id } = await ctx.params;
  const r = campanhaDaRota(request, id);
  if (r.erro) return r.erro;
  return Response.json({ fatos: listarFatos(r.campanha.id) }, { headers: { "Cache-Control": "no-store" } });
}

const Novo = z.object({ texto: z.string().max(MAX_TEXTO_FATO * 4), autor: z.string().max(40).optional() });

export async function POST(request: Request, ctx: Contexto) {
  const { id } = await ctx.params;
  const r = campanhaDaRota(request, id);
  if (r.erro) return r.erro;
  const lido = Novo.safeParse(await request.json().catch(() => null));
  const texto = lido.success ? limparFato(lido.data.texto) : "";
  if (!texto) return Response.json({ erro: "Fixar o vazio? Escreva alguma coisa." }, { status: 400 });
  if (listarFatos(r.campanha.id).length >= MAX_FATOS_GUARDADOS) {
    return Response.json({ erro: `Já são ${MAX_FATOS_GUARDADOS} fatos. Nem o mestre mais velho lembra de tanto: apague alguns.` }, { status: 409 });
  }
  criarFato(r.campanha.id, texto, (lido.data?.autor ?? "").trim().slice(0, 40));
  return publicarFatos(r.campanha.id);
}

export async function PUT(request: Request, ctx: Contexto) {
  const { id } = await ctx.params;
  const r = campanhaDaRota(request, id);
  if (r.erro) return r.erro;
  const lido = z.object({ ordem: z.array(z.number().int()).max(MAX_FATOS_GUARDADOS * 2) }).safeParse(await request.json().catch(() => null));
  if (!lido.success) return Response.json({ erro: "Ordem inválida." }, { status: 400 });
  reordenarFatos(r.campanha.id, lido.data.ordem);
  return publicarFatos(r.campanha.id);
}
