"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { Chip, GrupoChips } from "./cena";

// "O que mudou na cena": as linhas de ficha, diário e XP do turno numa faixa de chips no fim da cena, por personagem
// ("Samuel: Fome 1 → 2 · +1 Mancha"). Chips discretos na cor do tema; o detalhe (o motivo que o mestre deu) aparece ao passar o
// mouse, focar ou tocar, num balão preso à tela (fora das colunas do leitor, que cortam o que vaza).

type Aberto = { chave: string; texto: string; x: number; y: number; abaixo: boolean; fixo: boolean; alvo: HTMLElement };

const LARGURA_BALAO = 288;

export function Mudancas({ grupos, corDe, className = "" }: { grupos: GrupoChips[]; corDe?: (nome: string) => string | undefined; className?: string }) {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const id = useId();

  // balão aberto por toque/clique: fecha com Esc, clique fora, rolagem ou mudança de tamanho
  useEffect(() => {
    if (!aberto) return;
    const fechar = () => setAberto(null);
    const fora = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.("[data-chip]")) fechar();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", fechar);
    window.addEventListener("scroll", fechar, true);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", fechar);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [aberto]);

  if (!grupos.length) return null;

  function abrir(el: HTMLElement, c: Chip, fixo: boolean) {
    const r = el.getBoundingClientRect();
    const abaixo = r.top < 120;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - LARGURA_BALAO / 2), window.innerWidth - LARGURA_BALAO - 8);
    // dentro da raiz do tema (as cores vêm de [data-tema]); position: fixed escapa das colunas do leitor
    const alvo = el.closest<HTMLElement>("[data-tema]") ?? document.body;
    // acima do chip: preso pelo "bottom" (o transform fica livre para a animação de entrada)
    setAberto({ chave: c.chave, texto: c.detalhe, x, y: abaixo ? r.bottom + 8 : window.innerHeight - r.top + 8, abaixo, fixo, alvo });
  }

  return (
    <section className={`leitor-mudancas ${className}`} aria-label="O que mudou na cena" data-mudancas>
      <p className="leitor-mudancas-titulo">O que mudou na cena</p>
      <div className="leitor-mudancas-grupos">
        {grupos.map((g) => {
          const cor = g.tipo === "personagem" ? corDe?.(g.quem) : undefined;
          return (
            <div key={`${g.tipo}:${g.quem}`} className="leitor-mudancas-grupo" data-grupo={g.tipo}>
              <span className={`leitor-mudancas-quem ${g.tipo !== "personagem" ? "leitor-mudancas-quem-outro" : ""}`} style={cor ? { color: cor } : undefined}>
                {g.quem}
              </span>
              {g.chips.map((c) => {
                const este = aberto?.chave === `${g.quem}:${c.chave}`;
                const chip = { ...c, chave: `${g.quem}:${c.chave}` };
                return (
                  <button
                    key={c.chave}
                    type="button"
                    className={`leitor-chip leitor-chip-${c.tom}`}
                    aria-describedby={este ? `${id}-balao` : undefined}
                    aria-expanded={este}
                    aria-label={`${c.rotulo}: ${c.detalhe}`}
                    data-chip
                    onClick={(e) => (este && aberto?.fixo ? setAberto(null) : abrir(e.currentTarget, chip, true))}
                    onMouseEnter={(e) => {
                      if (!aberto?.fixo && window.matchMedia("(hover: hover)").matches) abrir(e.currentTarget, chip, false);
                    }}
                    onMouseLeave={() => {
                      if (!aberto?.fixo) setAberto(null);
                    }}
                    onFocus={(e) => {
                      if (!aberto?.fixo && e.currentTarget.matches(":focus-visible")) abrir(e.currentTarget, chip, false);
                    }}
                    onBlur={() => {
                      if (!aberto?.fixo) setAberto(null);
                    }}
                  >
                    <span aria-hidden className="leitor-chip-icone">
                      {c.icone}
                    </span>
                    <span className={c.riscado ? "line-through decoration-current/50" : ""}>{c.rotulo}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      {aberto &&
        createPortal(
          <div
            id={`${id}-balao`}
            role="tooltip"
            className="leitor-chip-balao surgir"
            style={{ left: aberto.x, width: LARGURA_BALAO, ...(aberto.abaixo ? { top: aberto.y } : { bottom: aberto.y }) }}
          >
            {aberto.texto}
          </div>,
          aberto.alvo,
        )}
    </section>
  );
}
