import Link from "next/link";
import type { ReactNode } from "react";
import { Icone } from "@/components/icones";

/** O "voltar" do topo das páginas: seta para a esquerda, texto discreto e alvo de toque de 40px. */
export function LinkVoltar({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center gap-1.5 text-sm text-muted hover:text-ambar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar ${className ?? ""}`}
    >
      <Icone nome="arrowLeft" />
      {children}
    </Link>
  );
}
