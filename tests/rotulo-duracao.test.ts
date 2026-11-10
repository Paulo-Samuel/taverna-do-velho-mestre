import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const RAIZ = process.cwd();
const { rotuloDuracao } = (await import(pathToFileURL(path.join(RAIZ, "src/lib/aventuras/rotulo-duracao.ts")).href)) as {
  rotuloDuracao: (duracao: string) => string;
};

test("one-shot vira texto da casa", () => {
  assert.equal(rotuloDuracao("one-shot"), "uma noite só");
  assert.equal(rotuloDuracao("One-shot"), "uma noite só");
});

test("durações que já estão em português passam como vieram", () => {
  assert.equal(rotuloDuracao("2 sessões"), "2 sessões");
  assert.equal(rotuloDuracao("3 sessões"), "3 sessões");
  assert.equal(rotuloDuracao("3 a 5 sessões"), "3 a 5 sessões");
});

test("valor desconhecido não quebra nem some", () => {
  assert.equal(rotuloDuracao("uma tarde chuvosa"), "uma tarde chuvosa");
  assert.equal(rotuloDuracao(""), "");
});
