import type { Aventura } from "./tipos";

// Fantasia d20 e afins: D&D 5e, Pathfinder 1e, OSR e Dungeon World. Mundos da casa, nomes da casa.

export const FANTASIA: Aventura[] = [
  // ---------- D&D 5e ----------
  {
    id: "mina-que-canta",
    sistemas: ["dnd5e"],
    titulo: "A Mina que Canta",
    chamada: "Os mineiros de Pedravelha ouvem uma canção vindo do fundo da mina. Quem desce para ouvir de perto não volta. Ou volta cantando.",
    duracao: "3 sessões",
    recomendado: "nível 1 a 3",
    tom: "exploração e maravilha com perigo real",
    cenario:
      "Pedravelha, vila de mineiros de prata encravada na serra. Há um mês a mina canta: uma melodia sem palavras que sobe dos túneis mais fundos. Seis mineiros desceram para achar a origem; dois voltaram, sorrindo e cantarolando, sem dizer coisa com coisa. A dona da mina oferece prata a quem calar a canção antes que a vila inteira desça para ouvir.",
    abertura:
      "Fim de tarde na boca da mina de Pedravelha. As famílias esperam em silêncio, lanternas acesas, olhando o escuro. Então a canção sobe dos túneis, doce e triste, e uma mulher grita: o marido dela, coberto de pó de prata, sai da mina andando devagar, os olhos brilhando como moeda nova. Ele passa por todos, para diante do grupo e diz, com uma voz que não é a dele: \"Ela quer conhecer vocês.\"",
    roteiro: {
      verdade:
        "No fundo da mina dorme Lirena, uma jovem dragoa de prata, aprisionada há séculos por um selo anão e só agora alcançada pelas picaretas. A canção é um pedido de ajuda; quem a ouve demais fica \"encantado\", não possuído. Mas o capataz Brom Malhado descobriu que o sangue dela transforma minério comum em prata e quer mantê-la presa, sangrando aos poucos. Os mineiros desaparecidos estão vivos, trabalhando para ele sob o encanto.",
      npcs: [
        { nome: "Dona Ermínia Prates", quem: "dona da mina, viúva prática", voz: "conta tudo em moedas, nunca senta", quer: "a mina funcionando e a vila calma", segredo: "sabe que a prata nova é estranha demais e fingiu não ver" },
        { nome: "Brom Malhado", quem: "capataz anão de barba chamuscada", voz: "gargalhada de taverna, abraça demais", quer: "a dragoa presa e a prata infinita", segredo: "leva os encantados para um túnel secreto" },
        { nome: "Lirena", quem: "dragoa de prata jovem, presa por correntes rúnicas", voz: "melódica, fala em perguntas, curiosa sobre tudo", quer: "liberdade e saber como o mundo mudou", segredo: "está fraca demais para voar; libertada agora, precisaria de ajuda" },
        { nome: "Teodora", quem: "filha de um mineiro sumido, 12 anos", voz: "teimosa, faz mil perguntas", quer: "o pai de volta", segredo: "desenhou o túnel secreto que viu o pai entrar" },
        { nome: "Velho Kassius", quem: "ferreiro anão aposentado", voz: "resmunga, fala de antigamente", quer: "que ninguém quebre o selo", segredo: "seu avô ajudou a prender a dragoa e ele acha que ela é perigosa" },
      ],
      locais: [
        { nome: "Boca da mina e vila", texto: "famílias aflitas, taverna do Picareta" },
        { nome: "Galerias de prata", texto: "trilhos, vagonetes, pontes sobre abismos" },
        { nome: "Túnel secreto de Brom", texto: "mineiros encantados trabalhando em silêncio" },
        { nome: "Câmara do selo", texto: "salão anão com runas, correntes e a dragoa" },
      ],
      pistas: [
        "Os encantados cantarolam sempre virados para o mesmo lado da montanha; seguir a direção leva ao fundo.",
        "Teodora tem o desenho do túnel secreto; um vagonete com prata ainda quente também aponta o caminho.",
        "A prata nova é perfeita demais e tem traços de sangue (ferreiro, magia de detecção ou Kassius contam).",
        "Kassius guarda o diário do avô com a história do selo e a palavra que o abre.",
      ],
      reviravoltas: ["O \"monstro\" é a prisioneira e o anão simpático é o carcereiro.", "Libertar a dragoa derruba metade da mina: tirar os mineiros antes é parte do resgate."],
      relogio: ["mais mineiros descem encantados", "Brom sela os túneis \"por segurança\"", "Lirena enfraquece e a canção vira lamento que enlouquece", "Brom tenta matar Lirena para levar o coração"],
      finais: [
        "Lirena livre e Brom preso: a dragoa vira protetora da serra e amiga do grupo",
        "selo mantido e Brom punido: vila em paz, prata comum e uma canção triste para sempre",
        "acordo com Brom: muita prata e uma dívida terrível com uma dragoa que um dia se solta",
      ],
      recompensas: "300 po em prata, uma escama de prata que resiste ao frio, o favor de uma dragoa e a gratidão da vila.",
    },
  },
  {
    id: "casamento-do-rei-goblin",
    sistemas: ["dnd5e"],
    titulo: "O Casamento do Rei Goblin",
    chamada: "Vocês foram convidados para um casamento goblin como embaixadores da cidade. A noiva não quer casar, o noivo quer guerra e o bolo está vivo.",
    duracao: "one-shot",
    recomendado: "nível 2 a 4",
    tom: "comédia de erros com facas",
    cenario:
      "As Colinas Esburacadas, terra dos goblins do Rei Gnarlo Terceiro (não houve um Primeiro nem um Segundo). Para selar a paz com a cidade de Altamuro, Gnarlo vai se casar com a princesa de um clã rival e convidou embaixadores humanos. O grupo é a embaixada: tem uma noite para manter a paz, sobreviver à festa e não comer nada que se mexa.",
    abertura:
      "O salão do trono goblin é uma caverna decorada com guirlandas de ossos de galinha e um lustre feito de colheres roubadas. Tambores, gritaria, um porco assado correndo pelo salão (ainda não está bem assado). O Rei Gnarlo Terceiro, de coroa de lata, sobe na mesa e aponta para o grupo: \"Os humanos! Os humanos trouxeram presente?\" Atrás dele, a noiva, de véu de rede de pesca, passa um bilhete para um dos personagens: \"Me tirem daqui.\"",
    roteiro: {
      verdade:
        "A princesa Zibba quer fugir com o bardo goblin Fiapo. O tio do rei, Grão-Vizir Morgrub, envenenou o vinho dos humanos para começar uma guerra contra Altamuro e ficar com o trono quando o sobrinho morrer em combate. Um bolo de casamento encantado por uma bruxa contratada por Morgrub é, na verdade, um mímico. A paz depende de expor Morgrub sem humilhar Gnarlo na frente do clã.",
      npcs: [
        { nome: "Rei Gnarlo Terceiro", quem: "rei goblin jovem e inseguro", voz: "grita tudo, depois pede desculpa baixinho", quer: "ser respeitado e ganhar presentes", segredo: "também não quer casar e morre de medo de guerra" },
        { nome: "Princesa Zibba", quem: "noiva, do clã Dente-Torto", voz: "sarcástica, revira os olhos o tempo todo", quer: "fugir com Fiapo", segredo: "sabe que Morgrub contratou uma bruxa" },
        { nome: "Grão-Vizir Morgrub", quem: "tio do rei, velho e cheio de anéis", voz: "voz melosa, esfrega as mãos", quer: "a guerra e o trono", segredo: "o vinho dos humanos está envenenado e o bolo é um mímico" },
        { nome: "Fiapo", quem: "bardo goblin apaixonado", voz: "canta tudo, desafina quando está nervoso", quer: "Zibba", segredo: "roubou a chave da despensa onde Morgrub esconde o veneno" },
        { nome: "Mãe Gosma", quem: "bruxa do pântano contratada", voz: "risadinha molhada, chama todos de \"pastelzinho\"", quer: "ser paga, por qualquer lado", segredo: "trai Morgrub por uma oferta melhor" },
      ],
      locais: [
        { nome: "Salão do trono", texto: "festa, mesas instáveis, lustre de colheres" },
        { nome: "Despensa real", texto: "comida duvidosa, veneno escondido num pote de mostarda" },
        { nome: "Cozinha", texto: "cozinheiros goblins em pé de guerra e o bolo na geladeira de pedra" },
        { nome: "Túneis de fuga", texto: "estreitos, cheios de morcegos e armadilhas velhas" },
      ],
      pistas: [
        "O copo de vinho dos humanos espuma diferente; um goblin provador cai duro depois de um gole.",
        "Fiapo tem a chave da despensa e viu Morgrub saindo dela com um pote de mostarda.",
        "Mãe Gosma conta tudo pelo preço certo (ouro, um segredo, um beijo na verruga).",
        "O bolo respira. Quem prestar atenção vê.",
      ],
      reviravoltas: ["O bolo de casamento ataca na hora do corte.", "O rei também quer cancelar o casamento: ajudar a noiva fugir pode salvar todos."],
      relogio: ["um humano bebe o vinho e passa mal", "Morgrub acusa a embaixada de envenenar o rei", "os guerreiros goblins pegam as lanças", "o salão vira batalha e a paz morre"],
      finais: [
        "Morgrub exposto, Zibba e Fiapo casados, Gnarlo salvo: paz e um rei goblin amigo",
        "fuga caótica com a noiva: guerra adiada, Gnarlo humilhado",
        "acordo com Morgrub: a embaixada sobrevive, mas a guerra vem",
      ],
      recompensas: "Um tratado de paz, 150 po em presentes goblins (a maioria roubada de Altamuro), a coroa de lata reserva e um goblin bardo que compõe canções sobre o grupo.",
    },
  },

  // ---------- Pathfinder 1e ----------
  {
    id: "torre-do-mago-endividado",
    sistemas: ["pf1e"],
    titulo: "A Torre do Mago Endividado",
    chamada: "O mago morreu devendo para um banco anão, uma guilda de ladrões e um diabo. Os três querem que vocês esvaziem a torre. Os três querem coisas diferentes.",
    duracao: "3 sessões",
    recomendado: "nível 1 a 3",
    tom: "masmorra com credores e armadilhas",
    cenario:
      "Cidade portuária de Saltério. O arquimago Orsino Vell morreu (dizem) e deixou uma torre lacrada no penhasco e dívidas espalhadas pela cidade inteira. O Banco Ferro-e-Juros, a Guilda da Mão Leve e um advogado de terno vermelho que não pisca disputam o espólio. Todos contratam o grupo. Ninguém confia em ninguém. A torre não confia em vocês.",
    abertura:
      "Escritório do Banco Ferro-e-Juros, sala com cheiro de cera e moedas. A anã gerente bate um contrato na mesa: \"Recuperem os bens de Orsino Vell e fiquem com dez por cento.\" Antes que alguém assine, uma faca se crava na mesa com um bilhete da Guilda da Mão Leve oferecendo vinte. E, na cadeira vazia do canto, que estava vazia até agora, um homem de terno vermelho sorri: \"Eu ofereço uma coisa muito melhor que dinheiro.\"",
    roteiro: {
      verdade:
        "Orsino não morreu: transferiu a alma para um simulacro de gelo e se esconde no último andar, fingindo a morte para escapar do contrato que assinou com o diabo Belzarel, que vence em três dias. Ele precisa que alguém leve o contrato original para fora da torre e o destrua num lugar sagrado. Cada credor quer algo diferente: o banco quer o ouro, a guilda quer um cristal de divinação, o diabo quer a alma de Orsino (e aceita trocar por outras).",
      npcs: [
        { nome: "Gerente Brunilda Ferro-e-Juros", quem: "anã gerente de banco", voz: "precisa, cita cláusulas de memória", quer: "o ouro da torre com juros", segredo: "o banco emprestou dinheiro ao diabo também" },
        { nome: "Sorriso", quem: "líder da Guilda da Mão Leve, halfling", voz: "doce, ameaça elogiando", quer: "o cristal de divinação para prever a guarda", segredo: "um aprendiz da guilda está preso dentro da torre" },
        { nome: "Belzarel", quem: "diabo advogado de terno vermelho", voz: "cortês, nunca mente, sempre omite", quer: "a alma de Orsino até o prazo", segredo: "não pode entrar na torre sem ser convidado por alguém de dentro" },
        { nome: "Orsino Vell", quem: "o mago \"morto\", hoje um simulacro de gelo", voz: "vaidoso, culpa todo mundo menos ele", quer: "destruir o contrato e voltar à vida", segredo: "o simulacro está derretendo" },
        { nome: "Pimpolho", quem: "aprendiz de ladrão preso na torre", voz: "fala demais, mente por reflexo", quer: "sair vivo", segredo: "já viu o mago andando pelos corredores" },
      ],
      locais: [
        { nome: "Portão rúnico", texto: "senha em enigma, golem de porta mal-humorado" },
        { nome: "Biblioteca viva", texto: "livros que mordem, escada que muda" },
        { nome: "Laboratório", texto: "experimentos soltos, poções sem rótulo" },
        { nome: "Câmara de gelo no topo", texto: "Orsino, o contrato e uma lareira que nunca acende" },
      ],
      pistas: [
        "As armadilhas da torre foram rearmadas recentemente: alguém está vivo lá dentro.",
        "O diário de Orsino na biblioteca fala do contrato e do prazo; Pimpolho viu o mago andando.",
        "Belzarel pede, gentil demais, que o grupo \"abra a porta para ele\": o convite é a chave dele.",
        "Poças de água congelando nos corredores levam ao topo.",
      ],
      reviravoltas: ["O defunto está vivo e quer usar o grupo como entregador.", "Convidar o diabo para entrar é a única forma de quebrar o contrato com ele presente, e o maior risco."],
      relogio: ["a guilda invade a torre por conta própria", "Belzarel convence alguém a convidá-lo", "o simulacro derrete e Orsino fica desesperado", "o prazo vence: o diabo cobra uma alma, qualquer uma"],
      finais: [
        "contrato destruído num templo, Orsino vivo e em dívida com o grupo",
        "Orsino entregue ao diabo: favor infernal e consciência pesada",
        "o grupo fica com a torre e as dívidas dela: casa nova, problemas novos",
      ],
      recompensas: "400 po do tesouro, um grimório menor, o cristal de divinação (se não for entregue) e um credor que lhes deve.",
    },
  },
  {
    id: "lobo-de-tres-invernos",
    sistemas: ["pf1e"],
    titulo: "O Lobo de Três Invernos",
    chamada: "Nevasca, uma aldeia isolada e um lobo que mata a cada três noites. A aldeia já escolheu o culpado. Vocês têm até a próxima lua para provar que não é ele.",
    duracao: "2 sessões",
    recomendado: "nível 2 a 4",
    tom: "mistério sombrio na neve",
    cenario:
      "Vila-do-Gelo, aldeia de lenhadores cercada de pinheiros e nevasca. Três invernos seguidos, um lobo gigante mata alguém a cada três noites até o degelo. Este ano a aldeia decidiu que o culpado é o eremita Ansgar, que mora sozinho na mata, e marcou a fogueira. A nevasca fechou as estradas: o grupo ficou preso na aldeia bem a tempo.",
    abertura:
      "A estalagem da Vila-do-Gelo está lotada de lenhadores de rosto duro e cheiro de lã molhada. Lá fora, a nevasca uiva. Lá dentro, alguém uiva também: uma moça entra correndo, coberta de neve e sangue, e cai no chão. \"Pegou o Tomas. Na trilha do moinho.\" O silêncio dura um segundo. Então o ferreiro bate o martelo no balcão: \"Chega. Amanhã a gente queima o eremita.\" Todos olham para os forasteiros, como se esperassem um voto.",
    roteiro: {
      verdade:
        "O lobisomem é Hilda, a curandeira querida da aldeia, amaldiçoada três invernos atrás ao ser mordida enquanto salvava uma criança. Ela não lembra das noites e acha que está ficando louca. Ansgar, o eremita, sabe a verdade e tenta curá-la em segredo com uma erva rara (acônito de neve), que só cresce perto do covil de uma fera mais antiga, a loba-mãe que espalhou a maldição.",
      npcs: [
        { nome: "Hilda", quem: "curandeira da aldeia", voz: "suave, cansada, cheira a ervas", quer: "salvar todos, inclusive de si mesma", segredo: "acorda com sangue nas unhas e esconde" },
        { nome: "Ansgar", quem: "eremita acusado", voz: "lacônico, olha nos olhos sem piscar", quer: "a erva para curar Hilda", segredo: "foi ele quem achou Hilda mordida e jurou segredo" },
        { nome: "Gunnar", quem: "ferreiro, líder da turba", voz: "voz de trovão, perdeu o filho no primeiro inverno", quer: "vingança, agora", segredo: "no fundo, sabe que Ansgar não tem jeito de matar tanta gente" },
        { nome: "Inga", quem: "menina de 9 anos salva por Hilda", voz: "sussurra, desenha lobos", quer: "que ninguém machuque a \"tia Hilda\"", segredo: "viu Hilda se transformar e acha que foi sonho" },
      ],
      locais: [
        { nome: "Estalagem", texto: "a aldeia reunida, tensão e cerveja quente" },
        { nome: "Cabana de Ansgar", texto: "ervas secas, livros de cura, correntes de prata" },
        { nome: "Casa de Hilda", texto: "roupas lavadas demais, unhas na pia" },
        { nome: "Covil da loba-mãe", texto: "caverna de gelo, ossos antigos, o acônito de neve" },
      ],
      pistas: [
        "As pegadas na neve são de lobo que vira pegada humana descalça perto da aldeia, não perto da mata.",
        "A cabana de Ansgar tem livros sobre cura de licantropia e correntes de prata, não armas.",
        "Inga desenha o \"lobo com o avental da tia Hilda\".",
        "As mortes param nas noites em que Hilda passa acordada cuidando de doentes; um diário de atendimentos mostra isso.",
      ],
      reviravoltas: ["A culpada é a pessoa mais querida da aldeia, e ela é vítima.", "A cura exige enfrentar a loba-mãe, que vem buscar a \"filha\"."],
      relogio: ["a turba prende Ansgar", "a fogueira é erguida na praça", "Hilda se transforma no meio da aldeia", "a loba-mãe chega com a matilha"],
      finais: [
        "Hilda curada com o acônito e a loba-mãe abatida: a aldeia salva e em dívida",
        "Hilda morta para salvar a aldeia: paz amarga, Ansgar some na neve",
        "Hilda foge com Ansgar para a mata: o lobo some, a lenda fica",
      ],
      recompensas: "250 po da aldeia, peles de lobo, uma adaga de prata e um eremita curandeiro como aliado.",
    },
  },

  // ---------- OSR ----------
  {
    id: "cripta-do-abade-guloso",
    sistemas: ["osr"],
    titulo: "A Cripta do Abade Guloso",
    chamada: "Um mosteiro abandonado, um abade que se enterrou com o tesouro e uma regra simples: tudo que vocês acharem lá embaixo é de vocês. Se voltarem.",
    duracao: "3 sessões",
    recomendado: "nível 1 (traga personagens extras)",
    tom: "sobrevivência dura e letal",
    cenario:
      "O Mosteiro de São Glutão, em ruínas no alto do Morro Pelado. Dizem que o Abade Fortunato, glutão lendário, se enterrou com a prata dos dízimos de quarenta anos e uma despensa que nunca acaba. Saqueadores entram, alguns saem. Na aldeia ao pé do morro há tochas, cordas e um taverneiro que aposta quantos vocês serão na volta.",
    abertura:
      "Pátio do mosteiro em ruínas, meio-dia frio. Corvos nas torres, mato entre as pedras, cheiro de pão assado vindo de lugar nenhum. A porta da cripta está aberta: há marcas de unhas na madeira, de dentro para fora. No chão, ao lado, um saqueador morto há pouco, sorrindo, com a barriga estufada como um odre e a boca cheia de migalhas. Na mão dele, um mapa rasgado com uma palavra: \"NÃO COMAM\".",
    roteiro: {
      verdade:
        "O Abade Fortunato fez um pacto com um demônio da fome para nunca faltar comida ao mosteiro. Os monges comeram até morrer e viraram carniçais famintos que ainda cumprem horários de missa. O Abade é agora um carniçal enorme preso à mesa de banquete no fundo da cripta. Quem come qualquer coisa lá embaixo fica preso ao pacto e começa a sentir fome eterna (e um apetite estranho).",
      npcs: [
        { nome: "Abade Fortunato", quem: "carniçal gigante preso à mesa", voz: "abençoa enquanto mastiga, educado e faminto", quer: "comida, sempre, e convidados para o banquete", segredo: "a mesa é o contrato: destruí-la quebra o pacto" },
        { nome: "Irmão Silvério", quem: "o único monge que jejuou e não virou carniçal, agora um esqueleto lúcido", voz: "seco, sarcástico, contou os dias", quer: "que alguém quebre o pacto para ele morrer em paz", segredo: "sabe onde fica a prata e o atalho" },
        { nome: "Malvina Três-Dedos", quem: "saqueadora rival que já está lá dentro", voz: "rápida, cínica, propõe sociedade e trai", quer: "a prata sozinha", segredo: "comeu um pão e está começando a sentir a fome" },
        { nome: "Taverneiro Odorico", quem: "dono da taverna ao pé do morro", voz: "jovial, anota apostas num quadro", quer: "lucrar com quem sobe", segredo: "vende mapas falsos e sabe da regra do não comer" },
      ],
      locais: [
        { nome: "Capela em ruínas", texto: "bancos podres, carniçais em missa ao meio-dia" },
        { nome: "Refeitório infinito", texto: "mesas postas com comida fresca e tentadora (armadilha)" },
        { nome: "Ossuário", texto: "pilhas de ossos roídos, o atalho de Silvério" },
        { nome: "Salão do banquete", texto: "o Abade, a mesa, a prata dos dízimos" },
      ],
      pistas: [
        "O saqueador morto e o mapa avisam: \"NÃO COMAM\"; Odorico confirma se pressionado.",
        "Os carniçais param tudo quando o sino da capela toca: tocar o sino abre passagem.",
        "Silvério conta a história do pacto e mostra o atalho pelo ossuário.",
        "O diário do Abade, no refeitório, explica que a mesa é o contrato.",
      ],
      reviravoltas: ["O perigo maior não são os monstros, é a comida.", "Malvina já comeu: virar aliada dela tem prazo, e o prazo é o estômago dela."],
      relogio: ["a fome bate em quem comeu", "o sino toca sozinho e os carniçais acordam", "Malvina vira carniçal", "o Abade se solta da mesa e sobe para a aldeia"],
      finais: [
        "mesa destruída, pacto quebrado, prata recuperada: os mortos descansam",
        "fuga com parte da prata: a cripta continua faminta",
        "alguém aceita o lugar do Abade na mesa: riqueza infinita e fome eterna",
      ],
      recompensas: "2.000 pp em prata dos dízimos (ouro conta XP), um cálice abençoado e o mapa verdadeiro do resto do mosteiro.",
    },
  },
  {
    id: "ilha-do-farol-apagado",
    sistemas: ["osr"],
    titulo: "A Ilha do Farol Apagado",
    chamada: "O farol da Ilha Corcunda apagou há três noites. Os navios estão naufragando nos rochedos e ninguém que remou até lá para ver voltou.",
    duracao: "2 sessões",
    recomendado: "nível 1 a 3",
    tom: "exploração e saque com terror de maré",
    cenario:
      "A Ilha Corcunda, rochedo com um farol no topo e uma vila de pescadores abandonada embaixo. O farol apagou e dois navios já se partiram nos rochedos, espalhando carga pela praia. A guilda dos mercadores paga cem moedas de ouro a quem reacender o farol e pode-se ficar com o que a maré trouxe. A maré, claro, traz mais coisa.",
    abertura:
      "O barco a remo raspa na areia da Ilha Corcunda ao entardecer. A praia está cheia de destroços: barris, uma carruagem partida ao meio, um baú fechado com corrente. Gaivotas silenciosas, sem um grito. Lá no alto, o farol escuro. Na areia molhada, pegadas descalças saem do mar, sobem a praia em fila e entram na vila abandonada. Nenhuma volta.",
    roteiro: {
      verdade:
        "O faroleiro Bartolomeu achou nas rochas uma concha enorme que \"canta\" e a levou para o farol. A concha é o ovo de uma criatura do fundo; o canto chama os afogados dos naufrágios, que saem do mar como servos para proteger o ovo. Bartolomeu apagou o farol porque a luz incomoda o ovo, e agora vive para chocá-lo. O ovo eclode na lua cheia, em duas noites.",
      npcs: [
        { nome: "Bartolomeu", quem: "faroleiro enfeitiçado", voz: "fala com a concha como com um bebê, voz doce e quebrada", quer: "proteger o ovo", segredo: "ainda resiste: se ouvir o nome da filha, volta a si por alguns minutos" },
        { nome: "Ruy Sem-Sorte", quem: "único sobrevivente de um naufrágio, escondido na igreja", voz: "nervoso, reza o tempo todo", quer: "sair da ilha", segredo: "roubou o baú dos destroços e o baú é de um contrabandista armado" },
        { nome: "Capitã Nereia Vosk", quem: "contrabandista que chega na segunda noite atrás do baú", voz: "fria, negocia com a mão no sabre", quer: "o baú e ninguém fazendo perguntas", segredo: "o baú tem pólvora suficiente para derrubar o farol" },
        { nome: "Os afogados", quem: "mortos dos naufrágios, servos do ovo", voz: "não falam, só cantam baixinho", quer: "proteger o ovo", segredo: "voltam ao mar se o canto parar" },
      ],
      locais: [
        { nome: "Praia dos destroços", texto: "saque, armadilhas da maré, caranguejos enormes" },
        { nome: "Vila abandonada", texto: "casas alagadas, afogados escondidos" },
        { nome: "Igreja da vila", texto: "sino rachado, Ruy escondido" },
        { nome: "Farol", texto: "escada em caracol, a concha no topo, o mecanismo da luz" },
      ],
      pistas: [
        "As pegadas que saem do mar vão para a vila e depois sobem o morro do farol.",
        "O diário de Bartolomeu, na casa dele, fala da concha que canta e da filha que se afogou.",
        "Ruy viu os afogados carregando peixes para o farol \"como oferenda\".",
        "Acender qualquer luz forte faz os afogados recuarem: a luz do farol é a arma.",
      ],
      reviravoltas: ["O faroleiro é vítima e pode ser salvo.", "A contrabandista e sua pólvora: aliada perigosa ou segunda ameaça."],
      relogio: ["os afogados começam a vigiar a praia", "a capitã chega e quer o baú", "a concha racha", "lua cheia: o ovo eclode e algo enorme sai do mar"],
      finais: [
        "farol reaceso e o ovo destruído: recompensa e Bartolomeu salvo",
        "farol explodido com a pólvora: o ovo morre, a ilha também",
        "fuga com o saque antes da eclosão: rico, mas algo vai seguir o barco",
      ],
      recompensas: "100 po da guilda, o saque da praia (até 600 po em carga), uma lanterna que nunca apaga e o baú (se ninguém reclamar).",
    },
  },

  // ---------- Dungeon World ----------
  {
    id: "porta-no-fundo-do-poco",
    sistemas: ["pbta"],
    titulo: "A Porta no Fundo do Poço",
    chamada: "O poço da última vila antes dos Ermos secou. No fundo, alguém achou uma porta. Ela estava trancada por fora.",
    duracao: "3 sessões",
    recomendado: "personagens iniciantes",
    tom: "aventura de fronteira com mistério antigo",
    cenario:
      "Fim-de-Estrada, a última vila antes dos Ermos. O poço secou de uma noite para outra e, no fundo, apareceu uma porta de pedra com fechaduras do lado de fora. A vila precisa de água e está dividida: abrir a porta ou cavar outro poço longe demais. Os heróis chegaram com sede. A porta, dizem os velhos, sempre esteve lá esperando.",
    abertura:
      "A praça de Fim-de-Estrada está cheia de gente com baldes vazios. Uma corda desce pelo poço seco, e o menino que desceu nela grita lá de baixo, a voz ecoando: \"Tem uma porta! E tem coisa batendo do outro lado!\" A corda dá um puxão forte. Depois outro. A velha do moinho agarra o braço do personagem mais próximo: \"Não deixem abrir. Mas se abrirem, me tragam o que tiver lá dentro.\"",
    roteiro: {
      verdade:
        "Sob a vila há uma cidade anã afundada, selada por dentro há séculos por anões que preferiram se trancar com um mal antigo, um fungo vivo que fala por quem infecta. Quem bate na porta são os últimos anões, que sobreviveram em transe, e o fungo os usa como fantoches. A água sumiu porque o fungo bebeu o lençol inteiro para crescer: ele está quase pronto para subir.",
      npcs: [
        { nome: "Vó Selma", quem: "velha do moinho, memória da vila", voz: "fala em provérbios, ri da desgraça", quer: "o martelo de seu avô anão, lá dentro", segredo: "é meio-anã e sabe que a porta foi fechada para proteger o mundo" },
        { nome: "Tico", quem: "menino que desceu no poço", voz: "empolgado, repete tudo duas vezes", quer: "ser aventureiro", segredo: "tocou no musgo da porta e está ouvindo vozes" },
        { nome: "Durgrim Pedramuda", quem: "anão em transe, fantoche do fungo", voz: "fala com duas vozes ao mesmo tempo", quer: "(o fungo) sair; (o anão) morrer em paz", segredo: "ainda lembra do próprio nome e luta por dentro" },
        { nome: "O Jardineiro", quem: "o fungo antigo, mente coletiva", voz: "gentil, fala \"nós\", oferece paz e silêncio", quer: "crescer e beber o mundo", segredo: "o fogo da forja anã ainda pode queimá-lo" },
      ],
      locais: [
        { nome: "Fim-de-Estrada", texto: "vila sedenta, poço seco, tensão" },
        { nome: "A porta e o salão de entrada", texto: "fechaduras de fora, avisos em runas" },
        { nome: "A cidade afundada", texto: "pontes, casas de pedra cobertas de musgo luminoso" },
        { nome: "A forja apagada", texto: "coração da cidade e a única arma contra o Jardineiro" },
      ],
      pistas: [
        "As runas da porta dizem \"não abra, não ouça\"; Vó Selma lê e conta meia verdade.",
        "Tico começa a falar com duas vozes à noite: o fungo já subiu um pouco.",
        "Diários anões na cidade explicam a escolha de se trancar e onde fica a forja.",
        "Durgrim, num momento lúcido, aponta a forja e pede fogo.",
      ],
      reviravoltas: ["A porta não prende um tesouro: prende uma praga, e os anões se sacrificaram por isso.", "Tico já está infectado: salvar o menino é parte da missão."],
      relogio: ["o musgo sobe pelo poço", "pessoas da vila ouvem vozes", "o Jardineiro fala pela boca de Tico", "a praga toma a praça"],
      finais: [
        "forja reacesa e o Jardineiro queimado: água de volta e uma cidade anã para explorar",
        "porta lacrada de novo com sacrifício: a vila se muda, a praga dorme",
        "um acordo com o Jardineiro: água infinita em troca de silêncio eterno",
      ],
      recompensas: "O martelo do avô de Selma, tesouros anões, a vila em dívida e uma cidade inteira para explorar depois.",
    },
  },
  {
    id: "cacada-ao-cervo-de-prata",
    sistemas: ["pbta"],
    titulo: "A Caçada ao Cervo de Prata",
    chamada: "O duque promete um título a quem trouxer a cabeça do Cervo de Prata. A floresta promete outra coisa a quem tentar.",
    duracao: "2 sessões",
    recomendado: "personagens iniciantes",
    tom: "conto de fadas sombrio na floresta",
    cenario:
      "A Floresta Velha, na fronteira do ducado. O duque Leopoldo está morrendo e acredita que o sangue do Cervo de Prata, criatura lendária, vai curá-lo. Prometeu terras e título a quem trouxer o animal. Caçadores, cavaleiros e mercenários entram na mata. A floresta, que tem dona, não gosta de visitas.",
    abertura:
      "Clareira na borda da Floresta Velha, amanhecer de névoa. Cães latindo, cavalos nervosos, três grupos de caçadores rivais se olhando torto. O arauto do duque lê a proclamação com voz de quem não dormiu. Então, no meio da névoa, o Cervo de Prata aparece: enorme, galhada como coroa, olhos humanos. Ele encara o grupo por um longo momento. Depois some entre as árvores, e as árvores se fecham atrás dele.",
    roteiro: {
      verdade:
        "O Cervo de Prata é Aurelia, a filha do duque, transformada por uma fada da floresta como castigo pelo pai, que derrubou a Árvore-Mãe para fazer o próprio trono. O duque não sabe. Se o cervo morrer, a filha morre. A fada, a Senhora dos Espinhos, quer que o duque devolva a madeira do trono à floresta. A doença dele é a maldição da floresta, e o sangue do cervo não cura nada.",
      npcs: [
        { nome: "Duque Leopoldo", quem: "nobre moribundo e orgulhoso", voz: "tosse entre as ordens, nunca pede desculpa", quer: "viver", segredo: "o trono foi feito da Árvore-Mãe e ele sabe que foi errado" },
        { nome: "A Senhora dos Espinhos", quem: "fada dona da floresta", voz: "fala em rimas, sorri sem mostrar os dentes", quer: "o trono de volta à terra", segredo: "pode desfazer a maldição de Aurelia, mas só com o pedido do duque" },
        { nome: "Sir Gaspar Rubro", quem: "cavaleiro rival na caçada", voz: "fanfarrão, desafia todo mundo", quer: "o título", segredo: "foi noivo de Aurelia e acha que ela fugiu" },
        { nome: "Mira", quem: "caçadora velha da região", voz: "fala pouco, assobia para os cães", quer: "que ninguém cace o cervo", segredo: "viu a transformação de Aurelia e foi silenciada pela fada" },
      ],
      locais: [
        { nome: "Clareira dos caçadores", texto: "acampamento, rivais, arauto do duque" },
        { nome: "Bosque dos Espinhos", texto: "trilhas que mudam, armadilhas vivas" },
        { nome: "Toco da Árvore-Mãe", texto: "um toco do tamanho de uma casa, cercado de flores pretas" },
        { nome: "Castelo do duque", texto: "o trono de madeira clara que geme à noite" },
      ],
      pistas: [
        "O cervo usa no pescoço um colar de ouro com o brasão ducal.",
        "Mira, se convencida, mostra o toco da Árvore-Mãe e o que aconteceu ali.",
        "Os espinhos não ferem quem entra na mata desarmado.",
        "No castelo, o trono sangra seiva quando alguém mente perto dele.",
      ],
      reviravoltas: ["O cervo é a filha do duque.", "A cura do duque não é sangue: é pedir perdão e devolver o trono."],
      relogio: ["um caçador rival fere o cervo", "a floresta engole o acampamento", "o duque piora e manda queimar a mata", "o cervo morre e a filha com ele"],
      finais: [
        "o duque devolve o trono, Aurelia volta e a floresta perdoa: título merecido",
        "o cervo é morto: o duque não se cura e o ducado é amaldiçoado",
        "Aurelia escolhe ficar cervo e virar a nova guardiã: a floresta tem uma aliada",
      ],
      recompensas: "Título e terras (se o duque cumprir), a bênção da floresta (passagem livre), uma flecha de espinho mágica e amigos poderosos de lados diferentes.",
    },
  },
];
