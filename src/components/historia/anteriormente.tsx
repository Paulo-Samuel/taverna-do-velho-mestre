"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Mensagem } from "@/lib/db";
import type { Cena, EntradaDiario } from "@/lib/sistemas/tipos";
import { fonteGotica } from "./fonte-gotica";

// "Anteriormente…": ao abrir uma mesa parada há mais de 3 horas, um cartão por cima do topo da conversa lembra onde a
// história estava: o resumo da campanha (ou o último parágrafo do mestre), o lugar e o momento da cena e as missões em
// aberto. Sem chamar a IA. "Continuar de onde paramos" fecha e rola até o fim; dá para recolher e reabrir.
// O resumo não vem no estado da mesa: busca na rota do livro (?formato=resumo).

/** Parada há mais que isso conta como "voltando à mesa". */
const PAUSA_MS = 3 * 60 * 60 * 1000;

/** O SQLite grava em UTC sem fuso ("2026-10-25 14:03:00"). */
export const dataDoBanco = (dataSqlite: string) => new Date(dataSqlite.replace(" ", "T") + "Z");

/** Último parágrafo do mestre, sem marcação (parágrafo curtinho junta com o anterior). */
export function ultimoParagrafoDoMestre(mensagens: Mensagem[]): string | null {
  const fala = mensagens.findLast((m) => m.tipo === "mestre" && m.texto.trim());
  if (!fala) return null;
  const paragrafos = fala.texto
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\(\([\s\S]*?\)\)/g, "").replace(/[*_#>`]+/g, "").replace(/\s+/g, " ").trim())
    .filter((p) => p && !/^[-✦\s]+$/.test(p));
  const ultimo = paragrafos.at(-1) ?? "";
  const texto = ultimo.length < 120 && paragrafos.length > 1 ? `${paragrafos.at(-2)} ${ultimo}` : ultimo;
  return texto.length > 520 ? `…${texto.slice(-520).replace(/^\S*\s/, "")}` : texto || null;
}

function haQuanto(ms: number): string {
  const horas = Math.round(ms / 3_600_000);
  if (horas < 24) return `há ${horas} horas`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.round(dias / 30);
  return meses <= 1 ? "há um mês" : `há ${meses} meses`;
}

export function Anteriormente({
  campanhaId,
  nome,
  mensagens,
  cena,
  diario,
  livro = false,
  aoContinuar,
}: {
  campanhaId: number;
  nome: string;
  mensagens: Mensagem[];
  cena: Cena;
  diario: EntradaDiario[];
  /** visual de livro do modo história */
  livro?: boolean;
  aoContinuar: () => void;
}) {
  const [fase, setFase] = useState<"oculto" | "aberto" | "recolhido">("oculto");
  const [resumo, setResumo] = useState<string | null>(null);
  const [pausa, setPausa] = useState(0);
  // só as mensagens de quando a mesa abriu decidem (o que chega depois é a sessão de hoje)
  const [iniciais] = useState(mensagens);

  useEffect(() => {
    const ultima = iniciais.at(-1);
    if (!ultima) return;
    const parada = Date.now() - dataDoBanco(ultima.criadaEm).getTime();
    if (!(parada > PAUSA_MS)) return;
    const controle = new AbortController();
    fetch(`/api/campanhas/${campanhaId}/livro?formato=resumo`, { signal: controle.signal })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((corpo: { resumo?: string } | null) => {
        if (controle.signal.aborted) return;
        setResumo(corpo?.resumo?.trim() || null);
        setPausa(parada);
        setFase("aberto");
      });
    return () => controle.abort();
  }, [campanhaId, iniciais]);

  // Esc recolhe
  useEffect(() => {
    if (fase !== "aberto") return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setFase("recolhido");
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [fase]);

  if (fase === "oculto") return null;

  const continuar = () => {
    setFase("oculto");
    aoContinuar();
  };

  if (fase === "recolhido")
    return (
      <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-4">
        <div className="pointer-events-auto surgir flex items-center overflow-hidden rounded-full border border-ambar/40 bg-surface/95 text-xs shadow-lg backdrop-blur">
          <button type="button" onClick={() => setFase("aberto")} className="min-h-9 px-3 text-ambar hover:bg-surface-2" aria-expanded={false}>
            📜 Anteriormente…
          </button>
          <button type="button" onClick={() => setFase("oculto")} className="grid min-h-9 w-9 place-items-center border-l border-border text-muted hover:text-foreground" aria-label="Dispensar o resumo">
            ✕
          </button>
        </div>
      </div>
    );

  const texto = resumo ?? ultimoParagrafoDoMestre(iniciais);
  const lugar = [cena.local, cena.momento].filter(Boolean).join(" · ");
  const missoes = diario.filter((e) => e.tipo === "missao" && !/conclu|falh|cancel/i.test(e.status));

  return (
    <div className="absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-3 sm:px-6 sm:pt-5">
      <section
        aria-labelledby="anteriormente-titulo"
        data-anteriormente
        className={`surgir relative max-h-[min(70dvh,34rem)] w-full max-w-[42rem] overflow-y-auto overscroll-contain rounded-xl border p-5 shadow-[0_20px_60px_-20px_black] backdrop-blur sm:p-6 ${
          livro ? "border-ambar/40 bg-background/95" : "cartao cartao-tema bg-surface/95"
        }`}
      >
        <button
          type="button"
          onClick={() => setFase("recolhido")}
          className="absolute right-2 top-2 grid size-9 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
          aria-label="Recolher o resumo"
          title="Recolher (Esc)"
        >
          ▴
        </button>
        <p className="pr-10 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">Vocês pararam {haQuanto(pausa)}</p>
        {livro ? (
          <h2 id="anteriormente-titulo" className={`${fonteGotica.className} mt-1.5 pr-8 text-3xl leading-tight text-pergaminho sm:text-4xl`}>
            Anteriormente, em {nome}…
          </h2>
        ) : (
          <h2 id="anteriormente-titulo" className="titulo mt-1 pr-8 text-2xl leading-tight text-pergaminho">
            Anteriormente…
          </h2>
        )}
        <div className={`mt-3 h-px ${livro ? "bg-linear-to-r from-ambar/50 via-border to-transparent" : "bg-border"}`} />

        {lugar && (
          <p className="mt-3 text-sm text-muted">
            <span aria-hidden>📍 </span>
            {cena.titulo && <span className="text-foreground">{cena.titulo} — </span>}
            {lugar}
          </p>
        )}
        {texto ? (
          <p className={`mt-3 whitespace-pre-line leading-relaxed text-foreground/90 ${livro ? "text-[1.05rem] italic" : "text-[15px]"}`}>{texto}</p>
        ) : (
          <p className="mt-3 text-sm italic text-muted">O mestre não lembra de nada. Normal, ele bebe.</p>
        )}
        {missoes.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ambar">Missões em aberto</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {missoes.slice(0, 5).map((m) => (
                <li key={m.id} className="flex gap-2">
                  <span className="text-ambar/80" aria-hidden>
                    ◆
                  </span>
                  <span className="min-w-0">
                    <span className="text-foreground">{m.titulo}</span>
                    {m.texto && <span className="text-muted"> — {m.texto.length > 140 ? `${m.texto.slice(0, 140)}…` : m.texto}</span>}
                  </span>
                </li>
              ))}
              {missoes.length > 5 && <li className="text-xs text-muted">e mais {missoes.length - 5} no diário</li>}
            </ul>
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={continuar} className="btn-ambar min-h-11 px-6">
            Continuar de onde paramos
          </button>
          <Link href={`/mesa/${campanhaId}/livro`} className="text-sm text-muted underline-offset-4 hover:text-ambar hover:underline">
            📜 Reler o livro da campanha
          </Link>
        </div>
      </section>
    </div>
  );
}
