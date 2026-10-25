import type { AtributoDef, PericiaDef } from "../tipos";

// Tabelas do Pathfinder 1e (PRD, OGL 1.0a): atributos, perícias, talentos, espaços de magia e XP.
// Textos escritos do zero, em português, com o tempero da taverna.

export const ATRIBUTOS: AtributoDef[] = [
  { id: "for", nome: "Força", abrev: "FOR", descricao: "Corpo a corpo, carga, Escalar e Natação." },
  { id: "des", nome: "Destreza", abrev: "DES", descricao: "CA, Reflexos, ataques à distância e acrobacias." },
  { id: "con", nome: "Constituição", abrev: "CON", descricao: "PV por nível e Fortitude." },
  { id: "int", nome: "Inteligência", abrev: "INT", descricao: "Pontos de perícia e magia arcana preparada." },
  { id: "sab", nome: "Sabedoria", abrev: "SAB", descricao: "Vontade, Percepção e magia divina." },
  { id: "car", nome: "Carisma", abrev: "CAR", descricao: "Lábia, presença e magia espontânea." },
];

export type PericiaPf1 = PericiaDef & {
  atributo: string;
  /** só pode ser usada com graduação (Conhecimento ainda permite CD 10 ou menos) */
  treinada?: boolean;
  /** apelidos aceitos no pedido de teste (inclusive nomes de outros sistemas) */
  apelidos?: string[];
};

const CONHECIMENTOS: [string, string, string[]][] = [
  ["arcano", "Arcano", ["arcanismo", "arcana", "magia arcana"]],
  ["masmorras", "Masmorras", ["subterraneo", "dungeon"]],
  ["engenharia", "Engenharia", ["construcao", "arquitetura"]],
  ["geografia", "Geografia", ["terrenos", "mapas"]],
  ["historia", "História", ["historia"]],
  ["local", "Local", ["ruas", "boatos"]],
  ["natureza", "Natureza", ["natureza", "feras"]],
  ["nobreza", "Nobreza", ["realeza", "etiqueta"]],
  ["planos", "Planos", ["extraplanar", "outros planos"]],
  ["religiao", "Religião", ["religiao", "deuses"]],
];

export const PERICIAS: PericiaPf1[] = [
  { id: "acrobacia", nome: "Acrobacia", atributo: "des", apelidos: ["equilibrio", "saltar", "pular", "acrobacias"] },
  { id: "avaliacao", nome: "Avaliação", atributo: "int", apelidos: ["avaliar", "valor"] },
  { id: "blefar", nome: "Blefar", atributo: "car", apelidos: ["enganacao", "enganar", "mentir", "fintar"] },
  { id: "escalar", nome: "Escalar", atributo: "for", apelidos: ["atletismo", "escalada", "subir"] },
  { id: "oficio", nome: "Ofício", atributo: "int", apelidos: ["oficios", "fabricar", "craft", "alquimia"] },
  { id: "diplomacia", nome: "Diplomacia", atributo: "car", apelidos: ["persuasao", "persuadir", "negociar", "obter informacoes"] },
  { id: "operar", nome: "Operar Mecanismo", atributo: "des", treinada: true, apelidos: ["desarmar armadilha", "abrir fechadura", "arrombar fechadura", "ferramentas de ladrao"] },
  { id: "disfarce", nome: "Disfarce", atributo: "car", apelidos: ["disfarcar"] },
  { id: "arte_fuga", nome: "Arte da Fuga", atributo: "des", apelidos: ["escapar", "fuga", "soltar se"] },
  { id: "voar", nome: "Voar", atributo: "des", apelidos: ["voo"] },
  { id: "adestrar", nome: "Adestrar Animais", atributo: "car", treinada: true, apelidos: ["lidar com animais", "adestramento"] },
  { id: "cura", nome: "Cura", atributo: "sab", apelidos: ["medicina", "primeiros socorros", "tratar ferimentos"] },
  { id: "intimidar", nome: "Intimidar", atributo: "car", apelidos: ["intimidacao", "ameacar", "desmoralizar"] },
  ...CONHECIMENTOS.map(([id, nome, apelidos]) => ({
    id: `conh_${id}`,
    nome: `Conhecimento (${nome})`,
    atributo: "int",
    treinada: true,
    apelidos: apelidos.map((a) => `conhecimento ${a}`).concat(apelidos.length ? [apelidos[0]] : []),
  })),
  { id: "linguistica", nome: "Linguística", atributo: "int", treinada: true, apelidos: ["idiomas", "decifrar", "falsificar"] },
  { id: "percepcao", nome: "Percepção", atributo: "sab", apelidos: ["observar", "ouvir", "procurar", "investigacao", "investigar", "notar"] },
  { id: "atuacao", nome: "Atuação", atributo: "car", apelidos: ["atuar", "cantar", "tocar", "performance"] },
  { id: "profissao", nome: "Profissão", atributo: "sab", treinada: true, apelidos: ["profissao"] },
  { id: "cavalgar", nome: "Cavalgar", atributo: "des", apelidos: ["montar", "montaria"] },
  { id: "sentir_motivacao", nome: "Sentir Motivação", atributo: "sab", apelidos: ["intuicao", "intuir", "perceber mentira", "sentir motivacao"] },
  { id: "prestidigitacao", nome: "Prestidigitação", atributo: "des", treinada: true, apelidos: ["punga", "bater carteira", "truque de maos"] },
  { id: "identificar_magia", nome: "Identificar Magia", atributo: "int", treinada: true, apelidos: ["identificar", "spellcraft"] },
  { id: "furtividade", nome: "Furtividade", atributo: "des", apelidos: ["esconder", "esgueirar", "mover silenciosamente", "stealth"] },
  { id: "sobrevivencia", nome: "Sobrevivência", atributo: "sab", apelidos: ["rastrear", "rastreio", "orientacao"] },
  { id: "natacao", nome: "Natação", atributo: "for", apelidos: ["nadar"] },
  { id: "usar_instrumento", nome: "Usar Instrumento Mágico", atributo: "car", treinada: true, apelidos: ["usar item magico", "umd", "usar instrumento magico"] },
];

export const CONH = CONHECIMENTOS.map(([id]) => `conh_${id}`);

/** Efeitos mecânicos que a ficha aplica sozinha. */
export type EfeitoTalento = {
  pericias?: Record<string, number>;
  fort?: number;
  ref?: number;
  von?: number;
  iniciativa?: number;
  ca?: number;
  ataque?: number;
  concentracao?: number;
  penetrar?: number;
  /** recurso extra por id */
  recursos?: Record<string, number>;
};

export type TalentoPf1 = { id: string; nome: string; descricao: string; efeito?: EfeitoTalento };

export const TALENTOS: TalentoPf1[] = [
  { id: "iniciativa_aprimorada", nome: "Iniciativa Aprimorada", descricao: "+4 na iniciativa. Chega antes da briga, e às vezes antes do bom senso.", efeito: { iniciativa: 4 } },
  { id: "fortitude_maior", nome: "Fortitude Maior", descricao: "+2 em Fortitude. Estômago de bode.", efeito: { fort: 2 } },
  { id: "reflexos_rapidos", nome: "Reflexos Rápidos", descricao: "+2 em Reflexos. Desvia de bola de fogo e de conta de bar.", efeito: { ref: 2 } },
  { id: "vontade_ferro", nome: "Vontade de Ferro", descricao: "+2 em Vontade. Teimosia oficializada.", efeito: { von: 2 } },
  { id: "robustez", nome: "Robustez", descricao: "+3 PV, e +1 PV por nível acima do 3º. Couro grosso, cérebro opcional." },
  { id: "esquiva", nome: "Esquiva", descricao: "+1 de esquiva na CA.", efeito: { ca: 1 } },
  { id: "foco_arma", nome: "Foco em Arma", descricao: "+1 no ataque com a arma da classe.", efeito: { ataque: 1 } },
  { id: "acuidade_arma", nome: "Acuidade com Arma", descricao: "Usa DES em vez de FOR no ataque corpo a corpo com armas leves." },
  { id: "ataque_poderoso", nome: "Ataque Poderoso", descricao: "Troca -1 no ataque por +2 no dano (escala a cada +4 de BBA)." },
  { id: "especializacao_combate", nome: "Especialização em Combate", descricao: "Troca -1 no ataque por +1 de esquiva na CA (escala com o BBA)." },
  { id: "reflexos_combate", nome: "Reflexos de Combate", descricao: "Ataques de oportunidade extras iguais ao mod. de DES." },
  { id: "tiro_certeiro", nome: "Tiro Certeiro", descricao: "+1 no ataque e no dano à distância até 9 m." },
  { id: "tiro_preciso", nome: "Tiro Preciso", descricao: "Atira em quem está em combate corpo a corpo sem a penalidade de -4." },
  { id: "tiro_rapido", nome: "Tiro Rápido", descricao: "Um ataque à distância extra na ação de ataque total, tudo com -2." },
  { id: "desarmado_aprimorado", nome: "Ataque Desarmado Aprimorado", descricao: "Soco não provoca ataque de oportunidade e causa dano letal." },
  { id: "mobilidade", nome: "Mobilidade", descricao: "+4 de esquiva na CA contra ataques de oportunidade por movimento." },
  { id: "duro_de_matar", nome: "Duro de Matar", descricao: "Fica de pé e consciente com PV negativos. Teimosia nível profissional." },
  { id: "vigor", nome: "Vigor", descricao: "+4 contra fadiga, fome, sede, calor, frio e afogamento." },
  { id: "magia_combate", nome: "Magia em Combate", descricao: "+4 em Concentração para conjurar na defensiva ou agarrado.", efeito: { concentracao: 4 } },
  { id: "magia_penetrante", nome: "Magia Penetrante", descricao: "+2 nos testes de nível de conjurador contra resistência à magia.", efeito: { penetrar: 2 } },
  { id: "foco_magia", nome: "Foco em Magia", descricao: "+1 na CD das magias de uma escola escolhida." },
  { id: "canalizar_extra", nome: "Canalizar Extra", descricao: "+2 usos diários de canalizar energia.", efeito: { recursos: { canalizar: 2 } } },
  { id: "canalizar_seletivo", nome: "Canalizar Seletivo", descricao: "Escolhe quem fica de fora da sua canalização. O amigo chato, por exemplo." },
  { id: "furia_extra", nome: "Fúria Extra", descricao: "+6 rodadas de fúria por dia.", efeito: { recursos: { furia: 6 } } },
  { id: "ki_extra", nome: "Ki Extra", descricao: "+2 pontos de ki.", efeito: { recursos: { ki: 2 } } },
  { id: "musica_extra", nome: "Atuação Extra", descricao: "+6 rodadas de música de bardo (ou canção do escaldo).", efeito: { recursos: { musica: 6 } } },
  { id: "prontidao", nome: "Prontidão", descricao: "+2 em Percepção e Sentir Motivação.", efeito: { pericias: { percepcao: 2, sentir_motivacao: 2 } } },
  { id: "atletico", nome: "Atlético", descricao: "+2 em Escalar e Natação.", efeito: { pericias: { escalar: 2, natacao: 2 } } },
  { id: "acrobatico", nome: "Acrobático", descricao: "+2 em Acrobacia e Voar.", efeito: { pericias: { acrobacia: 2, voar: 2 } } },
  { id: "persuasivo", nome: "Persuasivo", descricao: "+2 em Diplomacia e Intimidar.", efeito: { pericias: { diplomacia: 2, intimidar: 2 } } },
  { id: "enganador", nome: "Enganador", descricao: "+2 em Blefar e Disfarce.", efeito: { pericias: { blefar: 2, disfarce: 2 } } },
  { id: "furtivo", nome: "Furtivo", descricao: "+2 em Arte da Fuga e Furtividade.", efeito: { pericias: { arte_fuga: 2, furtividade: 2 } } },
  { id: "autossuficiente", nome: "Autossuficiente", descricao: "+2 em Cura e Sobrevivência.", efeito: { pericias: { cura: 2, sobrevivencia: 2 } } },
  { id: "maos_leves", nome: "Mãos Leves", descricao: "+2 em Operar Mecanismo e Prestidigitação.", efeito: { pericias: { operar: 2, prestidigitacao: 2 } } },
  { id: "afinidade_magica", nome: "Afinidade Mágica", descricao: "+2 em Identificar Magia e Usar Instrumento Mágico.", efeito: { pericias: { identificar_magia: 2, usar_instrumento: 2 } } },
  { id: "afinidade_animais", nome: "Afinidade com Animais", descricao: "+2 em Adestrar Animais e Cavalgar.", efeito: { pericias: { adestrar: 2, cavalgar: 2 } } },
  { id: "investigativo", nome: "Meticuloso", descricao: "+2 em Avaliação e Linguística.", efeito: { pericias: { avaliacao: 2, linguistica: 2 } } },
];

// Espaços de magia por dia (sem bônus de atributo). Índice = nível da classe; cada linha lista os níveis de magia 1, 2, 3...
// Magias de nível 0 (truques e orações) são à vontade no PF1e e não gastam espaço.
// Um 0 na tabela significa "só recebe espaços se tiver bônus de atributo" (como o paladino no 4º nível).

/** Mago, clérigo, druida, bruxa, xamã: conjuração completa preparada. */
export const TABELA_PREPARADA: number[][] = [
  [],
  [1], [2], [2, 1], [3, 2], [3, 2, 1], [3, 3, 2], [4, 3, 2, 1], [4, 3, 3, 2], [4, 4, 3, 2, 1], [4, 4, 3, 3, 2],
  [4, 4, 4, 3, 2, 1], [4, 4, 4, 3, 3, 2], [4, 4, 4, 4, 3, 2, 1], [4, 4, 4, 4, 3, 3, 2], [4, 4, 4, 4, 4, 3, 2, 1],
  [4, 4, 4, 4, 4, 3, 3, 2], [4, 4, 4, 4, 4, 4, 3, 2, 1], [4, 4, 4, 4, 4, 4, 3, 3, 2], [4, 4, 4, 4, 4, 4, 4, 3, 3], [4, 4, 4, 4, 4, 4, 4, 4, 4],
];

/** Feiticeiro, oráculo, psíquico: conjuração completa espontânea (chega um nível de magia atrasado). */
export const TABELA_ESPONTANEA: number[][] = [
  [],
  [3], [4], [5], [6, 3], [6, 4], [6, 5, 3], [6, 6, 4], [6, 6, 5, 3], [6, 6, 6, 4], [6, 6, 6, 5, 3],
  [6, 6, 6, 6, 4], [6, 6, 6, 6, 5, 3], [6, 6, 6, 6, 6, 4], [6, 6, 6, 6, 6, 5, 3], [6, 6, 6, 6, 6, 6, 4],
  [6, 6, 6, 6, 6, 6, 5, 3], [6, 6, 6, 6, 6, 6, 6, 4], [6, 6, 6, 6, 6, 6, 6, 5, 3], [6, 6, 6, 6, 6, 6, 6, 6, 4], [6, 6, 6, 6, 6, 6, 6, 6, 6],
];

/** Arcanista: prepara como mago, gasta como feiticeiro, com menos espaços. */
export const TABELA_ARCANISTA: number[][] = TABELA_ESPONTANEA.map((linha) => linha.map((v) => ({ 3: 2, 4: 3, 5: 4, 6: 4 })[v] ?? v));

/** Bardo, inquisidor, magus, alquimista e companhia: até magias de 6º nível. */
export const TABELA_SEIS: number[][] = [
  [],
  [1], [2], [3], [3, 1], [4, 2], [4, 3], [4, 3, 1], [4, 4, 2], [5, 4, 3], [5, 4, 3, 1],
  [5, 4, 4, 2], [5, 5, 4, 3], [5, 5, 4, 3, 1], [5, 5, 4, 4, 2], [5, 5, 5, 4, 3],
  [5, 5, 5, 4, 3, 1], [5, 5, 5, 4, 4, 2], [5, 5, 5, 5, 4, 3], [5, 5, 5, 5, 5, 4], [5, 5, 5, 5, 5, 5],
];

/** Paladino, patrulheiro, sangue-furioso, antipaladino, médium: até 4º nível, começando no 4º nível de classe. */
export const TABELA_QUATRO: number[][] = [
  [], [], [], [],
  [0], [1], [1], [1, 0], [1, 1], [2, 1], [2, 1, 0],
  [2, 1, 1], [2, 2, 1], [3, 2, 1, 0], [3, 2, 1, 1], [3, 2, 2, 1],
  [3, 3, 2, 1], [4, 3, 2, 1], [4, 3, 2, 2], [4, 3, 3, 2], [4, 4, 3, 3],
];

// XP acumulado na trilha média (índice = nível)
export const XP_MEDIA = [0, 0, 2000, 5000, 9000, 15000, 23000, 35000, 51000, 75000, 105000, 155000, 220000, 315000, 445000, 635000, 890000, 1300000, 1800000, 2550000, 3600000];

export const ALINHAMENTOS = [
  { id: "lb", nome: "Leal e Bom", descricao: "Cumpre a lei e ainda ajuda a velhinha a atravessar." },
  { id: "nb", nome: "Neutro e Bom", descricao: "Faz o bem sem preencher formulário." },
  { id: "cb", nome: "Caótico e Bom", descricao: "Salva o vilarejo e quebra a taverna no processo." },
  { id: "ln", nome: "Leal e Neutro", descricao: "A regra é a regra, mesmo quando a regra é burra." },
  { id: "n", nome: "Neutro", descricao: "Em cima do muro, e o muro é confortável." },
  { id: "cn", nome: "Caótico e Neutro", descricao: "Livre, imprevisível e péssimo para dividir o saque." },
  { id: "lm", nome: "Leal e Mau", descricao: "Tirano com contrato assinado em três vias." },
  { id: "nm", nome: "Neutro e Mau", descricao: "Egoísta sem frescura." },
  { id: "cm", nome: "Caótico e Mau", descricao: "Quer ver o mundo pegar fogo e trouxe a tocha." },
];

export const DOMINIOS = [
  "Água", "Animal", "Ar", "Artifício", "Bem", "Caos", "Clima", "Comunidade", "Conhecimento", "Cura", "Destruição", "Encanto",
  "Escuridão", "Fogo", "Força", "Glória", "Guerra", "Lei", "Libertação", "Loucura", "Magia", "Mal", "Morte", "Nobreza",
  "Plantas", "Proteção", "Repouso", "Runas", "Sol", "Sorte", "Terra", "Trapaça", "Viagem",
];
