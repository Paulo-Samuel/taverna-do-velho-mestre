// Mesa pela rede: espectador por padrão, hot-seat que não passa a vez para quem está em outro aparelho, queda de
// conexão visível e "O mestre lê o resultado…".
//
// Roda contra um servidor de desenvolvimento com o mestre FALSO (TAVERNA_PROVEDOR=falso) numa campanha de teste em
// modo avançado + rodada com dois personagens (o primeiro de "Paulo", o segundo de "Amigo"):
//   W05_CAMPANHA=84 node --test tests/w05-rede.test.mjs
// Variáveis: W05_BASE (padrão http://localhost:3302), W05_PLAYWRIGHT (pasta do pacote playwright), W05_CAPTURAS (pasta das capturas).
// "A rede" é simulada com um nome de host que não é desta máquina (amigo.local → 127.0.0.1 pelo --host-resolver-rules):
// o servidor decide "local" pelo Host e pelo IP de origem, então um nome estranho basta para entrar como aparelho da rede.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";

const require = createRequire(import.meta.url);
const BASE = process.env.W05_BASE ?? "http://localhost:3302";
const ID = Number(process.env.W05_CAMPANHA);
const HOST_REDE = "amigo.local";
const BASE_REDE = BASE.replace(/\/\/[^/:]+/, `//${HOST_REDE}`);
const CAPTURAS = process.env.W05_CAPTURAS ?? null;
const PRAZO = 240_000;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

let chromium = null;
try {
  ({ chromium } = require(process.env.W05_PLAYWRIGHT ?? "C:/Users/paulo/projetos/cloneprojetosOS/gradus-cordis/node_modules/playwright"));
} catch {
  // sem Playwright: os testes são pulados
}

async function servidorNoAr() {
  try {
    const r = await fetch(`${BASE}/api/rede`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Lê o estado inicial da mesa pelo fluxo de eventos (primeiro bloco) e fecha. */
async function estadoInicial(id) {
  const ac = new AbortController();
  const r = await fetch(`${BASE}/api/campanhas/${id}/eventos?cliente=teste-w05-leitor`, { signal: ac.signal });
  const leitor = r.body.getReader();
  const dec = new TextDecoder();
  let texto = "";
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    texto += dec.decode(value, { stream: true });
    // a presença (a nossa entrada) chega antes do estado: lê bloco a bloco até o estado_inicial
    let fim;
    while ((fim = texto.indexOf("\n\n")) >= 0) {
      const ev = JSON.parse(texto.slice(0, fim).replace(/^data: /, ""));
      texto = texto.slice(fim + 2);
      if (ev.e === "estado_inicial") {
        ac.abort();
        return ev.estado;
      }
    }
  }
  throw new Error("fluxo de eventos sem estado inicial");
}

const pular = !chromium || !ID || !(await servidorNoAr());
if (pular) console.log(`# pulando: ${!chromium ? "sem Playwright" : !ID ? "defina W05_CAMPANHA" : `servidor ${BASE} fora do ar`}`);

let browser;
let estado;
let aurora;
let caio;
const contextos = [];

async function novoContexto(rotulo, base, { apelido = null, pid = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-BR" });
  if (apelido !== null) {
    await ctx.addInitScript(
      ({ id, apelido, pid }) => {
        try {
          localStorage.setItem("taverna:apelido", apelido);
          if (pid) localStorage.setItem(`taverna:ativo:${id}`, String(pid));
        } catch {}
      },
      { id: ID, apelido, pid },
    );
  }
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(`PAGEERROR ${e.message.slice(0, 200)}`));
  page.on("console", (m) => m.type() === "error" && erros.push(`CONSOLE ${m.text().slice(0, 200)}`));
  const c = { ctx, page, rotulo, base, erros };
  contextos.push(c);
  return c;
}

/** O que a página mostra agora. */
async function ver(page) {
  return page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('[role="radiogroup"][aria-label="Agindo como"] [role="radio"]'));
    const ativo = radios.find((r) => r.getAttribute("aria-checked") === "true");
    const campo = document.querySelector("textarea[data-campo-acao]");
    const ponto = document.querySelector("[data-conexao]");
    const corpo = document.body.innerText;
    return {
      presenca: document.querySelector('button[aria-label*="na mesa"]')?.getAttribute("aria-label") ?? null,
      conexao: ponto?.getAttribute("data-conexao") ?? null,
      ativo: ativo?.getAttribute("title") ?? null,
      chips: radios.map((r) => ({ title: r.getAttribute("title"), emUso: r.hasAttribute("data-em-uso") })),
      soAssistindo: Boolean(document.querySelector("[data-so-assistindo]")),
      campo: campo?.value ?? null,
      placeholder: campo?.getAttribute("placeholder") ?? null,
      agirDesabilitado: (() => {
        const b = Array.from(document.querySelectorAll("form button")).find((x) => /^(Agir|Enviar)$/.test(x.textContent.trim()));
        return b ? b.disabled : null;
      })(),
      semSinal: Boolean(document.querySelector("[data-sem-sinal]")),
      ocupado: corpo.includes("interromper"),
      // textContent: a pena do "mestre escrevendo" anima o texto e o innerText pode deixá-lo de fora
      lendo: (document.body.textContent ?? "").includes("O mestre lê o resultado"),
      rolar: document.querySelectorAll("button[data-rolar]").length,
      aceitar: document.querySelectorAll("button[data-aceitar]").length,
      alertas: Array.from(document.querySelectorAll('[role="alert"]')).map((e) => e.textContent.trim()),
      status: Array.from(document.querySelectorAll('[role="status"]')).map((e) => e.textContent.trim().replace(/\s+/g, " ")),
      tamanho: corpo.length,
    };
  });
}

async function esperar(page, cond, prazo = 30_000, passo = 250) {
  const fim = Date.now() + prazo;
  let ultimo = null;
  while (Date.now() < fim) {
    ultimo = await ver(page);
    if (cond(ultimo)) return ultimo;
    await dormir(passo);
  }
  throw new Error(`esperei ${prazo} ms e a página ficou em: ${JSON.stringify(ultimo)}`);
}

async function agir(page, texto) {
  const campo = page.locator("textarea[data-campo-acao]");
  await campo.fill(texto);
  await campo.press("Enter");
}

async function capturar(c, nome) {
  if (!CAPTURAS) return;
  await c.page.screenshot({ path: `${CAPTURAS}/${nome}.png` }).catch(() => {});
}

/**
 * Deixa a mesa pronta para uma rodada nova (o teste pode rodar de novo na mesma campanha): o mestre termina o que estiver
 * narrando, a máquina da taverna rola e aceita testes pendentes, o resultado parado na fila é narrado e ações soltas da rodada
 * são forçadas.
 */
async function arrumarMesa(A, B) {
  const agiu = (e, nome) => e.chips.some((c) => c.title.startsWith(nome) && /já agiu/.test(c.title));
  for (let i = 0; i < 10; i++) {
    let e = await ver(A.page);
    if (e.ocupado) {
      await esperar(A.page, (x) => !x.ocupado, 120_000, 500);
      continue;
    }
    if (e.rolar > 0) {
      await A.page.$eval("button[data-rolar]", (b) => b.click());
      await dormir(1500);
      e = await ver(A.page);
      if (e.aceitar > 0) await A.page.$eval("button[data-aceitar]", (b) => b.click());
      await dormir(1000);
      continue;
    }
    // metade da rodada feita (ou só o resultado do dado na fila): quem falta age e o mestre narra
    if (e.lendo || (agiu(e, caio.ficha.nome) && !agiu(e, aurora.ficha.nome))) {
      await agir(e.lendo && !agiu(e, caio.ficha.nome) ? B.page : A.page, "Dou de ombros e espero");
      await esperar(A.page, (x) => x.ocupado, 15_000).catch(() => null);
      continue;
    }
    if (agiu(e, aurora.ficha.nome) && !agiu(e, caio.ficha.nome)) {
      await agir(B.page, "Dou de ombros e espero");
      await esperar(A.page, (x) => x.ocupado, 15_000).catch(() => null);
      continue;
    }
    return;
  }
  throw new Error("não consegui arrumar a mesa para a rodada");
}

/** Deixa o teste derrubar o fluxo de eventos da página como se o socket tivesse morrido (window.__derrubarFluxo()). */
const ESPIAO_EVENTSOURCE = () => {
  const Original = window.EventSource;
  const fontes = [];
  function Espiao(url, init) {
    const f = new Original(url, init);
    fontes.push(f);
    return f;
  }
  Espiao.prototype = Original.prototype;
  Espiao.CONNECTING = 0;
  Espiao.OPEN = 1;
  Espiao.CLOSED = 2;
  window.EventSource = Espiao;
  window.__derrubarFluxo = () => {
    for (const f of fontes) {
      if (f.readyState === 2) continue;
      f.close();
      f.dispatchEvent(new Event("error"));
    }
  };
};

before(async () => {
  if (pular) return;
  if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
  estado = await estadoInicial(ID);
  assert.ok(estado.campanha.nome.includes("(teste)"), `a campanha ${ID} não é de teste: ${estado.campanha.nome}`);
  assert.equal(estado.campanha.modo, "rodada", "a campanha de teste precisa estar no modo rodada");
  assert.equal(estado.personagens.length, 2, "a campanha de teste precisa ter dois personagens");
  [aurora, caio] = estado.personagens;
  assert.equal(aurora.jogador, "Paulo");
  assert.equal(caio.jogador, "Amigo");
  browser = await chromium.launch({ headless: true, args: [`--host-resolver-rules=MAP ${HOST_REDE} 127.0.0.1`] });
  await dormir(500);
});

after(async () => {
  for (const c of contextos) {
    if (c.erros.length) log(`[${c.rotulo}] erros de página:`, c.erros.slice(0, 5));
    await c.ctx.close().catch(() => {});
  }
  await browser?.close();
});

test("presença nasce em 'Conectando…' (sem vermelho) e vira 'Conectado'", { skip: pular, timeout: PRAZO }, async () => {
  const c = await novoContexto("C0", BASE_REDE);
  // segura o fluxo de eventos por um instante para ver a fase inicial
  await c.ctx.route("**/api/campanhas/*/eventos**", async (rota) => {
    await dormir(1500);
    await rota.continue();
  });
  await c.page.goto(`${c.base}/mesa/${ID}`, { waitUntil: "domcontentloaded" });
  const inicio = await ver(c.page);
  log("[C0] presença inicial:", inicio.presenca, "| ponto:", inicio.conexao);
  assert.equal(inicio.conexao, "conectando");
  assert.match(inicio.presenca ?? "", /^Conectando…/);
  assert.doesNotMatch(inicio.presenca ?? "", /Reconectando/);
  const depois = await esperar(c.page, (e) => e.conexao === "ok", 15_000);
  assert.match(depois.presenca, /^Conectado\./);
  await c.ctx.unroute("**/api/campanhas/*/eventos**");
  await c.ctx.close();
  contextos.splice(contextos.indexOf(c), 1);
});

test("aparelho novo pela rede entra só assistindo; na máquina da taverna o primeiro personagem segue ativo", { skip: pular, timeout: PRAZO }, async () => {
  const rede = await novoContexto("C", BASE_REDE);
  await rede.page.goto(`${rede.base}/mesa/${ID}`, { waitUntil: "domcontentloaded" });
  const eC = await esperar(rede.page, (e) => e.conexao === "ok" && e.chips.length === 2, 20_000);
  log("[C] rede, sem identidade:", { ativo: eC.ativo, soAssistindo: eC.soAssistindo, placeholder: eC.placeholder, rolar: eC.rolar });
  await capturar(rede, "01-espectador-rede");
  assert.equal(eC.ativo, null, "pela rede ninguém deveria estar ativo sem reivindicar");
  assert.equal(eC.soAssistindo, true, "o convite 'só assistindo · escolher personagem' deveria aparecer");
  assert.match(eC.placeholder ?? "", /Fale com o mestre fora do jogo/);
  assert.equal(eC.rolar, 0);
  // o link para escolher personagem leva à porta da mesa
  const href = await rede.page.locator("[data-so-assistindo] a").getAttribute("href");
  assert.equal(href, `/mesa/${ID}/entrar`);

  const local = await novoContexto("L", BASE);
  await local.page.goto(`${local.base}/mesa/${ID}`, { waitUntil: "domcontentloaded" });
  const eL = await esperar(local.page, (e) => e.conexao === "ok" && e.chips.length === 2, 20_000);
  log("[L] máquina da taverna, sem identidade:", { ativo: eL.ativo, soAssistindo: eL.soAssistindo });
  await capturar(local, "02-local-sem-identidade");
  assert.match(eL.ativo ?? "", new RegExp(`^${aurora.ficha.nome}`), "na máquina da taverna o primeiro personagem continua ativo");
  assert.equal(eL.soAssistindo, false);
  await local.ctx.close();
  contextos.splice(contextos.indexOf(local), 1);
  rede.espectador = true;
});

let A;
let B;
let C;

test("modo rodada: a vez não passa para o personagem que está no celular do amigo", { skip: pular, timeout: PRAZO }, async () => {
  C = contextos.find((c) => c.espectador);
  A = await novoContexto("A", BASE, { apelido: "Paulo", pid: aurora.id });
  B = await novoContexto("B", BASE_REDE, { apelido: "Amigo", pid: caio.id });
  await B.ctx.addInitScript(ESPIAO_EVENTSOURCE);
  await A.page.goto(`${A.base}/mesa/${ID}`, { waitUntil: "domcontentloaded" });
  await B.page.goto(`${B.base}/mesa/${ID}`, { waitUntil: "domcontentloaded" });
  const eA0 = await esperar(A.page, (e) => e.conexao === "ok" && /3 na mesa/.test(e.presenca ?? ""), 20_000);
  const eB0 = await esperar(B.page, (e) => e.conexao === "ok", 20_000);
  log("[A]", eA0.presenca, "| ativo:", eA0.ativo, "| chips:", JSON.stringify(eA0.chips));
  log("[B]", eB0.presenca, "| ativo:", eB0.ativo);
  assert.match(eA0.ativo ?? "", new RegExp(`^${aurora.ficha.nome}`));
  assert.match(eB0.ativo ?? "", new RegExp(`^${caio.ficha.nome}`));
  // em A, o chip de Caio mostra que ele está em uso no aparelho de Amigo
  const chipCaio = eA0.chips.find((c) => c.title.startsWith(caio.ficha.nome));
  assert.ok(chipCaio?.emUso, `o chip de ${caio.ficha.nome} deveria estar marcado como em uso: ${JSON.stringify(eA0.chips)}`);
  assert.match(chipCaio.title, /em uso no aparelho de Amigo/);
  await capturar(A, "03-chips-em-uso-A");

  // abertura pelo mestre falso (se a mesa ainda está vazia); numa campanha já usada, termina o que ficou da última rodada
  const comecar = A.page.getByRole("button", { name: "Começar a aventura" });
  if (await comecar.count()) {
    await comecar.click();
    await esperar(A.page, (e) => e.ocupado, 30_000);
    await esperar(A.page, (e) => !e.ocupado && e.tamanho > 800, 120_000, 500);
    log("[A] abertura narrada");
  } else {
    await arrumarMesa(A, B);
    log("[A] mesa arrumada para a rodada");
  }

  // A age como Aurora: a vez NÃO pode cair em Caio (que está no celular de Amigo)
  await agir(A.page, "Observo o salão com calma, procurando quem me olha de volta");
  const eA1 = await esperar(A.page, (e) => e.status.some((s) => /Esperando/.test(s)) || e.status.some((s) => /Vez de/.test(s)), 15_000);
  const aviso = eA1.status.find((s) => /Esperando|Vez de/.test(s));
  log("[A] aviso depois de agir:", aviso, "| ativo:", eA1.ativo);
  await capturar(A, "04-passe-de-vez-A");
  assert.match(aviso, new RegExp(`^Esperando ${caio.ficha.nome}, que está no celular de Amigo\\.`));
  assert.match(eA1.ativo ?? "", new RegExp(`^${aurora.ficha.nome}`), "o personagem ativo em A não deveria ter mudado para Caio");
  assert.equal(eA1.campo, "", "a ação enviada deveria ter limpado o campo");
});

test("teste pedido pelo mestre: o espectador não rola; depois do dado aparece 'O mestre lê o resultado…'", { skip: pular, timeout: PRAZO }, async () => {
  // B fecha a rodada como Caio: o mestre falso narra e pede um teste
  await agir(B.page, "Pago uma bebida para o taverneiro e puxo conversa");
  await esperar(A.page, (e) => e.ocupado, 30_000);
  const eA = await esperar(A.page, (e) => !e.ocupado && e.rolar > 0, 120_000, 500);
  const eB = await ver(B.page);
  const eC = await ver(C.page);
  log("[A] rolar:", eA.rolar, "| [B] rolar:", eB.rolar, "| [C espectador] rolar:", eC.rolar);
  await capturar(C, "05-pedido-teste-espectador-C");
  assert.equal(eC.rolar, 0, "quem só assiste pela rede não pode rolar o dado de ninguém");
  assert.ok(eA.rolar > 0, "a máquina da taverna rola por qualquer personagem");

  // A rola (e aceita, se o Vampiro oferecer a rerrolagem). O cartão pode estar numa página do leitor fora da vista: clique pelo DOM.
  await A.page.$eval("button[data-rolar]", (b) => b.click());
  const fim = Date.now() + 15_000;
  while (Date.now() < fim) {
    const e = await ver(A.page);
    if (e.aceitar > 0) {
      await A.page.$eval("button[data-aceitar]", (b) => b.click());
      break;
    }
    if (e.lendo || e.ocupado) break;
    await dormir(300);
  }
  // modo rodada: o resultado fica na fila (invisível) até Caio agir → o palco diz que o mestre lê o resultado
  const lendoA = await esperar(A.page, (e) => e.lendo || e.ocupado, 30_000);
  log("[A] depois do dado: lendo =", lendoA.lendo, "| ocupado =", lendoA.ocupado);
  await capturar(A, "06-le-o-resultado-A");
  if (!lendoA.ocupado) {
    assert.equal(lendoA.lendo, true);
    const lendoB = await esperar(B.page, (e) => e.lendo || e.ocupado, 15_000);
    assert.ok(lendoB.lendo || lendoB.ocupado);
    // Caio age e o mestre narra o resultado
    await agir(B.page, "Levanto a caneca e brindo ao taverneiro");
    await esperar(A.page, (e) => e.ocupado, 30_000);
  }
  await esperar(A.page, (e) => !e.ocupado && !e.lendo, 120_000, 500);
  log("[A] rodada do teste narrada");
});

test("queda de conexão: texto fica no campo, faixa aparece, botões travam e tudo volta ao reconectar", { skip: pular, timeout: PRAZO }, async () => {
  await esperar(B.page, (e) => !e.ocupado && e.conexao === "ok", 60_000);
  // sem rede: os pedidos novos falham; o fluxo de eventos já aberto o Chromium deixa vivo, então o teste o derruba como um
  // socket que morreu (servidor desligado)
  await B.ctx.setOffline(true);
  await B.page.evaluate(() => window.__derrubarFluxo());
  // antes dos 3 s: o envio falha na hora, com aviso, e o texto continua no campo
  await agir(B.page, "Tento abrir a porta dos fundos sem fazer barulho");
  const eB1 = await esperar(B.page, (e) => e.alertas.some((a) => /Sem sinal da taverna/.test(a)) || e.semSinal, 8_000);
  log("[B] offline, logo depois de enviar: campo =", JSON.stringify(eB1.campo), "| alertas =", JSON.stringify(eB1.alertas), "| semSinal =", eB1.semSinal);
  assert.equal(eB1.campo, "Tento abrir a porta dos fundos sem fazer barulho", "o texto não pode sumir do campo");
  assert.ok(eB1.alertas.some((a) => /Sem sinal da taverna/.test(a)) || eB1.semSinal, "a mesa tem que avisar que a ação não saiu");
  // depois de 3 s caído: faixa no palco, botão de agir travado, presença em 'Reconectando…'
  const eB2 = await esperar(B.page, (e) => e.semSinal, 12_000);
  log("[B] caído há mais de 3 s: faixa =", eB2.semSinal, "| Agir desabilitado =", eB2.agirDesabilitado, "| presença =", eB2.presenca, "| conexão =", eB2.conexao);
  await capturar(B, "07-sem-sinal-B");
  assert.equal(eB2.conexao, "caiu");
  assert.match(eB2.presenca ?? "", /^Reconectando…/);
  assert.equal(eB2.agirDesabilitado, true, "o botão Agir deveria estar desabilitado sem sinal");
  assert.equal(eB2.campo, "Tento abrir a porta dos fundos sem fazer barulho");
  // volta a rede: o vigia das batidas (SEM_BATIDA_MS = 45 s) reabre o fluxo, a faixa some sozinha e o botão destrava (o texto continua lá)
  await B.ctx.setOffline(false);
  const eB3 = await esperar(B.page, (e) => !e.semSinal && e.conexao === "ok", 70_000);
  log("[B] reconectou:", eB3.presenca, "| faixa =", eB3.semSinal, "| Agir desabilitado =", eB3.agirDesabilitado, "| campo =", JSON.stringify(eB3.campo));
  await capturar(B, "08-reconectou-B");
  assert.match(eB3.presenca ?? "", /^Conectado\./);
  assert.equal(eB3.agirDesabilitado, false);
  assert.equal(eB3.campo, "Tento abrir a porta dos fundos sem fazer barulho");
  // nenhum erro de página (o "Failed to fetch" solto era o sintoma antigo)
  const soltos = B.erros.filter((e) => /Failed to fetch|Unhandled/.test(e));
  assert.deepEqual(soltos, [], `erros soltos em B: ${soltos.join(" | ")}`);
});
