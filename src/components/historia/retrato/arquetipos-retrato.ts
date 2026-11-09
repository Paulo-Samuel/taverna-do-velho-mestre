import { gerarRetrato, type Acessorio, type Cobertura, type EstiloBarba, type EstiloCabelo, type Expressao, type FormatoOlho, type Marca, type Roupa, type Sobrancelha, type DadosRetrato, type Rosto, type SexoRetrato } from "./dados";

// G09: retratos prontos (arquétipos) para o passo de aparência do modo história. Cada um é só um preset dos parâmetros que o
// gerador já aceita (sexo, origem, ofício sugerido, semente do rosto) mais um retoque de traços por cima do rosto gerado.
// Módulo puro (sem React): quem escolhe um arquétipo continua podendo trocar sexo, origem, rosto e ofício depois.

type Retoque = {
  rosto?: Rosto;
  sobrancelha?: Sobrancelha;
  expressao?: Expressao;
  olhos?: { formato?: FormatoOlho; cor?: string };
  cabelo?: { estilo?: EstiloCabelo; cor?: string };
  barba?: EstiloBarba;
  marca?: Marca;
  corMarca?: string;
  brinco?: boolean;
};

type Figurino = {
  cobertura: Cobertura;
  roupa: Roupa;
  corRoupa: string;
  corDetalhe: string;
  acessorio: Acessorio;
  aura?: string | null;
  fundo?: string;
};

export type Arquetipo = {
  id: string;
  nome: string;
  /** frase curta que acompanha o nome na galeria */
  resumo: string;
  sexo: SexoRetrato;
  origem: string;
  /** ofício sugerido (id de classe do sistema história); "" = deixa o jogador escolher */
  classe: string;
  /** semente do rosto; é o valor que entra em rascunho.rosto */
  rosto: string;
  retoque: Retoque;
  /** roupa, cobertura e acessório; só valem enquanto o ofício for o sugerido (ou ainda não houver ofício) */
  figurino: Figurino;
};

export const ARQUETIPOS: readonly Arquetipo[] = [
  {
    id: "guerreira-veterana",
    nome: "Guerreira veterana",
    resumo: "cicatrizes e cabelo grisalho",
    sexo: "mulher",
    origem: "humano",
    classe: "guerreiro",
    rosto: "arq:guerreira-veterana",
    retoque: { rosto: "anguloso", sobrancelha: "franzida", expressao: "serio", cabelo: { estilo: "curto", cor: "#8e8a85" }, barba: "nenhuma", marca: "cicatriz-bochecha", corMarca: "#e8e0d0", brinco: false },
    figurino: { cobertura: "nenhuma", roupa: "malha", corRoupa: "#2f3d5c", corDetalhe: "#9aa3ad", acessorio: "espada", aura: null, fundo: "#2e2a27" },
  },
  {
    id: "ladino-de-capuz",
    nome: "Ladino de capuz",
    resumo: "olhar de quem calcula a saída",
    sexo: "homem",
    origem: "humano",
    classe: "ladino",
    rosto: "arq:ladino-de-capuz",
    retoque: { rosto: "fino", sobrancelha: "reta", expressao: "desdem", olhos: { formato: "estreito" }, cabelo: { estilo: "curto", cor: "#1c1512" }, barba: "rala", marca: "nenhuma" },
    figurino: { cobertura: "capuz", roupa: "couro", corRoupa: "#262126", corDetalhe: "#8a8f96", acessorio: "adagas", aura: null, fundo: "#13302e" },
  },
  {
    id: "velho-sabio",
    nome: "Velho sábio",
    resumo: "barba longa e muitos livros",
    sexo: "homem",
    origem: "humano",
    classe: "mago",
    rosto: "arq:velho-sabio",
    retoque: { rosto: "oval", sobrancelha: "grossa", expressao: "serio", olhos: { formato: "cansado" }, cabelo: { estilo: "longo", cor: "#d9d4cb" }, barba: "longa", marca: "nenhuma", brinco: false },
    figurino: { cobertura: "chapeu-mago", roupa: "manto", corRoupa: "#2b3a7a", corDetalhe: "#d4a84a", acessorio: "cajado", aura: "#7fc8ff", fundo: "#17223b" },
  },
  {
    id: "bardo-sorridente",
    nome: "Bardo",
    resumo: "sorriso fácil e alaúde na mão",
    sexo: "mulher",
    origem: "humano",
    classe: "bardo",
    rosto: "arq:bardo-sorridente",
    retoque: { rosto: "oval", sobrancelha: "arqueada", expressao: "sorriso", olhos: { formato: "normal" }, cabelo: { estilo: "ondulado", cor: "#a65a2c" }, barba: "nenhuma", marca: "sardas", corMarca: "#8a4a2a", brinco: true },
    figurino: { cobertura: "chapeu-bardo", roupa: "tunica", corRoupa: "#8a2a4a", corDetalhe: "#e0c070", acessorio: "alaude", aura: null, fundo: "#2b1a38" },
  },
  {
    id: "cacadora",
    nome: "Caçadora",
    resumo: "olhos atentos e trança de mato",
    sexo: "mulher",
    origem: "elfo",
    classe: "cacador",
    rosto: "arq:cacadora",
    retoque: { rosto: "fino", sobrancelha: "reta", expressao: "serio", olhos: { formato: "felino" }, cabelo: { estilo: "trancas", cor: "#4a2e1b" }, barba: "nenhuma", marca: "nenhuma", brinco: false },
    figurino: { cobertura: "capuz", roupa: "couro", corRoupa: "#3d4a2a", corDetalhe: "#7a5a3a", acessorio: "arco", aura: null, fundo: "#1f2f1b" },
  },
  {
    id: "clerigo-sereno",
    nome: "Clérigo",
    resumo: "serenidade e símbolo sagrado",
    sexo: "homem",
    origem: "humano",
    classe: "clerigo",
    rosto: "arq:clerigo-sereno",
    retoque: { rosto: "redondo", sobrancelha: "arqueada", expressao: "sorriso", olhos: { formato: "normal" }, cabelo: { estilo: "raspado", cor: "#4a2e1b" }, barba: "nenhuma", marca: "nenhuma", brinco: false },
    figurino: { cobertura: "nenhuma", roupa: "batina", corRoupa: "#e8e0cc", corDetalhe: "#d4a84a", acessorio: "simbolo", aura: "#ffe9a8", fundo: "#3b2d10" },
  },
  {
    id: "nobre-decaido",
    nome: "Nobre decaído",
    resumo: "veludo gasto e orgulho intacto",
    sexo: "homem",
    origem: "humano",
    classe: "",
    rosto: "arq:nobre-decaido",
    retoque: { rosto: "anguloso", sobrancelha: "arqueada", expressao: "desdem", olhos: { formato: "cansado" }, cabelo: { estilo: "longo", cor: "#2a1d17" }, barba: "cavanhaque", marca: "cicatriz-queixo", corMarca: "#e8e0d0", brinco: true },
    figurino: { cobertura: "nenhuma", roupa: "manto", corRoupa: "#5a1f2e", corDetalhe: "#c9a44c", acessorio: "espada", aura: null, fundo: "#3d1515" },
  },
  {
    id: "mercenario-cascudo",
    nome: "Mercenário",
    resumo: "tapa-olho e contrato no bolso",
    sexo: "homem",
    origem: "meio-orc",
    classe: "mercenario",
    rosto: "arq:mercenario-cascudo",
    retoque: { rosto: "quadrado", sobrancelha: "grossa", expressao: "bravo", olhos: { formato: "estreito" }, cabelo: { estilo: "raspado", cor: "#231a14" }, barba: "rala", marca: "tapa-olho", corMarca: "#1d2b44", brinco: false },
    figurino: { cobertura: "bandana", roupa: "malha", corRoupa: "#5a2a1f", corDetalhe: "#b08d57", acessorio: "besta", aura: null, fundo: "#3c2214" },
  },
];

export function arquetipoPorId(id?: string | null): Arquetipo | null {
  return ARQUETIPOS.find((a) => a.id === id) ?? null;
}

/**
 * Aplica o retoque do arquétipo por cima de um retrato já gerado. O figurino só entra se o ofício escolhido for o do
 * arquétipo (ou se ainda não houver ofício): quem muda de ofício no passo seguinte ganha a roupa do novo ofício.
 */
export function aplicarArquetipo(dados: DadosRetrato, id?: string | null, classe?: string): DadosRetrato {
  const a = arquetipoPorId(id);
  if (!a) return dados;
  const r = a.retoque;
  const f = a.figurino;
  const comFigurino = !classe || classe === a.classe;
  return {
    ...dados,
    rosto: r.rosto ?? dados.rosto,
    sobrancelha: r.sobrancelha ?? dados.sobrancelha,
    expressao: r.expressao ?? dados.expressao,
    olhos: { ...dados.olhos, ...(r.olhos?.formato ? { formato: r.olhos.formato } : {}), ...(r.olhos?.cor ? { cor: r.olhos.cor } : {}) },
    cabelo: { estilo: r.cabelo?.estilo ?? dados.cabelo.estilo, cor: r.cabelo?.cor ?? dados.cabelo.cor },
    barba: r.barba ?? dados.barba,
    marca: r.marca ?? dados.marca,
    corMarca: r.corMarca ?? dados.corMarca,
    brinco: r.brinco ?? dados.brinco,
    ...(comFigurino
      ? { cobertura: f.cobertura, roupa: f.roupa, corRoupa: f.corRoupa, corDetalhe: f.corDetalhe, acessorio: f.acessorio, aura: f.aura === undefined ? dados.aura : f.aura, fundo: f.fundo ?? dados.fundo }
      : {}),
  };
}

/** Retrato completo de um arquétipo (para a miniatura da galeria e para o teste). */
export function retratoDoArquetipo(a: Arquetipo, classe?: string): DadosRetrato {
  return aplicarArquetipo(gerarRetrato(a.rosto, { sexo: a.sexo, origem: a.origem, classe: classe ?? (a.classe || undefined) }), a.id, classe ?? a.classe);
}
