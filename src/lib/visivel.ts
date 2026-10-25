import "server-only";
import type { Personagem } from "./db";
import type { BlocoFicha, Sistema } from "./sistemas/tipos";

/** XP do nível atual e do próximo (null = por marcos ou nível máximo), para a barra de XP da ficha. */
export type ProgressoXp = { xpNivelAtual: number | null; xpProximoNivel: number | null };

/** Personagem com os blocos da ficha já calculados pelo sistema (o cliente não roda código de sistema). */
export type PersonagemVisivel = Personagem & { blocos: BlocoFicha[]; progresso: ProgressoXp | null };

export function visivel(sistema: Sistema, p: Personagem): PersonagemVisivel {
  let blocos: BlocoFicha[] = [];
  try {
    blocos = sistema.blocosFicha(p.ficha);
  } catch (e) {
    console.warn(`[taverna] blocosFicha falhou (${sistema.id}):`, e);
  }
  let progresso: ProgressoXp | null = null;
  try {
    const n = p.ficha.nivel;
    progresso = {
      xpNivelAtual: sistema.xpParaNivel(n, p.ficha),
      xpProximoNivel: n >= sistema.nivelMaximo ? null : sistema.xpParaNivel(n + 1, p.ficha),
    };
  } catch {
    // sistema sem tabela (ou ficha estranha): a ficha mostra só o XP acumulado
  }
  return { ...p, blocos, progresso };
}
