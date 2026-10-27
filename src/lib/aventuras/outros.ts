import type { Aventura } from "./tipos";

// Horror investigativo dos anos 1920 (d100) e aventura pulp (Fate). Brasil de época, cultos e mistérios da casa.

export const OUTROS: Aventura[] = [
  // ---------- d100: horror investigativo ----------
  {
    id: "ultima-transmissao-de-vila-esperanca",
    sistemas: ["d100"],
    titulo: "A Última Transmissão de Vila Esperança",
    chamada: "Goiás, 1929: a estação de telégrafo parou de transmitir no meio de uma frase. A última palavra foi \"eles\".",
    duracao: "3 sessões",
    recomendado: "investigadores iniciantes",
    tom: "terror lento e opressivo",
    cenario:
      "Goiás, 1929. A estação telegráfica de Vila Esperança, posto avançado da linha que corta o sertão, parou de transmitir no meio de uma frase. A Repartição dos Telégrafos manda uma pequena expedição verificar: o grupo, por dinheiro, curiosidade ou obrigação. São quatro dias de estrada de terra, depois de rio, depois de mato.",
    abertura:
      "Quarto dia de viagem. A canoa encosta no barranco de Vila Esperança ao cair da tarde: um punhado de casas de taipa, a capela, a estação com os fios caídos. Nenhum cachorro late. Nas portas das casas, alguém pintou com cal o mesmo símbolo, um círculo cortado por três linhas. Dentro da estação, o telégrafo ainda está quente, e a fita de papel no chão repete a mesma palavra, centenas de vezes: \"eles eles eles eles\".",
    roteiro: {
      verdade:
        "O telegrafista Anselmo Prado captou na linha, de madrugada, uma transmissão que não vinha de lugar nenhum: códigos de uma coisa enterrada sob a serra, que usa os fios como nervos. Os moradores que ouviram foram \"chamados\" e desceram para uma gruta sob a capela, onde cavam para libertar a coisa. Anselmo cortou a linha para impedir que a mensagem chegasse ao litoral, e agora se esconde. Reconectar a linha espalha o chamado pelo país.",
      npcs: [
        { nome: "Anselmo Prado", quem: "telegrafista escondido no mato", voz: "sussurra, bate os dedos em código sem perceber", quer: "que ninguém religue a linha", segredo: "ouviu a mensagem inteira e está começando a entender" },
        { nome: "Padre Benedito", quem: "pároco da vila", voz: "calmo demais, sorri com os dentes sujos de terra", quer: "\"abrir o caminho para a palavra\"", segredo: "lidera os escavadores sob a capela" },
        { nome: "Dona Zulmira", quem: "benzedeira, única moradora lúcida", voz: "reza em voz alta, fala com os santos como vizinhos", quer: "salvar o neto, que desceu para a gruta", segredo: "suas rezas abafam o chamado por algum tempo" },
        { nome: "Engenheiro Klaus Weber", quem: "engenheiro alemão da linha telegráfica que chega depois", voz: "formal, impaciente, mede tudo", quer: "religar a linha a qualquer custo", segredo: "já estudou transmissões assim e foi enviado para captar a mensagem" },
      ],
      locais: [
        { nome: "Estação telegráfica", texto: "fita com \"eles\", diário de Anselmo, fios cortados" },
        { nome: "Capela", texto: "chão com terra revirada, alçapão sob o altar" },
        { nome: "Casa de Dona Zulmira", texto: "velas, santos, o único lugar onde não se ouve o zumbido" },
        { nome: "A gruta sob a serra", texto: "escavadores, paredes com o símbolo, a coisa enterrada" },
      ],
      pistas: [
        "O diário de Anselmo na estação descreve a transmissão e o símbolo; a fita tem trechos de código Morse com coordenadas.",
        "O símbolo nas portas é o mesmo gravado nas paredes da gruta e na batina do padre.",
        "Dona Zulmira conta que o povo desce para a capela à noite e não volta.",
        "Anselmo, achado no mato, explica por que cortou a linha; Weber, ao chegar, deixa escapar que já conhecia o fenômeno.",
      ],
      reviravoltas: ["Quem cortou a linha é o herói, não o vilão.", "O engenheiro que vem \"ajudar\" quer religar a linha de propósito."],
      relogio: ["um investigador começa a ouvir o zumbido nos fios", "mais moradores descem para a gruta", "Weber chega e começa a religar a linha", "a escavação abre a câmara e a coisa acorda"],
      finais: [
        "a gruta desmoronada com dinamite e a linha destruída: a vila perdida, o mundo salvo",
        "os moradores resgatados e a linha cortada para sempre: Weber some com segredos",
        "a linha religada: a mensagem chega ao litoral e o grupo vê os jornais mudarem",
      ],
      recompensas: "O pagamento da Repartição, o diário de Anselmo (conhecimento proibido, custa Sanidade), Dona Zulmira como aliada e um inimigo estrangeiro.",
    },
  },
  {
    id: "cripta-fora-da-planta",
    sistemas: ["d100"],
    titulo: "A Cripta Fora da Planta",
    chamada: "Ouro Preto, 1923: na reforma de uma igreja barroca, os pedreiros acharam uma cripta que não está em planta nenhuma. E os santos de lá não são santos.",
    duracao: "2 sessões",
    recomendado: "investigadores iniciantes",
    tom: "investigação metódica com horror barroco",
    cenario:
      "Ouro Preto, inverno de 1923. Na reforma da Igreja de Nossa Senhora das Dores, os pedreiros quebraram uma parede falsa e acharam uma cripta selada que não aparece em nenhum registro. Dois pedreiros sumiram desde então. A Irmandade que cuida da igreja quer discrição; um jornal do Rio quer escândalo. O grupo foi chamado por um dos dois.",
    abertura:
      "Neblina nas ladeiras de pedra de Ouro Preto. Dentro da igreja, andaimes, cheiro de cal e de vela. O mestre de obras, chapéu na mão, leva o grupo até a parede quebrada atrás do altar: uma escada desce para o escuro. Lá embaixo, nichos com estátuas de santos de madeira, todos de costas para a entrada. Uma delas está virada de frente. O mestre de obras jura: \"Ontem estava de costas, igual às outras.\"",
    roteiro: {
      verdade:
        "No século XVIII, o escultor Mestre Valentim Dias, para salvar a filha da peste, aceitou de uma confraria secreta a encomenda de imagens que aprisionam almas. Cada \"santo\" da cripta contém alguém. A confraria ainda existe, disfarçada na Irmandade, e alimenta as imagens com vítimas para manter a fortuna da cidade. Os pedreiros sumidos estão nas duas imagens novas, de madeira ainda clara.",
      npcs: [
        { nome: "Provedor Aurélio Vasconcelos", quem: "chefe da Irmandade, comerciante rico", voz: "cortês, fala latim nas horas erradas", quer: "a cripta lacrada e o grupo longe", segredo: "lidera a confraria e escolhe as vítimas" },
        { nome: "Joaquim Ferreira", quem: "mestre de obras", voz: "humilde, supersticioso, faz o sinal da cruz a cada frase", quer: "achar os dois companheiros", segredo: "viu o Provedor entrar na cripta de madrugada" },
        { nome: "Cecília Moura", quem: "repórter do Rio", voz: "atrevida, fuma cigarrilhas, anota tudo", quer: "a manchete do ano", segredo: "o avô dela foi uma das vítimas e ela sabe disso" },
        { nome: "Irmã Glória", quem: "freira idosa que cuida do arquivo", voz: "gentil, esquecida, de repente lúcida", quer: "paz para as almas", segredo: "guarda o livro de encomendas original do escultor" },
      ],
      locais: [
        { nome: "A igreja em reforma", texto: "andaimes, altar dourado, parede quebrada" },
        { nome: "A cripta", texto: "santos de costas, nichos, uma imagem que se vira" },
        { nome: "Arquivo da Irmandade", texto: "livros de 1700, plantas da igreja, poeira" },
        { nome: "Solar do Provedor", texto: "capela particular, sala de reuniões da confraria" },
      ],
      pistas: [
        "As plantas no arquivo mostram que a parede falsa foi erguida em 1752, junto com a encomenda das imagens.",
        "As duas imagens novas têm madeira fresca, roupas dos pedreiros e cheiro de suor.",
        "Joaquim viu o Provedor entrar na cripta; Cecília sabe do avô desaparecido.",
        "O livro de encomendas de Irmã Glória descreve o ritual e como libertar as almas (fogo de cera benta).",
      ],
      reviravoltas: ["Os santos são prisões, e as vítimas ainda estão conscientes.", "A Irmandade que contratou (ou atrapalha) o grupo é a confraria."],
      relogio: ["mais uma imagem se vira de frente", "Cecília desaparece", "o Provedor manda lacrar a cripta com o grupo dentro", "a confraria faz um novo ritual com uma vítima viva"],
      finais: [
        "as imagens queimadas: as almas livres e a confraria exposta, a cidade em escândalo",
        "a cripta lacrada de novo: o segredo continua e o grupo vive com o que viu",
        "o grupo fica com o livro de encomendas: poder enorme e uma confraria no encalço",
      ],
      recompensas: "Pagamento do jornal ou da Irmandade, o livro de encomendas (conhecimento proibido), uma aliada repórter e a gratidão de almas antigas.",
    },
  },

  // ---------- Fate: pulp ----------
  {
    id: "roubo-do-cristo-redentor",
    sistemas: ["fate"],
    titulo: "O Roubo do Cristo Redentor",
    chamada: "Rio, 1935: uma sociedade de cientistas loucos quer roubar o Cristo Redentor com um dirigível. Sim, a estátua inteira. E vocês estão no caminho.",
    duracao: "2 sessões",
    recomendado: "heróis pulp de qualquer tipo",
    tom: "pulp e explosivo",
    cenario:
      "Rio de Janeiro, 1935. A Sociedade Ômega, clube de cientistas geniais e ofendidos, anunciou por carta ao presidente que vai \"levar o símbolo da cidade\" para sua base secreta em três dias. Ninguém acreditou. Até que um dirigível do tamanho de um quarteirão apareceu sobre o Corcovado. Os heróis são a única coisa entre a Sociedade e a estátua.",
    abertura:
      "Baile de gala no Copacabana Palace, terraço lotado de smokings e vestidos de cetim. A orquestra toca um samba-canção quando as luzes da orla se apagam de uma vez. No céu, um dirigível negro com o símbolo de um ômega dourado surge sobre o Corcovado, e um holofote ilumina a estátua. No alto-falante do dirigível, uma voz de mulher, calma e divertida: \"Boa noite, Rio. Em três noites, levaremos o seu Cristo. Tentem nos impedir. Vai ser divertido.\"",
    roteiro: {
      verdade:
        "A Sociedade Ômega é liderada pela Doutora Vesper Lacroix, cientista franco-brasileira expulsa da academia. O plano não é roubar a estátua por vaidade: dentro do pedestal há um mapa gravado por um engenheiro da obra, que leva a um depósito de minério raro na Amazônia. Vesper quer o mapa; a estátua inteira é a forma mais espetacular de pegar. O irmão dela, o capitão Mauro Lacroix, trabalha com a polícia e quer prendê-la sem que ela se machuque.",
      npcs: [
        { nome: "Doutora Vesper Lacroix", quem: "líder da Sociedade Ômega", voz: "elegante, ironia afiada, ri das próprias invenções", quer: "o mapa e humilhar a academia", segredo: "não quer ferir ninguém; seu braço direito quer" },
        { nome: "Barão Krüger", quem: "braço direito de Vesper, engenheiro de guerra", voz: "voz grave, sotaque pesado, sem humor", quer: "vender o minério para quem pagar mais (guerra)", segredo: "planeja trair Vesper e derrubar o dirigível sobre a cidade se der errado" },
        { nome: "Capitão Mauro Lacroix", quem: "policial e irmão de Vesper", voz: "certinho, sotaque carioca, fala de regras", quer: "prender a irmã sem que ela morra", segredo: "ajudou Vesper a fugir uma vez" },
        { nome: "Zé Pequeno das Asas", quem: "aviador malandro com um hidroavião velho", voz: "gírias, aposta em tudo", quer: "dinheiro e fama", segredo: "já trabalhou para a Sociedade e sabe a entrada do dirigível" },
      ],
      locais: [
        { nome: "Copacabana Palace", texto: "baile, ricos, espiões" },
        { nome: "Corcovado", texto: "a estátua, guardas, ganchos de aço sendo instalados" },
        { nome: "O dirigível Ômega", texto: "laboratórios, robôs, a sala do mapa" },
        { nome: "Base secreta na Ilha Fiscal", texto: "hangar escondido, torre de rádio" },
      ],
      pistas: [
        "Os ganchos presos ao pedestal miram uma placa de bronze específica (o mapa).",
        "Zé Pequeno conhece a entrada do dirigível; Mauro conhece a irmã.",
        "Documentos da obra no Arquivo Nacional citam o engenheiro e o \"segredo do pedestal\".",
        "Krüger fala ao rádio com compradores estrangeiros: interceptar mostra a traição.",
      ],
      reviravoltas: ["A estátua é a isca, o alvo é o mapa no pedestal.", "A vilã não é a pior pessoa no dirigível."],
      relogio: ["ganchos instalados no Corcovado", "robôs da Sociedade atacam a polícia", "o dirigível ergue a estátua", "Krüger toma o comando e ameaça a cidade"],
      finais: [
        "Vesper vira aliada contra Krüger e o dirigível cai no mar: a estátua salva",
        "a Sociedade presa com o mapa confiscado: fama e uma vilã que vai voltar",
        "o grupo foge com o mapa: a próxima aventura é na Amazônia",
      ],
      recompensas: "Fama (um aspecto novo), uma invenção da Sociedade Ômega, uma vilã que respeita o grupo e o mapa para a próxima aventura.",
    },
  },
  {
    id: "corrida-para-a-cidade-de-ouro",
    sistemas: ["fate"],
    titulo: "A Corrida para a Cidade de Ouro",
    chamada: "Amazônia, 1931: aviões, barcos e trapaça na corrida até uma cidade perdida de ouro. Quem chegar primeiro fica rico. Quem chegar segundo vira lenda (de mortos).",
    duracao: "3 sessões",
    recomendado: "heróis pulp de qualquer tipo",
    tom: "aventura de matinê",
    cenario:
      "Manaus, 1931. Um explorador moribundo chega à cidade com um ídolo de ouro e um mapa pela metade de Paititi, a cidade perdida. Em dois dias, três expedições partem: uma de magnata americano, uma de nazistas disfarçados de cientistas e a dos heróis, financiada com o que sobrou. É uma corrida: rio acima, mata adentro e trapaça o caminho todo.",
    abertura:
      "Porto de Manaus, calor de rachar. O Teatro Amazonas brilha ao fundo. Os heróis embarcam no vapor velho Iara quando um tiro acerta a chaminé. No cais, um carro preto foge, e alguém joga um pacote no convés: a outra metade do mapa, enrolada num bilhete. \"Eles vão matar vocês por isto. Corram. — Professor A.\" No rio, a lancha do magnata já sai em disparada e um hidroavião com cruz negra ronca no céu.",
    roteiro: {
      verdade:
        "Paititi existe, mas não é de ouro: é o templo de um povo que guardou ali um meteorito que cura e mata. O professor Alcides Brandão, verdadeiro descobridor, quer que ninguém o ache; mandou a metade do mapa aos heróis por ser o grupo \"menos perigoso\". O magnata Harold Biggs quer o ouro; os nazistas querem o meteorito como arma. Os guardiões do templo, os Filhos da Pedra, deixam passar só quem prova respeito.",
      npcs: [
        { nome: "Professor Alcides Brandão", quem: "arqueólogo que mandou o mapa", voz: "agitado, fala com citações, ajeita os óculos", quer: "proteger Paititi", segredo: "está seguindo os heróis disfarçado de barqueiro" },
        { nome: "Harold Biggs", quem: "magnata americano", voz: "barulhento, oferece dinheiro para tudo", quer: "o ouro e as manchetes", segredo: "é covarde e pode virar aliado no perigo" },
        { nome: "Doutora Ilse Hartmann", quem: "líder da expedição nazista", voz: "fria, educada, cita ciência", quer: "o meteorito para o Reich", segredo: "o meteorito está matando ela devagar desde que tocou um fragmento" },
        { nome: "Tainá", quem: "guia indígena contratada pelos heróis", voz: "direta, irônica, ri dos estrangeiros", quer: "que ninguém destrua a floresta", segredo: "é dos Filhos da Pedra e testa o grupo" },
      ],
      locais: [
        { nome: "Rio Negro acima", texto: "perseguição de barcos, piranhas, corredeiras" },
        { nome: "Seringal abandonado", texto: "acampamento rival, sabotagem noturna" },
        { nome: "A Escada das Cobras", texto: "penhasco com armadilhas antigas" },
        { nome: "Paititi", texto: "templo de pedra, o meteorito, os guardiões" },
      ],
      pistas: [
        "As duas metades do mapa juntas só fazem sentido lidas de cabeça para baixo (Tainá percebe, ou um herói erudito).",
        "O ídolo de ouro tem gravado um aviso que Tainá traduz: \"a pedra cobra\".",
        "Biggs tem a carta do explorador moribundo descrevendo o \"fogo verde\"; Ilse tem o fragmento.",
        "O barqueiro que segue o grupo sabe demais sobre o templo.",
      ],
      reviravoltas: ["A cidade de ouro é um templo com algo muito mais valioso e perigoso.", "A guia é uma guardiã e o grupo está sendo julgado."],
      relogio: ["os nazistas sabotam o vapor", "Biggs chega primeiro à Escada das Cobras", "Ilse toca o meteorito", "o templo desaba e a floresta queima"],
      finais: [
        "o meteorito protegido com Tainá e os Filhos da Pedra: o grupo ganha amigos e uma lenda",
        "o meteorito destruído e o templo enterrado: ninguém fica rico, todos vivem",
        "o grupo foge com um pouco de ouro e muitos inimigos: Biggs paga bem pela história",
      ],
      recompensas: "Ouro do templo (um aspecto de riqueza temporária), um ídolo mágico, fama e a amizade (ou a inimizade) de um magnata.",
    },
  },
];
