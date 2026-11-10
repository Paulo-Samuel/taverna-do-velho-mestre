import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G16: vitrine da página inicial (perguntas de balcão e jogada de exemplo). Só módulos puros.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const carregar = (rel: string) => import(pathToFileURL(path.join(RAIZ, rel)).href);

const { perguntasFrequentes } = await carregar("src/lib/inicio/perguntas.ts");
const { JOGADA_EXEMPLO, PASSOS_DA_JOGADA } = await carregar("src/lib/inicio/jogada-exemplo-dados.ts");
const { tipoDoTeste } = await carregar("src/components/historia/tipo-teste.ts");
const { COR_GRAU, NOME_GRAU } = await carregar("src/components/historia/cores.ts");
const { arquetipoPorId } = await carregar("src/components/historia/retrato/arquetipos-retrato.ts");

type Pergunta = { id: string; pergunta: string; resposta: string; link?: { href: string; rotulo: string } };
const EMOJI = /\p{Extended_Pictographic}/u;
const PROVEDORES = ["cli", "api", "falso"];

describe("perguntas de balcão", () => {
  for (const provedor of PROVEDORES) {
    it(`provedor ${provedor}: lista enxuta, sem emoji e com links internos`, () => {
      const lista: Pergunta[] = perguntasFrequentes(provedor);
      assert.ok(lista.length >= 5 && lista.length <= 8, `tamanho ${lista.length}`);
      assert.equal(new Set(lista.map((p) => p.id)).size, lista.length);
      for (const p of lista) {
        assert.ok(p.pergunta.length > 3, p.id);
        assert.ok(p.resposta.length > 10 && p.resposta.length <= 280, `${p.id}: ${p.resposta.length} caracteres`);
        assert.ok(!EMOJI.test(p.pergunta) && !EMOJI.test(p.resposta), p.id);
        if (p.link) {
          assert.ok(p.link.href.startsWith("/"), p.id);
          assert.ok(p.link.rotulo.length > 2 && !EMOJI.test(p.link.rotulo), p.id);
        }
      }
    });
  }

  it("a resposta de custo muda com o mestre ligado", () => {
    const custos = PROVEDORES.map((prov) => {
      const p = (perguntasFrequentes(prov) as Pergunta[]).find((x) => x.pergunta === "Quanto custa?");
      assert.ok(p, prov);
      return p.resposta;
    });
    assert.equal(new Set(custos).size, 3);
  });

  it("provedor desconhecido cai na resposta do plano (cli)", () => {
    const de = (prov: string) => (perguntasFrequentes(prov) as Pergunta[])[0].resposta;
    assert.equal(de("qualquer"), de("cli"));
  });
});

describe("jogada de exemplo", () => {
  it("a perícia é um teste físico conhecido da mesa", () => {
    const info = tipoDoTeste(JOGADA_EXEMPLO.pericia);
    assert.ok(info);
    assert.equal(info.tipo, "fisico");
  });

  it("o grau existe nos rótulos e nas cores da mesa, e o dado caiu em 1", () => {
    assert.ok(JOGADA_EXEMPLO.grau in NOME_GRAU);
    assert.ok(JOGADA_EXEMPLO.grau in COR_GRAU);
    assert.equal(JOGADA_EXEMPLO.natural, 1);
  });

  it("o herói usa um arquétipo de retrato que existe", () => {
    assert.ok(arquetipoPorId(JOGADA_EXEMPLO.arquetipo));
  });

  it("nenhum texto tem emoji e são três passos", () => {
    const textos: string[] = [
      JOGADA_EXEMPLO.heroi,
      JOGADA_EXEMPLO.acao,
      JOGADA_EXEMPLO.pericia,
      JOGADA_EXEMPLO.convite,
      ...JOGADA_EXEMPLO.narracao,
      ...JOGADA_EXEMPLO.consequencia,
      ...PASSOS_DA_JOGADA.flatMap((p: { titulo: string; texto: string }) => [p.titulo, p.texto]),
    ];
    for (const t of textos) assert.ok(t.length > 0 && !EMOJI.test(t), t);
    assert.equal(PASSOS_DA_JOGADA.length, 3);
  });
});
