"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CenaDado } from "./dado-3d/cena";

// Dado d20 em 3D rolado pelo jogador. O three.js é carregado sob demanda (import() no efeito); sem WebGL,
// ou enquanto carrega, aparece um d20 desenhado em SVG. Com "reduzir movimento" o dado não gira: só mostra a face.

export type PropsDado3D = {
  /** face em que o dado deve parar; null enquanto o servidor ainda não respondeu */
  valor: number | null;
  /** true enquanto gira; quando vira false com `valor` definido, o dado assenta nessa face */
  rolando: boolean;
  /** tamanho do quadro em px (padrão 140) */
  tamanho?: number;
  /** cor de destaque ao parar: crítico (20 natural) ou falha crítica (1 natural) */
  destaque?: "critico" | "falha" | null;
  /** chamado uma vez quando a animação termina */
  aoParar?: () => void;
};

type Modo = "carregando" | "3d" | "plano";

const CONSULTA_MOVIMENTO = "(prefers-reduced-motion: reduce)";

function assinarMovimento(aoMudar: () => void) {
  const mq = window.matchMedia(CONSULTA_MOVIMENTO);
  mq.addEventListener("change", aoMudar);
  return () => mq.removeEventListener("change", aoMudar);
}

function usePrefereMenosMovimento(): boolean {
  return useSyncExternalStore(
    assinarMovimento,
    () => window.matchMedia(CONSULTA_MOVIMENTO).matches,
    () => false,
  );
}

export function Dado3D({ valor, rolando, tamanho = 140, destaque = null, aoParar }: PropsDado3D) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cenaRef = useRef<CenaDado | null>(null);
  const aoPararRef = useRef(aoParar);
  /** chave da rodada em que aoParar já foi chamado (garante uma chamada só) */
  const avisadoRef = useRef<string | null>(null);
  /** o dado já girou alguma vez? se não, um valor que chega parado é só mostrado, sem animação */
  const jaRolouRef = useRef(false);

  const [modo, setModo] = useState<Modo>("carregando");
  const reduzido = usePrefereMenosMovimento();
  const girando = rolando || valor === null;

  // valor em que a animação terminou; zera a cada rodada nova (estado derivado das props, padrão do React)
  const chave = girando ? "girando" : `valor:${valor}`;
  const [chaveAnterior, setChaveAnterior] = useState(chave);
  const [valorParado, setValorParado] = useState<number | null>(null);
  if (chave !== chaveAnterior) {
    setChaveAnterior(chave);
    setValorParado(null);
  }
  const parado = !girando && valorParado !== null && valorParado === valor;

  useEffect(() => {
    aoPararRef.current = aoParar;
  });

  // carrega o three.js e monta a cena uma vez; o canvas é criado pela cena e removido no unmount
  useEffect(() => {
    let cancelado = false;
    let cena: CenaDado | null = null;
    import("./dado-3d/cena")
      .then(({ criarCena }) => {
        if (cancelado || !containerRef.current) return;
        try {
          cena = criarCena(containerRef.current, () => {
            cenaRef.current = null;
            setModo("plano");
          });
        } catch {
          setModo("plano");
          return;
        }
        cenaRef.current = cena;
        setModo("3d");
      })
      .catch(() => {
        if (!cancelado) setModo("plano");
      });
    return () => {
      cancelado = true;
      cena?.destruir();
      cenaRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (modo === "3d") cenaRef.current?.redimensionar(tamanho);
  }, [modo, tamanho]);

  // liga as props à cena: rolar, assentar na face ou só mostrar
  useEffect(() => {
    const cena = cenaRef.current;
    if (girando) {
      avisadoRef.current = null;
      jaRolouRef.current = true;
      if (modo === "3d" && cena) {
        if (reduzido) cena.mostrar(null);
        else cena.rolar();
      }
      return;
    }
    if (valor === null) return;

    const terminar = () => {
      if (avisadoRef.current === chave) return;
      avisadoRef.current = chave;
      setValorParado(valor);
      aoPararRef.current?.();
    };
    const semAnimacao = reduzido || !jaRolouRef.current;

    if (modo === "3d" && cena) {
      if (semAnimacao) {
        cena.mostrar(valor);
        const t = setTimeout(terminar, 0);
        return () => clearTimeout(t);
      }
      cena.assentar(valor, terminar);
      return;
    }
    if (modo === "plano") {
      // sem WebGL: o SVG gira um pouco (se puder) e mostra o número
      const t = setTimeout(terminar, semAnimacao ? 0 : 900);
      return () => clearTimeout(t);
    }
    // carregando: o efeito roda de novo quando a cena ficar pronta
  }, [girando, valor, chave, modo, reduzido]);

  useEffect(() => {
    if (modo === "3d") cenaRef.current?.destacar(parado ? (destaque ?? null) : null);
  }, [modo, parado, destaque]);

  const numeroPlano = modo === "plano" ? (parado ? valor : null) : girando ? null : valor;
  const girarPlano = numeroPlano === null && !reduzido && (girando || modo === "plano");
  const brilho = parado && destaque ? destaque : null;

  const anuncio = girando
    ? "Rolando o d20…"
    : parado
      ? `Resultado do d20: ${valor}${destaque === "critico" ? ", crítico!" : destaque === "falha" ? ", falha crítica!" : ""}`
      : "";

  return (
    <div className="relative inline-block shrink-0" style={{ width: tamanho, height: tamanho }}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-[12%] rounded-full transition-opacity duration-500 ${
          brilho ? "animate-pulse opacity-100 motion-reduce:animate-none" : "opacity-0"
        }`}
        style={{
          background:
            brilho === "falha"
              ? "radial-gradient(circle, rgba(178, 58, 44, 0.65) 0%, rgba(178, 58, 44, 0.22) 45%, transparent 70%)"
              : "radial-gradient(circle, rgba(227, 178, 90, 0.7) 0%, rgba(224, 162, 74, 0.22) 45%, transparent 70%)",
        }}
      />
      <div ref={containerRef} aria-hidden="true" className="absolute inset-0" />
      {modo !== "3d" && (
        <DadoPlano numero={numeroPlano} girar={girarPlano} destaque={brilho} />
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncio}
      </span>
    </div>
  );
}

/** d20 visto de frente em SVG: contorno hexagonal, face central triangular e o número */
function DadoPlano({
  numero,
  girar,
  destaque,
}: {
  numero: number | null;
  girar: boolean;
  destaque: "critico" | "falha" | null;
}) {
  const corNumero = destaque === "critico" ? "var(--ambar)" : destaque === "falha" ? "var(--sangue)" : "var(--pergaminho)";
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full ${girar ? "animate-spin [animation-duration:900ms]" : ""}`}
    >
      <polygon
        points="50,4 90,27 90,73 50,96 10,73 10,27"
        fill="#3a2210"
        stroke="var(--ambar)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <polygon points="50,22 76,66 24,66" fill="#5a3517" stroke="var(--ambar)" strokeWidth="1.6" strokeLinejoin="round" />
      <g stroke="var(--ambar-forte)" strokeWidth="1.2" opacity="0.8">
        <line x1="50" y1="4" x2="50" y2="22" />
        <line x1="90" y1="27" x2="76" y2="66" />
        <line x1="10" y1="27" x2="24" y2="66" />
        <line x1="90" y1="73" x2="76" y2="66" />
        <line x1="10" y1="73" x2="24" y2="66" />
        <line x1="50" y1="96" x2="76" y2="66" />
        <line x1="50" y1="96" x2="24" y2="66" />
        <line x1="10" y1="27" x2="50" y2="22" />
        <line x1="90" y1="27" x2="50" y2="22" />
      </g>
      {numero !== null && (
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={numero >= 10 ? 19 : 22}
          fontWeight="700"
          fontFamily='"Palatino Linotype", "Book Antiqua", Palatino, "Times New Roman", serif'
          fill={corNumero}
          stroke="#1d1007"
          strokeWidth="0.8"
          paintOrder="stroke"
        >
          {numero}
        </text>
      )}
      {(numero === 6 || numero === 9) && (
        <circle cx="50" cy="62.5" r="1.7" fill="var(--pergaminho)" stroke="#1d1007" strokeWidth="0.6" />
      )}
    </svg>
  );
}
