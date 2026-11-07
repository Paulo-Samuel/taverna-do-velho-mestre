// node --test tests/http.test.mjs
// O embrulho das chamadas HTTP do navegador (src/lib/cliente/http.ts): nunca rejeita, traduz rede caída e erros da rota.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { mensagemDeErro, pedir, postarJson, SEM_SINAL } from "../src/lib/cliente/http.ts";

const fetchOriginal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

/** Um fetch de mentira: devolve a resposta dada ou rejeita como o navegador faz sem rede. */
function fingirFetch(resposta) {
  const chamadas = [];
  globalThis.fetch = async (url, init) => {
    chamadas.push({ url, init });
    if (resposta instanceof Error) throw resposta;
    return resposta;
  };
  return chamadas;
}

test("sem rede: não rejeita, devolve o aviso de sem sinal e marca semRede", async () => {
  fingirFetch(new TypeError("Failed to fetch"));
  const r = await pedir("/api/campanhas/1/acao", { method: "POST" });
  assert.equal(r.ok, false);
  assert.equal(r.semRede, true);
  assert.equal(r.status, 0);
  assert.equal(r.erro, SEM_SINAL);
});

test("rota respondeu com erro: usa a mensagem da rota", async () => {
  fingirFetch(Response.json({ erro: "Escolha com qual personagem você está agindo." }, { status: 400 }));
  const r = await postarJson("/api/campanhas/1/acao", { acao: "abro a porta" });
  assert.equal(r.ok, false);
  assert.equal(r.semRede, false);
  assert.equal(r.status, 400);
  assert.equal(r.erro, "Escolha com qual personagem você está agindo.");
});

test("rota respondeu com erro sem corpo JSON: cai no código", async () => {
  fingirFetch(new Response("Internal Server Error", { status: 500 }));
  const r = await pedir("/api/campanhas/1/controle");
  assert.equal(r.ok, false);
  assert.equal(r.erro, "Erro 500");
});

test("sucesso: devolve o corpo já lido", async () => {
  const chamadas = fingirFetch(Response.json({ pendente: { id: 7 } }, { status: 202 }));
  const r = await postarJson("/api/campanhas/1/acao", { acao: "olho em volta", personagemId: 3 });
  assert.equal(r.ok, true);
  assert.equal(r.status, 202);
  assert.deepEqual(r.corpo, { pendente: { id: 7 } });
  // o POST vai com JSON e o cabeçalho certo
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].init.method, "POST");
  assert.equal(chamadas[0].init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(chamadas[0].init.body), { acao: "olho em volta", personagemId: 3 });
});

test("sucesso com corpo vazio: corpo vira objeto vazio em vez de estourar", async () => {
  fingirFetch(new Response(null, { status: 204 }));
  const r = await pedir("/api/campanhas/1/presenca");
  assert.equal(r.ok, true);
  assert.deepEqual(r.corpo, {});
});

test("mensagemDeErro ignora corpos sem `erro` de texto", () => {
  assert.equal(mensagemDeErro(409, { erro: "Esse teste já foi rolado." }), "Esse teste já foi rolado.");
  assert.equal(mensagemDeErro(403, { erro: 42 }), "Erro 403");
  assert.equal(mensagemDeErro(500, null), "Erro 500");
  assert.equal(mensagemDeErro(502, "texto solto"), "Erro 502");
});
