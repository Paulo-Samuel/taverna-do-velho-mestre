"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Mensagem } from "@/lib/db";

// Cartão de uma mensagem de dado: teste de personagem (d20, d100, Fate, PbtA, parada de d10 do Vampiro V5), rolagem livre (mestre ou jogador),
// mudança de ficha, XP, descanso, iniciativa, fim de combate, cena e diário. Tipo desconhecido cai num cartão genérico com mensagem.texto.
// Os dados vêm do servidor (ResultadoTeste de sistemas/tipos.ts, Rolagem de dados.ts ou resumos das ferramentas).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dados = Record<string, any>;

const COR_GRAU: Record<string, string> = {
  sucesso_critico: "text-ambar",
  sucesso: "text-musgo",
  parcial: "text-sky-300",
  falha: "text-sangue",
  falha_critica: "text-sangue",
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

/** Selo pequeno no canto: manual, secreta, só para você... */
function Selo({ children, cor = "border-border text-muted" }: { children: ReactNode; cor?: string }) {
  return <span className={`shrink-0 rounded-full border px-1.5 py-px text-[10px] uppercase tracking-wider ${cor}`}>{children}</span>;
}

function Selos({ r }: { r: Dados }) {
  return (
    <>
      {r.manual && <Selo cor="border-pergaminho/40 text-pergaminho">✋ manual</Selo>}
      {r.secreta && <Selo cor="border-sangue/50 text-sangue">secreta</Selo>}
      {r.privada && <Selo cor="border-sky-300/40 text-sky-300">só para você</Selo>}
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
        {jogador && "🎲 "}
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
        <span className="absolute -right-1.5 -top-1.5 text-[10px] text-ambar" aria-label="explodiu">
          ✶
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
    <Moldura mensagem={mensagem} destaque={critico === "text-ambar" ? "border-ambar/60" : critico ? "border-sangue/60" : "border-border"}>
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
    <Moldura mensagem={mensagem} destaque={r.grau === "sucesso_critico" ? "border-ambar/60" : r.grau === "falha_critica" ? "border-sangue/60" : "border-border"}>
      <div className="flex items-center gap-3">
        <div className={`flex shrink-0 gap-1 ${novo ? "dado-rolando" : ""}`} aria-label={`d100: ${valor}`}>
          <span className="grid h-12 w-10 place-items-center rounded-lg border border-pergaminho/50 bg-surface">
            <span className="titulo text-lg text-pergaminho">{dezena}0</span>
            <span className="-mt-2 text-[9px] uppercase text-muted">dez.</span>
          </span>
          <span className="grid h-12 w-9 place-items-center rounded-lg border border-border bg-surface">
            <span className="titulo text-lg">{unidade}</span>
            <span className="-mt-2 text-[9px] uppercase text-muted">un.</span>
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
          <div className="mt-1 flex justify-between text-[10px] text-muted">
            <span className={nivel === "Extremo" ? "text-ambar" : ""}>Extremo ≤{extremo}</span>
            <span className={nivel === "Difícil" ? "text-musgo" : ""}>Difícil ≤{dificil}</span>
            <span className={nivel === "Normal" ? "text-musgo" : ""}>Normal ≤{alvo}</span>
            <span className={nivel === null ? "text-sangue" : ""}>falha</span>
          </div>
          {r.detalhes && <p className="mt-1 truncate text-xs text-muted">{r.detalhes}</p>}
        </div>
      )}
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
    </Moldura>
  );
}

const FAIXAS_PBTA = [
  { rotulo: "6−", cor: "bg-sangue/70", texto: "text-sangue", ate: 6 },
  { rotulo: "7–9", cor: "bg-sky-400/60", texto: "text-sky-300", ate: 9 },
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
    </Moldura>
  );
}

/** Dado de d10 em pipa: normal (6+ sucesso, 10 em âmbar) ou de Fome (vermelho; 10 com presas, 1 com caveira). */
function D10({ valor, fome, despertar, i, novo }: { valor: number; fome: boolean; despertar?: boolean; i: number; novo: boolean }) {
  const dez = valor === 10;
  const sucesso = valor >= 6;
  const bestial = fome && !despertar && valor === 1;
  const cor = fome
    ? dez
      ? "text-ambar"
      : bestial
        ? "text-sangue"
        : sucesso
          ? "text-[#e0675a]"
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
      className={`relative inline-grid size-9 shrink-0 place-items-center ${cor} ${novo ? "cd-face" : ""}`}
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
        <span className="absolute -right-1 -top-1.5 text-[10px] text-sangue" aria-hidden>
          ᐯᐯ
        </span>
      )}
      {bestial && (
        <span className="absolute -right-1 -top-1.5 text-[11px]" aria-hidden>
          ☠
        </span>
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
  const bestial = rotulo === "Falha Bestial" || r.grau === "falha_critica";
  const destaque = sujo || bestial ? "border-sangue/70" : r.grau === "sucesso_critico" ? "border-ambar/60" : despertar && !r.sucesso ? "border-sangue/40" : "border-border";
  const tom = sujo || bestial ? "bg-sangue/10" : "bg-surface-2/80";
  const dezes = [...normais, ...fome].filter((v) => v === 10).length;
  const pares = Math.floor(dezes / 2);
  return (
    <Moldura mensagem={mensagem} destaque={destaque} tom={tom}>
      <Cabecalho r={r} mensagem={mensagem} />
      <div className="mt-1.5 flex items-center gap-3">
        <div className={`grid size-14 shrink-0 place-items-center rounded-full border-2 ${sujo || bestial ? "border-sangue/70" : "border-current"} ${cor} ${novo ? "dado-rolando" : ""} ${novo && (sujo || bestial || r.grau === "sucesso_critico") ? "cd-brilho" : ""}`}>
          <span className="flex flex-col items-center leading-none">
            <span className="titulo text-2xl">{total}</span>
            <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted">{despertar ? "ok" : total === 1 ? "sucesso" : "sucessos"}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="text-pergaminho">{r.teste}</span>{" "}
            <span className="text-muted">
              {r.expressao}
              {num(r.margem) !== null && alvo !== null && !despertar && <span className="text-muted/80"> ({r.margem >= 0 ? `+${r.margem}` : r.margem})</span>}
            </span>
          </p>
          {!despertar && (
            <p className="mt-0.5 text-[11px] text-muted">
              {num(r.parada) ?? dados.length} dados{fome.length ? <span className="text-sangue"> · {fome.length} de Fome</span> : null}
              {pares > 0 && <span className="text-ambar"> · {pares} par{pares > 1 ? "es" : ""} de 10</span>}
            </p>
          )}
        </div>
        <Grau r={r} cor={cor} novo={novo} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {normais.map((v, i) => (
          <D10 key={`n${i}`} valor={v} fome={false} i={i} novo={novo} />
        ))}
        {fome.length > 0 && normais.length > 0 && <span className="mx-0.5 h-6 w-px bg-sangue/40" aria-hidden />}
        {fome.map((v, i) => (
          <D10 key={`f${i}`} valor={v} fome despertar={despertar} i={normais.length + i} novo={novo} />
        ))}
      </div>
      {r.detalhes && <p className={`mt-1.5 text-xs ${sujo || bestial ? "text-sangue/90" : "text-muted"}`}>{r.detalhes}</p>}
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
              {r.expressao && <span className="text-[11px] text-muted">{r.expressao}</span>}
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
            <p className="mt-1 text-[11px] text-muted">
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
          {!r.secreta && r.expressao && !r.manual && <span className="mt-1 text-[10px] text-muted">{r.expressao}</span>}
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
  const pctAntes = pvMax ? Math.max(0, Math.min(100, ((pvAntes ?? 0) / pvMax) * 100)) : 0;
  const pctAgora = pvMax ? Math.max(0, Math.min(100, ((pv ?? 0) / pvMax) * 100)) : 0;
  return (
    <Moldura mensagem={mensagem} destaque="border-dashed border-border" tom="bg-surface/60">
      <p className="flex items-baseline gap-2 text-sm">
        <span className="text-xs">✎</span>
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
            <span key={`r${x}`} className="rounded bg-sky-400/10 px-1.5 py-0.5 text-sky-300">
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
    </Moldura>
  );
}

function Xp({ r, mensagem, novo }: { r: Dados; mensagem: Mensagem; novo: boolean }) {
  const subiu = num(r.subiuPara);
  return (
    <Moldura mensagem={mensagem} destaque={subiu ? "border-ambar/70" : "border-ambar/25"} tom={subiu ? "bg-ambar/10" : "bg-surface-2/60"}>
      <div className={`flex items-center gap-3 ${subiu ? "text-ambar" : ""}`}>
        <span className={`grid size-10 shrink-0 place-items-center rounded-full border border-ambar/50 text-lg text-ambar ${novo ? "dado-rolando" : ""} ${novo && subiu ? "cd-brilho" : ""}`} aria-hidden>
          ✦
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
    <Moldura mensagem={mensagem} destaque="border-sky-300/25" tom="bg-surface/60">
      <p className="flex items-baseline gap-2 text-sm">
        <span className="text-sky-300" aria-hidden>
          ☾
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
        <span className="uppercase tracking-wider text-sangue">⚔ Iniciativa</span>
        {num(r.rodada) !== null && <span>rodada {r.rodada}</span>}
      </p>
      <ol className="mt-1.5 space-y-0.5">
        {ordem.map((c, i) => (
          <li
            key={`${c.nome}-${i}`}
            className={`flex items-baseline gap-2 rounded-md border-l-2 px-2 py-0.5 text-sm ${c.aliado ? "border-musgo bg-musgo/5" : "border-sangue bg-sangue/5"} ${novo ? "cd-face" : ""}`}
            style={novo ? ({ "--i": i } as CSSProperties) : undefined}
          >
            <span className="w-7 shrink-0 text-right font-semibold tabular-nums text-foreground">{c.iniciativa ?? "—"}</span>
            <span className={`min-w-0 flex-1 truncate ${c.aliado ? "text-musgo" : "text-sangue"}`}>{c.nome}</span>
            {c.detalhe && <span className="hidden shrink-0 text-[11px] text-muted sm:inline">{c.detalhe}</span>}
          </li>
        ))}
      </ol>
      {r.resumo && <p className="mt-1.5 text-xs text-muted">{r.resumo}</p>}
    </Moldura>
  );
}

function Nota({ icone, rotulo, texto }: { icone: string; rotulo: string; texto: string }) {
  return (
    <div className="surgir mx-auto flex w-full max-w-lg items-baseline gap-2 rounded-lg border border-dashed border-border/80 px-3 py-1.5 text-xs text-muted">
      <span className="text-ambar" aria-hidden>
        {icone}
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
      return <Nota icone="◈" rotulo="Cena" texto={String(r.texto ?? mensagem.texto)} />;
    case "diario":
      return <Nota icone="❡" rotulo="Diário" texto={String(r.texto ?? mensagem.texto)} />;
    case "iniciativa":
      return <Iniciativa r={r} mensagem={mensagem} novo={novo} />;
    case "combate":
      return <Nota icone="⚔" rotulo="Combate" texto={String(r.resumo ?? mensagem.texto)} />;
    default:
      return <Nota icone="✦" rotulo="Mesa" texto={mensagem.texto} />;
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
