import type { AncestralidadeDef } from "../tipos";

// Raças do Pathfinder 1e (PRD, OGL 1.0a): núcleo, destacadas, incomuns e mais algumas de bestiário.
// Ajustes e traços seguem as regras; as descrições são da casa.

export type RacaPf1 = AncestralidadeDef & {
  tamanho: "medio" | "pequeno";
  /** +2 num atributo à escolha (humano, meio-elfo, meio-orc) */
  flexivel?: boolean;
  /** bônus raciais fixos em perícias */
  bonusPericias?: Record<string, number>;
  salvamentos?: { fort?: number; ref?: number; von?: number };
  armaduraNatural?: number;
  /** humano: +1 graduação de perícia por nível e um talento extra no 1º */
  humano?: boolean;
  /** bônus de esquiva racial na CA */
  esquiva?: number;
  /** +2 nos testes de nível de conjurador contra resistência à magia */
  penetrar?: number;
};

export const RACAS: RacaPf1[] = [
  // ——— Núcleo ———
  {
    id: "anao", nome: "Anão", descricao: "Baixo, barbudo e capaz de guardar rancor por três gerações.", tamanho: "medio",
    ajustes: { con: 2, sab: 2, car: -2 }, deslocamento: "6 m (nunca reduzido por carga)",
    tracos: ["visão no escuro 18 m", "treinamento defensivo (+4 CA contra gigantes)", "estabilidade (+4 CMD contra empurrar e derrubar)", "robustez (+2 contra veneno, magias e habilidades similares)", "ódio (+1 ataque contra orcs e goblinoides)", "ganância (+2 Avaliação com metais e gemas)", "conhecimento de pedras (+2 Percepção em pedra)"],
    bonusPericias: { avaliacao: 2 },
  },
  {
    id: "elfo", nome: "Elfo", descricao: "Vive mil anos e passa novecentos olhando os outros com pena.", tamanho: "medio",
    ajustes: { des: 2, int: 2, con: -2 }, deslocamento: "9 m",
    tracos: ["visão na penumbra", "imunidades élficas (sono; +2 contra encantamentos)", "magia élfica (+2 contra resistência à magia, +2 Identificar Magia em itens)", "sentidos aguçados (+2 Percepção)", "familiaridade com arcos e espadas longas"],
    bonusPericias: { percepcao: 2 }, penetrar: 2,
  },
  {
    id: "gnomo", nome: "Gnomo", descricao: "Precisa de novidade como os outros precisam de ar, e explode coisas no processo.", tamanho: "pequeno",
    ajustes: { con: 2, car: 2, for: -2 }, deslocamento: "6 m",
    tracos: ["visão na penumbra", "treinamento defensivo (+4 CA contra gigantes)", "magia gnômica (+1 na CD de ilusões, magias inatas)", "resistência a ilusões (+2)", "obsessivo (+2 em um Ofício ou Profissão)", "sentidos aguçados (+2 Percepção)", "ódio (+1 ataque contra répteis e goblinoides)"],
    bonusPericias: { percepcao: 2, oficio: 2 },
  },
  {
    id: "meio_elfo", nome: "Meio-elfo", descricao: "Nem elfo o bastante para os elfos, nem humano o bastante para a mãe do noivo.", tamanho: "medio", flexivel: true,
    ajustes: {}, deslocamento: "9 m",
    tracos: ["+2 num atributo à escolha", "visão na penumbra", "adaptável (Foco em Perícia grátis)", "imunidades élficas (sono; +2 contra encantamentos)", "sangue élfico", "sentidos aguçados (+2 Percepção)", "multitalentoso (duas classes favorecidas)"],
    bonusPericias: { percepcao: 2 },
  },
  {
    id: "meio_orc", nome: "Meio-orc", descricao: "Metade orc, metade humano, e totalmente cansado de explicar isso.", tamanho: "medio", flexivel: true,
    ajustes: {}, deslocamento: "9 m",
    tracos: ["+2 num atributo à escolha", "visão no escuro 18 m", "intimidador (+2 Intimidar)", "ferocidade orc (uma rodada de pé a 0 PV ou menos, 1/dia)", "sangue orc", "familiaridade com armas orcs"],
    bonusPericias: { intimidar: 2 },
  },
  {
    id: "halfling", nome: "Halfling", descricao: "Pequeno, sortudo e com a mão sempre a um palmo da sua comida.", tamanho: "pequeno",
    ajustes: { des: 2, car: 2, for: -2 }, deslocamento: "6 m",
    tracos: ["destemido (+2 contra medo)", "sorte halfling (+1 em todos os salvamentos)", "passo seguro (+2 Acrobacia e Escalar)", "sentidos aguçados (+2 Percepção)", "familiaridade com fundas"],
    bonusPericias: { acrobacia: 2, escalar: 2, percepcao: 2 }, salvamentos: { fort: 1, ref: 1, von: 1 },
  },
  {
    id: "humano", nome: "Humano", descricao: "Curto de vida e comprido de ambição: o padrão de qualquer taverna.", tamanho: "medio", flexivel: true, humano: true,
    ajustes: {}, deslocamento: "9 m",
    tracos: ["+2 num atributo à escolha", "talento bônus no 1º nível", "perito (+1 graduação de perícia por nível)"],
  },

  // ——— Destacadas ———
  {
    id: "aasimar", nome: "Aasimar", descricao: "Tem sangue celestial e uma auréola de arrogância combinando.", tamanho: "medio",
    ajustes: { sab: 2, car: 2 }, deslocamento: "9 m",
    tracos: ["extraplanar (nativo)", "visão no escuro 18 m", "resistência celestial (ácido, frio e eletricidade 5)", "luz do dia 1/dia", "habilidoso (+2 Diplomacia e Percepção)"],
    bonusPericias: { diplomacia: 2, percepcao: 2 },
  },
  {
    id: "tiefling", nome: "Tiefling", descricao: "Chifrinhos, rabo e um bisavô que a família jura que era só 'diferente'.", tamanho: "medio",
    ajustes: { des: 2, int: 2, car: -2 }, deslocamento: "9 m",
    tracos: ["extraplanar (nativo)", "visão no escuro 18 m", "resistência ínfera (frio, eletricidade e fogo 5)", "escuridão 1/dia", "ardiloso (+2 Blefar e Furtividade)"],
    bonusPericias: { blefar: 2, furtividade: 2 },
  },
  {
    id: "catfolk", nome: "Catfolk", descricao: "Curiosidade felina, reflexos felinos e o mesmo desprezo felino por você.", tamanho: "medio",
    ajustes: { des: 2, car: 2, sab: -2 }, deslocamento: "9 m",
    tracos: ["visão na penumbra", "sorte felina (relança Reflexos 1/dia)", "caçador nato (+2 Percepção, Furtividade e Sobrevivência)", "corrida (talento bônus)"],
    bonusPericias: { percepcao: 2, furtividade: 2, sobrevivencia: 2 },
  },
  {
    id: "dhampir", nome: "Dhampir", descricao: "Filho de vampiro: pálido, charmoso e com um apetite que ninguém quer discutir no jantar.", tamanho: "medio",
    ajustes: { des: 2, car: 2, con: -2 }, deslocamento: "9 m",
    tracos: ["visão no escuro 18 m e na penumbra", "sensibilidade à luz", "resistência de morto-vivo (+2 contra doença e efeitos mentais)", "afinidade negativa (energia negativa cura, positiva fere)", "manipulador (+2 Blefar e Percepção)", "detectar mortos-vivos 3/dia"],
    bonusPericias: { blefar: 2, percepcao: 2 },
  },
  {
    id: "drow", nome: "Drow", descricao: "Elfo das profundezas: elegante, venenoso e convencido de que o sol é um insulto pessoal.", tamanho: "medio",
    ajustes: { des: 2, car: 2, con: -2 }, deslocamento: "9 m",
    tracos: ["visão no escuro superior 36 m", "cegueira à luz", "imunidades élficas", "resistência à magia (6 + nível)", "magia drow (globos de luz, escuridão, fogo das fadas 1/dia)", "sentidos aguçados (+2 Percepção)", "uso de venenos"],
    bonusPericias: { percepcao: 2 },
  },
  {
    id: "fetchling", nome: "Fetchling", descricao: "Cresceu num plano de sombras e acha a sua luz de vela uma ofensa.", tamanho: "medio",
    ajustes: { des: 2, car: 2, sab: -2 }, deslocamento: "9 m",
    tracos: ["visão no escuro 18 m e na penumbra", "mescla de sombras (camuflagem na penumbra)", "resistência sombria (frio e eletricidade 5)", "talento para sombras (+2 Furtividade e Conhecimento dos Planos)", "magia sombria"],
    bonusPericias: { furtividade: 2, conh_planos: 2 },
  },
  {
    id: "goblin", nome: "Goblin", descricao: "Ama fogo, odeia cavalos e escreve canções terríveis sobre os dois.", tamanho: "pequeno",
    ajustes: { des: 4, for: -2, car: -2 }, deslocamento: "9 m (rápido)",
    tracos: ["visão no escuro 18 m", "furtivo (+4 Cavalgar e Furtividade)", "rápido para um pequeno"],
    bonusPericias: { cavalgar: 4, furtividade: 4 },
  },
  {
    id: "hobgoblin", nome: "Hobgoblin", descricao: "O primo disciplinado do goblin: marcha em fila e incendeia com ordem.", tamanho: "medio",
    ajustes: { des: 2, con: 2 }, deslocamento: "9 m",
    tracos: ["visão no escuro 18 m", "furtivo (+4 Furtividade)", "disciplina militar"],
    bonusPericias: { furtividade: 4 },
  },
  {
    id: "ifrit", nome: "Ifrit", descricao: "Tem um gênio do fogo na árvore genealógica e o temperamento confirma.", tamanho: "medio",
    ajustes: { des: 2, car: 2, sab: -2 }, deslocamento: "9 m",
    tracos: ["extraplanar (nativo)", "visão no escuro 18 m", "resistência a fogo 5", "afinidade com o fogo (+1 CD de magias de fogo para feiticeiros)", "mãos flamejantes 1/dia"],
  },
  {
    id: "kobold", nome: "Kobold", descricao: "Pequeno, escamoso e convencido de que é parente de dragão. Talvez seja.", tamanho: "pequeno",
    ajustes: { des: 2, for: -4, con: -2 }, deslocamento: "9 m",
    tracos: ["visão no escuro 18 m", "sensibilidade à luz", "armadura natural +1", "astuto (+2 Ofício (armadilhas), Percepção e Profissão (mineiro))"],
    bonusPericias: { oficio: 2, percepcao: 2, profissao: 2 }, armaduraNatural: 1,
  },
  {
    id: "orc", nome: "Orc", descricao: "Força bruta, paciência mínima e uma ideia muito pessoal de diplomacia.", tamanho: "medio",
    ajustes: { for: 4, int: -2, sab: -2, car: -2 }, deslocamento: "9 m",
    tracos: ["visão no escuro 18 m", "sensibilidade à luz", "ferocidade (luta abaixo de 0 PV)", "familiaridade com armas orcs"],
  },
  {
    id: "oread", nome: "Oread", descricao: "Tem pedra no sangue e, segundo os amigos, também na cabeça.", tamanho: "medio",
    ajustes: { for: 2, sab: 2, car: -2 }, deslocamento: "6 m",
    tracos: ["extraplanar (nativo)", "visão no escuro 18 m", "resistência a ácido 5", "afinidade com a terra", "pedra mágica 1/dia"],
  },
  {
    id: "ratfolk", nome: "Ratfolk", descricao: "Comerciante nato: vende o seu queijo de volta para você e ainda cobra frete.", tamanho: "pequeno",
    ajustes: { des: 2, int: 2, for: -2 }, deslocamento: "6 m",
    tracos: ["visão no escuro 18 m", "enxame (divide espaço com outros ratfolk)", "remendão (+2 Ofício (alquimia), Percepção e Usar Instrumento Mágico)"],
    bonusPericias: { oficio: 2, percepcao: 2, usar_instrumento: 2 },
  },
  {
    id: "sylph", nome: "Sylph", descricao: "Leve como a brisa e tão confiável quanto ela.", tamanho: "medio",
    ajustes: { des: 2, int: 2, con: -2 }, deslocamento: "9 m",
    tracos: ["extraplanar (nativo)", "visão no escuro 18 m", "resistência a eletricidade 5", "afinidade com o ar", "queda suave 1/dia"],
  },
  {
    id: "tengu", nome: "Tengu", descricao: "Ave falante, ladra de brilhos e imitadora de qualquer sotaque.", tamanho: "medio",
    ajustes: { des: 2, sab: 2, con: -2 }, deslocamento: "9 m",
    tracos: ["visão na penumbra", "mordida 1d3", "furtivo (+2 Percepção e Furtividade)", "dom de línguas (+4 Linguística, idiomas extras)", "treinamento com espadas"],
    bonusPericias: { percepcao: 2, furtividade: 2, linguistica: 4 },
  },
  {
    id: "undine", nome: "Undine", descricao: "Gotículas de sangue marinho e uma relação estranha com poças.", tamanho: "medio",
    ajustes: { des: 2, sab: 2, for: -2 }, deslocamento: "9 m, natação 9 m",
    tracos: ["extraplanar (nativo)", "visão no escuro 18 m", "resistência a frio 5", "anfíbio de alma", "natação (+8 Natação)", "névoa 1/dia"],
    bonusPericias: { natacao: 8 },
  },

  // ——— Incomuns ———
  {
    id: "changeling", nome: "Changeling", descricao: "Filha de bruxa criada por gente comum; os olhos de cores diferentes entregam tudo.", tamanho: "medio",
    ajustes: { sab: 2, car: 2, con: -2 }, deslocamento: "9 m",
    tracos: ["visão no escuro 18 m", "armadura natural +1", "garras 1d4", "chamado da bruxa (+2 Sentir Motivação)"],
    bonusPericias: { sentir_motivacao: 2 }, armaduraNatural: 1,
  },
  {
    id: "duergar", nome: "Duergar", descricao: "Anão cinzento do fundo da terra, com o humor ainda mais fundo.", tamanho: "medio",
    ajustes: { con: 2, sab: 2, car: -4 }, deslocamento: "6 m",
    tracos: ["visão no escuro superior 36 m", "sensibilidade à luz", "imunidade a paralisia, ilusões e venenos", "magia duergar (aumentar pessoa e invisibilidade em si 1/dia)", "estabilidade"],
  },
  {
    id: "gillman", nome: "Gillman", descricao: "Respira na água, seca no sol e reclama dos dois.", tamanho: "medio",
    ajustes: { con: 2, car: 2, sab: -2 }, deslocamento: "9 m, natação 9 m",
    tracos: ["anfíbio", "dependente de água", "resistência a encantamentos (+2)", "natação (+8 Natação)"],
    bonusPericias: { natacao: 8 },
  },
  {
    id: "grippli", nome: "Grippli", descricao: "Sapinho arborícola que vive de mosca e de olhar feio para cegonhas.", tamanho: "pequeno",
    ajustes: { des: 2, sab: 2, for: -2 }, deslocamento: "9 m, escalada 6 m",
    tracos: ["visão no escuro 18 m", "escalador (+8 Escalar)", "camuflagem no pântano (+4 Furtividade em pântanos e florestas)"],
    bonusPericias: { escalar: 8 },
  },
  {
    id: "kitsune", nome: "Kitsune", descricao: "Raposa que vira gente, ou gente que vira raposa; depende de quem está pagando.", tamanho: "medio",
    ajustes: { des: 2, car: 2, for: -2 }, deslocamento: "9 m",
    tracos: ["visão na penumbra", "muda de forma (humano específico)", "mordida 1d4", "magia kitsune (+1 CD de encantamentos)", "ágil (+2 Acrobacia)"],
    bonusPericias: { acrobacia: 2 },
  },
  {
    id: "nagaji", nome: "Nagaji", descricao: "Escamoso, serpentino e muito ofendido se você perguntar se troca de pele.", tamanho: "medio",
    ajustes: { for: 2, car: 2, int: -2 }, deslocamento: "9 m",
    tracos: ["visão na penumbra", "armadura natural +1", "resistente (+2 contra efeitos mentais e veneno)", "sentido serpentino (+2 Adestrar Animais e Percepção)"],
    bonusPericias: { adestrar: 2, percepcao: 2 }, armaduraNatural: 1,
  },
  {
    id: "samsaran", nome: "Samsaran", descricao: "Já viveu mil vidas e ainda não aprendeu a pedir a conta.", tamanho: "medio",
    ajustes: { int: 2, sab: 2, con: -2 }, deslocamento: "9 m",
    tracos: ["visão na penumbra", "memória de vidas passadas (+2 em salvamentos contra morte)", "magia samsarana", "sangue rejeitado (tratado como humano para efeitos)"],
  },
  {
    id: "strix", nome: "Strix", descricao: "Asas negras, olhar de caçador e uma lista de humanos que o irritaram.", tamanho: "medio",
    ajustes: { des: 2, car: -2 }, deslocamento: "9 m, voo 18 m (médio)",
    tracos: ["visão no escuro 18 m", "voo", "ódio (+1 ataque contra humanos)", "olhos noturnos (+2 Percepção na penumbra)", "silencioso (+2 Furtividade à noite)"],
    bonusPericias: { voar: 2 },
  },
  {
    id: "suli", nome: "Suli", descricao: "Tem um gênio de cada elemento na família, e todos brigam no Natal.", tamanho: "medio",
    ajustes: { for: 2, car: 2, int: -2 }, deslocamento: "9 m",
    tracos: ["extraplanar (nativo)", "visão na penumbra", "resistência a ácido, frio, eletricidade e fogo 5", "assalto elemental (dano elemental nas mãos)", "negociador (+2 Diplomacia e Sentir Motivação)"],
    bonusPericias: { diplomacia: 2, sentir_motivacao: 2 },
  },
  {
    id: "svirfneblin", nome: "Svirfneblin", descricao: "Gnomo das profundezas: desconfiado, durão e sem nenhum interesse em festas.", tamanho: "pequeno",
    ajustes: { des: 2, sab: 2, car: -4 }, deslocamento: "6 m",
    tracos: ["visão no escuro superior 36 m", "defensivo (+2 esquiva na CA, +2 em salvamentos)", "resistência à magia (11 + nível)", "magia svirfneblin", "astuto (+2 Ofício (alquimia) e Percepção)", "pedra (+2 Furtividade, +4 no subterrâneo)", "treinamento defensivo contra gigantes"],
    bonusPericias: { oficio: 2, percepcao: 2, furtividade: 2 }, salvamentos: { fort: 2, ref: 2, von: 2 }, esquiva: 2,
  },
  {
    id: "vanara", nome: "Vanara", descricao: "Macaco sábio, cauda preênsil e o hábito de roubar frutas só pela piada.", tamanho: "medio",
    ajustes: { des: 2, sab: 2, car: -2 }, deslocamento: "9 m, escalada 6 m",
    tracos: ["visão na penumbra", "escalada (+8 Escalar)", "cauda preênsil", "ágil (+2 Acrobacia e Furtividade)"],
    bonusPericias: { escalar: 8, acrobacia: 2, furtividade: 2 },
  },
  {
    id: "vishkanya", nome: "Vishkanya", descricao: "Linda, sorridente e literalmente venenosa. Não aceite o beijo.", tamanho: "medio",
    ajustes: { des: 2, car: 2, sab: -2 }, deslocamento: "9 m",
    tracos: ["visão na penumbra", "veneno na saliva e no sangue", "resistência a venenos (+nível)", "sentidos aguçados (+2 Percepção)", "flexível (+2 Arte da Fuga e Furtividade)"],
    bonusPericias: { percepcao: 2, arte_fuga: 2, furtividade: 2 },
  },
  {
    id: "wayang", nome: "Wayang", descricao: "Pequena criatura de sombra que fala baixinho e some no meio da conversa.", tamanho: "pequeno",
    ajustes: { des: 2, int: 2, sab: -2 }, deslocamento: "6 m",
    tracos: ["visão no escuro 18 m", "magia sombria (+1 CD de ilusões de sombra)", "dissolução de sombra 1/dia", "lurker (+2 Percepção e Furtividade)", "afinidade negativa leve"],
    bonusPericias: { percepcao: 2, furtividade: 2 },
  },

  // ——— De bestiário ———
  {
    id: "homem_lagarto", nome: "Homem-lagarto", descricao: "Sangue frio, mordida quente e nenhuma paciência para mamíferos.", tamanho: "medio",
    ajustes: { for: 2, con: 2, int: -2 }, deslocamento: "9 m, natação 4,5 m",
    tracos: ["armadura natural +2", "garras e mordida", "prender o fôlego", "natação (+8 Natação)"],
    bonusPericias: { natacao: 8 }, armaduraNatural: 2,
  },
  {
    id: "gnoll", nome: "Gnoll", descricao: "Hiena de duas pernas que ri na hora errada, e sempre na hora errada.", tamanho: "medio",
    ajustes: { for: 2, con: 2, int: -2, car: -2 }, deslocamento: "9 m",
    tracos: ["visão no escuro 18 m", "armadura natural +1", "faro"],
    armaduraNatural: 1,
  },
  {
    id: "povo_sereia", nome: "Povo-sereia", descricao: "Metade peixe, metade gente, e inteiramente inútil numa escadaria.", tamanho: "medio",
    ajustes: { des: 2, con: 2, car: 2 }, deslocamento: "1,5 m em terra, natação 15 m",
    tracos: ["anfíbio", "visão na penumbra", "armadura natural +2", "sem pernas (péssimo em terra)", "natação (+8 Natação)"],
    bonusPericias: { natacao: 8 }, armaduraNatural: 2,
  },
];
