import { montarDiagnostico } from "@/lib/diagnostico";
import { diaLocal } from "@/lib/log";
import { ehLocal } from "@/lib/rede/acesso";
import { portaAtual } from "@/lib/rede/enderecos";

// Relatório de diagnóstico (o mesmo de /config → Diagnóstico). Só a máquina da taverna pede.
//   GET /api/diagnostico            → JSON { geradoEm, itens, linhas, atalho, texto }
//   GET /api/diagnostico?baixar=1   → o texto como arquivo taverna-diagnostico-<data>.txt
// Sem chave de API e sem e-mail (montarDiagnostico e limparSegredos cuidam disso).

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!ehLocal(request)) return Response.json({ erro: "O diagnóstico só abre no computador da taverna." }, { status: 403 });
  const diagnostico = await montarDiagnostico(portaAtual(request));
  if (new URL(request.url).searchParams.get("baixar")) {
    return new Response(diagnostico.texto, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="taverna-diagnostico-${diaLocal()}.txt"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return Response.json(diagnostico, { headers: { "Cache-Control": "no-store" } });
}
