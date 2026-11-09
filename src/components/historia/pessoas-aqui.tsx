"use client";

import { rotuloDaAtitude } from "@/lib/atitude-npc";
import { corDoNome } from "./cores";
import { COR_ATITUDE, type PessoaPresente } from "./pessoas-presentes";
import { retratoDaEntrada } from "./retrato/dados";
import { RetratoSVG } from "./retrato/desenho";

/** Faixa "Pessoas por aqui": uma linha fina que rola dentro de si (a página não rola de lado); some quando não há ninguém. */
export function PessoasAqui({ pessoas, aoAbrir }: { pessoas: PessoaPresente[]; aoAbrir: (id: number) => void }) {
  if (!pessoas.length) return null;
  return (
    <nav aria-label="Pessoas por aqui" data-pessoas-aqui className="relative z-10 flex shrink-0 items-center gap-2 border-b border-border/30 bg-background/70 px-3 py-1 sm:px-4">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Por aqui</span>
      <ul className="m-0 flex min-w-0 flex-1 list-none items-center gap-1.5 overflow-x-auto p-0 [scrollbar-width:thin]">
        {pessoas.map((p) => {
          const humor = p.atitude ? rotuloDaAtitude(p.atitude) : null;
          const cor = p.atitude ? COR_ATITUDE[p.atitude] : null;
          return (
            <li key={p.id} className="shrink-0">
              <button
                type="button"
                onClick={() => aoAbrir(p.id)}
                className="flex items-center gap-1.5 rounded-full border border-border/70 bg-surface/70 py-0.5 pl-0.5 pr-2 hover:border-ambar/70 focus-visible:outline-2 focus-visible:outline-ambar"
                title={`Abrir ${p.titulo} no códex`}
              >
                <RetratoSVG dados={retratoDaEntrada(p.entrada)} tamanho={24} className="shrink-0 rounded-full" titulo={`Retrato de ${p.titulo}`} />
                <span className="max-w-[9rem] truncate text-sm font-semibold" style={{ color: corDoNome(p.titulo) }}>
                  {p.titulo}
                </span>
                {humor && cor && (
                  <span className="rounded-full px-1.5 text-[11px] font-semibold leading-4" style={{ backgroundColor: cor.fundo, color: cor.texto }}>
                    {humor}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
