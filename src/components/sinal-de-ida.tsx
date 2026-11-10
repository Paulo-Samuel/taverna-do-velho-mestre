"use client";

import { useLinkStatus } from "next/link";

/** Três pontinhos enquanto o <Link> pai navega (as mesas são páginas dinâmicas e demoram um instante). Só funciona dentro de um <Link>. */
export function SinalDeIda({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span role="status" className={`pensando relative inline-flex items-center ${className}`}>
      <span className="sr-only">Abrindo…</span>
      <i />
      <i />
      <i />
    </span>
  );
}
