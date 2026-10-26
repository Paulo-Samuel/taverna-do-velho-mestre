"use client";

import { useRef, useState, type ReactNode } from "react";
import type { SugestaoAcao } from "@/lib/sistemas/tipos";

// Rodapé da mesa do modo história: as ações que o mestre sugeriu (lista vertical clicável) e o campo
// "Ou escreva sua própria ação…". Enter envia; Shift+Enter quebra a linha.

/** As ações sugeridas pelo mestre, como opções clicáveis (usada também na mesa avançada). */
export function ListaSugestoes({
  sugestoes,
  desabilitado,
  aoEscolher,
}: {
  sugestoes: SugestaoAcao[];
  desabilitado?: boolean;
  aoEscolher: (texto: string) => void;
}) {
  return (
    <ul className="surgir mb-2 space-y-1.5" aria-label="Ações sugeridas">
      {sugestoes.map((s, i) => (
        <li key={`${i}-${s.texto}`}>
          <button
            type="button"
            disabled={desabilitado}
            onClick={() => aoEscolher(s.texto)}
            className="group flex min-h-11 w-full items-center gap-3 rounded-lg border border-border/80 bg-surface/70 px-3 py-1.5 text-left text-[0.95rem] sm:py-2 sm:text-base transition hover:border-ambar/70 hover:bg-surface-2 focus-visible:border-ambar focus-visible:outline-none disabled:opacity-50"
          >
            <span className="shrink-0 text-ambar/80 transition group-hover:translate-x-0.5 group-hover:text-ambar motion-reduce:transition-none" aria-hidden>
              ➶
            </span>
            <span className="min-w-0 flex-1 leading-snug text-foreground/90 group-hover:text-foreground">{s.texto}</span>
            {s.pericia && <span className="shrink-0 text-xs text-muted">{s.pericia}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function PainelAcao({
  sugestoes,
  mostrarSugestoes,
  bloqueio,
  aoIrParaBloqueio,
  placeholder,
  rotuloCampo,
  enviar,
  topo,
  campoRef,
}: {
  sugestoes: SugestaoAcao[];
  mostrarSugestoes: boolean;
  /** motivo para não deixar agir agora ("Role o dado primeiro"); null libera */
  bloqueio: string | null;
  aoIrParaBloqueio?: () => void;
  placeholder: string;
  rotuloCampo: string;
  enviar: (texto: string) => Promise<boolean>;
  /** linha acima do campo (personagem ativo, estado do mestre) */
  topo?: ReactNode;
  campoRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const proprio = useRef<HTMLTextAreaElement>(null);
  const campo = campoRef ?? proprio;

  async function mandar(t: string, limpar: boolean) {
    const limpo = t.trim();
    if (!limpo || enviando || bloqueio) return;
    setEnviando(true);
    try {
      if ((await enviar(limpo)) && limpar) setTexto("");
    } finally {
      setEnviando(false);
    }
  }

  const ver = mostrarSugestoes && !bloqueio && sugestoes.length > 0;

  return (
    <div>
      {ver && <ListaSugestoes sugestoes={sugestoes} desabilitado={enviando} aoEscolher={(t) => void mandar(t, false)} />}

      {topo}

      {bloqueio ? (
        // a barra inteira leva ao dado (alvo grande no celular); sem destino, é só o aviso
        aoIrParaBloqueio ? (
          <button
            type="button"
            onClick={aoIrParaBloqueio}
            className="surgir group flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-ambar/60 bg-ambar/10 px-3 py-2 text-left text-sm shadow-[0_0_24px_-12px_var(--ambar)] transition hover:border-ambar hover:bg-ambar/15 focus-visible:border-ambar focus-visible:outline-none"
          >
            <span className="min-w-0 text-ambar">
              <span aria-hidden>🎲 </span>
              {bloqueio}
            </span>
            <span className="shrink-0 rounded-md bg-ambar px-3 py-1.5 text-xs font-semibold text-[#1a120c] transition group-hover:bg-[#f0b762]">
              Ir para o dado ↑
            </span>
          </button>
        ) : (
          <div className="flex min-h-12 items-center gap-3 rounded-lg border border-ambar/50 bg-ambar/10 px-3 py-2 text-sm text-ambar" role="status">
            <span aria-hidden>🎲</span> {bloqueio}
          </div>
        )
      ) : (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void mandar(texto, true);
          }}
        >
          <textarea
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void mandar(texto, true);
              }
            }}
            rows={1}
            maxLength={2000}
            aria-label={rotuloCampo}
            placeholder={placeholder}
            className="campo field-sizing-content max-h-40 min-h-12 flex-1 resize-none py-3 leading-snug"
          />
          <button
            className="grid size-12 shrink-0 place-items-center rounded-md bg-ambar text-xl text-[#1a120c] shadow-[0_0_24px_-6px_var(--ambar)] transition hover:bg-[#f0b762] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!texto.trim() || enviando}
            aria-label={enviando ? "Enviando a ação" : "Enviar ação"}
            title="Enviar (Enter · Shift+Enter quebra a linha)"
          >
            {enviando ? (
              <span className="pensando text-base" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            ) : (
              "➤"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
