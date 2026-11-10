"use client";

import { useState, type CSSProperties } from "react";
import { Icone } from "@/components/icones";
import { seloDoDesfecho, type EntradaSelo } from "./selo-desfecho";

// G17: os selos que ficam embaixo da ação do jogador: chip da perícia (cor do tipo de teste), selo do grau e, em d20,
// o selo do dado natural. A decisão do que mostrar é de selo-desfecho.ts (puro); aqui é só o desenho.
// O "carimbo" (selo-carimbar) só toca quando o grau chega com o cartão já na tela; histórico resolvido não anima.
// A animação é só transform/opacity: não muda a altura de nada (o leitor cena a cena pagina por altura).

const CSS = `
@keyframes selo-carimbar { from { transform: scale(1.25) rotate(-4deg); opacity: 0 } to { transform: none; opacity: 1 } }
.selo-carimbar { animation: selo-carimbar .22s cubic-bezier(.2,.8,.3,1) both }
@media (prefers-reduced-motion: reduce) { .selo-carimbar { animation: none } }
`;

const FORMA = "rounded border px-1.5 py-px text-[11px] leading-4";

/** Texto na cor do selo, borda a 55% e fundo a 10% sobre o fundo do tema: mantém o contraste até no vermelho da falha crítica. */
function tinta(cor: string | null, halo = false): CSSProperties | undefined {
  if (!cor) return undefined;
  return {
    color: cor,
    borderColor: `color-mix(in srgb, ${cor} 55%, transparent)`,
    background: `color-mix(in srgb, ${cor} 10%, var(--background))`,
    ...(halo ? { boxShadow: "0 0 14px -6px currentColor" } : null),
  };
}

export function SelosDaAcao({
  desfecho,
  compacto = false,
}: {
  desfecho: EntradaSelo;
  /** o chamador mostra os selos na mesma linha do nome (leitor cena a cena): a forma é a mesma, já é uma linha só */
  compacto?: boolean;
}) {
  const [nasceuRolando] = useState(() => desfecho.grau === null);
  const { chip, grau, natural, leitor } = seloDoDesfecho(desfecho);
  const carimbar = nasceuRolando && !grau.rolando ? " selo-carimbar" : "";

  return (
    <span className="relative inline-flex flex-wrap items-center gap-1.5" data-compacto={compacto || undefined}>
      <style href="taverna-selos" precedence="default">
        {CSS}
      </style>
      {/* nasceu "rolando…": a região viva já existe (calada, sem repetir o que o chip mostra) e a chegada do grau é dita uma vez;
          histórico já resolvido é texto comum, não anúncio */}
      {nasceuRolando ? (
        <>
          {grau.rolando && <span className="sr-only">{leitor}</span>}
          <span className="sr-only" role="status">
            {grau.rolando ? "" : leitor}
          </span>
        </>
      ) : (
        <span className="sr-only">{leitor}</span>
      )}
      <span aria-hidden title={chip.titulo ?? undefined} className={`${FORMA} font-medium ${chip.classe ?? "border-border/70 text-muted"}`}>
        {chip.texto}
      </span>
      {grau.rolando ? (
        <span aria-hidden className={`${FORMA} border-transparent font-semibold italic text-ambar`}>
          {grau.texto}
        </span>
      ) : (
        <span
          aria-hidden
          className={`${FORMA} inline-block font-semibold uppercase tracking-wide ${grau.cor ? "" : "border-border/70 text-foreground/85"}${carimbar}`}
          style={tinta(grau.cor, grau.critico)}
        >
          {grau.texto}
        </span>
      )}
      {natural && (
        <span aria-hidden className={`${FORMA} inline-flex items-center gap-1 font-semibold uppercase tracking-wide`} style={tinta(natural.cor)}>
          <Icone nome={natural.icone} />
          {natural.texto}
        </span>
      )}
    </span>
  );
}
