// Estilo do mestre por campanha (ajustes da mesa): as opções do formulário e o texto que cada uma põe no prompt.
// Sem "server-only": a página de ajustes usa as mesmas listas.

export type Dificuldade = "indulgente" | "justa" | "implacavel";
export type TamanhoNarracao = "curta" | "media" | "longa";

export const MAX_INSTRUCOES = 500;
export const MAX_FOCO_LIVRE = 80;

/** prompt vazio = comportamento padrão das regras gerais */
export const DIFICULDADES: { id: Dificuldade; nome: string; texto: string; prompt: string }[] = [
  {
    id: "indulgente",
    nome: "Indulgente",
    texto: "Perdoa deslizes e avisa o perigo. Falhas viram complicações leves; morrer só insistindo muito.",
    prompt:
      "Dificuldade indulgente: perdoe deslizes do jogador e avise o perigo com clareza; falha vira complicação leve ou custo pequeno, raramente dano sério; inimigos aliviam quando a luta desanda; personagem só morre se o jogador insistir no suicídio.",
  },
  {
    id: "justa",
    nome: "Justa",
    texto: "O padrão: desafios na medida das regras, falhas com custo real e proporcional.",
    prompt: "",
  },
  {
    id: "implacavel",
    nome: "Implacável",
    texto: "Falhas custam caro, inimigos jogam para ganhar e a morte é possível. Para quem gosta de suar.",
    prompt:
      "Dificuldade implacável: falhas custam caro (dano, recurso, tempo, aliado, posição); inimigos jogam para vencer (focam o ferido, usam o terreno, emboscam, recuam e voltam com reforço); nada de resgate ou segunda chance de graça; a morte de personagem é possível e fica. Sinalize o perigo na ficção antes do golpe fatal.",
  },
];

export const TAMANHOS: { id: TamanhoNarracao; nome: string; texto: string; prompt: string }[] = [
  {
    id: "curta",
    nome: "Curta",
    texto: "Um parágrafo enxuto e uma pergunta. Ritmo rápido, bom para celular.",
    prompt: "1 parágrafo enxuto (3 a 5 frases) por turno, fechando com uma pergunta direta; a abertura pode ter 2",
  },
  {
    id: "media",
    nome: "Média",
    texto: "O padrão: dois ou três parágrafos por turno.",
    prompt: "2 a 3 parágrafos de narração por turno; a abertura pode ter 4",
  },
  {
    id: "longa",
    nome: "Longa",
    texto: "Três ou quatro parágrafos ricos, com mais detalhe e falas. Para ler com calma.",
    prompt: "3 a 4 parágrafos ricos por turno (detalhe sensorial, falas, reação do mundo); a abertura pode ter 5",
  },
];

export const FOCOS: { id: string; nome: string; prompt: string }[] = [
  { id: "combate", nome: "Combate tático", prompt: "combate tático (posição, terreno, inimigos espertos, escolhas que pesam a cada rodada)" },
  { id: "intriga", nome: "Intriga e diálogo", prompt: "intriga e diálogo (NPCs com agenda, negociação, segredos, conversas longas)" },
  { id: "exploracao", nome: "Exploração", prompt: "exploração (lugares cheios de coisas para mexer, viagem, descobertas)" },
  { id: "misterio", nome: "Mistério", prompt: "mistério e investigação (pistas concretas, suspeitos, deduções dos jogadores)" },
  { id: "horror", nome: "Horror", prompt: "horror (tensão lenta, o não-dito, ameaça que se revela aos poucos)" },
  { id: "drama", nome: "Drama pessoal", prompt: "drama pessoal (passado, laços e dilemas morais dos personagens)" },
  { id: "humor", nome: "Humor", prompt: "humor (situações absurdas, NPCs caricatos, espaço para a mesa rir)" },
];

export const dificuldadeDe = (id: unknown): Dificuldade => DIFICULDADES.find((d) => d.id === id)?.id ?? "justa";
export const tamanhoDe = (id: unknown): TamanhoNarracao => TAMANHOS.find((t) => t.id === id)?.id ?? "media";

/** Separa o foco salvo em ids conhecidos e o texto livre (o que não for id). */
export function separarFoco(foco: string[] | undefined): { ids: string[]; livre: string } {
  const lista = Array.isArray(foco) ? foco : [];
  return { ids: lista.filter((f) => FOCOS.some((x) => x.id === f)), livre: lista.filter((f) => !FOCOS.some((x) => x.id === f)).join("; ") };
}
