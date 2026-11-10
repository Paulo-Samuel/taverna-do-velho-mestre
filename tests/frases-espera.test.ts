import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G17: frases da espera do mestre (modo rolagem), puras e determinísticas.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { FRASES_ESPERA, FRASES_DEMORA, ESPERA_DEMORADA_MS, esperaDemorada, fraseDaEspera } = await import(pathToFileURL(path.join(RAIZ, "src/components/historia/frases-espera.ts")).href);

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

describe("esperaDemorada", () => {
  it("vira aos 45 s", () => {
    assert.equal(ESPERA_DEMORADA_MS, 45_000);
    assert.equal(esperaDemorada(11, 4000), false); // 44 s
    assert.equal(esperaDemorada(44, 1000), false);
    assert.equal(esperaDemorada(45, 1000), true);
    assert.equal(esperaDemorada(12, 4000), true); // 48 s
    assert.equal(esperaDemorada(0, 4000), false);
  });

  it("valores não finitos dão falso", () => {
    assert.equal(esperaDemorada(NaN, 4000), false);
    assert.equal(esperaDemorada(12, NaN), false);
    assert.equal(esperaDemorada(Infinity, 4000), false);
  });
});

describe("fraseDaEspera com demora", () => {
  it("frases de demora seguem as regras das outras", () => {
    assert.ok(FRASES_DEMORA.length >= 3);
    assert.equal(new Set(FRASES_DEMORA).size, FRASES_DEMORA.length);
    for (const f of FRASES_DEMORA) {
      assert.ok(f.startsWith("O mestre"), f);
      assert.ok(f.length <= 60, `${f} (${f.length})`);
      assert.doesNotMatch(f, /\p{Extended_Pictographic}|—/u);
    }
  });

  it("é determinística e sai sempre de FRASES_DEMORA", () => {
    assert.equal(fraseDaEspera(0, 0, true), FRASES_DEMORA[0]);
    for (let s = -3; s < 12; s++)
      for (let p = 0; p < 12; p++) {
        const f = fraseDaEspera(s, p, true);
        assert.equal(f, fraseDaEspera(s, p, true));
        assert.ok(FRASES_DEMORA.includes(f), f);
        assert.notEqual(f, fraseDaEspera(s, p + 1, true));
      }
    assert.ok(FRASES_DEMORA.includes(fraseDaEspera(NaN, NaN, true)));
  });

  it("sem o terceiro argumento, nada muda", () => {
    assert.equal(fraseDaEspera(5, 2), fraseDaEspera(5, 2, false));
    assert.ok(FRASES_ESPERA.includes(fraseDaEspera(5, 2)));
  });
});
