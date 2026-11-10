import type { PersonagemVisivel } from "@/lib/mesa";
import type { EntradaDiario } from "@/lib/sistemas/tipos";

// Cores do modo história: cada nome (NPC ou personagem) ganha sempre a mesma cor, escolhida pelo próprio nome.
// Tons claros e quentes que leem bem no fundo escuro sem brigar com o âmbar dos botões.

const PALETA = [
  "#e8a87c", // pêssego
  "#8fc1e3", // azul-céu
  "#c3a6ff", // lavanda
  "#9ad4a0", // sálvia
  "#f2c75c", // mel
  "#f28b82", // coral
  "#7fd1c7", // água
  "#e6a1d6", // malva
  "#c5d17a", // limão seco
  "#d9b38c", // couro claro
];

/** Tira acentos e caixa para comparar nomes. */
export function normalizarNome(nome: string): string {
  return nome.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Cor estável para um nome (mesmo nome → mesma cor, em qualquer aparelho). */
export function corDoNome(nome: string): string {
  let h = 5381;
  for (const c of normalizarNome(nome)) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return PALETA[Math.abs(h) % PALETA.length];
}

/** Palavras que não servem de "primeiro nome" (títulos, artigos): "Capitão Varn" vira "Varn". */
const NAO_NOMES = new Set(
  "o a os as um uma de do da dos das e sir dona dom seu senhor senhora mestre mestra velho velha irmao irma padre frei madre capitao lorde lady rei rainha principe princesa tio tia vovo pai mae doutor sargento cabo soldado guarda".split(
    " ",
  ),
);

function primeiroNome(nome: string): string | null {
  const palavra = nome
    .split(/[\s,]+/)
    .map((p) => p.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .find((p) => p.length >= 3 && !NAO_NOMES.has(normalizarNome(p)));
  return palavra && palavra !== nome ? palavra : null;
}

/** Nome que aparece no texto → cor. Inclui o nome completo e o primeiro nome de NPCs do diário e dos personagens. */
export function mapaDeNomes(personagens: PersonagemVisivel[], diario: EntradaDiario[]): Map<string, string> {
  const mapa = new Map<string, string>();
  const incluir = (nome: string) => {
    const limpo = nome.trim();
    if (limpo.length < 2) return;
    const cor = corDoNome(limpo);
    if (!mapa.has(limpo)) mapa.set(limpo, cor);
    const primeiro = primeiroNome(limpo);
    if (primeiro && !mapa.has(primeiro)) mapa.set(primeiro, cor);
  };
  // personagens primeiro: um NPC xará não rouba a cor de quem joga
  for (const p of personagens) incluir(p.ficha.nome);
  for (const e of diario) if (e.tipo === "npc") incluir(e.titulo);
  return mapa;
}

/**
 * Cor conforme o grau do teste, vinda dos tokens do tema (--critico e --grau-* em temas.css; --sangue já existe em todos).
 * O hex depois da vírgula é só a reserva caso o token falte. Serve em `style` (color, borderColor), não em classe do Tailwind.
 * A falha crítica parte do --sangue do tema, clareado com o --grau-falha do próprio tema (sem cor fixa): o --sangue puro do
 * tema "historia" dá só 3,2:1 como texto sobre o fundo; a mistura sobe o contraste e segue mais vermelha que o coral da falha.
 */
export const COR_GRAU: Record<string, string> = {
  sucesso_critico: "var(--critico, #f5c542)",
  sucesso: "var(--grau-sucesso, #9ad4a0)",
  parcial: "var(--grau-parcial, #8fc1e3)",
  falha: "var(--grau-falha, #f28b82)",
  falha_critica: "color-mix(in srgb, var(--sangue) 55%, var(--grau-falha))",
};

/** Rótulo curto e uniforme do grau (o rótulo do sistema às vezes vem com exclamação ou jargão). */
export const NOME_GRAU: Record<string, string> = {
  sucesso_critico: "Sucesso crítico",
  sucesso: "Sucesso",
  parcial: "Sucesso parcial",
  falha: "Falha",
  falha_critica: "Falha crítica",
};

export function sinal(n: number): string {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
}
