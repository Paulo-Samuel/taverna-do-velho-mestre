"use client";

import type { Ficha } from "@/lib/sistemas/tipos";
import { gerarRetrato, normalizarRetrato, type DadosRetrato } from "./retrato/dados";
import { RetratoSVG } from "./retrato/desenho";

// Retrato ilustrado do personagem, pintado em SVG a partir de ficha.extras.retrato.
// Sem retrato salvo, gera um a partir do nome e da classe (sempre o mesmo para o mesmo nome: o espelho não mente duas vezes).

export { gerarRetrato, normalizarRetrato, RetratoSVG };
export type { DadosRetrato };

export function Retrato({ ficha, tamanho = 48, className }: { ficha: Pick<Ficha, "nome" | "classe" | "extras">; tamanho?: number; className?: string }) {
  const extras = ficha.extras ?? {};
  const dados =
    normalizarRetrato(extras.retrato) ??
    gerarRetrato(`${ficha.nome}|${ficha.classe}`, {
      classe: ficha.classe || undefined,
      sexo: typeof extras.sexo === "string" ? extras.sexo : undefined,
    });
  return <RetratoSVG dados={dados} tamanho={tamanho} className={className} titulo={`Retrato de ${ficha.nome}`} />;
}
