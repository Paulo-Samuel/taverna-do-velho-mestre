import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import Anthropic from "@anthropic-ai/sdk";

// Erros do mestre em português (P128/P10) e fins anormais do turno na API (P130), sem gastar crédito: as classes reais do
// SDK e um servidor HTTP local no lugar da API (ANTHROPIC_BASE_URL), que devolve 401/429/529, beta recusado e streams SSE.

const { traduzirErro, traduzirErroCli, ehCancelamento, esperaPedida, ErroDoMestre, TURNO_CANCELADO } = await import(new URL("../src/lib/mestre/erros-api.ts", import.meta.url).href);

const corpo = (tipo: string, mensagem: string) => ({ type: "error", error: { type: tipo, message: mensagem } });
const gerar = (status: number, tipo: string, mensagem: string, headers: Record<string, string> = {}) =>
  Anthropic.APIError.generate(status, corpo(tipo, mensagem), undefined, new Headers(headers));

describe("traduzirErro com as classes reais do SDK", () => {
  it("401 → chave não aceita, abrir Configurações", () => {
    const t = traduzirErro(gerar(401, "authentication_error", "invalid x-api-key"));
    assert.match(t.mensagem, /chave de API não foi aceita/);
    assert.equal(t.acao, "config");
  });
  it("400 sem créditos", () => {
    const t = traduzirErro(gerar(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."));
    assert.match(t.mensagem, /sem créditos/);
  });
  it("400 por beta não habilitada", () => {
    const t = traduzirErro(gerar(400, "invalid_request_error", "Unexpected value(s) `server-side-fallback-2026-07-01` for the `anthropic-beta` header."));
    assert.match(t.mensagem, /recurso beta/);
  });
  it("404 → modelo inexistente, com o nome", () => {
    const t = traduzirErro(gerar(404, "not_found_error", "model: claude-sonet-5-5"));
    assert.match(t.mensagem, /O modelo 'claude-sonet-5-5' não existe na API/);
    assert.equal(t.acao, "config");
  });
  it("429 → esperar N s (lê retry-after)", () => {
    const t = traduzirErro(gerar(429, "rate_limit_error", "Number of request tokens has exceeded your per-minute rate limit", { "retry-after": "17" }));
    assert.match(t.mensagem, /esperar 17 s/);
    assert.equal(t.esperarMs, 17_000);
    assert.equal(t.acao, "tentar");
  });
  it("529 e 500 → sobrecarregada, tentar de novo", () => {
    for (const status of [529, 500, 503]) {
      const t = traduzirErro(gerar(status, "overloaded_error", "Overloaded"));
      assert.match(t.mensagem, /sobrecarregada/);
      assert.equal(t.acao, "tentar");
    }
  });
  it("sem rede e tempo esgotado", () => {
    assert.match(traduzirErro(new Anthropic.APIConnectionError({ message: "Connection error." })).mensagem, /Sem conexão com a API/);
    assert.match(traduzirErro(new Anthropic.APIConnectionTimeoutError()).mensagem, /demorou demais/);
  });
  it("interromper não é erro: abort do SDK, sinal abortado e 'Turno cancelado.'", () => {
    assert.equal(traduzirErro(new Anthropic.APIUserAbortError()).cancelado, true);
    assert.equal(traduzirErro(new Error(TURNO_CANCELADO)).cancelado, true);
    const c = new AbortController();
    c.abort();
    assert.equal(ehCancelamento(new Error("qualquer"), c.signal), true);
    assert.equal(ehCancelamento(gerar(500, "api_error", "x")), false);
  });
  it("SDK sem credencial → frase sobre ANTHROPIC_API_KEY; ErroDoMestre passa como veio", () => {
    assert.match(traduzirErro(new Anthropic.AnthropicError("Could not resolve authentication method. Expected one of apiKey...")).mensagem, /ANTHROPIC_API_KEY/);
    const t = traduzirErro(new ErroDoMestre("Já em português.", "config"));
    assert.deepEqual(t, { mensagem: "Já em português.", acao: "config" });
  });
  it("esperaPedida lê segundos, ms e data", () => {
    assert.equal(esperaPedida(new Headers({ "retry-after": "3" })), 3000);
    assert.equal(esperaPedida(new Headers({ "retry-after-ms": "250" })), 250);
    assert.equal(esperaPedida(new Headers()), undefined);
  });
});

describe("traduzirErroCli (Claude Code)", () => {
  it("limite do plano com a hora da renovação", () => {
    const renova = new Date(2026, 10, 8, 21, 30).getTime() / 1000;
    const t = traduzirErroCli("You've hit your limit · resets 9:30pm", { renovaEm: renova });
    assert.match(t!.mensagem, /bateu no limite; renova às 21:30/);
    assert.equal(t!.acao, "tentar");
  });
  it("sem login, tempo esgotado e desconhecido", () => {
    assert.match(traduzirErroCli("Invalid API key · Please run /login")!.mensagem, /não está logado/);
    assert.match(traduzirErroCli("", { estourouTempo: true, tempoMaximoMs: 300_000 })!.mensagem, /limite de 5 min/);
    assert.equal(traduzirErroCli("algo que ninguém conhece"), null);
  });
  it("traduzirErro aplica a tradução do CLI ao erro cru do provedor", () => {
    assert.match(traduzirErro(new Error("O Claude Code respondeu com erro: You've hit your limit")).mensagem, /plano do Claude Code bateu no limite/);
  });
});

// ---------- provedor da API contra um servidor local ----------

type Pedido = { corpo: Record<string, unknown>; beta: string | null };
let responder: (p: Pedido, res: ServerResponse) => void = () => {};
const pedidos: Pedido[] = [];
const servidor = createServer((req: IncomingMessage, res: ServerResponse) => {
  let dados = "";
  req.on("data", (c) => (dados += c));
  req.on("end", () => {
    const p = { corpo: JSON.parse(dados || "{}"), beta: (req.headers["anthropic-beta"] as string) ?? null };
    pedidos.push(p);
    responder(p, res);
  });
});

function erroHttp(res: ServerResponse, status: number, tipo: string, mensagem: string) {
  // retry-after-ms curto: as 2 tentativas do SDK não atrasam o teste
  res.writeHead(status, { "content-type": "application/json", "retry-after-ms": "5", "retry-after": "0" });
  res.end(JSON.stringify(corpo(tipo, mensagem)));
}

let n = 0;
function sse(res: ServerResponse, blocos: ({ tipo: "texto"; texto: string } | { tipo: "ferramenta"; nome: string; entrada: unknown })[], parada: string) {
  res.writeHead(200, { "content-type": "text/event-stream" });
  const ev = (tipo: string, dados: unknown) => res.write(`event: ${tipo}\ndata: ${JSON.stringify(dados)}\n\n`);
  ev("message_start", {
    type: "message_start",
    message: { id: `msg_${++n}`, type: "message", role: "assistant", model: "teste", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 100, output_tokens: 1, cache_read_input_tokens: 80, cache_creation_input_tokens: 0 } },
  });
  blocos.forEach((b, i) => {
    if (b.tipo === "texto") {
      ev("content_block_start", { type: "content_block_start", index: i, content_block: { type: "text", text: "" } });
      ev("content_block_delta", { type: "content_block_delta", index: i, delta: { type: "text_delta", text: b.texto } });
    } else {
      ev("content_block_start", { type: "content_block_start", index: i, content_block: { type: "tool_use", id: `toolu_${n}_${i}`, name: b.nome, input: {} } });
      ev("content_block_delta", { type: "content_block_delta", index: i, delta: { type: "input_json_delta", partial_json: JSON.stringify(b.entrada) } });
    }
    ev("content_block_stop", { type: "content_block_stop", index: i });
  });
  ev("message_delta", { type: "message_delta", delta: { stop_reason: parada, stop_sequence: null }, usage: { output_tokens: 10 } });
  ev("message_stop", { type: "message_stop" });
  res.end();
}

let criarProvedorApi: (o: { chave?: string; modelo?: string; esforco?: string }) => {
  turno: (o: Record<string, unknown>) => Promise<void>;
  texto: (o: { sistema: string; prompt: string }) => Promise<string>;
};
let MAX_RODADAS = 0;
let AVISO_LIMITE_RODADAS = "";

before(async () => {
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  const m = await import(new URL("../src/lib/mestre/provedor-api.ts", import.meta.url).href);
  criarProvedorApi = m.criarProvedorApi as never;
  MAX_RODADAS = m.MAX_RODADAS;
  AVISO_LIMITE_RODADAS = m.AVISO_LIMITE_RODADAS;
});
after(() => servidor.close());

const FERRAMENTA = { name: "rolar_dados", description: "rola", input_schema: { type: "object", properties: {} } };

async function turno(o: { especial?: boolean; esforco?: string } = {}) {
  const eventos: { tipo: string; texto?: string; segundos?: number; cacheLido?: number }[] = [];
  const executadas: string[] = [];
  const p = criarProvedorApi({ chave: "sk-ant-teste-0000", modelo: "claude-teste", esforco: o.esforco });
  await p.turno({
    sistema: "ESTÁVEL",
    contexto: "CENA",
    prompt: "ação",
    ferramentas: [FERRAMENTA],
    executar: async (nome: string) => {
      executadas.push(nome);
      return { total: 4 };
    },
    ponte: { url: "", token: "" },
    emitir: (e: { tipo: string }) => eventos.push(e),
    especial: o.especial,
  });
  return { eventos, executadas };
}

describe("provedor da API (servidor local)", () => {
  it("sem chave, recusa em português ao criar (o SDK não cai em perfil de outra conta)", () => {
    assert.throws(() => criarProvedorApi({}), /sem chave/);
  });

  it("dois blocos de sistema, cache só no estável, esforço medium e uso com cache lido", async () => {
    pedidos.length = 0;
    responder = (_p, res) => sse(res, [{ tipo: "texto", texto: "A chuva cai." }], "end_turn");
    const { eventos } = await turno();
    const sys = pedidos[0].corpo.system as { text: string; cache_control?: unknown }[];
    assert.equal(sys.length, 2);
    assert.equal(sys[0].text, "ESTÁVEL");
    assert.ok(sys[0].cache_control);
    assert.match(sys[1].text, /^## Estado da mesa agora\n\nCENA$/);
    assert.equal(sys[1].cache_control, undefined);
    assert.deepEqual(pedidos[0].corpo.output_config, { effort: "medium" });
    assert.equal(eventos.find((e) => e.tipo === "uso")?.cacheLido, 80);
  });

  it("abertura e fim de sessão sobem um degrau; resumo usa low", async () => {
    pedidos.length = 0;
    responder = (_p, res) => sse(res, [{ tipo: "texto", texto: "ok" }], "end_turn");
    await turno({ especial: true });
    assert.deepEqual(pedidos[0].corpo.output_config, { effort: "high" });
    await criarProvedorApi({ chave: "sk-ant-teste-0000", esforco: "high" }).texto({ sistema: "Resuma.", prompt: "x" });
    assert.deepEqual(pedidos[1].corpo.output_config, { effort: "low" });
  });

  it(`estourar ${16} rodadas: tool_choice none nas duas últimas, nenhuma ferramenta órfã e aviso`, async () => {
    pedidos.length = 0;
    // o modelo teimoso pede ferramenta em toda rodada, até com tool_choice none
    responder = (_p, res) => sse(res, [{ tipo: "texto", texto: "Rolo." }, { tipo: "ferramenta", nome: "rolar_dados", entrada: { expressao: "1d6" } }], "tool_use");
    const { eventos, executadas } = await turno();
    assert.equal(MAX_RODADAS, 16);
    assert.equal(pedidos.length, 16);
    assert.equal(executadas.length, 14, "só as 14 primeiras rodadas executam");
    const escolhas = pedidos.map((p) => (p.corpo.tool_choice as { type?: string } | undefined)?.type ?? null);
    assert.deepEqual(escolhas.slice(14), ["none", "none"]);
    assert.ok(escolhas.slice(0, 14).every((x) => x === null));
    // todo tool_use enviado ao modelo tem o tool_result logo depois (a 15ª volta com is_error, sem rodar)
    const ultimo = pedidos[15].corpo.messages as { role: string; content: unknown }[];
    const resultados = ultimo[ultimo.length - 1].content as { is_error?: boolean; content: string }[];
    assert.equal(resultados[0].is_error, true);
    assert.match(resultados[0].content, /limite de ações do turno/);
    assert.deepEqual(eventos.filter((e) => e.tipo === "aviso").map((e) => e.texto), [AVISO_LIMITE_RODADAS]);
    assert.ok(!eventos.some((e) => e.tipo === "texto" && /rolou dados demais/.test(e.texto ?? "")));
  });

  it("o modelo obedece o tool_choice none na penúltima: fecha com narração e avisa", async () => {
    pedidos.length = 0;
    responder = (p, res) =>
      (p.corpo.tool_choice as { type?: string } | undefined)?.type === "none"
        ? sse(res, [{ tipo: "texto", texto: "E a noite fecha." }], "end_turn")
        : sse(res, [{ tipo: "ferramenta", nome: "rolar_dados", entrada: {} }], "tool_use");
    const { eventos, executadas } = await turno();
    assert.equal(pedidos.length, 15);
    assert.equal(executadas.length, 14);
    assert.ok(eventos.some((e) => e.tipo === "texto" && e.texto?.includes("E a noite fecha.")));
    assert.equal(eventos.filter((e) => e.tipo === "aviso").length, 1);
  });

  it("recusa vira aviso (não narração)", async () => {
    responder = (_p, res) => sse(res, [], "refusal");
    const { eventos } = await turno();
    assert.equal(eventos.filter((e) => e.tipo === "aviso").length, 1);
    assert.ok(!eventos.some((e) => e.tipo === "texto"));
  });

  it("401 sobe como AuthenticationError e vira frase em português", async () => {
    responder = (_p, res) => erroHttp(res, 401, "authentication_error", "invalid x-api-key");
    await assert.rejects(turno(), (e: unknown) => e instanceof Anthropic.AuthenticationError && /não foi aceita/.test(traduzirErro(e).mensagem));
  });

  it("529 (sobrecarga) depois das tentativas do SDK vira 'sobrecarregada'", async () => {
    pedidos.length = 0;
    responder = (_p, res) => erroHttp(res, 529, "overloaded_error", "Overloaded");
    await assert.rejects(turno(), (e: unknown) => /sobrecarregada/.test(traduzirErro(e).mensagem));
    assert.equal(pedidos.length, 3, "1 pedido + 2 tentativas do SDK");
  });

  it("429: avisa que vai esperar, repete UMA vez além do SDK e então traduz", async () => {
    pedidos.length = 0;
    responder = (_p, res) => erroHttp(res, 429, "rate_limit_error", "rate limited");
    const eventos: { tipo: string; segundos?: number }[] = [];
    const p = criarProvedorApi({ chave: "sk-ant-teste-0000" });
    await assert.rejects(
      p.turno({ sistema: "E", contexto: "C", prompt: "a", ferramentas: [], executar: async () => null, ponte: { url: "", token: "" }, emitir: (e: { tipo: string }) => eventos.push(e) }),
      (e: unknown) => e instanceof Anthropic.RateLimitError && /esperar/.test(traduzirErro(e).mensagem),
    );
    assert.equal(pedidos.length, 6, "(1 + 2 do SDK) × 2");
    assert.equal(eventos.filter((e) => e.tipo === "aguardando").length, 1);
  });

  it("429 seguido de sucesso: o turno continua sozinho", async () => {
    let vez = 0;
    responder = (_p, res) => (vez++ < 3 ? erroHttp(res, 429, "rate_limit_error", "rate limited") : sse(res, [{ tipo: "texto", texto: "Voltei." }], "end_turn"));
    const { eventos } = await turno();
    assert.ok(eventos.some((e) => e.tipo === "aguardando"));
    assert.ok(eventos.some((e) => e.tipo === "texto" && e.texto === "Voltei."));
  });

  // por último: a recusa do beta vale para o resto do processo
  it("beta recusado: repete sem betas e segue sem eles", async () => {
    pedidos.length = 0;
    responder = (p, res) =>
      p.beta?.includes("server-side-fallback")
        ? erroHttp(res, 400, "invalid_request_error", "Unexpected value(s) `server-side-fallback-2026-07-01` for the `anthropic-beta` header.")
        : sse(res, [{ tipo: "texto", texto: "Sem beta." }], "end_turn");
    const { eventos } = await turno();
    assert.ok(pedidos[0].beta?.includes("server-side-fallback"));
    assert.ok(!pedidos[pedidos.length - 1].beta?.includes("server-side-fallback"));
    assert.equal(pedidos[pedidos.length - 1].corpo.fallbacks, undefined);
    assert.ok(eventos.some((e) => e.tipo === "texto" && e.texto === "Sem beta."));
  });
});
