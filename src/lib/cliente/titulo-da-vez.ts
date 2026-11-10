// Título da aba quando a mesa espera por você e a aba está em segundo plano.

export type EstadoDaVez = "vez" | "dado" | null;

const PREFIXOS = { vez: "Sua vez · ", dado: "Dado na mesa · " } as const;

function semPrefixo(titulo: string): string {
  let limpo = titulo;
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const prefixo of Object.values(PREFIXOS)) {
      if (limpo.startsWith(prefixo)) {
        limpo = limpo.slice(prefixo.length);
        mudou = true;
      }
    }
  }
  return limpo;
}

/** Põe (ou tira, com estado null) o aviso na frente do título. Aplicar duas vezes dá no mesmo. */
export function tituloDaVez(base: string, estado: EstadoDaVez): string {
  const limpo = semPrefixo(base);
  return estado ? `${PREFIXOS[estado]}${limpo}` : limpo;
}
