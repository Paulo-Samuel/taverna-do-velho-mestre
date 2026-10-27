"use client";

import type { CSSProperties, ReactNode } from "react";

// Parada de dados do cartão de teste para sistemas sem d20: d10 do Vampiro V5 (dados de Fome em vermelho-sangue), d100
// (dezena e unidade), Fate (4dF) e d6 do PbtA; outras expressões caem num dado genérico pelo número de lados.
// Antes do clique os dados esperam vazios; rolando eles tremem; com o resultado do SERVIDOR assentam um a um mostrando as faces.
// Sem dependências: SVG + CSS (as animações somem com prefers-reduced-motion).

export type SaborParada = "vtm5" | "d100" | "fate" | "pbta" | "outro";

/** Como a parada é rolada, lido da expressão do pedido ("8d10 (1 de Fome)", "1d100", "4dF+2", "2d6+1", "3d6"). */
export type Parada = { sabor: SaborParada; qtd: number; lados: number; fome: number; mod: number };

/** O que a parada usa do resultado do servidor (ResultadoTeste + extras do vtm5). */
export type ResultadoParada = {
  dados?: number[];
  dadosFome?: number[];
  natural?: number | null;
  total?: number;
  alvo?: number | null;
  bonus?: number;
  grau?: string;
  rotuloGrau?: string;
  detalhes?: string;
  vtm?: string;
  /** Vampiro: Despertares rolados junto (poder da disciplina, Surto) e pílulas do que mudou (Fome, Ressonância, frenesi) */
  despertares?: unknown;
  efeitos?: unknown;
};

export type FaseParada = "espera" | "rolando" | "assentado";

/** Atraso entre um dado e o próximo ao assentar. */
export const PASSO_MS = 70;

const CSS = `
@keyframes pd-tremer {
  0%, 100% { transform: translate(0, 0) rotate(0) }
  20% { transform: translate(-2px, -4px) rotate(-16deg) }
  40% { transform: translate(2px, 1px) rotate(11deg) }
  60% { transform: translate(-1px, 3px) rotate(-9deg) }
  80% { transform: translate(3px, -2px) rotate(14deg) }
}
.pd-rolando { animation: pd-tremer .42s ease-in-out infinite; animation-delay: calc(var(--i, 0) * -61ms) }
@keyframes pd-assentar {
  0% { transform: translateY(-12px) rotate(-170deg) scale(1.15); opacity: .35 }
  65% { transform: translateY(2px) rotate(10deg) scale(.95); opacity: 1 }
  100% { transform: none }
}
.pd-assentar { animation: pd-assentar .55s cubic-bezier(.2, .8, .3, 1) both; animation-delay: calc(var(--i, 0) * ${PASSO_MS}ms) }
@keyframes pd-valor { from { opacity: 0; transform: scale(.4) } to { opacity: 1; transform: none } }
.pd-assentar .pd-face { animation: pd-valor .25s ease-out both; animation-delay: calc(var(--i, 0) * ${PASSO_MS}ms + .32s) }
@keyframes pd-pulso { 0%, 100% { filter: drop-shadow(0 0 0 transparent) } 50% { filter: drop-shadow(0 0 9px currentColor) } }
.pd-pulso { animation: pd-pulso 1.3s ease-in-out 3; animation-delay: calc(var(--i, 0) * ${PASSO_MS}ms + .6s) }
.pd-brilho { filter: drop-shadow(0 0 6px color-mix(in srgb, currentColor 55%, transparent)) }
@keyframes pd-depois { from { opacity: 0; transform: translateY(4px) scale(.96) } to { opacity: 1; transform: none } }
.pd-depois { animation: pd-depois .35s cubic-bezier(.2, .8, .3, 1) both; animation-delay: var(--atraso, 0ms) }
@media (prefers-reduced-motion: reduce) { .pd-rolando, .pd-assentar, .pd-assentar .pd-face, .pd-pulso, .pd-depois { animation: none } }
`;

export function EstiloParada() {
  return (
    <style href="taverna-parada-dados" precedence="default">
      {CSS}
    </style>
  );
}

/** Lê a parada da expressão (e do sistema do pedido, quando veio). */
export function lerParada(expressao: string | undefined, sistema?: string): Parada {
  const e = String(expressao ?? "").toLowerCase();
  const mod = (re: RegExp) => {
    const m = e.match(re);
    return m ? Number(m[1].replace(/\s+/g, "")) : 0;
  };
  if (sistema === "vtm5" || /de fome/.test(e) || (/^\s*\d+d10\b/.test(e) && !/[+-]\s*\d/.test(e))) {
    const qtd = Number(e.match(/(\d+)\s*d10/)?.[1] ?? 1);
    const fome = Math.min(qtd, Number(e.match(/(\d+)\s*de fome/)?.[1] ?? 0));
    return { sabor: "vtm5", qtd, lados: 10, fome, mod: 0 };
  }
  if (sistema === "d100" || /d100|d%/.test(e)) return { sabor: "d100", qtd: 2, lados: 10, fome: 0, mod: 0 };
  if (sistema === "fate" || /df/.test(e)) {
    return { sabor: "fate", qtd: Number(e.match(/(\d+)\s*df/)?.[1] ?? 4), lados: 3, fome: 0, mod: mod(/df\s*([+-]\s*\d+)/) };
  }
  const m = e.match(/(\d*)\s*d(\d+)/);
  const qtd = Math.max(1, Math.min(20, Number(m?.[1] || 1)));
  const lados = Number(m?.[2] ?? 6);
  const sabor = sistema === "pbta" || (qtd === 2 && lados === 6) ? "pbta" : "outro";
  return { sabor, qtd, lados, fome: 0, mod: mod(/d\d+\s*([+-]\s*\d+)/) };
}

/** Faces do resultado separadas em normais e de Fome (o vtm5 põe a Fome no FIM de `dados`). */
export function facesVtm(p: Parada, r: ResultadoParada | null): { normais: (number | null)[]; fome: (number | null)[] } {
  if (!r?.dados?.length) {
    return { normais: Array(Math.max(0, p.qtd - p.fome)).fill(null), fome: Array(p.fome).fill(null) };
  }
  const qtdFome = Array.isArray(r.dadosFome) ? r.dadosFome.length : Math.min(p.fome, r.dados.length);
  return { normais: r.dados.slice(0, r.dados.length - qtdFome), fome: r.dados.slice(r.dados.length - qtdFome) };
}

/** Quantos dados aparecem (para o atraso do texto do resultado esperar o último assentar). */
export function qtdDados(p: Parada, r: ResultadoParada | null): number {
  if (p.sabor === "vtm5") {
    const f = facesVtm(p, r);
    return f.normais.length + f.fome.length;
  }
  if (p.sabor === "d100") return 2;
  return r?.dados?.length ? (p.sabor === "pbta" ? Math.min(2, r.dados.length) : r.dados.length) : p.qtd;
}

/** Colunas para a parada quebrar em linhas iguais: até 6 por linha (8 vira 4+4, 12 vira 6+6, 7 vira 4+3). */
function colunas(n: number) {
  return n <= 6 ? n : Math.ceil(n / Math.ceil(n / 6));
}

type Visual = { fase: FaseParada; novo: boolean; compacto: boolean };

/** Casca de cada dado: tamanho, tremida, assentamento e o índice para escalonar. */
function Casca({ i, v, children, rotulo, classe = "" }: { i: number; v: Visual; children: ReactNode; rotulo: string; classe?: string }) {
  const anim = v.fase === "rolando" ? "pd-rolando" : v.fase === "assentado" && v.novo ? "pd-assentar" : "";
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${v.compacto ? "size-7" : "size-11 sm:size-12"} ${anim} ${classe}`}
      style={{ ["--i" as string]: i } as CSSProperties}
      title={rotulo}
      role="img"
      aria-label={rotulo}
    >
      {children}
    </span>
  );
}

// ---------- d10 (Vampiro e d100) ----------

/** Silhueta de d10 (trapezoedro visto de frente): contorno, face da frente em pipa e as arestas laterais. */
function SvgD10({ preenchimento, opacidade, traco, grossura, brilho, pulso, children }: {
  preenchimento: string;
  opacidade: number;
  traco: string;
  grossura: number;
  brilho?: boolean;
  pulso?: boolean;
  children?: ReactNode;
}) {
  return (
    <svg viewBox="0 0 100 100" className={`absolute inset-0 overflow-visible ${brilho ? "pd-brilho" : ""} ${pulso ? "pd-pulso" : ""}`} aria-hidden>
      <polygon points="50,2 96,36 96,62 50,98 4,62 4,36" fill={preenchimento} fillOpacity={opacidade} stroke={traco} strokeWidth={grossura} strokeLinejoin="round" />
      <polygon points="50,2 82,46 50,72 18,46" fill="none" stroke={traco} strokeOpacity=".3" strokeWidth={grossura * 0.5} strokeLinejoin="round" />
      <path d="M18,46 L4,62 M82,46 L96,62 M50,72 L50,98 M18,46 L4,36 M82,46 L96,36" fill="none" stroke={traco} strokeOpacity=".22" strokeWidth={grossura * 0.45} />
      {children}
    </svg>
  );
}

/** Gota de sangue: o símbolo do dado de Fome enquanto espera. */
function Gota() {
  return <path d="M50,30 C50,30 38,46 38,53 a12,12 0 0 0 24,0 C62,46 50,30 50,30 Z" fill="var(--sangue)" fillOpacity=".75" />;
}

function D10Vtm({ valor, fome, bestial, i, v }: { valor: number | null; fome: boolean; bestial: boolean; i: number; v: Visual }) {
  const assentado = valor !== null && v.fase === "assentado";
  const dez = assentado && valor === 10;
  const sucesso = assentado && valor >= 6;
  const um = assentado && fome && valor === 1;
  // cor do contorno/número: Fome é sempre vermelho-sangue; o 10 normal usa o crítico do tema (no Vampiro, dourado)
  const cor = fome ? (dez ? "text-[var(--critico)]" : "text-sangue") : dez ? "text-[var(--critico)]" : sucesso || !assentado ? "text-pergaminho" : "text-muted";
  const traco = fome ? "var(--sangue)" : "currentColor";
  const opacidade = fome ? (!assentado ? 0.28 : dez || sucesso ? 0.55 : um ? 0.3 : 0.18) : !assentado ? 0.05 : dez ? 0.2 : sucesso ? 0.16 : 0.03;
  const corNumero = fome ? (dez ? "var(--critico)" : sucesso ? "#fff1f2" : um ? "#ffd7da" : "color-mix(in srgb, var(--sangue) 80%, white)") : "currentColor";
  const rotulo = !assentado
    ? fome
      ? "dado de Fome"
      : "dado"
    : fome
      ? `dado de Fome: ${valor}${dez ? " (10 da Besta)" : um ? " (1 de Fome)" : ""}`
      : `${valor}${dez ? " (crítico)" : sucesso ? " (sucesso)" : ""}`;
  return (
    <Casca i={i} v={v} rotulo={rotulo} classe={`${cor} ${assentado && !sucesso && !fome ? "opacity-70" : ""}`}>
      <SvgD10 preenchimento={fome ? "var(--sangue)" : "currentColor"} opacidade={opacidade} traco={traco} grossura={dez ? 7 : 5} brilho={dez} pulso={um && bestial && v.novo}>
        {!assentado && fome && v.fase === "espera" && <Gota />}
      </SvgD10>
      {assentado && (
        <span className={`pd-face relative mb-[10%] font-bold leading-none tabular-nums ${v.compacto ? "text-[11px]" : "text-base sm:text-lg"}`} style={{ color: corNumero }}>
          {valor}
        </span>
      )}
      {dez && fome && (
        <span className={`pd-face absolute -right-1 -top-1.5 text-sangue ${v.compacto ? "text-[8px]" : "text-[10px]"}`} aria-hidden>
          ᐯᐯ
        </span>
      )}
      {um && (
        <span className={`pd-face absolute -right-1.5 -top-2 ${v.compacto ? "text-[10px]" : "text-sm"}`} aria-hidden>
          ☠
        </span>
      )}
    </Casca>
  );
}

function ParadaVtm({ p, r, v }: { p: Parada; r: ResultadoParada | null; v: Visual }) {
  const { normais, fome } = facesVtm(p, r);
  const bestial = r?.grau === "falha_critica" || r?.rotuloGrau === "Falha Bestial";
  const despertar = r?.vtm === "despertar";
  const todos = [...normais.map((x) => ({ x, fome: false })), ...fome.map((x) => ({ x, fome: true }))];
  return (
    <Fileira n={todos.length} v={v}>
      {todos.map((d, i) => (
        <D10Vtm key={i} valor={d.x} fome={d.fome} bestial={bestial && !despertar} i={i} v={v} />
      ))}
    </Fileira>
  );
}

/** d100: dois d10, dezena ("40", "00") e unidade. */
function ParadaD100({ r, v }: { r: ResultadoParada | null; v: Visual }) {
  const valor = typeof r?.natural === "number" ? r.natural : typeof r?.total === "number" ? r.total : null;
  const assentado = valor !== null && v.fase === "assentado";
  const dezena = assentado ? Math.floor((valor % 100) / 10) : null;
  const unidade = assentado ? valor % 10 : null;
  const cor = !assentado ? "text-pergaminho" : r?.grau === "sucesso_critico" ? "text-[var(--critico)]" : r?.grau === "falha_critica" ? "text-sangue" : "text-pergaminho";
  const dado = (i: number, texto: string | null, legenda: string) => (
    <span className="inline-flex flex-col items-center gap-0.5">
      <Casca i={i} v={v} rotulo={texto === null ? legenda : `${legenda}: ${texto}`} classe={`${cor} ${v.compacto ? "size-8!" : "size-12! sm:size-14!"}`}>
        <SvgD10 preenchimento="currentColor" opacidade={assentado ? 0.12 : 0.05} traco="currentColor" grossura={5} brilho={r?.grau === "sucesso_critico" && assentado}>
          {!assentado && v.fase === "espera" && (
            <text x="50" y="56" textAnchor="middle" fontSize="26" fill="currentColor" fillOpacity=".45">
              %
            </text>
          )}
        </SvgD10>
        {texto !== null && <span className={`pd-face titulo relative mb-[10%] leading-none tabular-nums ${v.compacto ? "text-[11px]" : "text-base sm:text-lg"}`}>{texto}</span>}
      </Casca>
      {!v.compacto && <span className="text-[9px] uppercase tracking-wider text-muted">{legenda}</span>}
    </span>
  );
  return (
    <span className={`inline-flex items-start ${v.compacto ? "gap-1" : "gap-2"}`}>
      {dado(0, dezena === null ? null : `${dezena}0`, "dezena")}
      {dado(1, unidade === null ? null : String(unidade), "unidade")}
    </span>
  );
}

// ---------- Fate e d6 ----------

function DadoFate({ valor, i, v }: { valor: number | null; i: number; v: Visual }) {
  const assentado = valor !== null && v.fase === "assentado";
  const cor = !assentado ? "text-pergaminho/70" : valor > 0 ? "text-musgo" : valor < 0 ? "text-sangue" : "text-muted";
  return (
    <Casca i={i} v={v} rotulo={!assentado ? "dado Fate" : valor > 0 ? "mais" : valor < 0 ? "menos" : "branco"} classe={cor}>
      <svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
        <rect x="6" y="6" width="88" height="88" rx="20" fill="currentColor" fillOpacity={assentado && valor !== 0 ? 0.16 : 0.05} stroke="currentColor" strokeWidth="5" />
        {assentado && valor !== 0 && (
          <g className="pd-face" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <rect x="26" y="44" width="48" height="12" rx="4" fill="currentColor" />
            {valor > 0 && <rect x="44" y="26" width="12" height="48" rx="4" fill="currentColor" />}
          </g>
        )}
      </svg>
    </Casca>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[29, 29], [71, 71]],
  3: [[29, 29], [50, 50], [71, 71]],
  4: [[29, 29], [71, 29], [29, 71], [71, 71]],
  5: [[29, 29], [71, 29], [50, 50], [29, 71], [71, 71]],
  6: [[29, 27], [71, 27], [29, 50], [71, 50], [29, 73], [71, 73]],
};

function D6({ valor, i, v }: { valor: number | null; i: number; v: Visual }) {
  const assentado = valor !== null && v.fase === "assentado";
  return (
    <Casca i={i} v={v} rotulo={assentado ? `d6: ${valor}` : "d6"} classe={assentado ? (valor === 6 ? "text-[var(--critico)]" : "text-pergaminho") : "text-pergaminho/70"}>
      <svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
        <rect x="6" y="6" width="88" height="88" rx="18" fill="currentColor" fillOpacity={assentado ? 0.12 : 0.05} stroke="currentColor" strokeWidth="5" />
        {assentado && (
          <g className="pd-face" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            {(PIPS[valor] ?? []).map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r="8.5" fill="currentColor" />
            ))}
          </g>
        )}
      </svg>
      {assentado && !PIPS[valor] && <span className="pd-face relative text-sm font-semibold tabular-nums">{valor}</span>}
    </Casca>
  );
}

/** Dado genérico pelo número de lados (d4 triângulo, d8 losango, d12 pentágono, d20 hexágono, resto círculo). */
function DadoGenerico({ valor, lados, i, v }: { valor: number | null; lados: number; i: number; v: Visual }) {
  const assentado = valor !== null && v.fase === "assentado";
  const forma =
    lados === 4 ? (
      <polygon points="50,6 95,90 5,90" />
    ) : lados === 8 ? (
      <polygon points="50,4 94,50 50,96 6,50" />
    ) : lados === 12 ? (
      <polygon points="50,4 95,37 78,93 22,93 5,37" />
    ) : lados === 20 ? (
      <polygon points="50,3 93,27 93,73 50,97 7,73 7,27" />
    ) : lados === 6 ? (
      <rect x="8" y="8" width="84" height="84" rx="16" />
    ) : (
      <circle cx="50" cy="50" r="44" />
    );
  const maximo = assentado && valor === lados;
  return (
    <Casca i={i} v={v} rotulo={assentado ? `d${lados}: ${valor}` : `d${lados}`} classe={maximo ? "text-[var(--critico)]" : assentado ? "text-pergaminho" : "text-pergaminho/70"}>
      <svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
        <g fill="currentColor" fillOpacity={assentado ? 0.12 : 0.05} stroke="currentColor" strokeWidth="5" strokeLinejoin="round">
          {forma}
        </g>
      </svg>
      {assentado && <span className={`pd-face relative font-semibold tabular-nums ${lados === 4 ? "mt-2" : ""} ${v.compacto ? "text-[11px]" : "text-sm"}`}>{valor}</span>}
    </Casca>
  );
}

/** Modificador fixo depois dos dados ("+2"). */
function Mod({ mod, v }: { mod: number; v: Visual }) {
  if (!mod) return null;
  return <span className={`titulo self-center text-muted tabular-nums ${v.compacto ? "text-sm" : "text-lg"}`}>{mod > 0 ? `+${mod}` : `−${Math.abs(mod)}`}</span>;
}

/** Fileira que quebra em linhas iguais no cartão grande e corre solta no compacto. */
function Fileira({ n, v, children }: { n: number; v: Visual; children: ReactNode }) {
  if (v.compacto) return <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-2">{children}</span>;
  // largura máxima = colunas × (dado + espaço): o flex-wrap faz o resto e as linhas saem do mesmo tamanho
  return (
    <span className="mx-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2" style={{ maxWidth: `calc(${colunas(n)} * 3.5rem)` }}>
      {children}
    </span>
  );
}

export function ParadaDados({
  parada,
  resultado,
  fase,
  novo = false,
  compacto = false,
}: {
  parada: Parada;
  resultado: ResultadoParada | null;
  fase: FaseParada;
  /** acabou de rolar neste aparelho: os dados assentam com animação */
  novo?: boolean;
  compacto?: boolean;
}) {
  const v: Visual = { fase: resultado ? fase : fase === "assentado" ? "espera" : fase, novo, compacto };
  const r = v.fase === "assentado" ? resultado : null;
  let conteudo: ReactNode;
  if (parada.sabor === "vtm5") conteudo = <ParadaVtm p={parada} r={r} v={v} />;
  else if (parada.sabor === "d100") conteudo = <ParadaD100 r={r} v={v} />;
  else {
    const n = qtdDados(parada, r);
    const faces: (number | null)[] = r?.dados?.length ? r.dados.slice(0, n) : Array(n).fill(null);
    conteudo = (
      <span className={`inline-flex items-center ${compacto ? "gap-1.5" : "gap-2 sm:gap-3"}`}>
        <Fileira n={n} v={v}>
          {faces.map((x, i) =>
            parada.sabor === "fate" ? (
              <DadoFate key={i} valor={x} i={i} v={v} />
            ) : parada.sabor === "pbta" || parada.lados === 6 ? (
              <D6 key={i} valor={x} i={i} v={v} />
            ) : (
              <DadoGenerico key={i} valor={x} lados={parada.lados} i={i} v={v} />
            ),
          )}
        </Fileira>
        <Mod mod={r && typeof r.bonus === "number" && parada.sabor !== "outro" ? r.bonus : parada.mod} v={v} />
      </span>
    );
  }
  return (
    <>
      <EstiloParada />
      {conteudo}
    </>
  );
}
