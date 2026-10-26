"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Navegação do cabeçalho (usada por src/app/layout.tsx). Mora aqui junto das configurações por ser
// "coisa da casa", não de uma mesa. No celular vira um menu que fecha sozinho ao trocar de página.

const LINKS = [
  { href: "/", rotulo: "Campanhas", ativo: (p: string) => p === "/" },
  { href: "/nova", rotulo: "Nova campanha", ativo: (p: string) => p.startsWith("/nova") },
  { href: "/sistemas", rotulo: "Sistemas", ativo: (p: string) => p.startsWith("/sistemas") },
  { href: "/config", rotulo: "Configurações", ativo: (p: string) => p.startsWith("/config") },
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

  const itens = (classe: (ativo: boolean) => string) =>
    LINKS.map((l) => {
      const ativo = l.ativo(caminho);
      return (
        // fechar no clique cobre o link da página atual, que não muda o caminho
        <Link key={l.href} href={l.href} className={classe(ativo)} aria-current={ativo ? "page" : undefined} onClick={() => setAberto(false)}>
          {l.rotulo}
        </Link>
      );
    });

  return (
    <>
      <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
        {itens((ativo) => `rounded-md px-3 py-1.5 text-sm ${ativo ? "bg-surface-2 text-ambar" : "text-muted hover:text-ambar"}`)}
      </nav>

      <button
        ref={botaoRef}
        type="button"
        className="btn-borda size-10 shrink-0 p-0 text-lg md:hidden"
        aria-expanded={aberto}
        aria-controls="menu-celular"
        onClick={() => setAberto((a) => !a)}
      >
        <span aria-hidden>{aberto ? "✕" : "☰"}</span>
        <span className="sr-only">{aberto ? "Fechar menu" : "Abrir menu"}</span>
      </button>

      {aberto && (
        <>
          {/* clique fora fecha */}
          <div className="fixed inset-0 z-30 md:hidden" aria-hidden onClick={() => setAberto(false)} />
          <nav
            ref={menuRef}
            id="menu-celular"
            aria-label="Principal"
            className="cartao surgir absolute inset-x-4 top-full z-40 mt-2 flex flex-col bg-surface! p-2 md:hidden"
          >
            {itens((ativo) => `rounded-md px-3 py-3 ${ativo ? "bg-surface-2 text-ambar" : "text-foreground hover:text-ambar"}`)}
          </nav>
        </>
      )}
    </>
  );
}
