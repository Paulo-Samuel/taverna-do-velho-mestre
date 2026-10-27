"use client";

import { useSyncExternalStore, type CSSProperties } from "react";

// Preferências locais do leitor (deste navegador): cena a cena ou rolagem contínua, o texto se revelando aos poucos e o tamanho
// da letra. localStorage pode não existir (aba anônima, bloqueio): tudo em try/catch, com o padrão "cena a cena, animado, letra média".

export type ModoLeitura = "cenas" | "rolagem";
export type PreferenciasLeitor = { modo: ModoLeitura; animar: boolean; /** passo do tamanho da letra (índice de ESCALAS_FONTE) */ fonte: number };

/** Multiplicadores do tamanho da letra da narração (A− / A+ no menu de leitura). */
export const ESCALAS_FONTE = [0.88, 1, 1.12, 1.25];
const FONTE_PADRAO = 1;

const CHAVE = "taverna:leitor";
const PADRAO: PreferenciasLeitor = { modo: "cenas", animar: true, fonte: FONTE_PADRAO };

const fonteValida = (f: unknown) => (typeof f === "number" && Number.isInteger(f) && f >= 0 && f < ESCALAS_FONTE.length ? f : FONTE_PADRAO);

let atual: PreferenciasLeitor | null = null;
const ouvintes = new Set<() => void>();

function ler(): PreferenciasLeitor {
  if (atual) return atual;
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Partial<PreferenciasLeitor> | null;
    atual = { modo: bruto?.modo === "rolagem" ? "rolagem" : "cenas", animar: bruto?.animar !== false, fonte: fonteValida(bruto?.fonte) };
  } catch {
    atual = PADRAO;
  }
  return atual;
}

export function salvarPreferenciasLeitor(mudancas: Partial<PreferenciasLeitor>) {
  atual = { ...ler(), ...mudancas };
  atual.fonte = fonteValida(atual.fonte);
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    // sem localStorage: vale só até fechar a aba
  }
  for (const f of ouvintes) f();
}

function assinar(f: () => void) {
  ouvintes.add(f);
  // outra aba mudou a preferência
  const aoGuardar = (e: StorageEvent) => {
    if (e.key !== CHAVE) return;
    atual = null;
    f();
  };
  window.addEventListener("storage", aoGuardar);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", aoGuardar);
  };
}

export function usePreferenciasLeitor(): PreferenciasLeitor {
  return useSyncExternalStore(assinar, ler, () => PADRAO);
}

/** Estilo com a escala da letra (--leitor-escala), para pôr na raiz da mesa: vale para o leitor cena a cena e para a rolagem. */
export function useEscalaLeitor(): CSSProperties {
  const { fonte } = usePreferenciasLeitor();
  return { "--leitor-escala": ESCALAS_FONTE[fonte] } as CSSProperties;
}

const CONSULTA_MOVIMENTO = "(prefers-reduced-motion: reduce)";

function assinarMovimento(f: () => void) {
  const mq = window.matchMedia(CONSULTA_MOVIMENTO);
  mq.addEventListener("change", f);
  return () => mq.removeEventListener("change", f);
}

/** A pessoa pediu menos movimento no sistema? */
export function useMenosMovimento(): boolean {
  return useSyncExternalStore(assinarMovimento, () => window.matchMedia(CONSULTA_MOVIMENTO).matches, () => false);
}
