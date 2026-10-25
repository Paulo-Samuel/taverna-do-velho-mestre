import "server-only";
import { d, somar } from "../dados";
import type { Ficha, GrauSucesso, PedidoTeste, ResultadoTeste, Sistema, SistemaPublico } from "./tipos";

// Utilitários compartilhados pelos sistemas. Não guardam estado.

export function sinal(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function limitar(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Modificador de atributo no estilo d20 (10-11 = +0). */
export function modD20(valor: number): number {
  return Math.floor((valor - 10) / 2);
}

/** Compara nomes ignorando acentos, maiúsculas e espaços extras. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Acha um item por id ou nome (tolerante a acento/caixa). */
export function acharPorNome<T extends { id: string; nome: string }>(lista: T[], busca: string): T | undefined {
  const alvo = normalizar(busca);
  return lista.find((x) => normalizar(x.id) === alvo || normalizar(x.nome) === alvo) ?? lista.find((x) => alvo.includes(normalizar(x.nome)));
}

/** 4d6 descartando o menor, seis vezes, na ordem dos atributos. */
export function rolar4d6(ids: string[]): Record<string, number> {
  return Object.fromEntries(
    ids.map((id) => {
      const { valores } = somar(4, 6);
      const total = valores.sort((a, b) => a - b).slice(1).reduce((a, b) => a + b, 0);
      return [id, total];
    }),
  );
}

/** 3d6 em ordem (estilo old-school). */
export function rolar3d6(ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, somar(3, 6).total]));
}

/** Distribui uma matriz de valores seguindo uma ordem de prioridade de atributos. */
export function distribuir(matriz: number[], ordem: string[]): Record<string, number> {
  return Object.fromEntries(ordem.map((id, i) => [id, matriz[i] ?? matriz[matriz.length - 1]]));
}

/** Campos comuns de uma ficha nova. */
export function fichaBase(sistema: string, nome: string): Ficha {
  return {
    sistema,
    nome,
    ancestralidade: "",
    classe: "",
    nivel: 1,
    xp: 0,
    atributos: {},
    pericias: {},
    pv: 1,
    pvMax: 1,
    defesa: 10,
    recursos: {},
    inventario: [],
    dinheiro: 0,
    condicoes: [],
    historia: "",
    extras: {},
  };
}

type OpcoesD20 = {
  sistema: string;
  ficha: Ficha;
  pedido: PedidoTeste;
  rotulo: string;
  bonus: number;
  /**
   * "dnd": 20 natural sempre acerta, 1 natural sempre falha (crítico).
   * "pf2": graus de sucesso (±10 da CD) e o 20/1 natural sobem/descem um grau.
   * "simples": só compara com a CD; 20/1 natural são destacados mas não mudam o resultado.
   */
  criticos: "dnd" | "pf2" | "simples";
  detalhes?: string;
};

const ROTULOS_GRAU: Record<GrauSucesso, string> = {
  sucesso_critico: "Sucesso crítico!",
  sucesso: "Sucesso",
  parcial: "Sucesso parcial",
  falha: "Falha",
  falha_critica: "Falha crítica!",
};

/** Teste de d20 + bônus contra CD, com vantagem/desvantagem e regras de crítico configuráveis. */
export function testeD20({ sistema, ficha, pedido, rotulo, bonus, criticos, detalhes }: OpcoesD20): ResultadoTeste {
  const modo = pedido.modo ?? "normal";
  const dados = modo === "normal" ? [d(20)] : [d(20), d(20)];
  const natural = modo === "vantagem" ? Math.max(...dados) : modo === "desvantagem" ? Math.min(...dados) : dados[0];
  const bonusTotal = bonus + (pedido.modificador ?? 0);
  const total = natural + bonusTotal;
  const alvo = pedido.alvo ?? null;

  let grau: GrauSucesso;
  if (alvo === null) {
    grau = natural === 20 ? "sucesso_critico" : natural === 1 ? "falha_critica" : "sucesso";
  } else if (criticos === "pf2") {
    const ordem: GrauSucesso[] = ["falha_critica", "falha", "sucesso", "sucesso_critico"];
    let i = total >= alvo + 10 ? 3 : total >= alvo ? 2 : total <= alvo - 10 ? 0 : 1;
    if (natural === 20) i = Math.min(3, i + 1);
    if (natural === 1) i = Math.max(0, i - 1);
    grau = ordem[i];
  } else if (criticos === "dnd") {
    grau = natural === 20 ? "sucesso_critico" : natural === 1 ? "falha_critica" : total >= alvo ? "sucesso" : "falha";
  } else {
    grau = total >= alvo ? "sucesso" : "falha";
  }

  const sucesso = grau === "sucesso" || grau === "sucesso_critico";
  const partesDetalhe = [modo !== "normal" ? `${modo}: ${dados.join(" e ")}` : "", detalhes ?? ""].filter(Boolean);
  return {
    tipo: "teste",
    sistema,
    personagem: ficha.nome,
    motivo: pedido.motivo,
    teste: rotulo,
    expressao: `${modo === "normal" ? "1d20" : modo === "vantagem" ? "2d20kh1" : "2d20kl1"}${bonusTotal ? sinal(bonusTotal) : ""}`,
    dados,
    natural,
    bonus: bonusTotal,
    total,
    alvo,
    grau,
    sucesso,
    rotuloGrau: ROTULOS_GRAU[grau],
    detalhes: partesDetalhe.join(" · ") || undefined,
    margem: alvo === null ? null : total - alvo,
  };
}

export function rotuloGrauPadrao(grau: GrauSucesso): string {
  return ROTULOS_GRAU[grau];
}

/** Clona a ficha (para subirNivel/descansar não mutarem o original). */
export function clonar(ficha: Ficha): Ficha {
  return structuredClone(ficha);
}

/** Versão só-dados do sistema para mandar ao cliente. */
export function publico(s: Sistema): SistemaPublico {
  return {
    id: s.id,
    nome: s.nome,
    nomeCurto: s.nomeCurto,
    descricao: s.descricao,
    licenca: s.licenca,
    dadoPrincipal: s.dadoPrincipal,
    pronto: s.pronto,
    rotulos: s.rotulos,
    atributos: s.atributos,
    pericias: s.pericias,
    classes: s.classes,
    ancestralidades: s.ancestralidades,
    antecedentes: s.antecedentes,
    opcoesCriacao: s.opcoesCriacao,
    metodosAtributos: s.metodosAtributos,
    limitesAtributos: s.limitesAtributos,
    periciasEscolhiveis: s.periciasEscolhiveis,
    nivelMaximo: s.nivelMaximo,
    testesSugeridos: s.testesSugeridos,
    regrasParaMestre: s.regrasParaMestre,
  };
}

/**
 * Sistema-placeholder para arquivos ainda não implementados. Aparece na lista como "em construção".
 * Cada agente de sistema substitui o próprio arquivo por uma implementação completa.
 */
export function sistemaEmConstrucao(id: string, nome: string, descricao: string, dadoPrincipal: string, licenca: string): Sistema {
  const erro = () => {
    throw new Error(`O sistema ${nome} ainda está em construção.`);
  };
  return {
    id,
    nome,
    nomeCurto: nome,
    descricao,
    licenca,
    dadoPrincipal,
    pronto: false,
    rotulos: { ancestralidade: "Ancestralidade", classe: "Classe", nivel: "Nível", defesa: "Defesa", dinheiro: "Moedas", pv: "PV" },
    atributos: [],
    pericias: [],
    classes: [],
    ancestralidades: [],
    metodosAtributos: [],
    limitesAtributos: { min: 1, max: 20 },
    nivelMaximo: 20,
    testesSugeridos: [],
    regrasParaMestre: "",
    atributosIniciais: () => ({}),
    criarFicha: erro,
    resolverTeste: erro,
    descreverParaMestre: () => "",
    blocosFicha: () => [],
    xpParaNivel: () => null,
    subirNivel: erro,
    descansar: erro,
  };
}
