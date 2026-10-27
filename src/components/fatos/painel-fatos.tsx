"use client";

import { useState } from "react";
import type { Fato } from "@/lib/db";
import { MAX_CARACTERES_NO_PROMPT, MAX_FATOS_NO_PROMPT, MAX_TEXTO_FATO, quantosEntram } from "./limites";
import type { ControleFatos } from "./use-fatos";

// Lista dos fatos fixados (aba "📌" da mesa avançada e do códex): fixar com Enter, editar, remover, reordenar (↑↓ ou arrastar).
// Os que passam do limite do prompt ficam esmaecidos: guardados, mas o mestre não lê.

function ItemFato({
  f,
  n,
  fora,
  primeiro,
  ultimo,
  controle,
  arrastando,
  aoArrastar,
}: {
  f: Fato;
  n: number;
  fora: boolean;
  primeiro: boolean;
  ultimo: boolean;
  controle: ControleFatos;
  arrastando: number | null;
  aoArrastar: (id: number | null) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(f.texto);
  const [sobre, setSobre] = useState(false);
  const botao = "grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ambar disabled:pointer-events-none disabled:opacity-30";

  async function salvar() {
    const t = texto.trim();
    if (!t || t === f.texto) return setEditando(false);
    if (await controle.editar(f.id, t)) setEditando(false);
  }

  return (
    <li
      draggable={!editando}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(f.id));
        aoArrastar(f.id);
      }}
      onDragEnd={() => aoArrastar(null)}
      onDragOver={(e) => {
        if (arrastando === null || arrastando === f.id) return;
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        if (arrastando !== null) controle.moverPara(arrastando, f.id);
        aoArrastar(null);
      }}
      className={`group/fato relative flex items-start gap-1.5 rounded-lg border bg-surface-2/60 py-1.5 pl-2 pr-1 text-sm transition ${
        sobre ? "border-ambar border-t-2" : "border-border"
      } ${fora ? "opacity-50" : ""} ${arrastando === f.id ? "opacity-40" : ""}`}
      data-fato={f.id}
    >
      <span className="mt-1.5 w-5 shrink-0 cursor-grab text-right text-[11px] tabular-nums text-muted" title="Arraste para reordenar" aria-hidden>
        {n}
      </span>
      {editando ? (
        <div className="min-w-0 flex-1">
          <textarea
            value={texto}
            autoFocus
            rows={2}
            maxLength={MAX_TEXTO_FATO}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void salvar();
              } else if (e.key === "Escape") {
                e.stopPropagation();
                setTexto(f.texto);
                setEditando(false);
              }
            }}
            aria-label="Editar o fato"
            className="campo field-sizing-content w-full resize-none py-1.5 text-sm leading-snug"
          />
          <div className="mt-1 flex items-center gap-2 text-xs">
            <button type="button" className="text-ambar hover:underline" onClick={() => void salvar()}>
              salvar
            </button>
            <button
              type="button"
              className="text-muted hover:text-foreground"
              onClick={() => {
                setTexto(f.texto);
                setEditando(false);
              }}
            >
              cancelar
            </button>
            <span className="ml-auto tabular-nums text-muted">
              {texto.length}/{MAX_TEXTO_FATO}
            </span>
          </div>
        </div>
      ) : (
        <p className="min-w-0 flex-1 py-1 leading-snug break-words text-foreground/90" title={f.autor ? `Fixado por ${f.autor}` : undefined}>
          {f.texto}
          {fora && <span className="ml-1.5 whitespace-nowrap text-[10px] uppercase tracking-wide text-sangue">fora do prompt</span>}
        </p>
      )}
      {/* com mouse, os botões aparecem por cima ao passar (o texto fica com a largura toda); no toque, sempre à vista */}
      {!editando && (
        <div className="flex shrink-0 items-center [@media(pointer:fine)]:absolute [@media(pointer:fine)]:right-1 [@media(pointer:fine)]:top-1 [@media(pointer:fine)]:rounded-md [@media(pointer:fine)]:border [@media(pointer:fine)]:border-border [@media(pointer:fine)]:bg-surface [@media(pointer:fine)]:opacity-0 [@media(pointer:fine)]:shadow-lg [@media(pointer:fine)]:group-hover/fato:opacity-100 [@media(pointer:fine)]:focus-within:opacity-100">
          <button type="button" className={botao} onClick={() => controle.mover(f.id, -1)} disabled={primeiro} aria-label="Subir" title="Subir">
            ↑
          </button>
          <button type="button" className={botao} onClick={() => controle.mover(f.id, 1)} disabled={ultimo} aria-label="Descer" title="Descer">
            ↓
          </button>
          <button
            type="button"
            className={botao}
            onClick={() => {
              setTexto(f.texto);
              setEditando(true);
            }}
            aria-label="Editar"
            title="Editar"
          >
            ✎
          </button>
          <button type="button" className={`${botao} hover:text-sangue`} onClick={() => void controle.remover(f.id)} aria-label="Desafixar" title="Desafixar">
            ✕
          </button>
        </div>
      )}
    </li>
  );
}

export function PainelFatos({ controle }: { controle: ControleFatos }) {
  const [novo, setNovo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const { fatos } = controle;
  const entram = quantosEntram(fatos.map((f) => f.texto));
  const caracteres = fatos.slice(0, entram).reduce((s, f) => s + f.texto.length, 0);

  async function fixar() {
    const t = novo.trim();
    if (!t || enviando) return;
    setEnviando(true);
    if (await controle.criar(t)) setNovo("");
    setEnviando(false);
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          <span aria-hidden>📌</span> Fatos fixados
          {fatos.length > 0 && <span className="rounded-full bg-ambar/20 px-1.5 text-[10px] leading-4 tracking-normal text-ambar">{fatos.length}</span>}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          O mestre lê isto em todo turno e não pode contrariar. Selecione um trecho da narração para fixar, ou escreva aqui.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void fixar();
        }}
      >
        <input
          className="campo min-w-0 flex-1 py-1.5 text-sm"
          placeholder="Fixar um fato…"
          aria-label="Fixar um fato"
          value={novo}
          maxLength={MAX_TEXTO_FATO}
          onChange={(e) => setNovo(e.target.value)}
        />
        <button className="btn-ambar shrink-0 px-3 py-1.5 text-xs" disabled={!novo.trim() || enviando} title="Fixar (Enter)">
          📌 Fixar
        </button>
      </form>
      {novo.length > MAX_TEXTO_FATO - 40 && (
        <p className="-mt-2 text-right text-[11px] tabular-nums text-muted">
          {novo.length}/{MAX_TEXTO_FATO}
        </p>
      )}

      {controle.erro && (
        <p className="flex items-start gap-2 rounded-md border border-sangue/50 bg-sangue/10 px-2.5 py-1.5 text-xs" role="alert">
          <span className="flex-1">{controle.erro}</span>
          <button type="button" onClick={controle.limparErro} className="text-muted hover:text-foreground" aria-label="Fechar o aviso">
            ✕
          </button>
        </p>
      )}

      {entram < fatos.length && (
        <p className="rounded-md border border-ambar/50 bg-ambar/10 px-2.5 py-1.5 text-xs leading-relaxed text-ambar" role="status">
          ⚠ Passou do limite: o mestre só lê os {entram} primeiros (até {MAX_FATOS_NO_PROMPT} fatos e {MAX_CARACTERES_NO_PROMPT} caracteres). Os de baixo
          ficam guardados na gaveta. Enxugue, junte ou suba os importantes.
        </p>
      )}

      {fatos.length ? (
        <ul className="space-y-1.5" aria-label="Fatos fixados">
          {fatos.map((f, i) => (
            <ItemFato
              key={`${f.id}-${f.texto}`}
              f={f}
              n={i + 1}
              fora={i >= entram}
              primeiro={i === 0}
              ultimo={i === fatos.length - 1}
              controle={controle}
              arrastando={arrastando}
              aoArrastar={setArrastando}
            />
          ))}
        </ul>
      ) : (
        controle.carregado && (
          <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-xs italic leading-relaxed text-muted">
            Nada fixado. O mestre lembra do que quer, quando quer. Fixe aqui o que ele não pode esquecer: dívidas, juramentos, quem sabe o quê.
          </p>
        )
      )}

      {fatos.length > 0 && (
        <p className="text-right text-[11px] tabular-nums text-muted">
          {caracteres}/{MAX_CARACTERES_NO_PROMPT} caracteres no prompt
        </p>
      )}
    </div>
  );
}
