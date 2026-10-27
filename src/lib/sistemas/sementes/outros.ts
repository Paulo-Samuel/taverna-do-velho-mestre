import type { SementesSistema } from "./index";

// Fate Acelerado (pulp) e Dungeon World (fronteira).

const lista = (itens: string[]) => (c: { sortear: <T>(l: readonly T[]) => T }) => c.sortear(itens);

export const FATE: SementesSistema = {
  cenarios: [
    "Rio de Janeiro, 1935: uma sociedade secreta de cientistas loucos quer roubar o Cristo Redentor com um dirigível. Sim, a estátua inteira.",
    "Piratas do céu num arquipélago de ilhas flutuantes, onde o vento é moeda e a lei é de quem tem o maior balão.",
    "Uma cidade cyberpunk alagada: corporações nos andares altos, sindicatos de mergulhadores nos baixos e vocês no meio.",
    "Um circo itinerante de agentes secretos numa Europa alternativa de 1890, movida a vapor e intriga.",
    "A grande corrida pela Amazônia de 1931: carros, aviões e trapaça para chegar primeiro a uma cidade perdida de ouro.",
    "Uma ilha no Pacífico com dinossauros, uma base militar abandonada e um tesouro que todo mundo quer.",
    "Detetives do oculto na São Paulo dos anos 30: o prefeito foi trocado por um sósia de cera e só vocês perceberam.",
    "Um zepelim de luxo cruza o Atlântico com um embaixador, uma bomba e onze suspeitos.",
  ],
  ganchos: [
    "Tem uma arqui-inimiga que sempre escapa no último segundo, rindo.",
    "Já salvou o mundo uma vez e ninguém acreditou.",
    "Foi expulso da academia de pilotos por um voo que ninguém conseguiria repetir.",
    "Tem um mapa tatuado nas costas e não consegue ler a parte de baixo.",
    "Deve a vida a um contrabandista que agora cobra em favores.",
    "É procurado em três países por crimes que, em sua defesa, eram muito estilosos.",
    "Tem um robô assistente que discorda de tudo.",
    "O mentor sumiu e deixou só um enigma e um chapéu.",
    "Sabe uma palavra que abre qualquer porta, mas só funciona uma vez por dia.",
    "Jurou vingança contra o Barão de Ferro, que nem lembra quem você é.",
  ],
  tons: ["pulp e explosivo", "heroico e cheio de bravata", "comédia de ação", "aventura de matinê", "noir com socos", "épico e exagerado"],
  campanhas: ["Os Ases do Céu", "O Roubo do Século", "Expedição Ômega", "O Zepelim Vermelho", "Liga dos Improváveis", "Socos & Segredos"],
  nomes: {
    primeiros: ["Jack", "Rosa", "Zeca", "Lola", "Max", "Iolanda", "Duke", "Gilda", "Teodoro", "Valquíria", "Rex", "Pérola", "Bento", "Scarlett", "Nico"],
    sobrenomes: ["Trovão", "Valente", "Montenegro", "Faísca", "Corisco", "Diamante", "Stone", "Bravo", "Ventania", "Sombra", "Ferraz", "Relâmpago"],
  },
  exemploNome: "Ex.: Lola Faísca",
  exemploHistoria: "Quem te persegue, o que você já explodiu, quem te deve uma…",
  exemploCenario: "Em branco, o mestre escolhe o vilão e a primeira explosão.",
  prontoAncestralidades: ["pulp", "espionagem", "noir", "steampunk"],
  campos: {
    conceito: {
      exemplo: "Ex.: Piloto Destemido com Mais Coragem que Juízo",
      gerar: lista([
        "Piloto Destemido com Mais Coragem que Juízo", "Cientista Excêntrica de Jaleco Chamuscado", "Detetive Charmoso que Nunca Paga a Conta",
        "Ex-Lutador de Circo com Coração de Ouro", "Arqueóloga que Já Roubou de Três Museus", "Espiã de Mil Rostos e Nenhum Nome",
        "Mecânico Gênio que Conversa com Motores", "Herdeira Rebelde com um Iate e um Plano",
      ]),
    },
    dificuldade: {
      exemplo: "Ex.: Devo Dinheiro à Pessoa Errada",
      gerar: lista([
        "Devo Dinheiro à Pessoa Errada", "Não Recuso um Desafio", "Meu Passado Sempre Me Alcança", "Coração Mole para Causas Perdidas",
        "Procurado pela Polícia de Três Países", "Medo de Altura (Irônico, para um Piloto)", "Língua Mais Rápida que o Bom Senso", "O Barão de Ferro Quer Minha Cabeça",
      ]),
    },
    aspectos: {
      exemplo: "Ex.: Meu Avião, a Dona Encrenca",
      gerar: lista([
        "Meu Avião, a Dona Encrenca", "A Gangue do Porto Me Deve Uma", "Sempre Tenho um Plano B (e um C)", "Ninguém Resiste ao Meu Sorriso",
        "Treinado pelos Monges da Montanha", "Meu Ex-Parceiro Virou Rival", "Bolsos Cheios de Bugigangas Úteis", "Confio em Você, até Você Me Trair",
      ]),
      pronto: 2,
    },
    facanhas: { exemplo: "Ex.: Porque sou piloto de corrida, recebo +2 quando Rápido para fugir de carro." },
  },
};

export const PBTA: SementesSistema = {
  cenarios: [
    "A fronteira do império está ruindo: um forte isolado, poucos soldados e algo grande acordando na floresta.",
    "Uma cidade construída sobre as costas de uma criatura adormecida que, ultimamente, anda se mexendo.",
    "Os mortos do cemitério da colina saem toda lua nova, mas só para cobrar dívidas. Alguém está devendo muito.",
    "A última vila antes dos Ermos pede ajuda: o poço secou e, no fundo dele, apareceu uma porta.",
    "Uma caravana de colonos atravessa as Terras Partidas rumo a um vale que talvez nem exista.",
    "Um posto de troca na beira do rio, onde orcs, anões e humanos negociam sob uma trégua que vence amanhã.",
    "A torre de vigia apagou o farol há três noites. Ninguém que subiu para ver voltou.",
    "Um dragão velho morreu nas montanhas, e a fronteira inteira quer um pedaço do tesouro (e do cadáver).",
  ],
  ganchos: [
    "Fugiu de um senhor que ainda manda caçadores atrás de você.",
    "Tem uma cicatriz que dói quando o perigo se aproxima.",
    "Prometeu enterrar um amigo na terra natal dele e ainda carrega as cinzas.",
    "Foi o único que voltou de uma masmorra; os outros cinco, não.",
    "Roubou de um templo e o deus percebeu.",
    "Tem uma dívida com uma bruxa do pântano, a ser paga “quando chegar a hora”.",
    "Quer provar à mestra (ou ao pai) que não é um fracasso.",
    "Sabe o caminho para uma cidade perdida, mas desenhou o mapa errado de propósito.",
    "Carrega uma espada que sussurra à noite.",
    "Viu a fronteira cair uma vez e jurou que não vai ver de novo.",
  ],
  tons: ["aventura de fronteira", "heroico e cheio de bravata", "sombrio e debochado", "exploração e maravilha", "sobrevivência dura", "comédia de erros"],
  campanhas: ["A Última Vila", "Além do Forte Cinzento", "Os Ermos Chamam", "Ossos do Dragão", "A Trégua do Rio", "Fogo na Fronteira"],
  nomes: {
    primeiros: ["Brom", "Isolda", "Kael", "Mirela", "Torvald", "Sera", "Dorian", "Ylva", "Garrik", "Nimue", "Osric", "Liane", "Fenna", "Halvar", "Zora"],
    sobrenomes: ["do Vale", "Pé-Ligeiro", "Mão-de-Ferro", "Corvo-Negro", "da Fronteira", "Olho-de-Falcão", "Sem-Medo", "das Cinzas", "Meia-Lua", "Quebra-Escudos"],
  },
  exemploNome: "Ex.: Isolda Pé-Ligeiro",
  exemploHistoria: "De onde veio, por que está na fronteira, o que deixou para trás…",
  exemploCenario: "Em branco, o mestre desenha o mapa com vocês (e deixa buracos de propósito).",
  campos: {
    vinculos: {
      exemplo: "Ex.: Fulano me deve a vida (troque pelo nome do colega)",
      gerar: lista([
        "Fulano me salvou a vida e eu ainda não paguei.", "Não confio em Fulano: já vi do que é capaz.", "Fulano sabe um segredo meu, e é melhor continuar assim.",
        "Vou ensinar a Fulano como o mundo realmente funciona.", "Fulano e eu já lutamos lado a lado, e perdemos.", "Prometi proteger Fulano, mesmo que não peça.",
        "Fulano me deve dinheiro. Muito.", "Acho que Fulano vai trazer a ruína a todos nós.",
      ]),
      pronto: 2,
    },
    instrumento: {
      exemplo: "Ex.: rabeca desafinada que só você consegue tocar",
      gerar: lista(["Alaúde de casco de tartaruga", "Flauta de osso de grifo", "Tambor de guerra herdado do avô", "Rabeca desafinada que só você consegue tocar", "Gaita de foles que espanta até mortos-vivos"]),
    },
    divindade: { exemplo: "Ex.: a Dama da Lanterna", gerar: lista(["Ormu, o Guardião dos Limiares", "A Mãe das Colheitas Tardias", "Varr, Senhor das Tempestades Justas", "A Dama da Lanterna", "O Ferreiro Cego"]) },
    preceito: {
      exemplo: "Ex.: nunca recusar abrigo a um viajante",
      gerar: lista(["Nunca recusar abrigo a um viajante", "Queimar os mortos antes da terceira noite", "Dar um décimo do saque aos pobres", "Não mentir dentro de templo nenhum", "Converter um descrente por estação"]),
    },
    marca: { exemplo: "Ex.: olhos verdes como musgo", gerar: lista(["Olhos verdes como musgo", "Cheiro de terra molhada", "Folhas que nascem no cabelo na primavera", "Pele salpicada como casca de bétula", "Voz que lembra o vento nos pinheiros"]) },
    arma_nome: { exemplo: "Ex.: Dona Lurdes", gerar: lista(["Dona Lurdes", "Rompe-Elmos", "A Viúva", "Beijo de Ferro", "Velha Teimosa", "Conversa Final"]) },
    missao: {
      exemplo: "Ex.: expulsar o mal que envenena o rio",
      gerar: lista(["Destruir o necromante do Vale Cinzento", "Proteger a última herdeira da Casa Valen", "Recuperar a relíquia roubada do meu templo", "Expulsar o mal que envenena o rio", "Levar a verdade sobre o rei a todo o reino"]),
    },
    companheiro_nome: { exemplo: "Ex.: Pulguento", gerar: lista(["Pulguento", "Sombra", "Brasa", "Capitão", "Dente-Torto", "Lua"]) },
    aparencia: {
      exemplo: "Ex.: olhos cansados, cabelo trançado, capa remendada",
      gerar: lista([
        "Olhos cansados, cabelo trançado, capa remendada", "Corpo cheio de cicatrizes, sorriso faltando um dente", "Alto demais para portas, voz baixa demais para tavernas",
        "Roupas finas e sujas, de quem já foi rico", "Tatuagens de clã nos braços e botas gastas de estrada",
      ]),
    },
  },
};
