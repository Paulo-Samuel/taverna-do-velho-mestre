"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_TEXTO_FATO } from "./limites";
import { ancoraDe, type Ancora, type ControleFatos } from "./use-fatos";

// "📌 Fixar" flutuante: ao selecionar um trecho da narração (qualquer bloco com data-fixavel, nos dois modos de leitura;
// no celular, a seleção por toque longo), aparece o botão; ele abre o mini-popover para editar e confirmar.
// O mesmo popover atende o 📌 das entradas do diário (controle.propor). Um por mesa.

/** Trecho selecionado dentro de um bloco fixável (ou null). */
function selecaoFixavel(): { texto: string; ancora: Ancora } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const dentro = (n: Node | null) => (n instanceof Element ? n : n?.parentElement)?.closest("[data-fixavel]");
  if (!dentro(sel.anchorNode) || !dentro(sel.focusNode)) return null;
  const texto = sel.toString().replace(/\s+/g, " ").trim();
  if (texto.length < 3) return null;
  // no leitor cena a cena o texto corre em colunas: vale o primeiro pedaço visível da seleção
  const caixas = [...sel.getRangeAt(0).getClientRects()].filter((r) => r.width > 1 && r.bottom > 0 && r.top < window.innerHeight);
  if (!caixas.length) return null;
  const topo = Math.min(...caixas.map((r) => r.top));
  const base = Math.max(...caixas.map((r) => r.bottom));
  const esquerda = Math.min(...caixas.map((r) => r.left));
  const direita = Math.max(...caixas.map((r) => r.right));
  return { texto, ancora: { x: (esquerda + direita) / 2, topo, base } };
}

const toque = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

function Popover({ controle }: { controle: ControleFatos }) {
  const p = controle.proposta!;
  const [texto, setTexto] = useState(p.texto);
  const [enviando, setEnviando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const { fecharProposta } = controle;

  // posição: abaixo do trecho (ou acima, se não couber), presa dentro da tela
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(12, Math.min(p.ancora.x - w / 2, window.innerWidth - w - 12));
    const abaixo = p.ancora.base + 10;
    const top = abaixo + h < window.innerHeight - 12 ? abaixo : Math.max(12, p.ancora.topo - h - 10);
    setPos({ left, top });
  }, [p.ancora]);

  // clique fora ou Esc fecham
  useEffect(() => {
    const fora = (e: PointerEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) fecharProposta();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      fecharProposta();
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc, true);
    };
  }, [fecharProposta]);

  async function confirmar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    const ok = await controle.criar(t);
    setEnviando(false);
    if (ok) fecharProposta();
  }

  return (
    <div
      ref={caixa}
      role="dialog"
      aria-label="Fixar um fato"
      className="surgir fixed z-[70] w-[min(22rem,calc(100vw-24px))] rounded-lg border border-ambar/60 bg-surface p-3 text-sm text-foreground shadow-2xl"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
      data-popover-fato
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        <span aria-hidden>📌</span> Fixar para o mestre nunca esquecer
      </p>
      <textarea
        value={texto}
        autoFocus
        rows={3}
        maxLength={MAX_TEXTO_FATO}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void confirmar();
          }
        }}
        aria-label="Texto do fato"
        className="campo w-full resize-none py-1.5 text-sm leading-snug"
      />
      {controle.erro && (
        <p className="mt-1 text-xs text-sangue" role="alert">
          {controle.erro}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[11px] tabular-nums text-muted">
          {texto.length}/{MAX_TEXTO_FATO}
        </span>
        <button type="button" className="ml-auto min-h-9 px-2 text-xs text-muted hover:text-foreground" onClick={fecharProposta}>
          Cancelar
        </button>
        <button type="button" className="btn-ambar min-h-9 px-3 py-1.5 text-xs" disabled={!texto.trim() || enviando} onClick={() => void confirmar()}>
          📌 Fixar
        </button>
      </div>
    </div>
  );
}

export function FixarSelecao({ controle }: { controle: ControleFatos }) {
  const [achado, setAchado] = useState<{ texto: string; ancora: Ancora } | null>(null);
  const aberto = controle.proposta !== null;

  // acompanha a seleção (com folga: enquanto a pessoa arrasta, a seleção muda a cada pixel)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const mudou = () => {
      clearTimeout(t);
      t = setTimeout(() => setAchado(selecaoFixavel()), 220);
    };
    // rolar ou redimensionar tira o botão do lugar: some até a próxima seleção
    const sumir = () => setAchado(null);
    document.addEventListener("selectionchange", mudou);
    window.addEventListener("resize", sumir);
    document.addEventListener("scroll", sumir, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("selectionchange", mudou);
      window.removeEventListener("resize", sumir);
      document.removeEventListener("scroll", sumir, true);
    };
  }, []);

  const abrir = () => {
    if (!achado) return;
    controle.propor(achado.texto, achado.ancora);
    setAchado(null);
    window.getSelection()?.removeAllRanges();
  };

  // no celular o menu nativo (copiar, colar…) fica em cima da seleção: o botão vai embaixo
  const embaixo = toque() || (achado ? achado.ancora.topo < 70 : false);
  return (
    <>
      {achado && !aberto && (
        <button
          type="button"
          // pointerdown (e não click): no celular o toque fora desfaria a seleção antes do click
          onPointerDown={(e) => {
            e.preventDefault();
            abrir();
          }}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && abrir()}
          className="surgir fixed z-[65] flex min-h-9 -translate-x-1/2 items-center gap-1 rounded-full border border-ambar/70 bg-surface px-3 text-xs font-semibold text-ambar shadow-xl hover:bg-surface-2"
          style={{
            left: Math.max(48, Math.min(achado.ancora.x, window.innerWidth - 48)),
            top: embaixo ? achado.ancora.base + 10 : achado.ancora.topo - 44,
          }}
          title="Fixar este trecho: o mestre nunca mais esquece"
          data-fixar-selecao
        >
          <span aria-hidden>📌</span> Fixar
        </button>
      )}
      {aberto && <Popover key={`${controle.proposta!.texto}-${controle.proposta!.ancora.x}`} controle={controle} />}
    </>
  );
}

/** Botãozinho "📌" (entradas do diário/códex): abre o popover com a frase-resumo. */
export function BotaoFixar({ texto, controle, rotulo }: { texto: string; controle: ControleFatos; rotulo: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        controle.propor(texto, ancoraDe(e.currentTarget));
      }}
      className="grid size-7 shrink-0 place-items-center rounded-md text-xs opacity-60 transition hover:bg-surface-2 hover:opacity-100 focus-visible:opacity-100"
      aria-label={`Fixar: ${rotulo}`}
      title="Fixar um resumo desta entrada (o mestre nunca esquece)"
      data-botao-fixar
    >
      <span aria-hidden>📌</span>
    </button>
  );
}
