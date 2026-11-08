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
  type Mensagem,
} from "../db";
import { FIM_DE_SESSAO, INICIO, RESULTADO_TESTE } from "../constantes";
import { obterSistema } from "../sistemas";
import type { OpcaoDecisao, ResultadoTeste } from "../sistemas/tipos";
import { publicar } from "../tempo-real";
import { visivel } from "../visivel";
import { arremateRedundante } from "./arremate";
import { definirFerramentas, executarFerramenta, type ContextoFerramentas } from "./ferramentas";
import { LIMITE_SEM_RESUMO, MANTER_LITERAIS } from "./memoria";
import { encerrarTurno, enderecoInterno, registrarTurno } from "./ponte";
import { ErroDoMestre, traduzirErro } from "./erros-api";
import {
  diarioParaResumo,
  fimDeSessao,
  medirPrompt,
  nomeDoPersonagem,
  promptDeContinuacao,
  promptDoResumo,
  promptDoTurno,
  promptEmBlocos,
  separarDivergencias,
  SISTEMA_RESUMO,
  transcricao,
  type AcaoDoTurno,
  type FimDeSessao,
  type MedidaPrompt,
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
  // quem estava decidindo uma rerrolagem e mandou outra ação aceitou o resultado (e decisões vencidas fecham aqui também)
  if (!acao.acao.startsWith(RESULTADO_TESTE)) aceitarDecisoes(campanhaId, acao.personagemId);
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

/** config.sessao é só um espelho para a interface; a verdade são os marcadores "fim_sessao" no chat (desfazer os apaga). */
type ConfigComSessao = ConfigCampanha & { sessao?: number };

const ehFimDeSessao = (m: Mensagem) => m.tipo === "dado" && (m.dados as { tipo?: string } | null)?.tipo === "fim_sessao";

/** Número da sessão em andamento: marcadores de fim já gravados + 1. */
export function sessaoAtual(campanhaId: number): number {
  return listarMensagens(campanhaId).filter(ehFimDeSessao).length + 1;
}

function sincronizarSessao(campanhaId: number) {
  const c = obterCampanha(campanhaId);
  if (!c) return;
  const sessao = sessaoAtual(campanhaId);
  if (((c.config as ConfigComSessao).sessao ?? 1) === sessao) return;
  const config: ConfigComSessao = { ...c.config, sessao };
  atualizarCampanha(campanhaId, { config });
}

/** Na primeira jogada depois de um fim de sessão o mestre abre com "Anteriormente…": o último marcador vem depois do último texto dele. */
function depoisDoFimDeSessao(mensagens: Mensagem[]): boolean {
  for (let i = mensagens.length - 1; i >= 0; i--) {
    if (ehFimDeSessao(mensagens[i])) return true;
    if (mensagens[i].tipo === "mestre") return false;
  }
  return false;
}

/**
 * Encerra a noite: enfileira a ação interna FIM_DE_SESSAO (fechamento, XP, Remorso, diário e o marcador no chat).
 * Recusa (erro com a mensagem para o jogador) se o mestre está narrando, se há teste esperando ou ações na fila.
 */
export function encerrarSessao(campanhaId: number): { sessao: number } {
  if (execucao(campanhaId).ocupado) throw new Error("O mestre ainda está narrando. Espere ele terminar.");
  if (testesPendentes(campanhaId).length) throw new Error("Há um teste esperando ser rolado (ou decidido). Resolva antes de encerrar a noite.");
  const fila = listarFila(campanhaId);
  if (fila.some((a) => a.acao === FIM_DE_SESSAO)) throw new Error("A noite já está sendo encerrada.");
  if (fila.length) throw new Error("Há ações esperando o mestre. Deixe ele responder antes de encerrar a noite.");
  const mensagens = listarMensagens(campanhaId);
  if (!mensagens.some((m) => m.tipo === "mestre")) throw new Error("A aventura ainda não começou.");
  if (depoisDoFimDeSessao(mensagens)) throw new Error("Esta noite já foi encerrada. Jogue a próxima sessão antes de encerrar de novo.");
  const sessao = sessaoAtual(campanhaId);
  enviarAcao(campanhaId, { personagemId: null, autor: "", acao: FIM_DE_SESSAO });
  return { sessao };
}

/** Grava o marcador de capítulo (mensagem "dado" com dados.tipo "fim_sessao") e avança o contador da campanha. */
function marcarFimDeSessao(campanhaId: number) {
  const sessao = sessaoAtual(campanhaId);
  const data = new Date().toISOString();
  const rotulo = `Fim da sessão ${sessao}`;
  const mensagem = adicionarMensagem(campanhaId, "dado", rotulo, { dados: { tipo: "fim_sessao", sessao, data, rotulo, resumo: rotulo } });
  publicar(campanhaId, { e: "mensagem", mensagem });
  sincronizarSessao(campanhaId);
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
    testePendente: testesPendentes(campanhaId).length > 0,
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
  if (mestreIndisponivel()) return;
  ex.resumo = atualizarResumo(campanhaId)
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
  const recentes = mensagensDepois(campanhaId, campanha.resumoAte);

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
  for (const a of acoes.filter((x) => x.acao !== INICIO && x.acao !== FIM_DE_SESSAO)) {
    // resultado de teste rolado pelo jogador: o cartão do dado já está no chat, vai só para o mestre
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
  // primeira jogada depois de "Encerrar a noite": o mestre recapitula antes de responder
  const recapitular = !inicio && !fim && !soForaDoJogo && doTurno.length > 0 && depoisDoFimDeSessao(recentes);
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
  const executar = async (nome: string, entrada: unknown) => {
    ferramentasUsadas++;
    nomesUsados.push(nome);
    try {
      if (fim && FORA_DO_FIM.includes(nome)) throw new Error("A noite está sendo encerrada: sem testes nem sugestões. Termine o fechamento.");
      return await executarFerramenta(ctx, nome, entrada);
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
  const pedidoFim: FimDeSessao | null = fim ? fimDeSessao(sistema, sessaoAtual(campanhaId), personagens.map((p) => p.ficha)) : null;

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
      `[taverna] ${provedor.id}: turno em ${uso.rodadas} rodada${uso.rodadas === 1 ? "" : "s"} (mesa ${campanhaId}) · entrada ${uso.entrada} · cache lido ${uso.cacheLido} · cache escrito ${uso.cacheEscrito} · saída ${uso.saida}`,
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
  if (fim && concluido) marcarFimDeSessao(campanhaId);
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
    // opções próprias do sistema guardadas no pedido (Vampiro: custo de Despertar do poder)
    ...(dados.opcoes && typeof dados.opcoes === "object" ? { opcoes: dados.opcoes as Record<string, unknown> } : {}),
  });
  const texto = textoDoResultado(p.ficha.nome, r);
  // decisão do jogador depois do dado, se o sistema oferecer (Vampiro: falhou e ainda há Força de Vontade → rerrolar?):
  // o cartão pergunta antes de o mestre saber e aceita sozinho no prazo
  let opcoesDecisao: OpcaoDecisao[] = [];
  try {
    opcoesDecisao = sistema.decisoesAposTeste?.(p.ficha, r) ?? [];
  } catch (e) {
    console.warn(`[taverna] decisoesAposTeste falhou (${sistema.id}):`, e);
  }
  const decidir = opcoesDecisao.length > 0;
  const ate = Date.now() + PRAZO_DECISAO_MS;
  // desfazer o turno que esta rolagem vai disparar devolve o teste para "pendente"
  abrirInstantaneo(campanhaId, capturarEstado(campanhaId));
  const atualizada = atualizarMensagem(m.id, texto, {
    ...dados,
    status: decidir ? "decidir" : "resolvido",
    resultado: r,
    roladoPor: autor || null,
    ...(decidir ? { decisao: { ate, campanhaId, opcoes: opcoesDecisao } } : {}),
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

  if (decidir) {
    armarPrazo(campanhaId, m.id, ate);
    return r;
  }
  enviarResultado(campanhaId, p.id, autor, texto, dados, r);
  return r;
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

/** Quanto tempo o cartão espera o jogador decidir antes de aceitar o resultado sozinho. */
export const PRAZO_DECISAO_MS = 20_000;

const gd = globalThis as unknown as { __tavernaPrazos?: Map<number, ReturnType<typeof setTimeout>> };
const prazos = (gd.__tavernaPrazos ??= new Map());

function armarPrazo(campanhaId: number, mensagemId: number, ate: number) {
  clearTimeout(prazos.get(mensagemId));
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
function aceitarDecisoes(campanhaId: number, personagemId: number | null) {
  for (const m of testesPendentes(campanhaId)) {
    const d = (m.dados ?? {}) as { status?: string; personagemId?: number; decisao?: { ate?: number } };
    if (d.status !== "decidir") continue;
    const dele = personagemId !== null && (d.personagemId ?? m.personagemId) === personagemId;
    if (dele || (d.decisao?.ate ?? 0) < Date.now() - 1000) decidirTeste(campanhaId, m.id, { rerrolar: false, sozinho: !dele });
  }
}

/**
 * O jogador decide o teste que está esperando: aceita o resultado ou escolhe a opção que o sistema ofereceu (Vampiro: gasta 1 de
 * Força de Vontade e rerrola até 3 dados normais; `dados` = índices escolhidos, sem eles o sistema escolhe os que falharam).
 * `opcao` é o id da opção; omitido, vale a primeira oferecida. Depois o resultado final vai para o mestre.
 * Aceitar um teste que já fechou é inofensivo (devolve null): o prazo do servidor e o do navegador podem chegar juntos.
 */
export function decidirTeste(
  campanhaId: number,
  mensagemId: number,
  escolha: { rerrolar: boolean; opcao?: string; dados?: number[]; sozinho?: boolean },
): ResultadoTeste | null {
  const m = obterMensagem(mensagemId);
  const dados = (m?.dados ?? {}) as Record<string, unknown>;
  // desfazer o turno no meio da decisão apaga o pedido: o prazo que sobrou não tem o que aceitar
  if (!m && !escolha.rerrolar) return null;
  if (!m || dados.tipo !== "pedido_teste") throw new Error("Esse teste não existe.");
  const p = m.personagemId ? obterPersonagem(m.personagemId) : null;
  const campanha = obterCampanha(campanhaId);
  if (!campanha || !p || p.campanhaId !== campanhaId) throw new Error("Esse teste não é desta mesa.");
  if (dados.status !== "decidir") {
    if (!escolha.rerrolar) return null;
    throw new Error(dados.status === "resolvido" ? "Esse teste já foi decidido." : "Esse teste ainda não foi rolado.");
  }

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

async function atualizarResumo(campanhaId: number) {
  const campanha = obterCampanha(campanhaId);
  if (!campanha) return;
  const pendentes = mensagensDepois(campanhaId, campanha.resumoAte);
  if (pendentes.length <= LIMITE_SEM_RESUMO) return;
  const saindo = pendentes.slice(0, pendentes.length - MANTER_LITERAIS);
  const personagens = listarPersonagens(campanhaId);
  // o resumidor recebe o diário compacto: NPCs, lugares e status já estão lá e não se repetem no resumo (P174)
  const novo = await provedorAtual().texto({ sistema: SISTEMA_RESUMO, prompt: promptDoResumo(campanha.resumo, saindo, personagens, diarioParaResumo(campanhaId)) });
  if (!novo.trim()) return;
  // "Divergências" não fica no resumo: cada uma vira um recado discreto na mesa, para o jogador fixar o fato certo
  const { resumo, divergencias } = separarDivergencias(novo.trim());
  salvarResumo(campanhaId, resumo, saindo[saindo.length - 1].id);
  if (divergencias.length) {
    recadoDeSistema(campanhaId, `O diário e o resumo discordam: ${divergencias.slice(0, 3).join(" · ")}. Se for o caso, fixe o fato certo ou corrija o diário.`, "divergencia");
  }
}
