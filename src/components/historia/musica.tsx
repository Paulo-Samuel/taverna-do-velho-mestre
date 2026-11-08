"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { estiloDoSistema, ROTULO_ESTILO } from "@/lib/cliente/musica/estilos";
import { buscarFaixas } from "@/lib/cliente/musica/locais";
import { assinarEstadoMusica, ESTADO_INICIAL, estadoMusica, reterMotor, soltarMotor, type Motor } from "@/lib/cliente/musica/motor";
import {
  assinarHumorManual,
  assinarPreferenciasMusica,
  ENERGIAS_MUSICA,
  HUMORES_MUSICA,
  humorManual,
  humorManualServidor,
  preferenciasMusica,
  preferenciasMusicaServidor,
  salvarHumorManual,
  salvarPreferenciasMusica,
} from "@/lib/cliente/musica/preferencias";
import { ROTULO_ENERGIA, ROTULO_HUMOR, type Energia } from "@/lib/cliente/musica/teoria";
import type { Cena, HumorMusical } from "@/lib/sistemas/tipos";
import { Icone } from "@/components/icones";

// Trilha sonora conforme o humor da cena: gerada no navegador (Web Audio) no estilo do sistema de regras, ou as
// músicas da própria pessoa na pasta musica/<sistema>/<humor> (rota /api/musica), quando houver.
// Renderiza o próprio botão de som (liga/desliga) e, num popover, o volume e os chips de humor manual (vencem a cena do
// mestre até voltar para "automático"; guardados por campanha no localStorage). A preferência de som fica no localStorage.
// O áudio só começa depois do primeiro clique/toque/tecla na página (regra de autoplay dos navegadores).

/** releitura da pasta de músicas no máximo a cada 15 s (ao abrir o popover ou voltar para a aba) */
const RELER_MS = 15_000;

/** gestos que concedem ativação do usuário: no toque é o pointerup/touchend/click, não o pointerdown */
const GESTOS = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;

/** plaquinha de escolha (humor/energia): alvo de toque de 36px no celular, menor no desktop */
function Chip({ ativo, onClick, children, title }: { ativo: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      title={title}
      className={`inline-flex min-h-9 items-center rounded-full border px-2 text-[11px] leading-none transition sm:min-h-7 ${
        ativo ? "border-ambar bg-ambar/15 text-ambar" : "border-border text-foreground/80 hover:border-ambar/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

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
 * compacto: um botão só de 40x40 (cabeçalho das mesas) que abre o popover, onde estão o liga/desliga e o volume.
 * fimDaNoite: a noite foi encerrada; a trilha cai para o calmo e baixa o volume (a escolha manual de humor continua valendo).
 */
export function Musica({
  musica,
  sistema = "historia",
  compacto = false,
  fimDaNoite = false,
  linha = false,
}: {
  musica: Cena["musica"];
  sistema?: string;
  compacto?: boolean;
  fimDaNoite?: boolean;
  linha?: boolean;
}) {
  const prefs = useSyncExternalStore(assinarPreferenciasMusica, preferenciasMusica, preferenciasMusicaServidor);
  const estado = useSyncExternalStore(assinarEstadoMusica, estadoMusica, () => ESTADO_INICIAL);
  const [aberto, setAberto] = useState(false);
  /** quantas músicas próprias a pasta tem para este sistema (null = ainda não sabe ou a rota falhou) */
  const [totalLocal, setTotalLocal] = useState<number | null>(null);
  const motor = useRef<Motor | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const lidoEm = useRef(0);
  // id da campanha só depois de montar (a URL não existe no servidor): até lá a escolha manual é a padrão.
  // null também fora de uma mesa (/nova): aí não há escolha manual (a trilha é a da criação) e os chips não aparecem
  const [campanhaId, setCampanhaId] = useState<number | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCampanhaId(campanhaDaUrl()), []);
  const manual = useSyncExternalStore(assinarHumorManual, () => humorManual(campanhaId), humorManualServidor);

  // sem música definida: taverna baixinho; a escolha manual do jogador vence a cena
  // noite encerrada: as velas se apagam, a trilha acalma
  const humorCena: HumorMusical = fimDaNoite ? "calmo" : (musica?.humor ?? "taverna");
  const energiaCena: Energia = fimDaNoite ? "baixa" : (musica?.energia ?? "baixa");
  /** volume que vai ao motor: no fim da noite, 40% do escolhido (a preferência salva não muda) */
  const volumeEfetivo = fimDaNoite ? prefs.volume * 0.4 : prefs.volume;
  const humor = manual.humor ?? humorCena;
  const energia = manual.energia ?? energiaCena;
  const ehManual = manual.humor !== null || manual.energia !== null;
  const estilo = estiloDoSistema(sistema);

  // uma instância do motor por página; ao sair, solta: o motor continua tocando por um prazo (Ajustes, Livro e a volta)
  useEffect(() => {
    const m = reterMotor();
    motor.current = m;
    m.definirPreferencias(preferenciasMusica().ligado, preferenciasMusica().volume);
    // o navegador só libera o áudio depois de um gesto. No toque, o pointerdown não concede ativação (só o
    // pointerup/touchend/click), então cada gesto tenta de novo enquanto o contexto não reportar "running".
    const liberar = () => {
      if (m.precisaGesto()) m.desbloquear();
    };
    for (const g of GESTOS) window.addEventListener(g, liberar, true);
    return () => {
      for (const g of GESTOS) window.removeEventListener(g, liberar, true);
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
    motor.current?.definirPreferencias(prefs.ligado, volumeEfetivo);
  }, [prefs.ligado, volumeEfetivo]);

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
    motor.current?.definirPreferencias(ligado, volumeEfetivo);
  }

  function mudarVolume(volume: number) {
    salvarPreferenciasMusica({ volume, ligado: volume > 0 ? true : prefs.ligado });
    motor.current?.desbloquear();
  }

  /** chip de humor: null volta ao automático (e solta a energia também) */
  function escolherHumor(h: HumorMusical | null) {
    if (h === null) salvarHumorManual(campanhaId, { humor: null, energia: null });
    else salvarHumorManual(campanhaId, { humor: h });
    // dentro do gesto: se o áudio ainda não começou, começa agora
    motor.current?.desbloquear();
  }

  function escolherEnergia(e: Energia) {
    // repetir a energia já escolhida à mão volta a seguir a cena
    salvarHumorManual(campanhaId, { energia: manual.energia === e ? null : e });
    motor.current?.desbloquear();
  }

  const rotuloHumor = `${ROTULO_HUMOR[estado.tocando ?? humor]}${ehManual ? " (manual)" : ""}`;
  const rotulo = estado.faixa ? `♪ ${estado.faixa}` : `${ROTULO_ESTILO[estado.estilo ?? estilo]} · ${rotuloHumor}`;
  const dica = !prefs.ligado
    ? "Música desligada (clique para ligar)"
    : estado.aguardandoGesto
      ? `Trilha: ${rotulo} (começa no primeiro clique ou toque na página)`
      : `Trilha: ${rotulo}`;

  return (
    <div ref={caixa} className="relative inline-flex shrink-0 items-center">
      {linha ? (
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          title={dica}
          aria-label={`Som: ${prefs.ligado ? "ligado" : "desligado"}. Abrir a trilha sonora`}
          aria-expanded={aberto}
          aria-haspopup="dialog"
          className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-foreground/90 hover:bg-surface-2/60 hover:text-ambar focus-visible:outline-2 focus-visible:outline-ambar"
          data-item-menu
        >
          <span className="text-muted">
            <IconeSom ligado={prefs.ligado} />
          </span>
          <span className="min-w-0 flex-1">Música</span>
          <span className="text-xs text-muted">{prefs.ligado ? "ligada" : "desligada"}</span>
        </button>
      ) : compacto ? (
        // cabeçalho das mesas: um botão só, como os vizinhos; o liga/desliga e o volume moram no popover
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          title={dica}
          aria-label={`Som: ${prefs.ligado ? "ligado" : "desligado"}. Abrir a trilha sonora`}
          aria-expanded={aberto}
          aria-haspopup="dialog"
          className={`botao-cabecalho ${prefs.ligado ? "text-foreground/85" : ""} ${aberto ? "text-ambar" : ""}`}
          data-botao-som
        >
          <IconeSom ligado={prefs.ligado} />
        </button>
      ) : (
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
      )}

      {aberto && (
        // no celular o popover fica preso às bordas da tela (o botão pode estar no meio do cabeçalho)
        <div
          className="cartao surgir fixed inset-x-4 top-16 z-50 p-3 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72"
          role="dialog"
          aria-label="Trilha sonora"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="titulo text-sm text-ambar">Trilha sonora</span>
            <button type="button" onClick={alternar} className="min-h-9 rounded-md border border-border px-2.5 text-xs text-muted hover:border-ambar/60 hover:text-ambar" data-som-alternar>
              {prefs.ligado ? "Desligar" : "Ligar"}
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <Icone nome="soundOff" />
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
            {prefs.ligado ? (estado.aguardandoGesto ? "Começa no primeiro clique ou toque na página." : `Trilha: ${rotulo}`) : "Desligada."}
          </p>
          {estado.faixa && <p className="mt-1 text-xs text-muted">Música sua · {rotuloHumor}</p>}

          {/* humor à mão: vence a cena do mestre até voltar para "automático"; por campanha, no localStorage.
              Fora de uma mesa (criação de campanha) não há campanha para guardar a escolha: a seção não aparece */}
          {campanhaId !== null && (
          <div className="mt-2 border-t border-border pt-2" role="group" aria-label="Humor da trilha">
            <p className="mb-1.5 text-xs text-muted">
              Humor{" "}
              {manual.humor ? (
                <span className="text-ambar">(manual)</span>
              ) : (
                <>
                  (automático: <span className="text-foreground">{ROTULO_HUMOR[humorCena]}</span>)
                </>
              )}
            </p>
            {/* no celular as plaquinhas quebram em duas linhas; no desktop o popover é mais largo */}
            <div className="flex flex-wrap gap-1">
              <Chip ativo={manual.humor === null} onClick={() => escolherHumor(null)} title="Seguir o humor que o mestre dá à cena">
                automático
              </Chip>
              {HUMORES_MUSICA.map((h) => (
                <Chip key={h} ativo={manual.humor === h} onClick={() => escolherHumor(h)}>
                  {ROTULO_HUMOR[h]}
                </Chip>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1" role="group" aria-label="Energia da trilha">
              <span className="mr-1 text-[11px] text-muted">Energia{manual.energia ? " (manual)" : ""}</span>
              {ENERGIAS_MUSICA.map((e) => (
                <Chip
                  key={e}
                  ativo={energia === e}
                  onClick={() => escolherEnergia(e)}
                  title={manual.energia === e ? "Voltar a seguir a energia da cena" : `Energia ${ROTULO_ENERGIA[e]}`}
                >
                  {ROTULO_ENERGIA[e]}
                </Chip>
              ))}
            </div>
          </div>
          )}
          {totalLocal === 0 && (
            <p className="mt-2 border-t border-border pt-2 text-xs leading-snug text-muted">
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
