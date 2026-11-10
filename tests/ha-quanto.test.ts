import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const RAIZ = process.cwd();
const { haQuanto } = (await import(pathToFileURL(path.join(RAIZ, "src/lib/ha-quanto.ts")).href)) as {
  haQuanto: (quando: Date | number, agora?: number) => string;
};

const AGORA = Date.UTC(2026, 10, 9, 12, 0, 0);
const SEG = 1000;
const MIN = 60 * SEG;
const HORA = 60 * MIN;
const DIA = 24 * HORA;
const atras = (ms: number) => haQuanto(AGORA - ms, AGORA);

test("menos de um minuto é agora há pouco", () => {
  assert.equal(atras(0), "agora há pouco");
  assert.equal(atras(30 * SEG), "agora há pouco");
  assert.equal(atras(59 * SEG), "agora há pouco");
});

test("minutos e horas", () => {
  assert.equal(atras(54 * MIN), "há 54 minutos");
  assert.equal(atras(22 * HORA), "há 22 horas");
});

test("ontem, anteontem e dias", () => {
  assert.equal(atras(1 * DIA), "ontem");
  assert.equal(atras(2 * DIA), "anteontem");
  assert.equal(atras(5 * DIA), "há 5 dias");
});

test("passou de um mês, conta em meses", () => {
  assert.match(atras(45 * DIA), /mês|meses/);
  assert.equal(atras(90 * DIA), "há 3 meses");
});

test("passou de um ano, conta em anos", () => {
  assert.equal(atras(3 * 365 * DIA), "há 3 anos");
});

test("aceita Date e número, e o agora padrão é o relógio", () => {
  assert.equal(haQuanto(new Date(AGORA - 54 * MIN), AGORA), "há 54 minutos");
  assert.equal(haQuanto(Date.now() - 5 * SEG), "agora há pouco");
});
