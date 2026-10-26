import { livroEmMarkdown, montarLivro, nomeDoArquivo } from "@/app/mesa/[id]/livro/montar";
import { obterCampanha } from "@/lib/db";
import { acessoPermitido } from "@/lib/rede/acesso";

// Livro da campanha para baixar: ?formato=md devolve o Markdown como anexo (nome do arquivo a partir do nome da campanha).
// ?formato=resumo devolve só { resumo } (o cartão "Anteriormente…" das mesas, que não recebe o resumo no estado).
export async function GET(request: Request, ctx: RouteContext<"/api/campanhas/[id]/livro">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });

  const formato = new URL(request.url).searchParams.get("formato") ?? "md";
  if (formato === "resumo") return Response.json({ resumo: campanha.resumo ?? "" }, { headers: { "Cache-Control": "no-store" } });
  if (formato !== "md") return Response.json({ erro: "Formato desconhecido. Use ?formato=md." }, { status: 400 });

  const livro = montarLivro(campanha.id);
  if (!livro) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  const arquivo = nomeDoArquivo(campanha.nome);
  return new Response(livroEmMarkdown(livro), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // filename* leva os acentos; o filename simples é a reserva ASCII
      "Content-Disposition": `attachment; filename="${arquivo}"; filename*=UTF-8''${encodeURIComponent(arquivo)}`,
      "Cache-Control": "no-store",
    },
  });
}
