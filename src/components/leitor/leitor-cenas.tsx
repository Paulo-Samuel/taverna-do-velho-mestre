"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { emCampoDeTexto } from "@/components/chat/atalhos";
import { Ouvir } from "@/components/voz/voz";
import type { Mensagem } from "@/lib/db";
import { contarChips, dadosFimSessao, foraDoJogo, montarCena, paragrafosDaNarracao, rastrearMudancas, separarFecho, type GrupoChips, type Paragrafo, type Peca } from "./cena";
import { Mudancas } from "./mudancas";
import { rumoAoDado, VAO } from "./paginacao";
import { Aparte, FimDaNoite, linhasDoAparte } from "./pecas";
import { CONSULTA_LARGO, useConsulta, useMenosMovimento, usePreferenciasLeitor } from "./preferencias";
import { capitularCabe, EstiloProsa } from "./prosa";
import { agruparTurnos, SEPARADOR, type Turno } from "./turnos";
import { suportaRevelar, useRevelar, type Transicao } from "./use-revelar";
import { Icone, TextoComIcones } from "@/components/icones";

// Leitor cena a cena das duas mesas (modo história e avançado), no lugar da conversa que rola.
// O palco é sempre a cena atual (o último turno): a ação do jogador discreta no topo, a narração se revelando aos poucos, os
// cartões de dado e de pedido de teste no ponto em que o mestre os pôs. Cena que não cabe vira páginas (o navegador quebra em
// colunas, ver paginacao.ts); embaixo, uma barra mínima: os pontinhos das páginas no meio, "continuar" e ouvir à direita, e
// à esquerda o "reler a história" (o Livro da campanha) e, no fim da cena, desfazer/outra resposta. Cenas antigas não voltam
// ao palco: para reler há o Livro e o modo 📜 Rolagem do menu de leitura.
// Cada mesa entrega como desenhar a prosa, a ação e os cartões; o leitor cuida de agrupar, paginar, revelar e virar a página.
// A cena é montada em cena.ts: as narrações seguidas viram uma prosa só (os "é a sua vez" redundantes saem), os ((apartes)) do
// mestre ganham caixa própria e as linhas de ficha/diário/XP viram os chips de "o que mudou na cena", que ficam fora do fluxo
// paginado, numa faixa fina acima da barra (nenhuma página fica só com um chip; página própria só o "Fim da noite").
// O teste pendente de quem joga aqui (`destaque`) nunca fica escondido em outra página: o cartão encolhe ou vira a versão compacta
// para caber na página atual (paginacao.ts) e, se ainda assim cair na seguinte, a barra chama ("continuar para o dado") e o
// leitor avança sozinho quando a página termina de se revelar.
// Tela baixa (variante `baixo:` do Tailwind, altura até 600 px): barra de 28 px, ação numa linha, menos respiro.

export type Prosa = {
  /** classes extras do bloco de narração (cor do texto); o tamanho e a entrelinha vêm do .leitor-prosa */
  classe: string;
  /** a marcação inline de um parágrafo (negrito, itálico, falas, nomes coloridos) */
  inline: (texto: string, chave: string) => ReactNode;
  /** o enfeite do separador de cena (---) */
  separador: ReactNode;
  /** símbolo do enfeite (sem ele, o --ornamento do tema): fim da noite */
  simbolo?: string;
  /** cor do nome de um personagem (os chips de "o que mudou") */
  corDe?: (nome: string) => string | undefined;
};

/** Coisas do "agora" que não são mensagens: o mestre pensando, ações na fila, controles da rodada, erro. */
export type BlocoCauda = { chave: string; no: ReactNode };

export type ControleLeitor = {
  /** abre a página onde está a mensagem da cena atual (ex.: o pedido de teste) e depois chama `depois` */
  irParaMensagem: (id: number, depois?: () => void) => void;
};

/** Atalhos do leitor, para a lista do "?". */
export const ATALHOS_LEITOR: [string, string][] = [
  ["← →", "vira a página da cena"],
  ["Espaço", "mostra o texto todo ou vira a página"],
];

const ESTILO = `
::highlight(leitor-oculto){color:transparent;text-shadow:none}
.leitor-fluxo p{orphans:2;widows:2}
.leitor-fluxo [data-inteiro],.leitor-fluxo [data-cartao],.leitor-topo{break-inside:avoid}
.leitor-topo,.leitor-grudar{break-after:avoid}
.leitor-fluxo [data-cartao]{transition:opacity .22s ease}
.leitor-fluxo [data-leitor-oculto]{visibility:hidden;opacity:0}
.leitor-fluxo [data-compacto]:not([data-compacto="não"])>*{margin-top:.6rem!important;margin-bottom:.6rem!important}
.leitor-fluxo [data-versao-compacta] .pedido-teste{padding-top:.5rem;padding-bottom:.7rem}
.leitor-fluxo [data-versao-compacta] [data-pd-retrato]{display:none}
.leitor-fluxo [data-versao-compacta] [data-pd-titulo]{margin-top:.1rem;font-size:1.1rem}
.leitor-fluxo [data-versao-compacta] [data-pd-chips]{margin-top:.35rem}
.leitor-fluxo [data-versao-compacta] [data-pd-motivo]{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden;margin-top:.3rem;font-size:.85rem}
.leitor-fluxo [data-versao-compacta] [data-pd-dados]{margin-top:.35rem;min-height:0;zoom:.72}
.leitor-fluxo [data-versao-compacta] [data-pd-rodape]{margin-top:.5rem}
.leitor-fluxo [data-versao-compacta] [data-rolar]{margin-top:.5rem;min-height:2.25rem}
@media (max-height:600px){[data-nav-leitor] button,[data-nav-leitor] a{min-height:1.75rem}}
@keyframes leitor-chamar{0%,100%{opacity:.55;transform:none}50%{opacity:1;transform:translateX(2px)}}
.leitor-chamar{animation:leitor-chamar 2.2s ease-in-out infinite}
@keyframes leitor-virar{from{opacity:.6;transform:translateX(var(--virar,6px))}to{opacity:1;transform:none}}
@keyframes leitor-virar-b{from{opacity:.6;transform:translateX(var(--virar,6px))}to{opacity:1;transform:none}}
.leitor-virar{animation:leitor-virar .18s ease-out}
.leitor-virar[data-virada="b"]{animation-name:leitor-virar-b}
@media (prefers-reduced-motion:reduce){.leitor-fluxo [data-cartao]{transition:none}.leitor-chamar{animation:none}.leitor-virar,.leitor-virar[data-virada="b"]{animation:none}}
`;

/**
 * Ação de jogador no topo da cena: uma linha fina com o retrato, o nome em versalete e a ação em itálico, sem competir com a
 * narração. Fala fora do jogo ((assim)) vira nota.
 */
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
  if (foraDoJogo(t) || !nome)
    return (
      <Aparte quem={autor || nome || "Alguém"} className="my-0! text-[0.92rem]">
        <p>{t.replace(/^\(\(|\)\)$/g, "").trim()}</p>
      </Aparte>
    );
  return (
    <div className="flex min-w-0 flex-wrap items-start gap-x-2.5 gap-y-1 text-[0.92rem] leading-snug sm:flex-nowrap" title={t.length > 160 ? t : undefined}>
      {icone && <span className="mt-px shrink-0 opacity-90">{typeof icone === "string" ? <TextoComIcones texto={icone} /> : icone}</span>}
      <p className="line-clamp-2 min-w-0 flex-1 break-words text-foreground/75 baixo:line-clamp-1">
        <span
          className={`font-semibold tracking-[0.06em] [font-variant-caps:all-small-caps] ${cor ? "" : "text-ambar"}`}
          style={cor ? { color: cor } : undefined}
        >
          {nome}
        </span>
        {autor && autor !== nome && <span className="text-xs text-muted"> ({autor})</span>}
        <span className="text-muted">:</span>{" "}
        <span className="italic">{t}</span>
      </p>
      {/* o teste que a ação virou: no canto no desktop, numa linha própria no celular (a ação não fica espremida) */}
      {detalhe && <span className={`mt-0.5 shrink-0 text-xs max-sm:w-full ${icone ? "max-sm:pl-8" : ""}`}>{detalhe}</span>}
    </div>
  );
}

function BlocoNarracao({
  paragrafos,
  chave,
  prosa,
  escrevendo,
  capitular,
  continua = false,
}: {
  paragrafos: Paragrafo[];
  chave: string;
  prosa: Prosa;
  escrevendo: boolean;
  /** primeiro bloco da cena: o primeiro parágrafo de narração (não o aparte) ganha capitular (se couber) */
  capitular: boolean;
  /** continua a prosa anterior (texto ao vivo depois da narração): sem o respiro de bloco novo */
  continua?: boolean;
}) {
  const primeira = capitular ? paragrafos.findIndex((p) => !p.aparte && !SEPARADOR.test(p.texto)) : -1;
  const comCapitular = primeira >= 0 && capitularCabe(paragrafos[primeira].texto);
  return (
    <div className={`leitor-prosa ${prosa.classe} ${continua ? "mb-6 mt-[0.9em]" : "my-6"} first:mt-0`} data-fixavel>
      {paragrafos.map((p, i) => {
        const k = `${chave}-${i}`;
        // aparte ((fora do jogo)): caixa própria, aparece inteira quando o texto chega nela e fica fora do "ouvir"
        if (p.aparte)
          return (
            <div key={k} data-cartao data-aparte>
              <Aparte>{linhasDoAparte(p.texto, prosa.inline, k)}</Aparte>
            </div>
          );
        if (SEPARADOR.test(p.texto))
          return (
            <div key={k} data-cartao aria-hidden className="leitor-grudar">
              {prosa.separador}
            </div>
          );
        return (
          <p
            key={k}
            data-revelar
            data-capitular={comCapitular && i === primeira ? "" : undefined}
            className={`${comCapitular && i === primeira ? "leitor-capitular" : ""} ${escrevendo && i === paragrafos.length - 1 ? "cursor" : ""}`}
          >
            {prosa.inline(p.texto, k)}
          </p>
        );
      })}
      {escrevendo && paragrafos.length === 0 && <p className="cursor" />}
    </div>
  );
}

/**
 * "O que mudou na cena" fora do fluxo paginado: uma faixa fina entre o palco e a barra de páginas, com os grupos de chips em
 * linha. Aberta por padrão no desktop (tela larga e alta), recolhida no celular e na tela baixa; o rótulo alterna. Os chips só
 * aparecem quando a cena terminou de se revelar; antes, o espaço já fica reservado, para a página não mudar de tamanho no fim.
 */
function FaixaMudancas({
  grupos,
  corDe,
  largura,
  revelados,
}: {
  grupos: GrupoChips[];
  corDe?: (nome: string) => string | undefined;
  largura: string;
  revelados: boolean;
}) {
  const largo = useConsulta(CONSULTA_LARGO);
  const [manual, setManual] = useState<boolean | null>(null);
  const aberta = manual ?? largo;
  const total = contarChips(grupos);
  return (
    <div className="relative shrink-0 px-3 sm:px-6" data-faixa-mudancas={aberta ? "aberta" : "recolhida"}>
      <div className={`mx-auto flex w-full items-start gap-x-3 ${largura}`}>
        <button
          type="button"
          onClick={() => setManual(!aberta)}
          aria-expanded={aberta}
          className="relative flex min-h-7 shrink-0 items-center gap-1.5 whitespace-nowrap before:absolute before:-inset-x-1 before:-inset-y-1.5 sm:before:hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-muted transition hover:text-ambar"
          title={aberta ? "Recolher o que mudou na cena" : "Mostrar o que mudou na cena"}
        >
          <span>O que mudou</span>
          <span className="tabular-nums tracking-normal text-muted/70">· {total}</span>
          <Icone nome="chevronDown" className={`transition-transform motion-reduce:transition-none ${aberta ? "" : "-rotate-90"}`} />
        </button>
        {aberta && (
          <div className="relative min-w-0 flex-1 py-0.5">
            <Mudancas grupos={grupos} corDe={corDe} variante="faixa" className={revelados ? "" : "leitor-mudancas-oculta"} />
            {!revelados && (
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-xs italic text-muted/70" aria-hidden>
                …no fim da cena
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Ícone do "reler a história" (rolo de pergaminho). */
function IconeReler() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 4h11a2 2 0 0 1 0 4H7M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 0-4H7" fill="currentColor" fillOpacity={0.12} />
      <path d="M9 11h6M9 13.5h4" />
    </svg>
  );
}

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
  linkReler,
  transicao = "deslizar",
  destaque = null,
}: {
  ref?: Ref<ControleLeitor>;
  mensagens: Mensagem[];
  /** narração chegando agora (streaming) */
  aoVivo: string;
  ocupado: boolean;
  /** há ações na fila esperando o mestre (fora a abertura e os testes): o palco vira uma cena nova */
  esperandoNovoTurno: boolean;
  prosa: Prosa;
  /** uma linha de ação de jogador, para o topo da cena */
  acao: (m: Mensagem) => ReactNode;
  /** cartão de uma mensagem que não é narração nem ação (dado, pedido de teste, cabeçalho de cena, aviso do sistema) */
  item: (m: Mensagem) => ReactNode;
  cauda: BlocoCauda[];
  /** mesa vazia (antes da abertura) */
  vazio?: ReactNode;
  /** classes de largura da coluna (a mesma do compositor) */
  largura: string;
  /** botões da última narração (desfazer / outra resposta): à esquerda da barra, no fim da cena */
  ferramentas?: (turno: Turno) => ReactNode;
  /** a pessoa chegou (ou saiu) do fim da cena: última página, toda à vista. As sugestões ganham destaque. */
  aoMudarFim?: (noFim: boolean) => void;
  /** endereço para reler a história inteira (o Livro da campanha) */
  linkReler?: string;
  /** como a página vira: deslizando (avançado) ou como folha de livro (modo história) */
  transicao?: Transicao;
  /** id do teste pendente de quem joga neste aparelho: o leitor cuida para ele não ficar escondido em outra página */
  destaque?: number | null;
}) {
  const turnos = useMemo(() => agruparTurnos(mensagens), [mensagens]);
  // o que cada linha de ficha/diário/XP mudou precisa da história inteira (a ficha manda só o valor novo)
  const rastro = useMemo(() => rastrearMudancas(mensagens), [mensagens]);
  const chaveUltima = turnos.at(-1)?.chave ?? "";

  // ação enviada esperando o mestre: o palco vira uma cena nova (fica até a ação virar mensagem, mesmo com o mestre já ocupado)
  const [pendurado, setPendurado] = useState<string | null>(null);
  let pend = pendurado;
  if (pend !== null && (pend !== chaveUltima || (!ocupado && !esperandoNovoTurno))) pend = null;
  if (esperandoNovoTurno && !ocupado) pend = chaveUltima;
  if (pend !== pendurado) setPendurado(pend);
  const mostrarVazio = Boolean(vazio) && turnos.length === 0;
  const turno: Turno = useMemo(
    () => (pend !== null || turnos.length === 0 ? { chave: `novo-${chaveUltima}`, acoes: [], itens: [] } : turnos[turnos.length - 1]),
    [turnos, pend, chaveUltima],
  );

  // página da cena atual; cena nova (ou a cena virou outra) começa da primeira
  const [pagina, setPagina] = useState(0);
  const [chaveVista, setChaveVista] = useState(turno.chave);
  if (turno.chave !== chaveVista) {
    setChaveVista(turno.chave);
    setPagina(0);
  }

  // o que já estava na mesa ao abrir aparece inteiro; o que chega nesta sessão se revela
  const [iniciais] = useState(() => new Set(mensagens.map((m) => m.id)));
  const lido = !turno.chave.startsWith("novo") && [...turno.acoes, ...turno.itens].every((m) => iniciais.has(m.id)) && !aoVivo;
  // fonte, coluna e entrelinha entram aqui de propósito: trocar qualquer uma renderiza o leitor de novo, e o useRevelar mede
  // (e repagina) depois de cada render. A coluna ainda mexe na largura do visor; a entrelinha só na altura do texto.
  const { animar, fonte, coluna, entrelinha } = usePreferenciasLeitor();
  const menos = useMenosMovimento();
  const anima = animar && !menos && suportaRevelar();
  // a cena fecha a noite (tem o marcador de fim): ver o efeito "abre na última página" abaixo
  const fechaNoite = turno.itens.some((m) => dadosFimSessao(m) !== null);
  const releuNoFim = useRef("");

  const { visor, fluxo, layout, completa, terminou, revelarPagina, revelarAte, paginaDe } = useRevelar({
    chave: turno.chave,
    pagina,
    animar: anima,
    lidoAoAbrir: lido,
    aoPaginaExterna: setPagina,
    transicao,
    destaque: turno.itens.some((m) => m.id === destaque) ? destaque : null,
  });
  const medido = layout.chave === turno.chave;
  const paginas = medido ? layout.paginas : 1;
  const paginaAtual = Math.min(pagina, paginas - 1);
  const maisPaginas = paginaAtual < paginas - 1;

  // virada de página: um sinal só e curto (.leitor-virar, 180 ms, opacidade + 6 px do lado de onde a folha vem). Conta as
  // viradas da cena para a animação recomeçar a cada troca; cena nova zera (ela já entra com o próprio esmaecer).
  const [virada, setVirada] = useState({ chave: turno.chave, pagina: paginaAtual, n: 0, dir: 1 });
  if (virada.chave !== turno.chave || virada.pagina !== paginaAtual) {
    const mesmaCena = virada.chave === turno.chave;
    setVirada({ chave: turno.chave, pagina: paginaAtual, n: mesmaCena ? virada.n + 1 : 0, dir: paginaAtual >= virada.pagina ? 1 : -1 });
  }
  // a transição antiga do useRevelar (280/440 ms, por script, no mesmo visor) passaria por cima da folha de estilo: sai de cena
  // para sobrar um ritmo só. Ele trata o cancelamento como fim e mede de novo. Só opacidade e transform: a conta não muda.
  // Sem dependências de propósito: o useRevelar decide a virada pela medida dele, que pode andar sem a contagem daqui mudar.
  useLayoutEffect(() => {
    for (const a of visor.current?.getAnimations?.() ?? []) if (!("animationName" in a)) a.cancel();
  });
  const noFim = !maisPaginas && completa;

  useEffect(() => {
    aoMudarFim?.(noFim);
  }, [noFim, aoMudarFim]);

  // o teste pendente de quem joga aqui caiu numa página adiante: a barra chama e, com a página revelada, o leitor avança sozinho
  // (uma página por vez, para não pular texto; a cena já lida ao abrir vai direto ao dado). Cada página avança uma vez só: quem
  // volta para reler não é empurrado de novo.
  const paginaDoDestaque = medido ? layout.paginaDestaque : null;
  const rumo = rumoAoDado({ paginaDoDestaque, paginaAtual, completa, automatico: anima || lido });
  const aoDado = rumo !== "nada";
  const autoAvancado = useRef("");
  useEffect(() => {
    if (rumo !== "avancar" || paginaDoDestaque === null) return;
    const marca = `${turno.chave}:${destaque}:${paginaAtual}`;
    if (autoAvancado.current === marca) return;
    const t = setTimeout(() => {
      autoAvancado.current = marca;
      const alvo = lido ? paginaDoDestaque : Math.min(paginaDoDestaque, paginaAtual + 1);
      revelarAte(alvo - 1);
      setPagina(alvo);
    }, 700);
    return () => clearTimeout(t);
  }, [rumo, paginaDoDestaque, paginaAtual, turno.chave, destaque, lido, revelarAte]);
  // a cena termina com o fim da noite (lida ao abrir ou com o marcador chegando ao vivo): o leitor vai à última página, onde
  // ficam o marcador e o "Reabrir a noite". Acompanha a medição (o número de páginas cresce enquanto o layout assenta), mas
  // quem volta à mão para reler as páginas anteriores não é puxado de novo nesta cena.
  useEffect(() => {
    if (!fechaNoite || !medido || paginas <= 1 || paginaAtual >= paginas - 1 || releuNoFim.current === turno.chave) return;
    revelarAte(paginas - 2);
    setPagina(paginas - 1);
  }, [fechaNoite, medido, paginas, paginaAtual, turno.chave, revelarAte]);
  /** O "continuar para o dado": vai direto à página do cartão, dando por lido o que vem antes. */
  const seguirAoDado = () => {
    if (paginaDoDestaque === null) return avancar();
    revelarAte(paginaDoDestaque - 1);
    setPagina(paginaDoDestaque);
  };

  // ---------- páginas ----------

  /** Espaço, →, clique à direita: primeiro mostra o resto da página; depois vira a página. */
  const avancar = (direto = false) => {
    if (!completa) {
      revelarPagina();
      if (!direto) return;
    }
    if (maisPaginas) setPagina(paginaAtual + 1);
  };
  const voltar = () => {
    if (fechaNoite) releuNoFim.current = turno.chave;
    if (paginaAtual > 0) setPagina(paginaAtual - 1);
  };

  // ir até uma mensagem da cena (o pedido de teste): espera medir, acha a página dela e dá por lido até lá
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
      if (!turno.itens.some((m) => m.id === id)) return;
      pendente.current = { id, depois };
      tentarPendente();
    },
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
      // o "Anteriormente" aberto por cima: as teclas não viram a página que está atrás do véu
      if (document.querySelector("[data-anteriormente-veu]")) return;
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
    else voltar();
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

  const textoPagina = medido ? (layout.textos[paginaAtual] ?? "") : "";
  const extras = noFim && ferramentas ? ferramentas(turno) : null;
  const botaoNav =
    "inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-sm text-muted transition hover:text-ambar disabled:pointer-events-none disabled:opacity-0 sm:min-h-9 baixo:min-h-7";
  const cena = useMemo(() => montarCena(turno, rastro), [turno, rastro]);
  const { corpo, fecho } = separarFecho(cena.pecas);
  // a capitular vai no primeiro parágrafo da primeira narração da cena
  const primeiraProsa = cena.pecas.find((p) => p.tipo === "prosa")?.chave ?? null;
  const ultimaPeca = corpo.at(-1);
  /** uma peça da cena: prosa contínua, fim da noite ou o cartão que a mesa desenha */
  const desenharPeca = (p: Peca) => {
    if (p.tipo === "prosa")
      return <BlocoNarracao key={p.chave} paragrafos={p.paragrafos} chave={p.chave} prosa={prosa} escrevendo={false} capitular={p.chave === primeiraProsa} />;
    const m = p.m;
    const fim = dadosFimSessao(m);
    if (fim)
      return (
        <div key={m.id} data-cartao data-msg={m.id} data-fecho>
          <FimDaNoite sessao={fim.sessao} data={fim.data} simbolo={prosa.simbolo} />
        </div>
      );
    const no = item(m);
    if (no === null || no === undefined || no === false) return null;
    const grudar = (m.dados as { tipo?: string } | null)?.tipo === "cena_titulo";
    return (
      <div key={m.id} data-cartao data-msg={m.id} className={grudar ? "leitor-grudar" : undefined} data-compactavel={grudar ? undefined : ""}>
        {no}
      </div>
    );
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" data-leitor>
      <style>{ESTILO}</style>
      <EstiloProsa />
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
        <div className="absolute inset-0 px-5 sm:px-6">
          <div className={`relative mx-auto h-full w-full ${largura}`}>
            <div
              ref={visor}
              className={`h-full overflow-hidden ${virada.n ? "leitor-virar" : ""}`}
              style={{ "--virar": `${virada.dir * 6}px` } as CSSProperties}
              data-virada={virada.n % 2 ? "a" : "b"}
              data-ajuste={`${fonte}-${coluna}-${entrelinha}`}
              data-visor
            >
              <div
                ref={fluxo}
                className="leitor-fluxo h-full pb-4 [--respiro:1rem] sm:[--respiro:1.75rem] baixo:pb-2 baixo:[--respiro:0.75rem]"
                style={{ columnCount: 1, columnGap: VAO, columnFill: "auto", paddingTop: "calc(var(--respiro) + var(--folga, 0px))" }}
                aria-live="off"
                data-fluxo
              >
                {!mostrarVazio && (
                  <>
                    {turno.acoes.length > 0 && (
                      <div className="leitor-topo mb-6 sm:mb-7 baixo:mb-3">
                        <div className="space-y-1.5">
                          {turno.acoes.map((m) => (
                            <Fragment key={m.id}>{acao(m)}</Fragment>
                          ))}
                        </div>
                        <div className="mt-3 h-px bg-linear-to-r from-border/80 via-border/30 to-transparent" aria-hidden />
                      </div>
                    )}
                    {corpo.map(desenharPeca)}
                    {aoVivo && (
                      <BlocoNarracao
                        paragrafos={paragrafosDaNarracao(aoVivo, -1)}
                        chave="vivo"
                        prosa={prosa}
                        escrevendo={terminou}
                        capitular={primeiraProsa === null}
                        continua={ultimaPeca?.tipo === "prosa"}
                      />
                    )}
                    {fecho.map(desenharPeca)}
                    {cauda.map((c) => (
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
      </div>

      {/* os chips de "o que mudou" fora do fluxo paginado: nenhuma página fica só com um chip */}
      {!mostrarVazio && cena.mudancas.length > 0 && <FaixaMudancas grupos={cena.mudancas} corDe={prosa.corDe} largura={largura} revelados={terminou} />}

      {!mostrarVazio && (
        <nav aria-label="Páginas da cena" className="relative shrink-0 px-3 sm:px-6" data-nav-leitor>
          <div className={`relative mx-auto grid w-full ${largura} grid-cols-[1fr_auto_1fr] items-center gap-1`}>
            <div className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-border/50 to-transparent" aria-hidden />
            <div className="flex min-w-0 flex-nowrap items-center gap-0.5 justify-self-start [&_[role=group]]:flex-nowrap">
              {linkReler && (
                <Link
                  href={linkReler}
                  className={`${botaoNav} -ml-1 text-muted/80`}
                  title="Reler a história inteira (Livro da campanha). Também dá para ler tudo rolando: Rolagem, no menu de leitura."
                  aria-label="Reler a história"
                  data-reler
                >
                  <IconeReler />
                  {!extras && <span className="hidden text-xs md:inline">reler</span>}
                </Link>
              )}
              {extras}
            </div>
            {/* no celular a barra tem sempre 44 px (a altura da pílula "continuar"): ela sumir na última página não pode mexer no palco */}
            <div className="flex min-h-11 items-center justify-self-center sm:min-h-9 baixo:min-h-7">
              {paginas > 1 && (
                <button type="button" className={`${botaoNav} min-w-8 px-1`} onClick={voltar} disabled={paginaAtual === 0} title="Página anterior (←)" aria-label="Página anterior">
                  <Icone nome="arrowRight" className="rotate-180" />
                </button>
              )}
              {paginas <= 1 ? null : paginas <= 8 ? (
                // no celular os pontinhos têm 28 px e um respiro entre si (alvo de toque); no desktop, 24 px juntos
                <div className="flex items-center gap-0.5 sm:gap-0" role="group" aria-label={`Página ${paginaAtual + 1} de ${paginas}`} data-paginas={paginas}>
                  {Array.from({ length: paginas }, (_, k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (fechaNoite && k < paginaAtual) releuNoFim.current = turno.chave;
                        setPagina(k);
                      }}
                      aria-label={`Página ${k + 1} de ${paginas}`}
                      aria-current={k === paginaAtual ? "page" : undefined}
                      className="group relative grid size-7 place-items-center rounded focus-visible:outline-2 focus-visible:outline-ambar before:absolute before:inset-x-0 before:-inset-y-1.5 sm:size-6 sm:before:hidden"
                    >
                      <span
                        className={`block rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none ${
                          k === paginaAtual ? "h-1.5 w-4 bg-ambar" : "size-1.5 bg-muted/40 group-hover:bg-muted/80"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-1 text-[11px] tabular-nums tracking-wider text-muted" data-paginas={paginas}>
                  {paginaAtual + 1} / {paginas}
                </p>
              )}
            </div>
            <div className="flex min-w-0 items-center justify-end gap-0.5 justify-self-end">
              {textoPagina && <Ouvir id={`pagina-${turno.chave}-${paginaAtual}`} texto={textoPagina} fixo className="text-[11px]" />}
              {!completa ? (
                <button type="button" className={`${botaoNav} text-muted/80`} onClick={revelarPagina} title="Mostrar o texto todo (Espaço)" aria-label="Mostrar o texto todo" data-mostrar-tudo>
                  <span className="hidden text-xs md:inline">mostrar tudo</span>
                  <Icone nome="fastForward" />
                </button>
              ) : maisPaginas ? (
                // pílula âmbar em todas as larguras (36 px desenhados no celular, 32 no desktop; o alvo de toque completa a barra de
                // 44 px pelo pseudo-elemento); quando o dado está adiante, ela chama mais forte
                <button
                  type="button"
                  className={`${botaoNav} relative min-h-9! rounded-full! border px-3.5! text-ambar hover:bg-ambar/15 hover:text-ambar focus-visible:outline-2 focus-visible:outline-ambar before:absolute before:-inset-x-1 before:-inset-y-1 sm:min-h-8! sm:before:hidden baixo:min-h-7! ${
                    aoDado ? "border-ambar/70 bg-ambar/15" : "border-ambar/50 bg-ambar/10"
                  }`}
                  onClick={aoDado ? seguirAoDado : () => avancar()}
                  title={
                    !aoDado
                      ? "Próxima página (→ ou Espaço)"
                      : paginaDoDestaque === paginaAtual + 1
                        ? "O dado está na próxima página (→ ou Espaço)"
                        : "O dado está mais adiante: vai direto à página dele (→ ou Espaço viram uma página por vez)"
                  }
                  data-continuar={aoDado ? "dado" : "pagina"}
                >
                  {aoDado ? (
                    <>
                      <span className="max-sm:hidden">continuar para o dado</span>
                      <span className="sm:hidden">ir ao dado</span>
                    </>
                  ) : (
                    <span>continuar</span>
                  )}
                  <span aria-hidden className="leitor-chamar inline-flex leading-none">
                    <Icone nome="arrowRight" />
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
