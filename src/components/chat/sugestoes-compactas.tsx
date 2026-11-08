"use client";

import { useEffect, useRef, useState } from "react";
import type { SugestaoAcao } from "@/lib/sistemas/tipos";

// Ações sugeridas pelo mestre no rodapé das duas mesas, sem engolir o palco.
// Desktop (tela larga E alta, variante `largo:` de globals.css): uma linha baixa por sugestão, com o número do atalho (1, 2, 3), o
// texto e a perícia; o texto inteiro fica no title.
// Celular ou tela baixa: uma linha só, "3 sugestões · Intimidação · Persuasão ▾", que abre a lista por cima do palco (o palco não encolhe).
// No leitor cena a cena elas ficam apagadinhas até a pessoa chegar ao fim da cena; aí entram uma a uma, com destaque.
// Clicar numa sugestão envia a ação na hora.

const CSS = `
@keyframes sugestao-entrar{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.sugestao-entrar{animation:sugestao-entrar .4s cubic-bezier(.2,.7,.25,1) both}
@media (prefers-reduced-motion:reduce){.sugestao-entrar{animation:none}}
`;

export function SugestoesCompactas({
  sugestoes,
  aoEscolher,
  discretas = false,
  desabilitado = false,
}: {
  sugestoes: SugestaoAcao[];
  aoEscolher: (texto: string) => void;
  /** leitor cena a cena: a pessoa ainda não chegou ao fim da cena (apagadinhas, mas clicáveis; por filtro, porque a entrada prende a opacidade) */
  discretas?: boolean;
  desabilitado?: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  // chegou ao fim da cena: as linhas entram de novo, uma a uma (a chave muda e elas remontam)
  const [entrada, setEntrada] = useState(0);
  const [eraDiscreta, setEraDiscreta] = useState(discretas);
  if (eraDiscreta !== discretas) {
    setEraDiscreta(discretas);
    if (!discretas) setEntrada((n) => n + 1);
  }
  const pericias = [...new Set(sugestoes.map((s) => s.pericia).filter(Boolean))] as string[];

  // a lista do celular fecha ao tocar fora ou com Esc
  useEffect(() => {
    if (!aberta) return;
    const fora = (e: PointerEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberta(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberta]);

  const escolher = (t: string) => {
    setAberta(false);
    aoEscolher(t);
  };

  return (
    <div
      ref={caixa}
      className={`relative transition-[filter] duration-500 motion-reduce:transition-none ${discretas ? "brightness-[.62] saturate-50 hover:brightness-100 hover:saturate-100 focus-within:brightness-100 focus-within:saturate-100" : ""}`}
      data-sugestoes={discretas ? "discretas" : "destaque"}
    >
      <style href="taverna-sugestoes" precedence="default">
        {CSS}
      </style>
      {/* celular ou tela baixa: uma linha que abre a lista por cima */}
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        aria-controls="lista-sugestoes"
        className="sugestao-entrar flex min-h-10 w-full items-center gap-2 rounded-lg border border-border/70 bg-surface/60 px-3 text-left text-sm focus-visible:border-ambar focus-visible:outline-none largo:hidden"
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
      <ul
        id="lista-sugestoes"
        className={`${
          aberta ? "cartao bg-surface! absolute inset-x-0 bottom-full z-30 mb-2 block space-y-1 p-1.5" : "hidden"
        } largo:static largo:z-auto largo:mb-0 largo:block largo:space-y-[3px] largo:rounded-none largo:border-0 largo:bg-transparent! largo:p-0 largo:shadow-none`}
        aria-label="Ações sugeridas pelo mestre"
      >
        {sugestoes.map((s, i) => (
          <li key={`${entrada}-${i}-${s.texto}`} className="sugestao-entrar" style={{ animationDelay: `${i * 70}ms` }}>
            <button
              type="button"
              onClick={() => escolher(s.texto)}
              disabled={desabilitado}
              title={s.texto}
              className="group flex min-h-11 w-full items-center gap-2.5 rounded-md border border-border/45 bg-surface/45 px-2.5 py-1.5 text-left text-[0.95rem] transition hover:border-ambar/60 hover:bg-surface-2/80 focus-visible:border-ambar focus-visible:outline-none disabled:opacity-50 largo:h-7 largo:min-h-0 largo:py-0 largo:text-[0.9rem]"
            >
              {/* número do atalho de teclado (1, 2, 3); no toque vira só a seta */}
              <kbd
                className="hidden size-[18px] shrink-0 place-items-center rounded border border-border/80 font-sans text-[11px] leading-none text-muted transition group-hover:border-ambar/60 group-hover:text-ambar [@media(pointer:fine)]:grid"
                aria-hidden
              >
                {i + 1}
              </kbd>
              <span className="shrink-0 text-ambar/80 [@media(pointer:fine)]:hidden" aria-hidden>
                ➶
              </span>
              <span className="min-w-0 flex-1 leading-snug text-foreground/85 group-hover:text-foreground largo:truncate">{s.texto}</span>
              {s.pericia && <span className="shrink-0 text-xs italic text-muted group-hover:text-ambar/90">{s.pericia}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
