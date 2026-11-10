"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { COLUNAS, ENTRELINHAS, PASSO_PADRAO, passoValido } from "./conforto";

// Preferências locais do leitor (deste navegador): cena a cena ou rolagem contínua, o texto se revelando aos poucos, o tamanho
// da letra, a largura da coluna, a entrelinha e, com a tela baixa (palco com menos de ~180 px: notebook a 150 %+, zoom 200 %), insistir nas páginas em vez de cair
// sozinho para a rolagem. localStorage pode não existir (aba anônima, bloqueio): tudo em try/catch, com o padrão "cena a cena,
// animado, letra média, rolagem quando a tela é baixa".

export type ModoLeitura = "cenas" | "rolagem";
export type PreferenciasLeitor = {
  modo: ModoLeitura;
  animar: boolean;
  /** passo do tamanho da letra (índice de ESCALAS_FONTE) */
  fonte: number;
  /** largura da coluna de leitura (índice de COLUNAS, em conforto.ts) */
  coluna: number;
  /** entrelinha da narração (índice de ENTRELINHAS, em conforto.ts) */
  entrelinha: number;
  /** tela baixa: continuar em páginas (curtas) em vez da rolagem automática */
  paginasEmTelaBaixa: boolean;
};

/** Multiplicadores do tamanho da letra da narração (A− / A+ no menu de leitura). */
export const ESCALAS_FONTE = [0.88, 1, 1.12, 1.25];
const FONTE_PADRAO = 1;

const CHAVE = "taverna:leitor";
const PADRAO: PreferenciasLeitor = { modo: "cenas", animar: true, fonte: FONTE_PADRAO, coluna: PASSO_PADRAO, entrelinha: PASSO_PADRAO, paginasEmTelaBaixa: false };

const fonteValida = (f: unknown) => (typeof f === "number" && Number.isInteger(f) && f >= 0 && f < ESCALAS_FONTE.length ? f : FONTE_PADRAO);

let atual: PreferenciasLeitor | null = null;
const ouvintes = new Set<() => void>();

function ler(): PreferenciasLeitor {
  if (atual) return atual;
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Partial<PreferenciasLeitor> | null;
    atual = {
      modo: bruto?.modo === "rolagem" ? "rolagem" : "cenas",
      animar: bruto?.animar !== false,
      fonte: fonteValida(bruto?.fonte),
      coluna: passoValido(bruto?.coluna, COLUNAS.length),
      entrelinha: passoValido(bruto?.entrelinha, ENTRELINHAS.length),
      paginasEmTelaBaixa: bruto?.paginasEmTelaBaixa === true,
    };
  } catch {
    atual = PADRAO;
  }
  return atual;
}

export function salvarPreferenciasLeitor(mudancas: Partial<PreferenciasLeitor>) {
  atual = { ...ler(), ...mudancas };
  atual.fonte = fonteValida(atual.fonte);
  atual.coluna = passoValido(atual.coluna, COLUNAS.length);
  atual.entrelinha = passoValido(atual.entrelinha, ENTRELINHAS.length);
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

/**
 * Estilo com a escala da letra (--leitor-escala), a largura da coluna (--leitor-coluna) e, quando não é a de sempre, a
 * entrelinha (--leitor-entrelinha), para pôr na raiz da mesa: vale para o leitor cena a cena e para a rolagem.
 */
export function useEscalaLeitor(): CSSProperties {
  const { fonte, coluna, entrelinha } = usePreferenciasLeitor();
  const linha = ENTRELINHAS[entrelinha].valor;
  return {
    "--leitor-escala": ESCALAS_FONTE[fonte],
    "--leitor-coluna": COLUNAS[coluna].fator,
    ...(linha !== null ? { "--leitor-entrelinha": linha } : {}),
  } as CSSProperties;
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

// ---------- consultas de mídia da mesa ----------
// Os pontos de corte são os mesmos das classes do Tailwind nos componentes (sm = 40rem; baixo = altura até 600 px, ver globals.css).

/** Tela larga E alta: desktop de verdade. Abaixo disso (celular ou tela baixa) a interface fica compacta. */
export const CONSULTA_LARGO = "(min-width: 40rem) and (min-height: 601px)";
/** Largura de celular (abaixo do `sm` do Tailwind). */
export const CONSULTA_CELULAR = "(max-width: 639.98px)";
/** Tela baixa (notebook a 150 %+, zoom 200 % em 768 px): cabeçalho e barras encolhem (variante `baixo:` do Tailwind). */
export const CONSULTA_BAIXO = "(max-height: 600px)";

const assinaturas = new Map<string, (f: () => void) => () => void>();
function assinarConsulta(consulta: string) {
  let a = assinaturas.get(consulta);
  if (!a) {
    a = (f) => {
      const mq = window.matchMedia(consulta);
      mq.addEventListener("change", f);
      return () => mq.removeEventListener("change", f);
    };
    assinaturas.set(consulta, a);
  }
  return a;
}

/** A consulta de mídia bate agora? (`padrao` vale no servidor.) */
export function useConsulta(consulta: string, padrao = false): boolean {
  return useSyncExternalStore(assinarConsulta(consulta), () => window.matchMedia(consulta).matches, () => padrao);
}
