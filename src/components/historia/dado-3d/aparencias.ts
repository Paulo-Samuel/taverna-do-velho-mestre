// Acabamentos do d20 (sem three.js, sem React): lista, leitura/gravação segura da escolha e contraste.
// A aparência "ambar" é a de sempre e vale quando nada foi escolhido (ou quando o armazenamento falha).

export type Aparencia = {
  id: string;
  nome: string;
  /** corpo da face: centro, meio e cantos (gradiente radial) */
  corpo: { clara: string; media: string; escura: string };
  /** fundo do atlas (o que vaza no mipmap), borda da face e filete interno */
  fundo: string;
  borda: string;
  filete: string;
  /** numeral comum, contorno do numeral, 20 natural e 1 natural */
  numero: string;
  contorno: string;
  critico: string;
  falha: string;
  /** veios: manchas claras e escuras sobre o corpo */
  veioClaro: string;
  veioEscuro: string;
  material: { roughness: number; metalness: number; clearcoat: number; clearcoatRoughness: number };
  /** brilho emissivo quando para em 20 ou em 1 */
  brilhoCritico: number;
  brilhoFalha: number;
};

export const APARENCIA_PADRAO = "ambar";

export const APARENCIAS: readonly Aparencia[] = [
  {
    id: "ambar",
    nome: "Âmbar",
    corpo: { clara: "#8a5524", media: "#5a3517", escura: "#2a170a" },
    fundo: "#8f6122",
    borda: "#e3b25a",
    filete: "rgba(255, 236, 190, 0.55)",
    numero: "#f3e6c8",
    contorno: "#1d1007",
    critico: "#e3b25a",
    falha: "#d9583f",
    veioClaro: "rgba(255, 210, 140, 0.10)",
    veioEscuro: "rgba(20, 8, 0, 0.18)",
    material: { roughness: 0.42, metalness: 0.08, clearcoat: 0.8, clearcoatRoughness: 0.22 },
    brilhoCritico: 0x7a4c08,
    brilhoFalha: 0x6a0e06,
  },
  {
    id: "obsidiana",
    nome: "Obsidiana",
    corpo: { clara: "#3b3b48", media: "#1a1a22", escura: "#08080c" },
    fundo: "#6b7080",
    borda: "#aab0c0",
    filete: "rgba(230, 235, 255, 0.45)",
    numero: "#ececf2",
    contorno: "#050507",
    critico: "#f0c04a",
    falha: "#ff7a62",
    veioClaro: "rgba(200, 210, 255, 0.07)",
    veioEscuro: "rgba(0, 0, 0, 0.30)",
    material: { roughness: 0.14, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 },
    brilhoCritico: 0x7a5a10,
    brilhoFalha: 0x7a1408,
  },
  {
    id: "cobalto",
    nome: "Cobalto",
    corpo: { clara: "#3466d6", media: "#1b3f94", escura: "#0b2058" },
    fundo: "#9fb0d8",
    borda: "#d3dcf2",
    filete: "rgba(255, 255, 255, 0.5)",
    numero: "#f6f8ff",
    contorno: "#06143a",
    critico: "#ffd54a",
    falha: "#ff8a6e",
    veioClaro: "rgba(180, 210, 255, 0.10)",
    veioEscuro: "rgba(0, 10, 50, 0.22)",
    material: { roughness: 0.3, metalness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.15 },
    brilhoCritico: 0x7a5a10,
    brilhoFalha: 0x7a1408,
  },
  {
    id: "carmesim",
    nome: "Carmesim",
    corpo: { clara: "#b62c3e", media: "#7c1226", escura: "#3d0912" },
    fundo: "#9a6a24",
    borda: "#e3b25a",
    filete: "rgba(255, 226, 170, 0.5)",
    numero: "#fbeee0",
    contorno: "#2a0409",
    critico: "#ffd54a",
    falha: "#ffffff",
    veioClaro: "rgba(255, 170, 170, 0.10)",
    veioEscuro: "rgba(30, 0, 5, 0.25)",
    material: { roughness: 0.34, metalness: 0.1, clearcoat: 0.85, clearcoatRoughness: 0.18 },
    brilhoCritico: 0x7a4c08,
    brilhoFalha: 0x6a0e06,
  },
  {
    id: "ouro-rose",
    nome: "Ouro rosé",
    corpo: { clara: "#eab5a0", media: "#d08f78", escura: "#a96a56" },
    fundo: "#8a5646",
    borda: "#fff1e6",
    filete: "rgba(255, 255, 255, 0.55)",
    numero: "#33150e",
    contorno: "#fff1e6",
    critico: "#5e3a00",
    falha: "#7a1208",
    veioClaro: "rgba(255, 240, 230, 0.16)",
    veioEscuro: "rgba(90, 40, 30, 0.14)",
    material: { roughness: 0.28, metalness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.2 },
    brilhoCritico: 0x7a4c08,
    brilhoFalha: 0x6a0e06,
  },
  {
    id: "marfim",
    nome: "Marfim",
    corpo: { clara: "#f8eed6", media: "#ecdcb6", escura: "#cdb88a" },
    fundo: "#7d6330",
    borda: "#8a6a2a",
    filete: "rgba(255, 250, 235, 0.7)",
    numero: "#26180d",
    contorno: "#fbf3e0",
    critico: "#6a4300",
    falha: "#8e1a10",
    veioClaro: "rgba(255, 255, 245, 0.18)",
    veioEscuro: "rgba(120, 90, 40, 0.12)",
    material: { roughness: 0.5, metalness: 0.02, clearcoat: 0.6, clearcoatRoughness: 0.3 },
    brilhoCritico: 0x7a4c08,
    brilhoFalha: 0x6a0e06,
  },
];

export function aparenciaPorId(id: string | null | undefined): Aparencia {
  return APARENCIAS.find((a) => a.id === id) ?? APARENCIAS[0];
}

export function ehAparenciaValida(id: unknown): id is string {
  return typeof id === "string" && APARENCIAS.some((a) => a.id === id);
}

// ----- escolha guardada no navegador -----

export const CHAVE_APARENCIA = "taverna:d20-aparencia";

type Armazem = Pick<Storage, "getItem" | "setItem">;

function armazemPadrao(): Armazem | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // acesso bloqueado lança até para ler a propriedade
  }
}

/** lê a escolha; qualquer falha, ausência ou id desconhecido volta ao padrão */
export function lerAparencia(armazem: Armazem | null = armazemPadrao()): string {
  try {
    const id = armazem?.getItem(CHAVE_APARENCIA);
    return ehAparenciaValida(id) ? id : APARENCIA_PADRAO;
  } catch {
    return APARENCIA_PADRAO;
  }
}

/** grava a escolha; devolve false se o armazenamento recusou (a escolha vale só até recarregar) */
export function gravarAparencia(id: string, armazem: Armazem | null = armazemPadrao()): boolean {
  if (!ehAparenciaValida(id) || !armazem) return false;
  try {
    armazem.setItem(CHAVE_APARENCIA, id);
    return true;
  } catch {
    return false;
  }
}

// ----- contraste (WCAG) para garantir o 20 e o 1 legíveis -----

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// ----- escolha compartilhada entre dados da mesma página (troca sem recarregar) -----

const ouvintes = new Set<() => void>();
let atual: string | null = null;

export function aparenciaAtual(): string {
  if (atual === null) atual = lerAparencia();
  return atual;
}

export function escolherAparencia(id: string) {
  if (!ehAparenciaValida(id)) return;
  atual = id;
  gravarAparencia(id);
  ouvintes.forEach((f) => f());
}

export function assinarAparencia(aoMudar: () => void) {
  ouvintes.add(aoMudar);
  return () => {
    ouvintes.delete(aoMudar);
  };
}
