"use client";

import { foraDoJogo } from "@/components/leitor/cena";
import { Aparte } from "@/components/leitor/pecas";
import type { PersonagemVisivel } from "@/lib/mesa";
import { COR_GRAU, NOME_GRAU, corDoNome } from "./cores";
import { Retrato } from "./retrato";

// Ação do jogador no meio do livro, leve como uma nota de margem: retrato pequeno, nome em versalete na cor do personagem,
// o texto em itálico e, quando a ação virou teste, "Perícia · Sucesso" no canto. Na fila (esperando o mestre), o fio fica tracejado.

export type DesfechoAcao = { teste: string; grau: string | null };

export function CartaoAcao({
  personagem,
  nomeReserva,
  autor,
  texto,
  desfecho,
  naFila = false,
}: {
  personagem: PersonagemVisivel | null;
  /** nome a mostrar quando o personagem saiu da mesa */
  nomeReserva?: string;
  autor?: string | null;
  texto: string;
  desfecho?: DesfechoAcao | null;
  /** ainda esperando o mestre (fila) */
  naFila?: boolean;
}) {
  if (foraDoJogo(texto) || (!personagem && !nomeReserva)) {
    return (
      <Aparte quem={autor || personagem?.ficha.nome || "Alguém"} className={`surgir my-5! text-[0.95rem] ${naFila ? "opacity-70" : ""}`}>
        <p>{texto.trim().replace(/^\(\(|\)\)$/g, "").trim()}</p>
      </Aparte>
    );
  }
  const nome = personagem?.ficha.nome ?? nomeReserva ?? "";
  const cor = corDoNome(nome);
  return (
    <div className={`surgir my-6 flex items-start gap-3 ${naFila ? "opacity-75" : ""}`}>
      {personagem ? (
        <Retrato ficha={personagem.ficha} tamanho={30} className="mt-0.5 rounded-full" />
      ) : (
        <span className="mt-0.5 grid size-[30px] shrink-0 place-items-center rounded-full border border-border text-xs text-muted">?</span>
      )}
      <div className={`min-w-0 flex-1 border-l pl-3 ${naFila ? "border-dashed border-ambar/40" : "border-border/70"}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="min-w-0 truncate text-sm">
            <span className="font-semibold tracking-[0.06em] [font-variant-caps:all-small-caps]" style={{ color: cor }}>
              {nome}
            </span>
            {autor && autor !== nome && <span className="text-xs text-muted"> · {autor}</span>}
          </p>
          {desfecho ? (
            <p className="shrink-0 text-xs">
              <span className="text-muted">{desfecho.teste}</span>
              <span className="text-muted"> · </span>
              {desfecho.grau ? (
                <span className="font-semibold" style={{ color: COR_GRAU[desfecho.grau] }}>
                  {NOME_GRAU[desfecho.grau] ?? desfecho.grau}
                </span>
              ) : (
                <span className="italic text-ambar">rolando…</span>
              )}
            </p>
          ) : naFila ? (
            <p className="shrink-0 text-xs italic text-muted">esperando o mestre</p>
          ) : null}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words italic leading-relaxed text-foreground/70">{texto}</p>
      </div>
    </div>
  );
}
