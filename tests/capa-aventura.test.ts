import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G06: a capa da aventura é determinística (mesmo id e sistema, mesma arte) e varia de uma aventura para outra.
// V04: cada aventura da casa tem identidade própria dentro do tema (silhueta + horizonte não se repetem no mesmo sistema).

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { gerarCapa, semente, caminhoDoMotivo, MOTIVOS_DO_SISTEMA, MOTIVO_DA_AVENTURA, HORIZONTE_DA_AVENTURA } = await import(
  pathToFileURL(path.join(RAIZ, "src/lib/aventuras/capa-arte.ts")).href
);
const { aventurasPublicas } = await import(pathToFileURL(path.join(RAIZ, "src/lib/aventuras/index.ts")).href);

const SISTEMAS = ["historia", "dnd5e", "pf2e", "pf1e", "osr", "d100", "fate", "pbta", "vtm5"];
const MOTIVOS_NOVOS = ["lanterna", "sino", "mascara", "cabana", "taca", "predios", "caixao"];
const HORIZONTES = ["serras", "mar", "cidade"];

describe("capa da aventura", () => {
  it("mesmo id e sistema dão o mesmo resultado", () => {
    assert.deepEqual(gerarCapa("noite-longa", "vtm5"), gerarCapa("noite-longa", "vtm5"));
    assert.deepEqual(gerarCapa("sino-afogado", "historia"), gerarCapa("sino-afogado", "historia"));
    assert.equal(semente("abc"), semente("abc"));
  });
  it("ids diferentes dão resultados diferentes", () => {
    const a = gerarCapa("noite-longa", "vtm5");
    const b = gerarCapa("outra-noite", "vtm5");
    assert.notEqual(a.semente, b.semente);
    assert.notDeepEqual(a, b);
  });
  it("o sistema dá o repertório de silhuetas e o mesmo id em outro sistema muda a arte", () => {
    for (const sis of SISTEMAS) {
      const conjunto = MOTIVOS_DO_SISTEMA[sis];
      assert.ok(conjunto.length >= 3 && conjunto.length <= 4, `${sis} tem 3 ou 4 motivos`);
      for (const id of ["x", "y", "outra-noite", "qualquer", "mais-uma"]) {
        assert.ok(conjunto.includes(gerarCapa(id, sis).motivo), `${sis}:${id}`);
      }
    }
    assert.equal(gerarCapa("x", "sistema-novo").motivo, "estrela");
    assert.notEqual(gerarCapa("x", "vtm5").semente, gerarCapa("x", "dnd5e").semente);
  });
  it("gera números finitos para todos os sistemas e horizontes", () => {
    const vistos = new Set<string>();
    for (const sis of SISTEMAS) {
      for (let i = 0; i < 30; i++) {
        const c = gerarCapa(`qualquer-${i}`, sis);
        vistos.add(c.horizonte);
        assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(c)), `${sis}:${i}`);
        assert.ok(c.brilho >= 0 && c.brilho <= 100);
        assert.ok(HORIZONTES.includes(c.horizonte));
        assert.ok(["cheio", "crescente", "duplo"].includes(c.astro.tipo));
        assert.ok(["ambar-forte", "sangue", "border"].includes(c.ceu));
        assert.ok(c.camadas.length >= 2);
      }
    }
    assert.deepEqual([...vistos].sort(), [...HORIZONTES].sort());
  });
  it("todo motivo novo devolve caminho não vazio e sem número quebrado", () => {
    for (const motivo of MOTIVOS_NOVOS) {
      const d = caminhoDoMotivo(motivo, 160, 150, 80);
      assert.ok(typeof d === "string" && d.length > 20, motivo);
      assert.ok(d.startsWith("M") && d.trimEnd().endsWith("Z"), motivo);
      assert.ok(!/NaN|Infinity|undefined/.test(d), motivo);
    }
  });
  it("sem cor fixa: a arte só fala em tokens do tema", () => {
    for (const sis of SISTEMAS) assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(JSON.stringify(gerarCapa("qualquer", sis))), sis);
  });
  it("a tabela casa a silhueta com o título e a lua ganha contorno", () => {
    assert.equal(gerarCapa("lanterna-da-ponte-velha", "historia").motivo, "lanterna");
    assert.equal(gerarCapa("sino-afogado", "historia").motivo, "sino");
    assert.equal(gerarCapa("sino-afogado", "historia").horizonte, "mar");
    const lua = gerarCapa("noite-de-sangue-em-brasilia", "vtm5");
    assert.equal(lua.motivo, "lua");
    assert.ok(lua.silhueta.contorno > 0);
    assert.equal(gerarCapa("sino-afogado", "historia").silhueta.contorno, 0);
  });
  it("as tabelas só citam aventuras que existem", () => {
    const ids = new Set(aventurasPublicas().map((a: { id: string }) => a.id));
    for (const id of [...Object.keys(MOTIVO_DA_AVENTURA), ...Object.keys(HORIZONTE_DA_AVENTURA)]) assert.ok(ids.has(id), id);
  });
  it("no mesmo sistema, nenhuma dupla de aventuras repete silhueta + horizonte", () => {
    const porSistema = new Map<string, Map<string, string>>();
    for (const a of aventurasPublicas() as { id: string; sistemas: string[] }[]) {
      const sis = a.sistemas[0];
      const capa = gerarCapa(a.id, sis);
      const par = `${capa.motivo}+${capa.horizonte}`;
      const pares = porSistema.get(sis) ?? new Map<string, string>();
      assert.ok(!pares.has(par), `${sis}: ${a.id} repete ${par} de ${pares.get(par)}`);
      pares.set(par, a.id);
      porSistema.set(sis, pares);
    }
    assert.ok(porSistema.size >= 2);
  });
});
