// A duração das aventuras é gravada em texto ("one-shot", "2 sessões"...). O dado fica como está (os testes comparam
// "one-shot"); só o que aparece na tela ganha tradução.

/** Texto de tela para a duração de uma aventura: "one-shot" vira "uma noite só"; o resto já está em português. */
export function rotuloDuracao(duracao: string): string {
  return duracao.trim().toLowerCase() === "one-shot" ? "uma noite só" : duracao;
}
