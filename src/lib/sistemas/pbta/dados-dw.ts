import "server-only";

// Dados do Dungeon World (Sage LaTorra e Adam Koebel, Creative Commons BY 3.0).
// Descrições escritas do zero, em português e curtas; os nomes seguem a tradução usual dos movimentos.

export type Movimento = {
  id: string;
  nome: string;
  descricao: string;
  /** atributo rolado (id) quando o movimento pede rolagem */
  rola?: string;
  /** dano extra somado ao dado da classe (ex.: "1d4") */
  danoExtra?: string;
  /** armadura extra fixa */
  armadura?: number;
  /** id do movimento que este substitui (versões maiores dos de 2-5) */
  substitui?: string;
};

export type KitDW = {
  id: string;
  nome: string;
  itens: string[];
  armadura: number;
  moedas: number;
  /** dano fixo somado (armas com +1 de dano) */
  bonusDano?: number;
  municao?: number;
  usos?: number;
};

export type ClasseDW = {
  id: string;
  nome: string;
  descricao: string;
  atributoChave: string;
  pvBase: number;
  dano: number;
  cargaBase: number;
  papel: string;
  /** ordem de prioridade para a matriz 16, 15, 13, 12, 9, 8 */
  ordem: string[];
  alinhamentos: string[];
  racas: string[];
  equipamentoFixo: string[];
  racoes: number;
  kits: KitDW[];
  iniciais: Movimento[];
  avancados25: Movimento[];
  avancados610: Movimento[];
};

export const ALINHAMENTOS = [
  { id: "bom", nome: "Bom" },
  { id: "leal", nome: "Leal" },
  { id: "neutro", nome: "Neutro" },
  { id: "caotico", nome: "Caótico" },
  { id: "mau", nome: "Mau" },
];

/** Objetivo de alinhamento por classe: cumprir marca 1 XP no fim da sessão. */
export const OBJETIVOS: Record<string, Record<string, string>> = {
  bardo: {
    bom: "Use sua arte para ajudar alguém.",
    neutro: "Evite um conflito ou acalme uma situação tensa.",
    caotico: "Incite os outros a uma ação decisiva e imprevisível.",
  },
  clerigo: {
    bom: "Corra perigo para curar alguém.",
    leal: "Faça valer um preceito da sua igreja, mesmo que custe caro.",
    mau: "Machuque alguém para provar a superioridade do seu deus.",
  },
  druida: {
    caotico: "Destrua um símbolo da civilização.",
    bom: "Ajude algo ou alguém a crescer.",
    neutro: "Elimine uma ameaça antinatural.",
  },
  guerreiro: {
    bom: "Defenda quem é mais fraco que você.",
    neutro: "Derrote um adversário digno.",
    mau: "Mate um inimigo indefeso ou que se rendeu.",
  },
  paladino: {
    bom: "Ponha-se em perigo para proteger alguém.",
    leal: "Negue misericórdia a um criminoso ou infiel.",
  },
  patrulheiro: {
    caotico: "Livre alguém de amarras literais ou figuradas.",
    bom: "Arrisque-se para proteger o mundo natural.",
    neutro: "Ajude um animal ou espírito da natureza.",
  },
  ladrao: {
    caotico: "Pule no perigo sem plano nenhum.",
    neutro: "Evite ser detectado ou se infiltre num lugar.",
    mau: "Passe o perigo adiante para outra pessoa.",
  },
  mago: {
    bom: "Use magia para ajudar outra pessoa diretamente.",
    neutro: "Descubra algo sobre um mistério mágico.",
    mau: "Use magia para causar terror e medo.",
  },
};

export const RACAS = [
  { id: "humano", nome: "Humano", descricao: "Curto de vida, longo de ambição e presente em todo lugar onde há confusão.", tracos: ["adaptável", "teimosamente onipresente"] },
  { id: "elfo", nome: "Elfo", descricao: "Antigo, bonito e convencido de que viu tudo isso antes — e provavelmente viu.", tracos: ["sentidos aguçados", "memória de séculos"] },
  { id: "anao", nome: "Anão", descricao: "Pedra, cerveja e rancor guardados com o mesmo carinho.", tracos: ["robusto", "afinidade com pedra"] },
  { id: "halfling", nome: "Halfling", descricao: "Pequeno, pacato e perigosamente subestimado até o bolso ficar vazio.", tracos: ["pequeno", "sortudo"] },
];

/** Movimento racial: depende da combinação classe + raça. */
export const MOVIMENTOS_RACIAIS: Record<string, Record<string, Movimento>> = {
  bardo: {
    elfo: { id: "racial", nome: "Memória Élfica", descricao: "Ao entrar num lugar importante, pergunte ao mestre um fato da história dele." },
    humano: { id: "racial", nome: "Menestrel Bem-Vindo", descricao: "Ao chegar pela primeira vez a um povoado civilizado, alguém que honra a hospitalidade aos artistas te acolhe." },
  },
  clerigo: {
    anao: { id: "racial", nome: "Um com a Pedra", descricao: "Ao Comungar, você também recebe uma prece para falar com a pedra e ouvir o que ela viu." },
    humano: { id: "racial", nome: "Fé Eclética", descricao: "Escolha uma magia de mago; para você ela conta como magia de clérigo." },
  },
  druida: {
    elfo: { id: "racial", nome: "Seiva Antiga", descricao: "As grandes florestas sempre contam como a sua terra, além da que você escolheu." },
    humano: { id: "racial", nome: "Laço do Campo", descricao: "Você sempre pode assumir a forma de qualquer animal doméstico." },
    halfling: { id: "racial", nome: "Canção da Primavera", descricao: "Ao Acampar, você e seus aliados curam +1d6 PV." },
  },
  guerreiro: {
    anao: { id: "racial", nome: "Bebe Como Gente Grande", descricao: "Ao dividir uma bebida com alguém, pode Negociar com CON em vez de CAR." },
    elfo: { id: "racial", nome: "Arma Afinada", descricao: "Escolha um tipo de arma: para você, armas desse tipo sempre são precisas." },
    halfling: { id: "racial", nome: "Tamanho É Documento", descricao: "Ao Desafiar o Perigo usando seu tamanho pequeno a seu favor, +1." },
    humano: { id: "racial", nome: "Mais Uma Vez", descricao: "Uma vez por combate, role de novo uma rolagem de dano (sua ou de outra pessoa)." },
  },
  paladino: {
    humano: { id: "racial", nome: "Olhar da Fé", descricao: "Ao rezar por orientação e perguntar \"o que aqui é maligno?\", o mestre responde com sinceridade." },
  },
  patrulheiro: {
    elfo: { id: "racial", nome: "Trilha Élfica", descricao: "Numa Jornada Perigosa pela natureza, qualquer função que você assumir conta como 10+." },
    humano: { id: "racial", nome: "Estômago de Estrada", descricao: "Ao Acampar numa masmorra ou cidade, você não gasta ração." },
  },
  ladrao: {
    halfling: { id: "racial", nome: "Pontaria Miúda", descricao: "Ataques à distância causam +2 de dano." },
    humano: { id: "racial", nome: "Profissional do Crime", descricao: "Ao Saber das Coisas ou Discernir Realidades sobre atividades criminosas, +1." },
  },
  mago: {
    elfo: { id: "racial", nome: "Magia no Sangue", descricao: "Detectar Magia é um truque para você (não gasta preparo)." },
    humano: { id: "racial", nome: "Curioso Herege", descricao: "Escolha uma magia de clérigo; você a conjura como se fosse de mago." },
  },
};

/** Para combinações que o livro não prevê (a mesa decidiu deixar): movimentos adaptados pela taverna. */
export const MOVIMENTOS_RACIAIS_GENERICOS: Record<string, Movimento> = {
  humano: { id: "racial", nome: "Jeitinho Humano (adaptado)", descricao: "Uma vez por sessão, role +1 num movimento depois de explicar a gambiarra que você está fazendo." },
  elfo: { id: "racial", nome: "Sentidos Élficos (adaptado)", descricao: "Ao Discernir Realidades em meio à natureza, +1." },
  anao: { id: "racial", nome: "Teimosia de Pedra (adaptado)", descricao: "Ao Desafiar o Perigo resistindo a veneno, bebida ou medo, +1." },
  halfling: { id: "racial", nome: "Pés Leves (adaptado)", descricao: "Ao Desafiar o Perigo para passar despercebido, +1." },
};

export const DOMINIOS = [
  { id: "cura", nome: "Cura e restauração", descricao: "Graça: Curar Ferimentos Leves vira prece de graça." },
  { id: "conquista", nome: "Conquista sangrenta", descricao: "Graça: Arma Mágica vira prece de graça." },
  { id: "civilizacao", nome: "Civilização", descricao: "Graça: Bênção vira prece de graça." },
  { id: "conhecimento", nome: "Conhecimento e segredos", descricao: "Graça: Detectar Alinhamento vira prece de graça." },
  { id: "esquecidos", nome: "Os oprimidos e esquecidos", descricao: "Graça: Santuário vira prece de graça." },
  { id: "subterraneo", nome: "O que jaz embaixo", descricao: "Graça: Falar com os Mortos vira prece de graça." },
];

export const PRECES_CLERIGO = [
  "Bênção", "Curar Ferimentos Leves", "Detectar Alinhamento", "Causar Medo", "Arma Mágica", "Santuário", "Falar com os Mortos",
];

export const MAGIAS_MAGO = [
  { id: "alarme", nome: "Alarme", descricao: "Marca uma área; você sabe quando alguém passa." },
  { id: "enfeiticar", nome: "Enfeitiçar Pessoa", descricao: "Alguém passa a te tratar como amigo — até perceber." },
  { id: "espiritos", nome: "Contatar Espíritos", descricao: "Chama um espírito para responder uma pergunta, de má vontade." },
  { id: "detectar", nome: "Detectar Magia", descricao: "Objetos e pessoas mágicos brilham para você." },
  { id: "missil", nome: "Míssil Mágico", descricao: "Projéteis de força que nunca erram: 2d4 de dano." },
  { id: "telepatia", nome: "Telepatia", descricao: "Um elo mental com uma pessoa, para o bem ou para o mal." },
  { id: "invisibilidade", nome: "Invisibilidade", descricao: "Alguém some de vista até atacar ou a magia acabar." },
];

export const AREAS_BARDO = [
  { id: "magia", nome: "Magias e arcanismo" },
  { id: "mortos", nome: "Mortos e mortos-vivos" },
  { id: "historia", nome: "Grandes histórias do mundo conhecido" },
  { id: "bestiario", nome: "Bestiário de criaturas estranhas" },
  { id: "planos", nome: "As esferas planares" },
  { id: "herois", nome: "Lendas de heróis do passado" },
  { id: "deuses", nome: "Deuses e seus servos" },
];

export const TERRAS_DRUIDA = [
  { id: "floresta", nome: "Grandes florestas" },
  { id: "planicie", nome: "Planícies sussurrantes" },
  { id: "deserto", nome: "Ermos profundos" },
  { id: "pantano", nome: "Pântanos fétidos" },
  { id: "gelo", nome: "Gelo sem vida" },
  { id: "colinas", nome: "Colinas ondulantes" },
  { id: "montanhas", nome: "Montanhas altas" },
  { id: "mar", nome: "Mar sem fim" },
];

export const ARMAS_GUERREIRO = [
  { id: "espada", nome: "Espada" },
  { id: "machado", nome: "Machado" },
  { id: "martelo", nome: "Martelo" },
  { id: "lanca", nome: "Lança" },
  { id: "mangual", nome: "Mangual" },
  { id: "punhos", nome: "Punhos" },
];

export const ALCANCES_GUERREIRO = [
  { id: "mao", nome: "Mão" },
  { id: "proximo", nome: "Próximo" },
  { id: "estendido", nome: "Estendido" },
];

/** bonusDano: dano fixo extra; o resto é etiqueta descritiva. */
export const MELHORIAS_GUERREIRO = [
  { id: "ganchos", nome: "Ganchos e espetos", descricao: "+1 de dano, +1 de peso.", bonusDano: 1 },
  { id: "afiada", nome: "Afiada", descricao: "+2 perfurante." },
  { id: "equilibrada", nome: "Perfeitamente equilibrada", descricao: "Ganha a etiqueta preciso." },
  { id: "serrilhada", nome: "Lâmina serrilhada", descricao: "+1 de dano.", bonusDano: 1 },
  { id: "brilha", nome: "Brilha perto de um tipo de criatura", descricao: "Escolha qual; ótima para festas." },
  { id: "enorme", nome: "Enorme", descricao: "Ganha bagunçado e poderoso." },
  { id: "versatil", nome: "Versátil", descricao: "Escolha um alcance adicional." },
  { id: "bem-feita", nome: "Bem-feita", descricao: "−1 de peso." },
];

export const COMPANHEIROS = [
  { id: "lobo", nome: "Lobo" },
  { id: "puma", nome: "Puma" },
  { id: "urso", nome: "Urso" },
  { id: "aguia", nome: "Águia" },
  { id: "cao", nome: "Cão" },
  { id: "falcao", nome: "Falcão" },
  { id: "gato", nome: "Gato" },
  { id: "coruja", nome: "Coruja" },
  { id: "pombo", nome: "Pombo" },
  { id: "rato", nome: "Rato" },
  { id: "mula", nome: "Mula" },
];

export const TREINOS_COMPANHEIRO = [
  { id: "cacar", nome: "Caçar" },
  { id: "procurar", nome: "Procurar" },
  { id: "explorar", nome: "Explorar" },
  { id: "guardar", nome: "Montar guarda" },
  { id: "monstros", nome: "Lutar contra monstros" },
  { id: "truques", nome: "Fazer truques" },
  { id: "trabalho", nome: "Trabalho pesado" },
  { id: "viagem", nome: "Viajar" },
];

export const VENENOS = [
  { id: "tagit", nome: "Óleo de Tagit", descricao: "Aplicado: a vítima cai num sono leve." },
  { id: "erva-sangue", nome: "Erva-sangue", descricao: "Aplicado: os golpes causam +1d4 até a vítima se tratar." },
  { id: "raiz-dourada", nome: "Raiz-dourada", descricao: "Aplicado: a vítima trata você como aliado de confiança, por um tempo." },
  { id: "lagrimas", nome: "Lágrimas de Serpente", descricao: "Tocado: quem te atacar faz o pior de dois dados de dano." },
];

export const BENCAOS_PALADINO = [
  { id: "indomavel", nome: "Invulnerável a um tipo de arma ou ataque" },
  { id: "mentiras", nome: "Sentidos que atravessam mentiras" },
  { id: "voz", nome: "Uma voz que transcende idiomas" },
  { id: "necessidades", nome: "Livre de fome, sede e sono" },
  { id: "pisar", nome: "Passo firme que nada derruba" },
];

export const VOTOS_PALADINO = [
  { id: "honra", nome: "Honra (sem truques nem emboscadas)" },
  { id: "temperanca", nome: "Temperança (nada de excessos)" },
  { id: "piedade", nome: "Piedade (ritos diários sem falta)" },
  { id: "coragem", nome: "Coragem (nunca fugir de um mal)" },
  { id: "verdade", nome: "Verdade (sem mentiras)" },
  { id: "hospitalidade", nome: "Hospitalidade (ajudar quem pedir)" },
];

/** Movimentos básicos e de classe que pedem rolagem: viram as "perícias" do sistema. */
export const MOVIMENTOS_ROLADOS = [
  { id: "desafiar", nome: "Desafiar o Perigo", atributo: "des", descricao: "Agir apesar de uma ameaça. O atributo depende de como você enfrenta: FOR na marra, DES na ligeireza, CON aguentando, INT pensando rápido, SAB com nervos de aço, CAR no charme." },
  { id: "golpear", nome: "Golpear e Retalhar", atributo: "for", descricao: "Atacar em corpo a corpo. 10+: dano e você escapa do contra-ataque (ou +1d6 aceitando o troco). 7-9: dano, e o inimigo te acerta." },
  { id: "disparar", nome: "Disparar", atributo: "des", descricao: "Atacar à distância. 10+: dano. 7-9: dano, mas escolha: se expor, gastar munição ou causar −1d6." },
  { id: "defender", nome: "Defender", atributo: "con", descricao: "Proteger alguém ou algo. Ganha reserva (3 num 10+, 1 num 7-9) para redirecionar ataques, reduzir dano pela metade ou abrir brecha." },
  { id: "saber", nome: "Saber das Coisas", atributo: "int", descricao: "Puxar da memória algo sobre o assunto. 10+: algo útil e interessante. 7-9: só interessante; o útil é com você." },
  { id: "discernir", nome: "Discernir Realidades", atributo: "sab", descricao: "Estudar uma situação. 10+: faça 3 perguntas da lista. 7-9: 1 pergunta. +1 adiante ao agir sobre as respostas." },
  { id: "negociar", nome: "Negociar", atributo: "car", descricao: "Convencer com uma alavanca (algo que o outro quer). 10+: fazem o que você pede com uma promessa. 7-9: exigem garantia concreta antes." },
  { id: "ajudar", nome: "Ajudar ou Atrapalhar", atributo: "", descricao: "Role +Vínculo com a pessoa. 10+: ela ganha +1 ou −2 no teste. 7-9: idem, mas você se expõe ao perigo ou às consequências." },
  { id: "ultimo", nome: "Última Respiração", atributo: "", descricao: "Ao chegar a 0 PV: 2d6 puro. 10+: você escapa. 7-9: a Morte oferece um acordo. 6-: seu tempo acabou." },
  { id: "jornada", nome: "Jornada Perigosa", atributo: "sab", descricao: "Viajar por terra hostil assumindo uma função (desbravador, batedor ou intendente). 10+: a função vai muito bem. 7-9: funciona, com ressalvas." },
  { id: "vigia", nome: "Montar Guarda", atributo: "sab", descricao: "Vigiar o acampamento quando algo se aproxima. 10+: todos acordam prontos e com +1 adiante. 7-9: acordam a tempo, sem bônus." },
  { id: "recrutar", nome: "Recrutar", atributo: "car", descricao: "Procurar contratados num povoado. 10+: gente qualificada à escolha. 7-9: alguém mais ou menos, ou pede mais." },
  { id: "farrear", nome: "Farrear", atributo: "car", descricao: "Gastar 100 moedas em festa ao voltar triunfante. 10+: escolha 3 coisas boas. 7-9: 1. 6-: 1, mas algo dá muito errado." },
  { id: "suprir", nome: "Abastecer-se", atributo: "car", descricao: "Comprar algo raro num lugar que talvez tenha. 10+: acha a preço justo. 7-9: mais caro ou não exatamente o que queria." },
  // movimentos de classe
  { id: "arte_arcana", nome: "Arte Arcana", atributo: "car", descricao: "Bardo: toca para um aliado. 10+: um efeito (cura 1d8, +1d4 adiante, encantamento de mente ou +2 armadura). 7-9: efeito, mas atrai atenção." },
  { id: "expulsar", nome: "Expulsar Mortos-Vivos", atributo: "sab", descricao: "Clérigo: ergue o símbolo sagrado. 7+: mortos-vivos não se aproximam. 10+: os fracos fogem ou se desfazem." },
  { id: "conjurar", nome: "Conjurar Magia", atributo: "int", descricao: "Mago (INT) ou clérigo (SAB). 10+: funciona. 7-9: funciona, mas escolha: atrai atenção, −1 contínuo em conjurar ou a magia é perdida até preparar de novo." },
  { id: "metamorfose", nome: "Metamorfose", atributo: "sab", descricao: "Druida: assume a forma de um animal da sua terra. 10+: 3 de reserva para movimentos da forma. 7-9: 2. 6-: 1 e o mestre faz um movimento." },
  { id: "dobrar", nome: "Dobrar Barras, Erguer Portões", atributo: "for", descricao: "Guerreiro: força bruta contra objetos. 10+: escolha 3 (não demora, sem dano, sem barulho, consegue consertar). 7-9: 2." },
  { id: "impor_maos", nome: "Impor as Mãos", atributo: "car", descricao: "Paladino: toca um ferido. 10+: cura 1d8 ou uma doença. 7-9: cura, mas o dano ou a doença passa para você." },
  { id: "lei", nome: "Eu Sou a Lei", atributo: "car", descricao: "Paladino: dá uma ordem com a autoridade divina. 10+: obedece ou foge. 7-9: o mestre escolhe entre obedecer, recuar ou atacar." },
  { id: "rastrear", nome: "Caçar e Rastrear", atributo: "sab", descricao: "Patrulheiro: segue uma trilha. 7+: segue até mudar o tipo de terreno. 10+: também descobre algo útil sobre a presa." },
  { id: "tiro_certeiro", nome: "Tiro Certeiro", atributo: "des", descricao: "Patrulheiro: dispara contra alvo indefeso ou surpreso mirando olhos, braço ou perna (sem dano, mas efeito)." },
  { id: "armadilhas", nome: "Especialista em Armadilhas", atributo: "des", descricao: "Ladrão: examina uma área perigosa. 10+: 3 de reserva para perguntas sobre armadilhas. 7-9: 1." },
  { id: "truques", nome: "Truques do Ofício", atributo: "des", descricao: "Ladrão: abrir fechaduras, bater carteiras, desarmar armadilhas. 10+: consegue. 7-9: consegue, mas o mestre oferece duas complicações para escolher." },
  { id: "golpe_costas", nome: "Golpe pelas Costas", atributo: "des", descricao: "Ladrão: contra alvo surpreso ou indefeso em corpo a corpo. 10+: escolha 2 (ignora armadura, +1d6 dano, abre brecha, −1 armadura do alvo). 7-9: 1." },
];

export const CLASSES_DW: ClasseDW[] = [
  {
    id: "bardo", nome: "Bardo", descricao: "Canta, encanta e conta a história de como os outros fizeram o trabalho pesado.",
    atributoChave: "car", pvBase: 6, dano: 6, cargaBase: 9, papel: "suporte",
    ordem: ["car", "des", "con", "int", "sab", "for"], alinhamentos: ["bom", "neutro", "caotico"], racas: ["elfo", "humano"],
    equipamentoFixo: ["instrumento (à escolha)", "armadura de couro (1 armadura)"], racoes: 5,
    kits: [
      { id: "duelista", nome: "Duelista: rapieira de duelo e equipamento de aventura", itens: ["rapieira de duelo (próximo, perfurante 1, preciso)", "equipamento de aventura"], armadura: 1, moedas: 0, usos: 5 },
      { id: "arqueiro", nome: "Arqueiro: arco gasto, flechas e espada curta", itens: ["arco gasto (próximo)", "feixe de flechas", "espada curta (próximo)"], armadura: 1, moedas: 0, municao: 3 },
      { id: "boemio", nome: "Boêmio: rapieira, erva de cachimbo halfling e algumas moedas", itens: ["rapieira (próximo, preciso)", "erva de cachimbo halfling"], armadura: 1, moedas: 10 },
    ],
    iniciais: [
      { id: "arte_arcana", nome: "Arte Arcana", rola: "car", descricao: "Ao tecer uma apresentação mágica para um aliado, role +CAR: cura 1d8, +1d4 adiante, mente desperta ou +2 armadura adiante." },
      { id: "saber_bardico", nome: "Saber Bárdico", descricao: "Escolha uma área de conhecimento. Ao topar com algo dela pela primeira vez, faça uma pergunta ao mestre e receba a verdade." },
      { id: "charmoso", nome: "Charmoso e Franco", descricao: "Ao falar com franqueza com alguém, faça uma pergunta ao jogador ou ao mestre sobre o personagem; ele responde com sinceridade e pode perguntar de volta." },
      { id: "porto", nome: "Porto na Tempestade", descricao: "Ao voltar a um lugar civilizado já visitado, diga quem você conhece lá e o que ele te deve." },
    ],
    avancados25: [
      { id: "cancao_cura", nome: "Canção de Cura", descricao: "A cura da Arte Arcana pode vir junto com outro efeito." },
      { id: "cacofonia", nome: "Cacofonia Cruel", descricao: "Arte Arcana também pode dar +2 de dano adiante, não só +1d4." },
      { id: "metal", nome: "Metal Pesado", descricao: "Ao soltar a voz com toda a força, Desafie o Perigo com CAR para empurrar e atordoar quem está perto." },
      { id: "mao_amiga", nome: "Uma Mãozinha dos Amigos", descricao: "Quando você Ajuda alguém com sucesso, também ganha +1 adiante." },
      { id: "aparar", nome: "Aparar do Duelista", descricao: "Num 10+ de Golpear e Retalhar, ganha +1 armadura adiante." },
      { id: "embromacao", nome: "Embromação", descricao: "Num 7+ de Negociar, também ganha +1 adiante com aquela pessoa." },
    ],
    avancados610: [
      { id: "cancao_cura_maior", nome: "Canção de Cura Maior", substitui: "cancao_cura", descricao: "A cura da Arte Arcana passa a ser 2d8." },
      { id: "cacofonia_atroz", nome: "Cacofonia Atroz", substitui: "cacofonia", descricao: "O bônus de dano da Arte Arcana passa a ser +1d4+2." },
      { id: "rosto", nome: "Rosto Inesquecível", descricao: "Ao reencontrar alguém que já conheceu, ganhe +1 adiante contra ou a favor dele." },
      { id: "reputacao", nome: "Reputação", descricao: "Ao chegar a um lugar novo, role +CAR: alguém já ouviu falar de você (para o bem ou para o mal)." },
      { id: "bloqueio", nome: "Bloqueio do Duelista", substitui: "aparar", descricao: "O Aparar do Duelista passa a dar +2 armadura." },
    ],
  },
  {
    id: "clerigo", nome: "Clérigo", descricao: "Fala com um deus que inventou na criação da ficha — e o deus, curiosamente, responde.",
    atributoChave: "sab", pvBase: 8, dano: 6, cargaBase: 10, papel: "suporte",
    ordem: ["sab", "con", "for", "car", "int", "des"], alinhamentos: ["bom", "leal", "mau"], racas: ["anao", "humano"],
    equipamentoFixo: ["símbolo sagrado da sua divindade"], racoes: 5,
    kits: [
      { id: "malha", nome: "Cota de malha e martelo de guerra", itens: ["cota de malha (1 armadura)", "martelo de guerra (próximo)"], armadura: 1, moedas: 0 },
      { id: "escudo", nome: "Escudo, maça e poção de cura", itens: ["escudo (+1 armadura)", "maça (próximo)", "poção de cura"], armadura: 1, moedas: 0 },
      { id: "peregrino", nome: "Peregrino: cajado, ataduras e equipamento de aventura", itens: ["cajado (próximo, duas mãos)", "ataduras", "equipamento de aventura"], armadura: 0, moedas: 10, usos: 5 },
    ],
    iniciais: [
      { id: "divindade", nome: "Divindade", descricao: "Você serve a um deus criado por você: nome, domínio e preceito. O domínio concede uma graça." },
      { id: "orientacao", nome: "Orientação Divina", descricao: "Ao suplicar ao seu deus seguindo o preceito da fé, recebe um conhecimento ou dádiva útil." },
      { id: "expulsar", nome: "Expulsar Mortos-Vivos", rola: "sab", descricao: "Ergue o símbolo sagrado e role +SAB: mortos-vivos mantêm distância; os fracos fogem." },
      { id: "comungar", nome: "Comungar", descricao: "Uma hora de oração prepara preces cujos níveis somam até nível+1. As preces de graça (Luz, Santificar, Orientação) vêm sempre." },
      { id: "conjurar", nome: "Conjurar Magia", rola: "sab", descricao: "Ao invocar uma prece preparada, role +SAB. 7-9: atrai atenção, −1 contínuo ou perde a prece." },
    ],
    avancados25: [
      { id: "escolhido", nome: "Escolhido", descricao: "Uma prece à sua escolha conta como um nível mais baixa para preparar." },
      { id: "sereno", nome: "Sereno", descricao: "Ao conjurar, ignore a penalidade de −1 contínuo de uma prece já ativa." },
      { id: "primeiros_socorros", nome: "Primeiros Socorros", descricao: "Curar Ferimentos Leves vira prece de graça." },
      { id: "intervencao", nome: "Intervenção Divina", descricao: "Ao Comungar, ganhe 1 de reserva para negar todo o dano que um aliado sofreria." },
      { id: "penitente", nome: "Penitente", descricao: "Ao sofrer dano de bom grado pela fé, ganhe +1 adiante em Conjurar Magia." },
      { id: "potencializado", nome: "Potencializado", descricao: "Num 10+ de Conjurar, pode aceitar uma opção de 7-9 para dobrar o efeito ou os alvos." },
    ],
    avancados610: [
      { id: "ungido", nome: "Ungido", substitui: "escolhido", descricao: "Mais uma prece conta como um nível mais baixa." },
      { id: "apoteose", nome: "Apoteose", descricao: "No primeiro Comungar depois deste movimento, ganhe um traço físico do seu deus e o que ele implica." },
      { id: "ceifador", nome: "Ceifador", descricao: "Ao dedicar uma vitória ao seu deus e cuidar dos mortos, ganhe +1 adiante." },
      { id: "protecao_divina", nome: "Proteção Divina", descricao: "Sem armadura nem escudo, você tem 2 de armadura." },
      { id: "socorro_maior", nome: "Socorro Maior", substitui: "primeiros_socorros", descricao: "Curar Ferimentos Moderados também passa a ser de graça." },
    ],
  },
  {
    id: "druida", nome: "Druida", descricao: "Prefere virar urso a ter uma conversa difícil, o que convenhamos é compreensível.",
    atributoChave: "sab", pvBase: 6, dano: 6, cargaBase: 6, papel: "versátil",
    ordem: ["sab", "con", "des", "int", "car", "for"], alinhamentos: ["caotico", "bom", "neutro"], racas: ["elfo", "humano", "halfling"],
    equipamentoFixo: ["lembrança da sua terra"], racoes: 0,
    kits: [
      { id: "couro", nome: "Gibão de peles e cajado-porrete", itens: ["gibão de peles (1 armadura)", "cajado-porrete (próximo)", "equipamento de aventura"], armadura: 1, moedas: 0, usos: 5 },
      { id: "escudo", nome: "Escudo de madeira, lança e ervas", itens: ["escudo de madeira (+1 armadura)", "lança (estendido, arremesso)", "cataplasmas e ervas"], armadura: 1, moedas: 0 },
      { id: "andarilho", nome: "Andarilho: cajado, erva de cachimbo e antitoxinas", itens: ["cajado (próximo, duas mãos)", "erva de cachimbo halfling", "3 antitoxinas"], armadura: 0, moedas: 5 },
    ],
    iniciais: [
      { id: "nascido", nome: "Nascido da Terra", descricao: "Você está ligado a uma terra; pode assumir formas de animais de lá. Um traço físico revela sua origem." },
      { id: "sustentado", nome: "Sustentado pela Natureza", descricao: "Você não precisa comer nem beber. Se um movimento mandar gastar ração, ignore." },
      { id: "lingua", nome: "Língua dos Espíritos", descricao: "Você fala com animais e espíritos da natureza (o que eles respondem é outra história)." },
      { id: "metamorfose", nome: "Metamorfose", rola: "sab", descricao: "Role +SAB para virar um animal da sua terra; gaste a reserva nos movimentos da forma." },
      { id: "essencia", nome: "Essência Estudada", descricao: "Ao estudar um ser vivo com calma, pode adicionar a forma dele às suas opções." },
    ],
    avancados25: [
      { id: "irmao_cacador", nome: "Irmão do Caçador", descricao: "Escolha um movimento inicial do Patrulheiro." },
      { id: "dentes", nome: "Dentes e Garras Rubras", descricao: "Em forma animal, seu dano passa a ser d8." },
      { id: "casca", nome: "Pele de Casca", descricao: "Com os pés na terra viva, você tem +1 armadura." },
      { id: "olhos_tigre", nome: "Olhos do Tigre", descricao: "Marque um animal com barro; você vê pelos olhos dele quando quiser." },
      { id: "sussurros", nome: "Comunhão dos Sussurros", descricao: "Ao passar um tempo quieto num lugar, Discernir Realidades sobre ele com +1." },
      { id: "falador", nome: "Falador das Coisas", descricao: "Você também conversa com objetos feitos à mão, que são péssimos ouvintes." },
    ],
    avancados610: [
      { id: "mudar_pele", nome: "Mudar de Pele", descricao: "Ao assumir uma forma, cure 1d6 PV." },
      { id: "artesao_formas", nome: "Artesão de Formas", descricao: "Pode misturar traços de duas formas numa criatura só." },
      { id: "sem_forma", nome: "Sem Forma Alguma", descricao: "Num 10+ de Metamorfose, ganhe 4 de reserva." },
      { id: "dominio_elemental", nome: "Domínio Elemental", descricao: "Ao pedir ajuda a um espírito elemental, role +SAB: ele age por você, cobrando um preço num 7-9." },
      { id: "equilibrio", nome: "Equilíbrio", descricao: "Ao causar dano, ganhe 1 de equilíbrio; gaste para curar 1d4 de alguém." },
    ],
  },
  {
    id: "guerreiro", nome: "Guerreiro", descricao: "Tem uma arma favorita, um nome para ela e nenhum plano além de usá-la.",
    atributoChave: "for", pvBase: 10, dano: 10, cargaBase: 12, papel: "combatente",
    ordem: ["for", "con", "des", "sab", "car", "int"], alinhamentos: ["bom", "neutro", "mau"], racas: ["anao", "elfo", "halfling", "humano"],
    equipamentoFixo: ["arma característica"], racoes: 5,
    kits: [
      { id: "malha", nome: "Cota de malha, equipamento de aventura e escudo", itens: ["cota de malha (1 armadura)", "equipamento de aventura", "escudo (+1 armadura)"], armadura: 2, moedas: 0, usos: 5 },
      { id: "escamas", nome: "Armadura de escamas e duas poções de cura", itens: ["armadura de escamas (2 armadura, desajeitada)", "2 poções de cura"], armadura: 2, moedas: 0 },
      { id: "mercenario", nome: "Mercenário: cota de malha, antitoxina e moedas", itens: ["cota de malha (1 armadura)", "antitoxina", "cataplasmas e ervas"], armadura: 1, moedas: 22 },
    ],
    iniciais: [
      { id: "dobrar", nome: "Dobrar Barras, Erguer Portões", rola: "for", descricao: "Ao usar força bruta contra um obstáculo inanimado, role +FOR e escolha vantagens (rápido, sem dano, sem barulho, reparável)." },
      { id: "encouracado", nome: "Encouraçado", descricao: "Você ignora a etiqueta desajeitada de qualquer armadura." },
      { id: "arma_caracteristica", nome: "Arma Característica", descricao: "Sua arma tem forma, alcance e duas melhorias escolhidas por você. Ninguém mais a usa direito." },
    ],
    avancados25: [
      { id: "impiedoso", nome: "Impiedoso", danoExtra: "1d4", descricao: "Seu dano ganha +1d4." },
      { id: "pele_ferro", nome: "Pele de Ferro", armadura: 1, descricao: "Você ganha +1 armadura." },
      { id: "heranca", nome: "Herança", descricao: "Ao consultar os espíritos que habitam sua arma, role +SAB: eles contam algo útil." },
      { id: "mestre_armadura", nome: "Mestre da Armadura", descricao: "Ao sofrer dano, pode fazer a armadura absorver tudo; ela perde 1 ponto até ser consertada." },
      { id: "olho_armas", nome: "Olho para Armas", descricao: "Ao avaliar o armamento de um inimigo, pergunte ao mestre um detalhe útil sobre ele." },
      { id: "intimidar", nome: "Ameaça Viva", descricao: "Ao Negociar com ameaça de violência, use FOR em vez de CAR." },
    ],
    avancados610: [
      { id: "sedento", nome: "Sedento de Sangue", substitui: "impiedoso", danoExtra: "1d8", descricao: "Seu dano ganha +1d8 (substitui Impiedoso)." },
      { id: "pele_aco", nome: "Pele de Aço", substitui: "pele_ferro", armadura: 2, descricao: "Você ganha +2 armadura (substitui Pele de Ferro)." },
      { id: "esmagar", nome: "Esmagar!", descricao: "Num 10+ de Golpear, troque o dano extra por quebrar algo do inimigo (arma, armadura, perna)." },
      { id: "superior", nome: "Guerreiro Superior", descricao: "Num 12+ de Golpear e Retalhar, escolha também um efeito extra: o inimigo foge, recua ou cai." },
      { id: "olhos_morte", nome: "Pelos Olhos da Morte", descricao: "Ao entrar em combate, role +SAB: o mestre diz quem morre primeiro." },
    ],
  },
  {
    id: "paladino", nome: "Paladino", descricao: "Armadura brilhante, consciência limpa e a certeza irritante de estar sempre certo.",
    atributoChave: "car", pvBase: 10, dano: 10, cargaBase: 12, papel: "combatente",
    ordem: ["for", "car", "con", "sab", "des", "int"], alinhamentos: ["bom", "leal"], racas: ["humano"],
    equipamentoFixo: ["armadura de escamas (2 armadura)", "símbolo da fé"], racoes: 5,
    kits: [
      { id: "alabarda", nome: "Alabarda", itens: ["alabarda (estendido, +1 dano, duas mãos)"], armadura: 2, moedas: 0, bonusDano: 1 },
      { id: "espada", nome: "Espada longa e escudo", itens: ["espada longa (próximo, +1 dano)", "escudo (+1 armadura)"], armadura: 3, moedas: 0, bonusDano: 1 },
      { id: "cruzado", nome: "Cruzado: espada longa, equipamento de aventura e poção", itens: ["espada longa (próximo, +1 dano)", "equipamento de aventura", "poção de cura"], armadura: 2, moedas: 5, bonusDano: 1, usos: 5 },
    ],
    iniciais: [
      { id: "impor_maos", nome: "Impor as Mãos", rola: "car", descricao: "Ao tocar alguém com fé, role +CAR: cura 1d8 ou uma doença; num 7-9 o mal passa para você." },
      { id: "encouracado", nome: "Encouraçado", descricao: "Você ignora a etiqueta desajeitada de qualquer armadura." },
      { id: "lei", nome: "Eu Sou a Lei", rola: "car", descricao: "Ao dar uma ordem a um PNJ com a autoridade do seu deus, role +CAR." },
      { id: "missao", nome: "Missão", descricao: "Ao jurar uma missão, escolha bênçãos e votos. Enquanto cumprir os votos, as bênçãos valem." },
    ],
    avancados25: [
      { id: "destemido", nome: "Destemido", descricao: "Você ignora efeitos de medo, naturais ou mágicos." },
      { id: "egide", nome: "Égide Sangrenta", descricao: "Ao sofrer dano, pode marcar uma debilidade para ignorá-lo." },
      { id: "golpe_sagrado", nome: "Golpe Sagrado", descricao: "Enquanto em missão, causa +1d4 de dano." },
      { id: "carga", nome: "Avançar!", descricao: "Ao liderar uma carga, os aliados que te seguem ganham +1 adiante." },
      { id: "defensor", nome: "Defensor Firme", descricao: "Ao Defender, ganha +1 de reserva mesmo num 6-." },
      { id: "voz", nome: "Voz da Autoridade", descricao: "Ganhe +1 para Negociar com servos, soldados e qualquer um que siga ordens." },
    ],
    avancados610: [
      { id: "indomavel", nome: "Indomável", descricao: "Ao receber uma debilidade, ganhe +1 adiante contra quem a causou." },
      { id: "juramento", nome: "Juramento Perfeito", descricao: "Sua missão ganha mais uma bênção." },
      { id: "golpe_divino", nome: "Golpe Divino", substitui: "golpe_sagrado", descricao: "Em missão, causa +1d8 de dano." },
      { id: "hospitaleiro", nome: "Hospitaleiro", descricao: "Impor as Mãos cura também você pela mesma quantidade." },
      { id: "aura", nome: "Aura de Coragem", descricao: "Aliados perto de você ignoram o medo e ganham +1 para Desafiar o Perigo contra ele." },
    ],
  },
  {
    id: "patrulheiro", nome: "Patrulheiro", descricao: "Conversa mais com o lobo do que com o grupo, e o lobo é o mais sensato dos dois.",
    atributoChave: "des", pvBase: 8, dano: 8, cargaBase: 11, papel: "especialista",
    ordem: ["des", "sab", "con", "for", "int", "car"], alinhamentos: ["caotico", "bom", "neutro"], racas: ["elfo", "humano"],
    equipamentoFixo: ["armadura de couro (1 armadura)", "feixe de flechas"], racoes: 5,
    kits: [
      { id: "espada", nome: "Arco de caçador e espada curta", itens: ["arco de caçador (próximo, longe)", "espada curta (próximo)", "equipamento de aventura"], armadura: 1, moedas: 0, municao: 3, usos: 5 },
      { id: "lanca", nome: "Arco de caçador e lança", itens: ["arco de caçador (próximo, longe)", "lança (estendido)", "feixe extra de flechas"], armadura: 1, moedas: 0, municao: 6 },
    ],
    iniciais: [
      { id: "rastrear", nome: "Caçar e Rastrear", rola: "sab", descricao: "Ao seguir uma trilha de pistas, role +SAB para não perder a presa (e descobrir algo dela num 10+)." },
      { id: "tiro_certeiro", nome: "Tiro Certeiro", rola: "des", descricao: "Contra alvo indefeso ou surpreso à distância, mire olhos, braço ou perna e role +DES." },
      { id: "companheiro", nome: "Companheiro Animal", descricao: "Você tem um animal leal com ferocidade, astúcia, armadura e instinto, treinado em algumas funções." },
      { id: "comando", nome: "Comando", descricao: "Ao trabalhar junto com o companheiro em algo para o qual ele é treinado, some a astúcia dele ao seu teste." },
    ],
    avancados25: [
      { id: "empatia", nome: "Empatia Selvagem", descricao: "Você fala com animais e os entende." },
      { id: "viajante", nome: "Viajante Experiente", descricao: "Na Jornada Perigosa, desbravador e batedor do grupo contam como 10+." },
      { id: "chamado", nome: "Chamado Selvagem", descricao: "Escolha um movimento inicial do Druida (exceto Metamorfose)." },
      { id: "rajada", nome: "Rajada Precisa", descricao: "Num 7-9 de Disparar, você não precisa escolher a opção ruim." },
      { id: "sigam", nome: "Sigam-me", descricao: "Ao guiar o grupo, todos ganham +1 adiante em Desafiar o Perigo pela trilha." },
      { id: "presa", nome: "Marcar Presa", descricao: "Ao nomear sua presa, ganhe +1 de dano contínuo contra ela." },
    ],
    avancados610: [
      { id: "tiro_sobrenatural", nome: "Tiro Sobrenatural", substitui: "tiro_certeiro", descricao: "Tiro Certeiro funciona até contra alvos atentos." },
      { id: "companheiro_lendario", nome: "Companheiro Lendário", descricao: "Seu companheiro ganha +1 em ferocidade, astúcia e armadura." },
      { id: "rajada_infinita", nome: "Aljava Sem Fundo", descricao: "Num 10+ de Disparar, você nunca gasta munição." },
      { id: "sentido_fera", nome: "Sentido da Fera", descricao: "Você sempre sabe onde seu companheiro está e o que ele sente." },
      { id: "cacador_monstros", nome: "Caçador de Monstros", descricao: "Contra criaturas grandes ou maiores, seu dano ganha +1d4." },
    ],
  },
  {
    id: "ladrao", nome: "Ladrão", descricao: "Diz que é \"especialista em logística de bens alheios\" e jura que a adaga é para cortar queijo.",
    atributoChave: "des", pvBase: 6, dano: 8, cargaBase: 9, papel: "especialista",
    ordem: ["des", "car", "con", "int", "sab", "for"], alinhamentos: ["caotico", "neutro", "mau"], racas: ["halfling", "humano"],
    equipamentoFixo: ["armadura de couro (1 armadura)", "frasco do veneno escolhido"], racoes: 5,
    kits: [
      { id: "adagas", nome: "Adaga, espada curta e 3 adagas de arremesso", itens: ["adaga (mão)", "espada curta (próximo)", "3 adagas de arremesso (arremesso, perto)"], armadura: 1, moedas: 10 },
      { id: "rapieira", nome: "Rapieira e arco esfarrapado com flechas", itens: ["rapieira (próximo, preciso)", "arco esfarrapado (perto)", "feixe de flechas"], armadura: 1, moedas: 10, municao: 3 },
      { id: "gatuno", nome: "Gatuno: adaga, equipamento de aventura e poção", itens: ["adaga (mão)", "equipamento de aventura", "poção de cura"], armadura: 1, moedas: 10, usos: 5 },
    ],
    iniciais: [
      { id: "armadilhas", nome: "Especialista em Armadilhas", rola: "des", descricao: "Ao vasculhar uma área perigosa atrás de armadilhas, role +DES e faça perguntas ao mestre." },
      { id: "truques", nome: "Truques do Ofício", rola: "des", descricao: "Ao abrir fechaduras, bater carteiras ou desarmar armadilhas, role +DES." },
      { id: "golpe_costas", nome: "Golpe pelas Costas", rola: "des", descricao: "Contra alvo surpreso ou indefeso, cause seu dano ou role +DES para efeitos extras." },
      { id: "moral", nome: "Moral Flexível", descricao: "Quando alguém tenta detectar seu alinhamento, você escolhe o que ele descobre." },
      { id: "envenenador", nome: "Envenenador", descricao: "Você domina um veneno: aplica sem risco e prepara novas doses com tempo e ingredientes." },
    ],
    avancados25: [
      { id: "golpe_baixo", nome: "Golpe Baixo", descricao: "Ao usar armas precisas ou de mão, seu dano ganha +1d6 contra quem não te vê." },
      { id: "cauteloso", nome: "Cauteloso", descricao: "Num 7-9 de Especialista em Armadilhas, você ainda ganha 2 de reserva." },
      { id: "mestre_venenos", nome: "Mestre dos Venenos", descricao: "Aprenda mais um veneno e o prepare com o mesmo cuidado." },
      { id: "contatos", nome: "Contatos do Submundo", descricao: "Em qualquer cidade, você conhece alguém do lado errado da lei que te deve um favor." },
      { id: "rota_fuga", nome: "Rota de Fuga", descricao: "Ao estar cercado, diga por onde vai sair e role +DES: num 10+ você some." },
      { id: "dedos", nome: "Dedos Ligeiros", descricao: "Ganha +1 em Truques do Ofício." },
    ],
    avancados610: [
      { id: "golpe_mortal", nome: "Golpe Mortal", substitui: "golpe_baixo", descricao: "O dano extra contra quem não te vê passa a ser +2d6." },
      { id: "sombra", nome: "Sombra", descricao: "No escuro ou em meio à multidão, ninguém te nota até você agir." },
      { id: "planejador", nome: "Planejador", descricao: "Ao planejar um golpe com antecedência, ganhe 3 de reserva para ter preparado exatamente o que precisava." },
      { id: "reputacao_sombria", nome: "Reputação Sombria", descricao: "Ao usar seu nome para ameaçar, Negocie com DES." },
      { id: "envenenador_supremo", nome: "Envenenador Supremo", substitui: "mestre_venenos", descricao: "Seus venenos agem em metade do tempo e você é imune a todos que conhece." },
    ],
  },
  {
    id: "mago", nome: "Mago", descricao: "Leu demais, dormiu de menos e ainda acha que fogo resolve conversa.",
    atributoChave: "int", pvBase: 4, dano: 4, cargaBase: 7, papel: "conjurador",
    ordem: ["int", "con", "des", "sab", "car", "for"], alinhamentos: ["bom", "neutro", "mau"], racas: ["elfo", "humano"],
    equipamentoFixo: ["grimório"], racoes: 5,
    kits: [
      { id: "couro", nome: "Armadura de couro e adaga", itens: ["armadura de couro (1 armadura)", "adaga (mão)", "poção de cura"], armadura: 1, moedas: 0 },
      { id: "livros", nome: "Sacola de livros, cajado e 3 poções de cura", itens: ["sacola de livros", "cajado (próximo, duas mãos)", "3 poções de cura"], armadura: 0, moedas: 0 },
      { id: "erudito", nome: "Erudito: cajado, 3 antitoxinas e moedas", itens: ["cajado (próximo, duas mãos)", "3 antitoxinas"], armadura: 0, moedas: 15 },
    ],
    iniciais: [
      { id: "grimorio", nome: "Grimório", descricao: "Seu livro guarda as magias que você conhece: três de 1º nível no começo e os truques Luz, Servo Invisível e Prestidigitação." },
      { id: "preparar", nome: "Preparar Magias", descricao: "Uma hora com o grimório prepara magias cujos níveis somam até nível+1. Truques vêm de graça." },
      { id: "conjurar", nome: "Conjurar Magia", rola: "int", descricao: "Ao soltar uma magia preparada, role +INT. 7-9: atrai atenção, −1 contínuo ou esquece a magia." },
      { id: "defesa_magica", nome: "Defesa Mágica", descricao: "Encerre uma magia sua ativa para anular um ataque contra você ou um aliado próximo." },
      { id: "ritual", nome: "Ritual", descricao: "Num lugar de poder, desenhe um efeito mágico; o mestre diz o que vai custar (tempo, ingredientes, perigo)." },
    ],
    avancados25: [
      { id: "prodigio", nome: "Prodígio", descricao: "Uma magia à sua escolha conta como um nível mais baixa para preparar." },
      { id: "potencializada", nome: "Magia Potencializada", descricao: "Num 10+ de Conjurar, aceite uma opção de 7-9 para dobrar efeito ou alvos." },
      { id: "contramagica", nome: "Contramágica", descricao: "Ao ser alvo de uma magia, sacrifique uma magia preparada e role +INT para anulá-la." },
      { id: "logico", nome: "Lógico", descricao: "Ao Discernir Realidades por dedução fria, use INT em vez de SAB." },
      { id: "guarda_arcana", nome: "Guarda Arcana", descricao: "Enquanto tiver ao menos uma magia preparada, aliados próximos ganham +1 armadura." },
      { id: "sabe_tudo", nome: "Enciclopédia Ambulante", descricao: "Num 10+ de Saber das Coisas, faça também uma pergunta extra ao mestre." },
    ],
    avancados610: [
      { id: "mestre", nome: "Mestre Arcano", substitui: "prodigio", descricao: "Mais uma magia conta como um nível mais baixa." },
      { id: "guarda_maior", nome: "Guarda Arcana Maior", substitui: "guarda_arcana", descricao: "A Guarda Arcana passa a dar +2 armadura." },
      { id: "persistente", nome: "Feitiço Persistente", descricao: "Uma magia contínua não te dá −1 enquanto dura." },
      { id: "contramagica_maior", nome: "Contramágica Superior", substitui: "contramagica", descricao: "A Contramágica funciona também em magias contra aliados próximos." },
      { id: "fonte", nome: "Fonte de Poder", descricao: "Uma vez por dia, conjure uma magia sem gastá-la nem rolar: conta como 10+." },
    ],
  },
];
