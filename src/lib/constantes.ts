// Compartilhado entre servidor e cliente.

/** Ação especial que pede ao mestre a cena de abertura. */
export const INICIO = "[início da campanha]";

/** Ação especial (rota /encerrar) que pede ao mestre o fechamento da noite: XP, Remorso, diário e o marcador de fim de sessão. */
export const FIM_DE_SESSAO = "[fim da sessão]";

/** Prefixo das ações internas que levam ao mestre o resultado de um teste rolado pelo jogador (não aparecem no chat). */
export const RESULTADO_TESTE = "§resultado:";
