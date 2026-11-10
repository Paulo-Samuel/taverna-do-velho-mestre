// Texto curto que o leitor de tela fala quando o mestre responde (a narração inteira fica na conversa, para ler com calma).

const PREFIXO = "O mestre respondeu.";

/** Tira a marcação, junta os espaços e corta em `limite` sem partir palavra. */
export function anuncioDaNarracao(texto: string, limite = 160): string {
  const limpo = texto
    .replace(/[*_#>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo) return PREFIXO;
  if (limpo.length <= limite) return `${PREFIXO} ${limpo}`;
  const corte = limpo.slice(0, limite + 1);
  const ultimoEspaco = corte.lastIndexOf(" ");
  // Sem espaço nenhum (palavra gigante) não há como poupar a palavra: corta no limite mesmo.
  const trecho = (ultimoEspaco > 0 ? corte.slice(0, ultimoEspaco) : limpo.slice(0, limite)).replace(/[\s.,;:!?…-]+$/, "");
  return `${PREFIXO} ${trecho}…`;
}
