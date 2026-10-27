import type { ContextoSemente, SementesSistema } from "./index";

// Vampiro: A Máscara 5ª — noites brasileiras. Clã = classe, Tipo de Predador = ancestralidade (ids de vtm5/dados.ts).

const NOMES = [
  "Rafael", "Juliana", "Thiago", "Camila", "Bruno", "Larissa", "Diego", "Bianca", "Lucas", "Mariana", "Gustavo", "Fernanda", "Caio", "Jéssica",
  "Vinícius", "Tainá", "Rodrigo", "Aline", "Henrique", "Letícia", "Matheus", "Priscila", "Otávio", "Yasmin", "Igor", "Natália", "Wesley", "Débora",
];
const SOBRENOMES = [
  "Albuquerque", "Monteiro", "Cavalcanti", "Nogueira", "Bastos", "Prado", "Figueiredo", "Siqueira", "Rocha", "Andrade", "Teixeira", "Moura",
  "Barreto", "Tavares", "Queiroz", "Vasconcelos", "Lacerda", "Brandão", "Pires", "Salgado", "Damasceno", "Fontes",
];

/** Lista do clã misturada com a geral (o clã pesa mais por ter menos itens repetidos). */
const doCla = (mapa: Record<string, string[]>, geral: string[] = []) => (c: ContextoSemente) => c.sortear([...(mapa[c.classe] ?? []), ...(mapa[c.classe] ?? []), ...geral]);
const doPredador = (mapa: Record<string, string[]>, geral: string[]) => (c: ContextoSemente) => c.sortear([...(mapa[c.ancestralidade] ?? []), ...(mapa[c.ancestralidade] ?? []), ...geral]);

const CONCEITOS: Record<string, string[]> = {
  brujah: ["ex-professora de história que trocou a sala de aula pela barricada", "lutador de MMA que perdeu a última luta e a vida no mesmo mês", "estudante de direito revoltado com tudo, inclusive com os mortos"],
  gangrel: ["motoboy que conhece cada atalho da cidade e agora corre de noite", "bióloga de campo que se perdeu na mata e voltou diferente", "andarilho de rodoviária que dorme onde quer"],
  malkavianos: ["psicóloga que ouve os pacientes até depois que eles saem", "influenciador de teorias da conspiração que acertou uma", "taxista que sabe o destino antes do passageiro dizer"],
  nosferatu: ["hacker que vive nos túneis do metrô e nas redes alheias", "ex-modelo que perdeu o rosto e ganhou todos os segredos", "funcionário do saneamento que conhece as galerias melhor que ninguém"],
  toreador: ["DJ de festa underground que coleciona rostos bonitos", "galerista falida que ainda frequenta as vernissages certas", "tatuador que só tatua quem merece"],
  tremere: ["farmacêutica obcecada por fórmulas antigas", "bibliotecário de sebo que lê o que não devia", "professora de química que descobriu outra química"],
  ventrue: ["herdeiro de construtora que nunca trabalhou de dia, e agora nem pode", "advogada de banca grande que agora defende outros interesses", "deputado estadual que não pode mais aparecer em foto"],
  banu_haqim: ["ex-segurança particular que agora julga quem protege", "juíza aposentada que não confia mais nos tribunais", "matador de aluguel arrependido que encontrou uma lei maior"],
  hecata: ["agente funerário de família que conversa com os clientes", "médica legista que ouve os mortos na mesa de autópsia", "neto de benzedeira que herdou o que não queria"],
  lasombra: ["pastor de megaigreja com sombras que obedecem", "gestora de fundo de investimento que nunca aparece em reunião de dia", "político de bastidor que prefere não ter reflexo"],
  ministerio: ["dono de casa noturna que vende liberdade em prestações", "coach de autoajuda que liberta as pessoas de tudo, inclusive do juízo", "traficante de luxo com cara de sommelier"],
  ravnos: ["golpista de aplicativo que nunca dorme duas noites no mesmo lugar", "mágico de semáforo que faz truques demais", "caminhoneiro que some no meio da BR"],
  salubri: ["enfermeira do posto de saúde que ainda tenta curar", "terapeuta holística caçada por algo que nem entende", "padre que perdeu a fé e ganhou um terceiro olho"],
  tzimisce: ["cirurgião plástico que esculpe gente", "fazendeiro do interior que trata a terra como corpo", "arquiteta obcecada por possuir a casa perfeita"],
  caitiff: ["ninguém: Abraçado e largado num estacionamento de shopping", "entregador de aplicativo que acordou morto e continuou entregando", "estudante de intercâmbio que ninguém reclamou"],
  sangue_ralo: ["barista de madrugada que ainda consegue comer pão de queijo (às vezes)", "químico de garagem que mistura sangue e alquimia", "faxineira de hospital que nunca foi notada, nem pelo Senhor"],
};

const AMBICOES_CLA: Record<string, string[]> = {
  brujah: ["Fazer a revolução que os vivos não fizeram"],
  gangrel: ["Ter um território que ninguém ouse invadir"],
  malkavianos: ["Entender a mensagem que as vozes repetem toda noite"],
  nosferatu: ["Saber o segredo de cada ancião da cidade"],
  toreador: ["Criar uma obra que sobreviva a mim"],
  tremere: ["Subir na Pirâmide da Capela, ou derrubá-la"],
  ventrue: ["Ser Príncipe antes do próximo século"],
  banu_haqim: ["Punir o ancião que comete diablerie e sai impune"],
  hecata: ["Falar de novo com os meus mortos"],
  lasombra: ["Ser a mão que move o Príncipe sem aparecer"],
  ministerio: ["Libertar a cidade das próprias correntes"],
  ravnos: ["Nunca ser pego. Nunca."],
  salubri: ["Sobreviver à caçada e limpar o nome do meu sangue"],
  tzimisce: ["Ter um domínio que seja meu, carne e pedra"],
  caitiff: ["Provar que sangue não define ninguém"],
  sangue_ralo: ["Ser respeitado pelos sangue-grosso, ou pelo menos não ser caçado"],
};
const AMBICOES = [
  "Descobrir quem me Abraçou e por quê", "Conquistar um lugar na corte do Príncipe", "Derrubar o Barão que me humilhou", "Proteger meu bairro dos predadores (dos dois tipos)",
  "Ser lembrado como algo além de um monstro", "Juntar Recursos para nunca mais depender de ninguém", "Encontrar a cura, ou provar que não existe", "Vingar minha própria morte",
  "Controlar a noite de uma cidade inteira", "Manter minha família viva e longe disso tudo",
];

const DESEJOS_PREDADOR: Record<string, string[]> = {
  gato_beco: ["Achar uma rua sem câmera para caçar em paz"],
  ensacador: ["Trocar de fornecedor de bolsas antes que o hemocentro perceba"],
  sanguessuga: ["Provar o sangue daquele ancião arrogante"],
  cutelo: ["Que a família não perceba nada no almoço de domingo"],
  consensualista: ["Achar um doador novo que não faça perguntas"],
  fazendeiro: ["Passar mais uma noite sem tocar em sangue humano"],
  osiris: ["Lotar o culto (ou o show) desta sexta"],
  sonambulo: ["Entrar naquele condomínio sem acordar ninguém"],
  rainha_cena: ["Ser a dona da festa mais disputada da semana"],
  sereia: ["Que ninguém se apaixone de verdade desta vez"],
  extorsionario: ["Receber o que o dono da boate está devendo"],
  ladrao_tumulos: ["Achar o túmulo certo antes dos Hecata"],
  matador_estrada: ["Chegar na próxima cidade antes do amanhecer"],
  ceifador: ["Aliviar o paciente do quarto 12 antes que ele sofra mais"],
  montero: ["Que a matilha acerte a caçada sem bagunça"],
  perseguidor: ["Descobrir a rotina inteira da vítima escolhida"],
  alcapao: ["Que a armadilha funcione sem testemunhas"],
  coletor_dizimo: ["Cobrar o dízimo dos vampiros atrasados"],
};
const DESEJOS = [
  "Arrumar um refúgio que não seja o porta-malas", "Descobrir quem postou aquele vídeo", "Ver minha irmã de longe, sem ela me ver", "Beber de alguém feliz para lembrar como era",
  "Cobrar a dívida do Nosferatu da Sé", "Sair do Elysium sem ofender ninguém", "Conseguir dinheiro antes do aluguel vencer", "Dormir uma noite sem ouvir a Besta",
];

const SENHOR_CLA: Record<string, string> = {
  brujah: "Brujah, ex-sindicalista que ainda fala em revolução",
  gangrel: "Gangrel que mora num ferro-velho na periferia",
  malkavianos: "Malkaviana que conversa com semáforos",
  nosferatu: "Nosferatu que ninguém vê há anos, só os bilhetes",
  toreador: "Toreador dono de uma galeria na Vila Madalena",
  tremere: "Tremere do alto escalão da Capela local",
  ventrue: "Ventrue de terno, sobrenome de rua e paciência curta",
  banu_haqim: "Banu Haqim que fala pouco e julga muito",
  hecata: "Hecata de uma família de agentes funerários",
  lasombra: "Lasombra que ninguém nunca viu de frente",
  ministerio: "pastora do Ministério com um templo em cada bairro",
  ravnos: "Ravnos que já usou dez nomes diferentes",
  salubri: "Salubri foragido, com um olho fechado na testa",
  tzimisce: "Tzimisce que trata o refúgio como parte do corpo",
  caitiff: "desconhecido: ninguém viu, ninguém reivindicou",
  sangue_ralo: "outro sangue-ralo que mal sabia o que estava fazendo",
};
const SITUACAO_SENHOR = [
  "sumiu na noite seguinte ao Abraço", "te deve explicações e foge delas", "está em torpor num lugar que só você conhece", "foi executado pelo Xerife (dizem)",
  "ainda te liga toda noite, às 3h", "jura que te Abraçou por amor; ninguém acredita", "virou Anarquista e te deixou para trás", "continua por aí e quer um favor",
];

/** Convicção ↔ Pedra de Toque: a pessoa mortal que mantém a convicção de pé. */
const PARES: [string, string][] = [
  ["Nunca machucar uma criança", "Lucas, 9 anos, filho da vizinha que você ainda ajuda com o dever"],
  ["Não matar quem não pode se defender", "Dona Neide, a senhora do sebo que te empresta livros sem prazo"],
  ["Proteger minha família, custe o que custar", "Bia, minha irmã mais nova, que estuda enfermagem"],
  ["Nunca mentir para quem confia em mim", "Caio, amigo desde a escola, que acha que você trabalha de madrugada"],
  ["Pagar todas as dívidas, de dinheiro ou de sangue", "Seu Antônio, dono do bar que te fiou por anos"],
  ["Não deixar ninguém morrer sozinho", "Irmã Lúcia, voluntária do hospital onde você caça"],
  ["Nunca beber de quem está bêbado ou drogado", "Júlia, ex-namorada que ainda frequenta as mesmas festas"],
  ["Defender quem a cidade esqueceu", "Mestre Zé, que dá aula de capoeira de graça na praça"],
  ["Não trair quem anda comigo", "Rafa, o motorista de aplicativo que sempre te leva para casa"],
  ["Manter minha arte viva, mesmo morta", "Clara, a aluna de piano que ainda vem às terças"],
  ["Nunca tomar o que não me foi oferecido", "Pedro, o doador que deixa você beber e acha que é um fetiche"],
  ["Enfrentar quem abusa do poder", "Marta, jornalista que investiga a polícia e não sabe de você"],
];

const VANTAGENS_CLA: Record<string, string[]> = {
  ventrue: ["Influência ●● (conselho de uma construtora)", "Status ● (sobrenome que abre portas no Elysium)"],
  toreador: ["Fama ●● (DJ conhecido na cena)", "Rebanho ●● (os frequentadores da sua festa)"],
  nosferatu: ["Contatos ●● (quem trabalha no subsolo da cidade)", "Refúgio ●● (galeria de esgoto reformada)"],
  brujah: ["Aliados ●● (o movimento estudantil)", "Contatos ● (o sindicato dos metroviários)"],
  gangrel: ["Refúgio ● (um sítio na beira da estrada)", "Aliados ● (os cachorros do bairro, literalmente)"],
  tremere: ["Mawla ● (um regente da Capela)", "Refúgio ●● (uma biblioteca com porão)"],
  malkavianos: ["Contatos ● (pacientes de um centro de atenção psicossocial)", "Mawla ● (um ancião que só fala em charadas)"],
  banu_haqim: ["Contatos ●● (seguranças de boate)", "Máscara ●● (identidades falsas perfeitas)"],
  hecata: ["Refúgio ●● (a funerária da família)", "Aliados ● (coveiros do cemitério municipal)"],
  lasombra: ["Influência ●● (uma igreja de bairro)", "Lacaio ● (um fiel que faria qualquer coisa)"],
  ministerio: ["Rebanho ●● (os fiéis do templo)", "Influência ● (a vida noturna do bairro)"],
  ravnos: ["Máscara ●● (dez identidades, nenhuma verdadeira)", "Contatos ● (camelôs do centro)"],
  salubri: ["Aliados ● (uma clínica popular)", "Máscara ● (um nome emprestado)"],
  tzimisce: ["Refúgio ●●● (uma casa que é sua até os ossos)", "Lacaio ●● (uma família de carniçais)"],
  caitiff: ["Contatos ● (outros esquecidos da cidade)"],
  sangue_ralo: ["Contatos ● (a turma sangue-ralo do bairro)", "Aliados ● (colegas de trabalho que te acobertam)"],
};
const VANTAGENS = [
  "Refúgio ● (um quarto sem janela num prédio do centro)", "Refúgio ●● (apartamento com janelas pintadas de preto)", "Contatos ● (um enfermeiro do pronto-socorro)",
  "Contatos ●● (um delegado que não faz perguntas)", "Aliados ● (uma turma de motoboys)", "Rebanho ● (três doadores que acham que é um clube)",
  "Influência ● (associação de moradores)", "Fama ● (conhecido na cena noturna)", "Mawla ● (um ancião que às vezes atende o telefone)",
  "Lacaio ● (um carniçal que dirige e não pergunta)", "Máscara ● (documentos falsos bons)", "Status ● (reconhecido na corte do Príncipe)",
];
const DEFEITOS = [
  "Inimigo ● (um investigador da Polícia Civil que viu demais)", "Adversário ● (um Neófito rival na corte)", "Suspeito ● (o Xerife está de olho)",
  "Presa Exclusiva ● (só bebe de quem tem tatuagem)", "Vício ● (só sacia com sangue de quem bebeu)", "Obscuro ● (ninguém na corte sabe quem você é, e isso não ajuda)",
  "Rebanho Instável ● (os doadores falam demais)", "Caçado ● (a Segunda Inquisição tem seu rosto)", "Dívida ● (Prestação com um ancião Ventrue)",
  "Refúgio Comprometido ● (o síndico desconfia)",
];

const ESPECIALIDADES: Record<string, string[]> = {
  brujah: ["Briga (bar lotado)", "Liderança (protesto)", "Erudição (história)"],
  gangrel: ["Sobrevivência (mata urbana)", "Empatia com Animais (cães)", "Condução (moto)"],
  malkavianos: ["Intuição (mentiras)", "Ocultismo (presságios)", "Percepção (detalhes estranhos)"],
  nosferatu: ["Tecnologia (invasão de sistemas)", "Furtividade (túneis)", "Investigação (segredos alheios)"],
  toreador: ["Performance (música eletrônica)", "Etiqueta (vernissages)", "Persuasão (sedução)"],
  tremere: ["Ocultismo (rituais)", "Ciência (química)", "Erudição (latim)"],
  ventrue: ["Finanças (mercado imobiliário)", "Liderança (reuniões)", "Política (câmara municipal)"],
  banu_haqim: ["Armas Brancas (facas)", "Furtividade (emboscada)", "Investigação (crimes)"],
  hecata: ["Ocultismo (necromancia)", "Medicina (cadáveres)", "Intimidação (presença fúnebre)"],
  lasombra: ["Persuasão (sermões)", "Intimidação (ameaça velada)", "Política (bastidores)"],
  ministerio: ["Lábia (tentação)", "Performance (pregação)", "Manha (vida noturna)"],
  ravnos: ["Lábia (golpes)", "Furto (bolsos)", "Condução (fugas)"],
  salubri: ["Medicina (primeiros socorros)", "Intuição (dor alheia)", "Ocultismo (visões)"],
  tzimisce: ["Medicina (cirurgia)", "Ofícios (escultura)", "Intimidação (o corpo)"],
  caitiff: ["Manha (sobreviver na rua)", "Lábia (desculpas)", "Atletismo (correr)"],
  sangue_ralo: ["Ciência (alquimia caseira)", "Manha (bicos)", "Tecnologia (celulares)"],
};

export const VTM5: SementesSistema = {
  cenarios: [
    "São Paulo, 3h da manhã: o Príncipe da Camarilla convoca um Elysium extraordinário no último andar de um prédio da Paulista. Alguém quebrou a Máscara num vídeo que já passou de 200 mil visualizações.",
    "Brasília, seca de agosto: no Eixo Monumental os mortos fazem política como os vivos, em salas sem janela. Um Ventrue do Lago Sul sumiu e deixou uma dívida de sangue (Prestação) no seu nome.",
    "Rio de Janeiro, Carnaval: no meio dos blocos, os Anarquistas caçam livres e o Barão da Lapa jura que a cidade é deles. A Camarilla discorda, com estacas.",
    "Salvador, Pelourinho: um casarão antigo guarda um segredo que os Hecata querem desenterrar, literalmente. E os vivos do bairro não vão deixar barato.",
    "Recife, pontes e mangue: corpos drenados aparecem no Capibaribe. A Segunda Inquisição já tem um nome na lista. Talvez o seu.",
    "Belo Horizonte, a primeira noite após o Abraço: você acorda num porão na Savassi, com fome, sem celular e sem ideia de quem fez isso. Seu Senhor deixou só um bilhete: “não saia antes das 19h”.",
    "Porto Alegre, inverno: o refúgio de vocês pegou fogo de dia. Acidente não foi. Alguém sabe onde vocês dormem.",
    "Curitiba, neblina: uma coterie de Neófitos recebe a tarefa de vigiar um caçador aposentado. Ele não está tão aposentado assim.",
    "Manaus, porto e floresta: um carregamento que não pode ser aberto chega pelo rio. O Ministério quer, os Gangrel da mata também, e o Príncipe quer silêncio.",
    "São Paulo, Baixo Augusta: seu Senhor desapareceu há três noites. O Xerife quer respostas antes do amanhecer, e você é a única pista que sobrou.",
  ],
  ganchos: [
    "Foi Abraçado sem permissão do Príncipe: oficialmente, nem deveria existir.",
    "Deve um favor (Prestação) a um ancião que ainda não disse o que vai cobrar.",
    "O Senhor sumiu na noite seguinte ao Abraço e deixou só a chave de um guarda-volumes na rodoviária.",
    "Ainda manda mensagem para a mãe toda semana, fingindo que trabalha de noite.",
    "Bebeu do sangue de um vampiro três vezes. Não lembra de quem. Mas sente falta.",
    "Um caçador da Segunda Inquisição tem uma foto sua de antes do Abraço.",
    "Matou alguém na primeira noite de fome e o corpo nunca foi encontrado. Ainda.",
    "Trocou a Camarilla pelos Anarquistas (ou o contrário) e os antigos amigos não esqueceram.",
    "Tem um carniçal fiel que sabe demais e anda pedindo mais sangue do que deveria.",
    "Viu algo no Elysium que não devia: um Príncipe com medo.",
    "O refúgio é emprestado por alguém que pode pedir de volta qualquer noite.",
    "A pessoa que você mais amava acha que você morreu num acidente. Você foi ao próprio enterro.",
  ],
  tons: ["horror pessoal", "intriga política noturna", "noir urbano", "tragédia lenta e elegante", "punk e raivoso", "paranoia de quem é caçado", "sombrio e debochado"],
  campanhas: ["Noites Paulistanas", "Sangue no Eixo Monumental", "A Última Prestação", "Cinzas na Lapa", "O Elysium Não Dorme", "Fome de Asfalto", "Antes que o Sol Nasça"],
  nomes: { primeiros: NOMES, sobrenomes: SOBRENOMES },
  exemploNome: "Ex.: Juliana Cavalcanti",
  exemploHistoria: "Quem você era antes do Abraço, quem te Abraçou, o que ainda te prende aos vivos…",
  exemploCenario: "Em branco, o mestre escolhe a cidade e a noite. Ele adora um Elysium tenso.",
  campos: {
    conceito: { exemplo: (c) => `Ex.: ${CONCEITOS[c.classe]?.[0] ?? "ex-policial afogado em culpa"}`, gerar: doCla(CONCEITOS) },
    ambicao: { exemplo: "Ex.: descobrir quem me Abraçou e por quê", gerar: doCla(AMBICOES_CLA, AMBICOES) },
    desejo: { exemplo: "Ex.: arrumar um refúgio que não seja o porta-malas", gerar: doPredador(DESEJOS_PREDADOR, DESEJOS) },
    senhor: {
      exemplo: (c) => `Ex.: Dona Cida, ${SENHOR_CLA[c.classe] ?? "Toreador do antiquário na Augusta"}`,
      gerar: (c) => {
        const desconhecido = c.classe === "caitiff" || c.classe === "sangue_ralo";
        const quem = desconhecido ? "Sem nome" : `${c.sortear(NOMES)} ${c.sortear(SOBRENOMES)}`;
        return `${quem}, ${SENHOR_CLA[c.classe] ?? "vampiro de clã incerto"}; ${c.sortear(SITUACAO_SENHOR)}`;
      },
    },
    especialidades: { exemplo: (c) => `Ex.: ${ESPECIALIDADES[c.classe]?.[0] ?? "Lábia (sedução)"}`, gerar: doCla(ESPECIALIDADES, ["Manha (vida noturna)", "Lábia (desculpas)"]) },
    vantagens: { exemplo: "Ex.: Refúgio ●● (apartamento com janelas pintadas de preto)", gerar: doCla(VANTAGENS_CLA, VANTAGENS), pronto: 2 },
    defeitos: { exemplo: "Ex.: Inimigo ● (um delegado que viu demais)", gerar: (c) => c.sortear(DEFEITOS) },
  },
  pares: [
    {
      campo: "conviccoes",
      par: "pedrasToque",
      titulo: "Convicções e Pedras de Toque",
      ajuda: "Cada Convicção é uma regra moral; a Pedra de Toque é o mortal que a mantém de pé. Se a pessoa sofre, a convicção treme (e vêm as Manchas).",
      rotulos: ["Convicção", "Pedra de Toque"],
      exemplos: ["Ex.: nunca machucar uma criança", "Ex.: Lucas, 9 anos, filho da vizinha"],
      gerar: (c) => c.sortear(PARES),
      pronto: 2,
    },
  ],
  // as perícias por valor ficam com o clã e o tipo de predador (o servidor completa com coerência)
  deixarParaOSistema: ["pericias_4", "pericias_3", "pericias_2", "pericias_1"],
};
