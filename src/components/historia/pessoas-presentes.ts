import type { Mensagem } from "@/lib/db";
import type { EntradaDiario } from "@/lib/sistemas/tipos";
import { normalizarAtitude, type Atitude } from "@/lib/atitude-npc";
import { agruparTurnos } from "../leitor/turnos";

// G02 "Pessoas por aqui": quem está na cena atual. Puro (sem React): a tela só desenha o que sai daqui.
// Presença = NPC do diário (não morto) cujo nome, ou primeiro nome, aparece no texto da narração da cena atual.

/** Tira acentos e caixa para comparar nomes. */
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const TITULOS = new Set(
  "o a os as um uma de do da dos das e sir dona dom seu senhor senhora mestre mestra velho velha irmao irma padre frei madre capitao lorde lady rei rainha principe princesa tio tia vovo pai mae doutor sargento cabo soldado guarda".split(
    " ",
  ),
);

/** Primeiro nome "de verdade" (sem título/artigo), normalizado; null se o título é uma palavra só ou não tem palavra útil de 4+ letras. */
function primeiroNome(titulo: string): string | null {
  const palavras = norm(titulo)
    .split(/[\s,]+/)
    .map((p) => p.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter(Boolean);
  const util = palavras.find((p) => p.length >= 4 && !TITULOS.has(p));
  return util && util !== palavras.join(" ") ? util : null;
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Posição da primeira ocorrência de `nome` como palavra inteira em `texto` (ambos já normalizados), ou -1. */
function posicao(texto: string, nome: string): number {
  if (!nome) return -1;
  const m = new RegExp(`(?<![\\p{L}\\p{N}])${escapar(nome)}(?![\\p{L}\\p{N}])`, "u").exec(texto);
  return m ? m.index : -1;
}

/** Tira os apartes ((fora do jogo)) do mestre: não são ficção. */
const semApartes = (t: string) => t.replace(/\(\([\s\S]*?\)\)/g, " ");

/** Texto da cena atual: as narrações do mestre do último turno que tem narração, mais o que está sendo escrito agora. */
export function textoDaCenaAtual(mensagens: Mensagem[], aoVivo = ""): string {
  const turno = agruparTurnos(mensagens).findLast((t) => t.itens.some((m) => m.tipo === "mestre"));
  const narrado = turno ? turno.itens.filter((m) => m.tipo === "mestre").map((m) => m.texto) : [];
  return semApartes([...narrado, aoVivo].join("\n"));
}

export type PessoaPresente = { id: number; titulo: string; entrada: EntradaDiario; atitude: Atitude | null };

/** NPCs do diário presentes no texto da cena, na ordem em que aparecem. Morto não conta. Sem ninguém → []. */
export function pessoasPresentes(diario: EntradaDiario[], textoCena: string): PessoaPresente[] {
  const texto = norm(textoCena);
  if (!texto.trim()) return [];
  const npcs = diario.filter((e) => e.tipo === "npc" && e.status !== "morto" && e.titulo.trim());
  // primeiro nome só vale sozinho quando é de uma pessoa só (dois "Maria" pedem o nome completo)
  const contagem = new Map<string, number>();
  for (const e of diario) {
    if (e.tipo !== "npc") continue;
    const p = primeiroNome(e.titulo);
    if (p) contagem.set(p, (contagem.get(p) ?? 0) + 1);
  }
  const achadas: { pos: number; p: PessoaPresente }[] = [];
  for (const e of npcs) {
    const completo = posicao(texto, norm(e.titulo).trim());
    const primeiro = primeiroNome(e.titulo);
    const parcial = primeiro && contagem.get(primeiro) === 1 ? posicao(texto, primeiro) : -1;
    const pos = [completo, parcial].filter((n) => n >= 0).sort((a, b) => a - b)[0];
    if (pos === undefined) continue;
    achadas.push({ pos, p: { id: e.id, titulo: e.titulo, entrada: e, atitude: normalizarAtitude(e.dados?.atitude) } });
  }
  return achadas.sort((a, b) => a.pos - b.pos).map((x) => x.p);
}

/**
 * Etiqueta de humor: a classe de matiz (temas.css) que a tela junta com `etiqueta-matiz`; a cor vem dos tokens do tema.
 * Classes escritas por extenso (o Tailwind só enxerga texto literal). Neutro não tem matiz: usa a `etiqueta` comum.
 */
export const MATIZ_ATITUDE: Record<Atitude, string> = {
  amistoso: "matiz-2",
  curioso: "matiz-1",
  desconfiado: "matiz-7",
  hostil: "matiz-4",
  devoto: "matiz-5",
  medo: "matiz-6",
  apaixonado: "matiz-8",
  neutro: "",
};

/** Razão de contraste WCAG entre duas cores #rrggbb. */
export function contraste(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
