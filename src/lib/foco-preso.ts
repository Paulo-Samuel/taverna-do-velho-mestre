// Lógica pura da armadilha de foco dos diálogos (o gancho que mexe no DOM mora em src/lib/cliente/use-foco-preso.ts).

/** Tudo que recebe foco pelo Tab dentro de um diálogo. */
export const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Índice que deve receber o foco à força quando a pessoa aperta Tab, ou null para deixar o Tab nativo agir.
 * Só intervém nas bordas: do último volta ao primeiro, do primeiro (com Shift) vai ao último, e quem está fora da lista entra nela.
 */
export function proximoFoco(total: number, atual: number, paraTras: boolean): number | null {
  if (total <= 0) return null;
  if (atual === -1) return paraTras ? total - 1 : 0;
  if (!paraTras && atual === total - 1) return 0;
  if (paraTras && atual === 0) return total - 1;
  return null;
}
