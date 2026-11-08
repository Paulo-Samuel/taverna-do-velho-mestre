import "server-only";
import { obterCampanha, salvarCena, type Personagem } from "../../db";
import { descreverRolagem, rolar } from "../../dados";
import { normalizar, sinal } from "../../sistemas/comum";
import type { Cena, Combatente, Sistema } from "../../sistemas/tipos";
import { publicar } from "../../tempo-real";
import { registrarDado, type ContextoFerramentas } from "./contexto";
import type { EntradaCombate, EntradaCombatente } from "./esquemas";

// Motor do rastreador de combate (a parte `combate` de atualizar_cena): iniciativa, ordem, vez, dano e condições dos NPCs.
// Os personagens dos jogadores só espelham a ficha (o dano deles vai por alterar_ficha).

export type Combate = NonNullable<Cena["combate"]>;

/** Cena mais recente (outro aparelho ou ferramenta pode ter mexido depois do início do turno). */
export function cenaAtual(ctx: ContextoFerramentas): Cena {
  return structuredClone(obterCampanha(ctx.campanha.id)?.cena ?? ctx.campanha.cena ?? {});
}

export function gravarCena(ctx: ContextoFerramentas, cena: Cena) {
  salvarCena(ctx.campanha.id, cena);
  ctx.campanha.cena = cena;
  publicar(ctx.campanha.id, { e: "cena", cena });
}

const ehPersonagem = (ctx: ContextoFerramentas, c: Combatente) => c.aliado && ctx.personagens.some((p) => p.ficha.nome === c.nome);

/** Copia PV, defesa e condições das fichas para as linhas dos personagens no rastreador. */
export function sincronizarPersonagens(ctx: ContextoFerramentas, combate: Combate) {
  for (const c of combate.ordem) {
    const p = ehPersonagem(ctx, c) ? ctx.personagens.find((x) => x.ficha.nome === c.nome) : undefined;
    if (!p) continue;
    c.pv = p.ficha.pv;
    c.pvMax = p.ficha.pvMax;
    c.defesa = p.ficha.defesa || null;
    c.condicoes = [...p.ficha.condicoes];
  }
}

/** Depois de mexer em ficha durante um combate, o rastreador acompanha. */
export function sincronizarCombate(ctx: ContextoFerramentas) {
  const cena = cenaAtual(ctx);
  if (!cena.combate?.ativo) return;
  sincronizarPersonagens(ctx, cena.combate);
  gravarCena(ctx, cena);
}

export function acharCombatente(ordem: Combatente[], nome: string): number {
  const alvo = normalizar(nome);
  const exato = ordem.findIndex((c) => normalizar(c.nome) === alvo);
  if (exato >= 0) return exato;
  const comeco = ordem.findIndex((c) => normalizar(c.nome).startsWith(alvo));
  return comeco >= 0 ? comeco : ordem.findIndex((c) => alvo.includes(normalizar(c.nome)));
}

/** Dado de iniciativa para quem não tem ficha: o que o sistema declara no contrato, ou o da mecânica principal. */
export function dadoIniciativa(sistema: Sistema): string {
  if (sistema.combate?.iniciativaNpc) return sistema.combate.iniciativaNpc;
  const principal = sistema.dadoPrincipal.toLowerCase();
  if (principal.includes("df")) return "4dF";
  if (principal.includes("2d6")) return "2d6";
  if (principal.includes("100")) return "1d100";
  return "1d20";
}

type Rolado = Combatente & { bonus: number; detalhe: string };

function rolarInimigo(ctx: ContextoFerramentas, e: EntradaCombatente, nome: string): Rolado {
  const pvMax = e.pvMax ?? e.pv ?? null;
  const pv = e.pv ?? pvMax;
  const bonus = e.bonusIniciativa ?? 0;
  let iniciativa: number;
  let detalhe: string;
  if (e.iniciativa !== undefined && e.iniciativa !== null) {
    iniciativa = e.iniciativa;
    detalhe = "fixa";
  } else {
    const r = rolar(`${dadoIniciativa(ctx.sistema)}${bonus ? sinal(bonus) : ""}`);
    iniciativa = r.total;
    detalhe = descreverRolagem(r);
  }
  return {
    nome,
    iniciativa,
    pv,
    pvMax,
    defesa: e.defesa ?? null,
    condicoes: e.condicoes ?? (pv === 0 ? ["caído"] : []),
    aliado: Boolean(e.aliado),
    bonus,
    detalhe,
  };
}

function rolarPersonagem(ctx: ContextoFerramentas, p: Personagem): Rolado {
  const f = p.ficha;
  let iniciativa: number;
  let bonus = 0;
  let detalhe: string;
  try {
    const r = ctx.sistema.resolverTeste(f, { teste: "Iniciativa", motivo: "Iniciativa" });
    iniciativa = r.total;
    bonus = r.bonus;
    detalhe = `${r.expressao} = ${r.total}`;
  } catch {
    // sistema sem teste de iniciativa: rola o dado da mecânica, sem bônus
    const r = rolar(dadoIniciativa(ctx.sistema));
    iniciativa = r.total;
    detalhe = descreverRolagem(r);
  }
  return { nome: f.nome, iniciativa, pv: f.pv, pvMax: f.pvMax, defesa: f.defesa || null, condicoes: [...f.condicoes], aliado: true, bonus, detalhe };
}

/** Nome sem repetir: "Goblin", "Goblin 2", "Goblin 3"... */
function nomeLivre(usados: string[], nome: string): string {
  const ocupado = (n: string) => usados.some((u) => normalizar(u) === normalizar(n));
  if (!ocupado(nome)) return nome;
  let i = 2;
  while (ocupado(`${nome} ${i}`)) i++;
  return `${nome} ${i}`;
}

/** Maior iniciativa primeiro; empate decide o bônus e, depois, o grupo age antes. */
function ordenar(lista: Rolado[]): Rolado[] {
  return [...lista].sort((a, b) => (b.iniciativa ?? 0) - (a.iniciativa ?? 0) || b.bonus - a.bonus || Number(Boolean(b.aliado)) - Number(Boolean(a.aliado)));
}

const semBonus = ({ nome, iniciativa, pv, pvMax, defesa, condicoes, aliado }: Rolado): Combatente => ({ nome, iniciativa, pv, pvMax, defesa, condicoes, aliado });

/** Inimigo caído não age; personagem caído age (testes contra a morte, ou o equivalente do sistema). */
export const podeAgir = (c: Combatente) => c.aliado || c.pv === null || c.pv === undefined || c.pv > 0;

export function passarVez(combate: Combate) {
  const n = combate.ordem.length;
  if (!n) return;
  for (let passo = 0; passo < n; passo++) {
    combate.vez += 1;
    if (combate.vez >= n) {
      combate.vez = 0;
      combate.rodada += 1;
    }
    if (podeAgir(combate.ordem[combate.vez])) return;
  }
}

function marcarCaido(c: Combatente) {
  const condicoes = (c.condicoes ?? []).filter((x) => normalizar(x) !== "caido");
  c.condicoes = c.pv === 0 ? [...condicoes, "caído"] : condicoes;
}

export function iniciarCombate(ctx: ContextoFerramentas, cena: Cena, inimigos: EntradaCombatente[]): Combate {
  const rolados: Rolado[] = ctx.personagens.map((p) => rolarPersonagem(ctx, p));
  for (const e of inimigos) rolados.push(rolarInimigo(ctx, e, nomeLivre(rolados.map((r) => r.nome), e.nome.trim())));
  const ordem = ordenar(rolados);
  const combate: Combate = { ativo: true, rodada: 1, vez: 0, ordem: ordem.map(semBonus) };
  if (!podeAgir(combate.ordem[0] ?? { nome: "", iniciativa: null })) passarVez(combate);
  cena.combate = combate;
  registrarDado(ctx, `Iniciativa: ${ordem.map((r) => `${r.nome} (${r.iniciativa})`).join(", ")}`, {
    tipo: "iniciativa",
    rodada: 1,
    ordem: ordem.map((r) => ({ nome: r.nome, iniciativa: r.iniciativa, aliado: r.aliado, detalhe: r.detalhe })),
    resumo: `Combate! Começa ${combate.ordem[combate.vez]?.nome ?? "ninguém"}.`,
  });
  return combate;
}

export function atualizarCombate(ctx: ContextoFerramentas, combate: Combate, e: EntradaCombate, avisos: string[]) {
  const atual = combate.ordem[combate.vez]?.nome;
  const fichaDe = (nome: string) => ctx.personagens.find((p) => normalizar(p.ficha.nome) === normalizar(nome));

  // inimigos novos entram na ordem pela iniciativa; os existentes são atualizados pelo nome
  const novos: Rolado[] = [];
  for (const ent of e.inimigos ?? []) {
    const i = acharCombatente(combate.ordem, ent.nome);
    if (i >= 0 && !ehPersonagem(ctx, combate.ordem[i])) {
      const c = combate.ordem[i];
      if (ent.pvMax !== undefined) c.pvMax = ent.pvMax;
      if (ent.pv !== undefined) c.pv = ent.pv;
      if (ent.defesa !== undefined) c.defesa = ent.defesa;
      if (ent.condicoes) c.condicoes = ent.condicoes;
      if (ent.aliado !== undefined) c.aliado = ent.aliado;
      if (ent.iniciativa !== undefined && ent.iniciativa !== null) c.iniciativa = ent.iniciativa;
      marcarCaido(c);
    } else if (i >= 0) {
      avisos.push(`${ent.nome} é personagem de jogador: use alterar_ficha.`);
    } else {
      novos.push(rolarInimigo(ctx, ent, nomeLivre([...combate.ordem, ...novos].map((c) => c.nome), ent.nome.trim())));
    }
  }
  if (novos.length) {
    const comBonus = combate.ordem.map((c) => ({ ...c, bonus: 0, detalhe: "" }));
    combate.ordem = ordenar([...comBonus, ...novos]).map(semBonus);
    registrarDado(ctx, `Reforços na iniciativa: ${novos.map((r) => `${r.nome} ${r.iniciativa}`).join(", ")}`, {
      tipo: "iniciativa",
      rodada: combate.rodada,
      ordem: novos.map((r) => ({ nome: r.nome, iniciativa: r.iniciativa, aliado: r.aliado, detalhe: r.detalhe })),
      resumo: `${novos.length === 1 ? "Entra" : "Entram"} no combate: ${novos.map((r) => r.nome).join(", ")}.`,
    });
  }

  for (const { nome, pv } of e.dano ?? []) {
    const i = acharCombatente(combate.ordem, nome);
    if (i < 0) {
      avisos.push(`"${nome}" não está no combate.`);
      continue;
    }
    const c = combate.ordem[i];
    if (ehPersonagem(ctx, c) || fichaDe(c.nome)) {
      avisos.push(`${c.nome} é personagem de jogador: o dano dele vai por alterar_ficha.`);
      continue;
    }
    if (c.pv === null || c.pv === undefined) {
      c.pv = Math.max(0, (c.pvMax ?? 0) - pv);
    } else {
      c.pv = Math.max(0, c.pv - pv);
      if (c.pvMax !== null && c.pvMax !== undefined) c.pv = Math.min(c.pv, c.pvMax);
    }
    marcarCaido(c);
  }

  for (const mud of e.condicoes ?? []) {
    const i = acharCombatente(combate.ordem, mud.nome);
    if (i < 0) {
      avisos.push(`"${mud.nome}" não está no combate.`);
      continue;
    }
    const c = combate.ordem[i];
    if (ehPersonagem(ctx, c)) {
      avisos.push(`${c.nome} é personagem de jogador: condições dele vão por alterar_ficha.`);
      continue;
    }
    const remover = (mud.remover ?? []).map(normalizar);
    const lista = (c.condicoes ?? []).filter((x) => !remover.includes(normalizar(x)));
    for (const nova of mud.adicionar ?? []) if (!lista.some((x) => normalizar(x) === normalizar(nova))) lista.push(nova);
    c.condicoes = lista;
  }

  for (const nome of e.remover ?? []) {
    const i = acharCombatente(combate.ordem, nome);
    if (i < 0) avisos.push(`"${nome}" não está no combate.`);
    else combate.ordem.splice(i, 1);
  }

  // a vez continua com quem estava agindo, mesmo que a ordem tenha mudado
  const j = atual ? combate.ordem.findIndex((c) => c.nome === atual) : -1;
  combate.vez = j >= 0 ? j : Math.min(combate.vez, Math.max(0, combate.ordem.length - 1));
}
