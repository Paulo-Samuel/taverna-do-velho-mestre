import "server-only";
import { d } from "../../dados";
import { limitar, normalizar } from "../comum";
import type { Ficha, GrauSucesso, PedidoTeste, ResultadoTeste } from "../tipos";
import { ATRIBUTOS, CLAS, DISCIPLINAS, PAR_DE_ATRIBUTO, PERICIAS, POTENCIA, PREDADORES } from "./dados";
import {
  despertarPrevisto,
  FOME_MAX,
  fomeMinimaAoMatar,
  INTENSIDADES,
  lerIntensidade,
  lerRessonancia,
  RESSONANCIAS,
  rolarDespertar,
  saciadoPelaPotencia,
  sortearIntensidade,
  sortearRessonancia,
  textoDespertar,
  type Despertar,
  type IntensidadeRessonancia,
  type TipoRessonancia,
} from "./sangue";

// Testes de V5: parada de d10, sucesso em 6+, cada PAR de 10 vale 4 sucessos (2 extras). Parte da parada vira dados de Fome.
//   Crítico       total ≥ dificuldade com pelo menos um par de 10
//   Crítico Sujo  o mesmo, mas algum 10 saiu num dado de Fome (a Besta "ajudou": compulsão ou consequência)
//   Falha Bestial total < dificuldade e algum dado de Fome mostrou 1
// pedido.alvo = dificuldade (sucessos necessários), padrão 1. Iniciativa não tem dificuldade.
// Custos de sangue rolam aqui, antes da parada (o Despertar vem primeiro, então a Fome nova já vale nos dados): disciplina na parada
// pede Despertar (pedido.opcoes.custoDespertar muda: 0 para poder que não custa), Surto guardado na ficha soma dados, Ressonância intensa
// soma +1 nas disciplinas ligadas. O resultado só DESCREVE o que muda; quem grava na ficha é o aposTeste (vtm5.ts).

export const ID = "vtm5";

/** Que tipo de teste foi (vai no resultado; aposTeste e o cartão usam). */
export type TipoTesteVtm = "parada" | "despertar" | "surto" | "remorso" | "frenesi" | "vontade" | "iniciativa" | "caca";

export type TipoFrenesi = "furia" | "fome" | "terror";

export const NOME_FRENESI: Record<TipoFrenesi, string> = { furia: "fúria", fome: "fome", terror: "terror" };

/** Dificuldade quando o mestre não diz: provocação comum 2; fome diante de sangue e fogo/sol por perto 3. */
const DIFICULDADE_FRENESI: Record<TipoFrenesi, number> = { furia: 2, fome: 3, terror: 3 };

/** Chip do cartão: o que o teste custou ou mudou. */
export type EfeitoVtm = { texto: string; tom: "sangue" | "ambar" | "musgo" | "muted" };

export type CacaVtm = {
  passou: boolean;
  fomeAntes: number;
  fomeDepois: number;
  matou: boolean;
  /** Manchas por matar */
  manchas: number;
  animal: boolean;
  ressonancia: { tipo: TipoRessonancia; intensidade: IntensidadeRessonancia; disciplinas: string[]; sorteada: boolean } | null;
  /** Falha Bestial: compulsão marcada */
  compulsao: string | null;
};

export type ResultadoVtm = ResultadoTeste & {
  /** quantos dados foram rolados (normais + Fome) */
  parada: number;
  /** faces dos dados de Fome (também estão no fim de `dados`) */
  dadosFome: number[];
  vtm: TipoTesteVtm;
  /** Despertares que falharam neste teste (Despertar, Surto, poder): cada um é +1 de Fome no aposTeste */
  falhasDespertar?: number;
  /** Despertares rolados junto (Surto de Sangue, poder da disciplina), para o cartão desenhar */
  despertares?: Despertar[];
  /** dados de Surto de Sangue somados nesta parada */
  surto?: number;
  /** a parada gastou o Surto guardado na ficha (aposTeste apaga) */
  surtoConsumido?: boolean;
  /** teste "Surto de Sangue": dados guardados para o próximo teste (aposTeste grava em extras.surtoPendente) */
  surtoGanho?: number;
  frenesi?: { tipo: TipoFrenesi; resistiu: boolean };
  caca?: CacaVtm;
  remorso?: { humanidadeAntes: number; humanidadeDepois: number; manchas: number };
  efeitos?: EfeitoVtm[];
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

/** Dados de Surto de Sangue guardados para o próximo teste (extras.surtoPendente). */
export function surtoPendenteDe(ficha: Ficha): number {
  const v = ficha.extras.surtoPendente;
  return typeof v === "number" && v > 0 ? Math.floor(v) : 0;
}

export type RessonanciaFicha = { tipo: TipoRessonancia; intensidade: IntensidadeRessonancia; disciplinas: string[] };

/** Ressonância da última alimentação (extras.ressonancia), se houver. */
export function ressonanciaDe(ficha: Ficha): RessonanciaFicha | null {
  const v = ficha.extras.ressonancia as Partial<RessonanciaFicha> | undefined;
  if (!v || typeof v !== "object" || !v.tipo || !(v.tipo in RESSONANCIAS)) return null;
  const intensidade = v.intensidade && v.intensidade in INTENSIDADES ? v.intensidade : "fugaz";
  return { tipo: v.tipo, intensidade, disciplinas: RESSONANCIAS[v.tipo].disciplinas };
}

export const textoRessonancia = (r: { tipo: TipoRessonancia; intensidade: IntensidadeRessonancia }) =>
  `${RESSONANCIAS[r.tipo].nome} ${INTENSIDADES[r.intensidade].nome}`;

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

// ---------- opções do pedido ----------

type OpcoesVtm = {
  custoDespertar?: number;
  nivelPoder?: number;
  vezes?: number;
  rerrolar: boolean;
  matar: boolean;
  manchas?: number;
  ressonancia: TipoRessonancia | null;
  intensidade: IntensidadeRessonancia | null;
  frenesi: TipoFrenesi | null;
};

export function lerTipoFrenesi(v: unknown): TipoFrenesi | null {
  const t = normalizar(String(v ?? ""));
  if (/fome|hunger|faminto|sangue/.test(t)) return "fome";
  if (/terror|medo|rotschreck|fear|fogo|sol\b|fire/.test(t)) return "terror";
  if (/furia|raiva|rage|fury|provoca|odio/.test(t)) return "furia";
  return null;
}

function opcoesDe(pedido: PedidoTeste): OpcoesVtm {
  const o = pedido.opcoes ?? {};
  const n = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? limitar(Math.round(v), min, max) : undefined);
  return {
    custoDespertar: n(o.custoDespertar, 0, 3),
    nivelPoder: n(o.nivelPoder, 1, 5),
    vezes: n(o.vezes, 1, 5),
    rerrolar: o.rerrolar === true,
    matar: o.matar === true,
    manchas: n(o.manchas, 0, 5),
    ressonancia: lerRessonancia(o.ressonancia),
    intensidade: lerIntensidade(o.intensidade),
    frenesi: lerTipoFrenesi(o.frenesi),
  };
}

/** Nível do poder escrito no texto: "Celeridade ●●", "nível 3", "3º nível". */
function nivelNoTexto(texto: string): number | null {
  const bolas = texto.match(/●+/)?.[0].length;
  if (bolas) return limitar(bolas, 1, 5);
  const t = normalizar(texto);
  const m = t.match(/nivel\s*(\d)/) ?? t.match(/(\d)\s*[oº]?\s*nivel/);
  return m ? limitar(Number(m[1]), 1, 5) : null;
}

/** Disciplina citada num texto livre (motivo do Despertar). "Potência de Sangue" não é a disciplina Potência. */
function disciplinaNoTexto(texto: string) {
  const t = normalizar(texto).replace(/potencia de sangue/g, "");
  return DISCIPLINAS.find((x) => [x.nome, ...(x.apelidos ?? [])].some((n) => n.length > 3 && t.includes(normalizar(n)))) ?? null;
}

/** Potência de Sangue deixa rerrolar o Despertar de disciplinas até certo nível (tabela de Potência). */
function rerrolaPelaPotencia(ficha: Ficha, nivel: number | null): boolean {
  const limite = efeitosPotencia(ficha).rerrolagem;
  return nivel !== null && limite > 0 && nivel <= limite;
}

/** O que dizer ao mestre depois de um Despertar. `oQue` = o que custou ("o poder", "o Surto"). */
function avisoDespertar(x: Despertar, oQue: string): string {
  if (x.previsto) return "";
  if (x.estourou) {
    return `Despertar falhou com a Fome no limite: a Fome fica em ${FOME_MAX}, o sangue não responde (${oQue} NÃO acontece) e a Besta exige — chame testar_frenesi tipo "fome" (dificuldade 3–4). Condição de faminto marcada.`;
  }
  if (!x.falhas) return `Despertar sem custo: Fome segue ${x.fomeAntes}.`;
  const cinco = x.fomeDepois >= FOME_MAX ? " Fome 5: o próximo Despertar que falhar vira frenesi; hora de caçar." : "";
  return `Despertar falhou: Fome ${x.fomeAntes} → ${x.fomeDepois} (já aplicado). Narre a Besta se mexendo por dentro.${cinco}`;
}

function efeitoDespertar(x: Despertar): EfeitoVtm {
  if (x.previsto) return { texto: `Despertar${x.vezes > 1 ? ` ×${x.vezes}` : ""} · ${x.motivo}`, tom: "sangue" };
  if (x.estourou) return { texto: "Fome 5: a Besta cobra", tom: "sangue" };
  return x.falhas ? { texto: `Fome ${x.fomeAntes} → ${x.fomeDepois}`, tom: "sangue" } : { texto: `Fome segue ${x.fomeAntes}`, tom: "muted" };
}

// ---------- interpretação do pedido ----------

type Peca = { tipo: "atributo" | "pericia" | "disciplina"; id: string; nome: string; valor: number };

const casa = (alvo: string, nomes: string[]) => nomes.some((n) => normalizar(n) === alvo);

function acharPeca(ficha: Ficha, bruto: string): Peca | null {
  const alvo = normalizar(bruto.replace(/\(.*?\)/g, "")).replace(/[.:!?]+$/, "").replace(/\s*●+\s*$/, "");
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

/** "Destreza + Celeridade", "Carisma e Lábia": peças da ficha (até 3), completando uma peça sozinha. */
function pecasDoTexto(ficha: Ficha, texto: string, notas: string[]): Peca[] {
  const partes = texto
    .replace(/surto( de sangue)?|blood surge|com\s*$/gi, "")
    .split(/\+|\s+e\s+|,/)
    .map((x) => x.trim())
    .filter(Boolean);
  const achadas = partes.map((x) => acharPeca(ficha, x));
  const pecas = achadas.filter((x): x is Peca => x !== null);
  if (!pecas.length) {
    throw new Error(
      `Não entendi o teste "${texto}". Use atributo + perícia ("Destreza + Furtividade"), uma perícia ("Persuasão"), uma disciplina ("Dominação"), ou: Ataque, Iniciativa, Caça, Despertar, Surto de Sangue, Frenesi, Remorso, Força de Vontade.`,
    );
  }
  if (achadas.some((x) => x === null)) notas.push(`ignorado: ${partes.filter((_, i) => !achadas[i]).join(", ")}`);
  return completar(ficha, pecas.slice(0, 3));
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

/** Notas de grau: Crítico Sujo, Falha Bestial e vitória a um custo. `fome` = Fome que valeu na parada. */
function notasDoGrau(av: Avaliacao, alvo: number | null, fome: number, comFome: boolean): string[] {
  const notas: string[] = [];
  if (av.pares) notas.push(`${av.pares} par${av.pares > 1 ? "es" : ""} de 10 (+${av.pares * 2} sucessos)`);
  if (av.sujo) notas.push("Crítico Sujo: a Besta ajudou — sucesso brutal ou exagerado; o narrador pode acionar a compulsão do clã");
  if (av.bestial) notas.push("Falha Bestial: um dado de Fome deu 1 — a Besta escapa (compulsão, violência ou perda de controle)");
  if (alvo !== null && av.total > 0 && av.total < alvo) notas.push(`faltaram ${alvo - av.total}: o narrador pode oferecer vitória a um custo`);
  if (comFome && fome >= 4 && !av.bestial && !av.sujo) notas.push(`Fome ${fome}: a Besta está perto da superfície`);
  return notas;
}

const juntarAvisos = (...partes: (string | null | undefined | false)[]) => partes.filter(Boolean).join(" ") || undefined;

// ---------- testes especiais ----------

/** Teste de Despertar avulso ("Despertar", "Despertar 2", ou a ferramenta despertar_sangue). */
function testeDespertar(ficha: Ficha, pedido: PedidoTeste, op: OpcoesVtm): ResultadoVtm {
  const t = normalizar(pedido.teste);
  const qtd = op.vezes ?? limitar(Number(t.match(/(?:despertar|rouse)\D{0,3}(\d)\b/)?.[1] ?? 1), 1, 5);
  const ef = efeitosPotencia(ficha);
  const textoLivre = `${pedido.teste} ${pedido.motivo ?? ""}`;
  const disc = disciplinaNoTexto(textoLivre);
  const nivel = op.nivelPoder ?? nivelNoTexto(textoLivre) ?? (disc ? (disciplinasDe(ficha)[disc.id] ?? 1) : null);
  const pelaPotencia = disc !== null && rerrolaPelaPotencia(ficha, nivel);
  // vantagem = rerrolar o Despertar (o mestre concede); Potência de Sangue rerrola poderes de disciplina de nível baixo
  const rerrolar = pedido.modo === "vantagem" || op.rerrolar || pelaPotencia;
  const motivo = disc ? `${disc.nome}${nivel ? ` ${"●".repeat(nivel)}` : ""}` : (pedido.motivo || "Despertar").slice(0, 60);
  const x = rolarDespertar(fomeDe(ficha), qtd, rerrolar, motivo);
  const faces = x.rolagens.flat();
  const notas: string[] = [];
  if (rerrolar) notas.push(pelaPotencia ? `Potência ${potenciaDe(ficha)} rerrola o Despertar de disciplinas até nível ${ef.rerrolagem}` : "rerrolagem do Despertar concedida");
  notas.push(x.falhas ? `Fome ${x.fomeAntes} → ${x.fomeDepois}` : `Fome continua ${x.fomeAntes}`);
  if (x.estourou) notas.push("já estava no limite: em vez de subir a Fome, a Besta exige um teste de Frenesi (fome) — condição de faminto anotada");
  else if (x.fomeDepois === FOME_MAX && x.falhas) notas.push("Fome 5: não dá mais para Despertar sem arriscar frenesi; hora de caçar");
  const b = base(ficha, pedido, qtd > 1 ? `Despertar ×${qtd}` : "Despertar", `${faces.length}d10 (Despertar${qtd > 1 ? ` ×${qtd}` : ""})`, [], faces, "despertar");
  const sucessos = qtd - x.falhas;
  return {
    ...b,
    total: sucessos,
    alvo: qtd,
    grau: x.falhas ? "falha" : "sucesso",
    sucesso: !x.falhas,
    rotuloGrau: x.falhas ? (x.estourou ? "A Besta ruge" : `Fome +${x.falhas}`) : "Fome contida",
    detalhes: notas.join(" · "),
    margem: sucessos - qtd,
    falhasDespertar: x.falhas,
    despertares: [x],
    efeitos: [efeitoDespertar(x)],
    avisoMestre: avisoDespertar(x, disc ? `o poder de ${disc.nome}` : "o efeito"),
  };
}

/** Surto de Sangue avulso: Despertar agora, dados guardados para o próximo teste do personagem. */
function testeSurto(ficha: Ficha, pedido: PedidoTeste, op: OpcoesVtm): ResultadoVtm {
  const ef = efeitosPotencia(ficha);
  const x = pedido.previa ? despertarPrevisto(fomeDe(ficha), 1, false, "Surto de Sangue") : rolarDespertar(fomeDe(ficha), 1, op.rerrolar, "Surto de Sangue");
  const faces = x.rolagens.flat();
  const ganho = x.estourou ? 0 : ef.surto;
  const b = base(ficha, pedido, "Surto de Sangue", `${faces.length || 1}d10 (Despertar)`, [], faces, "surto");
  const notas = [`Potência ${potenciaDe(ficha)}: Surto +${ef.surto} dados`, textoDespertar(x)];
  const aviso = ganho
    ? `Surto de Sangue: +${ganho} dados guardados para o PRÓXIMO teste de ${ficha.nome} (o servidor soma sozinho; não vale em teste de disciplina, Frenesi, Remorso nem Força de Vontade). ${avisoDespertar(x, "o Surto")}`
    : avisoDespertar(x, "o Surto");
  return {
    ...b,
    total: x.falhas ? 0 : 1,
    alvo: 1,
    grau: ganho ? "sucesso" : "falha",
    sucesso: ganho > 0,
    rotuloGrau: ganho ? `Surto +${ganho}` : "O sangue não responde",
    detalhes: notas.join(" · "),
    margem: null,
    falhasDespertar: x.falhas,
    despertares: [x],
    surtoGanho: ganho,
    efeitos: [{ texto: ganho ? `+${ganho} dados no próximo teste` : "sem Surto", tom: ganho ? "ambar" : "sangue" }, efeitoDespertar(x)],
    avisoMestre: pedido.previa ? undefined : aviso,
  };
}

function testeSemFome(ficha: Ficha, pedido: PedidoTeste, rotulo: string, paradaBase: number, notas: string[], vtm: TipoTesteVtm, alvoFixo?: number): ResultadoVtm {
  const parada = ajustar(paradaBase, pedido, notas);
  const faces = rolarFaces(parada);
  const alvo = alvoFixo ?? Math.max(0, pedido.alvo ?? 1);
  const av = avaliar(faces, [], alvo);
  const b = base(ficha, pedido, rotulo, `${parada}d10 vs ${alvo}`, faces, [], vtm);
  // frenesi e remorso não têm "vitória a um custo": ou a Besta vence, ou não
  const grau = notasDoGrau(av, alvo, 0, false).filter((n) => !(vtm === "frenesi" || vtm === "remorso") || !n.startsWith("faltaram"));
  return concluir(b, av, alvo, [...notas, ...grau]);
}

/** Remorso no fim da noite: 10 − Humanidade − Manchas dados (mínimo 1); um sucesso limpa as Manchas, nenhum tira 1 de Humanidade. */
function testeRemorso(ficha: Ficha, pedido: PedidoTeste): ResultadoVtm {
  const hum = humanidadeDe(ficha);
  const mancha = manchaDe(ficha);
  if (!mancha) {
    const b = base(ficha, pedido, "Remorso", "sem dados (nenhuma Mancha)", [], [], "remorso");
    return {
      ...b,
      total: 0,
      alvo: null,
      grau: "sucesso",
      sucesso: true,
      rotuloGrau: "Consciência limpa",
      detalhes: "sem Manchas: não há o que remoer",
      margem: null,
      remorso: { humanidadeAntes: hum, humanidadeDepois: hum, manchas: 0 },
      efeitos: [{ texto: `Humanidade ${hum}`, tom: "muted" }],
      avisoMestre: `${ficha.nome} não tem Manchas: nada a rolar, Humanidade segue ${hum}.`,
    };
  }
  const paradaBase = Math.max(1, 10 - hum - mancha);
  const notas = [`10 − Humanidade ${hum} − Manchas ${mancha} = ${paradaBase} dado(s)${10 - hum - mancha < 1 ? " (mínimo 1)" : ""}`];
  const r = testeSemFome(ficha, pedido, "Remorso", paradaBase, notas, "remorso", 1);
  const depois = r.sucesso ? hum : Math.max(0, hum - 1);
  r.detalhes = [r.detalhes, r.sucesso ? "a culpa pesa e limpa: as Manchas somem" : `sem remorso: Humanidade ${hum} → ${depois} e as Manchas somem`].filter(Boolean).join(" · ");
  r.remorso = { humanidadeAntes: hum, humanidadeDepois: depois, manchas: mancha };
  r.efeitos = r.sucesso
    ? [{ texto: `−${mancha} Mancha${mancha > 1 ? "s" : ""}`, tom: "musgo" }, { texto: `Humanidade ${hum}`, tom: "muted" }]
    : [{ texto: `Humanidade ${hum} → ${depois}`, tom: "sangue" }, { texto: "Manchas zeradas", tom: "muted" }];
  r.avisoMestre = r.sucesso
    ? `Remorso: a culpa limpa as ${mancha} Mancha(s); Humanidade segue ${hum} (já aplicado). Narre o peso do que fez.`
    : `Sem remorso: Humanidade ${hum} → ${depois} e as Manchas somem (já aplicado). Narre ${ficha.nome} ficando mais frio, menos humano.${depois === 0 ? " Humanidade 0: perdido para a Besta (vira NPC)." : ""}`;
  return r;
}

/** Resistir ao frenesi: Força de Vontade atual + Humanidade/3 (para baixo); dificuldade pelo gatilho. */
function testeFrenesi(ficha: Ficha, pedido: PedidoTeste, op: OpcoesVtm): ResultadoVtm {
  const tipo = op.frenesi ?? lerTipoFrenesi(`${pedido.teste} ${pedido.motivo ?? ""}`) ?? "furia";
  const vontade = vontadeDe(ficha);
  const hum = humanidadeDe(ficha);
  let paradaBase = vontade + Math.floor(hum / 3);
  const notas = [`Força de Vontade ${vontade} + Humanidade ${hum}/3 (${Math.floor(hum / 3)})`];
  // perdição Brujah: o frenesi de fúria custa dados iguais à gravidade da perdição
  const gravidade = efeitosPotencia(ficha).gravidade;
  if (tipo === "furia" && ficha.classe === "brujah" && gravidade) {
    paradaBase -= gravidade;
    notas.push(`−${gravidade} perdição Brujah`);
  }
  const alvo = Math.max(1, pedido.alvo ?? DIFICULDADE_FRENESI[tipo]);
  const r = testeSemFome(ficha, pedido, `Resistir ao Frenesi (${NOME_FRENESI[tipo]})`, paradaBase, notas, "frenesi", alvo);
  r.frenesi = { tipo, resistiu: r.sucesso };
  const comoAge: Record<TipoFrenesi, string> = {
    furia: "ataca quem provocou (ou quem estiver mais perto) sem medir força",
    fome: "se joga no sangue mais próximo, sem cuidado com a Máscara nem com a vítima",
    terror: "foge do fogo, do sol ou da ameaça a qualquer custo, derrubando o que estiver no caminho",
  };
  if (r.sucesso) {
    r.rotuloGrau = r.grau === "sucesso_critico" ? "Crítico: a Besta se cala" : "Resistiu";
    r.efeitos = [{ texto: `Besta contida (${NOME_FRENESI[tipo]})`, tom: "musgo" }];
    r.avisoMestre = `${ficha.nome} resistiu ao frenesi de ${NOME_FRENESI[tipo]}: a Besta recua por agora. Se o gatilho continuar, peça outro teste.`;
  } else {
    r.rotuloGrau = `Frenesi de ${NOME_FRENESI[tipo]}`;
    r.detalhes = [r.detalhes, "a Besta assume até o fim da cena"].join(" · ");
    r.efeitos = [{ texto: `Frenesi (${NOME_FRENESI[tipo]})`, tom: "sangue" }];
    r.avisoMestre = `FRENESI de ${NOME_FRENESI[tipo]}: ${ficha.nome} perde o controle até o fim da cena — ${comoAge[tipo]}. Condição "Frenesi (${NOME_FRENESI[tipo]})" marcada (já aplicado): remova com alterar_ficha quando a cena acabar. Gastar 1 de Força de Vontade pode dar um instante de lucidez.`;
  }
  return r;
}

/** O que a caça rendeu: Fome, Manchas por matar, Ressonância; Falha Bestial marca a compulsão. */
function desfechoCaca(ficha: Ficha, av: Avaliacao, alvo: number, fomeAntes: number, op: OpcoesVtm, notas: string[]): CacaVtm {
  const pred = PREDADORES.find((p) => p.id === ficha.ancestralidade);
  const bp = potenciaDe(ficha);
  const animal = op.ressonancia === "animal" || (!op.ressonancia && pred?.id === "fazendeiro");
  const passou = av.grau === "sucesso" || av.grau === "sucesso_critico";
  const vazio: CacaVtm = { passou, fomeAntes, fomeDepois: fomeAntes, matou: false, manchas: 0, animal, ressonancia: null, compulsao: null };
  if (!passou) {
    if (av.bestial) vazio.compulsao = CLAS.find((c) => c.id === ficha.classe)?.compulsao?.nome ?? "Fome";
    return vazio;
  }
  // bebida rápida sacia 1; com folga (margem 2+ ou crítico) sacia 2. Sem matar a Fome não desce de 1.
  const baseSacia = av.total - alvo >= 2 || av.pares > 0 ? 2 : 1;
  const s = saciadoPelaPotencia(baseSacia, bp, animal);
  if (s.nota) notas.push(s.nota);
  const matou = op.matar;
  let fomeDepois: number;
  let manchas = 0;
  if (matou && !animal) {
    fomeDepois = Math.min(fomeAntes, fomeMinimaAoMatar(bp));
    manchas = op.manchas ?? 2;
  } else {
    fomeDepois = Math.max(Math.min(fomeAntes, 1), fomeAntes - s.valor);
  }
  const sorteio = sortearRessonancia();
  const tipo: TipoRessonancia = animal ? "animal" : (op.ressonancia ?? sorteio.tipo);
  const intensidade = op.intensidade ?? (op.ressonancia && !animal ? sortearIntensidade() : sorteio.intensidade);
  return {
    passou,
    fomeAntes,
    fomeDepois,
    matou,
    manchas,
    animal,
    ressonancia: { tipo, intensidade, disciplinas: RESSONANCIAS[tipo].disciplinas, sorteada: !op.ressonancia || !op.intensidade },
    compulsao: null,
  };
}

function avisoCaca(ficha: Ficha, c: CacaVtm, av: Avaliacao): { aviso: string; efeitos: EfeitoVtm[] } {
  const nomeDisc = (id: string) => DISCIPLINAS.find((x) => x.id === id)?.nome ?? id;
  if (!c.passou) {
    if (c.compulsao) {
      return {
        aviso: `Falha Bestial na caça: a Besta toma conta — a vítima sai muito ferida ou morre (se morrer, alterar_ficha com Manchas), cena feia, Máscara em risco. Fome segue ${c.fomeAntes}. Condição "Compulsão (${c.compulsao})" marcada (já aplicado): tire quando satisfeita.`,
        efeitos: [{ texto: `Compulsão (${c.compulsao})`, tom: "sangue" }, { texto: `Fome segue ${c.fomeAntes}`, tom: "muted" }],
      };
    }
    return {
      aviso: `A caça falhou: Fome segue ${c.fomeAntes}. Complicação sugerida: a vítima escapa e grita, alguém filma, a polícia passa, outro vampiro reclama o território. Se faltou pouco, ofereça beber a um custo.`,
      efeitos: [{ texto: `sem sangue · Fome ${c.fomeAntes}`, tom: "muted" }],
    };
  }
  const r = c.ressonancia!;
  const ressTexto = `Ressonância ${textoRessonancia(r)} (${RESSONANCIAS[r.tipo].humor}): ${INTENSIDADES[r.intensidade].efeito}${INTENSIDADES[r.intensidade].bonus ? ` — ${r.disciplinas.map(nomeDisc).join(" e ")}` : ""}`;
  const efeitos: EfeitoVtm[] = [
    { texto: c.fomeDepois < c.fomeAntes ? `Fome ${c.fomeAntes} → ${c.fomeDepois}` : `Fome segue ${c.fomeAntes}`, tom: c.fomeDepois < c.fomeAntes ? "musgo" : "muted" },
    { texto: textoRessonancia(r), tom: INTENSIDADES[r.intensidade].bonus ? "ambar" : "muted" },
  ];
  if (c.matou) efeitos.push({ texto: `matou · +${c.manchas} Mancha${c.manchas === 1 ? "" : "s"}`, tom: "sangue" });
  const partes = [
    `Caçou: Fome ${c.fomeAntes} → ${c.fomeDepois} (já aplicado)${c.matou ? `; matou a vítima: +${c.manchas} Mancha(s)` : ""}.`,
    !c.matou && c.fomeDepois === 1 && c.fomeAntes > 1 ? "Sem matar, a Fome não desce de 1." : "",
    `${ressTexto}. Narre a vítima e o gosto do sangue.`,
    av.sujo ? "Crítico Sujo: bebeu demais — a vítima quase morre ou alguém viu (escolha um preço)." : "",
    c.animal && c.fomeDepois === c.fomeAntes ? `Sangue animal não sacia ${ficha.nome} com essa Potência.` : "",
  ];
  return { aviso: partes.filter(Boolean).join(" "), efeitos };
}

// ---------- entrada principal ----------

export function resolver(ficha: Ficha, pedido: PedidoTeste): ResultadoVtm {
  const texto = pedido.teste ?? "";
  const t = normalizar(texto);
  const op = opcoesDe(pedido);

  if (/^(teste de )?(surto( de sangue)?|blood surge)\b/.test(t) && !texto.includes("+")) return testeSurto(ficha, pedido, op);
  if (/despertar|rouse|teste de fome|despertar o sangue/.test(t)) return testeDespertar(ficha, pedido, op);
  if (/remorso|remorse|^humanidade$|teste de humanidade/.test(t)) return testeRemorso(ficha, pedido);
  if (/frenesi|frenzy|rotschreck/.test(t)) return testeFrenesi(ficha, pedido, op);

  if (/forca de vontade|^vontade$|willpower/.test(t)) {
    const vontade = vontadeDe(ficha);
    return testeSemFome(ficha, pedido, "Força de Vontade", vontade, [`Força de Vontade atual ${vontade}`], "vontade");
  }

  const notas: string[] = [];
  let rotulo: string;
  let pecas: Peca[];
  let alvo: number | null = Math.max(0, pedido.alvo ?? 1);
  let vtm: TipoTesteVtm = "parada";
  let surtoNoTexto = false;

  if (/iniciativa|initiative/.test(t)) {
    pecas = [acharPeca(ficha, "raciocinio")!, acharPeca(ficha, "percepcao")!];
    rotulo = "Iniciativa";
    alvo = null;
    vtm = "iniciativa";
  } else if (/^(caca|cacar|cacada|alimentar|alimentacao|hunt)/.test(t) || /parada de caca/.test(t)) {
    const pred = PREDADORES.find((p) => p.id === ficha.ancestralidade);
    // "Caça: Destreza + Briga" troca a parada (tipos de predador sem teste, ou caça fora do costume)
    const outra = texto.includes(":") ? texto.slice(texto.indexOf(":") + 1).trim() : "";
    if (outra) pecas = pecasDoTexto(ficha, outra, notas);
    else if (pred?.parada) pecas = pred.parada.map((id) => acharPeca(ficha, id)!);
    else {
      throw new Error(`${pred?.nome ?? "Esse tipo de predador"} não caça com teste (${pred?.paradaTexto ?? "o mestre decide"}). Diga a parada, ex.: "Caça: Destreza + Briga".`);
    }
    rotulo = `Caça (${pred?.nome ?? "livre"})`;
    vtm = "caca";
  } else if (/^(ataque|atacar|attack)/.test(t)) {
    pecas = pecasAtaque(ficha, `${texto} ${pedido.motivo ?? ""}`);
    rotulo = `Ataque (${pecas[1].nome})`;
  } else {
    surtoNoTexto = /surto|blood surge/.test(t);
    pecas = pecasDoTexto(ficha, texto, notas);
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
  const disc = pecas.find((p) => p.tipo === "disciplina" && p.valor > 0) ?? null;
  if (disc) {
    const bonus = efeitosPotencia(ficha).bonusPoder;
    if (bonus) {
      paradaBase += bonus;
      notas.push(`+${bonus} Potência de Sangue em disciplina`);
    }
    const res = ressonanciaDe(ficha);
    if (res && INTENSIDADES[res.intensidade].bonus && res.disciplinas.includes(disc.id)) {
      paradaBase += 1;
      notas.push(`+1 Ressonância ${textoRessonancia(res)}`);
    }
  }

  // ---- custos de sangue, antes da parada ----
  const efeitos: EfeitoVtm[] = [];
  const despertares: Despertar[] = [];
  const avisos: string[] = [];
  let fome = fomeDe(ficha);
  let surto = 0;
  let surtoConsumido = false;
  // Surto de Sangue: o guardado na ficha (ferramenta surto_de_sangue) ou "com Surto de Sangue" no nome; não vale em disciplina
  const guardado = surtoPendenteDe(ficha);
  if (vtm !== "iniciativa" && (guardado || surtoNoTexto)) {
    if (disc) notas.push(guardado ? "Surto guardado não soma em parada de disciplina: continua esperando" : "Surto de Sangue não soma em parada de disciplina");
    else if (guardado) {
      surto = guardado;
      surtoConsumido = true;
      notas.push(`+${guardado} Surto de Sangue (guardado)`);
    } else {
      const x = pedido.previa ? despertarPrevisto(fome, 1, false, "Surto de Sangue") : rolarDespertar(fome, 1, false, "Surto de Sangue");
      despertares.push(x);
      fome = x.fomeDepois;
      if (!x.estourou) surto = efeitosPotencia(ficha).surto;
      notas.push(x.previsto ? `Surto de Sangue +${efeitosPotencia(ficha).surto} (com Despertar)` : x.estourou ? "Surto de Sangue falhou: Fome 5" : `Surto de Sangue +${surto}`);
      if (x.previsto) efeitos.push(efeitoDespertar(x));
      avisos.push(avisoDespertar(x, "o Surto"));
    }
    if (surto) {
      paradaBase += surto;
      efeitos.push({ texto: `Surto +${surto}`, tom: "ambar" });
    }
  }
  // disciplina na parada = Despertar do poder (padrão 1; o mestre diz 0 para poder que não custa)
  const custo = vtm === "iniciativa" ? 0 : (op.custoDespertar ?? (disc ? 1 : 0));
  if (custo > 0) {
    const nivel = op.nivelPoder ?? nivelNoTexto(`${texto} ${pedido.motivo ?? ""}`) ?? disc?.valor ?? null;
    const pelaPotencia = disc !== null && rerrolaPelaPotencia(ficha, nivel);
    const rerrolar = op.rerrolar || pelaPotencia;
    const motivo = disc ? `${disc.nome}${nivel ? ` ${"●".repeat(nivel)}` : ""}` : "poder";
    const x = pedido.previa ? despertarPrevisto(fome, custo, rerrolar, motivo) : rolarDespertar(fome, custo, rerrolar, motivo);
    despertares.push(x);
    fome = x.fomeDepois;
    // o cartão mostra a faixa do Despertar; nas notas fica só a rerrolagem da Potência
    if (!x.previsto && pelaPotencia) notas.push(`Potência ${potenciaDe(ficha)} rerrola o Despertar de poderes até nível ${efeitosPotencia(ficha).rerrolagem}`);
    // rolado, o cartão desenha a faixa do Despertar; na prévia vira pílula do pedido ("Despertar · Celeridade ●●")
    if (x.previsto) efeitos.push(efeitoDespertar(x));
    avisos.push(avisoDespertar(x, disc ? `o poder de ${disc.nome}` : "o poder"));
  } else if (disc && op.custoDespertar === 0) {
    notas.push("poder sem custo de Despertar");
  }

  if (atormentado(ficha)) {
    paradaBase -= 2;
    notas.push("−2 atormentado pelas Manchas");
  }
  const parada = ajustar(paradaBase, pedido, notas);
  const qtdFome = Math.min(fome, parada);
  const normais = rolarFaces(parada - qtdFome);
  const dadosFome = rolarFaces(qtdFome);
  const av = avaliar(normais, dadosFome, alvo);
  const expressao = `${parada}d10${qtdFome ? ` (${qtdFome} de Fome)` : ""}${alvo !== null ? ` vs ${alvo}` : ""}`;
  const b = base(ficha, pedido, rotulo, expressao, normais, dadosFome, vtm);
  const r = concluir(b, av, alvo, [...notas, ...notasDoGrau(av, alvo, fome, qtdFome > 0)]);

  const falhas = despertares.reduce((s, x) => s + x.falhas, 0);
  if (falhas) r.falhasDespertar = falhas;
  if (despertares.length) r.despertares = despertares;
  if (surto) r.surto = surto;
  if (surtoConsumido) {
    r.surtoConsumido = true;
    avisos.push(`O Surto de Sangue guardado (+${surto}) foi gasto neste teste.`);
  }
  if (vtm === "caca" && alvo !== null && !pedido.previa) {
    const caca = desfechoCaca(ficha, av, alvo, fome, op, notas);
    const { aviso, efeitos: ef } = avisoCaca(ficha, caca, av);
    r.caca = caca;
    efeitos.push(...ef);
    avisos.push(aviso);
    r.detalhes = [...notas, ...notasDoGrau(av, alvo, fome, qtdFome > 0)].filter(Boolean).join(" · ") || undefined;
  }
  if (efeitos.length) r.efeitos = efeitos;
  const aviso = juntarAvisos(...avisos);
  if (aviso && !pedido.previa) r.avisoMestre = aviso;
  return r;
}
