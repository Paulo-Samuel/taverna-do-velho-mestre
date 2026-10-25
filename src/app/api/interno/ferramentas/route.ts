import { turnoDoToken } from "@/lib/mestre/ponte";

// Usada só pelo servidor MCP (mcp/taverna-mcp.mjs) que o Claude Code sobe durante um turno.
// O token é aleatório, vive só enquanto o turno dura e nunca sai desta máquina.

export async function GET(request: Request) {
  const turno = turnoDoToken(new URL(request.url).searchParams.get("token"));
  if (!turno) return Response.json({ erro: "Turno inexistente ou encerrado." }, { status: 404 });
  return Response.json({ ferramentas: turno.ferramentas });
}

export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => ({}))) as { token?: string; nome?: string; entrada?: unknown };
  const turno = turnoDoToken(corpo.token);
  if (!turno) return Response.json({ erro: "Turno inexistente ou encerrado." }, { status: 404 });
  try {
    const resultado = await turno.executar(String(corpo.nome ?? ""), corpo.entrada ?? {});
    return Response.json({ resultado });
  } catch (e) {
    const erro = e instanceof Error ? (e.name === "ZodError" ? `Entrada inválida: ${e.message}` : e.message) : String(e);
    return Response.json({ erro });
  }
}
