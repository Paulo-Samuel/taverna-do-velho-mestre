// Ocupações do horror investigativo d100. Profissões genéricas com perícias, faixa de Nível de Crédito e
// fórmula de pontos de ocupação. Descrições próprias da taverna; mecânica no espírito do Basic Roleplaying (ORC).

export type ArmaD100 = { nome: string; pericia: string; dano: string };

export type OcupacaoD100 = {
  id: string;
  nome: string;
  descricao: string;
  /** perícias da ocupação, em ordem de importância (as primeiras recebem mais pontos) */
  pericias: string[];
  /** faixa de Nível de Crédito permitida */
  credito: [number, number];
  /** pontos de ocupação: soma de característica × multiplicador (ex.: EDU×4, ou EDU×2 + DES×2) */
  pontos: Record<string, number>;
  /** características mais importantes, para distribuir os valores padrão (o resto segue a ordem genérica) */
  prioridade: string[];
  equipamento: string[];
  papel: string;
  fonte: string;
  arma?: ArmaD100;
  /** pontos de armadura do equipamento inicial */
  armadura?: number;
  /** começa com algum conhecimento proibido (e a sanidade correspondente a menos) */
  mitosInicial?: number;
};

const BRP = "Basic Roleplaying (ORC)";
const TAVERNA = "Taverna (original, sobre BRP/ORC)";

export const OCUPACOES: OcupacaoD100[] = [
  {
    id: "antiquario", nome: "Antiquário", descricao: "Compra relíquias de viúvas e vende para colecionadores. O problema é quando a relíquia não quer ser vendida.",
    pericias: ["avaliacao", "historia", "biblioteca", "arte", "outraLingua", "encontrar", "charme", "ocultismo"], credito: [30, 70], pontos: { edu: 4 },
    prioridade: ["edu", "int", "pod"], equipamento: ["lupa de joalheiro", "catálogo de leilões rabiscado", "luvas de algodão"], papel: "erudito", fonte: BRP,
  },
  {
    id: "artista", nome: "Artista", descricao: "Pinta o que vê nos sonhos. Os críticos chamam de visionário; os vizinhos, de perturbador.",
    pericias: ["arte", "psicologia", "encontrar", "historia", "natureza", "outraLingua", "charme", "ocultismo"], credito: [9, 50], pontos: { edu: 2, pod: 2 },
    prioridade: ["pod", "apa", "des"], equipamento: ["caderno de esboços", "carvão e pincéis", "cachecol manchado de tinta"], papel: "social", fonte: BRP,
  },
  {
    id: "detetive", nome: "Detetive Particular", descricao: "Segue maridos infiéis por dinheiro e cultistas por azar.",
    pericias: ["encontrar", "psicologia", "direito", "biblioteca", "disfarce", "labia", "arte", "pistolas"], credito: [9, 30], pontos: { edu: 2, des: 2 },
    prioridade: ["edu", "des", "int"], equipamento: ["revólver .38", "câmera fotográfica", "bloco de anotações com nomes riscados"], papel: "investigador", fonte: BRP,
    arma: { nome: "revólver .38", pericia: "pistolas", dano: "1d10" },
  },
  {
    id: "jornalista", nome: "Jornalista", descricao: "Atrás do furo do século. Vai conseguir, mas ninguém vai publicar.",
    pericias: ["biblioteca", "linguaNativa", "psicologia", "encontrar", "labia", "historia", "arte", "persuasao"], credito: [9, 30], pontos: { edu: 4 },
    prioridade: ["edu", "int", "apa"], equipamento: ["bloco de repórter", "credencial de imprensa amassada", "câmera portátil"], papel: "investigador", fonte: BRP,
  },
  {
    id: "medico", nome: "Médico", descricao: "Jurou não causar dano. Ninguém falou nada sobre o que fazer quando o paciente tem guelras.",
    pericias: ["medicina", "primeirosSocorros", "ciencia", "psicologia", "outraLingua", "persuasao", "encontrar", "psicanalise"], credito: [30, 80], pontos: { edu: 4 },
    prioridade: ["edu", "int", "des"], equipamento: ["maleta médica", "estetoscópio", "frasco de morfina contado"], papel: "suporte", fonte: BRP,
  },
  {
    id: "policial", nome: "Policial", descricao: "Patrulha as ruas e já aprendeu que certas ocorrências não vão para o relatório.",
    pericias: ["pistolas", "lutar", "direito", "psicologia", "encontrar", "intimidacao", "primeirosSocorros", "dirigir"], credito: [9, 30], pontos: { edu: 2, for: 2 },
    prioridade: ["for", "con", "des"], equipamento: ["revólver de serviço", "cassetete", "distintivo", "algemas"], papel: "combatente", fonte: BRP,
    arma: { nome: "revólver de serviço", pericia: "pistolas", dano: "1d10" },
  },
  {
    id: "investigadorPolicia", nome: "Investigador de Polícia", descricao: "Detetive à paisana com café frio, úlcera e uma pasta de casos que ninguém quer reabrir.",
    pericias: ["encontrar", "psicologia", "direito", "pistolas", "escutar", "intimidacao", "labia", "disfarce"], credito: [20, 50], pontos: { edu: 2, des: 2 },
    prioridade: ["edu", "int", "des"], equipamento: ["pistola automática", "distintivo", "gabardine com bolsos fundos"], papel: "investigador", fonte: BRP,
    arma: { nome: "pistola automática", pericia: "pistolas", dano: "1d10" },
  },
  {
    id: "agenteFederal", nome: "Agente Federal", descricao: "Terno, óculos escuros e autorização para fazer perguntas que ninguém quer responder.",
    pericias: ["pistolas", "direito", "encontrar", "psicologia", "lutar", "dirigir", "furtividade", "persuasao"], credito: [20, 40], pontos: { edu: 4 },
    prioridade: ["edu", "des", "for"], equipamento: ["pistola automática", "credencial federal", "rádio portátil"], papel: "combatente", fonte: BRP,
    arma: { nome: "pistola automática", pericia: "pistolas", dano: "1d10" },
  },
  {
    id: "professor", nome: "Professor Universitário", descricao: "Leciona para alunos que dormem e pesquisa coisas que não deixam ninguém dormir.",
    pericias: ["biblioteca", "outraLingua", "linguaNativa", "historia", "ciencia", "psicologia", "antropologia", "arqueologia"], credito: [20, 70], pontos: { edu: 4 },
    prioridade: ["edu", "int", "pod"], equipamento: ["pasta de couro gasta", "óculos de leitura", "tese inacabada"], papel: "erudito", fonte: BRP,
  },
  {
    id: "bibliotecario", nome: "Bibliotecário", descricao: "Guardião do silêncio e da seção restrita. Sabe exatamente qual livro nunca deve ser emprestado.",
    pericias: ["biblioteca", "linguaNativa", "outraLingua", "historia", "contabilidade", "ocultismo", "encontrar", "usarComputadores"], credito: [9, 35], pontos: { edu: 4 },
    prioridade: ["edu", "int", "pod"], equipamento: ["molho de chaves dos arquivos", "fichário de catálogo", "lanterna pequena"], papel: "erudito", fonte: BRP,
  },
  {
    id: "ocultista", nome: "Ocultista", descricao: "Estuda magia há vinte anos e nunca viu nada de verdade. Está prestes a ver.",
    pericias: ["ocultismo", "antropologia", "historia", "biblioteca", "outraLingua", "ciencia", "psicologia", "charme"], credito: [9, 65], pontos: { edu: 4 },
    prioridade: ["pod", "edu", "int"], equipamento: ["baralho de tarô", "giz e velas negras", "caderno de símbolos copiados"], papel: "erudito", fonte: BRP,
  },
  {
    id: "padre", nome: "Padre", descricao: "Ouve confissões o dia inteiro. Algumas falavam de coisas que não estão na Bíblia.",
    pericias: ["persuasao", "psicologia", "escutar", "historia", "biblioteca", "outraLingua", "charme", "contabilidade"], credito: [9, 60], pontos: { edu: 4 },
    prioridade: ["pod", "edu", "apa"], equipamento: ["crucifixo", "água benta", "breviário com anotações"], papel: "suporte", fonte: BRP,
  },
  {
    id: "missionario", nome: "Missionário", descricao: "Foi converter os povos do fim do mundo. Voltou convertido a outra coisa: o medo.",
    pericias: ["primeirosSocorros", "medicina", "natureza", "outraLingua", "persuasao", "charme", "sobrevivencia", "reparosMecanicos"], credito: [0, 30], pontos: { edu: 4 },
    prioridade: ["pod", "con", "edu"], equipamento: ["bíblia de bolso", "kit de primeiros socorros", "chapéu de aba larga"], papel: "suporte", fonte: BRP,
  },
  {
    id: "soldado", nome: "Soldado", descricao: "Sobreviveu às trincheiras. Agora descobre que a guerra era a parte fácil.",
    pericias: ["rifles", "esquivar", "lutar", "furtividade", "sobrevivencia", "escalar", "primeirosSocorros", "natacao"], credito: [9, 30], pontos: { edu: 2, for: 2 },
    prioridade: ["for", "con", "des"], equipamento: ["rifle de serviço", "baioneta", "capacete amassado", "cantil"], papel: "combatente", fonte: BRP,
    arma: { nome: "rifle de serviço", pericia: "rifles", dano: "2d6+4" }, armadura: 1,
  },
  {
    id: "oficialMilitar", nome: "Oficial Militar", descricao: "Dá ordens com voz firme e esconde as mãos que tremem desde aquela noite no posto avançado.",
    pericias: ["persuasao", "intimidacao", "pistolas", "navegacao", "psicologia", "sobrevivencia", "primeirosSocorros", "contabilidade"], credito: [20, 70], pontos: { edu: 2, for: 2 },
    prioridade: ["edu", "for", "pod"], equipamento: ["pistola de oficial", "binóculos", "mapa militar com marcações estranhas"], papel: "lider", fonte: BRP,
    arma: { nome: "pistola de oficial", pericia: "pistolas", dano: "1d10" },
  },
  {
    id: "criminoso", nome: "Criminoso", descricao: "Já roubou bancos, igrejas e uma vez um ídolo de jade. Desde então, dorme de luz acesa.",
    pericias: ["furtividade", "chaveiro", "labia", "lutarArmas", "pistolas", "intimidacao", "psicologia", "encontrar"], credito: [5, 65], pontos: { edu: 2, des: 2 },
    prioridade: ["des", "for", "int"], equipamento: ["canivete", "gazuas", "casaco com bolso falso"], papel: "especialista", fonte: BRP,
    arma: { nome: "canivete", pericia: "lutarArmas", dano: "1d4+BD" },
  },
  {
    id: "contrabandista", nome: "Contrabandista", descricao: "Leva qualquer carga, sem perguntas. Exceto aquela caixa que arranhava por dentro.",
    pericias: ["pilotar", "navegacao", "labia", "pistolas", "encontrar", "escutar", "furtividade", "dirigir"], credito: [20, 60], pontos: { edu: 2, apa: 2 },
    prioridade: ["des", "apa", "int"], equipamento: ["pistola", "documentos falsos", "mapa de enseadas escondidas"], papel: "especialista", fonte: BRP,
    arma: { nome: "pistola", pericia: "pistolas", dano: "1d10" },
  },
  {
    id: "diletante", nome: "Diletante", descricao: "Herdou fortuna, tédio e uma mansão cheia de quadros que mudam de lugar.",
    pericias: ["charme", "persuasao", "arte", "outraLingua", "cavalgar", "rifles", "historia", "avaliacao"], credito: [50, 99], pontos: { edu: 2, apa: 2 },
    prioridade: ["apa", "edu", "pod"], equipamento: ["espingarda de caça com brasão", "talão de cheques", "cigarreira de prata"], papel: "social", fonte: BRP,
    arma: { nome: "espingarda de caça", pericia: "rifles", dano: "4d6/2d6/1d6" },
  },
  {
    id: "engenheiro", nome: "Engenheiro", descricao: "Calcula tudo. Só não consegue calcular os ângulos daquela construção, que estão errados de um jeito vivo.",
    pericias: ["reparosMecanicos", "reparosEletricos", "ciencia", "operarMaquinario", "arte", "biblioteca", "eletronica", "usarComputadores"], credito: [30, 60], pontos: { edu: 4 },
    prioridade: ["edu", "int", "des"], equipamento: ["caixa de ferramentas", "régua de cálculo", "plantas enroladas"], papel: "especialista", fonte: BRP,
  },
  {
    id: "cientista", nome: "Cientista", descricao: "Acredita só no que pode medir. Os instrumentos acabaram de medir algo impossível.",
    pericias: ["ciencia", "biblioteca", "outraLingua", "encontrar", "usarComputadores", "eletronica", "persuasao", "medicina"], credito: [9, 50], pontos: { edu: 4 },
    prioridade: ["int", "edu", "pod"], equipamento: ["jaleco com queimaduras de ácido", "caderno de laboratório", "amostras em frascos"], papel: "erudito", fonte: BRP,
  },
  {
    id: "hacker", nome: "Hacker", descricao: "Invade qualquer sistema. Mas tem um servidor antigo que responde mesmo desligado da tomada.",
    pericias: ["usarComputadores", "eletronica", "reparosEletricos", "biblioteca", "encontrar", "labia", "outraLingua", "contabilidade"], credito: [10, 70], pontos: { edu: 4 },
    prioridade: ["int", "edu", "des"], equipamento: ["notebook cheio de adesivos", "pendrives sem rótulo", "fones de ouvido"], papel: "especialista", fonte: TAVERNA,
  },
  {
    id: "enfermeira", nome: "Enfermeira(o)", descricao: "Já viu de tudo no plantão noturno. Quase tudo. A ala fechada do terceiro andar ainda não.",
    pericias: ["primeirosSocorros", "medicina", "psicologia", "escutar", "encontrar", "ciencia", "charme", "persuasao"], credito: [9, 30], pontos: { edu: 4 },
    prioridade: ["edu", "con", "pod"], equipamento: ["kit de primeiros socorros", "termômetro de mercúrio", "sapatos confortáveis"], papel: "suporte", fonte: BRP,
  },
  {
    id: "legista", nome: "Médico-Legista", descricao: "Seus pacientes não reclamam. Pelo menos não deveriam.",
    pericias: ["medicina", "ciencia", "encontrar", "biblioteca", "psicologia", "direito", "primeirosSocorros", "persuasao"], credito: [20, 60], pontos: { edu: 4 },
    prioridade: ["edu", "int", "con"], equipamento: ["bisturis", "luvas de borracha", "relatórios de autópsia inconclusivos"], papel: "erudito", fonte: BRP,
  },
  {
    id: "psiquiatra", nome: "Psiquiatra", descricao: "Trata os loucos da cidade e começa a desconfiar que eles têm razão.",
    pericias: ["psicanalise", "psicologia", "medicina", "escutar", "persuasao", "ciencia", "outraLingua", "biblioteca"], credito: [30, 80], pontos: { edu: 4 },
    prioridade: ["edu", "int", "pod"], equipamento: ["prontuários confidenciais", "caneta-tinteiro", "frasco de sedativo"], papel: "suporte", fonte: BRP,
  },
  {
    id: "arqueologo", nome: "Arqueólogo", descricao: "Desenterra civilizações mortas. Algumas só estavam dormindo.",
    pericias: ["arqueologia", "historia", "avaliacao", "outraLingua", "biblioteca", "encontrar", "navegacao", "reparosMecanicos"], credito: [10, 40], pontos: { edu: 4 },
    prioridade: ["edu", "int", "con"], equipamento: ["pá e pincéis", "chapéu de aba larga", "diário de escavação"], papel: "erudito", fonte: BRP,
  },
  {
    id: "explorador", nome: "Explorador", descricao: "Mapeou desertos, selvas e geleiras. O mapa novo tem regiões que mudam quando ninguém olha.",
    pericias: ["sobrevivencia", "navegacao", "escalar", "rifles", "rastrear", "natacao", "saltar", "antropologia"], credito: [55, 80], pontos: { edu: 2, for: 2 },
    prioridade: ["con", "for", "edu"], equipamento: ["rifle de caça", "bússola", "barraca de lona", "corda de 15 m"], papel: "combatente", fonte: BRP,
    arma: { nome: "rifle de caça", pericia: "rifles", dano: "2d6+4" },
  },
  {
    id: "cacador", nome: "Caçador", descricao: "Caça na mata há trinta anos. Na semana passada, sentiu pela primeira vez que era a presa.",
    pericias: ["rifles", "rastrear", "sobrevivencia", "furtividade", "natureza", "escutar", "encontrar", "navegacao"], credito: [20, 50], pontos: { edu: 2, des: 2 },
    prioridade: ["des", "con", "pod"], equipamento: ["rifle de caça", "faca de esfolar", "armadilhas de ferro"], papel: "combatente", fonte: BRP,
    arma: { nome: "rifle de caça", pericia: "rifles", dano: "2d6+4" },
  },
  {
    id: "motorista", nome: "Motorista", descricao: "Leva o patrão a lugares estranhos e aprendeu a não olhar pelo retrovisor.",
    pericias: ["dirigir", "reparosMecanicos", "navegacao", "escutar", "encontrar", "psicologia", "labia", "contabilidade"], credito: [9, 20], pontos: { edu: 2, des: 2 },
    prioridade: ["des", "con", "for"], equipamento: ["chave inglesa", "mapa rodoviário", "boné de motorista"], papel: "especialista", fonte: BRP,
  },
  {
    id: "piloto", nome: "Aviador", descricao: "Voa acima das nuvens e jura que algo voa ainda mais alto.",
    pericias: ["pilotar", "navegacao", "reparosMecanicos", "encontrar", "operarMaquinario", "ciencia", "reparosEletricos", "pistolas"], credito: [20, 70], pontos: { edu: 2, des: 2 },
    prioridade: ["des", "edu", "con"], equipamento: ["jaqueta de couro", "óculos de voo", "pistola sinalizadora"], papel: "especialista", fonte: BRP,
  },
  {
    id: "marinheiro", nome: "Marinheiro", descricao: "Conhece todo porto e todo bar de porto. Não conhece aquela ilha que não está em mapa nenhum.",
    pericias: ["pilotar", "navegacao", "natacao", "escalar", "lutar", "escutar", "sobrevivencia", "pistolas"], credito: [9, 30], pontos: { edu: 2, for: 2 },
    prioridade: ["for", "con", "des"], equipamento: ["faca de marinheiro", "cachimbo", "tatuagem de âncora"], papel: "combatente", fonte: BRP,
    arma: { nome: "faca de marinheiro", pericia: "lutarArmas", dano: "1d4+BD" },
  },
  {
    id: "fazendeiro", nome: "Fazendeiro", descricao: "Lida com a terra. Ultimamente a terra anda lidando com ele, e as vacas olham estranho.",
    pericias: ["natureza", "reparosMecanicos", "operarMaquinario", "dirigir", "rastrear", "treinarAnimais", "arte", "rifles"], credito: [9, 30], pontos: { edu: 2, for: 2 },
    prioridade: ["for", "con", "pod"], equipamento: ["espingarda velha", "forcado", "chapéu de palha"], papel: "combatente", fonte: BRP,
    arma: { nome: "espingarda velha", pericia: "rifles", dano: "4d6/2d6/1d6" },
  },
  {
    id: "operario", nome: "Operário", descricao: "Turno dobrado na fábrica. Os ruídos da caldeira nova parecem palavras.",
    pericias: ["reparosMecanicos", "operarMaquinario", "reparosEletricos", "lutar", "arremessar", "escalar", "dirigir", "primeirosSocorros"], credito: [9, 30], pontos: { edu: 2, for: 2 },
    prioridade: ["for", "con", "des"], equipamento: ["chave inglesa pesada", "marmita", "luvas de couro"], papel: "combatente", fonte: BRP,
    arma: { nome: "chave inglesa", pericia: "lutarArmas", dano: "1d6+BD" },
  },
  {
    id: "bombeiro", nome: "Bombeiro", descricao: "Entra onde todo mundo sai. Agora há incêndios que queimam frio.",
    pericias: ["escalar", "primeirosSocorros", "esquivar", "saltar", "dirigir", "operarMaquinario", "reparosMecanicos", "arremessar"], credito: [9, 30], pontos: { edu: 2, for: 2 },
    prioridade: ["for", "con", "des"], equipamento: ["machado de incêndio", "capacete", "lanterna à prova d'água"], papel: "combatente", fonte: BRP,
    arma: { nome: "machado de incêndio", pericia: "lutarArmas", dano: "1d8+2+BD" }, armadura: 1,
  },
  {
    id: "lutador", nome: "Lutador", descricao: "Ganha a vida no ringue. Bate forte, apanha mais e não teme nada que sangre.",
    pericias: ["lutar", "esquivar", "intimidacao", "saltar", "psicologia", "encontrar", "arremessar", "escalar"], credito: [9, 60], pontos: { edu: 2, for: 2 },
    prioridade: ["for", "con", "des"], equipamento: ["faixas de mão", "toalha manchada", "dente de ouro"], papel: "combatente", fonte: BRP,
    arma: { nome: "punhos treinados", pericia: "lutar", dano: "1d3+BD" },
  },
  {
    id: "cacadorRecompensas", nome: "Caçador de Recompensas", descricao: "Encontra quem não quer ser encontrado. Às vezes descobre o porquê.",
    pericias: ["rastrear", "pistolas", "lutar", "direito", "psicologia", "furtividade", "dirigir", "labia"], credito: [9, 30], pontos: { edu: 2, des: 2 },
    prioridade: ["des", "for", "int"], equipamento: ["revólver", "algemas", "cartazes de procurado"], papel: "combatente", fonte: BRP,
    arma: { nome: "revólver", pericia: "pistolas", dano: "1d10" },
  },
  {
    id: "advogado", nome: "Advogado", descricao: "Defende qualquer um que pague. O cliente novo paga em ouro muito, muito antigo.",
    pericias: ["direito", "persuasao", "psicologia", "contabilidade", "biblioteca", "charme", "labia", "intimidacao"], credito: [30, 80], pontos: { edu: 4 },
    prioridade: ["edu", "int", "apa"], equipamento: ["pasta de couro", "códigos anotados", "caneta-tinteiro cara"], papel: "social", fonte: BRP,
  },
  {
    id: "comerciante", nome: "Comerciante", descricao: "Tem uma lojinha no centro e um porão com mercadoria que nunca anunciou.",
    pericias: ["contabilidade", "persuasao", "labia", "avaliacao", "charme", "psicologia", "dirigir", "encontrar"], credito: [20, 40], pontos: { edu: 2, apa: 2 },
    prioridade: ["apa", "edu", "int"], equipamento: ["livro-caixa", "molho de chaves da loja", "pistola sob o balcão"], papel: "social", fonte: BRP,
  },
  {
    id: "secretario", nome: "Secretário(a)", descricao: "Sabe tudo o que acontece no escritório, inclusive o que acontece depois que as luzes apagam.",
    pericias: ["contabilidade", "linguaNativa", "biblioteca", "psicologia", "charme", "persuasao", "arte", "usarComputadores"], credito: [9, 30], pontos: { edu: 2, des: 2 },
    prioridade: ["edu", "des", "apa"], equipamento: ["agenda cheia de compromissos", "máquina de escrever portátil", "grampeador pesado"], papel: "social", fonte: BRP,
  },
  {
    id: "escritor", nome: "Escritor", descricao: "Escreve contos de horror para revistas baratas. A inspiração ultimamente bate à porta, literalmente.",
    pericias: ["arte", "linguaNativa", "biblioteca", "historia", "ocultismo", "psicologia", "outraLingua", "natureza"], credito: [9, 30], pontos: { edu: 4 },
    prioridade: ["edu", "int", "pod"], equipamento: ["manuscrito inacabado", "máquina de escrever", "garrafa de bebida pela metade"], papel: "erudito", fonte: BRP,
  },
  {
    id: "fotografo", nome: "Fotógrafo", descricao: "Revela os filmes no quarto escuro e às vezes aparecem pessoas que não estavam lá.",
    pericias: ["arte", "encontrar", "furtividade", "psicologia", "ciencia", "escalar", "labia", "persuasao"], credito: [9, 30], pontos: { edu: 2, des: 2 },
    prioridade: ["des", "edu", "pod"], equipamento: ["câmera com flash", "rolos de filme", "tripé"], papel: "investigador", fonte: BRP,
  },
  {
    id: "parapsicologo", nome: "Parapsicólogo", descricao: "Caça fantasmas com aparelhos caseiros. Noventa e nove casos eram ratos. O centésimo não.",
    pericias: ["ocultismo", "biblioteca", "antropologia", "historia", "psicologia", "arte", "outraLingua", "encontrar"], credito: [9, 30], pontos: { edu: 4 },
    prioridade: ["edu", "pod", "int"], equipamento: ["gravador de sons", "termômetro sensível", "giz para círculos"], papel: "erudito", fonte: BRP,
  },
  {
    id: "medium", nome: "Médium", descricao: "Fazia sessões espíritas de fachada. Até que alguém do outro lado resolveu responder.",
    pericias: ["psicologia", "ocultismo", "labia", "charme", "escutar", "prestidigitacao", "persuasao", "arte"], credito: [9, 50], pontos: { edu: 2, apa: 2 },
    prioridade: ["pod", "apa", "int"], equipamento: ["bola de cristal rachada", "tabuleiro de letras", "véu escuro"], papel: "social", fonte: TAVERNA,
  },
  {
    id: "ator", nome: "Ator", descricao: "Interpreta qualquer papel. O problema é a peça nova, cujo texto ninguém lembra de ter escrito.",
    pericias: ["arte", "disfarce", "charme", "labia", "psicologia", "persuasao", "escutar", "prestidigitacao"], credito: [9, 40], pontos: { edu: 2, apa: 2 },
    prioridade: ["apa", "pod", "des"], equipamento: ["estojo de maquiagem", "roteiro amassado", "capa de teatro"], papel: "social", fonte: BRP,
  },
  {
    id: "musico", nome: "Músico", descricao: "Toca jazz em bares enfumaçados. Certas notas fazem a plateia chorar sem saber por quê.",
    pericias: ["arte", "escutar", "charme", "psicologia", "persuasao", "labia", "furtividade", "outraLingua"], credito: [9, 30], pontos: { edu: 2, des: 2 },
    prioridade: ["des", "apa", "pod"], equipamento: ["instrumento num estojo surrado", "partituras", "chapéu para gorjetas"], papel: "social", fonte: BRP,
  },
  {
    id: "espiao", nome: "Espião", descricao: "Serve a um governo que nega sua existência. Encontrou outro governo que nega a da humanidade.",
    pericias: ["disfarce", "furtividade", "psicologia", "outraLingua", "pistolas", "escutar", "prestidigitacao", "arte"], credito: [20, 60], pontos: { edu: 2, apa: 2 },
    prioridade: ["des", "int", "apa"], equipamento: ["pistola com silenciador", "passaportes de três países", "cápsula de cianeto (só por garantia)"], papel: "especialista", fonte: BRP,
    arma: { nome: "pistola com silenciador", pericia: "pistolas", dano: "1d8" },
  },
  {
    id: "estudante", nome: "Estudante", descricao: "Jovem, curioso e sem noção de perigo. A biblioteca da faculdade tem uma ala que não aparece na planta.",
    pericias: ["biblioteca", "linguaNativa", "outraLingua", "historia", "ciencia", "escutar", "usarComputadores", "psicologia"], credito: [5, 10], pontos: { edu: 4 },
    prioridade: ["int", "edu", "des"], equipamento: ["mochila com livros emprestados", "caderno de anotações", "lanche esquecido"], papel: "investigador", fonte: BRP,
  },
  {
    id: "andarilho", nome: "Andarilho", descricao: "Pula de trem em trem, dorme onde dá e já viu coisas nos trilhos que ninguém acreditaria.",
    pericias: ["furtividade", "escalar", "saltar", "escutar", "navegacao", "chaveiro", "labia", "sobrevivencia"], credito: [0, 5], pontos: { edu: 2, des: 2 },
    prioridade: ["con", "des", "pod"], equipamento: ["trouxa de pano", "gaita", "canivete enferrujado"], papel: "especialista", fonte: BRP,
    arma: { nome: "canivete enferrujado", pericia: "lutarArmas", dano: "1d4+BD" },
  },
  {
    id: "influenciador", nome: "Influenciador Digital", descricao: "Transmite tudo ao vivo. A última live teve um espectador a mais que ninguém conseguiu identificar.",
    pericias: ["charme", "persuasao", "arte", "usarComputadores", "labia", "psicologia", "disfarce", "eletronica"], credito: [9, 60], pontos: { edu: 2, apa: 2 },
    prioridade: ["apa", "pod", "des"], equipamento: ["celular com anel de luz", "bastão de selfie", "carregador portátil"], papel: "social", fonte: TAVERNA,
  },
  {
    id: "exCultista", nome: "Ex-Cultista", descricao: "Fugiu da seita no meio do ritual. Eles ainda guardam o lugar dele no círculo.",
    pericias: ["ocultismo", "furtividade", "psicologia", "labia", "biblioteca", "outraLingua", "intimidacao", "persuasao"], credito: [5, 40], pontos: { edu: 2, pod: 2 },
    prioridade: ["pod", "des", "int"], equipamento: ["amuleto que não consegue jogar fora", "faca ritual", "lista de nomes de ex-irmãos"], papel: "especialista", fonte: TAVERNA,
    arma: { nome: "faca ritual", pericia: "lutarArmas", dano: "1d4+BD" }, mitosInicial: 5,
  },
];
