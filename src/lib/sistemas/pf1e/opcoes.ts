import type { OpcaoCriacao, OpcaoSimples } from "../tipos";
import { ALINHAMENTOS, ATRIBUTOS, DOMINIOS, TALENTOS } from "./dados";
import { RACAS } from "./racas";

// Escolhas extras da criação de personagem no PF1e (guardadas em Ficha.extras[id]).

const lista = (nomes: string[]): OpcaoSimples[] =>
  nomes.map((nome) => ({
    id: nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, ""),
    nome,
  }));

export const OPCOES_CRIACAO: OpcaoCriacao[] = [
  { id: "alinhamento", rotulo: "Alinhamento", tipo: "escolha", opcoes: ALINHAMENTOS, ajuda: "Paladino precisa ser Leal e Bom; antipaladino, Caótico e Mau. O mestre vai cobrar." },
  {
    id: "atributoRacial", rotulo: "Bônus racial flexível (+2)", tipo: "escolha",
    ajuda: "Só vale para humano, meio-elfo e meio-orc. Sem escolha, vai no atributo-chave da classe.",
    ancestralidades: RACAS.filter((r) => r.flexivel).map((r) => r.id),
    opcoes: ATRIBUTOS.map((a) => ({ id: a.id, nome: a.nome })),
  },
  {
    id: "classeFavorita", rotulo: "Bônus de classe favorecida", tipo: "escolha",
    ajuda: "A cada nível nesta classe: +1 PV ou +1 graduação de perícia.",
    opcoes: [
      { id: "pv", nome: "+1 PV por nível", descricao: "Para quem apanha muito." },
      { id: "pericia", nome: "+1 graduação por nível", descricao: "Para quem prefere saber das coisas." },
    ],
  },
  {
    id: "talentos", rotulo: "Talentos", tipo: "multipla", max: 3, opcoes: TALENTOS.map((t) => ({ id: t.id, nome: t.nome, descricao: t.descricao })),
    ajuda: "Um no 1º nível; humanos ganham mais um e guerreiros mais um. O excesso é ignorado.",
  },
  { id: "divindade", rotulo: "Divindade ou filosofia", tipo: "texto", ajuda: "Invente a sua: a taverna não usa deuses de cenário com dono." },
  {
    id: "dominios", rotulo: "Domínios", tipo: "multipla", max: 2, opcoes: lista(DOMINIOS), classes: ["clerigo", "inquisidor", "druida"],
    ajuda: "Clérigo escolhe dois; inquisidor e druida (que troca o companheiro animal), um.",
  },
  { id: "bencaos", rotulo: "Bênçãos", tipo: "multipla", max: 2, opcoes: lista(DOMINIOS), classes: ["sacerdote_guerreiro"] },
  {
    id: "linhagem", rotulo: "Linhagem", tipo: "escolha", classes: ["feiticeiro", "sangue_furioso"],
    opcoes: lista(["Aberrante", "Abissal", "Arcana", "Celestial", "Destinada", "Dracônica", "Elemental", "Feérica", "Infernal", "Morta-viva"]),
  },
  {
    id: "escola", rotulo: "Escola arcana", tipo: "escolha", classes: ["mago"],
    opcoes: lista(["Universalista", "Abjuração", "Adivinhação", "Conjuração", "Encantamento", "Evocação", "Ilusão", "Necromancia", "Transmutação"]),
  },
  { id: "misterio", rotulo: "Mistério", tipo: "escolha", classes: ["oraculo"], opcoes: lista(["Batalha", "Ossos", "Chamas", "Céus", "Vida", "Saber", "Natureza", "Pedra", "Ondas", "Vento"]) },
  { id: "maldicao", rotulo: "Maldição do oráculo", tipo: "escolha", classes: ["oraculo"], opcoes: lista(["Visão nublada", "Surdez", "Assombrado", "Manqueira", "Línguas", "Definhamento"]) },
  {
    id: "patrono", rotulo: "Patrono", tipo: "escolha", classes: ["bruxa"],
    opcoes: lista(["Agilidade", "Animais", "Engano", "Elementos", "Resistência", "Praga", "Sombra", "Força", "Transformação", "Trapaça", "Água", "Sabedoria", "Inverno"]),
  },
  {
    id: "ordem", rotulo: "Ordem", tipo: "escolha", classes: ["cavaleiro", "samurai"],
    opcoes: lista(["Ordem da Espada", "Ordem do Escudo", "Ordem do Dragão", "Ordem da Estrela", "Ordem do Leão", "Ordem da Cocatriz", "Ordem do Guerreiro", "Ordem da Flor"]),
  },
  {
    id: "inimigoPredileto", rotulo: "Inimigo predileto", tipo: "escolha", classes: ["patrulheiro"],
    opcoes: lista(["Aberrações", "Animais", "Construtos", "Dragões", "Fadas", "Humanoides (humanos)", "Humanoides (orcs)", "Humanoides (goblinoides)", "Bestas mágicas", "Humanoides monstruosos", "Limos", "Extraplanares (demônios)", "Extraplanares (diabos)", "Plantas", "Mortos-vivos", "Vermes"]),
  },
  { id: "estiloCombate", rotulo: "Estilo de combate", tipo: "escolha", classes: ["patrulheiro"], opcoes: lista(["Arquearia", "Duas armas", "Arma e escudo", "Arma de duas mãos", "Combate montado"]) },
  { id: "espirito", rotulo: "Espírito", tipo: "escolha", classes: ["xama"], opcoes: lista(["Batalha", "Ossos", "Chamas", "Céus", "Vida", "Saber", "Natureza", "Pedra", "Ondas", "Vento"]) },
  { id: "elemento", rotulo: "Elemento primário", tipo: "escolha", classes: ["cinetico"], opcoes: lista(["Ar", "Terra", "Fogo", "Água", "Éter", "Madeira", "Vazio"]) },
  { id: "espiritoMedium", rotulo: "Espírito favorito", tipo: "escolha", classes: ["medium"], opcoes: lista(["Arcanista", "Campeão", "Guardião", "Hierofante", "Marchand", "Trapaceiro"]) },
  {
    id: "disciplina", rotulo: "Disciplina psíquica", tipo: "escolha", classes: ["psiquico"],
    opcoes: lista(["Abominação", "Sonho", "Fé", "Saber", "Dor", "Psicodelia", "Afinidade", "Autoperfeição", "Tranquilidade"]),
  },
  { id: "emocao", rotulo: "Emoção do fantasma", tipo: "escolha", classes: ["espiritualista"], opcoes: lista(["Raiva", "Dedicação", "Desespero", "Medo", "Ódio", "Ciúme", "Zelo", "Orgulho"]) },
  { id: "especializacao", rotulo: "Especialização", tipo: "escolha", classes: ["vigilante"], opcoes: lista(["Vingador", "Perseguidor"]) },
  { id: "identidadeSocial", rotulo: "Identidade social", tipo: "texto", classes: ["vigilante"], ajuda: "Quem você finge ser durante o dia." },
  {
    id: "aspecto", rotulo: "Aspecto animal", tipo: "escolha", classes: ["metamorfo"],
    opcoes: lista(["Urso", "Touro", "Falcão", "Sapo", "Lagarto", "Macaco", "Rato", "Coruja", "Serpente", "Cervo", "Tigre", "Lobo", "Glutão"]),
  },
  { id: "eidolon", rotulo: "Forma do eidolon", tipo: "escolha", classes: ["invocador"], opcoes: lista(["Bípede", "Quadrúpede", "Serpentino", "Aviano", "Aquático"]) },
  {
    id: "implementos", rotulo: "Implementos", tipo: "multipla", max: 2, classes: ["ocultista"],
    opcoes: lista(["Abjuração", "Conjuração", "Adivinhação", "Encantamento", "Evocação", "Ilusão", "Necromancia", "Transmutação"]),
  },
  {
    id: "companheiro", rotulo: "Companheiro ou montaria", tipo: "texto", classes: ["druida", "cacador", "cavaleiro", "samurai", "patrulheiro"],
    ajuda: "Nome e espécie do bicho (lobo, cavalo, falcão...). Ele também tem opinião.",
  },
];
