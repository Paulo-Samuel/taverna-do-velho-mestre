import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALTURA_ENTRA, ALTURA_SAI, avaliarTelaBaixa } from "../src/components/leitor/altura";
import { contarChips, type GrupoChips } from "../src/components/leitor/cena";
import { assinaturaDosCompactaveis, escalaMinima, rumoAoDado, type Unidade } from "../src/components/leitor/paginacao";

// W07: as regras puras do leitor que decidem onde o dado aparece e quando a tela é baixa demais para páginas
// (src/components/leitor/paginacao.ts, altura.ts e cena.ts). O que depende do DOM (compactar, medir) é conferido no navegador.

describe("rumoAoDado (o teste pendente caiu em outra página)", () => {
  it("nada enquanto o cartão está nesta página, antes dela ou não existe", () => {
    assert.equal(rumoAoDado({ paginaDoDestaque: null, paginaAtual: 0, completa: true, automatico: true }), "nada");
    assert.equal(rumoAoDado({ paginaDoDestaque: 0, paginaAtual: 0, completa: true, automatico: true }), "nada");
    assert.equal(rumoAoDado({ paginaDoDestaque: 1, paginaAtual: 2, completa: true, automatico: true }), "nada", "quem voltou para reler não é empurrado");
  });

  it("nada enquanto a página atual ainda se revela", () => {
    assert.equal(rumoAoDado({ paginaDoDestaque: 1, paginaAtual: 0, completa: false, automatico: true }), "nada");
  });

  it("com a página revelada: avança sozinho quando a pessoa acompanhou o texto (ou a cena já estava lida), senão só chama", () => {
    assert.equal(rumoAoDado({ paginaDoDestaque: 1, paginaAtual: 0, completa: true, automatico: true }), "avancar");
    assert.equal(rumoAoDado({ paginaDoDestaque: 3, paginaAtual: 0, completa: true, automatico: false }), "chamar", "texto que apareceu de uma vez ainda não foi lido");
  });
});

describe("escalaMinima (cartão encolhido para caber no fim da página)", () => {
  it("aceita encolher mais no celular", () => {
    assert.equal(escalaMinima(false), 0.75);
    assert.equal(escalaMinima(true), 0.7);
    assert.ok(escalaMinima(true) < escalaMinima(false));
  });
});

describe("assinaturaDosCompactaveis (quando a conta dos cartões encolhidos é refeita)", () => {
  // o fio sem DOM: nós de texto e cartões falsos, só com o que a assinatura lê
  const texto = (inicio: number, tamanho: number): Unidade => ({ tipo: "texto", no: { data: "x".repeat(tamanho) } as unknown as Text, inicio, tamanho, fimDeBloco: true });
  const cartao = (inicio: number, compactavel: boolean): Unidade => ({
    tipo: "cartao",
    el: { hasAttribute: (a: string) => compactavel && a === "data-compactavel" } as unknown as HTMLElement,
    inicio,
    tamanho: 1,
  });
  const antes = [texto(0, 120), cartao(120, true)];

  it("só olha o que vem antes de cada cartão encolhível", () => {
    assert.equal(assinaturaDosCompactaveis(antes), "120");
    assert.equal(assinaturaDosCompactaveis([texto(0, 80), cartao(80, true), texto(81, 40), cartao(121, true)]), "80,121");
  });

  it("o que vem depois do cartão (narração chegando, 'pensando' da cauda) e o que muda dentro dele não refazem a conta", () => {
    const comCauda = [...antes, cartao(121, false)];
    const comNarracao = [...antes, texto(121, 300), cartao(421, false)];
    assert.equal(assinaturaDosCompactaveis(comCauda), assinaturaDosCompactaveis(antes));
    assert.equal(assinaturaDosCompactaveis(comNarracao), assinaturaDosCompactaveis(antes));
  });

  it("cartão novo ou texto chegando antes de um cartão mudam a assinatura", () => {
    assert.notEqual(assinaturaDosCompactaveis([texto(0, 200), cartao(200, true)]), assinaturaDosCompactaveis(antes));
    assert.notEqual(assinaturaDosCompactaveis([...antes, texto(121, 50), cartao(171, true)]), assinaturaDosCompactaveis(antes));
    assert.equal(assinaturaDosCompactaveis([texto(0, 120), cartao(120, false)]), "", "separador e aparte não são encolhíveis");
  });
});

describe("avaliarTelaBaixa (histerese da rolagem automática)", () => {
  it("entra abaixo de ALTURA_ENTRA e só sai acima de ALTURA_SAI", () => {
    assert.ok(ALTURA_ENTRA < ALTURA_SAI, "a saída fica acima da entrada para não ficar trocando na beira");
    assert.equal(avaliarTelaBaixa(ALTURA_ENTRA - 1, false), true, "palco de ~180 px já é baixo");
    assert.equal(avaliarTelaBaixa(ALTURA_ENTRA, false), false);
    assert.equal(avaliarTelaBaixa(ALTURA_ENTRA + 10, true), true, "no meio da faixa, continua como estava");
    assert.equal(avaliarTelaBaixa(ALTURA_SAI, true), false, "com altura de sobra volta às páginas");
    assert.equal(avaliarTelaBaixa(600, false), false, "1366×768 a 100 %: palco de ~490 px");
  });

  it("zoom 200 % em 768 px (espaço de 200-240 px) cai para a rolagem; 150 % (~360 px) e 125 % (~370 px) ficam em páginas", () => {
    assert.equal(avaliarTelaBaixa(202, false), true);
    assert.equal(avaliarTelaBaixa(238, false), true);
    assert.equal(avaliarTelaBaixa(366, false), false);
    assert.equal(avaliarTelaBaixa(334 + 36, false), false);
  });

  it("medida sem sentido (0, NaN) não muda o estado", () => {
    assert.equal(avaliarTelaBaixa(0, true), true);
    assert.equal(avaliarTelaBaixa(Number.NaN, false), false);
  });
});

describe("contarChips (rótulo da faixa recolhida)", () => {
  it("soma os chips de todos os grupos", () => {
    const chip = (chave: string) => ({ chave, rotulo: chave, detalhe: "", tom: "neutro" as const, icone: "·" });
    const grupos: GrupoChips[] = [
      { tipo: "personagem", quem: "Vera", chips: [chip("fome"), chip("mancha")] },
      { tipo: "mundo", quem: "Diário", chips: [chip("missao")] },
    ];
    assert.equal(contarChips(grupos), 3);
    assert.equal(contarChips([]), 0);
  });
});
