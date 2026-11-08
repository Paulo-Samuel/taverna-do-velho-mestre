import { livroEmMarkdown, montarLivro, nomeDoArquivo } from "@/app/mesa/[id]/livro/montar";
import { listarMensagens, obterCampanha, type Campanha, type Mensagem } from "@/lib/db";
import { sessaoAtual } from "@/lib/mestre";
import { acessoPermitido } from "@/lib/rede/acesso";

// Livro da campanha para baixar: ?formato=md devolve o Markdown como anexo (nome do arquivo a partir do nome da campanha).
// ?formato=resumo devolve o que o cartão "Anteriormente…" das mesas precisa (o estado da mesa não leva o resumo):
// { resumo, resumoAte, ultimaMensagem: { id, criadaEm, tipo } | null, fechamento, recapitulacao, sessao }
// - fechamento: a última coisa no chat é o fim da noite: o fechamento narrado gravado no marcador (ou o último texto do mestre);
// - recapitulacao: o "Anteriormente…" gravado no último marcador, enquanto ninguém jogou depois dele;
// - sessao: a noite em andamento (noites pelo marcador e pelo intervalo de 5 h).

const ehRecado = (m: Mensagem) => m.tipo === "sistema" && ["aviso", "divergencia"].includes(String((m.dados as { tipo?: unknown } | null)?.tipo ?? ""));
const ehMarcador = (m: Mensagem) => m.tipo === "dado" && (m.dados as { tipo?: unknown } | null)?.tipo === "fim_sessao";

function paraAVolta(campanha: Campanha) {
  const mensagens = listarMensagens(campanha.id, 120).filter((m) => !ehRecado(m));
  const ultima = mensagens[mensagens.length - 1] ?? null;
  let fechamento: string | null = null;
  let recapitulacao: string | null = null;
  for (let i = mensagens.length - 1; i >= 0; i--) {
    const m = mensagens[i];
    if (m.tipo === "jogador" && !m.texto.trim().startsWith("((")) break;
    if (!ehMarcador(m)) continue;
    const d = (m.dados ?? {}) as { fechamento?: unknown; recapitulacao?: unknown };
    recapitulacao = typeof d.recapitulacao === "string" && d.recapitulacao.trim() ? d.recapitulacao.trim() : null;
    if (m === ultima) {
      const doMestre = [...mensagens.slice(0, i)].reverse().find((x) => x.tipo === "mestre")?.texto ?? null;
      fechamento = typeof d.fechamento === "string" && d.fechamento.trim() ? d.fechamento.trim() : doMestre;
    }
    break;
  }
  return {
    resumo: campanha.resumo ?? "",
    resumoAte: campanha.resumoAte ?? 0,
    ultimaMensagem: ultima ? { id: ultima.id, criadaEm: ultima.criadaEm, tipo: ultima.tipo } : null,
    fechamento,
    recapitulacao,
    sessao: sessaoAtual(campanha.id),
  };
}
export async function GET(request: Request, ctx: RouteContext<"/api/campanhas/[id]/livro">) {
  const { id } = await ctx.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });

  const formato = new URL(request.url).searchParams.get("formato") ?? "md";
  if (formato === "resumo") return Response.json(paraAVolta(campanha), { headers: { "Cache-Control": "no-store" } });
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
