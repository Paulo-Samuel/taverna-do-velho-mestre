// Roda uma vez quando o servidor sobe, antes da primeira requisição.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // "esta máquina" x "a rede" depende do IP de origem: ele não pode vir de um cabeçalho forjado pelo cliente
  const { blindarCabecalhos } = await import("./lib/rede/blindagem");
  blindarCabecalhos();
}
