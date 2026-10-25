import "server-only";
import type { AncestralidadeDef, AtributoDef, ClasseDef, OpcaoSimples, PericiaDef } from "../tipos";

// Tabelas do D&D 5e pelo SRD 5.2 (Creative Commons BY 4.0). Descrições escritas pela taverna, não copiadas de livro.
// Ids antigos (guerreiro, ladino, mago, clerigo, patrulheiro, barbaro, bardo; humano, elfo, anao, halfling,
// draconato, gnomo, orc, tiefling) não mudam: fichas já criadas dependem deles.

export const ATRIBUTOS: AtributoDef[] = [
  { id: "for", nome: "Força", abrev: "FOR", descricao: "Músculo, alcance de salto e capacidade de arrombar portas." },
  { id: "des", nome: "Destreza", abrev: "DES", descricao: "Reflexo, mira e a arte de não tropeçar na própria capa." },
  { id: "con", nome: "Constituição", abrev: "CON", descricao: "Fôlego, saúde e tolerância a cerveja de anão." },
  { id: "int", nome: "Inteligência", abrev: "INT", descricao: "Memória, raciocínio e livros lidos por vontade própria." },
  { id: "sab", nome: "Sabedoria", abrev: "SAB", descricao: "Percepção, intuição e bom senso, artigo raro." },
  { id: "car", nome: "Carisma", abrev: "CAR", descricao: "Presença, lábia e força de vontade." },
];

export const PERICIAS: PericiaDef[] = [
  { id: "acrobacia", nome: "Acrobacia", atributo: "des" },
  { id: "adestrar", nome: "Adestrar Animais", atributo: "sab" },
  { id: "arcanismo", nome: "Arcanismo", atributo: "int" },
  { id: "atletismo", nome: "Atletismo", atributo: "for" },
  { id: "atuacao", nome: "Atuação", atributo: "car" },
  { id: "enganacao", nome: "Enganação", atributo: "car" },
  { id: "furtividade", nome: "Furtividade", atributo: "des" },
  { id: "historia", nome: "História", atributo: "int" },
  { id: "intimidacao", nome: "Intimidação", atributo: "car" },
  { id: "intuicao", nome: "Intuição", atributo: "sab" },
  { id: "investigacao", nome: "Investigação", atributo: "int" },
  { id: "medicina", nome: "Medicina", atributo: "sab" },
  { id: "natureza", nome: "Natureza", atributo: "int" },
  { id: "percepcao", nome: "Percepção", atributo: "sab" },
  { id: "persuasao", nome: "Persuasão", atributo: "car" },
  { id: "prestidigitacao", nome: "Prestidigitação", atributo: "des" },
  { id: "religiao", nome: "Religião", atributo: "int" },
  { id: "sobrevivencia", nome: "Sobrevivência", atributo: "sab" },
];

const TODAS = PERICIAS.map((p) => p.id);

/** Armadura inicial: base + DES (total, até +2 ou nada) + atributo extra (defesa sem armadura). */
export type Armadura = { nome: string; base: number; des: "total" | "max2" | "nenhum"; extra?: string; semArmadura?: boolean };

export type Conjurador = "completo" | "meio" | "pacto" | null;

export type Classe5e = ClasseDef & {
  dadoVida: number;
  resistencias: string[];
  armadura: Armadura;
  escudo: boolean;
  ataque: { arma: string; atributo: string; dano: string; distancia?: boolean };
  /** atributo de conjuração; null = não conjura */
  magia: string | null;
  conjurador: Conjurador;
  /** truque de ataque padrão (dano por dado; escala nos níveis 5, 11 e 17) */
  truque?: { nome: string; dado: string; resistencia?: string };
  /** quantas perícias a classe concede e de qual lista */
  qtdPericias: number;
  listaPericias: string[];
  /** prioridade de atributos para a matriz e para aumentos automáticos */
  ordem: string[];
  /** perícias preferidas para especialização automática */
  especialidades?: string[];
  /** níveis com Aumento de Atributo além de 4, 8, 12 e 16 */
  aumentosExtras?: number[];
  dinheiro: number;
  /** antecedente sugerido quando o jogador não escolhe */
  antecedentePadrao: string;
  /** características por nível (nomes curtos, com explicação quando ajuda o mestre) */
  caracteristicas: [number, string][];
};

export const CLASSES: Classe5e[] = [
  {
    id: "guerreiro", nome: "Guerreiro", descricao: "Aço, cicatrizes e nenhuma paciência para charadas.", atributoChave: "for",
    dadoVida: 10, pvBase: 10, resistencias: ["for", "con"], papel: "combatente", fonte: "SRD 5.2",
    armadura: { nome: "cota de malha", base: 16, des: "nenhum" }, escudo: true,
    ataque: { arma: "espada longa", atributo: "for", dano: "1d8" }, magia: null, conjurador: null,
    qtdPericias: 2, listaPericias: ["acrobacia", "adestrar", "atletismo", "historia", "intuicao", "intimidacao", "persuasao", "percepcao", "sobrevivencia"],
    pericias: ["atletismo", "percepcao", "intimidacao"], equipamento: ["espada longa", "escudo", "cota de malha", "besta leve com 20 virotes"],
    ordem: ["for", "con", "des", "sab", "car", "int"], aumentosExtras: [6, 14], dinheiro: 4, antecedentePadrao: "soldado",
    caracteristicas: [
      [1, "Estilo de Luta"], [1, "Retomar Fôlego (ação bônus: cura 1d10 + nível)"], [1, "Maestria em Arma"],
      [2, "Surto de Ação (uma ação extra)"], [2, "Mente Tática (gasta Retomar Fôlego para somar 1d10 num teste falho)"],
      [5, "Ataque Extra (2 ataques)"], [5, "Mudança Tática"], [9, "Indomável (rerrola uma resistência falha)"], [9, "Mestre Tático"],
      [11, "Dois Ataques Extras (3 ataques)"], [13, "Ataques Estudados"], [17, "Surto de Ação (2 usos)"], [20, "Três Ataques Extras (4 ataques)"],
    ],
  },
  {
    id: "ladino", nome: "Ladino", descricao: "Bolsos alheios são só bolsos que ainda não são seus.", atributoChave: "des",
    dadoVida: 8, pvBase: 8, resistencias: ["des", "int"], papel: "especialista", fonte: "SRD 5.2",
    armadura: { nome: "armadura de couro", base: 11, des: "total" }, escudo: false,
    ataque: { arma: "adaga", atributo: "des", dano: "1d4" }, magia: null, conjurador: null,
    qtdPericias: 4, listaPericias: ["acrobacia", "atletismo", "enganacao", "intuicao", "intimidacao", "investigacao", "percepcao", "persuasao", "prestidigitacao", "furtividade"],
    pericias: ["furtividade", "prestidigitacao", "enganacao", "acrobacia", "percepcao", "investigacao"],
    equipamento: ["duas adagas", "espada curta", "arco curto com 20 flechas", "ferramentas de ladrão", "armadura de couro"],
    ordem: ["des", "con", "sab", "int", "car", "for"], especialidades: ["furtividade", "prestidigitacao", "percepcao", "enganacao"],
    aumentosExtras: [10], dinheiro: 8, antecedentePadrao: "criminoso",
    caracteristicas: [
      [1, "Especialização"], [1, "Ataque Furtivo"], [1, "Gíria de Ladrão"], [1, "Maestria em Arma"],
      [2, "Ação Ardilosa (correr, recuar ou esconder como ação bônus)"], [3, "Mira Firme"], [5, "Golpe Astuto"], [5, "Esquiva Sobrenatural (metade do dano de um ataque)"],
      [6, "Especialização (+2)"], [7, "Evasão"], [7, "Talento Confiável (d20 abaixo de 10 vira 10 em perícia treinada)"], [11, "Golpe Astuto aprimorado"],
      [14, "Golpes Ardilosos"], [15, "Mente Escorregadia (proficiência em resistências de SAB e CAR)"], [18, "Elusivo"], [20, "Golpe de Sorte"],
    ],
  },
  {
    id: "mago", nome: "Mago", descricao: "Leu todos os livros, inclusive os proibidos. Principalmente os proibidos.", atributoChave: "int",
    dadoVida: 6, pvBase: 6, resistencias: ["int", "sab"], papel: "conjurador", fonte: "SRD 5.2",
    armadura: { nome: "sem armadura", base: 10, des: "total", semArmadura: true }, escudo: false,
    ataque: { arma: "raio de fogo", atributo: "int", dano: "1d10", distancia: true }, magia: "int", conjurador: "completo",
    truque: { nome: "raio de fogo", dado: "d10" },
    qtdPericias: 2, listaPericias: ["arcanismo", "historia", "intuicao", "investigacao", "medicina", "natureza", "religiao"],
    pericias: ["arcanismo", "historia", "investigacao"], equipamento: ["grimório", "cajado", "bolsa de componentes", "duas adagas"],
    ordem: ["int", "des", "con", "sab", "car", "for"], dinheiro: 5, antecedentePadrao: "sabio",
    caracteristicas: [
      [1, "Conjuração (grimório, magias preparadas)"], [1, "Ritualista"], [1, "Recuperação Arcana (no descanso curto, recupera espaços)"],
      [2, "Erudito (especialização numa perícia de conhecimento)"], [5, "Memorizar Magia"], [18, "Maestria em Magia"], [20, "Magias Assinatura"],
    ],
  },
  {
    id: "clerigo", nome: "Clérigo", descricao: "Fala com um deus. Às vezes o deus responde, o que é pior.", atributoChave: "sab",
    dadoVida: 8, pvBase: 8, resistencias: ["sab", "car"], papel: "suporte", fonte: "SRD 5.2",
    armadura: { nome: "cota de escamas", base: 14, des: "max2" }, escudo: true,
    ataque: { arma: "maça", atributo: "for", dano: "1d6" }, magia: "sab", conjurador: "completo",
    truque: { nome: "chama sagrada", dado: "d8", resistencia: "des" },
    qtdPericias: 2, listaPericias: ["historia", "intuicao", "medicina", "persuasao", "religiao"],
    pericias: ["religiao", "medicina", "intuicao"], equipamento: ["maça", "escudo com símbolo sagrado", "cota de escamas"],
    ordem: ["sab", "con", "for", "int", "car", "des"], dinheiro: 7, antecedentePadrao: "acolito",
    caracteristicas: [
      [1, "Conjuração"], [1, "Ordem Divina"], [2, "Canalizar Divindade (Centelha Divina, Expulsar Mortos-Vivos)"],
      [5, "Destruir Mortos-Vivos"], [7, "Golpes Abençoados"], [10, "Intervenção Divina"], [14, "Golpes Abençoados aprimorados"], [20, "Intervenção Divina maior"],
    ],
  },
  {
    id: "patrulheiro", nome: "Patrulheiro", descricao: "Prefere lobos a pessoas, e os lobos concordam.", atributoChave: "des",
    dadoVida: 10, pvBase: 10, resistencias: ["for", "des"], papel: "combatente", fonte: "SRD 5.2",
    armadura: { nome: "couro batido", base: 12, des: "total" }, escudo: false,
    ataque: { arma: "arco longo", atributo: "des", dano: "1d8", distancia: true }, magia: "sab", conjurador: "meio",
    qtdPericias: 3, listaPericias: ["adestrar", "atletismo", "intuicao", "investigacao", "natureza", "percepcao", "furtividade", "sobrevivencia"],
    pericias: ["sobrevivencia", "percepcao", "furtividade", "natureza"], equipamento: ["arco longo", "aljava com 20 flechas", "duas espadas curtas", "couro batido"],
    ordem: ["des", "sab", "con", "int", "for", "car"], especialidades: ["sobrevivencia", "percepcao", "furtividade"], dinheiro: 7, antecedentePadrao: "guia",
    caracteristicas: [
      [1, "Conjuração"], [1, "Inimigo Favorito (Marca do Caçador sem gastar espaço)"], [1, "Maestria em Arma"],
      [2, "Explorador Hábil (especialização + idiomas)"], [2, "Estilo de Luta"], [5, "Ataque Extra (2 ataques)"], [6, "Andarilho (deslocamento +3 m, escalar e nadar)"],
      [9, "Especialização (+2)"], [10, "Incansável"], [13, "Caçador Implacável"], [14, "Véu da Natureza"], [17, "Caçador Preciso"],
      [18, "Sentidos Selvagens"], [20, "Matador de Inimigos"],
    ],
  },
  {
    id: "barbaro", nome: "Bárbaro", descricao: "Resolve problemas com o machado. Todos os problemas.", atributoChave: "for",
    dadoVida: 12, pvBase: 12, resistencias: ["for", "con"], papel: "combatente", fonte: "SRD 5.2",
    armadura: { nome: "defesa sem armadura", base: 10, des: "total", extra: "con", semArmadura: true }, escudo: false,
    ataque: { arma: "machado grande", atributo: "for", dano: "1d12" }, magia: null, conjurador: null,
    qtdPericias: 2, listaPericias: ["adestrar", "atletismo", "intimidacao", "natureza", "percepcao", "sobrevivencia"],
    pericias: ["atletismo", "intimidacao", "sobrevivencia", "percepcao"], equipamento: ["machado grande", "quatro machadinhas"],
    ordem: ["for", "con", "des", "sab", "car", "int"], dinheiro: 15, antecedentePadrao: "andarilho",
    caracteristicas: [
      [1, "Fúria (vantagem em FOR, resistência a dano físico, dano extra)"], [1, "Defesa sem Armadura (10 + DES + CON)"], [1, "Maestria em Arma"],
      [2, "Sentido do Perigo (vantagem em resistências de DES)"], [2, "Ataque Descuidado"], [3, "Conhecimento Primal"],
      [5, "Ataque Extra (2 ataques)"], [5, "Movimento Rápido (+3 m)"], [7, "Instinto Feral (vantagem na iniciativa)"], [7, "Salto Instintivo"],
      [9, "Golpe Brutal"], [11, "Fúria Implacável"], [13, "Golpe Brutal aprimorado"], [15, "Fúria Persistente"], [17, "Golpe Brutal aprimorado (2 efeitos)"],
      [18, "Força Indomável"], [20, "Campeão Primal (+4 FOR e CON)"],
    ],
  },
  {
    id: "bardo", nome: "Bardo", descricao: "Já seduziu metade do reino e compôs uma balada sobre a outra metade.", atributoChave: "car",
    dadoVida: 8, pvBase: 8, resistencias: ["des", "car"], papel: "suporte", fonte: "SRD 5.2",
    armadura: { nome: "armadura de couro", base: 11, des: "total" }, escudo: false,
    ataque: { arma: "rapieira", atributo: "des", dano: "1d8" }, magia: "car", conjurador: "completo",
    truque: { nome: "zombaria viciosa", dado: "d6", resistencia: "sab" },
    qtdPericias: 3, listaPericias: TODAS,
    pericias: ["atuacao", "persuasao", "enganacao", "historia", "intuicao"], equipamento: ["rapieira", "alaúde", "armadura de couro", "adaga"],
    ordem: ["car", "des", "con", "sab", "int", "for"], especialidades: ["persuasao", "atuacao", "enganacao", "intuicao"], dinheiro: 19, antecedentePadrao: "artista",
    caracteristicas: [
      [1, "Inspiração de Bardo"], [1, "Conjuração"], [2, "Especialização"], [2, "Pau pra Toda Obra (metade da proficiência no que não treinou)"],
      [5, "Fonte de Inspiração (inspiração volta no descanso curto)"], [7, "Contraencanto"], [9, "Especialização (+2)"], [10, "Segredos Mágicos"],
      [18, "Inspiração Superior"], [20, "Palavras de Criação"],
    ],
  },
  {
    id: "bruxo", nome: "Bruxo", descricao: "Assinou um contrato sem ler as letras miúdas; agora as letras miúdas leem ele.", atributoChave: "car",
    dadoVida: 8, pvBase: 8, resistencias: ["sab", "car"], papel: "conjurador", fonte: "SRD 5.2",
    armadura: { nome: "armadura de couro", base: 11, des: "total" }, escudo: false,
    ataque: { arma: "rajada mística", atributo: "car", dano: "1d10", distancia: true }, magia: "car", conjurador: "pacto",
    truque: { nome: "rajada mística", dado: "d10" },
    qtdPericias: 2, listaPericias: ["arcanismo", "enganacao", "historia", "intimidacao", "investigacao", "natureza", "religiao"],
    pericias: ["arcanismo", "enganacao", "intimidacao"], equipamento: ["foice curta", "duas adagas", "orbe (foco arcano)", "armadura de couro", "livro do pacto"],
    ordem: ["car", "con", "des", "sab", "int", "for"], dinheiro: 15, antecedentePadrao: "charlatao",
    caracteristicas: [
      [1, "Invocações Místicas"], [1, "Magia de Pacto (espaços voltam no descanso curto)"], [2, "Astúcia Mágica"],
      [9, "Contatar Patrono"], [11, "Arcano Místico (6º círculo)"], [13, "Arcano Místico (7º círculo)"], [15, "Arcano Místico (8º círculo)"],
      [17, "Arcano Místico (9º círculo)"], [20, "Mestre Místico"],
    ],
  },
  {
    id: "druida", nome: "Druida", descricao: "Conversa com árvores e acha as pessoas bem menos interessantes.", atributoChave: "sab",
    dadoVida: 8, pvBase: 8, resistencias: ["int", "sab"], papel: "conjurador", fonte: "SRD 5.2",
    armadura: { nome: "armadura de couro", base: 11, des: "total" }, escudo: true,
    ataque: { arma: "bordão (shillelagh)", atributo: "sab", dano: "1d8" }, magia: "sab", conjurador: "completo",
    truque: { nome: "produzir chama", dado: "d8" },
    qtdPericias: 2, listaPericias: ["arcanismo", "adestrar", "intuicao", "medicina", "natureza", "percepcao", "religiao", "sobrevivencia"],
    pericias: ["natureza", "sobrevivencia", "percepcao"], equipamento: ["bordão", "foice", "escudo de madeira", "armadura de couro", "ramo de visco"],
    ordem: ["sab", "con", "des", "int", "car", "for"], dinheiro: 9, antecedentePadrao: "eremita",
    caracteristicas: [
      [1, "Conjuração"], [1, "Druídico"], [1, "Ordem Primal"], [2, "Forma Selvagem"], [2, "Companheiro Selvagem"],
      [5, "Ressurgimento Selvagem"], [7, "Fúria Elemental"], [15, "Fúria Elemental aprimorada"], [18, "Magia de Fera"], [20, "Arquidruida"],
    ],
  },
  {
    id: "feiticeiro", nome: "Feiticeiro", descricao: "Nasceu com magia no sangue e nenhum manual de instruções.", atributoChave: "car",
    dadoVida: 6, pvBase: 6, resistencias: ["con", "car"], papel: "conjurador", fonte: "SRD 5.2",
    armadura: { nome: "sem armadura", base: 10, des: "total", semArmadura: true }, escudo: false,
    ataque: { arma: "raio de fogo", atributo: "car", dano: "1d10", distancia: true }, magia: "car", conjurador: "completo",
    truque: { nome: "raio de fogo", dado: "d10" },
    qtdPericias: 2, listaPericias: ["arcanismo", "enganacao", "intuicao", "intimidacao", "persuasao", "religiao"],
    pericias: ["arcanismo", "persuasao", "intimidacao"], equipamento: ["lança", "duas adagas", "cristal (foco arcano)"],
    ordem: ["car", "con", "des", "sab", "int", "for"], dinheiro: 28, antecedentePadrao: "nobre",
    caracteristicas: [
      [1, "Conjuração"], [1, "Feitiçaria Inata (vantagem e CD +1 por 1 minuto)"], [2, "Fonte de Magia (pontos de feitiçaria)"], [2, "Metamagia"],
      [5, "Restauração Feiticeira"], [7, "Feitiçaria Encarnada"], [10, "Metamagia (+2)"], [17, "Metamagia (+2)"], [20, "Apoteose Arcana"],
    ],
  },
  {
    id: "monge", nome: "Monge", descricao: "Bate em pedras até a pedra pedir desculpas.", atributoChave: "des",
    dadoVida: 8, pvBase: 8, resistencias: ["for", "des"], papel: "combatente", fonte: "SRD 5.2",
    armadura: { nome: "defesa sem armadura", base: 10, des: "total", extra: "sab", semArmadura: true }, escudo: false,
    ataque: { arma: "artes marciais", atributo: "des", dano: "1d6" }, magia: null, conjurador: null,
    qtdPericias: 2, listaPericias: ["acrobacia", "atletismo", "historia", "intuicao", "religiao", "furtividade"],
    pericias: ["acrobacia", "furtividade", "intuicao"], equipamento: ["lança", "cinco adagas", "ferramentas de artesão"],
    ordem: ["des", "sab", "con", "for", "int", "car"], dinheiro: 11, antecedentePadrao: "eremita",
    caracteristicas: [
      [1, "Artes Marciais"], [1, "Defesa sem Armadura (10 + DES + SAB)"], [2, "Foco do Monge (Rajada de Golpes, Defesa Paciente, Passo do Vento)"],
      [2, "Movimento sem Armadura"], [2, "Metabolismo Incomum"], [3, "Desviar Ataques"], [4, "Queda Lenta"], [5, "Ataque Extra (2 ataques)"],
      [5, "Golpe Atordoante"], [6, "Golpes Fortalecidos"], [7, "Evasão"], [9, "Movimento Acrobático"], [10, "Foco Elevado"], [10, "Autorrestauração"],
      [13, "Desviar Energia"], [14, "Sobrevivente Disciplinado (proficiência em todas as resistências)"], [15, "Foco Perfeito"], [18, "Defesa Superior"],
      [20, "Corpo e Mente (+4 DES e SAB)"],
    ],
  },
  {
    id: "paladino", nome: "Paladino", descricao: "Jurou proteger os fracos e não para de lembrar todo mundo disso.", atributoChave: "for",
    dadoVida: 10, pvBase: 10, resistencias: ["sab", "car"], papel: "combatente", fonte: "SRD 5.2",
    armadura: { nome: "cota de malha", base: 16, des: "nenhum" }, escudo: true,
    ataque: { arma: "espada longa", atributo: "for", dano: "1d8" }, magia: "car", conjurador: "meio",
    qtdPericias: 2, listaPericias: ["atletismo", "intuicao", "intimidacao", "medicina", "persuasao", "religiao"],
    pericias: ["atletismo", "persuasao", "religiao"], equipamento: ["espada longa", "escudo", "cota de malha", "seis azagaias", "símbolo sagrado"],
    ordem: ["for", "car", "con", "sab", "des", "int"], dinheiro: 9, antecedentePadrao: "nobre",
    caracteristicas: [
      [1, "Imposição de Mãos (reserva de cura = 5 × nível)"], [1, "Conjuração"], [1, "Maestria em Arma"], [2, "Estilo de Luta"],
      [2, "Destruição do Paladino (gasta espaço: +2d8 radiante, +1d8 por círculo)"], [3, "Canalizar Divindade (Sentido Divino)"],
      [5, "Ataque Extra (2 ataques)"], [5, "Corcel Fiel"], [6, "Aura de Proteção (+CAR nas resistências de quem está perto)"], [9, "Abjurar Inimigos"],
      [10, "Aura de Coragem"], [11, "Golpes Radiantes (+1d8 radiante)"], [14, "Toque Restaurador"], [18, "Expansão de Aura (9 m)"],
    ],
  },
];

/** Subclasses do SRD 5.2 (uma por classe), todas ganhas no 3º nível. */
export type Subclasse5e = { id: string; classe: string; nome: string; descricao: string; caracteristicas: [number, string][] };

export const SUBCLASSES: Subclasse5e[] = [
  {
    id: "berserker", classe: "barbaro", nome: "Caminho do Berserker", descricao: "Raiva pura, sem filtro e sem plano de saúde.",
    caracteristicas: [[3, "Frenesi (dano extra em d6 igual ao bônus de fúria)"], [6, "Fúria Irracional (imune a enfeitiçado e amedrontado em fúria)"], [10, "Retaliação"], [14, "Presença Intimidante"]],
  },
  {
    id: "conhecimento", classe: "bardo", nome: "Colégio do Conhecimento", descricao: "Sabe um pouco de tudo e faz questão de corrigir você.",
    caracteristicas: [[3, "Proficiências Adicionais (+3 perícias)"], [3, "Palavras Cortantes"], [6, "Descobertas Mágicas"], [14, "Perícia Inigualável"]],
  },
  {
    id: "infero", classe: "bruxo", nome: "Patrono Ínfero", descricao: "Um patrono das profundezas com plano de fidelidade agressivo.",
    caracteristicas: [[3, "Bênção do Tenebroso (PV temporários ao derrubar inimigos)"], [6, "Sorte do Tenebroso (+1d10 num teste)"], [10, "Resistência Ínfera"], [14, "Arremesso Infernal"]],
  },
  {
    id: "vida", classe: "clerigo", nome: "Domínio da Vida", descricao: "Cura tanto que os coveiros da região fizeram abaixo-assinado.",
    caracteristicas: [[3, "Discípulo da Vida (curas ganham 2 + círculo)"], [3, "Preservar a Vida (Canalizar Divindade)"], [6, "Curandeiro Abençoado"], [17, "Cura Suprema"]],
  },
  {
    id: "terra", classe: "druida", nome: "Círculo da Terra", descricao: "Guarda a memória de cada pedra, pântano e duna que já pisou.",
    caracteristicas: [[3, "Magias do Círculo"], [3, "Ajuda da Terra"], [6, "Recuperação Natural"], [10, "Proteção da Natureza"], [14, "Santuário da Natureza"]],
  },
  {
    id: "draconica", classe: "feiticeiro", nome: "Linhagem Dracônica", descricao: "Um tataravô de escamas e um temperamento à altura.",
    caracteristicas: [[3, "Resiliência Dracônica (+1 PV por nível; CA 10 + DES + CAR)"], [3, "Magias Dracônicas"], [6, "Afinidade Elemental"], [14, "Asas de Dragão"], [18, "Companheiro Dracônico"]],
  },
  {
    id: "campeao", classe: "guerreiro", nome: "Campeão", descricao: "Não tem truque nenhum: só bate mais forte e mais vezes.",
    caracteristicas: [[3, "Crítico Aprimorado (crítico com 19-20)"], [3, "Atleta Notável"], [7, "Estilo de Luta adicional"], [10, "Combatente Heroico"], [15, "Crítico Superior (crítico com 18-20)"], [18, "Sobrevivente"]],
  },
  {
    id: "ladrao", classe: "ladino", nome: "Ladrão", descricao: "Telhados, janelas e cofres: o reino é um grande bufê.",
    caracteristicas: [[3, "Mãos Rápidas"], [3, "Andarilho de Telhados"], [9, "Furtividade Suprema"], [13, "Usar Item Mágico"], [17, "Reflexos de Ladrão"]],
  },
  {
    id: "evocador", classe: "mago", nome: "Evocador", descricao: "Acha que todo problema é um prego e toda magia é uma bola de fogo.",
    caracteristicas: [[3, "Erudito em Evocação"], [3, "Truque Potente"], [6, "Esculpir Magias (poupa aliados)"], [10, "Evocação Potencializada (+INT no dano)"], [14, "Sobrecarga"]],
  },
  {
    id: "mao-aberta", classe: "monge", nome: "Caminho da Mão Aberta", descricao: "Derruba, empurra e desarma, tudo com um sorriso sereno.",
    caracteristicas: [[3, "Técnica da Mão Aberta"], [6, "Integridade Corporal"], [11, "Passo Ágil"], [17, "Palma Trêmula"]],
  },
  {
    id: "devocao", classe: "paladino", nome: "Juramento de Devoção", descricao: "O cavaleiro de armadura brilhante que ninguém aguenta no jantar.",
    caracteristicas: [[3, "Arma Sagrada (Canalizar Divindade)"], [3, "Magias do Juramento"], [7, "Aura de Devoção"], [15, "Destruição Protetora"], [20, "Nimbo Sagrado"]],
  },
  {
    id: "cacador", classe: "patrulheiro", nome: "Caçador", descricao: "Especialista em coisas grandes que deveriam ter ficado em casa.",
    caracteristicas: [[3, "Presa do Caçador"], [3, "Saber do Caçador"], [7, "Táticas Defensivas"], [11, "Presa Superior"], [15, "Defesa Superior do Caçador"]],
  },
];

export type Especie5e = AncestralidadeDef & { metros: number; visaoEscuro?: number };

export const ESPECIES: Especie5e[] = [
  {
    id: "humano", nome: "Humano", descricao: "Versátil, ambicioso e incapaz de ficar quieto.", deslocamento: "9 m", metros: 9,
    tracos: ["Engenhoso (inspiração heroica a cada descanso longo)", "Habilidoso (+1 perícia)", "Versátil (talento de origem extra)"],
  },
  {
    id: "elfo", nome: "Elfo", descricao: "Vive séculos e faz questão de lembrar você disso.", deslocamento: "9 m", metros: 9, visaoEscuro: 18,
    tracos: ["Visão no escuro 18 m", "Ancestralidade Feérica (vantagem contra enfeitiçado)", "Sentidos Aguçados (Percepção)", "Transe (descanso longo em 4 h)", "Linhagem Élfica"],
  },
  {
    id: "anao", nome: "Anão", descricao: "Teimoso como a montanha que o pariu.", deslocamento: "9 m", metros: 9, visaoEscuro: 36,
    tracos: ["Visão no escuro 36 m", "Resiliência Anã (resistência a veneno, vantagem contra envenenado)", "Robustez Anã (+1 PV por nível)", "Sentido de Pedra (sismiconsciência)"],
  },
  {
    id: "halfling", nome: "Halfling", descricao: "Pequeno, sortudo e sempre com fome.", deslocamento: "9 m", metros: 9,
    tracos: ["Sortudo (rerrola 1 natural no d20)", "Corajoso (vantagem contra amedrontado)", "Agilidade Halfling", "Furtividade Natural"],
  },
  {
    id: "draconato", nome: "Draconato", descricao: "Sopro de dragão e orgulho do mesmo tamanho.", deslocamento: "9 m", metros: 9, visaoEscuro: 18,
    tracos: ["Ancestral Dracônico", "Arma de Sopro", "Resistência a Dano (do ancestral)", "Visão no escuro 18 m", "Voo Dracônico (5º nível)"],
  },
  {
    id: "gnomo", nome: "Gnomo", descricao: "Curiosidade infinita, noção de perigo nenhuma.", deslocamento: "9 m", metros: 9, visaoEscuro: 18,
    tracos: ["Astúcia Gnômica (vantagem em resistências de INT, SAB e CAR)", "Visão no escuro 18 m", "Linhagem Gnômica"],
  },
  {
    id: "orc", nome: "Orc", descricao: "Força bruta e uma recusa obstinada em cair.", deslocamento: "9 m", metros: 9, visaoEscuro: 36,
    tracos: ["Explosão de Adrenalina (corrida bônus e PV temporários)", "Resistência Implacável (cai para 1 PV em vez de 0)", "Visão no escuro 36 m"],
  },
  {
    id: "tiefling", nome: "Tiefling", descricao: "Chifres, rabo e um ancestral que ninguém quer comentar.", deslocamento: "9 m", metros: 9, visaoEscuro: 18,
    tracos: ["Legado Ínfero", "Presença Sobrenatural (taumaturgia)", "Visão no escuro 18 m"],
  },
  {
    id: "golias", nome: "Golias", descricao: "Parente distante de gigantes, e não deixa ninguém esquecer.", deslocamento: "10,5 m", metros: 10.5,
    tracos: ["Ancestral Gigante", "Forma Grande (5º nível)", "Constituição Poderosa (carrega como criatura Grande)"],
  },
  {
    id: "aasimar", nome: "Aasimar", descricao: "Tocado pelos céus, o que não o impede de roubar a última coxinha.", deslocamento: "9 m", metros: 9, visaoEscuro: 18,
    tracos: ["Resistência Celestial (necrótico e radiante)", "Mãos Curativas", "Portador da Luz (truque luz)", "Visão no escuro 18 m", "Revelação Celestial (3º nível)"],
  },
];

/** Linhagens e ancestrais: uma escolha só, com o nome da espécie na frente. Ignorada se não bater com a espécie. */
export type Linhagem5e = OpcaoSimples & { especie: string; tracos: string[]; metros?: number; visaoEscuro?: number };

const DRAGOES: [string, string, string][] = [
  ["azul", "Azul", "relâmpago"], ["branco", "Branco", "frio"], ["bronze", "Bronze", "relâmpago"], ["cobre", "Cobre", "ácido"], ["latao", "Latão", "fogo"],
  ["negro", "Negro", "ácido"], ["ouro", "Ouro", "fogo"], ["prata", "Prata", "frio"], ["verde", "Verde", "veneno"], ["vermelho", "Vermelho", "fogo"],
];

const GIGANTES: [string, string, string][] = [
  ["nuvem", "das Nuvens", "Salto das Nuvens (teletransporte curto)"], ["fogo", "do Fogo", "Queimadura de Fogo (+1d10 de fogo)"],
  ["gelo", "do Gelo", "Frio do Gelo (+1d6 de frio e reduz deslocamento)"], ["colina", "da Colina", "Tombo da Colina (derruba o alvo)"],
  ["pedra", "da Pedra", "Resistência da Pedra (reduz dano)"], ["tempestade", "da Tempestade", "Trovão da Tempestade (dano de trovão no atacante)"],
];

export const LINHAGENS: Linhagem5e[] = [
  { id: "elfo-alto", especie: "elfo", nome: "Elfo: Alto elfo", descricao: "Truque de prestidigitação; depois detectar magia e passo nebuloso.", tracos: ["Alto elfo (prestidigitação, detectar magia, passo nebuloso)"] },
  { id: "elfo-floresta", especie: "elfo", nome: "Elfo: Elfo da floresta", descricao: "Deslocamento 10,5 m e magia de druida rasteira.", tracos: ["Elfo da floresta (arte druídica, passos longos, passos sem pegadas)"], metros: 10.5 },
  { id: "drow", especie: "elfo", nome: "Elfo: Drow", descricao: "Visão no escuro de 36 m e luzes dançantes de herança.", tracos: ["Drow (luzes dançantes, fogo das fadas, escuridão)"], visaoEscuro: 36 },
  ...DRAGOES.map(([id, cor, dano]) => ({
    id: `dragao-${id}`, especie: "draconato", nome: `Draconato: ${cor} (${dano})`, descricao: `Sopro e resistência de ${dano}.`, tracos: [`Ancestral ${cor}: sopro e resistência de ${dano}`],
  })),
  { id: "gnomo-floresta", especie: "gnomo", nome: "Gnomo: da floresta", descricao: "Ilusão menor e conversa com bichos pequenos.", tracos: ["Gnomo da floresta (ilusão menor, falar com animais)"] },
  { id: "gnomo-rochas", especie: "gnomo", nome: "Gnomo: das rochas", descricao: "Consertar, prestidigitação e brinquedos mecânicos.", tracos: ["Gnomo das rochas (consertar, prestidigitação, engenhocas)"] },
  ...GIGANTES.map(([id, nome, efeito]) => ({
    id: `gigante-${id}`, especie: "golias", nome: `Golias: Gigante ${nome}`, descricao: efeito, tracos: [`Gigante ${nome}: ${efeito}`],
  })),
  { id: "abissal", especie: "tiefling", nome: "Tiefling: Abissal", descricao: "Resistência a veneno e uma rajada venenosa de herança.", tracos: ["Abissal (resistência a veneno; spray venenoso, raio nauseante, imobilizar pessoa)"] },
  { id: "ctonico", especie: "tiefling", nome: "Tiefling: Ctônico", descricao: "Resistência necrótica e um toque frio de cemitério.", tracos: ["Ctônico (resistência necrótica; toque necrótico, vitalidade falsa, raio do enfraquecimento)"] },
  { id: "infernal", especie: "tiefling", nome: "Tiefling: Infernal", descricao: "Resistência a fogo e repreensão infernal.", tracos: ["Infernal (resistência a fogo; raio de fogo, repreensão infernal, escuridão)"] },
];

/** Talentos de origem (SRD 5.2 e equivalentes de antecedente), com efeito resumido. */
export const TALENTOS: Record<string, { nome: string; efeito: string }> = {
  alerta: { nome: "Alerta", efeito: "soma a proficiência na iniciativa e pode trocar de lugar na ordem com um aliado" },
  iniciado: { nome: "Iniciado em Magia", efeito: "dois truques e uma magia de 1º círculo de uma lista" },
  selvagem: { nome: "Atacante Selvagem", efeito: "uma vez por turno rola o dano da arma duas vezes e fica com o maior" },
  habilidoso: { nome: "Habilidoso", efeito: "+3 perícias ou ferramentas" },
  artifice: { nome: "Artífice", efeito: "desconto em compras e fabrica itens simples num descanso" },
  musico: { nome: "Músico", efeito: "no fim de um descanso, dá inspiração heroica a aliados que ouviram a música" },
  vigoroso: { nome: "Vigoroso", efeito: "+2 PV máximos por nível" },
  curandeiro: { nome: "Curandeiro", efeito: "kit de curandeiro cura de verdade e rerrola 1 nos dados de cura" },
  sortudo: { nome: "Sortudo", efeito: "pontos de sorte (proficiência por descanso longo) para dar vantagem a si ou desvantagem a um inimigo" },
  brigao: { nome: "Brigão de Taverna", efeito: "soco de 1d4, rerrola 1 no dano desarmado e empurra" },
};

export type Antecedente5e = OpcaoSimples & { pericias: [string, string]; atributos: [string, string, string]; talento: string; equipamento: string[]; dinheiro: number; magia?: string };

export const ANTECEDENTES: Antecedente5e[] = [
  { id: "acolito", nome: "Acólito", pericias: ["intuicao", "religiao"], atributos: ["int", "sab", "car"], talento: "iniciado", magia: "sab", equipamento: ["símbolo sagrado", "livro de orações", "incenso"], dinheiro: 8, descricao: "Cresceu no templo varrendo o chão e decorando ladainhas." },
  { id: "criminoso", nome: "Criminoso", pericias: ["prestidigitacao", "furtividade"], atributos: ["des", "con", "int"], talento: "alerta", equipamento: ["pé de cabra", "roupas escuras com capuz"], dinheiro: 16, descricao: "Tem contatos, dívidas e um apelido que não usa em público." },
  { id: "sabio", nome: "Sábio", pericias: ["arcanismo", "historia"], atributos: ["con", "int", "sab"], talento: "iniciado", magia: "int", equipamento: ["tinta e pena", "livro de anotações", "pergaminhos"], dinheiro: 8, descricao: "Passou a juventude em bibliotecas e o resto reclamando delas." },
  { id: "soldado", nome: "Soldado", pericias: ["atletismo", "intimidacao"], atributos: ["for", "des", "con"], talento: "selvagem", equipamento: ["insígnia de patente", "jogo de dados", "kit de curandeiro"], dinheiro: 14, descricao: "Serviu num exército e ainda acorda antes do galo." },
  { id: "artesao", nome: "Artesão", pericias: ["investigacao", "persuasao"], atributos: ["for", "des", "int"], talento: "artifice", equipamento: ["ferramentas de artesão", "avental de couro"], dinheiro: 32, descricao: "Faz coisa que presta, e cobra por isso." },
  { id: "artista", nome: "Artista", pericias: ["acrobacia", "atuacao"], atributos: ["for", "des", "car"], talento: "musico", equipamento: ["instrumento musical", "fantasia", "espelho"], dinheiro: 11, descricao: "Vive de aplausos, gorjetas e tomates desviados." },
  { id: "charlatao", nome: "Charlatão", pericias: ["enganacao", "prestidigitacao"], atributos: ["des", "con", "car"], talento: "habilidoso", equipamento: ["kit de falsificação", "roupas finas", "elixir de água colorida"], dinheiro: 15, descricao: "Vende cura milagrosa em garrafa e foge antes do efeito." },
  { id: "eremita", nome: "Eremita", pericias: ["medicina", "religiao"], atributos: ["con", "sab", "car"], talento: "curandeiro", equipamento: ["kit de herbalismo", "lampião", "cobertor"], dinheiro: 16, descricao: "Morou numa caverna anos a fio e voltou com opiniões fortes." },
  { id: "fazendeiro", nome: "Fazendeiro", pericias: ["adestrar", "natureza"], atributos: ["for", "con", "sab"], talento: "vigoroso", equipamento: ["foice", "ferramentas de carpinteiro", "panela de ferro"], dinheiro: 30, descricao: "Já enfrentou gafanhotos, seca e coletor de impostos." },
  { id: "guarda", nome: "Guarda", pericias: ["atletismo", "percepcao"], atributos: ["for", "int", "sab"], talento: "alerta", equipamento: ["lança", "besta leve", "lanterna", "algemas"], dinheiro: 12, descricao: "Passou noites em muralhas vendo nada acontecer, até acontecer." },
  { id: "guia", nome: "Guia", pericias: ["furtividade", "sobrevivencia"], atributos: ["des", "con", "sab"], talento: "iniciado", magia: "sab", equipamento: ["arco curto com 20 flechas", "ferramentas de cartógrafo", "saco de dormir", "tenda"], dinheiro: 3, descricao: "Conhece cada trilha e cada atalho que termina em pântano." },
  { id: "marinheiro", nome: "Marinheiro", pericias: ["acrobacia", "percepcao"], atributos: ["for", "des", "sab"], talento: "brigao", equipamento: ["ferramentas de navegador", "corda de seda", "cachimbo"], dinheiro: 20, descricao: "Tem pernas de mar, vocabulário de porto e uma tatuagem arrependida." },
  { id: "mercador", nome: "Mercador", pericias: ["adestrar", "persuasao"], atributos: ["con", "int", "car"], talento: "sortudo", equipamento: ["ferramentas de navegador", "balança de mercador", "mula"], dinheiro: 22, descricao: "Compra barato, vende caro e chama isso de vocação." },
  { id: "nobre", nome: "Nobre", pericias: ["historia", "persuasao"], atributos: ["for", "int", "car"], talento: "habilidoso", equipamento: ["roupas finas", "anel de sinete", "perfume"], dinheiro: 29, descricao: "Nasceu com sobrenome, herança e nenhuma noção do preço do pão." },
  { id: "escriba", nome: "Escriba", pericias: ["investigacao", "percepcao"], atributos: ["des", "int", "sab"], talento: "habilidoso", equipamento: ["kit de caligrafia", "roupas finas", "lâmpada", "papel"], dinheiro: 23, descricao: "Copiou mil documentos e leu as entrelinhas de todos." },
  { id: "andarilho", nome: "Andarilho", pericias: ["intuicao", "furtividade"], atributos: ["des", "sab", "car"], talento: "sortudo", equipamento: ["ferramentas de ladrão", "saco de dormir", "roupas de viagem"], dinheiro: 16, descricao: "Cresceu na rua, onde intuição vale mais que moeda." },
];

export const ESTILOS_LUTA: OpcaoSimples[] = [
  { id: "defesa", nome: "Defesa", descricao: "+1 na CA usando armadura." },
  { id: "arquearia", nome: "Arquearia", descricao: "+2 nas jogadas de ataque à distância." },
  { id: "arma-grande", nome: "Combate com Armas Grandes", descricao: "Trata 1 e 2 nos dados de dano de armas de duas mãos como 3." },
  { id: "duas-armas", nome: "Combate com Duas Armas", descricao: "Soma o modificador no dano do ataque com a segunda arma." },
];

export const ALINHAMENTOS: OpcaoSimples[] = [
  { id: "lb", nome: "Leal e Bom" }, { id: "nb", nome: "Neutro e Bom" }, { id: "cb", nome: "Caótico e Bom" },
  { id: "ln", nome: "Leal e Neutro" }, { id: "n", nome: "Neutro" }, { id: "cn", nome: "Caótico e Neutro" },
  { id: "lm", nome: "Leal e Mau" }, { id: "nm", nome: "Neutro e Mau" }, { id: "cm", nome: "Caótico e Mau" },
  { id: "sem", nome: "Prefiro não rotular" },
];

/** XP acumulado para chegar a cada nível (índice = nível). */
export const XP_POR_NIVEL = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

/** Espaços de magia do conjurador completo por nível (índice = nível; cada lista vai do 1º ao 9º círculo). */
export const ESPACOS_COMPLETO: number[][] = [
  [],
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Magia de pacto do Bruxo: [quantidade de espaços, círculo dos espaços] por nível. */
export const PACTO: [number, number][] = [
  [0, 0],
  [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
];
