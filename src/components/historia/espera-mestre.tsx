"use client";

import { useEffect, useState } from "react";
import { esperaDemorada, fraseDaEspera } from "./frases-espera";

// G17: a espera do modo rolagem (e da mesa avançada). A frase da taverna troca a cada 4 s; o leitor de tela ouve só o texto
// fixo (a frase rotativa é aria-hidden: nada de tagarelar a cada troca). Os pontinhos (.pensando) vêm do globals.css.
// Depois de 45 s a espera admite a demora: as frases mudam de tom, entra uma segunda linha dizendo que dá para esperar ou
// interromper, e o texto do leitor de tela muda uma única vez.

const INTERVALO_MS = 4000;

export function EsperaMestre({ semente }: { semente: number }) {
  const [passo, setPasso] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPasso((p) => p + 1), INTERVALO_MS);
    return () => clearInterval(t);
  }, []);
  const demorada = esperaDemorada(passo, INTERVALO_MS);

  return (
    <div className="relative my-8 text-center text-sm italic text-muted" role="status">
      <p className="flex items-center justify-center gap-2">
        <span className="sr-only">{demorada ? "O mestre está escrevendo. Está demorando mais que o costume." : "O mestre está escrevendo"}</span>
        <span aria-hidden key={passo} className="surgir">
          {fraseDaEspera(semente, passo, demorada)}
        </span>
        <span className="pensando text-ambar" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </p>
      {demorada && (
        <p className="mt-1 text-xs not-italic" aria-hidden>
          Está demorando mais que o costume. Dá para esperar ou interromper.
        </p>
      )}
    </div>
  );
}
