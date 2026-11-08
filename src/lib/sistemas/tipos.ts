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
  /** opções próprias do sistema (ex.: no Vampiro, custo de Despertar do poder, matar na caça, tipo de frenesi) */
  opcoes?: Record<string, unknown>;
  /** só uma prévia (cartão do pedido de teste): o sistema não rola custos nem sorteia nada além da parada */
  previa?: boolean;
  /**
   * Teste oposto: o servidor rola o lado do NPC e usa o resultado como alvo (V5: parada de d10 do NPC; d20: 1d20 + bônus).
   * Opcional: só os sistemas que implementam leem; os outros ignoram e usam `alvo`.
   */
  oposicao?: { nome?: string; parada?: number; bonus?: number };
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
  /** opcional: o que o teste mudou na ficha e o que narrar (vai junto com o resultado para o mestre) */
  avisoMestre?: string;
  /** opcional: o lado do NPC num teste oposto, como o servidor rolou */
  oposicao?: { nome: string; expressao: string; dados: number[]; total: number };
  /** opcional: dano sugerido pelo teste (margem + arma), para o mestre aplicar */
  dano?: { valor: number; tipo?: string; texto?: string };
};

/** Como o sistema joga a luta: "rodadas" (iniciativa, vez, rodada) ou "leve" (a ordem é a da ficção; o rastreador é opcional). */
export type CombateSistema = {
  modelo: "rodadas" | "leve";
  /** dado de iniciativa de quem não tem ficha ("1d20", "1d100", "4dF"...); ausente = o servidor deduz pelo dado principal */
  iniciativaNpc?: string;
};

/**
 * Como o personagem progride: "xp" (tabela de XP, o servidor sobe de nível), "marcos" (o mestre decide quando subir; XP é
 * só registro) ou "compra" (XP é moeda que o jogador gasta na ficha, como no Vampiro).
 */
export type ProgressaoSistema = "xp" | "marcos" | "compra";

/** Fechamento da noite pelas regras do sistema (pedido do turno de fim de sessão). */
export type FimDeSessaoSistema = {
  /** como conceder XP no fechamento (o passo de XP do pedido) */
  xp: string;
  /** passos antes do fechamento narrado, conforme as fichas (Vampiro: Remorso para quem tem Manchas) */
  passosExtras?: (fichas: Ficha[]) => string[];
  /** XP mínimo da noite quando o mestre esquece de conceder (0 ou ausente = nenhum) */
  xpMinimo?: number;
};

/** Uma escolha que o jogador pode fazer depois de ver o dado (Vampiro: rerrolar com Força de Vontade). */
export type OpcaoDecisao = {
  id: string;
  rotulo: string;
  /** o preço, legível: "1 de Força de Vontade" */
  custo?: string;
  /** quando a opção escolhe dados: até quantos e quais índices de `dados` valem; `padrao` é a escolha do servidor */
  dados?: { max: number; elegiveis: number[]; padrao?: number[] };
};

/** Uma escolha antes de rolar (Vampiro: Surto de Sangue na parada). */
export type OpcaoAntesDeRolar = {
  id: string;
  rotulo: string;
  custo?: string;
  /** texto curto do efeito: "+2 dados" */
  efeito?: string;
};

/** Textos que o prompt geral inclui quando o sistema tem (ficam no arquivo do sistema, não em prompt.ts). */
export type TextosDoMestre = {
  /** bloco sobre rerrolar um teste (Vampiro: o botão de Força de Vontade no cartão) */
  rerrolagem?: string;
};

/**
 * Limite de perícias escolhidas na criação, como dado (vai ao navegador): `base` ou o valor da classe, somado ao atributo
 * `somaAtributo` (valor da ficha; com `modD20`, o modificador d20 dele). Sem isto vale `periciasEscolhiveis`.
 */
export type LimitePericias = {
  base: number;
  porClasse?: Record<string, number>;
  somaAtributo?: string;
  modD20?: boolean;
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
  /** ids de outras opções que não podem repetir valor com esta (disciplina principal x secundária do Vampiro) */
  exclusivaCom?: string[];
  /** o máximo depende da resposta de outra opção (perícias por valor x estilo no Vampiro); 0 esconde a opção */
  maxPor?: { opcao: string; valores: Record<string, number>; padrao?: string };
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
  /** limite real de perícias da criação (classe + atributo); ausente = `periciasEscolhiveis` */
  limitePericias?: LimitePericias;
  nivelMaximo: number;
  /** nomes curtos de testes comuns, mostrados ao mestre e no rolador */
  testesSugeridos: string[];
  /** texto para o prompt do mestre explicando a mecânica deste sistema (como pedir testes, CDs típicas, combate) */
  regrasParaMestre: string;
  /** como o sistema joga a luta (o prompt geral e o rastreador seguem isto) */
  combate: CombateSistema;
  /** como o personagem progride (ferramentas de XP e nível, pedido de fim de sessão) */
  progressao: ProgressaoSistema;
  /** fechamento da noite próprio do sistema; ausente = o pedido genérico pela `progressao` */
  fimDeSessao?: FimDeSessaoSistema;
  /** textos do sistema que o prompt geral inclui (só no servidor) */
  textosDoMestre?: TextosDoMestre;
  /** extensões de ferramentas do mestre que este sistema liga (ex.: "sangue"); o mestre nunca testa o id do sistema */
  extensoesMestre?: string[];

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
  /**
   * Opcional: escolhas depois de ver o dado (o cartão pausa e pergunta). Lista vazia = nada a decidir.
   * O Vampiro oferece rerrolar com Força de Vontade.
   */
  decisoesAposTeste?(ficha: Ficha, resultado: ResultadoTeste): OpcaoDecisao[];
  /**
   * Opcional: aplica a escolha `id` (validando de novo). Devolve a ficha e o resultado novos e a frase para o mestre.
   * Lança Error com mensagem amigável quando a regra não deixa.
   */
  aplicarDecisao?(ficha: Ficha, resultado: ResultadoTeste, id: string, escolha?: { dados?: number[] }): { ficha: Ficha; resultado: ResultadoTeste; textoMestre: string };
  /** Opcional: escolhas antes de rolar um teste pedido (Vampiro: Surto de Sangue). */
  opcoesAntesDeRolar?(ficha: Ficha, pedido: PedidoTeste): OpcaoAntesDeRolar[];
  /**
   * Opcional: coerência das condições quando o PV muda (PF2e: moribundo e ferido). Muta a ficha.
   * Chamado por alterar_ficha, pelo ajuste manual e pelo descanso; `pvAntes` é o PV antes da mudança.
   */
  aposMudancaDePv?(ficha: Ficha, pvAntes: number, origem: "alterar_ficha" | "ajuste" | "descanso_curto" | "descanso_longo"): void;
  /** Opcional: avisos (não bloqueiam) sobre uma ficha fora das regras de criação do livro. */
  avisosCriacao?(entrada: EntradaCriacao): string[];
}

/** Campos do Sistema que nunca vão ao navegador: funções e textos que só o prompt usa. */
type SoServidor =
  | "atributosIniciais"
  | "criarFicha"
  | "resolverTeste"
  | "descreverParaMestre"
  | "blocosFicha"
  | "xpParaNivel"
  | "subirNivel"
  | "descansar"
  | "aposTeste"
  | "fimDeSessao"
  | "textosDoMestre"
  | "extensoesMestre"
  | "decisoesAposTeste"
  | "aplicarDecisao"
  | "opcoesAntesDeRolar"
  | "aposMudancaDePv"
  | "avisosCriacao";

/** Só dados, sem funções: o que vai para os componentes de cliente. */
export type SistemaPublico = Omit<Sistema, SoServidor>;

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
  /** id da última mensagem da mesa quando o humor atual começou a tocar (o prompt conta os turnos do mestre desde então) */
  musicaDesde?: number;
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
