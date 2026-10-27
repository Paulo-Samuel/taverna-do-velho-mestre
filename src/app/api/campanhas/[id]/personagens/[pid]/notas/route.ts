import { z } from "zod";
import { lerNotas, salvarNotas } from "@/lib/db";
import { alvoDaRota } from "../ficha/ajustar";

// Anotações do jogador sobre o personagem (texto livre). Ficam fora da ficha: o mestre não lê e o turno não mexe.
// GET → {notas} · PUT {notas} grava (o cliente manda com debounce enquanto a pessoa digita).

const LIMITE_NOTAS = 8000;

type Contexto = RouteContext<"/api/campanhas/[id]/personagens/[pid]/notas">;

export async function GET(request: Request, ctx: Contexto) {
  const { id, pid } = await ctx.params;
  const r = alvoDaRota(request, id, pid);
  if (r.erro) return r.erro;
  return Response.json({ notas: lerNotas(r.personagem.id) });
}

export async function PUT(request: Request, ctx: Contexto) {
  const { id, pid } = await ctx.params;
  const r = alvoDaRota(request, id, pid);
  if (r.erro) return r.erro;
  const lido = z.object({ notas: z.string().max(LIMITE_NOTAS) }).safeParse(await request.json().catch(() => null));
  if (!lido.success) return Response.json({ erro: `Anotação comprida demais (até ${LIMITE_NOTAS} caracteres).` }, { status: 400 });
  salvarNotas(r.personagem.id, lido.data.notas);
  return Response.json({ ok: true });
}
