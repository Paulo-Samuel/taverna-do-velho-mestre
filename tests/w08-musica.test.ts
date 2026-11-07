import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { _depurarMotor, curvaPotenciaIgual, estadoMusica, PRAZO_FORA_DA_MESA_MS, PRAZO_SOLTAR_MS, reterMotor, soltarMotor } from "../src/lib/cliente/musica/motor";
import {
  assinarHumorManual,
  chaveHumorManual,
  ENERGIAS_MUSICA,
  HUMOR_MANUAL_PADRAO,
  HUMORES_MUSICA,
  humorManual,
  salvarHumorManual,
} from "../src/lib/cliente/musica/preferencias";
import { ROTULO_ENERGIA, ROTULO_HUMOR } from "../src/lib/cliente/musica/teoria";

// W08: trilha sobrevive à navegação (prazo do soltarMotor, flag de desbloqueio no módulo), crossfade de potência igual
// e humor manual por campanha no localStorage. Sem Web Audio no Node: o motor fica sem contexto, o que basta para
// testar o ciclo reter/soltar e a flag.

/** localStorage de mentira (o Node não tem): guarda em memória e pode ser mandado a falhar */
function instalarLocalStorage(opcoes: { falhar?: boolean } = {}) {
  const dados = new Map<string, string>();
  const falha = () => {
    throw new Error("QuotaExceededError (teste)");
  };
  const loja = {
    getItem: (k: string) => (opcoes.falhar ? falha() : (dados.get(k) ?? null)),
    setItem: (k: string, v: string) => (opcoes.falhar ? falha() : void dados.set(k, String(v))),
    removeItem: (k: string) => (opcoes.falhar ? falha() : void dados.delete(k)),
    _dados: dados,
  };
  (globalThis as unknown as { localStorage: unknown }).localStorage = loja;
  if (!(globalThis as unknown as { window?: unknown }).window) {
    (globalThis as unknown as { window: unknown }).window = { addEventListener() {}, removeEventListener() {} };
  }
  return loja;
}

describe("W08 humor manual por campanha (preferencias.ts)", () => {
  let loja: ReturnType<typeof instalarLocalStorage>;
  // cada teste usa uma campanha própria: o módulo guarda um cache por chave
  let n = 9000;
  beforeEach(() => {
    loja = instalarLocalStorage();
    n++;
  });

  it("lista os 9 humores e as 3 energias, todos com rótulo", () => {
    assert.equal(HUMORES_MUSICA.length, 9);
    assert.equal(ENERGIAS_MUSICA.length, 3);
    for (const h of HUMORES_MUSICA) assert.ok(ROTULO_HUMOR[h], `rótulo de ${h}`);
    for (const e of ENERGIAS_MUSICA) assert.ok(ROTULO_ENERGIA[e], `rótulo de ${e}`);
  });

  it("chave por campanha e padrão automático", () => {
    assert.equal(chaveHumorManual(34), "taverna:musica:34");
    assert.deepEqual(humorManual(n), { humor: null, energia: null });
    assert.equal(humorManual(null), HUMOR_MANUAL_PADRAO, "sem campanha nunca há escolha manual");
    // fora de uma mesa (/nova) salvar não faz nada nem grava chave "geral"
    salvarHumorManual(null, { humor: "tensao" });
    assert.equal(humorManual(null), HUMOR_MANUAL_PADRAO);
    assert.equal([...loja._dados.keys()].some((k) => k.startsWith("taverna:musica:")), false, "nenhuma chave de humor gravada");
  });

  it("guarda o humor no localStorage da campanha e avisa quem assina", () => {
    let avisos = 0;
    const sair = assinarHumorManual(() => avisos++);
    salvarHumorManual(n, { humor: "tensao" });
    assert.equal(humorManual(n).humor, "tensao");
    assert.equal(humorManual(n).energia, null, "energia continua seguindo a cena");
    assert.deepEqual(JSON.parse(loja._dados.get(`taverna:musica:${n}`)!), { humor: "tensao", energia: null });
    assert.equal(avisos, 1);
    salvarHumorManual(n, { energia: "alta" });
    assert.deepEqual(humorManual(n), { humor: "tensao", energia: "alta" });
    assert.equal(avisos, 2);
    sair();
  });

  it("não vaza para outra campanha", () => {
    salvarHumorManual(n, { humor: "combate" });
    assert.equal(humorManual(n + 500).humor, null);
  });

  it("voltar ao automático limpa a chave", () => {
    salvarHumorManual(n, { humor: "sombrio", energia: "media" });
    salvarHumorManual(n, { humor: null, energia: null });
    assert.equal(humorManual(n), HUMOR_MANUAL_PADRAO);
    assert.equal(loja._dados.has(`taverna:musica:${n}`), false);
  });

  it("sobrevive ao recarregar: lê o que estava salvo e ignora valores inválidos", () => {
    loja._dados.set(`taverna:musica:${n}`, JSON.stringify({ humor: "misterio", energia: "turbo" }));
    assert.deepEqual(humorManual(n), { humor: "misterio", energia: null });
    loja._dados.set(`taverna:musica:${n + 1}`, "isto não é json");
    assert.equal(humorManual(n + 1), HUMOR_MANUAL_PADRAO);
    loja._dados.set(`taverna:musica:${n + 2}`, JSON.stringify({ humor: "inexistente" }));
    assert.equal(humorManual(n + 2), HUMOR_MANUAL_PADRAO);
  });

  it("localStorage bloqueado: fica só na memória, sem lançar", () => {
    instalarLocalStorage({ falhar: true });
    assert.doesNotThrow(() => salvarHumorManual(n, { humor: "triste" }));
    assert.equal(humorManual(n).humor, "triste");
    assert.doesNotThrow(() => humorManual(n + 1));
  });
});

describe("W08 crossfade de potência igual (motor.ts)", () => {
  it("entrada em seno e saída em cosseno somam potência constante", () => {
    const entrada = curvaPotenciaIgual(0.5, "entrada");
    const saida = curvaPotenciaIgual(0.5, "saida");
    assert.equal(entrada.length, saida.length);
    assert.ok(entrada[0] <= 0.0001 + 1e-9, "a entrada começa no piso");
    assert.ok(Math.abs(entrada[entrada.length - 1] - 0.5) < 1e-6, "a entrada termina no alvo");
    assert.ok(Math.abs(saida[0] - 0.5) < 1e-6, "a saída começa no alvo");
    assert.ok(saida[saida.length - 1] <= 0.0001 + 1e-9, "a saída termina no piso");
    for (let i = 0; i < entrada.length; i++) {
      const potencia = entrada[i] ** 2 + saida[i] ** 2;
      assert.ok(Math.abs(potencia - 0.25) < 1e-6, `potência constante no ponto ${i}: ${potencia}`);
    }
    // o cruzamento linear afundaria para 0,25 + 0,25 = 0,5 do alvo no meio; aqui as duas no meio somam 0,707 cada
    const meio = Math.floor(entrada.length / 2);
    assert.ok(entrada[meio] > 0.35 && saida[meio] > 0.35);
  });

  it("nunca desce abaixo do piso (serve para rampas exponenciais depois)", () => {
    // Float32Array: 0,0001 vira 9,9999997e-05; compara com o mesmo arredondamento
    for (const forma of ["entrada", "saida"] as const) for (const v of curvaPotenciaIgual(1, forma, 9)) assert.ok(v >= Math.fround(0.0001));
  });
});

describe("W08 motor sobrevive à navegação (reter/soltar)", () => {
  beforeEach(() => mock.timers.enable({ apis: ["setTimeout", "setInterval"] }));
  afterEach(() => mock.timers.reset());

  it("prazo de soltar é ~90 s", () => {
    assert.ok(PRAZO_SOLTAR_MS >= 60_000 && PRAZO_SOLTAR_MS <= 120_000);
  });

  it("dentro do prazo, reter devolve a mesma instância; fora dele, destrói", () => {
    const a = reterMotor();
    assert.equal(_depurarMotor().usuarios, 1);
    soltarMotor();
    assert.deepEqual([_depurarMotor().usuarios, _depurarMotor().aguardandoFechar, _depurarMotor().temInstancia], [0, true, true]);
    // 60 s em Ajustes: a trilha segue
    mock.timers.tick(60_000);
    assert.equal(_depurarMotor().temInstancia, true);
    const b = reterMotor();
    assert.equal(a, b, "voltou para a mesa: mesmo motor, mesma camada");
    assert.equal(_depurarMotor().aguardandoFechar, false, "a volta cancela o fechamento");
    soltarMotor();
    mock.timers.tick(PRAZO_SOLTAR_MS + 1);
    assert.equal(_depurarMotor().temInstancia, false, "passou o prazo sem ninguém: fechou");
    const c = reterMotor();
    assert.notEqual(a, c);
    soltarMotor();
    mock.timers.tick(PRAZO_SOLTAR_MS + 1);
  });

  it("fora de uma mesa (página inicial) fecha logo; dentro (Ajustes, Livro) espera o prazo", () => {
    const g = globalThis as unknown as { location?: { pathname: string } };
    const antes = g.location;
    try {
      // em Ajustes da mesa: segue até o prazo
      g.location = { pathname: "/mesa/34/ajustes" };
      const a = reterMotor();
      soltarMotor();
      mock.timers.tick(PRAZO_FORA_DA_MESA_MS + 10);
      assert.equal(_depurarMotor().temInstancia, true, "no Ajustes a trilha segue depois do prazo curto");
      assert.equal(reterMotor(), a);
      soltarMotor();
      mock.timers.tick(PRAZO_SOLTAR_MS + 1);
      assert.equal(_depurarMotor().temInstancia, false);

      // voltou para a página inicial: fecha no prazo curto, sem esperar os 90 s
      g.location = { pathname: "/" };
      reterMotor();
      soltarMotor();
      mock.timers.tick(PRAZO_FORA_DA_MESA_MS - 10);
      assert.equal(_depurarMotor().temInstancia, true, "ainda dentro do prazo curto");
      mock.timers.tick(20);
      assert.deepEqual([_depurarMotor().temInstancia, _depurarMotor().aguardandoFechar], [false, false], "fora da mesa fechou cedo");

      // StrictMode / troca de página com <Musica> nas duas: reter dentro do prazo curto cancela o fechamento
      g.location = { pathname: "/" };
      const c = reterMotor();
      soltarMotor();
      mock.timers.tick(PRAZO_FORA_DA_MESA_MS / 2);
      assert.equal(reterMotor(), c);
      mock.timers.tick(PRAZO_SOLTAR_MS + 1);
      assert.equal(_depurarMotor().temInstancia, true, "retido: ninguém fecha");
      soltarMotor();
      mock.timers.tick(PRAZO_FORA_DA_MESA_MS + 10);
      assert.equal(_depurarMotor().temInstancia, false);
    } finally {
      if (antes === undefined) delete g.location;
      else g.location = antes;
    }
  });

  it("desbloqueio fica no módulo: um motor novo já nasce liberado e não pede gesto", () => {
    const a = reterMotor();
    a.definirPreferencias(true, 0.4);
    assert.equal(estadoMusica().aguardandoGesto, true, "antes de qualquer gesto, espera");
    assert.equal(a.precisaGesto(), true);
    a.desbloquear();
    assert.equal(_depurarMotor().desbloqueado, true);
    // sem AudioContext no Node o contexto não existe; a flag é o que vale
    assert.equal(estadoMusica().aguardandoGesto, false);
    soltarMotor();
    mock.timers.tick(PRAZO_SOLTAR_MS + 1);
    assert.equal(_depurarMotor().temInstancia, false);
    const b = reterMotor();
    b.definirPreferencias(true, 0.4);
    assert.equal(_depurarMotor().desbloqueado, true, "a ativação do documento é pegajosa");
    assert.equal(estadoMusica().aguardandoGesto, false, "não volta a pedir o clique depois de navegar");
    b.definirPreferencias(false, 0.4);
    assert.equal(b.precisaGesto(), false, "desligado não pede gesto");
    soltarMotor();
    mock.timers.tick(PRAZO_SOLTAR_MS + 1);
  });
});
