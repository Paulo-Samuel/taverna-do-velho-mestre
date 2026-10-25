import "server-only";
import { d } from "../../dados";
import { acharPorNome, normalizar, sinal } from "../comum";
import type { Ficha, GrauSucesso, PedidoTeste, ResultadoTeste } from "../tipos";
import { ATRIBUTOS, PERICIAS } from "./dados";
import {
  atributoMagia,
  classeDe,
  criticoMinimo,
  especieDe,
  estiloLuta,
  mod,
  proficiencia,
  talentosDe,
  temSubclasse,
  texto,
} from "./regras";

// Resolução de testes do 5e: interpreta o pedido do mestre de forma tolerante, soma a ficha,
// aplica condições e traços (vantagem/desvantagem, exaustão, Sortudo do Halfling, Talento Confiável...) e rola o d20.

type Tipo = "pericia" | "atributo" | "resistencia" | "ataque" | "magia" | "iniciativa" | "morte" | "livre";

export type Calculo = {
  tipo: Tipo;
  rotulo: string;
  bonus: number;
  /** atributo envolvido (para fúria, Sentido do Perigo, Astúcia Gnômica...) */
  atributo?: string;
  /** grau na perícia (0/1/2), para Talento Confiável */
  grau?: number;
  /** de onde veio o bônus, para o detalhe do resultado */
  partes: string[];
};

// Palavras comuns que o mestre usa no lugar do nome da perícia
const SINONIMOS: [RegExp, string][] = [
  [/escond|esgueir|sorrateir|furtiv/, "furtividade"],
  [/escalar|nadar|saltar|pular|agarr|empurr|arromb|levantar|forcar porta/, "atletismo"],
  [/equilibr|cambalhot|rolament|esquivar de queda/, "acrobacia"],
  [/mentir|blefe|disfarc|engan/, "enganacao"],
  [/ouvir|notar|vigiar|avistar|escutar|perceb/, "percepcao"],
  [/rastre|cacar|orientar|forragear|acampar/, "sobrevivencia"],
  [/primeiros socorros|estabiliz|diagnost|curar ferid/, "medicina"],
  [/sentir motiv|detectar mentira|ler pessoa|intencao/, "intuicao"],
  [/convenc|diplomac|negoci|barganh|seduz/, "persuasao"],
  [/amea[cç]|intimid|coagir/, "intimidacao"],
  [/investig|procurar pista|examinar|deduz|vasculh/, "investigacao"],
  [/cavalg|montaria|acalmar animal|domar/, "adestrar"],
  [/punga|batedor de carteira|truque de mao|surrupi/, "prestidigitacao"],
  [/cantar|tocar|danc|encenar|discurso/, "atuacao"],
  [/arcan|identificar magia/, "arcanismo"],
  [/divin|deuses|ritual sagrado/, "religiao"],
  [/plantas|ervas|clima|bichos/, "natureza"],
  [/lembrar|lenda|historic/, "historia"],
];

function acharAtributo(trecho: string): (typeof ATRIBUTOS)[number] | undefined {
  const alvo = normalizar(trecho);
  const porNome = acharPorNome(ATRIBUTOS, alvo);
  if (porNome) return porNome;
  const palavras = alvo.split(/[^a-z]+/);
  return ATRIBUTOS.find((a) => palavras.includes(a.id)) ?? ATRIBUTOS.find((a) => palavras.some((p) => p.length >= 3 && normalizar(a.nome).startsWith(p)));
}

/** Atributo da resistência quando o mestre descreve o efeito em vez do atributo. */
function atributoDoEfeito(trecho: string): string {
  if (/veneno|doenc|toxin|concentr|exaust|fome|frio|calor|morte|necrot/.test(trecho)) return "con";
  if (/medo|enfeit|encant|charme|ilus|sono|mente|loucura/.test(trecho)) return "sab";
  if (/possess|banim|expuls/.test(trecho)) return "car";
  if (/empurr|agarr|derrub|esmag|prender/.test(trecho)) return "for";
  if (/psiqu|memoria/.test(trecho)) return "int";
  return "des";
}

function bonusResistencia(ficha: Ficha, atributo: string, rotulo: string): Calculo {
  const classe = classeDe(ficha);
  const prof = proficiencia(ficha.nivel);
  const partes = [`${atributo.toUpperCase()} ${sinal(mod(ficha, atributo))}`];
  let bonus = mod(ficha, atributo);
  const proficiente =
    classe.resistencias.includes(atributo) ||
    (classe.id === "monge" && ficha.nivel >= 14) ||
    (classe.id === "ladino" && ficha.nivel >= 15 && (atributo === "sab" || atributo === "car"));
  if (proficiente) {
    bonus += prof;
    partes.push(`proficiência ${sinal(prof)}`);
  }
  if (classe.id === "paladino" && ficha.nivel >= 6) {
    const aura = Math.max(1, mod(ficha, "car"));
    bonus += aura;
    partes.push(`Aura de Proteção ${sinal(aura)}`);
  }
  return { tipo: "resistencia", rotulo, bonus, atributo, partes };
}

/** Pau pra Toda Obra: Bardo soma metade da proficiência em testes de atributo sem proficiência. */
function pauPraTodaObra(ficha: Ficha): number {
  return classeDe(ficha).id === "bardo" && ficha.nivel >= 2 ? Math.floor(proficiencia(ficha.nivel) / 2) : 0;
}

function bonusPericia(ficha: Ficha, periciaId: string): Calculo {
  const pericia = PERICIAS.find((p) => p.id === periciaId)!;
  const atributo = pericia.atributo ?? "for";
  const grau = Math.max(0, Math.min(2, ficha.pericias[pericia.id] ?? 0));
  const prof = proficiencia(ficha.nivel);
  const partes = [`${atributo.toUpperCase()} ${sinal(mod(ficha, atributo))}`];
  let bonus = mod(ficha, atributo);
  if (grau) {
    bonus += grau * prof;
    partes.push(`${grau === 2 ? "especialização" : "proficiência"} ${sinal(grau * prof)}`);
  } else if (pauPraTodaObra(ficha)) {
    bonus += pauPraTodaObra(ficha);
    partes.push(`Pau pra Toda Obra ${sinal(pauPraTodaObra(ficha))}`);
  }
  // Taumaturgo (Clérigo) e Mágico (Druida) somam a SAB em perícias de conhecimento
  const classe = classeDe(ficha);
  const sabio =
    (classe.id === "clerigo" && texto(ficha, "ordemDivina") === "taumaturgo" && ["arcanismo", "religiao"].includes(pericia.id)) ||
    (classe.id === "druida" && texto(ficha, "ordemPrimal") === "magico" && ["arcanismo", "natureza"].includes(pericia.id));
  if (sabio) {
    const extra = Math.max(1, mod(ficha, "sab"));
    bonus += extra;
    partes.push(`ordem ${sinal(extra)}`);
  }
  return { tipo: "pericia", rotulo: pericia.nome, bonus, atributo, grau, partes };
}

// Armas comuns e o atributo que usam (acuidade = o melhor entre FOR e DES)
const ARMAS: [RegExp, string, "for" | "des" | "acuidade"][] = [
  [/arco|besta|funda|dardo/, "à distância", "des"],
  [/adaga|rapieira|espada curta|cimitarra|chicote/, "acuidade", "acuidade"],
  [/machad|martelo|espada longa|montante|espadao|maca|clava|lanca|alabarda|tridente|mangual|picareta|azagaia/, "corpo a corpo", "for"],
];

function bonusAtaque(ficha: Ficha, trecho: string, original: string): Calculo {
  const classe = classeDe(ficha);
  const prof = proficiencia(ficha.nivel);
  const descricao = original.replace(/^\s*(ataque|atacar|golpe)\s*(com|de|à|a|\()?\s*/i, "").replace(/\)\s*$/, "").trim();

  if (/magi|feiti|truque|rajada|raio|conjur/.test(trecho)) return bonusMagia(ficha, descricao);

  let atributo = classe.ataque.atributo;
  let arma = classe.ataque.arma;
  let distancia = Boolean(classe.ataque.distancia);
  if (/desarmad|soco|chute|cabecad/.test(trecho)) {
    arma = "desarmado";
    atributo = classe.id === "monge" ? "des" : "for";
    distancia = false;
  } else if (descricao) {
    const achada = ARMAS.find(([re]) => re.test(trecho));
    if (achada) {
      arma = descricao;
      atributo = achada[2] === "acuidade" ? (mod(ficha, "des") >= mod(ficha, "for") ? "des" : "for") : achada[2];
      distancia = achada[2] === "des";
    } else if (/distanc|arremess/.test(trecho)) {
      arma = descricao;
      atributo = "des";
      distancia = true;
    }
  }
  // Monge usa DES nas armas simples e desarmado; o Druida com shillelagh usa SAB
  if (classe.id === "monge" && !distancia) atributo = mod(ficha, "des") >= mod(ficha, "for") ? "des" : "for";

  const partes = [`${atributo.toUpperCase()} ${sinal(mod(ficha, atributo))}`, `proficiência ${sinal(prof)}`];
  let bonus = mod(ficha, atributo) + prof;
  if (distancia && estiloLuta(ficha) === "arquearia") {
    bonus += 2;
    partes.push("Arquearia +2");
  }
  return { tipo: "ataque", rotulo: `Ataque (${arma})`, bonus, atributo, partes };
}

function bonusMagia(ficha: Ficha, descricao = ""): Calculo {
  const atributo = atributoMagia(ficha);
  const prof = proficiencia(ficha.nivel);
  const nome = descricao && !/^(magia|magico|magica)$/i.test(normalizar(descricao)) ? ` (${descricao})` : "";
  if (!atributo) {
    // quem não conjura usa o melhor atributo mental, sem proficiência (item mágico, pergaminho...)
    const melhor = ["int", "sab", "car"].sort((a, b) => mod(ficha, b) - mod(ficha, a))[0];
    return { tipo: "magia", rotulo: `Ataque mágico${nome} sem treino`, bonus: mod(ficha, melhor), atributo: melhor, partes: [`${melhor.toUpperCase()} ${sinal(mod(ficha, melhor))}`] };
  }
  return {
    tipo: "magia",
    rotulo: `Ataque mágico${nome}`,
    bonus: mod(ficha, atributo) + prof,
    atributo,
    partes: [`${atributo.toUpperCase()} ${sinal(mod(ficha, atributo))}`, `proficiência ${sinal(prof)}`],
  };
}

/** Descobre o que está sendo testado e o bônus da ficha. */
export function calcular(ficha: Ficha, teste: string): Calculo {
  const nome = normalizar(teste);
  const prof = proficiencia(ficha.nivel);

  if (/contra a morte|^(teste de |salvamento de )?morte|morrendo|moribund/.test(nome)) return { tipo: "morte", rotulo: "Teste contra a morte", bonus: 0, partes: [] };

  if (/^inicia/.test(nome)) {
    const partes = [`DES ${sinal(mod(ficha, "des"))}`];
    let bonus = mod(ficha, "des");
    if (talentosDe(ficha).includes("alerta")) {
      bonus += prof;
      partes.push(`Alerta ${sinal(prof)}`);
    }
    if (pauPraTodaObra(ficha)) {
      bonus += pauPraTodaObra(ficha);
      partes.push(`Pau pra Toda Obra ${sinal(pauPraTodaObra(ficha))}`);
    }
    return { tipo: "iniciativa", rotulo: "Iniciativa", bonus, atributo: "des", partes };
  }

  if (/concentr/.test(nome)) return bonusResistencia(ficha, "con", "Concentração (resistência de CON)");

  const resistencia = nome.match(/^(?:teste de )?(?:resistencia|salvaguarda|salvamento|save|ts)\b(?:\s+(?:de|da|do|a|contra))?\s*(.*)$/) ?? nome.match(/^(.+?)\s+save$/);
  if (resistencia) {
    const resto = resistencia[1] ?? "";
    const atributo = acharAtributo(resto)?.id ?? atributoDoEfeito(resto);
    const def = ATRIBUTOS.find((a) => a.id === atributo)!;
    return bonusResistencia(ficha, atributo, `Resistência de ${def.nome}`);
  }

  if (/^(ataque|atacar|golpe)/.test(nome)) return bonusAtaque(ficha, nome, teste);
  if (/^(magia|conjur|feiti|truque|ataque magico)/.test(nome)) return bonusMagia(ficha, teste.replace(/^\s*(magia|conjurar|feitiço|truque)\s*(de|com|\()?\s*/i, "").replace(/\)\s*$/, ""));

  if (/ferramentas de ladrao|fechadura|desarmar armadilha|abrir cadeado/.test(nome)) {
    const treinado = classeDe(ficha).id === "ladino" || ficha.antecedente === "criminoso" || ficha.antecedente === "andarilho";
    const partes = [`DES ${sinal(mod(ficha, "des"))}`, ...(treinado ? [`proficiência ${sinal(prof)}`] : [])];
    return { tipo: "atributo", rotulo: "Ferramentas de ladrão", bonus: mod(ficha, "des") + (treinado ? prof : 0), atributo: "des", grau: treinado ? 1 : 0, partes };
  }

  const pericia = acharPorNome(PERICIAS, teste) ?? PERICIAS.find((p) => SINONIMOS.some(([re, id]) => id === p.id && re.test(nome)));
  if (pericia) return bonusPericia(ficha, pericia.id);

  const atributo = acharAtributo(nome);
  if (atributo) {
    const partes = [`${atributo.abrev} ${sinal(mod(ficha, atributo.id))}`];
    let bonus = mod(ficha, atributo.id);
    if (pauPraTodaObra(ficha)) {
      bonus += pauPraTodaObra(ficha);
      partes.push(`Pau pra Toda Obra ${sinal(pauPraTodaObra(ficha))}`);
    }
    return { tipo: "atributo", rotulo: `Teste de ${atributo.nome}`, bonus, atributo: atributo.id, partes };
  }

  return { tipo: "livre", rotulo: teste.trim() || "Teste", bonus: 0, partes: [] };
}

/** Nível de exaustão a partir das condições ("exaustão 2", "exausto"). */
export function nivelExaustao(ficha: Ficha): number {
  for (const c of ficha.condicoes) {
    const n = normalizar(c);
    if (!/exaust/.test(n)) continue;
    const numero = n.match(/(\d+)/);
    return Math.max(1, Math.min(6, numero ? Number(numero[1]) : 1));
  }
  return 0;
}

function temCondicao(ficha: Ficha, re: RegExp): boolean {
  return ficha.condicoes.some((c) => re.test(normalizar(c)));
}

/** Fontes de vantagem e desvantagem vindas da ficha (condições e traços). */
function fontesDeModo(ficha: Ficha, calc: Calculo, motivo: string): { vant: string[]; desv: string[] } {
  const vant: string[] = [];
  const desv: string[] = [];
  const classe = classeDe(ficha);
  const especie = especieDe(ficha).id;
  const m = normalizar(motivo);
  const ehTeste = calc.tipo === "pericia" || calc.tipo === "atributo" || calc.tipo === "iniciativa";
  const ehAtaque = calc.tipo === "ataque" || calc.tipo === "magia";
  const emFuria = classe.id === "barbaro" && temCondicao(ficha, /furia/);

  if (calc.tipo === "morte") return { vant, desv };
  if (temCondicao(ficha, /envenenad/) && (ehTeste || ehAtaque)) desv.push("envenenado");
  if (temCondicao(ficha, /amedrontad/) && (ehTeste || ehAtaque)) desv.push("amedrontado");
  if (temCondicao(ficha, /\bcego\b|\bcega\b/) && ehAtaque) desv.push("cego");
  if (temCondicao(ficha, /caid|derrubad/) && ehAtaque) desv.push("caído");
  if (temCondicao(ficha, /impedid|contid|preso/) && (ehAtaque || (calc.tipo === "resistencia" && calc.atributo === "des"))) desv.push("impedido");
  if (temCondicao(ficha, /invisivel/) && (ehAtaque || calc.tipo === "iniciativa")) vant.push("invisível");

  if (emFuria && calc.atributo === "for" && (ehTeste || calc.tipo === "resistencia")) vant.push("Fúria");
  if (classe.id === "barbaro" && ficha.nivel >= 2 && calc.tipo === "resistencia" && calc.atributo === "des") vant.push("Sentido do Perigo");
  if (classe.id === "barbaro" && ficha.nivel >= 7 && calc.tipo === "iniciativa") vant.push("Instinto Feral");
  if (temSubclasse(ficha, "ladrao") && ficha.nivel >= 9 && calc.tipo === "pericia" && calc.rotulo === "Furtividade") vant.push("Furtividade Suprema");

  if (calc.tipo === "resistencia") {
    if (especie === "gnomo" && ["int", "sab", "car"].includes(calc.atributo ?? "")) vant.push("Astúcia Gnômica");
    if (especie === "anao" && /venen/.test(m)) vant.push("Resiliência Anã");
    if (especie === "halfling" && /medo|amedront|pavor|terror/.test(m)) vant.push("Corajoso");
    if (especie === "elfo" && /enfeit|encant|charme|seduc/.test(m)) vant.push("Ancestralidade Feérica");
  }
  return { vant, desv };
}

const ROTULOS: Record<Tipo, Partial<Record<GrauSucesso, string>>> = {
  ataque: { sucesso_critico: "Acerto crítico! Dobre os dados de dano.", sucesso: "Acertou", falha: "Errou", falha_critica: "Erro automático (1 natural)" },
  magia: { sucesso_critico: "Acerto crítico! Dobre os dados de dano.", sucesso: "Acertou", falha: "Errou", falha_critica: "Erro automático (1 natural)" },
  resistencia: { sucesso_critico: "Resistiu (20 natural!)", sucesso: "Resistiu", falha: "Não resistiu", falha_critica: "Não resistiu (1 natural)" },
  morte: { sucesso_critico: "20 natural: volta com 1 PV!", sucesso: "Sucesso contra a morte", falha: "Falha contra a morte", falha_critica: "1 natural: duas falhas!" },
  pericia: { sucesso_critico: "Sucesso (20 natural!)", sucesso: "Sucesso", falha: "Falha", falha_critica: "Falha (1 natural)" },
  atributo: { sucesso_critico: "Sucesso (20 natural!)", sucesso: "Sucesso", falha: "Falha", falha_critica: "Falha (1 natural)" },
  iniciativa: {},
  livre: { sucesso_critico: "Sucesso (20 natural!)", sucesso: "Sucesso", falha: "Falha", falha_critica: "Falha (1 natural)" },
};

/** Rola o d20 do 5e para um pedido do mestre. */
export function resolver(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
  const calc = calcular(ficha, pedido.teste);
  const { vant, desv } = fontesDeModo(ficha, calc, pedido.motivo ?? "");
  if (pedido.modo === "vantagem") vant.unshift("mestre");
  if (pedido.modo === "desvantagem") desv.unshift("mestre");
  // qualquer vantagem com qualquer desvantagem se anulam (regra do 5e)
  const modo = vant.length && desv.length ? "normal" : vant.length ? "vantagem" : desv.length ? "desvantagem" : "normal";

  const detalhes: string[] = [];
  const brutos = modo === "normal" ? [d(20)] : [d(20), d(20)];
  const todos = [...brutos];
  // Sortudo do Halfling: rerrola cada 1 natural uma vez
  const efetivos = brutos.map((v) => {
    if (v !== 1 || especieDe(ficha).id !== "halfling") return v;
    const novo = d(20);
    todos.push(novo);
    detalhes.push(`Sortudo: rerrolou o 1 (saiu ${novo})`);
    return novo;
  });
  const natural = modo === "vantagem" ? Math.max(...efetivos) : modo === "desvantagem" ? Math.min(...efetivos) : efetivos[0];
  if (modo !== "normal") detalhes.unshift(`${modo} (${(modo === "vantagem" ? vant : desv).join(", ")}): ${efetivos.join(" e ")}`);
  else if (vant.length && desv.length) detalhes.unshift(`vantagem (${vant.join(", ")}) e desvantagem (${desv.join(", ")}) se anulam`);

  // Talento Confiável (Ladino 7+): em perícia treinada, d20 abaixo de 10 conta como 10
  let dadoUsado = natural;
  if (classeDe(ficha).id === "ladino" && ficha.nivel >= 7 && (calc.grau ?? 0) >= 1 && natural < 10) {
    dadoUsado = 10;
    detalhes.push(`Talento Confiável: ${natural} vira 10`);
  }

  const exaustao = calc.tipo === "morte" ? 0 : nivelExaustao(ficha) * 2;
  if (exaustao) detalhes.push(`exaustão −${exaustao}`);
  const bonus = calc.bonus + (pedido.modificador ?? 0) - exaustao;
  const total = dadoUsado + bonus;
  const alvo = calc.tipo === "morte" ? (pedido.alvo ?? 10) : (pedido.alvo ?? null);
  if (calc.partes.length) detalhes.push(calc.partes.join(", ") + (pedido.modificador ? `, circunstância ${sinal(pedido.modificador)}` : ""));

  let grau: GrauSucesso;
  const critMin = calc.tipo === "ataque" ? criticoMinimo(ficha) : 20;
  if (calc.tipo === "ataque" || calc.tipo === "magia") {
    grau = natural >= critMin ? "sucesso_critico" : natural === 1 ? "falha_critica" : alvo === null || total >= alvo ? "sucesso" : "falha";
  } else if (calc.tipo === "morte") {
    grau = natural === 20 ? "sucesso_critico" : natural === 1 ? "falha_critica" : total >= (alvo ?? 10) ? "sucesso" : "falha";
  } else if (alvo === null) {
    grau = natural === 20 ? "sucesso_critico" : natural === 1 ? "falha_critica" : "sucesso";
  } else {
    // em testes e resistências o 20/1 natural não decidem sozinhos: só destacam o resultado
    const passou = total >= alvo;
    grau = passou ? (natural === 20 ? "sucesso_critico" : "sucesso") : natural === 1 ? "falha_critica" : "falha";
  }
  if (natural >= critMin && critMin < 20 && natural < 20) detalhes.push(`crítico com ${critMin}-20`);

  const rotuloGrau =
    calc.tipo === "iniciativa"
      ? `Iniciativa ${total}`
      : alvo === null && calc.tipo !== "ataque" && calc.tipo !== "magia" && grau === "sucesso"
        ? `Total ${total}`
        : (ROTULOS[calc.tipo][grau] ?? grau);
  const base = modo === "normal" ? "1d20" : modo === "vantagem" ? "2d20kh1" : "2d20kl1";

  return {
    tipo: "teste",
    sistema: "dnd5e",
    personagem: ficha.nome,
    motivo: pedido.motivo,
    teste: calc.rotulo,
    expressao: `${base}${bonus ? sinal(bonus) : ""}`,
    dados: todos,
    natural,
    bonus,
    total,
    alvo,
    grau,
    sucesso: grau === "sucesso" || grau === "sucesso_critico",
    rotuloGrau,
    detalhes: detalhes.join(" · ") || undefined,
    margem: alvo === null ? null : total - alvo,
  };
}
