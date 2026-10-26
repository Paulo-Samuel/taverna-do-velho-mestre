import "server-only";
import { d } from "../../dados";
import { limitar, normalizar } from "../comum";
import type { Ficha, GrauSucesso, PedidoTeste, ResultadoTeste } from "../tipos";
import { ATRIBUTOS, DISCIPLINAS, PAR_DE_ATRIBUTO, PERICIAS, POTENCIA, PREDADORES } from "./dados";

// Testes de V5: parada de d10, sucesso em 6+, cada PAR de 10 vale 4 sucessos (2 extras). Parte da parada vira dados de Fome.
//   Crítico       total ≥ dificuldade com pelo menos um par de 10
//   Crítico Sujo  o mesmo, mas algum 10 saiu num dado de Fome (a Besta "ajudou": compulsão ou consequência)
//   Falha Bestial total < dificuldade e algum dado de Fome mostrou 1
// pedido.alvo = dificuldade (sucessos necessários), padrão 1. Iniciativa não tem dificuldade.

export const ID = "vtm5";

/** Que tipo de teste foi (vai no resultado; aposTeste e o cartão usam). */
export type TipoTesteVtm = "parada" | "despertar" | "remorso" | "frenesi" | "vontade" | "iniciativa";

export type ResultadoVtm = ResultadoTeste & {
  /** quantos dados foram rolados (normais + Fome) */
  parada: number;
  /** faces dos dados de Fome (também estão no fim de `dados`) */
  dadosFome: number[];
  vtm: TipoTesteVtm;
  /** Despertares que falharam neste teste (Despertar e Surto de Sangue): cada um é +1 de Fome no aposTeste */
  falhasDespertar?: number;
};

// ---------- leitura da ficha ----------

export const recurso = (ficha: Ficha, id: string, padrao = 0) => ficha.recursos[id]?.atual ?? padrao;
export const fomeDe = (ficha: Ficha) => limitar(recurso(ficha, "fome", 1), 0, 5);
export const humanidadeDe = (ficha: Ficha) => limitar(recurso(ficha, "humanidade", 7), 0, 10);
export const vontadeDe = (ficha: Ficha) => Math.max(0, recurso(ficha, "vontade", 0));
export const potenciaDe = (ficha: Ficha) => limitar(ficha.nivel, 0, 10);
export const efeitosPotencia = (ficha: Ficha) => POTENCIA[potenciaDe(ficha)];

/** Manchas: o recurso "mancha" (que o mestre mexe com alterar_ficha) manda; extras.mancha é o espelho. */
export function manchaDe(ficha: Ficha): number {
  const r = ficha.recursos.mancha?.atual;
  const e = typeof ficha.extras.mancha === "number" ? ficha.extras.mancha : 0;
  return limitar(r ?? e, 0, 10);
}

export function disciplinasDe(ficha: Ficha): Record<string, number> {
  const v = ficha.extras.disciplinas;
  return v && typeof v === "object" ? (v as Record<string, number>) : {};
}

export function listaExtra(ficha: Ficha, id: string): string[] {
  const v = ficha.extras[id];
  return Array.isArray(v) ? v.map(String).filter(Boolean) : typeof v === "string" && v ? [v] : [];
}

/** Atormentado: manchas preenchem todas as caixas vazias de Humanidade (−2 dados em tudo até o Remorso). */
export function atormentado(ficha: Ficha): boolean {
  const mancha = manchaDe(ficha);
  return mancha > 0 && mancha >= 10 - humanidadeDe(ficha);
}

// ---------- contagem ----------

export type Avaliacao = { total: number; pares: number; sujo: boolean; bestial: boolean; grau: GrauSucesso; rotulo: string };

/** Conta sucessos: 6+ é sucesso; cada par de 10 soma 2 extras. */
export function contarSucessos(faces: number[]): { total: number; pares: number } {
  const sucessos = faces.filter((v) => v >= 6).length;
  const pares = Math.floor(faces.filter((v) => v === 10).length / 2);
  return { total: sucessos + pares * 2, pares };
}

/** Grau de um teste normal. `alvo` null = sem dificuldade (iniciativa: só conta sucessos). */
export function avaliar(normais: number[], fome: number[], alvo: number | null): Avaliacao {
  const { total, pares } = contarSucessos([...normais, ...fome]);
  const passou = total >= (alvo ?? 0);
  const sujo = passou && pares > 0 && fome.includes(10);
  const bestial = !passou && fome.includes(1);
  let grau: GrauSucesso;
  let rotulo: string;
  if (passou && pares > 0) {
    grau = "sucesso_critico";
    rotulo = sujo ? "Crítico Sujo" : "Crítico";
  } else if (passou) {
    grau = "sucesso";
    rotulo = alvo === null ? `${total} sucesso${total === 1 ? "" : "s"}` : "Sucesso";
  } else if (bestial) {
    grau = "falha_critica";
    rotulo = "Falha Bestial";
  } else {
    grau = "falha";
    rotulo = total === 0 ? "Falha total" : "Falha";
  }
  return { total, pares, sujo, bestial, grau, rotulo };
}

// ---------- interpretação do pedido ----------

type Peca = { tipo: "atributo" | "pericia" | "disciplina"; id: string; nome: string; valor: number };

const casa = (alvo: string, nomes: string[]) => nomes.some((n) => normalizar(n) === alvo);

function acharPeca(ficha: Ficha, bruto: string): Peca | null {
  const alvo = normalizar(bruto.replace(/\(.*?\)/g, "")).replace(/[.:!?]+$/, "");
  if (!alvo) return null;
  const atributo = (id: string): Peca => {
    const a = ATRIBUTOS.find((x) => x.id === id)!;
    return { tipo: "atributo", id, nome: a.nome, valor: ficha.atributos[id] ?? 1 };
  };
  const pericia = (id: string): Peca => {
    const p = PERICIAS.find((x) => x.id === id)!;
    return { tipo: "pericia", id, nome: p.nome, valor: ficha.pericias[id] ?? 0 };
  };
  const disciplina = (id: string): Peca => {
    const x = DISCIPLINAS.find((y) => y.id === id)!;
    return { tipo: "disciplina", id, nome: x.nome, valor: disciplinasDe(ficha)[id] ?? 0 };
  };
  // exato primeiro (nome, id, abreviação, apelidos)
  const a = ATRIBUTOS.find((x) => casa(alvo, [x.id, x.nome, x.abrev]));
  if (a) return atributo(a.id);
  const p = PERICIAS.find((x) => casa(alvo, [x.id, x.nome, ...(x.apelidos ?? [])]));
  if (p) return pericia(p.id);
  const ds = DISCIPLINAS.find((x) => casa(alvo, [x.id, x.nome, ...(x.apelidos ?? [])]));
  if (ds) return disciplina(ds.id);
  // depois "contém": "teste de Furtividade", "Presença (Assombro)"
  const contem = (nomes: string[]) => nomes.some((n) => n.length > 3 && alvo.includes(normalizar(n)));
  const p2 = PERICIAS.find((x) => contem([x.nome, ...(x.apelidos ?? [])]));
  if (p2) return pericia(p2.id);
  const d2 = DISCIPLINAS.find((x) => contem([x.nome, ...(x.apelidos ?? [])]));
  if (d2) return disciplina(d2.id);
  const a2 = ATRIBUTOS.find((x) => contem([x.nome]));
  if (a2) return atributo(a2.id);
  return null;
}

/** Peças que formam a parada de ataque: arma pela palavra do pedido, senão a melhor das três. */
function pecasAtaque(ficha: Ficha, texto: string): Peca[] {
  const t = normalizar(texto);
  const opcoes: [string, string][] = /fogo|tiro|pistola|revolver|rifle|espingarda|atira|bala/.test(t)
    ? [["destreza", "armas_fogo"]]
    : /branca|faca|espada|lamina|estaca|bastao|machado|taco|punhal|katana/.test(t)
      ? [["forca", "armas_brancas"]]
      : /soco|briga|mordida|morder|garra|desarmad|chute|agarr/.test(t)
        ? [["forca", "briga"]]
        : [["forca", "briga"], ["forca", "armas_brancas"], ["destreza", "armas_fogo"]];
  const valor = ([a, p]: [string, string]) => (ficha.atributos[a] ?? 1) + (ficha.pericias[p] ?? 0);
  const [atr, per] = opcoes.reduce((m, o) => (valor(o) > valor(m) ? o : m), opcoes[0]);
  return [acharPeca(ficha, atr)!, acharPeca(ficha, per)!];
}

/** Completa uma peça sozinha com o atributo usual. */
function completar(ficha: Ficha, pecas: Peca[]): Peca[] {
  if (pecas.length !== 1) return pecas;
  const [p] = pecas;
  if (p.tipo === "pericia") return [acharPeca(ficha, PERICIAS.find((x) => x.id === p.id)!.atributo)!, p];
  if (p.tipo === "disciplina") return [acharPeca(ficha, DISCIPLINAS.find((x) => x.id === p.id)!.atributo)!, p];
  return [p, acharPeca(ficha, PAR_DE_ATRIBUTO[p.id] ?? "autocontrole")!];
}

/** +1 dado quando o pedido cita uma especialidade da ficha ("Furtividade (invasão)"). */
function especialidade(ficha: Ficha, pedido: string, pecas: Peca[]): string | null {
  const entre = [...pedido.matchAll(/\(([^)]+)\)/g)].map((m) => normalizar(m[1]));
  if (!entre.length) return null;
  for (const esp of listaExtra(ficha, "especialidades")) {
    const m = esp.match(/^([^(]+)\(([^)]+)\)/);
    if (!m) continue;
    const [, pericia, foco] = m;
    const daPeca = pecas.some((p) => p.tipo === "pericia" && normalizar(p.nome) === normalizar(pericia));
    if (daPeca && entre.some((e) => normalizar(foco).includes(e) || e.includes(normalizar(foco)))) return esp.trim();
  }
  return null;
}

// ---------- montagem do resultado ----------

function rolarFaces(qtd: number): number[] {
  return Array.from({ length: qtd }, () => d(10));
}

type Base = Omit<ResultadoVtm, "grau" | "sucesso" | "rotuloGrau" | "margem" | "total" | "alvo" | "detalhes">;

function base(ficha: Ficha, pedido: PedidoTeste, rotulo: string, expressao: string, normais: number[], fome: number[], vtm: TipoTesteVtm): Base {
  return {
    tipo: "teste",
    sistema: ID,
    personagem: ficha.nome,
    motivo: pedido.motivo,
    teste: rotulo,
    expressao,
    dados: [...normais, ...fome],
    natural: null,
    bonus: 0,
    parada: normais.length + fome.length,
    dadosFome: fome,
    vtm,
  };
}

/** Ajustes de modo e modificador: ±2 dados, mínimo 1. */
function ajustar(parada: number, pedido: PedidoTeste, notas: string[]): number {
  let n = parada;
  if (pedido.modo === "vantagem") {
    n += 2;
    notas.push("+2 dados (vantagem)");
  } else if (pedido.modo === "desvantagem") {
    n -= 2;
    notas.push("−2 dados (desvantagem)");
  }
  if (pedido.modificador) {
    n += pedido.modificador;
    notas.push(`${pedido.modificador > 0 ? "+" : "−"}${Math.abs(pedido.modificador)} dado(s) de modificador`);
  }
  if (n < 1) notas.push("parada mínima de 1 dado");
  return Math.max(1, Math.min(30, n));
}

function concluir(b: Base, av: Avaliacao, alvo: number | null, notas: string[]): ResultadoVtm {
  return {
    ...b,
    total: av.total,
    alvo,
    grau: av.grau,
    sucesso: av.grau === "sucesso" || av.grau === "sucesso_critico",
    rotuloGrau: av.rotulo,
    detalhes: notas.filter(Boolean).join(" · ") || undefined,
    margem: alvo === null ? null : av.total - alvo,
  };
}

/** Notas de grau: Crítico Sujo, Falha Bestial e vitória a um custo. */
function notasDoGrau(av: Avaliacao, alvo: number | null, ficha: Ficha, comFome: boolean): string[] {
  const notas: string[] = [];
  if (av.pares) notas.push(`${av.pares} par${av.pares > 1 ? "es" : ""} de 10 (+${av.pares * 2} sucessos)`);
  if (av.sujo) notas.push("Crítico Sujo: a Besta ajudou — sucesso brutal ou exagerado; o narrador pode acionar a compulsão do clã");
  if (av.bestial) notas.push("Falha Bestial: um dado de Fome deu 1 — a Besta escapa (compulsão, violência ou perda de controle)");
  if (alvo !== null && av.total > 0 && av.total < alvo) notas.push(`faltaram ${alvo - av.total}: o narrador pode oferecer vitória a um custo`);
  if (comFome && fomeDe(ficha) >= 4 && !av.bestial && !av.sujo) notas.push(`Fome ${fomeDe(ficha)}: a Besta está perto da superfície`);
  return notas;
}

// ---------- testes especiais ----------

function testeDespertar(ficha: Ficha, pedido: PedidoTeste): ResultadoVtm {
  const t = normalizar(pedido.teste);
  const qtd = limitar(Number(t.match(/(\d+)/)?.[1] ?? 1), 1, 5);
  const ef = efeitosPotencia(ficha);
  // vantagem = rerrolar o Despertar (Potência de Sangue permite em disciplinas de nível baixo, ou o mestre concede)
  const rerrolar = pedido.modo === "vantagem";
  const faces: number[] = [];
  let falhas = 0;
  for (let i = 0; i < qtd; i++) {
    const a = d(10);
    faces.push(a);
    if (a >= 6) continue;
    if (rerrolar) {
      const b = d(10);
      faces.push(b);
      if (b >= 6) continue;
    }
    falhas++;
  }
  const fome = fomeDe(ficha);
  const nova = Math.min(5, fome + falhas);
  const estourou = fome + falhas > 5;
  const notas: string[] = [];
  if (rerrolar) notas.push(`rerrolagem do Despertar (Potência ${potenciaDe(ficha)} rerrola disciplinas até nível ${ef.rerrolagem})`);
  if (falhas) notas.push(`Fome ${fome} → ${nova}`);
  else notas.push(`Fome continua ${fome}`);
  if (estourou) notas.push("já estava no limite: em vez de subir a Fome, a Besta exige um teste de Frenesi (fome) — condição \"faminto: teste de frenesi\" anotada");
  else if (nova === 5 && falhas) notas.push("Fome 5: não dá mais para Despertar sem arriscar frenesi; hora de caçar");
  const b = base(ficha, pedido, qtd > 1 ? `Despertar ×${qtd}` : "Despertar", `${faces.length}d10 (Despertar${qtd > 1 ? ` ×${qtd}` : ""})`, [], faces, "despertar");
  const sucessos = qtd - falhas;
  return {
    ...b,
    total: sucessos,
    alvo: qtd,
    grau: falhas ? "falha" : "sucesso",
    sucesso: !falhas,
    rotuloGrau: falhas ? (estourou ? "A Besta ruge" : `Fome +${falhas}`) : "Fome contida",
    detalhes: notas.join(" · "),
    margem: sucessos - qtd,
    falhasDespertar: falhas,
  };
}

function testeSemFome(ficha: Ficha, pedido: PedidoTeste, rotulo: string, paradaBase: number, notas: string[], vtm: TipoTesteVtm, alvoFixo?: number): ResultadoVtm {
  const parada = ajustar(paradaBase, pedido, notas);
  const faces = rolarFaces(parada);
  const alvo = alvoFixo ?? Math.max(0, pedido.alvo ?? 1);
  const av = avaliar(faces, [], alvo);
  const b = base(ficha, pedido, rotulo, `${parada}d10 vs ${alvo}`, faces, [], vtm);
  return concluir(b, av, alvo, [...notas, ...notasDoGrau(av, alvo, ficha, false)]);
}

// ---------- entrada principal ----------

export function resolver(ficha: Ficha, pedido: PedidoTeste): ResultadoVtm {
  const texto = pedido.teste ?? "";
  const t = normalizar(texto);

  if (/despertar|rouse|teste de fome|despertar o sangue/.test(t)) return testeDespertar(ficha, pedido);

  if (/remorso|remorse|^humanidade$|teste de humanidade/.test(t)) {
    const hum = humanidadeDe(ficha);
    const mancha = manchaDe(ficha);
    const paradaBase = Math.max(1, 10 - hum - mancha);
    const notas = [`10 − Humanidade ${hum} − Manchas ${mancha} = ${paradaBase} dado(s)`];
    const r = testeSemFome(ficha, pedido, "Remorso", paradaBase, notas, "remorso", 1);
    r.detalhes = [r.detalhes, r.sucesso ? "a culpa pesa e limpa: as Manchas somem" : `sem remorso: Humanidade ${hum} → ${Math.max(0, hum - 1)} e as Manchas somem`].filter(Boolean).join(" · ");
    return r;
  }

  if (/frenesi|frenzy/.test(t)) {
    const vontade = vontadeDe(ficha);
    const hum = humanidadeDe(ficha);
    const paradaBase = vontade + Math.floor(hum / 3);
    const notas = [`Força de Vontade ${vontade} + Humanidade ${hum}/3 (${Math.floor(hum / 3)})`];
    const r = testeSemFome(ficha, pedido, "Resistir ao Frenesi", paradaBase, notas, "frenesi");
    if (!r.sucesso) r.detalhes = [r.detalhes, "a Besta assume: frenesi (fúria, fome ou Rötschreck) até o fim da cena ou até gastar Força de Vontade"].join(" · ");
    return r;
  }

  if (/forca de vontade|^vontade$|willpower/.test(t)) {
    const vontade = vontadeDe(ficha);
    return testeSemFome(ficha, pedido, "Força de Vontade", vontade, [`Força de Vontade atual ${vontade}`], "vontade");
  }

  const notas: string[] = [];
  let rotulo: string;
  let pecas: Peca[];
  let alvo: number | null = Math.max(0, pedido.alvo ?? 1);
  let vtm: TipoTesteVtm = "parada";
  let surto = false;

  if (/iniciativa|initiative/.test(t)) {
    pecas = [acharPeca(ficha, "raciocinio")!, acharPeca(ficha, "percepcao")!];
    rotulo = "Iniciativa";
    alvo = null;
    vtm = "iniciativa";
  } else if (/^(caca|cacar|cacada|alimentar|alimentacao|hunt)/.test(t) || /parada de caca/.test(t)) {
    const pred = PREDADORES.find((p) => p.id === ficha.ancestralidade);
    if (!pred?.parada) {
      throw new Error(`${pred?.nome ?? "Esse tipo de predador"} não caça com teste (${pred?.paradaTexto ?? "o mestre decide"}). Peça outra parada, ex.: "Destreza + Furtividade".`);
    }
    pecas = pred.parada.map((id) => acharPeca(ficha, id)!);
    rotulo = `Caça (${pred.nome})`;
  } else if (/^(ataque|atacar|attack)/.test(t)) {
    pecas = pecasAtaque(ficha, `${texto} ${pedido.motivo ?? ""}`);
    rotulo = `Ataque (${pecas[1].nome})`;
  } else {
    surto = /surto|blood surge/.test(t);
    const partes = texto
      .replace(/surto( de sangue)?|blood surge|com\s*$/gi, "")
      .split(/\+|\s+e\s+|,/)
      .map((x) => x.trim())
      .filter(Boolean);
    const achadas = partes.map((x) => acharPeca(ficha, x));
    pecas = achadas.filter((x): x is Peca => x !== null);
    if (!pecas.length) {
      throw new Error(
        `Não entendi o teste "${texto}". Use atributo + perícia ("Destreza + Furtividade"), uma perícia ("Persuasão"), uma disciplina ("Dominação"), ou: Ataque, Iniciativa, Caça, Despertar, Frenesi, Remorso, Força de Vontade.`,
      );
    }
    if (achadas.some((x) => x === null)) notas.push(`ignorado: ${partes.filter((_, i) => !achadas[i]).join(", ")}`);
    pecas = completar(ficha, pecas.slice(0, 3));
    rotulo = pecas.map((p) => p.nome).join(" + ");
  }

  let paradaBase = pecas.reduce((s, p) => s + p.valor, 0);
  notas.push(pecas.map((p) => `${p.nome} ${p.valor}`).join(" + "));
  for (const p of pecas) if (p.tipo === "disciplina" && p.valor === 0) notas.push(`sem pontos em ${p.nome}: só o atributo`);
  const esp = especialidade(ficha, texto, pecas);
  if (esp) {
    paradaBase += 1;
    notas.push(`+1 especialidade ${esp}`);
  }
  if (pecas.some((p) => p.tipo === "disciplina" && p.valor > 0)) {
    const bonus = efeitosPotencia(ficha).bonusPoder;
    if (bonus) {
      paradaBase += bonus;
      notas.push(`+${bonus} Potência de Sangue em disciplina`);
    }
  }
  let falhasDespertar = 0;
  if (surto) {
    const extra = efeitosPotencia(ficha).surto;
    paradaBase += extra;
    const dado = d(10);
    falhasDespertar = dado >= 6 ? 0 : 1;
    notas.push(`Surto de Sangue +${extra} (Despertar: ${dado}${falhasDespertar ? ", Fome +1" : ", Fome contida"})`);
  }
  if (atormentado(ficha)) {
    paradaBase -= 2;
    notas.push("−2 atormentado pelas Manchas");
  }
  const parada = ajustar(paradaBase, pedido, notas);
  // a Fome que vale é a de antes do Surto: o dado do Surto só cobra no aposTeste
  const qtdFome = Math.min(fomeDe(ficha), parada);
  const normais = rolarFaces(parada - qtdFome);
  const fome = rolarFaces(qtdFome);
  const av = avaliar(normais, fome, alvo);
  const expressao = `${parada}d10${qtdFome ? ` (${qtdFome} de Fome)` : ""}${alvo !== null ? ` vs ${alvo}` : ""}`;
  const b = base(ficha, pedido, rotulo, expressao, normais, fome, vtm);
  const r = concluir(b, av, alvo, [...notas, ...notasDoGrau(av, alvo, ficha, qtdFome > 0)]);
  if (falhasDespertar) r.falhasDespertar = falhasDespertar;
  return r;
}
