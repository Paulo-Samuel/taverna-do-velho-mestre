"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import type { Paragrafo } from "./cena";
import { capitularCabe, Ornamento } from "./prosa";
import { SEPARADOR } from "./turnos";

// Peças de desenho da cena, comuns ao leitor cena a cena e ao modo 📜 Rolagem das duas mesas: o aparte ((fora do jogo)), o
// divisor de fim de sessão ("— Fim da noite 3 —"), o mestre escrevendo no palco e a prosa corrida com os apartes no meio.

/** Caixa do aparte: "💬 Mestre, fora do jogo" e o texto sem o itálico da narração. */
export function Aparte({ quem = "Mestre", children, className = "" }: { quem?: string; children: ReactNode; className?: string }) {
  return (
    <aside className={`leitor-aparte ${className}`} aria-label={`${quem}, fora do jogo`} data-aparte>
      <p className="leitor-aparte-rotulo">
        <span aria-hidden>💬</span> {quem}, fora do jogo
      </p>
      <div className="leitor-aparte-texto">{children}</div>
    </aside>
  );
}

/** Quebras de linha simples de um aparte. */
export function linhasDoAparte(texto: string, inline: (t: string, k: string) => ReactNode, chave: string) {
  return texto.split("\n").map((l, i) => <p key={i}>{inline(l, `${chave}-${i}`)}</p>);
}

/** Alternância "💬 Perguntar" do campo de ação: ligada, o que se escreve vai ao mestre entre (( )), fora do jogo. */
export function BotaoPerguntar({ ligado, aoAlternar, className = "" }: { ligado: boolean; aoAlternar: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={aoAlternar}
      aria-pressed={ligado}
      title={ligado ? "Voltar a agir (a mensagem vira ação do personagem)" : "Perguntar ao mestre fora do jogo: regras, opções, chances. Vai entre (( ))."}
      aria-label={ligado ? "Desligar a pergunta ao mestre" : "Perguntar ao mestre, fora do jogo"}
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2.5 text-sm transition ${
        ligado ? "border-ambar/70 bg-ambar/12 text-ambar" : "border-border/80 text-muted hover:border-ambar/50 hover:text-ambar"
      } ${className}`}
      data-perguntar
    >
      <span aria-hidden>💬</span>
      <span className="hidden sm:inline">Perguntar</span>
    </button>
  );
}

/** "— Fim da noite 3 —": fecha o capítulo da sessão, com o enfeite do tema. */
export function FimDaNoite({ sessao, data, simbolo }: { sessao: number | null; data?: string | null; simbolo?: string }) {
  const quando = data ? dataCurta(data) : null;
  return (
    <div className="leitor-fim-noite" role="separator" aria-label={sessao ? `Fim da noite ${sessao}` : "Fim da noite"} data-fim-noite>
      <Ornamento simbolo={simbolo} className="mb-0! mt-0! w-full max-w-[13em]!" />
      <p className="leitor-fim-noite-titulo">
        <span aria-hidden>— </span>
        Fim da noite{sessao ? ` ${sessao}` : ""}
        <span aria-hidden> —</span>
      </p>
      {quando && <p className="leitor-fim-noite-data">{quando}</p>}
    </div>
  );
}

function dataCurta(data: string): string | null {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(data) ? `${data}T12:00:00` : data.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

const FRASES = [
  "O mestre molha a pena no tinteiro",
  "O mestre consulta tabelas que nem existem",
  "O mestre finge que tinha planejado isso",
  "O mestre coça a barba e pensa",
  "O mestre rabisca, apaga e rabisca de novo",
  "O mestre procura o dado que caiu debaixo da mesa",
];

/** O mestre escrevendo, no meio do palco: a pena riscando e uma frase que troca de vez em quando. */
export function MestreEscrevendo({ frase }: { frase?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (frase) return;
    const t = setInterval(() => setI((n) => n + 1), 4200);
    return () => clearInterval(t);
  }, [frase]);
  const texto = frase ?? FRASES[i % FRASES.length];
  return (
    <div className="leitor-escrevendo" role="status" aria-live="polite" data-escrevendo>
      <svg viewBox="0 0 64 28" className="leitor-escrevendo-pena" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path className="leitor-escrevendo-tinta" d="M4 22c6-5 9 3 14-1s7-6 11-1 7 4 11 0 6-4 9-1" />
        <g className="leitor-escrevendo-mao">
          <path d="M50 21 60 3c1-1 2 0 1.6 1L54 22" fill="currentColor" fillOpacity={0.18} />
          <path d="M50 21l1.5 2.5L54 22" />
        </g>
      </svg>
      <p key={texto} className="leitor-escrevendo-frase">
        {texto}
        <span className="leitor-escrevendo-pontos" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </p>
    </div>
  );
}

/**
 * Prosa corrida da rolagem (sem páginas): parágrafos com a marcação da mesa, separadores com o enfeite e os apartes em caixa.
 * `capitular`: o primeiro parágrafo de narração (não o aparte) ganha a letra grande, se couber.
 */
export function ProsaCena({
  paragrafos,
  inline,
  separador,
  classe,
  capitular = false,
  escrevendo = false,
}: {
  paragrafos: Paragrafo[];
  inline: (texto: string, chave: string) => ReactNode;
  separador: ReactNode;
  classe: string;
  capitular?: boolean;
  escrevendo?: boolean;
}) {
  const primeira = capitular ? paragrafos.findIndex((p) => !p.aparte && !SEPARADOR.test(p.texto)) : -1;
  const comCapitular = primeira >= 0 && capitularCabe(paragrafos[primeira].texto);
  return (
    <div className={`leitor-prosa ${classe}`} data-fixavel>
      {paragrafos.map((p, i) => {
        const k = `${p.msg}-${i}`;
        if (p.aparte) return <Aparte key={k}>{linhasDoAparte(p.texto, inline, k)}</Aparte>;
        if (SEPARADOR.test(p.texto)) return <Fragment key={k}>{separador}</Fragment>;
        return (
          <p key={k} className={`${comCapitular && i === primeira ? "leitor-capitular" : ""} ${escrevendo && i === paragrafos.length - 1 ? "cursor" : ""}`}>
            {inline(p.texto, k)}
          </p>
        );
      })}
      {escrevendo && paragrafos.length === 0 && <p className="cursor" />}
    </div>
  );
}
