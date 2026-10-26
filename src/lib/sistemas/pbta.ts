import "server-only";
import { rolar, somar } from "../dados";
import { acharPorNome, clonar, distribuir, fichaBase, limitar, normalizar, sinal } from "./comum";
import {
  ALCANCES_GUERREIRO,
  ALINHAMENTOS,
  AREAS_BARDO,
  ARMAS_GUERREIRO,
  BENCAOS_PALADINO,
  CLASSES_DW,
  COMPANHEIROS,
  DOMINIOS,
  MAGIAS_MAGO,
  MELHORIAS_GUERREIRO,
  MOVIMENTOS_RACIAIS,
  MOVIMENTOS_RACIAIS_GENERICOS,
  MOVIMENTOS_ROLADOS,
  OBJETIVOS,
  RACAS,
  TERRAS_DRUIDA,
  TREINOS_COMPANHEIRO,
  VENENOS,
  VOTOS_PALADINO,
  type ClasseDW,
  type KitDW,
  type Movimento,
} from "./pbta/dados-dw";
import type { BlocoFicha, Ficha, GrauSucesso, OpcaoCriacao, PedidoTeste, ResultadoTeste, Sistema } from "./tipos";

// Dungeon World (Powered by the Apocalypse), Creative Commons BY 3.0 — Sage LaTorra e Adam Koebel.
// Teste = 2d6 + modificador: 10+ sucesso, 7-9 sucesso com custo, 6- o mestre faz um movimento (e o jogador marca XP).
// XP fica acumulado em ficha.xp (xpParaNivel devolve o total acumulado) e é espelhado no recurso "xp",
// para o mestre poder marcar XP com alterar_ficha({recursos: {xp: 1}}).

const ATRIBUTOS = [
  { id: "for", nome: "Força", abrev: "FOR" },
  { id: "des", nome: "Destreza", abrev: "DES" },
  { id: "con", nome: "Constituição", abrev: "CON" },
  { id: "int", nome: "Inteligência", abrev: "INT" },
  { id: "sab", nome: "Sabedoria", abrev: "SAB" },
  { id: "car", nome: "Carisma", abrev: "CAR" },
];

/** Debilidades do DW: cada uma tira 1 do modificador do atributo. Guardadas em ficha.condicoes. */
const DEBILIDADES: Record<string, string> = { for: "Fraco", des: "Trêmulo", con: "Doente", int: "Atordoado", sab: "Confuso", car: "Marcado" };

const MATRIZ = [16, 15, 13, 12, 9, 8];
const NIVEL_MAX = 10;

/** Modificadores do DW: 1-3 −3, 4-5 −2, 6-8 −1, 9-12 0, 13-15 +1, 16-17 +2, 18 +3. */
export function modDW(valor: number): number {
  if (valor <= 3) return -3;
  if (valor <= 5) return -2;
  if (valor <= 8) return -1;
  if (valor <= 12) return 0;
  if (valor <= 15) return 1;
  if (valor <= 17) return 2;
  return 3;
}

function classeDe(ficha: Ficha): ClasseDW {
  return CLASSES_DW.find((c) => c.id === ficha.classe) ?? CLASSES_DW[0];
}

function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function listaTexto(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return typeof v === "string" && v ? [v] : [];
}

function debilitado(ficha: Ficha, atributo: string): boolean {
  const alvo = normalizar(DEBILIDADES[atributo] ?? "");
  return ficha.condicoes.some((c) => normalizar(c) === alvo || normalizar(c).startsWith(`${alvo} `));
}

function modAtributo(ficha: Ficha, atributo: string): number {
  return modDW(ficha.atributos[atributo] ?? 10) - (debilitado(ficha, atributo) ? 1 : 0);
}

function kitDe(ficha: Ficha, classe = classeDe(ficha)): KitDW {
  return classe.kits.find((k) => k.id === ficha.extras.kit) ?? classe.kits[0];
}

function movimentoRacial(ficha: Ficha): { movimento: Movimento; doLivro: boolean } {
  const doLivro = MOVIMENTOS_RACIAIS[ficha.classe]?.[ficha.ancestralidade];
  if (doLivro) return { movimento: doLivro, doLivro: true };
  return { movimento: MOVIMENTOS_RACIAIS_GENERICOS[ficha.ancestralidade] ?? MOVIMENTOS_RACIAIS_GENERICOS.humano, doLivro: false };
}

/** Movimentos avançados ativos (os substituídos por versões maiores saem da lista). */
function avancadosDe(ficha: Ficha, classe = classeDe(ficha)): Movimento[] {
  const ids = listaTexto(ficha.extras.movimentosAvancados);
  const todos = [...classe.avancados25, ...classe.avancados610].filter((m) => ids.includes(m.id));
  const substituidos = new Set(todos.map((m) => m.substitui).filter(Boolean));
  return todos.filter((m) => !substituidos.has(m.id));
}

function armaduraDosMovimentos(movimentos: Movimento[]): number {
  return movimentos.reduce((s, m) => s + (m.armadura ?? 0), 0);
}

/** Dano fixo extra: arma do kit (+1) e melhorias da arma característica do guerreiro. */
function bonusDanoFixo(ficha: Ficha, classe = classeDe(ficha)): number {
  const melhorias = listaTexto(ficha.extras.arma_melhorias);
  const daArma = MELHORIAS_GUERREIRO.filter((m) => melhorias.includes(m.id)).reduce((s, m) => s + (m.bonusDano ?? 0), 0);
  return (kitDe(ficha, classe).bonusDano ?? 0) + (classe.id === "guerreiro" ? daArma : 0);
}

/** Expressão de dano da ficha: dado da classe + dados extras de movimentos + bônus fixo. */
function danoDe(ficha: Ficha, modo: "normal" | "vantagem" | "desvantagem" = "normal", extra = 0): string {
  const classe = classeDe(ficha);
  const base = modo === "vantagem" ? `2d${classe.dano}kh1` : modo === "desvantagem" ? `2d${classe.dano}kl1` : `1d${classe.dano}`;
  const dados = avancadosDe(ficha, classe)
    .map((m) => m.danoExtra)
    .filter(Boolean)
    .map((x) => `+${x}`)
    .join("");
  const fixo = bonusDanoFixo(ficha, classe) + extra;
  return `${base}${dados}${fixo ? sinal(fixo) : ""}`;
}

function cargaMax(ficha: Ficha): number {
  return classeDe(ficha).cargaBase + modDW(ficha.atributos.for ?? 10);
}

function pvMaxDe(ficha: Ficha): number {
  return Math.max(1, classeDe(ficha).pvBase + (ficha.atributos.con ?? 10));
}

function conjurador(classe: ClasseDW): boolean {
  return classe.id === "clerigo" || classe.id === "mago";
}

// --- XP: acumulado em ficha.xp, espelhado no recurso "xp" (marcas dentro do nível atual) ---

function xpAcumulado(nivel: number): number {
  let total = 0;
  for (let n = 1; n < Math.min(nivel, NIVEL_MAX + 1); n++) total += n + 7;
  return total;
}

/** Junta o que foi marcado pelo recurso com ficha.xp e reescreve os dois de forma coerente. */
function sincronizarXp(ficha: Ficha) {
  const base = xpAcumulado(ficha.nivel);
  const marcas = ficha.recursos.xp?.atual ?? 0;
  ficha.xp = Math.max(ficha.xp, base + marcas);
  const max = ficha.nivel + 7;
  ficha.recursos.xp = { rotulo: "XP", atual: limitar(ficha.xp - base, 0, max), max };
}

function prontoParaSubir(ficha: Ficha): boolean {
  return ficha.nivel < NIVEL_MAX && ficha.xp >= xpAcumulado(ficha.nivel + 1);
}

// --- interpretação de pedido.teste ---

// A ordem importa: movimentos de classe e nomes compostos antes dos genéricos ("Jornada Perigosa" não é Desafiar o Perigo).
const ALIASES: [RegExp, string][] = [
  [/arte arcana|cancao|apresenta/, "arte_arcana"],
  [/expuls|mortos-vivos|mortos vivos/, "expulsar"],
  [/metamorf|forma animal|transforma/, "metamorfose"],
  [/dobrar|erguer port|forca bruta/, "dobrar"],
  [/impor|maos/, "impor_maos"],
  [/sou a lei|\blei\b/, "lei"],
  [/rastre|cacar/, "rastrear"],
  [/tiro certeiro|called shot/, "tiro_certeiro"],
  [/armadilh/, "armadilhas"],
  [/truque|fechadura|carteira|punga|furt/, "truques"],
  [/pelas costas|backstab|apunhal/, "golpe_costas"],
  [/ultim[ao] (respira|suspiro)|last breath/, "ultimo"],
  [/jornada|viagem/, "jornada"],
  [/montar guarda|vigi/, "vigia"],
  [/^golpe|retalh|hack|corpo a corpo/, "golpear"],
  [/dispar|volley|atirar|arco|flecha|arremess|distancia/, "disparar"],
  [/desafi|defy|perigo|esquiv|resist|salva/, "desafiar"],
  [/defend|proteg/, "defender"],
  [/saber das|spout|conhecimento|lembrar/, "saber"],
  [/discern|perceb|investig|notar|percep/, "discernir"],
  [/negoci|parley|persua|convenc|barganh/, "negociar"],
  [/recrut/, "recrutar"],
  [/farr|festa|carous/, "farrear"],
  [/abastec|suprir|compr/, "suprir"],
];

/** Movimentos de classe (os que vêm depois dos básicos na lista). */
const MOVIMENTOS_DE_CLASSE = new Set(MOVIMENTOS_ROLADOS.slice(MOVIMENTOS_ROLADOS.findIndex((m) => m.id === "arte_arcana")).map((m) => m.id));

/** Acha um atributo citado no texto: "(DES)", "+SAB", "com Força"... */
function atributoNoTexto(nome: string): string | null {
  const explicito = nome.match(/(?:\(|\+)\s*([a-z]+)/);
  const candidatos = explicito ? [explicito[1], nome] : [nome];
  for (const c of candidatos) {
    for (const a of ATRIBUTOS) {
      const abrev = normalizar(a.abrev);
      const cheio = normalizar(a.nome);
      if (c === abrev || c === cheio || new RegExp(`\\b(${abrev}|${cheio})\\b`).test(c)) return a.id;
    }
  }
  return null;
}

type Plano =
  | { tipo: "dano" }
  | { tipo: "rolagem"; movimento: string | null; rotulo: string; atributo: string | null; nota?: string };

function planejar(ficha: Ficha, teste: string): Plano {
  const nome = normalizar(teste);
  const classe = classeDe(ficha);
  const atributo = atributoNoTexto(nome);
  const def = (id: string) => MOVIMENTOS_ROLADOS.find((m) => m.id === id)!;
  const mover = (id: string, nota?: string): Plano => {
    const m = def(id);
    let attr = m.atributo || null;
    if (id === "conjurar") attr = classe.id === "clerigo" ? "sab" : "int";
    if (atributo && id !== "ultimo" && id !== "ajudar") attr = atributo;
    const rotulo = id === "desafiar" || (atributo && atributo !== m.atributo && attr) ? `${m.nome} (${attr?.toUpperCase()})` : m.nome;
    const semAtributo = id === "desafiar" && !atributo && !nota ? "sem atributo no pedido: usei DES" : undefined;
    return { tipo: "rolagem", movimento: id, rotulo, atributo: attr, nota: [nota, semAtributo].filter(Boolean).join(" · ") || undefined };
  };

  if (/^dano|^rolar dano/.test(nome)) return { tipo: "dano" };
  if (/ajud|atrapalh|\baid\b|interfer/.test(nome)) return mover("ajudar");
  if (/^iniciativa/.test(nome)) return mover("desafiar", "Dungeon World não tem iniciativa: rolado como Desafiar o Perigo; a ficção decide quem age.");
  if (/^(ataque|atacar)/.test(nome)) {
    if (/costas|surpres|indefes/.test(nome) && classe.id === "ladrao") return mover("golpe_costas");
    return mover(/dist|arco|flecha|dispar|arremess|besta/.test(nome) ? "disparar" : "golpear");
  }
  if (/^(magia|conjur|feiti|lancar|prece|rezar)/.test(nome)) {
    if (conjurador(classe)) return mover("conjurar");
    if (classe.id === "bardo") return mover("arte_arcana");
    if (classe.id === "druida") return mover("metamorfose");
    return { tipo: "rolagem", movimento: null, rotulo: `Magia (+${classe.atributoChave.toUpperCase()})`, atributo: classe.atributoChave, nota: `${classe.nome} não tem movimento de magia: rolado com o atributo-chave.` };
  }

  const direto = MOVIMENTOS_ROLADOS.find((m) => normalizar(m.id) === nome || normalizar(m.nome) === nome) ?? acharPorNome(MOVIMENTOS_ROLADOS, teste);
  if (direto) return mover(direto.id);
  const alias = ALIASES.find(([re]) => re.test(nome));
  if (alias) return mover(alias[1]);

  if (atributo) {
    const a = ATRIBUTOS.find((x) => x.id === atributo)!;
    return { tipo: "rolagem", movimento: null, rotulo: `Rolar +${a.abrev}`, atributo };
  }
  return { tipo: "rolagem", movimento: null, rotulo: teste, atributo: null, nota: "Movimento não reconhecido: rolado sem atributo." };
}

/** Ajudar ou Atrapalhar: conta os vínculos que citam a pessoa nomeada no pedido (máx. +3). */
function vinculosCom(ficha: Ficha, teste: string): { bonus: number; nome: string | null } {
  const resto = normalizar(teste)
    .replace(/ajudar ou atrapalhar|ajudar|atrapalhar|aid|interferir|interfere/g, " ")
    .replace(/[(),:+-]/g, " ")
    .split(" ")
    .filter((p) => p.length > 2 && !["com", "para", "contra", "sobre", "que", "uma", "dos", "das"].includes(p));
  if (!resto.length) return { bonus: 0, nome: null };
  const nome = resto[0];
  const bonus = listaTexto(ficha.extras.vinculos).filter((v) => normalizar(v).includes(nome)).length;
  return { bonus: Math.min(3, bonus), nome };
}

const RESULTADOS: Record<string, { sucesso: string; parcial: string }> = {
  desafiar: { sucesso: "faz o que pretendia, a ameaça não se concretiza", parcial: "consegue, mas o mestre oferece um resultado pior, uma barganha difícil ou uma escolha feia" },
  golpear: { sucesso: "causa dano e evita o contra-ataque (ou +1d6 de dano aceitando o troco)", parcial: "causa dano e o inimigo ataca você" },
  disparar: { sucesso: "acerta e causa dano", parcial: "acerta, mas escolha: se expor ao perigo, gastar munição ou causar −1d6" },
  defender: { sucesso: "3 de reserva para redirecionar ataques, dividir o dano ou abrir brecha", parcial: "1 de reserva" },
  saber: { sucesso: "o mestre conta algo interessante e útil", parcial: "o mestre conta algo interessante; tornar útil é com você" },
  discernir: { sucesso: "faça 3 perguntas da lista (+1 adiante ao agir sobre as respostas)", parcial: "faça 1 pergunta da lista" },
  negociar: { sucesso: "fazem o que você pede com a promessa da alavanca", parcial: "fazem, mas exigem garantia concreta antes" },
  ajudar: { sucesso: "o aliado ganha +1 (ou o alvo −2) no teste", parcial: "o efeito vale, mas você se expõe ao perigo ou às consequências" },
  ultimo: { sucesso: "você escapa da Morte, com 0 PV mas vivo", parcial: "a Morte oferece um acordo; aceite ou morra" },
};

function rotuloDoGrau(grau: GrauSucesso, movimento: string | null): string {
  if (movimento === "ultimo") return grau === "sucesso" ? "Você escapa da Morte" : grau === "parcial" ? "A Morte propõe um acordo" : "Seu tempo acabou";
  if (grau === "sucesso") return "Sucesso";
  if (grau === "parcial") return "Sucesso com custo";
  return "Falha — o mestre faz um movimento; marque XP";
}

function rolarDano(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
  const classe = classeDe(ficha);
  const modo = pedido.modo ?? "normal";
  const expressao = danoDe(ficha, modo, pedido.modificador ?? 0);
  const r = rolar(expressao);
  const dados = r.partes.flatMap((p) => ("valores" in p ? p.valores : []));
  const bonus = r.partes.reduce((s, p) => s + ("constante" in p ? p.subtotal : 0), 0);
  const armadura = pedido.alvo ?? null;
  const final = armadura === null ? r.total : Math.max(0, r.total - armadura);
  const detalhes = [
    modo === "vantagem" ? "melhor de dois dados de dano" : modo === "desvantagem" ? "pior de dois dados de dano" : "",
    armadura !== null ? `${r.total} − ${armadura} de armadura = ${final}` : "subtraia a armadura do alvo",
    ficha.classe === "ladrao" && ficha.ancestralidade === "halfling" ? "halfling: +2 se for à distância" : "",
  ].filter(Boolean);
  return {
    tipo: "teste",
    sistema: "pbta",
    personagem: ficha.nome,
    motivo: pedido.motivo,
    teste: `Dano (d${classe.dano})`,
    expressao: r.expressao,
    dados,
    natural: null,
    bonus,
    total: final,
    alvo: armadura,
    grau: "sucesso",
    sucesso: true,
    rotuloGrau: `Dano: ${final}`,
    detalhes: detalhes.join(" · "),
    margem: armadura === null ? null : r.total - armadura,
  };
}

function resolver(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
  const plano = planejar(ficha, pedido.teste);
  if (plano.tipo === "dano") return rolarDano(ficha, pedido);

  const modo = pedido.modo ?? "normal";
  const partes: string[] = [];
  let bonus = 0;
  if (plano.atributo) {
    bonus += modAtributo(ficha, plano.atributo);
    const a = ATRIBUTOS.find((x) => x.id === plano.atributo)!;
    partes.push(`${a.abrev} ${sinal(modDW(ficha.atributos[a.id] ?? 10))}`);
    if (debilitado(ficha, a.id)) partes.push(`−1 (${DEBILIDADES[a.id]})`);
  }
  if (plano.movimento === "ajudar") {
    const v = vinculosCom(ficha, pedido.teste);
    bonus += v.bonus;
    partes.push(v.nome ? `vínculo com ${v.nome} ${sinal(v.bonus)}` : "sem nome no pedido: +0 de vínculo");
  }
  if (modo !== "normal") {
    bonus += modo === "vantagem" ? 1 : -1;
    partes.push(modo === "vantagem" ? "+1 adiante (vantagem)" : "−1 adiante (desvantagem)");
  }
  if (pedido.modificador) {
    bonus += pedido.modificador;
    partes.push(`${sinal(pedido.modificador)} circunstancial`);
  }

  const dados = somar(2, 6).valores;
  const total = dados[0] + dados[1] + bonus;
  const grau: GrauSucesso = total >= 10 ? "sucesso" : total >= 7 ? "parcial" : "falha";

  const efeito = plano.movimento ? RESULTADOS[plano.movimento] : undefined;
  if (efeito && grau !== "falha") partes.push(grau === "sucesso" ? efeito.sucesso : efeito.parcial);
  if (grau !== "falha" && (plano.movimento === "golpear" || plano.movimento === "disparar" || plano.movimento === "golpe_costas")) {
    partes.push(`dano ${danoDe(ficha)}`);
  }
  if (plano.movimento === "disparar" && grau === "parcial" && ficha.recursos.municao) partes.push("se gastar munição: recurso municao −1");
  if (total >= 12 && plano.movimento !== "ultimo") partes.push("12+: movimentos avançados podem dar efeito extra");
  if (grau === "falha" && plano.movimento !== "ultimo") partes.push("marque 1 XP (alterar_ficha recursos {xp: 1})");
  if (pedido.alvo !== null && pedido.alvo !== undefined) partes.push("Dungeon World não usa CD: alvo ignorado");
  if (plano.nota) partes.push(plano.nota);
  if (plano.movimento && MOVIMENTOS_DE_CLASSE.has(plano.movimento) && !ficha.pericias[plano.movimento]) {
    partes.push("este movimento não é da classe do personagem");
  }

  return {
    tipo: "teste",
    sistema: "pbta",
    personagem: ficha.nome,
    motivo: pedido.motivo,
    teste: plano.rotulo,
    expressao: `2d6${bonus ? sinal(bonus) : ""}`,
    dados,
    natural: null,
    bonus,
    total,
    alvo: null,
    grau,
    sucesso: grau !== "falha",
    rotuloGrau: rotuloDoGrau(grau, plano.movimento),
    detalhes: partes.join(" · ") || undefined,
    margem: null,
  };
}

// --- opções de criação ---

function opcoesCriacao(): OpcaoCriacao[] {
  const porClasse: OpcaoCriacao[] = CLASSES_DW.flatMap((c): OpcaoCriacao[] => [
    {
      id: `alinhamento_${c.id}`,
      rotulo: "Alinhamento",
      ajuda: "Cumprir o objetivo do alinhamento numa sessão vale 1 XP no fim dela.",
      tipo: "escolha",
      classes: [c.id],
      opcoes: c.alinhamentos.map((a) => ({ id: a, nome: ALINHAMENTOS.find((x) => x.id === a)!.nome, descricao: OBJETIVOS[c.id]?.[a] })),
    },
    {
      id: `kit_${c.id}`,
      rotulo: "Equipamento inicial",
      ajuda: `Sempre leva: ${[...c.equipamentoFixo, ...(c.racoes ? [`rações (${c.racoes} usos)`] : [])].join(", ")}.`,
      tipo: "escolha",
      classes: [c.id],
      opcoes: c.kits.map((k) => ({ id: k.id, nome: k.nome, descricao: `Armadura ${k.armadura}${k.moedas ? `, ${k.moedas} moedas` : ""}.` })),
    },
  ]);
  return [
    ...porClasse,
    { id: "area_bardo", rotulo: "Saber Bárdico — área de conhecimento", tipo: "escolha", classes: ["bardo"], opcoes: AREAS_BARDO },
    { id: "instrumento", rotulo: "Instrumento", ajuda: "Alaúde, flauta, tambor de guerra... ou um apito irritante.", tipo: "texto", classes: ["bardo"] },
    { id: "divindade", rotulo: "Nome da divindade", ajuda: "Invente o seu deus; os da taverna estão todos de folga.", tipo: "texto", classes: ["clerigo"] },
    { id: "dominio", rotulo: "Domínio da divindade", tipo: "escolha", classes: ["clerigo"], opcoes: DOMINIOS },
    { id: "preceito", rotulo: "Preceito da fé", ajuda: "O que seu deus exige: sacrifício, caridade, conversão, silêncio...", tipo: "texto", classes: ["clerigo"] },
    { id: "terra", rotulo: "Sua terra", ajuda: "Você assume formas de animais desta terra.", tipo: "escolha", classes: ["druida"], opcoes: TERRAS_DRUIDA },
    { id: "marca", rotulo: "Marca da terra", ajuda: "Um traço físico que entrega de onde você vem: olhos de musgo, cheiro de maresia...", tipo: "texto", classes: ["druida"] },
    { id: "arma_base", rotulo: "Arma característica — forma", tipo: "escolha", classes: ["guerreiro"], opcoes: ARMAS_GUERREIRO },
    { id: "arma_alcance", rotulo: "Arma característica — alcance", tipo: "escolha", classes: ["guerreiro"], opcoes: ALCANCES_GUERREIRO },
    { id: "arma_melhorias", rotulo: "Arma característica — melhorias", tipo: "multipla", max: 2, classes: ["guerreiro"], opcoes: MELHORIAS_GUERREIRO.map(({ id, nome, descricao }) => ({ id, nome, descricao })) },
    { id: "arma_nome", rotulo: "Nome da arma", ajuda: "Toda arma que se preze tem nome. \"Dona Lurdes\" vale.", tipo: "texto", classes: ["guerreiro"] },
    { id: "missao", rotulo: "Missão", ajuda: "O que você jurou fazer: destruir um mal, proteger alguém, achar uma verdade.", tipo: "texto", classes: ["paladino"] },
    { id: "bencaos", rotulo: "Bênçãos da missão", tipo: "multipla", max: 2, classes: ["paladino"], opcoes: BENCAOS_PALADINO },
    { id: "votos", rotulo: "Votos", tipo: "multipla", max: 3, classes: ["paladino"], opcoes: VOTOS_PALADINO },
    { id: "companheiro", rotulo: "Companheiro animal", tipo: "escolha", classes: ["patrulheiro"], opcoes: COMPANHEIROS },
    { id: "companheiro_nome", rotulo: "Nome do companheiro", tipo: "texto", classes: ["patrulheiro"] },
    { id: "companheiro_treinos", rotulo: "Treinado para", tipo: "multipla", max: 2, classes: ["patrulheiro"], opcoes: TREINOS_COMPANHEIRO },
    { id: "veneno", rotulo: "Veneno dominado", tipo: "escolha", classes: ["ladrao"], opcoes: VENENOS },
    { id: "grimorio", rotulo: "Grimório — três magias de 1º nível", tipo: "multipla", max: 3, classes: ["mago"], opcoes: MAGIAS_MAGO },
    {
      id: "vinculos",
      rotulo: "Vínculos",
      ajuda: "Uma frase por vínculo, citando o colega pelo nome (\"Fulano me deve a vida\"). Cada vínculo com alguém dá +1 para Ajudar ou Atrapalhar essa pessoa.",
      tipo: "lista-texto",
      max: 6,
    },
    { id: "aparencia", rotulo: "Aparência", ajuda: "Olhos, cabelo, roupa, corpo — o que o mundo vê primeiro.", tipo: "texto" },
  ];
}

/** Junta as respostas do formulário (com sufixo de classe) em chaves canônicas. */
function extrasCanonicos(classe: ClasseDW, brutos: Record<string, unknown>): Record<string, unknown> {
  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(brutos)) {
    if (/^(alinhamento|kit)_/.test(k)) continue;
    extras[k] = v;
  }
  const alinhamento = texto(brutos[`alinhamento_${classe.id}`]) || texto(brutos.alinhamento);
  extras.alinhamento = classe.alinhamentos.includes(alinhamento) ? alinhamento : classe.alinhamentos[0];
  const kit = texto(brutos[`kit_${classe.id}`]) || texto(brutos.kit);
  extras.kit = classe.kits.some((k) => k.id === kit) ? kit : classe.kits[0].id;
  extras.vinculos = listaTexto(brutos.vinculos).slice(0, 6);
  extras.movimentosAvancados = listaTexto(brutos.movimentosAvancados);
  if (classe.id === "guerreiro") {
    extras.arma_base = texto(brutos.arma_base) || "espada";
    extras.arma_alcance = texto(brutos.arma_alcance) || "proximo";
    extras.arma_melhorias = listaTexto(brutos.arma_melhorias).slice(0, 2);
  }
  if (classe.id === "mago" && !listaTexto(brutos.grimorio).length) extras.grimorio = ["missil", "detectar", "enfeiticar"];
  if (classe.id === "ladrao" && !texto(brutos.veneno)) extras.veneno = VENENOS[0].id;
  if (classe.id === "clerigo" && !texto(brutos.dominio)) extras.dominio = DOMINIOS[0].id;
  if (classe.id === "druida" && !texto(brutos.terra)) extras.terra = TERRAS_DRUIDA[0].id;
  if (classe.id === "bardo" && !texto(brutos.area_bardo)) extras.area_bardo = AREAS_BARDO[0].id;
  if (classe.id === "patrulheiro" && !texto(brutos.companheiro)) extras.companheiro = COMPANHEIROS[0].id;
  return extras;
}

function nomeDe(lista: { id: string; nome: string }[], id: unknown): string {
  return lista.find((x) => x.id === id)?.nome ?? texto(id);
}

function descricaoArma(ficha: Ficha): string {
  const melhorias = MELHORIAS_GUERREIRO.filter((m) => listaTexto(ficha.extras.arma_melhorias).includes(m.id)).map((m) => m.nome.toLowerCase());
  const base = nomeDe(ARMAS_GUERREIRO, ficha.extras.arma_base).toLowerCase();
  const nome = texto(ficha.extras.arma_nome);
  return `${nome ? `${nome}, ` : ""}${base} (${nomeDe(ALCANCES_GUERREIRO, ficha.extras.arma_alcance).toLowerCase()}${melhorias.length ? `; ${melhorias.join(", ")}` : ""})`;
}

/** Textos das escolhas de classe para a ficha e para o mestre. */
function escolhasDeClasse(ficha: Ficha): { titulo: string; texto: string }[] {
  const e = ficha.extras;
  switch (ficha.classe) {
    case "bardo":
      return [{ titulo: "Saber Bárdico", texto: `${nomeDe(AREAS_BARDO, e.area_bardo)}${texto(e.instrumento) ? ` · instrumento: ${texto(e.instrumento)}` : ""}` }];
    case "clerigo": {
      const dominio = DOMINIOS.find((d) => d.id === e.dominio);
      return [{ titulo: "Divindade", texto: `${texto(e.divindade) || "Deus sem nome (ainda)"} — ${dominio?.nome ?? "?"}. ${dominio?.descricao ?? ""}${texto(e.preceito) ? ` Preceito: ${texto(e.preceito)}.` : ""}` }];
    }
    case "druida":
      return [{ titulo: "Terra", texto: `${nomeDe(TERRAS_DRUIDA, e.terra)}${texto(e.marca) ? ` · marca: ${texto(e.marca)}` : ""}` }];
    case "guerreiro":
      return [{ titulo: "Arma característica", texto: descricaoArma(ficha) }];
    case "paladino":
      return [{
        titulo: "Missão",
        texto: `${texto(e.missao) || "ainda não jurada"} · bênçãos: ${listaTexto(e.bencaos).map((b) => nomeDe(BENCAOS_PALADINO, b)).join("; ") || "nenhuma"} · votos: ${listaTexto(e.votos).map((v) => nomeDe(VOTOS_PALADINO, v)).join("; ") || "nenhum"}`,
      }];
    case "patrulheiro":
      return [{
        titulo: "Companheiro animal",
        texto: `${texto(e.companheiro_nome) || "Sem nome"}, ${nomeDe(COMPANHEIROS, e.companheiro).toLowerCase()} · treinado para: ${listaTexto(e.companheiro_treinos).map((t) => nomeDe(TREINOS_COMPANHEIRO, t).toLowerCase()).join(", ") || "nada ainda"}`,
      }];
    case "ladrao": {
      const v = VENENOS.find((x) => x.id === e.veneno);
      return [{ titulo: "Veneno", texto: v ? `${v.nome}: ${v.descricao}` : "nenhum" }];
    }
    case "mago":
      return [{ titulo: "Grimório", texto: `${listaTexto(e.grimorio).map((g) => nomeDe(MAGIAS_MAGO, g)).join(", ")} + truques (Luz, Servo Invisível, Prestidigitação)` }];
    default:
      return [];
  }
}

function alinhamentoTexto(ficha: Ficha): string {
  const id = texto(ficha.extras.alinhamento);
  const nome = ALINHAMENTOS.find((a) => a.id === id)?.nome ?? "—";
  const objetivo = OBJETIVOS[ficha.classe]?.[id];
  return objetivo ? `${nome}: ${objetivo}` : nome;
}

const REGRAS = `Sistema: Dungeon World (Powered by the Apocalypse). Você é o MC (mestre de cerimônias).
AGENDA: retrate um mundo fantástico; encha a vida dos personagens de aventura; jogue para descobrir o que acontece (não tenha roteiro).
PRINCÍPIOS: desenhe mapas e deixe espaços em branco; fale com os personagens, não com os jogadores; abrace o fantástico; faça movimentos que nascem da ficção; NUNCA diga o nome do seu movimento (narre o efeito); dê vida a cada monstro e nome a cada pessoa; faça perguntas e use as respostas; seja fã dos personagens; pense nos perigos fora da tela; COMECE E TERMINE COM A FICÇÃO: o jogador descreve o que faz, o movimento só dispara se a ficção pedir, e o resultado volta para a narração.

TESTES (teste ou pedir_teste): 2d6 + modificador do atributo. 10+ sucesso pleno; 7-9 sucesso com custo (complicação, escolha difícil, preço); 6- falha: você faz um movimento DURO e o jogador marca 1 XP.
- Não há CD: deixe alvo vazio (null; no pedir_teste, que exige número, mande 0, é ignorado). Use modo "vantagem"/"desvantagem" para +1/−1 adiante e "modificador" para outros bônus (+1 adiante de Discernir, −1 contínuo de magia etc.).
- Movimentos básicos (passe o nome em teste): "Desafiar o Perigo (DES)" — troque o atributo pelo jeito de enfrentar: FOR na marra, DES ligeireza, CON aguentar, INT raciocínio, SAB nervos, CAR charme; "Golpear e Retalhar" (FOR, corpo a corpo; 7-9 o inimigo acerta de volta); "Disparar" (DES, distância; 7-9 escolha: se expor, gastar munição, −1d6); "Defender" (CON); "Saber das Coisas" (INT); "Discernir Realidades" (SAB); "Negociar" (CAR, exige alavanca); "Ajudar Fulano" ou "Atrapalhar Fulano" (+Vínculo com Fulano); "Última Respiração" (2d6 puro ao chegar a 0 PV); "Jornada Perigosa", "Montar Guarda" (SAB); "Recrutar", "Farrear", "Abastecer-se" (CAR).
- Movimentos de classe: "Arte Arcana", "Expulsar Mortos-Vivos", "Conjurar Magia", "Metamorfose", "Dobrar Barras", "Impor as Mãos", "Eu Sou a Lei", "Caçar e Rastrear", "Tiro Certeiro", "Especialista em Armadilhas", "Truques do Ofício", "Golpe pelas Costas". "Ataque" vira Golpear e Retalhar (ou Disparar se citar arco/distância); "Magia" vira o movimento mágico da classe; um atributo sozinho ("SAB") rola +SAB; "Iniciativa" não existe (é Desafiar o Perigo e a ficção decide).
- Um atributo entre parênteses troca o atributo de qualquer movimento quando um movimento especial permitir: "Negociar (FOR)".

MOVIMENTOS DO MESTRE (escolha um quando todos olham para você, num 6- ou quando os jogadores te dão uma oportunidade de ouro): usar um movimento de monstro, perigo ou local; revelar uma verdade indesejada; mostrar sinais de uma ameaça chegando; causar dano; gastar os recursos deles; virar o movimento deles contra eles; separá-los; dar uma oportunidade que combine com uma classe; mostrar uma desvantagem da classe, raça ou equipamento; oferecer uma oportunidade, com ou sem custo; pôr alguém numa enrascada; dizer as consequências e perguntar "o que você faz?". SUAVE = anuncia o perigo e dá chance de reagir; DURO = consequência imediata (normalmente após 6-). Termine sempre perguntando o que eles fazem.

COMBATE: sem turnos nem iniciativa; passe o holofote. Inimigos não rolam para acertar: o dano deles vem como movimento do mestre (num 7-9 de Golpear, num 6-, ou quando ignoram a ameaça). Dano do personagem: teste "Dano" (dado da classe + bônus; vantagem = melhor de dois dados; passe a armadura do alvo em alvo) ou rolar_dados. Armadura reduz dano recebido. Dano dos monstros: d6 fraco, d8 comum, d10 forte, d12 brutal (+1d4 a +4 se perigoso). PV dos monstros: horda 3, grupo 6, solitário 12 (+4 grande, +8 enorme); armadura 0-4. Aplique dano nos personagens com alterar_ficha (pv negativo, já descontada a armadura da ficha). A 0 PV: teste "Última Respiração".
DEBILIDADES (−1 no atributo, via adicionar_condicoes): Fraco (FOR), Trêmulo (DES), Doente (CON), Atordoado (INT), Confuso (SAB), Marcado (CAR). Use como alternativa a dano em movimentos duros.

RECURSOS (ids para alterar_ficha): xp (marque +1 a cada 6- e no fim da sessão), racoes (Acampar gasta 1), municao (gasta num 7-9 de Disparar), usos (equipamento de aventura), magia (níveis de magia preparados do clérigo/mago: soma ≤ nível+1; num 7-9 de Conjurar a magia pode ser perdida — tire o nível dela), veneno (doses do ladrão), forma (reserva da Metamorfose do druida: o resultado do teste define 1-3).
XP NO FIM DA SESSÃO: +1 por cada "sim" — aprendemos algo novo e importante sobre o mundo? superamos um monstro ou inimigo notável? saqueamos um tesouro memorável? — +1 se o personagem cumpriu o objetivo do alinhamento e +1 por vínculo resolvido. Subir de nível exige nível+7 XP (o recurso xp cheio), num lugar seguro ou ao Acampar: +1 num atributo, um movimento avançado e PV recalculado (PV = base da classe + valor de CON). Nível máximo 10.
DESCANSO: "curto" = Acampar (gasta 1 ração, cura metade do PV máximo, conjuradores preparam magias); "longo" = Recuperar (dias de repouso em segurança: PV cheio e remove uma debilidade).

COMO MESTRAR DUNGEON WORLD
- Quando fazer movimento: SUAVE quando todos olham para você ou a ficção pede (anuncie o perigo e pergunte "o que você faz?"); DURO num 6- ou quando o jogador ignora uma ameaça já anunciada. Um 6- nunca é "nada acontece": a situação piora agora, e o jogador marca XP (alterar_ficha recursos {"xp": 1}).
- 7-9 é sucesso com custo de verdade: ofereça uma escolha difícil, um preço, um resultado menor ou uma complicação. Escolha pela ficção, não por regra.
- O movimento só dispara pela ficção: "o que você faz?" primeiro; se a descrição bater num movimento, ele rola. Se não bater, aconteça o que a ficção disser, sem dado.
- Pergunte e use as respostas: "Quem nesta cidade te deve dinheiro?", "O que você sabe sobre os elfos daqui?". A resposta vira verdade do mundo e gancho. Faça isso também com os vínculos.
- Fã dos personagens: mostre-os competentes, dê holofote às classes (o ladrão vê a armadilha, o mago reconhece o glifo) e deixe as desvantagens doerem.
- Perigos fora da tela: cada ameaça tem um objetivo e avança quando o grupo não age. Anote perigos e sinais sombrios no diário (tipo "nota") e mostre esses sinais antes do golpe.
- Mapas com espaços em branco: não planeje tudo; deixe lacunas para as perguntas e as escolhas preencherem.`;

export const pbta: Sistema = {
  id: "pbta",
  nome: "Dungeon World (PbtA)",
  nomeCurto: "Dungeon World",
  descricao: "2d6 + atributo: 10+ sucesso, 7-9 sucesso com custo, 6- o mestre faz um movimento. Ficção primeiro, sem CD e sem turnos.",
  licenca: "Dungeon World — Creative Commons BY 3.0 (Sage LaTorra e Adam Koebel)",
  dadoPrincipal: "2d6",
  pronto: true,
  rotulos: { ancestralidade: "Raça", classe: "Classe", nivel: "Nível", defesa: "Armadura", dinheiro: "moedas", pv: "PV" },
  atributos: ATRIBUTOS,
  pericias: MOVIMENTOS_ROLADOS.map((m) => ({ id: m.id, nome: m.nome, atributo: m.atributo || undefined, descricao: m.descricao })),
  classes: CLASSES_DW.map((c) => ({
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    atributoChave: c.atributoChave,
    pvBase: c.pvBase,
    pericias: c.iniciais.filter((m) => m.rola).map((m) => m.id),
    equipamento: [...c.equipamentoFixo, ...c.kits[0].itens],
    papel: c.papel,
    fonte: "Dungeon World (CC-BY 3.0)",
  })),
  ancestralidades: RACAS.map((r) => ({
    ...r,
    descricao: `${r.descricao} Classes do livro: ${CLASSES_DW.filter((c) => c.racas.includes(r.id)).map((c) => c.nome).join(", ")}.`,
  })),
  opcoesCriacao: opcoesCriacao(),
  metodosAtributos: [{ id: "padrao", nome: "Matriz do Dungeon World", descricao: "16, 15, 13, 12, 9, 8, distribuídos pela classe." }],
  limitesAtributos: { min: 1, max: 18 },
  periciasEscolhiveis: 0,
  nivelMaximo: NIVEL_MAX,
  testesSugeridos: [
    "Desafiar o Perigo (DES)",
    "Golpear e Retalhar",
    "Disparar",
    "Defender",
    "Saber das Coisas",
    "Discernir Realidades",
    "Negociar",
    "Ajudar ou Atrapalhar",
    "Última Respiração",
    "Dano",
  ],
  regrasParaMestre: REGRAS,

  atributosIniciais(classeId) {
    const classe = CLASSES_DW.find((c) => c.id === classeId) ?? CLASSES_DW[0];
    return distribuir(MATRIZ, classe.ordem);
  },

  criarFicha(entrada) {
    const classe = CLASSES_DW.find((c) => c.id === entrada.classe) ?? CLASSES_DW[0];
    const raca = RACAS.find((r) => r.id === entrada.ancestralidade) ?? RACAS.find((r) => r.id === classe.racas[0])!;
    const ficha = fichaBase("pbta", entrada.nome);
    ficha.classe = classe.id;
    ficha.ancestralidade = raca.id;
    ficha.atributos = entrada.atributos ?? pbta.atributosIniciais(classe.id, "padrao");
    for (const m of classe.iniciais) if (m.rola) ficha.pericias[m.id] = 1;
    ficha.extras = extrasCanonicos(classe, entrada.extras ?? {});
    ficha.pvMax = pvMaxDe(ficha);
    ficha.pv = ficha.pvMax;

    const kit = kitDe(ficha, classe);
    ficha.defesa = kit.armadura;
    ficha.dinheiro = kit.moedas;
    ficha.inventario = [...classe.equipamentoFixo, ...kit.itens];
    if (classe.id === "guerreiro") ficha.inventario[0] = `arma característica: ${descricaoArma(ficha)}`;
    if (classe.id === "ladrao") ficha.inventario = ficha.inventario.map((i) => (i === "frasco do veneno escolhido" ? `frasco de ${nomeDe(VENENOS, ficha.extras.veneno)}` : i));

    ficha.recursos.xp = { rotulo: "XP", atual: 0, max: 8 };
    if (classe.racoes) ficha.recursos.racoes = { rotulo: "Rações", atual: classe.racoes, max: classe.racoes };
    if (conjurador(classe)) ficha.recursos.magia = { rotulo: "Níveis de magia preparados", atual: 2, max: 2 };
    if (kit.municao) ficha.recursos.municao = { rotulo: "Munição", atual: kit.municao, max: kit.municao };
    if (kit.usos) ficha.recursos.usos = { rotulo: "Equipamento de aventura", atual: kit.usos, max: kit.usos };
    if (classe.id === "ladrao") ficha.recursos.veneno = { rotulo: "Doses de veneno", atual: 3, max: 3 };
    if (classe.id === "druida") ficha.recursos.forma = { rotulo: "Reserva de forma", atual: 0, max: 4 };
    ficha.historia = entrada.historia ?? "";
    return ficha;
  },

  resolverTeste(ficha, pedido) {
    return resolver(ficha, pedido);
  },

  descreverParaMestre(original) {
    const ficha = clonar(original);
    sincronizarXp(ficha);
    const classe = classeDe(ficha);
    const raca = RACAS.find((r) => r.id === ficha.ancestralidade);
    const racial = movimentoRacial(ficha);
    const atributos = ATRIBUTOS.map((a) => `${a.abrev} ${ficha.atributos[a.id] ?? 10} (${sinal(modAtributo(ficha, a.id))}${debilitado(ficha, a.id) ? `, ${DEBILIDADES[a.id]}` : ""})`).join(", ");
    const recursos = Object.entries(ficha.recursos).map(([id, r]) => `${r.rotulo} [${id}] ${r.atual}/${r.max}`).join(", ");
    const iniciais = classe.iniciais.map((m) => `${m.nome}${m.rola ? ` (+${m.rola.toUpperCase()})` : ""}`).join(", ");
    const avancados = avancadosDe(ficha, classe).map((m) => `${m.nome} — ${m.descricao}`).join("; ");
    const escolhas = escolhasDeClasse(ficha).map((x) => `${x.titulo}: ${x.texto}`).join("\n");
    const vinculos = listaTexto(ficha.extras.vinculos);
    return `${ficha.nome} — ${raca?.nome ?? ficha.ancestralidade} ${classe.nome} nível ${ficha.nivel} (XP ${ficha.recursos.xp.atual}/${ficha.recursos.xp.max}${prontoParaSubir(ficha) ? ", PRONTO PARA SUBIR DE NÍVEL" : ""})
PV ${ficha.pv}/${ficha.pvMax} · Armadura ${ficha.defesa} · Dano ${danoDe(ficha)} · Carga máx. ${cargaMax(ficha)} · ${ficha.dinheiro} moedas
Atributos: ${atributos}
Alinhamento: ${alinhamentoTexto(ficha)}
Movimentos: ${iniciais}
Movimento racial: ${racial.movimento.nome} — ${racial.movimento.descricao}${racial.doLivro ? "" : " (combinação fora do livro)"}${avancados ? `\nAvançados: ${avancados}` : ""}${escolhas ? `\n${escolhas}` : ""}
Vínculos: ${vinculos.join(" | ") || "nenhum"}
Recursos: ${recursos || "nenhum"}
Inventário: ${ficha.inventario.join(", ") || "nada"}
Condições: ${ficha.condicoes.join(", ") || "nenhuma"}${texto(ficha.extras.aparencia) ? `\nAparência: ${texto(ficha.extras.aparencia)}` : ""}${ficha.historia ? `\nHistória: ${ficha.historia}` : ""}`;
  },

  blocosFicha(original): BlocoFicha[] {
    const ficha = clonar(original);
    sincronizarXp(ficha);
    const classe = classeDe(ficha);
    const racial = movimentoRacial(ficha);
    const cores: Record<string, "magia" | "outro" | "sanidade"> = { magia: "magia", forma: "magia", xp: "outro" };
    // condições com o efeito das debilidades à vista
    const condicoes = ficha.condicoes.map((c) => {
      const a = ATRIBUTOS.find((x) => normalizar(c) === normalizar(DEBILIDADES[x.id]));
      return a ? `${c} (−1 ${a.abrev})` : c;
    });
    const blocos: BlocoFicha[] = [
      {
        tipo: "barras",
        itens: [
          { rotulo: "PV", atual: ficha.pv, max: ficha.pvMax, cor: "vida" },
          ...Object.entries(ficha.recursos).map(([id, r]) => ({ rotulo: r.rotulo, atual: r.atual, max: r.max, cor: cores[id] ?? ("outro" as const) })),
        ],
      },
      {
        tipo: "grade",
        itens: [
          { rotulo: "Armadura", valor: String(ficha.defesa) },
          { rotulo: "Dano", valor: danoDe(ficha) },
          { rotulo: "Carga", valor: String(cargaMax(ficha)) },
          { rotulo: "Moedas", valor: String(ficha.dinheiro) },
        ],
      },
      {
        tipo: "grade",
        titulo: "Atributos",
        itens: ATRIBUTOS.map((a) => ({
          rotulo: a.abrev,
          valor: String(ficha.atributos[a.id] ?? 10),
          detalhe: `${sinal(modAtributo(ficha, a.id))}${debilitado(ficha, a.id) ? ` ${DEBILIDADES[a.id]}` : ""}`,
        })),
      },
      { tipo: "texto", titulo: "Alinhamento", texto: alinhamentoTexto(ficha) },
      { tipo: "lista", titulo: "Movimentos iniciais", itens: classe.iniciais.map((m) => `${m.nome}${m.rola ? ` (+${m.rola.toUpperCase()})` : ""}: ${m.descricao}`) },
      {
        tipo: "texto",
        titulo: `Movimento racial${racial.doLivro ? "" : " (adaptado)"}`,
        texto: `${racial.movimento.nome}: ${racial.movimento.descricao}`,
      },
    ];
    if (prontoParaSubir(ficha)) blocos.splice(1, 0, { tipo: "texto", titulo: "XP cheio", texto: "Pronto para subir de nível no próximo Acampar ou lugar seguro." });
    if (condicoes.length) blocos.splice(1, 0, { tipo: "etiquetas", titulo: "Condições", itens: condicoes });
    const avancados = avancadosDe(ficha, classe);
    if (avancados.length) blocos.push({ tipo: "lista", titulo: "Movimentos avançados", itens: avancados.map((m) => `${m.nome}: ${m.descricao}`) });
    for (const e of escolhasDeClasse(ficha)) blocos.push({ tipo: "texto", titulo: e.titulo, texto: e.texto });
    const vinculos = listaTexto(ficha.extras.vinculos);
    if (vinculos.length) blocos.push({ tipo: "lista", titulo: "Vínculos", itens: vinculos });
    blocos.push({ tipo: "lista", titulo: "Inventário", itens: ficha.inventario });
    if (texto(ficha.extras.aparencia)) blocos.push({ tipo: "texto", titulo: "Aparência", texto: texto(ficha.extras.aparencia) });
    return blocos;
  },

  xpParaNivel(nivel) {
    if (nivel <= 1) return 0;
    if (nivel > NIVEL_MAX) return null;
    return xpAcumulado(nivel);
  },

  subirNivel(original) {
    const ficha = clonar(original);
    sincronizarXp(ficha);
    if (ficha.nivel >= NIVEL_MAX) return { ficha, resumo: `${ficha.nome} já está no nível máximo (${NIVEL_MAX}). Mais XP agora só serve para contar vantagem.` };
    const classe = classeDe(ficha);
    const avancadosAntes = avancadosDe(ficha, classe);
    ficha.nivel += 1;

    // +1 num atributo: o primeiro da prioridade da classe que ainda não chegou a 18
    const attr = classe.ordem.find((a) => (ficha.atributos[a] ?? 10) < 18);
    if (attr) ficha.atributos[attr] = (ficha.atributos[attr] ?? 10) + 1;

    // PV no DW = base da classe + valor de CON; só muda se CON subir
    const pvAntes = ficha.pvMax;
    ficha.pvMax = pvMaxDe(ficha);
    ficha.pv = limitar(ficha.pv + (ficha.pvMax - pvAntes), 0, ficha.pvMax);

    // movimento avançado: 2-5 até o nível 5; do 6 em diante, 6-10 primeiro (versões maiores só se já tiver a menor)
    const tem = new Set(listaTexto(ficha.extras.movimentosAvancados));
    const candidatos = (ficha.nivel >= 6 ? [...classe.avancados610, ...classe.avancados25] : classe.avancados25).filter((m) => !tem.has(m.id));
    const escolhido = candidatos.find((m) => !m.substitui || tem.has(m.substitui)) ?? candidatos[0];
    if (escolhido) ficha.extras.movimentosAvancados = [...tem, escolhido.id];
    ficha.defesa += armaduraDosMovimentos(avancadosDe(ficha, classe)) - armaduraDosMovimentos(avancadosAntes);

    if (conjurador(classe)) {
      const max = ficha.nivel + 1;
      const atual = ficha.recursos.magia?.atual ?? max - 1;
      ficha.recursos.magia = { rotulo: "Níveis de magia preparados", atual: Math.min(max, atual + 1), max };
    }
    sincronizarXp(ficha);

    const a = ATRIBUTOS.find((x) => x.id === attr);
    const partes = [
      a ? `${a.abrev} ${ficha.atributos[a.id]}` : "",
      ficha.pvMax !== pvAntes ? `PV máximos ${ficha.pvMax}` : "",
      escolhido ? `novo movimento: ${escolhido.nome}` : "",
      conjurador(classe) ? `magias até ${ficha.nivel + 1} níveis` : "",
    ].filter(Boolean);
    return { ficha, resumo: `${ficha.nome} chegou ao nível ${ficha.nivel}: ${partes.join(", ")}. (Atributo e movimento podem ser trocados com o mestre.)` };
  },

  descansar(original, tipo) {
    const ficha = clonar(original);
    sincronizarXp(ficha);
    const classe = classeDe(ficha);
    const partes: string[] = [];

    if (tipo === "longo") {
      // Recuperar: dias de repouso em conforto e segurança
      ficha.pv = ficha.pvMax;
      const deb = ATRIBUTOS.find((a) => debilitado(ficha, a.id));
      if (deb) {
        const alvo = normalizar(DEBILIDADES[deb.id]);
        const i = ficha.condicoes.findIndex((c) => normalizar(c) === alvo || normalizar(c).startsWith(`${alvo} `));
        if (i >= 0) ficha.condicoes.splice(i, 1);
        partes.push(`livrou-se de ${DEBILIDADES[deb.id]}`);
      }
      ficha.condicoes = ficha.condicoes.filter((c) => !/inconsciente/.test(normalizar(c)));
      if (ficha.recursos.magia) ficha.recursos.magia.atual = ficha.recursos.magia.max;
      if (ficha.recursos.veneno) ficha.recursos.veneno.atual = ficha.recursos.veneno.max;
      if (ficha.recursos.forma) ficha.recursos.forma.atual = 0;
      partes.unshift("PV cheios");
      if (prontoParaSubir(ficha)) partes.push("XP suficiente para subir de nível");
      return { ficha, resumo: `${ficha.nome} se Recuperou com dias de repouso: ${partes.join(", ")}.` };
    }

    // Acampar: gasta uma ração, dorme mal e cura metade do PV máximo
    const semComer = classe.id === "druida";
    const racoes = ficha.recursos.racoes;
    let comeu = semComer;
    if (!semComer && racoes && racoes.atual > 0) {
      racoes.atual -= 1;
      comeu = true;
      partes.push(`gastou 1 ração (sobram ${racoes.atual})`);
    }
    if (comeu) {
      let cura = Math.floor(ficha.pvMax / 2);
      if (classe.id === "druida" && ficha.ancestralidade === "halfling") cura += somar(1, 6).total;
      const antes = ficha.pv;
      ficha.pv = Math.min(ficha.pvMax, ficha.pv + cura);
      partes.push(`curou ${ficha.pv - antes} PV`);
      if (ficha.pv > 0) ficha.condicoes = ficha.condicoes.filter((c) => !/inconsciente/.test(normalizar(c)));
    } else {
      partes.push("sem ração: dormiu com fome e não curou nada");
    }
    if (ficha.recursos.magia) {
      ficha.recursos.magia.atual = ficha.recursos.magia.max;
      partes.push(classe.id === "clerigo" ? "comungou e preparou preces" : "preparou magias");
    }
    if (ficha.recursos.forma) ficha.recursos.forma.atual = 0;
    if (prontoParaSubir(ficha)) partes.push("XP suficiente para subir de nível");
    return { ficha, resumo: `${ficha.nome} Acampou: ${partes.join(", ")}.` };
  },
};
