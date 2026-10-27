"use client";

import { useEffect, useRef } from "react";

// Atalhos de teclado das mesas (só quando o foco NÃO está num campo de texto):
// 1/2/3 escolhem a sugestão, R rola o teste pendente deste aparelho, / foca o campo de ação, Esc fecha, ? mostra a lista.
// A tecla C (códex do modo história) continua com a mesa-historia.

export type OpcoesAtalhos = {
  /** quantas sugestões estão à vista (0 desliga os números) */
  totalSugestoes: number;
  escolherSugestao: (indice: number) => void;
  /** rola o teste pendente; false quando não há nenhum */
  rolarTeste: () => boolean;
  focarCampo: () => void;
  /** Esc: fecha a ajuda e o que mais a mesa tiver aberto */
  fechar: () => void;
  alternarAjuda: () => void;
};

export function emCampoDeTexto(alvo: EventTarget | null): boolean {
  const el = alvo as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));
}

export function useAtalhos(opcoes: OpcoesAtalhos) {
  // o ouvinte é um só; as opções mudam a cada render e ficam no ref
  const ref = useRef(opcoes);
  useEffect(() => {
    ref.current = opcoes;
  });

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const o = ref.current;
      if (e.key === "Escape") {
        // Esc dentro de um campo também fecha (popover aberto por cima do campo)
        o.fechar();
        return;
      }
      if (emCampoDeTexto(e.target) || e.repeat) return;
      // dentro de um diálogo aberto (códex, convite...) as teclas são dele
      if ((e.target as HTMLElement | null)?.closest?.("[role=dialog][aria-modal=true]")) return;
      const k = e.key;
      if (/^[1-9]$/.test(k) && Number(k) <= o.totalSugestoes) {
        e.preventDefault();
        o.escolherSugestao(Number(k) - 1);
      } else if (k === "r" || k === "R") {
        if (o.rolarTeste()) e.preventDefault();
      } else if (k === "/") {
        e.preventDefault();
        o.focarCampo();
      } else if (k === "?") {
        e.preventDefault();
        o.alternarAjuda();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);
}

/** Clica no "Rolar o dado" do cartão de um pedido de teste (o cartão cuida da animação e da chamada). */
export function rolarPedido(mensagemId: number | null | undefined, rolarAte = true): boolean {
  if (!mensagemId) return false;
  const botao = document.querySelector<HTMLButtonElement>(`#pedido-${mensagemId} button[data-rolar]`);
  if (!botao || botao.disabled) return false;
  // no leitor cena a cena quem leva até o cartão é o leitor (scrollIntoView bagunçaria as páginas)
  if (rolarAte) botao.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  botao.click();
  return true;
}

const LISTA: [string, string][] = [
  ["1 2 3", "escolhe a sugestão do mestre"],
  ["R", "rola o teste que o mestre pediu"],
  ["/", "vai para o campo de ação"],
  ["Esc", "fecha painéis e janelas"],
  ["?", "mostra esta lista"],
];

/** Popover com a lista de atalhos ("?"). */
export function AjudaAtalhos({ aberta, aoFechar, extras = [] }: { aberta: boolean; aoFechar: () => void; extras?: [string, string][] }) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberta) return;
    caixa.current?.focus();
    const fora = (e: PointerEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) aoFechar();
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberta, aoFechar]);

  if (!aberta) return null;
  return (
    <div
      ref={caixa}
      tabIndex={-1}
      role="dialog"
      aria-label="Atalhos de teclado"
      data-atalhos
      className="cartao surgir bg-surface! fixed left-1/2 top-20 z-[60] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 p-4 text-foreground outline-none"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="titulo text-base text-ambar">Atalhos de teclado</p>
        <button type="button" onClick={aoFechar} className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Fechar">
          ✕
        </button>
      </div>
      <dl className="space-y-1.5 text-sm">
        {[...LISTA.slice(0, 3), ...extras, ...LISTA.slice(3)].map(([teclas, oque]) => (
          <div key={teclas} className="flex items-baseline gap-3">
            <dt className="flex w-24 shrink-0 gap-1">
              {teclas.split(" ").map((t) => (
                <kbd key={t} className="min-w-6 rounded border border-border bg-surface-2 px-1.5 text-center text-xs text-foreground">
                  {t}
                </kbd>
              ))}
            </dt>
            <dd className="text-muted">{oque}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] text-muted">Valem quando você não está digitando. O mestre não tem atalho para ser gentil.</p>
    </div>
  );
}
