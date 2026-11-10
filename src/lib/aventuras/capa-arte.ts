// Lógica pura da capa de aventura: da semente (id da aventura) e do tema do sistema sai sempre a mesma composição.
// Sem imports, sem React: o componente (src/components/aventuras/capa-aventura.tsx) só desenha o que sai daqui.
// Cores ficam como CSS vars do tema (o cartão carrega data-tema), nunca em hexadecimal.

export type Motivo =
  | "livro"
  | "espada"
  | "dado"
  | "torre"
  | "arco"
  | "olho"
  | "estrela"
  | "pinheiros"
  | "lua"
  | "lanterna"
  | "sino"
  | "mascara"
  | "cabana"
  | "taca"
  | "predios"
  | "caixao";

export type Horizonte = "serras" | "mar" | "cidade";
export type TipoDeAstro = "cheio" | "crescente" | "duplo";
export type TokenDoCeu = "ambar-forte" | "sangue" | "border";

export const LARGURA = 320;
export const ALTURA = 160;

/** Cada sistema tem o seu repertório de silhuetas; a semente escolhe uma quando a aventura não está na tabela abaixo. */
export const MOTIVOS_DO_SISTEMA: Record<string, readonly Motivo[]> = {
  historia: ["livro", "lanterna", "sino", "cabana"],
  dnd5e: ["espada", "torre", "taca", "lanterna"],
  pf2e: ["dado", "lanterna", "arco", "espada"],
  pf1e: ["torre", "pinheiros", "livro"],
  osr: ["arco", "caixao", "torre"],
  d100: ["olho", "predios", "caixao"],
  fate: ["estrela", "mascara", "predios"],
  pbta: ["pinheiros", "cabana", "arco"],
  vtm5: ["lua", "taca", "predios", "caixao"],
};

/** Silhueta que casa com o título de cada aventura da casa. Id fora da tabela cai na semente. */
export const MOTIVO_DA_AVENTURA: Record<string, Motivo> = {
  // modo história
  "lanterna-da-ponte-velha": "lanterna",
  "sino-afogado": "sino",
  "heranca-da-bruxa-do-brejo": "cabana",
  "ultimo-baile-do-castelo-corvo": "torre",
  // fantasia
  "mina-que-canta": "lanterna",
  "casamento-do-rei-goblin": "taca",
  "torre-do-mago-endividado": "torre",
  "lobo-de-tres-invernos": "pinheiros",
  "cripta-do-abade-guloso": "caixao",
  "ilha-do-farol-apagado": "torre",
  "porta-no-fundo-do-poco": "arco",
  "cacada-ao-cervo-de-prata": "pinheiros",
  // pathfinder 2e
  "feira-dos-automatos": "dado",
  "kobolds-pedem-socorro": "arco",
  "barco-das-doze-lanternas": "lanterna",
  "forja-afundada": "espada",
  // investigação e pulp
  "ultima-transmissao-de-vila-esperanca": "olho",
  "cripta-fora-da-planta": "caixao",
  "roubo-do-cristo-redentor": "mascara",
  "corrida-para-a-cidade-de-ouro": "estrela",
  // vampiro
  "noite-de-sangue-em-brasilia": "lua",
  "rostos-que-nao-envelhecem": "mascara",
  "cinzas-na-lapa": "caixao",
  "primeira-noite-em-bh": "predios",
  "lista-de-nomes-no-recife": "taca",
  "carregamento-em-manaus": "caixao",
};

/** Paisagem ao fundo que casa com o cenário de cada aventura da casa. Id fora da tabela cai na semente. */
export const HORIZONTE_DA_AVENTURA: Record<string, Horizonte> = {
  "lanterna-da-ponte-velha": "serras",
  "sino-afogado": "mar",
  "heranca-da-bruxa-do-brejo": "serras",
  "ultimo-baile-do-castelo-corvo": "cidade",
  "mina-que-canta": "serras",
  "casamento-do-rei-goblin": "serras",
  "torre-do-mago-endividado": "serras",
  "lobo-de-tres-invernos": "serras",
  "cripta-do-abade-guloso": "serras",
  "ilha-do-farol-apagado": "mar",
  "porta-no-fundo-do-poco": "serras",
  "cacada-ao-cervo-de-prata": "serras",
  "feira-dos-automatos": "cidade",
  "kobolds-pedem-socorro": "serras",
  "barco-das-doze-lanternas": "mar",
  "forja-afundada": "mar",
  "ultima-transmissao-de-vila-esperanca": "serras",
  "cripta-fora-da-planta": "cidade",
  "roubo-do-cristo-redentor": "cidade",
  "corrida-para-a-cidade-de-ouro": "serras",
  "noite-de-sangue-em-brasilia": "cidade",
  "rostos-que-nao-envelhecem": "cidade",
  "cinzas-na-lapa": "cidade",
  "primeira-noite-em-bh": "serras",
  "lista-de-nomes-no-recife": "mar",
  "carregamento-em-manaus": "mar",
};

/** Meia largura de cada silhueta, na escala de `caminhoDoMotivo` (altura = 100): serve para afastar o astro dela. */
const MEIA_LARGURA: Record<Motivo, number> = {
  livro: 60,
  espada: 26,
  dado: 44,
  torre: 30,
  arco: 40,
  olho: 52,
  estrela: 48,
  pinheiros: 65,
  lua: 46,
  lanterna: 26,
  sino: 42,
  mascara: 53,
  cabana: 46,
  taca: 28,
  predios: 50,
  caixao: 28,
};

const HORIZONTES: readonly Horizonte[] = ["serras", "mar", "cidade"];
const ASTROS: readonly TipoDeAstro[] = ["cheio", "crescente", "duplo"];
const CEUS: readonly TokenDoCeu[] = ["ambar-forte", "sangue", "border"];

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
  horizonte: Horizonte;
  /** inclinação do degradê em graus */
  angulo: number;
  /** quanto da cor do céu tinge o degradê, 0 a 100 */
  brilho: number;
  /** token que tinge o céu */
  ceu: TokenDoCeu;
  /** cheio, crescente ou duplo; `d` já traz o desenho pronto */
  astro: { cx: number; cy: number; r: number; tipo: TipoDeAstro; d: string };
  /** camadas do horizonte, do fundo para a frente (serras, mar com reflexo ou prédios com janelas) */
  camadas: Camada[];
  /** silhueta da aventura; `contorno` é quanto de pergaminho entra no fio em volta (0 = sem fio) */
  silhueta: Camada & { contorno: number };
  /** pontos de luz (estrelas, fagulhas) */
  pontos: { cx: number; cy: number; r: number }[];
};

const n = (v: number) => Math.round(v * 10) / 10;

const retangulo = (x: number, y: number, l: number, a: number) =>
  `M${n(x)} ${n(y)} L${n(x + l)} ${n(y)} L${n(x + l)} ${n(y + a)} L${n(x)} ${n(y + a)} Z`;

const circulo = (cx: number, cy: number, r: number) =>
  `M${n(cx - r)} ${n(cy)} A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)} A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)} Z`;

// Crescente de verdade: o disco de raio r menos um disco menor deslocado para a direita. (A versão antiga ligava dois
// pontos a 2r de distância com arcos de raio r: dava dois semicírculos iguais, área zero, e a lua sumia.)
const crescente = (cx: number, cy: number, r: number) => {
  const desloca = 0.45;
  const menor = 0.8;
  const x = (1 - menor * menor + desloca * desloca) / (2 * desloca);
  const y = Math.sqrt(1 - x * x);
  return `M${n(cx + x * r)} ${n(cy - y * r)} A${n(r)} ${n(r)} 0 1 0 ${n(cx + x * r)} ${n(cy + y * r)} A${n(menor * r)} ${n(menor * r)} 0 1 1 ${n(cx + x * r)} ${n(cy - y * r)} Z`;
};

function serra(rnd: () => number, base: number, altura: number, passos: number): string {
  let d = `M0 ${ALTURA} L0 ${n(base)}`;
  for (let i = 1; i <= passos; i++) {
    const x = (LARGURA / passos) * i;
    const y = base - rnd() * altura;
    d += ` L${n(x)} ${n(y)}`;
  }
  return `${d} L${LARGURA} ${ALTURA} Z`;
}

/** Fileira de prédios (telhados retos) e as janelas acesas de alguns deles. */
function fileiraDePredios(rnd: () => number, base: number, altura: number): { d: string; janelas: string } {
  let d = `M0 ${ALTURA}`;
  const janelas: string[] = [];
  let x = 0;
  while (x < LARGURA) {
    const l = 14 + rnd() * 22;
    const sobe = 8 + rnd() * (altura - 8);
    const y = base - sobe;
    d += ` L${n(x)} ${n(y)} L${n(Math.min(x + l, LARGURA))} ${n(y)}`;
    if (sobe > 20 && rnd() > 0.35) janelas.push(retangulo(x + l * 0.28, y + 6, 3, 4));
    if (sobe > 32 && rnd() > 0.5) janelas.push(retangulo(x + l * 0.6, y + 16, 3, 4));
    x += l;
  }
  return { d: `${d} L${LARGURA} ${ALTURA} Z`, janelas: janelas.join(" ") };
}

function camadasDoHorizonte(horizonte: Horizonte, rnd: () => number, astro: { cx: number; r: number }): Camada[] {
  const fundo = Math.round(22 + rnd() * 10);
  const frente = Math.round(10 + rnd() * 8);
  if (horizonte === "mar") {
    // costa distante, linha d'água, reflexo do astro em tracinhos e uma praia escura onde a silhueta pisa
    const linha = 118;
    const tracos: string[] = [];
    for (let i = 0; i < 5; i++) {
      const meia = astro.r * (1.5 - i * 0.22) + rnd() * 3;
      tracos.push(retangulo(astro.cx - meia + (rnd() - 0.5) * 4, linha + 4 + i * 6, meia * 2, 1.6));
    }
    return [
      { d: serra(rnd, linha + 2, 20, 6 + Math.floor(rnd() * 4)), mistura: fundo, token: "border" },
      { d: retangulo(0, linha, LARGURA, ALTURA - linha), mistura: Math.round((fundo + frente) / 2), token: "border" },
      { d: tracos.join(" "), mistura: 45, token: "pergaminho" },
      { d: serra(rnd, 153, 7, 8 + Math.floor(rnd() * 4)), mistura: frente, token: "border" },
    ];
  }
  if (horizonte === "cidade") {
    const longe = fileiraDePredios(rnd, 134, 52);
    const perto = fileiraDePredios(rnd, 150, 30);
    const camadas: Camada[] = [{ d: longe.d, mistura: fundo, token: "border" }];
    if (longe.janelas) camadas.push({ d: longe.janelas, mistura: 55, token: "ambar-forte" });
    camadas.push({ d: perto.d, mistura: frente, token: "border" });
    return camadas;
  }
  return [
    { d: serra(rnd, 128, 46, 6 + Math.floor(rnd() * 4)), mistura: fundo, token: "border" },
    { d: serra(rnd, 146, 28, 8 + Math.floor(rnd() * 5)), mistura: frente, token: "border" },
  ];
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
    case "lua":
      return crescente(cx, base - 54 * t, 46 * t);
    case "lanterna": {
      // alça, tampa, corpo com janela vazada e chama, base
      const alca = `M${X(-6)} ${Y(88)} L${X(-6)} ${Y(100)} L${X(6)} ${Y(100)} L${X(6)} ${Y(88)} L${X(3)} ${Y(88)} L${X(3)} ${Y(96)} L${X(-3)} ${Y(96)} L${X(-3)} ${Y(88)} Z`;
      const tampa = `M${X(-20)} ${Y(78)} L${X(-12)} ${Y(87)} L${X(12)} ${Y(87)} L${X(20)} ${Y(78)} Z`;
      const corpo = `M${X(-18)} ${Y(76)} L${X(18)} ${Y(76)} L${X(22)} ${Y(14)} L${X(-22)} ${Y(14)} Z M${X(-10)} ${Y(68)} L${X(10)} ${Y(68)} L${X(13)} ${Y(22)} L${X(-13)} ${Y(22)} Z`;
      const chama = `M${X(0)} ${Y(60)} Q${X(9)} ${Y(42)} ${X(0)} ${Y(28)} Q${X(-9)} ${Y(42)} ${X(0)} ${Y(60)} Z`;
      const pe = `M${X(-26)} ${Y(12)} L${X(26)} ${Y(12)} L${X(26)} ${Y(0)} L${X(-26)} ${Y(0)} Z`;
      return `${alca} ${tampa} ${corpo} ${chama} ${pe}`;
    }
    case "sino":
      return `M${X(-6)} ${Y(100)} L${X(6)} ${Y(100)} L${X(6)} ${Y(92)} Q${X(30)} ${Y(84)} ${X(30)} ${Y(40)} L${X(30)} ${Y(28)} L${X(42)} ${Y(14)} L${X(-42)} ${Y(14)} L${X(-30)} ${Y(28)} L${X(-30)} ${Y(40)} Q${X(-30)} ${Y(84)} ${X(-6)} ${Y(92)} Z ${circulo(cx, base - 6 * t, 6 * t)}`;
    case "mascara":
      // máscara de baile com os dois olhos vazados
      return `M${X(-50)} ${Y(74)} Q${X(-25)} ${Y(88)} ${X(0)} ${Y(72)} Q${X(25)} ${Y(88)} ${X(50)} ${Y(74)} Q${X(56)} ${Y(44)} ${X(30)} ${Y(28)} Q${X(12)} ${Y(22)} ${X(0)} ${Y(40)} Q${X(-12)} ${Y(22)} ${X(-30)} ${Y(28)} Q${X(-56)} ${Y(44)} ${X(-50)} ${Y(74)} Z M${X(-36)} ${Y(58)} Q${X(-23)} ${Y(70)} ${X(-10)} ${Y(56)} Q${X(-23)} ${Y(46)} ${X(-36)} ${Y(58)} Z M${X(36)} ${Y(58)} Q${X(23)} ${Y(70)} ${X(10)} ${Y(56)} Q${X(23)} ${Y(46)} ${X(36)} ${Y(58)} Z`;
    case "cabana":
      // telhado com chaminé num contorno só; porta e janela vazadas
      return `M${X(-46)} ${Y(52)} L${X(0)} ${Y(100)} L${X(18)} ${Y(81)} L${X(18)} ${Y(96)} L${X(30)} ${Y(96)} L${X(30)} ${Y(69)} L${X(46)} ${Y(52)} L${X(36)} ${Y(52)} L${X(36)} ${Y(0)} L${X(-36)} ${Y(0)} L${X(-36)} ${Y(52)} Z M${X(-24)} ${Y(0)} L${X(-24)} ${Y(30)} L${X(-8)} ${Y(30)} L${X(-8)} ${Y(0)} Z M${X(8)} ${Y(22)} L${X(24)} ${Y(22)} L${X(24)} ${Y(38)} L${X(8)} ${Y(38)} Z`;
    case "taca":
      return `M${X(-28)} ${Y(100)} L${X(28)} ${Y(100)} Q${X(28)} ${Y(56)} ${X(4)} ${Y(50)} L${X(4)} ${Y(12)} L${X(24)} ${Y(5)} L${X(24)} ${Y(0)} L${X(-24)} ${Y(0)} L${X(-24)} ${Y(5)} L${X(-4)} ${Y(12)} L${X(-4)} ${Y(50)} Q${X(-28)} ${Y(56)} ${X(-28)} ${Y(100)} Z`;
    case "predios": {
      const contorno = `M${X(-50)} ${Y(0)} L${X(-50)} ${Y(60)} L${X(-30)} ${Y(60)} L${X(-30)} ${Y(84)} L${X(-22)} ${Y(84)} L${X(-22)} ${Y(100)} L${X(-18)} ${Y(100)} L${X(-18)} ${Y(84)} L${X(-10)} ${Y(84)} L${X(-10)} ${Y(44)} L${X(8)} ${Y(44)} L${X(8)} ${Y(72)} L${X(30)} ${Y(72)} L${X(30)} ${Y(30)} L${X(50)} ${Y(30)} L${X(50)} ${Y(0)} Z`;
      const janela = (x: number, y: number) => `M${X(x)} ${Y(y)} L${X(x + 7)} ${Y(y)} L${X(x + 7)} ${Y(y - 9)} L${X(x)} ${Y(y - 9)} Z`;
      return `${contorno} ${janela(-44, 48)} ${janela(-44, 26)} ${janela(-24, 72)} ${janela(-24, 50)} ${janela(-4, 32)} ${janela(14, 60)} ${janela(14, 38)} ${janela(37, 20)}`;
    }
    case "caixao":
      // caixão em pé com a cruz vazada
      return `M${X(-14)} ${Y(100)} L${X(14)} ${Y(100)} L${X(28)} ${Y(72)} L${X(16)} ${Y(0)} L${X(-16)} ${Y(0)} L${X(-28)} ${Y(72)} Z M${X(-3)} ${Y(86)} L${X(3)} ${Y(86)} L${X(3)} ${Y(72)} L${X(11)} ${Y(72)} L${X(11)} ${Y(66)} L${X(3)} ${Y(66)} L${X(3)} ${Y(42)} L${X(-3)} ${Y(42)} L${X(-3)} ${Y(66)} L${X(-11)} ${Y(66)} L${X(-11)} ${Y(72)} L${X(-3)} ${Y(72)} Z`;
    case "livro":
    default:
      return `M${X(0)} ${Y(30)} Q${X(-30)} ${Y(52)} ${X(-60)} ${Y(40)} L${X(-60)} ${Y(0)} Q${X(-30)} ${Y(12)} ${X(0)} ${Y(-4)} Q${X(30)} ${Y(12)} ${X(60)} ${Y(0)} L${X(60)} ${Y(40)} Q${X(30)} ${Y(52)} ${X(0)} ${Y(30)} Z`;
  }
}

/** Composição completa da capa: pura e determinística (mesmo id e sistema, mesmo resultado). */
export function gerarCapa(id: string, sistemaId: string): Capa {
  const s = semente(`${sistemaId}:${id}`);
  const rnd = sorteador(s);
  const conjunto: readonly Motivo[] = MOTIVOS_DO_SISTEMA[sistemaId] ?? ["estrela"];
  const motivo = MOTIVO_DA_AVENTURA[id] ?? conjunto[s % conjunto.length];
  const horizonte = HORIZONTE_DA_AVENTURA[id] ?? HORIZONTES[(s >>> 8) % HORIZONTES.length];
  const tipo = ASTROS[(s >>> 4) % ASTROS.length];
  const ceu = CEUS[(s >>> 12) % CEUS.length];
  const angulo = Math.round(150 + rnd() * 60);
  const brilho = Math.round(18 + rnd() * 30);
  const centro = { cx: n(30 + rnd() * 260), cy: n(24 + rnd() * 34), r: n(9 + rnd() * 12) };
  const h = Math.round(70 + rnd() * 18);
  const cx = n(110 + rnd() * 100);
  // o astro nunca encosta na silhueta: se cair em cima (ou colado) dela, vai para o lado com mais céu livre
  const meia = (MEIA_LARGURA[motivo] * h) / 100;
  const folga = 8;
  const paraDireita = tipo === "duplo" ? centro.r * 2.55 : centro.r;
  // e nunca sai pela borda (a lua pequena do astro duplo fica à direita da grande)
  centro.cx = n(Math.min(Math.max(centro.cx, centro.r + 4), LARGURA - paraDireita - 4));
  const baixoDemais = centro.cy + centro.r + folga > 150 - h;
  const emCima = centro.cx - centro.r < cx + meia + folga && centro.cx + paraDireita > cx - meia - folga;
  if (baixoDemais && emCima) {
    centro.cx = n(cx < LARGURA / 2 ? cx + meia + folga + centro.r : cx - meia - folga - paraDireita);
  }
  const desenho =
    tipo === "crescente"
      ? crescente(centro.cx, centro.cy, centro.r)
      : tipo === "duplo"
        ? `${circulo(centro.cx, centro.cy, centro.r)} ${circulo(centro.cx + centro.r * 2.1, centro.cy - centro.r * 0.6, centro.r * 0.45)}`
        : circulo(centro.cx, centro.cy, centro.r);
  const astro = { ...centro, tipo, d: desenho };
  const camadas = camadasDoHorizonte(horizonte, rnd, centro);
  const silhueta: Capa["silhueta"] = {
    d: caminhoDoMotivo(motivo, cx, 150, h),
    mistura: Math.round(78 + rnd() * 14),
    token: "ambar",
    // a lua é fina e some em fundo escuro (o vinho do Vampiro): ganha um fio claro em volta
    contorno: motivo === "lua" ? 60 : 0,
  };
  const qtd = 9 + Math.floor(rnd() * 8);
  const pontos = Array.from({ length: qtd }, () => ({ cx: n(rnd() * LARGURA), cy: n(rnd() * 90), r: n(0.7 + rnd() * 1.1) }));
  return { semente: s, motivo, horizonte, angulo, brilho, ceu, astro, camadas, silhueta, pontos };
}
