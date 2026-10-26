// Tema visual de cada sistema de regras. As cores, a fonte dos títulos e a textura moram no globals.css, em blocos
// [data-tema="<id>"] que sobrescrevem os tokens (--background, --ambar, --font-titulo...): qualquer elemento com o atributo
// muda tudo o que está dentro dele. Aqui só fica o nome do tema e os enfeites. Sem nada de servidor: serve para client e server.

export type IdTema = "padrao" | "dnd5e" | "pf2e" | "pf1e" | "osr" | "d100" | "fate" | "pbta" | "vtm5";

export type Tema = {
  id: IdTema;
  /** nome do clima, para títulos e dicas */
  nome: string;
  /** enfeite do tema (o mesmo do --ornamento no CSS), para divisores e cabeçalhos */
  ornamento: string;
  /** frase do divisor de abertura de cena (o "✦ A aventura começa ✦") */
  divisor: string;
};

const TEMAS: Record<IdTema, Tema> = {
  padrao: { id: "padrao", nome: "Taverna à luz de vela", ornamento: "✦", divisor: "A aventura começa" },
  dnd5e: { id: "dnd5e", nome: "Fantasia heroica", ornamento: "⚜", divisor: "Rolem a iniciativa" },
  pf2e: { id: "pf2e", nome: "Lápis e ouro", ornamento: "❖", divisor: "Três ações, nenhuma desculpa" },
  pf1e: { id: "pf1e", nome: "Tomo de bronze", ornamento: "❧", divisor: "Abre-se o tomo" },
  osr: { id: "osr", nome: "Masmorra em papel azul", ornamento: "⚔", divisor: "Desçam a escada" },
  d100: { id: "d100", nome: "Dossiê de 1920", ornamento: "⁂", divisor: "Arquivo confidencial" },
  fate: { id: "fate", nome: "Aventura pulp", ornamento: "★", divisor: "Próximo capítulo" },
  pbta: { id: "pbta", nome: "Floresta artesanal", ornamento: "❦", divisor: "Façam um movimento" },
  vtm5: { id: "vtm5", nome: "Noite predatória", ornamento: "†", divisor: "A noite começa" },
};

/** Id do tema de um sistema. O modo história e sistemas sem tema próprio ficam com a taverna. */
export function temaDoSistema(sistemaId: string | null | undefined): IdTema {
  return sistemaId && sistemaId in TEMAS ? (sistemaId as IdTema) : "padrao";
}

/** Metadados do tema de um sistema (nome, enfeite, frase do divisor). */
export function dadosDoTema(sistemaId: string | null | undefined): Tema {
  return TEMAS[temaDoSistema(sistemaId)];
}
