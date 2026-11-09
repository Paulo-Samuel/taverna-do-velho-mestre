// Lógica pura da capa de aventura: da semente (id da aventura) e do tema do sistema sai sempre a mesma composição.
// Sem imports, sem React: o componente (src/components/aventuras/capa-aventura.tsx) só desenha o que sai daqui.
// Cores ficam como CSS vars do tema (o cartão carrega data-tema), nunca em hexadecimal.

export type Motivo = "livro" | "espada" | "dado" | "torre" | "arco" | "olho" | "estrela" | "pinheiros" | "lua";

export const LARGURA = 320;
export const ALTURA = 160;

const MOTIVO_DO_SISTEMA: Record<string, Motivo> = {
  historia: "livro",
  dnd5e: "espada",
  pf2e: "dado",
  pf1e: "torre",
  osr: "arco",
  d100: "olho",
  fate: "estrela",
  pbta: "pinheiros",
  vtm5: "lua",
};

/** Hash FNV-1a de 32 bits: estável entre execuções e plataformas. */
export function semente(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function sorteador(s: number): () => number {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Camada = {
  d: string;
  /** mistura do token com o fundo, 0 a 100 */
  mistura: number;
  token: "ambar" | "ambar-forte" | "sangue" | "pergaminho" | "border";
};

export type Capa = {
  semente: number;
  motivo: Motivo;
  /** inclinação do degradê em graus */
  angulo: number;
  /** quanto do âmbar tinge o céu, 0 a 100 */
  brilho: number;
  astro: { cx: number; cy: number; r: number };
  /** serras ao fundo e à frente */
  serras: Camada[];
  /** silhueta do sistema */
  silhueta: Camada;
  /** pontos de luz (estrelas, fagulhas) */
  pontos: { cx: number; cy: number; r: number }[];
};

const n = (v: number) => Math.round(v * 10) / 10;

function serra(rnd: () => number, base: number, altura: number, passos: number): string {
  let d = `M0 ${ALTURA} L0 ${n(base)}`;
  for (let i = 1; i <= passos; i++) {
    const x = (LARGURA / passos) * i;
    const y = base - rnd() * altura;
    d += ` L${n(x)} ${n(y)}`;
  }
  return `${d} L${LARGURA} ${ALTURA} Z`;
}

/** Silhueta do motivo, centrada em cx, com o pé em y=base e altura aproximada h. */
export function caminhoDoMotivo(motivo: Motivo, cx: number, base: number, h: number): string {
  const t = h / 100;
  const X = (v: number) => n(cx + v * t);
  const Y = (v: number) => n(base - v * t);
  switch (motivo) {
    case "espada":
      return `M${X(0)} ${Y(100)} L${X(7)} ${Y(82)} L${X(7)} ${Y(38)} L${X(26)} ${Y(38)} L${X(26)} ${Y(30)} L${X(5)} ${Y(30)} L${X(5)} ${Y(8)} L${X(10)} ${Y(8)} L${X(10)} ${Y(0)} L${X(-10)} ${Y(0)} L${X(-10)} ${Y(8)} L${X(-5)} ${Y(8)} L${X(-5)} ${Y(30)} L${X(-26)} ${Y(30)} L${X(-26)} ${Y(38)} L${X(-7)} ${Y(38)} L${X(-7)} ${Y(82)} Z`;
    case "dado":
      return `M${X(0)} ${Y(100)} L${X(44)} ${Y(76)} L${X(44)} ${Y(26)} L${X(0)} ${Y(0)} L${X(-44)} ${Y(26)} L${X(-44)} ${Y(76)} Z M${X(0)} ${Y(80)} L${X(28)} ${Y(36)} L${X(-28)} ${Y(36)} Z`;
    case "torre":
      return `M${X(-22)} ${Y(0)} L${X(-22)} ${Y(78)} L${X(-30)} ${Y(78)} L${X(-30)} ${Y(100)} L${X(-18)} ${Y(100)} L${X(-18)} ${Y(90)} L${X(-8)} ${Y(90)} L${X(-8)} ${Y(100)} L${X(8)} ${Y(100)} L${X(8)} ${Y(90)} L${X(18)} ${Y(90)} L${X(18)} ${Y(100)} L${X(30)} ${Y(100)} L${X(30)} ${Y(78)} L${X(22)} ${Y(78)} L${X(22)} ${Y(0)} Z`;
    case "arco":
      return `M${X(-40)} ${Y(0)} L${X(-40)} ${Y(100)} L${X(40)} ${Y(100)} L${X(40)} ${Y(0)} L${X(22)} ${Y(0)} L${X(22)} ${Y(58)} A${n(22 * t)} ${n(22 * t)} 0 0 0 ${X(-22)} ${Y(58)} L${X(-22)} ${Y(0)} Z`;
    case "olho":
      return `M${X(-52)} ${Y(50)} Q${X(0)} ${Y(110)} ${X(52)} ${Y(50)} Q${X(0)} ${Y(-10)} ${X(-52)} ${Y(50)} Z M${X(0)} ${Y(72)} A${n(22 * t)} ${n(22 * t)} 0 1 0 ${X(0)} ${Y(28)} A${n(22 * t)} ${n(22 * t)} 0 1 0 ${X(0)} ${Y(72)} Z`;
    case "estrela": {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = (i % 2 === 0 ? 50 : 21) * t;
        pts.push(`${n(cx + Math.cos(ang) * r)} ${n(base - 50 * t + Math.sin(ang) * r)}`);
      }
      return `M${pts.join(" L")} Z`;
    }
    case "pinheiros": {
      const pino = (dx: number, esc: number) => {
        const x = (v: number) => n(cx + (dx + v * esc) * t);
        const y = (v: number) => n(base - v * esc * t);
        return `M${x(-26)} ${y(30)} L${x(0)} ${y(100)} L${x(26)} ${y(30)} L${x(12)} ${y(30)} L${x(30)} ${y(0)} L${x(-30)} ${y(0)} L${x(-12)} ${y(30)} Z`;
      };
      return `${pino(-44, 0.7)} ${pino(0, 1)} ${pino(46, 0.62)}`;
    }
    case "lua": {
      const r = 46 * t;
      const cy = base - 54 * t;
      return `M${n(cx + r * 0.3)} ${n(cy - r)} A${n(r)} ${n(r)} 0 1 0 ${n(cx + r * 0.3)} ${n(cy + r)} A${n(r * 0.78)} ${n(r * 0.78)} 0 1 1 ${n(cx + r * 0.3)} ${n(cy - r)} Z`;
    }
    case "livro":
    default:
      return `M${X(0)} ${Y(30)} Q${X(-30)} ${Y(52)} ${X(-60)} ${Y(40)} L${X(-60)} ${Y(0)} Q${X(-30)} ${Y(12)} ${X(0)} ${Y(-4)} Q${X(30)} ${Y(12)} ${X(60)} ${Y(0)} L${X(60)} ${Y(40)} Q${X(30)} ${Y(52)} ${X(0)} ${Y(30)} Z`;
  }
}

/** Composição completa da capa: pura e determinística (mesmo id e sistema, mesmo resultado). */
export function gerarCapa(id: string, sistemaId: string): Capa {
  const s = semente(`${sistemaId}:${id}`);
  const rnd = sorteador(s);
  const motivo = MOTIVO_DO_SISTEMA[sistemaId] ?? "estrela";
  const angulo = Math.round(150 + rnd() * 60);
  const brilho = Math.round(18 + rnd() * 30);
  const astro = { cx: n(30 + rnd() * 260), cy: n(24 + rnd() * 34), r: n(9 + rnd() * 12) };
  const serras: Camada[] = [
    { d: serra(rnd, 128, 46, 6 + Math.floor(rnd() * 4)), mistura: Math.round(22 + rnd() * 10), token: "border" },
    { d: serra(rnd, 146, 28, 8 + Math.floor(rnd() * 5)), mistura: Math.round(10 + rnd() * 8), token: "border" },
  ];
  const h = Math.round(70 + rnd() * 18);
  const cx = n(110 + rnd() * 100);
  const silhueta: Camada = { d: caminhoDoMotivo(motivo, cx, 150, h), mistura: Math.round(78 + rnd() * 14), token: "ambar" };
  const qtd = 9 + Math.floor(rnd() * 8);
  const pontos = Array.from({ length: qtd }, () => ({ cx: n(rnd() * LARGURA), cy: n(rnd() * 90), r: n(0.7 + rnd() * 1.1) }));
  return { semente: s, motivo, angulo, brilho, astro, serras, silhueta, pontos };
}
