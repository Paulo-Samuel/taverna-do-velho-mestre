import type { SementesSistema } from "./index";

// d100 — horror investigativo, com os anos 1920 no centro (brasileiros e estrangeiros), sem cenário com dono.

const lista = (itens: string[]) => (c: { sortear: <T>(l: readonly T[]) => T }) => c.sortear(itens);

export const D100: SementesSistema = {
  cenarios: [
    "Rio de Janeiro, 1924: um cargueiro atraca na Praça Mauá sem tripulação, só com caixotes de terra e um diário em latim.",
    "Um seringal no Pará, 1921: os seringueiros param de voltar da mata e o patrão manda chamar “gente estudada” da capital.",
    "A bordo do vapor para Santos, 1926: sete dias de viagem, um passageiro morto numa cabine trancada por dentro e uma tempestade que não passa.",
    "Uma cidade universitária da Nova Inglaterra, 1925: a biblioteca proibiu um livro que três alunos já leram. Dois sumiram.",
    "Ouro Preto, 1923: na reforma de uma igreja barroca, os pedreiros acharam uma cripta que não está em planta nenhuma.",
    "Um sanatório na Serra da Mantiqueira, inverno de 1927: os pacientes desenham o mesmo símbolo e o diretor proibiu as visitas.",
    "São Paulo, 1922, semana de arte moderna: um pintor expõe um quadro que faz as pessoas chorarem sangue. Literalmente.",
    "Uma vila de pescadores no litoral norte-americano, 1928: os moradores têm olhos grandes demais e não gostam de forasteiros.",
    "Uma expedição ao interior de Goiás, 1929, atrás de uma estação de telégrafo que parou de transmitir no meio de uma frase.",
  ],
  ganchos: [
    "Herdou a casa de um tio que nunca conheceu, com um porão trancado por dentro.",
    "Recebeu uma carta de um amigo morto, datada da semana passada.",
    "Voltou da Grande Guerra e ainda sonha com o que viu nas trincheiras. Não era o inimigo.",
    "Perdeu o emprego no jornal por publicar uma matéria “fantasiosa” que era verdade.",
    "Tem um diário de expedição que não consegue terminar de ler: as páginas mudam.",
    "Deve dinheiro a um contrabandista de bebida, e ele não cobra só em dinheiro.",
    "A irmã entrou numa sociedade espírita e voltou falando com outra voz.",
    "Foi o único sobrevivente de um naufrágio e não lembra como chegou à praia.",
    "Comprou num antiquário que já fechou um objeto que não devia ter comprado.",
    "Escreve contos de horror para revistas baratas, e um leitor jura que eles aconteceram.",
    "Um paciente (ou cliente) disse seu nome completo durante um delírio. Vocês nunca se viram.",
  ],
  tons: ["terror lento e opressivo", "investigação metódica", "pulp com tiroteio e dinamite", "paranoia e loucura crescente", "melancólico e fatalista", "sombrio e debochado"],
  campanhas: ["O Telegrama de Goiás", "As Máscaras do Porto", "Maré Morta", "O Livro Proibido", "Navio sem Nome", "Noite no Seringal"],
  nomes: {
    primeiros: [
      "Armando", "Celeste", "Euclides", "Odete", "Aurélio", "Leonor", "Joaquim", "Zélia", "Honório", "Iracema", "Arthur", "Eleanor", "Walter", "Edith",
      "Henry", "Margaret", "Raimundo", "Hilda", "Sebastião", "Alzira",
    ],
    sobrenomes: ["Guimarães", "Coutinho", "Sampaio", "Mendonça", "Whitmore", "Carver", "Hale", "Albuquerque", "Fontoura", "Bittencourt", "Pinheiro", "Ashford", "Moraes", "Lacombe"],
  },
  exemploNome: "Ex.: Celeste Bittencourt",
  exemploHistoria: "Profissão, cidade, o que você viu e ninguém acreditou…",
  exemploCenario: "Em branco, o mestre escolhe a cidade e o primeiro cadáver.",
  // o personagem pronto nasce nos anos 1920, como os cenários sugeridos (dá para trocar a era depois)
  prontoAncestralidades: ["anos20"],
  campos: {
    ideologia: {
      exemplo: "Ex.: só acredito no que a ciência explica",
      gerar: lista([
        "Só acredito no que a ciência explica", "Deus tem um plano, mesmo que eu não entenda", "O progresso vai salvar a humanidade", "Todo mistério tem um culpado de carne e osso",
        "Os espíritos existem e querem falar", "Dinheiro resolve tudo, até o sobrenatural", "A verdade precisa ser publicada, custe o que custar", "Há coisas que é melhor não saber",
      ]),
    },
    pessoaImportante: {
      exemplo: "Ex.: minha filha Lúcia, que estuda piano em São Paulo",
      gerar: lista([
        "Minha filha Lúcia, que estuda piano em São Paulo", "O Professor Mendonça, meu orientador, que sumiu ano passado", "Meu irmão Tito, que voltou mudo da guerra",
        "Dona Zélia, a governanta que me criou", "Meu sócio no escritório de advocacia", "A noiva que espera eu voltar da expedição",
        "O padre da cidade natal, o único que sabe meu segredo", "Um velho marinheiro que me ensinou a ler mapas",
      ]),
    },
    localSignificativo: {
      exemplo: "Ex.: a biblioteca da faculdade, depois do fechamento",
      gerar: lista([
        "A biblioteca da faculdade, depois do fechamento", "A casa de praia da família em Niterói", "O café da esquina onde escrevo minhas matérias", "Meu laboratório no porão",
        "A igreja onde fui batizado", "O cais do porto ao amanhecer", "A fazenda de café do meu avô", "Meu consultório no centro",
      ]),
    },
    objetoPrecioso: {
      exemplo: "Ex.: o relógio de bolso do meu pai, parado às 3h17",
      gerar: lista([
        "O relógio de bolso do meu pai, parado às 3h17", "Uma câmera fotográfica alemã", "O diário da minha mãe, escrito em código", "Um revólver herdado que nunca disparei",
        "Uma medalha da Grande Guerra", "Um rosário de contas de osso", "A primeira edição do meu livro", "Uma carta que nunca tive coragem de abrir",
      ]),
    },
    especialidades: { exemplo: "Ex.: Fotografia", gerar: lista(["Fotografia", "Química", "Latim", "Francês", "Pintura", "Biologia", "Tupi antigo", "Astronomia"]) },
  },
};
