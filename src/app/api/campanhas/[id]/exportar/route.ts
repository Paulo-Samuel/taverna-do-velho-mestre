import { carimbo, nomeSeguro } from "@/lib/backup";
import { exportarCampanha, obterCampanha } from "@/lib/db";
import { ehLocal } from "@/lib/rede/local";

// Campanha inteira num arquivo "taverna-campanha" (JSON versionado; ver src/lib/db/migracoes.ts) para levar a outro PC.
// Só a máquina da taverna exporta: o arquivo tem o chat, as fichas e as anotações de todo mundo. O porteiro já barra a rede;
// a conferência aqui é a segunda tranca.
export async function GET(request: Request, ctx: RouteContext<"/api/campanhas/[id]/exportar">) {
  if (!ehLocal(request)) return Response.json({ erro: "Só a máquina da taverna exporta campanhas." }, { status: 403 });
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  const dados = campanha ? exportarCampanha(campanha.id) : null;
  if (!campanha || !dados) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  const arquivo = `${nomeSeguro(campanha.nome)}-${carimbo().slice(0, 10)}.taverna.json`;
  return new Response(JSON.stringify(dados, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
