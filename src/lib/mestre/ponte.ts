import "server-only";
import { randomBytes } from "node:crypto";
import type { DefFerramenta } from "./tipos";

// Ponte entre o servidor MCP (processo filho do Claude Code) e o turno em andamento aqui no app.
// Cada turno registra suas ferramentas sob um token aleatório; a rota /api/interno/ferramentas atende só tokens vivos.

type Registro = { ferramentas: DefFerramenta[]; executar: (nome: string, entrada: unknown) => Promise<unknown> };

const g = globalThis as unknown as { __tavernaPonte?: { turnos: Map<string, Registro>; base: string | null } };
const estado = (g.__tavernaPonte ??= { turnos: new Map(), base: null });

export function registrarTurno(registro: Registro): string {
  const token = randomBytes(24).toString("hex");
  estado.turnos.set(token, registro);
  return token;
}

export function encerrarTurno(token: string) {
  estado.turnos.delete(token);
}

export function turnoDoToken(token: string | null | undefined): Registro | null {
  return (token && estado.turnos.get(token)) || null;
}

/** Guarda a porta em que o app está atendendo (descoberta na primeira requisição). */
export function lembrarEndereco(urlDaRequisicao: string) {
  const u = new URL(urlDaRequisicao);
  estado.base = `http://127.0.0.1:${u.port || (u.protocol === "https:" ? "443" : "80")}`;
}

export function enderecoInterno(): string {
  return estado.base ?? `http://127.0.0.1:${process.env.PORT || 3300}`;
}
