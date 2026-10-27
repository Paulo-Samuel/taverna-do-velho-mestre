import "server-only";
import type { Aventura, AventuraPublica } from "./tipos";
import { FANTASIA } from "./fantasia";
import { HISTORIA } from "./historia";
import { OUTROS } from "./outros";
import { PATHFINDER } from "./pathfinder";
import { VAMPIRO } from "./vampiro";

// Aventuras prontas: missões iniciais escritas para cada sistema, para começar sem pensar. A campanha nasce com cenário,
// tom e config.aventura = id; o roteiro secreto entra no prompt do mestre (mestre/prompt.ts) e nunca vai para o navegador.

export type { Aventura, AventuraPublica } from "./tipos";

export const AVENTURAS: Aventura[] = [...VAMPIRO, ...PATHFINDER, ...FANTASIA, ...OUTROS, ...HISTORIA];

export function obterAventura(id: unknown): Aventura | null {
  return typeof id === "string" && id ? (AVENTURAS.find((a) => a.id === id) ?? null) : null;
}

/** A aventura só vale se existe e roda no sistema da campanha (id adulterado ou de outro sistema cai fora). */
export function aventuraDoSistema(id: unknown, sistemaId: string): Aventura | null {
  const a = obterAventura(id);
  return a && a.sistemas.includes(sistemaId) ? a : null;
}

export const aventurasDoSistema = (sistemaId: string) => AVENTURAS.filter((a) => a.sistemas.includes(sistemaId));

export function aventuraPublica(a: Aventura): AventuraPublica {
  const { id, sistemas, titulo, chamada, duracao, recomendado, tom, cenario } = a;
  return { id, sistemas, titulo, chamada, duracao, ...(recomendado ? { recomendado } : {}), tom, cenario };
}

/** Lista pública (para as páginas mandarem ao navegador), de um sistema ou de todos. */
export function aventurasPublicas(sistemaId?: string): AventuraPublica[] {
  return (sistemaId ? aventurasDoSistema(sistemaId) : AVENTURAS).map(aventuraPublica);
}

/**
 * Roteiro compacto para o prompt do mestre (entra em todo turno: cada caractere conta). A cena de abertura só vai junto
 * enquanto a campanha está começando (`comAbertura`); depois ela já virou narração e só ocuparia espaço.
 */
export function roteiroParaMestre(a: Aventura, comAbertura = true): string {
  const r = a.roteiro;
  const ficha = [a.duracao, a.recomendado].filter(Boolean).join("; ");
  return [
    `"${a.titulo}" (${ficha}). Conduza como arco curto até um dos finais; se o grupo mudar o rumo, adapte em vez de puxar de volta. NPCs agem mesmo sem o grupo.`,
    comAbertura ? `- Abertura (no [início da campanha], narre a partir desta cena): ${a.abertura}` : "",
    `- Verdade: ${r.verdade}`,
    `- NPCs (segredo só se revela em cena):\n${r.npcs.map((n) => `  - ${n.nome}, ${n.quem}. Voz: ${n.voz}. Quer: ${n.quer}. Segredo: ${n.segredo}`).join("\n")}`,
    `- Locais: ${r.locais.map((l) => `${l.nome} (${l.texto})`).join("; ")}`,
    `- Pistas (nenhuma é a única porta; perdeu uma, outra aparece):\n${r.pistas.map((p) => `  - ${p}`).join("\n")}`,
    `- Reviravoltas: ${r.reviravoltas.map((t, i) => `${i + 1}) ${t}`).join(" ")}`,
    `- Relógio (avança quando o grupo enrola ou falha feio): ${r.relogio.map((t, i) => `${i + 1}. ${t}`).join(" ")}`,
    `- Finais: ${r.finais.join(" | ")}`,
    `- Recompensas: ${r.recompensas}`,
  ]
    .filter(Boolean)
    .join("\n");
}
