// G16: a jogada de exemplo da vitrine ("Como funciona"). Módulo puro, texto da casa.
// O grau e a perícia usam os mesmos nomes que a mesa usa (COR_GRAU / NOME_GRAU / tipoDoTeste), para a vitrine não mentir.

export const JOGADA_EXEMPLO = {
  arquetipo: "ladino-de-capuz",
  heroi: "Nico Dedoleve",
  classe: "ladino",
  narracao: [
    "A calha range sob as suas botas. Lá embaixo, o cobrador da guilda confere a lista de devedores, e o seu nome está sublinhado duas vezes.",
    "Do outro lado do beco, o telhado da estalagem parece perto. Parece.",
  ],
  acao: "Corro pela cumeeira e pulo para o telhado da estalagem antes que ele olhe para cima.",
  pericia: "Acrobacia",
  grau: "falha_critica",
  natural: 1,
  consequencia: [
    "A telha solta primeiro. Você desce junto com ela, atravessa o toldo e para dentro do barril de picles da cozinha.",
    "O cobrador nem precisou subir: puxa um banquinho, senta ao lado do barril e abre o caderno.",
  ],
  convite: "E agora, o que você faz?",
} as const;

export const PASSOS_DA_JOGADA = [
  { titulo: "O mestre narra", texto: "Um mestre de IA descreve a cena e faz todas as vozes." },
  { titulo: "Você diz o que faz", texto: "Escreva qualquer coisa ou toque numa sugestão." },
  { titulo: "O dado decide", texto: "O código rola de verdade. O mestre não rouba, nem a seu favor." },
] as const;
