import type { AncestralidadeDef, OpcaoSimples } from "../tipos";

// Ancestralidades do Pathfinder 2e (Player Core, Player Core 2 e guias de ancestralidade sob ORC/OGL).
// `ajustes` guarda só os aumentos fixos (+1) e as falhas (−1); os aumentos livres ficam em `livres`.

export type AncestralidadePf2 = AncestralidadeDef & { pv: number; livres: number };

function a(
  id: string,
  nome: string,
  descricao: string,
  pv: number,
  pes: number,
  aumentos: string[],
  falhas: string[],
  livres: number,
  tracos: string[],
): AncestralidadePf2 {
  const ajustes: Record<string, number> = {};
  for (const x of aumentos) ajustes[x] = 1;
  for (const x of falhas) ajustes[x] = (ajustes[x] ?? 0) - 1;
  // pés → metros (5 pés = 1,5 m), no formato brasileiro
  const metros = (pes * 0.3).toFixed(1).replace(".0", "").replace(".", ",");
  return { id, nome, descricao, pv, deslocamento: `${metros} m`, ajustes, livres, tracos };
}

export const ANCESTRALIDADES: AncestralidadePf2[] = [
  // Player Core
  a("anao", "Anão", "Teimoso como a montanha que o pariu e tão simpático quanto ela.", 10, 20, ["con", "sab"], ["car"], 1, ["visão no escuro", "presas de clã", "humanoide"]),
  a("elfo", "Elfo", "Vive séculos e faz questão de lembrar você disso a cada frase.", 6, 30, ["des", "int"], ["con"], 1, ["visão na penumbra", "longevo", "humanoide"]),
  a("gnomo", "Gnomo", "Curiosidade infinita, noção de perigo nenhuma e um pé no mundo das fadas.", 8, 25, ["con", "car"], ["for"], 1, ["visão na penumbra", "pequeno", "humanoide"]),
  a("goblin", "Goblin", "Ama fogo, canções sobre fogo e, ocasionalmente, os amigos.", 6, 25, ["des", "car"], ["sab"], 1, ["visão no escuro", "pequeno", "humanoide"]),
  a("halfling", "Halfling", "Pequeno, sortudo e sempre perguntando a que horas sai o segundo café.", 6, 25, ["des", "sab"], ["for"], 1, ["olhos aguçados", "pequeno", "humanoide"]),
  a("humano", "Humano", "Versátil, ambicioso e incapaz de ficar quieto por uma geração inteira.", 8, 25, [], [], 2, ["talento geral extra (herança versátil)", "humanoide"]),
  a("leshy", "Leshy", "Um espírito da natureza num corpo de planta, com opinião forte sobre jardinagem.", 8, 25, ["con", "sab"], ["int"], 1, ["visão na penumbra", "planta", "pequeno"]),
  a("orc", "Orc", "Força, cicatrizes contadas com orgulho e uma recusa obstinada em cair.", 10, 25, [], [], 2, ["visão no escuro", "humanoide"]),
  // Player Core 2
  a("amurrun", "Amurrun (Felinídeo)", "Curioso, ágil e convicto de que cai sempre de pé — e geralmente cai.", 8, 25, ["des", "car"], ["sab"], 1, ["visão na penumbra", "aterrissagem felina", "humanoide"]),
  a("hobgoblin", "Hobgoblin", "Disciplinado, organizado e assustadoramente bom em formar filas.", 8, 25, ["con", "int"], ["sab"], 1, ["visão no escuro", "humanoide"]),
  a("kholo", "Kholo (Gnoll)", "Ri alto, morde forte e trata a carniça como herança de família.", 8, 25, ["for", "int"], ["sab"], 1, ["visão na penumbra", "mordida", "humanoide"]),
  a("kobold", "Kobold", "Pequeno, armadilheiro e dono de uma linhagem dracônica que ninguém confirma.", 6, 25, ["des", "car"], ["con"], 1, ["visão no escuro", "pequeno", "humanoide"]),
  a("iruxi", "Iruxi (Homem-lagarto)", "Paciente como um réptil ao sol e igualmente difícil de apressar.", 8, 25, ["for", "sab"], ["int"], 1, ["prender a respiração", "cauda", "humanoide"]),
  a("ysoki", "Ysoki (Ratfolk)", "Bochechas cheias de quinquilharias e um plano de fuga para cada sala.", 6, 25, ["des", "int"], ["for"], 1, ["visão na penumbra", "bolsas de bochecha", "pequeno"]),
  a("tengu", "Tengu", "Pássaro de bico afiado e língua mais afiada ainda, colecionador de lâminas.", 6, 25, ["des"], [], 1, ["visão na penumbra", "bico", "humanoide"]),
  a("tripkee", "Tripkee (Grippli)", "Sapinho escalador que pula mais alto que a própria autoestima.", 6, 25, ["des", "sab"], ["for"], 1, ["visão na penumbra", "escalada", "pequeno"]),
  // Guias de ancestralidade e outros livros
  a("azarketi", "Azarketi", "Nadador elegante que acha que todo problema se resolve indo para o mar.", 8, 20, ["con", "car"], ["sab"], 1, ["visão na penumbra", "anfíbio", "natação 9 m"]),
  a("fetchling", "Fetchling", "Meio sombra, meio gente, e inteiramente desconfiado da luz do sol.", 8, 25, ["des"], [], 1, ["visão no escuro", "humanoide"]),
  a("kitsune", "Kitsune", "Raposa que vira gente, ou gente que vira raposa; depende do humor.", 8, 25, ["car"], [], 1, ["visão na penumbra", "mudar de forma", "humanoide"]),
  a("nagaji", "Nagaji", "Serpentino, solene e famoso por encarar os outros até eles desistirem.", 10, 25, ["for", "sab"], ["int"], 1, ["visão na penumbra", "humanoide"]),
  a("vanara", "Vanara", "Ágil, travesso e com uma cauda que faz metade do trabalho.", 6, 25, ["des", "sab"], ["car"], 1, ["visão na penumbra", "cauda preênsil", "humanoide"]),
  a("fleshwarp", "Deformado (Fleshwarp)", "Nasceu de um experimento que deu errado e virou alguém que dá muito certo.", 10, 25, ["con"], [], 1, ["visão na penumbra", "humanoide"]),
  a("automaton", "Autômato", "Uma alma presa num corpo de engrenagens, com manual de instruções perdido.", 8, 25, ["con"], [], 1, ["construto", "visão no escuro", "imune a doenças"]),
  a("conrasu", "Conrasu", "Madeira viva em volta de uma consciência cósmica com prazos muito longos.", 10, 20, ["con", "sab"], ["car"], 1, ["visão na penumbra", "planta"]),
  a("ghoran", "Ghoran", "Uma flor que aprendeu a andar e tem medo de quem gosta de salada.", 10, 25, ["con", "car"], [], 1, ["planta", "renascimento"]),
  a("poppet", "Boneco (Poppet)", "Um boneco costurado que ganhou vida e um senso de humor de pano.", 6, 25, ["con", "car"], [], 1, ["construto", "pequeno"]),
  a("sprite", "Fadinha (Sprite)", "Do tamanho de uma caneca e com o temperamento de um barril de pólvora.", 6, 20, ["des", "int"], ["for"], 1, ["visão na penumbra", "minúsculo", "fada"]),
  a("strix", "Strix", "Asas negras, pouca paciência e uma rixa ancestral com metade do mundo.", 8, 25, ["des"], [], 1, ["visão na penumbra", "asas", "humanoide"]),
  a("android", "Androide", "Corpo sintético, coração confuso e dificuldade crônica com sarcasmo.", 8, 25, ["des", "int"], ["car"], 1, ["visão na penumbra", "construto", "humanoide"]),
  a("shisk", "Shisk", "Guardião de segredos coberto de espinhos que cobra caro por cada um.", 8, 25, ["int", "sab"], ["for"], 1, ["visão no escuro", "humanoide"]),
  a("vishkanya", "Vishkanya", "Bonita, discreta e com veneno de verdade correndo nas veias.", 6, 25, ["des"], [], 1, ["visão na penumbra", "veneno", "humanoide"]),
  a("athamaru", "Athamaru", "Povo-peixe de cardume que fala por feromônios e fofoca por bolhas.", 8, 25, ["con", "sab"], ["int"], 1, ["anfíbio", "natação", "humanoide"]),
  a("centauro", "Centauro", "Metade cavalo, metade gente, inteiramente impaciente com escadas.", 8, 30, ["for", "sab"], ["int"], 1, ["grande", "humanoide", "besta"]),
  a("minotauro", "Minotauro", "Chifres, músculos e um senso de direção excelente em labirintos.", 10, 25, ["for", "con"], ["car"], 1, ["grande", "visão no escuro", "chifres"]),
  a("anadi", "Anadi", "Aranha que vira gente para tecer, e gente que vira aranha para morder.", 8, 25, ["des", "sab"], ["con"], 1, ["mudar de forma", "veneno", "humanoide"]),
  a("goloma", "Goloma", "Olhos por todo lado e desconfiança proporcional ao número de olhos.", 6, 25, ["int", "sab"], ["car"], 1, ["visão no escuro", "olhos múltiplos", "humanoide"]),
  a("shoony", "Shoony", "Pequeno, fiel e animado como um cachorro que achou um graveto.", 8, 25, ["des", "car"], ["sab"], 1, ["visão na penumbra", "pequeno", "humanoide"]),
  a("esqueleto", "Esqueleto", "Morreu, mas ainda tinha compromissos. Ossos à mostra, opiniões também.", 6, 25, ["for"], ["int"], 1, ["visão no escuro", "morto-vivo", "cura com vazio"]),
  a("kashrishi", "Kashrishi", "Telepata de chifre cristalino que ouve até o que você não pensou alto.", 8, 25, ["for", "int"], ["car"], 1, ["visão no escuro", "telepatia", "humanoide"]),
  a("samsaran", "Samsarano", "Já viveu muitas vidas e ainda não aprendeu a fazer amigos nesta.", 6, 25, ["con", "int"], ["sab"], 1, ["visão na penumbra", "humanoide"]),
  a("sarangay", "Sarangay", "Chifres de touro, joia na cabeça e pavio curtíssimo para ladrões.", 10, 25, ["for", "con"], [], 1, ["visão na penumbra", "chifres", "humanoide"]),
  a("tanuki", "Tanuki", "Brincalhão que muda de forma e transforma folhas em moedas por diversão.", 8, 25, ["con", "car"], ["sab"], 1, ["visão na penumbra", "mudar de forma", "humanoide"]),
  a("yaksha", "Yaksha", "Guardião espiritual com dívidas cármicas e muita vontade de pagá-las batendo.", 10, 25, ["for", "sab"], [], 1, ["visão no escuro", "espírito"]),
  a("yaoguai", "Yaoguai", "Um objeto ou bicho que acordou com alma e agora quer reconhecimento.", 8, 25, [], [], 2, ["mudar de forma", "humanoide"]),
  a("wayang", "Wayang", "Criatura das sombras que adora rituais, máscaras e luz difusa.", 6, 25, ["des", "car"], ["con"], 1, ["visão no escuro", "pequeno"]),
  a("surki", "Surki", "Um inseto que muda de casca e de humor a cada temporada.", 8, 25, ["con", "int"], ["car"], 1, ["visão no escuro", "humanoide"]),
  a("sereiano", "Sereiano", "Cauda de peixe, voz bonita e zero vontade de subir escada.", 8, 5, ["des", "car"], [], 1, ["natação 9 m", "anfíbio", "humanoide"]),
  a("animal-desperto", "Animal Desperto", "Um bicho que acordou falando e não pretende calar a boca nunca mais.", 8, 25, [], [], 2, ["besta", "sentidos aguçados"]),
];

/** Heranças por ancestralidade (o prefixo do id é a ancestralidade). */
export type HerancaPf2 = OpcaoSimples & { ancestralidade: string; pv?: number };

function h(ancestralidade: string, sufixo: string, nome: string, descricao: string, pv?: number): HerancaPf2 {
  return { id: `${ancestralidade}-${sufixo}`, ancestralidade, nome, descricao, pv };
}

export const HERANCAS: HerancaPf2[] = [
  h("anao", "rocha", "Anão da Rocha", "Difícil de empurrar, derrubar ou convencer."),
  h("anao", "forja", "Anão da Forja", "Resiste a fogo e calor; dorme ao lado da fornalha."),
  h("anao", "antigo", "Anão de Sangue Antigo", "Resistência mágica herdada de ancestrais desconfiados."),
  h("anao", "muralha", "Anão Muralha", "Robusto acima do normal: +2 PV de ancestralidade.", 2),
  h("elfo", "artico", "Elfo Ártico", "Resiste ao frio e acha o inverno aconchegante."),
  h("elfo", "caverna", "Elfo das Cavernas", "Visão no escuro em vez de na penumbra."),
  h("elfo", "sabio", "Elfo Sábio", "Truque arcano e muita citação de livro."),
  h("elfo", "bosques", "Elfo dos Bosques", "Escala árvores como quem sobe escada."),
  h("gnomo", "sensorial", "Gnomo Sensorial", "Fareja e ouve o que ninguém mais percebe."),
  h("gnomo", "feerico", "Gnomo Tocado pelas Fadas", "Um truque primal e um brilho estranho no olhar."),
  h("gnomo", "umbral", "Gnomo Umbral", "Visão no escuro e um gosto suspeito por porões."),
  h("goblin", "pele-couro", "Goblin Pele-de-Couro", "Resiste a fogo, o que explica muita coisa."),
  h("goblin", "estomago", "Goblin Estômago-de-Ferro", "Come qualquer coisa e ganha bônus contra venenos."),
  h("goblin", "orelha", "Goblin Orelha-Afiada", "Ouve tudo, inclusive o que preferia não ouvir."),
  h("halfling", "sorte", "Halfling Sortudo", "Uma rerrolagem de sorte por dia."),
  h("halfling", "pes-leves", "Halfling Pés-Leves", "Some atrás de criaturas maiores sem esforço."),
  h("halfling", "guardiao", "Halfling Guardião", "Bônus para ajudar e proteger os amigos."),
  h("humano", "versatil", "Humano Versátil", "Um talento geral extra no 1º nível."),
  h("humano", "habilidoso", "Humano Habilidoso", "Treina uma perícia extra que vira especialista no 5º nível."),
  h("leshy", "fungo", "Leshy Fungo", "Visão no escuro e cheiro de porão."),
  h("leshy", "cacto", "Leshy Cacto", "Espinhos que ferem quem agarra."),
  h("leshy", "videira", "Leshy Videira", "Escala com as próprias gavinhas."),
  h("orc", "badlands", "Orc das Terras Áridas", "Corre longe e aguenta o calor do deserto."),
  h("orc", "grave", "Orc Marcado pela Morte", "Resiste a efeitos de vazio e mortos-vivos."),
  h("orc", "invicto", "Orc Invicto", "Mais PV e teimosia: +2 PV de ancestralidade.", 2),
  h("amurrun", "nevasca", "Felinídeo das Neves", "Pelagem grossa contra o frio."),
  h("amurrun", "garras", "Felinídeo de Garras Afiadas", "Garras naturais d6."),
  h("kobold", "draconico", "Kobold Escamado", "Escamas cromáticas e um sopro pequeno."),
  h("kobold", "tuneleiro", "Kobold Tuneleiro", "Escava e se espreme por qualquer buraco."),
  h("iruxi", "pantano", "Iruxi do Pântano", "Nada bem e prende a respiração por muito tempo."),
  h("iruxi", "areia", "Iruxi das Areias", "Camuflagem em terreno árido."),
  h("tengu", "tempestade", "Tengu da Tempestade", "Resiste a eletricidade e voa com o vento."),
  h("tengu", "dragonete", "Tengu Dragonete", "Plumagem colorida e um toque elemental."),
  h("ysoki", "deserto", "Ysoki do Deserto", "Resiste ao calor e passa dias sem água."),
  h("ysoki", "esgoto", "Ysoki dos Esgotos", "Imune a cheiros que matariam um anão."),
  h("kitsune", "celestial", "Kitsune Celestial", "Fogo-fátuo divino e ar de nobreza."),
  h("kitsune", "fogo-raposa", "Kitsune do Fogo-de-Raposa", "Fogo de raposa como ataque."),
  h("automaton", "guerra", "Autômato de Guerra", "Construído para combate; +2 PV.", 2),
  h("automaton", "sentinela", "Autômato Sentinela", "Pele blindada: +1 de circunstância em CA contra o primeiro ataque."),
  h("sprite", "pixie", "Pixie", "Luz própria e travessuras mágicas."),
  h("sprite", "grig", "Grig", "Pula longe e toca música sem instrumento."),
];

/** Heranças versáteis: podem ser combinadas com qualquer ancestralidade. */
export const HERANCAS_VERSATEIS: OpcaoSimples[] = [
  { id: "nefilim", nome: "Nefilim", descricao: "Sangue de algum plano exterior — celestial ou ínfero — e olhos que denunciam." },
  { id: "aiuvarin", nome: "Aiuvarin (meio-elfo)", descricao: "Metade élfico, metade outra coisa, integralmente incompreendido." },
  { id: "dromaar", nome: "Dromaar (meio-orc)", descricao: "Herança orc que aparece nas presas e na teimosia." },
  { id: "dhampir", nome: "Dhampir", descricao: "Filho de vampiro, cura com vazio e evita espelhos por educação." },
  { id: "changeling", nome: "Changeling", descricao: "Filho de bruxa, com olhos de cores diferentes e sonhos estranhos." },
  { id: "duskwalker", nome: "Andarilho do Crepúsculo", descricao: "Renascido por psicopompos para caçar mortos-vivos teimosos." },
  { id: "sangue-de-dragao", nome: "Sangue-de-dragão", descricao: "Algum dragão na família, e o orgulho veio junto com as escamas." },
  { id: "beastkin", nome: "Bestial (Beastkin)", descricao: "Muda entre a forma humana e um traço de bicho." },
  { id: "reflexo", nome: "Reflexo", descricao: "Uma cópia mágica que ganhou vida própria e crise existencial." },
  { id: "talos", nome: "Talos (metal)", descricao: "Sangue elemental de metal: pele que brilha e resiste." },
  { id: "ardande", nome: "Ardande (madeira)", descricao: "Sangue elemental de madeira: cabelo de folhas, paciência de árvore." },
  { id: "naari", nome: "Naari (fogo)", descricao: "Sangue elemental de fogo: pavio curto, literalmente." },
  { id: "oread", nome: "Oreade (terra)", descricao: "Sangue elemental de terra: firme, lento e confiável." },
  { id: "silfide", nome: "Sílfide (ar)", descricao: "Sangue elemental de ar: inquieto e sempre de cabelo despenteado." },
  { id: "ondina", nome: "Ondina (água)", descricao: "Sangue elemental de água: calmo até virar tempestade." },
  { id: "hungerseed", nome: "Semente-da-Fome", descricao: "Sangue de oni: chifres, apetite e um temperamento difícil." },
  { id: "mirage", nome: "Miragem", descricao: "Ligado a ilusões; às vezes nem ele sabe se está ali." },
];
