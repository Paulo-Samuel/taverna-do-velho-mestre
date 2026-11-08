// Roda uma vez quando o servidor sobe, antes da primeira requisição.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // "esta máquina" x "a rede" depende do IP de origem: ele não pode vir de um cabeçalho forjado pelo cliente
  const { blindarCabecalhos } = await import("./lib/rede/blindagem");
  blindarCabecalhos();
  // o next build também passa por aqui: compilar não é hora de copiar banco
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // cópia diária do banco (data/copias, guarda 7) e, depois dela, VACUUM se o arquivo estiver cheio de buracos.
  // Confere na subida e de hora em hora: a taverna pode ficar dias no ar sem reiniciar.
  const g = globalThis as unknown as { __tavernaManutencao?: boolean };
  if (g.__tavernaManutencao) return;
  g.__tavernaManutencao = true;
  const { manutencaoDiaria } = await import("./lib/backup");
  void manutencaoDiaria();
  setInterval(() => void manutencaoDiaria(), 60 * 60 * 1000).unref();
}
