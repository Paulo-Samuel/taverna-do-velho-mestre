"use client";

import { useEffect, useRef, useState } from "react";
import { salvarPreferenciasLeitor, useMenosMovimento, usePreferenciasLeitor, type ModoLeitura } from "./preferencias";
import { suportaRevelar } from "./use-revelar";

// Botão do cabeçalho das mesas: escolhe como ler a história ("📖 Cena a cena" ou "📜 Rolagem") e liga/desliga o texto se
// revelando aos poucos. Preferência deste navegador (localStorage).

function Icone({ modo }: { modo: ModoLeitura }) {
  return modo === "cenas" ? (
    // páginas de livro
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z" fill="currentColor" fillOpacity={0.15} />
      <path d="M12 6.5v13M15 10.5l2 1.5-2 1.5" />
    </svg>
  ) : (
    // pergaminho correndo
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 4h11a2 2 0 0 1 0 4H7M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 0-4H7" fill="currentColor" fillOpacity={0.12} />
      <path d="M9 11h6M9 13.5h4" />
    </svg>
  );
}

const OPCOES: [ModoLeitura, string, string, string][] = [
  ["cenas", "📖", "Cena a cena", "Uma cena por vez, em páginas. Nada de rolar."],
  ["rolagem", "📜", "Rolagem", "A conversa inteira numa coluna só, como antigamente."],
];

/** acima: o menu abre para cima (botão no pé de um painel); esquerda: alinhado pela esquerda do botão (botão no canto esquerdo). */
export function MenuLeitura({ className = "", acima = false, esquerda = false }: { className?: string; acima?: boolean; esquerda?: boolean }) {
  const { modo, animar } = usePreferenciasLeitor();
  const menos = useMenosMovimento();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const atual = OPCOES.find((o) => o[0] === modo) ?? OPCOES[0];
  return (
    <div ref={caixa} className={`relative shrink-0 ${className}`} data-menu-leitura>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={`Modo de leitura: ${atual[2]}`}
        title={`Modo de leitura: ${atual[2]}`}
        className={`flex h-10 min-w-10 items-center justify-center gap-1 rounded-md px-2 hover:bg-surface-2/60 hover:text-ambar focus-visible:outline-2 focus-visible:outline-ambar ${aberto ? "text-ambar" : "text-muted"}`}
      >
        <Icone modo={modo} />
      </button>
      {aberto && (
        <div role="dialog" aria-label="Modo de leitura" className={`cartao surgir bg-surface! absolute z-50 w-72 max-w-[calc(100vw-1rem)] p-3 text-foreground ${acima ? "bottom-full mb-2" : "top-full mt-2"} ${esquerda ? "left-0" : "right-0"}`}>
          <p className="titulo mb-2 text-sm text-ambar">Como ler a história</p>
          <div role="radiogroup" aria-label="Modo de leitura" className="space-y-1.5">
            {OPCOES.map(([id, emoji, nome, dica]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={modo === id}
                data-modo={id}
                onClick={() => {
                  salvarPreferenciasLeitor({ modo: id });
                  setAberto(false);
                }}
                className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition ${
                  modo === id ? "border-ambar/70 bg-ambar/10" : "border-border hover:border-ambar/50"
                }`}
              >
                <span aria-hidden className="text-lg leading-6">
                  {emoji}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{nome}</span>
                  <span className="block text-[11px] leading-snug text-muted">{dica}</span>
                </span>
              </button>
            ))}
          </div>
          <label className={`mt-3 flex items-start gap-2 border-t border-border pt-2.5 text-xs ${modo !== "cenas" ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              checked={animar && !menos}
              disabled={menos || modo !== "cenas"}
              onChange={(e) => salvarPreferenciasLeitor({ animar: e.target.checked })}
              className="mt-0.5 accent-ambar"
              data-animar
            />
            <span>
              Texto se revelando aos poucos
              <span className="block text-[11px] leading-snug text-muted">
                {menos
                  ? "Desligado: seu sistema pediu menos movimento."
                  : !suportaRevelar()
                    ? "Este navegador não sabe fazer o truque; o texto aparece inteiro."
                    : "Clique no texto, Espaço ou Enter mostram tudo de uma vez. O mestre finge que não se ofende."}
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
