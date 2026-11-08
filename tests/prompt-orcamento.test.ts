import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// Orçamento do prompt em dois blocos (P172/P20) e resumo só de enredo (P174).
// O prompt lê o banco (diário, fatos, trilha): como no golden, o processo troca para uma pasta temporária antes de importar,
// então o SQLite aberto é um banco vazio descartável, nunca o data/ do jogador.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(mkdtempSync(path.join(tmpdir(), "taverna-orcamento-")));
const importar = (rel: string) => import(pathToFileURL(path.join(RAIZ, rel)).href);

const prompt = await importar("src/lib/mestre/prompt.ts");
const { SISTEMAS } = await importar("src/lib/sistemas/index.ts");
const { aventurasDoSistema } = await importar("src/lib/aventuras/index.ts");
const { definirGerador } = await importar("src/lib/dados.ts");
const { semente } = await importar("tests/_suporte/dados-fixos.ts");

type Sistema = { id: string; pronto: boolean; criarFicha: (e: unknown) => { nome: string; nivel: number }; ancestralidades: { id: string }[]; classes: { id: string }[]; antecedentes?: { id: string }[] };

const RESUMO_LONGO = "## Enredo até agora\n" + "O grupo atravessou a cidade, fez inimigos e guardou segredos. ".repeat(50);

function campanha(sistema: string, extra: Record<string, unknown> = {}) {
  return {
    id: 1,
    nome: "Campanha (teste) do orçamento",
    sistema,
    cenario: "Uma cidade portuária afundando aos poucos.",
    tom: "sombrio e debochado",
    resumo: "",
    resumoAte: 0,
    cena: { titulo: "Cais", local: "Cais Velho", momento: "Noite", clima: "garoa", situacao: "O faroleiro sumiu.", combate: null, musica: { humor: "misterio", energia: "baixa" } },
    config: { modoJogo: "avancado", dados: "jogador", modo: "livre", dificuldade: "justa", narracao: "media", sugestoes: true, instrucoes: "Sem aranhas." },
    criadaEm: "2026-01-01 20:00:00",
    atualizadaEm: "2026-01-01 20:00:00",
    ...extra,
  };
}

function personagem(s: Sistema, id: number, nome: string) {
  definirGerador(semente(20261101 + id));
  try {
    const ficha = s.criarFicha({
      nome,
      ancestralidade: s.ancestralidades[0]?.id ?? "",
      classe: s.classes[0]?.id ?? "",
      antecedente: s.antecedentes?.[0]?.id,
      historia: "Chegou na cidade com um baú lacrado e nenhuma explicação. ".repeat(4),
      extras: s.id === "historia" ? { sexo: "mulher" } : {},
    });
    return { id, campanhaId: 1, ficha, jogador: "Paulo", ordem: id };
  } finally {
    definirGerador(null);
  }
}

const prontos = (SISTEMAS as Sistema[]).filter((s) => s.pronto);

describe("bloco estável", () => {
  it("é idêntico entre dois turnos da mesma campanha e não leva nada que muda por turno", () => {
    for (const s of prontos) {
      const p1 = personagem(s, 1, "Teodora Fixture");
      const base = campanha(s.id, { resumo: "Enredo: chegaram ao cais." });
      const turno1 = prompt.promptEmBlocos(base, s, [p1]);
      // segundo turno: outra cena (com combate), personagem subiu de nível, resumo novo, segundo personagem
      const p2 = { ...p1, ficha: { ...p1.ficha, nivel: p1.ficha.nivel + 1 } };
      const cena2 = {
        ...base.cena,
        local: "Farol",
        momento: "Madrugada",
        musica: { humor: "combate", energia: "alta" },
        combate: { ativo: true, rodada: 2, vez: 0, ordem: [{ nome: "Salteador", aliado: false, iniciativa: 12, pv: 3, pvMax: 7, defesa: 12, condicoes: [] }] },
      };
      const turno2 = prompt.promptEmBlocos({ ...base, cena: cena2, resumo: "Enredo: subiram o farol." }, s, [p2, personagem(s, 2, "Bruno Fixture")]);
      assert.equal(turno1.estavel, turno2.estavel, `${s.id}: o bloco estável mudou entre turnos`);
      assert.notEqual(turno1.turno, turno2.turno, `${s.id}: o bloco do turno deveria mudar`);
      for (const coisa of ["Teodora Fixture", "Cais Velho", "COMBATE ATIVO", "Enredo: chegaram", "## Grupo"]) {
        assert.ok(!turno1.estavel.includes(coisa), `${s.id}: "${coisa}" vazou para o estável`);
      }
      assert.doesNotMatch(turno1.estavel, /personagens?, nível \d/, `${s.id}: a linha do grupo vazou para o estável`);
      assert.ok(turno2.turno.includes("COMBATE ATIVO"), `${s.id}: a cena fica no bloco do turno`);
      assert.ok(turno1.turno.includes("Teodora Fixture"));
    }
  });

  it("traz a linha fixa 'status vale o Diário' e o cabeçalho da campanha", () => {
    const s = prontos[0];
    const { estavel } = prompt.promptEmBlocos(campanha(s.id), s, []);
    assert.ok(estavel.includes("status vale o Diário"));
    assert.ok(estavel.includes("## Campanha: Campanha (teste) do orçamento"));
    assert.ok(estavel.includes("Sem aranhas."), "regras da casa ficam no estável");
  });

  it(`cabe em ${36_000} caracteres em todo sistema e toda aventura (com e sem abertura)`, () => {
    assert.equal(prompt.TETO_ESTAVEL, 36_000);
    const acima: string[] = [];
    for (const s of prontos) {
      for (const modoJogo of ["avancado", "historia"]) {
        const semAventura = prompt.blocoEstavel(campanha(s.id, { config: { ...campanha(s.id).config, modoJogo } }), s);
        if (semAventura.length > prompt.TETO_ESTAVEL) acima.push(`${s.id}/${modoJogo}: ${semAventura.length}`);
        for (const a of aventurasDoSistema(s.id) as { id: string }[]) {
          for (const resumo of ["", "algo"]) {
            const c = campanha(s.id, { resumo, config: { ...campanha(s.id).config, modoJogo, aventura: a.id } });
            const n = prompt.blocoEstavel(c, s).length;
            if (n > prompt.TETO_ESTAVEL) acima.push(`${s.id}/${a.id}/${modoJogo}${resumo ? "" : "/abertura"}: ${n}`);
          }
        }
      }
    }
    assert.deepEqual(acima, []);
  });
});

describe("bloco do turno", () => {
  it(`cabe em ${30_000} caracteres com quatro personagens e resumo longo`, () => {
    assert.equal(prompt.TETO_TURNO, 30_000);
    const acima: string[] = [];
    for (const s of prontos) {
      const grupo = [1, 2, 3, 4].map((i) => personagem(s, i, `Fixture ${i}`));
      const n = prompt.blocoDoTurno(campanha(s.id, { resumo: RESUMO_LONGO }), s, grupo).length;
      if (n > prompt.TETO_TURNO) acima.push(`${s.id}: ${n}`);
    }
    assert.deepEqual(acima, []);
  });

  it("promptDoSistema junta os dois blocos sob 'Estado da mesa agora'", () => {
    const s = prontos[0];
    const c = campanha(s.id);
    const { estavel, turno } = prompt.promptEmBlocos(c, s, []);
    assert.equal(prompt.promptDoSistema(c, s, []), `${estavel}\n\n${prompt.TITULO_ESTADO}\n\n${turno}`);
  });

  it("medirPrompt devolve a linha do log com os três tamanhos", () => {
    const { medida, linha } = prompt.medirPrompt({ estavel: "a".repeat(33912), turno: "b".repeat(27480) }, "pedido", "c".repeat(17560));
    assert.equal(medida.estavel, 33912);
    assert.match(linha, /^\[taverna\] prompt: estável 33\.912 c \(cache\) · turno 27\.480 c · transcrição 17\.560 c/);
  });
});

describe("resumo só de enredo (P174)", () => {
  it("pede as quatro seções, até 320 palavras, sem NPCs nem lugares", () => {
    for (const secao of prompt.SECOES_RESUMO) assert.ok(prompt.SISTEMA_RESUMO.includes(`## ${secao}`), `falta ${secao}`);
    assert.ok(prompt.SISTEMA_RESUMO.includes("320 palavras"));
    assert.ok(!/NPCs importantes|Lugares visitados/.test(prompt.SISTEMA_RESUMO));
  });

  it("o resumidor recebe o diário com a instrução de não repetir", () => {
    const p = prompt.promptDoResumo("", [], [], "- NPCs:\n  - Vera [hostil]");
    assert.match(p, /isto já está no diário: não repita nem reescreva/);
    assert.ok(p.includes("Vera [hostil]"));
    assert.ok(!prompt.promptDoResumo("", [], []).includes("Diário da campanha"));
  });

  it("Divergências sai do resumo gravado e vira lista; '—' conta como nenhuma", () => {
    const comDiv = "## Enredo até agora\nTexto.\n## Pendências e promessas\n- Pagar Bruno\n## Estado do grupo\n—\n## Divergências\n- O diário diz Vera aliada, mas ela atacou o grupo.\n";
    const r = prompt.separarDivergencias(comDiv);
    assert.deepEqual(r.divergencias, ["O diário diz Vera aliada, mas ela atacou o grupo."]);
    assert.ok(!r.resumo.includes("Divergências"));
    assert.ok(r.resumo.includes("Pagar Bruno"));
    assert.deepEqual(prompt.separarDivergencias("## Enredo até agora\nTexto.\n## Divergências\n—").divergencias, []);
    assert.deepEqual(prompt.separarDivergencias("Resumo antigo sem seções.").divergencias, []);
    assert.deepEqual(prompt.separarDivergencias("**Divergências:** nenhuma").divergencias, []);
  });

  it("avisos e divergências de sistema ficam fora da transcrição e do resumo", () => {
    const m = (id: number, tipo: string, texto: string, dados: unknown = null) => ({ id, tipo, texto, dados, personagemId: null, autor: null, criadaEm: "" });
    const msgs = [m(1, "mestre", "A chuva cai."), m(2, "sistema", "O mestre passou do limite de ações deste turno.", { tipo: "aviso" }), m(3, "sistema", "A aventura começa.")];
    const t = prompt.transcricao(msgs, []);
    assert.ok(t.includes("A chuva cai."));
    assert.ok(t.includes("A aventura começa."));
    assert.ok(!t.includes("limite de ações"));
    assert.ok(!prompt.promptDoResumo("", msgs, []).includes("limite de ações"));
  });
});
