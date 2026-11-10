import type { ReactNode } from "react";

// Cabeçalho único das páginas internas da casa (sistemas, configurações, cópias...): sobrelinha, título com brilho,
// subtítulo, ações à direita e um divisor com o ornamento do tema.

export function CabecalhoPagina({
  sobrelinha,
  titulo,
  subtitulo,
  children,
  className,
}: {
  sobrelinha?: ReactNode;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  /** ações da página (botões, links), à direita do título */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`mb-8 ${className ?? ""}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:items-start">
        <div className="min-w-0">
          {sobrelinha && <p className="mb-1 text-xs uppercase tracking-[0.18em] text-ambar-forte">{sobrelinha}</p>}
          <h1 className="titulo titulo-brilho text-3xl text-pergaminho sm:text-4xl">{titulo}</h1>
          {subtitulo && <p className="mt-2 max-w-2xl text-muted">{subtitulo}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2 sm:mt-1">{children}</div>}
      </div>
      <div className="mt-4 flex items-center gap-3 text-ambar-forte" aria-hidden>
        <span className="h-px flex-1 bg-linear-to-r from-transparent to-border" />
        <span className="ornamento" />
        <span className="h-px flex-1 bg-linear-to-l from-transparent to-border" />
      </div>
    </header>
  );
}
