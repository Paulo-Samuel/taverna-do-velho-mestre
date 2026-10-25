import "server-only";
import type { ClasseDef } from "../tipos";
import { linear, tabelaLadrao, type GrupoAtaque, type GrupoSalva, type PerfilMagia, type Salva } from "./tabelas";

// Classes old-school: as sete básicas (raça como classe para anão, elfo e halfling) e as avançadas
// no molde dos clones abertos. Descrições e habilidades com palavras nossas.

export type TipoMagia = "arcana" | "divina" | "druidica" | "ilusao" | "necromancia" | "bardica";

type PorNivel = (nivel: number) => number;

export type ClasseOsr = ClasseDef & {
  atributoChave: string;
  pvBase: number;
  papel: string;
  fonte: "Básico" | "Avançado";
  /** dado de vida até `dvAte`; depois, PV fixo por nível sem CON */
  dv: number;
  dvAte: number;
  pvDepois: number;
  nivelMax: number;
  /** XP total para cada nível (índice 0 = 1º nível) */
  xp: number[];
  salvas: GrupoSalva;
  ataque: GrupoAtaque;
  /** CA ascendente da armadura inicial (com escudo), antes da DES */
  armadura: { nome: string; ca: number };
  arma: { nome: string; dano: string };
  distancia: { nome: string; dano: string };
  magia?: { tipo: TipoMagia; perfil: PerfilMagia; atributo: string };
  /** habilidades em porcentagem (d100 ≤ valor) */
  pct?: Record<string, PorNivel>;
  /** habilidades em d6 (sucesso em 1..X) — prevalece o maior entre classe e raça */
  d6?: Record<string, PorNivel>;
  requisitos?: Record<string, number>;
  /** requisitos primários (o pior define o ajuste de XP) */
  primarios: string[];
  /** prioridade para distribuir atributos rolados */
  ordem: string[];
  /** raça-como-classe: id da raça que a própria classe já é */
  raca?: string;
  habilidades: string[];
  /** usos diários de poderes que não são magia (imposição de mãos, canção, poderes inatos) */
  usos?: { id: string; rotulo: string; max: PorNivel }[];
  /** expulsa mortos-vivos como clérigo de nível (nível + deslocamento) */
  expulsar?: number;
  /** ataque pelas costas (+4, dano ×2) */
  costas?: boolean;
  ataqueDistancia?: number;
  /** bônus nas salvaguardas que a tabela da classe não inclui */
  bonusSalvas?: Partial<Record<Salva, number>>;
};

const fixo = (v: number): PorNivel => () => v;
const ouvirLadrao: PorNivel = (n) => tabelaLadrao("ouvir", n);

// tabelas de XP próprias (índice 0 = 1º nível)
const XP_GUERREIRO = [0, 2000, 4000, 8000, 16000, 32000, 64000, 120000, 240000, 360000, 480000, 600000, 720000, 840000];
const XP_CLERIGO = [0, 1500, 3000, 6000, 12000, 25000, 50000, 100000, 200000, 300000, 400000, 500000, 600000, 700000];
const XP_MAGO = [0, 2500, 5000, 10000, 20000, 40000, 80000, 150000, 300000, 450000, 600000, 750000, 900000, 1050000];
const XP_LADRAO = [0, 1200, 2400, 4800, 9600, 20000, 40000, 80000, 160000, 280000, 400000, 520000, 640000, 760000];
const XP_PESADO = [0, 2500, 5000, 10000, 18500, 37000, 85000, 140000, 270000, 400000, 530000, 660000, 790000, 920000];

export const KIT_BASICO = ["mochila", "6 tochas", "corda de 15 m", "ração de viagem (7 dias)", "odre", "vara de 3 m"];

export const CLASSES: ClasseOsr[] = [
  // ——— Básico ———
  {
    id: "guerreiro", nome: "Guerreiro", descricao: "Espada na mão, plano nenhum, e ainda assim o último de pé.",
    atributoChave: "for", pvBase: 8, papel: "combatente", fonte: "Básico",
    dv: 8, dvAte: 9, pvDepois: 2, nivelMax: 14, xp: XP_GUERREIRO, salvas: "guerreiro", ataque: "guerreiro",
    armadura: { nome: "armadura de placas e escudo", ca: 17 }, arma: { nome: "espada", dano: "1d8" }, distancia: { nome: "arco curto", dano: "1d6" },
    primarios: ["for"], ordem: ["for", "con", "des", "sab", "car", "int"],
    equipamento: ["espada", "arco curto e 20 flechas", "armadura de placas", "escudo"],
    habilidades: ["Usa qualquer arma e armadura", "Fortaleza e soldados no 9º nível"],
  },
  {
    id: "clerigo", nome: "Clérigo", descricao: "Martelo numa mão, fé na outra, e nenhuma das duas pede licença.",
    atributoChave: "sab", pvBase: 6, papel: "suporte", fonte: "Básico",
    dv: 6, dvAte: 9, pvDepois: 1, nivelMax: 14, xp: XP_CLERIGO, salvas: "clerigo", ataque: "clerigo",
    armadura: { nome: "cota de malha e escudo", ca: 15 }, arma: { nome: "maça", dano: "1d6" }, distancia: { nome: "funda", dano: "1d4" },
    magia: { tipo: "divina", perfil: "clerigo", atributo: "sab" },
    primarios: ["sab"], ordem: ["sab", "con", "for", "car", "des", "int"],
    equipamento: ["maça", "funda e 20 pedras", "cota de malha", "escudo", "símbolo sagrado", "água benta"],
    habilidades: ["Expulsar mortos-vivos", "Magia divina a partir do 2º nível", "Só armas de concussão", "Templo e fiéis no 9º nível"],
    expulsar: 0,
  },
  {
    id: "mago", nome: "Mago", descricao: "Um feitiço por dia e quatro pontos de vida: cada decisão é uma prova final.",
    atributoChave: "int", pvBase: 4, papel: "conjurador", fonte: "Básico",
    dv: 4, dvAte: 9, pvDepois: 1, nivelMax: 14, xp: XP_MAGO, salvas: "mago", ataque: "mago",
    armadura: { nome: "sem armadura", ca: 10 }, arma: { nome: "adaga", dano: "1d4" }, distancia: { nome: "adaga arremessada", dano: "1d4" },
    magia: { tipo: "arcana", perfil: "mago", atributo: "int" },
    primarios: ["int"], ordem: ["int", "des", "con", "sab", "car", "for"],
    equipamento: ["adaga", "cajado", "grimório", "tinta e penas"],
    habilidades: ["Grimório de magias arcanas", "Não usa armadura nem escudo", "Fabrica itens mágicos no 9º nível", "Torre no 11º nível"],
  },
  {
    id: "ladrao", nome: "Ladrão", descricao: "Abre qualquer fechadura, exceto a da própria consciência.",
    atributoChave: "des", pvBase: 4, papel: "especialista", fonte: "Básico",
    dv: 4, dvAte: 9, pvDepois: 2, nivelMax: 14, xp: XP_LADRAO, salvas: "ladrao", ataque: "clerigo",
    armadura: { nome: "armadura de couro", ca: 12 }, arma: { nome: "espada curta", dano: "1d6" }, distancia: { nome: "funda", dano: "1d4" },
    pct: {
      escalar: (n) => tabelaLadrao("escalar", n),
      armadilhas: (n) => tabelaLadrao("armadilhas", n),
      esconder: (n) => tabelaLadrao("esconder", n),
      silencio: (n) => tabelaLadrao("silencio", n),
      "abrir-fechaduras": (n) => tabelaLadrao("abrir-fechaduras", n),
      "bater-carteiras": (n) => tabelaLadrao("bater-carteiras", n),
    },
    d6: { ouvir: ouvirLadrao },
    primarios: ["des"], ordem: ["des", "int", "con", "car", "sab", "for"],
    equipamento: ["espada curta", "funda e 20 pedras", "armadura de couro", "ferramentas de ladrão", "saco grande"],
    habilidades: ["Ataque pelas costas (+4, dano ×2)", "Ler idiomas desconhecidos (4º nível)", "Ler pergaminhos arcanos (10º nível, 10% de falha)", "Guilda de ladrões no 9º nível"],
    costas: true,
  },
  {
    id: "anao", nome: "Anão", descricao: "Desconfia de elfos, de magia, de árvores e de qualquer túnel que não tenha cavado.",
    atributoChave: "for", pvBase: 8, papel: "combatente", fonte: "Básico", raca: "anao",
    dv: 8, dvAte: 9, pvDepois: 3, nivelMax: 12, salvas: "anao", ataque: "guerreiro",
    xp: [0, 2200, 4400, 8800, 17000, 35000, 70000, 140000, 270000, 400000, 530000, 660000],
    armadura: { nome: "cota de malha e escudo", ca: 15 }, arma: { nome: "machado de batalha", dano: "1d8" }, distancia: { nome: "besta leve", dano: "1d6" },
    d6: { ouvir: fixo(2), "procurar-armadilhas": fixo(2), "detectar-construcao": fixo(2) },
    requisitos: { con: 9 }, primarios: ["for"], ordem: ["for", "con", "sab", "des", "car", "int"],
    equipamento: ["machado de batalha", "besta leve e 20 virotes", "cota de malha", "escudo", "picareta"],
    habilidades: ["Infravisão 18 m", "Detecta construções e armadilhas (2 em 6)", "Idiomas: anão, gnomo, goblin, kobold", "Sem armas grandes ou arcos longos", "Salvaguardas excelentes"],
  },
  {
    id: "elfo", nome: "Elfo", descricao: "Espada e feitiço no mesmo pacote, com a arrogância vendida separadamente.",
    atributoChave: "int", pvBase: 6, papel: "híbrido", fonte: "Básico", raca: "elfo",
    dv: 6, dvAte: 9, pvDepois: 2, nivelMax: 10, salvas: "elfo", ataque: "guerreiro",
    xp: [0, 4000, 8000, 16000, 32000, 64000, 120000, 250000, 400000, 600000],
    armadura: { nome: "cota de malha e escudo", ca: 15 }, arma: { nome: "espada", dano: "1d8" }, distancia: { nome: "arco longo", dano: "1d6" },
    magia: { tipo: "arcana", perfil: "mago", atributo: "int" },
    d6: { ouvir: fixo(2), "portas-secretas": fixo(2) },
    requisitos: { int: 9 }, primarios: ["for", "int"], ordem: ["int", "for", "des", "con", "sab", "car"],
    equipamento: ["espada", "arco longo e 20 flechas", "cota de malha", "escudo", "grimório"],
    habilidades: ["Infravisão 18 m", "Acha portas secretas (2 em 6)", "Imune à paralisia de carniçal", "Magia arcana com armadura", "Idiomas: élfico, gnoll, hobgoblin, orc"],
  },
  {
    id: "halfling", nome: "Halfling", descricao: "Baixinho, guloso e mais difícil de matar do que parece — ou do que é justo.",
    atributoChave: "des", pvBase: 6, papel: "combatente", fonte: "Básico", raca: "halfling",
    dv: 6, dvAte: 9, pvDepois: 1, nivelMax: 8, salvas: "halfling", ataque: "guerreiro",
    xp: [0, 2000, 4000, 8000, 16000, 32000, 64000, 120000],
    armadura: { nome: "cota de malha e escudo", ca: 15 }, arma: { nome: "espada curta", dano: "1d6" }, distancia: { nome: "funda", dano: "1d4" },
    pct: { esconder: fixo(33) }, d6: { ouvir: fixo(2) }, ataqueDistancia: 1,
    requisitos: { con: 9, des: 9 }, primarios: ["des", "for"], ordem: ["des", "con", "for", "sab", "car", "int"],
    equipamento: ["espada curta", "funda e 20 pedras", "cota de malha", "escudo", "cachimbo e fumo"],
    habilidades: ["+1 em ataques à distância", "+2 de CA contra criaturas maiores que humanos", "Esconde-se: 90% ao ar livre, 2 em 6 na masmorra", "+1 na iniciativa individual"],
  },

  // ——— Avançado ———
  {
    id: "assassino", nome: "Assassino", descricao: "Profissional discreto: cobra adiantado e nunca deixa avaliação negativa.",
    atributoChave: "des", pvBase: 4, papel: "especialista", fonte: "Avançado",
    dv: 4, dvAte: 9, pvDepois: 2, nivelMax: 14, salvas: "ladrao", ataque: "clerigo",
    xp: [0, 1500, 3000, 6000, 12000, 25000, 50000, 100000, 200000, 300000, 425000, 550000, 675000, 800000],
    armadura: { nome: "armadura de couro", ca: 12 }, arma: { nome: "espada curta", dano: "1d6" }, distancia: { nome: "besta leve", dano: "1d6" },
    pct: {
      escalar: (n) => tabelaLadrao("escalar", n),
      esconder: (n) => tabelaLadrao("esconder", n),
      silencio: (n) => tabelaLadrao("silencio", n),
      "abrir-fechaduras": (n) => tabelaLadrao("abrir-fechaduras", n, -2),
    },
    d6: { ouvir: ouvirLadrao },
    primarios: ["des"], ordem: ["des", "for", "int", "con", "car", "sab"],
    equipamento: ["espada curta", "besta leve e 20 virotes", "armadura de couro", "frasco de veneno", "kit de disfarce"],
    habilidades: ["Assassinar: ataque surpresa +4; se acertar, o alvo salva contra Morte ou morre", "Ataque pelas costas (+4, dano ×2)", "Venenos e disfarces", "Não pode ser Ordeiro"],
    costas: true,
  },
  {
    id: "barbaro", nome: "Bárbaro", descricao: "Acha que biblioteca é um tipo de lenha e não está totalmente errado.",
    atributoChave: "for", pvBase: 8, papel: "combatente", fonte: "Avançado",
    dv: 8, dvAte: 9, pvDepois: 3, nivelMax: 14, xp: XP_PESADO, salvas: "guerreiro", ataque: "guerreiro",
    armadura: { nome: "armadura de couro e escudo (pele grossa)", ca: 14 }, arma: { nome: "machado de duas mãos", dano: "1d10" }, distancia: { nome: "machadinha arremessada", dano: "1d6" },
    pct: { escalar: (n) => tabelaLadrao("escalar", n), rastrear: linear(30, 5, 95) },
    requisitos: { con: 9, des: 9 }, primarios: ["for", "con"], ordem: ["for", "con", "des", "sab", "car", "int"],
    equipamento: ["machado de duas mãos", "2 machadinhas", "armadura de couro", "escudo", "peles de lobo"],
    habilidades: ["Instinto selvagem: só é surpreendido em 1 em 6", "+2 nas salvaguardas contra Morte e Paralisia", "Desconfia de magia e de quem a usa", "Horda de guerreiros no 9º nível"],
    bonusSalvas: { morte: 2, paralisia: 2 },
  },
  {
    id: "bardo", nome: "Bardo", descricao: "Canta, encanta e cobra couvert até no meio da masmorra.",
    atributoChave: "car", pvBase: 6, papel: "suporte", fonte: "Avançado",
    dv: 6, dvAte: 9, pvDepois: 1, nivelMax: 14, salvas: "ladrao", ataque: "clerigo",
    xp: XP_GUERREIRO,
    armadura: { nome: "armadura de couro", ca: 12 }, arma: { nome: "espada", dano: "1d8" }, distancia: { nome: "funda", dano: "1d4" },
    magia: { tipo: "bardica", perfil: "bardo", atributo: "car" },
    pct: {
      escalar: (n) => tabelaLadrao("escalar", n, -1),
      "bater-carteiras": (n) => tabelaLadrao("bater-carteiras", n),
      lendas: linear(15, 6, 95),
    },
    d6: { ouvir: ouvirLadrao },
    requisitos: { des: 9, int: 9 }, primarios: ["car", "des"], ordem: ["car", "des", "int", "con", "sab", "for"],
    equipamento: ["espada", "funda e 20 pedras", "armadura de couro", "alaúde", "roupa chamativa"],
    habilidades: ["Canção inspiradora: aliados ganham +1 no ataque e na moral", "Saber de lendas sobre itens e lugares", "Encantar plateia: ouvintes salvam contra Magias ou ficam fascinados", "Magia bárdica a partir do 2º nível"],
    usos: [{ id: "cancao", rotulo: "Canções", max: (n) => n }],
  },
  {
    id: "druida", nome: "Druida", descricao: "Defende a floresta com unhas, dentes e uma total falta de higiene.",
    atributoChave: "sab", pvBase: 6, papel: "conjurador", fonte: "Avançado",
    dv: 6, dvAte: 9, pvDepois: 1, nivelMax: 14, salvas: "clerigo", ataque: "clerigo",
    xp: [0, 2000, 4000, 7500, 12500, 20000, 35000, 60000, 90000, 125000, 200000, 300000, 450000, 600000],
    armadura: { nome: "armadura de couro e escudo de madeira", ca: 13 }, arma: { nome: "cimitarra", dano: "1d8" }, distancia: { nome: "funda", dano: "1d4" },
    magia: { tipo: "druidica", perfil: "druida", atributo: "sab" },
    primarios: ["sab"], ordem: ["sab", "con", "des", "car", "for", "int"],
    equipamento: ["cimitarra", "funda e 20 pedras", "armadura de couro", "escudo de madeira", "visco sagrado"],
    habilidades: ["Magia druídica desde o 1º nível", "Não usa metal na armadura", "Atravessa mato sem deixar rastro", "Muda de forma em animal a partir do 7º nível", "Deve ser Neutro"],
  },
  {
    id: "ilusionista", nome: "Ilusionista", descricao: "Nada do que ele faz é real, inclusive a dor de cabeça que dá no mestre.",
    atributoChave: "int", pvBase: 4, papel: "conjurador", fonte: "Avançado",
    dv: 4, dvAte: 9, pvDepois: 1, nivelMax: 14, xp: XP_MAGO, salvas: "mago", ataque: "mago",
    armadura: { nome: "sem armadura", ca: 10 }, arma: { nome: "adaga", dano: "1d4" }, distancia: { nome: "adaga arremessada", dano: "1d4" },
    magia: { tipo: "ilusao", perfil: "mago", atributo: "int" },
    requisitos: { des: 9 }, primarios: ["int"], ordem: ["int", "des", "con", "car", "sab", "for"],
    equipamento: ["adaga", "cajado", "grimório de ilusões", "prisma de cristal"],
    habilidades: ["Grimório de ilusões", "Ilusões só afetam quem acredita (o alvo pode salvar ao interagir)", "Não usa armadura nem escudo"],
  },
  {
    id: "cavaleiro", nome: "Cavaleiro", descricao: "Honra, cavalo e armadura brilhante — os três primeiros a morrer numa masmorra apertada.",
    atributoChave: "for", pvBase: 8, papel: "combatente", fonte: "Avançado",
    dv: 8, dvAte: 9, pvDepois: 2, nivelMax: 14, xp: XP_PESADO, salvas: "guerreiro", ataque: "guerreiro",
    armadura: { nome: "armadura de placas e escudo", ca: 17 }, arma: { nome: "espada", dano: "1d8" }, distancia: { nome: "lança arremessada", dano: "1d6" },
    requisitos: { con: 9, des: 9 }, primarios: ["for"], ordem: ["for", "con", "des", "car", "sab", "int"],
    equipamento: ["espada", "lança de cavalaria", "armadura de placas", "escudo com brasão", "cavalo de guerra (se o mestre deixar entrar)"],
    habilidades: ["Combate montado: +1 no ataque e dano dobrado na carga", "Código de honra: nunca foge de um duelo justo", "Inspira seguidores (+1 na moral deles)", "Recebe feudo no 9º nível"],
  },
  {
    id: "paladino", nome: "Paladino", descricao: "Guerreiro sagrado com a certeza moral de quem nunca leu as letras miúdas.",
    atributoChave: "for", pvBase: 8, papel: "combatente", fonte: "Avançado",
    dv: 8, dvAte: 9, pvDepois: 2, nivelMax: 14, xp: XP_PESADO, salvas: "guerreiro", ataque: "guerreiro",
    armadura: { nome: "armadura de placas e escudo", ca: 17 }, arma: { nome: "espada", dano: "1d8" }, distancia: { nome: "lança arremessada", dano: "1d6" },
    magia: { tipo: "divina", perfil: "paladino", atributo: "sab" },
    requisitos: { car: 9 }, primarios: ["for", "sab"], ordem: ["for", "car", "sab", "con", "des", "int"],
    equipamento: ["espada", "lança", "armadura de placas", "escudo", "símbolo sagrado"],
    habilidades: ["Imposição de mãos: cura 2 PV por nível ao dia", "Detecta o mal à vontade", "Imune a doenças", "Expulsa mortos-vivos como clérigo dois níveis abaixo (a partir do 3º)", "Magia divina a partir do 9º nível", "Deve ser Ordeiro"],
    usos: [{ id: "maos", rotulo: "Imposição de mãos (PV)", max: (n) => 2 * n }],
    expulsar: -2,
    bonusSalvas: { morte: 2, varinhas: 2, paralisia: 2, sopro: 2, magias: 2 },
  },
  {
    id: "patrulheiro", nome: "Patrulheiro", descricao: "Lê pegadas melhor que gente e prefere assim.",
    atributoChave: "for", pvBase: 8, papel: "combatente", fonte: "Avançado",
    dv: 8, dvAte: 9, pvDepois: 2, nivelMax: 14, salvas: "guerreiro", ataque: "guerreiro",
    xp: [0, 2200, 4400, 8800, 17000, 35000, 70000, 140000, 300000, 425000, 550000, 675000, 800000, 925000],
    armadura: { nome: "cota de malha", ca: 14 }, arma: { nome: "espada", dano: "1d8" }, distancia: { nome: "arco longo", dano: "1d6" },
    magia: { tipo: "druidica", perfil: "patrulheiro", atributo: "sab" },
    pct: { rastrear: linear(50, 4, 98), esconder: (n) => tabelaLadrao("esconder", n, -1), silencio: (n) => tabelaLadrao("silencio", n, -1) },
    requisitos: { con: 9, sab: 9 }, primarios: ["for", "sab"], ordem: ["for", "sab", "des", "con", "int", "car"],
    equipamento: ["espada", "arco longo e 20 flechas", "cota de malha", "capa verde-musgo", "armadilha de caça"],
    habilidades: ["Rastrear em qualquer terreno", "Inimigo jurado: +2 de dano contra o tipo escolhido", "Só é surpreendido em 1 em 6", "Magia druídica a partir do 8º nível"],
  },
  {
    id: "acrobata", nome: "Acrobata", descricao: "Atravessa o abismo na corda bamba enquanto o grupo procura a ponte.",
    atributoChave: "des", pvBase: 4, papel: "especialista", fonte: "Avançado",
    dv: 4, dvAte: 9, pvDepois: 2, nivelMax: 14, xp: XP_LADRAO, salvas: "ladrao", ataque: "clerigo",
    armadura: { nome: "armadura de couro", ca: 12 }, arma: { nome: "bastão", dano: "1d6" }, distancia: { nome: "dardos", dano: "1d4" },
    pct: {
      escalar: (n) => tabelaLadrao("escalar", n),
      esconder: (n) => tabelaLadrao("esconder", n),
      silencio: (n) => tabelaLadrao("silencio", n),
      equilibrio: linear(60, 3, 99),
      queda: linear(25, 5, 99),
    },
    primarios: ["des"], ordem: ["des", "for", "con", "int", "car", "sab"],
    equipamento: ["bastão", "6 dardos", "armadura de couro", "vara de equilíbrio", "giz"],
    habilidades: ["Andar na corda bamba e em beirais", "Cair sem se machucar (reduz a queda em 3 m a cada sucesso)", "Saltos acrobáticos: +2 de CA quando não se move em linha reta", "Ataque pelas costas (+4, dano ×2)"],
    costas: true,
  },
  {
    id: "necromante", nome: "Necromante", descricao: "Acha que os mortos são ótimos funcionários: não reclamam, não comem e não pedem aumento.",
    atributoChave: "int", pvBase: 4, papel: "conjurador", fonte: "Avançado",
    dv: 4, dvAte: 9, pvDepois: 1, nivelMax: 14, xp: XP_MAGO, salvas: "mago", ataque: "mago",
    armadura: { nome: "sem armadura", ca: 10 }, arma: { nome: "adaga", dano: "1d4" }, distancia: { nome: "adaga arremessada", dano: "1d4" },
    magia: { tipo: "necromancia", perfil: "mago", atributo: "int" },
    requisitos: { int: 9 }, primarios: ["int"], ordem: ["int", "con", "sab", "des", "car", "for"],
    equipamento: ["adaga ritual", "cajado", "grimório encadernado em algo suspeito", "crânio de estimação"],
    habilidades: ["Grimório de necromancia", "Mortos-vivos sem mente o ignoram 1 em 6 vezes", "Não usa armadura nem escudo", "Malvisto em templos (e com razão)"],
  },
  {
    id: "gnomo", nome: "Gnomo", descricao: "Metade inventor, metade ilusionista, cem por cento convencido de que vai dar certo.",
    atributoChave: "int", pvBase: 6, papel: "híbrido", fonte: "Avançado", raca: "gnomo",
    dv: 6, dvAte: 9, pvDepois: 1, nivelMax: 8, salvas: "anao", ataque: "clerigo",
    xp: [0, 3000, 6000, 12000, 30000, 60000, 120000, 240000],
    armadura: { nome: "armadura de couro e escudo", ca: 13 }, arma: { nome: "martelo de guerra", dano: "1d6" }, distancia: { nome: "besta leve", dano: "1d6" },
    magia: { tipo: "ilusao", perfil: "gnomo", atributo: "int" },
    d6: { ouvir: fixo(2), "detectar-construcao": fixo(2), "procurar-armadilhas": fixo(2) },
    requisitos: { con: 9 }, primarios: ["des", "int"], ordem: ["int", "des", "con", "sab", "car", "for"],
    equipamento: ["martelo de guerra", "besta leve e 20 virotes", "armadura de couro", "escudo", "caixa de ferramentas"],
    habilidades: ["Infravisão 18 m", "Detecta construções (2 em 6)", "Fala com animais que cavam", "Ilusões menores", "Idiomas: gnomo, anão, kobold, goblin"],
  },
  {
    id: "meio-orc", nome: "Meio-orc", descricao: "Ninguém o convida para festas, mas todos o chamam quando a porta não abre.",
    atributoChave: "for", pvBase: 6, papel: "combatente", fonte: "Avançado", raca: "meio-orc",
    dv: 6, dvAte: 9, pvDepois: 2, nivelMax: 8, salvas: "ladrao", ataque: "guerreiro",
    xp: [0, 1800, 3600, 7200, 14000, 28000, 56000, 112000],
    armadura: { nome: "armadura de couro e escudo", ca: 13 }, arma: { nome: "machado de batalha", dano: "1d8" }, distancia: { nome: "arco curto", dano: "1d6" },
    pct: {
      esconder: (n) => tabelaLadrao("esconder", n),
      silencio: (n) => tabelaLadrao("silencio", n),
      "bater-carteiras": (n) => tabelaLadrao("bater-carteiras", n),
    },
    d6: { ouvir: ouvirLadrao },
    primarios: ["for", "des"], ordem: ["for", "des", "con", "sab", "int", "car"],
    equipamento: ["machado de batalha", "arco curto e 20 flechas", "armadura de couro", "escudo", "pederneira"],
    habilidades: ["Infravisão 18 m", "Ataque pelas costas (+4, dano ×2)", "Algumas habilidades de ladrão", "Idiomas: comum, orc"],
    costas: true,
  },
  {
    id: "drow", nome: "Drow", descricao: "Elfo das profundezas: pele de obsidiana, olhar de veneno e zero paciência com a luz do sol.",
    atributoChave: "sab", pvBase: 6, papel: "híbrido", fonte: "Avançado", raca: "drow",
    dv: 6, dvAte: 9, pvDepois: 2, nivelMax: 10, salvas: "elfo", ataque: "guerreiro",
    xp: [0, 4000, 8000, 16000, 32000, 64000, 120000, 250000, 400000, 600000],
    armadura: { nome: "cota de malha e escudo", ca: 15 }, arma: { nome: "espada curta", dano: "1d6" }, distancia: { nome: "besta de mão", dano: "1d4" },
    magia: { tipo: "divina", perfil: "clerigo", atributo: "sab" },
    d6: { ouvir: fixo(2), "portas-secretas": fixo(2) },
    requisitos: { int: 9 }, primarios: ["for", "sab"], ordem: ["sab", "for", "des", "int", "con", "car"],
    equipamento: ["espada curta", "besta de mão e 20 virotes", "cota de malha", "escudo", "manto escuro"],
    habilidades: ["Infravisão 36 m", "Sensível à luz: −2 no ataque sob sol forte", "Acha portas secretas (2 em 6)", "Magia divina a partir do 2º nível", "Escuridão mágica 1 vez ao dia", "Imune à paralisia de carniçal"],
    usos: [{ id: "inato", rotulo: "Escuridão mágica", max: fixo(1) }],
  },
  {
    id: "svirfneblin", nome: "Svirfneblin", descricao: "Gnomo das profundezas, sério como pedra e igualmente difícil de quebrar.",
    atributoChave: "des", pvBase: 6, papel: "especialista", fonte: "Avançado", raca: "svirfneblin",
    dv: 6, dvAte: 9, pvDepois: 1, nivelMax: 8, salvas: "anao", ataque: "clerigo",
    xp: [0, 3000, 6000, 12000, 25000, 50000, 100000, 200000],
    armadura: { nome: "armadura de couro e escudo", ca: 13 }, arma: { nome: "picareta", dano: "1d6" }, distancia: { nome: "dardos", dano: "1d4" },
    pct: { esconder: (n) => tabelaLadrao("esconder", n, 2), silencio: (n) => tabelaLadrao("silencio", n) },
    d6: { ouvir: fixo(3), "detectar-construcao": fixo(2), "procurar-armadilhas": fixo(2) },
    requisitos: { con: 9 }, primarios: ["des", "for"], ordem: ["des", "con", "for", "sab", "int", "car"],
    equipamento: ["picareta", "6 dardos", "armadura de couro", "escudo", "pedra polida de estimação"],
    habilidades: ["Infravisão 36 m", "Só é surpreendido em 1 em 6", "Camufla-se na pedra", "Borrão ou cegueira 1 vez ao dia", "Detecta construções (2 em 6)"],
    usos: [{ id: "inato", rotulo: "Truques das profundezas", max: (n) => (n >= 5 ? 2 : 1) }],
  },
  {
    id: "duergar", nome: "Duergar", descricao: "Anão cinzento: tudo de ruim do anão comum, mais o rancor.",
    atributoChave: "for", pvBase: 6, papel: "combatente", fonte: "Avançado", raca: "duergar",
    dv: 6, dvAte: 9, pvDepois: 3, nivelMax: 10, salvas: "anao", ataque: "guerreiro",
    xp: [0, 2200, 4400, 8800, 17000, 35000, 70000, 140000, 270000, 400000],
    armadura: { nome: "cota de malha e escudo", ca: 15 }, arma: { nome: "martelo de guerra", dano: "1d6" }, distancia: { nome: "besta leve", dano: "1d6" },
    d6: { ouvir: fixo(2), "detectar-construcao": fixo(2), "procurar-armadilhas": fixo(2) },
    requisitos: { con: 9 }, primarios: ["for"], ordem: ["for", "con", "sab", "des", "int", "car"],
    equipamento: ["martelo de guerra", "besta leve e 20 virotes", "cota de malha", "escudo", "lamparina apagada (por preferência)"],
    habilidades: ["Infravisão 36 m", "Sensível à luz: −2 no ataque sob sol forte", "Aumentar de tamanho ou ficar invisível 1 vez ao dia", "Imune a ilusões e paralisia"],
    usos: [{ id: "inato", rotulo: "Aumentar/Invisibilidade", max: fixo(1) }],
  },
  {
    id: "meio-elfo", nome: "Meio-elfo", descricao: "Não é bem-vindo em nenhum dos dois lados, então aprendeu a ser útil nos dois.",
    atributoChave: "int", pvBase: 6, papel: "híbrido", fonte: "Avançado", raca: "meio-elfo",
    dv: 6, dvAte: 9, pvDepois: 2, nivelMax: 12, salvas: "elfo", ataque: "guerreiro",
    xp: [0, 2500, 5000, 10000, 20000, 40000, 80000, 160000, 310000, 460000, 610000, 760000],
    armadura: { nome: "cota de malha e escudo", ca: 15 }, arma: { nome: "espada", dano: "1d8" }, distancia: { nome: "arco longo", dano: "1d6" },
    magia: { tipo: "arcana", perfil: "mago", atributo: "int" },
    d6: { "portas-secretas": fixo(2) },
    requisitos: { car: 9, con: 9 }, primarios: ["for", "int"], ordem: ["for", "int", "con", "des", "car", "sab"],
    equipamento: ["espada", "arco longo e 20 flechas", "cota de malha", "escudo", "grimório"],
    habilidades: ["Infravisão 18 m", "Acha portas secretas (2 em 6)", "Magia arcana com armadura", "Idiomas: comum, élfico"],
  },
];

/** id → classe (com fallback no guerreiro, para fichas antigas ou corrompidas). */
export function classePorId(id: string): ClasseOsr {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0];
}
