import "server-only";
import { executoresCena } from "./cena";
import { extensoesDe, type ContextoFerramentas, type Executor } from "./contexto";
import { executoresDiario } from "./diario";
import { executoresFicha } from "./ficha";
import { executoresTestes } from "./testes";

// Despacho pelo nome: núcleo primeiro, depois as extensões que valem para o sistema da mesa.

const NUCLEO: Record<string, Executor> = { ...executoresTestes, ...executoresFicha, ...executoresCena, ...executoresDiario };

/** Executa uma ferramenta pelo nome. Devolve o que volta para o modelo; lança Error com mensagem amigável em entrada inválida. */
export async function executarFerramenta(ctx: ContextoFerramentas, nome: string, entradaBruta: unknown): Promise<unknown> {
  const executor = Object.hasOwn(NUCLEO, nome) ? NUCLEO[nome] : extensoesDe(ctx.sistema).find((e) => e.executores && Object.hasOwn(e.executores, nome))?.executores?.[nome];
  if (!executor) throw new Error(`Ferramenta desconhecida: ${nome}`);
  return executor(ctx, entradaBruta);
}
