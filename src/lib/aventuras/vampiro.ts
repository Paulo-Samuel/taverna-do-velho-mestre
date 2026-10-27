import type { Aventura } from "./tipos";

// Vampiro: A Máscara 5ª — noites brasileiras. Fã-conteúdo: Camarilla, Anarquistas e clãs genéricos; NPCs todos da casa.

export const VAMPIRO: Aventura[] = [
  {
    id: "noite-de-sangue-em-brasilia",
    sistemas: ["vtm5"],
    titulo: "Noite de Sangue em Brasília",
    chamada: "Um assessor drenado no Congresso, um vídeo viral e o Príncipe quer um culpado antes do amanhecer. Pode ser você.",
    duracao: "one-shot",
    recomendado: "neófitos recém-apresentados à corte",
    tom: "intriga política noturna",
    cenario:
      "Brasília, uma noite de seca. Um assessor parlamentar apareceu drenado no estacionamento do Congresso e o vídeo já viralizou como \"ataque de animal\". O Senescal da Camarilla dá à coterie até o amanhecer para entregar um culpado ao Príncipe. Entre o Eixo Monumental, as superquadras e as satélites, todo mundo tem um motivo e ninguém quer ser o bode.",
    abertura:
      "Os celulares da coterie vibram juntos: 14 segundos de vídeo tremido, um homem de terno caído entre carros oficiais e um vulto de capacete de entregador debruçado sobre ele. Dois milhões de visualizações. Um sedã preto de placa oficial encosta; no banco de trás, o Senescal Augusto Brandão, terno risca de giz: \"O Príncipe quer um nome até o sol nascer. Achem um. De preferência o verdadeiro.\"",
    roteiro: {
      verdade:
        "Rodrigo Paiva, assessor e carniçal da Primogênita Cecília Arruda, guardava num pen drive a contabilidade de sangue da corte (cargos trocados por rebanho). O Senescal aparece nela: mandou Iara Moura matá-lo e expor o corpo para culpar os Anarquistas de Ceilândia e ganhar uma \"limpeza\" das satélites. Kauã, sangue-ralo, achou Rodrigo morrendo, bebeu e levou o pen drive sem saber o que era. É ele no vídeo.",
      npcs: [
        { nome: "Augusto Brandão", quem: "Senescal, quem contrata a coterie", voz: "baixa e paciente, cita a Constituição", quer: "Caçada de Sangue em Ceilândia e o trono depois", segredo: "é o mandante; se a coterie falhar, acusa os personagens de quebrar a Máscara" },
        { nome: "Cecília Arruda", quem: "Primogênita Ventrue, dona do carniçal morto", voz: "socialite do Lago Sul, \"meu bem\"", quer: "o pen drive, discretamente", segredo: "é ela quem vende os cargos; o pen drive a afunda também" },
        { nome: "Kauã Ribeiro", quem: "sangue-ralo de 19 anos, entregador em Ceilândia", voz: "gíria, fala rápido, chora de raiva", quer: "ver a próxima noite", segredo: "tem o pen drive e viu no sangue de Rodrigo uma mulher de luvas de couro" },
        { nome: "Iara Moura", quem: "Banu Haqim, lâmina do Senescal", voz: "educada demais, frases de três palavras", quer: "apagar Kauã e fechar o contrato", segredo: "matou Rodrigo; despreza Brandão e vira de lado se provarem que ele vai entregá-la" },
        { nome: "Cida Farias", quem: "Baronesa Anarquista Brujah, dona de um galpão de forró", voz: "rouca, ri alto, desconfia de quem vem do Plano", quer: "proteger os seus", segredo: "esconde Kauã e quer o pen drive como moeda" },
      ],
      locais: [
        { nome: "Estacionamento do Anexo do Congresso", texto: "polícia legislativa, câmeras meio apagadas" },
        { nome: "Apartamento de Rodrigo na 308 Sul", texto: "cofre aberto, gato faminto, agenda" },
        { nome: "Elysium num clube náutico do Paranoá", texto: "fofoca como arma" },
        { nome: "Galpão de forró em Ceilândia", texto: "domínio Anarquista" },
      ],
      pistas: [
        "O corpo tem um corte limpo de lâmina (quem matou) e uma mordida desajeitada (quem bebeu): exame, legista subornável do IML ou um Nosferatu.",
        "O vídeo mostra a jaqueta e o número do pedido do aplicativo; isso, um motoboy colega ou boatos na Feira da Torre levam a Cida.",
        "Agenda de Rodrigo: \"A.B. 23h\" na noite da morte; o porteiro viu uma mulher de luvas sair às 23h40.",
        "O pen drive lista pagamentos do Senescal a \"I.M.\"; Cecília, nervosa demais, entrega que ele existe.",
      ],
      reviravoltas: ["Kauã não matou: chegou depois e só bebeu do moribundo.", "Quem contratou a coterie é o mandante, e o plano B dele são os personagens."],
      relogio: [
        "a imprensa batiza \"o Vampiro da Esplanada\" e caçadores começam a farejar",
        "Iara acha o rastro de Kauã",
        "Brandão pede a Caçada de Sangue contra Ceilândia",
        "amanhecer: Kauã morto, pen drive com o Senescal, coterie desacreditada ou acusada",
      ],
      finais: [
        "Brandão exposto com o pen drive e Iara de testemunha: favor do Príncipe, inimigos no alto",
        "Kauã entregue: paz de fachada, Ceilândia jura vingança, a consciência cobra",
        "ficar com o pen drive e chantagear todos: poder e um alvo nas costas",
      ],
      recompensas: "Status na Camarilla ou com os Anarquistas, um favor de Cecília, Kauã como contato leal, Influência na Esplanada.",
    },
  },
  {
    id: "rostos-que-nao-envelhecem",
    sistemas: ["vtm5"],
    titulo: "Os Rostos que Não Envelhecem",
    chamada: "Um perfil anônimo posta fotos de 1970 ao lado de fotos de ontem. Mesma cara. O seu rosto é o próximo.",
    duracao: "3 sessões",
    recomendado: "coterie com pelo menos um membro de algumas décadas",
    tom: "paranoia de quem é caçado",
    cenario:
      "São Paulo, garoa fina. O perfil @NaoEnvelhecem cruza fotos antigas de jornal com fotos novas de festas e expõe rostos que não mudaram em cinquenta anos. Dois membros da corte já foram expostos; um virou cinza num estacionamento da Barra Funda. A Harpia quer o perfil derrubado em silêncio, e a coterie conhece gente demais com foto antiga.",
    abertura:
      "Festa num casarão da Bela Vista, som abafado, gente bonita demais. No celular de um convidado, o post novo de @NaoEnvelhecem: uma foto de 1974 e outra da semana passada de alguém que a coterie conhece bem. Legenda: \"Esse aí está numa festa agora mesmo.\" Do outro lado da sala, o exposto olha para a porta. Lá fora, um furgão branco estaciona com o motor ligado.",
    roteiro: {
      verdade:
        "O perfil é de Lívia Sato, analista de dados que perdeu o irmão Hugo para \"gente da noite\" e usa reconhecimento facial em acervos de jornais. A Vigília, ex-policiais caçadores, usa as listas para matar. As melhores fotos vêm de uma \"Fonte 26\": é Hugo, hoje carniçal do ancião Ernesto Valadares, expondo os rivais do mestre e achando que assim protege a irmã.",
      npcs: [
        { nome: "Lívia Sato", quem: "criadora do perfil", voz: "rápida, sarcástica, fala em métricas", quer: "provar que monstros existem e achar o irmão", segredo: "já desconfia que a Fonte 26 a usa" },
        { nome: "Hugo Sato", quem: "irmão dela, motorista e carniçal de Valadares", voz: "calado, educadíssimo, cigarro de cravo", quer: "proteger a irmã e ser Abraçado", segredo: "é a Fonte 26" },
        { nome: "Ernesto Valadares", quem: "ancião Toreador, colecionador da corte", voz: "locutor de rádio antigo, \"minha querida\"", quer: "apagar rivais sem sujar as luvas", segredo: "Hugo guarda uma foto dele de 1958" },
        { nome: "Rosana Batista", quem: "tenente reformada, líder da Vigília", voz: "seca, reza o terço antes de agir", quer: "limpar a cidade antes de morrer", segredo: "câncer terminal; um \"milagre\" de sangue a tentaria" },
        { nome: "Tião Chiado", quem: "Nosferatu das galerias sob o Anhangabaú", voz: "risada chiada, responde em versos de samba", quer: "pagamento em segredos", segredo: "vendeu o nome de Lívia também a Valadares" },
      ],
      locais: [
        { nome: "Apartamento de Lívia na Liberdade", texto: "sobre uma loja de lanternas, mural de rostos" },
        { nome: "Galerias sob o Anhangabaú", texto: "domínio de Tião" },
        { nome: "Acervo de jornal no Centro", texto: "fotos originais com carimbo" },
        { nome: "Casarão de Valadares em Higienópolis", texto: "quadros cobertos por panos" },
        { nome: "Minhocão de madrugada", texto: "ponto da Vigília" },
      ],
      pistas: [
        "As fotos antigas têm o carimbo do mesmo acervo; o arquivista lembra de uma moça e de um rapaz educado pedindo cópias.",
        "Tião sabe o bairro de onde o perfil posta, mas cobra um segredo de um personagem.",
        "Todos os expostos são rivais de Valadares; quem tem Status ou ouve a Harpia nota o padrão.",
        "Hugo aparece de fundo numa foto recente; o grupo de mensagens da Vigília pode ser infiltrado.",
      ],
      reviravoltas: ["Lívia é a ferramenta; a mão que a guia está dentro da corte.", "A Fonte 26 é Hugo, o irmão que ela procura, servindo o vampiro que ela mais deveria expor."],
      relogio: ["post expõe um aliado da coterie", "a Vigília mata o exposto e filma as cinzas", "post com o refúgio ou o rosto antigo de um personagem", "o Príncipe ordena caçar Lívia e quem a protegeu; Valadares sobe"],
      finais: [
        "Valadares exposto à corte com Hugo de testemunha, perfil desmontado sem mortes",
        "Lívia silenciada: a Máscara respira, Hugo vira inimigo jurado, a Humanidade sangra",
        "Lívia aliada, expondo só quem a coterie indicar: arma perigosa",
      ],
      recompensas: "Favor da Harpia, Lívia ou Hugo como Contato, as fotos de Valadares como moeda, Status na corte paulistana.",
    },
  },
  {
    id: "cinzas-na-lapa",
    sistemas: ["vtm5"],
    titulo: "Cinzas na Lapa",
    chamada: "Carnaval no Rio, baile de máscaras no Elysium e três noites para roubar do Príncipe o livro onde está a dívida de todo mundo.",
    duracao: "2 sessões",
    recomendado: "coterie que deve favores (todas devem)",
    tom: "golpe elegante com samba e sangue",
    cenario:
      "Rio de Janeiro, Carnaval. Enquanto os blocos tomam a Lapa, o Príncipe dá no casarão-Elysium de Santa Teresa o baile de máscaras em que, na Quarta-Feira de Cinzas, as dívidas de favor da cidade são cobradas. Uma Baronesa Anarquista a quem a coterie deve quer que vocês roubem o livro onde elas estão escritas. Um golpe, uma festa, três noites.",
    abertura:
      "Sábado de Carnaval sob os Arcos da Lapa: marchinha, purpurina, cerveja quente no chão. Uma mulher de lantejoulas prateadas e navalha presa no cabelo abre caminho com dois copos que ninguém pediu. Zezé Navalha não sorri à toa: \"Vocês me devem. Na quarta o Príncipe cobra as dívidas da cidade num livro. Eu quero o livro. Vocês têm três noites; eu tenho a lista de convidados.\"",
    roteiro: {
      verdade:
        "O Príncipe Ventrue Dom Henrique Alcântara guarda no Elysium o Livro de Favores com as dívidas da corte, inclusive as da coterie. Zezé diz que quer libertar a cidade, mas quer ser a nova cobradora. O livro do cofre é isca: o Príncipe montou o baile para pegar um traidor. As dívidas de verdade estão na memória perfeita de Mirtes, a Harpia Malkaviana.",
      npcs: [
        { nome: "Zezé Navalha", quem: "Baronesa Anarquista Brujah, ex-passista", voz: "gargalhada, apelida todo mundo", quer: "o livro e o medo que o Príncipe inspira", segredo: "não vai queimar livro nenhum" },
        { nome: "Dom Henrique Alcântara", quem: "Príncipe Ventrue do Rio", voz: "imperador de museu, nunca levanta a voz", quer: "achar o traidor no baile", segredo: "o livro do cofre é falso e há guardas esperando" },
        { nome: "Mirtes", quem: "Harpia Malkaviana", voz: "versos de samba-enredo, ri antes das tragédias", quer: "sair da coleira do Príncipe", segredo: "é o livro de verdade: lembra cada dívida" },
        { nome: "Capitão Ozório", quem: "Xerife Gangrel", voz: "fareja antes de falar, sotaque do subúrbio", quer: "nenhum corpo no Carnaval", segredo: "deve muito a Zezé e pode virar a casaca" },
        { nome: "Deco", quem: "carniçal pianista do Elysium, o homem de dentro", voz: "nervoso, toca bossa nova quando mente", quer: "quebrar o laço de sangue", segredo: "conta tudo ao Príncipe por medo" },
      ],
      locais: [
        { nome: "Bloco sob os Arcos da Lapa", texto: "multidão, máscaras, testemunhas" },
        { nome: "Casarão-Elysium em Santa Teresa", texto: "bonde na porta, salão espelhado, cofre na adega" },
        { nome: "Barracão de escola de samba", texto: "refúgio de Zezé, carros alegóricos" },
        { nome: "Escadaria de azulejos", texto: "rota de fuga lotada" },
      ],
      pistas: [
        "Deco desenha a planta e a troca de guardas, mas o Príncipe sabe que ele desenhou.",
        "O cofre é fácil demais: olho atento, Ozório subornado ou um verso de Mirtes avisam da armadilha.",
        "Mirtes recita dívidas que nem constam no livro; quem ouve com cuidado entende que ela é o arquivo vivo.",
        "Zezé exige o livro intacto e se irrita se falarem em queimá-lo.",
      ],
      reviravoltas: ["O livro do cofre é falso e o baile é uma armadilha para traidores.", "O \"livro\" verdadeiro é uma pessoa: tirá-la do baile é sequestro, não furto."],
      relogio: ["Ozório reforça a segurança da adega", "Deco entrega o plano ao Príncipe", "um bode expiatório é punido diante da corte", "Quarta-Feira de Cinzas: as dívidas da coterie são cobradas de uma vez"],
      finais: [
        "Mirtes libertada: as dívidas fogem com ela, a corte vira caos e ela fica devendo à coterie",
        "Zezé entregue ao Príncipe: dívidas perdoadas, Anarquistas inimigos para sempre",
        "livro falso para Zezé e a coterie como nova dona de dívidas alheias",
      ],
      recompensas: "Dívidas apagadas ou trocadas de dono, favor do Príncipe ou de Zezé, Mirtes como aliada imprevisível, refúgio no barracão.",
    },
  },
];
