// Sementes da criação por sistema: cenários, ganchos de história, tons, nomes e sugestões para os campos livres.
// Só dados e funções puras (sem "server-only"): o assistente de criação usa no navegador e a ação de criar usa o tom padrão.
// Texto próprio, sem marcas registradas de cenário nenhum.

import { D100 } from "./d100";
import { DND5E, OSR, PF1E, PF2E } from "./fantasia";
import { FATE, PBTA } from "./outros";
import { VTM5 } from "./vtm5";

/** O que o gerador de um campo sabe do personagem (só os ids das escolhas; quem chama traduz se precisar). */
export type ContextoSemente = {
  classe: string;
  ancestralidade: string;
  antecedente: string;
  extras: Record<string, string[]>;
  /** sorteio de quem chama (crypto no navegador) */
  sortear: <T>(lista: readonly T[]) => T;
};

export type CampoSemente = {
  /** placeholder com cara do sistema; recebe o contexto (sem sortear: o placeholder não pode mudar a cada render) */
  exemplo?: string | ((c: Pick<ContextoSemente, "classe" | "ancestralidade">) => string);
  /** sugere um valor coerente com as escolhas, sem IA */
  gerar?: (c: ContextoSemente) => string;
  /** quantas linhas o "personagem pronto" preenche numa lista-texto (padrão 1) */
  pronto?: number;
};

/** Duas listas-texto que andam juntas, linha a linha (Convicção ↔ Pedra de Toque no Vampiro). */
export type ParSemente = {
  campo: string;
  par: string;
  /** título do bloco que junta as duas listas */
  titulo: string;
  ajuda: string;
  /** rótulo de cada metade da linha */
  rotulos: [string, string];
  exemplos: [string, string];
  gerar: (c: ContextoSemente) => [string, string];
  /** quantos pares o "personagem pronto" preenche */
  pronto?: number;
};

export type SementesSistema = {
  /** 6 a 10 começos de campanha */
  cenarios: string[];
  /** 8 a 12 ganchos para a história do personagem */
  ganchos: string[];
  /** tons sugeridos; o primeiro é o padrão quando o campo fica vazio */
  tons: string[];
  /** nomes de campanha para o 🎲 */
  campanhas: string[];
  nomes: { primeiros: string[]; sobrenomes: string[] };
  exemploNome: string;
  exemploHistoria: string;
  exemploCenario: string;
  /** sugestões por id de Sistema.opcoesCriacao */
  campos?: Record<string, CampoSemente>;
  pares?: ParSemente[];
  /** múltiplas escolhas que o sorteio deixa em branco para o sistema completar com coerência (perícias do Vampiro pelo clã) */
  deixarParaOSistema?: string[];
  /** ancestralidades (era, gênero) que o "personagem pronto" sorteia, para combinar com as sementes; vazio = todas */
  prontoAncestralidades?: string[];
};

const POR_SISTEMA: Record<string, SementesSistema> = { dnd5e: DND5E, pf2e: PF2E, pf1e: PF1E, osr: OSR, d100: D100, fate: FATE, pbta: PBTA, vtm5: VTM5 };

export function sementesDe(sistemaId: string): SementesSistema {
  return POR_SISTEMA[sistemaId] ?? DND5E;
}

/** Tom quando a pessoa deixa o campo vazio. */
export const tomPadrao = (sistemaId: string) => sementesDe(sistemaId).tons[0] ?? "sombrio e debochado";

export function nomeSorteado(s: SementesSistema, sortear: ContextoSemente["sortear"]): string {
  return `${sortear(s.nomes.primeiros)} ${sortear(s.nomes.sobrenomes)}`.trim();
}

export function exemploDoCampo(campo: CampoSemente | undefined, c: Pick<ContextoSemente, "classe" | "ancestralidade">): string | undefined {
  if (!campo?.exemplo) return undefined;
  return typeof campo.exemplo === "function" ? campo.exemplo(c) : campo.exemplo;
}
