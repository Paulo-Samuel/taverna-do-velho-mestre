import { COR_VALIDA } from "./cores";

// O que define um retrato: tudo que o pincel precisa, salvo em ficha.extras.retrato. Módulo puro (sem React e sem
// "use client") para o servidor também poder gerar e conferir retratos na hora de criar o personagem.

export const SEXOS = ["homem", "mulher", "outro"] as const;
export const ROSTOS = ["oval", "quadrado", "fino", "redondo", "anguloso"] as const;
export const NARIZES = ["reto", "adunco", "largo", "pequeno"] as const;
export const FORMATOS_OLHO = ["normal", "estreito", "arregalado", "cansado", "felino"] as const;
export const SOBRANCELHAS = ["reta", "arqueada", "grossa", "franzida"] as const;
export const EXPRESSOES = ["serio", "sorriso", "desdem", "bravo"] as const;
export const CABELOS = ["careca", "raspado", "curto", "longo", "ondulado", "trancas", "coque", "rabo", "moicano", "desgrenhado"] as const;
export const BARBAS = ["nenhuma", "rala", "bigode", "cavanhaque", "cheia", "longa", "costeletas"] as const;
export const ORELHAS = ["humana", "pontuda", "pontinha"] as const;
export const CHIFRES = ["nenhum", "curvos", "carneiro", "retos"] as const;
export const MARCAS = ["nenhuma", "cicatriz-olho", "cicatriz-bochecha", "cicatriz-queixo", "runas", "pintura-guerra", "sardas", "tapa-olho", "sigilo"] as const;
export const COBERTURAS = ["nenhuma", "capuz", "elmo", "elmo-chifres", "chapeu-mago", "chapeu-bardo", "chapeu-aba", "coroa-ossos", "tiara", "bandana"] as const;
export const ROUPAS = ["tunica", "couro", "armadura", "malha", "manto", "pele", "batina"] as const;
export const ACESSORIOS = ["nenhum", "espada", "machado", "arco", "cajado", "cranio", "alaude", "simbolo", "escudo", "adagas", "besta", "grimorio", "foice"] as const;

export type SexoRetrato = (typeof SEXOS)[number];
export type Rosto = (typeof ROSTOS)[number];
export type Nariz = (typeof NARIZES)[number];
export type FormatoOlho = (typeof FORMATOS_OLHO)[number];
export type Sobrancelha = (typeof SOBRANCELHAS)[number];
export type Expressao = (typeof EXPRESSOES)[number];
export type EstiloCabelo = (typeof CABELOS)[number];
export type EstiloBarba = (typeof BARBAS)[number];
export type Orelhas = (typeof ORELHAS)[number];
export type Chifres = (typeof CHIFRES)[number];
export type Marca = (typeof MARCAS)[number];
export type Cobertura = (typeof COBERTURAS)[number];
export type Roupa = (typeof ROUPAS)[number];
export type Acessorio = (typeof ACESSORIOS)[number];

/** Retrato salvo em ficha.extras.retrato. Cores sempre em #rrggbb. */
export type DadosRetrato = {
  v: 1;
  sexo: SexoRetrato;
  origem: string;
  classe: string;
  pele: string;
  rosto: Rosto;
  nariz: Nariz;
  olhos: { cor: string; formato: FormatoOlho; brilham: boolean };
  sobrancelha: Sobrancelha;
  expressao: Expressao;
  cabelo: { estilo: EstiloCabelo; cor: string };
  barba: EstiloBarba;
  orelhas: Orelhas;
  chifres: Chifres;
  presas: boolean;
  marca: Marca;
  corMarca: string;
  cobertura: Cobertura;
  roupa: Roupa;
  corRoupa: string;
  corDetalhe: string;
  acessorio: Acessorio;
  fundo: string;
  /** brilho mágico (cajado, crânio, sigilo); null = nenhum */
  aura: string | null;
  brinco: boolean;
};

// ---------- sorte determinística ----------

function hash(texto: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

export type Sorte = {
  n(): number;
  um<T>(lista: readonly T[]): T;
  peso<T extends string>(pesos: Partial<Record<T, number>>): T;
  chance(p: number): boolean;
};

/** Gerador mulberry32 semeado por texto: a mesma semente dá sempre a mesma sequência. */
export function sorte(semente: string): Sorte {
  let a = hash(semente);
  const n = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    n,
    um: (lista) => lista[Math.floor(n() * lista.length) % lista.length],
    peso(pesos) {
      const itens = Object.entries(pesos) as [string, number][];
      const total = itens.reduce((s, [, p]) => s + p, 0);
      let r = n() * total;
      for (const [k, p] of itens) {
        r -= p;
        if (r < 0) return k as never;
      }
      return itens[itens.length - 1][0] as never;
    },
    chance: (p) => n() < p,
  };
}

// ---------- normalização das entradas ----------

function semAcento(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizarSexo(sexo?: string): SexoRetrato | null {
  if (!sexo) return null;
  const s = semAcento(sexo);
  if (/^(homem|masc|male|h$|m$)/.test(s)) return "homem";
  if (/^(mulher|fem|female|f$)/.test(s)) return "mulher";
  return "outro";
}

export const ORIGENS_RETRATO = ["humano", "elfo", "anao", "meio-orc", "halfling", "tiefling"] as const;

export function normalizarOrigem(origem?: string): string | null {
  if (!origem) return null;
  const o = semAcento(origem).replace(/\s+/g, "-");
  if (/elf/.test(o)) return "elfo";
  if (/ana|dwar/.test(o)) return "anao";
  if (/orc/.test(o)) return "meio-orc";
  if (/half|pequen/.test(o)) return "halfling";
  if (/tief|infern|demon/.test(o)) return "tiefling";
  if (/human/.test(o)) return "humano";
  return "humano";
}

export const CLASSES_RETRATO = ["guerreiro", "ladino", "mago", "cacador", "bardo", "clerigo", "barbaro", "necromante", "paladino", "mercenario"] as const;

/** Traduz classes de qualquer sistema para o figurino mais parecido (ou "aldeao", que não tem figurino nenhum). */
export function figurinoDaClasse(classe?: string): string {
  if (!classe) return "aldeao";
  const c = semAcento(classe);
  if ((CLASSES_RETRATO as readonly string[]).includes(c)) return c;
  if (/palad|campe|champion|cavaleir|knight/.test(c)) return "paladino";
  if (/barbar/.test(c)) return "barbaro";
  if (/necro|bruxo|warlock|ocult|lich/.test(c)) return "necromante";
  if (/mago|wizard|feitic|sorcer|arcan|magus|invoc|alquim/.test(c)) return "mago";
  if (/cler|cleric|sacerd|priest|druid|orac|monge|monk/.test(c)) return "clerigo";
  if (/bard|skald|menestr/.test(c)) return "bardo";
  if (/caca|ranger|patrulh|batedor|hunter|explor/.test(c)) return "cacador";
  if (/ladin|rogue|ladr|thief|assass|gatun|espi/.test(c)) return "ladino";
  if (/merc|pistol|gunsl|soldad|veter/.test(c)) return "mercenario";
  if (/guerr|fighter|lutad|gladi|warrior|combat/.test(c)) return "guerreiro";
  return "aldeao";
}

// ---------- paletas ----------

const PELES: Record<string, string[]> = {
  humano: ["#f3d3b5", "#eabf98", "#dba477", "#c98c5a", "#b07447", "#925b33", "#734424", "#53301a"],
  elfo: ["#f6e4d2", "#efd6bc", "#e3c5a6", "#d4b393", "#cfd6c9", "#b9a28e", "#8c7b98", "#5f566e"],
  anao: ["#ecc4a4", "#dfa985", "#cb8d68", "#ad7452", "#8b5b3f"],
  "meio-orc": ["#93a87a", "#7f9766", "#6f8b60", "#9ca58c", "#7e8b70", "#a7a27c", "#687a5c"],
  halfling: ["#f4d6b8", "#ecc19a", "#d9a87e", "#c18d62", "#9e6c45"],
  tiefling: ["#c4544f", "#a43e3e", "#934266", "#713f74", "#544d80", "#b8685c", "#d38c86", "#7d3232"],
};

const CABELOS_NATURAIS = ["#1c1512", "#2e1d14", "#4a2e1b", "#6b4224", "#8a3b1c", "#a65a2c", "#c49a5e", "#dcc28c", "#8e8a85", "#d9d4cb"];
const CABELOS_ORIGEM: Record<string, string[]> = {
  humano: CABELOS_NATURAIS,
  elfo: ["#ece5d4", "#d9c48f", "#b8bfc9", "#1b2233", "#2a1d17", "#a24d2a", "#c9b27a", "#e4e0f0"],
  anao: ["#7a2e16", "#a24a22", "#4a2e1b", "#2e1d14", "#8e8a85", "#c9c4bb", "#b77a3a"],
  "meio-orc": ["#141210", "#231a14", "#3a2618", "#55473a", "#8e8a85"],
  halfling: ["#4a2e1b", "#6b4224", "#8a5a2c", "#a65a2c", "#c49a5e", "#2e1d14"],
  tiefling: ["#16121c", "#2b1d3a", "#3d1a2a", "#1a1a2e", "#5a1f2e", "#d9d4cb", "#4b2a6b"],
};

const OLHOS_ORIGEM: Record<string, string[]> = {
  humano: ["#5a3a1e", "#5a3a1e", "#8a6a3a", "#4f7a4a", "#4a6f9a", "#7c8790", "#3a2616"],
  elfo: ["#6fae7a", "#8a6fbf", "#8fb7d4", "#c9a23a", "#4a8a9a", "#b6c6d6"],
  anao: ["#5a3a1e", "#3a2616", "#4a6f9a", "#7c8790", "#8a6a3a"],
  "meio-orc": ["#b07a2a", "#a8402a", "#5a3a1e", "#c9a23a", "#3a2616"],
  halfling: ["#5a3a1e", "#8a6a3a", "#4f7a4a", "#4a6f9a"],
  tiefling: ["#f2c14e", "#e04a3a", "#f08a2a", "#d8e0ff", "#b06aff"],
};

const FUNDOS = {
  ambar: "#3c2214",
  sangue: "#3d1515",
  musgo: "#1f2f1b",
  noite: "#17223b",
  roxo: "#2b1a38",
  petroleo: "#13302e",
  pedra: "#2e2a27",
  ouro: "#3b2d10",
};
type Fundo = keyof typeof FUNDOS;

type Figurino = {
  roupas: Partial<Record<Roupa, number>>;
  coberturas: Partial<Record<Cobertura, number>>;
  acessorios: Partial<Record<Acessorio, number>>;
  coresRoupa: string[];
  detalhes: string[];
  fundos: Partial<Record<Fundo, number>>;
  aura?: string[];
};

const FIGURINOS: Record<string, Figurino> = {
  guerreiro: {
    roupas: { armadura: 3, malha: 3, couro: 1 },
    coberturas: { nenhuma: 5, elmo: 3, bandana: 1 },
    acessorios: { espada: 4, escudo: 3, machado: 1 },
    coresRoupa: ["#6b1f1f", "#2f3d5c", "#3d4a2a", "#4a3b2a", "#5a4a20"],
    detalhes: ["#b08d57", "#9aa3ad", "#c9a44c"],
    fundos: { sangue: 3, pedra: 2, ambar: 2, noite: 1 },
  },
  ladino: {
    roupas: { couro: 5, tunica: 1 },
    coberturas: { capuz: 5, nenhuma: 3, bandana: 2 },
    acessorios: { adagas: 5, nenhum: 1, besta: 1 },
    coresRoupa: ["#262126", "#2a2f2a", "#3b1f1f", "#1f2633", "#33291f"],
    detalhes: ["#8a8f96", "#a08a60", "#6b5a44"],
    fundos: { pedra: 3, petroleo: 2, noite: 2, roxo: 1 },
  },
  mago: {
    roupas: { manto: 1 },
    coberturas: { "chapeu-mago": 5, nenhuma: 3, capuz: 1 },
    acessorios: { cajado: 5, grimorio: 3 },
    coresRoupa: ["#2b3a7a", "#4b2a6b", "#6b1f2f", "#1f4a4a", "#3a3a44", "#2a2a5a"],
    detalhes: ["#d4a84a", "#c9ccd1", "#e0c070"],
    fundos: { noite: 4, roxo: 3, petroleo: 1 },
    aura: ["#7fc8ff", "#b48cff", "#7fffe0", "#ffd27f"],
  },
  cacador: {
    roupas: { couro: 4, tunica: 1 },
    coberturas: { capuz: 4, nenhuma: 4, "chapeu-aba": 2 },
    acessorios: { arco: 1 },
    coresRoupa: ["#3d4a2a", "#4a3f26", "#2f3b2a", "#5a4a32"],
    detalhes: ["#7a5a3a", "#a08a60", "#8a8f96"],
    fundos: { musgo: 5, petroleo: 2, ambar: 1 },
  },
  bardo: {
    roupas: { tunica: 1 },
    coberturas: { "chapeu-bardo": 6, nenhuma: 3 },
    acessorios: { alaude: 1 },
    coresRoupa: ["#8a2a4a", "#2a5a8a", "#b06a1a", "#6a2a8a", "#2a7a5a", "#9a2a2a"],
    detalhes: ["#e0c070", "#efe2c4", "#d4a84a"],
    fundos: { roxo: 3, sangue: 2, ambar: 3, noite: 1 },
  },
  clerigo: {
    roupas: { batina: 1 },
    coberturas: { nenhuma: 5, tiara: 3, capuz: 1 },
    acessorios: { simbolo: 4, escudo: 1 },
    coresRoupa: ["#e8e0cc", "#e8e0cc", "#7a1f1f", "#2a3a6a", "#4a4a4a"],
    detalhes: ["#d4a84a", "#e0c070"],
    fundos: { ouro: 4, ambar: 3, noite: 1 },
    aura: ["#ffe9a8", "#fff3cf"],
  },
  barbaro: {
    roupas: { pele: 1 },
    coberturas: { nenhuma: 6, "elmo-chifres": 2 },
    acessorios: { machado: 5, nenhum: 1 },
    coresRoupa: ["#5a4430", "#6e6458", "#3e3128", "#8a7a66", "#2e2620"],
    detalhes: ["#6b4a2a", "#8a6a3a"],
    fundos: { sangue: 4, pedra: 2, ambar: 2 },
  },
  necromante: {
    roupas: { manto: 1 },
    coberturas: { capuz: 4, "coroa-ossos": 3, nenhuma: 2 },
    acessorios: { cranio: 5, foice: 2, grimorio: 1 },
    coresRoupa: ["#16161c", "#22182a", "#18221e", "#2a1a1a"],
    detalhes: ["#d8cfb8", "#9aa38a", "#b5a888"],
    fundos: { musgo: 3, roxo: 3, pedra: 1 },
    aura: ["#7fe08a", "#a4ff9a", "#9ad8ff", "#c88aff"],
  },
  paladino: {
    roupas: { armadura: 1 },
    coberturas: { nenhuma: 5, elmo: 2, tiara: 1 },
    acessorios: { escudo: 3, simbolo: 2, espada: 2 },
    coresRoupa: ["#e6dcc4", "#2a4a8a", "#8a1f1f", "#1f4a3a"],
    detalhes: ["#d4a84a", "#e0c070"],
    fundos: { ouro: 4, noite: 3, ambar: 1 },
    aura: ["#ffe9a8"],
  },
  mercenario: {
    roupas: { malha: 3, couro: 3 },
    coberturas: { nenhuma: 5, bandana: 2, "chapeu-aba": 2 },
    acessorios: { besta: 4, espada: 2, adagas: 1 },
    coresRoupa: ["#4a3a2a", "#3a3f45", "#5a2a1f", "#3f3a2a"],
    detalhes: ["#b08d57", "#c9a44c", "#8a8f96"],
    fundos: { pedra: 3, ambar: 3, sangue: 2 },
  },
  aldeao: {
    roupas: { tunica: 1 },
    coberturas: { nenhuma: 1 },
    acessorios: { nenhum: 1 },
    coresRoupa: ["#5a4a3a", "#4a5040", "#3f4652", "#6a5a44", "#5a3a3a"],
    detalhes: ["#a08a60", "#8a7a5a"],
    fundos: { ambar: 3, pedra: 2, musgo: 1, noite: 1, roxo: 1, petroleo: 1, sangue: 1 },
  },
};

// ---------- gerador ----------

type Base = { sexo?: string; origem?: string; classe?: string };

/**
 * Retrato determinístico: a mesma semente e a mesma base dão sempre o mesmo rosto.
 * O rosto vem de uma sequência e o figurino de outra, então trocar a classe veste a mesma cara com outra roupa.
 */
export function gerarRetrato(semente: string, base: Base = {}): DadosRetrato {
  const geral = sorte(`${semente}|base`);
  const sexo = normalizarSexo(base.sexo) ?? geral.peso<SexoRetrato>({ homem: 46, mulher: 46, outro: 8 });
  const origem = normalizarOrigem(base.origem) ?? geral.peso({ humano: 40, elfo: 14, anao: 12, "meio-orc": 11, halfling: 11, tiefling: 12 });
  const figurino = figurinoDaClasse(base.classe);
  const classe = base.classe ?? figurino;

  // ---- rosto: depende só da semente, do sexo e da origem ----
  const r = sorte(`${semente}|rosto|${sexo}|${origem}`);
  const homem = sexo === "homem";
  const mulher = sexo === "mulher";

  const pele = r.um(PELES[origem] ?? PELES.humano);

  const rosto = r.peso<Rosto>(
    origem === "anao"
      ? { quadrado: 4, redondo: 3, oval: 1 }
      : origem === "elfo"
        ? { fino: 4, anguloso: 3, oval: 2 }
        : origem === "meio-orc"
          ? { quadrado: 5, anguloso: 2, oval: 1 }
          : origem === "halfling"
            ? { redondo: 5, oval: 3 }
            : mulher
              ? { oval: 4, fino: 3, anguloso: 2, redondo: 2, quadrado: 1 }
              : homem
                ? { quadrado: 4, oval: 3, anguloso: 3, fino: 1, redondo: 1 }
                : { oval: 3, anguloso: 3, fino: 2, quadrado: 2, redondo: 1 },
  );

  const nariz = r.peso<Nariz>(
    origem === "anao" || origem === "meio-orc"
      ? { largo: 4, adunco: 3, reto: 1 }
      : origem === "elfo" || origem === "halfling"
        ? { pequeno: 4, reto: 3 }
        : mulher
          ? { pequeno: 4, reto: 4, adunco: 1 }
          : { reto: 4, adunco: 3, largo: 2, pequeno: 1 },
  );

  const tiefling = origem === "tiefling";
  const olhos = {
    cor: r.um(OLHOS_ORIGEM[origem] ?? OLHOS_ORIGEM.humano),
    formato: r.peso<FormatoOlho>(
      origem === "elfo" ? { felino: 5, normal: 2, estreito: 1 } : { normal: 5, estreito: 2, cansado: 2, arregalado: 1, felino: tiefling ? 3 : 0.3 },
    ),
    brilham: tiefling ? r.chance(0.75) : false,
  };

  const sobrancelha = r.peso<Sobrancelha>(
    mulher ? { arqueada: 5, reta: 3, franzida: 1 } : origem === "anao" || origem === "meio-orc" ? { grossa: 5, franzida: 3 } : { reta: 3, grossa: 3, franzida: 2, arqueada: 1 },
  );
  const expressao = r.peso<Expressao>({ serio: 4, sorriso: 3, desdem: 3, bravo: origem === "meio-orc" ? 3 : 1.5 });

  const corCabelo = r.um(CABELOS_ORIGEM[origem] ?? CABELOS_NATURAIS);
  const estiloCabelo = r.peso<EstiloCabelo>(
    mulher
      ? origem === "elfo"
        ? { longo: 6, trancas: 2, coque: 1, ondulado: 1 }
        : { longo: 4, ondulado: 4, trancas: 3, coque: 2, rabo: 3, curto: 1.5, raspado: 0.4, moicano: 0.3, desgrenhado: 0.6 }
      : homem
        ? origem === "elfo"
          ? { longo: 6, rabo: 2, curto: 1 }
          : origem === "anao"
            ? { careca: 3, curto: 2, longo: 2, desgrenhado: 1, rabo: 1 }
            : origem === "meio-orc"
              ? { moicano: 3, raspado: 2, careca: 2, rabo: 2, desgrenhado: 2, longo: 1 }
              : { curto: 4, raspado: 2, careca: 1.5, longo: 2, rabo: 1.5, ondulado: 1.5, moicano: 0.6, desgrenhado: 1.2 }
        : { curto: 3, raspado: 2, longo: 2, ondulado: 2, rabo: 2, moicano: 1, trancas: 1, coque: 1, careca: 0.5, desgrenhado: 1 },
  );

  let barba: EstiloBarba = "nenhuma";
  const chanceBarba = homem
    ? { anao: 0.98, elfo: 0.08, halfling: 0.35, tiefling: 0.5, "meio-orc": 0.45, humano: 0.65 }[origem] ?? 0.6
    : sexo === "outro"
      ? origem === "anao" ? 0.6 : 0.15
      : origem === "anao" ? 0.12 : 0;
  if (r.chance(chanceBarba)) {
    barba = r.peso<EstiloBarba>(
      origem === "anao"
        ? { longa: 6, cheia: 3 }
        : origem === "halfling"
          ? { costeletas: 5, rala: 1 }
          : { rala: 3, bigode: 2, cavanhaque: 2.5, cheia: 3, longa: 0.6, costeletas: 0.6 },
    );
  }

  const orelhas: Orelhas = origem === "elfo" ? "pontuda" : origem === "humano" || origem === "anao" ? "humana" : "pontinha";
  const chifres: Chifres = tiefling ? r.peso<Chifres>({ curvos: 4, carneiro: 3, retos: 2 }) : "nenhum";
  const presas = origem === "meio-orc" && r.chance(0.85);

  let marca = r.peso<Marca>({
    nenhuma: 10,
    "cicatriz-olho": 1.2,
    "cicatriz-bochecha": 1.5,
    "cicatriz-queixo": 1,
    runas: 0.8,
    "pintura-guerra": origem === "meio-orc" ? 1.5 : 0.4,
    sardas: origem === "halfling" || origem === "humano" ? 2 : 0.5,
    "tapa-olho": 0.4,
  });
  let corMarca = r.um(["#2a3f6e", "#1d2b44", "#6b1f1f", "#e8e0d0", "#3b6a8a"]);
  const brinco = r.chance(mulher ? 0.45 : 0.18);

  // ---- figurino: depende da semente e da classe ----
  const f = FIGURINOS[figurino] ?? FIGURINOS.aldeao;
  const s = sorte(`${semente}|figurino|${figurino}`);
  const roupa = s.peso(f.roupas);
  let cobertura = s.peso(f.coberturas);
  // anão e elmo de chifre só se a barba aguentar; cabelo comprido com elmo some de qualquer jeito
  if (cobertura === "elmo-chifres" && origem === "halfling") cobertura = "nenhuma";
  const acessorio = s.peso(f.acessorios);

  if (figurino === "barbaro" && marca === "nenhuma" && s.chance(0.55)) {
    marca = "pintura-guerra";
    corMarca = s.um(["#2a3f6e", "#8a1f1f", "#e8e0d0"]);
  }
  if ((figurino === "necromante" || figurino === "mago") && marca === "nenhuma" && s.chance(0.25)) {
    marca = figurino === "necromante" ? "runas" : "sigilo";
    corMarca = figurino === "necromante" ? "#1d2b44" : "#7fc8ff";
  }
  if (marca === "sigilo") corMarca = f.aura?.[0] ?? "#7fc8ff";

  const fundo = FUNDOS[s.peso(f.fundos)];
  const aura = f.aura ? s.um(f.aura) : null;

  return {
    v: 1,
    sexo,
    origem,
    classe,
    pele,
    rosto,
    nariz,
    olhos,
    sobrancelha,
    expressao,
    cabelo: { estilo: estiloCabelo, cor: corCabelo },
    barba,
    orelhas,
    chifres,
    presas,
    marca,
    corMarca,
    cobertura,
    roupa,
    corRoupa: s.um(f.coresRoupa),
    corDetalhe: s.um(f.detalhes),
    acessorio,
    fundo,
    aura,
    brinco,
  };
}

// ---------- conferência (dados vindos do cliente ou do banco) ----------

function de<T extends string>(lista: readonly T[], valor: unknown, padrao: T): T {
  return typeof valor === "string" && (lista as readonly string[]).includes(valor) ? (valor as T) : padrao;
}

function cor(valor: unknown, padrao: string): string {
  return typeof valor === "string" && COR_VALIDA.test(valor) ? valor.toLowerCase() : padrao;
}

function texto(valor: unknown, padrao: string): string {
  return typeof valor === "string" ? valor.slice(0, 40) : padrao;
}

/** Aceita qualquer coisa e devolve um retrato válido (ou null se nem parece um retrato). Campos ruins viram o padrão. */
export function normalizarRetrato(x: unknown): DadosRetrato | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.pele !== "string" || typeof o.rosto !== "string") return null;
  const olhos = (o.olhos && typeof o.olhos === "object" ? o.olhos : {}) as Record<string, unknown>;
  const cabelo = (o.cabelo && typeof o.cabelo === "object" ? o.cabelo : {}) as Record<string, unknown>;
  return {
    v: 1,
    sexo: de(SEXOS, o.sexo, "outro"),
    origem: texto(o.origem, "humano"),
    classe: texto(o.classe, "aldeao"),
    pele: cor(o.pele, "#dba477"),
    rosto: de(ROSTOS, o.rosto, "oval"),
    nariz: de(NARIZES, o.nariz, "reto"),
    olhos: { cor: cor(olhos.cor, "#5a3a1e"), formato: de(FORMATOS_OLHO, olhos.formato, "normal"), brilham: olhos.brilham === true },
    sobrancelha: de(SOBRANCELHAS, o.sobrancelha, "reta"),
    expressao: de(EXPRESSOES, o.expressao, "serio"),
    cabelo: { estilo: de(CABELOS, cabelo.estilo, "curto"), cor: cor(cabelo.cor, "#2e1d14") },
    barba: de(BARBAS, o.barba, "nenhuma"),
    orelhas: de(ORELHAS, o.orelhas, "humana"),
    chifres: de(CHIFRES, o.chifres, "nenhum"),
    presas: o.presas === true,
    marca: de(MARCAS, o.marca, "nenhuma"),
    corMarca: cor(o.corMarca, "#2a3f6e"),
    cobertura: de(COBERTURAS, o.cobertura, "nenhuma"),
    roupa: de(ROUPAS, o.roupa, "tunica"),
    corRoupa: cor(o.corRoupa, "#5a4a3a"),
    corDetalhe: cor(o.corDetalhe, "#a08a60"),
    acessorio: de(ACESSORIOS, o.acessorio, "nenhum"),
    fundo: cor(o.fundo, FUNDOS.ambar),
    aura: o.aura === null || o.aura === undefined ? null : cor(o.aura, "#7fc8ff"),
    brinco: o.brinco === true,
  };
}
