"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { assinarEstadoMusica, ESTADO_INICIAL, estadoMusica, reterMotor, soltarMotor, type Motor } from "@/lib/cliente/musica/motor";
import {
  assinarPreferenciasMusica,
  preferenciasMusica,
  preferenciasMusicaServidor,
  salvarPreferenciasMusica,
} from "@/lib/cliente/musica/preferencias";
import { ROTULO_HUMOR } from "@/lib/cliente/musica/teoria";
import type { Cena } from "@/lib/sistemas/tipos";

// Trilha sonora gerada no navegador conforme o humor da cena (Web Audio, nada de arquivo de áudio).
// Renderiza o próprio botão de som (liga/desliga) e o volume num popover; a preferência fica no localStorage.
// O áudio só começa depois do primeiro clique/tecla na página (regra de autoplay dos navegadores).

function IconeSom({ ligado }: { ligado: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fillOpacity={0.25} />
      {ligado ? (
        <>
          <path d="M15.5 9a4 4 0 0 1 0 6" />
          <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      )}
    </svg>
  );
}

export function Musica({ musica }: { musica: Cena["musica"] }) {
  const prefs = useSyncExternalStore(assinarPreferenciasMusica, preferenciasMusica, preferenciasMusicaServidor);
  const estado = useSyncExternalStore(assinarEstadoMusica, estadoMusica, () => ESTADO_INICIAL);
  const [aberto, setAberto] = useState(false);
  const motor = useRef<Motor | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // sem música definida: taverna baixinho
  const humor = musica?.humor ?? "taverna";
  const energia = musica?.energia ?? "baixa";

  // uma instância do motor por página; solta (e fecha o áudio) quando o último componente sai
  useEffect(() => {
    const m = reterMotor();
    motor.current = m;
    m.definirPreferencias(preferenciasMusica().ligado, preferenciasMusica().volume);
    // o navegador só libera o áudio depois de um gesto: o primeiro clique/tecla em qualquer lugar
    const liberar = () => {
      m.desbloquear();
      window.removeEventListener("pointerdown", liberar, true);
      window.removeEventListener("keydown", liberar, true);
    };
    window.addEventListener("pointerdown", liberar, true);
    window.addEventListener("keydown", liberar, true);
    return () => {
      window.removeEventListener("pointerdown", liberar, true);
      window.removeEventListener("keydown", liberar, true);
      motor.current = null;
      soltarMotor();
    };
  }, []);

  useEffect(() => {
    motor.current?.definirCena(humor, energia);
  }, [humor, energia]);

  useEffect(() => {
    motor.current?.definirPreferencias(prefs.ligado, prefs.volume);
  }, [prefs.ligado, prefs.volume]);

  // popover: fecha com Esc ou clique fora
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function alternar() {
    const ligado = !prefs.ligado;
    salvarPreferenciasMusica({ ligado });
    // ainda dentro do gesto: Safari só deixa criar/retomar o áudio aqui
    motor.current?.desbloquear();
    motor.current?.definirPreferencias(ligado, prefs.volume);
  }

  function mudarVolume(volume: number) {
    salvarPreferenciasMusica({ volume, ligado: volume > 0 ? true : prefs.ligado });
    motor.current?.desbloquear();
  }

  const rotulo = ROTULO_HUMOR[estado.tocando ?? humor];
  const dica = !prefs.ligado
    ? "Música desligada (clique para ligar)"
    : estado.aguardandoGesto
      ? `Trilha: ${rotulo} (começa no primeiro clique na página)`
      : `Trilha: ${rotulo}`;

  return (
    <div ref={caixa} className="relative inline-flex items-center">
      <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
        <button
          type="button"
          onClick={alternar}
          title={dica}
          aria-label={prefs.ligado ? "Desligar música" : "Ligar música"}
          aria-pressed={prefs.ligado}
          className={`grid h-10 min-w-10 place-items-center px-2 transition hover:text-ambar sm:h-9 sm:min-w-9 ${prefs.ligado ? "text-foreground" : "text-muted"}`}
        >
          <IconeSom ligado={prefs.ligado} />
        </button>
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          title="Volume da música"
          aria-label="Volume da música"
          aria-expanded={aberto}
          className="grid h-10 min-w-7 place-items-center border-l border-border px-1.5 text-xs text-muted transition hover:text-ambar sm:h-9"
        >
          <span aria-hidden>▾</span>
        </button>
      </div>

      {aberto && (
        <div className="cartao surgir absolute right-0 top-full z-50 mt-2 w-60 p-3" role="dialog" aria-label="Trilha sonora">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="titulo text-sm text-ambar">Trilha sonora</span>
            <button type="button" onClick={alternar} className="text-xs text-muted hover:text-ambar">
              {prefs.ligado ? "Desligar" : "Ligar"}
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <span aria-hidden>🔈</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(prefs.volume * 100)}
              onChange={(e) => mudarVolume(Number(e.target.value) / 100)}
              className="min-w-0 flex-1 accent-ambar"
              aria-label="Volume"
            />
            <span className="w-8 text-right tabular-nums">{Math.round(prefs.volume * 100)}</span>
          </label>
          <p className="mt-2 text-xs text-muted">
            {prefs.ligado ? (estado.aguardandoGesto ? "Começa no primeiro clique na página." : `Tocando: ${rotulo}`) : "Desligada."}
          </p>
        </div>
      )}
    </div>
  );
}
