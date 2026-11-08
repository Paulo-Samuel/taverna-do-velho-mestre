import "server-only";
import { obterCampanha, salvarCena, type Personagem } from "../../db";
import { descreverRolagem, rolar } from "../../dados";
import { normalizar, sinal } from "../../sistemas/comum";
import type { Cena, Combatente, Sistema } from "../../sistemas/tipos";
import { publicar } from "../../tempo-real";
import { persistirPersonagem, registrarDado, type ContextoFerramentas } from "./contexto";
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

/**
 * Turnos que terminaram e ainda não tiveram o "fim do turno" aplicado (PF2e: amedrontado cai 1). passarVez só mexe no objeto do
 * combate; quem tem o contexto (sincronizarPersonagens, chamado logo depois por atualizar_cena) aplica e grava.
 */
const fimDeTurnoPendente = new WeakMap<Combate, string[]>();

/** Aplica o fim do turno de quem acabou de agir: na ficha (personagem) ou na linha do rastreador (NPC). */
function aplicarFimDoTurno(ctx: ContextoFerramentas, combate: Combate) {
  const pendentes = fimDeTurnoPendente.get(combate);
  if (!pendentes?.length) return;
  fimDeTurnoPendente.delete(combate);
  const fimDoTurno = ctx.sistema.fimDoTurno;
  if (!fimDoTurno) return;
  for (const nome of pendentes) {
    const c = combate.ordem.find((x) => x.nome === nome);
    if (!c) continue;
    const p = ehPersonagem(ctx, c) ? ctx.personagens.find((x) => x.ficha.nome === c.nome) : undefined;
    const r = fimDoTurno(p ? p.ficha.condicoes : (c.condicoes ?? []));
    if (!r.mudancas.length) continue;
    if (p) {
      p.ficha.condicoes = r.condicoes;
      persistirPersonagem(ctx, p);
      const motivo = `fim do turno: ${r.mudancas.join(", ")}`;
      registrarDado(
        ctx,
        `${p.ficha.nome}: ${motivo}`,
        { tipo: "ficha", personagem: p.ficha.nome, motivo, pvAntes: p.ficha.pv, pv: p.ficha.pv, pvMax: p.ficha.pvMax, dinheiro: p.ficha.dinheiro, recursos: [], ganhou: [], perdeu: [], condicoes: p.ficha.condicoes },
        p.id,
      );
    } else c.condicoes = r.condicoes;
  }
}

/** Contadores de ações do sistema (PF2e: 3 ações) para quem ainda não tem. */
function iniciarContadores(sistema: Sistema, combate: Combate) {
  if (!sistema.combate?.acoes) return;
  for (const c of combate.ordem) {
    c.acoes ??= 0;
    c.ataques ??= 0;
  }
}

/**
 * Copia PV, defesa e condições das fichas para as linhas dos personagens no rastreador, aplica o fim do turno pendente e
 * calcula a defesa com as condições de todo mundo (PF2e: amedrontado, desprevenido...).
 */
export function sincronizarPersonagens(ctx: ContextoFerramentas, combate: Combate) {
  aplicarFimDoTurno(ctx, combate);
  iniciarContadores(ctx.sistema, combate);
  for (const c of combate.ordem) {
    const p = ehPersonagem(ctx, c) ? ctx.personagens.find((x) => x.ficha.nome === c.nome) : undefined;
    if (p) {
      c.pv = p.ficha.pv;
      c.pvMax = p.ficha.pvMax;
      c.defesa = p.ficha.defesa || null;
      c.condicoes = [...p.ficha.condicoes];
    }
    const efetiva = ctx.sistema.defesaComCondicoes && c.defesa ? ctx.sistema.defesaComCondicoes(c.defesa, c.condicoes ?? []) : null;
    if (efetiva && efetiva.valor !== c.defesa) {
      c.defesaEfetiva = efetiva.valor;
      c.defesaNota = efetiva.detalhe;
    } else {
      delete c.defesaEfetiva;
      delete c.defesaNota;
    }
  }
}

/** Ataques que `nome` já fez no turno dele (0 fora do turno, sem combate ou em sistema que não conta ações). */
export function ataquesNoTurno(ctx: ContextoFerramentas, nome: string): number {
  if (!ctx.sistema.combate?.acoes) return 0;
  const combate = cenaAtual(ctx).combate;
  if (!combate?.ativo) return 0;
  const c = combate.ordem[combate.vez];
  return c && normalizar(c.nome) === normalizar(nome) ? (c.ataques ?? 0) : 0;
}

/**
 * Conta um ataque de `nome` no rastreador (o 1º, 2º, 3º... do turno) e 1 ação gasta. Só vale na vez dele: ataque fora da vez
 * (reação) não entra na conta. Devolve true quando contou.
 */
export function contarAtaque(ctx: ContextoFerramentas, nome: string, numero: number): boolean {
  const acoes = ctx.sistema.combate?.acoes;
  if (!acoes) return false;
  const cena = cenaAtual(ctx);
  const combate = cena.combate;
  if (!combate?.ativo) return false;
  const c = combate.ordem[combate.vez];
  if (!c || normalizar(c.nome) !== normalizar(nome)) return false;
  // o número do ataque manda: "Ataque 1" forçado pelo mestre reinicia a conta (o próximo sai como 2º)
  c.ataques = Math.max(0, numero);
  c.acoes = Math.min(acoes, (c.acoes ?? 0) + 1);
  gravarCena(ctx, cena);
  return true;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const semBonus = ({ bonus, detalhe, ...c }: Rolado): Combatente => c;

/** Inimigo caído não age; personagem caído age (testes contra a morte, ou o equivalente do sistema). */
export const podeAgir = (c: Combatente) => c.aliado || c.pv === null || c.pv === undefined || c.pv > 0;

/**
 * Passa a vez para o próximo que pode agir. Quem termina o turno fica anotado para o fim do turno (aplicado em
 * sincronizarPersonagens) e os contadores de ações/ataques (quando o sistema conta) zeram para quem sai e para quem entra.
 */
export function passarVez(combate: Combate) {
  const n = combate.ordem.length;
  if (!n) return;
  const saindo = combate.ordem[combate.vez];
  if (saindo) {
    fimDeTurnoPendente.set(combate, [...(fimDeTurnoPendente.get(combate) ?? []), saindo.nome]);
    if (saindo.acoes !== undefined) saindo.acoes = 0;
    if (saindo.ataques !== undefined) saindo.ataques = 0;
  }
  avancarVez(combate);
  const entrando = combate.ordem[combate.vez];
  if (entrando) {
    if (entrando.acoes !== undefined) entrando.acoes = 0;
    if (entrando.ataques !== undefined) entrando.ataques = 0;
  }
}

/**
 * Dá a vez direto para a posição `i` (o mestre escolheu quem age). Se a vez muda de mão, é um fim de turno como o de passarVez:
 * quem sai fica anotado para o fim do turno e os contadores de ações/ataques zeram para quem sai e para quem entra.
 */
export function darVez(combate: Combate, i: number) {
  if (i < 0 || i >= combate.ordem.length || i === combate.vez) return;
  const saindo = combate.ordem[combate.vez];
  if (saindo) {
    fimDeTurnoPendente.set(combate, [...(fimDeTurnoPendente.get(combate) ?? []), saindo.nome]);
    if (saindo.acoes !== undefined) saindo.acoes = 0;
    if (saindo.ataques !== undefined) saindo.ataques = 0;
  }
  combate.vez = i;
  const entrando = combate.ordem[i];
  if (entrando.acoes !== undefined) entrando.acoes = 0;
  if (entrando.ataques !== undefined) entrando.ataques = 0;
}

function avancarVez(combate: Combate) {
  const n = combate.ordem.length;
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
  iniciarContadores(ctx.sistema, combate);
  // ninguém terminou turno ainda: só pula quem não pode agir (sem fim de turno)
  if (!podeAgir(combate.ordem[0] ?? { nome: "", iniciativa: null })) avancarVez(combate);
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
    iniciarContadores(ctx.sistema, combate);
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
