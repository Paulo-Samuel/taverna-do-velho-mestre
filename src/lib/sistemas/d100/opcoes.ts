import type { OpcaoSimples } from "../tipos";

// Escolhas de criação do horror d100: faixa etária, tom (clássico ou pulp), talentos pulp, fobia e laços pessoais.

export type FaixaEtaria = OpcaoSimples & {
  /** testes de melhoria de EDU na criação */
  melhoriasEdu: number;
  /** pontos tirados de FOR/CON/DES (espalhados) */
  perdaFisica: number;
  perdaApa: number;
  perdaEdu: number;
  perdaMov: number;
  /** Sorte rolada duas vezes, fica a melhor */
  sorteDupla?: boolean;
};

export const FAIXAS_ETARIAS: FaixaEtaria[] = [
  { id: "jovem", nome: "Jovem (15-19)", descricao: "Corre rápido, sabe pouco e tem sorte de principiante.", melhoriasEdu: 0, perdaFisica: 0, perdaApa: 0, perdaEdu: 5, perdaMov: 0, sorteDupla: true },
  { id: "adulto", nome: "Adulto (20-39)", descricao: "O auge: saúde em dia e alguma experiência. Aproveite enquanto dura.", melhoriasEdu: 1, perdaFisica: 0, perdaApa: 0, perdaEdu: 0, perdaMov: 0 },
  { id: "meia", nome: "Meia-idade (40-59)", descricao: "Sabe mais, corre menos e as costas já avisam quando vai chover.", melhoriasEdu: 2, perdaFisica: 10, perdaApa: 5, perdaEdu: 0, perdaMov: 1 },
  { id: "veterano", nome: "Veterano (60-74)", descricao: "Viu de tudo. O corpo também viu e cobra juros.", melhoriasEdu: 3, perdaFisica: 20, perdaApa: 10, perdaEdu: 0, perdaMov: 2 },
  { id: "anciao", nome: "Ancião (75+)", descricao: "Sabedoria imensa, joelhos de papel e nada mais a perder.", melhoriasEdu: 4, perdaFisica: 40, perdaApa: 15, perdaEdu: 0, perdaMov: 3 },
];

export const TONS: OpcaoSimples[] = [
  { id: "classico", nome: "Clássico", descricao: "Investigadores frágeis, horror lento. Correr é uma estratégia válida." },
  { id: "pulp", nome: "Pulp", descricao: "Heróis de revista barata: PV em dobro, talentos especiais e socos em cultistas." },
];

export const TALENTOS_PULP: OpcaoSimples[] = [
  { id: "durao", nome: "Durão", descricao: "+3 PV máximos. Apanha e levanta, por teimosia." },
  { id: "rapido", nome: "Rápido", descricao: "+1 de MOV. Ótimo para fugir, que é o que importa." },
  { id: "peleGrossa", nome: "Pele Grossa", descricao: "+1 de armadura natural. Ou é só a jaqueta." },
  { id: "sortudo", nome: "Sortudo", descricao: "+10 de Sorte inicial. O universo gosta de você, por enquanto." },
  { id: "menteDeAco", nome: "Mente de Aço", descricao: "+10 de Sanidade inicial (respeitando o máximo)." },
  { id: "faro", nome: "Faro para Pistas", descricao: "O mestre pode dar um dado bônus em Encontrar quando a pista for crucial." },
  { id: "maosRapidas", nome: "Mãos Rápidas", descricao: "Saca a arma ou troca de item sem gastar a ação." },
  { id: "sonoLeve", nome: "Sono Leve", descricao: "Nunca é pego dormindo; acorda ao menor ruído." },
  { id: "poliglota", nome: "Poliglota", descricao: "Arranha qualquer língua viva o bastante para pedir ajuda." },
  { id: "atirador", nome: "Atirador", descricao: "Mira com calma: um dado bônus no primeiro tiro após uma rodada mirando." },
];

export const FOBIAS: OpcaoSimples[] = [
  { id: "nenhuma", nome: "Nenhuma (por enquanto)", descricao: "Ainda. A palavra importante é 'ainda'." },
  { id: "nictofobia", nome: "Nictofobia", descricao: "Medo do escuro. Péssimo para quem investiga porões." },
  { id: "claustrofobia", nome: "Claustrofobia", descricao: "Medo de lugares fechados. Túneis, armários, caixões." },
  { id: "aracnofobia", nome: "Aracnofobia", descricao: "Medo de aranhas, e de qualquer coisa com pernas demais." },
  { id: "talassofobia", nome: "Talassofobia", descricao: "Medo do mar profundo e do que ele esconde." },
  { id: "necrofobia", nome: "Necrofobia", descricao: "Medo de cadáveres. Ironia cruel para um investigador." },
  { id: "hemofobia", nome: "Hemofobia", descricao: "Desmaia ao ver sangue. Planeje com cuidado." },
  { id: "acrofobia", nome: "Acrofobia", descricao: "Medo de altura. Torres e penhascos viram pesadelo." },
  { id: "agorafobia", nome: "Agorafobia", descricao: "Medo de espaços abertos e multidões." },
  { id: "ofidiofobia", nome: "Ofidiofobia", descricao: "Medo de serpentes e coisas que rastejam." },
  { id: "ictiofobia", nome: "Ictiofobia", descricao: "Medo de peixes. Certas cidades costeiras serão difíceis." },
  { id: "somnifobia", nome: "Somnifobia", descricao: "Medo de dormir, porque os sonhos andam falando com você." },
  { id: "bibliofobia", nome: "Bibliofobia", descricao: "Medo de livros. Logo os livros, que são onde está a verdade." },
];
