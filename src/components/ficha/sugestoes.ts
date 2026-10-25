// Sugestões clicáveis do assistente de criação. Texto próprio, nada copiado de livro.

const FANTASIA = [
  "Uma vila de pescadores onde a maré parou de voltar há três dias, e ninguém quer falar sobre o que ficou na areia.",
  "A caravana do sal atravessa o deserto vermelho; o guia sumiu na primeira noite e deixou o mapa marcado com sangue.",
  "Uma cidade-estado em festa pela coroação, com um rei de doze anos, três regentes e um veneno já servido.",
  "Ruínas de uma torre de mago reapareceram no pântano depois de cem anos. Todo mundo quer o que tem lá dentro.",
  "A taverna do Velho Mestre, numa noite de tempestade, quando um estranho entra carregando um ovo que ainda bate.",
];

const POR_SISTEMA: Record<string, string[]> = {
  osr: [
    "A masmorra embaixo do mosteiro abandonado: dez níveis, um mapa rasgado e um bando de rivais com mais tochas que vocês.",
    "Um vale onde o ouro brota da terra e os aventureiros não voltam. A recompensa é boa demais para ser honesta.",
    "O túmulo do Rei-Corvo foi aberto por um terremoto. Os saqueadores chegaram primeiro, e não saíram.",
  ],
  d100: [
    "Uma cidade portuária nos anos 1920: o professor que vocês procuram deixou só um diário e um cheiro de maresia no quarto trancado.",
    "Um sanatório no alto da serra, inverno de 1925. Os pacientes andam desenhando o mesmo símbolo nas paredes.",
    "Uma expedição ao interior em busca de uma estação de pesquisa que parou de mandar telegramas há um mês.",
  ],
  fate: [
    "Piratas do céu num arquipélago de ilhas flutuantes, onde o vento é moeda e a lei é quem tem o maior balão.",
    "Uma cidade cyberpunk alagada: corporações nos andares altos, sindicatos de mergulhadores nos baixos e vocês no meio.",
    "Um circo itinerante de agentes secretos numa Europa alternativa de 1890, movida a vapor e intriga.",
  ],
  pbta: [
    "A fronteira do império está ruindo: um forte isolado, poucos soldados e algo grande acordando na floresta.",
    "Uma cidade construída sobre as costas de uma criatura adormecida que, ultimamente, anda se mexendo.",
    "Os mortos do cemitério da colina saem toda lua nova, mas só para cobrar dívidas. Alguém está devendo muito.",
  ],
};

/** Cenários sugeridos para o sistema escolhido (os de fantasia completam a lista). */
export function cenariosSugeridos(sistemaId: string): string[] {
  return [...(POR_SISTEMA[sistemaId] ?? []), ...FANTASIA].slice(0, 6);
}

export const TONS = [
  "sombrio e debochado",
  "heroico e cheio de bravata",
  "terror lento e opressivo",
  "comédia de erros",
  "épico e trágico",
  "intriga e política",
  "pulp e explosivo",
];

/** Ganchos para quem trava na história do personagem. */
export const GANCHOS_HISTORIA = [
  "Deve dinheiro a alguém que não aceita desculpas.",
  "Fugiu de casa por um motivo que ainda não contou a ninguém.",
  "Carrega um objeto que não é seu e que alguém quer de volta.",
  "Perdeu um irmão numa expedição e jura que ele está vivo.",
  "Foi expulso da ordem, da guilda ou do templo. Talvez com razão.",
  "Tem um rival que aparece sempre na pior hora possível.",
];
