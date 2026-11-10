// Tipo de teste de uma ação sugerida (G03): rótulo e cor próprios para "sem rolagem", social, físico, mental e sorte.
// Módulo puro (sem React). A sugestão só carrega `pericia` (texto livre do mestre, até 40 letras); o tipo é inferido dela e
// SÓ quando bate com uma perícia/atributo conhecido. Sem perícia, ou perícia desconhecida, devolve null (a UI mostra só o texto).

export type TipoTeste = "semrolagem" | "social" | "fisico" | "mental" | "sorte";

export type InfoTipoTeste = { tipo: TipoTeste; rotulo: string; classe: string };

// Cores: as plaquinhas dos matizes do tema (etiqueta-matiz + matiz-N, em globals.css e temas.css). O contraste de cada matiz
// sobre as superfícies de todos os temas é garantido por tests/matizes.test.ts; "sem rolagem" usa a etiqueta neutra.
// Strings literais (sem montar o nome da classe): o Tailwind só enxerga a classe escrita por inteiro.
const CLASSES: Record<TipoTeste, string> = {
  semrolagem: "etiqueta",
  social: "etiqueta-matiz matiz-8",
  fisico: "etiqueta-matiz matiz-3",
  mental: "etiqueta-matiz matiz-1",
  sorte: "etiqueta-matiz matiz-2",
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
