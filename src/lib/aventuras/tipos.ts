// Tipos das aventuras prontas. Sem "server-only": os componentes do navegador importam só os tipos (o conteúdo, com o
// roteiro secreto, mora em index.ts e nunca vai para o navegador; as páginas mandam a parte pública por props).

export type NpcRoteiro = {
  nome: string;
  /** quem é, em poucas palavras */
  quem: string;
  /** voz e jeito: como o mestre interpreta */
  voz: string;
  quer: string;
  segredo: string;
};

export type LocalRoteiro = { nome: string; texto: string };

/**
 * Texto que muda com o sistema da campanha: um texto para todos, ou um por sistema (chave = id do sistema; "padrao" vale
 * para os demais). Recompensas e linhas de stats usam isto: uma aventura aberta a cinco fantasias fala em CA/PV no D&D,
 * em DV e moral no OSR e em PV de horda no PbtA.
 */
export type PorSistema = string | Record<string, string>;

/** Um encontro preparado: a linha de stats na linguagem do sistema da aventura (CA/PV/ataque, CD por nível...). */
export type EncontroRoteiro = {
  nome: string;
  onde: string;
  /** quem e com que números (por sistema, quando a aventura roda em mais de um) */
  inimigos: PorSistema;
  /** como lutam e usam o cenário */
  tatica: string;
  /** como o encontro acaba sem ser na última gota de PV (fuga, rendição, negociação) */
  saida: string;
};

/**
 * Recompensas: um texto para todos os sistemas, ou um por sistema (chave = id do sistema; "padrao" vale para os demais).
 * É assim que "ouro conta XP" fica só no OSR e a runa +1 só no Pathfinder 2e.
 */
export type Recompensas = PorSistema;

/** O que só o mestre vê. Enxuto: entra inteiro no prompt de todo turno. */
export type Roteiro = {
  /** premissa e a verdade por trás */
  verdade: string;
  npcs: NpcRoteiro[];
  locais: LocalRoteiro[];
  /** pistas que levam de um ponto a outro (cada conclusão com mais de um caminho) */
  pistas: string[];
  reviravoltas: string[];
  /** passos da ameaça, do primeiro ao pior, avançando quando o grupo demora ou falha feio */
  relogio: string[];
  finais: string[];
  recompensas: Recompensas;
  /** uma linha por sessão (objetivo, cena forte, gancho de fim de noite); opcional */
  sessoes?: string[];
  /** encontros preparados com números do sistema; opcional (masmorras e aventuras de combate) */
  encontros?: EncontroRoteiro[];
  /** 6 cenas prontas para quando o grupo enrola ou falha (NPC aparece, pista chega torta, relógio avança com cena) */
  complicacoes?: string[];
};

export type Aventura = {
  id: string;
  /** ids dos sistemas em que ela roda */
  sistemas: string[];
  titulo: string;
  /** uma frase para o cartão */
  chamada: string;
  duracao: "one-shot" | "2 sessões" | "3 sessões" | "3 a 5 sessões";
  /** nível ou idade recomendada, quando faz sentido */
  recomendado?: string;
  /** vira campanha.tom (até 60 caracteres) */
  tom: string;
  /** vira campanha.cenario: o que o jogador também lê */
  cenario: string;
  /** a cena inicial que o mestre narra no [início da campanha] */
  abertura: string;
  roteiro: Roteiro;
  /**
   * Aventura que roda com um personagem só: `aliado` é o NPC que divide as cenas com ele (alguém para conversar, ajudar e
   * perder). O roteiro imprime a frase condicional; quem decide se a mesa é solo é o mestre, olhando as fichas.
   */
  solo?: { aliado: string };
  /** Vampiro: como uma Pedra de Toque do personagem entra na trama (o horror pessoal precisa de um mortal para perder) */
  pedraEmJogo?: string;
  /** Aventura-tutorial para quem abre a taverna pela primeira vez: aparece primeiro nas listas. */
  tutorial?: true;
};

/** O que o navegador pode ver: sem abertura e sem roteiro (spoiler é crime na taverna). `soloOk` diz que roda com um só. */
export type AventuraPublica = Pick<Aventura, "id" | "sistemas" | "titulo" | "chamada" | "duracao" | "recomendado" | "tom" | "cenario" | "tutorial"> & {
  soloOk?: true;
};
