// G16: perguntas de balcão (FAQ da página inicial). Módulo puro: só fatos verdadeiros sobre a taverna.
// A resposta de custo depende do mestre ligado (TAVERNA_PROVEDOR: cli, api ou falso).

export type Pergunta = { id: string; pergunta: string; resposta: string; link?: { href: string; rotulo: string } };

function respostaDeCusto(provedorId: string): string {
  if (provedorId === "api") {
    return "A taverna é grátis; quem cobra é a API: cada turno gasta um pouco do crédito da sua chave. Dá para trocar de mestre nas Configurações.";
  }
  if (provedorId === "falso") {
    return "Agora, nada: está ligado o mestre de teste, sem IA. Para jogar de verdade, troque o mestre nas Configurações.";
  }
  return "Nada além do que você já paga: a taverna é grátis, roda aí na sua máquina e o mestre sai do limite do seu plano do Claude. Sem crédito, sem assinatura, sem gorjeta.";
}

export function perguntasFrequentes(provedorId: string): Pergunta[] {
  return [
    {
      id: "custo",
      pergunta: "Quanto custa?",
      resposta: respostaDeCusto(provedorId),
      link: { href: "/config", rotulo: "Trocar o mestre" },
    },
    {
      id: "dados",
      pergunta: "Onde fica a minha campanha?",
      resposta: "Na sua máquina, na pasta data da taverna. Nada sobe para nuvem nenhuma. Em Cópias e lixeira dá para guardar uma cópia e desfazer exclusões.",
      link: { href: "/backup", rotulo: "Cópias e lixeira" },
    },
    {
      id: "regras",
      pergunta: "Preciso saber as regras?",
      resposta: "Não. No modo história o mestre sugere o que fazer e cuida da conta. Quem gosta de planilha tem D&D, Pathfinder, Vampiro e companhia no modo avançado.",
      link: { href: "/sistemas", rotulo: "Ver os sistemas" },
    },
    {
      id: "dado",
      pergunta: "O mestre rouba no dado?",
      resposta: "Não consegue. Quem rola é o código; a IA só decide quando pedir o teste e depois tem de engolir o número, como todo mundo.",
    },
    {
      id: "amigos",
      pergunta: "Dá para jogar com os amigos?",
      resposta: "Dá: todo mundo no mesmo computador, passando o teclado, ou cada um no próprio celular pelo Wi-Fi de casa, com link e QR code.",
      link: { href: "/#amigos", rotulo: "Como funciona" },
    },
    {
      id: "voltar",
      pergunta: "Fiz besteira. Dá para voltar atrás?",
      resposta: "Na mesa dá para desfazer o último turno ou pedir outra resposta ao mestre. E campanha excluída vai para a lixeira, não para o além.",
      link: { href: "/backup", rotulo: "Abrir a lixeira" },
    },
    {
      id: "livro",
      pergunta: "Dá para guardar a história?",
      resposta: "Cada campanha vira um livro: dá para reler, imprimir, salvar em PDF ou baixar em Markdown. O botão Livro fica no cartão da campanha.",
    },
  ];
}
