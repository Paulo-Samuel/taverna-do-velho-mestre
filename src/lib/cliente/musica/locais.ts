import type { HumorMusical } from "@/lib/sistemas/tipos";

// Músicas próprias da pessoa na pasta musica/ do repo (servidas por /api/musica). Tipos e constantes puros,
// usados pela rota (servidor) e pelo tocador (navegador).

export const HUMORES: readonly HumorMusical[] = ["taverna", "calmo", "exploracao", "misterio", "tensao", "combate", "triste", "vitoria", "sombrio"];

export const EXTENSOES_AUDIO: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".webm": "audio/webm",
};

/** uma faixa: caminho relativo a musica/ (com "/") e nome para mostrar (arquivo sem extensão) */
export type Faixa = { c: string; nome: string };

/** resposta de GET /api/musica: faixas por humor, já com os fallbacks resolvidos */
export type RespostaMusica = { sistema: string; total: number; humores: Partial<Record<HumorMusical, Faixa[]>> };

/** faixa pronta para tocar no navegador (com a URL do arquivo) */
export type FaixaLocal = Faixa & { url: string };
export type FaixasLocais = Partial<Record<HumorMusical, FaixaLocal[]>>;

/** busca as faixas do sistema; campanha libera o acesso de quem está na mesa pela rede. null = falhou */
export async function buscarFaixas(sistema: string, campanha: number | null, sinal?: AbortSignal): Promise<{ total: number; faixas: FaixasLocais } | null> {
  const extra = campanha ? `&campanha=${campanha}` : "";
  try {
    const r = await fetch(`/api/musica?sistema=${encodeURIComponent(sistema)}${extra}`, { signal: sinal });
    if (!r.ok) return null;
    const dados = (await r.json()) as RespostaMusica;
    const faixas: FaixasLocais = {};
    for (const h of HUMORES) {
      const lista = dados.humores?.[h];
      if (lista?.length) faixas[h] = lista.map((f) => ({ ...f, url: `/api/musica/arquivo?c=${encodeURIComponent(f.c)}${extra}` }));
    }
    return { total: dados.total ?? 0, faixas };
  } catch {
    return null;
  }
}
