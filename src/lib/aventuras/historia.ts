import type { Aventura } from "./tipos";

// Modo história: fantasia sem números, pensada para um herói (ou poucos) e lida como um livro.

export const HISTORIA: Aventura[] = [
  {
    id: "sino-afogado",
    sistemas: ["historia"],
    titulo: "O Sino Afogado",
    chamada: "Há cem anos o mar engoliu a igreja de Maré-Baixa. Toda noite, o sino dela ainda toca. Esta noite, tocou o seu nome.",
    duracao: "3 sessões",
    tom: "mistério melancólico à beira-mar",
    cenario:
      "Maré-Baixa, vila de pescadores numa enseada de rochas negras. Cem anos atrás, uma tempestade afundou a velha igreja e metade da vila. Desde então, nas noites de névoa, o sino submerso toca lá do fundo. Os velhos dizem que ele chama quem deve alguma coisa ao mar. Este ano, ele começou a tocar todas as noites.",
    abertura:
      "Noite de névoa no cais de Maré-Baixa. O herói acabou de chegar à vila; a estalagem fechou cedo e os pescadores puxam os barcos para longe da água, apressados. Então o sino toca, lá do fundo da enseada: grave, lento, e entre uma badalada e outra, carregado pela névoa, alguém chama o nome do herói. Uma velha de xale, sentada num barco virado, solta o cachimbo da boca: \"Faz cem anos que ele não chama gente de fora.\"",
    roteiro: {
      verdade:
        "Na noite da tempestade, o sineiro Elias Corvelo tocou o sino para avisar a vila, e o padre o trancou na torre para salvar a si mesmo e o ouro da igreja. Elias afundou junto. O padre fugiu, enriqueceu e fundou uma família, os Valmonte, hoje os donos da vila. Elias, um afogado sem descanso, chama os descendentes de quem o traiu para que alguém conte a verdade e devolva o ouro ao mar. O herói tem sangue Valmonte sem saber.",
      npcs: [
        { nome: "Vó Ondina", quem: "velha pescadora, guardiã das histórias da vila", voz: "fala devagar, entre baforadas de cachimbo, ri do medo alheio", quer: "que o sino descanse antes que ela morra", segredo: "a avó dela amava Elias e guardou a chave da torre" },
        { nome: "Dom Aurélio Valmonte", quem: "dono dos barcos e da vila, neto do padre fugido", voz: "cordial, mãos sempre nos bolsos do colete", quer: "que o herói vá embora antes de descobrir demais", segredo: "o ouro da igreja está no porão da casa dele" },
        { nome: "Elias Corvelo", quem: "o sineiro afogado", voz: "voz de água, fala em frases curtas e molhadas", quer: "que contem a verdade e devolvam o ouro ao mar", segredo: "não quer vingança, quer descanso, mas o mar quer outra coisa" },
        { nome: "Lua", quem: "menina pescadora de 12 anos, ousada", voz: "rápida, sabe nadar como peixe", quer: "ver a igreja afundada com os próprios olhos", segredo: "já mergulhou até a torre e trouxe um sino pequeno" },
      ],
      locais: [
        { nome: "O cais e a estalagem", texto: "névoa, pescadores supersticiosos, o sino ao longe" },
        { nome: "A casa dos Valmonte", texto: "casarão no alto da falésia, retratos antigos, porão trancado" },
        { nome: "A gruta da maré", texto: "só aparece na maré mais baixa do mês, leva por baixo d'água à igreja" },
        { nome: "A igreja afundada", texto: "torre coberta de algas, peixes no altar, o sino" },
      ],
      pistas: [
        "Os retratos na casa Valmonte mostram o padre fugido com o mesmo rosto do herói (ou seu traço de família).",
        "Vó Ondina conta a história do sineiro e guarda a chave da torre.",
        "O sininho que Lua trouxe tem o nome \"Elias\" gravado e toca sozinho perto do porão dos Valmonte.",
        "Na maré mais baixa, a gruta deixa chegar à torre sem barco.",
      ],
      reviravoltas: ["O herói descende do traidor: é por isso que o sino chama ele.", "Elias não quer vingança; é o mar que quer, e ele cobra com uma tempestade."],
      relogio: ["o sino toca mais alto e os barcos não voltam", "Dom Aurélio manda alguém \"acompanhar\" o herói para fora da vila", "uma tempestade cerca a enseada", "o mar sobe e leva o cais"],
      finais: [
        "a verdade contada e o ouro devolvido ao mar: Elias descansa, o sino cala e a vila agradece",
        "Dom Aurélio protegido: o sino segue tocando, mais forte, e um dia vai cobrar",
        "o herói toca o sino no fundo do mar e toma o lugar de Elias como guardião: a vila nunca mais naufraga",
      ],
      recompensas: "Um sininho que avisa do perigo, a gratidão de Maré-Baixa, a amizade de Lua e um barco só seu.",
    },
  },
  {
    id: "heranca-da-bruxa-do-brejo",
    sistemas: ["historia"],
    titulo: "A Herança da Bruxa do Brejo",
    chamada: "Você herdou de uma tia que nunca conheceu uma cabana no brejo, um gato que fala e três dívidas com criaturas que não aceitam desculpas.",
    duracao: "3 sessões",
    tom: "fantasia cômica com sustos de verdade",
    cenario:
      "O Brejo das Rãs Tortas, região de charcos, salgueiros e névoa, onde morava a temida (e querida) Tia Matilde, bruxa da região. Ela morreu, e deixou para o herói, um parente distante, a cabana, o gato e as obrigações. O povo da vila mais próxima espera que a nova bruxa (ou bruxo) resolva os problemas que a velha resolvia. As criaturas do brejo esperam que pague o que ela devia.",
    abertura:
      "Fim de tarde no brejo. A cabana de Tia Matilde é torta, com chaminé fumegando sozinha e uma porta que range como quem resmunga. Lá dentro, um caldeirão borbulha, ervas penduradas no teto e, na poltrona da falecida, um gato preto gordo abre um olho: \"Finalmente. Você está atrasado três dias e temos visitas.\" Alguém bate à porta, três vezes. Pela janela, o herói vê uma figura alta demais, de chapéu de palha, segurando um contrato.",
    roteiro: {
      verdade:
        "Tia Matilde fez três pactos para proteger a vila: com o Espantalho do Milharal (colheitas), com a Dama do Lago (água limpa) e com o Rei-Sapo (manter longe os bichos do charco). Ela pagava com favores e bolos de mel, mas morreu antes do último pagamento. Agora as três criaturas cobram do herdeiro. A morte dela não foi natural: o feiticeiro Silvano, que quer a cabana e o grimório, a envenenou.",
      npcs: [
        { nome: "Bartolomeu", quem: "o gato falante de Tia Matilde", voz: "sarcástico, preguiçoso, fala como mordomo cansado", quer: "comida boa e um bruxo decente", segredo: "viu quem envenenou Matilde, mas foi enfeitiçado para esquecer" },
        { nome: "O Espantalho", quem: "guardião do milharal", voz: "lento, educado, palha rangendo a cada palavra", quer: "um coração (Matilde prometeu)", segredo: "aceita outra coisa se o herói for criativo" },
        { nome: "A Dama do Lago", quem: "espírito das águas", voz: "fala em ecos, vaidosa", quer: "uma canção nova toda lua", segredo: "sabe da morte de Matilde e espera que o herói pergunte" },
        { nome: "O Rei-Sapo", quem: "monarca do charco, sapo enorme de coroa", voz: "pomposo, coaxa no meio das frases", quer: "um casamento real ou um tributo de moscas douradas", segredo: "é um príncipe enfeitiçado por Silvano" },
        { nome: "Mestre Silvano", quem: "feiticeiro da vila, simpático e respeitado", voz: "untuoso, oferece ajuda demais", quer: "o grimório de Matilde", segredo: "envenenou Matilde e sabotou os pactos" },
      ],
      locais: [
        { nome: "A cabana torta", texto: "caldeirão, grimório trancado, porta que resmunga" },
        { nome: "O milharal", texto: "milho alto demais, corvos falantes" },
        { nome: "O lago espelhado", texto: "água que mostra o passado" },
        { nome: "O charco do Rei-Sapo", texto: "trono de vitória-régia, corte de sapos" },
      ],
      pistas: [
        "O chá favorito de Matilde, na despensa, tem cheiro de amêndoa amarga.",
        "O lago espelhado mostra a última visita a Matilde: alguém de capa verde.",
        "Bartolomeu recupera a memória se o herói achar a erva certa no grimório.",
        "O Rei-Sapo reconhece a magia de Silvano no próprio feitiço.",
      ],
      reviravoltas: ["As criaturas não são vilãs: são credores honestos, e o vilão é o vizinho simpático.", "Silvano quer o grimório para quebrar os pactos e deixar a vila sem proteção, para depois vender proteção."],
      relogio: ["o milharal começa a morrer", "o lago fica turvo", "os bichos do charco invadem a vila", "Silvano rouba o grimório e a cabana pega fogo"],
      finais: [
        "Silvano desmascarado e as dívidas pagas com criatividade: o herói vira a nova bruxa (ou bruxo) do brejo",
        "o herói foge do brejo: a vila sofre e Silvano vence",
        "um novo pacto com as criaturas, mais justo: o brejo muda para melhor",
      ],
      recompensas: "A cabana e o grimório, Bartolomeu como companheiro fiel (e irritante), o respeito do brejo e, talvez, um príncipe desenfeitiçado.",
    },
  },
  {
    id: "ultimo-baile-do-castelo-corvo",
    sistemas: ["historia"],
    titulo: "O Último Baile do Castelo Corvo",
    chamada: "O velho rei vai anunciar o herdeiro no baile de máscaras. Antes da meia-noite, alguém vai tentar matá-lo. Você foi convidado justamente para isso.",
    duracao: "one-shot",
    tom: "intriga elegante com punhais",
    cenario:
      "O Castelo Corvo, no alto de um penhasco sobre o mar, na noite do grande baile de máscaras. O velho Rei Osric vai anunciar à meia-noite qual dos três filhos herdará a coroa. Todos os nobres do reino estão lá, com máscaras, segredos e lâminas escondidas. O herói recebeu um convite anônimo, com uma moeda de ouro e uma frase: \"Salve o rei.\"",
    abertura:
      "Salão do Castelo Corvo, velas por toda parte, música de violinos, um mar de máscaras douradas e de penas. O herói mal entrou quando um criado esbarra nele e enfia um bilhete em sua mão: \"Antes da meia-noite. Vinho. Cuidado com o corvo de prata.\" No alto da escadaria, o velho rei ergue a taça para o salão. O relógio da torre bate dez horas. Ao redor, três jovens de máscaras diferentes observam o pai como quem observa uma herança.",
    roteiro: {
      verdade:
        "O rei Osric já sabe que vai morrer em breve e quer anunciar um herdeiro surpresa: sua filha bastarda, Lena, a criada que esbarrou no herói e mandou o convite. A conspiração é da rainha Isadora, que envenenou o vinho real para que o filho preferido dela, o príncipe Cássio, herde. O \"corvo de prata\" é o broche do assassino contratado. Os outros dois filhos têm seus próprios planos, mas nenhum quer matar o pai.",
      npcs: [
        { nome: "Rei Osric", quem: "o velho rei", voz: "voz cansada, humor ácido, tosse entre frases", quer: "deixar o reino em boas mãos", segredo: "vai anunciar Lena, a filha bastarda" },
        { nome: "Rainha Isadora", quem: "esposa do rei", voz: "doce, gentil, sempre perto de quem precisa vigiar", quer: "Cássio no trono", segredo: "contratou o assassino e envenenou o vinho" },
        { nome: "Príncipe Cássio", quem: "o filho preferido da rainha", voz: "arrogante, inseguro por dentro", quer: "provar valor ao pai", segredo: "não sabe do plano da mãe e ficaria horrorizado" },
        { nome: "Princesa Mirela e Príncipe Teo", quem: "os outros dois filhos", voz: "ela, fria e estratégica; ele, bêbado e engraçado", quer: "ela, a coroa; ele, fugir para o mar", segredo: "Mirela suspeita da rainha; Teo viu o assassino" },
        { nome: "Lena", quem: "criada, filha bastarda do rei", voz: "rápida, nervosa, sempre carregando bandeja", quer: "que o pai sobreviva à noite", segredo: "é a herdeira escolhida" },
      ],
      locais: [
        { nome: "O salão do baile", texto: "máscaras, dança, olhares" },
        { nome: "A adega real", texto: "o vinho do rei, garrafas lacradas, o copeiro nervoso" },
        { nome: "A galeria dos retratos", texto: "corredor escuro, passagem secreta" },
        { nome: "A torre do relógio", texto: "onde o rei fará o anúncio à meia-noite" },
      ],
      pistas: [
        "O copeiro, pressionado, admite que a rainha mandou trocar a garrafa do brinde.",
        "Teo viu um mascarado com broche de corvo de prata entrando na galeria dos retratos.",
        "Mirela troca informações com o herói em troca de apoio.",
        "Lena sabe da passagem secreta que leva da galeria à torre do relógio.",
      ],
      reviravoltas: ["A criada que mandou o convite é a herdeira.", "A rainha tem plano B: se o veneno falhar, o assassino ataca na torre."],
      relogio: ["o vinho é servido para o brinde", "o rei sente tontura e se retira", "o assassino sobe para a torre", "meia-noite: o rei cai diante do reino inteiro"],
      finais: [
        "o rei salvo, a rainha desmascarada e Lena anunciada: o herói vira o protetor da nova herdeira",
        "o rei morre, mas o herói prova a culpa da rainha: Mirela assume e lhe deve um favor",
        "o herói fica do lado da rainha: riqueza, título e um reino doente",
      ],
      recompensas: "Um título de cavaleiro ou dama da corte, um anel do rei, a confiança da herdeira e muitos inimigos de máscara.",
    },
  },
];
