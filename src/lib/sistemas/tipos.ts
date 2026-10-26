// Contrato que todo sistema de regras implementa (D&D 5e, Pathfinder 2e, Pathfinder 1e, OSR, d100, Fate, PbtA...).
// Os arquivos de sistema rodam só no servidor (podem rolar dados); o cliente recebe `SistemaPublico`.

/** Ficha de personagem genérica. Cada sistema usa os campos que fazem sentido e guarda o resto em `extras`. */
export type Ficha = {
  sistema: string;
  nome: string;
  /** id em Sistema.ancestralidades (raça, espécie, ancestralidade, origem...) */
  ancestralidade: string;
  /** id em Sistema.classes (classe, ocupação, cartilha/playbook...) */
  classe: string;
  /** id em Sistema.antecedentes, quando o sistema tem */
  antecedente?: string;
  nivel: number;
  xp: number;
  /** valores por id de Sistema.atributos */
  atributos: Record<string, number>;
  /**
   * valor por id de Sistema.pericias. O significado é do sistema:
   * 5e 0/1/2 (nada/proficiente/especialista), PF2e 0-4 (destreinado→lendário), PF1e graduações,
   * d100 porcentagem, Fate nível na escada. Perícia ausente = valor base do sistema.
   */
  pericias: Record<string, number>;
  pv: number;
  pvMax: number;
  /** CA/AC/defesa principal; 0 quando o sistema não usa */
  defesa: number;
  /** recursos que gastam e voltam: espaços de magia, pontos de foco, sanidade, sorte, pontos de destino, estresse... */
  recursos: Record<string, Recurso>;
  inventario: string[];
  /** na moeda principal do sistema (ver rotulos.dinheiro) */
  dinheiro: number;
  condicoes: string[];
  historia: string;
  /** dados específicos do sistema: herança, divindade, aspectos do Fate, movimentos do PbtA, talentos... */
  extras: Record<string, unknown>;
};

export type Recurso = { rotulo: string; atual: number; max: number };

export type GrauSucesso = "falha_critica" | "falha" | "parcial" | "sucesso" | "sucesso_critico";

export type PedidoTeste = {
  /** nome/id de perícia, atributo, salvamento, "Ataque", "Magia", "Iniciativa"... (o sistema interpreta) */
  teste: string;
  /** CD / CA / dificuldade / oposição. Sistemas de rolar abaixo (d100) usam o valor da ficha e ignoram. */
  alvo?: number | null;
  modo?: "normal" | "vantagem" | "desvantagem";
  /** bônus ou penalidade circunstancial somado ao total */
  modificador?: number;
  motivo: string;
};

export type ResultadoTeste = {
  tipo: "teste";
  sistema: string;
  personagem: string;
  motivo: string;
  /** rótulo legível: "Furtividade", "Resistência de Fortitude", "Ataque (espada longa)" */
  teste: string;
  /** como foi rolado: "1d20+7", "2d20kh1+4", "1d100", "4dF+2", "2d6+1" */
  expressao: string;
  /** faces roladas (todas, inclusive descartadas) */
  dados: number[];
  /** o dado decisivo (d20 natural, d100) para destacar na interface; null quando não se aplica */
  natural: number | null;
  bonus: number;
  total: number;
  /** CD, CA, valor-alvo do d100 ou oposição; null quando não há */
  alvo: number | null;
  grau: GrauSucesso;
  sucesso: boolean;
  /** como o sistema chama o grau: "Sucesso crítico!", "Sucesso Extremo", "Sucesso com custo"... */
  rotuloGrau: string;
  /** detalhe extra: "vantagem: 14 e 7", "nível 2 na escada (Razoável)" */
  detalhes?: string;
  margem: number | null;
};

export type AtributoDef = { id: string; nome: string; abrev: string; descricao?: string };

export type PericiaDef = { id: string; nome: string; atributo?: string; descricao?: string };

export type ClasseDef = {
  id: string;
  nome: string;
  descricao: string;
  /** atributo principal (id) */
  atributoChave?: string;
  /** PV no 1º nível (ou dado de vida, conforme `rotuloPv`) */
  pvBase?: number;
  /** ids de perícias treinadas por padrão */
  pericias?: string[];
  equipamento?: string[];
  /** papel no grupo: "combatente", "conjurador", "especialista", "suporte"... */
  papel?: string;
  /** livro/fonte aberta de onde vem (ex.: "SRD 5.2", "Player Core", "APG") */
  fonte?: string;
  /** emoji/ícone para cartões (modo história) */
  icone?: string;
};

export type AncestralidadeDef = {
  id: string;
  nome: string;
  descricao: string;
  /** ajustes de atributo por id */
  ajustes?: Record<string, number>;
  /** PV extras no 1º nível (PF2e) */
  pv?: number;
  deslocamento?: string;
  tracos?: string[];
};

export type OpcaoSimples = {
  id: string;
  nome: string;
  descricao?: string;
  /** só vale para estas ancestralidades (ids); vazio = todas (ex.: herança do PF2e, linhagem élfica do 5e) */
  ancestralidades?: string[];
};

/** Escolhas extras na criação, guardadas em Ficha.extras[id]. */
export type OpcaoCriacao = {
  id: string;
  rotulo: string;
  ajuda?: string;
  tipo: "escolha" | "multipla" | "texto" | "lista-texto";
  opcoes?: OpcaoSimples[];
  /** para "multipla" e "lista-texto": quantidade máxima */
  max?: number;
  obrigatoria?: boolean;
  /** só aparece para estas classes (ids); vazio = todas */
  classes?: string[];
  /** só aparece para estas ancestralidades (ids); vazio = todas (heranças, linhagens, +2 flexível...) */
  ancestralidades?: string[];
};

export type EntradaCriacao = {
  nome: string;
  ancestralidade: string;
  classe: string;
  antecedente?: string;
  atributos?: Record<string, number>;
  pericias?: string[];
  historia?: string;
  extras?: Record<string, unknown>;
};

export type MetodoAtributos = { id: string; nome: string; descricao: string };

/** Pedaços que a interface sabe desenhar na ficha. */
export type BlocoFicha =
  | { tipo: "barras"; itens: { rotulo: string; atual: number; max: number; cor?: "vida" | "magia" | "sanidade" | "outro" }[] }
  | { tipo: "grade"; titulo?: string; itens: { rotulo: string; valor: string; detalhe?: string }[] }
  | { tipo: "lista"; titulo: string; itens: string[] }
  | { tipo: "etiquetas"; titulo: string; itens: string[] }
  | { tipo: "texto"; titulo: string; texto: string };

export type RotulosSistema = {
  ancestralidade: string;
  classe: string;
  antecedente?: string;
  nivel: string;
  defesa: string;
  dinheiro: string;
  pv: string;
};

export interface Sistema {
  id: string;
  nome: string;
  nomeCurto: string;
  descricao: string;
  /** licença aberta do conteúdo (CC-BY 4.0, ORC, OGL 1.0a...) */
  licenca: string;
  /** mecânica central, para a interface: "d20", "d100", "4dF", "2d6" */
  dadoPrincipal: string;
  /** está pronto para jogar? Sistemas em construção aparecem desabilitados. */
  pronto: boolean;
  rotulos: RotulosSistema;
  atributos: AtributoDef[];
  pericias: PericiaDef[];
  classes: ClasseDef[];
  ancestralidades: AncestralidadeDef[];
  antecedentes?: OpcaoSimples[];
  opcoesCriacao?: OpcaoCriacao[];
  metodosAtributos: MetodoAtributos[];
  limitesAtributos: { min: number; max: number };
  /** quantas perícias o jogador escolhe além das da classe (0 = nenhuma) */
  periciasEscolhiveis?: number;
  nivelMaximo: number;
  /** nomes curtos de testes comuns, mostrados ao mestre e no rolador */
  testesSugeridos: string[];
  /** texto para o prompt do mestre explicando a mecânica deste sistema (como pedir testes, CDs típicas, combate) */
  regrasParaMestre: string;

  /** valores iniciais sugeridos (pode rolar dados, conforme o método) */
  atributosIniciais(classeId: string, metodo: string): Record<string, number>;
  criarFicha(entrada: EntradaCriacao): Ficha;
  resolverTeste(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste;
  /** ficha resumida em texto para o prompt do mestre */
  descreverParaMestre(ficha: Ficha): string;
  blocosFicha(ficha: Ficha): BlocoFicha[];
  /**
   * XP total para chegar ao nível `nivel`; null = sistema por marcos (o mestre decide) ou nível acima do teto.
   * `ficha` é opcional: sistemas com tabela de XP por classe (B/X) usam; sem ela, vale uma tabela de referência.
   */
  xpParaNivel(nivel: number, ficha?: Ficha): number | null;
  /** aplica um nível (PV, bônus, recursos); não mexe em xp */
  subirNivel(ficha: Ficha): { ficha: Ficha; resumo: string };
  /** descanso: "curto" | "longo" (ou equivalente). Devolve a ficha restaurada e um resumo. */
  descansar(ficha: Ficha, tipo: "curto" | "longo"): { ficha: Ficha; resumo: string };
  /**
   * Opcional: chamado depois de cada teste pedido pelo mestre (ex.: d100 marca a perícia usada para a fase de desenvolvimento).
   * Devolve a ficha alterada para salvar, ou null quando não muda nada.
   */
  aposTeste?(ficha: Ficha, resultado: ResultadoTeste): Ficha | null;
}

/** Só dados, sem funções: o que vai para os componentes de cliente. */
export type SistemaPublico = Omit<
  Sistema,
  | "atributosIniciais"
  | "criarFicha"
  | "resolverTeste"
  | "descreverParaMestre"
  | "blocosFicha"
  | "xpParaNivel"
  | "subirNivel"
  | "descansar"
  | "aposTeste"
>;

/** Estado da cena, mantido pelo mestre via ferramenta e mostrado no painel de cena. */
export type Combatente = {
  nome: string;
  iniciativa: number | null;
  pv?: number | null;
  pvMax?: number | null;
  defesa?: number | null;
  condicoes?: string[];
  /** true para personagens dos jogadores e aliados */
  aliado?: boolean;
};

/** Humores da trilha sonora gerada no navegador (modo história). */
export type HumorMusical = "taverna" | "calmo" | "exploracao" | "misterio" | "tensao" | "combate" | "triste" | "vitoria" | "sombrio";

/** Ação que o mestre sugere ao jogador (botões acima do campo de ação no modo história). */
export type SugestaoAcao = { texto: string; pericia?: string };

export type Cena = {
  /** título da cena, mostrado em letra gótica no modo história ("Salão Comum") */
  titulo?: string;
  local?: string;
  momento?: string;
  clima?: string;
  /** descrição curta do que está acontecendo agora */
  situacao?: string;
  combate?: { ativo: boolean; rodada: number; vez: number; ordem: Combatente[] } | null;
  /** trilha sonora: humor e energia da cena */
  musica?: { humor: HumorMusical; energia: "baixa" | "media" | "alta" } | null;
  /** ações sugeridas pelo mestre para o próximo passo; somem quando alguém age */
  sugestoes?: SugestaoAcao[];
};

export type TipoDiario = "missao" | "npc" | "local" | "item" | "nota";

export type EntradaDiario = {
  id: number;
  tipo: TipoDiario;
  titulo: string;
  texto: string;
  /** missão: "aberta" | "concluida" | "falhou"; npc: "aliado" | "neutro" | "hostil" | "morto"... */
  status: string;
  /**
   * detalhes estruturados: npc {aparencia, voz, jeito, desejo, temperamento, relacao};
   * missao {objetivo, recompensa, pistas: string[]}; outros tipos livres
   */
  dados?: Record<string, unknown>;
  atualizadoEm: string;
};
