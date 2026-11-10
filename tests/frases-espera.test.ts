import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G17: frases da espera do mestre (modo rolagem), puras e determinísticas.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { FRASES_ESPERA, fraseDaEspera } = await import(pathToFileURL(path.join(RAIZ, "src/components/historia/frases-espera.ts")).href);

describe("FRASES_ESPERA", () => {
  it("tem pelo menos 6 frases, todas diferentes", () => {
    assert.ok(FRASES_ESPERA.length >= 6);
    assert.equal(new Set(FRASES_ESPERA).size, FRASES_ESPERA.length);
  });

  it("frases curtas, sem emoji, começando com 'O mestre'", () => {
    for (const f of FRASES_ESPERA) {
      assert.ok(f.startsWith("O mestre"), f);
      assert.ok(f.length <= 60, `${f} (${f.length})`);
      assert.doesNotMatch(f, /\p{Extended_Pictographic}/u);
    }
  });
});

describe("fraseDaEspera", () => {
  it("é determinística", () => {
    assert.equal(fraseDaEspera(12, 3), fraseDaEspera(12, 3));
    assert.equal(fraseDaEspera(0, 0), FRASES_ESPERA[0]);
  });

  it("passos consecutivos dão frases diferentes", () => {
    for (let s = 0; s < 20; s++) for (let p = 0; p < 20; p++) assert.notEqual(fraseDaEspera(s, p), fraseDaEspera(s, p + 1));
  });

  it("dá a volta na lista", () => {
    assert.equal(fraseDaEspera(0, FRASES_ESPERA.length), FRASES_ESPERA[0]);
  });

  it("semente negativa, fracionária, NaN e infinita não quebram", () => {
    for (const [s, p] of [
      [-5, 0],
      [3.7, 1.2],
      [NaN, 0],
      [0, NaN],
      [NaN, NaN],
      [Infinity, 2],
      [4, -3],
    ]) {
      assert.ok(FRASES_ESPERA.includes(fraseDaEspera(s, p)), `${s}, ${p}`);
    }
  });
});
