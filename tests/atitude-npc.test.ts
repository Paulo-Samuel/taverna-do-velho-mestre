import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ATITUDES, normalizarAtitude, rotuloDaAtitude } = await import(pathToFileURL(path.join(RAIZ, "src/lib/atitude-npc.ts")).href);

test("aceita as chaves da lista", () => {
  for (const a of ATITUDES as readonly string[]) assert.equal(normalizarAtitude(a), a);
});

test("normaliza caixa, acento e sinônimos", () => {
  assert.equal(normalizarAtitude("HOSTIL"), "hostil");
  assert.equal(normalizarAtitude("Com medo"), "medo");
  assert.equal(normalizarAtitude("curiosa"), "curioso");
});

test("recusa valor fora da lista e não-texto", () => {
  assert.equal(normalizarAtitude("furioso"), null);
  assert.equal(normalizarAtitude(undefined), null);
  assert.equal(rotuloDaAtitude("???"), null);
});

test("rótulo da tela", () => {
  assert.equal(rotuloDaAtitude("medo"), "Com medo");
});
