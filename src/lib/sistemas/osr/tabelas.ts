import "server-only";

// Tabelas old-school (B/X e clones abertos sob OGL 1.0a): salvaguardas, ataque, magias por dia,
// habilidades de ladrão e modificadores de atributo. Números são mecânica; o texto é nosso.

export type Salva = "morte" | "varinhas" | "paralisia" | "sopro" | "magias";

export const SALVAS: { id: Salva; nome: string; curto: string }[] = [
  { id: "morte", nome: "Morte/Veneno", curto: "Morte" },
  { id: "varinhas", nome: "Varinhas", curto: "Varinhas" },
  { id: "paralisia", nome: "Paralisia/Petrificação", curto: "Paralisia" },
  { id: "sopro", nome: "Sopro de dragão", curto: "Sopro" },
  { id: "magias", nome: "Magias/Bastões", curto: "Magias" },
];

export type GrupoSalva = "guerreiro" | "clerigo" | "mago" | "ladrao" | "anao" | "elfo" | "halfling";

type FaixaSalva = { ate: number; s: [number, number, number, number, number] };

// cada faixa vale até o nível `ate`; acima da última, repete a última
const TABELA_SALVAS: Record<GrupoSalva, FaixaSalva[]> = {
  guerreiro: [
    { ate: 3, s: [12, 13, 14, 15, 16] },
    { ate: 6, s: [10, 11, 12, 13, 14] },
    { ate: 9, s: [8, 9, 10, 10, 12] },
    { ate: 12, s: [6, 7, 8, 8, 10] },
    { ate: 14, s: [4, 5, 6, 5, 8] },
  ],
  clerigo: [
    { ate: 4, s: [11, 12, 14, 16, 15] },
    { ate: 8, s: [9, 10, 12, 14, 12] },
    { ate: 12, s: [6, 7, 9, 11, 9] },
    { ate: 14, s: [3, 5, 7, 8, 7] },
  ],
  mago: [
    { ate: 5, s: [13, 14, 13, 16, 15] },
    { ate: 10, s: [11, 12, 11, 14, 12] },
    { ate: 14, s: [8, 9, 8, 11, 8] },
  ],
  ladrao: [
    { ate: 4, s: [13, 14, 13, 16, 15] },
    { ate: 8, s: [12, 13, 11, 14, 13] },
    { ate: 12, s: [10, 11, 9, 12, 10] },
    { ate: 14, s: [8, 9, 7, 10, 8] },
  ],
  anao: [
    { ate: 3, s: [8, 9, 10, 13, 12] },
    { ate: 6, s: [6, 7, 8, 10, 10] },
    { ate: 9, s: [4, 5, 6, 7, 8] },
    { ate: 12, s: [2, 3, 4, 4, 6] },
    { ate: 14, s: [2, 2, 3, 3, 5] },
  ],
  elfo: [
    { ate: 3, s: [12, 13, 13, 15, 15] },
    { ate: 6, s: [10, 11, 11, 13, 12] },
    { ate: 9, s: [8, 9, 9, 10, 10] },
    { ate: 12, s: [6, 7, 8, 8, 8] },
    { ate: 14, s: [5, 6, 7, 7, 7] },
  ],
  halfling: [
    { ate: 3, s: [8, 9, 10, 13, 12] },
    { ate: 6, s: [6, 7, 8, 10, 10] },
    { ate: 14, s: [4, 5, 6, 7, 8] },
  ],
};

export function salvasBase(grupo: GrupoSalva, nivel: number): Record<Salva, number> {
  const faixas = TABELA_SALVAS[grupo];
  const faixa = faixas.find((f) => nivel <= f.ate) ?? faixas[faixas.length - 1];
  return Object.fromEntries(SALVAS.map((s, i) => [s.id, faixa.s[i]])) as Record<Salva, number>;
}

/** Progressão de ataque: guerreiros sobem rápido, clérigos/ladrões no meio, magos devagar. */
export type GrupoAtaque = "guerreiro" | "clerigo" | "mago";

const BONUS_ATAQUE: Record<GrupoAtaque, { ate: number; b: number }[]> = {
  guerreiro: [{ ate: 3, b: 0 }, { ate: 6, b: 2 }, { ate: 9, b: 5 }, { ate: 12, b: 7 }, { ate: 99, b: 9 }],
  clerigo: [{ ate: 4, b: 0 }, { ate: 8, b: 2 }, { ate: 12, b: 5 }, { ate: 99, b: 7 }],
  mago: [{ ate: 5, b: 0 }, { ate: 10, b: 2 }, { ate: 99, b: 5 }],
};

export function bonusAtaqueBase(grupo: GrupoAtaque, nivel: number): number {
  return (BONUS_ATAQUE[grupo].find((f) => nivel <= f.ate) ?? { b: 0 }).b;
}

/** THAC0 equivalente ao bônus ascendente (THAC0 19 = +0). */
export function thac0(bonus: number): number {
  return 19 - bonus;
}

/** Modificador B/X: 3 → −3, 4-5 → −2, 6-8 → −1, 9-12 → 0, 13-15 → +1, 16-17 → +2, 18 → +3. */
export function modBX(valor: number): number {
  if (valor <= 3) return -3;
  if (valor <= 5) return -2;
  if (valor <= 8) return -1;
  if (valor <= 12) return 0;
  if (valor <= 15) return 1;
  if (valor <= 17) return 2;
  return 3;
}

/** Ajuste menor (iniciativa pela DES, reação pelo CAR): 3 → −2, 4-8 → −1, 9-12 → 0, 13-17 → +1, 18 → +2. */
export function modMenor(valor: number): number {
  if (valor <= 3) return -2;
  if (valor <= 8) return -1;
  if (valor <= 12) return 0;
  if (valor <= 17) return 1;
  return 2;
}

/** Seguidores máximos e lealdade pelo CAR. */
export function seguidores(car: number): { max: number; lealdade: number } {
  if (car <= 3) return { max: 1, lealdade: 4 };
  if (car <= 5) return { max: 2, lealdade: 5 };
  if (car <= 8) return { max: 3, lealdade: 6 };
  if (car <= 12) return { max: 4, lealdade: 7 };
  if (car <= 15) return { max: 5, lealdade: 8 };
  if (car <= 17) return { max: 6, lealdade: 9 };
  return { max: 7, lealdade: 10 };
}

/** Idiomas extras pela INT (e analfabetismo abaixo de 6). */
export function idiomasExtras(int: number): string {
  if (int <= 3) return "mal fala, não lê";
  if (int <= 5) return "analfabeto";
  if (int <= 8) return "escreve com dificuldade";
  if (int <= 12) return "nenhum idioma extra";
  if (int <= 15) return "+1 idioma";
  if (int <= 17) return "+2 idiomas";
  return "+3 idiomas";
}

/** Ajuste de XP pelo pior requisito primário. */
export function ajusteXP(valor: number): number {
  if (valor <= 5) return -20;
  if (valor <= 8) return -10;
  if (valor <= 12) return 0;
  if (valor <= 15) return 5;
  return 10;
}

// ——— Habilidades de ladrão (índice = nível − 1) ———
const LADRAO = {
  escalar: [87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 99],
  armadilhas: [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95, 97, 99],
  ouvir: [2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5],
  esconder: [10, 15, 20, 25, 30, 36, 45, 55, 65, 75, 85, 90, 95, 99],
  silencio: [20, 25, 30, 35, 40, 45, 55, 65, 75, 85, 95, 96, 98, 99],
  "abrir-fechaduras": [15, 20, 25, 30, 35, 45, 55, 65, 75, 85, 95, 96, 97, 99],
  "bater-carteiras": [20, 25, 30, 35, 40, 45, 55, 65, 75, 85, 95, 99, 99, 99],
};

export type HabilidadeLadrao = keyof typeof LADRAO;

/** Valor da tabela de ladrão no nível (com deslocamento para classes "meio-ladras"). */
export function tabelaLadrao(hab: HabilidadeLadrao, nivel: number, deslocamento = 0): number {
  const tabela = LADRAO[hab];
  const i = Math.max(0, Math.min(tabela.length - 1, nivel - 1 + deslocamento));
  return tabela[i];
}

/** Progressão linear com teto, para habilidades próprias (lendas, corda bamba, rastrear...). */
export function linear(base: number, porNivel: number, teto: number) {
  return (nivel: number) => Math.min(teto, base + porNivel * (nivel - 1));
}

// ——— Magias por dia (índice = nível; cada item = espaços por círculo) ———
export type PerfilMagia = "mago" | "clerigo" | "druida" | "bardo" | "paladino" | "patrulheiro" | "gnomo";

const MAGIAS_MAGO: number[][] = [
  [], [1], [2], [2, 1], [2, 2], [2, 2, 1], [2, 2, 2], [3, 2, 2, 1], [3, 3, 2, 2], [3, 3, 3, 2, 1],
  [3, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 4, 3, 3, 3, 2], [4, 4, 4, 3, 3, 3], [4, 4, 4, 4, 3, 3],
];
const MAGIAS_CLERIGO: number[][] = [
  [], [], [1], [2], [2, 1], [2, 2], [2, 2, 1, 1], [2, 2, 2, 1, 1], [3, 3, 2, 2, 1], [3, 3, 3, 2, 2],
  [4, 4, 3, 3, 2], [4, 4, 4, 3, 3], [5, 5, 4, 4, 3], [5, 5, 5, 4, 4], [6, 5, 5, 5, 4],
];
const MAGIAS_BARDO: number[][] = [
  [], [], [1], [2], [3], [3, 1], [3, 2], [3, 3], [3, 3, 1], [3, 3, 2],
  [3, 3, 3], [4, 3, 3, 1], [4, 4, 3, 2], [4, 4, 4, 3], [4, 4, 4, 3, 1],
];
const MAGIAS_PALADINO: number[][] = [[], [], [], [], [], [], [], [], [], [1], [2], [2, 1], [2, 2], [2, 2, 1], [3, 2, 1]];
const MAGIAS_PATRULHEIRO: number[][] = [[], [], [], [], [], [], [], [], [1], [2], [2, 1], [2, 2], [2, 2, 1], [3, 2, 1], [3, 2, 2]];
const MAGIAS_GNOMO: number[][] = [[], [1], [2], [2, 1], [2, 2], [2, 2, 1], [3, 2, 1], [3, 2, 2], [3, 3, 2]];

export function magiasPorDia(perfil: PerfilMagia, nivel: number): number[] {
  const n = Math.max(0, Math.min(14, nivel));
  switch (perfil) {
    case "mago":
      return MAGIAS_MAGO[n] ?? [];
    case "clerigo":
      return MAGIAS_CLERIGO[n] ?? [];
    // druida começa com uma magia já no 1º nível: usa a linha do clérigo um nível acima
    case "druida":
      return MAGIAS_CLERIGO[Math.min(14, n + 1)] ?? [];
    case "bardo":
      return MAGIAS_BARDO[n] ?? [];
    case "paladino":
      return MAGIAS_PALADINO[n] ?? [];
    case "patrulheiro":
      return MAGIAS_PATRULHEIRO[n] ?? [];
    case "gnomo":
      return MAGIAS_GNOMO[Math.min(8, n)] ?? [];
  }
}

/** Expulsar mortos-vivos: o que o clérigo precisa no 2d6 contra criaturas de `dv` dados de vida. */
export function expulsao(nivelClerigo: number, dv: number): number | "T" | "D" | null {
  if (nivelClerigo < 1) return null;
  const diferenca = dv - nivelClerigo;
  if (diferenca >= 3) return null;
  if (diferenca === 2) return 11;
  if (diferenca === 1) return 9;
  if (diferenca === 0) return 7;
  if (diferenca >= -2) return "T";
  return "D";
}
