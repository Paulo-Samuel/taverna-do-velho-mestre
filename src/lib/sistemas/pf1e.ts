import "server-only";
import { d, somar } from "../dados";
import { clonar, distribuir, fichaBase, limitar, modD20, normalizar, rolar3d6, rolar4d6, sinal, testeD20 } from "./comum";
import { CLASSES, type ClassePf1, type Mods, type Salvamento } from "./pf1e/classes";
import {
  ALINHAMENTOS,
  ATRIBUTOS,
  PERICIAS,
  TABELA_ARCANISTA,
  TABELA_ESPONTANEA,
  TABELA_PREPARADA,
  TABELA_QUATRO,
  TABELA_SEIS,
  TALENTOS,
  XP_MEDIA,
  type PericiaPf1,
  type TalentoPf1,
} from "./pf1e/dados";
import { OPCOES_CRIACAO } from "./pf1e/opcoes";
import { RACAS, type RacaPf1 } from "./pf1e/racas";
import type { BlocoFicha, Ficha, GrauSucesso, PedidoTeste, Recurso, ResultadoTeste, Sistema } from "./tipos";

// Pathfinder 1ª edição pelo PRD (OGL 1.0a, Paizo). O herdeiro do 3.5: BBA, salvamentos bons e ruins,
// perícias por graduação, ameaça e confirmação de crítico, espaços de magia por nível de magia.

const SISTEMA = "pf1e";
const LIMITES = { min: 3, max: 25 };
const ORDINAIS = ["0", "1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º"];
const SALVAMENTOS: { id: Salvamento; nome: string; atributo: string }[] = [
  { id: "fort", nome: "Fortitude", atributo: "con" },
  { id: "ref", nome: "Reflexos", atributo: "des" },
  { id: "von", nome: "Vontade", atributo: "sab" },
];

// ——— Leitura da ficha ———

function classeDe(ficha: Ficha): ClassePf1 {
  return CLASSES.find((c) => c.id === ficha.classe) ?? CLASSES[0];
}

function racaDe(ficha: Ficha): RacaPf1 {
  return RACAS.find((r) => r.id === ficha.ancestralidade) ?? RACAS.find((r) => r.id === "humano")!;
}

function mod(ficha: Ficha, atributo: string): number {
  return modD20(ficha.atributos[atributo] ?? 10);
}

function modsDe(ficha: Ficha): Mods {
  return Object.fromEntries(ATRIBUTOS.map((a) => [a.id, mod(ficha, a.id)]));
}

function textoExtra(ficha: Ficha, id: string): string {
  const v = ficha.extras[id];
  return Array.isArray(v) ? v.map(String).join(", ") : typeof v === "string" ? v : "";
}

function talentosDe(ficha: Ficha): TalentoPf1[] {
  const ids = Array.isArray(ficha.extras.talentos) ? ficha.extras.talentos.map(String) : [];
  return TALENTOS.filter((t) => ids.includes(t.id));
}

function temTalento(ficha: Ficha, id: string): boolean {
  return talentosDe(ficha).some((t) => t.id === id);
}

function somaTalentos(ficha: Ficha, campo: "fort" | "ref" | "von" | "iniciativa" | "ca" | "ataque" | "concentracao" | "penetrar"): number {
  return talentosDe(ficha).reduce((s, t) => s + (t.efeito?.[campo] ?? 0), 0);
}

/** Talentos a que o personagem tem direito no nível atual. */
function talentosPermitidos(ficha: Ficha): number {
  const n = ficha.nivel;
  const classe = classeDe(ficha);
  return Math.ceil(n / 2) + (racaDe(ficha).humano ? 1 : 0) + (classe.id === "guerreiro" ? 1 + Math.floor(n / 2) : 0);
}

function nomeOpcao(id: string, valor: string): string {
  const opcao = OPCOES_CRIACAO.find((o) => o.id === id);
  return opcao?.opcoes?.find((o) => o.id === valor)?.nome ?? valor;
}

// ——— Números derivados ———

function bba(classe: ClassePf1, nivel: number): number {
  return classe.bba === "total" ? nivel : classe.bba === "media" ? Math.floor((nivel * 3) / 4) : Math.floor(nivel / 2);
}

function ataquesIterativos(base: number, total: number): string {
  const ataques = [total];
  for (let b = base - 5; b > 0 && ataques.length < 4; b -= 5) ataques.push(total - (base - b));
  return ataques.map(sinal).join("/");
}

function modTamanho(ficha: Ficha): number {
  return racaDe(ficha).tamanho === "pequeno" ? 1 : 0;
}

function salvamento(ficha: Ficha, tipo: Salvamento): number {
  const classe = classeDe(ficha);
  const n = ficha.nivel;
  const base = classe.bons.includes(tipo) ? 2 + Math.floor(n / 2) : Math.floor(n / 3);
  const atributo = SALVAMENTOS.find((s) => s.id === tipo)!.atributo;
  // graça divina / resiliência profana: CAR em todos os salvamentos a partir do 2º nível
  const graca = (classe.id === "paladino" || classe.id === "antipaladino") && n >= 2 ? Math.max(0, mod(ficha, "car")) : 0;
  return base + mod(ficha, atributo) + (racaDe(ficha).salvamentos?.[tipo] ?? 0) + somaTalentos(ficha, tipo) + graca;
}

function iniciativa(ficha: Ficha): number {
  const classe = classeDe(ficha);
  const pistoleiro = classe.id === "pistoleiro" && ficha.nivel >= 3 ? 2 : 0;
  return mod(ficha, "des") + somaTalentos(ficha, "iniciativa") + pistoleiro;
}

function cmb(ficha: Ficha): number {
  return bba(classeDe(ficha), ficha.nivel) + mod(ficha, "for") - modTamanho(ficha);
}

function cmd(ficha: Ficha): number {
  return 10 + bba(classeDe(ficha), ficha.nivel) + mod(ficha, "for") + mod(ficha, "des") - modTamanho(ficha) + somaTalentos(ficha, "ca");
}

/** CA calculada pelas regras (armadura, escudo, DES limitada, tamanho, armadura natural, esquiva, monge, espadachim). */
function calcularCA(ficha: Ficha): { total: number; toque: number; surpresa: number } {
  const classe = classeDe(ficha);
  const raca = racaDe(ficha);
  const n = ficha.nivel;
  const des = mod(ficha, "des");
  const desAplicada = classe.armadura?.desMax != null ? Math.min(des, classe.armadura.desMax) : des;
  const armadura = (classe.armadura?.bonus ?? 0) + (classe.escudo ?? 0);
  const natural = raca.armaduraNatural ?? 0;
  const esquiva = somaTalentos(ficha, "ca") + (raca.esquiva ?? 0);
  const monge = classe.id === "monge" ? Math.max(0, mod(ficha, "sab")) + Math.floor(n / 4) : 0;
  const agil = classe.id === "espadachim" && n >= 3 ? 1 + Math.floor((n - 3) / 4) : 0;
  const tamanho = modTamanho(ficha);
  const total = 10 + armadura + desAplicada + natural + esquiva + monge + agil + tamanho;
  const toque = 10 + desAplicada + esquiva + monge + agil + tamanho;
  const surpresa = total - Math.max(0, desAplicada) - esquiva - agil;
  return { total, toque, surpresa };
}

function nivelConjurador(ficha: Ficha): number {
  const classe = classeDe(ficha);
  if (!classe.magia) return 0;
  return classe.magia.tabela === "quatro" ? Math.max(0, ficha.nivel - 3) : ficha.nivel;
}

function danoDesarmado(nivel: number): string {
  return nivel >= 20 ? "2d10" : nivel >= 16 ? "2d8" : nivel >= 12 ? "2d6" : nivel >= 8 ? "1d10" : nivel >= 4 ? "1d8" : "1d6";
}

/** Dados de ataque furtivo (ladino, ninja, matador). */
function ataqueFurtivo(ficha: Ficha): string | null {
  const c = classeDe(ficha).id;
  const n = ficha.nivel;
  if (c === "ladino" || c === "ninja") return `${Math.ceil(n / 2)}d6`;
  if (c === "matador" && n >= 3) return `${Math.floor(n / 3)}d6`;
  return null;
}

type Ataque = { rotulo: string; bonus: number; dano: string; ameaca: number; multiplicador: number; critico: string; iterativos: string };

function parseCritico(critico: string): { ameaca: number; multiplicador: number } {
  const ameaca = Number(critico.match(/^(\d+)-20/)?.[1] ?? 20);
  const multiplicador = Number(critico.match(/x(\d)/)?.[1] ?? 2);
  return { ameaca, multiplicador };
}

function somaDano(base: string, bonus: number): string {
  return bonus ? `${base}${sinal(bonus)}` : base;
}

/** Ataque com a arma da classe ou um ataque genérico (corpo a corpo, distância, toque). */
function ataque(ficha: Ficha, tipo: "classe" | "corpo" | "distancia" | "toque_dist" | "toque_corpo" = "classe"): Ataque {
  const classe = classeDe(ficha);
  const n = ficha.nivel;
  const base = bba(classe, n);
  const tamanho = modTamanho(ficha);
  const forca = mod(ficha, "for");
  const des = mod(ficha, "des");

  if (tipo === "toque_dist" || tipo === "toque_corpo") {
    const bonus = base + (tipo === "toque_dist" ? des : forca) + tamanho;
    return {
      rotulo: tipo === "toque_dist" ? "Ataque de toque à distância (magia)" : "Ataque de toque corpo a corpo (magia)",
      bonus, dano: "conforme a magia", ameaca: 20, multiplicador: 2, critico: "x2", iterativos: ataquesIterativos(base, bonus),
    };
  }

  const arma = classe.arma;
  const usaArmaDaClasse = tipo === "classe" || (tipo === "corpo" && arma.alcance === "corpo") || (tipo === "distancia" && arma.alcance === "distancia");
  if (!usaArmaDaClasse) {
    const distancia = tipo === "distancia";
    const bonus = base + (distancia ? des : forca) + tamanho + somaTalentos(ficha, "ataque");
    return {
      rotulo: distancia ? "Ataque à distância" : "Ataque corpo a corpo",
      bonus, dano: distancia ? "conforme a arma" : somaDano("conforme a arma", forca), ameaca: 20, multiplicador: 2, critico: "x2",
      iterativos: ataquesIterativos(base, bonus),
    };
  }

  // atributo de ataque: Acuidade com Arma deixa usar DES em corpo a corpo
  let atributoAtaque = arma.atributo === "des" ? des : forca;
  if (arma.alcance === "corpo" && temTalento(ficha, "acuidade_arma")) atributoAtaque = Math.max(forca, des);
  if (classe.id === "monge" || classe.id === "brigao") atributoAtaque = Math.max(forca, temTalento(ficha, "acuidade_arma") ? des : forca);
  const treinamento = classe.id === "guerreiro" && n >= 5 ? Math.floor((n - 1) / 4) : 0;
  const bonus = base + atributoAtaque + tamanho + somaTalentos(ficha, "ataque") + treinamento;

  let dadoDano = arma.dano;
  let bonusDano = 0;
  if (classe.id === "monge" || classe.id === "brigao") dadoDano = danoDesarmado(n);
  if (classe.id === "alquimista") {
    dadoDano = `${Math.ceil(n / 2)}d6`;
    bonusDano = mod(ficha, "int");
  } else if (classe.id === "cinetico") {
    const q = Math.ceil(n / 2);
    dadoDano = `${q}d6`;
    bonusDano = q + mod(ficha, "con");
  } else if (arma.alcance === "corpo") {
    // duas mãos multiplica só o bônus de FOR; a penalidade entra inteira
    bonusDano = arma.duasMaos && forca > 0 ? Math.floor(forca * 1.5) : forca;
  }
  if (classe.id === "pistoleiro" && n >= 5) bonusDano += des;
  bonusDano += treinamento;
  const { ameaca, multiplicador } = parseCritico(arma.critico);
  return {
    rotulo: `Ataque (${arma.nome}${arma.toque ? ", toque" : ""})`,
    bonus, dano: somaDano(dadoDano, bonusDano), ameaca, multiplicador, critico: arma.critico,
    iterativos: ataquesIterativos(base, bonus),
  };
}

// ——— Perícias ———

function ehDeClasse(ficha: Ficha, id: string): boolean {
  return classeDe(ficha).periciasClasse.includes(id);
}

function bonusPericia(ficha: Ficha, pericia: PericiaPf1): number {
  const graduacoes = ficha.pericias[pericia.id] ?? 0;
  const classe = classeDe(ficha);
  const raca = racaDe(ficha);
  const n = ficha.nivel;
  let bonus = graduacoes + mod(ficha, pericia.atributo);
  if (graduacoes > 0 && ehDeClasse(ficha, pericia.id)) bonus += 3;
  bonus += raca.bonusPericias?.[pericia.id] ?? 0;
  bonus += talentosDe(ficha).reduce((s, t) => s + (t.efeito?.pericias?.[pericia.id] ?? 0), 0);
  // tamanho pequeno: +4 Furtividade, +2 Voar
  if (raca.tamanho === "pequeno") bonus += pericia.id === "furtividade" ? 4 : pericia.id === "voar" ? 2 : 0;
  // habilidades de classe que somam direto
  const metadeNivel = Math.max(1, Math.floor(n / 2));
  if ((classe.id === "bardo" || classe.id === "escaldo") && pericia.id.startsWith("conh_")) bonus += metadeNivel;
  if ((classe.id === "ladino" || classe.id === "investigador") && pericia.id === "operar") bonus += metadeNivel;
  if (classe.id === "inquisidor" && (pericia.id === "intimidar" || pericia.id === "sentir_motivacao")) bonus += metadeNivel;
  return bonus;
}

/** Pontos de perícia ganhos por nível. */
function pontosPorNivel(ficha: Ficha): number {
  const classe = classeDe(ficha);
  const favorita = ficha.extras.classeFavorita === "pericia" ? 1 : 0;
  return Math.max(1, classe.pontos + mod(ficha, "int")) + (racaDe(ficha).humano ? 1 : 0) + favorita;
}

/** Gasta pontos de perícia: primeiro sobe as que já têm graduação (de classe antes), depois abre novas na ordem dada. */
function distribuirGraduacoes(ficha: Ficha, pontos: number, prioridade: string[]): string[] {
  const subidas: string[] = [];
  const limite = ficha.nivel;
  const existentes = Object.keys(ficha.pericias)
    .filter((id) => (ficha.pericias[id] ?? 0) > 0)
    .sort((a, b) => Number(ehDeClasse(ficha, b)) - Number(ehDeClasse(ficha, a)));
  for (const id of existentes) {
    if (pontos <= 0) break;
    if ((ficha.pericias[id] ?? 0) >= limite) continue;
    ficha.pericias[id] = (ficha.pericias[id] ?? 0) + 1;
    subidas.push(id);
    pontos--;
  }
  for (const id of [...prioridade, ...classeDe(ficha).periciasClasse]) {
    if (pontos <= 0) break;
    if ((ficha.pericias[id] ?? 0) > 0 || !PERICIAS.some((p) => p.id === id)) continue;
    ficha.pericias[id] = 1;
    subidas.push(id);
    pontos--;
  }
  return subidas;
}

// ——— Magia e recursos ———

function tabelaMagia(classe: ClassePf1): number[][] {
  switch (classe.magia?.tabela) {
    case "preparada": return TABELA_PREPARADA;
    case "espontanea": return TABELA_ESPONTANEA;
    case "arcanista": return TABELA_ARCANISTA;
    case "seis": return TABELA_SEIS;
    case "quatro": return TABELA_QUATRO;
    default: return [];
  }
}

/** Magias por dia de cada nível de magia (índice 1-9), já com bônus de atributo e espaço de domínio. */
function espacosMagia(ficha: Ficha): number[] {
  const classe = classeDe(ficha);
  if (!classe.magia) return [];
  const linha = tabelaMagia(classe)[limitar(ficha.nivel, 1, 20)] ?? [];
  const m = mod(ficha, classe.magia.atributo);
  const maxNivel = classe.magia.maxNivel ?? 9;
  const espacos = [0];
  linha.forEach((base, i) => {
    const nivelMagia = i + 1;
    if (nivelMagia > maxNivel) return;
    const bonusAtributo = m >= nivelMagia ? Math.floor((m - nivelMagia) / 4) + 1 : 0;
    const dominio = classe.id === "clerigo" ? 1 : 0;
    espacos[nivelMagia] = base + bonusAtributo + dominio;
  });
  return espacos;
}

const RECURSOS_DE_MAGIA = Array.from({ length: 9 }, (_, i) => `m${i + 1}`);
// ids de recurso que as classes criam (no 20º nível todas já liberaram os seus)
const RECURSOS_DE_CLASSE = new Set(CLASSES.flatMap((c) => (c.recursos?.(20, { for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 }) ?? []).map((r) => r.id)));

/** Recursos que o sistema calcula (magia e habilidades de classe), com o máximo atual. */
function recursosCalculados(ficha: Ficha): Record<string, { rotulo: string; max: number }> {
  const classe = classeDe(ficha);
  const saida: Record<string, { rotulo: string; max: number }> = {};
  const tipo = classe.magia?.tipo === "espontanea" ? "por dia" : "preparadas";
  espacosMagia(ficha).forEach((qtd, nivelMagia) => {
    if (nivelMagia > 0 && qtd > 0) saida[`m${nivelMagia}`] = { rotulo: `Magias de ${ORDINAIS[nivelMagia]} nível (${tipo})`, max: qtd };
  });
  const extrasTalentos = talentosDe(ficha).reduce<Record<string, number>>((acc, t) => {
    for (const [id, v] of Object.entries(t.efeito?.recursos ?? {})) acc[id] = (acc[id] ?? 0) + v;
    return acc;
  }, {});
  for (const r of classe.recursos?.(ficha.nivel, modsDe(ficha)) ?? []) {
    const max = Math.max(1, r.max + (extrasTalentos[r.id] ?? 0));
    saida[r.id] = { rotulo: r.rotulo, max };
  }
  return saida;
}

/** Atualiza os máximos dos recursos sem apagar o que já foi gasto (o ganho de máximo entra como disponível). */
function sincronizarRecursos(ficha: Ficha, restaurar: boolean) {
  const calculados = recursosCalculados(ficha);
  const gerenciados = new Set([...RECURSOS_DE_MAGIA, ...RECURSOS_DE_CLASSE]);
  for (const id of Object.keys(ficha.recursos)) {
    if (gerenciados.has(id) && !calculados[id]) delete ficha.recursos[id];
  }
  for (const [id, { rotulo, max }] of Object.entries(calculados)) {
    const atual = ficha.recursos[id];
    if (!atual || restaurar) {
      ficha.recursos[id] = { rotulo, atual: max, max };
      continue;
    }
    const ganho = Math.max(0, max - atual.max);
    ficha.recursos[id] = { rotulo, atual: limitar(atual.atual + ganho, 0, max), max };
  }
}

function pvPorNivel(ficha: Ficha): number {
  const classe = classeDe(ficha);
  const favorita = ficha.extras.classeFavorita === "pericia" ? 0 : 1;
  return Math.max(1, Math.floor(classe.dadoVida / 2) + 1 + mod(ficha, "con")) + favorita;
}

// ——— Interpretação do pedido de teste ———

/** Chave de busca: sem acento, sem parênteses e pontuação, com _ virando espaço. */
function chave(texto: string): string {
  const limpo = normalizar(texto.replace(/_/g, " ").replace(/[()[\]{}:;.,!?'"/\\-]/g, " "));
  // "Conhecimento dos Planos" = "Conhecimento (Planos)"
  return limpo.replace(/ (de|do|da|dos|das)(?= )/g, "");
}

const INDICE_PERICIAS: { chave: string; pericia: PericiaPf1 }[] = PERICIAS.flatMap((p) =>
  [p.id, p.nome, ...(p.apelidos ?? [])].map((t) => ({ chave: chave(t), pericia: p })),
).sort((a, b) => b.chave.length - a.chave.length);

const NOMES_SALVAMENTO: Record<string, Salvamento> = {
  fortitude: "fort", fort: "fort", con: "fort", constituicao: "fort",
  reflexos: "ref", reflexo: "ref", ref: "ref", des: "ref", destreza: "ref",
  vontade: "von", von: "von", will: "von", sab: "von", sabedoria: "von",
};

const NOMES_ATRIBUTO: Record<string, string> = {
  forca: "for", for: "for", str: "for", destreza: "des", des: "des", dex: "des", constituicao: "con", con: "con",
  inteligencia: "int", int: "int", sabedoria: "sab", sab: "sab", wis: "sab", carisma: "car", car: "car", cha: "car",
};

type Interpretacao =
  | { tipo: "pericia"; pericia: PericiaPf1 }
  | { tipo: "salvamento"; salvamento: Salvamento }
  | { tipo: "atributo"; atributo: string }
  | { tipo: "ataque"; ataque: Ataque }
  | { tipo: "manobra" }
  | { tipo: "iniciativa" }
  | { tipo: "concentracao" }
  | { tipo: "conjurador"; contraRM: boolean }
  | { tipo: "livre" };

function contem(texto: string, termo: string): boolean {
  return ` ${texto} `.includes(` ${termo} `);
}

function interpretar(ficha: Ficha, teste: string): Interpretacao {
  const n = chave(teste).replace(/^(teste|rolagem|jogada|cheque) /, "");

  if (/(concentra|conjurar na defensiva|defensivamente)/.test(n)) return { tipo: "concentracao" };
  if (/(nivel conjurador|penetrar|resistencia a magia|resistencia magica|dissipar|^rm$)/.test(n)) return { tipo: "conjurador", contraRM: /(penetrar|resistencia)/.test(n) };
  if (/^iniciativa/.test(n)) return { tipo: "iniciativa" };
  if (/(manobra|cmb|agarrar|agarrao|derrubar|desarmar|empurrar|encontrao|sobrepujar|separar|arrastar|reposicionar|roubar objeto|truque sujo)/.test(n)) return { tipo: "manobra" };
  if (/^(magia|ataque magico|ataque magia|feitico|raio|toque magico|ataque toque|toque)/.test(n) || /ataque com magia/.test(n)) {
    return { tipo: "ataque", ataque: ataque(ficha, /corpo/.test(n) ? "toque_corpo" : "toque_dist") };
  }
  if (/^(ataque|atacar|golpe|golpear|disparo|disparar|tiro|atirar|acertar|ataque furtivo|bomba|rajada)/.test(n)) {
    const classe = classeDe(ficha);
    const distancia = /(distancia|arco|besta|arremess|disparo|disparar|tiro|atirar|pistola|funda|azagaia)/.test(n);
    const corpo = /(corpo|melee|espada|machado|maca|soco|desarmado|adaga|lanca)/.test(n);
    const tipo = distancia && classe.arma.alcance !== "distancia" ? "distancia" : corpo && classe.arma.alcance !== "corpo" ? "corpo" : "classe";
    return { tipo: "ataque", ataque: ataque(ficha, tipo) };
  }

  // resistências no estilo "Resistência de DES" (vindo de outros sistemas) e salvamentos
  const resistencia = n.match(/^(?:resistencia|salvamento|salvaguarda)(?: contra)? (\w+)/);
  if (resistencia) {
    const s = NOMES_SALVAMENTO[resistencia[1]];
    if (s) return { tipo: "salvamento", salvamento: s };
    const a = NOMES_ATRIBUTO[resistencia[1]];
    if (a) return { tipo: "atributo", atributo: a };
  }
  if (/^(fortitude|fort|reflexos?|ref|vontade|von|will)$/.test(n)) return { tipo: "salvamento", salvamento: NOMES_SALVAMENTO[n] ?? "fort" };

  // "Teste de Constituição para estabilizar": o atributo no começo manda
  const primeira = n.split(" ")[0];
  if (primeira.length > 3 && NOMES_ATRIBUTO[primeira]) return { tipo: "atributo", atributo: NOMES_ATRIBUTO[primeira] };

  // perícias: exata, depois contida no texto (a chave mais longa primeiro)
  const exata = INDICE_PERICIAS.find((x) => x.chave === n);
  if (exata) return { tipo: "pericia", pericia: exata.pericia };
  if (NOMES_ATRIBUTO[n]) return { tipo: "atributo", atributo: NOMES_ATRIBUTO[n] };
  const contida = INDICE_PERICIAS.find((x) => contem(n, x.chave));
  if (contida) return { tipo: "pericia", pericia: contida.pericia };

  // "Conhecimento" sem área: usa a melhor área do personagem
  if (/conhecimento|saber|lembrar/.test(n)) {
    const conhecimentos = PERICIAS.filter((p) => p.id.startsWith("conh_"));
    const melhor = conhecimentos.reduce((a, b) => (bonusPericia(ficha, b) > bonusPericia(ficha, a) ? b : a));
    return { tipo: "pericia", pericia: melhor };
  }

  for (const termo of ["fortitude", "reflexos", "reflexo", "vontade"]) {
    if (contem(n, termo)) return { tipo: "salvamento", salvamento: NOMES_SALVAMENTO[termo] };
  }
  for (const [termo, a] of Object.entries(NOMES_ATRIBUTO)) {
    if (termo.length > 3 && contem(n, termo)) return { tipo: "atributo", atributo: a };
  }
  if (/ataque/.test(n)) return { tipo: "ataque", ataque: ataque(ficha) };
  return { tipo: "livre" };
}

// ——— Rolagens ———

function rotular(res: ResultadoTeste, grau: GrauSucesso, rotuloGrau: string): ResultadoTeste {
  return { ...res, grau, rotuloGrau, sucesso: grau === "sucesso" || grau === "sucesso_critico" };
}

/** Escolher 10 / escolher 20: sem dado, valor fixo. */
function testeFixo(ficha: Ficha, pedido: PedidoTeste, rotulo: string, bonus: number, fixo: number): ResultadoTeste {
  const bonusTotal = bonus + (pedido.modificador ?? 0);
  const total = fixo + bonusTotal;
  const alvo = pedido.alvo ?? null;
  const sucesso = alvo === null || total >= alvo;
  return {
    tipo: "teste", sistema: SISTEMA, personagem: ficha.nome, motivo: pedido.motivo, teste: rotulo,
    expressao: `${fixo}${bonusTotal ? sinal(bonusTotal) : ""}`, dados: [], natural: null, bonus: bonusTotal, total, alvo,
    grau: sucesso ? "sucesso" : "falha", sucesso,
    rotuloGrau: alvo === null ? `Escolheu ${fixo}` : sucesso ? `Sucesso (escolheu ${fixo})` : `Falha (escolheu ${fixo})`,
    detalhes: fixo === 20 ? "escolher 20: leva 20 vezes mais tempo e assume que falhou antes de acertar" : "escolher 10: sem pressa nem ameaça por perto",
    margem: alvo === null ? null : total - alvo,
  };
}

/** Perícias e atributos: 20 natural não é sucesso automático. */
function testeSimples(ficha: Ficha, pedido: PedidoTeste, rotulo: string, bonus: number, detalhes?: string): ResultadoTeste {
  const res = testeD20({ sistema: SISTEMA, ficha, pedido, rotulo, bonus, criticos: "simples", detalhes });
  if (res.alvo === null) return rotular(res, "sucesso", `Total ${res.total} (sem CD)`);
  return rotular(res, res.grau, res.sucesso ? "Sucesso" : "Falha");
}

/** Salvamentos e manobras: 20 natural sempre passa e 1 natural sempre falha. */
function testeAutomatico(ficha: Ficha, pedido: PedidoTeste, rotulo: string, bonus: number, detalhes?: string): ResultadoTeste {
  const res = testeD20({ sistema: SISTEMA, ficha, pedido, rotulo, bonus, criticos: "dnd", detalhes });
  if (res.natural === 20) return rotular(res, "sucesso_critico", "Sucesso automático (20 natural)!");
  if (res.natural === 1) return rotular(res, "falha_critica", "Falha automática (1 natural)!");
  if (res.alvo === null) return rotular(res, "sucesso", `Total ${res.total} (sem CD)`);
  return rotular(res, res.grau, res.sucesso ? "Sucesso" : "Falha");
}

/**
 * Ataque: 20 natural sempre acerta e 1 sempre erra. Natural dentro da faixa de ameaça que acerta é ameaça de crítico:
 * rola-se uma confirmação (d20 + mesmo bônus contra a mesma CA); confirmada, o dano é multiplicado.
 */
function testeAtaque(ficha: Ficha, pedido: PedidoTeste, atq: Ataque, extra?: string): ResultadoTeste {
  const furtivo = ataqueFurtivo(ficha);
  const detalhes = [`dano ${atq.dano}`, `crítico ${atq.critico}`, furtivo ? `+${furtivo} furtivo se o alvo estiver desprevenido ou flanqueado` : "", extra ?? ""].filter(Boolean).join(" · ");
  const res = testeD20({ sistema: SISTEMA, ficha, pedido, rotulo: atq.rotulo, bonus: atq.bonus, criticos: "dnd", detalhes });
  const natural = res.natural ?? 0;
  const alvo = res.alvo;
  if (natural === 1) return rotular(res, "falha_critica", "Erro automático (1 natural)");
  const acertou = natural === 20 || alvo === null || res.total >= alvo;
  if (!acertou) return rotular(res, "falha", "Erro");
  if (natural < atq.ameaca) return rotular(res, "sucesso", "Acerto");

  // ameaça de crítico: rola a confirmação
  const confirmacao = d(20);
  const totalConfirmacao = confirmacao + res.bonus;
  const comConfirmacao: ResultadoTeste = {
    ...res,
    dados: [...res.dados, confirmacao],
    expressao: `${res.expressao}; confirmação 1d20${res.bonus ? sinal(res.bonus) : ""}`,
    detalhes: [`ameaça com ${natural}`, `confirmação ${confirmacao}${sinal(res.bonus)} = ${totalConfirmacao}`, detalhes].join(" · "),
  };
  if (alvo === null) return rotular(comConfirmacao, "sucesso", `Ameaça de crítico! Confirmação ${totalConfirmacao}: compare com a CA`);
  const confirmado = confirmacao === 20 || (confirmacao !== 1 && totalConfirmacao >= alvo);
  if (confirmado) return rotular(comConfirmacao, "sucesso_critico", `Crítico confirmado! Dano x${atq.multiplicador}`);
  return rotular(comConfirmacao, "sucesso", natural === 20 ? "Acerto automático (crítico não confirmado)" : "Acerto (crítico não confirmado)");
}

// ——— Texto e blocos ———

function linhaPericias(ficha: Ficha): string[] {
  return PERICIAS.filter((p) => (ficha.pericias[p.id] ?? 0) > 0).map((p) => `${p.nome} ${sinal(bonusPericia(ficha, p))} (${ficha.pericias[p.id]})`);
}

function habilidadesAtuais(ficha: Ficha): string[] {
  return classeDe(ficha).habilidades.filter(([nivel]) => nivel <= ficha.nivel).map(([, texto]) => texto);
}

function escolhasDescritas(ficha: Ficha): string[] {
  const ignorar = new Set(["talentos", "alinhamento", "divindade", "atributoRacial", "classeFavorita"]);
  return OPCOES_CRIACAO.filter((o) => !ignorar.has(o.id) && ficha.extras[o.id] !== undefined && textoExtra(ficha, o.id)).map((o) => {
    const v = ficha.extras[o.id];
    const valores = (Array.isArray(v) ? v.map(String) : [String(v)]).map((x) => nomeOpcao(o.id, x));
    return `${o.rotulo}: ${valores.join(", ")}`;
  });
}

function resumoMagia(ficha: Ficha): string | null {
  const classe = classeDe(ficha);
  if (!classe.magia) return null;
  const atributo = ATRIBUTOS.find((a) => a.id === classe.magia!.atributo)!;
  const m = mod(ficha, atributo.id);
  const nc = nivelConjurador(ficha);
  const espacos = RECURSOS_DE_MAGIA.map((id) => ficha.recursos[id]).filter(Boolean).map((r) => `${r.rotulo.replace(/ \(.*\)/, "")} ${r.atual}/${r.max}`);
  const nivelZero = classe.magia.tabela === "quatro" ? "" : " Nível 0 à vontade.";
  return `${classe.magia.tipo === "espontanea" ? "Espontânea" : "Preparada"} por ${atributo.nome}; nível de conjurador ${nc}; CD 10 + nível da magia ${sinal(m)}; concentração ${sinal(nc + m + somaTalentos(ficha, "concentracao"))}.${nivelZero}${espacos.length ? ` ${espacos.join(", ")}.` : nc === 0 ? " Ainda não conjura." : ""}`;
}

// ——— O sistema ———

export const pf1e: Sistema = {
  id: SISTEMA,
  nome: "Pathfinder 1ª Edição (PRD)",
  nomeCurto: "Pathfinder 1e",
  descricao: "O herdeiro do 3.5: BBA, perícias por graduação, ameaça de crítico, talentos e dezenas de classes e raças.",
  licenca: "OGL 1.0a — Pathfinder Roleplaying Game Reference Document (Paizo)",
  dadoPrincipal: "d20",
  pronto: true,
  rotulos: { ancestralidade: "Raça", classe: "Classe", nivel: "Nível", defesa: "CA", dinheiro: "po", pv: "PV" },
  atributos: ATRIBUTOS,
  pericias: PERICIAS.map((p) => ({ id: p.id, nome: p.nome, atributo: p.atributo, descricao: p.treinada ? "Só treinada" : undefined })),
  classes: CLASSES.map((c) => ({
    id: c.id, nome: c.nome, descricao: c.descricao, atributoChave: c.atributoChave, pvBase: c.pvBase,
    pericias: c.pericias, equipamento: c.equipamento, papel: c.papel, fonte: c.fonte,
  })),
  ancestralidades: RACAS.map((r) => ({ id: r.id, nome: r.nome, descricao: r.descricao, ajustes: r.ajustes, deslocamento: r.deslocamento, tracos: r.tracos })),
  opcoesCriacao: OPCOES_CRIACAO,
  metodosAtributos: [
    { id: "compra20", nome: "Compra de 20 pontos", descricao: "16, 14, 14, 12, 10, 8 distribuídos pela classe (fantasia heroica). Ajustes raciais entram depois." },
    { id: "padrao", nome: "Matriz padrão", descricao: "15, 14, 13, 12, 10, 8 (equivale a 15 pontos), distribuídos pela classe." },
    { id: "rolar", nome: "Rolar 4d6", descricao: "4d6 descartando o menor, seis vezes, do maior para o atributo-chave." },
    { id: "heroico", nome: "Heroico (2d6+6)", descricao: "2d6+6 seis vezes: ninguém nasce com menos de 8." },
    { id: "classico", nome: "Clássico (3d6 em ordem)", descricao: "3d6 na ordem FOR, DES, CON, INT, SAB, CAR. Para masoquistas." },
  ],
  limitesAtributos: LIMITES,
  periciasEscolhiveis: 8,
  nivelMaximo: 20,
  testesSugeridos: ["Percepção", "Furtividade", "Diplomacia", "Sentir Motivação", "Acrobacia", "Escalar", "Conhecimento (Arcano)", "Fortitude", "Reflexos", "Vontade", "Ataque", "Manobra", "Iniciativa", "Concentração"],
  regrasParaMestre: `Sistema: Pathfinder 1ª edição (PRD, OGL).
- Teste = d20 + bônus contra CD. CDs típicas: 5 trivial, 10 fácil, 15 médio, 20 difícil, 25 muito difícil, 30 heroico, 40 quase impossível.
- Não existe vantagem/desvantagem: use "modificador" (+2 circunstância favorável, -2 desfavorável; até ±5 em casos extremos). Deixe "modo" em normal.
- Perícias: passe o nome em "teste" (Acrobacia, Avaliação, Blefar, Escalar, Ofício, Diplomacia, Operar Mecanismo, Disfarce, Arte da Fuga, Voar, Adestrar Animais, Cura, Intimidar, Conhecimento (Arcano/Masmorras/Engenharia/Geografia/História/Local/Natureza/Nobreza/Planos/Religião), Linguística, Percepção, Atuação, Profissão, Cavalgar, Sentir Motivação, Prestidigitação, Identificar Magia, Furtividade, Sobrevivência, Natação, Usar Instrumento Mágico). Em perícia o 20 natural NÃO é sucesso automático. Algumas só funcionam com treino (Operar Mecanismo, Adestrar, Conhecimento acima de CD 10, Linguística, Profissão, Prestidigitação, Identificar Magia, Usar Instrumento Mágico).
- Fora de perigo o personagem pode "escolher 10" (ou "escolher 20" com tempo de sobra): escreva isso no teste, ex.: "Percepção (escolher 10)".
- Testes resistidos: Blefar x Sentir Motivação, Furtividade x Percepção, Disfarce x Percepção. Role o do personagem com alvo = valor do oponente (PdM: 10 + bônus dele).
- Salvamentos: "Fortitude", "Reflexos" ou "Vontade" com alvo = CD do efeito (magia: 10 + nível da magia + atributo do conjurador). 20 natural sempre passa, 1 sempre falha.
- Ataque: "Ataque" (arma da classe), "Ataque à distância", "Ataque corpo a corpo" ou "Magia" (toque à distância), com alvo = CA do inimigo (CA de toque contra magias de toque e bombas). 20 natural sempre acerta, 1 sempre erra. Se o natural estiver na faixa de ameaça da arma (19-20, 18-20...) e acertar, a ferramenta já rola a CONFIRMAÇÃO: confirmado, multiplique o dano (x2, x3, x4) — dados extras de precisão (ataque furtivo) e de energia não multiplicam. Não confirmado é acerto normal.
- Manobras (agarrar, derrubar, desarmar, empurrar, sobrepujar, separar, truque sujo): "Manobra" com alvo = DMC do inimigo (10 + BBA + FOR + DES).
- "Iniciativa" no começo do combate. Ataques extras (BBA +6/+1 etc.) só na ação de ataque total. Flanquear dá +2; desprevenido perde a DES na CA.
- Conjuradores: "Concentração" (CD 15 + 2×nível da magia para conjurar na defensiva; 10 + dano + nível ao ser ferido) e "nível de conjurador" contra resistência à magia. Espaços de magia são recursos m1…m9 (gaste com alterar_ficha, ex.: {"m1": -1}); magias de nível 0 são à vontade.
- Recursos de classe: furia, musica, canalizar, ki, maos, destruir, bombas, desafio, julgamento, reserva, garra, panache, inspiracao, fervor, fardo (tolerância: cada ponto de fardo gasto reduz em 1 e causa dano não letal = nível por ponto), heroi (pontos de herói: +8 num teste, ação extra ou escapar da morte; não voltam com descanso).
- Inimigos comuns: CA 13-18, ND = nível do grupo para um encontro médio. Com 0 PV o personagem fica inconsciente e morrendo; morre com PV negativo igual à CON (ex.: CON 14 morre em -14).
- Descanso: uma noite inteira recupera PV igual ao nível e todos os recursos diários (magias, fúria, ki...). Cura mágica e kits de Cura são o resto. Não existe descanso curto de cura.
- Por nível: PV (dado de vida médio + CON), BBA e salvamentos sobem, novos espaços de magia, +1 talento nos níveis ímpares e +1 atributo a cada 4 níveis. Trilha média de XP (2.000 para o 2º nível, 5.000 para o 3º...).`,

  atributosIniciais(classeId, metodo) {
    const classe = CLASSES.find((c) => c.id === classeId) ?? CLASSES[0];
    if (metodo === "rolar") return distribuir(Object.values(rolar4d6(classe.ordem)).sort((a, b) => b - a), classe.ordem);
    if (metodo === "heroico") return distribuir(classe.ordem.map(() => somar(2, 6).total + 6).sort((a, b) => b - a), classe.ordem);
    if (metodo === "classico") return rolar3d6(ATRIBUTOS.map((a) => a.id));
    if (metodo === "padrao") return distribuir([15, 14, 13, 12, 10, 8], classe.ordem);
    return distribuir([16, 14, 14, 12, 10, 8], classe.ordem);
  },

  criarFicha(entrada) {
    const classe = CLASSES.find((c) => c.id === entrada.classe) ?? CLASSES[0];
    const raca = RACAS.find((r) => r.id === entrada.ancestralidade) ?? RACAS.find((r) => r.id === "humano")!;
    const ficha = fichaBase(SISTEMA, entrada.nome);
    ficha.classe = classe.id;
    ficha.ancestralidade = raca.id;
    ficha.extras = { ...(entrada.extras ?? {}) };
    if (ficha.extras.classeFavorita !== "pericia") ficha.extras.classeFavorita = "pv";

    // atributos base + ajustes raciais (o +2 flexível vai onde o jogador mandou, ou no atributo-chave)
    const base = entrada.atributos ?? pf1e.atributosIniciais(classe.id, "compra20");
    const ajustes: Record<string, number> = { ...(raca.ajustes ?? {}) };
    if (raca.flexivel) {
      const escolhido = String(ficha.extras.atributoRacial ?? "");
      const alvo = ATRIBUTOS.some((a) => a.id === escolhido) ? escolhido : classe.atributoChave ?? "for";
      ajustes[alvo] = (ajustes[alvo] ?? 0) + 2;
      ficha.extras.atributoRacial = alvo;
    } else {
      delete ficha.extras.atributoRacial;
    }
    ficha.atributos = Object.fromEntries(ATRIBUTOS.map((a) => [a.id, limitar((base[a.id] ?? 10) + (ajustes[a.id] ?? 0), LIMITES.min, LIMITES.max)]));

    // talentos: só os que cabem no 1º nível
    const pedidos = Array.isArray(ficha.extras.talentos) ? ficha.extras.talentos.map(String) : typeof ficha.extras.talentos === "string" ? [ficha.extras.talentos] : [];
    ficha.extras.talentos = [...new Set(pedidos.filter((id) => TALENTOS.some((t) => t.id === id)))].slice(0, talentosPermitidos(ficha));

    // perícias: as escolhidas primeiro, depois as sugeridas da classe
    const escolhidas = (entrada.pericias ?? []).filter((id) => PERICIAS.some((p) => p.id === id));
    distribuirGraduacoes(ficha, pontosPorNivel(ficha), [...escolhidas, ...(classe.pericias ?? [])]);

    ficha.pvMax = Math.max(1, classe.dadoVida + mod(ficha, "con") + (ficha.extras.classeFavorita === "pv" ? 1 : 0) + (temTalento(ficha, "robustez") ? 3 : 0));
    ficha.pv = ficha.pvMax;
    ficha.defesa = calcularCA(ficha).total;
    sincronizarRecursos(ficha, true);
    ficha.recursos.heroi = { rotulo: "Pontos de herói", atual: 1, max: 3 };
    ficha.inventario = [...(classe.equipamento ?? [])];
    ficha.dinheiro = classe.ouro;
    ficha.historia = entrada.historia ?? "";
    return ficha;
  },

  resolverTeste(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
    const textoTeste = pedido.teste ?? "";
    const n = chave(textoTeste);
    const fixo = /(escolher|escolhe|take) 20/.test(n) ? 20 : /(escolher|escolhe|take) 10/.test(n) ? 10 : null;
    const limpo = textoTeste.replace(/\(?\s*(escolher|escolhe|take)\s*(10|20)\s*\)?/i, "").trim() || textoTeste;
    const alvo = interpretar(ficha, limpo);

    switch (alvo.tipo) {
      case "pericia": {
        const p = alvo.pericia;
        const graduacoes = ficha.pericias[p.id] ?? 0;
        const bonus = bonusPericia(ficha, p);
        const detalhe = `${graduacoes} graduaç${graduacoes === 1 ? "ão" : "ões"}${graduacoes > 0 && ehDeClasse(ficha, p.id) ? ", perícia de classe (+3)" : ""}`;
        const res = fixo ? testeFixo(ficha, pedido, p.nome, bonus, fixo) : testeSimples(ficha, pedido, p.nome, bonus, detalhe);
        // perícia só treinada sem graduação: não dá (Conhecimento ainda vale para CD 10 ou menos)
        // conhecimento de bardo (bardo, escaldo) permite qualquer Conhecimento sem treino
        const conhecimentoLivre = p.id.startsWith("conh_") && ((pedido.alvo ?? 0) <= 10 || ["bardo", "escaldo"].includes(ficha.classe));
        if (p.treinada && graduacoes === 0 && !conhecimentoLivre) {
          return { ...rotular(res, "falha", "Sem treino: não dá para tentar"), detalhes: `${p.nome} exige graduação · ${res.detalhes ?? ""}`.replace(/ · $/, "") };
        }
        return res;
      }
      case "atributo": {
        const atributo = ATRIBUTOS.find((a) => a.id === alvo.atributo)!;
        const bonus = mod(ficha, atributo.id);
        return fixo ? testeFixo(ficha, pedido, `Teste de ${atributo.nome}`, bonus, fixo) : testeSimples(ficha, pedido, `Teste de ${atributo.nome}`, bonus);
      }
      case "salvamento": {
        const s = SALVAMENTOS.find((x) => x.id === alvo.salvamento)!;
        return testeAutomatico(ficha, pedido, `Salvamento de ${s.nome}`, salvamento(ficha, s.id));
      }
      case "ataque":
        return testeAtaque(ficha, pedido, alvo.ataque);
      case "manobra":
        return testeAutomatico(ficha, pedido, "Manobra de combate (BMC)", cmb(ficha), `DMC própria ${cmd(ficha)}`);
      case "iniciativa":
        return testeSimples(ficha, pedido, "Iniciativa", iniciativa(ficha));
      case "concentracao": {
        const classe = classeDe(ficha);
        const atributo = classe.magia?.atributo ?? "con";
        const bonus = nivelConjurador(ficha) + mod(ficha, atributo) + somaTalentos(ficha, "concentracao");
        return testeSimples(ficha, pedido, "Concentração", bonus, `nível de conjurador ${nivelConjurador(ficha)}`);
      }
      case "conjurador": {
        const extra = alvo.contraRM ? (racaDe(ficha).penetrar ?? 0) + somaTalentos(ficha, "penetrar") : 0;
        return testeSimples(ficha, pedido, alvo.contraRM ? "Nível de conjurador (contra RM)" : "Nível de conjurador", nivelConjurador(ficha) + extra);
      }
      default:
        return testeSimples(ficha, pedido, textoTeste || "Teste", 0, "teste sem bônus da ficha");
    }
  },

  descreverParaMestre(ficha) {
    const classe = classeDe(ficha);
    const raca = racaDe(ficha);
    const ca = calcularCA(ficha);
    const base = bba(classe, ficha.nivel);
    const atq = ataque(ficha);
    const furtivo = ataqueFurtivo(ficha);
    const proximo = XP_MEDIA[ficha.nivel + 1];
    const alinhamento = ALINHAMENTOS.find((a) => a.id === ficha.extras.alinhamento)?.nome;
    const divindade = textoExtra(ficha, "divindade");
    const atributos = ATRIBUTOS.map((a) => `${a.abrev} ${ficha.atributos[a.id] ?? 10} (${sinal(mod(ficha, a.id))})`).join(", ");
    const recursos = Object.entries(ficha.recursos).filter(([id]) => !RECURSOS_DE_MAGIA.includes(id)).map(([, r]) => `${r.rotulo} ${r.atual}/${r.max}`);
    const magia = resumoMagia(ficha);
    const escolhas = escolhasDescritas(ficha);
    const linhas = [
      `${ficha.nome} — ${raca.nome} ${classe.nome} nível ${ficha.nivel} (XP ${ficha.xp}${proximo ? `/${proximo}` : ""})${alinhamento ? ` · ${alinhamento}` : ""}${divindade ? ` · ${divindade}` : ""}`,
      `PV ${ficha.pv}/${ficha.pvMax} (d${classe.dadoVida}) · CA ${ficha.defesa} (toque ${ca.toque}, surpresa ${ca.surpresa}) · BMC ${sinal(cmb(ficha))} · DMC ${cmd(ficha)} · Iniciativa ${sinal(iniciativa(ficha))} · BBA ${sinal(base)} · ${ficha.dinheiro} po · deslocamento ${raca.deslocamento ?? "9 m"}`,
      `Salvamentos: ${SALVAMENTOS.map((s) => `${s.nome} ${sinal(salvamento(ficha, s.id))}`).join(", ")}`,
      `Atributos: ${atributos}`,
      `${atq.rotulo} ${atq.iterativos}, dano ${atq.dano}, crítico ${atq.critico}${furtivo ? ` · ataque furtivo +${furtivo}` : ""}`,
      `Perícias (graduações): ${linhaPericias(ficha).join(", ") || "nenhuma"}`,
      magia ? `Magia: ${magia}` : "",
      `Recursos: ${recursos.join(", ") || "nenhum"}`,
      `Talentos: ${talentosDe(ficha).map((t) => t.nome).join(", ") || "nenhum"}`,
      `Habilidades de classe: ${habilidadesAtuais(ficha).join("; ")}`,
      escolhas.length ? `Escolhas: ${escolhas.join(" · ")}` : "",
      `Traços raciais: ${(raca.tracos ?? []).join("; ") || "nenhum"}`,
      `Inventário: ${ficha.inventario.join(", ") || "nada"}`,
      `Condições: ${ficha.condicoes.join(", ") || "nenhuma"}`,
      ficha.historia ? `História: ${ficha.historia}` : "",
    ];
    return linhas.filter(Boolean).join("\n");
  },

  blocosFicha(ficha): BlocoFicha[] {
    const classe = classeDe(ficha);
    const raca = racaDe(ficha);
    const ca = calcularCA(ficha);
    const base = bba(classe, ficha.nivel);
    const atq = ataque(ficha);
    const furtivo = ataqueFurtivo(ficha);
    const magia = resumoMagia(ficha);
    const blocos: BlocoFicha[] = [
      {
        tipo: "barras",
        itens: [
          { rotulo: "PV", atual: ficha.pv, max: ficha.pvMax, cor: "vida" },
          // espaços de magia primeiro, em ordem de nível; depois o resto
          ...Object.entries(ficha.recursos)
            .sort(([a], [b]) => Number(!RECURSOS_DE_MAGIA.includes(a)) - Number(!RECURSOS_DE_MAGIA.includes(b)) || (RECURSOS_DE_MAGIA.includes(a) ? a.localeCompare(b) : 0))
            .map(([id, r]: [string, Recurso]) => ({
            rotulo: r.rotulo, atual: r.atual, max: r.max, cor: RECURSOS_DE_MAGIA.includes(id) ? ("magia" as const) : ("outro" as const),
          })),
        ],
      },
      {
        tipo: "grade",
        itens: [
          { rotulo: "CA", valor: String(ficha.defesa), detalhe: `toque ${ca.toque} · surpresa ${ca.surpresa}` },
          { rotulo: "BBA", valor: sinal(base) },
          { rotulo: "Iniciativa", valor: sinal(iniciativa(ficha)) },
          { rotulo: "BMC", valor: sinal(cmb(ficha)) },
          { rotulo: "DMC", valor: String(cmd(ficha)) },
          { rotulo: "po", valor: String(ficha.dinheiro) },
        ],
      },
      {
        tipo: "grade",
        titulo: "Salvamentos",
        itens: SALVAMENTOS.map((s) => ({ rotulo: s.nome, valor: sinal(salvamento(ficha, s.id)), detalhe: classe.bons.includes(s.id) ? "bom" : undefined })),
      },
      {
        tipo: "grade",
        titulo: "Atributos",
        itens: ATRIBUTOS.map((a) => ({ rotulo: a.abrev, valor: String(ficha.atributos[a.id] ?? 10), detalhe: sinal(mod(ficha, a.id)) })),
      },
      {
        tipo: "grade",
        titulo: "Ataque",
        itens: [
          { rotulo: classe.arma.nome, valor: atq.iterativos, detalhe: `${atq.dano} · ${atq.critico}` },
          ...(furtivo ? [{ rotulo: "Ataque furtivo", valor: `+${furtivo}` }] : []),
          ...(classe.magia ? [{ rotulo: "Toque à distância", valor: sinal(ataque(ficha, "toque_dist").bonus) }] : []),
        ],
      },
      { tipo: "etiquetas", titulo: "Perícias (graduações)", itens: linhaPericias(ficha) },
    ];
    if (magia) blocos.push({ tipo: "texto", titulo: "Magia", texto: magia });
    if (ficha.condicoes.length) blocos.splice(1, 0, { tipo: "etiquetas", titulo: "Condições", itens: ficha.condicoes });
    const talentos = talentosDe(ficha).map((t) => t.nome);
    blocos.push({ tipo: "etiquetas", titulo: `Talentos (${talentos.length} de ${talentosPermitidos(ficha)})`, itens: talentos.length ? talentos : ["nenhum ainda"] });
    blocos.push({ tipo: "lista", titulo: `Habilidades de ${classe.nome}`, itens: habilidadesAtuais(ficha) });
    const escolhas = escolhasDescritas(ficha);
    const alinhamento = ALINHAMENTOS.find((a) => a.id === ficha.extras.alinhamento)?.nome;
    const divindade = textoExtra(ficha, "divindade");
    const identidade = [alinhamento, divindade ? `Divindade: ${divindade}` : "", ...escolhas].filter((x): x is string => Boolean(x));
    if (identidade.length) blocos.push({ tipo: "etiquetas", titulo: "Escolhas", itens: identidade });
    blocos.push({ tipo: "lista", titulo: "Inventário", itens: ficha.inventario });
    if (raca.tracos?.length) blocos.push({ tipo: "etiquetas", titulo: `Traços de ${raca.nome}`, itens: raca.tracos });
    return blocos;
  },

  xpParaNivel(nivel) {
    return XP_MEDIA[nivel] ?? null;
  },

  subirNivel(original) {
    const ficha = clonar(original);
    if (ficha.nivel >= 20) return { ficha, resumo: `${ficha.nome} já está no 20º nível. Daqui pra frente, só lenda e dor nas costas.` };
    const classe = classeDe(ficha);
    const caAntes = calcularCA(ficha).total;
    const desvioCA = ficha.defesa - caAntes; // ajustes manuais (itens mágicos etc.) que o mestre colocou
    const conAntes = mod(ficha, "con");
    const talentosAntes = talentosPermitidos(ficha);
    const partes: string[] = [];

    ficha.nivel += 1;
    const n = ficha.nivel;

    // +1 num atributo a cada 4 níveis (vai no atributo-chave)
    if (n % 4 === 0) {
      const chaveAtr = classe.atributoChave ?? "for";
      ficha.atributos[chaveAtr] = limitar((ficha.atributos[chaveAtr] ?? 10) + 1, LIMITES.min, LIMITES.max);
      partes.push(`+1 em ${ATRIBUTOS.find((a) => a.id === chaveAtr)?.abrev ?? chaveAtr}`);
    }
    // CON nova vale para todos os níveis anteriores
    const retroativo = (mod(ficha, "con") - conAntes) * (n - 1);
    const ganho = pvPorNivel(ficha) + (temTalento(ficha, "robustez") && n > 3 ? 1 : 0) + retroativo;
    ficha.pvMax += Math.max(1, ganho);
    ficha.pv = Math.min(ficha.pvMax, ficha.pv + Math.max(1, ganho));
    partes.push(`+${Math.max(1, ganho)} PV`);

    const subidas = distribuirGraduacoes(ficha, pontosPorNivel(ficha), []);
    if (subidas.length) partes.push(`graduações em ${subidas.map((id) => PERICIAS.find((p) => p.id === id)?.nome ?? id).join(", ")}`);

    const novosTalentos = talentosPermitidos(ficha) - talentosAntes;
    if (novosTalentos > 0) partes.push(`${novosTalentos} talento${novosTalentos > 1 ? "s" : ""} novo${novosTalentos > 1 ? "s" : ""} para escolher com o mestre`);

    const espacosAntes = RECURSOS_DE_MAGIA.filter((id) => ficha.recursos[id]).length;
    sincronizarRecursos(ficha, false);
    const espacosDepois = RECURSOS_DE_MAGIA.filter((id) => ficha.recursos[id]).length;
    if (espacosDepois > espacosAntes) partes.push(`magias de ${ORDINAIS[espacosDepois]} nível liberadas`);

    const novas = classe.habilidades.filter(([nivel]) => nivel === n).map(([, texto]) => texto);
    if (novas.length) partes.push(`ganhou: ${novas.join("; ")}`);

    if (ficha.recursos.heroi) ficha.recursos.heroi.atual = Math.min(ficha.recursos.heroi.max, ficha.recursos.heroi.atual + 1);
    ficha.defesa = calcularCA(ficha).total + desvioCA;

    return {
      ficha,
      resumo: `${ficha.nome} chegou ao ${n}º nível de ${classe.nome}: ${partes.join(", ")}. BBA ${sinal(bba(classe, n))}, PV ${ficha.pvMax}.`,
    };
  },

  descansar(original, tipo) {
    const ficha = clonar(original);
    if (tipo === "longo") {
      const cura = ficha.nivel;
      ficha.pv = Math.min(ficha.pvMax, ficha.pv + cura);
      sincronizarRecursos(ficha, true); // pontos de herói ficam de fora: não voltam dormindo
      ficha.condicoes = ficha.condicoes
        .filter((c) => !/^fatigad/.test(normalizar(c)))
        .map((c) => (/^exaust/.test(normalizar(c)) ? "fatigado" : c));
      return { ficha, resumo: `${ficha.nome} dormiu oito horas: +${cura} PV (agora ${ficha.pv}/${ficha.pvMax}) e magias e habilidades diárias de volta.` };
    }
    const tinhaFadiga = ficha.condicoes.some((c) => /^fatigad/.test(normalizar(c)));
    ficha.condicoes = ficha.condicoes.filter((c) => !/^fatigad/.test(normalizar(c)));
    return {
      ficha,
      resumo: `${ficha.nome} parou para respirar.${tinhaFadiga ? " A fadiga passou." : ""} No Pathfinder pausa curta não cura PV: só magia, poção ou Cura.`,
    };
  },
};
