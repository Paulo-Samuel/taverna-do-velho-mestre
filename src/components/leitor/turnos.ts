import type { Mensagem } from "@/lib/db";

// Agrupamento das mensagens da mesa em turnos (as "cenas" do leitor cena a cena).
// Um turno = as ações dos jogadores + tudo o que veio depois (narração, dados, pedidos de teste) até a próxima ação.
// A abertura ("A aventura começa." e a primeira narração) é o primeiro turno. O resultado de um teste rolado pelo jogador
// não vira mensagem de jogador (vai só para o mestre), então a continuação do mestre fica no mesmo turno do cartão do teste.

export type Turno = {
  /** chave estável: id da primeira mensagem do turno */
  chave: string;
  /** ações dos jogadores que abriram o turno (várias no modo rodada) */
  acoes: Mensagem[];
  /** o resto, na ordem: narração do mestre, cartões de dado, pedidos de teste, cabeçalhos de cena, avisos do sistema */
  itens: Mensagem[];
};

export function agruparTurnos(mensagens: Mensagem[]): Turno[] {
  const turnos: Turno[] = [];
  let atual: Turno | null = null;
  const novo = (m: Mensagem) => {
    atual = { chave: `t${m.id}`, acoes: [], itens: [] };
    turnos.push(atual);
    return atual;
  };
  for (const m of mensagens) {
    let t = atual as Turno | null;
    if (m.tipo === "jogador") {
      // ações seguidas (rodada) entram juntas; ação depois de qualquer resposta abre turno novo
      if (!t || t.itens.length > 0) t = novo(m);
      t.acoes.push(m);
    } else if (m.tipo === "sistema") {
      if (!t || t.acoes.length > 0 || t.itens.length > 0) t = novo(m);
      t.itens.push(m);
    } else {
      if (!t) t = novo(m);
      t.itens.push(m);
    }
  }
  return turnos;
}

/** Parágrafos de uma narração do mestre (como as narrações das mesas: linha em branco separa, títulos markdown viram texto). */
export function dividirParagrafos(texto: string): string[] {
  return texto
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.replace(/^#{1,6}\s+/, "").trim())
    .filter(Boolean);
}

/** "---", "***" ou "___" sozinhos no parágrafo: separador de cena. */
export const SEPARADOR = /^(-{3,}|\*{3,}|_{3,})$/;
