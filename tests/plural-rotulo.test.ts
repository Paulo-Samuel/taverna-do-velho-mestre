import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const RAIZ = process.cwd();
const { pluralDoRotulo } = (await import(pathToFileURL(path.join(RAIZ, "src/lib/plural-rotulo.ts")).href)) as {
  pluralDoRotulo: (rotulo: string, n: number) => string;
};

test("rótulo composto: só a primeira palavra vai para o plural", () => {
  assert.equal(pluralDoRotulo("Tipo de Predador", 18), "tipos de predador");
  assert.equal(`${18} ${pluralDoRotulo("Tipo de Predador", 18)}`, "18 tipos de predador");
});

test("um só fica no singular, em minúsculas", () => {
  assert.equal(pluralDoRotulo("Clã", 1), "clã");
  assert.equal(pluralDoRotulo("Tipo de Predador", 1), "tipo de predador");
});

test("os rótulos que os sistemas usam hoje", () => {
  assert.equal(pluralDoRotulo("Clã", 13), "clãs");
  assert.equal(pluralDoRotulo("Classe", 12), "classes");
  assert.equal(pluralDoRotulo("Ocupação", 9), "ocupações");
  assert.equal(pluralDoRotulo("Origem", 6), "origens");
  assert.equal(pluralDoRotulo("Espécie", 9), "espécies");
  assert.equal(pluralDoRotulo("Raça", 7), "raças");
  assert.equal(pluralDoRotulo("Era", 3), "eras");
  assert.equal(pluralDoRotulo("Gênero", 5), "gêneros");
  assert.equal(pluralDoRotulo("Arquétipo", 6), "arquétipos");
  assert.equal(pluralDoRotulo("Ancestralidade", 48), "ancestralidades");
});

test("terminações em -l, -m, -r, -z e -s", () => {
  assert.equal(pluralDoRotulo("Nível", 3), "níveis");
  assert.equal(pluralDoRotulo("Papel", 2), "papéis");
  assert.equal(pluralDoRotulo("Animal", 2), "animais");
  assert.equal(pluralDoRotulo("Funil", 2), "funis");
  assert.equal(pluralDoRotulo("Fóssil", 2), "fósseis");
  assert.equal(pluralDoRotulo("Anzol", 2), "anzóis");
  assert.equal(pluralDoRotulo("Item", 2), "itens");
  assert.equal(pluralDoRotulo("Poder", 2), "poderes");
  assert.equal(pluralDoRotulo("Cruz", 2), "cruzes");
  assert.equal(pluralDoRotulo("Mês", 2), "meses");
  assert.equal(pluralDoRotulo("País", 2), "países");
  assert.equal(pluralDoRotulo("Lápis", 2), "lápis");
});

test("zero e vazio não quebram", () => {
  assert.equal(pluralDoRotulo("Classe", 0), "classes");
  assert.equal(pluralDoRotulo("  ", 3), "");
});
