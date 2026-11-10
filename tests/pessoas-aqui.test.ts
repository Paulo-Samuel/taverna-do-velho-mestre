import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// G02: quem está na cena (presença pelo texto da narração) e o matiz das etiquetas de humor.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { pessoasPresentes, textoDaCenaAtual, MATIZ_ATITUDE } = await import(
  pathToFileURL(path.join(RAIZ, "src/components/historia/pessoas-presentes.ts")).href
);

const npc = (id: number, titulo: string, status = "neutro", dados: Record<string, unknown> = {}) => ({
  id,
  tipo: "npc",
  titulo,
  texto: "",
  status,
  dados,
  atualizadoEm: "2026-01-01",
});
const msg = (id: number, tipo: string, texto: string) => ({ id, tipo, texto, autor: null, dados: null });
const ids = (r: { id: number }[]) => r.map((p) => p.id);

describe("pessoasPresentes", () => {
  const diario = [npc(1, "Capitão Varn", "aliado", { atitude: "Com medo" }), npc(2, "Lia"), npc(3, "Dorin", "morto"), { ...npc(4, "Taverna"), tipo: "local" }];

  it("acha pelo nome completo ou primeiro nome, sem acento e caixa, na ordem do texto", () => {
    const r = pessoasPresentes(diario, "A Lia entrou. Depois o capitão VARN levantou a mão.");
    assert.deepEqual(ids(r), [2, 1]);
    assert.equal(r[1].atitude, "medo");
    assert.equal(r[0].atitude, null);
  });
  it("ignora morto, não-NPC, quem não é citado e pedaço de palavra", () => {
    assert.deepEqual(pessoasPresentes(diario, "Dorin jazia ali. A taverna estava vazia. Liana chegou."), []);
  });
  it("sem texto ou sem NPCs devolve vazio", () => {
    assert.deepEqual(pessoasPresentes(diario, "   "), []);
    assert.deepEqual(pessoasPresentes([], "Lia"), []);
  });
  it("primeiro nome repetido não vale sozinho; o nome completo vale", () => {
    const d = [npc(1, "Maria Souza"), npc(2, "Maria Lopes")];
    assert.deepEqual(pessoasPresentes(d, "Maria sorriu."), []);
    assert.deepEqual(ids(pessoasPresentes(d, "Maria Lopes sorriu.")), [2]);
  });
});

describe("textoDaCenaAtual", () => {
  it("usa só o último turno com narração, ignora apartes e inclui o texto ao vivo", () => {
    const ms = [
      msg(1, "jogador", "entro"),
      msg(2, "mestre", "Varn estava no balcão."),
      msg(3, "jogador", "falo com Lia"),
      msg(4, "mestre", "Lia responde. ((Varn é só exemplo))"),
    ];
    const t = textoDaCenaAtual(ms, "Dorin chega.");
    assert.match(t, /Lia responde/);
    assert.match(t, /Dorin/);
    assert.doesNotMatch(t, /Varn/);
  });
});

describe("MATIZ_ATITUDE", () => {
  it("toda atitude tem entrada em MATIZ_ATITUDE e as classes são matiz-1..8 ou vazio", () => {
    const atitudes = ["amistoso", "curioso", "desconfiado", "hostil", "devoto", "medo", "apaixonado", "neutro"];
    assert.deepEqual(Object.keys(MATIZ_ATITUDE).sort(), [...atitudes].sort());
    for (const a of atitudes) assert.match(MATIZ_ATITUDE[a], /^(matiz-[1-8])?$/, a);
  });
  it("só o neutro fica sem matiz e nenhum matiz se repete", () => {
    const comMatiz = Object.entries(MATIZ_ATITUDE as Record<string, string>).filter(([, m]) => m);
    assert.deepEqual(Object.entries(MATIZ_ATITUDE as Record<string, string>).filter(([, m]) => !m).map(([a]) => a), ["neutro"]);
    assert.equal(new Set(comMatiz.map(([, m]) => m)).size, comMatiz.length);
  });
});
