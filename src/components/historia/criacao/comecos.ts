// Onde a história começa e em que tom: as opções do último passo da criação. Sem "use client": a ação do servidor usa as
// mesmas listas para montar o cenário e o tom da campanha (o navegador só manda o id, o texto do prompt sai daqui).

/** `onde` completa "Começa ..." no resumo do herói */
export type Comeco = { id: string; nome: string; onde: string; icone: string; texto: string; prompt: string };
export type Tom = { id: string; nome: string; texto: string; prompt: string };

export const COMECOS: Comeco[] = [
  {
    id: "taverna",
    nome: "A taverna do Velho Mestre",
    onde: "na taverna do Velho Mestre",
    icone: "🍺",
    texto: "Noite de tempestade, lareira acesa e um estranho que sabe o seu nome.",
    prompt:
      "na taverna do Velho Mestre, numa noite de tempestade: chuva nas janelas, lareira estalando, fregueses suspeitos e o taverneiro atrás do balcão. A porta se abre e alguém (ou algo) entra trazendo o gancho, ligado ao passado do herói",
  },
  {
    id: "caravana",
    nome: "A caravana atacada",
    onde: "na estrada, com a caravana atacada",
    icone: "🐎",
    texto: "Carroças viradas na estrada, flechas ainda quentes e ninguém para explicar.",
    prompt: "numa estrada de terra, no meio do ataque a uma caravana: carroças viradas, cavalos em pânico, agressores ainda por perto e alguém pedindo socorro",
  },
  {
    id: "prisao",
    nome: "O porão da prisão",
    onde: "no porão da prisão",
    icone: "⛓️",
    texto: "Você acorda acorrentado. A chave, claro, está do outro lado das grades.",
    prompt: "no porão úmido de uma prisão: o herói acorda preso, sem saber direito como chegou ali, com um companheiro de cela falante e um guarda distraído",
  },
  {
    id: "funeral",
    nome: "O funeral do nobre",
    onde: "no funeral do nobre",
    icone: "⚰️",
    texto: "Todo mundo de preto, ninguém triste e o caixão fazendo barulho.",
    prompt: "no funeral de um nobre importante: herdeiros de olho no testamento, carpideiras contratadas, segredos de família e algo muito errado com o morto",
  },
  {
    id: "navio",
    nome: "O navio na neblina",
    onde: "num navio perdido na neblina",
    icone: "⛵",
    texto: "Sem vento, sem terra à vista e um sino tocando sozinho na névoa.",
    prompt: "a bordo de um navio parado numa neblina espessa: sem vento, tripulação nervosa, um capitão que esconde alguma coisa e um sino tocando ao longe",
  },
  {
    id: "feira",
    nome: "A cidade em festa",
    onde: "numa cidade em festa",
    icone: "🎪",
    texto: "Bandeirolas, vinho barato, malabaristas e um roubo prestes a acontecer.",
    prompt: "numa feira de uma cidade em festa: multidão, barracas, artistas de rua, guardas bêbados e um crime acontecendo bem diante do herói",
  },
  {
    id: "templo",
    nome: "As ruínas do templo",
    onde: "nas ruínas do templo",
    icone: "🏛️",
    texto: "Pedras antigas, inscrições apagadas e algo lá dentro que acabou de acordar.",
    prompt: "nas ruínas de um templo esquecido: colunas caídas, inscrições num idioma morto, rastros recentes de outros saqueadores e algo antigo despertando",
  },
  {
    id: "livre",
    nome: "O mestre escolhe",
    onde: "onde o mestre quiser",
    icone: "🎲",
    texto: "Confie no Velho Mestre. Ele é de confiança. Na maior parte das vezes.",
    prompt: "",
  },
];

export const TONS: Tom[] = [
  {
    id: "sombrio",
    nome: "Sombrio e debochado",
    texto: "O mundo é cruel, mas tem senso de humor.",
    prompt: "aventura sombria e irreverente",
  },
  {
    id: "epico",
    nome: "Épico e heroico",
    texto: "Grandes feitos, inimigos à altura, música alta.",
    prompt: "épico e heroico: grandes feitos, perigo à altura, momentos de glória e sacrifício",
  },
  {
    id: "terror",
    nome: "Terror lento",
    texto: "O medo vem devagar. E fica.",
    prompt: "terror lento: tensão crescente, o não-dito, uma ameaça que se revela aos poucos",
  },
  {
    id: "comedia",
    nome: "Comédia",
    texto: "O perigo é real; o ridículo também.",
    prompt: "comédia: situações absurdas, NPCs caricatos, o perigo é real mas o ridículo também",
  },
  {
    id: "intriga",
    nome: "Intriga",
    texto: "Segredos, traições e conversas que valem mais que espadas.",
    prompt: "intriga: segredos, traições, NPCs com agenda própria e conversas que valem mais que espadas",
  },
];

export const comecoDe = (id: unknown): Comeco => COMECOS.find((c) => c.id === id) ?? COMECOS[0];
export const tomDe = (id: unknown): Tom => TONS.find((t) => t.id === id) ?? TONS[0];

/** Cenário da campanha: o começo escolhido e o passado do herói, em blocos que o mestre lê de primeira. */
export function montarCenario(comeco: Comeco, passado: string): string {
  const inicio = comeco.prompt
    ? `Começo: a aventura abre ${comeco.prompt}.`
    : "Começo: livre; o mestre escolhe um lugar surpreendente que converse com o passado do herói.";
  return passado.trim() ? `${inicio}\n\nPassado do herói: ${passado.trim()}` : inicio;
}

/** Cenário de uma aventura pronta: o texto dela no lugar do começo, com o passado do herói junto. */
export function cenarioDeAventura(cenario: string, passado: string): string {
  return passado.trim() ? `${cenario}\n\nPassado do herói: ${passado.trim()}` : cenario;
}
