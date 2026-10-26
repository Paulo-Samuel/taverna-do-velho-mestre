"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { estiloDoSistema, ROTULO_ESTILO } from "@/lib/cliente/musica/estilos";
import { buscarFaixas } from "@/lib/cliente/musica/locais";
import { assinarEstadoMusica, ESTADO_INICIAL, estadoMusica, reterMotor, soltarMotor, type Motor } from "@/lib/cliente/musica/motor";
import {
  assinarPreferenciasMusica,
  preferenciasMusica,
  preferenciasMusicaServidor,
  salvarPreferenciasMusica,
} from "@/lib/cliente/musica/preferencias";
import { ROTULO_HUMOR } from "@/lib/cliente/musica/teoria";
import type { Cena } from "@/lib/sistemas/tipos";

// Trilha sonora conforme o humor da cena: gerada no navegador (Web Audio) no estilo do sistema de regras, ou as
// músicas da própria pessoa na pasta musica/<sistema>/<humor> (rota /api/musica), quando houver.
// Renderiza o próprio botão de som (liga/desliga) e o volume num popover; a preferência fica no localStorage.
// O áudio só começa depois do primeiro clique/tecla na página (regra de autoplay dos navegadores).

/** releitura da pasta de músicas no máximo a cada 15 s (ao abrir o popover ou voltar para a aba) */
const RELER_MS = 15_000;

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

/** id da mesa pela URL (/mesa/34...): libera as músicas locais para quem está na mesa pela rede */
function campanhaDaUrl(): number | null {
  if (typeof window === "undefined") return null;
  const m = /^\/mesa\/(\d+)/.exec(window.location.pathname);
  return m ? Number(m[1]) : null;
}

/**
 * sistema: id do sistema de regras (muda o estilo da trilha); sem ele, a fantasia do modo história.
 * compacto: no celular vira um botão só (abre o popover, que tem o liga/desliga), para caber em cabeçalhos cheios.
 */
export function Musica({ musica, sistema = "historia", compacto = false }: { musica: Cena["musica"]; sistema?: string; compacto?: boolean }) {
  const prefs = useSyncExternalStore(assinarPreferenciasMusica, preferenciasMusica, preferenciasMusicaServidor);
  const estado = useSyncExternalStore(assinarEstadoMusica, estadoMusica, () => ESTADO_INICIAL);
  const [aberto, setAberto] = useState(false);
  /** quantas músicas próprias a pasta tem para este sistema (null = ainda não sabe ou a rota falhou) */
  const [totalLocal, setTotalLocal] = useState<number | null>(null);
  const motor = useRef<Motor | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const lidoEm = useRef(0);

  // sem música definida: taverna baixinho
  const humor = musica?.humor ?? "taverna";
  const energia = musica?.energia ?? "baixa";
  const estilo = estiloDoSistema(sistema);

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

  // músicas próprias da pasta musica/: lê ao montar, ao trocar de sistema e (com folga) ao abrir o popover/voltar à aba
  const lerPasta = useCallback(
    (sinal?: AbortSignal) => {
      lidoEm.current = Date.now();
      void buscarFaixas(sistema, campanhaDaUrl(), sinal).then((r) => {
        if (sinal?.aborted) return;
        setTotalLocal(r ? r.total : null);
        motor.current?.definirFaixas(r?.faixas ?? {});
      });
    },
    [sistema],
  );

  useEffect(() => {
    const controle = new AbortController();
    lerPasta(controle.signal);
    const aoVoltar = () => {
      if (document.visibilityState === "visible" && Date.now() - lidoEm.current > RELER_MS) lerPasta();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      controle.abort();
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [lerPasta]);

  useEffect(() => {
    if (aberto && Date.now() - lidoEm.current > RELER_MS) lerPasta();
  }, [aberto, lerPasta]);

  useEffect(() => {
    motor.current?.definirCena(humor, energia, estilo);
  }, [humor, energia, estilo]);

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

  const rotuloHumor = ROTULO_HUMOR[estado.tocando ?? humor];
  const rotulo = estado.faixa ? `♪ ${estado.faixa}` : `${ROTULO_ESTILO[estado.estilo ?? estilo]} · ${rotuloHumor}`;
  const dica = !prefs.ligado
    ? "Música desligada (clique para ligar)"
    : estado.aguardandoGesto
      ? `Trilha: ${rotulo} (começa no primeiro clique na página)`
      : `Trilha: ${rotulo}`;

  return (
    <div ref={caixa} className="relative inline-flex shrink-0 items-center">
      <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
        <button
          type="button"
          onClick={() => {
            // compacto no celular: o toque abre o popover (o liga/desliga fica lá dentro)
            if (compacto && !window.matchMedia("(min-width: 640px)").matches) setAberto((a) => !a);
            else alternar();
          }}
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
          className={`${compacto ? "hidden sm:grid" : "grid"} h-10 min-w-7 place-items-center border-l border-border px-1.5 text-xs text-muted transition hover:text-ambar sm:h-9`}
        >
          <span aria-hidden>▾</span>
        </button>
      </div>

      {aberto && (
        // no celular o popover fica preso às bordas da tela (o botão pode estar no meio do cabeçalho)
        <div
          className="cartao surgir fixed inset-x-4 top-16 z-50 p-3 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64"
          role="dialog"
          aria-label="Trilha sonora"
        >
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
          <p className="mt-2 break-words text-xs text-muted" aria-live="polite">
            {prefs.ligado ? (estado.aguardandoGesto ? "Começa no primeiro clique na página." : `Trilha: ${rotulo}`) : "Desligada."}
          </p>
          {estado.faixa && <p className="mt-1 text-[11px] text-muted">Música sua · {rotuloHumor}</p>}
          {totalLocal === 0 && (
            <p className="mt-2 border-t border-border pt-2 text-[11px] leading-snug text-muted">
              Quer suas próprias músicas? Coloque os arquivos em{" "}
              <code className="break-all text-foreground">
                musica/{sistema}/{humor}
              </code>{" "}
              na pasta da taverna.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
