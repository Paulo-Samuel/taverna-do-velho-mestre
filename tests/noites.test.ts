import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

// W21: fim da noite no servidor. Noites pelo relógio (marcador ou 5 h sem mensagem), Remorso e XP garantidos no Encerrar,
// fechamento e recapitulação gravados no marcador, ajuste manual sem Mancha negativa. O mestre é o de teste (sem IA) e o
// banco abre numa pasta temporária: db.ts resolve `data/` a partir do cwd no momento do import, então o chdir vem antes.

type Db = typeof import("../src/lib/db");
type Constantes = typeof import("../src/lib/constantes");
type Mestre = typeof import("../src/lib/mestre");
type Sistemas = typeof import("../src/lib/sistemas");
type Livro = typeof import("../src/app/mesa/[id]/livro/montar");
type Ajustar = typeof import("../src/app/api/campanhas/[id]/personagens/[pid]/ficha/ajustar");
type Prompt = typeof import("../src/lib/mestre/prompt");

let db: Db;
let k: Constantes;
let mestre: Mestre;
let sistemas: Sistemas;
let livro: Livro;
let ajustar: Ajustar;
let prompt: Prompt;
let pasta: string;
const cwdOriginal = process.cwd();
const provedorOriginal = process.env.TAVERNA_PROVEDOR;

// ajustar.ts confere o acesso da rota (rede/acesso.ts importa "next/headers", que fora do Next precisa da extensão)
register(
  `data:text/javascript,${encodeURIComponent('export async function resolve(s, c, n) { return n(s === "next/headers" ? "next/headers.js" : s, c); }')}`,
);

before(async () => {
  pasta = mkdtempSync(path.join(tmpdir(), "taverna-noites-"));
  process.chdir(pasta);
  process.env.TAVERNA_PROVEDOR = "falso";
  db = await import("../src/lib/db");
  k = await import("../src/lib/constantes");
  mestre = await import("../src/lib/mestre");
  sistemas = await import("../src/lib/sistemas");
  livro = await import("../src/app/mesa/[id]/livro/montar");
  ajustar = await import("../src/app/api/campanhas/[id]/personagens/[pid]/ficha/ajustar");
  prompt = await import("../src/lib/mestre/prompt");
});

after(() => {
  process.chdir(cwdOriginal);
  if (provedorOriginal === undefined) delete process.env.TAVERNA_PROVEDOR;
  else process.env.TAVERNA_PROVEDOR = provedorOriginal;
  try {
    rmSync(pasta, { recursive: true, force: true });
  } catch {
    // o Windows às vezes segura o arquivo do banco por um instante
  }
});

// ---------- ajudantes ----------

const HORA = 60 * 60 * 1000;
/** Data no formato do SQLite (UTC, sem fuso) há `ms` milissegundos. */
const sqliteHa = (ms: number) => new Date(Date.now() - ms).toISOString().replace("T", " ").slice(0, 19);

function vampiro(nome: string, manchas = 0) {
  const f = sistemas.obterSistema("vtm5").criarFicha({ nome, ancestralidade: "gato_beco", classe: "lasombra", antecedente: "neofito", extras: { estilo: "equilibrado", senhor: "desconhecido" } });
  if (f.recursos.mancha) f.recursos.mancha.atual = manchas;
  f.extras.mancha = manchas;
  return f;
}

function mesa(nome: string, manchas = 0) {
  const id = db.criarCampanha({ nome: `(teste) ${nome}`, sistema: "vtm5", cenario: "Brasília", tom: "sombrio", config: { modoJogo: "historia" } });
  const p = db.criarPersonagem(id, vampiro("Otto", manchas));
  return { id, p };
}

/** Muda a data de todas as mensagens a partir de `desdeId` (para simular a noite de ontem). */
function envelhecer(campanhaId: number, desdeId: number, ms: number, ateId = Number.MAX_SAFE_INTEGER) {
  for (const m of db.listarMensagens(campanhaId)) {
    if (m.id < desdeId || m.id > ateId) continue;
    // a mesma conexão que db.ts abriu (fica em globalThis para sobreviver às recargas do modo dev)
    const conexao = (globalThis as unknown as { __tavernaDb: { prepare(sql: string): { run(...a: unknown[]): unknown } } }).__tavernaDb;
    conexao.prepare("UPDATE mensagens SET criada_em = ? WHERE id = ?").run(sqliteHa(ms), m.id);
  }
}

/** Espera o mestre de teste terminar o turno (e o resumo/recapitulação em segundo plano). */
async function esperar(campanhaId: number) {
  for (let i = 0; i < 400; i++) {
    await new Promise((r) => setTimeout(r, 25));
    if (!mestre.mesaOcupada(campanhaId) && !db.listarFila(campanhaId).length) break;
  }
  await new Promise((r) => setTimeout(r, 120));
}

const dadosDe = (m: { dados: unknown }) => (m.dados ?? {}) as Record<string, unknown>;
const marcadores = (id: number) => db.listarMensagens(id).filter((m) => m.tipo === "dado" && dadosDe(m).tipo === "fim_sessao");
const cartoesXp = (id: number) => db.listarMensagens(id).filter((m) => m.tipo === "dado" && dadosDe(m).tipo === "xp");
const manchasDe = (pid: number) => db.obterPersonagem(pid)!.ficha.recursos.mancha?.atual ?? 0;

function noiteJogada(campanhaId: number, jogadas = 3) {
  db.adicionarMensagem(campanhaId, "mestre", "Brasília à noite. O Eixo Monumental brilha vazio. O que você faz?");
  for (let i = 0; i < jogadas; i++) {
    db.adicionarMensagem(campanhaId, "jogador", `Otto anda pela Esplanada (${i + 1}).`, { autor: "Samuel" });
    db.adicionarMensagem(campanhaId, "mestre", `O vento seco responde (${i + 1}).`);
  }
}

// ---------- dividirNoites (puro) ----------

describe("dividirNoites", () => {
  const m = (id: number, horas: number, tipo = "mestre", dadosTipo: string | null = null, retroativo = false) => ({
    id,
    criadaEm: new Date(Date.UTC(2026, 10, 1) + horas * HORA).toISOString(),
    tipo,
    dadosTipo,
    retroativo,
  });

  it("pausa de 1 h fica na mesma noite; 23 h abre outra", () => {
    const mesma = k.dividirNoites([m(1, 0), m(2, 0.5, "jogador"), m(3, 1.5)]);
    assert.equal(mesma.length, 1);
    assert.equal(mesma[0].fechada, false);
    const duas = k.dividirNoites([m(1, 0), m(2, 1, "jogador"), m(3, 24, "jogador"), m(4, 24.1)]);
    assert.equal(duas.length, 2);
    assert.deepEqual([duas[0].fechada, duas[0].fechadaPeloBotao, duas[1].inicioId], [true, false, 3]);
    assert.equal(k.noiteEmAndamento(duas), 2);
  });

  it("o marcador fecha a noite; o que vem depois é a seguinte", () => {
    const n = k.dividirNoites([m(1, 0), m(2, 1, "jogador"), m(3, 2, "dado", "fim_sessao"), m(4, 2.2, "jogador")]);
    assert.equal(n.length, 2);
    assert.equal(n[0].fechadaPeloBotao, true);
    assert.equal(n[0].fimId, 3);
    assert.equal(k.noiteEmAndamento(n), 2);
    assert.equal(k.noiteEmAndamento(k.dividirNoites([m(1, 0), m(2, 1, "dado", "fim_sessao")])), 2);
  });

  it("o fechamento retroativo fica na noite que ele fecha", () => {
    const n = k.dividirNoites([m(1, 0), m(2, 1, "jogador"), m(3, 30), m(4, 30.1, "dado", "xp"), m(5, 30.2, "dado", "fim_sessao", true)]);
    assert.equal(n.length, 1);
    assert.equal(n[0].fechadaPeloBotao, true);
    // sem o retroativo, o fechamento depois do intervalo vira uma noite própria
    assert.equal(k.dividirNoites([m(1, 0), m(2, 1, "jogador"), m(3, 30), m(5, 30.2, "dado", "fim_sessao")]).length, 2);
  });

  it("lê a data do SQLite (UTC sem fuso) e ISO", () => {
    assert.equal(k.msDaData("2026-11-01 03:00:00"), Date.UTC(2026, 10, 1, 3));
    assert.equal(k.msDaData("2026-11-01T03:00:00.000Z"), Date.UTC(2026, 10, 1, 3));
    assert.ok(Number.isNaN(k.msDaData("")));
  });
});

// ---------- noites no banco, no livro e no número da sessão ----------

describe("noites da campanha", () => {
  it("mensagens com 23 h de diferença são 2 noites no livro e a sessão 2 está em andamento", () => {
    const { id } = mesa("noites pelo relógio");
    noiteJogada(id, 2);
    const ontem = db.listarMensagens(id);
    envelhecer(id, ontem[0].id, 23 * HORA + 10 * 60 * 1000);
    db.adicionarMensagem(id, "jogador", "Otto volta ao Conic.", { autor: "Samuel" });
    db.adicionarMensagem(id, "mestre", "As lojas estão fechadas.");
    const noites = db.noitesDaCampanha(id);
    assert.equal(noites.length, 2);
    assert.equal(noites[0].fechada, true);
    assert.equal(noites[0].fechadaPeloBotao, false);
    assert.equal(mestre.sessaoAtual(id), 2);
    const l = livro.montarLivro(id)!;
    const comNoite = l.capitulos.filter((c) => c.noite === 2);
    assert.equal(comNoite.length, 1, "o capítulo da segunda noite abre no intervalo");
    assert.ok(comNoite[0].noiteData, "com a data da noite");
    assert.match(livro.livroEmMarkdown(l), /\*Noite 2 · \d+ de \w+/);
    // recados de sistema (aviso) não abrem noite
    db.adicionarMensagem(id, "sistema", "aviso qualquer", { dados: { tipo: "aviso" } });
    assert.equal(db.noitesDaCampanha(id).length, 2);
  });

  it("pausa de 1 h não abre noite nova", () => {
    const { id } = mesa("pausa curta");
    noiteJogada(id, 2);
    const primeira = db.listarMensagens(id)[0].id;
    envelhecer(id, primeira, HORA, primeira + 2);
    assert.equal(db.noitesDaCampanha(id).length, 1);
    assert.equal(mestre.sessaoAtual(id), 1);
  });
});

// ---------- Encerrar: Remorso, XP, fechamento, recapitulação ----------

describe("encerrar a noite", () => {
  it("com Manchas sem Remorso dá 409 com a lista; a rota do Remorso cria o pedido que o jogador rola", async () => {
    const { id, p } = mesa("remorso", 2);
    noiteJogada(id);
    assert.throws(
      () => mestre.encerrarSessao(id),
      (e: unknown) => e instanceof mestre.ErroDaMesa && e.status === 409 && /Remorso/.test(e.message) && Array.isArray(e.dados.remorso) && (e.dados.remorso as { nome: string }[])[0].nome === "Otto",
    );
    const { mensagemId } = mestre.pedirRemorso(id, p.id);
    const pedido = db.obterMensagem(mensagemId)!;
    assert.equal(dadosDe(pedido).tipo, "pedido_teste");
    assert.equal(dadosDe(pedido).status, "pendente");
    assert.equal(dadosDe(pedido).testePedido, "Remorso");
    // pedir de novo devolve o mesmo cartão
    assert.equal(mestre.pedirRemorso(id, p.id).mensagemId, mensagemId);
    mestre.rolarTestePendente(id, mensagemId, "Samuel");
    if (dadosDe(db.obterMensagem(mensagemId)!).status === "decidir") mestre.decidirTeste(id, mensagemId, { rerrolar: false });
    await esperar(id);
    assert.equal(manchasDe(p.id), 0, "o Remorso rolado zera as Manchas");
    assert.throws(() => mestre.pedirRemorso(id, p.id), /não tem Manchas/);
  });

  it("fecha a noite: fechamento e recapitulação no marcador, XP uma vez, música calma, sem sugestões; a volta abre a Noite 2", async () => {
    const { id } = mesa("encerrar", 0);
    noiteJogada(id);
    const r = mestre.encerrarSessao(id);
    assert.deepEqual(r, { sessao: 1, retroativa: false });
    await esperar(id);
    const [marcador] = marcadores(id);
    assert.ok(marcador, "gravou o marcador");
    const d = dadosDe(marcador);
    assert.equal(d.sessao, 1);
    assert.match(String(d.fechamento), /refúgio/);
    assert.match(String(d.recapitulacao), /^Anteriormente/);
    assert.equal(cartoesXp(id).length, 1);
    const c = db.obterCampanha(id)!;
    assert.equal(c.config.fimPendente, undefined);
    assert.deepEqual(c.config.recapPendente, { sessao: 2, motivo: "marcador" });
    assert.equal(c.config.sessao, 2);
    assert.equal(c.cena?.musica?.humor, "calmo");
    assert.equal(c.cena?.sugestoes?.length ?? 0, 0);
    assert.ok(c.resumoAte < marcador.id && c.resumoAte > 0, "o resumo fecha a noite sem passar do marcador");
    // de novo sem jogar: recusa
    assert.throws(() => mestre.encerrarSessao(id), /já foi encerrada/);
    // um aparte não abre a noite nem gasta a recapitulação
    mestre.enviarAcao(id, { personagemId: null, autor: "Samuel", acao: "((quanto de Fome eu tenho?))" });
    await esperar(id);
    assert.ok(db.obterCampanha(id)!.config.recapPendente);
    assert.ok(!db.listarMensagens(id).some((m) => dadosDe(m).tipo === "cena_titulo" && dadosDe(m).sessao === 2), "o aparte não grava o cartão");
    // o mestre de teste às vezes pede um teste no aparte: rolar antes (senão a jogada espera o dado)
    for (const t of db.testesPendentes(id)) {
      mestre.rolarTestePendente(id, t.id, "Samuel");
      if (dadosDe(db.obterMensagem(t.id)!).status === "decidir") mestre.decidirTeste(id, t.id, { rerrolar: false });
      await esperar(id);
    }
    // a primeira jogada: cartão "Noite 2", o "Anteriormente…" pronto do marcador, e a recapitulação some
    mestre.enviarAcao(id, { personagemId: null, autor: "Samuel", acao: "Otto sai do refúgio." });
    await esperar(id);
    const depois = db.listarMensagens(id).filter((m) => m.id > marcador.id);
    const cartao = depois.find((m) => dadosDe(m).tipo === "cena_titulo" && dadosDe(m).sessao === 2);
    assert.ok(cartao, "cartão Noite 2");
    const recap = depois.find((m) => m.tipo === "mestre" && /^Anteriormente/.test(m.texto));
    assert.ok(recap && recap.id > cartao!.id, "o Anteriormente pronto entra depois do cartão");
    assert.equal(db.obterCampanha(id)!.config.recapPendente, undefined);
    assert.equal(mestre.sessaoAtual(id), 2);
    const l = livro.montarLivro(id)!;
    assert.ok(l.capitulos.some((x) => x.noite === 2));
  });

  it("encerrar de novo depois de interromper (XP já dado) não concede XP outra vez", async () => {
    const { id } = mesa("xp dobrado", 0);
    noiteJogada(id);
    const ultima = db.listarMensagens(id).at(-1)!;
    // como fica a config depois de um Encerrar que concedeu o XP e foi cancelado antes do marcador
    db.atualizarCampanha(id, { config: { ...db.obterCampanha(id)!.config, fimPendente: { sessao: 1, xpConcedido: true, desde: ultima.id } } });
    mestre.encerrarSessao(id);
    await esperar(id);
    assert.equal(marcadores(id).length, 1);
    assert.equal(cartoesXp(id).length, 0, "nem o mestre nem a rede de segurança dão XP de novo");
  });

  it("várias chamadas de conceder_xp no mesmo fechamento valem (uma por motivo)", async () => {
    const { id, p } = mesa("(xp por motivo)", 0);
    noiteJogada(id);
    const xpAntes = db.obterPersonagem(p.id)!.ficha.xp;
    mestre.encerrarSessao(id);
    await esperar(id);
    assert.equal(marcadores(id).length, 1);
    assert.equal(cartoesXp(id).length, 2, "as duas chamadas do mesmo turno passam");
    assert.equal(db.obterPersonagem(p.id)!.ficha.xp, xpAntes + 2);
  });

  it("encerrar de novo depois de XP só para parte da mesa: concede só a quem falta", async () => {
    const { id, p } = mesa("xp parcial", 0);
    const p2 = db.criarPersonagem(id, vampiro("Lia"));
    noiteJogada(id);
    const ultima = db.listarMensagens(id).at(-1)!;
    // o Encerrar anterior deu XP a Otto e foi cancelado antes de Lia
    db.atualizarCampanha(id, { config: { ...db.obterCampanha(id)!.config, fimPendente: { sessao: 1, xpConcedido: true, xpPara: [p.id], desde: ultima.id } } });
    const xpOtto = db.obterPersonagem(p.id)!.ficha.xp;
    const xpLia = db.obterPersonagem(p2.id)!.ficha.xp;
    mestre.encerrarSessao(id);
    await esperar(id);
    assert.equal(marcadores(id).length, 1);
    assert.equal(db.obterPersonagem(p.id)!.ficha.xp, xpOtto, "Otto não recebe de novo");
    assert.equal(db.obterPersonagem(p2.id)!.ficha.xp, xpLia + 1, "Lia recebe o que faltava");
    assert.deepEqual(cartoesXp(id).map((m) => dadosDe(m).personagem), ["Lia"]);
  });

  it("o pedido do fim com XP parcial diz quem já recebeu e pede só o resto", () => {
    const vtm5 = sistemas.obterSistema("vtm5");
    const f = prompt.fimDeSessao(vtm5, 2, [vampiro("Otto"), vampiro("Lia")], { xpJaConcedido: ["Otto"] });
    const texto = prompt.promptDoTurno([], [], f);
    assert.doesNotMatch(texto, /NÃO chame conceder_xp/);
    assert.match(texto, /Otto JÁ recebeu o XP desta noite; conceda só a quem falta/);
  });

  it("mestre que ignora o roteiro: o servidor rola o Remorso, dá o XP mínimo e não abre luta nem cena nova", async () => {
    const { id, p } = mesa("(rebelde)", 2);
    noiteJogada(id, 4);
    const tituloAntes = db.obterCampanha(id)!.cena?.titulo ?? "";
    mestre.encerrarSessao(id, { semRemorso: true });
    await esperar(id);
    assert.equal(marcadores(id).length, 1);
    assert.equal(manchasDe(p.id), 0, "Remorso rolado pelo servidor");
    assert.ok(db.listarMensagens(id).some((m) => m.tipo === "dado" && /Remorso/.test(m.texto) && dadosDe(m).tipo !== "pedido_teste"));
    assert.equal(cartoesXp(id).length, 1, "XP mínimo");
    const cena = db.obterCampanha(id)!.cena;
    assert.ok(!cena?.combate?.ativo, "nenhuma luta aberta");
    assert.equal(cena?.titulo ?? "", tituloAntes, "nenhuma cena nova");
  });

  it("depois de 5 h sem ninguém, o Encerrar fecha em retrospectiva a noite que passou", async () => {
    const { id } = mesa("retroativo", 0);
    noiteJogada(id);
    envelhecer(id, db.listarMensagens(id)[0].id, 30 * HORA);
    const r = mestre.encerrarSessao(id);
    assert.equal(r.retroativa, true);
    assert.equal(r.sessao, 1);
    await esperar(id);
    const [marcador] = marcadores(id);
    assert.equal(dadosDe(marcador).retroativo, true);
    assert.ok(Date.parse(String(dadosDe(marcador).data)) < Date.now() - 20 * HORA, "a data é a da noite, não a de hoje");
    assert.equal(db.noitesDaCampanha(id).length, 1, "o fechamento fica na noite que ele fecha");
    assert.equal(mestre.sessaoAtual(id), 2);
  });

  it("intervalo sem marcador: a primeira jogada abre a Noite 2 e o mestre recapitula", async () => {
    const { id } = mesa("intervalo", 0);
    noiteJogada(id);
    envelhecer(id, db.listarMensagens(id)[0].id, 23 * HORA);
    mestre.enviarAcao(id, { personagemId: null, autor: "Samuel", acao: "Otto acorda com fome." });
    await esperar(id);
    const cartao = db.listarMensagens(id).find((m) => dadosDe(m).tipo === "cena_titulo" && dadosDe(m).sessao === 2);
    assert.ok(cartao);
    assert.equal(db.obterCampanha(id)!.config.recapPendente, undefined);
    assert.equal(mestre.sessaoAtual(id), 2);
  });
});

// ---------- ajuste manual ----------

describe("ajuste manual da ficha (Vampiro)", () => {
  const rotulos = () => sistemas.obterSistema("vtm5").rotulos;
  it("recusa tirar Mancha à mão", () => {
    const f = vampiro("Otto", 2);
    assert.throws(() => ajustar.aplicarAjuste(f, { recursos: { mancha: -1 } }, rotulos()), ajustar.AjusteRecusado);
    assert.equal(f.recursos.mancha.atual, 2);
  });
  it("Humanidade à mão só com confirmado", () => {
    const f = vampiro("Otto");
    const antes = f.recursos.humanidade.atual;
    assert.throws(() => ajustar.aplicarAjuste(f, { recursos: { humanidade: -1 } }, rotulos()), /confirme/);
    assert.equal(f.recursos.humanidade.atual, antes);
    const r = ajustar.aplicarAjuste(f, { recursos: { humanidade: -1 }, confirmado: true }, rotulos());
    assert.ok(r.mudancas.length);
  });
});

// ---------- textos do fim ----------

describe("textos do fim", () => {
  it("a recapitulação sai sem markdown e no teto de palavras", () => {
    const longo = `**Anteriormente…** ${"palavra ".repeat(300)}`;
    const t = prompt.limparRecapitulacao(longo);
    assert.ok(!t.includes("*"));
    assert.ok(t.split(/\s+/).length <= prompt.MAX_PALAVRAS_RECAPITULACAO + 1);
  });
  it("o pedido do fim leva a noite inteira e não pede XP já concedido", () => {
    const vtm5 = sistemas.obterSistema("vtm5");
    const f = prompt.fimDeSessao(vtm5, 3, [vampiro("Otto")], { nestaSessao: ["- Otto: entra no Conic"], xpJaConcedido: true, combateAtivo: true });
    const texto = prompt.promptDoTurno([], [], f);
    assert.match(texto, /Nesta sessão/);
    assert.match(texto, /NÃO chame conceder_xp/);
    assert.match(texto, /NÃO abra combate/);
  });
});
