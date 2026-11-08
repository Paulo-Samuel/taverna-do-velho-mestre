import "server-only";
import {
  abrirInstantaneo,
  adicionarMensagem,
  atualizarCampanha,
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
  listarMensagens,
  listarPersonagens,
  mensagensDepois,
  noitesDaCampanha,
  obterCampanha,
  obterMensagem,
  obterPersonagem,
  retirarFila,
  salvarCena,
  salvarFicha,
  salvarResumo,
  testesPendentes,
  type AcaoPendente,
  type ConfigCampanha,
  type FimPendente,
  type Mensagem,
  type Personagem,
} from "../db";
import {
  FIM_DE_SESSAO,
  INICIO,
  mesaSolo,
  msDaData,
  noiteEmAndamento,
  PAUSA_NOITE_MS,
  pausaDecisao,
  podeDecidir,
  PRAZO_DECISAO_MS,
  PRAZO_DISCRETO_MS,
  RERROLAGEM,
  RESULTADO_TESTE,
  type DecisaoDoTeste,
} from "../constantes";
import { obterSistema } from "../sistemas";
import type { OpcaoDecisao, ResultadoTeste } from "../sistemas/tipos";
import { listarPresenca, publicar } from "../tempo-real";
import { visivel } from "../visivel";
import { arremateRedundante } from "./arremate";
import { definirFerramentas, executarFerramenta, type ContextoFerramentas } from "./ferramentas";
import { acharVarios, extensoesDe } from "./ferramentas/contexto";
import { ENTRADAS } from "./ferramentas/esquemas";
import { LIMITE_SEM_RESUMO, MANTER_LITERAIS } from "./memoria";
import { encerrarTurno, enderecoInterno, registrarTurno } from "./ponte";
import { ErroDoMestre, traduzirErro } from "./erros-api";
import {
  diarioParaResumo,
  fimDeSessao,
  foraDaTranscricao,
  limparRecapitulacao,
  linhasDaNoite,
  medirPrompt,
  nomeDoPersonagem,
  promptDeContinuacao,
  promptDaRecapitulacao,
  promptDoResumo,
  promptDoTurno,
  promptEmBlocos,
  separarDivergencias,
  SISTEMA_RECAPITULACAO,
  SISTEMA_RESUMO,
  transcricao,
  type AcaoDoTurno,
  type FimDeSessao,
  type MedidaPrompt,
  type Recapitular,
} from "./prompt";
import { criarProvedorApi, ESFORCO_PADRAO, ehEsforco } from "./provedor-api";
import { criarProvedorCli } from "./provedor-cli";
import { provedorFalso } from "./provedor-falso";
import { filaPronta } from "./rodada";
import type { EsforcoApi, EventoMestre, Provedor } from "./tipos";

export { FIM_DE_SESSAO, INICIO };

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
  /** esforço da API nos turnos (low/medium/high); vazio = medium. O resumo usa sempre low. */
  esforcoApi?: EsforcoApi;
};

export function lerAjustesMestre(): AjustesMestre {
  return lerAjuste<AjustesMestre>("mestre", {});
}

/**
 * O provedor configurado. Nunca lança: com o mestre indisponível (ex.: API sem ANTHROPIC_API_KEY) devolve um provedor
 * "parado", com o nome certo para as páginas e o estado da mesa, que recusa turno e texto com a mesma frase em português.
 * Quem precisa saber ANTES de enfileirar usa mestreIndisponivel().
 */
export function provedorAtual(): Provedor {
  const ajustes = lerAjustesMestre();
  try {
    return criarProvedor(ajustes);
  } catch (e) {
    return provedorParado(idDoProvedor(ajustes), e);
  }
}

const NOMES_PARADOS: Record<IdProvedor, string> = { api: "API da Anthropic", cli: "Claude Code", falso: "Mestre de teste" };

function provedorParado(id: IdProvedor, causa: unknown): Provedor {
  const t = traduzirErro(causa);
  const recusar = () => Promise.reject(new ErroDoMestre(t.mensagem, t.acao ?? "config"));
  return { id, nome: `${NOMES_PARADOS[id]} (indisponível: confira em Configurações)`, turno: recusar, texto: recusar };
}

/** Qual provedor vale para estes ajustes: ajuste → TAVERNA_PROVEDOR → cli. */
export function idDoProvedor(a: AjustesMestre): IdProvedor {
  const env = process.env.TAVERNA_PROVEDOR?.trim();
  return a.provedor ?? (env === "api" || env === "falso" || env === "cli" ? env : "cli");
}

/** A chave da API vem só do ambiente (.env.local); nunca de perfis do SDK nem da página. */
export function chaveDaApi(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

export const SEM_CHAVE_API = "O mestre da API está sem chave: ponha ANTHROPIC_API_KEY no .env.local, reinicie a taverna e confira em Configurações.";

/**
 * Monta o provedor a partir de ajustes quaisquer (a página de configurações testa antes de salvar).
 * Provedor da API sem ANTHROPIC_API_KEY lança ErroDoMestre em português (a rota /acao responde 409 antes de enfileirar).
 */
export function criarProvedor(a: AjustesMestre): Provedor {
  const id = idDoProvedor(a);
  if (id === "api") {
    const chave = chaveDaApi();
    if (!chave) throw new ErroDoMestre(SEM_CHAVE_API, "config");
    return criarProvedorApi({ modelo: a.modeloApi, chave, esforco: ehEsforco(a.esforcoApi) ? a.esforcoApi : ESFORCO_PADRAO });
  }
  if (id === "falso") return provedorFalso;
  return criarProvedorCli({ modelo: a.modeloCli || undefined, bin: a.binCli || undefined });
}

/** Confere se o mestre configurado consegue começar um turno; devolve a frase em português quando não. */
export function mestreIndisponivel(): string | null {
  try {
    criarProvedor(lerAjustesMestre());
    return null;
  } catch (e) {
    return traduzirErro(e).mensagem;
  }
}

// ---------- medida do prompt (custo da jogada) ----------

const gm = globalThis as unknown as { __tavernaMedidas?: Map<number, MedidaPrompt & { cacheLido?: number; entrada?: number; rodadas?: number }> };
const medidas = (gm.__tavernaMedidas ??= new Map());

/** Última medida do prompt desta mesa (tamanhos dos blocos e, na API, tokens e cache lido), para a página de ajustes. */
export function ultimaMedidaPrompt(campanhaId: number) {
  return medidas.get(campanhaId) ?? null;
}

// ---------- estado de execução por mesa ----------

/** `marcador`: o turno gravou o fim da noite (id do marcador); o resumo em segundo plano vira o fechamento da noite. */
type Execucao = { ocupado: boolean; controlador: AbortController | null; resumo: Promise<unknown> | null; marcador?: number | null };
const g = globalThis as unknown as { __tavernaExec?: Map<number, Execucao> };
const execucoes = (g.__tavernaExec ??= new Map());

function execucao(id: number): Execucao {
  let e = execucoes.get(id);
  if (!e) execucoes.set(id, (e = { ocupado: false, controlador: null, resumo: null, marcador: null }));
  return e;
}

export function mesaOcupada(id: number) {
  return execucao(id).ocupado;
}

function publicarEstado(id: number, aguardando?: number) {
  publicar(id, { e: "estado", ocupado: execucao(id).ocupado, fila: listarFila(id), ...(aguardando ? { aguardando } : {}) });
}

/** Recado de sistema na mesa (aviso de fim anormal do turno, divergência do resumo): fora da transcrição e do resumo. */
function recadoDeSistema(campanhaId: number, texto: string, tipo: "aviso" | "divergencia") {
  publicar(campanhaId, { e: "mensagem", mensagem: adicionarMensagem(campanhaId, "sistema", texto, { dados: { tipo } }) });
}

/**
 * Coloca uma ação na fila da mesa. No modo "livre" o mestre responde assim que estiver livre
 * (juntando as ações que chegaram enquanto ele falava); no modo "rodada" espera todos os personagens agirem.
 */
export function enviarAcao(campanhaId: number, acao: { personagemId: number | null; autor: string; acao: string }): AcaoPendente {
  // quem estava decidindo uma rerrolagem e mandou outra ação aceitou o resultado (e decisões vencidas fecham aqui também).
  // Pergunta fora do jogo, entre (( )), não é ação: a decisão continua aberta (só as vencidas fecham).
  if (!acao.acao.startsWith(RESULTADO_TESTE)) {
    const pergunta = /^\s*\(\(/.test(acao.acao);
    aceitarDecisoes(campanhaId, pergunta ? null : acao.personagemId, { soVencidas: pergunta });
  }
  const pendente = enfileirarAcao(campanhaId, acao);
  publicarEstado(campanhaId);
  agendar(campanhaId);
  return pendente;
}

/** Pede a cena de abertura (campanha nova). */
export function iniciarCampanha(campanhaId: number) {
  return enviarAcao(campanhaId, { personagemId: null, autor: "", acao: INICIO });
}

// ---------- sessões (encerrar a noite) ----------

/**
 * Erro da mesa com status HTTP e dados para a rota devolver junto (`{ erro, ...dados }`): o Encerrar com Manchas sem Remorso
 * (409 com a lista), a rota do Remorso (400 fora do Vampiro, 404 personagem de outra mesa).
 */
export class ErroDaMesa extends Error {
  readonly status: number;
  readonly dados: Record<string, unknown>;
  constructor(mensagem: string, status = 409, dados: Record<string, unknown> = {}) {
    super(mensagem);
    this.status = status;
    this.dados = dados;
  }
}

const ehFimDeSessao = (m: Mensagem) => m.tipo === "dado" && (m.dados as { tipo?: string } | null)?.tipo === "fim_sessao";
/** Recados de sistema (aviso, divergência) não são jogo: não contam para a noite nem para "a última mensagem". */
const ehRecado = (m: Mensagem) => m.tipo === "sistema" && ["aviso", "divergencia"].includes(String((m.dados as { tipo?: string } | null)?.tipo ?? ""));

/**
 * Número da noite (sessão) em andamento: noites fechadas (marcador "Encerrar a noite" ou intervalo de 5 h sem mensagem,
 * noitesDaCampanha) + 1. config.sessao é só um espelho para a interface; desfazer o marcador volta o número junto.
 */
export function sessaoAtual(campanhaId: number): number {
  return noiteEmAndamento(noitesDaCampanha(campanhaId));
}

function sincronizarSessao(campanhaId: number) {
  const c = obterCampanha(campanhaId);
  if (!c) return;
  const sessao = sessaoAtual(campanhaId);
  if ((c.config.sessao ?? 1) === sessao) return;
  const config: ConfigCampanha = { ...c.config, sessao };
  atualizarCampanha(campanhaId, { config });
}

/** Troca chaves da config lendo a versão atual do banco (o turno pode ter mudado outras no meio). */
function mudarConfig(campanhaId: number, mudar: (c: ConfigCampanha) => void) {
  const c = obterCampanha(campanhaId);
  if (!c) return;
  const config: ConfigCampanha = { ...c.config };
  mudar(config);
  atualizarCampanha(campanhaId, { config });
}

/** A última noite já foi encerrada pelo botão e ninguém jogou depois (um aparte (( )) também não conta como jogada). */
function noiteJaEncerrada(mensagens: Mensagem[]): boolean {
  for (let i = mensagens.length - 1; i >= 0; i--) {
    if (ehFimDeSessao(mensagens[i])) return true;
    if (mensagens[i].tipo === "jogador" && !mensagens[i].texto.trim().startsWith("((")) return false;
  }
  return false;
}

/**
 * O sistema tem Remorso no fim da noite: a extensão de ferramentas dele traz `teste_de_remorso` (hoje, só o Vampiro). O
 * mestre não conhece sistema pelo id: pergunta à extensão.
 */
function temRemorso(sistema: ReturnType<typeof obterSistema>): boolean {
  return extensoesDe(sistema).some((e) => Boolean(e.executores && Object.hasOwn(e.executores, "teste_de_remorso")));
}

/** Manchas na ficha: o recurso "mancha" (espelhado em extras.mancha nas fichas antigas), de 0 a 10. */
function manchasDa(ficha: Personagem["ficha"]): number {
  const r = ficha.recursos.mancha?.atual;
  const e = typeof ficha.extras.mancha === "number" ? ficha.extras.mancha : 0;
  return Math.max(0, Math.min(10, r ?? e));
}

/** Quem tem Manchas e ainda não rolou o Remorso (Vampiro); vazio nos outros sistemas. */
export function pendentesDeRemorso(campanhaId: number): { id: number; nome: string; manchas: number }[] {
  const c = obterCampanha(campanhaId);
  if (!c || !temRemorso(obterSistema(c.sistema))) return [];
  return listarPersonagens(campanhaId)
    .map((p) => ({ id: p.id, nome: p.ficha.nome, manchas: manchasDa(p.ficha) }))
    .filter((p) => p.manchas > 0);
}

/**
 * Encerra a noite: enfileira a ação interna FIM_DE_SESSAO (fechamento, XP, Remorso, diário e o marcador no chat).
 * Recusa (ErroDaMesa 409 com a mensagem para o jogador) se o mestre está narrando, se há teste esperando ou ações na fila,
 * e, no Vampiro, se alguém tem Manchas sem o Remorso rolado na tela (dados.remorso: quem), salvo `semRemorso` ("o mestre
 * decide": o mestre rola o teste_de_remorso no fechamento). `retroativa`: fechar em retrospectiva a noite que acabou sem o
 * botão (padrão: automático quando a última mensagem tem 5 h ou mais). Encerrar de novo depois de interromper, sem
 * jogada nova, reaproveita o encerramento em andamento (a mesma noite e o XP já dado).
 */
export function encerrarSessao(campanhaId: number, opcoes: { semRemorso?: boolean; retroativa?: boolean } = {}): { sessao: number; retroativa: boolean } {
  if (execucao(campanhaId).ocupado) throw new ErroDaMesa("O mestre ainda está narrando. Espere ele terminar.");
  if (testesPendentes(campanhaId).length) throw new ErroDaMesa("Há um teste esperando ser rolado (ou decidido). Resolva antes de encerrar a noite.");
  const fila = listarFila(campanhaId);
  if (fila.some((a) => a.acao === FIM_DE_SESSAO)) throw new ErroDaMesa("A noite já está sendo encerrada.");
  if (fila.length) throw new ErroDaMesa("Há ações esperando o mestre. Deixe ele responder antes de encerrar a noite.");
  const campanha = obterCampanha(campanhaId);
  if (!campanha) throw new ErroDaMesa("Mesa não encontrada.", 404);
  const mensagens = listarMensagens(campanhaId).filter((m) => !ehRecado(m));
  if (!mensagens.some((m) => m.tipo === "mestre")) throw new ErroDaMesa("A aventura ainda não começou.");
  if (noiteJaEncerrada(mensagens)) throw new ErroDaMesa("Esta noite já foi encerrada. Jogue a próxima sessão antes de encerrar de novo.");
  if (!opcoes.semRemorso) {
    const remorso = pendentesDeRemorso(campanhaId);
    if (remorso.length) {
      const nomes = remorso.map((p) => `${p.nome} (${p.manchas} Mancha${p.manchas === 1 ? "" : "s"})`).join(", ");
      throw new ErroDaMesa(`Antes de encerrar, role o teste de Remorso: ${nomes}. Ou escolha "o mestre decide".`, 409, { remorso });
    }
  }
  const ultima = mensagens[mensagens.length - 1];
  const anterior = campanha.config.fimPendente;
  // Encerrar interrompido (cancelado, erro): sem jogada nova depois dele, é o mesmo encerramento (mesma noite, XP já dado)
  const mesmo = anterior && !mensagens.some((m) => m.id > (anterior.desde ?? 0) && m.tipo === "jogador" && !m.texto.trim().startsWith("(("));
  let pendente: FimPendente;
  if (mesmo) {
    pendente = { ...anterior, ...(opcoes.semRemorso ? { semRemorso: true } : {}) };
  } else {
    const ms = Date.now() - msDaData(ultima.criadaEm);
    const retroativa = opcoes.retroativa ?? (Number.isFinite(ms) && ms >= PAUSA_NOITE_MS);
    pendente = {
      sessao: sessaoAtual(campanhaId),
      xpConcedido: false,
      ...(opcoes.semRemorso ? { semRemorso: true } : {}),
      ...(retroativa ? { retroativa: true, horas: Math.round((Math.max(0, ms) / 3_600_000) * 10) / 10 } : {}),
      desde: ultima.id,
    };
  }
  mudarConfig(campanhaId, (c) => {
    c.fimPendente = pendente;
  });
  enviarAcao(campanhaId, { personagemId: null, autor: "", acao: FIM_DE_SESSAO });
  return { sessao: pendente.sessao, retroativa: Boolean(pendente.retroativa) };
}

/**
 * Remorso pedido pela ficha (Vampiro), antes do Encerrar: cria o cartão "pedido_teste" de Remorso que o jogador rola como
 * qualquer teste (rolarTestePendente → aposTeste aplica Humanidade e zera as Manchas; o mestre narra o resultado).
 * Já havendo um Remorso esperando para este personagem, devolve o mesmo cartão.
 */
export function pedirRemorso(campanhaId: number, personagemId: number): { mensagemId: number } {
  if (execucao(campanhaId).ocupado) throw new ErroDaMesa("O mestre ainda está narrando. Espere ele terminar.");
  const campanha = obterCampanha(campanhaId);
  const p = obterPersonagem(personagemId);
  if (!campanha || !p || p.campanhaId !== campanhaId) throw new ErroDaMesa("Personagem não encontrado nesta mesa.", 404);
  const sistema = obterSistema(campanha.sistema);
  if (!temRemorso(sistema)) throw new ErroDaMesa("Só o Vampiro tem Remorso.", 400);
  const dele = testesPendentes(campanhaId).filter((m) => ((m.dados as { personagemId?: number } | null)?.personagemId ?? m.personagemId) === p.id);
  const ja = dele.find((m) => {
    const d = (m.dados ?? {}) as { teste?: string; testePedido?: string; status?: string };
    return d.status === "pendente" && (d.testePedido ?? d.teste) === "Remorso";
  });
  if (ja) return { mensagemId: ja.id };
  const manchas = manchasDa(p.ficha);
  if (manchas <= 0) throw new ErroDaMesa(`${p.ficha.nome} não tem Manchas: não há Remorso a rolar.`);
  if (dele.length) throw new ErroDaMesa(`${p.ficha.nome} tem outro teste esperando. Resolva antes do Remorso.`);
  const motivo = "Fim da noite: o peso do que fez";
  const previa = sistema.resolverTeste(p.ficha, { teste: "Remorso", alvo: null, motivo, previa: true });
  const dados = {
    tipo: "pedido_teste",
    status: "pendente",
    personagem: p.ficha.nome,
    personagemId: p.id,
    teste: previa.teste,
    testePedido: "Remorso",
    expressao: previa.expressao.replace(/\s+vs\s+.*$/, ""),
    dadoPrincipal: sistema.dadoPrincipal,
    alvo: null,
    bonus: previa.bonus,
    perigoso: false,
    motivo,
    sistema: sistema.id,
    origem: "remorso",
  };
  const mensagem = adicionarMensagem(campanhaId, "dado", `${p.ficha.nome} precisa rolar o Remorso (${manchas} Mancha${manchas === 1 ? "" : "s"}) — ${motivo}`, {
    dados,
    personagemId: p.id,
  });
  publicar(campanhaId, { e: "mensagem", mensagem });
  return { mensagemId: mensagem.id };
}

/** Data ISO de uma mensagem do banco (para o marcador retroativo levar a data da noite, não a de hoje). */
function isoDaMensagem(id: number | undefined): string | null {
  const m = id ? obterMensagem(id) : null;
  const ms = m ? msDaData(m.criadaEm) : NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/**
 * Grava o marcador de capítulo (mensagem "dado" com dados.tipo "fim_sessao") com o fechamento narrado, avança o contador,
 * liga a recapitulação da próxima jogada e acalma a mesa (sem sugestões, música calma). Devolve o id do marcador.
 */
function marcarFimDeSessao(campanhaId: number, fechamento: string): number {
  const campanha = obterCampanha(campanhaId);
  const pendente = campanha?.config.fimPendente;
  const sessao = pendente?.sessao ?? sessaoAtual(campanhaId);
  const retroativo = Boolean(pendente?.retroativa);
  const data = (retroativo ? isoDaMensagem(pendente?.desde) : null) ?? new Date().toISOString();
  const rotulo = `Fim da sessão ${sessao}`;
  const texto = fechamento.trim();
  const dados = {
    tipo: "fim_sessao",
    sessao,
    data,
    rotulo,
    resumo: rotulo,
    ...(texto ? { fechamento: texto.length > 6000 ? `${texto.slice(0, 6000)}…` : texto } : {}),
    ...(retroativo ? { retroativo: true } : {}),
    ...(campanha?.cena?.combate?.ativo ? { combate: { suspenso: true } } : {}),
  };
  const mensagem = adicionarMensagem(campanhaId, "dado", rotulo, { dados });
  publicar(campanhaId, { e: "mensagem", mensagem });
  mudarConfig(campanhaId, (c) => {
    delete c.fimPendente;
    c.recapPendente = { sessao: sessao + 1, motivo: "marcador" };
  });
  sincronizarSessao(campanhaId);
  // a noite acabou: as sugestões do último turno não valem mais e a trilha baixa
  const cena = obterCampanha(campanhaId)?.cena;
  if (cena) {
    const calma = { ...cena, sugestoes: [], musica: { humor: "calmo" as const, energia: "baixa" as const }, musicaDesde: mensagem.id };
    salvarCena(campanhaId, calma);
    publicar(campanhaId, { e: "cena", cena: calma });
  }
  return mensagem.id;
}

/**
 * Começo de uma noite nova na próxima jogada: o intervalo de 5 h sem ninguém encerrar liga config.recapPendente aqui
 * (o marcador já liga ao ser gravado). Devolve a recapitulação a pedir neste turno (só numa jogada de verdade) e grava, antes
 * das ações, o cartão "Noite N" e, se o marcador trouxe, o "Anteriormente…" pronto.
 */
function abrirNoite(campanhaId: number, jogada: boolean, local: { local?: string; momento?: string }): Recapitular | null {
  const noites = noitesDaCampanha(campanhaId);
  const ultima = noites[noites.length - 1];
  const parado = ultima && !ultima.fechada ? Date.now() - msDaData(ultima.fim) : 0;
  const config = obterCampanha(campanhaId)?.config;
  if (!config) return null;
  if (ultima && parado >= PAUSA_NOITE_MS && !config.recapPendente) {
    const horas = Math.round((parado / 3_600_000) * 10) / 10;
    mudarConfig(campanhaId, (c) => {
      c.recapPendente = { sessao: noites.length + 1, motivo: "intervalo", horas };
    });
  }
  const pendente = obterCampanha(campanhaId)?.config.recapPendente;
  if (!pendente || !jogada) return null;
  let jaMostrada = false;
  if (!pendente.cartao) {
    const titulo = `Noite ${pendente.sessao}`;
    const cartao = adicionarMensagem(campanhaId, "dado", titulo, {
      dados: { tipo: "cena_titulo", titulo, ...(local.local ? { local: local.local } : {}), ...(local.momento ? { momento: local.momento } : {}), sessao: pendente.sessao },
    });
    publicar(campanhaId, { e: "mensagem", mensagem: cartao });
    // o fechamento da noite anterior já deixou o "Anteriormente…" pronto no marcador: entra antes da ação, sem gastar o mestre
    const marcador = pendente.motivo === "marcador" ? [...listarMensagens(campanhaId, 60)].reverse().find(ehFimDeSessao) : undefined;
    const recap = String((marcador?.dados as { recapitulacao?: unknown } | null)?.recapitulacao ?? "").trim();
    if (recap) {
      publicar(campanhaId, { e: "mensagem", mensagem: adicionarMensagem(campanhaId, "mestre", recap) });
      jaMostrada = true;
    }
    mudarConfig(campanhaId, (c) => {
      if (c.recapPendente) c.recapPendente = { ...c.recapPendente, cartao: cartao.id, ...(jaMostrada ? { mostrada: true } : {}) };
    });
  } else {
    jaMostrada = Boolean(pendente.mostrada);
  }
  return { motivo: pendente.motivo, ...(pendente.horas !== undefined ? { horas: pendente.horas } : {}), ...(jaMostrada ? { jaMostrada: true } : {}) };
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

/** A regra em si (modo livre, rodada, testes pendentes, resultado de teste) vive em rodada.ts, sem banco, para ser testada. */
function prontoParaNarrar(campanhaId: number, forcar: boolean): boolean {
  const fila = listarFila(campanhaId);
  if (!fila.length) return false;
  return filaPronta({
    fila,
    personagens: listarPersonagens(campanhaId).map((p) => p.id),
    modo: obterCampanha(campanhaId)?.config.modo,
    // só perguntas fora do jogo na fila ("não é essa parada?"): o mestre responde mesmo com o teste esperando o dado
    testePendente: testesPendentes(campanhaId).length > 0 && !fila.every((a) => a.acao.trim().startsWith("((")),
    forcar,
  });
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
      // mestre indisponível (ex.: API sem chave): as ações ficam na fila (resultado de teste, forçar, encerrar a noite,
      // abertura) e a mesa mostra o porquê; nada se perde, e a próxima ação depois de resolver leva tudo junto
      const indisponivel = mestreIndisponivel();
      if (indisponivel) {
        publicar(campanhaId, { e: "erro", erro: indisponivel, acao: "config" });
        break;
      }
      const acoes = retirarFila(campanhaId);
      const controlador = (ex.controlador = new AbortController());
      publicarEstado(campanhaId);
      // o turno registra um instantâneo antes de chamar o mestre: se ele mudou, "Tentar de novo" reenfileira as mesmas ações
      const instantaneoAntes = ultimoInstantaneo(campanhaId)?.id ?? null;
      try {
        await jogarTurno(campanhaId, acoes, controlador.signal);
      } catch (e) {
        const t = traduzirErro(e, { sinal: controlador.signal });
        if (t.cancelado) {
          // interromper não é erro: a mesa não mostra banner
          console.info(`[taverna] turno interrompido (mesa ${campanhaId}).`);
        } else {
          console.error("[taverna] turno falhou:", e);
          const refazer = (ultimoInstantaneo(campanhaId)?.id ?? null) !== instantaneoAntes;
          publicar(campanhaId, { e: "erro", erro: t.mensagem, ...(t.acao ? { acao: t.acao } : {}), ...(refazer ? { refazer: true } : {}) });
        }
      } finally {
        ex.controlador = null;
      }
    }
  } finally {
    ex.ocupado = false;
    publicarEstado(campanhaId);
  }
  // Resumo em segundo plano; o próximo turno espera por ele. Falha vira aviso na mesa (a memória do mestre cresce até resolver).
  // Com o mestre indisponível não há resumo a tentar: o aviso do porquê já foi dado acima, não se repete a cada passada.
  if (mestreIndisponivel()) {
    ex.marcador = null;
    return;
  }
  // a noite acabou de ser encerrada: o resumo fecha nela (até o marcador) e o "Anteriormente…" fica gravado no marcador
  const marcador = ex.marcador;
  ex.marcador = null;
  ex.resumo = (marcador ? fecharNoite(campanhaId, marcador) : atualizarResumo(campanhaId))
    .catch((e) => {
      console.error("[taverna] resumo falhou:", e);
      const t = traduzirErro(e);
      if (!t.cancelado) {
        publicar(campanhaId, { e: "erro", aviso: true, erro: `O resumo da campanha falhou: ${t.mensagem} Até resolver, a memória do mestre vai crescendo a cada jogada.` });
      }
    })
    .finally(() => (ex.resumo = null));
  // ações que chegaram durante o resumo
  ex.resumo.then(() => agendar(campanhaId));
}

async function jogarTurno(campanhaId: number, acoes: AcaoPendente[], sinal: AbortSignal) {
  const campanha = obterCampanha(campanhaId);
  if (!campanha) throw new Error("Campanha não encontrada.");
  const sistema = obterSistema(campanha.sistema);
  const personagens = listarPersonagens(campanhaId);
  let recentes = mensagensDepois(campanhaId, campanha.resumoAte);

  // o jeito de voltar atrás: guarda a mesa como estava antes deste turno (e das ações que ele vai gravar)
  registrarInstantaneo(campanhaId, capturarEstado(campanhaId), acoes.map((a) => ({ personagemId: a.personagemId, autor: a.autor, acao: a.acao })));

  const inicio = acoes.some((a) => a.acao === INICIO);
  const fim = acoes.some((a) => a.acao === FIM_DE_SESSAO);
  const doTurno: AcaoDoTurno[] = [];
  if (inicio) {
    publicar(campanhaId, { e: "mensagem", mensagem: adicionarMensagem(campanhaId, "sistema", "A aventura começa.") });
  }
  // sugestões do turno anterior perdem a validade assim que alguém age (voltam se o turno foi só uma resposta fora do jogo)
  const sugestoesAntes = campanha.cena?.sugestoes ?? [];
  if (campanha.cena?.sugestoes?.length) {
    campanha.cena = { ...campanha.cena, sugestoes: [] };
    salvarCena(campanhaId, campanha.cena);
    publicar(campanhaId, { e: "cena", cena: campanha.cena });
  }
  // noite nova (marcador do Encerrar, ou 5 h sem ninguém): cartão "Noite N" e recapitulação na primeira jogada de verdade
  // (aparte (( )) e rerrolagem não abrem a noite; o resultado de um teste que ficou esperando, sim)
  const daMesa = acoes.filter((x) => x.acao !== INICIO && x.acao !== FIM_DE_SESSAO && !x.acao.startsWith(RERROLAGEM));
  const jogada = !inicio && !fim && daMesa.length > 0 && !daMesa.every((x) => /^\s*\(\(.*\)\)\s*$/s.test(x.acao));
  const recapitular = inicio || fim || !daMesa.length ? null : abrirNoite(campanhaId, jogada, { local: campanha.cena?.local, momento: campanha.cena?.momento });
  if (recapitular) recentes = mensagensDepois(campanhaId, campanha.resumoAte);
  for (const a of acoes.filter((x) => x.acao !== INICIO && x.acao !== FIM_DE_SESSAO)) {
    // resultado de teste rolado pelo jogador: o cartão do dado já está no chat, vai só para o mestre
    if (a.acao.startsWith(RERROLAGEM)) {
      doTurno.push({
        personagem: nomeDoPersonagem(personagens, a.personagemId),
        autor: a.autor,
        acao: `(rerrolagem depois do teste que você já narrou: corrija a narração com o resultado novo, sem rolar de novo) ${a.acao.slice(RERROLAGEM.length)}`,
      });
      continue;
    }
    if (a.acao.startsWith(RESULTADO_TESTE)) {
      doTurno.push({ personagem: nomeDoPersonagem(personagens, a.personagemId), autor: a.autor, acao: `(resultado do teste pedido) ${a.acao.slice(RESULTADO_TESTE.length)}` });
      continue;
    }
    const mensagem = adicionarMensagem(campanhaId, "jogador", a.acao, { personagemId: a.personagemId, autor: a.autor || null });
    publicar(campanhaId, { e: "mensagem", mensagem });
    doTurno.push({ personagem: nomeDoPersonagem(personagens, a.personagemId), autor: a.autor, acao: a.acao });
  }

  const provedor = provedorAtual();
  let trecho = "";
  let narrado = 0;
  // quanto de narração cobrar antes de sugestões/testes: a abertura precisa da cena inteira; fala fora do jogo não cobra nada
  // (o mestre de teste tem falas prontas e curtas: não cobra, salvo no ensaio da rede de segurança: "[mudo]" na ação faz
  // ele pular a narração de propósito, para ver a continuação funcionar sem IA)
  const soForaDoJogo = doTurno.length > 0 && doTurno.every((a) => /^\s*\(\(.*\)\)\s*$/s.test(a.acao));
  const ensaioMudo = provedor.id === "falso" && doTurno.some((a) => /\[mudo/i.test(a.acao));
  const exigirNarracao = (provedor.id === "falso" && !ensaioMudo) || soForaDoJogo || fim ? 0 : inicio && !doTurno.length ? 400 : 150;
  // tudo o que o jogador leu neste turno (para a rede de segurança do fim) e onde estava o trecho na última ferramenta
  let lido = "";
  let marca = 0;
  let ferramentasUsadas = 0;
  // o que rodou (a continuação não repete) e a última ferramenta fora `sugerir_acoes`, com a posição do trecho nela:
  // depois de `pedir_teste` o rabo começa no cartão do dado, mesmo que `sugerir_acoes` tenha vindo em seguida
  const nomesUsados: string[] = [];
  let ultimaFerramenta = "";
  let marcaUltima = 0;
  const fecharTrecho = () => {
    const texto = trecho.trim();
    trecho = "";
    if (texto) publicar(campanhaId, { e: "mensagem", mensagem: adicionarMensagem(campanhaId, "mestre", texto) });
  };

  // narração entregue pela ferramenta `narrar`: fecha o que veio como texto antes e entra no chat na mesma ordem
  const narrar = (t: string) => {
    fecharTrecho();
    const texto = t.trim();
    if (!texto) return;
    narrado += texto.length;
    lido += `${texto}\n\n`;
    publicar(campanhaId, { e: "mensagem", mensagem: adicionarMensagem(campanhaId, "mestre", texto) });
  };

  const ctx: ContextoFerramentas = { campanha, sistema, personagens, antes: fecharTrecho, narrado: () => narrado, narrar, exigirNarracao };
  // fim da sessão: sem sugestões nem testes (o pedido do turno também diz isso; aqui é a garantia)
  const FORA_DO_FIM = ["sugerir_acoes", "pedir_teste", "teste"];
  const ferramentas = definirFerramentas(ctx).filter((f) => !fim || !FORA_DO_FIM.includes(f.name));
  // encerramento em andamento (gravado pelo Encerrar): a noite que fecha e se o XP dela já saiu (Encerrar interrompido)
  const fimPendente: FimPendente | null = fim ? (campanha.config.fimPendente ?? null) : null;
  // XP do fechamento por personagem: quem recebeu num Encerrar interrompido (bloqueado neste turno) e quem recebe agora
  // (várias chamadas no mesmo turno valem: uma por personagem ou uma por motivo, como as regras de XP pedem)
  const xpAntes = xpJaDadoNoFim(fimPendente, personagens);
  const xpAgora = new Set<number>();
  const executar = async (nome: string, entrada: unknown) => {
    ferramentasUsadas++;
    nomesUsados.push(nome);
    try {
      let alvosXp: Personagem[] = [];
      let usada = entrada;
      if (fim) {
        if (FORA_DO_FIM.includes(nome)) throw new Error("A noite está sendo encerrada: sem testes nem sugestões. Termine o fechamento.");
        guardaDoFim(nome, entrada, obterCampanha(campanhaId)?.cena?.titulo ?? campanha.cena?.titulo ?? "");
        if (nome === "conceder_xp") {
          const filtrado = xpSoParaQuemFalta(ctx, entrada, xpAntes);
          usada = filtrado.entrada;
          alvosXp = filtrado.alvos;
        }
      }
      const r = await executarFerramenta(ctx, nome, usada);
      if (fim && nome === "conceder_xp" && alvosXp.length) {
        // o XP saiu para estes: um segundo Encerrar depois de interromper não concede de novo a eles
        for (const p of alvosXp) xpAgora.add(p.id);
        anotarXpDoFim(campanhaId, alvosXp.map((p) => p.id));
      }
      return r;
    } finally {
      marca = trecho.length;
      if (nome !== "sugerir_acoes" || !ultimaFerramenta) {
        ultimaFerramenta = nome;
        marcaUltima = marca;
      }
    }
  };
  const token = registrarTurno({ ferramentas, executar });
  // dois blocos: o estável (em cache, igual entre jogadas) e o do turno (fichas, fatos, resumo, diário, cena)
  const blocos = promptEmBlocos(campanha, sistema, personagens);
  // avisos de fim anormal (limite de ações, resposta cortada, recusa) esperam a narração fechar e entram depois dela
  const avisos: string[] = [];
  const uso = { rodadas: 0, entrada: 0, saida: 0, cacheLido: 0, cacheEscrito: 0 };
  const aoEmitir = (ev: EventoMestre) => {
    if (ev.tipo === "texto") {
      trecho += ev.texto;
      lido += ev.texto;
      narrado += ev.texto.trim().length;
      publicar(campanhaId, { e: "texto", texto: ev.texto });
    } else if (ev.tipo === "limite") {
      publicar(campanhaId, { e: "limite", janela: ev.janela, uso: ev.uso, renovaEm: ev.renovaEm });
    } else if (ev.tipo === "aviso") {
      if (!avisos.includes(ev.texto)) avisos.push(ev.texto);
    } else if (ev.tipo === "aguardando") {
      publicarEstado(campanhaId, ev.segundos);
    } else if (ev.tipo === "uso") {
      uso.rodadas = Math.max(uso.rodadas, ev.rodada);
      uso.entrada += ev.entrada;
      uso.saida += ev.saida;
      uso.cacheLido += ev.cacheLido;
      uso.cacheEscrito += ev.cacheEscrito;
      console.info(
        `[taverna] ${provedor.id}: rodada ${ev.rodada}/${ev.maxRodadas} (mesa ${campanhaId}) · entrada ${ev.entrada} · cache_read_input_tokens ${ev.cacheLido} · cache escrito ${ev.cacheEscrito} · saída ${ev.saida}`,
      );
    }
  };

  // pedido do turno: abertura, fim de sessão (com as regras de XP do sistema e os passos próprios dele) ou as ações
  const pedidoFim: FimDeSessao | null = fim ? pedidoDoFim(campanhaId, sistema, personagens, fimPendente) : null;

  const especial = (inicio && !doTurno.length) || Boolean(pedidoFim && !doTurno.length);
  const pedido = promptDoTurno(recentes, personagens, inicio && !doTurno.length ? "inicio" : pedidoFim && !doTurno.length ? pedidoFim : doTurno, { recapitular });
  const { medida, linha: linhaMedida } = medirPrompt(blocos, pedido, transcricao(recentes, personagens));
  console.info(`${linhaMedida} (mesa ${campanhaId}, ${provedor.id})`);
  medidas.set(campanhaId, medida);
  let concluido = false;
  try {
    await provedor.turno({
      sistema: blocos.estavel,
      contexto: blocos.turno,
      prompt: pedido,
      ferramentas,
      executar,
      ponte: { url: enderecoInterno(), token },
      sinal,
      emitir: aoEmitir,
      especial,
    });
    concluido = !sinal.aborted;
  } finally {
    // rede de segurança: o texto depois da última ferramenta que só repete a vez ou resume a mecânica não é gravado
    // (a narração anterior já entregou a vez; juntar a ela duplicaria a passagem de vez na mesma mensagem; nunca se anexa
    // texto a uma narração que o jogador já leu: ou o rabo fica como veio, ou sai)
    if (ferramentasUsadas && !sinal.aborted) {
      const depoisDeTeste = ultimaFerramenta === "pedir_teste";
      const corte = Math.min(depoisDeTeste ? marcaUltima : marca, trecho.length);
      const rabo = trecho.slice(corte);
      const antes = lido.slice(0, lido.length - rabo.length);
      const conhecidos = [...personagens.map((p) => p.ficha.nome), ...doTurno.map((a) => a.acao)];
      if (arremateRedundante(rabo, antes, conhecidos, { depoisDeTeste })) {
        console.info(`[taverna] fim de turno repetido descartado${depoisDeTeste ? " (depois de pedir_teste)" : ""} (mesa ${campanhaId}): ${JSON.stringify(rabo.trim().slice(0, 160))}`);
        trecho = trecho.slice(0, corte);
        // o fechamento do marcador sai de `lido`: o rabo descartado (ex.: um "—" solto) não entra nele
        lido = antes;
        narrado = Math.max(0, narrado - rabo.trim().length);
      } else if (rabo.trim()) {
        console.info(`[taverna] fim de turno mantido (mesa ${campanhaId}): ${JSON.stringify(rabo.trim().slice(0, 160))}`);
      }
    }
    fecharTrecho();
    encerrarTurno(token);
  }

  // rede de segurança do turno inteiro: terminou sem narração suficiente (o modelo narrou só no raciocínio, ou insistiu em
  // pular o `narrar` depois da única recusa de cobrarNarracao). UMA chamada de continuação, só com a ferramenta narrar,
  // com o mesmo pedido mais o que já rodou; se ainda vier vazio, o jogador recebe o erro em vez de uma mesa muda.
  if (concluido && exigirNarracao > 0 && narrado < exigirNarracao) {
    const antesDaContinuacao = narrado;
    console.warn(`[taverna] turno sem narração (mesa ${campanhaId}: ${narrado} de ${exigirNarracao} caracteres): pedindo a continuação só com narrar.`);
    const soNarrar = ferramentas.filter((f) => f.name === "narrar");
    const executarNarrar = async (nome: string, entrada: unknown) => {
      if (nome !== "narrar") throw new Error("Nesta continuação só a ferramenta narrar está disponível: chame narrar com a narração completa.");
      return executarFerramenta(ctx, nome, entrada);
    };
    const tokenContinuacao = registrarTurno({ ferramentas: soNarrar, executar: executarNarrar });
    let falha: string | null = null;
    try {
      await provedor.turno({
        sistema: blocos.estavel,
        contexto: blocos.turno,
        prompt: promptDeContinuacao(pedido, nomesUsados, lido),
        ferramentas: soNarrar,
        executar: executarNarrar,
        ponte: { url: enderecoInterno(), token: tokenContinuacao },
        sinal,
        emitir: aoEmitir,
      });
    } catch (e) {
      const t = traduzirErro(e, { sinal });
      falha = t.cancelado ? null : t.mensagem;
      console.error("[taverna] continuação do turno falhou:", e);
    } finally {
      fecharTrecho();
      encerrarTurno(tokenContinuacao);
    }
    if (!sinal.aborted && narrado <= antesDaContinuacao) {
      console.error(`[taverna] o mestre não narrou nada neste turno, nem na continuação (mesa ${campanhaId}).`);
      publicar(campanhaId, {
        e: "erro",
        erro: `O mestre não narrou nada neste turno${falha ? ` (${falha})` : ""}. Use "Outra resposta" para ele tentar de novo.`,
        acao: "tentar",
        refazer: true,
      });
    }
  }

  // fim anormal do turno (limite de ações, resposta cortada, recusa): recado de sistema, fora da transcrição e do resumo
  for (const aviso of avisos) recadoDeSistema(campanhaId, aviso, "aviso");
  if (uso.rodadas) {
    const m = medidas.get(campanhaId);
    if (m) medidas.set(campanhaId, { ...m, cacheLido: uso.cacheLido, entrada: uso.entrada, rodadas: uso.rodadas });
    console.info(
      `[taverna] ${provedor.id}: turno em ${uso.rodadas} rodada${uso.rodadas === 1 ? "" : "s"} (mesa ${campanhaId}) · entrada ${uso.entrada} · cache lido ${uso.cacheLido} · cache escrito ${uso.cacheEscrito} · saída ${uso.saida} · ferramentas: ${nomesUsados.join(", ") || "nenhuma"}`,
    );
  }

  // turno só de conversa fora do jogo (nenhuma ferramenta): as sugestões da cena continuam valendo
  const resultado = acoes.some((a) => a.acao.startsWith(RESULTADO_TESTE));
  if (concluido && !ferramentasUsadas && !inicio && !fim && !resultado && sugestoesAntes.length && campanha.config.sugestoes !== false) {
    const atual = obterCampanha(campanhaId)?.cena ?? campanha.cena;
    if (!atual?.sugestoes?.length) {
      const cena = { ...atual, sugestoes: sugestoesAntes };
      salvarCena(campanhaId, cena);
      publicar(campanhaId, { e: "cena", cena });
    }
  }
  if (fim && concluido) {
    // rede de segurança do fechamento: o mestre que pulou o roteiro não deixa Manchas sem Remorso nem a noite sem XP
    await redeDoFim(campanhaId, ctx, new Set([...xpAntes, ...xpAgora]));
    execucao(campanhaId).marcador = marcarFimDeSessao(campanhaId, lido);
  }
  // a recapitulação da noite nova foi feita: a próxima jogada segue normal
  if (recapitular && concluido) {
    mudarConfig(campanhaId, (c) => {
      delete c.recapPendente;
    });
  }
}

/** Jogadas de verdade (fora apartes) numa lista de mensagens. */
const jogadasEm = (mensagens: Mensagem[]) => mensagens.filter((m) => m.tipo === "jogador" && !m.texto.trim().startsWith("((")).length;

/** As mensagens da noite que está sendo encerrada (a do fimPendente, ou a última). */
function mensagensDaNoite(campanhaId: number, sessao: number | null): Mensagem[] {
  const noites = noitesDaCampanha(campanhaId);
  const noite = (sessao ? noites.find((n) => n.numero === sessao) : null) ?? noites[noites.length - 1];
  if (!noite) return [];
  return mensagensDepois(campanhaId, noite.inicioId - 1).filter((m) => !ehRecado(m));
}

/** O pedido do fechamento: XP e passos do sistema, mais a noite inteira, a luta aberta, o retroativo e o XP já dado. */
function pedidoDoFim(campanhaId: number, sistema: ReturnType<typeof obterSistema>, personagens: Personagem[], pendente: FimPendente | null): FimDeSessao {
  const sessao = pendente?.sessao ?? sessaoAtual(campanhaId);
  const daNoite = mensagensDaNoite(campanhaId, pendente?.sessao ?? null);
  return fimDeSessao(sistema, sessao, personagens.map((p) => p.ficha), {
    nestaSessao: linhasDaNoite(daNoite, personagens),
    combateAtivo: Boolean(obterCampanha(campanhaId)?.cena?.combate?.ativo),
    retroativa: pendente?.retroativa ? { horas: pendente.horas ?? PAUSA_NOITE_MS / 3_600_000 } : null,
    xpJaConcedido: quemJaTemXp(pendente, personagens),
  });
}

/** Para o pedido do fechamento: true se toda a mesa já recebeu o XP; a lista de nomes se só parte; false se ninguém. */
function quemJaTemXp(pendente: FimPendente | null, personagens: Personagem[]): boolean | string[] {
  const ja = xpJaDadoNoFim(pendente, personagens);
  const com = personagens.filter((p) => ja.has(p.id));
  if (!com.length) return false;
  return com.length === personagens.length ? true : com.map((p) => p.ficha.nome);
}

/**
 * Guarda do turno de fechamento (erro amigável que volta ao mestre): sem combate novo, sem cena nova (título trocado) e sem
 * XP repetido. Fechar a luta aberta, mudar música, local ou momento (o corte para o refúgio) continuam valendo.
 */
function guardaDoFim(nome: string, entrada: unknown, tituloAtual: string) {
  if (nome === "atualizar_cena") {
    const e = (entrada ?? {}) as { titulo?: unknown; combate?: { acao?: unknown } };
    if (e.combate?.acao === "iniciar") {
      throw new Error('A noite está sendo encerrada: não abra combate novo. Feche a luta aberta (combate.acao "encerrar") ou deixe o gancho no fechamento.');
    }
    const titulo = typeof e.titulo === "string" ? e.titulo.trim() : "";
    if (titulo && titulo.toLowerCase() !== tituloAtual.trim().toLowerCase()) {
      throw new Error("A noite está sendo encerrada: sem cena nova (título novo). Feche onde a história parou.");
    }
  }
}

/**
 * Quem já recebeu o XP deste fechamento num Encerrar interrompido. Registro antigo, sem `xpPara`, com `xpConcedido`:
 * a mesa inteira (era o que ele dizia).
 */
function xpJaDadoNoFim(pendente: FimPendente | null, personagens: Personagem[]): Set<number> {
  if (!pendente) return new Set();
  if (pendente.xpPara) return new Set(pendente.xpPara);
  return new Set(pendente.xpConcedido ? personagens.map((p) => p.id) : []);
}

/**
 * conceder_xp no fechamento: tira da lista quem já recebeu num Encerrar interrompido (`xpAntes`); se ninguém sobrar, recusa
 * com erro amigável ao mestre. Chamadas repetidas no MESMO turno passam (uma por personagem, uma por motivo).
 */
function xpSoParaQuemFalta(ctx: ContextoFerramentas, entrada: unknown, xpAntes: Set<number>): { entrada: unknown; alvos: Personagem[] } {
  const lida = ENTRADAS.conceder_xp.safeParse(entrada);
  // entrada inválida: a própria ferramenta devolve o erro de validação
  if (!lida.success) return { entrada, alvos: [] };
  const alvos = acharVarios(ctx, lida.data.personagens);
  const faltam = alvos.filter((p) => !xpAntes.has(p.id));
  if (!faltam.length) {
    throw new Error(`O XP desta noite já foi concedido a ${alvos.map((p) => p.ficha.nome).join(", ")} no encerramento interrompido: não conceda de novo a ${alvos.length === 1 ? "este personagem" : "eles"}. Termine o fechamento.`);
  }
  if (faltam.length === alvos.length) return { entrada, alvos };
  return { entrada: { ...(entrada as object), personagens: faltam.map((p) => p.ficha.nome) }, alvos: faltam };
}

/** Grava no encerramento em andamento quem já recebeu XP (para um Encerrar repetido não dar de novo). */
function anotarXpDoFim(campanhaId: number, ids: number[]) {
  mudarConfig(campanhaId, (c) => {
    if (!c.fimPendente) return;
    const antes = c.fimPendente.xpPara ?? [];
    c.fimPendente = { ...c.fimPendente, xpConcedido: true, xpPara: [...new Set([...antes, ...ids])] };
  });
}

/**
 * Depois do fechamento narrado: Remorso (Vampiro) para quem ainda tem Manchas e o XP mínimo do sistema para quem o mestre não
 * deu (e a noite teve jogo: 3 jogadas ou mais). Cada passo falha sozinho, sem impedir o marcador.
 */
async function redeDoFim(campanhaId: number, ctx: ContextoFerramentas, xpDado: Set<number>) {
  const sistema = ctx.sistema;
  if (temRemorso(sistema)) {
    for (const p of [...ctx.personagens]) {
      if (manchasDa(p.ficha) <= 0) continue;
      console.info(`[taverna] fim da noite sem Remorso de ${p.ficha.nome} (mesa ${campanhaId}): o servidor rola.`);
      try {
        await executarFerramenta(ctx, "teste_de_remorso", { personagem: p.ficha.nome });
      } catch (e) {
        console.warn(`[taverna] Remorso automático de ${p.ficha.nome} falhou:`, e);
      }
    }
  }
  const minimo = sistema.fimDeSessao?.xpMinimo ?? 0;
  const semXp = ctx.personagens.filter((p) => !xpDado.has(p.id));
  if (minimo <= 0 || !semXp.length) return;
  const pendente = obterCampanha(campanhaId)?.config.fimPendente;
  if (jogadasEm(mensagensDaNoite(campanhaId, pendente?.sessao ?? null)) < 3) return;
  const nomes = semXp.map((p) => p.ficha.nome);
  console.info(`[taverna] fim da noite sem XP para ${nomes.join(", ")} (mesa ${campanhaId}): o servidor concede o mínimo (${minimo}).`);
  try {
    const todos = semXp.length === ctx.personagens.length;
    await executarFerramenta(ctx, "conceder_xp", { personagens: todos ? "todos" : nomes, quantidade: minimo, motivo: "pela noite jogada (fechamento automático)" });
    anotarXpDoFim(campanhaId, semXp.map((p) => p.id));
  } catch (e) {
    console.warn("[taverna] XP mínimo do fechamento falhou:", e);
  }
}

/**
 * O jogador rola um teste que o mestre pediu (modo história). O servidor sorteia o dado, atualiza o cartão para
 * todos e, quando não sobra nenhum teste pendente, manda os resultados para o mestre continuar a narração.
 */
export function rolarTestePendente(
  campanhaId: number,
  mensagemId: number,
  autor: string,
  extra: { clienteId?: string | null; surto?: boolean } = {},
): ResultadoTeste {
  const m = obterMensagem(mensagemId);
  const dados = (m?.dados ?? {}) as Record<string, unknown>;
  if (!m || dados.tipo !== "pedido_teste") throw new Error("Esse teste não existe.");
  if (dados.status !== "pendente") throw new Error("Esse teste já foi rolado.");
  const campanha = obterCampanha(campanhaId);
  const p = m.personagemId ? obterPersonagem(m.personagemId) : null;
  if (!campanha || !p || p.campanhaId !== campanhaId) throw new Error("Esse teste não é desta mesa.");

  const sistema = obterSistema(campanha.sistema);
  const testeBase = String(dados.testePedido ?? dados.teste);
  // escolha antes de rolar (Vampiro: Surto de Sangue): revalidada agora, porque a Fome pode ter mudado desde o pedido
  let comSurto = false;
  if (extra.surto) {
    const antes = sistema.opcoesAntesDeRolar?.(p.ficha, { teste: testeBase, alvo: null, motivo: String(dados.motivo ?? "") }) ?? [];
    if (!antes.some((o) => o.id === "surto")) throw new Error("O Surto de Sangue não vale mais neste teste (a Fome mudou ou já há um Surto guardado).");
    comSurto = true;
  }
  const r = sistema.resolverTeste(p.ficha, {
    teste: comSurto ? `${testeBase} com Surto de Sangue` : testeBase,
    alvo: typeof dados.alvo === "number" ? dados.alvo : null,
    modo: dados.modo === "vantagem" || dados.modo === "desvantagem" ? dados.modo : undefined,
    modificador: typeof dados.modificador === "number" ? dados.modificador : undefined,
    motivo: String(dados.motivo ?? ""),
    // opções próprias do sistema guardadas no pedido (Vampiro: custo de Despertar do poder)
    ...(dados.opcoes && typeof dados.opcoes === "object" ? { opcoes: dados.opcoes as Record<string, unknown> } : {}),
  });
  const texto = textoDoResultado(p.ficha.nome, r);
  // decisão do jogador depois do dado, se o sistema oferecer (Vampiro: rerrolar com Força de Vontade; PF2e: Ponto de Herói…).
  // Falha, teste perigoso ou ataque PAUSAM: o cartão pergunta antes de o mestre saber (mesa solo espera sem prazo; com mais
  // aparelhos, 45 s). Num sucesso comum o mestre já recebe o resultado e o botão fica discreto por alguns segundos.
  const opcoesDecisao = opcoesDepoisDoTeste(sistema, p.ficha, r);
  const pausar = opcoesDecisao.length > 0 && pausaDecisao(r, Boolean(dados.perigoso));
  const discreta = opcoesDecisao.length > 0 && !pausar;
  const solo = mesaSolo(listarPresenca(campanhaId));
  const decisao: DecisaoDoTeste | null = opcoesDecisao.length
    ? {
        ate: discreta ? Date.now() + PRAZO_DISCRETO_MS : solo ? null : Date.now() + PRAZO_DECISAO_MS,
        clienteId: extra.clienteId || null,
        campanhaId,
        opcoes: opcoesDecisao,
        ...(discreta ? { discreta: true } : {}),
      }
    : null;
  // desfazer o turno que esta rolagem vai disparar devolve o teste para "pendente"
  abrirInstantaneo(campanhaId, capturarEstado(campanhaId));
  const atualizada = atualizarMensagem(m.id, texto, {
    ...dados,
    status: pausar ? "decidir" : "resolvido",
    resultado: r,
    roladoPor: autor || null,
    ...(decisao ? { decisao } : {}),
  });
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

  if (pausar && decisao) {
    armarPrazo(campanhaId, m.id, decisao.ate);
    return r;
  }
  enviarResultado(campanhaId, p.id, autor, texto, dados, r);
  return r;
}

/** As opções que o sistema oferece depois deste resultado (erro do gancho = nenhuma; o teste nunca trava por isso). */
function opcoesDepoisDoTeste(sistema: ReturnType<typeof obterSistema>, ficha: Personagem["ficha"], r: ResultadoTeste): OpcaoDecisao[] {
  try {
    return sistema.decisoesAposTeste?.(ficha, r) ?? [];
  } catch (e) {
    console.warn(`[taverna] decisoesAposTeste falhou (${sistema.id}):`, e);
    return [];
  }
}


const textoDoResultado = (nome: string, r: ResultadoTeste) =>
  `${nome} · ${r.teste} — ${r.motivo}: ${r.expressao} → ${r.total}${r.alvo !== null ? ` vs ${r.alvo}` : ""} · ${r.rotuloGrau}`;

/** Manda o resultado do teste para o mestre narrar (ação interna RESULTADO_TESTE). */
function enviarResultado(campanhaId: number, personagemId: number, autor: string, texto: string, dados: Record<string, unknown>, r: ResultadoTeste, extra = "") {
  const perigoso = dados.perigoso ? " (teste perigoso: a falha custa caro)" : "";
  // o que o sistema já aplicou na ficha e o que narrar (Vampiro: Despertar do poder, Fome nova, Surto gasto, rerrolagem)
  const aviso = [extra, r.avisoMestre].filter(Boolean).map((x) => ` — ${x}`).join("");
  enviarAcao(campanhaId, { personagemId, autor, acao: `${RESULTADO_TESTE}${texto}${perigoso}${aviso}` });
}

// ---------- decisão depois do teste (ganchos decisoesAposTeste/aplicarDecisao; Vampiro: rerrolar com Força de Vontade) ----------

/** Prazo da decisão com mais de um aparelho (mesa solo espera sem prazo); o navegador não aceita sozinho, só o servidor. */
export { PRAZO_DECISAO_MS };

const gd = globalThis as unknown as { __tavernaPrazos?: Map<number, ReturnType<typeof setTimeout>> };
const prazos = (gd.__tavernaPrazos ??= new Map());

/** De quanto em quanto a decisão sem prazo (mesa solo) confere se chegou gente: aí ganha os 45 s. */
const VIGIA_SOLO_MS = 3_000;

/**
 * Arma o fim da decisão. `ate` null (mesa solo): nada vence, mas uma vigia confere a presença e, se a mesa deixar de ser solo,
 * grava o prazo de 45 s no cartão (todos veem a barrinha) e arma o fim.
 */
function armarPrazo(campanhaId: number, mensagemId: number, ate: number | null) {
  clearTimeout(prazos.get(mensagemId));
  if (ate === null) {
    const vigia = setInterval(() => {
      const m = obterMensagem(mensagemId);
      const d = (m?.dados ?? {}) as Record<string, unknown>;
      const decisao = d.decisao as DecisaoDoTeste | undefined;
      if (!m || d.status !== "decidir" || !decisao) {
        clearInterval(vigia);
        prazos.delete(mensagemId);
        return;
      }
      if (decisao.ate !== null || mesaSolo(listarPresenca(campanhaId))) return;
      clearInterval(vigia);
      const novoAte = Date.now() + PRAZO_DECISAO_MS;
      const atualizada = atualizarMensagem(m.id, m.texto, { ...d, decisao: { ...decisao, ate: novoAte } });
      if (atualizada) publicar(campanhaId, { e: "mensagem_atualizada", mensagem: atualizada });
      armarPrazo(campanhaId, mensagemId, novoAte);
    }, VIGIA_SOLO_MS);
    prazos.set(mensagemId, vigia);
    return;
  }
  const t = setTimeout(
    () => {
      prazos.delete(mensagemId);
      try {
        decidirTeste(campanhaId, mensagemId, { rerrolar: false, sozinho: true });
      } catch (e) {
        console.warn("[taverna] prazo da decisão:", e);
      }
    },
    Math.max(0, ate - Date.now()),
  );
  prazos.set(mensagemId, t);
}

/** Fecha as decisões em aberto: as deste personagem (ele já mandou outra ação) e as vencidas (servidor reiniciado no meio). */
function aceitarDecisoes(campanhaId: number, personagemId: number | null, opcoes: { soVencidas?: boolean } = {}) {
  for (const m of testesPendentes(campanhaId)) {
    const d = (m.dados ?? {}) as { status?: string; personagemId?: number; decisao?: { ate?: number | null } };
    if (d.status !== "decidir") continue;
    const dele = personagemId !== null && (d.personagemId ?? m.personagemId) === personagemId;
    // ate null = mesa solo: só fecha quando o próprio personagem age
    const vencida = typeof d.decisao?.ate === "number" && d.decisao.ate < Date.now() - 1000;
    if (dele || vencida) decidirTeste(campanhaId, m.id, { rerrolar: false, sozinho: !dele });
  }
  // rerrolagens "depois" (sucesso discreto, mestre rolou na hora): qualquer ação nova fecha o botão (pergunta fora do jogo, não)
  if (opcoes.soVencidas) return;
  for (const m of listarMensagens(campanhaId).slice(-40)) {
    const d = (m.dados ?? {}) as Record<string, unknown>;
    const decisao = d.decisao as DecisaoDoTeste | undefined;
    if (m.tipo !== "dado" || !decisao || !(decisao.discreta || decisao.automatico) || d.status === "decidir") continue;
    fecharDecisaoDepois(campanhaId, m);
  }
}

/** Tira o botão de rerrolar "depois" do cartão (sem mexer no resultado). */
function fecharDecisaoDepois(campanhaId: number, m: Mensagem) {
  const resto = { ...((m.dados ?? {}) as Record<string, unknown>) };
  delete resto.decisao;
  const atualizada = atualizarMensagem(m.id, m.texto, resto);
  if (atualizada) publicar(campanhaId, { e: "mensagem_atualizada", mensagem: atualizada });
}

/** Quem pede a decisão pela rota: o aparelho (clienteId) e se ele é a máquina da taverna. */
export type QuemDecide = { clienteId: string; local: boolean };

function conferirDono(campanhaId: number, decisao: DecisaoDoTeste | undefined, quem: QuemDecide | undefined, personagemId: number | null) {
  if (!quem || !decisao) return;
  if (!podeDecidir(decisao, quem, listarPresenca(campanhaId), personagemId)) throw new Error("Quem decide este teste é o aparelho que rolou o dado.");
}

/**
 * Rerrolagem depois de o mestre já ter o resultado (sucesso discreto ou o mestre rolou na hora): aplica a opção, troca o cartão
 * e manda a correção ao mestre (ação interna §rerrolagem). Aceitar só tira o botão.
 */
function decidirDepois(
  campanhaId: number,
  m: Mensagem,
  escolha: { rerrolar: boolean; opcao?: string; dados?: number[] },
  quem: QuemDecide | undefined,
): ResultadoTeste | null {
  const dados = (m.dados ?? {}) as Record<string, unknown>;
  const decisao = dados.decisao as DecisaoDoTeste;
  if (!escolha.rerrolar) {
    fecharDecisaoDepois(campanhaId, m);
    return null;
  }
  if (decisao.ate !== null && decisao.ate < Date.now() - 1000) {
    fecharDecisaoDepois(campanhaId, m);
    throw new Error("O tempo para rerrolar este teste acabou.");
  }
  const p = m.personagemId ? obterPersonagem(m.personagemId) : null;
  const campanha = obterCampanha(campanhaId);
  if (!campanha || !p || p.campanhaId !== campanhaId) throw new Error("Esse teste não é desta mesa.");
  conferirDono(campanhaId, decisao, quem, p.id);
  const sistema = obterSistema(campanha.sistema);
  if (!sistema.aplicarDecisao) throw new Error("Este sistema não tem escolha depois do teste.");
  const pedido = dados.tipo === "pedido_teste";
  const antes = (pedido ? dados.resultado : dados) as ResultadoTeste;
  const id = escolha.opcao ?? decisao.opcoes[0]?.id;
  if (!id) throw new Error("Não há escolha para este teste.");
  abrirInstantaneo(campanhaId, capturarEstado(campanhaId));
  const feito = sistema.aplicarDecisao(p.ficha, antes, id, escolha.dados ? { dados: escolha.dados } : undefined);
  salvarFicha(p.id, feito.ficha);
  publicar(campanhaId, { e: "personagem", personagem: visivel(sistema, { ...p, ficha: feito.ficha }) });
  const r = feito.resultado;
  const texto = textoDoResultado(p.ficha.nome, r);
  const resto = { ...dados };
  delete resto.decisao;
  const novos: Record<string, unknown> = pedido ? { ...resto, resultado: r } : { ...(r as unknown as Record<string, unknown>) };
  // o resultado do sistema vem de `antes` (que ainda trazia a oferta): a decisão fecha aqui, nos dois caminhos
  delete novos.decisao;
  if (pedido && novos.resultado && typeof novos.resultado === "object") {
    const { decisao: _semDecisao, ...limpo } = novos.resultado as Record<string, unknown>;
    void _semDecisao;
    novos.resultado = limpo;
  }
  const atualizada = atualizarMensagem(m.id, texto, novos);
  if (atualizada) publicar(campanhaId, { e: "mensagem_atualizada", mensagem: atualizada });
  const autor = typeof dados.roladoPor === "string" ? dados.roladoPor : "";
  enviarAcao(campanhaId, { personagemId: p.id, autor, acao: `${RERROLAGEM}${texto}${feito.textoMestre ? ` — ${feito.textoMestre}` : ""}` });
  return r;
}

/**
 * O jogador decide o teste que está esperando: aceita o resultado ou escolhe a opção que o sistema ofereceu (Vampiro: gasta 1 de
 * Força de Vontade e rerrola até 3 dados normais; `dados` = índices escolhidos, sem eles o sistema escolhe os que falharam).
 * `opcao` é o id da opção; omitido, vale a primeira oferecida. Depois o resultado final vai para o mestre.
 * Aceitar um teste que já fechou é inofensivo (devolve null). `quem` vem da rota: só o dono da decisão (o aparelho que rolou,
 * ou a máquina da taverna com o dono fora da mesa) decide; o prazo do servidor não passa `quem`.
 */
export function decidirTeste(
  campanhaId: number,
  mensagemId: number,
  escolha: { rerrolar: boolean; opcao?: string; dados?: number[]; sozinho?: boolean },
  quem?: QuemDecide,
): ResultadoTeste | null {
  const m = obterMensagem(mensagemId);
  const dados = (m?.dados ?? {}) as Record<string, unknown>;
  // desfazer o turno no meio da decisão apaga o pedido: o prazo que sobrou não tem o que aceitar
  if (!m && !escolha.rerrolar) return null;
  if (!m) throw new Error("Esse teste não existe.");
  const aberta = dados.decisao as DecisaoDoTeste | undefined;
  if (aberta && (aberta.discreta || aberta.automatico) && dados.status !== "decidir") return decidirDepois(campanhaId, m, escolha, quem);
  if (dados.tipo !== "pedido_teste") throw new Error("Esse teste não existe.");
  const p = m.personagemId ? obterPersonagem(m.personagemId) : null;
  const campanha = obterCampanha(campanhaId);
  if (!campanha || !p || p.campanhaId !== campanhaId) throw new Error("Esse teste não é desta mesa.");
  if (dados.status !== "decidir") {
    if (!escolha.rerrolar) return null;
    throw new Error(dados.status === "resolvido" ? "Esse teste já foi decidido." : "Esse teste ainda não foi rolado.");
  }
  conferirDono(campanhaId, aberta, quem, p.id);

  let r = dados.resultado as ResultadoTeste;
  const sistema = obterSistema(campanha.sistema);
  let extra = "";
  if (escolha.rerrolar) {
    if (!sistema.aplicarDecisao) throw new Error("Este sistema não tem escolha depois do teste.");
    const oferecidas = (dados.decisao as { opcoes?: OpcaoDecisao[] } | undefined)?.opcoes;
    const id = escolha.opcao ?? oferecidas?.[0]?.id ?? sistema.decisoesAposTeste?.(p.ficha, r)[0]?.id;
    if (!id) throw new Error("Não há escolha para este teste.");
    // o sistema valida tudo de novo aqui (Vampiro: Força de Vontade atual, uma vez por teste, só dados normais); erro deixa a decisão aberta
    const feito = sistema.aplicarDecisao(p.ficha, r, id, escolha.dados ? { dados: escolha.dados } : undefined);
    r = feito.resultado;
    salvarFicha(p.id, feito.ficha);
    publicar(campanhaId, { e: "personagem", personagem: visivel(sistema, { ...p, ficha: feito.ficha }) });
    extra = feito.textoMestre;
  }
  clearTimeout(prazos.get(m.id));
  prazos.delete(m.id);

  const texto = textoDoResultado(p.ficha.nome, r);
  const resto = { ...dados };
  delete resto.decisao;
  const atualizada = atualizarMensagem(m.id, texto, { ...resto, status: "resolvido", resultado: r, ...(escolha.sozinho ? { aceitoSozinho: true } : {}) });
  if (atualizada) publicar(campanhaId, { e: "mensagem_atualizada", mensagem: atualizada });
  enviarResultado(campanhaId, p.id, typeof dados.roladoPor === "string" ? dados.roladoPor : "", texto, dados, r, extra);
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
  // desfazer um fim de sessão apaga o marcador: o contador da campanha volta junto
  sincronizarSessao(campanhaId);
  publicar(campanhaId, { e: "recarregar" });

  const abertura = inst.acoes.some((a) => a.acao === INICIO);
  if (opcoes.refazer) {
    for (const a of inst.acoes) enfileirarAcao(campanhaId, a);
    publicarEstado(campanhaId);
    agendar(campanhaId, true);
  }
  return {
    acoes: inst.acoes.filter((a) => a.acao !== INICIO && a.acao !== FIM_DE_SESSAO && !a.acao.startsWith(RESULTADO_TESTE)),
    abertura,
    restantes: contarInstantaneos(campanhaId),
  };
}

/**
 * Fechamento da noite em segundo plano (depois do marcador): o resumo passa a cobrir a noite inteira, até antes do marcador
 * (o marcador e o que vier depois ficam literais), e a recapitulação curta ("Anteriormente…", até 120 palavras) é gravada
 * em dados.recapitulacao do marcador, para o cartão da volta e para a primeira jogada da noite seguinte.
 */
async function fecharNoite(campanhaId: number, marcadorId: number) {
  let falha: unknown = null;
  try {
    await atualizarResumo(campanhaId, { ate: marcadorId });
  } catch (e) {
    falha = e;
  }
  try {
    const campanha = obterCampanha(campanhaId);
    const marcador = obterMensagem(marcadorId);
    if (campanha && marcador && ehFimDeSessao(marcador)) {
      const noite = noitesDaCampanha(campanhaId).find((n) => n.fimId === marcadorId);
      const daNoite = mensagensDepois(campanhaId, (noite?.inicioId ?? marcadorId) - 1).filter((m) => m.id < marcadorId);
      if (daNoite.some((m) => !foraDaTranscricao(m))) {
        const bruto = await provedorAtual().texto({
          sistema: SISTEMA_RECAPITULACAO,
          prompt: promptDaRecapitulacao(campanha.resumo, daNoite, listarPersonagens(campanhaId)),
        });
        const recapitulacao = limparRecapitulacao(bruto);
        // desfazer o fechamento no meio apaga o marcador: só grava se ele ainda existe
        const atual = obterMensagem(marcadorId);
        if (recapitulacao && atual && ehFimDeSessao(atual)) {
          const atualizada = atualizarMensagem(atual.id, atual.texto, { ...((atual.dados ?? {}) as Record<string, unknown>), recapitulacao });
          if (atualizada) publicar(campanhaId, { e: "mensagem_atualizada", mensagem: atualizada });
        }
      }
    }
  } catch (e) {
    console.warn("[taverna] recapitulação da noite falhou:", e);
    falha ??= e;
  }
  if (falha) throw falha;
}

async function atualizarResumo(campanhaId: number, opcoes: { ate?: number } = {}) {
  const campanha = obterCampanha(campanhaId);
  if (!campanha) return;
  const pendentes = mensagensDepois(campanhaId, campanha.resumoAte);
  let saindo: Mensagem[];
  if (opcoes.ate !== undefined) {
    // fim da noite: tudo antes do marcador sai, mesmo abaixo do limite (a noite fecha inteira no resumo)
    saindo = pendentes.filter((m) => m.id < opcoes.ate!);
    if (!saindo.some((m) => !foraDaTranscricao(m))) return;
  } else {
    if (pendentes.length <= LIMITE_SEM_RESUMO) return;
    saindo = pendentes.slice(0, pendentes.length - MANTER_LITERAIS);
  }
  const personagens = listarPersonagens(campanhaId);
  // o resumidor recebe o diário compacto: NPCs, lugares e status já estão lá e não se repetem no resumo (P174)
  const novo = await provedorAtual().texto({ sistema: SISTEMA_RESUMO, prompt: promptDoResumo(campanha.resumo, saindo, personagens, diarioParaResumo(campanhaId)) });
  if (!novo.trim()) return;
  // "Divergências" não fica no resumo: cada uma vira um recado discreto na mesa, para o jogador fixar o fato certo
  const { resumo, divergencias } = separarDivergencias(novo.trim());
  salvarResumo(campanhaId, resumo, saindo[saindo.length - 1].id);
  if (divergencias.length) {
    recadoDeSistema(campanhaId, `O diário e o resumo discordam: ${divergencias.slice(0, 3).map((d) => d.replace(/[.;\s]+$/, "")).join(" · ")}. Se for o caso, fixe o fato certo ou corrija o diário.`, "divergencia");
  }
}
