import type { Aventura } from "./tipos";

// Vampiro: A Máscara 5ª — noites brasileiras. Fã-conteúdo: Camarilla, Anarquistas e clãs genéricos; NPCs todos da casa.
// Todas rodam com um personagem só (solo.aliado divide as cenas) e amarram uma Pedra de Toque da ficha (pedraEmJogo).
// O sabor vem do trabalho, da classe e da geografia de cada cidade, não de cartão-postal.

export const VAMPIRO: Aventura[] = [
  {
    id: "noite-de-sangue-em-brasilia",
    sistemas: ["vtm5"],
    titulo: "Noite de Sangue em Brasília",
    chamada: "Um assessor drenado no Congresso, um vídeo viral e o Príncipe quer um culpado antes do amanhecer. Pode ser você.",
    duracao: "one-shot",
    recomendado: "neófito recém-apresentado à corte, sozinho ou em coterie",
    tom: "intriga política noturna",
    cenario:
      "Brasília, uma noite de seca. Um assessor parlamentar apareceu drenado no estacionamento do Congresso e o vídeo já viralizou como \"ataque de animal\". O Senescal da Camarilla dá a você até o amanhecer para entregar um culpado ao Príncipe. Entre o Eixo Monumental, as superquadras e as satélites, todo mundo tem um motivo e ninguém quer ser o bode.",
    abertura:
      "O celular vibra com 14 segundos de vídeo tremido: um homem de terno caído entre carros oficiais e um vulto de capacete de entregador debruçado sobre ele. Dois milhões de visualizações. Um sedã preto de placa oficial encosta; no banco de trás, o Senescal Augusto Brandão, terno risca de giz: \"O Príncipe quer um nome até o sol nascer. Ache um. De preferência o verdadeiro.\"",
    roteiro: {
      verdade:
        "Rodrigo Paiva, assessor e carniçal da Primogênita Cecília Arruda, guardava num pen drive a contabilidade de sangue da corte (cargos trocados por rebanho). O Senescal aparece nela: mandou Iara Moura matá-lo e expor o corpo para culpar os Anarquistas de Ceilândia e ganhar uma \"limpeza\" das satélites. Kauã, sangue-ralo, achou Rodrigo morrendo, bebeu e levou o pen drive sem saber o que era. É ele no vídeo.",
      npcs: [
        { nome: "Augusto Brandão", quem: "Senescal, quem contrata o personagem", voz: "baixa e paciente, cita a Constituição", quer: "Caçada de Sangue em Ceilândia e o trono depois", segredo: "é o mandante; se o personagem falhar, acusa-o de quebrar a Máscara" },
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
      reviravoltas: ["Kauã não matou: chegou depois e só bebeu do moribundo.", "Quem contratou o personagem é o mandante, e o plano B dele é o próprio personagem."],
      relogio: [
        "a imprensa batiza \"o Vampiro da Esplanada\" e caçadores começam a farejar",
        "Iara acha o rastro de Kauã",
        "Brandão pede a Caçada de Sangue contra Ceilândia",
        "amanhecer: Kauã morto, pen drive com o Senescal, personagem desacreditado ou acusado",
      ],
      finais: [
        "Brandão exposto com o pen drive e Iara de testemunha: favor do Príncipe, inimigos no alto",
        "Kauã entregue: paz de fachada, Ceilândia jura vingança, a consciência cobra",
        "ficar com o pen drive e chantagear todos: poder e um alvo nas costas",
      ],
      recompensas: "Status na Camarilla ou com os Anarquistas, um favor de Cecília, Kauã como contato leal, Influência na Esplanada.",
      sessoes: ["Vídeo e Senescal; rastro de Kauã (IML, motoboys, Feira da Torre); Cida; Iara caçando; a escolha antes do sol."],
      encontros: [
        {
          nome: "Iara Moura",
          onde: "onde Kauã estiver",
          inimigos: "Saúde 8, Destreza+Armas Brancas 8 dados (faca +1), Celeridade 2, Ofuscação 2",
          tatica: "some e volta, mira Kauã",
          saida: "recua com 4 de dano ou se souber que Brandão vai entregá-la",
        },
        {
          nome: "Gente da Cida",
          onde: "galpão de Ceilândia",
          inimigos: "3 Anarquistas (Saúde 7, Força+Briga 6 dados, Potência 1)",
          tatica: "cercam na pista e levam aos fundos",
          saida: "Cida para se ouvir de Kauã sem ameaça",
        },
      ],
      complicacoes: [
        "um repórter liga: deram o nome do personagem",
        "Kauã liga e desliga ao ouvir um carro",
        "a Fome sobe e a presa à mão viu o vídeo",
        "Cecília manda um carniçal vigiar",
        "Brandão adianta o prazo",
        "o legista quer mais que dinheiro",
      ],
    },
    solo: { aliado: "Nonato, motorista carniçal que o Senescal empresta" },
    pedraEmJogo: "ela aparece ao fundo do vídeo viral e vira a testemunha que a polícia e Iara querem ouvir",
  },
  {
    id: "rostos-que-nao-envelhecem",
    sistemas: ["vtm5"],
    titulo: "Os Rostos que Não Envelhecem",
    chamada: "Um perfil anônimo posta fotos de 1970 ao lado de fotos de ontem. Mesma cara. O seu rosto é o próximo.",
    duracao: "3 sessões",
    recomendado: "vampiro com passado (ou que deve a um ancião), sozinho ou em coterie",
    tom: "paranoia de quem é caçado",
    cenario:
      "São Paulo, garoa fina. O perfil @NaoEnvelhecem cruza fotos antigas de jornal com fotos novas de festas e expõe rostos que não mudaram em cinquenta anos. Dois membros da corte já foram expostos; um virou cinza num estacionamento da Barra Funda. A Harpia quer o perfil derrubado em silêncio, e você conhece gente demais com foto antiga.",
    abertura:
      "Festa num casarão da Bela Vista, som abafado, gente bonita demais. No celular de um convidado, o post novo de @NaoEnvelhecem: uma foto de 1974 e outra da semana passada de alguém que você conhece bem. Legenda: \"Esse aí está numa festa agora mesmo.\" Do outro lado da sala, o exposto olha para a porta. Lá fora, um furgão branco estaciona com o motor ligado.",
    roteiro: {
      verdade:
        "O perfil é de Lívia Sato, analista de dados que perdeu o irmão Hugo para \"gente da noite\" e usa reconhecimento facial em acervos de jornais. A Vigília, ex-policiais caçadores, usa as listas para matar. As melhores fotos vêm de uma \"Fonte 26\": é Hugo, hoje carniçal do ancião Ernesto Valadares, expondo os rivais do mestre e achando que assim protege a irmã.",
      npcs: [
        { nome: "Lívia Sato", quem: "criadora do perfil", voz: "rápida, sarcástica, fala em métricas", quer: "provar que monstros existem e achar o irmão", segredo: "já desconfia que a Fonte 26 a usa" },
        { nome: "Hugo Sato", quem: "irmão dela, motorista e carniçal de Valadares", voz: "calado, educadíssimo, cigarro de cravo", quer: "proteger a irmã e ser Abraçado", segredo: "é a Fonte 26" },
        { nome: "Ernesto Valadares", quem: "ancião Toreador, colecionador da corte", voz: "locutor de rádio antigo, \"minha querida\"", quer: "apagar rivais sem sujar as luvas", segredo: "Hugo guarda uma foto dele de 1958" },
        { nome: "Rosana Batista", quem: "tenente reformada, líder da Vigília", voz: "seca, reza o terço antes de agir", quer: "limpar a cidade antes de morrer", segredo: "câncer terminal; um \"milagre\" de sangue a tentaria" },
        { nome: "Tião Chiado", quem: "Nosferatu das galerias sob o Anhangabaú", voz: "risada chiada, responde com charadas de camelô do Centro", quer: "pagamento em segredos", segredo: "vendeu o nome de Lívia também a Valadares" },
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
        "Tião sabe o bairro de onde o perfil posta, mas cobra um segredo do personagem.",
        "Todos os expostos são rivais de Valadares; quem tem Status ou ouve a Harpia nota o padrão.",
        "Hugo aparece de fundo numa foto recente; o grupo de mensagens da Vigília pode ser infiltrado.",
      ],
      reviravoltas: ["Lívia é a ferramenta; a mão que a guia está dentro da corte.", "A Fonte 26 é Hugo, o irmão que ela procura, servindo o vampiro que ela mais deveria expor."],
      relogio: ["post expõe um aliado do personagem", "a Vigília mata o exposto e filma as cinzas", "post com o refúgio ou o rosto antigo do personagem", "o Príncipe ordena caçar Lívia e quem a protegeu; Valadares sobe"],
      finais: [
        "Valadares exposto à corte com Hugo de testemunha, perfil desmontado sem mortes",
        "Lívia silenciada: a Máscara respira, Hugo vira inimigo jurado, a Humanidade sangra",
        "Lívia aliada, expondo só quem o personagem indicar: arma perigosa",
      ],
      recompensas: "Favor da Harpia, Lívia ou Hugo como Contato, as fotos de Valadares como moeda, Status na corte paulistana.",
      sessoes: [
        "Festa, furgão da Vigília, primeiro exposto; acervo e Tião. Gancho: post com um rosto próximo.",
        "Lívia, a Vigília no Minhocão, o padrão de Valadares. Gancho: Hugo ao fundo de uma foto.",
        "Hugo entre a irmã e o mestre, o casarão e a escolha diante da Harpia.",
      ],
      encontros: [
        {
          nome: "Vigília",
          onde: "Minhocão",
          inimigos: "4 ex-policiais (Saúde 6, Destreza+Armas de Fogo 6 dados, espingarda +4) e Rosana (Saúde 7, fé: Frenesi de terror dif. 3)",
          tatica: "filmam e atiram em quem foge",
          saida: "recuam com dois caídos",
        },
        {
          nome: "Hugo",
          onde: "garagem de Valadares",
          inimigos: "carniçal: Saúde 7, Força+Briga 5 dados, Potência 1, pistola +2",
          tatica: "foge antes de ferir",
          saida: "conta tudo se a irmã correr perigo",
        },
      ],
      complicacoes: [
        "post marca o bairro do refúgio",
        "Lívia marca encontro num lugar cheio",
        "Tião cobra na pior hora",
        "a Harpia exige um nome",
        "um vizinho acha o personagem numa foto de 1980",
        "a Vigília segue um aliado",
      ],
    },
    solo: { aliado: "Dênis, Nosferatu novato aprendiz de Tião, bom de câmera" },
    pedraEmJogo: "a Vigília tem a foto dela ao lado da do personagem, e Rosana a procura",
  },
  {
    id: "cinzas-na-lapa",
    sistemas: ["vtm5"],
    titulo: "Cinzas na Lapa",
    chamada: "Carnaval no Rio, baile de máscaras no Elysium e três noites para roubar do Príncipe o livro onde está a dívida de todo mundo.",
    duracao: "2 sessões",
    recomendado: "quem deve um favor a uma Baronesa, sozinho ou em coterie",
    tom: "golpe elegante com samba e sangue",
    cenario:
      "Rio de Janeiro, Carnaval. Enquanto os blocos tomam a Lapa, o Príncipe dá no casarão-Elysium de Santa Teresa o baile de máscaras em que, na Quarta-Feira de Cinzas, as dívidas de favor da cidade são cobradas. Uma Baronesa Anarquista a quem você deve quer que você roube o livro onde elas estão escritas. Um golpe, uma festa, três noites.",
    abertura:
      "Sábado de Carnaval sob os Arcos da Lapa: marchinha, purpurina, cerveja quente no chão. Uma mulher de lantejoulas prateadas e navalha presa no cabelo abre caminho com dois copos que ninguém pediu. Zezé Navalha não sorri à toa: \"Você me deve. Na quarta o Príncipe cobra as dívidas da cidade num livro. Eu quero o livro. Você tem três noites; eu tenho a lista de convidados.\"",
    roteiro: {
      verdade:
        "O Príncipe Ventrue Dom Henrique Alcântara guarda no Elysium o Livro de Favores com as dívidas da corte, inclusive as do personagem. Zezé diz que quer libertar a cidade, mas quer ser a nova cobradora. O livro do cofre é isca: o Príncipe montou o baile para pegar um traidor. As dívidas de verdade estão na memória perfeita de Mirtes, a Harpia Malkaviana.",
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
      relogio: ["Ozório reforça a segurança da adega", "Deco entrega o plano ao Príncipe", "um bode expiatório é punido diante da corte", "Quarta-Feira de Cinzas: as dívidas do personagem são cobradas de uma vez"],
      finais: [
        "Mirtes libertada: as dívidas fogem com ela, a corte vira caos e ela fica devendo ao personagem",
        "Zezé entregue ao Príncipe: dívidas perdoadas, Anarquistas inimigos para sempre",
        "livro falso para Zezé e o personagem como novo dono de dívidas alheias",
      ],
      recompensas: "Dívidas apagadas ou trocadas de dono, favor do Príncipe ou de Zezé, Mirtes como aliada imprevisível, refúgio no barracão.",
      sessoes: [
        "Bloco na Lapa, Zezé, Deco e a planta; sondar o Elysium. Gancho: Ozório fareja o personagem.",
        "Baile, cofre falso, Mirtes e a fuga pela escadaria; a Quarta de Cinzas cobra quem sobrou.",
      ],
      encontros: [
        {
          nome: "Guarda da adega",
          onde: "Elysium",
          inimigos: "2 carniçais (Saúde 6, Força+Briga 5 dados, cassetete +2) e Ozório (Saúde 9, Força+Briga 7 dados, Potência 2, Animalismo 2)",
          tatica: "trancam a adega e chamam o Príncipe",
          saida: "Ozório vira a casaca por uma dívida de Zezé",
        },
        {
          nome: "Gente de Zezé",
          onde: "barracão",
          inimigos: "3 Anarquistas (Saúde 7, Força+Briga 6 dados, navalha +1)",
          tatica: "aparecem se o livro não vier inteiro",
          saida: "param quando Zezé ganha algo",
        },
      ],
      complicacoes: [
        "o bloco separa o personagem de quem estava junto",
        "Deco toca bossa nova: está mentindo",
        "um convidado reconhece a máscara",
        "Mirtes recita em público uma dívida dele",
        "a polícia fecha a rua de fuga",
        "Zezé antecipa o golpe",
      ],
    },
    solo: { aliado: "Jandira, costureira do barracão e carniçal de Zezé" },
    pedraEmJogo: "Deco a conhece e a usa para chantagear; o Príncipe a convida para o baile",
  },

  // ---------- feitas para quem joga sozinho: um personagem, um aliado, uma Pedra de Toque em perigo ----------
  {
    id: "primeira-noite-em-bh",
    sistemas: ["vtm5"],
    titulo: "A Primeira Noite",
    chamada: "Você acorda num motel da Avenida do Contorno, morto e com fome. Ninguém veio explicar. O sol nasce às 5h40.",
    duracao: "one-shot",
    recomendado: "personagem recém-Abraçado; ensina caça, Despertar e Máscara na prática",
    tom: "horror de quem acabou de morrer",
    cenario:
      "Belo Horizonte, uma madrugada de terça. Você saiu de um bar na Savassi, alguém te seguiu, e agora acorda num quarto de motel sem pulso, sem fome de comida e com trinta chamadas perdidas no celular. Não há Senhor, não há regras escritas, só um bilhete. Entre a rodoviária, as UPAs de plantão e os viadutos do centro, você tem até o sol para aprender a ser o que é.",
    abertura:
      "O ar-condicionado do motel pinga no carpete. Você acorda de roupa, frio como a parede, e o espelho do teto mostra a cama vazia. No criado-mudo, um capacete de motoboy e um bilhete em letra tremida: \"Desculpa. Não procura a Camarilla. Come antes de amanhecer, mas não mata ninguém.\" O celular vibra: é alguém que você ama, pela trigésima vez. Lá fora, a recepcionista bate na porta: \"Moço? O pernoite acabou faz uma hora.\"",
    roteiro: {
      verdade:
        "Teco Fagundes, Brujah sem domínio e ex-motoboy, Abraçou o personagem por solidão, num impulso, sem pedir licença ao Príncipe. A lei de BH pune os dois com a Morte Final. Apavorado, deixou a cria no motel e se escondeu sob o Viaduto Santa Tereza. A Xerife, Dra. Helena Kfouri, plantonista noturna de uma UPA da zona sul que se alimenta dos plantões, já sentiu um Abraço novo na cidade e caça o rastro. A Pedra de Toque do personagem, procurando por ele, foi parar justamente nessa UPA.",
      npcs: [
        { nome: "Teco Fagundes", quem: "o Senhor, Brujah sem domínio, ex-motoboy", voz: "fala baixo, pede desculpa a cada frase, morde o lábio", quer: "que a cria sobreviva e não o entregue", segredo: "foi Abraçado do mesmo jeito, e o Senhor dele o entregou" },
        { nome: "Dra. Helena Kfouri", quem: "Xerife de BH, médica de plantão noturno", voz: "calma de pronto-socorro, pergunta o nome antes de tudo", quer: "achar o Abraço ilegal antes que o Príncipe saiba", segredo: "perdoa quem se apresentar sozinho antes do sol; ela própria foi Abraçada sem licença" },
        { nome: "Lia Moraes", quem: "estudante que estava no bar", voz: "fala em stories, ansiosa, educada", quer: "saber quem era o moço caído na calçada", segredo: "filmou a mordida sem perceber e vai mostrar o vídeo à polícia" },
        { nome: "Seu Arlindo", quem: "recepcionista do motel, 62 anos", voz: "rádio AM ligado, \"meu filho\"", quer: "o pernoite pago e nenhuma confusão", segredo: "viu Teco sair e anotou a placa da moto" },
      ],
      locais: [
        { nome: "Motel na Avenida do Contorno", texto: "câmera no corredor, recepção de vidro, cheiro de desinfetante" },
        { nome: "Rodoviária de BH", texto: "madrugada de ônibus atrasados, gente sozinha, seguranças" },
        { nome: "UPA da zona sul", texto: "plantão cheio, maca no corredor, a Xerife de jaleco" },
        { nome: "Baixo do Viaduto Santa Tereza", texto: "skate, fogueira de lata, Teco escondido" },
      ],
      pistas: [
        "O capacete tem o adesivo de uma cooperativa de motoboys; a placa que Seu Arlindo anotou leva ao mesmo nome.",
        "O story de Lia mostra o personagem caído e um homem de jaqueta: o rosto de Teco aparece num frame.",
        "Na rodoviária, um segurança comenta da \"doutora da UPA\" que aparece de madrugada e ninguém lembra direito.",
        "Teco, achado, conta a lei do Abraço e que a Xerife perdoa quem se apresenta sozinho, se ainda for noite.",
      ],
      reviravoltas: [
        "A Xerife é a ameaça e a saída: apresentar-se a ela antes do sol é o caminho mais seguro, com Teco ou sem ele.",
        "A Pedra de Toque está de pé no plantão onde Helena se alimenta, e Helena já perguntou o nome de quem ela procura.",
      ],
      relogio: [
        "a Fome aperta: a primeira caça não pode esperar",
        "o story de Lia vira notícia e a polícia pede as câmeras do motel",
        "Helena acha o motel e o rastro de Teco",
        "5h40: sem refúgio, o sol; com a Pedra mordida por quem chegou antes",
      ],
      finais: [
        "apresentar-se a Helena com Teco: os dois vivem, reconhecidos e em dívida com a Xerife",
        "entregar Teco: o personagem é perdoado e carrega o Senhor nas costas para sempre",
        "fugir com Teco para os Anarquistas da periferia: livre, sem nome na corte e caçado",
      ],
      recompensas: "Refúgio (a garagem de Bia ou um quarto de Teco), Bia como Contato, um favor da Xerife ou um Senhor que deve a vida, e uma primeira noite sem matar ninguém.",
      sessoes: ["Motel (pagar ou fugir); primeira caça (rodoviária, UPA ou rua); o story de Lia; Teco no viaduto; a Xerife antes das 5h40."],
      encontros: [
        {
          nome: "Segurança do motel",
          onde: "recepção",
          inimigos: "2 seguranças mortais (Saúde 5, Força+Briga 4 dados, cassetete +2), um filmando",
          tatica: "seguram a porta e chamam a polícia",
          saida: "Dominação, dinheiro ou o muro; bater deixa Mancha e vídeo",
        },
        {
          nome: "Helena Kfouri",
          onde: "UPA",
          inimigos: "Saúde 8, Dominação 3, Fortitude 2, Força+Briga 6 dados",
          tatica: "nunca luta à vista; conversa e manda esquecer",
          saida: "aceita a apresentação",
        },
      ],
      complicacoes: [
        "a Pedra liga e a ligação cai",
        "a presa tem uma criança junto",
        "o reflexo some no vidro diante de alguém",
        "Lia reconhece o personagem",
        "Despertar ruim: o pulso alheio fica alto",
        "Teco liga dizendo que vai se entregar",
      ],
    },
    solo: { aliado: "Bia Cordeiro, sangue-ralo entregadora que caça na rodoviária" },
    pedraEmJogo: "ela procura o personagem no plantão da UPA onde a Xerife come (sem Pedra: a irmã Jéssica, técnica de enfermagem)",
  },
  {
    id: "lista-de-nomes-no-recife",
    sistemas: ["vtm5"],
    titulo: "Lista de Nomes",
    chamada: "Recife: corpos sem sangue no Capibaribe, uma força-tarefa com sete suspeitos e o seu nome é o terceiro da lista.",
    duracao: "2 sessões",
    recomendado: "vampiro Anarquista ou sem seita, com vida mortal ainda por perto",
    tom: "suspense de quem é suspeito",
    cenario:
      "Recife, maré alta e calor de madrugada. Cinco corpos sem sangue apareceram no Capibaribe em dois meses, e uma força-tarefa federal que não é só federal montou uma lista de sete nomes. O seu está nela. Entre as coberturas de Boa Viagem, as palafitas do Coque e o porto, quem souber de onde vem a lista decide quem queima.",
    abertura:
      "Cais da Rua da Aurora, duas da manhã. Você caça perto da água quando os giroflex acendem do outro lado da ponte: estão tirando mais um corpo do rio. No celular, uma mensagem de número desconhecido com uma foto de papel timbrado: OPERAÇÃO MARÉ, SUSPEITOS. O terceiro nome é o seu, com o endereço de quem você mais ama embaixo, marcado como testemunha. Uma moto encosta: \"O Barão quer falar contigo. Agora.\"",
    roteiro: {
      verdade:
        "Os corpos são de Otávio Cavalcanti, vampiro sem seita e herdeiro de usina de açúcar, que se alimenta de porteiros e entregadores do prédio dele em Boa Viagem e joga os restos no rio. O sargento Ivanildo, carniçal dele dentro da força-tarefa, escolhe os nomes da lista: cinco dos sete são Anarquistas, para a Segunda Inquisição limpar a cidade por Otávio. O Barão Biu Lins sabe de tudo: recebe uma taxa de Otávio para fingir que não.",
      npcs: [
        { nome: "Otávio Cavalcanti", quem: "vampiro sem seita, herdeiro de usina, cobertura em Boa Viagem", voz: "cortês de casa-grande, chama todo mundo de \"meu rapaz\"", quer: "continuar comendo sem ninguém olhar", segredo: "Ivanildo é carniçal dele e escreve a lista" },
        { nome: "Delegada Rafaela Sá", quem: "chefe da força-tarefa, Segunda Inquisição", voz: "seca, anota à mão, nunca senta de costas para a porta", quer: "queimar todos os nomes da lista", segredo: "aceita um informante vampiro se ele entregar alguém maior" },
        { nome: "Biu Lins", quem: "Barão Anarquista do Coque", voz: "piadista, sotaque de feira, fica sério de repente", quer: "salvar o domínio, mesmo entregando o personagem", segredo: "recebe uma taxa de Otávio" },
        { nome: "Sargento Ivanildo", quem: "policial da força-tarefa, carniçal de Otávio", voz: "prestativo demais, cheira a perfume caro", quer: "o sangue do patrão e uma promoção", segredo: "editou o horário das câmeras do cais" },
      ],
      locais: [
        { nome: "Cais da Rua da Aurora e as pontes", texto: "rio escuro, câmeras da prefeitura, pescadores de madrugada" },
        { nome: "Edifício Maré Alta, Boa Viagem", texto: "portaria de mármore, elevador de serviço, cobertura de Otávio" },
        { nome: "Palafitas do Coque", texto: "domínio de Biu, mototáxi, gente que não fala com polícia" },
        { nome: "Base da força-tarefa no Recife Antigo", texto: "sobrado reformado, quadro de fotos, cofre de provas" },
      ],
      pistas: [
        "Todas as vítimas trabalhavam ou entregavam no mesmo prédio de Boa Viagem: o app de entregas, o síndico ou um porteiro colega mostram.",
        "As imagens do cais têm horário editado: o personagem aparece onde não estava, em minutos que não fecham.",
        "Cinco nomes da lista são Anarquistas; quem conhece a cena nota que alguém de dentro escolheu.",
        "Dandara viu Biu receber um envelope de um motorista de terno no porto.",
      ],
      reviravoltas: ["O Barão que pede ajuda vende os seus.", "A testemunha que pode condenar o personagem é a única que pode limpá-lo, se viver até depor."],
      relogio: [
        "a testemunha é intimada a depor",
        "batida de dia no refúgio de um Anarquista da lista: cinzas no jornal",
        "Ivanildo vai silenciar a testemunha",
        "operação no refúgio do personagem ao meio-dia",
      ],
      finais: [
        "Otávio entregue à força-tarefa sem quebrar a Máscara dos outros: o Coque respira, Rafaela fica de olho",
        "o personagem vira informante de Rafaela: vivo, útil e com coleira",
        "Biu exposto aos Anarquistas e o personagem como novo Barão: domínio, e Otávio de inimigo",
      ],
      recompensas: "A lista apagada (ou com outro nome), Dandara como Contato, Domínio no Coque ou um favor de Biu, e um inimigo rico em Boa Viagem.",
      sessoes: [
        "Cais, lista e Biu; o prédio de Boa Viagem e as câmeras editadas. Gancho: a testemunha é intimada.",
        "Ivanildo atrás da testemunha, a cobertura de Otávio e quem a força-tarefa leva ao meio-dia.",
      ],
      encontros: [
        {
          nome: "Batida da força-tarefa",
          onde: "refúgio, de dia",
          inimigos: "6 agentes (Saúde 6, Destreza+Armas de Fogo 6 dados, fuzil +3, munição incendiária agravada)",
          tatica: "sol nas janelas, cercam a saída de água",
          saida: "fuga pela maré sob as palafitas",
        },
        {
          nome: "Ivanildo",
          onde: "casa da testemunha",
          inimigos: "carniçal (Saúde 7, Força+Briga 5 dados, Potência 1, pistola +2) e 2 capangas (Saúde 5, 4 dados)",
          tatica: "fingem ser polícia",
          saida: "foge ferido para Otávio",
        },
      ],
      complicacoes: [
        "a testemunha liga assustada",
        "um pescador viu o personagem sair da água",
        "Biu manda outro ao encontro",
        "a maré fecha a rota do Coque",
        "Otávio convida para jantar",
        "um nome da lista vira cinza no jornal",
      ],
    },
    solo: { aliado: "Dandara, mototaxista do Coque e carniçal de Biu" },
    pedraEmJogo: "ela é a testemunha-chave (viu o personagem no cais) e Ivanildo sabe onde ela mora",
  },
  {
    id: "carregamento-em-manaus",
    sistemas: ["vtm5"],
    titulo: "O Carregamento",
    chamada: "Manaus: um contêiner refrigerado no porto, um culto de igreja de bairro, uma Gangrel que desceu da mata e a sua família no meio.",
    duracao: "3 sessões",
    recomendado: "vampiro com família mortal na cidade, sozinho ou em coterie",
    tom: "suspense de porto com a mata à espreita",
    cenario:
      "Manaus, cheia do rio e calor que não passa à noite. Uma balsa trouxe do interior um contêiner refrigerado que ninguém pode abrir, um culto de igreja de bairro está pagando a estivadores para não fazer perguntas e uma Gangrel desceu da mata atrás do que foi roubado dela. O Príncipe quer silêncio. Alguém da sua família assinou o recebimento da carga.",
    abertura:
      "Porto da Manaus Moderna, uma da manhã. As balsas rangem contra os pneus do cais, o cheiro é de diesel e peixe. Do outro lado do galpão, alguém da sua família, de colete refletivo e prancheta, assina um papel para uma mulher de saia comprida e Bíblia na mão. Ela toca o pescoço dele com dois dedos, como quem benze. Ele sorri do jeito errado. Atrás de você, na beira da água, uma voz rouca: \"Esse contêiner é meu. E a tua gente está no caminho.\"",
    roteiro: {
      verdade:
        "No contêiner viaja Velho Anselmo, ancião Gangrel em torpor havia décadas sob uma sumaúma do Rio Negro, mentor de Dita Ferreira. O Ministério, pela pastora Salomé Cunha, comprou a localização e vai leiloar o sangue dele para diablerie. Quem vendeu o lugar foi o Príncipe Dom Alfredo Mendonça, por isso ele quer silêncio. O parente do personagem, conferente no porto, já bebeu duas noites do sangue de Salomé: na terceira, fica preso a ela.",
      npcs: [
        { nome: "Salomé Cunha", quem: "pastora de igreja de bairro, Ministério", voz: "mansa, cita versículo para tudo, nunca levanta a voz", quer: "o leilão sem tumulto e o parente do personagem como carniçal", segredo: "o comprador é um ancião de fora que vai diablerizar Anselmo no porto" },
        { nome: "Dita Ferreira", quem: "Gangrel ribeirinha, filha de criação de Anselmo", voz: "rouca, poucas palavras, cheira a rio", quer: "Anselmo de volta à mata", segredo: "está a uma provocação do frenesi e não liga para a Máscara" },
        { nome: "Dom Alfredo Mendonça", quem: "Príncipe de Manaus, palacete do ciclo da borracha", voz: "educado como cartório, fala do calor", quer: "que tudo suma sem barulho", segredo: "vendeu a localização de Anselmo ao Ministério" },
        { nome: "Robson", quem: "conferente do porto, parente do personagem (se a ficha não trouxer outro)", voz: "piadista cansado, fala de boleto", quer: "dinheiro extra e a família em paz", segredo: "acha que a pastora curou as dores dele; está viciado no sangue" },
      ],
      locais: [
        { nome: "Porto da Manaus Moderna", texto: "balsas, contêineres, turno da madrugada" },
        { nome: "Igreja de Salomé no Jorge Teixeira", texto: "templo de garagem, cadeiras de plástico, porão" },
        { nome: "Palacete do Príncipe no Centro", texto: "azulejos portugueses, ventiladores de teto, cartório de favores" },
        { nome: "Margem do Rio Negro", texto: "voadeiras, sumaúma oca, a mata do outro lado" },
      ],
      pistas: [
        "O manifesto diz \"peças de reposição\", 900 kg num contêiner refrigerado que consome energia como frigorífico de carne.",
        "Robson tem dinheiro novo, duas marcas no pescoço e fala da pastora como de mãe.",
        "Dita rastreia a carga pela balsa; a sumaúma oca tem a terra revirada e uma Bíblia esquecida.",
        "O cartório do palacete guarda o recibo de um favor do Ministério ao Príncipe, datado da semana do roubo.",
      ],
      reviravoltas: ["O carregamento é um ancião vivo, e o leilão é diablerie.", "Quem pede silêncio é quem vendeu Anselmo."],
      relogio: [
        "o parente bebe a segunda noite e fica estranho em casa",
        "Dita ataca o porto: vídeo, frenesi, Máscara rachada",
        "terceira noite: o parente fica preso a Salomé",
        "o leilão: Anselmo diablerizado e o Príncipe apaga quem viu, família incluída",
      ],
      finais: [
        "Anselmo devolvido à mata com Dita: a família salva, o Príncipe inimigo silencioso",
        "carga entregue ao Príncipe: silêncio comprado, Dita jura caçar o personagem",
        "o personagem bebe de Anselmo: poder enorme, Manchas e um segredo que mata",
      ],
      recompensas: "Dita como Aliada (ou inimiga), Domínio no porto, um favor do Príncipe ou o recibo como chantagem, e a família ainda em casa.",
      sessoes: [
        "Porto, o parente e Salomé; Dita aparece. Gancho: o parente volta para casa sorrindo errado.",
        "Igreja, a sumaúma oca, o recibo no palacete. Gancho: Dita perde a cabeça no porto.",
        "O leilão: contêiner, comprador, Príncipe e a escolha sobre Anselmo.",
      ],
      encontros: [
        {
          nome: "Obreiros",
          onde: "porto ou igreja",
          inimigos: "4 carniçais (Saúde 6, Força+Briga 5 dados, facão +2) e Salomé (Saúde 8, Presença 3, Ofuscação 2)",
          tatica: "mandam o parente na frente",
          saida: "Salomé recua se o leilão correr risco",
        },
        {
          nome: "Dita em frenesi",
          onde: "cais",
          inimigos: "Saúde 9, Força+Briga 8 dados, garras agravadas, Fortitude 2",
          tatica: "ataca quem cheira a Salomé",
          saida: "o nome de Anselmo a acalma",
        },
      ],
      complicacoes: [
        "a mãe liga: o parente não dormiu em casa",
        "vídeo de garras no porto viraliza",
        "o Príncipe convida para um café",
        "a energia cai e o contêiner esquenta",
        "Salomé oferece curar uma dor da família",
        "a balsa do comprador chega antes",
      ],
    },
    solo: { aliado: "Tonho, barqueiro de voadeira e carniçal de Dita" },
    pedraEmJogo: "se for parente, ela confere a carga e bebe de Salomé (sem Pedra: o primo Robson)",
  },
];
