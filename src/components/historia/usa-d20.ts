// Decide se o cartão de teste mostra o d20 em 3D ou a parada em SVG (d10 do Vampiro, d100, Fate, 2d6).
// Sem React e sem "use client": roda igual no servidor, no navegador e nos testes (tests/usa-d20.test.ts).

export type PedidoParaDado = {
  /** como a parada é rolada ("1d20+4", "2d20kh1+3", "7d10 (2 de Fome)", "4dF+2", "1d100") */
  expressao?: string;
  /** dado principal do sistema do pedido ("d20", "d100", "4dF", "2d6") */
  dadoPrincipal?: string;
};

/**
 * Um termo de d20 na expressão: "d20", "1d20+2", "2d20kh1+3", "2d20kl1". O dígito antes do "d" é a quantidade e NÃO pode
 * barrar o casamento (foi o que quebrou o d20 3D: a regex antiga exigia um não-dígito antes de "d20"); "d200" ou "d2000" não valem.
 */
const TERMO_D20 = /(^|[^a-z])\d*d20(?!\d)/i;

/**
 * O d20 3D só serve para testes de d20.
 * 1. Com expressão, vale o que ela diz: é o que o servidor rolou de fato. Isso importa porque o OSR tem dado principal d20 mas
 *    pede alguns testes em 1d6/2d6 (abrir porta, ouvir), e o d20 girando ali seria mentira.
 * 2. Sem expressão (pedidos antigos, sistemas que ainda não a gravam), decide o dado principal gravado no pedido.
 * 3. Sem nenhum dos dois, o d20 fica (comportamento das campanhas antigas, que só tinham o d20 3D).
 */
export function usaD20(d: PedidoParaDado): boolean {
  const expressao = typeof d.expressao === "string" ? d.expressao.trim() : "";
  if (expressao) return TERMO_D20.test(expressao);
  const principal = typeof d.dadoPrincipal === "string" ? d.dadoPrincipal.trim().toLowerCase() : "";
  if (principal) return principal === "d20";
  return true;
}
