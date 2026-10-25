"use client";

import type { Mesa } from "@/lib/cliente/use-mesa";
import type { PersonagemVisivel } from "@/lib/mesa";
import { INICIO } from "@/lib/constantes";

// Peças compartilhadas do grupo: avatar com iniciais, cores por personagem e quem já agiu na rodada.

/** Cores fixas por posição no grupo, para reconhecer o personagem de relance no chip, no cartão e no chat. */
const CORES = [
  "bg-ambar/20 text-ambar border-ambar/50",
  "bg-sangue/25 text-[#e98b7d] border-sangue/60",
  "bg-musgo/25 text-[#a9c48a] border-musgo/60",
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
  const medida = tamanho === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-xs";
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
