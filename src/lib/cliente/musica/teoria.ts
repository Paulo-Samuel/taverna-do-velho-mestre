import type { HumorMusical } from "@/lib/sistemas/tipos";

// Teoria e composição da trilha: escalas, uma "receita" por humor e o compositor que gera um compasso por vez.
// Puro (sem Web Audio e sem imports de runtime): o motor só agenda o que sai daqui. Dá para testar no Node.

export type Energia = "baixa" | "media" | "alta";

export type Instrumento =
  | "alaude" // corda dedilhada (Karplus-Strong), brilhante e curta
  | "harpa" // corda dedilhada mais longa e redonda
  | "sino"
  | "copo" // tilintar de caneca, curtinho
  | "flauta"
  | "metal" // fanfarra
  | "baixo"
  | "pulso" // grave pulsando (tensão)
  | "tambor" // tambor de mão
  | "bumbo"
  | "chocalho";

/** Uma nota do compasso. quando e duracao em batidas (o motor converte com o andamento). */
export type Nota = { quando: number; instrumento: Instrumento; midi: number; duracao: number; intensidade: number };

export type Compasso = {
  notas: Nota[];
  /** acorde do pad neste compasso (MIDI), quando a receita tem pad */
  acorde: number[] | null;
  /** fim de uma peça curta (vitória): o motor troca para este humor ao fim do compasso */
  trocarPara?: HumorMusical;
};

export type Aleatorio = () => number;

export const MODOS = {
  maior: [0, 2, 4, 5, 7, 9, 11],
  lidio: [0, 2, 4, 6, 7, 9, 11],
  mixolidio: [0, 2, 4, 5, 7, 9, 10],
  dorico: [0, 2, 3, 5, 7, 9, 10],
  eolio: [0, 2, 3, 5, 7, 8, 10],
  frigio: [0, 1, 3, 5, 7, 8, 10],
  menorHarmonico: [0, 2, 3, 5, 7, 8, 11],
} as const satisfies Record<string, readonly number[]>;

export const ROTULO_HUMOR: Record<HumorMusical, string> = {
  taverna: "taverna",
  calmo: "calmaria",
  exploracao: "exploração",
  misterio: "mistério",
  tensao: "tensão",
  combate: "combate",
  triste: "tristeza",
  vitoria: "vitória",
  sombrio: "sombrio",
};

/** energia da cena: densidade de notas (0..1) e multiplicador de volume */
export const DENSIDADE: Record<Energia, number> = { baixa: 0.45, media: 0.72, alta: 1 };
export const VOLUME_ENERGIA: Record<Energia, number> = { baixa: 0.8, media: 1, alta: 1.15 };

export function midiParaHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** grau da escala (0 = tônica; pode ser negativo ou passar da oitava) para nota MIDI */
export function grauParaMidi(tonica: number, modo: readonly number[], grau: number): number {
  const n = modo.length;
  const oitava = Math.floor(grau / n);
  const g = ((grau % n) + n) % n;
  return tonica + 12 * oitava + modo[g];
}

/** acorde empilhado em terças a partir de um grau da escala */
export function acordeDoGrau(tonica: number, modo: readonly number[], grau: number, notas = 3): number[] {
  return Array.from({ length: notas }, (_, i) => grauParaMidi(tonica, modo, grau + 2 * i));
}

export function escolher<T>(rng: Aleatorio, lista: readonly T[]): T {
  return lista[Math.floor(rng() * lista.length) % lista.length];
}

export function chance(rng: Aleatorio, p: number): boolean {
  return rng() < p;
}

/** o que cada receita recebe para compor um compasso */
export type Contexto = {
  rng: Aleatorio;
  tonica: number;
  modo: readonly number[];
  batidas: number;
  /** índice do compasso desde que o humor começou */
  compasso: number;
  /** grau (na escala) da fundamental do acorde deste compasso */
  grauAcorde: number;
  /** tríade do compasso em MIDI, perto da tônica */
  acorde: number[];
  densidade: number;
  /** memória entre compassos (posição da melodia etc.) */
  estado: Record<string, number>;
};

export type Receita = {
  tonica: number;
  modo: readonly number[];
  /** andamento em batidas por minuto, por energia (a "batida" é a unidade da receita: colcheia nas rápidas) */
  bpm: Record<Energia, number>;
  batidas: number;
  /** progressões em graus da escala; troca a cada frase */
  progressoes: number[][];
  /** transposições sorteadas quando o humor começa (variedade) */
  transposicoes: number[];
  volume: number;
  /** quanto vai para o reverb (0..1) */
  reverb: number;
  pad: { volume: number; brilho: number; oitava: number } | null;
  /** drone fixo: intervalos a partir da tônica + oitava */
  drone: { volume: number; intervalos: number[]; oitava: number } | null;
  /** volume do murmúrio de conversa (0 = sem) */
  conversa: number;
  /** peça curta que acaba e passa para outro humor */
  duracao?: { compassos: number; depois: HumorMusical };
  compor: (c: Contexto) => Nota[];
};

function nota(quando: number, instrumento: Instrumento, midi: number, duracao: number, intensidade: number): Nota {
  return { quando, instrumento, midi, duracao, intensidade };
}

/** passeio melódico por graus: passos curtos, às vezes um salto; fica entre min e max */
function passo(c: Contexto, chave: string, min: number, max: number, tendencia = 0): number {
  let g = c.estado[chave] ?? Math.round((min + max) / 2);
  const r = c.rng() + tendencia;
  const delta = r < 0.36 ? -1 : r < 0.72 ? 1 : r < 0.82 ? 0 : r < 0.91 ? -2 : 2;
  g += delta;
  if (g < min) g = min + (min - g);
  if (g > max) g = max - (g - max);
  g = Math.max(min, Math.min(max, g));
  c.estado[chave] = g;
  return g;
}

/** puxa um grau para a nota do acorde mais próxima (tempos fortes soam resolvidos) */
function noAcorde(c: Contexto, g: number): number {
  const n = c.modo.length;
  let melhor = g;
  let dist = Infinity;
  for (let d = -3; d <= 3; d++) {
    const rel = (((g + d - c.grauAcorde) % n) + n) % n;
    if ((rel === 0 || rel === 2 || rel === 4) && Math.abs(d) < dist) {
      dist = Math.abs(d);
      melhor = g + d;
    }
  }
  return melhor;
}

function escala(c: Contexto, g: number): number {
  return grauParaMidi(c.tonica, c.modo, g);
}

export const RECEITAS: Record<HumorMusical, Receita> = {
  // dedilhado alegre em mixolídio, compasso de giga (6 colcheias), tambor de mão e conversa ao fundo
  taverna: {
    tonica: 62,
    modo: MODOS.mixolidio,
    bpm: { baixa: 200, media: 228, alta: 258 },
    batidas: 6,
    progressoes: [
      [0, 6, 0, 3],
      [0, 3, 6, 0],
      [0, 0, 6, 4],
      [3, 0, 6, 0],
    ],
    transposicoes: [0, 0, -2, 3],
    volume: 0.9,
    reverb: 0.22,
    pad: null,
    drone: null,
    conversa: 1,
    compor(c) {
      const [r, t, q] = c.acorde;
      const notas: Nota[] = [nota(0, "alaude", r - 12, 3, 0.6), nota(3, "alaude", (chance(c.rng, 0.5) ? q : r) - 12, 3, 0.48)];
      for (const b of [1, 2, 4, 5]) {
        if (chance(c.rng, 0.5 + 0.45 * c.densidade)) notas.push(nota(b, "alaude", escolher(c.rng, [t, q, r + 12]), 1.5, 0.28));
      }
      for (const b of [0, 1, 2, 3, 4, 5]) {
        const forte = b === 0 || b === 3;
        if (!chance(c.rng, forte ? 0.85 : 0.4 * c.densidade)) continue;
        let g = passo(c, "melodia", 4, 13);
        if (forte) g = noAcorde(c, g);
        c.estado.melodia = g;
        notas.push(nota(b, "alaude", escala(c, g), forte ? 2 : 1, forte ? 0.42 : 0.32));
      }
      notas.push(nota(0, "tambor", 45, 1, 0.7), nota(3, "tambor", 45, 1, 0.55));
      if (chance(c.rng, c.densidade)) notas.push(nota(5, "tambor", 52, 1, 0.4));
      for (const b of [1, 2, 4]) if (chance(c.rng, 0.35 * c.densidade)) notas.push(nota(b, "tambor", 52, 1, 0.18));
      if (chance(c.rng, 0.07)) notas.push(nota(c.rng() * 5, "copo", 93 + Math.floor(c.rng() * 8), 1, 0.25));
      return notas;
    },
  },

  // pad suave em lídio com harpa ocasional
  calmo: {
    tonica: 65,
    modo: MODOS.lidio,
    bpm: { baixa: 58, media: 64, alta: 72 },
    batidas: 4,
    progressoes: [
      [0, 1, 0, 4],
      [0, 5, 1, 0],
      [0, 2, 1, 0],
    ],
    transposicoes: [0, -2, 2, -5],
    volume: 1.5,
    reverb: 0.5,
    pad: { volume: 0.55, brilho: 900, oitava: -1 },
    drone: null,
    conversa: 0,
    compor(c) {
      const [r, t, q] = c.acorde;
      const notas: Nota[] = [];
      if (chance(c.rng, 0.35 + 0.5 * c.densidade)) {
        const inicio = escolher(c.rng, [0, 0, 1, 2]);
        [r, t, q, r + 12].forEach((m, i) => notas.push(nota(inicio + i * 0.5, "harpa", m, 3, 0.26 - i * 0.03)));
      }
      if (chance(c.rng, 0.4 * c.densidade)) {
        const g = noAcorde(c, passo(c, "melodia", 7, 14));
        notas.push(nota(escolher(c.rng, [2, 2.5, 3]), "harpa", escala(c, g), 2, 0.22));
      }
      if (chance(c.rng, 0.14)) notas.push(nota(c.rng() * 3, "sino", escolher(c.rng, [t, q]) + 12, 4, 0.14));
      return notas;
    },
  },

  // arpejos abertos (quintas e nonas) em dórico, flauta em notas longas, drone de quinta
  exploracao: {
    tonica: 62,
    modo: MODOS.dorico,
    bpm: { baixa: 160, media: 184, alta: 208 },
    batidas: 8,
    progressoes: [
      [0, 6, 3, 0],
      [0, 2, 6, 0],
      [0, 3, 0, 6],
    ],
    transposicoes: [0, -2, 3, -5],
    volume: 0.85,
    reverb: 0.42,
    pad: null,
    drone: { volume: 0.32, intervalos: [0, 7], oitava: -2 },
    conversa: 0,
    compor(c) {
      const r = c.acorde[0];
      const desenho = escolher(c.rng, [
        [-12, -5, 0, 7, 14, 7, 0, -5],
        [-12, 0, 7, 14, 19, 14, 7, 0],
        [-12, -5, 2, 7, 12, 14, 7, 2],
      ]);
      const notas: Nota[] = [];
      desenho.forEach((iv, b) => {
        if (b === 0 || chance(c.rng, 0.55 + 0.45 * c.densidade)) notas.push(nota(b, "harpa", r + iv, 2.5, b === 0 ? 0.36 : 0.24));
      });
      if (chance(c.rng, 0.7)) notas.push(nota(0, "flauta", escala(c, noAcorde(c, passo(c, "melodia", 7, 14))), 4, 0.3));
      if (chance(c.rng, 0.45 * c.densidade)) notas.push(nota(5, "flauta", escala(c, passo(c, "melodia", 7, 14)), 2.6, 0.26));
      if (chance(c.rng, 0.5 * c.densidade)) notas.push(nota(0, "tambor", 43, 1, 0.3));
      return notas;
    },
  },

  // notas esparsas em menor, muito reverb, pad escuro
  misterio: {
    tonica: 57,
    modo: MODOS.eolio,
    bpm: { baixa: 50, media: 56, alta: 64 },
    batidas: 4,
    progressoes: [
      [0, 0, 5, 0],
      [0, 3, 0, 1],
      [0, 5, 3, 0],
    ],
    transposicoes: [0, 2, -3, 5],
    volume: 0.85,
    reverb: 0.82,
    pad: { volume: 0.38, brilho: 450, oitava: -1 },
    drone: { volume: 0.22, intervalos: [0], oitava: -2 },
    conversa: 0,
    compor(c) {
      const notas: Nota[] = [];
      for (let b = 0; b < 4; b += 0.5) {
        if (!chance(c.rng, 0.1 + 0.12 * c.densidade)) continue;
        const g = passo(c, "melodia", 5, 15);
        notas.push(nota(b, chance(c.rng, 0.55) ? "sino" : "harpa", escala(c, g), 3, 0.14 + c.rng() * 0.1));
      }
      if (chance(c.rng, 0.3)) notas.push(nota(0, "baixo", c.acorde[0] - 24, 3.5, 0.3));
      return notas;
    },
  },

  // grave pulsando a cada batida + batimento de coração; um sino dissonante de vez em quando
  tensao: {
    tonica: 52,
    modo: MODOS.frigio,
    bpm: { baixa: 72, media: 86, alta: 100 },
    batidas: 4,
    progressoes: [
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 6],
    ],
    transposicoes: [0, 1, -2, 3],
    volume: 0.8,
    reverb: 0.45,
    pad: { volume: 0.25, brilho: 520, oitava: -1 },
    drone: { volume: 0.25, intervalos: [0, 7], oitava: -2 },
    conversa: 0,
    compor(c) {
      const notas: Nota[] = [];
      for (let b = 0; b < 4; b++) notas.push(nota(b, "pulso", c.acorde[0] - 12, 0.9, 0.35 + 0.25 * c.densidade - (b % 2) * 0.1));
      notas.push(nota(0, "bumbo", 33, 1, 0.6), nota(0.3, "bumbo", 33, 1, 0.38));
      if (c.densidade > 0.9) notas.push(nota(2, "bumbo", 33, 1, 0.5), nota(2.3, "bumbo", 33, 1, 0.3));
      if (chance(c.rng, 0.28)) notas.push(nota(1 + c.rng() * 2, "sino", c.tonica + escolher(c.rng, [13, 18, 25]), 3, 0.1));
      return notas;
    },
  },

  // percussão rápida e ostinato em menor harmônico (3-3-2), metais pontuando
  combate: {
    tonica: 50,
    modo: MODOS.menorHarmonico,
    bpm: { baixa: 250, media: 280, alta: 312 },
    batidas: 8,
    progressoes: [
      [0, 0, 5, 4],
      [0, 5, 3, 4],
      [0, 3, 0, 4],
    ],
    transposicoes: [0, 2, -2, 3],
    volume: 0.62,
    reverb: 0.25,
    pad: null,
    drone: null,
    conversa: 0,
    compor(c) {
      const notas: Nota[] = [];
      const desenho = escolher(c.rng, [
        [0, 0, 4, 0, 5, 4, 2, 0],
        [0, 0, 0, 4, 0, 0, 5, 4],
        [0, 7, 0, 4, 0, 7, 5, 4],
      ]);
      const acentos = [0, 3, 6];
      desenho.forEach((d, b) => {
        notas.push(nota(b, "alaude", grauParaMidi(c.tonica, c.modo, c.grauAcorde + d), 1, acentos.includes(b) ? 0.5 : 0.3));
      });
      for (const b of acentos) {
        notas.push(nota(b, "baixo", c.acorde[0] - 24, 1.2, 0.45));
        notas.push(nota(b, "bumbo", 33, 1, 0.65));
      }
      for (const b of [2, 4, 7]) if (b !== 7 || chance(c.rng, c.densidade)) notas.push(nota(b, "tambor", 55, 1, b === 4 ? 0.5 : 0.32));
      for (let b = 0; b < 8; b += c.densidade > 0.9 ? 0.5 : 1) {
        if (chance(c.rng, 0.4 + 0.5 * c.densidade)) notas.push(nota(b, "chocalho", 0, 0.25, b % 1 === 0.5 ? 0.6 : 0.35));
      }
      if (c.compasso % 2 === 0 && chance(c.rng, 0.35 + 0.4 * c.densidade)) {
        for (const m of c.acorde.slice(0, 2)) notas.push(nota(0, "metal", m, 2.5, 0.3));
      }
      return notas;
    },
  },

  // melodia lenta em menor na flauta, harpa arpejando devagar
  triste: {
    tonica: 57,
    modo: MODOS.eolio,
    bpm: { baixa: 52, media: 58, alta: 64 },
    batidas: 4,
    progressoes: [
      [0, 5, 2, 6],
      [0, 3, 0, 4],
      [0, 5, 3, 4],
    ],
    transposicoes: [0, -2, 2, 5],
    volume: 1.1,
    reverb: 0.6,
    pad: { volume: 0.36, brilho: 700, oitava: -1 },
    drone: null,
    conversa: 0,
    compor(c) {
      const [r, t, q] = c.acorde;
      const notas: Nota[] = [];
      const ritmo = escolher(c.rng, [
        [0, 2],
        [0, 1.5, 2, 3],
        [0, 3],
        [0, 1, 2],
      ]);
      ritmo.forEach((b, i) => {
        let g = passo(c, "melodia", 6, 13, 0.06); // leve tendência a descer
        if (b === 0) g = noAcorde(c, g);
        c.estado.melodia = g;
        const fim = ritmo[i + 1] ?? 4;
        notas.push(nota(b, "flauta", escala(c, g), fim - b, 0.3));
      });
      if (chance(c.rng, 0.4 + 0.5 * c.densidade)) [r, t, q].forEach((m, i) => notas.push(nota(i, "harpa", m - 12, 3, 0.18)));
      return notas;
    },
  },

  // fanfarra curta em maior (4 compassos) que volta para a calmaria
  vitoria: {
    tonica: 60,
    modo: MODOS.maior,
    bpm: { baixa: 100, media: 112, alta: 124 },
    batidas: 4,
    progressoes: [[0, 3, 4, 0]],
    transposicoes: [0, 2, -2],
    volume: 1.1,
    reverb: 0.42,
    pad: { volume: 0.3, brilho: 1400, oitava: -1 },
    drone: null,
    conversa: 0,
    duracao: { compassos: 4, depois: "calmo" },
    compor(c) {
      const [r, t, q] = c.acorde;
      const notas: Nota[] = [];
      const tercina = 2 / 3;
      if (c.compasso === 0) {
        notas.push(nota(0, "metal", r, tercina, 0.32), nota(tercina, "metal", r, tercina, 0.3), nota(2 * tercina, "metal", r, tercina, 0.3));
        notas.push(nota(2, "metal", q, 2, 0.36));
      } else if (c.compasso === 1) {
        notas.push(nota(0, "metal", r, 1, 0.32), nota(1, "metal", t, 1, 0.32), nota(2, "metal", q, 2, 0.34));
      } else if (c.compasso === 2) {
        notas.push(nota(0, "metal", q, 1.5, 0.32), nota(1.5, "metal", t, 0.5, 0.3), nota(2, "metal", r + 12, 2, 0.36));
      } else {
        for (const m of [r, t, q, r + 12]) notas.push(nota(0, "metal", m, 3.5, 0.24));
        [r, t, q, r + 12, t + 12].forEach((m, i) => notas.push(nota(1 + i * 0.25, "harpa", m + 12, 3, 0.2)));
      }
      notas.push(nota(0, "bumbo", 33, 1, 0.55));
      if (c.compasso < 3) for (let b = 2; b < 4; b += 0.25) notas.push(nota(b, "tambor", 57, 0.25, 0.12 + (b - 2) * 0.1));
      return notas;
    },
  },

  // graves dissonantes (segunda menor, trítono), drone de trítono, sinos baixos
  sombrio: {
    tonica: 48,
    modo: MODOS.frigio,
    bpm: { baixa: 40, media: 46, alta: 52 },
    batidas: 4,
    progressoes: [
      [0, 0, 1, 0],
      [0, 4, 0, 1],
    ],
    transposicoes: [0, 1, -1, 2],
    volume: 0.9,
    reverb: 0.7,
    pad: { volume: 0.3, brilho: 360, oitava: -1 },
    drone: { volume: 0.3, intervalos: [0, 6], oitava: -2 },
    conversa: 0,
    compor(c) {
      const r = c.acorde[0];
      const notas: Nota[] = [nota(0, "baixo", r - 12, 4, 0.32)];
      if (chance(c.rng, 0.6)) notas.push(nota(0.5, "baixo", r - 11, 3.5, 0.2));
      if (chance(c.rng, 0.35)) notas.push(nota(2, "baixo", r - 6, 2, 0.22));
      if (chance(c.rng, 0.2 + 0.2 * c.densidade)) notas.push(nota(c.rng() * 3, "sino", c.tonica + escolher(c.rng, [1, 6, 13]), 4, 0.12));
      if (chance(c.rng, 0.3 + 0.5 * c.densidade)) notas.push(nota(0, "pulso", r - 12, 3, 0.3));
      return notas;
    },
  },
};

export type Compositor = {
  humor: HumorMusical;
  receita: Receita;
  tonica: number;
  /** segundos por batida nesta energia */
  segundosPorBatida: (energia: Energia) => number;
  proximo: (energia: Energia) => Compasso;
};

const VALIDO = (n: Nota) =>
  Number.isFinite(n.quando) && Number.isFinite(n.midi) && n.duracao > 0 && n.intensidade > 0 && n.quando >= 0;

/** Compositor de um humor: escolhe a frase (progressão), lembra a melodia e devolve um compasso por chamada. */
export function criarCompositor(humor: HumorMusical, rng: Aleatorio): Compositor {
  const receita = RECEITAS[humor];
  const tonica = receita.tonica + escolher(rng, receita.transposicoes);
  const estado: Record<string, number> = {};
  let progressao = escolher(rng, receita.progressoes);
  let n = 0;

  return {
    humor,
    receita,
    tonica,
    segundosPorBatida: (energia) => 60 / receita.bpm[energia],
    proximo(energia) {
      if (n > 0 && n % progressao.length === 0) progressao = escolher(rng, receita.progressoes);
      const grauAcorde = progressao[n % progressao.length];
      const acorde = acordeDoGrau(tonica, receita.modo, grauAcorde);
      const notas = receita
        .compor({ rng, tonica, modo: receita.modo, batidas: receita.batidas, compasso: n, grauAcorde, acorde, densidade: DENSIDADE[energia], estado })
        .filter((x) => VALIDO(x) && x.quando < receita.batidas)
        .sort((a, b) => a.quando - b.quando);
      const pad = receita.pad ? acorde.map((m) => m + 12 * receita.pad!.oitava) : null;
      const compasso: Compasso = { notas, acorde: pad };
      if (receita.duracao && n === receita.duracao.compassos - 1) compasso.trocarPara = receita.duracao.depois;
      n++;
      return compasso;
    },
  };
}

/** notas do drone fixo de uma receita (MIDI) */
export function notasDoDrone(receita: Receita, tonica: number): number[] {
  return receita.drone ? receita.drone.intervalos.map((i) => tonica + 12 * receita.drone!.oitava + i) : [];
}
