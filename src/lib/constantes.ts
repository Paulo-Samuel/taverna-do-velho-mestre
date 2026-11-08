// Compartilhado entre servidor e cliente.

/** Ação especial que pede ao mestre a cena de abertura. */
export const INICIO = "[início da campanha]";

/** Ação especial (rota /encerrar) que pede ao mestre o fechamento da noite: XP, Remorso, diário e o marcador de fim de sessão. */
export const FIM_DE_SESSAO = "[fim da sessão]";

/** Prefixo das ações internas que levam ao mestre o resultado de um teste rolado pelo jogador (não aparecem no chat). */
export const RESULTADO_TESTE = "§resultado:";

/**
 * Ação interna de rerrolagem DEPOIS de o mestre já ter narrado o teste (sucesso discreto, ou o mestre rolou na hora): o mestre
 * corrige a narração. Começa com RESULTADO_TESTE de propósito, para valer tudo o que vale para ele (fora do chat, fila pronta).
 */
export const RERROLAGEM = `${RESULTADO_TESTE}§rerrolagem:`;

// ---------- noites (sessões de jogo) ----------

/**
 * Intervalo sem mensagem nenhuma que fecha uma noite de jogo mesmo sem "Encerrar a noite" (o jeito real de jogar: ninguém
 * lembra do botão). 5 h separa a noite de sexta da de sábado; uma tarde e uma noite no mesmo dia, com 5 h ou mais de folga,
 * contam como duas noites (de propósito: a recapitulação ajuda nos dois casos).
 */
export const PAUSA_NOITE_MS = 5 * 60 * 60 * 1000;

/** Uma noite de jogo: fechada por um marcador fim_sessao ("Encerrar a noite") ou inferida por um intervalo >= PAUSA_NOITE_MS. */
export type Noite = {
  numero: number;
  /** primeira e última mensagem da noite */
  inicioId: number;
  fimId: number;
  /** datas das duas mensagens (UTC do SQLite: "2026-10-26 23:40:00") */
  inicio: string;
  fim: string;
  /** a noite já terminou (marcador ou intervalo); a última noite fica aberta enquanto ninguém encerra nem some por 5 h */
  fechada: boolean;
  /** fechada pelo marcador "fim_sessao" (o botão); false = inferida pelo relógio ou ainda aberta */
  fechadaPeloBotao: boolean;
};

/** O mínimo de uma mensagem para dividir as noites (as linhas do banco já trazem isso). */
export type MensagemDaNoite = { id: number; criadaEm: string; tipo: string; dadosTipo?: string | null; retroativo?: boolean };

/** Data do SQLite ("2026-10-26 23:40:00", UTC sem fuso) ou ISO em milissegundos; NaN quando não dá para ler. */
export function msDaData(data: string): number {
  const t = data.trim();
  if (!t) return NaN;
  const iso = t.includes("T") ? t : t.replace(" ", "T");
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

const ehMarcador = (m: MensagemDaNoite) => m.tipo === "dado" && m.dadosTipo === "fim_sessao";

/**
 * Divide as mensagens (em ordem de id) em noites: cada marcador fim_sessao fecha a noite em que está; um intervalo de
 * `pausaMs` ou mais entre duas mensagens seguidas fecha a noite antes dele. Exceção: o fechamento retroativo (Encerrar
 * depois do intervalo, sem jogada nova) fica na noite que ele fecha, não abre uma noite nova.
 */
export function dividirNoites(mensagens: MensagemDaNoite[], pausaMs = PAUSA_NOITE_MS): Noite[] {
  const noites: Noite[] = [];
  let atual: Noite | null = null;
  const fechar = (pelBotao: boolean) => {
    if (!atual) return;
    atual.fechada = true;
    atual.fechadaPeloBotao = pelBotao;
    noites.push(atual);
    atual = null;
  };
  for (let i = 0; i < mensagens.length; i++) {
    const m = mensagens[i];
    const anterior = i > 0 ? mensagens[i - 1] : null;
    if (atual && anterior && msDaData(m.criadaEm) - msDaData(anterior.criadaEm) >= pausaMs && !fechamentoRetroativo(mensagens, i)) fechar(false);
    if (!atual) atual = { numero: noites.length + 1, inicioId: m.id, fimId: m.id, inicio: m.criadaEm, fim: m.criadaEm, fechada: false, fechadaPeloBotao: false };
    const a: Noite = atual;
    a.fimId = m.id;
    a.fim = m.criadaEm;
    if (ehMarcador(m)) fechar(true);
  }
  if (atual) noites.push(atual);
  return noites;
}

/** Depois do intervalo em `i` só vem o fechamento (nenhuma jogada) até um marcador retroativo. */
function fechamentoRetroativo(mensagens: MensagemDaNoite[], i: number): boolean {
  for (let j = i; j < mensagens.length; j++) {
    const m = mensagens[j];
    if (ehMarcador(m)) return Boolean(m.retroativo);
    if (m.tipo === "jogador") return false;
  }
  return false;
}

/** Número da noite em andamento: noites já fechadas + 1. */
export function noiteEmAndamento(noites: Noite[]): number {
  return noites.filter((n) => n.fechada).length + 1;
}

// ---------- decisão depois do teste (rerrolar com Força de Vontade, Ponto de Herói, Inspiração) ----------

/** Mesa com mais de um aparelho: quanto tempo o cartão espera antes de ficar com o resultado sozinho. Mesa solo não tem prazo. */
export const PRAZO_DECISAO_MS = 45_000;

/** Rerrolagem oferecida num sucesso comum: o mestre já narra, e o botão fica à vista por este tempo, discreto. */
export const PRAZO_DISCRETO_MS = 8_000;

/** O que o cartão guarda em `dados.decisao` enquanto espera o jogador (o servidor é quem fecha). */
export type DecisaoDoTeste = {
  /** quando o servidor fica com o resultado sozinho; null = mesa solo, espera sem prazo */
  ate: number | null;
  /** aparelho que rolou (dono da decisão); null = o mestre rolou na hora (vale o aparelho com o personagem) */
  clienteId: string | null;
  campanhaId: number;
  opcoes: { id: string; rotulo: string; custo?: string; dados?: { max: number; elegiveis: number[]; padrao?: number[] } }[];
  /** sucesso comum: o mestre já está narrando; rerrolar agora manda uma correção (§rerrolagem) */
  discreta?: boolean;
  /** o mestre rolou na hora (modo automático): rerrolar manda uma correção (§rerrolagem) */
  automatico?: boolean;
};

/** Pausa o teste para o jogador decidir: falhou, é perigoso, é ataque ou tem oposição (margem vira dano). Senão, discreta. */
export function pausaDecisao(r: { sucesso: boolean; teste?: string; ataque?: unknown; oposicao?: unknown }, perigoso = false): boolean {
  return !r.sucesso || perigoso || Boolean(r.ataque) || Boolean(r.oposicao) || /^(ataque|atacar|attack)/i.test(r.teste ?? "");
}

type Presente = { clienteId: string; personagemId: number | null; local?: boolean };

/** Mesa solo: no máximo um aparelho conectado e um personagem em uso. */
export function mesaSolo(presenca: Presente[]): boolean {
  const aparelhos = new Set(presenca.map((j) => j.clienteId));
  const personagens = new Set(presenca.map((j) => j.personagemId).filter((p) => p !== null));
  return aparelhos.size <= 1 && personagens.size <= 1;
}

/** O aparelho dono da decisão: quem rolou, ou (o mestre rolou) quem está com o personagem agora. */
export function donoDaDecisao(decisao: Pick<DecisaoDoTeste, "clienteId">, presenca: Presente[], personagemId: number | null): string | null {
  if (decisao.clienteId) return decisao.clienteId;
  return presenca.find((j) => personagemId !== null && j.personagemId === personagemId)?.clienteId ?? null;
}

/**
 * Este aparelho decide? O dono decide; com o dono fora da mesa, decide a máquina da taverna (ou o único aparelho que sobrou).
 * Quem só assiste vê o cartão sem botões.
 */
export function podeDecidir(
  decisao: Pick<DecisaoDoTeste, "clienteId">,
  eu: { clienteId: string; local: boolean },
  presenca: Presente[],
  personagemId: number | null,
): boolean {
  if (!eu.clienteId) return false;
  const dono = donoDaDecisao(decisao, presenca, personagemId);
  if (dono === eu.clienteId) return true;
  if (dono && presenca.some((j) => j.clienteId === dono)) return false;
  return eu.local || presenca.filter((j) => j.clienteId !== eu.clienteId).length === 0;
}
