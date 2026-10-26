// Preferência da trilha (ligada/volume) no localStorage "taverna:musica", com fallback em memória.
// Forma de loja externa para useSyncExternalStore: o servidor sempre vê o padrão, o navegador lê o salvo.

export type PreferenciasMusica = { ligado: boolean; volume: number };

const CHAVE = "taverna:musica";

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
