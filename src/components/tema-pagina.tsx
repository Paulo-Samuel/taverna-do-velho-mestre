"use client";

import { useEffect } from "react";
import type { IdTema } from "@/lib/temas";

/** Põe o tema no <body> enquanto a página está aberta: o fundo, o cabeçalho e tudo mais assumem o clima do sistema.
 *  Sai ao desmontar (navegar para outra página volta para a taverna). */
export function TemaPagina({ tema }: { tema: IdTema }) {
  useEffect(() => {
    const corpo = document.body;
    corpo.dataset.tema = tema;
    return () => {
      // só tira se ninguém trocou por outro tema nesse meio tempo
      if (corpo.dataset.tema === tema) delete corpo.dataset.tema;
    };
  }, [tema]);
  return null;
}
