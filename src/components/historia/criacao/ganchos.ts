import { sorte } from "../retrato/dados";

// Ganchos de história por ofício. "{o|a}" vira o gênero certo; para "outro" fica a primeira forma.

const GANCHOS: Record<string, string[]> = {
  guerreiro: [
    "Desertou de um exército que ainda manda cartas cobrando a armadura.",
    "Venceu um torneio que estava arranjado para outra pessoa. A outra pessoa era filha do duque.",
    "Jurou proteger uma caravana. A caravana sumiu; o juramento continua.",
    "Carrega a espada de um mestre que morreu de um jeito muito constrangedor.",
    "Perdeu uma aposta e agora deve um duelo a alguém que nunca perdeu um.",
  ],
  ladino: [
    "Deve dinheiro a um cartel que acabou de mandar uma carta. Com uma orelha dentro.",
    "Roubou um anel de um cadáver. O cadáver quer de volta.",
    "Foi expuls{o|a} da guilda dos ladrões por honestidade excessiva numa terça-feira.",
    "Tem o mapa de um cofre; só falta descobrir em que cidade ele fica.",
    "O rosto del{e|a} está em cartazes de três condados, e em nenhum ficou bonito.",
  ],
  mago: [
    "Foi expuls{o|a} da academia depois que o experimento comeu o reitor. Em parte.",
    "Herdou uma torre, um grimório e as dívidas do tio feiticeiro.",
    "Invocou algo por engano, e agora esse algo lhe segue querendo conversar.",
    "Procura a página arrancada do grimório: justamente a que ensina a desfazer o feitiço.",
    "Trocou o próprio nome verdadeiro por um favor e está começando a se arrepender.",
  ],
  cacador: [
    "Persegue a fera que levou sua aldeia. A fera parece estar perseguindo de volta.",
    "Foi contratad{o|a} para caçar um lobo que fala. O lobo ofereceu mais.",
    "Achou pegadas humanas que terminam no meio da neve, do nada.",
    "Um nobre quer a cabeça de um cervo branco. A floresta não quer entregar.",
    "Vive no mato desde que a cidade lhe acusou de um crime que quase cometeu.",
  ],
  bardo: [
    "Escreveu uma canção sobre o rei. O rei ouviu.",
    "Deve dinheiro em três reinos e uma serenata num quarto.",
    "Ouviu numa taverna o refrão de uma música que só el{e|a} e um morto conheciam.",
    "Fugiu de um casamento. O próprio.",
    "Procura a lendária Harpa de Ossos para tocar no próprio velório, que não pretende ter.",
  ],
  clerigo: [
    "O deus del{e|a} parou de responder. Ontem, respondeu errado.",
    "Foi mandad{o|a} em peregrinação porque o abade não aguentava mais os sermões.",
    "Guarda uma relíquia sagrada que, tecnicamente, é o dedo de um santo ainda vivo.",
    "Teve a visão de um templo afundado e um prazo de trinta dias.",
    "Curou a pessoa errada. Agora a pessoa errada quer agradecer pessoalmente.",
  ],
  barbaro: [
    "Foi {o|a} últim{o|a} a sair do clã que congelou e quer saber quem acendeu o frio.",
    "Desafiou o chefe da tribo, venceu e fugiu antes de virar chefe.",
    "Veio à cidade vender peles e ficou porque descobriu a cerveja.",
    "Um xamã previu que morreria de velhice. Levou para o lado pessoal.",
    "Carrega o machado do pai, que ninguém viu morrer.",
  ],
  necromante: [
    "Fala com os mortos. Um deles não para de reclamar do próprio enterro.",
    "Desenterrou o avô para tirar uma dúvida. A dúvida continua.",
    "Foi expuls{o|a} da vila depois que os mortos do cemitério começaram a votar.",
    "Procura um livro de capa de couro que, dizem, ainda respira.",
    "Fez um pacto que vence na próxima lua cheia e não leu as letras miúdas.",
  ],
  paladino: [
    "Jurou caçar um demônio que jura conhecê-l{o|a} de outra vida.",
    "Quebrou o juramento uma vez, por um bom motivo. A ordem não achou tão bom assim.",
    "Escolta uma criança que talvez seja profeta, talvez seja só mal-educada.",
    "A espada sagrada que carrega começou a dar opiniões.",
    "Busca redenção por uma batalha que os bardos cantam como vitória.",
  ],
  mercenario: [
    "Foi pag{o|a} pelos dois lados da mesma guerra. Os dois descobriram.",
    "Recebeu metade adiantado por um serviço do qual não se lembra.",
    "O último patrão morreu antes de pagar. A viúva quer negociar.",
    "Carrega uma carta selada que não pode abrir nem entregar.",
    "Larga qualquer contrato pela cerveja certa, e o último patrão sabia disso.",
  ],
};

const GERAIS = [
  "Acordou numa estrada sem lembrar da noite anterior, com uma chave no bolso e sangue que não é seu.",
  "Herdou uma taverna falida e o fantasma do antigo dono, que não para de dar palpite.",
  "Uma bruxa previu que salvaria o reino. Ela estava bêbada, mas raramente erra.",
];

function flexionar(texto: string, sexo: string): string {
  return texto.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m: string, f: string) => (sexo === "mulher" ? f : m));
}

/** Três ganchos para o ofício (dois dele e às vezes um geral), mudando a cada rodada. */
export function sortearGanchos(classe: string, sexo: string, semente: string): string[] {
  const s = sorte(`ganchos|${classe}|${semente}`);
  const lista = [...(GANCHOS[classe] ?? [])];
  const escolhidos: string[] = [];
  while (escolhidos.length < 3 && lista.length) {
    escolhidos.push(lista.splice(Math.floor(s.n() * lista.length), 1)[0]);
  }
  if (escolhidos.length < 3 || s.chance(0.35)) escolhidos[Math.min(2, escolhidos.length)] = s.um(GERAIS);
  return escolhidos.map((g) => flexionar(g, sexo));
}
