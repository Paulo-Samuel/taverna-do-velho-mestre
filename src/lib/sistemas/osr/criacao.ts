import "server-only";
import type { AncestralidadeDef, AtributoDef, OpcaoSimples, PericiaDef } from "../tipos";
import type { Salva } from "./tabelas";

// Dados de criação do Old-School: atributos, habilidades (% e d6), raças, ofícios e listas de magias iniciais.

export const ATRIBUTOS: AtributoDef[] = [
  { id: "for", nome: "Força", abrev: "FOR", descricao: "Acerto e dano corpo a corpo, abrir portas." },
  { id: "int", nome: "Inteligência", abrev: "INT", descricao: "Idiomas, leitura e magia arcana." },
  { id: "sab", nome: "Sabedoria", abrev: "SAB", descricao: "Salvaguardas contra magia e magia divina." },
  { id: "des", nome: "Destreza", abrev: "DES", descricao: "CA, ataques à distância e iniciativa." },
  { id: "con", nome: "Constituição", abrev: "CON", descricao: "PV por dado de vida." },
  { id: "car", nome: "Carisma", abrev: "CAR", descricao: "Reação de monstros, seguidores e lealdade." },
];

/** Abreviações em inglês, para quando o mestre (ou o jogador) escapa no idioma do livro. */
export const ABREV_INGLES: Record<string, string> = { str: "for", int: "int", wis: "sab", dex: "des", con: "con", cha: "car" };

export type TipoHabilidade = "pct" | "d6";

export type HabilidadeDef = PericiaDef & {
  tipo: TipoHabilidade;
  /** formas de pedir o teste (normalizadas, sem acento) */
  apelidos: string[];
  /** atributo usado quando o personagem não tem a habilidade (teste de atributo com −4) */
  semTreino?: string;
};

// d6: sucesso em 1..X ("2 em 6"); pct: d100 ≤ valor
export const HABILIDADES: HabilidadeDef[] = [
  { id: "abrir-portas", nome: "Abrir portas", atributo: "for", tipo: "d6", apelidos: ["abrir porta", "arrombar", "forcar porta", "derrubar porta", "open door"], descricao: "Portas emperradas: 2 em 6, ajustado pela FOR." },
  { id: "ouvir", nome: "Ouvir ruídos", tipo: "d6", apelidos: ["ouvir", "escutar", "hear noise"], descricao: "Encostar o ouvido na porta e torcer." },
  { id: "portas-secretas", nome: "Procurar portas secretas", tipo: "d6", apelidos: ["porta secreta", "portas secretas", "passagem secreta", "procurar porta"], descricao: "Um turno vasculhando paredes: 1 em 6 (elfos 2 em 6)." },
  { id: "procurar-armadilhas", nome: "Procurar armadilhas", tipo: "d6", apelidos: ["procurar armadilha", "achar armadilha", "encontrar armadilha", "detectar armadilha"], descricao: "Qualquer um procura: 1 em 6 (anões 2 em 6). Ladrões usam a porcentagem." },
  { id: "detectar-construcao", nome: "Detectar construções", tipo: "d6", apelidos: ["construc", "paredes moveis", "rampa", "pedra nova", "detectar construcao"], descricao: "Notar paredes falsas, rampas e alvenaria nova." },
  { id: "escalar", nome: "Escalar paredes", atributo: "des", tipo: "pct", semTreino: "des", apelidos: ["escalar", "escalada", "subir parede", "climb"] },
  { id: "armadilhas", nome: "Encontrar/desarmar armadilhas", atributo: "des", tipo: "pct", semTreino: "des", apelidos: ["desarmar", "remover armadilha", "encontrar/desarmar"] },
  { id: "esconder", nome: "Esconder-se nas sombras", atributo: "des", tipo: "pct", semTreino: "des", apelidos: ["esconder", "sombras", "ocultar", "hide"] },
  { id: "silencio", nome: "Mover-se em silêncio", atributo: "des", tipo: "pct", semTreino: "des", apelidos: ["silencio", "furtiv", "esgueirar", "andar em silencio", "move silently"] },
  { id: "abrir-fechaduras", nome: "Abrir fechaduras", atributo: "des", tipo: "pct", semTreino: "des", apelidos: ["fechadura", "cadeado", "gazua", "pick lock"] },
  { id: "bater-carteiras", nome: "Bater carteiras", atributo: "des", tipo: "pct", semTreino: "des", apelidos: ["carteira", "bolso", "punga", "furtar", "roubar", "pick pocket"] },
  { id: "equilibrio", nome: "Andar na corda bamba", atributo: "des", tipo: "pct", semTreino: "des", apelidos: ["corda bamba", "equilibr", "beiral"] },
  { id: "queda", nome: "Cair com estilo", atributo: "des", tipo: "pct", semTreino: "des", apelidos: ["queda", "cair", "amortecer"] },
  { id: "lendas", nome: "Saber de lendas", atributo: "int", tipo: "pct", semTreino: "int", apelidos: ["lenda", "saber", "historia", "conhecimento", "lore"] },
  { id: "rastrear", nome: "Rastrear", atributo: "sab", tipo: "pct", semTreino: "sab", apelidos: ["rastr", "pegada", "trilha", "track"] },
];

export type EfeitosRaca = {
  d6?: Record<string, number>;
  salvas?: Partial<Record<Salva, number>>;
  ataqueDistancia?: number;
  iniciativa?: number;
};

export type RacaOsr = AncestralidadeDef & { efeitos?: EfeitosRaca };

// Raças para o modo "raça separada". Raças-classe (Anão, Elfo, Halfling, Gnomo, Meio-orc, Drow,
// Svirfneblin, Duergar, Meio-elfo como classe) ignoram a escolha: a raça da ficha vira a da classe.
export const RACAS: RacaOsr[] = [
  { id: "humano", nome: "Humano", descricao: "Vida curta, ambição longa e nenhum limite de nível para atrapalhar.", deslocamento: "36 m por turno", tracos: ["Qualquer classe, sem limite de nível"] },
  {
    id: "anao", nome: "Anão", descricao: "Barba, rancor e uma memória perfeita para dívidas alheias.", deslocamento: "18 m por turno",
    ajustes: { con: 1, car: -1 }, tracos: ["Infravisão 18 m", "Detecta construções (2 em 6)", "+2 em salvaguardas contra Morte, Varinhas e Magias"],
    efeitos: { d6: { "detectar-construcao": 2, "procurar-armadilhas": 2, ouvir: 2 }, salvas: { morte: 2, varinhas: 2, magias: 2 } },
  },
  {
    id: "elfo", nome: "Elfo", descricao: "Séculos de vida e ainda assim chega atrasado.", deslocamento: "36 m por turno",
    ajustes: { des: 1, con: -1 }, tracos: ["Infravisão 18 m", "Acha portas secretas (2 em 6)", "Imune à paralisia de carniçal"],
    efeitos: { d6: { "portas-secretas": 2, ouvir: 2 }, salvas: { paralisia: 2 } },
  },
  {
    id: "halfling", nome: "Halfling", descricao: "Seis refeições por dia e uma sorte que irrita os deuses.", deslocamento: "27 m por turno",
    ajustes: { des: 1, for: -1 }, tracos: ["+1 em ataques à distância", "+1 na iniciativa", "+2 em todas as salvaguardas exceto Sopro", "Esconde-se 90% ao ar livre"],
    efeitos: { d6: { ouvir: 2 }, salvas: { morte: 2, varinhas: 2, paralisia: 2, magias: 2 }, ataqueDistancia: 1, iniciativa: 1 },
  },
  {
    id: "gnomo", nome: "Gnomo", descricao: "Cabe numa mochila e já sabotou três delas.", deslocamento: "18 m por turno",
    ajustes: { int: 1, for: -1 }, tracos: ["Infravisão 18 m", "Detecta construções (2 em 6)", "+2 em salvaguardas contra Varinhas e Magias"],
    efeitos: { d6: { "detectar-construcao": 2, ouvir: 2 }, salvas: { varinhas: 2, magias: 2 } },
  },
  {
    id: "meio-elfo", nome: "Meio-elfo", descricao: "Herdou as orelhas do pai e a paciência de ninguém.", deslocamento: "36 m por turno",
    tracos: ["Infravisão 18 m", "Acha portas secretas (2 em 6)"],
    efeitos: { d6: { "portas-secretas": 2 } },
  },
  {
    id: "meio-orc", nome: "Meio-orc", descricao: "Presas, cicatrizes e uma postura defensiva sobre a própria mãe.", deslocamento: "36 m por turno",
    ajustes: { for: 1, con: 1, car: -2 }, tracos: ["Infravisão 18 m", "Assusta: −1 na reação de quem não o conhece"],
  },
  {
    id: "drow", nome: "Drow", descricao: "Cresceu no escuro e não pretende sair dele por educação.", deslocamento: "36 m por turno",
    ajustes: { des: 1, con: -1 }, tracos: ["Infravisão 36 m", "Sensível à luz (−2 no ataque sob sol forte)", "Acha portas secretas (2 em 6)"],
    efeitos: { d6: { "portas-secretas": 2, ouvir: 2 }, salvas: { magias: 2 } },
  },
  {
    id: "svirfneblin", nome: "Svirfneblin", descricao: "Gnomo das profundezas que nunca contou uma piada e nunca vai.", deslocamento: "18 m por turno",
    ajustes: { sab: 1, car: -1 }, tracos: ["Infravisão 36 m", "Só é surpreendido em 1 em 6", "Ouvir ruídos 3 em 6"],
    efeitos: { d6: { ouvir: 3, "detectar-construcao": 2 }, salvas: { varinhas: 2, magias: 2 } },
  },
  {
    id: "duergar", nome: "Duergar", descricao: "Anão cinzento que trocou a cerveja pelo ressentimento.", deslocamento: "18 m por turno",
    ajustes: { con: 1, car: -1 }, tracos: ["Infravisão 36 m", "Sensível à luz", "Imune a ilusões"],
    efeitos: { d6: { "detectar-construcao": 2 }, salvas: { paralisia: 2, magias: 2 } },
  },
];

/** Ofícios de antes da vida de aventureiro; cada um rende um item a mais no inventário. */
export const OFICIOS: (OpcaoSimples & { item: string })[] = [
  { id: "coveiro", nome: "Coveiro", descricao: "Já enterrou mais gente do que vai conhecer. Ganha uma pá.", item: "pá" },
  { id: "ferreiro", nome: "Ferreiro", descricao: "Braço forte, orelha surda. Ganha um martelo.", item: "martelo de ferreiro" },
  { id: "contrabandista", nome: "Contrabandista", descricao: "Nunca carregou nada ilegal, segundo ele. Ganha uma bolsa de fundo falso.", item: "bolsa de fundo falso" },
  { id: "cozinheiro", nome: "Cozinheiro de taverna", descricao: "Sabe o que vai no ensopado e prefere não contar. Ganha uma panela.", item: "panela de ferro" },
  { id: "escriba", nome: "Escriba", descricao: "Letra bonita, coluna torta. Ganha tinta, pena e pergaminho.", item: "tinta, pena e 5 folhas de pergaminho" },
  { id: "ratoeiro", nome: "Caçador de ratos", descricao: "O primeiro emprego de todo herói, segundo as canções. Ganha um furão.", item: "furão de estimação" },
  { id: "pescador", nome: "Pescador", descricao: "Mente sobre o tamanho de tudo. Ganha uma rede.", item: "rede de pesca" },
  { id: "pastor", nome: "Pastor", descricao: "Conhece lobos melhor que gente. Ganha um cajado.", item: "cajado de pastor" },
  { id: "mineiro", nome: "Mineiro", descricao: "Já viu o escuro de perto e não gostou. Ganha uma picareta.", item: "picareta" },
  { id: "desertor", nome: "Soldado desertor", descricao: "Fugiu de uma guerra que já esqueceram. Ganha uma lança enferrujada.", item: "lança enferrujada" },
  { id: "acolito", nome: "Acólito expulso", descricao: "Perguntou demais no templo errado. Ganha um símbolo sagrado rachado.", item: "símbolo sagrado rachado" },
  { id: "mendigo", nome: "Mendigo", descricao: "Sabe todas as fofocas da cidade. Ganha uma tigela e uma muleta.", item: "tigela e muleta" },
  { id: "barqueiro", nome: "Barqueiro", descricao: "Cobra o dobro na volta. Ganha uma vara longa.", item: "vara de barqueiro" },
  { id: "lenhador", nome: "Lenhador", descricao: "Árvores o temem, com razão. Ganha um machado.", item: "machado de lenhador" },
  { id: "saltimbanco", nome: "Saltimbanco", descricao: "Engole fogo, cospe moedas. Ganha bolas de malabarismo.", item: "bolas de malabarismo" },
  { id: "curandeiro", nome: "Curandeiro de beira de estrada", descricao: "Metade das ervas funciona. Ganha um saco de ervas.", item: "saco de ervas medicinais" },
  { id: "carcereiro", nome: "Carcereiro", descricao: "Já ouviu todas as desculpas. Ganha um molho de chaves que não abre nada daqui.", item: "molho de chaves velhas" },
  { id: "herdeiro", nome: "Herdeiro falido", descricao: "O sobrenome ainda vale alguma coisa; o resto, não. Ganha um anel de sinete.", item: "anel de sinete" },
  { id: "alquimista", nome: "Aprendiz de alquimista", descricao: "Sobrancelhas: zero. Ganha um frasco de óleo inflamável.", item: "2 frascos de óleo" },
  { id: "cartografo", nome: "Cartógrafo", descricao: "Desenha o mapa e depois descobre que errou. Ganha um mapa incompleto.", item: "mapa incompleto de uma masmorra" },
];

export const MAGIAS_ARCANAS: OpcaoSimples[] = [
  { id: "detectar-magia", nome: "Detectar magia", descricao: "Faz o encantado brilhar." },
  { id: "disco-flutuante", nome: "Disco flutuante", descricao: "Um carregador de tesouro invisível e sem sindicato." },
  { id: "enfeiticar-pessoa", nome: "Enfeitiçar pessoa", descricao: "Seu novo melhor amigo, até salvar contra Magias." },
  { id: "escudo", nome: "Escudo", descricao: "CA melhor e mísseis que desviam." },
  { id: "ler-idiomas", nome: "Ler idiomas", descricao: "Entende qualquer escrita por um tempo." },
  { id: "ler-magias", nome: "Ler magias", descricao: "Decifra pergaminhos e grimórios alheios." },
  { id: "luz", nome: "Luz", descricao: "Ilumina ou cega quem falhar na salvaguarda." },
  { id: "misseis-magicos", nome: "Mísseis mágicos", descricao: "Dardos de energia que nunca erram (1d6+1 cada)." },
  { id: "protecao-mal", nome: "Proteção contra o mal", descricao: "Criaturas malignas acertam com mais dificuldade." },
  { id: "segurar-portal", nome: "Segurar portal", descricao: "Essa porta não abre. Nem para você." },
  { id: "sono", nome: "Sono", descricao: "2d8 DV de criaturas dormem sem salvaguarda. A magia mais perigosa do 1º nível." },
  { id: "ventriloquismo", nome: "Ventriloquismo", descricao: "Sua voz sai de onde você quiser." },
];

export const MAGIAS_ILUSAO: OpcaoSimples[] = [
  { id: "cores-estonteantes", nome: "Cores estonteantes", descricao: "Um leque de cores que derruba os mais fracos." },
  { id: "detectar-ilusao", nome: "Detectar ilusão", descricao: "Vê através de truques — inclusive os seus." },
  { id: "escuridao", nome: "Escuridão", descricao: "Uma esfera de breu que nem tocha resolve." },
  { id: "forca-fantasmagorica", nome: "Força fantasmagórica", descricao: "Uma ilusão tão convincente que machuca de verdade." },
  { id: "hipnotismo", nome: "Hipnotismo", descricao: "Sugestões que parecem boa ideia." },
  { id: "luz", nome: "Luz", descricao: "Até ilusionistas precisam enxergar." },
  { id: "mudar-se", nome: "Mudar-se", descricao: "Outro rosto, outra roupa, mesma dívida." },
  { id: "som-ilusorio", nome: "Som ilusório", descricao: "Passos, gritos ou uma banda inteira." },
  { id: "ventriloquismo", nome: "Ventriloquismo", descricao: "A voz vem de trás do orc. O orc se vira." },
  { id: "ler-magias", nome: "Ler magias", descricao: "Necessário para copiar grimórios." },
];

export const MAGIAS_NECRO: OpcaoSimples[] = [
  { id: "toque-gelado", nome: "Toque gelado", descricao: "Dedos frios que drenam a força." },
  { id: "detectar-mortos", nome: "Detectar mortos-vivos", descricao: "Sente o que não deveria estar andando." },
  { id: "medo-menor", nome: "Medo menor", descricao: "Faz um alvo fugir se falhar na salvaguarda." },
  { id: "esqueleto-servil", nome: "Esqueleto servil", descricao: "Ergue um esqueleto que carrega tochas e não reclama." },
  { id: "conversar-cadaver", nome: "Conversar com cadáver", descricao: "Três perguntas a quem já não tem pressa." },
  { id: "mortalha", nome: "Mortalha de sombras", descricao: "Escurece a área e esfria a coragem." },
  { id: "ler-magias", nome: "Ler magias", descricao: "Até o necromante precisa ler as letras miúdas." },
];
