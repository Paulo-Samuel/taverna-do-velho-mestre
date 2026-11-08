import { readFileSync, rmSync } from "node:fs";
import { caminhoDaCopia, carimbo, copiaParaBaixar, lerDaLixeira } from "@/lib/backup";
import { ehLocal } from "@/lib/rede/local";

// "Baixar o banco": sem parâmetro, uma cópia feita agora (backup() do node:sqlite, consistente mesmo com a taverna jogando);
// com ?copia=<arquivo>, uma das cópias guardadas em data/copias; com ?lixeira=<arquivo>, uma campanha excluída. Só para a máquina da taverna (o porteiro também barra a rede).
export async function GET(request: Request) {
  if (!ehLocal(request)) return Response.json({ erro: "Só a máquina da taverna baixa o banco." }, { status: 403 });
  const parametros = new URL(request.url).searchParams;
  const pedida = parametros.get("copia");

  // ?lixeira=<arquivo>: o JSON de uma campanha excluída (o mesmo formato de "Exportar campanha")
  const daLixeira = parametros.get("lixeira");
  if (daLixeira) {
    const dados = lerDaLixeira(daLixeira);
    if (!dados) return Response.json({ erro: "Esse arquivo não está mais na lixeira." }, { status: 404 });
    return new Response(JSON.stringify(dados, null, 1), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${daLixeira.replace(/\.json$/, "")}.taverna.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  let conteudo: Buffer;
  let nome: string;
  if (pedida) {
    const caminho = caminhoDaCopia(pedida);
    if (!caminho) return Response.json({ erro: "Essa cópia não existe (talvez já tenha saído da lista das 7)." }, { status: 404 });
    conteudo = readFileSync(caminho);
    nome = pedida;
  } else {
    let temporario: string | null = null;
    try {
      temporario = await copiaParaBaixar();
      conteudo = readFileSync(temporario);
    } catch (erro) {
      return Response.json({ erro: `Não deu para copiar o banco: ${(erro as Error).message}` }, { status: 500 });
    } finally {
      if (temporario) rmSync(temporario, { force: true });
    }
    nome = `taverna-${carimbo()}.db`;
  }
  return new Response(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Content-Length": String(conteudo.length),
      "Cache-Control": "no-store",
    },
  });
}
