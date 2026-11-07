import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { arremateRedundante, classificar, frases } from "../src/lib/mestre/arremate";

// Rede de segurança do fim do turno (src/lib/mestre/arremate.ts): o rabo que só repete a vez ou a mecânica não é gravado.
// Casos tirados da transcrição da campanha 43 (pares mestre→mestre com "É a sua vez, Samuel" repetido).

const NARRADO =
  "A chuva bate nas janelas do consultório enquanto Vera folheia o prontuário. Samuel sente o cheiro de sangue velho vindo do corredor, " +
  "e a enfermeira na recepção finge não ver a mancha escura que cresce sob a porta 7. Alguém geme lá dentro, baixo, com um ritmo " +
  "que não parece dor: parece contagem. Vera fecha o prontuário e olha para você.";

describe("frases e classificar", () => {
  it("quebra em frases e classifica vez, mecânica, eco e nova", () => {
    assert.deepEqual(frases("A vez é sua, Samuel. O que você faz?"), ["A vez é sua, Samuel.", "O que você faz?"]);
    const conhecidas = new Set(["chuva", "janelas", "consultorio", "prontuario"]);
    assert.equal(classificar("É a sua vez, Samuel.", conhecidas), "vez");
    assert.equal(classificar("Você ganhou 1 Mancha (agora 1/4).", conhecidas), "mecanica");
    assert.equal(classificar("A chuva bate nas janelas do consultório.", conhecidas), "eco");
    assert.equal(classificar("Um carro preto para em frente ao hospício.", conhecidas), "nova");
  });
});

describe("arremateRedundante", () => {
  it("descarta 'É a sua vez, Samuel…' depois de narração longa", () => {
    assert.equal(arremateRedundante("É a sua vez, Samuel…", NARRADO, ["Samuel", "Vera"]), true);
    assert.equal(arremateRedundante("O dado está com você.", NARRADO), true);
    assert.equal(arremateRedundante("Pronto.", NARRADO), true);
    assert.equal(arremateRedundante("—", NARRADO), true);
  });

  it("descarta resumo mecânico fora da ficção", () => {
    assert.equal(arremateRedundante("Você gastou 1 de Força de Vontade (agora 4/5). Anotei no diário.", NARRADO), true);
  });

  it("mantém parágrafo com informação nova, fala entre aspas e fala fora do jogo", () => {
    assert.equal(arremateRedundante("Um carro preto para em frente ao hospício e dois homens descem. É a sua vez.", NARRADO), false);
    assert.equal(arremateRedundante("\"Sua vez\", diz Vera.", NARRADO), false);
    assert.equal(arremateRedundante("((Fora do jogo: quer pausar aqui?))", NARRADO), false);
  });

  it("sem narração substancial antes, o rabo pode ser a resposta inteira: fica", () => {
    assert.equal(arremateRedundante("É a sua vez, Samuel.", "Curto."), false);
    assert.equal(arremateRedundante("", NARRADO), false);
  });
});
