import "server-only";
import { somar } from "../dados";
import { clonar, distribuir, fichaBase, limitar, modD20, normalizar, rolar4d6, sinal } from "./comum";
import {
  ALINHAMENTOS,
  ANTECEDENTES,
  ATRIBUTOS,
  CLASSES,
  ESPECIES,
  ESTILOS_LUTA,
  LINHAGENS,
  PERICIAS,
  SUBCLASSES,
  TALENTOS,
  XP_POR_NIVEL,
  type Antecedente5e,
  type Classe5e,
} from "./dnd5e/dados";
import {
  antecedenteDe,
  ataquesPorAcao,
  aumentoNoNivel,
  bonusFuria,
  caCalculada,
  caracteristicasAte,
  caracteristicasNoNivel,
  cdMagia,
  classeDe,
  dadoArtesMarciais,
  dadosFurtivo,
  dadosTruque,
  deslocamento,
  especieDe,
  estiloLuta,
  linhagemDe,
  lista,
  metrosTexto,
  mod,
  proficiencia,
  recuperacaoArcana,
  recuperarCurto,
  sincronizarRecursos,
  subclasseDe,
  talentosDe,
  temSubclasse,
  texto,
} from "./dnd5e/regras";
import { calcular, nivelExaustao, resolver } from "./dnd5e/testes";
import type { BlocoFicha, Ficha, OpcaoCriacao, PedidoTeste, ResultadoTeste, Sistema } from "./tipos";

// D&D 5ª edição pelo SRD 5.2 (Creative Commons BY 4.0). Implementação de referência para os outros sistemas.
// Tabelas em dnd5e/dados.ts, contas derivadas em dnd5e/regras.ts e testes em dnd5e/testes.ts.
//
// Perícias: a classe concede 2 (Bardo e Patrulheiro 3, Ladino 4) e o antecedente mais 2. O jogador escolhe até
// `periciasEscolhiveis` (2) e o resto das perícias de classe vem das sugestões da classe. Humano ganha +1 e o talento
// Habilidoso +3. Especialização (grau 2): Ladino 2 no 1º e 2 no 6º; Bardo 2 no 2º e 2 no 9º; Patrulheiro 1 no 2º e
// 2 no 9º; Mago 1 no 2º (Erudito).

const CONJURADORES = CLASSES.filter((c) => c.conjurador).map((c) => c.id);

function classePorId(id: string): Classe5e {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0];
}

/** Aumento do antecedente (+2/+1 ou +1/+1/+1) nos atributos do antecedente, na ordem de prioridade da classe. */
function aplicarAntecedente(atributos: Record<string, number>, antecedente: Antecedente5e, classe: Classe5e, modo: string): string {
  const ordenados = [...antecedente.atributos].sort((a, b) => classe.ordem.indexOf(a) - classe.ordem.indexOf(b));
  const aumentos = modo === "1-1-1" ? [1, 1, 1] : [2, 1, 0];
  const feitos: string[] = [];
  ordenados.forEach((id, i) => {
    if (!aumentos[i]) return;
    atributos[id] = Math.min(20, (atributos[id] ?? 10) + aumentos[i]);
    feitos.push(`${id.toUpperCase()} +${aumentos[i]}`);
  });
  return feitos.join(", ");
}

/** Adiciona `qtd` perícias novas seguindo a ordem de preferência (depois qualquer uma). */
function ganharPericias(ficha: Ficha, preferencia: string[], qtd: number): string[] {
  const ganhas: string[] = [];
  for (const id of [...preferencia, ...PERICIAS.map((p) => p.id)]) {
    if (ganhas.length >= qtd) break;
    if (ficha.pericias[id]) continue;
    ficha.pericias[id] = 1;
    ganhas.push(id);
  }
  return ganhas;
}

function quantasEspecializacoes(classe: Classe5e, nivel: number): number {
  if (classe.id === "ladino") return nivel >= 6 ? 4 : 2;
  if (classe.id === "bardo") return nivel >= 9 ? 4 : nivel >= 2 ? 2 : 0;
  if (classe.id === "patrulheiro") return nivel >= 9 ? 3 : nivel >= 2 ? 1 : 0;
  if (classe.id === "mago") return nivel >= 2 ? 1 : 0;
  return 0;
}

/** Garante o número de especializações do nível: primeiro as escolhidas, depois as preferidas da classe. */
function aplicarEspecializacoes(ficha: Ficha): string[] {
  const classe = classeDe(ficha);
  const meta = quantasEspecializacoes(classe, ficha.nivel);
  const atuais = Object.entries(ficha.pericias).filter(([, g]) => g >= 2).length;
  if (atuais >= meta) return [];
  const preferidas =
    classe.id === "mago" ? ["arcanismo", "historia", "investigacao", "religiao", "natureza", "medicina"] : (classe.especialidades ?? []);
  const novas: string[] = [];
  for (const id of [...lista(ficha, "especializacao"), ...preferidas, ...PERICIAS.map((p) => p.id)]) {
    if (atuais + novas.length >= meta) break;
    if ((ficha.pericias[id] ?? 0) !== 1) continue;
    ficha.pericias[id] = 2;
    novas.push(PERICIAS.find((p) => p.id === id)?.nome ?? id);
  }
  return novas;
}

/** PV ganhos por nível além do dado de vida: Robustez Anã, Vigoroso e Resiliência Dracônica. */
function pvExtraPorNivel(ficha: Ficha): number {
  let extra = 0;
  if (especieDe(ficha).id === "anao") extra += 1;
  if (talentosDe(ficha).includes("vigoroso")) extra += 2;
  if (temSubclasse(ficha, "draconica")) extra += 1;
  return extra;
}

/** Aumento de Atributo automático: +2 no principal (ou +1/+1 quando encosta em 20). */
function aplicarAumento(ficha: Ficha, classe: Classe5e, limite = 20): string {
  const feitos: string[] = [];
  let restante = 2;
  for (const id of classe.ordem) {
    if (!restante) break;
    const atual = ficha.atributos[id] ?? 10;
    const ganho = Math.min(restante, limite - atual);
    if (ganho <= 0) continue;
    ficha.atributos[id] = atual + ganho;
    restante -= ganho;
    feitos.push(`${id.toUpperCase()} +${ganho}`);
  }
  return feitos.join(", ") || "atributos já no máximo";
}

function descricaoAtaque(ficha: Ficha): string {
  const classe = classeDe(ficha);
  const n = ficha.nivel;
  const ataque = calcular(ficha, "Ataque");
  const atributo = ataque.atributo ?? classe.ataque.atributo;
  let dano = classe.ataque.dano;
  if (classe.id === "monge") dano = `1d${dadoArtesMarciais(n)}`;
  if (classe.truque && classe.ataque.arma === classe.truque.nome) dano = `${dadosTruque(n)}${classe.truque.dado}`;
  const somaAtributo = classe.truque && classe.ataque.arma === classe.truque.nome ? 0 : mod(ficha, atributo);
  const partes = [`${ataque.rotulo} ${sinal(ataque.bonus)}, dano ${dano}${somaAtributo ? sinal(somaAtributo) : ""}`];
  const qtd = ataquesPorAcao(ficha);
  if (qtd > 1) partes.push(`${qtd} ataques por ação`);
  if (classe.id === "ladino") partes.push(`Ataque Furtivo ${dadosFurtivo(n)}d6`);
  if (classe.id === "barbaro") partes.push(`+${bonusFuria(n)} de dano em fúria`);
  if (temSubclasse(ficha, "berserker")) partes.push(`Frenesi ${bonusFuria(n)}d6`);
  if (classe.id === "paladino" && n >= 2) partes.push("Destruição do Paladino 2d8 (+1d8 por círculo)");
  if (classe.id === "paladino" && n >= 11) partes.push("Golpes Radiantes +1d8");
  return partes.join(" · ");
}

function descricaoMagia(ficha: Ficha): string {
  const classe = classeDe(ficha);
  const cd = cdMagia(ficha);
  if (cd === null) return "";
  const ataque = calcular(ficha, "Magia");
  const truque = classe.truque
    ? ` · truque ${classe.truque.nome} ${dadosTruque(ficha.nivel)}${classe.truque.dado}${classe.truque.resistencia ? ` (resistência de ${classe.truque.resistencia.toUpperCase()})` : ""}`
    : "";
  return `CD ${cd}, ataque mágico ${sinal(ataque.bonus)}${truque}`;
}

function nomeCompleto(ficha: Ficha): { especie: string; classe: string } {
  const especie = especieDe(ficha);
  const linhagem = linhagemDe(ficha);
  const sub = subclasseDe(ficha);
  return {
    especie: linhagem ? linhagem.nome.replace(/^[^:]+:\s*/, "") : especie.nome,
    classe: `${classeDe(ficha).nome}${sub ? ` (${sub.nome}${ficha.nivel < 3 && sub.sub ? ", no 3º nível" : ""})` : ""}`,
  };
}

function tracosDaEspecie(ficha: Ficha): string[] {
  const especie = especieDe(ficha);
  const linhagem = linhagemDe(ficha);
  // a linhagem escolhida substitui o traço genérico ("Linhagem Élfica", "Ancestral Dracônico"...)
  if (!linhagem) return especie.tracos ?? [];
  return [...(especie.tracos ?? []).filter((t) => !/^(Linhagem|Ancestral|Legado)/.test(t)), ...linhagem.tracos];
}

const OPCOES: OpcaoCriacao[] = [
  ...CLASSES.map((classe) => ({
    id: `subclasse_${classe.id}`,
    rotulo: "Subclasse",
    ajuda: "Os poderes da subclasse chegam no 3º nível.",
    tipo: "escolha" as const,
    opcoes: [
      ...SUBCLASSES.filter((s) => s.classe === classe.id).map((s) => ({ id: s.id, nome: s.nome, descricao: s.descricao })),
      { id: "outra", nome: "Outra (texto livre)", descricao: "Descreva no campo abaixo; o mestre aplica na mão." },
    ],
    classes: [classe.id],
  })),
  { id: "subclasseOutra", rotulo: "Subclasse (se escolheu “outra”)", ajuda: "Nome e ideia da subclasse. Sem mecânica automática.", tipo: "texto" },
  {
    id: "linhagem",
    rotulo: "Linhagem / ancestral",
    ajuda: "Só vale a da sua espécie (Elfo, Draconato, Gnomo, Golias, Tiefling). Em branco, usa a primeira.",
    tipo: "escolha",
    opcoes: LINHAGENS.map((l) => ({ id: l.id, nome: l.nome, descricao: l.descricao, ancestralidades: [l.especie] })),
    ancestralidades: [...new Set(LINHAGENS.map((l) => l.especie))],
  },
  {
    id: "aumentoAntecedente",
    rotulo: "Aumento do antecedente",
    ajuda: "Somado aos atributos informados, nos três atributos do antecedente, na prioridade da classe.",
    tipo: "escolha",
    opcoes: [
      { id: "2-1", nome: "+2 e +1", descricao: "+2 no atributo mais útil para a classe, +1 no segundo." },
      { id: "1-1-1", nome: "+1, +1 e +1", descricao: "Um ponto em cada atributo do antecedente." },
    ],
  },
  { id: "alinhamento", rotulo: "Alinhamento", tipo: "escolha", opcoes: ALINHAMENTOS },
  { id: "divindade", rotulo: "Divindade ou ideal", ajuda: "Invente o seu deus ou causa. Nada de panteões de cenários com dono.", tipo: "texto", classes: ["clerigo", "paladino"] },
  {
    id: "ordemDivina",
    rotulo: "Ordem Divina",
    tipo: "escolha",
    classes: ["clerigo"],
    opcoes: [
      { id: "protetor", nome: "Protetor", descricao: "Armadura pesada e armas marciais: cota de malha, CA maior." },
      { id: "taumaturgo", nome: "Taumaturgo", descricao: "Um truque extra e SAB somada em Arcanismo e Religião." },
    ],
  },
  {
    id: "ordemPrimal",
    rotulo: "Ordem Primal",
    tipo: "escolha",
    classes: ["druida"],
    opcoes: [
      { id: "magico", nome: "Mágico", descricao: "Um truque extra e SAB somada em Arcanismo e Natureza." },
      { id: "guardiao", nome: "Guardião", descricao: "Armadura média e armas marciais." },
    ],
  },
  { id: "estiloLuta", rotulo: "Estilo de Luta", ajuda: "Guerreiro no 1º nível; Paladino e Patrulheiro no 2º.", tipo: "escolha", opcoes: ESTILOS_LUTA, classes: ["guerreiro", "paladino", "patrulheiro"] },
  {
    id: "especializacao",
    rotulo: "Especialização (em ordem de preferência)",
    ajuda: "Dobra a proficiência. Ladino: 2 no 1º nível e 2 no 6º; Bardo: 2 no 2º e 2 no 9º; Patrulheiro: 1 no 2º e 2 no 9º. Só vale em perícia treinada.",
    tipo: "multipla",
    max: 4,
    opcoes: PERICIAS.map((p) => ({ id: p.id, nome: p.nome })),
    classes: ["ladino", "bardo", "patrulheiro"],
  },
  {
    id: "talentoHumano",
    rotulo: "Talento extra (só Humano)",
    ajuda: "Versátil: Humanos ganham um segundo talento de origem. Em branco, Habilidoso.",
    tipo: "escolha",
    ancestralidades: ["humano"],
    opcoes: Object.entries(TALENTOS).map(([id, t]) => ({ id, nome: t.nome, descricao: t.efeito })),
  },
  { id: "magias", rotulo: "Magias e truques preparados", ajuda: "Uma por linha. O mestre usa para saber o que você pode lançar.", tipo: "lista-texto", max: 30, classes: CONJURADORES },
  { id: "invocacoes", rotulo: "Invocações místicas", tipo: "lista-texto", max: 10, classes: ["bruxo"] },
];

export const dnd5e: Sistema = {
  id: "dnd5e",
  nome: "D&D 5ª Edição (SRD 5.2)",
  nomeCurto: "D&D 5e",
  descricao: "O clássico de fantasia: d20 + modificador contra CD, vantagem e desvantagem, espaços de magia. 12 classes, 10 espécies, 16 antecedentes.",
  licenca: "SRD 5.2 — Creative Commons BY 4.0 (Wizards of the Coast)",
  dadoPrincipal: "d20",
  pronto: true,
  rotulos: { ancestralidade: "Espécie", classe: "Classe", antecedente: "Antecedente", nivel: "Nível", defesa: "CA", dinheiro: "po", pv: "PV" },
  atributos: ATRIBUTOS,
  pericias: PERICIAS,
  classes: CLASSES.map((c) => ({
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    atributoChave: c.atributoChave,
    pvBase: c.pvBase,
    pericias: (c.pericias ?? []).slice(0, c.qtdPericias),
    equipamento: c.equipamento,
    papel: c.papel,
    fonte: c.fonte,
  })),
  ancestralidades: ESPECIES.map((e) => ({ id: e.id, nome: e.nome, descricao: e.descricao, deslocamento: e.deslocamento, tracos: e.tracos })),
  antecedentes: ANTECEDENTES.map((a) => ({
    id: a.id,
    nome: a.nome,
    descricao: `${a.descricao} Perícias: ${a.pericias.map((p) => PERICIAS.find((x) => x.id === p)?.nome).join(" e ")}. Atributos: ${a.atributos.map((x) => x.toUpperCase()).join(", ")}. Talento: ${TALENTOS[a.talento].nome}.`,
  })),
  opcoesCriacao: OPCOES,
  metodosAtributos: [
    { id: "padrao", nome: "Matriz padrão", descricao: "15, 14, 13, 12, 10, 8, distribuídos pela classe." },
    { id: "compra", nome: "Compra de pontos (27)", descricao: "Cada valor custa: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9. Sugestão: 15, 15, 14, 10, 8, 8." },
    { id: "rolar", nome: "Rolar 4d6", descricao: "4d6 descartando o menor, seis vezes, o maior no atributo principal." },
  ],
  limitesAtributos: { min: 3, max: 20 },
  periciasEscolhiveis: 2,
  nivelMaximo: 20,
  testesSugeridos: [
    "Atletismo", "Acrobacia", "Furtividade", "Percepção", "Investigação", "Persuasão", "Enganação", "Intuição", "Sobrevivência", "Arcanismo",
    "Resistência de DES", "Resistência de CON", "Resistência de SAB", "Concentração", "Ataque", "Magia", "Iniciativa", "Teste contra a morte",
  ],
  regrasParaMestre: `Sistema: D&D 5e (SRD 5.2).
TESTES — d20 + modificador contra uma CD. Ao testar (teste ou pedir_teste):
- teste: nome da perícia ("Furtividade", "Atletismo"...), atributo puro ("Força", "SAB"), "Resistência de DES/CON/SAB..." (ou "Concentração"), "Ataque" (arma da classe; pode dizer a arma: "Ataque com arco", "Ataque desarmado"), "Magia" (ataque mágico), "Iniciativa", "Teste contra a morte", "Ferramentas de ladrão".
- alvo: a CD (testes e resistências) ou a CA do alvo (ataques). Iniciativa não tem alvo. Teste contra a morte usa CD 10 sozinho.
- modo: "vantagem" quando a situação claramente ajuda, "desvantagem" quando atrapalha. O servidor já aplica condições (envenenado, amedrontado, cego, caído, impedido, invisível, exaustão N) e traços (fúria, Astúcia Gnômica, Sortudo do Halfling, Talento Confiável...). Vantagem e desvantagem juntas se anulam.
- modificador: só bônus circunstancial extra (cobertura não: cobertura soma na CA do alvo, +2 meia ou +5 três quartos).
CDs: 5 muito fácil, 10 fácil, 15 médio, 20 difícil, 25 muito difícil, 30 quase impossível. Não peça teste para o que é trivial.
COMBATE — iniciativa (teste "Iniciativa") para a ordem. No turno: movimento + 1 ação (atacar, conjurar, correr, desengajar, esquivar, ajudar, esconder) + no máximo 1 ação bônus + 1 reação por rodada.
- Ataque: alvo = CA do inimigo. 20 natural (19-20 do Campeão) é crítico: dobre os DADOS de dano. 1 natural erra sempre. Role o dano com "rolar_dados" usando o dano da ficha.
- Inimigos comuns: CA 12-15, 7-30 PV; chefes CA 16-19. Resistências dos inimigos: role com "rolar_dados" (1d20+bônus) contra a CD de magia do personagem.
- Ataque de Oportunidade quando alguém sai do alcance sem desengajar. Ataque Extra: Guerreiro, Bárbaro, Monge, Paladino e Patrulheiro atacam 2 vezes a partir do 5º nível (Guerreiro 3 no 11º e 4 no 20º).
- A 0 PV o personagem cai inconsciente e faz "Teste contra a morte" no início de cada turno: 3 sucessos estabiliza, 3 falhas morre; 20 natural volta com 1 PV; 1 natural conta 2 falhas; dano a 0 PV conta 1 falha. Qualquer cura levanta.
- Concentração: ao sofrer dano concentrando numa magia, "Concentração" com CD 10 ou metade do dano (o maior, até 30).
- Exaustão: condição "exaustão N" (1 a 6): −2×N em todos os d20. Descanso longo tira 1 nível. 6 = morte.
RECURSOS (ids para alterar_ficha): magia1..magia9 = espaços por círculo (gaste um ao lançar magia daquele círculo ou maior; truques são grátis); pacto = espaços do Bruxo (voltam no descanso curto); arcano6..arcano9 = Arcano Místico do Bruxo; furia (Bárbaro), inspiracaoBardo, canalizar (Canalizar Divindade), formaSelvagem, feiticaria e feiticariaInata (Feiticeiro), foco (Monge), retomarFolego, surtoAcao e indomavel (Guerreiro), imposicaoMaos (reserva de PV do Paladino: gaste quanto curar), marcaCacador (Patrulheiro), recuperacaoArcana (Mago), sopro (Draconato), gigante (Golias), adrenalina e implacavel (Orc), maosCurativas e revelacao (Aasimar), sentidoPedra (Anão), sorte (talento Sortudo), inspiracao (inspiração heroica: dê +1 por boa interpretação; gastar = vantagem num teste), dadosVida.
DESCANSO — curto (1 h): gasta dados de vida para curar e recupera pacto, surtoAcao, foco, um uso de furia/canalizar/formaSelvagem/retomarFolego e outros de descanso curto. Longo (8 h): tudo volta, inclusive todos os dados de vida, e tira 1 nível de exaustão.
NÍVEIS — XP do 5e (300 para o 2º, 900 para o 3º, 2700 para o 4º...). A cada nível: mais PV (média do dado de vida + CON), recursos maiores e espaços novos. Proficiência +2 (1º-4º), +3 (5º-8º), +4 (9º-12º), +5 (13º-16º), +6 (17º-20º). Subclasse no 3º; Aumento de Atributo no 4º, 8º, 12º, 16º (Guerreiro também 6º e 14º, Ladino 10º); Dádiva Épica no 19º. Truques ficam mais fortes no 5º, 11º e 17º.
COMO MESTRAR 5E
- Vantagem e desvantagem no lugar de pilha de modificadores: ajuda de aliado, posição, surpresa ou a ferramenta certa dão vantagem; escuro, pressa, ferimento ou terreno ruim dão desvantagem. Não se acumulam. Vale também no pedir_teste (campo modo).
- Diga a dificuldade pela ficção, não pelo número. O óbvio dispensa teste: use o passivo (10 + bônus; Percepção passiva nota emboscadas e armadilhas visíveis). Quando todos tentam juntos, teste em grupo (metade passa = o grupo passa).
- Inspiração heroica: dê (recurso inspiracao +1) por boa interpretação, coragem ou uma ideia que diverte a mesa, e lembre que existe quando a situação aperta.
- Ação, ação bônus, reação e movimento: pergunte o que o personagem faz no turno e respeite essa economia. Inimigos também têm reação (ataque de oportunidade, Escudo).
- Concentração é escolha tática: uma magia por vez; dano pede o teste "Concentração", e inimigos espertos miram o conjurador.
- Descansos são o relógio: pressione o tempo (ritual, perseguição, reforços) para que nem todo canto vire descanso curto; descanso longo só em segurança e no máximo um por dia.
- Combate com cara de cena: terreno com algo para usar (lustre, barril, precipício), inimigos com objetivo além de matar, chefes que mudam a luta no meio (lacaios, fase dois, terreno que desaba). Testes contra a morte são drama, não contabilidade.`,

  atributosIniciais(classeId, metodo) {
    const classe = classePorId(classeId);
    if (metodo === "rolar") {
      const valores = Object.values(rolar4d6(classe.ordem)).sort((a, b) => b - a);
      return distribuir(valores, classe.ordem);
    }
    if (metodo === "compra") return distribuir([15, 15, 14, 10, 8, 8], classe.ordem);
    return distribuir([15, 14, 13, 12, 10, 8], classe.ordem);
  },

  criarFicha(entrada) {
    const classe = classePorId(entrada.classe);
    const especie = ESPECIES.find((e) => e.id === entrada.ancestralidade) ?? ESPECIES[0];
    const antecedente = ANTECEDENTES.find((a) => a.id === entrada.antecedente) ?? ANTECEDENTES.find((a) => a.id === classe.antecedentePadrao)!;
    const ficha = fichaBase("dnd5e", entrada.nome);
    ficha.classe = classe.id;
    ficha.ancestralidade = especie.id;
    ficha.antecedente = antecedente.id;
    ficha.historia = entrada.historia ?? "";
    ficha.extras = { ...(entrada.extras ?? {}) };

    // linhagem só vale se for da espécie; senão a primeira da espécie (ou nenhuma)
    const linhagem = LINHAGENS.find((l) => l.id === texto(ficha, "linhagem") && l.especie === especie.id) ?? LINHAGENS.find((l) => l.especie === especie.id);
    if (linhagem) ficha.extras.linhagem = linhagem.id;
    else delete ficha.extras.linhagem;

    const talentos = [antecedente.talento];
    if (especie.id === "humano") {
      const extra = texto(ficha, "talentoHumano");
      talentos.push(TALENTOS[extra] ? extra : "habilidoso");
    }
    ficha.extras.talentos = talentos;

    const atributos = { ...(entrada.atributos ?? dnd5e.atributosIniciais(classe.id, "padrao")) };
    for (const a of ATRIBUTOS) atributos[a.id] = limitar(Math.round(atributos[a.id] ?? 10), 3, 20);
    ficha.extras.aumentoAplicado = aplicarAntecedente(atributos, antecedente, classe, texto(ficha, "aumentoAntecedente"));
    ficha.atributos = atributos;

    // perícias: escolhidas pelo jogador contam como perícias de classe; o resto vem das sugestões da classe
    const validas = new Set(PERICIAS.map((p) => p.id));
    const escolhidas = (entrada.pericias ?? []).filter((p) => validas.has(p)).slice(0, 2);
    for (const p of escolhidas) ficha.pericias[p] = 1;
    ganharPericias(ficha, [...(classe.pericias ?? []), ...classe.listaPericias], Math.max(0, classe.qtdPericias - escolhidas.length));
    for (const p of antecedente.pericias) {
      if (!ficha.pericias[p]) ficha.pericias[p] = 1;
      else ganharPericias(ficha, [...(classe.pericias ?? []), ...classe.listaPericias], 1);
    }
    if (especie.id === "humano") ganharPericias(ficha, [...(classe.pericias ?? []), ...classe.listaPericias], 1);
    if (especie.id === "elfo") ganharPericias(ficha, ["percepcao", "intuicao", "sobrevivencia"], ficha.pericias.percepcao && ficha.pericias.intuicao && ficha.pericias.sobrevivencia ? 0 : 1);
    for (const t of talentos) if (t === "habilidoso") ganharPericias(ficha, [...(classe.pericias ?? []), ...classe.listaPericias, "percepcao", "intuicao", "persuasao"], 3);
    aplicarEspecializacoes(ficha);

    ficha.pvMax = Math.max(1, classe.dadoVida + modD20(atributos.con) + pvExtraPorNivel(ficha));
    ficha.pv = ficha.pvMax;
    ficha.defesa = caCalculada(ficha);
    sincronizarRecursos(ficha, true);
    ficha.inventario = [...(classe.equipamento ?? []), ...antecedente.equipamento, "mochila", "saco de dormir", "corda de 15 m", "pederneira", "ração para 3 dias", "odre"];
    ficha.dinheiro = classe.dinheiro + antecedente.dinheiro;
    return ficha;
  },

  resolverTeste(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
    return resolver(ficha, pedido);
  },

  descreverParaMestre(ficha) {
    const nomes = nomeCompleto(ficha);
    const antecedente = antecedenteDe(ficha);
    const prof = proficiencia(ficha.nivel);
    const atributos = ATRIBUTOS.map((a) => `${a.abrev} ${ficha.atributos[a.id] ?? 10} (${sinal(mod(ficha, a.id))})`).join(", ");
    const resistencias = ATRIBUTOS.map((a) => `${a.abrev} ${sinal(calcular(ficha, `Resistência de ${a.nome}`).bonus)}`).join(", ");
    const pericias = PERICIAS.filter((p) => ficha.pericias[p.id])
      .map((p) => `${p.nome}${ficha.pericias[p.id] >= 2 ? "★" : ""} ${sinal(calcular(ficha, p.nome).bonus)}`)
      .join(", ");
    const percepcaoPassiva = 10 + calcular(ficha, "Percepção").bonus;
    const magia = descricaoMagia(ficha);
    const magias = lista(ficha, "magias");
    const invocacoes = lista(ficha, "invocacoes");
    const recursos = Object.entries(ficha.recursos).map(([id, r]) => `${r.rotulo} [${id}] ${r.atual}/${r.max}`).join(", ");
    const talentos = talentosDe(ficha).map((t) => `${TALENTOS[t].nome} (${TALENTOS[t].efeito})`).join("; ");
    const proximo = XP_POR_NIVEL[ficha.nivel + 1];
    const alinhamento = ALINHAMENTOS.find((a) => a.id === texto(ficha, "alinhamento"))?.nome;
    const estilo = ESTILOS_LUTA.find((e) => e.id === estiloLuta(ficha));
    const exaustao = nivelExaustao(ficha);
    const linhas = [
      `${ficha.nome} — ${nomes.especie} ${nomes.classe} nível ${ficha.nivel} (XP ${ficha.xp}${proximo ? `; próximo nível em ${proximo}` : ""})`,
      `Antecedente: ${antecedente?.nome ?? "—"}${talentos ? ` · Talentos: ${talentos}` : ""}${alinhamento ? ` · ${alinhamento}` : ""}${texto(ficha, "divindade") ? ` · Fé: ${texto(ficha, "divindade")}` : ""}`,
      `PV ${ficha.pv}/${ficha.pvMax} · CA ${ficha.defesa} · Iniciativa ${sinal(calcular(ficha, "Iniciativa").bonus)} · Deslocamento ${metrosTexto(deslocamento(ficha))} · Percepção passiva ${percepcaoPassiva} · Proficiência ${sinal(prof)} · ${ficha.dinheiro} po`,
      `Atributos: ${atributos}`,
      `Resistências: ${resistencias}`,
      `Perícias (★ = especialização): ${pericias || "nenhuma"}`,
      `Ataque: ${descricaoAtaque(ficha)}`,
      magia ? `Magia: ${magia}${magias.length ? ` · preparadas: ${magias.join(", ")}` : ""}` : "",
      invocacoes.length ? `Invocações: ${invocacoes.join(", ")}` : "",
      estilo ? `Estilo de Luta: ${estilo.nome} (${estilo.descricao})` : "",
      `Recursos: ${recursos || "nenhum"}`,
      `Características: ${caracteristicasAte(ficha).join("; ")}`,
      `Traços: ${tracosDaEspecie(ficha).join("; ")}`,
      `Inventário: ${ficha.inventario.join(", ") || "nada"}`,
      `Condições: ${ficha.condicoes.join(", ") || "nenhuma"}${exaustao ? ` (exaustão ${exaustao}: −${exaustao * 2} nos d20)` : ""}`,
      ficha.historia ? `História: ${ficha.historia}` : "",
    ];
    return linhas.filter(Boolean).join("\n");
  },

  blocosFicha(ficha): BlocoFicha[] {
    const nomes = nomeCompleto(ficha);
    const antecedente = antecedenteDe(ficha);
    const cd = cdMagia(ficha);
    const barras: BlocoFicha = {
      tipo: "barras",
      itens: [
        { rotulo: "PV", atual: ficha.pv, max: ficha.pvMax, cor: "vida" },
        ...Object.entries(ficha.recursos).map(([id, r]) => ({
          rotulo: r.rotulo,
          atual: r.atual,
          max: r.max,
          cor: /^(magia\d|pacto|arcano|feiticaria|foco)/.test(id) ? ("magia" as const) : ("outro" as const),
        })),
      ],
    };
    const combate: BlocoFicha = {
      tipo: "grade",
      itens: [
        { rotulo: "CA", valor: String(ficha.defesa) },
        { rotulo: "Iniciativa", valor: sinal(calcular(ficha, "Iniciativa").bonus) },
        { rotulo: "Deslocamento", valor: metrosTexto(deslocamento(ficha)) },
        { rotulo: "Proficiência", valor: sinal(proficiencia(ficha.nivel)) },
        { rotulo: "Percepção passiva", valor: String(10 + calcular(ficha, "Percepção").bonus) },
        ...(cd !== null ? [{ rotulo: "CD de magia", valor: String(cd), detalhe: `ataque ${sinal(calcular(ficha, "Magia").bonus)}` }] : []),
        { rotulo: "po", valor: String(ficha.dinheiro) },
      ],
    };
    const blocos: BlocoFicha[] = [
      barras,
      combate,
      {
        tipo: "grade",
        titulo: "Atributos (mod · resistência)",
        itens: ATRIBUTOS.map((a) => ({
          rotulo: a.abrev,
          valor: String(ficha.atributos[a.id] ?? 10),
          detalhe: `${sinal(mod(ficha, a.id))} · res ${sinal(calcular(ficha, `Resistência de ${a.nome}`).bonus)}`,
        })),
      },
      { tipo: "texto", titulo: "Ataque", texto: descricaoAtaque(ficha) + (cd !== null ? `\nMagia: ${descricaoMagia(ficha)}` : "") },
      {
        tipo: "etiquetas",
        titulo: "Perícias treinadas (★ especialização)",
        itens: PERICIAS.filter((p) => ficha.pericias[p.id]).map((p) => `${p.nome}${ficha.pericias[p.id] >= 2 ? " ★" : ""} ${sinal(calcular(ficha, p.nome).bonus)}`),
      },
      {
        tipo: "texto",
        titulo: "Origem",
        texto: [
          `${nomes.especie} · ${nomes.classe}`,
          antecedente ? `Antecedente: ${antecedente.nome}` : "",
          talentosDe(ficha).length ? `Talentos: ${talentosDe(ficha).map((t) => TALENTOS[t].nome).join(", ")}` : "",
          ALINHAMENTOS.find((a) => a.id === texto(ficha, "alinhamento"))?.nome ?? "",
          texto(ficha, "divindade") ? `Fé: ${texto(ficha, "divindade")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
      { tipo: "etiquetas", titulo: "Características de classe", itens: caracteristicasAte(ficha) },
      { tipo: "etiquetas", titulo: `Traços de ${especieDe(ficha).nome}`, itens: tracosDaEspecie(ficha) },
    ];
    const magias = lista(ficha, "magias");
    if (magias.length) blocos.push({ tipo: "lista", titulo: "Magias preparadas", itens: magias });
    const invocacoes = lista(ficha, "invocacoes");
    if (invocacoes.length) blocos.push({ tipo: "lista", titulo: "Invocações místicas", itens: invocacoes });
    blocos.push({ tipo: "lista", titulo: "Inventário", itens: ficha.inventario });
    if (ficha.condicoes.length) blocos.splice(1, 0, { tipo: "etiquetas", titulo: "Condições", itens: ficha.condicoes });
    return blocos;
  },

  xpParaNivel(nivel) {
    return XP_POR_NIVEL[nivel] ?? null;
  },

  subirNivel(original) {
    const ficha = clonar(original);
    const classe = classeDe(ficha);
    if (ficha.nivel >= 20) {
      sincronizarRecursos(ficha);
      return { ficha, resumo: `${ficha.nome} já está no 20º nível. Daqui pra frente, só lendas e dádivas épicas.` };
    }
    const conAntes = mod(ficha, "con");
    const caAntes = ficha.defesa;
    ficha.nivel = limitar(ficha.nivel + 1, 1, 20);
    const n = ficha.nivel;
    const novidades = caracteristicasNoNivel(ficha, n);
    const notas: string[] = [];

    if (aumentoNoNivel(classe, n)) notas.push(`Aumento de Atributo: ${aplicarAumento(ficha, classe)}`);
    if (n === 19) {
      // Dádiva Épica: +1 no atributo principal, que agora pode passar de 20 (até 30)
      const chave = classe.ordem[0];
      ficha.atributos[chave] = Math.min(30, (ficha.atributos[chave] ?? 10) + 1);
      notas.push(`Dádiva Épica: ${chave.toUpperCase()} +1`);
    }
    if (n === 20 && (classe.id === "barbaro" || classe.id === "monge")) {
      const [a, b] = classe.id === "barbaro" ? ["for", "con"] : ["des", "sab"];
      ficha.atributos[a] = Math.min(25, (ficha.atributos[a] ?? 10) + 4);
      ficha.atributos[b] = Math.min(25, (ficha.atributos[b] ?? 10) + 4);
      notas.push(`${a.toUpperCase()} e ${b.toUpperCase()} +4 (até 25)`);
    }
    if (n === 3 && temSubclasse(ficha, "conhecimento")) {
      const ganhas = ganharPericias(ficha, ["arcanismo", "historia", "intuicao", "investigacao", "medicina", "percepcao"], 3);
      if (ganhas.length) notas.push(`novas perícias: ${ganhas.map((id) => PERICIAS.find((p) => p.id === id)?.nome).join(", ")}`);
    }
    const especializacoes = aplicarEspecializacoes(ficha);
    if (especializacoes.length) notas.push(`especialização em ${especializacoes.join(", ")}`);

    // PV: média do dado + CON + extras; CON maior vale retroativamente; Resiliência Dracônica conta os níveis anteriores no 3º
    const conDepois = mod(ficha, "con");
    let ganho = Math.max(1, Math.floor(classe.dadoVida / 2) + 1 + conDepois) + pvExtraPorNivel(ficha);
    if (conDepois > conAntes) ganho += (conDepois - conAntes) * (n - 1);
    if (n === 3 && temSubclasse(ficha, "draconica")) ganho += 2;
    ficha.pvMax += ganho;
    ficha.pv = Math.min(ficha.pvMax, ficha.pv + ganho);

    ficha.defesa = Math.max(ficha.defesa, caCalculada(ficha));
    if (ficha.defesa > caAntes) notas.push(`CA ${caAntes} → ${ficha.defesa}`);
    const espacosAntes = Object.entries(original.recursos).filter(([id]) => /^magia\d|^pacto/.test(id)).map(([id, r]) => `${id}:${r.max}`).join();
    sincronizarRecursos(ficha);
    const espacos = Object.entries(ficha.recursos).filter(([id]) => /^magia\d|^pacto/.test(id));
    if (espacos.map(([id, r]) => `${id}:${r.max}`).join() !== espacosAntes && espacos.length) {
      notas.push(`espaços de magia: ${espacos.map(([, r]) => `${r.rotulo.replace("Magia ", "")} ${r.max}`).join(", ")}`);
    }
    if (proficiencia(n) > proficiencia(n - 1)) notas.push(`proficiência ${sinal(proficiencia(n))}`);

    const partes = [`+${ganho} PV máximos (agora ${ficha.pvMax})`, ...notas];
    if (novidades.length) partes.push(`novidades: ${novidades.join("; ")}`);
    return { ficha, resumo: `${ficha.nome} chegou ao nível ${n}: ${partes.join(" · ")}.` };
  },

  descansar(original, tipo) {
    const ficha = clonar(original);
    const classe = classeDe(ficha);
    sincronizarRecursos(ficha);

    if (tipo === "longo") {
      ficha.pv = ficha.pvMax;
      for (const [id, r] of Object.entries(ficha.recursos)) if (id !== "inspiracao") r.atual = r.max;
      if (especieDe(ficha).id === "humano" && ficha.recursos.inspiracao) ficha.recursos.inspiracao.atual = 1;
      // descanso longo tira 1 nível de exaustão e levanta quem estava caído a 0 PV
      const exaustao = nivelExaustao(ficha);
      ficha.condicoes = ficha.condicoes.filter((c) => !/inconsciente|estabilizad|morrendo|exaust/.test(normalizar(c)));
      if (exaustao > 1) ficha.condicoes.push(`exaustão ${exaustao - 1}`);
      const extra = exaustao ? ` Exaustão ${exaustao} → ${exaustao - 1}.` : "";
      return { ficha, resumo: `${ficha.nome} descansou a noite toda: PV, dados de vida e recursos restaurados.${extra}` };
    }

    // descanso curto: gasta dados de vida até encher os PV (ou acabarem os dados)
    const dados = ficha.recursos.dadosVida;
    const rolagens: number[] = [];
    let cura = 0;
    while (dados && dados.atual > 0 && ficha.pv + cura < ficha.pvMax) {
      dados.atual -= 1;
      const v = Math.max(1, somar(1, classe.dadoVida).total + mod(ficha, "con"));
      rolagens.push(v);
      cura += v;
    }
    ficha.pv = Math.min(ficha.pvMax, ficha.pv + cura);
    if (ficha.pv > 0) ficha.condicoes = ficha.condicoes.filter((c) => !/inconsciente|estabilizad/.test(normalizar(c)));
    const voltou = recuperarCurto(ficha);
    const arcana = recuperacaoArcana(ficha);
    if (arcana) voltou.push(arcana);
    const partes = [
      rolagens.length ? `gastou ${rolagens.length} dado(s) de vida e recuperou ${cura} PV (agora ${ficha.pv}/${ficha.pvMax})` : dados?.atual ? "não precisou de cura" : "sem dados de vida sobrando",
      voltou.length ? `recuperou ${voltou.join(", ")}` : "",
    ].filter(Boolean);
    return { ficha, resumo: `${ficha.nome} fez um descanso curto: ${partes.join("; ")}.` };
  },
};
