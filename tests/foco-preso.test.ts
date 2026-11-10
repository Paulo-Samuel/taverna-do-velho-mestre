import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const RAIZ = process.cwd();
const { SELETOR_FOCAVEL, proximoFoco } = (await import(pathToFileURL(path.join(RAIZ, "src/lib/foco-preso.ts")).href)) as {
  SELETOR_FOCAVEL: string;
  proximoFoco: (total: number, atual: number, paraTras: boolean) => number | null;
};

test("o seletor cobre os focáveis de sempre e deixa de fora o que está desligado", () => {
  for (const pedaco of ["a[href]", "button:not([disabled])", 'input:not([disabled]):not([type="hidden"])', "summary", '[tabindex]:not([tabindex="-1"])']) {
    assert.ok(SELETOR_FOCAVEL.includes(pedaco), pedaco);
  }
});

test("sem nenhum focável não há para onde mandar o foco", () => {
  assert.equal(proximoFoco(0, -1, false), null);
  assert.equal(proximoFoco(0, 0, true), null);
  assert.equal(proximoFoco(-2, 0, false), null);
});

test("foco fora da lista entra pela ponta certa", () => {
  assert.equal(proximoFoco(4, -1, false), 0);
  assert.equal(proximoFoco(4, -1, true), 3);
});

test("Tab no último volta ao primeiro", () => {
  assert.equal(proximoFoco(4, 3, false), 0);
});

test("Shift+Tab no primeiro vai ao último", () => {
  assert.equal(proximoFoco(4, 0, true), 3);
});

test("no meio do caminho o Tab nativo resolve", () => {
  assert.equal(proximoFoco(4, 1, false), null);
  assert.equal(proximoFoco(4, 2, true), null);
  assert.equal(proximoFoco(4, 0, false), null);
  assert.equal(proximoFoco(4, 3, true), null);
});

test("com um focável só, o foco fica nele nos dois sentidos", () => {
  assert.equal(proximoFoco(1, 0, false), 0);
  assert.equal(proximoFoco(1, 0, true), 0);
  assert.equal(proximoFoco(1, -1, false), 0);
  assert.equal(proximoFoco(1, -1, true), 0);
});
