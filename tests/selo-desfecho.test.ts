import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G17: selos da ação (chip da perícia, grau e dado natural), lógica pura.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { seloDoDesfecho } = await import(pathToFileURL(path.join(RAIZ, "src/components/historia/selo-desfecho.ts")).href);

describe("seloDoDesfecho", () => {
  it("falha crítica com 1 natural em d20", () => {
    const s = seloDoDesfecho({ teste: "Acrobacia", grau: "falha_critica", natural: 1, d20: true });
    assert.equal(s.chip.texto, "Acrobacia");
    assert.notEqual(s.chip.classe, null);
    assert.equal(s.chip.titulo, "Teste físico");
    assert.equal(s.grau.texto, "Falha crítica");
    assert.equal(s.grau.rolando, false);
    assert.equal(s.grau.critico, true);
    assert.equal(s.natural.valor, 1);
    assert.equal(s.natural.icone, "skull");
    assert.equal(s.leitor, "Acrobacia, teste físico: falha crítica, 1 natural");
  });

  it("20 natural em d20", () => {
    const s = seloDoDesfecho({ teste: "Persuasão", grau: "sucesso_critico", natural: 20, d20: true });
    assert.equal(s.natural.valor, 20);
    assert.equal(s.natural.texto, "20 natural");
    assert.equal(s.natural.icone, "sparkle");
    assert.equal(s.grau.critico, true);
    assert.match(s.leitor, /20 natural$/);
  });

  it("fora do d20 o selo natural não aparece", () => {
    assert.equal(seloDoDesfecho({ teste: "Acrobacia", grau: "falha", natural: 1, d20: false }).natural, null);
    assert.equal(seloDoDesfecho({ teste: "Acrobacia", grau: "sucesso", natural: 20, d20: false }).natural, null);
    assert.equal(seloDoDesfecho({ teste: "Acrobacia", grau: "sucesso", natural: 20 }).natural, null);
  });

  it("natural comum ou ausente não vira selo", () => {
    assert.equal(seloDoDesfecho({ teste: "Acrobacia", grau: "sucesso", natural: 7, d20: true }).natural, null);
    assert.equal(seloDoDesfecho({ teste: "Acrobacia", grau: "sucesso", natural: null, d20: true }).natural, null);
    assert.equal(seloDoDesfecho({ teste: "Acrobacia", grau: "sucesso", d20: true }).natural, null);
  });

  it("enquanto rola não há grau nem natural", () => {
    const s = seloDoDesfecho({ teste: "Acrobacia", grau: null, natural: 20, d20: true });
    assert.equal(s.grau.rolando, true);
    assert.equal(s.grau.cor, null);
    assert.equal(s.grau.critico, false);
    assert.equal(s.natural, null);
    assert.equal(s.leitor, "Acrobacia, teste físico: rolando");
  });

  it("perícia desconhecida fica neutra, sem quebrar", () => {
    const s = seloDoDesfecho({ teste: "Xablau", grau: "sucesso", natural: 12, d20: true });
    assert.equal(s.chip.texto, "Xablau");
    assert.equal(s.chip.classe, null);
    assert.equal(s.chip.titulo, null);
    assert.equal(s.leitor, "Xablau: sucesso");
  });

  it("grau fora da tabela aparece como veio, sem cor", () => {
    const s = seloDoDesfecho({ teste: "Atletismo", grau: "empate", natural: 3, d20: true });
    assert.equal(s.grau.texto, "empate");
    assert.equal(s.grau.cor, null);
    assert.equal(s.grau.critico, false);
    assert.equal(s.grau.rolando, false);
  });

  it("toda cor devolvida vem de token do tema", () => {
    for (const grau of ["sucesso_critico", "sucesso", "parcial", "falha", "falha_critica"]) {
      for (const natural of [1, 20]) {
        const s = seloDoDesfecho({ teste: "Atletismo", grau, natural, d20: true });
        // a falha crítica é uma mistura (color-mix) a partir do --sangue: continua vindo de token, mas não começa por "var("
        assert.ok(s.grau.cor.includes("var(--"), `${grau}: ${s.grau.cor}`);
        assert.ok(s.natural.cor.includes("var(--"), `natural ${natural}: ${s.natural.cor}`);
      }
    }
  });
});
