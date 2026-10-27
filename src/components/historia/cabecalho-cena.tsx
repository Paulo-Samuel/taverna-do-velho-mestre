"use client";

import { AberturaCapitulo } from "@/components/leitor/prosa";
import { fonteGotica } from "./fonte-gotica";

// Abertura de capítulo no meio da história: "LOCAL · MOMENTO" em caixa alta espaçada, o título em letra gótica e o ✦ entre
// dois fios, centralizado no topo da página (nos dois modos de leitura).

export function CabecalhoCena({ titulo, local, momento }: { titulo?: string | null; local?: string | null; momento?: string | null }) {
  return <AberturaCapitulo titulo={titulo} local={local} momento={momento} classeTitulo={fonteGotica.className} simbolo="✦" />;
}
