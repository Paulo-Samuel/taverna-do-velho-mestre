import { Fragment, type ReactNode } from "react";

// Prosa do livro (servidor): parágrafos, **negrito**, *itálico*, falas entre aspas em itálico e separadores (---) como
// enfeite. Recados ((fora do jogo)) que o mestre deixou no meio do texto não entram no livro.

const MARCAS = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|"[^"\n]+"|“[^”\n]+”|«[^»\n]+»)/g;

function linhas(texto: string, chave: string): ReactNode[] {
  return texto.split("\n").map((l, k) => (
    <Fragment key={`${chave}-${k}`}>
      {k > 0 && <br />}
      {l}
    </Fragment>
  ));
}

function trecho(texto: string, chave: string): ReactNode[] {
  return texto.split(MARCAS).map((t, j) => {
    const k = `${chave}-${j}`;
    if (j % 2 === 0) return <Fragment key={k}>{linhas(t, k)}</Fragment>;
    if (t.startsWith("**")) return <strong key={k}>{linhas(t.slice(2, -2), k)}</strong>;
    if (t.startsWith("*")) return <em key={k}>{linhas(t.slice(1, -1), k)}</em>;
    return (
      <em key={k} className="livro-fala">
        {t}
      </em>
    );
  });
}

export function paragrafosDe(texto: string): string[] {
  return texto
    .replace(/\(\([\s\S]*?\)\)/g, "")
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.replace(/^#{1,6}\s+/, "").trim())
    .filter(Boolean);
}

/** `capitular`: o primeiro parágrafo abre o capítulo com a letra grande. */
export function Prosa({ texto, ornamento, capitular = false }: { texto: string; ornamento: string; capitular?: boolean }) {
  return (
    <>
      {paragrafosDe(texto).map((p, i) =>
        /^(-{3,}|\*{3,}|_{3,})$/.test(p) ? (
          <p key={i} className="livro-separador" aria-hidden>
            {ornamento} {ornamento} {ornamento}
          </p>
        ) : (
          <p key={i} className={`livro-paragrafo ${capitular && i === 0 ? "livro-capitular" : ""}`}>
            {trecho(p, String(i))}
          </p>
        ),
      )}
    </>
  );
}
