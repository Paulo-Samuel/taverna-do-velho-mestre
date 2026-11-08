import "server-only";
import { testesPendentes, type Personagem } from "../../db";
import { pausaDecisao, PRAZO_DECISAO_MS, PRAZO_DISCRETO_MS, type DecisaoDoTeste } from "../../constantes";
import { descreverRolagem, rolar } from "../../dados";
import type { PedidoTeste, ResultadoTeste } from "../../sistemas/tipos";
import type { DefFerramenta } from "../tipos";
import { ataquesNoTurno, contarAtaque, sincronizarCombate } from "./combate";
import {
  acharPersonagem,
  cobrarNarracao,
  extensoesDe,
  persistirPersonagem,
  registrarDado,
  type CamposComuns,
  type ContextoFerramentas,
  type Executor,
} from "./contexto";
import { ENTRADAS } from "./esquemas";

// Testes: o servidor rola na hora (teste) ou o jogador rola na tela (pedir_teste); rolar_dados para tudo o que não é teste
// de personagem. Campos e notas a mais vêm das extensões do sistema (ex.: custo de Despertar do Vampiro).

/** Campos e nota que as extensões do sistema acrescentam a teste/pedir_teste. */
function extrasDeTeste(ctx: ContextoFerramentas) {
  const ext = extensoesDe(ctx.sistema);
  const d20 = ctx.sistema.extensoesMestre?.includes("oposicao") ?? false;
  return {
    campos: Object.assign({}, d20 ? CAMPOS_OPOSICAO_D20 : {}, ...ext.map((e) => e.camposTeste ?? {})) as Record<string, unknown>,
    nota: (d20 ? " Disputa com NPC (agarrar, empurrar, enganar): oposicao_nome + oposicao_bonus, sem alvo; o servidor rola o d20 do NPC." : "") + ext.map((e) => e.notaTeste ?? "").join(""),
  };
}

/** Teste oposto nos sistemas de d20 (D&D 5e, PF2e): o servidor rola 1d20 + bônus do NPC e esse total vira a CD. */
const CAMPOS_OPOSICAO_D20 = {
  oposicao_nome: { type: "string", description: "Teste oposto: quem resiste (NPC), mostrado no cartão." },
  oposicao_bonus: { type: "integer", description: "Teste oposto: bônus do NPC no d20. O servidor rola 1d20 + bônus e usa como CD; omita alvo." },
};

/**
 * O esquema zod aceita oposicao_parada/oposicao_bonus em qualquer sistema; aqui só passa o que o sistema rola de verdade
 * (Vampiro: parada; D&D 5e e PF2e: bônus). O resto vira erro claro, em vez de sumir com o alvo sem aviso.
 */
function conferirOposicao(ctx: ContextoFerramentas, e: { oposicao_parada?: number; oposicao_bonus?: number }): void {
  if (e.oposicao_parada === undefined && e.oposicao_bonus === undefined) return;
  const campos = extrasDeTeste(ctx).campos;
  const parada = "oposicao_parada" in campos;
  const bonus = "oposicao_bonus" in campos;
  const comoFaz = parada ? "use oposicao_parada (dados do NPC)" : bonus ? "use oposicao_bonus (bônus do NPC no d20)" : "este sistema não tem teste oposto: informe o alvo (dificuldade)";
  if ((e.oposicao_parada !== undefined && !parada) || (e.oposicao_bonus !== undefined && !bonus)) {
    throw new Error(`Oposição no formato errado para ${ctx.sistema.nome}: ${comoFaz}.`);
  }
}

/** Opções do teste oposto (vão em opcoes.oposicao: o pedido pendente as guarda e o clique do jogador as lê de volta). */
function oposicaoDaEntrada(e: { oposicao_nome?: string; oposicao_parada?: number; oposicao_bonus?: number }): PedidoTeste["oposicao"] | undefined {
  if (e.oposicao_parada === undefined && e.oposicao_bonus === undefined) return undefined;
  return {
    nome: e.oposicao_nome?.trim() || "a oposição",
    ...(e.oposicao_parada !== undefined ? { parada: e.oposicao_parada } : {}),
    ...(e.oposicao_bonus !== undefined ? { bonus: e.oposicao_bonus } : {}),
  };
}

export function defTeste(ctx: ContextoFerramentas, campos: CamposComuns): DefFerramenta {
  const extra = extrasDeTeste(ctx);
  return {
    name: "teste",
    description: `Rola um teste de um personagem do jogador pelas regras de ${ctx.sistema.nomeCurto}. Use sempre que o resultado de uma ação for incerto. O servidor aplica os modificadores da ficha e devolve o grau de sucesso. Testes comuns: ${ctx.sistema.testesSugeridos.join(", ")}. Não invente o resultado: espere o retorno e narre a partir dele.${extra.nota}`,
    input_schema: {
      type: "object",
      properties: {
        personagem: campos.personagem,
        teste: { type: "string", description: "Perícia, atributo, salvamento/resistência, 'Ataque', 'Magia', 'Iniciativa'..." },
        alvo: { type: "integer", description: "CD/CA/dificuldade/oposição. Omita em sistemas de rolar abaixo do valor (d100) ou quando não houver." },
        modo: { type: "string", enum: ["normal", "vantagem", "desvantagem"], description: "Vantagem/desvantagem (ou bônus/penalidade equivalente do sistema)." },
        modificador: { type: "integer", description: "Bônus ou penalidade circunstancial." },
        motivo: { type: "string", description: "Frase curta do que está sendo tentado, mostrada aos jogadores." },
        ...extra.campos,
      },
      required: ["teste", "motivo"],
      additionalProperties: false,
    },
  };
}

export function defPedirTeste(ctx: ContextoFerramentas, campos: CamposComuns): DefFerramenta {
  const extra = extrasDeTeste(ctx);
  // só quem tem teste oposto (Vampiro, D&D 5e, PF2e) pode omitir o alvo; os outros sistemas seguem com a dificuldade obrigatória
  const oposto = "oposicao_parada" in extra.campos || "oposicao_bonus" in extra.campos;
  return {
    name: "pedir_teste",
    description: `Pede um teste a um personagem do jogador (${ctx.sistema.nomeCurto}). Quem rola é o JOGADOR, clicando no dado na tela; depois você recebe o resultado como nova mensagem e continua. Use só quando o resultado for incerto e importar. Narre ANTES de pedir, terminando no suspense, sem contar o resultado; depois de pedir não escreva mais nada (no máximo chame sugerir_acoes). No máximo um teste por personagem por turno. Testes comuns: ${ctx.sistema.testesSugeridos.join(", ")}.${extra.nota}`,
    input_schema: {
      type: "object",
      properties: {
        personagem: campos.personagem,
        teste: { type: "string", description: "Perícia ou tipo de teste." },
        alvo: { type: "integer", description: oposto ? "Dificuldade (CD). Omita só em teste oposto (oposicao_*)." : "Dificuldade (CD)." },
        modo: { type: "string", enum: ["normal", "vantagem", "desvantagem"], description: "Vantagem/desvantagem (ou bônus/penalidade equivalente do sistema)." },
        modificador: { type: "integer", description: "Bônus ou penalidade circunstancial (no Vampiro: dados a mais ou a menos na parada)." },
        perigoso: { type: "boolean", description: "true se a falha machuca ou custa caro (o jogador vê o aviso antes de rolar)." },
        motivo: { type: "string", description: "Frase curta do que está sendo tentado, mostrada no cartão do dado." },
        ...extra.campos,
      },
      required: oposto ? ["teste", "motivo"] : ["teste", "alvo", "motivo"],
      additionalProperties: false,
    },
  };
}

export const DEF_ROLAR_DADOS: DefFerramenta = {
  name: "rolar_dados",
  description:
    "Rola dados livres: dano, ataques e testes de inimigos, tabelas aleatórias, tesouro, reação de NPCs. Notação: 2d6+3, 1d20, 4d6kh3, 2d20kl1, 4dF, d%, 1d6! (explosivo), 5d10s (parada de sucessos: conta 6+, par de 10 vale +2).",
  input_schema: {
    type: "object",
    properties: {
      expressao: { type: "string", description: "Expressão de dados." },
      motivo: { type: "string", description: "Para que é a rolagem, mostrada aos jogadores." },
      secreta: { type: "boolean", description: "true para rolagens que os jogadores não devem ver o resultado (ex.: furtividade de um inimigo)." },
    },
    required: ["expressao", "motivo"],
    additionalProperties: false,
  },
};

/** Custo de Despertar e nível do poder vindos do teste/pedir_teste (só sistemas que declaram esses campos); undefined quando nada foi dito. */
function opcoesDoPoder(e: {
  custo_despertar?: number;
  nivel_poder?: number;
  compulsao?: string;
  arma?: number;
  oposicao_nome?: string;
  oposicao_parada?: number;
  oposicao_bonus?: number;
}): Record<string, unknown> | undefined {
  const oposicao = oposicaoDaEntrada(e);
  if (e.custo_despertar === undefined && e.nivel_poder === undefined && e.compulsao === undefined && e.arma === undefined && !oposicao) return undefined;
  return {
    ...(e.custo_despertar !== undefined ? { custoDespertar: e.custo_despertar } : {}),
    ...(e.nivel_poder !== undefined ? { nivelPoder: e.nivel_poder } : {}),
    ...(e.compulsao !== undefined ? { compulsao: e.compulsao } : {}),
    ...(e.arma !== undefined ? { arma: e.arma } : {}),
    ...(oposicao ? { oposicao } : {}),
  };
}

/** Texto curto do adversário para o registro do pedido ("contra Vera (5 dados)", "contra Vera (+3)"). */
function textoContra(o: NonNullable<PedidoTeste["oposicao"]>): string {
  const quanto = o.parada !== undefined ? `${o.parada} dados` : `${(o.bonus ?? 0) >= 0 ? "+" : "−"}${Math.abs(o.bonus ?? 0)}`;
  return `contra ${o.nome ?? "a oposição"} (${quanto})`;
}

/**
 * Em sistema que conta ações (PF2e), o pedido leva quantos ataques o personagem já fez no turno: o sistema aplica a penalidade
 * de ataques múltiplos sozinho, sem o mestre escrever "Ataque 2".
 */
function comAtaquesDoTurno(ctx: ContextoFerramentas, p: Personagem, pedido: PedidoTeste): PedidoTeste {
  if (!ctx.sistema.combate?.acoes) return pedido;
  const feitos = ataquesNoTurno(ctx, p.ficha.nome);
  return feitos ? { ...pedido, opcoes: { ...(pedido.opcoes ?? {}), ataquesNoTurno: feitos } } : pedido;
}

/** Teste rolado na hora pelo servidor: grava o cartão, aplica o gancho do sistema (Fome, Manchas, condições...) e devolve o resultado. */
export function testeNaHora(ctx: ContextoFerramentas, p: Personagem, pedido: PedidoTeste): ResultadoTeste {
  const r = ctx.sistema.resolverTeste(p.ficha, comAtaquesDoTurno(ctx, p, pedido));
  // ataque contado no turno (PF2e): o rastreador guarda qual foi e gasta 1 ação, e o próximo já vem com a penalidade
  if (r.ataque) contarAtaque(ctx, p.ficha.nome, r.ataque.numero);
  // d100 rola abaixo do valor: "43 ≤ 52" diz mais que "43 vs 52"
  const comparacao = r.oposicao
    ? ` contra ${r.oposicao.nome} (${r.oposicao.expressao} → ${r.oposicao.total})`
    : r.alvo === null
      ? ""
      : ctx.sistema.dadoPrincipal.includes("100")
        ? ` (alvo ${r.alvo})`
        : ` vs ${r.alvo}`;
  const expressao = r.oposicao ? r.expressao.replace(/\s+vs\s+.*$/, "") : r.expressao;
  const texto = `${p.ficha.nome} · ${r.teste} — ${r.motivo}: ${expressao} → ${r.total}${comparacao} · ${r.rotuloGrau}${r.dano ? ` · dano sugerido ${r.dano.valor}` : ""}`;
  // o mestre rolou: o jogador ainda pode rerrolar (Força de Vontade, Ponto de Herói...) e o mestre corrige depois (§rerrolagem)
  const decisao = decisaoNaHora(ctx, p, r);
  registrarDado(ctx, texto, decisao ? { ...r, decisao } : r, p.id);
  // ganchos do sistema depois do teste (d100 marca a perícia usada; Vampiro sobe a Fome, grava Ressonância, marca frenesi...)
  try {
    const nova = ctx.sistema.aposTeste?.(p.ficha, r);
    if (nova) {
      p.ficha = nova;
      persistirPersonagem(ctx, p);
      if (extensoesDe(ctx.sistema).some((e) => e.sincronizarCombateAposTeste)) sincronizarCombate(ctx);
    }
  } catch (erro) {
    console.warn(`[taverna] aposTeste falhou (${ctx.sistema.id}):`, erro);
  }
  return r;
}

/**
 * Decisão no cartão do teste que o mestre rolou na hora: falha, perigo ou ataque ficam 45 s; sucesso comum, poucos segundos e
 * discreto. Não pausa o turno: quem aceita a rerrolagem manda a correção ao mestre (mestre/index.ts, decidirTeste).
 */
function decisaoNaHora(ctx: ContextoFerramentas, p: Personagem, r: ResultadoTeste): DecisaoDoTeste | null {
  let opcoes: DecisaoDoTeste["opcoes"] = [];
  try {
    opcoes = ctx.sistema.decisoesAposTeste?.(p.ficha, r) ?? [];
  } catch (e) {
    console.warn(`[taverna] decisoesAposTeste falhou (${ctx.sistema.id}):`, e);
  }
  if (!opcoes.length) return null;
  const pausar = pausaDecisao(r);
  return {
    ate: Date.now() + (pausar ? PRAZO_DECISAO_MS : PRAZO_DISCRETO_MS),
    clienteId: null,
    campanhaId: ctx.campanha.id,
    opcoes,
    automatico: true,
    ...(pausar ? {} : { discreta: true }),
  };
}

/** Resultado + como a ficha ficou (recursos e condições), para o mestre não fazer conta. */
export function comFicha(p: Personagem, r: ResultadoTeste) {
  const f = p.ficha;
  const rec = Object.fromEntries(Object.entries(f.recursos).map(([id, x]) => [id, `${x.atual}/${x.max}`]));
  return { ...r, fichaAgora: { personagem: f.nome, recursos: rec, condicoes: f.condicoes }, ...(r.avisoMestre ? { narrar: r.avisoMestre } : {}) };
}

export const executoresTestes: Record<string, Executor> = {
  teste: (ctx, entrada) => {
    const e = ENTRADAS.teste.parse(entrada);
    conferirOposicao(ctx, e);
    const p = acharPersonagem(ctx, e.personagem);
    const opcoes = opcoesDoPoder(e);
    const oposicao = oposicaoDaEntrada(e);
    const r = testeNaHora(ctx, p, {
      teste: e.teste,
      alvo: oposicao ? null : (e.alvo ?? null),
      modo: e.modo,
      modificador: e.modificador,
      motivo: e.motivo,
      ...(oposicao ? { oposicao } : {}),
      ...(opcoes ? { opcoes } : {}),
    });
    return extensoesDe(ctx.sistema).some((x) => x.resultadoComFicha) ? comFicha(p, r) : r;
  },

  rolar_dados: (ctx, entrada) => {
    const e = ENTRADAS.rolar_dados.parse(entrada);
    const r = rolar(e.expressao);
    const descricao = descreverRolagem(r);
    registrarDado(ctx, `${e.motivo}: ${e.secreta ? "rolagem secreta do mestre" : descricao}`, {
      tipo: "rolagem",
      origem: "mestre",
      motivo: e.motivo,
      secreta: Boolean(e.secreta),
      ...(e.secreta ? { expressao: r.expressao } : r),
      descricao: e.secreta ? null : descricao,
    });
    return { motivo: e.motivo, ...r, descricao };
  },

  pedir_teste: (ctx, entrada) => {
    const e = ENTRADAS.pedir_teste.parse(entrada);
    conferirOposicao(ctx, e);
    cobrarNarracao(ctx, "peça o teste");
    const p = acharPersonagem(ctx, e.personagem);
    if (testesPendentes(ctx.campanha.id).some((m) => m.personagemId === p.id)) {
      throw new Error(`${p.ficha.nome} já tem um teste esperando o jogador rolar. Termine o turno.`);
    }
    // teste oposto: sem alvo fixo (o servidor rola a defesa do NPC no clique); fora dele, a dificuldade é obrigatória
    const oposicao = oposicaoDaEntrada(e);
    if (!oposicao && e.alvo === undefined) throw new Error("Falta o alvo (dificuldade/CD). Em teste oposto, informe a oposição (oposicao_parada ou oposicao_bonus) no lugar do alvo.");
    const alvo = oposicao ? null : (e.alvo as number);
    // prévia só para mostrar o bônus no cartão; o dado de verdade é sorteado quando o jogador clica (custos como o Despertar também)
    const doPoder = opcoesDoPoder(e);
    const previa = ctx.sistema.resolverTeste(
      p.ficha,
      comAtaquesDoTurno(ctx, p, {
        teste: e.teste,
        alvo,
        modo: e.modo,
        modificador: e.modificador,
        motivo: e.motivo,
        previa: true,
        ...(oposicao ? { oposicao } : {}),
        ...(doPoder ? { opcoes: doPoder } : {}),
      }),
    );
    // ataque contado no turno (PF2e): o número fica fixo no pedido (o jogador rola depois, quando a conta já andou) e o
    // rastreador já conta este ataque, para o próximo pedido vir com a penalidade
    const opcoes = previa.ataque ? { ...(doPoder ?? {}), numeroAtaque: previa.ataque.numero } : doPoder;
    if (previa.ataque) contarAtaque(ctx, p.ficha.nome, previa.ataque.numero);
    // custos que o sistema anuncia antes do clique (Vampiro: "Despertar · Celeridade ●●", "Surto +2")
    const efeitos = (previa as { efeitos?: { texto?: unknown }[] }).efeitos;
    const custos = Array.isArray(efeitos) ? efeitos.map((x) => String(x.texto ?? "")).filter(Boolean) : [];
    // a composição da parada para o jogador conferir antes do clique ("Carisma 4 + Lábia 4 · 1 de Fome"); as notas que dependem
    // dos dados sorteados na prévia (vantagem: 14 e 7, sorte...) ficam de fora. Só nas paradas de d10 (a prévia do Vampiro já
    // devolve só a composição); nos d20 a prévia anota o natural sorteado, que não vale nada antes do clique
    const detalhes = (Array.isArray((previa as { dadosFome?: unknown }).dadosFome) ? (previa.detalhes ?? "") : "")
      .split(" · ")
      .filter((n) => n && !/^(vantagem|desvantagem|sorte|infortúnio|azar)\b/i.test(n))
      .join(" · ");
    // escolhas do jogador antes de rolar (Vampiro: Surto de Sangue); revalidadas no clique (mestre/index.ts, rolarTestePendente)
    let antes: unknown[] = [];
    try {
      antes = ctx.sistema.opcoesAntesDeRolar?.(p.ficha, { teste: e.teste, alvo, motivo: e.motivo }) ?? [];
    } catch (erro) {
      console.warn(`[taverna] opcoesAntesDeRolar falhou (${ctx.sistema.id}):`, erro);
    }
    const dados = {
      tipo: "pedido_teste",
      status: "pendente",
      personagem: p.ficha.nome,
      personagemId: p.id,
      teste: previa.teste,
      testePedido: e.teste,
      // como a parada é rolada ("1d20+4", "7d10 (2 de Fome)"), para o cartão mostrar o dado certo antes do clique
      expressao: previa.expressao.replace(/\s+vs\s+.*$/, ""),
      dadoPrincipal: ctx.sistema.dadoPrincipal,
      alvo,
      bonus: previa.bonus,
      ...(e.modo && e.modo !== "normal" ? { modo: e.modo } : {}),
      ...(e.modificador ? { modificador: e.modificador } : {}),
      ...(opcoes ? { opcoes } : {}),
      ...(custos.length ? { custos } : {}),
      ...(detalhes ? { detalhes } : {}),
      ...(antes.length ? { antes } : {}),
      perigoso: Boolean(e.perigoso),
      motivo: e.motivo,
      sistema: ctx.sistema.id,
    };
    registrarDado(ctx, `${p.ficha.nome} precisa rolar ${previa.teste} (${oposicao ? textoContra(oposicao) : `CD ${alvo}`}) — ${e.motivo}`, dados, p.id);
    return {
      pendente: true,
      personagem: p.ficha.nome,
      teste: previa.teste,
      alvo,
      ...(oposicao ? { oposicao: textoContra(oposicao) } : {}),
      instrucao:
        "O cartão do dado já está na tela e o jogador vai rolar. A narração já terminou no suspense: NÃO escreva mais nada (nem \"o dado é seu\", nem resumo do teste); se ainda faltar, chame sugerir_acoes e encerre respondendo só \"—\". O resultado chega no próximo turno.",
    };
  },
};
