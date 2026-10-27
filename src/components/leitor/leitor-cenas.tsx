"use client";

import { Fragment, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { emCampoDeTexto } from "@/components/chat/atalhos";
import { Ouvir } from "@/components/voz/voz";
import type { Mensagem } from "@/lib/db";
import { VAO } from "./paginacao";
import { useMenosMovimento, usePreferenciasLeitor } from "./preferencias";
import { agruparTurnos, dividirParagrafos, SEPARADOR, type Turno } from "./turnos";
import { suportaRevelar, useRevelar } from "./use-revelar";

// Leitor cena a cena das duas mesas (modo história e avançado), no lugar da conversa que rola.
// O palco mostra só o turno à vista: a ação do jogador discreta no topo, a narração se revelando aos poucos, os cartões de dado e
// de pedido de teste no ponto em que o mestre os pôs. Turno que não cabe vira páginas (o navegador quebra em colunas, ver
// paginacao.ts); embaixo, a navegação: ◂ cena anterior, "Cena 12 de 15", as páginas, ouvir a página e "continuar ▸".
// Cada mesa entrega como desenhar a prosa, a ação e os cartões; o leitor cuida de agrupar, paginar, revelar e navegar.

export type Prosa = {
  /** classes do bloco de narração (fonte, tamanho, entrelinha) */
  classe: string;
  /** a marcação inline de um parágrafo (negrito, itálico, falas, nomes coloridos) */
  inline: (texto: string, chave: string) => ReactNode;
  /** o enfeite do separador de cena (---) */
  separador: ReactNode;
};

/** Coisas do "agora" que não são mensagens: o mestre pensando, ações na fila, controles da rodada, erro. */
export type BlocoCauda = { chave: string; no: ReactNode };

export type ControleLeitor = {
  /** abre a cena e a página onde está a mensagem (ex.: o pedido de teste) e depois chama `depois` */
  irParaMensagem: (id: number, depois?: () => void) => void;
  irParaAgora: () => void;
};

/** Atalhos do leitor, para a lista do "?". */
export const ATALHOS_LEITOR: [string, string][] = [
  ["← →", "vira a página (cena a cena)"],
  ["Espaço", "mostra o texto todo ou vira a página"],
];

const ESTILO = `
::highlight(leitor-oculto){color:transparent;text-shadow:none}
.leitor-fluxo p{orphans:2;widows:2}
.leitor-fluxo [data-inteiro],.leitor-fluxo [data-cartao],.leitor-topo{break-inside:avoid}
.leitor-topo,.leitor-grudar{break-after:avoid}
.leitor-fluxo [data-cartao]{transition:opacity .45s ease}
.leitor-fluxo [data-leitor-oculto]{visibility:hidden;opacity:0}
@media (prefers-reduced-motion:reduce){.leitor-fluxo [data-cartao]{transition:none}}
`;

/** Ação de jogador no topo da cena: nome e texto em itálico, discretos. Fala fora do jogo ((assim)) vira nota. */
export function AcaoTopo({
  nome,
  cor,
  icone,
  autor,
  texto,
  detalhe,
}: {
  nome: string | null;
  cor?: string;
  icone?: ReactNode;
  autor?: string | null;
  texto: string;
  detalhe?: ReactNode;
}) {
  const t = texto.trim();
  if (t.startsWith("((") || !nome)
    return (
      <p className="mb-2 text-center text-sm italic text-muted">
        <span className="not-italic text-muted/80">{autor || nome || "Alguém"}, fora do jogo:</span> {t.replace(/^\(\(|\)\)$/g, "").trim()}
      </p>
    );
  return (
    <div className="mb-2 border-l-2 border-ambar/40 pl-3" title={t.length > 180 ? t : undefined}>
      <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
        {icone}
        <span className={`truncate font-semibold tracking-wide ${cor ? "" : "text-ambar"}`} style={cor ? { color: cor } : undefined}>
          {nome}
        </span>
        {autor && autor !== nome && <span className="truncate">· {autor}</span>}
        {detalhe && <span className="ml-auto shrink-0">{detalhe}</span>}
      </p>
      <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap break-words text-[0.95rem] italic leading-snug text-foreground/75">{t}</p>
    </div>
  );
}

function BlocoNarracao({ texto, chave, prosa, escrevendo }: { texto: string; chave: string; prosa: Prosa; escrevendo: boolean }) {
  const paragrafos = dividirParagrafos(texto);
  return (
    <div className={`${prosa.classe} my-5 first:mt-0`} data-fixavel>
      {paragrafos.map((p, i) =>
        SEPARADOR.test(p) ? (
          <div key={i} data-cartao aria-hidden className="leitor-grudar">
            {prosa.separador}
          </div>
        ) : (
          <p key={i} data-revelar className={`mb-4 last:mb-0 ${escrevendo && i === paragrafos.length - 1 ? "cursor" : ""}`}>
            {prosa.inline(p, `${chave}-${i}`)}
          </p>
        ),
      )}
      {escrevendo && paragrafos.length === 0 && <p className="cursor" />}
    </div>
  );
}

const contem = (t: Turno, id: number) => t.acoes.some((m) => m.id === id) || t.itens.some((m) => m.id === id);

export function LeitorCenas({
  ref,
  mensagens,
  aoVivo,
  ocupado,
  esperandoNovoTurno,
  prosa,
  acao,
  item,
  cauda,
  vazio,
  largura,
  ferramentas,
  aoMudarFim,
}: {
  ref?: Ref<ControleLeitor>;
  mensagens: Mensagem[];
  /** narração chegando agora (streaming) */
  aoVivo: string;
  ocupado: boolean;
  /** há ações na fila esperando o mestre (fora a abertura e os testes): o "agora" vira uma cena nova */
  esperandoNovoTurno: boolean;
  prosa: Prosa;
  /** uma linha de ação de jogador, para o topo da cena */
  acao: (m: Mensagem) => ReactNode;
  /** cartão de uma mensagem que não é narração nem ação (dado, pedido de teste, cabeçalho de cena, aviso do sistema) */
  item: (m: Mensagem) => ReactNode;
  cauda: BlocoCauda[];
  /** mesa vazia (antes da abertura) */
  vazio?: ReactNode;
  /** classes de largura da coluna (a mesma do campo de ação) */
  largura: string;
  /** botões da última narração (desfazer / outra resposta): na barra, no lugar do "continuar", no fim da cena atual */
  ferramentas?: (turno: Turno) => ReactNode;
  /** a pessoa chegou (ou saiu) do fim da cena atual: última página, toda à vista. As sugestões ganham destaque. */
  aoMudarFim?: (noFim: boolean) => void;
}) {
  const turnos = useMemo(() => agruparTurnos(mensagens), [mensagens]);
  const chaveUltima = turnos.at(-1)?.chave ?? "";

  // ação enviada esperando o mestre: o "agora" vira uma cena nova (fica até a ação virar mensagem, mesmo com o mestre já ocupado)
  const [pendurado, setPendurado] = useState<string | null>(null);
  let pend = pendurado;
  if (pend !== null && (pend !== chaveUltima || (!ocupado && !esperandoNovoTurno))) pend = null;
  if (esperandoNovoTurno && !ocupado) pend = chaveUltima;
  if (pend !== pendurado) setPendurado(pend);
  const mostrarVazio = Boolean(vazio) && turnos.length === 0;
  const exibidos: Turno[] = useMemo(
    () => (pend !== null || turnos.length === 0 ? [...turnos, { chave: `novo-${chaveUltima}`, acoes: [], itens: [] }] : turnos),
    [turnos, pend, chaveUltima],
  );

  // cena à vista (null = acompanha o agora) e página
  const [visto, setVisto] = useState<number | null>(null);
  if (visto !== null && visto >= exibidos.length - 1) setVisto(null);
  const idx = visto === null || visto >= exibidos.length - 1 ? exibidos.length - 1 : visto;
  const noAgora = idx === exibidos.length - 1;
  const turno = exibidos[idx];
  const [pagina, setPagina] = useState(0);
  const [chaveVista, setChaveVista] = useState(turno.chave);
  if (turno.chave !== chaveVista) {
    // cena nova chegou (ou a cena virou outra): começa da primeira página
    setChaveVista(turno.chave);
    setPagina(0);
  }
  /** quantas mensagens havia quando a pessoa saiu do agora (para o aviso "O mestre continuou") */
  const [saida, setSaida] = useState(0);

  // o que já estava na mesa ao abrir aparece inteiro; o que chega nesta sessão se revela
  const [iniciais] = useState(() => new Set(mensagens.map((m) => m.id)));
  const lido = !turno.chave.startsWith("novo") && [...turno.acoes, ...turno.itens].every((m) => iniciais.has(m.id)) && !(noAgora && aoVivo);
  const { animar } = usePreferenciasLeitor();
  const menos = useMenosMovimento();
  const anima = animar && !menos && suportaRevelar();

  const { visor, fluxo, layout, completa, terminou, revelarPagina, revelarAte, paginaDe } = useRevelar({
    chave: turno.chave,
    pagina,
    animar: anima,
    lidoAoAbrir: lido,
    aoPaginaExterna: setPagina,
  });
  const medido = layout.chave === turno.chave;
  const paginas = medido ? layout.paginas : 1;
  if (pagina < 0 && medido) setPagina(paginas - 1);
  const paginaAtual = pagina < 0 ? paginas - 1 : Math.min(pagina, paginas - 1);
  const ultimaPagina = paginaAtual >= paginas - 1;
  const noFim = noAgora && ultimaPagina && completa;

  useEffect(() => {
    aoMudarFim?.(noFim);
  }, [noFim, aoMudarFim]);

  // ---------- navegação ----------

  const irTurno = useCallback(
    (i: number, pag: number) => {
      const alvo = Math.max(0, Math.min(i, exibidos.length - 1));
      if (alvo === exibidos.length - 1) setVisto(null);
      else {
        if (visto === null) setSaida(mensagens.length);
        setVisto(alvo);
      }
      setChaveVista(exibidos[alvo].chave);
      setPagina(pag);
    },
    [exibidos, visto, mensagens.length],
  );
  const irParaAgora = useCallback(() => irTurno(exibidos.length - 1, 0), [irTurno, exibidos.length]);

  /** Espaço, →, clique à direita: primeiro mostra o resto da página; depois vira a página; no fim da cena, vai para a seguinte. */
  const avancar = (direto = false) => {
    if (!completa) {
      revelarPagina();
      if (!direto) return;
    }
    if (paginaAtual < paginas - 1) setPagina(paginaAtual + 1);
    else if (!noAgora) irTurno(idx + 1, 0);
  };
  const voltar = () => {
    if (paginaAtual > 0) setPagina(paginaAtual - 1);
    else if (idx > 0) irTurno(idx - 1, -1);
  };

  // ir até uma mensagem (o pedido de teste): troca de cena, espera medir, acha a página dela e dá por lido até lá
  const pendente = useRef<{ id: number; depois?: () => void } | null>(null);
  const tentarPendente = useCallback(() => {
    const p = pendente.current;
    if (!p || !medido) return;
    const el = fluxo.current?.querySelector(`[data-msg="${p.id}"]`);
    if (!el) return;
    pendente.current = null;
    const k = paginaDe(el);
    revelarAte(k);
    setPagina(k);
    if (p.depois) setTimeout(p.depois, 60);
  }, [medido, paginaDe, revelarAte, fluxo]);
  useEffect(() => tentarPendente());

  useImperativeHandle(ref, () => ({
    irParaMensagem(id, depois) {
      const i = exibidos.findIndex((t) => contem(t, id));
      if (i < 0) return;
      pendente.current = { id, depois };
      if (i !== idx) irTurno(i, 0);
      else tentarPendente();
    },
    irParaAgora,
  }));

  // teclado: ← → PageUp PageDown Espaço Enter (fora de campos de texto, botões e diálogos)
  const teclas = useRef({ avancar, voltar, revelarPagina, completa });
  useEffect(() => {
    teclas.current = { avancar, voltar, revelarPagina, completa };
  });
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.defaultPrevented) return;
      if (emCampoDeTexto(e.target)) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest?.("[role=dialog]")) return;
      const emBotao = Boolean(alvo?.closest?.("button, a, summary, [role=button], [role=radio], [role=tab]"));
      const t = teclas.current;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        t.avancar();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        t.voltar();
      } else if (e.key === " " && !emBotao) {
        e.preventDefault();
        if (!e.repeat) t.avancar();
      } else if (e.key === "Enter" && !emBotao && !t.completa) {
        e.preventDefault();
        t.revelarPagina();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);

  // clique/toque no palco: mostra tudo; com a página inteira à vista, metade direita avança e metade esquerda volta
  function aoClicar(e: React.MouseEvent<HTMLDivElement>) {
    const alvo = e.target as HTMLElement;
    if (alvo.closest("button, a, input, textarea, select, label, summary, [role=button], [role=dialog], [data-cartao], [data-vazio]")) return;
    if (window.getSelection()?.toString()) return;
    if (!completa) {
      revelarPagina();
      return;
    }
    const caixa = e.currentTarget.getBoundingClientRect();
    if (e.clientX >= caixa.left + caixa.width / 2) avancar();
    else if (paginaAtual > 0) setPagina(paginaAtual - 1);
  }
  const toque = useRef<{ x: number; y: number } | null>(null);
  function aoSoltar(e: React.TouchEvent<HTMLDivElement>) {
    const ini = toque.current;
    toque.current = null;
    const t = e.changedTouches[0];
    if (!ini || !t) return;
    const dx = t.clientX - ini.x;
    const dy = t.clientY - ini.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) avancar(true);
    else voltar();
  }

  // ---------- desenho ----------

  const novidade = !noAgora && (mensagens.length > saida || Boolean(aoVivo));
  const maisPaginas = paginaAtual < paginas - 1;
  const textoPagina = medido ? (layout.textos[paginaAtual] ?? "") : "";
  const extras = noFim && ferramentas ? ferramentas(turno) : null;
  const botaoNav =
    "inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-sm text-muted transition hover:text-ambar disabled:pointer-events-none disabled:opacity-30 sm:min-h-9";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" data-leitor>
      <style>{ESTILO}</style>
      <div
        className="relative min-h-0 flex-1"
        onClick={aoClicar}
        onTouchStart={(e) => {
          const t = e.touches[0];
          toque.current = t && e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
        }}
        onTouchEnd={aoSoltar}
        data-palco
      >
        <div className="absolute inset-0 px-4 sm:px-6">
          <div className={`relative mx-auto h-full w-full ${largura}`}>
            <div ref={visor} className="h-full overflow-hidden" data-visor>
              <div
                ref={fluxo}
                className="leitor-fluxo h-full pb-3 pt-4 sm:pt-6"
                style={{ columnCount: 1, columnGap: VAO, columnFill: "auto" }}
                aria-live="off"
                data-fluxo
              >
                {!mostrarVazio && (
                  <>
                    {turno.acoes.length > 0 && (
                      <div className="leitor-topo mb-4">
                        {turno.acoes.map((m) => (
                          <Fragment key={m.id}>{acao(m)}</Fragment>
                        ))}
                      </div>
                    )}
                    {turno.itens.map((m) => {
                      if (m.tipo === "mestre") return <BlocoNarracao key={m.id} texto={m.texto} chave={`m${m.id}`} prosa={prosa} escrevendo={false} />;
                      const no = item(m);
                      if (no === null || no === undefined || no === false) return null;
                      const grudar = (m.dados as { tipo?: string } | null)?.tipo === "cena_titulo";
                      return (
                        <div key={m.id} data-cartao data-msg={m.id} className={grudar ? "leitor-grudar" : undefined}>
                          {no}
                        </div>
                      );
                    })}
                    {noAgora && aoVivo && <BlocoNarracao texto={aoVivo} chave="vivo" prosa={prosa} escrevendo={terminou} />}
                    {noAgora &&
                      cauda.map((c) => (
                        <div key={c.chave} data-cartao>
                          {c.no}
                        </div>
                      ))}

                  </>
                )}
              </div>
            </div>
            {mostrarVazio && (
              <div className="absolute inset-0 overflow-y-auto overscroll-contain" data-vazio>
                {vazio}
              </div>
            )}
          </div>
        </div>
        {novidade && (
          <button
            type="button"
            onClick={irParaAgora}
            className="surgir absolute bottom-3 left-1/2 z-10 min-h-10 -translate-x-1/2 rounded-full border border-ambar/60 bg-surface/95 px-4 text-sm text-ambar shadow-lg backdrop-blur hover:bg-surface-2"
          >
            O mestre continuou ▸
          </button>
        )}
      </div>

      {!mostrarVazio && (
        <nav aria-label="Cenas e páginas" className="relative shrink-0 px-4 sm:px-6" data-nav-leitor>
          <div className={`mx-auto flex w-full ${largura} items-center gap-1 border-t border-border/40 py-1`}>
            <button
              type="button"
              className={`${botaoNav} min-w-10 sm:min-w-32 sm:justify-start`}
              onClick={() => irTurno(idx - 1, 0)}
              disabled={idx === 0}
              title="Cena anterior"
              aria-label="Cena anterior"
              data-cena-anterior
            >
              <span aria-hidden>◂</span>
              <span className="hidden sm:inline">cena anterior</span>
            </button>
            <div className="flex min-h-10 min-w-0 flex-1 flex-col items-center justify-center leading-tight">
              <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted" data-indicador-cena>
                Cena {idx + 1} de {exibidos.length}
                {!noAgora && (
                  <>
                    {" · "}
                    <button type="button" onClick={irParaAgora} className="min-h-6 normal-case tracking-normal text-ambar hover:underline" data-voltar-agora>
                      voltar ao agora
                    </button>
                  </>
                )}
              </p>
              {paginas <= 1 ? (
                <span className="h-5" aria-hidden />
              ) : paginas <= 8 ? (
                  <div className="flex items-center" role="group" aria-label={`Página ${paginaAtual + 1} de ${paginas}`} data-paginas={paginas}>
                    {Array.from({ length: paginas }, (_, k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setPagina(k)}
                        aria-label={`Página ${k + 1} de ${paginas}`}
                        aria-current={k === paginaAtual ? "page" : undefined}
                        className="grid size-5 place-items-center"
                      >
                        <span className={`size-1.5 rounded-full transition ${k === paginaAtual ? "scale-125 bg-ambar" : "bg-muted/50"}`} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="h-5 text-[11px] leading-5 tabular-nums text-muted" data-paginas={paginas}>
                    página {paginaAtual + 1}/{paginas}
                  </p>
                )}
            </div>
            {textoPagina && <Ouvir id={`pagina-${turno.chave}-${paginaAtual}`} texto={textoPagina} fixo />}
            <div className="flex min-w-10 justify-end sm:min-w-32">
              {!completa ? (
                <button type="button" className={botaoNav} onClick={revelarPagina} title="Mostrar o texto todo (Espaço)" aria-label="Mostrar o texto todo" data-mostrar-tudo>
                  <span className="hidden sm:inline">mostrar tudo</span>
                  <span aria-hidden>⏵⏵</span>
                </button>
              ) : maisPaginas ? (
                <button
                  type="button"
                  className={`${botaoNav} font-semibold text-ambar hover:text-ambar`}
                  onClick={() => avancar()}
                  title="Próxima página (→ ou Espaço)"
                  data-continuar
                >
                  <span>continuar</span>
                  <span aria-hidden className="motion-safe:animate-pulse">
                    ▸
                  </span>
                </button>
              ) : !noAgora ? (
                <button type="button" className={botaoNav} onClick={() => irTurno(idx + 1, 0)} title="Cena seguinte (→)" data-cena-seguinte>
                  <span className="hidden sm:inline">cena seguinte</span>
                  <span aria-hidden>▸</span>
                </button>
              ) : (
                extras
              )}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
