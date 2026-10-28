import type { Mensagem } from "@/lib/db";
import { dividirParagrafos, type Turno } from "./turnos";

// Montagem de uma cena para exibição (leitor cena a cena, modo 📜 Rolagem e Livro da campanha). Sem React: roda no servidor também.
// O mestre costuma picar a cena em muitas mensagens: narração, "é a sua vez, Samuel…", "o dado está com você…", resumos fora da
// ficção ("ganhou 1 Mancha (agora 1/4)… anotei no diário") e linhas de ficha soltas. Aqui a cena vira:
//  - prosa contínua: as narrações seguidas do mestre juntas, parágrafo após parágrafo, com os cartões no ponto onde aconteceram;
//  - apartes: os trechos ((fora do jogo)) do mestre separados da prosa (caixa própria, fora da capitular e da leitura em voz alta);
//  - "o que mudou na cena": ficha, diário, XP e afins viram chips no fim, por personagem;
//  - recados escondidos: passagens de vez redundantes e resumos mecânicos no fim do turno (heurística conservadora, abaixo).

/** Um parágrafo da prosa: narração ou aparte ((fora do jogo)). */
export type Paragrafo = { texto: string; aparte: boolean; msg: number };

export type Peca =
  /** narrações seguidas do mestre (ids na ordem) */
  | { tipo: "prosa"; chave: string; ids: number[]; paragrafos: Paragrafo[] }
  /** cartão (teste, pedido de teste, cabeçalho de cena, fim da noite, aviso do sistema...) */
  | { tipo: "item"; m: Mensagem };

export type TomChip = "bom" | "ruim" | "neutro";

export type Chip = { chave: string; icone: string; rotulo: string; detalhe: string; tom: TomChip; riscado?: boolean };

export type GrupoChips = { quem: string; tipo: "personagem" | "mundo" | "mestre"; chips: Chip[] };

export type Cena = {
  pecas: Peca[];
  /** "o que mudou na cena", agrupado por personagem (depois o diário e as notas do mestre) */
  mudancas: GrupoChips[];
  /** mensagens do mestre tiradas da prosa (passagem de vez, resumo mecânico) */
  escondidas: Mensagem[];
};

/** Tipos de "dado" que são só efeito (viram chip em vez de cartão). Testes do Vampiro com dados (despertar, frenesi...) ficam no corpo. */
export const TIPOS_MUDANCA = new Set(["ficha", "diario", "xp", "descanso", "curto", "longo", "reputacao"]);

const tipoDado = (m: Mensagem) => ((m.dados ?? {}) as { tipo?: string }).tipo;

export const ehMudanca = (m: Mensagem) => m.tipo === "dado" && TIPOS_MUDANCA.has(tipoDado(m) ?? "");

// ---------- apartes ((fora do jogo)) ----------

/** Trecho ((assim)); o último pode estar aberto (texto chegando ao vivo). */
const APARTE = /(\(\([\s\S]*?(?:\)\)|$))/;
const PREFIXO_APARTE = /^(?:fora do (?:personagem|jogo)|ooc|resposta franca do mestre|nota do mestre|mestre)\s*[:—–-]\s*/i;

/** Tira os parênteses e o "Fora do personagem:" do começo (o rótulo da caixa já diz isso). */
export function limparAparte(texto: string): string {
  const t = texto
    .replace(/^\(\(\s*/, "")
    .replace(/\s*\)\)$/, "")
    .trim();
  const sem = t.replace(PREFIXO_APARTE, "").trim();
  // "Fora do personagem: duas coisas." → "Duas coisas."
  return sem === t ? t : sem.charAt(0).toUpperCase() + sem.slice(1);
}

/** Parágrafos de uma narração do mestre, com os apartes ((fora do jogo)) separados. */
export function paragrafosDaNarracao(texto: string, msg: number): Paragrafo[] {
  const saida: Paragrafo[] = [];
  texto.split(APARTE).forEach((parte, i) => {
    if (i % 2 === 1) {
      const t = limparAparte(parte);
      // aparte com vários parágrafos vira um só (a caixa quebra as linhas)
      if (t) saida.push({ texto: t.replace(/\n{2,}/g, "\n"), aparte: true, msg });
      return;
    }
    for (const p of dividirParagrafos(parte)) saida.push({ texto: p, aparte: false, msg });
  });
  return saida;
}

/** Fala do jogador inteira fora do jogo: "((assim))". */
export const foraDoJogo = (texto: string) => texto.trim().startsWith("((");

// ---------- recados que não são ficção ----------

/** "é a sua vez", "a vez é sua", "o dado está com você", "role o dado"... */
const VEZ =
  /(?:\bé a (?:sua )?vez\b|\ba vez é (?:sua|de|do|da)\b|\bsua vez\b|\bé a vez d|\bvez de \p{Lu}|\bo dado (?:está|fica|é|segue) (?:com você|seu|sua|na sua mão|nas suas mãos)|\bo dado é (?:seu|dele|dela)\b|\bdados? (?:está|estão) na sua mão|\brole (?:o dado|os dados|para)\b|\bhora de rolar\b|\bé a sua vez de rolar\b)/iu;
/** fala de personagem (aspas): aí já é cena, não recado */
const FALA = /["“”«»]/;
const LIMITE_VEZ = 260;
const LIMITE_MECANICO = 700;
/** narração "de verdade" antes do recado, no mesmo turno, para ele ser redundante */
const NARRACAO_SUBSTANCIAL = 300;

/** Mensagem curta que só passa a vez ("É a sua vez, Samuel…", "O dado está com você…"), sem fala nova. */
export function ehPassagemDeVez(texto: string): boolean {
  const t = texto.trim();
  return t.length > 0 && t.length < LIMITE_VEZ && VEZ.test(t) && !FALA.test(t) && !t.includes("((");
}

const MECANICO_FORTE = /\bagora \d+\s*\/\s*\d+|\banotei no di[áa]rio\b|\banotei\b.*\bdi[áa]rio\b/iu;
const MECANICO_RECURSO =
  /\b(?:ganhou|ganha|ganhei|perdeu|perde|gastou|gasta|gastei|recuperou|recupera|sobe|subiu|desce|desceu)\s+(?:\d+|uma?|dois|duas)\s+(?:de\s+|ponto(?:s)? de\s+)?(?:manchas?|força de vontade|fome|vida|pv|xp|experiência|humanidade|saúde|dano)\b/iu;

/** Resumo fora da ficção, puramente mecânico ("ganhou 1 Mancha (agora 1/4)… anotei no diário que Vera está hostil"). */
export function ehResumoMecanico(texto: string): boolean {
  const t = texto.trim();
  if (!t || t.length >= LIMITE_MECANICO || FALA.test(t) || t.includes("((")) return false;
  return MECANICO_FORTE.test(t) || MECANICO_RECURSO.test(t);
}

/** Pedido de teste já rolado (ou cancelado): o "role o dado" que veio logo depois dele perdeu a função. */
function pedidoResolvido(m: Mensagem | undefined): boolean {
  if (!m || m.tipo !== "dado") return false;
  const d = (m.dados ?? {}) as { tipo?: string; status?: string };
  return d.tipo === "pedido_teste" && d.status !== "pendente";
}

/**
 * Quais mensagens do mestre saem da prosa do turno:
 *  - no FIM do turno (depois da última narração de verdade): passagens de vez e resumos mecânicos, desde que antes deles haja
 *    narração substancial (um "É a sua vez" sozinho continua, é a única coisa que o mestre disse);
 *  - logo depois de um pedido de teste já rolado: o "o dado está com você" que chamava para rolar.
 * Devolve os ids escondidos e, deles, os que são resumo mecânico (viram "nota do mestre").
 */
export function recadosDoTurno(itens: Mensagem[]): { escondidas: Set<number>; notas: Set<number> } {
  const escondidas = new Set<number>();
  const notas = new Set<number>();
  // chamada para rolar logo depois de um pedido de teste resolvido (pulando linhas de ficha, que viram chip)
  let anterior: Mensagem | undefined;
  for (const m of itens) {
    if (m.tipo === "mestre" && pedidoResolvido(anterior) && ehPassagemDeVez(m.texto)) escondidas.add(m.id);
    if (!ehMudanca(m)) anterior = m;
  }
  // fim do turno: anda de trás para a frente enquanto for recado (cartões que viram chip não contam)
  const cauda: Mensagem[] = [];
  for (let i = itens.length - 1; i >= 0; i--) {
    const m = itens[i];
    // o fim da noite também não conta: o recado antes dele continua sendo o fim do turno
    if (ehMudanca(m) || escondidas.has(m.id) || dadosFimSessao(m)) continue;
    if (m.tipo !== "mestre") break;
    if (!ehPassagemDeVez(m.texto) && !ehResumoMecanico(m.texto)) break;
    cauda.push(m);
  }
  if (cauda.length) {
    const fora = new Set(cauda.map((m) => m.id));
    const narrado = itens.filter((m) => m.tipo === "mestre" && !fora.has(m.id) && !escondidas.has(m.id)).reduce((s, m) => s + m.texto.trim().length, 0);
    if (narrado >= NARRACAO_SUBSTANCIAL)
      for (const m of cauda) {
        escondidas.add(m.id);
        if (ehResumoMecanico(m.texto)) notas.add(m.id);
      }
  }
  return { escondidas, notas };
}

// ---------- "o que mudou na cena" ----------

/** Um valor que mudou (Fome, Manchas, Força de Vontade, Vida): juntado dentro da cena (Fome 1 → 2 → 1 some). */
type Valor = { rot: string; de: number | null; para: number; max: number | null };

type Bruto =
  | { tipo: "valor"; quem: string; v: Valor; detalhe: string }
  | { tipo: "chip"; quem: string; grupo: GrupoChips["tipo"]; chip: Omit<Chip, "chave"> };

type EstadoPersonagem = { valores: Map<string, number>; condicoes: string[] | null };

const chaveValor = (rot: string) =>
  rot
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Recursos que pioram quando sobem (Fome, Manchas...). */
const PIORA_SUBINDO = /fome|mancha|dano|estresse|stress|perdi[cç][aã]o|agrava/i;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : []);

/** "Compulsão: Crueldade (−2 dados em ações...)" → "Compulsão: Crueldade" */
function curto(texto: string, max = 38): string {
  const t = texto.replace(/\s*\([^)]*\)\s*$/, "").trim() || texto.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function brutosDaFicha(m: Mensagem, d: Record<string, unknown>, estado: Map<string, EstadoPersonagem>): Bruto[] {
  const quem = typeof d.personagem === "string" && d.personagem ? d.personagem : (m.autor ?? "Alguém");
  let st = estado.get(quem);
  if (!st) estado.set(quem, (st = { valores: new Map(), condicoes: null }));
  const motivo = typeof d.motivo === "string" ? d.motivo.trim() : "";
  const detalhe = motivo || m.texto;
  const saida: Bruto[] = [];
  // ajuste à mão do jogador: "Fome 1 → 2"
  for (const mu of lista(d.mudancas)) {
    const r = /^(.+?)\s+(-?\d+)\s*(?:→|->)\s*(-?\d+)$/.exec(mu.trim());
    if (r) {
      const v = { rot: r[1], de: Number(r[2]), para: Number(r[3]), max: null };
      st.valores.set(chaveValor(v.rot), v.para);
      saida.push({ tipo: "valor", quem, v, detalhe: d.manual ? `Ajuste à mão de ${d.autor ?? quem}` : detalhe });
    } else saida.push({ tipo: "chip", quem, grupo: "personagem", chip: { icone: "✎", rotulo: curto(mu), detalhe: mu, tom: "neutro" } });
  }
  // vida
  const pv = num(d.pv);
  const pvAntes = num(d.pvAntes);
  if (pv !== null && pvAntes !== null && pv !== pvAntes && !lista(d.mudancas).length)
    saida.push({ tipo: "valor", quem, v: { rot: "Vida", de: pvAntes, para: pv, max: num(d.pvMax) }, detalhe });
  // recursos do sistema: "Força de Vontade 9/10", "Manchas 1/4"
  for (const r of lista(d.recursos)) {
    const x = /^(.+?)\s+(-?\d+)\s*\/\s*(\d+)$/.exec(r.trim());
    if (!x) {
      saida.push({ tipo: "chip", quem, grupo: "personagem", chip: { icone: "✎", rotulo: curto(r), detalhe: `${r} — ${detalhe}`, tom: "neutro" } });
      continue;
    }
    const k = chaveValor(x[1]);
    const antes = st.valores.get(k) ?? null;
    const para = Number(x[2]);
    st.valores.set(k, para);
    if (antes !== para) saida.push({ tipo: "valor", quem, v: { rot: x[1], de: antes, para, max: Number(x[3]) }, detalhe });
  }
  // itens
  for (const g of lista(d.ganhou)) saida.push({ tipo: "chip", quem, grupo: "personagem", chip: { icone: "+", rotulo: curto(g), detalhe: `Recebeu ${g}`, tom: "bom" } });
  for (const p of lista(d.perdeu))
    saida.push({ tipo: "chip", quem, grupo: "personagem", chip: { icone: "−", rotulo: curto(p), detalhe: `Perdeu ${p}`, tom: "ruim", riscado: true } });
  // condições: a mensagem traz a lista inteira; o que mudou sai da comparação com a anterior
  if (Array.isArray(d.condicoes)) {
    const atuais = lista(d.condicoes);
    const antes = st.condicoes;
    const norm = (c: string) => chaveValor(curto(c, 200));
    if (antes) {
      for (const c of atuais)
        if (!antes.some((a) => norm(a) === norm(c))) saida.push({ tipo: "chip", quem, grupo: "personagem", chip: { icone: "◆", rotulo: curto(c), detalhe: `${c} — ${detalhe}`, tom: "ruim" } });
      for (const c of antes)
        if (!atuais.some((a) => norm(a) === norm(c)))
          saida.push({ tipo: "chip", quem, grupo: "personagem", chip: { icone: "✓", rotulo: curto(c), detalhe: `Passou: ${c} — ${detalhe}`, tom: "bom", riscado: true } });
    } else
      for (const c of atuais) saida.push({ tipo: "chip", quem, grupo: "personagem", chip: { icone: "◆", rotulo: curto(c), detalhe: `${c} — ${detalhe}`, tom: "ruim" } });
    st.condicoes = atuais;
  }
  // nada mensurável: o motivo vira o chip ("Crueldade satisfeita")
  if (!saida.length && motivo) saida.push({ tipo: "chip", quem, grupo: "personagem", chip: { icone: "✎", rotulo: curto(motivo, 34), detalhe: motivo, tom: "neutro" } });
  return saida;
}

function brutosDe(m: Mensagem, estado: Map<string, EstadoPersonagem>): Bruto[] {
  const d = (m.dados ?? {}) as Record<string, unknown>;
  const quem = typeof d.personagem === "string" && d.personagem ? d.personagem : null;
  switch (d.tipo) {
    case "ficha":
      return brutosDaFicha(m, d, estado);
    case "xp": {
      const ganho = num(d.ganho);
      const subiu = num(d.subiuPara);
      const detalhe = [typeof d.motivo === "string" ? d.motivo : "", typeof d.resumo === "string" ? d.resumo : ""].filter(Boolean).join(" — ") || m.texto;
      const saida: Bruto[] = [];
      if (ganho !== null) saida.push({ tipo: "chip", quem: quem ?? "Grupo", grupo: "personagem", chip: { icone: "✦", rotulo: `+${ganho} XP`, detalhe, tom: "bom" } });
      if (subiu !== null) saida.push({ tipo: "chip", quem: quem ?? "Grupo", grupo: "personagem", chip: { icone: "▲", rotulo: `Nível ${subiu}!`, detalhe, tom: "bom" } });
      return saida;
    }
    case "diario": {
      const e = (d.entrada ?? {}) as { titulo?: string; texto?: string; tipo?: string; status?: string };
      const rot = typeof d.rotulo === "string" ? d.rotulo : "Diário";
      const titulo = e.titulo ?? (typeof d.resumo === "string" ? d.resumo : m.texto);
      const tom: TomChip = /conclu/i.test(rot) ? "bom" : /fracass|falh/i.test(rot) ? "ruim" : "neutro";
      const rotulo = e.tipo === "npc" && e.status ? `${titulo}: ${e.status}` : `${rot}: ${titulo}`;
      return [{ tipo: "chip", quem: "Diário", grupo: "mundo", chip: { icone: "❡", rotulo: curto(rotulo, 48), detalhe: e.texto ? `${rotulo} — ${e.texto}` : rotulo, tom } }];
    }
    case "descanso":
    case "curto":
    case "longo": {
      const t = String(d.descanso ?? d.tipoDescanso ?? d.tipo ?? "");
      const rotulo = t === "curto" ? "Descanso curto" : t === "longo" ? "Descanso longo" : "Descansou";
      return [{ tipo: "chip", quem: quem ?? "Grupo", grupo: "personagem", chip: { icone: "☾", rotulo, detalhe: String(d.resumo ?? m.texto), tom: "bom" } }];
    }
    case "reputacao": {
      const v = num(d.variacao) ?? 0;
      const eixo = String(d.eixo ?? "Reputação");
      const rotulo = `${eixo.charAt(0).toUpperCase()}${eixo.slice(1)} ${v >= 0 ? `+${v}` : `−${Math.abs(v)}`}`;
      return [{ tipo: "chip", quem: quem ?? "Grupo", grupo: "personagem", chip: { icone: v >= 0 ? "▲" : "▼", rotulo, detalhe: String(d.motivo ?? m.texto), tom: v >= 0 ? "bom" : "ruim" } }];
    }
  }
  return [];
}

/**
 * Rastro das mudanças da campanha inteira, na ordem: o que cada mensagem de ficha/diário/XP mudou. Precisa da história toda
 * porque a ficha manda o valor novo ("Manchas 2/4"), e o "+1 Mancha" sai da comparação com a anterior.
 */
export type Rastro = Map<number, Bruto[]>;

export function rastrearMudancas(mensagens: Mensagem[]): Rastro {
  const estado = new Map<string, EstadoPersonagem>();
  const rastro: Rastro = new Map();
  for (const m of mensagens) if (ehMudanca(m)) rastro.set(m.id, brutosDe(m, estado));
  return rastro;
}

const sinal = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

function chipDoValor(v: Valor, detalhes: string[], chave: string): Chip | null {
  const piora = PIORA_SUBINDO.test(v.rot);
  const tom = (d: number): TomChip => (d === 0 ? "neutro" : (d > 0) !== piora ? "bom" : "ruim");
  const det = [...new Set(detalhes)].join(" · ");
  const icone = /fome|sangue/i.test(v.rot) ? "🩸" : /mancha/i.test(v.rot) ? "◆" : /vida|sa[uú]de|pv/i.test(v.rot) ? "♥" : /vontade/i.test(v.rot) ? "✧" : "✎";
  // sem o valor anterior: só o novo ("Força de Vontade 9/10")
  if (v.de === null) return { chave, icone, rotulo: `${v.rot} ${v.para}${v.max !== null ? `/${v.max}` : ""}`, detalhe: det, tom: "neutro" };
  const delta = v.para - v.de;
  if (delta === 0) return null;
  // contáveis no singular: "+1 Mancha", "+2 Manchas"
  if (/^manchas?$/i.test(v.rot.trim()))
    return { chave, icone, rotulo: `${sinal(delta)} ${Math.abs(delta) === 1 ? "Mancha" : "Manchas"}`, detalhe: `${det}${v.max !== null ? ` (agora ${v.para}/${v.max})` : ""}`, tom: tom(delta) };
  // com máximo: "Força de Vontade −1" (o valor fica no detalhe); sem máximo: "Fome 1 → 2"
  if (v.max !== null) return { chave, icone, rotulo: `${v.rot} ${sinal(delta)}`, detalhe: `${det} (agora ${v.para}/${v.max})`, tom: tom(delta) };
  return { chave, icone, rotulo: `${v.rot} ${v.de} → ${v.para}`, detalhe: det, tom: tom(delta) };
}

/** Junta os brutos da cena em grupos de chips (personagens na ordem em que aparecem, depois o diário, depois o mestre). */
function agrupar(brutos: Bruto[], notas: Mensagem[]): GrupoChips[] {
  const grupos = new Map<string, GrupoChips>();
  const grupo = (quem: string, tipo: GrupoChips["tipo"]) => {
    const k = `${tipo}:${quem}`;
    let g = grupos.get(k);
    if (!g) grupos.set(k, (g = { quem, tipo, chips: [] }));
    return g;
  };
  // valores do mesmo personagem juntam numa série (primeiro "de", último "para")
  const series = new Map<string, { v: Valor; detalhes: string[]; quem: string; pos: number }>();
  const ordem: (Chip | string)[] = [];
  const donos = new Map<Chip | string, GrupoChips>();
  for (const b of brutos) {
    if (b.tipo === "valor") {
      const k = `${b.quem}:${chaveValor(b.v.rot)}`;
      const s = series.get(k);
      if (s) {
        s.v = { ...s.v, para: b.v.para, max: b.v.max ?? s.v.max, de: s.v.de ?? b.v.de };
        s.detalhes.push(b.detalhe);
      } else {
        series.set(k, { v: { ...b.v }, detalhes: [b.detalhe], quem: b.quem, pos: ordem.length });
        ordem.push(k);
        donos.set(k, grupo(b.quem, "personagem"));
      }
    } else {
      const c = { ...b.chip, chave: `c${ordem.length}` };
      ordem.push(c);
      donos.set(c, grupo(b.quem, b.grupo));
    }
  }
  for (const item of ordem) {
    const g = donos.get(item)!;
    if (typeof item === "string") {
      const s = series.get(item)!;
      const c = chipDoValor(s.v, s.detalhes, `v${s.pos}`);
      if (c) g.chips.push(c);
    } else g.chips.push(item);
  }
  for (const n of notas)
    grupo("Mestre", "mestre").chips.push({ chave: `n${n.id}`, icone: "📜", rotulo: "Nota do mestre", detalhe: n.texto.trim().replace(/\s*\n+\s*/g, " "), tom: "neutro" });
  const peso = { personagem: 0, mundo: 1, mestre: 2 };
  return [...grupos.values()].filter((g) => g.chips.length).sort((a, b) => peso[a.tipo] - peso[b.tipo]);
}

/** A cena pronta para desenhar: prosa contínua com os cartões no lugar, os chips do fim e o que saiu da prosa. */
export function montarCena(turno: Turno, rastro: Rastro): Cena {
  const { escondidas, notas } = recadosDoTurno(turno.itens);
  const pecas: Peca[] = [];
  const brutos: Bruto[] = [];
  const fora: Mensagem[] = [];
  for (const m of turno.itens) {
    if (ehMudanca(m)) {
      brutos.push(...(rastro.get(m.id) ?? []));
      continue;
    }
    if (m.tipo === "mestre") {
      if (escondidas.has(m.id)) {
        fora.push(m);
        continue;
      }
      const ps = paragrafosDaNarracao(m.texto, m.id);
      if (!ps.length) continue;
      const ultima = pecas.at(-1);
      if (ultima?.tipo === "prosa") {
        ultima.ids.push(m.id);
        ultima.paragrafos.push(...ps);
      } else pecas.push({ tipo: "prosa", chave: `p${m.id}`, ids: [m.id], paragrafos: ps });
      continue;
    }
    pecas.push({ tipo: "item", m });
  }
  // o último parágrafo da cena só passando a vez ("É a sua vez, Samuel: Vera está à porta"), colado no fim de uma narração longa
  const ultima = pecas.findLast((p) => p.tipo === "prosa" || !dadosFimSessao(p.m));
  if (ultima?.tipo === "prosa" && ultima.paragrafos.length > 1) {
    const fim = ultima.paragrafos[ultima.paragrafos.length - 1];
    const antes = ultima.paragrafos.slice(0, -1).reduce((n, p) => n + (p.aparte ? 0 : p.texto.length), 0);
    if (!fim.aparte && antes >= NARRACAO_SUBSTANCIAL && ehPassagemDeVez(fim.texto)) ultima.paragrafos.pop();
  }
  return { pecas, mudancas: agrupar(brutos, fora.filter((m) => notas.has(m.id))), escondidas: fora };
}

/** O texto da prosa para ouvir (sem os apartes). */
export function textoParaOuvir(paragrafos: Paragrafo[]): string {
  return paragrafos
    .filter((p) => !p.aparte)
    .map((p) => p.texto)
    .join("\n\n");
}

/** Fim de sessão ("Fim da noite 3"): o número da noite, se veio. */
export function dadosFimSessao(m: Mensagem): { sessao: number | null; data: string | null } | null {
  const d = (m.dados ?? {}) as { tipo?: string; sessao?: unknown; data?: unknown };
  if (m.tipo !== "dado" || d.tipo !== "fim_sessao") return null;
  return { sessao: num(d.sessao), data: typeof d.data === "string" ? d.data : null };
}

/** As peças da cena e o fim da noite que a fecha (vem depois dos chips de "o que mudou"). */
export function separarFecho(pecas: Peca[]): { corpo: Peca[]; fecho: Peca[] } {
  let k = pecas.length;
  while (k > 0) {
    const p = pecas[k - 1];
    if (p.tipo !== "item" || !dadosFimSessao(p.m)) break;
    k--;
  }
  return { corpo: pecas.slice(0, k), fecho: pecas.slice(k) };
}
