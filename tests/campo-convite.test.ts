import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const RAIZ = process.cwd();
const { LIMITE_ACAO, AVISAR_A_PARTIR, faltam, rotuloFaltam } = (await import(
  pathToFileURL(path.join(RAIZ, "src/components/historia/campo-convite.ts")).href
)) as {
  LIMITE_ACAO: number;
  AVISAR_A_PARTIR: number;
  faltam: (texto: string) => number | null;
  rotuloFaltam: (n: number) => string;
};

test("os limites são os combinados", () => {
  assert.equal(LIMITE_ACAO, 2000);
  assert.equal(AVISAR_A_PARTIR, 1800);
});

test("o contador fica escondido até 1800 caracteres", () => {
  assert.equal(faltam(""), null);
  assert.equal(faltam("a".repeat(1800)), null);
});

test("acima de 1800 o contador diz quanto falta", () => {
  assert.equal(faltam("a".repeat(1801)), 199);
  assert.equal(faltam("a".repeat(1980)), 20);
  assert.equal(faltam("a".repeat(2000)), 0);
});

test("texto maior que o limite nunca dá número negativo", () => {
  assert.equal(faltam("a".repeat(2001)), 0);
  assert.equal(faltam("a".repeat(5000)), 0);
});

test("o rótulo fala em pergaminho, singular e plural", () => {
  assert.equal(rotuloFaltam(0), "acabou o pergaminho");
  assert.equal(rotuloFaltam(1), "falta 1");
  assert.equal(rotuloFaltam(37), "faltam 37");
});
