"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PRAZO_DECISAO_MS, PRAZO_DISCRETO_MS } from "@/lib/constantes";
import type { Mensagem } from "@/lib/db";
import { Icone, type NomeIcone } from "@/components/icones";

// Cartão de uma mensagem de dado: teste de personagem (d20, d100, Fate, PbtA, parada de d10 do Vampiro V5), rolagem livre (mestre ou jogador),
// mudança de ficha, XP, descanso, iniciativa, fim de combate, cena e diário. Tipo desconhecido cai num cartão genérico com mensagem.texto.
// Os dados vêm do servidor (ResultadoTeste de sistemas/tipos.ts, Rolagem de dados.ts ou resumos das ferramentas).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dados = Record<string, any>;

const COR_GRAU: Record<string, string> = {
  sucesso_critico: "text-[var(--critico,var(--ambar))]",
  sucesso: "text-[var(--grau-sucesso)]",
  parcial: "text-[var(--grau-parcial)]",
  falha: "text-[var(--grau-falha)]",
  falha_critica: "text-[var(--grau-falha)]",
};

// animações extras do cartão; React 19 iça e deduplica este <style> pelo href
const CSS = `
@keyframes cd-pop { 0% { transform: scale(.4); opacity: 0 } 70% { transform: scale(1.18); opacity: 1 } 100% { transform: none } }
.cd-pop { animation: cd-pop .45s .3s cubic-bezier(.2,.8,.3,1) both }
@keyframes cd-face { from { transform: translateY(-8px) rotate(-30deg); opacity: 0 } to { transform: none; opacity: 1 } }
.cd-face { animation: cd-face .35s cubic-bezier(.2,.8,.3,1) both; animation-delay: calc(var(--i, 0) * 70ms) }
@keyframes cd-brilho { 0%, 100% { box-shadow: 0 0 0 0 transparent } 50% { box-shadow: 0 0 30px -6px currentColor } }
.cd-brilho { animation: cd-brilho 1.4s ease-in-out 2 }
@media (prefers-reduced-motion: reduce) { .cd-pop, .cd-face, .cd-brilho { animation: none } }
`;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Crítico e falha crítica continuam marcados no cartão depois do reload: anel e halo, não só a cor do grau. */
const ANEL_CRITICO = "border-ambar/60 ring-1 ring-ambar/35 shadow-[0_0_24px_-10px_var(--critico)]";
const ANEL_FALHA = "border-sangue/60 ring-1 ring-sangue/30 shadow-[0_0_24px_-10px_var(--sangue)]";

/** Selo pequeno no canto: manual, secreta, só para você... */
function Selo({ children, cor = "border-border text-muted" }: { children: ReactNode; cor?: string }) {
  return <span className={`shrink-0 rounded-full border px-1.5 py-px text-[11px] uppercase tracking-wider ${cor}`}>{children}</span>;
}

function Selos({ r }: { r: Dados }) {
  return (
    <>
      {r.manual && <Selo cor="border-pergaminho/40 text-pergaminho">
          <Icone nome="pencil" /> manual
        </Selo>}
      {r.secreta && <Selo cor="border-sangue/50 text-sangue">secreta</Selo>}
      {r.privada && <Selo cor="border-[color-mix(in_srgb,var(--grau-parcial)_45%,transparent)] text-[var(--grau-parcial)]">só para você</Selo>}
    </>
  );
}

/** Linha de cima: quem rolou e por quê. */
function Cabecalho({ r, mensagem, padrao }: { r: Dados; mensagem: Mensagem; padrao?: string }) {
  const jogador = r.origem === "jogador";
  const quem = [r.personagem, jogador && mensagem.autor && mensagem.autor !== r.personagem ? mensagem.autor : null].filter(Boolean).join(" · ");
  const rotuloOrigem = r.origem === "mestre" ? "Mestre" : null;
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
      <span className="min-w-0 truncate">
        {jogador && <Icone nome="dice" />}
        {quem || rotuloOrigem ? <span className="text-foreground/90">{quem || rotuloOrigem}</span> : null}
        {(quem || rotuloOrigem) && (r.motivo || padrao) ? " · " : ""}
        {r.motivo || padrao}
      </span>
      <Selos r={r} />
    </p>
  );
}

/** Uma face de dado comum. */
function Face({
  valor,
  lados,
  descartado,
  explodiu,
  i,
  novo,
}: {
  valor: number;
  lados: number | "F";
  descartado?: boolean;
  explodiu?: boolean;
  i: number;
  novo: boolean;
}) {
  if (lados === "F") return <FaceFate valor={valor} i={i} novo={novo} descartado={descartado} />;
  const maximo = valor === lados;
  const minimo = valor === 1;
  const cor = descartado
    ? "border-border/60 text-muted/60 line-through"
    : lados === 20 && maximo
      ? "border-ambar text-ambar bg-ambar/10"
      : lados === 20 && minimo
        ? "border-sangue text-sangue bg-sangue/10"
        : maximo
          ? "border-pergaminho/60 text-pergaminho"
          : "border-border text-foreground";
  return (
    <span
      className={`relative inline-grid h-7 min-w-7 place-items-center rounded-md border px-1 text-sm tabular-nums ${cor} ${novo ? "cd-face" : ""}`}
      style={{ ["--i" as string]: i }}
      title={descartado ? "descartado" : explodiu ? "explodiu e rolou de novo" : undefined}
    >
      {valor}
      {explodiu && !descartado && (
        <span className="absolute -right-1.5 -top-1.5 text-[11px] leading-none text-ambar" role="img" aria-label="explodiu">
          <Icone nome="sparkle" />
        </span>
      )}
    </span>
  );
}

/** Dado Fate: +, − ou em branco. */
function FaceFate({ valor, i, novo, descartado }: { valor: number; i: number; novo: boolean; descartado?: boolean }) {
  const cor = descartado ? "text-muted/50 border-border/50" : valor > 0 ? "text-musgo border-musgo/60" : valor < 0 ? "text-sangue border-sangue/60" : "text-muted border-border";
  return (
    <span
      className={`inline-grid size-7 place-items-center rounded-md border bg-surface text-lg font-bold leading-none ${cor} ${novo ? "cd-face" : ""}`}
      style={{ ["--i" as string]: i }}
      aria-label={valor > 0 ? "mais" : valor < 0 ? "menos" : "branco"}
    >
      {valor > 0 ? "+" : valor < 0 ? "−" : " "}
    </span>
  );
}

/** Hexágono de d20 com o número no meio. */
function IconeD20({ valor, cor, novo, brilho }: { valor: ReactNode; cor: string; novo: boolean; brilho?: boolean }) {
  return (
    <div
      className={`relative grid size-14 shrink-0 place-items-center rounded-full ${cor} ${novo ? "dado-rolando" : ""} ${novo && brilho ? "cd-brilho" : ""}`}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0">
        <polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="4" />
        <polygon points="50,22 77,68 23,68" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="2.5" />
      </svg>
      <span className="titulo relative text-xl">{valor}</span>
    </div>
  );
}

/** Quadrado de d6 com pips, para o 2d6 do PbtA. */
function D6({ valor, i, novo }: { valor: number; i: number; novo: boolean }) {
  const pips: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
  };
  return (
    <svg viewBox="0 0 100 100" className={`size-10 text-pergaminho ${novo ? "dado-rolando" : ""}`} style={{ animationDelay: `${i * 90}ms` }} aria-label={`d6: ${valor}`}>
      <rect x="6" y="6" width="88" height="88" rx="18" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="5" />
      {(pips[valor] ?? []).map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r="8" fill="currentColor" />
      ))}
      {!pips[valor] && (
        <text x="50" y="62" textAnchor="middle" fontSize="36" fill="currentColor">
          {valor}
        </text>
      )}
    </svg>
  );
}

function Moldura({ children, mensagem, destaque = "border-border", tom = "bg-surface-2/80" }: { children: ReactNode; mensagem: Mensagem; destaque?: string; tom?: string }) {
  return (
    <div className={`surgir mx-auto w-full max-w-lg rounded-xl border px-3 py-3 sm:px-4 ${destaque} ${tom}`} title={mensagem.texto}>
      {children}
    </div>
  );
}

// ---------- testes ----------

function sabor(r: Dados): "vtm5" | "d100" | "fate" | "pbta" | "d20" {
  const expr = String(r.expressao ?? "").toLowerCase();
  if (r.sistema === "vtm5" || Array.isArray(r.dadosFome)) return "vtm5";
  if (/d100|d%/.test(expr) || r.sistema === "d100") return "d100";
  if (/df/.test(expr) || r.sistema === "fate") return "fate";
  if (/^2d6/.test(expr) || r.sistema === "pbta") return "pbta";
  return "d20";
}

function LinhaTeste({ r }: { r: Dados }) {
  return (
    <p className="mt-0.5 text-sm">
      <span className="text-pergaminho">{r.teste}</span>{" "}
      <span className="text-muted">
        {r.expressao} = <span className="text-foreground">{r.total}</span>
        {num(r.alvo) !== null && ` vs ${r.alvo}`}
        {num(r.margem) !== null && num(r.alvo) !== null && <span className="text-muted/80"> ({r.margem >= 0 ? `+${r.margem}` : r.margem})</span>}
      </span>
    </p>
  );
}

type OposicaoNoCartao = { nome: string; expressao: string; dados: number[]; total: number };

/** O lado do NPC num teste oposto (campo genérico `oposicao`), ou null. */
export function lerOposicao(v: unknown): OposicaoNoCartao | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Partial<OposicaoNoCartao>;
  if (typeof o.nome !== "string" || typeof o.total !== "number") return null;
  return { nome: o.nome, expressao: String(o.expressao ?? ""), dados: Array.isArray(o.dados) ? o.dados.filter((x): x is number => typeof x === "number") : [], total: o.total };
}

/** Texto do lado do NPC: "Vera: 5d10 → 2 sucessos" (parada de d10) ou "Vera: 1d20+3 = 15". */
export function textoOposicaoCartao(o: OposicaoNoCartao): string {
  if (/d10$/.test(o.expressao)) return `${o.nome}: ${o.expressao} → ${o.total} sucesso${o.total === 1 ? "" : "s"}`;
  return `${o.nome}: ${o.expressao} = ${o.total}`;
}

/** Linha do NPC no cartão do teste oposto, com as faces dele em miniatura. */
export function LinhaOposicao({ r, novo = false }: { r: { oposicao?: unknown }; novo?: boolean }) {
  const o = lerOposicao(r.oposicao);
  if (!o) return null;
  const d10 = /d10$/.test(o.expressao);
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-muted" title="o servidor rolou a parada de quem resiste; empate fica com quem resiste">
      <Icone nome="swords" />
      <span className="text-foreground/85">{textoOposicaoCartao(o)}</span>
      {d10 &&
        o.dados.map((v, i) => (
          <span key={i} className={`grid size-5 place-items-center rounded border text-[11px] tabular-nums ${novo ? "cd-pop" : ""} ${v >= 6 ? "border-foreground/40 text-foreground/85" : "border-border text-muted/70"}`}>
            {v}
          </span>
        ))}
    </p>
  );
}

/** Dano sugerido pelo teste (campo genérico `dano` do resultado), em qualquer sistema. */
function LinhaDano({ r }: { r: Dados }) {
  const d = r.dano as { valor?: unknown; tipo?: unknown; texto?: unknown } | undefined;
  const valor = d ? num(d.valor) : null;
  if (!d || valor === null) return null;
  return (
    <p className="mt-1 text-xs">
      <span className="font-semibold text-sangue">
        <Icone nome="swords" /> dano sugerido {valor}
        {typeof d.tipo === "string" && d.tipo ? ` ${d.tipo}` : ""}
      </span>
      {typeof d.texto === "string" && d.texto && <span className="text-muted"> · {d.texto}</span>}
    </p>
  );
}

function Grau({ r, cor, novo }: { r: Dados; cor: string; novo: boolean }) {
  return <span className={`titulo max-w-[7.5rem] shrink-0 text-balance text-right text-base leading-tight sm:max-w-[10rem] sm:text-lg ${cor} ${novo ? "cd-pop" : ""}`}>{r.rotuloGrau}</span>;
}

function TesteD20({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const natural = num(r.natural);
  const dados: number[] = Array.isArray(r.dados) ? r.dados : [];
  const critico = natural === 20 ? "text-ambar" : natural === 1 ? "text-sangue" : null;
  const cor = COR_GRAU[r.grau] ?? "text-foreground";
  // na vantagem/desvantagem o outro d20 aparece riscado
  const mostrarPar = dados.length === 2 && natural !== null;
  const descartado = mostrarPar ? dados.indexOf(natural) : -1;
  return (
    <Moldura mensagem={mensagem} destaque={critico === "text-ambar" || r.grau === "sucesso_critico" ? ANEL_CRITICO : critico || r.grau === "falha_critica" ? ANEL_FALHA : "border-border"}>
      <div className="flex items-center gap-3">
        <IconeD20 valor={natural ?? r.total} cor={critico ?? cor} novo={novo} brilho={Boolean(critico)} />
        <div className="min-w-0 flex-1">
          <Cabecalho r={r} mensagem={mensagem} />
          <LinhaTeste r={r} />
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {mostrarPar && dados.map((v, i) => <Face key={i} valor={v} lados={20} descartado={i !== descartado} i={i} novo={novo} />)}
            {natural === 20 && <span className="text-ambar">20 natural!</span>}
            {natural === 1 && <span className="text-sangue">1 natural…</span>}
            {r.detalhes && <span className="min-w-0 truncate">{mostrarPar ? String(r.detalhes).replace(/^(vantagem|desvantagem): \d+ e \d+( · )?/, "$1 ") : r.detalhes}</span>}
          </div>
          <LinhaOposicao r={r} novo={novo} />
          <LinhaDano r={r} />
        </div>
        <Grau r={r} cor={cor} novo={novo} />
      </div>
    </Moldura>
  );
}

function TesteD100({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const valor = num(r.natural) ?? num(r.total) ?? 0;
  const alvo = num(r.alvo);
  const cor = COR_GRAU[r.grau] ?? "text-foreground";
  const dezena = Math.floor((valor % 100) / 10);
  const unidade = valor % 10;
  const dificil = alvo !== null ? Math.floor(alvo / 2) : null;
  const extremo = alvo !== null ? Math.floor(alvo / 5) : null;
  const nivel = alvo === null ? null : valor <= (extremo ?? 0) ? "Extremo" : valor <= (dificil ?? 0) ? "Difícil" : valor <= alvo ? "Normal" : null;
  const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
  return (
    <Moldura mensagem={mensagem} destaque={r.grau === "sucesso_critico" ? ANEL_CRITICO : r.grau === "falha_critica" ? ANEL_FALHA : "border-border"}>
      <div className="flex items-center gap-3">
        <div className={`flex shrink-0 gap-1 ${novo ? "dado-rolando" : ""}`} aria-label={`d100: ${valor}`}>
          <span className="grid h-12 w-10 place-items-center rounded-lg border border-pergaminho/50 bg-surface">
            <span className="titulo text-lg text-pergaminho">{dezena}0</span>
            <span className="-mt-2 text-[11px] uppercase text-muted">dez.</span>
          </span>
          <span className="grid h-12 w-9 place-items-center rounded-lg border border-border bg-surface">
            <span className="titulo text-lg">{unidade}</span>
            <span className="-mt-2 text-[11px] uppercase text-muted">un.</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <Cabecalho r={r} mensagem={mensagem} />
          <p className="mt-0.5 text-sm">
            <span className="text-pergaminho">{r.teste}</span>{" "}
            <span className="text-muted">
              rolou <span className={`titulo text-base ${cor} ${novo ? "cd-pop inline-block" : ""}`}>{valor}</span>
              {alvo !== null && ` contra ${alvo}%`}
            </span>
          </p>
        </div>
        <Grau r={r} cor={cor} novo={novo} />
      </div>
      {alvo !== null && (
        <div className="mt-2.5">
          {/* régua 1–100: Extremo (1/5), Difícil (1/2), Normal (valor), falha */}
          <div className="relative h-2.5 overflow-hidden rounded-full bg-sangue/25">
            <div className="absolute inset-y-0 left-0 bg-musgo/35" style={{ width: pct(alvo) }} />
            <div className="absolute inset-y-0 left-0 bg-musgo/60" style={{ width: pct(dificil ?? 0) }} />
            <div className="absolute inset-y-0 left-0 bg-ambar/80" style={{ width: pct(extremo ?? 0) }} />
            <div className="absolute inset-y-[-2px] w-0.5 bg-foreground shadow-[0_0_6px_white]" style={{ left: `calc(${pct(valor)} - 1px)` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted">
            <span className={nivel === "Extremo" ? "text-ambar" : ""}>Extremo ≤{extremo}</span>
            <span className={nivel === "Difícil" ? "text-musgo" : ""}>Difícil ≤{dificil}</span>
            <span className={nivel === "Normal" ? "text-musgo" : ""}>Normal ≤{alvo}</span>
            <span className={nivel === null ? "text-sangue" : ""}>falha</span>
          </div>
          {r.detalhes && <p className="mt-1 truncate text-xs text-muted">{r.detalhes}</p>}
        </div>
      )}
      <LinhaDano r={r} />
    </Moldura>
  );
}

function TesteFate({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const dados: number[] = Array.isArray(r.dados) ? r.dados : [];
  const cor = COR_GRAU[r.grau] ?? "text-foreground";
  const soma = dados.reduce((a, b) => a + b, 0);
  return (
    <Moldura mensagem={mensagem}>
      <Cabecalho r={r} mensagem={mensagem} />
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex shrink-0 gap-1">
          {dados.map((v, i) => (
            <FaceFate key={i} valor={v} i={i} novo={novo} />
          ))}
        </div>
        <span className={`titulo min-w-0 flex-1 text-2xl leading-none ${cor} ${novo ? "cd-pop" : ""}`}>{r.total >= 0 ? `+${r.total}` : r.total}</span>
        <Grau r={r} cor={cor} novo={novo} />
      </div>
      <p className="mt-1 text-sm">
        <span className="text-pergaminho">{r.teste}</span>{" "}
        <span className="text-muted">
          dados {soma >= 0 ? `+${soma}` : soma}
          {num(r.bonus) ? `, perícia ${r.bonus >= 0 ? "+" : "−"}${Math.abs(r.bonus)}` : ""}
          {num(r.alvo) !== null && ` vs ${r.alvo}`}
          {r.detalhes && ` · ${r.detalhes}`}
        </span>
      </p>
      <LinhaDano r={r} />
    </Moldura>
  );
}

const FAIXAS_PBTA = [
  { rotulo: "6−", cor: "bg-sangue/70", texto: "text-sangue", ate: 6 },
  { rotulo: "7–9", cor: "bg-[color-mix(in_srgb,var(--grau-parcial)_60%,transparent)]", texto: "text-[var(--grau-parcial)]", ate: 9 },
  { rotulo: "10+", cor: "bg-musgo/80", texto: "text-musgo", ate: Infinity },
];

function TestePbta({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const dados: number[] = (Array.isArray(r.dados) ? r.dados : []).slice(0, 2);
  const total = num(r.total) ?? 0;
  const faixa = FAIXAS_PBTA.findIndex((f) => total <= f.ate);
  const cor = COR_GRAU[r.grau] ?? FAIXAS_PBTA[faixa]?.texto ?? "text-foreground";
  return (
    <Moldura mensagem={mensagem}>
      <Cabecalho r={r} mensagem={mensagem} />
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex shrink-0 gap-1">
          {dados.map((v, i) => (
            <D6 key={i} valor={v} i={i} novo={novo} />
          ))}
        </div>
        <span className={`titulo min-w-0 flex-1 text-3xl leading-none ${cor} ${novo ? "cd-pop" : ""}`}>{total}</span>
        <Grau r={r} cor={cor} novo={novo} />
      </div>
      <p className="mt-1 text-sm">
        <span className="text-pergaminho">{r.teste}</span> <span className="text-muted">{r.expressao}</span>
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px]">
        {FAIXAS_PBTA.map((f, i) => (
          <div key={f.rotulo} className={`rounded py-0.5 ${i === faixa ? `${f.cor} font-semibold text-background` : "bg-surface text-muted"}`}>
            {f.rotulo}
          </div>
        ))}
      </div>
      {r.detalhes && <p className="mt-1 truncate text-xs text-muted">{r.detalhes}</p>}
      <LinhaDano r={r} />
    </Moldura>
  );
}

/** Dado de d10 em pipa: normal (6+ sucesso, 10 em âmbar) ou de Fome (vermelho; 10 com presas, 1 com caveira). */
function D10({ valor, fome, despertar, i, novo, pequeno }: { valor: number; fome: boolean; despertar?: boolean; i: number; novo: boolean; pequeno?: boolean }) {
  const dez = valor === 10;
  const sucesso = valor >= 6;
  const bestial = fome && !despertar && valor === 1;
  const cor = fome
    ? dez
      ? "text-ambar"
      : bestial
        ? "text-sangue"
        : sucesso
          ? "text-[var(--grau-falha)]"
          : "text-sangue/70"
    : dez
      ? // cor de crítico do tema: no Vampiro o acento é vermelho, e o 10 normal não pode parecer dado de Fome
        "text-[var(--critico)]"
      : sucesso
        ? "text-pergaminho"
        : "text-muted/70";
  const titulo = fome ? (despertar ? "Despertar" : dez ? "10 de Fome" : bestial ? "1 de Fome: a Besta" : "dado de Fome") : dez ? "10" : sucesso ? "sucesso" : "falha";
  return (
    <span
      className={`relative inline-grid ${pequeno ? "size-7" : "size-9"} shrink-0 place-items-center ${cor} ${novo ? "cd-face" : ""}`}
      style={{ ["--i" as string]: i }}
      title={`${titulo}: ${valor}`}
      aria-label={`${titulo}: ${valor}`}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
        <polygon
          points="50,4 92,40 50,96 8,40"
          fill={fome ? "var(--sangue)" : "currentColor"}
          fillOpacity={fome ? (dez || sucesso ? 0.35 : 0.22) : dez ? 0.18 : 0.08}
          stroke={fome ? "var(--sangue)" : "currentColor"}
          strokeWidth={dez ? 7 : 5}
          strokeLinejoin="round"
        />
        <polyline points="8,40 50,58 92,40" fill="none" stroke={fome ? "var(--sangue)" : "currentColor"} strokeOpacity=".4" strokeWidth="3" />
      </svg>
      <span className={`relative -mt-1 text-xs font-semibold tabular-nums ${dez ? "text-sm" : ""}`}>{valor}</span>
      {fome && dez && !despertar && (
        <span className="absolute -right-1 -top-1.5 text-[11px] text-sangue" aria-hidden>
          ᐯᐯ
        </span>
      )}
      {bestial && (
        <Icone nome="skull" className="absolute -right-1 -top-1.5 text-[11px]" />
      )}
    </span>
  );
}

const ROTULO_VTM: Record<string, string> = {
  "Crítico Sujo": "text-sangue",
  "Falha Bestial": "text-sangue",
  Crítico: "text-ambar",
};

/** Teste de Vampiro V5: parada de d10, dados de Fome em vermelho, sucessos contados. */
function TesteVtm({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const dados: number[] = Array.isArray(r.dados) ? r.dados : [];
  const fome: number[] = Array.isArray(r.dadosFome) ? r.dadosFome : [];
  const normais = dados.slice(0, Math.max(0, dados.length - fome.length));
  const despertar = r.vtm === "despertar";
  const total = num(r.total) ?? 0;
  const alvo = num(r.alvo);
  const rotulo = String(r.rotuloGrau ?? "");
  const cor = ROTULO_VTM[rotulo] ?? COR_GRAU[r.grau] ?? "text-foreground";
  const sujo = rotulo === "Crítico Sujo";
  // frenesi que venceu a vontade pinta o cartão como a Falha Bestial
  const bestial = rotulo === "Falha Bestial" || r.grau === "falha_critica" || (r.frenesi && !r.frenesi.resistiu);
  const destaque = sujo || bestial ? ANEL_FALHA : r.grau === "sucesso_critico" ? ANEL_CRITICO : despertar && !r.sucesso ? "border-sangue/40" : "border-border";
  const tom = sujo || bestial ? "bg-sangue/10" : "bg-surface-2/80";
  const despertares = listaDespertares(r.despertares).filter((x) => !x.previsto);
  const dezes = [...normais, ...fome].filter((v) => v === 10).length;
  const pares = Math.floor(dezes / 2);
  // rerrolagem com Força de Vontade (vtm5/forca-de-vontade.ts): índice em `dados` → face de antes
  const rr = r.rerrolado as { dados?: { indice: number; antes: number; depois: number }[]; vontade?: { antes: number; depois: number } } | undefined;
  const trocas = new Map((rr?.dados ?? []).map((t) => [t.indice, t.antes]));
  return (
    <Moldura mensagem={mensagem} destaque={destaque} tom={tom}>
      <Cabecalho r={r} mensagem={mensagem} />
      <div className="mt-1.5 flex items-center gap-3">
        <div className={`grid size-14 shrink-0 place-items-center rounded-full border-2 ${sujo || bestial ? "border-sangue/70" : "border-current"} ${cor} ${novo ? "dado-rolando" : ""} ${novo && (sujo || bestial || r.grau === "sucesso_critico") ? "cd-brilho" : ""}`}>
          <span className="flex flex-col items-center leading-none">
            <span className="titulo text-2xl">{total}</span>
            <span className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">{despertar ? "ok" : total === 1 ? "sucesso" : "sucessos"}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="text-pergaminho">{r.teste}</span>{" "}
            <span className="text-muted">
              {/* teste oposto: o lado do NPC tem linha própria embaixo dos dados */}
              {lerOposicao(r.oposicao) ? String(r.expressao ?? "").replace(/\s+vs\s+.*$/, "") : r.expressao}
              {num(r.margem) !== null && alvo !== null && !despertar && !lerOposicao(r.oposicao) && <span className="text-muted/80"> ({r.margem >= 0 ? `+${r.margem}` : r.margem})</span>}
            </span>
          </p>
          {!despertar && (
            <p className="mt-0.5 text-xs text-muted">
              {num(r.parada) ?? dados.length} dados{fome.length ? <span className="text-sangue"> · {fome.length} de Fome</span> : null}
              {pares > 0 && <span className="text-ambar"> · {pares} par{pares > 1 ? "es" : ""} de 10</span>}
            </p>
          )}
        </div>
        <Grau r={r} cor={cor} novo={novo} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {normais.map((v, i) =>
          trocas.has(i) ? (
            // rerrolado com Força de Vontade: contorno âmbar e o valor de antes no título
            <span key={`n${i}`} className="relative rounded-md ring-1 ring-ambar/80 ring-offset-1 ring-offset-transparent" title={`rerrolado com Força de Vontade: ${trocas.get(i)} → ${v}`}>
              <D10 valor={v} fome={false} i={i} novo={novo} />
              <span className="absolute -left-1 -top-1.5 text-[11px] font-bold text-ambar" aria-hidden>
                <Icone nome="redo" />
              </span>
            </span>
          ) : (
            <D10 key={`n${i}`} valor={v} fome={false} i={i} novo={novo} />
          ),
        )}
        {fome.length > 0 && normais.length > 0 && <span className="mx-0.5 h-6 w-px bg-sangue/40" aria-hidden />}
        {fome.map((v, i) => (
          <D10 key={`f${i}`} valor={v} fome despertar={despertar} i={normais.length + i} novo={novo} />
        ))}
      </div>
      <LinhaOposicao r={r} novo={novo} />
      {despertares.map((x, k) => (
        <FaixaDespertar key={k} x={x} novo={novo} />
      ))}
      <EfeitosVtm efeitos={r.efeitos} />
      {rr?.vontade && (
        <p className="mt-1.5 text-xs text-ambar">
          <span className="font-semibold">
            <Icone nome="redo" /> Força de Vontade {rr.vontade.antes} → {rr.vontade.depois}
          </span>{" "}
          <span className="text-muted">(superficial)</span> · rerrolou {(rr.dados ?? []).map((t) => `${t.antes}→${t.depois}`).join(", ")}
        </p>
      )}
      {r.detalhes && <p className={`mt-1.5 text-xs ${sujo || bestial ? "text-sangue/90" : "text-muted"}`}>{r.detalhes}</p>}
      <LinhaDano r={r} />
    </Moldura>
  );
}

// ---------- sangue do Vampiro: Despertar, Surto, efeitos ----------

/** Despertar como o servidor manda (sistemas/vtm5/sangue.ts). */
export type DespertarVtm = {
  rolagens: number[][];
  vezes: number;
  falhas: number;
  rerrolagem?: boolean;
  fomeAntes: number;
  fomeDepois: number;
  estourou?: boolean;
  motivo?: string;
  previsto?: boolean;
};

export function listaDespertares(v: unknown): DespertarVtm[] {
  return (Array.isArray(v) ? v : []).filter((x): x is DespertarVtm => Boolean(x) && typeof x === "object" && Array.isArray((x as DespertarVtm).rolagens));
}

const COR_EFEITO: Record<string, string> = { sangue: "var(--sangue)", ambar: "var(--critico)", musgo: "var(--musgo)", muted: "var(--muted)" };

/** Pílulas do que o teste custou ou mudou: "Fome 3 → 2", "Colérica intensa", "Surto +2", "Frenesi (fúria)". */
export function EfeitosVtm({ efeitos, centro = false }: { efeitos: unknown; centro?: boolean }) {
  const lista = (Array.isArray(efeitos) ? efeitos : []) as { texto?: string; tom?: string }[];
  if (!lista.length) return null;
  return (
    <div className={`mt-1.5 flex flex-wrap gap-1 ${centro ? "justify-center" : ""}`}>
      {lista.map((e, i) => {
        const cor = COR_EFEITO[e.tom ?? ""] ?? COR_EFEITO.muted;
        return (
          <span
            key={i}
            className="inline-flex items-center rounded-full border px-2 py-px text-[11px] leading-5"
            style={{ color: cor, borderColor: `color-mix(in srgb, ${cor} 45%, transparent)`, background: `color-mix(in srgb, ${cor} 10%, transparent)` }}
          >
            {e.texto}
          </span>
        );
      })}
    </div>
  );
}

/** Fome em 5 losangos; os pontos que o Despertar acabou de encher brilham. */
export function MedidorFome({ antes, depois, novo = false }: { antes: number; depois: number; novo?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={antes === depois ? `Fome ${depois} de 5` : `Fome ${antes} para ${depois} de 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const cheio = i < depois;
        const recente = i >= antes && i < depois;
        return (
          <span
            key={i}
            className={`inline-block size-2.5 rotate-45 border ${cheio ? "border-sangue bg-sangue" : "border-sangue/45 bg-transparent"} ${recente && novo ? "cd-brilho" : ""}`}
            style={recente ? { boxShadow: "0 0 7px var(--sangue)", color: "var(--sangue)" } : undefined}
          />
        );
      })}
    </span>
  );
}

/** Faces de um Despertar: o dado que falhou e foi rerrolado aparece apagado e riscado antes do novo. */
function FacesDespertar({ x, novo, pequeno = false }: { x: DespertarVtm; novo: boolean; pequeno?: boolean }) {
  let i = 0;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {x.rolagens.map((r, k) => (
        <span key={k} className="inline-flex items-center gap-0.5">
          {r.length > 1 && (
            <span className="inline-flex items-center opacity-40" title="rerrolado (Potência de Sangue)">
              <D10 valor={r[0]} fome despertar i={i++} novo={novo} pequeno={pequeno} />
              <span className="text-[11px] text-muted" aria-hidden>
                <Icone nome="redo" />
              </span>
            </span>
          )}
          <D10 valor={r[r.length - 1]} fome despertar i={i++} novo={novo} pequeno={pequeno} />
        </span>
      ))}
    </span>
  );
}

function textoFome(x: DespertarVtm) {
  if (x.estourou) return x.fomeAntes < 5 ? `Fome ${x.fomeAntes} → 5 · a Besta cobra` : "Fome 5 · o sangue não responde";
  return x.falhas ? `Fome ${x.fomeAntes} → ${x.fomeDepois}` : `Fome segue ${x.fomeAntes}`;
}

/** Faixa de Despertar dentro de um teste (o poder da disciplina, o Surto do nome do teste). */
export function FaixaDespertar({ x, novo = false, centro = false }: { x: DespertarVtm; novo?: boolean; centro?: boolean }) {
  const pesou = x.falhas > 0 || x.estourou;
  return (
    <div
      className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2 py-1 text-xs ${pesou ? "border-sangue/45 bg-sangue/10" : "border-sangue/25 bg-sangue/5"} ${centro ? "justify-center" : ""}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-sangue"><Icone nome="drop" />  Despertar{x.vezes > 1 ? ` ×${x.vezes}` : ""}</span>
      {x.motivo && <span className="text-foreground/85">{x.motivo}</span>}
      <FacesDespertar x={x} novo={novo} pequeno />
      <MedidorFome antes={x.fomeAntes} depois={x.fomeDepois} novo={novo} />
      <span className={pesou ? "text-sangue" : "text-muted"}>{textoFome(x)}</span>
    </div>
  );
}

/** Cartão pequeno do Despertar avulso e do Surto de Sangue: "Despertar · Celeridade ●● — 4 → Fome 2 → 3". */
function SangueVtm({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const x = listaDespertares(r.despertares)[0];
  const surto = r.vtm === "surto";
  const ganho = num(r.surtoGanho) ?? 0;
  const pesou = x.falhas > 0 || x.estourou;
  const cor = surto ? (ganho ? "text-[var(--critico)]" : "text-sangue") : pesou ? "text-sangue" : "text-musgo";
  return (
    <Moldura mensagem={mensagem} destaque={x.estourou ? "border-sangue/70" : pesou ? "border-sangue/45" : "border-sangue/20"} tom={x.estourou ? "bg-sangue/10" : "bg-surface-2/80"}>
      <Cabecalho r={r} mensagem={mensagem} />
      <div className="mt-1.5 flex items-center gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full border-2 border-sangue/60 text-lg ${novo ? "dado-rolando" : ""}`} aria-hidden>
          {surto ? <Icone nome="bolt" /> : <Icone nome="drop" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="text-pergaminho">{surto ? "Surto de Sangue" : `Despertar${x.vezes > 1 ? ` ×${x.vezes}` : ""}`}</span>
            {!surto && x.motivo && <span className="text-muted"> · {x.motivo}</span>}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            <FacesDespertar x={x} novo={novo} />
            <MedidorFome antes={x.fomeAntes} depois={x.fomeDepois} novo={novo} />
            <span className={pesou ? "text-sangue" : "text-muted"}>{textoFome(x)}</span>
          </div>
        </div>
        <span className={`titulo max-w-[7.5rem] shrink-0 text-balance text-right text-base leading-tight sm:text-lg ${cor} ${novo ? "cd-pop" : ""}`}>{r.rotuloGrau}</span>
      </div>
      {surto && ganho > 0 && <p className="mt-1.5 text-xs text-[var(--critico)]">+{ganho} dados no próximo teste (fora de disciplinas)</p>}
      {x.rerrolagem && x.rolagens.some((f) => f.length > 1) && <p className="mt-1 text-xs text-muted">
          <Icone nome="redo" /> rerrolou pela Potência de Sangue
        </p>}
      {x.estourou && <p className="mt-1 text-xs text-sangue/90">Fome 5: o sangue não responde e a Besta exige: teste de frenesi de fome.</p>}
    </Moldura>
  );
}

// ---------- rolagens livres ----------

type Parte = { termo: string; sinal: 1 | -1; lados?: number | "F"; valores?: number[]; mantidos?: number[]; constante?: number; subtotal: number };

function PartesRolagem({ partes, novo }: { partes: Parte[]; novo: boolean }) {
  let indice = 0;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      {partes.map((p, k) => {
        const operador = k === 0 ? (p.sinal < 0 ? "−" : null) : p.sinal < 0 ? "−" : "+";
        if (p.constante !== undefined) {
          return (
            <span key={k} className="text-muted tabular-nums">
              {operador} {p.constante}
            </span>
          );
        }
        const valores = p.valores ?? [];
        const mantidos = new Set(p.mantidos ?? valores.map((_, i) => i));
        const explosivo = p.termo.includes("!");
        return (
          <span key={k} className="inline-flex flex-wrap items-center gap-1">
            {operador && <span className="text-muted">{operador}</span>}
            <span className="text-[11px] text-muted">{p.termo}</span>
            {valores.map((v, i) => (
              <Face
                key={i}
                valor={v}
                lados={p.lados ?? 6}
                descartado={!mantidos.has(i)}
                // o motor empurra a explosão logo depois do máximo que a causou
                explodiu={explosivo && v === p.lados}
                i={indice++}
                novo={novo}
              />
            ))}
          </span>
        );
      })}
    </div>
  );
}

function Rolagem({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const partes: Parte[] = Array.isArray(r.partes) ? r.partes : [];
  const dadosTermos = partes.filter((p) => p.valores);
  // d20 sozinho (ou vantagem/desvantagem): destaca 20/1 natural do dado que valeu
  const unicoD20 = dadosTermos.length === 1 && dadosTermos[0].lados === 20 ? dadosTermos[0] : null;
  const natural = unicoD20 && unicoD20.mantidos?.length === 1 ? unicoD20.valores![unicoD20.mantidos[0]] : null;
  const unicoD100 = dadosTermos.length === 1 && dadosTermos[0].lados === 100 && dadosTermos[0].valores?.length === 1 ? dadosTermos[0].valores[0] : null;
  const critico = natural === 20 ? "ambar" : natural === 1 ? "sangue" : null;
  const valoresManuais: number[] = r.manual && Array.isArray(r.valores) ? r.valores : [];
  const fateManual = r.manual && /df/i.test(String(r.expressao ?? ""));

  return (
    <Moldura
      mensagem={mensagem}
      destaque={critico === "ambar" ? "border-ambar/60" : critico === "sangue" ? "border-sangue/60" : r.origem === "jogador" ? "border-ambar/25" : "border-border"}
      tom={r.origem === "jogador" ? "bg-surface-2/70" : "bg-surface-2/50"}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Cabecalho r={r} mensagem={mensagem} padrao={r.manual ? "Dados físicos" : "Rolagem"} />
          {r.secreta ? (
            <p className="mt-1 text-sm italic text-muted">O mestre rolou atrás do escudo. Você ouviu os dados, e só.</p>
          ) : r.manual ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
              {r.expressao && <span className="text-xs text-muted">{r.expressao}</span>}
              {valoresManuais.map((v, i) => (fateManual ? <FaceFate key={i} valor={v} i={i} novo={novo} /> : <Face key={i} valor={v} lados={1000} i={i} novo={novo} />))}
              {!valoresManuais.length && <span className="text-xs text-muted">resultado informado na palavra</span>}
            </div>
          ) : partes.length ? (
            <PartesRolagem partes={partes} novo={novo} />
          ) : (
            r.descricao && <p className="mt-1 truncate text-sm text-muted">{r.descricao}</p>
          )}
          {natural === 20 && <p className="mt-1 text-xs text-ambar">20 natural!</p>}
          {natural === 1 && <p className="mt-1 text-xs text-sangue">1 natural… os deuses riram.</p>}
          {unicoD100 !== null && (
            <p className="mt-1 text-xs text-muted">
              dezena {Math.floor((unicoD100 % 100) / 10)}0 · unidade {unicoD100 % 10}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span
            className={`titulo text-3xl leading-none ${critico === "ambar" ? "text-ambar" : critico === "sangue" ? "text-sangue" : "text-pergaminho"} ${novo ? "cd-pop" : ""}`}
            aria-label={r.secreta ? "resultado secreto" : `total ${r.total}`}
          >
            {r.secreta ? "?" : r.total}
          </span>
          {!r.secreta && r.expressao && !r.manual && <span className="mt-1 text-xs text-muted">{r.expressao}</span>}
        </div>
      </div>
    </Moldura>
  );
}

// ---------- ficha, xp, descanso, cena, diário ----------

function Ficha({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const pv = num(r.pv);
  const pvMax = num(r.pvMax);
  const pvAntes = num(r.pvAntes);
  const delta = pv !== null && pvAntes !== null ? pv - pvAntes : 0;
  const recursos: string[] = Array.isArray(r.recursos) ? r.recursos : [];
  const ganhou: string[] = Array.isArray(r.ganhou) ? r.ganhou : [];
  const perdeu: string[] = Array.isArray(r.perdeu) ? r.perdeu : [];
  const condicoes: string[] = Array.isArray(r.condicoes) ? r.condicoes : [];
  const alertas: string[] = Array.isArray(r.alertas) ? r.alertas.filter((x: unknown) => typeof x === "string") : [];
  const pctAntes = pvMax ? Math.max(0, Math.min(100, ((pvAntes ?? 0) / pvMax) * 100)) : 0;
  const pctAgora = pvMax ? Math.max(0, Math.min(100, ((pv ?? 0) / pvMax) * 100)) : 0;
  return (
    <Moldura mensagem={mensagem} destaque="border-dashed border-border" tom="bg-surface/60">
      <p className="flex items-baseline gap-2 text-sm">
        <span className="text-xs text-muted">
          <Icone nome="pencil" />
        </span>
        <span className="min-w-0 flex-1 truncate">
          {r.personagem && <span className="text-foreground">{r.personagem}</span>}
          {r.motivo && <span className="text-muted"> · {r.motivo}</span>}
        </span>
        {delta !== 0 && (
          <span className={`titulo shrink-0 text-lg ${delta < 0 ? "text-sangue" : "text-musgo"} ${novo ? "cd-pop" : ""}`}>
            {delta > 0 ? "+" : ""}
            {delta} PV
          </span>
        )}
      </p>
      {delta !== 0 && pvMax ? (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-background/60">
            {/* a parte perdida (ou ganha) aparece clarinha atrás da barra atual */}
            <div className={`absolute inset-y-0 left-0 ${delta < 0 ? "bg-sangue/35" : "bg-musgo/35"}`} style={{ width: `${Math.max(pctAntes, pctAgora)}%` }} />
            <div className={`absolute inset-y-0 left-0 transition-[width] duration-700 ${pctAgora > 50 ? "bg-musgo" : pctAgora > 20 ? "bg-ambar" : "bg-sangue"}`} style={{ width: `${Math.min(pctAntes, pctAgora)}%` }} />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {pv}/{pvMax}
          </span>
        </div>
      ) : null}
      {(recursos.length > 0 || ganhou.length > 0 || perdeu.length > 0 || condicoes.length > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
          {recursos.map((x) => (
            <span key={`r${x}`} className="rounded bg-[color-mix(in_srgb,var(--grau-parcial)_12%,transparent)] px-1.5 py-0.5 text-[var(--grau-parcial)]">
              {x}
            </span>
          ))}
          {ganhou.map((x) => (
            <span key={`g${x}`} className="rounded bg-musgo/15 px-1.5 py-0.5 text-musgo">
              + {x}
            </span>
          ))}
          {perdeu.map((x) => (
            <span key={`p${x}`} className="rounded bg-sangue/15 px-1.5 py-0.5 text-sangue line-through decoration-sangue/60">
              {x}
            </span>
          ))}
          {condicoes.map((x) => (
            <span key={`c${x}`} className="rounded border border-border px-1.5 py-0.5 text-muted">
              {x}
            </span>
          ))}
        </div>
      )}
      {alertas.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
          {alertas.map((x) => (
            <span key={`a${x}`} className="rounded border border-sangue/50 bg-sangue/15 px-1.5 py-0.5 font-semibold text-sangue">
              <Icone nome="warning" /> {x}
            </span>
          ))}
        </div>
      )}
    </Moldura>
  );
}

function Xp({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const subiu = num(r.subiuPara);
  return (
    <Moldura mensagem={mensagem} destaque={subiu ? "border-ambar/70" : "border-ambar/25"} tom={subiu ? "bg-ambar/10" : "bg-surface-2/60"}>
      <div className={`flex items-center gap-3 ${subiu ? "text-ambar" : ""}`}>
        <span className={`grid size-10 shrink-0 place-items-center rounded-full border border-ambar/50 text-lg text-ambar ${novo ? "dado-rolando" : ""} ${novo && subiu ? "cd-brilho" : ""}`} aria-hidden>
          <Icone nome="sparkle" />
        </span>
        <div className="min-w-0 flex-1 text-sm text-foreground">
          <p>
            <span className="text-pergaminho">{r.personagem}</span>
            {num(r.ganho) !== null && <span className="text-muted"> ganhou </span>}
            {num(r.ganho) !== null && <span className="text-ambar">{r.ganho} XP</span>}
            {num(r.total) !== null && <span className="text-muted"> · total {r.total}</span>}
          </p>
          {r.resumo && <p className="text-xs text-muted">{r.resumo}</p>}
        </div>
        {subiu !== null && <span className={`titulo shrink-0 text-right text-base leading-tight text-ambar ${novo ? "cd-pop" : ""}`}>Nível {subiu}!</span>}
      </div>
    </Moldura>
  );
}

/** "tipo" já é o tipo da mensagem; o tipo do descanso pode vir em outro campo (ou ter sobrescrito o tipo). */
function qualDescanso(r: Dados): string {
  const v = r.descanso ?? r.tipoDescanso ?? r.modo ?? (r.tipo !== "descanso" ? r.tipo : "");
  return typeof v === "string" ? v : "";
}

function Descanso({ r, mensagem }: { r: Dados; mensagem: Mensagem }) {
  return (
    <Moldura mensagem={mensagem} destaque="border-[color-mix(in_srgb,var(--grau-parcial)_30%,transparent)]" tom="bg-surface/60">
      <p className="flex items-baseline gap-2 text-sm">
        <span className="text-[var(--grau-parcial)]" aria-hidden>
          <Icone nome="moon" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-foreground">{r.personagem}</span>
          <span className="text-muted"> · descanso {qualDescanso(r)}</span>
          {r.resumo && <span className="block text-xs text-muted">{r.resumo}</span>}
        </span>
      </p>
    </Moldura>
  );
}

type LinhaIniciativa = { nome?: string; iniciativa?: number | null; aliado?: boolean; detalhe?: string };

/** Ordem de iniciativa no começo do combate (ou dos reforços): aliados em verde, inimigos em vermelho. */
function Iniciativa({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const ordem = (Array.isArray(r.ordem) ? r.ordem : []) as LinhaIniciativa[];
  return (
    <Moldura mensagem={mensagem} destaque="border-sangue/40" tom="bg-surface-2/80">
      <p className="flex items-baseline justify-between gap-2 text-xs text-muted">
        <span className="uppercase tracking-wider text-sangue">
          <Icone nome="swords" /> Iniciativa
        </span>
        {num(r.rodada) !== null && <span>rodada {r.rodada}</span>}
      </p>
      <ol className="mt-1.5 space-y-0.5">
        {ordem.map((c, i) => (
          <li
            key={`${c.nome}-${i}`}
            className={`flex items-baseline gap-2 rounded-md border-l-2 px-2 py-0.5 text-sm ${c.aliado ? "border-musgo bg-musgo/5" : "border-sangue bg-sangue/5"} ${novo ? "cd-face" : ""}`}
            style={novo ? ({ "--i": i } as CSSProperties) : undefined}
          >
            <span className="w-7 shrink-0 text-right font-semibold tabular-nums text-foreground">{c.iniciativa ?? <span className="font-normal text-muted">·</span>}</span>
            <span className={`min-w-0 flex-1 truncate ${c.aliado ? "text-musgo" : "text-sangue"}`}>{c.nome}</span>
            {c.detalhe && <span className="hidden shrink-0 text-xs text-muted sm:inline">{c.detalhe}</span>}
          </li>
        ))}
      </ol>
      {r.resumo && <p className="mt-1.5 text-xs text-muted">{r.resumo}</p>}
    </Moldura>
  );
}

function Nota({ icone, rotulo, texto }: { icone: NomeIcone; rotulo: string; texto: string }) {
  return (
    <div className="surgir mx-auto flex w-full max-w-lg items-baseline gap-2 rounded-lg border border-dashed border-border/80 px-3 py-1.5 text-xs text-muted">
      <span className="text-ambar" aria-hidden>
        <Icone nome={icone} />
      </span>
      <span className="shrink-0 uppercase tracking-wider">{rotulo}</span>
      <span className="min-w-0 flex-1 text-foreground/80">{texto}</span>
    </div>
  );
}

function Conteudo({ mensagem, novo }: { mensagem: Mensagem; novo: boolean }) {
  const r = (mensagem.dados ?? {}) as Dados;
  switch (r.tipo) {
    case "teste": {
      const s = sabor(r);
      if (s === "vtm5" && (r.vtm === "despertar" || r.vtm === "surto") && listaDespertares(r.despertares).length) return <SangueVtm r={r} mensagem={mensagem} novo={novo} />;
      if (s === "vtm5") return <TesteVtm r={r} mensagem={mensagem} novo={novo} />;
      if (s === "d100") return <TesteD100 r={r} mensagem={mensagem} novo={novo} />;
      if (s === "fate") return <TesteFate r={r} mensagem={mensagem} novo={novo} />;
      if (s === "pbta") return <TestePbta r={r} mensagem={mensagem} novo={novo} />;
      return <TesteD20 r={r} mensagem={mensagem} novo={novo} />;
    }
    case "rolagem":
      return <Rolagem r={r} mensagem={mensagem} novo={novo} />;
    case "ficha":
      return <Ficha r={r} mensagem={mensagem} novo={novo} />;
    case "xp":
      return <Xp r={r} mensagem={mensagem} novo={novo} />;
    case "descanso":
    case "curto":
    case "longo":
      return <Descanso r={r} mensagem={mensagem} />;
    case "cena":
      return <Nota icone="place" rotulo="Cena" texto={String(r.texto ?? mensagem.texto)} />;
    case "diario":
      return <Nota icone="scroll" rotulo="Diário" texto={String(r.texto ?? mensagem.texto)} />;
    case "iniciativa":
      return <Iniciativa r={r} mensagem={mensagem} novo={novo} />;
    case "combate":
      return <Nota icone="swords" rotulo="Combate" texto={String(r.resumo ?? mensagem.texto)} />;
    default:
      return <Nota icone="sparkle" rotulo="Mesa" texto={mensagem.texto} />;
  }
}

export function CartaoDado({ mensagem, novo }: { mensagem: Mensagem; novo: boolean }) {
  return (
    <>
      <style href="taverna-cartao-dado" precedence="default">
        {CSS}
      </style>
      <Conteudo mensagem={mensagem} novo={novo} />
    </>
  );
}

// ---------- decisão depois do teste (rerrolar com Força de Vontade, Ponto de Herói, Inspiração) ----------

/** O que o servidor grava em `dados.decisao` (DecisaoDoTeste em lib/constantes.ts). */
export type DecisaoNoCartao = {
  ate: number | null;
  clienteId: string | null;
  campanhaId: number;
  opcoes: { id: string; rotulo: string; custo?: string; dados?: { max: number; elegiveis: number[]; padrao?: number[] } }[];
  discreta?: boolean;
  automatico?: boolean;
};

/** A decisão do cartão ainda vale (a de "depois" some sozinha quando o tempo dela acaba; a que pausa, só o servidor fecha). */
export function decisaoAberta(d: { decisao?: unknown } | null | undefined, agora = Date.now()): DecisaoNoCartao | null {
  const x = d?.decisao as DecisaoNoCartao | undefined;
  if (!x || !Array.isArray(x.opcoes) || !x.opcoes.length) return null;
  if ((x.discreta || x.automatico) && x.ate !== null && agora > x.ate + 500) return null;
  return x;
}

function useAgora(ms = 250) {
  const [agora, setAgora] = useState(0);
  useEffect(() => {
    const tique = () => setAgora(Date.now());
    const t0 = setTimeout(tique, 0);
    const t = setInterval(tique, ms);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [ms]);
  return agora;
}

/**
 * O jogador decide depois do dado. Só o dono (o aparelho que rolou; com o dono fora, a máquina da taverna) tem os botões; os
 * outros veem "aguardando". O prazo é do servidor: aqui só a barrinha. Mesa solo espera sem prazo. Com opção de dados (Vampiro),
 * os dados normais viram botões (até `max`, os que falharam já marcados) e os de Fome ficam travados. Enter aceita só com o foco
 * dentro do cartão (chat/atalhos.tsx); F rerrola.
 */
export function DecisaoDoTeste({
  mensagemId,
  decisao,
  r,
  podeDecidir,
  quem,
  recurso,
  clienteId,
  aoRerrolar,
}: {
  mensagemId: number;
  decisao: DecisaoNoCartao;
  /** o resultado em decisão: faces e quantas são de Fome */
  r: { dados?: number[]; dadosFome?: number[] };
  podeDecidir: boolean;
  quem: string;
  /** o recurso que a opção gasta, para o jogador ver quanto tem ("Força de Vontade 3/5") */
  recurso?: { rotulo: string; atual: number; max: number } | null;
  clienteId: string;
  aoRerrolar?: (novo: Record<string, unknown>) => void;
}) {
  const agora = useAgora();
  const opcao = decisao.opcoes[0];
  const escolhaDados = opcao.dados;
  const [marcados, setMarcados] = useState<number[]>(() => escolhaDados?.padrao ?? []);
  const [enviando, setEnviando] = useState<"rerrolar" | "aceitar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const depois = Boolean(decisao.discreta || decisao.automatico);

  // o cartão NÃO puxa o foco sozinho: o Enter dado por reflexo (o do leitor cena a cena) nunca cai nele. O jogador põe o foco
  // de propósito (clique no cartão ou Tab) para aceitar com Enter; F rerrola de qualquer lugar.

  async function decidir(aceitar: boolean) {
    if (enviando) return;
    if (!aceitar && escolhaDados && !marcados.length) {
      setErro("Escolha pelo menos um dado para rerrolar.");
      return;
    }
    setEnviando(aceitar ? "aceitar" : "rerrolar");
    setErro(null);
    const corpo = aceitar ? { mensagemId, aceitar: true, clienteId } : { mensagemId, opcao: opcao.id, clienteId, ...(escolhaDados ? { dados: marcados } : {}) };
    const resp = await fetch(`/api/campanhas/${decisao.campanhaId}/rerrolar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    }).catch(() => null);
    const json = resp ? ((await resp.json().catch(() => ({}))) as { resultado?: Record<string, unknown>; erro?: string }) : {};
    if (!resp?.ok) {
      setErro(json.erro ?? "Não deu certo. Tente de novo.");
      setEnviando(null);
      return;
    }
    // a mensagem atualizada chega pelo fluxo de eventos e tira os botões; o resultado novo já anima aqui
    if (!aceitar && json.resultado) aoRerrolar?.(json.resultado);
  }

  const faces = Array.isArray(r.dados) ? r.dados : [];
  const qtdFome = Array.isArray(r.dadosFome) ? r.dadosFome.length : 0;
  const normais = faces.slice(0, faces.length - qtdFome);
  const fome = faces.slice(faces.length - qtdFome);
  // o prazo é do servidor; aqui só a barrinha
  const prazo = decisao.ate === null ? null : decisao.discreta ? PRAZO_DISCRETO_MS : PRAZO_DECISAO_MS;
  const resta = decisao.ate === null || !agora ? null : Math.max(0, decisao.ate - agora);
  function alternar(i: number) {
    if (!escolhaDados?.elegiveis.includes(i)) return;
    setErro(null);
    setMarcados((m) => (m.includes(i) ? m.filter((x) => x !== i) : m.length >= escolhaDados.max ? m : [...m, i].sort((a, b) => a - b)));
  }
  // a oferta de depois some sozinha quando o tempo dela acaba (o servidor fecha na próxima ação)
  if (depois && decisao.ate !== null && agora && agora > decisao.ate + 500 && !enviando) return null;
  const nomesMarcados = marcados.map((i) => normais[i]).filter((v) => v !== undefined);
  const textoMarcados = nomesMarcados.length ? `rerrolar ${nomesMarcados.length > 1 ? `${nomesMarcados.slice(0, -1).join(", ")} e ${nomesMarcados[nomesMarcados.length - 1]}` : nomesMarcados[0]}` : "nenhum dado marcado";

  return (
    <div
      ref={caixa}
      tabIndex={-1}
      className={`surgir mx-auto mt-4 max-w-md rounded-xl border bg-background/35 px-3 py-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ambar/70 ${
        depois ? "border-border/70" : "border-ambar/45"
      }`}
      data-decisao={mensagemId}
      aria-label="Decidir o teste"
    >
      <p className="text-sm text-foreground/90">
        {depois ? "Quer tentar de novo?" : "Decidir antes de o mestre narrar:"} <span className="font-semibold text-ambar">{opcao.rotulo}</span>
        {recurso && (
          <span className="text-muted">
            {" "}
            ({recurso.rotulo} {recurso.atual}/{recurso.max})
          </span>
        )}
      </p>
      {escolhaDados && normais.length > 0 && (
        <div className="mt-2" data-escolha-dados>
          <p className="text-xs text-muted">
            {podeDecidir ? `Toque nos dados normais para rerrolar (até ${escolhaDados.max}); os de Fome ficam.` : "Dados normais e de Fome:"}
          </p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
            {normais.map((v, i) => {
              const sim = marcados.includes(i);
              return (
                <button
                  key={`n${i}`}
                  type="button"
                  data-dado-normal={i}
                  aria-pressed={sim}
                  disabled={!podeDecidir || enviando !== null}
                  onClick={() => alternar(i)}
                  title={sim ? `Rerrolar este ${v}` : `Manter este ${v}`}
                  className={`grid size-9 place-items-center rounded-md border text-sm font-semibold tabular-nums transition ${
                    sim ? "border-ambar bg-ambar/20 text-ambar ring-1 ring-ambar" : v >= 6 ? "border-border text-foreground/90" : "border-border/70 text-muted"
                  } disabled:cursor-default`}
                >
                  <span className="inline-flex items-center gap-px">
                    {sim && <Icone nome="redo" className="text-[0.8em]" />}
                    {v}
                  </span>
                </button>
              );
            })}
            {fome.map((v, i) => (
              <span
                key={`f${i}`}
                className="grid size-9 cursor-not-allowed place-items-center rounded-md border border-sangue/60 bg-sangue/10 text-sm font-semibold tabular-nums text-sangue opacity-80"
                title="Dado de Fome: nunca é rerrolado"
                data-dado-fome={i}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
      {podeDecidir ? (
        <div className="mt-3 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            data-rerrolar
            disabled={enviando !== null || (Boolean(escolhaDados) && !marcados.length)}
            onClick={() => void decidir(false)}
            className="btn-ambar min-h-11 flex-col gap-0 px-4 py-2 leading-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ambar"
          >
            <span>
              {enviando === "rerrolar" ? (
                "Rerrolando…"
              ) : (
                <>
                  <Icone nome="redo" /> {opcao.rotulo}
                </>
              )}
            </span>
            <span className="text-[11px] font-normal opacity-80">
              {escolhaDados ? textoMarcados : "rola o d20 de novo e fica com o novo"}
              {opcao.custo ? ` · −${opcao.custo}` : ""}
            </span>
          </button>
          <button
            type="button"
            data-aceitar
            disabled={enviando !== null}
            onClick={() => void decidir(true)}
            className="btn-borda min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ambar"
          >
            {enviando === "aceitar" ? "Aceitando…" : depois ? "Deixar como está" : "Aceitar o resultado"}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm italic text-muted">Aguardando {quem} decidir…</p>
      )}
      {resta !== null && prazo !== null && (
        <div className="mx-auto mt-3 h-1 max-w-xs overflow-hidden rounded-full bg-border/60" aria-hidden>
          <div className="h-full bg-ambar/80 transition-[width] duration-300 ease-linear" style={{ width: `${Math.min(100, (resta / prazo) * 100)}%` }} />
        </div>
      )}
      <p className="mt-1 text-xs text-muted">
        {decisao.ate === null
          ? "a mesa espera você decidir"
          : resta === null
            ? ""
            : depois
              ? `o botão some em ${Math.ceil(resta / 1000)} s${decisao.automatico ? " · o mestre corrige a narração" : ""}`
              : `fica com o resultado em ${Math.ceil(resta / 1000)} s`}
        {podeDecidir ? " · F rerrola, Enter (com o cartão em foco) aceita" : ""}
      </p>
      {erro && <p className="mt-1 text-xs text-sangue">{erro}</p>}
    </div>
  );
}
