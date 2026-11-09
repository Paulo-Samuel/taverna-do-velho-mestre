// Tipo de teste de uma ação sugerida (G03): rótulo e cor próprios para "sem rolagem", social, físico, mental e sorte.
// Módulo puro (sem React). A sugestão só carrega `pericia` (texto livre do mestre, até 40 letras); o tipo é inferido dela e
// SÓ quando bate com uma perícia/atributo conhecido. Sem perícia, ou perícia desconhecida, devolve null (a UI mostra só o texto).

export type TipoTeste = "semrolagem" | "social" | "fisico" | "mental" | "sorte";

export type InfoTipoTeste = { tipo: TipoTeste; rotulo: string; classe: string };

// Cores: texto claro sobre o fundo escuro de todos os temas (fundos de #070c1c a #221112; superfície das sugestões é translúcida).
// Contraste calculado contra o pior caso (#221112 / #22140d), todos acima de 4,5:1.
const CLASSES: Record<TipoTeste, string> = {
  semrolagem: "border-[#a8a29e]/45 bg-[#a8a29e]/10 text-[#d6d3d1]", // cinza
  social: "border-[#f9a8d4]/50 bg-[#f9a8d4]/10 text-[#fbcfe8]", // rosa
  fisico: "border-[#fb923c]/50 bg-[#fb923c]/10 text-[#fdba74]", // laranja
  mental: "border-[#7dd3fc]/50 bg-[#7dd3fc]/10 text-[#bae6fd]", // azul
  sorte: "border-[#86efac]/50 bg-[#86efac]/10 text-[#bbf7d0]", // verde
};

const ROTULO_TIPO: Record<TipoTeste, string> = {
  semrolagem: "Sem rolagem",
  social: "Social",
  fisico: "Físico",
  mental: "Mental",
  sorte: "Sorte",
};

// Raízes (sem acento, minúsculas) casadas no início de cada palavra da perícia. Ordem importa: o primeiro tipo que casa vence.
const RAIZES: [TipoTeste, string[]][] = [
  ["semrolagem", ["sem rolagem", "sem teste", "sem rolar", "nenhum", "nenhuma", "automatic"]],
  ["sorte", ["sorte", "fortuna", "acaso", "azar", "luck", "destino"]],
  [
    "social",
    ["persuas", "intimida", "engana", "atuac", "labia", "charme", "lideranc", "manipula", "etiqueta", "carisma", "barganh", "seduc", "negoci", "diplomac", "blefe", "fascin", "presenca", "empatia", "convenc", "performance", "social", "persuasion", "deception", "intimidat"],
  ],
  [
    "fisico",
    ["atletism", "acrobac", "furtiv", "luta", "briga", "arma", "forca", "destreza", "vigor", "constitu", "agilidade", "pontaria", "tiro", "esquiv", "escalar", "nadar", "saltar", "prestidig", "ladin", "montaria", "cavalgar", "dirigir", "pilotar", "resistencia", "combate", "fisico", "athletics", "acrobatics", "stealth"],
  ],
  [
    "mental",
    ["investiga", "percep", "arcan", "historia", "natureza", "religi", "medicin", "sobreviv", "ocult", "conhecimento", "intuic", "sabedoria", "inteligencia", "ciencia", "tecnologia", "pesquisa", "biblioteca", "lembrar", "rastrear", "navegac", "vontade", "sanidade", "mental", "psicolog", "informatica", "eletronica", "mecanica", "investigation", "perception", "insight"],
  ],
];

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Tipo de teste de uma perícia/atributo escrito pelo mestre; null quando não dá para saber (nunca inventa). */
export function tipoDoTeste(pericia?: string | null): InfoTipoTeste | null {
  if (!pericia) return null;
  const t = normalizar(pericia);
  if (!t) return null;
  const palavras = t.split(/[^a-z0-9]+/).filter(Boolean);
  for (const [tipo, raizes] of RAIZES) {
    const casa = raizes.some((r) => (r.includes(" ") ? t.startsWith(r) : palavras.some((p) => p.startsWith(r))));
    if (casa) return { tipo, rotulo: ROTULO_TIPO[tipo], classe: CLASSES[tipo] };
  }
  return null;
}

/** Texto do rótulo para leitor de tela: "Persuasão, teste social". */
export function descricaoDoTeste(pericia: string, info: InfoTipoTeste | null): string {
  if (!info) return pericia;
  if (info.tipo === "semrolagem") return "sem rolagem";
  return `${pericia}, teste ${info.rotulo.toLowerCase()}`;
}
