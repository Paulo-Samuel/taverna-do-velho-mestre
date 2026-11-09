// Humor do NPC diante do grupo (campo `atitude` do diário, ao lado do texto livre `relacao`). Puro: serve ao servidor e à tela.

export const ATITUDES = ["amistoso", "curioso", "desconfiado", "hostil", "devoto", "medo", "apaixonado", "neutro"] as const;
export type Atitude = (typeof ATITUDES)[number];

export const ROTULO_ATITUDE: Record<Atitude, string> = {
  amistoso: "Amistoso",
  curioso: "Curioso",
  desconfiado: "Desconfiado",
  hostil: "Hostil",
  devoto: "Devoto",
  medo: "Com medo",
  apaixonado: "Apaixonado",
  neutro: "Neutro",
};

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const SINONIMOS: Record<string, Atitude> = {
  amistosa: "amistoso",
  curiosa: "curioso",
  desconfiada: "desconfiado",
  devota: "devoto",
  apaixonada: "apaixonado",
  neutra: "neutro",
  "com medo": "medo",
  assustado: "medo",
  assustada: "medo",
  amedrontado: "medo",
  amedrontada: "medo",
};

/** "Com medo", "Curiosa", "HOSTIL" → chave da lista; fora da lista → null. */
export function normalizarAtitude(valor: unknown): Atitude | null {
  if (typeof valor !== "string") return null;
  const k = semAcento(valor);
  if ((ATITUDES as readonly string[]).includes(k)) return k as Atitude;
  return SINONIMOS[k] ?? null;
}

/** Rótulo para a tela; valor desconhecido (diário antigo ou editado à mão) → null, e a tela não mostra nada. */
export function rotuloDaAtitude(valor: unknown): string | null {
  const a = normalizarAtitude(valor);
  return a ? ROTULO_ATITUDE[a] : null;
}
