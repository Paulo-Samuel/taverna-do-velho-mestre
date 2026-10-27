"use client";

import { Fragment, useMemo, type ReactNode } from "react";

// Narração do mestre como texto de livro: parágrafos, **negrito**, *itálico*, falas entre aspas em itálico e
// nomes de NPCs e personagens coloridos (cada nome com a sua cor fixa, ver cores.ts).

export type Destaque = { regex: RegExp | null; cores: Map<string, string> };

function escapar(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Regex única com todos os nomes (os mais longos primeiro, para "Bram Ferreiro" ganhar de "Bram"). */
export function montarDestaque(cores: Map<string, string>): Destaque {
  const nomes = [...cores.keys()].sort((a, b) => b.length - a.length);
  if (!nomes.length) return { regex: null, cores };
  return { regex: new RegExp(`(?<![\\p{L}\\p{N}])(${nomes.map(escapar).join("|")})(?![\\p{L}\\p{N}])`, "gu"), cores };
}

/** Pinta os nomes conhecidos dentro de um texto simples (com quebras de linha simples virando <br>). */
function comNomes(texto: string, d: Destaque, chave: string): ReactNode[] {
  const linhas = texto.split("\n");
  return linhas.map((linha, k) => {
    const partes = d.regex ? linha.split(d.regex) : [linha];
    return (
      <Fragment key={`${chave}-${k}`}>
        {k > 0 && <br />}
        {partes.map((p, i) =>
          i % 2 === 1 ? (
            <span key={i} className="font-semibold" style={{ color: d.cores.get(p) }}>
              {p}
            </span>
          ) : (
            p
          ),
        )}
      </Fragment>
    );
  });
}

const MARCAS = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|"[^"\n]+"|“[^”\n]+”|«[^»\n]+»)/g;

/** A marcação inline de um parágrafo (usada também pelo leitor cena a cena, que monta os parágrafos ele mesmo). */
export function trecho(texto: string, d: Destaque, chave: string): ReactNode[] {
  return texto.split(MARCAS).map((t, j) => {
    const k = `${chave}-${j}`;
    if (j % 2 === 0) return <Fragment key={k}>{comNomes(t, d, k)}</Fragment>;
    if (t.startsWith("**"))
      return (
        <strong key={k} className="font-semibold text-pergaminho">
          {comNomes(t.slice(2, -2), d, k)}
        </strong>
      );
    if (t.startsWith("*")) return <em key={k}>{comNomes(t.slice(1, -1), d, k)}</em>;
    // fala entre aspas: itálico, com as aspas originais
    return (
      <em key={k} className="text-pergaminho">
        {t[0]}
        {comNomes(t.slice(1, -1), d, k)}
        {t[t.length - 1]}
      </em>
    );
  });
}

export function NarracaoLivro({ texto, destaque, escrevendo = false }: { texto: string; destaque: Destaque; escrevendo?: boolean }) {
  const paragrafos = useMemo(
    () =>
      texto
        .trim()
        .split(/\n{2,}/)
        .map((p) => p.replace(/^#{1,6}\s+/, "").trim())
        .filter(Boolean),
    [texto],
  );
  return (
    <div className="narracao-livro text-[1.08rem] leading-[1.8] text-foreground/95 sm:text-[1.15rem]" data-fixavel>
      {paragrafos.map((p, i) =>
        /^(-{3,}|\*{3,}|_{3,})$/.test(p) ? (
          <p key={i} className="my-5 text-center text-sm tracking-[0.6em] text-muted" aria-hidden>
            ✦✦✦
          </p>
        ) : (
          <p key={i} className={`mb-4 last:mb-0 ${escrevendo && i === paragrafos.length - 1 ? "cursor" : ""}`}>
            {trecho(p, destaque, String(i))}
          </p>
        ),
      )}
      {escrevendo && paragrafos.length === 0 && <p className="cursor" />}
    </div>
  );
}
