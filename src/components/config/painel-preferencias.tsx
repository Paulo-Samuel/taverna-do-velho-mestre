"use client";

import { useId, useSyncExternalStore } from "react";
import { APARENCIAS, APARENCIA_PADRAO, aparenciaAtual, assinarAparencia, escolherAparencia } from "@/components/historia/dado-3d/aparencias";
import { ESCALAS_FONTE, salvarPreferenciasLeitor, usePreferenciasLeitor } from "@/components/leitor/preferencias";
import {
  assinarPreferenciasMusica,
  preferenciasMusica,
  preferenciasMusicaServidor,
  salvarPreferenciasMusica,
} from "@/lib/cliente/musica/preferencias";

// Painel "Preferências" (G13): reúne num lugar só o que o jogador ajusta neste navegador. Não tem chave própria: cada controle
// usa a mesma loja que o jogo lê (d20: aparencias.ts; música: musica/preferencias.ts; leitura: leitor/preferencias.ts), então
// música e leitura valem também em outras abas abertas (evento "storage"); o dado vale na próxima abertura em outra aba. Sem localStorage, vale até
// fechar a aba. A taverna é só em português: não há seletor de idioma.

const ROTULOS_FONTE = ["Pequena", "Média", "Grande", "Muito grande"];

export function PainelPreferencias() {
  const idDado = useId();
  const idVolume = useId();
  const aparencia = useSyncExternalStore(assinarAparencia, aparenciaAtual, () => APARENCIA_PADRAO);
  const musica = useSyncExternalStore(assinarPreferenciasMusica, preferenciasMusica, preferenciasMusicaServidor);
  const leitor = usePreferenciasLeitor();
  const percentual = Math.round(musica.volume * 100);

  return (
    <section id="preferencias" aria-labelledby="titulo-preferencias" className="mt-10 scroll-mt-20">
      <h2 id="titulo-preferencias" className="titulo text-2xl text-pergaminho">
        Preferências
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">Valem só para este navegador e ficam guardadas nele. Nada vai para o servidor.</p>

      <div className="cartao mt-4 grid gap-6 p-4 sm:p-6">
        <div>
          <label htmlFor={idDado} className="block text-sm font-medium text-pergaminho">
            Acabamento do dado
          </label>
          <select
            id={idDado}
            value={aparencia}
            onChange={(e) => escolherAparencia(e.target.value)}
            className="campo mt-2 min-h-11 sm:w-64"
          >
            {APARENCIAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="min-w-0">
          <legend className="text-sm font-medium text-pergaminho">Música da mesa</legend>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-pergaminho">
            <input
              type="checkbox"
              checked={!musica.ligado}
              onChange={(e) => salvarPreferenciasMusica({ ligado: !e.target.checked })}
              className="size-6 shrink-0 accent-[var(--botao)]"
            />
            Mudo
          </label>
          <label htmlFor={idVolume} className="mt-2 block text-sm text-muted">
            Volume: {percentual}%
          </label>
          <input
            id={idVolume}
            type="range"
            min={0}
            max={100}
            step={5}
            value={percentual}
            onChange={(e) => salvarPreferenciasMusica({ volume: Number(e.target.value) / 100 })}
            className="mt-1 block h-11 w-full max-w-md accent-[var(--botao)]"
          />
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="text-sm font-medium text-pergaminho">Leitura da narração</legend>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-pergaminho">
            <input
              type="checkbox"
              checked={leitor.animar}
              onChange={(e) => salvarPreferenciasLeitor({ animar: e.target.checked })}
              className="size-6 shrink-0 accent-[var(--botao)]"
            />
            <span>Texto aparecendo aos poucos (desligue para reduzir o movimento)</span>
          </label>
          <div role="group" aria-label="Tamanho da letra" className="mt-3 flex flex-wrap gap-2">
            {ESCALAS_FONTE.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={leitor.fonte === i}
                onClick={() => salvarPreferenciasLeitor({ fonte: i })}
                className={`${leitor.fonte === i ? "btn-ambar" : "btn-borda"} min-h-11 min-w-11 px-3`}
              >
                {ROTULOS_FONTE[i] ?? `Passo ${i + 1}`}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
