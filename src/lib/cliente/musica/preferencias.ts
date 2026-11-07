import type { HumorMusical } from "@/lib/sistemas/tipos";
import type { Energia } from "./teoria";

// Preferência da trilha (ligada/volume) no localStorage "taverna:musica", com fallback em memória.
// Forma de loja externa para useSyncExternalStore: o servidor sempre vê o padrão, o navegador lê o salvo.
// Humor escolhido à mão pelo jogador: por campanha, em "taverna:musica:<id>" (vence a cena até voltar ao automático).

export type PreferenciasMusica = { ligado: boolean; volume: number };

const CHAVE = "taverna:musica";

export const HUMORES_MUSICA: readonly HumorMusical[] = ["taverna", "calmo", "exploracao", "misterio", "tensao", "combate", "triste", "vitoria", "sombrio"];
export const ENERGIAS_MUSICA: readonly Energia[] = ["baixa", "media", "alta"];

export const PREFERENCIAS_PADRAO: PreferenciasMusica = { ligado: true, volume: 0.35 };

let atual: PreferenciasMusica | null = null;
const ouvintes = new Set<() => void>();

function ler(): PreferenciasMusica {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return PREFERENCIAS_PADRAO;
    const p = JSON.parse(bruto) as Partial<PreferenciasMusica>;
    return {
      ligado: typeof p.ligado === "boolean" ? p.ligado : PREFERENCIAS_PADRAO.ligado,
      volume: typeof p.volume === "number" && Number.isFinite(p.volume) ? Math.max(0, Math.min(1, p.volume)) : PREFERENCIAS_PADRAO.volume,
    };
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}

export function preferenciasMusica(): PreferenciasMusica {
  if (!atual) atual = ler();
  return atual;
}

export function preferenciasMusicaServidor(): PreferenciasMusica {
  return PREFERENCIAS_PADRAO;
}

export function salvarPreferenciasMusica(mudanca: Partial<PreferenciasMusica>) {
  atual = { ...preferenciasMusica(), ...mudanca };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    // modo privado / armazenamento bloqueado: fica só na memória
  }
  for (const f of ouvintes) f();
}

export function assinarPreferenciasMusica(f: () => void): () => void {
  ouvintes.add(f);
  // outra aba mudou a preferência
  const aoArmazenar = (e: StorageEvent) => {
    if (e.key !== CHAVE) return;
    atual = ler();
    f();
  };
  window.addEventListener("storage", aoArmazenar);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", aoArmazenar);
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Humor manual por campanha

/** null = automático (segue a cena do mestre) */
export type HumorManual = { humor: HumorMusical | null; energia: Energia | null };

export const HUMOR_MANUAL_PADRAO: HumorManual = { humor: null, energia: null };

/** chave da campanha no localStorage (fora de uma mesa não há escolha manual: ver humorManual) */
export function chaveHumorManual(campanha: number | string): string {
  return `${CHAVE}:${campanha}`;
}

const manuais = new Map<string, HumorManual>();
const ouvintesManual = new Set<() => void>();

function ehHumor(v: unknown): v is HumorMusical {
  return typeof v === "string" && (HUMORES_MUSICA as readonly string[]).includes(v);
}

function ehEnergia(v: unknown): v is Energia {
  return typeof v === "string" && (ENERGIAS_MUSICA as readonly string[]).includes(v);
}

function lerManual(chave: string): HumorManual {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return HUMOR_MANUAL_PADRAO;
    const p = JSON.parse(bruto) as Partial<HumorManual>;
    const humor = ehHumor(p.humor) ? p.humor : null;
    const energia = ehEnergia(p.energia) ? p.energia : null;
    return humor === null && energia === null ? HUMOR_MANUAL_PADRAO : { humor, energia };
  } catch {
    return HUMOR_MANUAL_PADRAO;
  }
}

/**
 * escolha manual da campanha (snapshot estável para useSyncExternalStore). Sem campanha (antes de montar, ou fora de
 * uma mesa, como em /nova), sempre o padrão: o componente não mostra os chips nesse caso.
 */
export function humorManual(campanha: number | string | null | undefined): HumorManual {
  if (campanha === null || campanha === undefined) return HUMOR_MANUAL_PADRAO;
  const chave = chaveHumorManual(campanha);
  let m = manuais.get(chave);
  if (!m) {
    m = lerManual(chave);
    manuais.set(chave, m);
  }
  return m;
}

export function humorManualServidor(): HumorManual {
  return HUMOR_MANUAL_PADRAO;
}

/** guarda a escolha (humor e/ou energia); tudo null volta ao automático e limpa a chave. Sem campanha não há o que guardar */
export function salvarHumorManual(campanha: number | string | null | undefined, mudanca: Partial<HumorManual>) {
  if (campanha === null || campanha === undefined) return;
  const chave = chaveHumorManual(campanha);
  const antes = humorManual(campanha);
  const proximo: HumorManual = { humor: mudanca.humor === undefined ? antes.humor : mudanca.humor, energia: mudanca.energia === undefined ? antes.energia : mudanca.energia };
  const automatico = proximo.humor === null && proximo.energia === null;
  manuais.set(chave, automatico ? HUMOR_MANUAL_PADRAO : proximo);
  try {
    if (automatico) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(proximo));
  } catch {
    // modo privado / armazenamento bloqueado: fica só na memória
  }
  for (const f of ouvintesManual) f();
}

export function assinarHumorManual(f: () => void): () => void {
  ouvintesManual.add(f);
  // outra aba mudou a escolha desta (ou de outra) campanha
  const aoArmazenar = (e: StorageEvent) => {
    if (!e.key || !e.key.startsWith(`${CHAVE}:`)) return;
    manuais.set(e.key, lerManual(e.key));
    f();
  };
  window.addEventListener("storage", aoArmazenar);
  return () => {
    ouvintesManual.delete(f);
    window.removeEventListener("storage", aoArmazenar);
  };
}
