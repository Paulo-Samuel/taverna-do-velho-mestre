"use client";

import { fonteGotica } from "./fonte-gotica";

// Cabeçalho de capítulo no meio da história: "LOCAL · MOMENTO" em caixa alta espaçada, o título em letra gótica e um fio embaixo.

export function CabecalhoCena({ titulo, local, momento }: { titulo?: string | null; local?: string | null; momento?: string | null }) {
  const linha = [local, momento].filter(Boolean).join(" · ");
  if (!titulo && !linha) return null;
  return (
    <header className="surgir pb-2 pt-8 first:pt-2">
      {linha && <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">{linha}</p>}
      {titulo && <h2 className={`${fonteGotica.className} mt-1.5 text-3xl leading-tight text-pergaminho sm:text-4xl`}>{titulo}</h2>}
      <div className="mt-3 h-px bg-linear-to-r from-ambar/50 via-border to-transparent" />
    </header>
  );
}
