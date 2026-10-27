import type { SementesSistema } from "./index";

// Fantasia: D&D 5e (heroica clássica), Pathfinder 2e (mundo de impérios caídos, genérico e sem marca),
// Pathfinder 1e (clássico, mais cru) e OSR (masmorras e ermos, onde se morre fácil).

const lista = (itens: string[]) => (c: { sortear: <T>(l: readonly T[]) => T }) => c.sortear(itens);

export const DND5E: SementesSistema = {
  cenarios: [
    "Uma cidade-estado em festa pela coroação, com um rei de doze anos, três regentes e um veneno já servido.",
    "A caravana do sal atravessa o deserto vermelho; o guia sumiu na primeira noite e deixou o mapa marcado com sangue.",
    "Uma vila de pescadores onde a maré parou de voltar há três dias, e ninguém quer falar sobre o que ficou na areia.",
    "Ruínas de uma torre de mago reapareceram no pântano depois de cem anos. Todo mundo quer o que tem lá dentro.",
    "A taverna do Velho Mestre, numa noite de tempestade, quando um estranho entra carregando um ovo que ainda bate.",
    "Uma academia de magia suspendeu as aulas: um aluno abriu um portal no dormitório e o diretor sumiu dentro dele.",
    "O dragão que protegia o vale há séculos foi encontrado morto. Os vizinhos da montanha, nada amigáveis, já sabem.",
    "Uma cidade flutuante de gnomos perdeu os motores e está caindo, devagar, sobre a capital.",
  ],
  ganchos: [
    "Deve dinheiro a alguém que não aceita desculpas.",
    "Fugiu de casa por um motivo que ainda não contou a ninguém.",
    "Carrega um objeto que não é seu e que alguém quer de volta.",
    "Perdeu um irmão numa expedição e jura que ele está vivo.",
    "Foi expulso da ordem, da guilda ou do templo. Talvez com razão.",
    "Tem um rival que aparece sempre na pior hora possível.",
    "Uma profecia diz que você vai salvar o reino. Você tem certeza de que é engano.",
    "Sobreviveu a um ataque de dragão quando criança e ainda sente cheiro de enxofre.",
    "Herdou um título de nobreza e as dívidas que vêm com ele.",
    "Fez um pacto bêbado numa encruzilhada e agora tem que cumprir.",
  ],
  tons: ["heroico e cheio de bravata", "sombrio e debochado", "épico e trágico", "comédia de erros", "intriga e política", "exploração e maravilha"],
  campanhas: ["A Saga do Ovo que Bate", "Coroa de Doze Anos", "Os Herdeiros do Dragão", "Sal e Sangue", "A Torre do Pântano", "Os Improváveis"],
  nomes: {
    primeiros: ["Brunhilda", "Aldric", "Elowen", "Gareth", "Seraphine", "Borin", "Lyra", "Cedric", "Maelis", "Tobias", "Ysolde", "Fendrel", "Ingrid", "Rowan", "Kestrel"],
    sobrenomes: ["Pé-de-Ferro", "Martelo-Velho", "Folha-de-Prata", "Sopro-de-Brasa", "Coração-de-Leão", "Escudo-Partido", "Vento-Norte", "Barba-Ruiva", "Dedos-Leves", "Estrela-Cadente"],
  },
  exemploNome: "Ex.: Brunhilda Pé-de-Ferro",
  exemploHistoria: "De onde veio, o que quer, de quem foge…",
  exemploCenario: "Em branco, o mestre inventa. Ele adora inventar.",
  campos: {
    divindade: {
      exemplo: "Ex.: Tharn, deus das forjas e dos juramentos",
      gerar: lista([
        "Aurelion, o Sol que Não Julga", "A Senhora das Encruzilhadas", "Tharn, deus das forjas e dos juramentos", "A Mãe-Lua das Marés", "O Guardião do Último Suspiro",
        "Um ideal: liberdade para os servos do reino",
      ]),
    },
    subclasseOutra: { exemplo: "Ex.: Caminho do Cozinheiro de Guerra (o mestre aplica na mão)" },
  },
  // especialização só vale em perícia treinada: o sistema escolhe melhor
  deixarParaOSistema: ["especializacao"],
};

export const PF2E: SementesSistema = {
  cenarios: [
    "Uma metrópole-ilha no centro de um mar interior, onde todos os povos negociam, conspiram e apostam no torneio dos campeões.",
    "Uma cicatriz demoníaca se abriu no norte gelado. As cruzadas falharam; agora mandam aventureiros, que saem mais barato.",
    "Um império necromante governado por um lich-rei: os vivos pagam imposto em sangue, e vocês carregam um contrabando de esperança.",
    "As terras dos gigantes despertam: pedras rúnicas brilham nas colinas e as vilas de fronteira contratam quem tiver coragem.",
    "Uma cidade de canais e magia proibida, onde um diabo assina os contratos de aluguel. Literalmente.",
    "Ruínas de uma civilização caída sob a selva: anões, goblins e caçadores de relíquias disputam o mesmo templo.",
    "Uma nação de pistoleiros e inventores sem deuses, onde um clérigo recém-chegado é a pessoa mais suspeita da cidade.",
    "Uma estrela caiu sobre o deserto antigo e se partiu; cada fragmento atrai cultistas, faraós mortos-vivos e vocês.",
    "A floresta das fadas avança uma légua por noite. Na próxima lua, engole a capital.",
  ],
  ganchos: [
    "Seu clã goblin te expulsou por cantar mal. Você quer provar que canta muito bem, obrigado.",
    "Foi treinado por uma ordem de cavaleiros que caiu em desgraça e quer limpar o nome dela.",
    "Um diabo te ofereceu um contrato. Você não assinou. Ainda.",
    "Herdou de um tio aventureiro um mapa com metade das legendas em goblin.",
    "Sua aldeia foi salva por um aventureiro famoso; você quer ser como ele, só que melhor.",
    "Tem uma marca de nascença que os cultistas da estrela caída reconhecem.",
    "Fugiu do império necromante com um segredo que o lich-rei quer de volta.",
    "É o último aprendiz vivo de uma escola de magia que explodiu (não foi culpa sua, provavelmente).",
    "Jurou servir a um deus que ninguém mais cultua.",
    "Deve um favor a uma rainha das fadas, e fada nenhuma esquece.",
    "Ganhou de um anão, numa aposta, uma arma que ninguém além de você consegue erguer.",
  ],
  tons: ["aventura heroica clássica", "exploração de masmorras", "intriga e política", "sombrio e debochado", "épico e trágico", "comédia de goblins"],
  campanhas: ["A Cicatriz do Norte", "Contratos Infernais", "O Torneio do Mar Interior", "Fragmentos da Estrela", "Sob a Selva de Pedra", "A Coroa do Lich"],
  nomes: {
    primeiros: ["Talia", "Bram", "Nyx", "Odran", "Mirabel", "Grukk", "Sylvaine", "Corwin", "Pip", "Isolde", "Thessaly", "Durgan", "Vex", "Anwen", "Lorcan", "Zinnia"],
    sobrenomes: ["Ventobravo", "Brasaluz", "Dente-de-Ferro", "Colinaverde", "Pedrafunda", "Sombraluna", "Cantaforte", "Rasga-Mapas", "Mão-de-Prata", "Olho-de-Corvo"],
  },
  exemploNome: "Ex.: Mirabel Cantaforte",
  exemploHistoria: "Sua aldeia, sua ordem, o que te empurrou para a estrada…",
  exemploCenario: "Em branco, o mestre escolhe o canto do mundo e a primeira masmorra.",
  campos: {
    divindade: {
      exemplo: "Ex.: a Senhora da Aurora, que cura e não pergunta",
      gerar: lista([
        "A Senhora da Aurora, que cura e não pergunta", "O Juiz das Correntes, deus da lei e das masmorras", "Kethra, deusa das estradas e da sorte", "O Ferreiro Primordial",
        "A Tecelã de Sonhos", "A Fênix Silenciosa, deusa do renascimento",
      ]),
    },
    saberes: {
      exemplo: "Ex.: Saber de Tavernas",
      gerar: lista(["Saber de Tavernas", "Saber de Goblins", "Saber de Cerveja Anã", "Saber de Cidades Mercantes", "Saber de Heráldica", "Saber de Diabos e Contratos", "Saber de Piratas"]),
    },
  },
  // em branco, os aumentos e o atributo-chave seguem a prioridade da classe (melhor que sortear);
  // herança versátil substitui a herança comum, então o sorteio fica só com a comum
  deixarParaOSistema: ["aumento_ancestral", "aumento_antecedente", "chave", "heranca_versatil"],
};

export const PF1E: SementesSistema = {
  cenarios: [
    "Uma cidade costeira assombrada por goblins incendiários e por algo bem pior nas falésias.",
    "Um reino de fronteira sem rei: quem domar as terras selvagens e os bandidos vira barão. Com carta e brasão.",
    "Uma prisão-castelo abandonada no meio da floresta, onde um carcereiro morto ainda faz a chamada toda noite.",
    "Uma cidade sob domínio de um culto infernal, onde a lei é perfeita e ninguém é feliz.",
    "Uma expedição pela Estrada dos Mortos para resgatar uma princesa que talvez não queira ser resgatada.",
    "Uma cidade de mineração anã fechou os portões. Do lado de dentro, só silêncio e martelos.",
    "A Feira dos Mil Mercadores começa amanhã, e alguém planeja roubar o cofre do Grão-Prefeito durante a abertura.",
    "Ruínas de um império de magos emergiram do pântano após uma enchente; cada sala é uma armadilha com mil anos de paciência.",
  ],
  ganchos: [
    "Sua família foi morta por bandidos que hoje usam brasões de nobreza.",
    "Foi aprendiz de um mago que vendeu a alma e deixou a conta para você.",
    "Tem sangue de dragão nas veias, e ele esquenta quando você mente.",
    "É procurado por um crime que um sósia cometeu.",
    "Recebeu uma carta de nobreza que não sabe se é verdadeira.",
    "Uma maldição de família mata o primogênito aos 30 anos. Você tem 29.",
    "Fugiu de um circo onde era a atração principal.",
    "Deve a liberdade a um mercador que um dia vai cobrar.",
    "Busca o assassino do seu mentor, que deixou um único fio de cabelo branco na cena.",
    "Viu um goblin salvar uma criança e desde então não consegue odiá-los como deveria.",
  ],
  tons: ["aventura clássica", "sombrio e debochado", "épico e trágico", "intriga e política", "sobrevivência e masmorra", "comédia de erros"],
  campanhas: ["A Carta do Barão", "Sombras na Falésia", "A Prisão que Faz Chamada", "O Cofre do Grão-Prefeito", "Herança de Sangue", "A Estrada dos Mortos"],
  nomes: {
    primeiros: ["Aldo", "Rowena", "Gerrit", "Helka", "Tamsin", "Ulric", "Marisol", "Dresk", "Oriana", "Bartolo", "Jessa", "Kragg", "Evander", "Fiora", "Lazlo", "Sabine"],
    sobrenomes: ["Valcourt", "Ferramarga", "Pedrabranca", "Lâminafria", "Corvelho", "Sangrebom", "Montealto", "Mãorápida", "Vinhaveia", "Torrebaixa"],
  },
  exemploNome: "Ex.: Rowena Valcourt",
  exemploHistoria: "De onde veio, quem treinou você, o que procura…",
  exemploCenario: "Em branco, o mestre escolhe o reino e o primeiro problema.",
  campos: {
    divindade: {
      exemplo: "Ex.: Seraph, deusa da justiça cega",
      gerar: lista([
        "A Filosofia da Mão Aberta: nada é de ninguém", "Seraph, deusa da justiça cega", "O Velho do Mar, que cobra em afogados", "A Ordem do Livro Fechado",
        "Brann, deus do fogo e da forja", "A Mãe Selvagem",
      ]),
    },
    identidadeSocial: {
      exemplo: "Ex.: um alfaiate tímido do distrito dos mercadores",
      gerar: lista(["Um alfaiate tímido do distrito dos mercadores", "A filha mimada de um conde", "Um vigia noturno que dorme no serviço", "A dona de uma livraria pequena e falida"]),
    },
    companheiro: {
      exemplo: "Ex.: lobo cinzento chamado Fumaça",
      gerar: lista(["Lobo cinzento chamado Fumaça", "Cavalo de guerra teimoso chamado Duque", "Falcão de olho vermelho chamado Brasa", "Javali enorme chamado Senhor Bolota", "Cão de caça velho chamado Capitão"]),
    },
  },
  // bônus flexível vai no atributo-chave; alinhamento sorteado brigaria com paladino e companhia
  deixarParaOSistema: ["atributoRacial", "alinhamento"],
};

export const OSR: SementesSistema = {
  cenarios: [
    "A masmorra embaixo do mosteiro abandonado: dez níveis, um mapa rasgado e um bando de rivais com mais tochas que vocês.",
    "Um vale onde o ouro brota da terra e os aventureiros não voltam. A recompensa é boa demais para ser honesta.",
    "O túmulo do Rei-Corvo foi aberto por um terremoto. Os saqueadores chegaram primeiro, e não saíram.",
    "Uma vila na beira dos ermos paga dez peças de ouro por orelha de goblin. As orelhas estão ficando caras.",
    "Uma megamasmorra sob a cidade, cada nível de uma era diferente, e o primeiro já lotado de cadáveres de novatos.",
    "Uma ilha que aparece no mapa só nas noites de lua cheia, com um castelo que ninguém construiu.",
    "O pântano engoliu a antiga estrada real e, com ela, o comboio de impostos do rei. Ouro molhado ainda é ouro.",
    "A torre de um mago louco onde cada andar muda de lugar quando alguém morre.",
  ],
  ganchos: [
    "Gastou o último cobre numa tocha e numa corda. Ou é ouro ou é fome.",
    "É o terceiro filho de um fazendeiro: não herda nada além de uma enxada e da coragem.",
    "O grupo anterior morreu inteiro na masmorra. Você saiu correndo. Ninguém precisa saber.",
    "Um agiota da vila vai quebrar seus dedos se o ouro não aparecer até o fim do mês.",
    "Tem um mapa do tesouro comprado de um bêbado. Provavelmente falso.",
    "Foi amaldiçoado por um ídolo que tocou. Ainda não sabe o que a maldição faz.",
    "Quer comprar a liberdade da irmã, vendida como serva.",
    "Ouviu falar de uma espada que mata dragões. Não tem dragão por perto, mas tudo bem.",
    "Desertou do exército do barão levando o pagamento de três meses.",
    "É o único na vila que lê runas antigas, e por isso foi “voluntariado”.",
  ],
  tons: ["sobrevivência dura e letal", "sombrio e debochado", "exploração e saque", "terror de masmorra", "comédia de morte rápida", "épico de baixo nível"],
  campanhas: ["Dez Níveis Abaixo", "Orelhas de Goblin", "O Túmulo do Rei-Corvo", "Ouro Molhado", "A Torre que Muda", "Morra Tentando"],
  nomes: {
    primeiros: ["Bartolomeu", "Gerta", "Osvaldo", "Hildegarda", "Ruperto", "Matilde", "Anselmo", "Brígida", "Godofredo", "Quitéria", "Fulgêncio", "Ermelinda", "Tibúrcio", "Gertrudes"],
    sobrenomes: ["o Manco", "a Ruiva", "Três-Dedos", "o Desdentado", "da Lama", "Tocha-Curta", "Cara-de-Rato", "Pé-Sujo", "o Azarado", "Mão-Leve"],
  },
  exemploNome: "Ex.: Gertrudes Três-Dedos",
  exemploHistoria: "Por que alguém em sã consciência desce numa masmorra…",
  exemploCenario: "Em branco, o mestre rola na tabela de masmorras. Boa sorte.",
  campos: {
    divindade: {
      exemplo: "Ex.: o Deus das Estradas Esburacadas",
      gerar: lista(["o Deus das Estradas Esburacadas", "a Ordem da Lanterna Fraca", "Santa Tocha, padroeira de quem desce escadas", "o Senhor das Moedas Perdidas", "a Velha da Colheita"]),
    },
    juramento: {
      exemplo: "Ex.: nunca abandonar um companheiro na masmorra (vivo)",
      gerar: lista(["Nunca abandonar um companheiro na masmorra (vivo)", "Proteger os fracos, cobrando preço justo", "Jamais recuar diante de um morto-vivo", "Entregar um terço do saque ao templo", "Não aceitar ouro de necromantes"]),
    },
  },
  deixarParaOSistema: ["alinhamento"],
};
