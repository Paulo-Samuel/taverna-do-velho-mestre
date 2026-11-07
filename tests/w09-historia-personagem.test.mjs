// W09: mais um herói numa mesa do modo história. Cria uma campanha "(auditoria)" pela criação do modo história, adiciona um
// segundo personagem por /mesa/[id]/personagens/novo (quatro passos, "Sentar à mesa"), confere que ele senta, que o chat
// ganha "X se junta ao grupo" e que o rascunho da mesa não vaza para /nova. No fim apaga a campanha pelos ajustes.
//
// Roda contra um servidor de desenvolvimento com o mestre FALSO (TAVERNA_PROVEDOR=falso):
//   node --test tests/w09-historia-personagem.test.mjs
// Variáveis: W09_BASE (padrão http://localhost:3302), W09_PLAYWRIGHT (pasta do pacote playwright), W09_CAPTURAS (pasta das
// capturas; sem ela, não captura), W09_OLHAR (id de uma mesa do modo história que já existe, só para abrir a página de novo
// personagem e olhar; padrão 32).
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";

const require = createRequire(import.meta.url);
const BASE = process.env.W09_BASE ?? "http://localhost:3302";
const CAPTURAS = process.env.W09_CAPTURAS ?? null;
const OLHAR = Number(process.env.W09_OLHAR ?? 32);
const NOME_CAMPANHA = "Mesa W09 (auditoria)";
const PRAZO = 240_000;

const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let chromium = null;
try {
  ({ chromium } = require(process.env.W09_PLAYWRIGHT ?? "C:/Users/paulo/projetos/cloneprojetosOS/gradus-cordis/node_modules/playwright"));
} catch {
  // sem Playwright: os testes são pulados
}

async function servidorNoAr() {
  // o servidor de desenvolvimento compila sob demanda: a primeira resposta pode demorar, então duas tentativas largas
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const r = await fetch(`${BASE}/api/rede`, { signal: AbortSignal.timeout(20_000) });
      if (r.ok && r.headers.get("x-taverna") === "1") return true;
    } catch {
      // tenta de novo
    }
  }
  return false;
}

/** Lê o estado da mesa pelo fluxo de eventos (primeiro bloco) e fecha. */
async function estadoDaMesa(id) {
  const ac = new AbortController();
  const r = await fetch(`${BASE}/api/campanhas/${id}/eventos?cliente=teste-w09-leitor`, { signal: ac.signal });
  const leitor = r.body.getReader();
  const dec = new TextDecoder();
  let texto = "";
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    texto += dec.decode(value, { stream: true });
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

const pular = !chromium || !(await servidorNoAr());
if (pular) console.log(`# pulando: ${!chromium ? "sem Playwright" : `servidor ${BASE} fora do ar`}`);

let browser;
let ctx;
let page;
let campanhaId = null;
const erros = [];

async function capturar(nome) {
  if (!CAPTURAS || !page) return;
  await page.screenshot({ path: `${CAPTURAS}/${nome}.png`, fullPage: true });
}

/** Os passos da criação do modo história visíveis na barra de cima. */
const passos = (p) => p.locator('nav[aria-label="Passos da criação"] li').count();

/** Nome, sexo, origem, rosto e ofício: os três passos que toda criação do modo história exige. */
async function preencherHeroi(p, { nome, sexo }) {
  await p.getByLabel("Nome do personagem").fill(nome);
  await p.getByRole("button", { name: "Continuar →" }).click();
  await p.getByRole("button", { name: sexo, exact: true }).click();
  // origem: o primeiro botão marcável que não é um dos sexos
  const origem = p.locator("form button[aria-pressed]").filter({ hasNotText: /^(Homem|Mulher|Outro)$/ }).first();
  await origem.click();
  await p.locator('button[aria-label="Escolher este rosto"]').first().click();
  await p.getByRole("button", { name: "Continuar →" }).click();
  await p.locator("form button[aria-pressed]").first().click(); // ofício
  await p.getByRole("button", { name: "Continuar →" }).click();
}

before(
  async () => {
    if (pular) return;
    if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
    browser = await chromium.launch({ headless: true });
    ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-BR" });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("taverna:apelido", "Auditor");
      } catch {}
    });
    page = await ctx.newPage();
    page.on("pageerror", (e) => erros.push(`PAGEERROR ${e.message.slice(0, 300)}`));
    page.on("console", (m) => m.type() === "error" && erros.push(`CONSOLE ${m.text().slice(0, 300)}`));
  },
  { timeout: PRAZO },
);

after(
  async () => {
    if (pular) return;
    try {
      if (campanhaId) await apagarCampanha();
    } finally {
      await browser?.close();
    }
  },
  { timeout: PRAZO },
);

/** Apaga a campanha de teste pelos ajustes (como a pessoa faria); se não der, direto no banco, só se o nome for o do teste. */
async function apagarCampanha() {
  log(`apagando a campanha ${campanhaId}`);
  try {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/mesa/${campanhaId}/ajustes`, { waitUntil: "networkidle" });
    await p.getByRole("button", { name: "Excluir campanha" }).click();
    // o formulário de ajustes também tem um campo "Nome da campanha": o da confirmação é o name="confirmacao"
    await p.locator('input[name="confirmacao"]').fill(NOME_CAMPANHA);
    await p.getByRole("button", { name: "Apagar para sempre" }).click();
    await p.waitForURL((u) => u.pathname === "/", { timeout: 30_000 });
    await p.close();
  } catch (e) {
    log("exclusão pela interface falhou, tentando pelo banco:", e.message);
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(new URL("../data/taverna.db", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
    db.exec("PRAGMA foreign_keys = ON");
    db.prepare("DELETE FROM campanhas WHERE id = ? AND nome = ?").run(campanhaId, NOME_CAMPANHA);
    db.close();
  }
  const r = await fetch(`${BASE}/mesa/${campanhaId}`, { redirect: "manual" });
  assert.equal(r.status, 404, `a campanha ${campanhaId} ainda responde ${r.status}`);
  log("campanha apagada");
}

test(
  "a página de novo personagem de uma mesa do modo história abre a criação do modo história (só olhar)",
  { skip: pular, timeout: PRAZO },
  async () => {
    const r = await fetch(`${BASE}/mesa/${OLHAR}`, { redirect: "manual" });
    if (r.status !== 200) {
      log(`mesa ${OLHAR} indisponível (${r.status}); a conferência vale pela campanha de teste`);
      return;
    }
    await page.goto(`${BASE}/mesa/${OLHAR}/personagens/novo`, { waitUntil: "networkidle" });
    const corpo = await page.locator("body").innerText();
    assert.ok(!/Passo 1 de 0/.test(corpo), "ainda mostra 'Passo 1 de 0'");
    // pode estar na oferta de continuar um rascunho (não há, o contexto é novo) ou direto no primeiro passo
    assert.ok(corpo.includes("Mais uma cadeira na mesa"), "sem o cabeçalho da mesa");
    assert.ok(corpo.includes("Como você se chama?"), "não abriu no primeiro passo do modo história");
    assert.equal(await passos(page), 4, "a criação de personagem precisa ter quatro passos (sem o Começo)");
    await capturar("01-novo-personagem-mesa-existente");
  },
);

test("cria uma campanha '(auditoria)' no modo história", { skip: pular, timeout: PRAZO }, async () => {
  await page.goto(`${BASE}/nova`, { waitUntil: "networkidle" });
  assert.equal(await passos(page), 5, "a campanha nova tem cinco passos");
  await preencherHeroi(page, { nome: "Brenna", sexo: "Mulher" });
  await page.getByRole("button", { name: "Continuar →" }).click(); // passado → começo
  await page.getByLabel("Nome da campanha").fill(NOME_CAMPANHA);
  await capturar("02-nova-campanha-passo-5");
  await page.getByRole("button", { name: "Começar a aventura" }).click();
  await page.waitForURL(/\/mesa\/\d+/, { timeout: 60_000 });
  campanhaId = Number(new URL(page.url()).pathname.match(/\/mesa\/(\d+)/)[1]);
  log(`campanha de teste criada: ${campanhaId}`);
  const estado = await estadoDaMesa(campanhaId);
  assert.equal(estado.campanha.nome, NOME_CAMPANHA);
  assert.equal(estado.campanha.sistema, "historia");
  assert.deepEqual(
    estado.personagens.map((p) => p.ficha.nome),
    ["Brenna"],
  );
  // o rascunho da campanha nova saiu do armazenamento no envio
  assert.equal(await page.evaluate(() => localStorage.getItem("taverna:rascunho-historia")), null);
});

test("o mestre falso abre a história (para a mesa já ter mensagens)", { skip: pular, timeout: PRAZO }, async () => {
  assert.ok(campanhaId, "sem campanha de teste");
  const inicio = Date.now();
  let estado = await estadoDaMesa(campanhaId);
  while (!estado.mensagens.length && Date.now() - inicio < 120_000) {
    await dormir(2000);
    estado = await estadoDaMesa(campanhaId);
  }
  assert.ok(estado.mensagens.length > 0, "o mestre falso não narrou a abertura em 2 minutos");
  await capturar("03-mesa-aberta");
});

test("adiciona o segundo personagem: quatro passos, rascunho da mesa separado, 'Sentar à mesa'", { skip: pular, timeout: PRAZO }, async () => {
  assert.ok(campanhaId, "sem campanha de teste");
  await page.goto(`${BASE}/mesa/${campanhaId}/personagens/novo`, { waitUntil: "networkidle" });
  const corpo = await page.locator("body").innerText();
  assert.ok(!/Passo 1 de 0/.test(corpo));
  assert.ok(corpo.includes("Já sentados: Brenna"), "não lista quem já está sentado");
  assert.equal(await passos(page), 4);
  await capturar("04-segundo-personagem-passo-1");

  await preencherHeroi(page, { nome: "Caio", sexo: "Homem" });
  // no passo do passado (o último deste modo) o botão é "Sentar à mesa", não "Começar a aventura"
  await page.getByRole("button", { name: "Sentar à mesa" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Começar a aventura" }).count(), 0);
  assert.equal(await page.getByLabel("Nome da campanha").count(), 0, "o passo da campanha não pode aparecer");
  await capturar("05-segundo-personagem-sentar");

  // o rascunho está na chave da mesa, e a chave da campanha nova continua vazia
  const chaves = await page.evaluate((id) => ({ mesa: localStorage.getItem(`taverna:rascunho-historia:mesa-${id}`), nova: localStorage.getItem("taverna:rascunho-historia") }), campanhaId);
  assert.ok(chaves.mesa && JSON.parse(chaves.mesa).nome === "Caio", "o rascunho da mesa não foi gravado na chave da mesa");
  assert.equal(chaves.nova, null, "o rascunho da mesa vazou para a chave da campanha nova");

  // /nova (campanha nova) não pode oferecer "continuar" o Caio
  const outra = await ctx.newPage();
  await outra.goto(`${BASE}/nova`, { waitUntil: "networkidle" });
  const textoNova = await outra.locator("body").innerText();
  assert.ok(!textoNova.includes("De volta, é?"), "/nova ofereceu continuar o rascunho da mesa");
  assert.ok(!textoNova.includes("Caio"), "/nova mostrou o herói da mesa");
  assert.ok(textoNova.includes("Como você se chama?"));
  await outra.close();

  await page.getByRole("button", { name: "Sentar à mesa" }).click();
  await page.waitForURL((u) => u.pathname === `/mesa/${campanhaId}`, { timeout: 60_000 });
  await dormir(1500);
  await capturar("06-mesa-com-dois");

  const estado = await estadoDaMesa(campanhaId);
  assert.deepEqual(
    estado.personagens.map((p) => p.ficha.nome),
    ["Brenna", "Caio"],
  );
  const aviso = estado.mensagens.find((m) => m.tipo === "sistema" && m.texto === "Caio se junta ao grupo");
  assert.ok(aviso, "sem a mensagem de sistema 'Caio se junta ao grupo'");
  assert.equal(aviso.personagemId, estado.personagens[1].id);
  // o rascunho da mesa some depois de sentar
  assert.equal(await page.evaluate((id) => localStorage.getItem(`taverna:rascunho-historia:mesa-${id}`), campanhaId), null);
  assert.equal(await page.evaluate(() => localStorage.getItem("taverna:rascunho-historia")), null);
});

test("sem erros de página no caminho todo", { skip: pular }, () => {
  const graves = erros.filter((e) => e.startsWith("PAGEERROR"));
  if (erros.length) log("avisos do navegador:", erros);
  assert.deepEqual(graves, []);
});
