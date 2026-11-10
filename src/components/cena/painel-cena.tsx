"use client";

import { useState } from "react";
import { valorDaCondicao } from "@/lib/sistemas/pf2e/condicoes";
import type { Cena, CondicaoDef, Combatente, SistemaPublico } from "@/lib/sistemas/tipos";
import { Icone, type NomeIcone } from "@/components/icones";
import { EstadoVazio } from "@/components/estado-vazio";

// Painel da cena: onde o grupo está, quando, com que tempo e o que está acontecendo,
// mais o rastreador de combate (rodada, ordem de iniciativa, quem age, PV e condições).
// Quem mantém tudo isso é o mestre, pela ferramenta atualizar_cena.

type Estado = { rotulo: string; cor: string; barra: string };

/** Estado qualitativo, para não entregar os PV exatos dos inimigos. */
function estadoDe(c: Combatente): Estado | null {
  if (c.pv === null || c.pv === undefined) return null;
  if (c.pv <= 0) return { rotulo: "caído", cor: "text-muted", barra: "bg-muted/40" };
  const max = c.pvMax || c.pv;
  const fracao = c.pv / max;
  if (fracao >= 1) return { rotulo: "ileso", cor: "text-musgo", barra: "bg-musgo" };
  if (fracao > 0.5) return { rotulo: "ferido", cor: "text-ambar", barra: "bg-ambar" };
  return { rotulo: "muito ferido", cor: "text-sangue", barra: "bg-sangue" };
}

function BarraPv({ c, numeros }: { c: Combatente; numeros: boolean }) {
  const estado = estadoDe(c);
  if (!estado) return null;
  const max = Math.max(1, c.pvMax || c.pv || 1);
  const pct = Math.max(0, Math.min(100, ((c.pv ?? 0) / max) * 100));
  return (
    <div className="mt-1 flex items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-background/70"
        role="meter"
        aria-label={`Vida de ${c.nome}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={c.pv ?? 0}
        aria-valuetext={numeros ? `${c.pv} de ${max}` : estado.rotulo}
      >
        <div className={`h-full rounded-full transition-[width] duration-[var(--mov-barra)] ease-out motion-reduce:transition-none ${estado.barra}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-20 shrink-0 text-right text-[11px] ${estado.cor}`}>{numeros ? `${c.pv}/${c.pvMax ?? "?"}` : estado.rotulo}</span>
    </div>
  );
}

/**
 * Ações do turno (sistemas que contam, como o PF2e): pontinhos das ações que sobram (menos o lento N), quantas já foram e o
 * aviso da penalidade do próximo ataque.
 */
function AcoesDoTurno({ c, total, condicoesDef, vez }: { c: Combatente; total: number; condicoesDef?: CondicaoDef[]; vez: boolean }) {
  const lento = condicoesDef ? valorDaCondicao(c.condicoes ?? [], "lento", condicoesDef) : 0;
  const disponiveis = Math.max(0, total - lento);
  const gastas = vez ? Math.min(disponiveis, c.acoes ?? 0) : 0;
  const ataques = vez ? (c.ataques ?? 0) : 0;
  const proximo = ataques >= 2 ? "−10 (ágil −8)" : ataques === 1 ? "−5 (ágil −4)" : "";
  if (!vez && !lento) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
      {vez && (
        <span className="flex items-center gap-0.5" role="img" aria-label={`${disponiveis - gastas} de ${disponiveis} ações sobrando`} title="Ações do turno">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`inline-block h-2 w-2 rounded-full border ${
                i >= disponiveis ? "border-border bg-transparent opacity-40" : i < gastas ? "border-border bg-transparent" : "border-ambar bg-ambar"
              }`}
              aria-hidden
            />
          ))}
        </span>
      )}
      {lento > 0 && <span className="rounded border border-sangue/50 px-1 text-sangue">lento {lento}</span>}
      {ataques > 0 && (
        <span>
          {ataques} ataque{ataques > 1 ? "s" : ""} no turno · próximo ataque <span className="text-sangue">{proximo}</span>
        </span>
      )}
    </div>
  );
}

function LinhaCombatente({
  c,
  vez,
  indice,
  mostrarNumeros,
  rotuloDefesa,
  acoesTurno,
  condicoesDef,
}: {
  c: Combatente;
  vez: boolean;
  indice: number;
  mostrarNumeros: boolean;
  rotuloDefesa: string;
  acoesTurno?: number;
  condicoesDef?: CondicaoDef[];
}) {
  const caido = (c.pv ?? 1) <= 0;
  // aliados (personagens e NPCs do grupo) sempre mostram números; inimigos só se o jogador pedir
  const numeros = Boolean(c.aliado) || mostrarNumeros;
  const condicoes = (c.condicoes ?? []).filter((x) => x.toLowerCase() !== "caído" || !caido);
  // defesa com as condições (amedrontado, desprevenido...) quando o sistema calcula
  const efetiva = typeof c.defesaEfetiva === "number" && c.defesaEfetiva !== c.defesa ? c.defesaEfetiva : null;
  return (
    <li
      aria-current={vez ? "step" : undefined}
      className={`relative rounded-lg border px-3 py-2 transition ${
        vez ? "border-ambar bg-ambar/10 shadow-[0_0_18px_-8px_var(--ambar)]" : "border-border bg-surface-2/60"
      } ${caido ? "opacity-55" : ""}`}
    >
      <span className={`absolute inset-y-2 left-0 w-1 rounded-r ${c.aliado ? "bg-musgo" : "bg-sangue"}`} aria-hidden />
      <div className="flex items-center gap-2">
        <span className="titulo w-7 shrink-0 text-center text-base text-pergaminho" title="Iniciativa">
          {c.iniciativa ?? "–"}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm ${vez ? "text-ambar" : "text-foreground"} ${caido ? "line-through" : ""}`}>
            <span className="sr-only">{indice + 1}º: </span>
            {c.nome}
          </p>
          <p className="text-xs text-muted">
            {c.aliado ? "grupo" : "inimigo"}
            {numeros && c.defesa && efetiva === null ? ` · ${rotuloDefesa} ${c.defesa}` : ""}
            {numeros && c.defesa && efetiva !== null ? (
              <span title={c.defesaNota}>
                {" · "}
                {rotuloDefesa} <span className="text-sangue">{efetiva}</span> <span className="line-through opacity-70">{c.defesa}</span>
                {c.defesaNota ? ` (${c.defesaNota})` : ""}
              </span>
            ) : null}
            {caido ? " · caído" : ""}
          </p>
        </div>
        {vez && <span className="shrink-0 rounded-full bg-botao px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-botao-texto">age agora</span>}
      </div>
      {acoesTurno ? <AcoesDoTurno c={c} total={acoesTurno} condicoesDef={condicoesDef} vez={vez} /> : null}
      <BarraPv c={c} numeros={numeros} />
      {condicoes.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {condicoes.map((x) => (
            <li key={x} className="rounded border border-border bg-background/60 px-1.5 py-0.5 text-xs text-muted">
              {x}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Rastreador({ combate, sistema }: { combate: NonNullable<Cena["combate"]>; sistema: SistemaPublico }) {
  const [mostrarNumeros, setMostrarNumeros] = useState(false);
  const atual = combate.ordem[combate.vez];
  const aliados = combate.ordem.filter((c) => c.aliado);
  const inimigos = combate.ordem.filter((c) => !c.aliado);
  const inimigosDePe = inimigos.filter((c) => (c.pv ?? 1) > 0).length;

  return (
    <section className="cartao p-3" aria-label="Combate">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="titulo flex items-center gap-1.5 text-lg text-sangue">
          <Icone nome="swords" /> Combate
        </h3>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-pergaminho">Rodada {combate.rodada}</span>
      </div>
      {atual && (
        <p className="mb-2 text-xs text-muted" aria-live="polite">
          Vez de <span className={atual.aliado ? "text-musgo" : "text-sangue"}>{atual.nome}</span>
        </p>
      )}
      <p className="mb-3 flex gap-3 text-xs text-muted">
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-musgo align-middle" aria-hidden />
          {aliados.length} no grupo
        </span>
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-sangue align-middle" aria-hidden />
          {inimigosDePe}/{inimigos.length} inimigos de pé
        </span>
      </p>
      <ol className="space-y-1.5">
        {combate.ordem.map((c, i) => (
          <LinhaCombatente key={`${c.nome}-${i}`} c={c} vez={i === combate.vez} indice={i} mostrarNumeros={mostrarNumeros} rotuloDefesa={sistema.rotulos.defesa} acoesTurno={sistema.combate?.acoes} condicoesDef={sistema.condicoes} />
        ))}
      </ol>
      {inimigos.some((c) => c.pv !== null && c.pv !== undefined) && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input type="checkbox" className="accent-[var(--ambar)]" checked={mostrarNumeros} onChange={(e) => setMostrarNumeros(e.target.checked)} />
          Mostrar números dos inimigos
        </label>
      )}
    </section>
  );
}

export function PainelCena({ cena, sistema }: { cena: Cena; sistema: SistemaPublico }) {
  const combate = cena.combate?.ativo && cena.combate.ordem.length ? cena.combate : null;
  if (!cena.local && !cena.situacao && !cena.momento && !cena.clima && !combate) {
    return (
      <EstadoVazio compacto icone="place" dica="Aparece aqui o lugar, a hora e o clima assim que ele narrar a abertura.">
        O mestre ainda não descreveu a cena. Ele costuma fazer isso quando lembra que existe um mundo.
      </EstadoVazio>
    );
  }
  const detalhes = [
    cena.momento && { icone: "moon", rotulo: "Momento", valor: cena.momento },
    cena.clima && { icone: "cloud", rotulo: "Clima", valor: cena.clima },
  ].filter(Boolean) as { icone: NomeIcone; rotulo: string; valor: string }[];

  return (
    <div className="space-y-3 text-sm">
      {(cena.local || detalhes.length > 0 || cena.situacao) && (
        <section className="surgir" aria-label="Cena">
          {cena.local && <h3 className="titulo text-xl leading-tight text-pergaminho">{cena.local}</h3>}
          {detalhes.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {detalhes.map((d) => (
                <li key={d.rotulo} className="flex items-center gap-1 rounded-full border border-border bg-surface-2/70 px-2.5 py-0.5 text-xs text-muted">
                  <Icone nome={d.icone} />
                  <span className="sr-only">{d.rotulo}: </span>
                  {d.valor}
                </li>
              ))}
            </ul>
          )}
          {cena.situacao && <p className="mt-2 border-l-2 border-ambar/60 pl-3 italic text-foreground/90">{cena.situacao}</p>}
        </section>
      )}
      {combate && <Rastreador combate={combate} sistema={sistema} />}
    </div>
  );
}
