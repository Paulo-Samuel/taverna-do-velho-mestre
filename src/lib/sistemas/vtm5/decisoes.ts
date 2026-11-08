import "server-only";
import { normalizar } from "../comum";
import type { Ficha, OpcaoAntesDeRolar, OpcaoDecisao, PedidoTeste, ResultadoTeste } from "../tipos";
import { DISCIPLINAS } from "./dados";
import { escolhaPadrao, MAX_RERROLAGEM, motivoSemRerrolagem, rerrolarComVontade, textoRerrolagemParaMestre, valeOferecerRerrolagem } from "./forca-de-vontade";
import { efeitosPotencia, fomeDe, surtoPendenteDe, type ResultadoVtm } from "./testes";

// Decisões do jogador no cartão do teste (ganchos decisoesAposTeste / aplicarDecisao / opcoesAntesDeRolar do contrato).
// Depois do dado: rerrolar com Força de Vontade, com as mesmas regras de forca-de-vontade.ts (em falha, e também em sucesso, até 3 dados normais,
// uma vez por teste). Antes do dado: Surto de Sangue numa parada sem disciplina. O servidor (mestre/index.ts) só fala com estes
// ganchos; não sabe que existe Vampiro.

export const REROLAR_VONTADE = "rerrolar_vontade";
export const SURTO = "surto";

/** Faces normais do resultado (o vtm5 põe a Fome no fim de `dados`). */
function normaisDe(r: ResultadoVtm): number[] {
  const fome = Array.isArray(r.dadosFome) ? r.dadosFome.length : 0;
  return r.dados.slice(0, r.dados.length - fome);
}

/**
 * Em falha: rerrolar os normais que falharam. Em sucesso (pelo livro vale em qualquer teste: margem é dano, e dá para caçar o par de
 * 10) também, quando há dado normal abaixo de 10; o servidor decide se pausa (perigoso, ataque) ou só deixa o botão discreto.
 */
export function decisoesAposTeste(ficha: Ficha, resultado: ResultadoTeste): OpcaoDecisao[] {
  const normais = normaisDe(resultado as ResultadoVtm);
  let padrao: number[];
  if (valeOferecerRerrolagem(ficha, resultado)) padrao = escolhaPadrao(normais);
  else if (resultado.sucesso && motivoSemRerrolagem(ficha, resultado) === null && normais.some((v) => v < 10)) padrao = padraoNoSucesso(normais);
  else return [];
  return [
    {
      id: REROLAR_VONTADE,
      rotulo: "Rerrolar com Força de Vontade",
      custo: "1 de Força de Vontade",
      dados: { max: MAX_RERROLAGEM, elegiveis: normais.map((_, i) => i), padrao },
    },
  ];
}

/** No sucesso: os que falharam (< 6); sem nenhum, os menores abaixo de 10 (atrás do par de 10). */
function padraoNoSucesso(normais: number[]): number[] {
  const falhos = escolhaPadrao(normais);
  if (falhos.length) return falhos;
  return normais
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v < 10)
    .sort((a, b) => a.v - b.v || a.i - b.i)
    .slice(0, MAX_RERROLAGEM)
    .map((x) => x.i)
    .sort((a, b) => a - b);
}

export function aplicarDecisao(ficha: Ficha, resultado: ResultadoTeste, id: string, escolha?: { dados?: number[] }) {
  if (id !== REROLAR_VONTADE) throw new Error("Essa escolha não existe no Vampiro.");
  // sem escolha num sucesso sem dado falho, vale o padrão oferecido (os menores abaixo de 10)
  const dados = escolha?.dados?.length ? escolha.dados : resultado.sucesso ? decisoesAposTeste(ficha, resultado)[0]?.dados?.padrao : undefined;
  const feito = rerrolarComVontade(ficha, resultado, dados);
  return { ficha: feito.ficha, resultado: feito.resultado as ResultadoTeste, textoMestre: textoRerrolagemParaMestre(feito.resultado) };
}

/** Testes que não são parada comum (têm regra própria ou não aceitam Surto). */
const ESPECIAIS = /^(teste de )?(surto|blood surge|despertar|rouse|remorso|remorse|humanidade|frenesi|frenzy|rotschreck|forca de vontade|vontade|willpower|iniciativa|initiative|caca|cacar|cacada|alimentar|alimentacao|hunt)\b/;

/** A parada cita uma disciplina (Surto não soma em parada de disciplina). */
function citaDisciplina(texto: string): boolean {
  const t = normalizar(texto);
  return DISCIPLINAS.some((d) => [d.id, d.nome, ...(d.apelidos ?? [])].some((n) => t.includes(normalizar(n))));
}

/** Surto de Sangue antes de rolar: parada sem disciplina, Fome abaixo de 5 e nenhum Surto já guardado. */
export function opcoesAntesDeRolar(ficha: Ficha, pedido: PedidoTeste): OpcaoAntesDeRolar[] {
  const t = normalizar(pedido.teste ?? "");
  if (!t || ESPECIAIS.test(t) || /surto|blood surge/.test(t) || citaDisciplina(t)) return [];
  if (fomeDe(ficha) >= 5 || surtoPendenteDe(ficha) > 0) return [];
  const extra = efeitosPotencia(ficha)?.surto ?? 0;
  if (extra <= 0) return [];
  return [{ id: SURTO, rotulo: "Surto de Sangue", custo: "1 Despertar", efeito: `+${extra} dado${extra === 1 ? "" : "s"}` }];
}
