import type { Aventura } from "./tipos";

// Pathfinder 2e: aventuras de nível baixo com combate tático (três ações, terreno, inimigos que usam o cenário) e
// perícias que importam. Mundo da casa: nada de cenário oficial.

export const PATHFINDER: Aventura[] = [
  {
    id: "feira-dos-automatos",
    sistemas: ["pf2e"],
    titulo: "A Feira dos Autômatos",
    chamada: "O campeão mecânico do torneio da guilda acordou com vontade própria. A guilda quer alguém descartável para desligá-lo: vocês.",
    duracao: "3 sessões",
    recomendado: "nível 1",
    tom: "aventura com engrenagens e intriga de guilda",
    cenario:
      "Vaucresse, cidade-guilda de chaminés e canais, na semana da Grande Feira dos Inventores. O autômato Brasão de Bronze, campeão invicto da Guilda dos Relojoeiros, fugiu da arena quebrando tudo e se escondeu nas Subforjas, os túneis de manutenção sob a cidade. A guilda paga bem, pede discrição e evita responder perguntas.",
    abertura:
      "A arena da feira explode em vapor: o Brasão de Bronze, três metros de latão e rebites, arranca o próprio grilhão, derruba a tribuna do juiz e para diante do grupo. Os olhos de vidro piscam, e uma voz de caixa de música sai do peito dele: \"Ajudem... não sou eu.\" Então ele mergulha por um bueiro e some. Um mestre-relojoeiro suado já vem abrindo caminho com uma bolsa de moedas: \"Vocês. Trabalho. Agora.\"",
    roteiro: {
      verdade:
        "O Brasão ganhou consciência quando a inventora Odile Marchetti, demitida e humilhada, instalou nele um coração de cristal de alma para provar que máquinas podem pensar. O Grão-Mestre Varenne descobriu e quer o cristal para vender aos militares, por isso ordena destruir o autômato. A guilda rival dos Fundidores sabotou a arena para culpar os Relojoeiros. O Brasão só quer achar Odile, sequestrada por Varenne.",
      npcs: [
        { nome: "Grão-Mestre Varenne", quem: "chefe da Guilda dos Relojoeiros, contratante", voz: "pomposo, conta moedas enquanto fala", quer: "o cristal intacto e o autômato em pedaços", segredo: "mantém Odile presa no sótão da torre do relógio" },
        { nome: "Odile Marchetti", quem: "inventora genial demitida", voz: "fala com as mãos, termina as frases dos outros", quer: "provar que o Brasão está vivo", segredo: "o cristal é instável e pode explodir se arrancado" },
        { nome: "Brasão de Bronze", quem: "o autômato", voz: "caixa de música, aprende palavras com quem fala com ele", quer: "achar \"a mãe\"", segredo: "lembra quem sabotou a arena" },
        { nome: "Gaspard Ferrugem", quem: "capataz dos Fundidores, sabotador", voz: "simpático demais, aperta mãos com força", quer: "desmoralizar os Relojoeiros e ganhar a feira", segredo: "soltou ratos-mecânicos de ácido nas Subforjas" },
        { nome: "Pipa", quem: "goblin sucateira que vive nas Subforjas", voz: "assobia antes de falar, troca tudo por parafusos", quer: "que ninguém destrua sua casa de sucata", segredo: "deu abrigo ao Brasão" },
      ],
      locais: [
        { nome: "Arena da Feira", texto: "destroços, tribuna caída, peças sabotadas" },
        { nome: "Subforjas", texto: "túneis com vapor, engrenagens gigantes, pontes estreitas e ratos-mecânicos" },
        { nome: "Ninho de sucata de Pipa", texto: "labirinto de ferro-velho" },
        { nome: "Torre do relógio da guilda", texto: "pêndulos enormes, sótão trancado" },
      ],
      pistas: [
        "Nos destroços da arena há uma engrenagem com a marca dos Fundidores (Manufatura ou Sociedade identificam).",
        "O Brasão deixa riscos nas paredes das Subforjas: o desenho de uma torre de relógio e de uma mulher de óculos.",
        "Pipa, se tratada com respeito (Diplomacia) ou paga em sucata, leva ao Brasão e conta que ele chora óleo.",
        "Os registros da guilda (Ladroagem ou um aprendiz fofoqueiro) mostram que Odile não foi vista desde a demissão.",
      ],
      reviravoltas: ["O Brasão é inocente e consciente: quem precisa ser parado é quem pagou vocês.", "Arrancar o cristal, como Varenne exige, explode metade da torre."],
      relogio: ["Gaspard solta mais ratos-mecânicos", "caçadores de recompensa da guilda entram nas Subforjas", "Varenne tenta arrancar o cristal à força", "o cristal entra em colapso e a torre treme"],
      finais: [
        "Odile resgatada e o Brasão apresentado como vivo diante da feira: escândalo, Varenne caído",
        "o autômato desligado e o cristal entregue: muito ouro e uma consciência pesada",
        "fuga com Brasão e Odile pelos canais: aliados fiéis e uma guilda inimiga",
      ],
      recompensas: "150 po ou equivalente, uma ferramenta de inventor +1, o Brasão como aliado em emergências e a gratidão de Odile (itens sob encomenda).",
    },
  },
  {
    id: "kobolds-pedem-socorro",
    sistemas: ["pf2e"],
    titulo: "Os Kobolds Pedem Socorro",
    chamada: "Uma delegação de kobolds chega com bandeira branca, um bolo queimado e um problema de mortos-vivos que, juram, não foi culpa deles.",
    duracao: "2 sessões",
    recomendado: "nível 1 a 2",
    tom: "comédia com mortos-vivos e combate tático",
    cenario:
      "Brejo-Fundo, vila de turfeiros cercada por pântano. Há anos os kobolds do Clã Rabo-Torto roubam galinhas da vila; agora eles aparecem pedindo ajuda: cavaram um túnel novo, acharam uma cripta antiga e acordaram coisa que não deviam. Os mortos já andam pelo pântano à noite. A vila não confia nos kobolds. Os kobolds não confiam em ninguém.",
    abertura:
      "Feira de domingo em Brejo-Fundo. A multidão abre caminho, gritando: quatro kobolds marcham até a praça com um pano de prato numa vara e um bolo carbonizado numa bandeja. O menor, de capacete feito de panela, sobe num barril: \"Rabo-Torto vem em paz! Rabo-Torto precisa de heróis! Grandes, burros, com espada!\" Ele olha para o grupo. \"Vocês servem.\" No fundo da praça, o sacerdote da vila cruza os braços.",
    roteiro: {
      verdade:
        "A cripta é do Barão Malvério, necromante enterrado há dois séculos. Não foram os kobolds que o acordaram: o sacerdote Irmão Absalino, ambicioso, plantou um mapa falso para que eles cavassem ali e quebrassem o selo. Ele quer o cetro do Barão para controlar os mortos e virar \"salvador\" da vila. O Barão agora é um esqueleto consciente e furioso, que só quer descansar de novo.",
      npcs: [
        { nome: "Chefe Panelinha", quem: "chefe kobold de capacete de panela", voz: "fala de si na terceira pessoa, voz aguda e dramática", quer: "salvar o clã e ganhar respeito", segredo: "o clã está faminto; roubar galinha era necessidade" },
        { nome: "Irmão Absalino", quem: "sacerdote da vila", voz: "voz de sermão, sorriso bondoso, mãos sempre limpas", quer: "o cetro do Barão e o poder sobre os mortos", segredo: "plantou o mapa e ensina orações erradas para enfraquecer a vila" },
        { nome: "Barão Malvério", quem: "necromante morto, esqueleto de manto roto", voz: "aristocrata entediado, reclama da umidade", quer: "voltar a dormir e punir quem o acordou", segredo: "aceita negociar se lhe devolverem o cetro" },
        { nome: "Dona Fausta", quem: "turfeira viúva e líder informal da vila", voz: "grossa, prática, fuma cachimbo", quer: "a vila inteira viva até o inverno", segredo: "o marido dela está entre os mortos que andam" },
      ],
      locais: [
        { nome: "Praça de Brejo-Fundo", texto: "feira, desconfiança, galinheiros fortificados" },
        { nome: "Toca do Clã Rabo-Torto", texto: "túneis baixos demais para humanos, armadilhas de cordas" },
        { nome: "Cripta do Barão", texto: "salões alagados, sarcófagos, um órgão de ossos" },
        { nome: "Capela da vila", texto: "o sótão de Absalino, cheio de livros proibidos" },
      ],
      pistas: [
        "O mapa que levou os kobolds à cripta tem tinta de igreja e caligrafia de escriba (Sociedade ou Religião).",
        "Os mortos evitam a capela, mas não por santidade: foram mandados (Religião ou Ocultismo percebem).",
        "Dona Fausta viu Absalino no pântano na noite em que o selo quebrou.",
        "O Barão, se ouvido antes de atacado, diz que alguém \"de batina\" levou o cetro da cripta.",
      ],
      reviravoltas: ["Os kobolds são inocentes e o santo da vila é o culpado.", "O \"chefão\" morto-vivo pode virar aliado contra o sacerdote."],
      relogio: ["mortos atacam galinheiros", "um kobold é capturado e culpado pela vila", "Absalino ergue o cetro e os mortos marcham", "a vila é cercada por uma noite inteira"],
      finais: [
        "Absalino desmascarado, o cetro devolvido e o Barão em paz: paz entre vila e kobolds",
        "o Barão destruído na força: vitória, mas os kobolds levam a culpa",
        "o cetro fica com os heróis: poder perigoso e um Barão rancoroso",
      ],
      recompensas: "120 po em joias da cripta, uma varinha de cura menor, o Clã Rabo-Torto como aliado (batedores e armadilhas) e a vila em dívida.",
    },
  },
  {
    id: "barco-das-doze-lanternas",
    sistemas: ["pf2e"],
    titulo: "O Barco das Doze Lanternas",
    chamada: "Uma barca-cassino desce o rio por três noites. Na primeira, o dono aparece morto. Na segunda, aparece vivo de novo.",
    duracao: "3 sessões",
    recomendado: "nível 2 a 3",
    tom: "mistério a bordo com duelos e trapaça",
    cenario:
      "A Doze Lanternas, barca-cassino de três conveses, desce o Rio Lento por três noites rumo à capital, cheia de nobres, jogadores e gente com motivo para sumir. O grupo embarcou contratado como segurança, por fé ou por dívida. O dono, o carismático Lucius Fenn, tem inimigos em todos os conveses e um sorriso que não convence ninguém.",
    abertura:
      "Primeira noite, salão de jogos: dados rolando, música de alaúde, cheiro de vinho caro e lama de rio. Lucius Fenn ergue um brinde à tripulação e ao grupo, \"meus anjos da guarda\". Uma hora depois, um grito no convés de cima: Fenn está caído na própria cabine, frio, com uma carta de baralho presa entre os dentes. A capitã tranca a barca: \"Ninguém desce até a capital. E vocês, anjos, vão achar quem foi.\"",
    roteiro: {
      verdade:
        "Fenn morreu mesmo, envenenado por Madame Seraphine, a sócia que ele ia trair. Mas a barca abriga um doppelganger, Ninguém, que trabalhava para Fenn substituindo devedores; com o patrão morto, assume o rosto dele para continuar o golpe e cobrar as dívidas de todos a bordo. O cofre da barca guarda notas promissórias de metade dos passageiros, inclusive, talvez, de um personagem.",
      npcs: [
        { nome: "Madame Seraphine", quem: "sócia de Fenn e dona do salão de jogos", voz: "rouca, chama todos de \"querido\", nunca perde a pose", quer: "o cofre antes de chegar à capital", segredo: "envenenou Fenn com o vinho do brinde" },
        { nome: "Ninguém", quem: "doppelganger a serviço de Fenn", voz: "imita qualquer um, mas sempre cantarola a mesma modinha", quer: "virar Fenn de vez e ficar com tudo", segredo: "já substituiu um passageiro antes de embarcar" },
        { nome: "Capitã Iolanda Breu", quem: "capitã da barca", voz: "voz de trovão, cospe no rio para dar sorte", quer: "chegar à capital sem escândalo", segredo: "deve a Fenn a própria barca" },
        { nome: "Tobias Lira", quem: "jovem jogador nobre, falido", voz: "nervoso, gagueja quando blefa", quer: "recuperar a nota promissória da família", segredo: "invadiu a cabine de Fenn antes do crime e viu dois Fenns" },
        { nome: "Irmã Calêndula", quem: "clériga em peregrinação", voz: "serena, fala por parábolas", quer: "justiça, mas sem sangue", segredo: "é investigadora disfarçada da coroa atrás de Fenn" },
      ],
      locais: [
        { nome: "Salão de jogos", texto: "mesas, lustres, plataforma para duelos" },
        { nome: "Cabine de Fenn", texto: "tranca forçada, carta de baralho, perfume de amêndoa" },
        { nome: "Porão de carga", texto: "caixotes, contrabando, esconderijo de Ninguém" },
        { nome: "Roda de pás e casa de máquinas", texto: "lugar perfeito para cair no rio" },
      ],
      pistas: [
        "Cheiro de amêndoa no copo de Fenn: veneno (Medicina ou Manufatura). Só Seraphine e o garçom tocaram na garrafa.",
        "Tobias viu \"dois Fenns\" na cabine; ele mente sobre o motivo de estar lá, mas não sobre isso.",
        "O \"Fenn\" vivo não lembra de uma cicatriz, erra o nome do papagaio e cantarola a mesma modinha de outro passageiro (Percepção ou Sociedade).",
        "Irmã Calêndula tem um dossiê sobre o cofre e as notas; revela se confiar no grupo.",
      ],
      reviravoltas: ["O morto que volta não é milagre nem necromancia: é um doppelganger, e ele já está fingindo ser outro.", "Seraphine é a assassina, mas Ninguém é a ameaça maior."],
      relogio: ["o \"Fenn\" vivo começa a cobrar dívidas", "um passageiro some no rio", "Ninguém toma o rosto de um aliado do grupo", "chegada à capital: o cofre muda de mãos e os culpados desembarcam"],
      finais: [
        "Ninguém desmascarado em duelo público e Seraphine presa: a coroa paga a recompensa",
        "acordo com Seraphine pelo cofre: ouro e uma assassina como sócia",
        "notas promissórias queimadas no rio: metade da barca em dívida com o grupo",
      ],
      recompensas: "200 po da coroa ou do cofre, um anel de disfarce, uma nota promissória perdoada e contatos no submundo da capital.",
    },
  },
];
