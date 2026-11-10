import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G15: herói pronto do "Jogar agora" e a escolha da aventura rápida (lógica pura; a action não é exercitada aqui).

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const carregar = (caminho: string) => import(pathToFileURL(path.join(RAIZ, caminho)).href);
const { CLASSE_RESERVA, montarHeroiPronto, escolherAventuraRapida } = await carregar("src/lib/inicio/heroi-pronto.ts");
const { ARQUETIPOS } = await carregar("src/components/historia/retrato/arquetipos-retrato.ts");
const dados = await carregar("src/components/historia/retrato/dados.ts");
const { historia } = await carregar("src/lib/sistemas/historia.ts");

const IDS: string[] = ARQUETIPOS.map((a: { id: string }) => a.id);

describe("herói pronto", () => {
  it("mesma semente e mesmo id dão o mesmo herói", () => {
    assert.deepEqual(montarHeroiPronto("abc12345", "velho-sabio"), montarHeroiPronto("abc12345", "velho-sabio"));
    assert.deepEqual(montarHeroiPronto("abc12345"), montarHeroiPronto("abc12345"));
  });

  it("o arquétipo pedido é respeitado; id desconhecido cai num sorteado", () => {
    for (const id of IDS) assert.equal(montarHeroiPronto("s1", id).arquetipo, id);
    assert.ok(IDS.includes(montarHeroiPronto("s1", "nao-existe").arquetipo));
    assert.ok(IDS.includes(montarHeroiPronto("s1", "").arquetipo));
    assert.ok(IDS.includes(montarHeroiPronto("s1", null).arquetipo));
  });

  it("sementes diferentes sem id cobrem mais de um arquétipo", () => {
    const vistos = new Set(Array.from({ length: 40 }, (_, i) => montarHeroiPronto(`semente-${i}`).arquetipo));
    assert.ok(vistos.size > 1, `só saiu ${[...vistos].join(", ")}`);
  });

  it("cada um dos oito sai com ofício e origem que o modo história conhece", () => {
    const classes = historia.classes.map((c: { id: string }) => c.id);
    const origens = historia.ancestralidades.map((o: { id: string }) => o.id);
    for (const id of IDS) {
      const h = montarHeroiPronto("xyz", id);
      assert.ok(classes.includes(h.classe), `${id}: classe ${h.classe}`);
      assert.ok(origens.includes(h.origem), `${id}: origem ${h.origem}`);
      assert.ok(h.nome.trim().length >= 2, `${id}: nome "${h.nome}"`);
      assert.ok(dados.SEXOS.includes(h.sexo), id);
      assert.equal(typeof h.historia, "string");
      // o retrato é o do arquétipo e passa pela conferência sem mudar
      assert.deepEqual(dados.normalizarRetrato(h.retrato), h.retrato, id);
    }
  });

  it("a ficha criada com o herói guarda ofício, origem e retrato", () => {
    const h = montarHeroiPronto("ficha", "cacadora");
    const f = historia.criarFicha({ nome: h.nome, ancestralidade: h.origem, classe: h.classe, historia: h.historia, extras: { sexo: h.sexo, retrato: h.retrato } });
    assert.equal(f.nome, h.nome);
    assert.equal(f.classe, "cacador");
  });

  it("o nobre decaído, sem ofício sugerido, cai na classe de reserva", () => {
    const h = montarHeroiPronto("qualquer", "nobre-decaido");
    assert.equal(h.classe, CLASSE_RESERVA);
    assert.notEqual(h.classe, "");
    // o figurino continua o do arquétipo (manto), não o do ofício de reserva
    assert.equal(h.retrato.roupa, "manto");
  });
});

describe("aventura rápida", () => {
  const lista = [{ id: "tutorial", tutorial: true }, { id: "a" }, { id: "b" }, { id: "c" }];

  it("sem campanhas devolve a tutorial", () => {
    for (let i = 0; i < 10; i++) assert.equal(escolherAventuraRapida(lista, false, `s${i}`), "tutorial");
  });

  it("com campanhas nunca devolve a tutorial quando há outras", () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const id = escolherAventuraRapida(lista, true, `s${i}`);
      assert.notEqual(id, "tutorial");
      vistas.add(id);
    }
    assert.ok(vistas.size > 1);
  });

  it("é determinística pela semente", () => {
    assert.equal(escolherAventuraRapida(lista, true, "fixa"), escolherAventuraRapida(lista, true, "fixa"));
  });

  it("com campanhas e só a tutorial na lista, é ela", () => {
    assert.equal(escolherAventuraRapida([{ id: "tutorial", tutorial: true }], true, "s"), "tutorial");
  });

  it("sem tutorial na lista e sem campanhas, sorteia uma das que há", () => {
    assert.ok(["a", "b"].includes(escolherAventuraRapida([{ id: "a" }, { id: "b" }], false, "s")));
  });

  it("a pedida válida vence, com ou sem campanhas", () => {
    assert.equal(escolherAventuraRapida(lista, false, "s", "b"), "b");
    assert.equal(escolherAventuraRapida(lista, true, "s", "tutorial"), "tutorial");
  });

  it("a pedida desconhecida (de outro sistema, por exemplo) é ignorada", () => {
    assert.equal(escolherAventuraRapida(lista, false, "s", "mina-perdida-dnd"), "tutorial");
    assert.notEqual(escolherAventuraRapida(lista, true, "s", "mina-perdida-dnd"), "mina-perdida-dnd");
    assert.equal(escolherAventuraRapida(lista, false, "s", ""), "tutorial");
  });

  it("lista vazia devolve null", () => {
    assert.equal(escolherAventuraRapida([], false, "s"), null);
    assert.equal(escolherAventuraRapida([], true, "s", "a"), null);
  });
});
