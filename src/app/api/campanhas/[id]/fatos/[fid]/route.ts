import { z } from "zod";
import { MAX_TEXTO_FATO, limparFato } from "@/components/fatos/limites";
import { editarFato, obterFato, removerFato } from "@/lib/db";
import { campanhaDaRota, publicarFatos } from "../comum";

// Um fato fixado: PATCH {texto} edita · DELETE remove. Fato de outra mesa conta como inexistente.

type Contexto = RouteContext<"/api/campanhas/[id]/fatos/[fid]">;

function alvo(request: Request, id: string, fid: string) {
  const r = campanhaDaRota(request, id);
  if (r.erro) return r;
  const fato = obterFato(Number(fid));
  if (!fato || fato.campanhaId !== r.campanha.id) return { erro: Response.json({ erro: "Esse fato não está nesta mesa." }, { status: 404 }) } as const;
  return { erro: null, campanha: r.campanha, fato } as const;
}

export async function PATCH(request: Request, ctx: Contexto) {
  const { id, fid } = await ctx.params;
  const r = alvo(request, id, fid);
  if (r.erro) return r.erro;
  const lido = z.object({ texto: z.string().max(MAX_TEXTO_FATO * 4) }).safeParse(await request.json().catch(() => null));
  const texto = lido.success ? limparFato(lido.data.texto) : "";
  if (!texto) return Response.json({ erro: "Fato vazio não é fato. Para tirar, use o ✕." }, { status: 400 });
  editarFato(r.fato.id, texto);
  return publicarFatos(r.campanha.id);
}

export async function DELETE(request: Request, ctx: Contexto) {
  const { id, fid } = await ctx.params;
  const r = alvo(request, id, fid);
  if (r.erro) return r.erro;
  removerFato(r.fato.id);
  return publicarFatos(r.campanha.id);
}
