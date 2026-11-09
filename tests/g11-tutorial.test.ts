import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AVENTURAS, aventuraPublica, aventuraTutorial, aventurasPublicas, roteiroParaMestre } from "../src/lib/aventuras";
import { linkDaAventura } from "../src/lib/aventuras/link";

// G11: aventura-tutorial do modo história (primeira vez na taverna) e integridade do catálogo de aventuras.
//   node --test --import ./tests/_suporte/registrar.mjs tests/g11-tutorial.test.ts

const ID = "lanterna-da-ponte-velha";
const DURACOES = new Set(["one-shot", "2 sessões", "3 sessões", "3 a 5 sessões"]);

describe("integridade do catálogo de aventuras", () => {
  it("ids únicos, em kebab-case", () => {
    const ids = AVENTURAS.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, id);
  });

  it("toda aventura tem os campos obrigatórios preenchidos", () => {
    for (const a of AVENTURAS) {
      assert.ok(a.sistemas.length > 0, `${a.id} sem sistema`);
      for (const campo of ["titulo", "chamada", "tom", "cenario", "abertura"] as const) assert.ok(a[campo]?.trim(), `${a.id} sem ${campo}`);
      assert.ok(a.tom.length <= 60, `${a.id}: tom com ${a.tom.length} caracteres`);
      assert.ok(DURACOES.has(a.duracao), `${a.id}: duração "${a.duracao}"`);
      const r = a.roteiro;
      assert.ok(r.verdade.trim(), `${a.id} sem verdade`);
      for (const lista of [r.npcs, r.locais, r.pistas, r.reviravoltas, r.relogio, r.finais] as unknown[][]) assert.ok(lista.length > 0, `${a.id} com lista vazia`);
      for (const n of r.npcs) for (const c of [n.nome, n.quem, n.voz, n.quer, n.segredo]) assert.ok(c.trim(), `${a.id}: NPC com campo vazio`);
    }
  });

  it("só uma aventura é tutorial", () => {
    assert.deepEqual(
      AVENTURAS.filter((a) => a.tutorial).map((a) => a.id),
      [ID],
    );
  });
});

describe("A Lanterna da Ponte Velha (tutorial)", () => {
  const a = AVENTURAS.find((x) => x.id === ID)!;

  it("existe, é do modo história, curta e com 1 local, 2 NPCs e aliado solo", () => {
    assert.ok(a);
    assert.deepEqual(a.sistemas, ["historia"]);
    assert.equal(a.duracao, "one-shot");
    assert.equal(a.roteiro.npcs.length, 2);
    assert.equal(a.roteiro.locais.length, 1);
    assert.ok(a.solo?.aliado);
  });

  it("chamada e recomendado dizem \"Primeira vez? Comece por aqui\"", () => {
    assert.match(a.chamada, /Primeira vez\? Comece por aqui/);
    assert.match(a.recomendado ?? "", /Primeira vez\? Comece por aqui/);
  });

  it("o roteiro ensina na ordem: conversa, teste, ações sugeridas e decisão", () => {
    const v = a.roteiro.verdade;
    const posicoes = ["(1) Conversa", "(2) Teste", "(3) Escolha", "(4) Decisão"].map((t) => v.indexOf(t));
    assert.ok(posicoes.every((p) => p >= 0), `etapa faltando: ${posicoes}`);
    assert.deepEqual([...posicoes].sort((x, y) => x - y), posicoes);
    assert.match(v, /CD \d+/);
    assert.ok(a.roteiro.finais.length >= 2, "a decisão precisa de mais de uma consequência");
  });

  it("aparece primeiro na lista do modo história e na lista geral", () => {
    assert.equal(aventurasPublicas("historia")[0].id, ID);
    assert.equal(aventurasPublicas()[0].id, ID);
    assert.equal(aventuraTutorial()?.id, ID);
    assert.equal(linkDaAventura(aventuraTutorial()!), `/nova?aventura=${ID}`);
  });

  it("o navegador recebe o selo de tutorial, mas nunca o roteiro", () => {
    const p = aventuraPublica(a);
    assert.equal(p.tutorial, true);
    const json = JSON.stringify(p);
    assert.ok(!("roteiro" in p) && !("abertura" in p) && !("solo" in p));
    assert.ok(!json.includes("Faísca"), "o segredo do fogo-fátuo vazou");
    for (const outra of AVENTURAS.filter((x) => !x.tutorial)) assert.ok(!("tutorial" in aventuraPublica(outra)), `${outra.id} com selo de tutorial`);
  });

  it("o roteiro do mestre sai inteiro, sem objeto vazado", () => {
    const texto = roteiroParaMestre(a, true, "historia");
    for (const trecho of ["- Abertura", "- Sessões", "- Encontros preparados", "- Complicações", "- Solo:"]) assert.ok(texto.includes(trecho), `sem "${trecho}"`);
    assert.ok(!texto.includes("[object Object]"));
  });
});
