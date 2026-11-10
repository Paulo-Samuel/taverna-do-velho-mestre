"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icone, type NomeIcone } from "@/components/icones";

// Navegação do cabeçalho (usada por src/app/layout.tsx). Mora aqui junto das configurações por ser
// "coisa da casa", não de uma mesa. No celular vira um menu que fecha sozinho ao trocar de página.

// o ícone só aparece no menu do celular (no desktop a barra fica só com os rótulos)
const LINKS: { href: string; rotulo: string; icone: NomeIcone; ativo: (p: string) => boolean }[] = [
  { href: "/", rotulo: "Campanhas", icone: "book", ativo: (p) => p === "/" },
  { href: "/nova", rotulo: "Nova campanha", icone: "plus", ativo: (p) => p.startsWith("/nova") },
  { href: "/aventuras", rotulo: "Aventuras", icone: "scroll", ativo: (p) => p.startsWith("/aventuras") },
  { href: "/sistemas", rotulo: "Sistemas", icone: "dice", ativo: (p) => p.startsWith("/sistemas") },
  { href: "/config", rotulo: "Configurações", icone: "gear", ativo: (p) => p.startsWith("/config") },
];

export function Navegacao() {
  const caminho = usePathname() ?? "/";
  const [aberto, setAberto] = useState(false);
  const [caminhoVisto, setCaminhoVisto] = useState(caminho);

  // trocou de página: fecha o menu (ajuste de estado durante o render, sem efeito)
  if (caminhoVisto !== caminho) {
    setCaminhoVisto(caminho);
    setAberto(false);
  }

  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  // abriu: foco no primeiro link; Esc fecha e devolve o foco ao botão (quem usa teclado não fica perdido)
  useEffect(() => {
    if (!aberto) return;
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAberto(false);
      botaoRef.current?.focus();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const itens = (classe: (ativo: boolean) => string, comIcone = false) =>
    LINKS.map((l) => {
      const ativo = l.ativo(caminho);
      return (
        // fechar no clique cobre o link da página atual, que não muda o caminho
        <Link key={l.href} href={l.href} className={classe(ativo)} aria-current={ativo ? "page" : undefined} onClick={() => setAberto(false)}>
          {comIcone && <Icone nome={l.icone} className="shrink-0 text-lg" />}
          {l.rotulo}
        </Link>
      );
    });

  return (
    <>
      <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
        {itens((ativo) => `inline-flex min-h-10 items-center rounded-full px-3 text-sm whitespace-nowrap transition-colors ${ativo ? "bg-ambar/10 text-ambar" : "text-muted hover:text-ambar"}`)}
      </nav>

      <button
        ref={botaoRef}
        type="button"
        // acima do véu (z-30): com o menu aberto o X continua aceso e clicável
        className="btn-borda relative z-40 size-10 shrink-0 p-0 text-lg md:hidden"
        aria-expanded={aberto}
        aria-controls="menu-celular"
        onClick={() => setAberto((a) => !a)}
      >
        <Icone nome={aberto ? "close" : "menu"} />
        <span className="sr-only">{aberto ? "Fechar menu de navegação" : "Abrir menu de navegação"}</span>
      </button>

      {aberto && (
        <>
          {/* clique fora fecha. Altura explícita em vez de inset-0: o cabeçalho tem backdrop-blur e vira o bloco de referência
              deste fixed, então inset-0 cobriria só a faixa do cabeçalho */}
          <div className="fixed inset-x-0 top-0 z-30 h-dvh bg-background/60 backdrop-blur-sm md:hidden" aria-hidden onClick={() => setAberto(false)} />
          <nav
            ref={menuRef}
            id="menu-celular"
            aria-label="Principal"
            className="cartao surgir-menu absolute inset-x-4 top-full z-40 mt-2 flex flex-col bg-surface! p-2 md:hidden"
            // o foco saiu do menu (Tab para o resto da página): fecha. Sem relatedTarget (a janela perdeu o foco, ou o toque
            // caiu em algo que não recebe foco) fica como está; o véu e o Esc cuidam desses casos.
            onBlur={(e) => {
              const destino = e.relatedTarget;
              if (!(destino instanceof Node)) return;
              if (e.currentTarget.contains(destino) || botaoRef.current?.contains(destino)) return;
              setAberto(false);
            }}
          >
            {itens((ativo) => `flex min-h-11 items-center gap-3 rounded-md px-3 py-3 ${ativo ? "bg-surface-2 text-ambar shadow-[inset_2px_0_0_var(--ambar)]" : "text-foreground hover:text-ambar"}`, true)}
          </nav>
        </>
      )}
    </>
  );
}
