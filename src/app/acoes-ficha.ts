"use server";

import { fichaDoFormulario } from "@/lib/formulario-ficha";
import { obterSistema, SISTEMAS } from "@/lib/sistemas";
import type { BlocoFicha, Ficha } from "@/lib/sistemas/tipos";

// Server actions usadas pelo formulário de personagem (código de sistema só roda no servidor).

/** Valores de atributo sugeridos (ou rolados) para uma classe e um método. */
export async function sugerirAtributos(sistemaId: string, classeId: string, metodo: string): Promise<Record<string, number>> {
  // obterSistema cai no padrão com id desconhecido: aqui é melhor não sugerir nada do que sugerir o sistema errado
  if (typeof sistemaId !== "string" || !SISTEMAS.some((s) => s.id === sistemaId)) return {};
  const sistema = obterSistema(sistemaId);
  if (!sistema.pronto) return {};
  try {
    const valores = sistema.atributosIniciais(String(classeId ?? ""), String(metodo ?? ""));
    // só números finitos de atributos que existem
    return Object.fromEntries(sistema.atributos.filter((a) => Number.isFinite(valores[a.id])).map((a) => [a.id, valores[a.id]]));
  } catch (e) {
    console.warn(`[taverna] atributosIniciais falhou (${sistemaId}):`, e);
    return {};
  }
}

export type PreviaFicha = { ok: true; ficha: Ficha; blocos: BlocoFicha[] } | { ok: false; erro: string };

/**
 * Monta a ficha como ela vai ficar, sem gravar nada, para o resumo final do formulário.
 * Recebe o mesmo FormData do envio. Valores que o sistema rola na criação (PV, ouro...) podem mudar no envio de verdade.
 */
export async function previaFicha(form: FormData): Promise<PreviaFicha> {
  const r = fichaDoFormulario(form);
  if (!r.ok) return r;
  let blocos: BlocoFicha[] = [];
  try {
    blocos = r.sistema.blocosFicha(r.ficha);
  } catch (e) {
    console.warn(`[taverna] blocosFicha falhou na prévia (${r.sistema.id}):`, e);
  }
  return { ok: true, ficha: r.ficha, blocos };
}
