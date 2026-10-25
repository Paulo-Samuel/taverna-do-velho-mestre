"use client";

import { useState, type ReactNode } from "react";
import type { PersonagemVisivel } from "@/lib/mesa";
import type { BlocoFicha, Ficha, SistemaPublico } from "@/lib/sistemas/tipos";

// Ficha de um personagem, desenhada a partir dos blocos que o sistema calcula no servidor.
// Nada aqui conhece regra de sistema: só sabe desenhar barras, grades, etiquetas, listas e textos.

/** Progresso de XP, quando o servidor manda (null = sistema por marcos ou nível máximo). */
export type ProgressoXp = { xpNivelAtual: number | null; xpProximoNivel: number | null };

const CORES: Record<string, string> = { vida: "bg-musgo", magia: "bg-sky-500", sanidade: "bg-violet-400", outro: "bg-ambar" };

function corDaBarra(cor: string | undefined, pct: number) {
  if (cor === "vida") return pct > 50 ? "bg-musgo" : pct > 20 ? "bg-ambar" : "bg-sangue";
  return CORES[cor ?? "outro"] ?? CORES.outro;
}

function Barras({ itens }: Extract<BlocoFicha, { tipo: "barras" }>) {
  return (
    <div className="space-y-2.5">
      {itens.map((b, i) => {
        const pct = b.max > 0 ? Math.max(0, Math.min(100, Math.round((b.atual / b.max) * 100))) : 0;
        const cor = corDaBarra(b.cor, pct);
        // recursos pequenos (espaços, pontos de destino, estresse) leem melhor como caixinhas
        const caixas = b.cor !== "vida" && b.max >= 1 && b.max <= 10 && Number.isInteger(b.max);
        return (
          <div key={`${b.rotulo}-${i}`} aria-label={`${b.rotulo}: ${b.atual} de ${b.max}`}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-muted">{b.rotulo}</span>
              <span className="shrink-0 tabular-nums">
                <span className={b.cor === "vida" && pct <= 20 ? "text-sangue" : "text-pergaminho"}>{b.atual}</span>
                <span className="text-muted">/{b.max}</span>
              </span>
            </div>
            {caixas ? (
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: b.max }, (_, n) => (
                  <span
                    key={n}
                    className={`h-3 w-5 rounded-sm border transition-colors duration-500 ${n < b.atual ? `${cor} border-transparent` : "border-border bg-surface-2"}`}
                  />
                ))}
              </div>
            ) : (
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className={`h-full rounded-full transition-all duration-700 ${cor}`} style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Grade({ itens }: Extract<BlocoFicha, { tipo: "grade" }>) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(4.6rem,1fr))] gap-1.5">
      {itens.map((i, n) => (
        <div key={`${i.rotulo}-${n}`} className="rounded-md border border-border bg-surface-2/70 px-1 py-1.5 text-center" title={i.rotulo}>
          <p className="truncate text-[10px] uppercase tracking-wider text-muted">{i.rotulo}</p>
          <p className="titulo break-words text-base leading-tight text-pergaminho">{i.valor}</p>
          {i.detalhe && <p className="truncate text-[11px] text-ambar">{i.detalhe}</p>}
        </div>
      ))}
    </div>
  );
}

function Lista({ itens }: { itens: string[] }) {
  const [tudo, setTudo] = useState(false);
  const LIMITE = 10;
  const visiveis = tudo ? itens : itens.slice(0, LIMITE);
  return (
    <>
      <ul className="space-y-1 text-sm">
        {visiveis.map((i, n) => (
          <li key={n} className="flex gap-2">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-ambar-forte" aria-hidden />
            <span className="min-w-0 break-words">{i}</span>
          </li>
        ))}
      </ul>
      {itens.length > LIMITE && (
        <button type="button" className="mt-1 text-xs text-ambar hover:underline" onClick={() => setTudo((v) => !v)}>
          {tudo ? "mostrar menos" : `mais ${itens.length - LIMITE}…`}
        </button>
      )}
    </>
  );
}

/** Conteúdo de um bloco, sem o título (quem desenha o título é a seção). */
export function BlocoVisual({ bloco }: { bloco: BlocoFicha }) {
  switch (bloco.tipo) {
    case "barras":
      return <Barras {...bloco} />;
    case "grade":
      return <Grade {...bloco} />;
    case "etiquetas":
      return (
        <div className="flex flex-wrap gap-1">
          {bloco.itens.map((i, n) => (
            <span key={`${i}-${n}`} className="rounded-full border border-border bg-surface-2/60 px-2 py-0.5 text-xs">
              {i}
            </span>
          ))}
        </div>
      );
    case "lista":
      return <Lista itens={bloco.itens} />;
    case "texto":
      return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{bloco.texto}</p>;
  }
}

function Secao({ titulo, contagem, aberta, children }: { titulo: string; contagem?: number; aberta: boolean; children: ReactNode }) {
  return (
    <details open={aberta} className="group border-t border-border/70 pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-xs uppercase tracking-wider text-muted hover:text-ambar [&::-webkit-details-marker]:hidden">
        <span className="text-[10px] transition-transform group-open:rotate-90" aria-hidden>
          ▶
        </span>
        <span className="flex-1">{titulo}</span>
        {contagem !== undefined && <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums">{contagem}</span>}
      </summary>
      <div className="pb-2 pt-1.5">{children}</div>
    </details>
  );
}

function tituloDe(b: BlocoFicha): string | undefined {
  return b.tipo === "barras" ? undefined : b.titulo;
}

/** Blocos vazios não ocupam espaço. */
function vazio(b: BlocoFicha): boolean {
  if (b.tipo === "texto") return !b.texto.trim();
  return b.itens.length === 0;
}

type PropsCartao = {
  ficha: Ficha;
  blocos: BlocoFicha[];
  sistema: SistemaPublico;
  jogador?: string;
  progresso?: ProgressoXp | null;
};

/** Cabeçalho + blocos. Usado na mesa (PainelFicha) e na prévia do formulário de criação. */
export function CartaoFicha({ ficha, blocos, sistema, jogador, progresso }: PropsCartao) {
  const classe = sistema.classes.find((c) => c.id === ficha.classe)?.nome ?? ficha.classe;
  const anc = sistema.ancestralidades.find((a) => a.id === ficha.ancestralidade)?.nome ?? ficha.ancestralidade;
  const antecedente = sistema.antecedentes?.find((a) => a.id === ficha.antecedente)?.nome;

  const proximo = progresso?.xpProximoNivel ?? null;
  const base = progresso?.xpNivelAtual ?? 0;
  const mostrarXp = proximo !== null || ficha.xp > 0;
  const pctXp = proximo !== null && proximo > base ? Math.max(0, Math.min(100, ((ficha.xp - base) / (proximo - base)) * 100)) : 0;

  const visiveis = blocos.filter((b) => !vazio(b));
  const temHistoria = visiveis.some((b) => /hist[óo]ria/i.test(tituloDe(b) ?? ""));
  const vistos = new Map<string, number>();

  return (
    <div className="space-y-3 text-sm">
      <header>
        <p className="titulo break-words text-2xl leading-tight text-pergaminho">{ficha.nome}</p>
        <p className="text-muted">
          {[anc, classe].filter(Boolean).join(" · ")}
          {antecedente && <span className="text-muted/80"> · {antecedente}</span>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full border border-ambar/40 bg-ambar/10 px-2 py-0.5 text-ambar">
            {sistema.rotulos.nivel} {ficha.nivel}
          </span>
          {jogador && <span className="rounded-full border border-border px-2 py-0.5 text-muted">jogado por {jogador}</span>}
        </div>
        {mostrarXp && (
          <div className="mt-2">
            <div className="mb-0.5 flex justify-between text-[11px] text-muted">
              <span>XP {ficha.xp.toLocaleString("pt-BR")}</span>
              {proximo !== null &&
                (ficha.xp >= proximo ? (
                  <span className="text-ambar">pronto para subir!</span>
                ) : (
                  <span>faltam {(proximo - ficha.xp).toLocaleString("pt-BR")}</span>
                ))}
            </div>
            {proximo !== null && (
              <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-ambar-forte transition-all duration-700" style={{ width: `${pctXp}%` }} />
              </div>
            )}
          </div>
        )}
      </header>

      {visiveis.map((b, i) => {
        const titulo = tituloDe(b);
        // chave por tipo+título: assim uma seção recolhida continua recolhida quando outro bloco aparece antes dela
        const raiz = `${b.tipo}:${titulo ?? ""}`;
        const n = vistos.get(raiz) ?? 0;
        vistos.set(raiz, n + 1);
        const chave = `${raiz}:${n}`;
        if (!titulo) {
          return (
            <div key={chave} className={i > 0 ? "pt-1" : ""}>
              <BlocoVisual bloco={b} />
            </div>
          );
        }
        const contagem = b.tipo === "lista" || b.tipo === "etiquetas" ? b.itens.length : undefined;
        // texto comprido começa fechado para não empurrar o resto da ficha
        const aberta = !(b.tipo === "texto" && b.texto.length > 360);
        return (
          <Secao key={chave} titulo={titulo} contagem={contagem} aberta={aberta}>
            <BlocoVisual bloco={b} />
          </Secao>
        );
      })}

      {ficha.historia && !temHistoria && (
        <Secao titulo="História" aberta={false}>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{ficha.historia}</p>
        </Secao>
      )}
    </div>
  );
}

export function PainelFicha({ personagem, sistema }: { personagem: PersonagemVisivel; sistema: SistemaPublico }) {
  // o servidor manda o progresso de XP junto (visivel.ts); null = por marcos, e a ficha mostra só o XP acumulado
  const progresso = personagem.progresso ?? null;
  return <CartaoFicha ficha={personagem.ficha} blocos={personagem.blocos} sistema={sistema} jogador={personagem.jogador} progresso={progresso} />;
}
