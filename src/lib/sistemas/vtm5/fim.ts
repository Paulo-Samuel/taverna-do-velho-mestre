import "server-only";
import type { Ficha, FimDeSessaoSistema } from "../tipos";
import { manchaDe } from "./testes";

// Fim da noite no Vampiro (campo `fimDeSessao` do contrato): o pedido do turno de encerramento usa estes passos no lugar do
// genérico. A mecânica do Remorso mora no REGRAS (HUMANIDADE); aqui só QUANDO chamar e o que entra no fechamento.

/** Quem precisa do teste de Remorso: personagens com Manchas. */
export function comManchas(fichas: Ficha[]): string[] {
  return fichas.filter((f) => manchaDe(f) > 0).map((f) => f.nome);
}

/** Texto de um extra (string ou lista) da ficha. */
function extra(f: Ficha, id: string): string {
  const v = f.extras[id];
  return (Array.isArray(v) ? v.map(String).filter(Boolean).join("; ") : typeof v === "string" ? v : "").trim();
}

/** "Vera — Ambição: ...; Convicções: ..." de quem tem algum dos dois (o motivo do XP fica concreto). */
export function motivosDeXp(fichas: Ficha[]): string[] {
  return fichas
    .map((f) => {
      const partes = [extra(f, "ambicao") ? `Ambição: ${extra(f, "ambicao")}` : "", extra(f, "conviccoes") ? `Convicções: ${extra(f, "conviccoes")}` : ""].filter(Boolean);
      return partes.length ? `${f.nome} — ${partes.join("; ")}` : "";
    })
    .filter(Boolean);
}

export const FIM_DE_SESSAO_VTM: FimDeSessaoSistema = {
  xp: "conceder_xp de 1 a 3 para cada personagem (XP é moeda que o jogador gasta na ficha; nunca suba Potência por isso), com o motivo tirado da noite inteira (bloco \"Nesta sessão\"): 1 pela noite jogada, +1 se perseguiu a Ambição ou pôs as Convicções à prova, +1 por missão concluída no diário desde o último fechamento; XP que já aparece como concedido nesta noite conta dentro desses 3",
  passosExtras(fichas) {
    const passos: string[] = [];
    const nomes = comManchas(fichas);
    // quem rolou o Remorso na tela (rota /remorso) já está sem Manchas e não aparece aqui; sobra o caminho "o mestre decide"
    if (nomes.length) passos.push(`teste_de_remorso para ${nomes.join(", ")} (tem Manchas); o resultado entra no fechamento (a consciência pesa ou cede)`);
    const motivos = motivosDeXp(fichas);
    if (motivos.length) passos.push(`para o motivo do XP, compare a noite com: ${motivos.join(" · ")}`);
    return passos;
  },
  xpMinimo: 1,
};
