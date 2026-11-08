import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acaoParaCampo,
  avisoDoDesfeito,
  chipsDaNoite,
  idUltimaMensagem,
  noiteAtual,
  noiteEncerrada,
  proximoFechando,
  remorsoDesde,
  resumoParaLeitura,
  semAnteriormente,
  semMarkdown,
  sessaoDaMesa,
  ultimoMarcador,
  xpDesde,
} from "../src/components/sessao/noite";

// Fim da noite (W22): leitura das mensagens em volta do marcador, o "fechando" da mesa, o Reabrir a noite e o resumo do
// Anteriormente sem markdown. Só funções puras: nada de banco nem de navegador.

type M = { id: number; tipo: string; texto: string; dados: Record<string, unknown> | null; personagemId: number | null; autor: string; criadaEm: string };
let proximo = 1;
const msg = (tipo: string, dados: Record<string, unknown> | null = null, personagemId: number | null = null): M => ({
  id: proximo++,
  tipo,
  texto: "",
  dados,
  personagemId,
  autor: "",
  criadaEm: "",
});
const marcador = (sessao: number) => msg("dado", { tipo: "fim_sessao", sessao, data: "2026-11-08T22:00:00.000Z", rotulo: `Fim da sessão ${sessao}` });

describe("noite", () => {
  it("conta a noite pelo contador da campanha, senão pelo último marcador", () => {
    const ms = [msg("mestre"), marcador(2), msg("jogador")] as never[];
    assert.equal(ultimoMarcador(ms), 1);
    assert.equal(noiteAtual(ms), 3);
    assert.equal(noiteAtual(ms, 7), 7);
    assert.equal(noiteAtual(ms, 2), 3);
    assert.equal(noiteAtual([] as never[]), 1);
    // pausa de 5 h seguida de mensagem nova também fecha a noite (o `sessao` carregado com a mesa pode estar velho)
    const a = { ...msg("mestre"), criadaEm: "2026-11-08 20:00:00" };
    const b = { ...msg("jogador"), criadaEm: "2026-11-09 02:00:00" };
    assert.equal(noiteAtual([a, b] as never[], 1), 2);
    // parada há horas sem mensagem nova: continua a mesma noite (o servidor fecha essa noite em retrospectiva)
    assert.equal(noiteAtual([a] as never[], 1), 1);
    // contador do servidor: no estado da mesa (W21) ou, no formato antigo, na campanha
    assert.equal(sessaoDaMesa({ sessao: 2, campanha: {} }), 2);
    assert.equal(sessaoDaMesa({ campanha: { sessao: 4 } }), 4);
    assert.equal(sessaoDaMesa({ sessao: null, campanha: {} }), null);
  });

  it("noite encerrada só enquanto ninguém agiu depois do marcador", () => {
    const fim = marcador(1);
    const ms = [msg("mestre"), msg("dado", { tipo: "xp", personagem: "Vera", ganho: 2, motivo: "noite jogada" }), fim, msg("sistema")];
    assert.deepEqual(noiteEncerrada(ms as never[]), { id: fim.id, sessao: 1, data: "2026-11-08T22:00:00.000Z" });
    assert.equal(noiteEncerrada([...ms, msg("jogador")] as never[]), null);
    assert.equal(noiteEncerrada([msg("mestre")] as never[]), null);
  });

  it("lê o XP e o Remorso (pendente, rolado pelo jogador, automático)", () => {
    const ms = [
      marcador(1),
      msg("dado", { tipo: "pedido_teste", teste: "Remorso", status: "pendente", personagemId: 5 }, 5),
      msg("dado", { tipo: "xp", personagem: "Vera", ganho: 2, motivo: "noite jogada" }),
    ];
    assert.deepEqual(remorsoDesde(ms as never[], 1, 5), { tipo: "pendente", mensagemId: ms[1].id });
    assert.deepEqual(xpDesde(ms as never[], 0).map((x) => [x.personagem, x.ganho, x.motivo]), [["Vera", 2, "noite jogada"]]);
    ms[1].dados = { ...ms[1].dados, status: "resolvido", resultado: { grau: "falha", sucesso: false } };
    assert.deepEqual(remorsoDesde(ms as never[], 1, 5), { tipo: "resolvido", mensagemId: ms[1].id, sucesso: false, rotulo: null });
    const auto = msg("dado", { tipo: "teste", teste: "Remorso", vtm: "remorso", sucesso: true, grau: "sucesso", personagemId: 6 });
    assert.equal((remorsoDesde([auto] as never[], 0, 6) as { sucesso: boolean }).sucesso, true);
    assert.equal(remorsoDesde([auto] as never[], 0, 5), null);
  });

  it("chips da noite que acabou: XP somado por personagem e o Remorso", () => {
    const ms = [
      marcador(1),
      msg("dado", { tipo: "xp", personagem: "Vera", ganho: 1, motivo: "noite" }),
      msg("dado", { tipo: "xp", personagem: "Vera", ganho: 2, motivo: "Ambição" }),
      msg("dado", { tipo: "pedido_teste", teste: "Remorso", personagem: "Vera", status: "resolvido", resultado: { sucesso: true } }),
      marcador(2),
    ];
    assert.deepEqual(chipsDaNoite(ms as never[]), ["Vera: +3 XP", "Vera: Remorso — Humanidade mantida"]);
  });
});

describe("fechando", () => {
  const fim = { id: 1, campanhaId: 1, personagemId: null, autor: "", acao: "[fim da sessão]", criadaEm: "" };
  it("liga com o pedido na fila, segue enquanto o mestre narra e cai quando ele para", () => {
    assert.equal(proximoFechando(false, { ocupado: false, fila: [fim] as never[] }), true);
    assert.equal(proximoFechando(true, { ocupado: true, fila: [] }), true);
    assert.equal(proximoFechando(true, { ocupado: false, fila: [] }), false);
    assert.equal(proximoFechando(false, { ocupado: true, fila: [] }), false);
    assert.equal(proximoFechando(false, { ocupado: true, fila: [], fechando: true }), true);
  });
});

describe("reabrir a noite", () => {
  it("o pedido interno de fechar nunca volta ao campo e o aviso fala em noite reaberta", () => {
    const r = { acoes: [{ personagemId: null, autor: "", acao: "[fim da sessão]" }], abertura: false, restantes: 3 };
    assert.equal(acaoParaCampo(r, 5), null);
    assert.equal(avisoDoDesfeito(r, false, false), "Noite reaberta. O jogo continua de onde parou.");
    // servidor da W21: o pedido interno some das ações devolvidas; quem sabe que era o fechamento é a mesa
    const semPedido = { acoes: [], abertura: false, restantes: 2 };
    assert.equal(avisoDoDesfeito(semPedido, false, false, true), "Noite reaberta. O jogo continua de onde parou.");
    assert.equal(avisoDoDesfeito(semPedido, false, false), "Turno desfeito.");
    const normal = { acoes: [{ personagemId: null, autor: "Ana", acao: "(( dúvida ))" }], abertura: false, restantes: 1 };
    assert.equal(acaoParaCampo(normal, 5), "(( dúvida ))");
  });
});

describe("resumo do Anteriormente", () => {
  const resumo = [
    "## Personagens",
    "- **Vera**, Brujah, 2 Manchas",
    "## Enredo",
    "A coterie descobriu que o **Príncipe** mente sobre a *Segunda Inquisição*.",
    "",
    "## Ganchos",
    "- Encontrar o [informante](http://x) no metrô",
    "- Pagar a dívida com a Harpia",
  ].join("\n");

  it("fica só com enredo e ganchos, sem markdown, com listas", () => {
    const { blocos, cortado } = resumoParaLeitura(resumo);
    assert.equal(cortado, false);
    assert.deepEqual(blocos, [
      { tipo: "paragrafo", texto: "A coterie descobriu que o Príncipe mente sobre a Segunda Inquisição." },
      { tipo: "lista", itens: ["Encontrar o informante no metrô", "Pagar a dívida com a Harpia"] },
    ]);
  });

  it("corta em ~120 palavras e avisa", () => {
    const longo = Array.from({ length: 300 }, (_, i) => `palavra${i}`).join(" ");
    const { blocos, cortado } = resumoParaLeitura(longo);
    assert.equal(cortado, true);
    const texto = (blocos[0] as { texto: string }).texto;
    assert.equal(texto.split(" ").length, 120);
    assert.ok(texto.endsWith("…"));
  });

  it("tira negrito, itálico e links", () => {
    assert.equal(semMarkdown("**a** e *b* e _c_ e [d](e)"), "a e b e c e d");
  });

  it("tira o 'Anteriormente…' de abertura, com marcação ou aspas antes", () => {
    const fim = "você chegou à taverna atrás de respostas.";
    for (const t of [
      `Anteriormente… ${fim}`,
      `Anteriormente... ${fim}`,
      `anteriormente: ${fim}`,
      `**Anteriormente…** ${fim}`,
      `*Anteriormente...* ${fim}`,
      `"Anteriormente… ${fim}`,
      `“Anteriormente…” ${fim}`,
      `## Anteriormente…\n${fim}`,
      `— Anteriormente, ${fim}`,
      `  Anteriormente …  ${fim}`,
    ])
      assert.equal(semAnteriormente(t), "Você chegou à taverna atrás de respostas.", t);
    // no meio do texto fica
    assert.equal(semAnteriormente("Como dito anteriormente, a noite caiu."), "Como dito anteriormente, a noite caiu.");
  });

  it("id da última mensagem: objeto da W21 ou número antigo", () => {
    assert.equal(idUltimaMensagem({ id: 5333, criadaEm: "2026-11-08 20:00:00", tipo: "mestre" }), 5333);
    assert.equal(idUltimaMensagem(42), 42);
    assert.equal(idUltimaMensagem(null), null);
    assert.equal(idUltimaMensagem(undefined), null);
    assert.equal(idUltimaMensagem({ id: Number.NaN }), null);
  });
});
