"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Musica } from "@/components/historia/musica";
import { MenuLeitura } from "@/components/leitor/menu-leitura";
import { Convite } from "@/components/presenca/convite";
import { Presenca } from "@/components/presenca/presenca";
import { IconeLua, remorsoUrgente } from "@/components/sessao/encerrar-noite";
import { BotaoVoz, LinhaVoz } from "@/components/voz/voz";
import type { AcoesMesa, Mesa } from "@/lib/cliente/use-mesa";
import { dadosDoTema } from "@/lib/temas";

// Cabeçalho único das duas mesas (avançada e modo história): os mesmos botões, sempre na mesma ordem —
// voltar · título (duas linhas no celular) · presença · Convidar · Som · Ler · Voz · Livro · ⚙ · 🌙 Encerrar · ⋯ · painel.
// Todo botão é o mesmo quadrado de 40x40 com ícone SVG (utilitário botao-cabecalho). O que não cabe vai para o menu "⋯" pela
// largura: abaixo de 1024 px saem Voz, Livro e ⚙; abaixo de 640 px saem também Convidar, Ler e Encerrar (que continua no pé
// do painel/Códex). O "painel" é o último: a ficha (mesa avançada, < lg) ou o Códex (modo história).

function IconeLivro() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" fill="currentColor" fillOpacity={0.15} />
      <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7h6M9 10h4" />
    </svg>
  );
}

function IconeAjustes() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity={0.15} />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
    </svg>
  );
}

function IconeVoltar() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function IconeMais() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

/** Pontinho de aviso no canto de um botão do cabeçalho. */
function Pontinho({ className = "" }: { className?: string }) {
  return <span className={`pointer-events-none absolute right-1.5 top-1.5 size-2 rounded-full bg-sangue ring-2 ring-background ${className}`} aria-hidden data-pontinho />;
}

const LINHA = "flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-foreground/90 hover:bg-surface-2/60 hover:text-ambar focus-visible:outline-2 focus-visible:outline-ambar";

export function CabecalhoMesa({
  mesa,
  acoes,
  aoEncerrar,
  painel,
  telaBaixa = false,
  fimDaNoite = false,
  classeTitulo = "titulo text-pergaminho",
  className = "",
  largura = "max-w-6xl",
}: {
  mesa: Mesa;
  acoes: AcoesMesa;
  /** abre o diálogo "Encerrar a noite" */
  aoEncerrar: () => void;
  /** último botão: a ficha (mesa avançada) ou o Códex (modo história) */
  painel?: ReactNode;
  /** o leitor caiu para a rolagem por falta de altura: o menu "Como ler" avisa */
  telaBaixa?: boolean;
  /** a noite acabou de ser encerrada: a trilha acalma */
  fimDaNoite?: boolean;
  classeTitulo?: string;
  className?: string;
  largura?: string;
}) {
  const [menu, setMenu] = useState(false);
  const caixaMenu = useRef<HTMLDivElement>(null);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const id = mesa.campanha.id;
  const urgente = remorsoUrgente(mesa) && !fimDaNoite;
  const rodada = mesa.campanha.modo === "rodada";
  const dicaEncerrar = urgente ? "Encerrar a noite (há Remorso para rolar)" : "Encerrar a noite: Remorso, XP e o fim do capítulo no livro";

  // menu ⋯: fecha com Esc (o foco volta ao botão) ou clique fora; abre com o foco no primeiro item visível
  useEffect(() => {
    if (!menu) return;
    const fora = (e: PointerEvent) => {
      if (caixaMenu.current && !caixaMenu.current.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      botaoMenu.current?.focus();
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    const t = setTimeout(() => {
      const itens = [...(caixaMenu.current?.querySelectorAll<HTMLElement>("[data-item-menu] button, [data-item-menu] a, a[data-item-menu], button[data-item-menu]") ?? [])];
      itens.find((el) => el.offsetParent !== null)?.focus();
    }, 20);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  return (
    <header className={`relative z-20 shrink-0 border-b ${className}`}>
      <div className={`mx-auto flex h-14 ${largura} items-center gap-0.5 px-1.5 sm:gap-1 sm:px-4 baixo:h-11`} data-cabecalho-mesa>
        <Link href="/" className="botao-cabecalho" aria-label="Voltar para as campanhas" title="Voltar para as campanhas" data-ordem="voltar">
          <IconeVoltar />
        </Link>
        {/* o nome da campanha é o destaque: no celular quebra em duas linhas em vez de cortar */}
        <div className="min-w-0 flex-1 px-1 leading-tight" data-ordem="titulo">
          <h1 className={`line-clamp-2 break-words text-[15px] leading-[1.15] sm:truncate sm:text-xl baixo:line-clamp-1 baixo:text-base ${classeTitulo}`} title={mesa.campanha.nome}>
            {mesa.campanha.nome}
          </h1>
          <p className="truncate text-[11px] text-muted max-sm:hidden baixo:hidden">
            <span aria-hidden>{dadosDoTema(mesa.sistema.id).ornamento}</span> {mesa.sistema.nomeCurto}
            {rodada && <span className="uppercase tracking-wider text-ambar-forte"> · modo rodada</span>}
          </p>
        </div>
        <span data-ordem="presenca" className="contents">
          <Presenca mesa={mesa} acoes={acoes} />
        </span>
        <span data-ordem="convidar" className="contents">
          <Convite campanhaId={id} temPin={mesa.campanha.temPin} compacto className="max-sm:hidden" />
        </span>
        <span data-ordem="som" className="contents">
          <Musica musica={mesa.cena.musica} sistema={mesa.sistema.id} compacto fimDaNoite={fimDaNoite} />
        </span>
        <span data-ordem="ler" className="contents">
          <MenuLeitura className="max-sm:hidden" telaBaixa={telaBaixa} />
        </span>
        <span data-ordem="voz" className="contents">
          <BotaoVoz compacto className="max-lg:hidden" />
        </span>
        <Link href={`/mesa/${id}/livro`} className="botao-cabecalho max-lg:hidden" aria-label="Livro da campanha" title="Livro da campanha: a história inteira, para reler, imprimir ou baixar" data-ordem="livro">
          <IconeLivro />
        </Link>
        <Link href={`/mesa/${id}/ajustes`} className="botao-cabecalho max-lg:hidden" aria-label="Ajustes da mesa" title="Ajustes da mesa" data-ordem="ajustes">
          <IconeAjustes />
        </Link>
        <button type="button" onClick={aoEncerrar} className="botao-cabecalho max-sm:hidden" aria-label={dicaEncerrar} title={dicaEncerrar} data-ordem="encerrar" data-encerrar-noite>
          <IconeLua />
          {urgente && <Pontinho />}
        </button>
        {/* transbordo: o que a largura não comporta */}
        <div ref={caixaMenu} className="relative lg:hidden" data-ordem="mais">
          <button
            ref={botaoMenu}
            type="button"
            onClick={() => setMenu((v) => !v)}
            className={`botao-cabecalho ${menu ? "text-ambar" : ""}`}
            aria-label={urgente ? "Mais opções (há Remorso para rolar)" : "Mais opções"}
            title="Mais opções"
            aria-haspopup="menu"
            aria-expanded={menu}
            data-menu-mais
          >
            <IconeMais />
            {urgente && <Pontinho className="sm:hidden" />}
          </button>
          {menu && (
            <div role="menu" aria-label="Mais opções da mesa" className="cartao surgir bg-surface! absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1rem)] p-1.5 text-foreground">
              <div className="sm:hidden" data-item-menu>
                <Convite campanhaId={id} temPin={mesa.campanha.temPin} linha />
              </div>
              <div className="sm:hidden" data-item-menu>
                <MenuLeitura linha telaBaixa={telaBaixa} />
              </div>
              <div data-item-menu>
                <LinhaVoz />
              </div>
              <Link href={`/mesa/${id}/livro`} role="menuitem" className={LINHA} data-item-menu>
                <span className="text-muted">
                  <IconeLivro />
                </span>
                Livro da campanha
              </Link>
              <Link href={`/mesa/${id}/ajustes`} role="menuitem" className={LINHA} data-item-menu>
                <span className="text-muted">
                  <IconeAjustes />
                </span>
                Ajustes da mesa
              </Link>
              <div className="my-1 h-px bg-border sm:hidden" aria-hidden />
              <button
                type="button"
                role="menuitem"
                className={`${LINHA} sm:hidden`}
                onClick={() => {
                  setMenu(false);
                  aoEncerrar();
                }}
                data-item-menu
                data-menu-encerrar
              >
                <span className={urgente ? "relative text-sangue" : "text-muted"}>
                  <IconeLua />
                </span>
                <span className="min-w-0 flex-1">
                  Encerrar a noite
                  {urgente && <span className="block text-[11px] text-sangue">há Remorso para rolar</span>}
                </span>
              </button>
            </div>
          )}
        </div>
        {painel}
      </div>
    </header>
  );
}
