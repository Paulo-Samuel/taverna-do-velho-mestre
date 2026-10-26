import type { HumorMusical } from "@/lib/sistemas/tipos";
import {
  acordeDoGrau,
  chance,
  escala,
  escolher,
  grauParaMidi,
  MODOS,
  noAcorde,
  nota,
  passo,
  RECEITAS,
  type Contexto,
  type Efeitos,
  type Instrumento,
  type Nota,
  type Receita,
} from "./teoria";

// Estilo musical de cada sistema de regras: o "sotaque" que muda instrumentos, modos, andamento e efeitos da trilha.
// A fantasia medieval (RECEITAS em teoria.ts) é a base; cada estilo herda dela com ajustes, troca instrumentos,
// soma camadas extras ou tem receitas próprias por humor. Puro como teoria.ts (sem Web Audio).

export type EstiloMusical = "fantasia" | "epico" | "gotico" | "horror" | "dungeon" | "pulp" | "folk";

const ESTILO_DO_SISTEMA: Record<string, EstiloMusical> = {
  dnd5e: "fantasia",
  pf1e: "fantasia",
  historia: "fantasia",
  pf2e: "epico",
  vtm5: "gotico",
  d100: "horror",
  osr: "dungeon",
  fate: "pulp",
  pbta: "folk",
};

/** estilo de um sistema (id); desconhecido ou sem sistema cai na fantasia */
export function estiloDoSistema(sistema?: string | null): EstiloMusical {
  return (sistema && ESTILO_DO_SISTEMA[sistema]) || "fantasia";
}

export const ROTULO_ESTILO: Record<EstiloMusical, string> = {
  fantasia: "fantasia medieval",
  epico: "fantasia épica",
  gotico: "noite gótica",
  horror: "horror dos anos 20",
  dungeon: "dungeon synth",
  pulp: "aventura pulp",
  folk: "folk de estrada",
};

type Sotaque = {
  /** troca de instrumento nas receitas herdadas da fantasia */
  trocas?: Partial<Record<Instrumento, Instrumento>>;
  /** ajuste nas receitas herdadas (modo, andamento, pad, drone, efeitos...) */
  ajuste?: (r: Receita, humor: HumorMusical) => Partial<Receita>;
  /** camada composta por cima, por humor (vale também nas receitas próprias) */
  extras?: Partial<Record<HumorMusical, (c: Contexto) => Nota[]>>;
  /** receitas próprias: substituem a herdada naquele humor */
  receitas?: Partial<Record<HumorMusical, Receita>>;
};

const escalaBpm = (bpm: Receita["bpm"], k: number): Receita["bpm"] => ({
  baixa: Math.round(bpm.baixa * k),
  media: Math.round(bpm.media * k),
  alta: Math.round(bpm.alta * k),
});

/** nota do acorde de 4 sons (com sétima) do compasso */
const tetrade = (c: Contexto) => acordeDoGrau(c.tonica, c.modo, c.grauAcorde, 4);

// ---------- fantasia (D&D 5e, Pathfinder 1e, modo história): a base + tambores de guerra no combate ----------

const FANTASIA: Sotaque = {
  extras: {
    combate(c) {
      const n = [nota(0, "tambor", 38, 1, 0.75), nota(4, "tambor", 38, 1, 0.6)];
      if (chance(c.rng, c.densidade)) n.push(nota(6, "tambor", 41, 1, 0.5), nota(7, "tambor", 41, 1, 0.45));
      return n;
    },
  },
};

// ---------- épico (Pathfinder 2e): cordas em pad, trompas e tímpanos por cima da fantasia ----------

const EPICO: Sotaque = {
  ajuste: (r, humor) => ({
    reverb: Math.min(0.9, r.reverb * 1.2),
    pad: r.pad
      ? { ...r.pad, timbre: "cordas", brilho: r.pad.brilho * 1.4 }
      : humor === "exploracao" || humor === "combate"
        ? { volume: humor === "combate" ? 0.32 : 0.4, brilho: 1500, oitava: -1, timbre: "cordas" }
        : null,
  }),
  extras: {
    ...FANTASIA.extras,
    exploracao(c) {
      if (c.compasso % 2 !== 0 || !chance(c.rng, 0.65)) return [];
      return [nota(0, "trompa", c.acorde[0] - 12, 6, 0.36), nota(0, "trompa", c.acorde[2] - 12, 6, 0.26)];
    },
    calmo(c) {
      if (!chance(c.rng, 0.3 + 0.2 * c.densidade)) return [];
      return [nota(0, "cordas", escala(c, noAcorde(c, passo(c, "cordas", 7, 12))), 4, 0.28)];
    },
    triste: (c) => [nota(0, "cordas", c.acorde[0] - 12, 4, 0.26)],
    tensao(c) {
      const n: Nota[] = [];
      for (let b = 0; b < 4; b += 0.5) n.push(nota(b, "cordas", c.acorde[0], 0.45, 0.12 + 0.08 * c.densidade));
      return n;
    },
    combate(c) {
      const n = FANTASIA.extras!.combate!(c);
      if (c.compasso % 2 === 1) for (const m of c.acorde.slice(0, 2)) n.push(nota(0, "trompa", m - 12, 3, 0.36));
      return n;
    },
    vitoria: (c) => (c.compasso < 3 ? [nota(0, "trompa", c.acorde[0] - 12, 4, 0.3)] : []),
    misterio: (c) => (c.compasso % 4 === 0 ? [nota(0, "trompa", c.acorde[0] - 12, 4, 0.16)] : []),
    sombrio: (c) => (c.compasso % 4 === 2 ? [nota(0, "trompa", c.acorde[0] - 12, 4, 0.18)] : []),
  },
};

// ---------- noite gótica (Vampiro 5ª): darkwave, órgão distante, trip-hop, chuva; boate gótica e industrial ----------

const CHUVA: Efeitos["ambiente"] = [{ tipo: "chuva", volume: 1 }];
const CIDADE_CHUVA: Efeitos["ambiente"] = [
  { tipo: "cidade", volume: 0.7 },
  { tipo: "chuva", volume: 0.55 },
];

/** batida trip-hop: bumbo arrastado, caixa no 2 e no 4 (aqui em 1 e 3, contando do zero), chimbal com balanço */
function batidaTripHop(c: Contexto, forca: number): Nota[] {
  const n = [nota(0, "bumbo", 33, 1, 0.5 * forca), nota(1, "caixa", 0, 1, 0.42 * forca), nota(3, "caixa", 0, 1, 0.42 * forca)];
  if (chance(c.rng, 0.6)) n.push(nota(1.75, "bumbo", 33, 1, 0.32 * forca));
  n.push(nota(2.5, "bumbo", 33, 1, 0.4 * forca));
  for (let b = 0; b < 4; b += 0.5) {
    if (chance(c.rng, 0.5 + 0.4 * c.densidade)) n.push(nota(b + (b % 1 ? 0.06 : 0), "chocalho", 0, 0.25, (b % 1 ? 0.28 : 0.4) * forca));
  }
  return n;
}

const GOTICO: Sotaque = {
  receitas: {
    // Elysium/Rack: boate gótica, bumbo reto, baixo em oitavas, arpejo de sintetizador, conversa e cidade lá fora
    taverna: {
      tonica: 57,
      modo: MODOS.eolio,
      bpm: { baixa: 108, media: 116, alta: 124 },
      batidas: 4,
      progressoes: [
        [0, 5, 2, 6],
        [0, 3, 5, 4],
        [0, 0, 5, 6],
      ],
      transposicoes: [0, -2, 2, -5],
      volume: 0.62,
      reverb: 0.32,
      pad: { volume: 0.32, brilho: 700, oitava: -1 },
      drone: null,
      conversa: 0.45,
      efeitos: { ambiente: [{ tipo: "cidade", volume: 0.45 }] },
      compor(c) {
        const r = c.acorde[0];
        const n: Nota[] = [];
        for (let b = 0; b < 4; b++) n.push(nota(b, "bumbo", 33, 1, 0.55));
        n.push(nota(1, "caixa", 0, 1, 0.4), nota(3, "caixa", 0, 1, 0.4));
        for (let b = 0.5; b < 4; b += 1) n.push(nota(b, "chocalho", 0, 0.25, 0.4));
        if (c.densidade > 0.7) for (let b = 0.25; b < 4; b += 0.5) if (chance(c.rng, 0.6)) n.push(nota(b, "chocalho", 0, 0.25, 0.18));
        for (let b = 0; b < 4; b += 0.5) n.push(nota(b, "baixoSinte", b % 1 ? r - 12 : r - 24, 0.42, b % 1 ? 0.32 : 0.46));
        if (chance(c.rng, 0.35 + 0.45 * c.densidade)) {
          const arpejo = [c.acorde[0], c.acorde[1], c.acorde[2], c.acorde[1] + 12, c.acorde[2]];
          [0, 0.75, 1.5, 2.25, 3].forEach((b, i) => n.push(nota(b, "sinte", arpejo[i] + 12, 0.6, 0.22)));
        }
        if (chance(c.rng, 0.3)) n.push(nota(0, "sinte", escala(c, noAcorde(c, passo(c, "melodia", 7, 13))), 2, 0.26));
        return n;
      },
    },

    // noite chuvosa: pad escuro, baixo lento, batida trip-hop que só aparece com energia
    calmo: {
      tonica: 57,
      modo: MODOS.dorico,
      bpm: { baixa: 68, media: 74, alta: 80 },
      batidas: 4,
      progressoes: [
        [0, 3, 0, 3],
        [0, 6, 3, 0],
        [0, 2, 3, 6],
      ],
      transposicoes: [0, -2, 2, -5],
      volume: 1,
      reverb: 0.55,
      pad: { volume: 0.45, brilho: 620, oitava: -1 },
      drone: null,
      conversa: 0,
      efeitos: { ambiente: CHUVA },
      compor(c) {
        const r = c.acorde[0];
        const n: Nota[] = [nota(0, "baixoSinte", r - 24, 1.6, 0.36)];
        if (chance(c.rng, 0.6)) n.push(nota(2.5, "baixoSinte", r - 24, 1, 0.26));
        if (c.densidade > 0.5) n.push(...batidaTripHop(c, 0.55 + 0.3 * c.densidade));
        else n.push(nota(0, "bumbo", 33, 1, 0.3));
        if (chance(c.rng, 0.35)) n.push(nota(escolher(c.rng, [0.5, 1.5, 2, 3]), "sinte", escala(c, passo(c, "melodia", 9, 15)), 1.5, 0.18));
        return n;
      },
    },

    // caçada pela cidade: trip-hop com baixo pulsante, frases curtas de sintetizador, cidade e chuva
    exploracao: {
      tonica: 55,
      modo: MODOS.eolio,
      bpm: { baixa: 82, media: 88, alta: 96 },
      batidas: 4,
      progressoes: [
        [0, 0, 5, 6],
        [0, 3, 0, 6],
        [0, 5, 3, 4],
      ],
      transposicoes: [0, 2, -2, 3],
      volume: 0.85,
      reverb: 0.45,
      pad: { volume: 0.34, brilho: 560, oitava: -1 },
      drone: null,
      conversa: 0,
      efeitos: { ambiente: CIDADE_CHUVA },
      compor(c) {
        const r = c.acorde[0];
        const n = batidaTripHop(c, 0.8 + 0.2 * c.densidade);
        for (const [b, d, v] of [
          [0, 0.7, 0.44],
          [0.75, 0.4, 0.3],
          [2, 0.7, 0.4],
          [2.5, 0.4, 0.28],
        ] as const)
          n.push(nota(b, "baixoSinte", r - 24, d, v));
        for (let b = 0; b < 4; b += 0.5) {
          if (!chance(c.rng, 0.12 + 0.18 * c.densidade)) continue;
          n.push(nota(b, "sinte", escala(c, passo(c, "melodia", 7, 14)), 0.9, 0.22));
        }
        return n;
      },
    },

    // capela/Elysium antigo: órgão distante em acordes longos, sinos, frígio
    misterio: {
      tonica: 52,
      modo: MODOS.frigio,
      bpm: { baixa: 48, media: 52, alta: 58 },
      batidas: 4,
      progressoes: [
        [0, 1, 0, 6],
        [0, 3, 1, 0],
        [0, 5, 6, 0],
      ],
      transposicoes: [0, 2, -3, 5],
      volume: 1.3,
      reverb: 0.86,
      pad: { volume: 0.3, brilho: 420, oitava: -1 },
      drone: { volume: 0.22, intervalos: [0], oitava: -2 },
      conversa: 0,
      efeitos: { ambiente: [{ tipo: "chuva", volume: 0.6 }] },
      compor(c) {
        const [r, t, q] = c.acorde;
        const n: Nota[] = [];
        if (c.compasso % 2 === 0 || chance(c.rng, 0.4)) for (const m of [r, t, q]) n.push(nota(0, "orgao", m, 3.8, 0.26));
        if (chance(c.rng, 0.4)) n.push(nota(0, "orgao", r - 12, 4, 0.22));
        if (chance(c.rng, 0.2 + 0.15 * c.densidade)) n.push(nota(1 + c.rng() * 2.5, "sino", escala(c, passo(c, "melodia", 9, 16)), 3, 0.12));
        return n;
      },
    },

    // perigo à espreita: baixo de sintetizador pulsando em colcheias, pancada metálica longe, agudos dissonantes
    tensao: {
      tonica: 52,
      modo: MODOS.menorHarmonico,
      bpm: { baixa: 80, media: 90, alta: 100 },
      batidas: 4,
      progressoes: [
        [0, 0, 5, 0],
        [0, 1, 0, 4],
        [0, 0, 0, 4],
      ],
      transposicoes: [0, 1, -2, 3],
      volume: 0.78,
      reverb: 0.5,
      pad: { volume: 0.26, brilho: 480, oitava: -1 },
      drone: { volume: 0.24, intervalos: [0, 7], oitava: -2 },
      conversa: 0,
      efeitos: { ambiente: [{ tipo: "cidade", volume: 0.8 }] },
      compor(c) {
        const r = c.acorde[0];
        const n: Nota[] = [];
        for (let b = 0; b < 4; b += 0.5) n.push(nota(b, "baixoSinte", r - 24, 0.35, (b % 1 ? 0.22 : 0.34) + 0.12 * c.densidade));
        n.push(nota(0, "bumbo", 33, 1, 0.45));
        if (c.densidade > 0.7) n.push(nota(2, "bumbo", 33, 1, 0.38));
        if (c.compasso % 2 === 1) n.push(nota(3, "clang", 64, 1, 0.22));
        if (chance(c.rng, 0.3)) n.push(nota(1 + c.rng() * 2, "sinte", c.tonica + escolher(c.rng, [13, 18, 23]), 1.5, 0.12));
        return n;
      },
    },

    // briga: industrial, bumbo quebrado, pancadas metálicas, baixo em semicolcheias, saturação
    combate: {
      tonica: 52,
      modo: MODOS.frigio,
      bpm: { baixa: 128, media: 138, alta: 148 },
      batidas: 4,
      progressoes: [
        [0, 0, 1, 0],
        [0, 5, 6, 1],
        [0, 0, 5, 1],
      ],
      transposicoes: [0, 2, -2, 3],
      volume: 0.42,
      reverb: 0.22,
      pad: null,
      drone: null,
      conversa: 0,
      efeitos: { saturacao: 0.5 },
      compor(c) {
        const r = c.acorde[0];
        const n: Nota[] = [];
        for (const b of [0, 0.75, 2, 2.75]) n.push(nota(b, "bumbo", 33, 1, 0.6));
        if (chance(c.rng, c.densidade)) n.push(nota(1.5, "bumbo", 33, 1, 0.45));
        n.push(nota(1, "clang", 62, 1, 0.5), nota(3, "clang", 62, 1, 0.5));
        if (chance(c.rng, 0.5 * c.densidade)) n.push(nota(3.75, "caixa", 0, 1, 0.3));
        for (let b = 0; b < 4; b += 0.25) {
          if (chance(c.rng, 0.5 + 0.4 * c.densidade)) n.push(nota(b, "chocalho", 0, 0.2, b % 0.5 ? 0.22 : 0.38));
          const acento = b % 1 === 0;
          n.push(nota(b, "baixoSinte", acento ? r - 24 : r - 12, 0.2, acento ? 0.42 : 0.24));
        }
        if (c.compasso % 2 === 0) for (const m of c.acorde) n.push(nota(0, "sinte", m, 0.5, 0.26));
        return n;
      },
    },

    // luto: órgão baixinho, melodia lenta de sintetizador, chuva
    triste: {
      tonica: 57,
      modo: MODOS.eolio,
      bpm: { baixa: 54, media: 58, alta: 64 },
      batidas: 4,
      progressoes: [
        [0, 5, 2, 6],
        [0, 3, 0, 4],
        [0, 5, 3, 4],
      ],
      transposicoes: [0, -2, 2, 5],
      volume: 1.35,
      reverb: 0.65,
      pad: { volume: 0.3, brilho: 560, oitava: -1 },
      drone: null,
      conversa: 0,
      efeitos: { ambiente: CHUVA },
      compor(c) {
        const [r, t, q] = c.acorde;
        const n: Nota[] = [r, t, q].map((m) => nota(0, "orgao", m - 12, 3.8, 0.18));
        const ritmo = escolher(c.rng, [
          [0, 2],
          [0, 1.5, 2, 3],
          [0, 3],
        ]);
        ritmo.forEach((b, i) => {
          let g = passo(c, "melodia", 6, 13, 0.06);
          if (b === 0) g = noAcorde(c, g);
          c.estado.melodia = g;
          n.push(nota(b, "sinte", escala(c, g), (ritmo[i + 1] ?? 4) - b, 0.24));
        });
        return n;
      },
    },

    // vitória sombria: órgão cheio em menor harmônico (i VI V i) e arpejo, depois volta para a noite
    vitoria: {
      tonica: 57,
      modo: MODOS.menorHarmonico,
      bpm: { baixa: 84, media: 92, alta: 100 },
      batidas: 4,
      progressoes: [[0, 5, 4, 0]],
      transposicoes: [0, 2, -2],
      volume: 0.95,
      reverb: 0.6,
      pad: { volume: 0.3, brilho: 900, oitava: -1 },
      drone: null,
      conversa: 0,
      duracao: { compassos: 4, depois: "calmo" },
      compor(c) {
        const [r, t, q] = c.acorde;
        const n: Nota[] = [r - 12, r, t, q].map((m) => nota(0, "orgao", m, 3.8, 0.24));
        [r, t, q, r + 12, q, t].forEach((m, i) => n.push(nota(i * 0.5 + 1, "sinte", m + 12, 0.5, 0.2)));
        n.push(nota(0, "bumbo", 33, 1, 0.5));
        return n;
      },
    },

    // o Abismo: pad grave quase fechado, cluster de órgão, drone de trítono, ronco de cidade
    sombrio: {
      tonica: 45,
      modo: MODOS.frigio,
      bpm: { baixa: 40, media: 46, alta: 52 },
      batidas: 4,
      progressoes: [
        [0, 0, 1, 0],
        [0, 4, 0, 1],
      ],
      transposicoes: [0, 1, -1, 2],
      volume: 0.95,
      reverb: 0.75,
      pad: { volume: 0.32, brilho: 320, oitava: 0 },
      drone: { volume: 0.3, intervalos: [0, 6], oitava: -1 },
      conversa: 0,
      efeitos: { ambiente: [{ tipo: "cidade", volume: 1 }] },
      compor(c) {
        const r = c.acorde[0];
        const n: Nota[] = [nota(0, "baixoSinte", r - 12, 3, 0.3)];
        if (chance(c.rng, 0.5)) n.push(nota(0.5, "orgao", r, 3.5, 0.16), nota(0.5, "orgao", r + 1, 3.5, 0.14));
        if (chance(c.rng, 0.2 + 0.2 * c.densidade)) n.push(nota(c.rng() * 3, "sino", c.tonica + escolher(c.rng, [13, 18, 25]), 4, 0.1));
        return n;
      },
    },
  },
};

// ---------- horror dos anos 20 (Chamado/d100): drones, clusters, caixinha desafinada, teremim; gramofone no calmo ----------

const GRAMOFONE: Efeitos = { gramofone: true, ambiente: [{ tipo: "chiado", volume: 1 }] };

/** piano stride de gramofone: baixo no 1 e no 3, acorde no 2 e no 4 */
function stride(c: Contexto, n: Nota[], forca: number) {
  const [r, t, q, s] = tetrade(c);
  n.push(nota(0, "piano", r - 24, 1, 0.55 * forca), nota(2, "piano", (chance(c.rng, 0.5) ? q : r) - 24, 1, 0.5 * forca));
  for (const b of [1, 3]) for (const m of [t, q, s]) n.push(nota(b, "piano", m - 12, 0.8, 0.26 * forca));
}

const HORROR: Sotaque = {
  receitas: {
    // bar clandestino (speakeasy): piano stride no gramofone, conversa abafada
    taverna: {
      tonica: 60,
      modo: MODOS.maior,
      bpm: { baixa: 150, media: 168, alta: 184 },
      batidas: 4,
      progressoes: [
        [0, 5, 1, 4],
        [0, 3, 1, 4],
        [0, 0, 3, 4],
      ],
      transposicoes: [0, -2, 3, 5],
      volume: 0.95,
      reverb: 0.25,
      pad: null,
      drone: null,
      conversa: 0.55,
      efeitos: GRAMOFONE,
      compor(c) {
        const n: Nota[] = [];
        stride(c, n, 1);
        for (const b of [0, 0.66, 1.5, 2, 2.66, 3.5]) {
          if (!chance(c.rng, b % 1 ? 0.35 * c.densidade + 0.2 : 0.7)) continue;
          let g = passo(c, "melodia", 9, 16);
          if (b % 1 === 0) g = noAcorde(c, g);
          c.estado.melodia = g;
          n.push(nota(b, "piano", escala(c, g), 0.7, 0.36));
        }
        return n;
      },
    },

    // valsa de gramofone distante: bonita, um pouco triste, com chiado de disco
    calmo: {
      tonica: 58,
      modo: MODOS.maior,
      bpm: { baixa: 84, media: 90, alta: 98 },
      batidas: 3,
      progressoes: [
        [0, 5, 1, 4],
        [0, 3, 0, 4],
        [0, 5, 3, 4],
      ],
      transposicoes: [0, 2, -3],
      volume: 1.35,
      reverb: 0.45,
      pad: null,
      drone: null,
      conversa: 0,
      efeitos: GRAMOFONE,
      compor(c) {
        const [r, t, q, s] = tetrade(c);
        const n: Nota[] = [nota(0, "piano", r - 24, 1, 0.45)];
        for (const b of [1, 2]) for (const m of [t, q, s]) n.push(nota(b, "piano", m - 12, 0.9, 0.17));
        let g = noAcorde(c, passo(c, "melodia", 8, 14));
        c.estado.melodia = g;
        n.push(nota(0, "piano", escala(c, g), 1.5, 0.32));
        if (chance(c.rng, 0.4 + 0.4 * c.densidade)) {
          g = passo(c, "melodia", 8, 14);
          n.push(nota(escolher(c.rng, [1.5, 2]), "piano", escala(c, g), 1, 0.26));
        }
        return n;
      },
    },

    // casa velha: drone grave, pad escuro, caixinha desafinada perdida e um teremim de vez em quando
    exploracao: {
      tonica: 50,
      modo: MODOS.eolio,
      bpm: { baixa: 56, media: 62, alta: 70 },
      batidas: 4,
      progressoes: [
        [0, 5, 0, 3],
        [0, 1, 0, 5],
      ],
      transposicoes: [0, 2, -2, 3],
      volume: 0.85,
      reverb: 0.7,
      pad: { volume: 0.34, brilho: 420, oitava: -1 },
      drone: { volume: 0.3, intervalos: [0, 7], oitava: -2 },
      conversa: 0,
      compor(c) {
        const n: Nota[] = [];
        for (let b = 0; b < 4; b++) {
          if (chance(c.rng, 0.12 + 0.15 * c.densidade)) n.push(nota(b + c.rng() * 0.5, "caixinha", escala(c, passo(c, "melodia", 12, 19)), 2, 0.3));
        }
        if (chance(c.rng, 0.12)) n.push(nota(c.rng() * 2, "teremim", escala(c, passo(c, "teremim", 7, 12)), 3, 0.3));
        if (chance(c.rng, 0.25)) n.push(nota(0, "baixo", c.acorde[0] - 24, 3.5, 0.3));
        return n;
      },
    },

    // caixinha de música desafinada tocando sozinha, teremim deslizando, drone
    misterio: {
      tonica: 57,
      modo: MODOS.menorHarmonico,
      bpm: { baixa: 62, media: 68, alta: 74 },
      batidas: 4,
      progressoes: [
        [0, 3, 4, 0],
        [0, 5, 4, 0],
      ],
      transposicoes: [0, 2, -3, 5],
      volume: 1.25,
      reverb: 0.72,
      pad: { volume: 0.26, brilho: 380, oitava: -1 },
      drone: { volume: 0.22, intervalos: [0], oitava: -2 },
      conversa: 0,
      compor(c) {
        const n: Nota[] = [];
        for (let b = 0; b < 4; b++) {
          if (!chance(c.rng, 0.5 + 0.3 * c.densidade)) continue;
          let g = passo(c, "melodia", 9, 16);
          if (b === 0) g = noAcorde(c, g);
          c.estado.melodia = g;
          n.push(nota(b, "caixinha", escala(c, g) + 12, 1, 0.34));
        }
        if (chance(c.rng, 0.18)) n.push(nota(1 + c.rng() * 2, "teremim", escala(c, passo(c, "teremim", 7, 12)) + 12, 2.5, 0.3));
        return n;
      },
    },

    // coração batendo, cluster de cordas inchando, drone de segunda menor, teremim
    tensao: {
      tonica: 50,
      modo: MODOS.frigio,
      bpm: { baixa: 60, media: 72, alta: 88 },
      batidas: 4,
      progressoes: [
        [0, 0, 1, 0],
        [0, 1, 0, 6],
      ],
      transposicoes: [0, 1, -2, 3],
      volume: 0.9,
      reverb: 0.5,
      pad: { volume: 0.2, brilho: 460, oitava: -1 },
      drone: { volume: 0.26, intervalos: [0, 1], oitava: -2 },
      conversa: 0,
      compor(c) {
        const r = c.acorde[0];
        const n: Nota[] = [];
        for (const b of c.densidade > 0.9 ? [0, 1, 2, 3] : [0, 2]) n.push(nota(b, "coracao", 0, 1, 0.8), nota(b + 0.28, "coracao", 0, 1, 0.5));
        if (c.compasso % 2 === 0) n.push(nota(0, "cordas", r, 4, 0.2), nota(0, "cordas", r + 1, 4, 0.18), nota(0, "cordas", r + 6, 4, 0.14));
        if (chance(c.rng, 0.22)) n.push(nota(1 + c.rng() * 2, "teremim", r + escolher(c.rng, [12, 13, 18]), 2.5, 0.28));
        return n;
      },
    },

    // pânico: cordas em golpes de cluster, grave pulsando, piano martelado, teremim gritando
    combate: {
      tonica: 50,
      modo: MODOS.menorHarmonico,
      bpm: { baixa: 250, media: 276, alta: 300 },
      batidas: 8,
      progressoes: [
        [0, 0, 1, 0],
        [0, 5, 1, 4],
      ],
      transposicoes: [0, 1, -2, 3],
      volume: 0.62,
      reverb: 0.3,
      pad: null,
      drone: { volume: 0.2, intervalos: [0, 1], oitava: -2 },
      conversa: 0,
      compor(c) {
        const r = c.acorde[0];
        const n: Nota[] = [];
        for (let b = 0; b < 8; b++) n.push(nota(b, "pulso", r - 12, 0.9, b % 2 ? 0.28 : 0.4));
        for (const b of [0, 3, 6]) {
          n.push(nota(b, "cordas", r, 0.6, 0.38), nota(b, "cordas", r + 1, 0.6, 0.32), nota(b, "cordas", r + 6, 0.6, 0.28));
          n.push(nota(b, "bumbo", 33, 1, 0.6));
        }
        if (chance(c.rng, c.densidade)) n.push(nota(7, "caixa", 0, 1, 0.3));
        if (c.compasso % 2 === 0) for (const m of [r - 24, r - 23, r - 18]) n.push(nota(0, "piano", m, 3, 0.5));
        if (chance(c.rng, 0.25 + 0.2 * c.densidade)) n.push(nota(c.rng() * 6, "teremim", r + escolher(c.rng, [18, 24, 25]), 2, 0.3));
        return n;
      },
    },

    // canção de ninar na caixinha, devagar, com pad
    triste: {
      tonica: 57,
      modo: MODOS.eolio,
      bpm: { baixa: 52, media: 58, alta: 64 },
      batidas: 4,
      progressoes: [
        [0, 5, 2, 6],
        [0, 3, 0, 4],
      ],
      transposicoes: [0, -2, 2, 5],
      volume: 1.35,
      reverb: 0.65,
      pad: { volume: 0.34, brilho: 600, oitava: -1 },
      drone: null,
      conversa: 0,
      compor(c) {
        const n: Nota[] = [];
        const ritmo = escolher(c.rng, [
          [0, 1, 2],
          [0, 2],
          [0, 1.5, 2, 3],
        ]);
        for (const b of ritmo) {
          let g = passo(c, "melodia", 8, 14, 0.06);
          if (b === 0) g = noAcorde(c, g);
          c.estado.melodia = g;
          n.push(nota(b, "caixinha", escala(c, g) + 12, 2, 0.34));
        }
        n.push(nota(0, "piano", c.acorde[0] - 24, 3, 0.3));
        return n;
      },
    },

    // alívio: acordes de piano no gramofone (I IV V I) e volta para a calmaria
    vitoria: {
      tonica: 60,
      modo: MODOS.maior,
      bpm: { baixa: 92, media: 100, alta: 108 },
      batidas: 4,
      progressoes: [[0, 3, 4, 0]],
      transposicoes: [0, 2, -2],
      volume: 1.1,
      reverb: 0.4,
      pad: null,
      drone: null,
      conversa: 0,
      efeitos: GRAMOFONE,
      duracao: { compassos: 4, depois: "calmo" },
      compor(c) {
        const [r, t, q, s] = tetrade(c);
        const n: Nota[] = [nota(0, "piano", r - 24, 2, 0.5)];
        for (const m of [r, t, q, c.compasso === 3 ? r + 12 : s]) n.push(nota(0, "piano", m, 2, 0.28));
        [r, t, q].forEach((m, i) => n.push(nota(2 + i * 0.5, "piano", m + 12, 1, 0.24)));
        return n;
      },
    },

    // o que não tem nome: drone de cluster, pad quase fechado, teremim grave, coração lento
    sombrio: {
      tonica: 43,
      modo: MODOS.frigio,
      bpm: { baixa: 40, media: 46, alta: 52 },
      batidas: 4,
      progressoes: [
        [0, 0, 1, 0],
        [0, 4, 0, 1],
      ],
      transposicoes: [0, 1, -1, 2],
      volume: 0.95,
      reverb: 0.75,
      pad: { volume: 0.28, brilho: 300, oitava: 0 },
      drone: { volume: 0.3, intervalos: [0, 1, 6], oitava: -1 },
      conversa: 0,
      compor(c) {
        const r = c.acorde[0];
        const n: Nota[] = [nota(0, "coracao", 0, 1, 0.6), nota(0.3, "coracao", 0, 1, 0.38)];
        if (chance(c.rng, 0.3)) n.push(nota(c.rng() * 2, "teremim", r + escolher(c.rng, [0, 6, 12]), 3, 0.26));
        if (chance(c.rng, 0.2)) n.push(nota(c.rng() * 3, "sino", c.tonica + escolher(c.rng, [13, 18]), 4, 0.1));
        return n;
      },
    },
  },
};

// ---------- dungeon synth (OSR): quadradas e triângulos crus, eólio, mais lento, fita cassete gasta ----------

const FITA: Efeitos = { fita: true, ambiente: [{ tipo: "fita", volume: 1 }] };

const DUNGEON: Sotaque = {
  trocas: { alaude: "quadrada", harpa: "flauta", metal: "quadrada", copo: "sino" },
  ajuste: (r, humor) => ({
    modo: humor === "taverna" || humor === "calmo" ? MODOS.eolio : r.modo,
    // o pad de quadrada da calmaria enche mais que a serra
    volume: humor === "calmo" ? r.volume * 0.8 : r.volume,
    bpm: escalaBpm(r.bpm, 0.85),
    reverb: Math.min(0.92, r.reverb * 1.25 + 0.08),
    pad: r.pad ? { ...r.pad, timbre: "quadrada" } : null,
    drone: r.drone ? { ...r.drone, timbre: "cru" } : null,
    conversa: 0,
    efeitos: FITA,
  }),
  receitas: {
    // o clássico: acordes de pad crus, melodia em triângulo, tímpano grave, eco de masmorra
    exploracao: {
      tonica: 50,
      modo: MODOS.eolio,
      bpm: { baixa: 54, media: 60, alta: 66 },
      batidas: 4,
      progressoes: [
        [0, 5, 3, 4],
        [0, 6, 5, 4],
        [0, 3, 6, 0],
      ],
      transposicoes: [0, 2, -2, 3],
      volume: 0.85,
      reverb: 0.72,
      pad: { volume: 0.5, brilho: 1100, oitava: -1, timbre: "quadrada" },
      drone: { volume: 0.22, intervalos: [0], oitava: -2, timbre: "cru" },
      conversa: 0,
      efeitos: FITA,
      compor(c) {
        const n: Nota[] = [nota(0, "quadrada", c.acorde[0] - 12, 3.8, 0.3)];
        for (let b = 0; b < 4; b++) {
          if (b > 0 && !chance(c.rng, 0.4 + 0.35 * c.densidade)) continue;
          let g = passo(c, "melodia", 7, 14);
          if (b === 0) g = noAcorde(c, g);
          c.estado.melodia = g;
          n.push(nota(b, "flauta", escala(c, g), chance(c.rng, 0.5) ? 2 : 1, 0.3));
        }
        if (chance(c.rng, 0.4)) n.push(nota(0, "tambor", 38, 1, 0.5));
        return n;
      },
    },
  },
};

// ---------- aventura pulp (Fate): metais brilhantes, caixa de marcha, andamento de seriado de matinê ----------

const PULP: Sotaque = {
  ajuste: (r, humor) => ({ bpm: escalaBpm(r.bpm, 1.12), volume: humor === "misterio" ? r.volume * 1.25 : r.volume }),
  extras: {
    tensao(c) {
      const n: Nota[] = [];
      for (let b = 0; b < 4; b += 0.5) n.push(nota(b, "caixa", 0, 1, 0.1 + 0.08 * c.densidade + (b === 3.5 ? 0.08 : 0)));
      return n;
    },
    misterio: (c) => (chance(c.rng, 0.35) ? [nota(0, "piano", c.acorde[0] - 12, 3, 0.26), nota(0, "piano", c.acorde[2] - 12, 3, 0.2)] : []),
  },
  receitas: {
    // cassino/bar dos anos 30: piano em swing, baixo andando, prato, trompete abafado de vez em quando
    taverna: {
      tonica: 60,
      modo: MODOS.maior,
      bpm: { baixa: 140, media: 156, alta: 172 },
      batidas: 4,
      progressoes: [
        [1, 4, 0, 0],
        [0, 5, 1, 4],
        [0, 3, 1, 4],
      ],
      transposicoes: [0, -2, 3, 5],
      volume: 0.9,
      reverb: 0.25,
      pad: null,
      drone: null,
      conversa: 0.8,
      compor(c) {
        const [r, t, q, s] = tetrade(c);
        const n: Nota[] = [];
        [0, 2, 4, 5].forEach((d, b) => n.push(nota(b, "baixo", grauParaMidi(c.tonica, c.modo, c.grauAcorde + d) - 24, 0.9, 0.42)));
        for (const b of [0.66, 2.66]) if (chance(c.rng, 0.7)) for (const m of [t, q, s]) n.push(nota(b, "piano", m - 12, 0.5, 0.22));
        for (const b of [0, 1, 1.66, 2, 3, 3.66]) n.push(nota(b, "chocalho", 0, 0.3, b % 1 ? 0.22 : 0.32));
        if (chance(c.rng, 0.35 + 0.3 * c.densidade)) {
          const g = noAcorde(c, passo(c, "melodia", 7, 12));
          n.push(nota(escolher(c.rng, [0, 1.66]), "metal", escala(c, g), 1.2, 0.28));
        }
        if (chance(c.rng, 0.5)) n.push(nota(escolher(c.rng, [0.66, 1.66, 2.66]), "piano", r + 12, 0.4, 0.22));
        return n;
      },
    },

    // marcha de aventura: caixa, bumbo, baixo andando e o tema heroico nos metais
    exploracao: {
      tonica: 60,
      modo: MODOS.mixolidio,
      bpm: { baixa: 108, media: 118, alta: 128 },
      batidas: 4,
      progressoes: [
        [0, 3, 4, 0],
        [0, 6, 3, 4],
        [0, 4, 3, 0],
      ],
      transposicoes: [0, 2, -2, 3],
      volume: 0.82,
      reverb: 0.32,
      pad: { volume: 0.25, brilho: 1300, oitava: -1, timbre: "cordas" },
      drone: null,
      conversa: 0,
      compor(c) {
        const n: Nota[] = [];
        n.push(nota(0, "bumbo", 33, 1, 0.5), nota(2, "bumbo", 33, 1, 0.45));
        for (const [b, v] of [
          [0, 0.4],
          [1, 0.32],
          [1.5, 0.2],
          [2, 0.36],
          [3, 0.32],
          [3.5, 0.22],
          [3.75, 0.24],
        ] as const)
          if (b % 1 === 0 || chance(c.rng, 0.4 + 0.5 * c.densidade)) n.push(nota(b, "caixa", 0, 1, v));
        [0, 2, 4, 5].forEach((d, b) => n.push(nota(b, "baixo", grauParaMidi(c.tonica, c.modo, c.grauAcorde + d) - 24, 0.9, 0.36)));
        for (const [b, d] of [
          [0, 1.5],
          [1.5, 0.5],
          [2, 2],
        ] as const) {
          if (b > 0 && !chance(c.rng, 0.55 + 0.35 * c.densidade)) continue;
          let g = passo(c, "melodia", 7, 13);
          if (b !== 1.5) g = noAcorde(c, g);
          c.estado.melodia = g;
          n.push(nota(b, "metal", escala(c, g), d, 0.3));
        }
        return n;
      },
    },

    // briga de seriado: caixa galopando, golpes de metais, baixo em ostinato
    combate: {
      tonica: 50,
      modo: MODOS.dorico,
      bpm: { baixa: 280, media: 304, alta: 330 },
      batidas: 8,
      progressoes: [
        [0, 0, 6, 0],
        [0, 3, 0, 6],
        [0, 6, 5, 6],
      ],
      transposicoes: [0, 2, -2, 3],
      volume: 0.6,
      reverb: 0.22,
      pad: null,
      drone: null,
      conversa: 0,
      compor(c) {
        const [r, t, q] = c.acorde;
        const n: Nota[] = [];
        [0, 0, 7, 0, 10, 0, 7, 5].forEach((iv, b) => n.push(nota(b, "baixo", r - 24 + iv, 0.9, b % 3 === 0 ? 0.45 : 0.3)));
        for (let b = 0; b < 8; b++) if (b % 3 === 0 || chance(c.rng, 0.45 + 0.4 * c.densidade)) n.push(nota(b, "caixa", 0, 1, b % 3 === 0 ? 0.36 : 0.2));
        for (const b of [0, 3, 6]) n.push(nota(b, "bumbo", 33, 1, 0.55));
        for (const b of c.compasso % 2 === 0 ? [0, 3] : [0, 6]) for (const m of [r, t, q]) n.push(nota(b, "metal", m, b === 0 ? 1.5 : 1, 0.3));
        return n;
      },
    },
  },
};

// ---------- folk (Dungeon World/PbtA): rabeca, tambor de moldura, bordões ----------

const BORDAO = { volume: 0.22, intervalos: [0, 7], oitava: -2, timbre: "gaita" } as const;

const FOLK: Sotaque = {
  trocas: { flauta: "rabeca", metal: "rabeca" },
  ajuste: (r, humor) => ({
    drone: r.drone ? { ...r.drone, timbre: "gaita" } : humor === "calmo" || humor === "triste" || humor === "misterio" ? { ...BORDAO, intervalos: [...BORDAO.intervalos] } : null,
  }),
  extras: {
    exploracao(c) {
      const n = [nota(0, "tambor", 40, 1, 0.55), nota(4, "tambor", 40, 1, 0.45)];
      if (chance(c.rng, 0.4 + 0.5 * c.densidade)) n.push(nota(3, "tambor", 47, 1, 0.25), nota(7, "tambor", 47, 1, 0.25));
      return n;
    },
    combate(c) {
      const n: Nota[] = [];
      for (let b = 0; b < 8; b++) if (b % 3 === 0 || chance(c.rng, 0.5 * c.densidade)) n.push(nota(b, "tambor", b % 3 === 0 ? 40 : 47, 1, b % 3 === 0 ? 0.6 : 0.3));
      return n;
    },
  },
  receitas: {
    // jiga de rabeca: alaúde no acompanhamento, rabeca na melodia, tambor de moldura e bordão
    taverna: {
      ...RECEITAS.taverna,
      drone: { ...BORDAO, intervalos: [...BORDAO.intervalos] },
      conversa: 0.8,
      compor(c) {
        const [r, t, q] = c.acorde;
        const n: Nota[] = [nota(0, "alaude", r - 12, 3, 0.55), nota(3, "alaude", (chance(c.rng, 0.5) ? q : r) - 12, 3, 0.45)];
        for (const b of [1, 2, 4, 5]) if (chance(c.rng, 0.4 + 0.4 * c.densidade)) n.push(nota(b, "alaude", escolher(c.rng, [t, q]), 1.5, 0.24));
        for (const b of [0, 1, 2, 3, 4, 5]) {
          const forte = b === 0 || b === 3;
          if (!chance(c.rng, forte ? 0.9 : 0.55 * c.densidade + 0.2)) continue;
          let g = passo(c, "melodia", 4, 13);
          if (forte) g = noAcorde(c, g);
          c.estado.melodia = g;
          n.push(nota(b, "rabeca", escala(c, g), forte ? 1.6 : 0.9, forte ? 0.4 : 0.3));
        }
        n.push(nota(0, "tambor", 40, 1, 0.65), nota(3, "tambor", 40, 1, 0.5));
        if (chance(c.rng, c.densidade)) n.push(nota(5, "tambor", 47, 1, 0.35));
        return n;
      },
    },
  },
};

const SOTAQUES: Record<EstiloMusical, Sotaque> = {
  fantasia: FANTASIA,
  epico: EPICO,
  gotico: GOTICO,
  horror: HORROR,
  dungeon: DUNGEON,
  pulp: PULP,
  folk: FOLK,
};

const cache = new Map<string, Receita>();

/** receita de um humor no estilo de um sistema (memorizada: o compor embrulhado é sempre o mesmo) */
export function receitaDoEstilo(estilo: EstiloMusical, humor: HumorMusical): Receita {
  const chave = `${estilo}:${humor}`;
  const pronta = cache.get(chave);
  if (pronta) return pronta;
  const s = SOTAQUES[estilo] ?? FANTASIA;
  const propria = s.receitas?.[humor];
  const base = RECEITAS[humor];
  let r: Receita = propria ?? { ...base, ...(s.ajuste?.(base, humor) ?? {}) };
  const trocas = propria ? undefined : s.trocas;
  const extra = s.extras?.[humor];
  if (trocas || extra) {
    const compor = r.compor;
    r = {
      ...r,
      compor(c) {
        let notas = compor(c);
        if (trocas) notas = notas.map((n) => (trocas[n.instrumento] ? { ...n, instrumento: trocas[n.instrumento]! } : n));
        return extra ? notas.concat(extra(c)) : notas;
      },
    };
  }
  cache.set(chave, r);
  return r;
}
