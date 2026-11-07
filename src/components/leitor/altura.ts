"use client";

import { useEffect, useState, type RefObject } from "react";

// Tela baixa: o palco do leitor cena a cena encolhe antes de tudo (cabeçalho, barra de páginas e rodapé são fixos). Medido em
// 1366×768: a 150 % sobram ~230 px, a 175 % ~160 px e no zoom 200 % ~100 px, páginas de quatro linhas e dez viradas por cena.
// Abaixo de ~180 px de visor as páginas não fazem sentido: a mesa cai sozinha para a rolagem contínua (com aviso no menu de
// leitura) e volta às páginas quando a altura voltar. Mede-se o espaço que o leitor ocuparia (palco + barra), com histerese
// para não ficar trocando na beira. A pessoa pode insistir nas páginas (preferência paginasEmTelaBaixa).

/** Altura do espaço do leitor (palco + barra de páginas de ~28 px) abaixo da qual a leitura cai para a rolagem: medido no
 * zoom 200 % em 768 px o espaço fica entre 200 e 240 px (palco de ~180-210 px, página de 4 linhas e o cartão do teste encolhido
 * a 0,6); a 150 % sobram ~360 px e as páginas ainda valem. */
export const ALTURA_ENTRA = 250;
/** Altura a partir da qual as páginas voltam (a diferença evita ficar trocando quando o teclado ou uma faixa aparece). */
export const ALTURA_SAI = 290;

/** O próximo estado da tela baixa, com histerese: entra abaixo de ALTURA_ENTRA e só sai acima de ALTURA_SAI. */
export function avaliarTelaBaixa(altura: number, baixaAtual: boolean): boolean {
  if (!Number.isFinite(altura) || altura <= 0) return baixaAtual;
  return baixaAtual ? altura < ALTURA_SAI : altura < ALTURA_ENTRA;
}

/** A tela está baixa demais para páginas? Observa a altura do elemento (o espaço do leitor, igual nos dois modos de leitura). */
export function useTelaBaixa(ref: RefObject<HTMLElement | null>): boolean {
  const [baixa, setBaixa] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const medir = () => setBaixa((b) => avaliarTelaBaixa(el.getBoundingClientRect().height, b));
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    medir();
    return () => obs.disconnect();
  }, [ref]);
  return baixa;
}
