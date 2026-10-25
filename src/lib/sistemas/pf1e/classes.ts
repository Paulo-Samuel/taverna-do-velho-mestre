import type { ClasseDef } from "../tipos";
import { CONH } from "./dados";

// Classes do Pathfinder 1e (PRD, OGL 1.0a): núcleo, base, híbridas, ocultistas, alternativas e de PdM.
// Números das tabelas oficiais; descrições e piadas são da casa.

export type Progressao = "total" | "media" | "baixa";
export type Salvamento = "fort" | "ref" | "von";
export type TabelaMagia = "preparada" | "espontanea" | "arcanista" | "seis" | "quatro";

/** modificadores de atributo por id, para fórmulas de recursos */
export type Mods = Record<string, number>;

export type RecursoClasse = { id: string; rotulo: string; max: number };

export type ArmaClasse = {
  nome: string;
  /** atributo do ataque */
  atributo: "for" | "des";
  dano: string;
  /** "19-20/x2", "x3"... */
  critico: string;
  alcance: "corpo" | "distancia";
  duasMaos?: boolean;
  /** ataque de toque (bomba, rajada cinética, arma de fogo de perto) */
  toque?: boolean;
};

export type ClassePf1 = ClasseDef & {
  dadoVida: number;
  bba: Progressao;
  bons: Salvamento[];
  /** pontos de perícia por nível (antes da INT) */
  pontos: number;
  periciasClasse: string[];
  magia?: { atributo: string; tabela: TabelaMagia; tipo: "preparada" | "espontanea"; maxNivel?: number };
  armadura: { nome: string; bonus: number; desMax: number | null } | null;
  escudo?: number;
  arma: ArmaClasse;
  ordem: string[];
  /** peças de ouro que sobram depois do equipamento inicial */
  ouro: number;
  habilidades: [number, string][];
  recursos?: (nivel: number, m: Mods) => RecursoClasse[];
};

const metade = (n: number) => Math.floor(n / 2);
const minimo1 = (n: number) => Math.max(1, n);

// Armaduras usadas no equipamento inicial (bônus na CA e DES máxima)
const COURO = { nome: "armadura de couro", bonus: 2, desMax: 6 };
const COURO_BATIDO = { nome: "couro batido", bonus: 3, desMax: 5 };
const GIBAO = { nome: "gibão de peles", bonus: 4, desMax: 4 };
const CAMISAO = { nome: "camisão de cota de malha", bonus: 4, desMax: 4 };
const ESCAMAS = { nome: "cota de escamas", bonus: 5, desMax: 3 };
const MALHA = { nome: "cota de malha", bonus: 6, desMax: 2 };

// Armas iniciais
const ESPADA_LONGA: ArmaClasse = { nome: "espada longa", atributo: "for", dano: "1d8", critico: "19-20/x2", alcance: "corpo" };
const MACHADO_GRANDE: ArmaClasse = { nome: "machado grande", atributo: "for", dano: "1d12", critico: "x3", alcance: "corpo", duasMaos: true };
const ESPADA_GRANDE: ArmaClasse = { nome: "espada grande", atributo: "for", dano: "2d6", critico: "19-20/x2", alcance: "corpo", duasMaos: true };
const RAPIEIRA: ArmaClasse = { nome: "rapieira", atributo: "des", dano: "1d6", critico: "18-20/x2", alcance: "corpo" };
const ESPADA_CURTA: ArmaClasse = { nome: "espada curta", atributo: "des", dano: "1d6", critico: "19-20/x2", alcance: "corpo" };
const MACA_PESADA: ArmaClasse = { nome: "maça pesada", atributo: "for", dano: "1d8", critico: "x2", alcance: "corpo" };
const CIMITARRA: ArmaClasse = { nome: "cimitarra", atributo: "for", dano: "1d6", critico: "18-20/x2", alcance: "corpo" };
const ARCO_LONGO: ArmaClasse = { nome: "arco longo", atributo: "des", dano: "1d8", critico: "x3", alcance: "distancia" };
const BESTA_LEVE: ArmaClasse = { nome: "besta leve", atributo: "des", dano: "1d8", critico: "19-20/x2", alcance: "distancia" };
const CAJADO: ArmaClasse = { nome: "bordão", atributo: "for", dano: "1d6", critico: "x2", alcance: "corpo", duasMaos: true };
const LANCA_CURTA: ArmaClasse = { nome: "lança curta", atributo: "for", dano: "1d6", critico: "x2", alcance: "corpo" };
const MANGUAL: ArmaClasse = { nome: "maça-estrela", atributo: "for", dano: "1d8", critico: "x2", alcance: "corpo" };
const MACHADO_BATALHA: ArmaClasse = { nome: "machado de batalha", atributo: "for", dano: "1d8", critico: "x3", alcance: "corpo" };
const DESARMADO: ArmaClasse = { nome: "golpe desarmado", atributo: "for", dano: "1d6", critico: "x2", alcance: "corpo" };
const ADAGA: ArmaClasse = { nome: "adaga", atributo: "des", dano: "1d4", critico: "19-20/x2", alcance: "corpo" };

const KIT = ["mochila", "saco de dormir", "pederneira", "ração para 3 dias", "odre", "corda de seda (15 m)"];

const furia = (n: number, m: Mods, rotulo = "Rodadas de fúria"): RecursoClasse => ({ id: "furia", rotulo, max: 4 + m.con + 2 * (n - 1) });
const musica = (n: number, m: Mods, rotulo = "Rodadas de música de bardo"): RecursoClasse => ({ id: "musica", rotulo, max: 4 + m.car + 2 * (n - 1) });
const desafio = (n: number): RecursoClasse => ({ id: "desafio", rotulo: "Desafios por dia", max: 1 + Math.floor((n - 1) / 3) });
const formaSelvagem = (n: number): RecursoClasse[] => (n >= 4 ? [{ id: "forma", rotulo: "Forma selvagem", max: 1 + Math.floor((n - 4) / 2) }] : []);

export const CLASSES: ClassePf1[] = [
  // ——— Núcleo ———
  {
    id: "barbaro", nome: "Bárbaro", descricao: "Grita primeiro, bate depois e pergunta nunca.", atributoChave: "for",
    dadoVida: 12, pvBase: 12, bba: "total", bons: ["fort"], pontos: 4, papel: "combatente", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["acrobacia", "escalar", "oficio", "adestrar", "intimidar", "conh_natureza", "percepcao", "cavalgar", "sobrevivencia", "natacao"],
    pericias: ["intimidar", "percepcao", "sobrevivencia", "escalar"],
    armadura: GIBAO, arma: MACHADO_GRANDE, ordem: ["for", "con", "des", "sab", "car", "int"], ouro: 15,
    equipamento: ["machado grande", "gibão de peles", "duas azagaias", ...KIT],
    habilidades: [[1, "Fúria (+4 FOR e CON, +2 Vontade, -2 CA)"], [1, "Movimento rápido (+3 m)"], [2, "Poderes de fúria"], [2, "Esquiva sobrenatural"], [3, "Sentir armadilhas"], [7, "Redução de dano"], [11, "Fúria maior"], [14, "Vontade indomável"], [17, "Fúria incansável"], [20, "Fúria poderosa"]],
    recursos: (n, m) => [furia(n, m)],
  },
  {
    id: "bardo", nome: "Bardo", descricao: "Resolve tudo com uma canção, e quando não resolve, compõe outra mais alta.", atributoChave: "car",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["ref", "von"], pontos: 6, papel: "suporte", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["acrobacia", "avaliacao", "blefar", "escalar", "oficio", "diplomacia", "disfarce", "arte_fuga", "intimidar", ...CONH, "linguistica", "percepcao", "atuacao", "profissao", "sentir_motivacao", "prestidigitacao", "identificar_magia", "furtividade", "usar_instrumento"],
    pericias: ["atuacao", "diplomacia", "blefar", "percepcao", "conh_local", "sentir_motivacao"],
    magia: { atributo: "car", tabela: "seis", tipo: "espontanea" },
    armadura: COURO_BATIDO, arma: RAPIEIRA, ordem: ["car", "des", "con", "int", "sab", "for"], ouro: 10,
    equipamento: ["rapieira", "couro batido", "alaúde", "besta leve com 10 virotes", ...KIT],
    habilidades: [[1, "Conhecimento de bardo (+½ nível em Conhecimento)"], [1, "Música de bardo: inspirar coragem, fascinar, contramúsica"], [2, "Atuação versátil"], [3, "Inspirar competência"], [6, "Sugestão"], [8, "Canção sombria"], [9, "Inspirar grandeza"], [12, "Canção libertadora"], [15, "Inspirar heroísmo"], [20, "Canção mortal"]],
    recursos: (n, m) => [musica(n, m)],
  },
  {
    id: "clerigo", nome: "Clérigo", descricao: "Cura os amigos, assusta os mortos-vivos e cobra dízimo dos dois.", atributoChave: "sab",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "von"], pontos: 2, papel: "suporte", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["avaliacao", "oficio", "diplomacia", "cura", "conh_arcano", "conh_historia", "conh_nobreza", "conh_planos", "conh_religiao", "linguistica", "profissao", "sentir_motivacao", "identificar_magia"],
    pericias: ["cura", "conh_religiao", "sentir_motivacao", "diplomacia"],
    magia: { atributo: "sab", tabela: "preparada", tipo: "preparada" },
    armadura: ESCAMAS, escudo: 2, arma: MACA_PESADA, ordem: ["sab", "con", "for", "car", "des", "int"], ouro: 10,
    equipamento: ["maça pesada", "cota de escamas", "escudo pesado de madeira", "símbolo sagrado", "kit de cura", ...KIT],
    habilidades: [[1, "Aura do alinhamento da divindade"], [1, "Canalizar energia (1d6 a cada 2 níveis)"], [1, "Dois domínios (poderes e espaço extra por nível de magia)"], [1, "Conversão espontânea em magias de cura"], [1, "Orações (nível 0) à vontade"]],
    recursos: (n, m) => [{ id: "canalizar", rotulo: `Canalizar energia (${Math.ceil(n / 2)}d6)`, max: 3 + m.car }],
  },
  {
    id: "druida", nome: "Druida", descricao: "Abraça árvores, vira urso e julga você por usar lenha.", atributoChave: "sab",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "von"], pontos: 4, papel: "conjurador", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["escalar", "oficio", "voar", "adestrar", "cura", "conh_geografia", "conh_natureza", "percepcao", "profissao", "cavalgar", "identificar_magia", "sobrevivencia", "natacao"],
    pericias: ["conh_natureza", "sobrevivencia", "percepcao", "adestrar"],
    magia: { atributo: "sab", tabela: "preparada", tipo: "preparada" },
    armadura: GIBAO, escudo: 2, arma: CIMITARRA, ordem: ["sab", "con", "des", "for", "int", "car"], ouro: 10,
    equipamento: ["cimitarra", "gibão de peles", "escudo pesado de madeira", "funda", "visco e azevinho", ...KIT],
    habilidades: [[1, "Vínculo com a natureza (domínio ou companheiro animal)"], [1, "Empatia selvagem"], [2, "Caminho na floresta"], [3, "Rastro invisível"], [4, "Resistir ao chamado da natureza"], [4, "Forma selvagem"], [9, "Imunidade a venenos"], [13, "Mil faces"], [15, "Corpo atemporal"]],
    recursos: (n) => formaSelvagem(n),
  },
  {
    id: "guerreiro", nome: "Guerreiro", descricao: "Treinou a vida inteira para acertar coisas, e acerta. Só isso. Mas acerta.", atributoChave: "for",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort"], pontos: 2, papel: "combatente", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["escalar", "oficio", "adestrar", "intimidar", "conh_masmorras", "conh_engenharia", "profissao", "cavalgar", "sobrevivencia", "natacao"],
    pericias: ["intimidar", "escalar", "natacao"],
    armadura: MALHA, escudo: 2, arma: ESPADA_LONGA, ordem: ["for", "con", "des", "sab", "int", "car"], ouro: 15,
    equipamento: ["espada longa", "cota de malha", "escudo pesado de aço", "arco curto com 20 flechas", ...KIT],
    habilidades: [[1, "Talentos de combate bônus (1º e todo nível par)"], [2, "Bravura (+1 Vontade contra medo a cada 4 níveis)"], [3, "Treinamento em armadura"], [5, "Treinamento com armas (+1 ataque e dano, cresce a cada 4 níveis)"], [19, "Maestria em armadura"], [20, "Maestria com arma"]],
  },
  {
    id: "monge", nome: "Monge", descricao: "Larga tudo, até os sapatos, para socar o universo com serenidade.", atributoChave: "sab",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "ref", "von"], pontos: 4, papel: "combatente", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["acrobacia", "escalar", "oficio", "arte_fuga", "intimidar", "conh_historia", "conh_religiao", "percepcao", "atuacao", "profissao", "cavalgar", "sentir_motivacao", "furtividade", "natacao"],
    pericias: ["acrobacia", "percepcao", "sentir_motivacao", "furtividade"],
    armadura: null, arma: DESARMADO, ordem: ["sab", "des", "for", "con", "int", "car"], ouro: 5,
    equipamento: ["kama", "dez shurikens", "roupas de peregrino", ...KIT],
    habilidades: [[1, "Bônus na CA (SAB + 1 a cada 4 níveis)"], [1, "Rajada de golpes"], [1, "Ataque desarmado (dano cresce com o nível)"], [1, "Atordoar"], [2, "Evasão"], [3, "Movimento rápido"], [3, "Mente tranquila (+2 contra encantamentos)"], [4, "Reserva de ki"], [4, "Queda lenta"], [5, "Pureza corporal"], [7, "Integridade corporal"], [9, "Evasão aprimorada"], [11, "Corpo de diamante"], [13, "Alma de diamante"], [15, "Palma vibratória"], [17, "Corpo atemporal"], [20, "Perfeição"]],
    recursos: (n, m) => (n >= 4 ? [{ id: "ki", rotulo: "Pontos de ki", max: minimo1(metade(n) + m.sab) }] : []),
  },
  {
    id: "paladino", nome: "Paladino", descricao: "Virtude de aço polido e a certeza irritante de estar sempre certo.", atributoChave: "car",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort", "von"], pontos: 2, papel: "combatente", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["oficio", "diplomacia", "adestrar", "cura", "conh_nobreza", "conh_religiao", "profissao", "cavalgar", "sentir_motivacao", "identificar_magia"],
    pericias: ["diplomacia", "sentir_motivacao", "cura"],
    magia: { atributo: "car", tabela: "quatro", tipo: "preparada" },
    armadura: MALHA, escudo: 2, arma: ESPADA_LONGA, ordem: ["car", "for", "con", "sab", "des", "int"], ouro: 10,
    equipamento: ["espada longa", "cota de malha", "escudo pesado de aço", "símbolo sagrado", ...KIT],
    habilidades: [[1, "Aura de bem"], [1, "Detectar o mal"], [1, "Destruir o mal"], [2, "Graça divina (CAR nos salvamentos)"], [2, "Cura pelas mãos"], [3, "Aura de coragem"], [3, "Saúde divina"], [3, "Mercês"], [4, "Canalizar energia positiva"], [5, "Vínculo divino"], [11, "Aura de justiça"], [20, "Campeão sagrado"]],
    recursos: (n, m) => [
      { id: "destruir", rotulo: "Destruir o mal", max: 1 + Math.floor((n - 1) / 3) },
      ...(n >= 2 ? [{ id: "maos", rotulo: `Cura pelas mãos (${metade(n)}d6)`, max: minimo1(metade(n) + m.car) }] : []),
    ],
  },
  {
    id: "patrulheiro", nome: "Patrulheiro", descricao: "Conhece cada trilha da floresta e nenhuma regra de etiqueta.", atributoChave: "des",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort", "ref"], pontos: 6, papel: "combatente", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["escalar", "oficio", "adestrar", "cura", "intimidar", "conh_masmorras", "conh_geografia", "conh_natureza", "percepcao", "profissao", "cavalgar", "identificar_magia", "furtividade", "sobrevivencia", "natacao"],
    pericias: ["percepcao", "sobrevivencia", "furtividade", "conh_natureza", "escalar", "cura"],
    magia: { atributo: "sab", tabela: "quatro", tipo: "preparada" },
    armadura: COURO_BATIDO, arma: ARCO_LONGO, ordem: ["des", "sab", "con", "for", "int", "car"], ouro: 10,
    equipamento: ["arco longo com 40 flechas", "espada longa", "couro batido", ...KIT],
    habilidades: [[1, "Inimigo predileto (+2 ataque, dano e perícias)"], [1, "Rastrear"], [1, "Empatia selvagem"], [2, "Estilo de combate"], [3, "Terreno predileto"], [4, "Vínculo do caçador"], [7, "Caminho na floresta"], [8, "Rastreador veloz"], [9, "Evasão"], [12, "Camuflagem"], [17, "Esconder-se à vista"], [20, "Caçador mestre"]],
  },
  {
    id: "ladino", nome: "Ladino", descricao: "Encontra armadilhas, desarma armadilhas e, quando ninguém olha, arma armadilhas.", atributoChave: "des",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["ref"], pontos: 8, papel: "especialista", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["acrobacia", "avaliacao", "blefar", "escalar", "oficio", "diplomacia", "operar", "disfarce", "arte_fuga", "intimidar", "conh_masmorras", "conh_local", "linguistica", "percepcao", "atuacao", "profissao", "sentir_motivacao", "prestidigitacao", "furtividade", "natacao", "usar_instrumento"],
    pericias: ["furtividade", "operar", "percepcao", "acrobacia", "blefar", "prestidigitacao", "arte_fuga", "sentir_motivacao"],
    armadura: COURO_BATIDO, arma: ESPADA_CURTA, ordem: ["des", "int", "con", "sab", "car", "for"], ouro: 15,
    equipamento: ["espada curta", "besta leve com 10 virotes", "couro batido", "ferramentas de ladrão", ...KIT],
    habilidades: [[1, "Ataque furtivo"], [1, "Encontrar armadilhas (+½ nível em Percepção e Operar Mecanismo)"], [2, "Evasão"], [2, "Talentos de ladino"], [3, "Sentir armadilhas"], [4, "Esquiva sobrenatural"], [10, "Talentos avançados"], [20, "Golpe de mestre"]],
  },
  {
    id: "feiticeiro", nome: "Feiticeiro", descricao: "Não estudou nada: a magia veio no sangue, junto com o ego.", atributoChave: "car",
    dadoVida: 6, pvBase: 6, bba: "baixa", bons: ["von"], pontos: 2, papel: "conjurador", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["avaliacao", "blefar", "oficio", "voar", "intimidar", "conh_arcano", "profissao", "identificar_magia", "usar_instrumento"],
    pericias: ["identificar_magia", "conh_arcano", "blefar"],
    magia: { atributo: "car", tabela: "espontanea", tipo: "espontanea" },
    armadura: null, arma: BESTA_LEVE, ordem: ["car", "des", "con", "sab", "int", "for"], ouro: 10,
    equipamento: ["besta leve com 20 virotes", "adaga", "bolsa de componentes", ...KIT],
    habilidades: [[1, "Linhagem (poderes, magias e talentos bônus)"], [1, "Truques à vontade"], [1, "Dispensar materiais (componentes baratos)"], [3, "Poder de linhagem"], [9, "Poder de linhagem"], [15, "Poder de linhagem"], [20, "Ápice da linhagem"]],
  },
  {
    id: "mago", nome: "Mago", descricao: "Passou a juventude num livro para hoje explodir coisas com notas de rodapé.", atributoChave: "int",
    dadoVida: 6, pvBase: 6, bba: "baixa", bons: ["von"], pontos: 2, papel: "conjurador", fonte: "Core Rulebook (PRD)",
    periciasClasse: ["avaliacao", "oficio", "voar", ...CONH, "linguistica", "profissao", "identificar_magia"],
    pericias: ["identificar_magia", "conh_arcano", "conh_planos", "linguistica"],
    magia: { atributo: "int", tabela: "preparada", tipo: "preparada" },
    armadura: null, arma: CAJADO, ordem: ["int", "des", "con", "sab", "car", "for"], ouro: 10,
    equipamento: ["grimório", "bordão", "besta leve com 10 virotes", "bolsa de componentes", ...KIT],
    habilidades: [[1, "Vínculo arcano (familiar ou objeto)"], [1, "Escola arcana"], [1, "Truques à vontade"], [1, "Escrever pergaminho"], [5, "Talento bônus"], [10, "Talento bônus"], [15, "Talento bônus"], [20, "Talento bônus"]],
  },

  // ——— Base ———
  {
    id: "alquimista", nome: "Alquimista", descricao: "Bebe o que cozinha, joga o que sobra e chama isso de ciência.", atributoChave: "int",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "ref"], pontos: 4, papel: "especialista", fonte: "Advanced Player's Guide (PRD)",
    periciasClasse: ["avaliacao", "oficio", "operar", "voar", "cura", "conh_arcano", "conh_natureza", "percepcao", "profissao", "prestidigitacao", "identificar_magia", "sobrevivencia", "usar_instrumento"],
    pericias: ["oficio", "identificar_magia", "percepcao", "operar"],
    magia: { atributo: "int", tabela: "seis", tipo: "preparada" },
    armadura: COURO, arma: { nome: "bomba", atributo: "des", dano: "1d6", critico: "x2", alcance: "distancia", toque: true }, ordem: ["int", "des", "con", "sab", "for", "car"], ouro: 10,
    equipamento: ["kit de alquimista", "livro de fórmulas", "armadura de couro", "besta leve com 10 virotes", "dois frascos de fogo alquímico", ...KIT],
    habilidades: [[1, "Alquimia (extratos em vez de magias)"], [1, "Bombas"], [1, "Mutagênico"], [1, "Criar poções rápido"], [2, "Descobertas"], [2, "Uso venenoso"], [3, "Bombas rápidas"], [10, "Imunidade a veneno"], [14, "Infusão persistente"], [20, "Grande descoberta"]],
    recursos: (n, m) => [{ id: "bombas", rotulo: `Bombas (${Math.ceil(n / 2)}d6)`, max: n + m.int }],
  },
  {
    id: "cavaleiro", nome: "Cavaleiro", descricao: "Montado, armado e com um juramento que repete a cada cinco minutos.", atributoChave: "for",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort"], pontos: 4, papel: "combatente", fonte: "Advanced Player's Guide (PRD)",
    periciasClasse: ["escalar", "oficio", "diplomacia", "adestrar", "intimidar", "profissao", "cavalgar", "sentir_motivacao", "natacao"],
    pericias: ["cavalgar", "adestrar", "intimidar", "diplomacia"],
    armadura: ESCAMAS, escudo: 2, arma: ESPADA_LONGA, ordem: ["for", "con", "car", "des", "sab", "int"], ouro: 10,
    equipamento: ["lança de montaria", "espada longa", "cota de escamas", "escudo pesado de aço", "cavalo de guerra", ...KIT],
    habilidades: [[1, "Desafio"], [1, "Montaria"], [1, "Ordem"], [1, "Tática"], [3, "Investida montada"], [4, "Especialista em montaria"], [5, "Estandarte"], [11, "Investida poderosa"], [20, "Investida suprema"]],
    recursos: (n) => [desafio(n)],
  },
  {
    id: "inquisidor", nome: "Inquisidor", descricao: "Caça hereges com fé, besta e uma lista que nunca diminui.", atributoChave: "sab",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "von"], pontos: 6, papel: "especialista", fonte: "Advanced Player's Guide (PRD)",
    periciasClasse: ["blefar", "escalar", "oficio", "diplomacia", "disfarce", "cura", "intimidar", "conh_masmorras", "conh_natureza", "conh_planos", "conh_religiao", "percepcao", "profissao", "cavalgar", "sentir_motivacao", "identificar_magia", "furtividade", "sobrevivencia", "natacao"],
    pericias: ["sentir_motivacao", "intimidar", "percepcao", "sobrevivencia", "conh_religiao", "furtividade"],
    magia: { atributo: "sab", tabela: "seis", tipo: "espontanea" },
    armadura: GIBAO, arma: MANGUAL, ordem: ["sab", "con", "for", "des", "car", "int"], ouro: 10,
    equipamento: ["maça-estrela", "besta leve com 20 virotes", "gibão de peles", "símbolo sagrado", ...KIT],
    habilidades: [[1, "Domínio (ou inquisição)"], [1, "Julgamento"], [1, "Monstrologia"], [1, "Olhar severo (+½ nível em Intimidar e Sentir Motivação)"], [2, "Detectar alinhamento"], [3, "Solo sagrado"], [3, "Trabalho em equipe"], [5, "Arma vinculada"], [8, "Segundo julgamento"], [16, "Terceiro julgamento"], [20, "Julgamento verdadeiro"]],
    recursos: (n) => [{ id: "julgamento", rotulo: "Julgamentos por dia", max: 1 + Math.floor((n - 1) / 3) }],
  },
  {
    id: "oraculo", nome: "Oráculo", descricao: "Os deuses falaram com ela e deixaram uma maldição de lembrança.", atributoChave: "car",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["von"], pontos: 4, papel: "conjurador", fonte: "Advanced Player's Guide (PRD)",
    periciasClasse: ["oficio", "diplomacia", "cura", "conh_historia", "conh_planos", "conh_religiao", "profissao", "sentir_motivacao", "identificar_magia"],
    pericias: ["diplomacia", "cura", "conh_religiao", "sentir_motivacao"],
    magia: { atributo: "car", tabela: "espontanea", tipo: "espontanea" },
    armadura: GIBAO, escudo: 1, arma: MACA_PESADA, ordem: ["car", "con", "sab", "des", "for", "int"], ouro: 10,
    equipamento: ["maça pesada", "gibão de peles", "escudo leve de madeira", "símbolo sagrado", ...KIT],
    habilidades: [[1, "Mistério"], [1, "Maldição do oráculo"], [1, "Revelação"], [1, "Orações à vontade"], [3, "Revelação"], [7, "Revelação"], [11, "Revelação"], [15, "Revelação"], [19, "Revelação"], [20, "Revelação final"]],
  },
  {
    id: "invocador", nome: "Invocador", descricao: "Tem um amigo de outro plano que morde por ele, e se acha muito descolado por isso.", atributoChave: "car",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["von"], pontos: 2, papel: "conjurador", fonte: "Advanced Player's Guide (PRD)",
    periciasClasse: ["oficio", "voar", "adestrar", ...CONH, "linguistica", "profissao", "cavalgar", "identificar_magia", "usar_instrumento"],
    pericias: ["identificar_magia", "conh_planos", "conh_arcano"],
    magia: { atributo: "car", tabela: "seis", tipo: "espontanea" },
    armadura: COURO, arma: LANCA_CURTA, ordem: ["car", "con", "des", "sab", "int", "for"], ouro: 10,
    equipamento: ["lança curta", "besta leve com 10 virotes", "armadura de couro", ...KIT],
    habilidades: [[1, "Eidolon (evolui com você)"], [1, "Invocar criatura (como habilidade)"], [1, "Elo vital"], [2, "Ligação"], [4, "Escudo do aliado"], [6, "Abrigo"], [8, "Trocar de lugar"], [12, "Invocação maior"], [16, "Invocar duas vezes"], [20, "Gêmeo do eidolon"]],
    recursos: (n, m) => [{ id: "invocacao", rotulo: "Invocações por dia", max: 3 + m.car }],
  },
  {
    id: "bruxa", nome: "Bruxa", descricao: "O gato sabe mais do que ela, e os dois sabem mais do que você.", atributoChave: "int",
    dadoVida: 6, pvBase: 6, bba: "baixa", bons: ["von"], pontos: 2, papel: "conjurador", fonte: "Advanced Player's Guide (PRD)",
    periciasClasse: ["oficio", "voar", "cura", "intimidar", "conh_arcano", "conh_historia", "conh_natureza", "conh_planos", "profissao", "identificar_magia", "usar_instrumento"],
    pericias: ["identificar_magia", "cura", "conh_arcano", "intimidar"],
    magia: { atributo: "int", tabela: "preparada", tipo: "preparada" },
    armadura: null, arma: CAJADO, ordem: ["int", "des", "con", "sab", "car", "for"], ouro: 10,
    equipamento: ["bordão", "adaga", "familiar (guarda as magias)", "bolsa de componentes", ...KIT],
    habilidades: [[1, "Patrono"], [1, "Familiar"], [1, "Malefício"], [1, "Truques à vontade"], [2, "Malefício"], [10, "Malefício maior"], [18, "Grande malefício"]],
  },
  {
    id: "magus", nome: "Magus", descricao: "Espada numa mão, bola de fogo na outra e nenhuma mão livre para modéstia.", atributoChave: "int",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "von"], pontos: 2, papel: "combatente", fonte: "Ultimate Magic (PRD)",
    periciasClasse: ["escalar", "oficio", "voar", "intimidar", "conh_arcano", "conh_masmorras", "conh_planos", "profissao", "cavalgar", "identificar_magia", "usar_instrumento", "natacao"],
    pericias: ["identificar_magia", "conh_arcano", "intimidar"],
    magia: { atributo: "int", tabela: "seis", tipo: "preparada" },
    armadura: COURO_BATIDO, arma: CIMITARRA, ordem: ["int", "for", "des", "con", "sab", "car"], ouro: 10,
    equipamento: ["cimitarra", "couro batido", "grimório", "besta leve com 10 virotes", ...KIT],
    habilidades: [[1, "Reserva arcana"], [1, "Combate com magia"], [2, "Golpe arcano (magia de toque pela espada)"], [3, "Arcanas do magus"], [4, "Recordação de magia"], [7, "Armadura média"], [8, "Combate com magia aprimorado"], [10, "Treinamento de guerreiro"], [13, "Armadura pesada"], [14, "Combate com magia maior"], [16, "Contramágica"], [19, "Recordação maior"], [20, "Magus verdadeiro"]],
    recursos: (n, m) => [{ id: "reserva", rotulo: "Reserva arcana", max: minimo1(metade(n)) + m.int }],
  },
  {
    id: "pistoleiro", nome: "Pistoleiro", descricao: "Pólvora, coragem e uma arma que explode na sua cara uma vez a cada vinte.", atributoChave: "des",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort", "ref"], pontos: 4, papel: "combatente", fonte: "Ultimate Combat (PRD)",
    periciasClasse: ["acrobacia", "blefar", "escalar", "oficio", "adestrar", "intimidar", "conh_engenharia", "conh_local", "percepcao", "profissao", "cavalgar", "prestidigitacao", "sobrevivencia", "natacao"],
    pericias: ["percepcao", "acrobacia", "intimidar", "oficio"],
    armadura: COURO, arma: { nome: "pistola", atributo: "des", dano: "1d8", critico: "x4", alcance: "distancia", toque: true }, ordem: ["des", "sab", "con", "for", "int", "car"], ouro: 10,
    equipamento: ["pistola (de qualidade ruim)", "pólvora e balas para 20 tiros", "kit de armeiro", "armadura de couro", ...KIT],
    habilidades: [[1, "Garra (grit)"], [1, "Façanhas"], [1, "Ofício armeiro"], [2, "Coragem (+1 Vontade contra medo)"], [3, "Iniciativa do pistoleiro"], [5, "Treinamento com arma de fogo (+DES no dano)"], [11, "Façanhas avançadas"], [20, "Mestre pistoleiro"]],
    recursos: (_n, m) => [{ id: "garra", rotulo: "Garra", max: minimo1(m.sab) }],
  },

  // ——— Híbridas ———
  {
    id: "arcanista", nome: "Arcanista", descricao: "Desmonta magias como quem desmonta relógio, e sobra sempre uma peça.", atributoChave: "int",
    dadoVida: 6, pvBase: 6, bba: "baixa", bons: ["von"], pontos: 2, papel: "conjurador", fonte: "Advanced Class Guide (PRD)",
    periciasClasse: ["avaliacao", "oficio", "voar", ...CONH, "linguistica", "profissao", "identificar_magia", "usar_instrumento"],
    pericias: ["identificar_magia", "conh_arcano", "conh_planos"],
    magia: { atributo: "int", tabela: "arcanista", tipo: "espontanea" },
    armadura: null, arma: CAJADO, ordem: ["int", "des", "con", "car", "sab", "for"], ouro: 10,
    equipamento: ["grimório", "bordão", "besta leve com 10 virotes", "bolsa de componentes", ...KIT],
    habilidades: [[1, "Prepara como mago, conjura como feiticeiro"], [1, "Reserva arcanista"], [1, "Façanhas arcanas"], [1, "Consumir magias"], [20, "Supremacia mágica"]],
    recursos: (n) => [{ id: "reserva", rotulo: "Reserva arcanista", max: 3 + metade(n) }],
  },
  {
    id: "sangue_furioso", nome: "Sangue-furioso", descricao: "Quando se irrita, o sangue mágico ferve, e alguém sai voando pela janela.", atributoChave: "for",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort"], pontos: 4, papel: "combatente", fonte: "Advanced Class Guide (PRD)",
    periciasClasse: ["acrobacia", "escalar", "oficio", "adestrar", "intimidar", "conh_arcano", "percepcao", "cavalgar", "identificar_magia", "sobrevivencia", "natacao"],
    pericias: ["intimidar", "percepcao", "sobrevivencia", "acrobacia"],
    magia: { atributo: "car", tabela: "quatro", tipo: "espontanea" },
    armadura: GIBAO, arma: MACHADO_GRANDE, ordem: ["for", "con", "car", "des", "sab", "int"], ouro: 10,
    equipamento: ["machado grande", "gibão de peles", "duas azagaias", ...KIT],
    habilidades: [[1, "Fúria de sangue"], [1, "Linhagem"], [1, "Movimento rápido"], [2, "Esquiva sobrenatural"], [3, "Sentidos de sangue"], [4, "Conjuração de sangue"], [5, "Conjurar em fúria"], [7, "Redução de dano"], [11, "Fúria maior"], [14, "Vontade indomável"], [17, "Fúria incansável"], [20, "Fúria poderosa"]],
    recursos: (n, m) => [furia(n, m, "Rodadas de fúria de sangue")],
  },
  {
    id: "brigao", nome: "Brigão", descricao: "Já brigou em toda taverna do reino e foi expulso de metade delas.", atributoChave: "for",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort", "ref"], pontos: 4, papel: "combatente", fonte: "Advanced Class Guide (PRD)",
    periciasClasse: ["acrobacia", "escalar", "oficio", "arte_fuga", "adestrar", "intimidar", "conh_masmorras", "conh_local", "percepcao", "profissao", "cavalgar", "sentir_motivacao", "natacao"],
    pericias: ["acrobacia", "intimidar", "percepcao", "escalar"],
    armadura: COURO_BATIDO, arma: DESARMADO, ordem: ["for", "des", "con", "sab", "int", "car"], ouro: 10,
    equipamento: ["soqueiras com cravos", "couro batido", "duas azagaias", ...KIT],
    habilidades: [[1, "Golpe desarmado (dano de monge)"], [1, "Flexibilidade marcial"], [2, "Rajada do brigão"], [2, "Talentos de combate bônus"], [3, "Manobra treinada"], [4, "Golpe nocauteador"], [5, "Treinamento com armas próximas"], [16, "Nocaute duplo"], [20, "Golpe estrondoso"]],
    recursos: (n) => [{ id: "flexibilidade", rotulo: "Flexibilidade marcial", max: 3 + metade(n) }],
  },
  {
    id: "cacador", nome: "Caçador", descricao: "Ele e o bicho caçam juntos; o bicho é o mais educado da dupla.", atributoChave: "sab",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "ref"], pontos: 6, papel: "combatente", fonte: "Advanced Class Guide (PRD)",
    periciasClasse: ["escalar", "oficio", "adestrar", "cura", "intimidar", "conh_masmorras", "conh_geografia", "conh_natureza", "percepcao", "profissao", "cavalgar", "identificar_magia", "furtividade", "sobrevivencia", "natacao"],
    pericias: ["percepcao", "sobrevivencia", "adestrar", "conh_natureza", "furtividade", "cura"],
    magia: { atributo: "sab", tabela: "seis", tipo: "espontanea" },
    armadura: GIBAO, escudo: 1, arma: ARCO_LONGO, ordem: ["sab", "des", "con", "for", "int", "car"], ouro: 10,
    equipamento: ["arco longo com 40 flechas", "lança curta", "gibão de peles", "escudo leve de madeira", ...KIT],
    habilidades: [[1, "Companheiro animal"], [1, "Foco animal"], [1, "Empatia selvagem"], [2, "Rastrear"], [3, "Táticas de caçador"], [4, "Companheiro aprimorado"], [5, "Caminho na floresta"], [7, "Elo instantâneo"], [10, "Foco animal maior"], [17, "Une dentes e garras"], [20, "Caçador mestre"]],
  },
  {
    id: "investigador", nome: "Investigador", descricao: "Deduz o culpado pelo barro na bota, e às vezes o culpado é a própria bota.", atributoChave: "int",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["ref", "von"], pontos: 6, papel: "especialista", fonte: "Advanced Class Guide (PRD)",
    periciasClasse: ["acrobacia", "avaliacao", "blefar", "escalar", "oficio", "diplomacia", "operar", "disfarce", "arte_fuga", "cura", "intimidar", ...CONH, "linguistica", "percepcao", "atuacao", "profissao", "sentir_motivacao", "prestidigitacao", "identificar_magia", "furtividade", "natacao", "usar_instrumento"],
    pericias: ["percepcao", "sentir_motivacao", "operar", "conh_local", "diplomacia", "furtividade"],
    magia: { atributo: "int", tabela: "seis", tipo: "preparada" },
    armadura: COURO_BATIDO, arma: RAPIEIRA, ordem: ["int", "des", "con", "sab", "car", "for"], ouro: 10,
    equipamento: ["rapieira", "besta leve com 10 virotes", "couro batido", "kit de alquimista", "lupa", ...KIT],
    habilidades: [[1, "Alquimia (extratos)"], [1, "Inspiração (+1d6 em perícias e ataques)"], [1, "Encontrar armadilhas"], [2, "Uso venenoso"], [3, "Talentos de investigador"], [4, "Combate estudado"], [4, "Golpe estudado"], [11, "Inspiração incansável"], [20, "Inspiração verdadeira"]],
    recursos: (n, m) => [{ id: "inspiracao", rotulo: "Inspiração", max: minimo1(metade(n) + m.int) }],
  },
  {
    id: "xama", nome: "Xamã", descricao: "Conversa com espíritos que, francamente, falam demais.", atributoChave: "sab",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["von"], pontos: 4, papel: "conjurador", fonte: "Advanced Class Guide (PRD)",
    periciasClasse: ["oficio", "diplomacia", "voar", "adestrar", "cura", "conh_natureza", "conh_planos", "conh_religiao", "profissao", "cavalgar", "identificar_magia", "sobrevivencia"],
    pericias: ["cura", "conh_natureza", "conh_planos", "sobrevivencia"],
    magia: { atributo: "sab", tabela: "preparada", tipo: "preparada" },
    armadura: COURO, arma: LANCA_CURTA, ordem: ["sab", "con", "des", "car", "int", "for"], ouro: 10,
    equipamento: ["lança curta", "armadura de couro", "chocalho de ossos", "animal espiritual", ...KIT],
    habilidades: [[1, "Espírito"], [1, "Animal espiritual"], [1, "Malefícios"], [1, "Orações à vontade"], [4, "Espírito errante"], [8, "Malefício de espírito errante"], [16, "Espírito maior"], [20, "Espírito verdadeiro"]],
  },
  {
    id: "escaldo", nome: "Escaldo", descricao: "Canta tão alto na batalha que os amigos entram em fúria só para não ouvir.", atributoChave: "car",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "von"], pontos: 4, papel: "suporte", fonte: "Advanced Class Guide (PRD)",
    periciasClasse: ["acrobacia", "avaliacao", "blefar", "escalar", "oficio", "diplomacia", "arte_fuga", "adestrar", "intimidar", ...CONH, "linguistica", "percepcao", "atuacao", "profissao", "cavalgar", "sentir_motivacao", "identificar_magia", "natacao", "usar_instrumento"],
    pericias: ["atuacao", "intimidar", "percepcao", "conh_historia"],
    magia: { atributo: "car", tabela: "seis", tipo: "espontanea" },
    armadura: CAMISAO, escudo: 1, arma: MACHADO_BATALHA, ordem: ["car", "for", "con", "des", "sab", "int"], ouro: 10,
    equipamento: ["machado de batalha", "camisão de cota de malha", "escudo leve de madeira", "trompa de guerra", ...KIT],
    habilidades: [[1, "Canção inspirada (fúria compartilhada)"], [1, "Conhecimento de bardo"], [2, "Versatilidade"], [3, "Poderes de fúria"], [5, "Arma encantada"], [7, "Redução de dano"], [10, "Canção do massacre"], [14, "Canção de sangue"], [20, "Canção mestra"]],
    recursos: (n, m) => [musica(n, m, "Rodadas de canção inspirada")],
  },
  {
    id: "matador", nome: "Matador", descricao: "Estuda o alvo, aponta e termina o serviço antes do café esfriar.", atributoChave: "des",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort", "ref"], pontos: 6, papel: "combatente", fonte: "Advanced Class Guide (PRD)",
    periciasClasse: ["acrobacia", "blefar", "escalar", "oficio", "disfarce", "cura", "intimidar", "conh_masmorras", "conh_geografia", "conh_local", "percepcao", "profissao", "cavalgar", "sentir_motivacao", "furtividade", "sobrevivencia", "natacao"],
    pericias: ["percepcao", "furtividade", "intimidar", "sobrevivencia", "acrobacia", "sentir_motivacao"],
    armadura: COURO_BATIDO, arma: ESPADA_CURTA, ordem: ["des", "con", "for", "sab", "int", "car"], ouro: 10,
    equipamento: ["duas espadas curtas", "arco curto com 20 flechas", "couro batido", ...KIT],
    habilidades: [[1, "Alvo estudado (+1 ataque, dano e perícias, cresce)"], [1, "Rastrear"], [2, "Talentos de matador"], [3, "Ataque furtivo"], [7, "Perseguidor"], [11, "Rastreador veloz"], [14, "Matar silencioso"], [17, "Alvo estudado rápido"], [20, "Golpe mestre"]],
  },
  {
    id: "espadachim", nome: "Espadachim", descricao: "Floreia a lâmina, sorri para a plateia e só depois lembra que tem um oponente.", atributoChave: "des",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["ref"], pontos: 4, papel: "combatente", fonte: "Advanced Class Guide (PRD)",
    periciasClasse: ["acrobacia", "blefar", "escalar", "oficio", "diplomacia", "arte_fuga", "intimidar", "conh_local", "conh_nobreza", "percepcao", "atuacao", "profissao", "cavalgar", "sentir_motivacao", "prestidigitacao", "natacao"],
    pericias: ["acrobacia", "blefar", "percepcao", "intimidar"],
    armadura: COURO, arma: RAPIEIRA, ordem: ["des", "car", "con", "for", "sab", "int"], ouro: 10,
    equipamento: ["rapieira", "armadura de couro", "capa estilosa", "adaga", ...KIT],
    habilidades: [[1, "Panache"], [1, "Façanhas (aparar e responder, esquiva oportuna...)"], [1, "Refinamento do espadachim (DES em armas leves)"], [3, "Ágil (+1 CA, cresce a cada 4 níveis)"], [4, "Talentos de combate bônus"], [5, "Treinamento com arma"], [20, "Arma mestra"]],
    recursos: (_n, m) => [{ id: "panache", rotulo: "Panache", max: minimo1(m.car) }],
  },
  {
    id: "sacerdote_guerreiro", nome: "Sacerdote Guerreiro", descricao: "Reza antes da batalha, durante a batalha e em cima do inimigo caído.", atributoChave: "sab",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "von"], pontos: 2, papel: "combatente", fonte: "Advanced Class Guide (PRD)",
    periciasClasse: ["escalar", "oficio", "diplomacia", "adestrar", "cura", "intimidar", "conh_engenharia", "conh_religiao", "profissao", "cavalgar", "sentir_motivacao", "identificar_magia", "sobrevivencia", "natacao"],
    pericias: ["conh_religiao", "intimidar", "cura"],
    magia: { atributo: "sab", tabela: "seis", tipo: "preparada" },
    armadura: ESCAMAS, escudo: 2, arma: ESPADA_LONGA, ordem: ["sab", "for", "con", "des", "car", "int"], ouro: 10,
    equipamento: ["espada longa", "cota de escamas", "escudo pesado de aço", "símbolo sagrado", ...KIT],
    habilidades: [[1, "Bênçãos"], [1, "Foco sagrado e arma sagrada"], [2, "Fervor (cura ou magia rápida)"], [3, "Talentos bônus"], [4, "Canalizar energia"], [7, "Armadura sagrada"], [20, "Avatar"]],
    recursos: (n, m) => (n >= 2 ? [{ id: "fervor", rotulo: "Fervor", max: minimo1(metade(n) + m.sab) }] : []),
  },

  // ——— Ocultistas ———
  {
    id: "cinetico", nome: "Cinético", descricao: "Arremessa os elementos com a mente e paga a conta com o próprio corpo.", atributoChave: "con",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "ref"], pontos: 4, papel: "combatente", fonte: "Occult Adventures (PRD)",
    periciasClasse: ["acrobacia", "oficio", "intimidar", "percepcao", "profissao", "usar_instrumento"],
    pericias: ["percepcao", "acrobacia", "intimidar"],
    armadura: COURO, arma: { nome: "rajada cinética", atributo: "des", dano: "1d6", critico: "x2", alcance: "distancia" }, ordem: ["con", "des", "sab", "for", "int", "car"], ouro: 10,
    equipamento: ["armadura de couro", "adaga", "mão cheia de pedrinhas (por estilo)", ...KIT],
    habilidades: [[1, "Rajada cinética"], [1, "Fardo (troca PV por poder)"], [1, "Foco elemental"], [2, "Defesa elemental"], [2, "Talentos de infusão"], [3, "Sobrecarga elemental"], [4, "Talento utilitário"], [6, "Expansão elemental"], [11, "Fardo suprimido"], [16, "Fardo superado"], [20, "Ascensão elemental"]],
    recursos: (_n, m) => [{ id: "fardo", rotulo: "Tolerância a fardo", max: Math.max(1, 3 + m.con) }],
  },
  {
    id: "medium", nome: "Médium", descricao: "Empresta o corpo a espíritos lendários; o aluguel é pago em pesadelos.", atributoChave: "car",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["von"], pontos: 4, papel: "suporte", fonte: "Occult Adventures (PRD)",
    periciasClasse: ["blefar", "oficio", "diplomacia", "voar", "cura", "intimidar", ...CONH, "linguistica", "percepcao", "atuacao", "profissao", "sentir_motivacao", "identificar_magia", "usar_instrumento"],
    pericias: ["sentir_motivacao", "diplomacia", "conh_planos", "percepcao"],
    magia: { atributo: "car", tabela: "quatro", tipo: "espontanea" },
    armadura: COURO_BATIDO, arma: ESPADA_LONGA, ordem: ["car", "con", "for", "des", "sab", "int"], ouro: 10,
    equipamento: ["espada longa", "couro batido", "velas e incenso", ...KIT],
    habilidades: [[1, "Canalizar espírito (um de seis arquétipos lendários)"], [1, "Bônus do espírito"], [1, "Influência"], [2, "Conhecimento dos espíritos"], [3, "Poder intermediário"], [5, "Taumaturgia"], [11, "Poder maior"], [17, "Poder supremo"], [20, "Médium verdadeiro"]],
  },
  {
    id: "mesmerista", nome: "Mesmerista", descricao: "Olha nos seus olhos e você empresta dinheiro sem saber por quê.", atributoChave: "car",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["ref", "von"], pontos: 6, papel: "suporte", fonte: "Occult Adventures (PRD)",
    periciasClasse: ["avaliacao", "blefar", "oficio", "diplomacia", "disfarce", "arte_fuga", "intimidar", "conh_arcano", "conh_masmorras", "conh_historia", "conh_local", "conh_nobreza", "conh_religiao", "linguistica", "percepcao", "atuacao", "profissao", "sentir_motivacao", "prestidigitacao", "identificar_magia", "furtividade", "usar_instrumento"],
    pericias: ["blefar", "diplomacia", "sentir_motivacao", "intimidar", "percepcao", "disfarce"],
    magia: { atributo: "car", tabela: "seis", tipo: "espontanea" },
    armadura: COURO_BATIDO, arma: ESPADA_CURTA, ordem: ["car", "des", "con", "sab", "int", "for"], ouro: 10,
    equipamento: ["espada curta", "couro batido", "pêndulo de prata", ...KIT],
    habilidades: [[1, "Olhar hipnótico (-2 em Vontade do alvo)"], [1, "Conhecimento sombrio"], [1, "Truques do mesmerista"], [2, "Toque de truque"], [3, "Pontada dolorosa"], [5, "Estratagema manipulador"], [11, "Truque duplo"], [20, "Mente rival"]],
    recursos: (n, m) => [{ id: "truques", rotulo: "Truques do mesmerista", max: minimo1(metade(n) + m.car) }],
  },
  {
    id: "ocultista", nome: "Ocultista", descricao: "Coleciona bugigangas antigas e tira magia de cada uma, para desespero dos museus.", atributoChave: "int",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "von"], pontos: 4, papel: "especialista", fonte: "Occult Adventures (PRD)",
    periciasClasse: ["avaliacao", "oficio", "diplomacia", "operar", "disfarce", "voar", "cura", "intimidar", ...CONH, "linguistica", "percepcao", "profissao", "cavalgar", "sentir_motivacao", "identificar_magia", "usar_instrumento"],
    pericias: ["avaliacao", "conh_arcano", "conh_historia", "usar_instrumento"],
    magia: { atributo: "int", tabela: "seis", tipo: "espontanea" },
    armadura: GIBAO, arma: ESPADA_LONGA, ordem: ["int", "con", "for", "des", "sab", "car"], ouro: 10,
    equipamento: ["espada longa", "gibão de peles", "dois implementos antigos", ...KIT],
    habilidades: [[1, "Implementos (escolas de magia ligadas a objetos)"], [1, "Foco mental"], [1, "Mapeamento de auras"], [2, "Leitura de objetos"], [4, "Moldar foco"], [5, "Magia de implementos"], [8, "Círculo mágico"], [12, "Portal"], [20, "Mestre dos implementos"]],
    recursos: (n, m) => [{ id: "foco", rotulo: "Foco mental", max: n + m.int }],
  },
  {
    id: "psiquico", nome: "Psíquico", descricao: "Lança magia só com a mente, e por isso ninguém sabe se ela está conjurando ou julgando você.", atributoChave: "int",
    dadoVida: 6, pvBase: 6, bba: "baixa", bons: ["von"], pontos: 2, papel: "conjurador", fonte: "Occult Adventures (PRD)",
    periciasClasse: ["avaliacao", "blefar", "oficio", "diplomacia", "voar", "intimidar", ...CONH, "linguistica", "percepcao", "profissao", "sentir_motivacao", "identificar_magia"],
    pericias: ["identificar_magia", "sentir_motivacao", "conh_arcano"],
    magia: { atributo: "int", tabela: "espontanea", tipo: "espontanea" },
    armadura: null, arma: BESTA_LEVE, ordem: ["int", "des", "con", "sab", "car", "for"], ouro: 10,
    equipamento: ["besta leve com 20 virotes", "adaga", "cristal de foco", ...KIT],
    habilidades: [[1, "Disciplina psíquica"], [1, "Reserva frênica"], [1, "Amplificações frênicas"], [1, "Conhecimento de truques"], [2, "Detectar pensamentos"], [11, "Amplificações maiores"], [17, "Telepatia"], [20, "Mente ascendente"]],
    recursos: (n, m) => [{ id: "frenica", rotulo: "Reserva frênica", max: minimo1(metade(n) + Math.max(m.sab, m.car)) }],
  },
  {
    id: "espiritualista", nome: "Espiritualista", descricao: "Anda com um fantasma de estimação que chora, grita e às vezes bate nos outros.", atributoChave: "sab",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["fort", "von"], pontos: 4, papel: "conjurador", fonte: "Occult Adventures (PRD)",
    periciasClasse: ["blefar", "oficio", "voar", "intimidar", "conh_arcano", "conh_masmorras", "conh_natureza", "conh_planos", "conh_religiao", "percepcao", "profissao", "sentir_motivacao", "identificar_magia", "usar_instrumento"],
    pericias: ["conh_religiao", "percepcao", "sentir_motivacao", "intimidar"],
    magia: { atributo: "sab", tabela: "seis", tipo: "espontanea" },
    armadura: COURO, arma: LANCA_CURTA, ordem: ["sab", "con", "des", "for", "int", "car"], ouro: 10,
    equipamento: ["lança curta", "armadura de couro", "relicário do fantasma", ...KIT],
    habilidades: [[1, "Fantasma (focado numa emoção)"], [1, "Laço etéreo"], [2, "Elo vital espiritual"], [3, "Laço compartilhado"], [5, "Visão espectral"], [12, "Fantasma maior"], [17, "Fusão espectral"], [20, "Fantasma empoderado"]],
  },

  // ——— Outras ———
  {
    id: "vigilante", nome: "Vigilante", descricao: "De dia, nobre entediante; à noite, justiceiro mascarado com problemas de sono.", atributoChave: "des",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["ref", "von"], pontos: 6, papel: "especialista", fonte: "Ultimate Intrigue (PRD)",
    periciasClasse: ["acrobacia", "avaliacao", "blefar", "escalar", "oficio", "diplomacia", "operar", "disfarce", "arte_fuga", "intimidar", "conh_masmorras", "conh_engenharia", "conh_local", "conh_nobreza", "linguistica", "percepcao", "atuacao", "profissao", "cavalgar", "sentir_motivacao", "prestidigitacao", "furtividade", "sobrevivencia", "natacao", "usar_instrumento"],
    pericias: ["disfarce", "furtividade", "percepcao", "intimidar", "acrobacia", "diplomacia"],
    armadura: COURO_BATIDO, arma: ESPADA_LONGA, ordem: ["des", "for", "con", "car", "sab", "int"], ouro: 10,
    equipamento: ["espada longa", "couro batido", "máscara e capa", "ganchos de escalada", ...KIT],
    habilidades: [[1, "Identidade dupla"], [1, "Especialização (vingador ou perseguidor)"], [1, "Aparência aterrorizante"], [2, "Talentos de vigilante"], [3, "Habilidade inesperada"], [3, "Ataque oculto"], [11, "Vigilância suprema"], [20, "Vigilante lendário"]],
  },
  {
    id: "metamorfo", nome: "Metamorfo", descricao: "Vira bicho quando quer, e quando não quer também, se alguém pisar no rabo.", atributoChave: "sab",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort", "ref"], pontos: 4, papel: "combatente", fonte: "Ultimate Wilderness (PRD)",
    periciasClasse: ["acrobacia", "escalar", "oficio", "voar", "adestrar", "intimidar", "conh_natureza", "percepcao", "profissao", "cavalgar", "furtividade", "sobrevivencia", "natacao"],
    pericias: ["percepcao", "sobrevivencia", "acrobacia", "furtividade"],
    armadura: GIBAO, arma: { nome: "garras do metamorfo", atributo: "for", dano: "1d6", critico: "x2", alcance: "corpo" }, ordem: ["sab", "for", "con", "des", "int", "car"], ouro: 10,
    equipamento: ["gibão de peles", "lança curta", "talismã animal", ...KIT],
    habilidades: [[1, "Aspecto menor"], [1, "Garras do metamorfo"], [1, "Empatia selvagem"], [2, "Defesa do metamorfo"], [4, "Forma selvagem"], [5, "Caminho na floresta"], [9, "Aspecto maior"], [15, "Aspecto final"], [20, "Metamorfo final"]],
    recursos: (n) => formaSelvagem(n),
  },
  {
    id: "antipaladino", nome: "Antipaladino", descricao: "Tudo o que o paladino jurou não fazer, com o dobro de espinhos na armadura.", atributoChave: "car",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort", "von"], pontos: 2, papel: "combatente", fonte: "Advanced Player's Guide (PRD)",
    periciasClasse: ["blefar", "oficio", "disfarce", "adestrar", "intimidar", "conh_religiao", "profissao", "cavalgar", "sentir_motivacao", "identificar_magia", "furtividade"],
    pericias: ["intimidar", "blefar", "cavalgar"],
    magia: { atributo: "car", tabela: "quatro", tipo: "preparada" },
    armadura: MALHA, arma: ESPADA_GRANDE, ordem: ["car", "for", "con", "sab", "des", "int"], ouro: 10,
    equipamento: ["espada grande", "cota de malha com cravos", "símbolo profano", ...KIT],
    habilidades: [[1, "Aura do mal"], [1, "Detectar o bem"], [1, "Destruir o bem"], [2, "Resiliência profana (CAR nos salvamentos)"], [2, "Toque da corrupção"], [3, "Aura de covardia"], [3, "Crueldades"], [4, "Canalizar energia negativa"], [5, "Dádiva sombria"], [20, "Campeão profano"]],
    recursos: (n, m) => [
      { id: "destruir", rotulo: "Destruir o bem", max: 1 + Math.floor((n - 1) / 3) },
      ...(n >= 2 ? [{ id: "toque", rotulo: `Toque da corrupção (${metade(n)}d6)`, max: minimo1(metade(n) + m.car) }] : []),
    ],
  },
  {
    id: "ninja", nome: "Ninja", descricao: "Você não viu o ninja chegar. Nem sair. Nem a sua bolsa sumir.", atributoChave: "des",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["ref"], pontos: 8, papel: "especialista", fonte: "Ultimate Combat (PRD)",
    periciasClasse: ["acrobacia", "avaliacao", "blefar", "escalar", "oficio", "diplomacia", "operar", "disfarce", "arte_fuga", "intimidar", "conh_local", "conh_nobreza", "linguistica", "percepcao", "atuacao", "profissao", "sentir_motivacao", "prestidigitacao", "furtividade", "natacao", "usar_instrumento"],
    pericias: ["furtividade", "acrobacia", "percepcao", "escalar", "disfarce", "operar", "arte_fuga", "blefar"],
    armadura: COURO, arma: { nome: "wakizashi", atributo: "des", dano: "1d6", critico: "18-20/x2", alcance: "corpo" }, ordem: ["des", "car", "con", "sab", "int", "for"], ouro: 10,
    equipamento: ["wakizashi", "dez shurikens", "armadura de couro", "roupas escuras", ...KIT],
    habilidades: [[1, "Ataque furtivo"], [1, "Envenenar"], [2, "Reserva de ki"], [2, "Truques de ninja"], [3, "Sem rastros"], [10, "Truques de mestre"], [12, "Invisibilidade aprimorada"], [20, "Mestre das sombras"]],
    recursos: (n, m) => [{ id: "ki", rotulo: "Pontos de ki", max: minimo1(metade(n) + m.car) }],
  },
  {
    id: "samurai", nome: "Samurai", descricao: "Honra, katana e um senhor que nunca agradece.", atributoChave: "for",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort"], pontos: 4, papel: "combatente", fonte: "Ultimate Combat (PRD)",
    periciasClasse: ["escalar", "oficio", "diplomacia", "adestrar", "intimidar", "profissao", "cavalgar", "sentir_motivacao", "natacao"],
    pericias: ["intimidar", "cavalgar", "sentir_motivacao", "diplomacia"],
    armadura: ESCAMAS, arma: { nome: "katana", atributo: "for", dano: "1d10", critico: "18-20/x2", alcance: "corpo", duasMaos: true }, ordem: ["for", "con", "car", "des", "sab", "int"], ouro: 10,
    equipamento: ["katana", "arco longo com 20 flechas", "armadura de lâminas", "cavalo", ...KIT],
    habilidades: [[1, "Desafio"], [1, "Montaria"], [1, "Ordem"], [1, "Resolução"], [3, "Proficiência com arma"], [4, "Especialista em montaria"], [5, "Talentos bônus"], [9, "Resolução maior"], [17, "Último sopro"], [20, "Guerreiro supremo"]],
    recursos: (n) => [desafio(n), { id: "resolucao", rotulo: "Resolução", max: 1 + Math.floor(n / 2) }],
  },

  // ——— Classes de PdM ———
  {
    id: "adepto", nome: "Adepto", descricao: "Curandeira do vilarejo: sabe três magias e todas as fofocas.", atributoChave: "sab",
    dadoVida: 6, pvBase: 6, bba: "baixa", bons: ["von"], pontos: 2, papel: "PdM", fonte: "GameMastery Guide (PRD)",
    periciasClasse: ["oficio", "adestrar", "cura", ...CONH, "profissao", "identificar_magia", "sobrevivencia"],
    pericias: ["cura", "conh_religiao", "identificar_magia"],
    magia: { atributo: "sab", tabela: "seis", tipo: "preparada", maxNivel: 5 },
    armadura: null, arma: CAJADO, ordem: ["sab", "con", "des", "int", "car", "for"], ouro: 5,
    equipamento: ["bordão", "símbolo sagrado de madeira", "ervas", ...KIT],
    habilidades: [[1, "Magias divinas simples"], [2, "Familiar"]],
  },
  {
    id: "aristocrata", nome: "Aristocrata", descricao: "Nunca carregou nada mais pesado que um título.", atributoChave: "car",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["von"], pontos: 4, papel: "PdM", fonte: "GameMastery Guide (PRD)",
    periciasClasse: ["avaliacao", "blefar", "oficio", "diplomacia", "disfarce", "adestrar", "intimidar", ...CONH, "linguistica", "percepcao", "atuacao", "profissao", "cavalgar", "sentir_motivacao", "natacao"],
    pericias: ["diplomacia", "conh_nobreza", "sentir_motivacao", "cavalgar"],
    armadura: COURO, arma: RAPIEIRA, ordem: ["car", "int", "des", "sab", "con", "for"], ouro: 50,
    equipamento: ["rapieira de cabo dourado", "roupas finas", "anel de sinete", ...KIT],
    habilidades: [[1, "Influência e berço"]],
  },
  {
    id: "plebeu", nome: "Plebeu", descricao: "Ara a terra, paga imposto e morre primeiro quando o dragão aparece.", atributoChave: "con",
    dadoVida: 6, pvBase: 6, bba: "baixa", bons: [], pontos: 2, papel: "PdM", fonte: "GameMastery Guide (PRD)",
    periciasClasse: ["escalar", "oficio", "adestrar", "percepcao", "profissao", "cavalgar", "natacao"],
    pericias: ["profissao", "oficio"],
    armadura: null, arma: { nome: "forcado", atributo: "for", dano: "1d6", critico: "x2", alcance: "corpo", duasMaos: true }, ordem: ["con", "for", "sab", "des", "int", "car"], ouro: 2,
    equipamento: ["forcado", "roupas de camponês", "pão dormido", ...KIT],
    habilidades: [[1, "Resiliência de quem não tem escolha"]],
  },
  {
    id: "especialista", nome: "Especialista", descricao: "Ferreiro, escriba ou ourives: o único do grupo que sabe fazer algo útil.", atributoChave: "int",
    dadoVida: 8, pvBase: 8, bba: "media", bons: ["von"], pontos: 6, papel: "PdM", fonte: "GameMastery Guide (PRD)",
    periciasClasse: ["avaliacao", "oficio", "diplomacia", "operar", "cura", "conh_engenharia", "conh_local", "linguistica", "percepcao", "profissao", "sentir_motivacao"],
    pericias: ["oficio", "profissao", "avaliacao", "percepcao", "diplomacia", "conh_local"],
    armadura: COURO, arma: ADAGA, ordem: ["int", "sab", "des", "con", "car", "for"], ouro: 25,
    equipamento: ["ferramentas de artesão", "adaga", "avental de couro", ...KIT],
    habilidades: [[1, "Dez perícias de classe à escolha (aqui, as de ofício)"]],
  },
  {
    id: "combatente", nome: "Combatente", descricao: "Guarda de portão: lança, elmo e nenhuma vontade de estar ali.", atributoChave: "for",
    dadoVida: 10, pvBase: 10, bba: "total", bons: ["fort"], pontos: 2, papel: "PdM", fonte: "GameMastery Guide (PRD)",
    periciasClasse: ["escalar", "adestrar", "intimidar", "profissao", "cavalgar", "natacao"],
    pericias: ["intimidar", "percepcao"],
    armadura: CAMISAO, escudo: 1, arma: LANCA_CURTA, ordem: ["for", "con", "des", "sab", "int", "car"], ouro: 5,
    equipamento: ["lança curta", "camisão de cota de malha", "escudo leve", "elmo amassado", ...KIT],
    habilidades: [[1, "Treinamento básico com todas as armas marciais"]],
  },
];
