"use client";

import { useEffect } from "react";
import { tituloDaVez, type EstadoDaVez } from "./titulo-da-vez";

/** Com a aba escondida e a mesa esperando por você, o título da aba avisa; ao voltar, o título volta ao normal. */
export function useTituloDaVez(estado: EstadoDaVez): void {
  useEffect(() => {
    const atualizar = () => {
      const novo = tituloDaVez(document.title, document.hidden ? estado : null);
      if (novo !== document.title) document.title = novo;
    };
    atualizar();
    if (estado === null) return;

    document.addEventListener("visibilitychange", atualizar);
    window.addEventListener("focus", atualizar);
    return () => {
      document.removeEventListener("visibilitychange", atualizar);
      window.removeEventListener("focus", atualizar);
      const limpo = tituloDaVez(document.title, null);
      if (limpo !== document.title) document.title = limpo;
    };
  }, [estado]);
}
