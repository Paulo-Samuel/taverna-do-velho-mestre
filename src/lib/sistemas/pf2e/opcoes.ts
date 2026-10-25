import type { OpcaoCriacao, OpcaoSimples } from "../tipos";
import { HERANCAS, HERANCAS_VERSATEIS } from "./ancestralidades";
import type { Tradicao } from "./classes";
import { nomePericia } from "./pericias";

// Antecedentes e escolhas de criação específicas do PF2e (subclasses, heranças, aumentos).

export type AntecedentePf2 = OpcaoSimples & {
  /** o primeiro aumento é escolhido entre estes dois; o segundo é livre */
  atributos: [string, string];
  pericia: string;
  saber: string;
};

function b(id: string, nome: string, descricao: string, atributos: [string, string], pericia: string, saber: string): AntecedentePf2 {
  return { id, nome, descricao: `${descricao} (${atributos.map((x) => x.toUpperCase()).join(" ou ")}; ${nomePericia(pericia)}; ${saber})`, atributos, pericia, saber };
}

export const ANTECEDENTES: AntecedentePf2[] = [
  b("acolito", "Acólito", "Cresceu varrendo o templo e decorando sermões", ["int", "sab"], "religiao", "Saber Escritural"),
  b("acrobata", "Acrobata", "Fugiu do circo, mas o circo nunca saiu dele", ["for", "des"], "acrobatismo", "Saber Circense"),
  b("artista", "Artista", "Pinta, esculpe e reclama que ninguém entende a obra", ["des", "car"], "manufatura", "Saber de Arte"),
  b("artesao", "Artesão", "Faz coisas úteis com as mãos e cobra por isso", ["for", "int"], "manufatura", "Saber de Guilda"),
  b("animador", "Animador", "Vivia do aplauso e das moedas atiradas no chapéu", ["des", "car"], "performance", "Saber Teatral"),
  b("barman", "Taverneiro", "Ouviu todas as histórias tristes do mundo atrás de um balcão", ["con", "car"], "diplomacia", "Saber de Bebidas"),
  b("batedor", "Batedor", "Sempre na frente, sempre vendo primeiro o que vai dar errado", ["des", "sab"], "sobrevivencia", "Saber de Terreno"),
  b("cacador", "Caçador", "Conhece cada pegada da floresta e cada preço de pele", ["des", "sab"], "sobrevivencia", "Saber de Peles"),
  b("cacador-recompensas", "Caçador de Recompensas", "Encontra gente que não quer ser encontrada, por um preço", ["for", "sab"], "sobrevivencia", "Saber Legal"),
  b("charlatao", "Charlatão", "Vendia elixires milagrosos de água com açúcar", ["int", "car"], "dissimulacao", "Saber do Submundo"),
  b("criminoso", "Criminoso", "Tem ficha corrida em três cidades e saudade de duas", ["des", "int"], "ladroagem", "Saber do Submundo"),
  b("cultista", "Ex-Cultista", "Saiu do culto, mas o culto ainda manda cartas", ["int", "car"], "ocultismo", "Saber de Cultos"),
  b("detetive", "Detetive", "Desconfia de todo mundo, especialmente de quem é simpático", ["int", "sab"], "sociedade", "Saber do Submundo"),
  b("domador", "Domador de Animais", "Entende os bichos melhor que as pessoas", ["sab", "car"], "natureza", "Saber de Animais"),
  b("emissario", "Emissário", "Levou mensagens entre cortes e aprendeu a sorrir mentindo", ["int", "car"], "sociedade", "Saber Diplomático"),
  b("eremita", "Eremita", "Passou anos sozinho numa caverna e voltou com ideias estranhas", ["con", "int"], "natureza", "Saber de Cavernas"),
  b("erudito", "Erudito", "Estudou tanto que esqueceu como se faz amizade", ["int", "sab"], "arcanismo", "Saber Acadêmico"),
  b("fazendeiro", "Fazendeiro", "Acorda antes do sol e não teme trabalho pesado", ["con", "sab"], "atletismo", "Saber Agrícola"),
  b("gladiador", "Gladiador", "Lutava para a plateia e ainda espera aplausos depois de cada golpe", ["for", "car"], "performance", "Saber de Gladiadores"),
  b("guarda", "Guarda", "Ficava parado na porta até o dia em que decidiu sair por ela", ["for", "car"], "intimidacao", "Saber Legal"),
  b("herbalista", "Herbalista", "Sabe qual planta cura e qual mata — e não confunde quase nunca", ["con", "sab"], "natureza", "Saber Herbalista"),
  b("marinheiro", "Marinheiro", "Tem um papagaio imaginário e um vocabulário impublicável", ["for", "des"], "atletismo", "Saber Marítimo"),
  b("medico-campo", "Médico de Campo", "Costurou soldados sob chuva de flechas", ["con", "sab"], "medicina", "Saber de Guerra"),
  b("mercador", "Mercador", "Sabe o preço de tudo e o valor de quase nada", ["int", "car"], "diplomacia", "Saber Mercantil"),
  b("mineiro", "Mineiro", "Cresceu no escuro, cavando, e acha o céu aberto exagerado", ["for", "sab"], "sobrevivencia", "Saber de Mineração"),
  b("nobre", "Nobre", "Nasceu com sobrenome e dívidas que ninguém comenta", ["int", "car"], "sociedade", "Saber Genealógico"),
  b("nomade", "Nômade", "Nunca dormiu duas noites no mesmo lugar e se orgulha disso", ["con", "sab"], "sobrevivencia", "Saber de Terreno"),
  b("orfao", "Órfão de Rua", "Aprendeu a sobreviver roubando pão e confiança", ["des", "con"], "ladroagem", "Saber da Cidade"),
  b("peregrino", "Peregrino", "Andou meio mundo atrás de um santuário que talvez nem exista", ["sab", "car"], "religiao", "Saber de Estradas"),
  b("prisioneiro", "Prisioneiro", "Cumpriu pena por um crime que talvez tenha cometido", ["for", "con"], "furtividade", "Saber do Submundo"),
  b("soldado", "Soldado", "Marchou, lutou e voltou com menos amigos do que foi", ["for", "con"], "intimidacao", "Saber de Guerra"),
  b("trabalhador", "Trabalhador", "Carregou peso a vida toda e agora carrega o grupo", ["for", "con"], "atletismo", "Saber de Trabalho"),
  b("aprendiz-alquimia", "Aprendiz de Alquimia", "Explodiu o laboratório do mestre e saiu antes da conta chegar", ["int", "des"], "manufatura", "Saber Alquímico"),
  b("vidente", "Vidente de Feira", "Lia a sorte por moedas e, às vezes, acertava sem querer", ["int", "car"], "ocultismo", "Saber de Cartomancia"),
];

const ATRIBUTOS_OPCOES: OpcaoSimples[] = [
  { id: "for", nome: "Força" },
  { id: "des", nome: "Destreza" },
  { id: "con", nome: "Constituição" },
  { id: "int", nome: "Inteligência" },
  { id: "sab", nome: "Sabedoria" },
  { id: "car", nome: "Carisma" },
];

function lista(itens: [string, string, string?][]): OpcaoSimples[] {
  return itens.map(([id, nome, descricao]) => ({ id, nome, descricao }));
}

/** Tradição mágica definida pela subclasse (feiticeiro, bruxa, invocador). */
export const TRADICAO_POR_SUBCLASSE: Record<string, Tradicao> = {
  // linhagens
  aberrante: "oculta", angelica: "divina", demoniaca: "divina", diabolica: "divina", draconica: "arcana", elemental: "primal",
  feerica: "primal", bruxesca: "oculta", imperial: "arcana", "morta-viva": "divina", genio: "arcana", ninfa: "primal",
  fenix: "primal", psicopompo: "divina", sombra: "oculta",
  // patronos
  "chama-fe": "divina", inscrito: "arcana", ressentimento: "oculta", "silencio-neve": "primal", fiandeira: "oculta",
  "sombra-sem-estrelas": "oculta", "zelador-selvagem": "primal",
  // eidolons
  "e-anjo": "divina", "e-besta": "primal", "e-construto": "arcana", "e-demonio": "divina", "e-dragao": "arcana",
  "e-fada": "primal", "e-planta": "primal", "e-psicopompo": "divina", "e-morto-vivo": "divina", "e-raiva": "oculta",
  "e-devocao": "oculta", "e-elemental": "primal",
};

export const OPCOES_CRIACAO: OpcaoCriacao[] = [
  {
    id: "heranca", rotulo: "Herança", tipo: "escolha",
    ajuda: "Variação dentro da sua ancestralidade. Heranças de outra ancestralidade são ignoradas.",
    // o formulário mostra só as da ancestralidade escolhida
    opcoes: HERANCAS.map((x) => ({ id: x.id, nome: x.nome, descricao: x.descricao, ancestralidades: [x.ancestralidade] })),
    ancestralidades: [...new Set(HERANCAS.map((x) => x.ancestralidade))],
  },
  {
    id: "heranca_versatil", rotulo: "Herança versátil", tipo: "escolha",
    ajuda: "Opcional: substitui a herança comum e combina com qualquer ancestralidade.",
    opcoes: HERANCAS_VERSATEIS,
  },
  {
    id: "aumento_ancestral", rotulo: "Aumentos livres da ancestralidade", tipo: "multipla", max: 2, opcoes: ATRIBUTOS_OPCOES,
    ajuda: "Para onde vão os aumentos livres da ancestralidade (1 ou 2, conforme a ancestralidade). Em branco = segue a prioridade da classe.",
  },
  {
    id: "aumento_antecedente", rotulo: "Aumentos do antecedente", tipo: "multipla", max: 2, opcoes: ATRIBUTOS_OPCOES,
    ajuda: "Um dos dois atributos do antecedente e um livre. Em branco = segue a prioridade da classe.",
  },
  {
    id: "saberes", rotulo: "Saberes extras", tipo: "lista-texto", max: 2,
    ajuda: "Perícias de Saber treinadas além da do antecedente (ex.: Saber de Tavernas, Saber de Dragões).",
  },
  {
    id: "chave", rotulo: "Atributo-chave", tipo: "escolha",
    ajuda: "Algumas classes deixam escolher o atributo-chave (o da classe ganha o aumento de classe).",
    classes: ["guerreiro", "patrulheiro", "campeao", "monge", "magus", "exemplar", "psiquico", "ladino"],
    opcoes: ATRIBUTOS_OPCOES,
  },
  {
    id: "divindade", rotulo: "Divindade", tipo: "texto", classes: ["campeao", "clerigo"],
    ajuda: "Invente uma divindade ou use uma da sua campanha (domínios e arma favorita combinados com o mestre).",
  },
  {
    id: "causa", rotulo: "Causa", tipo: "escolha", classes: ["campeao"], obrigatoria: true,
    opcoes: lista([
      ["grandeza", "Grandeza (sagrada)", "Protege aliados e devolve dano a quem os fere."],
      ["justica", "Justiça (sagrada)", "Pune quem ataca os seus com um golpe retaliatório."],
      ["libertacao", "Libertação (sagrada)", "Liberta aliados presos ou agarrados."],
      ["profanacao", "Profanação (profana)", "Espalha dor e corrompe quem resiste."],
      ["iniquidade", "Iniquidade (profana)", "Castiga quem ousa salvar os outros."],
      ["obediencia", "Obediência (profana)", "Impõe ordem pela força e pelo medo."],
    ]),
  },
  {
    id: "doutrina", rotulo: "Doutrina", tipo: "escolha", classes: ["clerigo"], obrigatoria: true,
    opcoes: lista([
      ["claustro", "Clérigo de Claustro", "Mais magia, domínio extra; armadura é coisa de quem não reza direito."],
      ["guerra", "Sacerdote de Guerra", "Armadura, arma favorita e fé aplicada com força."],
    ]),
  },
  {
    id: "instinto", rotulo: "Instinto", tipo: "escolha", classes: ["barbaro"], obrigatoria: true,
    opcoes: lista([
      ["animal", "Animal", "Fúria com garras ou mordida de um animal totem."],
      ["dragao", "Dragão", "Dano extra do tipo do seu dragão e, depois, sopro."],
      ["furia", "Fúria", "Sem anátema: só raiva pura e mais dano."],
      ["gigante", "Gigante", "Armas enormes e dano extra, com penalidade de desajeitado."],
      ["espirito", "Espírito", "Fúria com dano espiritual que fere fantasmas."],
      ["supersticao", "Superstição", "Odeia magia e resiste a ela com teimosia."],
      ["elemental", "Elemental", "A fúria vira fogo, gelo, raio ou pedra."],
    ]),
  },
  {
    id: "musa", rotulo: "Musa", tipo: "escolha", classes: ["bardo"], obrigatoria: true,
    opcoes: lista([
      ["enigma", "Enigma", "Segredos e conhecimento oculto."],
      ["maestro", "Maestro", "Composições mais fortes e versáteis."],
      ["polimata", "Polímata", "Um pouco de tudo, magia flexível."],
      ["guerreira", "Guerreira", "Bardo de linha de frente, com armas marciais."],
    ]),
  },
  {
    id: "ordem", rotulo: "Ordem druídica", tipo: "escolha", classes: ["druida"], obrigatoria: true,
    opcoes: lista([
      ["animal", "Animal", "Companheiro animal fiel."],
      ["folha", "Folha", "Plantas, cura e um leshy de estimação."],
      ["tempestade", "Tempestade", "Vento, raio e voos curtos."],
      ["indomada", "Indomada", "Forma selvagem e garras."],
      ["chama", "Chama", "Fogo que dança na mão."],
      ["pedra", "Pedra", "Firmeza da terra e proteção de rocha."],
    ]),
  },
  {
    id: "metodologia", rotulo: "Metodologia", tipo: "escolha", classes: ["investigador"], obrigatoria: true,
    opcoes: lista([
      ["alquimica", "Ciências Alquímicas", "Elixires e reagentes para a investigação."],
      ["empirismo", "Empirismo", "Lógica e observação; ganha Aquele Detalhe Óbvio."],
      ["forense", "Medicina Forense", "Autopsia o problema e cura no caminho."],
      ["interrogacao", "Interrogação", "Arranca a verdade com perguntas certeiras."],
    ]),
  },
  {
    id: "misterio", rotulo: "Mistério", tipo: "escolha", classes: ["oraculo"], obrigatoria: true,
    opcoes: lista([
      ["ancestrais", "Ancestrais", "Vozes dos mortos da família, nem sempre de acordo."],
      ["batalha", "Batalha", "Guerra divina e armas sagradas."],
      ["ossos", "Ossos", "Morte, vazio e corpos que obedecem."],
      ["cosmos", "Cosmos", "Estrelas, gravidade e o vazio entre elas."],
      ["chamas", "Chamas", "Fogo divino que queima também o oráculo."],
      ["vida", "Vida", "Cura abundante a um preço pessoal."],
      ["saber", "Saber", "Conhecimento proibido e uma cabeça cheia demais."],
      ["tempestade", "Tempestade", "Vento, chuva e raio."],
    ]),
  },
  {
    id: "vantagem", rotulo: "Vantagem do caçador", tipo: "escolha", classes: ["patrulheiro"], obrigatoria: true,
    opcoes: lista([
      ["rajada", "Rajada", "Penalidade de ataques múltiplos menor contra a presa."],
      ["precisao", "Precisão", "Dano extra no primeiro acerto do turno contra a presa."],
      ["astucia", "Astúcia", "Bônus em Dissimulação, Intimidação, Furtividade e Recordar Conhecimento contra a presa."],
    ]),
  },
  {
    id: "malandragem", rotulo: "Malandragem", tipo: "escolha", classes: ["ladino"], obrigatoria: true,
    opcoes: lista([
      ["ladrao", "Ladrão", "DES no dano com armas ágeis; mestre em Ladroagem."],
      ["rufiao", "Rufião", "Ataque furtivo com armas simples maiores; FOR como chave."],
      ["trapaceiro", "Trapaceiro", "Fintas devastadoras; CAR como chave."],
      ["mente-brilhante", "Mente Brilhante", "Recordar Conhecimento deixa o alvo desprevenido; INT como chave."],
      ["vingador", "Vingador", "Ladino divino que pune os inimigos da fé."],
      ["trapaceiro-mistico", "Trapaceiro Místico", "Mistura truques arcanos com punga."],
    ]),
  },
  {
    id: "linhagem", rotulo: "Linhagem", tipo: "escolha", classes: ["feiticeiro"], obrigatoria: true,
    opcoes: lista([
      ["aberrante", "Aberrante (oculta)", "Algo de fora da realidade na família."],
      ["angelica", "Angélica (divina)", "Um anjo distante, muito distante."],
      ["demoniaca", "Demoníaca (divina)", "Paixões caóticas e chifrinhos discretos."],
      ["diabolica", "Diabólica (divina)", "Contratos infernais no sangue, letras miúdas na alma."],
      ["draconica", "Dracônica (arcana)", "Escamas, orgulho e um dragão ancestral."],
      ["elemental", "Elemental (primal)", "Ar, terra, fogo, metal, água ou madeira."],
      ["feerica", "Feérica (primal)", "Fadas na árvore genealógica e ilusões no bolso."],
      ["bruxesca", "Bruxesca (oculta)", "Uma bruxa ancestral, maldições de herança."],
      ["imperial", "Imperial (arcana)", "Magos antigos e sangue azul arcano."],
      ["morta-viva", "Morta-viva (divina)", "A morte tocou a família e não foi embora."],
      ["genio", "Gênio (arcana)", "Desejos, areia e promessas perigosas."],
      ["ninfa", "Ninfa (primal)", "Beleza natural e encantos da floresta."],
      ["fenix", "Fênix (primal)", "Fogo que renasce das cinzas."],
      ["psicopompo", "Psicopompo (divina)", "Guias das almas e muita burocracia pós-morte."],
      ["sombra", "Sombra (oculta)", "Um pé no Plano das Sombras."],
    ]),
  },
  {
    id: "estilo", rotulo: "Estilo de espadachim", tipo: "escolha", classes: ["espadachim"], obrigatoria: true,
    opcoes: lista([
      ["bravateiro", "Bravateiro", "Panache por Desmoralizar; Intimidação treinada."],
      ["esgrimista", "Esgrimista", "Panache por Fintar; Dissimulação treinada."],
      ["ginasta", "Ginasta", "Panache por agarrar, empurrar ou derrubar; Atletismo."],
      ["galhofeiro", "Galhofeiro", "Panache por Criar Distração com piadas; Performance."],
      ["patife", "Patife", "Panache por truques sujos; Ladroagem."],
      ["dancarino", "Dançarino de Batalha", "Panache por Performance no meio da luta."],
    ]),
  },
  {
    id: "patrono", rotulo: "Patrono", tipo: "escolha", classes: ["bruxa"], obrigatoria: true,
    opcoes: lista([
      ["chama-fe", "Guardião da Chama da Fé (divina)", "Uma luz que guia e queima."],
      ["inscrito", "O Inscrito (arcana)", "Um patrono feito de palavras e símbolos."],
      ["ressentimento", "Ressentimento (oculta)", "Maldições que crescem com rancor."],
      ["silencio-neve", "Silêncio na Neve (primal)", "Frio, quietude e inverno eterno."],
      ["fiandeira", "Fiandeira dos Fios (oculta)", "Destino tecido e cortado."],
      ["sombra-sem-estrelas", "Sombra Sem Estrelas (oculta)", "Escuridão e segredos da noite."],
      ["zelador-selvagem", "Zelador Selvagem (primal)", "Natureza indomável e bichos falantes."],
    ]),
  },
  {
    id: "escola", rotulo: "Escola arcana", tipo: "escolha", classes: ["mago"], obrigatoria: true,
    opcoes: lista([
      ["ars-grammatica", "Ars Grammatica", "A teoria das runas e da linguagem mágica."],
      ["batalha", "Magia de Batalha", "Explosões, escudos e muita destruição educada."],
      ["fronteira", "A Fronteira", "Planos, portais e o que está do outro lado."],
      ["civica", "Magia Cívica", "Magia útil para construir cidades (e derrubá-las)."],
      ["mentalismo", "Mentalismo", "Mentes, sonhos e ilusões."],
      ["proteana", "Forma Proteana", "Transformação e carne maleável."],
      ["unificada", "Teoria Mágica Unificada", "Generalista: um pouco de tudo, sem escola fixa."],
    ]),
  },
  {
    id: "tese", rotulo: "Tese arcana", tipo: "escolha", classes: ["mago"],
    opcoes: lista([
      ["mistura", "Mistura de Magias", "Troca espaços baixos por um mais alto."],
      ["substituicao", "Substituição de Magias", "Troca magia preparada em 10 minutos."],
      ["familiar", "Familiar Aprimorado", "Familiar com mais habilidades."],
      ["experimental", "Moldagem Experimental", "Talentos de moldar magia mais baratos."],
      ["cajado", "Nexo do Cajado", "Um cajado pessoal que cresce com você."],
    ]),
  },
  {
    id: "sintese", rotulo: "Síntese híbrida", tipo: "escolha", classes: ["magus"], obrigatoria: true,
    opcoes: lista([
      ["ferro", "Ferro Inexorável", "Armas de duas mãos e resiliência."],
      ["sombra", "Sombra Risonha", "Mobilidade e teletransporte curto."],
      ["escudo", "Escudo Cintilante", "Escudo e magia de proteção."],
      ["arco", "Arco Estelar", "Golpe arcano à distância."],
      ["arvore", "Árvore Retorcida", "Bastão versátil, alcance e defesa."],
    ]),
  },
  {
    id: "eidolon", rotulo: "Eidolon", tipo: "escolha", classes: ["invocador"], obrigatoria: true,
    opcoes: lista([
      ["e-anjo", "Anjo (divina)"], ["e-besta", "Besta (primal)"], ["e-construto", "Construto (arcana)"],
      ["e-demonio", "Demônio (divina)"], ["e-dragao", "Dragão (arcana)"], ["e-fada", "Fada (primal)"],
      ["e-planta", "Planta (primal)"], ["e-psicopompo", "Psicopompo (divina)"], ["e-morto-vivo", "Morto-vivo (divina)"],
      ["e-raiva", "Fantasma da Raiva (oculta)"], ["e-devocao", "Fantasma da Devoção (oculta)"], ["e-elemental", "Elemental (primal)"],
    ]),
  },
  {
    id: "caminho", rotulo: "Caminho", tipo: "escolha", classes: ["pistoleiro"], obrigatoria: true,
    opcoes: lista([
      ["andarilho", "Andarilho", "Arma de fogo e arma corpo a corpo, sempre em movimento."],
      ["duelista", "Pistoleiro de Duelo", "Uma pistola em cada mão e muita pose."],
      ["atirador", "Atirador de Elite", "Escondido, paciente e letal no primeiro tiro."],
      ["gatilho", "Gatilho Marcado", "Mistura de lâmina e pólvora com truques."],
      ["vanguarda", "Vanguarda", "Armas pesadas e coice que empurra inimigos."],
    ]),
  },
  {
    id: "inovacao", rotulo: "Inovação", tipo: "escolha", classes: ["inventor"], obrigatoria: true,
    opcoes: lista([
      ["armadura", "Armadura", "Uma armadura cheia de engenhocas."],
      ["arma", "Arma", "Uma arma modificada além da conta."],
      ["construto", "Construto", "Um companheiro mecânico leal (e barulhento)."],
    ]),
  },
  {
    id: "mente", rotulo: "Mente consciente", tipo: "escolha", classes: ["psiquico"], obrigatoria: true,
    opcoes: lista([
      ["precisao-distante", "Precisão Distante", "Telecinese afiada."],
      ["mente-ilimitada", "Mente Ilimitada", "Visões e controle mental."],
      ["gema-infinita", "Gema Infinita", "Cura e energia vital."],
      ["sussurro", "Sussurro Silencioso", "Telepatia e comandos mentais."],
      ["sonho", "Sonho Tangível", "Cria coisas do nada imaginário."],
      ["onda", "Onda Oscilante", "Fogo e gelo alternados."],
      ["passo", "Passo Desatado", "Teletransporte e velocidade."],
    ]),
  },
  {
    id: "implemento", rotulo: "Primeiro implemento", tipo: "escolha", classes: ["taumaturgo"], obrigatoria: true,
    opcoes: lista([
      ["amuleto", "Amuleto"], ["sino", "Sino"], ["calice", "Cálice"], ["lanterna", "Lanterna"], ["espelho", "Espelho"],
      ["regalia", "Regalia"], ["tomo", "Tomo"], ["varinha", "Varinha"], ["arma", "Arma"],
    ]),
  },
  {
    id: "portal", rotulo: "Portal elemental", tipo: "multipla", max: 2, classes: ["cinetico"], obrigatoria: true,
    ajuda: "Um elemento (portal único) ou dois (portal duplo).",
    opcoes: lista([["ar", "Ar"], ["terra", "Terra"], ["fogo", "Fogo"], ["metal", "Metal"], ["agua", "Água"], ["madeira", "Madeira"]]),
  },
  {
    id: "campo", rotulo: "Campo de pesquisa", tipo: "escolha", classes: ["alquimista"], obrigatoria: true,
    opcoes: lista([
      ["bombardeiro", "Bombardeiro", "Bombas com respingo controlado."],
      ["cirurgiao", "Cirurgião", "Elixires de cura e Medicina com INT."],
      ["mutagenista", "Mutagenista", "Mutagênicos que transformam o corpo."],
      ["toxicologista", "Toxicologista", "Venenos aplicados com capricho."],
    ]),
  },
  {
    id: "pratica", rotulo: "Prática animista", tipo: "escolha", classes: ["animista"], obrigatoria: true,
    opcoes: lista([
      ["liturgista", "Liturgista", "Dança e ritual para fortalecer as aparições."],
      ["medium", "Médium", "Canaliza mais de uma aparição ao mesmo tempo."],
      ["vidente", "Vidente", "Percebe o mundo espiritual e o futuro próximo."],
      ["xama", "Xamã", "Guarda e cura com os espíritos."],
    ]),
  },
  {
    id: "aparicoes", rotulo: "Aparições", tipo: "multipla", max: 2, classes: ["animista"],
    opcoes: lista([
      ["artifice-cofre", "Artífice no Cofre"], ["custodio-bosques", "Custódio de Bosques e Jardins"], ["eco-momentos", "Eco de Momentos Perdidos"],
      ["impostor", "Impostor dos Lugares Ocultos"], ["espreitador", "Espreitador na Escuridão Devoradora"], ["monarca-fadas", "Monarca das Cortes Feéricas"],
      ["folia", "Folião da Alegria Perdida"], ["guardiao-pedra-fogo", "Guardião da Pedra e do Fogo"], ["vanguarda-aguas", "Vanguarda das Águas Bravias"],
      ["testemunha", "Testemunha de Batalhas Antigas"],
    ]),
  },
  {
    id: "icones", rotulo: "Ícones", tipo: "multipla", max: 3, classes: ["exemplar"],
    opcoes: lista([
      ["corpo-inabalavel", "Corpo: Pele de Pedra", "Resistência física."], ["corpo-veloz", "Corpo: Pés Velozes", "Movimento extra."],
      ["arma-trovao", "Arma: Golpe Trovejante", "Dano sônico e empurrão."], ["arma-sanguinaria", "Arma: Lâmina Sedenta", "Dano persistente."],
      ["veste-manto", "Vestimenta: Manto Mítico", "Defesa e intimidação."], ["veste-coroa", "Vestimenta: Coroa Radiante", "Presença e luz."],
    ]),
  },
];
