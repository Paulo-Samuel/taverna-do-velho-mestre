// Servidor MCP mínimo (stdio, JSON-RPC por linha) que liga o Claude Code às ferramentas do mestre.
// Não tem regra nenhuma aqui: ele repassa cada chamada para o app (rota /api/interno/ferramentas),
// que rola os dados, altera as fichas e avisa todos os aparelhos da mesa.
// O app passa TAVERNA_PONTE_URL e TAVERNA_PONTE_TOKEN pelo --mcp-config de cada turno.
import { createInterface } from "node:readline";

const URL_PONTE = process.env.TAVERNA_PONTE_URL;
const TOKEN = process.env.TAVERNA_PONTE_TOKEN;

function responder(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function erro(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}

async function chamarApp(caminho, init) {
  const resp = await fetch(`${URL_PONTE}${caminho}`, init);
  return resp.json();
}

async function tratar({ id, method, params }) {
  switch (method) {
    case "initialize":
      return responder(id, {
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "taverna", version: "0.2.0" },
      });
    case "ping":
      return responder(id, {});
    case "tools/list": {
      const r = await chamarApp(`/api/interno/ferramentas?token=${encodeURIComponent(TOKEN)}`);
      if (r.erro) return erro(id, -32000, r.erro);
      return responder(id, {
        tools: r.ferramentas.map((f) => ({ name: f.name, description: f.description, inputSchema: f.input_schema })),
      });
    }
    case "tools/call": {
      const r = await chamarApp("/api/interno/ferramentas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: TOKEN, nome: params.name, entrada: params.arguments ?? {} }),
      });
      if (r.erro) return responder(id, { content: [{ type: "text", text: r.erro }], isError: true });
      return responder(id, { content: [{ type: "text", text: JSON.stringify(r.resultado) }] });
    }
    default:
      return erro(id, -32601, `Método não suportado: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (linha) => {
  if (!linha.trim()) return;
  let msg;
  try {
    msg = JSON.parse(linha);
  } catch {
    return erro(null, -32700, "JSON inválido");
  }
  // notificações (sem id) não têm resposta
  if (msg.id === undefined || msg.id === null) return;
  tratar(msg).catch((e) => erro(msg.id, -32000, `Falha ao falar com o app: ${e?.message ?? e}`));
});
