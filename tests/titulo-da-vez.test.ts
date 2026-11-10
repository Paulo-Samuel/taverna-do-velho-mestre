import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const RAIZ = process.cwd();
const { tituloDaVez } = (await import(pathToFileURL(path.join(RAIZ, "src/lib/cliente/titulo-da-vez.ts")).href)) as {
  tituloDaVez: (base: string, estado: "vez" | "dado" | null) => string;
};

const BASE = "A Cripta · Taverna do Velho Mestre";

test("põe o aviso na frente do título", () => {
  assert.equal(tituloDaVez(BASE, "vez"), `Sua vez · ${BASE}`);
  assert.equal(tituloDaVez(BASE, "dado"), `Dado na mesa · ${BASE}`);
});

test("sem estado, o título fica como estava", () => {
  assert.equal(tituloDaVez(BASE, null), BASE);
});

test("aplicar duas vezes dá no mesmo", () => {
  assert.equal(tituloDaVez(tituloDaVez(BASE, "vez"), "vez"), `Sua vez · ${BASE}`);
  assert.equal(tituloDaVez(tituloDaVez(BASE, "dado"), "dado"), `Dado na mesa · ${BASE}`);
  assert.equal(tituloDaVez(tituloDaVez(BASE, null), null), BASE);
});

test("troca um aviso pelo outro sem empilhar", () => {
  assert.equal(tituloDaVez(tituloDaVez(BASE, "vez"), "dado"), `Dado na mesa · ${BASE}`);
  assert.equal(tituloDaVez(tituloDaVez(BASE, "dado"), "vez"), `Sua vez · ${BASE}`);
});

test("tirar o aviso devolve o título limpo", () => {
  assert.equal(tituloDaVez(`Sua vez · ${BASE}`, null), BASE);
  assert.equal(tituloDaVez(`Dado na mesa · ${BASE}`, null), BASE);
  assert.equal(tituloDaVez(`Sua vez · Dado na mesa · ${BASE}`, null), BASE);
});
