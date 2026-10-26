"use client";

import { useState } from "react";
import type { SugestaoAcao } from "@/lib/sistemas/tipos";

// Ações sugeridas pelo mestre no rodapé da mesa avançada, sem engolir a tela.
// Celular: uma linha "3 sugestões · Intimidação · Persuasão…" que abre a lista inteira ao tocar.
// Desktop: a lista sempre à vista, uma linha por sugestão (o texto inteiro aparece no foco e no title).
// Clicar numa sugestão envia a ação na hora, como antes.

export function SugestoesCompactas({ sugestoes, aoEscolher }: { sugestoes: SugestaoAcao[]; aoEscolher: (texto: string) => void }) {
  const [aberta, setAberta] = useState(false);
  const pericias = [...new Set(sugestoes.map((s) => s.pericia).filter(Boolean))] as string[];
  return (
    <div className="surgir mb-2">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        aria-controls="lista-sugestoes"
        className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-border/80 bg-surface/70 px-3 text-left text-sm focus-visible:border-ambar focus-visible:outline-none sm:hidden"
      >
        <span className="shrink-0 text-ambar" aria-hidden>
          ➶
        </span>
        <span className="shrink-0 text-foreground/90">
          {sugestoes.length} {sugestoes.length === 1 ? "sugestão" : "sugestões"}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted">{pericias.length > 0 && `· ${pericias.join(" · ")}`}</span>
        <span className={`shrink-0 text-xs text-muted transition-transform motion-reduce:transition-none ${aberta ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      <ul id="lista-sugestoes" className={`${aberta ? "mt-1.5 block" : "hidden"} space-y-1 sm:mt-0 sm:block`} aria-label="Ações sugeridas pelo mestre">
        {sugestoes.map((s, i) => (
          <li key={`${i}-${s.texto}`}>
            <button
              type="button"
              onClick={() => aoEscolher(s.texto)}
              title={s.texto}
              className="group flex min-h-10 w-full items-center gap-2.5 rounded-lg border border-border/70 bg-surface/60 px-3 py-1.5 text-left text-sm transition hover:border-ambar/70 hover:bg-surface-2 focus-visible:border-ambar focus-visible:outline-none sm:min-h-9 sm:py-1"
            >
              <span className="shrink-0 text-ambar/80 transition group-hover:translate-x-0.5 group-hover:text-ambar motion-reduce:transition-none" aria-hidden>
                ➶
              </span>
              <span className="min-w-0 flex-1 leading-snug text-foreground/90 group-hover:text-foreground sm:truncate sm:group-focus-visible:whitespace-normal">
                {s.texto}
              </span>
              {s.pericia && <span className="shrink-0 rounded-full border border-border/80 px-2 text-[11px] leading-5 text-muted">{s.pericia}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
