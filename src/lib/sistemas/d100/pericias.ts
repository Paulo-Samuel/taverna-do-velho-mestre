// Perícias do horror investigativo d100 (mecânica do Basic Roleplaying, ORC License).
// Valores-base em %, escritos do zero. "Mitos" não recebe pontos na criação: só se aprende do jeito ruim.

export type PericiaD100 = {
  id: string;
  nome: string;
  /** valor-base em %; ignorado quando `baseDe` existe */
  base: number;
  /** base derivada de uma característica: esquivar = DES/2, língua nativa = EDU */
  baseDe?: { atributo: string; divisor: number };
  descricao: string;
  /** outros jeitos de o mestre (ou o jogador) chamar a perícia, já normalizados */
  apelidos?: string[];
  /** perícia de combate (o teste "Ataque" procura entre estas) */
  combate?: "corpo" | "distancia";
};

export const PERICIAS_D100: PericiaD100[] = [
  { id: "antropologia", nome: "Antropologia", base: 1, descricao: "Entender costumes alheios antes que eles entendam você.", apelidos: ["costumes", "cultura"] },
  { id: "arqueologia", nome: "Arqueologia", base: 1, descricao: "Datar ruínas e saber quais não deviam ter sido escavadas." },
  { id: "arremessar", nome: "Arremessar", base: 20, descricao: "Pedras, facas, dinamite. A pontaria é opcional, a coragem não.", apelidos: ["arremesso", "jogar", "lancar"], combate: "distancia" },
  { id: "arte", nome: "Arte/Ofício", base: 5, descricao: "Pintura, fotografia, atuação, carpintaria... escolha a especialidade.", apelidos: ["arte", "oficio", "artes", "atuacao", "fotografia", "pintura", "musica"] },
  { id: "avaliacao", nome: "Avaliação", base: 5, descricao: "Quanto vale, quantos anos tem e se é falsificado.", apelidos: ["avaliar"] },
  { id: "biblioteca", nome: "Biblioteca", base: 20, descricao: "Achar a página certa num arquivo empoeirado antes que o arquivo ache você.", apelidos: ["usar biblioteca", "pesquisa", "pesquisar", "arquivos", "arquivo"] },
  { id: "cavalgar", nome: "Cavalgar", base: 5, descricao: "Ficar em cima do cavalo, o que é metade do trabalho.", apelidos: ["montar", "montaria", "cavalo"] },
  { id: "charme", nome: "Charme", base: 15, descricao: "Sorriso, elogio e um olhar que abre portas (e às vezes quartos).", apelidos: ["seduzir", "seducao", "carisma", "encantar"] },
  { id: "chaveiro", nome: "Chaveiro", base: 1, descricao: "Fechaduras, cadeados e cofres: tudo é só um quebra-cabeça com dono.", apelidos: ["arrombar", "abrir fechadura", "fechadura", "fechaduras", "gazua"] },
  { id: "ciencia", nome: "Ciência", base: 1, descricao: "Química, biologia, astronomia, farmácia... escolha a especialidade.", apelidos: ["quimica", "biologia", "astronomia", "fisica", "farmacia", "geologia", "matematica", "forense"] },
  { id: "contabilidade", nome: "Contabilidade", base: 5, descricao: "Livros-caixa mentem menos que gente, mas mentem.", apelidos: ["contas", "financas"] },
  { id: "credito", nome: "Nível de Crédito", base: 0, descricao: "Dinheiro, nome e quantas portas se abrem quando você diz quem é.", apelidos: ["credito", "riqueza", "status", "posicao social"] },
  { id: "direito", nome: "Direito", base: 5, descricao: "Leis, brechas e a arte de não ser preso pelas duas coisas.", apelidos: ["leis", "juridico"] },
  { id: "dirigir", nome: "Dirigir", base: 20, descricao: "Carro, carroça ou o que tiver rodas e pouca suspensão.", apelidos: ["conduzir", "carro", "carroca", "automovel"] },
  { id: "disfarce", nome: "Disfarce", base: 5, descricao: "Virar outra pessoa por uma noite. Voltar a ser você é outra história.", apelidos: ["disfarcar"] },
  { id: "eletronica", nome: "Eletrônica", base: 1, descricao: "Circuitos, rádios e aparelhos que chiam com vozes que não deveriam.", apelidos: ["eletronico", "circuitos"] },
  { id: "encontrar", nome: "Encontrar", base: 25, descricao: "Notar a porta secreta, a mancha no tapete, o vulto na janela.", apelidos: ["percepcao", "perceber", "observar", "notar", "procurar", "investigacao", "investigar", "vasculhar", "achar", "examinar", "busca"] },
  { id: "escalar", nome: "Escalar", base: 20, descricao: "Subir muros, árvores e penhascos sem virar estatística.", apelidos: ["subir", "atletismo", "trepar"] },
  { id: "escutar", nome: "Escutar", base: 20, descricao: "O rangido no andar de cima. O sussurro atrás da parede.", apelidos: ["ouvir", "audicao", "prestar atencao"] },
  { id: "esquivar", nome: "Esquivar", base: 0, baseDe: { atributo: "des", divisor: 2 }, descricao: "Sair da frente. A técnica de combate mais subestimada do mundo.", apelidos: ["esquiva", "desviar", "desvio"] },
  { id: "explosivos", nome: "Explosivos", base: 1, descricao: "Armar, desarmar e manter todos os dedos.", apelidos: ["dinamite", "bomba", "detonar", "demolicao"] },
  { id: "furtividade", nome: "Furtividade", base: 20, descricao: "Andar sem ser visto nem ouvido. Respirar também ajuda pouco.", apelidos: ["furtivo", "esconder", "se esconder", "discricao", "sorrateiro", "esgueirar", "sigilo"] },
  { id: "hipnose", nome: "Hipnose", base: 1, descricao: "Relógio balançando e uma mente que cede. Às vezes a sua.", apelidos: ["hipnotizar", "mesmerismo"] },
  { id: "historia", nome: "História", base: 5, descricao: "Saber o que aconteceu aqui antes. Geralmente algo horrível.", apelidos: ["historico", "passado"] },
  { id: "intimidacao", nome: "Intimidação", base: 15, descricao: "Convencer pelo medo. Funciona até encontrar algo mais assustador que você.", apelidos: ["intimidar", "ameacar", "coagir"] },
  { id: "labia", nome: "Lábia", base: 5, descricao: "Mentir rápido, falar bonito e sumir antes da conferência.", apelidos: ["enganacao", "enganar", "blefe", "blefar", "mentir", "conversa fiada", "trapacear"] },
  { id: "leituraLabial", nome: "Leitura Labial", base: 1, descricao: "Entender a conversa do outro lado da sala sem ouvir nada.", apelidos: ["ler labios"] },
  { id: "linguaNativa", nome: "Língua Nativa", base: 0, baseDe: { atributo: "edu", divisor: 1 }, descricao: "Ler, escrever e entender a própria língua, até em letra de médico.", apelidos: ["lingua materna", "ler", "leitura", "escrita", "portugues"] },
  { id: "outraLingua", nome: "Outra Língua", base: 1, descricao: "Latim, grego, árabe... escolha qual. O grimório não vem traduzido.", apelidos: ["lingua estrangeira", "idioma", "idiomas", "traduzir", "traducao", "latim", "grego"] },
  { id: "lutar", nome: "Lutar (Briga)", base: 25, descricao: "Socos, chutes, cotoveladas e mordidas em último caso.", apelidos: ["briga", "brigar", "soco", "socar", "corpo a corpo", "combate corpo a corpo", "agarrar", "luta", "lutar", "chute"], combate: "corpo" },
  { id: "lutarArmas", nome: "Lutar (Armas Brancas)", base: 20, descricao: "Faca, porrete, machado, espada da parede da sala.", apelidos: ["faca", "espada", "machado", "porrete", "arma branca", "armas brancas", "facao", "bastao", "lamina", "punhal", "adaga", "canivete"], combate: "corpo" },
  { id: "pistolas", nome: "Armas de Fogo (Pistolas)", base: 20, descricao: "Revólveres e pistolas. Barulho alto, efeito questionável contra certas coisas.", apelidos: ["pistola", "revolver", "tiro", "atirar"], combate: "distancia" },
  { id: "rifles", nome: "Armas de Fogo (Rifles/Escopetas)", base: 25, descricao: "Armas longas para quem quer distância entre si e o problema.", apelidos: ["rifle", "escopeta", "espingarda", "fuzil", "carabina", "mosquete"], combate: "distancia" },
  { id: "armasPesadas", nome: "Armas de Fogo (Pesadas)", base: 10, descricao: "Metralhadoras e afins. O vizinho vai reclamar.", apelidos: ["metralhadora", "submetralhadora", "lanca-chamas"], combate: "distancia" },
  { id: "arco", nome: "Arco e Besta", base: 15, descricao: "Disparo silencioso, para quando o barulho atrai coisa pior.", apelidos: ["arco", "besta", "flecha", "flechas"], combate: "distancia" },
  { id: "medicina", nome: "Medicina", base: 1, descricao: "Diagnóstico, cirurgia e o raro prazer de dizer 'não é nada' com convicção.", apelidos: ["cirurgia", "medico", "diagnostico", "autopsia"] },
  { id: "mergulho", nome: "Mergulho", base: 1, descricao: "Descer onde a luz não chega. Excelente ideia, nunca deu errado.", apelidos: ["mergulhar"] },
  { id: "mitos", nome: "Mitos", base: 0, descricao: "Conhecimento do que se esconde além. Cada ponto custa um pedaço da mente.", apelidos: ["mitos", "conhecimento proibido", "horror cosmico"] },
  { id: "natacao", nome: "Natação", base: 20, descricao: "Não se afogar, de preferência com estilo.", apelidos: ["nadar"] },
  { id: "natureza", nome: "Natureza", base: 10, descricao: "Plantas, bichos e qual cogumelo não comer.", apelidos: ["historia natural", "botanica", "zoologia", "fauna", "flora"] },
  { id: "navegacao", nome: "Navegação", base: 10, descricao: "Achar o caminho por mapas, estrelas ou teimosia.", apelidos: ["orientacao", "mapa", "mapas", "se orientar"] },
  { id: "ocultismo", nome: "Ocultismo", base: 5, descricao: "Tarô, alquimia e seitas de fundo de quintal. Quase tudo farsa. Quase.", apelidos: ["religiao", "esoterismo", "ocultista", "sobrenatural", "rituais", "simbolos"] },
  { id: "operarMaquinario", nome: "Operar Maquinário Pesado", base: 1, descricao: "Guindastes, tratores e escavadeiras que acordam o que dormia.", apelidos: ["maquinario", "trator", "guindaste"] },
  { id: "persuasao", nome: "Persuasão", base: 10, descricao: "Convencer com argumento e paciência. Demora, mas dura.", apelidos: ["diplomacia", "convencer", "negociar", "negociacao", "argumentar"] },
  { id: "pilotar", nome: "Pilotar", base: 1, descricao: "Avião, barco ou dirigível. Pousar conta pontos extras.", apelidos: ["aviao", "barco", "navio", "dirigivel", "pilotagem"] },
  { id: "prestidigitacao", nome: "Prestidigitação", base: 10, descricao: "Mão leve: sumir com objetos, plantar provas, bater carteiras.", apelidos: ["punga", "bater carteira", "truque de maos", "furtar", "furto", "roubar"] },
  { id: "primeirosSocorros", nome: "Primeiros Socorros", base: 30, descricao: "Estancar sangue e acordar desmaiados. Não resolve tripas para fora.", apelidos: ["primeiros socorros", "socorrer", "curativo", "estancar"] },
  { id: "psicanalise", nome: "Psicanálise", base: 1, descricao: "Tratar mentes quebradas. A sua inclusive, se sobrar tempo.", apelidos: ["terapia", "tratar insanidade"] },
  { id: "psicologia", nome: "Psicologia", base: 10, descricao: "Perceber mentiras, medos e intenções na cara de alguém.", apelidos: ["intuicao", "sentir motivacao", "ler pessoas", "perspicacia", "detectar mentira"] },
  { id: "rastrear", nome: "Rastrear", base: 10, descricao: "Seguir pegadas. Torcer para que sejam de algo com duas pernas.", apelidos: ["rastreio", "rastros", "pegadas", "seguir rastro"] },
  { id: "reparosEletricos", nome: "Reparos Elétricos", base: 10, descricao: "Consertar fiação sem acender o próprio cabelo.", apelidos: ["eletrica", "fiacao", "gerador"] },
  { id: "reparosMecanicos", nome: "Reparos Mecânicos", base: 10, descricao: "Motores, trancas e engenhocas, com chave inglesa e palavrão.", apelidos: ["mecanica", "consertar", "conserto", "reparar", "motor"] },
  { id: "saltar", nome: "Saltar", base: 20, descricao: "Pular o buraco. Ou o corpo no chão.", apelidos: ["pular", "salto", "acrobacia"] },
  { id: "sobrevivencia", nome: "Sobrevivência", base: 10, descricao: "Abrigo, fogo e comida no mato, no gelo ou no deserto.", apelidos: ["sobreviver", "acampar"] },
  { id: "treinarAnimais", nome: "Treinar Animais", base: 5, descricao: "Cães, cavalos e animais que sentem o que você não sente.", apelidos: ["adestrar", "adestrar animais", "lidar com animais", "acalmar animal"] },
  { id: "usarComputadores", nome: "Usar Computadores", base: 5, descricao: "Teclado, senha e arquivos apagados que não sumiram de verdade.", apelidos: ["computador", "computadores", "computacao", "hackear", "informatica", "internet"] },
];
