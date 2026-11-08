import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AVENTURAS, aventuraPublica, aventurasPublicas, blocosDeApoio, linhasPessoais, roteiroParaMestre, textoDoSistema } from "../src/lib/aventuras";
import { PATHFINDER } from "../src/lib/aventuras/pathfinder";
import { VAMPIRO } from "../src/lib/aventuras/vampiro";

// W14: roteiros completos (sessões, encontros com números do sistema, 6 complicações), Vampiro para quem joga sozinho
// (aliado solo e Pedra de Toque amarrada) e o teto de ~1.200 caracteres para tudo o que entrou no roteiro do mestre.
//   node --test --import ./tests/_suporte/registrar.mjs tests/w14-roteiros.test.ts

/** Teto dos blocos novos (sessões + encontros + complicações + solo + Pedra) por aventura, em qualquer sistema dela. */
const TETO = 1260;
/** A masmorra de PF2e é feita de encontros: fica fora do teto (o w09 limita o tamanho total dela). */
const FORA_DO_TETO = new Set(["forja-afundada"]);
const NOVAS = ["primeira-noite-em-bh", "lista-de-nomes-no-recife", "carregamento-em-manaus"];
const SESSOES: Record<string, number> = { "one-shot": 1, "2 sessões": 2, "3 sessões": 3 };

const extras = (a: (typeof AVENTURAS)[number], s: string) => [...blocosDeApoio(a.roteiro, s), ...linhasPessoais(a)].join("\n").length;

/** Todas as linhas de stats de todas as aventuras, já resolvidas no sistema pedido. */
function linhasDeStats(sistema: string): { id: string; texto: string }[] {
  return AVENTURAS.filter((a) => a.sistemas.includes(sistema)).flatMap((a) =>
    (a.roteiro.encontros ?? []).map((e) => ({ id: `${a.id}/${e.nome}`, texto: textoDoSistema(e.inimigos, sistema) })),
  );
}
const numeros = (texto: string, re: RegExp) => [...texto.matchAll(re)].map((m) => Number(m[1].replace("−", "-")));

describe("roteiros completos", () => {
  it("toda aventura tem sessões na conta da duração, 2+ encontros e 6 complicações", () => {
    for (const a of AVENTURAS) {
      const r = a.roteiro;
      assert.equal(r.sessoes?.length, SESSOES[a.duracao], `${a.id}: ${r.sessoes?.length} sessões para "${a.duracao}"`);
      assert.ok((r.encontros?.length ?? 0) >= 2, `${a.id} com ${r.encontros?.length ?? 0} encontros`);
      assert.equal(r.complicacoes?.length, 6, `${a.id} com ${r.complicacoes?.length ?? 0} complicações`);
      for (const e of r.encontros ?? []) for (const campo of [e.nome, e.onde, e.tatica, e.saida]) assert.ok(campo.trim(), `${a.id}: encontro com campo vazio`);
    }
  });

  it("as 6 de Vampiro e as de PF2e estão completas (o pedido do pacote)", () => {
    assert.equal(VAMPIRO.length, 6);
    for (const a of [...VAMPIRO, ...PATHFINDER]) {
      const texto = roteiroParaMestre(a, false, a.sistemas[0]);
      for (const trecho of ["- Sessões", "- Encontros preparados", "- Complicações"]) assert.ok(texto.includes(trecho), `${a.id} sem "${trecho}"`);
    }
  });

  it(`os blocos novos cabem em ~1.200 caracteres (teto ${TETO}) em todos os sistemas de cada aventura`, (t) => {
    const linhas: string[] = [];
    for (const a of AVENTURAS) {
      const pior = Math.max(...a.sistemas.map((s) => extras(a, s)));
      const total = Math.max(...a.sistemas.map((s) => roteiroParaMestre(a, false, s).length));
      linhas.push(`${a.id.padEnd(38)} blocos ${String(pior).padStart(4)}  roteiro ${total}`);
      if (!FORA_DO_TETO.has(a.id)) assert.ok(pior <= TETO, `${a.id}: ${pior} caracteres nos blocos novos`);
    }
    t.diagnostic(`\n${linhas.join("\n")}`);
  });

  it("encontros de aventura aberta a várias fantasias trazem números para cada uma", () => {
    for (const a of AVENTURAS.filter((x) => x.sistemas.length > 1)) {
      for (const e of a.roteiro.encontros ?? []) {
        assert.equal(typeof e.inimigos, "object", `${a.id}/${e.nome}: stats de um sistema só numa aventura aberta`);
        for (const chave of ["pf2e", "osr", "pbta", "padrao"]) assert.ok((e.inimigos as Record<string, string>)[chave], `${a.id}/${e.nome} sem ${chave}`);
        for (const s of a.sistemas) {
          const texto = roteiroParaMestre(a, false, s);
          assert.ok(texto.includes(textoDoSistema(e.inimigos, s)), `${a.id}/${s} não imprimiu os números do sistema`);
          assert.ok(!texto.includes("[object Object]"), `${a.id}/${s} imprimiu o objeto`);
        }
      }
    }
  });
});

describe("números coerentes com o regrasParaMestre de cada sistema", () => {
  it("PF2e: CA ≈ 15 + nível (±2) e CDs de 15 a 24", () => {
    for (const { id, texto } of linhasDeStats("pf2e")) {
      for (const m of texto.matchAll(/nív\. (−?\d+): CA (\d+)/g)) {
        const nivel = Number(m[1].replace("−", "-"));
        const ca = Number(m[2]);
        assert.ok(Math.abs(ca - (15 + nivel)) <= 2, `${id}: nível ${nivel} com CA ${ca}`);
      }
      for (const cd of numeros(texto, /CD (\d+)/g)) assert.ok(cd >= 15 && cd <= 24, `${id}: CD ${cd}`);
    }
  });

  it("D&D 5e e PF1e (padrão): CA de 8 a 19", () => {
    for (const s of ["dnd5e", "pf1e"]) {
      for (const { id, texto } of linhasDeStats(s)) for (const ca of numeros(texto, /CA (\d+)/g)) assert.ok(ca >= 8 && ca <= 19, `${id} (${s}): CA ${ca}`);
    }
  });

  it("OSR: CA ascendente de 10 a 18, até 8 DV e moral de 2 a 12", () => {
    for (const { id, texto } of linhasDeStats("osr")) {
      for (const ca of numeros(texto, /CA (\d+)/g)) assert.ok(ca >= 10 && ca <= 18, `${id}: CA ${ca}`);
      for (const dv of numeros(texto, /(\d+) DV/g)) assert.ok(dv <= 8, `${id}: ${dv} DV`);
      for (const moral of numeros(texto, /moral (\d+)/g)) assert.ok(moral >= 2 && moral <= 12, `${id}: moral ${moral}`);
      assert.doesNotMatch(texto, /nív\./, `${id}: nível de PF2e no OSR`);
    }
  });

  it("PbtA: PV de horda, grupo ou solitário (3/6/12, +4 grande, +8 enorme) e sem CA", () => {
    for (const { id, texto } of linhasDeStats("pbta")) {
      for (const pv of numeros(texto, /(\d+) PV/g)) assert.ok([3, 6, 12, 16, 20].includes(pv), `${id}: ${pv} PV`);
      assert.doesNotMatch(texto, /\bCA \d/, `${id}: CA no PbtA`);
    }
  });

  it("V5: Saúde de 3 a 10 e paradas de até 9 dados", () => {
    for (const { id, texto } of linhasDeStats("vtm5")) {
      for (const saude of numeros(texto, /Saúde (\d+)/g)) assert.ok(saude >= 3 && saude <= 10, `${id}: Saúde ${saude}`);
      for (const dados of numeros(texto, /(\d+) dados/g)) assert.ok(dados >= 1 && dados <= 9, `${id}: ${dados} dados`);
      assert.doesNotMatch(texto, /\bCA \d|\bPV \d/, `${id}: número de d20 no Vampiro`);
    }
  });

  it("d100 com PV e porcentagem; Fate na escala de adjetivos (+N), sem CA nem PV", () => {
    for (const { id, texto } of linhasDeStats("d100")) assert.match(texto, /PV \d+.*\d+%/, id);
    for (const { id, texto } of linhasDeStats("fate")) {
      assert.match(texto, /\+\d/, id);
      assert.doesNotMatch(texto, /\bCA \d|\bPV \d/, id);
    }
  });
});

describe("Vampiro para quem joga sozinho", () => {
  it("as três novas existem, rodam só no V5 e fogem do eixo SP-RJ-BSB", () => {
    const cidades: Record<string, RegExp> = { "primeira-noite-em-bh": /Belo Horizonte/, "lista-de-nomes-no-recife": /Recife/, "carregamento-em-manaus": /Manaus/ };
    for (const id of NOVAS) {
      const a = VAMPIRO.find((x) => x.id === id);
      assert.ok(a, `${id} não existe`);
      assert.deepEqual(a.sistemas, ["vtm5"]);
      assert.match(a.cenario, cidades[id]);
    }
    assert.equal(VAMPIRO.find((a) => a.id === "primeira-noite-em-bh")?.duracao, "one-shot");
    assert.equal(VAMPIRO.find((a) => a.id === "lista-de-nomes-no-recife")?.duracao, "2 sessões");
    assert.equal(VAMPIRO.find((a) => a.id === "carregamento-em-manaus")?.duracao, "3 sessões");
  });

  it("as 6 de Vampiro têm aliado solo e Pedra de Toque amarrada, e o roteiro imprime as duas frases", () => {
    for (const a of VAMPIRO) {
      assert.ok(a.solo?.aliado, `${a.id} sem aliado solo`);
      assert.ok(a.pedraEmJogo, `${a.id} sem pedraEmJogo`);
      const texto = roteiroParaMestre(a, false, "vtm5");
      assert.ok(texto.includes(`- Solo: se a mesa tiver um só personagem, ${a.solo.aliado}`), `${a.id} sem a frase do solo`);
      assert.match(texto, /- Solo: [^\n]*, acompanha e pode morrer\./, `${a.id}: o aposto do aliado não fecha com vírgula`);
      assert.ok(texto.includes(`- Amarre a Pedra de Toque (nome da ficha): ${a.pedraEmJogo}`), `${a.id} sem a linha da Pedra`);
    }
  });

  it("nada no que o jogador lê nem no recomendado pressupõe coterie", () => {
    for (const a of VAMPIRO) {
      assert.doesNotMatch(a.abertura, /coterie|vocês/i, `${a.id}: abertura no plural`);
      assert.doesNotMatch(a.cenario, /\bcoterie\b|\bvocês\b/i, `${a.id}: cenário no plural`);
      assert.ok(!a.recomendado || !/coterie/.test(a.recomendado) || /sozinho ou em coterie/.test(a.recomendado), `${a.id}: recomendado "${a.recomendado}"`);
    }
  });

  it("o navegador recebe só o \"solo ok\", nunca o nome do aliado nem a Pedra", () => {
    for (const a of AVENTURAS) {
      const p = aventuraPublica(a);
      assert.equal(p.soloOk === true, Boolean(a.solo), `${a.id}: soloOk errado`);
      const json = JSON.stringify(p);
      if (a.solo) assert.ok(!json.includes(a.solo.aliado), `${a.id}: aliado vazou`);
      if (a.pedraEmJogo) assert.ok(!json.includes(a.pedraEmJogo), `${a.id}: Pedra vazou`);
      assert.ok(!("roteiro" in p) && !("abertura" in p) && !("solo" in p) && !("pedraEmJogo" in p), `${a.id}: campo secreto no público`);
    }
    const v5 = aventurasPublicas("vtm5");
    assert.equal(v5.length, 6);
    assert.ok(v5.every((a) => a.soloOk && a.recomendado), "toda aventura de V5 mostra recomendado e solo ok");
  });

  it("ids continuam únicos e as aventuras do modo história também rodam solo", () => {
    const ids = AVENTURAS.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const a of AVENTURAS.filter((x) => x.sistemas[0] === "historia")) assert.ok(a.solo, `${a.id} sem aliado`);
  });
});
