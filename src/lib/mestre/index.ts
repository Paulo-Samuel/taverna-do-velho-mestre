import "server-only";
import {
  abrirInstantaneo,
  adicionarMensagem,
  atualizarMensagem,
  capturarEstado,
  contarInstantaneos,
  descartarInstantaneoAberto,
  enfileirarAcao,
  registrarInstantaneo,
  removerInstantaneo,
  restaurarEstado,
  ultimoInstantaneo,
  lerAjuste,
  listarFila,
  listarPersonagens,
  mensagensDepois,
  obterCampanha,
  obterMensagem,
  obterPersonagem,
  retirarFila,
  salvarCena,
  salvarFicha,
  salvarResumo,
  testesPendentes,
  type AcaoPendente,
} from "../db";
import { INICIO, RESULTADO_TESTE } from "../constantes";
import { obterSistema } from "../sistemas";
import type { ResultadoTeste } from "../sistemas/tipos";
import { publicar } from "../tempo-real";
import { visivel } from "../visivel";
import { definirFerramentas, executarFerramenta, type ContextoFerramentas } from "./ferramentas";
import { encerrarTurno, enderecoInterno, registrarTurno } from "./ponte";
import { nomeDoPersonagem, promptDoResumo, promptDoSistema, promptDoTurno, SISTEMA_RESUMO, type AcaoDoTurno } from "./prompt";
import { criarProvedorApi } from "./provedor-api";
import { criarProvedorCli } from "./provedor-cli";
import { provedorFalso } from "./provedor-falso";
import type { Provedor } from "./tipos";

export { INICIO };

/** Acima disto, as mensagens mais antigas saem da transcrição e vão para o resumo. */
const LIMITE_SEM_RESUMO = 50;
const MANTER_LITERAIS = 30;

// ---------- provedor ----------

export type IdProvedor = "cli" | "api" | "falso";

/** Ajustes do mestre, editáveis na página de configurações (gravados na tabela `ajustes`). Vazio = usa o .env. */
export type AjustesMestre = {
  provedor?: IdProvedor;
  /** apelido ou nome completo do modelo no Claude Code ("sonnet", "opus"...) */
  modeloCli?: string;
  /** caminho do executável do Claude Code */
  binCli?: string;
  /** modelo da API ("claude-sonnet-5-5"...) */
  modeloApi?: string;
};

export function lerAjustesMestre(): AjustesMestre {
  return lerAjuste<AjustesMestre>("mestre", {});
}

export function provedorAtual(): Provedor {
  return criarProvedor(lerAjustesMestre());
}

/** Monta o provedor a partir de ajustes quaisquer (a página de configurações testa antes de salvar). */
export function criarProvedor(a: AjustesMestre): Provedor {
  const id = a.provedor ?? (process.env.TAVERNA_PROVEDOR as IdProvedor | undefined) ?? "cli";
  if (id === "api") return criarProvedorApi({ modelo: a.modeloApi });
  if (id === "falso") return provedorFalso;
  return criarProvedorCli({ modelo: a.modeloCli || undefined, bin: a.binCli || undefined });
}

// ---------- estado de execução por mesa ----------

type Execucao = { ocupado: boolean; controlador: AbortController | null; resumo: Promise<unknown> | null };
const g = globalThis as unknown as { __tavernaExec?: Map<number, Execucao> };
const execucoes = (g.__tavernaExec ??= new Map());

function execucao(id: number): Execucao {
  let e = execucoes.get(id);
  if (!e) execucoes.set(id, (e = { ocupado: false, controlador: null, resumo: null }));
  return e;
}

export function mesaOcupada(id: number) {
  return execucao(id).ocupado;
}

function publicarEstado(id: number) {
  publicar(id, { e: "estado", ocupado: execucao(id).ocupado, fila: listarFila(id) });
}

/**
 * Coloca uma ação na fila da mesa. No modo "livre" o mestre responde assim que estiver livre
 * (juntando as ações que chegaram enquanto ele falava); no modo "rodada" espera todos os personagens agirem.
 */
export function enviarAcao(campanhaId: number, acao: { personagemId: number | null; autor: string; acao: string }): AcaoPendente {
  const pendente = enfileirarAcao(campanhaId, acao);
  publicarEstado(campanhaId);
  agendar(campanhaId);
  return pendente;
}

/** Pede a cena de abertura (campanha nova). */
export function iniciarCampanha(campanhaId: number) {
  return enviarAcao(campanhaId, { personagemId: null, autor: "", acao: INICIO });
}

/** No modo "rodada": manda o mestre narrar com as ações que já chegaram. */
export function forcarRodada(campanhaId: number) {
  agendar(campanhaId, true);
}

/** Reavalia a fila (ex.: saiu um personagem no modo rodada e agora todos os que ficaram já agiram). */
export function reavaliarFila(campanhaId: number) {
  agendar(campanhaId);
}

export function cancelarTurno(campanhaId: number) {
  execucao(campanhaId).controlador?.abort();
}

function prontoParaNarrar(campanhaId: number, forcar: boolean): boolean {
  const fila = listarFila(campanhaId);
  if (!fila.length) return false;
  // modo história: o mestre espera os jogadores rolarem os testes que ele pediu
  if (testesPendentes(campanhaId).length) return false;
  if (forcar || fila.some((a) => a.acao === INICIO)) return true;
  const campanha = obterCampanha(campanhaId);
  if (campanha?.config.modo !== "rodada") return true;
  const personagens = listarPersonagens(campanhaId);
  const agiram = new Set(fila.map((a) => a.personagemId));
  return personagens.every((p) => agiram.has(p.id));
}

function agendar(campanhaId: number, forcar = false) {
  const ex = execucao(campanhaId);
  if (ex.ocupado || !prontoParaNarrar(campanhaId, forcar)) return;
  ex.ocupado = true;
  void processar(campanhaId, forcar);
}

async function processar(campanhaId: number, forcar: boolean) {
  const ex = execucao(campanhaId);
  try {
    // espera um resumo em andamento terminar antes de montar o contexto
    if (ex.resumo) await ex.resumo.catch(() => undefined);
    let primeira = true;
    while (prontoParaNarrar(campanhaId, forcar && primeira)) {
      primeira = false;
      const acoes = retirarFila(campanhaId);
      ex.controlador = new AbortController();
      publicarEstado(campanhaId);
      try {
        await jogarTurno(campanhaId, acoes, ex.controlador.signal);
      } catch (e) {
        console.error("[taverna] turno falhou:", e);
        publicar(campanhaId, { e: "erro", erro: e instanceof Error ? e.message : String(e) });
      } finally {
        ex.controlador = null;
      }
    }
  } finally {
    ex.ocupado = false;
    publicarEstado(campanhaId);
  }
  // Resumo em segundo plano; o próximo turno espera por ele.
  ex.resumo = atualizarResumo(campanhaId)
    .catch((e) => console.error("[taverna] resumo falhou:", e))
    .finally(() => (ex.resumo = null));
  // ações que chegaram durante o resumo
  ex.resumo.then(() => agendar(campanhaId));
}

async function jogarTurno(campanhaId: number, acoes: AcaoPendente[], sinal: AbortSignal) {
  const campanha = obterCampanha(campanhaId);
  if (!campanha) throw new Error("Campanha não encontrada.");
  const sistema = obterSistema(campanha.sistema);
  const personagens = listarPersonagens(campanhaId);
  const recentes = mensagensDepois(campanhaId, campanha.resumoAte);

  // o jeito de voltar atrás: guarda a mesa como estava antes deste turno (e das ações que ele vai gravar)
  registrarInstantaneo(campanhaId, capturarEstado(campanhaId), acoes.map((a) => ({ personagemId: a.personagemId, autor: a.autor, acao: a.acao })));

  const inicio = acoes.some((a) => a.acao === INICIO);
  const doTurno: AcaoDoTurno[] = [];
  if (inicio) {
    publicar(campanhaId, { e: "mensagem", mensagem: adicionarMensagem(campanhaId, "sistema", "A aventura começa.") });
  }
  // sugestões do turno anterior perdem a validade assim que alguém age
  if (campanha.cena?.sugestoes?.length) {
    campanha.cena = { ...campanha.cena, sugestoes: [] };
    salvarCena(campanhaId, campanha.cena);
    publicar(campanhaId, { e: "cena", cena: campanha.cena });
  }
  for (const a of acoes.filter((x) => x.acao !== INICIO)) {
    // resultado de teste rolado pelo jogador: o cartão do dado já está no chat, vai só para o mestre
    if (a.acao.startsWith(RESULTADO_TESTE)) {
      doTurno.push({ personagem: nomeDoPersonagem(personagens, a.personagemId), autor: a.autor, acao: `(resultado do teste pedido) ${a.acao.slice(RESULTADO_TESTE.length)}` });
      continue;
    }
    const mensagem = adicionarMensagem(campanhaId, "jogador", a.acao, { personagemId: a.personagemId, autor: a.autor || null });
    publicar(campanhaId, { e: "mensagem", mensagem });
    doTurno.push({ personagem: nomeDoPersonagem(personagens, a.personagemId), autor: a.autor, acao: a.acao });
  }

  let trecho = "";
  const fecharTrecho = () => {
    const texto = trecho.trim();
    trecho = "";
    if (texto) publicar(campanhaId, { e: "mensagem", mensagem: adicionarMensagem(campanhaId, "mestre", texto) });
  };

  const ctx: ContextoFerramentas = { campanha, sistema, personagens, antes: fecharTrecho };
  const ferramentas = definirFerramentas(ctx);
  const executar = (nome: string, entrada: unknown) => executarFerramenta(ctx, nome, entrada);
  const token = registrarTurno({ ferramentas, executar });

  try {
    await provedorAtual().turno({
      sistema: promptDoSistema(campanha, sistema, personagens),
      prompt: promptDoTurno(recentes, personagens, inicio && !doTurno.length ? "inicio" : doTurno),
      ferramentas,
      executar,
      ponte: { url: enderecoInterno(), token },
      sinal,
      emitir: (ev) => {
        if (ev.tipo === "texto") {
          trecho += ev.texto;
          publicar(campanhaId, { e: "texto", texto: ev.texto });
        } else if (ev.tipo === "limite") {
          publicar(campanhaId, { e: "limite", janela: ev.janela, uso: ev.uso, renovaEm: ev.renovaEm });
        }
      },
    });
  } finally {
    fecharTrecho();
    encerrarTurno(token);
  }
}

/**
 * O jogador rola um teste que o mestre pediu (modo história). O servidor sorteia o dado, atualiza o cartão para
 * todos e, quando não sobra nenhum teste pendente, manda os resultados para o mestre continuar a narração.
 */
export function rolarTestePendente(campanhaId: number, mensagemId: number, autor: string): ResultadoTeste {
  const m = obterMensagem(mensagemId);
  const dados = (m?.dados ?? {}) as Record<string, unknown>;
  if (!m || dados.tipo !== "pedido_teste") throw new Error("Esse teste não existe.");
  if (dados.status !== "pendente") throw new Error("Esse teste já foi rolado.");
  const campanha = obterCampanha(campanhaId);
  const p = m.personagemId ? obterPersonagem(m.personagemId) : null;
  if (!campanha || !p || p.campanhaId !== campanhaId) throw new Error("Esse teste não é desta mesa.");

  const sistema = obterSistema(campanha.sistema);
  const r = sistema.resolverTeste(p.ficha, {
    teste: String(dados.testePedido ?? dados.teste),
    alvo: typeof dados.alvo === "number" ? dados.alvo : null,
    modo: dados.modo === "vantagem" || dados.modo === "desvantagem" ? dados.modo : undefined,
    modificador: typeof dados.modificador === "number" ? dados.modificador : undefined,
    motivo: String(dados.motivo ?? ""),
  });
  const texto = `${p.ficha.nome} · ${r.teste} — ${r.motivo}: ${r.expressao} → ${r.total}${r.alvo !== null ? ` vs ${r.alvo}` : ""} · ${r.rotuloGrau}`;
  // desfazer o turno que esta rolagem vai disparar devolve o teste para "pendente"
  abrirInstantaneo(campanhaId, capturarEstado(campanhaId));
  const atualizada = atualizarMensagem(m.id, texto, { ...dados, status: "resolvido", resultado: r, roladoPor: autor || null });
  if (atualizada) publicar(campanhaId, { e: "mensagem_atualizada", mensagem: atualizada });

  // ganchos do sistema (ex.: Despertar do VtM sobe a Fome), como nos testes automáticos
  try {
    const nova = sistema.aposTeste?.(p.ficha, r);
    if (nova) {
      salvarFicha(p.id, nova);
      publicar(campanhaId, { e: "personagem", personagem: visivel(sistema, { ...p, ficha: nova }) });
    }
  } catch (e) {
    console.warn(`[taverna] aposTeste falhou (${sistema.id}):`, e);
  }

  const perigoso = dados.perigoso ? " (teste perigoso: a falha custa caro)" : "";
  enviarAcao(campanhaId, { personagemId: p.id, autor, acao: `${RESULTADO_TESTE}${texto}${perigoso}` });
  return r;
}

export type Desfeito = {
  /** ações dos jogadores que o turno desfeito tinha recebido (para voltarem ao campo de texto) */
  acoes: { personagemId: number | null; autor: string; acao: string }[];
  /** era a cena de abertura */
  abertura: boolean;
  /** quantos turnos ainda dá para desfazer */
  restantes: number;
};

/**
 * Volta a mesa para antes do último turno do mestre: apaga o que ele escreveu e desfaz fichas, cena e diário.
 * `refazer` volta só até o começo do turno e manda as mesmas ações de novo (o mestre responde outra vez);
 * sem ele, volta até antes da entrada do jogador (inclusive um teste rolado, que fica pendente de novo).
 */
export function desfazerTurno(campanhaId: number, opcoes: { refazer?: boolean } = {}): Desfeito {
  if (execucao(campanhaId).ocupado) throw new Error("O mestre ainda está narrando. Espere ele terminar ou interrompa.");
  const inst = ultimoInstantaneo(campanhaId);
  if (!inst) throw new Error("Não há turno para desfazer.");

  descartarInstantaneoAberto(campanhaId);
  restaurarEstado(campanhaId, opcoes.refazer ? inst.turno : (inst.entrada ?? inst.turno));
  removerInstantaneo(inst.id);
  publicar(campanhaId, { e: "recarregar" });

  const abertura = inst.acoes.some((a) => a.acao === INICIO);
  if (opcoes.refazer) {
    for (const a of inst.acoes) enfileirarAcao(campanhaId, a);
    publicarEstado(campanhaId);
    agendar(campanhaId, true);
  }
  return {
    acoes: inst.acoes.filter((a) => a.acao !== INICIO && !a.acao.startsWith(RESULTADO_TESTE)),
    abertura,
    restantes: contarInstantaneos(campanhaId),
  };
}

async function atualizarResumo(campanhaId: number) {
  const campanha = obterCampanha(campanhaId);
  if (!campanha) return;
  const pendentes = mensagensDepois(campanhaId, campanha.resumoAte);
  if (pendentes.length <= LIMITE_SEM_RESUMO) return;
  const saindo = pendentes.slice(0, pendentes.length - MANTER_LITERAIS);
  const personagens = listarPersonagens(campanhaId);
  const novo = await provedorAtual().texto({ sistema: SISTEMA_RESUMO, prompt: promptDoResumo(campanha.resumo, saindo, personagens) });
  if (novo.trim()) salvarResumo(campanhaId, novo.trim(), saindo[saindo.length - 1].id);
}
