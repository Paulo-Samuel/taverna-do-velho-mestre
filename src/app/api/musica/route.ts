import { faixasDoSistema, podeOuvir } from "./pasta";

// Lista as músicas próprias (pasta musica/) de um sistema, por humor, já com os fallbacks.
// GET /api/musica?sistema=vtm5[&campanha=34]  (campanha libera quem está na mesa pela rede)
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!podeOuvir(request, url.searchParams.get("campanha"))) return Response.json({ erro: "Sem acesso a esta mesa." }, { status: 403 });
  const dados = await faixasDoSistema(url.searchParams.get("sistema") ?? "historia");
  if (!dados) return Response.json({ erro: "Sistema inválido." }, { status: 400 });
  return Response.json(dados, { headers: { "Cache-Control": "private, max-age=10" } });
}
