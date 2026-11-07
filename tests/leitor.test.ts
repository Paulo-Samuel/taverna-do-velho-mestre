import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dadosFimSessao,
  ehMudanca,
  ehPassagemDeVez,
  ehResumoMecanico,
  foraDoJogo,
  limparAparte,
  montarCena,
  paragrafosDaNarracao,
  rastrearMudancas,
  recadosDoTurno,
  separarFecho,
  textoParaOuvir,
} from "../src/components/leitor/cena";
import { calcularLimites, paginaDoX, textosDasPaginas, unidadeEm, type Unidade } from "../src/components/leitor/paginacao";
import { agruparTurnos, dividirParagrafos, SEPARADOR } from "../src/components/leitor/turnos";
import type { Mensagem } from "../src/lib/db";

// Funções puras do leitor cena a cena (src/components/leitor): turnos, apartes, recados escondidos, chips de mudança e as contas
// da paginação que não dependem do DOM.

let proximoId = 1;
function msg(tipo: Mensagem["tipo"], texto: string, dados: Record<string, unknown> | null = null): Mensagem {
  return { id: proximoId++, tipo, texto, dados, personagemId: null, autor: null, criadaEm: "2026-11-07 20:00:00" };
}

const NARRACAO_LONGA =
  "O corredor do hospício cheira a éter e a mofo velho. Vera caminha devagar, contando as portas numeradas, enquanto o zumbido das lâmpadas " +
  "fluorescentes falha a cada três passos. No fim, uma porta entreaberta deixa escapar uma luz amarelada e o som de alguém arrastando uma cadeira. " +
  "Há marcas de unha na parede ao lado da maçaneta, antigas, repintadas por cima e ainda assim visíveis para quem sabe olhar.";

describe("turnos", () => {
  it("agrupa ação do jogador com tudo o que o mestre respondeu até a próxima ação", () => {
    const m = [msg("sistema", "A aventura começa."), msg("mestre", "Abertura."), msg("jogador", "Entro na taverna."), msg("mestre", "O salão..."), msg("dado", "teste", { tipo: "teste" }), msg("jogador", "Olho em volta."), msg("mestre", "Nada.")];
    const turnos = agruparTurnos(m);
    assert.equal(turnos.length, 3);
    assert.equal(turnos[0].acoes.length, 0);
    assert.equal(turnos[0].itens.length, 2);
    assert.equal(turnos[1].acoes[0].texto, "Entro na taverna.");
    assert.equal(turnos[1].itens.length, 2);
    assert.equal(turnos[2].acoes.length, 1);
  });

  it("ações seguidas (rodada) entram no mesmo turno", () => {
    const turnos = agruparTurnos([msg("jogador", "A"), msg("jogador", "B"), msg("mestre", "C")]);
    assert.equal(turnos.length, 1);
    assert.equal(turnos[0].acoes.length, 2);
  });

  it("dividirParagrafos separa por linha em branco e tira títulos markdown", () => {
    assert.deepEqual(dividirParagrafos("## Salão\n\nUm.\n\n\n\nDois.  \n"), ["Salão", "Um.", "Dois."]);
    assert.ok(SEPARADOR.test("---"));
    assert.ok(!SEPARADOR.test("-- não"));
  });
});

describe("apartes e recados", () => {
  it("separa o ((fora do jogo)) da prosa e limpa o prefixo", () => {
    const ps = paragrafosDaNarracao("A porta range.\n\n((Fora do personagem: o teste é opcional.))\n\nVocê entra.", 7);
    assert.deepEqual(
      ps.map((p) => [p.texto, p.aparte, p.msg]),
      [
        ["A porta range.", false, 7],
        ["O teste é opcional.", true, 7],
        ["Você entra.", false, 7],
      ],
    );
    assert.equal(limparAparte("((nota do mestre: respire))"), "Respire");
    assert.equal(textoParaOuvir(ps), "A porta range.\n\nVocê entra.");
    assert.equal(foraDoJogo("  ((pergunta))"), true);
    assert.equal(foraDoJogo("pergunta"), false);
  });

  it("reconhece passagem de vez e resumo mecânico", () => {
    assert.equal(ehPassagemDeVez("É a sua vez, Samuel."), true);
    assert.equal(ehPassagemDeVez("O dado está com você…"), true);
    assert.equal(ehPassagemDeVez("Vera sorri. \"Sua vez\", ela diz."), false, "fala entre aspas é cena");
    assert.equal(ehPassagemDeVez(NARRACAO_LONGA + " É a sua vez."), false, "texto longo não é só recado");
    assert.equal(ehResumoMecanico("Você ganhou 1 Mancha (agora 1/4). Anotei no diário que Vera está hostil."), true);
    assert.equal(ehResumoMecanico("Vera recua um passo e some na escuridão."), false);
  });

  it("recadosDoTurno esconde o 'É a sua vez' no fim de uma narração substancial e marca o resumo mecânico como nota", () => {
    const vez = msg("mestre", "É a sua vez, Samuel…");
    const mecanico = msg("mestre", "Você perdeu 1 de Força de Vontade (agora 4/5).");
    const { escondidas, notas } = recadosDoTurno([msg("mestre", NARRACAO_LONGA), mecanico, vez]);
    assert.deepEqual([...escondidas].sort(), [mecanico.id, vez.id].sort());
    assert.deepEqual([...notas], [mecanico.id]);
  });

  it("um 'É a sua vez' sozinho continua (é tudo o que o mestre disse)", () => {
    const vez = msg("mestre", "É a sua vez, Samuel…");
    assert.equal(recadosDoTurno([vez]).escondidas.size, 0);
  });

  it("'role o dado' logo depois de um pedido de teste já rolado some", () => {
    const pedido = msg("dado", "pedido", { tipo: "pedido_teste", status: "resolvido" });
    const chamada = msg("mestre", "O dado está com você.");
    assert.ok(recadosDoTurno([msg("mestre", "Curto."), pedido, chamada]).escondidas.has(chamada.id));
    const pendente = msg("dado", "pedido", { tipo: "pedido_teste", status: "pendente" });
    const chamada2 = msg("mestre", "O dado está com você.");
    assert.ok(!recadosDoTurno([msg("mestre", "Curto."), pendente, chamada2]).escondidas.has(chamada2.id));
  });
});

describe("montarCena", () => {
  it("junta as narrações seguidas numa prosa só, com o cartão no lugar, e tira o recado do fim", () => {
    const n1 = msg("mestre", NARRACAO_LONGA);
    const cartao = msg("dado", "teste", { tipo: "teste" });
    const n2 = msg("mestre", "Vera empurra a porta.");
    const vez = msg("mestre", "É a sua vez, Samuel.");
    const turno = agruparTurnos([msg("jogador", "Sigo pelo corredor."), n1, cartao, n2, vez])[0];
    const cena = montarCena(turno, rastrearMudancas([]));
    assert.equal(cena.pecas.length, 3);
    assert.equal(cena.pecas[0].tipo, "prosa");
    assert.equal(cena.pecas[1].tipo, "item");
    assert.equal(cena.pecas[2].tipo, "prosa");
    assert.deepEqual(cena.escondidas.map((m) => m.id), [vez.id]);
  });

  it("o último parágrafo só passando a vez, colado numa narração longa, é cortado", () => {
    const n = msg("mestre", `${NARRACAO_LONGA}\n\nÉ a sua vez, Samuel: Vera está à porta.`);
    const cena = montarCena(agruparTurnos([msg("jogador", "Vou."), n])[0], rastrearMudancas([]));
    const prosa = cena.pecas[0];
    assert.equal(prosa.tipo, "prosa");
    if (prosa.tipo === "prosa") {
      assert.equal(prosa.paragrafos.length, 1);
      assert.equal(prosa.paragrafos[0].texto, NARRACAO_LONGA);
    }
  });

  it("mudanças de ficha viram chips por personagem, fora da prosa", () => {
    const ficha = msg("dado", "Vera: Fome 1 → 2", { tipo: "ficha", personagem: "Vera", mudancas: ["Fome 1 → 2"], motivo: "bebeu do rato" });
    assert.equal(ehMudanca(ficha), true);
    const mensagens = [msg("jogador", "Bebo."), msg("mestre", "O sangue desce quente."), ficha];
    const cena = montarCena(agruparTurnos(mensagens)[0], rastrearMudancas(mensagens));
    assert.equal(cena.pecas.length, 1, "a mudança de ficha não vira peça");
    assert.equal(cena.mudancas.length, 1);
    assert.equal(cena.mudancas[0].quem, "Vera");
    assert.equal(cena.mudancas[0].tipo, "personagem");
    assert.match(cena.mudancas[0].chips[0].rotulo, /Fome/);
    assert.equal(cena.mudancas[0].chips[0].tom, "ruim", "Fome subindo é ruim");
  });

  it("separarFecho tira o fim da noite do corpo", () => {
    const fim = msg("dado", "Fim da noite 3", { tipo: "fim_sessao", sessao: 3, data: "2026-11-07" });
    assert.deepEqual(dadosFimSessao(fim), { sessao: 3, data: "2026-11-07" });
    const turno = agruparTurnos([msg("jogador", "Durmo."), msg("mestre", "O dia vem."), fim])[0];
    const { corpo, fecho } = separarFecho(montarCena(turno, rastrearMudancas([])).pecas);
    assert.equal(corpo.length, 1);
    assert.equal(fecho.length, 1);
  });
});

describe("paginação (contas sem DOM)", () => {
  const texto = (data: string, inicio: number, fimDeBloco = true): Unidade => ({ tipo: "texto", no: { data } as Text, inicio, tamanho: data.length, fimDeBloco });
  const cartao = (inicio: number): Unidade => ({ tipo: "cartao", el: {} as HTMLElement, inicio, tamanho: 1 });

  it("paginaDoX: colunas a cada `passo` px a partir da base", () => {
    assert.equal(paginaDoX(100, 20, 300), 0);
    assert.equal(paginaDoX(318, 20, 300), 0);
    assert.equal(paginaDoX(319, 20, 300), 1, "a coluna seguinte começa 1 px antes de base + passo (folga do arredondamento)");
    assert.equal(paginaDoX(620, 20, 300), 2);
    assert.equal(paginaDoX(5, 20, 300), 0, "nunca negativa");
  });

  it("unidadeEm acha a unidade da posição (busca binária)", () => {
    const u = [texto("abcde", 0), cartao(5), texto("fgh", 6)];
    assert.equal(unidadeEm(u, 0), u[0]);
    assert.equal(unidadeEm(u, 4), u[0]);
    assert.equal(unidadeEm(u, 5), u[1]);
    assert.equal(unidadeEm(u, 7), u[2]);
    assert.equal(unidadeEm(u, 99), u[2], "fora do fio dá a última");
    assert.equal(unidadeEm([], 0), null);
  });

  it("textosDasPaginas corta o fio nos limites e separa parágrafos", () => {
    const u = [texto("Primeiro parágrafo.", 0), texto("Segundo.", 19)];
    assert.deepEqual(textosDasPaginas(u, [27]), ["Primeiro parágrafo.\n\nSegundo."]);
    assert.deepEqual(textosDasPaginas(u, [8, 27]), ["Primeiro", "parágrafo.\n\nSegundo."]);
  });

  it("calcularLimites sem DOM (nenhuma caixa medida) devolve só o total", () => {
    const u = [texto("abc", 0)];
    assert.deepEqual(calcularLimites(u, 3, 1, 0, 300), [3]);
  });
});
