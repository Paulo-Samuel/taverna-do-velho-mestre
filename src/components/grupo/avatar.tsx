"use client";

import type { Mesa } from "@/lib/cliente/use-mesa";
import type { PersonagemVisivel } from "@/lib/mesa";
import type { Jogador } from "@/lib/tempo-real";
import { INICIO } from "@/lib/constantes";

// Peças compartilhadas do grupo: avatar com iniciais, cores por personagem, quem já agiu na rodada e quem está em uso em outro aparelho.

/** Cores fixas por posição no grupo, para reconhecer o personagem de relance no chip, no cartão e no chat. */
const CORES = [
  "bg-ambar/20 text-ambar border-ambar/50",
  "bg-sangue/25 text-[var(--grau-falha)] border-sangue/60",
  "bg-musgo/25 text-[var(--grau-sucesso)] border-musgo/60",
  "bg-pergaminho/15 text-pergaminho border-pergaminho/40",
];

export function corDe(mesa: Pick<Mesa, "personagens">, id: number): string {
  const i = mesa.personagens.findIndex((p) => p.id === id);
  return CORES[(i < 0 ? 0 : i) % CORES.length];
}

/** "Brunhilda de Ferro" → "BF"; "Zé" → "ZÉ". */
export function iniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p));
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return (partes[0] ?? nome).slice(0, 2).toUpperCase() || "?";
}

export function Avatar({ mesa, personagem, tamanho = "md" }: { mesa: Pick<Mesa, "personagens">; personagem: PersonagemVisivel; tamanho?: "sm" | "md" }) {
  const caido = personagem.ficha.pvMax > 0 && personagem.ficha.pv <= 0;
  const medida = tamanho === "sm" ? "h-6 w-6 text-[11px]" : "h-9 w-9 text-xs";
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full border font-semibold ${medida} ${corDe(mesa, personagem.id)} ${caido ? "opacity-50 grayscale" : ""}`}
    >
      {iniciais(personagem.ficha.nome)}
    </span>
  );
}

/** No modo rodada: ids de quem já tem ação na fila (a abertura da campanha não conta). */
export function quemAgiu(mesa: Pick<Mesa, "fila">): Set<number> {
  return new Set(mesa.fila.filter((a) => a.acao !== INICIO && a.personagemId !== null).map((a) => a.personagemId as number));
}

const mesmoNome = (a: string, b: string) => a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");

/**
 * Outro aparelho que está com este personagem agora: o que o tem como ativo ou, se o personagem tem dono, o aparelho do dono
 * conectado à mesa (desde que o dono não seja eu). null quando o personagem está livre para este aparelho.
 * Numa mesa mista (computador + celulares), é o que impede o hot-seat de passar a vez para quem está no celular do amigo.
 */
export function outroAparelhoCom(mesa: Pick<Mesa, "personagens" | "presenca" | "eu">, pid: number): Jogador | null {
  const outros = mesa.presenca.filter((j) => j.clienteId !== mesa.eu.clienteId);
  const usando = outros.find((j) => j.personagemId === pid);
  if (usando) return usando;
  const dono = mesa.personagens.find((p) => p.id === pid)?.jogador;
  if (!dono || mesmoNome(dono, mesa.eu.apelido)) return null;
  return outros.find((j) => mesmoNome(j.apelido, dono)) ?? null;
}

export function emUsoPorOutroAparelho(mesa: Pick<Mesa, "personagens" | "presenca" | "eu">, pid: number): boolean {
  return outroAparelhoCom(mesa, pid) !== null;
}

/** Onde está o outro aparelho, para os avisos: "no celular de Amigo", "no computador da taverna" ou, vendo daqui mesmo, "noutra janela desta máquina". */
export function ondeEsta(j: Jogador, euLocal: boolean): string {
  if (!j.local) return `no celular de ${j.apelido}`;
  return euLocal ? "noutra janela desta máquina" : "no computador da taverna";
}

/** Rótulo "Humano · Guerreiro · Nível 3" pelos dados públicos do sistema. */
export function resumoPersonagem(mesa: Pick<Mesa, "sistema">, p: PersonagemVisivel): string {
  const s = mesa.sistema;
  return [
    s.ancestralidades.find((a) => a.id === p.ficha.ancestralidade)?.nome,
    s.classes.find((c) => c.id === p.ficha.classe)?.nome,
    `${s.rotulos.nivel} ${p.ficha.nivel}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
