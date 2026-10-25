// Eras de jogo (o "ancestralidade" deste sistema): mudam perícias disponíveis, valores-base, dinheiro e o kit.

export type EraD100 = {
  id: string;
  nome: string;
  descricao: string;
  tracos: string[];
  /** perícias que ainda não existem nesta era (valor 0, não recebem pontos) */
  anacronicas: string[];
  /** valores-base diferentes do padrão */
  bases: Record<string, number>;
  /** dinheiro inicial = Nível de Crédito × este multiplicador */
  multDinheiro: number;
  kit: string[];
};

const SEM_TECNOLOGIA = ["eletronica", "usarComputadores", "operarMaquinario", "armasPesadas"];

export const ERAS: EraD100[] = [
  {
    id: "anos20", nome: "Anos 1920", descricao: "Jazz, gim de banheira e cultos em porões. O clássico do horror cósmico.",
    tracos: ["Lei Seca e bares clandestinos", "telefone de operadora", "viagens de navio e trem"],
    anacronicas: ["eletronica", "usarComputadores"], bases: {}, multDinheiro: 2,
    kit: ["lanterna elétrica", "caderno de notas", "cigarreira"],
  },
  {
    id: "anos30", nome: "Anos 1930", descricao: "Grande Depressão: ninguém tem dinheiro, mas todo mundo tem segredos.",
    tracos: ["crise econômica e filas de sopa", "rádio em toda sala", "expedições a lugares remotos"],
    anacronicas: ["eletronica", "usarComputadores"], bases: {}, multDinheiro: 1.5,
    kit: ["lanterna elétrica", "jornal velho com uma manchete estranha", "caderno de notas"],
  },
  {
    id: "vitoriana", nome: "Era Vitoriana (1890)", descricao: "Névoa, lampiões a gás e cavalheiros que fingem não ver o que viram.",
    tracos: ["iluminação a gás", "telégrafo e cartas", "carruagens e trens a vapor"],
    anacronicas: [...SEM_TECNOLOGIA], bases: { cavalgar: 15, dirigir: 10 }, multDinheiro: 1,
    kit: ["lampião", "relógio de bolso", "caderno de couro"],
  },
  {
    id: "oeste", nome: "Velho Oeste (1875)", descricao: "Poeira, revólveres e minas abandonadas que não estavam tão abandonadas.",
    tracos: ["cidades de fronteira", "ferrovia em construção", "lei de quem saca primeiro"],
    anacronicas: [...SEM_TECNOLOGIA, "psicanalise", "pilotar"], bases: { cavalgar: 25, rifles: 30, pistolas: 25, sobrevivencia: 15 }, multDinheiro: 1,
    kit: ["lampião", "cantil", "chapéu que já viu coisa demais"],
  },
  {
    id: "colonial", nome: "Era Colonial (1750)", descricao: "Vilas isoladas, florestas sem fim e julgamentos de bruxaria que às vezes acertavam.",
    tracos: ["vilas isoladas", "superstição em toda esquina", "viagens a cavalo ou a pé"],
    anacronicas: [...SEM_TECNOLOGIA, "reparosEletricos", "psicanalise", "pilotar", "dirigir"], bases: { cavalgar: 20, sobrevivencia: 15, natureza: 15 }, multDinheiro: 0.5,
    kit: ["lampião a óleo", "pena e tinteiro", "pederneira"],
  },
  {
    id: "medieval", nome: "Idade das Trevas (século X)", descricao: "Mosteiros, florestas escuras e nenhuma explicação científica para nada.",
    tracos: ["poucos sabem ler", "fé como única ciência", "estradas perigosas"],
    anacronicas: [...SEM_TECNOLOGIA, "reparosEletricos", "psicanalise", "pilotar", "dirigir", "pistolas", "rifles", "explosivos", "hipnose"],
    bases: { cavalgar: 20, arco: 25, lutarArmas: 25, sobrevivencia: 15 }, multDinheiro: 0.2,
    kit: ["tocha", "pederneira", "rosário de contas de osso"],
  },
  {
    id: "guerra", nome: "Segunda Guerra (1940)", descricao: "O mundo em chamas e certos regimes fazendo pesquisas que nem o diabo aprovaria.",
    tracos: ["racionamento e blecautes", "espiões em toda parte", "armas e veículos militares"],
    anacronicas: ["usarComputadores"], bases: { pistolas: 25 }, multDinheiro: 3,
    kit: ["lanterna militar", "cartão de racionamento", "caderno de notas"],
  },
  {
    id: "anos50", nome: "Guerra Fria (1950)", descricao: "Paranoia atômica, discos voadores no jornal e subúrbios perfeitos demais.",
    tracos: ["medo nuclear", "televisão em preto e branco", "agências secretas"],
    anacronicas: ["usarComputadores"], bases: { eletronica: 5 }, multDinheiro: 5,
    kit: ["lanterna", "rádio de pilha", "caderno de notas"],
  },
  {
    id: "anos70", nome: "Década de 1970", descricao: "Contracultura, comunas no campo e gurus que prometem iluminação (e entregam outra coisa).",
    tracos: ["seitas e comunas", "fitas cassete e orelhão", "computadores do tamanho de salas"],
    anacronicas: [], bases: { usarComputadores: 1, eletronica: 5 }, multDinheiro: 15,
    kit: ["lanterna", "gravador de fita cassete", "fichas de orelhão"],
  },
  {
    id: "anos90", nome: "Década de 1990", descricao: "Internet discada, locadoras de vídeo e fitas que ninguém deveria assistir.",
    tracos: ["internet discada", "pager e telefone fixo", "locadoras de vídeo"],
    anacronicas: [], bases: { usarComputadores: 10, eletronica: 5 }, multDinheiro: 40,
    kit: ["lanterna", "pager", "câmera de vídeo VHS"],
  },
  {
    id: "atual", nome: "Tempos Atuais", descricao: "Todo mundo filma tudo, ninguém acredita em nada e o algoritmo sabe demais.",
    tracos: ["celular e internet em todo lugar", "câmeras de segurança", "desinformação como paisagem"],
    anacronicas: [], bases: { usarComputadores: 20, eletronica: 5, dirigir: 25, cavalgar: 1 }, multDinheiro: 100,
    kit: ["celular com 12% de bateria", "carregador que não serve em nada", "lanterna do celular"],
  },
  {
    id: "futuro", nome: "Futuro Próximo (2050)", descricao: "Implantes, megacorporações e uma rede que às vezes responde sozinha.",
    tracos: ["implantes e realidade aumentada", "megacorporações", "vigilância total"],
    anacronicas: [], bases: { usarComputadores: 30, eletronica: 10, dirigir: 10, cavalgar: 1 }, multDinheiro: 300,
    kit: ["implante de comunicação com anúncios", "lanterna de LED", "credencial corporativa"],
  },
];
