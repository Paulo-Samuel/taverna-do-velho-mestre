import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const RAIZ = process.cwd();
const { CONSULTA_MENOS_MOVIMENTO, prefereMenosMovimento, comportamentoDeRolagem, ehMensagemNova, atrasoEscada } = (await import(
  pathToFileURL(path.join(RAIZ, "src/lib/cliente/movimento.ts")).href
)) as {
  CONSULTA_MENOS_MOVIMENTO: string;
  prefereMenosMovimento: () => boolean;
  comportamentoDeRolagem: (reduzido?: boolean) => "auto" | "smooth" | "instant";
  ehMensagemNova: (id: number, ultimoIdNaMontagem: number | null) => boolean;
  atrasoEscada: (indice: number, passoMs?: number, teto?: number) => string;
};

type Global = { window?: unknown };
const global = globalThis as Global;

function comJanela<T>(janela: unknown, corpo: () => T): T {
  const antes = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { value: janela, configurable: true, writable: true });
  try {
    return corpo();
  } finally {
    if (antes) Object.defineProperty(globalThis, "window", antes);
    else delete global.window;
  }
}

test("a consulta é a do sistema", () => {
  assert.equal(CONSULTA_MENOS_MOVIMENTO, "(prefers-reduced-motion: reduce)");
});

test("sem window (servidor) ninguém pediu menos movimento", () => {
  assert.equal(typeof global.window, "undefined");
  assert.equal(prefereMenosMovimento(), false);
  assert.equal(comportamentoDeRolagem(), "smooth");
});

test("sem matchMedia também não", () => {
  assert.equal(comJanela({}, prefereMenosMovimento), false);
});

test("com matchMedia, vale o que o sistema responder", () => {
  const consultas: string[] = [];
  const janela = (resposta: boolean) => ({
    matchMedia: (consulta: string) => {
      consultas.push(consulta);
      return { matches: resposta };
    },
  });
  assert.equal(comJanela(janela(true), prefereMenosMovimento), true);
  assert.equal(comJanela(janela(false), prefereMenosMovimento), false);
  assert.equal(comJanela(janela(true), () => comportamentoDeRolagem()), "auto");
  assert.deepEqual([...new Set(consultas)], [CONSULTA_MENOS_MOVIMENTO]);
});

test("rolagem seca para quem pediu menos movimento, suave para o resto", () => {
  assert.equal(comportamentoDeRolagem(true), "auto");
  assert.equal(comportamentoDeRolagem(false), "smooth");
});

test("mensagem nova é a que chegou depois da montagem", () => {
  assert.equal(ehMensagemNova(11, 10), true);
  assert.equal(ehMensagemNova(10, 10), false);
  assert.equal(ehMensagemNova(3, 10), false);
  assert.equal(ehMensagemNova(1, null), true);
});

test("a escada sobe de 30 em 30 ms e para no teto", () => {
  assert.equal(atrasoEscada(0), "0ms");
  assert.equal(atrasoEscada(1), "30ms");
  assert.equal(atrasoEscada(5), "150ms");
  assert.equal(atrasoEscada(40), "150ms");
  assert.equal(atrasoEscada(-3), "0ms");
  assert.equal(atrasoEscada(2, 50), "100ms");
  assert.equal(atrasoEscada(9, 20, 3), "60ms");
});
