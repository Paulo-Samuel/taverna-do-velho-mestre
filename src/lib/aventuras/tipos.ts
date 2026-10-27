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
  recompensas: string;
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
