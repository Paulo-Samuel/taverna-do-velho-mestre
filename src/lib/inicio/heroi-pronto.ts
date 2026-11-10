import { sortearGanchos } from "@/components/historia/criacao/ganchos";
import { sortearNomes } from "@/components/historia/criacao/nomes";
import { ARQUETIPOS, arquetipoPorId, retratoDoArquetipo } from "@/components/historia/retrato/arquetipos-retrato";
import { sorte, type DadosRetrato } from "@/components/historia/retrato/dados";

// G15: "Jogar agora". Monta um herói inteiro a partir de um dos oito arquétipos de retrato, sem formulário: o nome e o
// gancho de história saem da semente, o rosto e o figurino são os do arquétipo. Módulo puro (sem React e sem
// "server-only"): a action de src/app/nova/jogar-agora-acoes.ts usa no servidor e o teste roda direto no Node.

/** O arquétipo "nobre-decaido" não tem ofício sugerido (classe ""): cai neste. */
export const CLASSE_RESERVA = "mercenario";

export type HeroiPronto = {
  arquetipo: string;
  nome: string;
  sexo: string;
  origem: string;
  classe: string;
  historia: string;
  retrato: DadosRetrato;
};

/** Mesma semente e mesmo id dão sempre o mesmo herói. Id desconhecido ou vazio: um arquétipo sorteado pela semente. */
export function montarHeroiPronto(semente: string, arquetipoId?: string | null): HeroiPronto {
  const a = arquetipoPorId(arquetipoId) ?? sorte("heroi|" + semente).um(ARQUETIPOS);
  const classe = a.classe || CLASSE_RESERVA;
  return {
    arquetipo: a.id,
    nome: sortearNomes(semente, a.sexo)[0] || a.nome,
    sexo: a.sexo,
    origem: a.origem,
    classe,
    historia: sortearGanchos(classe, a.sexo, semente)[0] ?? "",
    // sem passar a classe: o figurino do arquétipo vale mesmo quando o ofício veio da reserva
    retrato: retratoDoArquetipo(a),
  };
}

/**
 * Qual aventura abre a mesa do "Jogar agora". A pedida vence se estiver na lista; na primeira visita (sem campanhas) é a
 * aventura-tutorial; depois, uma sorteada entre as outras (a tutorial só volta se for a única). Lista vazia: null.
 */
export function escolherAventuraRapida(
  aventuras: readonly { id: string; tutorial?: boolean }[],
  temCampanhas: boolean,
  semente: string,
  pedida?: string | null,
): string | null {
  if (aventuras.length === 0) return null;
  if (pedida && aventuras.some((a) => a.id === pedida)) return pedida;
  const tutorial = aventuras.find((a) => a.tutorial);
  if (!temCampanhas && tutorial) return tutorial.id;
  const outras = aventuras.filter((a) => !a.tutorial);
  const fonte = outras.length > 0 ? outras : aventuras;
  return sorte("aventura|" + semente).um(fonte).id;
}
