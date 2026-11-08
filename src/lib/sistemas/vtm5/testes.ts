import "server-only";
import { d } from "../../dados";
import { limitar, normalizar } from "../comum";
import type { Ficha, GrauSucesso, PedidoTeste, ResultadoTeste } from "../tipos";
import { ATRIBUTOS, CLAS, COMPULSOES_GENERICAS, DISCIPLINAS, PAR_DE_ATRIBUTO, PERICIAS, POTENCIA, PREDADORES } from "./dados";
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
  /** quem foi a vítima, como o mestre disse ("mortal", "vampiro", "animal", "doador") */
  presa?: string;
  /** a presa casou com uma Exclusão de Presa da ficha: +1 Mancha (aposTeste aplica com degeneração) */
  presaExcluida?: string;
  /** Fazendeiro bebendo de gente: Força de Vontade gasta (aposTeste desconta) */
  vontadeGasta?: number;
  /** Sanguessuga bebendo de vampiro: sacia, sem Ressonância de bônus */
  vampirica?: boolean;
};

/** Compulsão sorteada quando a Besta escapa (Falha Bestial, ou Crítico Sujo com compulsao "sortear"). */
export type CompulsaoVtm = { nome: string; efeito: string; face: number; doCla: boolean };

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
  /** compulsão sorteada neste teste (aposTeste grava a condição "Compulsão: Nome") */
  compulsao?: CompulsaoVtm;
  /** rerrolagem com Força de Vontade (vtm5/forca-de-vontade.ts): índices em `dados` (só normais) e a Força de Vontade gasta */
  rerrolado?: RerroladoVtm;
  /** Ataque: arma e contra quem (para o dano sugerido; a rerrolagem recalcula) */
  golpe?: { arma: number; contra?: string };
  /** poder da ficha usado no teste (extras.poderes) */
  poder?: PoderVtm;
};

export type RerroladoVtm = {
  dados: { indice: number; antes: number; depois: number }[];
  vontade: { antes: number; depois: number; max: number };
  /** grau antes da rerrolagem ("Falha", "Falha Bestial") */
  grauAntes: string;
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

export const CONDICAO_PERDIDO = "Perdido para a Besta";

/**
 * Soma `n` Manchas na ficha (muta). Cada Mancha que não acha caixa vazia é degeneração: a Humanidade cai 1 e a caixa liberada
 * recebe a Mancha. Humanidade 0 marca "Perdido para a Besta". Devolve o texto para o cartão e o retorno ao mestre.
 */
export function aplicarManchas(ficha: Ficha, n: number): { humanidadePerdida: number; texto: string; atormentado: boolean } {
  let hum = humanidadeDe(ficha);
  let mancha = Math.min(manchaDe(ficha), 10 - hum);
  const humAntes = hum;
  for (let i = 0; i < Math.max(0, Math.floor(n)); i++) {
    if (mancha < 10 - hum) mancha++;
    else if (hum > 0) {
      hum--;
      mancha = 10 - hum;
    }
  }
  const r = ficha.recursos;
  r.humanidade = { rotulo: r.humanidade?.rotulo ?? "Humanidade", atual: hum, max: 10 };
  r.mancha = { rotulo: r.mancha?.rotulo ?? "Manchas", atual: mancha, max: 10 - hum };
  ficha.extras.mancha = mancha;
  if (hum === 0 && !ficha.condicoes.some((c) => normalizar(c) === normalizar(CONDICAO_PERDIDO))) ficha.condicoes.push(CONDICAO_PERDIDO);
  const perdida = humAntes - hum;
  const cheio = mancha > 0 && mancha >= 10 - hum;
  const texto = perdida
    ? `degeneração: Humanidade ${humAntes} → ${hum}${hum === 0 ? " · perdido para a Besta" : ""}`
    : `Manchas ${mancha}/${10 - hum}${cheio ? " (atormentado)" : ""}`;
  return { humanidadePerdida: perdida, texto, atormentado: cheio };
}

/** Nome da compulsão ativa ("Compulsão: Crueldade", ou o formato antigo "Compulsão (Crueldade)"), se houver. */
export function compulsaoAtiva(ficha: Ficha): string | null {
  const c = ficha.condicoes.find((x) => normalizar(x).startsWith("compuls"));
  if (!c) return null;
  const nome = c
    .replace(/^compuls\S*\s*[:(]?\s*/i, "")
    .replace(/\).*$/, "")
    .split(/\s+[—(-]\s*/)[0]
    .trim();
  return nome || "compulsão";
}

/** Sorteio da compulsão em 1d10: 1–3 Fome, 4–5 Dominância, 6–7 Dano, 8–9 Paranoia, 10 a do clã (sem ela, sorteia entre as outras). */
export function sortearCompulsao(ficha: Ficha): CompulsaoVtm {
  const face = d(10);
  const cla = CLAS.find((c) => c.id === ficha.classe)?.compulsao ?? null;
  if (face === 10 && cla) return { nome: cla.nome, efeito: cla.efeito, face, doCla: true };
  const valor = face === 10 ? d(9) : face;
  const g = COMPULSOES_GENERICAS.find((x) => x.faces.includes(valor)) ?? COMPULSOES_GENERICAS[0];
  return { nome: g.nome, efeito: g.efeito, face, doCla: false };
}

/** Efeito de uma compulsão pelo nome (clã ou genérica), para o aviso ao mestre. */
function efeitoCompulsao(nome: string): string {
  const n = normalizar(nome);
  return (
    COMPULSOES_GENERICAS.find((x) => normalizar(x.nome) === n)?.efeito ??
    CLAS.find((c) => c.compulsao && normalizar(c.compulsao.nome) === n)?.compulsao?.efeito ??
    ""
  );
}

export type DefeitosAlimentacao = { exclusoes: string[]; fazendeiro: boolean };

/** Defeitos de alimentação lidos da ficha: "Exclusão de Presa: mortais ●●", "Fazendeiro ●●" e o próprio Sanguessuga. */
export function defeitosDeAlimentacao(ficha: Ficha): DefeitosAlimentacao {
  const exclusoes: string[] = [];
  let fazendeiro = ficha.ancestralidade === "fazendeiro";
  for (const def of listaExtra(ficha, "defeitos")) {
    if (/^\s*fazendeiro/i.test(def)) fazendeiro = true;
    // "(ou Exclusão de Presa ...)" é a alternativa que o jogador não escolheu
    const m = def.match(/(\(\s*ou\s+)?exclus[aã]o de presa:?\s*([^●(]+)/i);
    if (m && !m[1] && m[2].trim()) exclusoes.push(m[2].trim());
  }
  if (ficha.ancestralidade === "sanguessuga" && !exclusoes.some((x) => /mortai/i.test(normalizar(x)))) exclusoes.push("mortais");
  return { exclusoes, fazendeiro };
}

export const temDefeitoDeAlimentacao = (ficha: Ficha) => {
  const x = defeitosDeAlimentacao(ficha);
  return x.fazendeiro || x.exclusoes.length > 0;
};

// Palavras inteiras: "membro da gangue", "um ancião do bairro" e "cabra da peste" são gente, não vampiro nem bicho
const presaAnimal = (p: string) =>
  /\b(?:anima(?:l|is)|bichos?|ratos?|ratazanas?|cachorr[oa]s?|caes|cao|gat[oa]s?|cavalos?|bois?|vacas?|porcos?|pombos?|morcegos?|ovelhas?|bodes?|galinhas?|cabras?(?! da peste| macho))\b/.test(p);
const presaVampiro = (p: string) =>
  /\b(?:vampir[oa]s?|cainitas?|kindred|camarilla|sabbat|matusalem|caitiffs?|sangue[- ]ralo|brujah|gangrel|malkavian[oa]?s?|nosferatu|toreador|tremere|ventrue|lasombra|tzimisce|hecata|ravnos|salubri|banu haqim)\b/.test(p) ||
  /\b(?:membro|anciao|ancila|neonato|neofito)s? (?:da camarilla|do sabbat|anarquista|vampir)/.test(p);

/** Qual exclusão a presa quebra (null = nenhuma). `p` normalizado. */
function exclusaoQuebrada(exclusoes: string[], p: string): string | null {
  const humana = !presaAnimal(p) && !presaVampiro(p);
  for (const ex of exclusoes) {
    const e = normalizar(ex);
    if (/mortai|humano|gente comum/.test(e)) {
      if (humana) return ex;
      continue;
    }
    if (/consent/.test(e)) {
      if (humana && /(nao|sem) consent|a forca|forcad|contragosto|involunt|vitima|assalt|ataca|derrub|dopad|inconscien/.test(p)) return ex;
      continue;
    }
    const raizes = e
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !["gente", "pessoas", "quem", "outra", "outro", "cena"].includes(w))
      .map((w) => w.slice(0, 5));
    if (humana && raizes.some((r) => p.includes(r))) return ex;
  }
  return null;
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
  /** a ação serve à compulsão ativa (sem −2), vai contra ela (−2, o padrão) ou pede o sorteio num Crítico Sujo */
  compulsao: "serve" | "contra" | "sortear" | null;
  /** caça: quem é a vítima (normalizado) */
  presa: string | null;
  /** dano da arma num Ataque (0–4) */
  arma?: number;
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
    compulsao: o.compulsao === "serve" || o.compulsao === "contra" || o.compulsao === "sortear" ? o.compulsao : null,
    presa: typeof o.presa === "string" && o.presa.trim() ? o.presa.trim() : null,
    arma: n(o.arma, 0, 4),
  };
}

// ---------- testes opostos ----------

/** Quem resiste ao teste: nome e parada do NPC (o servidor rola, sem Fome). O pedido pendente guarda em opcoes.oposicao. */
export type OposicaoVtm = { nome: string; parada: number };

export function oposicaoDe(pedido: PedidoTeste): OposicaoVtm | null {
  const bruta = (pedido.oposicao ?? (pedido.opcoes?.oposicao as PedidoTeste["oposicao"] | undefined)) ?? null;
  if (!bruta || typeof bruta !== "object") return null;
  const parada = typeof bruta.parada === "number" && Number.isFinite(bruta.parada) ? limitar(Math.round(bruta.parada), 1, 20) : 0;
  if (!parada) return null;
  const nome = typeof bruta.nome === "string" && bruta.nome.trim() ? bruta.nome.trim().slice(0, 60) : "a oposição";
  return { nome, parada };
}

/** Linha do NPC no cartão e no texto: "Vera: 5d10 → 2 sucessos". */
export function textoOposicao(o: { nome: string; expressao: string; total: number }): string {
  return `${o.nome}: ${o.expressao} → ${o.total} sucesso${o.total === 1 ? "" : "s"}`;
}

/**
 * Dano sugerido de um Ataque: sucessos acima da defesa (do NPC, ou da dificuldade) + arma, mínimo 1 quando acerta.
 * `null` quando errou. Recalculado também depois da rerrolagem com Força de Vontade.
 */
export function danoDoAtaque(r: Pick<ResultadoVtm, "total" | "alvo" | "sucesso" | "oposicao" | "golpe">): ResultadoTeste["dano"] | undefined {
  if (!r.golpe || !r.sucesso) return undefined;
  const defesa = r.oposicao ? r.oposicao.total : (r.alvo ?? 0);
  const margem = Math.max(0, r.total - defesa);
  const valor = Math.max(1, margem + r.golpe.arma);
  const contra = r.oposicao?.nome ?? r.golpe.contra;
  return {
    valor,
    tipo: "superficial",
    texto: `${valor} de dano${contra ? ` em ${contra}` : ""} (margem ${margem}${r.golpe.arma ? ` + arma ${r.golpe.arma}` : ""})`,
  };
}

// ---------- poderes de disciplina ----------

/** Poder de disciplina que o personagem conhece (extras.poderes): escolhido na criação ou ao gastar XP. */
export type PoderVtm = { disciplina: string; nivel: number; nome: string; custo: number; parada?: string };

export function poderesDe(ficha: Ficha): PoderVtm[] {
  const v = ficha.extras.poderes;
  if (!Array.isArray(v)) return [];
  const out: PoderVtm[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const p = x as Partial<PoderVtm>;
    const nome = typeof p.nome === "string" ? p.nome.trim() : "";
    const disc = DISCIPLINAS.find((y) => y.id === p.disciplina || normalizar(y.nome) === normalizar(String(p.disciplina ?? "")));
    if (!nome || !disc) continue;
    out.push({
      disciplina: disc.id,
      nivel: limitar(Math.round(Number(p.nivel) || 1), 1, 5),
      nome,
      custo: limitar(Math.round(Number(p.custo ?? 1)), 0, 3),
      ...(typeof p.parada === "string" && p.parada.trim() ? { parada: p.parada.trim() } : {}),
    });
  }
  return out;
}

/** Sem acento, mas com a caixa original (as posições batem com o texto em minúsculas). */
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Palavras logo antes da menção que dizem que não é o personagem usando: "sem Hipnose", "resiste à Dominação", "sente o poder de Oblívio". */
const NAO_E_USO = /(?:^|[^\p{L}])(sem|nao|nem|nunca|contra|resist\p{L}*|defend\p{L}*|sofr\p{L}*|sob|escap\p{L}*|livr\p{L}*|ignor\p{L}*|perceb\p{L}*|not\p{L}*|sent\p{L}*|detect\p{L}*|reconhec\p{L}*|imun\p{L}*)(?:\s+\p{L}{1,6}){0,3}\s+$/u;

/**
 * O texto cita `nome` como algo que o personagem USA? Casa a palavra inteira ("Voz" não casa "voz baixa" quando `maiuscula`,
 * nem "Vozes"), e descarta a menção negada ou sofrida ("sem Hipnose", "resiste à Dominação") e a de outro dono
 * ("a Dominação de Vera"). `maiuscula`: no motivo, nome de uma palavra só precisa vir com inicial maiúscula.
 */
function usaNoTexto(ficha: Ficha, texto: string, nome: string, maiuscula: boolean, inicioNaoConta = false): boolean {
  const orig = semAcento(texto);
  const baixo = orig.toLowerCase();
  const alvo = semAcento(nome).toLowerCase().trim().replace(/\s+/g, " ");
  if (alvo.length < 3) return false;
  const escapado = alvo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapado}(?![\\p{L}\\p{N}])`, "gu");
  const umaPalavra = !alvo.includes(" ");
  const dono = normalizar(ficha.nome).split(" ")[0] ?? "";
  for (const m of baixo.matchAll(re)) {
    const i = m.index ?? 0;
    if (maiuscula && umaPalavra && orig[i] === baixo[i]) continue;
    // no motivo, a maiúscula do começo da frase não prova nada ("Presença de espírito diante do Príncipe", "Fortitude contra
    // o frio"): ali só conta com o nível escrito logo depois ("Fortitude ●●")
    if (inicioNaoConta && /(?:^|[.!?:;—–-])\s*$/.test(orig.slice(0, i)) && !/^\s*●/.test(orig.slice(i + m[0].length))) continue;
    if (NAO_E_USO.test(baixo.slice(Math.max(0, i - 40), i))) continue;
    const de = orig.slice(i + m[0].length).match(/^\s+(?:de|da|do|das|dos)\s+(\p{Lu}\p{L}*)/u);
    if (de && de[1].toLowerCase() !== dono) continue;
    return true;
  }
  return false;
}

/**
 * Poder da ficha citado no teste ("Nublar Memória") ou no motivo ("usa Hipnose em Vera"): o de nome mais longo que aparece.
 * No `motivo` a regra é mais estrita (nome de uma palavra só com inicial maiúscula), para "fala em voz baixa" não virar o poder "Voz".
 */
export function poderNoTexto(ficha: Ficha, texto: string, motivo = ""): PoderVtm | null {
  if (!texto.trim() && !motivo.trim()) return null;
  const achados = poderesDe(ficha).filter((p) => usaNoTexto(ficha, texto, p.nome, false) || usaNoTexto(ficha, motivo, p.nome, true));
  return achados.sort((a, b) => b.nome.length - a.nome.length)[0] ?? null;
}

/** Recusa o uso de uma disciplina que o personagem não tem (ou não tem no nível pedido). */
function exigirDisciplina(ficha: Ficha, discId: string, nivel: number, oQue?: string): void {
  const x = DISCIPLINAS.find((y) => y.id === discId);
  const nome = x?.nome ?? discId;
  const pontos = disciplinasDe(ficha)[discId] ?? 0;
  if (pontos >= nivel) return;
  const tem = Object.entries(disciplinasDe(ficha))
    .filter(([, v]) => v > 0)
    .map(([id, v]) => `${DISCIPLINAS.find((y) => y.id === id)?.nome ?? id} ${v}`)
    .join(", ");
  const quais = poderesDe(ficha)
    .filter((p) => p.disciplina === discId)
    .map((p) => `${p.nome} (${"●".repeat(p.nivel)})`)
    .join(", ");
  throw new Error(
    pontos === 0
      ? `${ficha.nome} não tem ${nome}: o poder não acontece. Disciplinas da ficha: ${tem || "nenhuma"}.`
      : `${oQue ?? `Poder de ${nome} ${"●".repeat(nivel)}`} pede ${nome} ${nivel}, e ${ficha.nome} tem ${pontos}: não acontece.${quais ? ` Poderes de ${nome} que ele conhece: ${quais}.` : ""}`,
  );
}

/** Nível do poder escrito no texto: "Celeridade ●●", "nível 3", "3º nível". */
function nivelNoTexto(texto: string): number | null {
  const bolas = texto.match(/●+/)?.[0].length;
  if (bolas) return limitar(bolas, 1, 5);
  const t = normalizar(texto);
  const m = t.match(/nivel\s*(\d)/) ?? t.match(/(\d)\s*[oº]?\s*nivel/);
  return m ? limitar(Number(m[1]), 1, 5) : null;
}

/**
 * Disciplina que o personagem usa segundo um texto livre (motivo do Despertar, motivo do teste). "Potência de Sangue" não é a
 * disciplina Potência; "sem Dominação", "resiste à Dominação" e "a Dominação de Vera" não são uso. `maiuscula`: o nome tem
 * de vir com inicial maiúscula ("presença de espírito" não é Presença), fora do começo da frase, e só pelo nome canônico (os
 * apelidos verbais "Dominar", "Ofuscar", "Rapidez" descrevem ações mundanas), para o motivo do teste.
 */
function disciplinaNoTexto(ficha: Ficha, texto: string, maiuscula = false) {
  const limpo = semAcento(texto).replace(/pot[eê]ncia de sangue/gi, "");
  return (
    DISCIPLINAS.find((x) => (maiuscula ? [x.nome] : [x.nome, ...(x.apelidos ?? [])]).some((n) => n.length > 3 && usaNoTexto(ficha, limpo, n, maiuscula, maiuscula))) ??
    null
  );
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

/**
 * Ajustes da parada: atormentado (−2 em qualquer parada: comum, Frenesi, Remorso, Força de Vontade), compulsão ativa (−2 no
 * que não a serve), modo e modificador (±2 dados). Mínimo 1.
 */
function ajustar(parada: number, pedido: PedidoTeste, notas: string[], ficha: Ficha, compulsao: string | null = null): number {
  let n = parada;
  if (atormentado(ficha)) {
    n -= 2;
    notas.push("−2 atormentado pelas Manchas");
  }
  if (compulsao) {
    n -= 2;
    notas.push(`−2 compulsão (${compulsao})`);
  }
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
export function notasDoGrau(av: Avaliacao, alvo: number | null, fome: number, comFome: boolean): string[] {
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
  const poder = poderNoTexto(ficha, textoLivre);
  const disc = poder ? (DISCIPLINAS.find((y) => y.id === poder.disciplina) ?? null) : disciplinaNoTexto(ficha, textoLivre);
  const nivel = op.nivelPoder ?? poder?.nivel ?? nivelNoTexto(textoLivre) ?? (disc ? (disciplinasDe(ficha)[disc.id] ?? 1) : null);
  // Despertar para um poder que o personagem não tem não acontece
  if (disc) exigirDisciplina(ficha, disc.id, nivel ?? 1, poder ? `${poder.nome} (${disc.nome} ${"●".repeat(poder.nivel)})` : undefined);
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
  const parada = ajustar(paradaBase, pedido, notas, ficha);
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
  const p = op.presa ? normalizar(op.presa) : "";
  const vampiro = presaVampiro(p) && !presaAnimal(p);
  // Fazendeiro sem presa dita bebe de bicho (o costume dele); presa dita manda
  const animal = op.ressonancia === "animal" || presaAnimal(p) || (!p && !op.ressonancia && pred?.id === "fazendeiro");
  const passou = av.grau === "sucesso" || av.grau === "sucesso_critico";
  const vazio: CacaVtm = { passou, fomeAntes, fomeDepois: fomeAntes, matou: false, manchas: 0, animal, ressonancia: null, compulsao: null, ...(op.presa ? { presa: op.presa } : {}) };
  if (!passou) return vazio;
  const defeitos = defeitosDeAlimentacao(ficha);
  const excluida = p ? exclusaoQuebrada(defeitos.exclusoes, p) : null;
  const humana = !animal && !vampiro;
  const extra: Partial<CacaVtm> = {
    ...(op.presa ? { presa: op.presa } : {}),
    ...(excluida ? { presaExcluida: excluida } : {}),
    ...(defeitos.fazendeiro && humana && p ? { vontadeGasta: 2 } : {}),
    ...(vampiro ? { vampirica: true } : {}),
  };
  if (excluida) notas.push(`presa excluída (${excluida}): +1 Mancha`);
  if (extra.vontadeGasta) notas.push("Fazendeiro bebendo de gente: −2 Força de Vontade");
  // bebida rápida sacia 1; com folga (margem 2+ ou crítico) sacia 2. Sem matar a Fome não desce de 1.
  const baseSacia = av.total - alvo >= 2 || av.pares > 0 ? 2 : 1;
  const s = saciadoPelaPotencia(baseSacia, bp, animal);
  if (s.nota) notas.push(s.nota);
  const matou = op.matar;
  let fomeDepois: number;
  let manchas = 0;
  if (matou && !animal) {
    fomeDepois = Math.min(fomeAntes, fomeMinimaAoMatar(bp));
    // drenar um vampiro é diablerie (Potência por potencia_de_sangue); as Manchas dela o mestre decide
    manchas = vampiro ? (op.manchas ?? 0) : (op.manchas ?? 2);
  } else {
    fomeDepois = Math.max(Math.min(fomeAntes, 1), fomeAntes - s.valor);
  }
  if (vampiro) {
    // sangue de vampiro sacia, mas não tem o humor de um mortal: nenhuma Ressonância de bônus
    return { passou, fomeAntes, fomeDepois, matou, manchas, animal: false, ressonancia: null, compulsao: null, ...extra };
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
    ...extra,
  };
}

function avisoCaca(ficha: Ficha, c: CacaVtm, av: Avaliacao): { aviso: string; efeitos: EfeitoVtm[] } {
  const nomeDisc = (id: string) => DISCIPLINAS.find((x) => x.id === id)?.nome ?? id;
  if (!c.passou) {
    if (c.compulsao) {
      // a compulsão sorteada tem chip e aviso próprios (resolver)
      return {
        aviso: `Falha Bestial na caça: a Besta toma conta — a vítima sai muito ferida ou morre (se morrer, alterar_ficha com Manchas), cena feia, Máscara em risco. Fome segue ${c.fomeAntes}.`,
        efeitos: [{ texto: `Fome segue ${c.fomeAntes}`, tom: "muted" }],
      };
    }
    return {
      aviso: `A caça falhou: Fome segue ${c.fomeAntes}. Complicação sugerida: a vítima escapa e grita, alguém filma, a polícia passa, outro vampiro reclama o território. Se faltou pouco, ofereça beber a um custo.`,
      efeitos: [{ texto: `sem sangue · Fome ${c.fomeAntes}`, tom: "muted" }],
    };
  }
  const r = c.ressonancia;
  const ressTexto = r
    ? `Ressonância ${textoRessonancia(r)} (${RESSONANCIAS[r.tipo].humor}): ${INTENSIDADES[r.intensidade].efeito}${INTENSIDADES[r.intensidade].bonus ? ` — ${r.disciplinas.map(nomeDisc).join(" e ")}` : ""}`
    : "Sangue vampírico: sacia, mas sem Ressonância de bônus";
  const efeitos: EfeitoVtm[] = [
    { texto: c.fomeDepois < c.fomeAntes ? `Fome ${c.fomeAntes} → ${c.fomeDepois}` : `Fome segue ${c.fomeAntes}`, tom: c.fomeDepois < c.fomeAntes ? "musgo" : "muted" },
    r ? { texto: textoRessonancia(r), tom: INTENSIDADES[r.intensidade].bonus ? "ambar" : "muted" } : { texto: "sangue vampírico", tom: "muted" },
  ];
  if (c.matou && c.manchas) efeitos.push({ texto: `matou · +${c.manchas} Mancha${c.manchas === 1 ? "" : "s"}`, tom: "sangue" });
  if (c.presaExcluida) efeitos.push({ texto: "presa excluída · +1 Mancha", tom: "sangue" });
  if (c.vontadeGasta) efeitos.push({ texto: `−${c.vontadeGasta} Força de Vontade (Fazendeiro)`, tom: "sangue" });
  const partes = [
    `Caçou: Fome ${c.fomeAntes} → ${c.fomeDepois} (já aplicado)${c.matou && c.manchas ? `; matou a vítima: +${c.manchas} Mancha(s)` : ""}.`,
    c.presaExcluida ? `A presa quebra a Exclusão de Presa (${c.presaExcluida}): +1 Mancha (já aplicado; sem caixa livre, vira degeneração). Narre o nojo de si mesmo.` : "",
    c.vontadeGasta ? `Fazendeiro bebendo de gente: −${c.vontadeGasta} de Força de Vontade (já aplicado).` : "",
    c.vampirica && c.matou ? "Drenou um vampiro: isso é diablerie. Se a vítima tinha Potência maior, chame potencia_de_sangue (motivo diablerie)." : "",
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
  let ataque = false;
  // poder da ficha citado no teste ou no motivo: dá custo, nível e (se tiver) a parada
  const poder = /iniciativa|initiative|^(caca|cacar|cacada|alimentar|alimentacao|hunt)/.test(t) ? null : poderNoTexto(ficha, texto, pedido.motivo ?? "");
  const poderNoNome = poder !== null && normalizar(texto).includes(normalizar(poder.nome));

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
    // defeito de alimentação: o servidor precisa saber quem é a vítima para cobrar o preço
    const defeitos = defeitosDeAlimentacao(ficha);
    if ((defeitos.fazendeiro || defeitos.exclusoes.length) && !op.presa) {
      const quais = [...defeitos.exclusoes.map((x) => `Exclusão de Presa: ${x}`), ...(defeitos.fazendeiro ? ["Fazendeiro"] : [])].join(", ");
      throw new Error(`${ficha.nome} tem defeito de alimentação (${quais}): diga a presa (ex.: "mortal", "doador que consente", "animal", "vampiro").`);
    }
    const presa = op.presa ? normalizar(op.presa) : "";
    if (defeitos.fazendeiro && presa && !presaAnimal(presa) && !presaVampiro(presa) && op.ressonancia !== "animal" && vontadeDe(ficha) < 2) {
      throw new Error(`${ficha.nome} é Fazendeiro: beber de gente custa 2 de Força de Vontade e só restam ${vontadeDe(ficha)}. Sem isso, a caça tem de ser de animal.`);
    }
    if (op.presa) notas.push(`presa: ${op.presa}`);
  } else if (/^(ataque|atacar|attack)/.test(t)) {
    pecas = pecasAtaque(ficha, `${texto} ${pedido.motivo ?? ""}`);
    rotulo = `Ataque (${pecas[1].nome})`;
    ataque = true;
  } else if (poder && poderNoNome) {
    // "Nublar Memória" (ou "Nublar Memória: Carisma + Dominação"): a parada do poder, ou a da disciplina
    const resto = texto.includes(":") ? texto.slice(texto.indexOf(":") + 1).trim() : "";
    const discNome = DISCIPLINAS.find((y) => y.id === poder.disciplina)!.nome;
    pecas = pecasDoTexto(ficha, resto || poder.parada || discNome, notas);
    rotulo = `${poder.nome} (${pecas.map((p) => p.nome).join(" + ")})`;
  } else {
    surtoNoTexto = /surto|blood surge/.test(t);
    pecas = pecasDoTexto(ficha, texto, notas);
    rotulo = pecas.map((p) => p.nome).join(" + ");
  }

  // disciplina que o personagem não tem (ou não tem no nível do poder): o teste é recusado, não vira "só o atributo"
  for (const p of pecas) if (p.tipo === "disciplina" && p.valor === 0) exigirDisciplina(ficha, p.id, 1);
  if (poder) exigirDisciplina(ficha, poder.disciplina, poder.nivel, `${poder.nome} (${DISCIPLINAS.find((y) => y.id === poder.disciplina)?.nome} ${"●".repeat(poder.nivel)})`);
  {
    const discPeca = pecas.find((p) => p.tipo === "disciplina");
    const nivelPedido = op.nivelPoder ?? nivelNoTexto(`${texto} ${pedido.motivo ?? ""}`);
    // disciplina usada segundo o teste ou o motivo, mesmo fora da parada ("Força + Intimidação", motivo "garra de sombra de
    // Oblívio ●●"): sem os pontos (ou sem o nível), o poder não acontece. Menção negada, sofrida ou de outro dono não conta.
    const citada = discPeca || poder ? null : (disciplinaNoTexto(ficha, texto) ?? disciplinaNoTexto(ficha, pedido.motivo ?? "", true));
    const alvoDisc = discPeca?.id ?? citada?.id ?? null;
    if (alvoDisc && !poder) exigirDisciplina(ficha, alvoDisc, nivelPedido ?? 1);
  }

  let paradaBase = pecas.reduce((s, p) => s + p.valor, 0);
  notas.push(pecas.map((p) => `${p.nome} ${p.valor}`).join(" + "));
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
  // poder da ficha: o custo e o nível vêm dele (custo 0 = sem Despertar), a não ser que o mestre diga outro
  const custo = vtm === "iniciativa" ? 0 : (op.custoDespertar ?? poder?.custo ?? (disc ? 1 : 0));
  if (poder) notas.push(`poder: ${poder.nome} (${"●".repeat(poder.nivel)}${poder.custo === 0 && op.custoDespertar === undefined ? ", sem custo" : ""})`);
  if (custo > 0) {
    const nivel = op.nivelPoder ?? poder?.nivel ?? nivelNoTexto(`${texto} ${pedido.motivo ?? ""}`) ?? disc?.valor ?? null;
    const pelaPotencia = (disc !== null || poder !== null) && rerrolaPelaPotencia(ficha, nivel);
    const rerrolar = op.rerrolar || pelaPotencia;
    const discPoder = poder ? (DISCIPLINAS.find((y) => y.id === poder.disciplina)?.nome ?? "") : "";
    const motivo = poder ? `${poder.nome} (${discPoder} ${"●".repeat(poder.nivel)})` : disc ? `${disc.nome}${nivel ? ` ${"●".repeat(nivel)}` : ""}` : "poder";
    const x = pedido.previa ? despertarPrevisto(fome, custo, rerrolar, motivo) : rolarDespertar(fome, custo, rerrolar, motivo);
    despertares.push(x);
    fome = x.fomeDepois;
    // o cartão mostra a faixa do Despertar; nas notas fica só a rerrolagem da Potência
    if (!x.previsto && pelaPotencia) notas.push(`Potência ${potenciaDe(ficha)} rerrola o Despertar de poderes até nível ${efeitosPotencia(ficha).rerrolagem}`);
    // rolado, o cartão desenha a faixa do Despertar; na prévia vira pílula do pedido ("Despertar · Celeridade ●●")
    if (x.previsto) efeitos.push(efeitoDespertar(x));
    avisos.push(avisoDespertar(x, poder ? poder.nome : disc ? `o poder de ${disc.nome}` : "o poder"));
  } else if (disc && op.custoDespertar === 0) {
    notas.push("poder sem custo de Despertar");
  }

  // compulsão ativa: −2 no que não a serve (o mestre diz compulsao "serve"; caçar serve à compulsão de Fome)
  const ativa = vtm === "iniciativa" ? null : compulsaoAtiva(ficha);
  const serve = op.compulsao === "serve" || (vtm === "caca" && ativa !== null && normalizar(ativa) === "fome");
  const parada = ajustar(paradaBase, pedido, notas, ficha, ativa && !serve ? ativa : null);
  const qtdFome = Math.min(fome, parada);
  const normais = rolarFaces(parada - qtdFome);
  const dadosFome = rolarFaces(qtdFome);
  // teste oposto: o servidor rola a parada do NPC (sem Fome); empate fica com quem defende, então o alvo é NPC + 1
  const opos = vtm === "iniciativa" ? null : oposicaoDe(pedido);
  let oposicao: ResultadoTeste["oposicao"];
  if (opos && pedido.previa) {
    alvo = null;
    notas.push(`contra ${opos.nome} (${opos.parada} dados)`);
  } else if (opos) {
    const faces = rolarFaces(opos.parada);
    const npc = contarSucessos(faces).total;
    oposicao = { nome: opos.nome, expressao: `${opos.parada}d10`, dados: faces, total: npc };
    alvo = npc + 1;
    notas.push(`${textoOposicao(oposicao)} (empate fica com ${opos.nome})`);
  }
  const av = avaliar(normais, dadosFome, alvo);
  const expressao = `${parada}d10${qtdFome ? ` (${qtdFome} de Fome)` : ""}${oposicao ? ` vs ${oposicao.nome} (${oposicao.expressao} → ${oposicao.total})` : alvo !== null ? ` vs ${alvo}` : ""}`;
  const b = base(ficha, pedido, rotulo, expressao, normais, dadosFome, vtm);
  // na prévia (cartão do pedido) os dados não valem nada: as notas são só a composição da parada e quantos são de Fome
  const r = concluir(b, av, alvo, pedido.previa ? [...notas, qtdFome ? `${qtdFome} de Fome` : ""] : [...notas, ...notasDoGrau(av, alvo, fome, qtdFome > 0)]);
  if (oposicao) r.oposicao = oposicao;
  if (poder) r.poder = poder;
  if (ataque && !pedido.previa && (oposicao || op.arma !== undefined)) {
    r.golpe = { arma: op.arma ?? 0, ...(opos ? { contra: opos.nome } : {}) };
    const dano = danoDoAtaque(r);
    if (dano) {
      r.dano = dano;
      const quem = opos?.nome ?? "o alvo";
      avisos.push(
        `Dano sugerido: ${dano.texto}, Superficial. Aplique com atualizar_cena (combate.dano [{nome: "${quem}", pv: ${dano.valor}}]) — se ${quem} for vampiro, divida por 2 (para cima); fogo, garras e presas viram Agravado.`,
      );
    } else if (oposicao) {
      const sobra = oposicao.total - r.total;
      avisos.push(
        sobra > 0
          ? `${opos!.nome} se defendeu (${oposicao.total} contra ${r.total}): sem dano em ${opos!.nome}. Se ${opos!.nome} atacava ao mesmo tempo, a margem dele (${sobra}) + a arma DELE vira dano em ${ficha.nome} via alterar_ficha (Superficial: vampiro divide por 2).`
          : `Empate (${r.total} a ${r.total}): fica com quem defende, ${opos!.nome} não sofre dano e ninguém fere ninguém neste golpe.`,
      );
    }
  } else if (oposicao && !pedido.previa) {
    avisos.push(
      r.sucesso
        ? `${ficha.nome} venceu ${oposicao.nome} por ${r.total - oposicao.total}.`
        : `${oposicao.nome} venceu (${oposicao.total} contra ${r.total}${r.total === oposicao.total ? ", empate fica com quem resiste" : ""}).`,
    );
  }

  const falhas = despertares.reduce((s, x) => s + x.falhas, 0);
  if (falhas) r.falhasDespertar = falhas;
  if (despertares.length) r.despertares = despertares;
  if (surto) r.surto = surto;
  if (surtoConsumido) {
    r.surtoConsumido = true;
    avisos.push(`O Surto de Sangue guardado (+${surto}) foi gasto neste teste.`);
  }
  // a Besta escapa: Falha Bestial sorteia a compulsão; Crítico Sujo só quando o mestre pede (compulsao "sortear")
  const sortear = !pedido.previa && vtm !== "iniciativa" && (av.bestial || (av.sujo && op.compulsao === "sortear"));
  const compulsao = sortear ? sortearCompulsao(ficha) : null;
  if (vtm === "caca" && alvo !== null && !pedido.previa) {
    const caca = desfechoCaca(ficha, av, alvo, fome, op, notas);
    if (compulsao) caca.compulsao = compulsao.nome;
    const { aviso, efeitos: ef } = avisoCaca(ficha, caca, av);
    r.caca = caca;
    efeitos.push(...ef);
    avisos.push(aviso);
    r.detalhes = [...notas, ...notasDoGrau(av, alvo, fome, qtdFome > 0)].filter(Boolean).join(" · ") || undefined;
  }
  if (compulsao) {
    r.compulsao = compulsao;
    const nota = `Compulsão sorteada (d10 ${compulsao.face}): ${compulsao.nome}${compulsao.doCla ? " (do clã)" : ""}`;
    r.detalhes = [r.detalhes, nota].filter(Boolean).join(" · ");
    efeitos.push({ texto: `Compulsão: ${compulsao.nome}`, tom: "sangue" });
    avisos.push(
      `Compulsão "${compulsao.nome}" marcada (já aplicado): ${compulsao.efeito} O servidor tira 2 dados dos testes que não a servem (compulsao "serve" quando servir). Sai quando satisfeita (alterar_ficha remover_condicoes) ou quando a cena muda.`,
    );
  } else if (ativa && !pedido.previa) {
    const efeito = efeitoCompulsao(ativa);
    if (!serve) avisos.push(`${ficha.nome} segue sob a compulsão ${ativa} (−2 já descontado)${efeito ? `: ${efeito}` : ""}. Se a ação a servia, peça o próximo teste com compulsao "serve".`);
  }
  if (efeitos.length) r.efeitos = efeitos;
  const aviso = juntarAvisos(...avisos);
  if (aviso && !pedido.previa) r.avisoMestre = aviso;
  return r;
}
