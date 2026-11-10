"use client";

import { useRef, useState, type ReactNode } from "react";
import { SugestoesCompactas } from "@/components/chat/sugestoes-compactas";
import { foraDoJogo } from "@/components/leitor/cena";
import { BotaoPerguntar } from "@/components/leitor/pecas";
import type { SugestaoAcao } from "@/lib/sistemas/tipos";
import { Icone } from "@/components/icones";
import { LIMITE_ACAO, faltam, rotuloFaltam } from "@/components/historia/campo-convite";

// Rodapé da mesa do modo história, enxuto para o palco ganhar altura: as ações que o mestre sugeriu (linhas baixas no desktop,
// uma linha que abre no celular) e o campo "O que fulano faz?", de uma linha que cresce, com o retrato do personagem ao lado.
// O espaço das sugestões fica reservado enquanto há personagem (com um recado no lugar quando não há sugestão), para o palco
// não mudar de tamanho a cada turno e as páginas não se refazerem no meio da leitura. Enter envia; Shift+Enter quebra a linha.
// O botão Perguntar ao lado do campo manda a mensagem ao mestre entre (( )), fora do jogo (regras, opções, chances).
// Quando chega a vez da pessoa, o campo pisca uma vez na cor do tema (convite); perto do limite, um contador aparece
// por cima da borda (vermelho clareado com a cor do texto nos últimos 20: o --sangue puro não dá 4,5:1 no tema da mesa). As duas coisas são só cor, sombra e sobreposição: a altura do painel não muda.

// Só o meio da animação é fixado: o começo e o fim são a borda que o campo já tem (a do foco, se ele estiver em foco),
// então o convite não apaga o realce do foco depois de tocar.
const CSS = `
@keyframes campo-convite{35%{box-shadow:0 0 0 3px color-mix(in srgb,var(--ambar) 30%,transparent);border-color:var(--ambar)}}
.campo-convite{animation:campo-convite 1.4s ease-out 1}
@media (prefers-reduced-motion:reduce){.campo-convite{animation:none}}
.campo-contador-fim{color:color-mix(in srgb,var(--sangue) 60%,var(--foreground))}
`;

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
  desabilitado = false,
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
  /** sem sinal da taverna: o campo continua editável (o texto não se perde), mas nada sai até a conexão voltar */
  desabilitado?: boolean;
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
    if (!limpo || enviando || bloqueio || desabilitado) return;
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
  // é a vez da pessoa: a classe sai quando o mestre volta a narrar e entra de novo no turno seguinte (uma piscada por turno)
  const convite = mostrarSugestoes && !bloqueio && !desabilitado;
  const resta = faltam(texto);

  return (
    <div>
      <style href="taverna-campo" precedence="default">
        {CSS}
      </style>
      {(ver || reservar) && (
        // três linhas de sugestão no desktop (3 × 28 + 2 × 3), uma no celular e na tela baixa (sem altura reservada); encostadas no campo
        <div className="mb-2 flex min-h-10 flex-col justify-end largo:min-h-[90px] baixo:mb-1" data-vaga-sugestoes>
          {ver ? (
            <SugestoesCompactas sugestoes={sugestoes} desabilitado={enviando || desabilitado} discretas={sugestoesDiscretas} aoEscolher={(t) => void mandar(t, false)} />
          ) : (
            <div className="flex min-h-10 items-center justify-center gap-3 text-center text-[13px] italic text-muted largo:min-h-7">{recado}</div>
          )}
        </div>
      )}

      {/* a barra de "role o dado" fica por cima do campo, que continua no lugar (invisível e inerte): a altura do painel não muda
          quando o dado chega nem quando é rolado; senão o palco do leitor encolhia uns pixels e o cartão, encolhido na medida da
          página, pulava para a página seguinte no meio da rolagem */}
      <div className="relative">
        {bloqueio && (
          <div className="absolute inset-0 flex" data-bloqueio>
            {/* a barra inteira leva ao dado (alvo grande no celular); sem destino, é só o aviso */}
            {aoIrParaBloqueio ? (
              <button
                type="button"
                onClick={aoIrParaBloqueio}
                className="surgir group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-ambar/60 bg-ambar/10 px-3 py-1.5 text-left text-sm shadow-[0_0_24px_-12px_var(--ambar)] transition hover:border-ambar hover:bg-ambar/15 focus-visible:border-ambar focus-visible:outline-none"
              >
                <span className="min-w-0 text-ambar">
                  <Icone nome="dice" />
                  {bloqueio}
                </span>
                <span className="shrink-0 rounded-md bg-botao px-3 py-1.5 text-xs font-semibold text-botao-texto transition group-hover:bg-botao-hover">
                  Ir para o dado <Icone nome="arrowUp" />
                </span>
              </button>
            ) : (
              <div className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-ambar/50 bg-ambar/10 px-3 py-1.5 text-sm text-ambar" role="status">
                <Icone nome="dice" /> {bloqueio}
              </div>
            )}
          </div>
        )}
        <form
          className={`flex items-end gap-2 ${bloqueio ? "invisible" : ""}`}
          inert={bloqueio ? true : undefined}
          aria-hidden={bloqueio ? true : undefined}
          onSubmit={(e) => {
            e.preventDefault();
            void mandar(texto, true);
          }}
        >
          {inicio}
          {/* o invólucro só existe para o contador ficar por cima da borda; é flex para o campo seguir sendo item flex (sem a
              folga de linha de um inline-block), então a altura da linha é a mesma de antes */}
          <div className="relative flex min-w-0 flex-1">
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
              maxLength={LIMITE_ACAO}
              aria-label={perguntar ? "Pergunta ao mestre, fora do jogo" : rotuloCampo}
              placeholder={perguntar ? "Pergunte ao mestre (regras, opções, chances)…" : placeholder}
              className={`campo field-sizing-content max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-surface-2/80 py-2.5 leading-snug ${convite ? "campo-convite" : ""} ${perguntar ? "border-dashed! border-ambar/60! bg-ambar/5!" : ""}`}
              data-campo-acao
            />
            {resta !== null && (
              <span
                className={`pointer-events-none absolute -top-2 right-2 rounded-full border bg-surface px-1.5 text-[11px] leading-4 ${resta <= 20 ? "campo-contador-fim border-sangue" : "border-border text-muted"}`}
                aria-live="polite"
              >
                {rotuloFaltam(resta)}
              </span>
            )}
          </div>
          <BotaoPerguntar
            ligado={perguntar}
            aoAlternar={() => {
              setPerguntar((v) => !v);
              campo.current?.focus();
            }}
          />
          <button
            className="grid size-11 shrink-0 place-items-center rounded-md bg-botao text-lg text-botao-texto shadow-[0_0_24px_-6px_var(--botao)] transition hover:bg-botao-hover disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!texto.trim() || enviando || desabilitado}
            aria-label={enviando ? "Enviando" : perguntar ? "Enviar a pergunta" : "Enviar ação"}
            title={desabilitado ? "Sem sinal da taverna: espere a conexão voltar" : "Enviar (Enter · Shift+Enter quebra a linha)"}
          >
            {enviando ? (
              <span className="pensando text-base" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            ) : (
              <Icone nome="send" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
