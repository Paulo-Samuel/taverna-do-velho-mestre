"use client";

import { useMemo, useState } from "react";
import { BotaoFixar } from "@/components/fatos/fixar-selecao";
import { resumoDaEntrada, type ControleFatos } from "@/components/fatos/use-fatos";
import type { EntradaDiario, TipoDiario } from "@/lib/sistemas/tipos";

// Diário da campanha: missões, NPCs, lugares, itens e notas que o mestre registra com anotar_diario.
// Abas por tipo, busca em tudo e ordem por atualização (missões abertas sempre no topo). O 📌 fixa um resumo da entrada.

const ABAS: { tipo: TipoDiario; rotulo: string; vazio: string }[] = [
  { tipo: "missao", rotulo: "Missões", vazio: "Nenhuma missão. Vocês estão de férias, aparentemente." },
  { tipo: "npc", rotulo: "NPCs", vazio: "Ninguém digno de nota. Ainda." },
  { tipo: "local", rotulo: "Lugares", vazio: "Nenhum lugar anotado." },
  { tipo: "item", rotulo: "Itens", vazio: "Nenhum item marcante." },
  { tipo: "nota", rotulo: "Notas", vazio: "Nenhuma pista ou anotação." },
];

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  aberta: { rotulo: "aberta", classe: "border-ambar/60 text-ambar" },
  concluida: { rotulo: "concluída", classe: "border-musgo/60 text-musgo" },
  falhou: { rotulo: "falhou", classe: "border-sangue/60 text-sangue" },
  aliado: { rotulo: "aliado", classe: "border-musgo/60 text-musgo" },
  neutro: { rotulo: "neutro", classe: "border-border text-muted" },
  hostil: { rotulo: "hostil", classe: "border-sangue/60 text-sangue" },
  morto: { rotulo: "morto", classe: "border-border text-muted line-through" },
};

const sem = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Datas do SQLite vêm em UTC sem fuso ("2026-10-25 14:03:00"). */
function quando(iso: string): string {
  const data = new Date(`${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Status({ status }: { status: string }) {
  if (!status) return null;
  const s = STATUS[sem(status)] ?? { rotulo: status, classe: "border-border text-muted" };
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${s.classe}`}>{s.rotulo}</span>;
}

function Entrada({ e, mostrarTipo, fatos }: { e: EntradaDiario; mostrarTipo: boolean; fatos?: ControleFatos }) {
  const [aberta, setAberta] = useState(false);
  const longo = e.texto.length > 160;
  const apagada = ["concluida", "falhou", "morto"].includes(sem(e.status));
  return (
    <li className={`surgir rounded-lg border border-border bg-surface-2/60 px-3 py-2 ${apagada ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm text-pergaminho">
          {mostrarTipo && <span className="mr-1.5 text-[10px] uppercase tracking-wide text-muted">{ABAS.find((a) => a.tipo === e.tipo)?.rotulo ?? e.tipo}</span>}
          {e.titulo}
        </p>
        <div className="-mr-1.5 -mt-0.5 flex shrink-0 items-center gap-1">
          <Status status={e.status} />
          {fatos && <BotaoFixar texto={resumoDaEntrada(e)} controle={fatos} rotulo={e.titulo} />}
        </div>
      </div>
      {e.texto && (
        <p className={`mt-1 whitespace-pre-line text-xs leading-relaxed text-muted ${longo && !aberta ? "line-clamp-3" : ""}`}>{e.texto}</p>
      )}
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted/70">
        <span>{quando(e.atualizadoEm)}</span>
        {longo && (
          <button className="text-ambar hover:underline" onClick={() => setAberta((v) => !v)} aria-expanded={aberta}>
            {aberta ? "menos" : "mais"}
          </button>
        )}
      </div>
    </li>
  );
}

export function Diario({ entradas, fatos }: { entradas: EntradaDiario[]; fatos?: ControleFatos }) {
  const contagem = useMemo(() => {
    const c: Partial<Record<TipoDiario, number>> = {};
    for (const e of entradas) c[e.tipo] = (c[e.tipo] ?? 0) + 1;
    return c;
  }, [entradas]);
  const [escolhida, setEscolhida] = useState<TipoDiario | null>(null);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"recentes" | "nome">("recentes");

  // sem escolha do jogador, abre na primeira aba que tem algo
  const aba = escolhida ?? ABAS.find((a) => contagem[a.tipo])?.tipo ?? "missao";
  const termo = sem(busca.trim());

  const visiveis = useMemo(() => {
    const filtradas = termo
      ? entradas.filter((e) => sem(`${e.titulo} ${e.texto} ${e.status}`).includes(termo))
      : entradas.filter((e) => e.tipo === aba);
    return [...filtradas].sort((a, b) => {
      // missão aberta vem antes; o resto segue a ordem escolhida
      const abertas = Number(b.tipo === "missao" && b.status === "aberta") - Number(a.tipo === "missao" && a.status === "aberta");
      if (abertas && !termo) return abertas;
      return ordem === "nome" ? a.titulo.localeCompare(b.titulo, "pt-BR") : b.atualizadoEm.localeCompare(a.atualizadoEm);
    });
  }, [entradas, termo, aba, ordem]);

  if (!entradas.length) {
    return <p className="text-sm text-muted">Nada anotado ainda. O mestre registra aqui missões, NPCs e pistas conforme aparecem.</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex gap-2">
        <input
          type="search"
          className="campo py-1.5 text-sm"
          placeholder="Buscar no diário…"
          aria-label="Buscar no diário"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button
          className="btn-borda shrink-0 px-3 py-1.5 text-xs"
          onClick={() => setOrdem((o) => (o === "recentes" ? "nome" : "recentes"))}
          title="Mudar a ordem"
        >
          {ordem === "recentes" ? "Recentes" : "A–Z"}
        </button>
      </div>

      {!termo && (
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Tipos de anotação">
          {ABAS.map((a) => (
            <button
              key={a.tipo}
              role="tab"
              aria-selected={aba === a.tipo}
              onClick={() => setEscolhida(a.tipo)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition ${
                aba === a.tipo ? "border-ambar bg-ambar/10 text-ambar" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {a.rotulo}
              {contagem[a.tipo] ? <span className="ml-1 opacity-70">{contagem[a.tipo]}</span> : null}
            </button>
          ))}
        </div>
      )}

      {visiveis.length ? (
        <ul className="space-y-2" role={termo ? undefined : "tabpanel"}>
          {visiveis.map((e) => (
            <Entrada key={e.id} e={e} mostrarTipo={Boolean(termo)} fatos={fatos} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">{termo ? `Nada com "${busca.trim()}".` : ABAS.find((a) => a.tipo === aba)?.vazio}</p>
      )}
    </div>
  );
}
