import type { ClasseDef } from "../tipos";

// Classes do Pathfinder 2e Remaster (mecânicas sob ORC License; Dark Archive, Secrets of Magic e afins sob OGL 1.0a).
// Progressões no formato "1T 7E 15M 19L": nível em que o grau de proficiência chega a Treinado/Especialista/Mestre/Lendário.
// Descrições são nossas, com o humor da taverna.

export type Tradicao = "arcana" | "divina" | "oculta" | "primal";

export type MagiaClasse = {
  /** null = definida pela subclasse (linhagem, patrono, eidolon...) */
  tradicao: Tradicao | null;
  /** "completo": espaços até o 10º círculo; "onda": só os dois círculos mais altos (magus, invocador); "foco": só magias de foco */
  tipo: "preparado" | "espontaneo" | "onda" | "foco";
  /** progressão de ataque/CD de magia */
  prog: string;
  /** espaços no círculo recém-aberto e nos círculos já consolidados (ignorado em "onda" e "foco") */
  espacos?: [number, number];
};

export type ArmaPf2 = { nome: string; dano: string; atributo: "for" | "des"; agil?: boolean; distancia?: boolean };
export type ArmaduraPf2 = { nome: string; item: number; limite: number; categoria: "sem" | "leve" | "media" | "pesada" };

export type ClassePf2 = ClasseDef & {
  /** atributos-chave possíveis; o primeiro é o padrão */
  chaves: string[];
  pvBase: number;
  /** perícias treinadas além das fixas: N + modificador de INT */
  maisPericias: number;
  /** ordem de preferência para completar perícias automaticamente */
  sugeridas: string[];
  /** prioridade de atributos para os aumentos livres */
  ordem: string[];
  prog: { percepcao: string; fort: string; ref: string; von: string; ataque: string; defesa: string; cd: string };
  magia?: MagiaClasse;
  /** pontos de foco iniciais (0 = sem magias de foco no 1º nível) */
  foco: number;
  arma: ArmaPf2;
  armadura: ArmaduraPf2;
  /** Saber treinado de graça (texto) */
  saber?: string;
  /** recebe aumento de perícia todo nível a partir do 2º (ladino, investigador) */
  periciaTodoNivel?: boolean;
  /** observações mecânicas curtas para o mestre */
  notas: string;
};

const SEM_ARMADURA: ArmaduraPf2 = { nome: "roupas de explorador", item: 0, limite: 5, categoria: "sem" };
const COURO: ArmaduraPf2 = { nome: "armadura de couro", item: 1, limite: 4, categoria: "leve" };
const COURO_BATIDO: ArmaduraPf2 = { nome: "couro batido", item: 2, limite: 3, categoria: "leve" };
const GIBAO: ArmaduraPf2 = { nome: "camisão de malha", item: 2, limite: 3, categoria: "leve" };
const GIBAO_PELE: ArmaduraPf2 = { nome: "gibão de peles", item: 3, limite: 2, categoria: "media" };
const ESCAMAS: ArmaduraPf2 = { nome: "brunea", item: 3, limite: 2, categoria: "media" };
const PEITORAL: ArmaduraPf2 = { nome: "peitoral", item: 4, limite: 1, categoria: "media" };
const COTA: ArmaduraPf2 = { nome: "cota de malha", item: 4, limite: 1, categoria: "media" };
const MEIA_ARMADURA: ArmaduraPf2 = { nome: "meia-armadura", item: 5, limite: 1, categoria: "pesada" };
const ARMADURA_COMPLETA: ArmaduraPf2 = { nome: "armadura completa", item: 6, limite: 0, categoria: "pesada" };

// Progressões repetidas
const CONJ_DEFESA = "1T 13E";
const CONJ_ATAQUE = "1T 11E";
const CONJ_MAGIA = "1T 7E 15M 19L";
const MARCIAL = "1T 5E 13M";

const BASE: ClassePf2[] = [
  {
    id: "alquimista", nome: "Alquimista", descricao: "Carrega explosivos instáveis no cinto e chama isso de ciência.",
    atributoChave: "int", chaves: ["int"], pvBase: 8, papel: "especialista", fonte: "Player Core 2",
    pericias: ["manufatura"], maisPericias: 3, sugeridas: ["medicina", "arcanismo", "natureza", "ladroagem", "sociedade", "percepcao"],
    ordem: ["int", "des", "con", "sab", "car", "for"],
    prog: { percepcao: "1T 9E", fort: "1E 9M", ref: "1E 15M", von: "1T 7E", ataque: "1T 7E 15M", defesa: "1T 13E 19M", cd: "1T 7E 15M" },
    foco: 0, arma: { nome: "bomba alquímica", dano: "1d8", atributo: "des", distancia: true }, armadura: COURO,
    equipamento: ["kit de alquimista", "bombas de fogo alquímico", "elixires de vida menores", "besta leve", "armadura de couro"],
    notas: "Reagentes infundidos (recurso 'reagentes') viram bombas, elixires e mutagênicos na preparação diária e em Alquimia Rápida.",
  },
  {
    id: "barbaro", nome: "Bárbaro", descricao: "Grita primeiro, pensa nunca, e a estratégia funciona assustadoramente bem.",
    atributoChave: "for", chaves: ["for"], pvBase: 12, papel: "combatente", fonte: "Player Core 2",
    pericias: ["atletismo"], maisPericias: 3, sugeridas: ["intimidacao", "sobrevivencia", "acrobatismo", "natureza", "medicina"],
    ordem: ["for", "con", "des", "sab", "car", "int"],
    prog: { percepcao: "1E 17M", fort: "1E 7M 13L", ref: "1T 9E", von: "1E 15M", ataque: MARCIAL, defesa: "1T 13E 19M", cd: "1T 11E 19M" },
    foco: 0, arma: { nome: "machado grande", dano: "1d12", atributo: "for" }, armadura: GIBAO_PELE,
    equipamento: ["machado grande", "duas machadinhas", "gibão de peles"],
    notas: "Fúria (1 ação): +2 de dano corpo a corpo (mais conforme o instinto), PV temporários = nível + CON, −1 na CA; não pode usar ações de concentração.",
  },
  {
    id: "bardo", nome: "Bardo", descricao: "Resolve tudo com uma canção, inclusive quem não pediu canção nenhuma.",
    atributoChave: "car", chaves: ["car"], pvBase: 8, papel: "suporte", fonte: "Player Core",
    pericias: ["ocultismo", "performance"], maisPericias: 4, sugeridas: ["diplomacia", "dissimulacao", "sociedade", "acrobatismo", "arcanismo"],
    ordem: ["car", "des", "con", "sab", "int", "for"],
    prog: { percepcao: "1E 11M 19L", fort: "1T 9E", ref: "1T 3E", von: "1E 11M 17L", ataque: CONJ_ATAQUE, defesa: CONJ_DEFESA, cd: "1T" },
    magia: { tradicao: "oculta", tipo: "espontaneo", prog: CONJ_MAGIA, espacos: [2, 3] }, foco: 1,
    arma: { nome: "rapieira", dano: "1d6", atributo: "des" }, armadura: COURO_BATIDO,
    equipamento: ["rapieira", "funda", "instrumento musical", "couro batido"],
    notas: "Composições (magias de foco como Coragem Inspiradora) dão bônus de status ao grupo; conjurador espontâneo oculto.",
  },
  {
    id: "campeao", nome: "Campeão", descricao: "Jurou proteger os inocentes e não para de lembrar todo mundo disso.",
    atributoChave: "for", chaves: ["for", "des"], pvBase: 10, papel: "defensor", fonte: "Player Core 2",
    pericias: ["religiao"], maisPericias: 2, sugeridas: ["diplomacia", "atletismo", "medicina", "intimidacao"],
    ordem: ["for", "car", "con", "sab", "des", "int"],
    prog: { percepcao: "1T 11E", fort: "1E 9M", ref: "1T 9E", von: "1E 11M 17L", ataque: MARCIAL, defesa: "1T 7E 13M 17L", cd: "1T 9E 17M" },
    magia: { tradicao: "divina", tipo: "foco", prog: "1T 9E 17M" }, foco: 1,
    arma: { nome: "espada longa", dano: "1d8", atributo: "for" }, armadura: ARMADURA_COMPLETA,
    equipamento: ["espada longa", "escudo de aço", "armadura completa", "símbolo religioso"],
    notas: "Reação de campeão conforme a causa (protege aliados ou pune inimigos); Imposição de Mãos é magia de foco; aura de devoção.",
  },
  {
    id: "clerigo", nome: "Clérigo", descricao: "Fala com um deus. Às vezes o deus responde, o que é pior.",
    atributoChave: "sab", chaves: ["sab"], pvBase: 8, papel: "suporte", fonte: "Player Core",
    pericias: ["religiao"], maisPericias: 2, sugeridas: ["medicina", "diplomacia", "sociedade", "ocultismo"],
    ordem: ["sab", "con", "car", "des", "for", "int"],
    prog: { percepcao: "1T 5E", fort: "1T 3E", ref: "1T 11E", von: "1E 9M 17L", ataque: CONJ_ATAQUE, defesa: CONJ_DEFESA, cd: "1T" },
    magia: { tradicao: "divina", tipo: "preparado", prog: CONJ_MAGIA, espacos: [2, 3] }, foco: 0,
    arma: { nome: "maça", dano: "1d6", atributo: "for" }, armadura: SEM_ARMADURA,
    equipamento: ["maça", "símbolo religioso", "kit de curandeiro", "escudo de madeira"],
    notas: "Fonte divina (recurso 'fonte'): lançamentos extras de Cura ou Dano por dia. Sacerdote de guerra treina armaduras e armas.",
  },
  {
    id: "druida", nome: "Druida", descricao: "Conversa com árvores e acha as pessoas bem menos interessantes.",
    atributoChave: "sab", chaves: ["sab"], pvBase: 8, papel: "conjurador", fonte: "Player Core",
    pericias: ["natureza"], maisPericias: 2, sugeridas: ["sobrevivencia", "medicina", "atletismo", "diplomacia"],
    ordem: ["sab", "con", "des", "for", "car", "int"],
    prog: { percepcao: "1T 3E", fort: "1T 3E", ref: "1T 5E", von: "1E 11M 19L", ataque: CONJ_ATAQUE, defesa: CONJ_DEFESA, cd: "1T" },
    magia: { tradicao: "primal", tipo: "preparado", prog: CONJ_MAGIA, espacos: [2, 3] }, foco: 1,
    arma: { nome: "cajado", dano: "1d4", atributo: "for" }, armadura: GIBAO_PELE,
    equipamento: ["cajado", "foice", "gibão de peles", "visco ou folha sagrada"],
    notas: "Ordem druídica concede uma magia de foco (forma selvagem, companheiro animal, tempestade...). Não usa armadura de metal.",
  },
  {
    id: "guerreiro", nome: "Guerreiro", descricao: "Aço, cicatrizes e nenhuma paciência para charadas.",
    atributoChave: "for", chaves: ["for", "des"], pvBase: 10, papel: "combatente", fonte: "Player Core",
    pericias: ["atletismo"], maisPericias: 3, sugeridas: ["intimidacao", "acrobatismo", "medicina", "sobrevivencia", "sociedade"],
    ordem: ["for", "con", "des", "sab", "car", "int"],
    prog: { percepcao: "1E 7M", fort: "1E 9M", ref: "1E 15M", von: "1T 3E", ataque: "1E 5M 13L", defesa: "1T 11E 17M", cd: "1T 11E" },
    foco: 0, arma: { nome: "espada longa", dano: "1d8", atributo: "for" }, armadura: COTA,
    equipamento: ["espada longa", "escudo de aço", "arco curto", "cota de malha"],
    notas: "Melhor proficiência com armas do jogo; Ataque de Oportunidade (reação) já no 1º nível.",
  },
  {
    id: "investigador", nome: "Investigador", descricao: "Já sabe quem foi o culpado, só está esperando você admitir.",
    atributoChave: "int", chaves: ["int"], pvBase: 8, papel: "especialista", fonte: "Player Core 2",
    pericias: ["sociedade"], maisPericias: 4, sugeridas: ["medicina", "diplomacia", "ladroagem", "furtividade", "arcanismo", "ocultismo"],
    ordem: ["int", "des", "con", "sab", "car", "for"],
    prog: { percepcao: "1E 7M 13L", fort: "1T 9E", ref: "1E 15M", von: "1E 11M", ataque: MARCIAL, defesa: "1T 11E 19M", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "rapieira", dano: "1d6", atributo: "des" }, armadura: COURO,
    equipamento: ["rapieira", "besta de mão", "lupa", "caderno de anotações", "armadura de couro"],
    notas: "Engendrar Estratagema: rola o d20 antes e usa esse resultado no próximo ataque (pode usar INT no ataque). Recebe aumento de perícia todo nível.",
    periciaTodoNivel: true,
  },
  {
    id: "monge", nome: "Monge", descricao: "Socou uma parede por dez anos e agora a parede pede desculpas.",
    atributoChave: "for", chaves: ["for", "des"], pvBase: 10, papel: "combatente", fonte: "Player Core 2",
    pericias: ["acrobatismo"], maisPericias: 4, sugeridas: ["atletismo", "religiao", "medicina", "furtividade", "intimidacao"],
    ordem: ["des", "for", "sab", "con", "car", "int"],
    prog: { percepcao: "1T 5E 13M", fort: "1E 7M", ref: "1E 11M 17L", von: "1E 15M", ataque: MARCIAL, defesa: "1E 13M 17L", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "punhos", dano: "1d6", atributo: "for", agil: true }, armadura: SEM_ARMADURA,
    equipamento: ["bastão", "roupas de explorador", "bandagens para as mãos"],
    notas: "Rajada de Golpes (1 ação, 2 golpes desarmados); deslocamento cresce com o nível; magias de qi (foco) vêm de talentos.",
  },
  {
    id: "oraculo", nome: "Oráculo", descricao: "Os deuses lhe deram poder e uma maldição de brinde, sem nota fiscal.",
    atributoChave: "car", chaves: ["car"], pvBase: 8, papel: "conjurador", fonte: "Player Core 2",
    pericias: ["religiao"], maisPericias: 3, sugeridas: ["diplomacia", "medicina", "ocultismo", "sociedade"],
    ordem: ["car", "con", "des", "sab", "int", "for"],
    prog: { percepcao: "1T 11E", fort: "1T 9E", ref: "1T 7E", von: "1E 7M 17L", ataque: CONJ_ATAQUE, defesa: CONJ_DEFESA, cd: "1T" },
    magia: { tradicao: "divina", tipo: "espontaneo", prog: CONJ_MAGIA, espacos: [3, 4] }, foco: 1,
    arma: { nome: "lança curta", dano: "1d6", atributo: "for" }, armadura: COURO,
    equipamento: ["lança curta", "funda", "armadura de couro", "amuleto pessoal"],
    notas: "Mistério dá revelações (magias de foco) e uma maldição que piora quando ele usa poder demais.",
  },
  {
    id: "patrulheiro", nome: "Patrulheiro", descricao: "Prefere lobos a pessoas, e os lobos concordam.",
    atributoChave: "des", chaves: ["des", "for"], pvBase: 10, papel: "combatente", fonte: "Player Core",
    pericias: ["natureza", "sobrevivencia"], maisPericias: 4, sugeridas: ["furtividade", "atletismo", "medicina", "acrobatismo"],
    ordem: ["des", "sab", "con", "for", "int", "car"],
    prog: { percepcao: "1E 7M 15L", fort: "1E 11M", ref: "1E 7M 15L", von: "1T 3E", ataque: MARCIAL, defesa: "1T 11E 19M", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "arco longo", dano: "1d8", atributo: "des", distancia: true }, armadura: COURO,
    equipamento: ["arco longo", "flechas", "espada curta", "armadura de couro"],
    notas: "Caçar Presa (1 ação): marca um alvo e ganha a vantagem do caçador contra ele (Rajada, Precisão ou Astúcia).",
  },
  {
    id: "ladino", nome: "Ladino", descricao: "Bolsos alheios são só bolsos que ainda não são seus.",
    atributoChave: "des", chaves: ["des", "for", "int", "car"], pvBase: 8, papel: "especialista", fonte: "Player Core",
    pericias: ["furtividade"], maisPericias: 7, sugeridas: ["ladroagem", "acrobatismo", "dissimulacao", "atletismo", "diplomacia", "sociedade", "intimidacao", "medicina"],
    ordem: ["des", "con", "car", "int", "sab", "for"],
    prog: { percepcao: "1E 7M 13L", fort: "1T 9E", ref: "1E 7M 13L", von: "1E 11M", ataque: MARCIAL, defesa: "1T 13E 19M", cd: "1T 11E 19M" },
    foco: 0, arma: { nome: "espada curta", dano: "1d6", atributo: "des", agil: true }, armadura: COURO,
    equipamento: ["espada curta", "adagas", "ferramentas de ladrão", "armadura de couro"],
    notas: "Ataque Furtivo contra alvo desprevenido: +1d6 de precisão (2d6 no 5º, 3d6 no 11º, 4d6 no 17º). Aumento de perícia todo nível.",
    periciaTodoNivel: true,
  },
  {
    id: "feiticeiro", nome: "Feiticeiro", descricao: "Nasceu com magia no sangue e uma árvore genealógica que ninguém quer investigar.",
    atributoChave: "car", chaves: ["car"], pvBase: 6, papel: "conjurador", fonte: "Player Core 2",
    pericias: [], maisPericias: 4, sugeridas: ["arcanismo", "dissimulacao", "diplomacia", "intimidacao", "ocultismo", "religiao", "natureza"],
    ordem: ["car", "con", "des", "sab", "int", "for"],
    prog: { percepcao: "1T 11E", fort: "1T 9E", ref: "1T 5E", von: "1E 11M 17L", ataque: CONJ_ATAQUE, defesa: CONJ_DEFESA, cd: "1T" },
    magia: { tradicao: null, tipo: "espontaneo", prog: CONJ_MAGIA, espacos: [3, 4] }, foco: 1,
    arma: { nome: "adaga", dano: "1d4", atributo: "des", agil: true }, armadura: SEM_ARMADURA,
    equipamento: ["adaga", "cajado", "bolsa de componentes", "roupas de explorador"],
    notas: "A linhagem define a tradição, as magias extras e o efeito de sangue (bônus quando lança magia da linhagem).",
  },
  {
    id: "espadachim", nome: "Espadachim", descricao: "Luta com estilo, fala com floreio e morre com plateia, se possível.",
    atributoChave: "des", chaves: ["des"], pvBase: 10, papel: "combatente", fonte: "Player Core 2",
    pericias: ["acrobatismo"], maisPericias: 4, sugeridas: ["performance", "diplomacia", "dissimulacao", "intimidacao", "atletismo"],
    ordem: ["des", "car", "con", "sab", "for", "int"],
    prog: { percepcao: "1E 7M", fort: "1T 3E", ref: "1E 7M 13L", von: "1E 11M", ataque: MARCIAL, defesa: "1T 11E 19M", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "rapieira", dano: "1d6", atributo: "des" }, armadura: COURO,
    equipamento: ["rapieira", "adaga", "armadura de couro", "capa vistosa"],
    notas: "Ganha panache com ações de estilo; com panache tem velocidade e dano extra, e pode gastá-lo num golpe de arremate.",
  },
  {
    id: "bruxa", nome: "Bruxa", descricao: "Tem um patrono misterioso e um familiar que sabe demais.",
    atributoChave: "int", chaves: ["int"], pvBase: 6, papel: "conjurador", fonte: "Player Core",
    pericias: [], maisPericias: 3, sugeridas: ["ocultismo", "arcanismo", "natureza", "religiao", "medicina", "intimidacao"],
    ordem: ["int", "con", "des", "sab", "car", "for"],
    prog: { percepcao: "1T 11E", fort: "1T 5E", ref: "1T 9E", von: "1E 11M 17L", ataque: CONJ_ATAQUE, defesa: CONJ_DEFESA, cd: "1T" },
    magia: { tradicao: null, tipo: "preparado", prog: CONJ_MAGIA, espacos: [2, 3] }, foco: 1,
    arma: { nome: "foice", dano: "1d4", atributo: "for" }, armadura: SEM_ARMADURA,
    equipamento: ["cajado", "foice", "familiar", "caldeirão pequeno"],
    notas: "Familiar guarda as magias; feitiços (hexes) são magias de foco de 1 por turno. O patrono define a tradição.",
  },
  {
    id: "mago", nome: "Mago", descricao: "Leu todos os livros, inclusive os proibidos. Principalmente os proibidos.",
    atributoChave: "int", chaves: ["int"], pvBase: 6, papel: "conjurador", fonte: "Player Core",
    pericias: ["arcanismo"], maisPericias: 2, sugeridas: ["sociedade", "ocultismo", "manufatura", "medicina", "diplomacia"],
    ordem: ["int", "con", "des", "sab", "car", "for"],
    prog: { percepcao: "1T 11E", fort: "1T 9E", ref: "1T 5E", von: "1E 11M 17L", ataque: CONJ_ATAQUE, defesa: CONJ_DEFESA, cd: "1T" },
    magia: { tradicao: "arcana", tipo: "preparado", prog: CONJ_MAGIA, espacos: [2, 3] }, foco: 1,
    arma: { nome: "cajado", dano: "1d4", atributo: "for" }, armadura: SEM_ARMADURA,
    equipamento: ["grimório", "cajado", "bolsa de componentes", "tinteiro e penas"],
    notas: "Prepara magias do grimório; escola arcana dá magias de currículo (espaço extra) e uma magia de foco; tese arcana muda a preparação.",
  },
  {
    id: "magus", nome: "Magus", descricao: "Enfia uma bola de fogo na espada porque ler um livro inteiro dava preguiça.",
    atributoChave: "for", chaves: ["for", "des"], pvBase: 8, papel: "combatente", fonte: "Secrets of Magic",
    pericias: ["arcanismo"], maisPericias: 2, sugeridas: ["atletismo", "acrobatismo", "intimidacao", "sociedade"],
    ordem: ["for", "int", "con", "des", "sab", "car"],
    prog: { percepcao: "1T 9E", fort: "1E 9M", ref: "1T 5E", von: "1E 11M", ataque: MARCIAL, defesa: "1T 11E 17M", cd: "1T 9E 17M" },
    magia: { tradicao: "arcana", tipo: "onda", prog: "1T 9E 17M" }, foco: 1,
    arma: { nome: "cimitarra", dano: "1d6", atributo: "for" }, armadura: GIBAO,
    equipamento: ["cimitarra", "grimório", "camisão de malha", "bolsa de componentes"],
    notas: "Golpe Arcano (Spellstrike): golpe que descarrega uma magia; recarrega gastando 1 ação de Conflux ou lançando truque. Poucos espaços (dois círculos mais altos).",
  },
  {
    id: "invocador", nome: "Invocador", descricao: "Divide a alma com um eidolon e os dois brigam pelo controle remoto.",
    atributoChave: "car", chaves: ["car"], pvBase: 10, papel: "combatente", fonte: "Secrets of Magic",
    pericias: [], maisPericias: 3, sugeridas: ["arcanismo", "natureza", "religiao", "ocultismo", "diplomacia", "intimidacao"],
    ordem: ["car", "con", "des", "sab", "for", "int"],
    prog: { percepcao: "1T 9E", fort: "1E 11M", ref: "1T 3E", von: "1E 15M", ataque: MARCIAL, defesa: "1T 11E 17M", cd: "1T" },
    magia: { tradicao: null, tipo: "onda", prog: "1T 9E 17M" }, foco: 1,
    arma: { nome: "garras do eidolon", dano: "1d8", atributo: "for" }, armadura: SEM_ARMADURA,
    equipamento: ["lança", "roupas de explorador", "talismã de vínculo"],
    notas: "Invocador e eidolon dividem PV e ações (Agir Juntos); a tradição vem do eidolon. Magias de vínculo são de foco.",
  },
  {
    id: "pistoleiro", nome: "Pistoleiro", descricao: "Trouxe pólvora para uma luta de espadas e não se arrepende.",
    atributoChave: "des", chaves: ["des"], pvBase: 8, papel: "combatente", fonte: "Guns & Gears",
    pericias: [], maisPericias: 3, sugeridas: ["acrobatismo", "intimidacao", "furtividade", "manufatura", "atletismo", "sobrevivencia"],
    ordem: ["des", "con", "sab", "car", "for", "int"],
    prog: { percepcao: "1E 7M 13L", fort: "1E 11M", ref: "1E 15M", von: "1T 3E", ataque: "1E 5M 13L", defesa: "1T 13E 19M", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "mosquete", dano: "1d8", atributo: "des", distancia: true }, armadura: COURO,
    equipamento: ["mosquete ou pistolas de pederneira", "pólvora e balas", "kit de manutenção", "armadura de couro"],
    notas: "Iniciativa e manobras conforme o caminho; armas de fogo causam dano fatal (crítico com dado maior) e emperram em falha crítica.",
  },
  {
    id: "inventor", nome: "Inventor", descricao: "A invenção vai funcionar. Talvez. Afaste-se.",
    atributoChave: "int", chaves: ["int"], pvBase: 8, papel: "especialista", fonte: "Guns & Gears",
    pericias: ["manufatura"], maisPericias: 3, sugeridas: ["arcanismo", "atletismo", "sociedade", "medicina", "ladroagem"],
    ordem: ["int", "for", "con", "des", "sab", "car"],
    prog: { percepcao: "1T 9E", fort: "1E 11M", ref: "1T 9E", von: "1E 13M", ataque: MARCIAL, defesa: "1T 11E 19M", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "martelo de guerra", dano: "1d8", atributo: "for" }, armadura: PEITORAL,
    equipamento: ["martelo de guerra", "ferramentas de artesão", "peitoral", "sucata útil"],
    notas: "Sobrecarga (Overdrive, teste de Manufatura) aumenta o dano; ações instáveis podem deixar a invenção desestabilizada.",
  },
  {
    id: "psiquico", nome: "Psíquico", descricao: "Entorta colheres com a mente e a paciência do grupo também.",
    atributoChave: "int", chaves: ["int", "car"], pvBase: 6, papel: "conjurador", fonte: "Dark Archive",
    pericias: ["ocultismo"], maisPericias: 3, sugeridas: ["arcanismo", "dissimulacao", "diplomacia", "sociedade", "intimidacao"],
    ordem: ["int", "con", "des", "car", "sab", "for"],
    prog: { percepcao: "1T 11E", fort: "1T 9E", ref: "1T 5E", von: "1E 11M 17L", ataque: CONJ_ATAQUE, defesa: CONJ_DEFESA, cd: "1T" },
    magia: { tradicao: "oculta", tipo: "espontaneo", prog: CONJ_MAGIA, espacos: [2, 3] }, foco: 1,
    arma: { nome: "cajado", dano: "1d4", atributo: "for" }, armadura: SEM_ARMADURA,
    equipamento: ["cajado", "roupas de explorador", "cristal de foco"],
    notas: "Truques psíquicos ampliados com pontos de foco; Desencadear Psique por alguns turnos aumenta o dano das magias e causa dano ao fim.",
  },
  {
    id: "taumaturgo", nome: "Taumaturgo", descricao: "Carrega um espelho, um sino e uma superstição para cada monstro.",
    atributoChave: "car", chaves: ["car"], pvBase: 8, papel: "combatente", fonte: "Dark Archive",
    pericias: [], maisPericias: 3, sugeridas: ["ocultismo", "religiao", "arcanismo", "natureza", "intimidacao", "diplomacia"],
    ordem: ["car", "for", "con", "des", "sab", "int"],
    prog: { percepcao: "1E 7M 15L", fort: "1E 9M", ref: "1T 5E", von: "1E 11M 17L", ataque: MARCIAL, defesa: "1T 11E 19M", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "machado de batalha", dano: "1d8", atributo: "for" }, armadura: COURO,
    equipamento: ["arma de uma mão", "implemento", "esotérica variada", "armadura de couro"], saber: "Saber Esotérico",
    notas: "Explorar Vulnerabilidade (teste de Saber Esotérico, CAR) acha fraquezas e dá dano extra; implementos dão poderes.",
  },
  {
    id: "cinetico", nome: "Cinético", descricao: "Abriu um portal elemental dentro de si e agora não acha o botão de fechar.",
    atributoChave: "con", chaves: ["con"], pvBase: 8, papel: "combatente", fonte: "Rage of Elements",
    pericias: ["natureza"], maisPericias: 3, sugeridas: ["acrobatismo", "atletismo", "intimidacao", "sobrevivencia"],
    ordem: ["con", "des", "sab", "for", "car", "int"],
    prog: { percepcao: "1T 7E", fort: "1E 9M 17L", ref: "1E 11M", von: "1T 5E", ataque: "1T 7E", defesa: "1T 11E 19M", cd: "1T 7E 15M 19L" },
    foco: 0, arma: { nome: "explosão elemental", dano: "1d8", atributo: "des", distancia: true }, armadura: COURO,
    equipamento: ["armadura de couro", "um pedaço do seu elemento", "mochila"],
    notas: "Impulsos (CON) contra a CD de classe ou ataque de impulso (teste 'Impulso'); Canalizar Elementos ativa a aura cinética.",
  },
  {
    id: "animista", nome: "Animista", descricao: "Recebe visitas de espíritos antigos e nem sempre oferece café.",
    atributoChave: "sab", chaves: ["sab"], pvBase: 8, papel: "conjurador", fonte: "War of Immortals",
    pericias: ["religiao"], maisPericias: 2, sugeridas: ["natureza", "ocultismo", "medicina", "diplomacia", "sobrevivencia"],
    ordem: ["sab", "con", "car", "des", "for", "int"],
    prog: { percepcao: "1E 7M", fort: "1T 3E", ref: "1T 9E", von: "1E 11M 17L", ataque: CONJ_ATAQUE, defesa: CONJ_DEFESA, cd: "1T" },
    magia: { tradicao: "divina", tipo: "preparado", prog: CONJ_MAGIA, espacos: [2, 2] }, foco: 1,
    arma: { nome: "lança curta", dano: "1d6", atributo: "for" }, armadura: COURO,
    equipamento: ["lança curta", "armadura de couro", "oferendas aos espíritos"],
    notas: "Canaliza aparições que dão perícias, magias espontâneas e magias de receptáculo (foco); troca de aparição na preparação.",
  },
  {
    id: "exemplar", nome: "Exemplar", descricao: "Tem uma centelha divina e um ego do mesmo tamanho.",
    atributoChave: "for", chaves: ["for", "des"], pvBase: 10, papel: "combatente", fonte: "War of Immortals",
    pericias: ["religiao"], maisPericias: 3, sugeridas: ["atletismo", "acrobatismo", "intimidacao", "diplomacia", "performance"],
    ordem: ["for", "des", "con", "car", "sab", "int"],
    prog: { percepcao: "1E 7M", fort: "1E 9M", ref: "1E 11M", von: "1T 3E", ataque: MARCIAL, defesa: "1T 11E 19M", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "lança", dano: "1d6", atributo: "for" }, armadura: SEM_ARMADURA,
    equipamento: ["lança ou arma de ícone", "roupas de explorador", "adorno de ícone"],
    notas: "Move a centelha divina entre ícones (Mudar Centelha); cada ícone dá passivos e uma ação de transcendência.",
  },
  {
    id: "comandante", nome: "Comandante", descricao: "Grita ordens no meio do caos e, por milagre, todo mundo obedece.",
    atributoChave: "int", chaves: ["int"], pvBase: 8, papel: "suporte", fonte: "Battlecry!",
    pericias: ["sociedade"], maisPericias: 2, sugeridas: ["diplomacia", "intimidacao", "atletismo", "medicina"],
    ordem: ["int", "for", "con", "des", "car", "sab"],
    prog: { percepcao: "1E 7M", fort: "1E 9M", ref: "1T 5E", von: "1E 11M", ataque: MARCIAL, defesa: "1T 11E 17M", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "alabarda", dano: "1d10", atributo: "for" }, armadura: COTA,
    equipamento: ["alabarda", "estandarte", "cota de malha", "corneta"], saber: "Saber de Guerra",
    notas: "Táticas gastam ações do comandante para mover e fazer aliados agirem; o estandarte dá bônus de aura.",
  },
  {
    id: "guardiao", nome: "Guardião", descricao: "Uma muralha de metal que anda, reclama e não sai da frente.",
    atributoChave: "for", chaves: ["for"], pvBase: 12, papel: "defensor", fonte: "Battlecry!",
    pericias: ["atletismo", "intimidacao"], maisPericias: 3, sugeridas: ["medicina", "sobrevivencia", "diplomacia"],
    ordem: ["for", "con", "sab", "des", "car", "int"],
    prog: { percepcao: "1T 7E", fort: "1E 7M 13L", ref: "1T 9E", von: "1E 11M", ataque: MARCIAL, defesa: "1E 7M 13L", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "martelo de guerra", dano: "1d8", atributo: "for" }, armadura: ARMADURA_COMPLETA,
    equipamento: ["martelo de guerra", "escudo pesado", "armadura completa"],
    notas: "Intercepta ataques contra aliados (reação), provoca inimigos e reduz dano com a armadura; melhor CA do jogo.",
  },
  {
    id: "necromante", nome: "Necromante", descricao: "Os mortos trabalham para ele e nem pedem aumento.",
    atributoChave: "int", chaves: ["int"], pvBase: 6, papel: "conjurador", fonte: "Impossible Playtest",
    pericias: ["ocultismo"], maisPericias: 2, sugeridas: ["religiao", "medicina", "intimidacao", "arcanismo"],
    ordem: ["int", "con", "des", "sab", "car", "for"],
    prog: { percepcao: "1T 11E", fort: "1T 9E", ref: "1T 5E", von: "1E 11M 17L", ataque: CONJ_ATAQUE, defesa: CONJ_DEFESA, cd: "1T" },
    magia: { tradicao: "oculta", tipo: "espontaneo", prog: CONJ_MAGIA, espacos: [2, 3] }, foco: 1,
    arma: { nome: "foice", dano: "1d4", atributo: "for" }, armadura: SEM_ARMADURA,
    equipamento: ["foice", "ossos variados", "roupas de explorador"],
    notas: "Cria servos mortos-vivos efêmeros (thralls) que agem como peças de tabuleiro para magias de sepultura.",
  },
  {
    id: "runista", nome: "Runista", descricao: "Escreve runas em tudo, inclusive na cara dos inimigos.",
    atributoChave: "int", chaves: ["int"], pvBase: 8, papel: "especialista", fonte: "Impossible Playtest",
    pericias: ["manufatura"], maisPericias: 3, sugeridas: ["arcanismo", "atletismo", "sociedade", "intimidacao"],
    ordem: ["int", "for", "con", "des", "sab", "car"],
    prog: { percepcao: "1T 9E", fort: "1E 9M", ref: "1T 5E", von: "1E 11M", ataque: MARCIAL, defesa: "1T 11E 19M", cd: "1T 9E 17M" },
    foco: 0, arma: { nome: "martelo leve", dano: "1d6", atributo: "for", agil: true }, armadura: GIBAO,
    equipamento: ["martelo leve", "cinzel e tintas", "camisão de malha"],
    notas: "Traça runas em aliados, armas e inimigos e as invoca (detona) para efeitos imediatos.",
  },
];

// Tipos de armadura citados para manter os objetos usados (alguns ficam como referência para o mestre).
export const ARMADURAS_REFERENCIA: ArmaduraPf2[] = [SEM_ARMADURA, COURO, COURO_BATIDO, GIBAO, GIBAO_PELE, ESCAMAS, PEITORAL, COTA, MEIA_ARMADURA, ARMADURA_COMPLETA];

export const CLASSES: ClassePf2[] = BASE;
