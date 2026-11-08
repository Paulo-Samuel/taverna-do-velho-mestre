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
