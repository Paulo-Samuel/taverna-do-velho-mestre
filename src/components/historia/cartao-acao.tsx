"use client";

import type { PersonagemVisivel } from "@/lib/mesa";
import { COR_GRAU, NOME_GRAU, corDoNome } from "./cores";
import { Retrato } from "./retrato";

// Ação do jogador no meio do livro: retrato pequeno, nome do personagem na cor dele, o texto e,
// quando a ação virou teste, "Perícia · Sucesso" no canto.

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
  const foraDoJogo = texto.trim().startsWith("((");
  if (foraDoJogo || (!personagem && !nomeReserva)) {
    return (
      <p className={`surgir my-4 text-center text-sm italic text-muted ${naFila ? "opacity-60" : ""}`}>
        <span className="not-italic text-muted/80">{autor || "Alguém"}, fora do jogo:</span> {texto.replace(/^\(\(|\)\)$/g, "").trim()}
      </p>
    );
  }
  const nome = personagem?.ficha.nome ?? nomeReserva ?? "";
  const cor = corDoNome(nome);
  return (
    <div
      className={`surgir my-5 flex gap-3 rounded-xl border border-border/80 bg-surface/70 p-3 shadow-[0_8px_30px_-18px_black] sm:p-4 ${naFila ? "border-dashed opacity-70" : ""}`}
    >
      {personagem ? (
        <Retrato ficha={personagem.ficha} tamanho={40} />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border text-muted">?</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="min-w-0 truncate text-sm">
            <span className="font-semibold" style={{ color: cor }}>
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
        <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-foreground/90">{texto}</p>
      </div>
    </div>
  );
}
