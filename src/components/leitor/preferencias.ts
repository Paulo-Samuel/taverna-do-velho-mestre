"use client";

import { useSyncExternalStore } from "react";

// Preferências locais do leitor (deste navegador): cena a cena ou rolagem contínua, e o texto se revelando aos poucos.
// localStorage pode não existir (aba anônima, bloqueio): tudo em try/catch, com o padrão "cena a cena, animado".

export type ModoLeitura = "cenas" | "rolagem";
export type PreferenciasLeitor = { modo: ModoLeitura; animar: boolean };

const CHAVE = "taverna:leitor";
const PADRAO: PreferenciasLeitor = { modo: "cenas", animar: true };

let atual: PreferenciasLeitor | null = null;
const ouvintes = new Set<() => void>();

function ler(): PreferenciasLeitor {
  if (atual) return atual;
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Partial<PreferenciasLeitor> | null;
    atual = { modo: bruto?.modo === "rolagem" ? "rolagem" : "cenas", animar: bruto?.animar !== false };
  } catch {
    atual = PADRAO;
  }
  return atual;
}

export function salvarPreferenciasLeitor(mudancas: Partial<PreferenciasLeitor>) {
  atual = { ...ler(), ...mudancas };
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
