"use client";

import { useId } from "react";
import { clarear, escurecer, misturar } from "./cores";
import { criarCtx, type Ctx } from "./contexto";
import type { DadosRetrato } from "./dados";
import { AcessorioFrente, AcessorioTras, Corpo, Pescoco } from "./corpo";
import { CabeloFrente, CabeloTras, chifresPorCima, CoberturaFrente, CoberturaTras } from "./cabelo";
import { Barba, Boca, Brinco, Cabeca, caminhoOlho, ChifresDesenho, MarcasFrente, MarcasPele, Nariz, Olhos, Orelhas, Sobrancelhas } from "./rosto";

// O retrato pintado: busto em 200×200 com luz de vela vindo da esquerda, fundo manchado, grão de tela e moldura dourada.

function Definicoes({ c }: { c: Ctx }) {
  const { d, pele, cabelo, roupa, id } = c;
  const fundo = d.fundo;
  const olho = caminhoOlho(d.olhos.formato);
  const capuz = escurecer(d.corRoupa, 0.12);
  return (
    <defs>
      <clipPath id={id("quadro")}>
        <rect x={6} y={6} width={188} height={188} rx={12} />
      </clipPath>
      <clipPath id={id("rosto")}>
        <path d={c.g.caminho} />
      </clipPath>
      <clipPath id={id("olho")}>
        <path d={olho.contorno} />
      </clipPath>

      <filter id={id("suave")} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation={3.5} />
      </filter>
      <filter id={id("leve")} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation={1.1} />
      </filter>
      <filter id={id("brilho")} x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation={3} />
      </filter>
      <filter id={id("tinta")} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={3} result="ruido" />
        <feDisplacementMap in="SourceGraphic" in2="ruido" scale={2.2} />
      </filter>
      <filter id={id("grao")} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.06  0 0 0 0 0.03  0 0 0 0.5 -0.12" />
      </filter>

      <radialGradient id={id("fundo")} cx="0.42" cy="0.36" r="0.8">
        <stop offset="0" stopColor={clarear(fundo, 0.28)} />
        <stop offset="0.5" stopColor={fundo} />
        <stop offset="1" stopColor={escurecer(fundo, 0.65)} />
      </radialGradient>
      <radialGradient id={id("halo")}>
        <stop offset="0" stopColor={clarear(fundo, 0.5)} stopOpacity={0.55} />
        <stop offset="1" stopColor={clarear(fundo, 0.5)} stopOpacity={0} />
      </radialGradient>
      <radialGradient id={id("vinheta")} cx="0.45" cy="0.42" r="0.75">
        <stop offset="0.55" stopColor="#000" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={0.6} />
      </radialGradient>
      <radialGradient id={id("luz")} cx="0.2" cy="0.18" r="0.6">
        <stop offset="0" stopColor="#ffd9a0" stopOpacity={0.2} />
        <stop offset="1" stopColor="#ffd9a0" stopOpacity={0} />
      </radialGradient>

      <radialGradient id={id("pele")} cx="0.4" cy="0.36" r="0.72">
        <stop offset="0" stopColor={pele.luz} />
        <stop offset="0.55" stopColor={pele.base} />
        <stop offset="1" stopColor={pele.sombra} />
      </radialGradient>
      <linearGradient id={id("pescoco")} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={pele.base} />
        <stop offset="0.5" stopColor={misturar(pele.base, pele.sombra, 0.4)} />
        <stop offset="1" stopColor={pele.funda} />
      </linearGradient>
      <linearGradient id={id("pescocoSombra")} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0.2" stopColor={pele.funda} stopOpacity={0.75} />
        <stop offset="0.6" stopColor={pele.funda} stopOpacity={0} />
      </linearGradient>
      <linearGradient id={id("aro")} x1="0" x2="1" y1="0" y2="0.3">
        <stop offset="0" stopColor="#ffe3b0" stopOpacity={0.55} />
        <stop offset="0.4" stopColor="#ffe3b0" stopOpacity={0} />
      </linearGradient>
      <radialGradient id={id("iris")} cx="0.4" cy="0.4">
        <stop offset="0" stopColor={clarear(d.olhos.cor, 0.45)} />
        <stop offset="0.7" stopColor={d.olhos.cor} />
        <stop offset="1" stopColor={escurecer(d.olhos.cor, 0.5)} />
      </radialGradient>
      <radialGradient id={id("olhoBrilho")}>
        <stop offset="0" stopColor={clarear(d.olhos.cor, 0.6)} />
        <stop offset="1" stopColor={d.olhos.cor} />
      </radialGradient>

      <linearGradient id={id("cabelo")} x1="0.2" x2="0.6" y1="0" y2="1">
        <stop offset="0" stopColor={cabelo.luz} />
        <stop offset="0.45" stopColor={cabelo.base} />
        <stop offset="1" stopColor={cabelo.sombra} />
      </linearGradient>
      <linearGradient id={id("cabeloEscuro")} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={cabelo.base} />
        <stop offset="1" stopColor={cabelo.funda} />
      </linearGradient>
      <linearGradient id={id("roupa")} x1="0" x2="1" y1="0" y2="0.6">
        <stop offset="0" stopColor={roupa.luz} />
        <stop offset="0.45" stopColor={roupa.base} />
        <stop offset="1" stopColor={roupa.funda} />
      </linearGradient>
      <linearGradient id={id("capuz")} x1="0" x2="1" y1="0" y2="0.5">
        <stop offset="0" stopColor={clarear(capuz, 0.2)} />
        <stop offset="0.5" stopColor={capuz} />
        <stop offset="1" stopColor={escurecer(capuz, 0.6)} />
      </linearGradient>
      <radialGradient id={id("capuzInterior")} cx="0.5" cy="0.45" r="0.6">
        <stop offset="0.5" stopColor="#07040a" />
        <stop offset="1" stopColor={escurecer(capuz, 0.5)} />
      </radialGradient>
      <linearGradient id={id("metal")} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#eef1f4" />
        <stop offset="0.3" stopColor="#9aa1a9" />
        <stop offset="0.6" stopColor="#5d636b" />
        <stop offset="0.8" stopColor="#a8afb7" />
        <stop offset="1" stopColor="#3a3f46" />
      </linearGradient>
      <linearGradient id={id("ouro")} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor={clarear(d.corDetalhe, 0.55)} />
        <stop offset="0.5" stopColor={d.corDetalhe} />
        <stop offset="1" stopColor={escurecer(d.corDetalhe, 0.5)} />
      </linearGradient>
      <linearGradient id={id("osso")} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#f4ecd8" />
        <stop offset="0.6" stopColor="#cfc2a2" />
        <stop offset="1" stopColor="#8a7a5a" />
      </linearGradient>
      <linearGradient id={id("chifre")} x1="0" x2="1" y1="1" y2="0">
        <stop offset="0" stopColor="#1e1614" />
        <stop offset="0.6" stopColor="#4a3c36" />
        <stop offset="1" stopColor="#9a8a7a" />
      </linearGradient>
      <linearGradient id={id("madeira")} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#c27a3a" />
        <stop offset="0.5" stopColor="#8a5226" />
        <stop offset="1" stopColor="#4a2a12" />
      </linearGradient>
      <pattern id={id("malha")} width={4} height={3.4} patternUnits="userSpaceOnUse">
        <path d="M0 1.7 a2 1.7 0 0 0 4 0" fill="none" stroke="#1a1d22" strokeWidth={0.7} opacity={0.7} />
        <path d="M-2 0 a2 1.7 0 0 0 4 0 M2 0 a2 1.7 0 0 0 4 0" fill="none" stroke="#1a1d22" strokeWidth={0.7} opacity={0.7} />
      </pattern>
    </defs>
  );
}

function Fundo({ c }: { c: Ctx }) {
  const f = c.d.fundo;
  return (
    <g>
      <rect width={200} height={200} fill={c.url("fundo")} />
      <g opacity={0.22} filter={c.url("suave")}>
        <ellipse cx={40} cy={46} rx={64} ry={22} transform="rotate(-25 40 46)" fill={clarear(f, 0.35)} />
        <ellipse cx={168} cy={142} rx={52} ry={18} transform="rotate(30 168 142)" fill={escurecer(f, 0.5)} />
        <ellipse cx={154} cy={30} rx={40} ry={12} transform="rotate(-12 154 30)" fill={clarear(f, 0.25)} />
        <ellipse cx={30} cy={170} rx={36} ry={14} transform="rotate(18 30 170)" fill={escurecer(f, 0.4)} />
      </g>
      <ellipse cx={96} cy={84} rx={74} ry={70} fill={c.url("halo")} />
      {c.d.aura && (
        <g fill={c.d.aura}>
          {[
            [36, 40, 1.2],
            [164, 64, 1],
            [24, 120, 0.9],
            [176, 30, 1.4],
            [150, 116, 0.8],
            [58, 24, 0.8],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} opacity={0.75} />
          ))}
        </g>
      )}
    </g>
  );
}

function Moldura({ c }: { c: Ctx }) {
  return (
    <g fill="none">
      <rect x={3} y={3} width={194} height={194} rx={14} stroke="#120a06" strokeWidth={6} />
      <rect x={3.5} y={3.5} width={193} height={193} rx={14} stroke={c.url("moldura")} strokeWidth={4} />
      <rect x={8} y={8} width={184} height={184} rx={10} stroke="#000" strokeWidth={1.2} opacity={0.6} />
      <rect x={1.5} y={1.5} width={197} height={197} rx={15} stroke="#f5d48a" strokeWidth={0.6} opacity={0.35} />
      {[
        [12, 12],
        [188, 12],
        [12, 188],
        [188, 188],
      ].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y - 4} L${x + 4} ${y} L${x} ${y + 4} L${x - 4} ${y}Z`} fill="#e0a24a" stroke="#3a2410" strokeWidth={0.6} />
      ))}
    </g>
  );
}

export function RetratoSVG({ dados, tamanho = 96, className, titulo }: { dados: DadosRetrato; tamanho?: number; className?: string; titulo?: string }) {
  const bruto = useId();
  const c = criarCtx(dados, `rt${bruto.replace(/[^a-zA-Z0-9]/g, "")}`);
  const d = c.d;
  const pontudas = d.orelhas === "pontuda";
  const chifresAcima = chifresPorCima(d.cobertura);
  const brincoVisivel =
    d.brinco && d.cobertura !== "capuz" && d.cobertura !== "elmo" && d.cobertura !== "elmo-chifres" && !["longo", "ondulado"].includes(d.cabelo.estilo);
  return (
    <svg
      viewBox="0 0 200 200"
      width={tamanho}
      height={tamanho}
      className={className}
      role="img"
      aria-label={titulo ?? "Retrato do personagem"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <Definicoes c={c} />
      <defs>
        <linearGradient id={c.id("moldura")} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f5d48a" />
          <stop offset="0.35" stopColor="#b9792a" />
          <stop offset="0.6" stopColor="#e0a24a" />
          <stop offset="1" stopColor="#6a3e12" />
        </linearGradient>
      </defs>
      <g clipPath={c.url("quadro")}>
        <Fundo c={c} />
        <AcessorioTras c={c} />
        <CoberturaTras c={c} />
        <CabeloTras c={c} />
        <Pescoco c={c} />
        <g transform="translate(0 -10)">
          <Corpo c={c} />
        </g>
        {!pontudas && <Orelhas c={c} />}
        <Cabeca c={c} />
        <MarcasPele c={c} />
        <Olhos c={c} />
        <Sobrancelhas c={c} />
        <Nariz c={c} />
        <Boca c={c} />
        <Barba c={c} />
        <MarcasFrente c={c} />
        <CabeloFrente c={c} />
        {pontudas && <Orelhas c={c} />}
        {brincoVisivel && <Brinco c={c} />}
        {!chifresAcima && <ChifresDesenho c={c} />}
        <CoberturaFrente c={c} />
        {chifresAcima && <ChifresDesenho c={c} />}
        <g transform={d.acessorio === "simbolo" || d.acessorio === "adagas" ? "translate(0 -10)" : undefined}>
          <AcessorioFrente c={c} />
        </g>
        <rect width={200} height={200} fill={c.url("luz")} />
        <rect width={200} height={200} filter={c.url("grao")} opacity={0.55} />
        <rect width={200} height={200} fill={c.url("vinheta")} />
      </g>
      <Moldura c={c} />
    </svg>
  );
}
