import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AVENTURAS, aventuraDoSistema, aventurasDoSistema, recompensaDoSistema, roteiroParaMestre } from "../src/lib/aventuras";
import { FANTASIA, FANTASIAS } from "../src/lib/aventuras/fantasia";
import { PATHFINDER } from "../src/lib/aventuras/pathfinder";
import { dnd5e } from "../src/lib/sistemas/dnd5e";
import { pf1e } from "../src/lib/sistemas/pf1e";
import { pf2e } from "../src/lib/sistemas/pf2e";

// W09: as 11 aventuras de fantasia rodam em qualquer fantasia da taverna (dnd5e, pf2e, pf1e, osr, pbta), com recompensa por
// sistema e pistas sem nome de perícia; "A Forja Afundada" é só do PF2e. roteiroParaMestre é o que entra no prompt.
//   node --test --import ./tests/_suporte/registrar.mjs tests/w09-aventuras.test.ts

const MASMORRA = "forja-afundada";
const fantasia = [...FANTASIA, ...PATHFINDER.filter((a) => a.id !== MASMORRA)];
const forja = PATHFINDER.find((a) => a.id === MASMORRA)!;

/** Nomes de perícia dos sistemas d20 da casa: nenhum pode aparecer numa pista das aventuras abertas. */
const PERICIAS = [...new Set([dnd5e, pf2e, pf1e].flatMap((s) => s.pericias.map((p) => p.nome)))];
const citaPericia = (texto: string) => PERICIAS.filter((nome) => new RegExp(`(^|[^\\p{L}])${nome}([^\\p{L}]|$)`, "u").test(texto));

describe("aventuras de fantasia abertas", () => {
  it("são 11 e rodam nos cinco sistemas de fantasia", () => {
    assert.equal(fantasia.length, 11);
    for (const a of fantasia) for (const s of FANTASIAS) assert.ok(a.sistemas.includes(s), `${a.id} não roda em ${s}`);
  });

  it("a mesa de PF2e lista pelo menos 12 aventuras (as 11 abertas e a masmorra)", () => {
    const ids = aventurasDoSistema("pf2e").map((a) => a.id);
    assert.ok(ids.length >= 12, `pf2e com ${ids.length}`);
    assert.ok(ids.includes(MASMORRA));
    for (const a of fantasia) assert.ok(ids.includes(a.id), `${a.id} fora da lista do pf2e`);
  });

  it("a masmorra nova aparece só para o PF2e", () => {
    assert.deepEqual(forja.sistemas, ["pf2e"]);
    for (const s of ["dnd5e", "pf1e", "osr", "pbta", "historia", "vtm5", "fate", "d100"]) {
      assert.ok(!aventurasDoSistema(s).some((a) => a.id === MASMORRA), `a masmorra vazou para ${s}`);
      assert.equal(aventuraDoSistema(MASMORRA, s), null);
    }
    assert.equal(aventuraDoSistema(MASMORRA, "pf2e")?.id, MASMORRA);
  });

  it("o cartão do início continua com o sistema de origem na frente", () => {
    const origem: Record<string, string> = {
      "mina-que-canta": "dnd5e",
      "casamento-do-rei-goblin": "dnd5e",
      "torre-do-mago-endividado": "pf1e",
      "lobo-de-tres-invernos": "pf1e",
      "cripta-do-abade-guloso": "osr",
      "ilha-do-farol-apagado": "osr",
      "porta-no-fundo-do-poco": "pbta",
      "cacada-ao-cervo-de-prata": "pbta",
      "feira-dos-automatos": "pf2e",
      "kobolds-pedem-socorro": "pf2e",
      "barco-das-doze-lanternas": "pf2e",
    };
    for (const a of fantasia) assert.equal(a.sistemas[0], origem[a.id], a.id);
  });

  it("nenhuma pista cita perícia de um sistema só", () => {
    for (const a of fantasia) {
      for (const p of a.roteiro.pistas) {
        const achadas = citaPericia(p);
        assert.deepEqual(achadas, [], `${a.id}: "${p}" cita ${achadas.join(", ")}`);
      }
    }
  });

  it("ids continuam únicos no catálogo inteiro", () => {
    const ids = AVENTURAS.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe("recompensas por sistema", () => {
  it("recompensaDoSistema escolhe a do sistema, cai na padrao e aceita texto único", () => {
    assert.equal(recompensaDoSistema("tudo igual", "osr"), "tudo igual");
    assert.equal(recompensaDoSistema({ padrao: "p", osr: "o" }, "osr"), "o");
    assert.equal(recompensaDoSistema({ padrao: "p", osr: "o" }, "dnd5e"), "p");
    assert.equal(recompensaDoSistema({ padrao: "p", osr: "o" }), "p");
    assert.equal(recompensaDoSistema({ pf2e: "x" }, "osr"), "x");
  });

  it("cada roteiro de fantasia imprime a recompensa do sistema pedido", () => {
    for (const a of fantasia) {
      assert.equal(typeof a.roteiro.recompensas, "object", `${a.id} ainda tem recompensa única`);
      for (const s of FANTASIAS) {
        const texto = roteiroParaMestre(a, false, s);
        const linha = texto.split("\n").find((l) => l.startsWith("- Recompensas: "));
        assert.ok(linha, `${a.id}/${s} sem linha de recompensas`);
        assert.equal(linha.slice("- Recompensas: ".length), recompensaDoSistema(a.roteiro.recompensas, s), `${a.id}/${s}`);
        // o objeto inteiro nunca vaza para o prompt
        assert.ok(!texto.includes("[object Object]"), `${a.id}/${s} imprimiu o objeto`);
      }
    }
  });

  it("ouro = XP só na recompensa do OSR", () => {
    const ouroXp = /ouro conta XP|conta XP como ouro|ouro = XP/i;
    for (const a of fantasia) {
      assert.match(recompensaDoSistema(a.roteiro.recompensas, "osr"), ouroXp, `${a.id} (osr) sem ouro = XP`);
      for (const s of FANTASIAS.filter((x) => x !== "osr")) {
        assert.doesNotMatch(recompensaDoSistema(a.roteiro.recompensas, s), ouroXp, `${a.id} (${s}) com ouro = XP`);
      }
    }
  });

  it("sem sistema (chamada antiga), o roteiro sai com a recompensa padrão", () => {
    const a = fantasia[0];
    assert.ok(roteiroParaMestre(a).includes(`- Recompensas: ${recompensaDoSistema(a.roteiro.recompensas)}`));
  });
});

describe("A Forja Afundada", () => {
  it("é masmorra de PF2e nível 3 a 5 em 3 sessões, com três facções e chefe de duas fases", () => {
    assert.equal(forja.duracao, "3 sessões");
    assert.match(forja.recomendado ?? "", /nível 3 a 5/);
    const texto = roteiroParaMestre(forja, true, "pf2e");
    for (const trecho of ["kobold", "Culto", "elemental", "Fase 1", "Fase 2", "Sessões", "Encontros preparados"]) {
      assert.ok(texto.includes(trecho), `roteiro sem "${trecho}"`);
    }
    assert.equal(forja.roteiro.sessoes?.length, 3);
    assert.ok((forja.roteiro.encontros?.length ?? 0) >= 4);
  });

  it("as armadilhas e os encontros usam CDs da tabela por nível do PF2e (18 a 24)", () => {
    const cds = [...roteiroParaMestre(forja, false, "pf2e").matchAll(/CD (\d+)/g)].map((m) => Number(m[1]));
    assert.ok(cds.length >= 8, `poucas CDs: ${cds.length}`);
    for (const cd of cds) assert.ok(cd >= 18 && cd <= 24, `CD ${cd} fora da faixa de nível 3 a 5`);
  });

  it("cabe no prompt sem estourar o dobro das outras aventuras", () => {
    const tamanho = roteiroParaMestre(forja, false, "pf2e").length;
    const maiorDasOutras = Math.max(...AVENTURAS.filter((a) => a.id !== MASMORRA).map((a) => roteiroParaMestre(a, false, a.sistemas[0]).length));
    assert.ok(tamanho <= maiorDasOutras * 2.5, `${tamanho} caracteres (as outras chegam a ${maiorDasOutras})`);
  });
});
