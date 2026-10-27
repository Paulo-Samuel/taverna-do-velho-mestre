"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as identidade from "@/lib/cliente/identidade";
import type { Fato } from "@/lib/db";
import type { EntradaDiario } from "@/lib/sistemas/tipos";
import { limparFato } from "./limites";

// Fatos fixados no navegador: carrega da rota, ouve a conexão SSE da mesa (use-mesa repassa os eventos como "taverna:evento")
// e guarda a "proposta" do momento (trecho selecionado ou entrada do diário esperando confirmação no mini-popover).

/** Onde o mini-popover aparece: perto do trecho selecionado ou do botão que o abriu. */
export type Ancora = { x: number; topo: number; base: number };

export type Proposta = { texto: string; ancora: Ancora };

export type ControleFatos = {
  fatos: Fato[];
  carregado: boolean;
  erro: string | null;
  limparErro: () => void;
  criar: (texto: string) => Promise<boolean>;
  editar: (id: number, texto: string) => Promise<boolean>;
  remover: (id: number) => Promise<boolean>;
  /** sobe (−1) ou desce (+1) uma posição */
  mover: (id: number, passo: number) => void;
  /** põe o fato `id` na posição de `antesDe` (arrastar e soltar) */
  moverPara: (id: number, antesDe: number) => void;
  proposta: Proposta | null;
  /** abre o mini-popover com o texto, para a pessoa editar antes de fixar */
  propor: (texto: string, ancora: Ancora | HTMLElement) => void;
  fecharProposta: () => void;
};

export function ancoraDe(el: HTMLElement | DOMRect): Ancora {
  const r = el instanceof HTMLElement ? el.getBoundingClientRect() : el;
  return { x: r.left + r.width / 2, topo: r.top, base: r.bottom };
}

/** Uma frase-resumo de uma entrada do diário, para fixar (a pessoa ainda pode editar). */
export function resumoDaEntrada(e: EntradaDiario): string {
  const d = (e.dados ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");
  const status = e.status ? ` (${e.status})` : "";
  const corpo =
    e.tipo === "npc"
      ? [s(e.texto).replace(/[.;]+$/, ""), s(d.relacao) && `relação: ${s(d.relacao)}`].filter(Boolean).join("; ")
      : e.tipo === "missao"
        ? s(d.objetivo) || s(e.texto)
        : s(e.texto);
  const nome = e.tipo === "missao" ? `Missão "${e.titulo}"` : e.titulo;
  return limparFato(`${nome}${status}${corpo ? `: ${corpo}` : ""}`);
}

async function chamar(url: string, metodo: string, corpo?: unknown): Promise<{ fatos?: Fato[]; erro?: string }> {
  try {
    const r = await fetch(url, {
      method: metodo,
      headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      cache: "no-store",
    });
    const json = (await r.json().catch(() => ({}))) as { fatos?: Fato[]; erro?: string };
    return r.ok ? json : { erro: json.erro ?? `O pergaminho rasgou (erro ${r.status}).` };
  } catch {
    return { erro: "Sem conexão com a taverna. O fato ficou na sua cabeça, não no livro." };
  }
}

export function useFatos(campanhaId: number): ControleFatos {
  const [fatos, setFatos] = useState<Fato[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const base = `/api/campanhas/${campanhaId}/fatos`;

  const recarregar = useCallback(async () => {
    const r = await chamar(base, "GET");
    if (r.fatos) setFatos(r.fatos);
    setCarregado(true);
  }, [base]);

  // carrega ao abrir; depois, a conexão da mesa traz cada mudança (e o estado_inicial de cada reconexão pede a lista de novo)
  useEffect(() => {
    void chamar(base, "GET").then((r) => {
      if (r.fatos) setFatos(r.fatos);
      setCarregado(true);
    });
    const ouvir = (ev: Event) => {
      const d = (ev as CustomEvent<{ e: string; fatos?: Fato[] }>).detail;
      if (d?.e === "fatos" && Array.isArray(d.fatos)) setFatos(d.fatos);
      else if (d?.e === "estado_inicial") void recarregar();
    };
    window.addEventListener("taverna:evento", ouvir);
    return () => window.removeEventListener("taverna:evento", ouvir);
  }, [base, recarregar]);

  const aplicar = useCallback((r: { fatos?: Fato[]; erro?: string }) => {
    if (r.fatos) setFatos(r.fatos);
    setErro(r.erro ?? null);
    return !r.erro;
  }, []);

  const criar = useCallback(async (texto: string) => aplicar(await chamar(base, "POST", { texto, autor: identidade.apelido() })), [base, aplicar]);
  const editar = useCallback(async (id: number, texto: string) => aplicar(await chamar(`${base}/${id}`, "PATCH", { texto })), [base, aplicar]);
  const remover = useCallback(
    async (id: number) => {
      setFatos((l) => l.filter((f) => f.id !== id));
      return aplicar(await chamar(`${base}/${id}`, "DELETE"));
    },
    [base, aplicar],
  );

  const reordenar = useCallback(
    (ids: number[]) => {
      // na tela já, no servidor logo depois (a resposta e o SSE confirmam)
      setFatos((l) => ids.map((id) => l.find((f) => f.id === id)).filter((f): f is Fato => Boolean(f)));
      void chamar(base, "PUT", { ordem: ids }).then(aplicar);
    },
    [base, aplicar],
  );
  const mover = useCallback(
    (id: number, passo: number) => {
      const ids = fatos.map((f) => f.id);
      const i = ids.indexOf(id);
      const j = i + passo;
      if (i < 0 || j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      reordenar(ids);
    },
    [fatos, reordenar],
  );
  const moverPara = useCallback(
    (id: number, antesDe: number) => {
      if (id === antesDe) return;
      const ids = fatos.map((f) => f.id).filter((x) => x !== id);
      const j = ids.indexOf(antesDe);
      ids.splice(j < 0 ? ids.length : j, 0, id);
      reordenar(ids);
    },
    [fatos, reordenar],
  );

  const propor = useCallback((texto: string, ancora: Ancora | HTMLElement) => {
    setErro(null);
    setProposta({ texto: limparFato(texto), ancora: ancora instanceof HTMLElement ? ancoraDe(ancora) : ancora });
  }, []);
  const fecharProposta = useCallback(() => setProposta(null), []);
  const limparErro = useCallback(() => setErro(null), []);

  return useMemo(
    () => ({ fatos, carregado, erro, limparErro, criar, editar, remover, mover, moverPara, proposta, propor, fecharProposta }),
    [fatos, carregado, erro, limparErro, criar, editar, remover, mover, moverPara, proposta, propor, fecharProposta],
  );
}
