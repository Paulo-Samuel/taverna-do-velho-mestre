import "server-only";
import {
  adicionarMensagem,
  enfileirarAcao,
  lerAjuste,
  listarFila,
  listarPersonagens,
  mensagensDepois,
  obterCampanha,
  retirarFila,
  salvarResumo,
  type AcaoPendente,
} from "../db";
import { INICIO } from "../constantes";
import { obterSistema } from "../sistemas";
import { publicar } from "../tempo-real";
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

  const inicio = acoes.some((a) => a.acao === INICIO);
  const doTurno: AcaoDoTurno[] = [];
  if (inicio) {
    publicar(campanhaId, { e: "mensagem", mensagem: adicionarMensagem(campanhaId, "sistema", "A aventura começa.") });
  }
  for (const a of acoes.filter((x) => x.acao !== INICIO)) {
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
