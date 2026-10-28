"use client";

import { useRef, useState, type ReactNode } from "react";
import { SugestoesCompactas } from "@/components/chat/sugestoes-compactas";
import { foraDoJogo } from "@/components/leitor/cena";
import { BotaoPerguntar } from "@/components/leitor/pecas";
import type { SugestaoAcao } from "@/lib/sistemas/tipos";

// Rodapé da mesa do modo história, enxuto para o palco ganhar altura: as ações que o mestre sugeriu (linhas baixas no desktop,
// uma linha que abre no celular) e o campo "O que fulano faz?", de uma linha que cresce, com o retrato do personagem ao lado.
// O espaço das sugestões fica reservado enquanto há personagem (com um recado no lugar quando não há sugestão), para o palco
// não mudar de tamanho a cada turno e as páginas não se refazerem no meio da leitura. Enter envia; Shift+Enter quebra a linha.
// O "💬 Perguntar" ao lado do campo manda a mensagem ao mestre entre (( )), fora do jogo (regras, opções, chances).

export function PainelAcao({
  sugestoes,
  mostrarSugestoes,
  bloqueio,
  aoIrParaBloqueio,
  placeholder,
  rotuloCampo,
  enviar,
  inicio,
  recado,
  reservar = true,
  campoRef,
  preencher,
  sugestoesDiscretas = false,
}: {
  sugestoes: SugestaoAcao[];
  mostrarSugestoes: boolean;
  /** motivo para não deixar agir agora ("Role o dado primeiro"); null libera */
  bloqueio: string | null;
  aoIrParaBloqueio?: () => void;
  placeholder: string;
  rotuloCampo: string;
  enviar: (texto: string) => Promise<boolean>;
  /** à esquerda do campo (o retrato do personagem ativo) */
  inicio?: ReactNode;
  /** o que aparece no espaço das sugestões quando não há sugestão (mestre narrando, esperando o grupo...) */
  recado?: ReactNode;
  /** guarda o espaço das sugestões mesmo sem elas (há personagem para agir) */
  reservar?: boolean;
  campoRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** põe um texto no campo (ex.: a ação devolvida depois de desfazer o turno); `n` muda a cada pedido */
  preencher?: { texto: string; n: number } | null;
  /** leitor cena a cena: a pessoa ainda não chegou ao fim da cena */
  sugestoesDiscretas?: boolean;
}) {
  const [texto, setTexto] = useState("");
  // pedido novo de preencher: ajusta o estado durante a renderização (sem efeito), como manda o React
  const [preenchido, setPreenchido] = useState(0);
  if (preencher && preencher.n !== preenchido) {
    setPreenchido(preencher.n);
    setTexto(preencher.texto);
  }
  const [enviando, setEnviando] = useState(false);
  const [perguntar, setPerguntar] = useState(false);
  const proprio = useRef<HTMLTextAreaElement>(null);
  const campo = campoRef ?? proprio;

  async function mandar(t: string, limpar: boolean) {
    const limpo = t.trim();
    if (!limpo || enviando || bloqueio) return;
    // pergunta ao mestre (só o que veio do campo; sugestão é sempre ação)
    const pergunta = limpar && perguntar;
    setEnviando(true);
    try {
      if ((await enviar(pergunta && !foraDoJogo(limpo) ? `(( ${limpo} ))` : limpo)) && limpar) {
        setTexto("");
        setPerguntar(false);
      }
    } finally {
      setEnviando(false);
    }
  }

  const ver = mostrarSugestoes && !bloqueio && sugestoes.length > 0;

  return (
    <div>
      {(ver || reservar) && (
        // três linhas de sugestão no desktop (3 × 28 + 2 × 3), uma no celular; encostadas no campo
        <div className="mb-2 flex min-h-10 flex-col justify-end sm:min-h-[90px]" data-vaga-sugestoes>
          {ver ? (
            <SugestoesCompactas sugestoes={sugestoes} desabilitado={enviando} discretas={sugestoesDiscretas} aoEscolher={(t) => void mandar(t, false)} />
          ) : (
            <div className="flex min-h-10 items-center justify-center gap-3 text-center text-[13px] italic text-muted sm:min-h-7">{recado}</div>
          )}
        </div>
      )}

      {bloqueio ? (
        // a barra inteira leva ao dado (alvo grande no celular); sem destino, é só o aviso
        aoIrParaBloqueio ? (
          <button
            type="button"
            onClick={aoIrParaBloqueio}
            className="surgir group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-ambar/60 bg-ambar/10 px-3 py-1.5 text-left text-sm shadow-[0_0_24px_-12px_var(--ambar)] transition hover:border-ambar hover:bg-ambar/15 focus-visible:border-ambar focus-visible:outline-none"
          >
            <span className="min-w-0 text-ambar">
              <span aria-hidden>🎲 </span>
              {bloqueio}
            </span>
            <span className="shrink-0 rounded-md bg-ambar px-3 py-1.5 text-xs font-semibold text-[#1a120c] transition group-hover:bg-[#f0b762]">
              Ir para o dado ↑
            </span>
          </button>
        ) : (
          <div className="flex min-h-11 items-center gap-3 rounded-lg border border-ambar/50 bg-ambar/10 px-3 py-1.5 text-sm text-ambar" role="status">
            <span aria-hidden>🎲</span> {bloqueio}
          </div>
        )
      ) : (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void mandar(texto, true);
          }}
        >
          {inicio}
          <textarea
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void mandar(texto, true);
              }
            }}
            rows={1}
            maxLength={2000}
            aria-label={perguntar ? "Pergunta ao mestre, fora do jogo" : rotuloCampo}
            placeholder={perguntar ? "Pergunte ao mestre (regras, opções, chances)…" : placeholder}
            className={`campo field-sizing-content max-h-36 min-h-11 flex-1 resize-none bg-surface-2/80 py-2.5 leading-snug ${perguntar ? "border-dashed! border-ambar/60! bg-ambar/5!" : ""}`}
            data-campo-acao
          />
          <BotaoPerguntar
            ligado={perguntar}
            aoAlternar={() => {
              setPerguntar((v) => !v);
              campo.current?.focus();
            }}
          />
          <button
            className="grid size-11 shrink-0 place-items-center rounded-md bg-ambar text-lg text-[#1a120c] shadow-[0_0_24px_-6px_var(--ambar)] transition hover:bg-[#f0b762] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!texto.trim() || enviando}
            aria-label={enviando ? "Enviando" : perguntar ? "Enviar a pergunta" : "Enviar ação"}
            title="Enviar (Enter · Shift+Enter quebra a linha)"
          >
            {enviando ? (
              <span className="pensando text-base" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            ) : (
              "➤"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
