import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G09: arquétipos de retrato (presets puros sobre o gerador existente).

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ret = await import(pathToFileURL(path.join(RAIZ, "src/components/historia/retrato/arquetipos-retrato.ts")).href);
const dados = await import(pathToFileURL(path.join(RAIZ, "src/components/historia/retrato/dados.ts")).href);
const { ARQUETIPOS, arquetipoPorId, aplicarArquetipo, retratoDoArquetipo } = ret;

describe("arquétipos de retrato", () => {
  it("são 8, com id e nome únicos e texto legível", () => {
    assert.equal(ARQUETIPOS.length, 8);
    assert.equal(new Set(ARQUETIPOS.map((a: { id: string }) => a.id)).size, 8);
    assert.equal(new Set(ARQUETIPOS.map((a: { nome: string }) => a.nome)).size, 8);
    for (const a of ARQUETIPOS) assert.ok(a.nome.length > 2 && a.resumo.length > 5);
  });

  it("usam só valores que o gerador conhece", () => {
    for (const a of ARQUETIPOS) {
      assert.ok(dados.SEXOS.includes(a.sexo), a.id);
      assert.ok(dados.ORIGENS_RETRATO.includes(a.origem), a.id);
      assert.ok(a.classe === "" || dados.CLASSES_RETRATO.includes(a.classe), a.id);
      const r = a.retoque;
      if (r.rosto) assert.ok(dados.ROSTOS.includes(r.rosto), a.id);
      if (r.sobrancelha) assert.ok(dados.SOBRANCELHAS.includes(r.sobrancelha), a.id);
      if (r.expressao) assert.ok(dados.EXPRESSOES.includes(r.expressao), a.id);
      if (r.olhos?.formato) assert.ok(dados.FORMATOS_OLHO.includes(r.olhos.formato), a.id);
      if (r.cabelo?.estilo) assert.ok(dados.CABELOS.includes(r.cabelo.estilo), a.id);
      if (r.barba) assert.ok(dados.BARBAS.includes(r.barba), a.id);
      if (r.marca) assert.ok(dados.MARCAS.includes(r.marca), a.id);
      assert.ok(dados.COBERTURAS.includes(a.figurino.cobertura), a.id);
      assert.ok(dados.ROUPAS.includes(a.figurino.roupa), a.id);
      assert.ok(dados.ACESSORIOS.includes(a.figurino.acessorio), a.id);
    }
  });

  it("o retrato pronto sobrevive à conferência sem mudar nada", () => {
    for (const a of ARQUETIPOS) {
      const r = retratoDoArquetipo(a);
      assert.deepEqual(dados.normalizarRetrato(r), r, a.id);
      assert.equal(r.sexo, a.sexo);
      assert.equal(r.origem, a.origem);
    }
  });

  it("é determinístico e os oito são visualmente diferentes", () => {
    const a = ARQUETIPOS[0];
    assert.deepEqual(retratoDoArquetipo(a), retratoDoArquetipo(a));
    const chaves = new Set(ARQUETIPOS.map((x: unknown) => JSON.stringify(retratoDoArquetipo(x))));
    assert.equal(chaves.size, 8);
  });

  it("aplica traços e figurino do arquétipo", () => {
    const a = arquetipoPorId("ladino-de-capuz");
    const r = retratoDoArquetipo(a);
    assert.equal(r.cobertura, "capuz");
    assert.equal(r.acessorio, "adagas");
    assert.equal(r.expressao, "desdem");
  });

  it("trocar de ofício troca a roupa, mas mantém o rosto do arquétipo", () => {
    const a = arquetipoPorId("velho-sabio");
    const base = dados.gerarRetrato(a.rosto, { sexo: a.sexo, origem: a.origem, classe: "guerreiro" });
    const r = aplicarArquetipo(base, a.id, "guerreiro");
    assert.equal(r.roupa, base.roupa);
    assert.equal(r.acessorio, base.acessorio);
    assert.equal(r.barba, "longa");
    // sem ofício ainda, o figurino do arquétipo vale
    const sem = aplicarArquetipo(dados.gerarRetrato(a.rosto, { sexo: a.sexo, origem: a.origem }), a.id, "");
    assert.equal(sem.cobertura, "chapeu-mago");
  });

  it("id desconhecido ou vazio devolve o retrato intacto", () => {
    const base = dados.gerarRetrato("x", { sexo: "mulher", origem: "elfo" });
    assert.equal(aplicarArquetipo(base, ""), base);
    assert.equal(aplicarArquetipo(base, "nao-existe"), base);
    assert.equal(arquetipoPorId(undefined), null);
  });
});
