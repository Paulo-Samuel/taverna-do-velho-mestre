"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  assinarEstadoVoz,
  assinarPreferenciasVoz,
  estadoVoz,
  estadoVozServidor,
  falar,
  nomeDaVoz,
  parar,
  preferenciasVoz,
  preferenciasVozServidor,
  salvarPreferenciasVoz,
  vozesPt,
} from "@/lib/cliente/voz";
import type { Mensagem } from "@/lib/db";

// Narração em voz alta nas duas mesas: o botão do cabeçalho (liga a leitura automática, popover de voz e velocidade),
// o botãozinho "ouvir" em cada narração e o gancho que lê as narrações novas assim que terminam de chegar.
// Sem speechSynthesis ou sem voz em português, nada disso aparece.

export function useVoz() {
  const estado = useSyncExternalStore(assinarEstadoVoz, estadoVoz, estadoVozServidor);
  const prefs = useSyncExternalStore(assinarPreferenciasVoz, preferenciasVoz, preferenciasVozServidor);
  return { ...estado, prefs };
}

function IconeVoz({ ligado }: { ligado: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* boca falando: balão com ondas */}
      <path d="M4 5.5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3.5 3v-3H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z" fill="currentColor" fillOpacity={0.2} />
      {ligado ? (
        <>
          <path d="M18.5 8a4 4 0 0 1 0 5" />
          <path d="M21 6a7 7 0 0 1 0 9" />
        </>
      ) : (
        <path d="M18 8l4 4M22 8l-4 4" />
      )}
    </svg>
  );
}

/**
 * Botão do cabeçalho: liga/desliga a leitura automática; a setinha abre voz, velocidade e tom.
 * compacto: no celular vira um botão só (abre o popover, que tem o liga/desliga), para caber em cabeçalhos cheios.
 */
export function BotaoVoz({
  compacto = false,
  acima = false,
  className = "",
}: {
  compacto?: boolean;
  /** popover abre para cima, alinhado à esquerda (botão no pé de um painel) */
  acima?: boolean;
  className?: string;
}) {
  const { disponivel, falando, prefs } = useVoz();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

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

  if (!disponivel) return null;

  function alternar() {
    const auto = !prefs.auto;
    salvarPreferenciasVoz({ auto });
    if (!auto) parar();
  }

  const vozes = vozesPt();
  const atual = vozes.find((v) => v.voiceURI === prefs.voz) ?? vozes[0];
  const dica = prefs.auto ? "Leitura em voz alta ligada: o mestre lê cada narração nova (clique para desligar)" : "Ler as narrações em voz alta";

  return (
    <div ref={caixa} className={`relative inline-flex shrink-0 items-center ${className}`} data-voz>
      <div className={`inline-flex items-center overflow-hidden rounded-md border ${prefs.auto ? "border-ambar/60" : "border-border"}`}>
        <button
          type="button"
          onClick={() => {
            // compacto no celular: o toque abre o popover (o liga/desliga fica lá dentro)
            if (compacto && !window.matchMedia("(min-width: 640px)").matches) setAberto((a) => !a);
            else alternar();
          }}
          title={dica}
          aria-label={prefs.auto ? "Desligar a leitura em voz alta" : "Ler as narrações em voz alta"}
          aria-pressed={prefs.auto}
          data-voz-auto
          className={`flex h-10 min-w-10 items-center justify-center gap-1 px-2 transition hover:text-ambar sm:h-9 sm:min-w-9 ${prefs.auto ? "text-ambar" : "text-muted"}`}
        >
          <IconeVoz ligado={prefs.auto} />
          <span className="hidden text-xs font-semibold xl:inline">Ler</span>
        </button>
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          title="Voz e velocidade da leitura"
          aria-label="Voz e velocidade da leitura"
          aria-expanded={aberto}
          className={`${compacto ? "hidden sm:grid" : "grid"} h-10 min-w-7 place-items-center border-l border-border px-1.5 text-xs text-muted transition hover:text-ambar sm:h-9`}
        >
          <span aria-hidden>▾</span>
        </button>
      </div>

      {aberto && (
        <div className={`cartao surgir bg-surface! absolute z-50 w-72 ${acima ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"} max-w-[calc(100vw-1rem)] p-3 text-foreground`} role="dialog" aria-label="Leitura em voz alta">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="titulo text-sm text-ambar">Leitura em voz alta</span>
            <button type="button" onClick={alternar} className="min-h-8 text-xs text-muted hover:text-ambar">
              {prefs.auto ? "Desligar" : "Ligar"}
            </button>
          </div>
          <p className="mb-3 text-[11px] leading-snug text-muted">
            {prefs.auto ? "Cada narração nova é lida assim que o mestre termina de escrever." : "Desligada. Dá para ouvir uma narração só pelo botão 🔊 ao lado dela."}
          </p>
          <label className="block text-xs text-muted">
            Voz
            <select
              value={atual?.voiceURI ?? ""}
              onChange={(e) => salvarPreferenciasVoz({ voz: e.target.value || null })}
              className="campo mt-1 min-h-9 py-1 text-sm"
            >
              {vozes.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {nomeDaVoz(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 flex items-center gap-2 text-xs text-muted">
            <span className="w-16 shrink-0">Velocidade</span>
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.05}
              value={prefs.velocidade}
              onChange={(e) => salvarPreferenciasVoz({ velocidade: Number(e.target.value) })}
              className="min-w-0 flex-1 accent-ambar"
              aria-label="Velocidade da leitura"
            />
            <span className="w-10 text-right tabular-nums">{prefs.velocidade.toFixed(2).replace(/0$/, "")}×</span>
          </label>
          <label className="mt-2 flex items-center gap-2 text-xs text-muted">
            <span className="w-16 shrink-0">Tom</span>
            <input
              type="range"
              min={0.6}
              max={1.4}
              step={0.05}
              value={prefs.tom}
              onChange={(e) => salvarPreferenciasVoz({ tom: Number(e.target.value) })}
              className="min-w-0 flex-1 accent-ambar"
              aria-label="Tom da voz"
            />
            <span className="w-10 text-right tabular-nums">{prefs.tom.toFixed(2).replace(/0$/, "")}</span>
          </label>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
            <button
              type="button"
              className="min-h-8 text-xs text-ambar hover:underline"
              onClick={() => falar("Puxe um banco, viajante. O mestre já está bêbado, mas ainda sabe ler.", { id: "teste-voz", interromper: true })}
            >
              ▶ Testar a voz
            </button>
            {falando && (
              <button type="button" className="min-h-8 text-xs text-muted hover:text-sangue" onClick={parar}>
                ■ Calar o mestre
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** A leitura em voz alta numa linha de painel (celular, quando o cabeçalho não tem espaço). Some sem voz em português. */
export function VozNoPainel({ className = "" }: { className?: string }) {
  const { disponivel, prefs } = useVoz();
  if (!disponivel) return null;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <BotaoVoz acima />
      <span>Leitura em voz alta {prefs.auto ? "ligada" : "desligada"}</span>
    </div>
  );
}

/**
 * Botãozinho "ouvir" de uma narração. No desktop aparece no hover/foco do bloco (o pai precisa da classe `group`);
 * no celular fica sempre visível, discreto. Clicar de novo enquanto fala cala.
 */
export function Ouvir({ id, texto, className = "" }: { id: string; texto: string; className?: string }) {
  const { disponivel, falando } = useVoz();
  if (!disponivel) return null;
  const este = falando === id;
  return (
    <button
      type="button"
      onClick={() => (este ? parar() : falar(texto, { id, interromper: true }))}
      aria-label={este ? "Parar a leitura" : "Ouvir esta narração"}
      title={este ? "Parar a leitura" : "Ouvir esta narração"}
      aria-pressed={este}
      data-ouvir
      className={`inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-xs transition focus-visible:opacity-100 ${
        este ? "text-ambar opacity-100" : "text-muted/70 hover:text-ambar sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      } ${className}`}
    >
      <span aria-hidden>{este ? "■" : "🔊"}</span>
      <span>{este ? "parar" : "ouvir"}</span>
    </button>
  );
}

/**
 * Lê sozinho as narrações novas do mestre (com a leitura automática ligada). A mensagem do mestre só chega inteira,
 * depois do texto ao vivo, então ler na chegada é ler "quando termina". O que já estava na tela ao abrir, ou volta
 * depois de um desfazer, não é lido de novo (a chave é id + texto: o banco pode reaproveitar o id apagado).
 * Também cala ao sair da mesa.
 */
export function useLeituraAutomatica(mensagens: Mensagem[]) {
  const { prefs } = useVoz();
  const vistas = useRef<Set<string> | null>(null);

  useEffect(() => {
    const chave = (m: Mensagem) => `${m.id}:${m.texto.length}:${m.texto.slice(0, 60)}`;
    const mestre = mensagens.filter((m) => m.tipo === "mestre");
    if (!vistas.current) {
      vistas.current = new Set(mestre.map(chave));
      return;
    }
    for (const m of mestre) {
      const k = chave(m);
      if (vistas.current.has(k)) continue;
      vistas.current.add(k);
      if (prefs.auto) falar(m.texto, { id: `msg-${m.id}` });
    }
  }, [mensagens, prefs.auto]);

  useEffect(() => () => parar(), []);
}
