"use client";

import { useEffect, useState } from "react";
import { fraseDaEspera } from "./frases-espera";

// G17: a espera do modo rolagem. A frase da taverna troca a cada 4 s; o leitor de tela ouve só o texto fixo, uma vez
// (a frase rotativa é aria-hidden: nada de tagarelar a cada troca). Os pontinhos (.pensando) vêm do CeuEstrelado.

const INTERVALO_MS = 4000;

export function EsperaMestre({ semente }: { semente: number }) {
  const [passo, setPasso] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPasso((p) => p + 1), INTERVALO_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <p className="my-8 flex items-center justify-center gap-2 text-sm italic text-muted" role="status">
      <span className="sr-only">O mestre está escrevendo</span>
      <span aria-hidden key={passo} className="surgir">
        {fraseDaEspera(semente, passo)}
      </span>
      <span className="pensando text-ambar" aria-hidden>
        <i />
        <i />
        <i />
      </span>
    </p>
  );
}
