import "server-only";
import { obterCampanha, obterPersonagem } from "@/lib/db";
import { acessoPermitido } from "@/lib/rede/acesso";
import { limitar, normalizar } from "@/lib/sistemas/comum";
import type { Ficha, RotulosSistema } from "@/lib/sistemas/tipos";

/** Campanha + personagem da rota, já conferindo acesso (mesmo critério da rota do personagem); erro pronto quando não dá. */
export function alvoDaRota(request: Request, id: string, pid: string) {
  const campanha = obterCampanha(Number(id));
  if (!campanha) return { erro: Response.json({ erro: "Mesa não encontrada." }, { status: 404 }) } as const;
  if (!acessoPermitido(request, campanha)) return { erro: Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 }) } as const;
  const personagem = obterPersonagem(Number(pid));
  // personagem de outra mesa conta como inexistente
  if (!personagem || personagem.campanhaId !== campanha.id) {
    return { erro: Response.json({ erro: "Esse personagem não está nesta mesa." }, { status: 404 }) } as const;
  }
  return { erro: null, campanha, personagem } as const;
}

// Ajuste manual da ficha pelo jogador (o mestre esqueceu o dano, o gasto de Força de Vontade, a Fome...).
// Recebe variações (não valores absolutos): dois cliques em aparelhos diferentes somam em vez de um apagar o outro.

export type PedidoAjuste = {
  pv?: number;
  dinheiro?: number;
  /** variação por id de ficha.recursos */
  recursos?: Record<string, number>;
  adicionarCondicoes?: string[];
  removerCondicoes?: string[];
  adicionarItens?: string[];
  removerItens?: string[];
};

/** Teto do dinheiro quando o sistema usa pontos em vez de moedas (Vampiro: Recursos 0–5). */
const TETO_DINHEIRO: Record<string, number> = { vtm5: 5 };
const TETO_GERAL = 1_000_000_000;

/** Acha na lista pelo texto exato; se não, ignorando acento e caixa. */
function indice(lista: string[], texto: string): number {
  const exato = lista.indexOf(texto);
  return exato >= 0 ? exato : lista.findIndex((x) => normalizar(x) === normalizar(texto));
}

/**
 * Aplica o pedido na ficha (muta) respeitando mínimos, máximos e as amarras de cada sistema.
 * Devolve as mudanças em texto legível ("Força de Vontade 4 → 3"); lista vazia = nada mudou.
 */
export function aplicarAjuste(ficha: Ficha, p: PedidoAjuste, rotulos: RotulosSistema): { mudancas: string[]; pvAntes: number } {
  const mudancas: string[] = [];
  const pvAntes = ficha.pv;

  if (p.pv) ficha.pv = limitar(ficha.pv + p.pv, 0, ficha.pvMax);

  const recursosMudados = new Set<string>();
  for (const [id, delta] of Object.entries(p.recursos ?? {})) {
    const r = ficha.recursos[id];
    if (!r || !delta) continue;
    const antes = r.atual;
    r.atual = limitar(r.atual + delta, 0, r.max);
    if (r.atual !== antes) {
      recursosMudados.add(id);
      mudancas.push(`${r.rotulo} ${antes} → ${r.atual}`);
    }
  }

  // Vampiro: as caixas de Mancha são o que sobra da Humanidade; a Mancha também fica espelhada em extras.mancha
  if (ficha.sistema === "vtm5" && ficha.recursos.mancha) {
    const m = ficha.recursos.mancha;
    if (ficha.recursos.humanidade) m.max = 10 - ficha.recursos.humanidade.atual;
    m.atual = limitar(m.atual, 0, Math.max(0, m.max));
    ficha.extras.mancha = m.atual;
  }

  // Fate: PV e o recurso "estresse" são o mesmo marcador; quem foi mexido manda
  const estresse = ficha.sistema === "fate" ? ficha.recursos.estresse : undefined;
  if (estresse) {
    if (ficha.pv !== pvAntes) estresse.atual = limitar(ficha.pv, 0, estresse.max);
    else if (recursosMudados.has("estresse")) ficha.pv = Math.min(ficha.pvMax, estresse.atual);
  }
  if (ficha.pv !== pvAntes) mudancas.unshift(`${rotulos.pv} ${pvAntes} → ${ficha.pv}`);

  if (p.dinheiro) {
    const antes = ficha.dinheiro;
    ficha.dinheiro = limitar(ficha.dinheiro + p.dinheiro, 0, TETO_DINHEIRO[ficha.sistema] ?? TETO_GERAL);
    if (ficha.dinheiro !== antes) mudancas.push(`${rotulos.dinheiro} ${antes} → ${ficha.dinheiro}`);
  }

  for (const c of p.adicionarCondicoes ?? []) {
    if (indice(ficha.condicoes, c) >= 0) continue;
    ficha.condicoes.push(c);
    mudancas.push(`+ ${c}`);
  }
  for (const c of p.removerCondicoes ?? []) {
    const i = indice(ficha.condicoes, c);
    if (i < 0) continue;
    mudancas.push(`− ${ficha.condicoes[i]}`);
    ficha.condicoes.splice(i, 1);
  }
  for (const item of p.adicionarItens ?? []) {
    ficha.inventario.push(item);
    mudancas.push(`+ ${item}`);
  }
  for (const item of p.removerItens ?? []) {
    const i = indice(ficha.inventario, item);
    if (i < 0) continue;
    mudancas.push(`− ${ficha.inventario[i]}`);
    ficha.inventario.splice(i, 1);
  }

  // mesma regra do alterar_ficha: 0 de vida derruba, voltar a ter vida levanta (no Fate, 0 é só "sem caixas")
  if (ficha.pv !== pvAntes && ficha.sistema !== "fate") {
    if (ficha.pv === 0 && !ficha.condicoes.includes("inconsciente")) ficha.condicoes.push("inconsciente");
    if (ficha.pv > 0) ficha.condicoes = ficha.condicoes.filter((c) => c !== "inconsciente");
  }
  return { mudancas, pvAntes };
}
