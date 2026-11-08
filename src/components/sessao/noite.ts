// Leitura pura das mensagens em torno do fim da noite (sem React): qual noite é, o que o Remorso e o XP já deram nela, se a
// noite acabou de ser encerrada, e o resumo do "Anteriormente" limpo de markdown. Usado pelo diálogo de encerrar
// (encerrar-noite.tsx), pelo cartão "Noite N encerrada" das duas mesas e pelo Anteriormente; testado em tests/fim-da-noite.test.ts.

import { FIM_DE_SESSAO, dividirNoites, noiteEmAndamento } from "@/lib/constantes";
import type { AcaoPendente, Mensagem } from "@/lib/db";

type Dados = Record<string, unknown>;

// ---------- o "fechando" da mesa (use-mesa.ts) ----------

/**
 * Próximo valor do `fechando` a cada evento de estado: liga com o FIM_DE_SESSAO na fila (ou com `fechando` vindo do servidor),
 * continua enquanto o mestre narra o fechamento (a fila já foi retirada) e desliga quando o mestre fica quieto sem o pedido na fila.
 */
export function proximoFechando(antes: boolean, ev: { ocupado: boolean; fila: Pick<AcaoPendente, "acao">[]; fechando?: boolean }): boolean {
  if (ev.fechando || ev.fila.some((a) => a.acao === FIM_DE_SESSAO)) return true;
  return antes && ev.ocupado;
}

// ---------- Reabrir a noite (acoes-turno.tsx) ----------

export type Desfeito = { acoes: { personagemId: number | null; autor: string; acao: string }[]; abertura: boolean; restantes: number };

/** O turno desfeito era o fechamento da noite. */
export const desfezFechamento = (r: Desfeito) => r.acoes.some((a) => a.acao === FIM_DE_SESSAO);

/** A ação que volta ao campo depois de desfazer: a do personagem ativo; sem ela, uma fala sem personagem (nunca o pedido interno de fechar a noite). */
export function acaoParaCampo(r: Desfeito, personagemId: number | null): string | null {
  const acoes = r.acoes.filter((a) => a.acao !== FIM_DE_SESSAO);
  return (acoes.find((a) => a.personagemId === personagemId) ?? acoes.find((a) => a.personagemId === null))?.acao ?? null;
}

/**
 * Aviso curto depois de desfazer/refazer. `fechamento`: a mesa sabe que desfez o turno do fim da noite (o servidor da W21
 * tira o pedido interno das `acoes` devolvidas, então só a mesa, que via o marcador, consegue dizer).
 */
export function avisoDoDesfeito(r: Desfeito, refazer: boolean, voltouAoCampo: boolean, fechamento = false): string {
  if (refazer) return "O mestre vai tentar de novo. Tomara que melhore.";
  if (fechamento || desfezFechamento(r)) return "Noite reaberta. O jogo continua de onde parou.";
  if (r.abertura) return "Abertura desfeita. A mesa voltou ao começo.";
  return voltouAoCampo ? "Turno desfeito. Pode reescrever." : "Turno desfeito.";
}

const dadosDe = (m: Mensagem): Dados => (m.dados ?? {}) as Dados;
const numero = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);

/** A mensagem é o marcador de fim da noite. */
export const ehFimDaNoite = (m: Mensagem) => m.tipo === "dado" && dadosDe(m).tipo === "fim_sessao";

/** Posição do último marcador de fim da noite (-1 sem nenhum). */
export function ultimoMarcador(mensagens: Mensagem[]): number {
  for (let i = mensagens.length - 1; i >= 0; i--) if (ehFimDaNoite(mensagens[i])) return i;
  return -1;
}

/**
 * O contador de noites que o servidor manda no estado da mesa (W21: `sessao`, que conta também o intervalo de 5 h sem
 * mensagem como noite fechada). Aceita o formato antigo em `campanha.sessao`; sem nenhum, null.
 */
export function sessaoDaMesa(mesa: { sessao?: unknown; campanha?: unknown }): number | null {
  return numero(mesa.sessao) ?? numero((mesa.campanha as { sessao?: unknown } | null | undefined)?.sessao);
}

/**
 * Número da noite que está sendo jogada: o maior entre o contador do servidor (sessaoDaMesa, que só se renova quando chega
 * um estado novo) e o último marcador + 1; sem nenhum dos dois, 1.
 */
export function noiteAtual(mensagens: Mensagem[], sessaoDaCampanha?: number | null): number {
  const i = ultimoMarcador(mensagens);
  const s = i >= 0 ? numero(dadosDe(mensagens[i]).sessao) : null;
  const campanha = typeof sessaoDaCampanha === "number" && sessaoDaCampanha > 0 ? sessaoDaCampanha : 0;
  // o relógio também fecha noites (intervalo de 5 h seguido de mensagem nova), como o servidor faz: o `sessao` carregado com a
  // mesa fica velho quando alguém volta a jogar depois da pausa sem recarregar
  const pelasMensagens = noiteEmAndamento(
    dividirNoites(
      mensagens.map((m) => {
        const d = dadosDe(m);
        return { id: m.id, criadaEm: m.criadaEm ?? "", tipo: m.tipo, dadosTipo: typeof d.tipo === "string" ? d.tipo : null, retroativo: d.retroativo === true };
      }),
    ),
  );
  return Math.max(campanha, s ? s + 1 : 1, pelasMensagens);
}

export type NoiteEncerrada = { id: number; sessao: number | null; data: string | null };

/**
 * A noite acabou de ser encerrada: há um marcador e, depois dele, ninguém agiu e o mestre não narrou (o cartão "Noite N
 * encerrada" fica no lugar do campo de ação até alguém escolher continuar).
 */
export function noiteEncerrada(mensagens: Mensagem[]): NoiteEncerrada | null {
  const i = ultimoMarcador(mensagens);
  if (i < 0) return null;
  if (mensagens.slice(i + 1).some((m) => m.tipo === "jogador" || m.tipo === "mestre")) return null;
  const d = dadosDe(mensagens[i]);
  return { id: mensagens[i].id, sessao: numero(d.sessao), data: typeof d.data === "string" ? d.data : null };
}

export type XpDaNoite = { mensagemId: number; personagem: string; ganho: number; motivo: string };

/** Linhas de XP (mensagem dado tipo "xp") a partir de uma posição. */
export function xpDesde(mensagens: Mensagem[], desde: number): XpDaNoite[] {
  const r: XpDaNoite[] = [];
  for (const m of mensagens.slice(Math.max(0, desde))) {
    const d = dadosDe(m);
    if (m.tipo !== "dado" || d.tipo !== "xp") continue;
    const ganho = numero(d.ganho) ?? numero(d.quantidade) ?? 0;
    r.push({ mensagemId: m.id, personagem: typeof d.personagem === "string" ? d.personagem : "", ganho, motivo: typeof d.motivo === "string" ? d.motivo : "" });
  }
  return r;
}

export type EstadoRemorso =
  | { tipo: "pendente"; mensagemId: number }
  | { tipo: "resolvido"; mensagemId: number; sucesso: boolean | null; rotulo: string | null };

const ehRemorso = (d: Dados) => /remorso/i.test(String(d.teste ?? "")) || d.vtm === "remorso";

/**
 * O teste de Remorso de um personagem desde uma posição (o último marcador): o pedido ainda esperando o dado, ou o
 * resultado (rolado pelo jogador no cartão, ou pelo mestre no modo automático). O mais recente vence.
 */
export function remorsoDesde(mensagens: Mensagem[], desde: number, personagemId: number, nome?: string): EstadoRemorso | null {
  let achado: EstadoRemorso | null = null;
  for (const m of mensagens.slice(Math.max(0, desde))) {
    if (m.tipo !== "dado") continue;
    const d = dadosDe(m);
    if (!ehRemorso(d)) continue;
    const pid = numero(d.personagemId) ?? m.personagemId;
    if (pid !== personagemId && !(pid == null && nome && d.personagem === nome)) continue;
    if (d.tipo === "pedido_teste") {
      if (d.status === "pendente" || d.status === "decidir") achado = { tipo: "pendente", mensagemId: m.id };
      else if (d.status === "resolvido") {
        const res = (d.resultado ?? {}) as Dados;
        achado = { tipo: "resolvido", mensagemId: m.id, sucesso: sucessoDe(res), rotulo: typeof res.rotuloGrau === "string" ? res.rotuloGrau : null };
      }
    } else if (d.tipo === "teste") {
      achado = { tipo: "resolvido", mensagemId: m.id, sucesso: sucessoDe(d), rotulo: typeof d.rotuloGrau === "string" ? d.rotuloGrau : null };
    }
  }
  return achado;
}

function sucessoDe(d: Dados): boolean | null {
  if (typeof d.sucesso === "boolean") return d.sucesso;
  if (typeof d.grau === "string") return d.grau.includes("sucesso") || d.grau === "critico";
  return null;
}

/** Chips da noite que acabou (entre o penúltimo e o último marcador): o XP de cada um e o Remorso. */
export function chipsDaNoite(mensagens: Mensagem[]): string[] {
  const fim = ultimoMarcador(mensagens);
  if (fim < 0) return [];
  const antes = ultimoMarcador(mensagens.slice(0, fim));
  const trecho = mensagens.slice(antes + 1, fim);
  const chips: string[] = [];
  const porNome = new Map<string, number>();
  for (const x of xpDesde(trecho, 0)) porNome.set(x.personagem, (porNome.get(x.personagem) ?? 0) + x.ganho);
  for (const [nome, ganho] of porNome) chips.push(`${nome ? `${nome}: ` : ""}+${ganho} XP`);
  for (const m of trecho) {
    const d = dadosDe(m);
    if (m.tipo !== "dado" || !ehRemorso(d)) continue;
    const res = d.tipo === "pedido_teste" ? ((d.resultado ?? null) as Dados | null) : d.tipo === "teste" ? d : null;
    if (!res || (d.tipo === "pedido_teste" && d.status !== "resolvido")) continue;
    const ok = sucessoDe(res);
    const nome = typeof d.personagem === "string" ? d.personagem : "";
    chips.push(`${nome ? `${nome}: ` : ""}Remorso ${ok === false ? "— Humanidade −1" : ok ? "— Humanidade mantida" : "rolado"}`);
  }
  return chips;
}

// ---------- resumo do Anteriormente ----------

/** Seções do resumo que valem a recapitulação (o resto — personagens, estado, inventário — fica no livro). */
const SECOES_UTEIS = /^(enredo|hist[óo]ria|trama|ganchos?|pontas soltas|pend[êe]ncias)\b/i;

export type BlocoResumo = { tipo: "paragrafo"; texto: string } | { tipo: "lista"; itens: string[] };

/** `ultimaMensagem` da rota do livro com ?formato=resumo: a W21 manda a mensagem ({ id, criadaEm, tipo }); antes, só o id. */
export type UltimaDoResumo = { id: number; criadaEm?: string; tipo?: string } | number | null;

/** Id da última mensagem que a rota do resumo devolveu (objeto ou número); sem id válido, null. */
export function idUltimaMensagem(u: UltimaDoResumo | undefined): number | null {
  if (typeof u === "number") return Number.isFinite(u) ? u : null;
  return u && typeof u.id === "number" && Number.isFinite(u.id) ? u.id : null;
}

/**
 * Tira o "Anteriormente…" do começo da recapitulação (o título do cartão já diz), mesmo com marcação, aspas ou travessão
 * antes e reticências, dois-pontos ou vírgula depois. Só a palavra de abertura: no meio do texto fica. O que sobra começa
 * com maiúscula ("você chegou…" vira "Você chegou…").
 */
export function semAnteriormente(texto: string): string {
  const t = texto.trim();
  const resto = t.replace(/^[\s*_#>"'“”‘’«»`~—–-]*anteriormente[\s*_"'“”‘’«»`]*(?:…|\.{2,}|[:,.;—–-])?[\s*_"'“”‘’«»`]*/i, "").trim();
  return resto === t ? t : resto.charAt(0).toLocaleUpperCase("pt-BR") + resto.slice(1);
}

/** Tira a marcação de markdown inline (negrito, itálico, código, links) e deixa só o texto. */
export function semMarkdown(t: string): string {
  return t
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * O resumo da campanha (markdown do mestre) para ler em 20 segundos: só as seções de enredo e ganchos (sem seções, o texto
 * inteiro), sem marcação, em parágrafos e listas, cortado em ~`limite` palavras. `cortado` diz se sobrou texto.
 */
export function resumoParaLeitura(texto: string, limite = 120): { blocos: BlocoResumo[]; cortado: boolean } {
  const linhas = texto.replace(/\r/g, "").split("\n");
  // separa por títulos (## Enredo, **Ganchos:**, "Enredo:")
  const secoes: { titulo: string | null; linhas: string[] }[] = [{ titulo: null, linhas: [] }];
  for (const l of linhas) {
    const titulo = /^\s*#{1,6}\s+(.+?)\s*#*\s*$/.exec(l)?.[1] ?? /^\s*\*\*([^*]+?)\*\*:?\s*$/.exec(l)?.[1] ?? null;
    if (titulo) secoes.push({ titulo: semMarkdown(titulo).replace(/:$/, ""), linhas: [] });
    else secoes[secoes.length - 1].linhas.push(l);
  }
  const comTitulo = secoes.filter((s) => s.titulo);
  const uteis = comTitulo.filter((s) => SECOES_UTEIS.test(s.titulo ?? ""));
  const escolhidas = uteis.length ? uteis : comTitulo.length ? [secoes[0], ...comTitulo].filter((s) => s.linhas.some((l) => l.trim())) : secoes;

  const blocos: BlocoResumo[] = [];
  let palavras = 0;
  let cortado = false;
  const cabe = (t: string): string | null => {
    if (palavras >= limite) {
      cortado = true;
      return null;
    }
    const ps = t.split(" ");
    if (palavras + ps.length <= limite) {
      palavras += ps.length;
      return t;
    }
    cortado = true;
    const resto = ps.slice(0, limite - palavras).join(" ");
    palavras = limite;
    return `${resto.replace(/[,;:.]$/, "")}…`;
  };
  for (const s of escolhidas) {
    let paragrafo: string[] = [];
    let lista: string[] | null = null;
    const fecharParagrafo = () => {
      const t = semMarkdown(paragrafo.join(" "));
      paragrafo = [];
      if (!t) return;
      const c = cabe(t);
      if (c) blocos.push({ tipo: "paragrafo", texto: c });
    };
    const fecharLista = () => {
      if (lista?.length) blocos.push({ tipo: "lista", itens: lista });
      lista = null;
    };
    for (const l of s.linhas) {
      const item = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/.exec(l)?.[1];
      if (item) {
        fecharParagrafo();
        const c = cabe(semMarkdown(item));
        if (c) (lista ??= []).push(c);
      } else if (!l.trim()) {
        fecharParagrafo();
        fecharLista();
      } else {
        fecharLista();
        paragrafo.push(l.trim());
      }
    }
    fecharParagrafo();
    fecharLista();
  }
  return { blocos, cortado };
}
