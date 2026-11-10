"use client";

import { rotuloDaAtitude } from "@/lib/atitude-npc";
import { corDoNome } from "./cores";
import { MATIZ_ATITUDE, type PessoaPresente } from "./pessoas-presentes";
import { retratoDaEntrada } from "./retrato/dados";
import { RetratoSVG } from "./retrato/desenho";

/** Faixa "Pessoas por aqui": uma linha fina que rola dentro de si (a página não rola de lado); some quando não há ninguém. */
export function PessoasAqui({ pessoas, aoAbrir }: { pessoas: PessoaPresente[]; aoAbrir: (id: number) => void }) {
  if (!pessoas.length) return null;
  return (
    <section aria-labelledby="por-aqui-titulo" data-pessoas-aqui className="relative z-10 shrink-0 border-b border-border/30 bg-background/70 py-1">
      {/* a mesma coluna do cabeçalho (max-w-5xl): o rótulo alinha com o título da campanha */}
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 sm:px-4">
      <span id="por-aqui-titulo" className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Por aqui</span>
      {/* a borda direita esmaece: avisa que a lista continua para o lado; no celular, a folga vertical (compensada pela margem
          negativa: a faixa não cresce) guarda o alvo de toque dos chips dentro da área que rola */}
      <ul className="mx-0 -my-2 flex min-w-0 flex-1 list-none items-center gap-1.5 overflow-x-auto py-2 pl-0.5 pr-8 sm:-my-1 sm:py-1 [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] [scrollbar-width:thin]">
        {pessoas.map((p) => {
          const humor = p.atitude ? rotuloDaAtitude(p.atitude) : null;
          const matiz = p.atitude ? MATIZ_ATITUDE[p.atitude] : "";
          return (
            <li key={p.id} className="shrink-0 scroll-mx-8">
              <button
                type="button"
                onClick={() => aoAbrir(p.id)}
                className="relative flex items-center gap-1.5 rounded-full border border-border/70 bg-surface/70 py-0.5 pl-0.5 pr-2 before:absolute before:-inset-y-2 before:inset-x-0 hover:border-ambar/70 focus-visible:outline-2 focus-visible:outline-ambar sm:before:hidden"
                aria-label={`${p.titulo}${humor ? `, humor: ${humor}` : ""}. Abrir no códex`}
                title={`Abrir ${p.titulo} no códex`}
              >
                <RetratoSVG dados={retratoDaEntrada(p.entrada)} tamanho={24} className="shrink-0 rounded-full" decorativo />
                <span className="max-w-[9rem] truncate text-sm font-semibold" style={{ color: corDoNome(p.titulo) }}>
                  {p.titulo}
                </span>
                {humor && <span className={`${matiz ? `etiqueta-matiz ${matiz}` : "etiqueta"} px-1.5 py-0 text-[11px] font-semibold leading-4`}>{humor}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      </div>
    </section>
  );
}
