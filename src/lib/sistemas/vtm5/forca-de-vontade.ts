import "server-only";
import { d } from "../../dados";
import { clonar } from "../comum";
import type { Ficha, ResultadoTeste } from "../tipos";
import { avaliar, ID, notasDoGrau, vontadeDe, type ResultadoVtm } from "./testes";

// Rerrolar com Força de Vontade (V5): depois de um teste, o personagem gasta 1 de Força de Vontade (1 dano superficial na trilha)
// para rolar de novo até 3 dados NORMAIS — dados de Fome nunca. Uma vez por teste. Não vale em Despertar, Surto, Frenesi, Remorso,
// no próprio teste de Força de Vontade, em Iniciativa (sem dificuldade) nem na Caça (o desfecho da caça já foi gravado na ficha).
// Com a Força de Vontade esgotada (atual 0) não dá. O código escolhe os dados (os menores abaixo de 6), rola e recalcula o grau
// com as mesmas contas de testes.ts; quem decide QUANDO é o jogador, no cartão do teste.

export const MAX_RERROLAGEM = 3;

/** Faces normais e de Fome do resultado (o vtm5 põe a Fome no fim de `dados`). */
function separar(r: ResultadoVtm): { normais: number[]; fome: number[] } {
  const qtdFome = Array.isArray(r.dadosFome) ? r.dadosFome.length : 0;
  return { normais: r.dados.slice(0, r.dados.length - qtdFome), fome: r.dados.slice(r.dados.length - qtdFome) };
}

/** Os dados que mais ajudam: os normais que falharam (< 6), do menor para o maior, até 3. */
export function escolhaPadrao(normais: number[]): number[] {
  return normais
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v < 6)
    .sort((a, b) => a.v - b.v || a.i - b.i)
    .slice(0, MAX_RERROLAGEM)
    .map((x) => x.i)
    .sort((a, b) => a - b);
}

/** Por que não dá para rerrolar este resultado (null = dá). */
export function motivoSemRerrolagem(ficha: Ficha, resultado: ResultadoTeste): string | null {
  if (resultado.sistema !== ID || ficha.sistema !== ID) return "Só no Vampiro.";
  const r = resultado as ResultadoVtm;
  if (r.rerrolado) return "Este teste já foi rerrolado (uma vez por teste).";
  if (r.vtm !== "parada") return "Esse tipo de teste não aceita rerrolagem com Força de Vontade.";
  if (vontadeDe(ficha) <= 0) return "A Força de Vontade está esgotada.";
  if (!separar(r).normais.length) return "Não há dados normais para rerrolar (só dados de Fome).";
  return null;
}

/** Vale PAUSAR o teste para o jogador decidir? Só quando falhou (falha ou Falha Bestial) e há dado normal que falhou para rolar de novo. */
export function valeOferecerRerrolagem(ficha: Ficha, resultado: ResultadoTeste): boolean {
  if (motivoSemRerrolagem(ficha, resultado) !== null || resultado.sucesso) return false;
  return escolhaPadrao(separar(resultado as ResultadoVtm).normais).length > 0;
}

/** Notas de grau que a rerrolagem refaz (o resto de `detalhes` — parada, especialidade, Surto — continua igual). */
const NOTA_DE_GRAU = /^(\d+ par(es)? de 10 |Crítico Sujo:|Falha Bestial:|faltaram \d+:|Fome \d: a Besta está perto)/;

/**
 * Gasta 1 de Força de Vontade e rola de novo até 3 dados normais (`escolhidos` = índices em `dados`; sem eles, os menores abaixo de 6).
 * Devolve o resultado recalculado (com `rerrolado`) e a ficha com a Força de Vontade descontada. Lança erro se a regra não deixa.
 */
export function rerrolarComVontade(original: Ficha, resultado: ResultadoTeste, escolhidos?: number[]): { resultado: ResultadoVtm; ficha: Ficha } {
  const motivo = motivoSemRerrolagem(original, resultado);
  if (motivo) throw new Error(motivo);
  const r = resultado as ResultadoVtm;
  const { normais, fome } = separar(r);
  let indices: number[];
  if (escolhidos?.length) {
    indices = [...new Set(escolhidos)].sort((a, b) => a - b);
    if (indices.length > MAX_RERROLAGEM) throw new Error(`No máximo ${MAX_RERROLAGEM} dados.`);
    if (indices.some((i) => !Number.isInteger(i) || i < 0 || i >= normais.length)) throw new Error("Só dados normais podem ser rerrolados (nunca os de Fome).");
  } else {
    indices = escolhaPadrao(normais);
    if (!indices.length) throw new Error("Nenhum dado normal falhou: não há o que rerrolar.");
  }

  const novos = [...normais];
  for (const i of indices) novos[i] = d(10);
  const av = avaliar(novos, fome, r.alvo);
  const trocas = indices.map((i) => ({ indice: i, antes: normais[i], depois: novos[i] }));

  const ficha = clonar(original);
  const vontade = ficha.recursos.vontade;
  const antes = vontadeDe(original);
  vontade.atual = antes - 1;

  // o gasto e as trocas ficam em `rerrolado` (o cartão desenha a linha da Força de Vontade); aqui só o grau novo
  const notasAntigas = (r.detalhes ?? "").split(" · ").filter((n) => n && !NOTA_DE_GRAU.test(n));
  const detalhes = [...notasAntigas, ...notasDoGrau(av, r.alvo, fome.length, fome.length > 0)].filter(Boolean).join(" · ") || undefined;
  return {
    ficha,
    resultado: {
      ...r,
      dados: [...novos, ...fome],
      total: av.total,
      grau: av.grau,
      sucesso: av.grau === "sucesso" || av.grau === "sucesso_critico",
      rotuloGrau: av.rotulo,
      margem: r.alvo === null ? null : av.total - r.alvo,
      detalhes,
      rerrolado: { dados: trocas, vontade: { antes, depois: vontade.atual, max: vontade.max }, grauAntes: r.rotuloGrau },
    },
  };
}

/** Frase para o mestre: o que mudou com a rerrolagem (já aplicada). */
export function textoRerrolagemParaMestre(r: ResultadoVtm): string {
  const x = r.rerrolado;
  if (!x) return "";
  const n = x.dados.length;
  return `${r.personagem} gastou 1 de Força de Vontade (${x.vontade.antes} → ${x.vontade.depois}, dano superficial, já aplicado) e rerrolou ${n} dado${n > 1 ? "s" : ""} ${n > 1 ? "normais" : "normal"} (${x.dados.map((t) => `${t.antes}→${t.depois}`).join(", ")}): antes ${x.grauAntes}, agora ${r.rotuloGrau}. Narre o esforço de vontade; não role de novo.`;
}
