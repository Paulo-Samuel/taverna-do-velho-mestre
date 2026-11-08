import "server-only";
import type { Ficha, FimDeSessaoSistema } from "../tipos";
import { manchaDe } from "./testes";

// Fim da noite no Vampiro (campo `fimDeSessao` do contrato): o pedido do turno de encerramento usa estes passos no lugar do
// genérico. A mecânica do Remorso mora no REGRAS (HUMANIDADE); aqui só QUANDO chamar e o que entra no fechamento.

/** Quem precisa do teste de Remorso: personagens com Manchas. */
export function comManchas(fichas: Ficha[]): string[] {
  return fichas.filter((f) => manchaDe(f) > 0).map((f) => f.nome);
}

export const FIM_DE_SESSAO_VTM: FimDeSessaoSistema = {
  xp: "conceder_xp de 1 a 3 para cada personagem, com o motivo: 1 pela noite jogada, +1 se perseguiu a Ambição ou pôs as Convicções à prova, +1 por uma cena memorável",
  passosExtras(fichas) {
    const nomes = comManchas(fichas);
    return nomes.length ? [`teste_de_remorso para ${nomes.join(", ")} (tem Manchas); o resultado entra no fechamento (a consciência pesa ou cede)`] : [];
  },
  xpMinimo: 1,
};
