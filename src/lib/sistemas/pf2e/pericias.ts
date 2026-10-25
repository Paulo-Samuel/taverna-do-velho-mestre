import type { AtributoDef, PericiaDef } from "../tipos";

// Atributos (como modificadores, começando em +0) e as 16 perícias do PF2e Remaster.
// Saber fica como texto em ficha.extras.saberes; Percepção vem da classe.

export const ATRIBUTOS: AtributoDef[] = [
  { id: "for", nome: "Força", abrev: "FOR", descricao: "Corpo a corpo, Atletismo, carga." },
  { id: "des", nome: "Destreza", abrev: "DES", descricao: "Ataques à distância e com armas ágeis, CA, Reflexos." },
  { id: "con", nome: "Constituição", abrev: "CON", descricao: "PV por nível e Fortitude." },
  { id: "int", nome: "Inteligência", abrev: "INT", descricao: "Perícias extras, Arcanismo, Saber, magia arcana." },
  { id: "sab", nome: "Sabedoria", abrev: "SAB", descricao: "Percepção, Vontade, magia divina e primal." },
  { id: "car", nome: "Carisma", abrev: "CAR", descricao: "Perícias sociais, magia de bardos e feiticeiros." },
];

export const PERICIAS: (PericiaDef & { atributo: string; aliases: string[] })[] = [
  { id: "acrobatismo", nome: "Acrobatismo", atributo: "des", aliases: ["acrobacia", "acrobatics", "equilibrar", "atravessar", "rolar"], descricao: "Equilibrar, Atravessar Oponente, Escapar com estilo." },
  { id: "arcanismo", nome: "Arcanismo", atributo: "int", aliases: ["arcana", "arcano"], descricao: "Magia arcana, construtos e Recordar Conhecimento." },
  { id: "atletismo", nome: "Atletismo", atributo: "for", aliases: ["athletics", "escalar", "nadar", "saltar", "forcar", "arrombar"], descricao: "Escalar, Nadar, Agarrar, Empurrar, Derrubar, Desarmar." },
  { id: "manufatura", nome: "Manufatura", atributo: "int", aliases: ["crafting", "oficio", "artesanato", "reparar", "consertar"], descricao: "Criar, Reparar e Identificar itens alquímicos." },
  { id: "dissimulacao", nome: "Dissimulação", atributo: "car", aliases: ["deception", "enganacao", "enganar", "mentir", "fintar", "blefar", "disfarce"], descricao: "Mentir, Fintar, Criar Distração, Disfarçar-se." },
  { id: "diplomacia", nome: "Diplomacia", atributo: "car", aliases: ["diplomacy", "persuasao", "persuadir", "convencer", "pedir", "impressionar"], descricao: "Causar Impressão, Pedir, Obter Informação." },
  { id: "intimidacao", nome: "Intimidação", atributo: "car", aliases: ["intimidation", "intimidar", "desmoralizar", "coagir", "ameacar"], descricao: "Desmoralizar e Coagir." },
  { id: "medicina", nome: "Medicina", atributo: "sab", aliases: ["medicine", "tratar ferimentos", "primeiros socorros", "estabilizar", "tratar"], descricao: "Primeiros Socorros, Tratar Ferimentos, Tratar Veneno." },
  { id: "natureza", nome: "Natureza", atributo: "sab", aliases: ["nature", "adestrar", "comandar animal"], descricao: "Animais, plantas, magia primal e Comandar Animal." },
  { id: "ocultismo", nome: "Ocultismo", atributo: "int", aliases: ["occultism", "oculto"], descricao: "Magia oculta, aberrações e o inexplicável." },
  { id: "performance", nome: "Performance", atributo: "car", aliases: ["atuacao", "atuar", "tocar", "cantar", "dancar"], descricao: "Atuar para plateias (e Distrair com estilo)." },
  { id: "religiao", nome: "Religião", atributo: "sab", aliases: ["religion", "religioso"], descricao: "Divindades, magia divina, mortos-vivos e planos." },
  { id: "sociedade", nome: "Sociedade", atributo: "int", aliases: ["society", "historia", "falsificar", "decifrar"], descricao: "História, culturas, nobreza, Decifrar Escrita." },
  { id: "furtividade", nome: "Furtividade", atributo: "des", aliases: ["stealth", "esconder", "esgueirar", "ocultar"], descricao: "Esconder-se, Esgueirar-se, Evitar Ser Notado." },
  { id: "sobrevivencia", nome: "Sobrevivência", atributo: "sab", aliases: ["survival", "rastrear", "orientar", "subsistir", "forragear"], descricao: "Rastrear, Orientar-se, Subsistir na natureza." },
  { id: "ladroagem", nome: "Ladroagem", atributo: "des", aliases: ["thievery", "punga", "bater carteira", "abrir fechadura", "desarmar armadilha", "armadilha", "fechadura", "furtar", "roubar"], descricao: "Bater Carteira, Abrir Fechadura, Desarmar Dispositivo." },
];

export function nomePericia(id: string): string {
  return id === "percepcao" ? "Percepção" : (PERICIAS.find((p) => p.id === id)?.nome ?? id);
}
