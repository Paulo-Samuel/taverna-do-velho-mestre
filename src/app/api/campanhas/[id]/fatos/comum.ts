import "server-only";
import { listarFatos, obterCampanha } from "@/lib/db";
import { acessoPermitido } from "@/lib/rede/acesso";
import { publicar } from "@/lib/tempo-real";

/** Campanha da rota, já conferindo o acesso (PIN pela rede); erro pronto quando não dá. */
export function campanhaDaRota(request: Request, id: string) {
  const campanha = obterCampanha(Number(id));
  if (!campanha) return { erro: Response.json({ erro: "Mesa não encontrada." }, { status: 404 }) } as const;
  if (!acessoPermitido(request, campanha)) return { erro: Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 }) } as const;
  return { erro: null, campanha } as const;
}

/** Manda a lista nova para todos os aparelhos e devolve a mesma lista na resposta. */
export function publicarFatos(campanhaId: number) {
  const fatos = listarFatos(campanhaId);
  publicar(campanhaId, { e: "fatos", fatos });
  return Response.json({ fatos });
}
