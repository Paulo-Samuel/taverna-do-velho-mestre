import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Icone } from "@/components/icones";
import { Retrato } from "@/components/historia/retrato";
import { arquetipoPorId, retratoDoArquetipo } from "@/components/historia/retrato/arquetipos-retrato";
import { COR_GRAU, NOME_GRAU, corDoNome } from "@/components/historia/cores";
import { descricaoDoTeste, tipoDoTeste } from "@/components/historia/tipo-teste";
import { JOGADA_EXEMPLO, PASSOS_DA_JOGADA } from "@/lib/inicio/jogada-exemplo-dados";

// G16: "Como funciona" em forma de jogada: o mestre narra, o herói age, o dado decide, o mestre conta o tombo.
// Componente de servidor, sem estado. Os selos repetem a forma dos da mesa, mas não usam LinhaDado/CartaoDado
// (esses pedem uma Mensagem do banco). O "campo" do fim é só desenho: não é <input> nem tem papel de campo.

const SELO = "rounded border px-1.5 py-px text-[11px] leading-4";
const ROTULO_MESTRE = "flex items-center gap-1.5 text-sm font-semibold tracking-[0.14em] text-ambar [font-variant-caps:all-small-caps]";
const NARRACAO = "space-y-2 border-l-2 border-ambar/60 pl-3 text-sm leading-relaxed text-foreground/90";

function seloDeCor(cor: string): CSSProperties {
  return {
    color: `color-mix(in srgb, ${cor} 60%, var(--foreground))`,
    borderColor: `color-mix(in srgb, ${cor} 55%, transparent)`,
    background: `color-mix(in srgb, ${cor} 10%, var(--background))`,
  };
}

export function JogadaExemplo({ children }: { children?: ReactNode }) {
  const j = JOGADA_EXEMPLO;
  const arquetipo = arquetipoPorId(j.arquetipo);
  const corHeroi = corDoNome(j.heroi);
  const info = tipoDoTeste(j.pericia);
  const corGrau = COR_GRAU[j.grau] ?? "var(--sangue)";
  const nomeGrau = NOME_GRAU[j.grau] ?? "Falha crítica";
  const porExtenso = `${descricaoDoTeste(j.pericia, info)}: ${nomeGrau.toLowerCase()}, ${j.natural} natural`;

  return (
    <section aria-labelledby="como-funciona-titulo" className="mt-12">
      <h2 id="como-funciona-titulo" className="titulo text-2xl text-pergaminho">
        Como funciona
      </h2>
      <p className="mt-1 text-sm text-muted">Uma jogada inteira, do começo ao tombo.</p>

      <div className="mt-4 grid gap-6 md:grid-cols-2 md:items-start">
        <div className="cartao min-w-0 space-y-4 p-4 sm:p-5">
          <div className="surgir">
            <p className={ROTULO_MESTRE}>
              <Icone nome="book" /> Mestre
            </p>
            <div className={`mt-1.5 ${NARRACAO}`}>
              {j.narracao.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>
          </div>

          <div
            className="surgir flex items-start gap-3 rounded-lg border-l-2 p-3"
            style={{ animationDelay: "120ms", borderLeftColor: corHeroi, background: `color-mix(in srgb, ${corHeroi} 7%, var(--surface))` }}
          >
            <Retrato
              ficha={{ nome: j.heroi, classe: j.classe, extras: arquetipo ? { retrato: retratoDoArquetipo(arquetipo) } : {} }}
              tamanho={40}
              className="shrink-0 rounded-full"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[0.14em] [font-variant-caps:all-small-caps]" style={{ color: corHeroi }}>
                {j.heroi}
              </p>
              <p className="mt-0.5 text-sm italic leading-relaxed text-foreground/85">{j.acao}</p>
            </div>
          </div>

          <div className="surgir" style={{ animationDelay: "240ms" }}>
            <span className="sr-only">{porExtenso}</span>
            <p className="flex flex-wrap gap-1.5" aria-hidden>
              <span className={`${SELO} font-medium ${info?.classe ?? "border-border text-muted"}`}>{j.pericia}</span>
              <span className={`${SELO} font-semibold uppercase tracking-wide`} style={seloDeCor(corGrau)}>
                {nomeGrau}
              </span>
              <span className={`${SELO} inline-flex items-center gap-1 font-semibold uppercase tracking-wide`} style={seloDeCor("var(--sangue)")}>
                <Icone nome="skull" /> {j.natural} natural
              </span>
            </p>
          </div>

          <div className={`surgir ${NARRACAO}`} style={{ animationDelay: "360ms" }}>
            {j.consequencia.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>

          <div className="surgir flex items-center gap-2" style={{ animationDelay: "480ms" }}>
            <div className="flex min-h-11 min-w-0 flex-1 items-center rounded-md border border-border bg-surface-2 px-3 text-muted">
              <p className="text-sm">{j.convite}</p>
            </div>
            {children ?? (
              <Link href="/nova" className="btn-ambar min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar" aria-label="Começar a jogar">
                <Icone nome="arrowRight" />
              </Link>
            )}
          </div>
        </div>

        <ol className="min-w-0 space-y-4">
          {PASSOS_DA_JOGADA.map((p, i) => (
            <li key={p.titulo} className="flex gap-3">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ambar/60 text-sm font-semibold text-ambar"
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="titulo text-lg leading-tight text-pergaminho">{p.titulo}</h3>
                <p className="mt-0.5 text-sm text-muted">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
