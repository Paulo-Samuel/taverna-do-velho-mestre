import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { caminhoSeguro, podeOuvir } from "../pasta";

// Transmite uma música da pasta musica/ com suporte a Range (o <audio> pula, repete e começa antes de baixar tudo).
// GET /api/musica/arquivo?c=vtm5/tensao/faixa.mp3[&campanha=34]

function corpo(arquivo: string, inicio: number, fim: number, sinal: AbortSignal): ReadableStream {
  const fluxo = createReadStream(arquivo, { start: inicio, end: fim });
  // o navegador desistiu (trocou de faixa): fecha o arquivo
  sinal.addEventListener("abort", () => fluxo.destroy(), { once: true });
  return Readable.toWeb(fluxo) as ReadableStream;
}

async function responder(request: Request, cabecaSo: boolean) {
  const url = new URL(request.url);
  if (!podeOuvir(request, url.searchParams.get("campanha"))) return Response.json({ erro: "Sem acesso a esta mesa." }, { status: 403 });
  const alvo = await caminhoSeguro(url.searchParams.get("c"));
  if ("erro" in alvo) return Response.json({ erro: alvo.erro === 400 ? "Caminho inválido." : "Música não encontrada." }, { status: alvo.erro });

  const { size } = await fs.stat(alvo.arquivo);
  const base = {
    "Content-Type": alvo.tipo,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };

  const faixa = request.headers.get("range");
  if (faixa) {
    // só um intervalo: bytes=inicio-fim, bytes=inicio- ou bytes=-sufixo
    const m = /^bytes=(\d*)-(\d*)$/.exec(faixa.trim());
    let inicio = -1;
    let fim = size - 1;
    if (m && (m[1] || m[2])) {
      if (m[1]) {
        inicio = Number(m[1]);
        if (m[2]) fim = Math.min(Number(m[2]), size - 1);
      } else {
        inicio = Math.max(0, size - Number(m[2]));
      }
    }
    if (!m || inicio < 0 || inicio >= size || fim < inicio) {
      return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${size}` } });
    }
    const headers = { ...base, "Content-Range": `bytes ${inicio}-${fim}/${size}`, "Content-Length": String(fim - inicio + 1) };
    return new Response(cabecaSo ? null : corpo(alvo.arquivo, inicio, fim, request.signal), { status: 206, headers });
  }

  const headers = { ...base, "Content-Length": String(size) };
  if (cabecaSo || size === 0) return new Response(null, { status: 200, headers });
  return new Response(corpo(alvo.arquivo, 0, size - 1, request.signal), { status: 200, headers });
}

export function GET(request: Request) {
  return responder(request, false);
}

export function HEAD(request: Request) {
  return responder(request, true);
}
