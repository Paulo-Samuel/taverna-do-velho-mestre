import "server-only";
import type { AncestralidadeDef } from "../tipos";

// "Ancestralidade" no Fate da taverna é o gênero do cenário: não muda números, muda o tom,
// a tecnologia disponível e os aspectos que fazem sentido. `itens` vão para o inventário inicial.

export type Genero = AncestralidadeDef & { itens: string[] };

export const GENEROS: Genero[] = [
  {
    id: "fantasia", nome: "Fantasia", descricao: "Espadas, dragões e tavernas com higiene questionável.",
    tracos: ["Tecnologia: aço, velas e magia", "Tom: épico com lama nas botas", "Aspecto de cenário: Ruínas de um Império Esquecido"],
    itens: ["mochila de couro", "pederneira", "ração de viagem"],
  },
  {
    id: "ficcao_cientifica", nome: "Ficção Científica", descricao: "Naves, alienígenas e computadores que discordam de você.",
    tracos: ["Tecnologia: viagem estelar, IA e lasers", "Tom: maravilha e paranoia em gravidade zero", "Aspecto de cenário: A Fronteira Está Sem Lei"],
    itens: ["comunicador de pulso", "traje de vácuo dobrável"],
  },
  {
    id: "pulp", nome: "Pulp", descricao: "Socos, zepelins e vilões que explicam o plano antes de executá-lo.",
    tracos: ["Tecnologia: anos 1930 com ciência estranha", "Tom: ação desenfreada e coragem barata", "Aspecto de cenário: O Culto Quer o Artefato Primeiro"],
    itens: ["revista de aventuras amassada", "lanterna", "mapa com um X"],
  },
  {
    id: "cyberpunk", nome: "Cyberpunk", descricao: "Neon, chuva ácida e corporações que são donas do seu rim.",
    tracos: ["Tecnologia: implantes, redes e drones", "Tom: alta tecnologia, vida barata", "Aspecto de cenário: A Megacorp Vê Tudo"],
    itens: ["celular descartável", "créditos em chip anônimo"],
  },
  {
    id: "super_herois", nome: "Super-heróis", descricao: "Capas, poderes e uma conta absurda de reconstrução da cidade.",
    tracos: ["Tecnologia: o que a trama precisar", "Tom: grandioso, colorido e melodramático", "Aspecto de cenário: A Cidade Precisa de Heróis"],
    itens: ["comunicador da equipe", "uniforme de reserva"],
  },
  {
    id: "noir", nome: "Noir", descricao: "Chuva, cigarro e um cliente que com certeza está mentindo.",
    tracos: ["Tecnologia: anos 1940, telefones de disco", "Tom: cínico, sombrio e moralmente cinzento", "Aspecto de cenário: Todo Mundo Tem um Preço"],
    itens: ["chapéu de feltro", "maço de cigarros", "cartão de visita amarelado"],
  },
  {
    id: "horror", nome: "Horror", descricao: "Algo está no porão, e claro que vocês vão descer até lá.",
    tracos: ["Tecnologia: a lanterna sempre falha", "Tom: tensão, mistério e gritos abafados", "Aspecto de cenário: Algo Antigo Despertou"],
    itens: ["lanterna com pilhas fracas", "crucifixo ou amuleto", "caderno de anotações"],
  },
  {
    id: "faroeste", nome: "Faroeste", descricao: "Poeira, duelos ao meio-dia e um saloon com portas que rangem.",
    tracos: ["Tecnologia: revólveres, trens e telégrafos", "Tom: honra, cobiça e sol na cara", "Aspecto de cenário: A Ferrovia Está Chegando"],
    itens: ["cantil", "chapéu de aba larga", "cavalo de temperamento difícil"],
  },
  {
    id: "steampunk", nome: "Steampunk", descricao: "Vapor, engrenagens e cartolas com mais função que bom senso.",
    tracos: ["Tecnologia: vapor, autômatos e dirigíveis", "Tom: aventura vitoriana com fuligem", "Aspecto de cenário: O Império Nunca Dorme"],
    itens: ["relógio de bolso", "óculos de latão", "lata de óleo"],
  },
  {
    id: "pos_apocaliptico", nome: "Pós-apocalíptico", descricao: "O mundo acabou e, surpreendentemente, as pessoas pioraram.",
    tracos: ["Tecnologia: sucata e o que sobrou", "Tom: escassez, desconfiança e esperança teimosa", "Aspecto de cenário: Água Vale Mais que Ouro"],
    itens: ["máscara de gás", "garrafa de água filtrada", "tampinhas para escambo"],
  },
  {
    id: "fantasia_urbana", nome: "Fantasia Urbana", descricao: "Fadas no metrô, vampiros no cartório e ninguém percebe nada.",
    tracos: ["Tecnologia: celular e feitiço no mesmo bolso", "Tom: o mundo secreto por trás do cotidiano", "Aspecto de cenário: O Véu Está Rasgando"],
    itens: ["celular rachado", "bilhete de metrô", "sal grosso num saquinho"],
  },
  {
    id: "space_opera", nome: "Space Opera", descricao: "Impérios galácticos, espadas de energia e dramas familiares em escala estelar.",
    tracos: ["Tecnologia: hiperespaço e armas de energia", "Tom: aventura épica entre as estrelas", "Aspecto de cenário: A Rebelião Precisa de Você"],
    itens: ["blaster de bolso", "créditos imperiais"],
  },
  {
    id: "espionagem", nome: "Espionagem", descricao: "Martinis, traições e gadgets que deviam ter passado pelo controle de qualidade.",
    tracos: ["Tecnologia: gadgets de ponta e vigilância", "Tom: intriga internacional e paranoia elegante", "Aspecto de cenário: Ninguém é Quem Parece"],
    itens: ["passaporte falso", "terno bem cortado"],
  },
  {
    id: "mitologico", nome: "Mitológico", descricao: "Heróis, monstros e deuses mesquinhos que adoram uma profecia.",
    tracos: ["Tecnologia: bronze, barcos e favores divinos", "Tom: destino, glória e tragédia anunciada", "Aspecto de cenário: Os Deuses Estão Observando"],
    itens: ["oferenda para os deuses", "sandálias resistentes", "odre de vinho"],
  },
];
