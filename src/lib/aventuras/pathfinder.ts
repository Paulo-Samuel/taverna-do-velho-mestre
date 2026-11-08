import { abertaA } from "./fantasia";
import type { Aventura } from "./tipos";

// Pathfinder 2e: aventuras de nível baixo com combate tático (três ações, terreno, inimigos que usam o cenário) e
// perícias que importam. Mundo da casa: nada de cenário oficial. As três primeiras rodam em qualquer fantasia da
// taverna (pistas sem nome de perícia; recompensa por sistema); "A Forja Afundada" é masmorra feita para o PF2e.

export const PATHFINDER: Aventura[] = [
  {
    id: "feira-dos-automatos",
    sistemas: abertaA("pf2e"),
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
        "Nos destroços da arena há uma engrenagem com a marca dos Fundidores: um artesão ou quem conhece as guildas da cidade reconhece o selo.",
        "O Brasão deixa riscos nas paredes das Subforjas: o desenho de uma torre de relógio e de uma mulher de óculos.",
        "Pipa, se tratada com respeito ou paga em sucata, leva ao Brasão e conta que ele chora óleo.",
        "Os registros da guilda (quem souber abrir uma gaveta trancada, ou um aprendiz fofoqueiro) mostram que Odile não foi vista desde a demissão.",
      ],
      reviravoltas: ["O Brasão é inocente e consciente: quem precisa ser parado é quem pagou vocês.", "Arrancar o cristal, como Varenne exige, explode metade da torre."],
      relogio: ["Gaspard solta mais ratos-mecânicos", "caçadores de recompensa da guilda entram nas Subforjas", "Varenne tenta arrancar o cristal à força", "o cristal entra em colapso e a torre treme"],
      finais: [
        "Odile resgatada e o Brasão apresentado como vivo diante da feira: escândalo, Varenne caído",
        "o autômato desligado e o cristal entregue: muito ouro e uma consciência pesada",
        "fuga com Brasão e Odile pelos canais: aliados fiéis e uma guilda inimiga",
      ],
      recompensas: {
        padrao: "150 po ou equivalente, um jogo de ferramentas de inventor de qualidade superior, o Brasão como aliado em emergências e a gratidão de Odile (itens sob encomenda).",
        pf2e: "150 po ou equivalente, ferramentas de artesão com bônus de item +1, o Brasão como aliado em emergências e a gratidão de Odile (itens sob encomenda); missão maior: 80 XP para cada um.",
        osr: "1.500 po ou equivalente (ouro conta XP), um jogo de ferramentas de inventor de qualidade superior, o Brasão como aliado em emergências e a gratidão de Odile (itens sob encomenda).",
        pbta: "Uma bolsa pesada da guilda, um jogo de ferramentas de inventor de qualidade superior, o Brasão como aliado em emergências e a gratidão de Odile (itens sob encomenda): no fim da sessão, marque XP por ter decidido o que é uma pessoa.",
      },
      sessoes: [
        "Arena sabotada, contrato com Varenne, descida às Subforjas. Gancho: o Brasão chama \"mãe\" no escuro.",
        "Ninho de Pipa, ratos de Gaspard, caçadores da guilda. Gancho: o desenho da torre do relógio.",
        "Torre do relógio: Odile no sótão, Varenne e o cristal; a escolha diante da feira.",
      ],
      encontros: [
        {
          nome: "Ratos-mecânicos",
          onde: "pontes das Subforjas",
          inimigos: {
            pf2e: "4 ratos (nív. −1: CA 15, PV 12, mordida +7 1d6+1 e 1 de ácido persistente)",
            osr: "4 ratos (CA 13, 1 DV, 1d4 e ácido, moral 12)",
            pbta: "horda de ratos (3 PV, armadura 1, d6; o ácido corrói o equipamento)",
            padrao: "4 ratos (CA 13, 7 PV, mordida +4 1d4 e 1d4 de ácido)",
          },
          tatica: "saem das engrenagens e empurram para os vãos",
          saida: "o apito de Pipa os desliga; travar a engrenagem-mestra para todos",
        },
        {
          nome: "Caçadores da guilda",
          onde: "Subforjas",
          inimigos: {
            pf2e: "2 caçadores (nív. −1: CA 15, PV 15, besta +7 1d8) e a capitã Morel (nív. 2: CA 18, PV 32, espada +10 1d8+4)",
            osr: "3 caçadores (CA 12, 1 DV, besta 1d6, moral 7) e Morel (CA 15, 3 DV, espada 1d8, moral 9)",
            pbta: "caçadores (grupo, 6 PV, armadura 1, d8) e Morel (solitária, 12 PV, armadura 2, d10)",
            padrao: "3 caçadores (CA 13, 11 PV, besta +4 1d8) e Morel (CA 16, 27 PV, espada +5 1d8+3)",
          },
          tatica: "querem o Brasão; atiram de longe sob o vapor",
          saida: "recuam se provarem que Varenne mente",
        },
      ],
      complicacoes: [
        "o vapor esconde uma ponte",
        "Gaspard oferece ajuda e sabota",
        "Varenne corta o pagamento",
        "o Brasão salva alguém do grupo e some",
        "um aprendiz conta o que não devia",
        "a feira anuncia o desmonte do Brasão",
      ],
    },
  },
  {
    id: "kobolds-pedem-socorro",
    sistemas: abertaA("pf2e"),
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
        "O mapa que levou os kobolds à cripta tem tinta de igreja e caligrafia de escriba: quem entende de igreja ou de escrita percebe.",
        "Os mortos evitam a capela, mas não por santidade: foram mandados (quem conhece ritos ou o jeito dos mortos-vivos nota que é ordem, não medo).",
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
      recompensas: {
        padrao: "120 po em joias da cripta, uma varinha de cura menor, o Clã Rabo-Torto como aliado (batedores e armadilhas) e a vila em dívida.",
        pf2e: "120 po em joias da cripta, uma varinha de Curar de 1º círculo, o Clã Rabo-Torto como aliado (batedores e armadilhas) e a vila em dívida; missão menor: 40 XP para cada um.",
        osr: "1.200 po em joias da cripta (ouro conta XP), uma varinha de cura menor, o Clã Rabo-Torto como aliado (batedores e armadilhas) e a vila em dívida.",
        pbta: "Joias da cripta, uma varinha de cura menor, o Clã Rabo-Torto como aliado (batedores e armadilhas) e a vila em dívida: no fim da sessão, marque XP por ter feito vila e kobolds se olharem nos olhos.",
      },
      sessoes: [
        "Praça, delegação kobold, toca do clã e a entrada da cripta. Gancho: mortos atacam um galinheiro.",
        "Cripta do Barão, conversa ou briga; Absalino ergue o cetro; noite de cerco na vila.",
      ],
      encontros: [
        {
          nome: "Mortos do brejo",
          onde: "salões alagados",
          inimigos: {
            pf2e: "3 esqueletos (nív. −1: CA 16, PV 14, garra +6 1d6+2, resiste a corte 3) e 2 zumbis (nív. −1: CA 12, PV 20, lentos, +7 1d8+3)",
            osr: "3 esqueletos (CA 12, 1 DV, 1d6) e 2 zumbis (CA 11, 2 DV, 1d8), moral 12",
            pbta: "horda de mortos (3 PV, armadura 1, d6; não sentem dor)",
            padrao: "3 esqueletos (CA 13, 13 PV, +4 1d6+2) e 2 zumbis (CA 8, 22 PV, +3 1d6+1)",
          },
          tatica: "cercam pela água rasa, onde andar custa o dobro",
          saida: "luz sagrada ou o cetro os manda embora",
        },
        {
          nome: "Barão Malvério",
          onde: "órgão de ossos",
          inimigos: {
            pf2e: "nív. 3 (CA 19, PV 50, toque gélido +11 2d6+3 de frio; o órgão: Vontade CD 19 ou amedrontado 1)",
            osr: "CA 15, 4 DV, toque 1d8 de frio; o órgão: salvaguarda ou foge; moral 10",
            pbta: "solitário (12 PV, armadura 2, d10 de frio; o órgão espalha medo)",
            padrao: "CA 15, 45 PV, toque +5 2d6 de frio; o órgão: SAB CD 13 ou amedrontado",
          },
          tatica: "fica atrás do órgão e manda os mortos",
          saida: "trégua se ouvir que alguém de batina levou o cetro",
        },
      ],
      complicacoes: [
        "um kobold some e a vila culpa o clã",
        "Fausta reconhece o marido entre os mortos",
        "Absalino oferece uma bênção que enfraquece",
        "a turfa pega fogo no pântano",
        "Panelinha \"guarda\" algo do grupo",
        "a névoa traz mortos à feira",
      ],
    },
  },
  {
    id: "barco-das-doze-lanternas",
    sistemas: abertaA("pf2e"),
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
        "Cheiro de amêndoa no copo de Fenn: veneno, para quem entende de remédios ou de alquimia. Só Seraphine e o garçom tocaram na garrafa.",
        "Tobias viu \"dois Fenns\" na cabine; ele mente sobre o motivo de estar lá, mas não sobre isso.",
        "O \"Fenn\" vivo não lembra de uma cicatriz, erra o nome do papagaio e cantarola a mesma modinha de outro passageiro: quem presta atenção nas pessoas, ou conhece a alta roda, estranha.",
        "Irmã Calêndula tem um dossiê sobre o cofre e as notas; revela se confiar no grupo.",
      ],
      reviravoltas: ["O morto que volta não é milagre nem necromancia: é um doppelganger, e ele já está fingindo ser outro.", "Seraphine é a assassina, mas Ninguém é a ameaça maior."],
      relogio: ["o \"Fenn\" vivo começa a cobrar dívidas", "um passageiro some no rio", "Ninguém toma o rosto de um aliado do grupo", "chegada à capital: o cofre muda de mãos e os culpados desembarcam"],
      finais: [
        "Ninguém desmascarado em duelo público e Seraphine presa: a coroa paga a recompensa",
        "acordo com Seraphine pelo cofre: ouro e uma assassina como sócia",
        "notas promissórias queimadas no rio: metade da barca em dívida com o grupo",
      ],
      recompensas: {
        padrao: "200 po da coroa ou do cofre, um anel de disfarce, uma nota promissória perdoada e contatos no submundo da capital.",
        pf2e: "200 po da coroa ou do cofre, um anel de disfarce (Impersonar com bônus de item +1 e um rosto guardado), uma nota promissória perdoada e contatos no submundo da capital; missão maior: 80 XP para cada um.",
        osr: "2.000 po da coroa ou do cofre (ouro conta XP), um anel de disfarce, uma nota promissória perdoada e contatos no submundo da capital.",
        pbta: "A recompensa da coroa ou o cofre, um anel de disfarce, uma nota promissória perdoada e contatos no submundo da capital: no fim da sessão, marque XP por ter descoberto quem era quem.",
      },
      sessoes: [
        "Brinde, morte de Fenn e barca trancada; interrogatórios. Gancho: Fenn aparece vivo no café.",
        "O falso Fenn cobra dívidas; Tobias, Calêndula, o porão. Gancho: um passageiro some no rio.",
        "Duelo público, o cofre e a capital à vista: desmascarar Ninguém e decidir sobre Seraphine.",
      ],
      encontros: [
        {
          nome: "Ninguém",
          onde: "porão",
          inimigos: {
            pf2e: "nív. 3 (CA 19, PV 50, adaga +11 1d6+5, Mudar de Forma) e 2 capangas (nív. 0: CA 16, PV 16, porrete +7 1d6+3)",
            osr: "CA 15, 4 DV, 1d12, muda de forma, moral 9; 2 capangas (CA 12, 1 DV, 1d6)",
            pbta: "solitário (12 PV, armadura 1, d8, muda de rosto) e capangas (grupo, 6 PV, d6)",
            padrao: "CA 14, 52 PV, 2 ataques +6 1d6+4, muda de forma; 2 capangas (CA 12, 11 PV, +4 1d6+2)",
          },
          tatica: "troca de rosto no meio da briga",
          saida: "foge pela roda de pás; encurralado, troca o cofre pela vida",
        },
        {
          nome: "Gente de Seraphine",
          onde: "salão de jogos",
          inimigos: {
            pf2e: "2 seguranças (nív. 1: CA 17, PV 20, +8 1d6+3) e Seraphine (nív. 2: CA 17, PV 28, dardo +9 1d4 e veneno Fortitude CD 18)",
            osr: "2 seguranças (CA 14, 2 DV, 1d6) e Seraphine (CA 13, 3 DV, dardo envenenado)",
            pbta: "seguranças (grupo, 6 PV, d8) e Seraphine (solitária, 12 PV, d6 e veneno)",
            padrao: "2 seguranças (CA 15, 22 PV, +5 1d6+3) e Seraphine (CA 14, 27 PV, dardo +5 e veneno CON CD 13)",
          },
          tatica: "mesas viradas e lustres como cobertura",
          saida: "a capitã encerra se ninguém morrer",
        },
      ],
      complicacoes: [
        "a capitã acusa um personagem",
        "aparece uma nota promissória com o nome de alguém do grupo",
        "Tobias tenta fugir a nado",
        "nevoeiro: a barca encalha",
        "Ninguém imita a voz de alguém do grupo",
        "Calêndula se revela cedo e vira alvo",
      ],
    },
  },

  // ---------- masmorra para o PF2e: três facções, armadilhas pela tabela de CD e um chefe de duas fases ----------
  {
    id: "forja-afundada",
    sistemas: ["pf2e"],
    titulo: "A Forja Afundada",
    chamada: "O lago de Vau-Fundo começou a ferver. Lá embaixo, uma forja anã que ninguém apagou, kobolds que a chamam de dragão e um culto que quer temperar o mundo nela.",
    duracao: "3 sessões",
    recomendado: "nível 3 a 5 (masmorra: facções, armadilhas e um chefe de duas fases)",
    tom: "exploração de masmorra tática com facções e calor crescente",
    cenario:
      "Vau-Fundo, vila de pescadores à beira do Lago Caldeira, nas montanhas. Há três semanas a água esquenta: os peixes boiam cozidos, vapor sobe das margens e à noite o lago brilha laranja no meio. Os velhos lembram que, debaixo da água, há a Forja de Brannoc, cidadela anã que afundou quando o clã fugiu há duzentos anos. A anã Ingrith Brannoc chegou com um mapa de família e uma proposta: descer pela galeria seca do penhasco, descobrir o que acendeu a forja e trazer de volta o martelo do clã. Ela paga em barras de ferro anão e não diz tudo o que sabe.",
    abertura:
      "A galeria do penhasco cospe vapor morno e cheiro de ferro quente. Ingrith Brannoc ergue a lanterna diante de um portão anão entreaberto, as dobradiças fundidas de calor: \"Ninguém abre isso há duzentos anos. Alguém abriu.\" No chão, pegadas pequenas com garras, dezenas, todas indo para dentro, e uma faixa de pano vermelho amarrada numa estaca, com um dizer costurado: AQUI SE TEMPERA. Do fundo, muito longe, vem o som de um martelo batendo em ritmo de coração. Então uma voz de brasa, baixa, dentro das paredes: \"Mais visitas. Que bom. Está ficando quente aqui.\"",
    roteiro: {
      verdade:
        "Os anões de Brannoc acorrentaram Cinzal, um elemental de fogo, à bigorna-mãe para alimentar a forja e o abandonaram quando o lago invadiu os salões baixos. Há um mês o Culto da Última Têmpera, da ferreira Ysolde Grã-Lume, achou a entrada seca, reacendeu Cinzal à força (por isso o lago ferve) e forja nele uma arma para quebrar as correntes e \"temperar o mundo\" no incêndio. Os kobolds do Clã Escama-de-Fuligem, donos dos salões altos há gerações, adoram Cinzal como o dragão que respira na pedra, vendem passagem e armam corredores. Ingrith sabe a palavra anã que solta Cinzal sem fúria (\"Brannoc paga a dívida\"), mas quer o martelo antes de contar.",
      npcs: [
        { nome: "Ingrith Brannoc", quem: "anã, última do clã, contratante", voz: "seca, dívida e honra na mesma frase", quer: "o Martelo da Têmpera e consertar o que o clã fez", segredo: "sabe a palavra que liberta Cinzal em paz, mas teme que a usem antes de ela pegar o martelo" },
        { nome: "Vaskra Três-Cinzas", quem: "chefe kobold do Clã Escama-de-Fuligem", voz: "sussurra e depois grita, negocia tudo nos dedos", quer: "o dragão fica, os humanos de pano vermelho saem", segredo: "conhece o caminho seco até a Fundição Baixa e tem um kobold infiltrado no culto" },
        { nome: "Ysolde Grã-Lume", quem: "ferreira e sumo-sacerdotisa do culto", voz: "calma de quem já decidiu, metáforas de metal, nunca sua", quer: "terminar a arma e soltar Cinzal em fúria", segredo: "está morrendo dos pulmões e quer que o fim do mundo seja obra dela" },
        { nome: "Cinzal", quem: "elemental de fogo acorrentado à bigorna-mãe", voz: "brasa dentro das paredes, curioso, irônico, faminto de ar", quer: "sair; em paz se puder, em fúria se precisar", segredo: "promete poupar a vila, mas solto sem a palavra anã queima tudo por uma hora" },
        { nome: "Irmão Tadeu", quem: "cultista arrependido, aprendiz de 17 anos", voz: "gagueja, pede desculpa antes de falar", quer: "voltar para casa", segredo: "a arma precisa do sangue de quem a forjou, e Ysolde pretende usar o dele" },
      ],
      locais: [
        { nome: "Galeria do penhasco e Portão Fundido", texto: "entrada seca, pegadas de kobold, estaca do culto" },
        { nome: "Salões Altos", texto: "pontes de corda sobre o salão alagado, ninhos kobolds, corredores armados" },
        { nome: "Salão das Correntes", texto: "sete correntes descem da cúpula ao fundo, vibrando de calor, runas em cada elo" },
        { nome: "Corredor de Têmpera", texto: "armadilhas anãs rearmadas pelo culto" },
        { nome: "Salões Afundados", texto: "água até a cintura que vai esquentando; um acólito afogado com um mapa" },
        { nome: "Fundição Baixa", texto: "bigorna-mãe, Cinzal acorrentado, a arma meio pronta, grades sobre metal derretido" },
      ],
      pistas: [
        "Pegadas de kobold entram, só pegadas humanas saem: dois grupos usam a galeria, e não são amigos.",
        "As correntes vibram mais perto do fundo; quem toca um elo sente o calor pulsar como batimento e ouve Cinzal.",
        "Marcas de fuligem em forma de garra dizem onde pisar nos corredores armados; as falsas, feitas pelo culto, são mais frescas.",
        "O acólito afogado carrega o mapa da Fundição Baixa e um diário com a receita da arma: sangue de quem forja.",
        "Tadeu, se achado antes do chefe, conta o plano e o ponto fraco: a arma inacabada se parte com frio ou água.",
        "Ingrith, pressionada ou diante do martelo, revela a palavra que solta Cinzal em paz.",
      ],
      reviravoltas: [
        "O \"dragão\" dos kobolds é um prisioneiro, e o incêndio que ferve o lago é obra de quem diz salvar o mundo.",
        "Ysolde não quer vencer: quer morrer na forja e voltar fundida ao fogo de Cinzal. Derrubá-la é o que ela espera.",
      ],
      relogio: [
        "o culto termina a lâmina: o lago ferve mais",
        "os kobolds fecham acordo com o culto e armam os Salões Altos contra o grupo",
        "Cinzal rompe a primeira corrente: tremores, uma ponte cai",
        "a arma recebe o sangue de Tadeu: Ysolde marcha para o Salão das Correntes",
        "Cinzal solto em fúria: gêiser no lago, Vau-Fundo em chamas",
      ],
      finais: [
        "Cinzal solto com a palavra anã: a forja esfria, o elemental sobe ao céu e Ingrith chora com o martelo nas mãos",
        "culto desfeito e Cinzal mantido preso: a forja vira tesouro de Vau-Fundo e os kobolds cobram pedágio para sempre",
        "acordo com Ysolde: a arma fica com o grupo, o culto some, o lago continua morno; alguém volta para terminar o serviço",
        "Cinzal solto em fúria: fuga pela galeria enquanto o lago explode; a vila lembra de quem a queimou",
      ],
      recompensas:
        "O Martelo da Têmpera (martelo de guerra com runa de ataque +1 e runa de golpe), 600 po em barras de ferro anão, uma runa de resistência a fogo gravada na bigorna (para quem Cinzal perdoar), o Clã Escama-de-Fuligem como batedores e Vau-Fundo em dívida. XP: encontro severo no chefe (120) e missão maior (80 a 120) para cada um.",
      sessoes: [
        "Vau-Fundo e a descida: lago fervendo, Ingrith e o mapa, Portão Fundido, Salões Altos (negociar com Vaskra ou abrir caminho), primeira armadilha. Gancho: Cinzal diz o nome de alguém do grupo.",
        "Salão das Correntes e Corredor de Têmpera (armadilhas em sequência), Salões Afundados esquentando, o acólito afogado, Tadeu. Gancho: uma corrente se parte e o salão treme.",
        "Fundição Baixa: acólitos nas grades, Ysolde em duas fases, as correntes de Cinzal e a escolha (palavra, correntes, acordo ou fuga). Epílogo em Vau-Fundo.",
      ],
      encontros: [
        {
          nome: "Sentinelas de Escama-de-Fuligem",
          onde: "Salões Altos, pontes de corda",
          inimigos: "6 kobolds capangas (nív. 1: CA 16, PV 18, lança/funda +8 1d6+2); Vaskra se a conversa azedar (nív. 3: CA 19, PV 42, lança +11 1d8+4)",
          tatica: "atiram das pontes e cortam uma corda com alguém no meio (Reflexos CD 18 ou cai na água morna: 1d6 de fogo por turno); nunca aceitam corpo a corpo aberto",
          saida: "fogem ao primeiro morto ou a uma oferta decente (comida, arma brilhante, expulsar o pano vermelho); Diplomacia CD 18 ou Intimidação CD 20 param a luta",
        },
        {
          nome: "Corredor de Têmpera",
          onde: "entre o Salão das Correntes e os Salões Afundados",
          inimigos: "3 armadilhas em sequência: placa com jato de vapor (Percepção CD 20 nota, Ladroagem CD 19 desarma, Reflexos CD 19: 2d10 de fogo), portão de peso que desce atrás (Percepção CD 18, Atletismo CD 22 segura, Ladroagem CD 21 trava) e grade sobre canal de metal (Acrobacia CD 18 para cruzar depressa; parar nela: 2d6 de fogo por turno)",
          tatica: "a placa empurra para o portão, o portão prende sobre a grade",
          saida: "quem lê as marcas de fuligem verdadeiras ou vem guiado por um kobold passa sem rolar: a masmorra premia quem fez amigos",
        },
        {
          nome: "Acólitos nas passarelas",
          onde: "Fundição Baixa, grades sobre metal derretido",
          inimigos: "4 cultistas (nív. 2: CA 17, PV 30, martelo +10 1d8+3; 1×/luta carvão aceso: Reflexos CD 18, 1d6 de fogo e desprevenido) e 1 acólita (nív. 3: CA 18, PV 36, toque ardente +11 2d6+2 de fogo, Raio Ígneo, Escudo)",
          tatica: "grades estreitas para negar flanco; empurram para os canais (Atletismo +10 vs Fortitude; no canal: 4d6 de fogo, sair pede Atletismo CD 20)",
          saida: "rendem-se quando Ysolde cai ou se Tadeu os chama pelo nome",
        },
        {
          nome: "Ysolde Grã-Lume, duas fases (chefe, severo)",
          onde: "plataforma sobre a bigorna-mãe",
          inimigos: "Fase 1, a Ferreira (nív. 6: CA 23, PV 95, martelo +16 2d8+7 e 1d6 de fogo; Golpe Temperado, 2 ações: empurra 3 m e deixa desprevenido; Fort +15, Ref +11, Von +13). Fase 2, a Temperada: a 35 PV se joga na forja e volta fundida ao fogo de Cinzal (CA 21, 70 PV novos, resistência a fogo 10, fraqueza a frio e água 10, Golpear +16 2d10+5 de fogo; Chama Partilhada, 1 ação: todos a 3 m, Reflexos CD 24, 3d6 de fogo); as grades esquentam: 2d6 de fogo a quem começa o turno nelas, as plataformas de pedra são seguras",
          tatica: "fase 1: prende um alvo e manda os acólitos empurrarem o resto para as grades; fase 2: avança devagar falando pela boca de Cinzal, entre o grupo e as correntes",
          saida: "3 correntes de Cinzal (Atletismo CD 22 ou 20 de dano cada; a palavra anã solta todas): soltas, Cinzal puxa Ysolde para a forja e a fase 2 acaba, mas ele fica livre; água (canal rompido, magia, o lago) tira a resistência dela por um turno",
        },
      ],
      complicacoes: [
        "o lago ferve mais e a água sobe",
        "Vaskra muda de lado por oferta melhor",
        "Tadeu foge e é recapturado",
        "uma corrente se parte e uma ponte cai",
        "Cinzal sussurra uma oferta a um personagem",
        "Ingrith some atrás do martelo",
      ],
    },
  },
];
