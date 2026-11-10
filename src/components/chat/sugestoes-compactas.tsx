"use client";

import { useEffect, useRef, useState } from "react";
import type { SugestaoAcao } from "@/lib/sistemas/tipos";
import { Icone } from "@/components/icones";
import { descricaoDoTeste, tipoDoTeste } from "@/components/historia/tipo-teste";

// Ações sugeridas pelo mestre no rodapé das duas mesas, sem engolir o palco.
// Desktop (tela larga E alta, variante `largo:` de globals.css): uma linha baixa por sugestão, com o número do atalho (1, 2, 3), o
// texto e a perícia; o texto inteiro fica no title.
// Celular ou tela baixa: uma linha só, "3 sugestões · Intimidação · Persuasão" com uma setinha para baixo, que abre a lista por cima do palco (o palco não encolhe).
// No leitor cena a cena elas ficam apagadinhas até a pessoa chegar ao fim da cena; aí entram uma a uma, com destaque.
// Apagadinhas = cada peça um tom abaixo (texto, borda e seta; o selo só perde saturação, porque opacidade o derrubaria
// abaixo de 4,5:1), sem filtro no bloco: o texto segue acima de 4,5:1.
// A entrada é o .surgir do globals.css (220 ms), com 40 ms de atraso por linha e teto de 160 ms: a última sugestão não fica
// esperando a fila. Com prefers-reduced-motion não há animação e as linhas já nascem cheias.
// Clicar numa sugestão envia a ação na hora.

/** O que o botão-resumo diz enquanto a cena ainda não acabou (title e nome acessível). */
const DICA_DISCRETAS = "Sugestões do mestre: dá para escolher antes de terminar a cena";

export function SugestoesCompactas({
  sugestoes,
  aoEscolher,
  discretas = false,
  desabilitado = false,
}: {
  sugestoes: SugestaoAcao[];
  aoEscolher: (texto: string) => void;
  /** leitor cena a cena: a pessoa ainda não chegou ao fim da cena (apagadinhas, mas clicáveis e legíveis; o tom baixa por peça, não no bloco) */
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
      className="relative"
      data-sugestoes={discretas ? "discretas" : "destaque"}
    >
      {/* celular ou tela baixa: uma linha que abre a lista por cima */}
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        aria-controls="lista-sugestoes"
        title={discretas ? DICA_DISCRETAS : undefined}
        aria-label={discretas ? `${sugestoes.length} ${sugestoes.length === 1 ? "sugestão" : "sugestões"}${pericias.length > 0 ? ` · ${pericias.join(" · ")}` : ""}. ${DICA_DISCRETAS}` : undefined}
        className={`surgir flex min-h-10 w-full items-center gap-2 rounded-lg border bg-surface/60 px-3 text-left text-sm focus-visible:border-ambar focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ambar largo:hidden ${discretas ? "border-border/40" : "border-border/70"}`}
      >
        <span className={`shrink-0 ${discretas ? "text-muted" : "text-ambar"}`} aria-hidden>
          <Icone nome="arrowRight" />
        </span>
        <span className={`shrink-0 ${discretas ? "text-foreground/75" : "text-foreground/90"}`}>
          {sugestoes.length} {sugestoes.length === 1 ? "sugestão" : "sugestões"}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-foreground/70">{pericias.length > 0 && `· ${pericias.join(" · ")}`}</span>
        <span className={`shrink-0 text-xs text-muted transition-transform motion-reduce:transition-none ${aberta ? "rotate-180" : ""}`} aria-hidden>
          <Icone nome="chevronDown" />
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
          <li key={`${entrada}-${i}-${s.texto}`} className="surgir" style={{ animationDelay: `${Math.min(i, 4) * 40}ms` }}>
            <button
              type="button"
              onClick={() => escolher(s.texto)}
              disabled={desabilitado}
              title={s.texto}
              className={`group flex min-h-11 w-full items-center gap-2.5 rounded-md border bg-surface/45 px-2.5 py-1.5 text-left text-[0.95rem] transition hover:border-ambar/60 hover:bg-surface-2/80 focus-visible:border-ambar focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ambar disabled:opacity-50 largo:h-7 largo:min-h-0 largo:py-0 largo:text-[0.9rem] ${discretas ? "border-border/40" : "border-border/45"}`}
            >
              {/* número do atalho de teclado (1, 2, 3); no toque vira só a seta */}
              <kbd
                className="hidden size-[18px] shrink-0 place-items-center rounded border border-border/80 font-sans text-[11px] leading-none text-muted transition group-hover:border-ambar/60 group-hover:text-ambar [@media(pointer:fine)]:grid"
                aria-hidden
              >
                {i + 1}
              </kbd>
              <span className={`shrink-0 [@media(pointer:fine)]:hidden ${discretas ? "text-muted" : "text-ambar/80"}`} aria-hidden>
                <Icone nome="arrowRight" />
              </span>
              <span className={`min-w-0 flex-1 leading-snug group-hover:text-foreground group-focus-visible:text-foreground largo:truncate ${discretas ? "text-foreground/75" : "text-foreground/85"}`}>{s.texto}</span>
              <Teste pericia={s.pericia} discreta={discretas} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Tipo de teste da sugestão: o texto da perícia mais um selo com o tipo (em texto, a cor nunca é a única pista).
// O selo é a plaquinha do matiz do tipo (tipo-teste.ts), encolhida para caber na linha de 28px.
// Sem perícia, nada; perícia que não se reconhece fica como era (itálico discreto), sem tipo inventado.
function Teste({ pericia, discreta = false }: { pericia?: string; discreta?: boolean }) {
  if (!pericia) return null;
  const info = tipoDoTeste(pericia);
  if (!info) return <span className="shrink-0 text-xs italic text-muted group-hover:text-ambar/90">{pericia}</span>;
  return (
    <span className="flex max-w-[45%] shrink-0 items-center gap-1.5 text-xs">
      <span className="sr-only">{descricaoDoTeste(pericia, info)}</span>
      {info.tipo !== "semrolagem" && (
        <span className="truncate pr-0.5 italic text-muted group-hover:text-ambar/90" aria-hidden>
          {pericia}
        </span>
      )}
      <span
        className={`${info.classe} px-1.5 py-0 text-[11px] leading-4 shrink-0 whitespace-nowrap ${discreta ? "saturate-50 group-hover:saturate-100 group-focus-visible:saturate-100" : ""}`}
        aria-hidden
      >
        {info.rotulo}
      </span>
    </span>
  );
}
