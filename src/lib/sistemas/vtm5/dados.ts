import type { AtributoDef, OpcaoSimples, PericiaDef } from "../tipos";

// Tabelas de Vampiro: A Máscara 5ª edição. Fã-conteúdo sob a política Dark Pack: as mecânicas estão resumidas com
// palavras da casa; nenhum texto dos livros foi copiado. Nomes de clãs, disciplinas e termos do jogo são os usuais em português.

export const ATRIBUTOS: AtributoDef[] = [
  { id: "forca", nome: "Força", abrev: "For", descricao: "Músculo bruto: erguer, quebrar, socar." },
  { id: "destreza", nome: "Destreza", abrev: "Des", descricao: "Mãos rápidas, pés leves, mira firme." },
  { id: "vigor", nome: "Vigor", abrev: "Vig", descricao: "Aguentar pancada. Define a Saúde." },
  { id: "carisma", nome: "Carisma", abrev: "Car", descricao: "Presença que faz a sala virar a cabeça." },
  { id: "manipulacao", nome: "Manipulação", abrev: "Man", descricao: "Levar os outros para onde você quer sem que percebam." },
  { id: "autocontrole", nome: "Autocontrole", abrev: "Aut", descricao: "Sangue-frio (literalmente). Entra na Força de Vontade." },
  { id: "inteligencia", nome: "Inteligência", abrev: "Int", descricao: "Raciocínio lento e profundo, memória, estudo." },
  { id: "raciocinio", nome: "Raciocínio", abrev: "Rac", descricao: "Pensar rápido quando a faca já está no ar." },
  { id: "determinacao", nome: "Determinação", abrev: "Det", descricao: "Teimosia focada. Entra na Força de Vontade." },
];

export const CATEGORIAS_ATRIBUTOS: { titulo: string; ids: string[] }[] = [
  { titulo: "Físicos", ids: ["forca", "destreza", "vigor"] },
  { titulo: "Sociais", ids: ["carisma", "manipulacao", "autocontrole"] },
  { titulo: "Mentais", ids: ["inteligencia", "raciocinio", "determinacao"] },
];

/** Atributo que acompanha um atributo pedido sozinho ("Força" → Força + Vigor). */
export const PAR_DE_ATRIBUTO: Record<string, string> = {
  forca: "vigor",
  destreza: "raciocinio",
  vigor: "determinacao",
  carisma: "autocontrole",
  manipulacao: "autocontrole",
  autocontrole: "determinacao",
  inteligencia: "determinacao",
  raciocinio: "autocontrole",
  determinacao: "autocontrole",
};

export type PericiaVtm = PericiaDef & { atributo: string; apelidos?: string[] };

export const PERICIAS: PericiaVtm[] = [
  // físicas
  { id: "atletismo", nome: "Atletismo", atributo: "destreza", descricao: "Correr, pular, escalar, nadar.", apelidos: ["athletics"] },
  { id: "briga", nome: "Briga", atributo: "forca", descricao: "Soco, agarrão, mordida, garra.", apelidos: ["brawl", "desarmado", "luta"] },
  { id: "oficios", nome: "Ofícios", atributo: "destreza", descricao: "Consertar, fabricar, falsificar.", apelidos: ["oficio", "craft"] },
  { id: "conducao", nome: "Condução", atributo: "destreza", descricao: "Dirigir bem, e fugir dirigindo.", apelidos: ["dirigir", "drive", "pilotar"] },
  { id: "armas_fogo", nome: "Armas de Fogo", atributo: "destreza", descricao: "Atirar, recarregar, cuidar da arma.", apelidos: ["arma de fogo", "tiro", "firearms"] },
  { id: "furto", nome: "Furto", atributo: "destreza", descricao: "Fechaduras, bolsos, alarmes.", apelidos: ["ladroagem", "larceny", "arrombar"] },
  { id: "armas_brancas", nome: "Armas Brancas", atributo: "forca", descricao: "Facas, bastões, estacas, espadas.", apelidos: ["arma branca", "melee", "corpo a corpo"] },
  { id: "furtividade", nome: "Furtividade", atributo: "destreza", descricao: "Sumir na sombra e no meio da multidão.", apelidos: ["stealth", "esgueirar"] },
  { id: "sobrevivencia", nome: "Sobrevivência", atributo: "raciocinio", descricao: "Rastrear, se abrigar, viver longe da cidade.", apelidos: ["survival", "rastrear"] },
  // sociais
  { id: "empatia_animais", nome: "Empatia com Animais", atributo: "carisma", descricao: "Acalmar cães que odeiam vampiros.", apelidos: ["trato com animais", "animal ken"] },
  { id: "etiqueta", nome: "Etiqueta", atributo: "carisma", descricao: "Saber qual garfo usar no Elísio.", apelidos: ["etiquette"] },
  { id: "intuicao", nome: "Intuição", atributo: "raciocinio", descricao: "Ler intenções, mentiras e medos.", apelidos: ["insight", "empatia"] },
  { id: "intimidacao", nome: "Intimidação", atributo: "carisma", descricao: "Fazer a pessoa recuar sem tocar nela.", apelidos: ["intimidation", "intimidar"] },
  { id: "lideranca", nome: "Liderança", atributo: "carisma", descricao: "Dar ordens que as pessoas seguem.", apelidos: ["leadership"] },
  { id: "performance", nome: "Performance", atributo: "carisma", descricao: "Cantar, dançar, atuar, discursar.", apelidos: ["atuacao", "atuar"] },
  { id: "persuasao", nome: "Persuasão", atributo: "carisma", descricao: "Convencer com argumentos (ou quase).", apelidos: ["persuasion", "convencer"] },
  { id: "manha", nome: "Manha", atributo: "raciocinio", descricao: "Conhecer a rua, os becos e quem vende o quê.", apelidos: ["streetwise", "malandragem", "rua"] },
  { id: "labia", nome: "Lábia", atributo: "manipulacao", descricao: "Mentir, blefar, disfarçar intenções.", apelidos: ["subterfugio", "subterfuge", "enganacao", "mentir"] },
  // mentais
  { id: "erudicao", nome: "Erudição", atributo: "inteligencia", descricao: "História, artes, línguas, bibliotecas.", apelidos: ["academicos", "academics"] },
  { id: "percepcao", nome: "Percepção", atributo: "raciocinio", descricao: "Notar o que está fora do lugar.", apelidos: ["prontidao", "awareness", "perceber"] },
  { id: "financas", nome: "Finanças", atributo: "inteligencia", descricao: "Dinheiro, contas, lavagem e propina.", apelidos: ["finance"] },
  { id: "investigacao", nome: "Investigação", atributo: "inteligencia", descricao: "Seguir pistas até o fim do fio.", apelidos: ["investigation", "investigar"] },
  { id: "medicina", nome: "Medicina", atributo: "inteligencia", descricao: "Tratar feridas, conhecer veias.", apelidos: ["medicine"] },
  { id: "ocultismo", nome: "Ocultismo", atributo: "inteligencia", descricao: "Rituais, lendas e o que espreita além.", apelidos: ["occult"] },
  { id: "politica", nome: "Política", atributo: "inteligencia", descricao: "Quem manda, quem deve, quem cai.", apelidos: ["politics"] },
  { id: "ciencia", nome: "Ciência", atributo: "inteligencia", descricao: "Química, biologia, física aplicada.", apelidos: ["science"] },
  { id: "tecnologia", nome: "Tecnologia", atributo: "inteligencia", descricao: "Computadores, câmeras, celulares alheios.", apelidos: ["technology", "computador", "hacker"] },
];

export const CATEGORIAS_PERICIAS: { titulo: string; ids: string[] }[] = [
  { titulo: "Físicas", ids: PERICIAS.slice(0, 9).map((p) => p.id) },
  { titulo: "Sociais", ids: PERICIAS.slice(9, 18).map((p) => p.id) },
  { titulo: "Mentais", ids: PERICIAS.slice(18).map((p) => p.id) },
];

export type DisciplinaVtm = { id: string; nome: string; atributo: string; descricao: string; apelidos?: string[] };

export const DISCIPLINAS: DisciplinaVtm[] = [
  { id: "animalismo", nome: "Animalismo", atributo: "carisma", descricao: "Falar com bichos, mandar neles e domar a própria Besta.", apelidos: ["animalism"] },
  { id: "auspicios", nome: "Auspícios", atributo: "raciocinio", descricao: "Sentidos afiados, auras e vislumbres do que vem.", apelidos: ["auspex"] },
  { id: "celeridade", nome: "Celeridade", atributo: "destreza", descricao: "Rapidez sobrenatural: o mundo fica em câmera lenta.", apelidos: ["rapidez", "celerity"] },
  { id: "dominacao", nome: "Dominação", atributo: "manipulacao", descricao: "Ordens que entram pelos olhos e apagam memórias.", apelidos: ["dominate", "dominar"] },
  { id: "fortitude", nome: "Fortitude", atributo: "vigor", descricao: "Carne que não cede a balas, ao fogo nem a argumentos.", apelidos: ["fortitude"] },
  { id: "ofuscacao", nome: "Ofuscação", atributo: "raciocinio", descricao: "Ser esquecido, ignorado ou confundido com outra pessoa.", apelidos: ["obfuscate", "ofuscar"] },
  { id: "oblivio", nome: "Oblívio", atributo: "determinacao", descricao: "Sombras que obedecem e o frio do outro lado.", apelidos: ["oblivion", "obtenebracao"] },
  { id: "potencia", nome: "Potência", atributo: "forca", descricao: "Força que arranca portas e quebra concreto.", apelidos: ["potence"] },
  { id: "presenca", nome: "Presença", atributo: "carisma", descricao: "Encanto, pavor e devoção sob encomenda.", apelidos: ["presence"] },
  { id: "metamorfose", nome: "Metamorfose", atributo: "vigor", descricao: "Garras, olhos na escuridão, virar lobo ou névoa.", apelidos: ["protean", "metamorfosear"] },
  { id: "feiticaria", nome: "Feitiçaria de Sangue", atributo: "inteligencia", descricao: "Rituais e truques com a própria Vitae.", apelidos: ["feiticaria de sangue", "blood sorcery", "taumaturgia"] },
  { id: "alquimia", nome: "Alquimia de Sangue-ralo", atributo: "inteligencia", descricao: "Fórmulas improvisadas que imitam poderes de sangue grosso.", apelidos: ["alquimia", "thin-blood alchemy", "alquimia sangue-ralo"] },
];

/** Disciplinas que só alguns clãs aprendem (para o ponto do tipo de predador e para Caitiff). */
export const DISCIPLINAS_RESTRITAS: Record<string, string[]> = {
  feiticaria: ["tremere", "banu_haqim"],
  oblivio: ["lasombra", "hecata"],
  alquimia: ["sangue_ralo"],
};

export type ClaVtm = {
  id: string;
  nome: string;
  descricao: string;
  disciplinas: string[];
  perdicao: string;
  compulsao: { nome: string; efeito: string } | null;
  atributoChave: string;
  /** prioridade dos 9 atributos para a distribuição 4/3/3/3/2/2/2/2/1 */
  ordem: string[];
  pericias: string[];
  papel: string;
};

export const CLAS: ClaVtm[] = [
  {
    id: "brujah",
    nome: "Brujah",
    descricao: "Rebeldes, filósofos de bar e punhos em busca de um motivo. Paixão demais para um coração que não bate.",
    disciplinas: ["celeridade", "potencia", "presenca"],
    perdicao: "A raiva mora perto da pele: resistir ao frenesi de fúria custa dados iguais à gravidade da perdição.",
    compulsao: { nome: "Rebeldia", efeito: "Precisa desafiar a autoridade da vez; qualquer ação que não seja contestar sofre −2 dados até conseguir." },
    atributoChave: "forca",
    ordem: ["forca", "carisma", "destreza", "vigor", "raciocinio", "manipulacao", "determinacao", "autocontrole", "inteligencia"],
    pericias: ["briga", "intimidacao", "lideranca", "manha", "atletismo", "politica", "persuasao"],
    papel: "combatente",
  },
  {
    id: "gangrel",
    nome: "Gangrel",
    descricao: "Andarilhos selvagens com mais em comum com lobos do que com príncipes. A cidade é só outra floresta.",
    disciplinas: ["animalismo", "fortitude", "metamorfose"],
    perdicao: "A Besta deixa marcas: a cada frenesi ganham traços animais que dão penalidade igual à gravidade em testes sociais ou mentais.",
    compulsao: { nome: "Instinto Feral", efeito: "Age como bicho: fala pouco, fareja, rosna; testes sociais e mentais complexos sofrem −2 dados." },
    atributoChave: "vigor",
    ordem: ["vigor", "destreza", "forca", "raciocinio", "determinacao", "autocontrole", "carisma", "inteligencia", "manipulacao"],
    pericias: ["sobrevivencia", "empatia_animais", "briga", "atletismo", "furtividade", "percepcao", "intimidacao"],
    papel: "combatente",
  },
  {
    id: "malkavianos",
    nome: "Malkavianos",
    descricao: "Profetas quebrados que ouvem o que ninguém mais ouve. Às vezes é verdade. Às vezes é pior.",
    disciplinas: ["auspicios", "dominacao", "ofuscacao"],
    perdicao: "A mente racha: quando a perdição desperta (Crítico Sujo, Falha Bestial, frenesi), sofrem penalidade igual à gravidade por uma cena.",
    compulsao: { nome: "Delírio", efeito: "A realidade embaralha: testes de Raciocínio e Intuição sofrem −2 dados até a visão passar." },
    atributoChave: "raciocinio",
    ordem: ["raciocinio", "inteligencia", "manipulacao", "determinacao", "autocontrole", "destreza", "carisma", "vigor", "forca"],
    pericias: ["intuicao", "ocultismo", "percepcao", "investigacao", "labia", "furtividade", "medicina"],
    papel: "místico",
  },
  {
    id: "nosferatu",
    nome: "Nosferatu",
    descricao: "Rostos que espantam até ratos e ouvidos em cada parede. Quem sabe tudo raramente é convidado para a festa.",
    disciplinas: ["animalismo", "ofuscacao", "potencia"],
    perdicao: "Repulsivos: disfarces naturais falham e testes para parecer humano ou agradar a aparência perdem dados iguais à gravidade.",
    compulsao: { nome: "Criptofilia", efeito: "Fome de segredos: precisa descobrir algo escondido; outras ações sofrem −2 dados até lá." },
    atributoChave: "destreza",
    ordem: ["destreza", "raciocinio", "inteligencia", "forca", "vigor", "determinacao", "autocontrole", "manipulacao", "carisma"],
    pericias: ["furtividade", "tecnologia", "manha", "investigacao", "furto", "percepcao", "ocultismo"],
    papel: "especialista",
  },
  {
    id: "toreador",
    nome: "Toreador",
    descricao: "Estetas eternos, apaixonados por beleza e por quem a tem. O tédio é o único pecado imperdoável.",
    disciplinas: ["auspicios", "celeridade", "presenca"],
    perdicao: "Feiura dói: em lugares feios ou sem graça, perdem dados iguais à gravidade em tudo.",
    compulsao: { nome: "Obsessão", efeito: "Fixa-se numa coisa bela; qualquer ação que não a envolva sofre −2 dados até a cena mudar." },
    atributoChave: "carisma",
    ordem: ["carisma", "destreza", "manipulacao", "raciocinio", "autocontrole", "inteligencia", "determinacao", "vigor", "forca"],
    pericias: ["performance", "etiqueta", "persuasao", "oficios", "intuicao", "erudicao", "percepcao"],
    papel: "social",
  },
  {
    id: "tremere",
    nome: "Tremere",
    descricao: "Magos de sangue com uma pirâmide em ruínas e muito a provar. O conhecimento é a única coisa que não apodrece.",
    disciplinas: ["auspicios", "dominacao", "feiticaria"],
    perdicao: "Vitae falha: o sangue deles mal cria laços; quem bebe precisa de mais doses (a gravidade soma às exigências).",
    compulsao: { nome: "Perfeccionismo", efeito: "Nada está bom o bastante: toda ação sofre −2 dados até um resultado impecável." },
    atributoChave: "inteligencia",
    ordem: ["inteligencia", "determinacao", "raciocinio", "manipulacao", "autocontrole", "carisma", "destreza", "vigor", "forca"],
    pericias: ["ocultismo", "erudicao", "ciencia", "investigacao", "intuicao", "politica", "medicina"],
    papel: "místico",
  },
  {
    id: "ventrue",
    nome: "Ventrue",
    descricao: "Aristocratas que tratam a noite como uma sala de diretoria. Coroa pesada, paladar exigente.",
    disciplinas: ["dominacao", "fortitude", "presenca"],
    perdicao: "Paladar seletivo: só se nutrem de um tipo específico de presa; outro sangue é vomitado, salvo vencendo um teste difícil.",
    compulsao: { nome: "Arrogância", efeito: "Precisa que obedeçam: ações que não sejam dar ordens sofrem −2 dados até alguém se curvar." },
    atributoChave: "carisma",
    ordem: ["carisma", "manipulacao", "autocontrole", "determinacao", "inteligencia", "vigor", "raciocinio", "destreza", "forca"],
    pericias: ["lideranca", "etiqueta", "financas", "persuasao", "politica", "intimidacao", "intuicao"],
    papel: "social",
  },
  {
    id: "banu_haqim",
    nome: "Banu Haqim",
    descricao: "Juízes, guardiões e assassinos com um código. O problema é que o sangue dos culpados tem um gosto ótimo.",
    disciplinas: ["celeridade", "ofuscacao", "feiticaria"],
    perdicao: "Vício em Vitae: provar sangue de vampiro exige teste para parar, com penalidade igual à gravidade.",
    compulsao: { nome: "Julgamento", efeito: "Precisa punir quem transgrediu seus princípios; outras ações sofrem −2 dados até lá." },
    atributoChave: "destreza",
    ordem: ["destreza", "raciocinio", "determinacao", "forca", "autocontrole", "inteligencia", "vigor", "manipulacao", "carisma"],
    pericias: ["armas_brancas", "furtividade", "atletismo", "investigacao", "ocultismo", "percepcao", "intuicao"],
    papel: "combatente",
  },
  {
    id: "hecata",
    nome: "Hecata",
    descricao: "Família de necromantes que fala com os mortos e cobra caro pelo recado. Os fantasmas não têm escolha.",
    disciplinas: ["auspicios", "fortitude", "oblivio"],
    perdicao: "Beijo que dói: a mordida é agonia, não êxtase; a vítima luta e gera dano extra igual à gravidade.",
    compulsao: { nome: "Morbidez", efeito: "Obcecado pela morte: precisa investigar ou provocar algo morto; outras ações −2 dados." },
    atributoChave: "determinacao",
    ordem: ["determinacao", "inteligencia", "vigor", "manipulacao", "autocontrole", "raciocinio", "forca", "destreza", "carisma"],
    pericias: ["ocultismo", "medicina", "erudicao", "intimidacao", "investigacao", "intuicao", "financas"],
    papel: "místico",
  },
  {
    id: "lasombra",
    nome: "Lasombra",
    descricao: "Senhores da escuridão, ambiciosos e implacáveis. Espelhos e câmeras não os reconhecem, e eles não sentem falta.",
    disciplinas: ["dominacao", "oblivio", "potencia"],
    perdicao: "Sem reflexo: não aparecem em espelhos nem fotos direito, e tecnologia moderna falha perto deles (penalidade igual à gravidade).",
    compulsao: { nome: "Crueldade", efeito: "Precisa dominar ou ferir alguém; ações que não demonstrem poder sofrem −2 dados." },
    atributoChave: "manipulacao",
    ordem: ["manipulacao", "determinacao", "forca", "carisma", "autocontrole", "inteligencia", "raciocinio", "vigor", "destreza"],
    pericias: ["lideranca", "intimidacao", "politica", "labia", "ocultismo", "briga", "etiqueta"],
    papel: "social",
  },
  {
    id: "ministerio",
    nome: "Ministério",
    descricao: "Sacerdotes do desejo que libertam (e acorrentam) almas pelo prazer. A tentação é um sacramento.",
    disciplinas: ["ofuscacao", "presenca", "metamorfose"],
    perdicao: "Luz forte machuca: sob iluminação intensa sofrem penalidade igual à gravidade, e o sol queima mais.",
    compulsao: { nome: "Transgressão", efeito: "Precisa fazer alguém quebrar uma regra pessoal; outras ações sofrem −2 dados até lá." },
    atributoChave: "manipulacao",
    ordem: ["manipulacao", "carisma", "raciocinio", "autocontrole", "destreza", "inteligencia", "determinacao", "vigor", "forca"],
    pericias: ["labia", "persuasao", "ocultismo", "manha", "intuicao", "performance", "etiqueta"],
    papel: "social",
  },
  {
    id: "ravnos",
    nome: "Ravnos",
    descricao: "Viajantes e trapaceiros que nunca ficam muito tempo. Quem para, queima.",
    disciplinas: ["animalismo", "ofuscacao", "presenca"],
    perdicao: "Ficar parado é fatal: dormir no mesmo refúgio noites seguidas faz o sangue arder (dano agravado ligado à gravidade).",
    compulsao: { nome: "Tentar a Sorte", efeito: "Precisa resolver tudo do jeito mais arriscado; o jeito seguro sofre −2 dados." },
    atributoChave: "raciocinio",
    ordem: ["raciocinio", "carisma", "destreza", "manipulacao", "autocontrole", "vigor", "determinacao", "inteligencia", "forca"],
    pericias: ["labia", "furto", "conducao", "manha", "performance", "furtividade", "persuasao"],
    papel: "especialista",
  },
  {
    id: "salubri",
    nome: "Salubri",
    descricao: "Curandeiros caçados, de terceiro olho e sangue cobiçado. Quase extintos, sempre perseguidos.",
    disciplinas: ["auspicios", "dominacao", "fortitude"],
    perdicao: "Sangue desejado: outros vampiros que os provam tendem a não parar, e o terceiro olho sangra ao usar poderes.",
    compulsao: { nome: "Empatia Dolorosa", efeito: "Precisa aliviar o sofrimento de alguém por perto; outras ações sofrem −2 dados." },
    atributoChave: "determinacao",
    ordem: ["determinacao", "autocontrole", "inteligencia", "carisma", "raciocinio", "vigor", "manipulacao", "destreza", "forca"],
    pericias: ["medicina", "intuicao", "ocultismo", "persuasao", "erudicao", "empatia_animais", "percepcao"],
    papel: "suporte",
  },
  {
    id: "tzimisce",
    nome: "Tzimisce",
    descricao: "Senhores da carne e do território, artistas do corpo alheio. O que é deles é deles, inclusive você.",
    disciplinas: ["animalismo", "dominacao", "metamorfose"],
    perdicao: "Presos à terra: precisam dormir cercados do que reivindicaram (solo, lar, pessoas), ou acordam com penalidade igual à gravidade.",
    compulsao: { nome: "Cobiça", efeito: "Precisa possuir algo (ou alguém) que viu; outras ações sofrem −2 dados até tomar posse." },
    atributoChave: "determinacao",
    ordem: ["determinacao", "inteligencia", "manipulacao", "vigor", "autocontrole", "carisma", "forca", "raciocinio", "destreza"],
    pericias: ["medicina", "ciencia", "intimidacao", "lideranca", "ocultismo", "oficios", "politica"],
    papel: "místico",
  },
  {
    id: "caitiff",
    nome: "Caitiff",
    descricao: "Sem clã, sem família, sem herança. Ninguém sabe o que seu sangue faz, nem você.",
    disciplinas: [],
    perdicao: "Nenhuma perdição de clã. Em troca, o desprezo: testes sociais com quem liga para linhagem perdem dados, e XP de disciplina custa como fora do clã.",
    compulsao: null,
    atributoChave: "raciocinio",
    ordem: ["raciocinio", "destreza", "vigor", "manipulacao", "determinacao", "carisma", "autocontrole", "forca", "inteligencia"],
    pericias: ["manha", "briga", "furtividade", "labia", "percepcao", "atletismo", "intuicao"],
    papel: "especialista",
  },
  {
    id: "sangue_ralo",
    nome: "Sangue-ralo",
    descricao: "Mal são vampiros: andam sob o sol fraco, comem um pouco, e os mais velhos querem todos mortos.",
    disciplinas: ["alquimia"],
    perdicao: "Sangue fraco demais: Potência de Sangue sempre 0, não criam laços nem cria de verdade, e a Camarilla os caça.",
    compulsao: null,
    atributoChave: "inteligencia",
    ordem: ["inteligencia", "raciocinio", "destreza", "determinacao", "autocontrole", "manipulacao", "vigor", "carisma", "forca"],
    pericias: ["ciencia", "manha", "medicina", "tecnologia", "furtividade", "investigacao", "ocultismo"],
    papel: "especialista",
  },
];

export type PredadorVtm = {
  id: string;
  nome: string;
  descricao: string;
  /** parada de caça [atributo, perícia]; null = não caça mortais com teste (Sanguessuga, Coletor de Dízimo) */
  parada: [string, string] | null;
  /** texto da parada para mostrar (inclui alternativas) */
  paradaTexto: string;
  /** especialidades oferecidas (a primeira é a padrão) */
  especialidades: string[];
  /** disciplinas entre as quais escolhe +1 */
  disciplinas: string[];
  humanidade: number;
  potencia?: number;
  recursos?: number;
  vantagens: string[];
  defeitos: string[];
  equipamento: string[];
  fonte: "Livro básico" | "Guia do Jogador";
};

export const PREDADORES: PredadorVtm[] = [
  {
    id: "gato_beco",
    nome: "Gato de Beco",
    descricao: "Assalta, derruba e bebe ali mesmo, na viela. Rápido, sujo e nada elegante.",
    parada: ["forca", "briga"],
    paradaTexto: "Força + Briga",
    especialidades: ["Intimidação (assaltos)", "Briga (agarrar)"],
    disciplinas: ["celeridade", "potencia"],
    humanidade: -1,
    vantagens: ["Contatos no submundo ●●●"],
    defeitos: [],
    equipamento: ["canivete", "capuz escuro"],
    fonte: "Livro básico",
  },
  {
    id: "ensacador",
    nome: "Ensacador",
    descricao: "Bebe de bolsas de sangue: hospital, banco de sangue, mercado negro. Frio, prático e sempre com o freezer cheio.",
    parada: ["inteligencia", "manha"],
    paradaTexto: "Inteligência + Manha",
    especialidades: ["Furto (fechaduras)", "Manha (mercado negro)"],
    disciplinas: ["feiticaria", "ofuscacao"],
    humanidade: 0,
    vantagens: ["Estômago de Ferro ●●● (aguenta sangue velho ou ruim)"],
    defeitos: ["Inimigo ●● (alguém que quer a sua fonte)"],
    equipamento: ["bolsa térmica", "duas bolsas de sangue", "jaleco furtado"],
    fonte: "Livro básico",
  },
  {
    id: "sanguessuga",
    nome: "Sanguessuga",
    descricao: "Rejeita o sangue mortal e caça outros vampiros. Poderoso, odiado e com fome do tipo errado.",
    parada: null,
    paradaTexto: "sem teste de caça mortal: precisa caçar vampiros (geralmente Destreza ou Força + Briga contra o alvo)",
    especialidades: ["Briga (vampiros)", "Furtividade (contra vampiros)"],
    disciplinas: ["celeridade", "metamorfose"],
    humanidade: -1,
    potencia: 1,
    vantagens: [],
    defeitos: ["Segredo Sombrio: diablerista ●● (ou Rejeitado ●●)", "Exclusão de Presa: mortais ●●"],
    equipamento: ["estaca de madeira", "faca longa"],
    fonte: "Livro básico",
  },
  {
    id: "cutelo",
    nome: "Cutelo",
    descricao: "Se alimenta da própria família ou dos amigos mortais, escondendo o que virou. Dói de um jeito que não sara.",
    parada: ["manipulacao", "labia"],
    paradaTexto: "Manipulação + Lábia",
    especialidades: ["Persuasão (manipulação emocional)", "Lábia (acobertar)"],
    disciplinas: ["dominacao", "animalismo"],
    humanidade: 0,
    vantagens: ["Rebanho ●● (a família)"],
    defeitos: ["Segredo Sombrio: Cutelo ●"],
    equipamento: ["chaves da casa da família", "fotos antigas"],
    fonte: "Livro básico",
  },
  {
    id: "consensualista",
    nome: "Consensualista",
    descricao: "Só bebe de quem aceita: doadores, fãs de vampiro, amantes avisados. Ética no meio da noite, e uma Mascarada mais frágil.",
    parada: ["manipulacao", "persuasao"],
    paradaTexto: "Manipulação + Persuasão",
    especialidades: ["Medicina (coleta de sangue)", "Persuasão (doadores)"],
    disciplinas: ["auspicios", "fortitude"],
    humanidade: 1,
    vantagens: [],
    defeitos: ["Segredo Sombrio: quebrou a Mascarada ●", "Exclusão de Presa: quem não consente ●"],
    equipamento: ["agulhas e bolsas", "termos de consentimento rabiscados"],
    fonte: "Livro básico",
  },
  {
    id: "fazendeiro",
    nome: "Fazendeiro",
    descricao: "Recusa sangue humano e vive de animais. Admirável, faminto e sempre a uma noite ruim de desistir.",
    parada: ["autocontrole", "empatia_animais"],
    paradaTexto: "Autocontrole + Empatia com Animais",
    especialidades: ["Empatia com Animais (um tipo de bicho)", "Sobrevivência (caça)"],
    disciplinas: ["animalismo", "metamorfose"],
    humanidade: 1,
    vantagens: [],
    defeitos: ["Fazendeiro ●● (beber de humano custa Força de Vontade)"],
    equipamento: ["coleira e corda", "luvas grossas"],
    fonte: "Livro básico",
  },
  {
    id: "osiris",
    nome: "Osíris",
    descricao: "Líder de culto, celebridade ou guru: os fiéis oferecem o pescoço. A fama alimenta, e expõe.",
    parada: ["manipulacao", "labia"],
    paradaTexto: "Manipulação + Lábia (ou Intimidação + Fama)",
    especialidades: ["Ocultismo (sua tradição)", "Performance (seu palco)"],
    disciplinas: ["feiticaria", "presenca"],
    humanidade: 0,
    vantagens: ["Fama ●●● ou Rebanho ●●● (divididos à vontade)"],
    defeitos: ["Inimigos ●● (rivais ou céticos)", "Defeito Místico ●●"],
    equipamento: ["roupa de culto ou de palco", "celular cheio de seguidores"],
    fonte: "Livro básico",
  },
  {
    id: "sonambulo",
    nome: "Sonâmbulo",
    descricao: "Entra em quartos e bebe de quem dorme. Ninguém acorda, ninguém lembra, quase ninguém tranca a janela.",
    parada: ["destreza", "furtividade"],
    paradaTexto: "Destreza + Furtividade",
    especialidades: ["Medicina (anestésicos)", "Furtividade (invasão)"],
    disciplinas: ["auspicios", "ofuscacao"],
    humanidade: 0,
    recursos: 1,
    vantagens: ["Recursos ●"],
    defeitos: [],
    equipamento: ["gazuas", "sapatos de sola macia", "frasco de sedativo"],
    fonte: "Livro básico",
  },
  {
    id: "rainha_cena",
    nome: "Rainha da Cena",
    descricao: "Domina uma cena (clube, galeria, torcida, rave) e bebe dos fãs. Popularidade é a melhor caçada.",
    parada: ["manipulacao", "persuasao"],
    paradaTexto: "Manipulação + Persuasão",
    especialidades: ["Etiqueta (sua cena)", "Liderança (sua cena)", "Manha (sua cena)"],
    disciplinas: ["dominacao", "potencia"],
    humanidade: 0,
    vantagens: ["Fama ●", "Contato ●"],
    defeitos: ["Influência: malvista ● (ou Exclusão de Presa de outra cena ●)"],
    equipamento: ["passe VIP", "roupa da moda da semana"],
    fonte: "Livro básico",
  },
  {
    id: "sereia",
    nome: "Sereia",
    descricao: "Seduz, leva para um canto e bebe no meio do beijo. A beleza é a isca e o anzol.",
    parada: ["carisma", "labia"],
    paradaTexto: "Carisma + Lábia",
    especialidades: ["Persuasão (sedução)", "Lábia (sedução)"],
    disciplinas: ["fortitude", "presenca"],
    humanidade: 0,
    vantagens: ["Aparência: bela ●●"],
    defeitos: ["Inimigo ● (um amante rejeitado)"],
    equipamento: ["perfume caro", "roupa de festa"],
    fonte: "Livro básico",
  },
  {
    id: "extorsionario",
    nome: "Extorsionário",
    descricao: "Cobra proteção em sangue: quem não paga em dinheiro paga na veia.",
    parada: ["forca", "intimidacao"],
    paradaTexto: "Força ou Manipulação + Intimidação",
    especialidades: ["Intimidação (coerção)", "Furto (segurança)"],
    disciplinas: ["dominacao", "potencia"],
    humanidade: 0,
    vantagens: ["Contatos ou Recursos ●●● (divididos)"],
    defeitos: ["Inimigo ●● (polícia ou uma vítima com memória boa)"],
    equipamento: ["soco-inglês", "caderninho de dívidas"],
    fonte: "Guia do Jogador",
  },
  {
    id: "ladrao_tumulos",
    nome: "Ladrão de Túmulos",
    descricao: "Bebe dos mortos recentes no necrotério ou dos enlutados no velório. Macabro, discreto, eficiente.",
    parada: ["determinacao", "medicina"],
    paradaTexto: "Determinação + Medicina (cadáveres) ou Manipulação + Intuição (enlutados)",
    especialidades: ["Ocultismo (ritos fúnebres)", "Medicina (cadáveres)"],
    disciplinas: ["fortitude", "oblivio"],
    humanidade: 0,
    vantagens: ["Estômago de Ferro ●●●", "Refúgio ●"],
    defeitos: ["Rebanho: predador óbvio ●●"],
    equipamento: ["pé de cabra", "lanterna", "luvas de látex"],
    fonte: "Guia do Jogador",
  },
  {
    id: "matador_estrada",
    nome: "Matador de Estrada",
    descricao: "Caça nas rodovias: caronas, caminhoneiros, postos às três da manhã. Nunca para muito tempo.",
    parada: ["destreza", "conducao"],
    paradaTexto: "Destreza ou Carisma + Condução",
    especialidades: ["Sobrevivência (a estrada)", "Investigação (gíria dos vampiros)"],
    disciplinas: ["fortitude", "metamorfose"],
    humanidade: 0,
    vantagens: ["Rebanho ●● (gente de passagem)"],
    defeitos: ["Exclusão de Presa: moradores locais ●"],
    equipamento: ["carro velho de porta-malas grande", "mapa rodoviário"],
    fonte: "Guia do Jogador",
  },
  {
    id: "ceifador",
    nome: "Ceifador",
    descricao: "Bebe de quem já está morrendo: hospícios, UTIs, asilos. Misericórdia ou conveniência, depende da noite.",
    parada: ["inteligencia", "percepcao"],
    paradaTexto: "Inteligência + Percepção",
    especialidades: ["Percepção (morte)", "Furto (falsificação)"],
    disciplinas: ["auspicios", "oblivio"],
    humanidade: 1,
    vantagens: ["Aliados ou Influência ● (área médica)"],
    defeitos: ["Exclusão de Presa: gente saudável ●"],
    equipamento: ["crachá de hospital", "uniforme de enfermagem"],
    fonte: "Guia do Jogador",
  },
  {
    id: "montero",
    nome: "Montero",
    descricao: "Caça em matilha: lacaios encurralam a presa e o vampiro só chega para o banquete.",
    parada: ["inteligencia", "furtividade"],
    paradaTexto: "Inteligência ou Determinação + Furtividade",
    especialidades: ["Liderança (caçada em grupo)", "Furtividade (tocaia)"],
    disciplinas: ["dominacao", "ofuscacao"],
    humanidade: -1,
    vantagens: ["Lacaios ●● (os batedores)"],
    defeitos: [],
    equipamento: ["rádios comunicadores", "van sem placa"],
    fonte: "Guia do Jogador",
  },
  {
    id: "perseguidor",
    nome: "Perseguidor",
    descricao: "Escolhe a vítima, estuda, segue por dias. Quando ataca, sabe até o que ela jantou.",
    parada: ["inteligencia", "investigacao"],
    paradaTexto: "Inteligência + Investigação ou Vigor + Furtividade",
    especialidades: ["Investigação (perfis)", "Furtividade (seguir alguém)"],
    disciplinas: ["animalismo", "auspicios"],
    humanidade: -1,
    vantagens: ["Farejador ● (sente o cheiro de ressonância)", "Contato ●"],
    defeitos: [],
    equipamento: ["binóculo", "caderno de anotações sobre estranhos"],
    fonte: "Guia do Jogador",
  },
  {
    id: "alcapao",
    nome: "Alçapão",
    descricao: "A presa vem até a toca: uma casa assombrada, um bar escondido, uma armadilha. Paciência de aranha.",
    parada: ["carisma", "furtividade"],
    paradaTexto: "Carisma ou Destreza + Furtividade (ou Raciocínio + Percepção + Refúgio)",
    especialidades: ["Persuasão (propaganda)", "Furtividade (emboscadas e armadilhas)"],
    disciplinas: ["metamorfose", "ofuscacao"],
    humanidade: 0,
    vantagens: ["Refúgio ●", "Rebanho ● (ou mais um ponto de Refúgio)"],
    defeitos: ["Refúgio: sinistro ou assombrado ●"],
    equipamento: ["chaves de um porão", "cadeados"],
    fonte: "Guia do Jogador",
  },
  {
    id: "coletor_dizimo",
    nome: "Coletor de Dízimo",
    descricao: "Não caça: os vassalos trazem o sangue como tributo. Status tem gosto bom até alguém atrasar o pagamento.",
    parada: null,
    paradaTexto: "sem teste de caça: o tributo chega pelos vassalos do domínio (o mestre decide quando falta)",
    especialidades: ["Intimidação (vampiros)", "Liderança (vampiros)"],
    disciplinas: ["dominacao", "presenca"],
    humanidade: 0,
    vantagens: ["Domínio ou Status ●●● (divididos)"],
    defeitos: ["Adversário ●● (um rival que quer o seu posto)"],
    equipamento: ["anel de sinete", "lista de vassalos"],
    fonte: "Guia do Jogador",
  },
];

export type IdadeVtm = OpcaoSimples & { potencia: number; geracao: number; humanidade: number; xp: number; disciplinaExtra: number };

export const IDADES: IdadeVtm[] = [
  { id: "cria", nome: "Cria (recém-abraçado)", descricao: "Abraçado há poucos meses. Ainda acha que dá para ligar para a mãe. Potência de Sangue 1, 13ª geração.", potencia: 1, geracao: 13, humanidade: 0, xp: 0, disciplinaExtra: 0 },
  { id: "neofito", nome: "Neófito", descricao: "Alguns anos de noite. Já aprendeu a mentir para os vivos e a temer os mortos. Potência 1, 12ª geração.", potencia: 1, geracao: 12, humanidade: 0, xp: 15, disciplinaExtra: 0 },
  { id: "ancila", nome: "Ancila", descricao: "Décadas, talvez um século. Influência, inimigos e alguma humanidade a menos. Potência 2, 11ª geração, −1 Humanidade, +1 ponto de disciplina.", potencia: 2, geracao: 11, humanidade: -1, xp: 35, disciplinaExtra: 1 },
];

export const SEITAS: OpcaoSimples[] = [
  { id: "camarilla", nome: "Camarilla", descricao: "A velha ordem: Príncipes, Elísios e a Mascarada acima de tudo." },
  { id: "anarquistas", nome: "Anarquistas", descricao: "Barões, punhos erguidos e nenhuma coroa (em teoria)." },
  { id: "autarquis", nome: "Autarquis", descricao: "Solitários que não juram nada a ninguém. Ninguém os protege também." },
  { id: "saba", nome: "Sabá", descricao: "Fanáticos da guerra contra os Antediluvianos. Monstros por convicção." },
  { id: "independente", nome: "Independente", descricao: "Clã ou família que negocia com todos e não pertence a ninguém." },
];

/** Efeitos da Potência de Sangue (0 a 10): dados do Surto, cura por Despertar, bônus em poderes, rerrolagem e gravidade da perdição. */
export const POTENCIA: { surto: number; cura: number; bonusPoder: number; rerrolagem: number; gravidade: number; alimento: string }[] = [
  { surto: 1, cura: 1, bonusPoder: 0, rerrolagem: 0, gravidade: 0, alimento: "qualquer sangue sacia normalmente" },
  { surto: 2, cura: 1, bonusPoder: 0, rerrolagem: 1, gravidade: 2, alimento: "qualquer sangue sacia normalmente" },
  { surto: 2, cura: 2, bonusPoder: 1, rerrolagem: 1, gravidade: 2, alimento: "sangue animal e de bolsa sacia só metade" },
  { surto: 3, cura: 2, bonusPoder: 1, rerrolagem: 2, gravidade: 3, alimento: "sangue animal e de bolsa não sacia mais" },
  { surto: 3, cura: 3, bonusPoder: 2, rerrolagem: 2, gravidade: 3, alimento: "sem animal/bolsa; humano sacia 1 a menos" },
  { surto: 4, cura: 3, bonusPoder: 2, rerrolagem: 3, gravidade: 4, alimento: "sem animal/bolsa; humano sacia 1 a menos" },
  { surto: 4, cura: 3, bonusPoder: 3, rerrolagem: 3, gravidade: 4, alimento: "sem animal/bolsa; humano sacia 2 a menos" },
  { surto: 5, cura: 3, bonusPoder: 3, rerrolagem: 4, gravidade: 5, alimento: "sem animal/bolsa; humano sacia 2 a menos" },
  { surto: 5, cura: 4, bonusPoder: 4, rerrolagem: 4, gravidade: 5, alimento: "sem animal/bolsa; humano sacia 2 a menos; Fome mínima 2 após matar" },
  { surto: 6, cura: 4, bonusPoder: 4, rerrolagem: 5, gravidade: 6, alimento: "sem animal/bolsa; humano sacia 2 a menos; Fome mínima 2 após matar" },
  { surto: 6, cura: 5, bonusPoder: 5, rerrolagem: 5, gravidade: 6, alimento: "só sangue de vampiro sacia de verdade" },
];

/** Distribuições de perícias do livro: quantidade de perícias por valor. */
export const ESTILOS_PERICIAS: (OpcaoSimples & { cotas: Record<number, number> })[] = [
  { id: "faz_tudo", nome: "Faz-tudo", descricao: "Uma em ●●●, oito em ●●, dez em ●. Sabe um pouco de tudo.", cotas: { 4: 0, 3: 1, 2: 8, 1: 10 } },
  { id: "equilibrado", nome: "Equilibrado", descricao: "Três em ●●●, cinco em ●●, sete em ●.", cotas: { 4: 0, 3: 3, 2: 5, 1: 7 } },
  { id: "especialista", nome: "Especialista", descricao: "Uma em ●●●●, três em ●●●, três em ●● e três em ●. Muito bom no que faz, perdido no resto.", cotas: { 4: 1, 3: 3, 2: 3, 1: 3 } },
];

/** Ordem genérica para completar perícias que o jogador não escolheu. */
export const PERICIAS_COMUNS = [
  "percepcao", "atletismo", "briga", "furtividade", "intuicao", "persuasao", "manha", "labia", "investigacao", "conducao",
  "etiqueta", "intimidacao", "tecnologia", "erudicao", "ocultismo", "medicina", "armas_brancas", "armas_fogo", "furto",
  "sobrevivencia", "lideranca", "performance", "financas", "politica", "ciencia", "oficios", "empatia_animais",
];
