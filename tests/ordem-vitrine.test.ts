import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// V04: ordem da vitrine /aventuras (contagem das nativas, filtro em dois grupos, grupos por sistema).

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { contarNativas, separarPorFiltro, agruparPorSistema } = await import(
  pathToFileURL(path.join(RAIZ, "src/lib/aventuras/ordem-vitrine.ts")).href
);

const AVENTURAS = [
  { id: "tutorial", sistemas: ["historia"] },
  { id: "mina", sistemas: ["dnd5e", "pf2e", "osr"] },
  { id: "sino", sistemas: ["historia"] },
  { id: "feira", sistemas: ["pf2e", "dnd5e"] },
  { id: "forja", sistemas: ["pf2e"] },
  { id: "noite", sistemas: ["vtm5"] },
];
const ids = (lista: { id: string }[]) => lista.map((a) => a.id);

describe("ordem da vitrine de aventuras", () => {
  it("conta as nativas pelo primeiro sistema", () => {
    assert.deepEqual(contarNativas(AVENTURAS), { historia: 2, dnd5e: 1, pf2e: 2, vtm5: 1 });
    assert.deepEqual(contarNativas([]), {});
  });

  it("o filtro separa as nativas das que só aceitam o sistema, na ordem de entrada", () => {
    const pf2e = separarPorFiltro(AVENTURAS, "pf2e");
    assert.deepEqual(ids(pf2e.nativas), ["feira", "forja"]);
    assert.deepEqual(ids(pf2e.outras), ["mina"]);
    const dnd = separarPorFiltro(AVENTURAS, "dnd5e");
    assert.deepEqual(ids(dnd.nativas), ["mina"]);
    assert.deepEqual(ids(dnd.outras), ["feira"]);
  });

  it("filtro sem aventura devolve os dois grupos vazios", () => {
    assert.deepEqual(separarPorFiltro(AVENTURAS, "fate"), { nativas: [], outras: [] });
  });

  it("agrupa por sistema na ordem pedida, sem grupo vazio e sem embaralhar por dentro", () => {
    const grupos = agruparPorSistema(AVENTURAS, ["historia", "fate", "pf2e", "dnd5e"]);
    assert.deepEqual(
      grupos.map((g: { sistema: string }) => g.sistema),
      ["historia", "pf2e", "dnd5e"],
    );
    assert.deepEqual(ids(grupos[0].aventuras), ["tutorial", "sino"]);
    assert.deepEqual(ids(grupos[1].aventuras), ["feira", "forja"]);
    assert.deepEqual(ids(grupos[2].aventuras), ["mina"]);
  });

  it("cada aventura aparece em um grupo só, e id repetido na ordem não duplica grupo", () => {
    const grupos = agruparPorSistema(AVENTURAS, ["pf2e", "pf2e", "historia", "dnd5e", "vtm5"]);
    assert.equal(grupos.length, 4);
    const todos = grupos.flatMap((g: { aventuras: { id: string }[] }) => ids(g.aventuras));
    assert.equal(todos.length, AVENTURAS.length);
    assert.equal(new Set(todos).size, AVENTURAS.length);
  });
});
