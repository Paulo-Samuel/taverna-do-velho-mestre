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

/** Um encontro preparado: a linha de stats na linguagem do sistema da aventura (CA/PV/ataque, CD por nível...). */
export type EncontroRoteiro = {
  nome: string;
  onde: string;
  /** quem e com que números */
  inimigos: string;
  /** como lutam e usam o cenário */
  tatica: string;
  /** como o encontro acaba sem ser na última gota de PV (fuga, rendição, negociação) */
  saida: string;
};

/**
 * Recompensas: um texto para todos os sistemas, ou um por sistema (chave = id do sistema; "padrao" vale para os demais).
 * É assim que "ouro conta XP" fica só no OSR e a runa +1 só no Pathfinder 2e.
 */
export type Recompensas = string | Record<string, string>;

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
};

/** O que o navegador pode ver: sem abertura e sem roteiro (spoiler é crime na taverna). */
export type AventuraPublica = Pick<Aventura, "id" | "sistemas" | "titulo" | "chamada" | "duracao" | "recomendado" | "tom" | "cenario">;
