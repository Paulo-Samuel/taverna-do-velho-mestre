import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIM_DE_SESSAO, INICIO, RESULTADO_TESTE } from "../src/lib/constantes";
import { JANELA_RECENTE, LIMITE_SEM_RESUMO, MANTER_LITERAIS } from "../src/lib/mestre/memoria";
import { cenaEmTexto } from "../src/lib/mestre/prompt";
import { filaPronta } from "../src/lib/mestre/rodada";

// Núcleo do turno do mestre (pacote W02): quando a fila vira turno (src/lib/mestre/rodada.ts), a relação entre a janela
// literal e o resumo (memoria.ts) e a trilha na cena em texto (prompt.ts).

const AURORA = 1;
const CAIO = 2;
const acao = (personagemId: number, acao: string) => ({ personagemId, acao });
const resultado = (personagemId: number) => acao(personagemId, `${RESULTADO_TESTE}Aurora · Percepção — notar o perigo: 1d20+4 → 17 vs 12 · Sucesso`);

describe("filaPronta (prontoParaNarrar)", () => {
  it("fila vazia nunca narra; teste pendente segura a narração em qualquer modo", () => {
    assert.equal(filaPronta({ fila: [], personagens: [AURORA], testePendente: false }), false);
    assert.equal(filaPronta({ fila: [acao(AURORA, "Entro.")], personagens: [AURORA], modo: "livre", testePendente: true }), false);
    assert.equal(filaPronta({ fila: [resultado(AURORA)], personagens: [AURORA, CAIO], modo: "rodada", testePendente: true }), false);
  });

  it("modo livre responde assim que há ação; início e fim da noite sempre passam", () => {
    assert.equal(filaPronta({ fila: [acao(AURORA, "Entro.")], personagens: [AURORA, CAIO], modo: "livre", testePendente: false }), true);
    assert.equal(filaPronta({ fila: [acao(AURORA, "Entro.")], personagens: [AURORA, CAIO], testePendente: false }), true);
    assert.equal(filaPronta({ fila: [{ personagemId: null, acao: INICIO }], personagens: [AURORA, CAIO], modo: "rodada", testePendente: false }), true);
    assert.equal(filaPronta({ fila: [{ personagemId: null, acao: FIM_DE_SESSAO }], personagens: [AURORA, CAIO], modo: "rodada", testePendente: false }), true);
  });

  it("modo rodada espera todos os personagens, a não ser que alguém force", () => {
    const fila = [acao(AURORA, "Entro.")];
    assert.equal(filaPronta({ fila, personagens: [AURORA, CAIO], modo: "rodada", testePendente: false }), false);
    assert.equal(filaPronta({ fila, personagens: [AURORA, CAIO], modo: "rodada", testePendente: false, forcar: true }), true);
    assert.equal(filaPronta({ fila: [...fila, acao(CAIO, "Fico na porta.")], personagens: [AURORA, CAIO], modo: "rodada", testePendente: false }), true);
  });

  it("modo rodada + o jogador rola: o resultado do teste é narrado na hora, sem esperar os outros agirem de novo", () => {
    // antes, o RESULTADO_TESTE contava como ação comum da rodada: a mesa travava em silêncio até Caio agir de novo
    assert.equal(filaPronta({ fila: [resultado(AURORA)], personagens: [AURORA, CAIO], modo: "rodada", testePendente: false }), true);
    // com uma ação comum junto, idem
    assert.equal(filaPronta({ fila: [acao(CAIO, "Olho em volta."), resultado(AURORA)], personagens: [AURORA, CAIO], modo: "rodada", testePendente: false }), true);
    // mas enquanto outro teste da mesma rodada ainda não foi rolado (ou decidido), continua esperando
    assert.equal(filaPronta({ fila: [resultado(AURORA)], personagens: [AURORA, CAIO], modo: "rodada", testePendente: true }), false);
  });
});

describe("memória: janela literal e resumo", () => {
  it("a janela literal nunca é menor que o limite do resumo, que guarda menos literais que o limite", () => {
    assert.ok(JANELA_RECENTE >= LIMITE_SEM_RESUMO, `JANELA_RECENTE (${JANELA_RECENTE}) < LIMITE_SEM_RESUMO (${LIMITE_SEM_RESUMO}): mensagens sumiriam entre o resumo e a transcrição`);
    assert.ok(LIMITE_SEM_RESUMO > MANTER_LITERAIS);
  });
});

describe("cenaEmTexto: trilha", () => {
  const cena = { local: "Motel Estrela do Vale", momento: "Duas da manhã", musica: { humor: "tensao" as const, energia: "media" as const }, musicaDesde: 1800 };

  it("diz o que está tocando e há quantos turnos", () => {
    const texto = cenaEmTexto(cena, "Defesa", 7);
    assert.match(texto, /- Trilha: tensao \(media\), há 7 turnos/);
    assert.match(cenaEmTexto(cena, "Defesa", 1), /há 1 turno$/m);
    assert.match(cenaEmTexto(cena, "Defesa", 0), /desde este turno/);
    // sem contagem (cena antiga, sem musicaDesde) a linha fica só com o humor
    assert.match(cenaEmTexto(cena), /- Trilha: tensao \(media\)$/m);
  });

  it("sem música não há linha de trilha", () => {
    assert.doesNotMatch(cenaEmTexto({ local: "Taverna" }, "Defesa", 3), /Trilha/);
  });
});
