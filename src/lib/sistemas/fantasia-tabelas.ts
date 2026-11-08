import { BESTIARIO_DND5E } from "./dnd5e/bestiario";
import { BESTIARIO_OSR } from "./osr/bestiario";
import { BESTIARIO_PF2E } from "./pf2e/bestiario";
import { TABELAS_PF2E } from "./pf2e/tabelas";
import { BESTIARIO_VTM5 } from "./vtm5/bestiario";
import { TABELAS_VTM5 } from "./vtm5/tabelas";

// Tabelas aleatórias que o mestre sorteia durante o jogo (ferramenta sortear_tabela) e os tipos comuns do bestiário.
// Aqui: as de fantasia genérica (D&D, OSR, PF1e e o fundo do PF2e), as pequenas de d100, Fate e Dungeon World e, no fim,
// o catálogo CONSULTAS (bestiário, tabelas e rótulos de cada sistema), que o mestre lê sem saber que sistema é.
// Tudo escrito por nós: são ideias de mesa, não texto de livro. As do Vampiro e as próprias do PF2e moram na pasta do sistema.

/** Um grupo de entradas de uma tabela: um clã, uma década, uma cidade, uma faixa de nível. */
export type GrupoTabela = {
  /** chave curta aceita no filtro ("sao_paulo", "1980", "3-4") */
  chave: string;
  /** nome legível, também aceito no filtro */
  rotulo?: string;
  /** faixa numérica (nível ou ano) que o grupo cobre, para filtros como "3" ou "1987" */
  de?: number;
  ate?: number;
  entradas: string[];
};

export type Tabela = {
  /** id que o mestre passa em `tabela` */
  id: string;
  nome: string;
  /** o que o filtro escolhe ("década", "clã", "cidade", "nível"); sem isto a tabela tem um grupo só */
  filtro?: string;
  /** sem filtro, a tabela recusa e pede um (encontros por nível não fazem sentido misturados) */
  filtroObrigatorio?: boolean;
  /** o filtro é um ano: "80" vira 1980, "anos 2000" vira 2000 */
  ano?: boolean;
  grupos: GrupoTabela[];
  /** se presente, cada resultado ganha uma entrada desta lista no fim (sobrenome, ofício...) */
  sufixos?: string[];
};

/** Um bloco do bestiário, em palavras próprias. Os rótulos de nível e de conhecimento dependem do sistema. */
export type Criatura = {
  nome: string;
  /** outros nomes pelos quais o mestre pode pedir ("ogro" acha "Ogro brutamontes") */
  apelidos?: string[];
  /** PF2e: nível da criatura; D&D: ND (0.125, 0.25, 0.5, 1...); OSR: DV; Vampiro: ameaça de 1 a 5 */
  nivel: number;
  /** humanoide, besta, morto-vivo, aberração... (o filtro `tipo` da ferramenta) */
  tipo: string;
  /** CA (fantasia) ou parada de defesa (Vampiro) */
  defesa: number;
  /** PV (fantasia) ou Saúde (Vampiro) */
  pv: number;
  /** salvamentos, Percepção, moral, Força de Vontade: os números de apoio numa linha */
  apoio?: string;
  /** ataques; no PF2e com o custo em ações (◆, ◆◆, ◆◆◆, ↺) */
  ataques: string;
  habilidade: string;
  fraqueza: string;
  tatica: string;
  /** o que um teste de conhecimento (Recordar Conhecimento, Arcanismo, Ocultismo...) revela */
  saber: string;
  /** como foge, se rende ou negocia */
  fuga?: string;
};

const g = (entradas: string[]): GrupoTabela[] => [{ chave: "geral", entradas }];

/** Tabelas de fantasia valem para D&D, OSR, PF1e e completam as do PF2e. Encontros citam nomes do bestiário. */
export const TABELAS_FANTASIA: Tabela[] = [
  {
    id: "rumor",
    nome: "Rumor de taverna",
    grupos: g([
      "O moleiro jura que a roda do moinho gira sozinha nas noites sem vento, e para quando alguém chega perto.",
      "Uma caravana de sal sumiu na estrada do desfiladeiro; só voltaram os bois, calmos demais.",
      "O novo coletor de impostos não come nem bebe em público. Ninguém nunca viu ele piscar.",
      "Tem ouro velho no fundo do poço seco da vila abandonada, mas quem desce volta sem voz.",
      "A guilda dos ferreiros está comprando todo o carvão da região. Para quê, ninguém diz.",
      "Um bardo foi expulso da cidade por cantar uma música sobre a filha do barão. A música era verdade.",
      "Os lobos estão evitando a floresta do norte. Os caçadores dizem que é pior do que lobo.",
      "O templo recebeu uma doação enorme de alguém que assinou só com uma meia-lua.",
      "A ponte velha vai cair na próxima cheia, e o conselho já gastou o dinheiro do conserto.",
      "Um anão está pagando bem por qualquer mapa de minas fechadas há mais de cem anos.",
      "A bruxa do pântano curou o filho do taverneiro. Agora ela quer o primeiro dente dele.",
      "Soldados desertores estão cobrando pedágio na estrada real, de uniforme e tudo.",
      "O sino da capela tocou três vezes à meia-noite. Ninguém estava na torre.",
      "Viram luzes azuis nas ruínas do forte, e as vacas da fazenda vizinha deram leite azedo.",
      "Um mercador estrangeiro vende mapas do tesouro baratos. Um deles era verdadeiro.",
      "A herdeira da casa nobre fugiu com um cavalariço, ou pelo menos é o que a família quer que se pense.",
      "Os ratos sumiram da cidade numa noite só. Os gatos estão nervosos.",
      "Pescadores puxaram uma estátua de bronze do lago. Ela estava quente.",
    ]),
  },
  {
    id: "encontro",
    nome: "Encontro na estrada ou masmorra",
    filtro: "nível do grupo",
    filtroObrigatorio: true,
    grupos: [
      {
        chave: "1-2",
        rotulo: "nível 1 a 2",
        de: 1,
        ate: 2,
        entradas: [
          "1d4+2 goblins armando uma emboscada mal feita atrás de uma carroça tombada",
          "2 lobos famintos seguindo o grupo à distância, esperando alguém ficar para trás",
          "1d6 bandidos cobrando pedágio numa ponte; o chefe prefere moedas a sangue",
          "3 esqueletos guardando uma cripta aberta pela chuva",
          "um enxame de ratos saindo de um porão inundado",
          "2 kobolds montando uma armadilha de rede, distraídos discutindo",
          "uma aranha gigante no teto do corredor, entre teias com moedas presas",
          "4 zumbis lentos arrastando os pés numa aldeia abandonada",
          "um javali enfurecido que já derrubou um caçador",
          "um mercador ferido pedindo ajuda; os goblins que o atacaram ainda estão por perto",
          "um orc batedor sozinho, que corre para avisar o bando se vir o grupo",
          "um cão de caça perdido, com uma coleira de casa nobre",
        ],
      },
      {
        chave: "3-4",
        rotulo: "nível 3 a 4",
        de: 3,
        ate: 4,
        entradas: [
          "um ogro cobrando comida dos viajantes, sentado no meio da estrada",
          "1d4+1 orcs guerreiros voltando de um saque, carregados e cansados",
          "um carniçal de cemitério e 1d4 zumbis na saída da cripta",
          "um bando de 1d6 gnolls caçando com uma hiena domesticada",
          "um urso-coruja defendendo o ninho numa clareira",
          "um lobo atroz liderando três lobos comuns",
          "uma harpia cantando no alto das pedras, chamando quem passa para a beira do penhasco",
          "um cubo gelatinoso parado no fim de um corredor limpo demais",
          "um bugbear emboscando do alto de uma árvore, sozinho e paciente",
          "cultistas com um capitão-de-culto preparando um ritual na clareira",
          "uma múmia menor acordando numa câmara selada que o grupo acabou de abrir",
          "um bando de mercenários disfarçados de peregrinos",
        ],
      },
      {
        chave: "5-8",
        rotulo: "nível 5 a 8",
        de: 5,
        ate: 8,
        entradas: [
          "um troll sob a ponte, regenerando de uma luta anterior",
          "uma mantícora rondando o vale, atirando espinhos de cima",
          "um basilisco no fundo de uma galeria cheia de estátuas de aventureiros",
          "um gigante das colinas jogando pedras numa caravana",
          "um bando de ogros com um líder mais esperto que os outros",
          "um elemental de terra acordado por mineiros gananciosos",
          "um necromante e seus mortos-vivos tomando um vilarejo",
          "um wyvern caçando gado nas pastagens altas",
          "uma quimera disputando território com um bando de orcs",
          "um vampiro jovem tentando se passar por nobre na estalagem",
          "um golem de carne descontrolado, fugido de um laboratório",
          "uma mantícora e seu domador goblin, cobrando tributo",
        ],
      },
      {
        chave: "9+",
        rotulo: "nível 9 em diante",
        de: 9,
        ate: 30,
        entradas: [
          "um dragão adulto que quer conversar antes de decidir se come",
          "um gigante do gelo liderando um ataque a uma fortaleza",
          "um lich menor testando um ritual em um vilarejo inteiro",
          "um ninho de wyverns sob o comando de um gigante das tempestades",
          "um demônio invocado por engano, preso num círculo que está rachando",
          "um aboleth num lago subterrâneo, com escravos de mente quebrada na margem",
          "um exército de mortos-vivos marchando sem pressa",
          "um golem de ferro guardando o tesouro de um império caído",
          "um vampiro ancião que oferece um acordo",
          "uma hidra no pântano onde ficam as ruínas do templo",
          "um troll de guerra com armadura e uma tropa de orcs",
          "um sacerdote de um deus esquecido com guardas fanáticos",
        ],
      },
    ],
  },
  {
    id: "armadilha",
    nome: "Armadilha",
    grupos: g([
      "Placa de pressão que solta dardos das paredes (veneno fraco); o rastro de dardos velhos no chão denuncia.",
      "Fosso escondido sob lona e pó, 3 m, com estacas no fundo; o chão soa oco.",
      "Lâmina de pêndulo atravessando o corredor quando a terceira laje é pisada.",
      "Porta falsa: a maçaneta dispara uma agulha envenenada; a porta de verdade está na parede ao lado.",
      "Teto que desce devagar numa sala que tranca; a alavanca está atrás de um tijolo solto.",
      "Runas no chão que explodem em fogo quando alguém sem o símbolo do templo passa.",
      "Fio de tropeço que derruba um vaso de óleo sobre tochas acesas.",
      "Escada que vira rampa lisa e despeja tudo num poço d'água gelada.",
      "Baú com fundo falso que libera gás do sono; o tesouro de verdade está no fundo falso.",
      "Estátua cujos olhos seguem quem passa e disparam um raio paralisante na segunda volta.",
      "Corredor com eco proposital: falar alto acorda o que dorme no fim dele.",
      "Rede presa no teto, com sino que chama a guarda.",
      "Piso de areia movediça numa câmara de pedra, coberto por tábuas podres.",
      "Espelho que prende o reflexo de quem olha por tempo demais (fica desajeitado até devolver).",
      "Grade que cai atrás do grupo e a sala começa a encher de água pelos ralos.",
      "Moeda de ouro solta no chão, presa a um gatilho que solta uma pedra rolante.",
    ]),
  },
  {
    id: "tesouro",
    nome: "Tesouro",
    filtro: "nível do grupo",
    filtroObrigatorio: true,
    grupos: [
      {
        chave: "1-4",
        rotulo: "nível 1 a 4",
        de: 1,
        ate: 4,
        entradas: [
          "bolsa com moedas de prata e um dente de ouro",
          "adaga bem feita com cabo de osso entalhado",
          "duas poções de cura menores em frascos de cores diferentes",
          "mapa rasgado de uma mina perto dali",
          "anel de prata com um brasão de família caída (vale mais para a família)",
          "pergaminho com uma magia simples de 1º círculo",
          "sacola de especiarias raras que um mercador compraria bem",
          "capa de viagem forrada que nunca molha",
          "estatueta de jade de um deus menor",
          "chave grande de ferro sem fechadura conhecida",
          "escudo com um emblema de ordem de cavaleiros extinta",
          "carta de crédito de um banqueiro, ainda válida",
        ],
      },
      {
        chave: "5-10",
        rotulo: "nível 5 a 10",
        de: 5,
        ate: 10,
        entradas: [
          "arma +1 com nome gravado e uma história",
          "baú com centenas de peças de ouro e uma gema grande",
          "varinha com algumas cargas de uma magia de ataque",
          "armadura leve encantada que abafa os passos",
          "manual de um mestre artesão que ensina uma técnica perdida",
          "coroa de prata de um rei menor, procurada pelos herdeiros",
          "três poções diferentes, uma delas sem rótulo",
          "botas que deixam andar sobre a lama sem afundar",
          "amuleto que esquenta quando mortos-vivos se aproximam",
          "escritura de uma torre abandonada (com o que mora nela)",
          "tapeçaria valiosa, pesada e difícil de carregar",
          "ovo de criatura mágica ainda morno",
        ],
      },
      {
        chave: "11+",
        rotulo: "nível 11 em diante",
        de: 11,
        ate: 30,
        entradas: [
          "arma +2 que fala e tem opiniões",
          "cajado de um arquimago com uma magia poderosa presa dentro",
          "tesouro de dragão: moedas de vários impérios, gemas e um objeto amaldiçoado no meio",
          "anel que guarda uma magia para ser lançada depois",
          "mapa estelar que aponta para outro plano",
          "armadura de placas de um herói lendário, ainda com o brasão",
          "tomo proibido que ensina, e cobra",
          "trono de pedra com uma coroa presa a ele por magia",
          "frasco com uma gota de sangue de deus",
          "chave de um cofre real de outro reino",
          "capa que deixa ficar invisível por alguns minutos por dia",
          "o coração cristalizado de um elemental, ainda pulsando",
        ],
      },
    ],
  },
  {
    id: "vila",
    nome: "Nome de vila ou estalagem",
    filtro: "vila ou estalagem",
    grupos: [
      {
        chave: "vila",
        rotulo: "vila",
        entradas: [
          "Vau do Corvo", "Pedra Torta", "Brejo das Velas", "Três Moinhos", "Ponte Quebrada", "Colina do Sal", "Pinheiral Velho", "Fonte Seca",
          "Lagoa Funda", "Encruzilhada do Enforcado", "Campo dos Sinos", "Vale Cinzento", "Porto da Névoa", "Serra Alta", "Monte do Lobo", "Ribeira Mansa",
        ],
      },
      {
        chave: "estalagem",
        rotulo: "estalagem",
        entradas: [
          "O Javali Caolho", "A Caneca Rachada", "O Último Lampião", "A Bota do Gigante", "O Ganso Bêbado", "A Ferradura de Prata", "O Corvo Sóbrio",
          "A Panela Furada", "O Descanso do Andarilho", "A Lanterna Vermelha", "O Carneiro Teimoso", "A Coroa de Palha", "O Barril sem Fundo", "A Sereia Seca",
        ],
      },
    ],
  },
  {
    id: "clima",
    nome: "Clima da viagem",
    grupos: g([
      "Céu limpo e frio; a geada cobre as barracas de manhã.",
      "Garoa fina o dia inteiro: roupas pesadas, fogueira difícil.",
      "Tempestade com raios: abrigo ou risco de queda de árvore.",
      "Neblina espessa até o meio-dia; fácil se perder, fácil ser emboscado.",
      "Calor abafado; água vira prioridade.",
      "Vento forte do norte que apaga tochas e leva sons para longe.",
      "Chuva de granizo curta e violenta.",
      "Dia bonito demais: tudo que caça sai para caçar.",
      "Nevasca leve nas partes altas; trilha escondida.",
      "Lua cheia e céu aberto: noite clara para viajar e para ser visto.",
      "Cheia repentina no rio: o vau ficou perigoso.",
      "Tempo seco e poeira; animais nervosos.",
    ]),
  },
  {
    id: "npc",
    nome: "Peculiaridade de NPC",
    grupos: g([
      "fala com o próprio cavalo como se fosse sócio",
      "coleciona botões de gente que conheceu",
      "nunca senta de costas para a porta",
      "conta tudo em moedas, até a idade",
      "ri fora de hora quando está com medo",
      "tem uma cicatriz que muda de história a cada vez",
      "deve dinheiro a metade da cidade e favores à outra metade",
      "assobia a mesma música o tempo todo",
      "é educado demais, até com quem ameaça",
      "esconde que não sabe ler",
      "jura que já foi nobre",
      "come sempre de pé",
      "reza para um deus que ninguém conhece",
      "acha que o grupo é outra pessoa e não desmente",
      "tem um filho no lado errado da lei",
      "vende informação, e a primeira é sempre de graça",
    ]),
  },
];

/** d100 (horror investigativo). Nomes de tomos e cultos são inventados. */
export const TABELAS_D100: Tabela[] = [
  {
    id: "tomo",
    nome: "Tomo ou documento estranho",
    grupos: g([
      "Diário de um engenheiro de faróis com páginas escritas por outra mão depois da data da morte dele.",
      "Caderno de receitas de uma avó com uma receita que não é de comida.",
      "Livro de orações em latim com um capítulo a mais, colado com cera.",
      "Atlas de 1890 que mostra uma ilha que não existe no litoral.",
      "Partitura que deixa quem a toca com febre por três dias.",
      "Relatório policial arquivado sobre um desaparecimento coletivo numa fazenda.",
      "Tratado de astronomia com anotações sobre uma estrela que se move.",
      "Cartas de amor que descrevem a pessoa amada com detalhes impossíveis.",
      "Manual de mineração com um mapa de túneis mais fundos que a mina.",
      "Folhetos de uma seita que se apresenta como clube de leitura.",
      "Prontuário de um sanatório com o nome de um investigador na capa.",
      "Rolo de filme sem título que mostra o mesmo corredor por horas.",
      "Livro-caixa de um armazém com compras de sal, giz e velas pretas em quantidade absurda.",
      "Bíblia de família com uma árvore genealógica que termina no ano que vem.",
      "Tese de antropologia recusada pela banca por \"inventar\" um ritual que depois aconteceu.",
      "Fragmento de pergaminho numa língua que muda quando ninguém olha.",
    ]),
  },
  {
    id: "cultista",
    nome: "Cultista",
    grupos: g([
      "farmacêutico gentil que guarda o pó certo para cada ritual",
      "delegada que arquiva as denúncias que chegam perto demais",
      "estudante de arqueologia que encontrou o que procurava e mudou",
      "pescador velho que fala com o mar e às vezes recebe resposta",
      "herdeira de uma família que paga o culto há gerações",
      "padre que perdeu a fé no seu deus e achou outro",
      "zelador do museu com a chave de todas as salas",
      "professora de piano que ensina as crianças uma melodia específica",
      "médico do interior que faz partos à noite, sempre com testemunhas estranhas",
      "jornalista que publica só o que o culto quer que se espalhe",
      "comerciante de antiguidades que compra tudo de uma certa região",
      "menino de recados que viu demais e foi recrutado em vez de silenciado",
    ]),
  },
  {
    id: "insanidade",
    nome: "Sintoma de insanidade",
    grupos: g([
      "conta as coisas em voz alta e precisa terminar a conta",
      "não consegue ficar em sala sem janela",
      "ouve o próprio nome sussurrado quando está sozinho",
      "lava as mãos até sangrar",
      "acredita que um colega foi trocado por uma cópia",
      "riso nervoso que não para na hora errada",
      "não come nada que venha do mar",
      "escreve sem perceber o mesmo símbolo em papéis e paredes",
      "paralisa diante de portas fechadas",
      "fala com alguém que só ele vê",
      "insônia: dorme duas horas por noite e fica irritadiço",
      "esquece os últimos minutos depois de cada susto",
      "precisa de luz acesa sempre, até de dia",
      "acha que está sendo seguido, e às vezes está",
      "tremores nas mãos que pioram com estresse",
      "fuga: sai andando sem rumo e acorda longe",
    ]),
  },
  {
    id: "objeto",
    nome: "Objeto estranho",
    grupos: g([
      "relógio de bolso que adianta uma hora perto de certos lugares",
      "estatueta de pedra verde, úmida ao toque mesmo no sol",
      "fotografia de família com uma pessoa a mais a cada vez que é vista",
      "chave de bronze quente, com dentes que não servem em fechadura humana",
      "concha que, encostada no ouvido, sussurra direções",
      "boneca de pano com cabelo humano verdadeiro",
      "pedaço de meteorito que atrai bússolas",
      "máscara de madeira que deixa quem usa ver no escuro, e ser visto por outras coisas",
      "lanterna que não acende com fogo comum",
      "faca ritual de obsidiana embrulhada em jornal de 1922",
      "frasco com um líquido que se move contra a gravidade",
      "disco de vinil que toca uma voz pedindo ajuda no fim do lado B",
      "anel com um olho pintado que parece piscar",
      "mapa desenhado em pele, com um X que muda de lugar",
      "dente enorme, grande demais para qualquer animal conhecido",
      "caixa de música que toca sozinha às 3h17",
    ]),
  },
  {
    id: "nome",
    nome: "Nome de NPC (anos 1920)",
    grupos: g([
      "Abelardo", "Iracema", "Severino", "Zulmira", "Teodoro", "Albertina", "Custódio", "Ernestina", "Gumercindo", "Hermínia",
      "Libório", "Adelaide", "Olegário", "Firmina", "Anselmo", "Clotilde",
    ]),
    sufixos: ["Bittencourt", "Paranhos", "Mascarenhas", "Coutinho", "Valadares", "Junqueira", "Sampaio", "Albuquerque", "Leme", "Freitas", "Guimarães", "Peixoto"],
  },
];

/** Fate (Acelerado): complicações para forçar Aspectos e nomes de NPC. */
export const TABELAS_FATE: Tabela[] = [
  {
    id: "complicacao",
    nome: "Complicação (para forçar um Aspecto)",
    grupos: g([
      "Um aliado aparece na pior hora pedindo um favor que não dá para negar.",
      "O plano funciona, mas alguém importante viu tudo.",
      "O equipamento falha exatamente quando mais precisa.",
      "Uma velha promessa volta para ser cobrada agora.",
      "O inimigo sabe de um detalhe pessoal e usa sem dó.",
      "A rota de fuga está bloqueada por inocentes.",
      "A pressa faz deixar para trás algo valioso.",
      "Um rival chega primeiro e quer negociar.",
      "O tempo acaba: o relógio da cena avança um passo.",
      "A verdade sobre um aliado vem à tona no meio da ação.",
      "O orgulho fala mais alto e provoca uma briga desnecessária.",
      "Uma ferida antiga dói e atrasa o movimento.",
      "O dinheiro some, ou nunca existiu.",
      "Alguém do lado de vocês muda de lado, por bons motivos.",
      "O lugar começa a desmoronar, pegar fogo ou alagar.",
      "Um segredo do personagem fica a um passo de ser descoberto.",
    ]),
  },
  {
    id: "nome",
    nome: "Nome de NPC",
    grupos: g(["Dora", "Caio", "Lívia", "Otto", "Nina", "Ravi", "Tessa", "Bento", "Íris", "Hugo", "Maya", "Davi", "Zoe", "Ciro", "Lara", "Téo"]),
    sufixos: ["Vasques", "Kowalski", "Okafor", "Moreau", "Tanaka", "Rezende", "Lindqvist", "Brandt", "Salazar", "Duarte", "Quinn", "Ferraz"],
  },
  {
    id: "aspecto_cena",
    nome: "Aspecto de cena",
    grupos: g([
      "Escuro como breu", "Multidão agitada", "Chão escorregadio", "Fumaça por toda parte", "Alarme tocando", "Caixas empilhadas até o teto",
      "Sem saída à vista", "Chuva torrencial", "Testemunhas curiosas", "Estrutura instável", "Música alta demais", "Câmeras em todo canto",
    ]),
  },
];

/** Dungeon World: complicações no estilo dos movimentos do mestre, nomes e perigos. */
export const TABELAS_PBTA: Tabela[] = [
  {
    id: "complicacao",
    nome: "Complicação (movimento do mestre)",
    grupos: g([
      "Separe-os: o chão cede e um deles cai para o nível de baixo.",
      "Mostre o perigo que vem: tambores ao longe, cada vez mais perto.",
      "Use um recurso deles: a corda arrebenta, a tocha apaga, a ração estraga.",
      "Ofereça uma oportunidade com custo: a saída existe, mas exige deixar o tesouro.",
      "Revele uma verdade indesejada: o contratante é quem mandou os bandidos.",
      "Coloque alguém em perigo: o guia é agarrado por algo no rio.",
      "Cause dano: uma pedra solta do teto acerta quem estava na frente.",
      "Vire o movimento deles contra eles: a magia funciona, e chama atenção.",
      "Diga as consequências e pergunte: dá para passar, mas vão ouvir. E aí?",
      "Avance uma ameaça: o culto completou mais um passo do ritual.",
      "Tire algo deles: um item some na confusão.",
      "Uma criatura muda de lado, ou de humor.",
      "O tempo aperta: o sol vai se pôr antes de chegarem.",
      "Um aliado faz uma exigência no pior momento.",
    ]),
  },
  {
    id: "nome",
    nome: "Nome de NPC",
    grupos: g(["Brom", "Elda", "Fenwick", "Garra", "Hilde", "Ivo", "Jessa", "Korr", "Lune", "Mabel", "Nils", "Orla", "Pip", "Runa", "Saul", "Tova"]),
    sufixos: ["o Ferreiro", "da Ponte", "Mão-Leve", "Olho-de-Corvo", "a Viúva", "do Brejo", "Sem-Terra", "o Moço", "Barba-Ruiva", "a Velha"],
  },
  {
    id: "perigo",
    nome: "Perigo de masmorra",
    grupos: g([
      "corredor que muda de lugar a cada hora",
      "fungo que libera esporos de confusão quando pisado",
      "ponte de corda sobre um abismo com vento forte",
      "sala que inunda devagar quando a porta fecha",
      "estátuas que sussurram mentiras convincentes",
      "goblins que conhecem passagens secretas e as usam",
      "um poço de onde vem uma luz e uma voz conhecida",
      "teia gigante bloqueando a única passagem",
      "altar que exige uma oferenda de sangue para abrir",
      "eco que repete as palavras com um atraso e uma mudança",
      "chão de lajes com runas, metade delas armadas",
      "uma criatura enorme dormindo no caminho",
    ]),
  },
];

// ---------- catálogo por sistema ----------

/** O que cada sistema oferece às ferramentas de consulta, com os rótulos dele (o mestre não sabe que sistema é). */
export type ConsultaSistema = {
  bestiario?: Criatura[];
  tabelas?: Tabela[];
  /** "criatura 3", "ND 1/4", "DV 2", "ameaça 4" */
  rotuloNivel: (n: number) => string;
  /** o rótulo do que o conhecimento revela: "Recordar Conhecimento (Sociedade CD 18)" */
  rotuloSaber: (c: Criatura) => string;
  /** os dois números do cabeçalho: "CA 17 · PV 50" ou "Defesa 5 dados · Saúde 7" */
  numeros: (c: Criatura) => string;
  /** descrição do campo nivel da ferramenta */
  descricaoNivel: string;
  /** como a ferramenta se apresenta ("Bestiário do sistema", "Adversários (...)") */
  titulo: string;
  /** exemplo do campo nome */
  exemploNome: string;
};

/** CD de Recordar Conhecimento do PF2e pelo nível da criatura (tabela de CD por nível, de −1 a 20). */
const CD_NIVEL_PF2E = [13, 14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40];
export const cdRecordarPf2e = (nivel: number) => CD_NIVEL_PF2E[Math.max(-1, Math.min(20, Math.floor(nivel))) + 1];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Perícia de conhecimento pelo tipo da criatura (PF2e usa Sociedade/Ocultismo; D&D, História/Arcanismo). */
function periciaDoTipo(tipo: string, pf2e: boolean): string {
  const t = semAcento(tipo);
  if (/morto|demonio/.test(t)) return "Religião";
  if (t === "besta") return pf2e ? "Arcanismo" : "Natureza";
  if (/animal/.test(t)) return "Natureza";
  if (/humanoide|gigante/.test(t)) return pf2e ? "Sociedade" : "História";
  if (/limo|aberra/.test(t)) return pf2e ? "Ocultismo" : "Arcanismo";
  return "Arcanismo";
}

const FRACOES: Record<number, string> = { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };
const CA_PV = (c: Criatura) => `CA ${c.defesa} · PV ${c.pv}`;
const TITULO_FANTASIA = "Bestiário do sistema";
const EXEMPLO_FANTASIA = 'Ex.: "goblin", "ogro", "troll".';

/** Tabelas próprias do sistema vencem as genéricas de mesmo id (encontro e tesouro do PF2e). */
const juntar = (proprias: Tabela[], gerais: Tabela[]) => [...proprias, ...gerais.filter((g) => !proprias.some((p) => p.id === g.id))];

const SO_TABELAS: Omit<ConsultaSistema, "tabelas"> = {
  rotuloNivel: (n) => `nível ${n}`,
  rotuloSaber: () => "O que se sabe",
  numeros: CA_PV,
  descricaoNivel: "Nível; traz as mais próximas.",
  titulo: TITULO_FANTASIA,
  exemploNome: EXEMPLO_FANTASIA,
};

export const CONSULTAS: Record<string, ConsultaSistema> = {
  pf2e: {
    bestiario: BESTIARIO_PF2E,
    tabelas: juntar(TABELAS_PF2E, TABELAS_FANTASIA),
    rotuloNivel: (n) => `criatura ${n}`,
    rotuloSaber: (c) => `Recordar Conhecimento (${periciaDoTipo(c.tipo, true)} CD ${cdRecordarPf2e(c.nivel)})`,
    numeros: CA_PV,
    descricaoNivel: "Nível da criatura (−1 a 12); traz as mais próximas.",
    titulo: TITULO_FANTASIA,
    exemploNome: EXEMPLO_FANTASIA,
  },
  dnd5e: {
    bestiario: BESTIARIO_DND5E,
    tabelas: TABELAS_FANTASIA,
    rotuloNivel: (n) => `ND ${FRACOES[n] ?? n}`,
    rotuloSaber: (c) => `Conhecimento (${periciaDoTipo(c.tipo, false)} CD ${10 + Math.ceil(c.nivel)})`,
    numeros: CA_PV,
    descricaoNivel: "ND (0.25 para 1/4, 0.5 para 1/2); traz as mais próximas.",
    titulo: TITULO_FANTASIA,
    exemploNome: EXEMPLO_FANTASIA,
  },
  osr: {
    bestiario: BESTIARIO_OSR,
    tabelas: TABELAS_FANTASIA,
    rotuloNivel: (n) => `DV ${n === 0.5 ? "½" : Number.isInteger(n) ? n : `${Math.floor(n)}+`}`,
    rotuloSaber: () => "O que se sabe",
    numeros: CA_PV,
    descricaoNivel: "Dados de Vida; traz as mais próximas.",
    titulo: TITULO_FANTASIA,
    exemploNome: EXEMPLO_FANTASIA,
  },
  vtm5: {
    bestiario: BESTIARIO_VTM5,
    tabelas: TABELAS_VTM5,
    rotuloNivel: (n) => `ameaça ${n}`,
    rotuloSaber: () => "Quem sabe",
    numeros: (c) => `Defesa ${c.defesa} dados · Saúde ${c.pv}`,
    descricaoNivel: "Ameaça de 1 (cai num golpe) a 5 (a coterie corre).",
    titulo: "Adversários (mortais, carniçais, caçadores, vampiros por idade, lupinos)",
    exemploNome: 'Ex.: "carniçal", "Segunda Inquisição", "ancila", "lupino".',
  },
  pf1e: { ...SO_TABELAS, tabelas: TABELAS_FANTASIA },
  d100: { ...SO_TABELAS, tabelas: TABELAS_D100 },
  fate: { ...SO_TABELAS, tabelas: TABELAS_FATE },
  pbta: { ...SO_TABELAS, tabelas: TABELAS_PBTA },
};
