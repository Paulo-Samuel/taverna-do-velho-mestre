import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contagemNiveis,
  grupoDaOpcao,
  gruposDasOpcoes,
  moverPericia,
  nivelDasPericias,
  niveisDePericias,
  NOMES_GRUPOS,
  opcoesDoGrupo,
  opcoesValidas,
  problemaOpcoes,
  proximoNivel,
  PREFIXO_SUGESTAO_CENARIO,
  sortearOpcoes,
  sugestaoDeCenario,
} from "../src/components/ficha/sugestoes";
import { publico } from "../src/lib/sistemas/comum";
import { sementesDe } from "../src/lib/sistemas/sementes";
import { vtm5 } from "../src/lib/sistemas/vtm5";

// W10 (P57 e P96c): a grade única de perícias do Vampiro (bolinhas que ciclam dentro das cotas do estilo, gravando nos mesmos
// extras.pericias_N que o servidor lê) e a sugestão de cenário para campanha V5 em branco.

const sistema = publico(vtm5);
const extrasCom = (estilo: string, resto: Record<string, string[]> = {}) => ({ estilo: [estilo], ...resto });

describe("niveisDePericias", () => {
  it("Equilibrado: três níveis (●●● 3, ●● 5, ● 7); Especialista inclui ●●●● 1", () => {
    const eq = niveisDePericias(opcoesValidas(sistema, "brujah", "gato_beco", extrasCom("equilibrado")));
    assert.deepEqual(
      eq.map(([n, o]) => [n, o.max]),
      [
        [3, 3],
        [2, 5],
        [1, 7],
      ],
    );
    const esp = niveisDePericias(opcoesValidas(sistema, "brujah", "gato_beco", extrasCom("especialista")));
    assert.deepEqual(
      esp.map(([n, o]) => [n, o.max]),
      [
        [4, 1],
        [3, 3],
        [2, 3],
        [1, 3],
      ],
    );
    // em branco, vale o Equilibrado
    assert.equal(niveisDePericias(opcoesValidas(sistema, "brujah", "gato_beco", {})).length, 3);
    // todas compartilham a mesma lista de 27 perícias
    assert.ok(eq.every(([, o]) => o.opcoes?.length === 27));
  });
});

describe("ciclo das bolinhas", () => {
  const niveis = niveisDePericias(opcoesValidas(sistema, "brujah", "gato_beco", extrasCom("equilibrado")));

  it("○→●→●●→●●●→○ quando tudo tem vaga", () => {
    let extras: Record<string, string[]> = extrasCom("equilibrado");
    const passos: number[] = [];
    for (let i = 0; i < 4; i++) {
      const atual = nivelDasPericias(niveis, extras).get("briga") ?? 0;
      const prox = proximoNivel(atual, niveis, extras);
      extras = moverPericia("briga", prox, niveis, extras);
      passos.push(prox);
    }
    assert.deepEqual(passos, [1, 2, 3, 0]);
    // no fim a perícia saiu de todos os níveis e o estilo ficou intacto
    assert.deepEqual(extras.pericias_1, []);
    assert.deepEqual(extras.pericias_2, []);
    assert.deepEqual(extras.pericias_3, []);
    assert.deepEqual(extras.estilo, ["equilibrado"]);
  });

  it("●●●● só no Especialista", () => {
    const esp = niveisDePericias(opcoesValidas(sistema, "brujah", "gato_beco", extrasCom("especialista")));
    const extras = extrasCom("especialista", { pericias_3: ["briga"] });
    assert.equal(proximoNivel(3, esp, extras), 4);
    assert.equal(proximoNivel(3, niveis, extrasCom("equilibrado", { pericias_3: ["briga"] })), 0);
  });

  it("nível cheio é pulado: com ● lotado, ○ vai direto para ●●; sem vaga nenhuma acima, não entra", () => {
    const sete = ["atletismo", "briga", "oficios", "conducao", "armas_fogo", "furto", "armas_brancas"];
    const extras = extrasCom("equilibrado", { pericias_1: sete });
    assert.equal(proximoNivel(0, niveis, extras), 2);
    const cheio = extrasCom("equilibrado", {
      pericias_1: sete,
      pericias_2: ["furtividade", "sobrevivencia", "etiqueta", "intuicao", "intimidacao"],
      pericias_3: ["lideranca", "performance", "persuasao"],
    });
    assert.equal(proximoNivel(0, niveis, cheio), 0);
    // quem já está em ●●● com tudo cheio acima volta para ○ (libera a vaga)
    assert.equal(proximoNivel(3, niveis, cheio), 0);
  });

  it("a mesma perícia fica num nível só e a contagem bate com o que o servidor valida", () => {
    let extras: Record<string, string[]> = extrasCom("equilibrado", { pericias_1: ["briga", "furto"], pericias_2: ["briga"] });
    // repetida: vale o nível mais alto na leitura, e mover limpa os outros
    assert.equal(nivelDasPericias(niveis, extras).get("briga"), 2);
    extras = moverPericia("briga", 3, niveis, extras);
    assert.deepEqual(extras.pericias_1, ["furto"]);
    assert.deepEqual(extras.pericias_2, []);
    assert.deepEqual(extras.pericias_3, ["briga"]);
    assert.deepEqual(
      contagemNiveis(niveis, extras).map((c) => `${c.nivel}:${c.usadas}/${c.cota}`),
      ["3:1/3", "2:0/5", "1:1/7"],
    );
    // nada passou da cota nem repetiu entre níveis: o servidor aceita
    assert.equal(problemaOpcoes(opcoesValidas(sistema, "brujah", "gato_beco", extras), extras), null);
  });

  it("trocar para Especialista com ● cheio do Equilibrado mostra a sobra e o servidor reclama igual", () => {
    const sete = ["atletismo", "briga", "oficios", "conducao", "armas_fogo", "furto", "armas_brancas"];
    const extras = extrasCom("especialista", { pericias_1: sete });
    const esp = niveisDePericias(opcoesValidas(sistema, "brujah", "gato_beco", extras));
    const um = contagemNiveis(esp, extras).find((c) => c.nivel === 1)!;
    assert.equal(um.usadas, 7);
    assert.equal(um.cota, 3);
    assert.match(problemaOpcoes(opcoesValidas(sistema, "brujah", "gato_beco", extras), extras) ?? "", /no máximo 3/);
    // clicar numa das sete tira a perícia (não há vaga acima em ●● nem ●●●? há: sobe para ●●)
    assert.equal(proximoNivel(1, esp, extras), 2);
  });
});

describe("sugestaoDeCenario", () => {
  it("prefixa 'Sugestão da taverna:' e sorteia uma das sementes do sistema", () => {
    const cenarios = sementesDe("vtm5").cenarios;
    const s = sugestaoDeCenario("vtm5", (lista) => lista[0]);
    assert.equal(s, `${PREFIXO_SUGESTAO_CENARIO} ${cenarios[0]}`);
    assert.ok(s.startsWith("Sugestão da taverna: "));
    // sorteio de verdade também cai dentro da lista
    const outra = sugestaoDeCenario("vtm5");
    assert.ok(cenarios.some((c) => outra === `${PREFIXO_SUGESTAO_CENARIO} ${c}`));
    // as sementes do Vampiro nomeiam uma cidade brasileira em cada começo
    assert.ok(cenarios.every((c) => /^(São Paulo|Brasília|Rio de Janeiro|Salvador|Recife|Belo Horizonte|Porto Alegre|Curitiba|Manaus)/.test(c)));
  });
});

describe("subpassos das Escolhas (grupos)", () => {
  const opcoes = opcoesValidas(sistema, "brujah", "gato_beco", extrasCom("equilibrado"));

  it("o Vampiro divide em Perícias, Disciplinas e Quem você é; os outros sistemas ficam num passo só", () => {
    assert.deepEqual(gruposDasOpcoes("vtm5", opcoes), ["pericias", "disciplinas", "alma"]);
    assert.deepEqual(NOMES_GRUPOS, { pericias: "Perícias", disciplinas: "Disciplinas", alma: "Quem você é" });
    assert.deepEqual(gruposDasOpcoes("pf2e", opcoes), []);
    assert.equal(grupoDaOpcao("pf2e", opcoes[0]), null);
  });

  it("cada opção cai num grupo só e as exclusivas entre si moram no mesmo grupo", () => {
    const por = (g: "pericias" | "disciplinas" | "alma") => opcoesDoGrupo("vtm5", opcoes, g).map((o) => o.id);
    assert.deepEqual(por("pericias"), ["estilo", "pericias_3", "pericias_2", "pericias_1", "especialidades"]);
    assert.deepEqual(por("disciplinas"), ["disciplinaPrincipal_brujah", "disciplinaSecundaria_brujah", "disciplinaPredador", "disciplinaPoderes"]);
    assert.ok(por("alma").includes("conceito") && por("alma").includes("conviccoes") && por("alma").includes("recursos"));
    assert.equal(por("pericias").length + por("disciplinas").length + por("alma").length, opcoes.length);
    for (const o of opcoes) for (const ex of o.exclusivaCom ?? []) {
      const outra = opcoes.find((x) => x.id === ex);
      if (outra) assert.equal(grupoDaOpcao("vtm5", outra), grupoDaOpcao("vtm5", o), `${o.id} e ${ex}`);
    }
    // sem grupo, vêm todas
    assert.equal(opcoesDoGrupo("vtm5", opcoes, null).length, opcoes.length);
  });

  it("sortear só um grupo não mexe nos outros", () => {
    const e = {
      sistemaId: "vtm5", ancestralidade: "gato_beco", classe: "brujah", antecedente: "", metodo: "padrao", atributos: {}, pericias: [],
      extras: extrasCom("equilibrado", { conceito: ["ex-policial"], disciplinaPrincipal_brujah: ["potencia"] }),
      nome: "", historia: "", jogador: "", campanha: "", cenario: "", tom: "", aventura: "", modoMesa: "livre" as const, pin: "", adicionarMais: false,
      dificuldade: "justa" as const, narracao: "media" as const, foco: [], focoLivre: "", instrucoes: "", dados: "jogador" as const, sugestoes: true, copiaDe: null, zerarXp: false,
    };
    const soAlma = new Set(opcoesDoGrupo("vtm5", opcoes, "alma").map((o) => o.id));
    const extras = sortearOpcoes(sistema, e, "tudo", soAlma);
    // o conceito foi refeito ou mantido, mas as disciplinas (outro grupo) ficaram como estavam
    assert.deepEqual(extras.disciplinaPrincipal_brujah, ["potencia"]);
    assert.equal(extras.disciplinaSecundaria_brujah, undefined);
    assert.ok((extras.ambicao ?? []).length > 0, "ambição sorteada no grupo alma");
    assert.ok((extras.conviccoes ?? []).length > 0, "par convicção/pedra sorteado no grupo alma");
    assert.equal(extras.conviccoes.length, extras.pedrasToque.length);
    // "faltam" no grupo disciplinas preenche só a secundária e o predador
    const soDisc = new Set(opcoesDoGrupo("vtm5", opcoes, "disciplinas").map((o) => o.id));
    const d = sortearOpcoes(sistema, e, "faltam", soDisc);
    assert.deepEqual(d.disciplinaPrincipal_brujah, ["potencia"]);
    assert.ok(d.disciplinaSecundaria_brujah?.length === 1 && d.disciplinaSecundaria_brujah[0] !== "potencia");
    assert.deepEqual(d.conceito, ["ex-policial"]);
    assert.equal(d.ambicao, undefined);
  });
});
