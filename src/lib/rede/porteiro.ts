import { NextResponse, type NextRequest } from "next/server";
import { hostLoopback } from "./local";

// Porteiro da taverna (usado por src/proxy.ts): quem chega pela rede só entra nas mesas.
// A lista de campanhas, "nova campanha" e os ajustes do mestre ficam só para esta máquina.
// O PIN de cada mesa é conferido depois, na página e em cada rota (acesso.ts), porque aqui não há banco.
// Aqui ainda não existe o IP de origem, então "esta máquina" é quem abriu por localhost (pelo IP da rede, só as mesas).

const LIBERADAS: RegExp[] = [
  /^\/mesa\/\d+(\/.*)?$/,
  /^\/api\/campanhas\/\d+\/.+$/,
  /^\/api\/rede\/?$/,
  // trilha das músicas próprias: a rota confere ?campanha= e o PIN da mesa (o som toca em cada aparelho)
  /^\/api\/musica(\/arquivo)?\/?$/,
  // arquivos do Next, HMR e overlay de erro do modo dev
  /^\/_next\//,
  /^\/__nextjs/,
  // arquivos de public/ (ícone, imagens...)
  /^\/[^/]*\.(ico|png|jpe?g|svg|webp|gif|txt|webmanifest|woff2?)$/i,
];

export function rotaLiberadaParaRede(caminho: string): boolean {
  return LIBERADAS.some((r) => r.test(caminho));
}

export function porteiro(request: NextRequest): NextResponse {
  const caminho = request.nextUrl.pathname;
  if (rotaLiberadaParaRede(caminho) || hostLoopback(request)) return NextResponse.next();

  if (caminho.startsWith("/api/")) {
    return NextResponse.json({ erro: "Esta parte da taverna só abre na máquina do mestre." }, { status: 403 });
  }
  return new NextResponse(PAGINA_FECHADA, { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Página simples (sem o layout do app) para quem tenta abrir a lista de campanhas pelo celular.
const PAGINA_FECHADA = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Taverna do Velho Mestre</title>
<style>
body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#120d0a;color:#eadfc8;font:17px/1.5 Georgia,serif;padding:16px;box-sizing:border-box}
main{max-width:26rem;border:1px solid #3a2c22;border-radius:12px;background:#1c1511;padding:24px;text-align:center}
h1{color:#e0a24a;font-size:1.4rem;margin:0 0 .75rem}p{margin:.5rem 0;color:#a39580}strong{color:#f1e4c4}
</style></head><body><main>
<h1>🍺 Porta dos fundos trancada</h1>
<p>Daqui do seu aparelho só dá para entrar <strong>numa mesa</strong>.</p>
<p>Peça a quem está na máquina da taverna o botão <strong>Convidar</strong>: tem o link e o QR code da mesa.</p>
</main></body></html>`;
