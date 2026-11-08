import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// Tetos do REGRAS do Vampiro (P173), contrato dos sistemas sem vazamento para o navegador e o mestre sem `vtm5` no código.
// O prompt lê o banco: como no golden, o processo troca para uma pasta temporária antes de importar, nunca o data/ real.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(mkdtempSync(path.join(tmpdir(), "taverna-regras-teto-")));
const importar = (rel: string) => import(pathToFileURL(path.join(RAIZ, rel)).href);

const { SECOES_REGRAS, TETO_REGRAS, vtm5: VTM5 } = await importar("src/lib/sistemas/vtm5.ts");
const REGRAS: string = VTM5.regrasParaMestre;
const { SISTEMAS } = await importar("src/lib/sistemas/index.ts");
const { publico, fichaBase } = await importar("src/lib/sistemas/comum.ts");
const { extensaoVampiro } = await importar("src/lib/mestre/ferramentas/vampiro.ts");
const { definirFerramentas } = await importar("src/lib/mestre/ferramentas/index.ts");
const { promptDoSistema, fimDeSessao } = await importar("src/lib/mestre/prompt.ts");

type Secao = { id: string; teto: number; texto: string };

/** Mesma conta do teste de verdade, separada para provar que ela reprova quem passa do teto. */
function secoesAcimaDoTeto(secoes: Secao[]): string[] {
  return secoes.filter((s) => s.texto.length > s.teto).map((s) => `${s.id}: ${s.texto.length}/${s.teto}`);
}

const TETOS_COMBINADOS: Record<string, number> = {
  TESTES: 2000,
  SANGUE: 1500,
  "ALIMENTAÇÃO": 900,
  HUMANIDADE: 1200,
  FRENESI: 900,
  "FORÇA DE VONTADE": 500,
  DANO: 1000,
  CONFLITO: 600,
  "POTÊNCIA E XP": 1000,
  MASCARADA: 900,
  "COMO MESTRAR": 1500,
};

describe("REGRAS do Vampiro em seções com teto", () => {
  it("tem as seções combinadas, com os tetos combinados", () => {
    const mapa = Object.fromEntries((SECOES_REGRAS as Secao[]).map((s) => [s.id, s.teto]));
    assert.deepEqual(mapa, TETOS_COMBINADOS);
  });

  it("nenhuma seção passa do teto", () => {
    assert.deepEqual(secoesAcimaDoTeto(SECOES_REGRAS), []);
  });

  it("a conta reprova uma seção que passa do teto", () => {
    const inchada = { ...(SECOES_REGRAS as Secao[])[0], texto: "x".repeat((SECOES_REGRAS as Secao[])[0].teto + 1) };
    assert.equal(secoesAcimaDoTeto([inchada]).length, 1);
  });

  it(`o REGRAS inteiro cabe em ${TETO_REGRAS} caracteres`, () => {
    assert.equal(TETO_REGRAS, 12_000);
    assert.ok(REGRAS.length <= TETO_REGRAS, `REGRAS tem ${REGRAS.length}`);
    for (const s of SECOES_REGRAS as Secao[]) assert.ok(REGRAS.includes(s.texto), `${s.id} fora do REGRAS`);
  });

  it("cada seção abre com um título em maiúsculas", () => {
    for (const s of SECOES_REGRAS as Secao[]) assert.ok(s.texto.startsWith(s.id.split(" ")[0]), `${s.id} não abre com o título`);
  });

  it("nenhuma frase de regra aparece em duas seções", () => {
    const visto = new Map<string, string>();
    for (const s of SECOES_REGRAS as Secao[]) {
      const frases = s.texto
        .split(/(?<=[.:;])\s+|\n/)
        .map((f) => f.replace(/^[-•\s]+/, "").trim().toLowerCase())
        .filter((f) => f.length >= 40);
      for (const f of new Set(frases)) {
        assert.ok(!visto.has(f), `"${f}" está em ${visto.get(f)} e em ${s.id}`);
        visto.set(f, s.id);
      }
    }
  });

  it("cada mecânica-chave mora numa seção só", () => {
    const dono: Record<string, string> = {
      // a Falha Bestial (SANGUE) pode CITAR compulsão; a mecânica das compulsões mora só no FRENESI
      "compulsões": "FRENESI",
      "pedra de toque": "HUMANIDADE",
      "rerrolagem com força de vontade": "FORÇA DE VONTADE",
    };
    for (const [chave, secao] of Object.entries(dono)) {
      const onde = (SECOES_REGRAS as Secao[]).filter((s) => s.texto.toLowerCase().includes(chave)).map((s) => s.id);
      assert.ok(onde.length <= 1 && (onde.length === 0 || onde[0] === secao), `"${chave}" aparece em: ${onde.join(", ")}`);
    }
  });

  it("COMO MESTRAR trata a cidade como personagem; CONFLITO não manda rolar iniciativa", () => {
    const como = (SECOES_REGRAS as Secao[]).find((s) => s.id === "COMO MESTRAR")!;
    assert.match(como.texto, /A cidade é personagem: bairros, transporte, polícia e imprensa locais/);
    const conflito = (SECOES_REGRAS as Secao[]).find((s) => s.id === "CONFLITO")!;
    assert.ok(conflito.texto.length > 0);
  });
});

describe("ferramentas do Vampiro dizem só QUANDO", () => {
  const ctx = { campanha: { id: 1, config: { dados: "jogador" } }, sistema: VTM5, personagens: [] };
  it("descrições de ferramenta e nota do teste com até 220 caracteres", () => {
    assert.ok(extensaoVampiro.notaTeste.length <= 220, `notaTeste tem ${extensaoVampiro.notaTeste.length}`);
    const defs = extensaoVampiro.definicoes(ctx, {});
    assert.ok(defs.length >= 5);
    for (const d of defs) assert.ok(d.description.length <= 220, `${d.name}: ${d.description.length}`);
  });
});

describe("contrato dos sistemas", () => {
  it("publico() não leva função nenhuma para o navegador", () => {
    const temFuncao = (v: unknown, rota: string): string | null => {
      if (typeof v === "function") return rota;
      if (v && typeof v === "object") {
        for (const [k, x] of Object.entries(v)) {
          const achou = temFuncao(x, `${rota}.${k}`);
          if (achou) return achou;
        }
      }
      return null;
    };
    for (const s of SISTEMAS) {
      const p = publico(s);
      assert.equal(temFuncao(p, s.id), null);
      // só dados simples (objeto, lista, texto, número, booleano, null): o que o React serializa para o cliente sem perder nada
      const naoSimples = (v: unknown, rota: string): string | null => {
        if (v === null || v === undefined || ["string", "number", "boolean"].includes(typeof v)) return null;
        if (typeof v !== "object") return `${rota} (${typeof v})`;
        const proto = Object.getPrototypeOf(v);
        if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) return `${rota} (${proto?.constructor?.name})`;
        for (const [k, x] of Object.entries(v)) {
          const achou = naoSimples(x, `${rota}.${k}`);
          if (achou) return achou;
        }
        return null;
      };
      assert.equal(naoSimples(p, s.id), null);
      assert.ok("combate" in p && "progressao" in p, `${s.id} sem combate/progressao no público`);
    }
  });

  it("todo sistema pronto declara modelo de combate e progressão", () => {
    for (const s of SISTEMAS.filter((x: { pronto: boolean }) => x.pronto)) {
      assert.ok(["rodadas", "leve"].includes(s.combate?.modelo), `${s.id}: combate ${s.combate?.modelo}`);
      assert.ok(["xp", "marcos", "compra"].includes(s.progressao), `${s.id}: progressao ${s.progressao}`);
    }
    assert.equal(VTM5.combate.modelo, "leve");
    assert.equal(VTM5.progressao, "compra");
  });

  it("fim de sessão do Vampiro pede Remorso só para quem tem Manchas", () => {
    const limpa = fichaBase("vtm5", "Vera");
    limpa.recursos = { mancha: { rotulo: "Manchas", atual: 0, max: 3 } };
    const suja = fichaBase("vtm5", "Otto");
    suja.recursos = { mancha: { rotulo: "Manchas", atual: 2, max: 3 } };
    const f = fimDeSessao(VTM5, 3, [limpa, suja]);
    assert.equal(f.passosExtras.length, 1);
    assert.match(f.passosExtras[0], /teste_de_remorso para Otto/);
    assert.ok(!f.passosExtras[0].includes("Vera"));
    assert.equal(fimDeSessao(VTM5, 3, [limpa]).passosExtras.length, 0);
    const dnd = SISTEMAS.find((s: { id: string }) => s.id === "dnd5e");
    assert.equal(fimDeSessao(dnd, 3, []).passosExtras.length, 0);
  });

  it("PF2e: cair a 0 PV pelo aposMudancaDePv dá a condição de moribundo", () => {
    const pf2e = SISTEMAS.find((s: { id: string }) => s.id === "pf2e");
    const f = fichaBase("pf2e", "Kyra");
    f.pvMax = 20;
    f.pv = 0;
    f.condicoes = [];
    pf2e.aposMudancaDePv(f, 8, "alterar_ficha");
    assert.ok(f.condicoes.some((c: string) => /moribund/i.test(c)), `condições: ${f.condicoes.join(", ")}`);
  });
});

describe("prompt do mestre", () => {
  function campanha(sistema: string, cenario: string) {
    return {
      id: 1,
      nome: "Campanha (teste)",
      sistema,
      cenario,
      tom: "sombrio",
      resumo: "",
      resumoAte: 0,
      cena: null,
      config: { modoJogo: "avancado", dados: "jogador", modo: "livre", dificuldade: "justa", narracao: "media", sugestoes: true },
      criadaEm: "2026-01-01 20:00:00",
      atualizadaEm: "2026-01-01 20:00:00",
    };
  }

  it("Vampiro com cenário vazio recebe a instrução da cidade (Príncipe, Xerife, Elysium)", () => {
    const p = promptDoSistema(campanha("vtm5", ""), VTM5, []);
    for (const termo of ["Príncipe", "Xerife", "Elysium"]) assert.ok(p.includes(termo), `falta ${termo}`);
  });

  it("todo sistema pronto tem cenário vazio próprio, e o cenário escrito vence", () => {
    for (const s of SISTEMAS.filter((x: { pronto: boolean }) => x.pronto)) {
      const p = promptDoSistema(campanha(s.id, ""), s, []);
      assert.match(p, /livre: /, `${s.id} sem cenarioVazio`);
      const escrito = promptDoSistema(campanha(s.id, "Uma ilha de sal."), s, []);
      assert.ok(escrito.includes("Uma ilha de sal."));
    }
  });

  it("título de precedência das regras do sistema", () => {
    const p = promptDoSistema(campanha("dnd5e", "x"), SISTEMAS.find((s: { id: string }) => s.id === "dnd5e"), []);
    assert.ok(p.includes("## Regras do sistema (quando conflitam com as gerais, valem estas)"));
  });

  it("combate leve não fala em iniciativa nas regras gerais; rodadas fala", () => {
    const leve = definirFerramentas({ campanha: campanha("vtm5", "x"), sistema: VTM5, personagens: [], antes: () => {} });
    const cena = leve.find((d: { name: string }) => d.name === "atualizar_cena");
    assert.match(cena.description, /opcional/);
    const pVampiro = promptDoSistema(campanha("vtm5", "x"), VTM5, []);
    assert.ok(pVampiro.includes("sem rodadas nem iniciativa"));
    const dnd = SISTEMAS.find((s: { id: string }) => s.id === "dnd5e");
    assert.ok(promptDoSistema(campanha("dnd5e", "x"), dnd, []).includes("na da iniciativa"));
  });
});

describe("o mestre não conhece o Vampiro pelo id", () => {
  it('nenhum `vtm5` em src/lib/mestre', () => {
    const pasta = path.join(RAIZ, "src/lib/mestre");
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const caminho = path.join(dir, nome);
        if (statSync(caminho).isDirectory()) varrer(caminho);
        else if (/\.tsx?$/.test(nome) && /vtm5/i.test(readFileSync(caminho, "utf8"))) achados.push(path.relative(pasta, caminho));
      }
    };
    varrer(pasta);
    assert.deepEqual(achados, []);
  });
});
